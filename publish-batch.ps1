# publish-batch.ps1 — 公開バッチ（安全版 / 再生成方式）
#
# 使い方:
#   手動実行: $apps を編集 → .\publish-batch.ps1
#   引数実行: .\publish-batch.ps1 -InputApps "家計メモアプリ"
#           : .\publish-batch.ps1 -InputApps "家計メモアプリ","タイマーアプリ"

param(
    [string[]]$InputApps
)

$dev   = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"
$pub   = "C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public"
$honbu = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

# ===== 手動実行用リスト（-InputApps 指定がない場合のみ使用） =====
$apps = @()
# ================================================================

if ($InputApps -and $InputApps.Count -gt 0) { $apps = $InputApps }

Set-Location $pub

# ── 停止ヘルパー（exit 1 不使用） ─────────────────────────────────────
function Stop-WithMessage($msg) {
    Write-Host "`n中止: $msg" -ForegroundColor Red
    Read-Host "Enterで終了"
    return $false
}

# ── ERROR_LOG.md 追記ヘルパー ─────────────────────────────────────────
function Write-ErrorLog($detail) {
    $errorLogPath = "$honbu\ERROR_LOG.md"
    $now   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry = "`r`n`r`n---`r`n`r`n## $now 公開処理中にエラー検出`r`n`r`n$detail`r`n"
    if (Test-Path $errorLogPath) {
        $existing = [System.IO.File]::ReadAllText($errorLogPath, [System.Text.Encoding]::UTF8)
        [System.IO.File]::WriteAllText($errorLogPath, $existing.TrimEnd() + $entry, [System.Text.UTF8Encoding]::new($false))
    } else {
        [System.IO.File]::WriteAllText($errorLogPath, "# ERROR_LOG`r`n" + $entry, [System.Text.UTF8Encoding]::new($false))
    }
    Write-Host "ERROR_LOG.md に記録しました" -ForegroundColor Yellow
}

$ok = $true

# 空チェック
if (-not $apps -or $apps.Count -eq 0) {
    Write-Host "中止: 公開するアプリが指定されていません" -ForegroundColor Red
    $ok = $false
}

# 件数制限（最大10件）
if ($ok -and $apps.Count -gt 10) {
    Write-Host "中止: 一度に公開できるのは最大10件です（指定: $($apps.Count) 件）" -ForegroundColor Red
    Write-Host "10件以下に分けて実行してください。" -ForegroundColor Yellow
    $ok = $false
}

# dev 存在チェック
if ($ok) {
    $missing = $apps | Where-Object { -not (Test-Path "$dev\$_") }
    if ($missing) {
        Write-Host "中止: devに以下がありません: $($missing -join ', ')" -ForegroundColor Red
        $ok = $false
    }
}

# (1) コピー
if ($ok) {
    foreach ($a in $apps) {
        Copy-Item -Recurse -Force "$dev\$a" "$pub\$a"
        Write-Host "Copied: $a"
    }
}

# (2) コピー後の実フォルダ一覧を取得（これが唯一の正）
if ($ok) {
    $allApps = Get-ChildItem $pub -Directory |
               Where-Object { Test-Path "$($_.FullName)\index.html" } |
               Sort-Object Name |
               Select-Object -ExpandProperty Name

    Write-Host "`n実アプリフォルダ数: $($allApps.Count) 件" -ForegroundColor Cyan
}

