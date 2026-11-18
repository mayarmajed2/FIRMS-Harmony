# Contributing to Fire Harmony

Thank you for your interest in contributing to **Fire Harmony**! We welcome community contributions that improve cross-sensor active-fire harmonization, geospatial analysis, accessibility, bilingual parity, and technical documentation.

---

## Code of Conduct

We are committed to maintaining a welcoming, respectful, and inclusive open-source community. Please treat all contributors, reviewers, and users with professionalism and courtesy.

---

## Getting Started

1. **Fork the repository** on GitHub.
2. **Clone your fork:**
   ```bash
   git clone https://github.com/<your-username>/FIRMS-Harmony.git
   cd FIRMS-Harmony
   ```
3. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```
4. **Run locally** using any static server (see [docs/INSTALLATION.md](docs/INSTALLATION.md)):
   ```bash
   python -m http.server 8080
   ```

---

## Development Guidelines

Before making changes, please review [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) for full details on script load order, design tokens, and manual QA. Key principles include:

- **Zero-Build Frontend:** Fire Harmony uses vanilla HTML5, CSS3 custom properties, ES6+ JavaScript, and native inline SVG visualizations. Avoid introducing build tools or heavy third-party charting libraries.
- **Bilingual Parity (EN / AR):** Every user-facing string added in English should be registered in `js/i18n.js` with a corresponding Arabic translation and verified in both `LTR` and `RTL` layouts.
- **Scientific Rigor:** Any modification to harmonization equations, spatial boundary polygons (`BOUNDARY`), or trend regressions should reference peer-reviewed remote sensing literature (e.g., Wooster et al., 2003; Schroeder et al., 2014; Giglio et al., 2016).
- **Accessibility:** Preserve keyboard navigation, semantic landmarks, `aria-live` updates, and `prefers-reduced-motion` support.

---

## Submitting a Pull Request

1. Ensure there are no browser console errors across all six views (`#home`, `#map`, `#analytics`, `#sensors`, `#methodology`, `#about`).
2. Verify both English (`LTR`) and Arabic (`RTL`) rendering on desktop and mobile viewports.
3. Commit your changes with clear, descriptive messages.
4. Push to your branch and open a Pull Request against `main`, describing what changed, why it was needed, and how it was tested.
