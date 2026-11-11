/**
 * share — "share this" bar: lead line, sub line and a list of share links. Generic over
 * templates (article, recipe). The network colour and icon come from the link's href
 * (facebook / twitter|x / pinterest / linkedin / mailto) via attribute selectors in the CSS,
 * never from an authored class (classes die in the editor, EW3).
 *
 * Content: one cell — <p> lead, <p> sub line(s), <ul> of share links (text authored).
 */

export default function decorate(block) {
  if (block.querySelector(':scope > .share-copy')) return;

  const nodes = [...block.querySelectorAll(':scope > div > div > *')];
  const lists = nodes.filter((n) => n.matches('ul, ol'));
  const texts = nodes.filter((n) => !n.matches('ul, ol'));
  const looseLinks = [];
  texts.slice().forEach((n) => {
    // a link paragraph authored outside the list still belongs to the links
    const a = n.matches('p') && n.querySelector('a');
    if (a && n.textContent.trim() === a.textContent.trim()) {
      texts.splice(texts.indexOf(n), 1);
      looseLinks.push(n);
    }
  });

  const copy = document.createElement('div');
  copy.className = 'share-copy';
  if (texts.length) {
    const lead = document.createElement('div');
    lead.className = 'share-lead';
    lead.append(texts.shift());
    copy.append(lead);
  }
  if (texts.length) {
    const sub = document.createElement('div');
    sub.className = 'share-sub';
    sub.append(...texts);
    copy.append(sub);
  }

  const links = document.createElement('div');
  links.className = 'share-links';
  links.append(...lists, ...looseLinks);
  links.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    if (!href.startsWith('mailto:')) {
      a.target = '_blank';
      a.rel = 'noopener';
    }
  });

  block.replaceChildren(copy, links);
}