# (3) index.html の all-apps セクションを再生成
if ($ok) {
    $idx = [System.IO.File]::ReadAllText("$pub\index.html", [System.Text.Encoding]::UTF8)

    $newLiLines = ($allApps | ForEach-Object {
        "    <li><a href=`"./$_/`">$_</a></li>"
    }) -join "`r`n"

    $pattern  = '(?s)(<ul id="all-apps"[^>]*>)\s*.*?(<!-- APP_LIST_END --></ul>)'
    $newBlock = '$1' + "`r`n" + $newLiLines + "`r`n    " + '$2'
    $newIdx   = [regex]::Replace($idx, $pattern, $newBlock)

    if ($newIdx -eq $idx) {
        Write-Host "中止: index.html の all-apps 置換失敗" -ForegroundColor Red
        Write-ErrorLog "index.html の all-apps セクション置換に失敗しました。"
        $ok = $false
    } else {
        # 新着アプリ欄を先頭に追加（最新6件に絞る）
        $today    = Get-Date -Format 'yyyy-MM-dd'
        $newItems = ($apps | ForEach-Object {
            "    <li><a href=`"./$_/`">$_<span class=`"new-date`">公開日: $today</span></a></li>"
        }) -join "`r`n"
        $newIdx = $newIdx.Replace('    <!-- NEW_APPS_END -->', "    <!-- NEW_APPS_END -->`r`n" + $newItems)

        $blockMatch = [regex]::Match($newIdx, '(?s)(<ul class="new-apps">.*?</ul>)')
        if ($blockMatch.Success) {
            $block   = $blockMatch.Value
            $liItems = [regex]::Matches($block, '(?s)<li>.*?</li>')
            if ($liItems.Count -gt 6) {
                $keepLines = ($liItems | Select-Object -First 6 | ForEach-Object { $_.Value }) -join "`r`n    "
                $newBlock2 = "<ul class=`"new-apps`">`r`n    <!-- NEW_APPS_END -->`r`n    $keepLines`r`n  </ul>"
                $newIdx    = $newIdx.Replace($block, $newBlock2)
            }
        }

        [System.IO.File]::WriteAllText("$pub\index.html", $newIdx, [System.Text.UTF8Encoding]::new($false))
        Write-Host "index.html 更新完了" -ForegroundColor Green
    }
}

# (4) PUBLISHED.md の表全体を再生成
if ($ok) {
    $pubMd = [System.IO.File]::ReadAllText("$pub\PUBLISHED.md", [System.Text.Encoding]::UTF8)

    $headerMatch = [regex]::Match($pubMd, '(?s)^(.*?\|----[^\r\n]+\|[\r\n]+)')
    $footerMatch = [regex]::Match($pubMd, '(?s)(\r?\n---\r?\n## 運用ルール.*?)$')

    if (-not $headerMatch.Success -or -not $footerMatch.Success) {
        Write-Host "中止: PUBLISHED.md の構造抽出失敗" -ForegroundColor Red
        Write-ErrorLog "PUBLISHED.md のヘッダー/フッター抽出に失敗しました。"
        $ok = $false
    } else {
        $mdHeader = $headerMatch.Groups[1].Value -replace '## 公開アプリ \(\d+件\)', "## 公開アプリ ($($allApps.Count)件)"
        $mdFooter = $footerMatch.Groups[1].Value

        $rows = for ($i = 0; $i -lt $allApps.Count; $i++) {
            "| $($i + 1)  | ``$($allApps[$i])/`` | $($allApps[$i]) |"
        }
        $newPubMd = $mdHeader + ($rows -join "`r`n") + $mdFooter
        [System.IO.File]::WriteAllText("$pub\PUBLISHED.md", $newPubMd, [System.Text.UTF8Encoding]::new($false))
        Write-Host "PUBLISHED.md 更新完了" -ForegroundColor Green
    }
}

# (5) 3点整合チェック（commit/push 前）
if ($ok) {
    Write-Host "`n── 3点整合チェック ──" -ForegroundColor Cyan

    $checkIdx    = [System.IO.File]::ReadAllText("$pub\index.html",   [System.Text.Encoding]::UTF8)
    $checkMd     = [System.IO.File]::ReadAllText("$pub\PUBLISHED.md", [System.Text.Encoding]::UTF8)
    $folderCount = (Get-ChildItem $pub -Directory | Where-Object { Test-Path "$($_.FullName)\index.html" }).Count
    $linkCount   = ([regex]::Matches($checkIdx, '<li><a href="\./[^"]+/">[^<]+</a></li>')).Count
    $mdCount     = if ($checkMd -match '## 公開アプリ \((\d+)件\)') { [int]$Matches[1] } else { -1 }

    Write-Host "  実アプリフォルダ数  : $folderCount 件"
    Write-Host "  index.html リンク数 : $linkCount 件"
    Write-Host "  PUBLISHED.md 件数   : $mdCount 件"

    if ($folderCount -ne $linkCount -or $folderCount -ne $mdCount) {
        Write-Host "`n3点不一致。commit/push を中止します。" -ForegroundColor Red
        Write-ErrorLog "- 実アプリフォルダ数: $folderCount 件`r`n- index.html リンク数: $linkCount 件`r`n- PUBLISHED.md 件数: $mdCount 件`r`n- 公開対象: $($apps -join ', ')`r`n- 3点不一致を検出。commit/push前に停止。手動確認が必要。"
        $ok = $false
    } else {
        Write-Host "3点一致OK。commit / push に進みます。" -ForegroundColor Green
    }
}

# (6) git add / commit / push
if ($ok) {
    git add -- index.html PUBLISHED.md
    foreach ($a in $apps) { git add -- $a }

    $curr = $folderCount - $apps.Count
    $msg  = "add: $($apps.Count) apps / $curr→$folderCount 件"
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "中止: git commit 失敗" -ForegroundColor Red
        $ok = $false
    }
}

if ($ok) {
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "中止: git push 失敗" -ForegroundColor Red
        $ok = $false
    }
}

if ($ok) {
    Write-Host "`n完了: $($apps.Count) 件公開 ($($folderCount - $apps.Count) → $folderCount)" -ForegroundColor Green

    # 後処理スクリプト
    foreach ($script in @("sync-missing.py", "check-apps.py", "make-fix-queue.py")) {
        $path = Join-Path $pub $script
        if (Test-Path $path) {
            Write-Host "`n── $script 実行 ──" -ForegroundColor Cyan
            python $path
        }
    }
}

Read-Host "`nEnterで終了"