# -*- coding: utf-8 -*-
"""
Build script for the TST site.
1. Generates the technical line-art SVG renders (exact geometry, isometric math).
2. Assembles index.html from the HTML parts, replacing <!--@@SVG:name@@--> markers.

Run:  python _parts/build.py   (from the tst-website folder)
"""
import math, os, re, io

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARTS = os.path.join(ROOT, "_parts")
# Public address of the site. The source parts use PLACEHOLDER; the build swaps it
# in both pages, sitemap.xml and robots.txt. Change this when moving to a custom domain.
SITE_URL = "https://moshik-bachar.github.io/tst-website/"
PLACEHOLDER = "https://www.example.co.il/"
SVG_DIR = os.path.join(PARTS, "svg")
os.makedirs(SVG_DIR, exist_ok=True)

def fmt(v):
    return f"{v:.1f}".rstrip("0").rstrip(".")

def pts(points):
    return " ".join(f"{fmt(x)},{fmt(y)}" for x, y in points)

def poly(points, cls="s", closed=True, extra=""):
    tag = "polygon" if closed else "polyline"
    return f'<{tag} class="{cls}" points="{pts(points)}" pathLength="1" vector-effect="non-scaling-stroke"{extra}/>'

def line(x1, y1, x2, y2, cls="s2"):
    return f'<line class="{cls}" x1="{fmt(x1)}" y1="{fmt(y1)}" x2="{fmt(x2)}" y2="{fmt(y2)}" pathLength="1" vector-effect="non-scaling-stroke"/>'

def circle(cx, cy, r, cls="s"):
    return f'<circle class="{cls}" cx="{fmt(cx)}" cy="{fmt(cy)}" r="{fmt(r)}" pathLength="1" vector-effect="non-scaling-stroke"/>'

def rect(x, y, w, h, cls="s", rx=0):
    return f'<rect class="{cls}" x="{fmt(x)}" y="{fmt(y)}" width="{fmt(w)}" height="{fmt(h)}" rx="{rx}" pathLength="1" vector-effect="non-scaling-stroke"/>'

def text(x, y, s, cls="lbl", anchor="start"):
    return f'<text class="{cls}" x="{fmt(x)}" y="{fmt(y)}" text-anchor="{anchor}">{s}</text>'

def svg(viewbox, body, ratio="xMidYMid meet"):
    return (f'<svg class="render__svg" viewBox="{viewbox}" preserveAspectRatio="{ratio}" '
            f'aria-hidden="true" focusable="false" style="direction:ltr">\n' + "\n".join(body) + "\n</svg>")

def smooth_halfwidth(stations, y):
    """Cosine-interpolated half-width profile. stations: list of (y, halfwidth) sorted by y."""
    if y <= stations[0][0]: return stations[0][1]
    if y >= stations[-1][0]: return stations[-1][1]
    for (y0, w0), (y1, w1) in zip(stations, stations[1:]):
        if y0 <= y <= y1:
            t = (y - y0) / (y1 - y0)
            t = (1 - math.cos(t * math.pi)) / 2
            return w0 + (w1 - w0) * t
    return 0

def body_outline(cx, stations, n=48):
    """Closed symmetric outline polygon from a half-width profile."""
    y0, y1 = stations[0][0], stations[-1][0]
    right = [(cx + smooth_halfwidth(stations, y0 + (y1 - y0) * i / n), y0 + (y1 - y0) * i / n) for i in range(n + 1)]
    left = [(2 * cx - x, y) for x, y in reversed(right)]
    return right + left

