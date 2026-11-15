/**
 * Shared MCP HTTP retry policy (SDK parity — remediation Wave 3).
 */

const RETRYABLE = new Set([429, 502, 503, 504]);

export function isRetryableMcpHttpStatus(status) {
  return RETRYABLE.has(Number(status));
}

export function retryDelayMs(res, attempt) {
  const raw = res?.headers?.get?.('Retry-After');
  if (raw) {
    const sec = Number(raw);
    if (Number.isFinite(sec) && sec >= 0) return Math.min(sec * 1000, 60_000);
  }
  return Math.min(1000 * 2 ** attempt, 8000);
}

export async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}
