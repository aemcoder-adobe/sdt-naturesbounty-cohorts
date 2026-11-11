/**
 * content-newsletter — the home page's "Because you are bountiful." sign-up band: a large
 * statement on the left; title, copy and the e-mail field + Sign Up on the right.
 *
 * Authoring: one row, two cells —
 *   1 the statement paragraph(s)
 *   2 <h3> title line(s), <p> copy, <p> field placeholder ("Your Email"),
 *     <p><a href="<sign-up endpoint>">Sign Up</a></p> (link text = button label)
 * Interim (dynamics f-form-contactnewsletter): the endpoint is host-bound, submit opens it in a
 * new tab with the address, like the footer form.
 * @ew-exempt <p> field placeholder + submit label — form UI (input placeholder, button)
 */

function div(className, ...nodes) {
  const el = document.createElement('div');
  el.className = className;
  el.append(...nodes);
  return el;
}

function buildForm(placeholderP, submitP) {
  const link = submitP ? submitP.querySelector('a[href]') : null;
  const placeholder = placeholderP ? placeholderP.textContent.trim() : '';
  const form = document.createElement('form');
  form.className = 'content-newsletter-form';
  form.method = 'post';
  if (link) form.setAttribute('action', link.getAttribute('href'));
  const input = document.createElement('input');
  input.className = 'content-newsletter-input';
  input.id = 'NewsletterForm--landing';
  input.type = 'email';
  input.name = 'contact[email]';
  input.placeholder = placeholder;
  input.autocomplete = 'email';
  input.required = true;
  input.setAttribute('aria-label', placeholder || 'Email');
  const submit = document.createElement('button');
  submit.className = 'content-newsletter-submit';
  submit.type = 'submit';
  submit.textContent = link ? link.textContent : '';
  form.append(div('content-newsletter-field', input, submit));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const action = form.getAttribute('action');
    if (!action) return;
    const url = new URL(action, window.location.href);
    if (input.value) url.searchParams.set('contact[email]', input.value);
    window.open(url.href, '_blank', 'noopener');
  });
  return form;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .content-newsletter-inner')) return; // EW9 re-entrant

  const cells = [...block.querySelectorAll(':scope > div > div')];
  const leftCell = cells.length > 1 ? cells[0] : null;
  const rightCell = cells.length > 1 ? cells[1] : cells[0];
  const kids = (cell) => {
    if (!cell) return [];
    if (!cell.children.length && cell.textContent.trim()) {
      // HARNESS-ONLY fallback: DA content always wraps cell text in a <p>
      const p = document.createElement('p');
      p.append(...cell.childNodes);
      return [p];
    }
    return [...cell.children];
  };

  const right = kids(rightCell);
  const titles = right.filter((n) => /^H[1-6]$/.test(n.tagName));
  const paras = right.filter((n) => !titles.includes(n));
  const submitP = paras.find((p) => p.querySelector('a[href]'));
  const before = submitP ? paras.slice(0, paras.indexOf(submitP)) : paras;
  const placeholderP = submitP && before.length > 1 ? before[before.length - 1] : null;
  const copy = before.filter((p) => p !== placeholderP);

  const text = div('content-newsletter-text');
  if (titles.length) text.append(div('content-newsletter-title', ...titles));
  if (copy.length) text.append(div('content-newsletter-copy', ...copy));
  if (submitP) text.append(buildForm(placeholderP, submitP));
  if (placeholderP) placeholderP.remove();
  if (submitP) submitP.remove();

  const left = div('content-newsletter-left', div('content-newsletter-text', ...kids(leftCell)));
  const rightCol = div('content-newsletter-right', text);
  const inner = div('content-newsletter-inner container', left, rightCol);
  block.replaceChildren(inner);
}
