// Generates stardust/prototypes/blogs-news-proposed.html (listing archetype) from the captured page; chrome as gen.cjs.
// Text, hrefs and alt text are read verbatim from the capture; the markup is re-authored.
const fs = require('fs');
const path = require('path');
const cheerio = require('/app/node_modules/cheerio');

const ROOT = process.argv[2];
const SRC = path.join(ROOT, 'stardust/current/pages/blogs-news.html');
const OUT = path.join(ROOT, 'stardust/prototypes/blogs-news-proposed.html');
const $ = cheerio.load(fs.readFileSync(SRC, 'utf8'));

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const txt = (el) => $(el).text().replace(/\s+/g, ' ').trim();
const href = (el) => $(el).attr('href') || '#';
const carry = (el, names = ['aria-label', 'title', 'target', 'rel']) => {
  const e = $(el);
  return names.map((n) => (e.attr(n) !== undefined ? ` ${n}="${esc(e.attr(n))}"` : '')).join('');
};
const ICONS = {};
// verbatim SVG icons from the live DOM (first instance of each family)
const svgOf = (sel) => {
  const el = $(sel).first();
  if (!el.length) throw new Error('svg missing ' + sel);
  return $.html(el).replace(/\s+/g, ' ').replace(/ fill="currentColor "/g, ' fill="currentColor"');
};
ICONS.chev = svgOf('.header__nav-link svg');
ICONS.search = svgOf('.search-form__btn svg');
ICONS.burger = svgOf('.header-drawer__open svg');
ICONS.close = svgOf('.header-drawer__header .header-drawer__close svg');
ICONS.drop = svgOf('.footer__navigation__dropdown svg');
ICONS.privacy = svgOf('.optanon-toggle-display svg').replace(/<style>[^<]*<\/style>/, '');
const footerSocialSvgs = $('.footer__newsletter-social.is-desktop .footer__newsletter-social-item a').map((i, a) => ({
  href: href(a), attrs: carry(a), svg: $.html($(a).find('svg').first()).replace(/\s+/g, ' '),
})).get();
const drawerSocials = $('.header-drawer__socials-items a').map((i, a) => ({
  href: href(a), attrs: carry(a), svg: $.html($(a).find('svg').first()).replace(/\s+/g, ' '),
})).get();

const DL = new Map();
// local media map
const media = (src) => {
  const s = String(src);
  const m = s.match(/files\/(menu-[a-z-]+)\.svg/);
  if (m) return `assets/media/${m[1]}.svg`;
  if (/hair-growth-cta-lrg/.test(s)) return 'assets/media/hair-growth-cta-lrg.png';
  if (/1608nboswebsitearticlesaugustbiotinlg/.test(s)) return 'assets/media/article-biotin-hero.jpg';
  if (/products\/035710/.test(s)) return 'assets/media/product-035710.png';
  if (/products\/053545/.test(s)) return 'assets/media/product-053545.png';
  if (/07_HairGrowth_NB_IIYN/.test(s)) return 'assets/media/article-ceramides.jpg';
  if (/OS-January-Blog/.test(s)) return 'assets/media/article-os-january.jpg';
  if (/1123-NB-Q4-Blog-Beauty/.test(s)) return 'assets/media/article-beauty-routine-2024.jpg';
  if (/trusted-banner/.test(s)) return 'assets/media/trusted-banner.png';
  const ig = s.match(/files\/(AdvMagGly|first_day_of_spring_2025-2|SupercomplexB|Vitamin_C|GummiesBillboard)\.png/);
  if (ig) return `assets/media/ig-${ig[1]}.png`;
  const art = s.match(/cdn\/shop\/articles\/([^?]+)\.(jpe?g|png|webp)/i);
  if (art) { const name = 'blog-' + art[1].toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 60) + '.' + art[2].toLowerCase(); DL.set(name, 'https:' + s.replace(/^https?:/, '').replace(/([?&])width=\d+/, '$1width=1200')); return 'assets/media/' + name; }
  throw new Error('unmapped media ' + s);
};

// ---------------- metadata
const title = $('title').first().text().trim();
const description = $('meta[name="description"]').first().attr('content');
const og = $('meta[property^="og:"]').map((i, e) => `<meta property="${esc($(e).attr('property'))}" content="${esc($(e).attr('content'))}">`).get().join('\n  ');
const canonical = $('link[rel="canonical"]').attr('href');

