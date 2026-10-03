// 利用規約：同意するまで、ウォレットの接続と本番の設定・注文はできない。同意すると続きが開く。言語ごとに出る。
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [lang, w, h] of [['ja', 1280, 800], ['en', 390, 844], ['ko', 1280, 800]]) {
    console.log(`=== ${lang} ${w}x${h} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', terms: null }, noSeed: true, fee: { addr: '0xfee0fee0fee0fee0fee0fee0fee0fee0fee0fee0', fee: 25 } });
    ok(await page.evaluate(() => needConsent()), '最初は同意していない');
    // 画面を見るだけなら、同意なしで使える
    await page.evaluate(() => setPage('list')); await page.waitForTimeout(300);
    ok(await page.isHidden('#modal'), '画面を見るだけなら、規約は出ない');
    await page.evaluate(() => setPage('trade'));
    // ウォレット接続 → 規約
    await page.click('#walletBtn'); await page.waitForSelector('#tGo');
    ok(await page.isDisabled('#tGo'), '同意するボタンは、最初は押せない');
    ok((await page.locator('#modal .tc').count()) === 3, 'チェックが3つある');
    const txt = await page.textContent('#modal .box');
    if (lang !== 'ja') ok(!L.KANA_KANJI.test(txt), '日本語の文字が残っていない', (txt.match(L.KANA_KANJI) || [])[0]);
    ok(/0\.025%/.test(txt), '手数料の数字（0.025%）が規約に出る', txt.slice(0, 60));
    ok(await page.evaluate(() => document.querySelector('#modal .terms').scrollHeight > 0), '規約の本文が出る');
    const boxes = page.locator('#modal .tc');
    await boxes.nth(0).check(); await boxes.nth(1).check();
    ok(await page.isDisabled('#tGo'), '2つだけでは、まだ押せない');
    await boxes.nth(2).check();
    ok(await page.isEnabled('#tGo'), '3つ全部で押せるようになる');
    await page.click('#tGo'); await page.waitForSelector('#wpList .wi');
    ok(true, '同意すると、続きのウォレット選択が開く');
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('hlts.terms')));
    ok(rec && rec.v === 1 && rec.t > 0 && rec.lang === lang, '同意の記録が残る', JSON.stringify(rec));
    await page.evaluate(() => closeModal());
    // 同意ずみなら、もう出ない（テストの仕掛けが毎回リセットする分を、同意の記録だけ戻す）
    await page.addInitScript(() => { const k = sessionStorage.getItem('keepTerms'); if (k) localStorage.setItem('hlts.terms', k); });
    await page.evaluate(() => sessionStorage.setItem('keepTerms', localStorage.getItem('hlts.terms')));
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 }); await page.waitForTimeout(600);
    ok(!(await page.evaluate(() => needConsent())), '開き直しても同意ずみ');
    await page.click('#walletBtn'); await page.waitForSelector('#wpList .wi'); ok(true, '同意ずみなら、すぐウォレット選択が開く');
    await page.evaluate(() => closeModal());
    // 規約の版を上げたら、もう一度
    await page.evaluate(() => { TERMS.v = 2; });
    ok(await page.evaluate(() => needConsent()), '規約の版が変わると、もう一度同意が必要');
    await page.click('#modeBtn'); await page.waitForSelector('#tGo'); ok(true, '本番の設定を開くときも、規約が出る');
    await page.evaluate(() => closeModal());
    // 同意なしでは、注文の送信が止まる
    await page.evaluate(() => { TERMS.v = 3; });
    const r = await page.evaluate(() => LIVE.runSteps([{label: 'x', action: {type: 'noop'}}]).then(r => ({ ok: r.ok, row: r.rows.map(x => x.join(' ')).join(' ') })));
    ok(r.ok === false && !/鍵が閉じて|key is locked|키가 닫/.test(r.row) && r.row.length > 0, '同意なしでは、注文の送信が止まる', r.row);
    ok(await page.evaluate(() => __HL_MOCK.state.log.filter(x => x.action.type === 'noop').length) === 0, '取引所には何も送られていない')
    // 下の「利用規約」リンク：読むだけ
    await page.evaluate(() => { TERMS.v = 1; }); await page.click('#termsLink'); await page.waitForSelector('#modal .terms');
    ok(await page.locator('#tGo').count() === 0, '同意ずみのときは、読むだけの画面になる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
