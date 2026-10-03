// 画面で言語を切り替えたあとの表示が、最初からその言語で開いたときの表示と同じになるか
const L = require('./lib');
const problems = [];
const text = page => page.evaluate(() => {
  const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const attrs = [...document.querySelectorAll('[title],[placeholder],[aria-label]')].filter(vis).map(e => [e.title, e.placeholder, e.getAttribute('aria-label')].filter(Boolean).join(' | '));
  return (document.body.innerText + '\n' + attrs.join('\n')).split('\n').map(s => s.trim()).filter(Boolean);
});
const ONLY = process.argv[2]; const STATES0 = {
  'trade': async p => {},
  'spot': async p => { await p.click('#mkt button[data-v=spot]'); await p.waitForTimeout(900); },
  'markets': async p => { await p.click('#pages button[data-p=list]'); await p.waitForTimeout(700); },
  'multi': async p => { await p.click('#pages button[data-p=multi]'); await p.waitForTimeout(900); },
  'sum-tab': async p => { await p.click('#aTabs button[data-v=sum]'); await p.waitForTimeout(700); },
  'fills-tab': async p => { await p.click('#aTabs button[data-v=fills]'); await p.waitForTimeout(700); },
  'limit+tpsl': async p => { await p.click('#oType button[data-v=limit]'); await p.check('#tpslOn'); await p.waitForTimeout(400); },
  'lev-panel': async p => { await p.click('#levBtn'); await p.waitForTimeout(300); },
  'drawing': async p => { await p.click('#drawBtn'); await p.click('#menu button >> nth=0'); await p.waitForTimeout(300); },
};
const STATES = ONLY ? Object.fromEntries(Object.entries(STATES0).filter(([k]) => k === ONLY)) : STATES0;
(async () => {
  const b = await L.launch();
  const pairs = [['ja', 'ko'], ['ja', 'en'], ['ko', 'en'], ['en', 'ja'], ['en', 'ko'], ['ko', 'ja']];
  for (const [name, setup] of Object.entries(STATES)) for (const [from, to] of pairs) {
    const a = await L.open(b, { lang: from }); const c = await L.open(b, { lang: to });
    try {
      await setup(a.page); await setup(c.page);
      await a.page.click(`#langSel button[data-l=${to}]`); await a.page.waitForTimeout(900); await c.page.waitForTimeout(300);
      const A = (await text(a.page)).map(L.norm), C = (await text(c.page)).map(L.norm);
      const cm = new Map(); C.forEach(x => cm.set(x, (cm.get(x) || 0) + 1)); const onlyA = [];
      for (const x of A){ if (cm.get(x) > 0) cm.set(x, cm.get(x) - 1); else onlyA.push(x); }
      const onlyC = [...cm.entries()].filter(([, n]) => n > 0).map(([x]) => x);
      const bad = onlyA.filter(x => x.length > 1 && !/^[#\s.,:%$/\-+−₩¥★☆·x]*$/.test(x)); 
      const badC = onlyC.filter(x => x.length > 1 && !/^[#\s.,:%$/\-+−₩¥★☆·x]*$/.test(x));
      if (bad.length || badC.length) problems.push(`[${name}] ${from}→${to}\n   切り替えた画面だけにある: ${bad.slice(0, 6).join(' / ')}\n   最初から開いた画面だけにある: ${badC.slice(0, 6).join(' / ')}`);
      const miss = await a.page.evaluate(() => [...I18N_MISSING]); if (miss.length) problems.push(`[${name}] ${from}→${to} 訳文表にないキー: ${miss.join('/')}`);
      if (a.errors.length) problems.push(`[${name}] ${from}→${to} JSエラー: ${a.errors.join(' | ')}`);
    } catch (e) { problems.push(`[${name}] ${from}→${to}: テストの途中で失敗 ${e.message.split('\n')[0]}`); }
    await a.ctx.close(); await c.ctx.close();
  }
  await b.close(); console.log(problems.length ? problems.join('\n') : '問題なし（全部の組み合わせで一致）'); process.exit(problems.length ? 1 : 0);
})();
