# JSONLD_AUTO_INJECTION_PLAN.md
# ネコポケ JSON-LD 自動注入 設計・テスト計画書

作成: 2026-05-13
対象: ai-agent-honbu-public（public repo）
ステータス: 設計書のみ。実装・変更はまだ行わない。

---

## 1. JSON-LD を入れる目的

### Google / AI 検索への構造的な情報伝達

| 効果 | 内容 |
|---|---|
| アプリ用途の明示 | 「BMI計算ツール」「税計算機」など機能を機械的に識別させる |
| 無料Webアプリの明示 | `offers.price: 0` / `isAccessibleForFree: true` で課金不要を示す |
| AI検索の引用精度向上 | ChatGPT / Perplexity 等が正確なアプリ情報を取得しやすくなる |
| FAQ の強調表示 | Googleの検索結果でFAQアコーディオンが出る可能性 |
| canonical との整合 | `url` フィールドを canonical と一致させることで正規URL確定 |

### なぜ canonical の次か

canonical → URL正規化（どのURLを正規とするか）
JSON-LD    → コンテンツ正規化（そのURLに何があるか）

この順番で実装することで canonical と JSON-LD の `url` を確実に一致させられる。

---

## 2. 対象スキーマ候補

### 優先度 A（最初に入れる）: SoftwareApplication

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{title}}",
  "description": "{{meta description}}",
  "url": "{{canonical URL}}",
  "applicationCategory": "WebApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "inLanguage": "ja",
  "isAccessibleForFree": true,
  "publisher": {
    "@type": "Organization",
    "name": "ネコポケ",
    "url": "https://nekopoke.jp/"
  }
}
```

**理由**: 全1,337件に一律適用可能。構造がシンプル。FAQの有無に依存しない。

### 優先度 B（将来）: FAQPage

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "{{質問文}}",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "{{回答文}}"
      }
    }
  ]
}
```

**条件**: FAQ セクションが構造化されているアプリのみ。全件対応は別途調査。
サンプル調査: 30件中29件に「FAQ」または「よくある質問」パターンが存在。

### 優先度 C（将来）: BreadcrumbList

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type": "ListItem", "position": 1, "name": "ネコポケ", "item": "https://nekopoke.jp/"},
    {"@type": "ListItem", "position": 2, "name": "{{title}}", "item": "{{canonical URL}}"}
  ]
}
```

### 優先度 D（将来）: WebPage

SoftwareApplication と組み合わせることで、ページ自体の情報も補完できる。
最初のバッチには含めない。

---

## 3. ネコポケ向け基本 JSON-LD テンプレート

```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "{{TITLE}}",
  "description": "{{DESCRIPTION}}",
  "url": "{{CANONICAL_URL}}",
  "applicationCategory": "WebApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "JPY"
  },
  "inLanguage": "ja",
  "isAccessibleForFree": true,
  "publisher": {
    "@type": "Organization",
    "name": "ネコポケ",
    "url": "https://nekopoke.jp/"
  }
}
</script>
```

### フィールド取得方針

| フィールド | 取得元 | フォールバック |
|---|---|---|
| name | `<title>` タグ内テキスト | ディレクトリ名 |
| description | `<meta name="description" content="...">` | `""` 空文字（省略） |
| url | `<link rel="canonical" href="...">` | `[Uri]::EscapeDataString($dir.Name)` で生成 |
| publisher.name | 固定: `ネコポケ` | — |

**注意**: `description` が空文字になる場合は JSON-LD に含めない（不正確な値より省略を優先）。

---

## 4. URL ルール

```
canonical URL = https://nekopoke.jp/{[Uri]::EscapeDataString($dir.Name)}/
JSON-LD url   = 同じ値（canonical から読み取る）
sitemap <loc> = 同じ値
```

### 一致確認の実装例

```powershell
$canonicalMatch = [regex]::Match($html, 'rel="canonical"\s+href="([^"]+)"')
$canonicalUrl   = $canonicalMatch.Groups[1].Value
# → これをそのまま JSON-LD の "url" に使う
```

ハードコードや再生成をしない。**必ず HTML 内の canonical から読み取る**ことで三者一致を保証する。

---

## 5. 注入位置ルール

### 挿入位置

`</head>` タグの直前（canonical タグの直後が理想）：

```html
  <link rel="canonical" href="https://nekopoke.jp/アプリ名/">
  <script type="application/ld+json">
  { ... }
  </script>
