# LinkPortal – Promotional Website Plan

> A marketing/landing site to promote the LinkPortal application internally (and as a showcase).
> Lives in `LinkPortal/website/`, separate from the app (`frontend/`, `backend/`, `extension/`).

**Status:** Done (v1) — landing page built & browser-validated (desktop + mobile)
**Started:** 2026-06-12
**Owner:** IT-Operations

---

## 1. Goal

Give LinkPortal a polished public face that, in ~30 seconds, explains:

1. **What it is** – a central, searchable catalog of all IT tools & platforms ("a Password Manager for links").
2. **Why it matters** – kills silos, reduces bus-factor risk, saves time hunting for "where do we manage X?".
3. **What it does** – the headline features (category tree, search/command palette, health-check monitoring, favorites, RBAC, multilingual, browser extension).
4. **How to start** – a clear call to action (open the app / install the extension / contact IT-Ops).

Audience: internal IT staff and stakeholders; secondary: anyone evaluating the tool.

---

## 2. Tech decision

**Static site: HTML + CSS + vanilla JS. No framework, no build step.**

Rationale:

- **Zero build / zero dependencies** – nothing to `npm install`, no supply-chain or maintenance burden.
- **Trivial deploy** – just copy files; nginx serves them directly (consistent with the app's nginx + systemd setup in `deploy/`).
- **Fast & accessible** – loads instantly, works without JS, great Lighthouse scores.
- **Editable by anyone** – no React knowledge required to tweak copy.

Migration path (if it ever needs to grow into a multi-page CMS-like site): can be lifted into Vite/Astro later. Not needed for a landing page.

---

## 3. Brand system (reused from the app)

| Token | Value | Use |
|-------|-------|-----|
| Primary green | `#00833e` | Brand, buttons, headings accents |
| Primary dark | `#006330` | Hover, gradients, footer |
| Accent lime | `#8bc63f` | Highlights, underlines, badges |
| Background | `#f4f6f5` | Page background |
| Surface | `#ffffff` | Cards |
| Text | `#1f2421` | Body text |
| Muted | `#6b736e` | Secondary text |
| Radius | `8px` (cards up to `20px`) | Rounded corners |
| Font | Segoe UI / system-ui | Matches the app |

**Logo:** two interlocking rings (chain link) in white on green — recreated as crisp inline SVG (`assets/logo.svg`).

---

## 4. Page structure (single page, anchored sections)

1. **Header / nav** – logo + wordmark, anchor links, primary CTA. Sticky, shadow-on-scroll, mobile hamburger.
2. **Hero** – headline + subheadline + dual CTA + CSS/SVG app mockup (browser frame with stylized dashboard: category tree, link cards, health dots).
3. **Stat bar** – quick proof points (8 languages · 3 roles · HTTP/RDP/SSH monitoring · Chrome & Edge).
4. **Problem → solution** – the pain points (silos, bus-factor, time waste) and how LinkPortal solves them.
5. **Features grid** – 9 cards: category tree, search + command palette, health-check, favorites, tags & environments, RBAC, multilingual, audit log, trash/soft-delete.
6. **How it works** – 3 steps: Organize → Find → Launch.
7. **Browser extension** – quick-save + favorites highlight.
8. **Protocols** – `rdp://`, `ssh://`, `vnc://` launch support.
9. **Security** – bcrypt, JWT http-only cookie, server-side RBAC, rate limiting, "we link, never store secrets".
10. **Roles table** – Viewer / Editor / Admin capabilities.
11. **FAQ** – accordion (a handful of common questions).
12. **Final CTA** – get started.
13. **Footer** – brand, section links, repo/app links, copyright.

---

## 5. Interactions (minimal vanilla JS, progressive enhancement)

- Mobile nav toggle.
- Smooth-scroll for in-page anchors.
- Scroll-reveal via `IntersectionObserver` (sections fade/rise in).
- FAQ accordion.
- Sticky header shadow on scroll.
- Auto current year in footer.

All content must be fully usable with JS disabled.

---

## 6. Files

```
website/
├─ PLAN.md            ← this file
├─ README.md          ← how to run / deploy / edit
├─ index.html         ← the landing page
├─ styles.css         ← brand + layout + responsive
├─ main.js            ← progressive-enhancement interactions
└─ assets/
   ├─ logo.svg        ← interlocking-rings mark
   └─ favicon.svg     ← favicon
```

---

## 7. Done / TODO

- [x] Branding + assets gathered
- [x] Folder + plan
- [x] index.html (all sections)
- [x] styles.css (responsive, branded)
- [x] main.js (interactions)
- [x] logo + favicon SVG
- [x] README + deploy notes
- [x] Browser validation pass (desktop hero/features/protocols/security/FAQ/CTA/footer + mobile hamburger nav)

### Backlog / future enhancements

- EN/SV language toggle (showcases the app's i18n; English ships first).
- Real product screenshots once available (replace the CSS mockup).
- Open Graph / Twitter card meta + preview image for sharing.
- Lighthouse/perf + a11y audit pass.
- Optional: wire the "Get started" CTA to the real app URL once hosting is decided.
