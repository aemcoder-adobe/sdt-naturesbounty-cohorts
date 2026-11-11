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
  console.log('Usage: node rotated-row.mjs <gate-all page dir> [--bar 10] [--align end|bottom] [--write]\n'
    + '  --align end (default): the part below the row is re-aligned at each side\'s row end (item bottoms)\n'
    + '  --align landmark: the part below the row is aligned at the first item below the row images\n'
    + '    whose text is on both sides (e.g. the trusted band line); robust when a card link box\n'
    + '    overhangs the row\'s real end');
  process.exit(args.length ? 0 : 1);
}
const dir = args[0];
const bar = args.includes('--bar') ? Number(args[args.indexOf('--bar') + 1]) : 10;
const align = args.includes('--align') ? args[args.indexOf('--align') + 1] : 'end';
const slug = basename(dir); const out = dirname(dir);
const c = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'));
const span = (side) => {
  const v = c[side].items.filter((i) => i.variable && i.h > 0);
  if (!v.length) return null;
  return [Math.min(...v.map((i) => i.y)), Math.max(...v.map((i) => i.y + i.h))];
};
// landmark: the first item below the row images (non-variable, outside chrome) whose text is
// present on BOTH sides — the same element (e.g. the trusted band's line) anchors the tail.
const belowItems = (side) => {
  const imgEnd = Math.max(...c[side].items.filter((i) => i.variable && i.h > 0 && i.kind === 'image')
    .map((i) => i.y + i.h));
  return c[side].items
    .filter((i) => !i.variable && !i.inChrome && i.h > 0 && i.y > imgEnd && i.text)
    .sort((a, b) => a.y - b.y);
};
const landmarks = () => {
  const bo = belowItems('origin'); const be = belowItems('eds');
  const hit = bo.find((i) => be.some((j) => j.text === i.text));
  return hit ? [hit.y, be.find((j) => j.text === hit.text).y, hit.text] : null;
};
let o = span('origin'); let e = span('eds');
let mark = null;
if (align === 'landmark' && o && e) {
  mark = landmarks();
  if (!mark) { console.error(`rotated-row: ${slug}: no common landmark below the row`); process.exit(1); }
  o = [o[0], mark[0]]; e = [e[0], mark[1]];
}
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
// The content probe is a separate page load (the row re-rotates, card heights change), so the
// origin landmark y is refined in the PNG itself: the eds strip at the landmark is slid over the
// origin within ±400px and the best-matching offset wins (registration, not a guess).
if (mark) {
  const strip = 80; const yb = e[1];
  const score = (ya) => {
    let d = 0;
    for (let y = 0; y < strip; y += 2) {
      for (let x = 0; x < w; x += 4) {
        const ia = ((ya + y) * A.width + x) * 4; const ib = ((yb + y) * B.width + x) * 4;
        d += Math.abs(A.data[ia] - B.data[ib]) + Math.abs(A.data[ia + 1] - B.data[ib + 1])
          + Math.abs(A.data[ia + 2] - B.data[ib + 2]);
      }
    }
    return d;
  };
  let best = o[1]; let bestScore = Infinity;
  for (let ya = Math.max(o[0], o[1] - 400); ya <= Math.min(A.height - strip, o[1] + 400); ya += 1) {
    const sc = score(ya);
    if (sc < bestScore) { bestScore = sc; best = ya; }
  }
  o = [o[0], best];
}
const top = Math.min(o[0], e[0]);
const above = cmp(0, 0, top);
const belowH = Math.min(A.height - o[1], B.height - e[1]);
const below = cmp(o[1], e[1], belowH);
const pct = +((100 * (above.diff + below.diff)) / (above.px + below.px)).toFixed(2);
const tailDh = (A.height - o[1]) - (B.height - e[1]);
const pass = pct <= bar;
const reason = `server-rotated 'More recipes' row (live picks 3 recipes per request; delivered = captured snapshot, register residual listing-rotation): page without the row ${pct}% (above ${top}px same-y, below re-aligned at ${mark ? `landmark "${mark[2].slice(0, 40)}"` : 'row end'} origin ${o[1]} / eds ${e[1]}), tail Δh ${tailDh}px`;
console.log(`rotated-row ${slug} @${A.width}: row origin ${o[0]}-${o[1]} eds ${e[0]}-${e[1]} ${mark ? ` (landmark "${mark[2].slice(0, 30)}")` : ''} → without row ${pct}% tailΔh ${tailDh} ${pass ? 'PASS' : 'FAIL'}`);
if (args.includes('--write') && pass) {
  const rw = (f, fn) => { const p = join(out, f); const j = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {}; fn(j); writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`); };
  rw('overrides.json', (j) => { j[slug] = { verdict: 'PASS (documented override)', reason, evidence: { pct, align, origin: o, eds: e, tailDh, at: new Date().toISOString() } }; });
  rw('masks.json', (j) => { j[slug] = { masks: [`${top}:${Math.max(o[1], e[1]) - top}@${top}`], reason: "server-rotated 'More recipes' row" }; });
}
process.exitCode = pass ? 0 : 2;
