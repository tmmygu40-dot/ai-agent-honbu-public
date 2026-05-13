# jsonld_injection_10test.ps1
# Purpose: Preview JSON-LD (SoftwareApplication) for first 10 eligible app dirs.
# SAFE: HTML files are NEVER modified. No git ops. Dry-run / preview only.

param(
    [string]$PublicRepoPath = $PSScriptRoot,
    [int]$Limit             = 10
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sep = "=" * 60

Write-Host ""
Write-Host $sep
Write-Host "  jsonld_injection_10test.ps1"
Write-Host "  [SAFE] HTML files are NOT modified (dry-run / preview only)"
Write-Host "  [SAFE] No git add / commit / push"
Write-Host "  Limit: $Limit"
Write-Host $sep
Write-Host ""

if (-not (Test-Path $PublicRepoPath)) {
    Write-Host "[ABORT] Path not found: $PublicRepoPath"
    exit 1
}

# Collect app dirs
$allDirs = Get-ChildItem $PublicRepoPath -Directory | Where-Object {
    $_.Name -notmatch '^[_\.]' -and
    (Test-Path (Join-Path $_.FullName "index.html"))
}

Write-Host "  [SCAN] Dirs with index.html: $($allDirs.Count)"
Write-Host ""

$candidates  = [System.Collections.ArrayList]@()
$skipList    = [System.Collections.ArrayList]@()

foreach ($dir in $allDirs) {
    if ($candidates.Count -ge $Limit) { break }

    $htmlPath = Join-Path $dir.FullName "index.html"
    $reason   = ""

    # File-level safety checks
    $fileInfo = Get-Item $htmlPath
    if ($fileInfo.Length -eq 0)         { $reason = "empty file" }
    elseif ($fileInfo.Length -gt 2097152) { $reason = "file too large" }

    if ($reason -ne "") {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = $reason })
        continue
    }

    # Read HTML
    $html = ""
    try {
        $sr   = New-Object System.IO.StreamReader($htmlPath, [System.Text.Encoding]::UTF8, $true)
        $html = $sr.ReadToEnd()
        $sr.Close(); $sr.Dispose()
    } catch {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "read failed: $_" })
        continue
    }

    # Skip: no <head>
    if ($html -notmatch '(?i)<head[\s>]') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no <head> tag" })
        continue
    }

    # Skip: no </head>
    if ($html -notmatch '(?i)</head>') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no </head> tag" })
        continue
    }

    # Skip: existing ld+json
    if ($html -match 'application/ld\+json') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "ld+json already exists" })
        continue
    }

    # Skip: no canonical
    $canonicalMatch = [regex]::Match($html, 'rel="canonical"\s+href="([^"]+)"')
    if (-not $canonicalMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no canonical tag" })
        continue
    }
    $canonicalUrl = $canonicalMatch.Groups[1].Value

    # Skip: no title
    $titleMatch = [regex]::Match($html, '(?i)<title>([^<]+)</title>')
    if (-not $titleMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no <title> tag" })
        continue
    }
    $title = $titleMatch.Groups[1].Value.Trim()

    # Skip: no meta description
    $descMatch = [regex]::Match($html, '(?i)<meta\s[^>]*name="description"\s[^>]*content="([^"]+)"')
    if (-not $descMatch.Success) {
        $descMatch = [regex]::Match($html, '(?i)<meta\s[^>]*content="([^"]+)"\s[^>]*name="description"')
    }
    if (-not $descMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no meta description" })
        continue
    }
    $description = $descMatch.Groups[1].Value.Trim()

    $null = $candidates.Add([PSCustomObject]@{
        Name        = $dir.Name
        Title       = $title
        Description = $description
        Canonical   = $canonicalUrl
    })
}

# --- Skip list ---
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count) dirs)"
Write-Host ("-" * 60)
if ($skipList.Count -eq 0) {
    Write-Host "  (none)"
} else {
    $skipList | ForEach-Object { Write-Host "  [SKIP] $($_.Name)  reason: $($_.Reason)" }
}
Write-Host ""

# --- Preview + JSON validation ---
Write-Host $sep
Write-Host "  [DRY-RUN] JSON-LD preview  ($($candidates.Count) candidates)"
Write-Host $sep
Write-Host ""

$parseOk   = 0
$parseFail = 0

foreach ($c in $candidates) {

    # Build JSON-LD as PowerShell ordered hashtable -> ConvertTo-Json (safe, no manual concat)
    $jsonObj = [ordered]@{
        "@context"            = "https://schema.org"
        "@type"               = "SoftwareApplication"
        "name"                = $c.Title
        "description"         = $c.Description
        "url"                 = $c.Canonical
        "applicationCategory" = "WebApplication"
        "operatingSystem"     = "Web"
        "inLanguage"          = "ja"
        "isAccessibleForFree" = $true
        "offers"              = [ordered]@{
            "@type"          = "Offer"
            "price"          = "0"
            "priceCurrency"  = "JPY"
        }
        "publisher"           = [ordered]@{
            "@type" = "Organization"
            "name"  = "ネコポケ"
            "url"   = "https://nekopoke.jp/"
        }
    }

    $jsonStr = $jsonObj | ConvertTo-Json -Depth 5

    # Validate: parse the generated JSON
    $parseResult = "OK"
    try {
        $null = $jsonStr | ConvertFrom-Json
        $parseOk++
    } catch {
        $parseResult = "FAIL: $_"
        $parseFail++
    }

    Write-Host "  [$($c.Name)]"
    Write-Host "    canonical : $($c.Canonical)"
    Write-Host "    title     : $($c.Title)"
    Write-Host "    desc      : $($c.Description.Substring(0, [Math]::Min(60, $c.Description.Length)))..."
    Write-Host "    JSON parse: $parseResult"
    Write-Host ""
    Write-Host $jsonStr
    Write-Host ""
    Write-Host ("-" * 40)
    Write-Host ""
}

# --- Summary ---
Write-Host $sep
Write-Host "  SUMMARY"
Write-Host "  Scanned       : $($allDirs.Count)"
Write-Host "  Skipped       : $($skipList.Count)"
Write-Host "  Candidates    : $($candidates.Count)"
Write-Host "  JSON parse OK : $parseOk"
Write-Host "  JSON parse NG : $parseFail"
Write-Host ""
Write-Host "  [CONFIRMED] No HTML files were modified."
Write-Host $sep
Write-Host ""

exit 0
