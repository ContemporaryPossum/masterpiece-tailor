/*
  insights.js - the Insights page

  The articles come from Soro (trysoro.com), which draws the list and each article
  inside #soro-blog and keeps publishing new ones on its own. Old links such as
  /insights?post=guide-to-trouser-break keep working, because Soro reads ?post=.

  This file adds the MasterPiece layer on top: topic filters and search, a large
  "latest article" card, paging, card reveals, switching the page between the list
  and an article, and a reading-progress bar. main.js still runs here for smooth
  scrolling, the nav and menu, the background and the footer.
*/
(function () {
  'use strict';

  var box = document.getElementById('soro-blog');
  if (!box) return;

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var PAGE = 13;        // the latest article, then four rows of three
  var MORE = 12;
  // Topics match words in each article's title and summary
  var TOPICS = {
    weddings: /wedding|groom|black[- ]tie|tuxedo|waistcoat/,
    suits: /\bsuits?\b|jacket|lapel|\bvents?\b|canvas|fused|lining|double[- ]breasted|blazer/,
    shirts: /shirt|collar|cuff/,
    trousers: /trouser/,
    fabrics: /fabric|cloth|wool|linen|cotton|weave|humid|climate/,
    fit: /\bfit|fitting|measur|alteration|\bcare\b|sizing|\bbreak\b/
  };

  function $(s, c) { return (c || document).querySelector(s); }
  function $$(s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); }

  var search = $('[data-ins-search]');
  var chips = $$('[data-topic]');
  var countEl = $('[data-ins-count]');
  var emptyEl = $('[data-ins-empty]');
  var moreBtn = $('[data-ins-more]');
  var resetBtn = $('[data-ins-reset]');
  var bar = $('.ins-progress span');
  var state = { topic: 'all', q: '', limit: PAGE };
  var view = null;
  var refreshTimer = null;
  var queued = false;

  /* ---------- Cards rise in as they reach the screen ---------- */
  var io = null;
  if (!reduce && 'IntersectionObserver' in window) {
    box.classList.add('has-reveal');
    io = new IntersectionObserver(function (entries) {
      var k = 0;
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.style.transitionDelay = (k++ * 0.08).toFixed(2) + 's';
        en.target.classList.add('is-in');
        io.unobserve(en.target);
      });
    }, { rootMargin: '0px 0px -8% 0px' });
  }

  function cards() { return $$('.soro-blog-card', box); }

  function replay() {
    if (!io) return;
    cards().forEach(function (c) { c.classList.remove('is-in'); c.style.transitionDelay = ''; });
  }

  function filter() {
    var q = state.q.trim().toLowerCase();
    var re = TOPICS[state.topic] || null;
    var all = cards();
    var matched = 0;
    all.forEach(function (c) {
      if (!c.mptText) c.mptText = (c.textContent || '').toLowerCase();
      var ok = (!re || re.test(c.mptText)) && (!q || c.mptText.indexOf(q) !== -1);
      if (ok) matched++;
      var show = ok && matched <= state.limit;
      c.hidden = !show;
      c.classList.toggle('is-featured', show && matched === 1 && !re && !q);
      if (show && io && !c.classList.contains('is-in')) io.observe(c);
    });
    if (countEl) {
      countEl.textContent = !all.length ? '' :
        (!re && !q) ? all.length + ' articles' :
        matched + (matched === 1 ? ' article' : ' articles');
    }
    if (emptyEl) emptyEl.hidden = matched > 0 || !all.length;
    if (moreBtn) moreBtn.hidden = matched <= state.limit;
  }

  function toTop() {
    var lenis = window.MPT && window.MPT.lenis;
    if (lenis) lenis.scrollTo(0, { immediate: true, force: true });
    else window.scrollTo(0, 0);
  }

  function refreshSoon() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () { if (window.ScrollTrigger) ScrollTrigger.refresh(); }, 180);
  }

  function revealArticle(article) {
    if (reduce || !window.gsap) return;
    gsap.from(article.querySelectorAll('header > *, .soro-blog-article-image, .soro-blog-article-content > *:nth-child(-n+3)'), {
      y: 30, opacity: 0, duration: 0.9, stagger: 0.07, ease: 'power3.out', clearProps: 'transform,opacity'
    });
  }

  // Soro swaps between the list and an article in place; follow along
  function render() {
    queued = false;
    var article = $('.soro-blog-article', box);
    var next = article ? 'article' : ($('.soro-blog-list', box) ? 'list' : 'loading');
    if (next !== view) {
      var prev = view;
      view = next;
      root.classList.toggle('is-article', next === 'article');
      if (prev && prev !== 'loading') toTop();
      if (next === 'article') revealArticle(article);
    }
    if (next === 'list') filter();
    paintProgress();
    refreshSoon();
  }

  new MutationObserver(function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(render);
  }).observe(box, { childList: true, subtree: true });

  /* ---------- Reading progress (article view) ---------- */
  function paintProgress() {
    if (!bar) return;
    var article = view === 'article' && $('.soro-blog-article', box);
    if (!article) { bar.style.transform = 'scaleX(0)'; return; }
    var r = article.getBoundingClientRect();
    var span = Math.max(1, r.height - window.innerHeight * 0.6);
    var p = Math.min(1, Math.max(0, (-r.top + window.innerHeight * 0.2) / span));
    bar.style.transform = 'scaleX(' + p.toFixed(4) + ')';
  }
  window.addEventListener('scroll', paintProgress, { passive: true });

  /* ---------- Filters, search and paging ---------- */
  chips.forEach(function (chip) {
    chip.addEventListener('click', function () {
      state.topic = chip.getAttribute('data-topic');
      state.limit = PAGE;
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c === chip ? 'true' : 'false'); });
      replay();
      filter();
      refreshSoon();
    });
  });

  var typing = null;
  if (search) {
    search.addEventListener('input', function () {
      clearTimeout(typing);
      typing = setTimeout(function () {
        state.q = search.value;
        state.limit = PAGE;
        replay();
        filter();
        refreshSoon();
      }, 160);
    });
  }

  if (moreBtn) {
    moreBtn.addEventListener('click', function () {
      state.limit += MORE;
      filter();
      refreshSoon();
    });
  }

  if (resetBtn) {
    resetBtn.addEventListener('click', function () {
      state.topic = 'all';
      state.q = '';
      state.limit = PAGE;
      if (search) search.value = '';
      chips.forEach(function (c) { c.setAttribute('aria-pressed', c.getAttribute('data-topic') === 'all' ? 'true' : 'false'); });
      replay();
      filter();
      refreshSoon();
    });
  }

  render();
})();
