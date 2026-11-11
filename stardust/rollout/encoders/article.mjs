#!/usr/bin/env node
/**
 * stardust/rollout/encoders/article.mjs — ENCODER for the `article` template (blog posts).
 *
 * Turns a migrated article page (stardust/migrated/<path>/index.html, canon DOM) — or, when
 * that is absent, the captured live HTML (stardust/current/pages/<slug>.html, Shopify DOM) —
 * into the DA body fragment content/<path>.html:
 *
 *   section 1  article (hero | h1 + excerpt | body) · share · tag-nav · product-rail
 *   section 2  default-content <h2> "More to explore from …" + related (one row per card)
 *   section 3  trusted-band            section 4  social-strip
 *   section 5  metadata (Title, Description, Image, Category)
 *
 * Images are editorial: every authored <img> points at
 * https://content.da.live/<org>/<repo>/media/<scope>/<file>, and every one is listed in the
 * media manifest (--manifest) for `da-media-upload.mjs --manifest`. Links are written as
 * fully-qualified source URLs (D4); run `localize-links.mjs --source-host naturesbounty.com`
 * afterwards to root-relativize the ones whose target is in the content tree.
 * Content is verbatim: the only normalisation is the body's `<br><br>` runs becoming
 * paragraphs (same rendering, one editable unit per paragraph).
 *
 * Parsing runs in a headless Chromium DOMParser (no script execution, no network).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { chromium } from 'playwright';

const USAGE = `Usage: node stardust/rollout/encoders/article.mjs [options]
         (--path </da/path> … | --paths <file> | --all)
  --path <p>          DA path of one article page (repeatable),
                      e.g. /blogs/news/the-benefits-of-biotin
  --paths <file>      file with one DA path per line
  --all               every page with templateId "article" in stardust/rollout/coverage/pages.json
  --out <dir>         content root to write into (default: content)
  --org <org>         DA org (default: aemcoder)
  --repo <repo>       DA repo (default: 1a676f95)
  --media-scope <s>   folder under media/ for the page images (default: blogs —
                      shared with the listing unit, so the site-wide band images match)
  --manifest <file>   media manifest to write/merge for da-media-upload.mjs --manifest
                      (default: stardust/.work/rollout/article/media-manifest.json)
  --source-host <h>   live host links are qualified with (default: naturesbounty.com)
  --dry-run           print what would be written; write nothing
  --help              this text
Writes: <out>/<path>.html per page and the manifest (not with --dry-run or --help).
Exit: 0 ok, 1 a page failed to encode, 2 usage.`;

function parseArgs(argv) {
  const o = {
    paths: [], out: 'content', org: 'aemcoder', repo: '1a676f95', scope: 'blogs',
    manifest: 'stardust/.work/rollout/article/media-manifest.json',
    host: 'naturesbounty.com', all: false, dry: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const val = () => {
      const v = argv[i + 1];
      if (v === undefined || v.startsWith('--')) throw new Error(`${a} needs a value`);
      i += 1;
      return v;
    };
    if (a === '--help' || a === '-h') o.help = true;
    else if (a === '--path') o.paths.push(val());
    else if (a === '--paths') {
      o.paths.push(...fs.readFileSync(val(), 'utf8').split(/\r?\n/).map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#')));
    } else if (a === '--all') o.all = true;
    else if (a === '--out') o.out = val();
    else if (a === '--org') o.org = val();
    else if (a === '--repo') o.repo = val();
    else if (a === '--media-scope') o.scope = val();
    else if (a === '--manifest') o.manifest = val();
    else if (a === '--source-host') o.host = val();
    else if (a === '--dry-run') o.dry = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

/* ------------------------------------------------------------------ page discovery */

function coverageRows() {
  const f = 'stardust/rollout/coverage/pages.json';
  if (!fs.existsSync(f)) return [];
  const j = JSON.parse(fs.readFileSync(f, 'utf8'));
  const rows = Array.isArray(j) ? j : (j.pages || Object.values(j));
  return Array.isArray(rows) ? rows : [];
}

/** DA-safe path: percent-encoded bytes become `-xx` (the slug rule), lowercase. */
function safePath(p) {
  return p.replace(/%([0-9a-f]{2})/gi, (m, h) => `-${h.toLowerCase()}`)
    .toLowerCase().replace(/[^a-z0-9/-]+/g, '-').replace(/-{2,}/g, '-')
    .replace(/-+(\/|$)/g, '$1');
}

