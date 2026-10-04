#!/bin/bash
# audio_ext/ に b00.wav … b44.wav が揃っているときに、取り込み → 録画 → 動画（軽い版）までを一度に行う
set -e
cd "$(dirname "$0")"
[ -d /tmp/vv ] || { python3 -m venv /tmp/vv; . /tmp/vv/bin/activate; pip -q install imageio-ffmpeg pillow numpy; } ; . /tmp/vv/bin/activate
node storyboard.js > audio/texts.json
python import_audio.py audio_ext
rm -rf out/vid; node record.js
python mux.py
FF=$(python -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())")
mkdir -p ../../videos 2>/dev/null || true
$FF -y -i out/hl-trade-guide.mp4 -c:v libx264 -preset slow -crf 28 -pix_fmt yuv420p -vf scale=1600:900 -c:a aac -b:a 96k -movflags +faststart out/hl-trade-guide-small.mp4 2>/dev/null
echo "できました: $(pwd)/out/hl-trade-guide-small.mp4"
