import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import ICONS from './header-icons.js';

/**
 * Header — template-slotted replica chrome: announcement ticker, logo, desktop mega menus,
 * expanding search, CTA and the mobile drill-down drawer. Content comes from the authored
 * `/nav` document (override with `nav` page metadata); sections in order:
 *   1 announcement <ul>   2 logo <p>   3 nav <ul> (a text item opens the panel of the same
 *   order, a link item navigates)   4 tools: search <p> link (text = field placeholder),
 *   CTA <p>, drawer social <ul>   5+ one mega panel per text nav item.
 * Authored nodes are MOVED into the desktop chrome (EW1); the ticker loop copies and the
 * mobile drawer are presentational clones with instrumentation stripped (EW4).
 */

const DESKTOP = window.matchMedia('(min-width: 1200px)');
const MOBILE_BANNER = window.matchMedia('(max-width: 768px)');
const SOCIAL_HOSTS = ['facebook', 'twitter', 'youtube', 'pinterest', 'instagram'];

let docController;

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  node.append(...children.filter(Boolean));
  return node;
}

function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = ICONS[name];
  return t.content.firstElementChild;
}

function stripInstrumentation(node) {
  const attrs = ['data-prose-index', 'data-image-index', 'data-block-index'];
  [node, ...node.querySelectorAll('*')].forEach((n) => {
    if (n.removeAttribute) attrs.forEach((a) => n.removeAttribute(a));
  });
  return node;
}

function clone(node) {
  return stripInstrumentation(node.cloneNode(true));
}

/** wraps authored nodes (moved, never rebuilt) in a classed slot */
function slot(className, ...nodes) {
  return el('div', { class: className }, ...nodes);
}

function linkOf(node) {
  return node && node.querySelector('a[href]');
}

function isStrongOnly(p) {
  return p.tagName === 'P' && !p.querySelector('a')
    && p.children.length === 1 && p.firstElementChild.tagName === 'STRONG';
}

function socialName(href) {
  return SOCIAL_HOSTS.find((h) => (href || '').includes(h));
}

/* ---------- parse the authored /nav sections by content role */

function sectionWrappers(fragment) {
  return [...fragment.querySelectorAll(':scope > .section')]
    .map((s) => s.querySelector('.default-content-wrapper') || s)
    .filter((w) => w.children.length);
}

function parsePanel(wrapper) {
  const panel = {
    title: null,
    list: null,
    cta: null,
    groups: [],
    promo: [],
    picture: null,
    caption: null,
    rest: [],
  };
  let promo = false;
  let node = wrapper.firstElementChild;
  while (node) {
    const next = node.nextElementSibling;
    if (node.tagName === 'UL' && !panel.list) {
      panel.list = node;
    } else if (node.tagName === 'P' && node.querySelector('picture, img')) {
      panel.picture = node;
    } else if (isStrongOnly(node) && next && next.tagName === 'UL') {
      panel.groups.push({ title: node, list: next });
      node = next.nextElementSibling;
      // eslint-disable-next-line no-continue
      continue;
    } else if (isStrongOnly(node)) {
      promo = true;
      panel.promo.push({ role: 'title', node });
    } else if (node.tagName === 'P' && linkOf(node)) {
      if (panel.picture && !panel.caption) panel.caption = node;
      else if (promo) panel.promo.push({ role: 'cta', node });
      else panel.cta = node;
    } else if (node.tagName === 'P' && !panel.list && !panel.title) {
      panel.title = node;
    } else if (promo) {
      panel.promo.push({ role: 'text', node });
    } else {
      panel.rest.push(node);
    }
    node = next;
  }
  if (panel.groups.length) panel.kind = 'nested';
  else if (panel.picture) panel.kind = 'content';
  else panel.kind = 'flat';
  panel.icons = !!(panel.list && panel.list.querySelector('img'));
  return panel;
}

/* ---------- announcement ticker */

function buildAnnounce(wrapper) {
  const region = el('div', { class: 'announce', role: 'region', 'aria-label': 'Announcements' });
  const track = el('div', { class: 'announce-track' });
  region.append(el('div', { class: 'announce-viewport' }, track));
  if (!wrapper) return region;
  const list = wrapper.querySelector('ul');
  if (!list) {
    track.append(...wrapper.children);
    return region;
  }
  const copy = () => {
    const c = clone(list);
    c.setAttribute('aria-hidden', 'true');
    c.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
    return c;
  };
  track.append(copy(), list, copy());
  return region;
}

