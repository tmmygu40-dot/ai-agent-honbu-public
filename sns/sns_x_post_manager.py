from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any
from urllib.parse import quote, urlparse, urlunparse

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

# Leading pictographic / symbol emoji (subset; mirrors dashboard intent without extra deps).
_LEADING_EMOJI_HEAD_RE = re.compile(
    r"^[\U0001F300-\U0001FAFF\U0001F900-\U0001F9FF\U0001F600-\U0001F64F\U0001F680-\U0001F6FF"
    r"\U00002600-\U000026FF\U00002700-\U000027BF\U0001F1E6-\U0001F1FF\U0001F200-\U0001F2FF]",
    re.UNICODE,
)

SLUG_TOKEN_MAP: list[tuple[str, str]] = [
    ("火災保険", "kasai-hoken"),
    ("自動車保険", "car-insurance"),
    ("一人暮らし", "hitori-living"),
    ("住民税", "resident-tax"),
    ("最低賃金", "minimum-wage"),
    ("退去費用", "taikyo-cost"),
    ("退去", "taikyo"),
    ("賃貸", "chintai"),
    ("値上げ", "neage"),
    ("家計", "kakei"),
    ("請求書類", "claim-docs"),
    ("逆引き", "reverse"),
    ("補償", "coverage"),
    ("風水害", "fusuigai"),
    ("節約", "save"),
    ("生活費", "living-cost"),
    ("診断", "check"),
    ("シミュレーター", "sim"),
    ("チェッカー", "checker"),
    ("ツール", "tool"),
    ("アプリ", "app"),
]


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


def trim_app_suffix(name: str) -> str:
    s = str(name or "").strip()
    s = re.sub(r"アプリ$", "", s)
    s = re.sub(r"ツール$", "", s)
    return s.strip()


def format_app_line_for_post(raw: str) -> str:
    app = str(raw or "").strip()
    if not app:
        return ""
    if app.startswith("🐾"):
        return app
    if _LEADING_EMOJI_HEAD_RE.match(app):
        return app
    return f"🐾 {app}"


def is_risk_topic(item: dict[str, Any]) -> bool:
    text = " ".join(
        [
            str(item.get("app_name") or ""),
            str(item.get("category_guess") or ""),
            str(item.get("category") or ""),
            str(item.get("x_text") or ""),
            str(item.get("url") or ""),
        ]
    ).lower()
    return bool(
        re.search(
            r"(保険|税|税金|住民税|手取り|家計|お金|ローン|投資|医療|健康|法律|退去費用|金融)",
            text,
        )
    )


def _moveout_hook_context(item: dict[str, Any]) -> bool:
    """退去費用系フックは、退去・引っ越し・原状回復などの文脈があるときだけ（シミュレーター単体では付けない）。"""
    app = str(item.get("app_name") or "").strip()
    cat = str(item.get("category_guess") or "").strip()
    blob = f"{app} {cat}".strip()
    if re.search(r"退去費用", app):
        return True
    if re.search(r"退去|引っ越し|原状回復|敷金|立ち退き", blob):
        return True
    return False


def pick_hook(item: dict[str, Any]) -> str:
    """X向けフック（軽いノリ／医療・法律・金融・保険・税金は断定しないトーンを維持）。"""
    app = str(item.get("app_name") or "").strip()
    cat = str(item.get("category_guess") or "").strip()
    blob = f"{app} {cat}".strip()

    if _looks_meta_app_name(app):
        return "ネコポケ、今日も小さい面倒を1個だけ減らします。"

    if app == "16bitマップタイルプロンプトジェネレーター":
        return "レトロのマップ、雰囲気で沼るタイプにおすすめ。"

    if re.search(r"保険|補償", blob):
        return "保険まわりは、チェックリストから片づけたい。"

    if re.search(r"健康|医療|病院|診療", blob):
        return "からだや受診の話、並べられると頭が楽になることが多い。"

    if re.search(r"法律|ローン|投資|金融", blob):
        return "難しい話ほど、入口は軽くしたい。"

    if _moveout_hook_context(item):
        return "退去費用、最後にドンと来る前に。"

    if re.search(r"税|税金|住民税|所得税|手取り|家計|節約|生活費|値上げ|最低賃金|給与|お金", blob):
        return "家計のモヤモヤ、まずは数字にして黙らせよう。"

    if re.search(r"プロンプトジェネレーター", app):
        return "先生、それ手作業でやる量じゃないかも。"

    if re.search(r"チェッカー", app):
        return "なんとなく不安、を一回メモに変える。"

    if re.search(r"計算アプリ", app):
        return "暗算より先に、アプリにお任せしちゃう派。"

    if re.search(r"診断", app):
        return "結果ドンより、論点だけ先に掴む。"

    return "あとでやる、を減らす仕組みづくり中。"