# ------------------------------------------------------------------ plan views
def plan_view(kind):
    W, H, cx = 800, 520, 400
    out = []
    # faint grid
    for gx in range(40, W, 40):
        out.append(line(gx, 20, gx, H - 20, "g"))
    for gy in range(40, H, 40):
        out.append(line(40, gy, W - 40, gy, "g"))
    # centerline
    out.append(line(cx, 36, cx, H - 36, "d"))
    if kind == "snunit":
        fus = [(70, 0), (92, 16), (130, 25), (180, 29), (260, 27), (340, 20), (400, 13), (440, 9), (452, 0)]
        canopy = [(132, 0), (150, 15), (185, 22), (225, 21), (248, 12), (258, 0)]
        wing_r = [(cx + 26, 214), (cx + 318, 238), (cx + 318, 292), (cx + 26, 300)]
        stab_r = [(cx + 10, 396), (cx + 118, 410), (cx + 118, 438), (cx + 14, 438)]
        fin = (372, 452)
        prop_r = 58
        windows = []
        span_y, span_x = 468, 318
        length = (70, 452)
    else:  # chofit — cabin-class single engine
        fus = [(62, 0), (84, 20), (120, 30), (170, 36), (250, 36), (330, 30), (400, 20), (452, 12), (470, 0)]
        canopy = []
        wing_r = [(cx + 34, 206), (cx + 336, 232), (cx + 336, 288), (cx + 34, 304)]
        stab_r = [(cx + 10, 412), (cx + 138, 428), (cx + 138, 454), (cx + 12, 454)]
        fin = (388, 470)
        prop_r = 64
        windows = [(cx + 24, 176), (cx + 26, 212), (cx + 26, 248), (cx + 22, 284)]
        span_y, span_x = 482, 336
        length = (62, 470)

    def mirror(ps): return [(2 * cx - x, y) for x, y in ps]

    # wings & stabilizers (drawn under fuselage)
    out.append(poly(wing_r, "f s"))
    out.append(poly(mirror(wing_r), "f s"))
    out.append(poly(stab_r, "f s"))
    out.append(poly(mirror(stab_r), "f s"))
    # aileron / flap hinge lines
    wr = wing_r
    out.append(line(wr[0][0] + 10, wr[3][1] - 12, wr[1][0] - 8, wr[2][1] - 10, "s2"))
    out.append(line(2 * cx - (wr[0][0] + 10), wr[3][1] - 12, 2 * cx - (wr[1][0] - 8), wr[2][1] - 10, "s2"))
    # fuselage
    out.append(poly(body_outline(cx, fus), "f s"))
    if canopy:
        out.append(poly(body_outline(cx, canopy), "s2"))
        out.append(line(cx, canopy[0][0] + 4, cx, canopy[-1][0] - 4, "s2"))
    for wx, wy in windows:
        out.append(rect(wx, wy, 7, 16, "s2", 1))
        out.append(rect(2 * cx - wx - 7, wy, 7, 16, "s2", 1))
    if kind == "chofit":
        out.append(line(cx - 30, 150, cx - 14, 134, "s2"))
        out.append(line(cx + 30, 150, cx + 14, 134, "s2"))
        out.append(line(cx - 14, 134, cx + 14, 134, "s2"))
    # vertical fin (seen from above as a spine)
    out.append(line(cx, fin[0], cx, fin[1], "s3"))
    # propeller disc + spinner
    out.append(circle(cx, fus[0][0], prop_r, "d"))
    out.append(circle(cx, fus[0][0], 6, "s"))
    out.append(line(cx - prop_r + 6, fus[0][0], cx + prop_r - 6, fus[0][0], "s2"))
    # dimension: span
    out.append(line(cx - span_x, span_y, cx + span_x, span_y, "d"))
    out.append(line(cx - span_x, span_y - 8, cx - span_x, span_y + 8, "s2"))
    out.append(line(cx + span_x, span_y - 8, cx + span_x, span_y + 8, "s2"))
    out.append(text(cx, span_y + 22, "SPAN", "lbl", "middle"))
    # dimension: length
    lx = 720
    out.append(line(lx, length[0], lx, length[1], "d"))
    out.append(line(lx - 8, length[0], lx + 8, length[0], "s2"))
    out.append(line(lx - 8, length[1], lx + 8, length[1], "s2"))
    out.append(text(lx + 14, (length[0] + length[1]) / 2 + 4, "LENGTH", "lbl"))
    out.append(text(cx + 8, 48, "CL", "lbl"))
    # station ticks on the left margin
    for i, yy in enumerate(range(100, 460, 60)):
        out.append(line(64, yy, 76, yy, "s2"))
        out.append(text(40, yy + 4, f"FS{i:02d}", "lbl"))
    # corner marks
    for (x, y, dx, dy) in [(24, 24, 1, 1), (W - 24, 24, -1, 1), (24, H - 24, 1, -1), (W - 24, H - 24, -1, -1)]:
        out.append(line(x, y, x + 18 * dx, y, "s"))
        out.append(line(x, y, x, y + 18 * dy, "s"))
    return svg(f"0 0 {W} {H}", out)

