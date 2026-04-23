# publish-batch.ps1 -- Batch publish (git automation / argument support)
#
# Usage:
#   .\publish-batch.ps1 -InputApps "AppName"
#   .\publish-batch.ps1 -InputApps "App1","App2"

param(
    [string[]]$InputApps
)

# --- Paths ---
$pub    = Split-Path -Parent $MyInvocation.MyCommand.Path
$dev    = Join-Path (Split-Path -Parent $pub) "AIエージェント本部"
$honbu  = $dev

# --- Manual list (used only if -InputApps not provided) ---
$apps = @()

if ($InputApps -and $InputApps.Count -gt 0) {
    $apps = $InputApps
}

$ok = $true
$ErrorActionPreference = 'Stop'
Set-Location $pub

function LogError($msg) {
    $ts    = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $entry = "[$ts] ERROR: $msg"
    Write-Host "ERROR: $msg" -ForegroundColor Red
    $errPath = Join-Path $pub "ERROR_LOG.md"
    if (-not (Test-Path $errPath)) {
        [System.IO.File]::WriteAllText($errPath, "# ERROR LOG`r`n`r`n", [System.Text.UTF8Encoding]::new($false))
    }
    Add-Content -LiteralPath $errPath -Value $entry -Encoding UTF8
}

# (0) Validate input
$noInputApps = $false
if (-not $apps -or $apps.Count -eq 0) {
    Write-Host "No apps specified -- running in sitemap-refresh mode" -ForegroundColor Yellow
    $noInputApps = $true
    $apps = @()
}

# Max 10 apps per run
if ($ok -and $apps.Count -gt 10) {
    Write-Host "Limiting to first 10 of $($apps.Count) apps" -ForegroundColor Yellow
    $apps = $apps | Select-Object -First 10
}

# (1) Check dev folders exist
if ($ok) {
    $missing = $apps | Where-Object { -not (Test-Path (Join-Path $dev $_)) }
    if ($missing) {
        LogError ("Missing in dev: " + ($missing -join ', '))
        $ok = $false
    }
}

# (2) Copy dev -> pub (skipped in sitemap-refresh mode)
if ($ok -and -not $noInputApps) {
    foreach ($a in $apps) {
        Copy-Item -Recurse -Force (Join-Path $dev $a) (Join-Path $pub $a)
        Write-Host "Copied: $a"
    }
}

# (3) Build full app list from ACTUAL pub folders (no git dependency)
if ($ok) {
    $excludeNames = @('ai-agent-honbu-public', 'node_modules')

    $allApps = Get-ChildItem $pub -Directory |
        Where-Object { $_.Name -notmatch '^[._]' } |
        Where-Object { $excludeNames -notcontains $_.Name } |
        Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } |
        Sort-Object Name |
        Select-Object -ExpandProperty Name

    $totalApps = $allApps.Count
    Write-Host "Total app folders: $totalApps"

    if ($totalApps -eq 0) {
        LogError "No app folders found"
        $ok = $false
    }
}

# (4) Update index.html
if ($ok) {
    $idxPath = Join-Path $pub "index.html"
    $idx = [System.IO.File]::ReadAllText($idxPath, [System.Text.Encoding]::UTF8)

    # (4a) Rebuild all-apps list using IndexOf (safe for large files)
    $startTag = '<ul id="all-apps"'
    $endTag   = '<!-- APP_LIST_END -->'
    $si = $idx.IndexOf($startTag)
    $ei = $idx.IndexOf($endTag)

    if ($si -lt 0 -or $ei -lt 0) {
        LogError "index.html all-apps markers not found (start=$si end=$ei)"
        $ok = $false
    }
}

