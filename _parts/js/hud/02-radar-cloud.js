
(function () {
  'use strict';
  const { instrument, sky, takeoff, mulberry32, easeOut } = window.TST.instruments;
  const MONO = '"IBM Plex Mono", Consolas, Menlo, monospace';

  /* ---------------------------------------------------------------- RADAR */
  function radar(ctx, st, canvas) {
    const rnd = mulberry32(21);
    const targets = [];
    for (let i = 0; i < 7; i++) {
      targets.push({ id: 'T' + String(i + 1).padStart(2, '0'), r: 0.25 + rnd() * 0.62, a: rnd() * Math.PI * 2,
        va: (rnd() - 0.5) * 0.09, vr: (rnd() - 0.5) * 0.012, glow: rnd() });
    }
    let sweep = 0, hover = null, lastTgt = '';
    const tgtEl = document.querySelector('[data-readout="tgt"]');
    canvas.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      hover = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: ((e.clientY - r.top) / r.height) * 2 - 1 };
    }, { passive: true });
    canvas.addEventListener('pointerleave', () => { hover = null; });

    function draw(dt) {
      const { w, h, t } = st;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 4;
      const boot = easeOut(Math.min(1, t / 1.4));        /* rings expand in on first view */
      ctx.clearRect(0, 0, w, h);

      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      bg.addColorStop(0, 'rgba(92,200,255,.09)'); bg.addColorStop(1, 'rgba(92,200,255,.015)');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();

      ctx.strokeStyle = 'rgba(92,200,255,.22)'; ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) { ctx.beginPath(); ctx.arc(cx, cy, (R * i) / 4 * Math.min(1, boot * 4 / i + 0.05), 0, Math.PI * 2); ctx.stroke(); }
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();

      ctx.font = '9px ' + MONO; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let d = 0; d < 360; d += 10) {
        const a = ((d - 90) * Math.PI) / 180, l = d % 30 === 0 ? 8 : 4;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * (R - l), cy + Math.sin(a) * (R - l));
        ctx.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
        ctx.stroke();
        if (d % 30 === 0 && R > 96) {
          ctx.fillStyle = 'rgba(139,154,170,.9)';
          ctx.fillText(String(d).padStart(3, '0'), cx + Math.cos(a) * (R - 19), cy + Math.sin(a) * (R - 19));
        }
      }

      /* sweep with afterglow */
      sweep = (sweep + dt * 1.05) % (Math.PI * 2);
      const sa = sweep - Math.PI / 2;
      if (ctx.createConicGradient) {
        const cg = ctx.createConicGradient(sa, cx, cy);
        cg.addColorStop(0, 'rgba(92,200,255,0)'); cg.addColorStop(0.8, 'rgba(92,200,255,0)'); cg.addColorStop(1, 'rgba(92,200,255,.38)');
        ctx.fillStyle = cg; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(159,225,255,.95)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(sa) * R, cy + Math.sin(sa) * R); ctx.stroke();

      /* targets */
      let nearest = null, nd = Infinity;
      for (const tg of targets) {
        tg.a += tg.va * dt; tg.r += tg.vr * dt;
        if (tg.r < 0.18 || tg.r > 0.92) tg.vr *= -1;
        const diff = (((sa - tg.a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        tg.glow = diff < 0.1 ? 1 : Math.max(0, tg.glow - dt * 0.32);
        const x = cx + Math.cos(tg.a) * tg.r * R, y = cy + Math.sin(tg.a) * tg.r * R;
        tg.x = x; tg.y = y;
        if (hover) {
          const d = Math.hypot(x - (cx + hover.x * R), y - (cy + hover.y * R));
          if (d < nd) { nd = d; nearest = tg; }
        }
        const al = 0.18 + tg.glow * 0.82;
        ctx.fillStyle = 'rgba(159,225,255,' + al.toFixed(3) + ')';
        ctx.beginPath(); ctx.moveTo(x, y - 4); ctx.lineTo(x + 4, y); ctx.lineTo(x, y + 4); ctx.lineTo(x - 4, y); ctx.closePath(); ctx.fill();
        if (tg.glow > 0.55 && R > 96) {
          ctx.fillStyle = 'rgba(139,154,170,' + tg.glow.toFixed(3) + ')'; ctx.textAlign = 'left';
          ctx.fillText(tg.id, x + 8, y - 7);
        }
      }
      let tgtText = '—';
      if (nearest && nd < R * 0.28) {
        ctx.strokeStyle = 'rgba(159,225,255,.9)'; ctx.lineWidth = 1;
        ctx.strokeRect(nearest.x - 9, nearest.y - 9, 18, 18);
        const brg = Math.round(((nearest.a * 180) / Math.PI + 90 + 360) % 360);
        tgtText = nearest.id + ' ' + String(brg).padStart(3, '0') + '/' + String(Math.round(nearest.r * 40)).padStart(2, '0');
      }
      if (tgtEl && tgtText !== lastTgt) { tgtEl.textContent = tgtText; lastTgt = tgtText; }

      ctx.fillStyle = 'rgba(159,225,255,.9)'; ctx.beginPath(); ctx.arc(cx, cy, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(92,200,255,.5)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    }
    return { draw };
  }

  /* ----------------------------------------------------------- POINT CLOUD */
  function buildAircraft() {
    const rnd = mulberry32(99), pts = [];
    const push = (x, y, z) => pts.push(x, y, z);
    /* fuselage: revolve a radius profile along x (nose at +x) */
    for (let i = 0; i < 520; i++) {
      const x = -0.98 + rnd() * 1.96;
      const u = (x + 0.98) / 1.96;                               /* 0 tail .. 1 nose */
      const r = 0.085 * Math.sin(Math.PI * Math.pow(u, 0.6)) + 0.012;
      const a = rnd() * Math.PI * 2;
      push(x, Math.cos(a) * r, Math.sin(a) * r);
    }
    /* canopy bump */
    for (let i = 0; i < 90; i++) {
      const x = 0.18 + rnd() * 0.42, u = (x - 0.18) / 0.42;
      const rr = 0.07 * Math.sin(Math.PI * u), a = rnd() * Math.PI;
      push(x, 0.06 + Math.sin(a) * rr, Math.cos(a) * rr * 0.9);
    }
    /* wings: span along z, chord along x, slight sweep + dihedral */
    for (let i = 0; i < 360; i++) {
      const z = (rnd() * 2 - 1), az = Math.abs(z);
      const chord = 0.32 - 0.16 * az, le = 0.14 - 0.1 * az;
      const x = le - rnd() * chord, y = -0.02 + az * 0.06 + (rnd() < 0.5 ? 0.012 : -0.012);
      push(x, y, z);
    }
    /* horizontal stabiliser */
    for (let i = 0; i < 110; i++) {
      const z = (rnd() * 2 - 1) * 0.38, az = Math.abs(z);
      const chord = 0.16 - 0.06 * az, le = -0.78 - 0.05 * az;
      push(le - rnd() * chord, 0.01 + (rnd() < 0.5 ? 0.01 : -0.01), z);
    }
    /* vertical fin */
    for (let i = 0; i < 110; i++) {
      const y = rnd() * 0.3, chord = 0.2 - 0.1 * (y / 0.3), le = -0.72 - 0.12 * (y / 0.3);
      push(le - rnd() * chord, 0.03 + y, rnd() < 0.5 ? 0.008 : -0.008);
    }
    return new Float32Array(pts);
  }

  function pointcloud(ctx, st) {
    const P = buildAircraft(), N = P.length / 3;
    const countEl = document.querySelector('[data-pointcloud-count]');
    if (countEl) countEl.textContent = N.toLocaleString('en-US');
    let yaw = 0.7, scan = -1.3;
    const pitch = 0.42, cp = Math.cos(pitch), sp = Math.sin(pitch), FOV = 3.4;

    function project(x, y, z, cy, sy, S, cxp, cyp) {
      const x1 = x * cy - z * sy, z1 = x * sy + z * cy;
      const y2 = y * cp - z1 * sp, z2 = y * sp + z1 * cp;
      const d = FOV / (FOV + z2);
      return [cxp + x1 * S * d, cyp - y2 * S * d, z2, d];
    }
    function draw(dt) {
      const { w, h } = st;
      ctx.clearRect(0, 0, w, h);
      yaw += dt * 0.22; scan += dt * 0.42; if (scan > 1.45) scan = -1.45;
      const cy = Math.cos(yaw), sy = Math.sin(yaw);
      const S = Math.min(w, h) * 0.46, cxp = w / 2, cyp = h / 2 + h * 0.05;

      /* bounding box */
      const B = [[-1, -0.12, -1], [1, -0.12, -1], [1, -0.12, 1], [-1, -0.12, 1], [-1, 0.36, -1], [1, 0.36, -1], [1, 0.36, 1], [-1, 0.36, 1]];
      const bp = B.map(([x, y, z]) => project(x, y, z, cy, sy, S, cxp, cyp));
      ctx.strokeStyle = 'rgba(150,180,205,.14)'; ctx.lineWidth = 1; ctx.beginPath();
      [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]].forEach(([a, b]) => { ctx.moveTo(bp[a][0], bp[a][1]); ctx.lineTo(bp[b][0], bp[b][1]); });
      ctx.stroke();

      /* scan plane (x = scan) */
      const q = [[scan, -0.12, -1], [scan, -0.12, 1], [scan, 0.36, 1], [scan, 0.36, -1]].map(([x, y, z]) => project(x, y, z, cy, sy, S, cxp, cyp));
      ctx.fillStyle = 'rgba(92,200,255,.05)'; ctx.strokeStyle = 'rgba(159,225,255,.45)';
      ctx.beginPath(); ctx.moveTo(q[0][0], q[0][1]); for (let i = 1; i < 4; i++) ctx.lineTo(q[i][0], q[i][1]); ctx.closePath(); ctx.fill(); ctx.stroke();

      /* points */
      for (let i = 0; i < N; i++) {
        const x = P[i * 3], y = P[i * 3 + 1], z = P[i * 3 + 2];
        const [px, py, z2, d] = project(x, y, z, cy, sy, S, cxp, cyp);
        const near = Math.abs(x - scan) < 0.05;
        const depthA = 0.2 + 0.6 * (1 - (z2 + 1.1) / 2.2);
        const s = (near ? 2.4 : 1.5) * d;
        ctx.fillStyle = near ? 'rgba(220,245,255,.95)' : 'rgba(92,200,255,' + Math.min(0.95, depthA).toFixed(3) + ')';
        ctx.fillRect(px - s / 2, py - s / 2, s, s);
      }
      /* readout */
      ctx.font = '10px ' + MONO; ctx.textAlign = 'right'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = 'rgba(139,154,170,.9)';
      ctx.fillText('X ' + (scan >= 0 ? '+' : '') + scan.toFixed(2) + '  YAW ' + String(Math.round(((yaw * 180) / Math.PI) % 360)).padStart(3, '0') + '°', w - 16, h - 16);
    }
    return { draw };
  }

  /* ----------------------------------------------------------------- init */
  document.querySelectorAll('[data-sky]').forEach((c) => instrument(c, sky, { alpha: false }));
  document.querySelectorAll('[data-takeoff]').forEach((c) => instrument(c, takeoff, { alpha: false }));
  document.querySelectorAll('[data-radar]').forEach((c) => instrument(c, radar));
  document.querySelectorAll('[data-pointcloud]').forEach((c) => instrument(c, pointcloud));
})();
