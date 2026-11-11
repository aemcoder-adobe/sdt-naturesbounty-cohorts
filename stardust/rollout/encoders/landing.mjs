#!/usr/bin/env node
/**
 * stardust/rollout/encoders/landing.mjs — ENCODER for the `landing` template (the home page,
 * EDS path / → content/index.html). Turns a migrated page (stardust/migrated/<path>/index.html,
 * fallback the gated prototype stardust/prototypes/<slug>-proposed.html) into the DA body
 * fragment content/<path>.html (/ → content/index.html).
 *
 * Sections / blocks emitted (each only when the source carries the module):
 *   video-hero          poster image, video link (root-relative, code-free content bus mp4), h1,
 *                       body, CTA (bold link)
 *   featured-grid       section title as default content (h2); content tile row + image tiles
 *   tabbed-products     title + text as default content; one pill row per collection followed by
 *                       its product rows; a trailing "Shop All" link row
 *   content-products    one row per highlight slide (content-highlight panels): side image |
 *                       product image | height word (short | medium | tall) | copy
 *   content-newsletter  left statement | title, copy, field placeholder, submit link
 *   testimonials        title as default content; one row per quote
 *   featured-content    lead row (title, text, links) + one row per article item
 *   trusted-band, social-strip (title as default content), metadata
 */
/* eslint-disable no-console, no-await-in-loop, no-restricted-syntax,
   import/no-extraneous-dependencies -- a sequential CLI over a browser page */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { basename, dirname, join } from 'node:path';

const HELP = `landing.mjs — encode landing-template pages into DA body fragments

Usage:
  node stardust/rollout/encoders/landing.mjs (--path </da/path> … | --paths <file>) [options]
    --path <p>          DA path, e.g. / (repeatable; / writes <out-dir>/index.html)
    --paths <file>      one DA path per line
    --source <s>        auto (default: migrated, else prototype) | migrated | prototype
    --out-dir <dir>     content tree root (default content)
    --media-ledger <f>  media ledger mapping local media files to content.da.live URLs
                        (default stardust/deploy/media-ledger.json)
    --video-base <p>    root-relative folder the hero mp4 is delivered from (default /media/home)
    --dry-run           print the fragment instead of writing it
    --help              this text

Writes: <out-dir><path>.html per page. Prints one line per page with its module counts and any
image it could not map to the media ledger (listed so it can be uploaded, then re-run).
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
  videoBase: '/media/home',
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
  else if (a === '--video-base') opt.videoBase = v().replace(/\/+$/, '');
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
    if (!media.has(b) || key.startsWith('media/home/')) media.set(b, e.contentUrl);
  });
}

const esc = (s) => String(s ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/\u00a0/g, '&nbsp;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

function resolveSrc(src, misses) {
  if (!src) return null;
  const clean = src.split('?')[0];
  const b = basename(clean);
  if (media.has(b)) return media.get(b);
  misses.push(b);
  if (/^\/\//.test(src)) return `https:${src}`;
  if (/^https?:/.test(src)) return src;
  return null;
}

// root-relative, extensionless internal hrefs (the migrated tree carries ./x/index.html links)
// the migration set (stardust/state.json pages): links to it are root-relative; any other
// source-host path stays absolute on the source host (the honest boundary, localize-links.mjs)
const inSet = new Set();
if (existsSync('stardust/state.json')) {
  JSON.parse(readFileSync('stardust/state.json', 'utf8')).pages.forEach((p) => {
    try {
      inSet.add(new URL(p.url).pathname.replace(/\/+$/, '') || '/');
    } catch { /* skip */ }
  });
}

function normHref(href) {
  if (!href) return '';
  const h = href.replace(/^https?:\/\/(www\.)?naturesbounty\.com(?=\/|$|\?)/, '') || '/';
  if (/^(https?:|mailto:|tel:|#|\/\/)/.test(h)) return h;
  const u = new URL(h, 'https://local/');
  const path = u.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
  const local = `${path}${u.search}${u.hash}`;
  return inSet.has(path.replace(/\/+$/, '') || '/') ? local : `https://naturesbounty.com${local}`;
}