function startTicker(region, signal) {
  const track = region.querySelector('.announce-track');
  const items = [...track.querySelectorAll('li')];
  const perSet = items.length / 3;
  if (!perSet || !Number.isInteger(perSet)) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let start = 0;
  let x0 = 0;
  let idx = 0;
  let timer;
  const leftOf = (i) => items[i].offsetLeft;
  const apply = (animate) => {
    track.style.transition = animate ? 'transform 13s linear' : 'none';
    track.style.transform = `translateX(${x0 - (leftOf(start + idx) - leftOf(start))}px)`;
  };
  const place = () => {
    const vp = track.parentElement.getBoundingClientRect().width;
    start = perSet + (MOBILE_BANNER.matches ? 1 : 0);
    const ml = parseFloat(getComputedStyle(items[start]).marginLeft) || 0;
    const w = items[start].offsetWidth + ml * 2;
    x0 = Math.round(vp / 2 - (leftOf(start) - ml + w / 2));
    idx = 0;
    apply(false);
  };
  const step = () => {
    if (!track.isConnected) return;
    if (idx >= perSet) {
      idx -= perSet;
      apply(false);
      track.getBoundingClientRect();
    }
    idx += 1;
    apply(true);
  };
  place();
  window.addEventListener('resize', () => {
    clearTimeout(timer);
    place();
    if (!reduce) timer = setTimeout(step, 3000);
  }, { signal });
  track.addEventListener('transitionend', (e) => {
    if (e.propertyName === 'transform') step();
  });
  if (!reduce) timer = setTimeout(step, 3000);
}

/* ---------- mobile drawer (presentational clones of the authored nav) */

function closeButton(label) {
  return el('button', {
    class: 'drawer-close', type: 'button', 'aria-label': label, 'data-drawer-close': '',
  }, icon('close'));
}

function drawerLink(a, extra = '') {
  const link = clone(a);
  link.className = `drawer-link ${extra}`.trim();
  link.removeAttribute('title');
  return link;
}

function subPanel(id, depth, title, ...body) {
  const sheet = el(
    'div',
    { class: 'drawer-sheet' },
    el(
      'div',
      { class: 'drawer-subhead' },
      el('button', {
        class: 'drawer-back', type: 'button', 'aria-label': 'Drawer Back', 'data-drawer-back': '',
      }, icon('dropdown')),
      el('div', { class: 'drawer-subtitle' }, title),
      closeButton('Drawer Close'),
    ),
    el('div', { class: 'drawer-body' }, ...body),
  );
  return el('div', { class: 'drawer-panel-sub', id, 'data-depth': depth }, sheet);
}

function subOpener(label, id) {
  return el('button', {
    class: 'drawer-link',
    type: 'button',
    'aria-expanded': 'false',
    'aria-controls': id,
    'data-drawer-open-sub': '',
  }, label, icon('dropdown'));
}

function drawerPromo(panel) {
  if (!panel.promo.length) return null;
  const box = el('div', { class: 'drawer-featured' });
  panel.promo.forEach(({ role, node }) => {
    if (role === 'cta') {
      const cta = clone(linkOf(node));
      cta.className = 'btn btn-lime';
      box.append(cta);
    } else {
      box.append(el('div', { class: `drawer-featured-${role}` }, node.textContent));
    }
  });
  return box;
}

function drawerPanelBody(panel, uid) {
  const body = [];
  const items = panel.list ? [...panel.list.querySelectorAll(':scope > li')] : [];
  items.forEach((li) => {
    const a = linkOf(li);
    if (!a) return;
    const group = panel.groups.find((g) => g.title.textContent === a.textContent);
    if (group) {
      const id = `drawer-sub-${uid()}`;
      const links = [...group.list.querySelectorAll('a[href]')];
      const leaves = links.map((l, i) => drawerLink(
        l,
        i === links.length - 1 ? 'drawer-link-all' : 'drawer-link-leaf',
      ));
      body.push(el(
        'div',
        { class: 'drawer-item' },
        subOpener(a.textContent, id),
        subPanel(id, 2, a.textContent, ...leaves),
      ));
    } else {
      const leaf = drawerLink(a, 'drawer-link-leaf');
      const pic = li.querySelector('picture, img');
      if (pic && !leaf.querySelector('picture, img')) leaf.prepend(clone(pic));
      body.push(leaf);
    }
  });
  if (panel.cta) body.push(drawerLink(linkOf(panel.cta), 'drawer-link-all'));
  if (panel.picture) {
    const href = panel.caption ? linkOf(panel.caption).getAttribute('href') : '#';
    const promo = el('a', { class: 'drawer-promo', href });
    const img = panel.picture.querySelector('picture, img');
    if (img) promo.append(clone(img));
    if (panel.caption) {
      promo.append(el('div', { class: 'drawer-promo-title' }, panel.caption.textContent));
    }
    body.push(promo);
  }
  const featured = drawerPromo(panel);
  if (featured) body.push(featured);
  return body;
}

