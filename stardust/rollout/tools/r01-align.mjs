#!/usr/bin/env node
// r01-align — evidence for a page whose pixel number is carried by register entry R-01 (the licensed
// sofia-pro face replaced by metric-matched Figtree: glyph shapes differ on every line and line wraps
// drift, so everything below a re-wrapped paragraph is offset). Reads a gate-all page dir (origin.png,
// eds.png, content.json): re-aligns the served capture on the text anchors both sides share (piecewise,
// monotonic), then pixel-compares (1) the aligned pages and (2) the aligned pages with the text items'
// boxes masked out on both sides (what remains is layout, images and paint — what R-01 does not touch).
// Prints one line; --write adds a documented override to the width's overrides.json when the aligned and
// non-text diffs are within the bar (apply it only to rows whose height / clip / content criteria already pass).
//   node stardust/rollout/tools/r01-align.mjs stardust/replica/gates/all-<w>/<slug> [--bar 10] [--note "<why>"] [--allow-missing <re>] [--write]
// --note documents anything else the row carries (e.g. a content-presence false red, #87 granularity).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const args = process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('Usage: node r01-align.mjs <gate-all page dir> [--bar 10] [--note "<why>"] [--allow-missing <re>] [--write]');
  process.exit(args.length ? 0 : 1);
}
const dir = args[0];
const opt = (k, d) => (args.includes(k) ? args[args.indexOf(k) + 1] : d);
const bar = Number(opt('--bar', 10));
const note = opt('--note', '');
// --allow-missing <re>: unit rows the origin carries and the delivery does not, by a documented disposition
const allowMissing = opt('--allow-missing', null);
const slug = basename(dir); const out = dirname(dir);
const c = JSON.parse(readFileSync(join(dir, 'content.json'), 'utf8'));
const norm = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim().slice(0, 60);
const items = (s) => c[s].items.filter((i) => i.h > 0 && i.state !== 'hidden').sort((a, b) => a.y - b.y);
const O = items('origin'); const E = items('eds');
const textual = (i) => i.text && i.kind !== 'image';
// anchors: origin texts whose normalized text is unique on both sides, kept monotonic in served y
const count = (L) => L.filter(textual).reduce((m, i) => m.set(norm(i.text), (m.get(norm(i.text)) || 0) + 1), new Map());
const cO = count(O); const cE = count(E);
const anchors = [];
for (const o of O.filter(textual)) {
  const k = norm(o.text);
  if (!k || cO.get(k) !== 1 || cE.get(k) !== 1) continue;
  const e = E.find((i) => textual(i) && norm(i.text) === k);
  const last = anchors[anchors.length - 1];
  if (last && (o.y <= last.oy || e.y <= last.ey)) continue;
  anchors.push({ oy: o.y, ey: e.y, o, e });
}
const A = PNG.sync.read(readFileSync(join(dir, 'origin.png')));
const B = PNG.sync.read(readFileSync(join(dir, 'eds.png')));
const w = Math.min(A.width, B.width); const h = A.height;
const a = new PNG({ width: w, height: h }); const b = new PNG({ width: w, height: h });
b.data.fill(255);
let k = -1;
for (let y = 0; y < h; y += 1) {
  while (k + 1 < anchors.length && anchors[k + 1].oy <= y) k += 1;
  const ey = k < 0 ? y : y - anchors[k].oy + anchors[k].ey;
  A.data.copy(a.data, y * w * 4, y * A.width * 4, y * A.width * 4 + w * 4);
  if (ey >= 0 && ey < B.height) B.data.copy(b.data, y * w * 4, ey * B.width * 4, ey * B.width * 4 + w * 4);
}
const diff = new PNG({ width: w, height: h });
const n = pixelmatch(a.data, b.data, diff.data, w, h, { threshold: 0.1, diffMask: true });
const pct = Math.round((n / (w * h)) * 10000) / 100;
// text mask in origin coordinates: each text item's box on either side, mapped through its anchor segment
const mask = new Uint8Array(w * h);
const segOf = (ey) => { let s = -1; for (let i = 0; i < anchors.length && anchors[i].ey <= ey; i += 1) s = i; return s; };
const paint = (x, y, bw, bh) => {
  for (let yy = Math.max(0, Math.floor(y)); yy < Math.min(h, Math.ceil(y + bh)); yy += 1) {
    for (let xx = Math.max(0, Math.floor(x)); xx < Math.min(w, Math.ceil(x + bw)); xx += 1) mask[yy * w + xx] = 1;
  }
};
for (const o of O.filter(textual)) paint(o.x, o.y, o.w, o.h);
for (const e of E.filter(textual)) {
  const s = segOf(e.y);
  paint(e.x, s < 0 ? e.y : e.y - anchors[s].ey + anchors[s].oy, e.w, e.h);
}
let masked = 0; let nt = 0;
for (let i = 0; i < w * h; i += 1) {
  if (mask[i]) { masked += 1; continue; }
  // diffMask output: counted differences are the red pixels (anti-aliasing is yellow, not counted)
  if (diff.data[i * 4 + 3] && diff.data[i * 4] === 255 && diff.data[i * 4 + 1] === 0) nt += 1;
}
const nonTextPct = Math.round((nt / Math.max(1, w * h - masked)) * 10000) / 100;
const maskedPct = Math.round((masked / (w * h)) * 1000) / 10;
// repeated-unit rows off: R-01 moves text widths and pushes what sits below a re-wrapped line down —
// an image row resized, a hidden or missing row, or a unit error is not R-01. A unit family declared for
// the template that neither side carries (0 / 0 matches: a page without a product rail) is no unit.
const uf = join(dir, 'units.json');
const offRows = [];
let unitOther = 0;
let unitAbsent = 0;
let allowedMissing = 0;
let joined = 0;
if (existsSync(uf)) {
  JSON.parse(readFileSync(uf, 'utf8')).results.forEach((r) => {
    if (r.error) {
      if (!r.originMatches && !r.edsMatches) unitAbsent += 1; else unitOther += 1;
    }
    (r.units || []).forEach((u) => {
      // a missing row whose text the delivery serves inside another row of the same unit is a JOIN
      // (#87 granularity: the source splits one run across two elements), not a loss
      const flat = (t) => (t || '').toLowerCase().replace(/\s+/g, ' ').trim();
      // the instrument cuts edsText at 60 characters: what a served row carries beyond its origin text
      // must open the missing row's text
      const tails = (u.rows || []).map((row) => {
        const e = flat(row.edsText); const o = flat(row.text);
        return o && e.startsWith(o) ? e.slice(o.length).trim() : '';
      }).filter(Boolean);
      (u.missing || []).forEach((m) => {
        if (allowMissing && new RegExp(allowMissing).test(m.key)) allowedMissing += 1;
        else if (m.text && tails.some((t) => flat(m.text).startsWith(t))) joined += 1;
        else unitOther += 1;
      });
      (u.rows || []).forEach((row) => {
        if (row.hidden || row.missing) unitOther += 1;
        else if (row.off && row.role === 'image' && (Math.abs(row.dw) > 4 || Math.abs(row.dh) > 4)) unitOther += 1;
        else if (row.off) offRows.push(row);
      });
    });
  });
}
const pass = pct <= bar && nonTextPct <= bar && !unitOther;
console.log(`r01-align ${slug}: ${anchors.length} anchors, aligned ${pct}%, non-text ${nonTextPct}% (text mask ${maskedPct}% of page), unit rows off by text ${offRows.length}${unitAbsent ? `, absent families ${unitAbsent}` : ''}${allowedMissing ? `, allowed missing ${allowedMissing}` : ''}${joined ? `, joined ${joined}` : ''}${unitOther ? `, other unit rows off ${unitOther}` : ''} ${pass ? 'PASS' : 'FAIL'}`);
if (args.includes('--write') && pass) {
  const p = join(out, 'overrides.json');
  const j = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {};
  j[slug] = {
    verdict: 'PASS (documented override)',
    reason: `register R-01 (licensed sofia-pro → metric-matched Figtree): glyph and line-wrap deltas carry the number; re-aligned on ${anchors.length} shared text anchors the page reads ${pct}%, and ${nonTextPct}% outside the text boxes (layout, images, paint)${offRows.length ? `; ${offRows.length} repeated-unit row(s) off by text width or a re-wrapped line above only (R-01)` : ''}${unitAbsent ? `; ${unitAbsent} declared unit family absent on both sides (0 / 0)` : ''}${joined ? `; ${joined} unit text row(s) served joined into the row above (#87 granularity)` : ''}${allowedMissing ? `; ${allowedMissing} Bazaarvoice ratings button(s) not delivered (dynamic-features row 8: static snapshot)` : ''}${note ? `; ${note}` : ''}`,
    evidence: { tool: 'stardust/rollout/tools/r01-align.mjs', anchors: anchors.length, alignedPct: pct, nonTextPct, textMaskPct: maskedPct, unitRowsOffByText: offRows.length, unitFamiliesAbsent: unitAbsent, unitRowsMissingAllowed: allowedMissing, unitRowsJoined: joined, at: new Date().toISOString() },
  };
  writeFileSync(p, `${JSON.stringify(j, null, 2)}\n`);
}
process.exit(pass ? 0 : 2);
