import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const errors = [];
const report = { desktop: {}, layouts: [], touch: {}, errors };
await mkdir('artifacts', { recursive: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
const snapshot = () => page.evaluate(() => window.__simTest.snapshot());
const clickWall = async (x, y) => {
  const point = await page.evaluate(({ x, y }) => window.__simTest.project(x, y), { x, y });
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
};
const setRain = async key => { await page.locator('#rainSlider').focus(); await page.keyboard.press(key); };
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1');
  await page.waitForFunction(() => !!window.__simTest);
  await page.locator('#frontViewBtn').click();
  await setRain('Home');
  await page.selectOption('#timeSlider', '20');
  await page.waitForTimeout(700);
  let s = await snapshot();
  assert.equal(s.metrics.leakRate, 0);
  assert.ok(s.metrics.surfaceMax < 10);
  report.desktop.dry = s.metrics;
  await setRain('End');
  await page.waitForFunction(() => window.__simTest.snapshot().metrics.surfaceMax > 54, { timeout: 30000 });
  await page.selectOption('#timeSlider', '1');
  await clickWall(3, 2.5);
  await clickWall(-1.125, 1.625);
  assert.equal(await page.locator('#workflowSummary').innerText(), '量測 2/2 · 孔位 0 · 塞針 0 · 注入 0');
  assert.ok((await page.locator('#suspectMetric').innerText()).match(/[5-9]\d%/));
  report.desktop.wet = (await snapshot()).metrics;
  report.desktop.readings = { control: await page.locator('#controlMetric').innerText(), suspect: await page.locator('#suspectMetric').innerText() };
  await page.screenshot({ path: 'artifacts/scenario01-wet-1280.png' });
  await page.locator('[data-mode="drill"]').click();
  const a = await page.evaluate(() => window.__simTest.project(1, 3));
  await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.mouse.move(a.x + 45, a.y, { steps: 8 }); await page.mouse.up();
  assert.equal((await snapshot()).repairs.ports.length, 0, 'drag must not drill');
  await page.locator('#frontViewBtn').click();
  await clickWall(-1.125, 3.625);
  assert.equal((await snapshot()).repairs.ports.length, 1);
  assert.equal((await snapshot()).repairs.ports[0].drillProgress < 1, true);
  await page.locator('#playPauseBtn').click();
  const pause = await snapshot();
  await page.waitForTimeout(500);
  assert.equal((await snapshot()).simulationTime, pause.simulationTime);
  await page.locator('#playPauseBtn').click();
  await page.selectOption('#timeSlider', '5');
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.ports[0].drillProgress === 1);
  await page.locator('[data-mode="insert"]').click();
  await page.locator('#nextStepBtn').click();
  assert.equal((await snapshot()).repairs.ports[0].inserted, true);
  await page.locator('[data-mode="inject"]').click();
  await page.locator('#nextStepBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.pressure > .5);
  report.desktop.pumping = (await snapshot()).repairs;
  await page.waitForFunction(() => window.__simTest.snapshot().metrics.volumeMl >= 180, { timeout: 20000 });
  await page.selectOption('#timeSlider', '20');
  await page.waitForFunction(() => window.__simTest.snapshot().metrics.reduction > .75);
  await page.locator('[data-mode="verify"]').click();
  await page.locator('#nextStepBtn').click();
  assert.equal(await page.locator('#rainSlider').isDisabled(), true);
  await page.waitForFunction(() => document.querySelector('#operationTitle').textContent.includes('驗證完成'), { timeout: 30000 });
  s = await snapshot();
  assert.ok(s.metrics.surfaceMax < report.desktop.wet.surfaceMax);
  assert.ok(s.metrics.reduction > .75);
  report.desktop.repaired = s.metrics;
  report.desktop.verification = await page.locator('#verificationResult').innerText();
  await page.locator('#debugToggle').check();
  for (const mode of ['moisture', 'flow', 'cracks', 'pu', 'source']) {
    await page.selectOption('#fieldMode', mode); await page.waitForTimeout(150);
    assert.ok((await page.locator('#fieldLegend').innerText()).includes('DEBUG'));
  }
  await page.selectOption('#fieldMode', 'pu');
  await page.waitForTimeout(350);
  await page.screenshot({ path: 'artifacts/scenario01-pu-1280.png' });
  await page.locator('#debugToggle').uncheck();
  await page.locator('#cutawayBtn').click();
  await page.selectOption('#layerSelect', '0');
  await page.waitForTimeout(250);
  await page.screenshot({ path: 'artifacts/scenario01-dry-1280.png' });
  for (const scenario of ['window', 'pipe', 'condensation', 'rooftop', 'crack']) {
    await page.locator(`[data-scenario="${scenario}"]`).click();
    await page.waitForTimeout(100);
    assert.ok(await page.locator('#sceneTitle').innerText());
  }
  assert.equal((await snapshot()).repairs.ports.length, 0);
  assert.ok((await snapshot()).metrics.surfaceMax < 10);
  for (const [width, height] of [[1920, 1080], [1024, 768], [800, 1280], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(400);
    const layout = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, viewport: innerWidth, canvasWidth: document.querySelector('#scene').getBoundingClientRect().width }));
    assert.ok(layout.pageWidth <= width + 1, `horizontal overflow at ${width}`);
    assert.ok(layout.canvasWidth > 200);
    report.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `artifacts/layout-${width}.png`, fullPage: width < 901 });
  }
  const touchContext = await browser.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true });
  const touch = await touchContext.newPage();
  touch.on('pageerror', e => errors.push(String(e)));
  await touch.goto('http://127.0.0.1:5173/?test=1');
  await touch.waitForFunction(() => !!window.__simTest);
  await touch.locator('#frontViewBtn').tap();
  await touch.locator('[data-mode="drill"]').tap();
  await touch.locator('#scene').scrollIntoViewIfNeeded();
  const xy = await touch.evaluate(() => window.__simTest.project(-1.125, 3.625));
  await touch.touchscreen.tap(xy.x, xy.y);
  assert.equal(await touch.evaluate(() => window.__simTest.snapshot().repairs.ports.length), 1);
  // A two-finger gesture must zoom, never add an accidental hole on release.
  const cdp = await touchContext.newCDPSession(touch);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: xy.x - 50, y: xy.y, id: 1 }, { x: xy.x + 50, y: xy.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: xy.x - 80, y: xy.y + 10, id: 1 }, { x: xy.x + 80, y: xy.y + 10, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal(await touch.evaluate(() => window.__simTest.snapshot().repairs.ports.length), 1);
  report.touch = { tapCreatesHole: true, pinchDoesNotDrill: true };
  await touchContext.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile('artifacts/browser-report.json', JSON.stringify(report, null, 2));
  await browser.close();
}
