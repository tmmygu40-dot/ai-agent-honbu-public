from __future__ import annotations

import json
import random
import re
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
SNS_DIR = ROOT / "sns"
QUEUE_PATH = SNS_DIR / "sns_queue.json"
BASE_URL = "https://tmmygu40-dot.github.io/ai-agent-honbu-public"

EXCLUDED_DIRS = {
    ".git",
    "node_modules",
    "sns",
    ".github",
    ".vscode",
    "__pycache__",
}

CATEGORY_KEYWORDS = {
    "お金": ["家計", "節約", "お金", "税", "nisa", "投資", "ローン", "クレカ", "副業", "貯金", "費", "代"],
    "保険": ["保険", "補償", "火災", "医療保険", "生命保険"],
    "健康": ["健康", "睡眠", "ストレス", "体調", "食事", "運動", "メンタル", "姿勢", "疲れ", "腰"],
    "生活": ["引っ越し", "掃除", "家事", "育児", "時短", "暮らし", "todo", "メモ", "旅行", "gw"],
    "防災": ["防災", "災害", "地震", "台風", "避難", "備蓄", "bcp"],
}

X_TEMPLATES = [
    "今日のミニツール: {app_name}\n迷ったときの目安づくりに。無料チェックで30秒確認できます。\n{url}",
    "{app_name} を公開中です。\n数字の目安をサッと見たいときに、まずは無料チェック。\n{url}",
    "気になるテーマを手早く確認できる {app_name}。\n断定せず、判断材料の目安としてどうぞ。30秒で確認👇\n{url}",
]

IG_TEMPLATES = [
    "【{app_name}】\nまずは現在地を知るための無料チェック用ミニアプリです。断定ではなく目安として使える内容にしています。\n詳細はこちら: {url}",
    "毎日の見直しに使える {app_name} を追加しました。\n短時間で確認できる目安ツールです。必要な判断はご自身の状況に合わせて行ってください。\n{url}",
    "{app_name} を公開しました。\n30秒で確認できる設計なので、忙しい日でも使いやすいです。まずは無料チェックから。\n{url}",
]

TIKTOK_TEMPLATES = [
    "{app_name} を試せます。無料チェックで30秒確認。目安として使ってみてください。\n{url}",
    "サクッと確認したい人向け: {app_name}\n断定ではなく、判断のヒントづくり用です。\n{url}",
    "今日のおすすめミニツールは {app_name}。\nまずは目安を見てから次の行動を決めましょう。\n{url}",
]

IMAGE_TITLE_TEMPLATES = [
    "{app_name}",
    "30秒で確認",
    "無料チェック",
]

IMAGE_SUBTITLE_TEMPLATES = [
    "断定せず目安をチェック",
    "まずは今の状況を見える化",
    "かんたん入力ですぐ確認",
]

SCORE_RULES: list[tuple[int, list[str]]] = [
    (6, ["保険", "火災保険", "医療保険", "自動車保険"]),
    (6, ["税金", "住民税", "所得税", "確定申告"]),
    (5, ["給料", "手取り", "最低賃金", "年収"]),
    (5, ["値上げ", "家計", "節約", "電気代", "ガス代"]),
    (4, ["医療", "病院", "症状", "受診"]),
    (4, ["防災", "地震", "台風", "避難"]),
    (4, ["契約", "解約", "退去費用", "引っ越し"]),
    (3, ["診断", "チェック", "シミュレーター", "早見表"]),
    (-4, ["プロンプト", "画像生成", "AIイメージ"]),
    (-2, ["ゲーム", "クイズ"]),
    (-1, ["占い"]),
]


FULLWIDTH_DIGITS = str.maketrans("０１２３４５６７８９", "0123456789")
GENERIC_TITLES = {"無料チェック", "30秒で確認"}


def _normalize_for_month_parse(text: str) -> str:
    return text.translate(FULLWIDTH_DIGITS)


