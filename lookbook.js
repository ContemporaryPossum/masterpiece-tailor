/*
  lookbook.js - "Worn by our clients"

  The client looks (the <li class="look"> list in index.html) become a slow-moving wall:
  columns drift up and down at a slight angle, speed up and reverse with your scrolling,
  and pause under the pointer. The style chips re-deal the wall. Any look opens full screen
  with arrows, swipe, thumbnails and an "Enquire about this look" WhatsApp link that names
  the look. With reduced motion, or without the animation library, it is a plain grid.
*/
(function () {
  'use strict';

  var box = document.querySelector('[data-looks]');
  var dlg = document.querySelector('[data-lightbox]');
  if (!box || !dlg) return;

  var list = box.querySelector('[data-looks-list]');
  var chips = Array.prototype.slice.call(document.querySelectorAll('[data-look-filter]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var WHATSAPP = '60174582366';
  var RATIO = 1132 / 800;

  var looks = Array.prototype.map.call(list.querySelectorAll('.look'), function (li, i) {
    var img = li.querySelector('img');
    return {
      index: i, li: li,
      num: (i < 9 ? '0' : '') + (i + 1),
      cat: li.getAttribute('data-cat'),
      catLabel: li.getAttribute('data-cat-label'),
      title: li.getAttribute('data-title'),
      src: img.getAttribute('src'),
      alt: img.getAttribute('alt')
    };
  });
  var filter = 'all';
  function current() { return looks.filter(function (l) { return filter === 'all' || l.cat === filter; }); }
  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;'); }
  function el(tag, cls) { var e = document.createElement(tag); e.className = cls; return e; }
  // Lets the page pause smooth scrolling while the viewer is open
  function lock(on) { document.dispatchEvent(new CustomEvent('mpt:lock', { detail: { locked: on } })); }

  /* ======================================================================
     The moving wall
     ====================================================================== */
  var canAnimate = !reduce && !!window.gsap;
  var wall = null, loops = [], tilt = null, cols = 0;
  var visible = false, hover = false, speed = 1;

  function colCount() {
    var w = box.clientWidth;
    return w >= 1180 ? 5 : w >= 900 ? 4 : w >= 560 ? 3 : 2;
  }

  function tile(l, focusable) {
    var wrap = el('div', 'look');
    var b = el('button', 'look__btn');
    b.type = 'button';
    b.setAttribute('data-look', l.index);
    if (focusable) b.setAttribute('aria-label', 'Look ' + l.num + ', ' + l.title + '. Open full screen');
    else { b.tabIndex = -1; b.setAttribute('aria-hidden', 'true'); }
    b.innerHTML = '<img src="' + esc(l.src) + '" width="800" height="1132" alt="' + (focusable ? esc(l.alt) : '') + '" loading="lazy" decoding="async">' +
      '<span class="look__tag"><b>' + l.num + '</b> ' + esc(l.catLabel) + '</span>';
    wrap.appendChild(b);
    return wrap;
  }

  function build() {
    loops.forEach(function (t) { t.kill(); });
    loops = [];
    if (tilt) { tilt.scrollTrigger && tilt.scrollTrigger.kill(); tilt.kill(); tilt = null; }
    if (wall) wall.remove();

    var set = current();
    cols = colCount();
    box.classList.add('is-wall');
    list.hidden = true;
    wall = el('div', 'looks__wall');
    box.insertBefore(wall, box.firstChild);

    // Deal the looks into columns; small sets are rotated so each column starts on a different look
    var per = [], c, k;
    for (c = 0; c < cols; c++) per.push([]);
    if (set.length >= cols * 4) {
      set.forEach(function (l, i) { per[i % cols].push(l); });
    } else {
      var step = Math.max(1, Math.round(set.length / cols));
      for (c = 0; c < cols; c++) {
        var off = (c * step) % set.length;
        per[c] = set.slice(off).concat(set.slice(0, off));
      }
    }

    var tracks = per.map(function () {
      var col = el('div', 'looks__col');
      var tr = el('div', 'looks__track');
      col.appendChild(tr);
      wall.appendChild(col);
      return tr;
    });

    // Enough tiles to cover the wall, then the same run again so the loop is seamless
    var colW = tracks[0].parentNode.clientWidth || 200;
    var gap = parseFloat(getComputedStyle(wall).getPropertyValue('--g')) || 16;
    var need = Math.ceil((wall.clientHeight * 1.05) / (colW * RATIO + gap)) + 1;
    var seen = {};
    per.forEach(function (seq, ci) {
      var run = seq.slice();
      while (run.length < need) run = run.concat(seq);
      run.forEach(function (l) {
        tracks[ci].appendChild(tile(l, !seen[l.index]));
        seen[l.index] = true;
      });
      run.forEach(function (l) { tracks[ci].appendChild(tile(l, false)); });

      var up = ci % 2 === 0;
      var dur = run.length * 4.2;
      var t = gsap.fromTo(tracks[ci], { yPercent: up ? 0 : -50 }, { yPercent: up ? -50 : 0, duration: dur, ease: 'none', repeat: -1, paused: !visible });
      // Start deep into the loop (so scrolling back up can reverse it) and offset each column
      t.totalTime(dur * 400 + dur * ((ci * 0.37) % 1));
      loops.push(t);
    });

    // The wall straightens up as it passes through the screen
    if (window.ScrollTrigger) {
      tilt = gsap.fromTo(wall, { '--rx': '22deg' }, {
        '--rx': '4deg', ease: 'none',
        scrollTrigger: { trigger: box, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }
  }

  function staticFilter() {
    looks.forEach(function (l) { l.li.hidden = !(filter === 'all' || l.cat === filter); });
  }

  if (canAnimate) {
    build();
    gsap.from(wall, { opacity: 0, duration: 1.2, ease: 'power2.out', scrollTrigger: window.ScrollTrigger ? { trigger: box, start: 'top 85%', once: true } : undefined });

    // Scroll speed and direction drive the drift; hovering slows it right down
    gsap.ticker.add(function () {
      if (!loops.length || !visible) return;
      var lenis = window.MPT && window.MPT.lenis;
      var v = lenis ? lenis.velocity : 0;
      var dir = lenis && lenis.direction ? lenis.direction : 1;
      var target = hover ? 0.06 * (speed < 0 ? -1 : 1) : dir * (1 + Math.min(Math.abs(v) * 0.08, 4));
      speed += (target - speed) * 0.08;
      loops.forEach(function (t) { t.timeScale(speed); });
    });

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        loops.forEach(function (t) { if (visible) t.play(); else t.pause(); });
      }).observe(box);
    } else {
      visible = true;
      loops.forEach(function (t) { t.play(); });
    }

    box.addEventListener('pointerenter', function (e) { if (e.pointerType === 'mouse') hover = true; });
    box.addEventListener('pointerleave', function () { hover = false; });
    box.addEventListener('focusin', function () { hover = true; });
    box.addEventListener('focusout', function () { hover = false; });

    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { if (colCount() !== cols) build(); }, 250);
    });
  }

  /* ---------- Style chips ---------- */
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      var next = chip.getAttribute('data-look-filter');
      if (next === filter) return;
      filter = next;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      if (!canAnimate) { staticFilter(); return; }
      gsap.to(wall, {
        opacity: 0, duration: 0.3, ease: 'power2.in',
        onComplete: function () {
          build();
          gsap.fromTo(wall, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power2.out' });
          if (window.ScrollTrigger) ScrollTrigger.refresh();
        }
      });
    });
  });

  /* ======================================================================
     Full-screen viewer
     ====================================================================== */
  var img = dlg.querySelector('[data-lb-img]');
  var stage = dlg.querySelector('[data-lb-stage]');
  var posEl = dlg.querySelector('[data-lb-pos]');
  var totalEl = dlg.querySelector('[data-lb-total]');
  var catEl = dlg.querySelector('[data-lb-cat]');
  var titleEl = dlg.querySelector('[data-lb-title]');
  var enquire = dlg.querySelector('[data-lb-enquire]');
  var rail = dlg.querySelector('[data-lb-rail]');
  var lb = { set: [], pos: 0, opener: null };
  var anim = !reduce && !!window.gsap;

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function buildRail() {
    rail.innerHTML = '';
    lb.set.forEach(function (l, k) {
      var b = el('button', 'lightbox__thumb');
      b.type = 'button';
      b.setAttribute('aria-label', 'Look ' + l.num + ', ' + l.title);
      b.innerHTML = '<img src="' + esc(l.src) + '" width="800" height="1132" alt="" loading="lazy" decoding="async">';
      b.addEventListener('click', function () { go(k - lb.pos); });
      rail.appendChild(b);
    });
  }

  function show(dir) {
    var l = lb.set[lb.pos];
    img.src = l.src;
    img.alt = l.alt;
    posEl.textContent = pad(lb.pos + 1);
    totalEl.textContent = pad(lb.set.length);
    catEl.textContent = 'Look ' + l.num + ' · ' + l.catLabel;
    titleEl.textContent = l.title;
    enquire.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(
      'Hi MasterPiece Tailor, I\'d like to enquire about Look ' + l.num + ' (' + l.title + ') from your website.');
    Array.prototype.forEach.call(rail.children, function (b, k) {
      b.setAttribute('aria-current', k === lb.pos ? 'true' : 'false');
    });
    var thumb = rail.children[lb.pos];
    if (thumb) {
      var left = thumb.offsetLeft - (rail.clientWidth - thumb.offsetWidth) / 2;
      rail.scrollTo({ left: Math.max(0, left), behavior: anim ? 'smooth' : 'auto' });
    }
    if (anim && dir) {
      gsap.fromTo(img, { x: 46 * dir, opacity: 0 }, { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out', overwrite: true });
      gsap.fromTo([catEl, titleEl], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.05, overwrite: true });
    }
    // Warm up the neighbours so the arrows feel instant
    [lb.pos - 1, lb.pos + 1].forEach(function (k) {
      var n = lb.set[(k + lb.set.length) % lb.set.length];
      if (n) { var pre = new Image(); pre.src = n.src; }
    });
  }

  function go(d) {
    if (!d) return;
    lb.pos = (lb.pos + d + lb.set.length) % lb.set.length;
    show(d > 0 ? 1 : -1);
  }

  function open(index, opener) {
    lb.set = current();
    lb.pos = 0;
    for (var k = 0; k < lb.set.length; k++) if (lb.set[k].index === index) { lb.pos = k; break; }
    lb.opener = opener || null;
    buildRail();
    show(0);
    dlg.showModal();
    lock(true);
    if (anim) {
      gsap.fromTo(img, { scale: 0.94, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.7, ease: 'power3.out' });
      gsap.fromTo(dlg.querySelectorAll('.lightbox__info > *'), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.05, delay: 0.1 });
    }
  }

  function close() {
    if (!dlg.open) return;
    dlg.close();
    lock(false);
    if (lb.opener && document.contains(lb.opener) && lb.opener.tabIndex !== -1) lb.opener.focus({ preventScroll: true });
  }

  box.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-look]');
    if (b) open(Number(b.getAttribute('data-look')), b);
  });
  dlg.querySelector('[data-lb-prev]').addEventListener('click', function () { go(-1); });
  dlg.querySelector('[data-lb-next]').addEventListener('click', function () { go(1); });
  dlg.querySelector('[data-lb-close]').addEventListener('click', close);
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  dlg.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
  });
  // Swipe on phones
  var x0 = null;
  stage.addEventListener('pointerdown', function (e) { x0 = e.clientX; });
  stage.addEventListener('pointerup', function (e) {
    if (x0 === null) return;
    var dx = e.clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50) go(dx < 0 ? 1 : -1);
  });
})();
