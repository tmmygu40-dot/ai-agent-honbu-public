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
from collections import Counter
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

# ---- K-XT-DUPARROW / K-XT-DRIFT 追加検査ヘルパー ----

# 矢印ブロック検出（表記ゆれ: ↓↓↓ / ↓ ↓ ↓ / ↓　↓　↓ をすべて1ブロックとして数える）
ARROW_BLOCK_RE = re.compile(r'↓[\s　]*↓[\s　]*↓')


def count_arrow_blocks(text):
    return len(ARROW_BLOCK_RE.findall(text or ''))


# theme drift 判定用: app_name から有意トークンを抽出
APP_SUFFIX_RE = re.compile(
    r'(アプリ|ツール|診断|ジェネレーター|チェッカー|計算機|計算|シミュレーター|プランナー|タイマー|カウンター|メーカー|テスト|ガイド|早見表)$'
)


def extract_app_tokens(app_name):
    """app_name から hook/desc 内で照合する有意トークン集合を返す。

    - 末尾の汎用語（アプリ/ツール/診断 等）を剥がす
    - 区切り（・/空白/、）で分割
    - 分割後の各 token と、その内部の連続2文字 window をすべて候補化
    """
    name = APP_SUFFIX_RE.sub('', str(app_name or '').strip()).strip()
    out = set()
    for p in re.split(r'[・\s/／、]+', name):
        p = p.strip()
        if len(p) >= 2:
            out.add(p)
        for i in range(len(p) - 1):
            seg = p[i:i + 2]
            if seg.strip():
                out.add(seg)
    return out


def simulate_dashboard_text(item):
    """dashboard buildDashboardPostText（STEP A 修正後）を Python で簡易再現。

    目的: queue x_text を dashboard が整形した後の最終本文を組み立てて、
         矢印ブロック数が 1 になるか検査する。

    再現するロジック:
      - buildTweetText(skipAppNameInject=true): app 注入はスキップ
      - raw URL → post URL 置換
      - fitTweetLength: markerRe = \\n+arrow\\n+URL$ で既に末尾にあるなら無加工
      - normalizePostFormat: 矢印表記統一 / 連続矢印行縮約 / 3+ 改行を 2 に
    """
    x_text = str(item.get('x_text') or '').strip()
    short = str(item.get('short_url') or '').strip()
    url = str(item.get('url') or '').strip()
    post_url = short or url
    if not x_text:
        return ''
    merged = x_text
    if url and post_url and url != post_url and url in merged:
        merged = merged.replace(url, post_url)
    arrow = '↓　↓　↓'
    if post_url:
        esc = re.escape(post_url)
        if post_url in merged:
            marker_re = re.compile(r'\n+(?:↓↓↓|↓ ↓ ↓|↓　↓　↓)\n+' + esc + r'$')
            if marker_re.search(merged):
                out = merged
            else:
                tail_re = re.compile(r'\n+' + esc + r'$')
                if tail_re.search(merged):
                    out = tail_re.sub('\n\n' + arrow + '\n' + post_url, merged)
                else:
                    out = merged + '\n\n' + arrow + '\n' + post_url
        else:
            out = (merged + '\n\n' + arrow + '\n' + post_url) if merged else (arrow + '\n' + post_url)
    else:
        out = merged
    # normalizePostFormat: 矢印表記統一
    out = re.sub(r'↓[\s　]*↓[\s　]*↓', '↓　↓　↓', out)
    # 連続矢印行を縮約
    out = re.sub(r'↓　↓　↓([\s\n]*↓　↓　↓)+', '↓　↓　↓', out)
    # 矢印行と URL の間の空行を除去（URL は矢印行直後に詰める）
    out = re.sub(r'↓　↓　↓\n+(https?://)', r'↓　↓　↓\n\1', out)
    # 3+ 改行を 2 に
    out = re.sub(r'\n{3,}', '\n\n', out)
    return out


