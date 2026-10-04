// 台本：1つの場面（beat）＝ 読み上げる1文（say）＋ 画面の動き（act）。字幕は cap（なければ say）。
// say は音声合成が読み間違えないよう、英字をカタカナにしてある。cap は画面に出す字幕。
const box = (n, h, p) => `<div class="box"><div class="n">${n}</div><h3>${h}</h3><p>${p}</p></div>`;
const C = {
  title: `<h1>HL トレード画面 かんたんガイド</h1><p class="sub">ウォレットをつなぐところから、最初の注文まで</p><p class="sub" style="margin-top:34px;font-size:22px">※ 画面は練習用の架空のデータです。実際のお金は動きません。</p>`,
  need: `<h2>はじめに 用意するもの</h2><div class="row">${box('①', 'ウォレット', 'MetaMask・Phantom・Rabby など。0x で始まるアドレス（EVM）のものを使います。')}${box('②', '入金ずみの口座', 'Hyperliquid に USDC を入金します。入金してはじめて、口座が使えます。')}${box('③', 'この画面', 'ツールの提供だけです。お金は預かりません。資金はずっとあなたの口座にあります。')}</div>`,
  deposit: `<h2>入金のしかた（公式サイトで行います）</h2><ol><li><code>app.hyperliquid.xyz</code> を開き、同じウォレットをつなぐ</li><li>「Deposit（入金）」を押す</li><li>Arbitrum ネットワークの USDC を入金する</li><li>反映されたら、残高が 0 でないことを確かめる</li></ol><p class="sub" style="margin-top:26px;font-size:22px">手数料用に少額の ETH（Arbitrum）が必要なことがあります。最低入金額は公式の案内で確認してください。</p>`,
  apiMock: `<h2>Hyperliquid の API の画面（自分で鍵を作る場合）</h2>
    <div style="background:#10192e;border:2px solid #2d4a82;border-radius:16px;padding:26px 34px;width:1060px;text-align:left;font-size:26px;line-height:2.1">
      <div style="color:#8da2cf;font-size:20px">app.hyperliquid.xyz › More › API</div>
      <div>① メニューの <b>More</b> から <b>API</b> を開く</div>
      <div>② Name <span style="background:#0a1630;border:1px solid #2d4a82;border-radius:8px;padding:2px 16px;margin:0 8px">my-key</span><span style="background:#ffd43b;color:#111;border-radius:8px;padding:3px 16px;font-weight:700">Generate</span></div>
      <div>③ <span style="background:#ffd43b;color:#111;border-radius:8px;padding:3px 16px;font-weight:700">Authorize API Wallet</span> を押して、ウォレットで署名</div>
      <div>④ 表示された秘密鍵 <span style="background:#0a1630;border:1px solid #2d4a82;border-radius:8px;padding:2px 16px">0x9f3a…</span> を、<b style="color:#ff8d8d">その場でコピー</b>（あとから見られません）</div>
    </div>`,
  bye: `<h1>おつかれさまでした</h1><p class="sub">まずは、ごく少額から試してください</p><p class="sub" style="margin-top:30px;font-size:24px;line-height:1.7">この画面が使えないときも、同じウォレットで<br>Hyperliquid の公式サイトにつなげば、取引も決済もできます。</p>`,
};
const TAG = 'イメージ図（実際の画面とは少し違うことがあります）';
const TAG_REAL = 'Hyperliquid 公式サイトの実際の画面（個人情報は黒塗りしています）';
// 実際の画面の写真。rb は強調の枠（元の画像の座標 x1,y1,x2,y2 を割合にして重ねる）
const shot = (src, w, h, wpx, rbs) => `<div class="shot" style="width:${wpx}px"><img src="real/${src}" style="width:${wpx}px">${rbs.map(([id, x1, y1, x2, y2]) => `<div class="rb" data-id="${id}" style="left:${x1 / w * 100}%;top:${y1 / h * 100}%;width:${(x2 - x1) / w * 100}%;height:${(y2 - y1) / h * 100}%"></div>`).join('')}</div>`;
C.depositShot = shot('deposit.png', 1054, 755, 960, [['d1', 255, 358, 752, 508], ['d2', 325, 322, 684, 348], ['d3', 255, 525, 752, 572]]);
C.apiShot = shot('api.png', 1919, 903, 1500, [['a1', 312, 198, 882, 240], ['a2', 1370, 202, 1448, 236], ['a3', 1452, 198, 1608, 240], ['a4', 306, 266, 1616, 374]]);
const B = [];
const beat = (say, act, cap) => B.push({ say, act, cap: cap || say });

