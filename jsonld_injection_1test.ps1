﻿# jsonld_injection_1test.ps1
# Purpose: Inject JSON-LD (SoftwareApplication) into ONE eligible app's index.html
# [LIVE] Modifies exactly 1 HTML file. No git ops.

param(
    [string]$PublicRepoPath = $PSScriptRoot
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sep = "=" * 60

Write-Host ""
Write-Host $sep
Write-Host "  jsonld_injection_1test.ps1"
Write-Host "  [LIVE] Will modify 1 HTML file"
Write-Host "  [SAFE] No git add / commit / push"
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

$target   = $null
$skipList = [System.Collections.ArrayList]@()

foreach ($dir in $allDirs) {
    if ($target -ne $null) { break }

    $htmlPath = Join-Path $dir.FullName "index.html"
    $reason   = ""

    # File-level safety checks
    $fileInfo = Get-Item $htmlPath
    if ($fileInfo.Length -eq 0)          { $reason = "empty file" }
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

    $target = [PSCustomObject]@{
        Name        = $dir.Name
        HtmlPath    = $htmlPath
        Html        = $html
        Title       = $title
        Description = $description
        Canonical   = $canonicalUrl
    }
}

# --- Skip list ---
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count) dirs before target)"
Write-Host ("-" * 60)
$skipList | ForEach-Object { Write-Host "  [SKIP] $($_.Name)  reason: $($_.Reason)" }
Write-Host ""

if ($target -eq $null) {
    Write-Host "[ABORT] No eligible target found."
    exit 1
}

Write-Host $sep
Write-Host "  TARGET: $($target.Name)"
Write-Host "  path  : $($target.HtmlPath)"
Write-Host "  canonical: $($target.Canonical)"
Write-Host "  title    : $($target.Title)"
Write-Host $sep
Write-Host ""

# --- Build JSON-LD ---
$jsonObj = [ordered]@{
    "@context"            = "https://schema.org"
    "@type"               = "SoftwareApplication"
    "name"                = $target.Title
    "description"         = $target.Description
    "url"                 = $target.Canonical
    "applicationCategory" = "WebApplication"
    "operatingSystem"     = "Web"
    "inLanguage"          = "ja"
    "isAccessibleForFree" = $true
    "offers"              = [ordered]@{
        "@type"         = "Offer"
        "price"         = "0"
        "priceCurrency" = "JPY"
    }
    "publisher"           = [ordered]@{
        "@type" = "Organization"
        "name"  = "ネコポケ"
        "url"   = "https://nekopoke.jp/"
    }
}

$jsonStr = $jsonObj | ConvertTo-Json -Depth 5

# Validate JSON before injection
try {
    $null = $jsonStr | ConvertFrom-Json
    Write-Host "  [CHECK] JSON parse: OK"
} catch {
    Write-Host "[ABORT] JSON parse failed: $_"
    exit 1
}

# --- Build script block to inject ---
$scriptBlock = "  <script type=""application/ld+json"">`n$jsonStr`n  </script>`n"

# --- Find </head> position (case-insensitive) ---
$lowerHtml = $target.Html.ToLower()
$closeHead = $lowerHtml.IndexOf('</head>')
if ($closeHead -lt 0) {
    Write-Host "[ABORT] </head> not found in: $($target.HtmlPath)"
    exit 1
}

# --- Build new HTML ---
$newHtml = $target.Html.Substring(0, $closeHead) + $scriptBlock + $target.Html.Substring($closeHead)

# --- First-byte safety check ---
if ($target.Html[0] -ne $newHtml[0]) {
    Write-Host "[ABORT] First-byte mismatch. Injection would corrupt file. Aborting."
    exit 1
}
Write-Host "  [CHECK] First-byte: OK ($([int][char]$newHtml[0]) = 0x$('{0:X2}' -f [int][char]$newHtml[0]))"

