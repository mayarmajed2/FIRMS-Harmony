'use strict';

/* ------------------------------------------------------------------ setup */

const NS = 'http://www.w3.org/2000/svg';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const PLATFORM_LABEL = {
  terra: 'MODIS Terra', aqua: 'MODIS Aqua',
  snpp: 'VIIRS S-NPP', noaa20: 'VIIRS NOAA-20',
};
const PLATFORM_SHORT = { terra: 'Terra', aqua: 'Aqua', snpp: 'S-NPP', noaa20: 'NOAA-20' };
const PLATFORM_COLOR = { terra: '#fb923c', aqua: '#38bdf8', snpp: '#c084fc', noaa20: '#facc15' };
const STATUS_LABEL = {
  observed: 'Observed (S-NPP reference)',
  validated_period: 'Calibrated (validated period)',
  extrapolated: 'Calibrated (extrapolated)',
  raw_only: 'Raw count (not harmonised)',
  partial_input: 'Partial month',
  missing_input: 'Missing input',
  unavailable: 'Unavailable',
};
const STATUS_SHORT = {
  observed: 'Observed', validated_period: 'Calibrated', extrapolated: 'Extrapolated',
  raw_only: 'Raw only', partial_input: 'Partial', missing_input: 'Missing', unavailable: 'Unavailable',
};
const INPUT_LABEL = {
  full_input_date_range: 'Complete month input',
  partial_input_date_range: 'Partial month input',
  input_missing: 'No local input',
  outside_period: 'Outside platform period',
};

const PRESETS = {
  demo: { areaId: 'full', year: 2023, month: 9, scale: 'harmonized', platform: 'snpp', label: 'Sep 2023 verified demo' },
  oct2023: { areaId: 'full', year: 2023, month: 10, scale: 'harmonized', platform: 'snpp', label: 'Oct 2023 contrast (−21.8%)' },
  west_mix: { areaId: 'west', year: 2023, month: 9, scale: 'harmonized', platform: 'snpp', label: 'Western Delta mixed-era sign flip' },
  noaa20_raw: { areaId: 'full', year: 2023, month: 9, scale: 'raw', platform: 'noaa20', label: 'NOAA-20 raw (calibration failed)' },
  missing_2026: { areaId: 'full', year: 2026, month: 9, scale: 'harmonized', platform: 'snpp', label: '2026 explicitly missing input' },
};

/* Real geographic reference polylines for the Nile Delta (lon, lat) */
const GEO_COAST = [
  [29.50, 30.94], [29.74, 31.08], [29.92, 31.20], [30.07, 31.32],
  [30.22, 31.28], [30.36, 31.47], [30.65, 31.45], [30.98, 31.58],
  [31.28, 31.54], [31.52, 31.48], [31.84, 31.52], [32.08, 31.33],
  [32.31, 31.26], [32.50, 31.12],
];
const GEO_NILE_STEM = [
  [31.25, 29.75], [31.24, 29.90], [31.24, 30.04], [31.20, 30.12], [31.13, 30.18],
];
const GEO_ROSETTA = [
  [31.13, 30.18], [30.95, 30.31], [30.82, 30.52], [30.78, 30.78],
  [30.68, 31.02], [30.52, 31.24], [30.36, 31.47],
];
const GEO_DAMIETTA = [
  [31.13, 30.18], [31.19, 30.44], [31.26, 30.72], [31.38, 31.04],
  [31.64, 31.27], [31.81, 31.42], [31.84, 31.52],
];
const GEO_SUEZ_CANAL = [
  [32.31, 31.26], [32.31, 30.92], [32.30, 30.60], [32.38, 30.26], [32.50, 29.96],
];
const GEO_CITIES = [
  { name: 'Cairo', lon: 31.24, lat: 30.04, dx: 8, dy: 4, anchor: 'start' },
  { name: 'Alexandria', lon: 29.92, lat: 31.20, dx: 7, dy: 11, anchor: 'start' },
  { name: 'Tanta', lon: 31.00, lat: 30.79, dx: -7, dy: 3, anchor: 'end' },
  { name: 'Mansoura', lon: 31.38, lat: 31.04, dx: 7, dy: 4, anchor: 'start' },
  { name: 'Damietta', lon: 31.81, lat: 31.42, dx: 7, dy: -4, anchor: 'start' },
  { name: 'Zagazig', lon: 31.50, lat: 30.59, dx: 7, dy: 4, anchor: 'start' },
];

const state = {
  meta: null,
  areaId: 'full',
  custom: { west: 29.5, south: 29.8, east: 32.5, north: 31.65 },
  customOpen: false,
  year: 2023,
  month: 9,
  scale: 'harmonized',
  lastScale: 'harmonized',
  platform: 'snpp',
  showNileOverlay: true,
  data: {},
  loading: false,
  requestToken: 0,
  disCell: null,
  toastTimer: null,
  playing: false,
  playMode: 'yearly',
  playSpeed: 1,
  playTimer: null,
};

let FULL = { west: 29.5, south: 29.8, east: 32.5, north: 31.65 };
let GX = [];
let GY = [];
const CELL = 0.25;
const REDUCED_MOTION = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* --------------------------------------------------------------- helpers */

const $ = (selector, root = document) => root.querySelector(selector);

function h(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else node.setAttribute(key, value === true ? '' : String(value));
  }
  append(node, children);
  return node;
}

function s(tag, attrs = {}, ...children) {
  const node = document.createElementNS(NS, tag);
  for (const [key, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false) continue;
    node.setAttribute(key, String(value));
  }
  append(node, children);
  return node;
}

function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child === null || child === undefined || child === false) continue;
    node.append(child instanceof Node ? child : document.createTextNode(String(child)));
  }
}

const nf0 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const nf2 = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });
const nf3 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function fmtInt(value) {
  return value === null || value === undefined || Number.isNaN(Number(value)) ? '—' : nf0.format(Number(value));
}
function fmtNum(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const num = Number(value);
  if (digits === 0) return nf0.format(num);
  if (digits === 1) return nf1.format(num);
  if (digits === 3) return nf3.format(num);
  return nf2.format(num);
}
function fmtSigned(value, digits = 0) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '—';
  const number = Number(value);
  const body = digits === 0 ? nf0.format(Math.abs(number)) : digits === 1 ? nf1.format(Math.abs(number)) : nf2.format(Math.abs(number));
  return `${number > 0 ? '+' : number < 0 ? '−' : ''}${body}`;
}
function fmtPercent(value, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return null;
  const number = Number(value);
  const body = Math.abs(number).toFixed(digits);
  return `${number > 0 ? '+' : number < 0 ? '−' : ''}${body}%`;
}
function fmtShare(fraction, digits = 1) {
  if (fraction === null || fraction === undefined || Number.isNaN(Number(fraction))) return '—';
  return `${(Number(fraction) * 100).toFixed(digits)}%`;
}
function compact(value) {
  if (value === null || value === undefined) return '—';
  const number = Number(value);
  if (Math.abs(number) >= 1000) return `${nf1.format(number / 1000)}k`;
  if (Math.abs(number) >= 10) return nf0.format(number);
  return nf1.format(number);
}
function monthKey(year = state.year, month = state.month) {
  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`;
}
function monthLabel(year = state.year, month = state.month) {
  return `${MONTHS[month - 1]} ${year}`;
}
function clamp(value, low, high) {
  return Math.min(high, Math.max(low, value));
}
function numberOr(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toast(message) {
  const node = $('#toast');
  node.textContent = message;
  node.hidden = false;
  window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => { node.hidden = true; }, 3800);
}

function statusBadge(status, text = null) {
  return h('span', {
    class: `badge badge-${status || 'unavailable'}`,
    text: text || STATUS_SHORT[status] || status || 'Unavailable',
  });
}

function statusPill(status) {
  const good = new Set(['mae_improved', 'verified_local_archive']);
  const warn = new Set(['mae_not_improved', 'descriptive_version_segment']);
  const kind = good.has(status) ? 'good' : warn.has(status) ? 'warn' : 'neutral';
  const label = {
    mae_improved: 'MAE improved',
    mae_not_improved: 'Not improved',
    verified_local_archive: 'Verified local archive',
    descriptive_version_segment: 'Descriptive segment',
  }[status] || String(status || '—');
  return h('span', { class: `status-pill status-${kind}`, text: label });
}

function el(tag, className, text) {
  return h(tag, { class: className, text });
}

/* Floating glass tooltip */
function showFloatingTip(event, title, rows) {
  const tip = $('#floating-tip');
  tip.replaceChildren(
    h('div', { class: 'tip-title', text: title }),
    ...rows.map(([label, val]) => h('div', { class: 'tip-row' }, h('span', { text: label }), h('b', { text: val }))),
  );
  tip.hidden = false;
  moveFloatingTip(event);
}

function moveFloatingTip(event) {
  const tip = $('#floating-tip');
  if (tip.hidden) return;
  const pad = 14;
  const rect = tip.getBoundingClientRect();
  let x = event.clientX + 16;
  let y = event.clientY + 16;
  if (x + rect.width + pad > window.innerWidth) x = event.clientX - rect.width - 14;
  if (y + rect.height + pad > window.innerHeight) y = event.clientY - rect.height - 14;
  tip.style.left = `${Math.max(pad, x)}px`;
  tip.style.top = `${Math.max(pad, y)}px`;
}

function hideFloatingTip() {
  $('#floating-tip').hidden = true;
}

/* Smooth KPI numeric counter */
function animateNumber(node, target, formatter = fmtInt, duration = 440) {
  if (REDUCED_MOTION || state.playing || target === null || target === undefined || !Number.isFinite(Number(target))) {
    node.textContent = formatter(target);
    return;
  }
  const end = Number(target);
  const start = Number(node.dataset.numVal);
  node.dataset.numVal = String(end);
  if (!Number.isFinite(start) || start === end) {
    node.textContent = formatter(end);
    return;
  }
  const t0 = performance.now();
  const token = String(Math.random());
  node.dataset.animToken = token;
  const step = now => {
    if (node.dataset.animToken !== token) return;
    const p = clamp((now - t0) / duration, 0, 1);
    const eased = 1 - (1 - p) ** 3;
    node.textContent = formatter(start + (end - start) * eased);
    if (p < 1) requestAnimationFrame(step);
    else node.textContent = formatter(end);
  };
  requestAnimationFrame(step);
}

function renderTable(container, columns, rows, options = {}) {
  container.replaceChildren();
  if (!rows || !rows.length) {
    container.append(el('p', 'footnote', 'No rows available.'));
    return;
  }
  const table = h('table', { class: 'data' });
  const headRow = h('tr');
  for (const column of columns) {
    headRow.append(h('th', { scope: 'col', text: column.label }));
  }
  table.append(h('thead', {}, headRow));
  const body = h('tbody');
  for (const row of rows) {
    const tr = h('tr', { class: options.rowClass ? options.rowClass(row) : '' });
    for (const column of columns) {
      const raw = column.value ? column.value(row) : row[column.key];
      const td = h('td', { class: column.num ? 'num' : '' });
      if (column.render) td.append(column.render(raw, row));
      else td.textContent = raw === null || raw === undefined || raw === '' ? '—'
        : column.fmt ? column.fmt(raw) : String(raw);
      tr.append(td);
    }
    body.append(tr);
  }
  table.append(body);
  container.append(table);
}

/* ----------------------------------------------------- ambient cosmos/fire */

function initCosmosCanvas() {
  const canvas = $('#cosmos-canvas');
  if (!canvas || REDUCED_MOTION) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let width = 0;
  let height = 0;
  let dpr = Math.min(window.devicePixelRatio || 1, 2);
  let stars = [];
  let embers = [];
  let rafId = null;

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const starCount = clamp(Math.floor((width * height) / 16000), 46, 115);
    stars = Array.from({ length: starCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height * 0.88,
      r: 0.45 + Math.random() * 1.25,
      phase: Math.random() * Math.PI * 2,
      speed: 0.45 + Math.random() * 1.1,
      hue: Math.random() < 0.28 ? '#7dd3fc' : Math.random() < 0.14 ? '#99f6e4' : '#e2e8f0',
    }));

    const emberCount = clamp(Math.floor(width / 46), 16, 34);
    embers = Array.from({ length: emberCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.9 + Math.random() * 1.9,
      vy: 0.16 + Math.random() * 0.36,
      vx: (Math.random() - 0.5) * 0.24,
      alpha: 0.14 + Math.random() * 0.28,
      isNile: Math.random() < 0.38,
      wobble: Math.random() * Math.PI * 2,
    }));
  };

  const drawOrbitArc = (cx, cy, rx, ry, rot, satAngle, color) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 0.85;
    ctx.setLineDash([4, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    const sx = Math.cos(satAngle) * rx;
    const sy = Math.sin(satAngle) * ry;
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, 10);
    grad.addColorStop(0, 'rgba(224, 242, 254, 0.95)');
    grad.addColorStop(0.35, color.replace(/[\d.]+\)$/, '0.55)'));
    grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const frame = time => {
    const t = time * 0.001;
    ctx.clearRect(0, 0, width, height);

    drawOrbitArc(width * 0.80, height * 0.13, Math.min(width * 0.30, 390), 82, -0.25, t * 0.19, 'rgba(56, 189, 248, 0.16)');
    drawOrbitArc(width * 0.20, height * 0.17, Math.min(width * 0.26, 330), 70, 0.22, -t * 0.14 + 1.9, 'rgba(45, 212, 191, 0.13)');

    for (const star of stars) {
      const a = 0.16 + 0.52 * (0.5 + 0.5 * Math.sin(t * star.speed + star.phase));
      ctx.globalAlpha = a;
      ctx.fillStyle = star.hue;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const p of embers) {
      p.y -= p.vy;
      p.x += p.vx + Math.sin(t * 0.9 + p.wobble) * 0.16;
      if (p.y < -12) {
        p.y = height + 12;
        p.x = Math.random() * width;
      }
      if (p.x < -12) p.x = width + 12;
      if (p.x > width + 12) p.x = -12;

      const fade = Math.min(1, p.y / (height * 0.34));
      ctx.globalAlpha = p.alpha * fade;
      ctx.fillStyle = p.isNile ? '#2dd4bf' : '#fb923c';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    rafId = requestAnimationFrame(frame);
  };

  resize();
  window.addEventListener('resize', resize);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    } else if (!document.hidden && !rafId) {
      rafId = requestAnimationFrame(frame);
    }
  });
  rafId = requestAnimationFrame(frame);
}

function initSpotlights() {
  for (const card of document.querySelectorAll('[data-spotlight]')) {
    card.addEventListener('pointermove', event => {
      const rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${event.clientX - rect.left}px`);
      card.style.setProperty('--my', `${event.clientY - rect.top}px`);
    });
  }
}

