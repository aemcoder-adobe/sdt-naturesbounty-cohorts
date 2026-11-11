#!/usr/bin/env node
/**
 * stardust/rollout/encoders/listing.mjs — ENCODER for the `listing` template (blog indexes:
 * /blogs/news, /blogs/recipes). Turns a migrated page (stardust/migrated/<path>/index.html,
 * fallback the capture stardust/current/pages/<slug>.html) into the DA body fragment
 * content/<path>.html.
 *
 * Blocks emitted (all variants live in the blocks):
 *   blog-hero          h1 (+ banner image(s) → variant image, /blogs/recipes page-hero)
 *   blog-filters       category links as one list
 *   listing-grid two   the 2-up "featured top" cards (when present)
 *   blog-featured      the Featured panel (when present)
 *   listing-grid       the main card grid
 *   listing-pagination Load More (links to the next listing page — dynamic-features row 14)
 *   listing-grid blog-list  the 3-card cross-blog strip (recipes)
 *   trusted-band, social-strip (title as default content), metadata
 *
 * Recognises both the migrated/prototype markup (.blog-hero, .related-card, …) and the live
 * capture markup (.blog__hero, .page-hero, .article-item, .blog-list, .instagram, …).
 */
/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax,
   import/no-extraneous-dependencies -- a sequential CLI over a browser page */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

const HELP = `listing.mjs — encode listing-template pages into DA body fragments

Usage:
  node stardust/rollout/encoders/listing.mjs (--path </da/path> … | --paths <file>) [options]
    --path <p>          DA path, e.g. /blogs/news (repeatable)
    --paths <file>      one DA path per line
    --source <s>        auto (default: migrated, else capture) | migrated | capture
    --out-dir <dir>     content tree root (default content) — writes <dir><path>.html
    --media-ledger <f>  media ledger mapping local media files to content.da.live URLs
                        (default stardust/deploy/media-ledger.json)
    --dry-run           print the fragment instead of writing it
    --help              this text

Writes: <out-dir><path>.html per page. Prints one line per page with its block counts and any
image it could not map to the media ledger (kept absolute when the source is a URL).
Exit: 0 ok, 1 a page failed, 2 usage.`;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}
const opt = {
  paths: [],
  source: 'auto',
  outDir: 'content',
  ledger: 'stardust/deploy/media-ledger.json',
  dry: false,
};
for (let i = 0; i < args.length; i += 1) {
  const a = args[i];
  const v = () => {
    const n = args[i + 1];
    if (!n || n.startsWith('--')) {
      console.error(`${a} needs a value`);
      process.exit(2);
    }
    i += 1;
    return n;
  };
  if (a === '--path') opt.paths.push(v());
  else if (a === '--paths') {
    readFileSync(v(), 'utf8').split('\n').map((l) => l.trim()).filter(Boolean)
      .forEach((p) => opt.paths.push(p));
  } else if (a === '--source') opt.source = v();
  else if (a === '--out-dir') opt.outDir = v();
  else if (a === '--media-ledger') opt.ledger = v();
  else if (a === '--dry-run') opt.dry = true;
  else {
    console.error(`unknown argument ${a}\n${HELP}`);
    process.exit(2);
  }
}
if (!opt.paths.length) {
  console.error(HELP);
  process.exit(2);
}

