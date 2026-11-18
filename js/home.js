/* home.js: dynamic animated statistics on the home page computed from DATA. */

function getHomeStats() {
  const hasData = typeof DATA !== 'undefined' && Array.isArray(DATA) && DATA.length > 0;
  const total = hasData ? DATA.length : 0;
  let medFrp = 0;
  let yearsCount = 0;
  let sensorsCount = 0;

  if (hasData) {
    const frps = DATA.map(d => d.frp).sort((a, b) => a - b);
    const mid = Math.floor(frps.length / 2);
    medFrp = frps.length % 2 ? frps[mid] : (frps[mid - 1] + frps[mid]) / 2;

    let minY = Infinity, maxY = -Infinity;
    const sensors = new Set();
    for (let i = 0; i < DATA.length; i++) {
      const y = DATA[i].year;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (DATA[i].sensor) sensors.add(DATA[i].sensor);
    }
    yearsCount = Number.isFinite(minY) && Number.isFinite(maxY) ? (maxY - minY + 1) : 0;
    sensorsCount = sensors.size;
  }

  return [
    ['st_det', total, 0],
    ['st_frp', +medFrp.toFixed(1), 1],
    ['st_days', yearsCount, 0],
    ['st_sens', sensorsCount, 0]
  ];
}

const statsEl = $('stats');

function renderStatsElements() {
  if (!statsEl) return;
  const stats = getHomeStats();
  statsEl.innerHTML = stats.map(([key, v, d]) =>
    `<div><b data-v="${v}" data-d="${d}">${v.toFixed(d)}</b><span>${t(key)}</span></div>`).join('');
}

function count() {
  if (!statsEl) return;
  statsEl.querySelectorAll('b').forEach(b => {
    const v = +b.dataset.v, d = +b.dataset.d;
    if (matchMedia('(prefers-reduced-motion:reduce)').matches) {
      b.textContent = v.toFixed(d);
      return;
    }
    let t0;
    const step = now => {
      t0 ??= now;
      const p = Math.min((now - t0) / 1200, 1);
      b.textContent = (v * (1 - Math.pow(1 - p, 3))).toFixed(d);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}

renderStatsElements();

document.addEventListener('langchange', () => {
  renderStatsElements();
  count();
});

document.addEventListener('dataupdated', () => {
  renderStatsElements();
  count();
});
