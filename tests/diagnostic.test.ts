import test from 'node:test';
import assert from 'node:assert/strict';
import { SimulationEngine } from '../src/simulation/SimulationEngine';
import { setBathroomSupply, setDrainUse, setGroundwaterPressure, startBathroomRepair } from '../src/simulation/bathroomRepairs';
import { brushWaterproof } from '../src/tools/surfaceWaterproof';
import { surfaceTemperatureC, thermalAssessment, thermalColor } from '../src/tools/thermalCamera';
import { appendDiagnosticEvidence, setGroundwaterLevel, setHypothesisConfidence, setHypothesisSelection, startDrainBranchTest, submitDiagnosis } from '../src/simulation/diagnostics';
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

test('multiple leaking drain branches can be repaired and verified independently', () => {
  const e = new SimulationEngine('drain'); e.update(1);
  const firstSource = e.state.waterSources.find(item => item.kind === 'drain')!;
  const firstPipe = e.state.pipes.find(item => item.id === firstSource.pipeId)!;
  const secondId = 'leaking-drain-secondary', rowOffset = e.state.wall.cols * 2;
  e.state.pipes.push({ ...structuredClone(firstPipe), id: secondId, cells: firstPipe.cells.map(cell => cell + rowOffset), route: firstPipe.route.map(point => ({ x: point.x + .8, y: point.y })) });
  const secondSource = { ...structuredClone(firstSource), pipeId: secondId, cell: firstSource.cell + rowOffset, position: { x: firstSource.position.x + .8, y: firstSource.position.y }, flow: 0, unsealedFlow: 0 };
  e.state.waterSources.push(secondSource);
  e.update(.05);
  assert.ok(firstSource.flow > 0 && secondSource.flow > 0);

  setDrainUse(e.state, 0);
  assert.equal(startBathroomRepair(e.state, 'drain').ok, false, 'multiple active branches require explicit selection');
  assert.equal(startBathroomRepair(e.state, 'drain', 'wall', 'unknown-branch').ok, false);
  assert.equal(startBathroomRepair(e.state, 'drain', 'wall', secondId).ok, true);
  assert.equal(e.state.repairs.job!.pipeId, secondId);
  e.update(12);
  const secondPipe = e.state.pipes.find(pipe => pipe.id === secondId)!;
  assert.equal(secondPipe.isolated, true);
  assert.equal(firstPipe.isolated, false);
  assert.equal(e.state.repairs.drainRepaired, false, 'the scenario is not fully repaired while one branch still leaks');
  setDrainUse(e.state, .7); e.update(.05);
  assert.ok(firstSource.flow > 0);
  assert.equal(secondSource.flow, 0);

  setDrainUse(e.state, 0);
  assert.equal(startBathroomRepair(e.state, 'drain', 'wall', firstPipe.id).ok, true);
  e.update(12);
  assert.equal(firstPipe.isolated, true);
  assert.equal(e.state.repairs.drainRepaired, true);
  assert.equal(e.state.pipes.filter(pipe => pipe.exposed && pipe.service === 'drain').length, 2);
  setDrainUse(e.state, .7); e.update(.05);
  assert.equal(firstSource.flow, 0);
  assert.equal(secondSource.flow, 0);
  assert.ok(firstSource.unsealedFlow > 0 && secondSource.unsealedFlow > 0, 'both original source conditions resume for verification');
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

test('surface cleanup can target a dry cell with persistent mold as its only visible damage', () => {
  const e = new SimulationEngine('drain');
  const cell = e.state.wall.cells[0];
  cell.moldLevel = .4;
  assert.equal(cell.moisture, 8);
  assert.equal(cell.damageLevel, 0);
  assert.equal(cell.saltLevel, 0);
  assert.equal(startBathroomRepair(e.state, 'surface').ok, true);
  assert.ok(e.state.repairs.job!.cells.includes(0));
  e.update(2);
  assert.equal(cell.moldLevel, 0);
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

test('diagnosis evidence is chronological and supports calibrated multiple-source hypotheses', () => {
  const e = new SimulationEngine('multi');
  assert.equal(e.state.diagnostics.evidence[0].kind, 'scenario');
  setDrainUse(e.state, 0);
  appendDiagnosticEvidence(e.state, 'measurement', '牆腳含水讀值', '同材質濕區高於基準區。', { domain: 'wall', position: { x: 0, y: .4 }, value: 62 });
  e.update(1);
  appendDiagnosticEvidence(e.state, 'source-event', '恢復排水', '比較兩種來源反應。');
  assert.ok(e.state.diagnostics.evidence[1].time <= e.state.diagnostics.evidence.at(-1)!.time);
  setHypothesisSelection(e.state, 'bathroom-waterproof', true);
  setHypothesisConfidence(e.state, 'bathroom-waterproof', 100);
  setHypothesisSelection(e.state, 'drain-pipe', true);
  setHypothesisConfidence(e.state, 'drain-pipe', 100);
  for (const id of ['external-crack', 'hot-water-pipe', 'groundwater-pressure', 'condensation'] as const) setHypothesisConfidence(e.state, id, 0);
  const result = submitDiagnosis(e.state);
  assert.equal(result.score, 100);
  assert.deepEqual(result.missed, []);
  assert.deepEqual(result.falseAlarms, []);
  assert.ok(e.state.diagnostics.evidence.some(item => item.kind === 'diagnosis'));
});

test('finite drain-branch test isolates one branch, records flux, and stops on simulation time', () => {
  const e = new SimulationEngine('drain');
  const source = e.state.waterSources.find(item => item.kind === 'drain')!;
  const pipe = e.state.pipes.find(item => item.id === source.pipeId)!;
  const otherId = 'other-drain-branch';
  e.state.pipes.push({ ...structuredClone(pipe), id: otherId, isolated: false });
  e.state.waterSources.push({ ...structuredClone(source), pipeId: otherId, flow: 0, unsealedFlow: 0 });
  assert.equal(setDrainUse(e.state, 0).ok, true);
  assert.equal(startDrainBranchTest(e.state, pipe.id, 5).ok, true);
  e.update(2);
  assert.ok(source.flow > 0);
  assert.equal(e.state.waterSources.find(item => item.pipeId === otherId)!.flow, 0);
  assert.equal(setDrainUse(e.state, 0).ok, false, 'manual source changes are locked during the finite branch test');
  e.update(3.1);
  assert.equal(e.state.diagnostics.activeDrainTest, null);
  assert.equal(e.state.environment.drainUse, 0);
  assert.equal(e.state.diagnostics.lastDrainTest?.pipeId, pipe.id);
  assert.ok(e.state.diagnostics.lastDrainTest!.leakedVolume > 0);
});

test('basement water level derives pressure; negative-side seal reduces surface transport but leaves source flow active', () => {
  const e = new SimulationEngine('basement');
  const source = e.state.waterSources[0];
  const initialPressure = e.state.environment.groundwaterPressure;
  assert.equal(setGroundwaterLevel(e.state, e.state.environment.groundwaterLevel, false).ok, true);
  assert.equal(e.state.environment.groundwaterPressure, initialPressure, 'initial water level and derived pressure match for later same-condition verification');
  assert.equal(setGroundwaterLevel(e.state, .5).ok, true);
  assert.equal(e.state.environment.groundwaterPressure, 0, 'water level below the modeled entry has no hydrostatic head');
  assert.equal(setGroundwaterLevel(e.state, 2).ok, true);
  assert.ok(e.state.environment.groundwaterPressure > 0);
  e.update(28);
  const flowBefore = source.flow;
  const surfaceBefore = e.state.metrics.wallSurfaceMax;
  assert.equal(startBathroomRepair(e.state, 'negative-seal').ok, true, 'interior-side demonstration can be applied with pressure present');
  e.update(8);
  e.update(4);
  assert.equal(e.state.repairs.negativeSideSealed, true);
  assert.ok(Math.abs(source.flow - flowBefore) < .001, 'the upstream groundwater source remains active');
  assert.ok(e.state.wall.cells.some(cell => cell.negativeSideSeal > 0));
  assert.ok(e.state.metrics.internalMax > 8);
  assert.ok(surfaceBefore >= 8);
});

test('thermal assessment warns on small contrast, solar loading, reflective surfaces, and condensation ambiguity', () => {
  const e = new SimulationEngine('hotpipe');
  const point = { x: -5.125, y: .125 };
  const defaultAssessment = thermalAssessment(e.state, point)!;
  e.state.environment.outdoorTemperatureC = 21.5;
  e.state.environment.relativeHumidityPct = 90;
  e.state.environment.solarExposure = 1;
  e.state.environment.solarExposureMinutes = 30;
  e.state.environment.surfaceEmissivity = .4;
  e.state.environment.reflectedTemperatureC = 35;
  const limited = thermalAssessment(e.state, point)!;
  assert.ok(limited.confidence < defaultAssessment.confidence);
  assert.ok(limited.warnings.some(warning => warning.includes('溫差偏小')));
  assert.ok(limited.warnings.some(warning => warning.includes('日照')));
  assert.ok(limited.warnings.some(warning => warning.includes('放射率')));
});
