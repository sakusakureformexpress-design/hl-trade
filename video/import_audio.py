# 自分で用意した音声（花音など）を取り込む。audio_ext/ に b00.wav, b01.wav … （mp3 / m4a / flac でも可）を置いて実行する
#   python import_audio.py [audio_ext]
# 48kHz・モノラルのwavに直し、前後に少し間をつけて audio/ に置き、長さを audio/manifest.json に書く（録画はこの長さに合わせて進む）
import sys, os, glob, json, wave, subprocess, numpy as np, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe(); src = sys.argv[1] if len(sys.argv) > 1 else 'audio_ext'
n = len(json.load(open('audio/texts.json'))) if os.path.exists('audio/texts.json') else None
man = []; os.makedirs('audio', exist_ok=True)
for i in range(n or 999):
    c = [f for f in glob.glob(f'{src}/b{i:02d}.*') if f.lower().rsplit('.', 1)[-1] in ('wav', 'mp3', 'm4a', 'flac', 'ogg', 'aac')]
    if not c:
        if n: sys.exit(f'足りません: {src}/b{i:02d}.wav')
        break
    tmp = f'audio/_t{i:02d}.wav'
    subprocess.run([FF, '-y', '-i', c[0], '-ac', '1', '-ar', '48000', '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', tmp], check=True, stderr=subprocess.DEVNULL)
    w = wave.open(tmp, 'rb'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64); sr = w.getframerate(); w.close(); os.remove(tmp)
    pk = np.max(np.abs(x)) or 1; x = x / pk * 0.89 * 32767
    y = np.concatenate([np.zeros(int(sr * .12)), x, np.zeros(int(sr * .12))]).astype(np.int16)
    f = f'audio/b{i:02d}.wav'; w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes()); w.close()
    man.append({'id': i, 'file': f, 'dur': len(y) / sr, 'sr': sr})
json.dump(man, open('audio/manifest.json', 'w'), indent=1)
print(len(man), 'files, total', round(sum(m['dur'] for m in man), 1), 's')
