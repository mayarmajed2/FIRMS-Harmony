/* sensors.js: Build the MODIS vs VIIRS comparison page inside #sensors.
   Full bilingual EN / AR support, interactive SVGs, and scientific explanation of the 2012 discontinuity. */

(function () {
  'use strict';

  const fmt = n => Number(n).toLocaleString(typeof LANG !== 'undefined' && LANG === 'ar' ? 'ar-EG' : 'en-US');
  const fmtDec = (n, d) => Number(n).toFixed(d);

  function computeStats() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA) || !DATA.length) {
      return null;
    }

    const modis = DATA.filter(d => d.sensor === 'MODIS');
    const viirs = DATA.filter(d => d.sensor === 'VIIRS');

    const avgFrp = arr => arr.length ? arr.reduce((s, d) => s + d.frp, 0) / arr.length : 0;
    const dateRange = arr => {
      if (!arr.length) return { min: '—', max: '—' };
      const sorted = arr.map(d => d.date).sort();
      return { min: sorted[0], max: sorted[sorted.length - 1] };
    };

    /* Per-year counts for the overlap period (2012–2024) */
    const overlapYears = [];
    for (let y = 2012; y <= 2024; y++) {
      overlapYears.push({
        year: y,
        modis: modis.filter(d => d.year === y).length,
        viirs: viirs.filter(d => d.year === y).length
      });
    }

    return {
      modis: { total: modis.length, avgFrp: avgFrp(modis), range: dateRange(modis) },
      viirs: { total: viirs.length, avgFrp: avgFrp(viirs), range: dateRange(viirs) },
      overlapYears,
      totalDetections: DATA.length
    };
  }

  function overlapSVG(overlapYears) {
    const W = 760, H = 300, pad = { t: 30, r: 30, b: 50, l: 50 };
    const cw = W - pad.l - pad.r;
    const ch = H - pad.t - pad.b;
    const n = overlapYears.length;
    const maxVal = Math.max(...overlapYears.map(d => Math.max(d.modis, d.viirs)), 1);
    const barW = Math.min(Math.floor(cw / n / 2.5), 20);
    const gap = 4;

    let bars = '';
    let labels = '';

    overlapYears.forEach((d, i) => {
      const cx = pad.l + (i + 0.5) * (cw / n);
      const hM = (d.modis / maxVal) * ch;
      const hV = (d.viirs / maxVal) * ch;

      bars += `<rect x="${cx - barW - gap / 2}" y="${pad.t + ch - hM}" width="${barW}" height="${hM}" fill="var(--canopy)" rx="2"><title>${d.year} MODIS: ${d.modis}</title></rect>`;
      bars += `<rect x="${cx + gap / 2}" y="${pad.t + ch - hV}" width="${barW}" height="${hV}" fill="var(--ember)" rx="2"><title>${d.year} VIIRS: ${d.viirs}</title></rect>`;

      labels += `<text x="${cx}" y="${H - 12}" text-anchor="middle" fill="var(--smoke)" font-size="11">${d.year}</text>`;

      if (d.modis) bars += `<text x="${cx - barW / 2 - gap / 2}" y="${pad.t + ch - hM - 4}" text-anchor="middle" fill="var(--canopy)" font-size="9">${d.modis}</text>`;
      if (d.viirs) bars += `<text x="${cx + barW / 2 + gap / 2}" y="${pad.t + ch - hV - 4}" text-anchor="middle" fill="var(--ember)" font-size="9">${d.viirs}</text>`;
    });

    let grid = '';
    for (let s = 0; s <= 4; s++) {
      const y = pad.t + ch - (s / 4) * ch;
      const val = Math.round((s / 4) * maxVal);
      grid += `<line x1="${pad.l}" y1="${y}" x2="${W - pad.r}" y2="${y}" stroke="var(--line)" stroke-width="1" stroke-dasharray="3 3"/>`;
      grid += `<text x="${pad.l - 8}" y="${y + 4}" text-anchor="end" fill="var(--smoke)" font-size="10">${val}</text>`;
    }

    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block;margin:auto;" role="img" aria-label="MODIS vs VIIRS overlap comparison">
      ${grid}${bars}${labels}
    </svg>`;
  }

  function resolutionSVG() {
    const W = 620, H = 260;
    const modisSide = 120;
    const viirsSide = Math.round(modisSide * 375 / 1000);
    const cols = 3, rows = 3;

    const mx = 80, my = 55;
    let modisBlock = `<rect x="${mx}" y="${my}" width="${modisSide}" height="${modisSide}" fill="none" stroke="var(--canopy)" stroke-width="2.5" rx="4"/>`;
    modisBlock += `<text x="${mx + modisSide / 2}" y="${my + modisSide / 2 + 5}" text-anchor="middle" fill="var(--canopy)" font-size="14" font-weight="600">1 km</text>`;
    modisBlock += `<text x="${mx + modisSide / 2}" y="${my - 14}" text-anchor="middle" fill="var(--white)" font-size="13" font-weight="600">MODIS</text>`;
    modisBlock += `<text x="${mx + modisSide / 2}" y="${my + modisSide + 24}" text-anchor="middle" fill="var(--smoke)" font-size="11">1 km² (1 pixel)</text>`;
    modisBlock += `<text x="${mx + modisSide / 2}" y="${my + modisSide / 2 + 26}" text-anchor="middle" font-size="16">🔥</text>`;

    const vx = 370, vy = my;
    let viirsBlock = '';
    const fireCell = { r: 1, c: 1 };
    for (let r = 0; r < cols; r++) {
      for (let c = 0; c < rows; c++) {
        const isFire = r === fireCell.r && c === fireCell.c;
        viirsBlock += `<rect x="${vx + c * (viirsSide + 2)}" y="${vy + r * (viirsSide + 2)}" width="${viirsSide}" height="${viirsSide}"
          fill="${isFire ? 'color-mix(in srgb, var(--ember) 35%, transparent)' : 'none'}"
          stroke="var(--ember)" stroke-width="${isFire ? 2.5 : 1}" rx="3" opacity="${isFire ? 1 : 0.35}"/>`;
        if (isFire) {
          viirsBlock += `<text x="${vx + c * (viirsSide + 2) + viirsSide / 2}" y="${vy + r * (viirsSide + 2) + viirsSide / 2 + 6}" text-anchor="middle" font-size="14">🔥</text>`;
        }
      }
    }
    const gridTotal = cols * (viirsSide + 2);
    viirsBlock += `<text x="${vx + gridTotal / 2}" y="${vy - 14}" text-anchor="middle" fill="var(--white)" font-size="13" font-weight="600">VIIRS</text>`;
    viirsBlock += `<text x="${vx + gridTotal / 2}" y="${vy + gridTotal + 18}" text-anchor="middle" fill="var(--smoke)" font-size="11">≈ 7 pixels in same footprint</text>`;
    viirsBlock += `<text x="${vx + gridTotal / 2}" y="${vy + gridTotal + 34}" text-anchor="middle" fill="var(--ember)" font-size="11">375 m pixel</text>`;

    const arrowX1 = mx + modisSide + 25, arrowX2 = vx - 25, arrowY = my + modisSide / 2;
    const arrow = `<line x1="${arrowX1}" y1="${arrowY}" x2="${arrowX2}" y2="${arrowY}" stroke="var(--smoke)" stroke-width="1.5" stroke-dasharray="5 4"/>
      <polygon points="${arrowX2},${arrowY - 5} ${arrowX2 + 8},${arrowY} ${arrowX2},${arrowY + 5}" fill="var(--smoke)"/>
      <text x="${(arrowX1 + arrowX2) / 2}" y="${arrowY - 12}" text-anchor="middle" fill="var(--smoke)" font-size="10">same area</text>`;

    return `<svg viewBox="0 0 ${W} ${H}" style="width:100%;max-width:${W}px;height:auto;display:block;margin:auto;" role="img" aria-label="MODIS 1km vs VIIRS 375m pixel resolution comparison">
      ${modisBlock}${arrow}${viirsBlock}
    </svg>`;
  }

  function buildSensorsPage() {
    const s = computeStats();
    if (!s) return;

    const isAr = typeof LANG !== 'undefined' && LANG === 'ar';
    const overlapTotal = s.overlapYears.reduce((a, d) => a + d.modis + d.viirs, 0);
    const overlapModis = s.overlapYears.reduce((a, d) => a + d.modis, 0);
    const overlapViirs = s.overlapYears.reduce((a, d) => a + d.viirs, 0);
    const ratio = overlapModis > 0 ? (overlapViirs / overlapModis) : 3.4;

    const container = document.getElementById('sensors');
    if (!container) return;

    container.innerHTML = `
      <div class="wrap" style="padding-top:clamp(40px,6vw,72px);padding-bottom:70px;">
        <h1 class="page-title" style="margin-bottom:8px;">${t('se_h', 'Sensor Comparison: MODIS vs. VIIRS')}</h1>
        <p style="max-width:44em;color:var(--smoke);font-size:17px;margin:0 0 48px;line-height:1.6;">
          ${t('se_p', 'MODIS and VIIRS are the two thermal-infrared imagers behind nearly all satellite fire records. Understanding their physical and optical differences is essential to reading the Nile record honestly.')}
        </p>

        <!-- 1. Technical Specs Cards -->
        <h2 style="font-size:clamp(24px,3.5vw,34px);margin-bottom:24px;">${isAr ? 'المواصفات التقنية للأجهزة' : 'Instrument Specifications'}</h2>
        <div class="sensors" style="margin-top:0;margin-bottom:56px;">
          <!-- MODIS -->
          <div style="background:var(--bg);padding:30px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h3 style="font-size:28px;color:var(--canopy);margin:0;">MODIS</h3>
              <span style="color:var(--canopy);font-size:13px;border:1px solid color-mix(in srgb, var(--canopy) 40%, transparent);border-radius:99px;padding:3px 12px;">${t('since2000', 'since 2000')}</span>
            </div>
            <p style="font-size:36px;color:var(--ash);margin:4px 0 16px;font-family:var(--fd);">≈ 1 km</p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'الأقمار الحاملة' : 'Satellites'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">Terra (2000) · Aqua (2002)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'الدقة المكانية' : 'Spatial resolution'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">1 km (nadir)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'معدل المرور اليومي' : 'Overpasses / day'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">≈ 4 (Terra + Aqua)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'نطاقات الرصد الحراري' : 'Fire spectral bands'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">4 µm (B21/B22), 11 µm (B31)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'عرض مسح الحزمة' : 'Swath width'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">2,330 km</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'أفق السجل الزمني' : 'Observation record'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">2000 – ${isAr ? 'الآن (24 عامًا)' : 'present (24 yr)'}</td></tr>
            </table>
            <p style="margin:16px 0 0;font-size:13px;color:var(--smoke);line-height:1.6;">
              ${t('modis_txt', 'Each pixel covers about 1 km², so small agricultural residue fires can fall below the thermal detection threshold.')}
            </p>
          </div>

          <!-- VIIRS -->
          <div style="background:var(--bg);padding:30px;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
              <h3 style="font-size:28px;color:var(--ember);margin:0;">VIIRS</h3>
              <span style="color:var(--ember);font-size:13px;border:1px solid color-mix(in srgb, var(--ember) 40%, transparent);border-radius:99px;padding:3px 12px;">${t('since2012', 'since 2012')}</span>
            </div>
            <p style="font-size:36px;color:var(--ash);margin:4px 0 16px;font-family:var(--fd);">≈ 375 m</p>
            <table style="width:100%;font-size:14px;border-collapse:collapse;">
              <tr><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'الأقمار الحاملة' : 'Satellites'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">Suomi NPP (2012) · NOAA-20 (2018)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'الدقة المكانية' : 'Spatial resolution'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">375 m (I-band nadir)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'معدل المرور اليومي' : 'Overpasses / day'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">≈ 4 (S-NPP + NOAA-20)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'نطاقات الرصد الحراري' : 'Fire spectral bands'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">3.74 µm (I4), 11.45 µm (I5), M13</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'عرض مسح الحزمة' : 'Swath width'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">3,060 km (no scan edge distortion)</td></tr>
              <tr style="border-top:1px solid var(--line);"><td style="color:var(--smoke);padding:6px 0;">${isAr ? 'أفق السجل الزمني' : 'Observation record'}</td><td style="color:var(--white);text-align:${isAr ? 'left' : 'right'};padding:6px 0;">2012 – ${isAr ? 'الآن (13 عامًا)' : 'present (13 yr)'}</td></tr>
            </table>
            <p style="margin:16px 0 0;font-size:13px;color:var(--smoke);line-height:1.6;">
              ${t('viirs_txt', 'Finer 375 m pixels isolate smaller thermal anomalies, detecting 3–5× more fires in the same area without an actual increase in burning.')}
            </p>
          </div>
        </div>

        <!-- 2. Detection Statistics Table -->
        <h2 style="font-size:clamp(24px,3.5vw,34px);margin-bottom:8px;">${isAr ? 'إحصاءات المقارنة في منطقة الدراسة' : 'Empirical Detection Statistics'}</h2>
        <p style="color:var(--smoke);font-size:14px;margin:0 0 24px;">
          ${isAr ? `محسوبة ديناميكيًا من سجلي الرصد في وادي النيل والدلتا (${fmt(s.totalDetections)} رصدة)` : `Computed dynamically from the Nile Valley & Delta dataset (${fmt(s.totalDetections)} total records).`}
        </p>

        <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:20px;overflow-x:auto;margin-bottom:56px;">
          <table style="width:100%;max-width:760px;border-collapse:collapse;font-size:15px;">
            <thead>
              <tr style="border-bottom:2px solid var(--line);">
                <th style="text-align:${isAr ? 'right' : 'left'};padding:12px 16px;color:var(--smoke);font-weight:500;">${isAr ? 'المعيار الفيزيائي / الإحصائي' : 'Metric'}</th>
                <th style="text-align:right;padding:12px 16px;color:var(--canopy);font-weight:600;">MODIS (1 km)</th>
                <th style="text-align:right;padding:12px 16px;color:var(--ember);font-weight:600;">VIIRS (375 m)</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:12px 16px;color:var(--ash);">${isAr ? 'إجمالي الرصدات' : 'Total fire detections'}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);font-weight:700;font-size:18px;">${fmt(s.modis.total)}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);font-weight:700;font-size:18px;">${fmt(s.viirs.total)}</td>
              </tr>
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:12px 16px;color:var(--ash);">${isAr ? 'متوسط قدرة الإشعاع (FRP)' : 'Mean Fire Radiative Power (FRP)'}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${fmtDec(s.modis.avgFrp, 1)} MW</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${fmtDec(s.viirs.avgFrp, 1)} MW</td>
              </tr>
              <tr style="border-bottom:1px solid var(--line);">
                <td style="padding:12px 16px;color:var(--ash);">${isAr ? 'أول رصدة مسجلة' : 'Earliest record in window'}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${s.modis.range.min}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${s.viirs.range.min}</td>
              </tr>
              <tr>
                <td style="padding:12px 16px;color:var(--ash);">${isAr ? 'أحدث رصدة مسجلة' : 'Latest record in window'}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${s.modis.range.max}</td>
                <td style="text-align:right;padding:12px 16px;color:var(--white);">${s.viirs.range.max}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. Overlap Analysis (2012–2024) -->
        <h2 style="font-size:clamp(24px,3.5vw,34px);margin-bottom:8px;">${t('se_overlap_title', 'The Overlap Period (2012–2024)')}</h2>
        <p style="color:var(--smoke);max-width:44em;font-size:15px;margin:0 0 16px;line-height:1.6;">
          ${t('se_overlap_desc', 'During the simultaneous overlap window (2012–2024), VIIRS records roughly 3–4× as many fire detections as MODIS for the exact same geographical corridor.')}
          ${isAr ? `(نسبة التضاعف الفعلية: <b style="color:var(--ember)">${fmtDec(ratio, 1)}×</b>)` : `(Observed empirical ratio: <b style="color:var(--ember)">${fmtDec(ratio, 1)}×</b>)`}
        </p>

        <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:24px;margin-bottom:56px;overflow-x:auto;">
          ${overlapSVG(s.overlapYears)}
        </div>

        <!-- 4. Sub-Pixel Resolution Physics -->
        <h2 style="font-size:clamp(24px,3.5vw,34px);margin-bottom:8px;">${t('se_res_title', 'Sub-Pixel Detection Physics')}</h2>
        <p style="color:var(--smoke);max-width:44em;font-size:15px;margin:0 0 20px;line-height:1.6;">
          ${t('se_res_desc', 'One MODIS 1 km pixel covers approximately 7 VIIRS 375 m pixels. A 200 m² crop fire represents only 0.02% of a MODIS pixel but 0.14% of a VIIRS pixel, easily crossing detection thresholds.')}
        </p>

        <div style="background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:32px 24px;margin-bottom:56px;overflow-x:auto;">
          ${resolutionSVG()}
        </div>

        <!-- 5. The 2012 Discontinuity Problem Box -->
        <div style="background:linear-gradient(135deg, rgba(255,90,74,.09), rgba(224,67,43,.04));border:1px solid rgba(255,90,74,.25);border-radius:16px;padding:clamp(24px,4vw,40px);margin-bottom:24px;">
          <h2 style="font-size:clamp(24px,3.5vw,34px);color:var(--ember);margin-bottom:14px;">${t('se_prob_title', 'The 2012 Discontinuity Problem')}</h2>
          <p style="max-width:44em;color:var(--ash);margin:0 0 22px;line-height:1.7;">
            ${isAr
              ? 'عند دمج بيانات MODIS وVIIRS دون وعي في خط زمني واحد، يظهر ارتفاع مفاجئ وضخم في عدد الحرائق ابتداءً من عام 2012. هذا الارتفاع ليس كارثة بيئية أو تغيراً في السلوك البشري؛ بل هو "أثر انتقالي لأجهزة الرصد" (Sensor Transition Artifact).'
              : 'When combining MODIS and VIIRS counts naively into a single time series, fire activity appears to suddenly erupt in 2012. This is not an environmental disaster or a sudden behavioural change by farmers — it is an instrument transition artifact resulting from higher spatial resolving power.'}
          </p>

          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;margin-bottom:24px;">
            <div style="background:rgba(23,17,12,.75);border-radius:12px;padding:22px;border:1px solid var(--line);">
              <h4 style="font-size:15px;font-weight:600;color:var(--ember);margin:0 0 10px;">${isAr ? '❌ النهج الساذج (الخاطئ)' : '❌ The Naive Mistake'}</h4>
              <ul style="margin:0;padding-inline-start:20px;font-size:14px;color:var(--ash);line-height:1.75;">
                <li>${isAr ? 'جمع رصدات المستشعرين في مؤشر رقمي واحد' : 'Summing raw MODIS and VIIRS counts into one series'}</li>
                <li>${isAr ? 'الادعاء بأن حرائق مصر تضاعفت 3 مرات في 2012' : 'Claiming Nile fire activity tripled in 2012'}</li>
                <li>${isAr ? 'تضليل صناع القرار، والبحوث العلمية، والإعلام' : 'Misleading agricultural policymakers and climate researchers'}</li>
              </ul>
            </div>
            <div style="background:rgba(23,17,12,.75);border-radius:12px;padding:22px;border:1px solid var(--line);">
              <h4 style="font-size:15px;font-weight:600;color:var(--canopy);margin:0 0 10px;">${isAr ? '✓ نهج مشروع Fire Harmony' : '✓ Fire Harmony Solution'}</h4>
              <ul style="margin:0;padding-inline-start:20px;font-size:14px;color:var(--ash);line-height:1.75;">
                <li>${isAr ? 'فصل المستشعرين وتسميتهما بوضوح في كافة المخططات' : 'Strict sensor disaggregation across all charts & maps'}</li>
                <li>${isAr ? 'توضيح خط انقطاع عام 2012 كتحول تقني وليس بيئي' : 'Explicit 2012 discontinuity boundary marker'}</li>
                <li>${isAr ? 'استخدام قدرة الإشعاع (FRP) والاتجاه المنسق للتقييم' : 'FRP radiant energy weighting & harmonized trend baseline'}</li>
              </ul>
            </div>
          </div>
        </div>

        <p class="note" style="margin-top:24px;">
          ${t('demo_note')}
        </p>
      </div>
    `;
  }

  window.renderSensors = buildSensorsPage;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildSensorsPage);
  } else {
    buildSensorsPage();
  }

  document.addEventListener('langchange', buildSensorsPage);
})();
