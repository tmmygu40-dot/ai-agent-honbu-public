# canonical_injection_dryrun.ps1
# Purpose: Detect app dirs without canonical tag and display planned URLs.
# SAFE: HTML files are never modified. No git ops. Dry-run only.

param(
    [string]$PublicRepoPath = $PSScriptRoot,
    [string]$Domain         = "https://nekopoke.jp",
    [int]$Limit             = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sep = "=" * 60

Write-Host ""
Write-Host $sep
Write-Host "  canonical_injection_dryrun.ps1"
Write-Host "  [SAFE] HTML files are NOT modified (dry-run only)"
Write-Host "  [SAFE] No git add / commit / push"
Write-Host $sep
Write-Host ""

if (-not (Test-Path $PublicRepoPath)) {
    Write-Host "[ABORT] Path not found: $PublicRepoPath"
    exit 1
}

Write-Host "  [SCAN] Collecting app directories..."

$allDirs = Get-ChildItem $PublicRepoPath -Directory | Where-Object {
    $_.Name -notmatch '^[_\.]' -and
    (Test-Path (Join-Path $_.FullName "index.html"))
}

Write-Host "  [SCAN] Dirs with index.html: $($allDirs.Count)"
Write-Host ""

$candidates = [System.Collections.ArrayList]@()
$skipList   = [System.Collections.ArrayList]@()

foreach ($dir in $allDirs) {
    $htmlPath = Join-Path $dir.FullName "index.html"
    $reason   = ""

    $fileInfo = Get-Item $htmlPath
    $sizeKB   = [math]::Round($fileInfo.Length / 1024)

    if ($fileInfo.Length -eq 0) {
        $reason = "empty file"
    } elseif ($fileInfo.Length -gt 2097152) {
        $reason = "file too large (${sizeKB}KB)"
    } else {
        $html = ""
        try {
            $html = Get-Content $htmlPath -Encoding UTF8 -Raw
        } catch {
            $reason = "read failed"
        }

        if ($reason -eq "") {
            if ($html -notmatch '<head') {
                $reason = "no <head> tag"
            } elseif ($html -notmatch '</head>') {
                $reason = "no </head> tag"
            } elseif ($html -match 'rel="canonical"' -or $html -match "rel='canonical'") {
                $reason = "canonical already exists"
            }
        }
    }

    if ($reason -ne "") {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = $reason })
    } else {
        $encoded = [Uri]::EscapeDataString($dir.Name)
        $url     = $Domain + "/" + $encoded + "/"
        $null = $candidates.Add([PSCustomObject]@{ Name = $dir.Name; Encoded = $encoded; Url = $url })
    }
}

# --- Skip list ---
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count) dirs)"
Write-Host ("-" * 60)
if ($skipList.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $skipList | ForEach-Object {
        Write-Host "  [SKIP] $($_.Name)  reason: $($_.Reason)"
    }
}
Write-Host ""

# --- Candidates (top Limit) ---
$targets = $candidates | Select-Object -First $Limit

Write-Host $sep
Write-Host "  [DRY-RUN] canonical candidates  (top $Limit / total $($candidates.Count))"
Write-Host $sep
Write-Host ""

$i = 1
foreach ($t in $targets) {
    Write-Host "  [$i] $($t.Name)"
    Write-Host "      will add: <link rel=""canonical"" href=""$($t.Url)"">"
    $i++
}

Write-Host ""
Write-Host $sep
Write-Host "  SUMMARY"
Write-Host "  Total dirs scanned : $($allDirs.Count)"
Write-Host "  Skipped            : $($skipList.Count)"
Write-Host "  Need canonical     : $($candidates.Count)"
Write-Host "  Shown here         : $($targets.Count) (top $Limit)"
Write-Host ""
Write-Host "  [CONFIRMED] No HTML files were modified."
Write-Host $sep
Write-Host ""

exit 0
