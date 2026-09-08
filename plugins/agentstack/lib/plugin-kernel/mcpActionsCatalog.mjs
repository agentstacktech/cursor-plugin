/**
 * Normalize GET /mcp/actions payloads into a flat action list for local snapshots.
 * Live catalog shape: { version, entrypoint, total_actions, domains: { [domain]: Entry[] } }
 * @see repo.plugins.capability_routing.gen1
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { filterTenantActions } from './docAudienceFilter.mjs';

export const CAPABILITY_SNAPSHOT_FILENAME = 'agentstack-capabilities.json';

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

/**
 * Flatten live catalog and keep tenant-facing actions only (public docs parity).
 * @param {unknown} payload
 */
export function tenantActionsFromCatalog(payload) {
  return filterTenantActions(flattenMcpActionsCatalog(payload));
}

function catalogEtagFrom(payload, responseHeaders) {
  if (payload && typeof payload === 'object' && payload.catalog_etag) {
    return String(payload.catalog_etag);
  }
  const raw = responseHeaders?.get?.('etag');
  if (!raw) return null;
  return raw.replace(/^"|"$/g, '');
}

/**
 * Disk shape for ~/.cursor/agentstack-capabilities.json (Device Code + sessionStart + diagnose).
 * @param {unknown} catalog
 * @param {{ now?: number, catalogEtag?: string|null }} [opts]
 */
export function buildTenantCapabilitySnapshot(catalog, { now = Date.now(), catalogEtag = null } = {}) {
  const actions = tenantActionsFromCatalog(catalog);
  const snapshot = {
    fetched_at: now,
    audience: 'tenant',
    total_actions: actions.length,
    actions,
  };
  const etag = catalogEtag ?? catalogEtagFrom(catalog, null);
  if (etag) snapshot.catalog_etag = etag;
  return snapshot;
}

/**
 * @param {string} cursorDir — typically ~/.cursor
 * @param {unknown} catalog
 * @param {{ catalogEtag?: string|null }} [opts]
 * @returns {Promise<number>} tenant action count
 */
export async function writeTenantCapabilitySnapshot(cursorDir, catalog, opts = {}) {
  const etag = opts.catalogEtag ?? catalogEtagFrom(catalog, null);
  const snapshot = buildTenantCapabilitySnapshot(catalog, { catalogEtag: etag });
  await mkdir(cursorDir, { recursive: true });
  await writeFile(
    join(cursorDir, CAPABILITY_SNAPSHOT_FILENAME),
    JSON.stringify(snapshot, null, 2),
    'utf8',
  );
  return snapshot.total_actions;
}

/**
 * Refresh local capability snapshot when stale. Uses If-None-Match when catalog_etag is known.
 * @param {string} cursorDir
 * @param {string} baseUrl
 * @param {Record<string, string>} authHeaders
 * @param {{ maxAgeMs?: number, now?: number }} [opts]
 */
export async function refreshTenantCapabilitySnapshotIfStale(
  cursorDir,
  baseUrl,
  authHeaders,
  { maxAgeMs = 24 * 60 * 60 * 1000, now = Date.now() } = {},
) {
  const snapPath = join(cursorDir, CAPABILITY_SNAPSHOT_FILENAME);
  let existing = null;

  try {
    const st = await stat(snapPath);
    const ageMs = now - st.mtimeMs;
    existing = JSON.parse(await readFile(snapPath, 'utf8'));
    if (ageMs < maxAgeMs) {
      if (!Array.isArray(existing?.actions)) {
        const n = await writeTenantCapabilitySnapshot(cursorDir, existing.catalog || existing);
        return { refreshed: true, reason: 'normalized', actionCount: n };
      }
      return { refreshed: false, reason: 'fresh', actionCount: existing.actions.length };
    }
  } catch {
    /* missing or unreadable — fetch below */
  }

  const headers = { ...authHeaders };
  if (existing?.catalog_etag) {
    headers['If-None-Match'] = `"${existing.catalog_etag}"`;
  }

  const res = await fetch(`${baseUrl}/mcp/actions`, { headers });
  if (res.status === 304 && existing) {
    existing.fetched_at = now;
    await writeFile(snapPath, JSON.stringify(existing, null, 2), 'utf8');
    return { refreshed: false, reason: 'not_modified', actionCount: existing.actions?.length ?? 0 };
  }
  if (!res.ok) {
    return { refreshed: false, reason: 'http_error', status: res.status };
  }

  const catalog = await res.json();
  const etag = catalogEtagFrom(catalog, res.headers);
  const n = await writeTenantCapabilitySnapshot(cursorDir, catalog, { catalogEtag: etag });
  return { refreshed: true, reason: 'fetched', actionCount: n };
}

/**
 * Force-refresh snapshot (e.g. after mcp.json edit). Honors If-None-Match when etag known.
 * @returns {Promise<number>} tenant action count
 */
export async function refreshTenantCapabilitySnapshot(cursorDir, baseUrl, authHeaders) {
  const snapPath = join(cursorDir, CAPABILITY_SNAPSHOT_FILENAME);
  let sinceEtag = null;
  try {
    const existing = JSON.parse(await readFile(snapPath, 'utf8'));
    sinceEtag = existing.catalog_etag ?? null;
  } catch {
    /* missing */
  }

  const headers = { ...authHeaders };
  if (sinceEtag) headers['If-None-Match'] = `"${sinceEtag}"`;

  const res = await fetch(`${baseUrl}/mcp/actions`, { headers });
  if (res.status === 304) {
    try {
      const existing = JSON.parse(await readFile(snapPath, 'utf8'));
      existing.fetched_at = Date.now();
      await writeFile(snapPath, JSON.stringify(existing, null, 2), 'utf8');
      return existing.total_actions ?? existing.actions?.length ?? 0;
    } catch {
      return 0;
    }
  }
  if (!res.ok) return 0;

  const catalog = await res.json();
  return writeTenantCapabilitySnapshot(cursorDir, catalog, {
    catalogEtag: catalogEtagFrom(catalog, res.headers),
  });
}
