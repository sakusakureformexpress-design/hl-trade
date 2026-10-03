// 取引所につながらないとき（ネットなし）に、エラーで止まらず、言語に合わせた案内が出るか。使っている外部の宛先も一覧にする
const L = require('./lib');
(async () => {
  const b = await L.launch(); let bad = 0; const hosts = new Set();
  for (const lang of ['ja', 'ko', 'en']) {
    const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } }); const page = await ctx.newPage(); const errs = [];
    page.on('pageerror', e => errs.push(e.message)); page.on('request', r => { try { const u = new URL(r.url()); if (u.protocol !== 'file:') hosts.add(u.protocol + '//' + u.host); } catch {} });
    await page.route('**/*', r => r.request().url().startsWith('file://') ? r.continue() : r.abort());
    await page.goto('file://' + L.HTML + '?lang=' + lang); await page.waitForTimeout(2500);
    const txt = await page.evaluate(() => document.body.innerText);
    const jp = lang !== 'ja' && L.KANA_KANJI.test(txt.replace(/日本語/g, ''));
    console.log(lang, errs.length ? 'ERR ' + errs.join('|') : 'ok', jp ? ' 日本語が残っている' : '', '| log:', (await page.evaluate(() => document.getElementById('log').innerText)).replace(/\n/g, ' / ').slice(0, 140));
    if (errs.length || jp) bad++; await ctx.close();
  }
  console.log('外部の宛先:', [...hosts].join(', ')); await b.close(); process.exit(bad ? 1 : 0);
})();
