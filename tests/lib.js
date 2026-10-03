// テスト用の共通部品：ブラウザ起動、模擬取引所の署名検証（画面とは別の実装で確かめる）
const fs = require('fs'), path = require('path');
const NM = path.join(__dirname, 'node_modules');
const { chromium } = require(require('child_process').execSync('npm root -g').toString().trim() + '/playwright');
const { encode } = require(NM + '/@msgpack/msgpack');
const ethers = require(NM + '/ethers');
const HTML = process.env.HL_HTML || path.join(__dirname, '..', 'index.html');
const DEMO_AGENT = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
const APPROVED_AGENTS = new Set();   // ウォレットの署名で登録された注文用の鍵（承認の署名が正しかったものだけ）
const TYPED_LOG = [];                // ウォレットに渡した署名の中身（公式 SDK との照合用）
const WALLET = new ethers.Wallet('0x' + '11'.repeat(32));   // 手数料の承認に使う試験用のウォレット

const be8 = n => { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; };
// 画面の署名（自作）が、標準の部品（msgpack + ethers）と同じ答えになるかを確かめる
function verifyAgent(body){
  const { action, nonce, signature } = body;
  const conn = ethers.keccak256(Buffer.concat([Buffer.from(encode(action)), be8(nonce), Buffer.from([0])]));
  const domain = { name: 'Exchange', version: '1', chainId: 1337, verifyingContract: ethers.ZeroAddress };
  const types = { Agent: [{ name: 'source', type: 'string' }, { name: 'connectionId', type: 'bytes32' }] };
  let addr; try { addr = ethers.verifyTypedData(domain, types, { source: 'a', connectionId: conn }, { r: signature.r, s: signature.s, v: signature.v }); } catch (e) { return { ok: false, addr: 'recover failed: ' + e.message }; }
  return { ok: addr.toLowerCase() === DEMO_AGENT || APPROVED_AGENTS.has(addr.toLowerCase()), addr };
}
function verifyUser(body){
  const { action, signature } = body;
  if (action.type === 'approveAgent'){
    const t = { 'HyperliquidTransaction:ApproveAgent': [{ name: 'hyperliquidChain', type: 'string' }, { name: 'agentAddress', type: 'address' }, { name: 'agentName', type: 'string' }, { name: 'nonce', type: 'uint64' }] };
    const dom = { name: 'HyperliquidSignTransaction', version: '1', chainId: parseInt(action.signatureChainId, 16), verifyingContract: ethers.ZeroAddress };
    let who; try { who = ethers.verifyTypedData(dom, t, { hyperliquidChain: action.hyperliquidChain, agentAddress: action.agentAddress, agentName: action.agentName, nonce: action.nonce }, { r: signature.r, s: signature.s, v: signature.v }); } catch (e) { return { ok: false, addr: 'recover failed' }; }
    const okSig = who === WALLET.address && ethers.getAddress(action.agentAddress) === action.agentAddress;   // 公式 SDK と同じ、大文字小文字つきの表記か
    if (okSig) APPROVED_AGENTS.add(action.agentAddress.toLowerCase());
    return { ok: okSig, addr: who };
  }
  const types = { 'HyperliquidTransaction:ApproveBuilderFee': [{ name: 'hyperliquidChain', type: 'string' }, { name: 'maxFeeRate', type: 'string' }, { name: 'builder', type: 'address' }, { name: 'nonce', type: 'uint64' }] };
  const domain = { name: 'HyperliquidSignTransaction', version: '1', chainId: parseInt(action.signatureChainId, 16), verifyingContract: ethers.ZeroAddress };
  let addr; try { addr = ethers.verifyTypedData(domain, types, { hyperliquidChain: action.hyperliquidChain, maxFeeRate: action.maxFeeRate, builder: action.builder, nonce: action.nonce }, { r: signature.r, s: signature.s, v: signature.v }); } catch (e) { return { ok: false, addr: 'recover failed' }; }
  return { ok: addr === WALLET.address, addr };
}
const verify = body => ['approveBuilderFee', 'approveAgent'].includes(body.action.type) ? verifyUser(body) : verifyAgent(body);

