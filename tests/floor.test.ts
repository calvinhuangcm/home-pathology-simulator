import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { createFloor, FLOOR_SURFACE, isFloorPoint, startFloorWaterTest } from '../src/simulation/floorModel';
import type { SimulationState } from '../src/simulation/types';
import { cellIndex, cellPoint, pointIndex } from '../src/simulation/wallModel';
import { updateWater } from '../src/simulation/waterSimulation';
import { moistureReading } from '../src/tools/moistureMeter';

function disableSources(s: SimulationState): void { for (const source of s.waterSources) source.enabled = false; }
const floorPoint = (s: SimulationState, x = 31, y = 13) => cellPoint(s.floor, cellIndex(s.floor, x, y, 0));
const grids = (s: SimulationState) => [s.wall, ...(s.slab ? [s.slab] : []), s.floor];
const totalWater = (s: SimulationState) => grids(s).reduce((sum, grid) => sum + grid.cells.reduce((water, cell) => water + cell.moisture, 0), 0);

test('modeled floor starts dry in each scenario and stays dry with all water sources disabled', () => {
  const floor = createFloor();
  assert.equal(floor.cells.length, 80 * 28 * 3);
  assert.deepEqual(floor.layers, ['tile', 'mortar', 'rc']);
  assert.ok(floor.cells.some(c => c.material === 'tile'));
  assert.ok(floor.cells.some(c => c.material === 'grout'));
  for (const scenario of ['crack', 'bathroom', 'hotpipe'] as const) {
    const e = new SimulationEngine(scenario); disableSources(e.state); e.update(2);
    assert.ok(e.state.floor.cells.every(c => c.moisture === 8));
    assert.equal(e.state.metrics.floorSurfaceMax, 8);
    assert.equal(e.state.metrics.floorMeanMoisture, 8);
    assert.equal(e.state.metrics.floorInflow, 0);
  }
});

test('floor local bounds include all four edges; invalid points cannot create water tests', () => {
  const e = new SimulationEngine(); disableSources(e.state);
  const { width, height } = FLOOR_SURFACE;
  for (const p of [{ x: -width / 2, y: 0 }, { x: width / 2, y: 0 }, { x: -width / 2, y: height }, { x: width / 2, y: height }]) {
    assert.ok(isFloorPoint(p));
    const result = startFloorWaterTest(e.state, p);
    assert.ok(result.ok);
    assert.ok(result.test!.cells.every(i => i >= 0 && i < e.state.floor.cols * e.state.floor.rows));
    assert.equal(moistureReading(e.state, p, 'pinless', 'floor'), 8);
  }
  const before = e.checkpoint();
  for (const p of [{ x: NaN, y: 1 }, { x: 0, y: NaN }, { x: Infinity, y: 1 }, { x: 0, y: -Infinity }, { x: width / 2 + .001, y: 1 }, { x: -width / 2 - .001, y: 1 }, { x: 0, y: -.001 }, { x: 0, y: height + .001 }]) {
    assert.equal(isFloorPoint(p), false);
    assert.equal(startFloorWaterTest(e.state, p).ok, false);
  }
  assert.deepEqual(e.state, before);
});

test('floor probes read tile and mortar cells independently from wall and upstairs slab', () => {
  const e = new SimulationEngine('bathroom'), s = e.state, p = floorPoint(s);
  const surface = pointIndex(s.floor, p), below = pointIndex(s.floor, p, 1);
  s.floor.cells[surface].moisture = 47.25; s.floor.cells[below].moisture = 63.5;
  assert.equal(moistureReading(s, p, 'pinless', 'floor'), 47.25);
  assert.equal(moistureReading(s, p, 'pin', 'floor'), 63.5);
  assert.equal(moistureReading(s, p, 'pinless', 'wall'), 8);
  assert.equal(moistureReading(s, p, 'pinless', 'slab'), 8);
  assert.equal(moistureReading(s, floorPoint(s, 60, 23), 'pinless', 'floor'), 8);
});

