/*
  voucher.js - the 10% welcome voucher pop-up

  Opens once for a new visitor, a moment after the page has settled. The email goes
  to /api/voucher (see _worker.js), which emails the voucher code through Brevo.
  If that isn't available (not set up yet, offline, or opened as a local file),
  the pop-up offers WhatsApp instead, so a visitor is never left with an error.
  After "No thanks" a small "10% off" tab stays in the corner to reopen it.
*/
(function () {
  'use strict';

  var dlg = document.querySelector('[data-voucher]');
  if (!dlg || typeof dlg.showModal !== 'function') return;

  var ENDPOINT = '/api/voucher';
  var WHATSAPP = '60174582366';
  var KEY = 'mpt-voucher';
  var OPEN_DELAY = 2200;                 // after the page is ready
  var SNOOZE = 14 * 24 * 3600 * 1000;    // "No thanks" keeps it closed for two weeks

  var root = document.documentElement;
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var form = dlg.querySelector('[data-voucher-form]');
  var input = form.elements.email;
  var submit = form.querySelector('[type="submit"]');
  var errorEl = dlg.querySelector('[data-voucher-error]');
  var card = dlg.querySelector('.voucher__card');
  var tab = document.querySelector('[data-voucher-open]');
  var openedAt = 0;
  var closing = false;

  function readState() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function saveState(s) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { /* storage blocked */ } }
  // Lets the page pause smooth scrolling while the dialog is open
  function lock(on) { document.dispatchEvent(new CustomEvent('mpt:lock', { detail: { locked: on } })); }
  function hasGsap() { return !!window.gsap && !reduce; }

  function showTab(on) {
    if (!tab) return;
    tab.hidden = !on;
    requestAnimationFrame(function () { tab.classList.toggle('is-on', on); });
  }

  function showStep(name) {
    Array.prototype.forEach.call(dlg.querySelectorAll('[data-voucher-step]'), function (s) {
      s.hidden = s.getAttribute('data-voucher-step') !== name;
    });
  }

  function open() {
    if (dlg.open || closing) return;
    showStep('form');
    setError('');
    dlg.showModal();
    openedAt = Date.now();
    lock(true);
    showTab(false);
    if (hasGsap()) {
      var media = dlg.querySelector('.voucher__media img');
      gsap.fromTo(card, { y: 48, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.9, ease: 'power3.out' });
      if (media) gsap.fromTo(media, { scale: 1.18, clipPath: 'inset(0 0 100% 0)' }, { scale: 1, clipPath: 'inset(0 0 0% 0)', duration: 1.3, ease: 'expo.out', delay: 0.1 });
      gsap.fromTo(dlg.querySelectorAll('[data-voucher-step="form"] > *'), { y: 18, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.06, delay: 0.2 });
    }
  }

  function close() {
    if (!dlg.open || closing) return;
    closing = true;
    var claimed = !!readState().claimed;
    if (!claimed) saveState({ dismissed: Date.now() });
    function finish() {
      dlg.classList.remove('is-closing');
      dlg.close();
      closing = false;
      lock(false);
      if (!claimed && !readState().claimed) showTab(true);
    }
    dlg.classList.add('is-closing');
    if (hasGsap()) gsap.to(card, { y: 24, opacity: 0, duration: 0.35, ease: 'power2.in', onComplete: finish });
    else finish();
  }

  function setError(msg) {
    errorEl.textContent = msg;
    errorEl.hidden = !msg;
    input.setAttribute('aria-invalid', msg ? 'true' : 'false');
  }

  function busy(on) {
    submit.disabled = on;
    form.setAttribute('aria-busy', on ? 'true' : 'false');
    submit.querySelector('span').textContent = on ? 'Sending...' : 'Send my voucher';
  }

  function done(email, already) {
    saveState({ claimed: Date.now() });
    showTab(false);
    var out = dlg.querySelector('[data-voucher-email]');
    if (out) out.textContent = email;
    var note = dlg.querySelector('[data-voucher-already]');
    if (note) note.hidden = !already;
    reveal('done');
  }

  function fallback(email) {
    var link = dlg.querySelector('[data-voucher-wa]');
    if (link) {
      var text = 'Hi MasterPiece Tailor, I\'d like to claim my 10% welcome voucher.' + (email ? ' My email is ' + email + '.' : '');
      link.href = 'https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(text);
    }
    reveal('fallback');
  }

  function reveal(step) {
    showStep(step);
    var panel = dlg.querySelector('[data-voucher-step="' + step + '"]');
    var heading = panel.querySelector('h2');
    if (heading) { heading.setAttribute('tabindex', '-1'); heading.focus({ preventScroll: true }); }
    if (hasGsap()) gsap.fromTo(panel.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out', stagger: 0.07 });
  }

  function validEmail(v) { return v.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v); }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var email = input.value.trim();
    if (!validEmail(email)) {
      setError('Please enter a valid email address, like name@example.com.');
      input.focus();
      return;
    }
    setError('');
    busy(true);
    var ctl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctl) ctl.abort(); }, 15000);
    fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        consent: !!form.elements.consent.checked,
        website: form.elements.website.value,
        ms: Date.now() - openedAt
      }),
      signal: ctl ? ctl.signal : undefined
    })
      .then(function (r) {
        return r.json().catch(function () { return {}; }).then(function (body) { return { status: r.status, body: body }; });
      })
      .then(function (res) {
        if (res.status === 200 && res.body.ok) done(email, res.body.already);
        else if (res.status === 400 && res.body.error === 'invalid_email') setError('That email address doesn\'t look right. Please check it and try again.');
        else if (res.status === 429) setError('Please wait a minute, then try again.');
        else fallback(email);
      })
      .catch(function () { fallback(email); })
      .then(function () { clearTimeout(timer); busy(false); });
  });

  input.addEventListener('input', function () { if (!errorEl.hidden) setError(''); });
  dlg.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
  // A click on the dimmed area around the card closes it
  dlg.addEventListener('click', function (e) { if (e.target === dlg) close(); });
  Array.prototype.forEach.call(dlg.querySelectorAll('[data-voucher-close]'), function (b) { b.addEventListener('click', close); });
  if (tab) tab.addEventListener('click', open);

  /* ---------- When to show it ---------- */
  var state = readState();
  if (state.claimed) return;
  var snoozed = state.dismissed && Date.now() - state.dismissed < SNOOZE;
  if (snoozed) { showTab(true); return; }

  function whenReady(cb) {
    if (root.classList.contains('is-ready')) { cb(); return; }
    var mo = new MutationObserver(function () {
      if (root.classList.contains('is-ready')) { mo.disconnect(); cb(); }
    });
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  }
  whenReady(function () {
    setTimeout(function () {
      // Never interrupt someone who has the menu open
      var menu = document.getElementById('menu');
      if (menu && !menu.hidden) { showTab(true); return; }
      open();
    }, OPEN_DELAY);
  });
})();