def pick_description(item: dict[str, Any]) -> str:
    app = str(item.get("app_name") or "").strip()
    if app == "一人暮らし実質生活費自動診断":
        return "家賃・食費・光熱費などをまとめて、毎月どれくらい必要か整理できます。"
    if app == "火災保険請求書類逆引きアプリ":
        return "火災保険の請求で必要になりやすい書類を、状況別に確認できます。"
    if app == "賃貸退去費用シミュレーター":
        return "請求項目を先に整理して、退去費用の想定額を確認する目安に使えます。"
    if app == "16bitマップタイルプロンプトジェネレーター":
        return "ドット絵・RPG風・街・森・洞窟などのマップタイル案を作る時のプロンプト補助に使えます。"
    if re.search(r"プロンプトジェネレーター", app):
        base = re.sub(r"プロンプトジェネレーター", "", app).strip() or app
        return f"{base}の案出しで詰まった時、最初のたたき台を短時間で作るのに使えます。"
    if re.search(r"シミュレーター", app):
        base = re.sub(r"シミュレーター", "", app).strip() or app
        return f"{base}の見込みを先に置いて、準備漏れを減らしたい場面で使えます。"
    if re.search(r"チェッカー", app):
        base = re.sub(r"チェッカー", "", app).strip() or app
        return f"{base}の抜け漏れ確認を、短時間で回したい時に使えます。"
    if re.search(r"計算アプリ", app):
        base = re.sub(r"計算アプリ", "", app).strip() or app
        return f"{base}を手元でさっと試算して、次の判断を早めるのに便利です。"
    if re.search(r"診断", app):
        base = trim_app_suffix(re.sub(r"診断", "", app).strip() or app)
        return f"{base}の現状をざっくり把握して、次に確認すべき点を絞るのに使えます。"
    return "気になるポイントを先に整理して、次の行動を決めやすくする用途で使えます。"


def _post_url_for_x_template(item: dict[str, Any]) -> str:
    short = str(item.get("short_url") or "").strip()
    if short:
        return short
    return str(item.get("url") or "").strip()


X_POST_ARROW_LINE = "↓ ↓ ↓"


def _build_x_text(item: dict[str, Any], idx: int) -> str:
    _ = idx  # reserved for future rotation
    app_name = str(item.get("app_name") or "").strip()
    hook = pick_hook(item)
    desc = pick_description(item)
    app_line = format_app_line_for_post(app_name)
    tail = _post_url_for_x_template(item)
    if not tail:
        ap = str(item.get("app_path") or "").strip().strip("/")
        if ap:
            tail = f"{BASE_URL}/{ap}/"
    # 順: タイトル → フック → 説明 → 🐾行 → 「↓ ↓ ↓」→ URL（※参考・確認用は本文に含めない）
    out: list[str] = ["【今日のチェック】", "", hook, "", desc, "", app_line]
    out.extend([X_POST_ARROW_LINE, tail])
    return "\n".join(out)


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


def _slug_from_short_url(value: str) -> str:
    m = re.search(r"/s/([A-Za-z0-9-]+)/?$", value.strip())
    return m.group(1) if m else ""


def _ascii_slugify(value: str) -> str:
    s = value.lower()
    s = s.replace("_", "-").replace(" ", "-")
    s = re.sub(r"[^a-z0-9-]+", "-", s)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    return s


