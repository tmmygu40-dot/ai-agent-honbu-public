"""
K-159 未開拓50件 short_url 整備 dry-run

目的:
- sns/x_unexplored_candidates.json の50件を読む
- 各候補について public repo root に対応アプリディレクトリが存在するか確認
- 存在すれば ASCII-kebab slug を提案
- 既存 s/<slug>/ との衝突チェック
- レポートを sns/_reports/x_unexplored_short_url_dryrun_YYYYMMDD.md へ出力

dry-run のみ: 実際の s/ 作成・JSON 変更はしない
"""
import json, sys, os, re
from pathlib import Path
from datetime import date

sys.stdout.reconfigure(encoding='utf-8')

BASE = Path(__file__).resolve().parent.parent
UNEX = BASE / 'sns' / 'x_unexplored_candidates.json'
S_DIR = BASE / 's'
REPORT = BASE / 'sns' / '_reports' / f'x_unexplored_short_url_dryrun_{date.today().strftime("%Y%m%d")}.md'

# 手動 slug マッピング（高優先度・分かりやすい英語）
# 既存 s/ の命名規約（ascii kebab-case）に合わせる
MANUAL_SLUGS = {
    "PTA役員辞退理由文例アプリ":                        "pta-decline-template",
    "自治会脱退手順メモアプリ":                          "neighborhood-leave",
    "メルカリ値下げ交渉返答ジェネレーター":              "mercari-price-reply",
    "世界の変な法律3択クイズ":                           "weird-law-quiz",
    "建築職人日当地域別目安アプリ":                      "kentiku-wage",
    "DIY道具インベントリメモアプリ":                     "diy-tool-memo",
    "グッズ断捨離診断":                                  "goods-declutter",
    "空き家管理費年間試算アプリ":                        "akiya-cost",
    "バリアフリーリフォーム補助金チェックアプリ":        "barrierfree-grant",
    "BBQ食材量試算アプリ":                               "bbq-food-amount",
    "全国ご当地方言クイズ":                              "dialect-quiz",
    "介護ストレスの発散方法10選アプリ":                  "kaigo-stress",
    "メルカリ出品タイトル爆速ジェネレーター":            "mercari-title-fast",
    "メルカリ出品価格下限チェッカー":                    "mercari-min-price",
    "EC梱包資材コスト計算アプリ":                        "ec-pack-cost",
    "ECヤフオク販売手数料アプリ":                        "yahoo-auction-fee",
    "ハンドメイド材料費から適正価格を出すアプリ":        "handmade-price",
    "メルカリ値下げかわし返信メーカー":                  "mercari-decline",
    "ガソリン代節約エコドライブ10か条アプリ":            "ecodrive-10",
    "大家さん修繕費支出記録アプリ":                      "landlord-repair-memo",
    "PayPayフリマ手数料試算アプリ":                      "paypay-flea-fee",
    "修繕積立金不足チェッカー":                          "mansion-repair-fund",
    "外壁塗装㎡単価グレード別アプリ":                    "paint-unit-price",
    "リフォーム外壁塗装周期アプリ":                      "paint-cycle",
    "トイレリフォーム費用概算アプリ":                    "toilet-reform-cost",
    "キッチンリフォーム費用試算アプリ":                  "kitchen-reform-cost",
    "エアコンクリーニング時期診断アプリ":                "ac-cleaning-time",
    "窓断熱DIY費用試算アプリ":                           "window-insulation-cost",
    "DIYプロジェクト材料費記録アプリ":                   "diy-material-log",
    "デイサービス比較メモアプリ":                        "dayservice-compare",
    "デイサービス料金目安アプリ":                        "dayservice-fee",
    "シニアの賃貸審査サポートガイドアプリ":              "senior-rental-guide",
    "シニア夫婦月額家計診断アプリ":                      "senior-couple-budget",
    "介護タクシー料金相場アプリ":                        "kaigo-taxi-fee",
    "キャンプ持ち物リストアプリ":                        "camp-list",
    "ソロキャンプ持ち物リストアプリ":                    "solo-camp-list",
    "アウトドア適性度診断アプリ":                        "outdoor-suit",
    "ファミリーキャンプ持ち物リストアプリ":              "family-camp-list",
    "冬キャンプ持ち物リストアプリ":                      "winter-camp-list",
    "インコ飼育チェックリストアプリ":                    "parakeet-checklist",
    "ハムスターの健康観察記録アプリ":                    "hamster-health-log",
    "ペットおもちゃ選びガイドアプリ":                    "pet-toy-guide",
    "ご当地グルメクイズアプリ":                          "local-gourmet-quiz",
    "移住支援金交付額地域別アプリ":                      "iju-subsidy",
    "危険空き家解体補助金交付額アプリ":                  "akiya-demolish-grant",
    "ユーモア値上げ言い訳ジェネレーター":                "price-up-excuse-humor",
    "値上げ愚痴ツイートジェネレーター":                  "price-up-complaint",
    "値上げ言い訳フレーズジェネレーター":                "price-up-phrase",
    "ガソリン高でも楽しい室内アイデア生成器":            "indoor-fun-gas-high",
    "値上げイライラ言い訳ジェネレーター":                "price-up-excuse",
}


