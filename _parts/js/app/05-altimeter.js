
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
