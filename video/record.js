// 録画：台本を順に実行して、画面を動画（webm）に録る。各場面の開始時刻を timeline.json に残す（音声を重ねる位置）
//   node record.js            本番（音声の長さに合わせて進める。audio/manifest.json が要る）
//   FAST=1 node record.js     動作確認だけ（待たない・場面ごとに画面を保存）
const fs = require('fs'), path = require('path');
const L = require('../tests/lib'), rig = require('./rig'), { beats } = require('./storyboard');
const OUT = process.env.OUT || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const FAST = !!process.env.FAST;
const man = FAST ? null : JSON.parse(fs.readFileSync(path.join(__dirname, 'audio', 'manifest.json'), 'utf8'));
(async () => {
  const b = await L.launch();
  const t0 = Date.now();
  const S = await rig.start(b, { fast: FAST, video: FAST ? undefined : path.join(OUT, 'vid') });
  S.page.on('framenavigated', f => console.log('NAV', f.url().slice(-50)));
  const tl = []; const shots = path.join(OUT, 'shots'); if (FAST) fs.mkdirSync(shots, { recursive: true });
  await S.card(beatsFirstCard()); await S.wait(300);
  const tStart = Date.now();
  for (let i = 0; i < beats.length; i++){
    const bt = beats[i], t = Date.now();
    await S.stage('cap', bt.cap);
    const dur = FAST ? 0 : man[i].dur * 1000 + 450;
    tl.push({ id: i, t: (t - t0) / 1000, dur: dur / 1000 });
    console.log('beat', i, bt.say.slice(0, 20)); try { await Promise.all([bt.act(S), FAST ? null : S.page.waitForTimeout(dur)]); }
    catch (e) { console.log('beat', i, 'FAILED:', e.message.split('\n')[0]); if (FAST) await S.shot(path.join(shots, `fail-${i}.png`)); else throw e; }
    if (FAST) await S.shot(path.join(shots, `b${String(i).padStart(2, '0')}.png`));
  }
  await S.stage('cap', null); await S.page.waitForTimeout(FAST ? 0 : 800);
  fs.writeFileSync(path.join(OUT, 'timeline.json'), JSON.stringify({ t0Start: (tStart - t0) / 1000, beats: tl, end: (Date.now() - t0) / 1000 }, null, 1));
  console.log('errors:', S.errors.length ? S.errors : 'none');
  await S.r.ctx.close(); await b.close();
})();
function beatsFirstCard(){ return `<h1>HL トレード画面 かんたんガイド</h1><p class="sub">ウォレットをつなぐところから、最初の注文まで</p><p class="sub" style="margin-top:34px;font-size:22px">※ 画面は練習用の架空のデータです。実際のお金は動きません。</p>`; }
