// 利用規約：同意するまで、ウォレットの接続と本番の設定・注文はできない。同意すると続きが開く。言語ごとに出る。
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [lang, w, h] of [['ja', 1280, 800], ['en', 390, 844], ['ko', 1280, 800]]) {
    console.log(`=== ${lang} ${w}x${h} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', terms: null }, noSeed: true, fee: { addr: '0xfee0fee0fee0fee0fee0fee0fee0fee0fee0fee0', fee: 25 } });
    const V0 = await page.evaluate(() => TERMS.v);
    ok(await page.evaluate(() => needConsent()), '最初は同意していない');
    await page.waitForSelector('#tGo', { timeout: 8000 });
    ok(true, 'はじめて開くと、すぐ規約が出る');
    ok(await page.isHidden('#mClose'), '同意するまで「閉じる」は出ない');
    await page.keyboard.press('Escape'); await page.mouse.click(5, 5); await page.waitForTimeout(200);
    ok(await page.isVisible('#tGo'), 'Escape や外側を押しても閉じない');
    ok(await page.isDisabled('#tGo'), '同意するボタンは、最初は押せない');
    ok((await page.locator('#modal .tc').count()) === 4, 'チェックが4つある');
    const txt = await page.textContent('#modal .box');
    if (lang !== 'ja') ok(!L.KANA_KANJI.test(txt), '日本語の文字が残っていない', (txt.match(L.KANA_KANJI) || [])[0]);
    ok(/0\.025%/.test(txt), '手数料の数字（0.025%）が規約に出る', txt.slice(0, 60));
    ok(await page.evaluate(() => !document.querySelector('#modal details.tfull').open), '全文は畳まれていて、読まなくても進める');
    ok(/Hyperliquid/.test(txt) && (/一切|no liability|어떠한|책임/.test(txt)), '要点に、ツールの提供だけ・責任なし・使えないときの案内が出る');
    const boxes = page.locator('#modal .tc');
    await boxes.nth(0).check(); await boxes.nth(1).check(); await boxes.nth(2).check();
    ok(await page.isDisabled('#tGo'), '3つだけでは、まだ押せない');
    await boxes.nth(3).check();
    ok(await page.isEnabled('#tGo'), '4つ全部で押せるようになる');
    await page.click('#tGo'); await page.waitForTimeout(300);
    ok(await page.isHidden('#modal'), '同意すると、規約が閉じて画面が使える');
    const rec = await page.evaluate(() => JSON.parse(localStorage.getItem('hlts-demo.terms')));
    ok(rec && rec.v === V0 && rec.t > 0 && rec.lang === lang, '同意の記録が残る', JSON.stringify(rec));
    await page.evaluate(() => closeModal());
    // 同意ずみなら、もう出ない（テストの仕掛けが毎回リセットする分を、同意の記録だけ戻す）
    await page.addInitScript(() => { const k = sessionStorage.getItem('keepTerms'); if (k) localStorage.setItem('hlts-demo.terms', k); });
    await page.evaluate(() => sessionStorage.setItem('keepTerms', localStorage.getItem('hlts-demo.terms')));
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 }); await page.waitForTimeout(600);
    ok(!(await page.evaluate(() => needConsent())), '開き直しても同意ずみ');
    ok(await page.isHidden('#modal'), '同意ずみなら、開いても規約は出ない');
    await page.click('#walletBtn'); await page.waitForSelector('#wpList .wi'); ok(true, '同意ずみなら、すぐウォレット選択が開く');
    await page.evaluate(() => closeModal());
    // 規約の版を上げたら、もう一度
    await page.evaluate(() => { TERMS.v = 98; });
    ok(await page.evaluate(() => needConsent()), '規約の版が変わると、もう一度同意が必要');
    await page.click('#modeBtn'); await page.waitForSelector('#tGo'); ok(true, '本番の設定を開くときも、規約が出る');
    await page.evaluate(() => { termsForce = false; });
    await page.evaluate(() => closeModal());
    // 同意なしでは、注文の送信が止まる
    await page.evaluate(() => { TERMS.v = 99; });
    const r = await page.evaluate(() => LIVE.runSteps([{label: 'x', action: {type: 'noop'}}]).then(r => ({ ok: r.ok, row: r.rows.map(x => x.join(' ')).join(' ') })));
    ok(r.ok === false && !/鍵が閉じて|key is locked|키가 닫/.test(r.row) && r.row.length > 0, '同意なしでは、注文の送信が止まる', r.row);
    ok(await page.evaluate(() => __HL_MOCK.state.log.filter(x => x.action.type === 'noop').length) === 0, '取引所には何も送られていない')
    // キーボードだけでは閉じられない（Tab・Enter・Escape を何度押しても）。窓の外にフォーカスが出ない
    { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', terms: null }, noSeed: true });
      await page.waitForSelector('#tGo');
      for (let i = 0; i < 14; i++) await page.keyboard.press('Tab');
      await page.keyboard.press('Enter'); await page.keyboard.press('Escape'); await page.keyboard.press('Enter'); await page.waitForTimeout(300);
      ok(await page.evaluate(() => needConsent() && termsForce) && await page.isVisible('#tGo'), 'Tab・Enter・Escape を押しても、同意なしでは閉じない');
      ok(await page.evaluate(() => !!document.activeElement && !!document.activeElement.closest('#modal')), 'フォーカスは窓の中にとどまる（裏の画面に出ない）');
      ok(await page.evaluate(() => document.getElementById('walletBtn').closest('[inert]') !== null), '裏の画面は操作できない（inert）');
      // 取引所が応答しなくても、規約の窓は出る
      ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
    { const { page, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', terms: null }, noSeed: true, noWait: true, hang: true });
      await page.waitForSelector('#tGo', { timeout: 6000 });
      ok(true, '取引所が応答しなくても（銘柄の読み込みが終わらなくても）、規約の窓が出る'); await ctx.close(); }
    // WalletConnect は、起動のたびには読み込まない（保存ずみのつながりがあっても）
    { const { page, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', wallet: 'walletconnect' }, noSeed: true, wc: true });
      await page.waitForTimeout(1200);
      ok(await page.evaluate(() => typeof window.__wcOpts === 'undefined'), '保存ずみの WalletConnect があっても、起動時に外部のコードを読み込まない');
      ok(await page.evaluate(() => WC.url.includes('@2.25.0')), '読み込む版が固定されている'); await ctx.close(); }
    // 上の帯の「規約」と下のリンク：読むだけ
    ok(await page.isVisible('#pages button[data-p=terms]'), '上の帯に「規約」がある');
    await page.evaluate(v => { TERMS.v = v; }, V0); await page.click('#pages button[data-p=terms]'); await page.waitForSelector('#modal .terms'); ok(await page.locator('#tGo').count() === 0, '上の「規約」から、読むだけの画面が開く'); await page.evaluate(() => closeModal());
    await page.evaluate(v => { TERMS.v = v; }, V0); await page.click('#termsLink'); await page.waitForSelector('#modal .terms');
    ok(await page.locator('#tGo').count() === 0, '同意ずみのときは、読むだけの画面になる');
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