// --- 1. はじめに ---
beat('この動画では、エイチエル トレード画面の使い方を、ウォレットをつなぐところから、最初の注文を出すところまで、順番に説明します。', async S => { await S.card(C.title); await S.wait(300); },
  'この動画では、HL トレード画面の使い方を、ウォレットをつなぐところから、最初の注文を出すところまで、順番に説明します。');
beat('画面は、練習用の架空のデータです。動画の中では、実際のお金は動きません。', async S => {});
beat('はじめに、用意するものは三つです。ひとつ目は、ウォレット。ふたつ目は、ハイパーリキッドの口座に入れておく、ユーエスディーシー。三つ目が、この画面です。', async S => { await S.card(C.need); },
  'はじめに、用意するものは三つです。ひとつ目はウォレット。ふたつ目は、Hyperliquid の口座に入れておく USDC。三つ目が、この画面です。');
beat('この画面は、取引画面を提供するだけのツールです。お金を預かることはなく、資金は、いつもあなたの口座にあります。', async S => {});
// --- 2. 入金 ---
beat('まず、入金です。ハイパーリキッドの公式サイトを開き、同じウォレットをつないで、ディポジットのボタンを押します。', async S => { await S.card(C.depositShot, TAG_REAL); },
  'まず入金です。Hyperliquid の公式サイトを開き、同じウォレットをつないで、Deposit のボタンを押します。');
beat('こういう画面が出ます。アセットは、ユーエスディーシー。ディポジット チェーンは、アービトラムを選びます。その下の欄に、入金する金額を入れます。', async S => { await S.stage('rb', 'd1'); },
  'こういう画面が出ます。Asset は USDC、Deposit Chain は Arbitrum を選びます。その下の欄に、入金する金額を入れます。');
beat('入金すると、ゼロ点二ユーエスディーシーの手数料が、入金した額から引かれます。', async S => { await S.stage('rb', 'd2'); },
  '入金すると、0.2 USDC の手数料が、入金した額から引かれます。');
beat('ウォレットが別のネットワークにつながっているときは、このボタンで、アービトラムに切り替えてから、入金します。', async S => { await S.stage('rb', 'd3'); },
  'ウォレットが別のネットワークにつながっているときは、このボタンで Arbitrum に切り替えてから、入金します。');
beat('入金が済むまでは、口座も、注文用の鍵も使えません。必ず、先に入金を済ませてください。', async S => { await S.stage('rb', ''); });
// --- 3. 画面を開く・規約 ---
beat('入金ができたら、この画面を開きます。最初に、利用規約の確認が出ます。', async S => { await S.card(null); await S.stage('url', 'hl-trade.pbot-relay.workers.dev'); await S.wait(500); await S.hl('#modal', null); },
  '入金ができたら、この画面を開きます。最初に、利用規約の確認が出ます。');
beat('大事なのは、三つです。これはツールの提供だけであること。使えなくなっても、運営者は責任を負わないこと。そして、使えないときは、同じウォレットで公式サイトにつなげば、取引も決済もできることです。', async S => { await S.hlOff(); await S.hl('#mExtra ul', null); await S.wait(300); });
beat('内容を読んだら、四つのチェックを入れて、確認しました、を押します。', async S => {
  await S.hlOff();
  for (let i = 0; i < 4; i++) await S.click(`#mExtra .tc >> nth=${i}`, { fx: .5 });
  await S.click('#tGo');
  await S.wait(600);
});
// --- 4. ウォレット接続 ---
beat('画面の上に、はじめの四つのステップが出ます。ウォレットをつなぐ。入金する。注文用の鍵を作る。そして、注文する、です。', async S => { await S.frame.waitForSelector('#startBar:not([hidden])'); await S.top(); await S.hl('#startBar', null); });
beat('それでは、右上の、ウォレット接続を押して、ウォレットを選びます。', async S => { await S.hlOff(); await S.click('#walletBtn'); await S.frame.waitForSelector('#wpList .wi'); await S.hl('#modal', null); },
  'それでは、右上の「ウォレット接続」を押して、ウォレットを選びます。');
