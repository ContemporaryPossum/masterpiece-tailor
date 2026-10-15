/*
  threads.js - the scroll-scrubbed vector background for MasterPiece Tailor

  A fixed canvas draws K gold "threads", each a polyline of M points. Every page
  section names a scene (data-scene="drape" | "weave" | ...). As you scroll, the
  threads morph from one scene's shape to the next, like scrubbing through a
  vector animation. The pointer parts the threads; scroll speed adds energy.

  API (used by main.js):
    Threads.init(canvas, { scenes: ['drape','weave',...], reduce: bool })
    Threads.progress(float)   // 0 .. scenes.length - 1, from ScrollTrigger
    Threads.kick(velocity)    // scroll velocity from Lenis
*/
(function (global) {
  'use strict';

  var PI = Math.PI, TAU = PI * 2;
  var canvas, ctx;
  var W = 0, H = 0, dpr = 1;
  var K = 40, M = 90;
  var order = [];
  var s = 0, sTarget = 0;
  var energy = 1, energyTarget = 1;
  var time = 0, last = 0, raf = 0, running = false, reduce = false;
  var mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999 };
  var colors = [], widths = [];
  var A = [0, 0], B = [0, 0];
  var frameTimes = [], degraded = false;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function hash(i) { var x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

  /* Crown outline, normalised, resampled by arc length */
  var crownPts = [[-1, -0.62], [-0.46, 0.62], [0, -0.3], [0.46, 0.62], [1, -0.62]];
  var crownLen = [0];
  (function () {
    for (var i = 1; i < crownPts.length; i++) {
      var dx = crownPts[i][0] - crownPts[i - 1][0], dy = crownPts[i][1] - crownPts[i - 1][1];
      crownLen.push(crownLen[i - 1] + Math.sqrt(dx * dx + dy * dy));
    }
  })();
  function crownAt(u, out) {
    var L = crownLen[crownLen.length - 1] * u;
    for (var i = 1; i < crownLen.length; i++) {
      if (L <= crownLen[i] || i === crownLen.length - 1) {
        var t = (L - crownLen[i - 1]) / (crownLen[i] - crownLen[i - 1] || 1);
        out[0] = crownPts[i - 1][0] + (crownPts[i][0] - crownPts[i - 1][0]) * t;
        out[1] = crownPts[i - 1][1] + (crownPts[i][1] - crownPts[i - 1][1]) * t;
        return;
      }
    }
  }
  var C2 = [0, 0];

  /* ---- Scenes: (i, v, u, out). v = thread 0..1, u = along thread 0..1 ---- */
  var SCENES = {
    // Hero: silk drape, slow swells with a finer ripple
    drape: function (i, v, u, out) {
      var e = energy;
      out[0] = W * (-0.06 + 1.12 * u);
      var y = H * (0.1 + 0.88 * Math.pow(v, 1.15));
      y += Math.sin(u * PI * 1.1 + v * 1.4 + time * 0.22) * H * 0.075 * (0.55 + 0.45 * Math.sin(v * 3 + time * 0.17));
      y += Math.sin(u * PI * 3.2 + time * 0.45 + v * 5.0) * H * 0.012 * e;
      out[1] = y;
    },
    // Vertical pinstripes with a slight slant and sway
    weave: function (i, v, u, out) {
      out[1] = H * (-0.06 + 1.12 * u);
      out[0] = W * (-0.04 + 1.08 * v) + (u - 0.5) * W * 0.16 + Math.sin(u * 5.5 + time * 0.35 + v * 3) * W * 0.006 * energy;
    },
    // Threads gathered through a single point, like a spool or a needle's eye
    spool: function (i, v, u, out) {
      out[0] = W * (-0.06 + 1.12 * u);
      var spread = Math.pow(Math.abs(u - 0.5) * 2, 1.7);
      out[1] = H * 0.52 + (v - 0.5) * H * (0.035 + 0.95 * spread) + Math.sin(u * 9 + time * 0.5 + v * 6) * H * 0.005 * energy;
    },
    // Pattern-cutting mat: calm horizontal rules
    grid: function (i, v, u, out) {
      out[0] = W * (-0.06 + 1.12 * u);
      out[1] = H * (0.04 + v * 0.92) + Math.sin(u * 3 + time * 0.2 + v * 2) * H * 0.004 * energy;
    },
    // Vertical curtain folds
    folds: function (i, v, u, out) {
      out[1] = H * (-0.06 + 1.12 * u);
      out[0] = W * (-0.02 + 1.04 * v) + Math.sin(u * PI * 1.6 + time * 0.28 + v * 6) * W * 0.03 * energy + Math.sin(v * PI * 5) * W * 0.012;
    },
    // Rising data lines, fanned from the lower left
    chart: function (i, v, u, out) {
      out[0] = W * (-0.06 + 1.12 * u);
      var curve = Math.pow(u, 1.5);
      out[1] = H * (0.92 - 0.03 * v) - H * (0.08 + 0.66 * v) * curve + Math.sin(u * 13 + v * 7 + time * 0.6) * H * 0.008 * (0.4 + u) * energy;
    },
    // Concentric rings, like a ripple or a tape measure coiled up
    rings: function (i, v, u, out) {
      var narrow = W < 800;
      var cx = narrow ? W * 0.5 : W * 0.74, cy = narrow ? H * 0.32 : H * 0.5;
      var m = Math.min(W, H);
      var r = m * (0.05 + v * 0.66);
      var a = u * TAU + time * 0.04 * (v - 0.5);
      r += Math.sin(a * 5 + time * 0.6 + v * 4) * m * 0.006 * energy;
      out[0] = cx + Math.cos(a) * r;
      out[1] = cy + Math.sin(a) * r * 0.94;
    },
    // Diagonal twill
    twill: function (i, v, u, out) {
      var ang = -0.58, ca = Math.cos(ang), sa = Math.sin(ang);
      var L = Math.sqrt(W * W + H * H) * 1.25;
      var off = (v - 0.5) * L * 0.95;
      var px = W * 0.5 - sa * off, py = H * 0.5 + ca * off;
      var t = (u - 0.5) * L;
      out[0] = px + ca * t + Math.sin(u * 8 + time * 0.4 + v * 3) * 4 * energy;
      out[1] = py + sa * t;
    },
    // Topographic contours, for the map and the ateliers
    contour: function (i, v, u, out) {
      out[0] = W * (-0.06 + 1.12 * u);
      out[1] = H * (0.06 + v * 0.88) + (Math.sin(u * 4.2 + v * 2.1 + time * 0.12) + 0.6 * Math.sin(u * 7.3 - v * 3.4 + time * 0.09)) * H * 0.04 * (0.6 + 0.4 * energy);
    },
    // Nested crowns from the MasterPiece mark
    crown: function (i, v, u, out) {
      crownAt(u, C2);
      var size = Math.min(W * 0.44, H * 0.6);
      var sc = size * (0.14 + v * 1.25);
      var wob = 1 + Math.sin(time * 0.5 + v * 6) * 0.01 * energy;
      out[0] = W * 0.5 + C2[0] * sc * wob;
      out[1] = H * 0.5 + C2[1] * sc * 0.82 * wob;
    }
  };

  function buildStyles() {
    colors = []; widths = [];
    for (var i = 0; i < K; i++) {
      var h = hash(i);
      var a = 0.06 + h * 0.12;
      var col = '214, 181, 112';
      if (i % 9 === 4) { a = 0.3; }
      if (i % 13 === 7) { col = '236, 230, 214'; a = 0.16; }
      colors.push('rgba(' + col + ',' + a.toFixed(3) + ')');
      widths.push(i % 9 === 4 ? 1.15 : 0.85);
    }
  }

  function resize(force) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    if (!force && Math.abs(w - W) < 1 && Math.abs(h - H) < 140) return;
    W = w; H = h;
    var narrow = W < 800;
    dpr = Math.min(global.devicePixelRatio || 1, narrow ? 1.5 : 2);
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    var k = narrow ? 26 : 40, m = narrow ? 64 : 90;
    if (degraded) { k = Math.round(k * 0.65); m = Math.round(m * 0.7); }
    if (k !== K || !colors.length) { K = k; buildStyles(); }
    M = m;
    if (reduce || !running) draw();
  }

  function draw() {
    if (!ctx || !order.length) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    var n = order.length;
    var sc = clamp(s, 0, n - 1);
    var ia = Math.floor(sc), ib = Math.min(n - 1, ia + 1), t = sc - ia;
    var fa = order[ia], fb = order[ib];
    var R = Math.min(W, H) * 0.2, R2 = R * R, PUSH = Math.min(W, H) * 0.06;
    var mx = mouse.sx, my = mouse.sy;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (var i = 0; i < K; i++) {
      var v = K > 1 ? i / (K - 1) : 0;
      var e = 0;
      if (fa !== fb && t > 0) e = ease(clamp((t - v * 0.28) / 0.72, 0, 1));
      ctx.beginPath();
      for (var j = 0; j < M; j++) {
        var u = j / (M - 1);
        fa(i, v, u, A);
        var x = A[0], y = A[1];
        if (e > 0) {
          fb(i, v, u, B);
          x += (B[0] - x) * e;
          y += (B[1] - y) * e;
        }
        if (!reduce) {
          var dx = x - mx, dy = y - my, d2 = dx * dx + dy * dy;
          if (d2 < R2) {
            var d = Math.sqrt(d2) || 1;
            var f = 1 - d2 / R2;
            var p = f * f * PUSH;
            x += (dx / d) * p;
            y += (dy / d) * p;
          }
        }
        if (j === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = colors[i];
      ctx.lineWidth = widths[i];
      ctx.stroke();
    }
  }

  function frame(now) {
    if (!running) return;
    var dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    time += dt;
    var k = 1 - Math.pow(0.02, dt);
    s += (sTarget - s) * k;
    if (Math.abs(sTarget - s) < 0.0005) s = sTarget;
    energy += (energyTarget - energy) * (1 - Math.pow(0.05, dt));
    energyTarget += (1 - energyTarget) * (1 - Math.pow(0.2, dt));
    var mk = 1 - Math.pow(0.0008, dt);
    mouse.sx += (mouse.x - mouse.sx) * mk;
    mouse.sy += (mouse.y - mouse.sy) * mk;
    draw();

    // Adaptive quality: if the device struggles, thin the threads once
    if (!degraded) {
      frameTimes.push(dt);
      if (frameTimes.length > 90) {
        var avg = frameTimes.reduce(function (a, b) { return a + b; }, 0) / frameTimes.length;
        frameTimes.length = 0;
        if (avg > 0.03) { degraded = true; resize(true); }
      }
    }
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (running || reduce) return;
    running = true;
    last = 0;
    raf = requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    cancelAnimationFrame(raf);
  }

  var Threads = {
    init: function (el, opts) {
      opts = opts || {};
      canvas = el;
      ctx = canvas.getContext('2d');
      if (!ctx) return;
      reduce = !!opts.reduce;
      order = (opts.scenes || ['drape']).map(function (name) { return SCENES[name] || SCENES.drape; });
      resize(true);
      global.addEventListener('resize', function () { resize(false); }, { passive: true });
      if (!reduce) {
        global.addEventListener('pointermove', function (e) {
          mouse.x = e.clientX; mouse.y = e.clientY;
          if (mouse.sx < -999) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
        }, { passive: true });
        document.addEventListener('pointerleave', function () { mouse.x = -9999; mouse.y = -9999; });
        document.addEventListener('visibilitychange', function () {
          if (document.hidden) stop(); else start();
        });
        start();
      } else {
        draw();
      }
    },
    progress: function (p) {
      sTarget = p;
      if (reduce) { s = p; draw(); }
    },
    kick: function (velocity) {
      var v = Math.min(2.2, 1 + Math.abs(velocity) / 22);
      if (v > energyTarget) energyTarget = v;
    },
    pause: stop,
    resume: start
  };

  global.Threads = Threads;
})(window);
