import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const url = new URL(process.env.BASE_URL || 'http://127.0.0.1:5173/');
url.searchParams.set('test', '1');
const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], report = { floor: {}, layouts: [], touch: {}, scenarios: [], errors };
await mkdir('artifacts', { recursive: true });
const listen = target => {
  target.on('pageerror', error => errors.push(String(error)));
  target.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
};
listen(page);
const snapshot = target => target.evaluate(() => window.__simTest.snapshot());
const point = (x, y) => ({ x: (x + .5) * 11 / 80 - 5.5, y: (y + .5) * 3.85 / 28 });
const wetPoint = point(42, 14), farPoint = point(15, 22);
const waitTime = async (target, seconds) => {
  const until = (await snapshot(target)).simulationTime + seconds;
  await target.waitForFunction(time => window.__simTest.snapshot().simulationTime >= time, until, { timeout: 45000 });
};
const project = async (target, p, surface = 'floor') => {
  await target.locator('#scene').scrollIntoViewIfNeeded();
  const screen = await target.evaluate(({ p, surface }) => window.__simTest.project(p.x, p.y, surface), { p, surface });
  const box = await target.locator('#scene').boundingBox();
  assert.ok(screen.x > box.x && screen.x < box.x + box.width && screen.y > box.y && screen.y < box.y + box.height, `projected ${surface} point must lie inside the visible scene: ${JSON.stringify(screen)}`);
  return screen;
};
const clickSurface = async (target, p, surface = 'floor') => {
  const screen = await project(target, p, surface);
  await target.mouse.move(screen.x, screen.y); await target.mouse.click(screen.x, screen.y);
};
const pause = async target => { if ((await snapshot(target)).running) await target.locator('#playPauseBtn').click(); };
const resume = async target => { if (!(await snapshot(target)).running) await target.locator('#playPauseBtn').click(); };
const measure = async (target, p, mode = 'pinless', sample = 'control') => {
  await target.selectOption('#meterSelect', mode);
  await target.locator(`#${sample}SampleBtn`).click(); await clickSurface(target, p);
  if (sample === 'control') assert.match(await target.locator('#controlMeta').innerText(), /地板/);
  return Number((await target.locator(`#${sample}Metric`).innerText()).match(/[\d.]+/)[0]);
};
const floorCell = (s, p, layer = 0) => {
  const grid = s.floor, x = Math.min(grid.cols - 1, Math.floor((p.x + grid.width / 2) / grid.width * grid.cols));
  const y = Math.min(grid.rows - 1, Math.floor(p.y / grid.height * grid.rows));
  return grid.cells[layer * grid.cols * grid.rows + y * grid.cols + x];
};

