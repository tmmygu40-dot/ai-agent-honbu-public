#!/usr/bin/env python3
# coding: utf-8
"""Phase 7-D description polish (100-109字 候補 451件、Phase 7-C 範囲超で残った薄帯).

Phase 7-B 案A継承。差分:
- ターゲット帯: 80 <= len(desc) < 100（1,529件）
- C1/C2 分割: hash(slug+"phase7d_split")%2 で安定分割（C1=734 / C2=795）
- base 平均 86字 → PAD_THRESHOLD = 100（base<71のみPAD適用で145超過を回避）
- EXPLANATION_PADS / GENERAL_VARIATIONS を各 50種 に拡張（TP-38 target/30 基準）
- twitter:description / JSON-LD description 欠落補完は継承
- 5箇所同期: meta / og / twitter / JSON-LD / ai-site-index

使い方:
  python apply_meta_desc_polish_phase7d.py --dry-run
  # (Phase 7-D は分割不要、--lane all のみで足りる)
"""
import json, re, os, sys, hashlib, argparse, datetime, collections

ROOT = os.path.dirname(os.path.abspath(__file__))
SITE_INDEX = os.path.join(ROOT, "ai-site-index.json")
REPORT_DIR = os.path.join(ROOT, "_public_audit")
OLD_SUFFIX = "スマホでも快適にご利用いただけます。"
NEW_SUFFIX = "無料・登録不要・スマホ対応。"
BENEFIT_TAIL = NEW_SUFFIX
PAD_THRESHOLD = 120  # base 平均 96字 → PAD はほぼ発火しない、自然圧縮
HARD_MAX = 145

# --- 50 EXPLANATION_PADS（短め優先で 145超過を回避） ---
EXPLANATION_PADS = [
    "結果はその場で表示されます。",
    "使い方はシンプルです。",
    "入力に応じて結果が変わります。",
    "短時間で結果が得られます。",
    "操作画面は分かりやすく整理されています。",
    "数値や条件を入れるだけで使えます。",
    "結果を見比べて参考にできます。",
    "初めての方でも迷わず使えます。",
    "結果の傾向を把握しやすい設計です。",
    "ボタン操作だけで完結します。",
    "詳細条件で結果を絞り込めます。",
    "再計算しやすく比較に向きます。",
    "目的に合わせた結果が表示されます。",
    "迷ったときの目安に使えます。",
    "結果は手早く確認できます。",
    "入力情報はその場で処理されます。",
    "選んだ条件に応じて変化します。",
    "結果の理由も併記されます。",
    "繰り返し試して傾向がつかめます。",
    "入力項目は最小限です。",
    "複数の観点から結果を示します。",
    "結果を保存・コピーできます。",
    "数字に強くなくても使えます。",
    "結果の意味も短く解説されます。",
    "状況の整理に便利です。",
    "目安を素早く知りたい時に役立ちます。",
    "結果は複数表示されることもあります。",
    "入力ごとに結果が更新されます。",
    "条件を変えながら比較できます。",
    "見直しもしやすい形にまとめられます。",
    "何度でも納得まで試せます。",
    "判断の入口として使えます。",
    "計算や判定が一気通貫で進みます。",
    "自分で説明しやすい形に整理されます。",
    "履歴は残らないので気兼ねなく試せます。",
    "目的の結果まで最短で到達できます。",
    "根拠が短文で添えられます。",
    "画面要素は絞り込まれています。",
    "似た条件を並べて比較できます。",
    "同じ条件なら同じ結果が得られます。",
    "判断の素材として活用できます。",
    "短い時間で結果に辿り着けます。",
    "見やすい表示で結果を確認できます。",
    "前提条件を変えると結果も変わります。",
    "繰り返しの確認にも向きます。",
    "選び直しの参考にも使えます。",
    "結果の幅を把握しやすい構成です。",
    "状況に合った結果に近づけられます。",
    "比較検討の前段階として便利です。",
    "結果は分かりやすく要約されます。",
]

