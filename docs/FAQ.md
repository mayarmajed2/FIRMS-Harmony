# Frequently Asked Questions (FAQ) & Troubleshooting

---

## General & Scientific Questions

### Why does fire activity appear to jump sharply in 2012?
In 2012, the **VIIRS** sensor (375 m I-band resolution on Suomi NPP) began operating alongside **MODIS** (1 km resolution on Terra and Aqua). Because one MODIS 1 km pixel covers roughly 7 VIIRS 375 m pixels, VIIRS resolves small agricultural residue fires that fall below MODIS's thermal detection threshold. Summing both sensors naively creates an artificial **~3–5× jump** in 2012. Fire Harmony keeps both sensors separated and computes the long-term linear trend using MODIS-only records (`2001–2024`).

### Is the default dataset real NASA FIRMS telemetry?
No. By default, Fire Harmony loads a **calibrated, deterministically seeded synthetic dataset** (`js/data.js`, `seed = 42`) modeled on published NASA FIRMS seasonal, spatial, and FRP distributions for the Nile Valley and Delta. This allows immediate offline-capable exploration without API keys. You can load genuine NASA FIRMS CSV archives at any time from the **Analytics** (`#analytics`) page.

### Why are detections outside the Nile Valley and Delta excluded?
Egypt's agricultural and human settlement activity is concentrated along the narrow fertile Nile corridor (`24.0°N–31.6°N`, `30.2°E–33.1°E`). Clipping observations against the 25-vertex `BOUNDARY` polygon removes thermal false positives from desert oil/gas flares and industrial sites outside the cultivated landscape.

---

## Data Upload & Export Troubleshooting

### My uploaded NASA FIRMS CSV shows `No detections found inside Nile boundary in this file.`
This occurs when all rows in the CSV fall outside the `BOUNDARY` polygon (for example, if the CSV covers another country or exclusively desert oil fields). Verify that your file contains `latitude` values roughly between `24.0` and `31.6` and `longitude` values roughly between `30.2` and `33.1`.

### My uploaded CSV throws `CSV must contain latitude, longitude, and acq_date columns.`
Ensure the first line of your CSV contains standard header names:
- `latitude` (or `lat`)
- `longitude` (or `lon`)
- `acq_date` (or `date`)

Headers are matched case-insensitively and surrounding quotes are stripped automatically.

### What happens when I upload a 2025/2026 NASA FIRMS CSV?
The Fire Map year dropdowns (`#y0`, `#y1` in `js/map.js`) automatically synchronize to the `minYear..maxYear` range of the uploaded dataset, and all views (**Home**, **Fire Map**, **Analytics**, and **Sensors**) refresh immediately via the `dataupdated` event bus. If the filtered view exceeds 1,500 markers, the map automatically switches to Leaflet's Canvas renderer for smooth performance.

### Where is my uploaded CSV sent?
Nowhere. Files are parsed entirely inside your browser using the native `FileReader` API. Refreshing the page or clicking **Reset to Calibrated Benchmark** clears the uploaded dataset from memory.

---

## Display, Map & Browser Troubleshooting

### The map says Leaflet could not load, or map tiles are blank.
Fire Harmony loads Leaflet 1.9.4 from `cdnjs.cloudflare.com` and dark basemap tiles from `basemaps.cartocdn.com`. Check your internet connection or corporate firewall/ad-blocker rules for those domains. All non-map views (`Home`, `Analytics`, `Sensors`, `Methodology`, `About`) continue to function without Leaflet.

### Time-lapse playback (`▶ Play`) on the Fire Map does not start.
Fire Harmony respects the operating system's **Reduced Motion** accessibility setting (`prefers-reduced-motion: reduce`). If reduced motion is enabled in your OS or browser, both KPI count-up animations and map time-lapse playback are intentionally disabled.

### How do I reset the language back to English or Arabic?
Click the language toggle button (**العربية** / **English**) in the top navigation bar. Your preference is saved in `localStorage` under the key `fh-lang`.
