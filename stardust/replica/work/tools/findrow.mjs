import fs from 'node:fs';import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');const { PNG } = require('pngjs');
const [f, from, r, g, b, x = 5] = process.argv.slice(2);
const P = PNG.sync.read(fs.readFileSync(f));
for (let y = +from; y < P.height; y++) { const i = (y * P.width + +x) * 4; if (Math.abs(P.data[i] - r) < 3 && Math.abs(P.data[i + 1] - g) < 3 && Math.abs(P.data[i + 2] - b) < 3) { console.log(f.split('/').slice(-2).join('/'), 'first match y', y, 'height', P.height); break; } }
