from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
QUEUE_PATH = ROOT / "sns" / "sns_queue.json"
BASE_URL = "https://nekopoke.jp"
X_PREVIEW_PATH = ROOT / "sns" / "x_preview.txt"
X_DAILY_PLAN_PATH = ROOT / "sns" / "x_daily_plan.txt"
JST = timezone(timedelta(hours=9))

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "sns",
    ".github",
    ".vscode",
    "__pycache__",
}

CATEGORY_KEYWORDS = {
    "お金": ["家計", "節約", "お金", "税", "nisa", "投資", "ローン", "クレカ", "副業", "貯金", "費", "代", "値上げ", "住民税"],
    "保険": ["保険", "補償", "火災", "医療保険", "生命保険", "自動車保険"],
    "健康": ["健康", "睡眠", "ストレス", "体調", "食事", "運動", "メンタル", "姿勢", "疲れ", "腰", "病院", "医療"],
    "生活": ["引っ越し", "掃除", "家事", "育児", "時短", "暮らし", "契約", "解約", "退去", "トラブル"],
    "防災": ["防災", "災害", "地震", "台風", "避難", "備蓄", "bcp"],
}

PRIORITY_BONUS = {
    "お金": 6,
    "保険": 6,
    "防災": 5,
    "生活": 4,
    "健康": 2,
    "その他": 0,
}

X_TEMPLATES_BY_KIND: dict[str, list[tuple[str, str, str]]] = {
    "moveout": [
        (
            "退去費用、最後のボス感ある。",
            "敷金で足りる？\n原状回復ってどこまで見る？\n退去前に、ここが迷いやすい。",
            "あとで焦る前に、ざっくり目安チェック。\n※断定ではなく、確認用です",
        ),
        (
            "引っ越し完了で油断した頃、請求がこんにちはしがち。",
            "請求ってどこまで見込む？\nクリーニング代は含める？\n退去前に、先に整理しておく。",
            "あとで慌てないように、目安を先に確認。\n※断定ではなく、確認用です",
        ),
    ],
    "living_cost": [
        (
            "一人暮らし、財布のHP削られがち。",
            "家賃で削られ、\n食費で削られ、\n光熱費でトドメ刺されるやつ。",
            "毎月いくら必要そうか、ざっくり目安チェック。\n※断定ではなく、確認用です",
        ),
        (
            "給料、入った瞬間どこかへ旅立つ説。",
            "固定費って重い？\n見直しはどこから？\nまずは支出の流れを整理。",
            "使いすぎの犯人探しに、ざっくり確認。\n※断定ではなく、確認用です",
        ),
    ],
    "insurance": [
        (
            "火災保険、名前だけで判断しがち。",
            "これって補償対象？\n自己負担はどれくらい？\n気になる点を先に整理。",
            "補償の見直し前に、まずは比較用の目安チェック。\n※断定ではなく、確認用です",
        ),
        (
            "保険の見直し、明日の自分に託しがち。",
            "重複してない？\n不足はない？\nいまの契約をざっくり棚卸し。",
            "結論を急がず、確認ポイントを先に把握。\n※断定ではなく、確認用です",
        ),
    ],
    "tax": [
        (
            "住民税、忘れた頃に現れるラスボス。",
            "住民税や手取りへの影響を、入力ベースでざっくり確認できます。",
            "正式な金額を断定せず、先回りで準備するための判断材料にどうぞ。",
        ),
        (
            "税金イベント、だいたい突然始まる。",
            "通知前に負担感の目安をチェックして、家計の準備に回せます。",
            "確定額を示すものではないので、判断材料としてご活用ください。",
        ),
    ],
    "household": [
        (
            "値上げ、気づくと日常にしれっと常駐。",
            "食費や固定費の増加分をまとめて確認し、負担の全体像をつかめます。",
            "断定せず、どこから手をつけるか考える判断材料として使えます。",
        ),
        (
            "家計、ラスボスより中ボスの連戦がつらい。",
            "支出の変化を数字で整理して、見直しの優先順位を決められます。",
            "結果を断定しないチェックなので、落ち着いて判断する材料づくりに向いています。",
        ),
    ],
    "disaster": [
        (
            "防災グッズ、買おうと思って3年経ってる。",
            "備えの抜け漏れを短時間で確認して、優先して準備する項目を整理できます。",
            "不安をあおるためではなく、現実的に動くための判断材料として使えます。",
        ),
        (
            "防災、後でやるリストの常連になりがち。",
            "家族分も含めた備えを見直し、優先順位をつけるのに使えます。",
            "断定せず、今の備えを確認するための目安としてどうぞ。",
        ),
    ],
    "default": [
        (
            "気になるテーマ、ブックマークだけ増えがち。",
            "短時間で現状を整理して、次に何を確認するか決められます。",
            "断定せずに考えたい人向けの、判断材料づくりチェックです。",
        ),
        (
            "情報収集、沼る前に一回だけ整理したい。",
            "入力ベースで目安をつかんで、確認ポイントを見える化できます。",
            "結論を押しつけない設計なので、比較前の下準備に使えます。",
        ),
    ],
}


