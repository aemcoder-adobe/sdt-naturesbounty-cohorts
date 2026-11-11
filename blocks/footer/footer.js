import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import ICONS from './footer-icons.js';

/**
 * Footer — template-slotted replica chrome. Content comes from the authored `/footer` document
 * (override with `footer` page metadata); sections in order:
 *   1 logo <p>   2 newsletter: title <p>, subline <p>, field placeholder <p>, submit link <p>
 *   (href = form endpoint, text = button label), social title <p> + social <ul>
 *   3 link columns: title <p> + <ul> pairs (accordions below 1024px)   4 legal <ul> (an item
 *   without a link is the "Your Privacy Choices" consent trigger)   5 disclaimer paragraphs.
 * Authored nodes are MOVED into the template (EW1); the mobile copy of the social row is a
 * presentational clone with instrumentation stripped (EW4).
 * @ew-exempt <p> newsletter placeholder + submit label — form UI kept as hidden labels
 */

const SOCIAL_HOSTS = ['facebook', 'twitter', 'youtube', 'pinterest', 'instagram'];

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => {
    if (k === 'class') node.className = v;
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  });
  node.append(...children.filter(Boolean));
  return node;
}

function icon(name) {
  const t = document.createElement('template');
  t.innerHTML = ICONS[name];
  return t.content.firstElementChild;
}

function stripInstrumentation(node) {
  const attrs = ['data-prose-index', 'data-image-index', 'data-block-index'];
  [node, ...node.querySelectorAll('*')].forEach((n) => {
    attrs.forEach((a) => n.removeAttribute(a));
  });
  return node;
}

function slot(className, ...nodes) {
  return el('div', { class: className }, ...nodes.filter(Boolean));
}

function sectionWrappers(fragment) {
  return [...fragment.querySelectorAll(':scope > .section')]
    .map((s) => s.querySelector('.default-content-wrapper') || s)
    .filter((w) => w.children.length);
}

function decorateSocials(list) {
  list.querySelectorAll('a[href]').forEach((a) => {
    const name = SOCIAL_HOSTS.find((h) => a.href.includes(h));
    const label = el('span', { class: 'visually-hidden' }, ...a.childNodes);
    a.setAttribute('aria-label', label.textContent);
    a.setAttribute('title', label.textContent);
    a.setAttribute('target', '_blank');
    a.setAttribute('rel', 'noopener');
    a.append(label);
    if (name) a.prepend(icon(name));
  });
}

function buildNewsletter(wrapper) {
  const box = el('div', { class: 'site-footer-newsletter' });
  const social = el('div', { class: 'site-footer-social site-footer-social-desktop' });
  if (!wrapper) return { box, social };
  const kids = [...wrapper.children];
  const list = kids.find((n) => n.tagName === 'UL');
  const paras = kids.filter((n) => n.tagName === 'P');
  const submitP = paras.find((p) => p.querySelector('a[href]'));
  const at = (n) => kids.indexOf(n);
  const cut = submitP ? at(submitP) : kids.length;
  const [title, sub, placeholderP] = paras.filter((p) => at(p) < cut);
  const socialTitle = paras.filter((p) => at(p) > cut && (!list || at(p) < at(list))).pop();
  if (title) box.append(slot('site-footer-nl-title', title));
  if (sub) box.append(slot('site-footer-nl-sub', sub));

  const link = submitP && submitP.querySelector('a[href]');
  const form = el('form', {
    class: 'site-footer-form',
    action: link ? link.getAttribute('href') : '',
    method: 'post',
  });
  const input = el('input', {
    class: 'site-footer-input',
    id: 'NewsletterForm--footer',
    type: 'email',
    name: 'contact[email]',
    placeholder: placeholderP ? placeholderP.textContent : '',
    autocomplete: 'email',
    'aria-required': 'true',
    'aria-label': placeholderP ? placeholderP.textContent : 'Email',
    required: '',
  });
  const submit = el('button', { class: 'site-footer-submit', type: 'submit' });
  submit.textContent = link ? link.textContent : '';
  form.append(
    el('div', { class: 'site-footer-field' }, input, submit),
    slot('site-footer-form-labels visually-hidden', placeholderP, submitP),
  );
  // interim (dynamics f-newsletter, A2): the sign-up endpoint is host-bound — open it
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!form.action) return;
    const url = new URL(form.getAttribute('action'), window.location.href);
    if (input.value) url.searchParams.set('contact[email]', input.value);
    window.open(url.href, '_blank', 'noopener');
  });
  box.append(form);

  if (socialTitle) social.append(slot('site-footer-social-title', socialTitle));
  if (list) {
    decorateSocials(list);
    social.append(slot('site-footer-socials', list));
  }
  box.append(social);
  return { box, social };
}

