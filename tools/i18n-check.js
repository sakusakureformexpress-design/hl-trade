#!/usr/bin/env node
// 訳文の点検：index.html の中の「日本語の文」が、すべて訳文表（ko・en）にあるかを調べる。
//   node tools/i18n-check.js [index.html]
// 画面を直したあとに回すと、訳し忘れ・包み忘れ（_() を通していない日本語）・古くなった訳文が分かる。
// 依存：npm i acorn acorn-walk（このスクリプトの置き場所で）
const fs = require('fs'), vm = require('vm'), path = require('path');
let acorn, walk; try { acorn = require('acorn'); walk = require('acorn-walk'); } catch { console.error('先に npm i acorn acorn-walk を実行してください'); process.exit(2); }
const FILE = process.argv[2] || path.join(__dirname, '..', 'index.html');
const RAW = new Set(['IVS','KIND_JA','DIR_JA','ST_JA','PERIODS','ERR_JA','SORTS','LANGS','LOC_DEF','CONN']);   // 日本語のまま持って、使う所で _() を通す表
const CJK = /[぀-ヿ㐀-鿿ｦ-ﾟ]/;
const html = fs.readFileSync(FILE, 'utf8');
const src = html.match(/<script>\n([\s\S]*?)<\/script>/)[1];
const dictSrc = html.match(/<script id="dict">([\s\S]*?)<\/script>/)[1];
const ctx = { window: {} }; vm.createContext(ctx); vm.runInContext(dictSrc, ctx); const DICT = ctx.window.__DICT;
const ast = acorn.parse(src, { ecmaVersion: 2022, sourceType: 'script', locations: true });
const keys = new Map(), left = [];
const leaves = (n, o) => { if (!n) return; if (n.type === 'Literal' && typeof n.value === 'string') o.push(n.value); else if (n.type === 'ConditionalExpression'){ leaves(n.consequent, o); leaves(n.alternate, o); } else if (n.type === 'LogicalExpression'){ leaves(n.left, o); leaves(n.right, o); } else if (n.type === 'TemplateLiteral' && !n.expressions.length) o.push(n.quasis[0].value.cooked); else if (n.type === 'BinaryExpression' && n.operator === '+'){ leaves(n.left, o); leaves(n.right, o); } };
const isCall = a => a.type === 'CallExpression' && a.callee.type === 'Identifier' && a.callee.name === '_';
walk.ancestor(ast, {
  CallExpression(n){ if (isCall(n)){ const o = []; leaves(n.arguments[0], o); o.forEach(k => keys.set(k, n.loc.start.line)); } },
  Literal(n, st, anc){
    if (typeof n.value !== 'string' || !CJK.test(n.value)) return;
    const p = anc[anc.length - 2]; if (p && p.type === 'Property' && p.key === n && !p.computed) return;
    const decl = anc.find(a => a.type === 'VariableDeclarator' && a.id.name && RAW.has(a.id.name));
    if (decl){ if (decl.id.name !== 'LANGS') keys.set(n.value, n.loc.start.line); } else if (!anc.some(isCall)) left.push([n.loc.start.line, n.value.slice(0, 60)]);
  },
  TemplateLiteral(n, st, anc){ if (n.quasis.some(q => CJK.test(q.value.cooked || '')) && !anc.some(isCall)) left.push([n.loc.start.line, '`' + n.quasis.map(q => q.value.cooked).join('${…}').slice(0, 60)]); },
});
const body = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');   // HTML に最初から書いてある文字
for (const m of body.matchAll(/>([^<>]+)</g)){ const v = m[1].trim(); if (CJK.test(v)) keys.set(v, 'html'); }
for (const m of body.matchAll(/\s(?:title|placeholder|aria-label)="([^"]*)"/g)) if (CJK.test(m[1])) keys.set(m[1], 'html');
let bad = 0;
if (left.length){ bad++; console.log(`_() を通していない日本語が ${left.length} か所`); left.slice(0, 30).forEach(([l, t]) => console.log(`  行${l}: ${t}`)); }
for (const lang of ['ko', 'en']){
  const miss = [...keys.keys()].filter(k => !(k in DICT[lang])), stale = Object.keys(DICT[lang]).filter(k => !keys.has(k));
  if (miss.length){ bad++; console.log(`[${lang}] 訳文表にない文 ${miss.length} 件`); miss.slice(0, 40).forEach(k => console.log('  ' + JSON.stringify(k))); }
  if (stale.length) console.log(`[${lang}] 使われていない訳文 ${stale.length} 件（消してかまいません）`);
  const ph = (s) => (s.match(/\{\d+\}/g) || []).sort().join();
  for (const k of keys.keys()) if (k in DICT[lang] && ph(k) !== ph(DICT[lang][k])){ bad++; console.log(`[${lang}] {0} などの数が合わない: ${JSON.stringify(k)}`); }
}
console.log(bad ? '問題あり' : `問題なし（${keys.size} 文 × ko・en）`); process.exit(bad ? 1 : 0);
