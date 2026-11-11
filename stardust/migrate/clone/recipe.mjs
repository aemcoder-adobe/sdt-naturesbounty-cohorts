#!/usr/bin/env node
/**
 * stardust/migrate/clone/recipe.mjs — sibling clone for the `recipe` template (A' tier).
 *
 * Builds a recipe sibling's page from the archetype prototype's STRUCTURE
 * (stardust/prototypes/apple-crisp-proposed.html: head, site chrome, .recipe article,
 * share, product-rail aside, related, trusted-band, social-strip, footer) filled with the
 * sibling's CAPTURED content (stardust/current/pages/<slug>.html + .json): head metadata,
 * hero image + alt, h1, the recipe rich text (verbatim block nodes, attributes reduced to
 * href/src/alt/…), share hrefs, the product rail (title + cards, empty grid when the source
 * grid is empty, empty aside when the source has no rail), the 'More recipes' row AS
 * CAPTURED (the live row is server-rotated per request; the capture is the carried state),
 * and the site-wide trusted band / social strip (kept from the archetype after checking the
 * capture carries the same items).
 *
 * Usage:
 *   node stardust/migrate/clone/recipe.mjs <slug…> [--out <dir>]
 *        writes <dir>/<slug>.html (default dir stardust/.work/migrate/recipe)
 *   node stardust/migrate/clone/recipe.mjs --check <slug…> [--migrated <dir>]
 *        content-count acceptance: capture vs stardust/migrated/<path>/index.html; one line
 *        per page `OK|FAIL <slug> h a/b body a/b cta a/b img a/b …`; exit 1 on any FAIL
 *   --modules   with --check: also print the archetype block ids the page uses
 *   --help      this text (writes nothing)
 */
/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { findElements, parseSelector } from '../../scripts/replica/html-slice.mjs';

const USAGE = fs.readFileSync(new URL(import.meta.url), 'utf8')
  .split('\n').slice(2, 25).map((l) => l.replace(/^ \*\/?\s?/, '')).join('\n');
const PROTO = 'stardust/prototypes/apple-crisp-proposed.html';
const PAGES = 'stardust/current/pages';

/* ------------------------------------------------------------------ tiny HTML helpers */
const one = (html, sel) => (findElements(html, parseSelector(sel))[0] || {}).html || '';
const all = (html, sel) => findElements(html, parseSelector(sel), { all: true })
  .map((e) => e.html);
