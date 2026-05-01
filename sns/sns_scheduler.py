from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent.parent
QUEUE_PATH = ROOT / "sns" / "sns_queue.json"


def _load_queue(path: Path) -> list[dict[str, Any]]:
    if not path.is_file():
        raise FileNotFoundError(f"sns_queue.json not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise ValueError("sns_queue.json must be a JSON array.")
    out: list[dict[str, Any]] = []
    for item in data:
        if isinstance(item, dict):
            out.append(item)
    return out


def _pick_top_draft(queue: list[dict[str, Any]]) -> dict[str, Any] | None:
    drafts = [item for item in queue if item.get("status") == "draft"]
    if not drafts:
        return None
    drafts.sort(
        key=lambda item: (
            -int(item.get("sns_priority_score", 0)),
            str(item.get("created_at", "")),
            str(item.get("id", "")),
        )
    )
    return drafts[0]


def _print_preview(item: dict[str, Any]) -> None:
    print("=== DRY-RUN POST PREVIEW ===")
    print(f"app_name: {item.get('app_name', '')}")
    print(f"url: {item.get('url', '')}")
    print("--- x_text ---")
    print(item.get("x_text", ""))
    print("--- instagram_caption ---")
    print(item.get("instagram_caption", ""))
    print("--- tiktok_caption ---")
    print(item.get("tiktok_caption", ""))
    print(f"card_image: {item.get('card_image', '')}")


def _schedule_item(item: dict[str, Any]) -> None:
    now = datetime.now().astimezone().isoformat(timespec="seconds")
    item["status"] = "scheduled"
    item["scheduled_at"] = now
    item["posted_at"] = None


def _list_scheduled(queue: list[dict[str, Any]]) -> None:
    scheduled = [item for item in queue if item.get("status") == "scheduled"]
    if not scheduled:
        print("scheduled投稿はありません")
        return
    scheduled.sort(
        key=lambda item: (
            str(item.get("scheduled_at", "")),
            str(item.get("id", "")),
        ),
        reverse=True,
    )
    print("=== SCHEDULED POSTS ===")
    for item in scheduled:
        print(f"id: {item.get('id', '')}")
        print(f"app_name: {item.get('app_name', '')}")
        print(f"scheduled_at: {item.get('scheduled_at', '')}")
        print(f"sns_priority_score: {item.get('sns_priority_score', 0)}")
        print(f"url: {item.get('url', '')}")
        print(f"card_image: {item.get('card_image', '')}")
        print("---")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Dry-run scheduler for SNS queue (no external posting)."
    )
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--schedule",
        action="store_true",
        help="Update selected draft item to status=scheduled.",
    )
    mode.add_argument(
        "--list-scheduled",
        action="store_true",
        help="Show status=scheduled posts without changing queue.",
    )
    args = parser.parse_args()

    queue = _load_queue(QUEUE_PATH)
    if args.list_scheduled:
        _list_scheduled(queue)
        return 0

    target = _pick_top_draft(queue)
    if target is None:
        print("No draft posts found.")
        return 0

    _print_preview(target)

    if args.schedule:
        _schedule_item(target)
        QUEUE_PATH.write_text(json.dumps(queue, ensure_ascii=False, indent=2), encoding="utf-8")
        print("Scheduled one post (status=draft -> scheduled).")
        print(f"id: {target.get('id', '')}")
        print(f"scheduled_at: {target.get('scheduled_at', '')}")
    else:
        print("Dry-run only. No queue updates were made.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
