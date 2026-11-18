/* map.js: Leaflet map limited to the Nile corridor, filters, detection details,
   time-lapse animation, CSV export, Nile river overlay, statistics bar, and
   enhanced info panel. */

/* ── Colour ramp & thermal scale ── */
const RAMP = ['#3b1d7a', '#a3237e', '#e0432b', '#f08a3c', '#ffd36a', '#fff3c4'];
const heat = frp => RAMP[Math.min(5, Math.floor(Math.sqrt(Math.max(0, frp) / 60) * 6))];

let map, layer, selected = null;
let currentFiltered = [];
let tlTimer = null;
let tlPlaying = false;
let tlYear = 2000;

/* ══════════════════════════════════════════════════════════════════════════
   1. UI INJECTION & DOM SETUP
   ══════════════════════════════════════════════════════════════════════════ */

function setupMapUI() {
  // Stats bar inside .mapbox above mapCanvas
  const mapbox = document.querySelector('.mapbox');
  if (mapbox && !$('statsBar')) {
    const bar = document.createElement('div');
    bar.id = 'statsBar';
    bar.className = 'stats-bar';
    bar.setAttribute('role', 'status');
    bar.setAttribute('aria-live', 'polite');
    mapbox.insertBefore(bar, mapbox.firstChild);
  }

  // Time-lapse controls in filter panel
  const panel = document.querySelector('.mapgrid > aside.panel');
  if (panel) {
    if (!$('timeCtrl')) {
      const wrap = document.createElement('div');
      wrap.id = 'timeCtrl';
      wrap.className = 'time-ctrl';

      const btn = document.createElement('button');
      btn.id = 'tlPlay';
      btn.type = 'button';
      btn.className = 'btn-ctrl';
      btn.textContent = t('play', '▶ Play');
      btn.setAttribute('aria-label', 'Play time-lapse animation');
      btn.addEventListener('click', () => {
        if (tlPlaying) tlStop(); else tlStart();
      });

      const yearLabel = document.createElement('span');
      yearLabel.id = 'tlYear';
      yearLabel.className = 'tl-year';

      wrap.appendChild(btn);
      wrap.appendChild(yearLabel);
      panel.appendChild(wrap);
    }

    // CSV Export button in filter panel
    if (!$('csvBtn')) {
      const csvBtn = document.createElement('button');
      csvBtn.id = 'csvBtn';
      csvBtn.type = 'button';
      csvBtn.className = 'btn-csv';
      csvBtn.textContent = t('download_csv', '⬇ Export Filtered CSV');
      csvBtn.setAttribute('aria-label', 'Export filtered detections as CSV');
      csvBtn.addEventListener('click', exportCSV);
      panel.appendChild(csvBtn);
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupMapUI);
} else {
  setupMapUI();
}

/* ══════════════════════════════════════════════════════════════════════════
   2. MAP INITIALISATION
   ══════════════════════════════════════════════════════════════════════════ */

function initMap() {
  if (map) return;
  setupMapUI();

  if (typeof L === 'undefined') {
    const canvas = $('mapCanvas');
    if (canvas) canvas.textContent = t('map_err');
    return;
  }

  map = L.map('mapCanvas', { minZoom: 5, maxZoom: 13 });

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    subdomains: 'abcd',
    attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
  }).addTo(map);

  /* Study area polygon boundary */
  const area = L.polygon(BOUNDARY, {
    color: '#3cc9b6',
    weight: 1.5,
    dashArray: '6 6',
    fillOpacity: 0.05,
    interactive: false
  }).addTo(map);

  map.getContainer().setAttribute('role', 'region');
  setMapLabel();
  map.fitBounds(area.getBounds());
  map.setMaxBounds(area.getBounds().pad(0.3));

  /* Nile River & Delta main branches */
  const nileStyle = { color: '#2fb3a3', weight: 2, opacity: 0.55, interactive: false };
  L.polyline(NILE_LINE, nileStyle).addTo(map);
  DELTA_LINES.forEach(line => L.polyline(line, nileStyle).addTo(map));

  layer = L.layerGroup().addTo(map);

  render();
}

