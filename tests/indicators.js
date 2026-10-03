// 指標（EMA・ボリンジャー・VWAP・RSI・MACD）：計算が正しい／画面に出る／エラーが出ない
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [lang, w, h] of [['ja', 1440, 900], ['en', 390, 844]]) {
    console.log(`=== ${lang} ${w}x${h} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w, h, noSeed: true });
    ok(await page.isVisible('#indBtn'), '「指標」ボタンが見える');
    // 計算の確かめ：独立の書き方で作った値と照合
    const chk = await page.evaluate(() => {
      const a = S.candles, n = a.length, d = IND.calc(a), cl = a.map(k => k.c); const out = {};
      const sma = (i, p) => { let s = 0; for (let j = i - p + 1; j <= i; j++) s += cl[j]; return s / p; };
      // EMA20（最初は単純平均）
      let e = sma(19, 20); for (let i = 20; i < n; i++) e = cl[i] * 2 / 21 + e * 19 / 21; out.ema = [d.e20[n - 1], e];
      const i = n - 1, m = sma(i, 20); let v = 0; for (let j = i - 19; j <= i; j++) v += (cl[j] - m) ** 2; out.bb = [d.bu[i], m + 2 * Math.sqrt(v / 20)];
      // RSI（ウィルダー）
      let g = 0, l = 0; for (let k = 1; k <= 14; k++){ const c = cl[k] - cl[k - 1]; c > 0 ? g += c : l -= c; } g /= 14; l /= 14;
      for (let k = 15; k < n; k++){ const c = cl[k] - cl[k - 1]; g = (g * 13 + Math.max(c, 0)) / 14; l = (l * 13 + Math.max(-c, 0)) / 14; } out.rsi = [d.rsi[n - 1], 100 - 100 / (1 + g / l)];
      // MACD
      const ema = (p) => { let x = sma(p - 1, p); const r = []; r[p - 1] = x; for (let k = p; k < n; k++){ x = cl[k] * 2 / (p + 1) + x * (1 - 2 / (p + 1)); r[k] = x; } return r; };
      const e12 = ema(12), e26 = ema(26); out.macd = [d.ml[n - 1], e12[n - 1] - e26[n - 1]];
      out.n = n; return out;
    });
    for (const k of ['ema', 'bb', 'rsi', 'macd']) ok(Math.abs(chk[k][0] - chk[k][1]) <= 1e-9 * Math.max(1, Math.abs(chk[k][1])), `${k} の計算が一致`, JSON.stringify(chk[k]));
    // 画面：ひとつずつオン
    await page.click('#indBtn'); await page.waitForSelector('.indrow');
    ok((await page.locator('.indrow').count()) === 5, '指標が5つ並ぶ');
    for (const k of ['ema', 'bb', 'vwap', 'rsi', 'macd']) await page.click(`.indrow[data-k=${k}]`);
    ok(await page.evaluate(() => Object.values(S.ind).every(Boolean)), '5つともオンにできる');
    await page.click('#mClose'); await page.waitForTimeout(400);
    const leg = await page.textContent('#legend');
    ok(/EMA20/.test(leg) && /BB/.test(leg) && /VWAP/.test(leg) && /RSI/.test(leg) && /MACD/.test(leg), '凡例に5つの値が出る', leg);
    if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/ind_${lang}_${w}.png` });
    ok(await page.evaluate(() => JSON.parse(localStorage.getItem('hlts.ind')).rsi === true), '選んだ指標を覚えている');
    await page.reload(); await page.waitForFunction(() => window.__HL_MOCK && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 }); await page.waitForTimeout(700);
    ok(await page.evaluate(() => S.ind.macd && S.ind.rsi && document.getElementById('indBtn').classList.contains('sel')), '開き直しても指標が残っている');
    // 足を動かしても、ズームしてもエラーにならない
    await page.mouse.move(300, 300); await page.mouse.wheel(0, -400); await page.waitForTimeout(200);
    await page.click('#ivs button:nth-child(4)').catch(() => {}); await page.waitForTimeout(500);
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