# --- 50 GENERAL_VARIATIONS ---
GENERAL_VARIATIONS = [
    "判断材料のひとつとしてご活用ください。",
    "気軽に試しながら結果を確かめられます。",
    "実際の判断は専門家や公式情報もご確認ください。",
    "目安を素早く知りたいときに便利です。",
    "比較や検討の最初の一歩として使えます。",
    "計算や判定の手間を減らし、確認時間を短くできます。",
    "条件を変えながら結果の違いを試せます。",
    "結果の傾向を見ながら次の行動を考えられます。",
    "選択や入力に応じて結果を絞り込めます。",
    "おおまかな目安として日常の確認に使えます。",
    "細かい条件を加えることでより自分向けの結果になります。",
    "判断のとっかかりとして気軽に使える設計です。",
    "結果は参考値のため最終判断は公式情報でご確認ください。",
    "結果を見比べて選び方の傾向を知ることができます。",
    "短時間で結果に到達でき、繰り返し試しやすい構成です。",
    "数字や状況の整理を助け、考えを進めやすくします。",
    "気になる項目から自由に試して結果を確かめられます。",
    "結果の根拠は簡潔に示され、納得しながら確認できます。",
    "状況把握のための補助ツールとして利用できます。",
    "入力した内容はその場の判断材料として活用できます。",
    "目的別の確認に向くシンプルな計算・判定ツールです。",
    "短時間で必要な目安をつかみたい場面に向いています。",
    "結果を比較しやすく、選び直しもしやすい構成です。",
    "条件入力に応じて結果がすぐ更新され、納得まで試せます。",
    "結果は要点を絞った表現でまとめられています。",
    "判断や検討の補助として日常的に使いやすい設計です。",
    "確認の手間を減らし、考える時間を生み出します。",
    "シンプルな操作で結果に到達できるよう設計されています。",
    "結果の意味をつかみやすく、見直しにも使えます。",
    "気軽な確認用ツールとして、必要な時にすぐ使えます。",
    "結果を踏まえて次の行動を考える材料になります。",
    "選択肢を広げ、納得感のある判断を支えます。",
    "確認用としての軽快な動作が日々の利用に向きます。",
    "条件次第で結果の方向性が変わるので、状況に合わせやすい設計です。",
    "結果を見ながら考えを整理できます。",
    "目的に合う条件を試しながら答えを探せます。",
    "選んだ条件に対して即座に応答します。",
    "結果はその場限りの参照用です。",
    "判断の前段階として状況把握に役立ちます。",
    "結果はわかりやすい言葉で示されます。",
    "確認用に手元に置いておきたいツールです。",
    "短時間で見立てを得られる軽量設計です。",
    "目的に近い結果を絞りやすい構造です。",
    "意思決定の前準備として便利です。",
    "結果を共有しやすい形にまとめられます。",
    "気になる項目から自由に試せます。",
    "シンプルさを重視した確認用ツールです。",
    "結果の説明が短く添えられ、理解しやすい形です。",
    "繰り返しの利用にも耐える軽い設計です。",
    "選び直しを前提とした柔軟な構成です。",
]

# --- Risk categories (Phase 7-B 同一) ---
RISK_RULES = [
    ("税/相続",
     ["税", "相続", "贈与", "確定申告", "源泉徴収", "扶養控除", "ふるさと納税"],
     "税額や控除条件は最新の税法・自治体ルールに従ってください。",
     "税務判断や申告内容の最終確認は税理士・税務署にご相談ください。",
     ["税理士", "税務署"]),
    ("年金/社保/扶養",
     ["年金", "社保", "社会保険", "扶養", "厚生年金", "国民年金", "高額療養"],
     "計算結果は概算で、最終的な金額は公式情報や窓口でご確認ください。",
     "実際の判定は社会保険労務士または年金事務所にご相談ください。",
     ["社労士", "社会保険労務士", "年金事務所"]),
    ("投資/FIRE/NISA",
     ["NISA", "iDeCo", "投資", "FIRE", "資産形成", "ETF", "つみたて"],
     "数値はあくまで試算で、将来の運用成果を保証するものではありません。",
     "投資判断はご自身の責任で、必要に応じて金融専門家にご相談ください。",
     ["FP", "ファイナンシャルプランナー"]),
    ("労務/シフト",
     ["残業", "勤怠", "シフト", "労働時間", "有給", "休憩", "深夜割増"],
     "計算結果は目安で、就業規則や労使協定での確認が必要です。",
     "労務判断は社労士または労働基準監督署にご確認ください。",
     ["社労士", "社会保険労務士", "労働基準監督署"]),
    ("医療/症状/服薬",
     ["症状", "服薬", "薬", "受診", "病院", "診察", "発熱", "頭痛", "アレルギー"],
     "結果は受診の目安であり、診断や治療を行うものではありません。",
     "気になる症状がある場合は早めに医師・薬剤師にご相談ください。",
     ["医師", "薬剤師"]),
    ("保険",
     ["保険", "医療保険", "生命保険", "自動車保険", "火災保険", "瑕疵"],
     "結果は一般的な目安で、契約条件は約款の規定をご確認ください。",
     "実際の加入判断は保険会社またはFPにご相談ください。",
     ["保険会社", "FP", "ファイナンシャルプランナー"]),
    ("心理/不安/依存",
     ["メンタル", "不安", "ストレス", "依存", "気分", "睡眠"],
     "結果は自己理解の参考であり、医学的診断ではありません。",
     "気になる状態が続くときは早めに専門家へご相談ください。",
     ["カウンセラー", "精神科医", "メンタルヘルス専門家"]),
    ("法律/契約",
     ["契約", "賃貸", "離婚", "相続", "示談", "退職"],
     "結果は一般的な解説で、個別事情には適用できない場合があります。",
     "具体的な対応は弁護士または行政書士にご相談ください。",
     ["弁護士", "行政書士"]),
    ("介護",
     ["介護", "要介護", "ケアマネ", "デイサービス", "在宅介護"],
     "結果は判断の参考であり、認定や利用判定とは異なります。",
     "実際の介護判断はケアマネジャーや地域包括支援センターにご相談ください。",
     ["ケアマネジャー", "ケアマネ", "地域包括支援センター"]),
]


