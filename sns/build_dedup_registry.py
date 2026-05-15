# -*- coding: utf-8 -*-
"""
build_dedup_registry.py  (Step1)

sns/sns_queue.json から SNS投稿ネタの重複防止台帳 (SNS_DEDUP_REGISTRY.json) の
候補を生成する。

- 入力は sns/sns_queue.json のみ。
- --dry-run: 候補の集計を表示するだけ。SNS_DEDUP_REGISTRY.json は書き出さない。
             sns_queue.json も一切変更しない。
- 通常実行 : sns/SNS_DEDUP_REGISTRY.json を書き出す（Step2以降で使用）。

このスクリプト自体は queue を書き換えない（読み取り専用）。
"""
from __future__ import annotations
import argparse
import io
import json
import os
import re
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import datetime, timezone, timedelta

# 端末文字化け対策
try:
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
except Exception:
    pass

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QUEUE_PATH = os.path.join(ROOT, "sns", "sns_queue.json")
REGISTRY_PATH = os.path.join(ROOT, "sns", "SNS_DEDUP_REGISTRY.json")

# normalized_name で吸収する汎用語
GENERIC_WORDS = [
    "アプリ", "ツール", "チェッカー", "ジェネレーター", "メーカー",
    "シミュレーター", "診断", "クイズ", "ゲーム", "早見表", "v2", "v3",
]
# 個別アプリ識別に使えない url
BASE_URLS = {"", "https://nekopoke.jp/", "https://nekopoke.jp"}


def normalize_name(s: str) -> str:
    """app_name を正規化して表記ゆれ・末尾語ゆれを吸収する。"""
    if not s:
        return ""
    # 1. NFKC正規化
    s = unicodedata.normalize("NFKC", s)
    # 2. 小文字化
    s = s.lower()
    # 3. 空白 / _ / - / ・ / （）() / 記号 を除去
    s = re.sub(r"[\s_\-・（）()／/、。,.!?！？:：;；'\"`~^|]+", "", s)
    # 4. 汎用語を除去
    for w in GENERIC_WORDS:
        s = s.replace(w.lower(), "")
    return s


def _s(v) -> str:
    return str(v).strip() if v is not None else ""


def load_queue() -> list[dict]:
    with open(QUEUE_PATH, encoding="utf-8") as f:
        data = json.load(f)
    if not isinstance(data, list):
        raise ValueError("sns_queue.json must be a JSON array")
    return [x for x in data if isinstance(x, dict)]


def build_candidates(queue: list[dict]) -> list[dict]:
    """queue の各エントリから registry 候補行を作る（集約前）。"""
    rows = []
    for d in queue:
        app_name = _s(d.get("app_name"))
        app_path = _s(d.get("app_path"))
        url = _s(d.get("url"))
        short_url = d.get("short_url") or None
        norm = normalize_name(app_name or app_path)
        rows.append({
            "app_name": app_name,
            "app_path": app_path,
            "url": url,
            "short_url": short_url,
            "normalized_name": norm,
            "first_seen_id": _s(d.get("id")),
            "first_seen_status": _s(d.get("status")),
            "source": "queue_initial",
        })
    return rows


def group_key(row: dict) -> str:
    """同一アプリと見なすキー。app_path > 個別url > normalized_name > 識別不能。"""
    if row["app_path"]:
        return "path:" + row["app_path"]
    if row["url"] and row["url"] not in BASE_URLS:
        return "url:" + row["url"]
    if row["normalized_name"]:
        return "norm:" + row["normalized_name"]
    return "noident:" + row["first_seen_id"]


def aggregate(rows: list[dict]) -> list[dict]:
    """同一アプリの行をまとめ、first_seen は最小 id を採用する。"""
    groups: dict[str, list[dict]] = defaultdict(list)
    for r in rows:
        groups[group_key(r)].append(r)

    registry = []
    for key, members in groups.items():
        members_sorted = sorted(members, key=lambda r: r["first_seen_id"] or "~")
        first = members_sorted[0]

        def first_nonempty(field):
            for m in members_sorted:
                if m.get(field):
                    return m[field]
            return first.get(field)

        registry.append({
            "app_name": first_nonempty("app_name"),
            "app_path": first_nonempty("app_path"),
            "url": first_nonempty("url"),
            "short_url": first_nonempty("short_url"),
            "normalized_name": first_nonempty("normalized_name"),
            "first_seen_id": first["first_seen_id"],
            "first_seen_status": first["first_seen_status"],
            "source": "queue_initial",
            "_member_ids": [m["first_seen_id"] for m in members_sorted],
        })
    registry.sort(key=lambda e: e["first_seen_id"] or "~")
    return registry