// ---------- media ledger: local file basename → content.da.live URL
const media = new Map();
if (existsSync(opt.ledger)) {
  const led = JSON.parse(readFileSync(opt.ledger, 'utf8'));
  Object.entries(led).forEach(([key, e]) => {
    if (!e || e.status !== 'uploaded' || !e.contentUrl) return;
    const b = basename(key);
    // prefer the blogs scope when a file was uploaded under several scopes
    if (!media.has(b) || key.startsWith('media/blogs/')) media.set(b, e.contentUrl);
  });
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

function resolveSrc(src, misses) {
  if (!src) return null;
  const clean = src.split('?')[0];
  const b = basename(clean);
  if (media.has(b)) return media.get(b);
  if (/^\/\//.test(src)) {
    misses.push(src);
    return `https:${src}`;
  }
  if (/^https?:/.test(src)) {
    if (!/content\.da\.live/.test(src)) misses.push(src);
    return src;
  }
  misses.push(src);
  return null;
}

let baseDir = '/';
// root-relative, extensionless internal hrefs; the migrated tree carries file-relative
// links (../../x/index.html) that resolve against the page's own folder
function normHref(href) {
  if (!href) return '';
  const h = href.replace(/^https?:\/\/(www\.)?naturesbounty\.com(?=\/|$|\?)/, '') || '/';
  if (/^(https?:|mailto:|tel:|#|\/\/)/.test(h)) return h;
  const u = new URL(h, `https://local${baseDir}`);
  const path = u.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
  return `${path}${u.search}${u.hash}`;
}

// ---------- in-page extraction (runs in the browser, JS disabled, no network)
function extract() {
  const q = (sel, root = document) => (root ? root.querySelector(sel) : null);
  const qa = (sel, root = document) => (root ? [...root.querySelectorAll(sel)] : []);
  const T = (el) => (el ? el.textContent.replace(/[ \t\r\n]+/g, ' ').trim() : '');
  const imgOf = (el) => {
    if (!el) return null;
    const i = el.matches('img') ? el : el.querySelector('img');
    return i ? { src: i.getAttribute('src'), alt: i.getAttribute('alt') || '' } : null;
  };
  const link = (a) => (a ? { href: a.getAttribute('href'), text: T(a) } : null);
  const card = (c) => {
    const titleEl = q('.related-card__title, h2, h3, .article-item-title, .article-item__title', c);
    const linkEl = q('.related-card__link, a.article-item__content, a.article-item-link', c)
      || (titleEl && titleEl.closest('a')) || q('a[href]', c);
    return {
      href: linkEl ? linkEl.getAttribute('href') : null,
      img: imgOf(c),
      tags: qa('.related-card__tags a, .article-item__tags a', c).map(link),
      title: T(titleEl),
      excerpt: T(q('.related-card__excerpt, .article-item__excerpt, .article-item-excerpt', c)),
      more: link(q('.related-card__more a', c)),
    };
  };
  const CARD = '.related-card, .listing-card, .article-item, .article-item-content';
  const cardsIn = (root) => qa(CARD, root).filter((c) => !c.parentElement.closest(CARD)).map(card);

  const heroEl = q('.blog-hero, .blog__hero, .page-hero');
  const h1 = q('h1');
  const hero = {
    title: T(h1),
    images: heroEl ? qa('img', heroEl).map(imgOf) : [],
  };
  const filters = qa('.blog-filters a, .blog__filters a').map(link);

  const topEl = q('.listing-top, .blog__featured-top');
  const featEl = q('.blog-featured, .blog__featured');
  let featured = null;
  if (featEl) {
    const exEl = q(
      '.blog-featured__excerpt, .blog__featured-content .article-item__excerpt',
      featEl,
    );
    const paras = qa('p', exEl).map(T).filter(Boolean);
    featured = {
      label: T(q('.blog-featured__label, .blog__featured-image-text', featEl)),
      img: imgOf(q('.blog-featured__holder, .blog__featured-image-holder', featEl) || featEl),
      tags: qa('.blog-featured__tags a, .article-item__tags a', featEl).map(link),
      title: T(q('.blog-featured__title, h2, h3', featEl)),
      excerpt: paras.length ? paras : [T(exEl)].filter(Boolean),
      more: link(q('.blog-featured__more, .blog__featured-more', featEl)),
    };
  }
  const gridEl = q('#blog-items, .listing-grid--main, .blog__listing, '
    + '.recipes-main .article-item__grid');
  const loadMore = link(q('.listing-pagination a, .blog__load-more, .recipes-main__load-more'));
  const blogListEl = q('.blog-list');
  const blogList = blogListEl ? {
    title: T(q('.article-container .title', blogListEl)),
    text: T(q('.article-container .text', blogListEl)),
    textLink: link(q('.article-container .text a[href]:not([href=""])', blogListEl)),
    cards: cardsIn(blogListEl),
  } : null;

  const trustEl = q('.trusted-band, section.content-banner');
  const trusted = trustEl ? {
    img: imgOf(trustEl),
    text: T(q('.trusted-band__text, .content-banner__text', trustEl)),
  } : null;
  const socialEl = q('.social-strip, section.instagram');
  const social = socialEl ? {
    title: T(q('.social-strip__title, .instagram__title', socialEl)),
    tiles: qa('.social-tile, .instagram__item', socialEl).map((t) => ({
      href: t.getAttribute('href'),
      img: imgOf(t),
      title: T(q('.social-tile__title, .instagram__item-content-title', t)),
      sub: T(q('.social-tile__sub, .instagram__item-content-subtitle', t)),
      cta: T(q('.social-tile__btn, .btn', t)),
    })),
  } : null;

  return {
    hero,
    filters,
    top: cardsIn(topEl),
    featured,
    grid: cardsIn(gridEl),
    loadMore,
    blogList,
    trusted,
    social,
  };
}

// ---------- serialisation
function block(name, rows) {
  const row = (cells) => `<div>${cells.map((c) => `<div>${c}</div>`).join('')}</div>`;
  const body = rows.map(row).join('');
  return `<div class="${name}">${body}</div>`;
}

const link = (href, text) => `<a href="${attr(normHref(href))}">${esc(text)}</a>`;
const uniq = (list) => [...new Set(list)].slice(0, 3).join(', ');

function imgTag(img, misses) {
  if (!img || !img.src) return '';
  const src = resolveSrc(img.src, misses);
  return src ? `<img src="${attr(src)}" alt="${attr(img.alt)}">` : '';
}

function tagList(tags) {
  if (!tags || !tags.length) return '';
  return `<ul>${tags.map((t) => `<li>${link(t.href, t.text)}</li>`).join('')}</ul>`;
}

function cardRow(c, misses) {
  const href = normHref(c.href);
  const title = `<h2>${href ? link(href, c.title) : esc(c.title)}</h2>`;
  let body = `${tagList(c.tags)}${title}`;
  if (c.excerpt) body += `<p>${esc(c.excerpt)}</p>`;
  if (c.more && c.more.text) body += `<p>${link(c.more.href, c.more.text)}</p>`;
  return [imgTag(c.img, misses), body];
}

function encode(m, meta, misses) {
  const sections = [];
  const firstImg = [m.top[0], m.grid[0]].find((c) => c && c.img);

  // 1. hero (+ filters)
  const heroImgs = m.hero.images.slice(0, 2)
    .map((i) => imgTag(i, misses))
    .filter(Boolean)
    .map((t) => `<p>${t}</p>`)
    .join('');
  const heroName = heroImgs ? 'blog-hero image' : 'blog-hero';
  let s1 = block(heroName, [[`${heroImgs}<h1>${esc(m.hero.title)}</h1>`]]);
  if (m.filters.length) {
    s1 += block('blog-filters', [[tagList(m.filters)]]);
  }
  sections.push(s1);

  // 2. listing body
  let s2 = '';
  if (m.top.length) s2 += block('listing-grid two', m.top.map((c) => cardRow(c, misses)));
  if (m.featured) {
    const f = m.featured;
    const c1 = (f.label ? `<p>${esc(f.label)}</p>` : '')
      + (f.img ? `<p>${imgTag(f.img, misses)}</p>` : '');
    let c2 = `${tagList(f.tags)}<h2>${esc(f.title)}</h2>`;
    c2 += f.excerpt.map((p) => `<p>${esc(p)}</p>`).join('');
    if (f.more) c2 += `<p><a href="${attr(normHref(f.more.href))}">${esc(f.more.text)}</a></p>`;
    s2 += block('blog-featured', [[c1, c2]]);
  }
  if (m.grid.length) s2 += block('listing-grid', m.grid.map((c) => cardRow(c, misses)));
  if (m.loadMore && m.loadMore.href) {
    const more = link(m.loadMore.href, m.loadMore.text);
    s2 += block('listing-pagination', [[`<p><em>${more}</em></p>`]]);
  }
  if (s2) sections.push(s2);

  // 3. cross-blog strip (recipes)
  if (m.blogList && m.blogList.cards.length) {
    let head = '';
    if (m.blogList.title) head += `<h2>${esc(m.blogList.title)}</h2>`;
    if (m.blogList.text) {
      const tl = m.blogList.textLink;
      head += tl && tl.text
        ? `<p><a href="${attr(normHref(tl.href))}">${esc(m.blogList.text)}</a></p>`
        : `<p>${esc(m.blogList.text)}</p>`;
    }
    const rows = m.blogList.cards.map((c) => cardRow(c, misses));
    sections.push(head + block('listing-grid blog-list', rows));
  }

  // 4. trusted band
  if (m.trusted) {
    const cell = `<p>${imgTag(m.trusted.img, misses)}</p><p>${esc(m.trusted.text)}</p>`;
    sections.push(block('trusted-band', [[cell]]));
  }
  // 5. social strip — title as default content
  if (m.social && m.social.tiles.length) {
    const rows = m.social.tiles.map((t) => [
      imgTag(t.img, misses),
      `<p><strong>${esc(t.title)}</strong>${t.sub ? ` ${esc(t.sub)}` : ''} `
        + `${link(t.href, t.cta || 'Shop Now')}</p>`,
    ]);
    const head = m.social.title ? `<h2>${esc(m.social.title)}</h2>` : '';
    sections.push(head + block('social-strip', rows));
  }

  // metadata
  const metaRows = [
    ['Title', esc(meta.title)],
    ['Description', esc(meta.description)],
  ];
  if (firstImg) {
    const tag = imgTag(firstImg.img, []);
    if (tag) metaRows.push(['Image', tag]);
  }
  metaRows.push(['Category', esc(meta.category)]);
  metaRows.push(['Template', 'listing']);
  sections.push(block('metadata', metaRows));

  const main = sections.map((s) => `    <div>${s}</div>`).join('\n');
  return `<body>\n  <header></header>\n  <main>\n${main}\n  </main>\n`
    + '  <footer></footer>\n</body>\n';
}

function readMeta(path, slug) {
  const metaFile = join('stardust/migrated', path, '_meta.json');
  if (existsSync(metaFile)) {
    const j = JSON.parse(readFileSync(metaFile, 'utf8'));
    if (j.metadata && j.metadata.title) return j.metadata;
  }
  const cap = join('stardust/current/pages', `${slug}.json`);
  if (existsSync(cap)) {
    const j = JSON.parse(readFileSync(cap, 'utf8'));
    return { title: j.title, description: j.description };
  }
  return {};
}

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const ctx = await browser.newContext({ javaScriptEnabled: false });
await ctx.route('**/*', (r) => (r.request().url().startsWith('data:') ? r.continue() : r.abort()));
let failed = 0;
for (const raw of opt.paths) {
  const path = `/${raw.replace(/^\/+|\/+$/g, '')}`;
  const slug = path.slice(1).replace(/\//g, '-') || 'index';
  const migrated = join('stardust/migrated', path, 'index.html');
  const capture = join('stardust/current/pages', `${slug}.html`);
  let src = null;
  if (opt.source !== 'capture' && existsSync(migrated)) src = migrated;
  else if (opt.source !== 'migrated' && existsSync(capture)) src = capture;
  if (!src) {
    console.error(`FAIL ${path}: no migrated page or capture`);
    failed += 1;
  } else {
    baseDir = src === migrated ? `${path}/` : '/';
    const page = await ctx.newPage();
    await page.setContent(readFileSync(src, 'utf8'), { waitUntil: 'domcontentloaded' });
    const model = await page.evaluate(extract);
    await page.close();
    const meta = readMeta(path, slug);
    meta.category = path.split('/').filter(Boolean).pop();
    const misses = [];
    const html = encode(model, meta, misses);
    const out = join(opt.outDir, `${path}.html`);
    if (opt.dry) console.log(html);
    else {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html);
    }
    const counts = `filters ${model.filters.length}, top ${model.top.length}, `
      + `featured ${model.featured ? 1 : 0}, `
      + `grid ${model.grid.length}, blog-list ${model.blogList ? model.blogList.cards.length : 0}, `
      + `social ${model.social ? model.social.tiles.length : 0}`;
    console.log(`OK ${path} <- ${src} -> ${opt.dry ? '(dry-run)' : out} · ${counts}${
      misses.length ? ` · ${misses.length} unmapped image(s): ${uniq(misses)}` : ''}`);
    if (!model.hero.title) {
      console.error(`FAIL ${path}: no h1 found`);
      failed += 1;
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