def _configure_stdout_utf8() -> None:
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass


def _build_preview_lines(rows: list[dict[str, Any]]) -> list[str]:
    lines: list[str] = []
    lines.append("=== X Preview (draft + scheduled, top 10) ===")
    if not rows:
        lines.append("No draft/scheduled posts.")
        return lines
    for i, x in enumerate(rows, 1):
        lines.append(f"[{i}] app_name: {x.get('app_name', '')}")
        lines.append(f"status: {x.get('status', '')}")
        lines.append(f"priority: {x.get('sns_priority_score', 0)}")
        lines.append(f"freshness_penalty: {x.get('freshness_penalty', 0)}")
        if x.get("scheduled_at"):
            lines.append(f"scheduled_at: {x.get('scheduled_at')}")
        lines.append(f"url: {x.get('url', '')}")
        lines.append("x_text:")
        lines.append(str(x.get("x_text", "")))
        lines.append("---")
    return lines


def _write_preview_file(lines: list[str]) -> None:
    X_PREVIEW_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _load_queue() -> list[dict[str, Any]]:
    if not QUEUE_PATH.is_file():
        return []
    data = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("sns_queue.json must be a JSON array.")
    return [x for x in data if isinstance(x, dict)]


def _save_queue(queue: list[dict[str, Any]]) -> None:
    QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")


def _iter_apps() -> list[tuple[str, str]]:
    out: list[tuple[str, str]] = []
    for d in sorted(ROOT.iterdir(), key=lambda p: p.name):
        if not d.is_dir():
            continue
        if d.name in EXCLUDED_DIRS:
            continue
        if (d / "index.html").is_file():
            out.append((d.name, d.name))
    return out


def _guess_category(app_name: str, app_path: str) -> str:
    text = f"{app_name} {app_path}".lower()
    for cat, words in CATEGORY_KEYWORDS.items():
        if any(w.lower() in text for w in words):
            return cat
    return "その他"


def _base_score(app_name: str) -> int:
    text = app_name.lower()
    score = 0
    for cat, words in CATEGORY_KEYWORDS.items():
        if any(w.lower() in text for w in words):
            score += PRIORITY_BONUS.get(cat, 0)
    if any(k in app_name for k in ["診断", "チェック", "シミュレーター", "早見表"]):
        score += 3
    return score


def _next_id(queue: list[dict[str, Any]], now: datetime) -> int:
    prefix = now.strftime("%Y%m%d") + "-"
    mx = 0
    for item in queue:
        sid = item.get("id")
        if not isinstance(sid, str) or not sid.startswith(prefix):
            continue
        tail = sid[len(prefix) :]
        if tail.isdigit():
            mx = max(mx, int(tail))
    return mx + 1


def _build_x_text(app_name: str, url: str, idx: int) -> str:
    kind = _pick_x_copy_kind(app_name)
    patterns = X_TEMPLATES_BY_KIND.get(kind) or X_TEMPLATES_BY_KIND["default"]
    q1, q2, q3 = patterns[idx % len(patterns)]
    rhythm_lines = _rhythm_lines(q2)
    desc_line, note_line = _desc_and_note_lines(q3, idx)
    body = [
        "【今日のチェック】",
        "",
        q1.strip(),
        "",
        *rhythm_lines,
        "",
        desc_line,
        note_line,
        "",
        url,
    ]
    return "\n".join(body)


