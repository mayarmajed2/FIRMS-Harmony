# Development Guide

This guide outlines the development workflow, coding conventions, design token system, and internationalization practices for **Fire Harmony**.

---

## 1. Local Development Workflow

Because Fire Harmony has **no build step or transpilation**, edits to HTML, CSS, or JS take effect immediately on browser reload:

1. Start a local static server from the repository root:
   ```bash
   python -m http.server 8080
   ```
2. Open `http://localhost:8080` with Browser DevTools open (`F12`).
3. Edit files under `index.html`, `css/styles.css`, or `js/`.
4. Hard-reload (`Ctrl+Shift+R` / `Cmd+Shift+R`) to verify changes across both **English (LTR)** and **Arabic (RTL)** modes.

---

## 2. Coding Standards & Conventions

- **Zero External Runtime Frameworks:** Keep all application logic in vanilla ES6+ JavaScript and charts in native inline SVG. Do not introduce bundlers, npm dependencies, or third-party charting libraries without clear architectural justification.
- **Module Isolation:** Wrap view-specific code (`analytics.js`, `sensors.js`, `methodology.js`, `about.js`) in strict-mode IIFEs (`(function () { 'use strict'; ... })();`) to avoid polluting the global namespace.
- **Script Ordering:** Any new script added to `index.html` must be placed **after** `js/data.js` and **before** `js/router.js`.
- **Event Subscriptions:**
  - Views that display dataset-derived metrics should subscribe to `document.addEventListener('dataupdated', ...)`.
  - Views that render localized strings should subscribe to `document.addEventListener('langchange', ...)`.
- **Accessibility:**
  - Use semantic HTML landmarks and `aria-label` / `aria-live` attributes on dynamic controls and SVG charts (`role="img"`).
  - Respect `@media (prefers-reduced-motion: reduce)` for CSS animations and JS-driven animations (`requestAnimationFrame`, `setInterval`).
  - Maintain `>= 24px` interactive touch targets.

---

## 3. CSS Design Tokens (`css/styles.css`)

All colors and typography are centralized in `:root` custom properties:

| Token | Value | Usage |
| :--- | :--- | :--- |
| `--bg` | `#17110c` | Primary dark espresso background |
| `--moss` | `#14323a` | Deep Nile teal accent |
| `--canopy` | `#1f7a78` | MODIS / vegetation accent & FRP histogram fill |
| `--ember` | `#ff5a4a` | Primary brand accent, active nav, CTAs |
| `--blaze` | `#e0432b` | VIIRS / high-severity fire accent |
| `--ash` | `#e0d6c8` | Primary body copy |
| `--smoke` | `#9a8e7e` | Secondary labels, captions, notes |
| `--white` | `#fbf5ea` | Headings and emphasized values |
| `--line` | `rgba(224, 214, 200, .14)` | Subtle borders and gridlines |
| `--panel` | `rgba(58, 36, 22, .45)` | Translucent card/panel surfaces |
| `--fd` | `'Fraunces', serif` (`'Cairo'` in `ar`) | Display headings |
| `--fb` | `'DM Sans'` (`'Cairo'` in `ar`) | Body & UI typography |

---

## 4. Working with Internationalization (`js/i18n.js`)

All static and dynamic user-facing strings should be keyed in `I18N.en` and `I18N.ar` inside `js/i18n.js`:

1. Add the key to both `I18N.en` and `I18N.ar`:
   ```js
   en: {
     my_new_label: 'Active Detections'
   },
   ar: {
     my_new_label: 'الرصدات النشطة'
   }
   ```
2. Reference it in HTML via `data-i18n="my_new_label"` (or `data-i18n-aria` for accessible labels), or in JavaScript via `t('my_new_label', 'Active Detections')`.
3. For directional CSS properties, use CSS logical properties (`margin-inline-start`, `padding-inline-start`, `border-inline-start`, `float: inline-end`) so layouts mirror cleanly in `[dir="rtl"]`.

---

## 5. Manual QA Checklist Before Submitting a PR

- [ ] No console errors or uncaught exceptions across all 6 routes (`#home`, `#map`, `#analytics`, `#sensors`, `#methodology`, `#about`).
- [ ] Both English (`LTR`) and Arabic (`RTL`) layouts render without text overflow or clipped SVG labels.
- [ ] Responsive layouts verified at desktop (`1280px`), tablet (`860px`), and mobile (`390px`) widths.
- [ ] Uploading a valid NASA FIRMS CSV updates Home, Map, and Analytics; clicking **Reset to Calibrated Benchmark** restores the original counts.
- [ ] Map CSV export downloads a valid UTF-8 CSV matching the active filter count.
- [ ] Keyboard navigation (`Tab`, skip-to-content link, map marker focus) works cleanly.
