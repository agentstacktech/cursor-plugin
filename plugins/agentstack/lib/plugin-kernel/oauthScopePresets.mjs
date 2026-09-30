/**
 * OAuth Device Code scope presets (shared across plugins).
 * @see repo.plugins.oauth_device_code.gen1
 */

export const DEFAULT_SCOPES = [
  'mcp:execute',
  'mcp:read',
  'projects:read',
  'projects:write',
  'projects:admin',
  '8dna:read',
  '8dna:write',
  'logic:write',
  'logic:dry_run',
  'rag:read',
  'rag:write',
  'storage:read',
  'storage:write',
  'agents:run',
  'bots:run',
  'bots:admin',
  'support:read',
  'buffs:read',
  'buffs:write',
  'apikeys:write',
].join(' ');

/** @type {Record<string, string>} */
export const SCOPE_PRESETS = {
  readonly: [
    'mcp:execute',
    'mcp:read',
    'projects:read',
    '8dna:read',
    'rag:read',
    'storage:read',
    'buffs:read',
  ].join(' '),
  builder: [
    'mcp:execute',
    'mcp:read',
    'projects:read',
    'projects:write',
    'projects:admin',
    '8dna:read',
    '8dna:write',
    'logic:write',
    'logic:dry_run',
    'rag:read',
    'rag:write',
    'storage:read',
    'storage:write',
    'bots:run',
    'bots:admin',
  ].join(' '),
  full: DEFAULT_SCOPES,
};

/**
 * @param {string} [preset]
 * @returns {string}
 */
export function resolveScopePreset(preset = 'full') {
  const key = String(preset || 'full').trim();
  if (!SCOPE_PRESETS[key]) {
    throw new Error(`Unknown scope preset "${key}". Use readonly, builder, or full.`);
  }
  return SCOPE_PRESETS[key];
}
