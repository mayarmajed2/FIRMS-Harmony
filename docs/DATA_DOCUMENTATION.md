# Data Documentation

This document describes the internal data schemas, geographic boundary geometry, deterministic benchmark model, NASA FIRMS CSV ingestion specification, and cross-sensor harmonization formulas implemented in `js/data.js`.

---

## 1. Active Detection Record Schema

Every fire detection stored in the active `DATA` array conforms to the following normalized JavaScript object schema:

| Field | Type | Format / Range | Description |
| :--- | :--- | :--- | :--- |
| `id` | `number` | Integer `0..N-1` | Sequential record identifier (re-indexed after shuffle or CSV load) |
| `sensor` | `string` | `'MODIS'` \| `'VIIRS'` | Thermal instrument classification |
| `lat` | `number` | Float (4 decimals), `24.0000..31.6000` | Latitude in decimal degrees North (WGS84) |
| `lon` | `number` | Float (4 decimals), `30.2000..33.1000` | Longitude in decimal degrees East (WGS84) |
| `year` | `number` | 4-digit integer | Acquisition year extracted from `date` |
| `date` | `string` | `YYYY-MM-DD` | Acquisition date string |
| `frp` | `number` | Float (1 decimal), `MW` | Fire Radiative Power in Megawatts |

---

## 2. Study Area & Geographic Boundary (`BOUNDARY`)

Fire Harmony isolates Egypt's fertile Nile Valley and Delta corridor (`~35,000 km²`) using a **25-vertex polygon** (`BOUNDARY` in `js/data.js`) spanning:
- **Latitude:** `24.00°N` (Aswan) to `31.60°N` (Mediterranean Delta coast)
- **Longitude:** `30.20°E` (Western Delta) to `33.05°E` (Eastern Upper Egypt)

### Point-in-Polygon Verification (`inside(lat, lon)`)
Every coordinate is validated via an even-odd **ray-casting algorithm**:
```js
function inside(lat, lon) {
  let c = false;
  for (let i = 0, j = BOUNDARY.length - 1; i < BOUNDARY.length; j = i++) {
    const [ya, xa] = BOUNDARY[i], [yb, xb] = BOUNDARY[j];
    if ((ya > lat) !== (yb > lat) && lon < (xb - xa) * (lat - ya) / (yb - ya) + xa) c = !c;
  }
  return c;
}
```
This removes thermal anomalies originating from desert oil/gas flares, cement kilns outside the corridor, and Sahara background heat.

### River Cartography Overlays
In addition to `BOUNDARY`, `js/data.js` defines:
- `NILE_LINE`: 9-point polyline tracing the Nile River from Aswan (`24.09°N, 32.90°E`) to Cairo (`30.04°N, 31.24°E`).
- `DELTA_LINES`: Two 3-point polylines representing the Rosetta (west) and Damietta (east) Nile Delta distributary branches.

---

## 3. Calibrated Synthetic Benchmark Dataset

By default, Fire Harmony loads a **deterministically seeded synthetic dataset** modeled on published NASA FIRMS patterns for Egypt (`2001–2024`). It is transparently labeled as a calibrated synthetic model and is never presented as raw satellite telemetry.

### Deterministic Randomness
- **PRNG:** Park-Miller linear congruential generator (`seed = 42`, `a = 16807`, `m = 2147483647`).
- **Normal Variates:** Box-Muller transform (`randn()`) derived directly from the seeded PRNG.

### Sensor Generation Parameters
| Sensor | Years | Base Detections / Year | Target Share |
| :--- | :---: | :---: | :--- |
| **MODIS** | `2001–2024` (24 yr) | `17` | ~400 total |
| **VIIRS** | `2012–2024` (13 yr) | `46` | ~600 total |