def _rhythm_lines(text: str) -> list[str]:
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    if len(lines) >= 2:
        return lines[:3]
    # Fallback: split a plain sentence into short rhythm lines.
    parts = [x.strip() for x in re.split(r"[。！？]", text) if x.strip()]
    if len(parts) >= 2:
        return [f"{parts[0]}。", f"{parts[1]}。"] + ([f"{parts[2]}。"] if len(parts) >= 3 else [])
    one = lines[0] if lines else "ざっくり整理してみる。"
    return [one, "まずは今の状況を見える化。"]


def _desc_and_note_lines(text: str, idx: int) -> tuple[str, str]:
    lines = [x.strip() for x in text.splitlines() if x.strip()]
    if lines:
        desc = lines[0]
    else:
        desc = "まずは目安をサッと確認。"
    if len(lines) >= 2:
        note = lines[1]
    else:
        note = "※断定ではなく、確認用です"
    return desc, note


def _pick_x_copy_kind(app_name: str) -> str:
    n = app_name
    if any(k in n for k in ["退去", "原状回復", "敷金", "引っ越し"]):
        return "moveout"
    if any(k in n for k in ["生活費", "一人暮らし"]):
        return "living_cost"
    if any(k in n for k in ["保険", "補償", "火災", "自動車保険", "医療保険"]):
        return "insurance"
    if any(k in n for k in ["税", "住民税", "所得税", "手取り", "最低賃金"]):
        return "tax"
    if any(k in n for k in ["家計", "値上げ", "節約"]):
        return "household"
    if any(k in n for k in ["防災", "地震", "台風", "避難", "災害"]):
        return "disaster"
    return "default"


def normalize_urls() -> tuple[int, int]:
    queue = _load_queue()
    updated_url = 0
    updated_text = 0
    for item in queue:
        app_path = str(item.get("app_path") or "").strip("/")
        if not app_path:
            continue
        new_url = f"{BASE_URL}/{app_path}/"
        if item.get("url") != new_url:
            item["url"] = new_url
            updated_url += 1
        for key in ("x_text", "instagram_caption", "tiktok_caption"):
            text = str(item.get(key) or "")
            if not text:
                continue
            for host in (
                "https://tmmygu40-dot.github.io/ai-agent-honbu-public",
                "https://nekopoke.jp/ai-agent-honbu-public",
                "https://nekopoke.jp",
            ):
                text = text.replace(host, BASE_URL)
            if item.get(key) != text:
                item[key] = text
                updated_text += 1
    _save_queue(queue)
    return updated_url, updated_text


def append_x_drafts(limit: int = 3) -> list[dict[str, Any]]:
    limit = max(3, min(5, limit))
    queue = _load_queue()
    existing_paths = {
        x.get("app_path")
        for x in queue
        if isinstance(x.get("app_path"), str) and x.get("app_path")
    }
    candidates = []
    for app_name, app_path in _iter_apps():
        if app_path in existing_paths:
            continue
        category = _guess_category(app_name, app_path)
        score = _base_score(app_name) + PRIORITY_BONUS.get(category, 0)
        candidates.append((score, app_name, app_path, category))
    candidates.sort(key=lambda x: (-x[0], x[1]))
    picked = candidates[:limit]

    now = datetime.now().astimezone()
    seq = _next_id(queue, now)
    new_items: list[dict[str, Any]] = []
    for i, (score, app_name, app_path, category) in enumerate(picked):
        url = f"{BASE_URL}/{app_path}/"
        x_text = _build_x_text(app_name, url, i)
        new_items.append(
            {
                "id": f"{now.strftime('%Y%m%d')}-{seq + i:03d}",
                "app_name": app_name,
                "app_path": app_path,
                "url": url,
                "category_guess": category,
                "sns_priority_score": score,
                "freshness_penalty": 0,
                "x_text": x_text,
                "instagram_caption": "",
                "tiktok_caption": "",
                "image_title": "",
                "image_subtitle": "",
                "status": "draft",
                "created_at": now.isoformat(timespec="seconds"),
                "posted_at": None,
                "card_image": "",
            }
        )

    queue.extend(new_items)
    _save_queue(queue)
    return new_items


