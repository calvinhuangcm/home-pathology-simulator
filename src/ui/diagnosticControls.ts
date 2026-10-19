import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { Domain, RepairKind, SimulationState } from '../simulation/types';
import type { FieldView } from '../renderer/moistureField';
import { setBathroomSupply, setDrainUse, setGroundwaterPressure, startBathroomRepair } from '../simulation/bathroomRepairs';
import { bathroomSupplyActive, bathroomSupplyKey } from './bathroomControls';

interface Hooks { notify(message: string, type?: string): void; beforeChange(kind: 'stop' | 'repair'): void; changed(): void; changeView(): void; remember(snapshot: SimulationState): void }

export function createDiagnosticControls(engine: SimulationEngine, view: FieldView, hooks: Hooks) {
  const panel = document.createElement('section'); panel.className = 'section'; panel.id = 'diagnosticScenarioPanel'; panel.hidden = true;
  panel.innerHTML = `<div class="section-title"><h2 id="diagnosticTitle">源頭供水控制</h2><span>來源修繕</span></div>
    <p class="hint" id="diagnosticExplanation"></p>
    <div class="field" id="diagnosticSurfaceField"><label for="diagnosticSurface">操作／觀察表面</label><select id="diagnosticSurface"><option value="wall">室內牆面</option><option value="slab">浴室地坪／樓板</option></select></div>
    <div id="areaSupplyControl"><label class="debug-toggle"><input id="diagnosticAreaUse" type="checkbox"> 浴室面狀用水</label></div>
    <div id="drainSupplyControl"><label class="debug-toggle"><input id="diagnosticDrainUse" type="checkbox"> 排水使用（排水期間才供水）</label></div>
    <div class="field" id="groundwaterControl"><label for="groundwaterPressure">地下水壓力 <output id="groundwaterValue">0.42（教學尺度）</output></label><input id="groundwaterPressure" type="range" min="0" max="80" value="42"></div>
    <div class="action-row" id="advancedRepairButtons">
      <button class="btn primary flex" id="diagnosticWaterproofBtn">修復防水層</button>
      <button class="btn primary flex" id="diagnosticDrainBtn">修復排水管</button>
    </div>
    <button class="btn" id="diagnosticSurfaceBtn">只整修目前表面濕損</button>
    <p class="hint" id="diagnosticStatus" role="status"></p>
    <p class="hint">排水管破損只在排水使用時有流量；地下室入水由外側水壓驅動。表面塗刷、清理或批土不能關閉管線供水，也不能消除牆體已儲存的水分。</p>`;
  document.getElementById('scenarioActionSection')!.before(panel);
  const get = <T extends HTMLElement>(id: string): T => panel.querySelector(`#${id}`)!;
  let locked = false;
  get<HTMLSelectElement>('diagnosticSurface').onchange = e => {
    if (locked) return;
    view.surface = (e.target as HTMLSelectElement).value as Domain;
    engine.state.tools.probe = null;
    engine.state.tools.probeDomain = view.surface;
    hooks.changeView();
  };
  const change = (control: 'area' | 'drain' | 'groundwater', value: number): void => {
    if (locked) return;
    const s = engine.state;
    if ((control === 'drain' && value === 0 && s.environment.drainUse > 0)
      || (control === 'area' && value === 0 && s.environment.bathroomUse > 0)
      || (control === 'groundwater' && value === 0 && s.environment.groundwaterPressure > 0)) hooks.beforeChange('stop');
    const result = control === 'area' ? setBathroomSupply(s, 'use', value)
      : control === 'drain' ? setDrainUse(s, value)
        : setGroundwaterPressure(s, value);
    if (!result.ok) hooks.notify(result.message, 'warn');
    hooks.changed();
  };
  get<HTMLInputElement>('diagnosticAreaUse').onchange = e => change('area', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('diagnosticDrainUse').onchange = e => change('drain', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('groundwaterPressure').oninput = e => change('groundwater', Number((e.target as HTMLInputElement).value) / 100);
  const repair = (kind: RepairKind): void => {
    if (locked) return;
    const snapshot = engine.checkpoint();
    const result = startBathroomRepair(engine.state, kind, view.surface as Domain);
    if (result.ok) { hooks.remember(snapshot); hooks.beforeChange('repair'); }
    hooks.notify(result.message, result.ok ? 'good' : 'warn');
    hooks.changed();
  };
  get<HTMLButtonElement>('diagnosticWaterproofBtn').onclick = () => repair('waterproof');
  get<HTMLButtonElement>('diagnosticDrainBtn').onclick = () => repair('drain');
  get<HTMLButtonElement>('diagnosticSurfaceBtn').onclick = () => repair('surface');

  return {
    update(active: boolean, verifying: boolean) {
      panel.hidden = !active; locked = verifying;
      if (!active) return;
      const s = engine.state, multi = s.scenarioId === 'multi', drain = s.scenarioId === 'drain', basement = s.scenarioId === 'basement', job = s.repairs.job;
      get('diagnosticSurfaceField').hidden = !multi;
      get<HTMLSelectElement>('diagnosticSurface').value = view.surface === 'slab' ? 'slab' : 'wall';
      get('diagnosticExplanation').textContent = drain
        ? '排水管破損：水流只在浴室排水事件發生時進入牆內，關閉供水閥或只重塗壁面不能修好排水管。'
        : multi ? '多重漏水：浴室防水層失效與排水管破損同時存在；兩個來源分開供水、分開修復，處理一處後另一處仍會漏。'
          : '地下室負水壓：地下水從外側防水缺損受壓進入，症狀可能在更低處出現；修復迎水面前須先解除示範水壓。';
      get('areaSupplyControl').hidden = !multi;
      get('drainSupplyControl').hidden = !drain && !multi;
      get('groundwaterControl').hidden = !basement;
      get<HTMLButtonElement>('diagnosticWaterproofBtn').hidden = !multi && !basement;
      get<HTMLButtonElement>('diagnosticDrainBtn').hidden = !drain && !multi;
      get<HTMLInputElement>('diagnosticAreaUse').checked = s.environment.bathroomUse > 0;
      get<HTMLInputElement>('diagnosticDrainUse').checked = s.environment.drainUse > 0;
      get<HTMLInputElement>('groundwaterPressure').value = String(Math.round(s.environment.groundwaterPressure * 100));
      get('groundwaterValue').textContent = `${s.environment.groundwaterPressure.toFixed(2)}（教學尺度）`;
      get<HTMLButtonElement>('diagnosticWaterproofBtn').disabled = verifying || !!job;
      get<HTMLButtonElement>('diagnosticDrainBtn').disabled = verifying || !!job;
      get<HTMLButtonElement>('diagnosticSurfaceBtn').disabled = verifying || !!job;
      get<HTMLInputElement>('diagnosticAreaUse').disabled = verifying || job?.kind === 'waterproof';
      get<HTMLInputElement>('diagnosticDrainUse').disabled = verifying || job?.kind === 'drain';
      get<HTMLInputElement>('groundwaterPressure').disabled = verifying || job?.kind === 'waterproof';
      get<HTMLSelectElement>('diagnosticSurface').disabled = verifying || !!job;
      const sources = s.waterSources.map(source => `${source.kind} ${source.flow.toFixed(2)}`).join(' · ');
      const status = job ? `${{ surface: '表面整修', waterproof: '迎水側防水修復', bypass: '供水管改管', drain: '排水管修復' }[job.kind]} ${job.elapsed.toFixed(1)} / ${job.duration}s${s.running && s.timeScale > 0 ? '' : ' · 已暫停'}`
        : `目前來源通量：${sources} · 地下水壓 ${s.environment.groundwaterPressure.toFixed(2)} · 已修復：${[
          s.repairs.waterproofRepaired ? '防水層' : '', s.repairs.drainRepaired ? '排水管' : '',
        ].filter(Boolean).join('、') || '尚無'}`;
      get('diagnosticStatus').textContent = `${status} · 供水條件 ${bathroomSupplyKey(s)}${bathroomSupplyActive(s) ? '（作用中）' : '（已停止）'}`;
    },
  };
}
