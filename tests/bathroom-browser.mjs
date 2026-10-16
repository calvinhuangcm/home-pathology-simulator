import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], report = { bathroom: {}, hotpipe: {}, layouts: [], touch: {}, errors };
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await mkdir('artifacts', { recursive: true });
const snapshot = () => page.evaluate(() => window.__simTest.snapshot());
const waitTime = async seconds => {
  const until = (await snapshot()).simulationTime + seconds;
  await page.waitForFunction(t => window.__simTest.snapshot().simulationTime >= t, until, { timeout: 45000 });
};
const clickSurface = async (x, y, surface = 'wall') => {
  await page.locator('#scene').scrollIntoViewIfNeeded();
  const p = await page.evaluate(({ x, y, surface }) => window.__simTest.project(x, y, surface), { x, y, surface });
  await page.mouse.move(p.x, p.y); await page.mouse.click(p.x, p.y);
};
const waitRepair = async () => page.waitForFunction(() => !window.__simTest.snapshot().repairs.job);
const verify = async () => {
  await page.locator('[data-mode=verify]').click(); await page.locator('#nextStepBtn').click();
  assert.ok(await page.locator('#bathroomUse').isDisabled());
  assert.ok(await page.locator('#surfacePatchBtn').isDisabled());
  assert.ok(await page.locator('#undoBtn').isDisabled());
  const beforeUndo = await snapshot();
  await page.locator('#scene').click({ position: { x: 20, y: 200 } });
  await page.keyboard.press('ControlOrMeta+z');
  assert.equal((await snapshot()).repairs.bypassInstalled, beforeUndo.repairs.bypassInstalled);
  assert.equal((await snapshot()).repairs.waterproofRepaired, beforeUndo.repairs.waterproofRepaired);
  await page.waitForFunction(() => document.querySelector('#operationTitle').textContent.includes('驗證完成'), null, { timeout: 45000 });
  return page.locator('#verificationResult').innerText();
};
try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1'); await page.waitForFunction(() => !!window.__simTest);
  await page.locator('[data-scenario=bathroom]').click();
  assert.ok(await page.locator('[data-mode=drill]').isDisabled());
  await page.selectOption('#timeSlider', '20'); await waitTime(180);
  report.bathroom.wet = (await snapshot()).metrics;
  assert.ok(report.bathroom.wet.ceilingSurfaceMax > 60); assert.ok(report.bathroom.wet.wallSurfaceMax > 18);
  await page.locator('#frontViewBtn').click(); await clickSurface(3, 2); await clickSurface(-1.375, .375);
  report.bathroom.wallReadings = { dry: await page.locator('#controlMetric').innerText(), wet: await page.locator('#suspectMetric').innerText() };
  assert.equal(report.bathroom.wallReadings.dry, '8%'); assert.ok(Number(report.bathroom.wallReadings.wet.match(/[\d.]+/)[0]) > 18);
  await page.selectOption('#bathroomSurface', 'slab');
  await page.locator('#controlSampleBtn').click(); await clickSurface(3, 2, 'ceiling'); await clickSurface(-.625, 3.625, 'ceiling');
  report.bathroom.ceilingReadings = { dry: await page.locator('#controlMetric').innerText(), wet: await page.locator('#suspectMetric').innerText() };
  assert.ok(Number(report.bathroom.ceilingReadings.dry.match(/[\d.]+/)[0]) < 12); assert.ok(Number(report.bathroom.ceilingReadings.wet.match(/[\d.]+/)[0]) > 60);
  await page.screenshot({ path: 'artifacts/scenario02-ceiling-wet.png' });
  await page.locator('#waterproofRepairBtn').click(); assert.equal((await snapshot()).repairs.job, null);
  await page.locator('#playPauseBtn').click(); await page.locator('#surfacePatchBtn').click();
  assert.equal((await snapshot()).repairs.job.kind, 'surface');
  await page.waitForTimeout(300); assert.equal((await snapshot()).repairs.job.elapsed, 0);
  await page.locator('#playPauseBtn').click(); await waitRepair(); await waitTime(120);
  report.bathroom.surfaceOnly = (await snapshot()).metrics;
  assert.ok(report.bathroom.surfaceOnly.leakRate > report.bathroom.wet.leakRate * .8);
  assert.ok(report.bathroom.surfaceOnly.ceilingSurfaceMax > 60);
  assert.ok(report.bathroom.surfaceOnly.efflorescence > .1);
  await page.locator('#bathroomUse').uncheck();
  await page.locator('#waterproofRepairBtn').click(); assert.ok(await page.locator('#bathroomUse').isDisabled());
  await waitRepair(); assert.ok((await snapshot()).repairs.waterproofRepaired);
  // Undo must restore membrane permeability and the physical state; then redo normally.
  await page.locator('#undoBtn').click(); assert.equal((await snapshot()).repairs.waterproofRepaired, false);
  await page.locator('#waterproofRepairBtn').click(); await waitRepair();
  await page.locator('[data-mode=verify]').click(); await page.locator('#nextStepBtn').click();
  assert.ok((await page.locator('#toast').innerText()).includes('恢復用水'));
  await page.locator('#bathroomUse').check(); report.bathroom.verification = await verify();
  report.bathroom.repaired = (await snapshot()).metrics;
  assert.ok(report.bathroom.repaired.leakRate < report.bathroom.wet.leakRate * .05);
  assert.ok(report.bathroom.repaired.ceilingSurfaceMax < report.bathroom.wet.ceilingSurfaceMax * .5);
  await page.locator('#debugToggle').check(); await page.selectOption('#layerSelect', '4'); await page.selectOption('#fieldMode', 'cracks');
  await page.screenshot({ path: 'artifacts/scenario02-membrane-repaired.png' });
  await page.selectOption('#fieldMode', 'source'); await page.waitForTimeout(200);
  await page.screenshot({ path: 'artifacts/scenario02-area-source.png' });

  await page.locator('[data-scenario=hotpipe]').click(); await page.selectOption('#timeSlider', '20'); await waitTime(120);
  report.hotpipe.wet = (await snapshot()).metrics;
  await page.locator('#bathroomUse').uncheck(); await waitTime(5); assert.equal((await snapshot()).metrics.leakRate, 1);
  await page.locator('#pipeBypassBtn').click(); assert.equal((await snapshot()).repairs.job, null);
  await page.locator('#surfacePatchBtn').click(); await waitRepair(); await waitTime(120);
  report.hotpipe.surfaceOnly = (await snapshot()).metrics;
  assert.equal(report.hotpipe.surfaceOnly.leakRate, 1); assert.ok(report.hotpipe.surfaceOnly.surfaceMax > 70);
  await page.locator('#pipeValve').uncheck(); await waitTime(1); assert.equal((await snapshot()).metrics.leakRate, 0);
  await page.locator('#pipeValve').check(); await waitTime(1); assert.equal((await snapshot()).metrics.leakRate, 1);
  await page.locator('#pipeValve').uncheck(); await page.locator('#pipeBypassBtn').click(); assert.ok(await page.locator('#pipeValve').isDisabled());
  await waitRepair(); await page.locator('#pipeValve').check(); await waitTime(1);
  let s = await snapshot(); assert.equal(s.metrics.leakRate, 0); assert.equal(s.pipes[0].isolated, true); assert.equal(s.pipes[1].pressure, .4);
  // Changed pressure must never pass as a source repair comparison.
  await page.locator('#pipePressure').focus(); await page.keyboard.press('End');
  await page.locator('[data-mode=verify]').click(); await page.locator('#nextStepBtn').click();
  assert.ok((await page.locator('#toast').innerText()).includes('相同的用水與供水壓力'));
  await page.locator('#pipePressure').focus(); for (let i = 0; i < 20; i++) await page.keyboard.press('ArrowLeft');
  report.hotpipe.verification = await verify(); await waitTime(120);
  s = await snapshot(); report.hotpipe.repaired = s.metrics;
  assert.ok(s.metrics.surfaceMax < 15); assert.equal(s.pipes[1].pressure, .4);
  await page.locator('#homeViewBtn').click(); await page.screenshot({ path: 'artifacts/scenario02-exposed-pipe.png' });
  await page.locator('#debugToggle').check(); await page.selectOption('#fieldMode', 'flow'); await page.waitForTimeout(300);
  await page.screenshot({ path: 'artifacts/scenario02-pipe-cutaway.png' });
  for (const [width, height] of [[1920, 1080], [1024, 768], [800, 1280], [390, 844]]) {
    await page.setViewportSize({ width, height }); await page.waitForTimeout(200);
    const layout = await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth, canvasWidth: document.querySelector('#scene').getBoundingClientRect().width }));
    assert.ok(layout.pageWidth <= width + 1); assert.ok(layout.canvasWidth > 200); report.layouts.push({ width, height, ...layout });
    await page.screenshot({ path: `artifacts/scenario02-layout-${width}.png`, fullPage: width < 901 });
  }
  await page.locator('[data-scenario=bathroom]').click(); assert.equal((await snapshot()).pipes.length, 0);
  assert.equal((await snapshot()).repairs.surfacePatchCount, 0);

  const context = await browser.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true });
  const touch = await context.newPage(); touch.on('pageerror', e => errors.push(String(e)));
  await touch.goto('http://127.0.0.1:5173/?test=1'); await touch.locator('[data-scenario=bathroom]').tap();
  await touch.selectOption('#bathroomSurface', 'slab'); await touch.locator('#scene').scrollIntoViewIfNeeded();
  const p = await touch.evaluate(() => window.__simTest.project(-.625, 3.625, 'ceiling'));
  await touch.touchscreen.tap(p.x, p.y);
  assert.match(await touch.locator('#controlMeta').innerText(), /天花板/);
  const cdp = await context.newCDPSession(touch);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: p.x - 50, y: p.y, id: 1 }, { x: p.x + 50, y: p.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p.x - 80, y: p.y, id: 1 }, { x: p.x + 80, y: p.y, id: 2 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.match(await touch.locator('#suspectMetric').innerText(), /—$/);
  await touch.locator('#bathroomUse').tap(); assert.equal(await touch.evaluate(() => window.__simTest.snapshot().environment.bathroomUse), 0);
  report.touch = { ceilingMeasurement: true, pinchDoesNotMeasure: true, supplyToggle: true }; await context.close();
  assert.deepEqual(errors, []); console.log(JSON.stringify(report, null, 2));
} finally { await writeFile('artifacts/bathroom-browser-report.json', JSON.stringify(report, null, 2)); await browser.close(); }
