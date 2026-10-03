// ロングを持ったままショートする（ドテン）：内訳と、必要な証拠金が「新しく建てる分だけ」になる
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const lang of ['ja', 'en', 'ko']) {
    console.log(`=== ${lang} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w: 1440, h: 900, noSeed: true });
    const pos = await page.evaluate(() => { const p = posOf('BTC'); return p ? { szi: +p.szi } : null; });
    ok(pos && pos.szi > 0, 'デモに BTC のロングがある', JSON.stringify(pos));
    // 持っている分より大きいショート
    const r = await page.evaluate(() => { S.side = -1; S.unit = 'usd'; $('sz').value = 10000; renderTicket(); const c = orderCalc(), px = c.px, lev = c.lev; return { c, calc: $('calc').textContent, px, lev }; });
    ok(Math.abs(r.c.closeSz - pos.szi) < 1e-9, '決済の枚数は、いまのロングと同じ', JSON.stringify([r.c.closeSz, pos.szi]));
    ok(Math.abs(r.c.openSz - (r.c.sz - pos.szi)) < 1e-6 && r.c.openSz > 0, '残りが新しいショートになる', JSON.stringify([r.c.sz, r.c.openSz]));
    ok(Math.abs(r.c.margin - r.c.openSz * r.px / r.lev) < 1e-6, '必要な証拠金は、新しく建てる分だけで計算する', JSON.stringify([r.c.margin, r.c.openSz * r.px / r.lev]));
    ok(r.c.margin < r.c.ntl / r.lev, '全額で計算するより小さい');
    ok(/内訳|Breakdown|내역/.test(r.calc) && /新しく|open new|새로/.test(r.calc), '画面に内訳が出る', r.calc);
    // 決済だけ（持っている分より小さい）
    const r2 = await page.evaluate(() => { S.side = -1; $('sz').value = 1000; renderTicket(); const c = orderCalc(); return { c, calc: $('calc').textContent }; });
    ok(r2.c.openSz === 0 && r2.c.margin === 0, '小さいショートは決済だけで、証拠金は0', JSON.stringify([r2.c.openSz, r2.c.margin]));
    // 同じ向き（ロング）は内訳を出さない
    const r3 = await page.evaluate(() => { S.side = 1; $('sz').value = 1000; renderTicket(); return { c: orderCalc(), calc: $('calc').textContent }; });
    ok(r3.c.closeSz === 0 && !/内訳|Breakdown|내역/.test(r3.calc), '同じ向きでは内訳を出さない', r3.calc);
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    ok((await page.evaluate(() => [...I18N_MISSING])).length === 0, '訳文表にないキーなし');
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
