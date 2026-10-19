import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { setBathroomSupply, setDrainUse, setGroundwaterPressure, startBathroomRepair } from '../src/simulation/bathroomRepairs';
import { brushWaterproof } from '../src/tools/surfaceWaterproof';
import { surfaceTemperatureC, thermalColor } from '../src/tools/thermalCamera';
import { drill } from '../src/tools/drill';
import { insertNeedle, startInjection } from '../src/tools/injector';
import { updateRepairs } from '../src/simulation/repairSimulation';
import { cellPoint } from '../src/simulation/wallModel';

test('drain leak responds to drain events; surface coating cannot repair a live drain pipe', () => {
  const e = new SimulationEngine('drain');
  e.update(24);
  const source = e.state.waterSources.find(item => item.kind === 'drain')!;
  const pipe = e.state.pipes.find(item => item.service === 'drain')!;
  const wetBefore = e.state.metrics.wallSurfaceMax;
  assert.ok(source.flow > 0);
  assert.equal(setDrainUse(e.state, 0).ok, true);
  e.update(.5);
  assert.equal(source.flow, 0);
  assert.equal(startBathroomRepair(e.state, 'drain').ok, true);
  e.update(12);
  assert.equal(e.state.repairs.drainRepaired, true);
  assert.equal(pipe.isolated, true);
  assert.equal(setDrainUse(e.state, 1).ok, true);
  e.update(.05);
  assert.equal(source.flow, 0, 'same drain use resumes, but the isolated damaged branch stays closed');
  assert.ok(source.unsealedFlow > 0);
  assert.ok(e.state.metrics.wallSurfaceMax > 8, 'repair does not erase stored moisture');
  assert.ok(e.state.metrics.wallSurfaceMax < wetBefore, 'the retained wall begins drying after source repair');
});

test('multi-source repair isolates each cause independently and requires the original use conditions for verification', () => {
  const e = new SimulationEngine('multi');
  e.update(30);
  const area = e.state.waterSources.find(item => item.kind === 'area')!;
  const drain = e.state.waterSources.find(item => item.kind === 'drain')!;
  const areaFlowBefore = area.flow, drainFlowBefore = drain.flow;
  assert.ok(areaFlowBefore > 0 && drainFlowBefore > 0);

  setBathroomSupply(e.state, 'use', 0);
  assert.equal(startBathroomRepair(e.state, 'waterproof').ok, true);
  e.update(15);
  assert.equal(e.state.repairs.waterproofRepaired, true);
  setBathroomSupply(e.state, 'use', .72);
  e.update(1);
  assert.ok(area.flow < areaFlowBefore * .1, 'repaired membrane suppresses the face-water source');
  assert.ok(drain.flow > 0, 'drain leak remains after membrane repair');

  setDrainUse(e.state, 0);
  assert.equal(startBathroomRepair(e.state, 'drain').ok, true);
  e.update(12);
  setDrainUse(e.state, .72);
  e.update(.05);
  assert.equal(drain.flow, 0, 'repaired drain branch remains isolated after the same event resumes');
  assert.ok(e.state.metrics.surfaceMax > 8, 'stored water remains after both source repairs');
});

test('basement seepage is pressure-driven and repaired waterproofing blocks restored pressure without instant drying', () => {
  const e = new SimulationEngine('basement');
  e.update(18);
  const source = e.state.waterSources[0];
  const initialFlow = source.flow;
  assert.ok(initialFlow > 0);
  assert.equal(startBathroomRepair(e.state, 'waterproof').ok, false, 'repair requires relieving the modeled pressure');
  setGroundwaterPressure(e.state, 0);
  assert.equal(startBathroomRepair(e.state, 'waterproof').ok, true);
  e.update(15);
  assert.equal(e.state.repairs.waterproofRepaired, true);
  setGroundwaterPressure(e.state, .42);
  e.update(.05);
  assert.ok(source.unsealedFlow > 0);
  assert.ok(source.flow < initialFlow * .02);
  assert.ok(e.state.metrics.surfaceMax > 8, 'repair stops new ingress but preserves moisture already in the wall');
});

test('free brush adds local surface coating but neither clears moisture nor changes pipe source flow', () => {
  const e = new SimulationEngine('drain');
  e.update(12);
  const source = e.state.waterSources[0];
  const point = source.position;
  const beforeFlow = source.flow;
  const beforeMoisture = e.state.metrics.meanMoisture;
  const result = brushWaterproof(e.state, 'wall', point);
  assert.ok(result.changed > 0);
  assert.ok(result.cells.every(i => e.state.wall.cells[i].surfaceCoating > 0));
  assert.equal(e.state.metrics.meanMoisture, beforeMoisture);
  e.update(.05);
  assert.equal(source.flow, beforeFlow, 'pipe flow is independent from the wall-finish coating');
  assert.ok(e.state.wall.cells.some(cell => cell.moisture > 8));
});

