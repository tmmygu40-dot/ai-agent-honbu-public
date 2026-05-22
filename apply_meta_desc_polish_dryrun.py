#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_meta_desc_polish_dryrun.py - 既存アプリ meta description 改善 dry-run（書込みなし）

設計書: docs-todo-inbox / QUALITY_RULES_MEMORY_PLAN.md §TP-25
位置付け: 既存4,955件のうち、description末尾「。スマホでも快適にご利用いただけます。」かつ
         desc 80〜100字の100件をsmoke対象として、置換 before/after を _public_audit/ に出力。
         HTML / ai-site-index.json は **一切変更しない**。

絶対禁止:
- HTML 書き込み
- ai-site-index.json 書き込み
- public repo の何らかの本体ファイル変更
- git 操作

使い方:
  python apply_meta_desc_polish_dryrun.py
出力:
  _public_audit/meta_desc_polish_dryrun_report.md（人間可読サマリ）
  _public_audit/meta_desc_polish_dryrun_plan.json（機械可読 before/after 全件）
"""
import json
import re
import sys
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

# meta/og/twitter/JSON-LD 4箇所の検出パターン
PATTERNS = {
    "meta": re.compile(r'<meta\s+name=["\']description["\']\s+content=["\']([^"\']+)["\']', re.IGNORECASE),
    "og": re.compile(r'<meta\s+property=["\']og:description["\']\s+content=["\']([^"\']+)["\']', re.IGNORECASE),
    "twitter": re.compile(r'<meta\s+name=["\']twitter:description["\']\s+content=["\']([^"\']+)["\']', re.IGNORECASE),
    "jsonld": re.compile(r'"description"\s*:\s*"([^"]+)"'),
}


def replace_suffix(desc: str) -> str:
    """末尾の OLD_SUFFIX を NEW_SUFFIX に置換。先頭の '。' は両者共通なので維持。"""
    if desc.endswith(OLD_SUFFIX):
        return desc[: -len(OLD_SUFFIX)] + NEW_SUFFIX
    return desc


def analyze_html(html_path: Path):
    """1つのHTMLから4箇所の description を抽出。"""
    try:
        html = html_path.read_text(encoding="utf-8")
    except Exception as e:
        return {"error": f"read_error: {e}", "found": {}}
    found = {}
    for key, pat in PATTERNS.items():
        m = pat.search(html)
        found[key] = m.group(1) if m else None
    return {"error": None, "found": found}


def main():
    if not AI_INDEX.is_file():
        print(f"[ERROR] {AI_INDEX} not found", file=sys.stderr)
        sys.exit(2)

    data = json.loads(AI_INDEX.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    total = len(entries)

    # フィルタ条件
    candidates = []
    for e in entries:
        desc = e.get("description", "") or ""
        L = len(desc)
        if desc.endswith(OLD_SUFFIX) and MIN_LEN <= L <= MAX_LEN:
            candidates.append(e)

    smoke = candidates[:SMOKE_LIMIT]

    plan = []
    for e in smoke:
        slug = e["slug"]
        title = e.get("title", "")
        before_desc = e.get("description", "")
        after_desc = replace_suffix(before_desc)
        html_path = REPO_ROOT / slug / "index.html"
        html_info = analyze_html(html_path)
        # ai-site-index と HTML meta が一致するか
        index_html_match = (html_info["found"].get("meta") == before_desc) if html_info["found"].get("meta") else None
        plan.append({
            "slug": slug,
            "title": title,
            "before_desc": before_desc,
            "after_desc": after_desc,
            "before_len": len(before_desc),
            "after_len": len(after_desc),
            "html_exists": html_path.is_file(),
            "html_meta_found": html_info["found"].get("meta") is not None,
            "html_og_found": html_info["found"].get("og") is not None,
            "html_twitter_found": html_info["found"].get("twitter") is not None,
            "html_jsonld_found": html_info["found"].get("jsonld") is not None,
            "index_html_meta_match": index_html_match,
            "html_error": html_info["error"],
        })

    # ----- 出力 -----
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "meta_desc_polish_dryrun_report.md"
    json_path = OUT_DIR / "meta_desc_polish_dryrun_plan.json"

    # 集計
    cnt_html_exists = sum(1 for p in plan if p["html_exists"])
    cnt_all4_found = sum(1 for p in plan if all([p["html_meta_found"], p["html_og_found"], p["html_twitter_found"], p["html_jsonld_found"]]))
    cnt_index_html_match = sum(1 for p in plan if p["index_html_meta_match"])
    avg_before = sum(p["before_len"] for p in plan) / max(1, len(plan))
    avg_after = sum(p["after_len"] for p in plan) / max(1, len(plan))

    # Markdown report
    lines = []
    lines.append("# meta description 改善 dry-run レポート（smoke 100件）")
    lines.append("")
    lines.append(f"- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    lines.append(f"- 対象 ai-site-index entries: {total}")
    lines.append(f"- 抽出条件: desc末尾「。スマホでも快適にご利用いただけます。」 かつ 80字 ≤ desc ≤ 100字")
    lines.append(f"- 候補総数: {len(candidates)}")
    lines.append(f"- smoke対象: {len(plan)} 件（先頭{SMOKE_LIMIT}件）")
    lines.append("")
    lines.append("## 置換ルール")
    lines.append("")
    lines.append(f"- 旧末尾: `{OLD_SUFFIX}`")
    lines.append(f"- 新末尾: `{NEW_SUFFIX}`")
    lines.append(f"- 文字数差: {len(NEW_SUFFIX) - len(OLD_SUFFIX):+d}字（{len(OLD_SUFFIX)}→{len(NEW_SUFFIX)}）")
    lines.append("")
    lines.append("## 集計")
    lines.append("")
    lines.append(f"| 項目 | 値 |")
    lines.append(f"|---|---|")
    lines.append(f"| HTML 実在 | {cnt_html_exists} / {len(plan)} |")
    lines.append(f"| HTML 4箇所（meta/og/twitter/JSON-LD）全検出 | {cnt_all4_found} / {len(plan)} |")
    lines.append(f"| ai-site-index と HTML meta 一致 | {cnt_index_html_match} / {len(plan)} |")
    lines.append(f"| before 平均文字数 | {avg_before:.1f} |")
    lines.append(f"| after 平均文字数 | {avg_after:.1f} |")
    lines.append("")
    lines.append("## 注意・安全配慮")
    lines.append("")
    lines.append("- 本dry-run は **HTML / ai-site-index.json を一切変更しない**")
    lines.append("- 実適用時は 1アプリにつき **5箇所同時置換**が必須（meta / og / twitter / JSON-LD / ai-site-index.json）")
    lines.append("- 置換後 desc は 5字短くなる（-19字 + 14字）→ 段階2で底上げ検討")
    lines.append("- 4箇所が揃わないHTMLは要個別調査（テンプレ違反候補）")
    lines.append("")
    lines.append("## 候補サンプル（先頭20件 before/after 対比）")
    lines.append("")
    for i, p in enumerate(plan[:20], 1):
        lines.append(f"### {i}. {p['slug']}")
        lines.append(f"- title: {p['title']}")
        lines.append(f"- before ({p['before_len']}字): {p['before_desc']}")
        lines.append(f"- after  ({p['after_len']}字): {p['after_desc']}")
        flags = []
        if not p["html_exists"]: flags.append("HTML不在")
        if p["html_exists"] and not all([p["html_meta_found"], p["html_og_found"], p["html_twitter_found"], p["html_jsonld_found"]]):
            missing = [k for k in ("meta","og","twitter","jsonld") if not p[f"html_{k}_found"]]
            flags.append(f"4箇所欠落: {','.join(missing)}")
        if p["html_exists"] and p["index_html_meta_match"] is False: flags.append("index⇔meta 不一致")
        if flags:
            lines.append(f"- ⚠ {' / '.join(flags)}")
        lines.append("")

    if len(plan) > 20:
        lines.append(f"（残り {len(plan)-20} 件は plan.json で全件参照可能）")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")

    # JSON plan
    payload = {
        "generated_at": datetime.now().isoformat(),
        "phase": "dryrun-smoke-100",
        "old_suffix": OLD_SUFFIX,
        "new_suffix": NEW_SUFFIX,
        "filter": {
            "min_len": MIN_LEN,
            "max_len": MAX_LEN,
            "ends_with": OLD_SUFFIX,
        },
        "total_entries": total,
        "candidates_total": len(candidates),
        "smoke_limit": SMOKE_LIMIT,
        "summary": {
            "html_exists": cnt_html_exists,
            "all4_found": cnt_all4_found,
            "index_html_meta_match": cnt_index_html_match,
            "avg_before_len": round(avg_before, 2),
            "avg_after_len": round(avg_after, 2),
        },
        "plan": plan,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== meta description 改善 dry-run 完了 ===")
    print(f"  total entries     : {total}")
    print(f"  candidates total  : {len(candidates)}")
    print(f"  smoke対象         : {len(plan)}")
    print(f"  HTML実在          : {cnt_html_exists}/{len(plan)}")
    print(f"  4箇所全検出       : {cnt_all4_found}/{len(plan)}")
    print(f"  index⇔meta一致    : {cnt_index_html_match}/{len(plan)}")
    print(f"  before平均文字数  : {avg_before:.1f}")
    print(f"  after 平均文字数  : {avg_after:.1f}")
    print(f"  report            : {report_path}")
    print(f"  plan json         : {json_path}")
    print(f"  ※ HTML / ai-site-index.json は一切変更していません")


if __name__ == "__main__":
    main()
