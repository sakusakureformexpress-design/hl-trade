// テスト用の共通部品：ブラウザ起動、模擬取引所の署名検証（画面とは別の実装で確かめる）
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, 'node_modules');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { encode } = require(NM + '/@msgpack/msgpack');
const ethers = require(NM + '/ethers');
const HTML = process.env.HL_HTML || path.join(__dirname, '..', 'index.html');
const DEMO_AGENT = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const WALLET = new ethers.Wallet('0x' + '11'.repeat(32));   // 手数料の承認に使う試験用のウォレット

const be8 = n => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; };
// 画面の署名（自作）が、標準の部品（msgpack + ethers）と同じ答えになるかを確かめる
function verifyAgent(body){
  const { action, nonce, signature } = body;
  const conn = ethers.keccak256(Buffer.concat([Buffer.from(encode(action)), be8(nonce), Buffer.from([0])]));
  const domain = { name: 'Exchange', version: '1', chainId: 1337, verifyingContract: ethers.ZeroAddress };
  const types = { Agent: [{ name: 'source', type: 'string' }, { name: 'connectionId', type: 'bytes32' }] };
  let addr; try { addr = ethers.verifyTypedData(domain, types, { source: 'a', connectionId: conn }, { r: signature.r, s: signature.s, v: signature.v }); } catch (e) { return { ok: false, addr: 'recover failed: ' + e.message }; }
  return { ok: addr.toLowerCase() === DEMO_AGENT, addr };
}
function verifyUser(body){
  const { action, signature } = body;
  const types = { 'HyperliquidTransaction:ApproveBuilderFee': [{ name: 'hyperliquidChain', type: 'string' }, { name: 'maxFeeRate', type: 'string' }, { name: 'builder', type: 'address' }, { name: 'nonce', type: 'uint64' }] };
  const domain = { name: 'HyperliquidSignTransaction', version: '1', chainId: parseInt(action.signatureChainId, 16), verifyingContract: ethers.ZeroAddress };
  let addr; try { addr = ethers.verifyTypedData(domain, types, { hyperliquidChain: action.hyperliquidChain, maxFeeRate: action.maxFeeRate, builder: action.builder, nonce: action.nonce }, { r: signature.r, s: signature.s, v: signature.v }); } catch (e) { return { ok: false, addr: 'recover failed' }; }
  return { ok: addr === WALLET.address, addr };
}
const verify = body => body.action.type === 'approveBuilderFee' ? verifyUser(body) : verifyAgent(body);

async function launch(){ return chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); }
// 1 ページ開く。lang・画面の大きさ・追加の localStorage・手数料の設定を指定できる
async function open(browser, o = {}){
  const { lang = 'ja', w = 1440, h = 900, ls = {}, fee = null, hash = '' } = o;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console.error: ' + m.text()); });
  await page.exposeFunction('__verifySig', verify);
  await page.exposeFunction('__signTyped', async json => { const t = JSON.parse(json); const { EIP712Domain, ...types } = t.types; return WALLET.signTypedData(t.domain, types, t.message); });
  await page.addInitScript(({ ls, wallet }) => {
    for (const [k, v] of Object.entries(ls)) localStorage.setItem('hlts.' + k, JSON.stringify(v));
    window.ethereum = { request: async ({ method, params }) => {
      if (method === 'eth_requestAccounts') return [wallet.toLowerCase()];
      if (method === 'wallet_switchEthereumChain') return null;
      if (method === 'eth_signTypedData_v4') return window.__signTyped(params[1]);
      throw new Error('unsupported ' + method);
    } };
  }, { ls: { addr: WALLET.address, ...ls }, wallet: WALLET.address });
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file://')) return r.continue(); return r.abort(); });
  let file = HTML;
  if (fee){ const s = fs.readFileSync(HTML, 'utf8').replace("const BUILDER = {addr:'', fee:0, required:true};", `const BUILDER = {addr:'${fee.addr}', fee:${fee.fee}, required:${fee.required !== false}};`); file = HTML.replace(/index\.html$/, '.test-fee.html'); fs.writeFileSync(file, s); }
  await page.goto('file://' + file + '?demo&lang=' + lang + hash);
  await page.waitForFunction(() => window.__HL_MOCK && document.querySelectorAll('#coins button').length > 0 && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const norm = t => t.replace(/[+\-−]?[0-9][0-9,.]*/g, '#').replace(/\s+/g, ' ').trim();
const KANA_KANJI = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
module.exports = { launch, open, verify, WALLET, norm, KANA_KANJI, HTML, DEMO_AGENT };