// ---------------- announcement bar
const slides = $('.banner__slide a.link').not('.slick-cloned').map((i, a) => ({ t: txt(a), h: href(a) })).get();
// live order of the rendered track (first original slide is the active one)
const announce = () => {
  const one = slides.map((s) => `<a class="announce__link" href="${esc(s.h)}">${esc(s.t)}</a>`).join('');
  return `<div class="announce" role="region" aria-label="Announcements">
    <div class="announce__viewport"><div class="announce__track" data-announce-track>${one}${one.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ')}${one.replace(/<a /g, '<a aria-hidden="true" tabindex="-1" ')}</div></div>
  </div>`;
};

// ---------------- desktop mega menus
const nav = $('.navigation__wrapper').first();
const holders = nav.find('.navigation__dropdown-holder');
const productsPanel = () => {
  const h = holders.eq(0);
  const groups = h.find('.navigation__nested-dropdown-link-item a').map((i, a) => ({ t: txt(a), h: href(a), at: carry(a), sub: $(a).find('svg').length > 0 })).get();
  const cta = h.find('.navigation__nested-dropdown-actions a').first();
  const children = h.find('.navigation__nested-dropdown-child').map((i, c) => ({
    title: txt($(c).find('.navigation__nested-dropdown-child-title')),
    links: $(c).find('.navigation__nested-dropdown-child-link-item a').map((j, a) => ({ t: txt(a), h: href(a), at: carry(a) })).get(),
    all: $(c).find('.is-view-all a').map((j, a) => ({ t: txt(a), h: href(a), at: carry(a) })).get()[0],
  })).get();
  const promo = h.find('.navigation__promo').first();
  const shopBy = txt(h.find('.navigation__dropdown-title'));
  return `<div class="mega__panel mega__panel--nested" id="mega-products" data-mega-panel hidden>
      <div class="mega__inner container">
        <div class="mega__groups">
          <div class="mega__eyebrow">${esc(shopBy)}</div>
          <ul class="mega__group-list">
${groups.map((g, i) => `            <li class="mega__group${i === 0 ? ' is-active' : ''}"${g.sub ? ` data-mega-group="${i}"` : ''}><a href="${esc(g.h)}"${g.at}>${esc(g.t)}${g.sub ? ICONS.chev : ''}</a></li>`).join('\n')}
          </ul>
          <a class="btn btn--lime mega__cta" href="${esc(href(cta))}"${carry(cta)}>${esc(txt(cta))}</a>
        </div>
        <div class="mega__children">
${children.map((c, i) => `          <div class="mega__child${i === 0 ? ' is-active' : ''}" data-mega-child="${i}">
            <div class="mega__child-title">${esc(c.title)}</div>
            <ul class="mega__child-links">
${c.links.map((l) => `              <li><a href="${esc(l.h)}"${l.at}>${esc(l.t)}${ICONS.chev}</a></li>`).join('\n')}
              <li class="is-view-all"><a href="${esc(c.all.h)}"${c.all.at}>${esc(c.all.t)}</a></li>
            </ul>
          </div>`).join('\n')}
        </div>
        ${promoBlock(promo)}
      </div>
    </div>`;
};
function promoBlock(promo) {
  return `<div class="mega__promo">
          <div class="mega__promo-title">${esc(txt(promo.find('.navigation__promo-title')))}</div>
          <div class="mega__promo-text">${esc(txt(promo.find('.navigation__promo-content')))}</div>
          <a class="btn btn--lime" href="${esc(href(promo.find('a.btn')))}"${carry(promo.find('a.btn'))}>${esc(txt(promo.find('a.btn')))}</a>
        </div>`;
}
const benefitsPanel = () => {
  const h = holders.eq(1);
  const title = txt(h.find('.navigation__title').first());
  const links = h.find('.navigation__flat-link-item a').map((i, a) => ({ t: txt(a), h: href(a), at: carry(a), img: $(a).find('img').attr('src'), alt: $(a).find('img').attr('alt') })).get();
  return `<div class="mega__panel mega__panel--flat" id="mega-benefits" data-mega-panel hidden>
      <div class="mega__inner container">
        <div class="mega__flat">
          <div class="mega__title">${esc(title)}</div>
          <ul class="mega__flat-list mega__flat-list--icons">
${links.map((l) => `            <li><a href="${esc(l.h)}"${l.at}><img src="${media(l.img)}" alt="${esc(l.alt)}" loading="lazy" width="32" height="32">${esc(l.t)}</a></li>`).join('\n')}
          </ul>
        </div>
        ${promoBlock(h.find('.navigation__promo').first())}
      </div>
    </div>`;
};
const learnPanel = () => {
  const h = holders.eq(2);
  const title = txt(h.find('.navigation__title').first());
  const links = h.find('.navigation__flat-link-item a').map((i, a) => ({ t: txt(a), h: href(a), at: carry(a) })).get();
  const cta = h.find('.content-dropdown__cta a').first();
  const feat = h.find('.navigation__featured-block a').first();
  return `<div class="mega__panel mega__panel--content" id="mega-learn" data-mega-panel hidden>
      <div class="mega__inner container">
        <div class="mega__flat">
          <div class="mega__title">${esc(title)}</div>
          <ul class="mega__flat-list">
${links.map((l) => `            <li><a href="${esc(l.h)}"${l.at}>${esc(l.t)}</a></li>`).join('\n')}
          </ul>
          <a class="btn btn--lime mega__cta" href="${esc(href(cta))}"${carry(cta)}>${esc(txt(cta))}</a>
        </div>
        <a class="mega__feature" href="${esc(href(feat))}"${carry(feat)}><img src="${media(feat.find('img').attr('src'))}" alt="${esc(feat.find('img').attr('alt'))}" width="425" height="251"><span>${esc(txt(feat.find('span')))}</span></a>
      </div>
    </div>`;
};

