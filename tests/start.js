// はじめの3ステップの帯・「？」ボタン・「縦自動」の色
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [lang, w, h] of [['ja', 1280, 800], ['en', 390, 844], ['ko', 1280, 800]]) {
    console.log(`=== ${lang} ${w}x${h} ===`);
    // まだ何もしていない人
    { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { addr: '', startOff: false, firstLive: false }, noSeed: true });
      ok(await page.isVisible('#startBar'), 'はじめの3ステップの帯が出る');
      ok((await page.locator('#startBar .st').count()) === 3 && (await page.locator('#startBar .st.done').count()) === 0, '3つとも、まだ終わっていない');
      ok(await page.evaluate(() => document.querySelector('#startBar .st').classList.contains('next')), '最初のステップが「次にやること」になる');
      const t = await page.textContent('#startBar'); if (lang !== 'ja') ok(!L.KANA_KANJI.test(t), '日本語が残っていない', t);
      await page.click('#startBar .st >> nth=0'); await page.waitForSelector('#wpList .wi'); ok(true, '1つ目を押すと、ウォレット選択が開く');
      await page.click('#wpList .wi'); await page.waitForTimeout(500);
      ok(await page.evaluate(() => document.querySelectorAll('#startBar .st.done').length) === 1, 'ウォレットをつなぐと、1つ目に ✔ が付く');
      ok(await page.evaluate(() => document.querySelectorAll('#startBar .st')[1].classList.contains('next')), '次は2つ目が「次にやること」');
      await page.click('#startBar .st >> nth=1'); await page.waitForSelector('#wlGo'); ok(true, '2つ目を押すと、鍵を作る画面が開く'); await page.evaluate(() => closeModal());
      await page.click('#startX'); ok(await page.isHidden('#startBar'), '×で消える');
      await page.evaluate(() => renderStart()); ok(await page.isHidden('#startBar'), '消したあとは、また出てこない');
      ok(errors.length === 0, 'JSエラーなし', errors.join(' | ')); await ctx.close(); }
    // ぜんぶ終わった人（デモは、鍵が入っている）
    { const { page, errors, ctx } = await L.open(b, { lang, w, h, ls: { startOff: false, firstLive: true } });
      await page.evaluate(() => window.__HL_DEMO_READY); await page.waitForTimeout(3500);
      ok(await page.evaluate(() => hasUser() && !!LIVE.saved()), '準備ずみ');
      ok(await page.isHidden('#startBar'), '3つ終わると、帯は出ない');
      await ctx.close(); }
    // 「？」ボタン
    { const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true });
      ok((await page.locator('.qh:visible').count()) >= 2, '「？」ボタンが出ている');
      await page.locator('#ticket .qh').first().scrollIntoViewIfNeeded(); await page.click('#ticket .qh');
      await page.waitForSelector('#vHelp .guide'); ok(await page.evaluate(() => S.page === 'help' && document.querySelector('#vHelp h2[id]').id === 'g4'), '注文の「？」で、使い方の「注文の出し方」が開く');
      await page.click('#pages button[data-p=trade]'); await page.waitForTimeout(300);
      await page.locator('#chartBox .qh').first().scrollIntoViewIfNeeded(); await page.click('#chartBox .qh');
      ok(await page.evaluate(() => document.querySelector('#vHelp h2[id]').id === 'g5'), 'チャートの「？」で、「チャート」が開く');
      ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
      ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし'); await ctx.close(); }
    // 縦自動の色：自動のときは目立たない／手で変えると黄色
    { const { page, ctx } = await L.open(b, { lang, w, h, noSeed: true });
      const col = () => page.evaluate(() => { const e = document.getElementById('zAuto'), c = getComputedStyle(e); return { sel: e.classList.contains('sel'), color: c.color, border: c.borderTopColor }; });
      const acc = await page.evaluate(() => { const d = document.createElement('i'); d.style.color = 'var(--accent)'; document.body.appendChild(d); const v = getComputedStyle(d).color; d.remove(); return v; });
      const a = await col(); ok(a.sel && a.color !== acc, '自動のときは、黄色にならない', JSON.stringify([a, acc]));
      await page.evaluate(() => document.getElementById('chartBox').scrollIntoView());
      const r = await page.evaluate(() => { const r = document.getElementById('chart').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
      await page.mouse.move(r[0] + r[2] - 20, r[1] + 70); await page.mouse.down(); await page.mouse.move(r[0] + r[2] - 20, r[1] + 130, { steps: 5 }); await page.mouse.up(); await page.waitForTimeout(200);
      const m = await col(); ok(!m.sel && m.color === acc, '縦の縮尺を手で変えると、黄色になる', JSON.stringify([m, acc]));
      await page.click('#zAuto'); await page.waitForTimeout(200); const c = await col(); ok(c.sel && c.color !== acc, '押すと自動に戻り、黄色が消える');
      await ctx.close(); }
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
