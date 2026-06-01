"""
SNS X投稿候補 ランク別レポート生成スクリプト
出力: sns/_reports/x_draft_ranked_candidates_YYYYMMDD.md
読み取り専用 -- sns_queue.json / registry / s/ は変更しない
"""
import json, re, os, sys
from collections import Counter
from datetime import date

sys.stdout.reconfigure(encoding='utf-8')

# ===== 設定 =====
TODAY = date.today().strftime('%Y%m%d')
OUT_DIR = 'sns/_reports'
OUT_FILE = f'{OUT_DIR}/x_draft_ranked_candidates_{TODAY}.md'

# ===== データ読み込み =====
with open('sns/sns_queue.json', encoding='utf-8') as f:
    queue = json.load(f)

drafts = [e for e in queue if e.get('status') == 'draft']
EXCLUDED_IDS = {f'20260531-X{str(i).zfill(3)}' for i in range(1, 11)}

# ===== 定数（dryrun_v1.py と同一） =====
PRIORITY_MAP = {
    '雑学・クイズ': 1, '地域ネタ': 2, '仕事効率化': 3, 'ビジネスマナー': 4,
    'お金・家計': 5, '在庫・仕入れ': 6, '買い物判断': 7, 'ライフハック': 8,
    '健康習慣': 9, '勉強法': 10, '記憶術': 11, '脳トレ': 12,
    '性格診断系': 13, 'ネタ・ジョーク': 14, 'ジェネレーター系': 15, '比較系': 16,
    'ランキング系': 17, '食べ物': 18, '旅行': 19, '季節イベント': 20,
    '占い・運勢': 99, '推し活': 98, '保険': 97, '防災': 96, 'その他': 50,
}