def _looks_meta_app_name(app_name: str) -> bool:
    n = app_name.strip()
    if not n:
        return True
    return n in {"ネコポケ", "ネコポケ投稿"} or n.startswith("ネコポケ")


def _build_slug_seed(item: dict[str, Any]) -> str:
    raw = " ".join(
        [
            str(item.get("app_name") or ""),
            str(item.get("app_path") or ""),
            str(item.get("id") or ""),
        ]
    )
    seed = raw
    for jp, en in SLUG_TOKEN_MAP:
        seed = seed.replace(jp, f" {en} ")
    seed = _ascii_slugify(seed)
    # keep readable length
    if len(seed) > 40:
        seed = seed[:40].rstrip("-")
    return seed


def _build_unique_slug(seed: str, used: set[str]) -> str:
    if not seed:
        return ""
    base = seed
    if base not in used:
        return base
    for i in range(2, 1000):
        cand = f"{base}-{i}"
        if cand not in used:
            return cand
    return ""


def _pick_redirect_target(item: dict[str, Any]) -> str:
    final_url = str(item.get("url_final_url_public") or "").strip()
    if final_url:
        return final_url
    raw = str(item.get("url") or "").strip()
    if not raw:
        return ""
    try:
        u = urlparse(raw)
        segs = [quote(x, safe="") for x in (u.path or "/").split("/") if x]
        path = "/" + "/".join(segs)
        if (u.path or "").endswith("/"):
            path += "/"
        return urlunparse((u.scheme, u.netloc, path, "", u.query, ""))
    except Exception:
        return raw


def _redirect_html(title: str, target: str) -> str:
    t = target.replace("&", "&amp;")
    safe_title = title.replace("&", "&amp;").replace("<", "&lt;")
    return (
        "<!DOCTYPE html>\n"
        "<html lang=\"ja\">\n"
        "<head>\n"
        "  <meta charset=\"utf-8\" />\n"
        f"  <meta http-equiv=\"refresh\" content=\"0;url={t}\" />\n"
        f"  <link rel=\"canonical\" href=\"{t}\" />\n"
        f"  <title>{safe_title}へ移動中</title>\n"
        "</head>\n"
        "<body>\n"
        f"  <script>location.replace({json.dumps(target, ensure_ascii=False)});</script>\n"
        f"  <p><a href=\"{t}\">続きはこちら</a></p>\n"
        "</body>\n"
        "</html>\n"
    )


def _replace_tail_url_with_short(x_text: str, short_url: str) -> str:
    text = (x_text or "").rstrip()
    if not text:
        return short_url
    lines = text.splitlines()
    # replace last nekopoke URL line, otherwise append
    for i in range(len(lines) - 1, -1, -1):
        if "https://nekopoke.jp/" in lines[i]:
            lines[i] = short_url
            return "\n".join(lines)
    return text + "\n\n" + short_url


