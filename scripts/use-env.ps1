# Load .env from repo root into the current PowerShell session (for wrangler deploy / whoami).
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"
if (-not (Test-Path $envFile)) {
    Write-Error ".env not found at $envFile — copy .env.example to .env and fill in values."
}
Get-Content $envFile | ForEach-Object {
    $line = $_.Trim()
    if ($line -eq "" -or $line.StartsWith("#")) { return }
    if ($line -match '^([A-Za-z_][A-Za-z0-9_]*)=(.*)$') {
        $name = $matches[1]
        $value = $matches[2].Trim()
        if ($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length - 2)
        }
        Set-Item -Path "env:$name" -Value $value
    }
}
Write-Host "[use-env] loaded $(Join-Path $root '.env') — run wrangler whoami / npm run deploy next."
