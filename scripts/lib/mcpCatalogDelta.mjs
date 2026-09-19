/**
 * Shared MCP catalog URL + delta merge (plugin kernel + tests).
 * Gene: repo.plugins.capability_routing.gen1
 */

/**
 * @param {string} baseUrl
 * @param {{ sinceEtag?: string|null, delta?: boolean, hot?: boolean }} [opts]
 */
export function catalogActionsUrl(baseUrl, { sinceEtag = null, delta = false, hot = true } = {}) {
  const url = new URL('/mcp/actions', baseUrl);
  if (hot) url.searchParams.set('schemas', 'hot');
  if (sinceEtag) url.searchParams.set('since_etag', sinceEtag);
  if (delta && sinceEtag) url.searchParams.set('delta', '1');
  return url.toString();
}

/**
 * @param {{ action: string }[]} existingActions
 * @param {{ domains?: Record<string, unknown[]>, removed_actions?: string[] }} deltaPayload
 */
export function mergeCatalogDelta(existingActions, deltaPayload) {
  const byAction = new Map();
  for (const row of existingActions || []) {
    if (row?.action) byAction.set(row.action, row);
  }
  const removed = new Set(deltaPayload?.removed_actions || []);
  for (const list of Object.values(deltaPayload?.domains || {})) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (!row?.action) continue;
      if (row.removed || removed.has(row.action)) {
        byAction.delete(row.action);
      } else {
        byAction.set(row.action, row);
      }
    }
  }
  for (const action of removed) byAction.delete(action);
  return Array.from(byAction.values());
}

/**
 * @param {unknown} payload
 * @returns {boolean}
 */
export function isCatalogDeltaPayload(payload) {
  if (!payload || typeof payload !== 'object') return false;
  if (payload.delta === true) return true;
  return Boolean(payload.domains && (payload.removed_actions || payload.since_etag));
}
