# jsonld_injection_9test.ps1
# Purpose: Inject JSON-LD (SoftwareApplication) into next 9 eligible app index.html files.
# [LIVE] Modifies up to 9 HTML files. No git ops.

param(
    [string]$PublicRepoPath = $PSScriptRoot,
    [int]$Limit             = 9
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$sep = "=" * 60

Write-Host ""
Write-Host $sep
Write-Host "  jsonld_injection_9test.ps1"
Write-Host "  [LIVE] Will modify up to $Limit HTML files"
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

$targets  = [System.Collections.ArrayList]@()
$skipList = [System.Collections.ArrayList]@()

foreach ($dir in $allDirs) {
    if ($targets.Count -ge $Limit) { break }

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

    $null = $targets.Add([PSCustomObject]@{
        Name        = $dir.Name
        HtmlPath    = $htmlPath
        Html        = $html
        Title       = $title
        Description = $description
        Canonical   = $canonicalUrl
    })
}

# --- Skip list ---
Write-Host ("-" * 60)
Write-Host "  SKIPPED ($($skipList.Count) dirs)"
Write-Host ("-" * 60)
$skipList | ForEach-Object { Write-Host "  [SKIP] $($_.Name)  reason: $($_.Reason)" }
Write-Host ""

Write-Host $sep
Write-Host "  TARGETS: $($targets.Count)"
Write-Host $sep
$targets | ForEach-Object { Write-Host "  -> $($_.Name)" }
Write-Host ""

if ($targets.Count -eq 0) {
    Write-Host "[ABORT] No eligible targets found."
    exit 1
}

# =============================================
# INJECT
# =============================================
$injected    = [System.Collections.ArrayList]@()
$injectFail  = [System.Collections.ArrayList]@()
$noByteOrderMark = New-Object System.Text.UTF8Encoding($false)

foreach ($t in $targets) {

    Write-Host "  [INJECT] $($t.Name)"

    # Build JSON-LD
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

    # Validate JSON before injection
    try {
        $null = $jsonStr | ConvertFrom-Json
    } catch {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "JSON parse pre-check failed: $_" })
        Write-Host "    [SKIP] JSON parse failed"
        continue
    }

    # Build script block
    $scriptBlock = "  <script type=""application/ld+json"">`n$jsonStr`n  </script>`n"

    # Find </head> position
    $lowerHtml = $t.Html.ToLower()
    $closeHead = $lowerHtml.IndexOf('</head>')
    if ($closeHead -lt 0) {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "</head> not found" })
        Write-Host "    [SKIP] </head> not found"
        continue
    }

    # Build new HTML
    $newHtml = $t.Html.Substring(0, $closeHead) + $scriptBlock + $t.Html.Substring($closeHead)

    # First-byte safety check
    if ($t.Html[0] -ne $newHtml[0]) {
        $null = $injectFail.Add([PSCustomObject]@{ Name = $t.Name; Reason = "first-byte mismatch" })
        Write-Host "    [ABORT] First-byte mismatch"
        continue
    }

    # Write UTF-8 no BOM
    [System.IO.File]::WriteAllText($t.HtmlPath, $newHtml, $noByteOrderMark)
    $null = $injected.Add($t.Name)
    Write-Host "    [OK] Written"
}

Write-Host ""

# =============================================
# VERIFICATION
# =============================================
Write-Host $sep
Write-Host "  VERIFICATION ($($injected.Count) files)"
Write-Host $sep
Write-Host ""

$verifyPass = 0
$verifyFail = 0

foreach ($name in $injected) {
    $htmlPath = Join-Path $PublicRepoPath "$name\index.html"

    $vHtml = ""
    $sr2 = New-Object System.IO.StreamReader($htmlPath, [System.Text.Encoding]::UTF8, $true)
    $vHtml = $sr2.ReadToEnd()
    $sr2.Close(); $sr2.Dispose()

    # 1. First byte
    $firstByte = [System.IO.File]::ReadAllBytes($htmlPath)[0]
    $c1 = if ($firstByte -eq 0x3C) { "OK" } else { "FAIL(0x$('{0:X2}' -f $firstByte))" }

    # 2. DOCTYPE
    $c2 = if ($vHtml -match '(?i)<!DOCTYPE') { "OK" } else { "FAIL" }

    # 3. canonical present
    $c3 = if ($vHtml -match 'rel="canonical"') { "OK" } else { "FAIL" }

    # 4. ld+json count = 1
    $ldCount = ([regex]::Matches($vHtml, 'application/ld\+json')).Count
    $c4 = if ($ldCount -eq 1) { "OK" } else { "FAIL(count=$ldCount)" }

    # 5. JSON parse
    $ldMatch = [regex]::Match($vHtml, '(?s)<script[^>]+application/ld\+json[^>]*>(.*?)</script>')
    $c5 = "FAIL"
    $parsedObj = $null
    if ($ldMatch.Success) {
        try { $parsedObj = $ldMatch.Groups[1].Value.Trim() | ConvertFrom-Json; $c5 = "OK" }
        catch { $c5 = "FAIL" }
    }

    # 6. url == canonical
    $c6 = "FAIL"
    if ($parsedObj -ne $null) {
        $canonInHtml = ([regex]::Match($vHtml, 'rel="canonical"\s+href="([^"]+)"')).Groups[1].Value
        $c6 = if ($parsedObj.url -eq $canonInHtml) { "OK" } else { "FAIL" }
    }

    # 7. name/desc not empty
    $c7 = "FAIL"
    if ($parsedObj -ne $null) {
        $nOk = ($parsedObj.name -ne $null -and $parsedObj.name.Trim() -ne "")
        $dOk = ($parsedObj.description -ne $null -and $parsedObj.description.Trim() -ne "")
        $c7 = if ($nOk -and $dOk) { "OK" } else { "FAIL" }
    }

    $checks = @($c1,$c2,$c3,$c4,$c5,$c6,$c7)
    $fails  = @($checks | Where-Object { $_ -like "FAIL*" }).Count
    $result = if ($fails -eq 0) { "PASS" } else { "FAIL($fails)" }
    if ($fails -eq 0) { $verifyPass++ } else { $verifyFail++ }

    Write-Host "  [$result] $name"
    Write-Host "    (1)byte=$c1  (2)DOCTYPE=$c2  (3)canonical=$c3  (4)ldCount=$c4"
    Write-Host "    (5)JSON=$c5  (6)url=$c6  (7)nameDesc=$c7"
    Write-Host ""
}

# =============================================
# SUMMARY
# =============================================
Write-Host $sep
Write-Host "  SUMMARY"
Write-Host "  Scanned   : $($allDirs.Count)"
Write-Host "  Skipped   : $($skipList.Count)"
Write-Host "  Injected  : $($injected.Count)"
Write-Host "  Inject NG : $($injectFail.Count)"
Write-Host "  Verify OK : $verifyPass"
Write-Host "  Verify NG : $verifyFail"
Write-Host $sep
Write-Host ""

exit 0
