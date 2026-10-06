
/* ------------------------------------------------------------------ nav */
(function () {
  'use strict';
  const A = window.__TST_APP, { $, $$, ANIM, html } = A;
  const nav = $('[data-nav]');
  const progress = $('[data-progress]');
  const burger = $('[data-menu-toggle]');
  const menu = $('[data-menu]');
  if (!nav) return;

  /* scroll state: glass background, hide on scroll down / show on scroll up */
  let lastY = scrollY, ticking = false;
  function onScroll() {
    const y = scrollY;
    A.flightFromScroll();
    nav.classList.toggle('is-scrolled', y > 24);
    const hide = y > lastY + 6 && y > 360 && !A.menuOpen && performance.now() > A.suppressHideUntil;
    if (hide) nav.classList.add('is-hidden');
    else if (y < lastY - 2 || y < 360) nav.classList.remove('is-hidden');
    lastY = y;
    if (progress && !ANIM) {
      const max = html.scrollHeight - innerHeight;
      progress.style.transform = 'scaleX(' + (max > 0 ? y / max : 0) + ')';
    }
    A.scrollDepth();
  }
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { onScroll(); ticking = false; });
  }, { passive: true });
  onScroll();
  if (ANIM && progress) {
    gsap.to(progress, { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: 0.4 } });
  }

  /* keep the nav visible while an anchor jump scrolls the page */
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    A.suppressHideUntil = performance.now() + 1200;
    nav.classList.remove('is-hidden');
    if (a.hasAttribute('data-nav-link')) A.analytics.track('nav_click', { target: a.getAttribute('href') });
  });

  /* active section link */
  const links = $$('[data-nav-link]');
  if (links.length && 'IntersectionObserver' in window) {
    const byId = {};
    links.forEach((l) => { byId[l.getAttribute('href').slice(1)] = l; });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        links.forEach((l) => l.classList.remove('is-active'));
        const l = byId[en.target.id];
        if (l) l.classList.add('is-active');
      });
    }, { rootMargin: '-40% 0px -55% 0px', threshold: 0 });
    Object.keys(byId).forEach((id) => { const s = document.getElementById(id); if (s) io.observe(s); });
  }

  /* mobile menu with focus trap */
  if (burger && menu) {
    const focusables = () => $$('a[href], button:not([disabled])', menu);
    function open() {
      menu.hidden = false;
      requestAnimationFrame(() => menu.classList.add('is-open'));
      document.body.classList.add('menu-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', burger.getAttribute('data-label-close') || 'Close menu');
      A.menuOpen = true;
      nav.classList.remove('is-hidden');
      const f = focusables(); if (f[0]) f[0].focus();
      document.addEventListener('keydown', onKey);
    }
    function close(restoreFocus) {
      menu.classList.remove('is-open');
      document.body.classList.remove('menu-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', burger.getAttribute('data-label-open') || 'Open menu');
      A.menuOpen = false;
      document.removeEventListener('keydown', onKey);
      setTimeout(() => { menu.hidden = true; }, 250);
      if (restoreFocus) burger.focus();
    }
    function onKey(e) {
      if (e.key === 'Escape') { close(true); return; }
      if (e.key !== 'Tab') return;
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); burger.focus(); }
      else if (!e.shiftKey && document.activeElement === burger) { e.preventDefault(); first.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); burger.focus(); }
    }
    burger.addEventListener('click', () => (A.menuOpen ? close(true) : open()));
    $$('[data-menu-link]', menu).forEach((l) => l.addEventListener('click', () => close(false)));
    matchMedia('(min-width: 1101px)').addEventListener('change', (e) => { if (e.matches && A.menuOpen) close(false); });
  }

  /* UTC clock in the instrument panel */
  const clock = $('[data-clock]');
  if (clock) {
    const tick = () => {
      const d = new Date();
      clock.textContent = [d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds()].map((n) => String(n).padStart(2, '0')).join(':') + 'Z';
    };
    tick(); setInterval(tick, 1000);
  }
})();
