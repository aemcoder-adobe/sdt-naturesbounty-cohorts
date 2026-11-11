#!/usr/bin/env node
/**
 * stardust/migrate/clone/article.mjs — Path A′ structural clone for the `article` template.
 *
 * Forks the gated archetype prototype (stardust/prototypes/the-benefits-of-biotin-proposed.html:
 * canon <head> assets, header, footer, trusted-band, social-strip verbatim) and injects ONE
 * sibling's captured content (stardust/current/pages/<slug>.{json,html}) into the archetype's
 * slot structure — the input the live encoder stardust/rollout/encoders/article.mjs reads:
 *   .article__hero · .article__title · .article__excerpt · .article__text (block-level nodes)
 *   · .share · .tag-nav · .product-rail (only when the sibling has products) · .related
 * Content is verbatim; the only normalisation is `<br><br>` runs in the body becoming <p>
 * boundaries and stray text inside a list being lifted out as a paragraph (both logged).
 * Writes stardust/.work/migrate/article/<slug>.html and <slug>.log.json (deviations + counts).
 */
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import * as cheerio from 'cheerio';

const USAGE = `Usage: node stardust/migrate/clone/article.mjs <slug…> [--slugs <file>]
       [--proto <file>] [--current <dir>] [--out <dir>]
  <slug>          sibling slug (stardust/current/pages/<slug>.json + .html must exist)
  --slugs <file>  one slug per line
  --proto <file>  archetype prototype
                  (default stardust/prototypes/the-benefits-of-biotin-proposed.html)
  --current <d>   capture dir (default stardust/current/pages)
  --out <dir>     output dir (default stardust/.work/migrate/article)
  --help          this text
Writes <out>/<slug>.html and <out>/<slug>.log.json. Exit 0 ok, 1 a page failed, 2 usage.`;

const HOST = 'https://naturesbounty.com';
const INLINE_KEEP = new Set(['strong', 'b', 'em', 'i', 'u', 'sup', 'sub', 'small', 's', 'br',
  'a', 'img', 'mark', 'code', 'abbr']);
const INLINE_UNWRAP = new Set(['span', 'font', 'label', 'time', 'o:p', 'del', 'ins', 'cite',
  'q', 'big', 'wbr', 'nobr']);
const DROP = new Set(['script', 'style', 'noscript', 'template', 'svg', 'button', 'form',
  'meta', 'link', 'input', 'select', 'textarea']);
const BLOCK = new Set(['p', 'div', 'section', 'article', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'table', 'blockquote', 'figure', 'picture', 'iframe', 'video', 'hr',
  'center', 'header', 'footer', 'aside', 'main', 'dl', 'pre', 'figcaption', 'nav']);

function parseArgs(argv) {
  const o = {
    slugs: [], proto: 'stardust/prototypes/the-benefits-of-biotin-proposed.html',
    current: 'stardust/current/pages', out: 'stardust/.work/migrate/article',
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
    else if (a === '--slugs') {
      o.slugs.push(...fs.readFileSync(val(), 'utf8').split(/\r?\n/).map((l) => l.trim())
        .filter(Boolean));
    } else if (a === '--proto') o.proto = val();
    else if (a === '--current') o.current = val();
    else if (a === '--out') o.out = val();
    else if (a.startsWith('--')) throw new Error(`unknown argument ${a}`);
    else o.slugs.push(a);
  }
  return o;
}

