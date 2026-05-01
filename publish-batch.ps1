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

# (1.9) Quality Gate -- block apps with critical issues BEFORE copy
if ($ok -and -not $noInputApps -and $apps.Count -gt 0) {
    $agentPath  = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部\バグ健康診断\run_agent.py"
    $reportPath = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部\バグ健康診断\check-report.agent.json"
    $allowed      = @()
    $fixed_ok     = 0
    $fixed_fail   = 0
    $blocked      = 0
    $passed       = 0
    $issueCounts  = @{}
    foreach ($a in $apps) {
        $crit     = 0
        $rep      = $null
        $fixTried = $false
        try {
            & python $agentPath --target $a --no-plan --base $dev | Out-Null
            if (Test-Path -LiteralPath $reportPath) {
                $rep  = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
                $crit = [int]$rep.agent_severity_counts.critical
            }
        } catch {
            Write-Output "Quality gate error on $a -- BLOCK for safety"
            $crit = 999
        }

        if ($rep -and $rep.issues) {
            foreach ($i in $rep.issues) {
                $t = $i.issue_type
                if (-not $issueCounts.ContainsKey($t)) { $issueCounts[$t] = 0 }
                $issueCounts[$t]++
            }
        }

        # auto-fix retry (1 try only)
        if ($crit -gt 0 -and $rep -and $rep.issues) {
            $fixTried = $true
            Write-Output "FIX TRY: $a"
            $devIdx = Join-Path (Join-Path $dev $a) "index.html"
            $issTxt = ($rep.issues | ForEach-Object { "- [$($_.issue_type)/$($_.severity)] $($_.detail)" }) -join "`n"
            $fixPrompt = @"
対象ファイル: $devIdx

以下の issue を修正してください:
$issTxt

ルール:
- ボタン未バインド / result未書込 / 空関数 / alert のみ などを修正
- 既存UI や構造は壊さない
- fav-widget.js / PDF ボタンなど必須要素は保持
"@
            try {
                & claude --dangerously-skip-permissions --model claude-haiku-4-5 --print $fixPrompt 2>&1 | Out-Null
                & python $agentPath --target $a --no-plan --base $dev | Out-Null
                if (Test-Path -LiteralPath $reportPath) {
                    $rep2 = Get-Content -LiteralPath $reportPath -Raw -Encoding UTF8 | ConvertFrom-Json
                    $crit = [int]$rep2.agent_severity_counts.critical
                }
                if ($rep2 -and $rep2.issues) {
                    foreach ($i in $rep2.issues) {
                        $t = $i.issue_type
                        if (-not $issueCounts.ContainsKey($t)) { $issueCounts[$t] = 0 }
                        $issueCounts[$t]++
                    }
                }
                if ($crit -eq 0) {
                    Write-Output "FIX OK: $a"
                    $fixed_ok++
                } else {
                    Write-Output "FIX FAIL: $a (critical=$crit)"
                    $fixed_fail++
                }
            } catch {
                Write-Output "FIX FAIL: $a (exception)"
                $fixed_fail++
                $crit = 999
            }
        }

        if ($crit -gt 0) {
            Write-Output "BLOCKED: $a (critical=$crit)"
            $blocked++
        } else {
            if (-not $fixTried) { $passed++ }
            $allowed += $a
        }
    }
    $apps = @($allowed)

    Write-Output ""
    Write-Output "=== Quality Summary ==="
    Write-Output "PASS: $passed"
    Write-Output "FIX OK: $fixed_ok"
    Write-Output "FIX FAIL: $fixed_fail"
    Write-Output "BLOCKED: $blocked"

    $gateTotal = $passed + $fixed_ok + $blocked
    if ($gateTotal -gt 0) {
        $fixRate   = [math]::Round(($fixed_ok / $gateTotal) * 100, 1)
        $blockRate = [math]::Round(($blocked / $gateTotal) * 100, 1)
    } else {
        $fixRate   = 0
        $blockRate = 0
    }
    Write-Output ""
    Write-Output "=== Quality Rates ==="
    Write-Output "FIX RATE: $fixRate %"
    Write-Output "BLOCK RATE: $blockRate %"

    Write-Host ""
    Write-Host "=== Issue Ranking (Top 5) ===" -ForegroundColor Cyan
    $issueCounts.GetEnumerator() | Sort-Object -Property Value -Descending | Select-Object -First 5 | ForEach-Object {
        Write-Host "$($_.Key): $($_.Value)"
    }
}

# (2) Copy dev -> pub (skipped in sitemap-refresh mode)
if ($ok -and -not $noInputApps) {
    foreach ($a in $apps) {
        Copy-Item -Recurse -Force (Join-Path $dev $a) (Join-Path $pub $a)
        Write-Host "Copied: $a"
    }
}

