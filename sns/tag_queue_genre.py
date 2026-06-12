"""
sns_queue.json の各 draft エントリに genre_class と unexplored を付与する。
- 既存フィールドは消さない
- archived_* / posted は status のみ参照（タグは付けるが投稿対象外）
- X001-X010 archived_not_for_now は維持

再実行可能（idempotent）: 同じ判定なら結果同じ・既存値は上書き可。

使い方:
  python sns/tag_queue_genre.py            # apply
  python sns/tag_queue_genre.py --dryrun   # 集計のみ
"""
import json, sys, re
from collections import Counter
from pathlib import Path

sys.stdout.reconfigure(encoding='utf-8')
BASE = Path(__file__).resolve().parent.parent
QUEUE_PATH = BASE / 'sns' / 'sns_queue.json'
UNEXPLORED_PATH = BASE / 'sns' / 'x_unexplored_candidates.json'

# 未開拓50件の app_name 集（unexplored=true マーク用）
UNEXPLORED_APPS = {
    # 兄貴提示12件
    'PTA役員辞退理由文例アプリ',
    '自治会脱退手順メモアプリ',
    'メルカリ値下げ交渉返答ジェネレーター',
    '世界の変な法律3択クイズ',
    '建築職人日当地域別目安アプリ',
    'DIY道具インベントリメモアプリ',
    'グッズ断捨離診断',
    '空き家管理費年間試算アプリ',
    'バリアフリーリフォーム補助金チェックアプリ',
    'BBQ食材量試算アプリ',
    '全国ご当地方言クイズ',
    '介護ストレスの発散方法10選アプリ',
    # 実用フリマ +10
    'メルカリ出品タイトル爆速ジェネレーター',
    'メルカリ出品価格下限チェッカー',
    'EC梱包資材コスト計算アプリ',
    'ECヤフオク販売手数料アプリ',
    'ハンドメイド材料費から適正価格を出すアプリ',
    'メルカリ値下げかわし返信メーカー',
    'ガソリン代節約エコドライブ10か条アプリ',
    '大家さん修繕費支出記録アプリ',
    'PayPayフリマ手数料試算アプリ',
    # 建築DIY +8
    '修繕積立金不足チェッカー',
    '外壁塗装㎡単価グレード別アプリ',
    'リフォーム外壁塗装周期アプリ',
    'トイレリフォーム費用概算アプリ',
    'キッチンリフォーム費用試算アプリ',
    'エアコンクリーニング時期診断アプリ',
    '窓断熱DIY費用試算アプリ',
    'DIYプロジェクト材料費記録アプリ',
    # 介護シニア +5
    'デイサービス比較メモアプリ',
    'デイサービス料金目安アプリ',
    'シニアの賃貸審査サポートガイドアプリ',
    'シニア夫婦月額家計診断アプリ',
    '介護タクシー料金相場アプリ',
    # アウトドア +5
    'キャンプ持ち物リストアプリ',
    'ソロキャンプ持ち物リストアプリ',
    'アウトドア適性度診断アプリ',
    'ファミリーキャンプ持ち物リストアプリ',
    '冬キャンプ持ち物リストアプリ',
    # ペット +3
    'インコ飼育チェックリストアプリ',
    'ハムスターの健康観察記録アプリ',
    'ペットおもちゃ選びガイドアプリ',
    # 地方 +3
    'ご当地グルメクイズアプリ',
    '移住支援金交付額地域別アプリ',
    '危険空き家解体補助金交付額アプリ',
    # ネタ +4
    'ユーモア値上げ言い訳ジェネレーター',
    '値上げ愚痴ツイートジェネレーター',
    '値上げ言い訳フレーズジェネレーター',
    'ガソリン高でも楽しい室内アイデア生成器',
}


