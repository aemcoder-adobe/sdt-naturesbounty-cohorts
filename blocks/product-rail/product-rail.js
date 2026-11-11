/**
 * product-rail — "Looking for better …? Try these products!" product cards (article and
 * recipe sidebars). Generic: a leading row without an image is the rail title; every row
 * with an image is one product card (card-as-link, EW6: the CTA anchor is unwrapped after
 * its href is read, the authored <p> survives inside the card link).
 *
 * Card row: cell 1 picture | cell 2 <h3> title, <p> servings, <p> rating ("4.2"),
 *   <p> review count ("(285)", hidden like the source), <p> description,
 *   <p><strong><a href=product>View Product</a></strong></p>.
 * The star row is presentational (no text, aria-hidden).
 */

const RATING = /^\d(\.\d+)?$/;
const COUNT = /^\(\s*[\d,]+\s*\)$/;

function nodesOf(row) {
  const out = [];
  [...row.children].forEach((cell) => {
    let kids = [...cell.children];
    if (kids.length === 1 && kids[0].tagName === 'P' && kids[0].querySelector('picture, img')
      && kids[0].children.length > 1) {
      kids = [...kids[0].children];
    }
    if (!kids.length && cell.textContent.trim()) {
      // HARNESS-ONLY fallback (EW5): DA content always wraps cell text in a <p>
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      kids = [p];
    }
    out.push(...kids);
  });
  return out;
}

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
let starSeq = 0;
const STAR_PATH = 'M24.8676481,9.0008973 C24.7082329,8.54565507 24.2825324,8.23189792 23.7931772,8.20897226 L16.1009423,8.20897226 L13.658963,0.793674161 C13.4850788,0.296529881 12.9965414,-0.0267985214 12.4623931,0.00174912135 L12.4623931,0.00174912135 C11.9394964,-0.00194214302 11.4747239,0.328465149 11.3146628,0.81767189 L8.87268352,8.23296999 L1.20486846,8.23296999 C0.689809989,8.22949161 0.230279943,8.55030885 0.0640800798,9.0294023 C-0.102119784,9.50849575 0.0623083246,10.0383495 0.472274662,10.3447701 L6.69932193,14.9763317 L4.25734261,22.4396253 C4.08483744,22.9295881 4.25922828,23.4727606 4.68662933,23.7767181 C5.11403038,24.0806756 5.69357086,24.0736812 6.11324689,23.7595003 L12.6333317,18.9599546 L19.1778362,23.7595003 C19.381674,23.9119158 19.6299003,23.9960316 19.8860103,23.9994776 C20.2758842,24.0048539 20.6439728,23.8232161 20.8724402,23.5127115 C21.1009077,23.202207 21.1610972,22.8017824 21.0337405,22.4396253 L18.5917612,14.9763317 L24.6967095,10.3207724 C25.0258477,9.95783882 25.0937839,9.43328063 24.8676481,9.0008973 Z';

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
      foot.append(n.matches('a') ? div('product-card-cta', n) : n);
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
  if (avg.children.length) {
    const stars = div('rating-stars');
    stars.setAttribute('aria-hidden', 'true');
    // the source (Bazaarvoice) fills the stars to the average: whole stars on, the next one
    // filled left-to-right by the fraction
    const rating = parseFloat(avg.textContent.trim()) || 0;
    for (let i = 0; i < 5; i += 1) {
      const fill = Math.max(0, Math.min(1, rating - i));
      const star = document.createElementNS(SVG_NS, 'svg');
      star.setAttribute('class', 'rating-star');
      star.setAttribute('viewBox', '0 0 25 25');
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', STAR_PATH);
      if (fill >= 1) star.classList.add('rating-star-on');
      else if (fill > 0) {
        starSeq += 1;
        const id = `rating-star-fill-${starSeq}`;
        const grad = document.createElementNS(SVG_NS, 'linearGradient');
        grad.id = id;
        const pct = `${Math.round(fill * 100)}%`;
        [['var(--star-on)', '0'], ['var(--star-on)', pct], ['var(--star-off)', pct], ['var(--star-off)', '1']]
          .forEach(([color, offset]) => {
            const stop = document.createElementNS(SVG_NS, 'stop');
            stop.setAttribute('offset', offset);
            stop.style.stopColor = color;
            grad.append(stop);
          });
        const defs = document.createElementNS(SVG_NS, 'defs');
        defs.append(grad);
        star.append(defs);
        path.setAttribute('fill', `url(#${id})`);
        path.style.fill = `url(#${id})`;
      }
      star.append(path);
      stars.append(star);
    }
    // the source's rating row is one full-width line (stars + average) — keep the average's
    // line as that row so the stars sit inside it
    const line = avg.querySelector('p') || avg;
    line.prepend(stars);
    body.append(div('rating', avg, count));
  }
  if (desc.children.length) body.append(desc);

  const inner = document.createElement(href ? 'a' : 'div');
  inner.className = 'product-card-inner';
  if (href) inner.href = href;
  inner.append(body);
  if (foot.children.length) inner.append(foot);
  return div('product-card', inner);
}

export default function decorate(block) {
  if (block.querySelector(':scope > .product-rail-grid')) return;

  const head = div('product-rail-title');
  const grid = div('product-rail-grid');
  [...block.children].forEach((row) => {
    const nodes = nodesOf(row);
    const hasImage = nodes.some((n) => n.matches('picture, img')
      || n.querySelector('picture, img'));
    if (!hasImage && !grid.children.length) head.append(...nodes);
    else if (nodes.length) grid.append(buildCard(nodes));
  });

  const parts = [];
  if (head.children.length) parts.push(head);
  parts.push(grid);
  block.replaceChildren(...parts);
}
