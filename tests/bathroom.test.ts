import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { startBathroomRepair, setBathroomSupply, updateBathroomRepairs } from '../src/simulation/bathroomRepairs';
import { moistureReading } from '../src/tools/moistureMeter';
import { cellPoint, pointIndex } from '../src/simulation/wallModel';
import { updateWater } from '../src/simulation/waterSimulation';

const bathroom = new SimulationEngine('bathroom');
bathroom.update(180);
const wetBathroom = bathroom.checkpoint();
const hotpipe = new SimulationEngine('hotpipe');
hotpipe.update(120);
const wetPipe = hotpipe.checkpoint();

test('bathroom area source crosses broken membrane, wets separate ceiling and adjacent wall base', () => {
  const s = wetBathroom, slab = s.slab!;
  assert.ok(s.waterSources[0].footprint.length > 100);
  assert.ok(s.metrics.ceilingSurfaceMax > 60);
  assert.ok(s.metrics.wallSurfaceMax > 18);
  assert.ok(s.metrics.efflorescence > .1);
  assert.ok(moistureReading(s, { x: -1.375, y: .375 }) > 18);
  assert.ok(moistureReading(s, { x: -1.375, y: 4 }) < 10);
  const wetIndex = slab.cells.slice(0, slab.cols * slab.rows).reduce((best, c, i) => c.moisture > slab.cells[best].moisture ? i : best, 0);
  assert.equal(moistureReading(s, cellPoint(slab, wetIndex), 'pinless', 'slab'), slab.cells[wetIndex].moisture);
  assert.equal(moistureReading(s, cellPoint(slab, wetIndex), 'pin', 'slab'), slab.cells[wetIndex + slab.cols * slab.rows].moisture);
  assert.notEqual(wetIndex, pointIndex(slab, s.waterSources[0].position), 'symptom is transported, not tied to a source marker');
});

test('no bathroom use stays dry; intact membrane blocks the same area supply', () => {
  const dry = new SimulationEngine('bathroom'), intact = new SimulationEngine('bathroom');
  setBathroomSupply(dry.state, 'use', 0); dry.update(30);
  assert.equal(dry.state.metrics.surfaceMax, 8);
  assert.equal(dry.state.metrics.leakRate, 0);
  for (const i of intact.state.waterSources[0].defects) intact.state.slab!.cells[i].waterproofLevel = 1;
  intact.update(180);
  assert.ok(intact.state.metrics.leakRate < wetBathroom.metrics.leakRate * .05);
  assert.ok(intact.state.metrics.ceilingSurfaceMax < 12);
  assert.ok(intact.state.metrics.wallSurfaceMax < 10);
});

test('surface cleanup changes damage only; continuing area supply causes recurrence and retained moisture', () => {
  const e = new SimulationEngine('bathroom'); e.restore(wetBathroom);
  const oldWater = e.state.slab!.cells.map(c => c.moisture), oldFlow = e.state.waterSources[0].flow;
  assert.ok(startBathroomRepair(e.state, 'surface', 'slab').ok);
  const patched = [...e.state.repairs.job!.cells];
  updateBathroomRepairs(e.state, 2);
  assert.deepEqual(e.state.slab!.cells.map(c => c.moisture), oldWater);
  assert.equal(e.state.waterSources[0].flow, oldFlow);
  assert.ok(patched.every(i => e.state.slab!.cells[i].damageLevel === 0));
  e.update(120);
  assert.ok(e.state.metrics.leakRate > wetBathroom.metrics.leakRate * .8);
  assert.ok(e.state.metrics.ceilingSurfaceMax >= wetBathroom.metrics.ceilingSurfaceMax);
  assert.ok(patched.some(i => e.state.slab!.cells[i].saltLevel > .1 && e.state.slab!.cells[i].damageLevel > .02));
  assert.ok(e.state.waterSources[0].defects.every(i => e.state.slab!.cells[i].waterproofLevel === .04));
});

test('membrane repair requires use off, consumes simulation time, and dries gradually after SAME use resumes', () => {
  const e = new SimulationEngine('bathroom'); e.restore(wetBathroom);
  assert.equal(startBathroomRepair(e.state, 'waterproof').ok, false);
  setBathroomSupply(e.state, 'use', 0);
  assert.ok(startBathroomRepair(e.state, 'waterproof').ok);
  assert.equal(setBathroomSupply(e.state, 'use', 1).ok, false);
  e.state.running = false; e.update(20);
  assert.equal(e.state.repairs.job!.elapsed, 0);
  e.state.running = true; e.update(15);
  assert.ok(e.state.repairs.waterproofRepaired);
  assert.equal(e.state.repairs.job, null);
  assert.ok(e.state.metrics.ceilingSurfaceMax > 30, 'repair cannot erase stored water');
  setBathroomSupply(e.state, 'use', 1); e.update(180);
  assert.ok(e.state.metrics.leakRate < wetBathroom.metrics.leakRate * .05);
  assert.ok(e.state.metrics.ceilingSurfaceMax < wetBathroom.metrics.ceilingSurfaceMax * .25);
  assert.ok(e.state.metrics.wallSurfaceMax < wetBathroom.metrics.wallSurfaceMax);
  assert.ok(e.state.metrics.efflorescence >= wetBathroom.metrics.efflorescence);
});