// ---------------- mobile drawer (recursive from the captured drawer tree)
let drawerId = 0;
function drawerBody(body, depth) {
  const out = [];
  body.children().each((i, el) => {
    const e = $(el);
    const cls = e.attr('class') || '';
    if (/header-drawer__expand-link/.test(cls)) {
      const btn = e.children('button').first();
      const sub = e.children('.header-drawer__submenu').first();
      const id = `drawer-sub-${++drawerId}`;
      const label = txt(btn);
      out.push(`<div class="drawer__item">
        <button class="drawer__link" type="button"${carry(btn, ['aria-label'])} aria-expanded="false" aria-controls="${id}" data-drawer-open-sub>${esc(label)}${ICONS.drop}</button>
        <div class="drawer__panel--sub" id="${id}" data-depth="${depth + 1}">
          <div class="drawer__sheet">
          <div class="drawer__subhead">
            <button class="drawer__back" type="button" aria-label="Drawer Back" data-drawer-back>${ICONS.drop}</button>
            <div class="drawer__subtitle">${esc(txt(sub.find('.header-drawer__submenu-header-title').first()))}</div>
            <button class="drawer__close" type="button" aria-label="Drawer Close" data-drawer-close>${ICONS.close}</button>
          </div>
          <div class="drawer__body">
${drawerBody(sub.children('.header-drawer__container').children('.header-drawer__body').first(), depth + 1)}
          </div>
          </div>
        </div>
      </div>`);
    } else if (el.tagName === 'a') {
      const img = e.find('img').first();
      const viewAll = /link-view-all/.test(cls);
      out.push(`<a class="drawer__link${viewAll ? ' drawer__link--all' : ''}${/is-last-level/.test(cls) ? ' drawer__link--leaf' : ''}" href="${esc(href(el))}"${carry(el)}>${img.length ? `<img src="${media(img.attr('src'))}" alt="${esc(img.attr('alt') || '')}"${img.attr('loading') ? ` loading="${esc(img.attr('loading'))}"` : ''} width="32" height="32">` : ''}${esc(txt(el))}</a>`);
    } else if (/header-drawer__featured/.test(cls)) {
      const a = e.find('a.btn').first();
      out.push(`<div class="drawer__featured">
        <div class="drawer__featured-title">${esc(txt(e.find('[class*="featured-title"]').first()))}</div>
        <div class="drawer__featured-text">${esc(txt(e.find('[class*="featured-text"]').first()))}</div>
        <a class="btn btn--lime" href="${esc(href(a))}"${carry(a)}>${esc(txt(a))}</a>
      </div>`);
    } else if (/header-drawer__promos/.test(cls)) {
      e.find('.header-drawer__promo-item a').each((j, a) => {
        const img = $(a).find('img').first();
        out.push(`<a class="drawer__promo" href="${esc(href(a))}"${carry(a)}><img src="${media(img.attr('src'))}" alt="${esc(img.attr('alt'))}" width="425" height="251"><div class="drawer__promo-title">${esc(txt($(a).find('[class*="promo-item-title"]')))}</div></a>`);
      });
    } else if (/header-drawer__separator/.test(cls)) {
      out.push('<div class="drawer__separator" role="presentation"></div>');
    } else if (el.tagName === 'predictive-search') {
      out.push(`<form class="drawer__search" action="/search" method="get" role="search">
        <input class="drawer__search-input" type="search" name="q"${carry(e.find('input'), ['placeholder', 'aria-label'])}>
        <button class="drawer__search-btn" type="submit">${ICONS.search}<span class="visually-hidden">Search</span></button>
      </form>`);
    } else if (/header-drawer__socials/.test(cls)) {
      out.push(`<div class="drawer__socials">${drawerSocials.map((s) => `<a href="${esc(s.href)}"${s.attrs}>${s.svg}</a>`).join('')}</div>`);
    } else if (/safe-area-spacer/.test(cls)) {
      // spacing only
    } else {
      // nested containers (featured + links mixed)
      if (e.children().length) out.push(drawerBody(e, depth));
    }
  });
  return out.join('\n');
}
const drawerRoot = $('.header-drawer.is-root > .header-drawer__container > .header-drawer__body').first();
const drawerCta = $('.header-drawer__header a.btn').first();