async function launch(){ return chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }); }
// 1 ページ開く。lang・画面の大きさ・追加の localStorage・手数料の設定を指定できる
async function open(browser, o = {}){
  const { lang = 'ja', w = 1440, h = 900, ls = {}, fee = null, hash = '', noSeed = false, reject = false, noWallet = false, multi = false, wc = false } = o;
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: w < 800, isMobile: w < 800 });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push('pageerror: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) errors.push('console.error: ' + m.text()); });
  await page.exposeFunction('__verifySig', verify);
  await page.exposeFunction('__signTyped', async json => { TYPED_LOG.push(json); const t = JSON.parse(json); const { EIP712Domain, ...types } = t.types; return WALLET.signTypedData(t.domain, types, t.message); });
  await page.addInitScript(({ ls, wallet, noSeed, reject, noWallet, multi, wc }) => {
    for (const [k, v] of Object.entries(ls)) localStorage.setItem('hlts.' + k, JSON.stringify(v));
    if (noSeed) window.__HL_NO_SEED_KEY = true;
    if (noWallet) window.__HL_NO_WALLET = true;
    if (!noWallet) window.ethereum = { request: async ({ method, params }) => {
      if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [wallet.toLowerCase()];
      if (method === 'wallet_switchEthereumChain' || method === 'wallet_requestPermissions') return null;
      if (method === 'eth_signTypedData_v4'){ if (reject){ const e = new Error('User rejected the request.'); e.code = 4001; throw e; } return window.__signTyped(params[1]); }
      throw new Error('unsupported ' + method);
    }, on(){} };
    // 複数のウォレット（EIP-6963）と WalletConnect の見本。どれが使われたかを window.__used に残す
    window.__used = [];
    const mk = (name, rdns, addr) => ({ info: { uuid: 'u-' + rdns, name, rdns, icon: 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8"><rect width="8" height="8"/></svg>') },
      provider: { on() {}, removeListener() {}, request: async ({ method }) => { window.__used.push(name + ':' + method); if (method === 'eth_requestAccounts' || method === 'eth_accounts') return [addr]; if (method === 'wallet_requestPermissions') return null; throw new Error('unsupported ' + method); } } });
    if (multi){
      const ws = [mk('Alpha Wallet', 'a.alpha', wallet.toLowerCase()), mk('Beta Wallet', 'b.beta', '0x70997970c51812dc3a010c7d01b50e0d17dc79c8')];
      const fire = () => ws.forEach(d => dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: Object.freeze(d) })));
      addEventListener('eip6963:requestProvider', fire); fire();
    }
    if (wc){
      window.__HL_WC_MOD = { EthereumProvider: { init: async opts => { window.__wcOpts = opts; const p = { session: null, accounts: [], on() {}, removeListener() {}, request: async () => { throw new Error('x'); },
        async connect() { window.__used.push('WC:connect'); p.session = {}; p.accounts = ['0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc']; }, async disconnect() { window.__used.push('WC:disconnect'); p.session = null; p.accounts = []; } }; return p; } } };
    }
  }, { ls: { addr: WALLET.address, terms: { v: 1, t: 1767225600000, lang: 'ja' }, ...ls }, wallet: WALLET.address, noSeed, reject, noWallet, multi, wc });
  await page.route('**/*', r => { const u = r.request().url(); if (u.startsWith('file://')) return r.continue(); return r.abort(); });
  let file = HTML;
  { let s = fs.readFileSync(HTML, 'utf8'); s = s.replace(/const WC = \{projectId:'[^']*',/, `const WC = {projectId:'${wc ? 'test-project' : ''}',`); if (fee) s = s.replace(/const BUILDER = \{[^}]*\};/, `const BUILDER = {addr:'${fee.addr}', fee:${fee.fee}, required:${fee.required !== false}};`); file = HTML.replace(/index\.html$/, '.test-fee.html'); fs.writeFileSync(file, s); }
  await page.goto('file://' + file + '?demo&lang=' + lang + hash);
  await page.waitForFunction(() => window.__HL_MOCK && document.querySelectorAll('#coins button').length > 0 && document.querySelector('#cMark') && document.querySelector('#cMark').textContent.length > 1, null, { timeout: 15000 });
  await page.waitForTimeout(600);
  return { ctx, page, errors };
}
const norm = t => t.replace(/[+\-−]?[0-9][0-9,.]*/g, '#').replace(/\s+/g, ' ').trim();
const KANA_KANJI = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
module.exports = { launch, open, verify, WALLET, TYPED_LOG, APPROVED_AGENTS, ethers, norm, KANA_KANJI, HTML, DEMO_AGENT };