test('concealed hot-water leak is pressure-driven, not shower or rain driven; symptom is displaced', () => {
  const e = new SimulationEngine('hotpipe'); e.restore(wetPipe);
  const leak = e.state.metrics.leakRate;
  setBathroomSupply(e.state, 'use', 0); e.state.environment.rain = 0; e.state.environment.wind = 0;
  e.update(1); assert.equal(e.state.metrics.leakRate, leak);
  assert.ok(moistureReading(e.state, { x: 1.625, y: .625 }) > 60);
  assert.ok(moistureReading(e.state, e.state.waterSources[0].position) < moistureReading(e.state, { x: 1.625, y: .625 }));
  setBathroomSupply(e.state, 'pressure', .2); e.update(.05);
  assert.equal(e.state.metrics.leakRate, leak / 2);
  setBathroomSupply(e.state, 'valve', 0); e.update(.05);
  assert.equal(e.state.metrics.leakRate, 0);
  assert.ok(e.state.metrics.surfaceMax > 50);
  assert.equal(e.state.repairs.bypassInstalled, false);
  setBathroomSupply(e.state, 'valve', 1); e.update(.05);
  assert.equal(e.state.metrics.leakRate, leak / 2, 'closing a valve is not a repair');
});

test('patching a wall cannot fix a pipe; bypass must isolate old pipe and supply new route after reopening', () => {
  const e = new SimulationEngine('hotpipe'); e.restore(wetPipe);
  assert.equal(startBathroomRepair(e.state, 'bypass').ok, false);
  assert.equal(startBathroomRepair(e.state, 'waterproof').ok, false);
  assert.ok(startBathroomRepair(e.state, 'surface').ok); e.update(120);
  assert.equal(e.state.metrics.leakRate, wetPipe.metrics.leakRate);
  assert.ok(e.state.metrics.surfaceMax >= wetPipe.metrics.surfaceMax);
  setBathroomSupply(e.state, 'valve', 0); assert.ok(startBathroomRepair(e.state, 'bypass').ok);
  assert.equal(setBathroomSupply(e.state, 'valve', 1).ok, false);
  e.update(10); assert.ok(e.state.repairs.bypassInstalled);
  setBathroomSupply(e.state, 'valve', 1); e.update(.05);
  assert.equal(e.state.pipes.find(p => !p.exposed)!.pressure, 0);
  assert.ok(e.state.pipes.find(p => !p.exposed)!.isolated);
  assert.equal(e.state.pipes.find(p => p.exposed)!.pressure, .4);
  assert.equal(e.state.metrics.leakRate, 0);
  assert.ok(e.state.metrics.surfaceMax > 50);
  e.update(240);
  assert.ok(e.state.metrics.surfaceMax < 15);
  assert.ok(e.state.metrics.damage > 0, 'surface damage persists after drying');
});

test('two-domain diffusion conserves water except evaporation, bounds fields, and restores checkpoints across scenarios', () => {
  const e = new SimulationEngine('bathroom'); e.restore(wetBathroom); e.state.waterSources[0].enabled = false;
  const water = () => [e.state.wall, e.state.slab!].flatMap(g => g.cells).reduce((sum, c) => sum + c.moisture, 0);
  const wallDelta = new Float64Array(e.state.wall.cells.length), slabDelta = new Float64Array(e.state.slab!.cells.length);
  let previous = water();
  for (let n = 0; n < 60; n++) {
    updateWater(e.state, .05, wallDelta, slabDelta);
    assert.ok(water() <= previous + 1e-6); previous = water();
  }
  assert.ok([e.state.wall, e.state.slab!].flatMap(g => g.cells).every(c => Number.isFinite(c.moisture) && c.moisture >= 8 && c.moisture <= 100));
  const a = new SimulationEngine('bathroom'), b = new SimulationEngine('bathroom');
  for (let n = 0; n < 60; n++) a.update(1 / 30);
  for (let n = 0; n < 120; n++) b.update(1 / 60);
  assert.deepEqual(a.state.slab!.cells, b.state.slab!.cells);
  e.reset('hotpipe'); e.restore(wetBathroom); assert.deepEqual(e.state, wetBathroom);
  e.update(.05); assert.equal(e.state.scenarioId, 'bathroom');
  e.reset('crack'); assert.equal(e.state.slab, null); assert.equal(e.state.pipes.length, 0);
});