function buildDrawer({
  navList, panels, ctaP, searchP, socialList,
}) {
  let n = 0;
  const uid = () => {
    n += 1;
    return n;
  };
  const root = el('div', { class: 'drawer-body' });
  let panelIndex = 0;
  (navList ? [...navList.querySelectorAll(':scope > li')] : []).forEach((li) => {
    const a = linkOf(li);
    if (a) {
      root.append(drawerLink(a));
      return;
    }
    const panel = panels[panelIndex];
    panelIndex += 1;
    const label = li.textContent;
    const id = `drawer-sub-${uid()}`;
    root.append(el(
      'div',
      { class: 'drawer-item' },
      subOpener(label, id),
      subPanel(id, 1, label, ...(panel ? drawerPanelBody(panel, uid) : [])),
    ));
  });
  root.append(el('div', { class: 'drawer-separator', role: 'presentation' }));
  const searchLink = linkOf(searchP);
  const form = el(
    'form',
    { class: 'drawer-search', action: searchLink ? searchLink.getAttribute('href') : '/search' },
    el('input', {
      class: 'drawer-search-input',
      type: 'search',
      name: 'q',
      placeholder: searchP ? searchP.textContent : '',
      'aria-label': searchP ? searchP.textContent : 'Search',
    }),
    el(
      'button',
      { class: 'drawer-search-btn', type: 'submit' },
      icon('search'),
      el('span', { class: 'visually-hidden' }, 'Search'),
    ),
  );
  form.setAttribute('method', 'get');
  form.setAttribute('role', 'search');
  root.append(form);
  if (socialList) {
    const socials = el('div', { class: 'drawer-socials' });
    socialList.querySelectorAll('a[href]').forEach((a) => {
      const name = socialName(a.href);
      socials.append(el('a', {
        href: a.getAttribute('href'), 'aria-label': a.textContent,
      }, name ? icon(name) : a.textContent));
    });
    root.append(socials);
  }
  const head = el('div', { class: 'drawer-head' });
  if (ctaP) {
    const cta = clone(linkOf(ctaP));
    cta.className = 'btn btn-lime';
    head.append(cta);
  }
  head.append(closeButton('Drawer Close Button'));
  const drawer = el(
    'div',
    { class: 'drawer', id: 'site-drawer' },
    el('div', { class: 'drawer-panel drawer-panel-root', 'data-depth': 0 }, head, root),
  );
  return [el('div', { class: 'drawer-overlay', 'data-drawer-close': '' }), drawer];
}

/* ---------- desktop mega panels (authored nodes moved into the template) */

function buildPromo(panel) {
  if (!panel.promo.length) return null;
  const box = el('div', { class: 'mega-promo' });
  panel.promo.forEach(({ role, node }) => box.append(slot(`mega-promo-${role}`, node)));
  return box;
}

function decorateViewAll(list) {
  const last = list && list.querySelector(':scope > li:last-child');
  if (last) last.classList.add('is-view-all');
}

