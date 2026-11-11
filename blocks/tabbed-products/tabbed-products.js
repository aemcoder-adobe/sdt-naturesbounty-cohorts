/**
 * tabbed-products — "Shop Our Most Loved Products" (home): collection pills over ONE
 * snap-scrolling product strip; a pill jumps to its collection's first card, arrows step
 * 3 (desktop) / 1 (mobile) cards and wrap, the active pill follows the scroll position.
 *
 * Authoring: the title (<h2>) and line (<p>) are DEFAULT CONTENT before the block —
 * reabsorbed into the block head (EW8). Rows, in order:
 *   pill row     (empty) | <p> collection label (no image, no link) — starts a collection
 *   product row  <picture> | <h3> title, <p> servings, <p> rating ("4.5"), <p> review count
 *                ("(19)", hidden like the source), <p> description,
 *                <p><strong><a href=product>View Product</a></strong></p> (card-as-link, EW6)
 *   action row   (empty) | <p><a href="/collections/all">Shop All Products</a></p>
 * The pills are clickable wrappers around the authored <p> (EW7: never a <button> host);
 * star rows and arrow buttons are presentational (no text).
 */

const RATING = /^\d(\.\d+)?$/;
const COUNT = /^\(\s*[\d,]+\s*\)$/;
const SVG_NS = 'http://www.w3.org/2000/svg';
const STAR_PATH = 'M24.8676481,9.0008973 C24.7082329,8.54565507 24.2825324,8.23189792'
  + ' 23.7931772,8.20897226 L16.1009423,8.20897226 L13.658963,0.793674161'
  + ' C13.4850788,0.296529881 12.9965414,-0.0267985214 12.4623931,0.00174912135'
  + ' L12.4623931,0.00174912135 C11.9394964,-0.00194214302 11.4747239,0.328465149'
  + ' 11.3146628,0.81767189 L8.87268352,8.23296999 L1.20486846,8.23296999'
  + ' C0.689809989,8.22949161 0.230279943,8.55030885 0.0640800798,9.0294023'
  + ' C-0.102119784,9.50849575 0.0623083246,10.0383495 0.472274662,10.3447701'
  + ' L6.69932193,14.9763317 L4.25734261,22.4396253 C4.08483744,22.9295881'
  + ' 4.25922828,23.4727606 4.68662933,23.7767181 C5.11403038,24.0806756'
  + ' 5.69357086,24.0736812 6.11324689,23.7595003 L12.6333317,18.9599546'
  + ' L19.1778362,23.7595003 C19.381674,23.9119158 19.6299003,23.9960316'
  + ' 19.8860103,23.9994776 C20.2758842,24.0048539 20.6439728,23.8232161'
  + ' 20.8724402,23.5127115 C21.1009077,23.202207 21.1610972,22.8017824'
  + ' 21.0337405,22.4396253 L18.5917612,14.9763317 L24.6967095,10.3207724'
  + ' C25.0258477,9.95783882 25.0937839,9.43328063 24.8676481,9.0008973 Z';
