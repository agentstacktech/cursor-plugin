# Smoke test: AgentStack MCP endpoint availability
# Usage:
#   .\scripts\test-mcp-endpoint.ps1
#   .\scripts\test-mcp-endpoint.ps1 -ApiKey "your-key"
# Exit: 0 = OK (200), 1 = no key / 401, 2 = other error

param(
    [string]$ApiKey = "",
    [string]$BaseUrl = "https://agentstack.tech/mcp"
)

$uri = "$BaseUrl/tools"
$headers = @{ "Content-Type" = "application/json" }
if ($ApiKey) { $headers["X-API-Key"] = $ApiKey }

try {
    $r = Invoke-WebRequest -Uri $uri -Method GET -Headers $headers -UseBasicParsing -TimeoutSec 10
    Write-Host "MCP endpoint: $BaseUrl"
    Write-Host "Status: $($r.StatusCode)"
    if ($r.StatusCode -eq 200) {
        Write-Host "OK - endpoint is reachable and API key is valid."
        exit 0
    }
    Write-Host "Unexpected status: $($r.StatusCode)"
    exit 2
} catch {
    $status = $null
    if ($_.Exception.Response) { $status = $_.Exception.Response.StatusCode.value__ }
    if ($status -eq 401) {
        Write-Host "MCP endpoint: $BaseUrl - reachable, but 401 Unauthorized (missing or invalid API key)."
        Write-Host "Get an API key: see MCP_QUICKSTART.md"
        exit 1
    }
    if ($status) {
        Write-Host "MCP endpoint: $BaseUrl - HTTP $status"
        exit 2
    }
    $errMsg = $_.Exception.Message
    Write-Host "Error: $errMsg"
    exit 2
}
