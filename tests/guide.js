// 使い方ページ：8つの項目・画像・目次・言語の切り替え・スマホで横にはみ出さない
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [lang, w, h] of [['ja', 1280, 800], ['en', 390, 844], ['ko', 1280, 800]]) {
    console.log(`=== ${lang} ${w}x${h} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true });
    ok(await page.isVisible('#pages button[data-p=help]'), '「使い方」のボタンが見える');
    await page.click('#pages button[data-p=help]'); await page.waitForSelector('#vHelp .guide'); await page.waitForTimeout(600);
    ok((await page.locator('#vHelp h2[id]').count()) === 8, '項目が8つある');
    ok((await page.locator('#vHelp .gtoc button').count()) === 8, '目次のボタンが8つある');
    await page.evaluate(() => document.querySelectorAll('#vHelp img').forEach(i => { i.loading = 'eager'; })); await page.waitForTimeout(1200);
    const im = await page.evaluate(() => [...document.querySelectorAll('#vHelp img')].map(i => [i.getAttribute('src'), i.complete && i.naturalWidth > 0]));
    ok(im.length === 7 && im.every(x => x[1]), '画像が7枚ぜんぶ読み込める', JSON.stringify(im.filter(x => !x[1])));
    ok(im.every(x => x[0].includes(`guide/${lang}/`)), '画像が、いまの言語のものになっている', im[0][0]);
    const txt = await page.evaluate(() => document.querySelector('#vHelp').innerText);
    if (lang !== 'ja') ok(!L.KANA_KANJI.test(txt), '日本語の文字が残っていない', (txt.match(L.KANA_KANJI) || [])[0] + ' … ' + txt.slice(txt.search(L.KANA_KANJI), txt.search(L.KANA_KANJI) + 40));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(ov <= 1, '横にはみ出さない', String(ov));
    await page.click('#vHelp .gtoc button[data-g=g5]'); await page.waitForTimeout(900);
    const y = await page.evaluate(() => document.getElementById('g5').getBoundingClientRect().top);
    ok(y < h * 0.5, '目次を押すと、その項目へ動く', String(y));
    // 言語を切り替えても、そのまま使い方ページ
    const other = lang === 'en' ? 'ko' : 'en';
    await page.evaluate(l => setLang(l), other); await page.waitForTimeout(500);
    ok(await page.evaluate(l => document.querySelector('#vHelp img').getAttribute('src').includes(`guide/${l}/`), other), '言語を切り替えると、画像も文章も切り替わる');
    ok(await page.evaluate(() => S.page === 'help' && !document.getElementById('vHelp').hidden), '切り替えても使い方のページのまま');
    // 開き直しても、最後のページ
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK, null, { timeout: 15000 }); await page.waitForTimeout(900);
    ok(await page.evaluate(() => S.page === 'help' && !document.getElementById('vHelp').hidden), '開き直しても使い方のページが開く');
    await page.click('#pages button[data-p=trade]'); await page.waitForTimeout(500);
    ok(await page.isVisible('#chartBox') && await page.evaluate(() => document.getElementById('vHelp').hidden), 'トレードに戻れる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
