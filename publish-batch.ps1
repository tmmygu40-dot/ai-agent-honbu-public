# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "育児日記アプリ",
  "英単語フラッシュカードアプリ",
  "荷物受取管理アプリ",
  "血圧管理アプリ",
  "血糖値管理アプリ",
  "視聴記録アプリ",
  "診察記録アプリ",
  "試験対策記録アプリ",
  "語彙クイズアプリ",
  "説明文ジェネレーター",
  "読書記録アプリ",
  "請求書管理アプリ",
  "議事録メモアプリ",
  "買い物順路アプリ",
  "買取査定記録アプリ",
  "貸し借り管理アプリ",
  "賃貸管理アプリ",
  "資格有効期限管理アプリ",
  "資格期限管理アプリ",
  "資格期限管理アプリ_v2",
  "資格管理アプリ",
  "資金繰り管理アプリ",
  "車メンテ記録アプリ",
  "車両メンテナンス管理アプリ",
  "車両走行記録アプリ",
  "転換率管理アプリ",
  "返信待ち管理アプリ",
  "返品管理アプリ",
  "返品管理アプリ_v2",
  "返済計画アプリ",
  "通院記録アプリ",
  "通院記録アプリ_v2",
  "連絡管理アプリ",
  "週報作成アプリ",
  "部屋探しメモアプリ",
  "部屋探し比較アプリ",
  "配置表アプリ",
  "配送積載チェッカー",
  "配達ルートメモアプリ",
  "鍵管理アプリ",
  "間違いノートアプリ",
  "防災備品管理アプリ",
  "集金管理アプリ",
  "集金管理アプリ_v2",
  "電気代シミュレーターアプリ",
  "電池サイズ管理アプリ",
  "電話応対メモアプリ",
  "面接メモアプリ",
  "順番待ち管理アプリ",
  "領収書作成アプリ"
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
