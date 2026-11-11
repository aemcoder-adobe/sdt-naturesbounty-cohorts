// Generates stardust/prototypes/index-proposed.html (landing archetype — the home page; forked from gen-recipe.cjs) from the captured page.
// Text, hrefs and alt text are read verbatim from the capture; the markup is re-authored.
const fs = require('fs');
const path = require('path');
const cheerio = require('/app/node_modules/cheerio');

const ROOT = process.argv[2];
const SRC = process.env.LANDING_SRC || path.join(ROOT, 'stardust/current/pages/index.html');
const OUT = process.env.LANDING_OUT || path.join(ROOT, 'stardust/prototypes/index-proposed.html');
const CONTROL = false;
// home-page media harvested into assets/media/home-* (url -> local name, see home-media.tsv)
const HOME_MEDIA = new Map(fs.readFileSync(path.join(__dirname, 'home-media.tsv'), 'utf8').trim().split('\n').map((l) => { const [n, u] = l.split('\t'); return [u.replace(/^https:/, ''), n]; }));
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

// local media map
const media = (src) => {
  const s = String(src).replace(/&amp;/g, '&');
  const hm = HOME_MEDIA.get(s.replace(/^https:/, ''));
  if (hm) return `assets/media/${hm}`;
  const m = s.match(/files\/(menu-[a-z-]+)\.svg/);
  if (m) return `assets/media/${m[1]}.svg`;
  if (/hair-growth-cta-lrg/.test(s)) return 'assets/media/hair-growth-cta-lrg.png';
  if (/1608nboswebsitearticlesaugustbiotinlg/.test(s)) return 'assets/media/article-biotin-hero.jpg';
  if (/products\/035710/.test(s)) return 'assets/media/product-035710.png';
  if (/products\/053545/.test(s)) return 'assets/media/product-053545.png';
  if (/07_HairGrowth_NB_IIYN/.test(s)) return 'assets/media/article-ceramides.jpg';
  if (/OS-January-Blog/.test(s)) return 'assets/media/article-os-january.jpg';
  if (/1123-NB-Q4-Blog-Beauty/.test(s)) return 'assets/media/article-beauty-routine-2024.jpg';
  if (/articles\/apple_crisp\.jpg/.test(s)) return 'assets/media/recipe-apple-crisp-hero.jpg';
  if (/peachpearplumsmoothie/.test(s)) return 'assets/media/recipe-peach-pear-plum-smoothie.jpg';
  if (/oatmealcookieshakerecipelg/.test(s)) return 'assets/media/recipe-oatmeal-cookie-shake.jpg';
  if (/mango_berry_cloud/.test(s)) return 'assets/media/recipe-mango-berry-cloud.jpg';
  if (/trusted-banner/.test(s)) return 'assets/media/trusted-banner.png';
  const ig = s.match(/files\/(AdvMagGly|first_day_of_spring_2025-2|SupercomplexB|Vitamin_C|GummiesBillboard)\.png/);
  if (ig) return `assets/media/ig-${ig[1]}.png`;
  if (CONTROL && /cdn\/shop\/articles\//.test(s)) return 'https:' + s;
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


// ---------------- main: landing (home) — seven template sections, re-authored
const M = $('#MainContent').children();
const sec = (i) => M.eq(i);
// inner html with every attribute dropped except href (inline phrasing kept verbatim)
const cleanHtml = (el) => {
  const c = $(el).clone();
  c.find('*').each((i, e) => { const keep = e.tagName === 'a' ? { href: $(e).attr('href') } : {}; e.attribs = keep; });
  return (c.html() || '').trim().replace(/\s*\n\s*/g, ' ');
};
const svgHtml = (el) => $.html($(el)).replace(/\s+/g, ' ').replace(/<!--[\s\S]*?-->/g, '').trim();

// 1. video hero
const vh = sec(0);
const vhVideo = vh.find('video').first();
const vhLink = vh.find('a[class$="__link"]').first();
const hero = {
  poster: media(vhVideo.attr('poster')), src: media(vhVideo.find('source').attr('src')),
  h1: txt(vh.find('h1')), body: cleanHtml(vh.find('[class$="__body"]').first()), link: { t: txt(vhLink), h: href(vhLink) },
};

// 2. featured grid
const fg = sec(1);
const fgTitle = txt(fg.find('.featured-grid__title'));
const fgItems = fg.find('.featured-grid__item').map((i, el) => {
  const E = $(el);
  if (E.hasClass('has-content')) {
    const a = E.find('.featured-grid__item-footer a');
    return { kind: 'content', title: txt(E.find('.featured-grid__item-title')), desc: txt(E.find('.featured-grid__item-description')), a: { t: txt(a), h: href(a), at: carry(a) } };
  }
  const a = E.find('a').first();
  return { kind: 'image', h: href(a), at: carry(a), img: media(E.find('img').attr('src')), alt: E.find('img').attr('alt'), w: E.find('img').attr('width') || 750, hh: E.find('img').attr('height') || 750, t: txt(a.find('span')) };
}).get();

// 3. tabbed products
const tp = sec(2);
const tpTitle = txt(tp.find('.tabbed-products__title'));
const tpText = txt(tp.find('.tabbed-products__text'));
const pills = tp.find('.tabbed-products__pill-btn').map((i, b) => ({ t: txt(b), handle: $(b).attr('data-collection-handle'), active: $(b).hasClass('is-active') })).get();
const navBtn = (sel) => { const b = tp.find(sel).first(); return { step: b.attr('data-prev') || b.attr('data-next'), vh: txt(b.find('.visually-hidden')), svg: svgHtml(b.find('svg')) }; };
const tpPrev = navBtn('.tabbed-products__nav-btn[data-prev]');
const tpNext = navBtn('.tabbed-products__nav-btn[data-next]');
const tpMPrev = navBtn('.tabbed-products__mobile-nav-btn[data-prev]');
const tpMNext = navBtn('.tabbed-products__mobile-nav-btn[data-next]');
const tpCta = tp.find('.tabbed-products__cta').first();
const tpSlides = tp.find('.tabbed-products__slide').map((i, s) => {
  const P = $(s).find('.product-item').first();
  const stars = P.find('.bv_stars_component_container svg').map((j, sv) => $(sv).find('linearGradient').attr('x1') || '100%').get();
  return {
    handle: $(s).attr('data-collection-handle'),
    h: href(P.find('a.product-item__inner')), aria: P.find('a.product-item__inner').attr('aria-label'),
    img: media(P.find('img.product-item__image').attr('src')), alt: P.find('img.product-item__image').attr('alt'),
    title: txt(P.find('.product-item__title')), servings: txt(P.find('.product-item__servings')),
    off: txt(P.find('.bv_offscreen_text')), avg: txt(P.find('.bv_avgRating_component_container')),
    num: txt(P.find('.bv_numReviews_text')), stars, hasBv: P.find('.bv_main_container').length > 0,
    war: txt(P.find('.bv_war_button')), warAria: P.find('.bv_war_button').attr('aria-label'),
    desc: txt(P.find('.product-item__description')), cta: txt(P.find('.product-item__cta')), ctaAria: P.find('.product-item__cta').attr('aria-label'),
  };
}).get();
const STAR_PATH = $('.bv_stars_component_container svg path').first().attr('d');
const star = (x1, id) => `<svg class="rating__star" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 25" width="20" height="20" focusable="false"><polygon points="" fill="url(#${id})"></polygon><path d="${STAR_PATH}" fill="url(#${id})"></path><defs><linearGradient id="${id}" x1="${x1}" y1="0%" x2="100%" y2="0%"><stop offset="0%" stop-color="var(--star-on)"></stop><stop offset="1%" stop-color="var(--star-off)"></stop></linearGradient></defs></svg>`;
const ratingHtml = (p, i) => (p.hasBv ? `<div class="rating"><button class="rating__summary" type="button" role="link" tabindex="-1"><span class="visually-hidden">${esc(p.off)}</span><span class="rating__stars">${p.stars.map((x, j) => star(x, `star-${i}-${j}`)).join('')}</span><span class="rating__avg">${esc(p.avg)}</span><span class="rating__num">&nbsp;<span class="rating__count">${esc(p.num)}</span></span></button><span class="rating__extra"><button class="rating__write" type="button"${p.warAria ? ` aria-label="${esc(p.warAria)}"` : ''}>${esc(p.war)}</button></span></div>` : '<div class="rating rating--empty"></div>');

// 4. content products (8-slide highlight carousel)
const cp = sec(3);
const cpBg = {};
cp.find('style').each((i, st) => {
  for (const m of $(st).html().matchAll(/\.content-highlight__image-section-(content_block_\w+)\s*\{[^}]*url\("?([^")]+)"?\)/g)) cpBg[m[1]] = media(m[2].replace(/&amp;/g, '&'));
});
const cpMaxH = {};
cp.find('style').each((i, st) => {
  for (const m of $(st).html().matchAll(/\.image-highlight\.(content_block_\w+) img\s*\{\s*max-height:\s*(\d+)px/g)) cpMaxH[m[1]] = +m[2];
});
const cpSlides = cp.find('.swiper-slide').map((i, s) => {
  const S = $(s);
  const block = (S.find('[class*="content-highlight__image-section-"]').attr('class').match(/content_block_\w+/) || [])[0];
  const img = S.find('.image-highlight img').first();
  const title = S.find('.content-highlight__title').first().clone();
  title.find('span:empty').remove();
  const a = S.find('.content-highlight__actions a').first();
  return {
    bg: cpBg[block], maxH: cpMaxH[block], img: media(img.attr('src')), alt: img.attr('alt'),
    sub: cleanHtml(S.find('.content-highlight__subtitle')), title: cleanHtml(title),
    text: cleanHtml(S.find('.content-highlight__text')), a: { t: txt(a), h: href(a) },
  };
}).get();
const cpArrow = svgHtml(cp.find('[class*="swiper-button-prev-"] svg').first());
const cpPrevAria = cp.find('[class*="swiper-button-prev-"]').first().attr('aria-label');
const cpNextAria = cp.find('[class*="swiper-button-next-"]').first().attr('aria-label');
const cpDots = cp.find('.swiper-pagination-bullet').map((i, b) => $(b).attr('aria-label')).get();

// 5. content newsletter
const cn = sec(4);
const cnLeft = cleanHtml(cn.find('.container_newsletter-left .container_newsletter-text-container'));
const cnTitle = cn.find('.title-box h3').map((i, h) => cleanHtml(h)).get();
const cnText = cleanHtml(cn.find('.text-box'));
const cnInput = cn.find('.footer__newsletter-input');
const cnBtn = txt(cn.find('#Subscribe'));

// 6. testimonials (2 quotes; swiper loop clones dropped)
const ct = sec(5);
const ctTitle = txt(ct.find('.content-testimonials__title'));
const ctStar = svgHtml(ct.find('.content-testimonials__star-rating svg').first());
const ctArrow = svgHtml(ct.find('.content-testimonials__nav_holder .swiper-button-prev svg').first());
const ctPrevAria = ct.find('.content-testimonials__nav_holder .swiper-button-prev').attr('aria-label');
const ctNextAria = ct.find('.content-testimonials__nav_holder .swiper-button-next').attr('aria-label');
const ctItems = ct.find('.content-testimonials__quote_item').not('.swiper-slide-duplicate').map((i, q) => {
  const Q = $(q);
  const img = Q.find('.content-testimonials__image_block img').first();
  const ia = Q.find('.content-testimonials__image_block a').first();
  const ra = Q.find('.content-testimonials__quote_block > a').first();
  return {
    label: Q.attr('aria-label'), img: media(img.attr('src')), alt: img.attr('alt'), w: img.attr('width') || 500, hh: img.attr('height') || 500,
    ia: { t: txt(ia), h: href(ia), at: carry(ia) }, title: txt(Q.find('.content-testimonials__quote_title')),
    text: cleanHtml(Q.find('.content-testimonials__quote_text')), stars: Q.find('.content-testimonials__star-rating svg').length,
    reviewer: txt(Q.find('.content-testimonials__quote_reviewer')), ra: { t: txt(ra), h: href(ra), at: carry(ra) },
  };
}).get().sort((a, b) => parseInt(a.label, 10) - parseInt(b.label, 10));

// 7. featured content
const fc = sec(6);
const fcTitle = cleanHtml(fc.find('.featured-content__title'));
const fcText = cleanHtml(fc.find('.featured-content__text'));
const fcLinks = fc.find('.featured-content__links a').map((i, a) => ({ t: txt(a), h: href(a), at: carry(a), svg: svgHtml($(a).find('svg')) })).get();
const fcItems = fc.find('.featured-content__item').map((i, it) => {
  const I = $(it);
  const a = I.find('.featured-content__item-left > a').first();
  const img = I.find('.featured-content__item-right img').first();
  return {
    title: cleanHtml(I.find('.featured-content__item-title')), text: cleanHtml(I.find('.featured-content__item-text')),
    a: { t: txt(a), h: href(a), at: carry(a) }, img: media(img.attr('src')), alt: img.attr('alt') || '',
  };
}).get();

const mainHtml = `<main id="MainContent" class="landing-page">
  <section class="video-hero">
    <div class="video-hero__media" aria-hidden="true"><video playsinline autoplay loop muted preload="metadata" poster="${hero.poster}" data-autoplay-video><source src="${hero.src}" type="video/mp4"></video></div>
    <div class="video-hero__shade"></div>
    <div class="video-hero__content">
      <h1 class="video-hero__heading">${esc(hero.h1)}</h1>
      <div class="video-hero__body">${hero.body}</div>
      <a class="video-hero__link" href="${esc(hero.link.h)}">${esc(hero.link.t)}</a>
    </div>
  </section>
  <section class="featured-grid">
    <div class="featured-grid__inner container">
      <div class="featured-grid__title section-title">${esc(fgTitle)}</div>
      <div class="featured-grid__holder">
${fgItems.map((it) => (it.kind === 'content' ? `        <div class="featured-grid__item featured-grid__item--content">
          <div class="featured-grid__body">
            <div class="featured-grid__item-title">${esc(it.title)}</div>
            <div class="featured-grid__item-desc">${esc(it.desc)}</div>
          </div>
          <div class="featured-grid__foot"><a href="${esc(it.a.h)}"${it.a.at}>${esc(it.a.t)}</a></div>
        </div>` : `        <div class="featured-grid__item featured-grid__item--image">
          <a href="${esc(it.h)}"${it.at}><span class="featured-grid__media"><img src="${it.img}" alt="${esc(it.alt)}" width="${it.w}" height="${it.hh}"></span><span class="featured-grid__label">${esc(it.t)}</span></a>
        </div>`)).join('\n')}
      </div>
    </div>
  </section>
  <section class="tabbed-products" data-tabbed-products>
    <div class="tabbed-products__inner container">
      <h2 class="tabbed-products__title section-title">${esc(tpTitle)}</h2>
      <div class="tabbed-products__text">${esc(tpText)}</div>
      <div class="tabbed-products__pills" role="group">
${pills.map((p) => `        <button class="tabbed-products__pill${p.active ? ' is-active' : ''}" type="button" data-collection-handle="${esc(p.handle)}" aria-pressed="${p.active}">${esc(p.t)}</button>`).join('\n')}
      </div>
      <div class="tabbed-products__slider">
        <button class="tabbed-products__nav tabbed-products__nav--prev" type="button" data-prev="${esc(tpPrev.step)}"><span class="visually-hidden">${esc(tpPrev.vh)}</span>${tpPrev.svg}</button>
        <div class="tabbed-products__track" data-tp-track>
${tpSlides.map((p, i) => `          <div class="tabbed-products__slide" data-collection-handle="${esc(p.handle)}">
            <div class="product-card">
              <a class="product-card__inner" href="${esc(p.h)}" aria-label="${esc(p.aria)}">
                <div class="product-card__body">
                  <div class="product-card__media"><img src="${p.img}" alt="${esc(p.alt)}" width="270" height="360"></div>
                  <h4 class="product-card__title">${esc(p.title)}</h4>
                  <div class="product-card__servings">${esc(p.servings)}</div>
                  ${ratingHtml(p, i)}
                  <div class="product-card__desc">${esc(p.desc)}</div>
                </div>
                <div class="product-card__foot"><button class="btn btn--lime product-card__cta" type="button" tabindex="-1"${p.ctaAria ? ` aria-label="${esc(p.ctaAria)}"` : ''}>${esc(p.cta)}</button></div>
              </a>
            </div>
          </div>`).join('\n')}
        </div>
        <button class="tabbed-products__nav tabbed-products__nav--next" type="button" data-next="${esc(tpNext.step)}"><span class="visually-hidden">${esc(tpNext.vh)}</span>${tpNext.svg}</button>
      </div>
      <div class="tabbed-products__mobile-nav">
        <button class="tabbed-products__mobile-btn" type="button" data-prev="${esc(tpMPrev.step)}"><span class="visually-hidden">${esc(tpMPrev.vh)}</span>${tpMPrev.svg}</button>
        <button class="tabbed-products__mobile-btn" type="button" data-next="${esc(tpMNext.step)}"><span class="visually-hidden">${esc(tpMNext.vh)}</span>${tpMNext.svg}</button>
      </div>
      <div class="tabbed-products__actions"><a class="tabbed-products__cta" href="${esc(href(tpCta))}">${esc(txt(tpCta))}</a></div>
    </div>
  </section>
  <section class="content-products" data-cp aria-roledescription="carousel">
    <div class="content-products__viewport">
      <div class="content-products__track" data-cp-track>
${cpSlides.map((s, i) => `        <div class="content-products__slide${i === 0 ? ' is-active' : ''}" role="group" aria-roledescription="slide" aria-label="${i + 1} / ${cpSlides.length}"${i ? ' aria-hidden="true" inert' : ''}>
          <section class="content-highlight">
            <div class="content-highlight__image" style="background-image: url('${s.bg}')"></div>
            <div class="image-highlight"><img src="${s.img}" alt="${esc(s.alt)}" style="--max-h: ${s.maxH}px" width="500" height="816"${i ? '' : ''}></div>
            <div class="content-highlight__content">
              <h3 class="content-highlight__subtitle">${s.sub}</h3>
              <h2 class="content-highlight__title">${s.title}</h2>
              <div class="content-highlight__cta-image" style="background-image: url('${s.img}')"></div>
              <div class="content-highlight__text">${s.text}</div>
              <div class="content-highlight__actions"><a class="btn" href="${esc(s.a.h)}"><span>${esc(s.a.t)}</span></a></div>
            </div>
          </section>
        </div>`).join('\n')}
      </div>
    </div>
    <div class="content-products__dots">
${cpDots.map((l, i) => `      <button class="content-products__dot${i === 0 ? ' is-active' : ''}" type="button" aria-label="${esc(l)}"${i === 0 ? ' aria-current="true"' : ''} data-cp-dot="${i}"></button>`).join('\n')}
    </div>
    <div class="content-products__arrows">
      <button class="content-products__arrow content-products__arrow--prev" type="button" aria-label="${esc(cpPrevAria)}" disabled data-cp-prev>${cpArrow}</button>
      <button class="content-products__arrow content-products__arrow--next" type="button" aria-label="${esc(cpNextAria)}" data-cp-next>${cpArrow}</button>
    </div>
  </section>
  <section class="content-newsletter">
    <div class="content-newsletter__inner container">
      <div class="content-newsletter__left"><div class="content-newsletter__text">${cnLeft}</div></div>
      <div class="content-newsletter__right">
        <div class="content-newsletter__text">
          <div class="content-newsletter__title">${cnTitle.map((h) => `<h3>${h}</h3>`).join('')}</div>
          <div class="content-newsletter__copy">${cnText}</div>
          <form class="content-newsletter__form" action="/contact#ContactNewsletter" method="post">
            <input type="hidden" name="contact[tags]" value="newsletter">
            <div class="content-newsletter__field"><input class="content-newsletter__input" id="NewsletterForm--landing" type="email" name="contact[email]" placeholder="${esc(cnInput.attr('placeholder') || 'Your Email')}" autocomplete="email" required><button class="content-newsletter__submit" type="submit">${esc(cnBtn)}</button></div>
          </form>
        </div>
      </div>
    </div>
  </section>
  <section class="testimonials" data-testimonials aria-roledescription="carousel">
    <div class="testimonials__title section-title">${esc(ctTitle)}</div>
    <div class="testimonials__holder">
      <div class="testimonials__viewport">
        <div class="testimonials__track" data-tm-track>
${ctItems.map((q, i) => `          <div class="testimonials__item" role="group" aria-roledescription="slide" aria-label="${esc(q.label)}"${i ? ' aria-hidden="true" inert' : ''}>
            <div class="testimonials__media">
              <img src="${q.img}" alt="${esc(q.alt)}" width="${q.w}" height="${q.hh}">
              <a href="${esc(q.ia.h)}"${q.ia.at}>${esc(q.ia.t)}</a>
            </div>
            <div class="testimonials__quote">
              <div class="testimonials__quote-title">${esc(q.title)}</div>
              <div class="testimonials__quote-text">${q.text}</div>
              <div class="testimonials__stars">${Array(q.stars).fill(ctStar).join('')}</div>
              <span class="testimonials__reviewer">${esc(q.reviewer)}</span>
              <a href="${esc(q.ra.h)}"${q.ra.at}>${esc(q.ra.t)}</a>
            </div>
          </div>`).join('\n')}
        </div>
      </div>
      <button class="testimonials__arrow testimonials__arrow--prev" type="button" aria-label="${esc(ctPrevAria)}" data-tm-prev>${ctArrow}</button>
      <button class="testimonials__arrow testimonials__arrow--next" type="button" aria-label="${esc(ctNextAria)}" data-tm-next>${ctArrow}</button>
    </div>
  </section>
  <section class="featured-content">
    <div class="featured-content__left">
      <div class="container">
        <div class="featured-content__inner">
          <div class="featured-content__bar" role="presentation"></div>
          <h2 class="featured-content__title section-title">${fcTitle}</h2>
          <div class="featured-content__text">${fcText}</div>
          <div class="featured-content__links">
${fcLinks.map((l) => `            <a href="${esc(l.h)}"${l.at}>${esc(l.t)}${l.svg}</a>`).join('\n')}
          </div>
        </div>
      </div>
    </div>
    <div class="featured-content__right">
      <div class="container">
        <div class="featured-content__blocks">
${fcItems.map((it) => `          <div class="featured-content__item">
            <div class="featured-content__item-body">
              <div class="featured-content__item-title">${it.title}</div>
              <div class="featured-content__item-text">${it.text}</div>
              <a href="${esc(it.a.h)}"${it.a.at}>${esc(it.a.t)}</a>
            </div>
            <div class="featured-content__item-media"><img src="${it.img}" alt="${esc(it.alt)}" width="900" height="900"></div>
          </div>`).join('\n')}
        </div>
      </div>
    </div>
  </section>
</main>`;


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
  <link rel="stylesheet" href="landing.css">
  <script src="canon.js" defer></script>
  <script src="landing.js" defer></script>
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
</body>
</html>
`;
fs.writeFileSync(OUT, html);
console.log('wrote', OUT, html.length, 'bytes');
if (/naturesbounty\.com\/cdn|\/\/naturesbounty\.com/.test(html.replace(/https:\/\/naturesbounty\.com\/(blogs|collections|pages|products)[^"]*/g, ''))) console.log('WARNING: source-host asset reference remains');