function initRevealObserver() {
  const nodes = [...document.querySelectorAll('.reveal')];
  if (REDUCED_MOTION || !('IntersectionObserver' in window)) {
    for (const node of nodes) node.classList.add('is-visible');
    return;
  }
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }
  }, { rootMargin: '0px 0px -30px 0px', threshold: 0.04 });
  for (const node of nodes) observer.observe(node);
}

function triggerMapScan() {
  if (REDUCED_MOTION) return;
  const line = $('#map-scanline');
  if (!line) return;
  line.classList.remove('is-sweeping');
  void line.offsetWidth;
  line.classList.add('is-sweeping');
}

function updateConstellation(activePlatform) {
  const scale = effectiveScale();
  const isIsolated = scale === 'raw' || scale === 'snpp_era';
  const isolatedPlatform = scale === 'snpp_era' ? 'snpp' : state.platform;

  for (const btn of document.querySelectorAll('#constellation-bar .sat-btn')) {
    const p = btn.dataset.platform;
    const pressed = isIsolated && p === isolatedPlatform;
    const eraActive = !isIsolated && p === activePlatform;
    btn.setAttribute('aria-pressed', String(pressed));
    btn.classList.toggle('is-era', eraActive);
  }

  const hint = $('#sensor-hint');
  if (hint) {
    if (scale === 'harmonized') {
      hint.textContent = `Era: ${PLATFORM_SHORT[activePlatform] || activePlatform}`;
    } else if (scale === 'snpp_era') {
      hint.textContent = 'Reference era';
    } else {
      hint.textContent = 'Raw sensor';
    }
  }
}

/* ------------------------------------------------------------ area / API */

function normalizeBounds(bounds) {
  if (!bounds) return { ...FULL };
  if (Array.isArray(bounds)) {
    return { west: Number(bounds[0]), south: Number(bounds[1]), east: Number(bounds[2]), north: Number(bounds[3]) };
  }
  return { west: Number(bounds.west), south: Number(bounds.south), east: Number(bounds.east), north: Number(bounds.north) };
}

function currentArea() {
  if (!state.meta) return null;
  if (state.areaId === 'custom') {
    return {
      id: 'custom',
      name: 'Custom rectangle',
      bounds: { ...state.custom },
      validated: false,
    };
  }
  const area = state.meta.areas.find(item => item.id === state.areaId) || state.meta.areas[0];
  return { ...area, bounds: normalizeBounds(area.bounds) };
}

function baseParams(extra = {}) {
  const params = new URLSearchParams();
  if (state.areaId === 'custom') {
    params.set('area_id', 'custom');
    params.set('west', state.custom.west);
    params.set('south', state.custom.south);
    params.set('east', state.custom.east);
    params.set('north', state.custom.north);
  } else {
    params.set('area_id', state.areaId);
  }
  for (const [key, value] of Object.entries(extra)) {
    if (value !== null && value !== undefined) params.set(key, String(value));
  }
  return params;
}

function effectiveScale() {
  return state.areaId === 'custom' ? 'raw' : state.scale;
}

async function api(path, extra = {}) {
  const params = baseParams(extra);
  const response = await fetch(`${path}?${params.toString()}`, { cache: 'no-store' });
  if (!response.ok) {
    let detail = response.statusText;
    try {
      const payload = await response.json();
      detail = payload.error || payload.detail || detail;
    } catch (_) { /* keep status text */ }
    throw new Error(`${path}: ${detail}`);
  }
  return response.json();
}

/* ------------------------------------------------------------ URL handling */

function applyInitialParams(params) {
  const areaParam = params.get('area') || params.get('area_id');
  if (areaParam === 'custom') {
    state.areaId = 'custom';
    state.custom = {
      west: clamp(numberOr(params.get('west'), FULL.west), FULL.west, FULL.east - CELL),
      south: clamp(numberOr(params.get('south'), FULL.south), FULL.south, FULL.north - CELL),
      east: clamp(numberOr(params.get('east'), FULL.east), FULL.west + CELL, FULL.east),
      north: clamp(numberOr(params.get('north'), FULL.north), FULL.south + CELL, FULL.north),
    };
    state.customOpen = true;
    state.scale = 'raw';
    state.lastScale = 'harmonized';
    state.custom = snapBounds(state.custom);
  } else if (areaParam && state.meta.areas.some(area => area.id === areaParam)) {
    state.areaId = areaParam;
  }
  const yearParam = params.get('year');
  const monthParam = params.get('month');
  const year = yearParam === null ? NaN : Number(yearParam);
  const month = monthParam === null ? NaN : Number(monthParam);
  if (Number.isInteger(year)) state.year = clamp(year, 2000, 2026);
  if (Number.isInteger(month)) state.month = clamp(month, 1, 12);
  const scale = params.get('scale');
  if (['harmonized', 'snpp_era', 'raw'].includes(scale) && state.areaId !== 'custom') {
    state.scale = scale;
    if (scale !== 'raw') state.lastScale = scale;
  }
  const platform = params.get('platform');
  if (['terra', 'aqua', 'snpp', 'noaa20'].includes(platform)) state.platform = platform;
}

function syncURL() {
  const params = new URLSearchParams();
  params.set('area', state.areaId);
  if (state.areaId === 'custom') {
    params.set('west', state.custom.west);
    params.set('south', state.custom.south);
    params.set('east', state.custom.east);
    params.set('north', state.custom.north);
  }
  params.set('year', state.year);
  params.set('month', state.month);
  params.set('scale', effectiveScale());
  params.set('platform', state.platform);
  history.replaceState(null, '', `?${params.toString()}`);
}

/* ---------------------------------------------------------------- controls */

function populateControls() {
  const areaSelect = $('#area-select');
  areaSelect.replaceChildren(
    ...state.meta.areas.map(area => h('option', { value: area.id, text: area.name })),
    h('option', { value: 'custom', text: 'Custom rectangle…' }),
  );

  const yearSelect = $('#year-select');
  const years = [];
  for (let year = 2000; year <= 2026; year += 1) years.push(year);
  yearSelect.replaceChildren(...years.map(year => h('option', { value: year, text: year })));

  const monthSelect = $('#month-select');
  monthSelect.replaceChildren(...MONTHS.map((month, index) => h('option', { value: index + 1, text: month })));

  $('#archive-status').textContent = `${state.meta.totals.files} files · 2000–2025`;
  $('#archive-status').title = 'Local verified NASA FIRMS archive: 2000-11 → 2025-12 (2026 absent).';
  $('#audit-version').textContent = 'MODIS 6.2 · 6.03 · 61.03';
}

function updateControls() {
  $('#area-select').value = state.areaId;
  $('#year-select').value = String(state.year);
  $('#month-select').value = String(state.month);
  $('#platform-select').value = state.platform;
  $('#custom-panel').hidden = !state.customOpen;
  $('#custom-toggle').setAttribute('aria-expanded', String(state.customOpen));
  $('#custom-toggle').classList.toggle('active', state.customOpen || state.areaId === 'custom');
  $('#map-reset-box').hidden = state.areaId !== 'custom';

  $('#custom-west').value = state.custom.west;
  $('#custom-south').value = state.custom.south;
  $('#custom-east').value = state.custom.east;
  $('#custom-north').value = state.custom.north;

  for (const button of $('#scale-group').querySelectorAll('button')) {
    const selected = button.dataset.scale === effectiveScale();
    button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    button.disabled = state.areaId === 'custom' && button.dataset.scale !== 'raw';
  }

  // Sync verified views select
  const presetSelect = $('#preset-select');
  if (presetSelect) {
    let matched = '';
    for (const [key, p] of Object.entries(PRESETS)) {
      if (
        state.areaId === p.areaId &&
        state.year === p.year &&
        state.month === p.month &&
        effectiveScale() === p.scale &&
        (p.scale !== 'raw' || state.platform === p.platform)
      ) {
        matched = key;
        break;
      }
    }
    presetSelect.value = matched;
  }

  // Sync playback controls
  const playToggle = $('#play-toggle');
  playToggle.setAttribute('aria-pressed', String(state.playing));
  $('#play-icon').textContent = state.playing ? '⏸' : '▶';
  $('#play-label').textContent = state.playing ? 'Pause' : 'Play';
  $('#play-speed').textContent = `${state.playSpeed}×`;
  const playStatus = $('#play-status');
  if (state.playing) {
    playStatus.textContent = `${MONTHS_SHORT[state.month - 1]} ${state.year}`;
    playStatus.hidden = false;
  } else {
    playStatus.hidden = true;
  }

  const nileBtn = $('#nile-overlay-toggle');
  nileBtn.classList.toggle('active', state.showNileOverlay);
  nileBtn.setAttribute('aria-pressed', String(state.showNileOverlay));

  const activePlatform = state.data?.compare?.selected?.platform || state.platform;
  updateConstellation(activePlatform);
}

