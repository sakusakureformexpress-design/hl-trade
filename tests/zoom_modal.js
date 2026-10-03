// 文字を一番大きくしても、窓の「閉じる」などのボタンが画面の中に出ている（届く）ことを確かめる
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [w, h] of [[390, 844], [390, 600], [1440, 700]]) for (const z of [1, 1.6]) {
    console.log(`=== ${w}x${h} 文字 x${z} ===`);
    const { page, errors, ctx } = await L.open(b, { lang: 'ja', w, h, ls: { zoom: z }, noSeed: true });
    await page.evaluate(() => { openLiveSetup(); });
    await page.waitForSelector('#mClose', { state: 'visible' }); await page.waitForTimeout(300);
    const r = () => page.evaluate(() => { const e = document.getElementById('mClose'), r = e.getBoundingClientRect(), bx = document.querySelector('#modal .box').getBoundingClientRect(); return { top: r.top, bottom: r.bottom, left: r.left, right: r.right, vh: innerHeight, vw: innerWidth, boxTop: bx.top, boxBottom: bx.bottom, scroll: document.querySelector('#modal .box').scrollHeight > document.querySelector('#modal .box').clientHeight + 1 }; });
    const a = await r();
    ok(a.bottom <= a.vh + 1 && a.top >= 0 && a.right <= a.vw + 1, 'ライブ設定の窓：閉じるが画面の中にある', JSON.stringify(a));
    ok(a.boxTop >= -1 && a.boxBottom <= a.vh + 1, '窓が画面の中におさまる', JSON.stringify(a));
    await page.click('#mClose'); await page.waitForTimeout(200);
    ok(await page.isHidden('#modal'), '閉じるを押すと閉じる');
    // 銘柄の検索画面
    await page.evaluate(() => document.getElementById('coinFind').click()); await page.waitForTimeout(300);
    const p = await page.evaluate(() => { const e = document.querySelector('#picker .pbox'); if (!e) return null; const r = e.getBoundingClientRect(); const x = [...document.querySelectorAll('#picker button')].find(b => /閉じる|✕|×/.test(b.textContent)); const xr = x && x.getBoundingClientRect(); return { top: r.top, bottom: r.bottom, vh: innerHeight, closeTop: xr && xr.top, closeBottom: xr && xr.bottom }; });
    ok(p && p.bottom <= p.vh + 1 && p.top >= -1 && (!p.closeBottom || (p.closeTop >= 0 && p.closeBottom <= p.vh + 1)), '銘柄の検索画面も画面の中におさまる', JSON.stringify(p));
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
