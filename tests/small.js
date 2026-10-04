// 細かい修正の検証：数字の読み取り・丸め・価格の桁・最小注文額・銘柄切り替え時のリセット・?lang の安全性
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  const { page, ctx } = await L.open(b, { lang: 'ja', w: 1280, h: 900 });
  await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(500);
  const r = await page.evaluate(() => ({
    pf: [pf('１２３．５'), pf('1,234.5'), pf(' 7 '), pf('−3'), pf(''), pf('abc'), pf(4)],
    rs: [roundSz('BTC', 0.1 + 0.2), roundSz('BTC', NaN), roundSz('BTC', -1), roundSz('BTC', 0)],
    pd: [(M.__T = {kind:'perp', szD:0}, pxDec('__T', 0.0123)), pxDec('__T', 0.5), pxDec('__T', 12.3456)],
  }));
  ok(r.pf[0] === 123.5 && r.pf[1] === 1234.5 && r.pf[2] === 7 && r.pf[3] === -3 && isNaN(r.pf[4]) && isNaN(r.pf[5]) && r.pf[6] === 4, '全角・カンマ・空白の混ざった数字を読める', JSON.stringify(r.pf));
  ok(r.rs[0] === 0.3 || r.rs[0] === 0.29 || String(r.rs[0]).length < 8, '数量の丸めで、浮動小数の端数が出ない', JSON.stringify(r.rs));
  ok(r.rs[1] === 0 && r.rs[2] === 0 && r.rs[3] === 0, '数量が NaN・負・0 のときは 0', JSON.stringify(r.rs));
  ok(r.pd[0] >= 5 && r.pd[1] >= 4, '1未満の値段は、有効数字5桁まで見せる', JSON.stringify(r.pd));
  // 最小注文額
  await page.fill('#sz', '5'); await page.evaluate(() => { S.unit = 'usd'; schedule(); });
  await page.evaluate(() => { S.side = 1; renderTicket(); $('submit').click(); }); await page.waitForSelector('#modal', { state: 'visible' });
  const t = await page.textContent('#modal');
  ok(/最小は約 \$10/.test(t) && await page.isHidden('#mOk'), '$5 の注文は、赤い理由が出て「注文する」が出ない', t.slice(-200) + ' hidden=' + await page.isHidden('#mOk'));
  await page.click('#mClose'); await page.waitForTimeout(200);
  // 銘柄を切り替えると、単位が USD に戻る
  await page.evaluate(() => { S.unit = 'coin'; $('sz').value = 20000; });
  await page.evaluate(() => { const k = Object.keys(M).find(x => M[x].kind === 'perp' && x !== curKey()); selectCoin(k); });
  const u = await page.evaluate(() => ({ unit: S.unit, sz: $('sz').value }));
  ok(u.unit === 'usd' && +u.sz !== 20000, '銘柄を切り替えると、単位が USD に戻り、前の銘柄の枚数を引き継がない', JSON.stringify(u));
  await ctx.close();
  // ?lang=__proto__ で壊れない
  { const r2 = await L.open(b, { lang: '__proto__', w: 1000, h: 800 }).catch(e => ({ err: e.message }));
    if (r2.page){ await r2.page.waitForTimeout(500); const l = await r2.page.evaluate(() => document.documentElement.lang); ok(['ja','ko','en'].includes(l), '?lang=__proto__ でも、対応する言語に落ち着く', l); await r2.ctx.close(); } else ok(false, '?lang=__proto__ を開けた', r2.err); }
  await b.close();
  const f = results.filter(x => !x).length; console.log(f ? `\n${f} 件失敗` : `\n全部通過 (${results.length})`); process.exit(f ? 1 : 0);
})();
