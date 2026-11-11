#!/usr/bin/env node
/**
 * stardust/migrate/clone/listing.mjs — Path A′ structural clone for the `listing` template
 * (blog indexes). Forks the archetype prototype (stardust/prototypes/blogs-news-proposed.html:
 * head, canon chrome, footer, scripts verbatim) and injects one sibling's captured content
 * (stardust/current/pages/<slug>.json + .html) into the archetype's slot structure — the
 * structure the listing encoder (stardust/rollout/encoders/listing.mjs) reads:
 *   .blog-hero (h1, optional banner images → variant blog-hero--image), .blog-filters,
 *   .listing-top/.listing-grid--two, .blog-featured, #blog-items.listing-grid--main,
 *   .listing-pagination, .blog-list (cross-blog strip → listing-grid--blog-list),
 *   .trusted-band, .social-strip.
 * Never pastes the live DOM: every node is re-authored from extracted text/attributes.
 */
/* eslint-disable no-console */
import {
  existsSync, mkdirSync, readFileSync, writeFileSync,
} from 'node:fs';
import { basename, join } from 'node:path';
import { findElements, parseSelector } from '../../scripts/replica/html-slice.mjs';

const HELP = `listing.mjs — clone listing-template siblings from the archetype prototype

Usage:
  node stardust/migrate/clone/listing.mjs <slug…> [options]
    --archetype <file>  archetype prototype (default stardust/prototypes/blogs-news-proposed.html)
    --current <dir>     capture root (default stardust/current)
    --out-dir <dir>     output dir (default stardust/.work/migrate/listing)
    --dry-run           print counts only, write nothing
    --help              this text

Writes: <out-dir>/<slug>.html per slug, one line per page with its slot counts.
Exit: 0 ok, 1 a page failed, 2 usage.`;

const argv = process.argv.slice(2);
if (argv.includes('--help') || argv.includes('-h')) {
  console.log(HELP);
  process.exit(0);
}
const opt = {
  slugs: [],
  archetype: 'stardust/prototypes/blogs-news-proposed.html',
  current: 'stardust/current',
  outDir: 'stardust/.work/migrate/listing',
  dry: false,
};
for (let i = 0; i < argv.length; i += 1) {
  const a = argv[i];
  const v = () => {
    const n = argv[i + 1];
    if (!n || n.startsWith('--')) {
      console.error(`${a} needs a value`);
      process.exit(2);
    }
    i += 1;
    return n;
  };
  if (a === '--archetype') opt.archetype = v();
  else if (a === '--current') opt.current = v();
  else if (a === '--out-dir') opt.outDir = v();
  else if (a === '--dry-run') opt.dry = true;
  else if (a.startsWith('--')) {
    console.error(`unknown argument ${a}\n${HELP}`);
    process.exit(2);
  } else opt.slugs.push(a);
}
if (!opt.slugs.length) {
  console.error(HELP);
  process.exit(2);
}

