import json, re, sys, time, urllib.request, urllib.error, io
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

BASE = "https://tmmygu40-dot.github.io/ai-agent-honbu-public"

with open("index.html", encoding="utf-8") as f:
    html = f.read()

m = re.search(r'id="all-apps"[^>]*>(.*?)</ul>', html, re.DOTALL)
if not m:
    print("ERROR: #all-apps が見つかりません")
    sys.exit(1)

apps = re.findall(r'href="\./([^/"]+)/', m.group(1))
print(f"チェック対象: {len(apps)} 件\n")

results = []
ok = warn = ng = 0

for app in apps:
    url = f"{BASE}/{app}/"
    entry = {"app": app, "url": url, "status": None, "title": "", "blank": False, "js_suspect": False, "result": "", "note": ""}

    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=10) as res:
            entry["status"] = res.status
            body = res.read().decode("utf-8", errors="replace")

        tm = re.search(r"<title[^>]*>(.*?)</title>", body, re.IGNORECASE | re.DOTALL)
        entry["title"] = tm.group(1).strip() if tm else ""

        bm = re.search(r"<body[^>]*>(.*?)</body>", body, re.IGNORECASE | re.DOTALL)
        body_text = bm.group(1).strip() if bm else body
        entry["blank"] = len(body_text) < 100

        js_keywords = ["SyntaxError", "ReferenceError", "TypeError", "Uncaught"]
        entry["js_suspect"] = any(k in body for k in js_keywords)

        issues = []
        if entry["status"] != 200:
            issues.append(f"HTTP {entry['status']}")
        if not entry["title"]:
            issues.append("タイトルなし")
        if entry["blank"]:
            issues.append("ページ空")
        if entry["js_suspect"]:
            issues.append("JSエラー疑い")

        if not issues:
            entry["result"] = "OK"
            ok += 1
        elif entry["blank"] or entry["status"] != 200:
            entry["result"] = "NG"
            entry["note"] = " / ".join(issues)
            ng += 1
        else:
            entry["result"] = "WARN"
            entry["note"] = " / ".join(issues)
            warn += 1

    except urllib.error.HTTPError as e:
        entry["status"] = e.code
        entry["result"] = "NG"
        entry["note"] = f"HTTP {e.code}"
        ng += 1
    except Exception as e:
        entry["result"] = "NG"
        entry["note"] = f"接続エラー: {e}"
        ng += 1

    icon = {"OK": "OK", "WARN": "WARN", "NG": "NG"}.get(entry["result"], "?")
    print(f"  [{icon}] {app}  {entry['note']}")
    results.append(entry)
    time.sleep(0.3)

ts = datetime.now().strftime("%Y%m%d_%H%M%S")

with open("check-report.json", "w", encoding="utf-8") as f:
    json.dump({"checked_at": ts, "total": len(apps), "ok": ok, "warn": warn, "ng": ng, "results": results}, f, ensure_ascii=False, indent=2)

issues_only = [r for r in results if r["result"] != "OK"]
with open("check-report.md", "w", encoding="utf-8") as f:
    f.write(f"# 公開後チェック結果 {ts}\n\n")
    f.write(f"- 総数: {len(apps)} 件 / OK: {ok} / WARN: {warn} / NG: {ng}\n\n")
    if issues_only:
        f.write("## 要確認・修正候補\n\n")
        f.write("| 結果 | アプリ名 | URL | 問題 |\n|---|---|---|---|\n")
        for r in issues_only:
            f.write(f"| {r['result']} | {r['app']} | {r['url']} | {r['note']} |\n")
    else:
        f.write("## 全件OK\n")

print(f"\n結果: OK {ok} / WARN {warn} / NG {ng}")
print(f"詳細: check-report.json")
print(f"要確認: check-report.md")