SLUG_CAT = {
    'calorie-quiz': '雑学・クイズ', 'biz-keigo-quiz': '雑学・クイズ',
    'local-specialty-quiz': '雑学・クイズ', 'vocab-quiz': '雑学・クイズ',
    'business-manner': '雑学・クイズ', 'disaster-quiz': '雑学・クイズ',
    'kakei-defense-quiz': '雑学・クイズ', 'neighbor-manners': '雑学・クイズ',
    'typing-test': '脳トレ',
    'omiyage-budget': '地域ネタ',
    'daily-report': '仕事効率化', 'meeting-memo': '仕事効率化',
    'shift-table': '仕事効率化', 'shift-builder': '仕事効率化',
    'task-sort': '仕事効率化', 'project-status': '仕事効率化',
    'schedule-pick': '仕事効率化', 'early-late-log': '仕事効率化',
    'call-memo': '仕事効率化', 'duty-roster': '仕事効率化',
    'sales-target-reverse': '仕事効率化', 'newhire-training-list': '仕事効率化',
    'skill-map': '仕事効率化', 'presentation-timer': '仕事効率化',
    'pomodoro': '仕事効率化', 'faq-memo': '仕事効率化',
    'blog-update-plan': '仕事効率化', 'sidejob-time-plan': '仕事効率化',
    'simple-timer': '仕事効率化', 'counter-mini': '仕事効率化',
    'stopwatch': '仕事効率化', 'tournament-bracket': '仕事効率化',
    'metronome': '仕事効率化', 'todo-mini': '仕事効率化',
    'keigo-convert': 'ビジネスマナー', 'mail-reply': 'ビジネスマナー',
    'mail-opener': 'ビジネスマナー', 'decline-mail': 'ビジネスマナー',
    'absence-message': 'ビジネスマナー', 'apology-message': 'ビジネスマナー',
    'self-intro': 'ビジネスマナー', 'farewell-msg': 'ビジネスマナー',
    'pta-greeting': 'ビジネスマナー', 'line-soft-reply': 'ビジネスマナー',
    'contract-doc-gen': 'ビジネスマナー', 'employment-contract': 'ビジネスマナー',
    'warikan': 'お金・家計', 'kakei-memo': 'お金・家計',
    'simple-kakei-log': 'お金・家計', 'transit-memo': 'お金・家計',
    'handmade-price': 'お金・家計', 'couple-kakei-balance': 'お金・家計',
    'home-handover-cost-cal': 'お金・家計', 'gift-tax-yearly-guide': 'お金・家計',
    'moving-total-cost': 'お金・家計', 'moveout-cost-fairness': 'お金・家計',
    'housekeep-price-sim': 'お金・家計', 'creditcard-insurance-check': 'お金・家計',
    'kodomo-eco-house-aid': 'お金・家計', 'leaseback-terms-check': 'お金・家計',
    'calc-mini': 'お金・家計',
    'household-staples-check': '在庫・仕入れ', 'disaster-stock-check': '在庫・仕入れ',
    'disaster-stock-days': '在庫・仕入れ', 'disaster-supplies-manage': '在庫・仕入れ',
    'shopping-list': '買い物判断', 'shopping-memo': '買い物判断',
    'shopping-route': '買い物判断', 'coupon-memo': '買い物判断',
    'point-memo': '買い物判断', 'no-forget': '買い物判断',
    'trash-day': 'ライフハック', 'kaji-rotation': 'ライフハック',
    'expiry-memo': 'ライフハック', 'key-memo': 'ライフハック',
    'storage-memo': 'ライフハック', 'outing-check': 'ライフハック',
    'delivery-memo': 'ライフハック', 'password-strength': 'ライフハック',
    'morning-chores-schedule': 'ライフハック', 'chore-share-log': 'ライフハック',
    'allergy-memo': 'ライフハック', 'size-memo': 'ライフハック',
    'pet-diary': 'ライフハック', 'meishi-memo': 'ライフハック',
    'license-expiry': 'ライフハック', 'family-insurance-card-expiry': 'ライフハック',
    'calendar-mini': 'ライフハック', 'memo-mini': 'ライフハック',
    'unit-convert': 'ライフハック', 'plant-care': 'ライフハック',
    'water-intake': '健康習慣', 'weight-log': '健康習慣',
    'workout-log': '健康習慣', 'running-log': '健康習慣',
    'habit-tracker': '健康習慣', 'mood-tracker': '健康習慣',
    'sleep-forecast-today': '健康習慣', 'recovery-sleep-log': '健康習慣',
    'bodymake-pfc-calc': '健康習慣', 'skincare-diary': '健康習慣',
    'digital-detox-focus': '健康習慣', 'meal-manager': '健康習慣',
    'flashcard-mini': '勉強法', 'book-log': '勉強法', 'grade-manager': '勉強法',
    'memory-train': '記憶術',
    'number-memory-game': '脳トレ', 'color-tap-reaction': '脳トレ',
    'reaction-speed': '脳トレ',
    '5sec-generation': '性格診断系', 'notification-type': '性格診断系',
    'color-psy-test': '性格診断系', 'mbti-compat-check': '性格診断系',
    'work-destiny-type': '性格診断系', 'long-holiday-damage-v2': '性格診断系',
    'humor-excuse-gen': 'ネタ・ジョーク', 'pe-warmup-idea': 'ネタ・ジョーク',
    'housework-excuse': 'ネタ・ジョーク', 'stress-haiku': 'ネタ・ジョーク',
    'tired-day-letter': 'ネタ・ジョーク',
    'catchcopy-gen': 'ジェネレーター系', 'instagram-caption': 'ジェネレーター系',
    'hashtag-batch': 'ジェネレーター系', 'x-post-template': 'ジェネレーター系',
    'drawing-prompt': 'ジェネレーター系', 'praise-words': 'ジェネレーター系',
    'nickname-maker': 'ジェネレーター系', 'thank-message': 'ジェネレーター系',
    'birthday-line': 'ジェネレーター系', 'omimai-line': 'ジェネレーター系',
    'cel90s-anime-prompt': 'ジェネレーター系', 'car-retro-pixel-prompt': 'ジェネレーター系',
    '8bit-bg-prompt': 'ジェネレーター系', 'cozy-room-prompt': 'ジェネレーター系',
    'sns-phrase-maker': 'ジェネレーター系', 'sns-post-idea-stock': 'ジェネレーター系',
    'bcp-plan-gen': 'ジェネレーター系',
    'builder-vs-maker': '比較系',
    'zodiac-compat-rank': 'ランキング系',
    'menu-planner': '食べ物', 'recipe-note': '食べ物',
    'lunch-pick': '食べ物', 'meal-prep-hygiene': '食べ物',
    'travel-shiori': '旅行', 'camp-checklist': '旅行',
    'mothers-day': '季節イベント',
    'luck-reset-omikuji': '占い・運勢', 'name-judge-web': '占い・運勢',
    'daily-word-omikuji': '占い・運勢', 'reward-suggest-fortune': '占い・運勢',
    'self-palmistry': '占い・運勢', 'tarot-relationship': '占い・運勢',
    'digital-tarot': '占い・運勢', 'fun-omikuji': '占い・運勢',
    'bathtime-omikuji': '占い・運勢', 'fortune-pick': '占い・運勢',
    'animal-character-luck': '占い・運勢', 'food-fortune-check': '占い・運勢',
    'positive-daily-omikuji': '占い・運勢', 'onigiri-money-luck': '占い・運勢',
    '30sec-omikuji': '占い・運勢', 'pet-lookalike-fortune': '占い・運勢',
    'date-plan-gen': '占い・運勢',
    'oshi-color-coord': '推し活', 'oshi-birthday-countdown': '推し活',
    'otaku-listing-text': '推し活', 'oshi-sd-watercolor': '推し活',
    'oshi-poem-gen': '推し活', 'oshi-event-graph': '推し活',
    'oshi-yojijukugo': '推し活', 'oshi-angel-prompt': '推し活',
    'oshi-watercolor-prompt': '推し活', 'oshi-countdown-gen': '推し活',
    'oshi-numa-check': '推し活',
    'quake-insurance-building': '保険', 'quake-insurance-main-policy': '保険',
    'quake-insurance-need': '保険', 'quake-insurance-payout': '保険',
    'kokuho-discount-check': '保険', 'moped-insurance-memo': '保険',
    'insurance-claim-doc-gen': '保険',
    'disaster-stockpile-guide': '防災', 'shelter-route-log': '防災',
    'evac-route-checklist': '防災',
}

