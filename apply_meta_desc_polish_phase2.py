#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_meta_desc_polish_phase2.py - 既存アプリ meta description 改善 Phase 2（本命型 100件）

Phase1 (apply_meta_desc_polish_phase1.py) で末尾置換した100件の **次の100件** に対して、
120〜140字目安の自然な description へ拡張する。

戦略（案B）:
- リスク領域（税/年金/投資/医療/心理/法律/保険/介護/労務）は専門家確認文を追加
- 一般領域は5種バリエーションから slug ハッシュで均等に1つ選択
- いずれも末尾に「無料・登録不要・スマホ対応。」

5箇所同期:
- meta description / og:description / twitter:description / JSON-LD description / ai-site-index.json

絶対禁止:
- title 変更
- アプリ本文/UI/JS/CSS 変更
- 101件目以降への波及
- Phase1で修正済みの100件への再修正
"""
import argparse
import json
import re
import sys
from datetime import datetime
from pathlib import Path

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

REPO_ROOT = Path(__file__).resolve().parent
AI_INDEX = REPO_ROOT / "ai-site-index.json"
OUT_DIR = REPO_ROOT / "_public_audit"

OLD_SUFFIX = "スマホでも快適にご利用いただけます。"
BENEFIT_TAIL = "無料・登録不要・スマホ対応。"

MIN_LEN_IN = 80
MAX_LEN_IN = 100
PHASE2_SKIP = 0
PHASE2_LIMIT = 100

PATTERNS = [
    ("meta", re.compile(r'(<meta\s+name=["\']description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("og", re.compile(r'(<meta\s+property=["\']og:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("twitter", re.compile(r'(<meta\s+name=["\']twitter:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("jsonld", re.compile(r'("description"\s*:\s*")([^"]+)(")')),
]

# リスク領域分類（優先順・先 match した1つを採用）
RISK_RULES = [
    ("税/相続", re.compile(r'税|相続|遺産|贈与|ふるさと納税|確定申告|消費税|源泉|住民税|所得税|事業税|固定資産税|法人税|印紙税|登録免許税'),
     "目安として、最終確認は税理士・税務署にご相談ください。"),
    ("年金/社保/扶養", re.compile(r'年金|社保|社会保険|厚生年金|国民年金|扶養|国保|健保|106万|130万|150万|201万|103万|被保険者|遺族年金|障害年金|老齢年金'),
     "判定は目安として、社労士・年金事務所にご確認ください。"),
    ("投資/FIRE/NISA", re.compile(r'NISA|iDeCo|FIRE|投資|資産運用|株式|債券|REIT|配当|複利|積立|信託'),
     "試算は目安として、最終判断はファイナンシャルプランナー等の専門家にご確認ください。"),
    ("医療/症状/服薬", re.compile(r'医療|症状|血圧|血糖|服薬|薬|通院|診察|発熱|頭痛|腹痛|アレルギー|ワクチン|予防接種|カロリー|BMI|体温|栄養素|食事制限'),
     "結果は目安として、医療上の判断は医師・薬剤師にご相談ください。"),
    ("心理/不安/依存", re.compile(r'心理|不安|うつ|依存|ストレス|メンタル|燃え尽き|HSP|睡眠の質'),
     "結果は目安として、不調が続く場合はメンタルヘルス専門家にご相談ください。"),
    ("法律/契約", re.compile(r'法律|契約|遺言|離婚|労働基準|労基|借地借家|消費者法'),
     "判定は目安として、法的判断は弁護士・行政書士等の専門家にご確認ください。"),
    ("保険", re.compile(r'保険|生命保険|医療保険|火災保険|自動車保険|地震保険'),
     "試算は目安として、保険の最適化は保険会社・FP等の専門家にご相談ください。"),
    ("介護", re.compile(r'介護|要介護|デイサービス|ケアマネ|地域包括'),
     "計画は目安として、詳細はケアマネジャー・自治体窓口にご相談ください。"),
    ("労務/シフト", re.compile(r'労務|雇用|勤怠|シフト|残業|有給|休暇|給与|賃金|時給|最低賃金'),
     "判定は目安として、労務判断は社労士にご確認ください。"),
]

# 一般領域バリエーション（5種・slug hash で均等振り分け）
GENERAL_VARIATIONS = [
    "結果はコピーしてすぐ使えます。",
    "入力するだけで結果がすぐ表示されます。",
    "整理した内容を見やすく確認できます。",
    "計算結果はその場でチェックできます。",
    "保存もコピーもワンタッチで完了。",
]


def strip_suffix(desc: str) -> str:
    base = desc[:-len(OLD_SUFFIX)] if desc.endswith(OLD_SUFFIX) else desc
    if not base.endswith("。"):
        base += "。"
    return base


def classify_risk(title: str, base: str):
    text = title + " " + base
    for name, pat, msg in RISK_RULES:
        if pat.search(text):
            return name, msg
    return None, None


def build_new_desc(slug: str, title: str, old_desc: str):
    base = strip_suffix(old_desc)
    cat, msg = classify_risk(title, base)
    if cat:
        new = base + msg + BENEFIT_TAIL
    else:
        var = GENERAL_VARIATIONS[hash(slug) % len(GENERAL_VARIATIONS)]
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

    data = json.loads(AI_INDEX.read_text(encoding="utf-8"))
    entries = data["entries"]

    cands = []
    for idx, e in enumerate(entries):
        desc = e.get("description", "") or ""
        if desc.endswith(OLD_SUFFIX) and MIN_LEN_IN <= len(desc) <= MAX_LEN_IN:
            cands.append((idx, e))

    target = cands[PHASE2_SKIP: PHASE2_SKIP + PHASE2_LIMIT]

    results = []
    html_updates = json_updates = all4_full = 0
    by_category = {}
    for idx, e in target:
        slug = e["slug"]
        title = e.get("title", "")
        before = e["description"]
        after, cat = build_new_desc(slug, title, before)
        by_category[cat] = by_category.get(cat, 0) + 1

        html_path = REPO_ROOT / slug / "index.html"
        res = process_html(html_path, before, after, dry)
        hits = res.get("hits", {})
        all4 = all(hits.get(k, 0) >= 1 for k in ("meta", "og", "twitter", "jsonld"))

        if (not dry) and res["written"]:
            entries[idx]["description"] = after
            json_updates += 1
        if res["written"]:
            html_updates += 1
        if all4:
            all4_full += 1

        results.append({
            "slug": slug, "title": title,
            "before_desc": before, "before_len": len(before),
            "after_desc": after, "after_len": len(after),
            "category": cat, "hits": hits, "all4": all4,
            "html_written": res["written"], "error": res.get("error"),
        })

    if not dry and json_updates > 0:
        AI_INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "meta_desc_polish_phase2_report.md"
    json_path = OUT_DIR / "meta_desc_polish_phase2_result.json"

    avg_before = sum(r["before_len"] for r in results) / max(1, len(results))
    avg_after = sum(r["after_len"] for r in results) / max(1, len(results))

    buckets = {"<100": 0, "100-109": 0, "110-119": 0, "120-129": 0, "130-139": 0, "140-149": 0, "150+": 0}
    for r in results:
        L = r["after_len"]
        if L < 100: buckets["<100"] += 1
        elif L < 110: buckets["100-109"] += 1
        elif L < 120: buckets["110-119"] += 1
        elif L < 130: buckets["120-129"] += 1
        elif L < 140: buckets["130-139"] += 1
        elif L < 150: buckets["140-149"] += 1
        else: buckets["150+"] += 1

    lines = [
        "# meta description 改善 Phase 2 レポート（本命型 100件）",
        "",
        f"- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- モード: {'DRY-RUN' if dry else '本実行'}",
        f"- 候補総数: {len(cands)} / 対象: {len(target)} 件",
        "",
        "## 集計", "",
        "| 項目 | 値 |", "|---|---|",
        f"| HTML 書き換え | {html_updates}/{len(target)} |",
        f"| ai-site-index 更新 | {json_updates}/{len(target)} |",
        f"| 4箇所全置換 | {all4_full}/{len(target)} |",
        f"| before平均文字数 | {avg_before:.1f} |",
        f"| after 平均文字数 | {avg_after:.1f} |",
        "",
        "## カテゴリ別件数（リスク領域 + general）", "",
    ]
    for c, n in sorted(by_category.items(), key=lambda x: -x[1]):
        lines.append(f"- {c}: {n}件")
    lines.append("")
    lines.append("## after 文字数分布")
    lines.append("")
    for k, v in buckets.items():
        lines.append(f"- {k}: {v}件")
    lines.append("")
    lines.append("## サンプル先頭10件 before/after")
    lines.append("")
    for i, r in enumerate(results[:10], 1):
        lines.append(f"### {i}. {r['slug']} [{r['category']}]")
        lines.append(f"- title: {r['title']}")
        lines.append(f"- before({r['before_len']}字): {r['before_desc']}")
        lines.append(f"- after ({r['after_len']}字): {r['after_desc']}")
        lines.append("")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    payload = {
        "generated_at": datetime.now().isoformat(),
        "phase": "phase2-100",
        "mode": "dry-run" if dry else "execute",
        "candidates_total": len(cands),
        "target_count": len(target),
        "summary": {
            "html_updates": html_updates, "json_updates": json_updates,
            "all4_full": all4_full,
            "avg_before_len": round(avg_before, 2), "avg_after_len": round(avg_after, 2),
            "by_category": by_category, "length_buckets": buckets,
        },
        "results": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== Phase 2 {'DRY-RUN' if dry else 'EXECUTE'} 完了 ===")
    print(f"  HTML書き換え : {html_updates}/{len(target)}")
    print(f"  ai-site-index: {json_updates}/{len(target)}")
    print(f"  4箇所全置換  : {all4_full}/{len(target)}")
    print(f"  before平均   : {avg_before:.1f}")
    print(f"  after平均    : {avg_after:.1f}")
    print(f"  カテゴリ別   : {by_category}")
    print(f"  文字数分布   : {buckets}")
    print(f"  report       : {report_path}")
    print(f"  result.json  : {json_path}")


if __name__ == "__main__":
    main()
