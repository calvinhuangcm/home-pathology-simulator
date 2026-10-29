import type { DiagnosticEvidence, DrainBranchTestResult, HypothesisId, SimulationState } from './types';
import { clamp } from './wallModel';

export const hypothesisLabels: Record<HypothesisId, string> = {
  'external-crack': '外牆裂縫／接縫滲水',
  'bathroom-waterproof': '浴室防水層失效',
  'hot-water-pipe': '牆內熱水給水管破損',
  'drain-pipe': '排水管或排水接頭破損',
  'groundwater-pressure': '地下水／負水壓滲入',
  condensation: '室內濕氣／表面結露',
};

export function appendDiagnosticEvidence(
  state: SimulationState,
  kind: DiagnosticEvidence['kind'],
  title: string,
  detail: string,
  location?: Pick<DiagnosticEvidence, 'domain' | 'position' | 'value'>,
): DiagnosticEvidence {
  const event: DiagnosticEvidence = {
    id: state.diagnostics.nextEvidenceId++, time: state.simulationTime, kind, title, detail,
    ...(location?.domain ? { domain: location.domain } : {}),
    ...(location?.position ? { position: { ...location.position } } : {}),
    ...(Number.isFinite(location?.value) ? { value: location!.value } : {}),
  };
  state.diagnostics.evidence.push(event);
  if (state.diagnostics.evidence.length > 80) state.diagnostics.evidence.splice(0, state.diagnostics.evidence.length - 80);
  return event;
}

export function setHypothesisSelection(state: SimulationState, id: HypothesisId, selected: boolean): void {
  state.diagnostics.hypotheses[id].selected = selected;
  state.diagnostics.result = null;
}

export function setHypothesisConfidence(state: SimulationState, id: HypothesisId, confidence: number): void {
  state.diagnostics.hypotheses[id].confidence = Math.round(clamp(confidence, 0, 100));
  state.diagnostics.result = null;
}

function actualHypotheses(state: SimulationState): Set<HypothesisId> {
  const actual = new Set<HypothesisId>();
  for (const source of state.waterSources) {
    if (source.kind === 'rain') actual.add('external-crack');
    if (source.kind === 'area') actual.add('bathroom-waterproof');
    if (source.kind === 'pipe') actual.add('hot-water-pipe');
    if (source.kind === 'drain') actual.add('drain-pipe');
    if (source.kind === 'groundwater') actual.add('groundwater-pressure');
  }
  return actual;
}

export function submitDiagnosis(state: SimulationState) {
  const ids = Object.keys(hypothesisLabels) as HypothesisId[];
  const actual = actualHypotheses(state);
  const detected = ids.filter(id => state.diagnostics.hypotheses[id].selected && actual.has(id));
  const missed = ids.filter(id => actual.has(id) && !state.diagnostics.hypotheses[id].selected);
  const falseAlarms = ids.filter(id => !actual.has(id) && state.diagnostics.hypotheses[id].selected);
  const selectedCount = ids.filter(id => state.diagnostics.hypotheses[id].selected).length;
  const precision = selectedCount ? detected.length / selectedCount : 0;
  const recall = actual.size ? detected.length / actual.size : 0;
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  const calibration = ids.reduce((sum, id) => {
    const belief = state.diagnostics.hypotheses[id].confidence / 100;
    return sum + 1 - Math.abs(belief - Number(actual.has(id)));
  }, 0) / ids.length;
  const result = {
    score: Math.round((f1 * .8 + calibration * .2) * 100),
    precision: Math.round(precision * 100), recall: Math.round(recall * 100), calibration: Math.round(calibration * 100),
    detected, missed, falseAlarms,
  };
  state.diagnostics.result = result;
  const actualNames = [...actual].map(id => hypothesisLabels[id]);
  appendDiagnosticEvidence(state, 'diagnosis', '提交診斷', `得分 ${result.score}；本情境來源：${actualNames.join('、') || '未分類來源'}。`);
  return result;
}

