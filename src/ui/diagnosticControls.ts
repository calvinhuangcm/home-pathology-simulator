import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { Domain, RepairKind, SimulationState } from '../simulation/types';
import type { FieldView } from '../renderer/moistureField';
import { setBathroomSupply, setDrainUse, startBathroomRepair } from '../simulation/bathroomRepairs';
import { setGroundwaterLevel, startDrainBranchTest, stopDrainBranchTest } from '../simulation/diagnostics';
import { bathroomSupplyActive, bathroomSupplyKey } from './bathroomControls';

interface Hooks { notify(message: string, type?: string): void; beforeChange(kind: 'stop' | 'repair'): void; changed(): void; changeView(): void; remember(snapshot: SimulationState): void }

export function createDiagnosticControls(engine: SimulationEngine, view: FieldView, hooks: Hooks) {
  const panel = document.createElement('section'); panel.className = 'section'; panel.id = 'diagnosticScenarioPanel'; panel.hidden = true;
  panel.innerHTML = `<div class="section-title"><h2 id="diagnosticTitle">源頭供水控制</h2><span>來源修繕</span></div>
    <p class="hint" id="diagnosticExplanation"></p>
    <div class="field" id="diagnosticSurfaceField"><label for="diagnosticSurface">操作／觀察表面</label><select id="diagnosticSurface"><option value="wall">室內牆面</option><option value="slab">浴室地坪／樓板</option></select></div>
    <div id="areaSupplyControl"><label class="debug-toggle"><input id="diagnosticAreaUse" type="checkbox"> 浴室面狀用水</label></div>
    <div id="drainSupplyControl"><label class="debug-toggle"><input id="diagnosticDrainUse" type="checkbox"> 一般排水使用（所有漏水支管）</label>
      <div class="field" id="diagnosticDrainTargetField" hidden><label for="diagnosticDrainTarget">測試／修復排水支管</label><select id="diagnosticDrainTarget"></select></div>
      <div class="action-row"><button class="btn flex" id="diagnosticBranchTestBtn">開始 20 秒單支管測試</button><button class="btn flex" id="diagnosticBranchTestStopBtn" hidden>中止支管測試</button></div>
    </div>
    <div class="field" id="groundwaterControl"><label for="groundwaterPressure">地下水位相對高度 <output id="groundwaterValue">1.75 · 水壓 0.42</output></label><input id="groundwaterPressure" type="range" min="0" max="600" value="175"></div>
    <div class="action-row" id="advancedRepairButtons">
      <button class="btn primary flex" id="diagnosticWaterproofBtn">修復防水層</button>
      <button class="btn flex" id="diagnosticNegativeSealBtn">室內側負水壓封堵</button>
      <button class="btn primary flex" id="diagnosticDrainBtn">修復排水管</button>
    </div>
    <button class="btn" id="diagnosticSurfaceBtn">只整修目前表面濕損</button>
    <p class="hint" id="diagnosticStatus" role="status"></p>
    <p class="hint">排水管破損只在排水使用時有流量；地下室水位推導相對水壓。室內側封堵只降低表面出水，不會切斷外側水源。</p>`;
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
  const change = (control: 'area' | 'drain' | 'groundwater', value: number, record = true): void => {
    if (locked) return;
    const s = engine.state;
    if ((control === 'drain' && value === 0 && s.environment.drainUse > 0)
      || (control === 'area' && value === 0 && s.environment.bathroomUse > 0)
      || (control === 'groundwater' && value === 0 && s.environment.groundwaterPressure > 0)) hooks.beforeChange('stop');
    const result = control === 'area' ? setBathroomSupply(s, 'use', value)
      : control === 'drain' ? setDrainUse(s, value)
        : setGroundwaterLevel(s, value, record);
    if (!result.ok) hooks.notify(result.message, 'warn');
    hooks.changed();
  };
  get<HTMLInputElement>('diagnosticAreaUse').onchange = e => change('area', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('diagnosticDrainUse').onchange = e => change('drain', Number((e.target as HTMLInputElement).checked));
  get<HTMLInputElement>('groundwaterPressure').oninput = e => change('groundwater', Number((e.target as HTMLInputElement).value) / 100, false);
  get<HTMLInputElement>('groundwaterPressure').onchange = e => change('groundwater', Number((e.target as HTMLInputElement).value) / 100, true);
  const repair = (kind: RepairKind): void => {
    if (locked) return;
    const snapshot = engine.checkpoint();
    const targetPipeId = kind === 'drain' ? get<HTMLSelectElement>('diagnosticDrainTarget').value || undefined : undefined;
    const result = startBathroomRepair(engine.state, kind, view.surface as Domain, targetPipeId);
    if (result.ok) { hooks.remember(snapshot); hooks.beforeChange('repair'); }
    hooks.notify(result.message, result.ok ? 'good' : 'warn');
    hooks.changed();
  };
  get<HTMLButtonElement>('diagnosticWaterproofBtn').onclick = () => repair('waterproof');
  get<HTMLButtonElement>('diagnosticNegativeSealBtn').onclick = () => repair('negative-seal');
  get<HTMLButtonElement>('diagnosticDrainBtn').onclick = () => repair('drain');
  get<HTMLButtonElement>('diagnosticSurfaceBtn').onclick = () => repair('surface');
  get<HTMLButtonElement>('diagnosticBranchTestBtn').onclick = () => {
    if (locked) return;
    const snapshot = engine.checkpoint();
    const result = startDrainBranchTest(engine.state, get<HTMLSelectElement>('diagnosticDrainTarget').value);
    if (result.ok) hooks.remember(snapshot);
    hooks.notify(result.message, result.ok ? 'good' : 'warn'); hooks.changed();
  };
  get<HTMLButtonElement>('diagnosticBranchTestStopBtn').onclick = () => {
    if (locked) return;
    if (stopDrainBranchTest(engine.state)) hooks.notify('支管測試已中止，排水已停止。', 'warn');
    hooks.changed();
  };

  return {
    update(active: boolean, verifying: boolean) {
      panel.hidden = !active; locked = verifying;
      if (!active) return;
      const s = engine.state, multi = s.scenarioId === 'multi', drain = s.scenarioId === 'drain', basement = s.scenarioId === 'basement', job = s.repairs.job;
      get('diagnosticSurfaceField').hidden = !multi;
      get<HTMLSelectElement>('diagnosticSurface').value = view.surface === 'slab' ? 'slab' : 'wall';
      get('diagnosticExplanation').textContent = drain
        ? '先停止一般排水，再選一支管做有限時間測試；其他支管保持停用。觀察來源通量與延遲後的濕度變化，再決定是否修復。'
        : multi ? '多重漏水：浴室防水層失效與排水管破損同時存在；可分別測試與修復排水支管，並在相同事件下驗證各來源。'
          : basement ? '地下室負水壓：調整地下水位會推導相對水壓；觀察迎水側缺損與室內牆腳／牆地交界。室內側封堵會保留外側入水，觀察重點是內部儲水與表面出水的差異。'
            : '依量測與供水事件判斷來源；記錄症狀面、時間變化和修繕後的同條件驗證。';
      get('areaSupplyControl').hidden = !multi;
      get('drainSupplyControl').hidden = !drain && !multi;
      get('groundwaterControl').hidden = !basement;
      const drainTargets = [...new Map(s.waterSources.filter(source => source.kind === 'drain' && source.pipeId).map(source => [source.pipeId!, source])).values()]
        .flatMap(source => { const pipe = s.pipes.find(candidate => candidate.id === source.pipeId && candidate.service === 'drain'); return pipe ? [{ source, pipe }] : []; });
      const activeDrainTargets = drainTargets.filter(target => target.pipe.leaking && !target.pipe.isolated);
      const targetSelect = get<HTMLSelectElement>('diagnosticDrainTarget');
      const selectedPipeId = targetSelect.value;
      const targetSignature = activeDrainTargets.map(target => target.pipe.id).join('|');
      if (targetSelect.dataset.pipeIds !== targetSignature) {
        targetSelect.replaceChildren(...activeDrainTargets.map(target => {
          const option = document.createElement('option');
          option.value = target.pipe.id;
          const index = drainTargets.findIndex(candidate => candidate.pipe.id === target.pipe.id) + 1;
          option.textContent = `支管 ${index} · 來源位置 ${target.source.position.x.toFixed(1)}, ${target.source.position.y.toFixed(1)}`;
          return option;
        }));
        targetSelect.dataset.pipeIds = targetSignature;
        targetSelect.value = activeDrainTargets.some(target => target.pipe.id === selectedPipeId) ? selectedPipeId : activeDrainTargets[0]?.pipe.id ?? '';
      }
      get('diagnosticDrainTargetField').hidden = (!drain && !multi) || activeDrainTargets.length === 0;
      targetSelect.disabled = verifying || !!job || activeDrainTargets.length <= 1;
      get<HTMLButtonElement>('diagnosticWaterproofBtn').hidden = !multi && !basement;
      get<HTMLButtonElement>('diagnosticNegativeSealBtn').hidden = !basement;
      get<HTMLButtonElement>('diagnosticDrainBtn').hidden = !drain && !multi;
      get<HTMLInputElement>('diagnosticAreaUse').checked = s.environment.bathroomUse > 0;
      get<HTMLInputElement>('diagnosticDrainUse').checked = s.environment.drainUse > 0;
      get('groundwaterValue').textContent = `${s.environment.groundwaterLevel.toFixed(2)} · 水壓 ${s.environment.groundwaterPressure.toFixed(2)}（教學尺度）`;
      get<HTMLButtonElement>('diagnosticWaterproofBtn').disabled = verifying || !!job;
      get<HTMLButtonElement>('diagnosticNegativeSealBtn').disabled = verifying || !!job || s.repairs.negativeSideSealed;
      get<HTMLButtonElement>('diagnosticDrainBtn').disabled = verifying || !!job;
      get<HTMLButtonElement>('diagnosticSurfaceBtn').disabled = verifying || !!job;
      get<HTMLInputElement>('diagnosticAreaUse').disabled = verifying || job?.kind === 'waterproof';
      get<HTMLInputElement>('diagnosticDrainUse').disabled = verifying || job?.kind === 'drain' || !!s.diagnostics.activeDrainTest;
      get<HTMLInputElement>('groundwaterPressure').value = String(Math.round(s.environment.groundwaterLevel * 100));
      get<HTMLInputElement>('groundwaterPressure').disabled = verifying || job?.kind === 'waterproof';
      get<HTMLSelectElement>('diagnosticSurface').disabled = verifying || !!job;
      const activeTest = s.diagnostics.activeDrainTest;
      const testButton = get<HTMLButtonElement>('diagnosticBranchTestBtn');
      const stopButton = get<HTMLButtonElement>('diagnosticBranchTestStopBtn');
      testButton.hidden = !!activeTest; stopButton.hidden = !activeTest;
      testButton.disabled = verifying || !!job || !!activeTest || activeDrainTargets.length === 0 || s.environment.drainUse > 0;
      stopButton.disabled = verifying;
      targetSelect.disabled = verifying || !!job || !!activeTest || activeDrainTargets.length === 0;
      const sources = s.waterSources.map(source => `${source.kind} ${source.flow.toFixed(2)}`).join(' · ');
      const repairedDrainCount = drainTargets.filter(({ pipe }) => !pipe.leaking || pipe.isolated).length;
      const repairSummary = [
        s.repairs.waterproofRepaired ? '防水層' : '',
        drainTargets.length ? `排水管 ${repairedDrainCount}/${drainTargets.length} 支` : '',
      ].filter(Boolean).join('、') || '尚無';
      const jobDrainIndex = drainTargets.findIndex(target => target.pipe.id === job?.pipeId) + 1;
      const jobTarget = job?.kind === 'drain' && jobDrainIndex > 0 ? `（支管 ${jobDrainIndex}）` : '';
      const status = job ? `${{ surface: '表面整修', waterproof: '迎水側防水修復', 'negative-seal': '室內側封堵', bypass: '供水管改管', drain: '排水管修復' }[job.kind]}${jobTarget} ${job.elapsed.toFixed(1)} / ${job.duration}s${s.running && s.timeScale > 0 ? '' : ' · 已暫停'}`
        : activeTest ? `支管 ${activeTest.pipeId} 測試 ${activeTest.elapsedSeconds.toFixed(1)} / ${activeTest.durationSeconds}s · 峰值 ${activeTest.peakFlow.toFixed(3)} · 只啟用選取支管`
          : `目前來源通量：${sources} · 地下水位 ${s.environment.groundwaterLevel.toFixed(2)} / 水壓 ${s.environment.groundwaterPressure.toFixed(2)} · 已修復：${repairSummary}${s.diagnostics.lastDrainTest ? ` · 最近支管測試峰值 ${s.diagnostics.lastDrainTest.peakFlow.toFixed(3)}` : ''}${s.repairs.negativeSideSealed ? ' · 室內側封堵已完成（地下水源仍在）' : ''}`;
      get('diagnosticStatus').textContent = `${status} · 供水條件 ${bathroomSupplyKey(s)}${bathroomSupplyActive(s) ? '（作用中）' : '（已停止）'}`;
    },
  };
}
