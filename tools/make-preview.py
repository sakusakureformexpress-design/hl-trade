#!/usr/bin/env python3
"""デモ版（模擬取引所つき・1ファイル）を作る。claude.ai の Artifact など「外に通信できない場所」で画面を試すためのもの。
  python3 tools/make-preview.py            → preview.html（<html>〜<body> の枠なし。Artifact に載せる形）
  python3 tools/make-preview.py --wrapped  → preview-wrapped.html（枠つき。ブラウザで直接開ける）
手数料の画面も見られるように、デモ版だけ手数料をオンにしている（index.html 本体の設定は変えない）。"""
import re, sys, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
s = (root / 'index.html').read_text(encoding='utf-8')
demo = (root / 'demo.js').read_text(encoding='utf-8')
s = re.sub(r"<script>if \(/\[\?&\]demo.*?</script>\n", '', s, count=1)           # ?demo で読み込む仕掛けは不要（中に入れる）
s = s.replace('<script id="dict">', '<script>\n' + demo.replace('</script>', '<\\/script>') + '\n</script>\n<script id="dict">', 1)
s = s.replace("const BUILDER = {addr:'', fee:0, required:true};", "const BUILDER = {addr:'0xfee0fee0fee0fee0fee0fee0fee0fee0fee0fee0', fee:30, required:true};", 1)
s = s.replace("const WC = {projectId:'',", "const WC = {projectId:'demo',", 1)
s = s.replace('<title>HL トレード画面</title>', '<title>HL Trading Demo</title>', 1)
head = re.search(r'<head>(.*?)</head>', s, re.S).group(1)
body = re.search(r'<body>(.*)</body>', s, re.S).group(1)
head = re.sub(r'<meta charset[^>]*>\n?|<meta name="viewport"[^>]*>\n?', '', head)
frag = head.strip() + '\n' + body.strip() + '\n'
if '--wrapped' in sys.argv:
    out = '<!doctype html>\n<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"></head><body>\n' + frag + '</body></html>\n'
    (root / 'preview-wrapped.html').write_text(out, encoding='utf-8'); print('preview-wrapped.html', len(out))
else:
    (root / 'preview.html').write_text(frag, encoding='utf-8'); print('preview.html', len(frag))
