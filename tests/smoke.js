const L = require('./lib');
const SHOTS = require('path').join(__dirname, 'shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true });
(async () => {
  const b = await L.launch(); let bad = 0;
  for (const lang of ['ja', 'ko', 'en']) for (const [w, h, tag] of [[1440, 900, 'pc'], [390, 844, 'sp']]) {
    const { page, errors, ctx } = await L.open(b, { lang, w, h });
    await page.screenshot({ path: SHOTS + `${lang}-${tag}.png`, fullPage: tag === 'sp' });
    const info = await page.evaluate(() => ({ coins: document.querySelectorAll('#coins button').length, missing: [...I18N_MISSING], lang: LANG, title: document.title }));
    console.log(lang, tag, JSON.stringify(info).slice(0, 300), errors.length ? 'ERR ' + errors.join(' | ') : 'ok');
    if (errors.length) bad++;
    await ctx.close();
  }
  await b.close(); process.exit(bad ? 1 : 0);
})();