- **Annual Policy Trend Multiplier (`yearMultiplier(year)`):** `Math.max(0.45, 1.0 - 0.018 * (year - 2001))` (~1.8% annual reduction reflecting Egypt's agricultural burning mitigation policies, floored at `0.45`), modulated by uniform per-year noise in `[0.85, 1.15]`.
- **Spatial Split:** `65%` Nile Delta, `35%` Nile Valley (`NILE_LINE` with `±0.06°` jitter).
- **Delta Governorates (`DELTA_CLUSTERS`):**
  - Dakahlia (`31.05°N, 31.38°E`, weight `0.30`)
  - Sharqia (`30.72°N, 31.50°E`, weight `0.28`)
  - Gharbia (`30.87°N, 31.00°E`, weight `0.22`)
  - Kafr El-Sheikh (`31.11°N, 30.94°E`, weight `0.20`)
- **Regional Seasonality:**
  - *Delta (`DELTA_MONTH_WEIGHTS`):* Strongly concentrated in Oct (`0.30`), Nov (`0.33`), and Dec (`0.165`) for rice-straw burning.
  - *Valley (`VALLEY_MONTH_WEIGHTS`):* Bimodal with spring wheat stubble (Apr `0.14`, May `0.12`) and autumn harvest (Oct `0.14`, Nov `0.16`).
- **FRP Distribution (`sampleFRP()`):** Log-normal with `mu = ln(5)` (~5 MW median), `sigma = 0.75`, clamped to `[0.5, 120]` MW. Delta agricultural burns are scaled by `0.6–1.1` (floor `0.4` MW) to reflect smaller field plots.

---

## 4. NASA FIRMS CSV Ingestion Specification (`parseFIRMSCSV`)

`parseFIRMSCSV(csvText)` parses standard comma-separated active-fire exports downloaded from [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov/download/).

### Column Mapping (Case-Insensitive, Quotes Stripped)

| Logical Field | Accepted CSV Header Names | Required | Fallback / Parsing Rule |
| :--- | :--- | :---: | :--- |
| Latitude | `latitude`, `lat` | Yes | `parseFloat`; non-numeric rows skipped |
| Longitude | `longitude`, `lon` | Yes | `parseFloat`; non-numeric rows skipped |
| Acquisition Date | `acq_date`, `date` | Yes | Stored verbatim; `year` parsed from `YYYY` prefix |
| Fire Radiative Power | `frp` | No | Defaults to `5.0` MW if absent/NaN; floored at `0.1` MW |
| Sensor / Satellite | `satellite`, `instrument`, `sensor` | No | Classified as `'VIIRS'` if value contains `VIIRS`, `NPP`, `NOAA`, `N20`, or `N21` (or if `version === '2.0NRT'`); otherwise `'MODIS'` |
| Acquisition Time | `acq_time`, `time` | No | Detected in header index (reserved) |
| Confidence | `confidence`, `conf` | No | Detected in header index (reserved) |

### Validation & Output
- Throws an `Error` if the file has fewer than 2 lines or lacks `latitude`, `longitude`, or `acq_date`.
- Clips every valid row against `inside(lat, lon)` and returns `{ parsed, skippedOutside }`.

---

## 5. Cross-Sensor Harmonization Formulas (`computeHarmonizationCalibration`)

Computed over the overlap period (`2012 <= d.year <= 2024`):

1. **Count Inflation Ratio:**
   $$R_{\text{count}} = \frac{N_{\text{VIIRS}}}{N_{\text{MODIS}}}$$
2. **Total FRP Capture Ratio:**
   $$R_{\text{FRP}} = \frac{\sum \text{FRP}_{\text{VIIRS}}}{\sum \text{FRP}_{\text{MODIS}}}$$
3. **Mean Intensity Ratio ($\alpha$):**
   $$\alpha = \frac{\overline{\text{FRP}}_{\text{VIIRS}}}{\overline{\text{FRP}}_{\text{MODIS}}}$$

### MODIS-Only Long-Term Trend (`js/analytics.js`)
To avoid bias from the 2012 VIIRS launch, the Harmonized Trend KPI computes an ordinary least squares (OLS) linear slope exclusively over years with MODIS detections:

$$\text{slope} = \frac{\sum (y_i - \bar{y})(c_i - \bar{c})}{\sum (y_i - \bar{y})^2}$$

where $y_i$ is year and $c_i$ is MODIS annual detection count.

---

## 6. Authoritative References

- **NASA FIRMS Active Fire Archive:** `doi:10.5067/FIRMS/data`
- Wooster, M. J., Zhukov, B., & Oertel, D. (2003). *Fire radiative energy for quantitative study of biomass burning*. Remote Sensing of Environment, 86(1), 83–107.
- Schroeder, W., et al. (2014). *The New VIIRS 375 m Active Fire Detection Data Product*. Remote Sensing of Environment, 143, 85–96.
- Giglio, L., Schroeder, W., & Justice, C. O. (2016). *An Enhanced Contextual Fire Detection Algorithm for MODIS*. Remote Sensing of Environment, 191, 344–364.
- El-Metwally et al. (2019). *Agricultural burning in the Nile Delta*.
- Ramadan et al. (2021). *VIIRS/MODIS comparison for Egyptian Delta*.
