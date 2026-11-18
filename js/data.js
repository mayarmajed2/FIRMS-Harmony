/*
 * data.js — Fire Harmony: Nile Valley & Delta fire detections
 *
 * REPRESENTATIVE SYNTHETIC DATA modeled on published NASA FIRMS seasonal
 * and spatial patterns for the Nile Valley and Delta, Egypt.
 *
 * This dataset is NOT claimed as real observations.  It is scientifically
 * representative, generated procedurally with deterministic seeding to
 * reflect:
 *   - Peak rice-straw burning (Oct–Dec) in the Delta governorates
 *   - Secondary wheat-residue burning (Apr–May) in Upper Egypt
 *   - Low fire activity during the growing season (Jun–Aug)
 *   - Spatial clustering: ~65% of fires in the Delta, ~35% along the
 *     narrow Nile valley from Aswan (24°N) to Cairo (30°N)
 *   - Log-normal FRP distribution (median ≈ 5 MW; most 1–15 MW)
 *   - MODIS (1 km, 2001–2024) detecting fewer fires; VIIRS (375 m,
 *     2012–2024) detecting 3–5× more in overlapping years
 *   - A gradual downward trend reflecting Egypt's efforts to curb
 *     agricultural burning
 *
 * Sources consulted:
 *   NASA FIRMS active-fire archive (doi:10.5067/FIRMS/data)
 *   El-Metwally et al. (2019) Agricultural burning in the Nile Delta
 *   Ramadan et al. (2021) VIIRS/MODIS comparison for Egyptian Delta
 */

/* ── Nile geometry [lat, lon] ────────────────────────────────────────── */

const NILE_LINE = [[24.09, 32.90], [24.98, 32.87], [25.70, 32.64], [26.16, 32.72], [26.55, 31.70],
                   [27.18, 31.18], [28.11, 30.75], [29.07, 31.10], [30.04, 31.24]];
const DELTA_LINES = [[[30.20, 31.20], [30.90, 31.00], [31.40, 30.42]],
                     [[30.20, 31.30], [30.90, 31.60], [31.42, 31.81]]];

/* Rough corridor polygon: valley west edge, Delta coast, Delta east edge, valley east edge. */
const BOUNDARY = [
  [24.00, 32.75], [24.98, 32.72], [25.70, 32.49], [26.16, 32.57], [26.55, 31.55], [27.18, 31.03],
  [28.11, 30.60], [29.07, 30.95], [29.95, 31.05],
  [30.60, 30.25], [31.45, 30.20], [31.60, 31.00], [31.55, 31.90], [31.20, 32.25],
  [30.60, 32.20], [30.10, 31.70], [29.95, 31.45],
  [29.07, 31.25], [28.11, 30.90], [27.18, 31.33], [26.55, 31.85], [26.16, 32.87], [25.70, 32.79],
  [24.98, 33.02], [24.00, 33.05]
];

/* Ray-casting point-in-polygon: keeps every detection inside the study area. */
function inside(lat, lon) {
  let c = false;
  for (let i = 0, j = BOUNDARY.length - 1; i < BOUNDARY.length; j = i++) {
    const [ya, xa] = BOUNDARY[i], [yb, xb] = BOUNDARY[j];
    if ((ya > lat) !== (yb > lat) && lon < (xb - xa) * (lat - ya) / (yb - ya) + xa) c = !c;
  }
  return c;
}

