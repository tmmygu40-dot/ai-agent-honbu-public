"""
K-160 未開拓50件 URL 実在確認

各候補について実 HTTP で deployed nekopoke.jp の到達可能性を確認:
- short_url (/s/<slug>/) → 最終リダイレクト先まで追跡 → 200 OK か
- 200 なら url_verified = true
- それ以外（404/timeout）は url_verified = false

結果を sns/x_unexplored_candidates.json に書き戻す。
ローカルファイル存在ではなく、deployed URL の実在を真として扱う。
"""
import json, sys, subprocess
from pathlib import Path
from datetime import datetime

sys.stdout.reconfigure(encoding='utf-8')

BASE = Path(__file__).resolve().parent.parent
UNEX = BASE / 'sns' / 'x_unexplored_candidates.json'


def http_check(url, timeout=8):
    """curl で URL 到達性を確認。リダイレクト追跡・最終 HTTP コード取得。"""
    try:
        r = subprocess.run(
            ['curl', '-sL', '-o', '/dev/null', '-w', '%{http_code}|%{url_effective}',
             '--max-time', str(timeout), url],
            capture_output=True, text=True, timeout=timeout + 2
        )
        out = r.stdout.strip()
        if '|' in out:
            code, final = out.split('|', 1)
            return code, final
        return out, ''
    except Exception as e:
        return 'ERR', str(e)


def main():
    with open(UNEX, encoding='utf-8') as f:
        u = json.load(f)
    candidates = u['candidates']

    print(f'verifying {len(candidates)} URLs against deployed nekopoke.jp ...')
    ok = 0
    not_found = 0
    err = 0

    for i, c in enumerate(candidates, 1):
        su = (c.get('short_url') or '').strip()
        if not su:
            c['url_verified'] = False
            c['url_check_status'] = 'no_short_url'
            err += 1
            continue
        code, final = http_check(su)
        c['url_check_status_short_url'] = code
        c['url_check_final'] = final
        if code == '200':
            # さらに「最終リダイレクト先がトップでないこと」を確認
            if final.rstrip('/') == 'https://nekopoke.jp':
                c['url_verified'] = False
                c['url_check_status'] = 'redirect_to_top'
                not_found += 1
                mark = '⚠'
            else:
                c['url_verified'] = True
                c['url_check_status'] = 'ok'
                ok += 1
                mark = '✓'
        elif code in ('404', '410'):
            c['url_verified'] = False
            c['url_check_status'] = 'missing'
            not_found += 1
            mark = '✗'
        else:
            c['url_verified'] = False
            c['url_check_status'] = f'http_{code}'
            err += 1
            mark = '?'
        print(f'  [{mark}] {code} #{c["rank"]:2d} {c["app_name"][:35]} -> {su}')

    # meta 更新
    u['meta']['version'] = 4
    u['meta']['url_verified_at'] = datetime.now().isoformat()
    u['meta']['url_verified_ok'] = ok
    u['meta']['url_verified_missing'] = not_found
    u['meta']['url_verified_error'] = err

    with open(UNEX, 'w', encoding='utf-8') as f:
        json.dump(u, f, ensure_ascii=False, indent=2)

    print()
    print(f'=== 結果 ===')
    print(f'  ✓ OK (deployed exists): {ok}')
    print(f'  ✗ missing (404):        {not_found}')
    print(f'  ? error/timeout:        {err}')
    print()
    print(f'  total: {len(candidates)}')


if __name__ == '__main__':
    main()