# ------------------------------------------------------------------ fighter plan views
def fighter_plan(kind):
    """Top-down line-art of a fighter in the same drawing language as plan_view()."""
    W, H, cx = 800, 520, 400
    out = []
    for gx in range(40, W, 40):
        out.append(line(gx, 20, gx, H - 20, "g"))
    for gy in range(40, H, 40):
        out.append(line(40, gy, W - 40, gy, "g"))
    out.append(line(cx, 36, cx, H - 36, "d"))
    mirror = lambda ps: [(2 * cx - x, y) for x, y in ps]
    both = lambda ps, cls: [poly(ps, cls), poly(mirror(ps), cls)]

    if kind == "f16":
        fus_r = [(400, 46), (409, 78), (416, 118), (420, 150), (423, 185), (424, 262), (424, 392), (422, 420), (418, 452), (413, 472), (400, 472)]
        strake = [(423, 178), (434, 228), (443, 262), (424, 262)]
        wing = [(424, 262), (515, 358), (515, 388), (424, 392)]
        stab = [(422, 398), (498, 462), (498, 488), (422, 462)]
        missile = [(517, 406), (523, 406), (523, 332), (520, 318), (517, 332)]
        intake = [(386, 206), (414, 206), (416, 258), (384, 258)]
        # stabilators and wings first (under the body)
        out += both(stab, "f s")
        out += both(wing, "f s")
        out += both(strake, "f s2")
        # missile rails + missiles on the tips
        for ps in (missile, mirror(missile)):
            out.append(poly(ps, "f s2"))
        out.append(rect(513, 348, 4, 44, "s2"))
        out.append(rect(283, 348, 4, 44, "s2"))
        # fuselage
        out.append(poly(fus_r + mirror(list(reversed(fus_r))), "f s"))
        out.append(poly(body_outline(cx, [(98, 0), (118, 9), (148, 15), (180, 12), (194, 0)]), "s2"))
        out.append(line(cx, 102, cx, 190, "s2"))
        out.append(poly(intake, "d"))
        out.append(line(cx, 330, cx, 452, "s3"))                      # fin seen from above
        out.append(rect(389, 456, 22, 20, "s2", 2))                   # nozzle
        out.append(line(cx, 46, cx, 30, "s2"))                        # pitot
        span_x, span_y, length = 123, 500, (30, 488)
    else:  # f35 — faceted blended body, trapezoidal wing, canted twin tails
        fus_r = [(400, 46), (414, 90), (426, 132), (440, 170), (452, 180), (454, 214), (452, 250), (452, 330), (448, 400), (440, 440), (428, 462), (416, 472), (400, 472)]
        wing = [(452, 250), (545, 317), (545, 357), (452, 382)]
        stab = [(442, 398), (505, 444), (505, 468), (442, 486)]
        fin = [(427, 385), (445, 405), (445, 448), (429, 455)]
        canopy_r = [(400, 92), (412, 110), (420, 140), (416, 172), (400, 188)]
        inlet = [(438, 174), (452, 181), (452, 214), (438, 214)]
        out += both(stab, "f s")
        out += both(wing, "f s")
        out.append(poly(fus_r + mirror(list(reversed(fus_r))), "f s"))
        out += both(fin, "f s")
        out.append(poly(canopy_r + mirror(list(reversed(canopy_r))), "s2"))
        out.append(line(cx, 96, cx, 184, "s2"))
        out += both(inlet, "d")
        out.append(rect(410, 236, 26, 96, "d", 1))                    # weapon bays (dashed, hidden)
        out.append(rect(364, 236, 26, 96, "d", 1))
        out.append(poly([(400, 104), (406, 114), (400, 124), (394, 114)], "d"))   # EOTS window
        out.append(poly([(384, 472), (390, 480), (396, 472), (402, 480), (408, 472), (414, 480), (416, 472)], "s2", closed=False))  # serrated nozzle
        span_x, span_y, length = 145, 500, (46, 486)

    # dimensions, station ticks, corner marks (same as the trainers)
    out.append(line(cx - span_x, span_y, cx + span_x, span_y, "d"))
    out.append(line(cx - span_x, span_y - 8, cx - span_x, span_y + 8, "s2"))
    out.append(line(cx + span_x, span_y - 8, cx + span_x, span_y + 8, "s2"))
    out.append(text(cx, span_y + 16, "SPAN", "lbl", "middle"))
    lx = 720
    out.append(line(lx, length[0], lx, length[1], "d"))
    out.append(line(lx - 8, length[0], lx + 8, length[0], "s2"))
    out.append(line(lx - 8, length[1], lx + 8, length[1], "s2"))
    out.append(text(lx + 14, (length[0] + length[1]) / 2 + 4, "LENGTH", "lbl"))
    out.append(text(cx + 8, 48, "CL", "lbl"))
    for i, yy in enumerate(range(100, 460, 60)):
        out.append(line(64, yy, 76, yy, "s2"))
        out.append(text(40, yy + 4, f"FS{i:02d}", "lbl"))
    for (x, y, dx, dy) in [(24, 24, 1, 1), (W - 24, 24, -1, 1), (24, H - 24, 1, -1), (W - 24, H - 24, -1, -1)]:
        out.append(line(x, y, x + 18 * dx, y, "s"))
        out.append(line(x, y, x, y + 18 * dy, "s"))
    return svg(f"0 0 {W} {H}", out)