function buildPanel(panel, id) {
  const inner = el('div', { class: 'mega-inner container' });
  const box = el('div', {
    class: `mega-panel mega-panel-${panel.kind}`, id, 'data-mega-panel': '',
  }, inner);
  box.hidden = true;
  if (panel.kind === 'nested') {
    const groups = el('div', { class: 'mega-groups' });
    if (panel.title) groups.append(slot('mega-eyebrow', panel.title));
    if (panel.list) groups.append(slot('mega-group-list', panel.list));
    if (panel.cta) groups.append(slot('mega-cta', panel.cta));
    const children = el('div', { class: 'mega-children' });
    const items = panel.list ? [...panel.list.querySelectorAll(':scope > li')] : [];
    items.forEach((li) => {
      const a = linkOf(li);
      const gi = panel.groups.findIndex((g) => a && g.title.textContent === a.textContent);
      if (gi < 0) return;
      li.dataset.megaGroup = gi;
      a.append(icon('menu-dropdown'));
      const g = panel.groups[gi];
      decorateViewAll(g.list);
      g.list.querySelectorAll('li:not(.is-view-all) a').forEach((l) => {
        l.append(icon('menu-dropdown'));
      });
      children.append(el(
        'div',
        { class: 'mega-child', 'data-mega-child': gi },
        slot('mega-child-title', g.title),
        slot('mega-child-links', g.list),
      ));
    });
    const firstGroup = panel.list && panel.list.querySelector('[data-mega-group]');
    if (firstGroup) firstGroup.classList.add('is-active');
    if (children.firstElementChild) children.firstElementChild.classList.add('is-active');
    inner.append(groups, children);
  } else {
    const flat = el('div', { class: 'mega-flat' });
    if (panel.title) flat.append(slot('mega-title', panel.title));
    if (panel.list) {
      const cls = panel.icons ? 'mega-flat-list mega-flat-list-icons' : 'mega-flat-list';
      flat.append(slot(cls, panel.list));
    }
    if (panel.cta) flat.append(slot('mega-cta', panel.cta));
    inner.append(flat);
    if (panel.picture) {
      const link = panel.caption && linkOf(panel.caption);
      const href = link ? link.getAttribute('href') : '#';
      const feature = el('a', { class: 'mega-feature', href });
      feature.append(panel.picture);
      if (panel.caption) {
        feature.append(panel.caption);
        link.replaceWith(...link.childNodes);
      }
      inner.append(feature);
    }
  }
  const promo = buildPromo(panel);
  if (promo) inner.append(promo);
  panel.rest.forEach((n) => inner.append(n));
  return box;
}

/* ---------- behaviour (canon.js, re-implemented per block instance) */

function bindMega(nav, mega, signal) {
  const triggers = [...nav.querySelectorAll('[data-mega-trigger]')];
  const panelOf = (t) => mega.querySelector(`#${t.getAttribute('aria-controls')}`);
  const closeAll = () => triggers.forEach((t) => {
    t.setAttribute('aria-expanded', 'false');
    const p = panelOf(t);
    if (p) p.hidden = true;
  });
  const open = (t) => {
    closeAll();
    t.setAttribute('aria-expanded', 'true');
    const p = panelOf(t);
    if (p) p.hidden = false;
  };
  triggers.forEach((t) => t.addEventListener('click', () => {
    if (t.getAttribute('aria-expanded') === 'true') closeAll();
    else open(t);
  }));
  mega.querySelectorAll('[data-mega-group]').forEach((g) => {
    const activate = () => {
      const panel = g.closest('[data-mega-panel]');
      panel.querySelectorAll('[data-mega-group]').forEach((x) => {
        x.classList.toggle('is-active', x === g);
      });
      panel.querySelectorAll('[data-mega-child]').forEach((c) => {
        c.classList.toggle('is-active', c.dataset.megaChild === g.dataset.megaGroup);
      });
    };
    g.addEventListener('mouseenter', activate);
    g.addEventListener('focusin', activate);
  });
  document.addEventListener('click', (e) => {
    if (!e.target.closest('[data-mega-trigger], .mega')) closeAll();
  }, { signal });
  return closeAll;
}

function bindSearch(search) {
  const input = search.querySelector('input');
  search.querySelector('button').addEventListener('click', (e) => {
    if (!search.classList.contains('is-open') || !input.value) {
      e.preventDefault();
      search.classList.toggle('is-open');
      if (search.classList.contains('is-open')) input.focus();
    }
  });
}

