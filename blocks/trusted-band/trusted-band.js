/**
 * trusted-band — the site-wide "trusted quality" band (canon .trusted-band; live
 * .content-banner): banner image + one line of copy on sage, closed by the gold rule.
 * Reused by every template.
 *
 * Authoring: one cell — the banner image, then the copy paragraph(s).
 * The gold rule is decorative (CSS).
 */

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .trusted-band-inner')) return; // EW9 re-entrant
  const picture = block.querySelector('picture') || block.querySelector('img');
  const prose = [...block.querySelectorAll('h1, h2, h3, h4, h5, h6, p, ul, ol')]
    .filter((el) => el.textContent.trim() && !el.querySelector('picture, img')
      && !el.parentElement.closest('ul, ol'));

  const inner = document.createElement('div');
  inner.className = 'trusted-band-inner container';
  if (picture) inner.append(wrapNode(picture, 'trusted-band-img'));
  if (prose.length) {
    const text = document.createElement('div');
    text.className = 'trusted-band-text';
    text.append(...prose);
    inner.append(text);
  }
  const rule = document.createElement('div');
  rule.className = 'trusted-band-rule';
  rule.setAttribute('role', 'presentation');
  block.replaceChildren(inner, rule);
}
