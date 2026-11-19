/* motion.js: Lightweight GPU-friendly starfield canvas & IntersectionObserver scroll reveals.
   Automatically respects prefers-reduced-motion. */

(function () {
  'use strict';

  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── 1. Subtle Deep-Space Starfield Canvas ── */
  function initStarfield() {
    const canvas = document.getElementById('starfield');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = 0, H = 0, stars = [], rafId = null;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(Math.floor((W * H) / 14000), 110);
      stars = [];
      let s = 1337;
      const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
      for (let i = 0; i < count; i++) {
        stars.push({
          x: rnd() * W,
          y: rnd() * H,
          r: 0.55 + rnd() * 1.35,
          a: 0.18 + rnd() * 0.55,
          vx: (rnd() - 0.5) * 0.08,
          vy: -0.03 - rnd() * 0.08,
          phase: rnd() * Math.PI * 2,
          tint: rnd() > 0.78 ? '#00D9FF' : (rnd() > 0.9 ? '#FFB547' : '#F4F8FF')
        });
      }
    }

    function drawFrame(t) {
      ctx.clearRect(0, 0, W, H);
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        if (!reduced()) {
          st.x += st.vx;
          st.y += st.vy;
          if (st.y < -4) st.y = H + 4;
          if (st.x < -4) st.x = W + 4;
          if (st.x > W + 4) st.x = -4;
        }
        const twinkle = reduced() ? 1 : (0.65 + 0.35 * Math.sin(t * 0.0014 + st.phase));
        ctx.globalAlpha = st.a * twinkle;
        ctx.fillStyle = st.tint;
        ctx.beginPath();
        ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduced()) {
        rafId = requestAnimationFrame(drawFrame);
      }
    }

    resize();
    if (reduced()) {
      drawFrame(0);
    } else {
      rafId = requestAnimationFrame(drawFrame);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        if (reduced()) drawFrame(0);
      }, 150);
    });
  }

  /* ── 2. Scroll-Reveal Staggered Entrances ── */
  function initReveals() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;
    if (reduced() || typeof IntersectionObserver === 'undefined') {
      els.forEach(el => el.classList.add('in'));
      return;
    }
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -30px 0px' });

    els.forEach(el => io.observe(el));

    const checkVisible = () => {
      const vh = window.innerHeight || 800;
      els.forEach(el => {
        if (el.classList.contains('in')) return;
        const rect = el.getBoundingClientRect();
        if (rect.height > 0 && rect.top < vh * 0.95) {
          el.classList.add('in');
          io.unobserve(el);
        }
      });
    };
    window.addEventListener('hashchange', () => requestAnimationFrame(checkVisible));
    requestAnimationFrame(checkVisible);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { initStarfield(); initReveals(); });
  } else {
    initStarfield();
    initReveals();
  }
})();