# (2.5) Health check -- Phase 1.5: log only, no gate
if ($ok -and -not $noInputApps -and $apps.Count -gt 0) {
    $scanPath = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部\バグ健康診断\scan.py"
    $histRoot = "C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部\バグ健康診断\publish-history"
    $ts       = Get-Date -Format 'yyyy-MM-dd_HHmmss'
    $histDir  = Join-Path $histRoot $ts

    if (Test-Path $scanPath) {
        try {
            New-Item -ItemType Directory -Force -Path $histDir | Out-Null
            $scanOut = & python $scanPath `
                --target ($apps -join ',') `
                --base $pub `
                --out-dir $histDir 2>&1
            $scanExit = $LASTEXITCODE
            $totLine  = ($scanOut | Select-String '^Total issues:' | Select-Object -First 1)
            $total    = if ($totLine) { [regex]::Match($totLine.ToString(), '\d+').Value } else { '?' }
            $summary  = "[$ts] SCAN apps=$($apps -join ',') total=$total exit=$scanExit"
            Write-Host "scan.py: $summary" -ForegroundColor Cyan

            $errPath = Join-Path $pub "ERROR_LOG.md"
            if (-not (Test-Path $errPath)) {
                [System.IO.File]::WriteAllText($errPath, "# ERROR LOG`r`n`r`n",
                    [System.Text.UTF8Encoding]::new($false))
            }
            Add-Content -LiteralPath $errPath -Value $summary -Encoding UTF8
        } catch {
            Write-Host "scan.py: skipped (error: $_)" -ForegroundColor Yellow
        }
    } else {
        Write-Host "scan.py: skipped (not found: $scanPath)" -ForegroundColor Yellow
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
    # AdSense向け薄いコンテンツ対策: index.html の #all-apps 一覧からは
    # index.html サイズ < 5KB のアプリを非表示にする（フォルダ・URL は温存）。
    # sitemap.xml / PUBLISHED.md は引き続き $allApps（全件）を使う。
    $thinThreshold = 5000
    $visibleApps = @($allApps | Where-Object {
        $idxFile = Join-Path $pub (Join-Path $_ 'index.html')
        try {
            (Test-Path -LiteralPath $idxFile) -and ((Get-Item -LiteralPath $idxFile).Length -ge $thinThreshold)
        } catch { $false }
    })
    Write-Host "Visible (>=${thinThreshold}B): $($visibleApps.Count) / $totalApps (filtered out: $($totalApps - $visibleApps.Count))"
    $allAppsHtml = ($visibleApps | ForEach-Object {
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
    # AdSense 対策で index.html は visibleApps（5KB 以上）のみ表示しているため、
    # 3-point check は「index.html == visibleApps」「folders == PUBLISHED.md」で整合性確認する。
    $cntVisible = $visibleApps.Count

    Write-Host ""
    Write-Host "=== 3-point check ===" -ForegroundColor Cyan
    Write-Host "  Folders:       $cntDir"
    Write-Host "  Visible apps:  $cntVisible"
    Write-Host "  index.html:    $cntIdx"
    Write-Host "  PUBLISHED.md:  $cntPub"

    if ($cntDir -ne $cntPub -or $cntIdx -ne $cntVisible) {
        LogError "3-point mismatch: folders=$cntDir index=$cntIdx published=$cntPub"
        $ok = $false
        Write-Host "STOP: mismatch -- will NOT commit" -ForegroundColor Red
    } else {
        Write-Host "  All match!" -ForegroundColor Green
    }
}

# (7) Git add -- all app folders + core files (explicit, no wildcard)
# git の non-terminating warning (CRLF など) で Stop モードが throw して中断するのを防ぐため、
# git add/commit/push の間だけ ErrorActionPreference を Continue に切り替える。
$prevEAP = $ErrorActionPreference
$ErrorActionPreference = 'Continue'

if ($ok) {
    git add -- index.html PUBLISHED.md sitemap.xml daily-count.txt
    if ($LASTEXITCODE -ne 0) { LogError "git add index.html/PUBLISHED.md/sitemap.xml/daily-count.txt failed"; $ok = $false }
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

# git ブロック終了。ErrorActionPreference を元に戻す
$ErrorActionPreference = $prevEAP

# (9) Result summary
if ($ok) {
    $prev = $totalApps - $apps.Count
    Write-Host ""
    Write-Host "SUCCESS: $($apps.Count) apps published ($prev -> $totalApps)" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "FAILED: see errors above" -ForegroundColor Red
}

# (10) Post-publish helper scripts (per-script timeout; failure does NOT change $ok)
foreach ($s in @(
    @{ File = "sync-missing.py";   Label = "Sync check";         Timeout = 60  },
    @{ File = "check-apps.py";     Label = "Post-publish check"; Timeout = 600 },
    @{ File = "make-fix-queue.py"; Label = "Fix queue";          Timeout = 60  }
)) {
    $sp = Join-Path $pub $s.File
    if (Test-Path $sp) {
        Write-Output ""
        Write-Output "-- $($s.Label) --"
        $tmpOut = Join-Path $env:TEMP ("phase10_" + $s.File + ".out")
        $tmpErr = Join-Path $env:TEMP ("phase10_" + $s.File + ".err")
        $proc = Start-Process -FilePath python -ArgumentList @($sp) -NoNewWindow -PassThru `
            -RedirectStandardOutput $tmpOut -RedirectStandardError $tmpErr
        $timeoutMs = [int]$s.Timeout * 1000
        if ($proc.WaitForExit($timeoutMs)) {
            $exit = $proc.ExitCode
            if (Test-Path $tmpOut) { Get-Content -LiteralPath $tmpOut | ForEach-Object { Write-Output $_ } }
            if (Test-Path $tmpErr) { Get-Content -LiteralPath $tmpErr | ForEach-Object { Write-Output $_ } }
            if ($exit -eq 0) {
                Write-Output "$($s.Label): OK"
            } else {
                Write-Output "$($s.Label): issues found (exit=$exit)"
            }
        } else {
            try { Stop-Process -Id $proc.Id -Force -ErrorAction Stop } catch {}
            Write-Output ("PHASE10 TIMEOUT: " + $s.File + " (>" + $s.Timeout + "s, killed; publish OK 維持)")
        }
        Remove-Item -LiteralPath $tmpOut -ErrorAction SilentlyContinue
        Remove-Item -LiteralPath $tmpErr -ErrorAction SilentlyContinue
    }
}

Write-Host ""