const ARROWS = {
  prev: ['0 0 31 31', 31, '<path d="M20 24.1396L11 15.1396L20 6.13965" stroke="white"'
    + ' stroke-width="4.5"></path>'],
  next: ['0 0 31 31', 31, '<path d="M11 6.14014L20 15.1401L11 24.1401" stroke="white"'
    + ' stroke-width="4.5"></path>'],
  mprev: ['0 0 49 49', 49, '<path d="M36.4837 25.8315L15.8455 25.8315L15.8455 23.1689L36.4837'
    + ' 23.1689L36.4837 25.8315Z" fill="#27463A"></path><path d="M21.5698 15.5782L23.4348'
    + ' 17.4432L16.3769 24.4998L23.4348 31.5564L21.5698 33.4214L12.6495 24.4998L21.5698'
    + ' 15.5782Z" fill="#27463A"></path><path d="M0.999998 24.5C0.999999 11.5213 11.5213 1'
    + ' 24.5 1C37.4787 1 48 11.5213 48 24.5C48 37.4787 37.4787 48 24.5 48C11.5213 48 0.999997'
    + ' 37.4787 0.999998 24.5Z" stroke="#27463A" stroke-width="2"></path>'],
  mnext: ['0 0 49 49', 49, '<path d="M12.6103 23.1787H33.0866V25.8204H12.6103V23.1787Z"'
    + ' fill="#27463A"></path><path d="M27.4071 33.3517L25.5568 31.5013L32.5594 24.5001L25.5568'
    + ' 17.4988L27.4071 15.6484L36.2575 24.5001L27.4071 33.3517Z" fill="#27463A"></path>'
    + '<circle cx="24.5" cy="24.5" r="23.5" stroke="#27463A" stroke-width="2"></circle>'],
};

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function arrowButton(kind, className, step, label) {
  const [box, size, body] = ARROWS[kind];
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  const [key, value] = step;
  b.dataset[key] = value;
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', box);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = body;
  b.append(svg);
  return b;
}

function nodesOf(row) {
  const out = [];
  [...row.children].forEach((cell) => {
    let kids = [...cell.children];
    if (!kids.length && cell.textContent.trim()) {
      // HARNESS-ONLY fallback: DA content always wraps cell text in a <p>
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      kids = [p];
    }
    out.push(...kids);
  });
  return out;
}

function buildCard(nodes) {
  const media = div('product-card-media');
  const title = div('product-card-title');
  const servings = div('product-card-servings');
  const desc = div('product-card-desc');
  const foot = div('product-card-foot');
  const avg = div('rating-avg');
  const count = div('rating-count');
  let href = '';

  nodes.forEach((n) => {
    const text = n.textContent.trim();
    const pic = n.matches('picture, img') ? n : n.querySelector('picture, img');
    const link = n.matches('a') ? n : n.querySelector('a[href]');
    if (pic && !text) media.append(pic);
    else if (/^H[1-6]$/.test(n.tagName)) title.append(n);
    else if (link && !foot.children.length && text === link.textContent.trim()) {
      href = href || link.getAttribute('href');
      foot.append(n);
    } else if (RATING.test(text) && !avg.children.length) avg.append(n);
    else if (COUNT.test(text) && !count.children.length) count.append(n);
    else if (!servings.children.length && !desc.children.length) servings.append(n);
    else desc.append(n);
  });
  if (!href) {
    const any = title.querySelector('a[href]');
    if (any) href = any.getAttribute('href');
  }
  // EW6: card-as-link — unwrap authored anchors inside the card link (href already read)
  [foot, title].forEach((part) => part.querySelectorAll('a').forEach((a) => {
    a.replaceWith(...a.childNodes);
  }));

  const body = div('product-card-body', media, title);
  if (servings.children.length) body.append(servings);
  if (avg.children.length || count.children.length) {
    const stars = div('rating-stars');
    stars.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 5; i += 1) {
      const star = document.createElementNS(SVG_NS, 'svg');
      star.setAttribute('class', 'rating-star');
      star.setAttribute('viewBox', '0 0 25 25');
      star.setAttribute('width', '20');
      star.setAttribute('height', '20');
      star.setAttribute('focusable', 'false');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', STAR_PATH);
      star.append(path);
      stars.append(star);
    }
    body.append(div('rating', stars, avg, count));
  }
  if (desc.children.length) body.append(desc);

  const inner = document.createElement(href ? 'a' : 'div');
  inner.className = 'product-card-inner';
  if (href) inner.href = href;
  inner.append(body);
  if (foot.children.length) inner.append(foot);
  return div('product-card', inner);
}

function reabsorbHead(block) {
  const wrapper = block.parentElement && block.parentElement.previousElementSibling;
  if (!wrapper || !wrapper.classList.contains('default-content-wrapper')) return [];
  const nodes = [...wrapper.children];
  wrapper.remove();
  return nodes;
}