// ---------- in-page extraction (runs in the browser, JS disabled, no network)
function extract() {
  const q = (sel, root = document) => (root ? root.querySelector(sel) : null);
  const qa = (sel, root = document) => (root ? [...root.querySelectorAll(sel)] : []);
  // inline HTML of a node, reduced to the tags DA keeps (strong, em, br, a); text verbatim
  const inline = (el) => {
    if (!el) return '';
    const out = [];
    const walk = (n) => {
      if (n.nodeType === 3) {
        out.push(n.textContent.replace(/[ \t\r\n]+/g, ' ')
          .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        return;
      }
      if (n.nodeType !== 1) return;
      const tag = n.tagName.toLowerCase();
      if (['svg', 'script', 'style', 'button'].includes(tag)) return;
      if (tag === 'br') {
        out.push('<br>');
        return;
      }
      const keep = {
        strong: 'strong', b: 'strong', em: 'em', i: 'em',
      }[tag];
      if (keep) out.push(`<${keep}>`);
      n.childNodes.forEach(walk);
      if (keep) out.push(`</${keep}>`);
    };
    el.childNodes.forEach(walk);
    return out.join('').trim();
  };
  // block-level children → list of paragraph inline HTML (a bare-text box is one paragraph)
  const paras = (el) => {
    if (!el) return [];
    const ps = qa('p', el);
    if (!ps.length) return [inline(el)].filter(Boolean);
    return ps.map(inline).filter((s) => s.replace(/&nbsp;|\s/g, ''));
  };
  const imgOf = (el) => {
    if (!el) return null;
    const i = el.matches('img') ? el : el.querySelector('img');
    return i ? { src: i.getAttribute('src'), alt: i.getAttribute('alt') || '' } : null;
  };
  const bgOf = (el) => {
    if (!el) return null;
    const m = (el.getAttribute('style') || '').match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/);
    return m ? { src: m[1], alt: '' } : null;
  };
  const T = (el) => (el ? el.textContent.replace(/[ \t\r\n]+/g, ' ').trim() : '');
  const link = (a) => (a ? { href: a.getAttribute('href'), text: T(a) } : null);

  const heroEl = q('.video-hero');
  const hero = heroEl ? {
    video: (() => {
      const s = q('video source, video[src]', heroEl);
      return s ? s.getAttribute('src') : null;
    })(),
    poster: (() => {
      const v = q('video', heroEl);
      return v && v.getAttribute('poster') ? { src: v.getAttribute('poster'), alt: '' } : null;
    })(),
    title: inline(q('h1', heroEl)),
    body: paras(q('.video-hero__body', heroEl)),
    cta: link(q('.video-hero__link', heroEl)),
  } : null;

  const fgEl = q('.featured-grid');
  const featuredGrid = fgEl ? {
    title: inline(q('.featured-grid__title', fgEl)),
    items: qa('.featured-grid__item', fgEl).map((it) => (it.matches('.featured-grid__item--content')
      ? {
        kind: 'content',
        title: inline(q('.featured-grid__item-title', it)),
        desc: inline(q('.featured-grid__item-desc', it)),
        link: link(q('.featured-grid__foot a', it)),
      }
      : {
        kind: 'image',
        img: imgOf(it),
        label: inline(q('.featured-grid__label', it)),
        href: q('a', it) ? q('a', it).getAttribute('href') : null,
      })),
  } : null;

  const tpEl = q('.tabbed-products');
  const tabbed = tpEl ? {
    title: inline(q('.tabbed-products__title', tpEl)),
    text: inline(q('.tabbed-products__text', tpEl)),
    pills: qa('.tabbed-products__pill', tpEl).map((p) => ({
      handle: p.getAttribute('data-collection-handle'),
      label: inline(p),
    })),
    slides: qa('.tabbed-products__slide', tpEl).map((s) => {
      const card = q('.product-card', s);
      return {
        handle: s.getAttribute('data-collection-handle'),
        href: (q('a.product-card__inner', card) || q('a', card)).getAttribute('href'),
        img: imgOf(q('.product-card__media', card)),
        title: inline(q('.product-card__title', card)),
        servings: inline(q('.product-card__servings', card)),
        avg: T(q('.rating__avg', card)),
        count: T(q('.rating__count', card)),
        desc: inline(q('.product-card__desc', card)),
        cta: T(q('.product-card__cta', card)) || 'View Product',
      };
    }),
    cta: link(q('.tabbed-products__cta', tpEl)),
  } : null;

  const cpEl = q('.content-products');
  const highlights = cpEl ? qa('.content-highlight', cpEl).map((h) => {
    const pimg = q('.image-highlight img', h);
    const mh = pimg ? (pimg.getAttribute('style') || '').match(/--max-h:\s*(\d+)px/) : null;
    return {
      side: bgOf(q('.content-highlight__image', h)),
      product: imgOf(q('.image-highlight', h)),
      maxH: mh ? Number(mh[1]) : null,
      subtitle: inline(q('.content-highlight__subtitle', h)),
      title: paras(q('.content-highlight__title', h)).join('<br>'),
      text: inline(q('.content-highlight__text', h)),
      cta: link(q('.content-highlight__actions a', h)),
    };
  }) : [];

  const nlEl = q('.content-newsletter');
  const newsletter = nlEl ? {
    left: paras(q('.content-newsletter__left', nlEl)),
    titles: qa('.content-newsletter__title h1, .content-newsletter__title h2, '
      + '.content-newsletter__title h3, .content-newsletter__title p', nlEl).map(inline),
    copy: paras(q('.content-newsletter__copy', nlEl)),
    placeholder: (q('input[type="email"]', nlEl) || { getAttribute: () => '' })
      .getAttribute('placeholder'),
    submit: T(q('[type="submit"]', nlEl)),
    action: (q('form', nlEl) || { getAttribute: () => '' }).getAttribute('action'),
  } : null;

  const tmEl = q('.testimonials');
  const testimonials = tmEl ? {
    title: inline(q('.testimonials__title', tmEl)),
    items: qa('.testimonials__item', tmEl).map((it) => ({
      img: imgOf(q('.testimonials__media', it)),
      product: link(q('.testimonials__media a', it)),
      title: inline(q('.testimonials__quote-title', it)),
      text: inline(q('.testimonials__quote-text', it)),
      reviewer: inline(q('.testimonials__reviewer', it)),
      more: link(q('.testimonials__quote > a', it)),
    })),
  } : null;

  const fcEl = q('.featured-content');
  const featuredContent = fcEl ? {
    title: paras(q('.featured-content__title', fcEl)).join('<br>'),
    text: qa('.featured-content__text p', fcEl).map(inline).filter(Boolean),
    links: qa('.featured-content__links a', fcEl).map(link),
    items: qa('.featured-content__item', fcEl).map((it) => ({
      title: paras(q('.featured-content__item-title', it)).join('<br>'),
      text: paras(q('.featured-content__item-text', it)),
      more: link(q('.featured-content__item-body > a', it)),
      img: imgOf(q('.featured-content__item-media', it)),
    })),
  } : null;

  const trustEl = q('.trusted-band');
  const trusted = trustEl ? { img: imgOf(trustEl), text: T(q('.trusted-band__text', trustEl)) }
    : null;
  const socialEl = q('.social-strip');
  const social = socialEl ? {
    title: T(q('.social-strip__title', socialEl)),
    tiles: qa('.social-tile', socialEl).map((t) => ({
      href: t.getAttribute('href'),
      img: imgOf(t),
      title: T(q('.social-tile__title', t)),
      sub: T(q('.social-tile__sub', t)),
      cta: T(q('.social-tile__btn', t)),
    })),
  } : null;

  return {
    hero,
    featuredGrid,
    tabbed,
    highlights,
    newsletter,
    testimonials,
    featuredContent,
    trusted,
    social,
  };
}

