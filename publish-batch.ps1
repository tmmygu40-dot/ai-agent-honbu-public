# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "顧客メモアプリ",
  "食事カロリー記録アプリ",
  "食品安全チェッカー",
  "食材管理アプリ_v2",
  "飲み放題タイマーアプリ",
  "飲み放題タイマーアプリ_v2"
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
