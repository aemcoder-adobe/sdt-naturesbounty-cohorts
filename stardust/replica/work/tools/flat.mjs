// flatten measure.mjs --json output into a grep-able table
import fs from 'node:fs';
const j = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const DEF = { position: 'static', boxSizing: 'border-box', maxWidth: 'none', margin: '0px', padding: '0px', gap: 'normal', backgroundColor: 'rgba(0, 0, 0, 0)', backgroundImage: 'none', textTransform: 'none', textAlign: 'start', borderRadius: '0px', boxShadow: 'none', opacity: '1', objectFit: 'fill', letterSpacing: 'normal' };
const out = [];
for (const [url, byW] of Object.entries(j.pages)) for (const [w, bySel] of Object.entries(byW)) for (const [sel, arr] of Object.entries(bySel)) {
  for (const m of (Array.isArray(arr) ? arr : [arr])) {
    if (!m || !m.rect) { out.push(`${w}\t${sel}\tMISSING`); continue; }
    const pr = Object.entries(m.props || {}).filter(([k, v]) => DEF[k] !== v && !['width', 'height'].includes(k) && !(k === 'border' && /^0px none/.test(v))).map(([k, v]) => `${k}=${String(v).replace('sofia-pro, Montserrat, sans-serif', 'SP')}`).join(' ');
    out.push(`${w}\t${sel}[${m.index}/${m.of}]\t${m.rect.x},${m.rect.y} ${m.rect.w}x${m.rect.h}${m.visible ? '' : ' HIDDEN'}\t${pr}\t"${(m.text || '').slice(0, 30)}"${m.img ? ' img=' + JSON.stringify(m.img) : ''}`);
  }
}
fs.writeFileSync(process.argv[3], out.join('\n') + '\n'); console.log(out.length, 'rows');
