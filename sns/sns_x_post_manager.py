from __future__ import annotations

import argparse
import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
QUEUE_PATH = ROOT / "sns" / "sns_queue.json"
BASE_URL = "https://nekopoke.jp"
X_PREVIEW_PATH = ROOT / "sns" / "x_preview.txt"

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
            "敷金や原状回復で気になりやすい負担を、入力ベースでざっくり整理できます。",
            "金額を断定するものではなく、次の相談や確認の判断材料にどうぞ。",
        ),
        (
            "引っ越し完了で油断した頃、請求がこんにちはしがち。",
            "退去時に発生しやすい費用の目安をまとめてチェックできます。",
            "結論を急がずに、落ち着いて判断するための材料づくり向けです。",
        ),
    ],
    "living_cost": [
        (
            "一人暮らし、財布のHP削られがち。",
            "固定費と変動費のバランスを、短時間で見える化できます。",
            "厳密な家計診断ではなく、見直しの優先順位を決める判断材料に。",
        ),
        (
            "給料、入った瞬間どこかへ旅立つ説。",
            "毎月の支出の偏りをチェックして、見直す順番を整理できます。",
            "断定せずに、無理なく続く改善ポイントを探す目安として使えます。",
        ),
    ],
    "insurance": [
        (
            "火災保険、名前だけで判断しがち。",
            "補償内容と見直しポイントを、いまの暮らしに合わせて確認できます。",
            "契約を断定する用途ではなく、比較して考えるための判断材料です。",
        ),
        (
            "保険の見直し、明日の自分に託しがち。",
            "補償の重複や不足を、まずはざっくり棚卸しできます。",
            "結論を急がず、必要な確認を進めるための目安として使えます。",
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
    lines.append("=== X Draft Preview (top 10) ===")
    if not rows:
        lines.append("No draft posts.")
        return lines
    for i, x in enumerate(rows, 1):
        lines.append(f"[{i}] app_name: {x.get('app_name', '')}")
        lines.append(f"priority: {x.get('sns_priority_score', 0)}")
        lines.append(f"freshness_penalty: {x.get('freshness_penalty', 0)}")
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
    return f"{q1}\n{q2}\n{q3}\n無料チェック👇\n{url}"


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
    drafts = [x for x in queue if x.get("status") == "draft"]
    drafts.sort(key=lambda x: (-int(x.get("sns_priority_score", 0)), str(x.get("id", ""))))
    return drafts[:limit]


def refresh_x_copy() -> int:
    queue = _load_queue()
    updated = 0
    for item in queue:
        if item.get("status") != "draft":
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


def main() -> int:
    _configure_stdout_utf8()
    parser = argparse.ArgumentParser(description="X-focused post planner (no API posting).")
    parser.add_argument("--generate", action="store_true", help="Append 3-5 X draft posts from unposted apps.")
    parser.add_argument("--limit", type=int, default=3, help="Draft count for --generate (3..5).")
    parser.add_argument("--preview", action="store_true", help="Show top draft X posts for manual review.")
    parser.add_argument("--normalize-urls", action="store_true", help="Normalize queue URLs to https://nekopoke.jp/")
    parser.add_argument("--refresh-x-copy", action="store_true", help="Regenerate draft x_text with latest templates.")
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

    if args.preview or (not args.generate and not args.normalize_urls):
        rows = preview_x_drafts(limit=10)
        lines = _build_preview_lines(rows)
        for line in lines:
            print(line)
        _write_preview_file(lines)
        print(f"Saved UTF-8 preview: {X_PREVIEW_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