</head>
```

### 技術実装方針（canonical 注入 v2 と同方式）

```powershell
$lowerHtml = $html.ToLower()
$closeHead = $lowerHtml.IndexOf('</head>')
$newHtml   = $html.Substring(0, $closeHead) + $scriptBlock + $html.Substring($closeHead)
```

regex replace は**使わない**（canonical 注入 v1 の反省から）。

### 既存 JSON-LD がある場合

現状調査: サンプル30件中0件が `application/ld+json` を保有。
→ スキップ条件: `$html -match 'application/ld\+json'` で既存チェック。
→ 既存ありの場合は**スキップ（上書き禁止）**。

---

## 6. 除外条件（スキップする場合）

| 条件 | 理由 |
|---|---|
| `<head>` なし | 挿入位置不明 |
| `</head>` なし | 挿入位置不明 |
| `<title>` なし | `name` フィールドが作れない |
| canonical なし | `url` フィールドの信頼できる取得元がない |
| `application/ld+json` 既存あり | 重複・上書き防止 |
| ファイルサイズ 0 bytes | 空ファイル保護 |
| ファイルサイズ 2MB 超 | 異常ファイル除外 |
| `_` / `.` 始まりのディレクトリ | 内部管理・隠しディレクトリ除外 |

**meta description なし**: スキップしない。`description` フィールドを省略して注入する。
サンプル調査: 30件中5件（約17%）が description なし → この対応は必須。

---

## 7. 10件テスト計画

### 対象選定条件

- canonical 注入済みであること（url フィールド取得のため）
- title あること
- meta description の有無は問わない（両パターンを含める）
- 英数字ディレクトリ / 日本語ディレクトリ を混在させる

### テスト手順

**Step 1: 対象10件の選定**（スクリプト実行前に手動確認）

**Step 2: dry-run 実施（変更なし）**
- `-DryRun` フラグで「何を追加するか」だけ出力
- JSON-LD の内容をコンソールで確認

**Step 3: 10件のみ本実行**

**Step 4: 10件検証（すべてPASSであること）**

| チェック項目 | 確認方法 |
|---|---|
| 先頭バイト 0x3C | `ReadAllBytes()[0]` |
| DOCTYPE 無傷 | `$html -match '(?i)<!DOCTYPE'` |
| JSON パース可能 | `ConvertFrom-Json` でエラーなし |
| `url` が canonical・sitemap と一致 | 三者比較 |
| `application/ld+json` が1つだけ | regex カウント |
| `git diff` が JSON-LD 追加のみ | 目視確認 |
| canonical タグが消えていない | `$html -match 'rel="canonical"'` |

**Step 5: 兄貴確認 → OK なら 100件バッチへ**

### 10件テスト時の危険ポイント

| 危険 | 対策 |
|---|---|
| JSON 内の日本語文字列がエスケープ不足 | PowerShell の `ConvertTo-Json` を使わず手動テンプレに日本語を直接埋め込む（UTF-8 で書き出すため不要） |
| title に `"` や `<` が含まれる | 埋め込み前に `$val -replace '"','\"' -replace '<','&lt;'` でエスケープ |
| canonical の末尾スラッシュなし | 既に全件 `https://nekopoke.jp/.../` 形式で注入済みなので問題なし |
| `</head>` が複数存在する HTML | `IndexOf` は最初の一致のみ → 上に body コンテンツがある異常HTMLだが、先頭チェックで検出可能 |
| 注入後に先頭バイトが変わる | canonical v2 と同じ安全チェック: `$html[0] -ne $newHtml[0]` で abort |
| JSON-LD が2個入ってしまう | 注入前に `application/ld+json` 存在チェック必須 |

---

## 8. 将来の全件展開ルート

| フェーズ | 件数 | 条件 |
|---|---|---|
| テスト | 10件 | 英数字・日本語混在、description有無混在 |
| バッチ1 | 100件 | 10件PASS後 |
| バッチ2 | 300件 | 100件PASS後 |
| バッチ3 | 500件 | 300件PASS後 |
| 残り全件 | 約427件 | 500件PASS後 |

各バッチ: 注入 → 検証（先頭バイト/DOCTYPE/JSON/url一致/ld+json数） → commit → push の順序を厳守。

---

## 9. 注意点まとめ

### JSON エスケープ

```powershell
# title / description を JSON 文字列に安全に埋め込む
function EscapeJson([string]$s) {
    $s -replace '\\', '\\' `
       -replace '"',  '\"' `
       -replace "`n", '\n' `
       -replace "`r", '\r' `
       -replace "`t", '\t'
}
```

### 日本語文字列

UTF-8 no BOM で書き出す限り、日本語はそのまま埋め込んで問題なし。
`\uXXXX` エスケープは不要（むしろ読みにくくなる）。

### meta description がないアプリ（約17%）

`description` フィールドを省略する。空文字 `""` は入れない。

```powershell
$descLine = if ($desc -ne "") { "`"description`": `"$desc`"," } else { "" }
```

### FAQPage スキーマの条件

FAQPage は「質問と回答のペアが HTML 上で構造化されている」ページのみ対象。
キーワード存在チェックだけでは不十分。FAQ 実装フェーズで別途調査が必要。

### 誤った構造化データのリスク

- `applicationCategory` に不適切な値を入れるとリッチリザルトが出ない
- FAQPage で Q&A のペアが取れない場合は Google に無視される（ペナルティはなし）
- SoftwareApplication の `price: 0` は無料であることが確実な場合のみ（ネコポケは全件無料なので問題なし）

---

## 10. 絶対ルール

```
❌ 本ファイルは設計書のみ。注入スクリプトはまだ作らない
❌ HTML はまだ変更しない
❌ git add / commit / push は別途判断
❌ worker / publish / fix / AI公開係 起動禁止
✅ 10件テスト → 兄貴確認 → 100件 → ... の順番を守る
✅ dry-run を必ず先に実行する
✅ canonical タグは絶対に消さない
✅ JSON-LD の url は canonical から読み取る（再計算しない）
✅ 検証は先頭バイト / DOCTYPE / JSON パース / url一致 / ld+json数 の5項目すべてPASS
```

---

*このファイルは public repo に commit 管理する。実装着手時は jsonld_injection.ps1 を別途作成する。*
