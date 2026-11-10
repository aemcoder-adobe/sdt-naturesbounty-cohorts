import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2];
const cands = { figtree: '/tmp/gf/figtree.woff2', mulish: '/tmp/gf/mulish.woff2', nunitosans: '/tmp/gf/nunitosans.woff2', outfit: '/tmp/gf/outfit.woff2' };
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(6000);
const data = Object.fromEntries(Object.entries(cands).map(([k, f]) => [k, fs.readFileSync(f).toString('base64')]));
const out = await p.evaluate(async (data) => {
  await document.fonts.ready;
  const faces = [...document.fonts].filter(f => /sofia/i.test(f.family)).map(f => `${f.family} ${f.weight} ${f.style} ${f.status}`);
  for (const [k, b64] of Object.entries(data)) {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const ff = new FontFace('cand-' + k, buf, { weight: '100 900' }); await ff.load(); document.fonts.add(ff);
  }
  const strings = ['The Benefits of Biotin', 'Dreaming of lustrous hair, healthy nails, and vibrant skin?* It’s time to start supporting your natural', 'More to explore from Hair', 'Explore more blogs: AGE DEFYING SKIN RENEWAL', 'Products Health Benefits Learn About Us Where to Buy', 'Receive the latest news, special offers and new product launches!', 'abcdefghijklmnopqrstuvwxyz ABCDEFGHIJKLMNOPQRSTUVWXYZ 0123456789'];
  const c = document.createElement('canvas').getContext('2d');
  const res = {};
  for (const w of [400, 500, 700]) {
    for (const fam of ['sofia-pro', ...Object.keys(data).map(k => 'cand-' + k)]) {
      c.font = `${w} 100px "${fam}"`;
      const tot = strings.reduce((s, t) => s + c.measureText(t).width, 0);
      const per = strings.map(t => Math.round(c.measureText(t).width));
      res[`${w} ${fam}`] = { tot: Math.round(tot), per };
    }
  }
  return { faces, res };
}, data);
console.log(JSON.stringify(out.faces));
for (const [k, v] of Object.entries(out.res)) console.log(k.padEnd(20), v.tot, v.per.join(' '));
await b.close();