// ---------------- header
const navButtons = $('.header__right-block .header__right-menu-item').map((i, el) => {
  const b = $(el).children().first();
  return { t: txt(b), isLink: b.get(0).tagName === 'a', h: b.attr('href'), at: carry(b) };
}).get();
const panelIds = ['mega-products', 'mega-benefits', 'mega-learn'];
const headerCta = $('.header__cta a.btn').first();
const searchPlaceholder = $('.search-form__input').attr('placeholder') || 'Search';
const header = `<div class="site-chrome" data-site-chrome>
  <div class="announce-spacer">${announce()}</div>
  <div class="site-header__bar">
    <div class="container"><header class="site-header">
      <a class="site-header__logo" href="/"><img src="assets/logo.svg" alt="Nature's Bounty" width="200" height="32"></a>
      <nav class="site-header__nav">
${navButtons.map((b, i) => b.isLink
    ? `        <div class="site-header__item"><a class="site-header__link" href="${esc(b.h)}"${b.at}>${esc(b.t)}</a></div>`
    : `        <div class="site-header__item"><button class="site-header__link" type="button"${b.at} aria-expanded="false" aria-controls="${panelIds[i]}" data-mega-trigger="${panelIds[i]}">${esc(b.t)}${ICONS.chev}</button></div>`).join('\n')}
        <form class="site-search" action="/search" method="get" role="search" data-site-search>
          <input class="site-search__input" type="search" name="q"${carry($('.search-form__input').first(), ['placeholder', 'aria-label'])}>
          <button class="site-search__btn" type="submit">${ICONS.search}<span class="visually-hidden">Search</span></button>
        </form>
        <div class="site-header__cta"><a class="btn btn--lime btn--pill-sm" href="${esc(href(headerCta))}"${carry(headerCta)}>${esc(txt(headerCta))}</a></div>
      </nav>
      <div class="site-header__mobile">
        <button class="site-header__burger" type="button" aria-label="Drawer Open Button" aria-expanded="false" aria-controls="site-drawer" data-drawer-toggle>${ICONS.burger}</button>
        <div class="drawer__overlay" data-drawer-close></div>
        <div class="drawer" id="site-drawer">
          <div class="drawer__panel drawer__panel--root" data-depth="0">
            <div class="drawer__head">
              <a class="btn btn--lime" href="${esc(href(drawerCta))}"${carry(drawerCta)}>${esc(txt(drawerCta))}</a>
              <button class="drawer__close" type="button" aria-label="Drawer Close Button" data-drawer-close>${ICONS.close}</button>
            </div>
            <div class="drawer__body">
${drawerBody(drawerRoot, 0)}
            </div>
          </div>
        </div>
      </div>
    </header></div>
    <div class="mega" data-mega>
    ${productsPanel()}
    ${benefitsPanel()}
    ${learnPanel()}
    </div>
  </div>
</div>`;

