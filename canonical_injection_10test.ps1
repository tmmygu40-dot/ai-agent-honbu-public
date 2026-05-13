# canonical_injection_10test.ps1
# Purpose: Inject canonical tag into first 10 app index.html files (no canonical yet).
# SAFE: Only 10 files. No git ops. No worker/publish/fix.
#
# Fix v2: BOM detection removed. Use StreamReader for read, IndexOf+Substring for inject.
# Safety check: first char must not change before write.

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
Write-Host "  canonical_injection_10test.ps1  [v2]"
Write-Host "  [SAFE] Limit: $Limit files only"
Write-Host "  [SAFE] No git add / commit / push"
Write-Host "  [SAFE] No worker / publish / fix"
Write-Host $sep
Write-Host ""

if (-not (Test-Path $PublicRepoPath)) {
    Write-Host "[ABORT] Path not found: $PublicRepoPath"
    exit 1
}

$noByteOrderMark = New-Object System.Text.UTF8Encoding($false)

# --- Collect dirs ---
$allDirs = Get-ChildItem $PublicRepoPath -Directory | Where-Object {
    $_.Name -notmatch '^[_\.]' -and
    (Test-Path (Join-Path $_.FullName "index.html"))
}

Write-Host "  [SCAN] Dirs with index.html: $($allDirs.Count)"
Write-Host ""

$doneList = [System.Collections.ArrayList]@()
$skipList = [System.Collections.ArrayList]@()
$processed = 0

foreach ($dir in $allDirs) {
    if ($processed -ge $Limit) { break }

    $htmlPath = Join-Path $dir.FullName "index.html"
    $reason   = ""

    # --- File-level safety checks ---
    $fileInfo = Get-Item $htmlPath
    if ($fileInfo.Length -eq 0) {
        $reason = "empty file"
    } elseif ($fileInfo.Length -gt 2097152) {
        $reason = "file too large"
    }

    if ($reason -ne "") {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = $reason })
        continue
    }

    # --- Read: StreamReader handles BOM transparently ---
    $html = ""
    try {
        $sr   = New-Object System.IO.StreamReader($htmlPath, [System.Text.Encoding]::UTF8, $true)
        $html = $sr.ReadToEnd()
        $sr.Close()
        $sr.Dispose()
    } catch {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "read failed: $_" })
        continue
    }

    # --- HTML safety checks ---
    if ($html -notmatch '(?i)<head[\s>]') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no <head> tag" })
        continue
    }
    if ($html -match 'rel="canonical"' -or $html -match "rel='canonical'") {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "canonical already exists" })
        continue
    }

    # --- Find </head> (case-insensitive) with IndexOf ---
    $lowerHtml  = $html.ToLower()
    $closeHead  = $lowerHtml.IndexOf('</head>')
    if ($closeHead -lt 0) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no </head> found" })
        continue
    }

    # --- Build canonical tag (single line, no trailing newline in tag itself) ---
    $encoded      = [Uri]::EscapeDataString($dir.Name)
    $canonicalUrl = "$Domain/$encoded/"
    $tagLine      = "  <link rel=""canonical"" href=""$canonicalUrl"" />`n"

    # --- Inject: insert tagLine immediately before </head> ---
    $newHtml = $html.Substring(0, $closeHead) + $tagLine + $html.Substring($closeHead)

    # --- Safety check: first character must not have changed ---
    if ($newHtml.Length -lt 1 -or $html[0] -ne $newHtml[0]) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "SAFETY: first char changed, abort write" })
        continue
    }

    # --- Safety check: canonical must be present in new content ---
    if ($newHtml -notmatch 'rel="canonical"') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "SAFETY: canonical not found after inject" })
        continue
    }

    # --- Write back: UTF-8, no BOM ---
    try {
        [System.IO.File]::WriteAllText($htmlPath, $newHtml, $noByteOrderMark)
    } catch {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "write failed: $_" })
        continue
    }

    # --- Verify written file first byte ---
    $firstByte = ([System.IO.File]::ReadAllBytes($htmlPath))[0]
    if ($firstByte -ne [byte]$html[0]) {
        Write-Host "  [WARN] First byte mismatch after write: $($dir.Name)  expected=$([byte]$html[0])  got=$firstByte"
    }

    $null = $doneList.Add([PSCustomObject]@{ Name = $dir.Name; Url = $canonicalUrl })
    $processed++
    Write-Host "  [DONE] $($dir.Name)"
    Write-Host "         canonical: $canonicalUrl"
}

# --- Skip list ---
Write-Host ""
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count))"
Write-Host ("-" * 60)
if ($skipList.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $skipList | ForEach-Object { Write-Host "  [SKIP] $($_.Name)  reason: $($_.Reason)" }
}

# --- Summary ---
Write-Host ""
Write-Host $sep
Write-Host "  SUMMARY"
Write-Host "  Processed (success) : $($doneList.Count)"
Write-Host "  Skipped             : $($skipList.Count)"
Write-Host ""
Write-Host "  canonical added:"
$doneList | ForEach-Object { Write-Host "    $($_.Url)" }
Write-Host ""
Write-Host "  [CONFIRMED] No git add / commit / push executed."
Write-Host $sep
Write-Host ""

exit 0
