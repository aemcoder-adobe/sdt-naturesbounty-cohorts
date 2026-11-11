/* Landing archetype behaviours (home page) — tabbed product rail, highlight carousel, testimonials.
   Mechanics mirror the live widgets (tabbed-products.js, Swiper configs); no autoplay on any of them.
   The hero video autoplays natively (muted loop playsinline). */
(() => {
  /* tabbed products: a single snap-scrolling strip; pills jump to their collection's first slide,
     arrows step by data-prev/data-next slides and wrap; the active pill follows the scroll position */
  document.querySelectorAll('[data-tabbed-products]').forEach((root) => {
    const track = root.querySelector('[data-tp-track]');
    const slides = [...track.children];
    const pills = [...root.querySelectorAll('.tabbed-products__pill')];
    const current = () => {
      const x = track.scrollLeft;
      let i = 0;
      for (const s of slides) { if (s.offsetLeft - track.offsetLeft >= x - 1) break; i += 1; }
      return Math.min(i, slides.length - 1);
    };
    const setActive = (handle) => pills.forEach((p) => {
      const on = p.dataset.collectionHandle === handle;
      p.classList.toggle('is-active', on);
      p.setAttribute('aria-pressed', String(on));
    });
    const go = (i) => {
      track.scrollLeft = slides[i].offsetLeft - track.offsetLeft;
      setActive(slides[i].dataset.collectionHandle);
    };
    pills.forEach((p) => p.addEventListener('click', () => {
      const i = slides.findIndex((s) => s.dataset.collectionHandle === p.dataset.collectionHandle);
      if (i >= 0) go(i);
    }));
    root.querySelectorAll('[data-prev]').forEach((b) => b.addEventListener('click', () => {
      const step = parseInt(b.dataset.prev, 10) || 1;
      const c = current();
      go(c === 0 ? Math.max(slides.length - step, 0) : Math.max(c - step, 0));
    }));
    root.querySelectorAll('[data-next]').forEach((b) => b.addEventListener('click', () => {
      const step = parseInt(b.dataset.next, 10) || 1;
      const c = current();
      go(c + step >= slides.length ? 0 : c + step);
    }));
    track.addEventListener('scrollend', () => setActive(slides[current()].dataset.collectionHandle));
  });

  /* generic single-view slider: translateX by whole slides */
  const slider = ({ root, track, prev, next, dots, loop }) => {
    const slides = [...track.children];
    let index = 0;
    const render = () => {
      track.style.transform = `translate3d(${-index * 100}%, 0, 0)`;
      slides.forEach((s, i) => {
        const on = i === index;
        s.classList.toggle('is-active', on);
        if (on) { s.removeAttribute('aria-hidden'); s.inert = false; } else { s.setAttribute('aria-hidden', 'true'); s.inert = true; }
      });
      if (!loop) {
        if (prev) prev.disabled = index === 0;
        if (next) next.disabled = index === slides.length - 1;
      }
      dots.forEach((d, i) => {
        d.classList.toggle('is-active', i === index);
        if (i === index) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    };
    const go = (i) => {
      index = loop ? (i + slides.length) % slides.length : Math.max(0, Math.min(slides.length - 1, i));
      render();
    };
    prev?.addEventListener('click', () => go(index - 1));
    next?.addEventListener('click', () => go(index + 1));
    dots.forEach((d, i) => d.addEventListener('click', () => go(i)));
    root.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') go(index - 1);
      if (e.key === 'ArrowRight') go(index + 1);
    });
  };
  document.querySelectorAll('[data-cp]').forEach((root) => slider({
    root, track: root.querySelector('[data-cp-track]'), prev: root.querySelector('[data-cp-prev]'),
    next: root.querySelector('[data-cp-next]'), dots: [...root.querySelectorAll('[data-cp-dot]')], loop: false,
  }));
  document.querySelectorAll('[data-testimonials]').forEach((root) => slider({
    root, track: root.querySelector('[data-tm-track]'), prev: root.querySelector('[data-tm-prev]'),
    next: root.querySelector('[data-tm-next]'), dots: [], loop: true,
  }));
})();

/* highlight carousel entrance (live: GSAP ScrollTrigger on the first slide's descendants and the dots —
   y -20% → 0, opacity 0 → 1, 1 s each, 0.2 s stagger, once `.content-products` top passes centre + 300 px).
   Skipped under prefers-reduced-motion, so the resting state is the static markup. */
(() => {
  if (!window.matchMedia('(prefers-reduced-motion: no-preference)').matches) return;
  document.querySelectorAll('[data-cp]').forEach((root) => {
    const items = [...root.querySelectorAll('.content-products__slide:first-child *, .content-products__dots *')];
    items.forEach((el, i) => el.style.setProperty('--enter-i', i));
    root.classList.add('cp-enter');
    const check = () => {
      if (root.getBoundingClientRect().top <= window.innerHeight / 2 + 300) {
        root.classList.add('is-in');
        window.removeEventListener('scroll', check);
      }
    };
    window.addEventListener('scroll', check, { passive: true });
    check();
  });
})();
