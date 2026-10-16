import type { Domain, RepairKind, SimulationState } from './types';

export interface ActionResult { ok: boolean; message: string }
export function startBathroomRepair(s: SimulationState, kind: RepairKind, domain: Domain = 'wall'): ActionResult {
  if (s.scenarioId === 'crack') return { ok: false, message: '此修繕工具適用浴室案例。' };
  if (s.repairs.job) return { ok: false, message: '請先等目前修繕完成。' };
  let cells: number[] = [];
  if (kind === 'waterproof') {
    if (s.scenarioId !== 'bathroom') return { ok: false, message: '管線破損不會因重作防水而修復。' };
    if (s.environment.bathroomUse > 0) return { ok: false, message: '請先停止淋浴／地坪用水，再進行防水層修復。' };
    if (s.repairs.waterproofRepaired) return { ok: false, message: '防水層已修復，請恢復用水驗證。' };
    domain = 'slab'; cells = s.waterSources.flatMap(source => source.defects);
  } else if (kind === 'bypass') {
    if (s.scenarioId !== 'hotpipe') return { ok: false, message: '本案例的來源是防水層，改管無法解決。' };
    if (s.environment.pipeValveOpen) return { ok: false, message: '請先關閉熱水供水閥，再隔離舊管與安裝明管。' };
    if (s.repairs.bypassInstalled) return { ok: false, message: '明管已接妥，請重新開閥驗證。' };
  } else {
    const wall = s[domain];
    if (!wall) return { ok: false, message: '此案例沒有該觀察表面。' };
    cells = wall.cells.slice(0, wall.cols * wall.rows).flatMap((c, i) => c.moisture > 15 || c.damageLevel > .01 || c.saltLevel > .01 ? [i] : []);
    if (!cells.length) return { ok: false, message: '目前表面沒有濕損區可清理／重塗；先觀察用水後的變化。' };
  }
  s.repairs.job = { kind, domain, cells, elapsed: 0, duration: kind === 'surface' ? 2 : kind === 'bypass' ? 10 : 15 };
  return { ok: true, message: kind === 'surface' ? '清理並重塗目前濕損區；不改變水源、內部水分與防水層。' : kind === 'bypass' ? '隔離舊管並接通新的外露管路。' : '重作失效防水層及牆地交界。教學作業時間已壓縮。' };
}

export function setBathroomSupply(s: SimulationState, control: 'use' | 'valve' | 'pressure', value: number): ActionResult {
  if (!Number.isFinite(value)) return { ok: false, message: '供水數值無效。' };
  if (s.repairs.job?.kind === 'waterproof' && control === 'use' && value > 0) return { ok: false, message: '防水作業中，請等待完成後再用水。' };
  if (s.repairs.job?.kind === 'bypass' && control === 'valve' && value > 0) return { ok: false, message: '改管作業中，請等待接妥後再開閥。' };
  if (control === 'use') s.environment.bathroomUse = Math.max(0, Math.min(1, value));
  if (control === 'valve') s.environment.pipeValveOpen = value > 0;
  if (control === 'pressure') s.environment.pipePressure = Math.max(0, Math.min(.6, value));
  return { ok: true, message: '供水條件已更新。' };
}

export function updateBathroomRepairs(s: SimulationState, dt: number): void {
  const job = s.repairs.job;
  if (!job) return;
  // Defensive guard for imported snapshots: unsafe supply does not progress work.
  if (job.kind === 'bypass' && s.environment.pipeValveOpen || job.kind === 'waterproof' && s.environment.bathroomUse > 0) return;
  job.elapsed = Math.min(job.duration, job.elapsed + dt);
  if (job.elapsed + 1e-8 < job.duration) return;
  if (job.kind === 'waterproof' && s.slab) {
    for (const i of job.cells) s.slab.cells[i].waterproofLevel = 1;
    s.repairs.waterproofRepaired = true;
  } else if (job.kind === 'bypass') {
    for (const pipe of s.pipes) pipe.isolated = true;
    s.pipes.push({ id: 'new-exposed-hot', cells: [], route: [{ x: 3.625, y: .625 }, { x: 3.625, y: 4.375 }, { x: .625, y: 4.375 }, { x: .625, y: 3.375 }], leaking: false, isolated: false, exposed: true, pressure: 0 });
    s.repairs.bypassInstalled = true;
  } else if (job.kind === 'surface') {
    const wall = s[job.domain];
    if (wall) for (const i of job.cells) {
      const c = wall.cells[i];
      c.saltLevel = 0; c.moldLevel = 0; c.damageLevel = 0; c.surfaceCoating = 1;
      // Stored moisture is deliberately untouched. Continuing supply causes recurrence.
    }
    s.repairs.surfacePatchCount++;
  }
  s.repairs.job = null;
}
