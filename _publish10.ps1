$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$apps = Get-Content -LiteralPath ./_publish_apps.txt -Encoding UTF8 | Where-Object { $_ -ne '' }
& .\publish-batch.ps1 -InputApps $apps
