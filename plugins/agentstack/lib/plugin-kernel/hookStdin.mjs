/**
 * Cursor hook stdin reader — bounded wait, parse JSON when complete or on timeout.
 * Gene: repo.plugins.hooks.contract.gen1
 */

import { stdin } from 'node:process';

/**
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<object|null>}
 */
export function readHookStdinJson({ timeoutMs = 200 } = {}) {
  return new Promise((resolve) => {
    let data = '';
    let settled = false;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    stdin.setEncoding('utf8');
    stdin.on('data', (chunk) => {
      data += chunk;
    });
    stdin.on('end', () => {
      try {
        finish(data ? JSON.parse(data) : null);
      } catch {
        finish(null);
      }
    });
    stdin.on('error', () => finish(null));
    setTimeout(() => {
      if (!data.trim()) return finish(null);
      try {
        finish(JSON.parse(data));
      } catch {
        finish(null);
      }
    }, timeoutMs);
  });
}
