/**
 * testimonials — "What our customers say" (home): one quote card per slide (product shot +
 * product link | title, quote, five stars, reviewer, "Read more"), single view, looping arrows.
 * The live Swiper loop clones are presentational and not reproduced.
 *
 * Authoring: the title (<h2>) is DEFAULT CONTENT before the block — reabsorbed (EW8).
 * One row per quote, two cells —
 *   1 <picture>, <p><a href=product> product name</a></p>
 *   2 <h3> quote title, <p> quote (a <strong> run = the disclosure line), <p> reviewer
 *     ("-- name"), <p><a href=product>Read more</a></p>
 * The star row is presentational (no text, aria-hidden).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW = '<circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2"></circle>'
  + '<path d="M22 15L13.4142 23.5858" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round"></path><line x1="13.4142" y1="23.5858" x2="22" y2="32.1716"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="14"'
  + ' y1="23.5858" x2="35" y2="23.5858" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round"></line>';
const STAR = '<path d="m56,237 74-228 74,228L10,96h240"></path>';

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function svg(viewBox, body, attrs = {}) {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', viewBox);
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  Object.entries(attrs).forEach(([k, v]) => s.setAttribute(k, v));
  s.innerHTML = body;
  return s;
}

function arrow(className, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  b.append(svg('0 0 48 48', ARROW, { width: '48', height: '48', fill: 'none' }));
  return b;
}

function reabsorbHead(block) {
  const wrapper = block.parentElement && block.parentElement.previousElementSibling;
  if (!wrapper || !wrapper.classList.contains('default-content-wrapper')) return [];
  const nodes = [...wrapper.children];
  wrapper.remove();
  return nodes;
}

const isLinkOnly = (p) => {
  const a = p.querySelector('a[href]');
  return a && p.textContent.trim() === a.textContent.trim();
};

function kids(cell) {
  if (!cell) return [];
  if (!cell.children.length && cell.textContent.trim()) {
    // HARNESS-ONLY fallback: DA content always wraps cell text in a <p>
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    return [p];
  }
  return [...cell.children];
}

function buildItem(row) {
  const cells = [...row.children];
  const mediaCell = cells.find((c) => c.querySelector('picture, img')) || null;
  const quoteCell = cells.find((c) => c !== mediaCell) || null;

  const media = div('testimonials-media');
  kids(mediaCell).forEach((n) => {
    const pic = n.matches('picture, img') ? n : n.querySelector('picture, img');
    media.append(pic && !n.textContent.trim() ? pic : n);
  });

  const nodes = kids(quoteCell);
  const heading = nodes.find((n) => /^H[1-6]$/.test(n.tagName));
  const rest = nodes.filter((n) => n !== heading);
  const links = rest.filter(isLinkOnly);
  const more = links[links.length - 1];
  const plain = rest.filter((n) => !links.includes(n));
  const reviewer = plain.length > 1 ? plain[plain.length - 1] : null;
  const text = plain.filter((n) => n !== reviewer);

  const quote = div('testimonials-quote');
  if (heading) quote.append(div('testimonials-quote-title', heading));
  if (text.length) quote.append(div('testimonials-quote-text', ...text));
  const stars = div('testimonials-stars');
  stars.setAttribute('aria-hidden', 'true');
  for (let i = 0; i < 5; i += 1) stars.append(svg('0 0 260 245', STAR));
  quote.append(stars);
  if (reviewer) quote.append(div('testimonials-reviewer', reviewer));
  if (more) quote.append(div('testimonials-more', more));
  return div('testimonials-item', media, quote);
}

export default function decorate(block) {
  if (block.querySelector(':scope > .testimonials-holder')) return; // EW9 re-entrant

  const head = reabsorbHead(block);
  const rows = [...block.children].filter((r) => r.textContent.trim() || r.querySelector('img'));
  const track = div('testimonials-track');
  rows.forEach((row, i) => {
    const item = buildItem(row);
    item.setAttribute('role', 'group');
    item.setAttribute('aria-roledescription', 'slide');
    item.setAttribute('aria-label', `${i + 1} / ${rows.length}`);
    track.append(item);
  });
  const prev = arrow('testimonials-arrow testimonials-arrow-prev', 'Previous slide');
  const next = arrow('testimonials-arrow testimonials-arrow-next', 'Next slide');

  const parts = [];
  if (head.length) parts.push(div('testimonials-title section-title', ...head));
  parts.push(div('testimonials-holder', div('testimonials-viewport', track), prev, next));
  block.setAttribute('aria-roledescription', 'carousel');
  block.replaceChildren(...parts);

  const slides = [...track.children];
  let index = 0;
  const render = () => {
    track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
    slides.forEach((s, i) => {
      const on = i === index;
      s.classList.toggle('is-active', on);
      if (on) s.removeAttribute('aria-hidden');
      else s.setAttribute('aria-hidden', 'true');
      s.inert = !on;
    });
  };
  const go = (i) => {
    index = (i + slides.length) % slides.length;
    render();
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });
  if (slides.length) render();
}
