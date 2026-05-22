# Sync wrangler.toml from .env: account_id, KV id/preview_id (SSOT: .env).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
$tomlFile = Join-Path $root "wrangler.toml"

if (-not (Test-Path $envFile)) {
    Write-Error ".env not found — copy .env.example to .env and fill Cloudflare fields."
}

$ns = $null
$accountId = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*OG_INDEX_KV_NAMESPACE_ID=(.+)$') {
        $ns = $matches[1].Trim().Trim('"')
    }
    if ($_ -match '^\s*CLOUDFLARE_ACCOUNT_ID=(.+)$') {
        $accountId = $matches[1].Trim().Trim('"')
    }
}

if (-not $ns -or $ns -match '^(your_|REPLACE)') {
    Write-Error "OG_INDEX_KV_NAMESPACE_ID missing or placeholder in .env"
}
if (-not $accountId -or $accountId -match '^(your_|REPLACE)') {
    Write-Error "CLOUDFLARE_ACCOUNT_ID missing or placeholder in .env"
}

$content = Get-Content $tomlFile -Raw -Encoding UTF8
$updated = $content -replace '(?m)^account_id = "[^"]*"\r?\n', ""
$updated = $updated -replace '(?m)^id = "[^"]*"', "id = `"$ns`""
$updated = $updated -replace '(?m)^preview_id = "[^"]*"', "preview_id = `"$ns`""
if ($updated -notmatch '(?m)^account_id = ') {
    $updated = $updated -replace '(?m)^(name = "themoviecosmos-og"\r?\n)', "`$1account_id = `"$accountId`"`n"
}

if ($updated -eq $content) {
    Write-Host "[sync-wrangler] wrangler.toml already matches .env (account_id + KV ids)"
} else {
    [System.IO.File]::WriteAllText($tomlFile, $updated)
    Write-Host "[sync-wrangler] updated wrangler.toml from .env (account_id + KV ids)"
}