if ($ok) {
    $tagClose    = $idx.IndexOf('>', $si) + 1
    $allAppsHtml = ($allApps | ForEach-Object {
        "    <li><a href=`"./$_/`">$_</a></li>"
    }) -join "`r`n"
    $idx = $idx.Substring(0, $tagClose) + "`r`n" + $allAppsHtml + "`r`n    " + $idx.Substring($ei)

    # (4b) Add to new-apps section
    $today  = Get-Date -Format 'yyyy-MM-dd'
    $marker = '<!-- NEW_APPS_END -->'
    $mi     = $idx.IndexOf($marker)

    if ($mi -ge 0) {
        $newHtml = ($apps | ForEach-Object {
            "    <li><a href=`"./$_/`">$_<span class=`"new-date`">公開日: $today</span></a></li>"
        }) -join "`r`n"
        $insertAt = $mi + $marker.Length
        $idx = $idx.Substring(0, $insertAt) + "`r`n" + $newHtml + $idx.Substring($insertAt)

        # Deduplicate by href, trim to 6 newest
        $blockRx = [regex]::Match($idx, '(?s)(<ul class="new-apps">)(.*?)(</ul>)')
        if ($blockRx.Success) {
            $liRx   = [regex]::Matches($blockRx.Groups[2].Value, '(?s)<li>.*?</li>')
            $seen   = @{}
            $unique = @()
            foreach ($li in $liRx) {
                $hr = [regex]::Match($li.Value, 'href="([^"]*)"')
                if ($hr.Success -and -not $seen.ContainsKey($hr.Groups[1].Value)) {
                    $seen[$hr.Groups[1].Value] = $true
                    $unique += $li.Value
                }
            }
            $keep     = $unique | Select-Object -First 6
            $keepHtml = ($keep | ForEach-Object { "    $_" }) -join "`r`n"
            $rebuilt  = "<ul class=`"new-apps`">`r`n    $marker`r`n$keepHtml`r`n  </ul>"
            $idx = $idx.Substring(0, $blockRx.Index) + $rebuilt + $idx.Substring($blockRx.Index + $blockRx.Length)
        }
    } else {
        Write-Host "WARNING: NEW_APPS_END marker not found, skipping new-apps update" -ForegroundColor Yellow
    }

    # (4c) Update all static count text
    # Pattern A: h1 fallback "⚡ NNN個以上"
    $idx = [regex]::Replace($idx, '(?<=⚡ )\d+(?=個以上)', [string]$totalApps)
    # Pattern B: meta description + JSON-LD "Webアプリ・ツールNNN個以上"
    $idx = [regex]::Replace($idx, '(?<=Webアプリ・ツール)\d+(?=個以上)', [string]$totalApps)

    [System.IO.File]::WriteAllText($idxPath, $idx, [System.Text.UTF8Encoding]::new($false))
    Write-Host "index.html updated (all-apps=$totalApps, counts updated)"
}

# (5) Regenerate PUBLISHED.md from actual folders
if ($ok) {
    $lines = @(
        "# 公開済みアプリ台帳 (PUBLISHED)"
        ""
        "このリポジトリ ``ai-agent-honbu-public`` で公開中のアプリ一覧。"
        "``index.html`` のリンク一覧と常に一致させる。"
        ""
        "公開サイト: https://tmmygu40-dot.github.io/ai-agent-honbu-public/"
        ""
        "---"
        ""
        "## 公開アプリ ($($totalApps)件)"
        ""
        "| #  | フォルダ                        | 表示名                 |"
        "|----|---------------------------------|------------------------|"
    )
    $n = 1
    foreach ($a in $allApps) {
        $lines += "| $n  | ``$a/`` | $a |"
        $n++
    }
    $pubMd = $lines -join "`r`n"
    [System.IO.File]::WriteAllText((Join-Path $pub "PUBLISHED.md"), $pubMd, [System.Text.UTF8Encoding]::new($false))
    Write-Host "PUBLISHED.md regenerated ($totalApps entries)"
}

# (5.5) Regenerate sitemap.xml
if ($ok) {
    $domain = "https://nekopoke.jp"
    $today  = Get-Date -Format 'yyyy-MM-dd'

    $smLines = @(
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        "  <url><loc>$domain/</loc><lastmod>$today</lastmod><changefreq>daily</changefreq><priority>1.0</priority></url>"
        "  <url><loc>$domain/tools.html</loc><lastmod>$today</lastmod><changefreq>daily</changefreq><priority>0.9</priority></url>"
        "  <url><loc>$domain/about.html</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.4</priority></url>"
        "  <url><loc>$domain/privacy.html</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.3</priority></url>"
        "  <url><loc>$domain/contact.html</loc><lastmod>$today</lastmod><changefreq>monthly</changefreq><priority>0.3</priority></url>"
    )

    foreach ($a in $allApps) {
        $enc = [uri]::EscapeDataString($a)
        $appDir = Join-Path $pub $a
        $lm = $today
        if (Test-Path $appDir) {
            try {
                $lm = (Get-Item $appDir).LastWriteTime.ToString('yyyy-MM-dd')
            } catch {}
        }
        $smLines += "  <url><loc>$domain/$enc/</loc><lastmod>$lm</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>"
    }

    $smLines += '</urlset>'
    $smXml = $smLines -join "`r`n"
    [System.IO.File]::WriteAllText((Join-Path $pub "sitemap.xml"), $smXml, [System.Text.UTF8Encoding]::new($false))
    Write-Host "sitemap.xml regenerated ($($allApps.Count + 5) urls)"
}

# (6) 3-point consistency check
if ($ok) {
    $chkIdx   = [System.IO.File]::ReadAllText((Join-Path $pub "index.html"), [System.Text.Encoding]::UTF8)
    $chkBlock = [regex]::Match($chkIdx, '(?s)<ul id="all-apps".*?<!-- APP_LIST_END -->')
    $cntIdx   = if ($chkBlock.Success) { [regex]::Matches($chkBlock.Value, '<li><a href="\./').Count } else { -1 }

    $chkPub = [System.IO.File]::ReadAllText((Join-Path $pub "PUBLISHED.md"), [System.Text.Encoding]::UTF8)
    $cntPub = [regex]::Matches($chkPub, '^\| \d+', [System.Text.RegularExpressions.RegexOptions]::Multiline).Count

    $cntDir = $allApps.Count

    Write-Host ""
    Write-Host "=== 3-point check ===" -ForegroundColor Cyan
    Write-Host "  Folders:       $cntDir"
    Write-Host "  index.html:    $cntIdx"
    Write-Host "  PUBLISHED.md:  $cntPub"

    if ($cntDir -ne $cntIdx -or $cntDir -ne $cntPub) {
        LogError "3-point mismatch: folders=$cntDir index=$cntIdx published=$cntPub"
        $ok = $false
        Write-Host "STOP: mismatch -- will NOT commit" -ForegroundColor Red
    } else {
        Write-Host "  All match!" -ForegroundColor Green
    }
}

# (7) Git add -- all app folders + core files (explicit, no wildcard)
if ($ok) {
    git add -- index.html PUBLISHED.md sitemap.xml
    if ($LASTEXITCODE -ne 0) { LogError "git add index.html/PUBLISHED.md/sitemap.xml failed"; $ok = $false }
}

if ($ok) {
    # Add ALL app folders (not just $apps) so previously untracked folders are committed
    Write-Host "git add: staging $($allApps.Count) app folders..." -ForegroundColor Cyan
    foreach ($a in $allApps) {
        git add -- $a
        if ($LASTEXITCODE -ne 0) { LogError "git add $a failed"; $ok = $false; break }
    }
}

if ($ok) {
    $errPath = Join-Path $pub "ERROR_LOG.md"
    if (Test-Path $errPath) { git add -- ERROR_LOG.md 2>$null }
}

# (8) Commit and push
$didCommit = $false
if ($ok) {
    git diff --cached --quiet
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Nothing staged -- skipping commit/push" -ForegroundColor Yellow
    } else {
        if ($noInputApps) {
            $msg = "chore: regenerate sitemap.xml ($totalApps apps)"
        } else {
            $prev = $totalApps - $apps.Count
            $msg  = "add: $($apps.Count) apps / $prev->$totalApps"
        }
        git commit -m $msg
        if ($LASTEXITCODE -ne 0) { LogError "git commit failed"; $ok = $false } else { $didCommit = $true }
    }
}

if ($ok -and $didCommit) {
    git push origin main
    if ($LASTEXITCODE -ne 0) { LogError "git push failed"; $ok = $false }
}

# (9) Result summary
if ($ok) {
    $prev = $totalApps - $apps.Count
    Write-Host ""
    Write-Host "SUCCESS: $($apps.Count) apps published ($prev -> $totalApps)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "FAILED: see errors above" -ForegroundColor Red
}

# (10) Post-publish helper scripts
foreach ($s in @(
    @{ File = "sync-missing.py";   Label = "Sync check" },
    @{ File = "check-apps.py";     Label = "Post-publish check" },
    @{ File = "make-fix-queue.py"; Label = "Fix queue" }
)) {
    $sp = Join-Path $pub $s.File
    if (Test-Path $sp) {
        Write-Host ""
        Write-Host "-- $($s.Label) --" -ForegroundColor Cyan
        python $sp
        if ($LASTEXITCODE -eq 0) {
            Write-Host "$($s.Label): OK" -ForegroundColor Green
        } else {
            Write-Host "$($s.Label): issues found (see above)" -ForegroundColor Yellow
        }
    }
}

Write-Host ""
Read-Host "Press Enter to close"