function stopPlayback() {
  if (!state.playing) return;
  state.playing = false;
  window.clearTimeout(state.playTimer);
  state.playTimer = null;
  updateControls();
}

function stepTime(direction) {
  const scale = effectiveScale();
  const minYear = scale === 'snpp_era'
    ? 2012
    : (scale === 'raw' && state.platform === 'noaa20' ? 2018 : (scale === 'raw' && state.platform === 'snpp' ? 2012 : 2001));
  const maxYear = 2025;
  if (state.playMode === 'yearly') {
    let nextYear = state.year + direction;
    if (nextYear > maxYear) nextYear = minYear;
    if (nextYear < minYear) nextYear = maxYear;
    state.year = nextYear;
  } else {
    let total = state.year * 12 + (state.month - 1) + direction;
    const minTotal = minYear * 12 + (minYear === 2012 ? 1 : 0);
    const maxTotal = maxYear * 12 + 11;
    if (total > maxTotal) total = minTotal;
    if (total < minTotal) total = maxTotal;
    state.year = Math.floor(total / 12);
    state.month = (total % 12) + 1;
  }
  updateControls();
  return refresh({ skipCalendar: state.playing });
}

function scheduleNextFrame() {
  if (!state.playing) return;
  const delay = state.playSpeed === 2 ? 480 : 950;
  state.playTimer = window.setTimeout(async () => {
    if (!state.playing) return;
    await stepTime(1);
    scheduleNextFrame();
  }, delay);
}

function togglePlayback() {
  if (state.playing) {
    stopPlayback();
    return;
  }
  state.playing = true;
  if (state.year >= 2026) state.year = effectiveScale() === 'snpp_era' ? 2012 : 2001;
  updateControls();
  scheduleNextFrame();
}

function applyPreset(key) {
  const preset = PRESETS[key];
  if (!preset) return;
  stopPlayback();
  state.areaId = preset.areaId;
  state.customOpen = false;
  const area = currentArea();
  if (area && area.bounds) state.custom = { ...area.bounds };
  state.year = preset.year;
  state.month = preset.month;
  state.scale = preset.scale;
  if (preset.scale !== 'raw') state.lastScale = preset.scale;
  state.platform = preset.platform;
  updateControls();
  refresh();
  toast(`Loaded: ${preset.label}`);
}

function selectSatellite(platform) {
  if (!['terra', 'aqua', 'snpp', 'noaa20'].includes(platform)) return;
  stopPlayback();
  state.platform = platform;
  if (platform === 'snpp' && state.areaId !== 'custom') {
    state.scale = 'snpp_era';
    state.lastScale = 'snpp_era';
    if (state.year < 2012) {
      state.year = 2023;
      state.month = 9;
    }
    toast('Switched to VIIRS S-NPP reference era (2012–2025).');
  } else {
    state.scale = 'raw';
    if (platform === 'noaa20' && state.year < 2018) {
      state.year = 2023;
      state.month = 9;
    } else if (platform === 'aqua' && state.year < 2002) {
      state.year = 2003;
    } else if (platform === 'snpp' && state.year < 2012) {
      state.year = 2023;
    }
    toast(`Switched to ${PLATFORM_LABEL[platform]} (raw detections).`);
  }
  updateControls();
  refresh();
}

