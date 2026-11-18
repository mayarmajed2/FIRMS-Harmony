/* about.js: Builds the bilingual (EN / AR) About page inside #about. */

(function () {
  'use strict';

  function buildAbout() {
    const el = document.getElementById('about');
    if (!el) return;

    const isAr = typeof LANG !== 'undefined' && LANG === 'ar';

    el.innerHTML = `
<div class="wrap about-wrap" style="padding-top:clamp(48px,8vw,80px);padding-bottom:70px;max-width:860px;">

  <!-- Page title -->
  <h1 class="page-title">${t('ab_h', 'About Fire Harmony')}</h1>

  <!-- 1. Project Mission -->
  <section style="margin-top:40px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_mission_title', 'Project Mission')}</h2>
    <p style="margin-top:14px;max-width:42em;opacity:.9;line-height:1.7;">
      ${isAr
        ? 'يوفر مشروع تناغم الحرائق (Fire Harmony) رصداً فضائياً شفافاً للحرائق النشطة على امتداد وادي النيل والدلتا في مصر. يقارن المشروع بوضوح بين جيلين من المستشعرات الحرارية — MODIS وVIIRS — كاشفاً أثر التحول التقني عام 2012 بدلاً من إخفائه.'
        : 'Fire Harmony provides transparent satellite fire monitoring along the Nile Valley and Delta, Egypt. It honestly compares two generations of thermal sensors — MODIS and VIIRS — exposing the data discontinuity at 2012 rather than hiding it.'}
    </p>
  </section>

  <!-- 2. Objectives -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_obj_title', 'Core Objectives')}</h2>
    <ol style="margin-top:16px;padding-inline-start:22px;line-height:1.85;max-width:42em;opacity:.88;">
      <li>${isAr ? 'رسم خرائط نشاط الحرائق على امتداد ممر النيل من أسوان حتى البحر المتوسط' : 'Map fire activity across the Nile corridor from Aswan to the Mediterranean'}</li>
      <li>${isAr ? 'مقارنة قدرات الرصد الحراري بين مستشعري MODIS وVIIRS' : 'Compare MODIS and VIIRS detection capabilities'}</li>
      <li>${isAr ? 'توضيح أثر انتقال المستشعر التقني في عام 2012 ومعايرته إحصائياً' : 'Expose and calibrate the sensor transition artifact at 2012'}</li>
      <li>${isAr ? 'تقديم تحليلات موسمية مخصصة لأنماط حرق المخلفات الزراعية في مصر' : 'Provide region-specific analytics for Egypt’s agricultural burning patterns'}</li>
      <li>${isAr ? 'ترسيخ ممارسات علمية شفافة ومسؤولة في عرض بيانات رصد الأرض' : 'Demonstrate responsible, transparent Earth observation data communication'}</li>
    </ol>
  </section>

  <!-- 3. Study Area -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_study_title', 'Study Area Geography')}</h2>
    <div style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;">
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">🌍</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">${isAr ? 'وادي النيل والدلتا' : 'The Nile Valley &amp; Delta'}</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">${isAr ? 'مصر' : 'Egypt'}</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">📍</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">${isAr ? 'أسوان ← المتوسط' : 'Aswan → Mediterranean'}</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">24°N – 31.6°N</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">🗺️</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">${isAr ? '~35,000 كم²' : '~35,000 km²'}</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">${isAr ? 'الممر الزراعي الخصيب' : 'Fertile corridor'}</p>
      </div>
      <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;">
        <span style="font-size:28px;display:block;margin-bottom:4px;">👥</span>
        <b style="color:var(--white);font-family:var(--fd);font-weight:400;font-size:18px;">${isAr ? '+90 مليون نسمة' : '90+ million people'}</b>
        <p style="margin:6px 0 0;font-size:14px;color:var(--smoke);">${isAr ? 'الكثافة السكانية بالممر' : 'Corridor population'}</p>
      </div>
    </div>
  </section>

  <!-- 4. Data Sources -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_sources_title', 'Authoritative Data Sources')}</h2>
    <div style="margin-top:18px;display:grid;gap:12px;">
      <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🛰️</span>
        <span>
          <b style="color:var(--white);display:block;">NASA FIRMS</b>
          <span style="font-size:13px;color:var(--smoke);">firms.modaps.eosdis.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
      <a href="https://modis.gsfc.nasa.gov/" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🔥</span>
        <span>
          <b style="color:var(--white);display:block;">${isAr ? 'منتج MODIS للحرائق النشطة' : 'MODIS Active Fire'}</b>
          <span style="font-size:13px;color:var(--smoke);">modis.gsfc.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
      <a href="https://www.earthdata.nasa.gov/" target="_blank" rel="noopener noreferrer"
         style="display:flex;align-items:center;gap:14px;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:18px 22px;text-decoration:none;color:var(--ash);transition:border-color .2s;">
        <span style="font-size:22px;flex-shrink:0;">🌐</span>
        <span>
          <b style="color:var(--white);display:block;">${isAr ? 'منتج VIIRS للحرائق النشطة' : 'VIIRS Active Fire'}</b>
          <span style="font-size:13px;color:var(--smoke);">earthdata.nasa.gov</span>
        </span>
        <span style="margin-inline-start:auto;color:var(--ember);font-size:18px;">↗</span>
      </a>
    </div>
  </section>

  <!-- 5. Technology Stack -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_tech_title', 'Technology & Design Stack')}</h2>
    <div style="margin-top:18px;display:flex;flex-wrap:wrap;gap:10px;">
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">${isAr ? 'HTML5 / CSS3 / JavaScript قياسية دون تبعيات' : 'Vanilla HTML / CSS / JavaScript'}</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">${isAr ? 'Leaflet.js للخرائط التفاعلية' : 'Leaflet.js for mapping'}</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">${isAr ? 'رسوم SVG أصلية للتحليلات البيانية' : 'SVG for data visualizations'}</span>
      <span style="background:var(--panel);border:1px solid var(--line);border-radius:99px;padding:8px 18px;font-size:14px;color:var(--ash);">${isAr ? 'ثنائي اللغة: العربية (RTL) والإنجليزية (LTR)' : 'Bilingual: English / Arabic with RTL support'}</span>
    </div>
  </section>

  <!-- 6. Acknowledgments -->
  <section style="margin-top:52px;">
    <h2 style="font-size:clamp(24px,3.5vw,34px);">${t('ab_ack_title', 'Acknowledgments')}</h2>
    <p style="margin-top:14px;opacity:.85;line-height:1.7;">
      ${isAr
        ? 'يعتمد هذا المشروع بامتنان على البيانات والخدمات المفتوحة من <b style="color:var(--white);">NASA FIRMS</b> و<b style="color:var(--white);">مرصد الأرض التابع لناسا</b> و<b style="color:var(--white);">OpenStreetMap</b> و<b style="color:var(--white);">CARTO</b>.'
        : 'This project gratefully relies on data and services from <b style="color:var(--white);">NASA FIRMS</b>, <b style="color:var(--white);">NASA Earth Observatory</b>, <b style="color:var(--white);">OpenStreetMap</b>, and <b style="color:var(--white);">CARTO</b>.'}
    </p>
  </section>

</div>`;
  }

  window.renderAbout = buildAbout;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildAbout);
  } else {
    buildAbout();
  }

  document.addEventListener('langchange', buildAbout);
})();
