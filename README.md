# TST · The Squadron Technology — website

Premium dark-mode ("Night Flight") marketing site. Static, dependency-light, RTL-first Hebrew, built for Core Web Vitals.

## Stack and architecture

| Layer | Choice | Why |
| --- | --- | --- |
| Markup | Semantic HTML5, single page, `lang="he" dir="rtl"` | Zero build-time risk, perfect crawlability, instant first paint |
| Styling | Hand-written CSS, design tokens in `:root`, logical properties | RTL/LTR correctness for free, no framework weight |
| Motion | GSAP 3.15 + ScrollTrigger from cdnjs (deferred) | 60 fps scroll-linked animation; the site is fully usable if the CDN is blocked |
| Canvas | `assets/js/hud.js` (no dependencies) | Perspective wireframe terrain + HUD, PPI radar, 3D point-cloud scan |
| Fonts | Heebo (Hebrew display/body) + IBM Plex Mono (technical accents) via Google Fonts | Geometric Hebrew with a mono "instrument" voice |

Progressive enhancement is strict: an inline `<head>` script adds `html.js`, the app adds `html.has-anim` only when GSAP loaded and the visitor does not prefer reduced motion. Reveal states, SVG draw-on, counters and the uptime grid all have static fallbacks.

## Folder layout

```
tst-website/
├── index.html                 ← generated: do not edit by hand
├── assets/
│   ├── css/style.css          ← generated from _parts/css/*.css
│   ├── js/app.js              ← generated from _parts/js/app/*.js
│   ├── js/hud.js              ← generated from _parts/js/hud/*.js
│   └── img/ favicon.svg, logo.svg
├── robots.txt · sitemap.xml · site.webmanifest
└── _parts/                    ← sources
    ├── 01-…04-*.html          ← page sections
    ├── css/, js/              ← style and script bundles
    ├── build.py               ← generates SVG renders + assembles everything
    └── svg/                   ← generated technical renders
```

Build (Python 3, no packages needed):

```bash
python _parts/build.py
```

Deploy the folder as-is to any static host (Netlify, Vercel, Cloudflare Pages, S3 + CloudFront, nginx). Exclude `_parts/` from the deploy or leave it; `robots.txt` already disallows it.

## Configuration (index.html, `window.TST_CONFIG`)

| Key | Purpose |
| --- | --- |
| `gaMeasurementId` | GA4 ID (`G-XXXXXXXXXX`). Empty = analytics fully disabled. |
| `requireConsent` | `true` shows a consent bar and uses Consent Mode v2 (analytics denied until accepted). |
| `formEndpoint` | POST target for the contact form (Formspree, Basin, your API). Empty = demo mode showing the "sample site" notice. |

Before launch also replace `https://www.example.co.il/` in `_parts/01-head-hero.html` (canonical, Open Graph, JSON-LD), `sitemap.xml` and `robots.txt`, then rebuild. Add a real 1200×630 `assets/img/og-image.png`.

## Languages

English is the default (`index.html`, LTR); Hebrew lives at `he/index.html` (RTL). Both are generated from the same Hebrew source parts: `_parts/i18n.py` maps every Hebrew string to English and the build replaces them longest-first, then flips `lang`/`dir`, locale tags, canonical/Open Graph URLs and the language switch target. The build fails if any Hebrew is left in the English page, so adding copy means adding one dictionary line. Both pages carry `hreflang` alternates and are listed in `sitemap.xml`. The handful of direction-specific styles (scrims, bar origins, altimeter anatomy, marquee direction) live in `_parts/css/06-ltr.css`.

## Cockpit pushbuttons

All buttons (CTAs, form submit, consent, language switch, menu toggle, back-to-top) are styled as backlit panel switches in `_parts/css/07-cockpit-buttons.css`: gunmetal face with a bevel, phosphor-green legend with glow, an inner legend window and a backlight strip. Primary buttons are lit; ghost buttons stay unlit until hover; clicking gives a pressed state. The green tokens live at the top of that file.

## Flight model (hero, banner, altimeter)

The page is treated as one descent. `window.TST.flight` holds `boot` (approach progress after load), `dive` (scroll progress through the hero), `scroll` and `alt` (12,500 ft at the top of the page, 0 at the footer). The hero sky uses it for the load-time approach (camera descends, HUD boots with a flicker, speed streaks fade as the aircraft levels off) and for the scroll-linked dive; the instrument panel's ALT readout and the fixed altimeter tape on the page edge read the same value, so they always agree. The banner's cockpit view is a looping takeoff (`takeoff` in `hud.js`): a lit runway at dawn with edge, centreline, threshold, taxiway and PAPI lights, a 6.6 s acceleration roll, rotation at VR, liftoff and a gentle climb while the runway drops away, then a short fade and restart. The view is offset toward the side the copy leaves free (right in English, left in Hebrew) and the HUD shows live speed and altitude. To use real footage instead, put a muted looping `<video>` or an `<img>` inside the `.render--cockpit` block and remove the canvas. A target designator locks onto the headline once the formula resolves. All of it is skipped under reduced motion.

## Analytics events (GA4 / dataLayer)

`cta_click`, `nav_click`, `contact_click` (mail/phone), `section_view` (once per section), `scroll_depth` (25/50/75/100), `form_start`, `generate_lead` (conversion), `form_error`. Add `data-track="event_name" data-label="..."` to any element to track clicks declaratively. Mark `generate_lead` as a conversion in GA4.

## Content and imagery

All copy comes from the original content file (the two IAF trainers are named by aircraft type, Grob G-120 and Beechcraft Bonanza; the F-16 and F-35 card copy is a draft to be confirmed). No photos existed in the source, so every figure is a technical line-art render generated by `build.py` (cockpit view, four aircraft plan views, isometric cockpit, mixed-reality classroom) plus live canvases (takeoff, point cloud). To use real photography, replace a `.render` block with `<img src="…" width="…" height="…" alt="…" loading="lazy" decoding="async">` and keep the surrounding `figure`/caption markup.

Known content gap: the brief lists corporate leadership-development workshops as a core offering, but the source content contains no copy for it, so no section was invented. Supply the copy and it slots in as a section 06 before Contact.

## Accessibility and performance

Skip link, landmark structure, one `h1`, logical heading order, visible focus rings, keyboard-trapped mobile menu with Escape, `aria-live` form feedback, decorative canvases and mono labels hidden from assistive tech, WCAG AA contrast on all text, full `prefers-reduced-motion` support. Canvases cap device-pixel ratio, pause off-screen and when the tab is hidden. No layout shift from media: every figure and canvas has a fixed aspect ratio. Fonts load with `display=swap` over preconnected origins; hero text is the LCP element and is never blocked on a request.

QA switches: `?debug` disables GSAP lag smoothing (deterministic screenshots), `?nogsap` forces the static no-animation fallback.
