/**
 * listing-pagination — the listing's "Load More" control (component-blog.css .blog__pagination).
 * Dynamic-features row 14: the delivered page carries the captured first page; Load More
 * links to the next listing page (`?page=N`).
 *
 * Authoring: one cell — the Load More link, emphasised (italic = outline pill), alone in
 * its paragraph.
 */
export default function decorate(block) {
  if (block.querySelector(':scope > .listing-pagination-action')) return; // EW9 re-entrant
  const action = document.createElement('div');
  action.className = 'listing-pagination-action';
  block.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('a')) action.append(p);
  });
  if (!action.children.length) {
    const link = block.querySelector('a');
    if (link) action.append(link);
  }
  block.replaceChildren(action);
}
