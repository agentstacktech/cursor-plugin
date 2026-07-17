#!/usr/bin/env node
/**
 * Generate 1920×1200 marketplace screenshots (branded mock panels).
 * Replace with live Cursor captures before final submit when possible.
 *
 * Usage: node scripts/generate-marketplace-screenshots.mjs
 */
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'plugins/agentstack/assets/screenshots');
const W = 1920;
const H = 1200;

const SLIDES = [
  { file: '01-install.png', title: 'Install', subtitle: '/agentstack-init — OAuth Device Code' },
  { file: '02-capability-matrix.png', title: 'Live catalog', subtitle: '/agentstack-capability-matrix' },
  { file: '03-scaffold-auth.png', title: 'Scaffold auth', subtitle: '/agentstack-scaffold-auth' },
  { file: '04-host-site.png', title: 'Host a site', subtitle: '/agentstack-host-site → /s/ URL' },
  { file: '05-sites-url-card.png', title: 'Hosted URL', subtitle: 'Project sites card' },
];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function pngRGB(width, height, paint) {
  const row = Buffer.alloc(1 + width * 3);
  const raw = Buffer.alloc((1 + width * 3) * height);
  for (let y = 0; y < height; y++) {
    row[0] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b] = paint(x, y);
      const o = 1 + x * 3;
      row[o] = r;
      row[o + 1] = g;
      row[o + 2] = b;
    }
    row.copy(raw, y * row.length);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function paintSlide(titleHash) {
  return (x, y) => {
    const t = y / H;
    const r = Math.floor(12 + t * 28 + (x / W) * 8);
    const g = Math.floor(18 + t * 40);
    const b = Math.floor(32 + (1 - t) * 50 + titleHash);
    // Brand strip top
    if (y < 80) return [8, 120, 140];
    // Content card
    if (x > 160 && x < W - 160 && y > 200 && y < H - 160) {
      const edge = x < 164 || x > W - 164 || y < 204 || y > H - 164;
      if (edge) return [40, 160, 180];
      return [245, 248, 250];
    }
    return [r, g, b];
  };
}

fs.mkdirSync(OUT, { recursive: true });
for (let i = 0; i < SLIDES.length; i++) {
  const s = SLIDES[i];
  const buf = pngRGB(W, H, paintSlide(i * 7));
  fs.writeFileSync(path.join(OUT, s.file), buf);
  console.log('wrote', s.file, buf.length, 'bytes');
}
console.log('Done. Alts: see assets/screenshots/README.md');
