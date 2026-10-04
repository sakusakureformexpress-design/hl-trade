// 口座と鍵の対応：口座が変わるすべての経路で、本番を止める。確認画面を開いたあとで状態が変わったら、送らない。
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
const OTHER = '0x2222222222222222222222222222222222222222';
const sent = page => page.evaluate(() => __HL_MOCK.state.log.filter(x => /^(order|cancel|batchModify|updateLeverage|updateIsolatedMargin)$/.test(x.action.type)).length);
(async () => {
  const b = await L.launch();
  for (const lang of ['ja', 'en']) {
    console.log(`=== ${lang} ===`);
    const mk = async (o = {}) => { const r = await L.open(b, { lang, w: 1280, h: 900, ...o }); await r.page.evaluate(() => window.__HL_DEMO_READY); await r.page.waitForTimeout(300); return r; };
    const live = async page => { await page.evaluate(async () => { await LIVE.unlock(__HL_MOCK.DEMO_PIN); LIVE.setLive(true); }); };
    // 1) setUser で別の口座にすると、本番が止まり、鍵が閉じる
    { const { page, errors, ctx } = await mk(); await live(page);
      ok(await page.evaluate(() => LIVE.ready() && S.live), '鍵を開けて本番にできる（口座が鍵の持ち主と同じ）');
      await page.evaluate(o => setUser(o), OTHER); await page.waitForTimeout(200);
      ok(await page.evaluate(() => !LIVE.ready() && !LIVE.hasKey() && !S.live), '別の口座にすると、本番が止まり、鍵が閉じる');
      ok(/./.test(await page.textContent('#toasts')), '止めたことを知らせるお知らせが出る');
      const r = await page.evaluate(() => LIVE.runSteps([{label: 'x', action: HLX.lev('SOL', 5, true)}]).then(r => r.ok));
      ok(r === false && (await sent(page)) === 0, '鍵が閉じているので、何も送られない');
      await page.evaluate(() => setUser(__HL_MOCK.USER)); await page.waitForTimeout(100);
      ok(await page.evaluate(() => !LIVE.hasKey() && !S.live), '元の口座に戻しても、自動では開かない（暗証番号が要る）');
      ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
    // 2) 鍵を開けたまま、口座の食い違いのまま送ろうとしても、send が止める
    { const { page, ctx } = await mk(); await live(page);
      const r = await page.evaluate(async o => { S.user = o; return LIVE.runSteps([{label: 'x', action: HLX.lev('SOL', 5, true)}]).then(r => ({ ok: r.ok, rows: r.rows.map(x => x[1]).join(' ') })); }, OTHER);
      ok(r.ok === false && (await sent(page)) === 0, 'S.user だけ書き換えても、send が口座の違いで止める（何も送られない）', JSON.stringify(r));
      await ctx.close(); }
    // 3) 確認画面を開いたまま口座が変わったら、確認画面は閉じる。送られない
    { const { page, ctx } = await mk(); await live(page);
      await page.evaluate(() => document.querySelector('#aTbl [data-act=close]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
      ok(await page.isVisible('#modal .box') && /./.test(await page.textContent('#mBody')), '全部決済の確認画面が開く');
      ok(/0x/.test(await page.textContent('#mBody')), '本番の確認画面に「注文する口座」が出る');
      await page.evaluate(o => setUser(o), OTHER); await page.waitForTimeout(200);
      ok(await page.isHidden('#modal'), '口座が変わると、開いていた確認画面は閉じる');
      ok((await sent(page)) === 0, '何も送られていない'); await ctx.close(); }
    // 4) 確認画面を開いたあとでポジションが変わったら、送らない
    { const { page, ctx } = await mk(); await live(page);
      await page.evaluate(() => document.querySelector('#aTbl [data-act=flip]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
      await page.evaluate(() => { const p = S.acct.assetPositions.find(x => x.position.coin === 'BTC'); p.position.szi = String(-0.2); });
      await page.click('#mOk'); await page.waitForTimeout(500);
      ok((await sent(page)) === 0, 'ポジションが変わったあとは、ドテンを送らない');
      ok(/./.test(await page.textContent('#mBody')), '理由が出る', await page.textContent('#mBody')); await ctx.close(); }
    { const { page, ctx } = await mk(); await live(page);
      await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
      await page.evaluate(() => { const p = S.acct.assetPositions.find(x => x.position.coin === 'BTC'); p.position.szi = String(1); });
      await page.click('#mOk'); await page.waitForTimeout(500);
      ok((await sent(page)) === 0, 'ポジションが変わったあとは、半分決済を送らない'); await ctx.close(); }
    // 5) 変わっていなければ、ちゃんと送れる（回帰）
    { const { page, ctx } = await mk(); await live(page);
      await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
      await page.click('#mOk'); await page.waitForTimeout(700);
      ok((await sent(page)) >= 1, '何も変わっていなければ、半分決済は送られる'); await ctx.close(); }
    // 6) 古い形式の鍵（持ち主の口座なし）：いまの口座に登録された鍵と確かめられたとき、口座に紐づけ直す
    { const { page, ctx } = await mk(); 
      await page.evaluate(() => { const sv = JSON.parse(localStorage.getItem('hlts-demo.agentKey')); delete sv.owner; sv.v = 1; localStorage.setItem('hlts-demo.agentKey', JSON.stringify(sv)); });
      await page.evaluate(() => LIVE.unlock(__HL_MOCK.DEMO_PIN));
      ok(await page.evaluate(() => LIVE.ready() && LIVE.owner() === S.user.toLowerCase()), '古い形式の鍵は、いまの口座に登録されていれば、その口座に紐づく');
      ok(await page.evaluate(() => { const sv = LIVE.saved(); return sv.v === 2 && sv.owner === S.user.toLowerCase(); }), '保存し直されて、持ち主の口座が入る');
      await ctx.close(); }
    // 7) accountsChanged の [] や別アドレスでも本番が止まる（ウォレットの切り替え）
    { const { page, ctx } = await mk({ multi: true }); await live(page);
      await page.evaluate(() => setUser('')); await page.waitForTimeout(100);
      ok(await page.evaluate(() => !LIVE.hasKey() && !S.live), '口座が空になっても、本番が止まる');
      await ctx.close(); }
    // 8) 不正なアドレスは、口座にしない
    { const { page, ctx } = await mk();
      const before = await page.evaluate(() => S.user);
      await page.evaluate(() => setUser('0xzz')); ok(await page.evaluate(b => S.user === b, before), '不正なアドレスは受け付けない');
      await ctx.close(); }
    // 9) 手数料が未承認のとき、倍率の変更も含めて、1通も送らない
    { const { page, ctx } = await mk({ fee: { addr: '0xfee0fee0fee0fee0fee0fee0fee0fee0fee0fee0', fee: 25 } }); await live(page);
      const r = await page.evaluate(() => LIVE.runSteps([{label: 'lev', action: HLX.lev('SOL', 7, false)}, {label: 'ord', action: HLX.orders([HLX.market('SOL', true, 0.1, false)])}]).then(r => r.ok));
      ok(r === false && (await sent(page)) === 0, '承認がないとき、倍率の変更も送られない（1通も送らない）');
      await ctx.close(); }
    // 10) 保存した鍵を貼り付けるときは、いまの口座に登録された鍵だけを保存する
    { const { page, ctx } = await mk({ noSeed: true });
      const r = await page.evaluate(async () => { try { await LIVE.save(__HL_MOCK.AGENT_KEY, '482913'); return {ok: true, owner: LIVE.saved().owner, me: S.user.toLowerCase()}; } catch (e) { return {ok: false, m: e.message}; } });
      ok(r.ok && r.owner === r.me, '貼り付けた鍵は、いまの口座に登録されていれば、口座に紐づけて保存される', JSON.stringify(r));
      await ctx.close(); }
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
