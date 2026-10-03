// 各画面を巡回して、韓国語・英語に日本語が残っていないか、{0} などの差し込み忘れがないかを調べる
const L = require('./lib');
const SHOTS = require('path').join(__dirname, 'shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true });
const langs = process.argv[2] ? process.argv[2].split(',') : ['ko', 'en'];
const problems = [];
const textOf = page => page.evaluate(() => {
  const vis = e => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length);
  const attrs = [...document.querySelectorAll('[title],[placeholder],[aria-label]')].filter(vis).map(e => [e.title, e.placeholder, e.getAttribute('aria-label')].filter(Boolean).join(' | '));
  return document.body.innerText + '\n' + attrs.join('\n');
});
async function check(lang, label, page){
  const txt = await textOf(page);
  const bad = [];
  for (const line of txt.split('\n')){
    const l = line.replace(/日本語/g, '');
    if (L.KANA_KANJI.test(l)) bad.push('日本語が残っている: ' + line.trim().slice(0, 100));
    if (/\{\d+\}/.test(line)) bad.push('差し込み忘れ: ' + line.trim().slice(0, 100));
    if (/undefined|NaN|\[object|Infinity/.test(line)) bad.push('不正な値: ' + line.trim().slice(0, 100));
  }
  if (bad.length) problems.push(`[${lang}] ${label}\n   ` + [...new Set(bad)].join('\n   '));
}
async function run(lang, w, h){
  const { page, errors, ctx } = await L.open(await B(), { lang, w, h, fee: { addr: '0xAbCdEf0123456789aBcDeF0123456789AbCdEf01', fee: 30 } });
  const tag = `${lang}/${w}`;
  const step = async (label, fn, keep) => { try { await fn(); await page.waitForTimeout(350); await check(tag, label, page); if (!keep) await page.evaluate(() => { closeModal(); closePicker(); }); } catch (e) { problems.push(`[${tag}] ${label}: テストの途中で失敗 ${e.message.split('\n')[0]}`); } };
  await step('トレード画面', async () => {});
  for (const t of ['ord', 'bal', 'fills', 'hist', 'sum']) await step('下の表: ' + t, async () => { await page.click(`#aTabs button[data-v=${t}]`); });
  await page.click('#aTabs button[data-v=pos]');
  await step('銘柄の検索窓', async () => { await page.click('#coinFind'); }, true);
  await step('検索窓: 現物', async () => { await page.click('#pTabs button[data-v=spot]'); }, true);
  await step('検索窓: 入力', async () => { await page.fill('#pQ', 'zzzz'); });
  await step('銘柄一覧ページ', async () => { await page.click('#pages button[data-p=list]'); });
  await step('銘柄一覧: 現物', async () => { await page.click('#lTabs button[data-v=spot]'); });
  await step('4画面ページ', async () => { await page.click('#pages button[data-p=multi]'); });
  await page.click('#pages button[data-p=trade]');
  await step('実戦の設定', async () => { await page.click('#modeBtn'); });
  for (const a of ['tpsl', 'size', 'margin']) await step('ポジションの編集: ' + a, async () => { await page.click(`#aTbl button[data-act=${a}]`); });
  await page.keyboard.press('Escape');
  await page.evaluate(() => closeModal());
  await step('注文の確認（成行）', async () => { await page.click(w < 800 ? '#qL' : '#submit'); });
  await page.evaluate(() => closeModal());
  await step('指値', async () => { await page.click('#oType button[data-v=limit]'); await page.click(w < 800 ? '#qS' : '#submit'); });
  await page.evaluate(() => closeModal());
  await step('現物', async () => { await page.click('#mkt button[data-v=spot]'); });
  await step('設定（スマホ）', async () => { if (w < 800) await page.click('#prefsBtn'); });
  const miss = await page.evaluate(() => [...I18N_MISSING]);
  if (miss.length) problems.push(`[${tag}] 訳文表にないキー: ${miss.join(' / ')}`);
  if (errors.length) problems.push(`[${tag}] JSエラー: ${errors.join(' | ')}`);
  await page.screenshot({ path: SHOTS + `scan-${lang}-${w}.png` });
  await ctx.close();
}
let _b; const B = async () => _b || (_b = await L.launch());
(async () => {
  for (const lang of langs) for (const [w, h] of [[1440, 900], [390, 844]]) await run(lang, w, h);
  await (await B()).close();
  console.log(problems.length ? problems.join('\n') : '問題なし');
  process.exit(problems.length ? 1 : 0);
})();
