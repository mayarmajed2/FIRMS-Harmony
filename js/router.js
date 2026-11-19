/* router.js: hash-based page switching (#home, #map, ...) and start-up. */

const TITLE_KEYS = { home: 'nav_home', map: 'nav_map', analytics: 'nav_analytics', sensors: 'nav_sensors', methodology: 'nav_method', about: 'nav_about' };
let currentPage = 'home';

function updateTitle() {
  document.title = (currentPage === 'home' ? '' : t(TITLE_KEYS[currentPage]) + ' · ') + 'FIRE HARMONY';
}

function route() {
  const hash = (location.hash || '#home').slice(1);
  const el = document.getElementById(hash);
  const id = el && el.classList.contains('page') ? hash : 'home';
  currentPage = id;
  document.body.dataset.page = id;
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('on', p.id === id));
  document.querySelectorAll('#nav a').forEach(a => {
    const on = a.getAttribute('href') === '#' + id;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  updateTitle();
  scrollTo({ top: 0, behavior: 'instant' });
  if (id === 'home') count();
  if (id === 'map') { initMap(); if (map) map.invalidateSize(); }
}

$('lang').addEventListener('click', () => applyLang(LANG === 'en' ? 'ar' : 'en'));
addEventListener('hashchange', () => { route(); $('main').focus({ preventScroll: true }); });
document.addEventListener('langchange', updateTitle);
$('skip').addEventListener('click', e => { e.preventDefault(); $('main').focus(); });

let saved = 'en';
try { saved = localStorage.getItem('fh-lang') || 'en'; } catch (e) {}
applyLang(saved);
route();
