#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
apply_meta_desc_polish_phase6.py - 既存アプリ meta description 改善 Phase 6（<80字帯 904件）

Phase 1-5 で旧suffix 80-100字帯 1,481件を改善完了。Phase 6 は <80字帯 904件を対象。
base が極端に短く（平均48.4字）AI量産テンプレ（「選択や入力するだけで結果をすぐ確認できるツールです。」）
を含むため、 expansion padding + tail variation で 110-130字帯へ引き上げる。

戦略（Phase 5 + Phase 6新規）:
- base 維持
- 中央 EXPLANATION_PAD（15種・25-35字）を adaptive に追加
- tail = variation（general）or advisory（risk）（Phase 5 同等）
- BENEFIT_TAIL 維持
- PAD 適用閾値: base + tail + benefit < 110 なら PAD 追加

5箇所同期: meta / og / twitter / JSON-LD / ai-site-index.json
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

# Phase 6 は <80字帯
MIN_LEN_IN = 0
MAX_LEN_IN = 79
PHASE6_SKIP = 0
PHASE6_LIMIT = 1000  # 全件処理（実候補数は 904）

PATTERNS = [
    ("meta", re.compile(r'(<meta\s+name=["\']description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("og", re.compile(r'(<meta\s+property=["\']og:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("twitter", re.compile(r'(<meta\s+name=["\']twitter:description["\']\s+content=")([^"\']+)(")', re.IGNORECASE)),
    ("jsonld", re.compile(r'("description"\s*:\s*")([^"]+)(")')),
]

RISK_RULES = [
    ("税/相続",
     re.compile(r'税|相続|遺産|贈与|ふるさと納税|確定申告|消費税|源泉|住民税|所得税|事業税|固定資産税|法人税|印紙税|登録免許税'),
     "算出結果は目安です。",
     "税務判断や申告内容の最終確認は税理士・税務署にご相談ください。",
     ["税理士", "税務署"]),
    ("年金/社保/扶養",
     re.compile(r'年金|社保|社会保険|厚生年金|国民年金|扶養|国保|健保|106万|130万|150万|201万|103万|被保険者|遺族年金|障害年金|老齢年金'),
     "判定結果は目安です。",
     "最終確認は社労士・年金事務所にご相談ください。",
     ["社労士", "年金事務所"]),
    ("投資/FIRE/NISA",
     re.compile(r'NISA|iDeCo|FIRE|投資|資産運用|株式|債券|REIT|配当|複利|積立|信託'),
     "試算結果は目安です。",
     "判断前にファイナンシャルプランナー等の専門家へご確認ください。",
     ["ファイナンシャルプランナー", "FP"]),
    ("医療/症状/服薬",
     re.compile(r'医療|症状|血圧|血糖|服薬|薬|通院|診察|発熱|頭痛|腹痛|アレルギー|ワクチン|予防接種|カロリー|BMI|体温|栄養素|食事制限'),
     "算出結果は目安です。",
     "医療上の判断は医師・薬剤師にご相談ください。",
     ["医師", "薬剤師"]),
    ("心理/不安/依存",
     re.compile(r'心理|不安|うつ|依存|ストレス|メンタル|燃え尽き|HSP|睡眠の質'),
     "診断結果は目安です。",
     "気になる場合はメンタルヘルス専門家にご相談ください。",
     ["メンタルヘルス専門家"]),
    ("法律/契約",
     re.compile(r'法律|契約|遺言|離婚|労働基準|労基|借地借家|消費者法'),
     "判定結果は目安です。",
     "法的判断は弁護士・行政書士等の専門家にご確認ください。",
     ["弁護士", "行政書士"]),
    ("保険",
     re.compile(r'保険|生命保険|医療保険|火災保険|自動車保険|地震保険'),
     "試算結果は目安です。",
     "保険の最適化は保険会社・FP等の専門家にご相談ください。",
     ["保険会社", "FP", "ファイナンシャルプランナー"]),
    ("介護",
     re.compile(r'介護|要介護|デイサービス|ケアマネ|地域包括'),
     "計画は目安です。",
     "詳細はケアマネジャー・自治体窓口にご相談ください。",
     ["ケアマネ"]),
    ("労務/シフト",
     re.compile(r'労務|雇用|勤怠|シフト|残業|有給|休暇|給与|賃金|時給|最低賃金'),
     "判定結果は目安です。",
     "労務判断は社労士または労働基準監督署にご確認ください。",
     ["社労士", "労働基準監督署"]),
]

# 一般領域 variation（Phase 5 と同じ 18種）
GENERAL_VARIATIONS = [
    "結果をコピーして、そのまま投稿準備や記録整理に使えます。",
    "入力内容を整理し、日々の確認や作業メモにそのまま活用できます。",
    "短時間で結果を確認でき、スマホからでも手軽に見直せます。",
    "比較や整理に使いやすく、必要な情報をすばやく確認できます。",
    "結果を保存・共有しやすく、日常の小さな判断を補助します。",
    "入力から結果表示までスムーズで、空き時間にもサッと使えます。",
    "そのままコピーや保存ができ、毎日の確認作業に役立ちます。",
    "シンプルな操作で結果を整理でき、必要な時にすぐ確認できます。",
    "結果はわかりやすく表示され、見比べや振り返りにも活用できます。",
    "毎日の小さな確認や記録整理を手早く済ませるのに向いています。",
    "気になった時にサッと確認でき、迷ったときの判断材料に使えます。",
    "結果を一覧で見られるので、状況把握や記録の整理にも便利です。",
    "短い入力でわかりやすい結果が出るので、振り返りにも使いやすい設計です。",
    "結果はそのまま共有・保存でき、後から見返したい時にも役立ちます。",
    "選ぶだけで答えが出る簡易設計で、忙しい合間にも気軽に使えます。",
    "情報を整理して見やすく表示するので、メモ代わりにも使えます。",
    "数値や条件を入れるとすぐ結果が返り、判断の補助に向いています。",
    "結果を後から確認しやすい形でまとめ、用途に応じて柔軟に活用できます。",
]

# Phase 6 新規: 中央 EXPLANATION_PAD（18種・25-35字）
# 用途は base と variation の中間を埋める「使い方の補足」
EXPLANATION_PADS = [
    "日々の確認や記録の整理に役立ち、判断の前準備としても活用できます。",
    "結果はそのままコピーや保存ができ、後から見返したい時にも便利です。",
    "短時間で結果が出るので、空き時間にもサッと使えて続けやすい設計です。",
    "条件を変えて何度も試せるため、複数パターンの比較や検討にも向いています。",
    "気になった時にすぐ確認でき、迷ったときの判断材料として日常的に活用できます。",
    "数値や項目の整理がしやすく、メモ代わりや状況把握にも使えます。",
    "結果はわかりやすく表示され、見比べや振り返りの参考にも活用できます。",
    "使い方はシンプルで、初めての方でも迷わず操作できる構成になっています。",
    "目的に応じて情報を整理でき、判断や記録のサポートとして役立ちます。",
    "結果を見やすくまとめるので、自分用の確認や家族との共有にも便利です。",
    "思い立った時にすぐ使え、毎日の小さな判断や確認に向いた軽量ツールです。",
    "数値や状況を整理した形で表示するので、判断の参考材料として使えます。",
    "忙しい合間でも操作しやすく、必要な情報をすばやく確認できる設計です。",
    "気軽に試せる軽い操作感で、日常のちょっとした疑問の整理に向いています。",
    "結果は後から見返しやすい形にまとまるので、記録代わりにも活用できます。",
    "シンプル設計で、必要な情報を素早く整理したい場面で力を発揮します。",
    "複数パターンを試して比較でき、選択前の事前確認にも向いた構成です。",
    "日々のルーティーンや確認作業を効率化したい時に手軽に取り入れられます。",
]

RE_HAS_MEYASU_TAIL = re.compile(r'(目安|参考|概算|として参考|参考にして|参考にしてください)')

# PAD 適用閾値: base + tail + benefit < この値 なら PAD追加
PAD_THRESHOLD = 110


def strip_suffix(desc: str) -> str:
    base = desc[:-len(OLD_SUFFIX)] if desc.endswith(OLD_SUFFIX) else desc
    if not base.endswith("。"):
        base += "。"
    return base


def classify_risk(title: str, base: str):
    text = title + " " + base
    for rule in RISK_RULES:
        cat, pat, intro, advisory, experts = rule
        if pat.search(text):
            return cat, intro, advisory, experts
    return None, None, None, None


def build_new_desc(slug: str, title: str, old_desc: str):
    base = strip_suffix(old_desc)
    cat, intro, advisory, experts = classify_risk(title, base)

    # tail 部分（advisory or variation）を先に決める
    if cat:
        tail_check = base[-25:] if len(base) > 25 else base
        skip_intro = bool(RE_HAS_MEYASU_TAIL.search(tail_check))
        expert_in_base = any(exp in base for exp in (experts or []))
        if expert_in_base:
            # 専門家既出 → advisory skip → general variation で代替
            tail_part = GENERAL_VARIATIONS[hash(slug) % len(GENERAL_VARIATIONS)]
            cat_effective = "general"
        else:
            tail_part = advisory if skip_intro else (intro + advisory)
            cat_effective = cat
    else:
        tail_part = GENERAL_VARIATIONS[hash(slug) % len(GENERAL_VARIATIONS)]
        cat_effective = "general"

    # PAD 適用判定
    estimated = len(base) + len(tail_part) + len(BENEFIT_TAIL)
    if estimated < PAD_THRESHOLD:
        # 短い → PAD を中央に追加
        pad = EXPLANATION_PADS[hash(slug + "_pad") % len(EXPLANATION_PADS)]
        new = base + pad + tail_part + BENEFIT_TAIL
        pad_used = True
    else:
        new = base + tail_part + BENEFIT_TAIL
        pad_used = False

    return new, cat_effective, pad_used


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
        if desc.endswith(OLD_SUFFIX) and len(desc) < 80:
            cands.append((idx, e))

    target = cands[PHASE6_SKIP: PHASE6_SKIP + PHASE6_LIMIT]

    results = []
    html_updates = json_updates = all4_full = 0
    by_category = {}
    pad_used_count = 0
    double_expert_count = 0
    over145_count = 0
    under100_count = 0

    for idx, e in target:
        slug = e["slug"]
        title = e.get("title", "")
        before = e["description"]
        after, cat, pad_used = build_new_desc(slug, title, before)
        by_category[cat] = by_category.get(cat, 0) + 1
        if pad_used:
            pad_used_count += 1

        for cat_rule in RISK_RULES:
            for exp in cat_rule[4]:
                if after.count(exp) >= 2:
                    double_expert_count += 1
                    break
        if len(after) > 145:
            over145_count += 1
        if len(after) < 100:
            under100_count += 1

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
            "category": cat, "pad_used": pad_used,
            "hits": hits, "all4": all4,
            "html_written": res["written"], "error": res.get("error"),
        })

    if not dry and json_updates > 0:
        AI_INDEX.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    report_path = OUT_DIR / "meta_desc_polish_phase6_report.md"
    json_path = OUT_DIR / "meta_desc_polish_phase6_result.json"

    avg_before = sum(r["before_len"] for r in results) / max(1, len(results))
    avg_after = sum(r["after_len"] for r in results) / max(1, len(results))

    buckets = {"<100": 0, "100-109": 0, "110-119": 0, "120-129": 0, "130-139": 0, "140-145": 0, "146+": 0}
    for r in results:
        L = r["after_len"]
        if L < 100: buckets["<100"] += 1
        elif L < 110: buckets["100-109"] += 1
        elif L < 120: buckets["110-119"] += 1
        elif L < 130: buckets["120-129"] += 1
        elif L < 140: buckets["130-139"] += 1
        elif L <= 145: buckets["140-145"] += 1
        else: buckets["146+"] += 1

    lines = [
        "# meta description 改善 Phase 6 レポート（<80字帯 904件）",
        "",
        f"- 実行日時: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        f"- モード: {'DRY-RUN' if dry else '本実行'}",
        f"- 候補総数: {len(cands)} / 対象: {len(target)} 件",
        f"- PAD 適用件数: {pad_used_count} / {len(target)} (PAD閾値 {PAD_THRESHOLD}字)",
        "",
        "## 集計", "",
        "| 項目 | 値 |", "|---|---|",
        f"| HTML 書き換え | {html_updates}/{len(target)} |",
        f"| ai-site-index 更新 | {json_updates}/{len(target)} |",
        f"| 4箇所全置換 | {all4_full}/{len(target)} |",
        f"| before 平均文字数 | {avg_before:.1f} |",
        f"| **after 平均文字数** | **{avg_after:.1f}** |",
        f"| PAD 適用 | {pad_used_count} |",
        f"| 同専門家2回検出 | {double_expert_count} |",
        f"| 100字未満 | {under100_count} |",
        f"| 145字超過 | {over145_count} |",
        "",
        "## カテゴリ別件数",
    ]
    for c, n in sorted(by_category.items(), key=lambda x: -x[1]):
        lines.append(f"- {c}: {n}件")
    lines.append("")
    lines.append("## after 文字数分布")
    for k, v in buckets.items():
        lines.append(f"- {k}: {v}件")
    lines.append("")
    lines.append("## サンプル先頭15件")
    for i, r in enumerate(results[:15], 1):
        lines.append(f"### {i}. {r['slug']} [{r['category']}, pad={r['pad_used']}]")
        lines.append(f"- title: {r['title']}")
        lines.append(f"- before({r['before_len']}字): {r['before_desc']}")
        lines.append(f"- after ({r['after_len']}字): {r['after_desc']}")
        lines.append("")

    report_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    payload = {
        "generated_at": datetime.now().isoformat(),
        "phase": "phase6-904",
        "mode": "dry-run" if dry else "execute",
        "candidates_total": len(cands),
        "target_count": len(target),
        "pad_threshold": PAD_THRESHOLD,
        "summary": {
            "html_updates": html_updates, "json_updates": json_updates,
            "all4_full": all4_full,
            "avg_before_len": round(avg_before, 2), "avg_after_len": round(avg_after, 2),
            "by_category": by_category,
            "length_buckets": buckets,
            "pad_used": pad_used_count,
            "double_expert_count": double_expert_count,
            "over145_count": over145_count,
            "under100_count": under100_count,
        },
        "results": results,
    }
    json_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"=== Phase 6 {'DRY-RUN' if dry else 'EXECUTE'} 完了 ===")
    print(f"  HTML書き換え       : {html_updates}/{len(target)}")
    print(f"  ai-site-index更新  : {json_updates}/{len(target)}")
    print(f"  4箇所全置換        : {all4_full}/{len(target)}")
    print(f"  before平均         : {avg_before:.1f}")
    print(f"  after 平均         : {avg_after:.1f}")
    print(f"  PAD 適用           : {pad_used_count}")
    print(f"  カテゴリ別         : {by_category}")
    print(f"  文字数分布         : {buckets}")
    print(f"  100字未満          : {under100_count}")
    print(f"  145字超過          : {over145_count}")
    print(f"  同専門家2回検出    : {double_expert_count}")


if __name__ == "__main__":
    main()
