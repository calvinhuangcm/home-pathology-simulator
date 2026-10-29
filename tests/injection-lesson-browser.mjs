import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
await mkdir('artifacts', { recursive: true });

try {
  const base = process.env.BASE_URL || 'http://127.0.0.1:5173/';
  await page.goto(new URL('./', base).toString());
  await page.locator('.lesson-link').click();
  await page.waitForURL(/injection-lesson\.html$/);
  await page.goto(new URL('injection-lesson.html?test=1', base).toString());
  await page.waitForFunction(() => Boolean(window.__injectionLessonTest));

  let state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.equal(state.connected, true, 'the starting example should show a real 3D bore-to-crack intersection');
  assert.ok(state.intersectionDepthCm > 12 && state.intersectionDepthCm < state.boreDepthCm);
  assert.equal(await page.locator('#connectionBadge').getAttribute('data-connected'), 'true');
  await page.screenshot({ path: 'artifacts/injection-lesson-aim-control.png', fullPage: true });
  await page.locator('[data-view="needle"]').click();
  assert.ok(await page.locator('.needle-shaft').count());

  const grip = await page.locator('.injector-grip-target').boundingBox();
  assert.ok(grip, 'the injector should expose a visible draggable grip');
  const initialAim = { azimuthDeg: state.azimuthDeg, tiltDeg: state.tiltDeg };
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 10, grip.y + grip.height / 2 - 8, { steps: 6 });
  await page.mouse.up();
  state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.ok(state.azimuthDeg !== initialAim.azimuthDeg || state.tiltDeg !== initialAim.tiltDeg, 'dragging the injector should adjust its direction or angle');
  for (const [id, value] of [['azimuthSlider', '105'], ['tiltSlider', '45']]) {
    await page.locator(`#${id}`).evaluate((element, next) => { element.value = next; element.dispatchEvent(new Event('input', { bubbles: true })); }, value);
  }
  state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.equal(state.connected, true, 'the draggable aim can return to the original connected path using fine controls');

  await page.locator('#injectionButton').click();
  await page.waitForFunction(() => window.__injectionLessonTest.snapshot().crackFlowLengthCm > 12, null, { timeout: 8000 });
  state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.ok(state.injectedMl > 20);
  assert.ok(state.crackFlowLengthCm > 12);
  assert.ok(await page.locator('.fluid-bore').count());
  assert.ok(await page.locator('.fluid-crack').count());
  await page.screenshot({ path: 'artifacts/injection-lesson-connected.png', fullPage: true });

  await page.locator('#injectionButton').click();
  await page.locator('#azimuthSlider').evaluate(element => {
    element.value = '270';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.equal(state.injectedMl, 0, 'changing geometry should clear the previous demonstration run');
  assert.equal(state.connected, false);
  await page.locator('#injectionButton').click();
  await page.waitForFunction(() => window.__injectionLessonTest.snapshot().injectedMl > 20, null, { timeout: 5000 });
  state = await page.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.equal(state.crackFlowLengthCm, 0, 'unconnected injection must stay in the bore');
  await page.screenshot({ path: 'artifacts/injection-lesson-unconnected.png', fullPage: true });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  const mobile = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, viewport: innerWidth }));
  assert.ok(mobile.width <= mobile.viewport + 1, 'the lesson should not overflow horizontally on mobile');
  const touchContext = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const touchPage = await touchContext.newPage();
  await touchPage.goto(new URL('injection-lesson.html?test=1', base).toString());
  await touchPage.waitForFunction(() => Boolean(window.__injectionLessonTest));
  const beforeTouchAim = await touchPage.evaluate(() => window.__injectionLessonTest.snapshot());
  const touchBox = await touchPage.locator('.injector-grip-target').boundingBox();
  assert.ok(touchBox);
  const cdp = await touchContext.newCDPSession(touchPage);
  const x = touchBox.x + touchBox.width / 2, y = touchBox.y + touchBox.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 12, y: y - 9, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const afterTouchAim = await touchPage.evaluate(() => window.__injectionLessonTest.snapshot());
  assert.ok(afterTouchAim.azimuthDeg !== beforeTouchAim.azimuthDeg || afterTouchAim.tiltDeg !== beforeTouchAim.tiltDeg, 'touch dragging should also adjust the injector aim');
  await touchContext.close();
  await page.screenshot({ path: 'artifacts/injection-lesson-mobile.png', fullPage: true });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ connectedFlow: true, disconnectedFlowStaysInBore: true, mobile, errors }, null, 2));
} finally {
  await writeFile('artifacts/injection-lesson-browser-report.json', JSON.stringify({ errors }, null, 2));
  await browser.close();
}
