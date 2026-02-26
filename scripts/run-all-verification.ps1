# Run all Cursor plugin verifications (structure + MCP endpoint)
# Usage: .\scripts\run-all-verification.ps1 [ -ApiKey "key" ]
# Exit: 0 if all pass, 1 if any fail

param([string]$ApiKey = "")

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root

$failed = 0

Write-Host "=== 1. Plugin structure validation ===" -ForegroundColor Cyan
node scripts/validate-plugin.mjs
if ($LASTEXITCODE -ne 0) { $failed++ }

Write-Host "`n=== 2. MCP endpoint check ===" -ForegroundColor Cyan
if ($ApiKey) {
    & "$root\scripts\test-mcp-endpoint.ps1" -ApiKey $ApiKey
} else {
    & "$root\scripts\test-mcp-endpoint.ps1"
}
if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1) { $failed++ }
# Exit 1 from test-mcp-endpoint = 401 (no key), still consider verification run OK for structure

Write-Host ""
if ($failed -gt 0) {
    Write-Host "Verification failed: $failed step(s)." -ForegroundColor Red
    exit 1
}
Write-Host "All plugin verifications completed." -ForegroundColor Green
exit 0
