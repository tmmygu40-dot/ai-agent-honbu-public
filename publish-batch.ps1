# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "会議タイムキーパーアプリ",
  "住所変更チェッカー",
  "体型測定記録アプリ",
  "体温管理アプリ",
  "体調メモアプリ",
  "作り置き管理アプリ",
  "作品価格設定アプリ",
  "作業マニュアルメモアプリ",
  "作業指示書作成アプリ",
  "作業進捗ボード",
  "価格履歴メモアプリ",
  "保証期限管理アプリ",
  "保険管理アプリ",
  "保険管理アプリ_v2",
  "保険管理アプリ（見直しポイント確認）",
  "修理受付管理アプリ",
  "修理受付管理アプリ_v2",
  "値札作成アプリ",
  "健康診断記録アプリ",
  "備品貸出管理アプリ",
  "催事スケジュール管理アプリ",
  "先入先出管理アプリ",
  "入居者管理アプリ",
  "入荷検品チェッカー",
  "公共料金管理アプリ"
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
