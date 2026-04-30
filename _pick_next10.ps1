$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$dev = 'C:\Users\tmmyg\OneDrive\デスクトップ\AIエージェント本部'
$pub = 'C:\Users\tmmyg\OneDrive\デスクトップ\ai-agent-honbu-public'
$u = Get-ChildItem -LiteralPath $dev -Directory |
    Where-Object { $_.Name -notmatch '^[_\.]' } |
    Where-Object { @('.git','node_modules') -notcontains $_.Name } |
    Where-Object { Test-Path (Join-Path $_.FullName 'index.html') } |
    Where-Object { -not (Test-Path (Join-Path (Join-Path $pub $_.Name) 'index.html')) } |
    Sort-Object Name |
    Select-Object -ExpandProperty Name -First 10
$u | Out-File -LiteralPath (Join-Path $pub '_publish_apps.txt') -Encoding UTF8
$u | ForEach-Object { Write-Output $_ }
