const L = require('./lib'); const SHOTS = require('path').join(__dirname, 'shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true }); const path = require('path').join(__dirname, '..', 'preview-wrapped.html');
(async () => {
  const b = await L.launch(); let bad = 0;
  for (const [lang, w, h] of [['en', 1440, 900], ['ko', 390, 844], ['ja', 1280, 800]]) {
    const ctx = await b.newContext({ viewport: { width: w, height: h }, locale: lang === 'ja' ? 'ja-JP' : lang === 'ko' ? 'ko-KR' : 'en-US' }); const page = await ctx.newPage(); const errs = [], ext = new Set();
    page.on('pageerror', e => errs.push(e.message)); page.on('request', r => { try { const u = new URL(r.url()); if (u.protocol !== 'file:') ext.add(u.host); } catch {} });
    await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await page.goto('file://' + path); await page.waitForFunction(() => document.querySelectorAll('#coins button').length > 0 && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 }); await page.waitForTimeout(1800);
    const info = await page.evaluate(() => ({ lang: LANG, bar: document.getElementById('demoBar').textContent, fee: BUILD.on() }));
    // 言語を切り替えて、手数料の承認まで通す
    await page.click('#langSel button[data-l=ko]'); await page.waitForTimeout(500);
    await page.click('#langSel button[data-l=' + lang + ']'); await page.waitForTimeout(400);
    await page.evaluate(() => window.__HL_DEMO_READY); await page.click('#modeBtn'); await page.waitForSelector('#bfOk'); await page.click('#bfOk'); await page.waitForTimeout(900);
    const approved = await page.evaluate(() => BUILD.ok());
    await page.screenshot({ path: SHOTS + `preview-${lang}.png` });
    console.log(lang, JSON.stringify(info).slice(0, 220), 'approved:', approved, 'external:', [...ext].join(','), errs.length ? 'ERR ' + errs.join('|') : 'ok'); if (errs.length || !approved) bad++; await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
