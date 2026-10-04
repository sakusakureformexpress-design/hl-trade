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
    ok((await page.locator('#vHelp .gtabs button').count()) === 10, 'タブが10つある');
    ok((await page.locator('#vHelp h2[id]').count()) === 1, '一度に出る項目は1つだけ（スクロールが長くならない）');
    const heights = []; const seen = [];
    const IDS = ['g1', 'g2', 'gd', 'g3', 'gk', 'g4', 'g5', 'g6', 'g7', 'g8'];
    for (let i = 0; i < 10; i++) {
      await page.locator('#vHelp .gtabs button').nth(i).click(); await page.waitForTimeout(250);
      await page.evaluate(() => document.querySelectorAll('#vHelp img').forEach(im => { im.loading = 'eager'; })); await page.waitForTimeout(500);
      const info = await page.evaluate(() => ({ id: document.querySelector('#vHelp h2[id]').id, h: document.getElementById('vHelp').scrollHeight, imgs: [...document.querySelectorAll('#vHelp img')].map(im => [im.getAttribute('src'), im.complete && im.naturalWidth > 0]), sel: document.querySelector('#vHelp .gtabs .sel').dataset.g }));
      heights.push(info.h); seen.push(...info.imgs);
      if (info.id !== IDS[i] || info.sel !== info.id) ok(false, `タブ ${i + 1} の中身が切り替わる`, JSON.stringify(info));
    }
    ok(seen.length === 9 && seen.every(x => x[1]), '画像が9枚ぜんぶ読み込める（タブをめぐって）', JSON.stringify(seen.filter(x => !x[1])));
    ok(seen.every(x => x[0].includes(`guide/${lang}/`)), '画像が、いまの言語のものになっている');
    ok(Math.max(...heights) < (w < 800 ? 4200 : 3200), '1つの項目は、そんなに長くない', String(Math.max(...heights)));
    await page.locator('#vHelp .gtabs button').nth(0).click(); await page.waitForTimeout(200);
    await page.click('#vHelp .gnav .pri'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('#vHelp h2[id]').id === 'g2'), '「次へ」で次の項目に進む');
    await page.click('#vHelp .gnav button:not(.pri)'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('#vHelp h2[id]').id === 'g1'), '「前へ」で戻る');
    const txt = await page.evaluate(() => document.querySelector('#vHelp').innerText);
    if (lang !== 'ja') ok(!L.KANA_KANJI.test(txt), '日本語の文字が残っていない', (txt.match(L.KANA_KANJI) || [])[0] + ' … ' + txt.slice(txt.search(L.KANA_KANJI), txt.search(L.KANA_KANJI) + 40));
    const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    ok(ov <= 1, '横にはみ出さない', String(ov));
    await page.locator('#vHelp .gtabs button').nth(5).click(); await page.waitForTimeout(300);
    ok(await page.evaluate(() => store.get('guideTab') === 'g4'), '開いたタブを覚えている');
    // 公式の URL が出ている・鍵の取り方のタブへ飛べる
    await page.evaluate(() => { store.set('guideTab', 'gd'); GUIDE.render(); });
    const links = await page.evaluate(() => [...document.querySelectorAll('#vHelp a')].map(a => [a.href, a.target, a.rel]));
    ok(links.some(x => x[0] === 'https://app.hyperliquid.xyz/') && links.every(x => x[1] === '_blank' && /noopener/.test(x[2])), '入金のタブに、Hyperliquid の公式 URL がある（別のタブで開く）', JSON.stringify(links));
    await page.evaluate(() => { store.set('guideTab', 'gk'); GUIDE.render(); });
    const links2 = await page.evaluate(() => [...document.querySelectorAll('#vHelp a')].map(a => a.href));
    ok(links2.includes('https://app.hyperliquid.xyz/API'), '鍵の取り方のタブに、API の画面の URL がある', JSON.stringify(links2));
    await page.evaluate(() => { store.set('guideTab', 'g3'); GUIDE.render(); });
    await page.click('#vHelp .gbtn[data-help=gk]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('#vHelp h2[id]').id === 'gk'), '鍵のタブの「取り方を見る」で、取り方のタブへ飛ぶ');
    await page.click('#vHelp .gbtn[data-help=g3]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => document.querySelector('#vHelp h2[id]').id === 'g3'), '取り方のタブから、鍵のタブへ戻れる');
    await page.evaluate(() => openLiveSetup()); await page.waitForSelector('#wlGo');
    await page.click('#modal .lv details summary'); await page.click('#modal .lv details .qh'); await page.waitForTimeout(300);
    ok(await page.evaluate(() => S.page === 'help' && document.querySelector('#vHelp h2[id]').id === 'gk'), '鍵を作る画面の「？」から、取り方のタブが開く');
    await page.evaluate(() => { store.set('guideTab', 'g1'); setPage('help'); GUIDE.render(); });
    // 言語を切り替えても、そのまま使い方ページ
    const other = lang === 'en' ? 'ko' : 'en';
    await page.evaluate(l => setLang(l), other); await page.waitForTimeout(500);
    ok(await page.evaluate(l => document.querySelector('#vHelp img').getAttribute('src').includes(`guide/${l}/`), other), '言語を切り替えると、画像も文章も切り替わる');
    ok(await page.evaluate(() => S.page === 'help' && !document.getElementById('vHelp').hidden), '切り替えても使い方のページのまま');
    // 開き直しても、最後のページ
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && S.page === 'help' && !document.getElementById('vHelp').hidden, null, { timeout: 20000 }).catch(() => {}); await page.waitForTimeout(300);
    ok(await page.evaluate(() => S.page === 'help' && !document.getElementById('vHelp').hidden), '開き直しても使い方のページが開く');
    await page.click('#pages button[data-p=trade]'); await page.waitForTimeout(500);
    ok(await page.isVisible('#chartBox') && await page.evaluate(() => document.getElementById('vHelp').hidden), 'トレードに戻れる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
