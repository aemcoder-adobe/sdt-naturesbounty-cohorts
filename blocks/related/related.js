/**
 * related — "More to explore from …" article cards (article and recipe templates).
 * The section head ("More to explore from Hair") is DEFAULT CONTENT before the block and is
 * styled in place through the section's `.related-container` class (no reabsorption).
 * A leading image-less row is still accepted as an in-table head (decode fallback).
 *
 * Card row: cell 1 picture | cell 2 <ul> of tag links, <h3><a href=article>title</a></h3>,
 *   <p> excerpt (a linked excerpt reads as the "more" line; a plain one joins the title
 *   inside the card link, as on the source).
 * The image is wrapped in a presentational link to the title's href (no text).
 */

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
  const media = div('related-card-media');
  const tags = div('related-card-tags');
  const title = div('related-card-title');
  const rest = [];
  let pic = null;

  nodes.forEach((n) => {
    const p = n.matches('picture, img') ? n : n.querySelector('picture, img');
    if (p && !n.textContent.trim() && !pic) pic = p;
    else if (n.matches('ul, ol') && !title.children.length) tags.append(n);
    else if (/^H[1-6]$/.test(n.tagName) && !title.children.length) title.append(n);
    else rest.push(n);
  });

  const titleLink = title.querySelector('a[href]');
  if (pic) {
    if (titleLink) {
      const a = document.createElement('a');
      a.href = titleLink.getAttribute('href');
      a.tabIndex = -1;
      a.setAttribute('aria-hidden', 'true');
      a.append(pic);
      media.append(a);
    } else media.append(pic);
  }

  const card = div('related-card');
  if (media.children.length) card.append(media);
  if (tags.children.length) {
    // presentational "|" separators (aria-hidden, no words) placed between the tag links
    // with flex `order`; the authored list itself is not touched beyond layout
    const links = [...tags.querySelectorAll('a')];
    links.forEach((a, i) => {
      a.style.order = String(i * 2);
      if (i) {
        const sep = document.createElement('span');
        sep.className = 'related-card-sep';
        sep.setAttribute('aria-hidden', 'true');
        sep.textContent = '|';
        sep.style.order = String(i * 2 - 1);
        tags.append(sep);
      }
    });
    card.append(tags);
  }

  // the title (and a plain excerpt, as on the source) sit inside one card link (EW6:
  // the authored title anchor is unwrapped after its href is read)
  const href = titleLink ? titleLink.getAttribute('href') : '';
  const linkBox = href ? document.createElement('a') : null;
  if (linkBox) {
    linkBox.className = 'related-card-link';
    linkBox.href = href;
    titleLink.replaceWith(...titleLink.childNodes);
  }
  if (title.children.length) (linkBox || card).append(title);
  rest.forEach((n) => {
    const linked = n.matches('p') && n.querySelector('a[href]');
    if (linked) {
      card.append(div('related-card-more', n));
    } else {
      (linkBox || card).append(div('related-card-excerpt', n));
    }
  });
  if (linkBox) {
    const more = card.querySelector(':scope > .related-card-more');
    if (more) more.before(linkBox);
    else card.append(linkBox);
  }
  return card;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .related-grid')) return;

  const head = div('related-title');
  const grid = div('related-grid');
  [...block.children].forEach((row) => {
    const nodes = nodesOf(row);
    const hasImage = nodes.some((n) => n.matches('picture, img')
      || n.querySelector('picture, img'));
    if (!hasImage && !grid.children.length && !nodes.some((n) => n.matches('ul, ol'))) {
      head.append(...nodes);
    } else if (nodes.length) grid.append(buildCard(nodes));
  });

  const parts = [];
  if (head.children.length) parts.push(head);
  parts.push(grid);
  block.replaceChildren(...parts);
}
