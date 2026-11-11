/**
 * featured-grid — "Experience All That We Offer" category grid (home): one dark content tile
 * (title, line, link) then image tiles that link to their collection.
 *
 * Authoring: the section title is DEFAULT CONTENT (an <h2>) before the block — reabsorbed into
 * the block's title slot (EW8). One row per tile, two cells:
 *   content tile: (empty) | <h3> title, <p> description, <p><a> link</a></p>
 *   image tile:   <picture> | <p><a href="/collections/…">label</a></p> (card-as-link, EW6)
 */

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function cellNodes(cell) {
  if (!cell) return [];
  const kids = [...cell.children];
  if (!kids.length && cell.textContent.trim()) {
    // HARNESS-ONLY fallback: DA content always wraps cell text in a <p>
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    return [p];
  }
  return kids;
}

function reabsorbHead(block) {
  const wrapper = block.parentElement && block.parentElement.previousElementSibling;
  if (!wrapper || !wrapper.classList.contains('default-content-wrapper')) return [];
  const nodes = [...wrapper.children];
  wrapper.remove();
  return nodes;
}

function contentTile(nodes) {
  const title = div('featured-grid-item-title');
  const desc = div('featured-grid-item-desc');
  const foot = div('featured-grid-foot');
  nodes.forEach((n) => {
    if (/^H[1-6]$/.test(n.tagName) && !title.children.length) title.append(n);
    else if (n.querySelector('a[href]') && n.textContent.trim()
      === n.querySelector('a[href]').textContent.trim()) foot.append(n);
    else desc.append(n);
  });
  const body = div('featured-grid-body', title);
  if (desc.children.length) body.append(desc);
  const item = div('featured-grid-item featured-grid-item-content', body);
  if (foot.children.length) item.append(foot);
  return item;
}

function imageTile(media, nodes) {
  const label = div('featured-grid-label', ...nodes.filter((n) => !n.contains(media)));
  const link = label.querySelector('a[href]');
  const card = document.createElement(link ? 'a' : 'div');
  card.className = 'featured-grid-link';
  if (link) {
    card.href = link.getAttribute('href');
    card.setAttribute('aria-label', link.textContent.trim());
    link.replaceWith(...link.childNodes); // EW6: card-as-link, the <p> stays editable
  }
  card.append(div('featured-grid-media', media), label);
  return div('featured-grid-item featured-grid-item-image', card);
}

export default function decorate(block) {
  if (block.querySelector(':scope > .featured-grid-inner')) return; // EW9 re-entrant

  const head = reabsorbHead(block);
  const holder = div('featured-grid-holder');
  [...block.children].forEach((row) => {
    const nodes = [...row.children].flatMap(cellNodes);
    if (!nodes.length) return;
    const media = row.querySelector('picture') || row.querySelector('img');
    if (media) {
      const mediaP = media.closest('p');
      const rest = nodes.filter((n) => n !== media && n !== mediaP && !n.contains(media));
      holder.append(imageTile(media, rest));
      if (mediaP && !mediaP.textContent.trim() && mediaP !== media) mediaP.remove();
    } else if (!holder.children.length && !nodes.some((n) => n.querySelector('a[href]'))
      && nodes.every((n) => /^H[1-6]$/.test(n.tagName))) {
      head.push(...nodes); // decode fallback: an in-table title row
    } else holder.append(contentTile(nodes));
  });

  const inner = div('featured-grid-inner container');
  if (head.length) inner.append(div('featured-grid-title section-title', ...head));
  inner.append(holder);
  block.replaceChildren(inner);
}
