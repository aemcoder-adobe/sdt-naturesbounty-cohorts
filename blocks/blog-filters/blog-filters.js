/**
 * blog-filters — blog category pills (component-blog.css .blog__filters) and, below 768px,
 * the category dropdown that navigates on change (live theme behaviour).
 *
 * Authoring: one cell holding a bulleted list of links — the first is "All Blogs"
 * (the blog root), the rest one link per tag page.
 * @ew-exempt select — the mobile <select> options are presentational clones of the authored
 *   list (the list stays the editable source; it is the desktop rendering)
 */

const CHEVRON = '<svg aria-hidden="true" focusable="false" fill="none" viewBox="0 0 16 16">'
  + '<path d="M6 4L10 8L6 12" stroke="currentColor" stroke-linecap="round" '
  + 'stroke-linejoin="round"></path></svg>';

function buildSelect(links) {
  const wrap = document.createElement('div');
  wrap.className = 'blog-filters-select';
  const select = document.createElement('select');
  select.setAttribute('aria-label', 'Filter blog posts');
  links.forEach((a) => {
    const opt = document.createElement('option');
    opt.value = a.getAttribute('href');
    opt.textContent = a.textContent;
    if (a.pathname && a.pathname === window.location.pathname) opt.selected = true;
    select.append(opt);
  });
  select.addEventListener('change', () => {
    if (select.value) window.location.href = select.value;
  });
  wrap.append(select);
  wrap.insertAdjacentHTML('beforeend', CHEVRON);
  return wrap;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .blog-filters-list')) return; // EW9 re-entrant
  const links = [...block.querySelectorAll('a[href]')];
  const list = document.createElement('div');
  list.className = 'blog-filters-list';
  const authored = block.querySelectorAll('ul, ol, p');
  authored.forEach((el) => {
    if (!el.parentElement.closest('ul, ol')) list.append(el);
  });
  block.replaceChildren(list, buildSelect(links));
}
