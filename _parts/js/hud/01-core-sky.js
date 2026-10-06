/* ==========================================================================
   hud.js — canvas instruments for TST. Zero dependencies.
   - sky:       perspective wireframe terrain + HUD, approach sequence on
                load, scroll-linked dive, speed streaks, DOM readouts (hero)
   - takeoff:   runway takeoff roll, rotation and climb seen from the cockpit,
                with HUD symbology and a canopy frame (banner)
   - radar:     sweeping PPI scope with afterglow targets
   - pointcloud: rotating 3D "scan" of an aircraft
   Every instrument pauses off-screen and when the tab is hidden, caps DPR,
   and renders one static frame when the user prefers reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = matchMedia('(pointer: coarse)').matches;
  const DPR_CAP = isCoarse ? 1.5 : 2;
  const MONO = '"IBM Plex Mono", Consolas, Menlo, monospace';

  window.TST = window.TST || {};
  const pointer = (window.TST.pointer = window.TST.pointer || { x: 0, y: 0, tx: 0, ty: 0 });
  if (!isCoarse) {
    addEventListener('pointermove', (e) => {
      pointer.tx = (e.clientX / innerWidth) * 2 - 1;
      pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  const flight = (window.TST.flight = window.TST.flight || { boot: 0, dive: 0, scroll: 0, alt: 12500 });
  if (reduce) flight.boot = 1;

  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

  /* Generic instrument runner: sizing, DPR, visibility, rAF loop. */
  function instrument(canvas, setup, ctxOpts) {
    const ctx = canvas.getContext('2d', ctxOpts || {});
    if (!ctx) return null;
    const st = { w: 0, h: 0, dpr: 1, t: 0, running: false, visible: false, raf: 0, last: 0 };
    const api = setup(ctx, st, canvas);
    function resize() {
      /* layout size, not the transformed box: the hero panel scales in during its entrance */
      const cw = canvas.clientWidth, ch = canvas.clientHeight;
      if (cw < 2 || ch < 2) return;
      st.w = cw; st.h = ch;
      st.dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
      canvas.width = Math.round(st.w * st.dpr);
      canvas.height = Math.round(st.h * st.dpr);
      ctx.setTransform(st.dpr, 0, 0, st.dpr, 0, 0);
      if (api.resize) api.resize();
      api.draw(0);
    }
    let tick = 0;
    function frame(now) {
      if (!st.running) return;
      const dt = Math.min(0.05, (now - st.last) / 1000 || 0.016);
      st.last = now; st.t += dt;
      if ((++tick & 63) === 0 && (canvas.clientWidth !== st.w || canvas.clientHeight !== st.h)) resize();
      try { api.draw(dt); } catch (e) { /* never let one bad frame kill the instrument */ }
      st.raf = requestAnimationFrame(frame);
    }
    function start() { if (st.running || reduce) return; st.running = true; st.last = performance.now(); st.raf = requestAnimationFrame(frame); }
    function stop() { st.running = false; cancelAnimationFrame(st.raf); }
    new ResizeObserver(() => resize()).observe(canvas);
    new IntersectionObserver(([e]) => { st.visible = e.isIntersecting; if (st.visible && !document.hidden) start(); else stop(); }, { rootMargin: '120px' }).observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else if (st.visible) start(); });
    resize();
    return { start, stop, resize, state: st };
  }

  /* shared HUD helpers */
  function hudLabel(ctx, txt, x, y, align, alpha, size) {
    ctx.font = (size || 11) + 'px ' + MONO; ctx.textAlign = align; ctx.textBaseline = 'middle';
    ctx.fillStyle = 'rgba(159,225,255,' + alpha + ')'; ctx.fillText(txt, x, y);
  }
  function smoothPath(ctx, points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length - 1; i++) {
      const mx = (points[i][0] + points[i + 1][0]) / 2, my = (points[i][1] + points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(points[i][0], points[i][1], mx, my);
    }
    ctx.lineTo(points[points.length - 1][0], points[points.length - 1][1]);
    ctx.stroke();
  }
  /* canopy frame, glareshield and displays */
  function canopy(ctx, w, h, t, eb, ox) {
    ctx.save(); ctx.translate(ox || 0, 0);
    const X = (x) => (x / 1200) * w, Y = (y) => (y / 600) * h;
    const outer = [[-40, 640], [120, 300], [380, 120], [600, 70], [820, 120], [1080, 300], [1240, 640]].map(([x, y]) => [X(x), Y(y)]);
    const inner = [[20, 640], [170, 330], [410, 160], [600, 112], [790, 160], [1030, 330], [1180, 640]].map(([x, y]) => [X(x), Y(y)]);
    const tint = ctx.createLinearGradient(0, Y(70), 0, Y(400));
    tint.addColorStop(0, 'rgba(92,200,255,.10)'); tint.addColorStop(1, 'rgba(92,200,255,0)');
    ctx.fillStyle = tint; ctx.beginPath();
    inner.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(159,225,255,' + (0.6 * eb).toFixed(3) + ')'; ctx.lineWidth = 3; smoothPath(ctx, outer);
    ctx.strokeStyle = 'rgba(139,154,170,' + (0.55 * eb).toFixed(3) + ')'; ctx.lineWidth = 1; smoothPath(ctx, inner);
    ctx.beginPath();
    [1, 2, 4, 5].forEach((i) => { ctx.moveTo(outer[i][0], outer[i][1]); ctx.lineTo(inner[i][0], inner[i][1]); });
    ctx.stroke();
    ctx.fillStyle = '#0b1118';
    ctx.beginPath(); ctx.moveTo(-w, h); ctx.lineTo(-w, Y(580)); ctx.lineTo(0, Y(540)); ctx.lineTo(X(280), Y(500)); ctx.lineTo(X(920), Y(500)); ctx.lineTo(w, Y(540)); ctx.lineTo(2 * w, Y(580)); ctx.lineTo(2 * w, h); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(92,200,255,.55)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-w, Y(580)); ctx.lineTo(0, Y(540)); ctx.lineTo(X(280), Y(500)); ctx.lineTo(X(920), Y(500)); ctx.lineTo(w, Y(540)); ctx.lineTo(2 * w, Y(580)); ctx.stroke();
    [330, 540, 750].forEach((px, k) => {
      const x = X(px), y = Y(516), mw = X(130), mh = Y(72);
      const glow = 0.06 + 0.04 * (0.5 + 0.5 * Math.sin(t * 1.3 + k));
      ctx.fillStyle = 'rgba(92,200,255,' + glow.toFixed(3) + ')'; ctx.fillRect(x, y, mw, mh);
      ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 1; ctx.strokeRect(x, y, mw, mh);
      ctx.strokeStyle = 'rgba(150,180,205,.18)';
      ctx.beginPath(); ctx.moveTo(x + 8, y + mh * 0.35); ctx.lineTo(x + mw - 8, y + mh * 0.35); ctx.moveTo(x + 8, y + mh * 0.65); ctx.lineTo(x + mw - 8, y + mh * 0.65); ctx.stroke();
    });
    ctx.restore();
  }
  function terrainHeight(x, z) {
    const base = Math.sin(x * 0.11 + z * 0.07) * 0.6 + Math.sin(x * 0.23 - z * 0.11) * 0.35
               + Math.sin(x * 0.04 + z * 0.031) * 1.1 + Math.cos(x * 0.17 + z * 0.05) * 0.3;
    const valley = Math.min(1, Math.abs(x) / 7);
    return Math.max(-0.35, base) * (0.2 + valley * 1.7);
  }

  /* ------------------------------------------------------------------ SKY (hero)
     Night flight at altitude: ranges of mountains layered into blue haze, towns
     and the odd airfield drifting through the valleys below, stars above, HUD
     symbology on top. Approach sequence on load, dive on scroll, pointer roll. */
  function sky(ctx, st) {
    let ROWS = isCoarse ? 9 : 14, COLS = isCoarse ? 44 : 72;
    const Z_NEAR = 1.0, Z_FAR = 64, BASE_CAM = 6.5, BASE_SPEED = 1.5;
    const rnd = mulberry32(7);
    let stars = [], streaks = [], wisps = [], dist = 0, readoutClock = 0, ema = 0.016, slowFor = 0;
    let skyGrad = null, glowGrad = null, vignette = null, gradHorizon = -1;
    const readouts = { hdg: document.querySelector('[data-readout="hdg"]'), alt: document.querySelector('[data-readout="alt"]'), spd: document.querySelector('[data-readout="spd"]') };
    const hash = (a, b) => { let v = (a * 374761393 + b * 668265263) | 0; v = Math.imul(v ^ (v >>> 13), 1274126177); return ((v ^ (v >>> 16)) >>> 0) / 4294967296; };
    const relief = (x, z) => terrainHeight(x * 0.55, z * 0.45) * (0.5 + z * 0.06);   /* far ranges grow so they cut the horizon */

    function resize() {
      skyGrad = null; vignette = null; gradHorizon = -1;
      stars = []; const n = Math.round((st.w * st.h) / 7000);
      for (let i = 0; i < n; i++) stars.push({ x: rnd(), y: rnd() * 0.6, r: rnd() * 1.3 + 0.3, p: rnd() * Math.PI * 2 });
      streaks = []; for (let i = 0; i < (isCoarse ? 22 : 44); i++) streaks.push({ a: rnd() * Math.PI * 2, r: rnd(), v: 0.5 + rnd() * 0.9, len: 0.05 + rnd() * 0.09 });
      wisps = []; for (let i = 0; i < 7; i++) wisps.push({ x: rnd() * 1.4 - 0.2, z: 5 + rnd() * 28, w: 0.16 + rnd() * 0.26, h: 0.035 + rnd() * 0.04, a: 0.045 + rnd() * 0.05 });
    }
    function draw(dt) {
      const { w, h, t } = st;
      if (dt > 0) {
        ema += (dt - ema) * 0.08;
        if (ema > 0.024) { slowFor += dt; if (slowFor > 1.2 && ROWS > 6) { ROWS -= 2; COLS = Math.max(40, Math.round(COLS * 0.85)); slowFor = 0; ema = 0.016; } }
        else slowFor = 0;
        if (flight.boot < 1) flight.boot = Math.min(1, flight.boot + dt / 3.4);
      }
      const boot = flight.boot, eb = easeOut(boot), dive = flight.dive || 0;
      pointer.x += (pointer.tx - pointer.x) * 0.035; pointer.y += (pointer.ty - pointer.y) * 0.035;
      const roll = -pointer.x * 0.07 + Math.sin(t * 0.35) * 0.012;
      const camH = BASE_CAM + (15 - BASE_CAM) * (1 - eb) - dive * 3 + Math.sin(t * 0.5) * 0.08;
      const speed = BASE_SPEED + (9 - BASE_SPEED) * (1 - eb) + dive * 6;
      if (dt > 0) dist += speed * dt;
      const horizon = h * 0.44 + pointer.y * h * 0.03 - dive * h * 0.16 + (1 - eb) * h * 0.06;
      const f = Math.min(h * 0.95, w * 0.95), cx = w * 0.5, compact = w < 720;

      /* sky, stars, horizon glow */
      if (!skyGrad || Math.abs(horizon - gradHorizon) > 0.5) {
        gradHorizon = horizon;
        skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizon)); skyGrad.addColorStop(0, '#04070b'); skyGrad.addColorStop(0.6, '#0a1a2a'); skyGrad.addColorStop(1, '#1b4b6a');
        glowGrad = ctx.createRadialGradient(cx, horizon, 0, cx, horizon, w * 0.6); glowGrad.addColorStop(0, 'rgba(92,200,255,.22)'); glowGrad.addColorStop(1, 'rgba(92,200,255,0)');
      }
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d6ecff';
      for (let i = 0; i < stars.length; i++) { const s = stars[i]; ctx.globalAlpha = 0.25 + 0.5 * (0.5 + 0.5 * Math.sin(t * 1.3 + s.p)); ctx.fillRect(s.x * w, s.y * horizon, s.r, s.r); }
      ctx.globalAlpha = 1;
      ctx.fillStyle = glowGrad; ctx.fillRect(0, 0, w, h);

      /* layered ranges with valley lights, far to near, rolled about the horizon */
      ctx.save(); ctx.translate(cx, horizon); ctx.rotate(roll); ctx.translate(-cx, -horizon);
      ctx.lineWidth = 1; ctx.lineJoin = 'round';
      for (let j = ROWS; j >= 0; j--) {
        const z = Z_NEAR * Math.pow(Z_FAR / Z_NEAR, j / ROWS), k = f / z, depth = j / ROWS;
        const zNext = Z_NEAR * Math.pow(Z_FAR / Z_NEAR, Math.min(ROWS, j + 1) / ROWS);
        ctx.beginPath(); ctx.moveTo(-w * 0.1, h + 10);
        for (let i = 0; i <= COLS; i++) {
          const sx = -w * 0.1 + (i / COLS) * w * 1.2, xw = (sx - cx) / k;
          ctx.lineTo(sx, horizon + (camH - relief(xw, z + dist)) * k);
        }
        ctx.lineTo(w * 1.1, h + 10); ctx.closePath();
        const m = Math.pow(depth, 1.25);
        ctx.fillStyle = 'rgb(' + Math.round(6 + 9 * m) + ',' + Math.round(10 + 28 * m) + ',' + Math.round(15 + 46 * m) + ')';
        ctx.fill();
        ctx.strokeStyle = 'rgba(140,210,245,' + (0.08 + 0.3 * (1 - depth)).toFixed(3) + ')'; ctx.stroke();
        /* settlements on the valley floors of this depth band */
        if (j < ROWS) {
          const half = (w * 0.62) / k, zA = z + dist, zB = zNext + dist;
          const cell = 3, maxZ = Math.min(zB, zA + 26);
          for (let cz = Math.floor(zA / cell) * cell; cz < maxZ; cz += cell) {
            for (let cxw = Math.floor(-half / cell) * cell; cxw <= half; cxw += cell) {
              const hcell = hash(cxw / cell, cz / cell);
              if (hcell > 0.3) continue;
              const amp = 0.5 + (cz - dist) * 0.06;
              const n = 4 + Math.floor(hcell * 90);
              for (let q = 0; q < n; q++) {
                const lx = cxw + hash(q + 11, cz) * cell, lz = cz + hash(cxw, q + 7) * cell;
                const zr = lz - dist; if (zr < Z_NEAR) continue;
                const yw = relief(lx, lz); if (yw > 0.55 * amp) continue;
                const kk = f / zr, sx = cx + lx * kk, sy = horizon + (camH - yw) * kk;
                if (sx < -10 || sx > w + 10 || sy > h) continue;
                const d = 1 - Math.min(1, zr / Z_FAR), size = 1 + 1.6 * d;
                const warm = hash(q, cxw + cz) < 0.6;
                ctx.globalAlpha = (0.5 + 0.5 * d) * (0.8 + 0.2 * Math.sin(t * 1.6 + q + cxw));
                ctx.fillStyle = warm ? '#ffd7a3' : '#d4ebff';
                ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
              }
              /* an airfield now and then: twin rows of white edge lights with a green threshold */
              if (hcell < 0.012) {
                for (let q = 0; q <= 8; q++) {
                  const lz = cz + 0.3 + q * 0.3, zr = lz - dist; if (zr < Z_NEAR) continue;
                  const yw = relief(cxw + 1.5, lz), kk = f / zr, sy = horizon + (camH - yw) * kk;
                  ctx.globalAlpha = 0.9; ctx.fillStyle = q === 0 ? '#7ef0b0' : '#eaf6ff';
                  ctx.fillRect(cx + (cxw + 1.2) * kk - 1, sy - 1, 2, 2); ctx.fillRect(cx + (cxw + 1.8) * kk - 1, sy - 1, 2, 2);
                }
              }
            }
          }
          /* red obstruction beacons on the high ground */
          for (let cxw = Math.floor(-half / 8) * 8; cxw <= half; cxw += 8) {
            const cz = Math.floor(zA / 8) * 8, hb = hash(cxw / 8 + 99, cz / 8);
            if (hb > 0.08) continue;
            const zr = cz + 4 - dist; if (zr < Z_NEAR || zr > zB - dist + 8) continue;
            const yw = relief(cxw, cz + 4), kk = f / zr, blink = Math.sin(t * 2.6 + hb * 40) > 0.5;
            if (!blink) continue;
            ctx.globalAlpha = 0.9; ctx.fillStyle = '#ff5c5c';
            ctx.beginPath(); ctx.arc(cx + cxw * kk, horizon + (camH - yw - 0.25) * kk, 1.6, 0, Math.PI * 2); ctx.fill();
          }
          ctx.globalAlpha = 1;
        }
      }
      /* thin cloud wisps between the camera and the far ranges */
      for (let i = 0; i < wisps.length; i++) {
        const c = wisps[i]; if (dt > 0) { c.x -= dt * speed * 0.006 / (c.z * 0.08); if (c.x < -0.3) { c.x = 1.25; c.z = 5 + rnd() * 28; } }
        const kk = f / c.z, cyw = horizon + (camH - 3.2) * kk, rw = w * c.w * (1 + 6 / c.z), rh = h * c.h * (1 + 6 / c.z);
        if (cyw > h + rh) continue;
        const g = ctx.createRadialGradient(w * c.x, cyw, 0, w * c.x, cyw, rw);
        g.addColorStop(0, 'rgba(150,200,235,' + (c.a * eb).toFixed(3) + ')'); g.addColorStop(1, 'rgba(150,200,235,0)');
        ctx.fillStyle = g; ctx.save(); ctx.translate(w * c.x, cyw); ctx.scale(1, rh / rw); ctx.beginPath(); ctx.arc(0, 0, rw, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      }
      /* HUD boots with a brief flicker, then holds steady */
      const hudA = boot < 0.06 ? 0 : boot < 0.55 ? (0.35 + 0.65 * ((boot - 0.06) / 0.49)) * (Math.sin(t * 57) > -0.55 ? 1 : 0.45) : 1;
      ctx.globalAlpha = hudA;
      const pxDeg = Math.min(h, w * 1.4) / 70;
      ctx.strokeStyle = compact ? 'rgba(92,200,255,.28)' : 'rgba(92,200,255,.5)'; ctx.lineWidth = 1.2;
      (compact ? [-5, 5] : [-10, -5, 5, 10]).forEach((deg) => {
        const y = horizon - deg * pxDeg, half = compact ? 50 : 70, len = (compact ? 60 : 90) * eb;
        ctx.beginPath();
        ctx.moveTo(cx - half - len, y); ctx.lineTo(cx - half, y); ctx.moveTo(cx + half, y); ctx.lineTo(cx + half + len, y);
        ctx.moveTo(cx - half, y); ctx.lineTo(cx - half, y + (deg > 0 ? 8 : -8)); ctx.moveTo(cx + half, y); ctx.lineTo(cx + half, y + (deg > 0 ? 8 : -8));
        ctx.stroke();
        hudLabel(ctx, String(Math.abs(deg)), cx - half - len - 16, y, 'center', 0.55);
        hudLabel(ctx, String(Math.abs(deg)), cx + half + len + 16, y, 'center', 0.55);
      });
      ctx.restore();
      ctx.globalAlpha = hudA;
      const by = h * 0.44, lockR = 9 + 42 * (1 - eb);
      ctx.strokeStyle = 'rgba(159,225,255,.75)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.arc(cx, by, lockR, 0, Math.PI * 2);
      ctx.moveTo(cx - lockR - 25, by); ctx.lineTo(cx - lockR - 5, by); ctx.moveTo(cx + lockR + 5, by); ctx.lineTo(cx + lockR + 25, by); ctx.moveTo(cx, by - lockR - 13); ctx.lineTo(cx, by - lockR - 4);
      ctx.stroke();
      const hdg = ((240 + pointer.x * 14 + Math.sin(t * 0.21) * 2.5) * eb + 360) % 360;
      if (!compact) {
        const tapeY = 104, pxPerDeg = 6;
        ctx.strokeStyle = 'rgba(92,200,255,.45)'; ctx.lineWidth = 1;
        for (let d = Math.floor(hdg / 5) * 5 - 30; d <= hdg + 30; d += 5) {
          const x = cx + (d - hdg) * pxPerDeg, major = ((d % 10) + 10) % 10 === 0;
          ctx.beginPath(); ctx.moveTo(x, tapeY); ctx.lineTo(x, tapeY + (major ? 12 : 6)); ctx.stroke();
          if (major) hudLabel(ctx, String(((d % 360) + 360) % 360).padStart(3, '0'), x, tapeY - 10, 'center', 0.5);
        }
        ctx.fillStyle = 'rgba(159,225,255,.85)';
        ctx.beginPath(); ctx.moveTo(cx, tapeY + 20); ctx.lineTo(cx - 5, tapeY + 29); ctx.lineTo(cx + 5, tapeY + 29); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
      /* speed streaks while accelerating (approach) or diving (scroll) */
      const si = Math.max(1 - eb, dive * 0.8);
      if (si > 0.02) {
        ctx.lineWidth = 1; ctx.lineCap = 'round';
        for (let i = 0; i < streaks.length; i++) {
          const s = streaks[i];
          if (dt > 0) { s.r += s.v * dt * (0.6 + 2.5 * si); if (s.r > 1.3) s.r = 0.04 + rnd() * 0.1; }
          const x = cx + Math.cos(s.a) * s.r * w * 0.7, y = horizon + Math.sin(s.a) * s.r * h * 0.7, L = s.len * (0.5 + si) * w * s.r;
          ctx.strokeStyle = 'rgba(159,225,255,' + (si * 0.55 * s.r).toFixed(3) + ')';
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - Math.cos(s.a) * L, y - Math.sin(s.a) * L); ctx.stroke();
        }
      }
      if (boot < 1) {
        const bsY = eb * h * 1.25 - h * 0.1, bg2 = ctx.createLinearGradient(0, bsY - 70, 0, bsY);
        bg2.addColorStop(0, 'rgba(159,225,255,0)'); bg2.addColorStop(1, 'rgba(159,225,255,' + (0.16 * (1 - boot)).toFixed(3) + ')');
        ctx.fillStyle = bg2; ctx.fillRect(0, bsY - 70, w, 70);
        ctx.fillStyle = 'rgba(220,245,255,' + (0.5 * (1 - boot)).toFixed(3) + ')'; ctx.fillRect(0, bsY, w, 1.5);
      }
      const sy = ((t * 0.09) % 1) * h, sg = ctx.createLinearGradient(0, sy - 60, 0, sy + 60);
      sg.addColorStop(0, 'rgba(159,225,255,0)'); sg.addColorStop(0.5, 'rgba(159,225,255,.04)'); sg.addColorStop(1, 'rgba(159,225,255,0)');
      ctx.fillStyle = sg; ctx.fillRect(0, sy - 60, w, 120);
      if (!vignette) { vignette = ctx.createRadialGradient(cx, h * 0.5, h * 0.3, cx, h * 0.5, Math.max(w, h) * 0.75); vignette.addColorStop(0, 'rgba(7,11,16,0)'); vignette.addColorStop(1, 'rgba(7,11,16,.72)'); }
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
      readoutClock += 1;
      if (readoutClock % 6 === 0) {
        const altTarget = (flight.alt != null ? flight.alt : 12500) + Math.sin(t * 0.13) * 40 - pointer.y * 60;
        const alt = Math.max(0, Math.round((altTarget * eb) / 10) * 10), spd = Math.round((420 + Math.sin(t * 0.19) * 9) * eb + dive * 60);
        if (readouts.hdg) readouts.hdg.textContent = String(Math.round(hdg)).padStart(3, '0');
        if (readouts.alt) readouts.alt.textContent = alt.toLocaleString('en-US');
        if (readouts.spd) readouts.spd.textContent = String(spd);
      }
    }
    return { resize, draw };
  }

  /* ------------------------------------------------------------- TAKEOFF (banner)
     World units are metres. The runway runs from z=0 to z=L; the camera rolls,
     rotates at ~6.2 s, lifts off and climbs, then the loop fades and restarts. */
  function takeoff(ctx, st) {
    const L = 1900, HALF = 15, EYE = 4, LOOP = 14.5;
    const RTL = document.documentElement.dir === 'rtl';
    const rnd = mulberry32(31);
    let stars = [], cityLights = [], lt = 0, camZ = 40, camH = EYE, prevH = EYE, boot = 0;
    let skyGrad = null, gradHorizon = -1;
    for (let i = 0; i < 190; i++) cityLights.push({ x: (rnd() * 2 - 1) * 5200, z: 2300 + rnd() * 7000, r: 0.9 + rnd() * 1.2, warm: rnd() < 0.55 });
    function resize() {
      skyGrad = null; gradHorizon = -1;
      stars = []; const n = Math.round((st.w * st.h) / 12000);
      for (let i = 0; i < n; i++) stars.push({ x: rnd(), y: rnd() * 0.6, r: rnd() * 1.2 + 0.3, p: rnd() * Math.PI * 2 });
    }
    const cam = { h: 2, z: 0, pitch: 0, roll: 0, f: 1, cx: 0, cy: 0 };
    function project(x, y, z) {
      const dz = z - cam.z; if (dz <= 0.6) return null;
      const dy = y - cam.h, cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch);
      const yc = dy * cp - dz * sp, zc = dy * sp + dz * cp;
      if (zc <= 0.6) return null;
      let sx = cam.f * x / zc, sy = -cam.f * yc / zc;
      if (cam.roll) { const cr = Math.cos(cam.roll), sr = Math.sin(cam.roll); const rx = sx * cr - sy * sr, ry = sx * sr + sy * cr; sx = rx; sy = ry; }
      return [cam.cx + sx, cam.cy + sy, zc];
    }
    function light(p, baseR, color, alpha) {
      const r = clamp(cam.f * baseR / p[2], 0.7, 3.2);
      ctx.globalAlpha = alpha * 0.28; ctx.fillStyle = color; ctx.beginPath(); ctx.arc(p[0], p[1], r * 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = alpha; ctx.beginPath(); ctx.arc(p[0], p[1], r, 0, Math.PI * 2); ctx.fill();
    }
    function quad(a, b, c, d, fill) { if (!a || !b || !c || !d) return; ctx.fillStyle = fill; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.closePath(); ctx.fill(); }

    function draw(dt) {
      const { w, h, t } = st;
      const compact = w < 720;
      if (dt > 0) { lt += dt; if (lt >= LOOP) { lt = 0; camZ = 40; camH = EYE; prevH = EYE; } if (boot < 1) boot = Math.min(1, boot + dt / 1.6); }
      if (reduce) { lt = 3.2; camZ = 40 + 3.2 * 30; boot = 1; }
      const eb = easeOut(boot);
      /* flight profile */
      const speed = 86 * smooth(0, 6.6, lt) + 8 * smooth(6.6, 14, lt);            /* m/s */
      if (dt > 0) camZ += speed * dt;
      const ground = lt < 7.1;
      const pitch = (8 * smooth(5.9, 7.8, lt) - 1.5 * smooth(9, 14, lt)) * Math.PI / 180;
      prevH = camH;
      camH = ground ? EYE + Math.sin(lt * 23) * 0.03 * smooth(1, 6, lt) : EYE + Math.pow(lt - 7.1, 2) * 2.4;
      const climbRate = dt > 0 ? (camH - prevH) / dt : 0;
      const gamma = clamp(Math.atan2(climbRate, Math.max(20, speed)), 0, 8 * Math.PI / 180);
      const roll = ground ? Math.sin(lt * 17) * 0.004 * smooth(1, 6, lt) : Math.sin(lt * 0.9) * 0.014;
      cam.h = camH; cam.z = camZ; cam.pitch = pitch; cam.roll = roll;
      /* the view sits on the side the copy leaves free (text is on the inline-start side) */
      cam.f = Math.min(h * 0.95, w * 0.8); cam.cx = w * (compact ? 0.5 : RTL ? 0.4 : 0.6); cam.cy = h * 0.42;
      const horizonY = cam.cy + cam.f * Math.tan(pitch);

      /* sky */
      if (!skyGrad || Math.abs(horizonY - gradHorizon) > 0.5) {
        gradHorizon = horizonY;
        skyGrad = ctx.createLinearGradient(0, 0, 0, Math.max(1, horizonY));
        skyGrad.addColorStop(0, '#05080c'); skyGrad.addColorStop(0.55, '#0a1a2a'); skyGrad.addColorStop(1, '#17455f');
      }
      ctx.fillStyle = skyGrad; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d6ecff';
      for (let i = 0; i < stars.length; i++) { const s = stars[i]; ctx.globalAlpha = 0.2 + 0.4 * (0.5 + 0.5 * Math.sin(t * 1.1 + s.p)); ctx.fillRect(s.x * w, s.y * horizonY, s.r, s.r); }
      ctx.globalAlpha = 1;
      const glow = ctx.createRadialGradient(cam.cx, horizonY, 0, cam.cx, horizonY, w * 0.6);
      glow.addColorStop(0, 'rgba(120,210,255,.26)'); glow.addColorStop(1, 'rgba(120,210,255,0)');
      ctx.fillStyle = glow; ctx.fillRect(0, 0, w, h);
      /* distant hills */
      const D = 9000, hills = [];
      for (let sx = -40; sx <= w + 40; sx += 24) {
        const xw = (sx - cam.cx) * D / cam.f;
        const p = project(xw, Math.max(0, terrainHeight(xw / 420, 3)) * 190, cam.z + D);
        hills.push(p ? [sx, p[1]] : [sx, horizonY]);
      }
      ctx.fillStyle = '#070b10'; ctx.beginPath(); ctx.moveTo(-40, h + 40);
      hills.forEach(([x, y]) => ctx.lineTo(x, y)); ctx.lineTo(w + 40, h + 40); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(92,200,255,.28)'; ctx.lineWidth = 1; ctx.beginPath();
      hills.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.stroke();
      /* ground glow near the horizon */
      const gg = ctx.createLinearGradient(0, horizonY, 0, horizonY + h * 0.25);
      gg.addColorStop(0, 'rgba(23,69,95,.35)'); gg.addColorStop(1, 'rgba(7,11,16,0)');
      ctx.fillStyle = gg; ctx.fillRect(0, horizonY, w, h * 0.25);
      /* city lights */
      for (let i = 0; i < cityLights.length; i++) {
        const c = cityLights[i], p = project(c.x, 0, c.z);
        if (!p || p[1] < horizonY - 2) continue;
        ctx.globalAlpha = 0.4 + 0.5 * (0.5 + 0.5 * Math.sin(t * 2 + i));
        ctx.fillStyle = c.warm ? '#ffd9a0' : '#cfe8ff'; ctx.fillRect(p[0], p[1], c.r, c.r);
      }
      ctx.globalAlpha = 1;
      /* very faint ground grid (surface reference only) */
      ctx.strokeStyle = 'rgba(92,200,255,.035)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let gz = Math.ceil(cam.z / 100) * 100; gz < cam.z + 2600; gz += 100) { const a = project(-1600, 0, gz), b = project(1600, 0, gz); if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } }
      for (let gx = -1600; gx <= 1600; gx += 100) { if (Math.abs(gx) < 60) continue; const a = project(gx, 0, cam.z + 6), b = project(gx, 0, cam.z + 2600); if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); } }
      ctx.stroke();

      /* runway surface + edges */
      const nz = cam.z + 2.2;
      const nl = project(-HALF, 0, nz), nr = project(HALF, 0, nz), fl = project(-HALF, 0, L), fr = project(HALF, 0, L);
      if (nl && nr && fl && fr) {
        const asphalt = ctx.createLinearGradient(0, fl[1], 0, h);
        asphalt.addColorStop(0, 'rgba(36,52,68,.92)'); asphalt.addColorStop(1, 'rgba(18,27,38,.96)');
        quad(nl, nr, fr, fl, asphalt);
        ctx.strokeStyle = 'rgba(170,200,225,.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(nl[0], nl[1]); ctx.lineTo(fl[0], fl[1]); ctx.moveTo(nr[0], nr[1]); ctx.lineTo(fr[0], fr[1]); ctx.stroke();
        /* lateral distance markers every 100 m give the surface speed */
        ctx.strokeStyle = 'rgba(170,200,225,.14)'; ctx.lineWidth = 1; ctx.beginPath();
        for (let zs = Math.ceil(cam.z / 100) * 100; zs < L && zs < cam.z + 1500; zs += 100) {
          const a = project(-HALF, 0.01, zs), b = project(HALF, 0.01, zs);
          if (a && b) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
        }
        ctx.stroke();
      }
      /* centreline dashes and touchdown-zone bars */
      for (let zs = Math.max(0, Math.floor(cam.z / 50) * 50); zs < L && zs < cam.z + 1400; zs += 50) {
        const a = project(-0.45, 0.02, zs + 2), b = project(0.45, 0.02, zs + 2), c = project(0.45, 0.02, zs + 32), d = project(-0.45, 0.02, zs + 32);
        const fade = clamp(1.1 - (zs - cam.z) / 1500, 0.1, 0.7);
        quad(a, b, c, d, 'rgba(210,228,240,' + fade.toFixed(3) + ')');
      }
      [[150, 5, 2.5], [300, 5, 6], [450, 5, 2.5], [600, 5, 2.5]].forEach(([zs, inner, wdt]) => {
        if (zs < cam.z + 3) return;
        [-1, 1].forEach((side) => {
          const x0 = side * inner, x1 = side * (inner + wdt);
          quad(project(x0, 0.02, zs), project(x1, 0.02, zs), project(x1, 0.02, zs + 22), project(x0, 0.02, zs + 22), 'rgba(210,228,240,.45)');
        });
      });
      /* lights: edge (white → amber), centreline (white → red), threshold/end, taxiway (blue), PAPI */
      for (let zs = 0; zs <= L; zs += 60) {
        if (zs < cam.z + 20) continue;
        const col = zs > L - 600 ? '#ffc766' : '#eaf6ff', alpha = clamp(1.25 - (zs - cam.z) / 1900, 0.12, 1);
        const a = project(-HALF - 1.5, 0.35, zs), b = project(HALF + 1.5, 0.35, zs);
        if (a) light(a, 0.45, col, alpha); if (b) light(b, 0.45, col, alpha);
        const ta = project(90, 0.35, zs + 20), tb = project(106, 0.35, zs + 20);
        if (ta) light(ta, 0.35, '#5c8dff', alpha * 0.8); if (tb) light(tb, 0.35, '#5c8dff', alpha * 0.8);
      }
      for (let zs = 0; zs <= L; zs += 15) {
        if (zs < cam.z + 20) continue;
        const toEnd = L - zs, col = toEnd < 300 ? '#ff6b6b' : toEnd < 900 && ((zs / 15) % 2 === 0) ? '#ff6b6b' : '#eaf6ff';
        const p = project(0, 0.08, zs); if (p) light(p, 0.26, col, clamp(1.2 - (zs - cam.z) / 1600, 0.1, 0.95));
      }
      for (let x = -HALF; x <= HALF; x += 3) { const p = project(x, 0.3, L); if (p) light(p, 0.45, '#ff5f5f', 0.9); }
      [[-48, 300, '#eaf6ff'], [-44, 300, '#eaf6ff'], [-40, 300, '#ff6b6b'], [-36, 300, '#ff6b6b']].forEach(([x, z, col]) => { const p = project(x, 0.6, z); if (p) light(p, 0.6, col, 0.9); });
      ctx.globalAlpha = 1;

      /* HUD */
      const hudA = eb < 0.08 ? 0 : eb < 0.6 ? 0.4 + 0.6 * ((eb - 0.08) / 0.52) : 1;
      ctx.globalAlpha = hudA;
      ctx.save(); ctx.translate(cam.cx, horizonY); ctx.rotate(roll); ctx.translate(-cam.cx, -horizonY);
      ctx.strokeStyle = 'rgba(159,225,255,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cam.cx - 150, horizonY); ctx.lineTo(cam.cx - 60, horizonY); ctx.moveTo(cam.cx + 60, horizonY); ctx.lineTo(cam.cx + 150, horizonY); ctx.stroke();
      const pxDeg = cam.f * Math.tan(Math.PI / 180);
      ctx.strokeStyle = compact ? 'rgba(92,200,255,.3)' : 'rgba(92,200,255,.5)';
      (compact ? [5, 10] : [-5, 5, 10, 15]).forEach((deg) => {
        const y = horizonY - deg * pxDeg, half = compact ? 48 : 70, len = compact ? 56 : 90;
        if (y < 20 || y > h - 20) return;
        ctx.beginPath();
        ctx.moveTo(cam.cx - half - len, y); ctx.lineTo(cam.cx - half, y); ctx.moveTo(cam.cx + half, y); ctx.lineTo(cam.cx + half + len, y);
        ctx.moveTo(cam.cx - half, y); ctx.lineTo(cam.cx - half, y + (deg > 0 ? 8 : -8)); ctx.moveTo(cam.cx + half, y); ctx.lineTo(cam.cx + half, y + (deg > 0 ? 8 : -8));
        ctx.stroke();
        hudLabel(ctx, String(Math.abs(deg)), cam.cx - half - len - 16, y, 'center', 0.55);
        hudLabel(ctx, String(Math.abs(deg)), cam.cx + half + len + 16, y, 'center', 0.55);
      });
      /* flight-path marker rises with the climb angle */
      const fy = horizonY - cam.f * Math.tan(gamma), fx = cam.cx + Math.sin(t * 0.7) * 3;
      ctx.strokeStyle = 'rgba(159,225,255,.85)'; ctx.lineWidth = 1.3;
      ctx.beginPath(); ctx.arc(fx, fy, 7, 0, Math.PI * 2);
      ctx.moveTo(fx - 20, fy); ctx.lineTo(fx - 7, fy); ctx.moveTo(fx + 7, fy); ctx.lineTo(fx + 20, fy); ctx.moveTo(fx, fy - 7); ctx.lineTo(fx, fy - 15);
      ctx.stroke();
      ctx.restore();
      /* boresight (airframe-fixed) */
      ctx.strokeStyle = 'rgba(159,225,255,.6)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cam.cx - 14, cam.cy); ctx.lineTo(cam.cx - 5, cam.cy); ctx.moveTo(cam.cx + 5, cam.cy); ctx.lineTo(cam.cx + 14, cam.cy); ctx.moveTo(cam.cx, cam.cy - 14); ctx.lineTo(cam.cx, cam.cy - 5); ctx.stroke();
      /* heading tape */
      if (!compact) {
        const hdg = 263 + Math.sin(t * 0.2) * 0.8, tapeY = 26, pxPerDeg = 6;
        ctx.strokeStyle = 'rgba(92,200,255,.45)'; ctx.lineWidth = 1;
        for (let d = Math.floor(hdg / 5) * 5 - 30; d <= hdg + 30; d += 5) {
          const x = cam.cx + (d - hdg) * pxPerDeg, major = ((d % 10) + 10) % 10 === 0;
          ctx.beginPath(); ctx.moveTo(x, tapeY); ctx.lineTo(x, tapeY + (major ? 12 : 6)); ctx.stroke();
          if (major) hudLabel(ctx, String(((d % 360) + 360) % 360).padStart(3, '0'), x, tapeY - 10, 'center', 0.5);
        }
        ctx.fillStyle = 'rgba(159,225,255,.85)';
        ctx.beginPath(); ctx.moveTo(cam.cx, tapeY + 20); ctx.lineTo(cam.cx - 5, tapeY + 29); ctx.lineTo(cam.cx + 5, tapeY + 29); ctx.closePath(); ctx.fill();
        /* speed and altitude boxes */
        /* speed and altitude stacked on the free side of the ladder */
        const kts = Math.round(speed * 1.944), ft = Math.round(Math.max(0, camH - EYE) * 3.281);
        const bx = cam.cx + (RTL ? -1 : 1) * w * 0.25, by0 = h * 0.24;
        [[String(kts), 'KTS', by0], [ft.toLocaleString('en-US'), 'FT', by0 + 48]].forEach(([val, unit, by]) => {
          ctx.fillStyle = 'rgba(7,11,16,.75)'; ctx.strokeStyle = 'rgba(159,225,255,.55)'; ctx.lineWidth = 1;
          ctx.fillRect(bx - 34, by - 12, 68, 24); ctx.strokeRect(bx - 34, by - 12, 68, 24);
          hudLabel(ctx, val, bx, by, 'center', 0.95, 12);
          hudLabel(ctx, unit, bx - 48, by, 'right', 0.5);
        });
        if (lt > 5.9 && lt < 7.4 && Math.sin(t * 14) > 0) hudLabel(ctx, 'VR', bx, by0 + 92, 'center', 0.9);
        if (lt > 7.4 && lt < 9.5 && Math.sin(t * 10) > -0.3) hudLabel(ctx, 'GEAR UP', bx, by0 + 92, 'center', 0.8);
      }
      ctx.globalAlpha = 1;
      /* vignette, canopy, loop fade */
      const vg = ctx.createRadialGradient(cam.cx, h * 0.5, h * 0.3, cam.cx, h * 0.5, Math.max(w, h) * 0.75);
      vg.addColorStop(0, 'rgba(7,11,16,0)'); vg.addColorStop(1, 'rgba(7,11,16,.7)');
      ctx.fillStyle = vg; ctx.fillRect(0, 0, w, h);
      canopy(ctx, w, h, t, eb, cam.cx - w / 2);
      const fade = lt < 0.9 ? 1 - lt / 0.9 : lt > LOOP - 1 ? (lt - (LOOP - 1)) : 0;
      if (fade > 0) { ctx.fillStyle = 'rgba(7,11,16,' + Math.min(1, fade).toFixed(3) + ')'; ctx.fillRect(0, 0, w, h); }
    }
    return { resize, draw };
  }

  window.TST.instruments = { instrument, sky, takeoff, mulberry32, easeOut };
})();
