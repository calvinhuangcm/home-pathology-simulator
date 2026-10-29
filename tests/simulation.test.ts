import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { drill } from '../src/tools/drill';
import { insertNeedle, startInjection } from '../src/tools/injector';
import { moistureReading } from '../src/tools/moistureMeter';
import { exteriorSource, interiorOutlet } from '../src/scenarios/exteriorCrack';
import { permeability, transportGrid, updateWater } from '../src/simulation/waterSimulation';

test('dry wall stays dry without rain; pausing freezes physics', () => {
  const e = new SimulationEngine();
  e.state.environment.rain = 0;
  e.update(20);
  assert.equal(e.state.metrics.surfaceMax, 8);
  assert.equal(e.state.metrics.leakRate, 0);
  e.state.running = false;
  const before = e.checkpoint();
  e.update(100);
  assert.deepEqual(e.state, before);
});

test('source → RC → displaced surface symptom; meter reads cells; salt and blisters accumulate', () => {
  const e = new SimulationEngine();
  e.update(1);
  assert.ok(moistureReading(e.state, interiorOutlet) < 9);
  assert.ok(e.state.wall.cells[e.state.cracks[0]].moisture > 20);
  e.update(119);
  assert.ok(moistureReading(e.state, interiorOutlet) > 50);
  assert.ok(moistureReading(e.state, exteriorSource) < moistureReading(e.state, interiorOutlet));
  assert.ok(moistureReading(e.state, { x: 3, y: 2 }) < 10);
  const index = e.state.cracks.at(-1)!;
  assert.equal(moistureReading(e.state, interiorOutlet), e.state.wall.cells[index].moisture);
  assert.ok(e.state.metrics.efflorescence > .1);
  assert.ok(e.state.metrics.damage > .01);
  assert.ok(e.state.metrics.mold > .1);
});

test('correct hole, completed drilling and needle required; injection reduces flow then dries gradually', () => {
  const e = new SimulationEngine();
  e.update(120);
  const before = e.checkpoint();
  const p = drill(e.state, { x: -1.125, y: 3.625 })!;
  assert.ok(p.connected);
  assert.equal(insertNeedle(e.state, p.id), false);
  assert.equal(startInjection(e.state, p.id), false);
  e.update(2.1);
  assert.equal(insertNeedle(e.state, p.id), true);
  assert.equal(startInjection(e.state, p.id), true);
  e.update(.1);
  assert.ok(e.state.repairs.pressure > 0 && e.state.repairs.pressure < 1);
  assert.ok(e.state.metrics.surfaceMax > 45, 'injection must not instantly dry the wall');
  e.update(30);
  assert.ok(e.state.metrics.reduction > .75);
  assert.ok(e.state.repairs.ports[0].volumeMl > 150);
  assert.ok(e.state.metrics.expansion > 2);
  assert.ok(e.state.cracks.filter(i => e.state.wall.cells[i].pu + e.state.wall.cells[i].expansion > .001).length > 3);
  e.update(120);
  assert.ok(e.state.metrics.surfaceMax < before.metrics.surfaceMax * .65);
  assert.ok(e.state.metrics.meanMoisture < before.metrics.meanMoisture);
  assert.ok(e.state.metrics.surfaceMax >= 8);
  assert.ok(e.state.metrics.efflorescence >= before.metrics.efflorescence);
  assert.equal(e.state.repairs.activePortId, null);
  e.restore(before);
  assert.deepEqual(e.state, before, 'undo checkpoint restores physics including material and time');
});

test('wrong hole cannot seal a distant crack, even after prolonged pumping', () => {
  const e = new SimulationEngine();
  e.update(30);
  const p = drill(e.state, { x: 3, y: 3 })!;
  assert.equal(p.connected, false);
  e.update(2.1); insertNeedle(e.state, p.id); startInjection(e.state, p.id);
  e.update(90);
  assert.equal(e.state.metrics.reduction, 0);
  assert.ok(e.state.metrics.surfaceMax > 50);
  assert.ok(e.state.cracks.every(i => e.state.wall.cells[i].pu === 0));
});

test('45 degree drill aim changes whether the bore reaches the crack network', () => {
  const down = new SimulationEngine();
  const downPort = drill(down.state, { x: -1.125, y: 3.625 }, { direction: 'down', angleDeg: 45 })!;
  assert.equal(downPort.drillDirection, 'down');
  assert.equal(downPort.drillAngleDeg, 45);
  assert.equal(downPort.connected, true, 'the downward bore follows the crack in this teaching case');

  const right = new SimulationEngine();
  const rightPort = drill(right.state, { x: -1.125, y: 3.625 }, { direction: 'right', angleDeg: 45 })!;
  assert.equal(rightPort.connected, false, 'a lateral bore misses the vertical crack at the same entry point');
});

test('drilling rejects non-finite positions without creating corrupt ports', () => {
  const e = new SimulationEngine();
  const before = e.state.repairs.ports.length;
  assert.equal(drill(e.state, { x: Number.NaN, y: 3 }), null);
  assert.equal(drill(e.state, { x: 3, y: Number.POSITIVE_INFINITY }), null);
  assert.equal(drill(e.state, { x: Number.NEGATIVE_INFINITY, y: 3 }), null);
  assert.equal(e.state.repairs.ports.length, before);
});

