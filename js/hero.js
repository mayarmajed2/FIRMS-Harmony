/* hero.js: the animated abstract Nile illustration on the home page.
   Coordinates are on an abstract 400x720 canvas; the points are DEMO detections, not observations. */

const HERO_NILE = 'M232 690 C228 640 214 600 214 560 C210 530 204 520 206 500 C214 470 244 470 246 436 C246 404 224 396 222 372 C220 344 198 346 198 318 C198 290 190 286 190 258 C190 230 182 220 184 196 C184 176 180 166 180 150';
const HERO_DELTA = ['M180 150 C160 128 146 108 118 62', 'M180 150 C200 126 236 108 276 52', 'M180 150 C176 120 176 90 178 54'];
const HERO_PATHS = [HERO_NILE, ...HERO_DELTA];
const HERO_POINTS = [[226, 640, 'M'], [214, 560, 'V'], [205, 520, 'M'], [238, 462, 'V'], [246, 430, 'V'], [222, 380, 'M'],
  [198, 330, 'V'], [204, 300, 'V'], [190, 262, 'M'], [184, 230, 'V'], [196, 196, 'V'], [178, 150, 'M'], [150, 112, 'V'],
  [132, 86, 'V'], [222, 106, 'M'], [258, 84, 'V'], [238, 126, 'V'], [170, 128, 'V'], [212, 170, 'V']];

function heroLayers() {
  const grid = [100, 200, 300, 400, 500, 600].map(y => `<line x1="0" x2="400" y1="${y}" y2="${y}" stroke="#c9d1c3" stroke-opacity=".05"/>`).join('');
  const valley = HERO_PATHS.map((d, i) => `<path d="${d}" stroke="url(#hv)" stroke-width="${i ? 30 : 46}"/>`).join('');
  const banks = HERO_PATHS.map(d => `<path d="${d}" stroke="#8de3d3" stroke-width="1.5"/>`).join('');
  return `<defs>
    <linearGradient id="hv" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1f7a78" stop-opacity=".5"/><stop offset="1" stop-color="#0f3a3a" stop-opacity=".12"/></linearGradient>
    <linearGradient id="hb" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--ember)" stop-opacity="0"/><stop offset="1" style="stop-color:var(--ember)" stop-opacity=".35"/></linearGradient>
    <filter id="hg"><feGaussianBlur stdDeviation="3"/></filter></defs>
    ${grid}
    <g fill="none" stroke-linecap="round">${valley}<path d="${HERO_NILE}" stroke="#2fb3a3" stroke-width="3" filter="url(#hg)" opacity=".6"/>${banks}</g>`;
}

function heroPoints() {
  return HERO_POINTS.map(([x, y, s], i) => s === 'V'
    ? `<circle cx="${x}" cy="${y}" r="2" fill="none" stroke="#d8402a" class="ping" style="animation-delay:${(i % 7) * .4}s"/><circle cx="${x}" cy="${y}" r="3" fill="#d8402a"/>`
    : `<rect x="${x - 6}" y="${y - 6}" width="12" height="12" fill="#f08a3c" fill-opacity=".25" stroke="#f08a3c"/>`).join('');
}

function drawHero() {
  const label = (x, y, key, anchor = 'start') => `<text x="${x}" y="${y}" fill="#8a9386" font-size="11" text-anchor="${anchor}">${t(key)}</text>`;
  $('heroSvg').innerHTML = `<svg viewBox="0 0 400 720" role="img" aria-label="${t('hero_aria')}">
    ${heroLayers()}
    ${label(250, 48, 'hero_delta')}${label(250, 664, 'hero_aswan')}${label(130, 168, 'hero_cairo')}
    <path d="${HERO_NILE}" fill="none" stroke="#e6fffa" stroke-width="2" class="flow"/>
    <g class="scan"><rect x="0" y="-20" width="400" height="20" fill="url(#hb)"/></g>
    ${heroPoints()}
    <rect x="12" y="696" width="10" height="10" fill="#f08a3c" fill-opacity=".25" stroke="#f08a3c"/>${label(28, 705, 'hero_modis')}
    <circle cx="150" cy="701" r="4" fill="#d8402a"/>${label(160, 705, 'hero_viirs')}
    ${label(396, 705, 'hero_demo', 'end')}</svg>`;
}

drawHero();
document.addEventListener('langchange', drawHero);
