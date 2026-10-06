/* ==========================================================================
   app.js — TST site behaviour.
   Progressive enhancement: the page is complete without JavaScript; GSAP adds
   scroll-linked motion when it loads, and everything degrades gracefully when
   it does not (CDN blocked, reduced motion, old browsers).
   Bundles: core (config, analytics, consent) · nav · motion · form
   ========================================================================== */
(function () {
  'use strict';

  const CONFIG = Object.assign({ gaMeasurementId: '', requireConsent: true, formEndpoint: '' }, window.TST_CONFIG || {});
  const html = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  /* ?nogsap — QA switch to exercise the static fallback without blocking the CDN */
  const hasGSAP = !/[?&]nogsap\b/.test(location.search) && typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const ANIM = hasGSAP && !reduce;
  if (hasGSAP) {
    window.gsap.registerPlugin(window.ScrollTrigger);
    /* ?debug — deterministic timing for headless screenshots / visual tests */
    if (/[?&]debug\b/.test(location.search)) window.gsap.ticker.lagSmoothing(0);
  }
  html.classList.toggle('has-anim', ANIM);
  window.__tstReady = true;

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.prototype.slice.call((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  /* ------------------------------------------------------- flight model
     The page is a descent: 12,500 ft at the top, touchdown at the footer.
     hud.js reads this for the hero dive and the ALT readout; the altimeter
     and the instrument panel stay in sync because both read the same object. */
  window.TST = window.TST || {};
  const MAX_ALT = 12500;
  const flight = (window.TST.flight = window.TST.flight || { boot: 0, dive: 0, scroll: 0, alt: MAX_ALT });
  let heroEl = null;
  function flightFromScroll() {
    heroEl = heroEl || document.querySelector('[data-hero]');
    const y = window.scrollY;
    const hh = heroEl ? heroEl.offsetHeight : innerHeight;
    flight.dive = clamp(y / Math.max(1, hh), 0, 1);
    const max = html.scrollHeight - innerHeight;
    flight.scroll = max > 0 ? clamp(y / max, 0, 1) : 0;
    flight.alt = Math.round((MAX_ALT * (1 - flight.scroll)) / 10) * 10;
    return flight;
  }
  flightFromScroll();
  window.TST.flightFromScroll = flightFromScroll;

  /* ------------------------------------------------------------ analytics
     GA4 through gtag with Consent Mode v2. Nothing loads until a Measurement ID
     is configured; with requireConsent the tag waits for the visitor's choice.
     Events pushed: page_view (GA), cta_click, nav_click, contact_click,
     section_view, scroll_depth, form_start, generate_lead, form_error.      */
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  const CONSENT_KEY = 'tst-consent';
  const store = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } }
  };
  const analytics = {
    loaded: false,
    track(name, params) {
      params = params || {};
      try {
        window.dataLayer.push(Object.assign({ event: name }, params));
        if (this.loaded) gtag('event', name, params);
      } catch (e) { /* never break the page for analytics */ }
    },
    load() {
      if (this.loaded || !CONFIG.gaMeasurementId) return;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(CONFIG.gaMeasurementId);
      document.head.appendChild(s);
      gtag('js', new Date());
      gtag('config', CONFIG.gaMeasurementId, { anonymize_ip: true });
      this.loaded = true;
    },
    grant() { gtag('consent', 'update', { analytics_storage: 'granted' }); store.set(CONSENT_KEY, 'granted'); this.load(); },
    deny() { gtag('consent', 'update', { analytics_storage: 'denied' }); store.set(CONSENT_KEY, 'denied'); },
    init() {
      if (!CONFIG.gaMeasurementId) return;
      gtag('consent', 'default', {
        ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
        analytics_storage: CONFIG.requireConsent ? 'denied' : 'granted', wait_for_update: 500
      });
      if (!CONFIG.requireConsent) { this.load(); return; }
      const choice = store.get(CONSENT_KEY);
      if (choice === 'granted') this.grant();
      else if (choice === 'denied') this.deny();
      else consentUI();
    }
  };
  function consentUI() {
    const box = $('[data-consent]');
    if (!box) return;
    box.hidden = false;
    $('[data-consent-accept]', box).addEventListener('click', () => { analytics.grant(); box.hidden = true; });
    $('[data-consent-decline]', box).addEventListener('click', () => { analytics.deny(); box.hidden = true; });
  }
  analytics.init();
  window.TST = Object.assign(window.TST || {}, { track: analytics.track.bind(analytics), analytics: analytics, config: CONFIG });

  /* declarative click tracking: <a data-track="cta_click" data-label="hero_demo"> */
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-track]');
    if (!el) return;
    analytics.track(el.getAttribute('data-track'), {
      label: el.getAttribute('data-label') || el.textContent.trim().slice(0, 60),
      href: el.getAttribute('href') || ''
    });
  });
  /* section views (once each) */
  if ('IntersectionObserver' in window) {
    const seen = new Set();
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting && !seen.has(en.target)) {
          seen.add(en.target);
          analytics.track('section_view', { section: en.target.getAttribute('data-section') });
        }
      });
    }, { threshold: 0.3 });
    $$('[data-section]').forEach((s) => io.observe(s));
  }
  /* scroll depth milestones */
  const depthMarks = [25, 50, 75, 100], depthHit = new Set();
  function scrollDepth() {
    const max = html.scrollHeight - innerHeight;
    if (max <= 0) return;
    const p = Math.round((scrollY / max) * 100);
    depthMarks.forEach((m) => { if (p >= m && !depthHit.has(m)) { depthHit.add(m); analytics.track('scroll_depth', { percent: m }); } });
  }

  /* shared state for the other bundles */
  const APP = { CONFIG, html, reduce, isCoarse, hasGSAP, ANIM, $, $$, clamp, analytics, scrollDepth, flight, flightFromScroll, MAX_ALT, menuOpen: false, suppressHideUntil: 0 };
  window.__TST_APP = APP;
})();


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


