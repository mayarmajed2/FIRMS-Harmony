/* hero.js: Cinematic animated Earth-observation hero visual for FIRMS Harmony.
   Depicts an abstract planet Earth with atmospheric Fresnel glow, Nile corridor highlight,
   two interlocking satellite orbits (MODIS cyan & VIIRS thermal orange), animated satellite
   nodes, pulsating thermal hotspots, and floating Mission Control telemetry badges. */

function drawHero() {
  const host = $('heroSvg');
  if (!host) return;
  const isAr = typeof LANG !== 'undefined' && LANG === 'ar';

  const lblModis = isAr ? 'MODIS · 1 كم' : 'MODIS · 1 km';
  const lblViirs = isAr ? 'VIIRS · 375 م' : 'VIIRS · 375 m';
  const lblSync  = isAr ? 'التنسيق الموحّد · MAE −54%' : 'HARMONIZED · MAE −54%';
  const lblRegion = isAr ? 'ممر النيل والدلتا' : 'NILE CORRIDOR · 24°–31.6°N';

  host.innerHTML = `
  <div class="hero-visual">
    <svg viewBox="0 0 520 520" role="img" aria-label="${t('hero_aria')}" class="earth-svg">
      <defs>
        <radialGradient id="atmoGlow" cx="50%" cy="50%" r="50%">
          <stop offset="56%" stop-color="#00D9FF" stop-opacity="0.22"/>
          <stop offset="76%" stop-color="#287BFF" stop-opacity="0.10"/>
          <stop offset="100%" stop-color="#050B18" stop-opacity="0"/>
        </radialGradient>

        <radialGradient id="earthSphere" cx="38%" cy="34%" r="66%">
          <stop offset="0%" stop-color="#143058"/>
          <stop offset="48%" stop-color="#0A1B38"/>
          <stop offset="85%" stop-color="#061024"/>
          <stop offset="100%" stop-color="#030712"/>
        </radialGradient>

        <radialGradient id="earthRim" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stop-color="#00D9FF" stop-opacity="0"/>
          <stop offset="96%" stop-color="#00D9FF" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="#287BFF" stop-opacity="0.75"/>
        </radialGradient>

        <linearGradient id="orbitCyan" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#00D9FF" stop-opacity="0.95"/>
          <stop offset="50%" stop-color="#287BFF" stop-opacity="0.55"/>
          <stop offset="100%" stop-color="#00D9FF" stop-opacity="0.12"/>
        </linearGradient>

        <linearGradient id="orbitThermal" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#FF7139" stop-opacity="0.18"/>
          <stop offset="50%" stop-color="#FF7139" stop-opacity="0.9"/>
          <stop offset="100%" stop-color="#FFB547" stop-opacity="1"/>
        </linearGradient>

        <radialGradient id="hotGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#FFB547" stop-opacity="0.9"/>
          <stop offset="50%" stop-color="#FF7139" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#FF7139" stop-opacity="0"/>
        </radialGradient>

        <clipPath id="globeClip">
          <circle cx="260" cy="260" r="142"/>
        </clipPath>
      </defs>

      <!-- Outer atmospheric halo -->
      <circle cx="260" cy="260" r="236" fill="url(#atmoGlow)"/>

      <!-- Subtle telemetry reticle rings -->
      <circle cx="260" cy="260" r="196" fill="none" stroke="#00D9FF" stroke-opacity="0.09" stroke-dasharray="3 7"/>
      <circle cx="260" cy="260" r="228" fill="none" stroke="#287BFF" stroke-opacity="0.07"/>

      <!-- Back half of orbital rings -->
      <ellipse cx="260" cy="260" rx="212" ry="74" fill="none" stroke="#00D9FF" stroke-opacity="0.22" stroke-width="1.5" transform="rotate(-26 260 260)"/>
      <ellipse cx="260" cy="260" rx="204" ry="70" fill="none" stroke="#FF7139" stroke-opacity="0.22" stroke-width="1.5" transform="rotate(28 260 260)"/>

      <!-- Earth Sphere -->
      <circle cx="260" cy="260" r="142" fill="url(#earthSphere)"/>

      <!-- Globe Grid & Stylized Nile Corridor inside clip -->
      <g clip-path="url(#globeClip)">
        <!-- Lat/Lon Graticule -->
        <g stroke="#00D9FF" stroke-opacity="0.10" stroke-width="1" fill="none">
          <ellipse cx="260" cy="260" rx="142" ry="38"/>
          <ellipse cx="260" cy="260" rx="142" ry="86"/>
          <ellipse cx="260" cy="260" rx="52" ry="142"/>
          <ellipse cx="260" cy="260" rx="104" ry="142"/>
          <line x1="118" y1="260" x2="402" y2="260"/>
          <line x1="260" y1="118" x2="260" y2="402"/>
        </g>

        <!-- Abstract NE Africa / Mediterranean Landmass Contour -->
        <path d="M 168 185 C 195 178, 232 184, 268 188 C 296 191, 326 196, 354 214 L 368 292 C 345 344, 298 378, 240 384 L 178 345 Z"
              fill="#0E2547" fill-opacity="0.62" stroke="#287BFF" stroke-opacity="0.22" stroke-width="1"/>

        <!-- Glowing Nile River & Delta Corridor -->
        <path d="M 278 358 C 276 328, 266 306, 268 282 C 270 256, 260 236, 258 214"
              fill="none" stroke="#00D9FF" stroke-width="8" stroke-opacity="0.16" stroke-linecap="round"/>
        <path d="M 278 358 C 276 328, 266 306, 268 282 C 270 256, 260 236, 258 214 M 258 214 C 246 202, 238 194, 228 184 M 258 214 C 270 202, 282 194, 292 184"
              fill="none" stroke="#00D9FF" stroke-width="2.2" stroke-linecap="round"/>

        <!-- Thermal Hotspot Cluster in Nile Delta & Valley -->
        <circle cx="256" cy="204" r="24" fill="url(#hotGlow)"/>
        <circle cx="256" cy="204" r="3.5" fill="#FFB547"/>
        <circle cx="256" cy="204" r="4" fill="none" stroke="#FF7139" stroke-width="1.6" class="ping"/>

        <circle cx="242" cy="196" r="2.6" fill="#FF7139"/>
        <circle cx="242" cy="196" r="3" fill="none" stroke="#FFB547" stroke-width="1.2" class="ping" style="animation-delay:.7s"/>

        <circle cx="272" cy="199" r="2.8" fill="#FFB547"/>
        <circle cx="272" cy="199" r="3" fill="none" stroke="#FF7139" stroke-width="1.2" class="ping" style="animation-delay:1.3s"/>

        <circle cx="268" cy="278" r="2.5" fill="#FF7139"/>
        <circle cx="268" cy="278" r="3" fill="none" stroke="#FF7139" stroke-width="1.2" class="ping" style="animation-delay:1.9s"/>

        <!-- MODIS 1 km square footprint indicator -->
        <rect x="249" y="197" width="14" height="14" fill="#00D9FF" fill-opacity="0.14" stroke="#00D9FF" stroke-width="1.2" rx="2"/>
      </g>

      <!-- Atmospheric Fresnel Rim -->
      <circle cx="260" cy="260" r="142" fill="url(#earthRim)" stroke="#00D9FF" stroke-opacity="0.38" stroke-width="1.2"/>

      <!-- Front Sweeping Orbital Pathways -->
      <path d="M 70 353 A 212 74 -26 0 0 450 167" fill="none" stroke="url(#orbitCyan)" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M 80 164 A 204 70 28 0 1 440 356" fill="none" stroke="url(#orbitThermal)" stroke-width="2.4" stroke-linecap="round"/>

      <!-- Harmonization Convergence Beams -->
      <line x1="122" y1="186" x2="256" y2="204" stroke="#00D9FF" stroke-opacity="0.45" stroke-width="1.2" stroke-dasharray="4 4" class="flow"/>
      <line x1="404" y1="190" x2="256" y2="204" stroke="#FFB547" stroke-opacity="0.5" stroke-width="1.2" stroke-dasharray="4 4" class="flow"/>

      <!-- Animated MODIS Satellite Node (Cyan) -->
      <g class="sat-orbit-a">
        <circle cx="122" cy="186" r="11" fill="#00D9FF" fill-opacity="0.20"/>
        <rect x="115" y="182" width="14" height="8" rx="2" fill="#00D9FF" stroke="#050B18" stroke-width="1.2"/>
        <line x1="106" y1="186" x2="115" y2="186" stroke="#287BFF" stroke-width="2.5" stroke-linecap="round"/>
        <line x1="129" y1="186" x2="138" y2="186" stroke="#287BFF" stroke-width="2.5" stroke-linecap="round"/>
      </g>

      <!-- Animated VIIRS Satellite Node (Thermal Gold/Orange) -->
      <g class="sat-orbit-b">
        <circle cx="404" cy="190" r="11" fill="#FFB547" fill-opacity="0.22"/>
        <circle cx="404" cy="190" r="5" fill="#FFB547" stroke="#050B18" stroke-width="1.3"/>
        <line x1="392" y1="185" x2="399" y2="188" stroke="#FF7139" stroke-width="2.4" stroke-linecap="round"/>
        <line x1="409" y1="192" x2="416" y2="195" stroke="#FF7139" stroke-width="2.4" stroke-linecap="round"/>
      </g>
    </svg>

    <!-- Floating Mission Control Telemetry Pills -->
    <div class="hud-pill hud-pill--tl"><i class="dot dot--cyan"></i><span>${lblModis}</span></div>
    <div class="hud-pill hud-pill--tr"><i class="dot dot--orange"></i><span>${lblViirs}</span></div>
    <div class="hud-pill hud-pill--bl"><i class="dot dot--gold"></i><span>${lblSync}</span></div>
    <div class="hud-pill hud-pill--br"><span>${lblRegion}</span></div>
  </div>`;
}

drawHero();
document.addEventListener('langchange', drawHero);
