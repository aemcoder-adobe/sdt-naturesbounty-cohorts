/**
 * tag-nav — "Explore more blogs:" category list (blog sidebar). The head is whatever is
 * authored before the list (a <p> or heading); the list is the authored <ul> of links.
 *
 * Content: one cell — <p> head, <ul> of category links.
 */
export default function decorate(block) {
  if (block.querySelector(':scope > .tag-nav-list')) return;

  const nodes = [...block.querySelectorAll(':scope > div > div > *')];
  const head = document.createElement('div');
  head.className = 'tag-nav-head';
  const list = document.createElement('div');
  list.className = 'tag-nav-list';
  nodes.forEach((n) => {
    if (n.matches('ul, ol') || list.children.length) list.append(n);
    else head.append(n);
  });

  const parts = [];
  if (head.children.length) parts.push(head);
  parts.push(list);
  block.replaceChildren(...parts);
}
