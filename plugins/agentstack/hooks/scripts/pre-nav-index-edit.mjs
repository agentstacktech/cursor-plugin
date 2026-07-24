#!/usr/bin/env node
/**
 * Remind to regen TAG_CATALOG after map/AI_INDEX edits (NAV-T15).
 * Matcher: AI_NAVIGATION_MAP.md or **/AI_INDEX.md
 */
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pluginRoot = path.resolve(__dirname, '../..');
const monorepoRoot = process.env.AGENTSTACK_ROOT || path.resolve(pluginRoot, '../../../..');

function main() {
  const edited = process.env.CURSOR_EDITED_FILES || process.env.EDITED_FILES || '';
  if (!/AI_NAVIGATION_MAP\.md|AI_INDEX\.md/i.test(edited)) {
    process.exit(0);
  }
  try {
    execSync('npm run build:ai-nav-catalog -- --check', {
      cwd: monorepoRoot,
      stdio: 'pipe',
    });
  } catch {
    console.error(
      '[agentstack] AI nav index changed — run: npm run build:ai-nav-catalog && npm run audit:ai-navigation',
    );
    process.exit(1);
  }
}

main();
