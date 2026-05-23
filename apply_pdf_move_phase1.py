"""
apply_pdf_move_phase1.py

PDFボタン位置改善 Phase 1 適用スクリプト。
PDFボタンが FAQ セクションより後ろにあるアプリで、PDFボタンを
FAQ 直前へ移動する。免責文・FAQ本文・検索JSは触らない。

dry-run（デフォルト）: 実ファイル書き換えなし。
--apply: 実ファイル書き換え。
"""
import argparse, json, re, sys
from pathlib import Path
from collections import Counter

ROOT = Path(__file__).parent
EXCLUDE_DIRS = {'__pycache__', '_public_audit', 'assets', 'brand', 'category',
                's', 'sns', '.git', '.claude'}

PDF_BUTTON_RE = re.compile(
    r'<button\b[^>]*(?:class="[^"]*btn-pdf[^"]*"|onclick="window\.print\(\)")[^>]*>[^<]*</button>'
)
FAQ_SECTION_RE = re.compile(r'<(section|div)[^>]*class="[^"]*faq[^"]*"[^>]*>')


def list_app_dirs(root):
    apps = []
    for d in sorted(root.iterdir()):
        if not d.is_dir(): continue
        if d.name in EXCLUDE_DIRS: continue
        if d.name.startswith('.') or d.name.startswith('_'): continue
        if (d / 'index.html').exists():
            apps.append(d)
    return apps


def find_cut_segment(html, pdf_match):
    """PDFボタン+前後の空白/改行を最小範囲で切り出す。"""
    start, end = pdf_match.start(), pdf_match.end()
    # walk back over leading whitespace on the same line
    walk = start - 1
    while walk >= 0 and html[walk] in ' \t':
        walk -= 1
    is_line_start = (walk < 0) or (html[walk] == '\n')
    cut_start = walk + 1 if is_line_start else start
    cut_end = end
    if cut_end < len(html) and html[cut_end] == '\n':
        cut_end += 1
    return cut_start, cut_end


def get_anchor_indent(html, anchor_pos):
    """anchor行の先頭indent文字列を返す。"""
    walk = anchor_pos - 1
    while walk >= 0 and html[walk] in ' \t':
        walk -= 1
    indent_start = walk + 1
    if walk >= 0 and html[walk] == '\n':
        return html[indent_start:anchor_pos], indent_start
    return '', anchor_pos


def transform(html):
    """戻り値: (new_html or None, status, info_dict)"""
    pdf_matches = list(PDF_BUTTON_RE.finditer(html))
    faq_matches = list(FAQ_SECTION_RE.finditer(html))

    info = {
        'pdf_count': len(pdf_matches),
        'faq_count': len(faq_matches),
    }

    if not pdf_matches:
        return None, 'skip_no_pdf', info
    if not faq_matches:
        return None, 'skip_no_faq', info
    if len(pdf_matches) > 1:
        return None, 'skip_multi_pdf', info

    pdf_m = pdf_matches[0]
    faq_m = faq_matches[0]

    if pdf_m.start() <= faq_m.start():
        return None, 'skip_already_ok', info

    # script/comment containment check
    before = html[:pdf_m.start()]
    if before.rfind('<script') > before.rfind('</script>'):
        return None, 'skip_pdf_in_script', info
    if before.rfind('<!--') > before.rfind('-->'):
        return None, 'skip_pdf_in_comment', info

    button_html = pdf_m.group(0)
    cut_start, cut_end = find_cut_segment(html, pdf_m)

    # FAQ is BEFORE PDF in source, so removing PDF segment does not shift faq position
    modified = html[:cut_start] + html[cut_end:]

    faq_pos = faq_m.start()
    indent, indent_start = get_anchor_indent(modified, faq_pos)

    insert_str = indent + button_html + '\n'
    result = modified[:indent_start] + insert_str + modified[indent_start:]

    info['cut_start'] = cut_start
    info['cut_end'] = cut_end
    info['insert_pos'] = indent_start
    info['indent_len'] = len(indent)
    return result, 'moved', info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--apply', action='store_true', help='実ファイル書き換えを実行する')
    ap.add_argument('--out', default='_public_audit/pdf_move_apply_dryrun_20260523.json')
    ap.add_argument('--sample-bef-aft', type=int, default=10,
                    help='before/afterを保存するサンプル件数')
    args = ap.parse_args()

    apps = list_app_dirs(ROOT)
    status_counter = Counter()
    samples_bef_aft = []
    moved_names = []
    skip_by_reason = {}

    for d in apps:
        try:
            html = (d / 'index.html').read_text(encoding='utf-8', errors='ignore')
        except Exception:
            status_counter['error_read'] += 1
            continue
        new_html, status, info = transform(html)
        status_counter[status] += 1

        if status == 'moved':
            moved_names.append(d.name)
            if len(samples_bef_aft) < args.sample_bef_aft:
                # Show a small diff window: PDF context before + FAQ context before
                samples_bef_aft.append({
                    'name': d.name,
                    'before_pdf_segment': html[info['cut_start']:info['cut_end']],
                    'before_faq_context': html[max(0, info['insert_pos']-40):info['insert_pos']+80],
                    'after_pdf_context': new_html[max(0, info['insert_pos']-40):info['insert_pos']+80+len(html[info['cut_start']:info['cut_end']])],
                })
            if args.apply:
                (d / 'index.html').write_text(new_html, encoding='utf-8', newline='\n')
        else:
            skip_by_reason.setdefault(status, []).append(d.name)

    summary = {
        'total_apps': len(apps),
        'mode': 'APPLY' if args.apply else 'DRY_RUN',
        'status_counter': dict(status_counter),
        'moved_count': status_counter.get('moved', 0),
        'skip_counts': {k: len(v) for k, v in skip_by_reason.items()},
    }

    out = Path(args.out)
    out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps({
        'summary': summary,
        'samples_before_after': samples_bef_aft,
        'moved_first_30': moved_names[:30],
        'skip_samples_per_reason': {k: v[:10] for k, v in skip_by_reason.items()},
    }, ensure_ascii=False, indent=2), encoding='utf-8')

    print(json.dumps(summary, ensure_ascii=True, indent=2))


if __name__ == '__main__':
    main()
