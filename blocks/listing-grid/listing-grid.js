/**
 * listing-grid — article / recipe card grid (component-article-item.css .article-item__grid,
 * canon .related-card). One card per row.
 *
 * Authoring rows (one per card), two cells:
 *   1. the card image
 *   2. optional bulleted list of tag links (before the title), the title as a heading
 *      whose link is the card target, then an optional excerpt paragraph — a plain
 *      paragraph renders under the title inside the card link, a linked paragraph
 *      renders as the "more" line below it.
 * @ew-exempt <span> "|" tag separators — presentational glyphs between authored tag links
 * @variants block: two (2-up wide cards, blog top row) | blog-list (3 cross-blog cards,
 *   recipes page) | default (3-up main grid)
 */

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

function decorateCard(row) {
  const heading = row.querySelector('h1, h2, h3, h4, h5, h6');
  const picture = row.querySelector('picture') || row.querySelector('img');
  const titleLink = heading ? heading.querySelector('a[href]') : null;
  const firstLink = row.querySelector('a[href]');
  const href = (titleLink || firstLink) ? (titleLink || firstLink).getAttribute('href') : null;
  let paras = [...row.querySelectorAll('p')].filter((p) => p.textContent.trim()
    && !p.querySelector('picture, img') && !p.closest('ul, ol'));
  // tags: a list, or (decode fallback) a links-only paragraph authored before the title
  const before = (p) => heading
    && (heading.compareDocumentPosition(p) % 4 === Node.DOCUMENT_POSITION_PRECEDING);
  const tags = row.querySelector('ul, ol') || paras.find((p) => before(p) && p.querySelector('a'));
  paras = paras.filter((p) => p !== tags);

  const card = document.createElement('div');
  card.className = 'listing-card';

  if (picture) {
    const media = document.createElement('div');
    media.className = 'card-media';
    if (href) {
      const a = document.createElement('a');
      a.href = href;
      a.tabIndex = -1;
      a.setAttribute('aria-hidden', 'true');
      a.append(picture);
      media.append(a);
    } else {
      media.append(picture);
    }
    card.append(media);
  }

  if (tags) {
    // separators between tag links, as the live theme renders them (aria-hidden glyph)
    tags.querySelectorAll('li + li').forEach((li) => {
      if (li.querySelector('.card-tag-sep')) return;
      const sep = document.createElement('span');
      sep.className = 'card-tag-sep';
      sep.setAttribute('aria-hidden', 'true');
      sep.textContent = '|';
      li.prepend(sep);
    });
    card.append(wrapNode(tags, 'card-tags'));
  }

  const link = document.createElement(href ? 'a' : 'div');
  link.className = 'card-link';
  if (href) link.href = href;
  if (heading) {
    link.append(wrapNode(heading, 'card-title'));
    // EW6: the card link carries the href; unwrap the authored inner anchor
    if (titleLink && href) titleLink.replaceWith(...titleLink.childNodes);
  }
  const more = [];
  paras.forEach((p) => {
    if (p.querySelector('a')) more.push(p);
    else link.append(wrapNode(p, 'card-excerpt'));
  });
  card.append(link);
  more.forEach((p) => card.append(wrapNode(p, 'card-more')));
  return card;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .listing-card')) return; // EW9 re-entrant
  const cards = [...block.children].map((row) => decorateCard(row));
  block.replaceChildren(...cards);
}
