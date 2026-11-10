/* Nature's Bounty replica — chrome behaviour only: announcement ticker, desktop mega menus,
   header search, mobile drawer drill-down, footer accordions. No framework. */
(() => {
  const mqDesktop = window.matchMedia('(min-width: 1200px)');

  /* announcement bar: the live slick track advances one slide per 13 s with a linear
     transform transition (observed), starting from a centred slide — first original slide on
     desktop, the second at the mobile banner step. */
  const track = document.querySelector('[data-announce-track]');
  if (track) {
    const links = [...track.querySelectorAll('.announce__link')];
    const perSet = links.length / 3;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let start = 0;
    let x0 = 0;
    let idx = 0;
    let timer;
    const leftOf = (i) => links[i].offsetLeft;
    const apply = (animate) => {
      track.style.transition = animate ? 'transform 13s linear' : 'none';
      track.style.transform = `translateX(${x0 - (leftOf(start + idx) - leftOf(start))}px)`;
    };
    const place = () => {
      const vp = track.parentElement.getBoundingClientRect().width;
      start = perSet + (window.matchMedia('(max-width: 768px)').matches ? 1 : 0);
      const ml = parseFloat(getComputedStyle(links[start]).marginLeft);
      const w = links[start].offsetWidth + ml * 2;
      x0 = Math.round(vp / 2 - (leftOf(start) - ml + w / 2));
      idx = 0;
      apply(false);
    };
    const step = () => {
      if (idx >= perSet) { idx -= perSet; apply(false); void track.offsetWidth; }
      idx += 1;
      apply(true);
    };
    place();
    window.addEventListener('resize', () => { clearTimeout(timer); place(); timer = setTimeout(step, 3000); });
    track.addEventListener('transitionend', (e) => { if (e.propertyName === 'transform') step(); });
    if (!reduce) timer = setTimeout(step, 3000);
  }

  /* desktop mega menus — closed at rest, one panel open at a time */
  const triggers = [...document.querySelectorAll('[data-mega-trigger]')];
  const mega = document.querySelector('[data-mega]');
  const closeAll = () => {
    triggers.forEach((t) => {
      t.setAttribute('aria-expanded', 'false');
      const p = document.getElementById(t.dataset.megaTrigger);
      if (p) p.hidden = true;
    });
  };
  const open = (t) => {
    triggers.forEach((o) => { if (o !== t) { o.setAttribute('aria-expanded', 'false'); document.getElementById(o.dataset.megaTrigger).hidden = true; } });
    t.setAttribute('aria-expanded', 'true');
    document.getElementById(t.dataset.megaTrigger).hidden = false;
  };
  triggers.forEach((t) => {
    t.addEventListener('click', () => (t.getAttribute('aria-expanded') === 'true' ? closeAll() : open(t)));
  });
  if (mega) {
    mega.querySelectorAll('[data-mega-group]').forEach((g) => {
      g.addEventListener('mouseenter', () => {
        const panel = g.closest('[data-mega-panel]');
        panel.querySelectorAll('.mega__group').forEach((x) => x.classList.toggle('is-active', x === g));
        panel.querySelectorAll('[data-mega-child]').forEach((c) => c.classList.toggle('is-active', c.dataset.megaChild === g.dataset.megaGroup));
      });
    });
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') { closeAll(); closeDrawer(); } });
  document.addEventListener('click', (e) => { if (!e.target.closest('[data-mega-trigger], [data-mega]')) closeAll(); });

  /* header search: the icon opens the field first, submits once open */
  const search = document.querySelector('[data-site-search]');
  if (search) {
    const input = search.querySelector('input');
    search.querySelector('button').addEventListener('click', (e) => {
      if (!search.classList.contains('is-open') || !input.value) {
        e.preventDefault();
        search.classList.toggle('is-open');
        if (search.classList.contains('is-open')) input.focus();
      }
    });
  }

  /* mobile drawer with drill-down panels */
  const drawer = document.getElementById('site-drawer');
  const toggle = document.querySelector('[data-drawer-toggle]');
  function closeDrawer() {
    if (!drawer || !drawer.classList.contains('is-open')) return;
    drawer.classList.remove('is-open');
    document.body.classList.remove('has-modal');
    toggle.setAttribute('aria-expanded', 'false');
    drawer.querySelectorAll('.drawer__panel--sub').forEach((p) => p.classList.remove('is-open'));
    drawer.querySelectorAll('[data-drawer-open-sub]').forEach((b) => b.setAttribute('aria-expanded', 'false'));
  }
  if (drawer && toggle) {
    toggle.addEventListener('click', () => {
      drawer.classList.add('is-open');
      document.body.classList.add('has-modal');
      toggle.setAttribute('aria-expanded', 'true');
    });
    document.querySelectorAll('[data-drawer-close]').forEach((b) => b.addEventListener('click', closeDrawer));
    drawer.addEventListener('click', (e) => {
      const opener = e.target.closest('[data-drawer-open-sub]');
      if (opener) {
        opener.setAttribute('aria-expanded', 'true');
        document.getElementById(opener.getAttribute('aria-controls')).classList.add('is-open');
        return;
      }
      const back = e.target.closest('[data-drawer-back]');
      if (back) {
        const panel = back.closest('.drawer__panel--sub');
        panel.classList.remove('is-open');
        const opener2 = drawer.querySelector(`[aria-controls="${panel.id}"]`);
        if (opener2) opener2.setAttribute('aria-expanded', 'false');
      }
    });
    mqDesktop.addEventListener('change', (e) => { if (e.matches) closeDrawer(); });
  }

  /* footer columns: accordions below 1024px */
  document.querySelectorAll('[data-footer-toggle]').forEach((b) => {
    b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); b.click(); } });
    b.addEventListener('click', () => {
      if (window.matchMedia('(min-width: 1024px)').matches) return;
      const col = b.closest('[data-footer-col]');
      const isOpen = col.classList.toggle('is-open');
      b.setAttribute('aria-expanded', String(isOpen));
    });
  });
})();