test('epoxy bonds only to connected dry cracks; gel cures in a wet connected path without PU expansion', () => {
  const epoxy = new SimulationEngine('crack');
  const epoxyPort = drill(epoxy.state, { x: -1.125, y: 3.625 })!;
  assert.ok(epoxyPort.connected);
  epoxy.update(2); assert.equal(insertNeedle(epoxy.state, epoxyPort.id), true);
  assert.equal(startInjection(epoxy.state, epoxyPort.id, 'epoxy'), true);
  epoxy.update(5);
  assert.ok(epoxy.state.wall.cells[epoxyPort.cell].epoxy > 0 || epoxy.state.wall.cells[epoxyPort.cell].epoxyBond > 0);
  epoxy.state.repairs.activePortId = null;
  const epoxyDelta = new Float64Array(epoxy.state.wall.cells.length);
  for (let i = 0; i < 100; i++) updateRepairs(epoxy.state, .05, epoxyDelta);
  assert.ok(epoxy.state.wall.cells[epoxyPort.cell].epoxyBond > 0);
  assert.equal(epoxy.state.wall.cells[epoxyPort.cell].expansion, 0);

  const gel = new SimulationEngine('crack');
  const gelPort = drill(gel.state, { x: -1.125, y: 3.625 })!;
  gel.update(2); assert.equal(insertNeedle(gel.state, gelPort.id), true);
  gel.state.wall.cells[gelPort.cell].moisture = 62;
  assert.equal(startInjection(gel.state, gelPort.id, 'acrylate'), true);
  gel.update(10);
  gel.state.repairs.activePortId = null;
  const gelDelta = new Float64Array(gel.state.wall.cells.length);
  for (let i = 0; i < 120; i++) updateRepairs(gel.state, .05, gelDelta);
  assert.ok(gel.state.wall.cells[gelPort.cell].gelSeal > 0);
  assert.equal(gel.state.wall.cells[gelPort.cell].expansion, 0);

  const invalid = new SimulationEngine('crack');
  const wrong = drill(invalid.state, { x: 3, y: 3 })!;
  invalid.update(2); insertNeedle(invalid.state, wrong.id);
  assert.equal(startInjection(invalid.state, wrong.id, 'epoxy'), false, 'epoxy must not claim a non-connected hole');
});

test('thermal estimate is deterministic, responds to wetness and a modeled hot supply line', () => {
  const e = new SimulationEngine('hotpipe');
  e.update(.05);
  const pipeCell = cellPoint(e.state.wall, e.state.pipes[0].cells[0]);
  const warm = surfaceTemperatureC(e.state, pipeCell)!;
  assert.ok(warm > e.state.environment.ambientTemperatureC);
  assert.equal(surfaceTemperatureC(e.state, pipeCell), warm);

  const dry = { x: 4.75, y: .125 };
  const dryTemperature = surfaceTemperatureC(e.state, dry)!;
  e.state.wall.cells[0].moisture = 100;
  const wetTemperature = surfaceTemperatureC(e.state, { x: -5.125, y: .125 })!;
  assert.ok(wetTemperature < dryTemperature, 'wet cell receives a small modeled cooling offset');
});

test('thermal palette moves from dark purple at low temperature through red to orange-yellow at high temperature', () => {
  const channels = (color: string) => color.match(/\d+/g)!.map(Number);
  const cold = channels(thermalColor(19));
  const middle = channels(thermalColor(22));
  const hot = channels(thermalColor(24));
  assert.ok(cold[2] > cold[0], 'cold end is purple');
  assert.ok(cold.reduce((sum, channel) => sum + channel, 0) < middle.reduce((sum, channel) => sum + channel, 0), 'cold end is darkest');
  assert.ok(middle[0] > middle[2], 'warm range shifts toward red');
  assert.ok(hot[0] > 240 && hot[1] > 100, 'hot range reaches orange-red');
  const contrast = channels(thermalColor(20)).reduce((sum, channel, index) => sum + Math.abs(channel - channels(thermalColor(22))[index]), 0);
  assert.ok(contrast > 100, 'a two-degree change has a visibly stronger color separation');
});
