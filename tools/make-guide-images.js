// 使い方ページの画像を作る：デモ画面を撮って、番号と枠を重ねる（言語ごと）
//   cd tests && node ../tools/make-guide-images.js            （3言語ぜんぶ）
//   node ../tools/make-guide-images.js ja                      （1言語だけ）
const path = require('path'), fs = require('fs');
const L = require(path.join(__dirname, '..', 'tests', 'lib.js'));
const OUT = path.join(__dirname, '..', 'guide');
const langs = process.argv[2] ? [process.argv[2]] : ['ja', 'ko', 'en'];
const Q = { type: 'jpeg', quality: 74 };
const icon = c => 'data:image/svg+xml;base64,' + Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="${c}"/><circle cx="16" cy="16" r="7" fill="#fff" opacity=".85"/></svg>`).toString('base64');
const mark = async (page, items) => page.evaluate(items => {
  document.querySelectorAll('.gcb,.gbox').forEach(e => e.remove());
  items.forEach(([sel, n, dx = -6, dy = -6]) => {
    const e = document.querySelector(sel); if (!e) return; const r = e.getBoundingClientRect(); if (!r.width) return;
    const b = document.createElement('div'); b.className = 'gbox'; b.style.cssText = `position:fixed;left:${r.left - 2}px;top:${r.top - 2}px;width:${r.width + 4}px;height:${r.height + 4}px;border:2px solid #f5b800;border-radius:8px;z-index:99998;pointer-events:none`; document.body.appendChild(b);
    const c = document.createElement('div'); c.className = 'gcb'; c.textContent = n; c.style.cssText = `position:fixed;left:${r.left + dx - 8}px;top:${r.top + dy - 8}px;width:26px;height:26px;border-radius:50%;background:#f5b800;color:#111;font:700 15px sans-serif;display:flex;align-items:center;justify-content:center;z-index:99999;box-shadow:0 1px 4px #000a;pointer-events:none`; document.body.appendChild(c);
  });
}, items);
(async () => {
  const b = await L.launch();
  for (const lang of langs) {
    const dir = path.join(OUT, lang); fs.mkdirSync(dir, { recursive: true });
    const save = async (name, target) => { const p = path.join(dir, name + '.jpg'); await (target || page_).screenshot({ path: p, ...Q }); console.log(lang, name, fs.statSync(p).size); };
    let page_;
    const hideDemo = p => p.addStyleTag({ content: '#demoBar{display:none!important}' });
    // 1) 画面の見方
    { const { page, ctx } = await L.open(b, { lang, w: 1280, h: 800, noSeed: true, wc: true }); page_ = page; await hideDemo(page); await page.waitForTimeout(600);
      await mark(page, [['#walletBtn', '①', -4, -4], ['#coins', '②'], ['#chartWrap', '③', 4, 4], ['#bookBox', '④'], ['#ticket', '⑤'], ['#bottom', '⑥', 18, 14]]);
      await page.evaluate(() => { const h = document.getElementById('hint'); if (h) h.style.display = 'none'; });
      await save('overview'); await ctx.close(); }
    // 2) ウォレットを選ぶ・3) 鍵を作る
    { const { page, ctx } = await L.open(b, { lang, w: 1280, h: 900, ls: { addr: '' }, noSeed: true, wc: true }); page_ = page; await hideDemo(page);
      // アイコンの関数はブラウザに渡せないので、データ URI を先に作って渡す
      const ics = { MetaMask: icon('#f6851b'), Rabby: icon('#7084ff'), Phantom: icon('#ab9ff2') };
      await page.evaluate(ics => { for (const [name, ic] of Object.entries(ics)) dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze({ info: { uuid: 'g-' + name, name, rdns: 'g.' + name, icon: ic }, provider: { request: async () => [], on() {}, removeListener() {} } }) })); }, ics);
      await page.evaluate(() => openWalletPicker(false)); await page.waitForSelector('#wpList .wi'); await page.waitForTimeout(300);
      await save('wallet', await page.$('#modal .box'));
      await page.evaluate(() => { closeModal(); openLiveSetup(); }); await page.waitForSelector('#wlGo'); await page.waitForTimeout(300);
      await mark(page, [['#lvPin', '①', 0, 0], ['#wlGo', '②', 0, 0]]);
      await save('live', await page.$('#modal .box')); await ctx.close(); }
    // 4) 注文の欄
    { const { page, ctx } = await L.open(b, { lang, w: 1280, h: 1150, noSeed: true }); page_ = page; await hideDemo(page); await page.waitForTimeout(400);
      await mark(page, [['#side', '①'], ['#oType', '②'], ['#sz', '③'], ['#levBtn', '④'], ['#tpslWrap', '⑤'], ['#submit', '⑥']]);
      await save('order', await page.$('#ticket')); await ctx.close(); }
    // 5) チャート
    { const { page, ctx } = await L.open(b, { lang, w: 1280, h: 800, ls: { ind: { ema: true, bb: true, rsi: true } }, noSeed: true }); page_ = page; await hideDemo(page); await page.waitForTimeout(600);
      await page.evaluate(() => { const h = document.getElementById('hint'); if (h) h.style.display = 'none'; });
      await save('chart', await page.$('#chartBox')); await ctx.close(); }
    // 6) 4画面・7) 銘柄一覧
    { const { page, ctx } = await L.open(b, { lang, w: 1280, h: 800, noSeed: true }); page_ = page; await hideDemo(page);
      await page.evaluate(() => setPage('multi')); await page.waitForTimeout(1800); await save('multi');
      await page.evaluate(() => setPage('list')); await page.waitForTimeout(900); await save('list'); await ctx.close(); }
  }
  await b.close();
})();
