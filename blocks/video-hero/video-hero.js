/**
 * video-hero — the home page's full-bleed background-video hero (live: AI video section):
 * a muted looping video behind a left shade, h1, body copy and one CTA.
 *
 * Authoring: one cell —
 *   <p><picture> poster (editorial; the layer under the video until it plays)
 *   <p><a href="/media/<scope>/<file>.mp4"> the video (root-relative content-bus mp4)
 *   <h1> headline, <p> body paragraph(s), <p><strong><a> CTA</a></strong></p>
 * Capture state restored at delivery: autoplay muted loop playsinline (never a frozen poster).
 * @ew-exempt <p> video source link (mp4 href) — metadata, rendered as the <video> source
 */

const VIDEO = /\.(mp4|webm|mov)(\?|#|$)/i;

function wrap(className, ...nodes) {
  const w = document.createElement('div');
  w.className = className;
  w.append(...nodes);
  return w;
}

export default function decorate(block) {
  if (block.querySelector(':scope > .video-hero-media')) return; // EW9 re-entrant

  const picture = block.querySelector('picture') || block.querySelector('img');
  const videoLink = [...block.querySelectorAll('a[href]')]
    .find((a) => VIDEO.test(a.getAttribute('href')));
  const heading = block.querySelector('h1, h2, h3, h4, h5, h6');
  const prose = [...block.querySelectorAll('p, ul, ol')]
    .filter((el) => !el.parentElement.closest('ul, ol, p'))
    .filter((el) => !(picture && el.contains(picture)))
    .filter((el) => !(videoLink && el.contains(videoLink)));
  const ctas = prose.filter((p) => {
    const a = p.querySelector('a[href]');
    return a && p.textContent.trim() === a.textContent.trim();
  });
  const body = prose.filter((p) => !ctas.includes(p) && p.textContent.trim());

  const media = wrap('video-hero-media');
  media.setAttribute('aria-hidden', 'true');
  if (picture) media.append(picture);
  if (videoLink) {
    const video = document.createElement('video');
    video.muted = true;
    video.defaultMuted = true;
    video.loop = true;
    video.autoplay = true;
    video.playsInline = true;
    ['muted', 'loop', 'autoplay', 'playsinline'].forEach((a) => video.setAttribute(a, ''));
    video.preload = 'metadata';
    const source = document.createElement('source');
    source.src = videoLink.href;
    source.type = 'video/mp4';
    video.append(source);
    media.append(video);
    const play = () => video.play().catch(() => {});
    video.addEventListener('canplay', play, { once: true });
    play();
  }

  const content = wrap('video-hero-content');
  if (heading) content.append(wrap('video-hero-heading', heading));
  if (body.length) content.append(wrap('video-hero-body', ...body));
  if (ctas.length) content.append(wrap('video-hero-actions', ...ctas));

  const shade = wrap('video-hero-shade');
  block.replaceChildren(media, shade, content);
}
