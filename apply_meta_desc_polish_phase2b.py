#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_meta_desc_polish_phase2b.py - Phase 2 の追加調整版（variation長め化・重複文字列除去）

Phase 2 で処理した同じ100件に対し、variation/risk 文を長めに差し替え。
目的: after平均を 105字→115字台へ底上げ、100字未満を削減。

戦略:
- Phase 2 result.json から処理済み100件 slug を取得
- 各 entry の **現在の desc** から「新suffix」「Phase2 旧 variation/risk」を剥がして base を復元
- 新 variation（5種・各20〜30字）または新 risk msg（重複「目安」回避済み）を適用
- 5箇所同期で再書き換え

絶対禁止:
- title 変更
- 対象100件以外への影響
- アプリ本文/UI/JS/CSS 変更
"""
import argparse, json, re, sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parent
AI_INDEX = REPO_ROOT / "ai-site-index.json"
OUT_DIR = REPO_ROOT / "_public_audit"
PHASE2_RESULT = OUT_DIR / "meta_desc_polish_phase2_result.json"

BENEFIT_TAIL = "無料・登録不要・スマホ対応。"

# Phase 2 で付加した「短い」フラグメント（剥がし対象・長い順）
OLD_VARIATIONS = [
    "結果はコピーしてすぐ使えます。",
    "入力するだけで結果がすぐ表示されます。",
    "整理した内容を見やすく確認できます。",
    "計算結果はその場でチェックできます。",
    "保存もコピーもワンタッチで完了。",
]
OLD_RISK_MSGS = [
    "目安として、最終確認は税理士・税務署にご相談ください。",
    "判定は目安として、社労士・年金事務所にご確認ください。",
    "試算は目安として、最終判断はファイナンシャルプランナー等の専門家にご確認ください。",
    "結果は目安として、医療上の判断は医師・薬剤師にご相談ください。",
    "結果は目安として、不調が続く場合はメンタルヘルス専門家にご相談ください。",
    "判定は目安として、法的判断は弁護士・行政書士等の専門家にご確認ください。",
    "試算は目安として、保険の最適化は保険会社・FP等の専門家にご相談ください。",
    "計画は目安として、詳細はケアマネジャー・自治体窓口にご相談ください。",
    "判定は目安として、労務判断は社労士にご確認ください。",
]
OLD_FRAGMENTS = sorted(OLD_VARIATIONS + OLD_RISK_MSGS, key=len, reverse=True)

# 新 variation（5種・20〜30字）
NEW_VARIATIONS = [
    "結果をコピーして、そのまま投稿準備や記録整理に使えます。",
    "入力内容を整理し、日々の確認や作業メモにそのまま活用できます。",
    "短時間で結果を確認でき、スマホからでも手軽に見直せます。",
    "比較や整理に使いやすく、必要な情報をすばやく確認できます。",
    "結果を保存・共有しやすく、日常の小さな判断を補助します。",
]

# 新 risk rules: (category, regex, intro_phrase, advisory_phrase)
# 重複 detection: base 末尾に「目安/参考」が既にある場合 intro をスキップして advisory のみ
NEW_RISK_RULES = [
    ("税/相続", re.compile(r'税|相続|遺産|贈与|ふるさと納税|確定申告|消費税|源泉|住民税|所得税|事業税|固定資産税|法人税|印紙税|登録免許税'),
     "算出結果は目安です。", "最終確認は税理士・税務署にご相談ください。"),
    ("年金/社保/扶養", re.compile(r'年金|社保|社会保険|厚生年金|国民年金|扶養|国保|健保|106万|130万|150万|201万|103万|被保険者|遺族年金|障害年金|老齢年金'),
     "判定結果は目安です。", "最終確認は社労士・年金事務所にご相談ください。"),
    ("投資/FIRE/NISA", re.compile(r'NISA|iDeCo|FIRE|投資|資産運用|株式|債券|REIT|配当|複利|積立|信託'),
     "試算結果は目安です。", "判断前にファイナンシャルプランナー等の専門家へご確認ください。"),
    ("医療/症状/服薬", re.compile(r'医療|症状|血圧|血糖|服薬|薬|通院|診察|発熱|頭痛|腹痛|アレルギー|ワクチン|予防接種|カロリー|BMI|体温|栄養素|食事制限'),
     "算出結果は目安です。", "医療上の判断は医師・薬剤師にご相談ください。"),
    ("心理/不安/依存", re.compile(r'心理|不安|うつ|依存|ストレス|メンタル|燃え尽き|HSP|睡眠の質'),
     "診断結果は目安です。", "気になる場合はメンタルヘルス専門家にご相談ください。"),
    ("法律/契約", re.compile(r'法律|契約|遺言|離婚|労働基準|労基|借地借家|消費者法'),
     "判定結果は目安です。", "法的判断は弁護士・行政書士等の専門家にご確認ください。"),
    ("保険", re.compile(r'保険|生命保険|医療保険|火災保険|自動車保険|地震保険'),
     "試算結果は目安です。", "保険の最適化は保険会社・FP等の専門家にご相談ください。"),
    ("介護", re.compile(r'介護|要介護|デイサービス|ケアマネ|地域包括'),
     "計画は目安です。", "詳細はケアマネジャー・自治体窓口にご相談ください。"),
    ("労務/シフト", re.compile(r'労務|雇用|勤怠|シフト|残業|有給|休暇|給与|賃金|時給|最低賃金'),
     "判定結果は目安です。", "労務判断は社労士にご確認ください。"),
]

PATTERNS = [
    ("meta", re.compile(r'(<meta\s+name=["\']description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("og", re.compile(r'(<meta\s+property=["\']og:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("twitter", re.compile(r'(<meta\s+name=["\']twitter:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("jsonld", re.compile(r'("description"\s*:\s*")([^"]+)(")')),
]


def strip_to_base(current_desc: str):
    """現在のdesc (Phase 2適用済み) → base 復元。"""
    # 1. 末尾 benefit_tail 剥がす
    if not current_desc.endswith(BENEFIT_TAIL):
        return None  # unexpected pattern
    body = current_desc[:-len(BENEFIT_TAIL)]
    # 2. Phase 2 で追加した fragment を剥がす（最長一致から試す）
    for frag in OLD_FRAGMENTS:
        if body.endswith(frag):
            base = body[:-len(frag)]
            # base 末尾に「。」維持
            if base and not base.endswith("。"):
                base += "。"
            return base
    # どの fragment にも match しない → そのまま返す（既に純 base かも）
    if body and not body.endswith("。"):
        body += "。"
    return body


def classify_new(title: str, base: str):
    text = title + " " + base
    for name, pat, intro, advisory in NEW_RISK_RULES:
        if pat.search(text):
            return name, intro, advisory
    return None, None, None


def build_new_desc(slug: str, title: str, base: str):
    cat, intro, advisory = classify_new(title, base)
    if cat:
        # 重複 detection: base 末尾20字に「目安/参考」があれば intro skip
        tail = base[-20:] if len(base) > 20 else base
        skip_intro = bool(re.search(r'(目安|参考)(として|に|です|の参考|として参考)', tail))
        risk_msg = advisory if skip_intro else (intro + advisory)
        new = base + risk_msg + BENEFIT_TAIL
    else:
        var = NEW_VARIATIONS[hash(slug) % len(NEW_VARIATIONS)]
        new = base + var + BENEFIT_TAIL
    return new, cat or "general"


def process_html(html_path: Path, before_desc: str, after_desc: str, dry: bool):
    if not html_path.is_file():
        return {"hit_count": 0, "written": False, "error": "html_not_found", "hits": {}}
    html = html_path.read_text(encoding="utf-8")
    new_html = html
    hits = {"meta": 0, "og": 0, "twitter": 0, "jsonld": 0}
    for key, pat in PATTERNS:
        def _sub(m, key=key):
            if m.group(2) == before_desc:
                hits[key] += 1
                return m.group(1) + after_desc + m.group(3)
            return m.group(0)
        new_html = pat.sub(_sub, new_html)
    total = sum(hits.values())
    if total == 0:
        return {"hit_count": 0, "written": False, "error": "no_match_in_html", "hits": hits}
    if dry:
        return {"hit_count": total, "written": False, "hits": hits, "error": None}
    html_path.write_text(new_html, encoding="utf-8")
    return {"hit_count": total, "written": True, "hits": hits, "error": None}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    dry = args.dry_run

    phase2_data = json.loads(PHASE2_RESULT.read_text(encoding="utf-8"))
    target_slugs = [r["slug"] for r in phase2_data["results"]]

    data = json.loads(AI_INDEX.read_text(encoding="utf-8"))
    entries = data["entries"]
    by_slug = {e["slug"]: i for i, e in enumerate(entries)}

    results = []
    html_updates = json_updates = all4_full = 0
    by_category = {}
    strip_failures = 0

    for slug in target_slugs:
        idx = by_slug.get(slug)
        if idx is None:
            results.append({"slug": slug, "error": "entry_not_found"})
            continue
        e = entries[idx]
        title = e.get("title", "")
        current_desc = e.get("description", "") or ""
        base = strip_to_base(current_desc)
        if base is None:
            strip_failures += 1
            results.append({"slug": slug, "error": "strip_failed", "current_desc": current_desc})
            continue
        new_desc, cat = build_new_desc(slug, title, base)
        by_category[cat] = by_category.get(cat, 0) + 1

        html_path = REPO_ROOT / slug / "index.html"
        res = process_html(html_path, current_desc, new_desc, dry)
        hits = res.get("hits", {})
        all4 = all(hits.get(k, 0) >= 1 for k in ("meta", "og", "twitter", "jsonld"))

        if (not dry) and res["written"]:
            entries[idx]["description"] = new_desc
            json_updates += 1
        if res["written"]:
            html_updates += 1
        if all4:
            all4_full += 1

        results.append({
            "slug": slug, "title": title,
            "before_desc": current_desc, "before_len": len(current_desc),
            "after_desc": new_desc, "after_len": len(new_desc),
            "category": cat, "hits": hits, "all4": all4,
            "html_written": res["written"], "error": res.get("error"),
        })

    if not dry and json_updates > 0:
        AI_INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "meta_desc_polish_phase2b_report.md"
    json_path = OUT_DIR / "meta_desc_polish_phase2b_result.json"

    valid = [r for r in results if "after_len" in r]
    avg_before = sum(r["before_len"] for r in valid) / max(1, len(valid))
    avg_after = sum(r["after_len"] for r in valid) / max(1, len(valid))

    buckets = {"<100": 0, "100-109": 0, "110-119": 0, "120-129": 0, "130-139": 0, "140-149": 0, "150+": 0}
    for r in valid:
        L = r["after_len"]
        if L < 100: buckets["<100"] += 1
        elif L < 110: buckets["100-109"] += 1
        elif L < 120: buckets["110-119"] += 1
        elif L < 130: buckets["120-129"] += 1
        elif L < 140: buckets["130-139"] += 1
        elif L < 150: buckets["140-149"] += 1
        else: buckets["150+"] += 1

    lines = [
        "# meta description 改善 Phase 2b レポート（variation長め化）",
        "",
        f"- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- モード: {'DRY-RUN' if dry else '本実行'}",
        f"- 対象: {len(target_slugs)} 件（Phase 2 同じ slug）",
        f"- strip 失敗: {strip_failures}",
        "",
        "## 集計", "",
        "| 項目 | 値 |", "|---|---|",
        f"| HTML 書き換え | {html_updates}/{len(target_slugs)} |",
        f"| ai-site-index 更新 | {json_updates}/{len(target_slugs)} |",
        f"| 4箇所全置換 | {all4_full}/{len(target_slugs)} |",
        f"| before(=Phase2後)平均 | {avg_before:.1f} |",
        f"| **after 平均** | **{avg_after:.1f}** |",
        "",
        "## カテゴリ別",
    ]
    for c, n in sorted(by_category.items(), key=lambda x: -x[1]):
        lines.append(f"- {c}: {n}件")
    lines.append("")
    lines.append("## after 文字数分布")
    for k, v in buckets.items():
        lines.append(f"- {k}: {v}件")
    lines.append("")
    lines.append("## サンプル 先頭10件")
    for i, r in enumerate(valid[:10], 1):
        lines.append(f"### {i}. {r['slug']} [{r['category']}]")
        lines.append(f"- title: {r['title']}")
        lines.append(f"- before({r['before_len']}字): {r['before_desc']}")
        lines.append(f"- after ({r['after_len']}字): {r['after_desc']}")
        lines.append("")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    payload = {
        "generated_at": datetime.now().isoformat(),
        "phase": "phase2b",
        "mode": "dry-run" if dry else "execute",
        "target_count": len(target_slugs),
        "strip_failures": strip_failures,
        "summary": {
            "html_updates": html_updates, "json_updates": json_updates,
            "all4_full": all4_full,
            "avg_before_len": round(avg_before, 2), "avg_after_len": round(avg_after, 2),
            "by_category": by_category, "length_buckets": buckets,
        },
        "results": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== Phase 2b {'DRY-RUN' if dry else 'EXECUTE'} 完了 ===")
    print(f"  HTML書き換え : {html_updates}/{len(target_slugs)}")
    print(f"  strip失敗    : {strip_failures}")
    print(f"  before平均   : {avg_before:.1f}")
    print(f"  after平均    : {avg_after:.1f}")
    print(f"  カテゴリ     : {by_category}")
    print(f"  分布         : {buckets}")


if __name__ == "__main__":
    main()