const attr = (tagHtml, name) => {
  const open = (tagHtml.match(/^<[^>]*>/) || [''])[0];
  const m = open.match(new RegExp(`(?:^|\\s)${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};
const inner = (html) => html.replace(/^<[^>]*>/, '').replace(/<\/[a-zA-Z][\w-]*>\s*$/, '');
const text = (html) => html.replace(/<svg\b[\s\S]*?<\/svg>/gi, '').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const abs = (u) => (u && u.startsWith('//') ? `https:${u}` : u);
const firstImg = (html) => (html.match(/<img\b[^>]*>/i) || [''])[0];
const imgTag = (imgHtml, extra = '') => {
  const src = abs(attr(imgHtml, 'src') || attr(imgHtml, 'data-src') || '');
  const alt = attr(imgHtml, 'alt') ?? '';
  const w = attr(imgHtml, 'width');
  const h = attr(imgHtml, 'height');
  const wh = w && h ? ` width="${w}" height="${h}"` : '';
  return `<img src="${src}" alt="${alt}"${wh}${extra}>`;
};

/* rich text: drop scripts/comments, keep block nodes verbatim with reduced attributes */
const KEEP = ['href', 'src', 'alt', 'width', 'height', 'target', 'rel', 'title', 'colspan',
  'rowspan', 'start', 'type'];
function richText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1>/gi, '')
    .replace(/<([a-zA-Z][\w-]*)\b([^>]*?)(\/?)>/g, (m, t, attrs, slash) => {
      const kept = KEEP.map((k) => {
        const v = attr(`<x ${attrs}>`, k);
        if (v === null) return null;
        return `${k}="${k === 'src' ? abs(v) : v}"`;
      }).filter(Boolean);
      return `<${t}${kept.length ? ` ${kept.join(' ')}` : ''}${slash}>`;
    })
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

/* block-level body: bare inline runs and <p>s carrying `<br><br>` runs become one <p> per
   paragraph (the encoder's own split), wrapper <div>s unwrap, empty nodes drop. A split that
   would cut an inline element in two is not made (the run stays one <p>). */
const BLOCKS = new Set(['p', 'div', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table',
  'blockquote', 'figure', 'section', 'article', 'iframe', 'video', 'hr']);
const BR_RUN = /(?:<br\s*\/?>\s*(?:&nbsp;\s*)*){2,}/i;
const balanced = (h) => ['a', 'b', 'strong', 'em', 'i', 'span', 'sup', 'sub', 'u'].every((t) => {
  const o = (h.match(new RegExp(`<${t}\\b`, 'gi')) || []).length;
  return o === (h.match(new RegExp(`</${t}>`, 'gi')) || []).length;
});
const isEmpty = (h) => !/<img\b/i.test(h)
  && !h.replace(/<[^>]+>/g, '').replace(/&nbsp;| /g, '').trim();
function paras(run) {
  const trimEdge = (h) => h.replace(/^(\s|&nbsp;|<br\s*\/?>)+|(\s|&nbsp;|<br\s*\/?>)+$/gi, '');
  const parts = run.split(new RegExp(BR_RUN.source, 'gi')).map(trimEdge);
  const ok = parts.every(balanced);
  return (ok ? parts : [trimEdge(run)]).filter((h) => !isEmpty(h)).map((h) => `<p>${h}</p>`);
}
export function blockify(html) {
  const out = [];
  let run = '';
  const flush = () => { out.push(...paras(run)); run = ''; };
  const tag = /<(\/?)([a-zA-Z][\w-]*)\b[^>]*>/g;
  let i = 0;
  let m;
  while ((m = tag.exec(html))) {
    const t = m[2].toLowerCase();
    if (m[1] || !BLOCKS.has(t)) continue;
    run += html.slice(i, m.index);
    const el = findElements(html.slice(m.index), { tag: t, cls: null, id: null })[0];
    const end = m.index + (el ? el.html.length : m[0].length);
    const node = html.slice(m.index, end);
    flush();
    if (t === 'p') out.push(...paras(inner(node)));
    else if (t === 'div') out.push(...blockify(inner(node)));
    else if (!isEmpty(node) || t === 'hr') out.push(node);
    i = end;
    tag.lastIndex = end;
  }
  run += html.slice(i);
  flush();
  return out;
}

/* ------------------------------------------------------------------ build */
function headFor(protoHead, cap) {
  let head = protoHead;
  const capTag = (re) => (cap.match(re) || [null])[0];
  const title = (cap.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (!title) throw new Error('capture has no <title>');
  head = head.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title.trim()}</title>`);
  const swap = (re) => {
    const t = capTag(re);
    head = head.replace(re, t || '');
  };
  swap(/<meta name="description"[^>]*>/i);
  swap(/<link rel="canonical"[^>]*>/i);
  for (const p of ['og:url', 'og:title', 'og:type', 'og:description', 'og:image',
    'og:image:secure_url', 'og:image:width', 'og:image:height']) {
    swap(new RegExp(`<meta property="${p.replace(/:/g, ':')}"[^>]*>`, 'i'));
  }
  return head.replace(/\n\s*\n/g, '\n');
}

function shareFor(protoShare, capShare) {
  const hrefs = Object.fromEntries(all(capShare, 'a.share-buttons__link')
    .map((a) => [(attr(a, 'data-platform') || '').toLowerCase(), attr(a, 'href')]));
  const texts = all(capShare, '.share-buttons__text').map(text);
  let out = protoShare.replace(
    /(<a class="share__link share__link--(\w+)" href=")[^"]*(")/g,
    (m, a, p, b) => {
      if (!hrefs[p]) throw new Error(`share: capture has no ${p} link`);
      return `${a}${hrefs[p]}${b}`;
    },
  );
  const protoTexts = [...protoShare.matchAll(/<p class="share__text[^"]*">([^<]*)<\/p>/g)];
  protoTexts.forEach((m, i) => {
    if (texts[i] === undefined) throw new Error('share: capture has fewer texts');
    out = out.replace(m[0], m[0].replace(`>${m[1]}<`, `>${texts[i]}<`));
  });
  return out;
}

function productCard(item) {
  const a = one(item, 'a.product-item__inner') || one(item, 'a');
  const href = attr(a, 'href') || '';
  const title = text(one(item, '.product-item__title'));
  const img = firstImg(one(item, '.product-item__image-holder') || item);
  const servings = text(one(item, '.product-item__servings'));
  const desc = text(one(item, '.product-item__description'));
  const cta = text(one(item, '.product-item__cta')) || 'View Product';
  const avg = text(one(item, '.bv_avgRating_component_container'));
  const count = text(one(item, '.bv_numReviews_text'));
  const sr = text(one(item, '.bv_offscreen_text'));
  const stars = inner(one(item, '.bv_stars_component_container')).trim()
    .replace(/<svg\b/g, '<svg class="rating__star"');
  const rating = avg ? `<div class="rating"><button class="rating__summary" type="button" `
    + `role="link" tabindex="-1"><span class="visually-hidden">${sr}</span>`
    + `<span class="rating__stars">${stars}</span><span class="rating__avg">${avg}</span>`
    + `<span class="rating__num">&nbsp;<span class="rating__count">${count}</span></span>`
    + '</button><span class="rating__extra"><button class="rating__write" type="button" '
    + 'aria-label="Write a Review (opens pop-up)">Write a review</button></span></div>' : '';
  return `            <div class="product-card">
              <a class="product-card__inner" href="${href}" aria-label="View product ${title}">
                <div class="product-card__body">
                  <div class="product-card__media">${imgTag(img)}</div>
                  <h4 class="product-card__title">${title}</h4>
${servings ? `                  <div class="product-card__servings">${servings}</div>\n` : ''}\
${rating ? `                  ${rating}\n` : ''}\
${desc ? `                  <div class="product-card__desc">${desc}</div>\n` : ''}\
                </div>
                <div class="product-card__foot"><button class="btn btn--lime product-card__cta" \
type="button" tabindex="-1" aria-label="${cta}">${cta}</button></div>
              </a>
            </div>`;
}

function railFor(capProducts) {
  if (!capProducts) return '';
  const title = text(one(capProducts, '.article-main__products-title'));
  const cards = all(capProducts, '.product-item').map(productCard);
  const grid = cards.length
    ? `<div class="product-rail__grid">\n${cards.join('\n')}\n          </div>`
    : '<div class="product-rail__grid" data-empty="true">\n\n          </div>';
  return `        <section class="product-rail">
          <div class="product-rail__title">${title}</div>
          ${grid}
        </section>
`;
}

function relatedFor(capRelated) {
  const title = text(one(capRelated, '.article-main__related-title'));
  const cards = all(capRelated, '.article-item').map((c) => {
    const media = one(c, '.article-item__image-holder');
    const mediaA = one(media, 'a');
    const content = one(c, 'a.article-item__content') || one(c, 'a.article-item__url');
    const href = attr(content, 'href') || attr(mediaA, 'href') || '';
    const label = attr(content, 'aria-label') || '';
    const h = inner(one(c, 'h2.article-item__title') || one(c, '.article-item__title')).trim();
    const exc = inner(one(c, '.article-item__excerpt') || one(c, '.article-item__more')).trim();
    const img = firstImg(media);
    return `        <div class="related-card">
          <div class="related-card__media"><a href="${attr(mediaA, 'href') || href}" \
aria-label="${attr(mediaA, 'aria-label') || 'Article Image'}">${imgTag(img)}</a></div>
          <a class="related-card__link" href="${href}" aria-label="${label}"><h2 \
class="related-card__title">${h}</h2><span class="related-card__excerpt">${exc}</span></a>
        </div>`;
  });
  return `    <section class="related container container--tight">
      <div class="related__title">${title}</div>
      <div class="related__grid">
${cards.join('\n')}
      </div>
    </section>
`;
}

/* site-wide bands: the archetype's own, after checking the capture carries the same items */
function checkBands(protoTail, cap) {
  const capInsta = all(cap, 'a.instagram__item').map((a) => attr(a, 'href'));
  const protoInsta = all(protoTail, 'a.social-tile').map((a) => attr(a, 'href'));
  if (capInsta.join() !== protoInsta.join()) {
    throw new Error(`social strip differs from the archetype (${capInsta.join(' ')})`);
  }
  const capTrust = text(one(cap, '.content-banner__text'));
  if (capTrust && !protoTail.includes(capTrust)) throw new Error('trusted band text differs');
}

export function build(slug) {
  const proto = fs.readFileSync(PROTO, 'utf8');
  const cap = fs.readFileSync(path.join(PAGES, `${slug}.html`), 'utf8');
  const iMain = proto.indexOf('<main ');
  const iEnd = proto.indexOf('</main>');
  const iHeadEnd = proto.indexOf('</head>');
  const protoHead = proto.slice(0, iHeadEnd);
  const chrome = proto.slice(iHeadEnd, iMain);
  const protoMain = proto.slice(iMain, iEnd);
  const tail = proto.slice(iEnd);
  checkBands(tail, cap);

  const art = one(cap, 'section.article-main');
  if (!art) throw new Error('capture has no section.article-main');
  const heroImg = firstImg(one(art, '.article-main__image'));
  const h1 = inner(one(art, '.article-main__title')).trim();
  if (!h1) throw new Error('capture has no title');
  const body = blockify(richText(inner(one(art, '.article-main__text')))).join(' ');
  const capShare = one(art, '.share-buttons');
  const protoShare = one(protoMain, 'div.share');
  const share = capShare ? shareFor(protoShare, capShare) : '';
  const rail = railFor(one(art, '.article-main__products'));
  const capRelated = one(art, '.article-main__related');
  const related = capRelated ? relatedFor(capRelated) : '';
  const hero = heroImg
    ? `    <figure class="recipe__hero">${imgTag(heroImg, ' fetchpriority="high"')}</figure>\n`
    : '';

  const main = `<main id="MainContent" class="recipe-page">
  <article class="recipe">
${hero}    <div class="recipe__body container container--tight">
      <div class="recipe__content">
        <h1 class="recipe__title">${h1}</h1>
        <div class="recipe__text rte">${body}</div>
        ${share.trim()}
      </div>
      <aside class="recipe__sidebar">
${rail}      </aside>
    </div>
${related}  </article>
`;
  return headFor(protoHead, cap) + chrome + main + tail;
}

/* ------------------------------------------------------------------ content-count check */
const roleCounts = (region) => ({
  h: (region.match(/<h[1-6]\b/gi) || []).length,
  cta: [...region.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].length,
  img: (region.match(/<img\b/gi) || []).length,
});
const norm = (s) => s.replace(/&amp;/g, '&').replace(/&nbsp;| /g, ' ').replace(/&#39;|’/g, "'")
  .replace(/&quot;|[“”]/g, '"').replace(/\s+/g, '');

export function check(slug, migratedDir) {
  const cap = fs.readFileSync(path.join(PAGES, `${slug}.html`), 'utf8');
  const capJson = JSON.parse(fs.readFileSync(path.join(PAGES, `${slug}.json`), 'utf8'));
  const urlPath = new URL(capJson.url).pathname.replace(/^\/|\/$/g, '');
  const out = fs.readFileSync(path.join(migratedDir, urlPath, 'index.html'), 'utf8');
  const art = one(cap, 'section.article-main');
  const main = one(out, 'main');
  const textA = one(art, '.article-main__text');
  const textB = one(main, '.recipe__text');
  const a = roleCounts(art);
  const b = roleCounts(main);
  // share links: same 5 hrefs; the source's share <a> count is part of both regions
  const capBlocks = blockify(richText(inner(textA))).join(' ');
  a.raw = all(textA, 'p').length + all(textA, 'li').length;
  const flat = (h) => h.replace(/\s+/g, '');
  const restructured = flat(capBlocks) !== flat(richText(inner(textA)));
  a.body = all(capBlocks, 'p').length + all(capBlocks, 'li').length;
  b.body = all(textB, 'p').length + all(textB, 'li').length;
  const capItems = all(cap, 'a.instagram__item').length;
  const outTiles = all(out, 'a.social-tile').length;
  const fails = [];
  ['h', 'body', 'cta', 'img'].forEach((k) => {
    if (a[k] !== b[k]) fails.push(`${k} ${a[k]}≠${b[k]}`);
  });
  if (capItems !== outTiles) fails.push(`social ${capItems}≠${outTiles}`);
  const renderText = norm(text(out));
  const missH = capJson.headings.filter((x) => !renderText.includes(norm(x.text)));
  const missB = capJson.body.filter((x) => !renderText.includes(norm(x)));
  if (missH.length) fails.push(`headings missing: ${missH.map((x) => x.text).join(' | ')}`);
  if (missB.length) fails.push(`body missing: ${missB.join(' | ').slice(0, 200)}`);
  const capHrefs = [...art.matchAll(/<a\b[^>]*\shref="([^"]*)"/gi)].map((m) => m[1]);
  const modules = ['recipe', 'share'];
  if (/class="product-rail"/.test(main)) modules.push('product-rail');
  if (/class="related /.test(main)) modules.push('related');
  if (/class="trusted-band"/.test(out)) modules.push('trusted-band');
  if (/class="social-strip"/.test(out)) modules.push('social-strip');
  const line = `h ${a.h}/${b.h}, body ${a.body}/${b.body} (source p+li ${a.raw}), `
    + `cta+href ${a.cta}/${b.cta} `
    + `(${new Set(capHrefs).size} distinct), img ${a.img}/${b.img}, social ${capItems}/${outTiles}`
    + `, json headings ${capJson.headings.length - missH.length}/${capJson.headings.length}`
    + `, json body ${capJson.body.length - missB.length}/${capJson.body.length}`;
  return {
    ok: !fails.length, line, fails, modules, restructured,
  };
}

/* ------------------------------------------------------------------ cli */
function main(argv) {
  if (argv.includes('--help') || argv.includes('-h')) { console.log(USAGE); return 0; }
  let outDir = 'stardust/.work/migrate/recipe';
  let migrated = 'stardust/migrated';
  const slugs = [];
  let mode = 'build';
  let mods = false;
  for (let i = 0; i < argv.length; i += 1) {
    const x = argv[i];
    if (x === '--out') { outDir = argv[i + 1]; i += 1; } else if (x === '--migrated') {
      migrated = argv[i + 1]; i += 1;
    } else if (x === '--check') mode = 'check';
    else if (x === '--modules') mods = true;
    else if (x.startsWith('--')) {
      console.error(`unknown option ${x}\n${USAGE}`);
      return 2;
    } else slugs.push(x);
  }
  if (!slugs.length) { console.error(USAGE); return 2; }
  let bad = 0;
  for (const slug of slugs) {
    try {
      if (mode === 'build') {
        fs.mkdirSync(outDir, { recursive: true });
        const f = path.join(outDir, `${slug}.html`);
        fs.writeFileSync(f, build(slug));
        console.log(`cloned ${slug} → ${f}`);
      } else {
        const r = check(slug, migrated);
        if (!r.ok) bad += 1;
        console.log(`${r.ok ? 'OK  ' : 'FAIL'} ${slug}: ${r.line}${r.fails.length
          ? ` — ${r.fails.join('; ')}` : ''}${r.restructured ? ' restructured' : ''}\
${mods ? ` modules=${r.modules.join(',')}` : ''}`);
      }
    } catch (e) {
      bad += 1;
      console.error(`error ${slug}: ${e.message}`);
    }
  }
  return bad ? 1 : 0;
}

process.exitCode = main(process.argv.slice(2));
