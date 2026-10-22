/*
  main.js - motion and interaction for MasterPiece Tailor

  Stack (all from CDNs, pinned versions, see index.html):
    Lenis 1.3.26        smooth scroll, driven from GSAP's ticker (one rAF loop)
    GSAP 3.13.0         ScrollTrigger (pins, scrubs) and SplitText (masked reveals)
    charts.js           Bklit-style charts and rolling numbers
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
  var app = { lenis: null, menuOpen: false };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  var menu = $('#menu');
  var toggle = $('.nav__toggle');
  var HOURS = { 0: [11, 20], 1: [11, 20], 2: [11, 20], 3: [11, 20], 4: [11, 20], 5: [11, 19], 6: null };
  var DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  var marqueeTween = null;
  var trustTween = null;

  /* ======================================================================
     Features that work with or without GSAP
     ====================================================================== */
  initAnchors();
  initMenu();
  initHours();
  initMobileCta();
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
  // Wait for the actual web fonts (capped so a slow network never blocks)
  var fontsReady = (function () {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    var faces = ['400 1em Belleza', '400 1em Figtree', '600 1em Figtree', 'italic 400 1em Figtree'];
    var loads = Promise.all(faces.map(function (f) { return document.fonts.load(f).catch(function () {}); }))
      .then(function () { return document.fonts.ready; });
    var cap = new Promise(function (r) { setTimeout(r, 3000); });
    return Promise.race([loads, cap]);
  })();

  // SplitText masks clip with overflow; give descenders room to breathe.
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

    // The crown traces its outline, then fills with gold
    var paths = $$('.pl-draw', pre);
    paths.forEach(function (p) {
      var L = Math.ceil(p.getTotalLength()) + 1;
      p.style.strokeDasharray = L + ' ' + L;
      p.style.strokeDashoffset = L;
      p.style.fillOpacity = 0;
    });
    var countEl = $('[data-count]', pre);
    var counter = { v: 0 };
    function paint() { countEl.textContent = Math.round(counter.v); }
    gsap.from('.preloader__word', { opacity: 0, y: 10, duration: 0.9, ease: 'power3.out', delay: seen ? 0.1 : 0.5 });

    var intro = gsap.timeline();
    intro.to(paths, { strokeDashoffset: 0, duration: seen ? 0.6 : 1.4, ease: 'power2.inOut' }, 0)
      .to(paths, { fillOpacity: 1, duration: 0.5, ease: 'power2.out' }, seen ? 0.4 : 1.1)
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
     Hero + trust bar
     ====================================================================== */
  function prepareHero() {
    if (reduce) return null;

    var title = $('.hero__title');
    var tl = gsap.timeline({ paused: true, defaults: { ease: 'power4.out' } });
    if (hasSplit) {
      var split = padMasks(SplitText.create(title, { type: 'lines,words,chars', mask: 'lines' }));
      gsap.set(split.chars, { yPercent: 118 });
      tl.to(split.chars, { yPercent: 0, duration: 1.2, stagger: 0.02 }, 0);
    } else {
      gsap.set(title, { y: 40, opacity: 0 });
      tl.to(title, { y: 0, opacity: 1, duration: 1 }, 0);
    }
    gsap.set('[data-hero-fade]', { y: 22, opacity: 0 });
    gsap.set('.hero__img', { scale: 1.32 });
    gsap.set('.nav > *', { y: -14, opacity: 0 });
    gsap.set('.trust__crawl', { y: 18, opacity: 0 });
    tl.to('.hero__curtain', { scaleY: 0, duration: 1.35, ease: 'expo.inOut' }, 0.05)
      .to('.hero__img', { scale: 1, duration: 1.9, ease: 'power3.out' }, 0.1)
      .to('[data-hero-fade]', { y: 0, opacity: 1, duration: 0.95, stagger: 0.1 }, 0.5)
      .to('.nav > *', { y: 0, opacity: 1, duration: 0.8, stagger: 0.06, clearProps: 'transform' }, 0.35)
      .to('.trust__crawl', { y: 0, opacity: 1, duration: 0.9 }, 0.9);
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

    if (!reduce) {
      var heroST = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
      gsap.to('.hero__content', { yPercent: -16, opacity: 0.1, ease: 'none', scrollTrigger: heroST });
      gsap.to('.hero__media', { yPercent: -8, ease: 'none', scrollTrigger: heroST });
      gsap.to('.hero__frame', { scale: 0.93, ease: 'none', scrollTrigger: heroST });
    }

    initTrust();
    initSplitHeadings();
    initReveals();
    initIdentity();
    initExperience();
    initCraft(mm, desktopMotion, mobileMotion);
    initLegacy();
    initHeritage(mm, desktopMotion, mobileMotion);
    initMarquee();
    initStack(mm, desktopMotion, mobileMotion);
    initCatalogue();
    initVoices();
    initRating();
    initFooter();
    initChrome();
    initSceneSync();
    initMagnetic();
    initVelocity();

    ScrollTrigger.sort();
    ScrollTrigger.refresh();
  }

  /* ---------- Quick trust bar: one continuous crawl line ---------- */
  function initTrust() {
    var wrap = $('[data-crawl]');
    if (!wrap) return;
    var track = $('.trust__track', wrap);
    // Two extra copies so the line never shows a gap on wide screens
    var items = $$('li', track);
    for (var n = 0; n < 2; n++) {
      items.forEach(function (li) {
        var c = li.cloneNode(true);
        c.setAttribute('aria-hidden', 'true');
        track.appendChild(c);
      });
    }
    if (reduce) return;
    trustTween = gsap.to(track, { xPercent: -100 / 3, ease: 'none', duration: 30, repeat: -1 });
    ScrollTrigger.create({
      trigger: wrap, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) { if (self.isActive) trustTween.play(); else trustTween.pause(); }
    });
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
    $$('.legacy .lede, .collection .lede, .voices .lede, .cta .lede, .heritage .lede, .cta .eyebrow, .cta .tagline').forEach(function (el) {
      gsap.from(el, { y: 20, opacity: 0, duration: 0.9, ease: 'power3.out', delay: 0.2, scrollTrigger: { trigger: el, start: 'top 92%', once: true } });
    });
  }

  function initReveals() {
    if (reduce) return;
    var els = $$('[data-reveal]');
    gsap.set(els, { y: 44, opacity: 0 });
    ScrollTrigger.batch(els, {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, { y: 0, opacity: 1, duration: 1, ease: 'power3.out', stagger: 0.1, overwrite: true }); }
    });
  }

  /* ---------- 2 Identity: words light up as you read, portrait opens ---------- */
  function initIdentity() {
    if (reduce) return;
    if (hasSplit) {
      $$('[data-scrub-words]').forEach(function (el) {
        var split = SplitText.create(el, { type: 'words' });
        gsap.fromTo(split.words, { opacity: 0.14 }, {
          opacity: 1, ease: 'none', stagger: 0.08,
          scrollTrigger: { trigger: el, start: 'top 85%', end: 'bottom 55%', scrub: true }
        });
      });
    }
    var media = $('.identity__media');
    if (media) {
      var st = { trigger: media, start: 'top 90%', end: 'center 50%', scrub: 0.6 };
      gsap.fromTo(media, { clipPath: 'inset(14% 14% 14% 14% round 4px)' }, { clipPath: 'inset(0% 0% 0% 0% round 4px)', ease: 'none', scrollTrigger: st });
      gsap.fromTo(media.querySelector('img'), { scale: 1.3 }, { scale: 1.05, ease: 'none', scrollTrigger: { trigger: media, start: 'top bottom', end: 'bottom top', scrub: true } });
    }
  }

  /* ---------- 3 Experience: numbered steps drive the photo and the gold flow line ---------- */
  function initExperience() {
    var steps = $$('.step');
    var imgs = $$('.xstage__img');
    var list = $('[data-steps]');
    if (!steps.length) return;
    var current = 0;

    function setActive(i) {
      if (i === current) return;
      var prev = current;
      current = i;
      steps.forEach(function (s, k) {
        s.classList.toggle('is-active', k === i);
        s.classList.toggle('is-done', k < i);
      });
      imgs.forEach(function (im, k) { im.classList.toggle('is-active', k === i); });
      if (!reduce && imgs[i]) {
        gsap.to(imgs[prev], { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut', overwrite: true });
        gsap.fromTo(imgs[i], { autoAlpha: 0, scale: 1.05 }, { autoAlpha: 1, scale: 1, duration: 1, ease: 'power3.out', overwrite: true });
      }
    }

    if (reduce) {
      if (list) list.style.setProperty('--flow', 1);
    } else {
      gsap.set(imgs, { autoAlpha: 0 });
      gsap.set(imgs[0], { autoAlpha: 1 });
      if (list) {
        gsap.fromTo(list, { '--flow': 0 }, {
          '--flow': 1, ease: 'none',
          scrollTrigger: { trigger: list, start: 'top 62%', end: 'bottom 62%', scrub: true }
        });
      }
      gsap.from('.xstage', { y: 60, opacity: 0, duration: 1.1, ease: 'power3.out', scrollTrigger: { trigger: '.xstage', start: 'top 90%', once: true } });
      gsap.from('.experience__lead', { y: 24, opacity: 0, duration: 1, ease: 'power3.out', delay: 0.15, scrollTrigger: { trigger: '.experience__lead', start: 'top 90%', once: true } });
    }
    steps.forEach(function (s, i) {
      ScrollTrigger.create({
        trigger: s, start: 'top 62%', end: 'bottom 62%',
        onToggle: function (self) { if (self.isActive) setActive(i); }
      });
    });
  }

  /* ---------- 4 Journey: the jacket draws itself in three steps ---------- */
  function initCraft(mm, desktopMotion, mobileMotion) {
    var sec = $('.craft');
    if (!sec) return;
    var svgEl = $('.jacket', sec);
    var stepBtns = $$('[data-step]', sec);
    var stepItems = $$('.craft__steps li', sec);
    var details = $$('.craft__detail p', sec);
    var current = 0;
    var STEP_TIME = [0.95, 1.95, 2.75]; // where each step's drawing is complete

    function setStep(i) {
      if (i === current) return;
      current = i;
      stepItems.forEach(function (li, k) { li.classList.toggle('is-active', k === i); });
      details.forEach(function (p, k) { p.classList.toggle('is-active', k === i); });
    }

    $$('.j-draw', svgEl).forEach(function (p) {
      var L = Math.ceil(p.getTotalLength ? p.getTotalLength() : 600) + 1;
      p.style.strokeDasharray = L + ' ' + L;
      p.style.strokeDashoffset = L;
    });
    gsap.set('.j-label', { opacity: 0 });
    gsap.set('.j-btn', { scale: 0, transformOrigin: '50% 50%' });

    var tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    // 01 Discover: silhouette, then measurements
    tl.to('.j-out', { strokeDashoffset: 0, duration: 0.55, stagger: 0.02, ease: 'power1.inOut' }, 0)
      .to('.j-m', { strokeDashoffset: 0, duration: 0.4, stagger: 0.05 }, 0.45)
      .to('.j-label', { opacity: 1, duration: 0.2, stagger: 0.04 }, 0.65)
      // 02 Craft: cloth, construction details, fitting marks
      .to('#fabricRect', { attr: { height: 470 }, duration: 0.55, ease: 'power1.inOut' }, 1)
      .to('.j-measure', { opacity: 0.28, duration: 0.3 }, 1.1)
      .to('.j-det', { strokeDashoffset: 0, duration: 0.45, stagger: 0.03 }, 1.3)
      .to('.j-ch', { strokeDashoffset: 0, duration: 0.3, stagger: 0.04 }, 1.5)
      // 03 Distinguish: finished in gold, on the hanger
      .to('.j-chalk', { opacity: 0, duration: 0.25 }, 2)
      .to('.j-measure', { opacity: 0, duration: 0.25 }, 2)
      .to('.j-ghost', { opacity: 0, duration: 0.25 }, 2)
      .to('.j-outline', { color: '#F4C251', duration: 0.35 }, 2)
      .to('.j-btn', { scale: 1, duration: 0.3, stagger: 0.04, ease: 'power3.out' }, 2.1)
      .to('.j-hang', { strokeDashoffset: 0, duration: 0.35 }, 2.2)
      .to({}, { duration: 0.4 }, 2.6);
    var total = tl.duration();
    function stepFromTime(t) { return clamp(Math.floor(t + 0.02), 0, 2); }
    tl.eventCallback('onUpdate', function () { setStep(stepFromTime(tl.time())); });
    var st = null;

    if (reduce) {
      tl.progress(1);
    } else {
      mm.add(desktopMotion, function () {
        sec.classList.add('is-pinned');
        tl.progress(0);
        st = ScrollTrigger.create({
          trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 2.4); },
          pin: true, scrub: 0.8, anticipatePin: 1, animation: tl, invalidateOnRefresh: true, refreshPriority: 40
        });
        return function () { sec.classList.remove('is-pinned'); st = null; };
      });
      // Phones and tablets: the section holds still (pinned) while scrolling builds the
      // jacket; the step pills jump straight to a stage; the page moves on once it's finished.
      mm.add(mobileMotion, function () {
        sec.classList.add('is-pinned', 'is-pinned--m');
        tl.progress(0);
        st = ScrollTrigger.create({
          trigger: sec, start: 'top top', end: function () { return '+=' + Math.round(window.innerHeight * 2); },
          pin: true, scrub: 0.6, anticipatePin: 1, animation: tl, invalidateOnRefresh: true, refreshPriority: 40
        });
        return function () { sec.classList.remove('is-pinned', 'is-pinned--m'); st = null; };
      });
    }

    stepBtns.forEach(function (b) {
      b.addEventListener('click', function () {
        var i = Number(b.dataset.step);
        setStep(i);
        if (!st) return;
        var y = st.start + (st.end - st.start) * clamp(STEP_TIME[i] / total, 0, 1);
        if (app.lenis) app.lenis.scrollTo(y, { duration: 1.2 });
        else window.scrollTo({ top: y, behavior: 'smooth' });
      });
    });
  }

  /* ---------- 5 Legacy: rolling stats and the heritage timeline bar ---------- */
  function initLegacy() {
    if (!window.Bklit) return;
    $$('.stat__num[data-flow]').forEach(function (el) {
      var value = Number(el.dataset.flow);
      var flow = new Bklit.NumberFlow(el, { value: value, locale: !el.hasAttribute('data-plain') });
      if (reduce) return;
      flow.zero();
      ScrollTrigger.create({ trigger: el, start: 'top 88%', once: true, onEnter: function () { flow.set(value); } });
    });

    var spanEl = $('#chart-span');
    if (spanEl) {
      var span = Bklit.SpanChart(spanEl, {
        min: 1920, max: 2026,
        ticks: [1920, 1950, 1975, 1998, 2026],
        tickLabel: function (t) { return t === 1920 ? '1920s' : String(t); },
        segments: [
          { label: 'Family heritage in textiles and tailoring', short: 'Family heritage', from: 1920, to: 1998, fromLabel: '1920s', toLabel: '1998', valueLabel: 'Penang', color: 'var(--chart-2)' },
          { label: 'MasterPiece Tailor', short: 'MasterPiece', from: 1998, to: 2026, fromLabel: '1998', toLabel: 'today', valueLabel: '28 years', color: 'var(--chart-1)' }
        ],
        ariaLabel: 'Timeline: family heritage in textiles and tailoring from the 1920s to 1998, then MasterPiece Tailor from 1998 to today'
      });
      if (reduce) span.play();
      else ScrollTrigger.create({ trigger: spanEl, start: 'top 85%', once: true, onEnter: function () { span.play(); } });
    }
  }

  /* ---------- Our story: horizontal timeline on desktop ---------- */
  function initHeritage(mm, desktopMotion, mobileMotion) {
    mm.add(desktopMotion, function () {
      var sec = $('.heritage');
      var track = $('.heritage__track', sec);
      sec.classList.add('is-pan');
      var dist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };

      // Gold fill per year, mapped onto the pan's own progress (0..1), guaranteed
      // to be fully gold before the pan ends, even for the last years.
      var years = $$('.h-year', sec).map(function (el) {
        return { el: el, fill: el.querySelector('.h-year__fill'), s: 0, e: 1 };
      });
      function measureYears() {
        var D = dist() || 1;
        var vw = window.innerWidth;
        var x0 = track.getBoundingClientRect().left;
        years.forEach(function (y) {
          var r = y.el.getBoundingClientRect();
          var left = r.left - x0;
          var end = (left + r.width * 0.5 - vw * 0.5) / D;
          var start = (left - vw * 0.9) / D;
          y.e = Math.min(end, 0.9);
          y.s = Math.min(start, y.e - 0.1);
        });
      }
      function paintYears(p) {
        years.forEach(function (y) {
          var f = clamp((p - y.s) / (y.e - y.s), 0, 1);
          y.fill.style.clipPath = 'inset(0 ' + ((1 - f) * 100).toFixed(2) + '% 0 0)';
        });
      }

      var pan = gsap.to(track, {
        x: function () { return -dist(); }, ease: 'none',
        onUpdate: function () { paintYears(this.progress()); },
        scrollTrigger: {
          trigger: sec, start: 'top top', end: function () { return '+=' + dist(); },
          pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 30,
          onRefresh: function () { measureYears(); paintYears(pan ? pan.progress() : 0); }
        }
      });
      measureYears();
      paintYears(0);
      gsap.to('.heritage__progress span', {
        scaleX: 1, ease: 'none',
        scrollTrigger: { trigger: sec, start: 'top top', end: function () { return '+=' + dist(); }, scrub: true, invalidateOnRefresh: true, refreshPriority: 29 }
      });
      $$('.h-panel:not(.h-panel--intro)', sec).forEach(function (p) {
        gsap.from(p.querySelectorAll('.h3, p:not(.h-year), li'), {
          y: 34, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out',
          scrollTrigger: { trigger: p, containerAnimation: pan, start: 'left 78%', toggleActions: 'play none none reverse' }
        });
      });
      return function () {
        sec.classList.remove('is-pan');
        years.forEach(function (y) { y.fill.style.clipPath = ''; });
      };
    });
    mm.add(mobileMotion, function () {
      $$('.h-year__fill').forEach(function (f) {
        gsap.fromTo(f, { clipPath: 'inset(0 100% 0 0)' }, {
          clipPath: 'inset(0 0% 0 0)', ease: 'none',
          scrollTrigger: { trigger: f.parentNode, start: 'top 88%', end: 'top 45%', scrub: true }
        });
      });
    });
  }

  /* ---------- Trusted by marquee (velocity reactive) ---------- */
  function initMarquee() {
    var wrap = $('[data-marquee]');
    if (!wrap) return;
    var track = $('.marquee__track', wrap);
    $$('li', track).forEach(function (li) {
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

  /* ---------- 6 Moments: sticky stack ---------- */
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
        // Recede by scaling and darkening (an opaque overlay), never by transparency
        gsap.to(card.querySelector('.stack__inner'), {
          scale: 0.92, '--dim': 0.62, ease: 'none',
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

  /* ---------- 6b Collection: garments draw themselves in ---------- */
  function initCatalogue() {
    var tiles = $$('.garment');
    if (!tiles.length || reduce) return;
    tiles.forEach(function (t) {
      $$('.g-draw', t).forEach(function (p) {
        if (p.classList.contains('g-dash')) return;
        var L = Math.ceil(p.getTotalLength ? p.getTotalLength() : 400) + 1;
        p.style.strokeDasharray = L + ' ' + L;
        p.style.strokeDashoffset = L;
      });
      gsap.set(t.querySelectorAll('.g-dot, .g-fill, .g-dash'), { opacity: 0 });
    });
    ScrollTrigger.batch(tiles, {
      start: 'top 88%', once: true,
      onEnter: function (batch) {
        batch.forEach(function (t, k) {
          var tl = gsap.timeline({ delay: k * 0.12 });
          tl.to($$('.g-draw:not(.g-dash)', t), { strokeDashoffset: 0, duration: 1.3, ease: 'power2.inOut', stagger: 0.04 });
          var fills = $$('.g-fill', t), dashes = $$('.g-dash', t), dots = $$('.g-dot', t);
          if (fills.length) tl.to(fills, { opacity: 1, duration: 0.5 }, '-=0.4');
          if (dashes.length) tl.to(dashes, { opacity: 0.6, duration: 0.5 }, fills.length ? '<' : '-=0.4');
          if (dots.length) tl.to(dots, { opacity: 1, duration: 0.3, stagger: 0.04 }, '-=0.3');
        });
      }
    });
  }

  /* Moment buttons ("Explore business" etc.) narrow the collection to matching pieces */
  function applyMoment(name) {
    var tiles = $$('.garment');
    var status = $('[data-catalogue-status]');
    tiles.forEach(function (t) {
      var on = !name || (' ' + t.dataset.moments + ' ').indexOf(' ' + name + ' ') > -1;
      t.classList.toggle('is-dim', !on);
      t.classList.toggle('is-match', !!name && on);
    });
    if (status) {
      status.hidden = !name;
      var label = $('[data-moment-name]', status);
      if (label) label.textContent = name || '';
    }
    if (name && hasGsap && !reduce) {
      gsap.fromTo($$('.garment.is-match'), { y: 16 }, { y: 0, duration: 0.8, ease: 'power3.out', stagger: 0.06, delay: 0.9 });
    }
  }

  /* ---------- 7 Social proof ---------- */
  function initVoices() {
    var wrap = $('[data-voices]');
    if (!wrap) return;
    var stage = $('.voices__stage', wrap);
    var quotes = $$('.quote', wrap);
    var portraits = $$('.portrait', wrap);
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
      b.setAttribute('aria-label', 'Client story ' + (i + 1) + ' of ' + n + ', ' + q.querySelector('strong').textContent);
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
      gsap.set(portraits, { autoAlpha: 0 });
      gsap.set(portraits[0], { autoAlpha: 1 });
    }

    function startAuto() {
      if (reduce) return;
      if (auto) auto.kill();
      gsap.set(bars, { scaleX: 0 });
      if (!inView || paused) { gsap.set(bars[idx], { scaleX: 1 }); return; }
      auto = gsap.fromTo(bars[idx], { scaleX: 0 }, { scaleX: 1, duration: 8, ease: 'none', onComplete: function () { go(idx + 1); } });
    }

    function go(i) {
      var next = (i + n) % n;
      if (next === idx) { startAuto(); return; }
      var prev = quotes[idx], cur = quotes[next];
      var prevP = portraits[idx], curP = portraits[next];
      idx = next;
      dots.forEach(function (d, k) { d.setAttribute('aria-current', k === idx ? 'true' : 'false'); });
      prev.classList.remove('is-active'); cur.classList.add('is-active');
      if (prevP) prevP.classList.remove('is-active');
      if (curP) curP.classList.add('is-active');
      if (reduce) return;
      if (prevP && curP) {
        gsap.to(prevP, { autoAlpha: 0, duration: 0.6, ease: 'power2.inOut' });
        gsap.fromTo(curP, { autoAlpha: 0, scale: 1.06 }, { autoAlpha: 1, scale: 1, duration: 1, ease: 'power3.out' });
      }
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
      if (e.key === 'ArrowRight') go(idx + 1);
      if (e.key === 'ArrowLeft') go(idx - 1);
    });
    var x0 = null;
    stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
    stage.addEventListener('pointerup', function (e) {
      if (x0 === null) return;
      var dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 50) go(idx + (dx < 0 ? 1 : -1));
    });
    ['pointerenter', 'focusin'].forEach(function (ev) { stage.addEventListener(ev, function () { paused = true; startAuto(); }); });
    ['pointerleave', 'focusout'].forEach(function (ev) { stage.addEventListener(ev, function () { paused = false; startAuto(); }); });

    ScrollTrigger.create({
      trigger: wrap, start: 'top 70%', end: 'bottom 30%',
      onToggle: function (self) { inView = self.isActive; startAuto(); }
    });
    startAuto();
  }

  function initRating() {
    var el = $('#chart-ring');
    if (!el || !window.Bklit) return;
    var ring = Bklit.RingChart(el, {
      data: [
        { label: 'Kelana Jaya', value: 5.0, maxValue: 5, count: 21, color: 'var(--chart-1)', legendValue: '5.0 from 21' },
        { label: 'Cyberjaya', value: 4.9, maxValue: 5, count: 100, color: 'var(--chart-2)', legendValue: '4.9 from 100' }
      ],
      strokeWidth: 12, ringGap: 7, baseInnerRadius: 64, decimals: 1,
      defaultValue: 4.9, defaultLabel: '121 Google reviews', legend: true,
      formatLabel: function (d) { return d.label + ', ' + d.count + ' reviews'; },
      ariaLabel: 'Google rating by atelier: Kelana Jaya 5.0 out of 5 from 21 reviews, Cyberjaya 4.9 out of 5 from 100 reviews'
    });
    if (reduce) ring.play();
    else ScrollTrigger.create({ trigger: el, start: 'top 85%', once: true, onEnter: function () { ring.play(); } });
  }

  /* ---------- Footer wordmark ---------- */
  /* The MasterPiece wordmark unveils left to right as the footer arrives */
  function initFooter() {
    var word = $('.footer__word');
    if (!word || reduce) return;
    gsap.fromTo(word, { clipPath: 'inset(0 100% 0 0)', y: 30 }, {
      clipPath: 'inset(0 0% 0 0)', y: 0, ease: 'none',
      scrollTrigger: { trigger: word, start: 'top 98%', end: 'bottom 75%', scrub: 0.6 }
    });
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
        onEnterBack: function () { Threads.progress(Math.min(last, i + 0.999)); }
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
      var speed = dir * (1 + Math.min(Math.abs(smooth) * 0.09, 5));
      if (marqueeTween) marqueeTween.timeScale(speed);
      if (trustTween) trustTween.timeScale(speed);
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
      var showAll = e.target.closest && e.target.closest('[data-show-all]');
      if (showAll) { applyMoment(null); return; }
      var a = e.target.closest && e.target.closest('a[href^="#"]');
      if (!a) return;
      var id = a.getAttribute('href');
      if (id.length < 2) return;
      var target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      if (a.dataset.moment) applyMoment(a.dataset.moment);
      if (app.menuOpen) closeMenu();
      scrollToTarget(target);
      if (target !== 0 && id !== '#main') {
        var focusEl = target.querySelector('h2, h1, h3') || target;
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

  /* Sticky mobile CTA: appears once the hero's own button has scrolled away */
  function initMobileCta() {
    var bar = $('[data-mobile-cta]');
    var heroCta = $('.hero__ctas');
    if (!bar || !heroCta || !('IntersectionObserver' in window)) { if (bar) bar.classList.add('is-on'); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var past = !en.isIntersecting && en.boundingClientRect.top < 0;
        bar.classList.toggle('is-on', past);
      });
    });
    io.observe(heroCta);
  }

  /* Opening hours in Malaysia time (UTC+8) */
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

  function setYear() {
    var y = new Date().getFullYear();
    $$('[data-current-year]').forEach(function (el) { el.textContent = String(y); });
  }
})();
