import fs from 'node:fs';import { createRequire } from 'node:module';
const require = createRequire('/app/node_modules/');const { PNG } = require('pngjs');
const [a0,b0,out,ya,yb,h0]=process.argv.slice(2);
const A=PNG.sync.read(fs.readFileSync(a0)),B=PNG.sync.read(fs.readFileSync(b0));
const h=+h0,gap=10,W=A.width+B.width+gap;const D=new PNG({width:W,height:h});D.data.fill(255);
for(let r=0;r<h;r++){ if(+ya+r<A.height) A.data.copy(D.data,(r*W)*4,(+ya+r)*A.width*4,(+ya+r+1)*A.width*4);
 if(+yb+r<B.height) B.data.copy(D.data,(r*W+A.width+gap)*4,(+yb+r)*B.width*4,(+yb+r+1)*B.width*4);}
fs.writeFileSync(out,PNG.sync.write(D));console.log('wrote',out);