try {
  await page.goto(url.href); await page.waitForFunction(() => !!window.__simTest);
  await page.locator('[data-scenario=crack]').click();
  await page.locator('#rainSlider').focus(); await page.keyboard.press('Home');
  await page.selectOption('#timeSlider', '1'); await page.locator('#floorViewBtn').click(); await pause(page);
  report.floor.dry = await measure(page, wetPoint);
  assert.ok(Math.abs(report.floor.dry - 8) < 1e-6, `expected a dry reading near 8, received ${report.floor.dry}`);
  const drySurfaceMaximum = (await snapshot(page)).metrics.floorSurfaceMax;
  assert.ok(Math.abs(drySurfaceMaximum - 8) < 1e-6, `expected a dry surface maximum near 8, received ${drySurfaceMaximum}`);

  // A camera drag must neither place a test nor record an accidental measurement.
  await resume(page); await page.locator('#floorWaterTestBtn').click();
  let screen = await project(page, wetPoint);
  await page.mouse.move(screen.x, screen.y); await page.mouse.down();
  await page.mouse.move(screen.x + 40, screen.y + 10, { steps: 8 }); await page.mouse.up();
  assert.equal((await snapshot(page)).floorTests.length, 0);
  await page.locator('#floorViewBtn').click();
  // This is a visible wall hit while the floor test tool is armed.
  await clickSurface(page, { x: 0, y: 2.5 }, 'wall');
  assert.equal((await snapshot(page)).floorTests.length, 0, 'floor-only action must reject a wall hit');
  assert.equal((await snapshot(page)).tools.floorTestArmed, true);
  await clickSurface(page, wetPoint);
  await page.waitForFunction(() => window.__simTest.snapshot().floorTests.length === 1);
  assert.equal((await snapshot(page)).tools.floorTestArmed, false);
  await waitTime(page, .7); await pause(page);
  let s = await snapshot(page);
  assert.ok(s.floorTests[0].remainingSeconds > 0 && s.floorTests[0].remainingSeconds < 5);
  const pausedTime = s.simulationTime, pausedRemaining = s.floorTests[0].remainingSeconds, pausedCells = s.floor.cells;
  await page.waitForTimeout(350);
  s = await snapshot(page);
  assert.equal(s.simulationTime, pausedTime); assert.equal(s.floorTests[0].remainingSeconds, pausedRemaining);
  assert.deepEqual(s.floor.cells, pausedCells);
  assert.match(await page.locator('#floorWaterTestStatus').innerText(), /暫停/);
  report.floor.pause = { time: pausedTime, remaining: pausedRemaining, preserved: true };
  await page.locator('[data-mode=verify]').click(); await page.locator('#nextStepBtn').click();
  assert.match(await page.locator('#toast').innerText(), /等待地板淋水測試結束/);
  assert.equal((await snapshot(page)).running, false);
  assert.equal(await page.locator('#undoBtn').isDisabled(), false, 'rejected verification must not lock the workflow');
  await page.locator('[data-mode=inspect]').click();
  report.floor.activeTestBlocksVerification = true;
  await resume(page); await page.selectOption('#timeSlider', '5');
  await page.waitForFunction(() => window.__simTest.snapshot().floorTests[0].remainingSeconds === 0);
  await pause(page); s = await snapshot(page);
  const wet = await measure(page, wetPoint, 'pinless', 'control');
  const dry = await measure(page, farPoint, 'pinless', 'suspect');
  const mortar = await measure(page, wetPoint, 'pin', 'control');
  const wallReading = Number((await page.locator('#moistureMetric').innerText()).match(/[\d.]+/)[0]);
  assert.ok(wallReading < 10, 'minor moisture transfer at the modeled floor-wall junction must not make wall telemetry appear materially wet');
  assert.ok(Math.abs(wet - floorCell(s, wetPoint).moisture) <= 1);
  assert.ok(Math.abs(mortar - floorCell(s, wetPoint, 1).moisture) <= 1);
  assert.ok(wet > 35 && mortar > 9 && mortar < wet); assert.equal(dry, 8);
  assert.equal(s.floorTests[0].remainingSeconds, 0); assert.ok(s.floorTests[0].appliedWater > 200);
  report.floor.wet = { surfaceReading: wet, mortarReading: mortar, dryReading: dry, wallReading, metrics: s.metrics, test: s.floorTests[0] };
  await page.screenshot({ path: 'artifacts/floor-wet-1280.png' });
  await page.locator('#debugToggle').check(); await page.selectOption('#fieldMode', 'moisture');
  assert.equal(await page.locator('#layerSelect option').count(), 3);
  for (const layer of ['0', '1', '2']) {
    await page.selectOption('#layerSelect', layer); await page.waitForTimeout(100);
    assert.match(await page.locator('#fieldLegend').innerText(), /DEBUG/);
    await page.screenshot({ path: `artifacts/floor-heatmap-layer-${layer}.png` });
  }
  await page.locator('#debugToggle').uncheck();
  const applied = s.floorTests[0].appliedWater, beforeDrying = s.metrics.floorSurfaceMax;
  await page.selectOption('#timeSlider', '20'); await resume(page); await waitTime(page, 30); await pause(page);
  s = await snapshot(page); report.floor.drying = s.metrics;
  assert.equal(s.floorTests[0].appliedWater, applied);
  assert.ok(s.metrics.floorSurfaceMax > 8 && s.metrics.floorSurfaceMax < beforeDrying * .6);
  assert.ok(s.metrics.floorMeanMoisture > 8);
  await page.screenshot({ path: 'artifacts/floor-drying.png' });
  await page.locator('#wallViewBtn').click(); assert.equal(await page.locator('#wallViewBtn').getAttribute('aria-pressed'), 'true');
  await page.locator('#floorViewBtn').click();
  assert.equal(await page.locator('#floorViewBtn').getAttribute('aria-pressed'), 'true');
  assert.equal((await snapshot(page)).floorTests.length, 1);

  // Undo includes actual floor material/water state; scenario transitions discard tests.
  for (const scenario of ['bathroom', 'hotpipe', 'window']) {
    await page.locator(`[data-scenario=${scenario}]`).click();
    await page.selectOption('#timeSlider', '1');
    if (scenario === 'bathroom') await page.locator('#bathroomUse').uncheck();
    if (scenario === 'hotpipe') await page.locator('#pipeValve').uncheck();
    await page.locator('#floorViewBtn').click();
    assert.equal((await snapshot(page)).floorTests.length, 0);
    if (scenario === 'window') assert.match(await page.locator('#floorCouplingStatus').innerText(), /尚未接入/);
    await page.locator('#floorWaterTestBtn').click(); await clickSurface(page, wetPoint);
    await page.waitForFunction(() => window.__simTest.snapshot().floorTests.length === 1);
    await pause(page); await page.locator('#undoBtn').click();
    assert.equal((await snapshot(page)).floorTests.length, 0);
    assert.ok((await snapshot(page)).floor.cells.every(cell => cell.moisture < 8.01));
    await resume(page);
    if (!(await snapshot(page)).tools.floorTestArmed) await page.locator('#floorWaterTestBtn').click();
    await clickSurface(page, wetPoint);
    await page.waitForFunction(() => window.__simTest.snapshot().floorTests.length === 1);
    await page.locator('#resetBtn').click();
    assert.equal((await snapshot(page)).floorTests.length, 0);
    assert.ok((await snapshot(page)).floor.cells.every(cell => cell.moisture < 8.01));
    report.scenarios.push({ scenario, undoFloorWater: true, resetFloorWater: true });
  }

  for (const [width, height] of [[1280, 720], [1920, 1080], [800, 1280]]) {
    await page.setViewportSize({ width, height }); await page.locator('#floorViewBtn').click();
    await page.locator('#scene').scrollIntoViewIfNeeded(); await page.waitForTimeout(150);
    const layout = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, canvasWidth: document.querySelector('#scene').getBoundingClientRect().width }));
    assert.ok(layout.pageWidth <= width + 1); assert.ok(layout.canvasWidth > 200);
    await project(page, wetPoint); report.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `artifacts/floor-layout-${width}.png`, fullPage: width < 901 });
  }

  const context = await browser.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true });
  const touch = await context.newPage(); listen(touch);
  await touch.goto(url.href); await touch.waitForFunction(() => !!window.__simTest);
  await touch.locator('[data-scenario=crack]').tap(); await touch.locator('#floorViewBtn').tap();
  screen = await project(touch, wetPoint); await touch.touchscreen.tap(screen.x, screen.y);
  assert.match(await touch.locator('#controlMeta').innerText(), /地板/);
  await touch.locator('#floorWaterTestBtn').tap(); screen = await project(touch, wetPoint);
  const cdp = await context.newCDPSession(touch);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: screen.x - 40, y: screen.y, id: 1 }, { x: screen.x + 40, y: screen.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: screen.x - 60, y: screen.y + 8, id: 1 }, { x: screen.x + 60, y: screen.y + 8, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.equal((await snapshot(touch)).floorTests.length, 0, 'pinch must not create a water test');
  await touch.locator('#floorViewBtn').tap(); screen = await project(touch, wetPoint);
  await touch.touchscreen.tap(screen.x, screen.y);
  assert.equal((await snapshot(touch)).floorTests.length, 1);
  report.touch = { floorMeasurement: true, pinchDoesNotAddWater: true, tapStartsFiniteTest: true };
  await touch.screenshot({ path: 'artifacts/floor-touch-800.png', fullPage: true }); await context.close();
  assert.deepEqual(errors, []); console.log(JSON.stringify(report, null, 2));
} finally {
  await writeFile('artifacts/floor-browser-report.json', JSON.stringify(report, null, 2)); await browser.close();
}
