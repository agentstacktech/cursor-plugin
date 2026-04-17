<#
.SYNOPSIS
    Pre-publish smoke test for the AgentStack Cursor plugin (v0.4.9).

.DESCRIPTION
    Runs fast, layered checks on the maintainer's machine so the plugin can
    be verified before installing it into Cursor or publishing it. AgentStack
    itself is cloud-only (https://agentstack.tech) — there is no local
    backend to spin up; Layer 3 hits the cloud API directly.

    Layer 1 (always): structural validator. Takes ~2 seconds, fully offline.
    Layer 2 (always): `node --check` on every hook script + a pre-shell-scan
                      behavioural test. Still fully offline.
    Layer 3 (optional): contract-level curl checks against the cloud API
                      (pass -BaseUrl and, for approve, -TestCookie).

    Exits non-zero on the first failure so the script is CI-friendly.

.PARAMETER BaseUrl
    Base URL of the AgentStack cloud API to contract-check against. If
    omitted, Layer 3 is skipped. Examples:
      https://agentstack.tech            (production)
      https://staging.agentstack.tech    (staging, if available)

.PARAMETER TestCookie
    Session cookie string from an authenticated browser session on the same
    -BaseUrl, e.g. 'session=abc123'. Required only for the device/approve
    curl step; other Layer 3 steps work without it.

.PARAMETER Quick
    Skip Layer 2 (node --check + pre-shell-scan behavioural test).

.EXAMPLE
    # Fast offline check
    pwsh ./scripts/smoke-local.ps1

.EXAMPLE
    # Full contract check against the cloud API
    pwsh ./scripts/smoke-local.ps1 -BaseUrl https://agentstack.tech -TestCookie 'session=...'

#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "",
    [string]$TestCookie = "",
    [switch]$Quick
)

$ErrorActionPreference = 'Stop'
$script:Failed = 0
$script:Passed = 0

function Write-Section($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  [OK]   $msg" -ForegroundColor Green; $script:Passed++ }
function Write-Bad($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red;   $script:Failed++ }
function Write-Info($msg)   { Write-Host "  [..]   $msg" -ForegroundColor DarkGray }
function Write-Skip($msg)   { Write-Host "  [skip] $msg" -ForegroundColor Yellow }

$pluginRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
Write-Host "Cursor plugin smoke test" -ForegroundColor White
Write-Host "root: $pluginRoot"

# ---------- Layer 1: structural validator ----------
Write-Section "Layer 1 / structural validator"
try {
    $out = & node (Join-Path $pluginRoot 'scripts/validate-plugin.mjs') 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Ok "validate-plugin.mjs passed"
        ($out | Select-Object -Last 3) | ForEach-Object { Write-Info $_ }
    } else {
        $out | ForEach-Object { Write-Host $_ }
        Write-Bad "validate-plugin.mjs exited with $LASTEXITCODE"
    }
} catch {
    Write-Bad "validate-plugin.mjs threw: $($_.Exception.Message)"
}

# ---------- Layer 2: script syntax + pre-shell-scan behaviour ----------
if ($Quick) {
    Write-Section "Layer 2 / skipped (-Quick)"
} else {
    Write-Section "Layer 2 / script syntax + pre-shell-scan behaviour"

    # Inside Layer 2 we allow external (node) stderr output without halting
    # the script — we only care about exit codes for each subcommand.
    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $hookScripts = @(
            'hooks/scripts/device-code.mjs',
            'hooks/scripts/session-start.mjs',
            'hooks/scripts/pre-shell-scan.mjs',
            'hooks/scripts/post-tool-telemetry.mjs',
            'hooks/scripts/capability-refresh.mjs'
        )
        foreach ($rel in $hookScripts) {
            $full = Join-Path $pluginRoot $rel
            if (-not (Test-Path $full)) { Write-Bad "missing: $rel"; continue }
            $null = & node --check $full 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Ok "node --check $rel" }
            else                      { Write-Bad "node --check failed: $rel" }
        }

        # Behaviour: pre-shell-scan must block a fake api key and pass a clean command.
        # The hook reads the proposed command from stdin (JSON) or from $env:HOOK_COMMAND.
        $scanner = Join-Path $pluginRoot 'hooks/scripts/pre-shell-scan.mjs'
        if (Test-Path $scanner) {
            $prev = $env:HOOK_COMMAND
            try {
                $env:HOOK_COMMAND = "echo ask_1234567890abcdef1234567890abcdef"
                $null = & node $scanner 2>&1
                if ($LASTEXITCODE -ne 0) { Write-Ok "pre-shell-scan blocks plaintext api key" }
                else                      { Write-Bad "pre-shell-scan did NOT block plaintext api key" }

                $env:HOOK_COMMAND = "echo hello-world"
                $null = & node $scanner 2>&1
                if ($LASTEXITCODE -eq 0) { Write-Ok "pre-shell-scan passes clean command" }
                else                      { Write-Bad "pre-shell-scan wrongly blocked clean command" }
            } finally {
                $env:HOOK_COMMAND = $prev
            }
        } else {
            Write-Bad "pre-shell-scan.mjs missing"
        }
    } finally {
        $ErrorActionPreference = $prevEap
    }
}

