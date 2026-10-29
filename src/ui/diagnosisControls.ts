import type { SimulationEngine } from '../simulation/SimulationEngine';
import { hypothesisLabels, setHypothesisConfidence, setHypothesisSelection, submitDiagnosis } from '../simulation/diagnostics';
import type { HypothesisId } from '../simulation/types';

const hypothesisIds = Object.keys(hypothesisLabels) as HypothesisId[];

export function createDiagnosisControls(engine: SimulationEngine) {
  const panel = document.createElement('section');
  panel.className = 'section diagnosis-panel'; panel.id = 'diagnosisEvidencePanel'; panel.hidden = true;
  const options = hypothesisIds.map(id => `<div class="hypothesis-row" data-hypothesis="${id}">
    <label><input type="checkbox" data-select="${id}"><span>${hypothesisLabels[id]}</span></label>
    <label class="confidence-input">信心 <output data-value="${id}">50%</output><input type="range" min="0" max="100" value="50" data-confidence="${id}" aria-label="${hypothesisLabels[id]}信心"></label>
  </div>`).join('');
  panel.innerHTML = `<div class="section-title"><h2>診斷證據與假設</h2><span>記錄過程</span></div>
    <p class="hint">先用量測與供水事件建立證據，再勾選可能來源並評估信心。提交前不顯示情境答案。</p>
    <div class="diagnosis-options">${options}</div>
    <div class="action-row"><button class="btn primary flex" id="submitDiagnosis">提交診斷</button><button class="btn flex" id="clearDiagnosis">清除選擇</button></div>
    <p class="hint" id="diagnosisResult" role="status">尚未提交診斷</p>
    <div class="evidence-heading"><strong>證據時間軸</strong><span id="evidenceCount">0 筆</span></div>
    <ol class="evidence-list" id="evidenceList"><li class="hint">量測、熱像、供水事件和修繕會依模擬時間記錄。</li></ol>`;
  document.querySelector('.inspector .scroll')!.prepend(panel);
  const get = <T extends HTMLElement>(selector: string): T => panel.querySelector(selector.startsWith('#') || selector.startsWith('[') ? selector : `#${selector}`)!;

  for (const id of hypothesisIds) {
    get<HTMLInputElement>(`[data-select="${id}"]`).addEventListener('change', event => {
      setHypothesisSelection(engine.state, id, (event.currentTarget as HTMLInputElement).checked);
      render();
    });
    get<HTMLInputElement>(`[data-confidence="${id}"]`).addEventListener('input', event => {
      setHypothesisConfidence(engine.state, id, Number((event.currentTarget as HTMLInputElement).value));
      render();
    });
  }
  get<HTMLButtonElement>('#submitDiagnosis').addEventListener('click', () => { submitDiagnosis(engine.state); render(); });
  get<HTMLButtonElement>('#clearDiagnosis').addEventListener('click', () => {
    for (const id of hypothesisIds) { setHypothesisSelection(engine.state, id, false); setHypothesisConfidence(engine.state, id, 50); }
    engine.state.diagnostics.result = null;
    render();
  });

  function render(): void {
    const diagnostics = engine.state.diagnostics;
    for (const id of hypothesisIds) {
      get<HTMLInputElement>(`[data-select="${id}"]`).checked = diagnostics.hypotheses[id].selected;
      get<HTMLInputElement>(`[data-confidence="${id}"]`).value = String(diagnostics.hypotheses[id].confidence);
      get<HTMLOutputElement>(`[data-value="${id}"]`).textContent = `${diagnostics.hypotheses[id].confidence}%`;
    }
    const result = diagnostics.result;
    if (result) {
      const detected = result.detected.map(id => hypothesisLabels[id]).join('、') || '無';
      const missed = result.missed.map(id => hypothesisLabels[id]).join('、') || '無';
      const falseAlarms = result.falseAlarms.map(id => hypothesisLabels[id]).join('、') || '無';
      get('diagnosisResult').textContent = `診斷 ${result.score} 分 · 精確率 ${result.precision}% · 來源涵蓋 ${result.recall}% · 信心校準 ${result.calibration}%\n命中：${detected}；漏列：${missed}；多選：${falseAlarms}`;
    } else get('diagnosisResult').textContent = '尚未提交診斷';
    const events = diagnostics.evidence.slice(-10).reverse();
    get('evidenceCount').textContent = `${diagnostics.evidence.length} 筆`;
    const list = get<HTMLOListElement>('#evidenceList');
    list.replaceChildren();
    if (!events.length) {
      const empty = document.createElement('li'); empty.className = 'hint'; empty.textContent = '尚無事件；先進行量測或操作供水條件。'; list.append(empty); return;
    }
    for (const event of events) {
      const item = document.createElement('li');
      const time = document.createElement('time');
      time.textContent = `${Math.floor(event.time / 60).toString().padStart(2, '0')}:${Math.floor(event.time % 60).toString().padStart(2, '0')}`;
      const title = document.createElement('strong'); title.textContent = event.title;
      const detail = document.createElement('span'); detail.textContent = event.detail;
      item.append(time, title, detail); list.append(item);
    }
  }

  return { update(active: boolean) { panel.hidden = !active; if (active) render(); } };
}