beat('実際には、ここでウォレットの画面が開くので、接続を許可します。パソコンでも、スマホでも、手順は同じです。', async S => { await S.hlOff(); await S.click('#wpList .wi >> nth=0'); await S.wait(1500); });
beat('つながると、右上に短いアドレスが出て、口座の残高と、使える余力が表示されます。', async S => { await S.top(); await S.hl('.kpis', null, 'below'); await S.wait(800); },
  'つながると、右上に短いアドレスが出て、口座の残高と、使える余力が表示されます。');
// --- 5. 画面の見方 ---
beat('画面の見方です。上の帯が、銘柄です。ビットコインやイーサなど、好きな銘柄を選べます。', async S => { await S.hlOff(); await S.top(); await S.hl('#coins', '銘柄', 'below'); });
beat('中央が、ローソク足のチャートです。足の長さや、平均線などの指標も切り替えられます。', async S => { await S.hl('#chartBox', 'チャート', 'below'); });
beat('右が、注文の欄です。ロングかショートか、金額、レバレッジを決めて注文します。', async S => { await S.hl('#ticket', '注文の欄', 'below'); });
beat('下には、持っているポジションや、待っている注文が並びます。', async S => { await S.hl('#aTbl', 'ポジション・注文', 'below'); await S.wait(300); });
// --- 6. 練習の注文 ---
beat('では、注文を出してみましょう。最初は練習モードなので、注文は取引所に送られません。', async S => { await S.hlOff(); },
  'では、注文を出してみましょう。最初は「練習モード」なので、注文は取引所に送られません。');
beat('上がると思うときは、ロング。下がると思うときは、ショートを選びます。ここでは、ロングにします。', async S => { await S.click('#side button[data-v="1"]'); });
beat('注文額を入れます。ここは、レバレッジをかけたあとの、たてぎょくの大きさです。百ドルにします。', async S => { await S.type('#sz', '100', { clear: true }); });
beat('下のボタンを押すと、注文の確認が出ます。数量、必要な証拠金、清算価格の目安、手数料を、必ず確かめてください。', async S => { await S.click('#submit'); await S.frame.waitForSelector('#modal', { state: 'visible' }); await S.wait(600); await S.hl('#modal', null); await S.wait(800); });
beat('練習モードでは、中身を見るだけで、注文は出ません。確認を閉じます。', async S => { await S.hlOff(); await S.click('#mClose'); await S.wait(300); });
// --- 7. 本番の準備：鍵を作る ---
beat('本番で注文を出すには、注文用の鍵が必要です。毎回ウォレットで署名する代わりに、この端末の中に、注文だけができる鍵を作ります。この鍵では、出金や送金はできません。', async S => { await S.click('#modeBtn'); await S.frame.waitForSelector('#wlGo'); await S.wait(600); await S.hl('#modal', null); });
beat('暗証番号を、数字六桁から十二桁で、二回入れます。鍵を開くときに使うので、忘れないでください。', async S => { await S.hlOff(); await S.type('#lvPin', '482913'); await S.type('#lvPin2', '482913'); });
beat('ウォレットをつないで鍵を作る、を押します。ウォレットの署名画面が開くので、内容を確かめて署名します。これで、鍵が口座に登録されます。', async S => {
  await S.click('#wlGo');
  await S.note('ここで、ウォレットの署名画面が開きます（イメージ）', 520, 140);
  await S.wait(1800); await S.frame.waitForSelector('#lvTest', { timeout: 15000 }); await S.note(null);
},
  '「ウォレットをつないで鍵を作る」を押します。ウォレットの署名画面が開くので、内容を確かめて署名します。これで、鍵が口座に登録されます。');
beat('つながりを確かめるを押して、取引所が鍵を受け付けるか、確認します。お金は動きません。', async S => { await S.click('#lvTest'); await S.wait(1500); },
  '「つながりを確かめる」を押して、取引所が鍵を受け付けるか確認します。お金は動きません。');
beat('確認できたら、本番に切り替えます。切り替えたあとは、ボタンを押すと、本当に注文が出ます。', async S => { await S.click('#lvOn'); await S.wait(500); await S.click('#lvOn').catch(() => {}); await S.wait(700); await S.frame.evaluate(() => closeModal()); await S.wait(400); });
// --- 8. 本番の注文・決済 ---
beat('本番の注文です。今度は、ショートを選んで、注文額を二百ドルにします。', async S => { await S.click('#side button[data-v="-1"]'); await S.type('#sz', '200', { clear: true }); });
beat('注文のボタンを押し、確認の内容をよく見て、注文する、を押します。', async S => { await S.click('#submit'); await S.frame.waitForSelector('#mOk', { state: 'visible' }); await S.hl('#modal', null); await S.wait(900); await S.hlOff(); await S.click('#mOk'); await S.wait(1200); },
  '注文のボタンを押し、確認の内容をよく見て、「注文する」を押します。');