/* --------------------------------------------------------------- motion */
(function () {
  'use strict';
  const A = window.__TST_APP, { $, $$, ANIM, isCoarse } = A;

  /* ticker: duplicate content once for a seamless loop */
  const ticker = $('[data-ticker]');
  if (ticker) ticker.innerHTML += ticker.innerHTML;

  /* uptime grid cells (99.7% → one amber cell in 336) */
  $$('[data-uptime]').forEach((grid) => {
    const n = parseInt(grid.getAttribute('data-uptime'), 10) || 336;
    const down = parseInt(grid.getAttribute('data-uptime-down'), 10) || 0;
    const downIdx = new Set();
    for (let i = 0; i < down; i++) downIdx.add(Math.floor(((i + 0.62) * n) / Math.max(1, down)) % n);
    const frag = document.createDocumentFragment();
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      if (downIdx.has(i)) s.className = 'is-down';
      s.style.setProperty('--d', (i * 0.004).toFixed(3) + 's');
      frag.appendChild(s);
    }
    grid.appendChild(frag);
  });

  /* pointer spotlight on cards (desktop) */
  if (!isCoarse) {
    document.addEventListener('pointermove', (e) => {
      const card = e.target.closest('.card');
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - r.left).toFixed(1) + 'px');
      card.style.setProperty('--my', (e.clientY - r.top).toFixed(1) + 'px');
    }, { passive: true });
  }

  function counter(el) {
    const target = parseFloat(el.getAttribute('data-count'));
    const dec = parseInt(el.getAttribute('data-decimals') || '0', 10);
    if (!ANIM) { el.textContent = target.toFixed(dec); return; }
    const obj = { v: 0 };
    gsap.to(obj, { v: target, duration: 1.9, ease: 'power3.out', onUpdate: () => { el.textContent = obj.v.toFixed(dec); } });
  }

  /* ---------- static fallback (no GSAP or reduced motion) ---------- */
  if (!ANIM) {
    $$('[data-draw]').forEach((el) => el.classList.add('is-drawn'));
    $$('[data-uptime]').forEach((el) => el.classList.add('is-on'));
    $$('[data-count]').forEach(counter);
    $$('[data-chain-step]').forEach((s) => s.classList.add('is-lit'));
    const firstPoint = $('[data-tech-point]');
    if (firstPoint) firstPoint.classList.add('is-active');
    return;
  }

  /* ---------- hero entrance ---------- */
  const heroItems = $$('[data-hero-item]');
  const panel = $('[data-hero-panel]');
  const rule = $('[data-hero-rule] i');
  const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 });
  tl.to(heroItems.slice(0, 1), { opacity: 1, y: 0, duration: 0.8 })
    .to(heroItems.slice(1, 4), { opacity: 1, y: 0, duration: 0.9, stagger: 0.14 }, '-=0.5')
    .to(rule, { scaleX: 1, duration: 1.1, ease: 'power2.inOut' }, '-=0.55')
    .to(heroItems.slice(4, 5), { opacity: 1, y: 0, duration: 0.9 }, '-=0.8')
    .add('lock', '-=0.15')
    .to(heroItems.slice(5), { opacity: 1, y: 0, duration: 0.9, stagger: 0.1 }, 'lock-=0.3')
    .to(panel, { opacity: 1, y: 0, scale: 1, duration: 1.3 }, 0.55);

  /* target designator flies in and locks onto the headline */
  const lock = $('[data-lock]'), lockLabel = $('[data-lock-label]'), copy = $('.hero__copy'), result = $('.formula__result');
  let lockPlaced = false;
  function placeLock() {
    if (!lock || !copy || !result) return;
    /* measure the text itself, not the block box of the (full-width) line */
    const range = document.createRange(); range.selectNodeContents(result);
    const cr = copy.getBoundingClientRect(), rr = range.getBoundingClientRect();
    const padX = 16, padY = 6;
    gsap.set(lock, { left: rr.left - cr.left - padX, top: rr.top - cr.top - padY, width: rr.width + padX * 2, height: rr.height + padY * 2 });
    lockPlaced = true;
  }
  if (lock && result) {
    tl.call(placeLock, null, 'lock')
      .fromTo(lock, { opacity: 0, scale: 2.4, rotation: -5 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.9, ease: 'power4.out' }, 'lock')
      .fromTo(lockLabel, { opacity: 0 }, { opacity: 1, duration: 0.08, repeat: 4, yoyo: true, ease: 'none' }, 'lock+=0.55')
      .to(lock, { opacity: 0.3, duration: 1.0, ease: 'power2.out' }, 'lock+=1.6');
    let rt;
    addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (lockPlaced) placeLock(); }, 120); });
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (lockPlaced) placeLock(); });
  }
  const altimeter = $('[data-altimeter]');
  if (altimeter) tl.to(altimeter, { opacity: 1, duration: 1.2 }, 1.6);

  /* text decode on mono labels: hero ones ride the timeline, the rest trigger on scroll */
  const SCRAMBLE_CHARS = '0123456789ABCDEF/·-';
  function scramble(el, duration) {
    const final = el.getAttribute('data-final') || el.textContent;
    el.setAttribute('data-final', final);
    const obj = { p: 0 };
    gsap.to(obj, { p: 1, duration: duration || 0.9, ease: 'power2.out',
      onUpdate() {
        let out = '';
        for (let i = 0; i < final.length; i++) {
          const ch = final[i];
          out += (ch === ' ' || i < final.length * obj.p) ? ch : SCRAMBLE_CHARS[(Math.random() * SCRAMBLE_CHARS.length) | 0];
        }
        el.textContent = out;
      },
      onComplete() { el.textContent = final; } });
  }
  $$('[data-scramble]').forEach((el) => {
    if (el.closest('[data-hero]')) { tl.call(() => scramble(el, 1.1), null, 0.3); return; }
    ScrollTrigger.create({ trigger: el, start: 'top 92%', once: true, onEnter: () => scramble(el, 0.9) });
  });
  window.TST = Object.assign(window.TST || {}, { heroTimeline: tl });

  /* hero parallax out */
  const hero = $('[data-hero]');
  if (hero) {
    const st = { trigger: hero, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to('.hero__copy', { yPercent: -10, opacity: 0.25, ease: 'none', scrollTrigger: st });
    if (panel) gsap.to(panel, { yPercent: -18, ease: 'none', scrollTrigger: st });
    gsap.to('.hero__cue', { opacity: 0, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: '+=260', scrub: true } });
  }

  /* instrument panel tilt follows the shared pointer */
  if (panel && !isCoarse) {
    gsap.set(panel, { transformPerspective: 1100 });
    const rx = gsap.quickTo(panel, 'rotationX', { duration: 0.9, ease: 'power2' });
    const ry = gsap.quickTo(panel, 'rotationY', { duration: 0.9, ease: 'power2' });
    let lx = 0, ly = 0;
    gsap.ticker.add(() => {
      const p = window.TST && window.TST.pointer; if (!p) return;
      if (Math.abs(p.tx - lx) > 0.002 || Math.abs(p.ty - ly) > 0.002) {
        lx = p.tx; ly = p.ty; rx(-ly * 4.5); ry(lx * 6);
      }
    });
  }

  /* ---------- scroll reveals ----------
     Elements already above the viewport (anchor jumps, fast scrolls) snap to
     their final state instead of animating off-screen, so a jump never queues
     dozens of simultaneous tweens and transitions. */
  const passed = (el) => el.getBoundingClientRect().bottom < 0;
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 88%',
    once: true,
    onEnter: (els) => {
      const now = els.filter(passed), anim = els.filter((e) => !passed(e));
      if (now.length) { gsap.set(now, { opacity: 1, y: 0 }); now.forEach((e) => e.classList.add('is-revealed')); }
      if (anim.length) gsap.to(anim, {
        opacity: 1, y: 0, duration: 1.1, ease: 'power3.out', stagger: 0.09, overwrite: true,
        onComplete: () => anim.forEach((e) => e.classList.add('is-revealed'))
      });
    }
  });
  /* safety net: anything already above the viewport (reload mid-page) shows at once */
  function revealPassed() {
    $$('[data-reveal]').forEach((el) => { if (el.getBoundingClientRect().bottom < 0) gsap.set(el, { opacity: 1, y: 0 }); });
  }

  /* SVG draw-on */
  $$('[data-draw]').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => { if (passed(el)) el.classList.add('is-instant'); el.classList.add('is-drawn'); } }));

  /* process chain: progress line + lit nodes */
  const chain = $('[data-chain]');
  if (chain) {
    const bar = $('[data-chain-progress]');
    const steps = $$('[data-chain-step]', chain);
    gsap.to(bar, {
      scaleX: 1, ease: 'none',
      scrollTrigger: {
        trigger: chain, start: 'top 78%', end: 'bottom 40%', scrub: 0.6,
        onUpdate: (self) => { const lit = Math.round(self.progress * steps.length); steps.forEach((s, i) => s.classList.toggle('is-lit', i < lit)); }
      }
    });
    gsap.from(steps, { y: 30, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.1, scrollTrigger: { trigger: chain, start: 'top 85%', once: true } });
  }

  /* parallax media */
  $$('[data-parallax]').forEach((el) => {
    const amt = parseFloat(el.getAttribute('data-parallax')) || 10;
    const target = el.querySelector('.render') || el;
    gsap.fromTo(target, { yPercent: -amt / 2 }, { yPercent: amt / 2, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* technology: sticky media + active point */
  const points = $$('[data-tech-point]');
  const techLabel = $('[data-tech-label]');
  if (points.length) {
    points[0].classList.add('is-active');
    points.forEach((p, i) => ScrollTrigger.create({
      trigger: p, start: 'top 58%', end: 'bottom 58%',
      onToggle: (self) => {
        if (!self.isActive) return;
        points.forEach((q) => q.classList.toggle('is-active', q === p));
        if (techLabel) techLabel.textContent = 'LAYER 0' + (i + 1);
      }
    }));
    const fromStart = document.documentElement.dir === 'rtl' ? 40 : -40;   /* slide in from the reading-start side */
    gsap.from(points, { x: fromStart, opacity: 0, duration: 1, ease: 'power3.out', stagger: 0.12, scrollTrigger: { trigger: points[0], start: 'top 85%', once: true } });
  }

  /* counters + uptime grid */
  $$('[data-count]').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: () => counter(el) }));
  $$('[data-uptime]').forEach((el) => ScrollTrigger.create({ trigger: el, start: 'top 90%', once: true, onEnter: () => { if (passed(el)) el.classList.add('is-instant'); el.classList.add('is-on'); } }));

  /* magnetic buttons (desktop) */
  if (!isCoarse) {
    $$('[data-magnetic]').forEach((btn) => {
      const xTo = gsap.quickTo(btn, 'x', { duration: 0.55, ease: 'power3' });
      const yTo = gsap.quickTo(btn, 'y', { duration: 0.55, ease: 'power3' });
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        xTo((e.clientX - r.left - r.width / 2) * 0.22);
        yTo((e.clientY - r.top - r.height / 2) * 0.32);
      });
      btn.addEventListener('pointerleave', () => { xTo(0); yTo(0); });
    });
  }

  /* keep measurements accurate after web fonts swap in */
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
  addEventListener('load', () => { ScrollTrigger.refresh(); revealPassed(); });
})();


