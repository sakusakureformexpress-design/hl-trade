// 動画づくりの道具：外枠（Windows 風のブラウザ）の中にアプリを開き、カーソル・クリックの輪・強調の枠・字幕を出す
const L = require('../tests/lib');
const path = require('path');
const STAGE = path.join(__dirname, 'stage.html');
async function start(browser, o = {}){
  const r = await L.open(browser, { lang: o.lang || 'ja', w: 1760, h: 990, stage: STAGE, noSeed: true, ls: { addr: '', terms: null, startOff: false, firstLive: false, ...(o.ls || {}) }, video: o.video });
  const { page, frame } = r;
  await frame.addStyleTag({ content: '#demoBar{display:none!important}' });
  page.setDefaultTimeout(8000);
  const S = { page, frame, r, fast: !!o.fast, errors: r.errors };
  S.stage = (fn, ...a) => page.evaluate(([f, a]) => window.stage[f](...a), [fn, a]);
  S.wait = ms => S.fast ? Promise.resolve() : page.waitForTimeout(ms);
  // 要素の位置（ページ全体の座標）
  S.box = async sel => { const b = await frame.locator(sel).first().boundingBox(); if (!b) throw new Error('no box: ' + sel); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
  // 画面の中のスクロール（なめらかに）。要素が見える範囲（枠の中）から外れていたら、見える位置まで動かす
  S.scrollBy = async d => { await frame.evaluate(d => window.scrollBy({ top: d, behavior: 'smooth' }), d); await page.waitForTimeout(S.fast ? 700 : Math.min(1100, 450 + Math.abs(d))); };
  S.top = async () => { const y = await frame.evaluate(() => window.scrollY); if (y > 2) await S.scrollBy(-y); };
  S.reveal = async sel => { const b = await S.box(sel); if (b.y < 110 || b.y + Math.min(b.h, 120) > 830){ await S.scrollBy(Math.round(b.y - (b.h > 500 ? 110 : 260))); } };
  S.hl = async (sel, label, pos) => { if (typeof sel === 'string') await S.reveal(sel); const b = typeof sel === 'string' ? await S.box(sel) : sel; await S.stage('hl', b, label, pos); };
  S.hlOff = () => S.stage('hl', null);
  S.move = async (x, y, ms = 800) => { await S.stage('moveTo', x, y, S.fast ? 1 : ms); };
  S.moveTo = async sel => { const b = await S.box(sel); await S.move(b.x + b.w / 2, b.y + b.h / 2); return b; };
  S.click = async (sel, o = {}) => {
    await S.reveal(sel);
    const b = await S.box(sel); const x = b.x + (o.fx ?? .5) * b.w, y = b.y + (o.fy ?? .5) * b.h;
    await S.move(x, y); await S.wait(150); await S.stage('ripple', x, y); await page.mouse.click(x, y); await S.wait(250);
  };
  S.type = async (sel, text, o = {}) => { await S.click(sel); if (o.clear) { await page.keyboard.press('Control+A'); await page.keyboard.press('Delete'); } await page.keyboard.type(text, { delay: S.fast ? 0 : (o.delay ?? 110) }); await S.wait(200); };
  S.note = (txt, x, y) => S.stage('note', txt, x, y);
  S.card = (html, tag) => S.stage('card', html, tag);
  S.shot = f => page.screenshot({ path: f });
  return S;
}
module.exports = { start };
