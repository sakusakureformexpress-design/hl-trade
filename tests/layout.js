// パソコンの画面（低い・文字を大きくした場合も）で、チャートと板が潰れず、読める高さがある
const L = require('./lib');
const results = []; const ok = (c, m, d) => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + m + (c ? '' : '  → ' + (d || ''))); };
(async () => {
  const b = await L.launch();
  for (const [w, h] of [[1920, 1080], [1440, 900], [1366, 768], [1280, 720]]) for (const z of [1, 1.2, 1.6]) {
    const { page, errors, ctx } = await L.open(b, { lang: 'ja', w, h, ls: { zoom: z, addr: '', startOff: false }, noSeed: true });
    await page.waitForTimeout(500);
    const r = await page.evaluate(() => { const c = document.getElementById('chartBox').getBoundingClientRect(), k = document.getElementById('bookBox').getBoundingClientRect(), cv = document.getElementById('chart').getBoundingClientRect(); return { chart: c.height, book: k.height, cv: cv.height, sw: document.documentElement.scrollWidth - innerWidth }; });
    // 拡大のときは、CSS の高さを実際の画面の高さに直して見る（zoom をかけた分だけ大きく見える）
    const real = r.chart * z;
    ok(r.chart >= 330 && r.cv >= 150 && r.book >= 330, `${w}×${h} 文字×${z}：チャートの高さ ${Math.round(r.chart)}px・板 ${Math.round(r.book)}px（潰れていない）`, JSON.stringify(r));
    ok(r.sw <= 1, `${w}×${h} 文字×${z}：横にはみ出さない`, String(r.sw));
    await ctx.close();
  }
  await b.close(); const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
