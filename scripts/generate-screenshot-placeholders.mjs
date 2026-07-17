#!/usr/bin/env node
/** Minimal 1x1 PNG placeholders for marketplace paths until real 1920x1200 captures exist. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'plugins/agentstack/assets/screenshots');
// 1x1 transparent PNG
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

const files = [
  '01-install.png',
  '02-capability-matrix.png',
  '03-scaffold-auth.png',
  '04-host-site.png',
  '05-sites-url-card.png',
];

fs.mkdirSync(OUT, { recursive: true });
for (const f of files) {
  const p = path.join(OUT, f);
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, PNG);
    console.log('wrote', f);
  }
}