test('finite floor water test lasts five simulation seconds, rejects overlapping tests, then stops adding water', () => {
  const e = new SimulationEngine(); disableSources(e.state);
  const p = floorPoint(e.state), result = startFloorWaterTest(e.state, p);
  assert.ok(result.ok); assert.equal(result.test!.remainingSeconds, 5);
  assert.equal(startFloorWaterTest(e.state, p).ok, false);
  assert.equal(startFloorWaterTest(e.state, floorPoint(e.state, 33, 13)).ok, false, 'partially overlapping test footprints are rejected');
  e.update(1);
  assert.ok(Math.abs(e.state.floorTests[0].remainingSeconds - 4) < 1e-9);
  assert.ok(Math.abs(e.state.floorTests[0].appliedWater - 60) < 1e-8);
  e.update(4);
  assert.equal(e.state.floorTests[0].remainingSeconds, 0);
  assert.ok(Math.abs(e.state.floorTests[0].appliedWater - 300) < 1e-8);
  const applied = e.state.floorTests[0].appliedWater, storedWater = totalWater(e.state);
  e.update(1);
  assert.equal(e.state.floorTests[0].appliedWater, applied);
  assert.ok(e.state.metrics.floorInflow < 1e-9, 'no source remains; any numerical junction flux is negligible');
  assert.ok(totalWater(e.state) < storedWater);
  assert.ok(startFloorWaterTest(e.state, p).ok, 'completed test does not prevent another controlled test');
});

test('equal surface water input penetrates grout faster than tile and reaches mortar, RC and neighboring cells', () => {
  const tile = new SimulationEngine(), grout = new SimulationEngine();
  for (const e of [tile, grout]) disableSources(e.state);
  const tilePoint = floorPoint(tile.state, 31, 13), groutPoint = floorPoint(grout.state, 32, 13);
  assert.equal(tile.state.floor.cells[pointIndex(tile.state.floor, tilePoint)].material, 'tile');
  assert.equal(grout.state.floor.cells[pointIndex(grout.state.floor, groutPoint)].material, 'grout');
  startFloorWaterTest(tile.state, tilePoint); startFloorWaterTest(grout.state, groutPoint);
  tile.update(5); grout.update(5);
  assert.equal(tile.state.floorTests[0].appliedWater, grout.state.floorTests[0].appliedWater);
  assert.ok(moistureReading(tile.state, tilePoint, 'pin', 'floor') > 10);
  assert.ok(moistureReading(grout.state, groutPoint, 'pin', 'floor') > moistureReading(tile.state, tilePoint, 'pin', 'floor') + 3);
  assert.ok(moistureReading(tile.state, tilePoint, 'pinless', 'floor') > moistureReading(grout.state, groutPoint, 'pinless', 'floor'));
  assert.ok(tile.state.floor.cells[pointIndex(tile.state.floor, tilePoint, 2)].moisture > 8.01);
  const neighbor = cellIndex(tile.state.floor, 33, 13, 1);
  assert.ok(!tile.state.floorTests[0].cells.includes(neighbor));
  assert.ok(tile.state.floor.cells[neighbor].moisture > 8.01, 'wetting spreads beyond the tested surface cells');
});

test('floor water remains stored after supply ends and dries gradually', () => {
  const e = new SimulationEngine(); disableSources(e.state);
  const p = floorPoint(e.state); startFloorWaterTest(e.state, p); e.update(5);
  const wet = e.state.metrics.floorSurfaceMax, mean = e.state.metrics.floorMeanMoisture;
  assert.ok(wet > 50);
  e.update(.05);
  assert.ok(e.state.metrics.floorSurfaceMax > wet * .9, 'stopping supply must not instantly dry the surface');
  e.update(24.95);
  assert.ok(e.state.metrics.floorSurfaceMax > 8 && e.state.metrics.floorSurfaceMax < wet * .5);
  assert.ok(e.state.metrics.floorMeanMoisture > 8 && e.state.metrics.floorMeanMoisture < mean);
});

