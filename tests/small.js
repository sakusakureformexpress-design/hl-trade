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
  // 板の数字を押して入った値段は、「クリア」で消せる（チャートの点線も消えて成行に戻る）
  { const { page, ctx } = await L.open(b, { lang: 'ja', w: 1280, h: 900 }); await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(800);
    await page.evaluate(() => document.querySelector('#book [data-px]').click()); await page.waitForTimeout(200);
    let st = await page.evaluate(() => ({ t: S.otype, px: $('px').value, hid: $('pxField').hidden }));
    ok(st.t === 'limit' && st.px && !st.hid, '板の数字を押すと、指値の価格が入る', JSON.stringify(st));
    await page.click('#pxClr'); await page.waitForTimeout(200);
    st = await page.evaluate(() => ({ t: S.otype, px: $('px').value, hid: $('pxField').hidden, lines: (typeof chartLines === 'function' ? chartLines().filter(l => l.id === 'npx').length : 0) }));
    ok(st.t === 'market' && st.px === '' && st.hid && !st.lines, '「クリア」で、値段が消えて成行に戻る', JSON.stringify(st));
    // 証拠金：クロスは説明、分離は出し入れの画面
    const cross = await page.evaluate(() => S.acct.assetPositions.map(a => a.position).find(p => p.leverage.type === 'cross')?.coin);
    const iso = await page.evaluate(() => S.acct.assetPositions.map(a => a.position).find(p => p.leverage.type === 'isolated')?.coin);
    if (cross){ await page.evaluate(c => posAction('margin', c), cross); await page.waitForTimeout(200);
      const t = await page.textContent('#modal'); ok(/クロス/.test(t) && /出金/.test(t) && !(await page.isVisible('#gMode')), 'クロスのポジションの「証拠金」は、仕組みと使える余力の説明が出る', t.slice(0, 120)); await page.evaluate(() => closeModal()); }
    if (iso){ await page.evaluate(c => posAction('margin', c), iso); await page.waitForTimeout(200);
      ok(await page.isVisible('#gMode'), '分離のポジションの「証拠金」は、足す・減らすの画面が出る'); await page.evaluate(() => closeModal()); }
    await ctx.close(); }
  // 分離：パネルを開かなくても「クロス／分離」が見えて、分離で注文すると、取引所へ「分離にする」が先に送られる
  { const { page, ctx } = await L.open(b, { lang: 'ja', w: 1280, h: 900, noSeed: false }); await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(800);
    await page.evaluate(async () => { await LIVE.unlock(__HL_MOCK.DEMO_PIN); LIVE.setLive(true); });
    const coin = await page.evaluate(() => Object.keys(M).find(k => M[k].kind === 'perp' && !posOf(k) && !M[k].onlyIso));
    await page.evaluate(c => selectCoin(c), coin); await page.waitForTimeout(300);
    ok(await page.isVisible('#mMode') && await page.isHidden('#levPanel'), '「クロス／分離」が、パネルを開かなくても見える');
    ok(await page.evaluate(() => S.margin) === 'cross', '初期値はクロスのまま');
    await page.click('#mMode [data-v=isolated]'); await page.waitForTimeout(200);
    ok(await page.evaluate(() => S.margin) === 'isolated' && /分離/.test(await page.textContent('#levMode')), '分離を選べる');
    await page.fill('#sz', '120'); await page.dispatchEvent('#sz', 'input'); await page.click('#submit'); await page.waitForSelector('#mOk'); await page.click('#mOk'); await page.waitForTimeout(1200);
    const lg = await page.evaluate(() => __HL_MOCK.state.log.map(x => ({ t: x.action.type, c: x.action.isCross, ok: x.verdict && x.verdict.ok })));
    ok(lg.some(x => x.t === 'updateLeverage' && x.c === false && x.ok) && lg.some(x => x.t === 'order' && x.ok), '分離で注文すると、「分離にする」の署名つき指示が先に送られ、注文も通る', JSON.stringify(lg));
    await ctx.close(); }
  // 他の銘柄の余力：取引所の「この銘柄で使える額」が小さくても、口座全体の空き証拠金が足りるなら、止めずに注意だけ出す（足りないときは止める）
  { const { page, ctx } = await L.open(b, { lang: 'ja', w: 1280, h: 900 }); await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(800);
    await page.evaluate(async () => { await LIVE.unlock(__HL_MOCK.DEMO_PIN); LIVE.setLive(true); });
    const coin = await page.evaluate(() => Object.keys(M).find(k => M[k].kind === 'perp' && !posOf(k) && !M[k].onlyIso));
    await page.evaluate(c => selectCoin(c), coin); await page.waitForTimeout(400);
    await page.evaluate(c => { S.aad[c] = Object.assign({}, S.aad[c], { availableToTrade: ['5.00', '5.00'] }); }, coin);
    await page.fill('#sz', '200'); await page.dispatchEvent('#sz', 'input');
    await page.evaluate(() => { S.side = 1; renderTicket(); $('submit').click(); }); await page.waitForSelector('#modal', { state: 'visible' });
    let t = await page.textContent('#modal');
    ok(/口座全体の空き証拠金/.test(t) && await page.isVisible('#mOk'), '口座全体に余力があれば、取引所の数字が小さくても、注意だけで「注文する」が出る', t.slice(-260));
    await page.evaluate(() => closeModal());
    // 上の「使える余力」は、銘柄ごとの数字が 0 でも、口座全体の数字を出す。押すと内訳が出る
    const kv = await page.evaluate(() => $('kAv').textContent); ok(!/^\$?0(\.0+)?$/.test(kv.replace(/[¥$,]/g, '').trim() === '0' ? '0' : 'x') && kv !== '—', '上の「使える余力」は、その銘柄の数字が小さくても、口座全体の数字になる', kv);
    await page.click('#kAvBox'); await page.waitForSelector('#modal', { state: 'visible' });
    const bd = await page.textContent('#modal'); ok(/使える余力の内訳/.test(bd) && /出金できる額/.test(bd) && /取引所の数字/.test(bd), '押すと、内訳（口座残高・使用中の証拠金・出金できる額・取引所の数字）が出る', bd.slice(0, 160));
    await page.evaluate(() => closeModal());
    await page.evaluate(() => { S.acct.marginSummary.totalMarginUsed = '1000000000'; S.acct.withdrawable = '0'; S.acctAt = Date.now(); });
    await page.evaluate(() => { S.side = 1; $('submit').click(); }); await page.waitForSelector('#modal', { state: 'visible' });
    t = await page.textContent('#modal');
    ok(/余力/.test(t) && !/口座全体の空き証拠金/.test(t) && await page.isHidden('#mOk'), '口座全体も足りないときは、これまでどおり止める', t.slice(-200));
    await ctx.close(); }
  // ?lang=__proto__ で壊れない
  { const r2 = await L.open(b, { lang: '__proto__', w: 1000, h: 800 }).catch(e => ({ err: e.message }));
    if (r2.page){ await r2.page.waitForTimeout(500); const l = await r2.page.evaluate(() => document.documentElement.lang); ok(['ja','ko','en'].includes(l), '?lang=__proto__ でも、対応する言語に落ち着く', l); await r2.ctx.close(); } else ok(false, '?lang=__proto__ を開けた', r2.err); }
  await b.close();
  const f = results.filter(x => !x).length; console.log(f ? `\n${f} 件失敗` : `\n全部通過 (${results.length})`); process.exit(f ? 1 : 0);
})();
