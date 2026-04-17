<#
.SYNOPSIS
    End-to-end smoke test for the AgentStack OAuth 2.1 Device Code flow.

.DESCRIPTION
    Runs hooks/scripts/device-code.mjs against a test AgentStack instance,
    scrapes the user_code from stdout, auto-approves via the backend as a
    test user, and verifies ~/.cursor/mcp.json ends up with a Bearer header.

    Intended for local developers and CI. Requires:
      - Node 18+ on PATH
      - A reachable AgentStack instance with the device-code endpoints
      - An AGENTSTACK_TEST_COOKIE env var with a session cookie for a test user
        (session auth is what /api/oauth2/device/approve requires)

.EXAMPLE
    $env:AGENTSTACK_BASE_URL = "https://staging.agentstack.tech"
    $env:AGENTSTACK_TEST_COOKIE = "session=eyJ..."
    ./scripts/test-device-code.ps1

#>

[CmdletBinding()]
param(
    [string]$BaseUrl = $env:AGENTSTACK_BASE_URL,
    [string]$TestCookie = $env:AGENTSTACK_TEST_COOKIE,
    [switch]$KeepMcp
)

$ErrorActionPreference = 'Stop'
if (-not $BaseUrl) { $BaseUrl = 'https://agentstack.tech' }

function Write-Step($msg) { Write-Host "[test-device-code] $msg" -ForegroundColor Cyan }
function Write-Pass($msg) { Write-Host "[PASS] $msg" -ForegroundColor Green }
function Write-Fail($msg) { Write-Host "[FAIL] $msg" -ForegroundColor Red; exit 1 }

if (-not $TestCookie) {
    Write-Fail "AGENTSTACK_TEST_COOKIE env var is required (a session cookie for a test user)."
}

$pluginRoot = Split-Path -Parent $PSScriptRoot
$script = Join-Path $pluginRoot 'hooks/scripts/device-code.mjs'
if (-not (Test-Path $script)) { Write-Fail "device-code.mjs not found at $script" }

$mcpPath = Join-Path $HOME '.cursor/mcp.json'
$mcpBackup = "$mcpPath.bak-$(Get-Date -Format yyyyMMddHHmmss)"
if ((Test-Path $mcpPath) -and -not $KeepMcp) {
    Copy-Item $mcpPath $mcpBackup -Force
    Write-Step "backed up $mcpPath -> $mcpBackup"
}

Write-Step "launching device-code.mjs (base=$BaseUrl) ..."
$env:AGENTSTACK_BASE_URL = $BaseUrl
$job = Start-Job -ScriptBlock {
    param($script)
    & node $script --headless 2>&1
} -ArgumentList $script

Write-Step "polling job output for user_code ..."
$userCode = $null
$deadline = (Get-Date).AddSeconds(60)
while ((Get-Date) -lt $deadline -and -not $userCode) {
    Start-Sleep -Milliseconds 500
    $output = Receive-Job -Job $job -Keep
    foreach ($line in $output) {
        if ($line -match 'Code:\s+([A-Z0-9-]{6,12})') {
            $userCode = $Matches[1]
            break
        }
    }
}
if (-not $userCode) {
    Stop-Job $job -Force; Remove-Job $job -Force
    Write-Fail "did not observe a user_code in device-code.mjs output within 60s"
}
Write-Pass "user_code observed: $userCode"

Write-Step "approving user_code via $BaseUrl/api/oauth2/device/approve ..."
try {
    $resp = Invoke-RestMethod -Method Post `
        -Uri "$BaseUrl/api/oauth2/device/approve" `
        -Headers @{ 'Cookie' = $TestCookie; 'Content-Type' = 'application/json' } `
        -Body (@{ user_code = $userCode } | ConvertTo-Json)
    if (-not $resp.success) { Write-Fail "approve returned success=false" }
    Write-Pass "approved; scopes_granted=$($resp.scopes_granted -join ',')"
} catch {
    Stop-Job $job -Force; Remove-Job $job -Force
    Write-Fail "approve failed: $($_.Exception.Message)"
}

Write-Step "waiting for device-code.mjs to write Bearer into $mcpPath ..."
$deadline = (Get-Date).AddSeconds(60)
$bearerFound = $false
while ((Get-Date) -lt $deadline -and -not $bearerFound) {
    Start-Sleep -Seconds 2
    if (Test-Path $mcpPath) {
        try {
            $cfg = Get-Content $mcpPath -Raw | ConvertFrom-Json
            $auth = $cfg.mcpServers.agentstack.headers.Authorization
            if ($auth -and $auth.StartsWith('Bearer ')) {
                $bearerFound = $true
                Write-Pass "Bearer token written to $mcpPath"
            }
        } catch { }
    }
}

Wait-Job $job -Timeout 10 | Out-Null
$finalOut = Receive-Job -Job $job
Remove-Job $job -Force

if (-not $bearerFound) {
    if (-not $KeepMcp -and (Test-Path $mcpBackup)) { Copy-Item $mcpBackup $mcpPath -Force }
    Write-Host ($finalOut -join "`n")
    Write-Fail "Bearer never appeared in $mcpPath"
}

Write-Step "verifying Bearer works against $BaseUrl/mcp/actions ..."
try {
    $cfg = Get-Content $mcpPath -Raw | ConvertFrom-Json
    $auth = $cfg.mcpServers.agentstack.headers.Authorization
    $probe = Invoke-RestMethod -Uri "$BaseUrl/mcp/actions" -Headers @{ 'Authorization' = $auth }
    Write-Pass "/mcp/actions returned $($probe.Count) actions (or payload of size $((($probe | ConvertTo-Json -Depth 2).Length))"
} catch {
    Write-Fail "Bearer probe failed: $($_.Exception.Message)"
}

if (-not $KeepMcp -and (Test-Path $mcpBackup)) {
    Copy-Item $mcpBackup $mcpPath -Force
    Remove-Item $mcpBackup -Force
    Write-Step "restored original $mcpPath"
}

Write-Host "`n[OK] Device Code E2E passed." -ForegroundColor Green
exit 0
