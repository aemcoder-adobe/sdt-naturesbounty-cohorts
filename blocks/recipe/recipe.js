/**
 * recipe — the recipe lead: hero image, title and recipe copy (nutrition line, ingredient
 * list, directions) laid out as the two-column article-main body. The block ADOPTS the
 * block wrappers that follow it in its own section: a `share` block joins the content
 * column, every other one (product-rail, …) joins the sidebar. Adopted blocks move whole (EW9).
 *
 * Rows (DA): 1 picture | 2 h1 | 3+ recipe body (rich text: p, h2-h4, lists, images).
 * A flattened single-cell shape is tolerated: picture → hero, first heading → title,
 * everything else → body.
 */

function cellNodes(cell) {
  let kids = [...cell.children];
  // the runtime folds a media-led cell into one <p> (wrapTextNodes): expand it back
  if (kids.length === 1 && kids[0].tagName === 'P' && kids[0].querySelector('picture, img')
    && kids[0].children.length > 1) {
    kids = [...kids[0].childNodes].map((n) => {
      if (n.nodeType === 1) return n;
      if (n.textContent.trim()) {
        // HARNESS-ONLY fallback (EW5): DA content never carries bare text here
        const p = document.createElement('p');
        p.append(n);
        return p;
      }
      return null;
    }).filter(Boolean);
  }
  if (!kids.length && cell.textContent.trim()) {
    const p = document.createElement('p');
    p.append(...cell.childNodes);
    kids = [p];
  }
  return kids;
}

function wrap(className, nodes, tag = 'div') {
  const el = document.createElement(tag);
  el.className = className;
  el.append(...nodes);
  return el;
}

const isMedia = (n) => n.matches('picture, img')
  || (n.matches('p') && n.querySelector('picture, img') && !n.textContent.trim());

export default function decorate(block) {
  if (block.querySelector(':scope > .recipe-body')) return;

  const rows = [...block.children].map((row) => [...row.children].flatMap(cellNodes));
  const all = rows.flat();
  const heading = all.find((n) => /^H[1-6]$/.test(n.tagName));
  const headRow = rows.findIndex((r) => r.includes(heading));

  let media = null;
  const body = [];
  rows.forEach((nodes, r) => {
    nodes.forEach((n) => {
      if (n === heading) return;
      if (!media && (headRow < 0 || r <= headRow) && isMedia(n)) {
        media = n.matches('p') ? (n.querySelector('picture') || n.querySelector('img')) : n;
        return;
      }
      body.push(n);
    });
  });

  const content = wrap('recipe-content', []);
  if (heading) content.append(wrap('recipe-title', [heading]));
  if (body.length) content.append(wrap('recipe-text', body));

  const sidebar = wrap('recipe-sidebar', [], 'aside');
  const layout = wrap('recipe-body container container-tight', [content, sidebar]);

  const parts = [];
  if (media) parts.push(wrap('recipe-hero', [media]));
  parts.push(layout);
  block.replaceChildren(...parts);

  // adopt the following block wrappers of this section (captured before each move)
  const wrapper = block.parentElement;
  let next = wrapper && wrapper.nextElementSibling;
  while (next) {
    const following = next.nextElementSibling;
    if (next.classList.contains('share-wrapper')) content.append(next);
    else if ([...next.classList].some((c) => c.endsWith('-wrapper'))) sidebar.append(next);
    next = following;
  }
  if (!sidebar.children.length) layout.classList.add('recipe-body-single');
}
