// usage: node tile.mjs in.png out.png bandH nBands startY  -> bands side by side
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');
const { PNG } = require('pngjs');
const [inp, out, bh0, n0, sy0 = 0] = process.argv.slice(2);
const src = PNG.sync.read(fs.readFileSync(inp));
const bh = +bh0, n = +n0, sy = +sy0, gap = 8;
const W = n * (src.width + gap), H = bh;
const dst = new PNG({ width: W, height: H }); dst.data.fill(128);
for (let b = 0; b < n; b++) for (let y = 0; y < bh; y++) {
  const syy = sy + b * bh + y; if (syy >= src.height) break;
  src.data.copy(dst.data, (y * W + b * (src.width + gap)) * 4, syy * src.width * 4, (syy + 1) * src.width * 4);
}
fs.writeFileSync(out, PNG.sync.write(dst)); console.log('wrote', out, W, H);
