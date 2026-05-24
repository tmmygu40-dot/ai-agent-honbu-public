#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GA4 共通JS読み込み行 一括設置 dry-run スクリプト

目的:
  public repo 全 HTML を走査し、GA4 読み込み行を「最後の </head> の直前」に
  挿入する想定の対象/除外を判定する。実ファイルは書き換えない。

出力:
  _public_audit/ga4_dry_run_report.json
  stdout: サマリ + 先頭20件の対象 + 先頭20件の除外 + 挿入プレビュー先頭5件

絶対ルール:
  - HTML は 1 バイトも書き換えない
  - analytics.js は作らない
  - commit / push しない
"""

import json
import re
import sys
from pathlib import Path

# ---- 設定 ----
ROOT = Path(r"C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public")
REPORT_PATH = ROOT / "_public_audit" / "ga4_dry_run_report.json"
INSERT_LINE = '<script async src="/assets/js/analytics.js"></script>'
EXCLUDE_DIR_PARTS = {
    # build / system
    ".git", ".claude", "__pycache__",
    # 運用・素材ディレクトリ（GA4対象外）
    # 再発防止: 過去に sns/preview.html / sns/x_dashboard.html 誤適用あり
    "sns", "brand",
    # ツール・監査ディレクトリ（backup HTML を絶対に走査しない）
    # 再発防止: bulk apply 後に tools/ga4_apply_backups/ 配下の
    # 4,967件 backup HTML が走査・対象化される事象を確認
    "tools", "_public_audit",
}
SPECIAL_FILE = "google6413fb433ec93152.html"

CLOSE_HEAD_RE = re.compile(r"</head>", re.IGNORECASE)
GTAG_RE = re.compile(r"gtag\s*\(")
ANALYTICS_PATH_RE = re.compile(r"/assets/js/analytics\.js")


def is_excluded_dir(rel: Path) -> bool:
    return any(part in EXCLUDE_DIR_PARTS for part in rel.parts)


def is_s_redirect(rel: Path) -> bool:
    parts = rel.parts
    return len(parts) == 3 and parts[0] == "s" and parts[2].lower() == "index.html"


def is_nested_same_name(rel: Path) -> bool:
    parts = rel.parts
    if len(parts) != 3 or parts[2].lower() != "index.html":
        return False
    return parts[0] == parts[1]


def classify(rel: Path) -> str:
    parts = rel.parts
    if len(parts) == 1:
        return "root"
    if len(parts) == 3 and parts[0] == "s" and parts[2].lower() == "index.html":
        return "s_redirect"
    if len(parts) == 3 and parts[0] == parts[1] and parts[2].lower() == "index.html":
        return "nested_legacy"
    if len(parts) == 2 and parts[1].lower() == "index.html":
        return "app"
    return "other"


def main() -> int:
    if not ROOT.is_dir():
        print(f"[ERROR] root not found: {ROOT}", file=sys.stderr)
        return 2

    targets = []
    excluded = []
    multi_head_targets = []
    no_head_count = 0
    categories: dict[str, int] = {}
    exclusion_reasons: dict[str, int] = {}

    html_files = []
    for path in ROOT.rglob("*.html"):
        rel = path.relative_to(ROOT)
        if is_excluded_dir(rel):
            continue
        html_files.append(path)

    for path in html_files:
        rel = path.relative_to(ROOT)
        rel_posix = rel.as_posix()
        cat = classify(rel)
        categories[cat] = categories.get(cat, 0) + 1

        # 1) GSC 認証ファイル
        if path.name == SPECIAL_FILE:
            excluded.append({"path": rel_posix, "reason": "gsc_verification_file", "category": cat})
            exclusion_reasons["gsc_verification_file"] = exclusion_reasons.get("gsc_verification_file", 0) + 1
            continue

        # 2) s/<slug>/index.html リダイレクト
        if is_s_redirect(rel):
            excluded.append({"path": rel_posix, "reason": "s_redirect", "category": cat})
            exclusion_reasons["s_redirect"] = exclusion_reasons.get("s_redirect", 0) + 1
            continue

        # 3) ネスト旧構造 同名/同名/index.html
        if is_nested_same_name(rel):
            excluded.append({"path": rel_posix, "reason": "nested_legacy", "category": cat})
            exclusion_reasons["nested_legacy"] = exclusion_reasons.get("nested_legacy", 0) + 1
            continue

        # 4) 中身を読む（UTF-8）
        try:
            content = path.read_text(encoding="utf-8")
        except Exception as e:
            excluded.append({"path": rel_posix, "reason": f"read_error", "category": cat, "detail": str(e)})
            exclusion_reasons["read_error"] = exclusion_reasons.get("read_error", 0) + 1
            continue

        # 5) </head> 検出
        head_matches = list(CLOSE_HEAD_RE.finditer(content))
        if not head_matches:
            no_head_count += 1
            excluded.append({"path": rel_posix, "reason": "no_close_head", "category": cat})
            exclusion_reasons["no_close_head"] = exclusion_reasons.get("no_close_head", 0) + 1
            continue

        # 6) 既に gtag(
        if GTAG_RE.search(content):
            excluded.append({"path": rel_posix, "reason": "already_has_gtag", "category": cat})
            exclusion_reasons["already_has_gtag"] = exclusion_reasons.get("already_has_gtag", 0) + 1
            continue

        # 7) 既に /assets/js/analytics.js
        if ANALYTICS_PATH_RE.search(content):
            excluded.append({"path": rel_posix, "reason": "already_has_analytics_js", "category": cat})
            exclusion_reasons["already_has_analytics_js"] = exclusion_reasons.get("already_has_analytics_js", 0) + 1
            continue

        # 採用: 最後の </head> 直前に挿入予定
        last = head_matches[-1]
        insertion_index = last.start()
        line_no = content.count("\n", 0, insertion_index) + 1

        target_entry = {
            "path": rel_posix,
            "category": cat,
            "close_head_count": len(head_matches),
            "insertion_char_offset": insertion_index,
            "insertion_line": line_no,
            "file_byte_size": path.stat().st_size,
        }
        targets.append(target_entry)
        if len(head_matches) > 1:
            multi_head_targets.append(target_entry)

    # 挿入プレビュー先頭5件
    preview = []
    for t in targets[:5]:
        path = ROOT / t["path"]
        try:
            content = path.read_text(encoding="utf-8")
        except Exception:
            continue
        idx = t["insertion_char_offset"]
        ctx_before = content[max(0, idx - 80):idx]
        ctx_after = content[idx:idx + 80]
        preview.append({
            "path": t["path"],
            "insertion_line": t["insertion_line"],
            "context_before": ctx_before,
            "planned_insert": INSERT_LINE,
            "context_after": ctx_after,
        })

    report = {
        "root": str(ROOT),
        "planned_insert_line": INSERT_LINE,
        "total_html_scanned": len(html_files),
        "target_count": len(targets),
        "excluded_count": len(excluded),
        "multi_close_head_target_count": len(multi_head_targets),
        "no_close_head_count": no_head_count,
        "categories_overall": categories,
        "exclusion_reasons": exclusion_reasons,
        "targets_preview_top20": targets[:20],
        "excluded_preview_top20": excluded[:20],
        "multi_close_head_preview_top10": multi_head_targets[:10],
        "insertion_preview_top5": preview,
        # bulk apply 用：全 target を保持する
        "targets_all": targets,
    }

    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(report, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    # stdout サマリ
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    print("=== GA4 Insert Dry-Run Report ===")
    print(f"Root: {ROOT}")
    print(f"Total HTML scanned: {len(html_files)}")
    print(f"Target count:       {len(targets)}")
    print(f"Excluded count:     {len(excluded)}")
    print(f"Multi </head> targets: {len(multi_head_targets)}")
    print(f"No </head> count:      {no_head_count}")
    print()
    print("Categories (overall):")
    for k, v in sorted(categories.items()):
        print(f"  {k:16s}: {v}")
    print()
    print("Exclusion reasons:")
    for k, v in sorted(exclusion_reasons.items()):
        print(f"  {k:28s}: {v}")
    print()
    print("Top 20 targets:")
    for t in targets[:20]:
        print(f"  L{t['insertion_line']:>5}  </head>x{t['close_head_count']}  {t['path']}")
    print()
    print("Top 20 excluded:")
    for e in excluded[:20]:
        print(f"  [{e['reason']:>26s}] {e['path']}")
    print()
    print(f"JSON report: {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
