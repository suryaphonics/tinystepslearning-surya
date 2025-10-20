/* ===== TinySteps main JS (v2 — polished with Primeramed-like motion) ===== */
'use strict';

/* ---------- Page fade-in / fade-out ---------- */
document.body.classList.add('fade-page');
window.addEventListener('load', () => {
  document.body.classList.add('loaded');
});
document.addEventListener('click', (ev) => {
  const a = ev.target.closest('a[href]');
  if (!a) return;
  if (a.target === '_blank' || a.getAttribute('href').startsWith('#')) return;
  ev.preventDefault();
  document.body.classList.remove('loaded');
  setTimeout(() => (window.location = a.href), 400);
});
window.addEventListener('beforeunload', () => {
  document.body.classList.remove('loaded');
});

/* ---------- Footer year ---------- */
const y = document.getElementById('y');
if (y) y.textContent = new Date().getFullYear();

/* ---------- Hero background safety ---------- */
function ensureHeroBG() {
  const bg = document.querySelector('.hero-bg');
  if (!bg) return;
  const styleBG = bg.style.backgroundImage;
  const computedBG = getComputedStyle(bg).backgroundImage;
  if (!styleBG.includes('url(') && !computedBG.includes('url(')) {
    bg.style.backgroundImage = "url('./assets/images/mainbg.jpg')";
  }
}
document.addEventListener('DOMContentLoaded', ensureHeroBG);

/* ---------- Scroll effects (header, hero parallax, hero fade) ---------- */
(() => {
  const bg = document.querySelector('.hero-bg');
  const header = document.querySelector('.site-header');
  const heroText = document.querySelector('.hero-content');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY || 0;

      if (header) header.classList.toggle('scrolled', y > 20);

      if (bg && !prefersReduced) {
        bg.style.transform = `scale(${1 + y / 4000}) translateY(${y * 0.15}px)`;
      }

      if (heroText && !prefersReduced) {
        const fadePoint = 250;
        const op = Math.max(0, 1 - y / fadePoint);
        heroText.style.opacity = op.toFixed(2);
      }

      ticking = false;
    });
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();

/* ---------- IntersectionObserver reveal (Primeramed cascade) ---------- */
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const revealEls = document.querySelectorAll('.slide-in, .course-card, .why-card, .courses, .why, .lead-capture');

if ('IntersectionObserver' in window && !prefersReduced) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      const i = [...entry.target.parentElement.children].indexOf(entry.target);
      entry.target.style.transitionDelay = i * 90 + 'ms';
      entry.target.classList.add('visible');
      io.unobserve(entry.target);
    });
  }, { threshold: 0.2 });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('visible'));
}

/* ---------- Fallback typewriter if CSS disabled ---------- */
(function typewriterFallback() {
  const h1 = document.querySelector('.hero-content h1');
  if (!h1) return;
  const cssTypingApplied = getComputedStyle(h1).borderRightStyle !== 'none';
  if (cssTypingApplied) return;
  const text = h1.textContent.trim();
  h1.textContent = '';
  let i = 0;
  (function tick() {
    if (i <= text.length) {
      h1.textContent = text.slice(0, i++);
      setTimeout(tick, 34);
    }
  })();
})();

/* ---------- WhatsApp widget ---------- */
(() => {
  // ensure single widget
  const widgets = document.querySelectorAll('#whatsapp-widget');
  if (widgets.length > 1) {
    widgets.forEach((w, i) => { if (i < widgets.length - 1) w.remove(); });
  }
})();

const widget = document.getElementById('whatsapp-widget');
const closeBtn = document.getElementById('popup-close');
const openBtn = document.getElementById('whatsapp-btn');

if (widget && !sessionStorage.getItem('waDismissed')) {
  setTimeout(() => widget.classList.add('show-popup'), 3000);
}

closeBtn?.addEventListener('click', () => {
  widget?.classList.remove('show-popup');
  stopFlashing();
  sessionStorage.setItem('waDismissed', '1');
});
openBtn?.addEventListener('click', () => {
  widget?.classList.toggle('show-popup');
  if (widget.classList.contains('show-popup')) maybeStartFlash();
  else stopFlashing();
});

/* ---------- Browser tab flash ---------- */
let defaultTitle = document.title;
let flashInterval = null;

function startFlashing(title = '🚀 New Message!') {
  if (flashInterval) return;
  let toggle = false;
  flashInterval = setInterval(() => {
    document.title = toggle ? title : defaultTitle;
    toggle = !toggle;
  }, 1600);
}
function stopFlashing() {
  if (!flashInterval) return;
  clearInterval(flashInterval);
  flashInterval = null;
  document.title = defaultTitle;
}
function maybeStartFlash() {
  if (document.hidden && widget?.classList.contains('show-popup')) startFlashing();
}
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) stopFlashing();
  else maybeStartFlash();
});
setTimeout(maybeStartFlash, 3200);

/* ---------- Smooth section entry (Primeramed feel) ---------- */
(() => {
  const sections = document.querySelectorAll('section');
  sections.forEach((s) => {
    s.style.transition = 'opacity 1s ease, transform 1s ease';
    s.style.opacity = 0;
    s.style.transform = 'translateY(40px)';
  });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.opacity = 1;
        e.target.style.transform = 'translateY(0)';
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  sections.forEach((s) => io.observe(s));
})();
/* ---------- Momentum / Inertia Scroll (desktop-only, safe for fixed UI) ---------- */
(() => {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarse = window.matchMedia('(pointer: coarse)').matches;   // touch screens
  const narrow = window.matchMedia('(max-width: 1024px)').matches;   // tablets/phones
  const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  // Disable custom smooth scrolling on mobile/tablet/touch/iOS or if reduced motion
  if (prefersReduced || isCoarse || narrow || iOS) return;

  const scrollContainer = document.getElementById('scroll-container');
  if (!scrollContainer) return;

  // Ensure the container sits behind fixed overlays
  scrollContainer.style.position = 'relative';
  scrollContainer.style.zIndex = '0';
  scrollContainer.style.willChange = 'transform';

  const setBodyHeight = () => {
    // Use scrollHeight to capture full document height accurately
    document.body.style.height = scrollContainer.scrollHeight + 'px';
  };
  setBodyHeight();
  let resizeRaf = null;
  window.addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(setBodyHeight);
  });

  let current = 0;
  const ease = 0.08; // smaller = smoother
  function smoothScroll() {
    const target = window.scrollY;
    current += (target - current) * ease;
    // translate only the content wrapper; fixed elements remain pinned to viewport
    scrollContainer.style.transform = `translate3d(0, ${-current}px, 0)`;
    requestAnimationFrame(smoothScroll);
  }
  smoothScroll();
})();

