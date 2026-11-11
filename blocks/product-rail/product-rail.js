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
    for (let i = 0; i < 5; i += 1) {
      const star = document.createElement('span');
      star.className = 'rating-star';
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
