import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
const snapshot = () => page.evaluate(() => window.__simTest.snapshot());
async function waitForScenario(id) {
  await page.locator(`[data-scenario="${id}"]`).click();
  await page.waitForFunction(expected => window.__simTest.snapshot().scenarioId === expected, id);
  await page.locator('#frontViewBtn').click();
}
async function advanceFast() {
  await page.selectOption('#timeSlider', '20');
}

try {
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1');
  await page.waitForFunction(() => !!window.__simTest);
  await waitForScenario('drain');
  await advanceFast();
  await page.waitForFunction(() => window.__simTest.snapshot().waterSources.find(source => source.kind === 'drain')?.flow > .1);
  const drainBefore = await snapshot();
  assert.ok(drainBefore.pipes.some(pipe => pipe.service === 'drain'));
  await page.locator('#diagnosticDrainUse').uncheck();
  await page.waitForFunction(() => window.__simTest.snapshot().waterSources.find(source => source.kind === 'drain')?.flow === 0);
  await page.locator('#diagnosticBranchTestBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().diagnostics.activeDrainTest?.pipeId === 'leaking-drain');
  await page.waitForFunction(() => window.__simTest.snapshot().diagnostics.lastDrainTest?.pipeId === 'leaking-drain', null, { timeout: 10000 });
  const branchTest = (await snapshot()).diagnostics.lastDrainTest;
  assert.ok(branchTest.peakFlow > .1 && branchTest.leakedVolume > 0, 'finite branch test records real source flux then stops');
  assert.equal((await snapshot()).environment.drainUse, 0, 'branch test automatically restores drain use to off');
  await page.locator('#diagnosticDrainBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.drainRepaired);
  await page.locator('#diagnosticDrainUse').check();
  await page.waitForTimeout(150);
  assert.equal((await snapshot()).waterSources.find(source => source.kind === 'drain').flow, 0);
  assert.ok((await snapshot()).metrics.wallSurfaceMax > 8, 'pipe repair retains moisture while the wall dries');
  const paintPoint = await page.evaluate(() => window.__simTest.project(-.25, 2.4));
  await page.locator('[data-mode="paint"]').click();
  await page.mouse.move(paintPoint.x, paintPoint.y);
  await page.mouse.down();
  await page.mouse.move(paintPoint.x + 45, paintPoint.y + 10, { steps: 10 });
  await page.mouse.up();
  assert.ok((await snapshot()).wall.cells.some(cell => cell.surfaceCoating > 0), 'drag brush modifies actual coating state');
  await page.waitForTimeout(200);
  assert.ok(await page.locator('#toast').innerText().then(text => text.includes('表層網格')));
  await page.locator('[data-mode="verify"]').click();
  await page.locator('#nextStepBtn').click();
  await page.waitForFunction(() => document.querySelector('#operationTitle').textContent.includes('驗證完成'), null, { timeout: 20000 });
  assert.ok((await page.locator('#verificationResult').innerText()).includes('漏水率'));

  await waitForScenario('multi');
  await advanceFast();
  await page.waitForFunction(() => {
    const sources = window.__simTest.snapshot().waterSources;
    return sources.find(source => source.kind === 'drain')?.flow > .1 && sources.find(source => source.kind === 'area')?.flow > .005;
  }, { timeout: 15000 });
  const beforeMulti = await snapshot();
  const areaBefore = beforeMulti.waterSources.find(source => source.kind === 'area').flow;
  const drainBeforeMulti = beforeMulti.waterSources.find(source => source.kind === 'drain').flow;
  await page.locator('#diagnosticAreaUse').uncheck();
  await page.locator('#diagnosticWaterproofBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.waterproofRepaired, { timeout: 15000 });
  await page.locator('#diagnosticAreaUse').check();
  await page.waitForTimeout(250);
  const afterMembrane = await snapshot();
  assert.ok(afterMembrane.waterSources.find(source => source.kind === 'area').flow < areaBefore * .1);
  assert.ok(afterMembrane.waterSources.find(source => source.kind === 'drain').flow > 0);
  assert.ok(drainBeforeMulti > 0);
  assert.equal(await page.evaluate(() => window.__simTest.addDrainBranch()), true);
  await page.waitForFunction(() => document.querySelector('#diagnosticDrainTarget').options.length === 2);
  assert.equal(await page.locator('#diagnosticDrainTargetField').isVisible(), true);
  await page.locator('#diagnosticDrainUse').uncheck();
  await page.selectOption('#diagnosticDrainTarget', 'leaking-drain-secondary');
  await page.locator('#diagnosticBranchTestBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().diagnostics.activeDrainTest?.pipeId === 'leaking-drain-secondary');
  await page.waitForFunction(() => window.__simTest.snapshot().waterSources.find(source => source.pipeId === 'leaking-drain-secondary')?.flow > 0);
  const isolatedBranchRead = await snapshot();
  assert.equal(isolatedBranchRead.waterSources.find(source => source.pipeId === 'leaking-drain').flow, 0, 'branch test leaves unselected branch off');
  assert.ok(isolatedBranchRead.waterSources.find(source => source.pipeId === 'leaking-drain-secondary').flow > 0);
  await page.waitForFunction(() => window.__simTest.snapshot().diagnostics.lastDrainTest?.pipeId === 'leaking-drain-secondary', null, { timeout: 10000 });
  await page.locator('#diagnosticDrainBtn').click();
  await page.waitForFunction(() => !window.__simTest.snapshot().repairs.job, { timeout: 15000 });
  const afterFirstDrainRepair = await snapshot();
  assert.equal(afterFirstDrainRepair.pipes.find(pipe => pipe.id === 'leaking-drain-secondary').isolated, true);
  assert.equal(afterFirstDrainRepair.pipes.find(pipe => pipe.id === 'leaking-drain').isolated, false);
  assert.equal(afterFirstDrainRepair.repairs.drainRepaired, false);
  await page.locator('#diagnosticDrainUse').check();
  await page.waitForTimeout(150);
  let afterFirstVerification = await snapshot();
  assert.ok(afterFirstVerification.waterSources.find(source => source.pipeId === 'leaking-drain').flow > 0);
  assert.equal(afterFirstVerification.waterSources.find(source => source.pipeId === 'leaking-drain-secondary').flow, 0);
  await page.locator('#diagnosticDrainUse').uncheck();
  await page.locator('#diagnosticDrainBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.drainRepaired, { timeout: 15000 });
  await page.locator('#diagnosticDrainUse').check();
  await page.waitForTimeout(150);
  afterFirstVerification = await snapshot();
  assert.equal(afterFirstVerification.waterSources.find(source => source.pipeId === 'leaking-drain').flow, 0);
  assert.equal(afterFirstVerification.waterSources.find(source => source.pipeId === 'leaking-drain-secondary').flow, 0);
  const actualHypotheses = ['bathroom-waterproof', 'drain-pipe'];
  for (const id of ['external-crack', 'bathroom-waterproof', 'hot-water-pipe', 'drain-pipe', 'groundwater-pressure', 'condensation']) {
    const isActual = actualHypotheses.includes(id);
    if (isActual) await page.locator(`[data-select="${id}"]`).check();
    await page.locator(`[data-confidence="${id}"]`).evaluate((input, value) => { input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true })); }, isActual ? 100 : 0);
  }
  await page.locator('#submitDiagnosis').click();
  assert.match(await page.locator('#diagnosisResult').innerText(), /診斷 100 分/);
  assert.match(await page.locator('#evidenceList li').first().innerText(), /提交診斷/);
  await page.locator('[data-mode="verify"]').click();
  await page.locator('#nextStepBtn').click();
  await page.waitForFunction(() => document.querySelector('#operationTitle').textContent.includes('驗證完成'), null, { timeout: 20000 });

  await waitForScenario('basement');
  await advanceFast();
  await page.waitForFunction(() => window.__simTest.snapshot().waterSources[0].flow > .1);
  const groundwaterBefore = (await snapshot()).waterSources[0].flow;
  await page.locator('#diagnosticNegativeSealBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.negativeSideSealed, null, { timeout: 10000 });
  const afterInteriorSeal = await snapshot();
  assert.ok(afterInteriorSeal.waterSources[0].flow > 0, 'interior-side seal does not stop groundwater feeding the wall');
  assert.equal(afterInteriorSeal.environment.groundwaterLevel, 1.75);
  const setGroundLevel = value => page.locator('#groundwaterPressure').evaluate((input, next) => { input.value = String(next); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  await setGroundLevel(0);
  await page.locator('#diagnosticWaterproofBtn').click();
  await page.waitForFunction(() => window.__simTest.snapshot().repairs.waterproofRepaired, { timeout: 15000 });
  await setGroundLevel(175);
  await page.waitForTimeout(150);
  const groundwaterAfter = (await snapshot()).waterSources[0].flow;
  assert.ok(groundwaterAfter < groundwaterBefore * .02);
  assert.ok((await snapshot()).metrics.surfaceMax > 8);
  await page.locator('[data-mode="verify"]').click();
  await page.locator('#nextStepBtn').click();
  await page.waitForFunction(() => document.querySelector('#operationTitle').textContent.includes('驗證完成'), null, { timeout: 20000 });

  await waitForScenario('hotpipe');
  await page.locator('#thermalCameraToggle').click();
  await page.waitForFunction(() => document.querySelector('#fieldLegend').textContent.includes('熱像儀'));
  assert.match(await page.locator('#thermalCameraReadout').innerText(), /表面估算 .*°C/);
  for (const [id, value] of [['thermalOutdoor', 21], ['thermalHumidity', 90], ['thermalSolar', 100], ['thermalSunMinutes', 30], ['thermalEmissivity', 40], ['thermalReflected', 35]]) {
    await page.locator(`#${id}`).evaluate((input, next) => { input.value = String(next); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, value);
  }
  await page.waitForFunction(() => {
    const text = document.querySelector('#thermalCameraReadout').textContent;
    return text.includes('日照加熱') && text.includes('放射率') && text.includes('溫差偏小');
  });
  await page.locator('[data-mode="paint"]').click();
  assert.equal(await page.locator('#modeBadge').innerText(), '塗刷模式');
  assert.equal((await snapshot()).waterSources[0].flow > 0, true, 'surface tool does not stop the concealed hot-water source');

  const mobileContext = await browser.newContext({ viewport: { width: 800, height: 1280 }, hasTouch: true, isMobile: true });
  const mobile = await mobileContext.newPage();
  mobile.on('pageerror', error => errors.push(String(error)));
  await mobile.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1');
  await mobile.waitForFunction(() => !!window.__simTest);
  await mobile.locator('[data-scenario="drain"]').click();
  await mobile.locator('#frontViewBtn').tap();
  await mobile.locator('[data-mode="paint"]').tap();
  await mobile.locator('#scene').scrollIntoViewIfNeeded();
  const touchPoint = await mobile.evaluate(() => window.__simTest.project(-.25, 2.4));
  const touchSession = await mobileContext.newCDPSession(mobile);
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchPoint.x, y: touchPoint.y, id: 1 }] });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchPoint.x + 42, y: touchPoint.y + 8, id: 1 }] });
  await touchSession.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  assert.ok((await mobile.evaluate(() => window.__simTest.snapshot())).wall.cells.some(cell => cell.surfaceCoating > 0), 'touch drag paints the simulation surface on a tablet viewport');
  await mobileContext.close();

  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ drainRepair: true, finiteBranchTests: true, multiSourceDiagnosis: true, basementPressureRepair: true, thermalConditions: true, mouseBrushInteraction: true, touchBrushInteraction: true, errors }, null, 2));
} finally {
  await browser.close();
}
