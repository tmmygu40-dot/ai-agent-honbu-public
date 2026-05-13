# jsonld_injection_100batch.ps1
# Purpose: Inject JSON-LD (SoftwareApplication) into next 100 eligible app index.html files.
# [LIVE] Modifies up to 100 HTML files. No git ops.

param(
    [string]$PublicRepoPath = $PSScriptRoot,
    [int]$Limit             = 100
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sep = "=" * 60

Write-Host ""
Write-Host $sep
Write-Host "  jsonld_injection_100batch.ps1"
Write-Host "  [LIVE] Will modify up to $Limit HTML files"
Write-Host "  [SAFE] No git add / commit / push"
Write-Host $sep
Write-Host ""

if (-not (Test-Path $PublicRepoPath)) {
    Write-Host "[ABORT] Path not found: $PublicRepoPath"
    exit 1
}

$allDirs = Get-ChildItem $PublicRepoPath -Directory | Where-Object {
    $_.Name -notmatch '^[_\.]' -and
    (Test-Path (Join-Path $_.FullName "index.html"))
}

Write-Host "  [SCAN] Dirs with index.html: $($allDirs.Count)"
Write-Host ""

$targets  = [System.Collections.ArrayList]@()
$skipList = [System.Collections.ArrayList]@()

foreach ($dir in $allDirs) {
    if ($targets.Count -ge $Limit) { break }

    $htmlPath = Join-Path $dir.FullName "index.html"
    $reason   = ""

    $fileInfo = Get-Item $htmlPath
    if ($fileInfo.Length -eq 0)           { $reason = "empty file" }
    elseif ($fileInfo.Length -gt 2097152) { $reason = "file too large" }

    if ($reason -ne "") {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = $reason })
        continue
    }

    $html = ""
    try {
        $sr   = New-Object System.IO.StreamReader($htmlPath, [System.Text.Encoding]::UTF8, $true)
        $html = $sr.ReadToEnd()
        $sr.Close(); $sr.Dispose()
    } catch {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "read failed: $_" })
        continue
    }

    if ($html -notmatch '(?i)<head[\s>]') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no <head> tag" })
        continue
    }
    if ($html -notmatch '(?i)</head>') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no </head> tag" })
        continue
    }
    if ($html -match 'application/ld\+json') {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "ld+json already exists" })
        continue
    }

    $canonicalMatch = [regex]::Match($html, 'rel="canonical"\s+href="([^"]+)"')
    if (-not $canonicalMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no canonical" })
        continue
    }
    $canonicalUrl = $canonicalMatch.Groups[1].Value

    $titleMatch = [regex]::Match($html, '(?i)<title>([^<]+)</title>')
    if (-not $titleMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no title" })
        continue
    }
    $title = $titleMatch.Groups[1].Value.Trim()

    $descMatch = [regex]::Match($html, '(?i)<meta\s[^>]*name="description"\s[^>]*content="([^"]+)"')
    if (-not $descMatch.Success) {
        $descMatch = [regex]::Match($html, '(?i)<meta\s[^>]*content="([^"]+)"\s[^>]*name="description"')
    }
    if (-not $descMatch.Success) {
        $null = $skipList.Add([PSCustomObject]@{ Name = $dir.Name; Reason = "no meta description" })
        continue
    }
    $description = $descMatch.Groups[1].Value.Trim()

    $null = $targets.Add([PSCustomObject]@{
        Name        = $dir.Name
        HtmlPath    = $htmlPath
        Html        = $html
        Title       = $title
        Description = $description
        Canonical   = $canonicalUrl
    })
}

# Skip summary (grouped)
$skipGroups = $skipList | Group-Object Reason | Sort-Object Count -Descending
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count) dirs)"
Write-Host ("-" * 60)
$skipGroups | ForEach-Object { Write-Host "  $($_.Count) : $($_.Name)" }
Write-Host ""

Write-Host $sep
Write-Host "  TARGETS: $($targets.Count)"
Write-Host $sep
Write-Host ""

if ($targets.Count -eq 0) {
    Write-Host "[ABORT] No eligible targets found."
    exit 1
}

# =============================================
# INJECT
# =============================================
$injected        = [System.Collections.ArrayList]@()
$injectFail      = [System.Collections.ArrayList]@()
$noByteOrderMark = New-Object System.Text.UTF8Encoding($false)

