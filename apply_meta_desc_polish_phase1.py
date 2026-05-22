#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_meta_desc_polish_phase1.py - 既存アプリ meta description 改善 Phase 1（100件 smoke 実修正）

設計書: docs-todo-inbox / QUALITY_RULES_MEMORY_PLAN.md §TP-25
位置付け: dry-run (apply_meta_desc_polish_dryrun.py) で安全確認済みの「desc末尾 = スマホでも快適に
         ご利用いただけます。」かつ 80〜100字の安全帯 **先頭100件のみ**を実修正する。

修正対象（1アプリ5箇所同時置換）:
- {slug}/index.html の meta description
- {slug}/index.html の og:description
- {slug}/index.html の twitter:description
- {slug}/index.html の JSON-LD "description"
- ai-site-index.json entries[].description

置換ルール:
- 末尾 「スマホでも快適にご利用いただけます。」
  → 「無料・登録不要・スマホ対応。」

絶対禁止:
- 101件目以降を触る
- title を触る
- desc に肉付け追加
- 末尾完全一致しないものを触る

使い方:
  python apply_meta_desc_polish_phase1.py            # 実行
  python apply_meta_desc_polish_phase1.py --dry-run  # 念のため dry-run も対応

出力:
  _public_audit/meta_desc_polish_phase1_report.md（実行結果サマリ）
  _public_audit/meta_desc_polish_phase1_result.json（機械可読・全件結果）
