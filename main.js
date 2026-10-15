/*
  main.js - motion and interaction for MasterPiece Tailor

  Stack (all from CDNs, pinned versions, see index.html):
    Lenis 1.3.26        smooth scroll, driven from GSAP's ticker (one rAF loop)
    GSAP 3.13.0         ScrollTrigger (pins, scrubs) and SplitText (masked reveals)
    charts.js           Bklit-style charts
    threads.js          scroll-scrubbed vector background

  Everything degrades: without GSAP the page is plain, readable HTML; with
  prefers-reduced-motion the page uses native scroll, no pins and no scrubs.
*/
(function () {
  'use strict';

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var hasGsap = !!(window.gsap && window.ScrollTrigger);
  var hasSplit = hasGsap && !!window.SplitText;
  var WA = { kj: '60175253023', cj: '60175063023', main: '60174582366' };
  var BRANCH_NAME = { kj: 'Kelana Jaya', cj: 'Cyberjaya' };
  var app = { lenis: null, menuOpen: false };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function pad(n) { return n < 10 ? '0' + n : String(n); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var menu = $('#menu');
  var toggle = $('.nav__toggle');
  var HOURS = { 0: [11, 20], 1: [11, 20], 2: [11, 20], 3: [11, 20], 4: [11, 20], 5: [11, 19], 6: null };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var marqueeTween = null;

  /* ======================================================================
     Features that work with or without GSAP
     ====================================================================== */
  initAnchors();
  initMenu();
  initFaq();
  initForm();
  initHours();
  initOffersClock();
  initExpiry();
  setYear();

  if (!hasGsap) {
    var pre = $('.preloader');
    if (pre) pre.remove();
    root.classList.add('is-ready', 'motion-fail');
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  if (hasSplit) gsap.registerPlugin(SplitText);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- Lenis, driven by GSAP's ticker ---------- */
  if (window.Lenis && !reduce) {
    app.lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.2 });
    app.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (t) { app.lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    app.lenis.stop();
  }

  /* ---------- Vector background ---------- */
  var scenes = $$('.scene');
  if (window.Threads) {
    Threads.init($('#threads'), { scenes: scenes.map(function (s) { return s.dataset.scene; }), reduce: reduce });
    Threads.progress(0);
  }

  /* ---------- Boot: preloader, then build scroll scenes ---------- */
  // Wait for the actual web fonts (not just document.fonts.ready, which can resolve
  // before the Google Fonts files start loading), capped so a slow network never blocks.
  var fontsReady = (function () {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var faces = ['400 1em "Bodoni Moda"', 'italic 400 1em "Bodoni Moda"', '400 1em Manrope', '600 1em Manrope', '500 1em "JetBrains Mono"'];
    var loads = Promise.all(faces.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
    var cap = new Promise(function (r) { setTimeout(r, 3000); });
    return Promise.race([loads, cap]);
  })();

  // SplitText masks clip with overflow; give descenders (g, y, p) room to breathe.
  function padMasks(split) {
    (split && split.masks ? split.masks : []).forEach(function (m) {
      m.style.paddingBottom = '0.16em';
      m.style.marginBottom = '-0.16em';
    });
    return split;
  }
  var heroImg = $('.hero__img');
  var heroIntro = null;

  runPreloader(function () {
    root.classList.add('is-ready');
    if (app.lenis) app.lenis.start();
    if (heroIntro) heroIntro.play();
  });

  fontsReady.then(function () {
    heroIntro = prepareHero();
    buildScroll();
  });

  window.addEventListener('load', function () { ScrollTrigger.refresh(); });

  /* ======================================================================
     Preloader
     ====================================================================== */
  function imgReady(img) {
    if (!img) return Promise.resolve();
    if (img.complete) return img.decode ? img.decode().catch(function () {}) : Promise.resolve();
    return new Promise(function (r) {
      img.addEventListener('load', r, { once: true });
      img.addEventListener('error', r, { once: true });
    });
  }

  function runPreloader(onDone) {
    var pre = $('.preloader');
    if (!pre || reduce || getComputedStyle(pre).display === 'none') {
      if (pre) pre.remove();
      fontsReady.then(onDone);
      return;
    }
    var seen = false;
    try { seen = sessionStorage.getItem('mp-seen') === '1'; sessionStorage.setItem('mp-seen', '1'); } catch (e) { /* storage blocked */ }

    var paths = $$('.pl-draw', pre);
    paths.forEach(function (p) {
      var L = p.getTotalLength();
      p.style.strokeDasharray = L + ' ' + L;
      p.style.strokeDashoffset = L;
    });
    var fill = $('.pl-fill', pre);
    var countEl = $('[data-count]', pre);
    var counter = { v: 0 };
    function paint() { countEl.textContent = Math.round(counter.v); }
    gsap.set(fill, { opacity: 0, scale: 0.4, transformOrigin: '50% 60%' });
    gsap.from('.preloader__word', { opacity: 0, y: 8, duration: 0.8, ease: 'power3.out', delay: 0.2 });

    var intro = gsap.timeline();
    intro.to(paths, { strokeDashoffset: 0, duration: seen ? 0.5 : 1.2, ease: 'power2.inOut', stagger: 0.12 }, 0)
      .to(fill, { opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' }, seen ? 0.35 : 1)
      .to(counter, { v: 86, duration: seen ? 0.6 : 1.4, ease: 'power1.out', onUpdate: paint }, 0);
    var introDone = new Promise(function (r) { intro.eventCallback('onComplete', r); });
    var ready = Promise.all([fontsReady, imgReady(heroImg), introDone]);
    var cap = new Promise(function (r) { setTimeout(r, 4000); });

    Promise.race([ready, cap]).then(function () {
      gsap.timeline({ onComplete: function () { pre.remove(); } })
        .to(counter, { v: 100, duration: 0.35, ease: 'power2.out', onUpdate: paint })
        .to('.preloader__inner', { yPercent: -40, opacity: 0, duration: 0.6, ease: 'power3.in' }, '+=0.05')
        .to(pre, { yPercent: -100, duration: 0.95, ease: 'expo.inOut' }, '-=0.3')
        .add(onDone, '-=0.6');
    });
  }

  /* ======================================================================
     Hero
     ====================================================================== */
  function prepareHero() {
    if (reduce) return null;
    var title = $('.hero__title');
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
    var chars = null;
    if (hasSplit) {
      var split = padMasks(SplitText.create(title, { type: 'lines,words,chars', mask: 'lines' }));
      chars = split.chars;
      gsap.set(chars, { yPercent: 118 });
      tl.to(chars, { yPercent: 0, duration: 1.2, stagger: 0.024 }, 0);
    } else {
      gsap.set(title, { y: 40, opacity: 0 });
      tl.to(title, { y: 0, opacity: 1, duration: 1 }, 0);
    }
    gsap.set('[data-hero-fade]', { y: 22, opacity: 0 });
    gsap.set('.hero__img', { scale: 1.32 });
    gsap.set('.nav > *', { y: -14, opacity: 0 });
    tl.to('.hero__curtain', { scaleY: 0, duration: 1.35, ease: 'expo.inOut' }, 0.05)
      .to('.hero__img', { scale: 1, duration: 1.9, ease: 'power3.out' }, 0.1)
      .to('[data-hero-fade]', { y: 0, opacity: 1, duration: 0.95, stagger: 0.1 }, 0.5)
      .to('.nav > *', { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, clearProps: 'transform' }, 0.35);
    // The preloader may already be gone (reduced motion skipped it) - play now in that case
    if (!$('.preloader')) tl.play();
    return tl;
  }

  /* ======================================================================
     Scroll scenes, created in page order
     ====================================================================== */
  function buildScroll() {
    var mm = gsap.matchMedia();
    var desktopMotion = '(min-width: 961px) and (prefers-reduced-motion: no-preference)';
    var mobileMotion = '(max-width: 960px) and (prefers-reduced-motion: no-preference)';

    // Hero scroll-out
    if (!reduce) {
      var heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero__content', { yPercent: -16, opacity: 0.1, ease: 'none', scrollTrigger: heroST });
      gsap.to('.hero__media', { yPercent: -8, ease: 'none', scrollTrigger: heroST });
      gsap.to('.hero__frame', { scale: 0.93, ease: 'none', scrollTrigger: heroST });
    }

    initMarquee();
    initManifesto();
    initSplitHeadings();
    initReveals();

    // Heritage: horizontal pan on desktop, vertical reveals elsewhere
    mm.add(desktopMotion, function () {
      var sec = $('.heritage');
      var track = $('.heritage__track', sec);
      sec.classList.add('is-pan');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
      var pan = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        scrollTrigger: {
          trigger: sec, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 30
        }
      });
      gsap.to('.heritage__progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, scrub: true, invalidateOnRefresh: true, refreshPriority: 29 }
      });
      $$('.h-year__fill', sec).forEach(function (f) {
        gsap.fromTo(f, { clipPath: 'inset(0 100% 0 0)' }, {
          clipPath: 'inset(0 0% 0 0)', ease: 'none',
          scrollTrigger: { trigger: f.parentNode, containerAnimation: pan, start: 'left 88%', end: 'center 50%', scrub: true }
        });
      });
      $$('.h-panel:not(.h-panel--intro)', sec).forEach(function (p) {
        gsap.from(p.querySelectorAll('.h3, p:not(.h-year), li'), {
          y: 34, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out',
          scrollTrigger: { trigger: p, containerAnimation: pan, start: 'left 78%', toggleActions: 'play none none reverse' }
        });
      });
      return function () { sec.classList.remove('is-pan'); };
    });
    mm.add(mobileMotion, function () {
      $$('.h-year__fill').forEach(function (f) {
        gsap.fromTo(f, { clipPath: 'inset(0 100% 0 0)' }, {
          clipPath: 'inset(0 0% 0 0)', ease: 'none',
          scrollTrigger: { trigger: f.parentNode, start: 'top 88%', end: 'top 45%', scrub: true }
        });
      });
    });

    initCraft(mm, desktopMotion, mobileMotion);
    initStack(mm, desktopMotion, mobileMotion);
    initProof();
    initVoices();
    initOffers();
    initVisit();
    initFooter();
    initChrome();
    initSceneSync();
    initMagnetic();
    initVelocity();

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  /* ---------- Marquee (velocity reactive) ---------- */
  function initMarquee() {
    var wrap = $('[data-marquee]');
    if (!wrap) return;
    var track = $('.marquee__track', wrap);
    var items = $$('li', track);
    items.forEach(function (li) {
      var c = li.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
    if (reduce) return;
    marqueeTween = gsap.to(track, { xPercent: -50, ease: 'none', duration: 48, repeat: -1 });
    ScrollTrigger.create({
      trigger: wrap, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { if (self.isActive) marqueeTween.play(); else marqueeTween.pause(); }
    });
    gsap.from('.clients__label', { opacity: 0, x: -16, duration: 0.9, ease: 'power3.out', scrollTrigger: { trigger: '.clients', start: 'top 90%', once: true } });
  }

  /* ---------- Manifesto: words light up as you read ---------- */
  function initManifesto() {
    var el = $('[data-manifesto]');
    if (!el || reduce || !hasSplit) return;
    var split = SplitText.create(el, { type: 'words' });
    gsap.fromTo(split.words, { opacity: 0.14 }, {
      opacity: 1, ease: 'none', stagger: 0.06,
      scrollTrigger: { trigger: el, start: 'top 78%', end: 'bottom 42%', scrub: true }
    });
    gsap.from('.manifesto__crown', { rotate: -12, scale: 0.6, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.manifesto__foot', start: 'top 85%', once: true } });
  }

  /* ---------- Section headings: masked line reveals ---------- */
  function initSplitHeadings() {
    if (reduce) return;
    $$('[data-split]').forEach(function (el) {
      if (hasSplit) {
        // autoSplit re-measures lines after late font loads or resizes, keeping the reveal's progress
        SplitText.create(el, {
          type: 'lines', mask: 'lines', autoSplit: true,
          onSplit: function (self) {
            padMasks(self);
            return gsap.from(self.lines, { yPercent: 108, duration: 1.15, ease: 'power4.out', stagger: 0.09, scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
          }
        });
      } else {
        gsap.from(el, { y: 40, opacity: 0, duration: 1, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%', once: true } });
      }
    });
    $$('.heritage .lede, .cta .lede, .proof__source').forEach(function (el) {
      gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.2, scrollTrigger: { trigger: el, start: 'top 90%', once: true } });
    });
  }

  function initReveals() {
    if (reduce) return;
    var els = $$('[data-reveal]');
    gsap.set(els, { y: 44, opacity: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 88%', once: true,
      onEnter: function (batch) { gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1, overwrite: true }); }
    });
  }

  /* ---------- Craft: the jacket draws itself, one step at a time ---------- */
  function initCraft(mm, desktopMotion, mobileMotion) {
    var sec = $('.craft');
    if (!sec) return;
    var svgEl = $('.jacket', sec);
    var stepBtns = $$('[data-step]', sec);
    var stepItems = $$('.craft__steps li', sec);
    var details = $$('.craft__detail p', sec);
    var current = 0;

    function setStep(i) {
      if (i === current) return;
      current = i;
      stepItems.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      details.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    }

    var draws = $$('.j-draw', svgEl);
    draws.forEach(function (p) {
      var L = Math.ceil(p.getTotalLength ? p.getTotalLength() : 600) + 1;
      p.style.strokeDasharray = L + ' ' + L;
      p.style.strokeDashoffset = L;
    });
    gsap.set('.j-label', { opacity: 0 });
    gsap.set('.j-btn', { scale: 0, transformOrigin: '50% 50%' });

    var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    tl.to('.j-out', { strokeDashoffset: 0, duration: 0.9, stagger: 0.03, ease: 'power1.inOut' }, 0)
      .to('.j-m', { strokeDashoffset: 0, duration: 0.6, stagger: 0.07 }, 1)
      .to('.j-label', { opacity: 1, duration: 0.25, stagger: 0.05 }, 1.25)
      .to('#fabricRect', { attr: { height: 470 }, duration: 0.85, ease: 'power1.inOut' }, 2)
      .to('.j-measure', { opacity: 0.28, duration: 0.4 }, 2.2)
      .to('.j-det', { strokeDashoffset: 0, duration: 0.6, stagger: 0.04 }, 3)
      .to('.j-ch', { strokeDashoffset: 0, duration: 0.4, stagger: 0.05 }, 3.15)
      .to('.j-chalk', { opacity: 0, duration: 0.3 }, 4)
      .to('.j-measure', { opacity: 0, duration: 0.3 }, 4)
      .to('.j-outline', { color: '#d6b570', duration: 0.4 }, 4)
      .to('.j-btn', { scale: 1, duration: 0.35, stagger: 0.04, ease: 'power3.out' }, 4.1)
      .to('.j-hang', { strokeDashoffset: 0, duration: 0.4 }, 4.2)
      .to({}, { duration: 0.45 }, 4.6);
    var total = tl.duration();

    function stepFromTime(t) { return clamp(Math.floor(t + 0.05), 0, 4); }
    // Follow the (scrubbed, smoothed) timeline itself, so the label never lags the drawing
    tl.eventCallback('onUpdate', function () { setStep(stepFromTime(tl.time())); });
    var st = null;

    if (reduce) {
      tl.progress(1);
    } else {
      mm.add(desktopMotion, function () {
        sec.classList.add('is-pinned');
        tl.progress(0);
        st = ScrollTrigger.create({
          trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 3.4); },
          pin: true, scrub: 0.8, anticipatePin: 1, animation: tl, invalidateOnRefresh: true, refreshPriority: 20,
          onUpdate: function () { setStep(stepFromTime(tl.time())); }
        });
        return function () { sec.classList.remove('is-pinned'); st = null; };
      });
      mm.add(mobileMotion, function () {
        tl.progress(0);
        st = ScrollTrigger.create({
          trigger: sec, start: 'top 70%', end: 'bottom 55%', scrub: 0.6, animation: tl,
          onUpdate: function () { setStep(stepFromTime(tl.time())); }
        });
        return function () { st = null; };
      });
    }

    stepBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.dataset.step);
        setStep(i);
        if (st && app.lenis) {
          var y = st.start + (st.end - st.start) * clamp((i + 0.55) / total, 0, 1);
          app.lenis.scrollTo(y, { duration: 1.2 });
        } else if (st) {
          window.scrollTo({ top: st.start + (st.end - st.start) * clamp((i + 0.55) / total, 0, 1), behavior: 'smooth' });
        }
      });
    });
  }

  /* ---------- Collection: sticky stack ---------- */
  function initStack(mm, desktopMotion, mobileMotion) {
    var stack = $('.stack');
    if (!stack) return;
    var cards = $$('.stack__card', stack);
    cards.forEach(function (c, i) { c.style.zIndex = String(i + 1); });

    mm.add(desktopMotion, function () {
      stack.classList.add('is-stacked');
      cards.forEach(function (card, i) {
        var copy = card.querySelectorAll('.stack__title, .stack__copy > p, .stack__copy > a');
        gsap.from(copy, {
          y: 40, opacity: 0, duration: 1, stagger: 0.08, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 55%', toggleActions: 'play none none reverse' }
        });
        var img = card.querySelector('.stack__media img');
        if (img) gsap.fromTo(img, { yPercent: -4 }, { yPercent: 4, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
        if (i === cards.length - 1) return;
        ScrollTrigger.create({
          trigger: card, start: 'top top', endTrigger: cards[cards.length - 1], end: 'top top',
          pin: true, pinSpacing: false, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 10 - i
        });
        gsap.to(card.querySelector('.stack__inner'), {
          scale: 0.9, opacity: 0.3, ease: 'none',
          scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top top', scrub: true, invalidateOnRefresh: true }
        });
      });
      return function () { stack.classList.remove('is-stacked'); };
    });

    mm.add(mobileMotion, function () {
      cards.forEach(function (card) {
        gsap.from(card.querySelector('.stack__inner'), {
          y: 60, opacity: 0, duration: 1, ease: 'power3.out',
          scrollTrigger: { trigger: card, start: 'top 88%', once: true }
        });
      });
    });
  }

  /* ---------- Proof: Bklit-style charts ---------- */
  function initProof() {
    if (!window.Bklit) return;
    var B = window.Bklit;
    var charts = [];

    var ringEl = $('#chart-ring');
    if (ringEl) charts.push([ringEl, B.RingChart(ringEl, {
      data: [
        { label: 'Kelana Jaya', value: 5.0, maxValue: 5, count: 21, color: 'var(--chart-1)', legendValue: '5.0 from 21' },
        { label: 'Cyberjaya', value: 4.9, maxValue: 5, count: 100, color: 'var(--chart-2)', legendValue: '4.9 from 100' }
      ],
      strokeWidth: 14, ringGap: 9, baseInnerRadius: 82, decimals: 1,
      defaultValue: 4.9, defaultLabel: '121 Google reviews', legend: true,
      formatLabel: function (d) { return d.label + ', ' + d.count + ' reviews'; },
      ariaLabel: 'Google rating by atelier: Kelana Jaya 5.0 out of 5 from 21 reviews, Cyberjaya 4.9 out of 5 from 100 reviews'
    })]);

    var mentionsEl = $('#chart-mentions');
    if (mentionsEl) charts.push([mentionsEl, B.BarChart(mentionsEl, {
      data: [
        { topic: 'Fabric selection', n: 16 },
        { topic: 'Custom suits', n: 10 },
        { topic: 'Smooth process', n: 8 },
        { topic: 'Wedding suits', n: 4 },
        { topic: 'Experienced tailor', n: 4 },
        { topic: 'Variety of options', n: 2 }
      ],
      xDataKey: 'topic', xLabel: 'Topic',
      bars: [{ dataKey: 'n', label: 'Mentioned in', fill: 'var(--chart-1)' }],
      aspectRatio: 2.15, minHeight: 240, max: 20, barGap: 0.46,
      horizontalBelow: 560, hAspectRatio: 1.05, valueLabels: true,
      valueFormat: function (v) { return String(Math.round(v)); },
      tooltip: { value: function (v) { return v + ' reviews'; } },
      ariaLabel: 'Topics most mentioned in Google reviews of the Cyberjaya atelier'
    })]);

    var starsEl = $('#chart-stars');
    if (starsEl) charts.push([starsEl, B.BarChart(starsEl, {
      data: [
        { stars: '5 stars', n: 96 },
        { stars: '4 stars', n: 2 },
        { stars: '3 stars', n: 0 },
        { stars: '2 stars', n: 1 },
        { stars: '1 star', n: 1 }
      ],
      xDataKey: 'stars', xLabel: 'Rating', orientation: 'horizontal', valueLabels: true,
      bars: [{ dataKey: 'n', label: 'Google reviews', fill: 'var(--chart-1)' }],
      aspectRatio: 1.45, minHeight: 210, max: 100, ticks: 4, barGap: 0.38,
      margin: { left: 64, right: 40 },
      valueFormat: function (v) { return String(Math.round(v)); },
      tooltip: { value: function (v) { return v + ' (' + v + '%)'; } },
      ariaLabel: 'Star rating breakdown of 100 Google reviews for the Cyberjaya atelier'
    })]);

    var gaugeEl = $('#chart-gauge');
    if (gaugeEl) charts.push([gaugeEl, B.GaugeChart(gaugeEl, {
      value: 100, max: 100, suffix: '%', label: 'recommend',
      ariaLabel: '100 percent of 11 Facebook reviewers recommend MasterPiece Tailor'
    })]);

    var big = $('.proof__big');
    var flow = big ? new B.NumberFlow(big, { value: reduce ? 4.9 : 0, decimals: 1, locale: false }) : null;

    charts.forEach(function (pair) {
      if (reduce) { pair[1].play(); return; }
      ScrollTrigger.create({ trigger: pair[0], start: 'top 82%', once: true, onEnter: function () { pair[1].play(); } });
    });
    if (flow && !reduce) {
      ScrollTrigger.create({ trigger: big, start: 'top 85%', once: true, onEnter: function () { flow.set(4.9); } });
    }
  }

  /* ---------- Testimonials ---------- */
  function initVoices() {
    var wrap = $('[data-voices]');
    if (!wrap) return;
    var stage = $('.voices__stage', wrap);
    var quotes = $$('.quote', wrap);
    var dotsWrap = $('.voices__dots', wrap);
    var n = quotes.length;
    var idx = 0;
    var auto = null;
    var inView = false;
    var paused = false;

    quotes.forEach(function (q, i) {
      var li = document.createElement('li');
      var b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', 'Review ' + (i + 1) + ' of ' + n + ', ' + q.querySelector('strong').textContent);
      b.setAttribute('aria-current', i === 0 ? 'true' : 'false');
      b.appendChild(document.createElement('span'));
      b.addEventListener('click', function () { go(i); });
      li.appendChild(b);
      dotsWrap.appendChild(li);
    });
    var dots = $$('button', dotsWrap);
    var bars = dots.map(function (d) { return d.querySelector('span'); });
    var splits = quotes.map(function (q) {
      return hasSplit && !reduce ? padMasks(SplitText.create(q.querySelector('blockquote p'), { type: 'words', mask: 'words' })) : null;
    });

    if (!reduce) {
      gsap.set(quotes, { autoAlpha: 0 });
      gsap.set(quotes[0], { autoAlpha: 1 });
    }

    function startAuto() {
      if (reduce) return;
      if (auto) auto.kill();
      gsap.set(bars, { scaleX: 0 });
      if (!inView || paused) { gsap.set(bars[idx], { scaleX: 1 }); return; }
      auto = gsap.fromTo(bars[idx], { scaleX: 0 }, { scaleX: 1, duration: 7, ease: 'none', onComplete: function () { go(idx + 1); } });
    }

    function go(i) {
      var next = (i + n) % n;
      if (next === idx) { startAuto(); return; }
      var prev = quotes[idx];
      var cur = quotes[next];
      idx = next;
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      prev.classList.remove('is-active');
      cur.classList.add('is-active');
      if (reduce) return;
      var tl = gsap.timeline();
      tl.to(prev, { autoAlpha: 0, y: -14, duration: 0.35, ease: 'power2.in' })
        .set(prev, { y: 0 })
        .set(cur, { autoAlpha: 1 });
      if (splits[idx]) tl.fromTo(splits[idx].words, { yPercent: 110 }, { yPercent: 0, duration: 0.95, stagger: 0.016, ease: 'power4.out' });
      tl.fromTo(cur.querySelector('figcaption'), { y: 16, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out' }, '-=0.7');
      startAuto();
    }

    $('[data-prev]', wrap).addEventListener('click', function () { go(idx - 1); });
    $('[data-next]', wrap).addEventListener('click', function () { go(idx + 1); });
    stage.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { go(idx + 1); }
      if (e.key === 'ArrowLeft') { go(idx - 1); }
    });

    // Swipe / drag
    var x0 = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });

    // Pause while the visitor is reading or interacting
    ['pointerenter', 'focusin'].forEach(function (ev) { stage.addEventListener(ev, function () { paused = true; startAuto(); }); });
    ['pointerleave', 'focusout'].forEach(function (ev) { stage.addEventListener(ev, function () { paused = false; startAuto(); }); });

    ScrollTrigger.create({
      trigger: wrap, start: 'top 70%', end: 'bottom 30%',
      onToggle: function (self) { inView = self.isActive; startAuto(); }
    });
    startAuto();
  }

  /* ---------- Offers ---------- */
  function initOffers() {
    var sec = $('[data-offers]');
    if (!sec || sec.classList.contains('is-ended')) return;
    var tiles = $$('.offer', sec);
    if (!reduce) {
      gsap.from(tiles, {
        y: 70, opacity: 0, rotateX: 8, transformOrigin: '50% 100%', duration: 1.1, ease: 'power3.out', stagger: 0.12,
        scrollTrigger: { trigger: '.offers__grid', start: 'top 82%', once: true }
      });
      $$('[data-count-to]', sec).forEach(function (el) {
        var to = Number(el.dataset.countTo);
        var comma = el.dataset.format === 'comma';
        var o = { v: 0 };
        // Hidden until it starts counting, so nobody reads "0" mid-scroll
        gsap.set(el, { opacity: 0 });
        gsap.to(o, {
          v: to, duration: 1.6, ease: 'power3.out',
          onStart: function () { gsap.to(el, { opacity: 1, duration: 0.3 }); },
          onUpdate: function () {
            var v = Math.round(o.v);
            el.textContent = comma ? v.toLocaleString('en-MY') : String(v);
          },
          scrollTrigger: { trigger: el, start: 'top 94%', once: true }
        });
      });
    }
    if (finePointer && !reduce) {
      tiles.forEach(function (t) {
        var rx = gsap.quickTo(t, 'rotationX', { duration: 0.6, ease: 'power3' });
        var ry = gsap.quickTo(t, 'rotationY', { duration: 0.6, ease: 'power3' });
        t.addEventListener('pointermove', function (e) {
          var r = t.getBoundingClientRect();
          ry(((e.clientX - r.left) / r.width - 0.5) * 7);
          rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
        });
        t.addEventListener('pointerleave', function () { rx(0); ry(0); });
      });
    }
  }

  /* ---------- Visit: map draws in, pins and cards stay linked ---------- */
  function initVisit() {
    var map = $('.map');
    if (!map) return;
    var lines = $$('.map__contours path, .map__route, .map__north-arrow', map);
    if (!reduce) {
      lines.forEach(function (p) {
        var L = Math.ceil(p.getTotalLength()) + 1;
        p.style.strokeDasharray = L + ' ' + L;
        p.style.strokeDashoffset = L;
      });
      var tl = gsap.timeline({ scrollTrigger: { trigger: map, start: 'top 85%', end: 'bottom 45%', scrub: 0.8 } });
      tl.to('.map__contours path', { strokeDashoffset: 0, stagger: 0.08, duration: 1, ease: 'none' }, 0)
        .to('.map__route', { strokeDashoffset: 0, duration: 1.2, ease: 'none' }, 0.3)
        .to('.map__north-arrow', { strokeDashoffset: 0, duration: 0.4 }, 0.3)
        .from('.map__pin', { scale: 0, transformOrigin: '0 0', duration: 0.4, stagger: 0.5, ease: 'power3.out' }, 0.2);
    }
    $$('.branch').forEach(function (b) {
      var pin = $('.map__pin[data-pin="' + b.dataset.branch + '"]');
      if (!pin) return;
      var on = function () { pin.classList.add('is-hot'); b.classList.add('is-hot'); };
      var off = function () { pin.classList.remove('is-hot'); b.classList.remove('is-hot'); };
      b.addEventListener('pointerenter', on);
      b.addEventListener('pointerleave', off);
      b.addEventListener('focusin', on);
      b.addEventListener('focusout', off);
      pin.addEventListener('pointerenter', on);
      pin.addEventListener('pointerleave', off);
    });
  }

  /* ---------- Footer wordmark ---------- */
  function initFooter() {
    var word = $('.footer__word');
    if (!word || reduce) return;
    if (hasSplit) {
      var s = padMasks(SplitText.create(word, { type: 'chars', mask: 'chars' }));
      gsap.from(s.chars, {
        yPercent: 110, ease: 'none', stagger: 0.05,
        scrollTrigger: { trigger: word, start: 'top 100%', end: 'bottom 80%', scrub: 0.6 }
      });
    }
    gsap.from('.form', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.form', start: 'top 88%', once: true } });
  }

  /* ---------- Nav state, current section, tape progress ---------- */
  function initChrome() {
    var nav = $('[data-nav]');
    var fill = $('.tape__fill');
    var ticks = $('.tape__ticks');
    var setFill = fill ? gsap.quickSetter(fill, 'scaleY') : null;
    var setTicks = ticks ? gsap.quickSetter(ticks, 'y', 'px') : null;
    ScrollTrigger.create({
      start: 0, end: 'max', refreshPriority: -10,
      onUpdate: function (self) {
        var y = self.scroll();
        nav.classList.toggle('is-scrolled', y > 40);
        if (!app.menuOpen) {
          if (y > 320 && self.direction === 1) nav.classList.add('is-hidden');
          else if (self.direction === -1 || y < 320) nav.classList.remove('is-hidden');
        }
        if (setFill) setFill(self.progress);
        if (setTicks) setTicks(-((y * 0.3) % 40));
      }
    });
    nav.addEventListener('focusin', function () { nav.classList.remove('is-hidden'); });

    $$('.nav__links a').forEach(function (a) {
      var target = $(a.getAttribute('href'));
      if (!target) return;
      ScrollTrigger.create({
        trigger: target, start: 'top 50%', end: 'bottom 50%', refreshPriority: -10,
        onToggle: function (self) {
          a.classList.toggle('is-current', self.isActive);
          if (self.isActive) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
        }
      });
    });
  }

  /* ---------- Background scene sync ---------- */
  function initSceneSync() {
    if (!window.Threads) return;
    var last = scenes.length - 1;
    scenes.forEach(function (sc, i) {
      ScrollTrigger.create({
        trigger: sc, start: 'top 55%', end: 'bottom 55%', refreshPriority: -10,
        onUpdate: function (self) {
          var p = self.progress;
          var blend = p > 0.68 ? (p - 0.68) / 0.32 : 0;
          Threads.progress(Math.min(last, i + blend));
        },
        onEnterBack: function () { Threads.progress(i + 0.999 > last ? last : i + 0.999); }
      });
    });
  }

  /* ---------- Scroll velocity: marquee speed, skew, thread energy ---------- */
  function initVelocity() {
    if (reduce) return;
    var track = $('.marquee__track');
    var skew = track ? gsap.quickTo(track, 'skewX', { duration: 0.6, ease: 'power3' }) : null;
    var dir = 1;
    var smooth = 0;
    gsap.ticker.add(function () {
      var v = app.lenis ? app.lenis.velocity : 0;
      smooth += (v - smooth) * 0.15;
      if (app.lenis && app.lenis.direction) dir = app.lenis.direction;
      if (marqueeTween) marqueeTween.timeScale(dir * (1 + Math.min(Math.abs(smooth) * 0.09, 5)));
      if (skew) skew(clamp(-smooth * 0.25, -7, 7));
      if (window.Threads) Threads.kick(smooth);
    });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagnetic() {
    if (!finePointer || reduce) return;
    $$('.magnetic').forEach(function (el) {
      var xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
      var yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        xTo((e.clientX - (r.left + r.width / 2)) * 0.22);
        yTo((e.clientY - (r.top + r.height / 2)) * 0.3);
      });
      el.addEventListener('pointerleave', function () { xTo(0); yTo(0); });
      el.addEventListener('pointerdown', function () { gsap.to(el, { scale: 0.97, duration: 0.12 }); });
      el.addEventListener('pointerup', function () { gsap.to(el, { scale: 1, duration: 0.3, ease: 'power3.out' }); });
    });
  }

  /* ======================================================================
     Non-motion features
     ====================================================================== */
  function scrollToTarget(target) {
    if (app.lenis) {
      app.lenis.scrollTo(target, { duration: 1.6, easing: function (t) { return t === 1 ? 1 : 1 - Math.pow(2, -10 * t); } });
    } else if (typeof target === 'number') {
      window.scrollTo({ top: target, behavior: reduce ? 'auto' : 'smooth' });
    } else {
      target.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' });
    }
  }

  function initAnchors() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (app.menuOpen) closeMenu();
      scrollToTarget(target);
      if (target !== 0 && id !== '#main') {
        var focusEl = target.querySelector('h2, h1') || target;
        if (!focusEl.hasAttribute('tabindex')) focusEl.setAttribute('tabindex', '-1');
        setTimeout(function () { focusEl.focus({ preventScroll: true }); }, 900);
      }
      if (history.replaceState) history.replaceState(null, '', id === '#top' ? location.pathname : id);
    });
  }

  function openMenu() {
    app.menuOpen = true;
    menu.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    toggle.querySelector('i').className = 'ph ph-x';
    toggle.querySelector('.sr-only').textContent = 'Close menu';
    $('[data-nav]').classList.remove('is-hidden');
    if (app.lenis) app.lenis.stop();
    if (window.gsap && !reduce) {
      gsap.fromTo(menu, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.6, ease: 'expo.out' });
      gsap.fromTo('.menu__links a, .menu__foot > *', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: 0.1 });
    }
    var first = $('.menu__links a');
    if (first) first.focus();
  }
  function closeMenu() {
    app.menuOpen = false;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.querySelector('i').className = 'ph ph-list';
    toggle.querySelector('.sr-only').textContent = 'Open menu';
    if (app.lenis) app.lenis.start();
    if (window.gsap && !reduce) {
      gsap.to(menu, { clipPath: 'inset(0 0 100% 0)', duration: 0.45, ease: 'power3.in', onComplete: function () { menu.hidden = true; } });
    } else {
      menu.hidden = true;
    }
  }
  function initMenu() {
    if (!menu || !toggle) return;
    toggle.addEventListener('click', function () { if (app.menuOpen) closeMenu(); else openMenu(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && app.menuOpen) { closeMenu(); toggle.focus(); }
    });
    window.addEventListener('resize', function () { if (app.menuOpen && window.innerWidth > 960) closeMenu(); });
  }

  function initFaq() {
    var refreshTimer = null;
    $$('.faq__item').forEach(function (item) {
      var btn = $('button', item);
      btn.addEventListener('click', function () {
        var open = btn.getAttribute('aria-expanded') !== 'true';
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        item.classList.toggle('is-open', open);
        clearTimeout(refreshTimer);
        refreshTimer = setTimeout(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 560);
      });
    });
  }

  function initForm() {
    var form = $('[data-wa-form]');
    if (!form) return;
    var note = $('[data-form-note]', form);
    function setError(field, msgEl, bad) {
      field.setAttribute('aria-invalid', bad ? 'true' : 'false');
      msgEl.hidden = !bad;
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var name = form.elements.name;
      var garment = form.elements.garment;
      var badName = !name.value.trim();
      var badGarment = !garment.value;
      setError(name, $('#f-name-err'), badName);
      setError(garment, $('#f-garment-err'), badGarment);
      if (badName || badGarment) {
        (badName ? name : garment).focus();
        note.textContent = '';
        return;
      }
      var branch = form.elements.branch.value || 'kj';
      var date = form.elements.date.value;
      var notes = form.elements.notes.value.trim();
      var lines = [
        'Hi MasterPiece, my name is ' + name.value.trim() + '.',
        "I'd like to enquire about " + garment.value.toLowerCase() + ' at your ' + BRANCH_NAME[branch] + ' atelier.'
      ];
      if (date) {
        var d = new Date(date + 'T00:00:00');
        lines.push('Preferred date: ' + d.toLocaleDateString('en-MY', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + '.');
      }
      if (notes) lines.push(notes);
      var url = 'https://wa.me/' + WA[branch] + '?text=' + encodeURIComponent(lines.join('\n'));
      var win = window.open(url, '_blank', 'noopener');
      note.textContent = '';
      if (!win) {
        note.append('Your browser blocked the new tab. ');
        var a = document.createElement('a');
        a.href = url; a.target = '_blank'; a.rel = 'noopener'; a.textContent = 'Open WhatsApp';
        note.appendChild(a);
      } else {
        note.textContent = 'WhatsApp opened in a new tab with your message ready to send.';
      }
    });
    ['name', 'garment'].forEach(function (n) {
      form.elements[n].addEventListener('input', function () {
        if (form.elements[n].getAttribute('aria-invalid') === 'true') setError(form.elements[n], $('#f-' + n + '-err'), !form.elements[n].value.trim());
      });
    });
  }

  /* Opening hours in Malaysia time (UTC+8); HOURS and DAYS are declared at the top */
  function klNow() {
    var parts = {};
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kuala_Lumpur', weekday: 'short', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
        .formatToParts(new Date()).forEach(function (p) { parts[p.type] = p.value; });
      var map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      return { day: map[parts.weekday], mins: Number(parts.hour) * 60 + Number(parts.minute) };
    } catch (e) {
      var d = new Date(Date.now() + 8 * 3600000);
      return { day: d.getUTCDay(), mins: d.getUTCHours() * 60 + d.getUTCMinutes() };
    }
  }
  function fmtHour(h) { return (h > 12 ? h - 12 : h) + (h >= 12 ? 'pm' : 'am'); }
  function initHours() {
    var els = $$('[data-open-status]');
    if (!els.length) return;
    function update() {
      var now = klNow();
      var today = HOURS[now.day];
      var text, open = false;
      if (today && now.mins >= today[0] * 60 && now.mins < today[1] * 60) {
        open = true;
        text = 'Open now, closes at ' + fmtHour(today[1]);
      } else if (today && now.mins < today[0] * 60) {
        text = 'Closed, opens today at ' + fmtHour(today[0]);
      } else {
        for (var k = 1; k <= 7; k++) {
          var d = (now.day + k) % 7;
          if (HOURS[d]) {
            text = 'Closed, opens ' + (k === 1 ? 'tomorrow' : DAYS[d]) + ' at ' + fmtHour(HOURS[d][0]);
            break;
          }
        }
      }
      els.forEach(function (el) {
        el.classList.toggle('is-open', open);
        el.classList.toggle('is-closed', !open);
        $('[data-status-text]', el).textContent = text;
      });
    }
    update();
    setInterval(update, 60000);
  }

  function initOffersClock() {
    var sec = $('[data-offers]');
    if (!sec) return;
    var end = new Date(sec.dataset.ends).getTime();
    var cells = {};
    $$('[data-cd]', sec).forEach(function (b) { cells[b.dataset.cd] = b; });
    function endOffers() {
      sec.classList.add('is-ended');
      var ended = $('.offers__ended', sec);
      if (ended) ended.hidden = false;
      var h = $('#offers-title');
      if (h) h.textContent = 'Current offers.';
    }
    function tick() {
      var diff = end - Date.now();
      if (diff <= 0) { endOffers(); return false; }
      var s = Math.floor(diff / 1000);
      cells.d.textContent = pad(Math.floor(s / 86400));
      cells.h.textContent = pad(Math.floor((s % 86400) / 3600));
      cells.m.textContent = pad(Math.floor((s % 3600) / 60));
      cells.s.textContent = pad(s % 60);
      return true;
    }
    if (tick()) {
      var timer = setInterval(function () { if (!tick()) clearInterval(timer); }, 1000);
    }
  }

  function initExpiry() {
    $$('[data-expires]').forEach(function (el) {
      if (Date.now() > new Date(el.dataset.expires).getTime()) el.classList.add('is-expired');
    });
  }

  function setYear() {
    var y = new Date().getFullYear();
    $$('[data-current-year]').forEach(function (el) { el.textContent = String(y); });
  }
})();