const escText = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/ /g, '&nbsp;');
const escAttr = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;');
const norm = (s) => (s || '').replace(/[\s ]+/g, ' ').trim();
const absSrc = (u) => {
  if (!u) return '';
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${HOST}${u}`;
  return u;
};
const absHref = (u) => (u && u.startsWith('//') ? `https:${u}` : (u || ''));

/* ------------------------------------------------------------------ body normalisation */

function makeBody($, log) {
  const imgTag = (el) => {
    const $i = $(el);
    const src = $i.attr('src') || $i.attr('data-src') || '';
    if (!src) return '';
    const alt = $i.attr('alt');
    return `<img src="${escAttr(absSrc(src))}" alt="${escAttr(alt == null ? '' : alt)}">`;
  };
  const hasBlock = (el) => $(el).find([...BLOCK].join(',')).length > 0;

  /* inline HTML of a node's children: keep marks/links/images, unwrap the rest */
  const inline = (el) => {
    let out = '';
    $(el).contents().each((_, n) => {
      if (n.type === 'text') { out += escText(n.data); return; }
      if (n.type !== 'tag' && n.type !== 'script' && n.type !== 'style') return;
      const t = n.name.toLowerCase();
      if (DROP.has(t)) return;
      if (t === 'br') { out += '<br>'; return; }
      if (t === 'img') { out += imgTag(n); return; }
      if (t === 'picture') {
        const im = $(n).find('img').get(0);
        if (im) out += imgTag(im);
        return;
      }
      const inner = inline(n);
      if (t === 'a') {
        const href = $(n).attr('href');
        if (!href) { out += inner; return; }
        const tgt = $(n).attr('target');
        out += `<a href="${escAttr(absHref(href))}"${tgt ? ` target="${escAttr(tgt)}"` : ''}>`
          + `${inner}</a>`;
      } else if (INLINE_KEEP.has(t)) out += `<${t}>${inner}</${t}>`;
      else out += inner;
    });
    return out;
  };

  const inlineOf = (n) => inline($('<x></x>').append($(n).clone()).get(0));

  const paras = (html) => html.split(/(?:<br>(?:\s|&nbsp;)*){2,}/).map((p) => p
    .replace(/^(?:\s|&nbsp;|<br>)+|(?:\s|&nbsp;|<br>)+$/g, ''))
    .filter((p) => p.replace(/<(?!img)[^>]+>/g, '').replace(/&nbsp;/g, '').trim()
      || /<img/.test(p));

  const blocks = [];
  let splitRuns = 0;
  const pushRun = (html) => {
    const ps = paras(html);
    if (ps.length > 1) splitRuns += 1;
    ps.forEach((p) => blocks.push(`<p>${p}</p>`));
  };

  const listHtml = (el, t) => {
    const parts = [];
    let items = [];
    let start = 1;
    let stray = '';
    const startAttr = Number($(el).attr('start')) || 1;
    let n = startAttr;
    const flushList = () => {
      if (!items.length) return;
      const s = t === 'ol' && start !== 1 ? ` start="${start}"` : '';
      parts.push(`<${t}${s}>${items.join('')}</${t}>`);
      items = [];
    };
    const flushStray = () => {
      const ps = paras(stray);
      stray = '';
      if (!ps.length) return;
      flushList();
      ps.forEach((p) => parts.push(`<p>${p}</p>`));
      log.deviations.push({
        kind: 'structure-repair', source: 'text node inside <ol>/<ul>',
        target: '<p> after the list items', reason: 'invalid list child lifted out verbatim',
      });
    };
    start = startAttr;
    $(el).contents().each((_, c) => {
      if (c.type === 'tag' && c.name.toLowerCase() === 'li') {
        flushStray();
        if (!items.length) start = n;
        items.push(`<li>${liHtml(c)}</li>`);
        n += 1;
      } else if (c.type === 'tag' && /^(ul|ol)$/i.test(c.name)) {
        flushStray();
        const nested = listHtml(c, c.name.toLowerCase());
        if (items.length) {
          items[items.length - 1] = items[items.length - 1].replace(/<\/li>$/, `${nested}</li>`);
        } else {
          flushList();
          parts.push(nested);
          log.deviations.push({
            kind: 'structure-repair', source: `<${c.name}> directly inside <${t}>`,
            target: 'one list', reason: 'invalid list nesting (no parent <li>) flattened one level',
          });
        }
      } else if (c.type === 'text') stray += escText(c.data);
      else if (c.type === 'tag' && !DROP.has(c.name.toLowerCase())) stray += inlineOf(c);
    });
    flushStray();
    flushList();
    return parts.join('');
  };

  /* li: inline content; nested lists kept; inner <p>s kept as paragraph boundaries */
  const liHtml = (li) => {
    if (!hasBlock(li)) return inline(li).trim();
    let out = '';
    let run = '';
    const flush = () => { if (run.trim()) out += run.trim(); run = ''; };
    $(li).contents().each((_, c) => {
      const t = c.type === 'tag' ? c.name.toLowerCase() : '';
      if (t === 'ul' || t === 'ol') { flush(); out += listHtml(c, t); } else if (t === 'p'
        || t === 'div') {
        flush();
        const h = inline(c).trim();
        if (h) out += `<p>${h}</p>`;
      } else if (c.type === 'text') run += escText(c.data);
      else if (c.type === 'tag') run += inlineOf(c);
    });
    flush();
    return out;
  };

  const walk = (container) => {
    let run = '';
    const flush = () => { pushRun(run); run = ''; };
    $(container).contents().each((_, n) => {
      if (n.type === 'text') { run += escText(n.data); return; }
      if (n.type !== 'tag' && n.type !== 'script' && n.type !== 'style') return;
      const t = n.name.toLowerCase();
      if (DROP.has(t)) {
        if (t === 'form' || t === 'button') {
          log.deviations.push({
            kind: 'dropped-widget', source: `<${t}> in article body`, target: '',
            reason: 'interactive widget not authorable as body content',
          });
        }
        return;
      }
      if ((INLINE_KEEP.has(t) || INLINE_UNWRAP.has(t)) && !hasBlock(n)) {
        run += inlineOf(n);
        return;
      }
      if (t === 'a' && hasBlock(n)) { flush(); walk(n); return; }
      flush();
      if (/^h[1-6]$/.test(t)) {
        const h = inline(n).trim();
        if (!h.replace(/&nbsp;|<br>/g, '').trim()) {
          log.deviations.push({
            kind: 'empty-node-dropped', source: `<${t}> with no text`, target: '',
            reason: 'empty heading carries no content (content-preservation: drop empty)',
          });
          return;
        }
        let lvl = t;
        if (t === 'h1') {
          lvl = 'h2';
          log.deviations.push({
            kind: 'heading-level', source: `<h1>${norm($(n).text())}`, target: '<h2>',
            reason: 'one <h1> per page (the article title); body h1 demoted, text verbatim',
          });
        }
        blocks.push(`<${lvl}>${h}</${lvl}>`);
      } else if (t === 'p') {
        if (hasBlock(n)) walk(n); else pushRun(inline(n));
      } else if (t === 'ul' || t === 'ol') {
        const h = listHtml(n, t);
        if (h) blocks.push(h);
      } else if (t === 'img' || t === 'picture') {
        const im = t === 'img' ? n : $(n).find('img').get(0);
        const tag = im ? imgTag(im) : '';
        if (tag) blocks.push(`<p>${tag}</p>`);
      } else if (t === 'iframe' || t === 'video') {
        const src = $(n).attr('src') || $(n).find('source').attr('src') || '';
        if (src) {
          const title = $(n).attr('title');
          blocks.push(t === 'iframe'
            ? `<iframe src="${escAttr(absSrc(src))}"${title ? ` title="${escAttr(title)}"` : ''}`
              + ' allowfullscreen></iframe>'
            : `<video src="${escAttr(absSrc(src))}" controls></video>`);
        }
      } else if (t === 'hr') blocks.push('<hr>');
      else if (t === 'table') {
        const rows = $(n).find('tr').map((__, tr) => `<tr>${$(tr).children('td,th')
          .map((___, c) => {
            const ct = c.name.toLowerCase();
            return `<${ct}>${inline(c).trim()}</${ct}>`;
          }).get().join('')}</tr>`).get().join('');
        if (rows) blocks.push(`<table><tbody>${rows}</tbody></table>`);
      } else if (t === 'blockquote') {
        const inner = [];
        const saved = blocks.splice(0);
        walk(n);
        inner.push(...blocks.splice(0));
        blocks.push(...saved);
        if (inner.length) blocks.push(`<blockquote>${inner.join('')}</blockquote>`);
      } else walk(n);
    });
    flush();
  };
  return { walk, blocks, inline, imgTag, splitRuns: () => splitRuns };
}

/* ------------------------------------------------------------------ page build */

function build(slug, opt, protoHtml) {
  const jf = path.join(opt.current, `${slug}.json`);
  const hf = path.join(opt.current, `${slug}.html`);
  if (!fs.existsSync(jf) || !fs.existsSync(hf)) throw new Error(`capture missing for ${slug}`);
  const J = JSON.parse(fs.readFileSync(jf, 'utf8'));
  const $ = cheerio.load(fs.readFileSync(hf, 'utf8'));
  const P = cheerio.load(protoHtml, { decodeEntities: false });
  const log = { slug, deviations: [], modules: ['article', 'share', 'tag-nav'], counts: {} };
  const art = $('.article-main').first();
  if (!art.length) throw new Error(`${slug}: no .article-main in capture`);
  const dims = new Map((J.media && J.media.imgs || []).map((i) => [
    (i.src || '').split('?')[0].replace(/^https?:/, ''), i]));
  const dimAttrs = (src) => {
    const d = dims.get(absSrc(src).split('?')[0].replace(/^https?:/, ''));
    return d && d.w && d.h ? ` width="${d.w}" height="${d.h}"` : '';
  };
  const B = makeBody($, log);

  /* hero */
  const heroImg = art.find('.article-main__image img').first();
  const heroSrc = heroImg.attr('src') || heroImg.attr('data-src') || '';
  const hero = heroSrc
    ? `<figure class="article__hero"><img src="${escAttr(absSrc(heroSrc))}" alt="${
      escAttr(heroImg.attr('alt') || '')}"${dimAttrs(heroSrc)} fetchpriority="high"></figure>`
    : '';
  if (!hero) {
    log.deviations.push({
      kind: 'absent-slot', source: '.article-main__image', target: '.article__hero',
      reason: 'sibling has no hero image; slot omitted',
    });
  }

  /* title + excerpt + text */
  const title = B.inline(art.find('.article-main__title').first().get(0) || $('<x/>').get(0))
    .trim();
  const excEl = art.find('.article-main__excerpt-inner').first();
  const excerpt = excEl.length ? B.inline(excEl.get(0)).trim() : '';
  const textEl = art.find('.article-main__text').first();
  if (textEl.length) B.walk(textEl.get(0));
  if (B.splitRuns()) {
    log.deviations.push({
      kind: 'paragraph-boundaries', source: '<br><br> runs in .article-main__text',
      target: '<p> per run', reason: `${B.splitRuns()} inline run(s) split on blank-line breaks`
        + ' into block-level paragraphs (same rendering, verbatim text)',
    });
  }

  /* share: archetype <li> per network, href/labels from the sibling */
  const protoLis = new Map();
  P('.share__links li').each((_, li) => {
    const cls = (P(li).find('a').attr('class') || '').match(/share__link--(\w+)/);
    if (cls) protoLis.set(cls[1], P.html(li));
  });
  const shareTexts = art.find('.share-buttons__text').map((_, e) => norm($(e).text())).get();
  const shareLis = art.find('.share-buttons__link').map((_, a) => {
    const net = (($(a).attr('class') || '').match(/is-(\w+)/) || [])[1];
    const tpl = protoLis.get(net);
    if (!tpl) return '';
    const href = $(a).attr('href') || '';
    const hidden = norm($(a).find('.visually-hidden').text());
    const label = norm($(a).children('span').not('.visually-hidden').first().text());
    return tpl.replace(/href="[^"]*"/, `href="${escAttr(href)}"`)
      .replace(/title="[^"]*"/, `title="${escAttr(hidden)}"`)
      .replace(/<span>[^<]*<\/span><span class="visually-hidden">[^<]*<\/span>/,
        `<span>${escText(label)}</span><span class="visually-hidden">${escText(hidden)}</span>`);
  }).get().filter(Boolean);
  const share = shareLis.length ? `<div class="share">
          ${shareTexts.map((t, i) => `<p class="share__text${i ? '' : ' share__text--lead'}">${
    escText(t)}</p>`).join('\n          ')}
          <ul class="share__links">
            ${shareLis.join('\n            ')}
          </ul>
        </div>` : '';
  if (!share) log.modules = log.modules.filter((m) => m !== 'share');

  /* tag-nav */
  const tagHead = norm(art.find('.article-main__tags-top').first().text());
  const tagLinks = art.find('.article-main__sidebar-tags a[href]').map((_, a) => {
    const lab = $(a).attr('aria-label');
    return `<li><a class="tag-nav__link" href="${escAttr($(a).attr('href'))}"${
      lab ? ` aria-label="${escAttr(lab)}"` : ''}>${escText(norm($(a).text()))}</a></li>`;
  }).get();
  const tagNav = tagLinks.length ? `<nav class="tag-nav">
          <div class="tag-nav__head">${escText(tagHead)}</div>
          <ul class="tag-nav__list">
            ${tagLinks.join('\n            ')}
          </ul>
        </nav>` : '';
  if (!tagNav) log.modules = log.modules.filter((m) => m !== 'tag-nav');

  /* product rail (optional — variance probe: MISSING on most siblings) */
  const starTpl = P('.rating__star').first();
  const starHtml = starTpl.length ? P.html(starTpl) : '';
  const prods = art.find('.article-main__products').first();
  let rail = '';
  if (prods.length) {
    const cards = prods.find('.product-item').map((ci, c) => {
      const $c = $(c);
      const a = $c.find('a[href]').first();
      const img = $c.find('.product-item__image-holder img, img').first();
      const ptitle = norm($c.find('.product-item__title').first().text());
      const serv = norm($c.find('.product-item__servings').first().text());
      const desc = norm($c.find('.product-item__description').first().text());
      const cta = norm($c.find('.product-item__cta').first().text());
      const ctaLab = $c.find('.product-item__cta').attr('aria-label') || cta;
      const off = norm($c.find('.bv_offscreen_text').first().text());
      const avg = norm($c.find('.bv_avgRating_component_container').first().text());
      const cnt = norm($c.find('.bv_numReviews_text').first().text());
      const xs = $c.find('linearGradient').map((_, g) => $(g).attr('x1')).get();
      const stars = starHtml && (avg || off) ? [0, 1, 2, 3, 4].map((si) => starHtml
        .replace(/star-0-0/g, `star-${ci}-${si}`)
        .replace(/x1="[^"]*"/, `x1="${xs[si] || '100%'}"`)).join('') : '';
      const rating = avg || off ? '<div class="rating"><button class="rating__summary"'
        + ' type="button" role="link" tabindex="-1">'
        + `<span class="visually-hidden">${escText(off)}</span>`
        + `<span class="rating__stars">${stars}</span><span class="rating__avg">${escText(avg)}`
        + `</span><span class="rating__num">&nbsp;<span class="rating__count">${escText(cnt)}`
        + '</span></span></button><span class="rating__extra"><button class="rating__write"'
        + ' type="button" aria-label="Write a Review (opens pop-up)">Write a review</button>'
        + '</span></div>' : '';
      const isrc = img.attr('src') || img.attr('data-src') || '';
      return `<div class="product-card">
              <a class="product-card__inner" href="${escAttr(a.attr('href') || '')}" aria-label="${
  escAttr(a.attr('aria-label') || `View product ${ptitle}`)}">
                <div class="product-card__body">
                  <div class="product-card__media">${isrc
    ? `<img src="${escAttr(absSrc(isrc))}" alt="${escAttr(img.attr('alt') || '')}"`
      + ' width="270" height="360">' : ''}</div>
                  <h4 class="product-card__title">${escText(ptitle)}</h4>
                  ${serv ? `<div class="product-card__servings">${escText(serv)}</div>` : ''}
                  ${rating}
                  ${desc ? `<div class="product-card__desc">${escText(desc)}</div>` : ''}
                </div>
                <div class="product-card__foot">`
        + '<button class="btn btn--lime product-card__cta" type="button"'
        + ` tabindex="-1" aria-label="${escAttr(ctaLab)}">${escText(cta)}</button></div>
              </a>
            </div>`;
    }).get();
    if (cards.length) {
      log.modules.push('product-rail');
      rail = `<section class="product-rail">
          <div class="product-rail__title">${escText(norm(prods
    .find('.article-main__products-title').first().text()))}</div>
          <div class="product-rail__grid">
            ${cards.join('\n            ')}
          </div>
        </section>`;
    }
  }

  /* related */
  const relEl = art.find('.article-main__related').first();
  let related = '';
  if (relEl.length) {
    const cards = relEl.find('.article-item').map((_, c) => {
      const $c = $(c);
      const mediaA = $c.find('.article-item__image-holder a').first();
      const img = $c.find('.article-item__image-holder img').first();
      const isrc = img.attr('src') || img.attr('data-src') || '';
      const tags = $c.find('.article-item__tags a[href]').map((__, a) => `<a href="${
        escAttr($(a).attr('href'))}">${escText(norm($(a).text()))}</a>`).get()
        .join('<span aria-hidden="true">|</span>');
      const link = $c.find('a.article-item__content').first();
      const href = link.attr('href') || mediaA.attr('href') || '';
      const rt = norm($c.find('h2.article-item__title, .article-item__title').first().text());
      const exc = norm(link.find('.article-item__excerpt').text());
      const moreA = $c.children('p').find('a[href]').first();
      const more = moreA.length ? norm(moreA.text()) : '';
      const lab = link.attr('aria-label') || rt;
      const known = new Set([mediaA.get(0), link.get(0), moreA.get(0),
        ...$c.find('.article-item__tags a').get(), ...$c.find('a.article-item__content').get()]);
      $c.find('a[href]').each((__, a) => {
        if (known.has(a)) return;
        log.deviations.push({
          kind: 'nested-link-dropped', source: `<a href="${$(a).attr('href')}"> inside the`
            + ` related teaser excerpt of "${rt}"`, target: 'excerpt text only',
          reason: 'source nests an <a> inside the card link (invalid HTML); teaser text kept'
            + ' verbatim, the inner link cannot be authored inside the card link',
        });
      });
      return `<div class="related-card">
          <div class="related-card__media"><a href="${escAttr(mediaA.attr('href') || href)}"`
        + ` aria-label="${escAttr(mediaA.attr('aria-label') || 'Article Image')}">${isrc
          ? `<img src="${escAttr(absSrc(isrc))}" alt="${escAttr(img.attr('alt') || '')}"${
            dimAttrs(isrc)}>` : ''}</a></div>
          <div class="related-card__tags">${tags}</div>
          <a class="related-card__link" href="${escAttr(href)}" aria-label="${escAttr(lab)}">`
        + `<h2 class="related-card__title">${escText(rt)}</h2>${exc
          ? `<span class="related-card__excerpt">${escText(exc)}</span>` : ''}</a>${more
          ? `\n          <p class="related-card__more"><a href="${escAttr(moreA.attr('href'))}"`
            + ` aria-label="${escAttr(moreA.attr('aria-label') || lab)}">${escText(more)}</a></p>`
          : ''}
        </div>`;
    }).get();
    if (cards.length) {
      log.modules.push('related');
      related = `<section class="related container container--tight">
      <div class="related__title">${escText(norm(relEl.find('.article-main__related-title')
    .first().text()))}</div>
      <div class="related__grid">
        ${cards.join('\n        ')}
      </div>
    </section>`;
    }
  }

  const main = `<main id="MainContent" class="article-page">
  <article class="article">
    ${hero}
    <div class="article__body container container--tight">
      <div class="article__content">
        <h1 class="article__title">${title}</h1>
        ${excerpt ? `<div class="article__excerpt"><p>${excerpt}</p></div>` : ''}
        <div class="article__text rte">
${B.blocks.join('\n')}
        </div>
        ${share}
      </div>
      <aside class="article__sidebar">
        ${tagNav}
        ${rail}
      </aside>
    </div>
    ${related}
  </article>
</main>`;

  /* site-wide bands: verbatim from the archetype, verified against the sibling's capture */
  const bandText = (sel) => norm($(sel).first().text());
  const protoBand = (sel) => norm(P(sel).first().text());
  if (bandText('.content-banner') && bandText('.content-banner') === protoBand('.trusted-band')) {
    log.modules.push('trusted-band');
  } else if (P('.trusted-band').length) {
    log.bandMismatch = (log.bandMismatch || []).concat('trusted-band');
  }
  const ig = $('.instagram').first();
  const igTitles = ig.find('.instagram__item-content-title').map((_, e) => norm($(e).text())).get();
  const pTitles = P('.social-tile__title').map((_, e) => norm(P(e).text())).get();
  if (ig.length && igTitles.join('|') === pTitles.join('|')) log.modules.push('social-strip');
  else log.bandMismatch = (log.bandMismatch || []).concat('social-strip');

  /* assemble: archetype document with this page's <head> metadata and <main> */
  let html = protoHtml.replace(/<main id="MainContent"[\s\S]*?<\/main>/, () => main);
  const meta = (re, rep) => { html = html.replace(re, () => rep); };
  const t = J.title || norm($('title').text());
  const d = J.description || '';
  const url = J.url || J.finalUrl;
  const og = J.og || {};
  meta(/<title>[\s\S]*?<\/title>/, `<title>${escText(t)}</title>`);
  meta(/<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${escAttr(d)}">`);
  meta(/<link rel="canonical" href="[^"]*">/, `<link rel="canonical" href="${escAttr(url)}">`);
  meta(/<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="${escAttr(url)}">`);
  meta(/<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="${escAttr(og.title || t)}">`);
  meta(/<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="${escAttr(og.description || d)}">`);
  const ogi = og.image || '';
  meta(/<meta property="og:image" content="[^"]*">\n?/,
    ogi ? `<meta property="og:image" content="${escAttr(ogi)}">\n` : '');
  meta(/\s*<meta property="og:image:secure_url" content="[^"]*">/, ogi
    ? `\n  <meta property="og:image:secure_url" content="${escAttr(ogi.replace(/^http:/,
      'https:'))}">` : '');
  meta(/\s*<meta property="og:image:width" content="[^"]*">/, '');
  meta(/\s*<meta property="og:image:height" content="[^"]*">/, '');
  log.counts = countRoles(cheerio.load(main), art, $);
  return { html, log };
}

