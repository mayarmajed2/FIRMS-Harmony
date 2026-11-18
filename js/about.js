/* about.js: Builds the full About page inside #about. */

(function () {
  'use strict';

  function buildAbout() {
    var el = document.getElementById('about');
    if (!el) return;

    el.innerHTML = `
<div class="wrap about-wrap" style="padding-top:clamp(48px,8vw,80px);padding-bottom:70px;max-width:860px;">

  <!-- Page title -->
  <h1 class="page-title">About Fire Harmony</h1>

  <!-- 1. Project Mission -->
  <section style="margin-top:40px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Project Mission</h2>
    <p style="margin-top:14px;max-width:42em;opacity:.9;line-height:1.7;">
      Fire Harmony provides transparent satellite fire monitoring along the Nile Valley and Delta, Egypt.
      It honestly compares two generations of thermal sensors — MODIS and VIIRS — exposing the data
      discontinuity at 2012 rather than hiding it.
    </p>
  </section>

  <!-- 2. Objectives -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Objectives</h2>
    <ol style="margin-top:16px;padding-inline-start:22px;line-height:1.85;max-width:42em;opacity:.88;">
      <li>Map fire activity across the Nile corridor from Aswan to the Mediterranean</li>
      <li>Compare MODIS and VIIRS detection capabilities</li>
      <li>Expose the sensor transition artifact at 2012</li>
      <li>Provide region-specific analytics for Egypt's agricultural burning patterns</li>
      <li>Demonstrate responsible data communication practices</li>
    </ol>
  </section>

  <!-- 3. Study Area -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Study Area</h2>
    <div style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">🌍</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">The Nile Valley &amp; Delta</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">Egypt</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">📍</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">Aswan → Mediterranean</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">24°N to 31.6°N</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">🗺️</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">~35,000 km²</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">Fertile corridor</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">👥</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">90+ million people</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">Home population</p>
      </div>
    </div>
  </section>

  <!-- 4. Data Sources -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Data Sources</h2>
    <div style="margin-top:18px;display:grid;gap:12px;">
      <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🛰️</span>
        <span>
          <b style="color:var(--white);display:block;">NASA FIRMS</b>
          <span style="font-size:13px;color:var(--smoke);">firms.modaps.eosdis.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
      <a href="https://modis.gsfc.nasa.gov/" target="_blank" rel="noopener"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🔥</span>
        <span>
          <b style="color:var(--white);display:block;">MODIS Active Fire</b>
          <span style="font-size:13px;color:var(--smoke);">modis.gsfc.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
      <a href="https://www.earthdata.nasa.gov/" target="_blank" rel="noopener"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🌐</span>
        <span>
          <b style="color:var(--white);display:block;">VIIRS Active Fire</b>
          <span style="font-size:13px;color:var(--smoke);">earthdata.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
    </div>
  </section>

  <!-- 5. Technology Stack -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Technology Stack</h2>
    <div style="margin-top:18px;display:flex;flex-wrap:wrap;gap:10px;">
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">Vanilla HTML / CSS / JavaScript</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">Leaflet.js for mapping</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">SVG for data visualizations</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">Bilingual: English / Arabic with RTL support</span>
    </div>
  </section>

  <!-- 6. Acknowledgments -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">Acknowledgments</h2>
    <p style="margin-top:14px;opacity:.85;line-height:1.7;">
      This project gratefully relies on data and services from
      <b style="color:var(--white);">NASA FIRMS</b>,
      <b style="color:var(--white);">NASA Earth Observatory</b>,
      <b style="color:var(--white);">OpenStreetMap</b>, and
      <b style="color:var(--white);">CARTO</b>.
    </p>
  </section>

  <!-- 7. Open Source Notice -->
  <section style="margin-top:52px;padding-top:28px;border-top:1px solid var(--line);">
    <p style="font-size:clamp(15px,2vw,17px);color:var(--smoke);text-align:center;">
      🚀 Built for the <b style="color:var(--ember);">NASA Space Apps Challenge</b>.
    </p>
  </section>

</div>`;
  }

  /* Build on first load */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildAbout);
  } else {
    buildAbout();
  }

  /* Rebuild when the router shows the About page (supports SPA navigation) */
  window.addEventListener('hashchange', buildAbout);
})();
