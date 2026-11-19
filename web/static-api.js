'use strict';

/* Client-side static API engine for Delta Fire Calendar.
 * Mirrors pipeline/app.py identically so the app runs 100% free on GitHub Pages
 * directly from ../data/processed/*.csv with zero backend server.
 */

(function () {
  const BOUNDS = [29.5, 29.8, 32.5, 31.65];
  const GRID_X = Array.from({ length: 12 }, (_, i) => Number((29.5 + 0.25 * i).toFixed(2)));
  const GRID_Y = Array.from({ length: 8 }, (_, i) => Number((29.75 + 0.25 * i).toFixed(2)));
  const PLATFORMS = ['terra', 'aqua', 'snpp', 'noaa20'];
  const PLATFORM_LABEL = {
    terra: 'MODIS Terra',
    aqua: 'MODIS Aqua',
    snpp: 'VIIRS S-NPP',
    noaa20: 'VIIRS NOAA-20',
  };
  const AREAS = [
    { id: 'full', name: 'Full Nile Delta', bounds: BOUNDS,
      description: 'The validated pilot rectangle. Local calibration is tested at this scale.' },
    { id: 'west', name: 'Western Delta', bounds: [29.5, 29.8, 31.0, 31.65],
      description: 'Local factor validated on 2013–2022 and tested on 2023–2025.' },
    { id: 'east', name: 'Eastern Delta', bounds: [31.0, 29.8, 32.5, 31.65],
      description: 'Local factor validated on 2013–2022 and tested on 2023–2025.' },
    { id: 'south', name: 'Southern Delta', bounds: [29.5, 29.8, 32.5, 30.7],
      description: 'Local factor validated on 2013–2022 and tested on 2023–2025.' },
    { id: 'north', name: 'Northern Delta', bounds: [29.5, 30.7, 32.5, 31.65],
      description: 'Local factor validated on 2013–2022 and tested on 2023–2025.' },
  ];
  const AREA_BY_ID = Object.fromEntries(AREAS.map(a => [a.id, a]));
  const MIN_YEAR = 2000;
  const MAX_YEAR = 2026;

  let baseUrl = '../data/processed';
  let readyPromise = null;

  const store = {
    MONTHLY: new Map(),
    AREA_MONTHLY: new Map(),
    GRID: new Map(),
    DISAGREEMENT: new Map(),
    COVERAGE: [],
    CALIBRATION: [],
    SENSITIVITY: [],
    SPATIAL: [],
    BY_YEAR: [],
    BY_MONTH: [],
    BY_VERSION: [],
    VERSION_YEAR: [],
    LINEAGE: [],
    INVENTORY: [],
    DOWNLOAD_LOG: [],
  };

  function asFloat(value) {
    if (value === null || value === undefined || value === '') return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function parseCSV(text) {
    const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
    const rows = [];
    let row = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < clean.length; i += 1) {
      const ch = clean[i];
      if (inQuotes) {
        if (ch === '"') {
          if (clean[i + 1] === '"') {
            field += '"';
            i += 1;
          } else {
            inQuotes = false;
          }
        } else {
          field += ch;
        }
      } else if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        row.push(field);
        field = '';
      } else if (ch === '\r') {
        if (clean[i + 1] === '\n') i += 1;
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        field = '';
      } else if (ch === '\n') {
        row.push(field);
        if (row.length > 1 || row[0] !== '') rows.push(row);
        row = [];
        field = '';
      } else {
        field += ch;
      }
    }
    if (field !== '' || row.length > 0) {
      row.push(field);
      if (row.length > 1 || row[0] !== '') rows.push(row);
    }
    if (!rows.length) return [];
    const headers = rows[0];
    const out = [];
    for (let r = 1; r < rows.length; r += 1) {
      const vals = rows[r];
      const obj = {};
      for (let c = 0; c < headers.length; c += 1) {
        obj[headers[c]] = vals[c] !== undefined ? vals[c] : '';
      }
      out.push(obj);
    }
    return out;
  }

  async function fetchCsv(name) {
    const res = await fetch(`${baseUrl}/${name}`);
    if (!res.ok) throw new Error(`Failed to load ${name} (${res.status})`);
    return parseCSV(await res.text());
  }

  async function fetchJson(name, fallback) {
    try {
      const res = await fetch(`${baseUrl}/${name}`);
      if (!res.ok) return fallback;
      return await res.json();
    } catch (_) {
      return fallback;
    }
  }

  async function loadAll(dataBase = '../data/processed') {
    if (readyPromise) return readyPromise;
    baseUrl = dataBase.replace(/\/$/, '');
    readyPromise = (async () => {
      const [
        monthlyRaw, areaMonthly, gridMonthly, disagreement,
        coverage, calibration, sensitivity, spatial,
        byYear, byMonth, byVersion, versionYear,
        lineage, inventory, downloadLog,
      ] = await Promise.all([
        fetchCsv('monthly_raw.csv'),
        fetchCsv('area_monthly.csv'),
        fetchCsv('grid_monthly.csv'),
        fetchCsv('sensor_disagreement.csv'),
        fetchCsv('coverage_summary.csv'),
        fetchCsv('calibration_baseline.csv'),
        fetchCsv('calibration_sensitivity.csv'),
        fetchCsv('calibration_spatial.csv'),
        fetchCsv('calibration_by_year.csv'),
        fetchCsv('calibration_by_month.csv'),
        fetchCsv('calibration_by_version.csv'),
        fetchCsv('version_by_year.csv'),
        fetchCsv('source_lineage.csv'),
        fetchCsv('inventory.csv'),
        fetchJson('download_log.json', []),
      ]);

      for (const r of monthlyRaw) {
        store.MONTHLY.set(`${r.platform}|${r.month}`, r);
      }
      for (const r of areaMonthly) {
        store.AREA_MONTHLY.set(`${r.area_id}|${r.platform}|${r.month}`, r);
      }
      for (const r of gridMonthly) {
        const key = `${r.platform}|${r.month}`;
        let map = store.GRID.get(key);
        if (!map) {
          map = new Map();
          store.GRID.set(key, map);
        }
        map.set(`${Number(r.west)},${Number(r.south)}`, r);
      }
      for (const r of disagreement) {
        let list = store.DISAGREEMENT.get(r.month);
        if (!list) {
          list = [];
          store.DISAGREEMENT.set(r.month, list);
        }
        list.push(r);
      }

      store.COVERAGE = coverage;
      store.CALIBRATION = calibration;
      store.SENSITIVITY = sensitivity;
      store.SPATIAL = spatial;
      store.BY_YEAR = byYear;
      store.BY_MONTH = byMonth;
      store.BY_VERSION = byVersion;
      store.VERSION_YEAR = versionYear;
      store.LINEAGE = lineage;
      store.INVENTORY = inventory;
      store.DOWNLOAD_LOG = downloadLog;
    })();
    return readyPromise;
  }

  function eraPlatform(monthKey) {
    if (monthKey < '2002-07') return 'terra';
    if (monthKey < '2012-02') return 'aqua';
    return 'snpp';
  }

  function inBounds(x, y, bounds) {
    const lon = x + 0.125;
    const lat = y + 0.125;
    const [west, south, east, north] = bounds;
    return west <= lon && lon <= east && south <= lat && lat <= north;
  }

  function areaCells(area) {
    const cells = [];
    for (const x of GRID_X) {
      for (const y of GRID_Y) {
        if (inBounds(x, y, area.bounds)) cells.push([x, y]);
      }
    }
    return cells;
  }

  function areaFromParams(params) {
    const areaId = params.get('area_id') || 'full';
    if (AREA_BY_ID[areaId]) {
      const area = { ...AREA_BY_ID[areaId], validated: true };
      area.cells = areaCells(area);
      return area;
    }
    const rawW = Number(params.get('west'));
    const rawS = Number(params.get('south'));
    const rawE = Number(params.get('east'));
    const rawN = Number(params.get('north'));
    const west = Number.isFinite(rawW) ? Math.max(BOUNDS[0], Math.min(BOUNDS[2] - 0.25, rawW)) : BOUNDS[0];
    const south = Number.isFinite(rawS) ? Math.max(BOUNDS[1], Math.min(BOUNDS[3] - 0.25, rawS)) : BOUNDS[1];
    const east = Number.isFinite(rawE) ? Math.max(west + 0.25, Math.min(BOUNDS[2], rawE)) : BOUNDS[2];
    const north = Number.isFinite(rawN) ? Math.max(south + 0.25, Math.min(BOUNDS[3], rawN)) : BOUNDS[3];
    const area = {
      id: 'custom',
      name: 'Custom selection',
      bounds: [west, south, east, north],
      description: 'A custom rectangle. Local calibration has not been validated at this scale, so only raw counts are shown.',
      validated: false,
    };
    area.cells = areaCells(area);
    return area;
  }

  function areaBoundsJson(area) {
    const [west, south, east, north] = area.bounds;
    return { west, south, east, north };
  }

  function areaPublic(area) {
    return {
      id: area.id,
      name: area.name,
      bounds: areaBoundsJson(area),
      validated: area.validated,
      description: area.description,
      cells: area.cells.length,
    };
  }

  function rawForPlatform(area, platform, monthKey) {
    if (area.validated) {
      const row = store.AREA_MONTHLY.get(`${area.id}|${platform}|${monthKey}`);
      if (!row) return [null, 'outside_period', null];
      return [asFloat(row.raw_hotspots), row.input_status, row];
    }
    const monthly = store.MONTHLY.get(`${platform}|${monthKey}`);
    if (!monthly || monthly.input_status === 'input_missing') {
      return [null, monthly ? monthly.input_status : 'outside_period', null];
    }
    let value = 0;
    let cellDays = 0;
    const grid = store.GRID.get(`${platform}|${monthKey}`);
    if (grid) {
      for (const [x, y] of area.cells) {
        const g = grid.get(`${x},${y}`);
        if (g) {
          value += Math.trunc(Number(g.type_0_rows));
          cellDays += Math.trunc(Number(g.cell_days));
        }
      }
    }
    return [value, monthly.input_status, {
      raw_hotspots: value,
      cell_days: cellDays,
      input_status: monthly.input_status,
      input_days: monthly.input_days || '',
      days_in_month: monthly.days_in_month || '',
      factor: '',
      harmonized_hotspots: '',
      value_kind: 'raw',
      calibration_status: 'not_validated_custom',
      estimate_status: monthly.input_status === 'full_input_date_range' ? 'raw_only' : 'partial_input',
    }];
  }

  function cellRecord(area, scale, platform, year, month) {
    const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    const rawByPlatform = {};
    const statusByPlatform = {};
    for (const p of PLATFORMS) {
      const [raw, status] = rawForPlatform(area, p, key);
      rawByPlatform[p] = raw;
      statusByPlatform[p] = status;
    }

    let effScale = area.validated ? scale : 'raw';
    let selectedPlatform = effScale === 'raw' ? platform : (effScale === 'harmonized' ? eraPlatform(key) : 'snpp');
    if (effScale === 'snpp_era' && key < '2012-02') selectedPlatform = 'snpp';
    const [raw, inputStatus, row] = rawForPlatform(area, selectedPlatform, key);

    const cell = {
      year, month, month_key: key, platform: selectedPlatform,
      raw, cell_days: null, value: null, kind: 'unavailable',
      estimate_status: 'unavailable', calibration_status: 'not_available',
      factor: null, input_status: inputStatus, input_days: null, days_in_month: null,
      raw_by_platform: rawByPlatform, input_status_by_platform: statusByPlatform,
      outside_period: inputStatus === 'outside_period',
    };

    if (row) {
      cell.cell_days = asFloat(row.cell_days);
      cell.factor = asFloat(row.factor);
      cell.input_days = asFloat(row.input_days);
      cell.days_in_month = asFloat(row.days_in_month);
      if (inputStatus === 'input_missing') {
        cell.kind = 'missing';
        cell.estimate_status = 'missing_input';
      } else if (inputStatus === 'partial_input_date_range') {
        cell.value = raw;
        cell.kind = 'partial';
        cell.estimate_status = 'partial_input';
      } else if (effScale === 'harmonized') {
        cell.value = asFloat(row.harmonized_hotspots);
        cell.kind = row.value_kind || (selectedPlatform === 'snpp' ? 'observed' : 'estimated');
        cell.estimate_status = row.estimate_status || (selectedPlatform === 'snpp' ? 'observed' : 'validated_period');
        cell.calibration_status = row.calibration_status || 'validated';
      } else if (effScale === 'snpp_era') {
        cell.value = raw;
        cell.kind = inputStatus === 'full_input_date_range' ? 'observed' : 'partial';
        cell.estimate_status = 'observed';
        cell.calibration_status = 'reference';
      } else {
        cell.value = raw;
        cell.kind = inputStatus === 'full_input_date_range' ? 'raw' : 'partial';
        cell.estimate_status = 'raw_only';
        cell.calibration_status = !area.validated ? 'not_validated_custom' : (row.calibration_status || 'not_available');
      }
      if (area.validated && row.value_kind === 'unavailable' && raw !== null) {
        cell.estimate_status = inputStatus === 'full_input_date_range' ? 'raw_only' : cell.estimate_status;
      }
    } else if (inputStatus === 'input_missing') {
      cell.kind = 'missing';
      cell.estimate_status = 'missing_input';
    }
    return cell;
  }

  function scaleLabel(area, scale, platform) {
    if (!area.validated) return 'Raw hotspot detections (custom area; harmonisation not validated)';
    if (scale === 'harmonized') return 'Harmonised estimate on the VIIRS S-NPP reference scale';
    if (scale === 'snpp_era') return 'Observed VIIRS S-NPP count (2012–2025 constant scale)';
    return `Raw ${PLATFORM_LABEL[platform] || platform} detections (not cross-sensor harmonised)`;
  }

  function median(values) {
    if (!values.length) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function seriesForArea(area, scale, platform, startYear, endYear) {
    const cells = [];
    for (let y = startYear; y <= endYear; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        cells.push(cellRecord(area, scale, platform, y, m));
      }
    }
    const values = cells.map(c => c.value).filter(v => v !== null && v !== undefined);
    return {
      cells,
      max_value: values.length ? Math.max(...values) : 0,
      min_value: values.length ? Math.min(...values) : 0,
      count_values: values.length,
    };
  }

  function warningsFor(area, selected, baseline, scale, composition, percent) {
    const warnings = [];
    if (!area.validated) {
      warnings.push('Custom area: the full-Delta factor has not been validated at this scale, so the comparison uses raw counts only.');
    }
    if (selected.estimate_status === 'extrapolated') {
      warnings.push('Selected value is estimated outside the 2013–2025 calibration evaluation window (extrapolation).');
    }
    if (baseline.some(item => item.estimate_status === 'extrapolated')) {
      warnings.push('Some baseline years are extrapolated outside the 2013–2025 calibration evaluation window.');
    }
    if (
      composition && composition.observed && composition.extrapolated &&
      composition.observed_median !== null && composition.observed_median !== 0 &&
      selected.value !== null && selected.value !== undefined
    ) {
      const obsPct = ((selected.value - composition.observed_median) / composition.observed_median) * 100.0;
      if (percent !== null && (obsPct > 0) !== (percent > 0)) {
        const obsFmt = `${obsPct >= 0 ? '+' : ''}${obsPct.toFixed(1)}%`;
        const fullFmt = `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
        const medFmt = Math.round(composition.observed_median).toLocaleString('en-US');
        warnings.push(
          `The median mixes ${composition.extrapolated} extrapolated MODIS-era years with ` +
          `${composition.observed} observed S-NPP years. Using observed S-NPP years only ` +
          `(median ${medFmt}) gives ${obsFmt}, versus ${fullFmt} on the full baseline.`,
        );
      }
    }
    if (scale === 'raw') {
      warnings.push('Raw counts are platform-specific; a step between MODIS and VIIRS is a sensor/product change, not necessarily a fire change.');
    }
    if (selected.calibration_status === 'mae_not_improved') {
      warnings.push('This platform did not pass the count calibration test; the raw observation is retained.');
    }
    return warnings;
  }

  function compareForArea(area, scale, platform, year, month) {
    const selected = cellRecord(area, scale, platform, year, month);
    const effScale = area.validated ? scale : 'raw';
    const baselineStart = effScale === 'snpp_era' ? 2012 : MIN_YEAR;
    const baseline = [];
    for (let py = baselineStart; py < year; py += 1) {
      const rec = cellRecord(area, effScale, platform, py, month);
      if (rec.value === null || rec.value === undefined) continue;
      if (rec.input_status !== 'full_input_date_range') continue;
      if (!['observed', 'estimated', 'raw'].includes(rec.kind)) continue;
      baseline.push({
        year: py, value: rec.value, platform: rec.platform,
        kind: rec.kind, estimate_status: rec.estimate_status,
      });
    }
    const values = baseline.map(item => item.value);
    const med = median(values);
    const diff = selected.value !== null && med !== null ? selected.value - med : null;
    const pct = med !== null && med !== 0 && diff !== null ? (diff / med) * 100.0 : null;
    const years = baseline.map(item => item.year);
    const obsVals = baseline.filter(i => i.estimate_status === 'observed').map(i => i.value);
    const extVals = baseline.filter(i => i.estimate_status === 'extrapolated').map(i => i.value);
    const composition = {
      observed: obsVals.length,
      extrapolated: extVals.length,
      observed_median: median(obsVals),
      extrapolated_median: median(extVals),
    };
    return {
      selected,
      scale: effScale,
      scale_label: scaleLabel(area, effScale, platform),
      baseline,
      median: med,
      difference: diff,
      percent_change: pct,
      zero_median: med === 0,
      eligible_years: baseline.length,
      baseline_period: years.length ? { start: Math.min(...years), end: Math.max(...years) } : null,
      baseline_composition: composition,
      excluded_selected_year: year,
      selected_observation_in_baseline: false,
      source: [...new Set(baseline.map(i => i.platform))].sort(),
      status: selected.value !== null && baseline.length ? 'ok' : (selected.value === null ? 'selected_missing' : 'no_baseline'),
      warnings: warningsFor(area, selected, baseline, effScale, composition, pct),
    };
  }

  function disagreementForArea(area, year, month) {
    const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    const cells = new Map();
    for (const x of GRID_X) {
      for (const y of GRID_Y) {
        if (inBounds(x, y, area.bounds)) {
          cells.set(`${x},${y}`, { west: x, south: y, aqua_only: 0, snpp_only: 0, both: 0 });
        }
      }
    }
    for (const row of store.DISAGREEMENT.get(key) || []) {
      const cell = cells.get(`${Number(row.west)},${Number(row.south)}`);
      if (cell && Object.prototype.hasOwnProperty.call(cell, row.observed_in)) {
        cell[row.observed_in] += Math.trunc(Number(row.cell_days));
      }
    }
    const output = [];
    let aquaOnly = 0;
    let snppOnly = 0;
    let both = 0;
    for (const cell of cells.values()) {
      cell.total = cell.aqua_only + cell.snpp_only + cell.both;
      aquaOnly += cell.aqua_only;
      snppOnly += cell.snpp_only;
      both += cell.both;
      output.push(cell);
    }
    const active = aquaOnly + snppOnly + both;
    return {
      month: key,
      area: { id: area.id, name: area.name, bounds: areaBoundsJson(area) },
      pair: 'MODIS Aqua vs VIIRS S-NPP',
      grid_deg: 0.25,
      date_rule: 'UTC calendar day from acq_date; same 0.25° cell',
      denominator: 'active cell-days = aqua_only + snpp_only + both',
      active_cell_days: active,
      aqua_only: aquaOnly,
      snpp_only: snppOnly,
      both,
      disagreement_share: active ? (aquaOnly + snppOnly) / active : null,
      both_share: active ? both / active : null,
      cells: output,
      status: active ? 'ok' : 'no_active_cell_days',
      coverage_note: 'Counts are cell-days with at least one detection in either sensor. Cells where neither sensor detected a hotspot are not in the denominator, so this is detection disagreement, not a blind-spot estimate.',
    };
  }

  function mapForArea(area, scale, platform, year, month) {
    const key = `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
    const effScale = area.validated ? scale : 'raw';
    let selectedPlatform = effScale === 'harmonized' ? eraPlatform(key) : (effScale === 'raw' ? platform : 'snpp');
    if (effScale === 'snpp_era' && key < '2012-02') selectedPlatform = 'snpp';
    let factor = 1.0;
    if (area.validated && effScale === 'harmonized') {
      const row = store.AREA_MONTHLY.get(`${area.id}|${selectedPlatform}|${key}`);
      if (row) factor = asFloat(row.factor) || 1.0;
    }
    const grid = store.GRID.get(`${selectedPlatform}|${key}`);
    const cells = [];
    let maxVal = 0;
    for (const x of GRID_X) {
      for (const y of GRID_Y) {
        const g = grid ? grid.get(`${x},${y}`) : null;
        const raw = g ? Math.trunc(Number(g.type_0_rows)) : 0;
        const cellDays = g ? Math.trunc(Number(g.cell_days)) : 0;
        const value = Number((effScale === 'harmonized' ? raw * factor : raw).toFixed(2));
        const inside = inBounds(x, y, area.bounds);
        if (inside && value > maxVal) maxVal = value;
        cells.push({ west: x, south: y, raw, cell_days: cellDays, value, in_area: inside });
      }
    }
    return {
      month: key,
      scale: effScale,
      platform: selectedPlatform,
      platform_label: PLATFORM_LABEL[selectedPlatform] || selectedPlatform,
      factor,
      cells,
      max_value: maxVal,
      area: { id: area.id, name: area.name, bounds: areaBoundsJson(area) },
      scale_label: scaleLabel(area, effScale, platform),
      note: effScale !== 'harmonized'
        ? 'Map cells show the selected platform and month; absent cells are zero detections, not missing inputs.'
        : 'Map values are the harmonised estimate for the selected platform; absent cells are zero detections.',
    };
  }

  function meta() {
    const totalRows = store.INVENTORY.reduce((sum, r) => sum + Math.trunc(Number(r.delta_rows || 0)), 0);
    const eligibleRows = store.INVENTORY.reduce((sum, r) => sum + Math.trunc(Number(r.eligible_delta_rows || 0)), 0);
    return {
      app: 'Delta Fire Calendar',
      version: '1.0',
      bounds: { west: BOUNDS[0], south: BOUNDS[1], east: BOUNDS[2], north: BOUNDS[3] },
      grid: { deg: 0.25, x: GRID_X, y: GRID_Y, rows: GRID_Y.length, columns: GRID_X.length },
      years: { min: MIN_YEAR, max: MAX_YEAR, verified_end: '2025-12', pending: '2026' },
      platforms: PLATFORMS.map(p => ({ id: p, label: PLATFORM_LABEL[p], product: (p === 'terra' || p === 'aqua') ? 'MODIS' : 'VIIRS' })),
      areas: AREAS,
      coverage: store.COVERAGE,
      calibration: store.CALIBRATION,
      sensitivity: store.SENSITIVITY,
      spatial: store.SPATIAL,
      by_year: store.BY_YEAR,
      by_month: store.BY_MONTH,
      by_version: store.BY_VERSION,
      version_year: store.VERSION_YEAR,
      lineage: store.LINEAGE,
      download_log: store.DOWNLOAD_LOG,
      totals: { files: store.INVENTORY.length, delta_rows: totalRows, eligible_rows: eligibleRows },
      limitations: [
        'A FIRMS hotspot is a satellite detection, not a confirmed fire incident.',
        'The 0.25° monthly calendar aggregates detections; it does not measure burned area or fire duration.',
        'The full-Delta multiplicative factors are validated on 2013–2022 and tested on 2023–2025; earlier values are extrapolation.',
        'MODIS product versions change (6.2 → 6.03 → 61.03); a step in the series can be a processing change, not a fire change.',
        'NOAA-20 count calibration did not improve held-out MAE, so its raw values are retained with an explicit status.',
        'Aqua vs S-NPP disagreement is detection disagreement, not proof of a sensor blind spot.',
        '2026 is not verified locally; the 2026 archive is absent and no 2026 value is shown.',
        'No forecasting is included; the app is a historical calendar and validation tool.',
      ],
    };
  }

  function csvEscape(v) {
    const text = v === null || v === undefined ? '' : String(v);
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function monthlyCsv(params) {
    const area = areaFromParams(params);
    const scale = params.get('scale') || 'harmonized';
    const platform = params.get('platform') || 'snpp';
    const startYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(params.get('start_year') || MIN_YEAR)));
    const endYear = Math.max(startYear, Math.min(MAX_YEAR, Number(params.get('end_year') || MAX_YEAR)));
    const generated = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
    const headers = [
      'area_id', 'area_name', 'west', 'south', 'east', 'north', 'year', 'month', 'scale',
      'platform', 'value', 'kind', 'estimate_status', 'calibration_status', 'input_status',
      'input_days', 'days_in_month', 'raw_terra', 'raw_aqua', 'raw_snpp', 'raw_noaa20',
      'cell_days', 'factor', 'source', 'provenance', 'generated_utc',
    ];
    const lines = [headers.join(',')];
    for (let y = startYear; y <= endYear; y += 1) {
      for (let m = 1; m <= 12; m += 1) {
        const rec = cellRecord(area, scale, platform, y, m);
        const row = [
          area.id, area.name, area.bounds[0], area.bounds[1], area.bounds[2], area.bounds[3],
          y, m, scale, rec.platform, rec.value, rec.kind, rec.estimate_status,
          rec.calibration_status, rec.input_status, rec.input_days, rec.days_in_month,
          rec.raw_by_platform.terra, rec.raw_by_platform.aqua, rec.raw_by_platform.snpp, rec.raw_by_platform.noaa20,
          rec.cell_days, rec.factor,
          'NASA FIRMS annual country archive (Egypt); Standard Processing; MODIS Collection 6.x / VIIRS Collection 2',
          'data/processed; computed client-side from verified FIRMS tables',
          generated,
        ];
        lines.push(row.map(csvEscape).join(','));
      }
    }
    return {
      filename: `delta_calendar_${area.id}_${scale}_${startYear}_${endYear}.csv`,
      text: '\ufeff' + lines.join('\r\n'),
    };
  }

  async function detectionsCsv(params) {
    const area = areaFromParams(params);
    const [west, south, east, north] = area.bounds;
    const startYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(params.get('start_year') || (MAX_YEAR - 1))));
    const endYear = Math.max(startYear, Math.min(MAX_YEAR, Number(params.get('end_year') || startYear)));
    const startMonth = `${String(startYear).padStart(4, '0')}-01`;
    const endMonth = `${String(endYear).padStart(4, '0')}-12`;

    const res = await fetch(`${baseUrl}/detections_delta.csv`);
    if (!res.ok) throw new Error(`Could not load detections archive (${res.status})`);
    const raw = await res.text();
    const lines = raw.replace(/^\ufeff/, '').split(/\r?\n/);
    if (!lines.length) throw new Error('Empty detections CSV');
    const hdr = lines[0].split(',');
    const latIdx = hdr.indexOf('latitude');
    const lonIdx = hdr.indexOf('longitude');
    const dateIdx = hdr.indexOf('acq_date');
    const prefix = `${area.id},${west},${south},${east},${north},`;
    const out = [`area_id,selection_west,selection_south,selection_east,selection_north,${lines[0]}`];
    for (let i = 1; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      const cols = line.split(',');
      const lat = Number(cols[latIdx]);
      const lon = Number(cols[lonIdx]);
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
      if (lon < west || lon > east || lat < south || lat > north) continue;
      const ym = (cols[dateIdx] || '').slice(0, 7);
      if (ym < startMonth || ym > endMonth) continue;
      out.push(prefix + line);
    }
    return {
      filename: `delta_hotspots_${area.id}_${startYear}_${endYear}.csv`,
      text: '\ufeff' + out.join('\r\n'),
    };
  }

  async function query(path, params) {
    await loadAll(baseUrl);
    if (path === '/api/meta') return meta();
    const area = areaFromParams(params);
    const scale = params.get('scale') || 'harmonized';
    const platform = params.get('platform') || 'snpp';
    const year = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(params.get('year') || 2023)));
    const month = Math.max(1, Math.min(12, Number(params.get('month') || 9)));

    if (path === '/api/calendar') {
      const startYear = Math.max(MIN_YEAR, Math.min(MAX_YEAR, Number(params.get('start_year') || MIN_YEAR)));
      const endYear = Math.max(startYear, Math.min(MAX_YEAR, Number(params.get('end_year') || MAX_YEAR)));
      return {
        area: areaPublic(area), scale, platform,
        scale_label: scaleLabel(area, scale, platform),
        start_year: startYear, end_year: endYear,
        ...seriesForArea(area, scale, platform, startYear, endYear),
      };
    }
    if (path === '/api/compare') {
      return { area: areaPublic(area), ...compareForArea(area, scale, platform, year, month) };
    }
    if (path === '/api/disagreement') {
      return disagreementForArea(area, year, month);
    }
    if (path === '/api/map') {
      return { area: areaPublic(area), ...mapForArea(area, scale, platform, year, month) };
    }
    throw new Error(`Unknown static API path: ${path}`);
  }

  window.StaticDeltaApi = {
    init: loadAll,
    query,
    monthlyCsv,
    detectionsCsv,
  };
})();