function bindDrawer(toggle, overlay, drawer, signal) {
  const close = () => {
    if (!drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('has-modal');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.querySelectorAll('.drawer-panel-sub').forEach((p) => p.classList.remove('is-open'));
    drawer.querySelectorAll('[data-drawer-open-sub]').forEach((b) => {
      b.setAttribute('aria-expanded', 'false');
    });
  };
  toggle.addEventListener('click', () => {
    drawer.classList.add('is-open');
    document.body.classList.add('has-modal');
    toggle.setAttribute('aria-expanded', 'true');
  });
  overlay.addEventListener('click', close);
  drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-drawer-close]')) {
      close();
      return;
    }
    const opener = e.target.closest('[data-drawer-open-sub]');
    if (opener) {
      opener.setAttribute('aria-expanded', 'true');
      drawer.querySelector(`#${opener.getAttribute('aria-controls')}`).classList.add('is-open');
      return;
    }
    const back = e.target.closest('[data-drawer-back]');
    if (back) {
      const panel = back.closest('.drawer-panel-sub');
      panel.classList.remove('is-open');
      const opener2 = drawer.querySelector(`[aria-controls="${panel.id}"]`);
      if (opener2) opener2.setAttribute('aria-expanded', 'false');
    }
  });
  DESKTOP.addEventListener('change', (e) => {
    if (e.matches) close();
  }, { signal });
  return close;
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);
  if (!fragment) return;

  if (docController) docController.abort();
  docController = new AbortController();
  const { signal } = docController;

  const [announceW, brandW, navW, toolsW, ...panelWs] = sectionWrappers(fragment);
  const navList = navW && navW.querySelector('ul');
  const tools = toolsW ? [...toolsW.children] : [];
  const ctaP = tools.find((p) => p.tagName === 'P' && p.querySelector('strong a, a.button'));
  const searchP = tools.find((p) => p.tagName === 'P' && p !== ctaP && linkOf(p));
  const socialList = tools.find((n) => n.tagName === 'UL');
  const panels = panelWs.map(parsePanel);

  // drawer first: it clones the authored nodes before the desktop chrome decorates them
  const [overlay, drawer] = buildDrawer({
    navList, panels, ctaP, searchP, socialList,
  });

  const announce = buildAnnounce(announceW);

  const logo = slot('site-header-logo', ...(brandW ? brandW.children : []));

  const nav = el('nav', { class: 'site-header-nav', 'aria-label': 'Main' });
  const mega = el('div', { class: 'mega' });
  if (navList) {
    let panelIndex = 0;
    navList.querySelectorAll(':scope > li').forEach((li) => {
      if (linkOf(li)) return;
      const panel = panels[panelIndex];
      const id = `mega-${panelIndex + 1}`;
      panelIndex += 1;
      const trigger = el('button', {
        class: 'site-header-link',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': id,
        'data-mega-trigger': '',
      });
      trigger.append(...li.childNodes, icon('menu-dropdown'));
      li.append(trigger);
      if (panel) mega.append(buildPanel(panel, id));
    });
    nav.append(navList);
  }
  const searchLink = linkOf(searchP);
  const search = el(
    'form',
    {
      class: 'site-search',
      action: searchLink ? searchLink.getAttribute('href') : '/search',
      method: 'get',
      role: 'search',
    },
    el('input', {
      class: 'site-search-input',
      type: 'search',
      name: 'q',
      placeholder: searchP ? searchP.textContent : '',
      'aria-label': searchP ? searchP.textContent : 'Search',
    }),
    el(
      'button',
      { class: 'site-search-btn', type: 'submit' },
      icon('search'),
      el('span', { class: 'visually-hidden' }, 'Search'),
    ),
  );
  if (searchP) searchP.remove();
  nav.append(search);
  if (ctaP) nav.append(slot('site-header-cta', ctaP));
  if (socialList) nav.append(slot('site-header-socials', socialList));
  tools.filter((n) => ![ctaP, searchP, socialList].includes(n))
    .forEach((n) => nav.append(n));

  const burger = el('button', {
    class: 'site-header-burger',
    type: 'button',
    'aria-label': 'Drawer Open Button',
    'aria-expanded': 'false',
    'aria-controls': 'site-drawer',
  }, icon('hamburger'));
  const mobile = el('div', { class: 'site-header-mobile' }, burger, overlay, drawer);

  const bar = el(
    'div',
    { class: 'site-header-bar' },
    el('div', { class: 'container' }, el('div', { class: 'site-header' }, logo, nav, mobile)),
    mega,
  );
  const chrome = el('div', { class: 'site-chrome', id: 'nav' }, announce, bar);
  block.replaceChildren(chrome);

  const closeMega = bindMega(nav, mega, signal);
  bindSearch(search);
  const closeDrawer = bindDrawer(burger, overlay, drawer, signal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeMega();
      closeDrawer();
    }
  }, { signal });
  startTicker(announce, signal);
}
