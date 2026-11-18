# Installation & Setup Guide

Fire Harmony is a static, client-side web application with **zero build tools, zero package managers, and zero backend services**. You can run it locally in seconds.

---

## 1. Prerequisites

- **Git** (optional, for cloning the repository)
- **A modern web browser** with ES6+, CSS Custom Properties, SVG, and `FileReader` support:
  - Google Chrome / Chromium (v90+)
  - Microsoft Edge (v90+)
  - Mozilla Firefox (v90+)
  - Apple Safari (v15+)
- **Optional local HTTP server** (Python 3, Node.js, or VS Code Live Server) — recommended for an environment matching production static hosting.
- **Internet connection** (for initial CDN loading of Leaflet 1.9.4, CARTO basemap tiles, and Google Fonts).

---

## 2. Clone the Repository

```bash
git clone https://github.com/mayarmajed2/FIRMS-Harmony.git
cd FIRMS-Harmony
```

---

## 3. Running Locally

### Option A: Python Built-in HTTP Server (Recommended)
If you have Python 3 installed:

```bash
python -m http.server 8080
```
Open `http://localhost:8080` in your browser.

### Option B: Node.js Static Server
If you have Node.js installed:

```bash
npx serve . -l 8080
```
Open `http://localhost:8080` in your browser.

### Option C: VS Code Live Server
1. Open the `FIRMS-Harmony` folder in Visual Studio Code.
2. Install the **Live Server** extension (`ritwickdey.LiveServer`).
3. Right-click `index.html` and select **Open with Live Server**.

### Option D: Open Directly from Disk
Double-click `index.html` or open it via your browser's `File → Open File...` menu (`file:///.../index.html`). All core features—including hash routing, SVG charts, NASA FIRMS CSV upload, and CSV export—work directly over `file://`.

---

## 4. Environment Variables & Configuration

Fire Harmony requires **no environment variables, `.env` files, or API keys**.

- **Language Persistence:** Managed automatically in the browser via `localStorage.getItem('fh-lang')` (`en` or `ar`).
- **Default Dataset:** Generated deterministically in `js/data.js` on page load (`seed = 42`).

---

## 5. Post-Setup Verification Checklist

After opening the application in your browser, verify the following:

1. **Home (`#home`):** Four KPI counters animate into view (total detections, median FRP, 24 years of record, 2 sensors harmonized), and the animated Nile SVG renders on the right.
2. **Fire Map (`#map`):** The CARTO Dark Matter map loads centered on the Nile corridor with the dashed turquoise boundary polygon, river polylines, and fire markers.
3. **Analytics (`#analytics`):** Three SVG charts (Yearly, Monthly, FRP Histogram), the Agricultural Burning Calendar, the Empirical Cross-Sensor Harmonization Matrix, and the CSV upload controls render cleanly.
4. **Sensors (`#sensors`):** Instrument comparison tables, the 2012–2024 overlap chart, and the 1 km vs. 375 m sub-pixel diagram display without console errors.
5. **Methodology (`#methodology`):** The 6-stage pipeline flowchart and FRP radiometric equation render properly.
6. **Bilingual Toggle:** Clicking **العربية** switches `dir="rtl"` and translates the interface to Arabic; clicking **English** restores `dir="ltr"`.
