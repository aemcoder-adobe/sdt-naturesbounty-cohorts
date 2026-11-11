/**
 * blog-featured — the "Featured" article panel of the blog index (component-blog.css
 * .blog__featured): image column with its label, content column on a leaf wash.
 *
 * Authoring: one row, two cells.
 *   1. the label paragraph ("Featured") and the article image
 *   2. optional bulleted list of tag links, the article title (heading), the excerpt
 *      paragraph(s), then the "Read more" link alone in its paragraph (last)
 */

function wrapNode(node, className) {
  const w = document.createElement('div');
  w.className = className;
  w.append(node);
  return w;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .blog-featured-image')) return; // EW9 re-entrant
  const picture = block.querySelector('picture') || block.querySelector('img');
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const tags = block.querySelector('ul, ol');
  const paras = [...block.querySelectorAll('p')].filter((p) => p.textContent.trim()
    && !p.querySelector('picture, img') && !p.closest('ul, ol'));
  const isBefore = (p) => heading
    && (heading.compareDocumentPosition(p) % 4 === Node.DOCUMENT_POSITION_PRECEDING);
  const label = paras.find((p) => isBefore(p) && !p.querySelector('a'));
  const more = [...paras].reverse().find((p) => p !== label && p.querySelector('a')
    && p.textContent.trim() === p.querySelector('a').textContent.trim());
  const excerpt = paras.filter((p) => p !== label && p !== more);

  const image = document.createElement('div');
  image.className = 'blog-featured-image';
  if (label) image.append(wrapNode(label, 'blog-featured-label'));
  if (picture) image.append(wrapNode(picture, 'blog-featured-holder'));

  const content = document.createElement('div');
  content.className = 'blog-featured-content';
  if (tags) content.append(wrapNode(tags, 'blog-featured-tags'));
  else block.classList.add('no-tags');
  if (heading) content.append(wrapNode(heading, 'blog-featured-title'));
  if (excerpt.length) {
    const ex = document.createElement('div');
    ex.className = 'blog-featured-excerpt';
    ex.append(...excerpt);
    content.append(ex);
  }
  if (more) content.append(wrapNode(more, 'blog-featured-more'));
  block.replaceChildren(image, content);
}
