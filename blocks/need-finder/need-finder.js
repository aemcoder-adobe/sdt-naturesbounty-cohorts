/**
 * need-finder — straight answers by need: which product, what it does, where to buy it.
 * Two renderings of the same authored rows:
 *   - people (learner cohort): answer cards, the visitor's need first
 *   - personal agents (body[data-experience="agent"]): a native form (radios + submit, state in
 *     the URL as ?need=), a reserved result area, and every answer as one open table
 *
 * Authoring:
 *   row 1: one cell, heading + line
 *   need rows: need label (e.g. "Sleep") | <picture> | <h3> product · <p> what it does ·
 *              <p> size · <p> rating (★) · <p><a> product link</a>
 */
const STORE = 'https://naturesbounty.com/pages/store-locator';

const idOf = (label) => label.toLowerCase().replace(/[’']s\b/g, '').split(/[^a-z]+/).filter(Boolean)[0] || 'need';

function readRows(block) {
  const rows = [...block.children];
  const intro = document.createElement('div');
  intro.className = 'need-finder-intro';
  const needs = [];
  rows.forEach((row) => {
    const cells = [...row.children];
    if (cells.length < 3) {
      intro.append(...cells.flatMap((c) => [...c.childNodes]));
      return;
    }
    const [labelCell, mediaCell, textCell] = cells;
    const label = labelCell.textContent.trim();
    const ps = [...textCell.querySelectorAll('p')];
    const link = textCell.querySelector('a');
    const plain = ps.filter((p) => !p.querySelector('a'));
    needs.push({
      id: idOf(label),
      label,
      picture: mediaCell.querySelector('picture'),
      product: textCell.querySelector('h2, h3, h4')?.textContent.trim() || link?.textContent.trim() || '',
      does: plain.find((p) => !/★/.test(p.textContent))?.textContent.trim() || '',
      size: plain.filter((p) => !/★/.test(p.textContent))[1]?.textContent.trim() || '',
      rating: plain.find((p) => /★/.test(p.textContent))?.textContent.trim() || '',
      href: link?.href || '',
      textCell,
    });
  });
  return { intro, needs };
}

function el(tag, className, text) {
  const e = document.createElement(tag);
  if (className) e.className = className;
  if (text) e.textContent = text;
  return e;
}

function link(href, text, className) {
  const a = el('a', className, text);
  a.href = href;
  if (href.includes('store-locator')) a.dataset.whereToBuy = '';
  return a;
}

function renderPeople(block, intro, needs) {
  const intent = window.cohorts?.intent;
  const ordered = [...needs].sort((a, b) => (b.id === intent) - (a.id === intent));
  const grid = el('ul', 'need-finder-cards');
  ordered.forEach((n) => {
    const li = el('li', `need-finder-card${n.id === intent ? ' is-yours' : ''}`);
    li.dataset.need = n.id;
    li.append(el('p', 'need-finder-need', n.label));
    if (n.picture) {
      const media = el('div', 'need-finder-media');
      media.append(n.picture);
      li.append(media);
    }
    const body = el('div', 'need-finder-body');
    body.append(el('h3', '', n.product));
    if (n.does) body.append(el('p', 'need-finder-does', n.does));
    const meta = [n.size, n.rating].filter(Boolean).join(' · ');
    if (meta) body.append(el('p', 'need-finder-meta', meta));
    const actions = el('p', 'need-finder-actions');
    if (n.href) actions.append(link(n.href, 'See product', 'button primary'));
    actions.append(link(STORE, 'Find a store', 'need-finder-store'));
    body.append(actions);
    li.append(body);
    grid.append(li);
  });
  block.replaceChildren(intro, grid);
}

function renderAgent(block, intro, needs) {
  const params = new URLSearchParams(window.location.search);
  const form = el('form', 'need-finder-form');
  form.method = 'get';
  const fs = el('fieldset');
  fs.append(el('legend', '', 'What do you want support with?'));
  needs.forEach((n) => {
    const id = `need-${n.id}`;
    const wrap = el('div', 'need-finder-option');
    const input = el('input');
    input.type = 'radio';
    input.name = 'need';
    input.id = id;
    input.value = n.id;
    input.checked = params.get('need') === n.id;
    const label = el('label', '', n.label);
    label.htmlFor = id;
    wrap.append(input, label);
    fs.append(wrap);
  });
  const submit = el('button', 'button primary', 'Show the supplement for this need');
  submit.type = 'submit';
  const result = el('div', 'need-finder-result');
  result.setAttribute('aria-live', 'polite');
  result.id = 'need-finder-result';

  const show = (id) => {
    const n = needs.find((x) => x.id === id);
    result.replaceChildren();
    if (!n) {
      result.append(el('p', '', 'No need chosen yet. Choose one above and press the button.'));
      return;
    }
    result.append(el('h2', '', `${n.label}: ${n.product}`));
    const dl = el('dl');
    [['What it does', n.does], ['Size', n.size], ['Rating', n.rating]].filter(([, v]) => v).forEach(([k, v]) => {
      dl.append(el('dt', '', k), el('dd', '', v));
    });
    result.append(dl);
    const p = el('p');
    if (n.href) p.append(link(n.href, `Open the ${n.product} product page`), document.createTextNode(' · '));
    p.append(link(`${STORE}`, `Find a store that sells ${n.product}`));
    result.append(p);
    result.append(el('p', 'need-finder-note', 'Buying happens at the retailer, by the person.'));
  };

  const sync = (e) => {
    if (e.type === 'submit') e.preventDefault();
    const id = new FormData(form).get('need');
    const q = new URLSearchParams(window.location.search);
    if (id) q.set('need', id); else q.delete('need');
    window.history.replaceState(null, '', `${window.location.pathname}?${q}`);
    show(id);
  };
  form.addEventListener('submit', sync);
  form.addEventListener('change', sync);
  form.append(fs, submit);
  show(params.get('need'));

  const table = el('table', 'need-finder-table');
  table.append(el('caption', '', 'Every need, the product for it, and what it does'));
  const head = el('tr');
  ['Need', 'Product', 'What it does', 'Size', 'Rating', 'Product page'].forEach((h) => {
    const th = el('th', '', h);
    th.scope = 'col';
    head.append(th);
  });
  const thead = el('thead');
  thead.append(head);
  table.append(thead);
  const tbody = el('tbody');
  needs.forEach((n) => {
    const tr = el('tr');
    const th = el('th', '', n.label);
    th.scope = 'row';
    const linkCell = el('td');
    if (n.href) linkCell.append(link(n.href, n.product));
    tr.append(th, el('td', '', n.product), el('td', '', n.does), el('td', '', n.size), el('td', '', n.rating), linkCell);
    tbody.append(tr);
  });
  table.append(tbody);
  const scroller = el('div', 'need-finder-table-wrap');
  scroller.tabIndex = 0;
  scroller.setAttribute('role', 'region');
  scroller.setAttribute('aria-label', 'Every need, the product for it, and what it does');
  scroller.append(table);
  block.replaceChildren(intro, form, result, scroller);
}

export default function decorate(block) {
  const { intro, needs } = readRows(block);
  if (document.body.dataset.experience === 'agent') {
    block.classList.add('for-agent');
    renderAgent(block, intro, needs);
  } else {
    renderPeople(block, intro, needs);
  }
}