def dup_summary(rows: list[dict], field: str):
    """指定フィールドの重複（空は除く）を集計して返す。"""
    vals = [r[field] for r in rows if r.get(field)]
    c = Counter(vals)
    return {k: v for k, v in c.items() if v > 1}


def main():
    ap = argparse.ArgumentParser(description="Build SNS dedup registry candidates from sns_queue.json")
    ap.add_argument("--dry-run", action="store_true",
                    help="集計のみ表示。SNS_DEDUP_REGISTRY.json は書き出さない。")
    args = ap.parse_args()

    queue = load_queue()
    rows = build_candidates(queue)
    registry = aggregate(rows)

    empty_path = sum(1 for r in rows if not r["app_path"])
    empty_name = sum(1 for r in rows if not r["app_name"])
    empty_short = sum(1 for r in rows if not r["short_url"])

    print("=" * 56)
    print("build_dedup_registry.py  (Step1)")
    print("mode:", "DRY-RUN (書き出しなし)" if args.dry_run else "WRITE")
    print("input:", QUEUE_PATH)
    print("=" * 56)
    print(f"queue 件数            : {len(queue)}")
    print(f"registry 候補件数     : {len(rows)}  (集約前)")
    print(f"集約後の一意件数      : {len(registry)}")
    print(f"app_path 空の件数     : {empty_path}")
    print(f"app_name 空の件数     : {empty_name}")
    print(f"short_url 空/null件数 : {empty_short}")
    print()

    # 重複集計
    for field in ("app_path", "url", "short_url", "app_name", "normalized_name"):
        dups = dup_summary(rows, field)
        total = sum(dups.values())
        print(f"[{field}] 重複種類={len(dups)} 重複該当行数={total}")
        for k, v in sorted(dups.items(), key=lambda x: -x[1])[:8]:
            disp = k if len(k) <= 60 else k[:57] + "..."
            print(f"    x{v}: {disp!r}")
    print()

    # normalized_name 重複の上位（別 app_path がまとまっているもの）
    print("--- normalized_name 重複の上位（表記ゆれ疑い） ---")
    norm_groups = defaultdict(set)
    for r in rows:
        if r["normalized_name"]:
            norm_groups[r["normalized_name"]].add(r["app_name"] or r["app_path"])
    norm_dups = {k: v for k, v in norm_groups.items() if len(v) > 1 or
                 sum(1 for r in rows if r["normalized_name"] == k) > 1}
    if not norm_dups:
        print("    （なし）")
    for k, names in sorted(norm_dups.items(),
                           key=lambda x: -sum(1 for r in rows if r["normalized_name"] == x[0]))[:10]:
        cnt = sum(1 for r in rows if r["normalized_name"] == k)
        print(f"    x{cnt} [{k}]: {sorted(names)}")
    print()

    # 既存重複の検出（同一アプリが複数 id を持つグループ）
    print("--- 既存重複として検出したもの（同一アプリが複数エントリ） ---")
    found = [e for e in registry if len(e["_member_ids"]) > 1]
    if not found:
        print("    （なし）")
    for e in found:
        print(f"    {e['app_name'] or e['app_path'] or '(識別不能)'}"
              f"  ids={e['_member_ids']}  short_url={e['short_url']}")
    # 賃貸退去費用シミュレーターの個別確認
    print()
    chintai = [e for e in registry if "賃貸退去費用" in (e["app_path"] or "")]
    if chintai:
        for e in chintai:
            flag = "検出OK（複数id）" if len(e["_member_ids"]) > 1 else "単一id"
            print(f"  [賃貸退去費用シミュレーター] {flag}: ids={e['_member_ids']}")
    else:
        print("  [賃貸退去費用シミュレーター] 該当なし")
    print()

    if args.dry_run:
        print(">> DRY-RUN: SNS_DEDUP_REGISTRY.json は書き出していません。")
        print(f">> 通常実行すると {len(registry)} 件を書き出します -> {REGISTRY_PATH}")
    else:
        jst = timezone(timedelta(hours=9))
        out = {
            "version": 1,
            "updated_at": datetime.now(jst).isoformat(timespec="seconds"),
            "entries": [{k: v for k, v in e.items() if k != "_member_ids"} for e in registry],
        }
        with open(REGISTRY_PATH, "w", encoding="utf-8") as f:
            json.dump(out, f, ensure_ascii=False, indent=2)
        print(f">> WROTE: {REGISTRY_PATH}  ({len(registry)} entries)")


if __name__ == "__main__":
    main()
