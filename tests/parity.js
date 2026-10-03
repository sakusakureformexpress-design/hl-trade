// 画面の署名部品（自作）の出力を、公式 Python SDK と突き合わせる：ランダムな注文の形を大量に作って、ハッシュと署名を比べる
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync(process.env.HL_HTML || require('path').join(__dirname, '..', 'index.html'), 'utf8');
const src = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const a = src.indexOf('const HLSign = (() => {'), b = src.indexOf('\n})();', a) + 6;
const ctx = { console, TextEncoder, TextDecoder, BigInt, Date, JSON, Number, Uint8Array, Math, Object, Array, String, Error, parseInt, _: s => s };
vm.createContext(ctx); vm.runInContext(src.slice(a, b) + '\nglobalThis.H = HLSign;', ctx);
const H = ctx.H;
let seed = 12345; const r = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const pick = a => a[Math.floor(r() * a.length)];
const wire = x => H.wire(Math.round(x * 1e4) / 1e4);
const ord = () => { const t = pick([{ limit: { tif: pick(['Gtc', 'Ioc', 'Alo']) } }, { trigger: { isMarket: true, triggerPx: wire(r() * 1e5), tpsl: pick(['tp', 'sl']) } }, { trigger: { isMarket: false, triggerPx: wire(r() * 10), tpsl: 'sl' } }]);
  return { a: pick([0, 1, 5, 17, 199, 200, 10000, 10001, 10107, 10300]), b: r() > .5, p: wire(Math.round(r() * 1e6) / 100), s: wire(Math.round(r() * 1e6) / 1e4), r: r() > .5, t }; };
const cases = [];
for (let i = 0; i < 250; i++) {
  const k = pick(['order', 'order', 'order', 'cancel', 'modify', 'lev', 'margin']);
  let action;
  if (k === 'order') { const n = 1 + Math.floor(r() * 3); action = { type: 'order', orders: Array.from({ length: n }, ord), grouping: pick(['na', 'normalTpsl', 'positionTpsl']) }; if (r() > .5) action.builder = { b: '0x' + Array.from({ length: 40 }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join(''), f: Math.floor(r() * 101) }; }
  else if (k === 'cancel') action = { type: 'cancel', cancels: [{ a: pick([0, 3, 10001]), o: Math.floor(r() * 4e9) }] };
  else if (k === 'modify') action = { type: 'batchModify', modifies: [{ oid: Math.floor(r() * 4e9), order: ord() }] };
  else if (k === 'lev') action = { type: 'updateLeverage', asset: pick([0, 1, 5, 199]), isCross: r() > .5, leverage: 1 + Math.floor(r() * 50) };
  else action = { type: 'updateIsolatedMargin', asset: pick([0, 1, 5]), isBuy: r() > .5, ntli: Math.floor(r() * 1e9) - 5e8 };
  const nonce = 1.7e12 + Math.floor(r() * 1e9), key = '0x' + Array.from({ length: 64 }, () => '0123456789abcdef'[Math.floor(r() * 16)]).join('');
  const sig = H.signAction(action, nonce, key);
  cases.push({ action, nonce, key, hash: H.hex(H.actionHash(action, nonce)), sig, addr: H.addressOf(key) });
}
fs.writeFileSync(require('path').join(__dirname, 'parity-cases.json'), JSON.stringify(cases));
console.log('cases', cases.length);