def ensure_short_urls(
    dry_run: bool = True,
    queue_override: list[dict[str, Any]] | None = None,
    suppress_print: bool = False,
) -> dict[str, int]:
    queue = queue_override if queue_override is not None else _load_queue()
    existing_slugs: set[str] = set()
    s_root = ROOT / "s"
    if s_root.is_dir():
        for d in s_root.iterdir():
            if d.is_dir():
                existing_slugs.add(d.name)
    for item in queue:
        su = str(item.get("short_url") or "")
        if su:
            slug = _slug_from_short_url(su)
            if slug:
                existing_slugs.add(slug)

    targets: list[tuple[dict[str, Any], str, str]] = []
    skipped_meta = 0
    skipped_posted = 0
    manual = 0
    file_exists = 0
    for item in queue:
        app_name = str(item.get("app_name") or "").strip()
        url = str(item.get("url") or "").strip()
        if not app_name or not url:
            continue
        if str(item.get("short_url") or "").strip():
            continue
        if _looks_meta_app_name(app_name):
            skipped_meta += 1
            continue
        if str(item.get("status") or "") == "posted":
            skipped_posted += 1
            continue
        seed = _build_slug_seed(item)
        slug = _build_unique_slug(seed, existing_slugs)
        if not slug:
            manual += 1
            continue
        html_path = ROOT / "s" / slug / "index.html"
        if html_path.exists():
            file_exists += 1
            continue
        target = _pick_redirect_target(item)
        if not target:
            manual += 1
            continue
        existing_slugs.add(slug)
        targets.append((item, slug, target))

    if not suppress_print:
        print(f"[ensure-short-urls] dry_run={dry_run}")
        print(f"candidates: {len(targets)}")
        print(f"manual_check_needed: {manual}")
        print(f"skipped_meta: {skipped_meta}")
        print(f"skipped_posted: {skipped_posted}")
        print(f"skipped_existing_index: {file_exists}")
        for item, slug, target in targets[:50]:
            post_id = str(item.get("id") or "")
            short_url = f"{BASE_URL}/s/{slug}/"
            print(f"- {post_id}: {short_url} -> {target}")

    if dry_run:
        return {
            "planned": len(targets),
            "manual": manual,
            "skipped_meta": skipped_meta,
            "skipped_posted": skipped_posted,
            "skipped_existing_index": file_exists,
        }

    updated = 0
    created = 0
    for item, slug, target in targets:
        short_url = f"{BASE_URL}/s/{slug}/"
        html_path = ROOT / "s" / slug / "index.html"
        if html_path.exists():
            continue
        html_path.parent.mkdir(parents=True, exist_ok=True)
        html_path.write_text(_redirect_html(str(item.get("app_name") or "アプリ"), target), encoding="utf-8")
        created += 1
        item["short_url"] = short_url
        item["x_text"] = _replace_tail_url_with_short(str(item.get("x_text") or ""), short_url)
        updated += 1

    _save_queue(queue)
    if not suppress_print:
        print(f"updated_queue: {updated}")
        print(f"created_redirect_pages: {created}")
    return {
        "planned": len(targets),
        "manual": manual,
        "updated": updated,
        "created": created,
        "skipped_meta": skipped_meta,
        "skipped_posted": skipped_posted,
        "skipped_existing_index": file_exists,
    }


def _collect_unposted_candidates(queue: list[dict[str, Any]]) -> list[dict[str, Any]]:
    return [
        x
        for x in queue
        if isinstance(x, dict)
        and x.get("status") in {"draft", "scheduled"}
        and str(x.get("app_name") or "").strip()
        and str(x.get("url") or "").strip()
    ]


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


def append_x_drafts(limit: int = 3, dry_run: bool = False, allow_single: bool = False) -> list[dict[str, Any]]:
    if allow_single:
        limit = max(1, limit)
    else:
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
        stub_item: dict[str, Any] = {
            "app_name": app_name,
            "app_path": app_path,
            "url": url,
            "category_guess": category,
            "short_url": "",
            "category": "",
            "x_text": "",
        }
        x_text = _build_x_text(stub_item, i)
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

    if not dry_run:
        queue.extend(new_items)
        _save_queue(queue)
    return new_items


def refill_x_posts(target: int = 30, dry_run: bool = True) -> dict[str, int]:
    target = max(1, int(target))
    queue = _load_queue()
    current = _collect_unposted_candidates(queue)
    current_count = len(current)
    need = max(0, target - current_count)

    print(f"[refill-x-posts] dry_run={dry_run} target={target}")
    print(f"current_unposted_candidates: {current_count}")
    print(f"need_to_add: {need}")

    planned_new: list[dict[str, Any]] = []
    if need > 0:
        # Plan/generate in memory using existing generator logic, then optionally persist.
        generated = append_x_drafts(limit=need, dry_run=True, allow_single=True)
        planned_new = generated[:need]
        print(f"planned_new_posts: {len(planned_new)}")
        for item in planned_new[:30]:
            print(f"- add: {item.get('id')} {item.get('app_name')}")
        if not dry_run and planned_new:
            queue.extend(planned_new)
    else:
        print("planned_new_posts: 0")

    short_summary = ensure_short_urls(
        dry_run=dry_run,
        queue_override=queue,
        suppress_print=True,
    )
    print(f"planned_short_url_updates: {short_summary.get('planned', 0)}")
    print(f"manual_check_needed: {short_summary.get('manual', 0)}")
    print(f"skipped_meta: {short_summary.get('skipped_meta', 0)}")
    if not dry_run:
        # ensure_short_urls already saved queue and html files.
        print("applied: queue/json + redirect pages updated")

    return {
        "current": current_count,
        "need": need,
        "planned_new": len(planned_new),
        "planned_short": int(short_summary.get("planned", 0)),
        "manual": int(short_summary.get("manual", 0)),
    }


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