# ---------- Layer 3: contract curl checks ----------
if (-not $BaseUrl) {
    Write-Section "Layer 3 / skipped (no -BaseUrl)"
    Write-Info "pass -BaseUrl https://agentstack.tech (or https://staging.agentstack.tech) to enable"
} else {
    Write-Section "Layer 3 / contract curl checks against $BaseUrl"

    # 3a. Device authorization endpoint (unauthenticated, public).
    try {
        $form = @{ client_id = 'cursor-plugin'; scope = 'mcp:execute projects:read' }
        $resp = Invoke-RestMethod -Method Post `
            -Uri "$BaseUrl/api/oauth2/device/authorize" `
            -Body $form `
            -ContentType 'application/x-www-form-urlencoded'
        if ($resp.device_code -and $resp.user_code) {
            Write-Ok "POST /api/oauth2/device/authorize returned device_code + user_code"
            $script:UserCode = $resp.user_code
        } else {
            Write-Bad "POST /api/oauth2/device/authorize: unexpected payload: $($resp | ConvertTo-Json -Compress)"
        }
    } catch {
        Write-Bad "POST /api/oauth2/device/authorize failed: $($_.Exception.Message)"
    }

    # 3b. Device info endpoint (authenticated — requires session cookie).
    if ($script:UserCode) {
        if ($TestCookie) {
            try {
                $resp = Invoke-RestMethod -Method Get `
                    -Uri "$BaseUrl/api/oauth2/device/info?user_code=$($script:UserCode)" `
                    -Headers @{ 'Cookie' = $TestCookie }
                if ($resp.client_id -eq 'cursor-plugin' -and $resp.scopes) {
                    Write-Ok "GET /api/oauth2/device/info returned client + scopes"
                } else {
                    Write-Bad "GET /api/oauth2/device/info: unexpected payload"
                }
            } catch {
                Write-Bad "GET /api/oauth2/device/info failed: $($_.Exception.Message)"
            }

            # 3c. Device approve endpoint (authenticated).
            try {
                $body = @{ user_code = $script:UserCode } | ConvertTo-Json
                $resp = Invoke-RestMethod -Method Post `
                    -Uri "$BaseUrl/api/oauth2/device/approve" `
                    -Headers @{ 'Cookie' = $TestCookie; 'Content-Type' = 'application/json' } `
                    -Body $body
                if ($resp.success -and $resp.scopes_granted) {
                    Write-Ok "POST /api/oauth2/device/approve returned success + scopes_granted"
                } else {
                    Write-Bad "POST /api/oauth2/device/approve: unexpected payload"
                }
            } catch {
                Write-Bad "POST /api/oauth2/device/approve failed: $($_.Exception.Message)"
            }
        } else {
            Write-Skip "device/info + device/approve (no -TestCookie)"
        }
    }

    # 3d. Telemetry ingest (public, opt-in).
    try {
        $event = @{
            ts           = [int64]((Get-Date -UFormat %s) * 1000)
            action       = 'projects.get'
            success      = $true
            duration_ms  = 42
        }
        $batch = @{
            plugin  = 'cursor-plugin'
            version = '0.4.9'
            events  = @($event)
        } | ConvertTo-Json -Depth 5
        $resp = Invoke-RestMethod -Method Post `
            -Uri "$BaseUrl/api/telemetry/plugin" `
            -Body $batch `
            -ContentType 'application/json'
        if ($resp.accepted -ge 1) { Write-Ok "POST /api/telemetry/plugin accepted=$($resp.accepted)" }
        else                      { Write-Bad "POST /api/telemetry/plugin: accepted=$($resp.accepted)" }
    } catch {
        Write-Bad "POST /api/telemetry/plugin failed: $($_.Exception.Message)"
    }

    # 3e. MCP discovery (no /api prefix — mounted at /mcp in core_app.py).
    try {
        $resp = Invoke-RestMethod -Method Get -Uri "$BaseUrl/mcp/actions"
        if ($resp) { Write-Ok "GET /mcp/actions reachable" }
        else       { Write-Skip "GET /mcp/actions returned empty (auth?)" }
    } catch {
        Write-Skip "GET /mcp/actions: $($_.Exception.Message) (auth or not running)"
    }
}

# ---------- Summary ----------
Write-Section "summary"
Write-Host ("  passed: {0}" -f $script:Passed) -ForegroundColor Green
$failColor = 'Red'
if ($script:Failed -eq 0) { $failColor = 'Green' }
Write-Host ("  failed: {0}" -f $script:Failed) -ForegroundColor $failColor
if ($script:Failed -gt 0) { exit 1 } else { exit 0 }
