#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
GA4 共通JS読み込み行 実適用スクリプト

使い方:
  # dry-run（書き換えなし・10件）
  python tools/ga4_insert_apply.py --ga-id G-XXXXXXXXXX --limit 10 --dry-run

  # 実適用（10件）
  python tools/ga4_insert_apply.py --ga-id G-XXXXXXXXXX --limit 10 --apply

  # 全件 dry-run
  python tools/ga4_insert_apply.py --ga-id G-XXXXXXXXXX --all --dry-run

  # 全件 実適用
  python tools/ga4_insert_apply.py --ga-id G-XXXXXXXXXX --all --apply

絶対ルール:
  - --ga-id の形式チェック（プレースホルダや TEST 系は拒否）
  - --apply 時のみ assets/js/analytics.js を作成（既存と GA_ID 衝突する場合は停止）
  - HTML は最後の </head> の直前に 1 行追加するのみ
  - 変更後に構造 marker（</head>, adsbygoogle, canonical, og:, ld+json）の件数が
    変わっていないことを必ず検証。analytics.js は +1 ちょうど
  - --apply 時は対象HTMLを tools/ga4_apply_backups/ に複製してから書き換える
  - commit / push しない（呼び出し側で別ターン）

入力:
  _public_audit/ga4_dry_run_report.json の targets_all を使う
  （無ければ targets_preview_top20 にフォールバック）