SLUG_SCORE = {
    'calorie-quiz': (2,3,3,0,1,1), 'biz-keigo-quiz': (1,3,3,0,2,1),
    'local-specialty-quiz': (2,3,3,0,1,1), 'vocab-quiz': (1,2,3,0,2,1),
    'business-manner': (1,2,3,0,2,1), 'disaster-quiz': (1,2,3,0,2,1),
    'kakei-defense-quiz': (1,3,3,1,2,1), 'neighbor-manners': (2,3,3,0,1,1),
    'typing-test': (2,2,2,0,2,1),
    'omiyage-budget': (2,3,0,1,3,2),
    'daily-report': (1,2,0,0,3,2), 'meeting-memo': (1,1,0,0,3,0),
    'shift-table': (1,2,0,0,3,2), 'shift-builder': (1,2,0,0,3,2),
    'task-sort': (1,2,0,1,3,1), 'project-status': (1,1,0,0,3,0),
    'schedule-pick': (1,2,0,0,3,1), 'early-late-log': (2,2,0,1,3,1),
    'call-memo': (1,1,0,0,3,0), 'duty-roster': (1,2,0,0,3,1),
    'sales-target-reverse': (2,3,0,1,3,2), 'newhire-training-list': (1,2,0,0,3,1),
    'skill-map': (1,1,0,1,3,1), 'presentation-timer': (1,2,0,0,3,1),
    'pomodoro': (1,2,0,0,3,1), 'faq-memo': (0,1,0,0,3,0),
    'blog-update-plan': (1,2,0,1,2,1), 'sidejob-time-plan': (1,2,0,1,3,1),
    'simple-timer': (0,1,0,0,3,0), 'counter-mini': (0,1,0,0,3,0),
    'stopwatch': (0,1,0,0,3,0), 'tournament-bracket': (2,3,0,0,2,2),
    'metronome': (0,1,0,0,2,0), 'todo-mini': (0,1,0,0,3,0),
    'keigo-convert': (2,3,0,0,3,2), 'mail-reply': (1,2,0,0,3,2),
    'mail-opener': (1,2,0,0,3,2), 'decline-mail': (2,3,0,0,3,2),
    'absence-message': (2,3,0,0,3,2), 'apology-message': (2,3,0,0,3,2),
    'self-intro': (1,2,0,1,3,2), 'farewell-msg': (2,3,0,0,3,2),
    'pta-greeting': (2,3,0,0,2,2), 'line-soft-reply': (2,3,0,0,3,2),
    'contract-doc-gen': (1,1,0,0,3,1), 'employment-contract': (0,1,0,0,3,1),
    'warikan': (1,3,0,0,3,1), 'kakei-memo': (0,1,0,0,3,0),
    'simple-kakei-log': (0,1,0,0,3,0), 'transit-memo': (0,1,0,0,3,0),
    'handmade-price': (1,2,0,0,3,1), 'couple-kakei-balance': (2,3,0,2,3,2),
    'home-handover-cost-cal': (1,1,0,0,3,1), 'gift-tax-yearly-guide': (1,2,0,0,3,1),
    'moving-total-cost': (1,2,0,0,3,1), 'moveout-cost-fairness': (2,3,0,2,3,2),
    'housekeep-price-sim': (2,2,0,1,3,1), 'creditcard-insurance-check': (1,2,0,2,3,1),
    'kodomo-eco-house-aid': (1,2,0,1,3,1), 'leaseback-terms-check': (0,1,0,1,3,0),
    'calc-mini': (0,1,0,0,3,0),
    'household-staples-check': (1,2,0,1,3,1), 'disaster-stock-check': (1,2,0,1,3,1),
    'disaster-stock-days': (1,2,0,2,3,1), 'disaster-supplies-manage': (0,1,0,0,3,0),
    'shopping-list': (0,1,0,0,3,0), 'shopping-memo': (0,1,0,0,3,0),
    'shopping-route': (1,2,0,0,3,1), 'coupon-memo': (0,1,0,0,3,0),
    'point-memo': (0,1,0,0,3,0), 'no-forget': (1,2,0,1,3,1),
    'trash-day': (1,2,0,0,3,0), 'kaji-rotation': (1,2,0,0,3,1),
    'expiry-memo': (1,2,0,0,3,0), 'key-memo': (0,1,0,0,3,0),
    'storage-memo': (0,1,0,0,3,0), 'outing-check': (1,2,0,1,3,1),
    'delivery-memo': (0,1,0,0,3,0), 'password-strength': (2,3,0,2,3,2),
    'morning-chores-schedule': (1,2,0,0,3,1), 'chore-share-log': (1,1,0,0,3,0),
    'allergy-memo': (0,1,0,0,3,0), 'size-memo': (0,1,0,0,3,0),
    'pet-diary': (1,1,0,0,3,0), 'meishi-memo': (0,1,0,0,3,0),
    'license-expiry': (0,1,0,0,3,0), 'family-insurance-card-expiry': (1,2,0,1,3,1),
    'calendar-mini': (0,1,0,0,3,0), 'memo-mini': (0,1,0,0,3,0),
    'unit-convert': (1,2,0,0,3,0), 'plant-care': (1,1,0,0,3,0),
    'water-intake': (1,2,0,1,3,1), 'weight-log': (1,1,0,0,3,0),
    'workout-log': (1,1,0,0,3,0), 'running-log': (1,1,0,0,3,0),
    'habit-tracker': (1,2,0,1,3,1), 'mood-tracker': (2,2,0,1,3,1),
    'sleep-forecast-today': (2,3,0,2,2,2), 'recovery-sleep-log': (1,1,0,0,3,0),
    'bodymake-pfc-calc': (2,3,0,1,3,2), 'skincare-diary': (1,1,0,0,3,0),
    'digital-detox-focus': (2,2,0,2,2,1), 'meal-manager': (0,1,0,0,3,0),
    'flashcard-mini': (1,1,0,0,3,1), 'book-log': (1,1,0,0,3,0),
    'grade-manager': (0,1,0,0,3,0),
    'memory-train': (2,3,2,0,3,2),
    'number-memory-game': (2,3,2,0,2,2), 'color-tap-reaction': (2,3,2,0,2,2),
    'reaction-speed': (2,3,2,0,2,2),
    '5sec-generation': (3,3,1,3,1,2), 'notification-type': (3,3,1,3,1,2),
    'color-psy-test': (3,3,1,3,1,3), 'mbti-compat-check': (2,3,1,3,1,2),
    'work-destiny-type': (3,3,1,3,1,2), 'long-holiday-damage-v2': (3,3,1,3,1,2),
    'humor-excuse-gen': (3,3,0,1,1,2), 'pe-warmup-idea': (3,3,0,0,1,1),
    'housework-excuse': (3,3,0,1,2,2), 'stress-haiku': (3,3,0,1,1,3),
    'tired-day-letter': (3,3,0,1,1,2),
    'catchcopy-gen': (2,3,0,0,2,2), 'instagram-caption': (2,3,0,0,2,2),
    'hashtag-batch': (2,3,0,0,2,2), 'x-post-template': (2,3,0,0,2,2),
    'drawing-prompt': (2,2,0,0,2,2), 'praise-words': (3,3,0,0,1,2),
    'nickname-maker': (2,3,0,0,1,2), 'thank-message': (1,3,0,0,2,2),
    'birthday-line': (2,3,0,0,2,2), 'omimai-line': (1,2,0,0,2,2),
    'cel90s-anime-prompt': (2,2,0,0,1,3), 'car-retro-pixel-prompt': (2,2,0,0,1,3),
    '8bit-bg-prompt': (2,2,0,0,1,3), 'cozy-room-prompt': (2,2,0,0,1,3),
    'sns-phrase-maker': (3,3,0,0,2,2), 'sns-post-idea-stock': (2,3,0,0,2,2),
    'bcp-plan-gen': (1,1,0,0,2,1),
    'builder-vs-maker': (2,3,0,3,2,2),
    'zodiac-compat-rank': (2,3,1,2,1,2),
    'menu-planner': (1,2,0,0,3,1), 'recipe-note': (1,1,0,0,3,0),
    'lunch-pick': (2,2,0,1,3,1), 'meal-prep-hygiene': (1,2,0,1,3,1),
    'travel-shiori': (1,2,0,0,3,1), 'camp-checklist': (1,2,0,0,3,1),
    'mothers-day': (3,3,0,0,1,2),
    'luck-reset-omikuji': (2,2,1,1,1,1), 'name-judge-web': (1,2,1,2,1,1),
    'daily-word-omikuji': (2,2,1,1,1,1), 'reward-suggest-fortune': (2,2,1,1,1,1),
    'self-palmistry': (2,3,1,2,1,2), 'tarot-relationship': (2,3,1,2,1,2),
    'digital-tarot': (2,3,1,2,1,2), 'fun-omikuji': (2,2,1,1,1,1),
    'bathtime-omikuji': (2,2,1,1,1,1), 'fortune-pick': (2,2,1,1,1,1),
    'animal-character-luck': (2,2,1,2,1,1), 'food-fortune-check': (2,2,1,1,1,1),
    'positive-daily-omikuji': (2,2,1,1,1,1), 'onigiri-money-luck': (2,2,1,1,1,1),
    '30sec-omikuji': (2,2,1,1,1,1), 'pet-lookalike-fortune': (2,3,1,2,1,2),
    'date-plan-gen': (2,3,1,2,1,2),
    'oshi-color-coord': (2,3,1,1,1,3), 'oshi-birthday-countdown': (2,2,0,0,1,1),
    'otaku-listing-text': (2,2,0,0,2,1), 'oshi-sd-watercolor': (2,2,0,0,1,3),
    'oshi-poem-gen': (2,3,0,0,1,2), 'oshi-event-graph': (1,2,0,0,2,2),
    'oshi-yojijukugo': (2,3,0,0,1,2), 'oshi-angel-prompt': (2,3,0,0,1,2),
    'oshi-watercolor-prompt': (2,2,0,0,1,3), 'oshi-countdown-gen': (2,2,0,0,1,1),
    'oshi-numa-check': (2,3,1,3,1,2),
    'quake-insurance-building': (0,1,0,1,3,0), 'quake-insurance-main-policy': (0,1,0,1,3,0),
    'quake-insurance-need': (1,2,0,2,3,1), 'quake-insurance-payout': (0,1,0,1,3,0),
    'kokuho-discount-check': (1,2,0,2,3,1), 'moped-insurance-memo': (0,1,0,0,3,0),
    'insurance-claim-doc-gen': (0,1,0,0,3,0),
    'disaster-stockpile-guide': (1,2,0,1,3,1), 'shelter-route-log': (0,1,0,0,3,0),
    'evac-route-checklist': (0,1,0,0,3,0),
}

