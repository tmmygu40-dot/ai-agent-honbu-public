# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "冠婚葬祭記録アプリ",
  "処方薬残量管理アプリ",
  "出展収支管理アプリ",
  "出席管理アプリ",
  "利益計算アプリ",
  "割り勘精算アプリ",
  "勉強進捗管理アプリ",
  "医療費管理アプリ",
  "医療費管理アプリ（病院別・家族別）",
  "単価比較アプリ",
  "原価率チェッカー",
  "原価率管理アプリ",
  "原稿時間チェッカー",
  "反応速度テストゲーム",
  "収納場所メモアプリ",
  "受注管理アプリ",
  "名刺管理アプリ",
  "名刺管理アプリ_v2",
  "品質記録アプリ",
  "問い合わせ管理アプリ",
  "問い合わせ管理アプリ_v2",
  "営業パイプライン管理アプリ",
  "回覧板アプリ",
  "在席状況ボード",
  "在庫管理アプリ",
  "売れ筋メニュー管理アプリ",
  "売上ペース管理アプリ",
  "売上進捗管理アプリ",
  "売掛管理アプリ",
  "外注管理アプリ",
  "契約管理アプリ",
  "子どもお小遣い管理アプリ",
  "子どもの持ち物チェッカー",
  "子ども成長記録アプリ",
  "子ども提出物・持ち物管理アプリ",
  "学校費用管理アプリ",
  "宅配便管理アプリ",
  "安全管理アプリ",
  "定型文管理アプリ",
  "客室清掃管理アプリ",
  "客注管理アプリ",
  "家事ローテーション管理アプリ",
  "家事分担記録アプリ",
  "家庭菜園記録アプリ",
  "家族健康情報カードアプリ",
  "家設備メンテ記録アプリ",
  "家賃収支管理アプリ",
  "小口現金管理アプリ",
  "工事日報アプリ",
  "工具貸出管理アプリ"
)# ========================================

$ErrorActionPreference = 'Stop'
Set-Location $pub

# (1) dev 存在チェック
$missing = $apps | Where-Object { -not (Test-Path "$dev\$_") }
if ($missing) {
  Write-Host "中止: devに以下がありません:" -ForegroundColor Red
  $missing | ForEach-Object { Write-Host "  - $_" }
  exit 1
}

# (2) コピー
foreach ($a in $apps) {
  Copy-Item -Recurse -Force "$dev\$a" "$pub\$a"
  Write-Host "Copied: $a"
}

# (3) 現在件数を自動取得
$pubMd = Get-Content PUBLISHED.md -Raw -Encoding UTF8
if ($pubMd -notmatch '## 公開アプリ \((\d+)件\)') {
  Write-Host "中止: PUBLISHED.md 見出しが見つかりません" -ForegroundColor Red
  exit 1
}
$curr = [int]$Matches[1]
$new = $curr + $apps.Count

# (4) index.html 更新
$idxAdd = ($apps | ForEach-Object { "    <li><a href=`"$_/`">$_</a></li>" }) -join "`r`n"
$idx = Get-Content index.html -Raw -Encoding UTF8
$idx = $idx.Replace('    <!-- APP_LIST_END -->', $idxAdd + "`r`n    <!-- APP_LIST_END -->")
[System.IO.File]::WriteAllText((Join-Path $PWD "index.html"), $idx, [System.Text.UTF8Encoding]::new($false))
Write-Host "index.html updated"

# (5) PUBLISHED.md 更新（件数 + 表に追記）
$n = $curr + 1
$rows = @()
foreach ($a in $apps) {
  $rows += "| $n | ``$a/`` | $a |"
  $n++
}
$pubAdd = $rows -join "`r`n"
$m = [regex]::Matches($pubMd, '\| \d+ \|[^\r\n]+\|')
$last = $m[$m.Count - 1].Value
$pubMd = $pubMd.Replace($last, $last + "`r`n" + $pubAdd)
$pubMd = $pubMd -replace '## 公開アプリ \(\d+件\)', ("## 公開アプリ (" + $new + "件)")
[System.IO.File]::WriteAllText((Join-Path $PWD "PUBLISHED.md"), $pubMd, [System.Text.UTF8Encoding]::new($false))
Write-Host "PUBLISHED.md updated ($curr → $new 件)"

# (6) 確認表示
Write-Host ""
Write-Host "=== git status ==="
git status --short
Write-Host ""
Write-Host "問題なければ手動で:"
Write-Host "  git add -A"
Write-Host "  git commit -m `"add: $($apps.Count) apps / $curr→$new 件`""
Write-Host "  git push origin main"