// ---------------- main: blog listing
const toLocal = (s) => media(s);
const hero = $('.blog__hero').first();
const heroTitle = txt(hero.find('.blog__hero-title'));
const filters = hero.find('.blog__filters a').map((i, a) => ({ t: txt(a), h: href(a), l: $(a).attr('aria-label') })).get();
const selectOpts = hero.find('.blog__filters-select option').map((i, o) => ({ v: $(o).attr('value') || '', t: txt(o) })).get();
// one article-item card (the article-item family; canon .related-card module)
const card = (el, cls) => {
  const E = $(el);
  const img = E.find('.article-item__image-holder img').first();
  const tags = E.find('.article-item__tags');
  const tagsHtml = tags.children().map((j, c) => c.tagName === 'a'
    ? `<a href="${esc(href(c))}">${esc(txt(c))}</a>` : `<span aria-hidden="true">${esc(txt(c))}</span>`).get().join('');
  const content = E.children('a.article-item__content').first();
  const excerpt = txt(content.find('.article-item__excerpt').first());
  const extraP = E.children('p');
  const imgA = E.find('a.article-item__url').first();
  return `        <div class="related-card ${cls}">
          <div class="related-card__media"><a href="${esc(href(imgA))}" tabindex="-1" aria-label="${esc(imgA.attr('aria-label'))}"><img src="${toLocal(img.attr('src'))}" alt="${esc(img.attr('alt'))}" width="${esc(img.attr('width'))}" height="${esc(img.attr('height'))}"></a></div>
${tags.length ? `          <div class="related-card__tags">${tagsHtml}</div>\n` : ''}          <a class="related-card__link" href="${esc(href(content))}" aria-label="${esc(content.attr('aria-label'))}"><h2 class="related-card__title">${esc(txt(content.find('h2').first()))}</h2>${excerpt ? `<span class="related-card__excerpt">${esc(excerpt)}</span>` : ''}</a>
${extraP.length ? `          <p class="related-card__more"><a href="${esc(href(extraP.find('a')))}" aria-label="${esc(extraP.find('a').attr('aria-label'))}">${esc(txt(extraP))}</a></p>\n` : ''}        </div>`;
};
const topCards = $('.blog__featured-top .article-item').map((i, el) => card(el, 'listing-card listing-card--wide')).get();
const gridCards = $('#blog-items').children('.article-item').map((i, el) => card(el, 'listing-card')).get();
const feat = $('.blog__featured').first();
const featImg = feat.find('.blog__featured-image-holder img').first();
const featMore = feat.find('.blog__featured-more').first();
const featExcerpt = feat.find('.blog__featured-content .article-item__excerpt p').map((i, p) => `<p>${esc(txt(p))}</p>`).get().join('');
const loadMore = $('#blog-pagination a').first();
const mainHtml = `<main id="MainContent" class="listing-page">
  <section class="blog-index">
    <div class="blog-hero">
      <div class="blog-hero__inner container container--tight">
        <h1 class="blog-hero__title">${esc(heroTitle)}</h1>
        <div class="blog-filters">
${filters.map((f) => `          <a class="blog-filters__item" href="${esc(f.h)}"${f.l ? ` aria-label="${esc(f.l)}"` : ''}>${esc(f.t)}</a>`).join('\n')}
        </div>
        <div class="blog-filters-select">
          <select data-filter-select>
${selectOpts.map((o) => `            <option value="${esc(o.v)}">${esc(o.t)}</option>`).join('\n')}
          </select>
          ${svgOf('.blog__filters-select svg')}
        </div>
      </div>
    </div>
    <div class="container container--tight">
      <div class="listing-top">
        <div class="listing-grid listing-grid--two">
${topCards.join('\n')}
        </div>
      </div>
      <div class="blog-featured-wrap">
        <div class="blog-featured${feat.hasClass('has-no-tags') ? ' blog-featured--no-tags' : ''}">
          <div class="blog-featured__image">
            <div class="blog-featured__label">${esc(txt(feat.find('.blog__featured-image-text')))}</div>
            <div class="blog-featured__holder"><img src="${toLocal(featImg.attr('src'))}" alt="${esc(featImg.attr('alt'))}" width="1200" height="505"></div>
          </div>
          <div class="blog-featured__content">
            <h2 class="blog-featured__title">${esc(txt(feat.find('.blog__featured-content .article-item__title')))}</h2>
            <div class="blog-featured__excerpt">${featExcerpt}</div>
            <div><a class="blog-featured__more" href="${esc(href(featMore))}" aria-label="${esc(featMore.attr('aria-label'))}">${esc(txt(featMore))}</a></div>
          </div>
        </div>
      </div>
      <div class="listing-grid listing-grid--main" id="blog-items">
${gridCards.join('\n')}
      </div>
      <div class="listing-pagination" id="blog-pagination">
        <a class="btn btn--outline btn--action" href="${esc(href(loadMore))}"><span>${esc(txt(loadMore))}</span></a>
      </div>
    </div>
  </section>
</main>`;
console.log('cards: top', topCards.length, 'grid', gridCards.length, 'filters', filters.length, 'opts', selectOpts.length);

