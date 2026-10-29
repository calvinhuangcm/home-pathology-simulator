import type { Domain, RepairKind, SimulationState } from './types';
import { appendDiagnosticEvidence } from './diagnostics';

export interface ActionResult { ok: boolean; message: string }
export function startBathroomRepair(s: SimulationState, kind: RepairKind, domain: Domain = 'wall', targetPipeId?: string): ActionResult {
  if (s.scenarioId === 'crack') return { ok: false, message: '此修繕工具適用浴室案例。' };
  if (s.repairs.job) return { ok: false, message: '請先等目前修繕完成。' };
  let cells: number[] = [];
  let pipeId: string | undefined;
  let side: 'positive' | 'negative' | undefined;
  if (kind === 'waterproof') {
    if (s.scenarioId === 'bathroom' || s.scenarioId === 'multi') {
      if (s.environment.bathroomUse > 0) return { ok: false, message: '請先停止浴室用水，再進行迎水側防水層修復。' };
      domain = 'slab';
    } else if (s.scenarioId === 'basement') {
      if (s.environment.groundwaterPressure > 0) return { ok: false, message: '負水壓仍在作用。先解除示範水壓，再修復迎水側缺損。' };
      domain = 'wall';
    } else return { ok: false, message: '管線破損不會因重作防水而修復。' };
    if (s.repairs.waterproofRepaired) return { ok: false, message: '防水層已修復，請恢復用水驗證。' };
    cells = s.waterSources.filter(source => source.kind === 'area' || source.kind === 'groundwater').flatMap(source => source.defects);
  } else if (kind === 'bypass') {
    if (s.scenarioId !== 'hotpipe') return { ok: false, message: '本案例的來源是防水層，改管無法解決。' };
    if (s.environment.pipeValveOpen) return { ok: false, message: '請先關閉熱水供水閥，再隔離舊管與安裝明管。' };
    if (s.repairs.bypassInstalled) return { ok: false, message: '明管已接妥，請重新開閥驗證。' };
  } else if (kind === 'drain') {
    if (s.scenarioId !== 'drain' && s.scenarioId !== 'multi') return { ok: false, message: '目前情境沒有破損排水管來源。' };
    if (s.environment.drainUse > 0) return { ok: false, message: '請先停止排水使用，再修復破損排水管。' };
    if (s.repairs.drainRepaired) return { ok: false, message: '排水管已修復，請恢復排水驗證。' };
    const sourcePipeIds = new Set(s.waterSources.filter(source => source.kind === 'drain' && source.pipeId).map(source => source.pipeId!));
    const activePipes = s.pipes.filter(pipe => pipe.service === 'drain' && pipe.leaking && !pipe.isolated && sourcePipeIds.has(pipe.id));
    if (!activePipes.length) return { ok: false, message: '目前沒有連接漏水來源的排水支管可修復。' };
    if (targetPipeId) {
      if (!activePipes.some(pipe => pipe.id === targetPipeId)) return { ok: false, message: '所選排水支管已修復或不屬於目前漏水來源。' };
      pipeId = targetPipeId;
    } else if (activePipes.length === 1) pipeId = activePipes[0].id;
    else return { ok: false, message: '目前有多條漏水排水支管，請先選擇要修復的支管。' };
  } else if (kind === 'negative-seal') {
    if (s.scenarioId !== 'basement') return { ok: false, message: '室內側負水壓封堵僅供地下室情境示範。' };
    domain = 'wall'; side = 'negative';
    const size = s.wall.cols * s.wall.rows;
    cells = [...new Set(s.cracks.filter(index => Math.floor(index / size) === 0))];
    if (!cells.length) return { ok: false, message: '目前沒有可供室內側封堵示範的連通裂縫。' };
    if (s.repairs.negativeSideSealed) return { ok: false, message: '室內側封堵已施作，請在相同水位下驗證。' };
  } else {
    const wall = s[domain];
    if (!wall) return { ok: false, message: '此案例沒有該觀察表面。' };
    cells = wall.cells.slice(0, wall.cols * wall.rows).flatMap((c, i) => c.moisture > 15 || c.damageLevel > .01 || c.saltLevel > .01 || c.moldLevel > .01 ? [i] : []);
    if (!cells.length) return { ok: false, message: '目前表面沒有濕損區可清理／重塗；先觀察用水後的變化。' };
  }
  s.repairs.job = { kind, domain, cells, elapsed: 0, duration: kind === 'surface' ? 2 : kind === 'bypass' ? 10 : kind === 'drain' ? 12 : kind === 'negative-seal' ? 8 : 15, ...(pipeId ? { pipeId } : {}), ...(side ? { side } : {}) };
  const message = kind === 'surface' ? '清理並重塗目前濕損區；不改變水源、內部水分與防水層。'
    : kind === 'bypass' ? '隔離舊給水管並接通新的外露管路。'
      : kind === 'drain' ? '已選定漏水排水支管；只有排水使用停止時才施工。'
      : kind === 'negative-seal' ? '室內側負水壓封堵僅降低水分向室內表面的傳輸，外側水源仍持續供水；須在原水位下查看內部含水變化。'
        : s.scenarioId === 'basement' ? '修復負水壓迎水側的防水缺損；示範水壓解除後才可施工。'
          : '重作失效防水層及牆地交界。教學作業時間已壓縮。';
  appendDiagnosticEvidence(s, 'repair', '修繕作業開始', message);
  return { ok: true, message };
}