function setMapLabel() {
  if (map) map.getContainer().setAttribute('aria-label', t('map_label'));
}

/* ══════════════════════════════════════════════════════════════════════════
   3. MARKERS & SELECTION
   ══════════════════════════════════════════════════════════════════════════ */

function markerFor(d) {
  const modis = d.sensor === 'MODIS';
  const icon = L.divIcon({
    className: '',
    iconSize: modis ? [12, 12] : [9, 9],
    html: `<i class="mk ${modis ? 'mk-m' : 'mk-v'}" style="--c:${heat(d.frp)}"></i>`
  });
  const title = t('marker_title')
    .replace('{s}', d.sensor)
    .replace('{d}', d.date)
    .replace('{f}', d.frp);

  return L.marker([d.lat, d.lon], { icon, title, alt: title, keyboard: true })
    .on('click', () => { selected = d; renderInfo(); });
}

function renderInfo() {
  const d = selected;
  const infoEl = $('info');
  if (!infoEl) return;

  if (!d) {
    infoEl.innerHTML = `<span class="hint">${t('hint')}</span>`;
    return;
  }

  /* Nearby detections within ~0.1° ≈ 11 km */
  const nearby = currentFiltered.filter(o =>
    o.id !== d.id &&
    Math.abs(o.lat - d.lat) < 0.1 &&
    Math.abs(o.lon - d.lon) < 0.1
  ).length;

  const sensorColor = d.sensor === 'MODIS' ? '#f08a3c' : '#e0432b';
  const sensorSymbol = d.sensor === 'MODIS' ? '■' : '●';

  const nearbyText = LANG === 'ar'
    ? `🔎 ${nearby} رصدة مجاورة ضمن نطاق ~11 كم`
    : `🔎 ${nearby} nearby detection${nearby !== 1 ? 's' : ''} within ~11 km`;

  infoEl.innerHTML = `
    <b><span style="color:${sensorColor}">${sensorSymbol}</span> ${t('d_det').replace('{s}', d.sensor)}</b><br>
    ${t('d_date')}: <b>${d.date}</b><br>
    ${t('d_pos')}: <b>${d.lat}°N, ${d.lon}°E</b><br>
    ${t('d_frp')}: <span style="color:${heat(d.frp)};font-weight:700;">${d.frp} MW</span><br>
    <span style="font-size:12px;color:var(--smoke);display:inline-block;margin-top:4px;">${nearbyText}</span><br>
    <span class="note">${t('d_rec')}${d.id}</span>
  `;
}

/* ══════════════════════════════════════════════════════════════════════════
   4. FILTERING & RENDERING
   ══════════════════════════════════════════════════════════════════════════ */

function getFilteredData() {
  if (typeof DATA === 'undefined' || !Array.isArray(DATA)) return [];
  const y0 = $('y0'), y1 = $('y1'), frp = $('frp'), fM = $('fM'), fV = $('fV');
  if (!y0 || !y1 || !frp) return DATA;

  const a = Math.min(+y0.value, +y1.value);
  const b = Math.max(+y0.value, +y1.value);
  const minFrp = +frp.value;
  const showM = fM ? fM.checked : true;
  const showV = fV ? fV.checked : true;

  return DATA.filter(d =>
    ((d.sensor === 'MODIS' && showM) || (d.sensor === 'VIIRS' && showV)) &&
    d.year >= a && d.year <= b && d.frp >= minFrp
  );
}

function render() {
  const list = getFilteredData();
  currentFiltered = list;

  if ($('frpv') && $('frp')) {
    $('frpv').textContent = $('frp').value + ' MW';
  }
  if ($('count')) {
    $('count').textContent = t('shown').replace('{n}', list.length);
  }

  updateStats(list);

  if (!map || !layer) return;

  layer.clearLayers();
  list.forEach(d => markerFor(d).addTo(layer));
}