function captureFor(daPath, rows) {
  const row = rows.find((r) => r.path === daPath || safePath(r.path || '') === safePath(daPath));
  const slug = (row && row.slug) || safePath(daPath).replace(/^\//, '').replace(/\//g, '-');
  const candidates = [];
  if (row && row.source && row.source.currentStatePath) {
    candidates.push(row.source.currentStatePath.replace(/\.json$/, '.html'));
  }
  candidates.push(`stardust/current/pages/${slug}.html`);
  return candidates.find((f) => fs.existsSync(f)) || null;
}

function sourceFor(daPath, rows) {
  const migrated = path.join('stardust/migrated', daPath.replace(/^\//, ''), 'index.html');
  const decoded = path.join('stardust/migrated', decodeURIComponent(daPath).replace(/^\//, ''),
    'index.html');
  for (const f of [migrated, decoded]) {
    if (fs.existsSync(f)) return { file: f, kind: 'migrated' };
  }
  const hit = captureFor(daPath, rows);
  return hit ? { file: hit, kind: 'capture' } : null;
}

/* ------------------------------------------------------------------ in-page extraction */

/* eslint-disable no-undef -- runs inside the browser (DOMParser, Node, document) */
function extract({ html, base }) {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const $ = (sel, root = doc) => root.querySelector(sel);
  const $$ = (sel, root = doc) => [...root.querySelectorAll(sel)];
  const txt = (el) => (el ? el.textContent.replace(/\s+/g, ' ').trim() : '');
  const abs = (u) => {
    if (!u) return '';
    try { return new URL(u, base).href; } catch (e) { return u; }
  };
  const imgOf = (el) => {
    const img = el && (el.matches('img') ? el : el.querySelector('img'));
    if (!img) return null;
    const src = img.getAttribute('src') || img.getAttribute('data-src') || '';
    const alt = (img.getAttribute('alt') || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    return { src: abs(src), alt };
  };

  /* inline HTML: keep a/strong/em/br + text; unwrap everything else */
  const inline = (node) => {
    let out = '';
    node.childNodes.forEach((n) => {
      if (n.nodeType === 3) {
        out += n.textContent.replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/\u00a0/g, '&nbsp;');
        return;
      }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'SVG', 'svg', 'BUTTON', 'IFRAME']
        .includes(t)) return;
      if (n.classList && n.classList.contains('visually-hidden')) return;
      if (t === 'BR') { out += '<br>'; return; }
      // DA trims whitespace at the edges of inline marks: keep it OUTSIDE the tag
      const full = inline(n);
      const lead = (full.match(/^(\s|&nbsp;)+/) || [''])[0];
      const trail = full.length > lead.length ? (full.match(/(\s|&nbsp;)+$/) || [''])[0] : '';
      const inner = full.slice(lead.length, full.length - trail.length);
      if (['A', 'STRONG', 'B', 'EM', 'I'].includes(t)) out += lead;
      else out += lead + inner + trail;
      if (!['A', 'STRONG', 'B', 'EM', 'I'].includes(t)) return;
      if (t === 'A') {
        const href = n.getAttribute('href');
        if (!href || !inner.replace(/&nbsp;|\s|<br>/g, '')) {
          out += inner.replace(/<br>/g, '') + trail;
          return;
        }
        out += `<a href="${abs(href).replace(/"/g, '&quot;')}">${inner}</a>`;
      } else if (t === 'STRONG' || t === 'B') {
        out += inner.trim() ? `<strong>${inner}</strong>` : inner;
      } else out += inner.trim() ? `<em>${inner}</em>` : inner;
      out += trail;
    });
    return out;
  };

  /* body: block-level list; inline runs split into paragraphs on <br><br> */
  const blocks = [];
  // paragraph-gap census: a <br><br> split renders a blank 30px line at the source, a <p>
  // break 18px — the majority decides the article block's `line-gap` variant
  const gaps = { line: 0, p: 0 };
  const pushPara = (htmlRun, fromP) => {
    let made = 0;
    htmlRun.split(/(?:<br>\s*(?:&nbsp;\s*)*){2,}/).forEach((part) => {
      const clean = part.replace(/^(\s|&nbsp;|<br>)+|(\s|&nbsp;|<br>)+$/g, '');
      if (clean.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim() || /<img/.test(clean)) {
        blocks.push(`<p>${clean}</p>`);
        made += 1;
      }
    });
    if (made > 1) gaps.line += made - 1;
    if (fromP && made) gaps.p += 1;
  };
  const INLINE = new Set(['A', 'STRONG', 'B', 'EM', 'I', 'SPAN', 'BR', 'SUP', 'SUB', 'U', 'SMALL',
    'MARK', 'ABBR', 'CODE', 'FONT', 'S', 'LABEL', 'TIME']);
  let listGap = false;
  // blank lines between blocks — an empty <p> or a run of bare <br>s — render one 30px line
  // at the source; recorded as body indices (a zero-width-space paragraph keeps the line,
  // an empty one is dropped by the pipeline)
  const spacers = [];
  const spacer = () => {
    if (blocks.length && !spacers.includes(blocks.length)) spacers.push(blocks.length);
  };
  const walk = (container) => {
    let run = '';
    const flush = (beforeBlock) => {
      if (beforeBlock && /<br>/.test(run) && !run.replace(/<br>|&nbsp;|\s/g, '')) spacer();
      pushPara(run);
      run = '';
    };
    container.childNodes.forEach((n) => {
      if (n.nodeType === 3) { run += inline({ childNodes: [n] }); return; }
      if (n.nodeType !== 1) return;
      const t = n.tagName;
      if (INLINE.has(t)) {
        const im = n.querySelector('img');
        if (im) { flush(); const i = imgOf(im); if (i) blocks.push({ img: i }); }
        run += inline({ childNodes: [n] });
        return;
      }
      flush(true);
      if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'BUTTON', 'FORM', 'SVG', 'svg', 'HR']
        .includes(t)) return;
      if (/^H[1-6]$/.test(t)) {
        const lvl = Math.max(Number(t[1]), 2); // h5/h6 kept: the source styles them apart
        const h = inline(n).trim();
        if (h) blocks.push(`<h${lvl}>${h}</h${lvl}>`);
      } else if (t === 'P') {
        n.querySelectorAll('img').forEach((im) => {
          const i = imgOf(im);
          if (i) blocks.push({ img: i });
        });
        if (!n.textContent.replace(/\u00a0/g, '').trim() && !n.querySelector('img')) spacer();
        else pushPara(inline(n), true);
      } else if (t === 'UL' || t === 'OL') {
        // <br>s between the items render a blank 30px line each at the source
        if ([...n.children].some((c) => c.tagName === 'BR')) listGap = true;
        const items = [...n.children].filter((li) => li.tagName === 'LI')
          .map((li) => inline(li).trim()).filter(Boolean);
        if (items.length) {
          const tag = t.toLowerCase();
          blocks.push(`<${tag}>${items.map((i) => `<li>${i}</li>`).join('')}</${tag}>`);
        }
      } else if (t === 'IMG' || t === 'PICTURE') {
        const i = imgOf(n);
        if (i) blocks.push({ img: i });
      } else if (t === 'IFRAME' || t === 'VIDEO') {
        const src = n.getAttribute('src') || (n.querySelector('source') || {}).src;
        if (src) blocks.push(`<p><a href="${abs(src)}">${abs(src)}</a></p>`);
      } else if (t === 'TABLE') {
        $$('tr', n).forEach((tr) => {
          [...tr.children].forEach((td) => {
            const c = inline(td).trim();
            if (c) blocks.push(`<p>${c}</p>`);
          });
        });
      } else if (t === 'BLOCKQUOTE') {
        const q = inline(n).trim();
        if (q) blocks.push(`<blockquote><p>${q}</p></blockquote>`);
      } else walk(n);
    });
    flush();
  };

  const art = $('.article') || $('.article-main') || $('main') || doc.body;
  const heroEl = $('.article__hero, .article-main__image', art);
  const h1 = $('.article__title, .article-main__title', art) || $('h1', art);
  const excerptEl = $('.article__excerpt, .article-main__excerpt', art);
  const textEl = $('.article__text, .article-main__text', art);
  if (textEl) walk(textEl);

  const shareEl = $('.share, .share-buttons', art);
  const share = shareEl ? {
    texts: $$('.share__text, .share-buttons__text', shareEl).map(txt).filter(Boolean),
    links: $$('a[href]', shareEl).map((a) => {
      const label = [...a.children].find((c) => c.tagName === 'SPAN'
        && !c.classList.contains('visually-hidden'));
      const href = abs(a.getAttribute('href').replace(/^\/\//, 'https://'));
      return { href, text: txt(label || a) };
    }).filter((l) => l.text),
  } : null;

  const tagEl = $('.tag-nav, .article-main__tags-holder', art);
  const tagNav = tagEl ? {
    head: txt($('.tag-nav__head, .article-main__tags-top', tagEl)),
    links: $$('a[href]', tagEl).map((a) => ({ href: abs(a.getAttribute('href')), text: txt(a) }))
      .filter((l) => l.text),
  } : null;

  const railEl = $('.product-rail, .article-main__products', art);
  const rail = railEl ? {
    title: txt($('.product-rail__title, .article-main__products-title', railEl)),
    cards: $$('.product-card, .product-item', railEl).map((c) => {
      const a = $('a[href]', c);
      let rating = txt($('.rating__avg', c));
      let count = txt($('.rating__count', c));
      if (!rating) {
        const m = txt(c).match(/(\d(?:\.\d)?) out of 5 stars/);
        if (m) rating = m[1];
        const n = txt(c).match(/(\d[\d,]*) Reviews?/);
        if (n) count = `(${n[1]})`;
      }
      return {
        href: a ? abs(a.getAttribute('href')) : '',
        img: imgOf($('.product-card__media, .product-item__image-holder', c) || c),
        title: txt($('.product-card__title, .product-item__title', c)),
        servings: txt($('.product-card__servings, .product-item__servings', c)),
        rating,
        count,
        desc: txt($('.product-card__desc, .product-item__description', c)),
        cta: txt($('.product-card__cta, .product-item__cta', c)),
      };
    }).filter((c) => c.title),
  } : null;

  const relEl = $('.related, .article-main__related', art);
  const related = relEl ? {
    title: txt($('.related__title, .article-main__related-title', relEl)),
    cards: $$('.related-card, .article-item', relEl).map((c) => {
      const titleEl = $('.related-card__title, .article-item__title', c);
      const link = (titleEl && titleEl.closest('a[href]'))
        || $('a.related-card__link, a.article-item__url', c)
        || $('a[href]', c);
      const more = $('.related-card__more, .article-item__more', c);
      const exc = $('.related-card__excerpt, .article-item__excerpt', c);
      return {
        href: link ? abs(link.getAttribute('href')) : '',
        img: imgOf($('.related-card__media, .article-item__image-holder', c) || c),
        tags: $$('.related-card__tags a, .article-item__tags a', c)
          .map((a) => ({ href: abs(a.getAttribute('href')), text: txt(a) })).filter((t) => t.text),
        title: txt(titleEl),
        excerpt: txt(more || exc),
        excerptLinked: !!more,
        excerptHref: more && $('a[href]', more) ? abs($('a[href]', more).getAttribute('href')) : '',
      };
    }).filter((c) => c.title),
  } : null;

  const trustEl = $('.trusted-band, .content-banner');
  const trusted = trustEl ? {
    img: imgOf(trustEl),
    texts: $$('.trusted-band__text, .content-banner__text, p', trustEl).map(txt).filter(Boolean)
      .filter((t, i, a) => a.indexOf(t) === i),
  } : null;

  const socialEl = $('.social-strip, .instagram');
  const social = socialEl ? {
    title: txt($('.social-strip__title, .instagram__title', socialEl)),
    tiles: $$('.social-tile, .instagram__item', socialEl).map((t) => {
      const a = t.matches('a') ? t : $('a[href]', t);
      return {
        href: a ? abs(a.getAttribute('href')) : '',
        img: imgOf(t),
        title: txt($('.social-tile__title, .instagram__item-content-title', t)),
        sub: txt($('.social-tile__sub, .instagram__item-content-subtitle', t)),
        cta: txt($('.social-tile__btn, .instagram__item-content-text', t)),
      };
    }),
  } : null;

  const meta = (sel) => {
    const m = $(sel);
    return m ? (m.getAttribute('content') || '').trim() : '';
  };
  return {
    title: txt($('title')),
    description: meta('meta[name="description"]'),
    ogImage: meta('meta[property="og:image:secure_url"]') || meta('meta[property="og:image"]'),
    hero: imgOf(heroEl),
    h1: h1 ? inline(h1).trim() : '',
    excerpt: excerptEl ? inline(excerptEl).replace(/^(\s|<br>)+|(\s|<br>)+$/g, '') : '',
    body: blocks,
    lineGap: gaps.line > gaps.p,
    excerptP: !!(excerptEl && excerptEl.querySelector('p')),
    listGap,
    spacers,
    share,
    tagNav,
    rail,
    related,
    trusted,
    social,
  };
}
/* eslint-enable no-undef */

/* ------------------------------------------------------------------ emit */

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

function makeMedia(opts, pageFile, manifest) {
  return (img) => {
    if (!img || !img.src) return '';
    let local = null;
    let source = null;
    if (img.src.startsWith('file://')) {
      local = decodeURIComponent(new URL(img.src).pathname);
      local = path.relative(process.cwd(), local);
    } else if (/^https?:/.test(img.src)) {
      if (/content\.da\.live/.test(img.src)) {
        return `<img src="${attr(img.src)}" alt="${attr(img.alt)}">`;
      }
      source = img.src;
    }
    const raw = path.basename(new URL(img.src).pathname);
    const name = raw.replace(/[^A-Za-z0-9._-]+/g, '-');
    const file = local && fs.existsSync(local) ? local
      : path.join('stardust/.work/rollout/article/media', name);
    if (!manifest.some((m) => m.name === name)) {
      const fetchIt = source && !(local && fs.existsSync(local));
      manifest.push(fetchIt ? { file, source, name } : { file, name });
    }
    const url = `https://content.da.live/${opts.org}/${opts.repo}/media/${opts.scope}/${name}`;
    return `<img src="${attr(url)}" alt="${attr(img.alt)}">`;
  };
}

function qualify(opts) {
  // file:// links (migrated relative hrefs) → https://<host>/<path>, extensionless
  return (href) => {
    if (!href) return '';
    let u;
    try { u = new URL(href); } catch (e) { return href; }
    if (u.protocol === 'file:') {
      const rel = path.relative(path.resolve('stardust/migrated'), decodeURIComponent(u.pathname));
      if (rel.startsWith('..')) return href;
      let p = `/${rel.split(path.sep).join('/')}`;
      p = p.replace(/\/index\.html$/, '').replace(/\.html$/, '') || '/';
      return `https://${opts.host}${p}${u.search}${u.hash}`;
    }
    if (u.host === opts.host || u.host === `www.${opts.host}`) {
      const p = u.pathname.replace(/\/index\.html$/, '').replace(/\.html$/, '')
        .replace(/(.)\/$/, '$1');
      return `https://${opts.host}${p}${u.search}${u.hash}`;
    }
    return href;
  };
}

function fixLinks(html, q) {
  return html.replace(/href="([^"]*)"/g, (m, h) => `href="${attr(q(h.replace(/&amp;/g, '&')))}"`);
}

function block(name, rows) {
  const r = rows.map((cells) => `<div>${cells.map((c) => `<div>${c}</div>`).join('')}</div>`);
  return `<div class="${name}">${r.join('')}</div>`;
}

function encode(data, opts, media, q) {
  const sections = [];
  const link = (h, t) => `<a href="${attr(q(h))}">${esc(t)}</a>`;

  /* section 1: article + share + tag-nav + product-rail */
  const s1 = [];
  const artRows = [];
  if (data.hero) artRows.push([`<p>${media(data.hero)}</p>`]);
  artRows.push([`<h1>${data.h1}</h1>${data.excerpt ? `<p>${data.excerpt}</p>` : ''}`]);
  const body = data.body
    .map((b) => (typeof b === 'string' ? b : `<p>${media(b.img)}</p>`)).join('');
  if (body) artRows.push([fixLinks(body, q)]);
  // variants carry source spacing the content model cannot: <br><br> paragraph gaps, an
  // excerpt authored as a <p> (22px margins inside its rules), <br>s between list items
  const variants = [data.lineGap && 'line-gap', data.excerptP && 'excerpt-gap',
    data.listGap && 'list-gap'].filter(Boolean);
  s1.push(fixLinks(block(['article', ...variants].join(' '), artRows), q));
  if (data.share && data.share.links.length) {
    const t = data.share.texts.map((x) => `<p>${esc(x)}</p>`).join('');
    const l = data.share.links.map((x) => `<li>${link(x.href, x.text)}</li>`).join('');
    s1.push(block('share', [[`${t}<ul>${l}</ul>`]]));
  }
  if (data.tagNav && data.tagNav.links.length) {
    const l = data.tagNav.links.map((x) => `<li>${link(x.href, x.text)}</li>`).join('');
    const h = data.tagNav.head ? `<p>${esc(data.tagNav.head)}</p>` : '';
    s1.push(block('tag-nav', [[`${h}<ul>${l}</ul>`]]));
  }
  if (data.rail && (data.rail.cards.length || data.rail.title)) {
    const rows = [];
    if (data.rail.title) rows.push([`<p>${esc(data.rail.title)}</p>`, '']);
    data.rail.cards.forEach((c) => {
      const parts = [`<h3>${esc(c.title)}</h3>`];
      if (c.servings) parts.push(`<p>${esc(c.servings)}</p>`);
      if (c.rating) parts.push(`<p>${esc(c.rating)}</p>`);
      if (c.rating && c.count) parts.push(`<p>${esc(c.count)}</p>`);
      if (c.desc) parts.push(`<p>${esc(c.desc)}</p>`);
      if (c.href) parts.push(`<p><strong>${link(c.href, c.cta || 'View Product')}</strong></p>`);
      rows.push([`<p>${media(c.img)}</p>`, parts.join('')]);
    });
    s1.push(block('product-rail', rows));
  }
  sections.push(s1.join('\n'));

  /* section 2: related */
  if (data.related && data.related.cards.length) {
    const rows = data.related.cards.map((c) => {
      const parts = [];
      if (c.tags.length) {
        const li = c.tags.map((t) => `<li>${link(t.href, t.text)}</li>`).join('');
        parts.push(`<ul>${li}</ul>`);
      }
      parts.push(`<h3>${c.href ? link(c.href, c.title) : esc(c.title)}</h3>`);
      if (c.excerpt) {
        parts.push(c.excerptLinked
          ? `<p>${link(c.excerptHref || c.href, c.excerpt)}</p>` : `<p>${esc(c.excerpt)}</p>`);
      }
      return [`<p>${media(c.img)}</p>`, parts.join('')];
    });
    const head = data.related.title ? `<h2>${esc(data.related.title)}</h2>\n` : '';
    sections.push(`${head}${block('related', rows)}`);
  }

  /* section 3/4: site-wide bands (blocks owned by the listing unit) */
  if (data.trusted && (data.trusted.img || data.trusted.texts.length)) {
    const img = data.trusted.img ? `<p>${media(data.trusted.img)}</p>` : '';
    const cell = `${img}${data.trusted.texts.map((t) => `<p>${esc(t)}</p>`).join('')}`;
    sections.push(block('trusted-band', [[cell]]));
  }
  if (data.social && data.social.tiles.length) {
    // same model as the listing unit's social-strip: head = default-content heading
    const rows = data.social.tiles.map((t) => {
      const parts = [];
      if (t.title) parts.push(`<p>${esc(t.title)}</p>`);
      if (t.sub) parts.push(`<p>${esc(t.sub)}</p>`);
      if (t.href) parts.push(`<p>${link(t.href, t.cta || 'Shop Now')}</p>`);
      return [media(t.img), parts.join('')];
    });
    const head = data.social.title ? `<h2>${esc(data.social.title)}</h2>\n` : '';
    sections.push(`${head}${block('social-strip', rows)}`);
  }

  /* metadata */
  const metaRows = [['Title', esc(data.title)]];
  if (data.description) metaRows.push(['Description', esc(data.description)]);
  if (data.hero) metaRows.push(['Image', media(data.hero)]);
  const cat = data.related && (data.related.title.match(/from\s+(.+)$/i) || [])[1];
  if (cat) metaRows.push(['Category', esc(cat)]);
  sections.push(block('metadata', metaRows));

  const main = sections.map((s) => `    <div>\n${s}\n    </div>`).join('\n');
  return `<body>\n  <header></header>\n  <main>\n${main}\n  </main>\n`
    + '  <footer></footer>\n</body>\n';
}

/* ------------------------------------------------------------------ main */

async function main() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`article encoder: ${e.message}\n${USAGE}`);
    process.exit(2);
  }
  if (opts.help) {
    console.log(USAGE);
    return;
  }
  const rows = coverageRows();
  if (opts.all) {
    rows.filter((r) => r.templateId === 'article' || r.template === 'article')
      .forEach((r) => opts.paths.push(r.path));
    const step = JSON.parse(fs.readFileSync('stardust/rollout/plan.json', 'utf8')).steps || [];
    step.filter((s) => s.isRepresentative && (s.convert || []).some((c) => c.id === 'article'))
      .forEach((s) => opts.paths.push(s.path));
  }
  opts.paths = [...new Set(opts.paths)];
  if (!opts.paths.length) {
    console.error(`article encoder: no pages given\n${USAGE}`);
    process.exit(2);
  }

  const manifest = fs.existsSync(opts.manifest)
    ? JSON.parse(fs.readFileSync(opts.manifest, 'utf8')) : [];
  const browser = await chromium.launch();
  const page = await browser.newPage();
  let failed = 0;
  for (const daPath of opts.paths) {
    const src = sourceFor(daPath, rows);
    if (!src) {
      console.log(`FAIL ${daPath} — no migrated page and no capture`);
      failed += 1;
      continue;
    }
    try {
      const html = fs.readFileSync(src.file, 'utf8');
      const base = src.kind === 'migrated'
        ? `file://${path.resolve(src.file)}`
        : `https://${opts.host}${daPath}`;
      // eslint-disable-next-line no-await-in-loop
      const data = await page.evaluate(extract, { html, base });
      if (!data.h1) throw new Error('no article title found');
      // facts the migrated render loses are read from the capture: the paragraph-gap census
      // (it turns <br><br> runs into <p>) and the rail title the source keeps above an empty,
      // client-filled grid on pages without products (the render drops the rail there)
      const cap = src.kind === 'migrated' ? captureFor(daPath, rows) : null;
      if (cap) {
        // eslint-disable-next-line no-await-in-loop
        const c = await page.evaluate(extract, {
          html: fs.readFileSync(cap, 'utf8'), base: `https://${opts.host}${daPath}`,
        });
        data.lineGap = c.lineGap;
        data.excerptP = c.excerptP;
        data.listGap = c.listGap;
        // only when the capture's body aligns block for block with the render's
        if (c.spacers.length && c.body.length === data.body.length) {
          [...c.spacers].sort((a, b) => b - a)
            .forEach((i) => data.body.splice(i, 0, '<p>\u200b</p>'));
        }
        if (!data.rail && c.rail && c.rail.title && !c.rail.cards.length) {
          data.rail = { title: c.rail.title, cards: [] };
        }
      }
      const outPath = safePath(daPath);
      const media = makeMedia(opts, src.file, manifest);
      const out = encode(data, opts, media, qualify(opts));
      const file = path.join(opts.out, `${outPath.replace(/^\//, '')}.html`);
      if (!opts.dry) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, out);
      }
      const n = (k) => (data[k]
        && (data[k].cards || data[k].links || data[k].tiles || []).length) || 0;
      console.log(`${opts.dry ? 'DRY ' : 'OK  '}${daPath} → ${file} (${src.kind}; `
        + `body ${data.body.length}, share ${n('share')}, tags ${n('tagNav')}, `
        + `products ${n('rail')}, related ${n('related')}, `
        + `social ${n('social')}${outPath !== daPath ? `; path normalised ${outPath}` : ''})`);
    } catch (e) {
      console.log(`FAIL ${daPath} — ${e.message}`);
      failed += 1;
    }
  }
  await browser.close();
  if (!opts.dry) {
    fs.mkdirSync(path.dirname(opts.manifest), { recursive: true });
    fs.writeFileSync(opts.manifest, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`manifest ${opts.manifest}: ${manifest.length} images (scope ${opts.scope})`);
  }
  process.exit(failed ? 1 : 0);
}

main();
