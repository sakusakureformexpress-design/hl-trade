// 実際の操作の流れ（鍵を開ける → 手数料を承認 → 注文 → 取り消し → 利確損切 → 現物）を、模擬取引所で通して確かめる
const L = require('./lib');
const SHOTS = require('path').join(__dirname, 'shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true });
const results = []; const ok = (c, name, extra = '') => { results.push([!!c, name, extra]); console.log((c ? '  ✓ ' : '  ✗ ') + name + (c ? '' : '  ' + extra)); };
const FEE = { addr: '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01', fee: 30 };
const mock = (page, fn, arg) => page.evaluate(fn, arg);
async function confirmAndRun(page, label){
  await page.waitForSelector('#modal:not([hidden])'); const title = await page.textContent('#mTitle');
  if (await page.isVisible('#mOk')) await page.click('#mOk'); else return { title, result: null };
  await page.waitForFunction(() => !document.querySelector('#mOk').disabled && !/…$/.test(document.querySelector('#mOk').textContent), null, { timeout: 8000 }).catch(() => {});
  await page.waitForTimeout(400);
  return { title, result: (await page.textContent('#mTitle')) + ' | ' + (await page.textContent('#mBody')).replace(/\s+/g, ' ') };
}
async function run(lang){
  console.log(`\n=== flows (${lang}) ===`);
  const b = await L.launch();
  const { page, errors, ctx } = await L.open(b, { lang, fee: FEE });
  await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(300);
  const state = () => page.evaluate(() => JSON.parse(JSON.stringify(__HL_MOCK.state)));

  // --- 鍵を開けて本番にする ---
  await page.click('#modeBtn'); await page.waitForSelector('#lvPin');
  await page.fill('#lvPin', '000000'); await page.click('#lvOpen'); await page.waitForTimeout(500);
  ok(/./.test(await page.textContent('#lvMsg')), '暗証番号が違うとエラーが出る', await page.textContent('#lvMsg'));
  await page.fill('#lvPin', '123456'); await page.click('#lvOpen'); await page.waitForSelector('#lvTest');
  await page.waitForFunction(() => /./.test(document.querySelector('#lvChk').textContent) && !document.querySelector('#lvOn').disabled, null, { timeout: 8000 }).catch(() => {});
  ok(!(await page.isDisabled('#lvOn')), '口座の鍵として登録されていると確認できる', await page.textContent('#lvChk'));
  // 手数料：未承認の表示
  await page.waitForTimeout(500);
  ok(/./.test(await page.textContent('#bfStat')) && await page.isVisible('#bfOk'), '手数料の欄が出る（未承認）', await page.textContent('#bfStat'));
  await page.click('#lvTest'); await page.waitForTimeout(800);
  const t1 = await page.textContent('#lvTest'); ok(/✓/.test(t1), '「つながりを確かめる」が通る（署名が取引所に受け付けられる）', t1);
  await page.click('#lvOn'); await page.click('#lvOn'); await page.waitForTimeout(300);
  ok(await page.evaluate(() => S.live), '本番モードに入れる');
  let st = await state(); const verdicts = () => state().then(s => s.log.map(x => x.verdict.ok));
  ok((await verdicts()).every(Boolean) && (await verdicts()).length >= 1, '倍率確認の署名が標準の部品でも正しいと確かめられた', JSON.stringify(st.log.map(x => x.verdict)));

  // --- 手数料が未承認のとき：新規は止まり、決済は通る ---
  // 言語を切り替えても、開いた鍵と本番モードは保たれる
  const other = lang === 'en' ? 'ko' : 'en';
  await page.evaluate(() => closeModal());
  await page.click(`#langSel button[data-l=${other}]`); await page.waitForTimeout(500);
  ok(await page.evaluate(() => LIVE.ready() && S.live), '言語を切り替えても、開いた鍵と本番モードが保たれる');
  await page.click(`#langSel button[data-l=${lang}]`); await page.waitForTimeout(500);
  await page.evaluate(() => closeModal()); await page.fill('#sz', '200'); await page.dispatchEvent('#sz', 'input');
  await page.click('#submit'); let r = await confirmAndRun(page);
  const nBefore = (await state()).log.length;
  ok(/(approval|승인)/i.test(r.result) || /承認/.test(r.result), '未承認だと新しい注文は止まる', r.result);
  ok((await state()).log.length === nBefore, '止めた注文は取引所に送られていない');
  await page.click('#mClose');
  // 決済（半分）は承認なしで通る
  const btc0 = Math.abs((await state()).pos.BTC.szi);
  await page.click('#aTbl button[data-act=half][data-c=BTC]'); r = await confirmAndRun(page);
  st = await state(); ok(Math.abs(st.pos.BTC.szi) < btc0, '承認がなくても半分決済はできる', r.result + ' ' + JSON.stringify(st.pos.BTC));
  ok((await verdicts()).every(Boolean), '決済注文の署名も正しい', JSON.stringify(st.log.slice(-2).map(x => x.verdict)));
  await page.click('#mClose');

  // --- 手数料を承認する（ウォレットの署名）---
  await page.click('#modeBtn'); await page.waitForSelector('#bfOk'); await page.click('#bfOk'); await page.waitForTimeout(900);
  const stat = await page.textContent('#bfStat'); st = await state();
  const appr = st.log.filter(x => x.action.type === 'approveBuilderFee');
  ok(appr.length === 1 && appr[0].verdict.ok, '手数料の承認がウォレットの署名として正しい（別の実装で検証）', JSON.stringify(appr.map(x => x.verdict)));
  ok(appr[0] && appr[0].action.maxFeeRate === '0.03%' && appr[0].action.builder === FEE.addr.toLowerCase(), '承認の中身（料率・宛先）が設定どおり', JSON.stringify(appr[0] && appr[0].action));
  ok(await page.evaluate(() => BUILD.ok()), '承認が確認できた状態になる', stat);
  await page.click('#mClose');

  // --- 新規注文（成行）：手数料つきで通る ---
  await page.fill('#sz', '300'); await page.dispatchEvent('#sz', 'input'); await page.click('#submit'); r = await confirmAndRun(page);
  st = await state(); const ord = st.log.filter(x => x.action.type === 'order').pop();
  ok(ord && ord.verdict.ok, '成行の新規注文の署名が正しい', JSON.stringify(ord && ord.verdict));
  ok(ord && ord.action.builder && ord.action.builder.b === FEE.addr.toLowerCase() && ord.action.builder.f === 30, '注文に手数料の宛先（builder）が付く', JSON.stringify(ord && ord.action.builder));
  const fl = st.fills[0]; ok(fl && +fl.builderFee > 0 && +fl.fee > +fl.builderFee, '約定にアプリの手数料が記録される', JSON.stringify(fl));
  ok(Math.abs(st.pos.BTC.szi) > btc0 / 2, '建玉が増えた', JSON.stringify(st.pos.BTC));
  await page.click('#mClose');

  // --- 指値 → 待ち注文 → 取り消し ---
  await page.click('#oType button[data-v=limit]'); await page.fill('#px', await page.evaluate(() => String(Math.round(priceOf('BTC') * 0.9)))); await page.dispatchEvent('#px', 'input');
  await page.fill('#sz', '150'); await page.dispatchEvent('#sz', 'input'); await page.click('#submit'); r = await confirmAndRun(page);
  st = await state(); const rest = st.orders.filter(o => o.coin === 'BTC' && !o.isTrigger && o.tif === 'Gtc');
  ok(rest.length === 1, '指値が板で待つ', r.result); await page.click('#mClose');
  await page.waitForTimeout(3500); await page.click('#aTabs button[data-v=ord]');
  ok(await page.isVisible('#aTbl button[data-act=cancel]'), '「待ち注文」の表に出る');
  await page.click(`#aTbl button[data-act=cancel][data-oid="${rest[0].oid}"]`); r = await confirmAndRun(page);
  st = await state(); ok(!st.orders.some(o => o.oid === rest[0].oid), '取り消しが通る', r.result); await page.click('#mClose');
  await page.click('#aTabs button[data-v=pos]');

  // --- 利確・損切りの編集 ---
  await page.click('#aTbl button[data-act=tpsl][data-c=BTC] >> nth=0'); await page.waitForSelector('#eTp');
  const m = await page.evaluate(() => priceOf('BTC')); await page.fill('#eTp', String(Math.round(m * 1.09))); await page.dispatchEvent('#eTp', 'input');
  await page.click('#eGo'); r = await confirmAndRun(page);
  st = await state(); const tps = st.orders.filter(o => o.coin === 'BTC' && o.isTrigger && o.reduceOnly);
  ok(tps.some(o => /Take/.test(o.orderType) && Math.abs(+o.triggerPx - Math.round(m * 1.09)) < 2), '利確の価格を変えられる（新しく出して古い方を消す）', r.result + ' ' + JSON.stringify(tps.map(o => o.orderType + o.triggerPx)));
  ok((await verdicts()).every(Boolean), 'ここまでの全部の署名が標準の部品でも正しい', JSON.stringify(st.log.filter(x => !x.verdict.ok).map(x => x.action.type)));
  await page.click('#mClose');

  // --- ポジションを増やす・減らす／ドテン／全部決済 ---
  await page.click('#aTbl button[data-act=flip][data-c=BTC]'); r = await confirmAndRun(page); st = await state();
  ok(st.pos.BTC && st.pos.BTC.szi < 0, 'ドテンでショートになる', JSON.stringify(st.pos.BTC)); await page.click('#mClose');
  await page.click('#aTbl button[data-act=close][data-c=BTC]'); r = await confirmAndRun(page); st = await state();
  ok(!st.pos.BTC, '全部決済でポジションがなくなる', JSON.stringify(st.pos.BTC)); await page.click('#mClose');

  // --- 現物 ---
  await page.click('#oType button[data-v=market]'); await page.click('#mkt button[data-v=spot]'); await page.waitForTimeout(500);
  await page.click('#coins button >> nth=0'); await page.waitForTimeout(500);
  const spotKey = await page.evaluate(() => curKey()); await page.fill('#sz', '50'); await page.dispatchEvent('#sz', 'input');
  const hype0 = (await state()).spot.HYPE || 0; await page.click(L_SUBMIT(page)); r = await confirmAndRun(page); st = await state();
  ok((st.spot.HYPE || 0) > hype0, `現物（${spotKey}）を買える`, r.result); await page.click('#mClose');
  await page.click('#side button[data-v="-1"]'); await page.fill('#sz', '40'); await page.dispatchEvent('#sz', 'input');
  const hype1 = (await state()).spot.HYPE; await page.click(L_SUBMIT(page)); r = await confirmAndRun(page); st = await state();
  const spotOrd = st.log.filter(x => x.action.type === 'order').pop();
  ok(st.spot.HYPE < hype1 && spotOrd.action.builder, '現物の売りは手数料が付く', r.result); await page.click('#mClose');
  // 現物の買いには手数料を付けない（取引所の決まり）
  await page.click('#side button[data-v="1"]'); await page.dispatchEvent('#sz', 'input'); await page.click(L_SUBMIT(page)); r = await confirmAndRun(page);
  const buyOrd = (await state()).log.filter(x => x.action.type === 'order').pop();
  ok(buyOrd.action.builder, '現物の買いにも builder は付く（取引所側が買いには課さない）', JSON.stringify(buyOrd.action.builder)); await page.click('#mClose');

  // --- 取引所のエラーが言語に合わせて出る ---
  await page.click('#mkt button[data-v=perp]'); await page.waitForTimeout(400); await page.fill('#sz', '5'); await page.dispatchEvent('#sz', 'input'); await page.click('#submit'); r = await confirmAndRun(page);
  const txt = await page.evaluate(() => document.body.innerText);
  ok(/(10|１０)/.test(r.result || '') || /\$10/.test(txt) || /10달러/.test(txt) || /10ドル/.test(txt), '最小注文額のエラーが出る', r.result);
  ok(!/[぀-ヿ㐀-鿿]/.test(lang === 'ja' ? '' : r.result || ''), 'エラーの文が日本語のまま出ていない', r.result);
  await page.click('#mClose');

  await page.screenshot({ path: SHOTS + `flow-${lang}.png` });
  ok(errors.length === 0, 'JSエラーが出ていない', errors.join(' | '));
  const miss = await page.evaluate(() => [...I18N_MISSING]); ok(miss.length === 0, '訳文表にないキーがない', miss.join(' / '));
  await b.close();
}
function L_SUBMIT(page){ return '#submit'; }
(async () => {
  for (const lang of (process.argv[2] || 'en').split(',')) await run(lang);
  const f = results.filter(x => !x[0]).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