# --- Write UTF-8 no BOM ---
$noByteOrderMark = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target.HtmlPath, $newHtml, $noByteOrderMark)
Write-Host "  [WRITE] Done: $($target.HtmlPath)"
Write-Host ""

# =============================================
# VERIFICATION
# =============================================
Write-Host $sep
Write-Host "  VERIFICATION: $($target.Name)"
Write-Host $sep

$vHtml = ""
$sr2 = New-Object System.IO.StreamReader($target.HtmlPath, [System.Text.Encoding]::UTF8, $true)
$vHtml = $sr2.ReadToEnd()
$sr2.Close(); $sr2.Dispose()

# 1. First byte
$firstByte = [System.IO.File]::ReadAllBytes($target.HtmlPath)[0]
$check1 = if ($firstByte -eq 0x3C) { "OK (0x3C = '<')" } else { "FAIL (0x$('{0:X2}' -f $firstByte))" }
Write-Host "  [1] First byte        : $check1"

# 2. DOCTYPE
$check2 = if ($vHtml -match '(?i)<!DOCTYPE') { "OK" } else { "FAIL - DOCTYPE missing" }
Write-Host "  [2] DOCTYPE           : $check2"

# 3. canonical not removed
$check3 = if ($vHtml -match 'rel="canonical"') { "OK" } else { "FAIL - canonical missing" }
Write-Host "  [3] canonical present : $check3"

# 4. ld+json count = 1
$ldCount = ([regex]::Matches($vHtml, 'application/ld\+json')).Count
$check4 = if ($ldCount -eq 1) { "OK (count=1)" } else { "FAIL (count=$ldCount)" }
Write-Host "  [4] ld+json count     : $check4"

# 5. JSON parse
$ldMatch = [regex]::Match($vHtml, '(?s)<script[^>]+application/ld\+json[^>]*>(.*?)</script>')
$check5 = "FAIL - block not found"
if ($ldMatch.Success) {
    try {
        $parsed = $ldMatch.Groups[1].Value.Trim() | ConvertFrom-Json
        $check5 = "OK"
    } catch {
        $check5 = "FAIL - parse error: $_"
    }
}
Write-Host "  [5] JSON parse        : $check5"

# 6. url matches canonical
$check6 = "FAIL"
if ($ldMatch.Success) {
    try {
        $parsedUrl = ($ldMatch.Groups[1].Value.Trim() | ConvertFrom-Json).url
        $canonInHtml = ([regex]::Match($vHtml, 'rel="canonical"\s+href="([^"]+)"')).Groups[1].Value
        $check6 = if ($parsedUrl -eq $canonInHtml) { "OK ($parsedUrl)" } else { "FAIL: ld+json.url=$parsedUrl  canonical=$canonInHtml" }
    } catch { $check6 = "FAIL - $_" }
}
Write-Host "  [6] url == canonical  : $check6"

# 7. name / description not empty
$check7 = "FAIL"
if ($ldMatch.Success) {
    try {
        $p = $ldMatch.Groups[1].Value.Trim() | ConvertFrom-Json
        $nameOk = ($p.name -ne $null -and $p.name.Trim() -ne "")
        $descOk = ($p.description -ne $null -and $p.description.Trim() -ne "")
        $check7 = if ($nameOk -and $descOk) { "OK (name='$($p.name.Substring(0,[Math]::Min(20,$p.name.Length)))...')" } else { "FAIL name=$nameOk desc=$descOk" }
    } catch { $check7 = "FAIL - $_" }
}
Write-Host "  [7] name/desc not empty: $check7"

Write-Host ""

# --- Pass / Fail ---
$allChecks = @($check1, $check2, $check3, $check4, $check5, $check6, $check7)
$failCount = @($allChecks | Where-Object { $_ -like "FAIL*" }).Count
if ($failCount -eq 0) {
    Write-Host "  [RESULT] ALL 7 CHECKS PASSED"
} else {
    Write-Host "  [RESULT] $failCount CHECK(S) FAILED"
}
Write-Host $sep
Write-Host ""

exit 0