function bindControls() {
  $('#area-select').addEventListener('change', event => {
    stopPlayback();
    const value = event.target.value;
    if (value === 'custom') {
      state.customOpen = true;
      const area = currentArea();
      if (area && area.bounds) state.custom = { ...area.bounds };
      applyCustomBounds(state.custom, { silent: true });
      return;
    }
    state.areaId = value;
    state.customOpen = false;
    if (state.scale === 'raw' && state.lastScale) state.scale = state.lastScale;
    const area = currentArea();
    if (area) state.custom = { ...area.bounds };
    updateControls();
    refresh();
  });

  $('#custom-toggle').addEventListener('click', () => {
    state.customOpen = !state.customOpen;
    if (state.customOpen) {
      const area = currentArea();
      if (area && state.areaId !== 'custom') state.custom = { ...area.bounds };
    }
    updateControls();
    if (state.customOpen) $('#custom-west').focus();
  });

  $('#custom-apply').addEventListener('click', () => {
    stopPlayback();
    applyCustomBounds(readCustomInputs(), { silent: false });
  });

  const resetToFull = () => {
    stopPlayback();
    state.areaId = 'full';
    state.customOpen = false;
    const area = currentArea();
    if (area) state.custom = { ...area.bounds };
    state.scale = state.lastScale || 'harmonized';
    updateControls();
    refresh();
  };
  $('#custom-clear').addEventListener('click', resetToFull);
  $('#map-reset-box').addEventListener('click', resetToFull);

  $('#year-select').addEventListener('change', event => {
    stopPlayback();
    state.year = Number(event.target.value);
    updateControls();
    refresh();
  });
  $('#month-select').addEventListener('change', event => {
    stopPlayback();
    state.month = Number(event.target.value);
    updateControls();
    refresh();
  });
  $('#scale-group').addEventListener('click', event => {
    const button = event.target.closest('button[data-scale]');
    if (!button) return;
    stopPlayback();
    const scale = button.dataset.scale;
    if (state.areaId === 'custom' && scale !== 'raw') {
      toast('Custom rectangles are shown as raw counts only, because local harmonisation was not validated at that scale.');
      return;
    }
    state.scale = scale;
    if (scale !== 'raw') state.lastScale = scale;
    updateControls();
    refresh();
  });

  // Working interactive satellite buttons (Terra, Aqua, S-NPP, NOAA-20)
  $('#constellation-bar').addEventListener('click', event => {
    const btn = event.target.closest('button.sat-btn[data-platform]');
    if (!btn) return;
    selectSatellite(btn.dataset.platform);
  });

  $('#platform-select').addEventListener('change', event => {
    selectSatellite(event.target.value);
  });

  $('#reset-demo').addEventListener('click', () => {
    applyPreset('demo');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  $('#preset-select').addEventListener('change', event => {
    if (event.target.value) applyPreset(event.target.value);
  });

  // Time-lapse controls
  $('#play-toggle').addEventListener('click', togglePlayback);
  $('#play-prev').addEventListener('click', () => { stopPlayback(); stepTime(-1); });
  $('#play-next').addEventListener('click', () => { stopPlayback(); stepTime(1); });
  $('#play-mode').addEventListener('change', event => {
    state.playMode = event.target.value;
  });
  $('#play-speed').addEventListener('click', () => {
    state.playSpeed = state.playSpeed === 1 ? 2 : 1;
    updateControls();
  });

  // Nile overlay toggle
  $('#nile-overlay-toggle').addEventListener('click', () => {
    state.showNileOverlay = !state.showNileOverlay;
    updateControls();
    if (state.data.map) renderMap();
    if (state.data.disagreement) renderDisagreementGrid(state.data.disagreement);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', event => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || tag === 'A') return;
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      stopPlayback();
      stepTime(-1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      stopPlayback();
      stepTime(1);
    } else if (event.key === ' ') {
      event.preventDefault();
      togglePlayback();
    } else if (event.key === 'r' || event.key === 'R') {
      event.preventDefault();
      applyPreset('demo');
    }
  });

  for (const id of ['#download-monthly', '#download-detections']) {
    $(id).addEventListener('click', () => toast('Preparing CSV export. Large detection exports can take a few seconds.'));
  }
  $('#download-disagreement').addEventListener('click', downloadDisagreement);
}

function readCustomInputs() {
  return {
    west: numberOr($('#custom-west').value, FULL.west),
    south: numberOr($('#custom-south').value, FULL.south),
    east: numberOr($('#custom-east').value, FULL.east),
    north: numberOr($('#custom-north').value, FULL.north),
  };
}

function snapBounds(bounds) {
  const snap = value => Math.round(value / CELL) * CELL;
  let west = clamp(snap(bounds.west), FULL.west, FULL.east - CELL);
  let south = clamp(snap(bounds.south), FULL.south, FULL.north - CELL);
  let east = clamp(snap(bounds.east), FULL.west + CELL, FULL.east);
  let north = clamp(snap(bounds.north), FULL.south + CELL, FULL.north);
  if (east <= west) east = Math.min(FULL.east, west + CELL);
  if (north <= south) north = Math.min(FULL.north, south + CELL);
  west = Number(west.toFixed(2));
  south = Number(south.toFixed(2));
  east = Number(east.toFixed(2));
  north = Number(north.toFixed(2));
  return { west, south, east, north };
}

function cellsInBounds(bounds) {
  let count = 0;
  for (const west of GX) {
    for (const south of GY) {
      const lon = west + CELL / 2;
      const lat = south + CELL / 2;
      if (lon >= bounds.west && lon <= bounds.east && lat >= bounds.south && lat <= bounds.north) count += 1;
    }
  }
  return count;
}

function applyCustomBounds(bounds, { silent = false } = {}) {
  state.custom = snapBounds(bounds);
  state.areaId = 'custom';
  state.customOpen = true;
  if (state.scale !== 'raw') state.lastScale = state.scale;
  state.scale = 'raw';
  updateControls();
  refresh();
  if (!silent) {
    const count = cellsInBounds(state.custom);
    toast(`Custom rectangle: ${(state.custom.east - state.custom.west).toFixed(2)}° × ${(state.custom.north - state.custom.south).toFixed(2)}° · ${count} cells · raw counts only.`);
  }
}

/* ------------------------------------------------------------------ fetch */

async function refresh({ skipCalendar = false } = {}) {
  if (!state.meta) return;
  const token = ++state.requestToken;
  state.loading = true;
  hideFloatingTip();
  if (!state.playing) {
    $('#loading-pill').hidden = false;
    $('main').classList.add('is-loading');
  }

  const shared = {
    year: state.year,
    month: state.month,
    scale: effectiveScale(),
    platform: state.platform,
  };

  try {
    const requests = [
      api('/api/map', shared),
      skipCalendar && state.data.calendar
        ? Promise.resolve(state.data.calendar)
        : api('/api/calendar', { scale: effectiveScale(), platform: state.platform, start_year: 2000, end_year: 2026 }),
      api('/api/compare', shared),
      api('/api/disagreement', { year: state.year, month: state.month }),
    ];
    const [map, calendar, compare, disagreement] = await Promise.all(requests);
    if (token !== state.requestToken) return;
    state.data = { map, calendar, compare, disagreement };
    state.disCell = null;
    renderSummary();
    renderMap();
    renderCompare();
    renderCalendar();
    renderDisagreement();
    renderDownloads();
    updateScopeNote();
    updateControls();
    syncURL();
    triggerMapScan();
  } catch (error) {
    if (token !== state.requestToken) return;
    console.error(error);
    stopPlayback();
    toast(`Could not load the selected view: ${error.message}`);
  } finally {
    if (token === state.requestToken) {
      state.loading = false;
      $('#loading-pill').hidden = true;
      $('main').classList.remove('is-loading');
    }
  }
}

/* ---------------------------------------------------------------- summary */

function updateScopeNote() {
  const area = currentArea();
  if (!area) return;
  const b = area.bounds;
  const count = state.data?.map?.area?.cells ?? cellsInBounds(b);
  const node = $('#scope-note');
  node.replaceChildren();
  node.append(h('strong', { text: `${area.name}` }));
  node.append(document.createTextNode(
    ` · ${b.west.toFixed(2)}–${b.east.toFixed(2)}°E, ${b.south.toFixed(2)}–${b.north.toFixed(2)}°N` +
    ` · ${count} cells · verified archive 2000-11 → 2025-12 · 2026 not verified` +
    (state.areaId === 'custom' ? ' · raw counts only' : ''),
  ));
}

function renderSummary() {
  const { compare, map } = state.data;
  const selected = compare.selected;
  const scale = effectiveScale();
  const platform = selected.platform || state.platform;

  updateConstellation(platform);

  // Selected value.
  const valueNode = $('#kpi-value');
  const valueSub = $('#kpi-value-sub');
  const valueStatus = $('#kpi-value-status');
  valueStatus.replaceChildren();
  if (selected.value === null || selected.value === undefined) {
    delete valueNode.dataset.numVal;
    valueNode.textContent = selected.estimate_status === 'missing_input' ? 'Missing' : 'No value';
    valueSub.textContent = selected.estimate_status === 'missing_input'
      ? `No local input for ${monthLabel()}` : `Not available for ${monthLabel()}`;
    valueStatus.append(statusBadge(selected.estimate_status || 'unavailable'));
  } else {
    animateNumber(valueNode, selected.value, fmtInt);
    valueSub.textContent = `${PLATFORM_LABEL[platform] || platform} · ${scaleShort(scale)}`;
    valueStatus.append(statusBadge(selected.estimate_status));
    if (selected.input_status === 'partial_input_date_range') valueStatus.append(statusBadge('partial_input'));
    if (selected.calibration_status === 'mae_not_improved') valueStatus.append(statusBadge('warn', 'Calibration failed'));
  }

  // Anomaly.
  const anomalyNode = $('#kpi-anomaly');
  const anomalySub = $('#kpi-anomaly-sub');
  const anomalyDetail = $('#kpi-anomaly-detail');
  anomalyNode.className = 'kpi-value';
  anomalyDetail.replaceChildren();
  if (selected.value === null || selected.value === undefined) {
    delete anomalyNode.dataset.numVal;
    anomalyNode.textContent = 'No value';
    anomalySub.textContent = `No comparison for ${monthLabel()}`;
    anomalyDetail.textContent = 'No locally verified input for this month.';
  } else if (!compare.baseline.length) {
    delete anomalyNode.dataset.numVal;
    anomalyNode.textContent = 'No baseline';
    anomalySub.textContent = 'No prior complete years at this scale';
    anomalyDetail.textContent = 'Needs at least one prior complete year.';
  } else if (compare.zero_median) {
    delete anomalyNode.dataset.numVal;
    anomalyNode.textContent = 'Zero median';
    anomalyNode.classList.add('muted');
    anomalySub.textContent = `Median of ${compare.eligible_years} prior ${MONTHS[state.month - 1]}s is 0`;
    anomalyDetail.textContent = `Selected ${fmtInt(selected.value)} · percent change undefined.`;
  } else {
    const percent = compare.percent_change;
    animateNumber(anomalyNode, percent, v => fmtPercent(v) || '—');
    anomalyNode.classList.add(percent > 0 ? 'positive' : percent < 0 ? 'negative' : 'muted');
    anomalySub.textContent = `vs ${compare.eligible_years} prior ${MONTHS[state.month - 1]}s`;
    anomalyDetail.append(
      h('span', {}, 'Median ', h('strong', { text: fmtInt(compare.median) })),
      document.createTextNode(' · '),
      h('strong', { text: fmtSigned(compare.difference) }),
      document.createTextNode(' · year excluded'),
    );
  }

  // Quality + animated fill meter.
  const qualityNode = $('#kpi-quality');
  const qualitySub = $('#kpi-quality-sub');
  const qualityDetail = $('#kpi-quality-detail');
  const qualityBar = $('#kpi-quality-bar');
  qualityDetail.replaceChildren();
  let completeness = 0;
  if (selected.input_status === 'input_missing' || selected.input_status === 'outside_period') {
    qualityNode.textContent = 'No input';
  } else if (selected.input_days !== null && selected.input_days !== undefined) {
    qualityNode.textContent = `${fmtNum(selected.input_days, 0)}/${fmtNum(selected.days_in_month, 0)} days`;
    completeness = selected.days_in_month ? clamp((selected.input_days / selected.days_in_month) * 100, 0, 100) : 0;
  } else {
    qualityNode.textContent = 'No input';
  }
  if (qualityBar) qualityBar.style.width = `${completeness.toFixed(1)}%`;

  qualitySub.textContent = INPUT_LABEL[selected.input_status] || selected.input_status || 'Input completeness';
  qualityDetail.append(
    h('span', {}, 'Cell-days ', h('strong', { text: fmtInt(selected.cell_days) })),
    document.createTextNode(' · factor '),
    h('strong', { text: selected.factor ? `×${fmtNum(selected.factor, 2)}` : '—' }),
  );

  // Scope.
  $('#kpi-coverage').textContent = `${state.meta.totals.files} files`;
  $('#kpi-coverage-sub').textContent = 'NASA FIRMS Egypt archive';
  const coverageDetail = $('#kpi-coverage-detail');
  coverageDetail.replaceChildren(
    h('span', {}, '2000–2025 · '),
    h('strong', { text: `${fmtInt(state.meta.totals.delta_rows)} bbox rows` }),
  );

  // Map / compare headers.
  $('#map-sub').textContent = `${map.platform_label} · ${monthLabel()} · ${scaleShort(scale)}`;
  $('#map-factor').textContent = scale === 'harmonized'
    ? `factor ×${fmtNum(map.factor, 2)}`
    : scale === 'snpp_era' ? 'reference (1.0)' : 'raw counts';
  $('#compare-sub').textContent = `${MONTHS[state.month - 1]} across prior complete years`;
  $('#compare-period').textContent = compare.baseline_period
    ? `${compare.baseline_period.start}–${compare.baseline_period.end}` : 'No baseline';
}

function scaleShort(scale) {
  return {
    harmonized: 'VIIRS S-NPP reference scale',
    snpp_era: 'observed S-NPP only',
    raw: 'raw platform counts',
  }[scale] || scale;
}

/* ----------------------------------------------------- geo projection/map */

function makeProjection(left, top, cellW, cellH) {
  const gridWest = GX[0];
  const gridNorth = GY[GY.length - 1] + CELL;
  return {
    x: lon => left + ((lon - gridWest) / CELL) * cellW,
    y: lat => top + ((gridNorth - lat) / CELL) * cellH,
    visualRow: row => GY.length - 1 - row,
    dataRow: visualRow => GY.length - 1 - visualRow,
  };
}

function polylinePath(coords, proj) {
  return coords.map(([lon, lat], i) => `${i === 0 ? 'M' : 'L'}${proj.x(lon).toFixed(1)},${proj.y(lat).toFixed(1)}`).join(' ');
}

function drawNileGeoLayer(svg, left, top, width, height, proj, { showCities = true, showOrbit = false, clipId = 'nile-clip' } = {}) {
  const defs = s('defs');
  const clip = s('clipPath', { id: clipId });
  clip.append(s('rect', { x: left, y: top, width, height, rx: 3 }));
  defs.append(clip);
  svg.append(defs);

  const g = s('g', { 'clip-path': `url(#${clipId})`, 'pointer-events': 'none' });

  // Translucent Mediterranean Sea polygon above the coastline
  const seaCoords = [
    [GEO_COAST[0][0], GY[GY.length - 1] + CELL + 0.1],
    ...GEO_COAST,
    [GEO_COAST[GEO_COAST.length - 1][0], GY[GY.length - 1] + CELL + 0.1],
  ];
  g.append(s('path', { d: `${polylinePath(seaCoords, proj)} Z`, class: 'geo-sea' }));

  // Subtle fertile Nile Delta emerald tint
  const deltaPoly = [...GEO_ROSETTA, ...GEO_COAST.slice(5, 11), ...[...GEO_DAMIETTA].reverse()];
  g.append(s('path', { d: `${polylinePath(deltaPoly, proj)} Z`, class: 'geo-delta-tint' }));

  // Coastline & Suez Canal
  g.append(s('path', { d: polylinePath(GEO_COAST, proj), class: 'geo-coast' }));
  g.append(s('path', { d: polylinePath(GEO_SUEZ_CANAL, proj), class: 'geo-canal' }));

  // Glowing animated Nile River + Rosetta & Damietta branches
  for (const branch of [GEO_NILE_STEM, GEO_ROSETTA, GEO_DAMIETTA]) {
    const d = polylinePath(branch, proj);
    g.append(s('path', { d, class: 'geo-nile-glow' }));
    g.append(s('path', { d, class: 'geo-nile' }));
    g.append(s('path', { d, class: 'geo-nile-flow' }));
  }

  // Animated Polar-Orbit Satellite Ground Track gliding across the Nile Delta
  if (showOrbit && !REDUCED_MOTION) {
    const orbitPath = `M${(left + width * 0.72).toFixed(1)},${(top + height + 14).toFixed(1)} L${(left + width * 0.44).toFixed(1)},${(top - 14).toFixed(1)}`;
    g.append(s('path', { d: orbitPath, class: 'geo-orbit-track' }));
    const satGroup = s('g');
    satGroup.append(s('circle', { r: 7, class: 'geo-sat-halo' }));
    satGroup.append(s('circle', { r: 2.6, class: 'geo-sat-core' }));
    satGroup.append(s('animateMotion', { dur: '13s', repeatCount: 'indefinite', path: orbitPath }));
    g.append(satGroup);
  }

  // Subtle city landmarks
  if (showCities) {
    for (const city of GEO_CITIES) {
      const cx = proj.x(city.lon);
      const cy = proj.y(city.lat);
      g.append(s('circle', { cx: cx.toFixed(1), cy: cy.toFixed(1), r: 2.6, class: 'geo-city-dot' }));
      g.append(s('text', {
        x: (cx + city.dx).toFixed(1),
        y: (cy + city.dy).toFixed(1),
        'text-anchor': city.anchor,
        class: 'geo-city-label',
      }, city.name));
    }
  }

  svg.append(g);
}

function renderMap() {
  const map = state.data.map;
  const svg = $('#map-svg');
  const left = 58;
  const top = 30;
  const cellSize = 54;
  const width = GX.length * cellSize;
  const height = GY.length * cellSize;
  const proj = makeProjection(left, top, cellSize, cellSize);
  const maxValue = Math.max(1, map.max_value || 0);
  const area = areaBounds(map.area?.bounds);
  const selected = state.data.compare?.selected;
  const missing = selected && selected.value === null;
  const areaTotal = (map.cells || []).reduce((sum, c) => sum + (c.in_area ? Number(c.value || 0) : 0), 0);

  svg.replaceChildren();
  svg.setAttribute('viewBox', `0 0 ${left + width + 30} ${top + height + 46}`);
  svg.append(s('title', {}, `North-up grid map for ${monthLabel()}. ${map.scale_label}`));

  svg.append(s('rect', {
    x: left - 6, y: top - 6, width: width + 12, height: height + 12,
    rx: 9, fill: '#060d19', stroke: 'rgba(56, 189, 248, 0.18)',
  }));

  const rows = new Map();
  for (const cell of map.cells || []) rows.set(`${cell.west},${cell.south}`, cell);

  for (let col = 0; col < GX.length; col += 1) {
    for (let row = 0; row < GY.length; row += 1) {
      const west = GX[col];
      const south = GY[row];
      const vRow = proj.visualRow(row);
      const cell = rows.get(`${west},${south}`);
      const value = cell ? Number(cell.value) : 0;
      const raw = cell ? Number(cell.raw) : 0;
      const days = cell ? Number(cell.cell_days) : 0;
      const ratio = maxValue > 0 ? Math.sqrt(Math.max(0, value) / maxValue) : 0;
      const fill = value > 0 ? fireColor(ratio) : '#0e1b2d';
      const dim = cell && !cell.in_area;
      const isPeak = !missing && !dim && value > 0 && ratio >= 0.82;
      const rect = s('rect', {
        x: left + col * cellSize + 1,
        y: top + vRow * cellSize + 1,
        width: cellSize - 2,
        height: cellSize - 2,
        rx: 4,
        fill,
        'fill-opacity': dim ? 0.24 : 1,
        class: `map-cell${isPeak ? ' map-cell-peak' : ''}`,
      });
      rect.append(s('title', {},
        `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E\n` +
        `${map.scale === 'harmonized' ? 'Harmonised' : 'Value'}: ${fmtNum(value, 2)}\n` +
        `Raw detections: ${fmtInt(raw)}\nCell-days: ${fmtInt(days)}`));
      rect.addEventListener('mouseenter', event => {
        showMapInfo(cell, west, south, map);
        const share = areaTotal > 0 && cell?.in_area ? `${((value / areaTotal) * 100).toFixed(1)}%` : '—';
        showFloatingTip(event, `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E`, [
          [map.scale === 'harmonized' ? 'Harmonised' : 'Detections', fmtNum(value, 1)],
          ['Raw detections', fmtInt(raw)],
          ['Active cell-days', fmtInt(days)],
          ['Share of area', dim ? 'Outside box' : share],
        ]);
      });
      rect.addEventListener('mousemove', moveFloatingTip);
      rect.addEventListener('mouseleave', hideFloatingTip);
      svg.append(rect);
    }
  }

  if (state.showNileOverlay) {
    drawNileGeoLayer(svg, left, top, width, height, proj, { showCities: true, showOrbit: true, clipId: 'map-nile-clip' });
  }

  // Area outline (North-up).
  if (area) {
    const x = proj.x(area.west);
    const y = proj.y(area.north);
    const w = proj.x(area.east) - x;
    const hgt = proj.y(area.south) - y;
    svg.append(s('rect', { x, y, width: w, height: hgt, class: 'map-outline', rx: 3 }));
  }

  // Axes (North at top, South at bottom).
  const longitudeCols = [2, 6, 10].filter(index => index < GX.length);
  for (const col of longitudeCols) {
    svg.append(s('text', {
      x: left + col * cellSize + cellSize / 2, y: top + height + 19,
      'text-anchor': 'middle', class: 'axis-label',
    }, `${(GX[col] + CELL / 2).toFixed(0)}°E`));
  }
  const latitudeRows = [1, 5].filter(index => index < GY.length);
  for (const row of latitudeRows) {
    const vRow = proj.visualRow(row);
    svg.append(s('text', {
      x: left - 10, y: top + vRow * cellSize + cellSize / 2 + 3,
      'text-anchor': 'end', class: 'axis-label',
    }, `${(GY[row] + CELL / 2).toFixed(0)}°N`));
  }
  svg.append(s('text', { x: left, y: 15, class: 'axis-title' }, 'NILE DELTA · 0.25° GRID · NORTH-UP'));
  svg.append(s('text', { x: left + width, y: 15, 'text-anchor': 'end', class: 'axis-label' }, 'MEDITERRANEAN · N ↑'));

  // Missing overlay.
  if (missing) {
    svg.append(s('rect', {
      x: left, y: top, width, height, fill: 'rgba(4, 9, 19, 0.80)', rx: 3,
    }));
    const label = selected.estimate_status === 'missing_input'
      ? `No local input for ${monthLabel()}`
      : `No value for ${monthLabel()}`;
    svg.append(s('text', {
      x: left + width / 2, y: top + height / 2 - 4,
      'text-anchor': 'middle', fill: '#f1f5f9', 'font-size': 16, 'font-weight': 750,
    }, label));
    svg.append(s('text', {
      x: left + width / 2, y: top + height / 2 + 20,
      'text-anchor': 'middle', fill: '#94a3b8', 'font-size': 12,
    }, 'Raw observations are not invented or carried forward.'));
  }

  $('#map-info').textContent = 'Hover any cell for telemetry · drag on the map to draw a custom box.';
}

function areaBounds(bounds) {
  if (!bounds) return null;
  return {
    west: Number(bounds.west), south: Number(bounds.south),
    east: Number(bounds.east), north: Number(bounds.north),
  };
}

function showMapInfo(cell, west, south, map) {
  if (!cell) {
    $('#map-info').textContent = `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E · zero detections.`;
    return;
  }
  const valueLabel = map.scale === 'harmonized' ? 'Harmonised' : 'Value';
  $('#map-info').replaceChildren(
    h('strong', { text: `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E` }),
    document.createTextNode(` · ${valueLabel} ${fmtNum(cell.value, 2)} · raw ${fmtInt(cell.raw)} · ${fmtInt(cell.cell_days)} cell-days` +
      (cell.in_area ? '' : ' · outside selected box')),
  );
}

function fireColor(t) {
  const stops = [
    [0.0, [16, 32, 51]],
    [0.14, [74, 25, 54]],
    [0.34, [154, 38, 23]],
    [0.58, [234, 88, 12]],
    [0.80, [245, 158, 11]],
    [1.0, [254, 240, 138]],
  ];
  const value = clamp(t, 0, 1);
  for (let index = 1; index < stops.length; index += 1) {
    if (value <= stops[index][0]) {
      const [a, ca] = stops[index - 1];
      const [b, cb] = stops[index];
      const f = (value - a) / (b - a || 1);
      const rgb = ca.map((channel, channelIndex) => Math.round(channel + (cb[channelIndex] - channel) * f));
      return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
    }
  }
  return 'rgb(254,240,138)';
}

function readableText(fill) {
  const match = /rgb\((\d+),(\d+),(\d+)\)/.exec(fill);
  if (!match) return '#f8fafc';
  const luminance = relativeLuminance(match.slice(1).map(Number));
  const onBlack = (luminance + 0.05) / 0.05;
  const onWhite = 1.05 / (luminance + 0.05);
  return onBlack >= onWhite ? '#05080f' : '#ffffff';
}

function relativeLuminance([r, g, b]) {
  const channel = value => {
    const c = value / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function initMapInteraction() {
  const svg = $('#map-svg');
  const left = 58;
  const top = 30;
  const cellSize = 54;
  let drag = null;

  const point = event => {
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const local = svg.createSVGPoint();
    local.x = event.clientX;
    local.y = event.clientY;
    return local.matrixTransform(matrix.inverse());
  };
  const cellAt = event => {
    const local = point(event);
    if (!local) return null;
    const col = Math.floor((local.x - left) / cellSize);
    const vRow = Math.floor((local.y - top) / cellSize);
    if (col < 0 || vRow < 0 || col >= GX.length || vRow >= GY.length) return null;
    return { col, vRow, row: GY.length - 1 - vRow };
  };
  const preview = (start, end) => {
    let node = svg.querySelector('.map-selection');
    if (!node) {
      node = s('rect', { class: 'map-selection', rx: 3 });
      svg.append(node);
    }
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    const minVRow = Math.min(start.vRow, end.vRow);
    const maxVRow = Math.max(start.vRow, end.vRow);
    node.setAttribute('x', left + minCol * cellSize + 1);
    node.setAttribute('y', top + minVRow * cellSize + 1);
    node.setAttribute('width', (maxCol - minCol + 1) * cellSize - 2);
    node.setAttribute('height', (maxVRow - minVRow + 1) * cellSize - 2);
  };

  svg.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    const cell = cellAt(event);
    if (!cell) return;
    event.preventDefault();
    stopPlayback();
    hideFloatingTip();
    drag = { start: cell, end: cell };
    preview(drag.start, drag.end);
    try { svg.setPointerCapture(event.pointerId); } catch (_) { /* no capture */ }
  });

  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    const cell = cellAt(event);
    if (!cell) return;
    drag.end = cell;
    preview(drag.start, drag.end);
  });

  const finish = event => {
    if (!drag) return;
    const cell = cellAt(event) || drag.end;
    const minCol = Math.min(drag.start.col, cell.col);
    const maxCol = Math.max(drag.start.col, cell.col);
    const minRow = Math.min(drag.start.row, cell.row);
    const maxRow = Math.max(drag.start.row, cell.row);
    const bounds = {
      west: GX[minCol],
      south: GY[minRow],
      east: Number((GX[maxCol] + CELL).toFixed(2)),
      north: Number((GY[maxRow] + CELL).toFixed(2)),
    };
    drag = null;
    applyCustomBounds(bounds, { silent: false });
  };

  svg.addEventListener('pointerup', finish);
  svg.addEventListener('pointercancel', () => { drag = null; });
}

