import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true, channel: process.env.BROWSER_CHANNEL || 'chrome' });
const errors = [];
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(process.env.BASE_URL || 'http://127.0.0.1:5173/?test=1');
  await page.waitForFunction(() => !!window.__simTest);

  assert.equal(await page.locator('#languageSelect').inputValue(), 'zh-Hant', 'first visit defaults to Traditional Chinese');
  assert.equal(await page.locator('html').getAttribute('lang'), 'zh-Hant');
  await page.locator('#playPauseBtn').click();
  await page.waitForTimeout(100);
  const beforeLanguageChange = await page.evaluate(() => window.__simTest.snapshot());

  await page.selectOption('#languageSelect', 'en');
  await page.waitForFunction(() => document.documentElement.lang === 'en' && document.querySelector('.brand h1').textContent === 'Wall Pathology Simulator');
  assert.equal(await documentTitle(page), 'Wall Pathology Simulator · Interactive Lab');
  assert.match(await page.locator('.workflow').innerText(), /Inspect/);
  assert.deepEqual(await page.evaluate(() => window.__simTest.snapshot()), beforeLanguageChange, 'changing language must not change simulation state');
  assert.equal(await page.locator('#modeButtons').getAttribute('aria-label'), 'Choose a tool');

  await page.locator('[data-scenario="bathroom"]').click();
  await page.waitForFunction(() => document.querySelector('#sceneTitle').textContent === 'Bathroom waterproofing failure');
  assert.match(await page.locator('#bathroomPanel').innerText(), /Bathroom · Water supply and source repair/i);
  assert.equal(await page.locator('#bathroomPanel').isVisible(), true);
  const collectUntranslatedEnglish = () => page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const leftovers = [];
    while (walker.nextNode()) {
      const node = walker.currentNode, element = node.parentElement, text = node.textContent.trim();
      if (text && /[\u3400-\u9fff]/.test(text) && element && !element.closest('#languageSelect, [hidden]') && element.getClientRects().length) leftovers.push(text);
    }
    return [...new Set(leftovers)];
  });
  const untranslatedEnglish = {};
  for (const scenario of await page.locator('[data-scenario]').evaluateAll(cards => cards.map(card => card.dataset.scenario))) {
    await page.locator(`[data-scenario="${scenario}"]`).click();
    await page.waitForFunction(id => document.querySelector(`[data-scenario="${id}"].active`) !== null, scenario);
    await page.waitForTimeout(50);
    const leftovers = await collectUntranslatedEnglish();
    if (leftovers.length) untranslatedEnglish[scenario] = leftovers;
  }
  assert.deepEqual(untranslatedEnglish, {}, 'visible app text should not fall back to Chinese in English mode for any scenario');
  await page.locator('[data-scenario="bathroom"]').click();
  await page.waitForFunction(() => document.querySelector('[data-scenario="bathroom"].active') !== null);

  await page.selectOption('#languageSelect', 'ja');
  await page.waitForFunction(() => document.documentElement.lang === 'ja' && document.querySelector('.brand h1').textContent === '壁面劣化シミュレーター');
  assert.equal(await documentTitle(page), '壁面劣化シミュレーター · インタラクティブ実験室');
  assert.equal(await page.locator('#sceneTitle').innerText(), '浴室防水層の劣化');
  assert.match(await page.locator('#bathroomPanel').innerText(), /給水と水源の補修/);
  assert.equal(await page.locator('#scene').getAttribute('aria-label'), '漏水のインタラクティブシーンです。クリックで選択中のツールを実行し、ドラッグで回転、ピンチで拡大縮小します。右側の孔リストからプラグ取付と注入も操作できます。');

  await page.locator('#thermalCameraToggle').click();
  await page.waitForFunction(() => document.querySelector('#thermalCameraToggle').textContent.includes('終了'));
  await page.selectOption('#languageSelect', 'en');
  await page.waitForFunction(() => document.querySelector('#thermalCameraToggle').textContent.includes('Disable'));
  await page.reload();
  await page.waitForFunction(() => !!window.__simTest && document.documentElement.lang === 'en');
  assert.equal(await page.locator('#languageSelect').inputValue(), 'en', 'language preference persists after reload');
  assert.equal(await page.locator('.brand h1').innerText(), 'Wall Pathology Simulator');

  await page.selectOption('#languageSelect', 'zh-Hant');
  await page.waitForFunction(() => document.documentElement.lang === 'zh-Hant' && document.querySelector('.brand h1').textContent === '壁癌模擬器');
  assert.equal(await documentTitle(page), '壁癌模擬器 · 互動實驗室');
  assert.equal(await page.locator('#sceneTitle').innerText(), '外牆裂縫滲水');
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ languages: ['zh-Hant', 'en', 'ja'], persistsAfterReload: true, simulationUnchangedOnSwitch: true, errors }, null, 2));
  await context.close();
} finally {
  await browser.close();
}

async function documentTitle(page) { return page.title(); }
