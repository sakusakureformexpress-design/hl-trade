# 録画（webm）に、場面ごとの音声を決まった位置に重ねて、mp4（H.264 + AAC）にする
import json, glob, subprocess, sys, os, wave, numpy as np, imageio_ffmpeg
FF = imageio_ffmpeg.get_ffmpeg_exe()
OUT = os.environ.get('OUT', 'out')
tl = json.load(open(f'{OUT}/timeline.json')); man = json.load(open('audio/manifest.json'))
vid = sorted(glob.glob(f'{OUT}/vid/*.webm'))[-1]
SR = man[0]['sr']
# 動画の先頭（読み込み中）を切り落とす。最初の場面の少し前から始める
lead = float(os.environ.get('LEAD', '0.0'))
start = tl['t0Start'] - 0.3 + lead
total = tl['end'] - start + 0.5
buf = np.zeros(int(total * SR) + SR, dtype=np.float32)
for b, m in zip(tl['beats'], man):
    w = wave.open(m['file'], 'rb'); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768; w.close()
    i = int((b['t'] - start + 0.05) * SR); buf[i:i + len(x)] += x[:len(buf) - i]
buf = np.clip(buf, -1, 1)
w = wave.open(f'{OUT}/narration.wav', 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((buf * 32767).astype(np.int16).tobytes()); w.close()
dst = os.environ.get('DST', f'{OUT}/hl-trade-guide.mp4')
subprocess.run([FF, '-y', '-ss', f'{start:.3f}', '-i', vid, '-i', f'{OUT}/narration.wav', '-t', f'{total:.3f}',
                '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-r', '25',
                '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-shortest', dst], check=True, stderr=subprocess.DEVNULL)
print(dst, round(total, 1), 's', os.path.getsize(dst) // 1024, 'KB')
