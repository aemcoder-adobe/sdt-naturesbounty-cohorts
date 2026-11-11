/**
 * content-products — the home page's "It's In Your Nature To …" highlight carousel: one
 * content-highlight panel per slide (side photo, product shot, subtitle, title, line, CTA),
 * single view, arrows (desktop; prev disabled on the first slide, no loop) and dots (mobile).
 * Capture state restored at delivery: the first slide's entrance
 * (y −20% → 0, opacity 0 → 1,
 * 1 s, 0.2 s stagger) once the section top passes centre + 300 px; skipped under reduced motion.
 *
 * Authoring: one row per slide, four cells —
 *   1 <picture> side photo | 2 <picture> product shot | 3 product height word |
 *   4 <h3> subtitle, <h2> title (<strong> = lime accent), <p> line,
 *     <p><strong><a> CTA</a></strong>
 * @variants cell 3: short | medium | tall (default medium) — the product shot's height cap at
 *   ≥ 1280 px (397 / 498 / 525 px; the live per-slide caps 396–537 px normalised to three
 *   words)
 * @ew-exempt metadata — the height word (cell 3) is never displayed
 */

const WORDS = ['short', 'medium', 'tall'];
const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW = '<circle cx="24" cy="24" r="18" stroke="currentColor" stroke-width="2"></circle>'
  + '<path d="M22 15L13.4142 23.5858" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round"></path><line x1="13.4142" y1="23.5858" x2="22" y2="32.1716"'
  + ' stroke="currentColor" stroke-width="2" stroke-linecap="round"></line><line x1="14"'
  + ' y1="23.5858" x2="35" y2="23.5858" stroke="currentColor" stroke-width="2"'
  + ' stroke-linecap="round"></line>';

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function arrow(className, label) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = className;
  b.setAttribute('aria-label', label);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');
  svg.setAttribute('width', '48');
  svg.setAttribute('height', '48');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = ARROW;
  b.append(svg);
  return b;
}

// Presentational clones must not keep the editor's indices (EW4).
function stripInstrumentation(el) {
  el.querySelectorAll('[data-prose-index], [data-image-index]').forEach((n) => {
    n.removeAttribute('data-prose-index');
    n.removeAttribute('data-image-index');
  });
  el.removeAttribute('data-prose-index');
  el.removeAttribute('data-image-index');
  return el;
}

const pic = (cell) => (cell ? cell.querySelector('picture') || cell.querySelector('img') : null);

function buildPanel(row) {
  const cells = [...row.children];
  const imageCells = cells.filter((c) => pic(c));
  const copyCell = cells.find((c) => !pic(c) && c.querySelector('h1, h2, h3, h4, h5, h6, a'))
    || cells[cells.length - 1];
  const wordCell = cells.find((c) => c !== copyCell && !pic(c)
    && WORDS.includes(c.textContent.trim().toLowerCase()));
  const word = wordCell ? wordCell.textContent.trim().toLowerCase() : 'medium';
  const side = pic(imageCells[0]);
  const product = imageCells.length > 1 ? pic(imageCells[1]) : null;

  const headings = copyCell ? [...copyCell.querySelectorAll('h1, h2, h3, h4, h5, h6')] : [];
  const subtitle = headings.length > 1 ? headings[0] : null;
  const title = headings.length > 1 ? headings[1] : headings[0];
  const paras = copyCell ? [...copyCell.querySelectorAll('p')]
    .filter((p) => !p.querySelector('picture, img')) : [];
  const ctas = paras.filter((p) => {
    const a = p.querySelector('a[href]');
    return a && p.textContent.trim() === a.textContent.trim();
  });
  const text = paras.filter((p) => !ctas.includes(p));

  const content = div('content-highlight-content');
  if (subtitle) content.append(div('content-highlight-subtitle', subtitle));
  if (title) content.append(div('content-highlight-title', title));
  if (product) {
    const clone = stripInstrumentation(product.cloneNode(true));
    clone.querySelectorAll('img').forEach((i) => i.setAttribute('alt', ''));
    if (clone.matches('img')) clone.setAttribute('alt', '');
    const cta = div('content-highlight-cta-image', clone);
    cta.setAttribute('aria-hidden', 'true');
    content.append(cta);
  }
  if (text.length) content.append(div('content-highlight-text', ...text));
  if (ctas.length) content.append(div('content-highlight-actions', ...ctas));

  const panel = div(`content-highlight content-highlight-${word}`);
  panel.append(div('content-highlight-image', ...(side ? [side] : [])));
  if (product) panel.append(div('image-highlight', product));
  panel.append(content);
  return panel;
}

function slider(block, track, prev, next, dots) {
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
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    dots.forEach((d, i) => {
      d.classList.toggle('is-active', i === index);
      if (i === index) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
    });
  };
  const go = (i) => {
    index = Math.max(0, Math.min(slides.length - 1, i));
    render();
  };
  prev.addEventListener('click', () => go(index - 1));
  next.addEventListener('click', () => go(index + 1));
  dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
  block.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') go(index - 1);
    if (e.key === 'ArrowRight') go(index + 1);
  });
  render();
}

// live: GSAP ScrollTrigger entrance on the first slide's descendants and the dots
function entrance(block) {
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  const items = [...block.querySelectorAll(
    '.content-products-slide:first-child *, .content-products-dots *',
  )];
  items.forEach((el, i) => el.style.setProperty('--enter-i', i));
  block.classList.add('cp-enter');
  const check = () => {
    if (block.getBoundingClientRect().top <= window.innerHeight / 2 + 300) {
      block.classList.add('is-in');
      window.removeEventListener('scroll', check);
    }
  };
  window.addEventListener('scroll', check, { passive: true });
  check();
}

export default function decorate(block) {
  if (block.querySelector(':scope > .content-products-viewport')) return; // EW9 re-entrant

  const rows = [...block.children].filter((r) => pic(r) || r.textContent.trim());
  const track = div('content-products-track');
  rows.forEach((row, i) => {
    const slide = div('content-products-slide', buildPanel(row));
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    slide.setAttribute('aria-label', `${i + 1} / ${rows.length}`);
    track.append(slide);
  });
  const dots = rows.map((r, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'content-products-dot';
    d.setAttribute('aria-label', `Go to slide ${i + 1}`);
    return d;
  });
  const prev = arrow('content-products-arrow content-products-arrow-prev', 'Previous slide');
  const next = arrow('content-products-arrow content-products-arrow-next', 'Next slide');

  block.setAttribute('aria-roledescription', 'carousel');
  block.replaceChildren(
    div('content-products-viewport', track),
    div('content-products-dots', ...dots),
    div('content-products-arrows', prev, next),
  );
  slider(block, track, prev, next, dots);
  entrance(block);
}
