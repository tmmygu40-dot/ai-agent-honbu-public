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
    image = Image.new("RGB", (1200, 1200), (245, 249, 255))
    draw = ImageDraw.Draw(image)

    # Header band
    draw.rectangle((0, 0, 1200, 160), fill=(28, 76, 161))
    draw.text((68, 52), "ネコポケ", font=_load_font(56, bold=True), fill=(255, 255, 255))

    # Soft content panel
    draw.rounded_rectangle((56, 190, 1144, 980), radius=28, fill=(255, 255, 255), outline=(218, 229, 245), width=4)

    title = str(item.get("image_title") or "無料チェック")
    subtitle = str(item.get("image_subtitle") or "まずは目安を確認")
    app_name = str(item.get("app_name") or "")

    y = 260
    y = _draw_multiline_center(draw, title, y, size=82, color=(19, 36, 66), max_width=960, max_lines=2, bold=True)
    y += 24
    y = _draw_multiline_center(draw, subtitle, y, size=52, color=(62, 84, 120), max_width=940, max_lines=2)
    y += 34
    _draw_multiline_center(draw, app_name, y, size=42, color=(72, 88, 112), max_width=940, max_lines=3)

    # CTA-like footer label (for card only, not posting)
    draw.rounded_rectangle((340, 1020, 860, 1110), radius=45, fill=(31, 132, 69))
    cta_text = "無料チェック"
    cta_font = _load_font(54, bold=True)
    cta_w = draw.textbbox((0, 0), cta_text, font=cta_font)[2]
    draw.text((600 - int(cta_w / 2), 1041), cta_text, font=cta_font, fill=(255, 255, 255))

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
        if item.get("status") != "draft":
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
