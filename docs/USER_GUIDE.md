# User Guide

This guide walks through every view, interactive control, and data workflow available in **Fire Harmony**.

---

## 1. Navigation Overview

Fire Harmony is organized into six views accessible from the sticky top navigation bar (or via URL hash):

| View | Route | Purpose |
| :--- | :--- | :--- |
| **Home** | `#home` | Executive summary, live KPI counters, MODIS vs. VIIRS overview, and Nile corridor context |
| **Fire Map** | `#map` | Interactive Leaflet GIS map with filters, time-lapse animation, marker inspection, and CSV export |
| **Analytics** | `#analytics` | Multi-decadal trends, seasonality, FRP histogram, burning calendar, harmonization matrix, and CSV upload |
| **Sensors** | `#sensors` | Technical comparison of MODIS (1 km) vs. VIIRS (375 m), overlap statistics, and sub-pixel physics |
| **Methodology** | `#methodology` | Data pipeline diagram, boundary extent, FRP physics equation, references, and limitations |
| **About** | `#about` | Project mission, objectives, study area metrics, data sources, and acknowledgments |

---

## 2. Interactive Fire Map (`#map`)

### Filtering Detections
Use the left control panel to filter the active dataset in real time:
- **MODIS / VIIRS Checkboxes:** Independently show or hide `MODIS (Terra/Aqua ≈1 km)` squares (`■`) and `VIIRS (S-NPP/NOAA-20 ≈375 m)` circles (`●`).
- **Observation Window (Year):** Select start (`From year`) and end (`To year`) bounds between `2001` and `2024`. The filter automatically handles reversed selections (`Math.min` / `Math.max`).
- **Minimum FRP Slider:** Filter out low-intensity detections from `0 MW` up to `60 MW`.

### Reading the Thermal Scale & Stats Bar
- Markers are shaded across a 6-step thermal color ramp from deep violet (`low`, ~1 MW) through crimson and orange to bright yellow-white (`high`, 60+ MW).
- The **Stats Bar** above the map dynamically reports: total filtered detections, average FRP (MW), MODIS count, and VIIRS count.

### Inspecting Individual Detections
Click any marker on the map to populate the inspection panel with:
- Sensor type (`MODIS` or `VIIRS`)
- Acquisition date (`YYYY-MM-DD`)
- Geographic coordinates (`lat°N, lon°E`)
- Fire Radiative Power (`MW`), color-coded by the thermal ramp
- **Nearby Detections:** Count of other filtered detections within `~0.1°` (`≈11 km`)
- Internal Record ID

### Yearly Time-Lapse Animation
- Click **▶ Play** in the filter panel to animate detections one year at a time (`1.3 s` per year) across the selected year range.
- Click **⏸ Pause** or modify any filter control to stop playback and return to the full filtered range.
- *Accessibility Note:* If your OS/browser has `prefers-reduced-motion: reduce` enabled, time-lapse animation is automatically disabled.

### Exporting Filtered Data
Click **⬇ Export Filtered CSV** to download all currently visible detections as `fire_harmony_nile_detections_YYYY-MM-DD.csv` with columns:
```text
id,sensor,latitude,longitude,date,year,frp_mw
```

---

## 3. Analytics & Harmonization Dashboard (`#analytics`)

### KPI Summary Cards
Six top-level metrics update automatically whenever the dataset changes:
1. **Total Detections** (with MODIS / VIIRS breakdown)
2. **Mean FRP (MW)**
3. **Median FRP (MW)**
4. **Peak Month** (month with highest combined detections)
5. **Years of Record** (`minYear–maxYear`)
6. **Harmonized Trend (MODIS)** — linear regression slope (detections/year) computed strictly on MODIS records so the 2012 VIIRS launch does not distort the long-term trend.

### Interactive SVG Charts
Hover over any bar in the three SVG charts to inspect exact counts via native tooltips:
- **Yearly Fire Activity & The 2012 Transition:** Stacked MODIS (orange) and VIIRS (red) annual bars with a dashed vertical marker at `2012`.
- **Agricultural Seasonality:** Grouped monthly bars comparing MODIS and VIIRS, with the October–December rice-straw peak shaded.
- **FRP Distribution Histogram:** 18-bin distribution of Fire Radiative Power with a dashed yellow median line.

### Nile Delta Agricultural Burning Calendar
Contextualizes seasonal peaks against Egyptian agricultural cycles:
- **Autumn Peak (Oct–Dec):** Rice straw residue burning in Dakahlia, Sharqia, Gharbia, and Kafr El-Sheikh (`~65%` of Delta detections).
- **Spring Secondary (Apr–May):** Winter wheat stubble clearance along Upper Egypt and Delta fringes (`~17%` of annual detections).
- **Summer Minimum (Jun–Aug):** High crop moisture and active irrigation (`<5%` annual rate).

### Empirical Cross-Sensor Harmonization Matrix
Displays live calibration metrics computed over the `2012–2024` overlap window:
- **VIIRS / MODIS Count Ratio ($R_{\text{count}}$)**
- **MODIS Mean FRP (MW)**
- **VIIRS Mean FRP (MW)**
- **Mean Intensity Ratio ($\alpha$)**

---

## 4. Uploading Real NASA FIRMS CSV Data

You can replace the preloaded benchmark dataset with genuine NASA FIRMS downloads at any time:

1. Download an active-fire CSV for Egypt from [NASA FIRMS Download](https://firms.modaps.eosdis.nasa.gov/download/) (MODIS C6.1 or VIIRS S-NPP / NOAA-20 / NOAA-21).
2. Navigate to **Analytics** (`#analytics`) and scroll to **Load Live NASA FIRMS Data (CSV)**.
3. Click **📂 Upload FIRMS CSV** and select your `.csv` file.
4. Fire Harmony parses the file locally in your browser, filters out any detections outside the Nile corridor polygon, and updates the **Home**, **Fire Map**, and **Analytics** views immediately.
5. A status message reports how many detections were loaded and how many outside-corridor points were excluded.
6. Click **🔄 Reset to Calibrated Benchmark** at any time to restore the built-in 2001–2024 dataset.

> **Tip:** Uploaded CSVs spanning any year range (including `2025+` NASA FIRMS exports) automatically update the **Fire Map** year dropdowns as well as the **Home**, **Analytics**, and **Sensors** views.

---

## 5. Language and RTL Support

Click the **العربية** button in the top header to switch the interface to Arabic (`dir="rtl"`):
- Loads the **Cairo** Arabic typeface.
- Mirrors directional layout elements, arrows, skip links, and chart labels.
- Persists your language choice in `localStorage` (`fh-lang`) across page reloads.

Click **English** to switch back to English (`dir="ltr"`).
