import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { FieldView } from '../renderer/moistureField';
import type { RepairKind, SimulationState } from '../simulation/types';
import { setBathroomSupply, startBathroomRepair } from '../simulation/bathroomRepairs';

export const bathroomSupplyKey = (s: SimulationState): string => s.scenarioId === 'bathroom' ? `use:${s.environment.bathroomUse}` : `valve:${s.environment.pipeValveOpen}:pressure:${s.environment.pipePressure}`;
export const bathroomSupplyActive = (s: SimulationState): boolean => s.scenarioId === 'bathroom' ? s.environment.bathroomUse > 0 : s.environment.pipeValveOpen && s.environment.pipePressure > 0;
interface Hooks { notify(message: string, type?: string): void; beforeChange(kind: 'stop' | 'repair'): void; changed(): void; changeView(): void; remember(snapshot: SimulationState): void }
export function createBathroomControls(engine: SimulationEngine, view: FieldView, hooks: Hooks) {
  const panel = document.createElement('section'); panel.className = 'section'; panel.id = 'bathroomPanel'; panel.hidden = true;
  panel.innerHTML = `<div class="section-title"><h2>浴室 · 供水與源頭修繕</h2><span>Scenario 02</span></div>
    <p class="hint" id="bathroomExplanation"></p>
    <div class="field" id="bathroomSurfaceField"><label for="bathroomSurface">觀察位置（不同房間）</label><select id="bathroomSurface"><option value="wall">相鄰房間 · 浴室外側牆腳</option><option value="floor">相鄰房間 · 室內地板</option><option value="slab">樓下房間 · 天花底面</option></select></div>
    <label class="debug-toggle"><input id="bathroomUse" type="checkbox" checked> 淋浴／地坪用水</label>
    <div id="hotPipeSupply"><label class="debug-toggle"><input id="pipeValve" type="checkbox" checked> 熱水供水閥開啟</label>
    <div class="field"><label for="pipePressure">供水壓力 <output id="pipePressureValue">0.40 MPa</output></label><input id="pipePressure" type="range" min="0" max="60" value="40"></div></div>
    <p class="hint" id="bathroomSupplyStatus" role="status"></p>
    <button class="btn" id="surfacePatchBtn">只清理／重塗目前室內濕損表面</button>
    <button class="btn primary" id="waterproofRepairBtn">重作浴室防水與牆地交界</button>
    <button class="btn primary" id="pipeBypassBtn">隔離舊暗管 → 接通新明管</button>
    <p class="hint" id="bathroomRepairStatus" role="status"></p><progress id="bathroomRepairProgress" max="1" value="0" hidden aria-label="修繕進度"></progress>
    <p class="hint">源頭修復後，恢復相同用水／壓力再選「驗證」。表面整修不會清除內部水分。施工與乾燥時間為壓縮教學尺度。</p>`;
  document.getElementById('scenarioActionSection')!.before(panel);
  const get = <T extends HTMLElement>(id: string): T => panel.querySelector(`#${id}`)!;
  let locked = false;
  const changeSupply = (control: 'use' | 'valve' | 'pressure', value: number): void => {
    if (locked) return;
    if ((control === 'use' || control === 'valve') && value === 0) hooks.beforeChange('stop');
    const result = setBathroomSupply(engine.state, control, value);
    if (!result.ok) hooks.notify(result.message, 'warn');
    hooks.changed();
  };
  get<HTMLInputElement>('bathroomUse').onchange = e => changeSupply('use', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('pipeValve').onchange = e => changeSupply('valve', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('pipePressure').oninput = e => changeSupply('pressure', Number((e.target as HTMLInputElement).value) / 100);
  get<HTMLSelectElement>('bathroomSurface').onchange = e => { const value = (e.target as HTMLSelectElement).value; view.surface = value === 'slab' ? 'slab' : value === 'floor' ? 'floor' : 'wall'; engine.state.tools.probe = null; engine.state.tools.probeDomain = view.surface; engine.state.tools.floorTestArmed = false; hooks.changeView(); };
  const repair = (kind: RepairKind): void => {
    if (locked) return;
    const snapshot = engine.checkpoint();
    const result = startBathroomRepair(engine.state, kind, view.surface);
    if (result.ok) { hooks.remember(snapshot); hooks.beforeChange('repair'); }
    hooks.notify(result.message, result.ok ? 'good' : 'warn'); hooks.changed();
  };
  get<HTMLButtonElement>('surfacePatchBtn').onclick = () => repair('surface');
  get<HTMLButtonElement>('waterproofRepairBtn').onclick = () => repair('waterproof');
  get<HTMLButtonElement>('pipeBypassBtn').onclick = () => repair('bypass');
  return {
    update(active: boolean, verifying: boolean) {
      panel.hidden = !active; locked = verifying;
      for (const id of ['rainSlider', 'rainColorPicker', 'windSlider']) document.getElementById(id)!.closest<HTMLElement>('.field')!.hidden = active;
      document.getElementById('portList')!.closest<HTMLElement>('.section')!.hidden = active;
      document.getElementById('materialSelect')!.closest<HTMLElement>('.field')!.hidden = active;
      if (!active) return;
      const s = engine.state, floor = s.scenarioId === 'bathroom', job = s.repairs.job;
      get('bathroomExplanation').textContent = floor ? '02A：地坪面狀用水 → 防水破口 → 樓板內移動 → 樓下天花／相鄰牆腳。兩個觀察位置共用這組實際水路。' : '02B：老舊熱水暗管破損。停止淋浴仍可能維持管內壓力；關閉供水與隔離破管才會停止持續入水。';
      get('bathroomSurfaceField').hidden = !floor;
      get<HTMLSelectElement>('bathroomSurface').value = view.surface;
      get('hotPipeSupply').hidden = floor;
      get<HTMLInputElement>('bathroomUse').checked = s.environment.bathroomUse > 0;
      get<HTMLInputElement>('pipeValve').checked = s.environment.pipeValveOpen;
      get<HTMLInputElement>('pipePressure').value = String(s.environment.pipePressure * 100);
      get('pipePressureValue').textContent = `${s.environment.pipePressure.toFixed(2)} MPa`;
      get('bathroomSupplyStatus').textContent = floor ? `地坪用水${s.environment.bathroomUse ? '開啟' : '停止'} · 樓板入滲通量 ${s.metrics.leakRate.toFixed(2)}（教學尺度）` : `舊暗管 ${s.pipes.find(p => !p.exposed)?.pressure.toFixed(2)} MPa · ${s.repairs.bypassInstalled ? (bathroomSupplyActive(s) ? '新明管已恢復供水，舊管已隔離' : '新明管已接妥，等待重新供水驗證') : '尚未隔離舊管'} · 淋浴開關不控制管內壓力`;
      get('waterproofRepairBtn').hidden = !floor; get('pipeBypassBtn').hidden = floor;
      for (const id of ['surfacePatchBtn', 'waterproofRepairBtn', 'pipeBypassBtn']) get<HTMLButtonElement>(id).disabled = verifying || !!job;
      get<HTMLInputElement>('bathroomUse').disabled = verifying || job?.kind === 'waterproof';
      get<HTMLInputElement>('pipeValve').disabled = verifying || job?.kind === 'bypass';
      get<HTMLInputElement>('pipePressure').disabled = verifying || job?.kind === 'bypass';
      get('bathroomRepairStatus').textContent = job ? `${{ surface: '表面整修', waterproof: '防水重作', bypass: '舊管隔離與明管安裝' }[job.kind]} · ${job.elapsed.toFixed(1)} / ${job.duration}s${s.running && s.timeScale > 0 ? '' : ' · 已暫停'}` : `表面整修 ${s.repairs.surfacePatchCount} 次 · ${floor ? s.repairs.waterproofRepaired ? '防水層已重作' : '防水層尚未重作' : s.repairs.bypassInstalled ? '舊管已隔離／明管已接通' : '暗管尚未更換'}`;
      get<HTMLProgressElement>('bathroomRepairProgress').hidden = !job;
      get<HTMLProgressElement>('bathroomRepairProgress').value = job ? job.elapsed / job.duration : 0;
    },
  };
}
