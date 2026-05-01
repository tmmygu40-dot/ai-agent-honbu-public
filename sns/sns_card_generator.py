from __future__ import annotations

import hashlib
import json
import re
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SNS_DIR = ROOT / "sns"
CARDS_DIR = SNS_DIR / "cards"
QUEUE_PATH = SNS_DIR / "sns_queue.json"

STYLE_MAP = {
    "money": {
        "bg": (255, 248, 214),
        "header": (188, 142, 23),
        "panel": (255, 255, 244),
        "outline": (236, 218, 146),
        "title": (82, 63, 10),
        "sub": (117, 96, 36),
        "app": (119, 98, 42),
        "cta": (154, 121, 22),
        "icons": ["💰"],
    },
    "insurance": {
        "bg": (231, 243, 255),
        "header": (39, 108, 195),
        "panel": (245, 250, 255),
        "outline": (176, 207, 242),
        "title": (19, 56, 105),
        "sub": (44, 86, 143),
        "app": (67, 98, 140),
        "cta": (29, 118, 194),
        "icons": ["🛡"],
    },
    "disaster": {
        "bg": (255, 239, 225),
        "header": (213, 104, 44),
        "panel": (255, 250, 244),
        "outline": (244, 192, 154),
        "title": (116, 54, 16),
        "sub": (142, 78, 33),
        "app": (142, 91, 58),
        "cta": (213, 104, 44),
        "icons": ["⚠️"],
    },
    "health": {
        "bg": (230, 246, 236),
        "header": (48, 133, 89),
        "panel": (246, 252, 248),
        "outline": (176, 222, 191),
        "title": (25, 85, 53),
        "sub": (46, 106, 73),
        "app": (72, 118, 91),
        "cta": (53, 149, 94),
        "icons": ["🏥"],
    },
    "work": {
        "bg": (233, 237, 247),
        "header": (45, 64, 115),
        "panel": (244, 247, 255),
        "outline": (183, 193, 226),
        "title": (31, 47, 84),
        "sub": (58, 74, 115),
        "app": (81, 91, 121),
        "cta": (52, 74, 132),
        "icons": ["💼"],
    },
    "life": {
        "bg": (246, 239, 227),
        "header": (145, 110, 70),
        "panel": (252, 249, 244),
        "outline": (226, 205, 176),
        "title": (89, 63, 34),
        "sub": (115, 85, 52),
        "app": (124, 100, 74),
        "cta": (166, 128, 82),
        "icons": ["🏠"],
    },
    "other": {
        "bg": (245, 249, 255),
        "header": (28, 76, 161),
        "panel": (255, 255, 255),
        "outline": (218, 229, 245),
        "title": (19, 36, 66),
        "sub": (62, 84, 120),
        "app": (72, 88, 112),
        "cta": (31, 132, 69),
        "icons": ["✨"],
    },
}


def _load_font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    candidates = [
        "C:/Windows/Fonts/YuGothB.ttc" if bold else "C:/Windows/Fonts/YuGothR.ttc",
        "C:/Windows/Fonts/meiryob.ttc" if bold else "C:/Windows/Fonts/meiryo.ttc",
        "C:/Windows/Fonts/msgothic.ttc",
        "C:/Windows/Fonts/msjh.ttc",
    ]
    for path in candidates:
        p = Path(path)
        if p.is_file():
            try:
                return ImageFont.truetype(str(p), size=size)
            except OSError:
                continue
    return ImageFont.load_default()


def _safe_card_basename(app_path: str) -> str:
    base = re.sub(r"[^A-Za-z0-9_-]+", "_", app_path).strip("_").lower()
    h = hashlib.sha1(app_path.encode("utf-8")).hexdigest()[:8]
    if not base:
        base = "app"
    return f"{base}_{h}"


def _variant_seed(item: dict[str, Any]) -> int:
    key = str(item.get("app_path") or item.get("id") or "")
    h = hashlib.sha1(key.encode("utf-8")).hexdigest()[:8]
    return int(h, 16)


