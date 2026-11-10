const fs=require('fs');const cheerio=require('/app/node_modules/cheerio');
const $=cheerio.load(fs.readFileSync(process.argv[2],'utf8'));
const seen=new Set();
$('img').each((i,el)=>{const s=$(el).attr('src')||$(el).attr('data-src')||'';const ss=$(el).attr('srcset')||'';if(!s||seen.has(s))return;seen.add(s);
const anc=$(el).parents().map((j,p)=>p.attribs&&p.attribs.class?p.attribs.class.split(' ')[0]:p.tagName).get().slice(0,3).reverse().join('>');
console.log(`${anc}\t${s}\t${ss.slice(0,200)}`)});