export function setBathroomSupply(s: SimulationState, control: 'use' | 'valve' | 'pressure', value: number): ActionResult {
  if (!Number.isFinite(value)) return { ok: false, message: '供水數值無效。' };
  if (s.repairs.job?.kind === 'waterproof' && control === 'use' && value > 0) return { ok: false, message: '防水作業中，請等待完成後再用水。' };
  if (s.repairs.job?.kind === 'bypass' && control === 'valve' && value > 0) return { ok: false, message: '改管作業中，請等待接妥後再開閥。' };
  if (control === 'use') s.environment.bathroomUse = Math.max(0, Math.min(1, value));
  if (control === 'valve') s.environment.pipeValveOpen = value > 0;
  if (control === 'pressure') s.environment.pipePressure = Math.max(0, Math.min(.6, value));
  const valueDescription = control === 'use' ? `浴室用水 ${s.environment.bathroomUse > 0 ? '開始' : '停止'}`
    : control === 'valve' ? `給水閥 ${s.environment.pipeValveOpen ? '開啟' : '關閉'}` : `給水壓力調整至 ${s.environment.pipePressure.toFixed(2)}（教學尺度）`;
  appendDiagnosticEvidence(s, 'source-event', valueDescription, '供水條件變化已記錄；注意觀察入水與症狀的時間關係。', { value: control === 'use' ? s.environment.bathroomUse : control === 'valve' ? Number(s.environment.pipeValveOpen) : s.environment.pipePressure });
  return { ok: true, message: '供水條件已更新。' };
}

export function setDrainUse(s: SimulationState, value: number): ActionResult {
  if (!Number.isFinite(value)) return { ok: false, message: '排水使用數值無效。' };
  if (s.diagnostics.activeDrainTest) return { ok: false, message: '單一排水支管測試中，請等待自動結束或中止測試。' };
  if (s.repairs.job?.kind === 'drain' && value > 0) return { ok: false, message: '排水管修復作業中，請等待完成後再排水。' };
  s.environment.drainUse = Math.max(0, Math.min(1, value));
  appendDiagnosticEvidence(s, 'source-event', `排水使用${s.environment.drainUse > 0 ? '開始' : '停止'}`, '已記錄排水事件；對照來源通量與延遲後的濕度變化。', { value: s.environment.drainUse });
  return { ok: true, message: '排水使用條件已更新。' };
}