WEIGHTS = (1.5, 2.0, 1.2, 1.2, 0.5, 1.0)
MAX_RAW = sum(3 * w for w in WEIGHTS)

RANK_LABELS = {
    'S': ('S', '🔥 Sランク (80点以上)'),
    'A': ('A', '✨ Aランク (70〜79点)'),
    'B': ('B', '👍 Bランク (60〜69点)'),
    'C': ('C', '📋 Cランク (60点未満)'),
}


def get_slug(e):
    su = e.get('short_url') or ''
    m = re.search(r'/s/([^/]+)/', su)
    return m.group(1) if m else ''


def calc_pct(scores):
    return round(sum(s * w for s, w in zip(scores, WEIGHTS)) / MAX_RAW * 100, 1)


def get_rank(pct):
    if pct >= 80: return 'S'
    if pct >= 70: return 'A'
    if pct >= 60: return 'B'
    return 'C'


def x_text_preview(text, chars=60):
    if not text:
        return '(投稿文なし)'
    lines = [l for l in text.strip().splitlines() if l.strip()]
    preview = ' / '.join(lines[:3])
    return preview[:chars] + '…' if len(preview) > chars else preview


# ===== スコアリング =====
results = []
for e in drafts:
    if e.get('id') in EXCLUDED_IDS:
        continue
    slug = get_slug(e)
    cat = SLUG_CAT.get(slug, 'その他')
    scores = SLUG_SCORE.get(slug, (0, 1, 0, 0, 2, 0))
    pct = calc_pct(scores)
    results.append({
        'id': e.get('id', '?'),
        'slug': slug,
        'app_name': e.get('app_name', '?'),
        'category': cat,
        'priority': PRIORITY_MAP.get(cat, 50),
        'pct': pct,
        'rank': get_rank(pct),
        'short_url': e.get('short_url', ''),
        'x_preview': x_text_preview(e.get('x_text', '')),
    })

