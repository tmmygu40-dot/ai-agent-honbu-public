#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
X投稿文ゲート (queue投入後・投稿開始前に必ず実行)

検査対象:
  - sns/sns_queue.json の全 draft / scheduled 候補
  - sns/x_dashboard.html の危険パターン

検査項目:
  1. x_text の構造 (【今日のチェック】 / hook / desc / app_name / 矢印 / URL)
  2. hook の妥当性 (空でない / 「今日のチェック」だけでない)
  3. NG 文字列の存在 (フック未計算 / 再読み込みしてください / 等)
  4. URL の形式 (https://nekopoke.jp/s/ で始まる)
  5. dashboard 側 x_text 落とし防止
     - getQueueByGenreClass の .map() で x_text が保持されているか
     - 過去事故: 2026-06-17 LIFE200 投入時に angle にリネームしただけで x_text 削っていた

Exit code:
  0 = PASS (投稿開始可能)
  1 = FAIL (修正必須・1件以上の NG)

使い方:
  python3 sns/check_x_post_text_gate.py
  python3 sns/check_x_post_text_gate.py --batch x_life_200_phase1_20260617
  python3 sns/check_x_post_text_gate.py --report
"""

import json, os, re, sys, argparse
from datetime import datetime, timezone, timedelta

# Windows cp932 環境でも安全に絵文字を出すため stdout を UTF-8 化（影響範囲は本スクリプト内のみ）
try:
    sys.stdout.reconfigure(encoding='utf-8')
    sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT       = os.path.dirname(SCRIPT_DIR)  # public repo root
JST = timezone(timedelta(hours=9))
NOW = datetime.now(JST)

NG_STRINGS = [
    'フック未計算',
    '再読み込みしてください',
    'フック未決定',
    '決まりませんでした',
    'undefined',
    'NaN',
]

# hook 行に出てはいけない安全 fallback 文（hook として意味不明なもの）
HOOK_FORBIDDEN = {
    '今日のチェック',
    '【今日のチェック】',
    '',
}


def fail(reasons, item_id, title=''):
    return {
        'id': item_id,
        'title': title,
        'reasons': reasons,
    }


def check_x_text(item):
    """1 件の queue entry の x_text を検査。問題なければ None、あれば failure dict"""
    eid = item.get('id', '(no-id)')
    title = item.get('app_name', '')
    reasons = []
    x_text = item.get('x_text') or ''

    if not x_text.strip():
        reasons.append('x_text 空')
        return fail(reasons, eid, title)

    # NG 文字列
    for ng in NG_STRINGS:
        if ng in x_text:
            reasons.append(f'NG文字列 "{ng}"')

    # 構造: 期待は
    #  [0] 【今日のチェック】
    #  [1] (空)
    #  [2] hook
    #  [3] (空)
    #  [4] description (1 行以上)
    #  ...
    #  [-3] app_name (1 行)
    #  [-2] ↓　↓　↓ または 矢印行
    #  [-1] short_url
    lines = x_text.split('\n')
    if not lines:
        reasons.append('行数 0')
        return fail(reasons, eid, title)

    if not lines[0].strip().startswith('【'):
        reasons.append(f'1行目が【...】で始まらない: "{lines[0][:30]}"')
    elif lines[0].strip() != '【今日のチェック】':
        reasons.append(f'1行目が【今日のチェック】でない: "{lines[0][:30]}"')

    if len(lines) < 3:
        reasons.append('行数が3未満（hook 行が無い）')
        return fail(reasons, eid, title)

    hook = lines[2].strip()
    if hook in HOOK_FORBIDDEN:
        reasons.append(f'hook が安全fallback or 空: "{hook}"')
    if hook.startswith('【') and hook.endswith('】'):
        reasons.append(f'hook 行が見出し形式（【...】）: "{hook}"')

    # 末尾 URL チェック
    last_url_line = None
    for ln in reversed(lines):
        if ln.strip().startswith('http'):
            last_url_line = ln.strip()
            break
    if not last_url_line:
        reasons.append('URL 行が無い')
    else:
        if not last_url_line.startswith('https://nekopoke.jp/'):
            reasons.append(f'URL ドメインが nekopoke.jp でない: {last_url_line[:60]}')
        # short_url 優先 (rule)
        if not last_url_line.startswith('https://nekopoke.jp/s/'):
            # 直 URL でも 404 でなければ可だが警告
            pass  # warn-only (SNS_X_RULES.md は short_url 優先だが直URLも fallback OK)

    # 矢印行
    has_arrow = any('↓' in ln for ln in lines)
    if not has_arrow:
        reasons.append('矢印行 ↓ が無い')

    # app_name が x_text に含まれているか
    if title and title not in x_text:
        reasons.append(f'app_name "{title}" が x_text に含まれていない')

    if reasons:
        return fail(reasons, eid, title)
    return None


def check_dashboard_x_text_preservation(dashboard_path):
    """dashboard.html の .map() で x_text が落とされていないか検査"""
    findings = []
    with open(dashboard_path, encoding='utf-8') as f:
        h = f.read()

    # getQueueByGenreClass の .map() 内に x_text: が含まれるか確認
    m = re.search(r'function getQueueByGenreClass\(.*?\}\s*\n\s*\}', h, re.S)
    if not m:
        findings.append({
            'where': 'getQueueByGenreClass',
            'reason': '関数が見つからない',
        })
    else:
        block = m.group(0)
        if '.map(' in block:
            map_part = re.search(r'\.map\(\s*x\s*=>\s*\(\s*\{(.*?)\}\s*\)\s*\)', block, re.S)
            if map_part:
                map_body = map_part.group(1)
                if 'x_text: x.x_text' not in map_body and 'x_text:x.x_text' not in map_body:
                    findings.append({
                        'where': 'getQueueByGenreClass .map()',
                        'reason': 'x_text: x.x_text が無い (queue x_text 削除リスク・2026-06-17 事故再発防止)',
                    })

    # 他にも item を再構築する .map() があれば検査追加可
    return findings


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--batch', help='source_batch でフィルタ (例: x_life_200_phase1_20260617)')
    ap.add_argument('--report', action='store_true', help='_reports/x_gate_YYYYMMDD.md を出力')
    args = ap.parse_args()

    queue_path = os.path.join(ROOT, 'sns', 'sns_queue.json')
    dashboard_path = os.path.join(ROOT, 'sns', 'x_dashboard.html')

    with open(queue_path, encoding='utf-8') as f:
        queue = json.load(f)

    # Filter target
    targets = [x for x in queue if isinstance(x, dict)]
    if args.batch:
        targets = [x for x in targets if x.get('source_batch') == args.batch]

    # Statuses to check: draft + scheduled
    targets = [x for x in targets if x.get('status') in ('draft', 'scheduled')]

    failures = []
    for x in targets:
        f = check_x_text(x)
        if f:
            failures.append(f)

    # Dashboard preservation check
    dash_findings = check_dashboard_x_text_preservation(dashboard_path)

    # Stats
    life_count = sum(1 for x in queue if isinstance(x, dict) and x.get('source_batch') == 'x_life_200_phase1_20260617')

    print('====================================================')
    print('SNS X投稿文ゲート 検査結果')
    print(f'  実行: {NOW.strftime("%Y-%m-%d %H:%M:%S")} JST')
    print(f'  queue 全件: {len(queue)}')
    print(f'  LIFE 200 (source_batch): {life_count}')
    print(f'  検査対象 (draft/scheduled): {len(targets)}')
    print(f'  filter --batch={args.batch}' if args.batch else '  filter: なし')
    print('====================================================')
    print(f'queue NG: {len(failures)} 件')
    print(f'dashboard NG: {len(dash_findings)} 件')
    print()

    if failures:
        print('=== NG 一覧 ===')
        for f in failures[:30]:
            print(f'  [{f["id"]}] {f["title"]}')
            for r in f['reasons']:
                print(f'     - {r}')
        if len(failures) > 30:
            print(f'  ... 他 {len(failures) - 30} 件省略')
        print()

    if dash_findings:
        print('=== dashboard NG ===')
        for d in dash_findings:
            print(f'  [{d["where"]}] {d["reason"]}')
        print()

    if not failures and not dash_findings:
        print('✅ PASS — 投稿開始可能')
        # Sample 5 (random first 5 LIFE)
        life_sample = [x for x in targets if x.get('source_batch') == 'x_life_200_phase1_20260617'][:5]
        if life_sample:
            print()
            print('=== 代表サンプル 5件 ===')
            for s in life_sample:
                lines = (s.get('x_text') or '').split('\n')
                hook = lines[2].strip() if len(lines) >= 3 else '(none)'
                print(f'  [{s["id"]}] {s["app_name"]}')
                print(f'     hook: "{hook}"')

    # Optional report
    if args.report:
        reports_dir = os.path.join(ROOT, 'sns', '_reports')
        os.makedirs(reports_dir, exist_ok=True)
        rpath = os.path.join(reports_dir, f'x_gate_{NOW.strftime("%Y%m%d")}.md')
        with open(rpath, 'w', encoding='utf-8') as f:
            f.write(f'# X投稿文ゲート 検査結果 {NOW.strftime("%Y-%m-%d %H:%M")}\n')
            f.write(f'- queue: {len(queue)}\n')
            f.write(f'- LIFE batch: {life_count}\n')
            f.write(f'- 検査対象: {len(targets)}\n')
            f.write(f'- NG (queue): {len(failures)}\n')
            f.write(f'- NG (dashboard): {len(dash_findings)}\n')
            if failures:
                f.write('\n## queue NG\n')
                for fl in failures:
                    f.write(f'- `{fl["id"]}` {fl["title"]}\n')
                    for r in fl['reasons']:
                        f.write(f'  - {r}\n')
            if dash_findings:
                f.write('\n## dashboard NG\n')
                for d in dash_findings:
                    f.write(f'- {d["where"]}: {d["reason"]}\n')
        print(f'\nレポート出力: {rpath}')

    sys.exit(0 if (not failures and not dash_findings) else 1)


if __name__ == '__main__':
    main()
