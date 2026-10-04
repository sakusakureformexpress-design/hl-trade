// 取引所から来る文字列（銘柄名・向き・状態・値段など）に、悪意のある文字が入っていても、画面で実行されない
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const lang of ['ja', 'en']) {
    console.log(`=== ${lang} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w: 1280, h: 900, noSeed: true });
    const PAY = 'E<img src=x onerror="window.__x=(window.__x||0)+1">';
    await page.evaluate(PAY => {
      window.__x = 0;
      const pos = S.acct.assetPositions[0].position; pos.coin = PAY;
      S.orders = [{coin: PAY, oid: 777, side: 'B', sz: PAY, origSz: '1', limitPx: PAY, triggerPx: PAY, isTrigger: false, orderType: 'Limit', reduceOnly: false, tif: 'Gtc', timestamp: Date.now()}];
      S.spot = {balances: [{coin: PAY, token: 999, total: '1', hold: '0'}, {coin: 'USDC', token: 0, total: '100', hold: '0'}]};
      H.fills = [{coin: PAY, dir: PAY, px: PAY, sz: '1', time: Date.now(), closedPnl: '0', fee: '0', feeToken: 'USDC', side: 'B'}];
      H.orders = [{order: {coin: PAY, side: 'B', orderType: 'Limit', origSz: '1', limitPx: PAY, triggerPx: PAY, isTrigger: false, reduceOnly: false}, status: PAY, statusTimestamp: Date.now()}];
      H.funding = [{time: Date.now(), delta: {coin: PAY, usdc: '1', szi: '1', fundingRate: '0.0001'}}];
      onFills({user: S.user, isSnapshot: false, fills: [{coin: PAY, dir: PAY, px: PAY, sz: PAY, side: 'B', closedPnl: '0', time: Date.now()}]});
    }, PAY);
    for (const t of ['pos', 'ord', 'bal', 'fills', 'hist', 'sum']) {
      await page.evaluate(t => { S.aTab = t; try { renderAcct(); } catch (e) { window.__err = String(e); } }, t); await page.waitForTimeout(150);
    }
    await page.evaluate(() => { try { renderPosCard(); } catch {} });
    await page.waitForTimeout(500);
    ok(await page.evaluate(() => window.__x === 0), '悪意のある名前・向き・値段が、どの表・お知らせでも実行されない', String(await page.evaluate(() => window.__x)));
    ok(await page.evaluate(() => !document.querySelector('#aTbl img, #posCard img, #toasts img, #modal img')), 'img などの要素が作られていない');
    // 名前の関数：使えない文字は取り除く
    const r = await page.evaluate(PAY => ({ a: label(PAY), b: coinLabel(PAY), c: dirJa(PAY), d: stJa(PAY), n1: NAME_OK.test(PAY), n2: NAME_OK.test('BTC'), n3: NAME_OK.test('@107'), n4: NAME_OK.test('xyz:AAPL') }), PAY);
    ok(!/[<>"]/.test(r.a + r.b + r.c + r.d), 'label・coinLabel・dirJa・stJa が、そのままでは危ない文字（< > "）を出さない（取り除くか、エスケープする）', JSON.stringify(r));
    ok(!r.n1 && r.n2 && r.n3 && r.n4, '銘柄名の検査：悪意のある名前は通さず、普通の名前（BTC・@107・xyz:AAPL）は通す', JSON.stringify(r));
    // 取り込み：危ない名前の銘柄は、一覧に載せない
    const m = await page.evaluate(async PAY => {
      const orig = window.fetch;
      window.fetch = async (u, o) => { const b = o && o.body ? JSON.parse(o.body) : {}; if (b.type === 'metaAndAssetCtxs') return new Response(JSON.stringify([{universe: [{name: 'BTC', szDecimals: 5, maxLeverage: 40}, {name: PAY, szDecimals: 2, maxLeverage: 10}]}, [{markPx: '100', prevDayPx: '100', funding: '0', dayNtlVlm: '1', openInterest: '1'}, {markPx: '1', prevDayPx: '1', funding: '0', dayNtlVlm: '1', openInterest: '1'}]])); return orig(u, o); };
      try { await loadMeta(); } catch (e) { return String(e); } finally { window.fetch = orig; }
      return {bad: !!M[PAY], good: !!M.BTC};
    }, PAY);
    ok(m && m.good === true && m.bad === false, '取り込み：危ない名前の銘柄は載せず、普通の銘柄は載る', JSON.stringify(m));
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