"""
import argparse
import json
import re
import sys
import random
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parent
AI_INDEX = REPO_ROOT / "ai-site-index.json"
OUT_DIR = REPO_ROOT / "_public_audit"

OLD_SUFFIX = "スマホでも快適にご利用いただけます。"
NEW_SUFFIX = "無料・登録不要・スマホ対応。"

MIN_LEN = 80
MAX_LEN = 100
SMOKE_LIMIT = 100

# 4箇所の検出パターン（dry-run と同じ）
PATTERNS = [
    ("meta",
     re.compile(r'(<meta\s+name=["\']description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("og",
     re.compile(r'(<meta\s+property=["\']og:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("twitter",
     re.compile(r'(<meta\s+name=["\']twitter:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("jsonld",
     re.compile(r'("description"\s*:\s*")([^"]+)(")')),
]


def replace_suffix(desc: str) -> str:
    if desc.endswith(OLD_SUFFIX):
        return desc[: -len(OLD_SUFFIX)] + NEW_SUFFIX
    return desc


def process_html(html_path: Path, before_desc: str, after_desc: str, dry: bool):
    """4箇所の description を一括置換。
    対象 desc が `before_desc` と一致するもののみを置換（他の desc は触らない）。
    返り値: dict {hit_count, written, errors}
    """
    if not html_path.is_file():
        return {"hit_count": 0, "written": False, "error": "html_not_found"}
    try:
        html = html_path.read_text(encoding="utf-8")
    except Exception as e:
        return {"hit_count": 0, "written": False, "error": f"read_error: {e}"}

    new_html = html
    hits = {"meta": 0, "og": 0, "twitter": 0, "jsonld": 0}

    for key, pat in PATTERNS:
        def _sub(m):
            captured = m.group(2)
            if captured == before_desc:
                hits[key] += 1
                return m.group(1) + after_desc + m.group(3)
            return m.group(0)
        new_html = pat.sub(_sub, new_html)

    total_hits = sum(hits.values())
    if total_hits == 0:
        return {"hit_count": 0, "written": False, "error": "no_match_in_html", "hits": hits}

    if dry:
        return {"hit_count": total_hits, "written": False, "hits": hits, "error": None}

    try:
        html_path.write_text(new_html, encoding="utf-8")
    except Exception as e:
        return {"hit_count": total_hits, "written": False, "hits": hits, "error": f"write_error: {e}"}

    return {"hit_count": total_hits, "written": True, "hits": hits, "error": None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="変更を書き出さない確認モード")
    args = parser.parse_args()
    dry = args.dry_run

    if not AI_INDEX.is_file():
        print(f"[ERROR] {AI_INDEX} not found", file=sys.stderr)
        sys.exit(2)

    data = json.loads(AI_INDEX.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    total = len(entries)

    # 抽出条件
    candidates = []
    for idx, e in enumerate(entries):
        desc = e.get("description", "") or ""
        L = len(desc)
        if desc.endswith(OLD_SUFFIX) and MIN_LEN <= L <= MAX_LEN:
            candidates.append((idx, e))

    smoke = candidates[:SMOKE_LIMIT]

    results = []
    json_updates = 0
    html_updates = 0
    html_missed = 0
    all4_full = 0
    errors_list = []

    for idx, e in smoke:
        slug = e["slug"]
        before_desc = e["description"]
        after_desc = replace_suffix(before_desc)
        html_path = REPO_ROOT / slug / "index.html"

        res = process_html(html_path, before_desc, after_desc, dry)
        hits = res.get("hits", {})
        all4 = (hits.get("meta",0) >= 1 and hits.get("og",0) >= 1
                and hits.get("twitter",0) >= 1 and hits.get("jsonld",0) >= 1)

        # ai-site-index 側を更新（HTML 書き込み成功時のみ・dry-run時は skip）
        index_updated = False
        if (not dry) and res["written"]:
            entries[idx]["description"] = after_desc
            json_updates += 1
            index_updated = True
        elif dry and res["hit_count"] > 0:
            index_updated = True  # 表示用

        if res["written"]:
            html_updates += 1
        elif res.get("error") in ("html_not_found", "no_match_in_html"):
            html_missed += 1

        if all4:
            all4_full += 1
        else:
            errors_list.append({
                "slug": slug,
                "hits": hits,
                "error": res.get("error"),
            })

        results.append({
            "slug": slug,
            "title": e.get("title", ""),
            "before_desc": before_desc,
            "after_desc": after_desc,
            "before_len": len(before_desc),
            "after_len": len(after_desc),
            "hits": hits,
            "all4_full": all4,
            "html_written": res["written"],
            "index_updated": index_updated,
            "error": res.get("error"),
        })

    # ai-site-index.json 書き出し（実行時のみ）
    if not dry and json_updates > 0:
        AI_INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ----- 出力 -----
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "meta_desc_polish_phase1_report.md"
    json_path = OUT_DIR / "meta_desc_polish_phase1_result.json"

    avg_before = sum(r["before_len"] for r in results) / max(1, len(results))
    avg_after = sum(r["after_len"] for r in results) / max(1, len(results))

    lines = []
    lines.append("# meta description 改善 Phase 1 実行レポート（smoke 100件）")
    lines.append("")
    lines.append(f"- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- モード: {'DRY-RUN' if dry else '本実行（HTML / ai-site-index.json 書き込み）'}")
    lines.append(f"- ai-site-index total: {total}")
    lines.append(f"- 候補総数: {len(candidates)}")
    lines.append(f"- smoke対象: {len(results)} 件")
    lines.append("")
    lines.append("## 集計")
    lines.append("")
    lines.append(f"| 項目 | 値 |")
    lines.append(f"|---|---|")
    lines.append(f"| HTML 書き換え件数 | {html_updates} / {len(results)} |")
    lines.append(f"| ai-site-index 更新件数 | {json_updates} / {len(results)} |")
    lines.append(f"| 4箇所（meta/og/twitter/JSON-LD）全置換 | {all4_full} / {len(results)} |")
    lines.append(f"| HTML欠落・no_match | {html_missed} |")
    lines.append(f"| エラー件数 | {len(errors_list)} |")
    lines.append(f"| before 平均文字数 | {avg_before:.1f} |")
    lines.append(f"| after 平均文字数 | {avg_after:.1f} |")
    lines.append("")
    lines.append("## 置換ルール")
    lines.append("")
    lines.append(f"- 旧末尾: `{OLD_SUFFIX}` ({len(OLD_SUFFIX)}字)")
    lines.append(f"- 新末尾: `{NEW_SUFFIX}` ({len(NEW_SUFFIX)}字)")
    lines.append(f"- 文字数差: {len(NEW_SUFFIX) - len(OLD_SUFFIX):+d}字")
    lines.append("")
    if errors_list:
        lines.append("## 問題があったアプリ（要個別調査）")
        lines.append("")
        for er in errors_list:
            lines.append(f"- {er['slug']}: hits={er['hits']} error={er['error']}")
        lines.append("")
    lines.append("## ランダム5件 before/after")
    lines.append("")
    sampled = random.sample(results, min(5, len(results))) if results else []
    for i, r in enumerate(sampled, 1):
        lines.append(f"### {i}. {r['slug']}")
        lines.append(f"- title: {r['title']}")
        lines.append(f"- before ({r['before_len']}字): {r['before_desc']}")
        lines.append(f"- after  ({r['after_len']}字): {r['after_desc']}")
        lines.append(f"- hits: meta={r['hits'].get('meta',0)} og={r['hits'].get('og',0)} twitter={r['hits'].get('twitter',0)} jsonld={r['hits'].get('jsonld',0)}")
        lines.append("")
    lines.append("## 注意")
    lines.append("- 本Phase 1は 80〜100字帯 先頭100件のみ。101件目以降には触っていない")
    lines.append("- title は今回触っていない（Phase 2以降）")
    lines.append("- desc の肉付けはまだしていない（純末尾置換のみ）")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    payload = {
        "generated_at": datetime.now().isoformat(),
        "phase": "phase1-smoke-100",
        "mode": "dry-run" if dry else "execute",
        "old_suffix": OLD_SUFFIX,
        "new_suffix": NEW_SUFFIX,
        "filter": {"min_len": MIN_LEN, "max_len": MAX_LEN, "ends_with": OLD_SUFFIX},
        "total_entries": total,
        "candidates_total": len(candidates),
        "smoke_limit": SMOKE_LIMIT,
        "summary": {
            "html_updates": html_updates,
            "json_updates": json_updates,
            "all4_full": all4_full,
            "html_missed": html_missed,
            "errors": len(errors_list),
            "avg_before_len": round(avg_before, 2),
            "avg_after_len": round(avg_after, 2),
        },
        "results": results,
        "errors_detail": errors_list,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== meta description Phase 1 {'DRY-RUN' if dry else 'EXECUTE'} 完了 ===")
    print(f"  smoke対象          : {len(results)}")
    print(f"  HTML書き換え       : {html_updates}/{len(results)}")
    print(f"  ai-site-index更新  : {json_updates}/{len(results)}")
    print(f"  4箇所全置換        : {all4_full}/{len(results)}")
    print(f"  before平均         : {avg_before:.1f}字")
    print(f"  after平均          : {avg_after:.1f}字")
    print(f"  問題件数           : {len(errors_list)}")
    print(f"  report             : {report_path}")
    print(f"  result.json        : {json_path}")


if __name__ == "__main__":
    main()