function buildColumns(wrapper) {
  const links = el('div', { class: 'site-footer-links' });
  if (!wrapper) return links;
  let node = wrapper.firstElementChild;
  let index = 0;
  while (node) {
    const next = node.nextElementSibling;
    if (node.tagName === 'P' && next && next.tagName === 'UL') {
      const after = next.nextElementSibling;
      index += 1;
      const head = el('div', {
        class: 'site-footer-col-head',
        role: 'button',
        tabindex: '0',
        'aria-expanded': 'false',
        'aria-controls': `footer-col-${index}`,
      }, node, el('span', { class: 'site-footer-col-icon' }, icon('dropdown')));
      const col = el(
        'div',
        { class: 'site-footer-col' },
        head,
        el('div', { class: 'site-footer-col-links', id: `footer-col-${index}` }, next),
      );
      if (next.querySelectorAll('li').length > 10) col.classList.add('site-footer-col-wide');
      links.append(col);
      node = after;
    } else {
      links.append(node);
      node = next;
    }
  }
  return links;
}

function bindColumns(links) {
  const desktop = window.matchMedia('(min-width: 1024px)');
  links.querySelectorAll('.site-footer-col-head').forEach((head) => {
    head.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        head.click();
      }
    });
    head.addEventListener('click', () => {
      if (desktop.matches) return;
      const col = head.closest('.site-footer-col');
      const isOpen = col.classList.toggle('is-open');
      head.setAttribute('aria-expanded', String(isOpen));
    });
  });
}

function buildLegal(wrapper) {
  const legal = el('div', { class: 'site-footer-legal' });
  if (!wrapper) return legal;
  const list = wrapper.querySelector('ul');
  if (list) {
    const items = [...list.querySelectorAll(':scope > li')];
    const linkItems = items.filter((li) => li.querySelector('a[href]'));
    linkItems.forEach((li, i) => {
      const a = li.querySelector('a[href]');
      a.prepend(el('span', { class: 'site-footer-legal-label' }, ...a.childNodes));
      if (i < linkItems.length - 1) {
        a.append(el('span', { class: 'site-footer-sep', 'aria-hidden': 'true' }, '|'));
      }
    });
    items.filter((li) => !li.querySelector('a[href]')).forEach((li) => {
      const label = el('span', { class: 'site-footer-privacy-label' }, ...li.childNodes);
      const trigger = el('a', {
        class: 'site-footer-privacy', role: 'button', tabindex: '0',
      }, icon('privacy'), label);
      trigger.addEventListener('click', () => {
        if (window.OneTrust && window.OneTrust.ToggleInfoDisplay) {
          window.OneTrust.ToggleInfoDisplay();
        }
      });
      li.append(trigger);
      const sep = el('li', { class: 'site-footer-legal-sep', 'aria-hidden': 'true' });
      sep.append(el('span', { class: 'site-footer-sep' }, '|'));
      li.before(sep);
    });
  }
  legal.append(...wrapper.children);
  return legal;
}

function buildDisclaimer(wrapper) {
  const box = el('div', { class: 'site-footer-disclaimer' });
  if (!wrapper) return box;
  const kids = [...wrapper.children];
  const fda = kids.find((p) => p.tagName === 'P' && p.querySelector('strong'));
  kids.forEach((n) => {
    if (n === fda) box.append(slot('site-footer-fda', n));
    else box.append(n);
  });
  return box;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);
  if (!fragment) return;

  const [brandW, newsW, colsW, legalW, discW, ...rest] = sectionWrappers(fragment);
  const logo = slot('site-footer-logo', ...(brandW ? brandW.children : []));
  const { box: newsletter, social } = buildNewsletter(newsW);
  const links = buildColumns(colsW);
  if (social.childElementCount) {
    const mobileSocial = stripInstrumentation(social.cloneNode(true));
    mobileSocial.className = 'site-footer-social site-footer-social-mobile';
    links.append(mobileSocial);
  }
  bindColumns(links);

  const container = el(
    'div',
    { class: 'container' },
    logo,
    el('div', { class: 'site-footer-content' }, newsletter, links),
    el('hr', { class: 'site-footer-rule' }),
    buildLegal(legalW),
    buildDisclaimer(discW),
  );
  rest.forEach((w) => container.append(...w.children));
  block.replaceChildren(el('div', { class: 'site-footer' }, container));
}