const bannerImg = $('.content-banner img').first();
const bannerText = txt($('.content-banner__text'));
const igTitle = txt($('.instagram__title'));
const igItems = $('.instagram__item').map((i, a) => ({
  h: href(a), img: $(a).find('img').attr('src'),
  title: txt($(a).find('.instagram__item-content-title')), sub: txt($(a).find('.instagram__item-content-subtitle')),
  btn: txt($(a).find('.btn')),
})).get();

// ---------------- footer
const fcols = $('.footer__links .footer__navigation-links').map((i, c) => ({
  t: txt($(c).find('.footer__navigation-link-parent')),
  links: $(c).find('a.footer__navigation-link-child').map((j, a) => ({ t: txt(a), h: href(a) })).get(),
})).get();
const nl = {
  title: txt($('.footer__newsletter-title')), sub: txt($('.footer__newsletter-subtitle')),
  ph: $('.footer__newsletter-input').attr('placeholder') || 'Your Email', btn: txt($('#Subscribe')),
  social: txt($('.footer__newsletter-social.is-desktop .footer__newsletter-social-title')),
};
const legal = $('.footer__navigation-legal-links a.footer__navigation-legal-link').map((i, a) => ({ t: txt($(a).find('p')), h: href(a) })).get();
const privacy = txt($('.optanon-toggle-display .your-privacy-choices'));
const disclaimerStrong = txt($('.footer__disclaimer > span strong'));
const disclaimerPs = $('.footer__disclaimer').children('p').map((i, p) => {
  const c = $(p).clone();
  c.find('*').each((j, el) => { const keep = {}; if (el.tagName === 'a') { keep.href = $(el).attr('href'); if ($(el).attr('title') !== undefined) keep.title = $(el).attr('title'); } el.attribs = keep; });
  return c.html().trim().replace(/\n\s*/g, ' ');
}).get();
const socialList = (cls) => `<div class="${cls}">
          <div class="site-footer__social-title">${esc(nl.social)}</div>
          <ul class="site-footer__socials">
${footerSocialSvgs.map((s) => `            <li><a href="${esc(s.href)}"${s.attrs}>${s.svg}</a></li>`).join('\n')}
          </ul>
        </div>`;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="canonical" href="${esc(canonical)}">
  ${og}
  <link rel="icon" href="assets/favicon.png">
  <link rel="preload" href="assets/fonts/figtree-latin-var.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="canon.css">
  <link rel="stylesheet" href="listing.css">
  <script src="canon.js" defer></script>
</head>
<body>
<a class="skip-link visually-hidden" href="#MainContent">Skip to content</a>
${header}
${mainHtml}
<section class="trusted-band">
  <div class="trusted-band__inner container">
    <img class="trusted-band__img" src="${media(bannerImg.attr('src'))}" alt="" width="900" height="110">
    <p class="trusted-band__text">${esc(bannerText)}</p>
  </div>
  <div class="trusted-band__rule" role="presentation"></div>
