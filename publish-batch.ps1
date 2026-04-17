# publish-batch.ps1 — 公開バッチ（git自動化版 / 引数対応）
#
# 使い方:
#   手動実行: $apps を編集 → .\publish-batch.ps1
#   引数実行: .\publish-batch.ps1 -InputApps "家計メモアプリ"
#           : .\publish-batch.ps1 -InputApps "家計メモアプリ","タイマーアプリ"

param(
    [string[]]$InputApps
)

$dev = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"
$pub = "C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public"

# ===== 手動実行用リスト（-InputApps 指定がない場合のみ使用） =====
$apps = @()
# ================================================================

# 引数が渡されていれば優先
if ($InputApps -and $InputApps.Count -gt 0) {
    $apps = $InputApps
}

$ErrorActionPreference = 'Stop'
Set-Location $pub

function Fail($msg) {
    Write-Host "中止: $msg" -ForegroundColor Red
    exit 1
}

# 空チェック
if (-not $apps -or $apps.Count -eq 0) {
    Fail "公開するアプリが指定されていません"
}

# (1) dev 存在チェック
$missing = $apps | Where-Object { -not (Test-Path "$dev\$_") }
if ($missing) {
    Fail ("devに以下がありません: " + ($missing -join ', '))
}

# (2) コピー
foreach ($a in $apps) {
    Copy-Item -Recurse -Force "$dev\$a" "$pub\$a"
    Write-Host "Copied: $a"
}

# (3) 現在件数
$pubMd = Get-Content PUBLISHED.md -Raw -Encoding UTF8
if ($pubMd -notmatch '## 公開アプリ \((\d+)件\)') {
    Fail "PUBLISHED.md 見出し不明"
}
$curr = [int]$Matches[1]
$new = $curr + $apps.Count

# (4) index.html 更新
$idxAdd = ($apps | ForEach-Object { "    <li><a href=`"$_/`">$_</a></li>" }) -join "`r`n"
$idx = Get-Content index.html -Raw -Encoding UTF8
$idx = $idx.Replace('    <!-- APP_LIST_END -->', $idxAdd + "`r`n    <!-- APP_LIST_END -->")
[System.IO.File]::WriteAllText((Join-Path $PWD "index.html"), $idx, [System.Text.UTF8Encoding]::new($false))
Write-Host "index.html updated"

# (5) PUBLISHED.md 更新
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

# (6) git add / commit / push
git add -- index.html PUBLISHED.md
if ($LASTEXITCODE -ne 0) {
    Fail "git add (files) failed"
}

foreach ($a in $apps) {
    git add -- $a
    if ($LASTEXITCODE -ne 0) {
        Fail "git add $a failed"
    }
}

$msg = "add: $($apps.Count) apps / $curr→$new 件"
git commit -m $msg
if ($LASTEXITCODE -ne 0) {
    Fail "git commit failed"
}

git push origin main
if ($LASTEXITCODE -ne 0) {
    Fail "git push failed"
}

Write-Host ""
Write-Host "完了: $($apps.Count) 件公開 ($curr → $new)" -ForegroundColor Green

# ── 整合チェック（sync-missing.py） ─────────────────────────────────
$syncScript = Join-Path $pub "sync-missing.py"
if (Test-Path $syncScript) {
    Write-Host ""
    Write-Host "── 整合チェック実行 ──" -ForegroundColor Cyan
    python $syncScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "整合チェック: 問題なし" -ForegroundColor Green
    } else {
        Write-Host "整合チェック: 補完不可アプリあり（上記ログ参照）" -ForegroundColor Yellow
    }
} else {
    Write-Host "警告: sync-missing.py が見つかりません（スキップ）" -ForegroundColor Yellow
}

# ── 公開後チェック（check-apps.py） ──────────────────────────────────
$checkScript = Join-Path $pub "check-apps.py"
if (Test-Path $checkScript) {
    Write-Host ""
    Write-Host "── 公開後チェック実行 ──" -ForegroundColor Cyan
    python $checkScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "公開後チェック: 完了" -ForegroundColor Green
    } else {
        Write-Host "公開後チェック: エラーあり（上記ログ参照）" -ForegroundColor Yellow
    }
} else {
    Write-Host "警告: check-apps.py が見つかりません（スキップ）" -ForegroundColor Yellow
}

# ── 修正候補抽出（make-fix-queue.py） ────────────────────────────────
$queueScript = Join-Path $pub "make-fix-queue.py"
if (Test-Path $queueScript) {
    Write-Host ""
    Write-Host "── 修正候補抽出 ──" -ForegroundColor Cyan
    python $queueScript
    if ($LASTEXITCODE -eq 0) {
        Write-Host "修正候補抽出: 完了（fix-queue.json 参照）" -ForegroundColor Green
    } else {
        Write-Host "修正候補抽出: エラーあり（上記ログ参照）" -ForegroundColor Yellow
    }
} else {
    Write-Host "警告: make-fix-queue.py が見つかりません（スキップ）" -ForegroundColor Yellow
}