# スコア降順ソート
results.sort(key=lambda r: -r['pct'])

# ランク別仕分け
rank_groups = {'S': [], 'A': [], 'B': [], 'C': []}
for r in results:
    rank_groups[r['rank']].append(r)

# おすすめ20件: S→A→B順、優先カテゴリ(priority<=20)のみ
hi_pri = [r for r in results if r['priority'] <= 20]
top20 = hi_pri[:20]

# ===== Markdown生成 =====
lines = []
lines.append(f'# X投稿候補 ランク別一覧 {TODAY[:4]}-{TODAY[4:6]}-{TODAY[6:]}')
lines.append('')
lines.append('> generated by `sns/make_ranked_report.py` — 読み取り専用、queue/registry/s/ は変更していません')
lines.append('')

# サマリ表
lines.append('## サマリ')
lines.append('')
lines.append(f'- draft総数: {len(results)}件')
lines.append(f'- 🔥 Sランク (80点以上): {len(rank_groups["S"])}件')
lines.append(f'- ✨ Aランク (70〜79点): {len(rank_groups["A"])}件')
lines.append(f'- 👍 Bランク (60〜69点): {len(rank_groups["B"])}件')
lines.append(f'- 📋 Cランク (60点未満): {len(rank_groups["C"])}件')
lines.append(f'- ★ 優先カテゴリ(20種)合計: {len(hi_pri)}件')
lines.append(f'- ✕ 低優先(占い/推し活/保険/防災/その他): {len(results)-len(hi_pri)}件')
lines.append('')