</section>
<section class="social-strip">
  <h4 class="social-strip__title"><p>${esc(igTitle)}</p></h4>
  <div class="social-strip__grid">
${igItems.map((g) => `    <a class="social-tile" href="${esc(g.h)}" aria-label="${esc(g.title)}">
      <img src="${media(g.img)}" alt="${esc(g.title)}" width="350" height="350">
      <span class="social-tile__overlay"><span class="social-tile__title">${esc(g.title)}</span><span class="social-tile__sub">${esc(g.sub)}</span><span class="btn social-tile__btn">${esc(g.btn)}</span></span>
    </a>`).join('\n')}
  </div>
</section>
<footer class="site-footer">
  <div class="container">
    <div class="site-footer__logo"><a href="/"><img src="assets/media/NB-logo.svg" alt="Nature's Bounty" width="350" height="55"></a></div>
    <div class="site-footer__content">
      <div class="site-footer__newsletter">
        <div class="site-footer__nl-title">${esc(nl.title)}</div>
        <div class="site-footer__nl-sub">${esc(nl.sub)}</div>
        <form class="site-footer__form" action="/contact#ContactFooter" method="post">
          <div class="site-footer__field"><input class="site-footer__input" id="NewsletterForm--footer" type="email" name="contact[email]" placeholder="${esc(nl.ph)}" autocomplete="email" aria-required="true" required><button class="site-footer__submit" type="submit">${esc(nl.btn)}</button></div>
        </form>
        ${socialList('site-footer__social site-footer__social--desktop')}
      </div>
      <div class="site-footer__links">
${fcols.map((c, i) => `        <div class="site-footer__col${i === 1 ? ' site-footer__col--wide' : ''}" data-footer-col>
          <div class="site-footer__col-head" role="button" tabindex="0" aria-expanded="false" data-footer-toggle>${esc(c.t)}<span class="site-footer__col-icon">${ICONS.drop}</span></div>
          <ul class="site-footer__col-links">
${c.links.map((l) => `            <li><a href="${esc(l.h)}">${esc(l.t)}</a></li>`).join('\n')}
          </ul>
        </div>`).join('\n')}
        ${socialList('site-footer__social site-footer__social--mobile')}
      </div>
    </div>
    <hr class="site-footer__rule">
    <ul class="site-footer__legal">
${legal.map((l, i) => `      <li><a class="site-footer__legal-link" href="${esc(l.h)}"><p class="site-footer__legal-label">${esc(l.t)}</p>${i < legal.length - 1 ? '<span class="site-footer__sep" aria-hidden="true">|</span>' : ''}</a></li>`).join('\n')}
      <li class="site-footer__legal-sep" aria-hidden="true"><span class="site-footer__sep">|</span></li>
      <li><a class="site-footer__privacy" role="button" tabindex="0">${ICONS.privacy}<span class="site-footer__privacy-label">${esc(privacy)}</span></a></li>
    </ul>
    <div class="site-footer__disclaimer">
      <div class="site-footer__fda"><p><strong>${esc(disclaimerStrong)}</strong></p></div>
${disclaimerPs.map((p) => `      <p>${p}</p>`).join('\n')}
    </div>
  </div>
</footer>
<div class="tag-frames" data-dynamic="iframe-runtime" aria-hidden="true"><span></span><span></span><span></span></div>
<script>document.querySelectorAll('[data-filter-select]').forEach((s) => s.addEventListener('change', () => { if (s.value) window.location.href = s.value; }));</script>
</body>
</html>
`;
fs.writeFileSync(OUT, html);
fs.writeFileSync(path.join(ROOT, 'stardust/replica/work/tools/listing-media.tsv'), [...DL].map(([k, v]) => k + '\t' + v).join('\n') + '\n');
console.log('wrote', OUT, html.length, 'bytes');
if (/naturesbounty\.com\/cdn|\/\/naturesbounty\.com/.test(html.replace(/https:\/\/naturesbounty\.com\/(blogs|collections|pages|products)[^"]*/g, ''))) console.log('WARNING: source-host asset reference remains');