def preview_x_drafts(limit: int = 5) -> list[dict[str, Any]]:
    queue = _load_queue()
    rows = [x for x in queue if x.get("status") in {"draft", "scheduled"}]
    rows.sort(
        key=lambda x: (
            0 if x.get("status") == "scheduled" else 1,
            str(x.get("scheduled_at") or ""),
            -int(x.get("sns_priority_score", 0)),
            str(x.get("id", "")),
        )
    )
    return rows[:limit]


def refresh_x_copy() -> int:
    queue = _load_queue()
    updated = 0
    for item in queue:
        if item.get("status") not in {"draft", "scheduled"}:
            continue
        app_name = str(item.get("app_name") or "")
        app_path = str(item.get("app_path") or "").strip("/")
        if not app_name or not app_path:
            continue
        url = f"{BASE_URL}/{app_path}/"
        item["url"] = url
        item["x_text"] = _build_x_text(app_name, url, updated)
        updated += 1
    _save_queue(queue)
    return updated


def _pick_slot_item(
    candidates: list[dict[str, Any]],
    preferred_kinds: set[str],
    used_ids: set[str],
    used_kinds: set[str],
) -> dict[str, Any] | None:
    remaining = [x for x in candidates if str(x.get("id", "")) not in used_ids]
    if not remaining:
        return None

    def kind_of(item: dict[str, Any]) -> str:
        return _pick_x_copy_kind(str(item.get("app_name") or ""))

    # 1) preferred kind and not used kind
    for item in remaining:
        k = kind_of(item)
        if k in preferred_kinds and k not in used_kinds:
            return item
    # 2) preferred kind
    for item in remaining:
        if kind_of(item) in preferred_kinds:
            return item
    # 3) non-preferred but unused kind
    for item in remaining:
        if kind_of(item) not in used_kinds:
            return item
    # 4) fallback highest priority
    return remaining[0]


def _write_daily_plan_file(day: str, planned: list[dict[str, Any]]) -> None:
    lines: list[str] = []
    lines.append(f"=== X Daily Plan ({day}) ===")
    if not planned:
        lines.append("No schedulable draft posts found.")
    else:
        for i, item in enumerate(planned, 1):
            lines.append(f"[{i}] id: {item.get('id', '')}")
            lines.append(f"app_name: {item.get('app_name', '')}")
            lines.append(f"category_guess: {item.get('category_guess', '')}")
            lines.append(f"scheduled_at: {item.get('scheduled_at', '')}")
            lines.append(f"url: {item.get('url', '')}")
            lines.append("x_text:")
            lines.append(str(item.get("x_text", "")))
            lines.append("---")
    X_DAILY_PLAN_PATH.write_text("\n".join(lines) + "\n", encoding="utf-8")


def _scheduled_at_for(day: datetime.date, hhmm: str) -> str:
    hh, mm = map(int, hhmm.split(":"))
    return datetime(day.year, day.month, day.day, hh, mm, 0, tzinfo=JST).isoformat()


