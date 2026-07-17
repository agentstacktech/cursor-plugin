<#
.SYNOPSIS
    Pre-publish smoke test for the AgentStack Cursor plugin (v0.4.14 gen3).

.DESCRIPTION
    Layer 0 (optional -Install): junction/symlink into ~/.cursor/plugins/local/agentstack
    Layer 1 (always): structural validator.
    Layer 2 (always): hooks contract + node --check on all hook scripts.
    Layer 3 (optional -BaseUrl): cloud API contract curls.

.PARAMETER Install
    Run node scripts/install-local.mjs before Layer 1.

.PARAMETER BaseUrl
    Cloud API for Layer 3 (e.g. https://agentstack.tech).

.PARAMETER TestCookie
    Session cookie for device/approve Layer 3 steps.

.PARAMETER Quick
    Skip Layer 2.

.EXAMPLE
    pwsh ./scripts/smoke-local.ps1 -Install
#>
[CmdletBinding()]
param(
    [string]$BaseUrl = "",
    [string]$TestCookie = "",
    [switch]$Quick,
    [switch]$Install
)

$ErrorActionPreference = 'Stop'
$script:Failed = 0
$script:Passed = 0

function Write-Section($msg) { Write-Host ""; Write-Host "=== $msg ===" -ForegroundColor Cyan }
function Write-Ok($msg)     { Write-Host "  [OK]   $msg" -ForegroundColor Green; $script:Passed++ }
function Write-Bad($msg)    { Write-Host "  [FAIL] $msg" -ForegroundColor Red;   $script:Failed++ }
function Write-Info($msg)   { Write-Host "  [..]   $msg" -ForegroundColor DarkGray }
function Write-Skip($msg)   { Write-Host "  [skip] $msg" -ForegroundColor Yellow }

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..') | Select-Object -ExpandProperty Path
$pluginRoot = Join-Path $repoRoot 'plugins\agentstack'
Write-Host "Cursor plugin smoke test v0.4.14" -ForegroundColor White
Write-Host "repo:   $repoRoot"
Write-Host "plugin: $pluginRoot"

# ---------- Layer 0: local Cursor install ----------
Write-Section "Layer 0 / local install (~/.cursor/plugins/local/agentstack)"
if ($Install) {
    try {
        $out = & node (Join-Path $repoRoot 'scripts/install-local.mjs') 2>&1
        $out | ForEach-Object { Write-Host $_ }
        if ($LASTEXITCODE -eq 0) { Write-Ok "install-local.mjs" }
        else { Write-Bad "install-local.mjs exit $LASTEXITCODE" }
    } catch {
        Write-Bad "install-local.mjs threw: $($_.Exception.Message)"
    }
}
try {
    $null = & node (Join-Path $repoRoot 'scripts/install-local.mjs') --check 2>&1
    if ($LASTEXITCODE -eq 0) { Write-Ok "local link points at this tree" }
    elseif ($Install) { Write-Bad "local link missing after -Install" }
    else { Write-Skip "not linked (pwsh scripts/smoke-local.ps1 -Install)" }
} catch {
    Write-Skip "install-local --check: $($_.Exception.Message)"
}

# ---------- Layer 1: structural validator ----------
Write-Section "Layer 1 / structural validator"
try {
    $out = & node (Join-Path $repoRoot 'scripts/validate-plugin.mjs') 2>&1
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

# ---------- Layer 2: script syntax + hooks contract ----------
if ($Quick) {
    Write-Section "Layer 2 / skipped (-Quick)"
} else {
    Write-Section "Layer 2 / hooks contract + node --check"

    $prevEap = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $hookScripts = @(
            'hooks/scripts/device-code.mjs',
            'hooks/scripts/session-start.mjs',
            'hooks/scripts/session-end.mjs',
            'hooks/scripts/pre-shell-scan.mjs',
            'hooks/scripts/pre-mcp-cap-check.mjs',
            'hooks/scripts/post-tool-telemetry.mjs',
            'hooks/scripts/post-tool-failure.mjs',
            'hooks/scripts/capability-refresh.mjs'
        )
        try {
            $hc = & node (Join-Path $repoRoot 'scripts/test-hooks-contract.mjs') 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Ok 'test-hooks-contract.mjs passed' }
            else { $hc | ForEach-Object { Write-Host $_ }; Write-Bad "test-hooks-contract.mjs exit $LASTEXITCODE" }
        } catch {
            Write-Bad "test-hooks-contract.mjs threw: $($_.Exception.Message)"
        }

        try {
            $kc = & node (Join-Path $repoRoot 'scripts/test-kernel-catalog.mjs') 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Ok 'test-kernel-catalog.mjs passed' }
            else { $kc | ForEach-Object { Write-Host $_ }; Write-Bad "test-kernel-catalog.mjs exit $LASTEXITCODE" }
        } catch {
            Write-Bad "test-kernel-catalog.mjs threw: $($_.Exception.Message)"
        }

        foreach ($rel in $hookScripts) {
            $full = Join-Path $pluginRoot $rel
            if (-not (Test-Path $full)) { Write-Bad "missing: $rel"; continue }
            $null = & node --check $full 2>&1
            if ($LASTEXITCODE -eq 0) { Write-Ok "node --check $rel" }
            else                      { Write-Bad "node --check failed: $rel" }
        }

        $scanner = Join-Path $pluginRoot 'hooks/scripts/pre-shell-scan.mjs'
        if (Test-Path $scanner) {
            $prev = $env:HOOK_COMMAND
            try {
                $env:HOOK_COMMAND = "echo ask_PLACEHOLDER_1234567890abcdef"
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
            version = '0.4.14'
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
