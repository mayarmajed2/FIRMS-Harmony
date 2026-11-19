/* i18n.js: English / Arabic text and language switcher with full RTL support. */

const I18N = {
  en: {
    // Navigation
    nav_home: 'Home',
    nav_map: 'Fire Map',
    nav_analytics: 'Analytics',
    nav_sensors: 'Sensors',
    nav_method: 'Methodology',
    nav_about: 'About',

    // Home Hero
    hero_eyebrow: 'UNIFIED SATELLITE FIRE INTELLIGENCE · 2000–2025',
    hero_title: 'One Earth. Two Satellite Systems. One Clearer Picture.',
    lead: 'FIRMS Harmony brings NASA FIRMS MODIS and VIIRS fire observations together along the Nile Valley and Delta, separating true agricultural burning trends from sensor resolution artifacts.',
    cta: 'Explore Live Data',
    how2012: 'Discover the Technology',
    prob_kicker: '01 · THE SENSOR DISCONTINUITY',
    proc_kicker: '02 · HARMONIZATION PIPELINE',
    proc_title: 'From raw orbital streams to validated insight',
    proc_intro: 'Combining MODIS and VIIRS without reconciliation invents a false 2012 fire surge. FIRMS Harmony preserves raw provenance while validating cross-sensor agreement.',
    p1_h: 'MODIS + VIIRS Ingestion',
    p1_p: 'Ingests Terra, Aqua, Suomi NPP, and NOAA-20 detections clipped strictly to the fertile Nile corridor.',
    p2_h: 'Spatiotemporal Matching',
    p2_p: 'Correlates detections within ≤ 1.5 km Haversine distance and ≤ 6 h UTC overpass windows without forcing false matches.',
    p3_h: 'Out-of-Sample Calibration',
    p3_p: 'Validates cross-sensor scaling on 36 held-out months (2023–2025) and normalizes MODIS % and VIIRS l/n/h confidence.',
    p4_h: 'Unified Intelligence',
    p4_p: 'Delivers continuous 2000–2025 harmonized series, disagreement metrics, and live CSV upload for researchers.',
    ver_kicker: '03 · VERIFIED NASA FIRMS ARCHIVE (2000–2025)',
    ver_title: 'Backed by 25 years of real Nile Delta observations',
    ver_intro: 'Auditable outputs computed from official NASA FIRMS Standard Processing annual archives across four satellite platforms.',
    pf1_l: 'Official FIRMS Archives',
    pf1_s: 'Terra, Aqua, S-NPP & NOAA-20 (2000–2025)',
    pf2_l: 'Verified Delta Hotspots',
    pf2_s: '14,977 MODIS + 209,438 VIIRS detections',
    pf3_l: 'Terra MAE Reduction',
    pf3_s: '309.8 → 141.2 on 2023–2025 holdout',
    pf4_l: 'Aqua MAE Reduction',
    pf4_s: '308.7 → 140.3 on 2023–2025 holdout',
    why_kicker: '04 · REAL-WORLD SIGNIFICANCE',
    fcta_kicker: 'READY TO EXPLORE',
    fcta_title: 'Inspect the Nile corridor with unified satellite precision',
    fcta_desc: 'Filter detections by sensor, year, and Fire Radiative Power, or upload your own NASA FIRMS CSV export directly in the browser.',
    fcta_btn2: 'Open Analytics Dashboard',
    st_det: 'Total detections',
    st_frp: 'Median FRP (MW)',
    st_days: 'Years of record',
    st_sens: 'Sensors harmonized',
    demo_note: 'Calibrated synthetic model based on published NASA FIRMS seasonal & spatial distributions (2001–2024).',

    // Home Sections
    s_title: 'Two sensors, one record, one catch',
    s_intro: 'MODIS gives the long view (2000–present). VIIRS sees finer (2012–present). Joining them naively makes fire look like it surged in 2012.',
    since2000: 'since 2000',
    since2012: 'since 2012',
    res_m: '≈ 1 km at nadir',
    res_v: '≈ 375 m at nadir',
    modis_txt: 'Each pixel covers about 1 km², so small agricultural residue fires can fall below the thermal detection threshold.',
    viirs_txt: 'Finer 375 m pixels isolate smaller thermal anomalies, detecting 3–5× more fires in the same area without an actual increase in burning.',
    why: 'Why the Nile corridor',
    w1h: 'Life and agriculture are concentrated here',
    w1p: 'Over 95% of Egypt’s population, farmland, and human settlements sit in a narrow ribbon along the Nile Valley and across the Delta.',
    w2h: 'Fires here are small, rapid, and frequent',
    w2p: 'Post-harvest crop residue burning (rice straw in autumn, wheat stubble in spring) leaves small, brief thermal signatures.',
    w3h: 'Deliberate spatial bounding',
    w3p: 'Detections outside the verified Nile agricultural boundary are excluded, isolating human-environmental burning from desert flares.',

    // Map filters & controls
    f_title: 'Filters & Controls',
    f_modis: 'MODIS (Terra/Aqua ≈1 km)',
    f_viirs: 'VIIRS (S-NPP/NOAA-20 ≈375 m)',
    f_date: 'Observation window (year)',
    f_frp: 'Minimum Fire Radiative Power (FRP):',
    f_scale: 'Thermal scale (FRP)',
    low: 'low (1 MW)',
    high: 'high (60+ MW)',
    legend: 'Square = MODIS (1 km), Circle = VIIRS (375 m).',
    f_demo: 'Model calibrated against NASA FIRMS archive. Boundary follows the fertile Nile corridor from Aswan to the Mediterranean.',
    hint: 'Click any detection marker on the map to inspect its sensor metadata.',
    shown: '{n} detections in active filter',
    d_det: '{s} Fire Detection',
    d_date: 'Date',
    d_pos: 'Coordinates',
    d_frp: 'Fire Radiative Power (FRP)',
    d_rec: 'Record ID #',
    play: '▶ Play',
    pause: '⏸ Pause',
    download_csv: '⬇ Export Filtered CSV',
    stats_dets: 'detections',
    stats_avg_frp: 'Avg FRP',

    // Hero SVG labels
    hero_aria: 'Abstract cartographic representation of the Nile corridor with active satellite thermal detections',
    hero_delta: 'Nile Delta',
    hero_aswan: 'Aswan',
    hero_cairo: 'Cairo',
    hero_modis: 'MODIS ≈1 km',
    hero_viirs: 'VIIRS ≈375 m',
    hero_demo: 'Calibrated Model',

    // Accessibility
    skip: 'Skip to content',
    nav_aria: 'Main navigation',
    lang_aria: 'Switch language to Arabic',
    y_from: 'From year',
    y_to: 'To year',
    map_label: 'Interactive GIS map of thermal detections along the Nile Valley and Delta',
    marker_title: '{s} detection, {d}, FRP {f} MW',
    map_err: 'The Leaflet mapping library could not load. Please check your network connection.',

    // Analytics Page
    an_h: 'Analytics & Trends',
    an_p: 'Long-term trends, seasonality, and Fire Radiative Power (FRP) across MODIS and VIIRS records with the 2012 sensor transition explicitly resolved.',
    an_card_total: 'Total Detections',
    an_card_mean: 'Mean FRP',
    an_card_median: 'Median FRP',
    an_card_peak: 'Peak Month',
    an_card_years: 'Years of Record',
    an_card_trend: 'Harmonized Trend (MODIS)',
    an_yearly_title: 'Yearly Fire Activity & The 2012 Transition',
    an_yearly_desc: 'Stacked bars show annual counts for MODIS (orange) and VIIRS (red). The dashed line marks 2012 — the apparent sudden spike is a sensor resolution artifact, not an ecological explosion.',
    an_monthly_title: 'Agricultural Seasonality (Delta vs. Upper Egypt)',
    an_monthly_desc: 'Monthly aggregation reveals Egypt’s primary burning window during October–November (rice straw post-harvest in the Delta) and secondary peak in April–May (wheat stubble).',
    an_frp_title: 'Fire Radiative Power (FRP) Distribution',
    an_frp_desc: 'Log-normal distribution of thermal radiant energy (Megawatts). The vast majority of fires are small-scale agricultural burns (median ~5 MW).',
    an_crop_title: 'Nile Delta Agricultural Burning Calendar',
    an_crop_desc: 'Field activity alignment: Rice straw combustion generates intense, concentrated regional smoke episodes (October–December), while winter wheat residue clearance creates secondary spikes in April–May.',
    an_calib_title: 'Empirical Cross-Sensor Harmonization Matrix',
    an_calib_desc: 'Calculated over the 2012–2024 co-observation baseline along the Nile corridor polygon:',
    an_upload_title: 'Load Live NASA FIRMS Data (CSV)',
    an_upload_desc: 'Upload standard CSV exports from NASA FIRMS (MODIS or VIIRS). Points outside the calibrated Nile corridor boundary are automatically filtered out live.',
    an_upload_btn: 'Upload FIRMS CSV',
    an_reset_btn: 'Reset to Calibrated Benchmark',

    // Sensors Page
    se_h: 'Sensor Comparison: MODIS vs. VIIRS',
    se_p: 'A deep dive into sensor physics, orbit geometry, spatial resolution, and why cross-sensor continuity requires careful scientific harmonization.',
    se_card_modis_title: 'MODIS (Terra & Aqua)',
    se_card_viirs_title: 'VIIRS (Suomi NPP & NOAA-20)',
    se_overlap_title: 'The Overlap Period (2012–2024)',
    se_overlap_desc: 'Comparing observations over the identical landscape and timeframe: VIIRS detects 3–4× more fire pixels because its 375 m pixel isolates small fires that 1 km MODIS pixels average out.',
    se_res_title: 'Sub-Pixel Detection Physics',
    se_res_desc: 'One MODIS 1 km pixel covers approximately 7 VIIRS 375 m pixels. A 200 m² crop fire represents only 0.02% of a MODIS pixel but 0.14% of a VIIRS pixel, easily crossing detection thresholds.',
    se_prob_title: 'The 2012 Discontinuity Problem',

    // Methodology Page
    me_h: 'Scientific Methodology & Architecture',
    me_p: 'Comprehensive documentation of the data pipeline, ray-casting boundary polygon, thermal radiometric equations, quality flags, and sensor harmonization.',
    me_pipe_title: 'Data Processing Pipeline',
    me_bounds_title: 'Study Area & Boundary Polygon',
    me_qa_title: 'Quality Assurance & False Positive Rejection',
    me_frp_title: 'Fire Radiative Power (FRP) Formulation',
    me_limit_title: 'Transparent Limitations',
    me_refs_title: 'Academic Citations & References',

    // About Page
    ab_h: 'About Fire Harmony',
    ab_p: 'A NASA Space Apps Challenge project dedicated to transparent, scientifically defensible satellite fire monitoring and sensor discontinuity education.',
    ab_mission_title: 'Project Mission',
    ab_obj_title: 'Core Objectives',
    ab_study_title: 'Study Area Geography',
    ab_sources_title: 'Authoritative Data Sources',
    ab_tech_title: 'Technology & Design Stack',
    ab_ack_title: 'Acknowledgments',

    footer: 'Fire Harmony · A NASA Space Apps Challenge Project. Earth observation data inspired by NASA FIRMS (MODIS/VIIRS) & NASA Earth Observatory. Study corridor: Nile Valley & Delta, Egypt.'
  },

  ar: {
    // Navigation
    nav_home: 'الرئيسية',
    nav_map: 'خريطة الحرائق',
    nav_analytics: 'التحليلات والاتجاهات',
    nav_sensors: 'مقارنة المستشعرات',
    nav_method: 'المنهجية العلمية',
    nav_about: 'عن المشروع',

    // Home Hero
    hero_eyebrow: 'ذكاء فضائي موحّد لرصد الحرائق · 2000–2025',
    hero_title: 'أرض واحدة. نظامان فضائيان. صورة أوضح.',
    lead: 'يجمع مشروع FIRMS Harmony بين رصدات MODIS وVIIRS من أرشيف NASA FIRMS على امتداد وادي النيل والدلتا، ليفصل اتجاهات الحرق الزراعي الحقيقية عن آثار دقة المستشعرات.',
    cta: 'استكشف البيانات التفاعلية',
    how2012: 'اكتشف التقنية والمنهجية',
    prob_kicker: '01 · إشكالية تباين المستشعرات',
    proc_kicker: '02 · مسار التنسيق العلمي',
    proc_title: 'من الرصدات المدارية الخام إلى رؤية موحّدة وموثّقة',
    proc_intro: 'دمج MODIS وVIIRS دون معايرة يصنع طفرة وهمية في عام 2012. يحفظ FIRMS Harmony أصل كل رصدة مع التحقق الإحصائي من التوافق بين المستشعرين.',
    p1_h: 'استيعاب MODIS وVIIRS',
    p1_p: 'معالجة رصدات Terra وAqua وSuomi NPP وNOAA-20 مع قصرها جغرافياً على ممر النيل الخصيب.',
    p2_h: 'التطابق المكاني والزمني',
    p2_p: 'مقارنة الرصدات ضمن مسافة ≤ 1.5 كم ونافذة زمنية ≤ 6 ساعات دون فرض تطابقات غير مبررة علمياً.',
    p3_h: 'المعايرة خارج العينة',
    p3_p: 'اختبار معاملات التنسيق على 36 شهراً مستقلاً (2023–2025) وتوحيد مستويات الثقة بين المستشعرين.',
    p4_h: 'رؤية فضائية موحّدة',
    p4_p: 'سلسلة زمنية متصلة 2000–2025 ومقاييس التوافق والاختلاف مع دعم رفع ملفات NASA FIRMS CSV مباشرة.',
    ver_kicker: '03 · أرشيف NASA FIRMS الموثّق (2000–2025)',
    ver_title: 'مبني على 25 عاماً من الرصد الحقيقي لدلتا النيل',
    ver_intro: 'نتائج قابلة للتدقيق مستخرجة من أرشيفات NASA FIRMS القياسية عبر أربعة أقمار صناعية.',
    pf1_l: 'ملف أرشيف رسمي',
    pf1_s: 'Terra وAqua وS-NPP وNOAA-20 (2000–2025)',
    pf2_l: 'رصدة حقيقية بالدلتا',
    pf2_s: '14,977 MODIS + 209,438 VIIRS',
    pf3_l: 'تحسّن خطأ Terra',
    pf3_s: 'من 309.8 إلى 141.2 في اختبار 2023–2025',
    pf4_l: 'تحسّن خطأ Aqua',
    pf4_s: 'من 308.7 إلى 140.3 في اختبار 2023–2025',
    why_kicker: '04 · الأثر الواقعي',
    fcta_kicker: 'ابدأ الاستكشاف الآن',
    fcta_title: 'استكشف ممر النيل بدقة فضائية موحّدة',
    fcta_desc: 'صفِّ الرصدات حسب المستشعر والسنة وقدرة الإشعاع الحراري، أو ارفع ملف NASA FIRMS CSV الخاص بك مباشرة في المتصفح.',
    fcta_btn2: 'افتح لوحة التحليلات',
    st_det: 'إجمالي الرصدات',
    st_frp: 'وسيط قدرة الإشعاع (MW)',
    st_days: 'سنوات الرصد الفضائي',
    st_sens: 'المستشعرات المدمجة',
    demo_note: 'نموذج تركيبي معاير مستند إلى التوزيعات الموسمية والمكانية المنشورة في NASA FIRMS لمصر (2001–2024).',

    // Home Sections
    s_title: 'مستشعران، سجل واحد، وفخ علمي',
    s_intro: 'يمنحنا MODIS سجلاً تاريخياً طويلاً (منذ 2000)، بينما يرصد VIIRS بدقة مكانية أعلى (منذ 2012). دمجهما بسذاجة يجعل الحرائق تبدو وكأنها انفجرت فجأة في 2012.',
    since2000: 'منذ عام 2000',
    since2012: 'منذ عام 2012',
    res_m: '≈ 1 كم في النظير',
    res_v: '≈ 375 م في النظير',
    modis_txt: 'يغطي كل بكسل حوالي 1 كم مربع، لذا فإن الحرائق الزراعية الصغيرة قد لا تتجاوز عتبة الرصد الحراري المطلوبة.',
    viirs_txt: 'تكشف بكسلاته الدقيقة (375م) حرائق زراعية أصغر بمقدار 3 إلى 5 أضعاف في نفس المساحة دون أن تكون الحرائق الفعلية قد زادت.',
    why: 'لماذا ممر النيل تحديداً؟',
    w1h: 'تركّز الزراعة والحياة السكانية',
    w1p: 'يتركز أكثر من 95% من سكان مصر وأراضيها الزراعية في شريط ضيق ومكثف بمحاذاة النيل وعبر سهول الدلتا.',
    w2h: 'حرائق صغيرة وسريعة ومتكررة',
    w2p: 'حرق المخلفات بعد الحصاد (قش الأرز في الخريف، وتبن القمح في الربيع) يولد بصمات حرارية صغيرة وقصيرة العمر.',
    w3h: 'تحديد جغرافي صارم وموثوق',
    w3p: 'تُستبعد الرصدات الحرارية في الصحراء لعزل حرائق الحقول الزراعية عن الشعلات النفطية والحرارة الصناعية.',

    // Map filters & controls
    f_title: 'التصفية والتحكم',
    f_modis: 'مستشعر MODIS (تيرا/أكوا ≈1 كم)',
    f_viirs: 'مستشعر VIIRS (سومي/نووا ≈375 م)',
    f_date: 'نافذة الرصد (السنوات):',
    f_frp: 'الحد الأدنى لقدرة الإشعاع الحراري (FRP):',
    f_scale: 'المقياس الحراري (FRP)',
    low: 'منخفض (1 ميغاواط)',
    high: 'مرتفع (60+ ميغاواط)',
    legend: 'المربع = MODIS (1 كم)، الدائرة = VIIRS (375 م).',
    f_demo: 'النموذج معاير بناءً على أرشيف NASA FIRMS. يتبع النطاق ممر النيل الخصيب من أسوان حتى البحر المتوسط.',
    hint: 'انقر على أي نقطة رصد حراري على الخريطة لعرض بياناتها الفيزيائية.',
    shown: '{n} رصدة مطابقة للتصفية',
    d_det: 'رصدة حرارية عبر {s}',
    d_date: 'التاريخ',
    d_pos: 'الإحداثيات الجغرافية',
    d_frp: 'قدرة الإشعاع الحراري (FRP)',
    d_rec: 'رقم السجل #',
    play: '▶ تشغيل زمني',
    pause: '⏸ إيقاف مؤقت',
    download_csv: '⬇ تصدير البيانات (CSV)',
    stats_dets: 'رصدة',
    stats_avg_frp: 'متوسط FRP',

    // Hero SVG labels
    hero_aria: 'رسم بياني تجريدي لممر النيل والدلتا مع رصدات حرارية فضائية',
    hero_delta: 'دلتا النيل',
    hero_aswan: 'أسوان',
    hero_cairo: 'القاهرة',
    hero_modis: 'MODIS ≈1 كم',
    hero_viirs: 'VIIRS ≈375 م',
    hero_demo: 'نموذج معاير',

    // Accessibility
    skip: 'تخطَّ إلى المحتوى الرئيسي',
    nav_aria: 'التنقل الرئيسي للموقع',
    lang_aria: 'التحويل إلى اللغة الإنجليزية',
    y_from: 'من سنة',
    y_to: 'إلى سنة',
    map_label: 'خريطة تفاعلية لنظم المعلومات الجغرافية لرصد الحرائق على امتداد ممر وادي النيل والدلتا',
    marker_title: 'رصدة {s}، بتاريخ {d}، بقوة {f} ميغاواط',
    map_err: 'تعذر تحميل مكتبة الخرائط. يرجى التحقق من اتصالك بالإنترنت.',

    // Analytics Page
    an_h: 'التحليلات والاتجاهات الزمنية',
    an_p: 'الاتجاهات طويلة المدى، التوزيع الموسمي، وقدرة الإشعاع الحراري (FRP) عبر سجلي MODIS وVIIRS مع معالجة واضحة لانقطاع بيانات عام 2012.',
    an_card_total: 'إجمالي الرصدات',
    an_card_mean: 'متوسط قدرة الإشعاع',
    an_card_median: 'وسيط قدرة الإشعاع',
    an_card_peak: 'شهر الذروة',
    an_card_years: 'سنوات الرصد',
    an_card_trend: 'الاتجاه المنسق (MODIS)',
    an_yearly_title: 'النشاط السنوي للحرائق وإشكالية عام 2012',
    an_yearly_desc: 'توضح الأعمدة المتراكبة الرصد السنوي لكل من MODIS (برتقالي) وVIIRS (أحمر). الخط المنقط في 2012 يعكس إطلاق VIIRS — الارتفاع الحاد هو أثر لدقة المستشعر وليس زيادة في الحرائق الفعلية.',
    an_monthly_title: 'الموسمية الزراعية (الدلتا مقابل الصعيد)',
    an_monthly_desc: 'التجميع الشهري يُظهر بوضوح موسم حرق المخلفات الزراعية الرئيسي في مصر خلال شهري أكتوبر ونوفمبر (قش الأرز في الدلتا) والذروة الثانوية في أبريل ومايو (تبن القمح).',
    an_frp_title: 'توزيع قدرة الإشعاع الحراري (FRP)',
    an_frp_desc: 'التوزيع اللوغاريتمي الطبيعي للطاقة الحرارية المشعة (ميغاواط). السواد الأعظم من الحرائق ناتج عن حرق زراعي محدود الحجم (الوسيط ~5 ميغاواط).',
    an_crop_title: 'التقويم الزراعي لحرق المخلفات في دلتا النيل',
    an_crop_desc: 'التوافق مع الأنشطة الحقلية: احتراق قش الأرز يولّد نوبات دخان كثيفة ومركزة (أكتوبر–ديسمبر)، بينما يتسبب تنظيف مخلفات القمح في طفرة ثانوية في أبريل–مايو.',
    an_calib_title: 'مصفوفة التنسيق والمعايرة بين المستشعرين',
    an_calib_desc: 'محسوبة للفترة المتزامنة 2012–2024 على طول مضلع وادي النيل والدلتا:',
    an_upload_title: 'تحميل بيانات NASA FIRMS الحقيقية (ملف CSV)',
    an_upload_desc: 'قم برفع ملفات CSV القياسية من NASA FIRMS (سواء MODIS أو VIIRS). سيتم تلقائياً تصفية واستبعاد أي رصدات خارج مضلع النيل المحدد.',
    an_upload_btn: 'رفع ملف FIRMS CSV',
    an_reset_btn: 'استعادة النموذج المعياري',

    // Sensors Page
    se_h: 'مقارنة المستشعرات: MODIS مقابل VIIRS',
    se_p: 'تحليل متعمق في فيزياء الاستشعار عن بعد، وهندسة المدارات، والدقة المكانية، ولماذا تتطلب الاستمرارية العلمية تنسيقاً دقيقاً.',
    se_card_modis_title: 'MODIS (قمرَي Terra وAqua)',
    se_card_viirs_title: 'VIIRS (قمرَي Suomi NPP وNOAA-20)',
    se_overlap_title: 'فترة التداخل المتزامن (2012–2024)',
    se_overlap_desc: 'عند مقارنة نفس الرقعة الجغرافية في نفس الفترة: يرصد VIIRS حرائق أكثر بـ 3 إلى 4 أضعاف لأن بكسل 375م يعزل الحرائق الصغيرة التي يخففها بكسل 1كم.',
    se_res_title: 'فيزياء الرصد دون البكسل',
    se_res_desc: 'بكسل MODIS واحد (1 كم²) يعادل حوالي 7 بكسلات لـ VIIRS (375 م). حريق زراعي بمساحة 200 م² يمثل 0.02% فقط من بكسل MODIS، ولكنه يمثل 0.14% من بكسل VIIRS فيسهل رصده.',
    se_prob_title: 'إشكالية انقطاع بيانات 2012',

    // Methodology Page
    me_h: 'المنهجية العلمية ومعمارية البيانات',
    me_p: 'توثيق علمي شفاف لمسار معالجة البيانات، ومضلع النطاق الجغرافي، والمعادلات الإشعاعية، واختبارات الجودة والتنسيق.',
    me_pipe_title: 'مسار معالجة البيانات',
    me_bounds_title: 'منطقة الدراسة والمضلع الجغرافي',
    me_qa_title: 'ضمان الجودة واستبعاد الإنذارات الكاذبة',
    me_frp_title: 'المعادلة الفيزيائية لقدرة الإشعاع (FRP)',
    me_limit_title: 'الشفافية والحدود المنهجية',
    me_refs_title: 'المراجع والأوراق العلمية المحكمة',

    // About Page
    ab_h: 'عن مشروع تناغم الحرائق (Fire Harmony)',
    ab_p: 'مشروع لتحدي ناسا لتطبيقات الفضاء (NASA Space Apps Challenge) يهدف إلى تقديم رصد فضائي شفاف وموثوق علمياً للحرائق على طول وادي النيل والدلتا.',
    ab_mission_title: 'رسالة المشروع',
    ab_obj_title: 'الأهداف الاستراتيجية',
    ab_study_title: 'جغرافية منطقة الدراسة',
    ab_sources_title: 'مصادر البيانات المعتمدة',
    ab_tech_title: 'حزمة التقنيات والتصميم',
    ab_ack_title: 'شكر وتقدير',

    footer: 'مشروع تناغم الحرائق (Fire Harmony) · تحدي تطبيقات الفضاء من ناسا. بيانات الرصد مستوحاة من أرشيف NASA FIRMS ومرصد الأرض التابع لناسا. منطقة الدراسة: وادي النيل والدلتا، مصر.'
  }
};

let LANG = 'en';

const t = (key, fallback) => (I18N[LANG] && I18N[LANG][key]) ?? (I18N.en && I18N.en[key]) ?? fallback ?? key;

function applyLang(lang) {
  LANG = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const val = t(el.dataset.i18n);
    if (val) el.textContent = val;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    const val = t(el.dataset.i18nAria);
    if (val) el.setAttribute('aria-label', val);
  });
  const langBtn = $('lang');
  if (langBtn) {
    langBtn.textContent = lang === 'ar' ? 'English' : 'العربية';
    langBtn.lang = lang === 'ar' ? 'en' : 'ar';
    langBtn.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التحويل إلى العربية');
  }
  try { localStorage.setItem('fh-lang', lang); } catch (e) {}
  document.dispatchEvent(new Event('langchange'));
}
