/**
 * Normalize GET /mcp/actions payloads into a flat action list for local snapshots.
 * Live catalog shape: { version, entrypoint, total_actions, domains: { [domain]: Entry[] } }
 * @see repo.plugins.capability_routing.gen1
 */

import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { filterTenantActions } from './docAudienceFilter.mjs';
import {
  flattenMcpActionsCatalog,
  actionsFromSnapshot,
} from './mcpCatalogFlatten.mjs';
import {
  catalogActionsUrl,
  isCatalogDeltaPayload,
  mergeCatalogDelta,
} from './mcpCatalogDelta.mjs';

export const CAPABILITY_SNAPSHOT_FILENAME = 'agentstack-capabilities.json';
export { flattenMcpActionsCatalog, actionsFromSnapshot };

/** Flatten live catalog and keep tenant-facing actions only (public docs parity). */
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

async function fetchCatalogWithDelta(baseUrl, authHeaders, sinceEtag, snapPath) {
  const headers = { ...authHeaders };
  if (sinceEtag) headers['If-None-Match'] = `"${sinceEtag}"`;

  const url = catalogActionsUrl(baseUrl, { sinceEtag, delta: Boolean(sinceEtag), hot: true });
  const res = await fetch(url, { headers });
  if (res.status === 304) {
    return { status: 304, res, body: null, etag: sinceEtag };
  }
  if (!res.ok) {
    return { status: res.status, res, body: null, etag: sinceEtag };
  }

  const body = await res.json();
  const etag = catalogEtagFrom(body, res.headers) ?? sinceEtag;
  let catalog = body;
  if (isCatalogDeltaPayload(body)) {
    let priorActions = [];
    try {
      const existing = JSON.parse(await readFile(snapPath, 'utf8'));
      priorActions = Array.isArray(existing?.actions) ? existing.actions : [];
    } catch {
      /* no prior snapshot */
    }
    const merged = mergeCatalogDelta(priorActions, body);
    catalog = { domains: { _merged: merged }, catalog_etag: etag };
  }
  return { status: res.status, res, body: catalog, etag, delta: isCatalogDeltaPayload(body) };
}

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

  const sinceEtag = existing?.catalog_etag ?? null;
  const fetched = await fetchCatalogWithDelta(baseUrl, authHeaders, sinceEtag, snapPath);
  if (fetched.status === 304 && existing) {
    existing.fetched_at = now;
    await writeFile(snapPath, JSON.stringify(existing, null, 2), 'utf8');
    return { refreshed: false, reason: 'not_modified', actionCount: existing.actions?.length ?? 0 };
  }
  if (fetched.status !== 200 || !fetched.body) {
    return { refreshed: false, reason: 'http_error', status: fetched.status };
  }

  const n = await writeTenantCapabilitySnapshot(cursorDir, fetched.body, {
    catalogEtag: fetched.etag,
  });
  return {
    refreshed: true,
    reason: fetched.delta ? 'delta_merged' : 'fetched',
    actionCount: n,
  };
}

export async function refreshTenantCapabilitySnapshot(cursorDir, baseUrl, authHeaders) {
  const snapPath = join(cursorDir, CAPABILITY_SNAPSHOT_FILENAME);
  let sinceEtag = null;
  try {
    const existing = JSON.parse(await readFile(snapPath, 'utf8'));
    sinceEtag = existing.catalog_etag ?? null;
  } catch {
    /* missing */
  }

  const fetched = await fetchCatalogWithDelta(baseUrl, authHeaders, sinceEtag, snapPath);
  if (fetched.status === 304) {
    try {
      const existing = JSON.parse(await readFile(snapPath, 'utf8'));
      existing.fetched_at = Date.now();
      await writeFile(snapPath, JSON.stringify(existing, null, 2), 'utf8');
      return existing.total_actions ?? existing.actions?.length ?? 0;
    } catch {
      return 0;
    }
  }
  if (fetched.status !== 200 || !fetched.body) return 0;

  return writeTenantCapabilitySnapshot(cursorDir, fetched.body, {
    catalogEtag: fetched.etag,
  });
}
