
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
