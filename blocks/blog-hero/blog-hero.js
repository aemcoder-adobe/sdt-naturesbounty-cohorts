/**
 * blog-hero — listing page head (component-blog.css .blog__hero / bundle.theme.css .page-hero).
 *
 * Authoring: one cell holding the page <h1>.
 *   default — centred title on the sand band (/blogs/news); the section paints the band
 *             (blog-filters sits in the same section, under the title).
 *   image   — full-width banner (/blogs/recipes): one or two images before the <h1>;
 *             the first is the desktop rendition, the second (optional) the mobile one.
 *             Left-aligned cream title over a forest gradient.
 * @variants block: image (applied automatically when the block carries an image)
 */

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .blog-hero-title')) return; // EW9 re-entrant
  const heading = block.querySelector('h1, h2, h3');
  const pics = [...block.querySelectorAll('picture')];
  const parts = [];

  if (pics.length) {
    block.classList.add('image');
    const media = document.createElement('div');
    media.className = 'blog-hero-media';
    pics.slice(0, 2).forEach((p, i) => {
      let cls = 'blog-hero-all';
      if (pics.length > 1) cls = i === 0 ? 'blog-hero-desktop' : 'blog-hero-mobile';
      media.append(wrapNode(p, cls));
    });
    const gradient = document.createElement('div');
    gradient.className = 'blog-hero-gradient';
    parts.push(media, gradient);
  }

  const title = document.createElement('div');
  title.className = pics.length ? 'blog-hero-title container' : 'blog-hero-title';
  if (heading) title.append(heading);
  // leftovers pass: any other authored prose stays visible under the title
  block.querySelectorAll('p, ul, ol').forEach((el) => {
    if (!el.closest('.blog-hero-media') && el.textContent.trim()) title.append(el);
  });
  parts.push(title);
  block.replaceChildren(...parts);
}