/* ---------------------------------------------------------------- compare */

function renderCompare() {
  const compare = state.data.compare;
  const selected = compare.selected;
  const body = $('#compare-body');
  body.replaceChildren();

  if (selected.value === null || selected.value === undefined) {
    body.append(
      h('div', { class: 'compare-big muted', text: 'No value' }),
      h('div', { class: 'compare-facts' },
        fact('Selected', monthLabel()),
        fact('Reason', STATUS_SHORT[selected.estimate_status] || 'Unavailable')),
    );
  } else if (!compare.baseline.length) {
    body.append(
      h('div', { class: 'compare-big muted', text: 'No baseline' }),
      h('div', { class: 'compare-facts' },
        fact('Selected', fmtInt(selected.value)),
        fact('Prior years', '0')),
    );
  } else if (compare.zero_median) {
    body.append(
      h('div', { class: 'compare-big muted', text: 'Zero median' }),
      h('div', { class: 'compare-facts' },
        fact('Selected', fmtInt(selected.value)),
        fact('Median', '0'),
        fact('Diff', fmtSigned(compare.difference))),
    );
  } else {
    const percent = compare.percent_change;
    body.append(
      h('div', { class: `compare-big ${percent > 0 ? 'positive' : percent < 0 ? 'negative' : 'muted'}` },
        fmtPercent(percent) || '—', h('small', { text: ' vs median' })),
      h('div', { class: 'compare-facts' },
        fact('Selected', fmtInt(selected.value)),
        fact('Median', fmtInt(compare.median)),
        fact('Diff', fmtSigned(compare.difference))),
    );
  }

  renderCompareChart(compare);
  renderChips(compare);

  const drawer = $('#years-drawer');
  const summary = $('#years-summary');
  if (drawer && summary) {
    const n = compare.baseline.length;
    drawer.hidden = n === 0;
    const comp = compare.baseline_composition;
    const mix = comp && comp.extrapolated > 0
      ? ` · ${comp.observed} observed + ${comp.extrapolated} extrapolated`
      : '';
    summary.textContent = `Inspect ${n} prior baseline years${mix}`;
  }

  const warnings = $('#compare-warnings');
  warnings.replaceChildren();
  const messages = [...(compare.warnings || [])];
  if (compare.zero_median) {
    messages.push('Prior-year median is zero, so percentage change is omitted; absolute difference is shown.');
  }
  for (const message of messages) {
    warnings.append(h('div', { class: 'warning', text: message }));
  }
}