export function startDrainBranchTest(state: SimulationState, pipeId: string, durationSeconds = 20): { ok: boolean; message: string } {
  if (state.scenarioId !== 'drain' && state.scenarioId !== 'multi') return { ok: false, message: '目前情境沒有可測試的排水支管。' };
  if (state.diagnostics.activeDrainTest) return { ok: false, message: '目前已有排水分支測試進行中。' };
  if (state.environment.drainUse > 0) return { ok: false, message: '請先關閉一般排水使用，再開始單一支管測試。' };
  const pipe = state.pipes.find(candidate => candidate.id === pipeId && candidate.service === 'drain' && candidate.leaking && !candidate.isolated);
  const source = state.waterSources.find(candidate => candidate.kind === 'drain' && candidate.pipeId === pipeId);
  if (!pipe || !source) return { ok: false, message: '所選支管不是目前仍連通的漏水來源。' };
  const safeDuration = clamp(durationSeconds, 5, 60);
  state.diagnostics.activeDrainTest = { pipeId, durationSeconds: safeDuration, elapsedSeconds: 0, leakedVolume: 0, peakFlow: 0 };
  state.environment.drainUse = 1;
  appendDiagnosticEvidence(state, 'test', '單一排水支管測試開始', `支管 ${pipeId}；供水將在 ${safeDuration} 秒模擬時間後自動停止。`);
  return { ok: true, message: `已開始 ${safeDuration} 秒單一支管排水測試；其他支管維持關閉。` };
}

export function stopDrainBranchTest(state: SimulationState): boolean {
  const test = state.diagnostics.activeDrainTest;
  if (!test) return false;
  state.environment.drainUse = 0;
  state.diagnostics.activeDrainTest = null;
  appendDiagnosticEvidence(state, 'test', '單一排水支管測試中止', `支管 ${test.pipeId}；已測 ${test.elapsedSeconds.toFixed(1)} 秒，累計相對漏水量 ${test.leakedVolume.toFixed(3)}。`);
  return true;
}

/** Advance a finite branch test using simulation time and the measured source flux. */
export function updateDrainBranchTest(state: SimulationState, dt: number): DrainBranchTestResult | null {
  const test = state.diagnostics.activeDrainTest;
  if (!test || dt <= 0) return null;
  const source = state.waterSources.find(candidate => candidate.kind === 'drain' && candidate.pipeId === test.pipeId);
  const flow = source?.flow ?? 0;
  test.elapsedSeconds = Math.min(test.durationSeconds, test.elapsedSeconds + dt);
  test.leakedVolume += flow * dt;
  test.peakFlow = Math.max(test.peakFlow, flow);
  if (test.elapsedSeconds + 1e-8 < test.durationSeconds) return null;
  const result: DrainBranchTestResult = {
    pipeId: test.pipeId, durationSeconds: test.durationSeconds, leakedVolume: test.leakedVolume,
    peakFlow: test.peakFlow, completedAt: state.simulationTime,
  };
  state.environment.drainUse = 0;
  state.diagnostics.activeDrainTest = null;
  state.diagnostics.lastDrainTest = result;
  appendDiagnosticEvidence(state, 'test', '單一排水支管測試完成', `支管 ${result.pipeId}；峰值通量 ${result.peakFlow.toFixed(3)}，累計相對漏水量 ${result.leakedVolume.toFixed(3)}。`);
  return result;
}

export function setGroundwaterLevel(state: SimulationState, level: number, record = true): { ok: boolean; message: string } {
  if (!Number.isFinite(level)) return { ok: false, message: '地下水位數值無效。' };
  if (state.repairs.job?.kind === 'waterproof' && level > 0) return { ok: false, message: '迎水側防水修復中，請等待完成後再恢復地下水位。' };
  const bounded = clamp(level, 0, 6);
  const source = state.waterSources.find(candidate => candidate.kind === 'groundwater');
  state.environment.groundwaterLevel = bounded;
  state.environment.groundwaterPressure = source ? clamp((bounded - source.position.y) * .67, 0, .8) : 0;
  if (record) appendDiagnosticEvidence(state, 'source-event', '地下水位調整', `相對水位 ${bounded.toFixed(2)}；推導水壓 ${state.environment.groundwaterPressure.toFixed(2)}（教學尺度）。`, { value: state.environment.groundwaterPressure });
  return { ok: true, message: '地下水位與相對水壓已更新。' };
}