def _calc_freshness_penalty(app_name: str, app_path: str, now: datetime | None = None) -> int:
    text = _normalize_for_month_parse(f"{app_name} {app_path}")
    now_dt = now or datetime.now().astimezone()
    current_year = now_dt.year
    current_month = now_dt.month

    penalties: list[int] = []

    # Year + month pattern (e.g. 2026年4月).
    ym_matches = re.findall(r"(\d{4})年\s*(0?[1-9]|1[0-2])月", text)
    for y_str, m_str in ym_matches:
        year = int(y_str)
        month = int(m_str)
        months_ago = (current_year - year) * 12 + (current_month - month)
        if months_ago <= 0:
            penalties.append(0)
        elif months_ago == 1:
            penalties.append(4)
        else:
            penalties.append(8)

    # Month-only pattern (e.g. 4月). Skip positions already matched as year+month.
    ym_spans = [m.span() for m in re.finditer(r"\d{4}年\s*(?:0?[1-9]|1[0-2])月", text)]
    for mo in re.finditer(r"(0?[1-9]|1[0-2])月", text):
        span = mo.span()
        if any(span[0] >= s0 and span[1] <= s1 for s0, s1 in ym_spans):
            continue
        month = int(mo.group(1))
        months_ago = current_month - month
        if months_ago <= 0:
            penalties.append(0)
        elif months_ago == 1:
            penalties.append(4)
        else:
            penalties.append(8)

    return max(penalties) if penalties else 0


def _calc_base_sns_score(app_name: str, app_path: str) -> int:
    text = f"{app_name} {app_path}".lower()
    score = 0
    for weight, keywords in SCORE_RULES:
        for kw in keywords:
            if kw.lower() in text:
                score += weight
    return score


def _generate_image_title(app_name: str) -> str:
    if "値上げ" in app_name and "家計" in app_name:
        return "値上げ、家計に響く？"
    if "火災保険" in app_name and ("風水害" in app_name or "補償" in app_name):
        return "風水害、保険で確認"
    if "住民税" in app_name:
        return "住民税、どれくらい来る？"
    if "保険" in app_name:
        return "保険、今のままで大丈夫？"
    if "家計" in app_name:
        return "家計、見直しポイントは？"
    if "税" in app_name:
        return "税負担、まず目安確認"
    if "診断" in app_name:
        return "まずは現状をチェック"
    return "いまの状況を確認"


def _generate_image_subtitle(app_name: str) -> str:
    if "シミュレーター" in app_name or "試算" in app_name:
        return "かんたん入力で確認"
    return "30秒で目安チェック"


def _refresh_item_scores_and_copy(item: dict[str, Any], now: datetime) -> None:
    app_name = str(item.get("app_name") or "")
    app_path = str(item.get("app_path") or "")
    penalty = _calc_freshness_penalty(app_name, app_path, now=now)
    final_score = _calc_base_sns_score(app_name, app_path) - penalty
    item["freshness_penalty"] = penalty
    item["sns_priority_score"] = final_score

    title = str(item.get("image_title") or "").strip()
    if not title or title in GENERIC_TITLES or title == app_name:
        item["image_title"] = _generate_image_title(app_name)
    item["image_subtitle"] = _generate_image_subtitle(app_name)


def _parse_as_of_date(text: str) -> datetime:
    dt = datetime.strptime(text, "%Y-%m-%d")
    return dt