def classify_genre(app_name: str, category_guess: str) -> str:
    """app_name と category_guess から genre_class を判定"""
    name = app_name or ''
    cat = category_guess or ''

    # 1) フリマ・販売系（メルカリ・ヤフオク・PayPayフリマ・EC・ハンドメイド販売）
    if re.search(r'メルカリ|ヤフオク|PayPayフリマ|EC梱包|EC.*手数料|EC.*販売|ハンドメイド.*価格|ハンドメイド.*売', name):
        return 'フリマ'

    # 2) 建築・DIY・リフォーム・現場
    if re.search(r'DIY|リフォーム|塗装|修繕|足場|外壁|建築|断熱|エアコン.*クリーニング|エアコン.*清掃|工具|養生|コーキング|建設業|現場.*持ち物|現場.*写真|現場.*別利益|採算試算|採算チェック|職人|物置|フェンス|ブロック塀|外構', name):
        return '建築DIY'

    # 3) 地域・自治会・PTA・空き家・移住・方言
    if re.search(r'PTA|自治会|町内会|空き家|移住|方言|ご当地|地域行事|防犯ブザー|回覧板', name):
        return '地域'

    # 4) ネタ系（値上げ言い訳・愚痴・変な・ユーモア）
    if re.search(r'値上げ.*言い訳|値上げ.*愚痴|値上げ.*ユーモア|変な法律|室内アイデア生成', name):
        return 'ネタ'

    # 5) 介護・シニア
    if re.search(r'介護|シニア|デイサービス|バリアフリー|高齢者', name):
        return '未開拓'

    # 6) 定番（占い・運勢・診断・くじ・クイズ・脳トレ・心理テスト）
    if cat in ('占い・運勢', '推し活', '脳トレ', 'クイズ', '心理テスト', '相性', '恋愛'):
        return '定番'
    if re.search(r'占い|運勢|診断|おみくじ|ラッキー|相性|くじ|クイズ|脳トレ|心理テスト|タロット', name):
        # ただし「変な法律3択クイズ」「方言クイズ」「ご当地グルメクイズ」はネタ/地域
        if 'クイズ' in name and re.search(r'方言|ご当地|変な法律', name):
            return '地域' if '方言' in name or 'ご当地' in name else 'ネタ'
        return '定番'

    # 7) 実用（節約・家計・メモ・記録・チェック・買い物・送料・配送）
    if cat in ('お金', '生活', '健康', '防災', '保険'):
        return '実用'
    if re.search(r'節約|家計|メモ|記録|チェック|買い出し|送料|配送|引越し|ふるさと納税|サブスク', name):
        return '実用'

    # 8) その他 → 残り（多くは「その他」カテゴリ）
    return 'その他'


def main(dryrun: bool = False):
    with open(QUEUE_PATH, encoding='utf-8') as f:
        queue = json.load(f)

    counts = Counter()
    unex_count = 0
    draft_count = 0

    for entry in queue:
        if entry.get('status') == 'draft':
            draft_count += 1
        # 全 entry に対しタグ付け（status関係なく）
        app_name = entry.get('app_name', '')
        cat = entry.get('category_guess', '')
        genre = classify_genre(app_name, cat)
        entry['genre_class'] = genre
        is_unex = app_name in UNEXPLORED_APPS
        entry['unexplored'] = is_unex
        if is_unex:
            unex_count += 1
        if entry.get('status') == 'draft':
            counts[genre] += 1

    print('=== draft genre_class 集計 ===')
    for g, n in counts.most_common():
        print(f'  {n:4d}  {g}')
    print(f'  ----')
    print(f'  {sum(counts.values()):4d}  draft 合計')
    print()
    print(f'unexplored 一致: {unex_count} 件（全status対象）')
    print(f'draft 総数: {draft_count}')
    print()

    if dryrun:
        print('[DRYRUN] sns_queue.json は未保存')
        return

    # 保存（インデント維持・日本語そのまま）
    with open(QUEUE_PATH, 'w', encoding='utf-8') as f:
        json.dump(queue, f, ensure_ascii=False, indent=2)
    print(f'[OK] {QUEUE_PATH} updated ({len(queue)} entries)')


if __name__ == '__main__':
    dryrun = '--dryrun' in sys.argv
    main(dryrun=dryrun)
