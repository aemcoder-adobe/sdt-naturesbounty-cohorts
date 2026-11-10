// compare live measure json vs proto measure json via selector map; print rect deltas > tol
import fs from 'node:fs';
const [liveF, protoF, mapF, tol = '2'] = process.argv.slice(2);
const L = JSON.parse(fs.readFileSync(liveF, 'utf8')), P = JSON.parse(fs.readFileSync(protoF, 'utf8'));
const lp = Object.values(L.pages)[0], pp = Object.values(P.pages)[0];
const map = fs.readFileSync(mapF, 'utf8').trim().split('\n').map((l) => l.split('\t'));
for (const w of Object.keys(pp)) {
  for (const [ls, ps] of map) {
    const la = [].concat(lp[w]?.[ls] || []).filter((m) => m && m.rect && m.visible), pa = [].concat(pp[w]?.[ps] || []).filter((m) => m && m.rect && m.visible);
    const n = Math.max(la.length, pa.length);
    for (let i = 0; i < Math.min(n, 3); i++) {
      const a = la[i]?.rect, b = pa[i]?.rect;
      if (!a || !b) { console.log(`${w} ${ls}[${i}] MISSING ${a ? 'proto' : 'live'} (live ${la.length} proto ${pa.length})`); continue; }
      const d = [b.x - a.x, b.y - a.y, b.w - a.w, b.h - a.h];
      if (d.some((v) => Math.abs(v) > +tol)) console.log(`${w} ${ls}[${i}] live ${a.x},${a.y} ${a.w}x${a.h}  Δ ${d.join(' ')}`);
    }
  }
}