# ------------------------------------------------------------------ isometric helpers
C30, S30 = math.cos(math.radians(30)), math.sin(math.radians(30))

def make_iso(ox, oy, scale):
    def iso(x, y, z=0):
        return (ox + (x - y) * C30 * scale, oy + (x + y) * S30 * scale - z * scale)
    return iso

def box(iso, x, y, z, w, d, h, cls_top="f s", cls_side="f s2"):
    """Three visible faces of an axis-aligned box (camera from +x,+y,+z)."""
    p = lambda a, b, c: iso(a, b, c)
    top = [p(x, y, z + h), p(x + w, y, z + h), p(x + w, y + d, z + h), p(x, y + d, z + h)]
    right = [p(x + w, y, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x + w, y, z + h)]
    front = [p(x, y + d, z), p(x + w, y + d, z), p(x + w, y + d, z + h), p(x, y + d, z + h)]
    return [poly(front, cls_side), poly(right, cls_side), poly(top, cls_top)]

def floor_grid(iso, nx, ny, cell, cls="g"):
    out = []
    for i in range(nx + 1):
        a, b = iso(i * cell, 0), iso(i * cell, ny * cell)
        out.append(line(*a, *b, cls))
    for j in range(ny + 1):
        a, b = iso(0, j * cell), iso(nx * cell, j * cell)
        out.append(line(*a, *b, cls))
    return out