"""

import argparse
import json
import re
import sys
from pathlib import Path

# ---- 設定 ----
ROOT = Path(r"C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public")
DRY_RUN_REPORT = ROOT / "_public_audit" / "ga4_dry_run_report.json"
ANALYTICS_JS_PATH = ROOT / "assets" / "js" / "analytics.js"
BACKUP_DIR = ROOT / "tools" / "ga4_apply_backups"
GITIGNORE_PATH = ROOT / ".gitignore"
INSERT_LINE = '<script async src="/assets/js/analytics.js"></script>'

# ---- 検証パターン ----
GA_ID_PATTERN = re.compile(r"^G-[A-Z0-9]{10}$")
PLACEHOLDER_SUFFIXES = {"X" * 10, "0" * 10, "Y" * 10, "Z" * 10}
TEST_KEYWORDS = ["TEST", "INVALID", "DUMMY", "PLACEHOLDER", "SAMPLE", "EXAMPLE", "FAKE"]

# ---- HTML 構造マーカー ----
CLOSE_HEAD_RE = re.compile(r"</head>", re.IGNORECASE)
ADSENSE_RE = re.compile(r"adsbygoogle")
CANONICAL_RE = re.compile(r'rel="canonical"')
OG_RE = re.compile(r'property="og:')
LDJSON_RE = re.compile(r"application/ld\+json")
GTAG_RE = re.compile(r"gtag\s*\(")
ANALYTICS_PATH_RE = re.compile(r"/assets/js/analytics\.js")


def validate_ga_id(ga_id: str) -> str:
    """GA4 測定IDが本物っぽい形式かを検証する。仮ID・TEST系は拒否。"""
    if ga_id is None:
        raise ValueError("--ga-id is required")
    if not ga_id.strip():
        raise ValueError("--ga-id is empty")
    ga_id = ga_id.strip()
    if not GA_ID_PATTERN.match(ga_id):
        raise ValueError(
            f"--ga-id must match ^G-[A-Z0-9]{{10}}$ "
            f"(prefix 'G-' + 10 chars [A-Z0-9]). Got: {ga_id!r}"
        )
    suffix = ga_id[2:]
    if suffix in PLACEHOLDER_SUFFIXES:
        raise ValueError(f"--ga-id is a known placeholder: {ga_id!r}")
    if len(set(suffix)) == 1:
        raise ValueError(
            f"--ga-id suffix is all same char (placeholder?): {ga_id!r}"
        )
    for kw in TEST_KEYWORDS:
        if kw in suffix:
            raise ValueError(
                f"--ga-id contains test keyword '{kw}' in suffix: {ga_id!r}"
            )
    return ga_id


def parse_args(argv=None):
    p = argparse.ArgumentParser(
        prog="ga4_insert_apply.py",
        description="GA4 共通JS読み込み行を HTML の最後の </head> の直前に挿入する",
    )
    p.add_argument("--ga-id", required=True, type=str,
                   help="GA4 measurement ID (e.g. G-ABC1234XYZ)")
    scope = p.add_mutually_exclusive_group(required=True)
    scope.add_argument("--limit", type=int, default=None,
                       help="Process first N HTML files from dry-run report")
    scope.add_argument("--all", dest="all_targets", action="store_true",
                       help="Process all targets from dry-run report")
    mode = p.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true",
                      help="Validate only, no file writes")
    mode.add_argument("--apply", action="store_true",
                      help="Actually write analytics.js and modify HTML")
    return p.parse_args(argv)


def analytics_js_content(ga_id: str) -> str:
    return (
        "(function(){\n"
        f"  var GA_ID = '{ga_id}';\n"
        "  var s = document.createElement('script');\n"
        "  s.async = true;\n"
        "  s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;\n"
        "  document.head.appendChild(s);\n"
        "  window.dataLayer = window.dataLayer || [];\n"
        "  function gtag(){dataLayer.push(arguments);}\n"
        "  window.gtag = gtag;\n"
        "  gtag('js', new Date());\n"
        "  gtag('config', GA_ID);\n"
        "})();\n"
    )


def read_html_preserving(path: Path):
    """UTF-8 で読み、BOM を保持して返す。EOL は壊さない（バイナリ経由）。"""
    data = path.read_bytes()
    if data.startswith(b"\xef\xbb\xbf"):
        return b"\xef\xbb\xbf", data[3:].decode("utf-8")
    return b"", data.decode("utf-8")


def write_html_preserving(path: Path, bom: bytes, content: str) -> None:
    path.write_bytes(bom + content.encode("utf-8"))


def insert_before_last_close_head(content: str):
    """最後の </head> の直前に INSERT_LINE を挿入。EOLは元のインデントを継承。"""
    matches = list(CLOSE_HEAD_RE.finditer(content))
    if not matches:
        return content, 0
    last = matches[-1]
    idx = last.start()
    # </head> 行の先頭インデントを抽出して挿入行と揃える
    line_start = content.rfind("\n", 0, idx) + 1
    indent = content[line_start:idx]
    if not indent.isspace():
        indent = ""
    # 改行は LF を使う（バイト列維持なので Windows の CRLF/LF どちらでも安全側）
    insert = INSERT_LINE + "\n" + indent
    new_content = content[:idx] + insert + content[idx:]
    return new_content, len(matches)


def count_markers(content: str) -> dict:
    return {
        "close_head": len(CLOSE_HEAD_RE.findall(content)),
        "adsense": len(ADSENSE_RE.findall(content)),
        "canonical": len(CANONICAL_RE.findall(content)),
        "og_prop": len(OG_RE.findall(content)),
        "ld_json": len(LDJSON_RE.findall(content)),
        "analytics_path": len(ANALYTICS_PATH_RE.findall(content)),
    }


def check_gitignore_status() -> dict:
    """tools/ga4_apply_backups/ が .gitignore で除外されているかを確認。"""
    backup_rel = "tools/ga4_apply_backups/"
    info = {
        "backup_path": backup_rel,
        "gitignore_exists": GITIGNORE_PATH.exists(),
        "is_ignored": False,
        "current_entries": [],
    }
    if not GITIGNORE_PATH.exists():
        return info
    text = GITIGNORE_PATH.read_text(encoding="utf-8")
    info["current_entries"] = [
        line.strip() for line in text.splitlines() if line.strip()
    ]
    for entry in info["current_entries"]:
        # 単純一致のみ判定（ワイルドカードは厳密判定せず）
        if entry in (
            "tools/ga4_apply_backups",
            "tools/ga4_apply_backups/",
            "/tools/ga4_apply_backups",
            "/tools/ga4_apply_backups/",
        ):
            info["is_ignored"] = True
            break
    return info


def main(argv=None) -> int:
    args = parse_args(argv)

    # 1) GA_ID 検証
    try:
        ga_id = validate_ga_id(args.ga_id)
    except ValueError as e:
        print(f"[ERROR] {e}", file=sys.stderr)
        return 2

    # 2) limit 範囲チェック
    if args.limit is not None and args.limit < 1:
        print(f"[ERROR] --limit must be >= 1, got {args.limit}", file=sys.stderr)
        return 2

    mode = "apply" if args.apply else "dry-run"
    scope_label = "ALL" if args.all_targets else f"limit={args.limit}"
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

    print(f"GA_ID validated:    {ga_id}")
    print(f"Mode:               {mode}")
    print(f"Scope:              {scope_label}")
    print(f"Root:               {ROOT}")
    print(f"Dry-run report:     {DRY_RUN_REPORT}")
    print(f"analytics.js path:  {ANALYTICS_JS_PATH}")
    print(f"Backup dir:         {BACKUP_DIR}")
    print()

    # 3) dry-run report 読み込み
    if not DRY_RUN_REPORT.exists():
        print(f"[ERROR] dry-run report not found: {DRY_RUN_REPORT}", file=sys.stderr)
        print("Run tools/ga4_insert_dry_run.py first.", file=sys.stderr)
        return 3

    with DRY_RUN_REPORT.open(encoding="utf-8") as f:
        report = json.load(f)

    # targets_all を優先、無ければ targets_preview_top20 にフォールバック
    all_targets = report.get("targets_all")
    targets_source = "targets_all"
    if not all_targets:
        all_targets = report.get("targets_preview_top20", [])
        targets_source = "targets_preview_top20 (fallback)"
    if not all_targets:
        print("[ERROR] dry-run report has no targets_all / targets_preview_top20",
              file=sys.stderr)
        return 3

    if args.all_targets:
        targets = all_targets
    else:
        if args.limit > len(all_targets):
            print(
                f"[WARN] --limit {args.limit} > target_count {len(all_targets)}; "
                f"clamped to {len(all_targets)}",
                file=sys.stderr,
            )
        targets = all_targets[: args.limit]

    print(f"Targets source:                       {targets_source} "
          f"(total in report: {len(all_targets)})")
    print(f"Targets selected from dry-run report: {len(targets)}")
    # 大量出力を避けるため、目視可能な範囲だけ表示
    head_n = min(20, len(targets))
    for t in targets[:head_n]:
        print(
            f"  {t['path'][:60]:60s}  "
            f"line={t.get('insertion_line')}  "
            f"</head>x{t.get('close_head_count')}"
        )
    if len(targets) > head_n:
        print(f"  ... ({len(targets) - head_n} more)")
    print()

    # 4) .gitignore 状態確認
    gi = check_gitignore_status()
    print(f"--- .gitignore status ---")
    print(f"  .gitignore exists:   {gi['gitignore_exists']}")
    print(f"  backup_path:         {gi['backup_path']}")
    print(f"  is_ignored:          {gi['is_ignored']}")
    print(f"  current entries:     {gi['current_entries']}")
    if not gi["is_ignored"]:
        print(
            "  [NOTE] tools/ga4_apply_backups/ は .gitignore 未登録。"
            "commit 前に明示パス stage に含めないよう注意（兄貴判断）。"
        )
    print()

    # 5) 再検証（dry-run 報告以降に変更があった可能性に備える）
    valid = []
    skipped = []
    for t in targets:
        rel = t["path"]
        path = ROOT / rel
        if not path.exists():
            skipped.append((rel, "file_not_found"))
            continue
        try:
            bom, content = read_html_preserving(path)
        except Exception as e:
            skipped.append((rel, f"read_error: {e}"))
            continue
        if GTAG_RE.search(content):
            skipped.append((rel, "already_has_gtag"))
            continue
        if ANALYTICS_PATH_RE.search(content):
            skipped.append((rel, "already_has_analytics_js"))
            continue
        if not CLOSE_HEAD_RE.search(content):
            skipped.append((rel, "no_close_head"))
            continue
        valid.append((path, rel, bom, content))

    if skipped:
        print(f"Re-verification skipped {len(skipped)}:")
        for rel, reason in skipped:
            print(f"  [{reason}] {rel}")
        print()

    print(f"Valid for apply: {len(valid)}")
    print()

    # 6) dry-run なら何もせず終了
    if args.dry_run:
        print("=== DRY-RUN: NO FILES WILL BE MODIFIED ===")
        print("Plan:")
        if not ANALYTICS_JS_PATH.exists():
            print(f"  - Would CREATE: {ANALYTICS_JS_PATH}")
            print(f"    (GA_ID embedded: {ga_id})")
        else:
            print(f"  - {ANALYTICS_JS_PATH} already exists; would verify GA_ID match")
        print(f"  - Would BACKUP {len(valid)} HTML to {BACKUP_DIR}")
        print(f"  - Would INSERT 1 line before last </head> in each of {len(valid)} HTML")
        print(f"  - Would VERIFY counts unchanged for: </head>, adsense, canonical, og:, ld+json")
        print(f"  - Would VERIFY analytics_path count delta == +1")
        print()
        print("DRY-RUN完了。何も書き換えていません。")
        return 0

    # 7) --apply: analytics.js の作成 or GA_ID 整合性チェック
    if ANALYTICS_JS_PATH.exists():
        existing = ANALYTICS_JS_PATH.read_text(encoding="utf-8")
        if ga_id not in existing:
            print(
                f"[ERROR] {ANALYTICS_JS_PATH} は既に存在するが GA_ID={ga_id} を含まない。"
                "別 GA_ID 上書き防止のため停止します。",
                file=sys.stderr,
            )
            return 4
        print(f"analytics.js 既存・GA_ID 整合 OK: {ANALYTICS_JS_PATH}")
    else:
        ANALYTICS_JS_PATH.parent.mkdir(parents=True, exist_ok=True)
        ANALYTICS_JS_PATH.write_text(
            analytics_js_content(ga_id), encoding="utf-8"
        )
        print(f"analytics.js 作成: {ANALYTICS_JS_PATH}")

    # 8) バックアップディレクトリ準備
    BACKUP_DIR.mkdir(parents=True, exist_ok=True)

    applied = []
    failed = []
    for path, rel, bom, content in valid:
        # backup（原本を完全コピー）
        backup = BACKUP_DIR / Path(rel)
        backup.parent.mkdir(parents=True, exist_ok=True)
        backup.write_bytes(path.read_bytes())

        before = count_markers(content)
        new_content, _ = insert_before_last_close_head(content)
        after = count_markers(new_content)

        # 安全検証
        check_failed = []
        if after["close_head"] != before["close_head"]:
            check_failed.append(
                f"</head> count {before['close_head']} -> {after['close_head']}"
            )
        if after["adsense"] != before["adsense"]:
            check_failed.append(
                f"adsense count {before['adsense']} -> {after['adsense']}"
            )
        if after["canonical"] != before["canonical"]:
            check_failed.append(
                f"canonical count {before['canonical']} -> {after['canonical']}"
            )
        if after["og_prop"] != before["og_prop"]:
            check_failed.append(
                f"og count {before['og_prop']} -> {after['og_prop']}"
            )
        if after["ld_json"] != before["ld_json"]:
            check_failed.append(
                f"ld_json count {before['ld_json']} -> {after['ld_json']}"
            )
        if after["analytics_path"] != before["analytics_path"] + 1:
            check_failed.append(
                f"analytics_path delta != +1 "
                f"({before['analytics_path']} -> {after['analytics_path']})"
            )

        if check_failed:
            failed.append((rel, "; ".join(check_failed)))
            # 書き出さず continue
            continue

        write_html_preserving(path, bom, new_content)
        applied.append(rel)

    print()
    print(f"Applied: {len(applied)}")
    for rel in applied:
        print(f"  + {rel}")
    if failed:
        print(f"Failed:  {len(failed)}")
        for rel, reason in failed:
            print(f"  ! {rel}  --  {reason}")
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
