/**
 * RFC 8628 device code poll helpers (shared across plugins).
 * @see repo.plugins.oauth_device_code.gen1
 */

export async function postForm(url, params, traceId = '') {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(traceId ? { 'X-Trace-Id': traceId } : {}),
    },
    body: new URLSearchParams(params).toString(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json.error_description || json.error || `HTTP ${res.status}`);
  }
  return json;
}

export async function pollDeviceToken({
  tokenUrl,
  clientId,
  deviceCode,
  intervalSec = 5,
  expiresInSec = 600,
  traceId = '',
}) {
  const deadline = Date.now() + expiresInSec * 1000;
  let waitMs = Math.max(1000, intervalSec * 1000);

  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, waitMs));
    const token = await postForm(
      tokenUrl,
      {
        grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
        device_code: deviceCode,
        client_id: clientId,
      },
      traceId,
    );
    if (token.access_token) return token;
    if (token.error === 'authorization_pending') continue;
    if (token.error === 'slow_down') {
      waitMs = Math.min(waitMs + 5000, 30000);
      continue;
    }
    throw new Error(token.error_description || token.error || 'Device authorization failed');
  }
  throw new Error('Device code expired');
}
