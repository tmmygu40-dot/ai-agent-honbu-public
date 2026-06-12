"""
K-159 未開拓50件 short_url 整備 apply

dry-run の確定結果に従って:
1. s/<slug>/index.html を50件作成（既存衝突回避）
2. sns/x_unexplored_candidates.json の各候補に short_url を追加・更新

既存 s/<slug>/ がある場合は上書きしない（衝突は事前確認済み）
日本語パスは URL-encode
"""
import json, sys, os
from pathlib import Path
from urllib.parse import quote

sys.stdout.reconfigure(encoding='utf-8')

BASE = Path(__file__).resolve().parent.parent
UNEX = BASE / 'sns' / 'x_unexplored_candidates.json'
S_DIR = BASE / 's'

# K-159 確定 slug マッピング（rank 17 修正済）
SLUGS = {
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
    "ハンドメイド材料費から適正価格を出すアプリ":        "handmade-fair-price",  # K-159 衝突回避
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

# 既存 s/<slug>/ index.html と同じテンプレート
HTML_TEMPLATE = '''<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="0;url=https://nekopoke.jp/{encoded}/" />
  <link rel="canonical" href="https://nekopoke.jp/{encoded}/" />
  <title>{name}へ移動中</title>
</head>
<body>
  <script>location.replace("https://nekopoke.jp/{encoded}/");</script>
</body>
</html>
'''


def main():
    with open(UNEX, encoding='utf-8') as f:
        u = json.load(f)
    candidates = u['candidates']

    created = []
    skipped_existing = []
    short_url_updated = []
    errors = []

    for c in candidates:
        name = c['app_name']
        slug = SLUGS.get(name)
        if not slug:
            errors.append(f'no slug mapping: {name}')
            continue

        # s/<slug>/ 作成
        slug_dir = S_DIR / slug
        idx = slug_dir / 'index.html'
        if idx.is_file():
            skipped_existing.append((slug, name))
        else:
            slug_dir.mkdir(parents=True, exist_ok=True)
            encoded = quote(name, safe='')
            html = HTML_TEMPLATE.format(encoded=encoded, name=name)
            idx.write_text(html, encoding='utf-8')
            created.append((slug, name))

        # JSON 内 short_url 更新
        short_url = f'https://nekopoke.jp/s/{slug}/'
        c['short_url'] = short_url
        short_url_updated.append((c['rank'], slug, name))

    # JSON 保存（インデント維持・日本語そのまま）
    # meta.version を 3 に更新（短縮URL整備完了）
    u['meta']['version'] = 3
    u['meta']['short_url_integrated'] = True
    u['meta']['short_url_integrated_at'] = '2026-06-12'
    with open(UNEX, 'w', encoding='utf-8') as f:
        json.dump(u, f, ensure_ascii=False, indent=2)

    # サマリ
    print(f'=== K-159 short_url 整備 結果 ===')
    print(f'作成した s/<slug>/index.html: {len(created)}')
    print(f'既存スキップ（上書きなし）: {len(skipped_existing)}')
    print(f'JSON short_url 更新件数: {len(short_url_updated)}')
    print(f'エラー: {len(errors)}')
    print()
    if created:
        print('--- 作成 ---')
        for slug, name in created[:5]:
            print(f'  s/{slug}/ ← {name}')
        if len(created) > 5:
            print(f'  ...他 {len(created)-5} 件')
    print()
    if skipped_existing:
        print('--- 既存スキップ ---')
        for slug, name in skipped_existing:
            print(f'  s/{slug}/ (既存・上書きなし) ← unex: {name}')
    print()
    if errors:
        print('--- エラー ---')
        for e in errors:
            print(f'  {e}')

    # メルカリ値下げ交渉返答の確認
    print()
    print('=== メルカリ値下げ交渉返答 確認 ===')
    for c in candidates:
        if 'メルカリ値下げ交渉返答' in c['app_name']:
            print(f'  app_name: {c["app_name"]}')
            print(f'  url (元/閲覧用): {c["url"]}')
            print(f'  short_url (投稿用): {c["short_url"]}')
            break


if __name__ == '__main__':
    main()