# ------------------------------------------------------------------ classroom (mixed-reality room)
def classroom():
    W, H = 900, 600
    iso = make_iso(450, 120, 1.0)
    out = []
    cell = 60
    out += floor_grid(iso, 10, 8, cell)
    out.append(poly([iso(0, 0), iso(600, 0), iso(600, 480), iso(0, 480)], "s2"))
    items = []  # (sort_key, [elements])
    stations = [(90, 60), (330, 60), (90, 230), (330, 230)]
    for i, (sx, sy) in enumerate(stations):
        els = []
        # screen (curved display approximated by a tall thin panel)
        els += box(iso, sx + 10, sy, 0, 150, 6, 70, "s", "f s")
        # inner screen area
        a, b, c, d = iso(sx + 18, sy + 6, 10), iso(sx + 152, sy + 6, 10), iso(sx + 152, sy + 6, 62), iso(sx + 18, sy + 6, 62)
        els.append(poly([a, b, c, d], "scr"))
        # seat + base
        els += box(iso, sx + 62, sy + 70, 0, 46, 46, 22)
        els += box(iso, sx + 62, sy + 108, 22, 46, 8, 40)  # backrest
        # headset indicator above seat
        hx, hy = iso(sx + 85, sy + 95, 70)
        els.append(circle(hx, hy, 6, "s"))
        els.append(line(hx, hy + 6, hx, hy + 22, "s2"))
        # label
        lx, ly = iso(sx + 10, sy - 8, 0)
        els.append(text(lx, ly, f"ST-{i+1:02d}", "lbl"))
        items.append((sx + sy, els))
    # instructor desk (front, near viewer)
    dx, dy = 200, 380
    els = []
    els += box(iso, dx, dy, 0, 200, 60, 32)
    els += box(iso, dx + 20, dy + 10, 32, 70, 4, 42, "s", "f s")
    els += box(iso, dx + 110, dy + 10, 32, 70, 4, 42, "s", "f s")
    lx, ly = iso(dx, dy + 70, 0)
    els.append(text(lx - 6, ly + 16, "INSTRUCTOR · IOS", "lbl"))
    items.append((dx + dy, els))
    # network lines (floor level) from each station to the desk
    hub = iso(dx + 100, dy + 30, 0)
    for (sx, sy) in stations:
        a = iso(sx + 85, sy + 6, 0)
        out.append(line(*a, *hub, "d"))
    out.append(circle(hub[0], hub[1], 4, "dot"))
    for _, els in sorted(items, key=lambda t: t[0]):
        out += els
    # title block
    out.append(text(40, 560, "MIXED REALITY CLASSROOM · 4 STATIONS + IOS", "lbl"))
    out.append(text(W - 40, 560, "ISO 30°", "lbl", "end"))
    return svg(f"0 0 {W} {H}", out)