function updateStats(list) {
  const bar = $('statsBar');
  if (!bar) return;

  const total = list.length;
  const avgFRP = total > 0
    ? (list.reduce((s, d) => s + d.frp, 0) / total).toFixed(1)
    : '0.0';

  const modisN = list.filter(d => d.sensor === 'MODIS').length;
  const viirsN = list.filter(d => d.sensor === 'VIIRS').length;

  bar.innerHTML = `
    <span><b>${total}</b> ${t('stats_dets', 'detections')}</span>
    <span>${t('stats_avg_frp', 'Avg FRP')}: <b>${avgFRP}</b> MW</span>
    <span style="color:#f08a3c">■ MODIS: <b>${modisN}</b></span>
    <span style="color:#e0432b">● VIIRS: <b>${viirsN}</b></span>
  `;
}

/* ══════════════════════════════════════════════════════════════════════════
   5. TIME-LAPSE ANIMATION
   ══════════════════════════════════════════════════════════════════════════ */

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function tlTick() {
  const a = Math.min(+$('y0').value, +$('y1').value);
  const b = Math.max(+$('y0').value, +$('y1').value);

  if (tlYear > b) tlYear = a;

  const yearEl = $('tlYear');
  if (yearEl) yearEl.textContent = tlYear;

  const minFrp = +$('frp').value;
  const showM = $('fM').checked;
  const showV = $('fV').checked;

  const list = DATA.filter(d =>
    ((d.sensor === 'MODIS' && showM) || (d.sensor === 'VIIRS' && showV)) &&
    d.year === tlYear && d.frp >= minFrp
  );

  currentFiltered = list;
  if ($('count')) {
    $('count').textContent = t('shown').replace('{n}', list.length) + ` (${tlYear})`;
  }

  if (map && layer) {
    layer.clearLayers();
    list.forEach(d => markerFor(d).addTo(layer));
  }

  updateStats(list);
  tlYear++;
}

function tlStart() {
  if (prefersReducedMotion()) return;
  tlPlaying = true;
  const btn = $('tlPlay');
  if (btn) {
    btn.textContent = t('pause', '⏸ Pause');
    btn.setAttribute('aria-label', 'Pause time-lapse animation');
  }
  tlYear = Math.min(+$('y0').value, +$('y1').value);
  tlTick();
  tlTimer = setInterval(tlTick, 1300);
}

function tlStop() {
  tlPlaying = false;
  if (tlTimer) {
    clearInterval(tlTimer);
    tlTimer = null;
  }
  const btn = $('tlPlay');
  if (btn) {
    btn.textContent = t('play', '▶ Play');
    btn.setAttribute('aria-label', 'Play time-lapse animation');
  }
  const yearEl = $('tlYear');
  if (yearEl) yearEl.textContent = '';
  render();
}

/* ══════════════════════════════════════════════════════════════════════════
   6. CSV DATA EXPORT
   ══════════════════════════════════════════════════════════════════════════ */

function exportCSV() {
  const rows = [['id', 'sensor', 'latitude', 'longitude', 'date', 'year', 'frp_mw']];
  currentFiltered.forEach(d => {
    rows.push([d.id, d.sensor, d.lat, d.lon, d.date, d.year, d.frp]);
  });
  const csvContent = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `fire_harmony_nile_detections_${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════════════════════
   7. INITIALIZATION & LISTENERS
   ══════════════════════════════════════════════════════════════════════════ */

function initFilters() {
  const y0 = $('y0'), y1 = $('y1');
  if (y0 && y1 && y0.options.length === 0) {
    for (let y = 2001; y <= 2024; y++) {
      y0.add(new Option(y, y));
      y1.add(new Option(y, y));
    }
    y0.value = 2001;
    y1.value = 2024;
  }

  ['fM', 'fV', 'y0', 'y1', 'frp'].forEach(id => {
    const el = $(id);
    if (el) {
      el.addEventListener('input', () => {
        if (tlPlaying) tlStop();
        render();
      });
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFilters);
} else {
  initFilters();
}

document.addEventListener('langchange', () => {
  const btn = $('tlPlay');
  if (btn) btn.textContent = tlPlaying ? t('pause', '⏸ Pause') : t('play', '▶ Play');
  const csvBtn = $('csvBtn');
  if (csvBtn) csvBtn.textContent = t('download_csv', '⬇ Export Filtered CSV');
  render();
  renderInfo();
  setMapLabel();
});

document.addEventListener('dataupdated', () => {
  render();
  renderInfo();
});
