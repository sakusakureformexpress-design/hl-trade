// スマホ幅で、ポジションの表に銘柄名・数量・損益が見えること（操作ボタンの列が隠していないこと）
const L = require('./lib');
(async () => {
  const b = await L.launch(); let bad = 0;
  for (const [lang, w, h] of [['ja', 390, 844], ['ko', 390, 844], ['en', 360, 740], ['en', 820, 1100], ['ja', 1440, 900]]) {
    const { page, ctx } = await L.open(b, { lang, w, h });
    await page.waitForTimeout(1500);
    const r = await page.evaluate(async () => {
      document.getElementById('aTbl').scrollIntoView({block:'center'}); await new Promise(r => setTimeout(r, 300)); const box = document.getElementById('aTbl').getBoundingClientRect(), row = document.querySelector('#aTbl tr:nth-child(2)'), cells = [...row.children];
      const vis = c => { const x = c.getBoundingClientRect(); const mid = document.elementFromPoint(Math.min(Math.max(x.left + 6, box.left + 1), box.right - 1), x.top + x.height / 2); return !!mid && (c === mid || c.contains(mid)); };
      const sc = document.getElementById('aTbl'); sc.scrollLeft = 0;
      return { first: vis(cells[0]), coin: cells[0].textContent, sticky: getComputedStyle(cells[cells.length - 1]).position, w: box.width };
    });
    const ok = r.first; if (!ok) bad++;
    console.log(`${lang} ${w}px: 銘柄名が見える=${r.first} (${r.coin}) 操作列=${r.sticky}`);
    await page.screenshot({ path: `${__dirname}/shots/pos-${lang}-${w}.png`, clip: { x: 0, y: Math.max(0, h - 420), width: w, height: 420 } }).catch(() => {});
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