beat('約定すると、完了の画面が出ます。閉じると、下のポジションの欄に出て、含み損益も、ここで見られます。', async S => { await S.wait(800); await S.hlOff(); await S.click('#mClose'); await S.wait(500); await S.hl('#aTbl', 'ポジション', 'below'); });
beat('決済するときは、ポジションの、決済ボタンを押します。半分だけ決済することもできます。', async S => { await S.hlOff(); await S.click('#aTbl [data-act=close]'); await S.frame.waitForSelector('#mOk', { state: 'visible' }); await S.wait(900); });
beat('確認して、決済すると、ポジションが閉じます。', async S => { await S.click('#mOk'); await S.wait(1500); await S.frame.evaluate(() => { try { closeModal(); } catch (e) {} }); });
// --- 9. API を自分で作る ---
beat('ここからは、ハイパーリキッドの、エーピーアイの鍵を、自分で作りたい人向けの説明です。自動で作る方法で困らなければ、飛ばして大丈夫です。', async S => { await S.card(C.apiShot, TAG_REAL); },
  'ここからは、Hyperliquid の API の鍵を自分で作りたい人向けの説明です。自動で作る方法で困らなければ、飛ばして大丈夫です。');
beat('公式サイトのメニューの、モアから、エーピーアイのページを開きます。上の欄に、鍵の名前を入れます。', async S => { await S.stage('rb', 'a1'); },
  '公式サイトのメニューの More から、API のページを開きます。上の欄に、鍵の名前を入れます。');
beat('右の、ジェネレートを押すと、新しい鍵のアドレスが作られます。', async S => { await S.stage('rb', 'a2'); },
  '右の Generate を押すと、新しい鍵のアドレスが作られます。');
beat('続いて、オーソライズ エーピーアイ ウォレットを押して、ウォレットで署名します。これで、鍵が口座に登録されます。', async S => { await S.stage('rb', 'a3'); },
  '続いて、Authorize API Wallet を押して、ウォレットで署名します。これで、鍵が口座に登録されます。');
beat('登録した鍵は、下の表に並びます。有効期限も出ていて、リムーブで、いつでも取り消せます。', async S => { await S.stage('rb', 'a4'); },
  '登録した鍵は、下の表に並びます。有効期限も出ていて、Remove で、いつでも取り消せます。');
beat('生成された秘密鍵は、その場でコピーしてください。あとからは見られません。人に見せたり、メールやチャットに貼ったりしないでください。', async S => { await S.stage('rb', ''); });
beat('作った鍵は、この画面の、本番の設定にある、すでに作った鍵を使う、に貼り付けて、暗証番号をかけて保存します。', async S => { await S.card(null); await S.frame.evaluate(() => { store.set('guideTab', 'gk'); setPage('help'); }); await S.wait(900); await S.hl('#vHelp .gtabs', null, 'below'); },
  '作った鍵は、この画面の本番の設定にある「すでに作った鍵を使う」に貼り付けて、暗証番号をかけて保存します。');
beat('この手順は、画面の、使い方のページにも、写真つきで載っています。いつでも見返せます。', async S => { await S.hlOff(); await S.wait(300); await S.frame.evaluate(() => scrollTo(0, 420)); },
  'この手順は、画面の「使い方」のページにも、写真つきで載っています。いつでも見返せます。');
// --- 10. おわりに ---
beat('最後に、大事なことです。取引には、お金をすべて失うリスクがあります。必ず、少額から試してください。', async S => { await S.card(C.bye); });
beat('この画面が使えなくなったときは、同じウォレットで、ハイパーリキッドの公式サイトにつなげば、取引も決済もできます。それでは、安全に、お使いください。', async S => {},
  'この画面が使えなくなったときは、同じウォレットで Hyperliquid の公式サイトにつなげば、取引も決済もできます。それでは、安全にお使いください。');
module.exports = { beats: B };
if (require.main === module) console.log(JSON.stringify(B.map((b, i) => ({ id: i, say: b.say })), null, 1));