function fact(label, value) {
  return h('div', { class: 'compare-fact' }, h('span', { text: label }), h('strong', { text: value }));
}

function renderCompareChart(compare) {
  const svg = $('#compare-chart');
  svg.replaceChildren();
  const width = 520;
  const height = 275;
  const left = 50;
  const right = 28;
  const top = 26;
  const bottom = 34;
  const selected = compare.selected;
  const baseline = [...compare.baseline].sort((a, b) => a.year - b.year);

  if (!baseline.length) {
    svg.append(s('text', {
      x: width / 2, y: height / 2, 'text-anchor': 'middle', class: 'chart-axis',
    }, 'No prior complete years to compare.'));
    return;
  }

  const defs = s('defs');
  const lineGrad = s('linearGradient', { id: 'compare-line-grad', x1: '0%', y1: '0%', x2: '100%', y2: '0%' },
    s('stop', { offset: '0%', 'stop-color': '#38bdf8' }),
    s('stop', { offset: '55%', 'stop-color': '#2dd4bf' }),
    s('stop', { offset: '100%', 'stop-color': '#fb923c' }),
  );
  const areaGrad = s('linearGradient', { id: 'compare-area-grad', x1: '0%', y1: '0%', x2: '0%', y2: '100%' },
    s('stop', { offset: '0%', 'stop-color': '#38bdf8', 'stop-opacity': '0.24' }),
    s('stop', { offset: '65%', 'stop-color': '#2dd4bf', 'stop-opacity': '0.07' }),
    s('stop', { offset: '100%', 'stop-color': '#040711', 'stop-opacity': '0' }),
  );
  defs.append(lineGrad, areaGrad);
  svg.append(defs);

  const years = baseline.map(item => item.year);
  const xmin = Math.min(...years);
  const xmax = Math.max(state.year, ...years);
  const values = baseline.map(item => item.value);
  if (selected.value !== null && selected.value !== undefined) values.push(selected.value);
  if (compare.median !== null && compare.median !== undefined) values.push(compare.median);
  const comp = compare.baseline_composition;
  const showObsMedian = Boolean(
    comp && comp.observed > 0 && comp.extrapolated > 0 &&
    comp.observed_median !== null && comp.observed_median !== undefined &&
    selected.value !== null && compare.median !== null &&
    ((selected.value - comp.observed_median > 0) !== (selected.value - compare.median > 0)),
  );
  if (showObsMedian) values.push(comp.observed_median);

  const ymax = Math.max(1, ...values) * 1.16;
  const x = year => xmax === xmin
    ? left + (width - left - right) / 2
    : left + ((year - xmin) / (xmax - xmin)) * (width - left - right);
  const y = value => height - bottom - (Math.max(0, value) / ymax) * (height - top - bottom);

  for (const tick of [0, ymax / 2, ymax]) {
    const yy = y(tick);
    svg.append(s('line', { x1: left, x2: width - right, y1: yy, y2: yy, class: 'chart-grid' }));
    svg.append(s('text', { x: left - 8, y: yy + 3, 'text-anchor': 'end', class: 'chart-axis' }, compact(tick)));
  }

  if (baseline.length > 1) {
    const linePath = baseline.map((item, index) => `${index === 0 ? 'M' : 'L'}${x(item.year).toFixed(1)},${y(item.value).toFixed(1)}`).join(' ');
    const baseY = height - bottom;
    const areaPath = `${linePath} L${x(baseline[baseline.length - 1].year).toFixed(1)},${baseY} L${x(baseline[0].year).toFixed(1)},${baseY} Z`;
    svg.append(s('path', { d: areaPath, class: 'chart-area' }));
    svg.append(s('path', {
      d: linePath,
      class: `chart-line${REDUCED_MOTION || state.playing ? '' : ' chart-line-animate'}`,
      'stroke-dasharray': REDUCED_MOTION || state.playing ? null : '1600',
    }));
  }

  const selOnRight = selected.value !== null && selected.value !== undefined && x(state.year) > (left + width - right) / 2;
  const my = compare.median !== null && compare.median !== undefined ? y(compare.median) : null;
  if (my !== null) {
    svg.append(s('line', { x1: left, x2: width - right, y1: my, y2: my, class: 'chart-median' }));
    svg.append(s('text', {
      x: selOnRight ? left + 6 : width - right - 6,
      y: my - 6,
      'text-anchor': selOnRight ? 'start' : 'end',
      class: 'chart-label',
    }, `median ${fmtInt(compare.median)}`));
  }

  if (showObsMedian) {
    const oy = y(comp.observed_median);
    const labelBelow = my !== null && Math.abs(oy - my) < 18 && oy >= my;
    svg.append(s('line', { x1: left, x2: width - right, y1: oy, y2: oy, class: 'chart-obs-median' }));
    svg.append(s('text', {
      x: left + 6,
      y: labelBelow ? oy + 12 : oy - 6,
      'text-anchor': 'start',
      class: 'chart-label-obs',
    }, `S-NPP only median ${fmtInt(comp.observed_median)}`));
  }

  for (const item of baseline) {
    const cx = x(item.year);
    const cy = y(item.value);
    const dot = s('circle', {
      cx: cx.toFixed(1), cy: cy.toFixed(1), r: 3.7,
      class: 'chart-dot', fill: PLATFORM_COLOR[item.platform] || '#94a3b8',
    });
    dot.append(s('title', {}, `${item.year}: ${fmtInt(item.value)} (${PLATFORM_SHORT[item.platform] || item.platform}) — click to inspect`));
    dot.addEventListener('mouseenter', event => {
      dot.setAttribute('r', '5.6');
      showFloatingTip(event, `${MONTHS[state.month - 1]} ${item.year}`, [
        ['Value', fmtInt(item.value)],
        ['Platform', PLATFORM_LABEL[item.platform] || item.platform],
        ['Status', STATUS_SHORT[item.estimate_status] || item.estimate_status],
        ['Action', 'Click to jump'],
      ]);
    });
    dot.addEventListener('mousemove', moveFloatingTip);
    dot.addEventListener('mouseleave', () => {
      dot.setAttribute('r', '3.7');
      hideFloatingTip();
    });
    dot.addEventListener('click', () => {
      stopPlayback();
      state.year = item.year;
      updateControls();
      refresh();
    });
    svg.append(dot);
  }

  if (selected.value !== null && selected.value !== undefined) {
    const sx = x(state.year);
    const sy = y(selected.value);
    svg.append(s('line', {
      x1: sx, x2: sx, y1: top, y2: height - bottom,
      stroke: 'rgba(255, 107, 26, 0.32)', 'stroke-dasharray': '3 5',
    }));
    svg.append(s('circle', { cx: sx, cy: sy, r: 7, class: 'chart-selected-ring' }));
    const pt = s('circle', { cx: sx, cy: sy, r: 5.5, class: 'chart-selected' });
    pt.append(s('title', {}, `${state.year}: ${fmtInt(selected.value)} (selected)`));
    svg.append(pt);
    svg.append(s('text', {
      x: sx,
      y: Math.max(top + 10, sy - 13),
      'text-anchor': sx > width - 95 ? 'end' : sx < left + 65 ? 'start' : 'middle',
      class: 'chart-label',
    }, `${state.year}: ${fmtInt(selected.value)}`));
  }

  const candidates = [...new Set([xmin, Math.round((xmin + xmax) / 2), xmax, state.year])]
    .filter(yr => yr >= xmin && yr <= xmax)
    .sort((a, b) => a - b);
  let lastLabelX = -Infinity;
  for (const year of candidates) {
    const lx = x(year);
    if (lx - lastLabelX < 34 && year !== state.year) continue;
    lastLabelX = lx;
    svg.append(s('text', { x: lx, y: height - 11, 'text-anchor': 'middle', class: 'chart-axis' }, String(year)));
  }
  svg.append(s('text', { x: left, y: 14, class: 'chart-axis' }, `Hotspots per ${MONTHS_SHORT[state.month - 1]} · click any dot to jump`));
}

function renderChips(compare) {
  const chips = $('#compare-chips');
  chips.replaceChildren();
  for (const item of [...compare.baseline].sort((a, b) => a.year - b.year)) {
    const chip = h('button', {
      type: 'button',
      class: 'chip',
      title: `Jump to ${MONTHS[state.month - 1]} ${item.year}: ${fmtInt(item.value)} · ${PLATFORM_LABEL[item.platform] || item.platform}`,
      onclick: () => {
        stopPlayback();
        state.year = item.year;
        updateControls();
        refresh();
      },
    },
      h('i', { style: `background:${PLATFORM_COLOR[item.platform] || '#94a3b8'}` }),
      h('b', { text: item.year }),
      h('span', { text: fmtInt(item.value) }),
    );
    if (item.estimate_status === 'extrapolated') {
      chip.append(h('span', { text: '≈', title: 'Extrapolated', style: 'color:#fbbf24' }));
    }
    chips.append(chip);
  }
}

/* --------------------------------------------------------------- calendar */