export function setGroundwaterPressure(s: SimulationState, value: number): ActionResult {
  if (!Number.isFinite(value)) return { ok: false, message: '地下水壓力數值無效。' };
  if (s.repairs.job?.kind === 'waterproof' && s.scenarioId === 'basement' && value > 0) return { ok: false, message: '迎水側防水修復中，請等待完成後再恢復水壓。' };
  s.environment.groundwaterPressure = Math.max(0, Math.min(.8, value));
  const source = s.waterSources.find(candidate => candidate.kind === 'groundwater');
  if (source) s.environment.groundwaterLevel = Math.min(6, source.position.y + s.environment.groundwaterPressure / .67);
  appendDiagnosticEvidence(s, 'source-event', `地下水壓調整至 ${s.environment.groundwaterPressure.toFixed(2)}`, '紀錄水壓變化，與牆腳／牆地交界含水趨勢交叉比較。', { value: s.environment.groundwaterPressure });
  return { ok: true, message: '地下水壓力條件已更新。' };
}

export function updateBathroomRepairs(s: SimulationState, dt: number): void {
  const job = s.repairs.job;
  if (!job) return;
  // Defensive guard for imported snapshots: unsafe supply does not progress work.
  if (job.kind === 'bypass' && s.environment.pipeValveOpen
    || job.kind === 'waterproof' && (s.scenarioId === 'basement' ? s.environment.groundwaterPressure > 0 : s.environment.bathroomUse > 0)
    || job.kind === 'drain' && s.environment.drainUse > 0) return;
  job.elapsed = Math.min(job.duration, job.elapsed + dt);
  if (job.elapsed + 1e-8 < job.duration) return;
  if (job.kind === 'waterproof') {
    const grid = s[job.domain];
    if (grid) for (const i of job.cells) grid.cells[i].waterproofLevel = 1;
    s.repairs.waterproofRepaired = true;
  } else if (job.kind === 'bypass') {
    for (const pipe of s.pipes) if (pipe.service === 'supply') pipe.isolated = true;
    s.pipes.push({ id: 'new-exposed-hot', cells: [], route: [{ x: 3.625, y: .625 }, { x: 3.625, y: 4.375 }, { x: .625, y: 4.375 }, { x: .625, y: 3.375 }], leaking: false, isolated: false, exposed: true, pressure: 0, service: 'supply', waterTemperatureC: 48 });
    s.repairs.bypassInstalled = true;
  } else if (job.kind === 'drain') {
    const old = s.pipes.find(pipe => pipe.id === job.pipeId && pipe.service === 'drain' && pipe.leaking && !pipe.isolated);
    if (old) {
      old.isolated = true;
      const replacementBase = `repaired-exposed-${old.id}`;
      let replacementId = replacementBase, suffix = 1;
      while (s.pipes.some(pipe => pipe.id === replacementId)) replacementId = `${replacementBase}-${suffix++}`;
      s.pipes.push({ id: replacementId, cells: [], route: old.route, leaking: false, isolated: false, exposed: true, pressure: 0, service: 'drain', waterTemperatureC: s.environment.ambientTemperatureC });
    }
    const drainSources = s.waterSources.filter(source => source.kind === 'drain' && source.pipeId);
    s.repairs.drainRepaired = drainSources.length > 0 && drainSources.every(source => {
      const pipe = s.pipes.find(candidate => candidate.id === source.pipeId && candidate.service === 'drain');
      return !!pipe && (!pipe.leaking || pipe.isolated);
    });
  } else if (job.kind === 'surface') {
    const wall = s[job.domain];
    if (wall) for (const i of job.cells) {
      const c = wall.cells[i];
      c.saltLevel = 0; c.moldLevel = 0; c.damageLevel = 0; c.surfaceCoating = 1;
      // Stored moisture is deliberately untouched. Continuing supply causes recurrence.
    }
    s.repairs.surfacePatchCount++;
  } else if (job.kind === 'negative-seal') {
    const wall = s[job.domain];
    if (wall) for (const index of job.cells) wall.cells[index].negativeSideSeal = .86;
    s.repairs.negativeSideSealed = true;
  }
  appendDiagnosticEvidence(s, 'repair', '修繕作業完成', job.kind === 'negative-seal'
    ? '室內側封堵完成；它會降低表面出水傳輸，不會切斷地下水源或清除牆內儲水。'
    : `${job.kind} 修繕作業完成；恢復原供水條件後驗證。`);
  s.repairs.job = null;
}
