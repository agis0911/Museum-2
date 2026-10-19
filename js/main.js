/* Reclaiming Identity — interactions
   1. Artifact reveal (click / keyboard) with spotlight pulse
   2. Butterfly scroll sequence (descent → wing unfold → journal reveal)
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

  /* ---------- Hero split ---------- */
  /* As the visitor scrolls away from the opening painting, the two figures
     part ways — the Indigenous figure to the left, the government figure
     to the right. Clean horizontal motion, scrubbed by scroll. */
  var heroScene = document.querySelector('.hero__scene');
  if (heroScene && !reducedMotion) {
    function heroSplit() {
      var vh = window.innerHeight;
      /* the hero is pinned for the first part of the scroll —
         the figures part ways over the first 60% of that phase */
      var span = vh * 0.6;
      var p = Math.max(0, Math.min(1, window.scrollY / span));
      heroScene.style.setProperty('--split', p.toFixed(4));
    }
    heroSplit();
    window.addEventListener('scroll', heroSplit, { passive: true });
    window.addEventListener('resize', heroSplit);
  }

  /* ---------- Station reveal (button + artifact click) ---------- */
  var stations = Array.prototype.slice.call(document.querySelectorAll('[data-station]'));

  stations.forEach(function (station) {
    var btns = station.querySelectorAll('.reveal-btn, .artifact');
    var story = station.querySelector('.story');

    story.setAttribute('aria-hidden', 'true');

    function setOpen(open) {
      station.classList.toggle('revealed', open);
      story.classList.toggle('revealed', open);
      story.setAttribute('aria-hidden', open ? 'false' : 'true');
      btns.forEach(function (b) {
        b.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
      if (open) {
        /* measured height so the full text is never clipped */
        story.style.maxHeight = story.scrollHeight + 'px';
        story.addEventListener('transitionend', function onEnd(e) {
          if (e.propertyName === 'max-height' && story.classList.contains('revealed')) {
            story.style.maxHeight = 'none';
          }
          story.removeEventListener('transitionend', onEnd);
        });
      } else if (story.style.maxHeight === 'none') {
        story.style.maxHeight = story.scrollHeight + 'px';
        requestAnimationFrame(function () { story.style.maxHeight = ''; });
      }
    }

    function toggle() {
      var open = !station.classList.contains('revealed');
      setOpen(open);
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

    /* reduced motion: everything open, states truthful */
    if (reducedMotion) setOpen(true);
  });

  /* ---------- Station scroll-in (opacity only) ---------- */
  var toReveal = Array.prototype.slice.call(document.querySelectorAll('.station'));
  if ('IntersectionObserver' in window && !reducedMotion) {
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
  var journal = document.getElementById('transitionJournal');

  if (!transitionSection || !butterflyBtn) return;

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function smooth(t) { return t * t * (3 - 2 * t); }

  var lastP = 0;
  var animating = false;

  function render(p) {
    /* Phase map (0 → 1 across the 300vh section):
       0.00–0.55  butterfly descends from upper right to centre
       0.50–0.85  wings unfold
       0.60–1.00  butterfly drifts upward, journal text revealed */
    var descent = smooth(clamp01(p / 0.55));
    var unfold = smooth(clamp01((p - 0.5) / 0.35));
    var aura = smooth(clamp01((p - 0.6) / 0.3));

    var x = (1 - descent) * 26;                 /* vw */
    var y = (1 - descent) * -34 - aura * 13;    /* vh */
    var scale = 0.55 + descent * 0.45 - aura * 0.12;

    butterflyBtn.style.setProperty('--butterfly-transform',
      'translate(' + x + 'vw, ' + y + 'vh) scale(' + scale + ')');
    butterfly.style.setProperty('--fold', (0.14 + unfold * 0.86).toFixed(4));
    butterfly.style.setProperty('--aura-opacity', (aura * 0.9).toFixed(4));

    if (journal) {
      journal.style.setProperty('--journal-opacity', aura.toFixed(4));
      journal.setAttribute('aria-hidden', aura > 0.05 ? 'false' : 'true');
    }
    if (hint) hint.style.setProperty('--hint-opacity', (1 - aura).toFixed(4));
    if (intro) intro.style.setProperty('--intro-opacity', (1 - aura * 1.4).toFixed(4));
  }

  function update() {
    if (animating) return;
    var rect = transitionSection.getBoundingClientRect();
    var total = rect.height - window.innerHeight;
    var p = clamp01(-rect.top / (total || 1));
    lastP = p;
    render(p);
  }

  if (reducedMotion) {
    /* Static, open, centred — the journal sits below the butterfly */
    butterflyBtn.style.setProperty('--butterfly-transform', 'translate(0,0) scale(1)');
    butterfly.style.setProperty('--fold', 1);
    butterfly.style.setProperty('--aura-opacity', 0.9);
    render(1);
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

  /* Click / keyboard: the butterfly completes the reveal, then leads on */
  butterflyBtn.addEventListener('click', function () {
    var target = document.getElementById('reflection');
    function go() {
      if (target) target.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }

    if (reducedMotion || lastP > 0.92) { go(); return; }

    /* advance the same sequence: unfold wings → reveal journal → continue */
    animating = true;
    var from = lastP;
    var start = null;
    var dur = 1100;

    function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
    function step(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / dur);
      var p = from + (1 - from) * easeOut(t);
      lastP = p;
      render(p);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        animating = false;
        lastP = 1;
        setTimeout(go, 250);
      }
    }
    requestAnimationFrame(step);
  });
})();
