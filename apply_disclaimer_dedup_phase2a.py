"""
apply_disclaimer_dedup_phase2a.py

免責文重複整理 Phase 2-α 適用スクリプト。

テンプレA（source-note + disclaimer-card）のうち、
disclaimer-card内のdisclaimer-textが「ストック金融文言」と完全一致する
アプリのみ、disclaimer-cardブロックを削除する。source-noteは残す。

安全フィルタ:
- 完全一致以外（カスタム文言・絵文字付き・追加文言あり）はskip
- app名に「税/給与/保険/医療/健康/年金」を含むアプリはskip（金融健康関連で文言が適切な可能性）
- テンプレB（.disclaimer + source-note）は対象外

dry-run（デフォルト）: 実ファイル書き換えなし。
--apply: 実ファイル書き換え。
--limit N: 最初のN件のみ対象（dry-run確認用）。
"""
import argparse, json, re, sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent
EXCLUDE_DIRS = {'__pycache__', '_public_audit', 'assets', 'brand', 'category',
                's', 'sns', '.git', '.claude'}

# 削除対象の完全一致ストック文言
STOCK_TEXT = "本ツールは概算です。正確な金額は給与明細・公式情報・税理士・FP（ファイナンシャルプランナー）にご確認ください。"

# app名スキップキーワード（金融健康関連 → ストック文言が適切な可能性あり）
SKIP_KEYWORDS = ['税', '給与', '保険', '医療', '健康', '年金']

SOURCE_NOTE_RE = re.compile(r'<p[^>]*class="source-note"[^>]*>([^<]+)</p>')
DISCLAIMER_CARD_RE = re.compile(
    r'<div[^>]*class="[^"]*disclaimer-card[^"]*"[^>]*>([\s\S]*?)</div>'
)
DISCLAIMER_TEXT_RE = re.compile(
    r'<p[^>]*class="[^"]*disclaimer-text[^"]*"[^>]*>([^<]+)</p>'
)


def list_app_dirs(root):
    apps = []
    for d in sorted(root.iterdir()):
        if not d.is_dir(): continue
        if d.name in EXCLUDE_DIRS: continue
        if d.name.startswith('.') or d.name.startswith('_'): continue
        if (d / 'index.html').exists():
            apps.append(d)
    return apps


def find_cut_segment(html, match):
    """マッチした要素+前後の空白/改行を最小範囲で切り出す。"""
    start, end = match.start(), match.end()
    walk = start - 1
    while walk >= 0 and html[walk] in ' \t':
        walk -= 1
    is_line_start = (walk < 0) or (html[walk] == '\n')
    cut_start = walk + 1 if is_line_start else start
    cut_end = end
    if cut_end < len(html) and html[cut_end] == '\n':
        cut_end += 1
    return cut_start, cut_end


def classify(name, html):
    """戻り値: (status, info)"""
    info = {}
    src_m = SOURCE_NOTE_RE.search(html)
    if not src_m:
        return 'skip_no_source_note', info
    card_m = DISCLAIMER_CARD_RE.search(html)
    if not card_m:
        return 'skip_no_disclaimer_card', info
    # 安全: source-note が disclaimer-card の内側にあるアプリは削除NG
    if card_m.start() <= src_m.start() <= card_m.end():
        return 'skip_source_note_inside_card', info
    txt_m = DISCLAIMER_TEXT_RE.search(card_m.group(1))
    if not txt_m:
        return 'skip_no_disclaimer_text', info
    actual_text = txt_m.group(1).strip()
    info['actual_text'] = actual_text
    if actual_text != STOCK_TEXT:
        return 'skip_not_stock_text', info
    # name keyword check
    for kw in SKIP_KEYWORDS:
        if kw in name:
            info['matched_keyword'] = kw
            return 'skip_finance_health_name', info
    return 'ELIGIBLE', info


def transform(html, card_match):
    """disclaimer-card ブロックを削除した HTML を返す。"""
    cut_start, cut_end = find_cut_segment(html, card_match)
    return html[:cut_start] + html[cut_end:], cut_start, cut_end


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='実ファイル書き換えを実行する')
    ap.add_argument('--limit', type=int, default=None, help='対象上限件数（dry-run確認用）')
    ap.add_argument('--out', default='_public_audit/disclaimer_dedup_phase2a_dryrun_20260523.json')
    args = ap.parse_args()

    apps = list_app_dirs(ROOT)
    status_counter = Counter()
    eligible_apps = []
    skip_samples = {}

    for d in apps:
        try:
            html = (d / 'index.html').read_text(encoding='utf-8', errors='ignore')
        except Exception:
            status_counter['error_read'] += 1
            continue
        status, info = classify(d.name, html)
        status_counter[status] += 1
        if status == 'ELIGIBLE':
            eligible_apps.append((d, info))
        else:
            skip_samples.setdefault(status, []).append(d.name)

    # Apply limit for processing (not for counting)
    target_apps = eligible_apps[:args.limit] if args.limit else eligible_apps

    processed = []
    for d, info in target_apps:
        html = (d / 'index.html').read_text(encoding='utf-8', errors='ignore')
        card_m = DISCLAIMER_CARD_RE.search(html)
        if not card_m:
            continue
        new_html, cut_start, cut_end = transform(html, card_m)
        # Verify source-note still present in new_html
        still_has_source = bool(SOURCE_NOTE_RE.search(new_html))
        # Verify disclaimer-card is gone
        still_has_card = bool(DISCLAIMER_CARD_RE.search(new_html))

        sample = {
            'name': d.name,
            'removed_segment': html[cut_start:cut_end],
            'context_after': new_html[max(0, cut_start - 60):cut_start + 120],
            'still_has_source_note': still_has_source,
            'still_has_disclaimer_card': still_has_card,
        }
        processed.append(sample)
        if args.apply:
            (d / 'index.html').write_text(new_html, encoding='utf-8', newline='\n')

    summary = {
        'total_apps': len(apps),
        'mode': 'APPLY' if args.apply else 'DRY_RUN',
        'limit': args.limit,
        'status_counter': dict(status_counter),
        'eligible_total': status_counter.get('ELIGIBLE', 0),
        'processed_count': len(processed),
        'all_source_note_preserved': all(p['still_has_source_note'] for p in processed) if processed else None,
        'all_disclaimer_card_removed': all(not p['still_has_disclaimer_card'] for p in processed) if processed else None,
    }

    out = Path(args.out)
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({
        'summary': summary,
        'samples': processed,
        'skip_samples_per_reason': {k: v[:10] for k, v in skip_samples.items()},
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