// ---------- serialisation
function block(name, rows) {
  const row = (cells) => `<div>${cells.map((c) => `<div>${c}</div>`).join('')}</div>`;
  return `<div class="${name}">${rows.map(row).join('')}</div>`;
}
const linkHtml = (l, inner) => `<a href="${attr(normHref(l.href))}">${inner ?? esc(l.text)}</a>`;
const P = (html) => (html ? `<p>${html}</p>` : '');

function imgTag(img, misses) {
  if (!img || !img.src) return '';
  const src = resolveSrc(img.src, misses);
  return src ? `<img src="${attr(src)}" alt="${attr(img.alt)}">` : '';
}

// --max-h (live per-slide product-image cap) → the closest word of the closed set
function heightWord(px) {
  if (!px) return 'medium';
  if (px < 450) return 'short';
  if (px < 510) return 'medium';
  return 'tall';
}

function encode(m, meta, misses, videoBase) {
  const sections = [];
  let firstImg = null;

  if (m.hero) {
    const h = m.hero;
    let cell = '';
    if (h.poster) {
      cell += P(imgTag(h.poster, misses));
      firstImg = firstImg || h.poster;
    }
    if (h.video) {
      const file = basename(h.video.split('?')[0]).toLowerCase();
      const href = `${videoBase}/${file}`;
      cell += P(`<a href="${attr(href)}">${esc(href)}</a>`);
    }
    cell += `<h1>${h.title}</h1>`;
    cell += h.body.map(P).join('');
    if (h.cta) cell += P(`<strong>${linkHtml(h.cta)}</strong>`);
    sections.push(block('video-hero', [[cell]]));
  }

  if (m.featuredGrid) {
    const g = m.featuredGrid;
    const rows = g.items.map((it) => {
      if (it.kind === 'content') {
        return ['', `<h3>${it.title}</h3>${P(it.desc)}${it.link ? P(linkHtml(it.link)) : ''}`];
      }
      return [imgTag(it.img, misses), P(linkHtml({ href: it.href }, it.label))];
    });
    sections.push((g.title ? `<h2>${g.title}</h2>` : '') + block('featured-grid', rows));
  }

  if (m.tabbed) {
    const t = m.tabbed;
    const rows = [];
    const handles = t.pills.map((p) => p.handle);
    t.slides.forEach((s) => {
      if (!handles.includes(s.handle)) handles.push(s.handle);
    });
    handles.forEach((handle) => {
      const pill = t.pills.find((p) => p.handle === handle);
      if (pill) rows.push(['', P(pill.label)]);
      t.slides.filter((s) => s.handle === handle).forEach((s) => {
        let body = `<h3>${s.title}</h3>${P(s.servings)}`;
        if (s.avg) body += P(esc(s.avg));
        if (s.count) body += P(esc(s.count));
        body += P(s.desc);
        body += P(`<strong>${linkHtml({ href: s.href }, esc(s.cta))}</strong>`);
        rows.push([imgTag(s.img, misses), body]);
      });
    });
    if (t.cta) rows.push(['', P(linkHtml(t.cta))]);
    const head = (t.title ? `<h2>${t.title}</h2>` : '') + P(t.text);
    sections.push(head + block('tabbed-products', rows));
  }

  if (m.highlights.length) {
    const rows = m.highlights.map((h) => {
      let copy = `<h3>${h.subtitle}</h3><h2>${h.title}</h2>${P(h.text)}`;
      if (h.cta) copy += P(`<strong>${linkHtml(h.cta)}</strong>`);
      return [
        imgTag(h.side, misses),
        imgTag(h.product, misses),
        heightWord(h.maxH),
        copy,
      ];
    });
    sections.push(block('content-products', rows));
  }

  if (m.newsletter) {
    const n = m.newsletter;
    let right = n.titles.map((t) => `<h3>${t}</h3>`).join('') + n.copy.map(P).join('');
    if (n.placeholder) right += P(esc(n.placeholder));
    if (n.submit) {
      const action = /^https?:/.test(n.action || '') ? n.action
        : `https://naturesbounty.com${(n.action || '/contact').replace(/^\.?\/?/, '/')}`;
      right += P(`<a href="${attr(action)}">${esc(n.submit)}</a>`);
    }
    sections.push(block('content-newsletter', [[n.left.map(P).join(''), right]]));
  }

  if (m.testimonials && m.testimonials.items.length) {
    const t = m.testimonials;
    const rows = t.items.map((it) => {
      const c1 = P(imgTag(it.img, misses)) + (it.product ? P(linkHtml(it.product)) : '');
      let c2 = `<h3>${it.title}</h3>${P(it.text)}`;
      if (it.reviewer) c2 += P(it.reviewer);
      if (it.more) c2 += P(linkHtml(it.more));
      return [c1, c2];
    });
    sections.push((t.title ? `<h2>${t.title}</h2>` : '') + block('testimonials', rows));
  }

  if (m.featuredContent) {
    const f = m.featuredContent;
    const lead = `<h2>${f.title}</h2>${f.text.map(P).join('')}${
      f.links.map((l) => P(linkHtml(l))).join('')}`;
    const rows = [['', lead]];
    f.items.forEach((it) => {
      const body = `<h3>${it.title}</h3>${it.text.map(P).join('')}${
        it.more ? P(linkHtml(it.more)) : ''}`;
      rows.push([imgTag(it.img, misses), body]);
    });
    sections.push(block('featured-content', rows));
  }

  if (m.trusted) {
    const cell = `${P(imgTag(m.trusted.img, misses))}${P(esc(m.trusted.text))}`;
    sections.push(block('trusted-band', [[cell]]));
  }
  if (m.social && m.social.tiles.length) {
    const rows = m.social.tiles.map((t) => [
      imgTag(t.img, misses),
      `<p><strong>${esc(t.title)}</strong>${t.sub ? ` ${esc(t.sub)}` : ''} `
        + `${linkHtml({ href: t.href }, esc(t.cta || 'Shop Now'))}</p>`,
    ]);
    const head = m.social.title ? `<h2>${esc(m.social.title)}</h2>` : '';
    sections.push(head + block('social-strip', rows));
  }

  const metaRows = [
    ['Title', esc(meta.title)],
    ['Description', esc(meta.description)],
  ];
  if (firstImg) {
    const tag = imgTag(firstImg, []);
    if (tag) metaRows.push(['Image', tag]);
  }
  metaRows.push(['Category', esc(meta.category)]);
  metaRows.push(['Template', 'landing']);
  sections.push(block('metadata', metaRows));

  const main = sections.map((s) => `    <div>${s}</div>`).join('\n');
  return `<body>\n  <header></header>\n  <main>\n${main}\n  </main>\n`
    + '  <footer></footer>\n</body>\n';
}

