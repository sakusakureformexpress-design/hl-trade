# 検証（tests）

画面は取引所の代わりに `../demo.js`（模擬取引所）につないで試します。本物の取引所にはつながりません。

```sh
cd tests
npm install                 # playwright, ethers, @msgpack/msgpack
npx playwright install chromium   # まだ入れていなければ
pip install hyperliquid-python-sdk eth-account   # 署名の照合に使う公式 SDK
./run-all.sh                # 全部を順に回して、最後に一覧を出す
```

| ファイル | 確かめること |
|---|---|
| `smoke.js` | 日本語・韓国語・英語 × PC・スマホで、エラーなく開く |
| `offline.js` | 取引所につながらないとき、止まらずに言語に合わせた案内が出る。使っている外部の宛先の一覧 |
| `i18n_scan.js` | 韓国語・英語の全画面に、日本語の取りこぼし・`{0}` の差し込み忘れ・訳文表にない文がない |
| `switch.js` | 画面で言語を切り替えたあとの表示が、最初からその言語で開いたときと一致する（9 つの画面 × 6 通り） |
| `flows.js` | 鍵を開ける → 手数料を承認 → 成行・指値・取り消し・利確損切の変更・ドテン・全部決済・現物。**取引所に送る署名を、画面とは別の実装（msgpack + ethers）で検証** |
| `markets.js` | 全銘柄の読み込み・検索・並べ替え・お気に入り・分離のみの銘柄・現物・一覧ページ・4画面 |
| `parity.js` + `parity.py` | 署名を 250 通りランダムに作り、公式 Python SDK と数値まで一致するか |
| `mobile_pos.js` | スマホ・タブレット・パソコンの幅で、ポジションの表に銘柄名が見える（操作ボタンの列が隠さない） |
| `preview.js` | `tools/make-preview.py` で作った 1 枚のデモ版が動く |

`HL_HTML=/path/to/index.html` で、別のファイルを試せます。
