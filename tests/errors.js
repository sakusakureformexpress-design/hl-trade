// 取引所の英語のエラーを、いまの言語のやさしい文にする（「入金されていません」など）
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
const CASES = [
  ['Must deposit before performing actions. User: 0x15e1508a251eed364273b578df1234567890abcd', /入金|deposit|입금/i],
  ['Insufficient spot balance asset=10000', /現物|spot|현물/i],
  ['Insufficient margin to place order.', /証拠金|margin|증거금/i],
  ['Order has zero size.', /数量|size|수량/i],
  ['Price too far from oracle', /離れ|far|멀리/i],
  ['Cannot increase position: open interest cap reached', /上限|cap|한도/i],
];
(async () => {
  const b = await L.launch();
  for (const lang of ['ja', 'en', 'ko']) {
    console.log(`=== ${lang} ===`);
    const { page, errors, ctx } = await L.open(b, { lang, w: 1280, h: 800, noSeed: true });
    for (const [m, re] of CASES) {
      const t = await page.evaluate(m => jaErr(m), m);
      const head = t.split('(')[0].split('（')[0];   // 取引所の原文（かっこの中）を除いた、やさしい文の部分
      ok(re.test(head), `「${m.slice(0, 28)}…」がやさしい文になる`, t);
      if (lang !== 'ja') ok(!L.KANA_KANJI.test(t), '日本語が残っていない', t);
    }
    ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