function renderCalendar() {
  const calendar = state.data.calendar;
  const table = $('#calendar-table');
  table.replaceChildren();
  const maxValue = Math.max(1, calendar.max_value || 0);
  const byMonth = new Map();
  for (const cell of calendar.cells) byMonth.set(`${cell.year}-${cell.month}`, cell);

  const head = h('tr');
  head.append(h('th', { class: 'year-head', scope: 'col', text: 'Year' }));
  MONTHS_SHORT.forEach((month, index) => {
    head.append(h('th', { scope: 'col', class: state.month === index + 1 ? 'is-current' : '' },
      h('button', {
        type: 'button',
        text: month,
        title: `Select ${MONTHS[index]}`,
        onclick: () => {
          stopPlayback();
          state.month = index + 1;
          updateControls();
          refresh();
        },
      })));
  });
  table.append(h('thead', {}, head));

  const body = h('tbody');
  let shown = 0;
  let missing = 0;
  let extrapolated = 0;
  let partial = 0;
  let selectedButton = null;
  const eraMarkers = {
    2000: ['Terra', 'era-terra'],
    2002: ['Aqua', 'era-aqua'],
    2012: ['S-NPP', 'era-snpp'],
    2026: ['Pend', 'era-pending'],
  };

  for (let year = 2000; year <= 2026; year += 1) {
    const row = h('tr', { class: (year === 2002 || year === 2012 || year === 2026) ? 'era-break' : '' });
    const era = eraMarkers[year];
    row.append(h('td', { class: `year-cell${state.year === year ? ' is-current' : ''}` },
      h('button', {
        type: 'button',
        title: `Select year ${year}`,
        onclick: () => {
          stopPlayback();
          state.year = year;
          updateControls();
          refresh();
        },
      },
        h('span', { text: String(year) }),
        era && effectiveScale() === 'harmonized' ? h('span', { class: `era-tag ${era[1]}`, text: era[0] }) : null,
      )));

    for (let month = 1; month <= 12; month += 1) {
      const cell = byMonth.get(`${year}-${month}`);
      const td = h('td');
      if (!cell) {
        td.append(h('span', { class: 'cal-cell missing', text: '—' }));
        row.append(td);
        missing += 1;
        continue;
      }
      const button = h('button', { type: 'button', class: 'cal-cell' });
      const status = cell.estimate_status;
      const input = cell.input_status;
      if (status === 'extrapolated') button.classList.add('extrapolated');
      if (status === 'validated_period') button.classList.add('validated_period');
      if (status === 'raw_only') button.classList.add('raw_only');
      if (status === 'partial_input' || input === 'partial_input_date_range') button.classList.add('partial');
      if (status === 'missing_input') button.classList.add('missing');
      if (input === 'outside_period') button.classList.add('outside');

      if (cell.value === null || cell.value === undefined) {
        button.textContent = input === 'outside_period' ? '·' : '—';
        missing += 1;
      } else {
        shown += 1;
        const ratio = maxValue > 0 ? Math.sqrt(Math.max(0, cell.value) / maxValue) : 0;
        const fill = cell.value > 0 ? fireColor(ratio) : '#0e1b2d';
        button.style.background = fill;
        button.style.color = readableText(fill);
        button.textContent = calendarValue(cell.value);
        if (status === 'extrapolated') {
          button.append(h('span', { class: 'flag flag-warn', text: '≈' }));
          extrapolated += 1;
        } else if (status === 'partial_input' || input === 'partial_input_date_range') {
          button.append(h('span', { class: 'flag flag-warn', text: 'P' }));
          partial += 1;
        } else if (status === 'raw_only') {
          button.append(h('span', { class: 'flag', text: 'R', style: 'color:#cbd5e1' }));
        }
      }

      button.title = calendarTooltip(cell);
      button.setAttribute('aria-label',
        `${button.textContent.trim()} · ${calendarTooltip(cell).replace(/\n/g, ' · ')}`);
      if (cell.year === state.year && cell.month === state.month) {
        button.classList.add('selected');
        selectedButton = button;
      }
      button.addEventListener('click', () => {
        stopPlayback();
        state.year = cell.year;
        state.month = cell.month;
        updateControls();
        refresh();
      });
      td.append(button);
      row.append(td);
    }
    body.append(row);
  }
  table.append(body);

  const note = $('#calendar-note');
  const custom = state.areaId === 'custom' ? 'Custom rectangle · raw counts only. ' : '';
  note.textContent = `${custom}${fmtInt(shown)} months with a value · ${fmtInt(extrapolated)} extrapolated · ${fmtInt(partial)} partial · ${fmtInt(missing)} missing or outside platform period · peak ${fmtInt(calendar.max_value)}.`;

  const scroll = $('.calendar-scroll');
  if (selectedButton && scroll && !state.playing) {
    const offset = selectedButton.getBoundingClientRect().top - scroll.getBoundingClientRect().top;
    if (offset < 0 || offset > scroll.clientHeight - 30) {
      scroll.scrollTop += offset - scroll.clientHeight / 2;
    }
  }
}

function calendarValue(value) {
  if (value >= 10000) return `${nf0.format(value / 1000)}k`;
  if (value >= 1000) return `${nf1.format(value / 1000)}k`;
  if (value >= 10) return nf0.format(value);
  return nf1.format(value);
}

function calendarTooltip(cell) {
  const lines = [
    `${monthLabel(cell.year, cell.month)} — ${STATUS_LABEL[cell.estimate_status] || cell.estimate_status}`,
    cell.value === null || cell.value === undefined ? 'Value: no locally verified value' : `Value: ${fmtNum(cell.value, 2)}`,
    `Platform: ${PLATFORM_LABEL[cell.platform] || cell.platform}`,
    `Raw: Terra ${fmtInt(cell.raw_by_platform?.terra)} · Aqua ${fmtInt(cell.raw_by_platform?.aqua)} · S-NPP ${fmtInt(cell.raw_by_platform?.snpp)} · NOAA-20 ${fmtInt(cell.raw_by_platform?.noaa20)}`,
    `Input: ${INPUT_LABEL[cell.input_status] || cell.input_status}${cell.input_days !== null && cell.input_days !== undefined ? ` (${fmtNum(cell.input_days, 0)}/${fmtNum(cell.days_in_month, 0)} days)` : ''}`,
    `Cell-days: ${fmtInt(cell.cell_days)} · factor ${cell.factor ? `×${fmtNum(cell.factor, 2)}` : '—'}`,
  ];
  return lines.join('\n');
}

/* ----------------------------------------------------------- disagreement */

function cellKey(west, south) {
  return `${Number(west).toFixed(2)},${Number(south).toFixed(2)}`;
}

function renderDisagreement() {
  const data = state.data.disagreement;
  const active = data.active_cell_days || 0;
  $('#disagreement-sub').textContent = `${monthLabel()} · 0.25° cells · UTC calendar-day pairing`;
  $('#disagreement-pill').textContent = active
    ? `${fmtInt(active)} active cell-days` : 'No active cell-days';

  const summary = $('#disagreement-summary');
  summary.replaceChildren();
  const bar = h('div', { class: 'bar-summary' });
  if (active > 0) {
    for (const [key, className, label] of [
      ['aqua_only', 'bar-aqua', 'Aqua only'],
      ['snpp_only', 'bar-snpp', 'S-NPP only'],
      ['both', 'bar-both', 'Both'],
    ]) {
      const count = data[key] || 0;
      if (count > 0) {
        bar.append(h('span', {
          class: className,
          style: `width:${(count / active) * 100}%`,
          title: `${label}: ${fmtInt(count)} cell-days (${((count / active) * 100).toFixed(1)}%)`,
        }));
      }
    }
  }
  summary.append(bar);
  const caption = h('div', { class: 'bar-caption' });
  caption.append(
    h('span', {}, 'Active cell-days ', h('b', { text: fmtInt(active) })),
    h('span', {}, 'Aqua only ', h('b', { text: fmtInt(data.aqua_only) }), ' ', percentOf(data.aqua_only, active)),
    h('span', {}, 'S-NPP only ', h('b', { text: fmtInt(data.snpp_only) }), ' ', percentOf(data.snpp_only, active)),
    h('span', {}, 'Both ', h('b', { text: fmtInt(data.both) }), ' ', percentOf(data.both, active)),
    h('span', {}, 'Disagreement share ', h('b', { text: active ? fmtShare(data.disagreement_share, 1) : '—' })),
  );
  summary.append(caption);

  const note = $('#disagreement-note');
  note.textContent = `${data.coverage_note || ''} Denominator: ${data.denominator || 'active cell-days'}. A "both" cell-day means both sensors detected at least one hotspot in the same 0.25° cell on the same UTC date; it does not mean the same fire.`;

  renderDisagreementGrid(data);
}

function percentOf(part, total) {
  if (!total) return h('span', { class: 'muted', text: '—' });
  return h('span', { class: 'muted', text: `(${((part / total) * 100).toFixed(1)}%)` });
}

function renderDisagreementGrid(data) {
  const svg = $('#disagreement-grid');
  svg.replaceChildren();
  const left = 46;
  const top = 26;
  const size = 40;
  const width = GX.length * size;
  const height = GY.length * size;
  const proj = makeProjection(left, top, size, size);
  svg.setAttribute('viewBox', `0 0 ${left + width + 28} ${top + height + 44}`);
  svg.append(s('title', {}, `North-up Aqua versus S-NPP cell-day disagreement for ${monthLabel()}`));

  const lookup = new Map();
  for (const cell of data.cells || []) lookup.set(cellKey(cell.west, cell.south), cell);
  const maxTotal = Math.max(1, ...(data.cells || []).map(cell => cell.total || 0));

  if (!state.disCell) {
    let best = null;
    for (const cell of data.cells || []) {
      if (!best || (cell.total || 0) > (best.total || 0)) best = cell;
    }
    state.disCell = best ? { west: best.west, south: best.south } : null;
  }

  for (let col = 0; col < GX.length; col += 1) {
    for (let row = 0; row < GY.length; row += 1) {
      const west = GX[col];
      const south = GY[row];
      const vRow = proj.visualRow(row);
      const cell = lookup.get(cellKey(west, south)) || { aqua_only: 0, snpp_only: 0, both: 0, total: 0 };
      const total = cell.total || 0;
      const dominant = cell.both >= cell.aqua_only && cell.both >= cell.snpp_only ? '#2dd4bf'
        : cell.aqua_only >= cell.snpp_only ? '#38bdf8' : '#c084fc';
      const opacity = total ? 0.16 + 0.56 * Math.sqrt(total / maxTotal) : 0;
      const x = left + col * size;
      const y = top + vRow * size;
      const selected = state.disCell && Math.abs(state.disCell.west - west) < 1e-6 && Math.abs(state.disCell.south - south) < 1e-6;

      const rect = s('rect', {
        x: x + 1, y: y + 1, width: size - 2, height: size - 2,
        rx: 3,
        fill: total ? dominant : '#0e1b2d',
        'fill-opacity': total ? opacity : 1,
        class: `dis-cell${selected ? ' selected' : ''}`,
        tabindex: 0,
        role: 'button',
        'aria-label': `${(south + CELL / 2).toFixed(2)} north, ${(west + CELL / 2).toFixed(2)} east: Aqua only ${cell.aqua_only}, S-NPP only ${cell.snpp_only}, both ${cell.both}`,
      });
      rect.append(s('title', {},
        `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E\n` +
        `Aqua only: ${cell.aqua_only}\nS-NPP only: ${cell.snpp_only}\nBoth: ${cell.both}\nTotal: ${total}`));
      const choose = () => {
        state.disCell = { west, south };
        renderDisagreementGrid(data);
        renderDisagreementDetail(data);
      };
      rect.addEventListener('click', choose);
      rect.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choose(); }
      });
      rect.addEventListener('mouseenter', event => {
        showFloatingTip(event, `${(south + CELL / 2).toFixed(2)}°N, ${(west + CELL / 2).toFixed(2)}°E`, [
          ['Aqua only', fmtInt(cell.aqua_only)],
          ['S-NPP only', fmtInt(cell.snpp_only)],
          ['Both sensors', fmtInt(cell.both)],
          ['Active cell-days', fmtInt(total)],
        ]);
      });
      rect.addEventListener('mousemove', moveFloatingTip);
      rect.addEventListener('mouseleave', hideFloatingTip);
      svg.append(rect);

      if (total > 0) {
        const stripY = y + size - 7;
        let offset = 0;
        for (const [key, color] of [['aqua_only', '#38bdf8'], ['snpp_only', '#c084fc'], ['both', '#2dd4bf']]) {
          const segment = ((cell[key] || 0) / total) * (size - 2);
          if (segment <= 0) continue;
          svg.append(s('rect', {
            x: x + 1 + offset, y: stripY, width: Math.max(0.8, segment), height: 5,
            fill: color, rx: 1, 'pointer-events': 'none',
          }));
          offset += segment;
        }
      }
    }
  }

  if (state.showNileOverlay) {
    drawNileGeoLayer(svg, left, top, width, height, proj, { showCities: false, showOrbit: false, clipId: 'dis-nile-clip' });
  }

  for (const col of [2, 6, 10].filter(index => index < GX.length)) {
    svg.append(s('text', {
      x: left + col * size + size / 2, y: top + height + 18,
      'text-anchor': 'middle', class: 'axis-label',
    }, `${(GX[col] + CELL / 2).toFixed(0)}°E`));
  }
  for (const row of [1, 5].filter(index => index < GY.length)) {
    const vRow = proj.visualRow(row);
    svg.append(s('text', {
      x: left - 8, y: top + vRow * size + size / 2 + 3,
      'text-anchor': 'end', class: 'axis-label',
    }, `${(GY[row] + CELL / 2).toFixed(0)}°N`));
  }
  svg.append(s('text', { x: left, y: 14, class: 'axis-title' }, 'PAIRED DETECTIONS · 0.25° CELLS · NORTH-UP'));
  svg.append(s('text', { x: left + width, y: 14, 'text-anchor': 'end', class: 'axis-label' }, 'N ↑'));

  renderDisagreementDetail(data);
}

