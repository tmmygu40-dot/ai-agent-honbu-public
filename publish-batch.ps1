# publish-batch.ps1 - Safe publish batch (English-only / regeneration mode)
#
# Usage:
#   Manual:  Edit $apps below, then run .\publish-batch.ps1
#   Args:    .\publish-batch.ps1 -InputApps "app1","app2"

param(
    [string[]]$InputApps
)

$dev   = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"
$pub   = "C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public"
$honbu = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部"

$apps = @()

if ($InputApps -and $InputApps.Count -gt 0) { $apps = $InputApps }

Set-Location $pub

$ok = $true

# --- Empty check ---
if (-not $apps -or $apps.Count -eq 0) {
    Write-Host "STOP: No apps specified." -ForegroundColor Red
    $ok = $false
}

# --- Max 10 apps per run ---
if ($ok -and $apps.Count -gt 10) {
    Write-Host "STOP: Max 10 apps per run (got $($apps.Count))." -ForegroundColor Red
    $ok = $false
}

# --- Check dev folders exist ---
if ($ok) {
    $missing = $apps | Where-Object { -not (Test-Path "$dev\$_") }
    if ($missing) {
        Write-Host "STOP: Missing in dev: $($missing -join ', ')" -ForegroundColor Red
        $ok = $false
    }
}

# --- (1) Copy from dev to pub ---
if ($ok) {
    foreach ($a in $apps) {
        Copy-Item -Recurse -Force "$dev\$a" "$pub\$a"
        Write-Host "Copied: $a"
    }
}

# --- (2) Get truth: all app folders with index.html ---
if ($ok) {
    $allApps = Get-ChildItem $pub -Directory |
               Where-Object { Test-Path "$($_.FullName)\index.html" } |
               Sort-Object Name |
               Select-Object -ExpandProperty Name

    Write-Host "Total app folders: $($allApps.Count)" -ForegroundColor Cyan
}

# --- (3) Regenerate index.html all-apps section (IndexOf method) ---
if ($ok) {
    $idx = [System.IO.File]::ReadAllText("$pub\index.html", [System.Text.Encoding]::UTF8)

    $ulTag     = '<ul id="all-apps"'
    $endMarker = '<!-- APP_LIST_END -->'

    $ulPos  = $idx.IndexOf($ulTag)
    $endPos = $idx.IndexOf($endMarker)

    if ($ulPos -lt 0) {
        Write-Host "STOP: all-apps ul tag not found." -ForegroundColor Red
        $ok = $false
    } elseif ($endPos -lt 0) {
        Write-Host "STOP: APP_LIST_END marker not found." -ForegroundColor Red
        $ok = $false
    } elseif ($endPos -le $ulPos) {
        Write-Host "STOP: APP_LIST_END appears before all-apps ul." -ForegroundColor Red
        $ok = $false
    } else {
        $ulTagEnd = $idx.IndexOf('>', $ulPos) + 1
        $before   = $idx.Substring(0, $ulTagEnd)
        $after    = $idx.Substring($endPos)

        $newLiLines = ($allApps | ForEach-Object {
            "    <li><a href=""./$_/"">$_</a></li>"
        }) -join "`r`n"

        $newIdx = $before + "`r`n" + $newLiLines + "`r`n    " + $after

        # --- New-apps section: add new items, deduplicate, keep 6 ---
        $today    = Get-Date -Format 'yyyy-MM-dd'
        $newItems = ($apps | ForEach-Object {
            "    <li><a href=""./$_/"">$_<span class=""new-date"">Published: $today</span></a></li>"
        }) -join "`r`n"
        $newIdx = $newIdx.Replace('    <!-- NEW_APPS_END -->', "    <!-- NEW_APPS_END -->`r`n" + $newItems)

        # Deduplicate and keep latest 6
        $blockMatch = [regex]::Match($newIdx, '(?s)(<ul class="new-apps">.*?</ul>)')
        if ($blockMatch.Success) {
            $block   = $blockMatch.Value
            $liItems = [regex]::Matches($block, '(?s)<li>.*?</li>')

            $seen   = @{}
            $unique = @()
            foreach ($li in $liItems) {
                $hrefMatch = [regex]::Match($li.Value, 'href="([^"]*)"')
                $href = if ($hrefMatch.Success) { $hrefMatch.Groups[1].Value } else { $li.Value }
                if (-not $seen.ContainsKey($href)) {
                    $seen[$href] = $true
                    $unique += $li.Value
                }
            }

            $keepItems = $unique | Select-Object -First 6
            $keepLines = $keepItems -join "`r`n    "
            $newBlock  = "<ul class=""new-apps"">`r`n    <!-- NEW_APPS_END -->`r`n    $keepLines`r`n  </ul>"
            $newIdx    = $newIdx.Replace($block, $newBlock)
        }

        [System.IO.File]::WriteAllText("$pub\index.html", $newIdx, [System.Text.UTF8Encoding]::new($false))
        Write-Host "index.html updated (regenerated)" -ForegroundColor Green
    }
}

