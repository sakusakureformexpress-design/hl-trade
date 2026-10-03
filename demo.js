// デモ用の「模擬取引所」。画面を試すための架空のデータで、本物の取引所にはつながらない。
// 使い方：index.html より先に読み込む（?demo を付けて開くと自動で読み込まれる）。
// 取引所の公開 API（/info・/exchange・WebSocket）と同じ形で返事をするので、画面のコードはそのまま動く。
(() => {
  'use strict';
  window.__HL_DEMO = true;
  const USER = '0xdE30dE30dE30dE30dE30dE30dE30dE30dE30dE30';
  const AGENT_KEY = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d';   // デモ専用の鍵（誰でも知っている公開の鍵。本物のお金には使わない）
  const AGENT_ADDR = '0x70997970c51812dc3a010c7d01b50e0d17dc79c8';
  const DEMO_PIN = '123456';
  const J = (o, status = 200) => new Response(JSON.stringify(o), {status, headers: {'Content-Type': 'application/json'}});

  // ---------- 決まった乱数・値段の動き（時刻だけで決まるので、何度取っても同じ履歴になる）----------
  const hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rnd = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const noise = (key, n) => { const a = Math.floor(n), f = n - a, r = k => rnd(hash(key + ':' + k))(); const u = f * f * (3 - 2 * f); return (r(a) * (1 - u) + r(a + 1) * u) * 2 - 1; };

  // ---------- 銘柄 ----------
  // [名前, 値段, 数量の小数桁, 最大レバレッジ, 分離のみ, 1日の出来高(百万ドル)]
  const PERP_DEF = [
    ['BTC', 112000, 5, 40, 0, 2800], ['ETH', 4100, 4, 25, 0, 1900], ['SOL', 205, 2, 20, 0, 620], ['XRP', 2.85, 0, 20, 0, 410], ['HYPE', 43.5, 2, 10, 0, 380],
    ['DOGE', 0.24, 0, 10, 0, 240], ['SUI', 3.4, 1, 10, 0, 150], ['LINK', 22, 1, 10, 0, 95], ['ADA', 0.82, 0, 10, 0, 85], ['AVAX', 31, 2, 10, 0, 78],
    ['BNB', 1010, 3, 10, 0, 90], ['TRX', 0.34, 0, 10, 0, 40], ['TON', 3.1, 1, 10, 0, 30], ['DOT', 4.3, 1, 10, 0, 28], ['LTC', 112, 2, 10, 0, 55],
    ['BCH', 540, 3, 10, 0, 25], ['UNI', 9.4, 1, 10, 0, 26], ['AAVE', 310, 2, 10, 0, 60], ['NEAR', 3.6, 1, 10, 0, 33], ['APT', 4.9, 2, 10, 0, 22],
    ['ARB', 0.46, 1, 10, 0, 21], ['OP', 0.78, 1, 10, 0, 19], ['INJ', 13.2, 1, 10, 0, 24], ['SEI', 0.31, 0, 10, 0, 12], ['TIA', 2.2, 1, 10, 0, 14],
    ['JUP', 0.42, 0, 10, 0, 11], ['WIF', 0.94, 1, 10, 0, 40], ['kPEPE', 0.0095, 0, 10, 0, 72], ['kBONK', 0.024, 0, 10, 0, 28], ['kSHIB', 0.0128, 0, 10, 0, 30],
    ['kFLOKI', 0.088, 0, 5, 0, 8], ['ENA', 0.62, 0, 10, 0, 45], ['ONDO', 0.92, 0, 10, 0, 33], ['TAO', 320, 3, 10, 0, 42], ['FET', 0.74, 0, 10, 0, 17],
    ['RENDER', 3.8, 1, 10, 0, 15], ['WLD', 1.15, 1, 10, 0, 29], ['ARKM', 0.51, 1, 5, 0, 5], ['PENDLE', 5.6, 1, 10, 0, 19], ['CRV', 0.63, 1, 10, 0, 13],
    ['LDO', 0.99, 1, 10, 0, 12], ['MKR', 1450, 4, 10, 0, 11], ['ATOM', 4.4, 2, 10, 0, 14], ['FIL', 2.5, 1, 10, 0, 9], ['ICP', 5.1, 2, 10, 0, 10],
    ['ETC', 20.5, 2, 10, 0, 12], ['XLM', 0.4, 0, 10, 0, 18], ['ALGO', 0.2, 0, 10, 0, 7], ['HBAR', 0.22, 0, 10, 0, 16], ['APE', 0.64, 1, 5, 1, 6],
    ['MEME', 0.0021, 0, 5, 1, 3], ['PNUT', 0.27, 0, 5, 1, 12], ['POPCAT', 0.38, 0, 5, 1, 9], ['MOODENG', 0.15, 0, 5, 1, 7], ['GOAT', 0.12, 0, 5, 1, 6],
    ['ZRO', 2.1, 1, 5, 0, 8], ['STRK', 0.15, 0, 5, 0, 5], ['PYTH', 0.12, 0, 5, 0, 4], ['JTO', 1.1, 1, 5, 0, 4], ['BLUR', 0.12, 0, 5, 1, 2],
    ['SAND', 0.28, 0, 5, 0, 3], ['MANA', 0.3, 0, 5, 0, 3], ['AXS', 2.7, 1, 5, 0, 3], ['GALA', 0.018, 0, 5, 0, 5], ['IMX', 0.58, 1, 5, 0, 3],
    ['DYDX', 0.62, 1, 5, 0, 4], ['GMX', 11, 2, 5, 0, 2], ['SNX', 0.88, 1, 5, 0, 2], ['COMP', 42, 2, 5, 0, 2], ['YGG', 0.19, 0, 3, 1, 1],
    ['OLDCOIN', 1.0, 1, 3, 1, 0],   // 上場廃止の見本（一覧には出ない）
  ];
  const SPOT_DEF = [
    // [トークン名, 正式名, 値段, 数量の小数桁, 1日の出来高(百万ドル)]
    ['PURR', 'Purr', 0.19, 0, 12], ['HYPE', 'Hyperliquid', 43.4, 2, 210], ['UBTC', 'Unit Bitcoin', 111900, 5, 190], ['UETH', 'Unit Ethereum', 4098, 4, 120], ['USOL', 'Unit Solana', 204.5, 2, 70],
    ['UFART', 'Unit Fartcoin', 0.62, 1, 9], ['USDH', 'Hyperliquid USD', 1.0, 2, 4], ['JEFF', 'Jeff', 0.0042, 0, 3], ['HFUN', 'HyperFun', 0.011, 0, 2], ['LICK', 'Lick', 0.0003, 0, 1],
    ['CATBAL', 'Catbal', 0.021, 0, 3], ['BUDDY', 'Buddy', 0.004, 0, 1], ['PIP', 'Pip', 0.18, 1, 2], ['SPH', 'Sphere', 0.12, 1, 1], ['TREND', 'Trend', 0.05, 1, 1],
    ['MOG', 'Mog', 0.0000021, 0, 1], ['SOLV', 'Solv', 0.016, 0, 1], ['RAGE', 'Rage', 0.034, 0, 1], ['VAPOR', 'Vapor', 0.35, 1, 1], ['NFT', 'NFT Coin', 0.008, 0, 1],
  ];
  const perps = PERP_DEF.map(([name, px, szD, lev, iso, vol], i) => ({name, base: px, szD, lev, iso: !!iso, vol: vol * 1e6, idx: i, delisted: name === 'OLDCOIN'}));
  const tokens = [{name: 'USDC', szDecimals: 8, weiDecimals: 8, index: 0, tokenId: '0x6d1e7cde53ba9467b783cb7c530ce054', isCanonical: true, evmContract: null, fullName: null}];
  const spots = [];
  SPOT_DEF.forEach(([tk, full, px, szD, vol], i) => {
    const index = i + 1;
    tokens.push({name: tk, szDecimals: szD, weiDecimals: 8, index, tokenId: '0x' + hash(tk).toString(16).padStart(32, '0'), isCanonical: i === 0, evmContract: null, fullName: full});
    spots.push({name: i === 0 ? 'PURR/USDC' : '@' + i, tokens: [index, 0], index: i, isCanonical: i === 0, tk, base: px, szD, vol: vol * 1e6});
  });
  const byCoin = {}; perps.forEach(p => byCoin[p.name] = p); spots.forEach(p => byCoin[p.name] = p);

  // ---------- 値段 ----------
  const bump = {};   // テスト用：銘柄ごとの倍率（setPx）
  const pxAt = (c, t) => { const d = byCoin[c], h = hash(c) % 1000;
    return d.base * (1 + 0.035 * Math.sin(t / (9e6 + h * 3e3) + h) + 0.014 * Math.sin(t / (2.6e6 + h * 700) + h * 2) + 0.005 * Math.sin(t / 4.1e5 + h) + 0.0022 * noise(c, t / 6e4) + 0.0007 * noise(c + 'x', t / 6000)); };
  const mark = c => pxAt(c, Date.now()) * (bump[c] || 1);
  const prev = c => pxAt(c, Date.now() - 864e5);
  const fmtPx = (c, p) => { const d = byCoin[c], spot = !!d.tk, maxDec = (spot ? 8 : 6) - d.szD; if (p >= 1e5) return String(Math.round(p)); return String(Number(Number(p.toPrecision(5)).toFixed(Math.max(0, maxDec)))); };
  const IVMS = {'1m': 6e4, '5m': 3e5, '15m': 9e5, '30m': 18e5, '1h': 36e5, '4h': 144e5, '8h': 288e5, '12h': 432e5, '1d': 864e5, '3d': 2592e5, '1w': 6048e5, '1M': 2592e6};
  function candles(c, iv, start, end){
    const ms = IVMS[iv] || 6e4, out = []; let t = Math.floor(start / ms) * ms;
    for (; t <= end; t += ms){
      const pts = []; for (let k = 0; k <= 8; k++) pts.push(pxAt(c, t + ms * k / 8) * (bump[c] || 1));
      const cl = t + ms > Date.now() ? mark(c) : pts[8];
      const o = pts[0], h = Math.max(...pts, cl) * (1 + 0.0004 * Math.abs(noise(c + 'h', t / ms))), l = Math.min(...pts, cl) * (1 - 0.0004 * Math.abs(noise(c + 'l', t / ms)));
      const v = (byCoin[c].vol / 1440) * (ms / 6e4) * (0.5 + Math.abs(noise(c + 'v', t / ms))) / o;
      const f = x => fmtPx(c, x);
      out.push({t, T: t + ms - 1, s: c, i: iv, o: f(o), c: f(cl), h: f(h), l: f(l), v: v.toFixed(2), n: 40 + Math.floor(Math.abs(noise(c + 'n', t / ms)) * 400)});
    }
    return out;
  }
  function book(c){
    const m = mark(c), tick = Math.pow(10, Math.floor(Math.log10(m)) - 4), sp = Math.max(tick, m * 0.00012), bids = [], asks = [];
    for (let i = 0; i < 20; i++){
      const sz = (byCoin[c].vol / 86400 / m) * (0.4 + Math.abs(noise(c + 'b' + i, Date.now() / 4000))) * (1 + i * 0.35) / 4;
      const dec = (byCoin[c].tk ? 8 : 6) - byCoin[c].szD;
      bids.push({px: fmtPx(c, m - sp / 2 - i * sp * 1.2), sz: sz.toFixed(byCoin[c].szD), n: 3 + i});
      asks.push({px: fmtPx(c, m + sp / 2 + i * sp * 1.2), sz: (sz * 0.9).toFixed(byCoin[c].szD), n: 3 + i});
    }
    return {coin: c, time: Date.now(), levels: [bids, asks]};
  }

  // ---------- 口座の状態 ----------
  let oidSeq = 900000, tidSeq = 5000;
  const S = {
    cash: 10000, lev: {}, fills: [], orders: [], hist: [], pos: {}, spot: {USDC: 2500, HYPE: 120, UBTC: 0.02}, approved: {}, agents: [], log: [],
  };
  const isSpotKey = c => !!(byCoin[c] && byCoin[c].tk);
  const levOf = c => (S.lev[c] && S.lev[c].value) || Math.min(5, byCoin[c].lev);
  const crossOf = c => (S.lev[c] ? S.lev[c].cross : !byCoin[c].iso);
  function seedAccount(){
    const now = Date.now();
    const add = (c, szi, ePx, lev, cross) => { S.lev[c] = {value: lev, cross}; S.pos[c] = {szi, entry: ePx, cum: 0}; };
    add('BTC', 0.05, mark('BTC') * 0.985, 10, true);
    add('ETH', -1.5, mark('ETH') * 1.012, 5, false);
    const o = (coin, side, trig, tpsl) => S.orders.push({coin, side, limitPx: fmtPx(coin, trig * (side === 'A' ? 0.9 : 1.1)), sz: '0.0', oid: ++oidSeq, timestamp: now - 36e5, triggerCondition: (tpsl === 'tp') === (side === 'A') ? 'Price above ' + fmtPx(coin, trig) : 'Price below ' + fmtPx(coin, trig), isTrigger: true, triggerPx: fmtPx(coin, trig), children: [], isPositionTpsl: true, reduceOnly: true, orderType: tpsl === 'tp' ? 'Take Profit Market' : 'Stop Market', origSz: '0.0', tif: null, cloid: null});
    o('BTC', 'A', mark('BTC') * 1.06, 'tp'); o('BTC', 'A', mark('BTC') * 0.955, 'sl'); o('ETH', 'B', mark('ETH') * 0.94, 'tp');
    S.orders.push({coin: 'SOL', side: 'B', limitPx: fmtPx('SOL', mark('SOL') * 0.95), sz: '2.0', oid: ++oidSeq, timestamp: now - 72e5, triggerCondition: 'N/A', isTrigger: false, triggerPx: '0.0', children: [], isPositionTpsl: false, reduceOnly: false, orderType: 'Limit', origSz: '2.0', tif: 'Gtc', cloid: null});
    // 少し前の約定履歴
    const rr = rnd(77), coins = ['BTC', 'ETH', 'SOL', 'XRP', 'HYPE'];
    for (let i = 0; i < 26; i++){
      const c = coins[Math.floor(rr() * coins.length)], t = now - (i + 1) * (rr() * 6 + 2) * 36e5, px = pxAt(c, t), buy = rr() > 0.5, close = rr() > 0.5;
      const sz = c === 'BTC' ? 0.01 : c === 'ETH' ? 0.2 : c === 'SOL' ? 3 : c === 'XRP' ? 400 : 20, pnl = close ? (rr() - 0.42) * 40 : 0;
      S.fills.push({coin: c, px: fmtPx(c, px), sz: String(sz), side: buy ? 'B' : 'A', time: t, startPosition: '0.0', dir: close ? (buy ? 'Close Short' : 'Close Long') : (buy ? 'Open Long' : 'Open Short'), closedPnl: pnl.toFixed(4), hash: '0x' + hash('h' + i).toString(16), oid: 100000 + i, crossed: true, fee: (px * sz * 0.00045).toFixed(6), tid: 1000 + i, feeToken: 'USDC', builderFee: '0.0'});
      S.hist.push({order: {coin: c, side: buy ? 'B' : 'A', limitPx: fmtPx(c, px), sz: '0.0', oid: 100000 + i, timestamp: t, triggerCondition: 'N/A', isTrigger: false, triggerPx: '0.0', children: [], isPositionTpsl: false, reduceOnly: close, orderType: 'Market', origSz: String(sz), tif: 'FrontendMarket', cloid: null}, status: 'filled', statusTimestamp: t});
    }
    S.fills.sort((a, b) => b.time - a.time);
  }
  function posView(c){
    const p = S.pos[c]; if (!p || !p.szi) return null;
    const m = mark(c), pv = Math.abs(p.szi) * m, lev = levOf(c), upnl = p.szi * (m - p.entry), mm = 1 / (2 * byCoin[c].lev), side = Math.sign(p.szi);
    const margin = pv / lev, liq = p.entry - side * p.entry * (1 / lev - mm) / (1 - mm * side);
    return {coin: c, szi: String(p.szi), entryPx: fmtPx(c, p.entry), positionValue: pv.toFixed(2), unrealizedPnl: upnl.toFixed(4), returnOnEquity: (upnl / margin).toFixed(4), liquidationPx: fmtPx(c, Math.max(0, liq)), marginUsed: margin.toFixed(4), maxLeverage: byCoin[c].lev, leverage: {type: crossOf(c) ? 'cross' : 'isolated', value: lev}, cumFunding: {allTime: '0.0', sinceOpen: '0.0', sinceChange: '0.0'}};
  }
  const allPos = () => perps.map(p => p.name).filter(c => S.pos[c] && S.pos[c].szi);
  function account(){
    const ps = allPos().map(posView), upnl = ps.reduce((s, p) => s + +p.unrealizedPnl, 0), used = ps.reduce((s, p) => s + +p.marginUsed, 0), val = S.cash + upnl;
    return {marginSummary: {accountValue: val.toFixed(4), totalNtlPos: ps.reduce((s, p) => s + +p.positionValue, 0).toFixed(4), totalRawUsd: S.cash.toFixed(4), totalMarginUsed: used.toFixed(4)}, crossMarginSummary: {accountValue: val.toFixed(4), totalNtlPos: '0', totalRawUsd: '0', totalMarginUsed: used.toFixed(4)}, crossMaintenanceMarginUsed: '0', withdrawable: Math.max(0, val - used).toFixed(4), assetPositions: ps.map(p => ({type: 'oneWay', position: p})), time: Date.now()};
  }
  const avail = () => { const a = account(); return Math.max(0, +a.marginSummary.accountValue - +a.marginSummary.totalMarginUsed); };
  function spotState(){
    return {balances: Object.entries(S.spot).filter(([, v]) => v > 0).map(([coin, total]) => { const tk = tokens.find(x => x.name === coin); return {coin, token: tk.index, total: String(+total.toFixed(8)), hold: '0.0', entryNtl: '0.0'}; })};
  }

  // ---------- 約定 ----------
  const subs = new Map(), socks = new Set();
  const pushWs = (channel, data) => { const msg = JSON.stringify({channel, data}); for (const w of socks) if (w.readyState === 1) w._deliver(msg); };
  function fill(c, buy, sz, px, o, why){
    const d = byCoin[c], spot = !!d.tk, notional = sz * px; let closed = 0, dir, builderFee = 0, feeTok = 'USDC';
    const b = o && o.builder && S.approved[o.builder.b] >= o.builder.f ? o.builder : null;
    if (b && (spot ? !buy : true)) builderFee = notional * b.f / 100000;
    const fee = notional * (spot ? 0.0007 : 0.00045) + builderFee;
    if (spot){
      const tk = tokens.find(x => x.name === d.tk).name;
      if (buy){ S.spot.USDC -= notional; S.spot[tk] = (S.spot[tk] || 0) + sz; dir = 'Buy'; feeTok = tk; } else { S.spot[tk] -= sz; S.spot.USDC += notional - fee; dir = 'Sell'; }
    } else {
      const p = S.pos[c] = S.pos[c] || {szi: 0, entry: px, cum: 0}, s0 = p.szi, delta = buy ? sz : -sz, s1 = s0 + delta;
      if (s0 === 0 || Math.sign(s0) === Math.sign(delta)){ p.entry = (Math.abs(s0) * p.entry + sz * px) / (Math.abs(s0) + sz); dir = buy ? 'Open Long' : 'Open Short'; }
      else {
        const red = Math.min(Math.abs(s0), sz); closed = red * (px - p.entry) * Math.sign(s0); S.cash += closed;
        dir = Math.abs(s1) < 1e-12 ? (buy ? 'Close Short' : 'Close Long') : Math.sign(s1) !== Math.sign(s0) ? (buy ? 'Short > Long' : 'Long > Short') : (buy ? 'Close Short' : 'Close Long');
        if (Math.sign(s1) !== Math.sign(s0) && Math.abs(s1) > 1e-12) p.entry = px;
      }
      p.szi = +s1.toFixed(8); S.cash -= fee; if (!p.szi) delete S.pos[c];
    }
    const f = {coin: c, px: fmtPx(c, px), sz: String(sz), side: buy ? 'B' : 'A', time: Date.now(), startPosition: '0.0', dir, closedPnl: closed.toFixed(6), hash: '0x' + (++tidSeq).toString(16).padStart(8, '0'), oid: o ? o.oid : ++oidSeq, crossed: true, fee: (spot && buy ? fee / px : fee).toFixed(8), tid: ++tidSeq, feeToken: feeTok, builderFee: (spot && buy ? builderFee / px : builderFee).toFixed(8)};
    S.fills.unshift(f); pushWs('userFills', {isSnapshot: false, user: USER, fills: [f]});
    return f;
  }
  const flip = c => S.orders.filter(o => o.coin === c && o.isPositionTpsl && !S.pos[c]);
  function place(o, builder){
    const spot = o.a >= 10000, c = spot ? spots[o.a - 10000].name : perps[o.a].name, d = byCoin[c], px = +o.p, sz = +o.s, buy = !!o.b, m = mark(c);
    if (!(sz > 0)) return {error: 'Order has zero size.'};
    const trig = o.t && o.t.trigger, tif = o.t && o.t.limit && o.t.limit.tif, ref = trig ? +trig.triggerPx : px;
    if (!trig && sz * (tif === 'Ioc' ? m : px) < 10) return {error: 'Order must have minimum value of $10.'};
    if (builder && !(S.approved[builder.b] >= builder.f)) return {error: 'Builder fee has not been approved.'};
    if (o.r){ const p = S.pos[c]; if (!spot && (!p || !p.szi || Math.sign(p.szi) === (buy ? 1 : -1))) return {error: 'Reduce only order would increase position.'}; }
    const oid = ++oidSeq, rec = {coin: c, side: buy ? 'B' : 'A', limitPx: fmtPx(c, px), sz: String(sz), oid, timestamp: Date.now(), triggerCondition: 'N/A', isTrigger: false, triggerPx: '0.0', children: [], isPositionTpsl: false, reduceOnly: !!o.r, orderType: 'Limit', origSz: String(sz), tif: tif || null, cloid: null, builder};
    if (trig){
      Object.assign(rec, {isTrigger: true, triggerPx: fmtPx(c, ref), triggerCondition: (trig.tpsl === 'tp') === buy ? 'Price below ' + fmtPx(c, ref) : 'Price above ' + fmtPx(c, ref), orderType: trig.tpsl === 'tp' ? 'Take Profit Market' : 'Stop Market', trigKind: trig.tpsl});
      S.orders.push(rec); return {resting: {oid}};
    }
    const marketable = buy ? px >= m * 1.00006 : px <= m * 0.99994;
    if (tif === 'Alo' && marketable) return {error: 'Post only order would have immediately matched, bbo was ' + fmtPx(c, m) + '.'};
    if (tif === 'Ioc' && !marketable) return {error: 'Order could not immediately match against any resting orders.'};
    const lev = spot ? 1 : levOf(c);
    if (!o.r){ const need = sz * (marketable ? m : px) / lev; if (spot ? (buy ? S.spot.USDC < sz * m : (S.spot[d.tk] || 0) < sz) : need > avail()) return {error: spot ? 'Insufficient spot balance.' : 'Insufficient margin to place order.'}; }
    if (marketable){ const f = fill(c, buy, sz, m * (buy ? 1.00004 : 0.99996), {oid, builder}); return {filled: {totalSz: String(sz), avgPx: f.px, oid}}; }
    S.orders.push(rec); return {resting: {oid}};
  }
  function tickOrders(){
    for (const o of [...S.orders]){
      const c = o.coin, m = mark(c), buy = o.side === 'B';
      if (o.isTrigger){
        const p = S.pos[c]; if (o.isPositionTpsl && (!p || !p.szi)){ S.orders = S.orders.filter(x => x !== o); continue; }
        const trg = +o.triggerPx, hit = o.trigKind ? (o.trigKind === 'tp' ? (buy ? m <= trg : m >= trg) : (buy ? m >= trg : m <= trg)) : (/Take/.test(o.orderType) ? (buy ? m <= trg : m >= trg) : (buy ? m >= trg : m <= trg));
        if (hit){ S.orders = S.orders.filter(x => x !== o); const sz = +o.sz > 0 ? +o.sz : Math.abs(p ? p.szi : 0); if (sz > 0) fill(c, buy, sz, m, o); }
      } else {
        const px = +o.limitPx; if (buy ? m <= px : m >= px){ S.orders = S.orders.filter(x => x !== o); fill(c, buy, +o.sz, px, o); }
      }
    }
  }

  // ---------- 取引所 API ----------
  const pctToF = s => Math.round(parseFloat(s) * 1000);
  async function exchange(body){
    const verdict = window.__verifySig ? await window.__verifySig(body) : {ok: true};
    S.log.push({action: body.action, verdict});
    if (!verdict.ok) return {status: 'err', response: 'User or API Wallet ' + (verdict.addr || '0x0') + ' does not exist.'};
    const a = body.action;
    switch (a.type){
      case 'order': {
        const statuses = a.orders.map(o => place(o, a.builder));
        return {status: 'ok', response: {type: 'order', data: {statuses}}};
      }
      case 'cancel': {
        const st = a.cancels.map(x => { const n = S.orders.length; S.orders = S.orders.filter(o => o.oid !== x.o); return S.orders.length < n ? 'success' : {error: 'Order was never placed, already canceled, or filled.'}; });
        return {status: 'ok', response: {type: 'cancel', data: {statuses: st}}};
      }
      case 'batchModify': {
        const st = a.modifies.map(m => { const old = S.orders.find(o => o.oid === m.oid); if (!old) return {error: 'Order was never placed, already canceled, or filled.'}; S.orders = S.orders.filter(o => o !== old); const r = place(m.order, null); return r; });
        return {status: 'ok', response: {type: 'order', data: {statuses: st}}};
      }
      case 'updateLeverage': { const c = perps[a.asset].name; S.lev[c] = {value: a.leverage, cross: !!a.isCross}; return {status: 'ok', response: {type: 'default'}}; }
      case 'updateIsolatedMargin': return {status: 'ok', response: {type: 'default'}};
      case 'approveAgent': S.agents.push({name: a.agentName || '', address: a.agentAddress, validUntil: Date.now() + 90 * 864e5}); return {status: 'ok', response: {type: 'default'}};
      case 'approveBuilderFee': S.approved[a.builder.toLowerCase()] = pctToF(a.maxFeeRate); return {status: 'ok', response: {type: 'default'}};
      default: return {status: 'err', response: 'Unsupported action in demo: ' + a.type};
    }
  }
  function info(b){
    switch (b.type){
      case 'meta': case 'metaAndAssetCtxs': {
        const meta = {universe: perps.map(p => ({name: p.name, szDecimals: p.szD, maxLeverage: p.lev, onlyIsolated: p.iso, ...(p.delisted ? {isDelisted: true} : {}), ...(p.iso ? {marginMode: 'strictIsolated'} : {})}))};
        if (b.type === 'meta') return meta;
        return [meta, perps.map(p => { const m = mark(p.name), pv = prev(p.name); return {funding: (0.00001 + 0.00003 * noise(p.name + 'f', Date.now() / 36e5)).toFixed(8), openInterest: (p.vol * 0.9 / m).toFixed(2), prevDayPx: fmtPx(p.name, pv), dayNtlVlm: p.vol.toFixed(2), premium: '0.0001', oraclePx: fmtPx(p.name, m), markPx: fmtPx(p.name, m), midPx: fmtPx(p.name, m), impactPxs: [fmtPx(p.name, m), fmtPx(p.name, m)], dayBaseVlm: (p.vol / m).toFixed(2)}; })];
      }
      case 'spotMeta': case 'spotMetaAndAssetCtxs': {
        const meta = {tokens, universe: spots.map(p => ({name: p.name, tokens: p.tokens, index: p.index, isCanonical: p.isCanonical}))};
        if (b.type === 'spotMeta') return meta;
        return [meta, spots.map(p => { const m = mark(p.name), pv = prev(p.name); return {dayNtlVlm: p.vol.toFixed(2), markPx: fmtPx(p.name, m), midPx: fmtPx(p.name, m), prevDayPx: fmtPx(p.name, pv), circulatingSupply: '1000000', coin: p.name}; })];
      }
      case 'allMids': return allMids();
      case 'candleSnapshot': return candles(b.req.coin, b.req.interval, b.req.startTime, b.req.endTime || Date.now());
      case 'l2Book': return book(b.coin);
      case 'clearinghouseState': return account();
      case 'spotClearinghouseState': return spotState();
      case 'frontendOpenOrders': case 'openOrders': return S.orders.map(({trigKind, builder, ...o}) => o);
      case 'activeAssetData': { const c = b.coin, d = byCoin[c], l = S.lev[c] || {value: levOf(c), cross: crossOf(c)}, m = mark(c), av = avail(); return {user: b.user, coin: c, leverage: {type: l.cross ? 'cross' : 'isolated', value: l.value}, maxTradeSzs: [(av * l.value / m).toFixed(d.szD), (av * l.value / m).toFixed(d.szD)], availableToTrade: [av.toFixed(2), av.toFixed(2)], markPx: fmtPx(c, m)}; }
      case 'extraAgents': return [{name: 'hl-trade demo', address: AGENT_ADDR, validUntil: Date.now() + 90 * 864e5}, ...S.agents];
      case 'maxBuilderFee': return S.approved[String(b.builder).toLowerCase()] || 0;
      case 'userFillsByTime': return S.fills.filter(f => f.time >= (b.startTime || 0)).slice().reverse();
      case 'userFunding': return Array.from({length: 18}, (_, i) => ({time: Date.now() - (i + 1) * 288e5, hash: '0x0', delta: {type: 'funding', coin: i % 2 ? 'BTC' : 'ETH', usdc: ((i % 3 - 1) * 0.31).toFixed(4), szi: '0.05', fundingRate: '0.0000125', nSamples: null}})).reverse();
      case 'historicalOrders': return S.hist;
      default: return {};
    }
  }
  function allMids(){ const o = {}; perps.forEach(p => { if (!p.delisted) o[p.name] = fmtPx(p.name, mark(p.name)); }); spots.forEach(p => o[p.name] = fmtPx(p.name, mark(p.name))); return o; }

  // ---------- fetch / WebSocket の差し替え ----------
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, init) => {
    const u = String(url && url.url || url);
    if (/api\.hyperliquid\.xyz\/info$/.test(u)) { await Promise.resolve(); return J(info(JSON.parse(init.body))); }
    if (/api\.hyperliquid\.xyz\/exchange$/.test(u)) return J(await exchange(JSON.parse(init.body)));
    if (/frankfurter|er-api/.test(u)) return J({rates: {JPY: 149.8, KRW: 1392.5}});
    if (/fonts\.g/.test(u)) return realFetch(url, init);
    return realFetch(url, init);
  };
  class MockWS {
    constructor(){ this.readyState = 0; this.subs = []; socks.add(this); setTimeout(() => { this.readyState = 1; this.onopen && this.onopen({}); }, 20); }
    send(m){ let j; try { j = JSON.parse(m); } catch { return; } if (j.method === 'subscribe') this.subs.push(j.subscription); else if (j.method === 'unsubscribe'){ const k = JSON.stringify(j.subscription); this.subs = this.subs.filter(x => JSON.stringify(x) !== k); } }
    _deliver(s){ this.onmessage && this.onmessage({data: s}); }
    close(){ this.readyState = 3; socks.delete(this); this.onclose && this.onclose({}); }
  }
  window.WebSocket = MockWS;
  let tickN = 0;
  setInterval(() => {
    tickN++; tickOrders();
    pushWs('allMids', {mids: allMids()});
    for (const w of socks) for (const s of w.subs){
      if (s.type === 'l2Book') w._deliver(JSON.stringify({channel: 'l2Book', data: book(s.coin)}));
      else if (s.type === 'candle'){ const ms = IVMS[s.interval] || 6e4, c = candles(s.coin, s.interval, Date.now() - ms, Date.now()).pop(); if (c) w._deliver(JSON.stringify({channel: 'candle', data: c})); }
    }
  }, 1000);

  // ---------- 試すための初期設定 ----------
  async function seedKey(){
    const enc = new TextEncoder(), salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    const base = await crypto.subtle.importKey('raw', enc.encode(DEMO_PIN), 'PBKDF2', false, ['deriveKey']);
    const k = await crypto.subtle.deriveKey({name: 'PBKDF2', salt, iterations: 310000, hash: 'SHA-256'}, base, {name: 'AES-GCM', length: 256}, false, ['encrypt']);
    const ct = new Uint8Array(await crypto.subtle.encrypt({name: 'AES-GCM', iv}, k, enc.encode(AGENT_KEY)));
    const b64 = u => btoa(String.fromCharCode(...u));
    return {addr: AGENT_ADDR, salt: b64(salt), iv: b64(iv), ct: b64(ct)};
  }
  // 画面のコードより先に、口座アドレスと鍵を入れておく（すでに自分で入れたものがあれば触らない）
  try {
    const set = (k, v) => { if (localStorage.getItem('hlts.' + k) == null) localStorage.setItem('hlts.' + k, JSON.stringify(v)); };
    set('addr', USER);
    if (localStorage.getItem('hlts.agentKey') == null && window.crypto && crypto.subtle && !window.__HL_NO_SEED_KEY){
      window.__HL_DEMO_READY = seedKey().then(v => { localStorage.setItem('hlts.agentKey', JSON.stringify(v)); });
    }
  } catch {}
  // 画面から使う「ウォレット」の代わり（手数料の承認の署名を試せるように。本物の署名ではない）
  if (!window.ethereum) window.ethereum = {request: async ({method}) => {
    if (method === 'eth_requestAccounts') { let u = USER; try { u = JSON.parse(localStorage.getItem('hlts.addr')) || USER; } catch {} return [u]; }
    if (method === 'wallet_switchEthereumChain') return null;
    if (method === 'eth_signTypedData_v4') return '0x' + 'ab'.repeat(32) + 'cd'.repeat(32) + '1b';
    throw new Error('unsupported in demo: ' + method);
  }};
  seedAccount();
  window.__HL_MOCK = {USER, AGENT_KEY, AGENT_ADDR, DEMO_PIN, state: S, setPx: (c, mult) => { bump[c] = mult; }, tick: tickOrders, mark, perps, spots, tokens, info, place, exchange, candles, book};
})();
