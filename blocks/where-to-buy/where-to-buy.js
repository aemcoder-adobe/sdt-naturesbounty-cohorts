/**
 * where-to-buy — the hand-off to a store: a ZIP search and the retailers that stock the brand.
 *
 * Authoring:
 *   row 1: heading and a line
 *   row 2: "form" | field label (e.g. "ZIP code") | button label | store locator URL (a link)
 *   retailer rows: retailer name | link
 * The ZIP form is a plain GET to the store locator with ?zip=, so it works for people and
 * for personal agents alike, and its state is in the URL.
 */
export default function decorate(block) {
  const rows = [...block.children];
  const intro = document.createElement('div');
  intro.className = 'where-to-buy-intro';
  const list = document.createElement('ul');
  list.className = 'where-to-buy-retailers';
  let form;

  rows.forEach((row, i) => {
    const cells = [...row.children];
    const first = cells[0]?.textContent.trim().toLowerCase();
    if (first === 'form') {
      const [, labelCell, buttonCell, urlCell] = cells;
      const action = urlCell?.querySelector('a')?.href || urlCell?.textContent.trim() || 'https://naturesbounty.com/pages/store-locator';
      form = document.createElement('form');
      form.className = 'where-to-buy-form';
      form.method = 'get';
      form.action = action;
      const id = `wtb-zip-${i}`;
      const label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = labelCell?.textContent.trim() || 'ZIP code';
      const input = document.createElement('input');
      input.id = id;
      input.name = 'zip';
      input.type = 'text';
      input.inputMode = 'numeric';
      input.autocomplete = 'postal-code';
      input.pattern = '[0-9]{5}';
      input.maxLength = 5;
      const hint = document.createElement('span');
      hint.className = 'where-to-buy-hint';
      hint.id = `${id}-hint`;
      hint.textContent = '5 digits, e.g. 10001';
      input.setAttribute('aria-describedby', hint.id);
      const button = document.createElement('button');
      button.type = 'submit';
      button.className = 'button primary';
      button.dataset.whereToBuy = '';
      button.textContent = buttonCell?.textContent.trim() || 'Find stores';
      const field = document.createElement('div');
      field.className = 'where-to-buy-field';
      field.append(label, input, hint);
      form.append(field, button);
      return;
    }
    const link = row.querySelector('a');
    if (link && cells.length > 1) {
      link.className = 'where-to-buy-retailer';
      link.dataset.whereToBuy = '';
      link.textContent = cells[0].textContent.trim() || link.textContent;
      const li = document.createElement('li');
      li.append(link);
      list.append(li);
      return;
    }
    intro.append(...cells.flatMap((c) => [...c.childNodes]));
  });

  const parts = [intro];
  if (form) parts.push(form);
  if (list.children.length) {
    const sub = document.createElement('p');
    sub.className = 'where-to-buy-or';
    sub.textContent = 'Or shop online at';
    parts.push(sub, list);
  }
  block.replaceChildren(...parts);
}