def stable_idx(slug, salt, mod):
    h = hashlib.sha256((slug + "|" + salt).encode("utf-8")).hexdigest()
    return int(h, 16) % mod


def lane_of(slug):
    return "c1" if stable_idx(slug, "phase7d_split", 2) == 0 else "c2"


def classify_risk(title, base):
    for cat, kws, intro, advisory, experts in RISK_RULES:
        for kw in kws:
            if kw in title or kw in base:
                return cat, intro, advisory, experts
    return None, None, None, None


def strip_suffix(desc):
    if desc.endswith(OLD_SUFFIX):
        return desc[: -len(OLD_SUFFIX)].rstrip(" 　")
    if desc.endswith(BENEFIT_TAIL):
        return desc[: -len(BENEFIT_TAIL)].rstrip(" 　")
    return desc


def ensure_period(s):
    if not s: return s
    if s[-1] in "。！？.!?": return s
    return s + "。"


def build_new_desc(slug, title, old_desc):
    base = ensure_period(strip_suffix(old_desc))
    cat, intro, advisory, experts = classify_risk(title, base)
    if cat:
        already_expert = any(e in base for e in experts)
        if already_expert:
            tail_part = intro
        else:
            tail_part = intro + advisory
        for e in experts:
            if tail_part.count(e) >= 2:
                tail_part = advisory
                break
        cat_effective = cat
    else:
        tail_part = GENERAL_VARIATIONS[stable_idx(slug, "var", len(GENERAL_VARIATIONS))]
        cat_effective = "general"

    estimated = len(base) + len(tail_part) + len(BENEFIT_TAIL)
    pad_used = False
    pad_idx = -1
    if estimated < PAD_THRESHOLD:
        pad_idx = stable_idx(slug, "pad", len(EXPLANATION_PADS))
        pad = EXPLANATION_PADS[pad_idx]
        new = base + pad + tail_part + BENEFIT_TAIL
        pad_used = True
    else:
        new = base + tail_part + BENEFIT_TAIL

    if len(new) > HARD_MAX and pad_used:
        new = base + tail_part + BENEFIT_TAIL
        pad_used = False
    if len(new) > HARD_MAX and cat_effective != "general" and intro:
        new = base + intro + BENEFIT_TAIL
    if len(new) > HARD_MAX:
        # 最終手段: tail_part を捨てる
        new = base + BENEFIT_TAIL
    return new, cat_effective, pad_used, pad_idx


PAT_META = re.compile(r'(<meta name="description" content=")([^"]*)(")')
PAT_OG   = re.compile(r'(<meta property="og:description" content=")([^"]*)(")')
PAT_TW   = re.compile(r'(<meta name="twitter:description" content=")([^"]*)(")')
PAT_LD   = re.compile(r'("description"\s*:\s*")([^"]*?)(")')
LD_BLOCK = re.compile(r'(<script type="application/ld\+json">)([\s\S]*?)(</script>)')


