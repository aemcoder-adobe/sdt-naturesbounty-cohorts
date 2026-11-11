/**
 * need-hero — a cohort first view built around one need or one product
 * (the ad's promise repeated back, or "welcome back" for a regular).
 *
 * Authoring: one row, two cells
 *   1 <picture> the product
 *   2 <p> eyebrow (optional, before the heading) · <h1>/<h2> · <p> line(s) ·
 *     <p> rating line, e.g. "4.2 ★ · 462 reviews" (optional) ·
 *     <p><strong><a> primary CTA</a></strong> · <p><em><a> secondary CTA</a></em>
 * @variants light — sand field instead of forest
 */
export default function decorate(block) {
  const row = block.firstElementChild;
  if (!row) return;
  const cells = [...row.children];
  const media = cells.find((c) => c.querySelector('picture, img'));
  const text = cells.find((c) => c !== media) || document.createElement('div');

  text.className = 'need-hero-text';
  const heading = text.querySelector('h1, h2, h3');
  let el = heading?.previousElementSibling;
  while (el) {
    if (el.tagName === 'P') el.classList.add('need-hero-eyebrow');
    el = el.previousElementSibling;
  }
  text.querySelectorAll('p').forEach((p) => {
    if (/★/.test(p.textContent)) p.classList.add('need-hero-rating');
  });
  const ctas = [...text.querySelectorAll('p.button-wrapper')];
  if (ctas.length) {
    const bar = document.createElement('div');
    bar.className = 'need-hero-ctas';
    ctas[0].before(bar);
    bar.append(...ctas);
  }
  text.querySelectorAll('a[href*="store-locator"], a[href*="where-to-buy"]').forEach((a) => { a.dataset.whereToBuy = ''; });

  const parts = [text];
  if (media) {
    media.className = 'need-hero-media';
    const img = media.querySelector('img');
    if (img) {
      img.loading = 'eager';
      img.fetchPriority = 'high';
    }
    parts.push(media);
  }
  block.replaceChildren(...parts);
}
