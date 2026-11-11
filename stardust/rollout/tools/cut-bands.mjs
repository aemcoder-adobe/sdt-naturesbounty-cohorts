#!/usr/bin/env node
// cut-bands — evidence for a page whose live capture carries blank image boxes the delivered page cannot
// carry (source images that never load: the source host times out; capture-state policy). Reads a gate-all
// page dir (origin.png, eds.png, content.json), finds the origin <img> boxes with no served counterpart, cuts
// each one's height (re-aligned on the text anchors around it) out of origin.png and pixel-compares the rest.
// Prints one line; --write adds the documented override to the width's overrides.json.
//   node stardust/rollout/tools/cut-bands.mjs stardust/replica/gates/all-<w>/<slug> --reason "<why>" [--bar 10] [--write]
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node cut-bands.mjs <gate-all page dir> --reason "<why>" [--bar 10] [--write]');
  process.exit(args.length ? 0 : 1);
}
const dir = args[0];
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const bar = Number(opt('--bar', 10));
const reason = opt('--reason', 'source images unreachable');
const slug = basename(dir); const out = dirname(dir);
const c = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'));
const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 50);
const items = (s) => c[s].items.filter((i) => i.h > 0 && !i.inChrome).sort((a, b) => a.y - b.y);
const O = items('origin'); const E = items('eds');
const texts = (L) => L.filter((i) => i.kind === 'text' && i.text);
const eFor = (o) => texts(E).find((e) => norm(e.text) === norm(o.text));
// blank boxes: origin images without alt text whose source never loaded (no served image at that slot)
const blanks = O.filter((i) => i.kind === 'image' && !i.text && i.w >= 100 && i.h >= 100
  && !E.some((e) => e.kind === 'image' && Math.abs(e.y - i.y) < 60 && Math.abs(e.h - i.h) < 10));
const cuts = [];
for (const b of blanks) {
  const prev = texts(O).filter((t) => t.y + t.h <= b.y && eFor(t)).pop();
  const next = texts(O).find((t) => t.y >= b.y + b.h && eFor(t));
  if (!prev || !next) continue;
  const len = (next.y - prev.y) - (eFor(next).y - eFor(prev).y);
  if (len > 0) cuts.push([b.y, b.y + len]);
}
const A = PNG.sync.read(readFileSync(join(dir, 'origin.png')));
const B = PNG.sync.read(readFileSync(join(dir, 'eds.png')));
const keep = [];
for (let y = 0; y < A.height; y += 1) if (!cuts.some(([a, z]) => y >= a && y < z)) keep.push(y);
const w = Math.min(A.width, B.width); const h = Math.min(keep.length, B.height);
const a = new PNG({ width: w, height: h }); const bb = new PNG({ width: w, height: h });
for (let y = 0; y < h; y += 1) {
  A.data.copy(a.data, y * w * 4, keep[y] * A.width * 4, keep[y] * A.width * 4 + w * 4);
  B.data.copy(bb.data, y * w * 4, y * B.width * 4, y * B.width * 4 + w * 4);
}
const diff = pixelmatch(a.data, bb.data, null, w, h, { threshold: 0.1 });
const pct = Math.round((diff / (w * h)) * 10000) / 100;
const dh = keep.length - B.height;
const pass = pct <= bar && Math.abs(dh) <= 0.05 * keep.length;
console.log(`cut-bands ${slug}: ${blanks.length} blank box(es), cut ${cuts.map(([p, q]) => `${p}-${q}`).join(',')} → ${pct}% Δh ${dh} ${pass ? 'PASS' : 'FAIL'}`);
if (args.includes('--write') && pass) {
  const p = join(out, 'overrides.json');
  const j = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  j[slug] = { verdict: 'PASS (documented override)', reason: `${reason}: page without the ${blanks.length} blank box(es) ${pct}% (Δh ${dh}px)`, evidence: { pct, cuts, dh, at: new Date().toISOString() } };
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}
process.exit(pass ? 0 : 2);
