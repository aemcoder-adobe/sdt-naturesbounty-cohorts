const fs=require('fs');const cheerio=require('/app/node_modules/cheerio');
const $=cheerio.load(fs.readFileSync(process.argv[2],'utf8'));
const seen=new Map();
$('svg').each((i,el)=>{const html=$.html(el).replace(/\s+/g,' ');const p=$(el).parent();const ctx=(p.attr('class')||p.get(0).tagName)+' / '+((p.parent().attr('class')||'').split(' ')[0]);
 if(/klaviyo|kl-|onetrust|ot-/.test(ctx))return; if(!seen.has(html))seen.set(html,[]);seen.get(html).push(ctx);});
let out='';let n=0;for(const [h,c] of seen){out+=`### svg${n++} x${c.length} ctx: ${[...new Set(c)].slice(0,3).join(' | ')} len ${h.length}\n${h}\n`;}
fs.writeFileSync(process.argv[3],out);console.log(n);