def _load_queue(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    raw = path.read_text(encoding="utf-8")
    data = json.loads(raw)
    if not isinstance(data, list):
        raise ValueError("sns_queue.json must be a JSON array.")
    out: list[dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            out.append(item)
    return out


def _guess_category(app_name: str, app_path: str) -> str:
    text = f"{app_name} {app_path}".lower()
    for category, words in CATEGORY_KEYWORDS.items():
        for word in words:
            if word.lower() in text:
                return category
    return "その他"


def _iter_app_candidates() -> list[tuple[str, str]]:
    candidates: list[tuple[str, str]] = []
    for child in sorted(ROOT.iterdir(), key=lambda p: p.name):
        if not child.is_dir():
            continue
        if child.name in EXCLUDED_DIRS:
            continue
        if (child / "index.html").is_file():
            candidates.append((child.name, child.name))
    return candidates


def _calc_sns_priority_score(app_name: str, app_path: str) -> int:
    base_score = _calc_base_sns_score(app_name, app_path)
    freshness_penalty = _calc_freshness_penalty(app_name, app_path)
    return base_score - freshness_penalty


def _next_id(today: str, queue: list[dict[str, Any]]) -> int:
    prefix = f"{today}-"
    max_seq = 0
    for item in queue:
        pid = item.get("id")
        if not isinstance(pid, str) or not pid.startswith(prefix):
            continue
        tail = pid[len(prefix) :]
        if tail.isdigit():
            max_seq = max(max_seq, int(tail))
    return max_seq + 1


def _build_post(
    app_name: str,
    app_path: str,
    seq: int,
    now: datetime,
    priority_score: int,
    freshness_penalty: int,
) -> dict[str, Any]:
    url = f"{BASE_URL}/{app_path}/"
    category = _guess_category(app_name, app_path)

    x_text = random.choice(X_TEMPLATES).format(app_name=app_name, url=url)
    ig_text = random.choice(IG_TEMPLATES).format(app_name=app_name, url=url)
    tk_text = random.choice(TIKTOK_TEMPLATES).format(app_name=app_name, url=url)
    image_title = _generate_image_title(app_name)
    image_subtitle = _generate_image_subtitle(app_name)

    post_id = f"{now.strftime('%Y%m%d')}-{seq:03d}"
    return {
        "id": post_id,
        "app_name": app_name,
        "app_path": app_path,
        "sns_priority_score": priority_score,
        "freshness_penalty": freshness_penalty,
        "url": url,
        "category_guess": category,
        "x_text": x_text,
        "instagram_caption": ig_text,
        "tiktok_caption": tk_text,
        "image_title": image_title,
        "image_subtitle": image_subtitle,
        "status": "draft",
        "created_at": now.isoformat(timespec="seconds"),
        "posted_at": None,
    }


def append_daily_queue(limit: int = 10) -> list[dict[str, Any]]:
    SNS_DIR.mkdir(parents=True, exist_ok=True)
    queue = _load_queue(QUEUE_PATH)

    existing_paths = {
        item.get("app_path")
        for item in queue
        if isinstance(item.get("app_path"), str) and item.get("app_path")
    }
    candidates = _iter_app_candidates()
    unposted = [(name, path) for name, path in candidates if path not in existing_paths]
    unposted.sort(key=lambda item: (-_calc_sns_priority_score(item[0], item[1]), item[0]))
    picked = unposted[:limit]

    now = datetime.now().astimezone()
    next_seq = _next_id(now.strftime("%Y%m%d"), queue)
    new_items: list[dict[str, Any]] = []
    for i, (app_name, app_path) in enumerate(picked):
        priority_score = _calc_sns_priority_score(app_name, app_path)
        freshness_penalty = _calc_freshness_penalty(app_name, app_path, now=now)
        new_items.append(
            _build_post(app_name, app_path, next_seq + i, now, priority_score, freshness_penalty)
        )

    queue.extend(new_items)
    QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
    return new_items


def refresh_queue_metadata(as_of: datetime | None = None) -> int:
    queue = _load_queue(QUEUE_PATH)
    now = as_of or datetime.now().astimezone()
    for item in queue:
        if not isinstance(item, dict):
            continue
        _refresh_item_scores_and_copy(item, now=now)
    QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
    return len(queue)


if __name__ == "__main__":
    import sys

    if "--refresh-existing" in sys.argv:
        as_of = None
        for arg in sys.argv:
            if arg.startswith("--as-of="):
                as_of = _parse_as_of_date(arg.split("=", 1)[1])
                break
        n = refresh_queue_metadata(as_of=as_of)
        print(f"Refreshed queue metadata: {n} items")
    else:
        items = append_daily_queue(limit=10)
        print(f"Added {len(items)} queue items.")
        for item in items:
            print(f"- {item['app_name']} ({item['app_path']})")
