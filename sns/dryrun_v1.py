"""SNS補充マン v1 dry-run スコアリングスクリプト"""
import json, sys, re
from collections import Counter
sys.stdout.reconfigure(encoding='utf-8')

with open('sns/sns_queue.json', encoding='utf-8') as f:
    queue = json.load(f)

drafts = [e for e in queue if e.get('status') == 'draft']
EXCLUDED_IDS = {f'20260531-X{str(i).zfill(3)}' for i in range(1, 11)}

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

# スコア: (ネタ性, 共有性, クイズ性, 診断性, 実用性, スクショ映え) 各0-3
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

def get_slug(e):
    su = e.get('short_url') or ''
    m = re.search(r'/s/([^/]+)/', su)
    return m.group(1) if m else ''

def calc_pct(scores):
    return round(sum(s * w for s, w in zip(scores, WEIGHTS)) / MAX_RAW * 100, 1)

results = []
for e in drafts:
    if e.get('id') in EXCLUDED_IDS:
        continue
    slug = get_slug(e)
    cat = SLUG_CAT.get(slug, 'その他')
    scores = SLUG_SCORE.get(slug, (0, 1, 0, 0, 2, 0))
    results.append({
        'id': e.get('id', '?'),
        'slug': slug,
        'app_name': e.get('app_name', '?'),
        'category': cat,
        'priority': PRIORITY_MAP.get(cat, 50),
        'scores': scores,
        'pct': calc_pct(scores),
        'short_url': e.get('short_url', ''),
    })

results.sort(key=lambda r: (r['priority'], -r['pct']))
cats_all = Counter(r['category'] for r in results)
hi_pri = sum(cnt for cat, cnt in cats_all.items() if PRIORITY_MAP.get(cat, 50) <= 20)
lo_pri = sum(cnt for cat, cnt in cats_all.items() if PRIORITY_MAP.get(cat, 50) > 20)

SEP = '=' * 65

print(SEP)
print('SNS補充マン v1  dry-run レポート  2026-06-02')
print(SEP)
print()
print('■ カテゴリ別件数（draft 188件）')
print()
for cat in sorted(cats_all.keys(), key=lambda x: PRIORITY_MAP.get(x, 50)):
    cnt = cats_all[cat]
    pri = PRIORITY_MAP.get(cat, 50)
    mark = '★' if pri <= 20 else '▽' if pri <= 50 else '✕'
    print(f'  {mark}  {cat:<20} {cnt:>3}件')
print()
print(f'  ★ 優先カテゴリ合計 : {hi_pri}件')
print(f'  ✕ 低優先カテゴリ  : {lo_pri}件')
print(f'     占い{cats_all.get("占い・運勢",0)} + 推し活{cats_all.get("推し活",0)} + 保険{cats_all.get("保険",0)} + 防災{cats_all.get("防災",0)} + その他{cats_all.get("その他",0)}')
print()

print(SEP)
print('■ X向きスコア上位100件')
print('  ネタ性x1.5 + 共有性x2.0 + クイズ性x1.2 + 診断性x1.2 + 実用性x0.5 + 映えx1.0')
print('  優先カテゴリ内でソート後、スコア降順  最大100点換算')
print()
print(f'  {"#":>3}  {"点":>4}  {"カテゴリ":<16} アプリ名')
print('-' * 65)
for i, r in enumerate(results[:100], 1):
    print(f'  {i:>3}. {r["pct"]:>4.0f}点  {r["category"]:<16} {r["app_name"]}')
    print(f'            {r["short_url"]}')
print()

print(SEP)
print('■ 101〜200位')
print()
print(f'  {"#":>3}  {"点":>4}  {"カテゴリ":<16} アプリ名')
print('-' * 65)
for i, r in enumerate(results[100:200], 101):
    print(f'  {i:>3}. {r["pct"]:>4.0f}点  {r["category"]:<16} {r["app_name"]}')
    print(f'            {r["short_url"]}')
print()

print(SEP)
print('■ SNS向きカテゴリランキング（優先順 / 平均スコア）')
print()
cat_scores = {}
for r in results:
    cat_scores.setdefault(r['category'], []).append(r['pct'])
print(f'  {"カテゴリ":<20} {"件数":>4}  {"平均点":>6}  {"最高点":>6}')
print('-' * 50)
for cat in sorted(cat_scores.keys(), key=lambda x: PRIORITY_MAP.get(x, 50)):
    scr = cat_scores[cat]
    pri = PRIORITY_MAP.get(cat, 50)
    mark = '★' if pri <= 20 else '▽' if pri <= 50 else '✕'
    print(f'  {mark}  {cat:<18} {len(scr):>3}件  {sum(scr)/len(scr):>5.0f}点  {max(scr):>5.0f}点')
print()

print(SEP)
print('■ 不足カテゴリ（優先カテゴリで3件以下）')
print()
for pri_num in range(1, 21):
    cat = next((c for c, p in PRIORITY_MAP.items() if p == pri_num), None)
    if cat and cats_all.get(cat, 0) <= 3:
        print(f'  [{pri_num:02d}] {cat}: {cats_all.get(cat, 0)}件 ← 不足')
print()

print(SEP)
print('■ dry-run 完了 -- 書き込みは一切行っていません')
print()
print('  次ステップ候補:')
print('  A) 低優先36件(占い/推し活/保険)をdashboardで非表示にする')
print('     -> 実質152件の高品質候補に絞り込み可能')
print('  B) archived_old_posted_like から地域ネタ/クイズ系を再昇格してギャップ補填')
print('  C) sns_queue.json に priority_tag フィールドを付与して段階管理')
