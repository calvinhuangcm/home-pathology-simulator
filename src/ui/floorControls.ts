import type { SimulationEngine } from '../simulation/SimulationEngine';
import type { FieldView } from '../renderer/moistureField';

interface Hooks { changeView(): void; notify(message: string, type?: string): void }

/** The panel selects observation tools; only validated pointer actions add water. */
export function createFloorControls(engine: SimulationEngine, view: FieldView, hooks: Hooks) {
  const panel = document.createElement('section'); panel.className = 'section'; panel.id = 'floorPanel';
  panel.innerHTML = `<div class="section-title"><h2>室內地板 · 表面與含水</h2><span>Floor</span></div>
    <p class="hint">地磚／填縫 → 水泥砂漿找平層 → RC 樓板。含水數字讀取地板網格，為相對教學指標。</p>
    <div class="action-row"><button class="btn flex" type="button" id="floorViewBtn" aria-pressed="false">室內地板俯視</button><button class="btn flex" type="button" id="wallViewBtn" aria-pressed="true">返回牆面</button></div>
    <div class="metric-grid">
      <div class="metric accent"><small>地板表面最高</small><strong id="floorSurfaceMax">8.0%</strong><em>相對含水指標</em></div>
      <div class="metric"><small>地板各層平均</small><strong id="floorMeanMoisture">8.0%</strong><em>相對含水指標</em></div>
    </div>
    <p class="hint">實際入水通量 <output id="floorInflow">0.00</output> · 相對教學單位／秒</p>
    <div class="action-row"><button class="btn primary flex" type="button" id="floorWaterTestBtn" aria-pressed="false">定點淋水測試 · 5 秒</button></div>
    <p class="hint" id="floorToolStatus" role="status"></p>
    <p class="hint" id="floorWaterTestStatus" role="status"></p>
    <p class="hint" id="floorCouplingStatus"></p>`;
  document.getElementById('scenarioActionSection')!.before(panel);
  const get = <T extends HTMLElement>(id: string): T => panel.querySelector(`#${id}`)!;
  let locked = false, wallCoupled = true;
  const setSurface = (surface: 'floor' | 'wall'): void => {
    view.surface = surface; engine.state.tools.probe = null; engine.state.tools.probeDomain = surface;
    if (surface === 'floor') view.layer = Math.min(view.layer, engine.state.floor.layers.length - 1);
  };
  function update(nextLocked: boolean, nextWallCoupled: boolean): void {
    locked = nextLocked; wallCoupled = nextWallCoupled;
    const s = engine.state, paused = !s.running || s.timeScale === 0;
    const tests = s.floorTests.filter(test => test.remainingSeconds > 0);
    const remaining = tests.reduce((max, test) => Math.max(max, test.remainingSeconds), 0);
    get('floorSurfaceMax').textContent = `${s.metrics.floorSurfaceMax.toFixed(1)}%`;
    get('floorMeanMoisture').textContent = `${s.metrics.floorMeanMoisture.toFixed(1)}%`;
    get('floorInflow').textContent = s.metrics.floorInflow.toFixed(2);
    get<HTMLButtonElement>('floorViewBtn').disabled = locked;
    get<HTMLButtonElement>('wallViewBtn').disabled = locked;
    get('floorViewBtn').setAttribute('aria-pressed', String(view.surface === 'floor'));
    get('wallViewBtn').setAttribute('aria-pressed', String(view.surface === 'wall'));
    const button = get<HTMLButtonElement>('floorWaterTestBtn');
    button.disabled = locked || paused && !s.tools.floorTestArmed;
    button.setAttribute('aria-pressed', String(s.tools.floorTestArmed));
    button.textContent = s.tools.floorTestArmed ? '取消定點淋水選位' : '定點淋水測試 · 5 秒';
    get('floorToolStatus').textContent = locked ? '驗證進行中，地板視角與測試工具暫時鎖定。' : s.tools.floorTestArmed ? `請點擊室內地板上的位置，開始有限 5 秒淋水。${paused ? '目前暫停；選位後，恢復播放才會供水。' : '拖曳可調整視角。'}` : paused ? '目前暫停；恢復播放後可開始淋水測試。地板上的探頭仍可讀取目前含水量。' : '切換地板俯視後，可移動探頭量測。選擇淋水測試，再點擊地板放置測試位置。';
    get('floorWaterTestStatus').textContent = tests.length ? `${tests.length} 處淋水進行中 · 最長剩餘 ${remaining.toFixed(1)} 秒模擬時間${paused ? ' · 已暫停' : ''}。完成供水後，水分仍會擴散並逐漸乾燥。` : s.floorTests.length ? '定點淋水已結束；目前沒有測試持續供水，可繼續追蹤殘留水分與乾燥。' : '尚未開始定點淋水；地板數值來自目前模擬狀態。';
    get('floorCouplingStatus').textContent = view.surface === 'slab' ? '這組讀值屬於同樓層相鄰房間的地板；目前畫面觀察樓下天花，可切回室內地板量測。' : wallCoupled ? '牆腳與室內地板共享接點，水分依兩側含水差交換；表面受潮位置可能偏離漏水源。' : '目前情境的牆面尚未接入地板水路。地板仍以獨立網格模擬定點淋水、擴散與乾燥，讀值來自實際狀態。';
  }
  get<HTMLButtonElement>('floorViewBtn').onclick = () => {
    if (locked) return;
    setSurface('floor'); hooks.changeView(); update(locked, wallCoupled);
  };
  get<HTMLButtonElement>('wallViewBtn').onclick = () => {
    if (locked) return;
    engine.state.tools.floorTestArmed = false;
    setSurface('wall'); hooks.changeView(); update(locked, wallCoupled);
  };
  get<HTMLButtonElement>('floorWaterTestBtn').onclick = () => {
    if (locked) return;
    const s = engine.state;
    if (!s.tools.floorTestArmed && (!s.running || s.timeScale === 0)) {
      hooks.notify('請先恢復播放，再選擇定點淋水位置。', 'warn'); return;
    }
    s.tools.floorTestArmed = !s.tools.floorTestArmed;
    if (s.tools.floorTestArmed) setSurface('floor');
    hooks.changeView(); update(locked, wallCoupled);
    hooks.notify(s.tools.floorTestArmed ? '請點擊室內地板位置，開始有限 5 秒模擬時間的定點淋水。' : '已取消淋水選位；已開始的有限淋水仍依模擬時間完成。');
  };
  update(false, true);
  return { update };
}
