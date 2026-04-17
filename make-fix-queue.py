import json, sys, io
from datetime import datetime
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")

with open("check-report.json", encoding="utf-8") as f:
    report = json.load(f)

issues = [r for r in report["results"] if r["result"] != "OK"]

output = {
    "source_checked_at": report["checked_at"],
    "queued_at": datetime.now().strftime("%Y%m%d_%H%M%S"),
    "total_checked": report["total"],
    "fix_count": len(issues),
    "queue": issues
}

with open("fix-queue.json", "w", encoding="utf-8") as f:
    json.dump(output, f, ensure_ascii=False, indent=2)

if len(issues) == 0:
    print("修正不要: 全件OK")
else:
    print(f"修正候補: {len(issues)} 件")
    for r in issues:
        print(f"  [{r['result']}] {r['app']}  {r['note']}")

print("出力: fix-queue.json")
