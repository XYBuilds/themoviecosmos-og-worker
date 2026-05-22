# Deploy: load .env → sync wrangler.toml → wrangler deploy
$ErrorActionPreference = "Stop"
. (Join-Path $PSScriptRoot "use-env.ps1")
. (Join-Path $PSScriptRoot "sync-wrangler-from-env.ps1")
Push-Location (Split-Path -Parent $PSScriptRoot)
try {
    npx wrangler deploy
} finally {
    Pop-Location
}
