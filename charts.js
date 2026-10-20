/*
  charts.js - Bklit-style chart kit for MasterPiece Tailor

  A dependency-free SVG port of the conventions used by Bklit UI (ui.bklit.com):
  - composable roots: grid first, then series, then axes, then tooltip
  - theming through --chart-* CSS variables (see styles.css :root)
  - ~1100ms staggered enter animation, siblings fade to 0.3 on hover
  - popover tooltips, ring charts with a live centre value, notched gauges

  Bklit itself ships as React + Visx source through the shadcn registry and needs a
  build step. This site is plain static files, so the same look and behaviour is
  reproduced here. GSAP (loaded before this file) drives the motion when present.
*/
(function (global) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DURATION = 1.1;

  var chartCssVars = {
    background: 'var(--chart-background)',
    foreground: 'var(--chart-foreground)',
    foregroundMuted: 'var(--chart-foreground-muted)',
    label: 'var(--chart-label)',
    linePrimary: 'var(--chart-line-primary)',
    lineSecondary: 'var(--chart-line-secondary)',
    crosshair: 'var(--chart-crosshair)',
    grid: 'var(--chart-grid)',
    indicatorColor: 'var(--chart-indicator-color)',
    border: 'var(--border)'
  };

  function reduced() {
    return global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
  function canAnimate() {
    return !!global.gsap && !reduced();
  }

  function svg(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function html(tag, cls, parent, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    if (parent) parent.appendChild(n);
    return n;
  }
  function seriesColor(i) {
    return 'var(--chart-' + ((i % 5) + 1) + ')';
  }

  function niceMax(v) {
    if (v <= 0) return 1;
    var exp = Math.pow(10, Math.floor(Math.log10(v)));
    var f = v / exp;
    var nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
    return nice * exp;
  }

  /* Screen-reader table so every chart's numbers are reachable without the visual. */
  function srTable(container, caption, headers, rows) {
    // Wrap rather than hide the table itself: tables refuse to shrink below their
    // content width, which would widen the page on phones.
    var wrap = html('div', 'sr-only', container);
    var t = html('table', null, wrap);
    html('caption', null, t, caption);
    var thead = html('thead', null, t);
    var hr = html('tr', null, thead);
    headers.forEach(function (h) { html('th', null, hr, h).setAttribute('scope', 'col'); });
    var tb = html('tbody', null, t);
    rows.forEach(function (r) {
      var tr = html('tr', null, tb);
      r.forEach(function (c) { html('td', null, tr, c); });
    });
  }

  /* ------------------------------------------------------------------ */
  /* NumberFlow: rolling digits, after @number-flow/react used by Bklit  */
  /* ------------------------------------------------------------------ */
  function NumberFlow(el, opts) {
    opts = opts || {};
    this.el = el;
    this.decimals = opts.decimals || 0;
    this.suffix = opts.suffix || '';
    this.locale = opts.locale !== false;
    this.str = null;
    el.classList.add('nf');
    this.set(opts.value != null ? opts.value : 0, false);
  }
  NumberFlow.prototype.format = function (v) {
    var s = Number(v).toFixed(this.decimals);
    if (this.locale) {
      var parts = s.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      s = parts.join('.');
    }
    return s + this.suffix;
  };
  NumberFlow.prototype.set = function (v, animate) {
    var str = this.format(v);
    var el = this.el;
    el.setAttribute('aria-label', str);
    if (this.str === null || this.str.length !== str.length) {
      el.textContent = '';
      var vis = html('span', 'nf__vis', el);
      vis.setAttribute('aria-hidden', 'true');
      this.cols = [];
      for (var i = 0; i < str.length; i++) {
        var ch = str[i];
        if (/\d/.test(ch)) {
          var d = html('span', 'nf__d', vis);
          var col = html('span', 'nf__col', d);
          for (var n = 0; n < 10; n++) html('span', null, col, String(n));
          this.cols.push(col);
          col.style.transform = 'translateY(0%)';
        } else {
          html('span', 'nf__s', vis, ch);
          this.cols.push(null);
        }
      }
      // force layout so the first transition runs from 0
      void el.offsetWidth;
    }
    var instant = animate === false || reduced();
    for (var j = 0; j < str.length; j++) {
      var c = this.cols[j];
      if (!c) continue;
      c.style.transition = instant ? 'none' : '';
      c.style.transform = 'translateY(' + (-Number(str[j]) * 10) + '%)';
    }
    this.str = str;
  };
  /* Park every digit at 0 (keeping separators) so a later set() rolls up to the value */
  NumberFlow.prototype.zero = function () {
    (this.cols || []).forEach(function (c) {
      if (!c) return;
      c.style.transition = 'none';
      c.style.transform = 'translateY(0%)';
    });
    void this.el.offsetWidth;
    this.str = this.str ? this.str.replace(/\d/g, '0') : this.str;
  };

  /* ------------------------------------------------------------------ */
  /* RingChart  (RingChart + Ring + RingCenter + Legend)                 */
  /* ------------------------------------------------------------------ */
  function RingChart(container, opts) {
    var o = Object.assign({
      strokeWidth: 12, ringGap: 6, baseInnerRadius: 60, lineCap: 'round',
      defaultLabel: 'Total', defaultValue: 0, decimals: 0, showGlow: true,
      formatLabel: function (d) { return d.label; }
    }, opts);
    container.classList.add('bk', 'bk-ring');
    var n = o.data.length;
    var outer = o.baseInnerRadius + n * (o.strokeWidth + o.ringGap);
    var size = o.size || Math.ceil(outer * 2 + o.strokeWidth);
    var c = size / 2;

    var stage = html('div', 'bk-ring__stage', container);
    var root = svg('svg', { viewBox: '0 0 ' + size + ' ' + size, role: 'img', 'aria-label': o.ariaLabel || '' }, stage);
    var rings = o.data.map(function (d, i) {
      var r = o.baseInnerRadius + i * (o.strokeWidth + o.ringGap) + o.strokeWidth / 2;
      var C = 2 * Math.PI * r;
      var g = svg('g', { 'class': 'bk-ring__g', transform: 'rotate(-90 ' + c + ' ' + c + ')' }, root);
      svg('circle', { cx: c, cy: c, r: r, fill: 'none', stroke: chartCssVars.border, 'stroke-width': o.strokeWidth }, g);
      var color = d.color || seriesColor(i);
      var arc = svg('circle', {
        cx: c, cy: c, r: r, fill: 'none', stroke: color, 'stroke-width': o.strokeWidth,
        'stroke-linecap': o.lineCap, 'stroke-dasharray': C, 'stroke-dashoffset': C, 'class': 'bk-ring__arc'
      }, g);
      return { d: d, r: r, C: C, g: g, arc: arc, color: color, target: C * (1 - Math.min(1, d.value / d.maxValue)) };
    });

    var center = html('div', 'bk-ring__center', stage);
    var valueEl = html('span', 'bk-ring__value', center);
    var labelEl = html('span', 'bk-ring__label', center, o.defaultLabel);
    var flow = new NumberFlow(valueEl, { value: 0, decimals: o.decimals, locale: false });

    var legend = null;
    if (o.legend) {
      legend = html('ul', 'bk-legend', container);
      rings.forEach(function (r, i) {
        var li = html('li', 'bk-legend__item', legend);
        li.tabIndex = 0;
        var sw = html('span', 'bk-legend__swatch', li);
        sw.style.background = r.color;
        html('span', 'bk-legend__label', li, r.d.label);
        html('span', 'bk-legend__value', li, r.d.legendValue || String(r.d.value));
        li.addEventListener('pointerenter', function () { setHover(i); });
        li.addEventListener('pointerleave', function () { setHover(null); });
        li.addEventListener('focus', function () { setHover(i); });
        li.addEventListener('blur', function () { setHover(null); });
      });
    }

    var hovered = null;
    var played = false;
    function setHover(i) {
      if (i === hovered) return;
      hovered = i;
      rings.forEach(function (r, k) {
        var on = i == null || i === k;
        r.g.style.opacity = on ? '1' : '0.3';
        r.arc.style.filter = (o.showGlow && i === k) ? 'drop-shadow(0 0 5px ' + r.color + ')' : 'none';
      });
      if (legend) {
        Array.prototype.forEach.call(legend.children, function (li, k) {
          li.classList.toggle('is-dim', i != null && i !== k);
        });
      }
      if (!played) return;
      if (i == null) {
        flow.set(o.defaultValue);
        labelEl.textContent = o.defaultLabel;
      } else {
        flow.set(rings[i].d.value);
        labelEl.textContent = o.formatLabel(rings[i].d);
      }
      if (o.onHoverChange) o.onHoverChange(i);
    }

    function pointer(e) {
      var rect = root.getBoundingClientRect();
      var scale = size / rect.width;
      var x = (e.clientX - rect.left) * scale - c;
      var y = (e.clientY - rect.top) * scale - c;
      var dist = Math.sqrt(x * x + y * y);
      var idx = null;
      rings.forEach(function (r, k) {
        if (Math.abs(dist - r.r) <= o.strokeWidth / 2 + o.ringGap / 2) idx = k;
      });
      setHover(idx);
    }
    root.addEventListener('pointermove', pointer);
    root.addEventListener('pointerleave', function () { setHover(null); });

    srTable(container, o.ariaLabel || 'Ring chart', ['Series', 'Value', 'Maximum'],
      o.data.map(function (d) { return [d.label, String(d.value), String(d.maxValue)]; }));

    function play() {
      if (played) return;
      played = true;
      if (canAnimate()) {
        rings.forEach(function (r, i) {
          global.gsap.to(r.arc, { attr: { 'stroke-dashoffset': r.target }, duration: DURATION + i * 0.15, ease: 'power3.out', delay: i * 0.12 });
        });
      } else {
        rings.forEach(function (r) { r.arc.setAttribute('stroke-dashoffset', r.target); });
      }
      flow.set(o.defaultValue);
    }
    return { play: play, setHover: setHover, el: root };
  }

  /* ------------------------------------------------------------------ */
  /* BarChart (BarChart + Grid + Bar + BarXAxis + ChartTooltip)          */
  /* ------------------------------------------------------------------ */
  function BarChart(container, opts) {
    var o = Object.assign({
      xDataKey: 'name', orientation: 'vertical', aspectRatio: 2, minHeight: 220,
      margin: null, barGap: 0.28, lineCap: 'round', fadedOpacity: 0.3, grid: true,
      ticks: 4, valueFormat: function (v) { return String(v); },
      tooltip: null, labelLines: 2
    }, opts);
    // Orientation can flip to horizontal on narrow containers (o.horizontalBelow, in px)
    var vertical = true;
    var margin = null;
    var longest = 0;
    o.data.forEach(function (d) { longest = Math.max(longest, String(d[o.xDataKey]).length); });
    function layout(W) {
      vertical = o.orientation === 'vertical' && !(o.horizontalBelow && W < o.horizontalBelow);
      var base = vertical
        ? { top: 16, right: 8, bottom: 48, left: 34 }
        : { top: 8, right: 44, bottom: 28, left: Math.max(56, Math.round(longest * 6.6) + 18) };
      margin = Object.assign(base, (o.orientation === 'vertical' && !vertical ? o.marginH : o.margin) || {});
      container.classList.toggle('bk-bar--v', vertical);
      container.classList.toggle('bk-bar--h', !vertical);
    }
    container.classList.add('bk', 'bk-bar');
    var plot = html('div', 'bk-bar__plot', container);
    var tip = html('div', 'bk-tooltip', container);
    tip.setAttribute('aria-hidden', 'true');

    var keys = o.bars.map(function (b) { return b.dataKey; });
    var played = false;
    var hovered = null;
    var geom = null;

    srTable(container, o.ariaLabel || 'Bar chart', [o.xLabel || 'Category'].concat(o.bars.map(function (b) { return b.label || b.dataKey; })),
      o.data.map(function (d) { return [String(d[o.xDataKey])].concat(keys.map(function (k) { return String(d[k]); })); }));

    function wrapLabel(text, maxChars) {
      var words = String(text).split(' ');
      var lines = [''];
      words.forEach(function (w) {
        var cur = lines[lines.length - 1];
        if ((cur + ' ' + w).trim().length > maxChars && cur) lines.push(w);
        else lines[lines.length - 1] = (cur + ' ' + w).trim();
      });
      return lines.slice(0, o.labelLines);
    }

    function render() {
      var W = Math.max(240, Math.round(container.clientWidth));
      layout(W);
      var ratio = (o.orientation === 'vertical' && !vertical) ? (o.hAspectRatio || 1.1) : o.aspectRatio;
      var H = Math.max(o.minHeight, Math.round(W / ratio));
      plot.textContent = '';
      var root = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.ariaLabel || '', tabindex: '0' }, plot);
      var iw = W - margin.left - margin.right;
      var ih = H - margin.top - margin.bottom;
      var raw = 0;
      o.data.forEach(function (d) { keys.forEach(function (k) { raw = Math.max(raw, +d[k] || 0); }); });
      var max = o.max || niceMax(raw);
      var g = svg('g', { transform: 'translate(' + margin.left + ',' + margin.top + ')' }, root);

      // Grid (before series so bars render above it)
      var gridG = svg('g', { 'class': 'bk-grid' }, g);
      for (var t = 0; t <= o.ticks; t++) {
        var val = (max / o.ticks) * t;
        if (vertical) {
          var y = ih - (val / max) * ih;
          if (o.grid) svg('line', { x1: 0, x2: iw, y1: y, y2: y, stroke: chartCssVars.grid, 'stroke-dasharray': t === 0 ? 'none' : '3 4' }, gridG);
          svg('text', { x: -10, y: y, dy: '0.32em', 'text-anchor': 'end', 'class': 'bk-axis' }, gridG).textContent = o.valueFormat(Math.round(val * 10) / 10);
        } else {
          var x = (val / max) * iw;
          if (o.grid) svg('line', { x1: x, x2: x, y1: 0, y2: ih, stroke: chartCssVars.grid, 'stroke-dasharray': t === 0 ? 'none' : '3 4' }, gridG);
          svg('text', { x: x, y: ih + 18, 'text-anchor': 'middle', 'class': 'bk-axis' }, gridG).textContent = o.valueFormat(Math.round(val * 10) / 10);
        }
      }

      var n = o.data.length;
      var band = (vertical ? iw : ih) / n;
      var inner = band * (1 - o.barGap);
      var crosshair = svg('rect', { 'class': 'bk-crosshair', fill: chartCssVars.crosshair, opacity: 0, rx: 4 }, g);
      var seriesG = svg('g', { 'class': 'bk-series' }, g);
      var indicator = svg('rect', { 'class': 'bk-indicator', fill: chartCssVars.indicatorColor, opacity: 0 }, g);
      var bars = [];

      o.data.forEach(function (d, i) {
        keys.forEach(function (k, ki) {
          var v = +d[k] || 0;
          var bw = inner / keys.length;
          var fill = o.bars[ki].fill || seriesColor(ki);
          var a = {};
          if (vertical) {
            var h = (v / max) * ih;
            a = { x: i * band + (band - inner) / 2 + ki * bw, y: ih - h, width: bw, height: h, base: { y: ih, height: 0 } };
          } else {
            var w = (v / max) * iw;
            a = { x: 0, y: i * band + (band - inner) / 2 + ki * bw, width: w, height: bw, base: { width: 0 } };
          }
          // 'round' caps: pill ends on thin bars, softened corners on wide ones (so short bars never turn into ellipses)
          var rx = o.lineCap === 'round' ? Math.min(vertical ? a.width / 2 : a.height / 2, 10) : (typeof o.lineCap === 'number' ? o.lineCap : 0);
          var rect = svg('rect', { x: a.x, y: a.y, width: Math.max(0, a.width), height: Math.max(0, a.height), rx: rx, fill: fill, 'class': 'bk-bar__rect' }, seriesG);
          if (!played) {
            if (vertical) { rect.setAttribute('y', a.base.y); rect.setAttribute('height', 0); }
            else rect.setAttribute('width', 0);
          }
          bars.push({ rect: rect, i: i, key: k, v: v, d: d, a: a, fill: fill });
        });

        // category labels
        if (vertical) {
          var lines = wrapLabel(d[o.xDataKey], Math.max(6, Math.floor(band / 7)));
          var tx = svg('text', { x: i * band + band / 2, y: ih + 18, 'text-anchor': 'middle', 'class': 'bk-axis bk-axis--cat' }, g);
          lines.forEach(function (ln, li) {
            var ts = svg('tspan', { x: i * band + band / 2, dy: li === 0 ? 0 : '1.2em' }, tx);
            ts.textContent = ln;
          });
        } else {
          svg('text', { x: -12, y: i * band + band / 2, dy: '0.32em', 'text-anchor': 'end', 'class': 'bk-axis bk-axis--cat' }, g).textContent = d[o.xDataKey];
          if (o.valueLabels) {
            var vl = svg('text', { x: 0, y: i * band + band / 2, dy: '0.32em', 'class': 'bk-value-label' }, g);
            vl.textContent = o.valueFormat(+d[keys[0]] || 0);
            vl.dataset.final = String(((+d[keys[0]] || 0) / max) * iw + 8);
            vl.setAttribute('x', played ? vl.dataset.final : 8);
            if (!played) vl.setAttribute('opacity', 0);
          }
        }
      });

      geom = { root: root, g: g, bars: bars, band: band, inner: inner, iw: iw, ih: ih, W: W, H: H, crosshair: crosshair, indicator: indicator };

      // Interaction: pointer and keyboard drive the same hover state
      root.addEventListener('pointermove', function (e) {
        var r = root.getBoundingClientRect();
        var px = e.clientX - r.left - margin.left;
        var py = e.clientY - r.top - margin.top;
        var idx = Math.floor((vertical ? px : py) / band);
        if (idx < 0 || idx >= n || (vertical ? (py < -8 || py > ih + 8) : (px < -margin.left || px > iw + 8))) setHover(null);
        else setHover(idx);
      });
      root.addEventListener('pointerleave', function () { setHover(null); });
      root.addEventListener('focus', function () { setHover(hovered == null ? 0 : hovered); });
      root.addEventListener('blur', function () { setHover(null); });
      root.addEventListener('keydown', function (e) {
        var next = hovered == null ? 0 : hovered;
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = Math.min(n - 1, next + 1);
        else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = Math.max(0, next - 1);
        else if (e.key === 'Escape') { setHover(null); return; }
        else return;
        e.preventDefault();
        setHover(next);
      });
      var keep = hovered; hovered = null;
      if (keep != null) setHover(keep);
    }

    function setHover(i) {
      if (i === hovered || !geom) return;
      hovered = i;
      geom.bars.forEach(function (b) {
        b.rect.style.opacity = (i == null || b.i === i) ? '1' : String(o.fadedOpacity);
      });
      if (i == null) {
        geom.crosshair.setAttribute('opacity', 0);
        geom.indicator.setAttribute('opacity', 0);
        tip.classList.remove('is-on');
        return;
      }
      var b0 = geom.bars.filter(function (b) { return b.i === i; });
      var top = b0[0];
      if (vertical) {
        geom.crosshair.setAttribute('x', i * geom.band + 2);
        geom.crosshair.setAttribute('width', geom.band - 4);
        geom.crosshair.setAttribute('y', 0);
        geom.crosshair.setAttribute('height', geom.ih);
        geom.indicator.setAttribute('x', top.a.x);
        geom.indicator.setAttribute('width', geom.inner);
        geom.indicator.setAttribute('y', Math.max(0, top.a.y - 6));
        geom.indicator.setAttribute('height', 2);
      } else {
        geom.crosshair.setAttribute('x', -margin.left + 4);
        geom.crosshair.setAttribute('width', geom.iw + margin.left);
        geom.crosshair.setAttribute('y', i * geom.band + 1);
        geom.crosshair.setAttribute('height', geom.band - 2);
        geom.indicator.setAttribute('x', top.a.width + 4);
        geom.indicator.setAttribute('width', 2);
        geom.indicator.setAttribute('y', top.a.y);
        geom.indicator.setAttribute('height', geom.inner);
      }
      geom.crosshair.setAttribute('opacity', 0.06);
      geom.indicator.setAttribute('opacity', played ? 1 : 0);

      // ChartTooltip
      var d = top.d;
      tip.textContent = '';
      html('div', 'bk-tooltip__title', tip, o.tooltip && o.tooltip.title ? o.tooltip.title(d) : String(d[o.xDataKey]));
      b0.forEach(function (b, k) {
        var row = html('div', 'bk-tooltip__row', tip);
        var dot = html('span', 'bk-tooltip__dot', row);
        dot.style.background = b.fill;
        html('span', 'bk-tooltip__label', row, (o.bars[k].label || b.key));
        html('span', 'bk-tooltip__value', row, o.tooltip && o.tooltip.value ? o.tooltip.value(b.v, d) : o.valueFormat(b.v));
      });
      var cw = container.clientWidth;
      var tw = tip.offsetWidth || 160;
      var th = tip.offsetHeight || 60;
      var x, y;
      if (vertical) {
        x = margin.left + i * geom.band + geom.band / 2 - tw / 2;
        y = margin.top + top.a.y - th - 14;
        if (y < 0) y = margin.top + 4;
      } else {
        x = margin.left + top.a.width + 16;
        y = margin.top + top.a.y + top.a.height / 2 - th / 2;
        if (x + tw > cw) x = margin.left + top.a.width - tw - 12;
      }
      x = Math.max(0, Math.min(cw - tw, x));
      tip.style.transform = 'translate(' + Math.round(x) + 'px,' + Math.round(y) + 'px)';
      tip.classList.add('is-on');
    }

    function play() {
      if (played || !geom) return;
      played = true;
      var count = geom.bars.length;
      var stagger = Math.min(0.08, 0.45 / Math.max(1, count));
      var labels = geom.root.querySelectorAll('.bk-value-label');
      if (canAnimate()) {
        geom.bars.forEach(function (b, k) {
          var to = vertical ? { y: b.a.y, height: Math.max(0, b.a.height) } : { width: Math.max(0, b.a.width) };
          global.gsap.to(b.rect, { attr: to, duration: DURATION, ease: 'expo.out', delay: k * stagger });
        });
        Array.prototype.forEach.call(labels, function (l, k) {
          global.gsap.to(l, { attr: { x: l.dataset.final, opacity: 1 }, duration: DURATION, ease: 'expo.out', delay: k * stagger });
        });
      } else {
        geom.bars.forEach(function (b) {
          if (vertical) { b.rect.setAttribute('y', b.a.y); b.rect.setAttribute('height', Math.max(0, b.a.height)); }
          else b.rect.setAttribute('width', Math.max(0, b.a.width));
        });
        Array.prototype.forEach.call(labels, function (l) { l.setAttribute('x', l.dataset.final); l.setAttribute('opacity', 1); });
      }
    }

    render();
    var lastW = container.clientWidth;
    var timer = null;
    if (global.ResizeObserver) {
      new ResizeObserver(function () {
        var w = container.clientWidth;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        clearTimeout(timer);
        timer = setTimeout(render, 120);
      }).observe(container);
    }
    return { play: play, setHover: setHover };
  }

  /* ------------------------------------------------------------------ */
  /* GaugeChart: notched half dial, inactive notches use --border        */
  /* ------------------------------------------------------------------ */
  function GaugeChart(container, opts) {
    var o = Object.assign({ notches: 33, max: 100, suffix: '%', label: '' }, opts);
    container.classList.add('bk', 'bk-gauge');
    var stage = html('div', 'bk-gauge__stage', container);
    var W = 260, H = 150, cx = 130, cy = 136, r = 110;
    var root = svg('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.ariaLabel || '' }, stage);
    var active = Math.round((o.value / o.max) * o.notches);
    var on = [];
    for (var i = 0; i < o.notches; i++) {
      var a = Math.PI + (i / (o.notches - 1)) * Math.PI;
      var x1 = cx + Math.cos(a) * (r - 18), y1 = cy + Math.sin(a) * (r - 18);
      var x2 = cx + Math.cos(a) * r, y2 = cy + Math.sin(a) * r;
      svg('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: chartCssVars.border, 'stroke-width': 4, 'stroke-linecap': 'round' }, root);
      if (i < active) on.push(svg('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: o.color || seriesColor(0), 'stroke-width': 4, 'stroke-linecap': 'round', opacity: 0 }, root));
    }
    var center = html('div', 'bk-gauge__center', stage);
    var v = html('span', 'bk-gauge__value', center);
    html('span', 'bk-gauge__label', center, o.label);
    var flow = new NumberFlow(v, { value: 0, suffix: o.suffix, locale: false });
    srTable(container, o.ariaLabel || 'Gauge', ['Measure', 'Value'], [[o.label, o.value + o.suffix]]);
    var played = false;
    function play() {
      if (played) return;
      played = true;
      if (canAnimate()) global.gsap.to(on, { opacity: 1, duration: 0.25, stagger: DURATION / Math.max(1, on.length), ease: 'none' });
      else on.forEach(function (l) { l.setAttribute('opacity', 1); });
      flow.set(o.value);
    }
    return { play: play };
  }

  /* ------------------------------------------------------------------ */
  /* SpanChart: consecutive date ranges on one axis (a timeline bar),    */
  /* with Grid ticks, grow-in animation and ChartTooltip on hover        */
  /* ------------------------------------------------------------------ */
  function SpanChart(container, opts) {
    var o = Object.assign({ height: 132, barHeight: 16, gap: 4, ticks: [], tickLabel: function (t) { return String(t); } }, opts);
    container.classList.add('bk', 'bk-span');
    var plot = html('div', 'bk-span__plot', container);
    var tip = html('div', 'bk-tooltip', container);
    tip.setAttribute('aria-hidden', 'true');
    var played = false;
    var geom = null;
    var hovered = null;

    srTable(container, o.ariaLabel || 'Timeline', ['Period', 'From', 'To'],
      o.segments.map(function (s) { return [s.label, s.fromLabel || String(s.from), s.toLabel || String(s.to)]; }));

    function render() {
      var W = Math.max(260, Math.round(container.clientWidth));
      var H = o.height;
      var m = { top: 34, right: 12, bottom: 30, left: 12 };
      var iw = W - m.left - m.right;
      var x = function (v) { return m.left + ((v - o.min) / (o.max - o.min)) * iw; };
      plot.textContent = '';
      var root = svg('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': o.ariaLabel || '', tabindex: '0' }, plot);
      var by = m.top + 18;

      // Grid: tick marks and year labels
      var gridG = svg('g', { 'class': 'bk-grid' }, root);
      svg('line', { x1: m.left, x2: W - m.right, y1: by + o.barHeight / 2, y2: by + o.barHeight / 2, stroke: chartCssVars.grid }, gridG);
      o.ticks.forEach(function (t) {
        svg('line', { x1: x(t), x2: x(t), y1: by - 8, y2: by + o.barHeight + 8, stroke: chartCssVars.grid, 'stroke-dasharray': '3 4' }, gridG);
        svg('text', { x: x(t), y: H - 8, 'text-anchor': 'middle', 'class': 'bk-axis' }, gridG).textContent = o.tickLabel(t);
      });

      var segs = o.segments.map(function (s, i) {
        var x0 = x(s.from) + (i ? o.gap / 2 : 0);
        var x1 = x(s.to) - (i < o.segments.length - 1 ? o.gap / 2 : 0);
        var g = svg('g', { 'class': 'bk-span__seg' }, root);
        var rect = svg('rect', { x: x0, y: by, width: played ? x1 - x0 : 0, height: o.barHeight, rx: o.barHeight / 2, fill: s.color || seriesColor(i) }, g);
        var label = svg('text', { x: x0, y: by - 12, 'class': 'bk-span__label' }, g);
        label.textContent = s.short || s.label;
        if (!played) label.setAttribute('opacity', 0);
        return { s: s, g: g, rect: rect, label: label, x0: x0, x1: x1 };
      });
      geom = { root: root, segs: segs, by: by };

      root.addEventListener('pointermove', function (e) {
        var r = root.getBoundingClientRect();
        var px = e.clientX - r.left;
        var idx = null;
        segs.forEach(function (sg, k) { if (px >= sg.x0 - 2 && px <= sg.x1 + 2) idx = k; });
        setHover(idx);
      });
      root.addEventListener('pointerleave', function () { setHover(null); });
      root.addEventListener('focus', function () { setHover(0); });
      root.addEventListener('blur', function () { setHover(null); });
      root.addEventListener('keydown', function (e) {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        e.preventDefault();
        var n = segs.length;
        setHover(hovered == null ? 0 : (hovered + (e.key === 'ArrowRight' ? 1 : n - 1)) % n);
      });
      var keep = hovered; hovered = null;
      if (keep != null) setHover(keep);
    }

    function setHover(i) {
      if (i === hovered || !geom) return;
      hovered = i;
      geom.segs.forEach(function (sg, k) { sg.g.style.opacity = (i == null || i === k) ? '1' : '0.3'; });
      if (i == null) { tip.classList.remove('is-on'); return; }
      var sg = geom.segs[i];
      tip.textContent = '';
      html('div', 'bk-tooltip__title', tip, sg.s.label);
      var row = html('div', 'bk-tooltip__row', tip);
      var dot = html('span', 'bk-tooltip__dot', row);
      dot.style.background = sg.s.color || seriesColor(i);
      html('span', 'bk-tooltip__label', row, (sg.s.fromLabel || sg.s.from) + ' to ' + (sg.s.toLabel || sg.s.to));
      html('span', 'bk-tooltip__value', row, sg.s.valueLabel || '');
      var cw = container.clientWidth;
      var tw = tip.offsetWidth || 200;
      var tx = Math.max(0, Math.min(cw - tw, (sg.x0 + sg.x1) / 2 - tw / 2));
      var ty = geom.by + o.barHeight + 16;
      tip.style.transform = 'translate(' + Math.round(tx) + 'px,' + Math.round(ty) + 'px)';
      tip.classList.add('is-on');
    }

    function play() {
      if (played || !geom) return;
      played = true;
      geom.segs.forEach(function (sg, k) {
        if (canAnimate()) {
          global.gsap.to(sg.rect, { attr: { width: Math.max(0, sg.x1 - sg.x0) }, duration: DURATION * 1.2, ease: 'expo.out', delay: k * 0.5 });
          global.gsap.to(sg.label, { attr: { opacity: 1 }, duration: 0.5, delay: 0.2 + k * 0.5 });
        } else {
          sg.rect.setAttribute('width', Math.max(0, sg.x1 - sg.x0));
          sg.label.setAttribute('opacity', 1);
        }
      });
    }

    render();
    var lastW = container.clientWidth;
    var timer = null;
    if (global.ResizeObserver) {
      new ResizeObserver(function () {
        var w = container.clientWidth;
        if (Math.abs(w - lastW) < 2) return;
        lastW = w;
        clearTimeout(timer);
        timer = setTimeout(render, 120);
      }).observe(container);
    }
    return { play: play, setHover: setHover };
  }

  global.Bklit = {
    RingChart: RingChart,
    BarChart: BarChart,
    GaugeChart: GaugeChart,
    SpanChart: SpanChart,
    NumberFlow: NumberFlow,
    chartCssVars: chartCssVars
  };
})(window);
