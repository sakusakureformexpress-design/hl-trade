// 通信の失敗：返事が来ない・429・値段が古い・口座の情報が読めない。どの場合も、画面が固まらず、誤って送らない。
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
const sentN = page => page.evaluate(() => __HL_MOCK.state.log.filter(x => /^(order|cancel|batchModify|updateLeverage|updateIsolatedMargin)$/.test(x.action.type)).length);
(async () => {
  const b = await L.launch();
  const mk = async (lang = 'ja') => { const r = await L.open(b, { lang, w: 1280, h: 900 }); await r.page.evaluate(() => window.__HL_DEMO_READY); await r.page.waitForTimeout(500);
    await r.page.evaluate(async () => { await LIVE.unlock(__HL_MOCK.DEMO_PIN); LIVE.setLive(true); }); return r; };
  // 1) info：429 が続いたら、undefined を返さず例外にする
  { const { page, ctx } = await mk();
    const r = await page.evaluate(async () => { const orig = window.fetch; window.fetch = async () => new Response('', { status: 429 }); const t0 = Date.now(); try { const v = await info({ type: 'meta' }, 2); return { v: String(v), ms: Date.now() - t0 }; } catch (e) { return { err: e.message, ms: Date.now() - t0 }; } finally { window.fetch = orig; } });
    ok(r.err === 'HTTP 429', '429 が続くと、例外になる（undefined を返さない）', JSON.stringify(r)); await ctx.close(); }
  // 2) 注文の送信：返事が来ないとき、時間切れで「結果不明」と出て、窓が元に戻る（もう一度操作できる）
  { const { page, ctx } = await mk();
    await page.evaluate(() => { window.__origFetch = window.fetch; window.fetch = (u, o) => { if (/\/exchange$/.test(String(u))) return new Promise((_, rej) => { o.signal.addEventListener('abort', () => { const e = new Error('aborted'); e.name = 'AbortError'; rej(e); }); }); return window.__origFetch(u, o); }; });
    await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
    // 15秒待つのは長いので、時間切れの長さを一時的に縮める
    await page.evaluate(() => { const f = window.fetchT; window.fetchT = (u, i, ms) => f(u, i, /exchange/.test(u) ? 800 : ms); });
    await page.click('#mOk'); await page.waitForTimeout(400);
    ok(await page.isDisabled('#mOk'), '送信中は、ボタンが押せない');
    await page.keyboard.press('Escape'); ok(await page.isVisible('#modal'), '送信中は、Escape でも窓が閉じない');
    await page.waitForTimeout(1500);
    const txt = await page.textContent('#mBody');
    ok(/時間切れ|timed out|시간 초과/.test(txt), '返事がないと、「時間切れ・結果不明」と出る', txt.slice(0, 120));
    ok(await page.isEnabled('#mClose'), '終わったあとは、閉じるボタンが使える');
    await page.click('#mClose'); await page.waitForTimeout(200);
    await page.evaluate(() => { window.fetch = window.__origFetch; });
    await page.evaluate(() => document.querySelector('#aTbl [data-act=close]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
    ok(await page.isEnabled('#mOk'), '次の確認画面の「注文する」は、ちゃんと押せる'); await ctx.close(); }
  // 3) 最新の値段が取れないと、送らない
  { const { page, ctx } = await mk();
    await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
    await page.evaluate(() => { window.__origFetch = window.fetch; window.fetchT = async (u, i, ms) => { if (i && i.body && /allMids/.test(i.body)) throw new Error('down'); return window.__origFetch(u, i); }; });
    const before = await sentN(page);
    await page.click('#mOk'); await page.waitForTimeout(600);
    ok((await sentN(page)) === before, '最新の値段を取れないときは、何も送らない');
    ok(/値段|price|가격/.test(await page.textContent('#mBody')), '理由が出る'); await ctx.close(); }
  // 4) 送る直前に、値段を取り直す（切断中の古い値段のまま、上限価格を作らない）
  { const { page, ctx } = await mk();
    await page.evaluate(() => { __HL_MOCK.setPx('BTC', 1.2); S.mids.BTC = 1; });   // 画面の値段は古い（1）。取引所の値段は +20%
    await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
    await page.click('#mOk'); await page.waitForTimeout(800);
    const px = await page.evaluate(() => { const o = __HL_MOCK.state.log.filter(x => x.action.type === 'order').pop(); return o ? +o.action.orders[0].p : null; });
    const mark = await page.evaluate(() => __HL_MOCK.mark('BTC'));
    ok(px && Math.abs(px / mark - 0.98) < 0.03 || Math.abs(px / mark - 1.02) < 0.03, '送った上限価格は、最新の値段の近く（古い値段 1 ではない）', JSON.stringify({ px, mark })); await ctx.close(); }
  // 5) 口座の情報が古い・読めないとき、本番の注文は出せない
  { const { page, ctx } = await mk();
    await page.evaluate(() => { S.acctAt = Date.now() - 120000; });
    await page.evaluate(() => document.querySelector('#aTbl [data-act=half]').click()); await page.waitForSelector('#mOk', { state: 'visible' });
    const before = await sentN(page);
    await page.click('#mOk'); await page.waitForTimeout(600);
    ok((await sentN(page)) === before && /古い|outdated|오래/.test(await page.textContent('#mBody')), '口座の情報が古いときは、送らない（理由が出る）'); await ctx.close(); }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
