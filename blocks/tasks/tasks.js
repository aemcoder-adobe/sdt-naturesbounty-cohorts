/**
 * tasks — thumb-sized quick tasks for a first view (mobile cohort hero).
 *
 * Authoring:
 *   row 1 (optional): one cell with a heading (and a line)
 *   task rows: icon name | link (the link text is the label)
 *     icon names: need, star, store, hair, sleep, immune, article, compare, search, help
 *   a task row whose icon is `help` renders as a full-width bar below the tiles
 */
const P = {
  need: '<path d="M12 21c-4-3-8-6.5-8-11a5 5 0 0 1 8-4 5 5 0 0 1 8 4c0 4.5-4 8-8 11Z"/>',
  star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9Z"/>',
  store: '<path d="M4 9h16l-1-4H5Z"/><path d="M5 9v11h14V9"/><path d="M10 20v-5h4v5"/>',
  hair: '<path d="M6 20c0-8 2-15 6-15s6 7 6 15"/><path d="M9 20c0-6 1-11 3-11s3 5 3 11"/>',
  sleep: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"/>',
  immune: '<path d="M12 3 5 6v5c0 4.5 3 8.5 7 10 4-1.5 7-5.5 7-10V6Z"/><path d="m9 12 2 2 4-4"/>',
  article: '<path d="M5 4h10l4 4v12H5Z"/><path d="M8 11h8M8 15h8M8 7h5"/>',
  compare: '<path d="M12 4v16M5 8h14"/><path d="m5 8-3 6h6Zm14 0-3 6h6Z"/>',
  search: '<circle cx="11" cy="11" r="6"/><path d="m20 20-4.5-4.5"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.6V14"/><path d="M12 17.5h.01"/>',
};

function icon(name) {
  const span = document.createElement('span');
  span.className = 'tasks-icon';
  span.setAttribute('aria-hidden', 'true');
  span.innerHTML = `<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || P.need}</svg>`;
  return span;
}

export default function decorate(block) {
  const rows = [...block.children];
  const intro = document.createElement('div');
  intro.className = 'tasks-intro';
  const grid = document.createElement('ul');
  grid.className = 'tasks-grid';
  const extras = document.createElement('div');
  extras.className = 'tasks-extras';

  rows.forEach((row) => {
    const cells = [...row.children];
    const link = row.querySelector('a');
    if (!link) {
      intro.append(...cells.flatMap((c) => [...c.childNodes]));
      return;
    }
    const name = (cells.length > 1 ? cells[0].textContent : '').trim().toLowerCase();
    link.classList.remove('button', 'primary', 'secondary', 'accent');
    link.removeAttribute('title');
    if (/store-locator|where-to-buy/.test(link.href)) link.dataset.whereToBuy = '';
    const label = document.createElement('span');
    label.className = 'tasks-label';
    label.append(...link.childNodes);
    link.append(icon(name), label);
    if (name === 'help') {
      link.className = 'tasks-help';
      extras.append(link);
    } else {
      const li = document.createElement('li');
      link.className = 'tasks-tile';
      li.append(link);
      grid.append(li);
    }
  });

  block.replaceChildren(...[intro, grid, extras].filter((el) => el.childNodes.length));
}
