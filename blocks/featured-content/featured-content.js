/**
 * featured-content — "It's In Your Nature to Explore" (home): a lead panel (bar, title, text,
 * arrow links) beside a mint column of article cards (title, text, READ MORE, image).
 *
 * Authoring: rows —
 *   lead row     (empty) | <h2> title (<em> accent), <p> text…, then one <p><a> link</a></p> each
 *   article row  <picture> | <h3> title, <p> text, <p><a href=article>READ MORE &gt;</a></p>
 * The bar and the link arrows are presentational (no text, aria-hidden).
 */

const SVG_NS = 'http://www.w3.org/2000/svg';
const ARROW = '<path fill-rule="evenodd" clip-rule="evenodd" d="M8.537.808a.5.5 0 01.817-.162l4'
  + ' 4a.5.5 0 010 .708l-4 4a.5.5 0 11-.708-.708L11.793 5.5H1a.5.5 0 010-1h10.793L8.646'
  + ' 1.354a.5.5 0 01-.109-.546z" fill="currentColor"></path>';

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function arrowIcon() {
  const s = document.createElementNS(SVG_NS, 'svg');
  s.setAttribute('viewBox', '0 0 14 10');
  s.setAttribute('fill', 'none');
  s.setAttribute('aria-hidden', 'true');
  s.setAttribute('focusable', 'false');
  s.setAttribute('class', 'icon-arrow');
  s.innerHTML = ARROW;
  return s;
}

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

const isLinkOnly = (p) => {
  const a = p.querySelector('a[href]');
  return a && p.textContent.trim() === a.textContent.trim();
};

function buildLead(nodes) {
  const heading = nodes.find((n) => /^H[1-6]$/.test(n.tagName));
  const rest = nodes.filter((n) => n !== heading);
  const links = rest.filter(isLinkOnly);
  const text = rest.filter((n) => !links.includes(n));
  links.forEach((p) => p.querySelector('a[href]').append(arrowIcon()));

  const bar = div('featured-content-bar');
  bar.setAttribute('role', 'presentation');
  const inner = div('featured-content-inner', bar);
  if (heading) inner.append(div('featured-content-title section-title', heading));
  if (text.length) inner.append(div('featured-content-text', ...text));
  if (links.length) inner.append(div('featured-content-links', ...links));
  return div('featured-content-left', div('container', inner));
}

function buildItem(media, nodes) {
  const heading = nodes.find((n) => /^H[1-6]$/.test(n.tagName));
  const rest = nodes.filter((n) => n !== heading && !(media && n.contains(media)));
  const links = rest.filter(isLinkOnly);
  const more = links[links.length - 1];
  const text = rest.filter((n) => n !== more);
  const body = div('featured-content-item-body');
  if (heading) body.append(div('featured-content-item-title', heading));
  if (text.length) body.append(div('featured-content-item-text', ...text));
  if (more) body.append(div('featured-content-item-more', more));
  const item = div('featured-content-item', body);
  item.append(div('featured-content-item-media', ...(media ? [media] : [])));
  return item;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .featured-content-right')) return; // EW9 re-entrant

  let lead = null;
  const items = [];
  [...block.children].forEach((row) => {
    const media = row.querySelector('picture') || row.querySelector('img');
    const nodes = [...row.children].flatMap(kids);
    if (!nodes.length) return;
    if (!media && !lead) lead = buildLead(nodes);
    else items.push(buildItem(media, nodes));
  });

  const parts = [];
  if (lead) parts.push(lead);
  const blocks = div('featured-content-blocks', ...items);
  const right = div('featured-content-right', div('container', blocks));
  parts.push(right);
  block.replaceChildren(...parts);
}
