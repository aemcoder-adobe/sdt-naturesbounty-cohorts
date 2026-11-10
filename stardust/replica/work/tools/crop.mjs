// usage: node crop.mjs in.png out.png y h [x w] [scale]
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');
const { PNG } = require('pngjs');
const [inp, out, y0, h0, x0 = 0, w0 = 0, sc = 1] = process.argv.slice(2);
const src = PNG.sync.read(fs.readFileSync(inp));
if (!out) { console.log(src.width, src.height); process.exit(0); }
const y = +y0, x = +x0, s = +sc;
const h = Math.min(+h0, src.height - y), w = (+w0 || src.width - x);
const W = Math.floor(w / s), H = Math.floor(h / s);
const dst = new PNG({ width: W, height: H });
for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
  const si = ((y + Math.floor(j * s)) * src.width + x + Math.floor(i * s)) * 4, di = (j * W + i) * 4;
  for (let k = 0; k < 4; k++) dst.data[di + k] = src.data[si + k];
}
fs.writeFileSync(out, PNG.sync.write(dst));
console.log('wrote', out, W, H);
