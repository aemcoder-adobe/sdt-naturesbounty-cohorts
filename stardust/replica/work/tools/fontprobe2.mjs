import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');
const { chromium } = require('playwright');
const url = process.argv[2];
const cands = Object.fromEntries((process.argv[3] || 'figtree').split(',').map(n => [n, '/tmp/gf/' + n + '.woff2']));
const b = await chromium.launch({ channel: 'chrome', headless: true });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
await p.waitForTimeout(6000);
const data = Object.fromEntries(Object.entries(cands).map(([k, f]) => [k, fs.readFileSync(f).toString('base64')]));
const out = await p.evaluate(async (data) => {
  await document.fonts.ready;
  for (const [k, b64] of Object.entries(data)) {
    const buf = Uint8Array.from(atob(b64), c => c.charCodeAt(0)).buffer;
    const ff = new FontFace('cand-' + k, buf, { weight: '100 900' }); await ff.load(); document.fonts.add(ff);
  }
  const groups = { body: '.article-main__text', tags: '.article-main__tag', relTitle: 'h2.article-item__title', h1: '.article-main__title', prodTitle: '.product-item__title', servings: '.product-item__servings', desc: '.product-item__description', footLinks: '.footer__navigation-link-child', nav: '.header__nav-link', disclaimer: '.footer__disclaimer p', relTags: '.article-item__tags a', excerpt: '.article-main__excerpt-inner' };
  const c = document.createElement('canvas').getContext('2d');
  const res = {};
  for (const [g, sel] of Object.entries(groups)) {
    const els = [...document.querySelectorAll(sel)];
    const tot = { 'sofia-pro': 0 }; Object.keys(data).forEach(k => tot[k] = 0);
    for (const el of els) {
      const cs = getComputedStyle(el);
      let t = el.innerText.replace(/\s+/g, ' ').trim();
      if (cs.textTransform === 'uppercase') t = t.toUpperCase();
      for (const fam of Object.keys(tot)) {
        c.font = `${cs.fontWeight} ${cs.fontSize} "${fam === 'sofia-pro' ? 'sofia-pro' : 'cand-' + fam}"`;
        c.letterSpacing = cs.letterSpacing;
        tot[fam] += c.measureText(t).width;
      }
    }
    res[g] = Object.fromEntries(Object.entries(tot).map(([k, v]) => [k, k === 'sofia-pro' ? Math.round(v) : +(100 * (v / tot['sofia-pro'] - 1)).toFixed(2)]));
  }
  return res;
}, data);
for (const [g, r] of Object.entries(out)) console.log(g.padEnd(11), JSON.stringify(r));
await b.close();