/* role counts: capture .article-main vs rendered <main>; body text compared without whitespace
   (block boundaries differ by construction: <br><br> runs became <p>s) */
const SOCIAL = /^(https?:)?\/\/(www\.)?(facebook|twitter|pinterest|linkedin)|^mailto:/;
function countRoles(R, art, $) {
  const side = (q, root, text) => ({
    headings: q(root).find('h1,h2,h3,h4,h5,h6').length,
    textLists: q(text).find('li').length,
    links: q(root).find('a[href]').map((_, a) => q(a).attr('href')).get()
      .filter((h) => !SOCIAL.test(h)).length,
    images: q(root).find('img').length,
  });
  const flat = (s) => (s || '').replace(/[\s\u00a0]+/g, '');
  const capText = art.find('.article-main__text').first();
  const capFlat = flat(capText.clone().find('script,style,noscript,template,svg,button,form')
    .remove().end().text());
  const renFlat = flat(R('.article__text').text());
  const cap = side($, art, capText);
  const ren = side(R, R('main'), R('.article__text'));
  const hrefs = (q, root) => q(root).find('a[href]').map((_, a) => absHref(q(a).attr('href')))
    .get().filter((h) => !SOCIAL.test(h)).sort();
  const hc = hrefs($, art);
  const hr = hrefs(R, R('main'));
  const hrefMismatch = hc.filter((h, i) => h !== hr[i]).length + Math.abs(hc.length - hr.length);
  return { capture: cap, render: ren, textEqual: capFlat === renFlat, hrefMismatch };
}

