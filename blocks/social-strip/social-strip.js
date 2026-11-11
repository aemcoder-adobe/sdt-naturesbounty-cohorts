/**
 * social-strip — the site-wide "Follow @NaturesBounty" image strip (canon .social-strip;
 * live .instagram): five square tiles, each a link to its product with a hover overlay
 * (title, line, "Shop Now" pill). Reused by every template.
 *
 * Authoring: the strip title is DEFAULT CONTENT (a heading) before the block, in the same
 * section. One row per tile, two cells:
 *   1. the tile image
 *   2. one paragraph: the title in bold, the sub-line as plain text, then the CTA link
 *      ("Shop Now") — its href is the tile target.
 *      e.g. <p><strong>Vitamin C</strong> Support for a Healthy Immune System*
 *           <a href="/products/…">Shop Now</a></p>
 * Decode fallbacks: title / sub-line / CTA as separate paragraphs; a leading row with a
 * heading and no image is the strip title.
 */

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

function span(className, nodes) {
  const s = document.createElement('span');
  s.className = className;
  s.append(...nodes);
  return s;
}

// Inline model: split the ONE authored paragraph into title / sub / button spans in place
// (presentation refinement — the paragraph stays the editable unit).
function splitInline(p, ctaLink) {
  const title = p.querySelector('strong, b');
  const titleNode = title && title.parentElement !== p ? title.parentElement : title;
  const ctaNode = ctaLink ? [...p.childNodes].find((n) => n.contains(ctaLink)) : null;
  const rest = [...p.childNodes].filter((n) => n !== titleNode && n !== ctaNode
    && !(n.nodeType === 1 && n.tagName === 'BR'));
  const parts = [];
  if (titleNode) parts.push(span('social-tile-title', [titleNode]));
  if (rest.some((n) => n.textContent.trim())) parts.push(span('social-tile-sub', rest));
  if (ctaNode) {
    // EW6: the tile carries the href; unwrap the authored anchor
    const label = ctaNode === ctaLink ? [...ctaLink.childNodes] : [ctaNode];
    ctaLink.replaceWith(...ctaLink.childNodes);
    parts.push(span('social-tile-btn', label));
  }
  p.replaceChildren(...parts);
}

function decorateTile(row) {
  const picture = row.querySelector('picture') || row.querySelector('img');
  const ctaLink = [...row.querySelectorAll('a[href]')].pop();
  const prose = [...row.querySelectorAll('h1, h2, h3, h4, h5, h6, p')]
    .filter((el) => el.textContent.trim() && !el.querySelector('picture, img'));

  const tile = document.createElement(ctaLink ? 'a' : 'div');
  tile.className = 'social-tile';
  if (ctaLink) tile.href = ctaLink.getAttribute('href');
  if (picture) tile.append(picture);
  const overlay = document.createElement('div');
  overlay.className = 'social-tile-overlay';

  if (prose.length === 1) {
    splitInline(prose[0], ctaLink);
    overlay.append(prose[0]);
  } else {
    const cta = ctaLink ? prose.find((el) => el.contains(ctaLink)) : null;
    prose.filter((el) => el !== cta).forEach((el, i) => {
      overlay.append(wrapNode(el, i === 0 ? 'social-tile-title' : 'social-tile-sub'));
    });
    if (cta) {
      ctaLink.replaceWith(...ctaLink.childNodes);
      overlay.append(wrapNode(cta, 'social-tile-btn'));
    }
  }
  tile.append(overlay);
  return tile;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .social-strip-grid')) return; // EW9 re-entrant
  const rows = [...block.children];
  const parts = [];
  const first = rows[0];
  const head = first && !first.querySelector('picture, img')
    ? first.querySelector('h1, h2, h3, h4, h5, h6') : null;
  if (head) {
    parts.push(wrapNode(head, 'social-strip-title'));
    rows.shift();
  }
  const grid = document.createElement('div');
  grid.className = 'social-strip-grid';
  rows.forEach((row) => grid.append(decorateTile(row)));
  parts.push(grid);
  block.replaceChildren(...parts);
}
