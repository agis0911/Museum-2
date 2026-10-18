/* Reclaiming Identity — interactions
   1. Artifact reveal (click / keyboard) with spotlight pulse
   2. Butterfly scroll sequence (descent → wing unfold → glow)
   3. Header state + station scroll-in reveals
   Progressive: without JS, all text stays visible. */

(function () {
  'use strict';

  var html = document.documentElement;
  html.classList.add('js');

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header ---------- */
  var header = document.getElementById('siteHeader');
  function headerState() {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }
  headerState();
  window.addEventListener('scroll', headerState, { passive: true });

  /* ---------- Station reveal (button + artifact click) ---------- */
  var stations = Array.prototype.slice.call(document.querySelectorAll('[data-station]'));

  stations.forEach(function (station) {
    var btns = station.querySelectorAll('.reveal-btn, .artifact');
    var story = station.querySelector('.story');

    function toggle() {
      var open = station.classList.toggle('revealed');
      story.classList.toggle('revealed', open);
      btns.forEach(function (b) {
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      if (open && !reducedMotion) {
        var artifact = station.querySelector('.artifact');
        if (artifact) {
          artifact.classList.remove('is-pulsed');
          void artifact.offsetWidth; /* restart animation */
          artifact.classList.add('is-pulsed');
        }
      }
    }

    btns.forEach(function (b) { b.addEventListener('click', toggle); });
  });

  /* ---------- Station scroll-in (opacity only) ---------- */
  var toReveal = Array.prototype.slice.call(document.querySelectorAll('.station'));
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.18 });
    toReveal.forEach(function (el) { io.observe(el); });
  } else {
    toReveal.forEach(function (el) { el.classList.add('in-view'); });
  }

  /* ---------- Butterfly sequence ---------- */
  var transitionSection = document.getElementById('transformation');
  var butterflyBtn = document.getElementById('butterflyBtn');
  var butterfly = document.getElementById('butterfly');
  var hint = document.getElementById('transitionHint');
  var intro = document.querySelector('.transition__intro');

  if (!transitionSection || !butterflyBtn) return;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  function render(p) {
    /* Phase map (0 → 1 across the 300vh section):
       0.00–0.55  butterfly descends from upper right to centre
       0.50–0.85  wings unfold
       0.60–1.00  aura glow grows, hint fades, intro fades */
    var descent = smooth(clamp01(p / 0.55));
    var unfold = smooth(clamp01((p - 0.5) / 0.35));
    var aura = smooth(clamp01((p - 0.6) / 0.3));

    var x = (1 - descent) * 26;   /* vw */
    var y = (1 - descent) * -34;  /* vh */
    var scale = 0.55 + descent * 0.45;

    butterflyBtn.style.setProperty('--butterfly-transform',
      'translate(' + x + 'vw, ' + y + 'vh) scale(' + scale + ')');
    butterfly.style.setProperty('--fold', (0.14 + unfold * 0.86).toFixed(4));
    butterfly.style.setProperty('--aura-opacity', (aura * 0.9).toFixed(4));

    if (hint) hint.style.setProperty('--hint-opacity', (1 - aura).toFixed(4));
    if (intro) intro.style.setProperty('--intro-opacity', (1 - aura * 1.4).toFixed(4));
  }

  function update() {
    if (reducedMotion) return;
    var rect = transitionSection.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = clamp01(-rect.top / (total || 1));
    render(p);
  }

  if (reducedMotion) {
    /* Static, open, centred — sequence already visible */
    butterflyBtn.style.setProperty('--butterfly-transform', 'translate(0,0) scale(1)');
    butterfly.style.setProperty('--fold', 1);
    butterfly.style.setProperty('--aura-opacity', 0.9);
  } else {
    render(0);
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { update(); ticking = false; });
      }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* Click / keyboard: butterfly leads to the reflection */
  butterflyBtn.addEventListener('click', function () {
    var target = document.getElementById('reflection');
    if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  });
})();
