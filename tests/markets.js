// 銘柄の検索・お気に入り・現物の切り替え・一覧ページ
const L = require('./lib');
const SHOTS = require('path').join(__dirname, 'shots') + '/'; require('fs').mkdirSync(SHOTS, { recursive: true });
const results = []; const ok = (c, name, extra = '') => { results.push(!!c); console.log((c ? '  ✓ ' : '  ✗ ') + name + (c ? '' : '  ' + extra)); };
async function run(lang, w, h){
  console.log(`\n=== markets (${lang} ${w}) ===`);
  const b = await L.launch(); const { page, errors, ctx } = await L.open(b, { lang, w, h });
  const cnt = sel => page.locator(sel).count();
  const perpN = await page.evaluate(() => marketList('perp').length), spotN = await page.evaluate(() => marketList('spot').length);
  ok(perpN > 60, `先物の銘柄が全部読めている（${perpN}件）`); ok(spotN >= 15, `現物の銘柄が全部読めている（${spotN}件）`);
  ok(!(await page.evaluate(() => !!M['OLDCOIN'])), '上場廃止の銘柄は出ない');
  ok((await cnt('#coins button')) === 10, '最初の帯は10銘柄');
  // 検索
  await page.click('#coinFind'); await page.waitForSelector('#picker:not([hidden])');
  const rows0 = await cnt('#pList tr[data-k]'); ok(rows0 > 60, `検索窓に全銘柄が並ぶ（${rows0}行）`);
  await page.fill('#pQ', 'sol'); await page.waitForTimeout(150);
  const names = await page.$$eval('#pList tr[data-k] td:nth-child(2)', els => els.map(e => e.firstChild.textContent));
  ok(names.includes('SOL') && names.every(n => /sol/i.test(n)), '「sol」で絞り込める', names.join(','));
  await page.fill('#pQ', 'pepe'); await page.waitForTimeout(150);
  ok((await page.$$eval('#pList tr[data-k] td:nth-child(2)', els => els.map(e => e.firstChild.textContent))).includes('kPEPE'), 'kPEPE も見つかる');
  await page.fill('#pQ', ''); 
  // 並べ替え
  await page.click('#pSort button[data-s=up]'); await page.waitForTimeout(150);
  const chs = await page.$$eval('#pList tr[data-k] td:nth-child(4)', els => els.slice(0, 30).map(e => parseFloat(e.textContent.replace('%', ''))));
  ok(chs.every((v, i) => i === 0 || chs[i - 1] >= v - 1e-9), '上昇率の高い順に並ぶ', chs.slice(0, 8).join(','));
  await page.click('#pSort button[data-s=vol]');
  // お気に入り
  await page.fill('#pQ', 'TAO'); await page.click('#pList .star'); await page.waitForTimeout(150);
  ok(await page.evaluate(() => isFav('TAO')), '★でお気に入りに入る');
  await page.click('#pClose'); ok((await cnt('#coins button')) === 11, '帯に追加される');
  // 帯にない銘柄を選ぶと、いまの銘柄だけ仮のボタンで出る
  await page.click('#coinFind'); await page.fill('#pQ', 'WIF'); await page.click('#pList tr[data-k=WIF] td:nth-child(2)'); await page.waitForTimeout(700);
  ok((await page.evaluate(() => curKey())) === 'WIF', '検索窓から銘柄を選べる');
  ok((await cnt('#coins button.tmp')) === 1, '帯にない銘柄は仮のボタンで出る');
  ok(/WIF/.test(await page.textContent('#cName')), '見出しが切り替わる');
  const lev = await page.evaluate(() => cur().maxLev); ok(lev === 10, `最大レバレッジが銘柄ごとに変わる（${lev}x）`);
  ok((await page.textContent('#favBtn')) === '☆', '☆（お気に入りでない）');
  await page.click('#favBtn'); ok((await page.textContent('#favBtn')) === '★', 'ヘッダーの☆で追加できる');
  await page.click('#favBtn');
  // 分離のみの銘柄
  await page.click('#coinFind'); await page.fill('#pQ', 'APE'); await page.click('#pList tr[data-k=APE] td:nth-child(2)'); await page.waitForTimeout(700);
  ok((await page.evaluate(() => S.margin)) === 'isolated', '分離のみの銘柄は分離に固定される');
  // 板・チャートが銘柄に追従
  await page.waitForTimeout(1300);
  ok((await cnt('#asks .brow')) > 3 && (await cnt('#bids .brow')) > 3, '板が出る'); ok(await page.evaluate(() => S.candles.length > 50), 'チャートの足が読める');
  // 現物
  await page.click('#coinFind'); await page.click('#pTabs button[data-v=spot]'); await page.fill('#pQ', 'jeff'); await page.waitForTimeout(150);
  await page.click('#pList tr[data-k] td:nth-child(2)'); await page.waitForTimeout(800);
  ok((await page.evaluate(() => S.mkt)) === 'spot', '現物に切り替わる'); ok(!(await page.isVisible('#levWrap')), '現物にはレバレッジ欄がない');
  ok(/JEFF/.test(await page.textContent('#cName')), '現物の名前が出る'); 
  const dec = await page.evaluate(() => { const k = curKey(); return [maxDec(k), fmtPx(k, priceOf(k))]; }); ok(dec[1] !== '—', '現物の値段が出る', JSON.stringify(dec));
  await page.waitForTimeout(1200); ok((await cnt('#asks .brow')) > 3, '現物の板が出る');
  await page.screenshot({ path: SHOTS + `markets-spot-${lang}-${w}.png` });
  // 一覧ページ
  await page.click('#pages button[data-p=list]'); await page.waitForTimeout(500);
  ok((await cnt('#lsBody tr[data-k]')) > 60, '一覧ページに全銘柄が出る'); await page.fill('#lQ', 'eth'); await page.waitForTimeout(120);
  ok((await cnt('#lsBody tr[data-k]')) >= 1, '一覧ページの検索');
  await page.click('#lsBody tr[data-k=ETH] td:nth-child(2)'); await page.waitForTimeout(700);
  ok((await page.evaluate(() => [S.page, S.mkt, curKey()].join())) === 'trade,perp,ETH', '一覧から選ぶとトレード画面に移る');
  await page.click('#pages button[data-p=list]'); await page.waitForTimeout(400); await page.screenshot({ path: SHOTS + `list-${lang}-${w}.png` });
  // 4画面
  await page.click('#pages button[data-p=multi]'); await page.waitForTimeout(900);
  const opts = await page.$$eval('#mcGrid .sc:first-child option', o => o.length); ok(opts > 60, `4画面の銘柄選択に全銘柄が入る（${opts}）`);
  await page.selectOption('#mcGrid .mp:nth-child(1) .sc', 'TAO'); await page.waitForTimeout(800);
  ok(await page.evaluate(() => !!document.querySelector('#mcGrid .mp:nth-child(1) [data-px]').textContent), '4画面で別の銘柄に変えられる');
  await page.screenshot({ path: SHOTS + `multi-${lang}-${w}.png` });
  ok(errors.length === 0, 'JSエラーなし', errors.join(' | '));
  const miss = await page.evaluate(() => [...I18N_MISSING]); ok(miss.length === 0, '訳文表にないキーなし', miss.join('/'));
  await b.close();
}
(async () => {
  for (const [lang, w, h] of [['en', 1440, 900], ['ko', 390, 844], ['ja', 1440, 900]]) await run(lang, w, h);
  const f = results.filter(x => !x).length; console.log(`\n${results.length - f}/${results.length} 合格`); process.exit(f ? 1 : 0);
})();