def create_daily_plan(day: str) -> list[dict[str, Any]]:
    target_date = datetime.strptime(day, "%Y-%m-%d").date()
    queue = _load_queue()
    slots = [
        ("08:00", {"living_cost", "household"}),
        ("12:30", {"insurance", "tax"}),
        ("20:30", {"moveout", "disaster", "default"}),
    ]

    # Normalize duplicates in the same day+time slot:
    # keep one scheduled item per slot and return extras to draft.
    for hhmm, _ in slots:
        exact = _scheduled_at_for(target_date, hhmm)
        same_slot = [x for x in queue if str(x.get("scheduled_at") or "") == exact and x.get("status") == "scheduled"]
        if len(same_slot) <= 1:
            continue
        same_slot.sort(key=lambda x: (-int(x.get("sns_priority_score", 0)), str(x.get("id", ""))))
        for extra in same_slot[1:]:
            extra["status"] = "draft"
            extra["scheduled_at"] = None

    drafts = [x for x in queue if x.get("status") == "draft"]
    drafts.sort(key=lambda x: (-int(x.get("sns_priority_score", 0)), str(x.get("id", ""))))
    used_ids: set[str] = set()
    used_kinds: set[str] = set()
    planned: list[dict[str, Any]] = []

    for hhmm, preferred in slots:
        exact = _scheduled_at_for(target_date, hhmm)
        existing = next(
            (x for x in queue if x.get("status") == "scheduled" and str(x.get("scheduled_at") or "") == exact),
            None,
        )
        if existing is not None:
            sid = str(existing.get("id", ""))
            used_ids.add(sid)
            used_kinds.add(_pick_x_copy_kind(str(existing.get("app_name") or "")))
            planned.append(existing)
            continue

        item = _pick_slot_item(drafts, preferred, used_ids, used_kinds)
        if not item:
            continue
        sid = str(item.get("id", ""))
        used_ids.add(sid)
        used_kinds.add(_pick_x_copy_kind(str(item.get("app_name") or "")))
        item["status"] = "scheduled"
        item["scheduled_at"] = exact
        planned.append(item)

    _save_queue(queue)
    _write_daily_plan_file(day, planned)
    return planned


def mark_posted(post_id: str) -> bool:
    queue = _load_queue()
    now = datetime.now(JST).isoformat(timespec="seconds")
    updated = False
    for item in queue:
        if str(item.get("id", "")) != post_id:
            continue
        item["status"] = "posted"
        item["posted_at"] = now
        updated = True
        break
    if updated:
        _save_queue(queue)
    return updated


def main() -> int:
    _configure_stdout_utf8()
    parser = argparse.ArgumentParser(description="X-focused post planner (no API posting).")
    parser.add_argument("--generate", action="store_true", help="Append 3-5 X draft posts from unposted apps.")
    parser.add_argument("--limit", type=int, default=3, help="Draft count for --generate (3..5).")
    parser.add_argument("--preview", action="store_true", help="Show top draft/scheduled X posts for manual review.")
    parser.add_argument("--normalize-urls", action="store_true", help="Normalize queue URLs to https://nekopoke.jp/")
    parser.add_argument("--refresh-x-copy", action="store_true", help="Regenerate draft x_text with latest templates.")
    parser.add_argument("--daily-plan", action="store_true", help="Create 3 scheduled posts for a target date.")
    parser.add_argument("--date", type=str, help="Target date for --daily-plan (YYYY-MM-DD).")
    parser.add_argument("--mark-posted", type=str, metavar="ID", help="Mark a queue item as posted by id.")
    args = parser.parse_args()

    if args.normalize_urls:
        u1, u2 = normalize_urls()
        print(f"Normalized URL fields: {u1}, text fields: {u2}")

    if args.generate:
        items = append_x_drafts(limit=args.limit)
        print(f"Added {len(items)} X draft posts.")
        for x in items:
            print(f"- {x['app_name']} ({x['url']})")

    if args.refresh_x_copy:
        n = refresh_x_copy()
        print(f"Refreshed X copy for draft posts: {n}")

    if args.daily_plan:
        if not args.date:
            raise SystemExit("--daily-plan requires --date YYYY-MM-DD")
        planned = create_daily_plan(args.date)
        print(f"Created daily plan: {len(planned)} items")
        for item in planned:
            print(
                f"- {item.get('id')} | {item.get('scheduled_at')} | "
                f"{item.get('app_name')} ({item.get('category_guess')})"
            )
        print(f"Saved daily plan: {X_DAILY_PLAN_PATH}")

    if args.mark_posted:
        ok = mark_posted(args.mark_posted)
        if not ok:
            raise SystemExit(f"ID not found: {args.mark_posted}")
        print(f"Marked posted: {args.mark_posted}")

    if args.preview or (not args.generate and not args.normalize_urls and not args.daily_plan and not args.mark_posted):
        rows = preview_x_drafts(limit=10)
        lines = _build_preview_lines(rows)
        for line in lines:
            print(line)
        _write_preview_file(lines)
        print(f"Saved UTF-8 preview: {X_PREVIEW_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
