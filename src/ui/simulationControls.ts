import { floorLayerNames } from '../simulation/floorModel';
import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { FieldView } from '../renderer/moistureField';
import { drawSection } from '../renderer/moistureField';
import { layerNames } from '../simulation/wallModel';
import { surfaceTemperatureC } from '../tools/thermalCamera';

export function createSimulationControls(engine: SimulationEngine) {
  const view: FieldView = { debug: false, mode: 'moisture', layer: 3, cutaway: false, surface: 'wall', thermal: false };
  const panel = document.createElement('section');
  panel.className = 'section'; panel.id = 'simulationPanel';
  panel.innerHTML = `<div class="section-title"><h2 id="simPanelTitle">模擬狀態</h2><span id="simClock">00:00</span></div>
    <p class="hint">從乾牆開始。以 20× 觀察約 1–3 分鐘模擬時間，再量測室內濕區。比例為教學指標。</p>
    <div class="metric-grid" id="injectionMetrics">
    <div class="metric accent"><small>Injection Pressure</small><strong id="pressureReading">0.00</strong><em>MPa · 教學尺度</em></div>
    <div class="metric"><small>Injection Volume</small><strong id="volumeReading">0 ml</strong><em>本次累計</em></div>
    <div class="metric"><small>Material Expansion</small><strong id="expansionReading">1.0×</strong><em>局部最大膨脹倍率</em></div>
    <div class="metric good"><small>Leak Reduction</small><strong id="reductionReading">0%</strong><em>與相同雨勢未封堵比較</em></div></div>
    <p class="hint" id="dryingStatus" role="status"></p><p class="hint" id="phaseLimit">本階段：PU 裂縫止水。TODO：敲診、裂縫計與診斷評分。</p>
    <button type="button" class="btn" id="thermalCameraToggle" aria-pressed="false">🌡 開啟紅外線熱像</button>
    <p class="hint" id="thermalCameraReadout" role="status">熱像儀關閉</p>
    <label class="debug-toggle"><input type="checkbox" id="debugToggle"> DEBUG · 顯示內部診斷資料</label>
    <div id="debugControls" hidden>
      <label class="field-label" for="fieldMode">診斷圖層</label><select id="fieldMode">
      <option value="moisture">Moisture Heatmap</option><option value="flow">Water Flow</option><option value="cracks">Crack Network</option><option value="pu">Injection Material</option><option value="source">Leak Source</option></select>
      <p class="hint">水流箭頭為當前通量；PU 圖層為實際材料分布。</p>
    </div>
    <div id="layerControls" hidden><label class="field-label" for="layerSelect">剖面觀察材質</label><select id="layerSelect">${layerNames.map((label, i) => `<option value="${i}" ${i === 3 ? 'selected' : ''}>${label}</option>`).join('')}</select>
      <p class="hint" id="sectionCaption">六層水平切片，藍色為含水量</p><canvas id="crossSectionCanvas" width="300" height="138" aria-label="六層牆體水平切片"></canvas></div>`;
  document.querySelector('.inspector .scroll')!.prepend(panel);
  const get = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
  get<HTMLInputElement>('debugToggle').addEventListener('change', e => { view.debug = (e.target as HTMLInputElement).checked; });
  get<HTMLSelectElement>('fieldMode').addEventListener('change', e => { view.mode = (e.target as HTMLSelectElement).value; });
  get<HTMLButtonElement>('thermalCameraToggle').addEventListener('click', () => { view.thermal = !view.thermal; });
  get<HTMLSelectElement>('layerSelect').addEventListener('change', e => { view.layer = Number((e.target as HTMLSelectElement).value); });
  const notice = document.createElement('div'); notice.id = 'fieldLegend'; notice.className = 'field-legend';
  document.getElementById('viewport')!.append(notice);
  return {
    view,
    reset() { view.surface = 'wall'; view.debug = false; view.mode = 'moisture'; view.layer = 3; view.thermal = false; get<HTMLInputElement>('debugToggle').checked = false; get<HTMLSelectElement>('layerSelect').value = '3'; get<HTMLSelectElement>('fieldMode').value = 'moisture'; },
    update(active: boolean, cutaway: boolean, wallCoupled = true) {
      panel.hidden = !active; view.cutaway = cutaway;
      notice.hidden = !active;
      if (!active) return;
      const s = engine.state, m = s.metrics;
      const floor = view.surface === 'floor';
      if (floor) view.layer = Math.min(view.layer, 2);
      const names = floor ? floorLayerNames : layerNames.map((name, i) => view.surface === 'slab' && i === 5 ? '浴室地磚' : name);
      const select = get<HTMLSelectElement>('layerSelect');
      if (select.options.length !== names.length || select.options[0].textContent !== names[0]) select.innerHTML = names.map((name, i) => `<option value="${i}">${name}</option>`).join('');
      select.value = String(view.layer);
      const bath = s.scenarioId !== 'crack';
      get('simPanelTitle').textContent = floor ? '室內地板 · 模擬狀態' : '模擬狀態';
      get('injectionMetrics').hidden = bath || floor || !wallCoupled;
      get<HTMLSelectElement>('fieldMode').querySelector<HTMLOptionElement>('[value=pu]')!.disabled = bath || floor;
      get<HTMLSelectElement>('fieldMode').querySelector<HTMLOptionElement>('[value=cracks]')!.textContent = bath ? '裂縫／防水缺損（選防水層）' : 'Crack Network';
      if (floor && view.mode === 'pu') { view.mode = 'moisture'; get<HTMLSelectElement>('fieldMode').value = 'moisture'; }
      get('phaseLimit').textContent = '已實作：來源分離、網格量測、熱像估算、PU／Epoxy／凝膠材料模型與局部塗刷。TODO：敲診、裂縫計與 Diagnosis Score。';
      panel.querySelector('.hint')!.textContent = bath ? '從乾燥狀態開始，使用 20× 觀察 1–3 分鐘模擬時間。數字為相對含水指標。' : '從乾牆開始。以 20× 觀察約 1–3 分鐘模擬時間，再量測室內濕區。比例為教學指標。';
      get('simClock').textContent = `${Math.floor(s.simulationTime / 60).toString().padStart(2, '0')}:${Math.floor(s.simulationTime % 60).toString().padStart(2, '0')}`;
      get('pressureReading').textContent = s.repairs.pressure.toFixed(2);
      get('volumeReading').textContent = `${m.volumeMl.toFixed(0)} ml`;
      get('expansionReading').textContent = `${m.expansion.toFixed(1)}×`;
      get('reductionReading').textContent = s.environment.rain === 0 ? '— 無降雨' : `${(m.reduction * 100).toFixed(0)}%`;
      get('dryingStatus').textContent = `模型平均 ${m.meanMoisture.toFixed(1)}% · 表面最高 ${m.surfaceMax.toFixed(1)}% · ${m.reduction > .7 ? '水流已受抑制，殘留水分仍在移動及乾燥。白華與漆面損傷會保留。' : '請量測同材質乾區與濕區，追蹤變化。'}`;
      if (bath) get('dryingStatus').textContent = `牆面最高 ${m.wallSurfaceMax.toFixed(1)}%${s.slab ? ` · 天花最高 ${m.ceilingSurfaceMax.toFixed(1)}%` : ''} · 入水通量 ${m.leakRate.toFixed(2)}。水源降低後仍需乾燥；白華與漆損需另行整修。`;
      if (floor) {
        panel.querySelector('.hint')!.textContent = '地磚／填縫 → 砂漿 → RC。定點淋水、牆腳交換與乾燥共用固定模擬時間。';
        get('dryingStatus').textContent = `地板表面最高 ${m.floorSurfaceMax.toFixed(1)}% · 各層平均 ${m.floorMeanMoisture.toFixed(1)}% · 入水通量 ${m.floorInflow.toFixed(2)}（相對值）。`;
        get('phaseLimit').textContent = wallCoupled ? '地板與相鄰牆腳交換水分。探頭讀取目前地板位置，不套用整面牆的數字。' : '地板含水模型已啟用；此情境的原牆體水路尚未接入地板，請用定點淋水觀察地板反應。';
      }
      get('debugControls').hidden = !view.debug;
      get('layerControls').hidden = !(view.debug || cutaway);
      if (view.debug || cutaway) drawSection(get<HTMLCanvasElement>('crossSectionCanvas'), s, view.surface);
      const defaultDepth = floor ? s.floor.height / 2 : 1.625;
      get<HTMLButtonElement>('thermalCameraToggle').textContent = view.thermal ? '🌡 關閉紅外線熱像' : '🌡 開啟紅外線熱像';
      get<HTMLButtonElement>('thermalCameraToggle').setAttribute('aria-pressed', String(view.thermal));
      const probe = s.tools.probeDomain === view.surface && s.tools.probe ? s.tools.probe : { x: 0, y: defaultDepth };
      const thermalValue = view.thermal ? surfaceTemperatureC(s, probe, view.surface) : null;
      get('thermalCameraReadout').textContent = thermalValue === null ? '熱像儀關閉' : `探頭估算 ${thermalValue.toFixed(1)}°C · 環境 ${s.environment.ambientTemperatureC.toFixed(1)}°C · 含水與管線推導，非實測值`;
      get('sectionCaption').textContent = `${floor ? '地板三層 · 距牆深度' : view.surface === 'slab' ? '樓板六層 · 深度座標' : '牆體六層 · 高度'} ${(s.tools.probeDomain === view.surface ? s.tools.probe?.y ?? defaultDepth : defaultDepth).toFixed(2)} · 藍色為水分`;
      const legends: Record<string, string> = { moisture: '藍 8% → 黃紅 100%', flow: '箭頭顯示當前水分通量', cracks: '金色顯示裂縫網格', pu: '綠色 PU · 金色 Epoxy · 紫色凝膠', source: '粉紅顯示此觀察域的供水範圍／入口' };
      const layerLabel = names[view.layer];
      notice.textContent = view.thermal ? '熱像儀 · 暗紫低溫 → 紅橘高溫 · 教學估算，請搭配現場量測' : view.debug ? `DEBUG · ${get<HTMLSelectElement>('fieldMode').selectedOptions[0].text} · ${layerLabel} · ${legends[view.mode]}` : cutaway ? `剖面 · ${layerLabel} · 水分 8% → 100%` : `${floor ? '室內地板 · 地磚／填縫' : view.surface === 'slab' ? '樓下房間 · 天花底面' : bath ? '相鄰房間 · 浴室外側牆腳' : '表面觀察'} · 內部漏水源隱藏`;

    },
  };
}