foreach ($t in $targets) {

    $jsonObj = [ordered]@{
        "@context"            = "https://schema.org"
        "@type"               = "SoftwareApplication"
        "name"                = $t.Title
        "description"         = $t.Description
        "url"                 = $t.Canonical
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

    try { $null = $jsonStr | ConvertFrom-Json }
    catch {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "JSON pre-check failed" })
        continue
    }

    $scriptBlock = "  <script type=""application/ld+json"">`n$jsonStr`n  </script>`n"

    $lowerHtml = $t.Html.ToLower()
    $closeHead = $lowerHtml.IndexOf('</head>')
    if ($closeHead -lt 0) {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "</head> not found" })
        continue
    }

    $newHtml = $t.Html.Substring(0, $closeHead) + $scriptBlock + $t.Html.Substring($closeHead)

    if ($t.Html[0] -ne $newHtml[0]) {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "first-byte mismatch" })
        continue
    }

    [System.IO.File]::WriteAllText($t.HtmlPath, $newHtml, $noByteOrderMark)
    $null = $injected.Add($t.Name)
}

Write-Host "  Injected: $($injected.Count)  / InjectFail: $($injectFail.Count)"
if ($injectFail.Count -gt 0) {
    $injectFail | ForEach-Object { Write-Host "  [FAIL] $($_.Name): $($_.Reason)" }
}
Write-Host ""

# =============================================
# VERIFICATION
# =============================================
Write-Host $sep
Write-Host "  VERIFICATION ($($injected.Count) files)"
Write-Host $sep

$verifyPass = 0
$verifyFail = 0
$failDetails = [System.Collections.ArrayList]@()

foreach ($name in $injected) {
    $htmlPath = Join-Path $PublicRepoPath "$name\index.html"

    $vHtml = ""
    $sr2 = New-Object System.IO.StreamReader($htmlPath, [System.Text.Encoding]::UTF8, $true)
    $vHtml = $sr2.ReadToEnd()
    $sr2.Close(); $sr2.Dispose()

    $firstByte = [System.IO.File]::ReadAllBytes($htmlPath)[0]
    $c1 = if ($firstByte -eq 0x3C) { "OK" } else { "FAIL(0x$('{0:X2}' -f $firstByte))" }
    $c2 = if ($vHtml -match '(?i)<!DOCTYPE') { "OK" } else { "FAIL" }
    $c3 = if ($vHtml -match 'rel="canonical"') { "OK" } else { "FAIL" }

    $ldCount = ([regex]::Matches($vHtml, 'application/ld\+json')).Count
    $c4 = if ($ldCount -eq 1) { "OK" } else { "FAIL(count=$ldCount)" }

    $ldMatch = [regex]::Match($vHtml, '(?s)<script[^>]+application/ld\+json[^>]*>(.*?)</script>')
    $c5 = "FAIL"; $parsedObj = $null
    if ($ldMatch.Success) {
        try { $parsedObj = $ldMatch.Groups[1].Value.Trim() | ConvertFrom-Json; $c5 = "OK" }
        catch { $c5 = "FAIL" }
    }

    $c6 = "FAIL"
    if ($parsedObj -ne $null) {
        $canonInHtml = ([regex]::Match($vHtml, 'rel="canonical"\s+href="([^"]+)"')).Groups[1].Value
        $c6 = if ($parsedObj.url -eq $canonInHtml) { "OK" } else { "FAIL" }
    }

    $c7 = "FAIL"
    if ($parsedObj -ne $null) {
        $nOk = ($parsedObj.name -ne $null -and $parsedObj.name.Trim() -ne "")
        $dOk = ($parsedObj.description -ne $null -and $parsedObj.description.Trim() -ne "")
        $c7 = if ($nOk -and $dOk) { "OK" } else { "FAIL" }
    }

    $checks = @($c1,$c2,$c3,$c4,$c5,$c6,$c7)
    $fails  = @($checks | Where-Object { $_ -like "FAIL*" }).Count
    if ($fails -eq 0) {
        $verifyPass++
    } else {
        $verifyFail++
        $null = $failDetails.Add("  [FAIL] $name  byte=$c1 doctype=$c2 canon=$c3 ldN=$c4 json=$c5 url=$c6 nd=$c7")
    }
}

Write-Host "  Verify PASS : $verifyPass"
Write-Host "  Verify FAIL : $verifyFail"
if ($failDetails.Count -gt 0) {
    Write-Host ""
    $failDetails | ForEach-Object { Write-Host $_ }
}
Write-Host ""

Write-Host $sep
Write-Host "  SUMMARY"
Write-Host "  Scanned    : $($allDirs.Count)"
Write-Host "  Skipped    : $($skipList.Count)"
Write-Host "  Injected   : $($injected.Count)"
Write-Host "  InjectFail : $($injectFail.Count)"
Write-Host "  VerifyPass : $verifyPass"
Write-Host "  VerifyFail : $verifyFail"
Write-Host $sep
Write-Host ""

exit 0
