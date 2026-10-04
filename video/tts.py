# 台本の say を、日本語の音声（Open JTalk）にして audio/ に書き出す。長さを manifest.json に残す
import json, sys, wave, numpy as np, pyopenjtalk
SPEED = float(sys.argv[1]) if len(sys.argv) > 1 else 0.95
texts = json.load(open('audio/texts.json'))
man = []
for t in texts:
    x, sr = pyopenjtalk.tts(t['say'], speed=SPEED)
    x = np.asarray(x, dtype=np.float64)
    pk = np.max(np.abs(x)) or 1; x = x / pk * 0.89 * 32767   # 音量をそろえる
    pad = np.zeros(int(sr * 0.12))
    y = np.concatenate([pad, x, pad]).astype(np.int16)
    f = f"audio/b{t['id']:02d}.wav"
    w = wave.open(f, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes(y.tobytes()); w.close()
    man.append({'id': t['id'], 'file': f, 'dur': len(y) / sr, 'sr': sr})
json.dump(man, open('audio/manifest.json', 'w'), indent=1)
print(len(man), 'files, total', round(sum(m['dur'] for m in man), 1), 's')