def main():
    with open(UNEX, encoding='utf-8') as f:
        u = json.load(f)
    candidates = u['candidates']

    # 既存 s/<slug>/ 一覧
    existing_slugs = set()
    if S_DIR.is_dir():
        for d in S_DIR.iterdir():
            if d.is_dir():
                existing_slugs.add(d.name)

    rows_postable = []   # アプリディレクトリあり・slug 提案あり
    rows_collision = []  # slug が既存衝突
    rows_missing = []    # アプリディレクトリ無し（公開未対応）
    rows_no_slug = []    # manual slug マッピング無し

    for c in candidates:
        name = c['app_name']
        rank = c['rank']
        gc = c.get('genre_class', '')

        # 1) アプリディレクトリの存在確認
        app_dir = BASE / name
        app_index = app_dir / 'index.html'
        has_app = app_index.is_file()

        # 2) slug 提案
        slug = MANUAL_SLUGS.get(name)

        if not has_app:
            rows_missing.append({'rank': rank, 'name': name, 'genre': gc, 'reason': 'public root にディレクトリなし'})
            continue
        if not slug:
            rows_no_slug.append({'rank': rank, 'name': name, 'genre': gc, 'reason': 'manual slug 未マッピング'})
            continue
        if slug in existing_slugs:
            rows_collision.append({'rank': rank, 'name': name, 'genre': gc, 'slug': slug, 'reason': '既存 s/<slug>/ と衝突'})
            continue

        rows_postable.append({
            'rank': rank,
            'name': name,
            'genre': gc,
            'slug': slug,
            'short_url': f'https://nekopoke.jp/s/{slug}/',
            'target_path': f'../{name}/',
            'has_app': True,
        })

    # レポート生成
    lines = []
    lines.append(f'# K-159 未開拓50件 short_url 整備 dry-run レポート')
    lines.append('')
    lines.append(f'生成日: {date.today().strftime("%Y-%m-%d")}  / source: x_unexplored_candidates.json (v2)')
    lines.append('')
    lines.append('## 集計サマリー')
    lines.append('')
    lines.append('| 区分 | 件数 |')
    lines.append('|---|---:|')
    lines.append(f'| **未開拓候補 総数** | {len(candidates)} |')
    lines.append(f'| ✅ short_url 作成可能（アプリ実在 + slug 提案あり + 衝突なし）| **{len(rows_postable)}** |')
    lines.append(f'| ⚠ slug 衝突（要再命名） | {len(rows_collision)} |')
    lines.append(f'| ⚠ slug 未マッピング | {len(rows_no_slug)} |')
    lines.append(f'| ❌ public root にアプリディレクトリ無し（未公開） | {len(rows_missing)} |')
    lines.append('')
    lines.append(f'既存 s/<slug>/ エントリ数: {len(existing_slugs)}')
    lines.append('')
    lines.append('---')
    lines.append('')

    # 作成可能リスト
    lines.append('## ✅ short_url 作成可能（次フェーズで作成予定）')
    lines.append('')
    if rows_postable:
        lines.append('| # | rank | ジャンル | アプリ名 | slug | short_url（予定） | redirect先 |')
        lines.append('|--:|--:|---|---|---|---|---|')
        for i, r in enumerate(rows_postable, 1):
            lines.append(f'| {i} | {r["rank"]} | {r["genre"]} | {r["name"]} | `{r["slug"]}` | {r["short_url"]} | `{r["target_path"]}` |')
    else:
        lines.append('（なし）')
    lines.append('')

    # 衝突
    lines.append('## ⚠ slug 衝突候補（再命名が必要）')
    lines.append('')
    if rows_collision:
        for r in rows_collision:
            lines.append(f'- rank #{r["rank"]} `{r["name"]}` / 提案slug `{r["slug"]}` → 既存 `s/{r["slug"]}/` と衝突')
    else:
        lines.append('（なし）')
    lines.append('')

    # slug 未マッピング
    lines.append('## ⚠ slug 未マッピング（追加検討が必要）')
    lines.append('')
    if rows_no_slug:
        for r in rows_no_slug:
            lines.append(f'- rank #{r["rank"]} `{r["name"]}` ({r["genre"]})')
    else:
        lines.append('（なし）')
    lines.append('')

    # 未対応（除外）
    lines.append('## ❌ public root にアプリ無し（除外候補）')
    lines.append('')
    if rows_missing:
        for r in rows_missing:
            lines.append(f'- rank #{r["rank"]} `{r["name"]}` ({r["genre"]}) — {r["reason"]}')
    else:
        lines.append('（なし）')
    lines.append('')

    # 作成予定の s/<slug>/ index.html 雛形
    lines.append('## 次に作成予定の s/<slug>/ 一覧')
    lines.append('')
    lines.append('各 short URL は `s/<slug>/index.html` に以下のような meta refresh を置く想定:')
    lines.append('')
    lines.append('```html')
    lines.append('<!DOCTYPE html>')
    lines.append('<html lang="ja"><head><meta charset="utf-8">')
    lines.append('<meta http-equiv="refresh" content="0; url=../{app_name}/">')
    lines.append('<link rel="canonical" href="https://nekopoke.jp/{app_name}/"></head>')
    lines.append('<body>ページが移動しました。<a href="../{app_name}/">こちら</a></body></html>')
    lines.append('```')
    lines.append('')
    lines.append('（既存 s/<slug>/ 配下の index.html と同じ pattern を踏襲）')
    lines.append('')

    # 次工程の手順
    lines.append('## 次工程の手順案')
    lines.append('')
    lines.append('1. 上記「作成可能」一覧から s/<slug>/index.html を一括生成（兄貴の許可後）')
    lines.append('2. x_unexplored_candidates.json の各候補に `short_url` を追記')
    lines.append('3. ダッシュボードで投稿可能状態になることを確認')
    lines.append('4. queue 投入は別判断（dashboard 投稿だけなら queue 不要）')
    lines.append('')
    lines.append('---')
    lines.append('')
    lines.append('*dry-run のみ: 本レポートは調査結果のみで、s/<slug>/ 作成や JSON 変更は実行していません。*')

    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text('\n'.join(lines), encoding='utf-8')
    print(f'[OK] レポート出力: {REPORT}')
    print(f'  postable: {len(rows_postable)}')
    print(f'  collision: {len(rows_collision)}')
    print(f'  no slug: {len(rows_no_slug)}')
    print(f'  missing app: {len(rows_missing)}')


if __name__ == '__main__':
    main()
