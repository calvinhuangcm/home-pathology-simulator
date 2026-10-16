import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [], report = { scenarios: [], rotations: [], errors };
page.on('pageerror', e => errors.push(String(e)));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await mkdir('artifacts', { recursive: true });
const baseUrl = process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1';
const rotate = async (dx, dy = 0) => {
  const b = await page.locator('#scene').boundingBox();
  const x = b.x + b.width * .48, y = b.y + b.height * .55;
  await page.mouse.move(x, y); await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 12 }); await page.mouse.up();
  await page.mouse.move(20, 20); await page.waitForTimeout(100);
};
async function countExposedBrick() {
  const polygon = await page.evaluate(() => [[-2, 1.3], [2, 1.3], [2, 3.6], [-2, 3.6]].map(([x, y]) => window.__simTest.project(x, y)));
  const png = (await page.screenshot()).toString('base64');
  return page.evaluate(async ({ png, polygon }) => {
    const image = new Image(); image.src = `data:image/png;base64,${png}`; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    ctx.beginPath(); polygon.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    let brick = 0, sampled = 0;
    const x0 = Math.max(0, Math.ceil(Math.min(...polygon.map(p => p.x))));
    const x1 = Math.min(canvas.width, Math.floor(Math.max(...polygon.map(p => p.x))));
    const y0 = Math.max(0, Math.ceil(Math.min(...polygon.map(p => p.y))));
    const y1 = Math.min(canvas.height, Math.floor(Math.max(...polygon.map(p => p.y))));
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
      if (!ctx.isPointInPath(x + .5, y + .5)) continue;
      const i = (y * canvas.width + x) * 4, [r, g, b] = pixels.slice(i, i + 3);
      sampled++;
      // Red/brown structural bricks must never show through intact normal-mode plaster.
      if (r > 80 && r > g * 1.2 && r > b * 1.15) brick++;
    }
    return { brick, sampled };
  }, { png, polygon });
}
try {
  await page.goto(baseUrl); await page.waitForFunction(() => !!window.__simTest);
  const expected = ['window', 'crack', 'bathroom', 'hotpipe', 'pipe', 'condensation', 'rooftop'];
  assert.deepEqual(await page.locator('.scenario-card').evaluateAll(cards => cards.map(c => c.dataset.scenario)), expected);
  assert.equal(await page.locator('[data-scenario=bathroom] .icon').innerText(), '🚿');
  assert.equal(await page.locator('[data-scenario=hotpipe] .icon').innerText(), '🚰');
  for (const scenario of expected) {
    await page.locator(`[data-scenario=${scenario}]`).click();
    assert.ok(!(await page.locator('body').innerText()).includes('舊版示意'));
    assert.ok(await page.locator('#sceneTitle').innerText());
    report.scenarios.push(scenario);
  }
  for (const scenario of ['window', 'pipe']) {
    await page.locator(`[data-scenario=${scenario}]`).click();
    await page.selectOption('#timeSlider', '20'); await page.waitForTimeout(1300); await page.locator('#playPauseBtn').click();
    await page.locator('#labelsBtn').click();
    for (const [angle, dx, dy] of [['front', 0, 0], ['left', -65, 20], ['right', 65, 20], ['above', 45, -60]]) {
      await page.locator('#frontViewBtn').click(); if (dx || dy) await rotate(dx, dy);
      const pixels = await countExposedBrick();
      assert.ok(pixels.sampled > 1000);
      assert.ok(pixels.brick < 12, `${scenario} ${angle}: ${pixels.brick} brick-colored pixels leak through the wall`);
      report.rotations.push({ scenario, angle, ...pixels });
      await page.screenshot({ path: `artifacts/render-${scenario}-${angle}.png` });
    }
    await page.locator('#cutawayBtn').click(); await rotate(-45, -20);
    await page.screenshot({ path: `artifacts/render-${scenario}-cutaway.png` });
    await page.locator('#cutawayBtn').click(); await page.locator('#frontViewBtn').click();
    assert.ok((await countExposedBrick()).brick < 12);
  }
  await page.locator('[data-scenario=crack]').click(); await page.selectOption('#timeSlider', '20');
  await page.waitForFunction(() => window.__simTest.snapshot().metrics.efflorescence > .25, null, { timeout: 45000 });
  await page.locator('#playPauseBtn').click(); const time = await page.evaluate(() => window.__simTest.snapshot().simulationTime);
  for (const [angle, dx, dy] of [['front', 0, 0], ['left', -60, 20], ['right', 60, 20], ['above', 45, -60]]) {
    await page.locator('#frontViewBtn').click(); if (dx || dy) await rotate(dx, dy);
    await page.screenshot({ path: `artifacts/render-cellular-${angle}.png` });
  }
  assert.equal(await page.evaluate(() => window.__simTest.snapshot().simulationTime), time, 'rotating while paused must not change physical time');
  await page.locator('[data-scenario=bathroom]').click(); await page.selectOption('#timeSlider', '20');
  await page.waitForFunction(() => window.__simTest.snapshot().metrics.ceilingSurfaceMax > 65, null, { timeout: 45000 });
  await page.locator('#playPauseBtn').click(); await page.selectOption('#bathroomSurface', 'slab');
  for (const [angle, dx] of [['front', 0], ['left', -55], ['right', 55]]) {
    await page.locator('#homeViewBtn').click(); if (dx) await rotate(dx);
    await page.screenshot({ path: `artifacts/render-ceiling-${angle}.png` });
  }
  assert.deepEqual(errors, []); console.log(JSON.stringify(report, null, 2));
} finally { await writeFile('artifacts/rendering-report.json', JSON.stringify(report, null, 2)); await browser.close(); }
