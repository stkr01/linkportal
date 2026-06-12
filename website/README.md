# LinkPortal — Promotional Website

A polished, single-page marketing site for the LinkPortal application.
**Plain HTML + CSS + vanilla JS — no build step, no dependencies.**

See [PLAN.md](./PLAN.md) for the full plan, scope and backlog.

## Files

```
website/
├─ index.html      The landing page (all sections + inline SVG icon sprite)
├─ styles.css      Brand system, layout, responsive, animations
├─ main.js         Progressive-enhancement interactions (nav, scroll-reveal, header)
├─ PLAN.md         Plan & backlog
├─ README.md       This file
└─ assets/
   ├─ logo.svg     Interlocking-rings mark (green/lime, transparent bg)
   └─ favicon.svg  App-style icon (white rings on green square)
```

## Run locally

It's static — just open `index.html`, or serve the folder for clean paths:

```powershell
cd website
# Option A: Python (if installed)
python -m http.server 8080
# Option B: Node
npx serve .
```

Then open <http://localhost:8080>.

> No `npm install` needed. The page works with JavaScript disabled; JS only adds the
> mobile menu, scroll animations and the sticky-header shadow.

## Edit

- **Copy / sections:** edit `index.html`. Sections are clearly commented (`HERO`, `FEATURES`, …).
- **Colors / spacing:** tweak the CSS custom properties at the top of `styles.css` (`:root`).
  They mirror the app's brand tokens (green `#00833e`, dark `#006330`, lime `#8bc63f`).
- **Icons:** all icons are inline SVG `<symbol>`s in the sprite at the bottom of `index.html`,
  referenced via `<use href="#i-name">`. Add a new `<symbol>` and reference it — no icon library.

## Deploy

The site is static files, so any web server works. To match the app's nginx setup
(see `../deploy/`), serve the folder as its own site or under a path, e.g.:

```nginx
server {
    listen 80;
    server_name linkportal-info.intern;
    root /var/www/linkportal-website;   # copy of this folder
    index index.html;
    location / { try_files $uri $uri/ =404; }
}
```

Copy the folder to the server and reload nginx — nothing to compile.

## TODO / backlog

Tracked in [PLAN.md](./PLAN.md). Highlights:

- EN/SV language toggle (showcases the app's i18n).
- Real product screenshots (replace the CSS mockup).
- Open Graph preview image for link sharing.
- Wire the "Get started" CTA to the real app URL once hosting is decided.
