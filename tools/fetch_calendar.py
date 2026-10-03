"""今週の経済指標の予定（Forex Factory の公開 JSON）を取り、暗号資産に効きやすい米国・日本の重要指標だけを calendar.json に書く。
GitHub Actions から定期的に動かす（ブラウザから直接は取れないため）。標準ライブラリだけで動く。"""
import json, sys, urllib.request
from datetime import datetime, timezone

URLS = ["https://nfs.faireconomy.media/ff_calendar_thisweek.json"]
JA = [  # 英語の名前の一部 → 日本語（上から順に当てる）
    ("Core CPI", "米 コアCPI（物価）"), ("CPI", "米 消費者物価指数（CPI）"),
    ("Core PPI", "米 コアPPI（物価）"), ("PPI", "米 生産者物価指数（PPI）"),
    ("Non-Farm", "米 雇用統計（就業者数）"), ("Unemployment Rate", "米 失業率"), ("Average Hourly", "米 平均時給"),
    ("Unemployment Claims", "米 新規失業保険申請"), ("JOLTS", "米 求人件数（JOLTS）"), ("ADP", "米 ADP雇用"),
    ("Core PCE", "米 コアPCE物価"), ("PCE", "米 PCE物価"), ("GDP", "米 GDP"),
    ("Retail Sales", "米 小売売上高"), ("ISM Manufacturing", "米 ISM製造業景況"), ("ISM Services", "米 ISM非製造業景況"),
    ("FOMC Statement", "FOMC 声明"), ("Federal Funds Rate", "FOMC 政策金利"), ("FOMC Press Conference", "FRB 議長会見"),
    ("FOMC Meeting Minutes", "FOMC 議事録"), ("Fed Chair", "FRB 議長の発言"), ("Prelim UoM Consumer Sentiment", "米 ミシガン大消費者信頼感"),
    ("BOJ Policy Rate", "日銀 政策金利"), ("Monetary Policy Statement", "日銀 声明"), ("BOJ Press Conference", "日銀 総裁会見"),
    ("Tokyo Core CPI", "東京 コアCPI"),
]
def ja(title, country):
    mine = ("米", "FOMC", "FRB") if country == "USD" else ("日銀", "東京")
    for k, v in JA:
        if k.lower() in title.lower() and v.startswith(mine):
            return v
    return ("米 " if country == "USD" else "日本 ") + title

out = []
for u in URLS:
    req = urllib.request.Request(u, headers={"User-Agent": "hl-trade-calendar/1.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        data = json.load(r)
    for e in data:
        if e.get("country") not in ("USD", "JPY") or e.get("impact") != "High":
            continue
        try:
            t = datetime.fromisoformat(e["date"]).astimezone(timezone.utc)
        except Exception:
            continue
        out.append({"t": t.strftime("%Y-%m-%dT%H:%M:%SZ"), "title": ja(e["title"], e["country"]), "en": e["title"],
                    "imp": 3, "tag": "指標", "forecast": e.get("forecast") or "", "previous": e.get("previous") or ""})
out.sort(key=lambda x: x["t"])
json.dump({"updated": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "events": out},
          open("calendar.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(len(out), "events")