# ------------------------------------------------------------------ cockpit isometric (3D cockpit design)
def cockpit_iso():
    W, H = 800, 560
    iso = make_iso(400, 110, 1.0)
    out = []
    out += floor_grid(iso, 8, 8, 40, "g")
    # base plate
    out += box(iso, 40, 20, 0, 240, 280, 10)
    # instrument panel (far end, facing pilot at +y)
    out += box(iso, 60, 36, 10, 200, 26, 120, "s", "f s")
    # screens on the face y = 62 (front face)
    for sx in (74, 170):
        a, b, c, d = iso(sx, 62, 48), iso(sx + 76, 62, 48), iso(sx + 76, 62, 108), iso(sx, 62, 108)
        out.append(poly([a, b, c, d], "scr"))
        # screen grid
        for k in (1, 2):
            p1, p2 = iso(sx, 62, 48 + 20 * k), iso(sx + 76, 62, 48 + 20 * k)
            out.append(line(*p1, *p2, "g"))
    # HUD combiner (glass) above panel center
    a, b, c, d = iso(130, 40, 130), iso(190, 40, 130), iso(186, 40, 176), iso(134, 40, 176)
    out.append(poly([a, b, c, d], "scr"))
    out.append(line(*iso(160, 40, 130), *iso(160, 40, 176), "g"))
    # rudder pedals
    out += box(iso, 110, 70, 10, 30, 20, 8)
    out += box(iso, 180, 70, 10, 30, 20, 8)
    # seat
    out += box(iso, 110, 190, 10, 100, 80, 36)      # cushion
    out += box(iso, 110, 262, 46, 100, 14, 110)     # backrest
    out += box(iso, 110, 180, 46, 10, 90, 20)       # left console
    out += box(iso, 200, 180, 46, 10, 90, 20)       # right console
    # stick
    s0, s1 = iso(160, 150, 10), iso(160, 150, 70)
    out.append(line(*s0, *s1, "s3"))
    out += box(iso, 154, 144, 70, 12, 12, 18, "s", "f s")
    # throttle on left console
    t0, t1 = iso(115, 215, 66), iso(115, 215, 92)
    out.append(line(*t0, *t1, "s3"))
    # dimension lines
    a, b = iso(40, 310, 0), iso(280, 310, 0)
    out.append(line(*a, *b, "d")); out.append(text((a[0] + b[0]) / 2 + 8, (a[1] + b[1]) / 2 + 14, "W", "lbl"))
    a, b = iso(290, 20, 0), iso(290, 300, 0)
    out.append(line(*a, *b, "d")); out.append(text((a[0] + b[0]) / 2 + 10, (a[1] + b[1]) / 2 + 4, "L", "lbl"))
    # labels
    lx, ly = iso(60, 36, 150); out.append(text(lx - 70, ly - 10, "PANEL · 2× MFD", "lbl"))
    lx, ly = iso(130, 40, 190); out.append(text(lx - 40, ly - 8, "HUD", "lbl"))
    lx, ly = iso(210, 262, 170); out.append(text(lx + 10, ly, "SEAT", "lbl"))
    out.append(text(40, 530, "COCKPIT · 3D LAYOUT", "lbl"))
    out.append(text(W - 40, 530, "SCALE 1:1 REPLICA", "lbl", "end"))
    return svg(f"0 0 {W} {H}", out)