const decodeEntities = (s) => String(s || '')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'");

function readMeta(path, slug) {
  const metaFile = join('stardust/migrated', path, '_meta.json');
  if (existsSync(metaFile)) {
    const j = JSON.parse(readFileSync(metaFile, 'utf8'));
    if (j.metadata && j.metadata.title) {
      return { title: decodeEntities(j.metadata.title), description: j.metadata.description };
    }
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
  const proto = join('stardust/prototypes', `${slug}-proposed.html`);
  let src = null;
  if (opt.source !== 'prototype' && existsSync(migrated)) src = migrated;
  else if (opt.source !== 'migrated' && existsSync(proto)) src = proto;
  if (!src) {
    console.error(`FAIL ${path}: no migrated page or prototype`);
    failed += 1;
  } else {
    const page = await ctx.newPage();
    await page.setContent(readFileSync(src, 'utf8'), { waitUntil: 'domcontentloaded' });
    const model = await page.evaluate(extract);
    await page.close();
    const meta = readMeta(path, slug);
    meta.category = path === '/' ? 'home' : path.split('/').filter(Boolean).pop();
    const misses = [];
    const html = encode(model, meta, misses, opt.videoBase);
    const out = join(opt.outDir, path === '/' ? 'index.html' : `${path}.html`);
    if (opt.dry) console.log(html);
    else {
      mkdirSync(dirname(out), { recursive: true });
      writeFileSync(out, html);
    }
    const counts = `featured-grid ${model.featuredGrid ? model.featuredGrid.items.length : 0}, `
      + `products ${model.tabbed ? model.tabbed.slides.length : 0}, `
      + `highlights ${model.highlights.length}, `
      + `testimonials ${model.testimonials ? model.testimonials.items.length : 0}, `
      + `featured-content ${model.featuredContent ? model.featuredContent.items.length : 0}, `
      + `social ${model.social ? model.social.tiles.length : 0}`;
    const miss = [...new Set(misses)];
    console.log(`OK ${path} <- ${src} -> ${opt.dry ? '(dry-run)' : out} · ${counts}${
      miss.length ? ` · ${miss.length} unmapped image(s):\n  ${miss.join('\n  ')}` : ''}`);
    if (!model.hero || !model.hero.title) {
      console.error(`FAIL ${path}: no hero h1 found`);
      failed += 1;
    }
  }
}
await browser.close();
process.exit(failed ? 1 : 0);