function wire(root, track, slides, pills) {
  const current = () => {
    const x = track.scrollLeft;
    let i = 0;
    while (i < slides.length && slides[i].offsetLeft - track.offsetLeft < x - 1) i += 1;
    return Math.min(i, slides.length - 1);
  };
  const setActive = (collection) => pills.forEach((p) => {
    const on = p.dataset.collection === collection;
    p.classList.toggle('is-active', on);
    p.setAttribute('aria-pressed', String(on));
  });
  const go = (i) => {
    track.scrollLeft = slides[i].offsetLeft - track.offsetLeft;
    setActive(slides[i].dataset.collection);
  };
  pills.forEach((p) => {
    const jump = () => {
      const i = slides.findIndex((s) => s.dataset.collection === p.dataset.collection);
      if (i >= 0) go(i);
    };
    p.addEventListener('click', jump);
    p.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        jump();
      }
    });
  });
  root.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => {
    const step = parseInt(b.dataset.prev, 10) || 1;
    const c = current();
    go(c === 0 ? Math.max(slides.length - step, 0) : Math.max(c - step, 0));
  }));
  root.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
    const step = parseInt(b.dataset.next, 10) || 1;
    const c = current();
    go(c + step >= slides.length ? 0 : c + step);
  }));
  track.addEventListener('scrollend', () => {
    if (slides.length) setActive(slides[current()].dataset.collection);
  });
}

export default function decorate(block) {
  if (block.querySelector(':scope > .tabbed-products-inner')) return; // EW9 re-entrant

  const head = reabsorbHead(block);
  const pills = [];
  const slides = [];
  const actions = [];
  let collection = -1;
  [...block.children].forEach((row) => {
    const nodes = nodesOf(row);
    if (!nodes.length) return;
    const hasImage = nodes.some((n) => n.matches('picture, img')
      || n.querySelector('picture, img'));
    const hasLink = nodes.some((n) => n.matches('a') || n.querySelector('a[href]'));
    if (hasImage) {
      if (collection < 0) collection = 0;
      const slide = div('tabbed-products-slide', buildCard(nodes));
      slide.dataset.collection = String(collection);
      slides.push(slide);
    } else if (hasLink) actions.push(...nodes);
    else {
      collection = pills.length;
      const pill = div('tabbed-products-pill', ...nodes);
      pill.dataset.collection = String(collection);
      pill.setAttribute('role', 'button');
      pill.setAttribute('tabindex', '0');
      pill.setAttribute('aria-pressed', 'false');
      pills.push(pill);
    }
  });
  if (pills.length) {
    pills[0].classList.add('is-active');
    pills[0].setAttribute('aria-pressed', 'true');
  }

  const inner = div('tabbed-products-inner container');
  const headings = head.filter((n) => /^H[1-6]$/.test(n.tagName));
  const lines = head.filter((n) => !headings.includes(n));
  if (headings.length) inner.append(div('tabbed-products-title section-title', ...headings));
  if (lines.length) inner.append(div('tabbed-products-text', ...lines));
  if (pills.length) {
    const group = div('tabbed-products-pills', ...pills);
    group.setAttribute('role', 'group');
    inner.append(group);
  }
  const track = div('tabbed-products-track', ...slides);
  const nav = 'tabbed-products-nav tabbed-products-nav';
  inner.append(div(
    'tabbed-products-slider',
    arrowButton('prev', `${nav}-prev`, ['prev', 3], 'Previous slide'),
    track,
    arrowButton('next', `${nav}-next`, ['next', 3], 'Next slide'),
  ));
  inner.append(div(
    'tabbed-products-mobile-nav',
    arrowButton('mprev', 'tabbed-products-mobile-btn', ['prev', 1], 'Previous slide'),
    arrowButton('mnext', 'tabbed-products-mobile-btn', ['next', 1], 'Next slide'),
  ));
  if (actions.length) inner.append(div('tabbed-products-actions', ...actions));
  block.replaceChildren(inner);
  wire(block, track, slides, pills);
}