def refresh_x_copy(dry_run: bool = False) -> int:
    queue = _load_queue()
    updated = 0
    samples: list[tuple[str, str]] = []
    for item in queue:
        if item.get("status") not in {"draft", "scheduled"}:
            continue
        app_name = str(item.get("app_name") or "")
        app_path = str(item.get("app_path") or "").strip("/")
        if not app_name or not app_path:
            continue
        url = f"{BASE_URL}/{app_path}/"
        preview_item = {**item, "url": url}
        new_x = _build_x_text(preview_item, updated)
        if dry_run:
            if len(samples) < 3:
                samples.append((str(item.get("id") or ""), new_x))
        else:
            item["url"] = url
            item["x_text"] = new_x
        updated += 1
    if dry_run:
        print(f"[refresh-x-copy dry-run] would_update={updated}")
        for sid, xt in samples:
            print(f"--- sample id={sid} ---")
            print(xt)
            print("--- end sample ---")
    else:
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
    parser.add_argument(
        "--refresh-x-copy",
        action="store_true",
        help="Regenerate draft x_text with latest templates. Use with --dry-run to preview without saving sns_queue.json.",
    )
    parser.add_argument("--ensure-short-urls", action="store_true", help="Ensure short_url and s/<slug>/index.html for queue items.")
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without writing files (e.g. with --refresh-x-copy or --ensure-short-urls).",
    )
    parser.add_argument("--refill-x-posts", action="store_true", help="Refill queue up to target then ensure short URLs.")
    parser.add_argument("--target", type=int, default=30, help="Target count for --refill-x-posts.")
    parser.add_argument("--daily-plan", action="store_true", help="Create 3 scheduled posts for a target date.")
    parser.add_argument("--date", type=str, help="Target date for --daily-plan (YYYY-MM-DD).")
    parser.add_argument("--mark-posted", type=str, metavar="ID", help="Mark a queue item as posted by id.")
    args = parser.parse_args()

    if args.normalize_urls:
        u1, u2 = normalize_urls()
        print(f"Normalized URL fields: {u1}, text fields: {u2}")

    if args.generate:
        items = append_x_drafts(limit=args.limit, dry_run=args.dry_run)
        print(f"Added {len(items)} X draft posts.")
        for x in items:
            print(f"- {x['app_name']} ({x['url']})")

    if args.refresh_x_copy:
        n = refresh_x_copy(dry_run=args.dry_run)
        if not args.dry_run:
            print(f"Refreshed X copy for draft posts: {n}")

    if args.ensure_short_urls:
        ensure_short_urls(dry_run=args.dry_run)
        return 0

    if args.refill_x_posts:
        refill_x_posts(target=args.target, dry_run=args.dry_run)
        return 0

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

    ran_cli_action = (
        args.generate
        or args.normalize_urls
        or args.refresh_x_copy
        or args.ensure_short_urls
        or args.refill_x_posts
        or args.daily_plan
        or bool(args.mark_posted)
    )
    if args.preview or not ran_cli_action:
        rows = preview_x_drafts(limit=10)
        lines = _build_preview_lines(rows)
        for line in lines:
            print(line)
        _write_preview_file(lines)
        print(f"Saved UTF-8 preview: {X_PREVIEW_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
