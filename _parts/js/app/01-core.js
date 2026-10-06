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
