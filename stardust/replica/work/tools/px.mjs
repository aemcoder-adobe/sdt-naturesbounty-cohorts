import fs from 'node:fs';import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');const { PNG } = require('pngjs');
const src = PNG.sync.read(fs.readFileSync(process.argv[2]));
for (const xy of process.argv.slice(3)) { const [x,y]=xy.split(',').map(Number); const i=(y*src.width+x)*4; console.log(xy, `rgb(${src.data[i]},${src.data[i+1]},${src.data[i+2]})`); }
