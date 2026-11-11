#!/usr/bin/env node
// rotated-row — evidence for a page whose live 'More recipes' row is server-rotated (picked per request).
// Reads a gate-all page dir (origin.png, eds.png, content.json from a run with presence.json marking the
// row --variable), finds the row on each side from the variable items, and pixel-compares the page WITHOUT
// the row: the part above it (same y on both sides) and the part below it re-aligned at each side's row end.
// Prints one line; --write adds the documented override (and the row mask) to the width's sidecars.
//   node stardust/rollout/tools/rotated-row.mjs stardust/replica/gates/all-<w>/<slug> [--bar 10] [--write]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node rotated-row.mjs <gate-all page dir> [--bar 10] [--write]');
  process.exit(args.length ? 0 : 1);
}
const dir = args[0];
const bar = args.includes('--bar') ? Number(args[args.indexOf('--bar') + 1]) : 10;
const slug = basename(dir); const out = dirname(dir);
const c = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'));
const span = (side) => {
  const v = c[side].items.filter((i) => i.variable && i.h > 0);
  if (!v.length) return null;
  return [Math.min(...v.map((i) => i.y)), Math.max(...v.map((i) => i.y + i.h))];
};
const o = span('origin'); const e = span('eds');
if (!o || !e) { console.error(`rotated-row: ${slug}: no variable items on ${o ? 'eds' : 'origin'} side`); process.exit(1); }
const A = PNG.sync.read(readFileSync(join(dir, 'origin.png')));
const B = PNG.sync.read(readFileSync(join(dir, 'eds.png')));
const w = Math.min(A.width, B.width);
const seg = (img, y, h) => { const p = new PNG({ width: w, height: h }); PNG.bitblt(img, p, 0, y, w, h, 0, 0); return p; };
const cmp = (ya, yb, h) => {
  if (h <= 0) return { diff: 0, px: 0 };
  const a = seg(A, ya, h); const b = seg(B, yb, h);
  return { diff: pixelmatch(a.data, b.data, null, w, h, { threshold: 0.1 }), px: w * h };
};
const top = Math.min(o[0], e[0]);
const above = cmp(0, 0, top);
const belowH = Math.min(A.height - o[1], B.height - e[1]);
const below = cmp(o[1], e[1], belowH);
const pct = +((100 * (above.diff + below.diff)) / (above.px + below.px)).toFixed(2);
const tailDh = (A.height - o[1]) - (B.height - e[1]);
const pass = pct <= bar;
const reason = `server-rotated 'More recipes' row (live picks 3 recipes per request; delivered = captured snapshot, register residual listing-rotation): page without the row ${pct}% (above ${top}px same-y, below re-aligned at row end origin ${o[1]} / eds ${e[1]}), tail Δh ${tailDh}px`;
console.log(`rotated-row ${slug} @${A.width}: row origin ${o[0]}-${o[1]} eds ${e[0]}-${e[1]} → without row ${pct}% tailΔh ${tailDh} ${pass ? 'PASS' : 'FAIL'}`);
if (args.includes('--write') && pass) {
  const rw = (f, fn) => { const p = join(out, f); const j = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; fn(j); writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`); };
  rw('overrides.json', (j) => { j[slug] = { verdict: 'PASS (documented override)', reason, evidence: { pct, origin: o, eds: e, tailDh, at: new Date().toISOString() } }; });
  rw('masks.json', (j) => { j[slug] = { masks: [`${top}:${Math.max(o[1], e[1]) - top}@${top}`], reason: "server-rotated 'More recipes' row" }; });
}
process.exitCode = pass ? 0 : 2;