test('wet wall mortar transfers moisture through the wall-floor junction without a floor test', () => {
  const e = new SimulationEngine(); disableSources(e.state);
  assert.ok(e.state.floorJunctions.length > 0);
  for (const junction of e.state.floorJunctions) e.state.wall.cells[junction.wallCell].moisture = 90;
  const before = totalWater(e.state);
  e.update(10);
  assert.ok(e.state.metrics.floorInflow > 0);
  assert.ok(e.state.metrics.floorMeanMoisture > 8.05);
  assert.ok(e.state.metrics.floorSurfaceMax > 8.1);
  assert.ok(e.state.floorJunctions.some(j => e.state.floor.cells[j.floorCell].moisture > 9));
  assert.ok(moistureReading(e.state, floorPoint(e.state, 40, 20), 'pin', 'floor') < 8.01, 'remote floor is not set to the wall reading');
  assert.equal(e.state.floorTests.length, 0);
  assert.ok(totalWater(e.state) < before, 'junction transfers existing water; it cannot create a source');
});

test('all-domain transport conserves water apart from calculated evaporation and keeps fields bounded', () => {
  const e = new SimulationEngine('bathroom'); disableSources(e.state);
  const s = e.state;
  for (const grid of grids(s)) for (let i = 0; i < grid.cells.length; i++) {
    if (i % 101 === 0) grid.cells[i].moisture = 60;
  }
  const wallDelta = new Float64Array(s.wall.cells.length), slabDelta = new Float64Array(s.slab!.cells.length), floorDelta = new Float64Array(s.floor.cells.length);
  for (let tick = 0; tick < 40; tick++) {
    const before = totalWater(s);
    let evaporation = 0;
    for (const grid of grids(s)) {
      const rates = grid === s.floor ? [.022, .006, .002] : [.018, .012, .009, .003, .002, .004];
      for (let i = 0; i < grid.cells.length; i++) evaporation += (grid.cells[i].moisture - 8) * rates[Math.floor(i / (grid.cols * grid.rows))] * (1 - .8 * grid.cells[i].surfaceCoating) * .05;
    }
    updateWater(s, .05, wallDelta, slabDelta, floorDelta);
    assert.ok(Math.abs(totalWater(s) - (before - evaporation)) < 1e-6, 'transport and both sets of junctions must conserve water');
  }
  assert.ok(grids(s).every(grid => grid.cells.every(c => Number.isFinite(c.moisture) && c.moisture >= 8 && c.moisture <= 100)));
});

test('floor tests follow pause, fixed ticks, accelerated time, checkpoint restore and scenario reset', () => {
  const a = new SimulationEngine(), b = new SimulationEngine(), c = new SimulationEngine();
  for (const e of [a, b, c]) { disableSources(e.state); startFloorWaterTest(e.state, floorPoint(e.state)); }
  const paused = a.checkpoint(); a.state.running = false; a.update(10);
  assert.deepEqual(a.state.floor, paused.floor); assert.deepEqual(a.state.floorTests, paused.floorTests);
  assert.equal(a.state.simulationTime, 0); a.state.running = true;
  for (let i = 0; i < 60; i++) a.update(1 / 30);
  for (let i = 0; i < 120; i++) b.update(1 / 60);
  c.state.timeScale = 20; c.update(.1);
  assert.deepEqual(a.state.floor, b.state.floor); assert.deepEqual(a.state.floor, c.state.floor);
  assert.deepEqual(a.state.floorTests, b.state.floorTests); assert.deepEqual(a.state.floorTests, c.state.floorTests);
  const checkpoint = a.checkpoint(); a.update(4); a.restore(checkpoint);
  assert.deepEqual(a.state, checkpoint);
  a.state.floor.cells[0].moisture = 99; assert.notEqual(checkpoint.floor.cells[0].moisture, 99, 'restored state must not alias its checkpoint');
  a.reset('bathroom');
  assert.equal(a.state.floorTests.length, 0); assert.ok(a.state.floor.cells.every(cell => cell.moisture === 8));
  assert.ok(a.state.floorJunctions.length > 0);
});
