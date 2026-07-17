/**
 * Opt-in plugin telemetry JSONL buffer (shared shape).
 */
import fs from 'fs/promises';
import path from 'path';

export const MAX_LINES = 500;

export async function appendLine(filePath, entry) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  let existing = '';
  try {
    existing = await fs.readFile(filePath, 'utf8');
  } catch {
    /* new file */
  }
  const lines = existing ? existing.trimEnd().split('\n') : [];
  lines.push(JSON.stringify({ ts: new Date().toISOString(), ...entry }));
  const trimmed = lines.slice(-MAX_LINES).join('\n') + '\n';
  await fs.writeFile(filePath, trimmed, 'utf8');
}
