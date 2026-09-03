/* =============================================================================
   site/explore/app.js  —  shared runtime for the Explore page.

   Zero dependencies. Vanilla JS. Everything the three views need lives here:
     App.load / App.fmt / App.color / App.tooltip / App.el / App.svg /
     App.legend / App.registerView   (the contract), plus
     App.chart.line / .bars / .choropleth / .spark, App.control.yearSlider,
     App.geo.project, App.ui.*, App.util.*   (the shared toolkit).

   Colour decisions were validated with the dataviz skill's validate_palette.js
   against this page's surface (#0a0a0f, dark mode):
     categorical 8 slots ...... ALL CHECKS PASS
     sequential ramp (6 steps)  ALL CHECKS PASS (--ordinal)
     diverging arms (4 steps)   monotone L, ΔL and light-end contrast PASS
                                (the "single hue" check fails by design: a
                                 diverging ramp is two hues + a neutral mid)
   ========================================================================== */
(function () {
  'use strict';

  var App = {};
  window.App = App;

  var NS = 'http://www.w3.org/2000/svg';
  var DASH = '—';
  var MINUS = '−';
  var uidN = 0;
  function uid(p) { return (p || 'u') + (++uidN); }

  /* ============================ small utilities ============================ */

  function isNum(v) { return typeof v === 'number' && isFinite(v); }
  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function extent(arr, acc) {
    var lo = Infinity, hi = -Infinity, n = 0;
    for (var i = 0; i < arr.length; i++) {
      var v = acc ? acc(arr[i], i) : arr[i];
      if (isNum(v)) { if (v < lo) lo = v; if (v > hi) hi = v; n++; }
    }
    return n ? [lo, hi] : [null, null];
  }

  function tickStep(span, count) {
    if (!(span > 0)) return 1;
    var raw = span / Math.max(1, count);
    var mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10));
    var norm = raw / mag;
    var step = norm >= 7.5 ? 10 : norm >= 3.5 ? 5 : norm >= 1.5 ? 2 : 1;
    return step * mag;
  }

  /* Round a domain out to clean tick values. -> {min,max,step,ticks:[]} */
  function niceScale(min, max, count) {
    count = count || 4;
    if (!isNum(min) || !isNum(max)) return { min: 0, max: 1, step: 1, ticks: [0, 1] };
    if (min === max) {
      if (min === 0) { max = 1; }
      else { var pad = Math.abs(min) * 0.1 || 1; min -= pad; max += pad; }
    }
    var step = tickStep(max - min, count);
    var lo = Math.floor(min / step) * step;
    var hi = Math.ceil(max / step) * step;
    var ticks = [];
    for (var v = lo; v <= hi + step * 1e-9; v += step) ticks.push(+v.toPrecision(12));
    return { min: lo, max: hi, step: step, ticks: ticks };
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function rafDebounce(fn) {
    var pending = false;
    return function () {
      if (pending) return;
      pending = true;
      requestAnimationFrame(function () { pending = false; fn(); });
    };
  }

  /* Observe an element's width. Returns an unsubscribe function. */
  function onResize(el, fn) {
    var cb = rafDebounce(fn);
    if (typeof ResizeObserver === 'function') {
      var ro = new ResizeObserver(cb);
      ro.observe(el);
      return function () { ro.disconnect(); };
    }
    window.addEventListener('resize', cb);
    return function () { window.removeEventListener('resize', cb); };
  }

  App.util = {
    isNum: isNum, clamp: clamp, lerp: lerp, extent: extent,
    niceScale: niceScale, tickStep: tickStep, esc: esc, uid: uid,
    onResize: onResize, rafDebounce: rafDebounce,
    /* sum/mean that ignore null (never coerce a suppressed value to 0) */
    sum: function (arr) { var s = 0, n = 0; for (var i = 0; i < arr.length; i++) if (isNum(arr[i])) { s += arr[i]; n++; } return n ? s : null; },
    mean: function (arr) { var s = 0, n = 0; for (var i = 0; i < arr.length; i++) if (isNum(arr[i])) { s += arr[i]; n++; } return n ? s / n : null; },
    /* index of the last non-null entry, or -1 */
    lastIndex: function (arr) { for (var i = arr.length - 1; i >= 0; i--) if (isNum(arr[i])) return i; return -1; },
    firstIndex: function (arr) { for (var i = 0; i < arr.length; i++) if (isNum(arr[i])) return i; return -1; }
  };
  App.esc = esc;
  App.isNum = isNum;

  /* ================================ loading ================================ */

  var _cache = Object.create(null);

  /* App.load(name) -> Promise<json> for site/explore/data/<name>.json.
     Cached and de-duplicated; a failed load is evicted so a retry can work. */
  App.load = function (name) {
    if (_cache[name]) return _cache[name];
    var url = 'explore/data/' + name + '.json';
    var p = fetch(url).then(function (r) {
      if (!r.ok) throw new Error('Could not load ' + name + '.json (HTTP ' + r.status + ')');
      return r.json();
    }).catch(function (err) {
      delete _cache[name];
      if (location.protocol === 'file:') {
        throw new Error('Data cannot be fetched from a file:// URL. Run  cd site && python -m http.server 8000  and open http://localhost:8000/explore.html');
      }
      throw (err instanceof Error ? err : new Error(String(err)));
    });
    _cache[name] = p;
    return p;
  };
  /* Convenience: App.loadAll(['occ_index','geo']) -> Promise<[json, json]> */
  App.loadAll = function (names) { return Promise.all(names.map(App.load)); };
  /* True if a payload is already resolved in cache (never fetches). */
  App.isLoaded = function (name) { return !!_cache[name]; };

  /* =============================== formatters ============================== */

  function fixed(v, dp) { return v.toFixed(dp); }

  var fmt = {
    /* 1654440 -> "1,654,440" */
    num: function (n) { return isNum(n) ? Math.round(n).toLocaleString('en-US') : DASH; },
    /* 1654440 -> "1.65M"; 154187380 -> "154M"; 940 -> "940" */
    compact: function (n) {
      if (!isNum(n)) return DASH;
      var s = n < 0 ? MINUS : '', a = Math.abs(n), u = '', v = a;
      if (a >= 1e9) { v = a / 1e9; u = 'B'; }
      else if (a >= 1e6) { v = a / 1e6; u = 'M'; }
      else if (a >= 1e3) { v = a / 1e3; u = 'K'; }
      else return s + Math.round(a).toLocaleString('en-US');
      var dp = v < 10 ? 2 : (v < 100 ? 1 : 0);
      return s + fixed(v, dp).replace(/\.0+$/, '').replace(/(\.\d)0$/, '$1') + u;
    },
    /* x is a PROPORTION 0-1. 0.1334 -> "13.3%" */
    pct: function (x, dp) { return isNum(x) ? fixed(x * 100, dp == null ? 1 : dp) + '%' : DASH; },
    /* for values already expressed 0-100 (Indeed's series). 2.477 -> "2.5%" */
    pctRaw: function (v, dp) { return isNum(v) ? fixed(v, dp == null ? 1 : dp) + '%' : DASH; },
    /* 81680 -> "$81,680" */
    usd: function (n) { return isNum(n) ? '$' + Math.round(n).toLocaleString('en-US') : DASH; },
    usdCompact: function (n) { return isNum(n) ? '$' + fmt.compact(n) : DASH; },
    /* x is a PROPORTION difference. 0.17985 -> "+18.0pp" */
    pp: function (x, dp) {
      if (!isNum(x)) return DASH;
      var v = x * 100, d = dp == null ? 1 : dp;
      return (v > 0 ? '+' : v < 0 ? MINUS : '') + fixed(Math.abs(v), d) + 'pp';
    },
    /* pp for values already in percentage points (Indeed deltas) */
    ppRaw: function (v, dp) {
      if (!isNum(v)) return DASH;
      var d = dp == null ? 1 : dp;
      return (v > 0 ? '+' : v < 0 ? MINUS : '') + fixed(Math.abs(v), d) + 'pp';
    },
    /* signed wrapper around any formatter: signed(-1200, App.fmt.num) -> "−1,200" */
    signed: function (n, f) {
      if (!isNum(n)) return DASH;
      f = f || fmt.num;
      return (n > 0 ? '+' : n < 0 ? MINUS : '') + f(Math.abs(n));
    },
    dec: function (n, dp) { return isNum(n) ? fixed(n, dp == null ? 1 : dp) : DASH; },
    /* "2026-07" -> "Jul 2026";  "2026-07" with short=true -> "Jul '26" */
    month: function (ym, short) {
      if (!ym || typeof ym !== 'string') return DASH;
      var p = ym.split('-'), mi = (+p[1] || 1) - 1;
      var M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return M[clamp(mi, 0, 11)] + (short ? " '" + p[0].slice(2) : ' ' + p[0]);
    },
    year: function (y) { return y == null ? DASH : String(y); },
    /* "no data" / "suppressed" style placeholder */
    none: function (why) { return '<span class="v-none">' + esc(why || 'no data') + '</span>'; },
    dash: DASH, minus: MINUS
  };
  App.fmt = fmt;

  /* ================================= colour =============================== */

  function hex2rgb(h) {
    h = h.replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  function rgbCss(c, a) {
    return a == null || a >= 1
      ? 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')'
      : 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  }
  function rampAt(stops, t) {
    t = clamp(isNum(t) ? t : 0, 0, 1);
    var n = stops.length - 1, f = t * n, i = Math.min(n - 1, Math.floor(f)), u = f - i;
    var a = stops[i], b = stops[i + 1];
    return [lerp(a[0], b[0], u), lerp(a[1], b[1], u), lerp(a[2], b[2], u)];
  }

  /* sequential: single blue hue, dark (near the surface) -> light. */
  var SEQ_HEX = ['#254a78', '#2a6cae', '#3987e5', '#5b9eea', '#8bbcf1', '#c6dcf9'];
  /* diverging: orange <-> blue with a neutral dark-grey midpoint.
     (blue<->red was rejected: on a US state map it reads as politics.) */
  var DIV_MID_HEX = '#45454f';
  var DIV_NEG_HEX = ['#45454f', '#a1512a', '#dd7038', '#f0a878']; // mid -> strong negative
  var DIV_POS_HEX = ['#45454f', '#265f9d', '#3987e5', '#79b0f0']; // mid -> strong positive
  /* categorical: the dataviz default dark column, in its documented order. */
  var CAT_HEX = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];

  var SEQ = SEQ_HEX.map(hex2rgb), DIVN = DIV_NEG_HEX.map(hex2rgb), DIVP = DIV_POS_HEX.map(hex2rgb);

  App.color = {
    /* t in 0..1 -> sequential ramp colour. Optional alpha. */
    seq: function (t, alpha) { return rgbCss(rampAt(SEQ, t), alpha); },
    /* t in 0..1 centred at .5 -> diverging ramp colour (0 = orange, 1 = blue). */
    div: function (t, alpha) {
      t = clamp(isNum(t) ? t : 0.5, 0, 1);
      return t < 0.5 ? rgbCss(rampAt(DIVN, (0.5 - t) * 2), alpha)
                     : rgbCss(rampAt(DIVP, (t - 0.5) * 2), alpha);
    },
    /* the "no data" grey. Always ship it with the hatch or a labelled swatch. */
    missing: '#33333c',
    missingLine: 'rgba(255,255,255,0.16)',
    /* categorical slot i (0-based). <=8 slots; NEVER invent a 9th hue - fold
       the tail into "Other" or facet. Max 3 for maps/scatter (all-pairs rule). */
    cat: function (i) { return CAT_HEX[((i | 0) % CAT_HEX.length + CAT_HEX.length) % CAT_HEX.length]; },
    categorical: CAT_HEX.slice(),
    /* polarity accents that match the diverging poles */
    pos: '#3987e5',
    neg: '#dd7038',
    /* chrome */
    surface: '#0a0a0f',
    grid: 'rgba(255,255,255,0.07)',
    axis: 'rgba(255,255,255,0.16)',
    ink: 'rgba(255,255,255,0.85)',
    ink2: '#888894',
    seqStops: SEQ_HEX.slice(),
    divStops: DIV_NEG_HEX.slice().reverse().concat(DIV_POS_HEX.slice(1)),
    divMid: DIV_MID_HEX,
    /* pick white or near-black text for a label sitting INSIDE a fill */
    onFill: function (css) {
      var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(css);
      var c = m ? [+m[1], +m[2], +m[3]] : hex2rgb(css);
      var f = c.map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
      var L = 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2];
      return L > 0.42 ? '#0a0a0f' : '#ffffff';
    }
  };

  /* ============================== DOM helpers ============================= */

  function applyAttrs(node, attrs) {
    if (!attrs) return;
    for (var k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class' || k === 'className') node.setAttribute('class', v);
      else if (k === 'text') node.textContent = v;
      else if (k === 'html') node.innerHTML = v;
      else if (k === 'style') {
        if (typeof v === 'string') node.setAttribute('style', v);
        else for (var p in v) if (v[p] != null) node.style[p] = v[p];
      } else if (k === 'on') {
        for (var e in v) if (typeof v[e] === 'function') node.addEventListener(e, v[e]);
      } else if (k === 'dataset') {
        for (var d in v) if (v[d] != null) node.setAttribute('data-' + d, v[d]);
      } else if (v === true) node.setAttribute(k, '');
      else node.setAttribute(k, v);
    }
  }
  function appendKids(node, kids) {
    for (var i = 0; i < kids.length; i++) {
      var k = kids[i];
      if (k == null || k === false) continue;
      if (Array.isArray(k)) { appendKids(node, k); continue; }
      node.appendChild(k.nodeType ? k : document.createTextNode(String(k)));
    }
  }
  /* App.el('div', {class:'x', style:{color:'red'}, on:{click:fn}}, 'text', childNode) */
  App.el = function (tag, attrs) {
    var n = document.createElement(tag);
    applyAttrs(n, attrs);
    appendKids(n, Array.prototype.slice.call(arguments, 2));
    return n;
  };
  /* Same shape, SVG namespace. */
  App.svg = function (tag, attrs) {
    var n = document.createElementNS(NS, tag);
    applyAttrs(n, attrs);
    appendKids(n, Array.prototype.slice.call(arguments, 2));
    return n;
  };
  function clear(node) { while (node && node.firstChild) node.removeChild(node.firstChild); return node; }
  App.clear = clear;

  /* ================================ tooltip =============================== */

  var ttEl = null;
  function tt() {
    if (!ttEl) {
      ttEl = App.el('div', { id: 'tooltip', role: 'tooltip', 'aria-hidden': 'true' });
      document.body.appendChild(ttEl);
    }
    return ttEl;
  }
  App.tooltip = {
    show: function (html, x, y) {
      var t = tt();
      t.innerHTML = html;
      t.classList.add('visible');
      t.setAttribute('aria-hidden', 'false');
      var r = t.getBoundingClientRect();
      var pad = 14;
      var left = x + pad, top = y + pad;
      if (left + r.width > window.innerWidth - 8) left = x - r.width - pad;
      if (left < 8) left = 8;
      if (top + r.height > window.innerHeight - 8) top = y - r.height - pad;
      if (top < 8) top = 8;
      t.style.left = Math.round(left) + 'px';
      t.style.top = Math.round(top) + 'px';
    },
    hide: function () {
      if (!ttEl) return;
      ttEl.classList.remove('visible');
      ttEl.setAttribute('aria-hidden', 'true');
    },
    /* rows([[label, value], ...], {colors:[], title:''}) -> html string */
    rows: function (pairs, opt) {
      opt = opt || {};
      var out = opt.title ? '<div class="tt-title">' + esc(opt.title) + '</div>' : '';
      out += '<div class="tt-stats">';
      for (var i = 0; i < pairs.length; i++) {
        var c = opt.colors && opt.colors[i];
        out += '<div class="label">' + (c ? '<i class="tt-dot" style="background:' + esc(c) + '"></i>' : '') +
          esc(pairs[i][0]) + '</div><div class="value">' + (pairs[i][1] == null ? DASH : pairs[i][1]) + '</div>';
      }
      return out + '</div>';
    },
    /* bind(node, () => html) — hover tooltip on any element */
    bind: function (node, htmlFn) {
      function move(ev) {
        var h = htmlFn(ev);
        if (h == null) { App.tooltip.hide(); return; }
        App.tooltip.show(h, ev.clientX, ev.clientY);
      }
      node.addEventListener('pointermove', move);
      node.addEventListener('pointerenter', move);
      node.addEventListener('pointerleave', App.tooltip.hide);
      return function () {
        node.removeEventListener('pointermove', move);
        node.removeEventListener('pointerenter', move);
        node.removeEventListener('pointerleave', App.tooltip.hide);
      };
    }
  };

  /* ================================ legend ================================ */

  /* App.legend({mode, min, max, center, format, title, missing, width, height, note})
     -> element (with .update({min,max,center}) attached) */
  App.legend = function (opts) {
    var o = Object.assign({
      mode: 'seq', min: 0, max: 1, center: 0, format: null,
      title: '', missing: false, width: 110, height: 8, note: '', ticks: null
    }, opts || {});
    var f = o.format || function (v) { return fmt.compact(v); };

    var cv = App.el('canvas', { width: o.width, height: o.height, 'aria-hidden': 'true' });
    cv.style.width = o.width + 'px';
    cv.style.height = o.height + 'px';
    var lowEl = App.el('span', { class: 'lg-lo' });
    var hiEl = App.el('span', { class: 'lg-hi' });
    var midEl = o.mode === 'div' ? App.el('span', { class: 'lg-mid' }) : null;

    var swatch = o.missing
      ? App.el('span', { class: 'lg-missing' }, App.el('i', { class: 'lg-swatch-missing' }),
        typeof o.missing === 'string' ? o.missing : 'no data')
      : null;

    var el = App.el('div', { class: 'gradient-legend' },
      o.title ? App.el('span', { class: 'lg-title' }, o.title) : null,
      lowEl, cv, hiEl, midEl ? App.el('span', { class: 'lg-sep' }, '') : null,
      swatch,
      o.note ? App.el('span', { class: 'lg-note' }, o.note) : null);

    function paint() {
      var dpr = window.devicePixelRatio || 1;
      cv.width = Math.max(1, Math.round(o.width * dpr));
      cv.height = Math.max(1, Math.round(o.height * dpr));
      var ctx = cv.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      for (var x = 0; x < o.width; x++) {
        var t = o.width <= 1 ? 0 : x / (o.width - 1);
        ctx.fillStyle = o.mode === 'div' ? App.color.div(t) : App.color.seq(t);
        ctx.fillRect(x, 0, 1, o.height);
      }
      if (o.mode === 'div') {
        // 2px surface tick marks the neutral midpoint
        ctx.fillStyle = '#0a0a0f';
        ctx.fillRect(Math.round(o.width / 2) - 1, 0, 2, o.height);
      }
      lowEl.textContent = o.mode === 'div' ? f(o.center - (o.max - o.center)) : f(o.min);
      hiEl.textContent = o.mode === 'div' ? f(o.max) : f(o.max);
      if (midEl) midEl.textContent = f(o.center);
    }
    paint();
    el.update = function (n) { Object.assign(o, n || {}); paint(); return el; };
    return el;
  };

  /* ============================ chart: line/area =========================== */

  function splitSegments(values, from, to) {
    var segs = [], cur = null;
    for (var i = from; i <= to; i++) {
      if (isNum(values[i])) { if (!cur) { cur = []; segs.push(cur); } cur.push(i); }
      else cur = null;
    }
    return segs;
  }

  function resolveHost(container, opts) {
    if (container && container.nodeType === 1) return { host: container, o: opts || {} };
    return { host: null, o: container || {} };
  }

  /* App.chart.line(container?, opts) -> {el, update(opts), destroy(), redraw()} */
  function lineChart(container, opts) {
    var r = resolveHost(container, opts), host = r.host;
    var o = Object.assign({
      x: [], series: [], height: 260, yZero: false, yMin: null, yMax: null,
      yFormat: null, yLabel: '', xFormat: null, xTickEvery: 0, yTicks: 4,
      bands: null, markers: null, legend: true, directLabels: true,
      points: 'auto', hover: true, tooltip: null, note: '', minWidth: 320,
      onIndex: null, curve: 'linear'
    }, r.o);

    var el = App.el('div', { class: 'chart chart-line' });
    var legendEl = App.el('div', { class: 'chart-legend' });
    var plotEl = App.el('div', { class: 'chart-plot' });
    var noteEl = App.el('div', { class: 'chart-note' });
    el.appendChild(legendEl); el.appendChild(plotEl); el.appendChild(noteEl);
    if (host) host.appendChild(el);

    var svg = null, hoverG = null, geom = null, off = null;

    function yfmt(v) { return o.yFormat ? o.yFormat(v) : fmt.compact(v); }
    function xfmt(i) { return o.xFormat ? o.xFormat(o.x[i], i) : String(o.x[i]); }

    function renderLegend() {
      clear(legendEl);
      var vis = o.series.filter(function (s) { return s.legend !== false; });
      if (!o.legend || vis.length < 2) { legendEl.style.display = 'none'; return; }
      legendEl.style.display = '';
      vis.forEach(function (s, i) {
        legendEl.appendChild(App.el('span', { class: 'lg-item' },
          App.el('i', { class: 'lg-key', style: { background: s.color || App.color.cat(i) } }),
          s.label || s.id || ('Series ' + (i + 1))));
      });
    }

    function draw() {
      var W = Math.max(o.minWidth, Math.round(plotEl.clientWidth || (host && host.clientWidth) || 640));
      var H = o.height;
      clear(plotEl);
      if (!o.x.length) { return; }

      var series = o.series.map(function (s, i) {
        return Object.assign({}, s, { color: s.color || App.color.cat(i), _i: i });
      });

      /* y domain */
      var lo = Infinity, hi = -Infinity;
      series.forEach(function (s) {
        var e = extent(s.values || []);
        if (e[0] != null) { lo = Math.min(lo, e[0]); hi = Math.max(hi, e[1]); }
      });
      if (lo === Infinity) { lo = 0; hi = 1; }
      if (o.yZero) { lo = Math.min(lo, 0); hi = Math.max(hi, 0); }
      if (isNum(o.yMin)) lo = o.yMin;
      if (isNum(o.yMax)) hi = o.yMax;
      var ys = niceScale(lo, hi, o.yTicks);
      if (isNum(o.yMin)) ys.min = o.yMin;
      if (isNum(o.yMax)) ys.max = o.yMax;

      /* margins — right margin only when we actually direct-label */
      var labelled = o.directLabels ? series.filter(function (s) { return s.directLabel !== false; }) : [];
      var maxLab = 0;
      labelled.forEach(function (s) { maxLab = Math.max(maxLab, String(s.label || '').length); });
      var rightM = labelled.length && W > 520 ? Math.min(150, 22 + maxLab * 6.2) : 14;
      var m = { l: 54, r: rightM, t: 12, b: 26 };
      if (o.yLabel) m.t = 28;
      if (o.margin) m = Object.assign(m, o.margin);
      var pw = Math.max(20, W - m.l - m.r), ph = Math.max(20, H - m.t - m.b);
      var n = o.x.length;
      var xAt = function (i) { return n <= 1 ? m.l + pw / 2 : m.l + (pw * i) / (n - 1); };
      var yAt = function (v) { return m.t + ph - ((v - ys.min) / (ys.max - ys.min || 1)) * ph; };
      geom = { m: m, pw: pw, ph: ph, xAt: xAt, yAt: yAt, n: n, series: series, W: W, H: H };

      svg = App.svg('svg', {
        class: 'chart-svg', width: W, height: H, viewBox: '0 0 ' + W + ' ' + H,
        role: 'img', 'aria-label': o.ariaLabel || o.yLabel || 'line chart'
      });

      /* bands (COVID years, partial periods, discontinued spans) */
      (o.bands || []).forEach(function (b) {
        var x0 = xAt(clamp(b.from, 0, n - 1)), x1 = xAt(clamp(b.to == null ? b.from : b.to, 0, n - 1));
        if (b.pad !== false && n > 1) { var half = pw / (n - 1) / 2; x0 -= half; x1 += half; }
        x0 = Math.max(m.l, x0); x1 = Math.min(m.l + pw, x1);
        svg.appendChild(App.svg('rect', {
          x: x0, y: m.t, width: Math.max(0, x1 - x0), height: ph,
          fill: b.color || 'rgba(255,255,255,0.045)'
        }));
        if (b.label) svg.appendChild(App.svg('text', {
          x: (x0 + x1) / 2, y: m.t + 11, 'text-anchor': 'middle', class: 'ax-note'
        }, b.label));
      });

      /* grid + y ticks */
      ys.ticks.forEach(function (t) {
        var y = yAt(t);
        if (y < m.t - 0.5 || y > m.t + ph + 0.5) return;
        svg.appendChild(App.svg('line', { x1: m.l, x2: m.l + pw, y1: y, y2: y, stroke: App.color.grid, 'stroke-width': 1 }));
        svg.appendChild(App.svg('text', { x: m.l - 8, y: y + 3.5, 'text-anchor': 'end', class: 'ax-label' }, yfmt(t)));
      });
      if (o.yLabel) svg.appendChild(App.svg('text', { x: 1, y: m.t - 11, 'text-anchor': 'start', class: 'ax-title' }, o.yLabel));

      /* x ticks */
      var every = o.xTickEvery || Math.max(1, Math.ceil(n / Math.max(2, Math.floor(pw / 62))));
      for (var i = 0; i < n; i++) {
        if (i % every !== 0 && i !== n - 1) continue;
        if (i !== n - 1 && (n - 1 - i) < every * 0.55) continue;
        svg.appendChild(App.svg('text', {
          x: xAt(i), y: m.t + ph + 16, 'text-anchor': i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'),
          class: 'ax-label'
        }, xfmt(i)));
      }
      svg.appendChild(App.svg('line', {
        x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, stroke: App.color.axis, 'stroke-width': 1
      }));

      /* markers (series breaks etc.) */
      (o.markers || []).forEach(function (mk) {
        var x = xAt(clamp(mk.x, 0, n - 1));
        svg.appendChild(App.svg('line', {
          x1: x, x2: x, y1: m.t, y2: m.t + ph, stroke: mk.color || 'rgba(255,255,255,0.22)', 'stroke-width': 1
        }));
        if (mk.label) svg.appendChild(App.svg('text', {
          x: x + 4, y: m.t + 10, class: 'ax-note'
        }, mk.label));
      });

      /* areas then lines */
      var base = yAt(clamp(0, ys.min, ys.max));
      series.forEach(function (s) {
        var vals = s.values || [], segs = splitSegments(vals, 0, n - 1);
        if (s.area || o.area) {
          segs.forEach(function (seg) {
            if (seg.length < 2) return;
            var d = 'M' + xAt(seg[0]) + ',' + base;
            seg.forEach(function (i) { d += 'L' + xAt(i) + ',' + yAt(vals[i]); });
            d += 'L' + xAt(seg[seg.length - 1]) + ',' + base + 'Z';
            svg.appendChild(App.svg('path', { d: d, fill: s.color, 'fill-opacity': s.areaOpacity || 0.13, stroke: 'none' }));
          });
        }
      });
      series.forEach(function (s) {
        var vals = s.values || [], segs = splitSegments(vals, 0, n - 1);
        segs.forEach(function (seg) {
          if (seg.length === 1) {
            svg.appendChild(App.svg('circle', {
              cx: xAt(seg[0]), cy: yAt(vals[seg[0]]), r: 3, fill: s.color
            }));
            return;
          }
          var d = '';
          seg.forEach(function (i, k) { d += (k ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(vals[i]).toFixed(1); });
          svg.appendChild(App.svg('path', {
            d: d, fill: 'none', stroke: s.color, 'stroke-width': s.width || 2,
            'stroke-linejoin': 'round', 'stroke-linecap': 'round',
            'stroke-dasharray': s.dash || null, opacity: s.opacity == null ? 1 : s.opacity
          }));
        });
        /* explicit dots when the series is short or asked for */
        var showPts = s.points || o.points;
        if (showPts === 'all' || (showPts === 'auto' && n <= 12 && segs.length)) {
          for (var i = 0; i < n; i++) if (isNum(vals[i])) {
            svg.appendChild(App.svg('circle', { cx: xAt(i), cy: yAt(vals[i]), r: 2.6, fill: s.color }));
          }
        }
      });

      /* direct labels at the line ends, with leader lines when they collide */
      if (labelled.length && rightM > 20) {
        var items = [];
        labelled.forEach(function (s) {
          var li = App.util.lastIndex(s.values || []);
          if (li < 0) return;
          items.push({ s: s, i: li, y: yAt(s.values[li]), x: xAt(li) });
        });
        items.sort(function (a, b) { return a.y - b.y; });
        var minGap = 13, prev = -Infinity;
        items.forEach(function (it) {
          it.ly = Math.max(it.y, prev + minGap);
          prev = it.ly;
        });
        var overflow = items.length ? items[items.length - 1].ly - (m.t + ph) : 0;
        if (overflow > 0) items.forEach(function (it) { it.ly -= overflow; });
        items.forEach(function (it) {
          var lx = m.l + pw + 10;
          if (Math.abs(it.ly - it.y) > 1.5) {
            svg.appendChild(App.svg('path', {
              d: 'M' + (it.x + 3) + ',' + it.y.toFixed(1) + 'L' + (lx - 5) + ',' + it.ly.toFixed(1),
              stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 1, fill: 'none'
            }));
          }
          svg.appendChild(App.svg('circle', { cx: lx - 2, cy: it.ly, r: 2.6, fill: it.s.color }));
          svg.appendChild(App.svg('text', { x: lx + 5, y: it.ly + 3.5, class: 'ax-direct' }, it.s.label || it.s.id));
        });
      }

      hoverG = App.svg('g', { class: 'chart-hover' });
      svg.appendChild(hoverG);

      if (o.hover) {
        var ov = App.svg('rect', {
          x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', style: { cursor: 'crosshair' }
        });
        ov.addEventListener('pointermove', onMove);
        ov.addEventListener('pointerleave', onLeave);
        ov.addEventListener('pointerdown', onMove);
        svg.appendChild(ov);
      }
      plotEl.appendChild(svg);
      noteEl.textContent = o.note || '';
      noteEl.style.display = o.note ? '' : 'none';
    }

    function indexFromEvent(ev) {
      var r = svg.getBoundingClientRect();
      var scale = r.width ? geom.W / r.width : 1;
      var px = (ev.clientX - r.left) * scale;
      var t = geom.n <= 1 ? 0 : (px - geom.m.l) / geom.pw * (geom.n - 1);
      return clamp(Math.round(t), 0, geom.n - 1);
    }

    function onMove(ev) {
      if (!geom) return;
      var i = indexFromEvent(ev);
      clear(hoverG);
      hoverG.appendChild(App.svg('line', {
        x1: geom.xAt(i), x2: geom.xAt(i), y1: geom.m.t, y2: geom.m.t + geom.ph,
        stroke: 'rgba(255,255,255,0.28)', 'stroke-width': 1
      }));
      geom.series.forEach(function (s) {
        var v = (s.values || [])[i];
        if (!isNum(v)) return;
        hoverG.appendChild(App.svg('circle', {
          cx: geom.xAt(i), cy: geom.yAt(v), r: 4, fill: s.color, stroke: '#0a0a0f', 'stroke-width': 2
        }));
      });
      var html;
      if (o.tooltip) html = o.tooltip(i, geom.series);
      else {
        var pairs = geom.series.map(function (s) {
          var v = (s.values || [])[i];
          return [s.label || s.id, isNum(v) ? yfmt(v) : '<span class="v-none">no data</span>'];
        });
        html = App.tooltip.rows(pairs, { title: xfmt(i), colors: geom.series.map(function (s) { return s.color; }) });
      }
      if (html) App.tooltip.show(html, ev.clientX, ev.clientY);
      if (o.onIndex) o.onIndex(i);
    }
    function onLeave() { if (hoverG) clear(hoverG); App.tooltip.hide(); if (o.onIndex) o.onIndex(null); }

    renderLegend(); draw();
    off = onResize(plotEl, draw);

    return {
      el: el,
      update: function (n) { Object.assign(o, n || {}); renderLegend(); draw(); },
      redraw: draw,
      destroy: function () { if (off) off(); App.tooltip.hide(); if (el.parentNode) el.parentNode.removeChild(el); }
    };
  }

  /* =========================== chart: horizontal bars ====================== */

  /* App.chart.bars(container?, opts) -> {el, update(opts), destroy()} */
  function barList(container, opts) {
    var r = resolveHost(container, opts), host = r.host;
    var o = Object.assign({
      rows: [], max: null, diverging: false, valueFormat: null, labelWidth: 170,
      color: null, showValue: true, onClick: null, tooltip: null, note: '',
      emptyText: 'Nothing to show', barHeight: 10, ariaLabel: ''
    }, r.o);

    var el = App.el('div', { class: 'chart chart-bars' });
    var listEl = App.el('div', { class: 'bars-list', role: 'list' });
    var noteEl = App.el('div', { class: 'chart-note' });
    el.appendChild(listEl); el.appendChild(noteEl);
    if (host) host.appendChild(el);

    function vfmt(v) { return o.valueFormat ? o.valueFormat(v) : fmt.compact(v); }

    function draw() {
      clear(listEl);
      el.style.setProperty('--bar-label-w', o.labelWidth + 'px');
      if (!o.rows.length) {
        listEl.appendChild(App.el('div', { class: 'bars-empty' }, o.emptyText));
        noteEl.textContent = o.note || ''; return;
      }
      /* bar LENGTH always encodes from zero */
      var mx = o.max;
      if (!isNum(mx)) {
        mx = 0;
        o.rows.forEach(function (d) { if (isNum(d.value)) mx = Math.max(mx, Math.abs(d.value)); });
      }
      mx = mx || 1;

      o.rows.forEach(function (d, i) {
        var color = d.color || o.color || (o.diverging ? (d.value < 0 ? App.color.neg : App.color.pos) : App.color.cat(0));
        var pct = isNum(d.value) ? clamp(Math.abs(d.value) / mx, 0, 1) * 100 : 0;
        var fill = App.el('div', {
          class: 'bar-fill' + (isNum(d.value) && d.value < 0 ? ' neg' : ''),
          style: { width: pct / (o.diverging ? 2 : 1) + '%', background: color }
        });
        var track = App.el('div', { class: 'bar-track' + (o.diverging ? ' diverging' : '') },
          o.diverging ? App.el('div', { class: 'bar-zero' }) : null, fill);
        if (!isNum(d.value)) track.appendChild(App.el('span', { class: 'bar-nodata' }, d.noteNoData || 'no data'));

        var labelInner = d.href
          ? App.el('a', { class: 'bar-link', href: d.href, target: '_blank', rel: 'noopener' }, d.label)
          : document.createTextNode(d.label == null ? '' : String(d.label));
        var label = App.el('div', { class: 'bar-label', title: d.title || d.label || '' }, labelInner,
          d.sub ? App.el('span', { class: 'bar-sub' }, d.sub) : null);

        var value = o.showValue
          ? App.el('div', { class: 'bar-value' }, isNum(d.value) ? vfmt(d.value) : DASH,
            d.right ? App.el('span', { class: 'bar-right' }, d.right) : null)
          : null;

        var row = App.el('div', {
          class: 'bar-row' + (o.onClick ? ' clickable' : '') + (d.active ? ' active' : ''),
          role: 'listitem', tabindex: o.onClick ? 0 : null
        }, label, track, value);
        row.style.setProperty('--bar-h', o.barHeight + 'px');

        if (o.onClick) {
          row.addEventListener('click', function () { o.onClick(d, i); });
          row.addEventListener('keydown', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onClick(d, i); }
          });
        }
        if (o.tooltip) App.tooltip.bind(row, function () { return o.tooltip(d, i); });
        listEl.appendChild(row);
      });
      noteEl.textContent = o.note || '';
      noteEl.style.display = o.note ? '' : 'none';
    }
    draw();
    return {
      el: el,
      update: function (n) { Object.assign(o, n || {}); draw(); },
      destroy: function () { App.tooltip.hide(); if (el.parentNode) el.parentNode.removeChild(el); }
    };
  }

  /* ============================ chart: choropleth ========================== */

  /* App.chart.choropleth(container?, opts)
       -> {el, svg, overlay, update(opts), setSelected(key), destroy()} */
  function choropleth(container, opts) {
    var r = resolveHost(container, opts), host = r.host;
    var o = Object.assign({
      geo: null, value: null, mode: 'seq', domain: null, center: 0,
      format: null, labels: true, tooltip: null, onClick: null, onHover: null,
      legend: true, legendTitle: '', legendFormat: null, missingLabel: 'no data',
      note: '', selected: null, maxHeight: 620
    }, r.o);

    var el = App.el('div', { class: 'chart chart-map' });
    var mapEl = App.el('div', { class: 'map-holder' });
    var legHolder = App.el('div', { class: 'map-legend' });
    var noteEl = App.el('div', { class: 'chart-note' });
    el.appendChild(legHolder); el.appendChild(mapEl); el.appendChild(noteEl);
    if (host) host.appendChild(el);

    var geo = o.geo;
    if (!geo || !geo.states) throw new Error('App.chart.choropleth: opts.geo must be the loaded geo payload');

    var W = geo.width || 975, H = geo.height || 610;
    var hatchId = uid('hatch');
    var svg = App.svg('svg', {
      class: 'map-svg', viewBox: geo.viewBox || ('0 0 ' + W + ' ' + H),
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': o.legendTitle || 'choropleth map of US states'
    });
    var defs = App.svg('defs', null,
      App.svg('pattern', { id: hatchId, width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' },
        App.svg('rect', { width: 6, height: 6, fill: App.color.missing }),
        App.svg('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: App.color.missingLine, 'stroke-width': 2 })));
    svg.appendChild(defs);
    var statesG = App.svg('g', { class: 'map-states' });
    var labelsG = App.svg('g', { class: 'map-labels', 'pointer-events': 'none' });
    var overlayG = App.svg('g', { class: 'map-overlay' });
    svg.appendChild(statesG); svg.appendChild(labelsG); svg.appendChild(overlayG);
    mapEl.appendChild(svg);
    /* cap the height without letterboxing: bound the holder's width by the
       frame's own aspect ratio so the svg always fills the box exactly. */
    mapEl.style.maxWidth = Math.round(o.maxHeight * (W / H)) + 'px';

    var paths = {};   // fips -> {path, state, value}
    geo.states.forEach(function (s) {
      var p = App.svg('path', {
        d: s.d, class: 'map-state', stroke: '#0a0a0f', 'stroke-width': 0.7, 'stroke-linejoin': 'round',
        tabindex: o.onClick ? 0 : null, role: o.onClick ? 'button' : null,
        'aria-label': s.name
      });
      p.addEventListener('pointermove', function (ev) { hover(s, ev); });
      p.addEventListener('pointerenter', function (ev) { hover(s, ev); });
      p.addEventListener('pointerleave', function () {
        App.tooltip.hide(); p.classList.remove('hovered'); if (o.onHover) o.onHover(null);
      });
      if (o.onClick) {
        p.addEventListener('click', function () { o.onClick(s, paths[s.fips].value); });
        p.addEventListener('keydown', function (ev) {
          if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); o.onClick(s, paths[s.fips].value); }
        });
      }
      statesG.appendChild(p);
      paths[s.fips] = { path: p, state: s, value: null };
    });

    function hover(s, ev) {
      var rec = paths[s.fips];
      rec.path.classList.add('hovered');
      var html = o.tooltip ? o.tooltip(s, rec.value)
        : App.tooltip.rows([[o.legendTitle || 'value', rec.value == null ? '<span class="v-none">no data</span>' : vfmt(rec.value)]], { title: s.name });
      if (html) App.tooltip.show(html, ev.clientX, ev.clientY);
      if (o.onHover) o.onHover(s, rec.value);
    }
    function vfmt(v) { return o.format ? o.format(v) : fmt.compact(v); }

    var legendEl = null;
    function paint() {
      var vals = [];
      geo.states.forEach(function (s, i) {
        var v = o.value ? o.value(s, i) : null;
        paths[s.fips].value = isNum(v) ? v : null;
        if (isNum(v)) vals.push(v);
      });
      var lo, hi;
      if (o.domain && isNum(o.domain[0]) && isNum(o.domain[1])) { lo = o.domain[0]; hi = o.domain[1]; }
      else if (vals.length) { lo = Math.min.apply(null, vals); hi = Math.max.apply(null, vals); }
      else { lo = 0; hi = 1; }
      var absMax = Math.max(Math.abs(hi - o.center), Math.abs(lo - o.center)) || 1;

      geo.states.forEach(function (s) {
        var rec = paths[s.fips], v = rec.value, fill;
        if (v == null) fill = 'url(#' + hatchId + ')';
        else if (o.mode === 'div') fill = App.color.div(0.5 + 0.5 * (v - o.center) / absMax);
        else fill = App.color.seq(hi === lo ? 0.65 : (v - lo) / (hi - lo));
        rec.path.setAttribute('fill', fill);
        rec.fillColor = v == null ? App.color.missing : fill;
      });

      /* state abbreviations, only where the shape can hold them */
      clear(labelsG);
      if (o.labels) {
        geo.states.forEach(function (s) {
          var bw = s.bb[2] - s.bb[0], bh = s.bb[3] - s.bb[1];
          if (bw < 34 || bh < 22) return;   /* never crowd a shape that can't hold the text */
          var rec = paths[s.fips];
          labelsG.appendChild(App.svg('text', {
            x: (s.lp || s.c)[0], y: (s.lp || s.c)[1] + 3.5, 'text-anchor': 'middle',
            class: 'map-label', fill: App.color.onFill(rec.fillColor)
          }, s.abbr));
        });
      }

      if (o.legend) {
        clear(legHolder);
        legendEl = App.legend({
          mode: o.mode, min: lo, max: o.mode === 'div' ? o.center + absMax : hi,
          center: o.center, format: o.legendFormat || vfmt, title: o.legendTitle,
          missing: o.missingLabel
        });
        legHolder.appendChild(legendEl);
        legHolder.style.display = '';
      } else legHolder.style.display = 'none';

      noteEl.textContent = o.note || '';
      noteEl.style.display = o.note ? '' : 'none';
      setSelected(o.selected);
    }

    function setSelected(key) {
      o.selected = key;
      geo.states.forEach(function (s) {
        var on = key != null && (key === s.fips || key === s.abbr);
        paths[s.fips].path.classList.toggle('selected', !!on);
      });
    }

    paint();
    return {
      el: el, svg: svg, overlay: overlayG, states: paths,
      update: function (n) { Object.assign(o, n || {}); paint(); },
      setSelected: setSelected,
      destroy: function () { App.tooltip.hide(); if (el.parentNode) el.parentNode.removeChild(el); }
    };
  }

  /* =============================== sparkline ============================== */

  /* App.chart.spark(values, opts) -> a detached <svg> (no axes, no hover) */
  function spark(values, opts) {
    var o = Object.assign({ width: 88, height: 22, color: App.color.cat(0), area: true, yZero: false, last: true }, opts || {});
    var s = App.svg('svg', { width: o.width, height: o.height, viewBox: '0 0 ' + o.width + ' ' + o.height, class: 'spark' });
    var e = extent(values || []);
    if (e[0] == null) return s;
    var lo = o.yZero ? Math.min(0, e[0]) : e[0], hi = e[1];
    if (hi === lo) { hi = lo + 1; }
    var n = values.length, pad = 2;
    var xAt = function (i) { return n <= 1 ? o.width / 2 : (o.width - 2) * i / (n - 1) + 1; };
    var yAt = function (v) { return o.height - pad - ((v - lo) / (hi - lo)) * (o.height - pad * 2); };
    var segs = splitSegments(values, 0, n - 1);
    segs.forEach(function (seg) {
      if (seg.length === 1) { s.appendChild(App.svg('circle', { cx: xAt(seg[0]), cy: yAt(values[seg[0]]), r: 1.6, fill: o.color })); return; }
      var d = '';
      seg.forEach(function (i, k) { d += (k ? 'L' : 'M') + xAt(i).toFixed(1) + ',' + yAt(values[i]).toFixed(1); });
      if (o.area) {
        s.appendChild(App.svg('path', {
          d: 'M' + xAt(seg[0]).toFixed(1) + ',' + (o.height - pad) + 'L' + d.slice(1) + 'L' + xAt(seg[seg.length - 1]).toFixed(1) + ',' + (o.height - pad) + 'Z',
          fill: o.color, 'fill-opacity': 0.15, stroke: 'none'
        }));
      }
      s.appendChild(App.svg('path', { d: d, fill: 'none', stroke: o.color, 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    });
    if (o.last) {
      var li = App.util.lastIndex(values);
      if (li >= 0) s.appendChild(App.svg('circle', { cx: xAt(li), cy: yAt(values[li]), r: 2, fill: o.color }));
    }
    return s;
  }

  App.chart = { line: lineChart, bars: barList, choropleth: choropleth, spark: spark, segments: splitSegments };

  /* ============================== year slider ============================= */

  var _sliders = [];

  /* App.control.yearSlider(container?, opts)
       -> {el, value(), set(y), play(), pause(), toggle(), playing(), destroy()} */
  function yearSlider(container, opts) {
    var r = resolveHost(container, opts), host = r.host;
    var o = Object.assign({
      years: [], value: null, missing: [], label: '', onChange: null,
      intervalMs: 1100, loop: true, playable: true, missingTitle: 'no data for this year',
      /* missingSelectable=false (the default) means the year genuinely does not
         exist and must not be reachable — the ACS 2020 file, say. true means the
         year exists but the CURRENT selection has no value in it (an OEWS code
         that was renumbered), where landing on it and reading the explanation is
         the whole point. Marked the same way either way; only reachability differs. */
      missingSelectable: false
    }, r.o);

    var years = o.years.slice();
    var missing = {}; (o.missing || []).forEach(function (y) { missing[y] = 1; });
    function blocked(y) { return !!missing[y] && !o.missingSelectable; }
    var selectable = years.filter(function (y) { return !blocked(y); });
    var value = o.value != null && !blocked(o.value) ? o.value : (selectable.length ? selectable[selectable.length - 1] : years[0]);
    var timer = null;

    var playBtn = App.el('button', {
      class: 'ys-play', type: 'button', 'aria-label': 'Play through the years',
      on: { click: function () { toggle(); } }
    }, '▶');
    var valueEl = App.el('span', { class: 'ys-value' }, String(value));
    var trackEl = App.el('div', {
      class: 'ys-track', role: 'slider', tabindex: '0',
      'aria-label': o.label || 'Year',
      'aria-valuemin': years[0], 'aria-valuemax': years[years.length - 1], 'aria-valuenow': value
    });
    var el = App.el('div', { class: 'yslider' + (o.missingSelectable ? ' soft' : '') },
      o.playable ? playBtn : null,
      o.label ? App.el('span', { class: 'ys-label' }, o.label) : null,
      trackEl, valueEl);
    if (host) host.appendChild(el);

    var ticks = {};
    function build() {
      clear(trackEl);
      trackEl.appendChild(App.el('div', { class: 'ys-line' }));
      years.forEach(function (y) {
        var isMissing = !!missing[y];
        var b = App.el('button', {
          class: 'ys-tick' + (isMissing ? ' missing' : ''), type: 'button',
          disabled: blocked(y) || null, title: isMissing ? o.missingTitle : String(y),
          'aria-label': String(y) + (isMissing ? ' (' + o.missingTitle + ')' : ''),
          on: { click: function () { pause(); set(y); } }
        }, App.el('i', { class: 'ys-dot' }), App.el('span', { class: 'ys-tick-label' }, String(y)));
        ticks[y] = b;
        trackEl.appendChild(b);
      });
      paint();
    }
    function paint() {
      years.forEach(function (y) { if (ticks[y]) ticks[y].classList.toggle('on', y === value); });
      valueEl.textContent = String(value);
      trackEl.setAttribute('aria-valuenow', value);
      playBtn.textContent = timer ? '‖' : '▶';
      playBtn.setAttribute('aria-label', timer ? 'Pause' : 'Play through the years');
      el.classList.toggle('playing', !!timer);
    }
    function set(y, silent) {
      if (blocked(y) || years.indexOf(y) < 0) return;
      if (y === value) { paint(); return; }
      value = y; paint();
      if (!silent && o.onChange) o.onChange(value, { playing: !!timer });
    }
    function step(dir) {
      var i = selectable.indexOf(value);
      if (i < 0) { set(selectable[0]); return; }
      var j = i + dir;
      if (j >= selectable.length) { if (!o.loop) { pause(); return; } j = 0; }
      if (j < 0) { if (!o.loop) return; j = selectable.length - 1; }
      set(selectable[j]);
    }
    function play() {
      if (timer || selectable.length < 2) return;
      timer = setInterval(function () { step(1); }, o.intervalMs);
      paint();
    }
    function pause() { if (timer) { clearInterval(timer); timer = null; paint(); } }
    function toggle() { timer ? pause() : play(); }

    trackEl.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowUp') { pause(); step(1); ev.preventDefault(); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowDown') { pause(); step(-1); ev.preventDefault(); }
      else if (ev.key === 'Home') { pause(); set(selectable[0]); ev.preventDefault(); }
      else if (ev.key === 'End') { pause(); set(selectable[selectable.length - 1]); ev.preventDefault(); }
      else if (ev.key === ' ') { toggle(); ev.preventDefault(); }
    });
    document.addEventListener('visibilitychange', onVis);
    function onVis() { if (document.hidden) pause(); }

    build();
    var api = {
      el: el,
      value: function () { return value; },
      set: function (y) { set(y); },
      play: play, pause: pause, toggle: toggle,
      playing: function () { return !!timer; },
      setYears: function (ys, ms) {
        years = ys.slice(); missing = {}; (ms || []).forEach(function (y) { missing[y] = 1; });
        selectable = years.filter(function (y) { return !blocked(y); });
        if (blocked(value) || years.indexOf(value) < 0) value = selectable[selectable.length - 1];
        build();
      },
      /* re-mark which years are "missing" without moving the selection */
      setMissing: function (ms) {
        missing = {}; (ms || []).forEach(function (y) { missing[y] = 1; });
        selectable = years.filter(function (y) { return !blocked(y); });
        if (blocked(value)) value = selectable[selectable.length - 1];
        build();
      },
      destroy: function () {
        pause();
        document.removeEventListener('visibilitychange', onVis);
        var i = _sliders.indexOf(api); if (i >= 0) _sliders.splice(i, 1);
        if (el.parentNode) el.parentNode.removeChild(el);
      }
    };
    _sliders.push(api);
    return api;
  }

  App.control = {
    yearSlider: yearSlider,
    /* stop every live slider and forget the orphaned ones
       (the router calls this whenever a view unmounts) */
    _stopAll: function () {
      _sliders.slice().forEach(function (s) {
        s.pause();
        if (!s.el.isConnected) {
          var i = _sliders.indexOf(s); if (i >= 0) _sliders.splice(i, 1);
        }
      });
    }
  };

  /* ============================ geo projection ============================ */
  /* d3.geoAlbersUsa, re-implemented to match pipeline/build_geo.py exactly, so
     a lon/lat (e.g. metro_index.metros[].lat/lon) lands on the same 975x610
     frame as data/geo_states.json. Returns [x, y] or null (outside the frame). */

  var RAD = Math.PI / 180;
  function ConicEqualArea(parallels, rotLambda, center, scale, translate) {
    var phi0 = parallels[0] * RAD, phi1 = parallels[1] * RAD;
    var sy0 = Math.sin(phi0), n = (sy0 + Math.sin(phi1)) / 2;
    var C = 1 + sy0 * (2 * n - sy0), r0 = Math.sqrt(C) / n;
    function raw(lam, phi) {
      var v = C - 2 * n * Math.sin(phi); if (v < 0) v = 0;
      var r = Math.sqrt(v) / n;
      return [r * Math.sin(lam * n), r0 - r * Math.cos(lam * n)];
    }
    var cp = raw(center[0] * RAD, center[1] * RAD);
    var k = scale, tx = translate[0], ty = translate[1];
    return function (lon, lat) {
      var lam = lon + rotLambda;
      lam = ((lam + 180) % 360 + 360) % 360 - 180;
      var p = raw(lam * RAD, lat * RAD);
      return [tx + k * (p[0] - cp[0]), ty - k * (p[1] - cp[1])];
    };
  }
  var K = 1300, TX = 487.5, TY = 305;
  var PROJ_L48 = ConicEqualArea([29.5, 45.5], 96, [-0.6, 38.7], K, [TX, TY]);
  var PROJ_AK = ConicEqualArea([55, 65], 154, [-2, 58.5], K * 0.35, [TX - 0.307 * K, TY + 0.201 * K]);
  var PROJ_HI = ConicEqualArea([8, 18], 157, [-3, 19.9], K, [TX - 0.205 * K, TY + 0.212 * K]);
  /* PR is not part of d3.geoAlbersUsa; build_geo.py parks its own inset at this
     translate (derived from the shipped inset's bbox centre, 905,555). */
  var PROJ_PR = ConicEqualArea([17.9, 18.4], 66, [0, 18.2], K, [917.5572186122039, 555.3571269031316]);
  var EPS = 1e-6;
  var RECTS = {
    l48: [TX - 0.455 * K, TY - 0.238 * K, TX + 0.455 * K, TY + 0.238 * K],
    ak: [TX - 0.425 * K + EPS, TY + 0.120 * K + EPS, TX - 0.214 * K - EPS, TY + 0.234 * K - EPS],
    hi: [TX - 0.214 * K + EPS, TY + 0.166 * K + EPS, TX - 0.115 * K - EPS, TY + 0.234 * K - EPS],
    pr: [868, 542, 942, 568]
  };
  function inRect(p, r) { return p[0] >= r[0] && p[0] <= r[2] && p[1] >= r[1] && p[1] <= r[3]; }

  App.geo = {
    project: function (lon, lat) {
      if (!isNum(lon) || !isNum(lat)) return null;
      var p = PROJ_L48(lon, lat); if (inRect(p, RECTS.l48)) return p;
      p = PROJ_AK(lon, lat); if (inRect(p, RECTS.ak)) return p;
      p = PROJ_HI(lon, lat); if (inRect(p, RECTS.hi)) return p;
      p = PROJ_PR(lon, lat); if (inRect(p, RECTS.pr)) return p;
      return null;
    },
    zone: function (lon, lat) {
      if (inRect(PROJ_L48(lon, lat), RECTS.l48)) return 'l48';
      if (inRect(PROJ_AK(lon, lat), RECTS.ak)) return 'ak';
      if (inRect(PROJ_HI(lon, lat), RECTS.hi)) return 'hi';
      if (inRect(PROJ_PR(lon, lat), RECTS.pr)) return 'pr';
      return null;
    },
    viewBox: '0 0 975 610', width: 975, height: 610
  };

  /* ================================ UI bits =============================== */

  App.ui = {
    loading: function (msg) {
      return App.el('div', { class: 'state-loading', role: 'status', 'aria-live': 'polite' },
        App.el('span', { class: 'spinner' }), msg || 'Loading data…');
    },
    error: function (err, onRetry) {
      var msg = err && err.message ? err.message : String(err || 'Something went wrong');
      return App.el('div', { class: 'state-error', role: 'alert' },
        App.el('div', { class: 'state-error-title' }, 'Could not load this view'),
        App.el('div', { class: 'state-error-msg' }, msg),
        onRetry ? App.el('button', { class: 'btn', type: 'button', on: { click: onRetry } }, 'Try again') : null);
    },
    empty: function (msg) { return App.el('div', { class: 'state-empty' }, msg || 'Nothing to show'); },
    /* a section header in the house style (11px uppercase, .08em, --fg2) */
    head: function (text, right) {
      return App.el('div', { class: 'section-head-row' },
        App.el('h3', { class: 'section-head' }, text),
        right ? App.el('div', { class: 'section-head-right' }, right) : null);
    },
    /* a stat tile: label + big number + optional sub-line */
    stat: function (label, value, sub) {
      return App.el('div', { class: 'stat-section' },
        App.el('h3', { class: 'section-head' }, label),
        App.el('div', { class: 'stat-big' }, value),
        sub ? App.el('div', { class: 'stat-label' }, sub) : null);
    },
    /* an inline caveat / footnote strip */
    note: function (text, kind) {
      return App.el('p', { class: 'note' + (kind ? ' note-' + kind : '') }, text);
    },
    /* a toggle group in the .color-toggle house pattern.
       items: [{id,label,title}]; returns {el, set(id), value()} */
    toggle: function (items, active, onChange) {
      var cur = active;
      var btns = {};
      /* NOT a tablist: these are filter/metric toggles, and the page already has
         one real tablist (#view-tabs) driving #view-root. A second role="tablist"
         would make a screen reader announce them as page tabs and would strip the
         button's own accessible name. Use a pressed-button group instead. */
      var el = App.el('div', { class: 'color-toggle', role: 'group' });
      items.forEach(function (it) {
        var b = App.el('button', {
          type: 'button', class: it.id === cur ? 'active' : '', title: it.title || '',
          'aria-pressed': it.id === cur ? 'true' : 'false',
          on: {
            click: function () {
              if (cur === it.id) return;
              set(it.id);
              if (onChange) onChange(it.id, it);
            }
          }
        }, it.label);
        btns[it.id] = b;
        el.appendChild(b);
      });
      function set(id) {
        cur = id;
        Object.keys(btns).forEach(function (k) {
          btns[k].classList.toggle('active', k === id);
          btns[k].setAttribute('aria-pressed', k === id ? 'true' : 'false');
        });
      }
      return { el: el, set: set, value: function () { return cur; } };
    },
    /* a searchable <select>-like picker built on a native input + datalist.
       opts: {items:[{id,label,sub}], value, placeholder, onChange} */
    picker: function (opts) {
      var o = Object.assign({ items: [], value: null, placeholder: 'Search…', onChange: null, listSize: 400 }, opts || {});
      var listId = uid('dl');
      var dl = App.el('datalist', { id: listId });
      var byLabel = Object.create(null);
      o.items.slice(0, o.listSize).forEach(function (it) {
        byLabel[it.label] = it;
        dl.appendChild(App.el('option', { value: it.label, label: it.sub || '' }));
      });
      var input = App.el('input', {
        class: 'picker-input', type: 'search', list: listId, placeholder: o.placeholder,
        value: o.value ? (o.value.label || '') : '',
        on: {
          change: function () {
            var it = byLabel[input.value];
            if (it && o.onChange) o.onChange(it);
          }
        }
      });
      return { el: App.el('div', { class: 'picker' }, input, dl), input: input };
    }
  };

  /* ========================= shareable view state ========================= */

  /* The router below already ignores everything after "?" when it picks a view,
     so each view owns the query part of its own hash: "#map?occ=15-1252&y=2024".
     That makes a selection linkable — including from one tab to another — and
     survives a reload. Writing uses replaceState, so keeping the address bar in
     sync never re-runs the router; only a real navigation (a clicked link, the
     back button) fires hashchange. A missing or unknown key is not an error:
     every view falls back to its own default. */
  App.hashState = {
    view: function () { return (location.hash || '').replace(/^#/, '').split('?')[0]; },
    get: function () {
      var h = (location.hash || '').replace(/^#/, ''), i = h.indexOf('?'), out = {};
      if (i < 0) return out;
      h.slice(i + 1).split('&').forEach(function (pair) {
        if (!pair) return;
        var kv = pair.split('=');
        try {
          out[decodeURIComponent(kv[0])] = decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
        } catch (e) { /* a malformed hash is data, not a crash */ }
      });
      return out;
    },
    /* "#<view>?k=v&k=v" for a given state; null/'' values are dropped */
    href: function (viewId, obj) {
      var parts = [];
      Object.keys(obj || {}).forEach(function (k) {
        var v = obj[k];
        if (v == null || v === '') return;
        parts.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
      });
      return '#' + viewId + (parts.length ? '?' + parts.join('&') : '');
    },
    set: function (obj, viewId) {
      var next = App.hashState.href(viewId || App.hashState.view() || '', obj);
      if (next === (location.hash || '')) return;
      try { history.replaceState(null, '', location.pathname + location.search + next); }
      catch (e) { /* file:// and very old browsers: the page still works */ }
    }
  };

  /* =========================== views + hash router ======================== */

  var _views = Object.create(null);
  var _regOrder = [];
  var PREFERRED = ['map', 'remote', 'tech'];

  App.registerView = function (id, def) {
    if (!id || !def || typeof def.mount !== 'function') {
      console.error('registerView: need an id and a mount()'); return;
    }
    if (_views[id]) { console.warn('registerView: "' + id + '" already registered'); return; }
    _views[id] = Object.assign({ id: id, label: id, subtitle: '' }, def);
    _regOrder.push(id);
  };
  App.viewList = function () {
    var seen = {}, out = [];
    PREFERRED.forEach(function (id) { if (_views[id]) { seen[id] = 1; out.push(_views[id]); } });
    _regOrder.forEach(function (id) { if (!seen[id]) out.push(_views[id]); });
    return out;
  };

  var current = null, currentId = null, routedHash = null;

  function boot() {
    var tabsEl = document.getElementById('view-tabs');
    var rootEl = document.getElementById('view-root');
    var subEl = document.getElementById('view-subtitle');
    if (!rootEl) { console.error('explore: #view-root is missing'); return; }

    var list = App.viewList();
    if (tabsEl) {
      clear(tabsEl);
      if (!list.length) {
        tabsEl.appendChild(App.el('span', { class: 'tabs-empty' }, 'No views loaded'));
      }
      list.forEach(function (v) {
        tabsEl.appendChild(App.el('a', {
          class: 'tab', href: '#' + v.id, id: 'tab-' + v.id, role: 'tab',
          'aria-controls': 'view-root', 'aria-selected': 'false'
        }, v.label));
      });
    }

    function markTabs(id) {
      list.forEach(function (v) {
        var t = document.getElementById('tab-' + v.id);
        if (t) {
          t.classList.toggle('active', v.id === id);
          t.setAttribute('aria-selected', v.id === id ? 'true' : 'false');
        }
      });
    }

    function route() {
      var list2 = App.viewList();
      if (!list2.length) {
        clear(rootEl).appendChild(App.ui.error(new Error(
          'No views registered. Check that view_map.js, view_remote.js and view_tech.js loaded.')));
        return;
      }
      var id = (location.hash || '').replace(/^#/, '').split('?')[0];
      if (!_views[id]) id = list2[0].id;
      /* Same view AND the same hash we last routed on: nothing to do. A view
         that keeps its state in the query writes it with replaceState, which
         fires no hashchange, so reaching here with the same id but a different
         hash means a real navigation (a shared link pasted in, the back button,
         a cross-tab link) and the view must be rebuilt from it. */
      if (id === currentId && location.hash === routedHash) return;
      routedHash = location.hash;

      if (current && typeof current.destroy === 'function') {
        try { current.destroy(); } catch (e) { console.error('destroy() failed for view "' + currentId + '"', e); }
      }
      App.control._stopAll();
      App.tooltip.hide();
      current = null; currentId = id;
      var def = _views[id];
      clear(rootEl);
      rootEl.setAttribute('aria-busy', 'true');
      markTabs(id);
      if (subEl) subEl.textContent = def.subtitle || '';
      document.title = (def.label ? def.label + ' · ' : '') + 'Explore the US job market';

      var loadingEl = App.ui.loading(def.loadingText || 'Loading data…');
      rootEl.appendChild(loadingEl);
      function done() {
        if (loadingEl.parentNode) loadingEl.parentNode.removeChild(loadingEl);
        rootEl.setAttribute('aria-busy', 'false');
      }
      function fail(err) {
        done();
        console.error('view "' + id + '" failed', err);
        clear(rootEl).appendChild(App.ui.error(err, function () {
          currentId = null; route();
        }));
      }
      var out;
      try { out = def.mount(rootEl); } catch (err) { fail(err); return; }
      current = def;
      if (out && typeof out.then === 'function') out.then(done, fail);
      else done();
    }

    window.addEventListener('hashchange', route);
    route();
  }

  App.start = boot;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else setTimeout(boot, 0);

})();
