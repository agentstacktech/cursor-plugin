/**
 * Normalize GET /mcp/actions payloads into a flat action list for local snapshots.
 * Live catalog shape: { version, entrypoint, total_actions, domains: { [domain]: Entry[] } }
 * @see repo.plugins.capability_routing.gen1
 */

/**
 * @param {unknown} payload
 * @returns {{ action: string, required_cap?: string, summary?: string, safe_action?: string }[]}
 */
export function flattenMcpActionsCatalog(payload) {
  if (!payload) return [];
  if (Array.isArray(payload)) {
    return payload.filter((row) => row && typeof row.action === 'string');
  }
  if (Array.isArray(payload.actions)) {
    return payload.actions.filter((row) => row && typeof row.action === 'string');
  }
  const domains = payload.domains;
  if (!domains || typeof domains !== 'object') return [];
  const out = [];
  for (const list of Object.values(domains)) {
    if (!Array.isArray(list)) continue;
    for (const row of list) {
      if (row && typeof row.action === 'string') out.push(row);
    }
  }
  return out;
}

/**
 * @param {unknown} snapshotFile — contents of ~/.cursor/agentstack-capabilities.json
 */
export function actionsFromSnapshot(snapshotFile) {
  if (!snapshotFile || typeof snapshotFile !== 'object') return [];
  if (Array.isArray(snapshotFile.actions)) return snapshotFile.actions;
  // Legacy: entire catalog object stored under `actions`
  if (snapshotFile.actions && typeof snapshotFile.actions === 'object') {
    return flattenMcpActionsCatalog(snapshotFile.actions);
  }
  if (snapshotFile.catalog) return flattenMcpActionsCatalog(snapshotFile.catalog);
  return flattenMcpActionsCatalog(snapshotFile);
}