function renderDisagreementDetail(data) {
  const panel = $('#disagreement-detail');
  panel.replaceChildren();
  if (!state.disCell) {
    panel.append(h('p', { class: 'muted', text: 'Select a grid cell to inspect its paired counts.' }));
    return;
  }
  const key = cellKey(state.disCell.west, state.disCell.south);
  const cell = (data.cells || []).find(item => cellKey(item.west, item.south) === key);
  if (!cell) {
    panel.append(h('p', { class: 'muted', text: 'No cell record for this selection.' }));
    return;
  }
  const total = cell.total || 0;
  panel.append(
    h('h3', { text: `${(cell.south + CELL / 2).toFixed(2)}°N, ${(cell.west + CELL / 2).toFixed(2)}°E` }),
    h('p', { text: `${monthLabel()} · ${total ? `${fmtInt(total)} active cell-days` : 'no active cell-days'}` }),
  );
  const list = h('div', { class: 'dis-list' });
  list.append(
    disRow('Aqua only', cell.aqua_only, total, '#38bdf8'),
    disRow('S-NPP only', cell.snpp_only, total, '#c084fc'),
    disRow('Both sensors', cell.both, total, '#2dd4bf'),
    disRow('Total active', total, total, '#f59e0b'),
  );
  panel.append(list);

  const queryText = `month=${monthKey()} west=${cell.west.toFixed(2)} south=${cell.south.toFixed(2)}`;
  const copyBtn = h('button', {
    type: 'button',
    class: 'copy-btn',
    text: 'Copy',
    title: 'Copy cell cross-check filter',
    onclick: async () => {
      try {
        await navigator.clipboard.writeText(queryText);
        toast('Copied cross-check filter to clipboard.');
      } catch (_) {
        toast(`Filter: ${queryText}`);
      }
    },
  });
  panel.append(h('div', { class: 'dis-lookup-wrap' },
    h('code', { class: 'lookup', text: queryText }),
    copyBtn,
  ));
  panel.append(h('p', {
    class: 'footnote',
    text: 'Cross-check: filter data/processed/sensor_disagreement.csv by these three fields, then sum cell_days within each observed_in group.',
  }));
}

function disRow(label, value, total, color) {
  const pct = total ? (value / total) * 100 : 0;
  const share = total ? ` (${pct.toFixed(1)}%)` : '';
  return h('div', { class: 'dis-row-block' },
    h('div', { class: 'dis-row-head' },
      h('span', { text: label }),
      h('b', { text: `${fmtInt(value)}${share}` }),
    ),
    h('div', { class: 'dis-mini-bar' },
      h('i', { style: `width:${pct.toFixed(1)}%;background:${color}` }),
    ),
  );
}

/* ---------------------------------------------------------------- downloads */

function renderDownloads() {
  const area = currentArea();
  const scale = effectiveScale();
  const monthlyParams = baseParams({
    kind: 'monthly', scale, platform: state.platform, start_year: 2000, end_year: 2026,
  });
  $('#download-monthly').href = `/api/download?${monthlyParams.toString()}`;
  $('#download-monthly').title = `Monthly calendar CSV for ${area.name}, ${scale}, 2000–2026`;

  const detectionParams = baseParams({
    kind: 'detections', start_year: state.year, end_year: state.year,
  });
  $('#download-detections').href = `/api/download?${detectionParams.toString()}`;
  $('#download-detections').title = `Raw hotspot CSV for ${area.name}, ${state.year}`;

  $('#download-scope').textContent = `${area.name} · ${scaleShort(scale)} · ${monthLabel()} · exports include provenance, estimate status and input completeness.`;
}

function csvEscape(value) {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function downloadDisagreement() {
  const data = state.data.disagreement;
  if (!data) {
    toast('Load a month before exporting the disagreement grid.');
    return;
  }
  const rows = [
    ['month', 'area_id', 'west', 'south', 'aqua_only', 'snpp_only', 'both', 'total', 'active_cell_days', 'denominator', 'source'],
  ];
  for (const cell of data.cells || []) {
    rows.push([monthKey(), data.area?.id || state.areaId, cell.west, cell.south,
      cell.aqua_only, cell.snpp_only, cell.both, cell.total,
      data.active_cell_days, data.denominator,
      'NASA FIRMS annual Egypt archive; paired Aqua vs S-NPP cell-days']);
  }
  const text = '\ufeff' + rows.map(row => row.map(csvEscape).join(',')).join('\r\n');
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `delta_disagreement_${state.areaId}_${monthKey()}.csv`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
  toast('Disagreement grid exported.');
}

/* ------------------------------------------------------------------- audit */

function renderMaeCalibrated(value, row) {
  const raw = Number(row.mae_raw);
  const adj = Number(value);
  const wrap = h('span', { class: 'mae-cell' }, h('span', { text: fmtNum(adj, 2) }));
  if (Number.isFinite(raw) && raw > 0 && Number.isFinite(adj)) {
    const pct = ((adj - raw) / raw) * 100;
    wrap.append(h('span', {
      class: `mae-delta ${pct < 0 ? 'mae-delta-good' : 'mae-delta-bad'}`,
      text: fmtPercent(pct, 1),
    }));
  }
  return wrap;
}

function renderAudit() {
  const meta = state.meta;
  renderTable($('#audit-calibration'), [
    { label: 'Platform', value: row => PLATFORM_LABEL[row.source] || row.source },
    { label: 'Train months', key: 'train_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Test months', key: 'test_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Factor', key: 'factor', num: true, fmt: value => `×${fmtNum(value, 3)}` },
    { label: 'MAE raw', key: 'mae_raw', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'MAE calibrated', key: 'mae_adjusted', num: true, render: renderMaeCalibrated },
    { label: 'Bias raw', key: 'bias_raw', num: true, fmt: value => fmtSigned(value, 2) },
    { label: 'Bias calibrated', key: 'bias_adjusted', num: true, fmt: value => fmtSigned(value, 2) },
    { label: 'Result', key: 'status', render: value => statusPill(value) },
  ], meta.calibration);

  renderTable($('#audit-by-year'), [
    { label: 'Platform', value: row => PLATFORM_LABEL[row.source] || row.source },
    { label: 'Year', key: 'test_year', num: true },
    { label: 'Months', key: 'test_months', num: true },
    { label: 'MAE raw', key: 'mae_raw', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'MAE calibrated', key: 'mae_adjusted', num: true, render: renderMaeCalibrated },
    { label: 'Bias raw', key: 'bias_raw', num: true, fmt: value => fmtSigned(value, 1) },
    { label: 'Bias calibrated', key: 'bias_adjusted', num: true, fmt: value => fmtSigned(value, 1) },
    { label: 'Sep+Oct MAE raw', key: 'sep_oct_mae_raw', num: true, fmt: value => fmtNum(value, 1) },
    { label: 'Sep+Oct MAE calibrated', key: 'sep_oct_mae_adjusted', num: true, fmt: value => fmtNum(value, 1) },
  ], meta.by_year);

  renderTable($('#audit-sensitivity'), [
    { label: 'Metric', value: row => row.metric === 'cell_day' ? 'Cell-days' : 'Hotspot count' },
    { label: 'Platform', value: row => PLATFORM_LABEL[row.source] || row.source },
    { label: 'Factor', key: 'factor', num: true, fmt: value => `×${fmtNum(value, 3)}` },
    { label: 'MAE raw', key: 'mae_raw', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'MAE calibrated', key: 'mae_adjusted', num: true, render: renderMaeCalibrated },
    { label: 'Result', key: 'status', render: value => statusPill(value) },
  ], meta.sensitivity);

  renderTable($('#audit-spatial'), [
    { label: 'Area', value: row => row.area_name },
    { label: 'Platform', value: row => PLATFORM_LABEL[row.source] || row.source },
    { label: 'Factor', key: 'factor', num: true, fmt: value => `×${fmtNum(value, 3)}` },
    { label: 'MAE raw', key: 'mae_raw', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'MAE calibrated', key: 'mae_adjusted', num: true, render: renderMaeCalibrated },
    { label: 'Result', key: 'status', render: value => statusPill(value) },
  ], meta.spatial, { rowClass: row => row.area_id === 'full' ? 'highlight' : '' });

  renderTable($('#audit-version'), [
    { label: 'Platform', value: row => PLATFORM_LABEL[row.source] || row.source },
    { label: 'Version', key: 'version' },
    { label: 'Period', value: row => `${row.first_month} → ${row.last_month}` },
    { label: 'Months', key: 'overlap_months', num: true },
    { label: 'Factor', key: 'factor', num: true, fmt: value => `×${fmtNum(value, 3)}` },
    { label: 'MAE raw', key: 'mae_raw', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'MAE calibrated', key: 'mae_adjusted', num: true, fmt: value => fmtNum(value, 2) },
    { label: 'Note', key: 'note', fmt: value => String(value).replace(/_/g, ' ') },
  ], meta.by_version);

  renderTable($('#audit-coverage'), [
    { label: 'Platform', value: row => PLATFORM_LABEL[row.platform] || row.platform },
    { label: 'Product', key: 'product' },
    { label: 'Usable start', key: 'usable_start' },
    { label: 'Usable end', key: 'usable_end' },
    { label: 'Complete months', key: 'complete_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Zero months', key: 'zero_count_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Partial', key: 'partial_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Missing', key: 'missing_months', num: true, fmt: value => fmtInt(value) },
    { label: 'Files', key: 'archive_files', num: true, fmt: value => fmtInt(value) },
    { label: 'Status', key: 'status', render: value => statusPill(value) },
  ], meta.coverage);

  renderTable($('#audit-lineage'), [
    { label: 'Archive', key: 'archive' },
    { label: 'Processing', key: 'processing' },
    { label: 'Version', key: 'version' },
    { label: 'Rows in Delta', key: 'rows_in_delta', num: true, fmt: value => fmtInt(value) },
    { label: 'First acquisition', key: 'first_acq_date' },
    { label: 'Last acquisition', key: 'last_acq_date' },
    { label: 'Satellites', key: 'satellite_codes' },
  ], meta.lineage);

  const limitations = $('#audit-limitations');
  limitations.replaceChildren(...(meta.limitations || []).map(text => h('li', { text })));
  $('#audit-totals').textContent = `${fmtInt(meta.totals.files)} annual Egypt CSV files · ${fmtInt(meta.totals.delta_rows)} rows inside the Delta bounding box · ${fmtInt(meta.totals.eligible_rows)} eligible type-0 Standard Processing rows. Processed tables are rebuilt locally; nothing is downloaded at runtime.`;
}

/* --------------------------------------------------------------------- init */

async function init() {
  initCosmosCanvas();
  initSpotlights();
  initRevealObserver();

  try {
    const response = await fetch('/api/meta', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.meta = await response.json();
    FULL = { ...state.meta.bounds };
    GX = state.meta.grid.x.map(Number);
    GY = state.meta.grid.y.map(Number);
    state.custom = { ...FULL };

    applyInitialParams(new URLSearchParams(window.location.search));
    populateControls();
    bindControls();
    updateControls();
    renderAudit();
    initMapInteraction();
    await refresh();
  } catch (error) {
    console.error(error);
    $('#scope-note').textContent = `The local API could not be loaded: ${error.message}. Start the app with "python pipeline/app.py" and reload.`;
    toast('Could not load /api/meta. Is the Python server running?');
  }
}

init();