/* ----------------------------------------------------------------- form */
(function () {
  'use strict';
  const A = window.__TST_APP, { $, $$, CONFIG, analytics } = A;
  const form = $('[data-form]');
  if (!form) return;
  const status = $('[data-form-status]', form);
  const submit = $('[data-submit]', form);
  const HE = (document.documentElement.lang || '').toLowerCase().startsWith('he');
  const MSG = HE ? {
    required: 'שדה חובה',
    email: 'כתובת הדואר האלקטרוני אינה תקינה',
    demo: 'זהו אתר לדוגמה, ולכן הפנייה לא נשלחה. באתר האמיתי היא תגיע לתיבת הפניות של החברה.',
    ok: 'תודה, הפנייה התקבלה. נחזור אליכם בהקדם.',
    err: 'שליחת הפנייה נכשלה. אפשר לנסות שוב או לפנות אלינו ישירות בדואר אלקטרוני.'
  } : {
    required: 'This field is required',
    email: 'Please enter a valid email address',
    demo: 'This is a sample site, so the inquiry was not sent. On the live site it will reach the company inbox.',
    ok: 'Thank you, your inquiry has been received. We will get back to you shortly.',
    err: 'Sending failed. Please try again or email us directly.'
  };

  let started = false;
  form.addEventListener('focusin', () => {
    if (started) return;
    started = true;
    analytics.track('form_start', { form: 'contact' });
  });

  function setError(input, msg) {
    const field = input.closest('.field');
    const err = field && field.querySelector('.field__err');
    if (field) field.classList.toggle('is-invalid', !!msg);
    if (err) err.textContent = msg || '';
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }
  function validate() {
    let ok = true, first = null;
    $$('input[required], textarea[required]', form).forEach((input) => {
      const v = input.value.trim();
      let msg = '';
      if (!v) msg = MSG.required;
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) msg = MSG.email;
      setError(input, msg);
      if (msg) { ok = false; first = first || input; }
    });
    if (first) first.focus();
    return ok;
  }
  $$('input, textarea', form).forEach((i) => i.addEventListener('input', () => {
    const f = i.closest('.field');
    if (f && f.classList.contains('is-invalid')) setError(i, '');
  }));
  function show(msg, kind) {
    status.hidden = false;
    status.textContent = msg;
    status.className = 'form__status' + (kind ? ' is-' + kind : '');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.hidden = true;
    /* honeypot filled → silently drop */
    if (form.elements._company && form.elements._company.value) { show(MSG.ok, 'success'); return; }
    if (!validate()) { analytics.track('form_error', { form: 'contact', reason: 'validation' }); return; }

    const data = {};
    new FormData(form).forEach((v, k) => { if (k !== '_company') data[k] = v; });
    data.page = location.href;

    if (!CONFIG.formEndpoint) {
      show(MSG.demo);
      analytics.track('generate_lead', { form: 'contact', topic: data.topic, mode: 'demo' });
      return;
    }
    submit.classList.add('is-loading'); submit.disabled = true;
    fetch(CONFIG.formEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(data)
    }).then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      show(MSG.ok, 'success');
      form.reset();
      analytics.track('generate_lead', { form: 'contact', topic: data.topic });
    }).catch(() => {
      show(MSG.err, 'error');
      analytics.track('form_error', { form: 'contact', reason: 'network' });
    }).finally(() => {
      submit.classList.remove('is-loading'); submit.disabled = false;
    });
  });
})();