def _pick_theme(item: dict[str, Any]) -> dict[str, Any]:
    category = str(item.get("category_guess") or "")
    app_name = str(item.get("app_name") or "")
    text = f"{category} {app_name}"

    if any(k in text for k in ["お金", "家計", "税", "値上げ", "住民税", "手取り", "年収"]):
        return STYLE_MAP["money"]
    if any(k in text for k in ["保険", "補償", "火災"]):
        return STYLE_MAP["insurance"]
    if any(k in text for k in ["防災", "地震", "台風", "避難", "災害"]):
        return STYLE_MAP["disaster"]
    if any(k in text for k in ["健康", "医療", "病院", "症状", "受診"]):
        return STYLE_MAP["health"]
    if any(k in text for k in ["仕事", "実務", "業務", "人事", "給与"]):
        return STYLE_MAP["work"]
    if any(k in text for k in ["生活", "契約", "引っ越し", "退去", "暮らし"]):
        return STYLE_MAP["life"]
    return STYLE_MAP["other"]


def _draw_background_decor(draw: ImageDraw.ImageDraw, theme: dict[str, Any], seed: int) -> None:
    bg = theme["bg"]
    overlay1 = (255, 255, 255, 58)
    overlay2 = (255, 255, 255, 42)
    overlay3 = (255, 255, 255, 36)

    # soft circles
    shift = seed % 70
    draw.ellipse((40 - shift, 120, 480 - shift, 560), fill=overlay1)
    draw.ellipse((760 + (shift // 2), 220, 1200 + (shift // 2), 660), fill=overlay2)
    draw.ellipse((180, 780 + (shift // 4), 600, 1180 + (shift // 4)), fill=overlay3)

    # soft diagonal-ish bands
    band_y = 880 + (seed % 60)
    draw.rounded_rectangle((0, band_y, 1200, band_y + 64), radius=28, fill=(255, 255, 255, 55))
    band_y2 = 190 + (seed % 40)
    draw.rounded_rectangle((0, band_y2, 1200, band_y2 + 36), radius=18, fill=(255, 255, 255, 48))

    # background recolor layer for subtle tinting
    draw.rectangle((0, 0, 1200, 1200), fill=(*bg, 120))


def _draw_large_icon(draw: ImageDraw.ImageDraw, icon: str, seed: int) -> None:
    font = _load_font(184, bold=True)
    fill = (34, 58, 99, 150)
    # Always top-right for clearer genre cue in feed.
    draw.text((918, 54), icon, font=font, fill=fill)


def _shorten_app_name(name: str, max_chars: int = 20) -> str:
    text = name.strip()
    if len(text) <= max_chars:
        return text
    return text[: max_chars - 1] + "…"


def _fix_orphan_punctuation(lines: list[str]) -> list[str]:
    if len(lines) < 2:
        return lines
    if lines[-1] in {"？", "!", "！", "?", "。", "、"}:
        lines[-2] = lines[-2] + lines[-1]
        lines.pop()
    elif len(lines[-1]) == 1 and lines[-1] in {"？", "!", "！", "?", "。", "、"}:
        lines[-2] = lines[-2] + lines[-1]
        lines.pop()
    return lines


def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.ImageFont, max_width: int, max_lines: int) -> list[str]:
    if not text.strip():
        return [""]
    out: list[str] = []
    for para in text.splitlines():
        para = para.strip()
        if not para:
            continue
        line = ""
        for ch in para:
            trial = line + ch
            w = draw.textbbox((0, 0), trial, font=font)[2]
            if w <= max_width or not line:
                line = trial
            else:
                out.append(line)
                line = ch
            if len(out) >= max_lines:
                break
        if len(out) >= max_lines:
            break
        if line:
            out.append(line)
        if len(out) >= max_lines:
            break
    lines = [ln.strip() for ln in (out[:max_lines] if out else [""])]
    return _fix_orphan_punctuation(lines)


def _draw_multiline_center(
    draw: ImageDraw.ImageDraw,
    text: str,
    y: int,
    size: int,
    color: tuple[int, int, int],
    max_width: int,
    max_lines: int,
    bold: bool = False,
) -> int:
    chosen_font = _load_font(size, bold=bold)
    chosen_lines = _wrap_text(draw, text, chosen_font, max_width=max_width, max_lines=max_lines)

    # If text is long, gently reduce font size for better readability.
    for try_size in range(size, max(32, size - 24), -2):
        font = _load_font(try_size, bold=bold)
        lines = _wrap_text(draw, text, font, max_width=max_width, max_lines=max_lines)
        overflow = False
        for ln in lines:
            w = draw.textbbox((0, 0), ln, font=font)[2]
            if w > max_width:
                overflow = True
                break
        if not overflow:
            chosen_font = font
            chosen_lines = lines
            break

    line_h = int(chosen_font.size * 1.28)
    x_center = 600
    for i, line in enumerate(chosen_lines):
        bbox = draw.textbbox((0, 0), line, font=chosen_font)
        w = bbox[2] - bbox[0]
        x = int(x_center - (w / 2))
        draw.text((x, y + i * line_h), line, font=chosen_font, fill=color)
    return y + len(chosen_lines) * line_h


def _generate_card(item: dict[str, Any], path: Path) -> None:
    theme = _pick_theme(item)
    seed = _variant_seed(item)
    icon_list = theme.get("icons") or ["✨"]
    icon = icon_list[seed % len(icon_list)]
    image = Image.new("RGB", (1200, 1200), theme["bg"])
    draw = ImageDraw.Draw(image, "RGBA")
    _draw_background_decor(draw, theme, seed)
    _draw_large_icon(draw, icon, seed)

    # Header band
    draw.rectangle((0, 0, 1200, 160), fill=theme["header"])
    draw.text((68, 52), "ネコポケ", font=_load_font(56, bold=True), fill=(255, 255, 255, 255))

    # Soft content panel
    panel_y = 190 + (seed % 18)
    panel_h = 790 - (seed % 16)
    draw.rounded_rectangle(
        (56, panel_y, 1144, panel_y + panel_h),
        radius=28,
        fill=theme["panel"],
        outline=theme["outline"],
        width=4,
    )

    title = str(item.get("image_title") or "いまの状況を確認")
    app_name = _shorten_app_name(str(item.get("app_name") or ""), max_chars=20)

    # Fixed line 1 (always the same, red and eye-catching)
    y = panel_y + 56
    y = _draw_multiline_center(
        draw,
        "えっ、知らないの⁈",
        y,
        size=76,
        color=(214, 38, 38),
        max_width=980,
        max_lines=1,
        bold=True,
    )
    y += 20

    # Line 2 (per-app main heading)
    y = _draw_multiline_center(draw, title, y, size=86, color=theme["title"], max_width=960, max_lines=2, bold=True)
    y += 20

    # Line 3 (fixed subtitle baseline)
    y = _draw_multiline_center(draw, "30秒で目安チェック", y, size=52, color=theme["sub"], max_width=940, max_lines=1)
    y += 24

    # Line 4 (app name, small)
    _draw_multiline_center(draw, app_name, y, size=40, color=theme["app"], max_width=940, max_lines=3)

    # CTA-like footer label (for card only, not posting)
    draw.rounded_rectangle((340, 1020, 860, 1110), radius=45, fill=theme["cta"])
    cta_text = "無料チェック"
    cta_font = _load_font(54, bold=True)
    cta_w = draw.textbbox((0, 0), cta_text, font=cta_font)[2]
    draw.text((600 - int(cta_w / 2), 1041), cta_text, font=cta_font, fill=(255, 255, 255, 255))

    path.parent.mkdir(parents=True, exist_ok=True)
    image.save(path, format="PNG")


def main(force: bool = False) -> int:
    if not QUEUE_PATH.is_file():
        raise FileNotFoundError(f"Queue file not found: {QUEUE_PATH}")

    queue = json.loads(QUEUE_PATH.read_text(encoding="utf-8"))
    if not isinstance(queue, list):
        raise ValueError("sns_queue.json must be a JSON array.")

    CARDS_DIR.mkdir(parents=True, exist_ok=True)
    generated = 0
    for item in queue:
        if not isinstance(item, dict):
            continue
        if item.get("status") not in {"draft", "scheduled"}:
            continue
        app_path = str(item.get("app_path") or item.get("id") or "post")
        existing_rel = item.get("card_image")
        if isinstance(existing_rel, str) and existing_rel.strip():
            rel = existing_rel.strip()
        else:
            basename = _safe_card_basename(app_path)
            rel = f"sns/cards/{basename}.png"
        if not force and isinstance(item.get("card_image"), str) and item.get("card_image"):
            continue
        out_path = ROOT / rel
        _generate_card(item, out_path)
        item["card_image"] = rel
        generated += 1

    QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Generated cards: {generated}")
    print(f"Cards directory: {CARDS_DIR}")
    return 0


if __name__ == "__main__":
    force_mode = "--force" in sys.argv
    raise SystemExit(main(force=force_mode))