def check_theme_drift(item):
    """app_name の有意トークンが hook/desc に1つも含まれない場合 True（WARN対象）"""
    app = str(item.get('app_name') or '').strip()
    x_text = str(item.get('x_text') or '')
    lines = x_text.split('\n')
    hook = lines[2].strip() if len(lines) >= 3 else ''
    desc = lines[4].strip() if len(lines) >= 5 else ''
    blob = hook + ' ' + desc
    toks = extract_app_tokens(app)
    if not toks or not blob.strip():
        return False
    return not any(t in blob for t in toks)


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

    # K-XT-DUPARROW: dashboard 表示 simulate 後の矢印ブロック数 != 1 は NG
    sim = simulate_dashboard_text(item)
    blocks = count_arrow_blocks(sim)
    if blocks != 1:
        reasons.append(f'dashboard表示simulate後の矢印ブロック数={blocks} (期待1・二重矢印バグ再発)')

    # K-XT-URLGAP: 矢印行と URL 行の間に空行があると NG (dashboard 表示 simulate 後)
    if re.search(r'↓　↓　↓\n[ \t　]*\n+[ \t　]*https?://', sim):
        reasons.append('矢印行とURLの間に空行あり (dashboard表示simulate後)')

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

    # K-XT-DUPARROW 再発検査: fitTweetLength の markerRe が \n+ で URL 前複数改行を許容するか
    m2 = re.search(r'markerRe\s*=\s*new RegExp\(`([^`]+)`\)', h)
    if not m2:
        findings.append({
            'where': 'fitTweetLength markerRe',
            'reason': 'markerRe 定義が見つからない',
        })
    else:
        pat = m2.group(1)
        # 旧バグ: \n${escPost}$ (URL前が \n 一個のみ) → queue x_text の空行ありで矢印二重化
        if r'\n${escPost}$' in pat:
            findings.append({
                'where': 'fitTweetLength markerRe',
                'reason': 'URL前が \\n のみ (queue x_text の空行ありで矢印二重化バグ再発)',
            })

    # K-XT-DUPARROW 再発検査: normalizePostFormat に連続矢印行縮約の replace があるか
    if r'↓　↓　↓([\s\n]*↓　↓　↓)' not in h:
        findings.append({
            'where': 'normalizePostFormat arrow collapse',
            'reason': '連続矢印行を縮約する replace パターンが無い (二重挿入の最終防御欠落)',
        })

    # K-XT-URLGAP 再発検査: normalizePostFormat に矢印行とURL間の空行除去 replace があるか
    if r'↓　↓　↓\n+(https?:' not in h:
        findings.append({
            'where': 'normalizePostFormat URL gap collapse',
            'reason': '矢印行と URL の間の空行を除去する replace パターンが無い',
        })

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

    # K-XT-DRIFT WARN: theme drift (hook/desc が app_name と意味的に乖離)
    warns_theme = []
    for x in targets:
        if check_theme_drift(x):
            lines = (x.get('x_text') or '').split('\n')
            hook = lines[2].strip() if len(lines) >= 3 else ''
            warns_theme.append({
                'id': x.get('id'),
                'title': x.get('app_name', ''),
                'hook': hook,
                'source_batch': x.get('source_batch', ''),
            })

    # WARN: hook 重複 (同一 hook が複数 entry に再利用されていないか)
    hook_counter = Counter()
    for x in targets:
        lines = (x.get('x_text') or '').split('\n')
        if len(lines) >= 3:
            h = lines[2].strip()
            if h:
                hook_counter[h] += 1
    hook_dups = [(h, c) for h, c in hook_counter.most_common() if c > 1]

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
    print(f'theme drift WARN: {len(warns_theme)} 件')
    hook_dup_total = sum(c for _, c in hook_dups)
    print(f'hook 重複 WARN: {len(hook_dups)} 種類 ({hook_dup_total} 件にまたがる)')
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

    if warns_theme:
        print('=== WARN: theme drift (hook/desc が app_name と意味的に乖離) ===')
        for w in warns_theme[:8]:
            print(f'  [{w["id"]}] {w["title"]}')
            print(f'     hook: "{w["hook"]}"')
        if len(warns_theme) > 8:
            print(f'  ... 他 {len(warns_theme) - 8} 件省略')
        print('  ※ 投稿は止めない (WARN)。本文再生成 STEP C の対象。')
        print()

    if hook_dups:
        print('=== WARN: hook 重複 TOP10 (同じhookが何件のentryで使われているか) ===')
        for h, c in hook_dups[:10]:
            print(f'  ×{c}: "{h}"')
        print('  ※ 投稿は止めない (WARN)。プール選択の見直し対象。')
        print()

    if not failures and not dash_findings:
        print('✅ PASS — 投稿開始可能 (NG 0 件)')
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
            f.write(f'- WARN (theme drift): {len(warns_theme)}\n')
            f.write(f'- WARN (hook 重複): {len(hook_dups)} 種類 / {hook_dup_total} 件\n')
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
            if warns_theme:
                f.write('\n## WARN: theme drift\n')
                for w in warns_theme:
                    f.write(f'- `{w["id"]}` {w["title"]} — hook: "{w["hook"]}"\n')
            if hook_dups:
                f.write('\n## WARN: hook 重複\n')
                for h, c in hook_dups:
                    f.write(f'- ×{c}: "{h}"\n')
        print(f'\nレポート出力: {rpath}')

    sys.exit(0 if (not failures and not dash_findings) else 1)


if __name__ == '__main__':
    main()
