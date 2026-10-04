# 解説動画の作り方

デモ画面を録画し、日本語のナレーションと字幕を重ねて mp4 にします（`stage.html` が Windows 風のブラウザ枠・カーソル・字幕の帯）。

```
python3 -m venv /tmp/vv && . /tmp/vv/bin/activate
pip install imageio-ffmpeg pillow numpy pyopenjtalk-plus
cd video
node storyboard.js > audio/texts.json      # 台本（storyboard.js）から読み上げの文を書き出す
python tts.py 1.0                           # 音声（Open JTalk）と長さ audio/manifest.json
FAST=1 node record.js                       # 動作確認だけ（待たない。out/shots に場面ごとの画面）
node record.js                              # 本番の録画（音声の長さに合わせて進める。約7分）
python mux.py                               # out/hl-trade-guide.mp4
```

- 台本を直すときは `storyboard.js`（`say` は読み上げ用にカタカナ・ひらがな、`cap` が字幕）。
- 取引所や、ウォレットの実際の画面は、ここでは撮れないので「イメージ図」のカードにしてある。
  本物の画面写真を使うときは、`storyboard.js` の `C.deposit` などのカードを、`<img src="…">` を入れたものに差し替える。