# --- (4) Regenerate PUBLISHED.md table (line-by-line safe method) ---
if ($ok) {
    $mdLines = [System.IO.File]::ReadAllText("$pub\PUBLISHED.md", [System.Text.Encoding]::UTF8) -split "`r?`n"

    $sepIdx = -1
    for ($i = 0; $i -lt $mdLines.Count; $i++) {
        if ($mdLines[$i] -match '^\|----') { $sepIdx = $i; break }
    }

    if ($sepIdx -lt 0) {
        Write-Host "STOP: PUBLISHED.md table separator not found." -ForegroundColor Red
        $ok = $false
    }
}

if ($ok) {
    $headerLines = $mdLines[0..$sepIdx] | ForEach-Object {
        $_ -replace '## 公開アプリ \(\d+件\)', "## 公開アプリ ($($allApps.Count)件)"
    }

    $footerStart = $sepIdx + 1
    while ($footerStart -lt $mdLines.Count -and $mdLines[$footerStart] -match '^\|') {
        $footerStart++
    }

    $footerLines = if ($footerStart -lt $mdLines.Count) { $mdLines[$footerStart..($mdLines.Count - 1)] } else { @() }

    $newRows = for ($i = 0; $i -lt $allApps.Count; $i++) {
        "| $($i + 1)  | ``$($allApps[$i])/`` | $($allApps[$i]) |"
    }

    $newPubMd = (@() + $headerLines + $newRows + $footerLines) -join "`r`n"
    [System.IO.File]::WriteAllText("$pub\PUBLISHED.md", $newPubMd, [System.Text.UTF8Encoding]::new($false))
    Write-Host "PUBLISHED.md updated (regenerated, $($allApps.Count) rows)" -ForegroundColor Green
}

# --- (5) 3-point consistency check before commit ---
if ($ok) {
    Write-Host "`n-- 3-point check --" -ForegroundColor Cyan

    $checkIdx    = [System.IO.File]::ReadAllText("$pub\index.html",   [System.Text.Encoding]::UTF8)
    $checkMd     = [System.IO.File]::ReadAllText("$pub\PUBLISHED.md", [System.Text.Encoding]::UTF8)
    $folderCount = (Get-ChildItem $pub -Directory | Where-Object { Test-Path "$($_.FullName)\index.html" }).Count
    $linkCount   = ([regex]::Matches($checkIdx, '<li><a href="\./[^"]+/">[^<]+</a></li>')).Count
    $mdCount     = if ($checkMd -match '## 公開アプリ \((\d+)件\)') { [int]$Matches[1] } else { -1 }

    Write-Host "  App folders  : $folderCount"
    Write-Host "  index.html   : $linkCount"
    Write-Host "  PUBLISHED.md : $mdCount"

    if ($folderCount -ne $linkCount -or $folderCount -ne $mdCount) {
        Write-Host "`n3-point MISMATCH. Commit/push aborted." -ForegroundColor Red

        $errorLogPath = "$honbu\ERROR_LOG.md"
        $now   = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
        $entry = "`r`n`r`n---`r`n`r`n## $now 3-point mismatch during publish`r`n`r`n" +
            "- App folders: $folderCount`r`n" +
            "- index.html links: $linkCount`r`n" +
            "- PUBLISHED.md count: $mdCount`r`n" +
            "- Target apps: $($apps -join ', ')`r`n" +
            "- Mismatch detected. Commit/push blocked.`r`n"

        if (Test-Path $errorLogPath) {
            $existing = [System.IO.File]::ReadAllText($errorLogPath, [System.Text.Encoding]::UTF8)
            [System.IO.File]::WriteAllText($errorLogPath, $existing.TrimEnd() + $entry, [System.Text.UTF8Encoding]::new($false))
        } else {
            [System.IO.File]::WriteAllText($errorLogPath, "# ERROR_LOG`r`n" + $entry, [System.Text.UTF8Encoding]::new($false))
        }
        Write-Host "Logged to ERROR_LOG.md" -ForegroundColor Yellow
        $ok = $false
    } else {
        Write-Host "3-point check OK." -ForegroundColor Green
    }
}

# --- (6) git add / commit / push ---
if ($ok) {
    git add -- index.html PUBLISHED.md
    foreach ($a in $apps) { git add -- $a }

    $prev = $folderCount - $apps.Count
    $msg  = "add: $($apps.Count) apps / $prev->$folderCount"
    git commit -m $msg
    if ($LASTEXITCODE -ne 0) {
        Write-Host "STOP: git commit failed." -ForegroundColor Red
        $ok = $false
    }
}

if ($ok) {
    git push origin main
    if ($LASTEXITCODE -ne 0) {
        Write-Host "STOP: git push failed." -ForegroundColor Red
        $ok = $false
    }
}

if ($ok) {
    Write-Host "`nDone: $($apps.Count) apps published ($($folderCount - $apps.Count) -> $folderCount)" -ForegroundColor Green

    foreach ($script in @("sync-missing.py", "check-apps.py", "make-fix-queue.py")) {
        $path = Join-Path $pub $script
        if (Test-Path $path) {
            Write-Host "`n-- Running $script --" -ForegroundColor Cyan
            python $path
        }
    }
}

Read-Host "`nPress Enter to close"