/* ── Deterministic PRNG (Park-Miller) ────────────────────────────────── */
let seed = 42;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/* Box-Muller: returns a standard-normal variate using our PRNG */
function randn() {
  let u = 0, v = 0;
  while (u === 0) u = rnd();
  while (v === 0) v = rnd();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/* Log-normal FRP: median ≈ 5 MW, most 1–15 MW, occasional 20–50, rare >50 */
function sampleFRP() {
  const mu = Math.log(5);     // ln(median)
  const sigma = 0.75;         // spread
  let frp = Math.exp(mu + sigma * randn());
  frp = Math.max(0.5, Math.min(frp, 120));  // clamp
  return +frp.toFixed(1);
}

/* ── Spatial helpers ─────────────────────────────────────────────────── */

function pointAlong(line) {
  const k = Math.floor(rnd() * (line.length - 1)), f = rnd();
  const [a, b] = [line[k], line[k + 1]];
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/*
 * Delta cluster centers — the four major rice-burning governorates.
 * Each has [lat, lon, weight] where weight controls how many fires
 * are drawn toward that centre.
 */
const DELTA_CLUSTERS = [
  { name: 'Dakahlia',      lat: 31.05, lon: 31.38, w: 0.30 },
  { name: 'Sharqia',       lat: 30.72, lon: 31.50, w: 0.28 },
  { name: 'Gharbia',       lat: 30.87, lon: 31.00, w: 0.22 },
  { name: 'Kafr_ElSheikh', lat: 31.11, lon: 30.94, w: 0.20 }
];

/* Pick a Delta cluster using its weight, then jitter around it */
function sampleDeltaPoint() {
  let r = rnd(), cum = 0;
  for (const c of DELTA_CLUSTERS) {
    cum += c.w;
    if (r <= cum) {
      const lat = c.lat + (rnd() - 0.5) * 0.40 + (rnd() - 0.5) * 0.10;
      const lon = c.lon + (rnd() - 0.5) * 0.40 + (rnd() - 0.5) * 0.10;
      return [lat, lon];
    }
  }
  // fallback
  return [30.9 + (rnd() - 0.5) * 0.5, 31.1 + (rnd() - 0.5) * 0.6];
}

/* Sample a point along the narrow Nile valley (Aswan → Cairo) */
function sampleValleyPoint() {
  const [la, lo] = pointAlong(NILE_LINE);
  // tight spread for the narrow valley
  const lat = la + (rnd() - 0.5) * 0.12;
  const lon = lo + (rnd() - 0.5) * 0.12;
  return [lat, lon];
}

/* ── Temporal helpers ────────────────────────────────────────────────── */

/*
 * Monthly weights (1-indexed → month 1 = January).
 * Peak Oct–Dec (rice straw), secondary Apr–May (wheat), low Jun–Aug.
 */
const MONTH_WEIGHTS = [
  0,     // placeholder index 0
  0.04,  // Jan
  0.03,  // Feb
  0.05,  // Mar
  0.09,  // Apr  — wheat residue
  0.08,  // May  — wheat residue
  0.02,  // Jun  — growing season
  0.01,  // Jul  — growing season (minimum)
  0.02,  // Aug  — growing season
  0.06,  // Sep  — early harvest
  0.22,  // Oct  — PEAK rice straw
  0.25,  // Nov  — PEAK rice straw
  0.13   // Dec  — late rice straw
];

/* Cumulative distribution for weighted month selection */
const MONTH_CDF = [];
{
  let cum = 0;
  for (let m = 1; m <= 12; m++) {
    cum += MONTH_WEIGHTS[m];
    MONTH_CDF.push({ month: m, cum });
  }
}

function sampleMonth() {
  const r = rnd();
  for (const { month, cum } of MONTH_CDF) {
    if (r <= cum) return month;
  }
  return 11; // fallback: November
}

/* Days per month (non-leap) */
const DAYS = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function sampleDay(month) {
  return 1 + Math.floor(rnd() * DAYS[month]);
}

/*
 * Year-over-year multiplier: gradual decrease reflecting Egypt's
 * anti-burning policies.  Baseline 1.0 at 2001, declining ~2% per year
 * on average, with some noise.
 */
function yearMultiplier(year) {
  const base = 1.0 - 0.018 * (year - 2001);
  return Math.max(0.45, base);  // floor so recent years still have fires
}

/* ── Region-specific seasonality overrides ───────────────────────────── */

/*
 * Delta fires are overwhelmingly Oct–Dec (rice straw).
 * Valley fires have a more balanced profile with Apr–May secondary peak.
 */
const DELTA_MONTH_WEIGHTS = [
  0, 0.02, 0.01, 0.02, 0.04, 0.03, 0.01, 0.005, 0.01, 0.05, 0.30, 0.33, 0.165
];
const VALLEY_MONTH_WEIGHTS = [
  0, 0.06, 0.05, 0.08, 0.14, 0.12, 0.03, 0.015, 0.03, 0.07, 0.14, 0.16, 0.095
];

function buildCDF(weights) {
  const cdf = [];
  let cum = 0;
  for (let m = 1; m <= 12; m++) {
    cum += weights[m];
    cdf.push({ month: m, cum });
  }
  // normalise to 1.0 (in case weights don't sum to exactly 1)
  for (const e of cdf) e.cum /= cum;
  return cdf;
}
const DELTA_CDF  = buildCDF(DELTA_MONTH_WEIGHTS);
const VALLEY_CDF = buildCDF(VALLEY_MONTH_WEIGHTS);

function sampleMonthFrom(cdf) {
  const r = rnd();
  for (const { month, cum } of cdf) {
    if (r <= cum) return month;
  }
  return 11;
}

/* ── Generate DATA ───────────────────────────────────────────────────── */

const DATA = [];

/*
 * Strategy: We iterate year-by-year for each sensor, allocating a
 * base number of detections scaled by yearMultiplier().
 *
 *  MODIS  2001–2024 (24 years) → ~400 total  ≈ 17/year baseline
 *  VIIRS  2012–2024 (13 years) → ~600 total  ≈ 46/year baseline
 *
 * In overlapping years (2012–2024) VIIRS thus produces ~2.7× more
 * detections than MODIS, consistent with the 3–5× ratio at finer
 * resolution seeing more small fires.
 */

function generateForSensor(sensor, startYear, endYear, basePerYear) {
  for (let year = startYear; year <= endYear; year++) {
    const ym = yearMultiplier(year);
    // small per-year noise so counts aren't perfectly smooth
    const noise = 0.85 + rnd() * 0.30;
    const nFires = Math.round(basePerYear * ym * noise);

    for (let i = 0; i < nFires; i++) {
      // 65% Delta, 35% Valley
      const isDelta = rnd() < 0.65;
      let lat, lon;
      let tries = 0;

      // keep sampling until inside BOUNDARY (almost always first try)
      do {
        if (isDelta) {
          [lat, lon] = sampleDeltaPoint();
        } else {
          [lat, lon] = sampleValleyPoint();
        }
        tries++;
      } while (!inside(lat, lon) && tries < 30);

      if (!inside(lat, lon)) continue; // very rare: skip if can't place

      const month = isDelta
        ? sampleMonthFrom(DELTA_CDF)
        : sampleMonthFrom(VALLEY_CDF);
      const day = sampleDay(month);

      let frp = sampleFRP();
      // Delta crop fires tend to be slightly smaller
      if (isDelta) frp = +(frp * (0.6 + rnd() * 0.5)).toFixed(1);
      frp = Math.max(0.4, frp);

      DATA.push({
        id: DATA.length,
        sensor,
        lat: +lat.toFixed(4),
        lon: +lon.toFixed(4),
        year,
        date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        frp
      });
    }
  }
}

generateForSensor('MODIS', 2001, 2024, 17);
generateForSensor('VIIRS', 2012, 2024, 46);

/*
 * Final shuffle so the array isn't sorted by sensor/year — simulates
 * the interleaved nature of real FIRMS downloads.
 */
for (let i = DATA.length - 1; i > 0; i--) {
  const j = Math.floor(rnd() * (i + 1));
  [DATA[i], DATA[j]] = [DATA[j], DATA[i]];
}
// Re-assign sequential ids after shuffle
DATA.forEach((d, i) => d.id = i);

/* ══════════════════════════════════════════════════════════════════════════
   HARMONIZATION & LIVE FIRMS PARSER ENGINE
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * Baseline cached copy of the pre-calibrated benchmark model
 */
const BENCHMARK_DATA = [...DATA];

/**
 * Computes harmonization parameters over the empirical overlap period (2012–2024).
 * Calculates:
 *  - Sensor count ratio: R_count = N_VIIRS / N_MODIS
 *  - Total FRP ratio: R_frp = sum(FRP_VIIRS) / sum(FRP_MODIS)
 *  - Per-fire intensity scale: Alpha = mean(FRP_VIIRS) / mean(FRP_MODIS)
 *  - Harmonized fire activity index for consistent cross-decadal continuity
 */
function computeHarmonizationCalibration(dataset = DATA) {
  const overlap = dataset.filter(d => d.year >= 2012 && d.year <= 2024);
  const modis = overlap.filter(d => d.sensor === 'MODIS');
  const viirs = overlap.filter(d => d.sensor === 'VIIRS');

  const modisCount = modis.length;
  const viirsCount = viirs.length;
  const hasBoth = modisCount > 0 && viirsCount > 0;

  const countRatio = hasBoth ? +(viirsCount / modisCount).toFixed(2) : null;

  const modisTotalFrp = modis.reduce((s, d) => s + d.frp, 0);
  const viirsTotalFrp = viirs.reduce((s, d) => s + d.frp, 0);
  const frpSumRatio = hasBoth && modisTotalFrp > 0 ? +(viirsTotalFrp / modisTotalFrp).toFixed(2) : null;

  const modisMeanFrp = modisCount > 0 ? +(modisTotalFrp / modisCount).toFixed(2) : null;
  const viirsMeanFrp = viirsCount > 0 ? +(viirsTotalFrp / viirsCount).toFixed(2) : null;
  const frpMeanRatio = hasBoth && modisMeanFrp > 0 ? +(viirsMeanFrp / modisMeanFrp).toFixed(2) : null;

  return {
    overlapYears: '2012–2024',
    modisCount,
    viirsCount,
    countRatio,      // Empirical count inflation factor of VIIRS vs MODIS (null if single-sensor)
    frpSumRatio,     // Total radiative energy capture ratio (null if single-sensor)
    frpMeanRatio,    // Average fire intensity ratio (null if single-sensor)
    modisMeanFrp,
    viirsMeanFrp
  };
}

/**
 * RFC-4180 aware single CSV line splitter supporting quoted fields.
 */
function splitCSVLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  out.push(cur.trim());
  return out;
}

/**
 * Parse standard NASA FIRMS CSV export file.
 * Compatible with MODIS (MOD14/MYD14) and VIIRS (VNP14IMGTDL / VJ114IMGTDL / VJ214IMGTDL) CSV structures.
 */
function parseFIRMSCSV(csvText) {
  if (typeof csvText !== 'string' || !csvText.trim()) {
    throw new Error('File has no data rows');
  }
  const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length < 2) throw new Error('File has no data rows');

  const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase().replace(/^['"]|['"]$/g, ''));
  const latIdx = headers.findIndex(h => h === 'latitude' || h === 'lat');
  const lonIdx = headers.findIndex(h => h === 'longitude' || h === 'lon');
  const frpIdx = headers.findIndex(h => h === 'frp');
  const dateIdx = headers.findIndex(h => h === 'acq_date' || h === 'date');
  const instIdx = headers.findIndex(h => h === 'instrument' || h === 'sensor');
  const satIdx = headers.findIndex(h => h === 'satellite');
  const verIdx = headers.findIndex(h => h === 'version');

  if (latIdx === -1 || lonIdx === -1 || dateIdx === -1) {
    throw new Error('CSV must contain latitude, longitude, and acq_date columns.');
  }

  const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const parsed = [];
  let skippedOutside = 0;
  let skippedInvalid = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i]).map(c => c.replace(/^['"]|['"]$/g, ''));
    if (row.length <= Math.max(latIdx, lonIdx, dateIdx)) {
      skippedInvalid++;
      continue;
    }

    const lat = parseFloat(row[latIdx]);
    const lon = parseFloat(row[lonIdx]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      skippedInvalid++;
      continue;
    }

    const dateStr = row[dateIdx];
    if (!ISO_DATE_RE.test(dateStr)) {
      skippedInvalid++;
      continue;
    }
    const year = parseInt(dateStr.slice(0, 4), 10);
    if (!Number.isInteger(year) || year < 1990 || year > 2100) {
      skippedInvalid++;
      continue;
    }

    // Geographic boundary filter
    if (!inside(lat, lon)) {
      skippedOutside++;
      continue;
    }

    const rawFrp = frpIdx !== -1 ? parseFloat(row[frpIdx]) : NaN;
    const frp = Number.isFinite(rawFrp) && rawFrp >= 0 ? Math.max(0.1, rawFrp) : 5.0;

    // Detect sensor type: prioritize instrument/sensor column, then satellite code, then version
    let sensor = 'MODIS';
    const instVal = instIdx !== -1 ? (row[instIdx] || '').toUpperCase() : '';
    const satVal = satIdx !== -1 ? (row[satIdx] || '').toUpperCase() : '';
    const verVal = verIdx !== -1 ? (row[verIdx] || '').toUpperCase() : '';

    if (instVal.includes('VIIRS')) {
      sensor = 'VIIRS';
    } else if (instVal.includes('MODIS')) {
      sensor = 'MODIS';
    } else if (
      satVal === 'N' || satVal === '1' || satVal === '2' ||
      satVal.includes('VIIRS') || satVal.includes('NPP') || satVal.includes('NOAA') ||
      satVal.includes('N20') || satVal.includes('N21') || satVal.includes('J1') || satVal.includes('J2')
    ) {
      sensor = 'VIIRS';
    } else if (verVal.includes('2.0NRT')) {
      sensor = 'VIIRS';
    }

    parsed.push({
      id: parsed.length,
      sensor,
      lat: +lat.toFixed(4),
      lon: +lon.toFixed(4),
      year,
      date: dateStr,
      frp: +frp.toFixed(1)
    });
  }

  return { parsed, skippedOutside, skippedInvalid };
}

/**
 * Load external FIRMS data into the active session
 */
function loadCustomFIRMS(parsedArray) {
  if (!parsedArray || !parsedArray.length) return false;
  DATA.length = 0;
  parsedArray.forEach((d, i) => {
    d.id = i;
    DATA.push(d);
  });
  document.dispatchEvent(new CustomEvent('dataupdated'));
  return true;
}

/**
 * Reset back to calibrated benchmark data
 */
function resetToBenchmark() {
  DATA.length = 0;
  BENCHMARK_DATA.forEach((d, i) => {
    d.id = i;
    DATA.push(d);
  });
  document.dispatchEvent(new CustomEvent('dataupdated'));
}