function main() {
  let opt;
  try { opt = parseArgs(process.argv.slice(2)); } catch (e) {
    process.stderr.write(`${e.message}\n${USAGE}\n`);
    process.exit(2);
  }
  if (opt.help) { process.stdout.write(`${USAGE}\n`); return; }
  if (!opt.slugs.length) { process.stderr.write(`${USAGE}\n`); process.exit(2); }
  const protoHtml = fs.readFileSync(opt.proto, 'utf8');
  fs.mkdirSync(opt.out, { recursive: true });
  let failed = 0;
  opt.slugs.forEach((slug) => {
    try {
      const { html, log } = build(slug, opt, protoHtml);
      fs.writeFileSync(path.join(opt.out, `${slug}.html`), html);
      fs.writeFileSync(path.join(opt.out, `${slug}.log.json`), `${JSON.stringify(log, null, 2)}\n`);
      const c = log.counts;
      process.stdout.write(`clone ${slug}: modules ${log.modules.join(',')}; dev ${
        log.deviations.length}; text ${c.textEqual ? 'equal' : 'DIFF'}; h ${c.capture.headings}/${
        c.render.headings} li ${c.capture.textLists}/${c.render.textLists} a ${c.capture.links}/${
        c.render.links} img ${c.capture.images}/${c.render.images} hrefΔ ${c.hrefMismatch}${
        log.bandMismatch ? `; BAND MISMATCH ${log.bandMismatch}` : ''}\n`);
    } catch (e) {
      failed += 1;
      process.stderr.write(`FAIL ${slug}: ${e.stack}\n`);
    }
  });
  process.exit(failed ? 1 : 0);
}

main();