// ---------- tiny DOM helpers over the capture (regex walker from html-slice.mjs)
const sel = (s) => {
  const [tag, cls] = s.split('.');
  return parseSelector(cls ? `${tag}.${cls}` : tag);
};
const one = (html, s) => (html ? (findElements(html, sel(s))[0]?.html ?? null) : null);
const all = (html, s) => (html ? findElements(html, sel(s), { all: true }).map((e) => e.html) : []);
// outermost matches only (skip matches nested inside an earlier match)
const outer = (html, s) => {
  if (!html) return [];
  const out = [];
  let end = -1;
  findElements(html, sel(s), { all: true }).forEach((e) => {
    if (e.start >= end) {
      out.push(e.html);
      end = e.end;
    }
  });
  return out;
};
const getAttr = (tagHtml, name) => {
  if (!tagHtml) return null;
  const open = tagHtml.match(/^<[^>]*>/);
  const re = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i');
  const m = (open ? open[0] : tagHtml).match(re);
  return m ? (m[2] ?? m[3]) : null;
};
const decode = (s) => String(s ?? '').replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&amp;/g, '&');
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');
const escA = (s) => esc(s).replace(/"/g, '&quot;');
// visible text: strip tags, decode entities, collapse whitespace
const text = (h) => (h ? decode(h.replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '')
  .replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim() : '');
const firstTag = (h, tag) => (h
  ? (h.match(new RegExp(`<${tag}\\b[^>]*>`, 'i')) || [null])[0] : null);

const PROTO_MEDIA = 'stardust/prototypes/assets/media';
// image: prototype-local asset when the archetype already bundled the same file, else the
// absolute source URL (protocol-relative → https)
function imgOf(h) {
  const tag = firstTag(h, 'img');
  if (!tag) return null;
  const raw = decode(getAttr(tag, 'src') || getAttr(tag, 'data-src') || '');
  if (!raw) return null;
  const alt = text(decode(getAttr(tag, 'alt') || ''));
  const b = basename(raw.split('?')[0]);
  const local = [b, `ig-${b}`].find((f) => existsSync(join(PROTO_MEDIA, f)));
  const src = local ? `assets/media/${local}` : raw.replace(/^\/\//, 'https://');
  return { src, alt };
}
const img = (i, cls = '') => (i
  ? `<img${cls ? ` class="${cls}"` : ''} src="${escA(i.src)}" alt="${escA(i.alt)}">` : '');
const a = (href, inner, extra = '') => `<a href="${escA(decode(href))}"${extra}>${inner}</a>`;

// ---------- capture extraction (selectors of the live blog templates)
function cardOf(h) {
  const titleEl = one(h, 'h2') || one(h, 'h3') || one(h, 'div.article-item-title')
    || one(h, 'div.article-item__title');
  const linkEl = one(h, 'a.article-item__content') || one(h, 'a.article-item-link')
    || one(h, 'a.article-item__url') || one(h, 'a');
  const tagsEl = one(h, 'div.article-item__tags');
  const exEl = one(h, 'span.article-item-excerpt') || one(h, 'span.article-item__excerpt')
    || one(h, 'div.article-item__excerpt') || one(h, 'p.article-item__excerpt');
  return {
    href: getAttr(linkEl, 'href') || '',
    img: imgOf(h),
    titleTag: titleEl && /^<h[1-6]/i.test(titleEl) ? titleEl.slice(1, 3).toLowerCase() : null,
    title: text(titleEl),
    tags: all(tagsEl, 'a').map((t) => ({ href: getAttr(t, 'href'), text: text(t) })),
    excerpt: text(exEl),
  };
}

function extract(html) {
  const heroEl = one(html, 'div.blog__hero') || one(html, 'section.page-hero');
  const h1 = one(html, 'h1');
  const heroImgs = all(heroEl, 'img').map(imgOf).filter(Boolean)
    .map((i) => ({ ...i, alt: i.alt || '' }));
  const filtersEl = one(html, 'div.blog__filters');
  const filters = all(filtersEl, 'a').map((t) => ({
    href: getAttr(t, 'href'), text: text(t), label: getAttr(t, 'aria-label'),
  }));
  const topEl = one(html, 'div.blog__featured-top');
  const featEl = one(html, 'div.blog__featured');
  let featured = null;
  if (featEl) {
    const contentEl = one(featEl, 'div.blog__featured-content');
    const exEl = one(contentEl, 'div.article-item__excerpt');
    const paras = all(exEl, 'p').map(text).filter(Boolean);
    const moreEl = one(featEl, 'a.blog__featured-more');
    featured = {
      label: text(one(featEl, 'div.blog__featured-image-text')),
      img: imgOf(one(featEl, 'div.blog__featured-image-holder') || featEl),
      tags: all(one(featEl, 'div.article-item__tags'), 'a')
        .map((t) => ({ href: getAttr(t, 'href'), text: text(t) })),
      title: text(one(contentEl, 'h2') || one(contentEl, 'h3')),
      excerpt: paras.length ? paras : [text(exEl)].filter(Boolean),
      more: moreEl ? { href: getAttr(moreEl, 'href'), text: text(moreEl) } : null,
    };
  }
  const gridEl = (html.match(/<div\b[^>]*\bid="blog-items"/) && (() => {
    const i = html.search(/<div\b[^>]*\bid="blog-items"/);
    return findElements(html.slice(i), parseSelector('div'))[0]?.html;
  })()) || one(html, 'div.blog__listing');
  const moreEl = one(html, 'a.blog__load-more') || one(html, 'a.recipes-main__load-more');
  const blEl = one(html, 'div.blog-list');
  let blogList = null;
  if (blEl) {
    const art = one(blEl, 'article.article-container');
    const txt = one(art, 'div.text');
    const tl = one(txt, 'a');
    blogList = {
      title: text(one(art, 'div.title')),
      text: text(txt),
      textHref: tl ? getAttr(tl, 'href') : '',
      cards: outer(blEl, 'div.article-item-content').map(cardOf),
    };
  }
  const trEl = one(html, 'section.content-banner');
  const trusted = trEl ? {
    img: imgOf(trEl), text: text(one(trEl, 'div.content-banner__text')),
  } : null;
  const soEl = one(html, 'section.instagram');
  const social = soEl ? {
    titleTag: (one(soEl, 'h4.instagram__title') ? 'h4' : 'h2'),
    title: text(one(soEl, 'h4.instagram__title') || one(soEl, 'div.instagram__title')),
    tiles: outer(soEl, 'a.instagram__item').map((t) => ({
      href: getAttr(t, 'href'),
      img: imgOf(t),
      title: text(one(t, 'span.instagram__item-content-title')),
      sub: text(one(t, 'span.instagram__item-content-subtitle')),
      cta: text(one(t, 'span.btn')),
    })),
  } : null;
  return {
    hero: { title: text(h1), images: heroImgs },
    filters,
    top: outer(topEl, 'div.article-item').map(cardOf),
    featured,
    grid: outer(gridEl, 'div.article-item').map(cardOf),
    loadMore: moreEl ? { href: getAttr(moreEl, 'href'), text: text(moreEl) } : null,
    blogList,
    trusted,
    social,
  };
}

// ---------- render (archetype slot markup)
function tagsHtml(tags) {
  if (!tags.length) return '';
  const links = tags.map((t) => a(t.href, esc(t.text)));
  return `<div class="related-card__tags">${links.join('<span aria-hidden="true">|</span>')}</div>`;
}
function cardHtml(c, extra = '') {
  const t = c.titleTag || 'div';
  const media = c.img ? `<div class="related-card__media">${a(c.href, img(c.img),
    ' tabindex="-1" aria-label="Article Image"')}</div>` : '';
  const ex = c.excerpt ? `<span class="related-card__excerpt">${esc(c.excerpt)}</span>` : '';
  return `        <div class="related-card listing-card${extra}">
          ${media}
          ${tagsHtml(c.tags)}
          ${a(c.href, `<${t} class="related-card__title">${esc(c.title)}</${t}>${ex}`,
    ` class="related-card__link" aria-label="${escA(c.title)}"`)}
        </div>`.replace(/\n\s+\n/g, '\n');
}

function mainHtml(m, slug) {
  const v = [];
  const heroCls = m.hero.images.length ? ' blog-hero--image' : '';
  if (heroCls) v.push('blog-hero--image');
  const heroMedia = m.hero.images.slice(0, 2).map((i, n) => `      <div class="blog-hero__media `
    + `blog-hero__media--${n ? 'mobile' : 'desktop'}">${img(i)}</div>\n`).join('');
  let filters = '';
  if (m.filters.length) {
    const items = m.filters.map((f) => `          ${a(f.href, esc(f.text),
      ` class="blog-filters__item"${f.label ? ` aria-label="${escA(decode(f.label))}"` : ''}`)}`);
    filters = `\n        <div class="blog-filters">\n${items.join('\n')}\n        </div>`;
  }
  let body = '';
  if (m.top.length) {
    body += '      <div class="listing-top">\n'
      + '        <div class="listing-grid listing-grid--two">\n'
      + `${m.top.map((c) => cardHtml(c, ' listing-card--wide')).join('\n')}\n`
      + '        </div>\n      </div>\n';
  }
  if (m.featured) {
    const f = m.featured;
    const paras = f.excerpt.map((p) => `<p>${esc(p)}</p>`).join('');
    const more = f.more ? `<div>${a(f.more.href, esc(f.more.text),
      ' class="blog-featured__more"')}</div>` : '';
    body += `      <div class="blog-featured-wrap">
        <div class="blog-featured${f.tags.length ? '' : ' blog-featured--no-tags'}">
          <div class="blog-featured__image">
            ${f.label ? `<div class="blog-featured__label">${esc(f.label)}</div>` : ''}
            <div class="blog-featured__holder">${img(f.img)}</div>
          </div>
          <div class="blog-featured__content">
            ${tagsHtml(f.tags).replace('related-card__tags', 'blog-featured__tags')}
            <h2 class="blog-featured__title">${esc(f.title)}</h2>
            <div class="blog-featured__excerpt">${paras}</div>
            ${more}
          </div>
        </div>
      </div>\n`;
  }
  if (m.grid.length) {
    body += '      <div class="listing-grid listing-grid--main" id="blog-items">\n'
      + `${m.grid.map((c) => cardHtml(c)).join('\n')}\n      </div>\n`;
  }
  if (m.loadMore && m.loadMore.href) {
    body += '      <div class="listing-pagination" id="blog-pagination">\n        '
      + `${a(m.loadMore.href, `<span>${esc(m.loadMore.text)}</span>`,
        ' class="btn btn--outline btn--action"')}\n      </div>\n`;
  }
  let strip = '';
  if (m.blogList && m.blogList.cards.length) {
    v.push('listing-grid--blog-list');
    const bl = m.blogList;
    const head = (bl.title ? `<div class="title">${esc(bl.title)}</div>` : '')
      + (bl.text ? `<div class="text">${bl.textHref ? a(bl.textHref, esc(bl.text))
        : esc(bl.text)}</div>` : '');
    strip = `  <section class="blog-list-section">
    <div class="blog-list container container--tight">
${head ? `      <article class="article-container">${head}</article>\n` : ''}\
      <div class="listing-grid listing-grid--blog-list">
${bl.cards.map((c) => cardHtml(c)).join('\n')}
      </div>
    </div>
  </section>\n`;
  }
  const main = `<main id="MainContent" class="listing-page">
  <section class="blog-index">
    <div class="blog-hero${heroCls}">
${heroMedia}      <div class="blog-hero__inner container container--tight">
        <h1 class="blog-hero__title">${esc(m.hero.title)}</h1>${filters}
      </div>
    </div>
    <div class="container container--tight">
${body}    </div>
  </section>
${strip}</main>\n`;
  let after = '';
  if (m.trusted) {
    after += `<section class="trusted-band">
  <div class="trusted-band__inner container">
    ${img(m.trusted.img, 'trusted-band__img')}
    <p class="trusted-band__text">${esc(m.trusted.text)}</p>
  </div>
  <div class="trusted-band__rule" role="presentation"></div>
</section>\n`;
  }
  if (m.social && m.social.tiles.length) {
    const s = m.social;
    const tiles = s.tiles.map((t) => `    ${a(t.href, `
      ${img(t.img)}
      <span class="social-tile__overlay"><span class="social-tile__title">${esc(t.title)}</span>`
      + `${t.sub ? `<span class="social-tile__sub">${esc(t.sub)}</span>` : ''}`
      + `<span class="btn social-tile__btn">${esc(t.cta)}</span></span>
    `, ` class="social-tile" aria-label="${escA(t.title)}"`)}`);
    after += `<section class="social-strip">
  <${s.titleTag} class="social-strip__title"><p>${esc(s.title)}</p></${s.titleTag}>
  <div class="social-strip__grid">
${tiles.join('\n')}
  </div>
</section>\n`;
  }
  return { html: main + after, variants: v, slug };
}

function headHtml(protoHead, cap) {
  const t = escA(cap.title);
  const d = escA(cap.description || '');
  const u = escA(cap.finalUrl || cap.url);
  let h = protoHead
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(cap.title)}</title>`)
    .replace(/(<meta name="description" content=")[^"]*"/, `$1${d}"`)
    .replace(/(<link rel="canonical" href=")[^"]*"/, `$1${u}"`)
    .replace(/(<meta property="og:url" content=")[^"]*"/, `$1${u}"`)
    .replace(/(<meta property="og:title" content=")[^"]*"/,
      `$1${escA(cap.og?.title || cap.title)}"`)
    .replace(/(<meta property="og:description" content=")[^"]*"/,
      `$1${escA(cap.og?.description || cap.description || '')}"`);
  if (cap.og?.image) {
    const og = `  <meta property="og:image" content="${escA(cap.og.image)}">\n`;
    h = h.replace('</head>', `${og}</head>`);
  }
  if (!/<title>/.test(h)) h = h.replace('</head>', `  <title>${t}</title>\n</head>`);
  return h;
}

const proto = readFileSync(opt.archetype, 'utf8');
const iMain = proto.indexOf('<main');
const iFooter = proto.indexOf('<footer class="site-footer"');
const iHeadEnd = proto.indexOf('</head>') + '</head>'.length;
if (iMain < 0 || iFooter < 0 || iHeadEnd < 7) {
  console.error(`archetype ${opt.archetype}: no <main>/<footer>/<head> anchors`);
  process.exit(1);
}
let failed = 0;
for (const slug of opt.slugs) {
  const jf = join(opt.current, 'pages', `${slug}.json`);
  const hf = join(opt.current, 'pages', `${slug}.html`);
  if (!existsSync(jf) || !existsSync(hf)) {
    console.error(`FAIL ${slug}: no capture ${jf} / ${hf}`);
    failed += 1;
  } else {
    const cap = JSON.parse(readFileSync(jf, 'utf8'));
    const m = extract(readFileSync(hf, 'utf8'));
    if (!m.hero.title) {
      console.error(`FAIL ${slug}: no h1 in capture`);
      failed += 1;
    } else {
      const r = mainHtml(m, slug);
      const page = headHtml(proto.slice(0, iHeadEnd), cap)
        + proto.slice(iHeadEnd, iMain) + r.html + proto.slice(iFooter);
      const out = join(opt.outDir, `${slug}.html`);
      if (!opt.dry) {
        mkdirSync(opt.outDir, { recursive: true });
        writeFileSync(out, page);
      }
      const n = (k) => (Array.isArray(m[k]) ? m[k].length : 0);
      console.log(`OK ${slug} -> ${opt.dry ? '(dry-run)' : out} · hero-img ${m.hero.images.length}`
        + `, filters ${n('filters')}, top ${n('top')}, featured ${m.featured ? 1 : 0}`
        + `, grid ${n('grid')}, load-more ${m.loadMore ? 1 : 0}`
        + `, blog-list ${m.blogList ? m.blogList.cards.length : 0}`
        + `, trusted ${m.trusted ? 1 : 0}, social ${m.social ? m.social.tiles.length : 0}`
        + ` · variants ${r.variants.join(' ') || '-'}`);
    }
  }
}
process.exit(failed ? 1 : 0);