# ===== おすすめ20件 =====
lines.append('---')
lines.append('')
lines.append('## 🎯 おすすめ投稿順 TOP20（優先カテゴリ高スコア順）')
lines.append('')
lines.append('> 迷ったらここから選ぶ。カテゴリが被らないように投稿するのがおすすめ。')
lines.append('')
lines.append('| # | ランク | 点 | カテゴリ | アプリ名 | URL |')
lines.append('|---|---|---|---|---|---|')
for i, r in enumerate(top20, 1):
    lines.append(f'| {i} | {r["rank"]} | {r["pct"]:.0f} | {r["category"]} | {r["app_name"]} | {r["short_url"]} |')
lines.append('')

lines.append('### TOP20 投稿文プレビュー')
lines.append('')
for i, r in enumerate(top20, 1):
    lines.append(f'**{i}. {r["app_name"]}** `{r["rank"]}` {r["pct"]:.0f}点')
    lines.append(f'> {r["x_preview"]}')
    lines.append(f'> {r["short_url"]}')
    lines.append('')

# ===== ランク別詳細 =====
for rank_key in ['S', 'A', 'B', 'C']:
    group = rank_groups[rank_key]
    _, label = RANK_LABELS[rank_key]
    lines.append('---')
    lines.append('')
    lines.append(f'## {label} — {len(group)}件')
    lines.append('')
    if not group:
        lines.append('(該当なし)')
        lines.append('')
        continue
    lines.append('| # | 点 | カテゴリ | アプリ名 | ID | URL |')
    lines.append('|---|---|---|---|---|---|')
    for i, r in enumerate(group, 1):
        lines.append(f'| {i} | {r["pct"]:.0f} | {r["category"]} | {r["app_name"]} | `{r["id"]}` | {r["short_url"]} |')
    lines.append('')
    lines.append('<details><summary>投稿文プレビュー一覧</summary>')
    lines.append('')
    for r in group:
        lines.append(f'**{r["app_name"]}** — {r["category"]} {r["pct"]:.0f}点')
        lines.append(f'> {r["x_preview"]}')
        lines.append('')
    lines.append('</details>')
    lines.append('')