test('fixed timestep produces identical state for 30fps, 60fps and accelerated time', () => {
  const a = new SimulationEngine(), b = new SimulationEngine(), c = new SimulationEngine();
  for (let i = 0; i < 300; i++) a.update(1 / 30);
  for (let i = 0; i < 600; i++) b.update(1 / 60);
  c.state.timeScale = 20; c.update(.5);
  assert.deepEqual(a.state.wall.cells, b.state.wall.cells);
  assert.deepEqual(a.state.wall.cells, c.state.wall.cells);
  assert.equal(a.state.simulationTime, b.state.simulationTime);
});

test('material permeability ordering, bounded fields, and no moisture created by closed diffusion', () => {
  const e = new SimulationEngine();
  const cell = e.state.wall.cells[0];
  assert.ok(permeability({ ...cell, material: 'rc' }) < permeability({ ...cell, material: 'mortar' }));
  assert.ok(permeability({ ...cell, material: 'waterproof', waterproofLevel: 1 }) < .01);
  assert.ok(permeability({ ...cell, material: 'waterproof', waterproofLevel: 0 }) > .7);
  e.state.waterSources[0].enabled = false;
  e.state.wall.cells[e.state.cracks[5]].moisture = 95;
  const total = () => e.state.wall.cells.reduce((s, c) => s + c.moisture, 0);
  let previous = total();
  const delta = new Float64Array(e.state.wall.cells.length);
  for (let n = 0; n < 100; n++) {
    updateWater(e.state, .05, delta);
    assert.ok(total() <= previous + 1e-6);
    previous = total();
  }
  assert.ok(e.state.wall.cells.every(c => Number.isFinite(c.moisture) && c.moisture >= 8 && c.moisture <= 100));
});

test('high teaching permeability limits simultaneous flux and conserves a closed grid', () => {
  const e = new SimulationEngine();
  e.state.wall.cells.forEach(cell => { cell.moisture = 8; });
  e.state.cracks.forEach(index => { e.state.wall.cells[index].permeabilityScale = 2; });
  e.state.wall.cells[e.state.cracks[Math.floor(e.state.cracks.length / 2)]].moisture = 100;
  const total = () => e.state.wall.cells.reduce((sum, cell) => sum + cell.moisture, 0);
  const delta = new Float64Array(e.state.wall.cells.length);
  const initial = total();
  for (let tick = 0; tick < 50; tick++) {
    transportGrid(e.state.wall, .05, delta, new Set(), 0, [0, 0, 0, 0, 0, 0]);
    const current = total();
    assert.ok(Math.abs(current - initial) < 1e-6, `closed transport changed total moisture at tick ${tick}: ${initial} -> ${current}`);
    assert.ok(e.state.wall.cells.every(cell => cell.moisture >= 8 && cell.moisture <= 100));
  }
});

test('bathroom area source closes the open-system water balance, including saturation and drying', () => {
  const e = new SimulationEngine('bathroom');
  const state = e.state, area = state.waterSources.find(source => source.kind === 'area')!;
  assert.ok(area, 'bathroom scenario must include its area source');
  for (const grid of [state.wall, state.slab, state.floor]) if (grid) {
    grid.edges.length = 0;
    grid.cells.forEach(cell => { cell.moisture = 8; cell.surfaceCoating = 0; });
  }
  state.junctions.length = 0;
  state.floorJunctions.length = 0;
  state.waterSources.forEach(source => { source.enabled = source.kind === 'area'; });
  const slab = state.slab!;
  slab.cells[area.footprint[0]].moisture = 99.8;

  const dt = .05, inputPerCell = state.environment.bathroomUse * 12 * dt;
  const dryRates = [ .018, .012, .009, .003, .002, .004 ];
  let expected = 0;
  for (const grid of [state.wall, state.slab, state.floor]) if (grid) {
    const rates = grid === state.floor ? [.022, .006, .002] : dryRates;
    const afterDrying = grid.cells.map((cell, index) => {
      const layer = Math.floor(index / (grid.cols * grid.rows));
      return cell.moisture - (cell.moisture - 8) * rates[layer] * (1 - .8 * cell.surfaceCoating) * dt;
    });
    expected += afterDrying.reduce((sum, moisture) => sum + moisture, 0);
    if (grid === slab) {
      for (const index of area.footprint) expected += Math.min(100, afterDrying[index] + inputPerCell) - afterDrying[index];
    }
  }
  updateWater(state, dt, new Float64Array(state.wall.cells.length), new Float64Array(slab.cells.length), new Float64Array(state.floor.cells.length));
  const actual = [state.wall, state.slab, state.floor].filter((grid): grid is NonNullable<typeof grid> => !!grid)
    .flatMap(grid => grid.cells).reduce((sum, cell) => sum + cell.moisture, 0);
  assert.ok(Math.abs(actual - expected) < 1e-8, `open-system water balance mismatch: expected ${expected}, got ${actual}`);
  assert.equal(slab.cells[area.footprint[0]].moisture, 100, 'area source saturates the teaching index without exceeding its upper bound');
});