# ------------------------------------------------------------------ cockpit view (banner)
def cockpit_view():
    W, H = 1200, 600
    out = []
    hz = 300
    # sky/ground split tint handled by CSS; terrain ridges
    for k, (amp, freq, base, cls) in enumerate([(14, 0.012, hz + 40, "s2"), (22, 0.009, hz + 90, "s2"), (34, 0.007, hz + 160, "s2"), (46, 0.006, hz + 250, "s2")]):
        ps = []
        for x in range(0, W + 1, 12):
            y = base - abs(math.sin(x * freq + k) * amp + math.sin(x * freq * 2.3 + k * 2) * amp * 0.4)
            ps.append((x, y))
        out.append(poly(ps, cls, closed=False))
    # perspective lines converging to vanishing point
    for x in range(-600, W + 601, 150):
        out.append(line(600, hz, x, H, "g"))
    # horizon
    out.append(line(0, hz, W, hz, "s2"))
    # pitch ladder
    for deg in (-10, -5, 5, 10):
        y = hz - deg * 9
        for sgn in (-1, 1):
            x0 = 600 + sgn * 70; x1 = 600 + sgn * 170
            out.append(line(x0, y, x1, y, "s"))
            out.append(line(x1, y, x1, y + (8 if deg > 0 else -8), "s"))
            out.append(text(600 + sgn * 192, y + 4, str(abs(deg)), "lbl", "middle"))
    # boresight
    out.append(circle(600, hz, 10, "s"))
    out.append(line(560, hz, 586, hz, "s")); out.append(line(614, hz, 640, hz, "s")); out.append(line(600, hz - 24, 600, hz - 14, "s"))
    # flight path marker (slightly offset)
    out.append(circle(626, hz + 18, 7, "s2")); out.append(line(633, hz + 18, 645, hz + 18, "s2")); out.append(line(607, hz + 18, 619, hz + 18, "s2")); out.append(line(626, hz + 11, 626, hz + 3, "s2"))
    # heading tape
    for i, x in enumerate(range(420, 781, 30)):
        tall = (i % 2 == 0)
        out.append(line(x, 70, x, 70 + (14 if tall else 8), "s"))
        if tall:
            out.append(text(x, 62, f"{(225 + i * 5) % 360:03d}", "lbl", "middle"))
    out.append(poly([(600, 94), (594, 104), (606, 104)], "dot"))
    # speed / altitude tapes
    for tx, lbl, val in ((220, "KTS", "420"), (980, "FT", "12500")):
        out.append(line(tx, 200, tx, 400, "s2"))
        for y in range(200, 401, 25):
            out.append(line(tx - (10 if (y // 25) % 2 == 0 else 5), y, tx, y, "s2"))
        out.append(rect(tx - 44 if tx < 600 else tx + 4, 288, 40, 24, "f s", 2))
        out.append(text(tx - 24 if tx < 600 else tx + 24, 304, val, "lbl", "middle"))
        out.append(text(tx - 24 if tx < 600 else tx + 24, 190, lbl, "lbl", "middle"))
    # canopy frame
    out.append(poly([(-40, 620), (120, 300), (380, 120), (600, 70), (820, 120), (1080, 300), (1240, 620)], "s3", closed=False))
    out.append(poly([(20, 620), (170, 330), (410, 160), (600, 112), (790, 160), (1030, 330), (1180, 620)], "s2", closed=False))
    out.append(line(120, 300, 170, 330, "s2")); out.append(line(1080, 300, 1030, 330, "s2"))
    out.append(line(380, 120, 410, 160, "s2")); out.append(line(820, 120, 790, 160, "s2"))
    # glareshield + panel (bottom)
    out.append(poly([(0, 600), (0, 540), (280, 500), (920, 500), (1200, 540), (1200, 600)], "f s"))
    for px in (330, 540, 750):
        out.append(rect(px, 515, 130, 70, "scr", 3))
        out.append(line(px + 8, 540, px + 122, 540, "g")); out.append(line(px + 8, 562, px + 122, 562, "g"))
    out.append(text(40, 560, "HUD · PITCH LADDER · HDG TAPE", "lbl"))
    out.append(text(W - 40, 560, "COCKPIT VIEW · RENDER", "lbl", "end"))
    return svg(f"0 0 {W} {H}", out, "xMidYMid slice")

# ------------------------------------------------------------------ build
def artifact_variant(page):
    """The claude.ai artifact wrapper adds its own doctype/html/head/body skeleton,
    so the published page is the same content without wrappers and without the
    SEO/meta tags that only matter on the real domain."""
    page = re.sub(r"<!--.*?-->", "", page, count=1, flags=re.S)                 # launch TODO comment
    page = re.sub(r"<!doctype html>\s*|</?html[^>]*>|</?head>|</?body>", "", page, flags=re.I)
    drop = re.compile(r'^\s*<(meta (charset|name="viewport"|name="robots"|name="theme-color"|name="color-scheme"|property="og:|name="twitter:)|link rel="(canonical|alternate|icon|manifest)")[^>]*>\s*$', re.M)
    page = drop.sub("", page)
    page = re.sub(r"<title>.*?</title>", "<title>TST · The Squadron Technology</title>", page, count=1, flags=re.S)
    return re.sub(r"\n{3,}", "\n\n", page).strip() + "\n"


def main():
    renders = {
        "cockpit": cockpit_view(),
        "snunit": plan_view("snunit"),
        "chofit": plan_view("chofit"),
        "f16": fighter_plan("f16"),
        "f35": fighter_plan("f35"),
        "cockpit-iso": cockpit_iso(),
        "classroom": classroom(),
    }
    for name, markup in renders.items():
        with io.open(os.path.join(SVG_DIR, f"{name}.svg"), "w", encoding="utf-8") as f:
            f.write(markup)
    # concatenate CSS parts -> assets/css/style.css
    css_dir = os.path.join(PARTS, "css")
    css_parts = sorted(p for p in os.listdir(css_dir) if p.endswith(".css"))
    css = "\n".join(io.open(os.path.join(css_dir, p), encoding="utf-8").read() for p in css_parts)
    with io.open(os.path.join(ROOT, "assets", "css", "style.css"), "w", encoding="utf-8", newline="\n") as f:
        f.write(css)
    # concatenate JS parts -> assets/js/app.js and assets/js/hud.js
    js_parts = {}
    for bundle in ("app", "hud"):
        d = os.path.join(PARTS, "js", bundle)
        files = sorted(p for p in os.listdir(d) if p.endswith(".js")) if os.path.isdir(d) else []
        js_parts[bundle] = len(files)
        if files:
            js = "\n".join(io.open(os.path.join(d, p), encoding="utf-8").read() for p in files)
            with io.open(os.path.join(ROOT, "assets", "js", bundle + ".js"), "w", encoding="utf-8", newline="\n") as f:
                f.write(js)
    print("style.css from %d parts; js bundles: %s" % (len(css_parts), js_parts))
    parts = sorted(p for p in os.listdir(PARTS) if re.match(r"^\d\d-.*\.html$", p))
    html = ""
    for p in parts:
        with io.open(os.path.join(PARTS, p), "r", encoding="utf-8") as f:
            html += f.read()
    def repl(m):
        name = m.group(1)
        if name not in renders:
            raise SystemExit(f"Unknown SVG marker: {name}")
        return renders[name]
    html = re.sub(r"<!--@@SVG:([a-z0-9\-]+)@@-->", repl, html)
    if "@@SVG:" in html:
        raise SystemExit("unreplaced SVG marker left in index.html")
    from i18n import to_english, to_hebrew, hebrew_leaks, HE_EN as HE_EN_COUNT
    en = to_english(html)
    leaks = hebrew_leaks(en)
    if leaks:
        raise SystemExit("Hebrew left in the English page (add it to _parts/i18n.py):\n  " + "\n  ".join(leaks))
    en = en.replace(PLACEHOLDER, SITE_URL)
    with io.open(os.path.join(ROOT, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(en)
    art_dir = os.path.join(ROOT, "_artifact")
    os.makedirs(art_dir, exist_ok=True)
    with io.open(os.path.join(art_dir, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(artifact_variant(en))
    he_dir = os.path.join(ROOT, "he")
    os.makedirs(he_dir, exist_ok=True)
    with io.open(os.path.join(he_dir, "index.html"), "w", encoding="utf-8", newline="\n") as f:
        f.write(to_hebrew(html).replace(PLACEHOLDER, SITE_URL))
    # sitemap + robots for the configured address
    import datetime
    today = datetime.date.today().isoformat()
    entry = ('  <url>\n    <loc>{u}{p}</loc>\n    <lastmod>{d}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>{pr}</priority>\n'
             '    <xhtml:link rel="alternate" hreflang="en" href="{u}"/>\n    <xhtml:link rel="alternate" hreflang="he" href="{u}he/"/>\n'
             '    <xhtml:link rel="alternate" hreflang="x-default" href="{u}"/>\n  </url>\n')
    sitemap = ('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
               + entry.format(u=SITE_URL, p="", d=today, pr="1.0") + entry.format(u=SITE_URL, p="he/", d=today, pr="0.9") + "</urlset>\n")
    with io.open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8", newline="\n") as f:
        f.write(sitemap)
    with io.open(os.path.join(ROOT, "robots.txt"), "w", encoding="utf-8", newline="\n") as f:
        f.write("User-agent: *\nAllow: /\nDisallow: /_parts/\nDisallow: /_artifact/\n\nSitemap: " + SITE_URL + "sitemap.xml\n")
    print(f"index.html (English) + he/index.html (Hebrew) built from {len(parts)} parts, {len(renders)} renders, {len(HE_EN_COUNT)} translations")

if __name__ == "__main__":
    main()