# ===== 学習ログ =====
lines.append('---')
lines.append('')
lines.append('## 📝 学習ログ（SNS補充マン v1 知見）')
lines.append('')
lines.append('### 件数よりカテゴリ多様性が重要')
lines.append('- 占い・推し活だけ増やしても在庫問題は解決しない')
lines.append('- 同カテゴリ連投はフォロワーに飽きられる。1日1カテゴリが理想')
lines.append('- 188件中42件(22%)が低優先。在庫の「太さ」ではなく「幅」が課題')
lines.append('')
lines.append('### 既存完成アプリ188件で十分運用可能')
lines.append('- 146件の優先カテゴリ候補がある')
lines.append('- 1日1投稿なら約5ヶ月分の在庫 (146日)')
lines.append('- 新規アプリ生成なしでも当面は回せる')
lines.append('')
lines.append('### 補充マンは件数より未開拓カテゴリ探索を優先')
lines.append('- 現在0〜1件の不足カテゴリ: 地域ネタ / 記憶術 / 比較系 / ランキング系 / 季節イベント')
lines.append('- 次回補充時はこれらを重点的に探す')
lines.append('- 性格診断系・ネタ・脳トレは高スコアなので積極投稿推奨')
lines.append('')
lines.append('### スコアリング基準 (v1)')
lines.append('| 軸 | 重み | 説明 |')
lines.append('|---|---|---|')
lines.append('| ネタ性 | x1.5 | 笑える・驚ける要素 |')
lines.append('| 共有性 | x2.0 | 「これシェアしたい」になるか |')
lines.append('| クイズ性 | x1.2 | クイズ要素があるか |')
lines.append('| 診断性 | x1.2 | 診断・判定結果が出るか |')
lines.append('| 実用性 | x0.5 | 日常で役立つか |')
lines.append('| スクショ映え | x1.0 | 結果画面が映えるか |')
lines.append('')

# ===== ファイル書き出し =====
os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT_FILE, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print(f'出力完了: {OUT_FILE}')
print(f'総件数: {len(results)}件')
print(f'S={len(rank_groups["S"])} / A={len(rank_groups["A"])} / B={len(rank_groups["B"])} / C={len(rank_groups["C"])}')
print(f'TOP20優先カテゴリ: {len(hi_pri)}件中上位20件')
