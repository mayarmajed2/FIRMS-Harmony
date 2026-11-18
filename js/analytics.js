/* analytics.js — Full analytics dashboard for Fire Harmony.
   Builds interactive SVG charts and metrics inside #analytics using the DATA array.
   Pure HTML/CSS/SVG — zero external dependencies. Full EN / AR bilingual support. */

(function () {
  'use strict';

  const MODIS_COLOR = '#f08a3c';
  const VIIRS_COLOR = '#e0432b';

  const MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const MONTHS_AR = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];

  function getMonths() {
    return (typeof LANG !== 'undefined' && LANG === 'ar') ? MONTHS_AR : MONTHS_EN;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = arr.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  function mean(arr) {
    return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
  }

  function fmt(n) {
    return Number(n).toLocaleString(typeof LANG !== 'undefined' && LANG === 'ar' ? 'ar-EG' : 'en-US');
  }

  /* ───── compute statistics from DATA ───── */
  function computeStats() {
    if (typeof DATA === 'undefined' || !Array.isArray(DATA) || !DATA.length) {
      return null;
    }

    const modis = DATA.filter(d => d.sensor === 'MODIS');
    const viirs = DATA.filter(d => d.sensor === 'VIIRS');
    const allFrp = DATA.map(d => d.frp);
    const years = DATA.map(d => d.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);

    /* yearly counts by sensor */
    const yearlyModis = {};
    const yearlyViirs = {};
    for (let y = minYear; y <= maxYear; y++) {
      yearlyModis[y] = 0;
      yearlyViirs[y] = 0;
    }
    modis.forEach(d => { yearlyModis[d.year] = (yearlyModis[d.year] || 0) + 1; });
    viirs.forEach(d => { yearlyViirs[d.year] = (yearlyViirs[d.year] || 0) + 1; });

    /* monthly counts by sensor */
    const monthlyModis = new Array(12).fill(0);
    const monthlyViirs = new Array(12).fill(0);
    DATA.forEach(d => {
      const parts = d.date.split('-');
      const m = parseInt(parts[1], 10) - 1;
      if (m >= 0 && m < 12) {
        if (d.sensor === 'MODIS') monthlyModis[m]++;
        else monthlyViirs[m]++;
      }
    });

    const monthlyTotal = monthlyModis.map((v, i) => v + monthlyViirs[i]);
    const peakMonthIdx = monthlyTotal.indexOf(Math.max(...monthlyTotal));

    /* FRP histogram */
    const frpMax = Math.max(...allFrp);
    const binCount = 18;
    const binWidth = Math.ceil(frpMax / binCount) || 1;
    const frpBins = new Array(binCount).fill(0);
    allFrp.forEach(v => {
      const idx = Math.min(Math.floor(v / binWidth), binCount - 1);
      frpBins[idx]++;
    });
    const frpMedian = median(allFrp);

    /* MODIS-only trend (linear regression on MODIS counts) */
    const modisYears = Object.keys(yearlyModis).map(Number).filter(y => yearlyModis[y] > 0);
    const modisVals = modisYears.map(y => yearlyModis[y]);
    let trend = 0;
    if (modisYears.length > 1) {
      const mx = mean(modisYears);
      const my = mean(modisVals);
      let num = 0, den = 0;
      modisYears.forEach((y, i) => {
        num += (y - mx) * (modisVals[i] - my);
        den += (y - mx) ** 2;
      });
      trend = den ? num / den : 0;
    }

    return {
      total: DATA.length,
      modisCount: modis.length,
      viirsCount: viirs.length,
      meanFrp: mean(allFrp),
      medianFrp: frpMedian,
      peakMonthIdx,
      peakMonth: getMonths()[peakMonthIdx],
      yearsOfData: maxYear - minYear + 1,
      minYear, maxYear,
      yearlyModis, yearlyViirs,
      monthlyModis, monthlyViirs,
      frpBins, binWidth, frpMax, frpMedian,
      trend
    };
  }

  /* ───── SVG Helpers ───── */
  const svgNS = 'http://www.w3.org/2000/svg';

  function svgEl(tag, attrs, children) {
    const el = document.createElementNS(svgNS, tag);
    if (attrs) Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (typeof children === 'string') el.textContent = children;
    else if (Array.isArray(children)) children.forEach(c => { if (c) el.appendChild(c); });
    return el;
  }

  /* ───── Chart 1: Yearly Trend (Stacked Bars) ───── */
  function buildYearlyChart(stats) {
    const pad = { top: 40, right: 30, bottom: 50, left: 50 };
    const W = 820, H = 340;
    const years = [];
    for (let y = stats.minYear; y <= stats.maxYear; y++) years.push(y);

    const totals = years.map(y => (stats.yearlyModis[y] || 0) + (stats.yearlyViirs[y] || 0));
    const maxVal = Math.max(...totals, 10);
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const barW = Math.max(Math.floor((cw / years.length) * 0.72), 6);
    const slotW = cw / years.length;

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'Yearly fire detections stacked chart',
      style: 'width:100%;height:auto;display:block;font-family:inherit;'
    });

    // Y Gridlines
    for (let s = 0; s <= 4; s++) {
      const yVal = Math.round((s / 4) * maxVal);
      const yPos = pad.top + ch - (s / 4) * ch;
      svg.appendChild(svgEl('line', {
        x1: pad.left, y1: yPos, x2: W - pad.right, y2: yPos,
        stroke: 'var(--line)', 'stroke-width': '1', 'stroke-dasharray': '3 3'
      }));
      svg.appendChild(svgEl('text', {
        x: pad.left - 10, y: yPos + 4,
        'text-anchor': 'end', fill: 'var(--smoke)', 'font-size': '11'
      }, String(yVal)));
    }

    // 2012 transition marker
    const idx2012 = years.indexOf(2012);
    if (idx2012 !== -1) {
      const x2012 = pad.left + idx2012 * slotW;
      svg.appendChild(svgEl('line', {
        x1: x2012, y1: pad.top - 12, x2: x2012, y2: pad.top + ch,
        stroke: 'var(--ember)', 'stroke-width': '1.5', 'stroke-dasharray': '5 4'
      }));
      svg.appendChild(svgEl('text', {
        x: x2012 + 6, y: pad.top + 10,
        fill: 'var(--ember)', 'font-size': '11', 'font-weight': '600'
      }, (typeof LANG !== 'undefined' && LANG === 'ar') ? '← بداية حقبة VIIRS (2012)' : 'VIIRS era begins (2012) →'));
    }

    // Stacked Bars
    years.forEach((y, i) => {
      const xCenter = pad.left + (i + 0.5) * slotW;
      const x = xCenter - barW / 2;
      const mCount = stats.yearlyModis[y] || 0;
      const vCount = stats.yearlyViirs[y] || 0;
      const hM = (mCount / maxVal) * ch;
      const hV = (vCount / maxVal) * ch;

      // MODIS bar (bottom)
      if (hM > 0) {
        const rM = svgEl('rect', {
          x, y: pad.top + ch - hM, width: barW, height: hM,
          fill: MODIS_COLOR, rx: '2'
        });
        rM.appendChild(svgEl('title', {}, `${y} MODIS: ${mCount}`));
        svg.appendChild(rM);
      }

      // VIIRS bar (stacked on top)
      if (hV > 0) {
        const rV = svgEl('rect', {
          x, y: pad.top + ch - hM - hV, width: barW, height: hV,
          fill: VIIRS_COLOR, rx: '2'
        });
        rV.appendChild(svgEl('title', {}, `${y} VIIRS: ${vCount}`));
        svg.appendChild(rV);
      }

      // Year labels on X axis
      if (y % 2 === 0 || y === 2012 || years.length <= 15) {
        svg.appendChild(svgEl('text', {
          x: xCenter, y: H - pad.bottom + 20,
          'text-anchor': 'middle', fill: 'var(--smoke)', 'font-size': '11'
        }, String(y)));
      }
    });

    // Legend
    const legX = W - pad.right - 180;
    const legY = pad.top - 16;
    svg.appendChild(svgEl('rect', { x: legX, y: legY, width: 12, height: 12, fill: MODIS_COLOR, rx: '2' }));
    svg.appendChild(svgEl('text', { x: legX + 16, y: legY + 10, fill: 'var(--ash)', 'font-size': '11' }, 'MODIS (1 km)'));
    svg.appendChild(svgEl('rect', { x: legX + 90, y: legY, width: 12, height: 12, fill: VIIRS_COLOR, rx: '2' }));
    svg.appendChild(svgEl('text', { x: legX + 106, y: legY + 10, fill: 'var(--ash)', 'font-size': '11' }, 'VIIRS (375 m)'));

    return svg;
  }

  /* ───── Chart 2: Monthly Seasonality (Grouped Bars) ───── */
  function buildMonthlyChart(stats) {
    const pad = { top: 35, right: 25, bottom: 45, left: 45 };
    const W = 820, H = 290;
    const maxVal = Math.max(...stats.monthlyModis, ...stats.monthlyViirs, 10);
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const slotW = cw / 12;
    const barW = Math.max(Math.floor(slotW * 0.36), 6);
    const gap = 3;
    const monthNames = getMonths();

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'Monthly seasonality fire detections chart',
      style: 'width:100%;height:auto;display:block;font-family:inherit;'
    });

    // Y Gridlines
    for (let s = 0; s <= 4; s++) {
      const yVal = Math.round((s / 4) * maxVal);
      const yPos = pad.top + ch - (s / 4) * ch;
      svg.appendChild(svgEl('line', {
        x1: pad.left, y1: yPos, x2: W - pad.right, y2: yPos,
        stroke: 'var(--line)', 'stroke-width': '1', 'stroke-dasharray': '3 3'
      }));
      svg.appendChild(svgEl('text', {
        x: pad.left - 8, y: yPos + 4,
        'text-anchor': 'end', fill: 'var(--smoke)', 'font-size': '10'
      }, String(yVal)));
    }

    // Highlight Oct-Nov peak burning season
    const octX = pad.left + 9 * slotW;
    const decX = pad.left + 12 * slotW;
    svg.appendChild(svgEl('rect', {
      x: octX, y: pad.top, width: decX - octX, height: ch,
      fill: 'var(--ember)', opacity: '0.07', rx: '4'
    }));
    svg.appendChild(svgEl('text', {
      x: octX + (decX - octX) / 2, y: pad.top + 16,
      'text-anchor': 'middle', fill: 'var(--ember)', 'font-size': '11', 'font-weight': '600'
    }, (typeof LANG !== 'undefined' && LANG === 'ar') ? 'ذروة حرق قش الأرز' : 'Rice Straw Peak'));

    // Monthly Bars
    for (let m = 0; m < 12; m++) {
      const xCenter = pad.left + (m + 0.5) * slotW;
      const hM = (stats.monthlyModis[m] / maxVal) * ch;
      const hV = (stats.monthlyViirs[m] / maxVal) * ch;

      // MODIS bar
      if (hM > 0) {
        const rM = svgEl('rect', {
          x: xCenter - barW - gap / 2, y: pad.top + ch - hM, width: barW, height: hM,
          fill: MODIS_COLOR, rx: '2'
        });
        rM.appendChild(svgEl('title', {}, `${monthNames[m]} MODIS: ${stats.monthlyModis[m]}`));
        svg.appendChild(rM);
      }

      // VIIRS bar
      if (hV > 0) {
        const rV = svgEl('rect', {
          x: xCenter + gap / 2, y: pad.top + ch - hV, width: barW, height: hV,
          fill: VIIRS_COLOR, rx: '2'
        });
        rV.appendChild(svgEl('title', {}, `${monthNames[m]} VIIRS: ${stats.monthlyViirs[m]}`));
        svg.appendChild(rV);
      }

      // Month name
      svg.appendChild(svgEl('text', {
        x: xCenter, y: H - pad.bottom + 18,
        'text-anchor': 'middle', fill: (m >= 9 && m <= 11) ? 'var(--white)' : 'var(--smoke)',
        'font-weight': (m >= 9 && m <= 11) ? '600' : '400', 'font-size': '11'
      }, monthNames[m]));
    }

    return svg;
  }

  /* ───── Chart 3: FRP Distribution Histogram ───── */
  function buildFrpChart(stats) {
    const pad = { top: 35, right: 25, bottom: 45, left: 45 };
    const W = 820, H = 260;
    const maxBin = Math.max(...stats.frpBins, 10);
    const cw = W - pad.left - pad.right;
    const ch = H - pad.top - pad.bottom;
    const slotW = cw / stats.frpBins.length;
    const barW = Math.max(Math.floor(slotW * 0.82), 4);

    const svg = svgEl('svg', {
      viewBox: `0 0 ${W} ${H}`,
      role: 'img',
      'aria-label': 'FRP distribution histogram',
      style: 'width:100%;height:auto;display:block;font-family:inherit;'
    });

    // Y Gridlines
    for (let s = 0; s <= 4; s++) {
      const yVal = Math.round((s / 4) * maxBin);
      const yPos = pad.top + ch - (s / 4) * ch;
      svg.appendChild(svgEl('line', {
        x1: pad.left, y1: yPos, x2: W - pad.right, y2: yPos,
        stroke: 'var(--line)', 'stroke-width': '1', 'stroke-dasharray': '3 3'
      }));
      svg.appendChild(svgEl('text', {
        x: pad.left - 8, y: yPos + 4,
        'text-anchor': 'end', fill: 'var(--smoke)', 'font-size': '10'
      }, String(yVal)));
    }

    // Median line
    const medBinIdx = Math.min(stats.frpMedian / stats.binWidth, stats.frpBins.length - 1);
    const medX = pad.left + (medBinIdx + 0.5) * slotW;
    svg.appendChild(svgEl('line', {
      x1: medX, y1: pad.top, x2: medX, y2: pad.top + ch,
      stroke: '#ffd36a', 'stroke-width': '2', 'stroke-dasharray': '4 4'
    }));
    svg.appendChild(svgEl('text', {
      x: medX + 6, y: pad.top + 14,
      fill: '#ffd36a', 'font-size': '11', 'font-weight': '600'
    }, (typeof LANG !== 'undefined' && LANG === 'ar') ? `الوسيط: ${stats.frpMedian.toFixed(1)} MW` : `Median: ${stats.frpMedian.toFixed(1)} MW`));

    // Bins
    stats.frpBins.forEach((cnt, i) => {
      const x = pad.left + (i + 0.5) * slotW - barW / 2;
      const h = (cnt / maxBin) * ch;
      const fromVal = i * stats.binWidth;
      const toVal = (i + 1) * stats.binWidth;

      const rect = svgEl('rect', {
        x, y: pad.top + ch - h, width: barW, height: h,
        fill: 'var(--canopy)', rx: '2'
      });
      rect.appendChild(svgEl('title', {}, `${fromVal}–${toVal} MW: ${cnt} fires`));
      svg.appendChild(rect);

      if (i % 3 === 0) {
        svg.appendChild(svgEl('text', {
          x: x + barW / 2, y: H - pad.bottom + 18,
          'text-anchor': 'middle', fill: 'var(--smoke)', 'font-size': '10'
        }, `${fromVal}`));
      }
    });

    return svg;
  }

  /* ───── Render Whole Page ───── */
  function renderAnalytics() {
    const root = document.getElementById('analytics');
    if (!root) return;

    const stats = computeStats();
    if (!stats) return;

    const isAr = typeof LANG !== 'undefined' && LANG === 'ar';
    const trendDir = stats.trend > 0.2 ? 'up' : stats.trend < -0.2 ? 'down' : 'stable';
    const trendArrow = trendDir === 'up' ? '↑' : trendDir === 'down' ? '↓' : '→';
    const trendColor = trendDir === 'up' ? VIIRS_COLOR : trendDir === 'down' ? '#1f7a78' : 'var(--smoke)';
    const trendLabel = isAr
      ? (trendDir === 'up' ? 'متزايد' : trendDir === 'down' ? 'متناقص' : 'مستقر')
      : (trendDir === 'up' ? 'Increasing' : trendDir === 'down' ? 'Decreasing' : 'Stable');

    root.innerHTML = `
      <div class="wrap" style="padding-top:clamp(32px,5vw,56px);padding-bottom:70px">
        <h1 class="page-title" style="margin-bottom:8px">${t('an_h', 'Analytics & Trends')}</h1>
        <p style="color:var(--smoke);max-width:44em;margin:0 0 36px;line-height:1.6">
          ${t('an_p', 'Trends, seasonality and Fire Radiative Power (FRP) across MODIS and VIIRS records.')}
        </p>

        <!-- KPI summary cards -->
        <div class="an-cards">
          <div class="an-card">
            <span class="an-card__label">${t('an_card_total', 'Total Detections')}</span>
            <b class="an-card__value">${fmt(stats.total)}</b>
            <span class="an-card__sub">MODIS ${fmt(stats.modisCount)} · VIIRS ${fmt(stats.viirsCount)}</span>
          </div>
          <div class="an-card">
            <span class="an-card__label">${t('an_card_mean', 'Mean FRP')}</span>
            <b class="an-card__value">${stats.meanFrp.toFixed(1)} <small>MW</small></b>
            <span class="an-card__sub">${isAr ? 'متوسط الطاقة الإشعاعية' : 'Radiative energy'}</span>
          </div>
          <div class="an-card">
            <span class="an-card__label">${t('an_card_median', 'Median FRP')}</span>
            <b class="an-card__value">${stats.medianFrp.toFixed(1)} <small>MW</small></b>
            <span class="an-card__sub">${isAr ? 'عتبة الحرائق الزراعية' : 'Small fire regime'}</span>
          </div>
          <div class="an-card">
            <span class="an-card__label">${t('an_card_peak', 'Peak Month')}</span>
            <b class="an-card__value">${stats.peakMonth}</b>
            <span class="an-card__sub">${isAr ? 'موسم قش الأرز بالدلتا' : 'Post-harvest burn'}</span>
          </div>
          <div class="an-card">
            <span class="an-card__label">${t('an_card_years', 'Years of Record')}</span>
            <b class="an-card__value">${stats.yearsOfData}</b>
            <span class="an-card__sub">${stats.minYear}–${stats.maxYear}</span>
          </div>
          <div class="an-card">
            <span class="an-card__label">${t('an_card_trend', 'Harmonized Trend')}</span>
            <b class="an-card__value" style="color:${trendColor}">${trendArrow} ${trendLabel}</b>
            <span class="an-card__sub">${stats.trend >= 0 ? '+' : ''}${stats.trend.toFixed(2)} ${isAr ? 'رصدة/سنة' : 'dets/yr'}</span>
          </div>
        </div>

        <!-- Section 1: Yearly chart -->
        <section class="an-section">
          <h2 class="an-section__title">${t('an_yearly_title', 'Yearly Fire Activity & The 2012 Transition')}</h2>
          <p class="an-section__desc">
            ${t('an_yearly_desc', 'Stacked bars show annual counts for MODIS (orange) and VIIRS (red).')}
          </p>
          <div class="an-chart" id="an-yearly"></div>
        </section>

        <!-- Section 2: Monthly chart -->
        <section class="an-section">
          <h2 class="an-section__title">${t('an_monthly_title', 'Agricultural Seasonality (Delta vs. Upper Egypt)')}</h2>
          <p class="an-section__desc">
            ${t('an_monthly_desc', 'Monthly aggregation reveals Egypt’s primary agricultural burning window in October–December.')}
          </p>
          <div class="an-chart" id="an-monthly"></div>
        </section>

        <!-- Section 3: FRP distribution chart -->
        <section class="an-section">
          <h2 class="an-section__title">${t('an_frp_title', 'Fire Radiative Power (FRP) Distribution')}</h2>
          <p class="an-section__desc">
            ${t('an_frp_desc', 'Log-normal distribution of thermal radiant energy (Megawatts).')}
          </p>
          <div class="an-chart" id="an-frp"></div>
        </section>

        <!-- Section 4: Delta Agricultural Burning Calendar & Crop Phenology -->
        <section class="an-section">
          <h2 class="an-section__title">${t('an_crop_title', 'Nile Delta Agricultural Burning Calendar')}</h2>
          <p class="an-section__desc">
            ${t('an_crop_desc', 'Field activity alignment: Rice straw combustion generates intense, concentrated regional smoke episodes (October–December), while winter wheat residue clearance creates secondary spikes in April–May.')}
          </p>
          <div class="an-chart" style="padding:24px;">
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:18px;">
              <div style="background:rgba(224,67,43,.1);border:1px solid rgba(224,67,43,.3);border-radius:12px;padding:18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                  <span style="font-size:24px;">🌾</span>
                  <b style="color:var(--white);font-size:16px;">${isAr ? 'موسم قش الأرز (الذروة الخريفية)' : 'Rice Straw Residue (Autumn Peak)'}</b>
                </div>
                <p style="margin:0 0 8px;font-size:13px;color:var(--ash);line-height:1.6;">
                  ${isAr ? 'أكتوبر – نوفمبر – ديسمبر: احتراق واسع النطاق في محافظات الدقهلية والشرقية والغربية وكفر الشيخ. يتزامن مع ظاهرة "السحابة السوداء".' : 'October – December: Primary burning season across Dakahlia, Sharqia, Gharbia, and Kafr El-Sheikh. Driving contributor to historic "Black Cloud" autumn air pollution episodes.'}
                </p>
                <div style="display:flex;gap:8px;font-size:11px;">
                  <span style="background:var(--blaze);color:#fff;padding:2px 8px;border-radius:4px;font-weight:600;">${isAr ? 'عالي الخطورة' : 'Peak Severity'}</span>
                  <span style="color:var(--smoke);align-self:center;">~65% ${isAr ? 'من رصدات الدلتا' : 'of Delta fires'}</span>
                </div>
              </div>

              <div style="background:rgba(240,138,60,.1);border:1px solid rgba(240,138,60,.3);border-radius:12px;padding:18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                  <span style="font-size:24px;">🌱</span>
                  <b style="color:var(--white);font-size:16px;">${isAr ? 'موسم تبن القمح (الذروة الربيعية)' : 'Wheat Stubble Clearance (Spring)'}</b>
                </div>
                <p style="margin:0 0 8px;font-size:13px;color:var(--ash);line-height:1.6;">
                  ${isAr ? 'أبريل – مايو: تنظيف الحقول بعد حصاد القمح في صعيد مصر وشمال الدلتا استعداداً لزراعة المحاصيل الصيفية (الذرة والأرز).' : 'April – May: Stubble removal post winter wheat harvest along the Upper Egypt valley and Delta fringe preparing soil for summer maize and rice planting.'}
                </p>
                <div style="display:flex;gap:8px;font-size:11px;">
                  <span style="background:var(--canopy);color:#fff;padding:2px 8px;border-radius:4px;font-weight:600;">${isAr ? 'متوسط' : 'Moderate'}</span>
                  <span style="color:var(--smoke);align-self:center;">~17% ${isAr ? 'من رصدات الوادي' : 'of annual fires'}</span>
                </div>
              </div>

              <div style="background:rgba(31,122,120,.1);border:1px solid rgba(31,122,120,.3);border-radius:12px;padding:18px;">
                <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
                  <span style="font-size:24px;">☀️</span>
                  <b style="color:var(--white);font-size:16px;">${isAr ? 'موسم النمو الصيفي (أدنى نشاط)' : 'Summer Growing Season (Minimum)'}</b>
                </div>
                <p style="margin:0 0 8px;font-size:13px;color:var(--ash);line-height:1.6;">
                  ${isAr ? 'يونيو – أغسطس: كثافة نباتية عالية ونشاط ري مكثف يمنع الاشتعال، مما يؤدي لأدنى معدل رصد حراري سنوي في مصر.' : 'June – August: High vegetative moisture, continuous field irrigation, and active canopy growth prevent open residue combustion, creating the annual minimum.'}
                </p>
                <div style="display:flex;gap:8px;font-size:11px;">
                  <span style="background:var(--moss);color:var(--ash);padding:2px 8px;border-radius:4px;font-weight:600;">${isAr ? 'نشاط منخفض' : 'Low Activity'}</span>
                  <span style="color:var(--smoke);align-self:center;"><5% ${isAr ? 'من المعدل' : 'annual rate'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 5: Live NASA FIRMS CSV Ingestion & Overlap Harmonization Matrix -->
        <section class="an-section">
          <h2 class="an-section__title">${t('an_calib_title', 'Empirical Cross-Sensor Harmonization Matrix')}</h2>
          <p class="an-section__desc">
            ${t('an_calib_desc', 'Calculated over the 2012–2024 co-observation baseline along the Nile corridor polygon:')}
          </p>
          <div id="an-calib-box" class="an-chart" style="padding:22px;margin-bottom:24px;"></div>

          <h3 style="font-size:20px;color:var(--white);margin:24px 0 10px;">${t('an_upload_title', 'Load Live NASA FIRMS Data (CSV)')}</h3>
          <p style="color:var(--smoke);font-size:13px;margin:0 0 16px;line-height:1.6;">
            ${t('an_upload_desc', 'Upload standard CSV exports from NASA FIRMS (MODIS or VIIRS). Points outside the calibrated Nile corridor boundary are automatically filtered out live.')}
          </p>
          <div style="display:flex;flex-wrap:wrap;align-items:center;gap:14px;background:var(--panel);border:1px dashed var(--line);border-radius:12px;padding:20px;">
            <input type="file" id="firmsFileInput" accept=".csv" style="display:none;">
            <button type="button" id="btnUploadFIRMS" class="btn-ctrl" style="background:var(--ember);color:#fff;border:none;padding:10px 18px;border-radius:8px;font-weight:600;cursor:pointer;">
              📂 ${t('an_upload_btn', 'Upload FIRMS CSV')}
            </button>
            <button type="button" id="btnResetFIRMS" class="btn-ctrl" style="background:none;border:1px solid var(--line);color:var(--ash);padding:10px 18px;border-radius:8px;cursor:pointer;">
              🔄 ${t('an_reset_btn', 'Reset to Calibrated Benchmark')}
            </button>
            <span id="firmsUploadStatus" style="font-size:13px;color:var(--smoke);"></span>
          </div>
        </section>

        <p class="note" style="margin-top:36px;">
          ${t('demo_note', 'Calibrated synthetic model based on published NASA FIRMS distributions.')}
        </p>
      </div>
    `;

    const c1 = document.getElementById('an-yearly');
    const c2 = document.getElementById('an-monthly');
    const c3 = document.getElementById('an-frp');

    if (c1) c1.appendChild(buildYearlyChart(stats));
    if (c2) c2.appendChild(buildMonthlyChart(stats));
    if (c3) c3.appendChild(buildFrpChart(stats));

    // Render Harmonization Calibration Box
    const calibBox = document.getElementById('an-calib-box');
    if (calibBox && typeof computeHarmonizationCalibration === 'function') {
      const calib = computeHarmonizationCalibration();
      calibBox.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;">
          <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;">
            <span style="font-size:12px;color:var(--smoke);display:block;margin-bottom:4px;">${isAr ? 'نسبة رصد VIIRS إلى MODIS' : 'VIIRS / MODIS Count Ratio'}</span>
            <b style="font-size:24px;color:var(--ember);font-family:var(--fd);">${calib.countRatio}×</b>
            <span style="font-size:11px;color:var(--smoke);display:block;margin-top:2px;">${isAr ? 'عامل تضخم الدقة المكانية' : 'Resolution inflation factor'}</span>
          </div>
          <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;">
            <span style="font-size:12px;color:var(--smoke);display:block;margin-bottom:4px;">${isAr ? 'متوسط FRP لمستشعر MODIS' : 'MODIS Mean FRP'}</span>
            <b style="font-size:24px;color:#f08a3c;font-family:var(--fd);">${calib.modisMeanFrp} <small style="font-size:13px;">MW</small></b>
            <span style="font-size:11px;color:var(--smoke);display:block;margin-top:2px;">${isAr ? 'رصد الحرائق الأكبر فقط' : 'Coarser 1 km threshold'}</span>
          </div>
          <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;">
            <span style="font-size:12px;color:var(--smoke);display:block;margin-bottom:4px;">${isAr ? 'متوسط FRP لمستشعر VIIRS' : 'VIIRS Mean FRP'}</span>
            <b style="font-size:24px;color:#e0432b;font-family:var(--fd);">${calib.viirsMeanFrp} <small style="font-size:13px;">MW</small></b>
            <span style="font-size:11px;color:var(--smoke);display:block;margin-top:2px;">${isAr ? 'رصد الحرائق الزراعية الباردة' : 'Sensitive to cooler fires'}</span>
          </div>
          <div style="background:rgba(255,255,255,.03);padding:14px;border-radius:8px;">
            <span style="font-size:12px;color:var(--smoke);display:block;margin-bottom:4px;">${isAr ? 'نسبة متوسط الشدة (α)' : 'Mean Intensity Ratio (α)'}</span>
            <b style="font-size:24px;color:var(--canopy);font-family:var(--fd);">${calib.frpMeanRatio}</b>
            <span style="font-size:11px;color:var(--smoke);display:block;margin-top:2px;">${isAr ? 'معامل التنسيق الطيفي' : 'Sub-pixel dilution scaling'}</span>
          </div>
        </div>
      `;
    }

    // Attach File Upload Event Listeners
    const btnUpload = document.getElementById('btnUploadFIRMS');
    const fileInput = document.getElementById('firmsFileInput');
    const btnReset = document.getElementById('btnResetFIRMS');
    const statusSpan = document.getElementById('firmsUploadStatus');

    if (btnUpload && fileInput) {
      btnUpload.onclick = () => fileInput.click();
      fileInput.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        statusSpan.textContent = isAr ? 'جارٍ تحليل الملف...' : 'Parsing file...';
        const reader = new FileReader();
        reader.onload = (evt) => {
          try {
            const { parsed, skippedOutside } = parseFIRMSCSV(evt.target.result);
            if (!parsed.length) {
              statusSpan.textContent = isAr ? '⚠️ لم يتم العثور على رصدات داخل ممر النيل في هذا الملف.' : '⚠️ No detections found inside Nile boundary in this file.';
              return;
            }
            loadCustomFIRMS(parsed);
            statusSpan.textContent = isAr 
              ? `✅ تم تحميل ${parsed.length} رصدة بنجاح (تم استبعاد ${skippedOutside} خارج النطاق).`
              : `✅ Successfully loaded ${parsed.length} detections (${skippedOutside} outside boundary excluded).`;
            renderAnalytics();
          } catch (err) {
            statusSpan.textContent = '❌ Error: ' + err.message;
          }
        };
        reader.readAsText(file);
      };
    }

    if (btnReset) {
      btnReset.onclick = () => {
        resetToBenchmark();
        if (statusSpan) statusSpan.textContent = isAr ? 'تمت استعادة البيانات القياسية.' : 'Reset to calibrated benchmark dataset.';
        renderAnalytics();
      };
    }
  }

  window.renderAnalytics = renderAnalytics;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAnalytics);
  } else {
    renderAnalytics();
  }

  document.addEventListener('langchange', renderAnalytics);
  document.addEventListener('dataupdated', renderAnalytics);
})();