/* ------------------------------------------------------------ altimeter
   Fixed altitude tape on the page edge: the scroll position is read as
   altitude (12,500 ft at the top, 0 at the footer). Section waypoints on the
   tape are real links; the readout is synced with the hero instrument panel
   through the shared flight model. Desktop only (phones keep the thin bar). */
(function () {
  'use strict';
  const A = window.__TST_APP, { $, $$, ANIM, html, clamp, MAX_ALT } = A;
  const root = $('[data-altimeter]');
  if (!root) return;
  const strip = $('[data-alt-strip]', root);
  const value = $('[data-alt-value]', root);
  const secEl = $('[data-alt-section]', root);
  const PX_PER_FT = 0.24;                            /* 1,000 ft of altitude = 240 px of tape */
  const mq = matchMedia('(min-width: 1240px)');
  const sections = $$('[data-section]');
  let marks = [], current = -2;

  /* tape labels every 500 ft */
  const frag = document.createDocumentFragment();
  for (let a = 0; a <= MAX_ALT; a += 500) {
    const s = document.createElement('span');
    s.textContent = a.toLocaleString('en-US');
    s.setAttribute('aria-hidden', 'true');
    s.style.top = ((MAX_ALT - a) * PX_PER_FT).toFixed(1) + 'px';
    frag.appendChild(s);
  }
  strip.style.height = (MAX_ALT * PX_PER_FT) + 'px';
  strip.appendChild(frag);

  /* section waypoints */
  function layoutMarks() {
    marks.forEach((m) => m.remove()); marks = [];
    const max = html.scrollHeight - innerHeight;
    sections.forEach((s, i) => {
      const top = s.getBoundingClientRect().top + scrollY - 72;
      const p = max > 0 ? clamp(top / max, 0, 1) : 0;
      const a = document.createElement('a');
      a.href = '#' + s.id;
      a.className = 'altimeter__mark';
      a.style.top = (p * MAX_ALT * PX_PER_FT).toFixed(1) + 'px';
      const h2 = s.querySelector('h2');
      a.setAttribute('aria-label', h2 ? h2.textContent.trim() : s.id);
      a.innerHTML = '<span>' + String(i + 1).padStart(2, '0') + '</span><i></i>';
      strip.appendChild(a);
      marks.push(a);
    });
    current = -2;
  }

  const num = { v: MAX_ALT };
  const fmt = (v) => Math.max(0, Math.round(v / 10) * 10).toLocaleString('en-US');
  let yTo = null, vTo = null;
  if (ANIM) {
    yTo = gsap.quickTo(strip, 'y', { duration: 0.6, ease: 'power3' });
    vTo = gsap.quickTo(num, 'v', { duration: 0.6, ease: 'power3', onUpdate: () => { value.textContent = fmt(num.v); } });
  }
  function update() {
    if (!mq.matches) return;
    const f = A.flightFromScroll();
    const y = root.clientHeight / 2 - (MAX_ALT - f.alt) * PX_PER_FT;
    if (yTo) { yTo(y); vTo(f.alt); }
    else { strip.style.transform = 'translateY(' + y.toFixed(1) + 'px)'; value.textContent = fmt(f.alt); }
    let idx = -1;
    const probe = scrollY + innerHeight * 0.45;
    for (let i = 0; i < sections.length; i++) if (sections[i].getBoundingClientRect().top + scrollY <= probe) idx = i;
    if (idx !== current) {
      current = idx;
      marks.forEach((m, i) => m.classList.toggle('is-current', i === idx));
      secEl.textContent = idx < 0 ? '00 · TST' : String(idx + 1).padStart(2, '0') + ' · ' + (sections[idx].getAttribute('data-section') || '').toUpperCase();
    }
  }

  let ticking = false;
  addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });
  let rt;
  addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { layoutMarks(); update(); }, 150); });
  addEventListener('load', () => { layoutMarks(); update(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { layoutMarks(); update(); });
  layoutMarks();
  update();
})();
