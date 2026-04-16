# publish-batch.ps1 — 公開バッチ用スクリプト（MVP / git操作は手動）

$pub = (Get-Location).Path
$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== ここに公開するアプリ名を書く =====
$apps = @(
  "棚卸し差異チェッカー",
  "棚番号管理アプリ",
  "植物ケアアプリ",
  "植物管理アプリ",
  "検品記録アプリ",
  "業務時間仕分けアプリ",
  "欠品チェックアプリ",
  "欠品記録アプリ",
  "残業上限チェッカー",
  "消耗品交換管理アプリ",
  "温度記録管理アプリ",
  "源泉徴収計算アプリ",
  "点検記録アプリ",
  "献立プランナー",
  "献立管理アプリ",
  "現場点検チェックシートアプリ",
  "生理周期管理アプリ",
  "生産可能数チェッカー",
  "申し送りアプリ",
  "発注点管理アプリ",
  "発注管理アプリ",
  "発注管理アプリ_v2",
  "目的別貯金管理アプリ",
  "相見積もり比較アプリ",
  "着回し管理アプリ",
  "睡眠管理アプリ",
  "研修管理アプリ",
  "禁煙サポートアプリ",
  "稟議管理アプリ",
  "積立シミュレーター",
  "立替精算アプリ",
  "競合価格調査メモアプリ",
  "筋トレ記録アプリ",
  "筋トレ記録アプリ_v2",
  "簡易スタンプカードアプリ",
  "簡易注文伝票アプリ",
  "簡易見積もり作成アプリ",
  "簡易見積書作成アプリ",
  "簡易集計アプリ",
  "粗利管理アプリ",
  "納品書作成アプリ",
  "納税スケジュール管理アプリ",
  "経費精算アプリ",
  "経費精算アプリ_v2",
  "給与計算アプリ",
  "給油管理アプリ",
  "緊急情報カードアプリ",
  "美容カルテアプリ",
  "習い事管理アプリ",
  "習慣トラッカーアプリ_v2"
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