def try_inject_jsonld_desc(html, new_desc):
    injected = {"count": 0}
    def block_repl(mm):
        body = mm.group(2)
        if not re.search(r'"@type"\s*:\s*"SoftwareApplication"', body): return mm.group(0)
        if re.search(r'"description"\s*:', body): return mm.group(0)
        nm = re.search(r'("name"\s*:\s*"[^"]*")', body)
        if not nm: return mm.group(0)
        esc = new_desc.replace("\\", "\\\\").replace('"', '\\"')
        insertion = nm.group(1) + ', "description": "' + esc + '"'
        new_body = body.replace(nm.group(1), insertion, 1)
        injected["count"] += 1
        return mm.group(1) + new_body + mm.group(3)
    new_html, _ = LD_BLOCK.subn(block_repl, html, count=1)
    return new_html, injected["count"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--lane", choices=["all"], default="all")
    ap.add_argument("--limit", type=int, default=0)
    args = ap.parse_args()
    mode = "dry-run" if args.dry_run else "execute"

    with open(SITE_INDEX, "r", encoding="utf-8") as f:
        site = json.load(f)
    entries = site["entries"]

    candidates = []
    for e in entries:
        d = e.get("description") or ""
        if 100 <= len(d) < 110:
            if args.lane == "all" or lane_of(e["slug"]) == args.lane:
                candidates.append(e)
    if args.limit: candidates = candidates[: args.limit]

    results = []
    summary = collections.Counter()
    cat_counter = collections.Counter()
    pad_counter = collections.Counter()
    len_buckets = collections.Counter()
    twitter_inject_count = 0
    jsonld_inject_count = 0

    for e in candidates:
        slug = e["slug"]; title = e["title"]; old_desc = e["description"]
        new_desc, cat, pad_used, pad_idx = build_new_desc(slug, title, old_desc)
        cat_counter[cat] += 1
        if pad_used: pad_counter[pad_idx] += 1
        L = len(new_desc)
        if L < 100: len_buckets["<100"] += 1
        elif L < 110: len_buckets["100-109"] += 1
        elif L < 120: len_buckets["110-119"] += 1
        elif L < 130: len_buckets["120-129"] += 1
        elif L < 140: len_buckets["130-139"] += 1
        elif L <= 145: len_buckets["140-145"] += 1
        else: len_buckets["146+"] += 1
        if L < 100: summary["under100"] += 1
        if L > 145: summary["over145"] += 1

        rec = {"slug": slug, "title": title, "lane": lane_of(slug),
               "before": old_desc, "before_len": len(old_desc),
               "after": new_desc, "after_len": L,
               "category": cat, "pad_used": pad_used, "pad_idx": pad_idx,
               "html_written": False, "all4": False, "hits": {},
               "twitter_injected": False, "twitter_inject_planned": False,
               "jsonld_injected": False, "jsonld_inject_planned": False,
               "error": None}

        html_p = os.path.join(ROOT, slug, "index.html")
        if not os.path.isfile(html_p):
            rec["error"] = "html-missing"
        else:
            with open(html_p, "r", encoding="utf-8") as f: txt = f.read()
            m = PAT_META.search(txt)
            if not m: rec["error"] = "no-meta-desc"
            elif m.group(2) != old_desc:
                rec["error"] = "html-json-mismatch"; rec["html_desc"] = m.group(2)
            else:
                new_txt, c1 = PAT_META.subn(lambda mm: mm.group(1)+new_desc+mm.group(3), txt, count=1)
                new_txt, c2 = PAT_OG.subn(lambda mm: mm.group(1)+new_desc+mm.group(3) if mm.group(2)==old_desc else mm.group(0), new_txt, count=1)
                new_txt, c3 = PAT_TW.subn(lambda mm: mm.group(1)+new_desc+mm.group(3) if mm.group(2)==old_desc else mm.group(0), new_txt, count=1)
                if c3 == 0 and c2 >= 1:
                    og_line_pat = re.compile(r'(<meta property="og:description" content="[^"]*"\s*/?>\n?)')
                    def og_insert(mm):
                        og_line = mm.group(1)
                        tw_line = f'  <meta name="twitter:description" content="{new_desc}" />\n'
                        return og_line + tw_line
                    new_txt, c3_inj = og_line_pat.subn(og_insert, new_txt, count=1)
                    if c3_inj >= 1:
                        c3 = 1
                        rec["twitter_inject_planned"] = True
                        twitter_inject_count += 1
                        if not args.dry_run: rec["twitter_injected"] = True
                def ld_repl(mm):
                    if mm.group(2) == old_desc:
                        return mm.group(1)+new_desc+mm.group(3)
                    return mm.group(0)
                new_txt, c4 = PAT_LD.subn(ld_repl, new_txt, count=1)
                if c4 == 0:
                    new_txt2, inj = try_inject_jsonld_desc(new_txt, new_desc)
                    if inj >= 1:
                        new_txt = new_txt2; c4 = 1
                        rec["jsonld_inject_planned"] = True
                        jsonld_inject_count += 1
                        if not args.dry_run: rec["jsonld_injected"] = True
                hits = {"meta": c1, "og": c2, "twitter": c3, "jsonld": c4}
                rec["hits"] = hits
                rec["all4"] = all(v >= 1 for v in hits.values())
                if not args.dry_run and rec["all4"]:
                    with open(html_p, "w", encoding="utf-8") as f: f.write(new_txt)
                    rec["html_written"] = True
        results.append(rec)

    json_updated = 0
    if not args.dry_run:
        slug_to_new = {r["slug"]: r["after"] for r in results if r["all4"]}
        for e in entries:
            if e["slug"] in slug_to_new:
                e["description"] = slug_to_new[e["slug"]]; json_updated += 1
        if json_updated:
            with open(SITE_INDEX, "w", encoding="utf-8") as f:
                json.dump(site, f, ensure_ascii=False, indent=2)

    avg_before = sum(r["before_len"] for r in results)/len(results) if results else 0
    avg_after  = sum(r["after_len"]  for r in results)/len(results) if results else 0
    all4 = sum(1 for r in results if r["all4"])
    errors = collections.Counter(r["error"] for r in results if r["error"])

    all_experts = ["税理士","税務署","社労士","社会保険労務士","年金事務所","労働基準監督署",
                   "FP","ファイナンシャルプランナー","弁護士","行政書士","医師","薬剤師",
                   "保険会社","カウンセラー","精神科医","メンタルヘルス専門家",
                   "ケアマネジャー","ケアマネ","地域包括支援センター"]
    dup_experts = []
    for r in results:
        for e in all_experts:
            if r["after"].count(e) >= 2:
                dup_experts.append((r["slug"], e)); break

    print(f"=== Phase 7-D lane={args.lane} {'DRY-RUN' if args.dry_run else 'EXECUTE'} 完了 ===")
    print(f"  対象候補件数        : {len(candidates)}")
    print(f"  HTML書き換え件数    : {sum(1 for r in results if r['html_written'])}/{len(results)}")
    print(f"  4箇所全置換 (all4)  : {all4}/{len(results)}")
    print(f"  json更新件数        : {json_updated}")
    print(f"  before平均文字数    : {avg_before:.1f}")
    print(f"  after 平均文字数    : {avg_after:.1f}")
    print(f"  100字未満           : {summary['under100']}")
    print(f"  145字超過           : {summary['over145']}")
    print(f"  PAD適用件数         : {sum(1 for r in results if r['pad_used'])}")
    print(f"  カテゴリ別          : {dict(cat_counter)}")
    print(f"  文字数分布          : {dict(len_buckets)}")
    print(f"  PAD偏り上位5        : {pad_counter.most_common(5)}")
    print(f"  twitter挿入予定     : {twitter_inject_count}")
    print(f"  jsonld挿入予定      : {jsonld_inject_count}")
    print(f"  エラー内訳          : {dict(errors)}")
    print(f"  同専門家2回検出     : {len(dup_experts)}")
    for s, e in dup_experts[:5]: print(f"    - {s}: {e}")

    os.makedirs(REPORT_DIR, exist_ok=True)
    out = {
        "generated_at": datetime.datetime.now().isoformat(),
        "phase": f"phase7c-80-99-{args.lane}",
        "mode": mode, "lane": args.lane,
        "candidates_total": len(candidates),
        "summary": {
            "all4_full": all4, "json_updated": json_updated,
            "avg_before_len": round(avg_before, 2),
            "avg_after_len":  round(avg_after, 2),
            "by_category": dict(cat_counter),
            "length_buckets": dict(len_buckets),
            "pad_used": sum(1 for r in results if r["pad_used"]),
            "pad_top5_idx": pad_counter.most_common(5),
            "under100_count": summary["under100"], "over145_count":  summary["over145"],
            "errors": dict(errors), "double_expert_count": len(dup_experts),
            "twitter_inject_planned": twitter_inject_count,
            "jsonld_inject_planned": jsonld_inject_count,
        },
        "results": results,
    }
    rep_json = os.path.join(REPORT_DIR, f"meta_desc_polish_phase7d_{args.lane}_result.json")
    with open(rep_json, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"  result.json         : {rep_json}")


if __name__ == "__main__":
    main()
