# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "工数管理アプリ",
  "工数見積もりアプリ",
  "工程管理アプリ",
  "工程表作成アプリ",
  "希釈計算アプリ",
  "席回転管理アプリ",
  "広告効果記録アプリ",
  "座席割り当てアプリ",
  "廃棄記録アプリ",
  "建材数量計算アプリ",
  "引き落とし管理アプリ",
  "引継ぎ書作成アプリ",
  "引越し手続きチェックリストアプリ",
  "当番表ジェネレーター",
  "待ち番号管理アプリ",
  "忘れ物防止アプリ",
  "応募管理アプリ",
  "意思決定マトリックスアプリ",
  "成績管理アプリ",
  "成績管理アプリ_v2",
  "手順付きクッキングタイマーアプリ",
  "扶養内収入チェッカー",
  "扶養内管理アプリ",
  "投稿管理アプリ",
  "指導記録アプリ",
  "採寸メモアプリ",
  "採用コスト管理アプリ",
  "提出物管理アプリ",
  "損益分岐点シミュレーター",
  "故障記録アプリ",
  "断捨離サポートアプリ",
  "旅のしおりアプリ",
  "旅行しおり作成アプリ",
  "旅行費用管理アプリ",
  "日報作成アプリ",
  "日報作成アプリ_v2",
  "日程調整アプリ",
  "時間割管理アプリ",
  "時間帯別売上管理アプリ",
  "暗記カードアプリ",
  "有給管理アプリ",
  "有給管理アプリ（スタッフ版）",
  "服用管理アプリ",
  "期限管理アプリ",
  "来客カウンターアプリ",
  "来店管理アプリ",
  "来訪者記録アプリ",
  "栄養管理アプリ",
  "梱包サイズ確認アプリ",
  "棚卸しチェッカー"
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
