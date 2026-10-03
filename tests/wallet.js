// ウォレット接続：つなぐ → 署名 → 注文用の鍵を自動で作って登録 → その鍵で注文。署名は画面とは別の実装で検証する
const L = require('./lib'); const fs = require('fs'), path = require('path');
const results = []; const ok = (c, name, extra = '') => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + name + (c ? '' : '  ' + extra)); };
async function run(lang, w = 1440, h = 900){
  console.log(`\n=== wallet (${lang} ${w}) ===`);
  const b = await L.launch();
  // --- A) ふつうの流れ ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true });
    const st = () => page.evaluate(() => JSON.parse(JSON.stringify(__HL_MOCK.state)));
    await page.click('#modeBtn'); await page.waitForSelector('#wlGo');
    ok(await page.isVisible('#wlGo') && !(await page.isVisible('#lvKey')), 'はじめは「ウォレットをつないで鍵を作る」が前に出て、鍵の貼り付け欄は畳まれている');
    await page.fill('#lvPin', '123456'); await page.fill('#lvPin2', '654321'); await page.click('#wlGo');
    ok(/./.test(await page.textContent('#lvMsg')), '暗証番号が2回で違うとエラー', await page.textContent('#lvMsg'));
    await page.fill('#lvPin', '123'); await page.fill('#lvPin2', '123'); await page.click('#wlGo'); await page.waitForTimeout(300);
    ok(/./.test(await page.textContent('#lvMsg')) && (await st()).log.length === 0, '暗証番号が短いと、ウォレットを開く前に止まる', await page.textContent('#lvMsg'));
    await page.fill('#lvPin', '482913'); await page.fill('#lvPin2', '482913'); await page.click('#wlGo');
    await page.waitForSelector('#lvTest', { timeout: 10000 }); await page.waitForTimeout(600);
    const s1 = await st(); const ap = s1.log.filter(x => x.action.type === 'approveAgent');
    ok(ap.length === 1 && ap[0].verdict.ok, 'ウォレットの署名（ApproveAgent）が別の実装でも正しい', JSON.stringify(ap.map(x => x.verdict)));
    const A = ap[0] && ap[0].action;
    ok(A && /^hl-trade-[0-9a-f]{4}$/.test(A.agentName) && A.signatureChainId === '0xa4b1' && A.hyperliquidChain === 'Mainnet', '登録の中身（名前・鎖・ネットワーク）', JSON.stringify(A));
    const saved = await page.evaluate(() => LIVE.saved());
    ok(saved && saved.addr.toLowerCase() === A.agentAddress.toLowerCase(), 'この端末に保存された鍵のアドレスが、登録したものと同じ');
    ok(await page.evaluate(() => S.user.toLowerCase()) === L.WALLET.address.toLowerCase(), '口座のアドレスがウォレットのものになる');
    ok(await page.evaluate(() => LIVE.ready()), '作った鍵はそのまま開いた状態になる');
    await page.waitForFunction(() => /./.test(document.querySelector('#lvChk').textContent) && !document.querySelector('#lvOn').disabled, null, { timeout: 8000 }).catch(() => {});
    ok(!(await page.isDisabled('#lvOn')), '口座に登録された鍵として確認できる', await page.textContent('#lvChk'));
    await page.click('#lvTest'); await page.waitForTimeout(900);
    ok(/✓/.test(await page.textContent('#lvTest')), '作った鍵の署名が取引所に受け付けられる（別の実装で検証）', await page.textContent('#lvTest'));
    await page.click('#lvOn'); await page.click('#lvOn'); await page.evaluate(() => closeModal());
    await page.fill('#sz', '120'); await page.dispatchEvent('#sz', 'input'); await page.click(w < 800 ? '#qL' : '#submit'); await page.waitForSelector('#mOk'); await page.click('#mOk'); await page.waitForTimeout(900);
    const s2 = await st(); const od = s2.log.filter(x => x.action.type === 'order').pop();
    ok(od && od.verdict.ok && od.verdict.addr.toLowerCase() === A.agentAddress.toLowerCase() && od.verdict.addr.toLowerCase() !== L.DEMO_AGENT, '新しく作った鍵で署名した注文が、取引所に受け付けられる', JSON.stringify(od && od.verdict));
    // 保存した鍵は、再読み込みのあとも暗証番号で開ける
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && document.querySelectorAll('#coins button').length > 0); await page.waitForTimeout(1200);
    await page.click('#modeBtn'); await page.waitForSelector('#lvPin'); await page.fill('#lvPin', '482913');
    if (!(await page.isVisible('#lvOpen'))) console.log('   (debug) dialog:', (await page.textContent('#mExtra')).replace(/\s+/g, ' ').slice(0, 200));
    await page.click('#lvOpen'); await page.waitForSelector('#lvTest', { timeout: 8000 });
    ok(await page.evaluate(() => LIVE.ready()), '再読み込みのあとも、暗証番号で鍵を開ける');
    // ウォレットの署名の中身を、公式 SDK との照合用に残す
    const typed = L.TYPED_LOG.filter(j => /ApproveAgent/.test(j)).pop(); if (typed) fs.writeFileSync(path.join(__dirname, 'typed-approveAgent.json'), typed);
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); const miss = await page.evaluate(() => [...I18N_MISSING]); ok(miss.length === 0, '訳文表にないキーなし', miss.join('/'));
    await ctx.close(); }
  // --- B) 署名を拒否したとき ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true, reject: true });
    await page.click('#modeBtn'); await page.waitForSelector('#wlGo'); await page.fill('#lvPin', '482913'); await page.fill('#lvPin2', '482913'); await page.click('#wlGo'); await page.waitForTimeout(900);
    const msg = await page.textContent('#lvMsg');
    ok(/./.test(msg) && !/[぀-ヿ㐀-鿿]/.test(lang === 'ja' ? '' : msg), '署名を取り消すと、やさしい文でわかる', msg);
    ok((await page.evaluate(() => LIVE.saved())) === null, '取り消したときは、鍵を保存しない');
    ok((await page.evaluate(() => __HL_MOCK.state.log.filter(x => x.action.type === 'approveAgent').length)) === 0, '取り消したときは、取引所に何も送らない');
    ok(await page.isEnabled('#wlGo'), 'ボタンがまた押せる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
  // --- C) ウォレットがないとき：案内が出て、鍵を貼り付ける方法は使える ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true, noWallet: true });
    await page.evaluate(() => { delete window.ethereum; });
    await page.click('#modeBtn'); await page.waitForSelector('#wlGo');
    ok(/./.test(await page.textContent('.lv .note.bad')), 'ウォレットが見つからない案内が出る');
    await page.fill('#lvPin', '482913'); await page.fill('#lvPin2', '482913'); await page.click('#wlGo'); await page.waitForTimeout(400);
    ok(/./.test(await page.textContent('#lvMsg')), 'ボタンを押すとエラーの文が出る', await page.textContent('#lvMsg'));
    await page.click('.lv details summary'); await page.fill('#lvKey', '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'); await page.click('#lvSave'); await page.waitForSelector('#lvTest', { timeout: 8000 });
    ok(await page.evaluate(() => LIVE.ready()), '鍵を貼り付ける方法でも保存できる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
  // --- D) 右上の「ウォレット接続」ボタン ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '' }, noSeed: true });
    ok(!(await page.evaluate(() => $('walletBtn').classList.contains('on'))), '最初は「接続」の表示');
    ok(await page.isVisible('#walletBtn'), '右上のボタンが見える');
    const box = await page.evaluate(() => { const r = $('walletBtn').getBoundingClientRect(); return [r.left, r.right, innerWidth]; });
    ok(box[0] >= 0 && box[1] <= box[2], 'ボタンが画面からはみ出さない', box.join(','));
    await page.click('#walletBtn'); await page.waitForSelector('#wpList .wi');
    ok((await page.locator('#wpList .wi').count()) === 1, '入っているウォレットが一覧に出る（1つ）');
    await page.click('#wpList .wi'); await page.waitForTimeout(500);
    const short = L.WALLET.address.slice(0, 6).toLowerCase();
    ok((await page.textContent('#walletBtn')).toLowerCase().includes(short), '押すと短いアドレスの表示に変わる', await page.textContent('#walletBtn'));
    ok((await page.evaluate(() => S.user)).toLowerCase() === L.WALLET.address.toLowerCase(), '口座アドレスが入る');
    ok(/./.test(await page.textContent('#toast, .toast')), '押したあとにお知らせが出る');
    await page.click('#walletBtn'); await page.waitForSelector('#wmOff');
    ok(await page.isVisible('#wmCopy') && await page.isVisible('#wmSwitch') && await page.isVisible('#wmLive'), 'メニューが出る');
    await page.click('#wmOff'); await page.waitForTimeout(400);
    ok((await page.evaluate(() => S.user)) === '', '接続を外すと口座が空になる');
    ok(!(await page.evaluate(() => $('walletBtn').classList.contains('on'))), '表示が「接続」に戻る');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
  // --- E) ウォレットの一覧（EIP-6963）と WalletConnect ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '' }, noSeed: true, noWallet: true, multi: true, wc: true });
    await page.click('#walletBtn'); await page.waitForSelector('#wpList .wi');
    const names = await page.$$eval('#wpList .wi .wn', a => a.map(x => x.textContent));
    ok(names.join('|') === 'Alpha Wallet|Beta Wallet|WalletConnect', 'ウォレット2つと WalletConnect が並ぶ', names.join('|'));
    ok((await page.locator('#wpList .wi img').count()) === 2, 'ウォレットのアイコンが出る');
    const err = await page.evaluate(() => WALLET.connect().then(() => '', e => e.message));
    ok(err.length > 0 && !(await page.evaluate(() => S.user)), 'どれか選ぶ前は、勝手に1つを使わない', err);
    await page.click('#wpList .wi:nth-child(2)'); await page.waitForTimeout(500);
    const BETA = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
    ok((await page.evaluate(() => S.user)).toLowerCase() === BETA, '選んだほう（Beta）の口座になる');
    ok((await page.evaluate(() => __used)).every(x => !x.startsWith('Alpha')), '選ばなかったウォレットには触れない');
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 }); await page.waitForTimeout(900);
    ok((await page.evaluate(() => S.user)).toLowerCase() === BETA, '開き直しても、同じウォレットに自動でつながる');
    await page.click('#walletBtn'); await page.waitForSelector('#wmSwitch');
    ok((await page.textContent('#wmAddr')).toLowerCase() === BETA && /Beta Wallet/.test(await page.textContent('.wm')), 'メニューに口座とウォレット名が出る');
    await page.click('#wmSwitch'); await page.waitForSelector('#wpList .wi'); await page.click('#wpList .wi:nth-child(3)'); await page.waitForTimeout(600);
    ok((await page.evaluate(() => S.user)).toLowerCase() === '0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc', 'WalletConnect で別の口座につながる');
    ok(await page.evaluate(() => window.__wcOpts.projectId === 'test-project' && window.__wcOpts.chains[0] === 42161), 'WalletConnect にプロジェクト ID と Arbitrum を渡す');
    await page.click('#walletBtn'); await page.waitForSelector('#wmOff'); await page.click('#wmOff'); await page.waitForTimeout(400);
    ok((await page.evaluate(() => S.user)) === '' && (await page.evaluate(() => __used)).includes('WC:disconnect'), '接続を外すと WalletConnect も切れる');
    ok((await page.evaluate(() => localStorage.getItem('hlts.wallet'))) === '""', '外したあとは自動でつながない');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
  // --- F) WalletConnect を設定していないときは、出さない ---
  { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '' }, noSeed: true });
    await page.click('#walletBtn'); await page.waitForSelector('#wpList .wi');
    ok(!(await page.$$eval('#wpList .wn', a => a.map(x => x.textContent))).includes('WalletConnect'), 'プロジェクト ID が空なら WalletConnect は出ない');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
  await b.close();
}
(async () => {
  for (const [lang, w, h] of [['en', 1440, 900], ['ko', 390, 844], ['ja', 1440, 900]]) await run(lang, w, h);
  const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
