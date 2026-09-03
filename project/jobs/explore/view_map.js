/* ============================================================================
 * view_map.js  —  Explore view 1: "Where the jobs are"
 *
 * Answers: how are occupations distributed across the US, and how has that
 * shifted across 2018-2024?
 *
 * Data (all via App.load, all under site/explore/data/):
 *   occ_index      the 967-entry (code, group) occupation index + area index
 *   geo            52 pre-projected state paths, viewBox "0 0 975 610"
 *   series_g<NN>   per-SOC-major-group state series (lazy, named by occ.b)
 *   metro_index    219 metros + the 241-code metro occupation menu (lazy)
 *   metro_g<NN>    per-major-group metro series (lazy, named by metro occ.b)
 *
 * Zero dependencies. Everything on screen traces to one of those files.
 * ========================================================================== */
(function () {
'use strict';

var A = window.App;
if (!A || typeof A.registerView !== 'function') {
  if (window.console) console.error('[view_map] App runtime missing; view not registered.');
  return;
}

/* ---------------------------------------------------------------------------
 * 0. Styling.
 * ------------------------------------------------------------------------- */
/* Styling lives in site/explore/style.css — the page has ONE stylesheet, and
 * the card surface, section head and button spec are the shared house rules
 * there. Every selector this view uses is namespaced .mv / .mv-*, plus the
 * shared classes (.section-head, .color-toggle, .stat-big, .yslider, .panel). */

/* ---------------------------------------------------------------------------
 * 1. Tiny helpers over the App DOM builders
 * ------------------------------------------------------------------------- */
function kids(k) {
  if (k == null || k === false) return [];
  var arr = Array.isArray(k) ? k : [k];
  var out = [];
  for (var i = 0; i < arr.length; i++) {
    var v = arr[i];
    if (v == null || v === false) continue;
    if (Array.isArray(v)) out = out.concat(kids(v));
    else out.push(v);
  }
  return out;
}
function E(tag, attrs, k) { return A.el.apply(A, [tag, attrs || {}].concat(kids(k))); }
function S(tag, attrs, k) { return A.svg.apply(A, [tag, attrs || {}].concat(kids(k))); }

function clamp(x, lo, hi) { return x < lo ? lo : (x > hi ? hi : x); }
function clamp01(x) { return clamp(x, 0, 1); }

/* colour parsing, so labels drawn ON a fill can pick ink or paper */
function rgbOf(c) {
  if (!c) return [128, 128, 128];
  c = String(c).trim();
  if (c.charAt(0) === '#') {
    if (c.length === 4) return [parseInt(c[1] + c[1], 16), parseInt(c[2] + c[2], 16), parseInt(c[3] + c[3], 16)];
    if (c.length >= 7) return [parseInt(c.substr(1, 2), 16), parseInt(c.substr(3, 2), 16), parseInt(c.substr(5, 2), 16)];
  }
  var m = c.match(/-?[\d.]+/g);
  if (m && m.length >= 3) return [+m[0], +m[1], +m[2]];
  return [128, 128, 128];
}
function relLum(c) {
  var p = rgbOf(c).map(function (v) { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); });
  return 0.2126 * p[0] + 0.7152 * p[1] + 0.0722 * p[2];
}
function inkOn(c) { return relLum(c) > 0.32 ? '#0a0a0f' : '#e6e6ee'; }

/* formatting fallbacks are never used when app.js is present; they only keep a
 * partially-loaded page from throwing. */
var F = {
  num: function (n) { return A.fmt && A.fmt.num ? A.fmt.num(n) : String(n); },
  compact: function (n) { return A.fmt && A.fmt.compact ? A.fmt.compact(n) : String(n); },
  usd: function (n) { return A.fmt && A.fmt.usd ? A.fmt.usd(n) : '$' + n; },
  pct: function (x, dp) { return A.fmt && A.fmt.pct ? A.fmt.pct(x, dp) : (x * 100).toFixed(dp == null ? 1 : dp) + '%'; },
  pp: function (x) { return A.fmt && A.fmt.pp ? A.fmt.pp(x) : (x >= 0 ? '+' : '') + x.toFixed(1) + 'pp'; }
};
function signPct(d) { return (d >= 0 ? '+' : '−') + F.pct(Math.abs(d)); }
function signNum(d) { return (d >= 0 ? '+' : '−') + F.num(Math.abs(Math.round(d))); }
function fixed(v, dp) { return v == null ? '—' : v.toFixed(dp); }

var COL = {
  seq: function (t) { return A.color && A.color.seq ? A.color.seq(clamp01(t)) : 'rgb(30,40,60)'; },
  div: function (t) { return A.color && A.color.div ? A.color.div(clamp01(t)) : 'rgb(60,60,70)'; },
  missing: (A.color && A.color.missing) || '#3a3a44'
};
var NOT_PUBLISHED = '#16161e';   /* darker than App.color.missing: a different fact */
var GRID = 'rgba(255,255,255,.07)';

/* ---------------------------------------------------------------------------
 * 2. d3.geoAlbersUsa, ported from pipeline/build_geo.py (same constants), so
 *    metro lat/lon land on the same 975x610 frame as data/geo_states.json.
 * ------------------------------------------------------------------------- */
var RAD = Math.PI / 180, K = 1300, TX = 487.5, TY = 305;
function Conic(par, rot, cen, k, tr) {
  var p0 = par[0] * RAD, p1 = par[1] * RAD, sy0 = Math.sin(p0);
  var n = (sy0 + Math.sin(p1)) / 2;
  this.n = n; this.C = 1 + sy0 * (2 * n - sy0); this.r0 = Math.sqrt(this.C) / n;
  this.rot = rot; this.k = k; this.tx = tr[0]; this.ty = tr[1];
  var c = this.raw(cen[0] * RAD, cen[1] * RAD);
  this.cpx = c[0]; this.cpy = c[1];
}
Conic.prototype.raw = function (lam, phi) {
  var v = this.C - 2 * this.n * Math.sin(phi); if (v < 0) v = 0;
  var r = Math.sqrt(v) / this.n;
  return [r * Math.sin(lam * this.n), this.r0 - r * Math.cos(lam * this.n)];
};
Conic.prototype.pt = function (lon, lat) {
  var lam = ((lon + this.rot + 180) % 360 + 360) % 360 - 180;
  var p = this.raw(lam * RAD, lat * RAD);
  return [this.tx + this.k * (p[0] - this.cpx), this.ty - this.k * (p[1] - this.cpy)];
};
var PROJ = {
  l48: new Conic([29.5, 45.5], 96, [-0.6, 38.7], K, [TX, TY]),
  ak: new Conic([55, 65], 154, [-2, 58.5], K * 0.35, [TX - 0.307 * K, TY + 0.201 * K]),
  hi: new Conic([8, 18], 157, [-3, 19.9], K, [TX - 0.205 * K, TY + 0.212 * K])
};

/* ---------------------------------------------------------------------------
 * 3. Metric definitions
 * ------------------------------------------------------------------------- */
var METRICS = {
  j: {
    key: 'j', label: 'Jobs per 1,000', short: 'jobs/1,000', kind: 'seq', zero: true, transform: 'sqrt',
    fmt: function (v) { return v >= 100 ? v.toFixed(0) : v.toFixed(v < 10 ? 2 : 1); },
    what: 'Jobs per 1,000 — out of every 1,000 jobs in that state (OEWS 00-0000 total employment, the denominator), how many are this occupation. Published by BLS; it is what lets a small state be compared with California.'
  },
  q: {
    key: 'q', label: 'Location quotient', short: 'LQ', kind: 'div', zero: false, transform: 'log',
    fmt: function (v) { return v.toFixed(2); },
    what: 'Location quotient — the state’s share of its jobs in this occupation divided by the same share for the whole US. 1.00 is exactly the national average, 2.00 is twice as concentrated, 0.50 is half. Published by BLS; the colour scale is symmetric in log space around 1.00.'
  },
  e: {
    key: 'e', label: 'Total employment', short: 'employment', kind: 'seq', zero: true, transform: 'sqrt',
    fmt: function (v) { return F.num(v); },
    what: 'Total employment — headcount of this occupation in the state, as BLS published it. Big states dominate by construction, so the colour scale is square-root spaced (the legend ticks show the real values); use jobs per 1,000 to compare like with like.'
  },
  w: {
    key: 'w', label: 'Median annual wage', short: 'median wage', kind: 'seq', zero: false, transform: 'linear',
    fmt: function (v) { return F.usd(v); },
    what: 'Median annual wage — half this occupation’s workers in the state earn more and half earn less (BLS annual median). A hatched state is at or above that year’s BLS top code: a censored high value, not missing data.'
  }
};
var METRIC_ORDER = ['j', 'q', 'e', 'w'];

/* ---------------------------------------------------------------------------
 * 4. View state
 * ------------------------------------------------------------------------- */
var st = null;

function freshState() {
  return {
    token: 0, root: null, ro: null, docClick: null, slider: null,
    idx: null, geo: null, geoByAbbr: null, areaByFips: null,
    bundles: {}, metroIdx: null, metroBundles: {},
    occ: null, model: null, metro: null,
    metric: 'j', year: 2024, trendMetric: 'e',
    metroOn: false, metroMsg: null, metroSort: 'e',
    pendingSel: null, yearFromHash: false,
    selFips: null, hoverFips: null,
    pickerOpen: false, pickerRows: null, pickerCursor: -1,
    nodes: {}
  };
}

/* ---------------------------------------------------------------------------
 * 5. Model: one selected occupation's state series, indexed for O(1) lookup
 * ------------------------------------------------------------------------- */
function buildModel(occ, bundle) {
  var row = null;
  for (var i = 0; i < bundle.occ.length; i++) {
    if (bundle.occ[i].c === occ.c && bundle.occ[i].g === occ.g) { row = bundle.occ[i]; break; }
  }
  if (!row) return null;
  var apOf = {};                     /* global area index -> position in row.a */
  for (var k = 0; k < row.a.length; k++) apOf[row.a[k]] = k;
  var yp = {};                       /* year -> position in row.y */
  for (var m = 0; m < row.y.length; m++) yp[row.y[m]] = m;
  function set(list) { var s = {}; if (list) for (var i = 0; i < list.length; i++) s[list[i][0] + ':' + list[i][1]] = 1; return s; }
  var usY = {};
  if (row.us && row.us.y) for (var u = 0; u < row.us.y.length; u++) usY[row.us.y[u]] = u;
  function ylist(list) { var s = {}; if (list) for (var i = 0; i < list.length; i++) s[list[i]] = 1; return s; }
  return {
    occ: occ, row: row, years: row.y, apOf: apOf, ypOf: yp,
    tc: set(row.tc), wm: set(row.wm), es: set(row.es),
    us: row.us || null, usYp: usY,
    usTc: ylist(row.us && row.us.tc), usWm: ylist(row.us && row.us.wm), usEs: ylist(row.us && row.us.es),
    th: row.th || null
  };
}

/* A cell's honest status. Never conflates the four different reasons for null. */
function cell(model, metric, areaIdx, year) {
  var yp = model.ypOf[year];
  if (yp == null) return { s: 'noyear', v: null };
  var ap = model.apOf[areaIdx];
  if (ap == null) return { s: 'noarea', v: null };
  var arr = model.row[metric];
  var v = (arr && arr[ap]) ? arr[ap][yp] : null;
  if (v != null) return { s: 'ok', v: v, ap: ap, yp: yp };
  var key = ap + ':' + yp;
  if (metric === 'w') {
    if (model.tc[key]) return { s: 'topcode', v: null, ap: ap, yp: yp };
    if (model.wm[key]) return { s: 'missing', v: null, flag: '*', ap: ap, yp: yp };
  } else if (model.es[key]) {
    return { s: 'missing', v: null, flag: '**', ap: ap, yp: yp };
  }
  var bit = (model.row.p[ap] >> yp) & 1;
  return bit ? { s: 'missing', v: null, flag: null, ap: ap, yp: yp }
             : { s: 'notpublished', v: null, ap: ap, yp: yp };
}

/* national row, on its own year axis */
function usCell(model, metric, year) {
  if (!model.us) return { s: 'noyear', v: null };
  var yp = model.usYp[year];
  if (yp == null) return { s: 'noyear', v: null };
  var arr = model.us[metric];
  var v = arr ? arr[yp] : null;
  if (v != null) return { s: 'ok', v: v };
  if (metric === 'w') {
    if (model.usTc[yp]) return { s: 'topcode', v: null };
    if (model.usWm[yp]) return { s: 'missing', v: null, flag: '*' };
  } else if (model.usEs[yp]) return { s: 'missing', v: null, flag: '**' };
  var bit = model.us.p != null ? ((model.us.p >> yp) & 1) : 1;
  return bit ? { s: 'missing', v: null } : { s: 'notpublished', v: null };
}

/* colour domain, computed once over EVERY year so the play animation shows
 * real change rather than a rescaling artefact. */
function buildScale(model, metric) {
  var def = METRICS[metric], vals = [], anyTop = false;
  var arr = model.row[metric];
  for (var ap = 0; ap < model.row.a.length; ap++) {
    for (var yp = 0; yp < model.years.length; yp++) {
      var v = arr && arr[ap] ? arr[ap][yp] : null;
      if (v != null) vals.push(v);
      else if (metric === 'w' && model.tc[ap + ':' + yp]) {
        anyTop = true;
        var tcv = st.idx.topcode_annual[String(model.years[yp])];
        if (tcv != null) vals.push(tcv);
      }
    }
  }
  if (!vals.length) return null;
  var lo = Math.min.apply(null, vals), hi = Math.max.apply(null, vals);
  if (def.kind === 'div') {
    /* Symmetric in log space about 1.00, so "twice the national average" and
     * "half" read equally strong. A single extreme low outlier (Alaska at 0.08
     * here) would otherwise flatten the whole map, so the extent is the 90th
     * percentile of the fold-change and anything past it is clipped to the ramp
     * end - stated in the legend, with the observed range printed beside it. */
    var folds = [];
    for (var i = 0; i < vals.length; i++) if (vals[i] > 0) folds.push(Math.max(vals[i], 1 / vals[i]));
    folds.sort(function (a, b) { return a - b; });
    var ext = folds.length ? folds[Math.floor(0.9 * (folds.length - 1))] : 2;
    ext = Math.max(ext, 1.5);
    var clipped = 0;
    for (var f = 0; f < folds.length; f++) if (folds[f] > ext + 1e-9) clipped++;
    return {
      kind: 'div', ext: ext, lo: lo, hi: hi, anyTop: anyTop, clipped: clipped,
      t: function (v) { return v <= 0 ? 0 : clamp01(0.5 + 0.5 * Math.log(v) / Math.log(ext)); },
      inv: function (t) { return Math.pow(ext, 2 * t - 1); },
      color: function (v) { return COL.div(this.t(v)); }
    };
  }
  if (def.zero) lo = 0;
  if (hi === lo) hi = lo + 1;
  var fwd = def.transform === 'sqrt' ? Math.sqrt : function (x) { return x; };
  var inv = def.transform === 'sqrt' ? function (x) { return x * x; } : function (x) { return x; };
  var flo = fwd(lo), fhi = fwd(hi);
  return {
    kind: 'seq', lo: lo, hi: hi, anyTop: anyTop,
    t: function (v) { return clamp01((fwd(v) - flo) / (fhi - flo)); },
    inv: function (t) { return inv(flo + t * (fhi - flo)); },
    color: function (v) { return COL.seq(0.06 + 0.94 * this.t(v)); }
  };
}

/* ---------------------------------------------------------------------------
 * 6. Occupation picker
 * ------------------------------------------------------------------------- */
function occKey(o) { return o.c + '|' + o.g; }
function yearsLabel(o) {
  var y = o.y;
  if (!y || !y.length) return '';
  var full = (y.length === st.idx.years.length);
  var contiguous = y[y.length - 1] - y[0] === y.length - 1;
  if (full) return String(y[0]) + '–' + y[y.length - 1];
  if (contiguous) return String(y[0]) + '–' + y[y.length - 1];
  return y.join(', ');
}

function buildPickerList() {
  var idx = st.idx, groups = {}, majorN = {};
  var majorTitle = {};
  for (var g = 0; g < idx.majors.length; g++) majorTitle[idx.majors[g].mg] = idx.majors[g].t;
  var totals = [];
  for (var i = 0; i < idx.occupations.length; i++) {
    var o = idx.occupations[i];
    if (o.g === 'total' || o.g === 'major') {
      totals.push(o);
      if (o.g === 'major') majorN[o.mg] = o.n || 0;
      continue;
    }
    (groups[o.mg] = groups[o.mg] || []).push(o);
  }
  totals.sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
  var order = Object.keys(groups).sort(function (a, b) { return (majorN[b] || 0) - (majorN[a] || 0); });
  var out = [{ head: 'All occupations & SOC major groups', items: totals }];
  for (var k = 0; k < order.length; k++) {
    var arr = groups[order[k]];
    arr.sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
    out.push({ head: (majorTitle[order[k]] || ('SOC ' + order[k])) + ' · ' + order[k], items: arr });
  }
  return out;
}

function optionRow(o) {
  var bits = [o.c];
  var yl = yearsLabel(o);
  if (yl) bits.push(yl);
  var btn = E('button', {
    class: 'mv-opt', type: 'button', 'data-key': occKey(o),
    on: { click: function () { closePicker(); selectOccupation(o); } }
  }, [
    E('span', { class: 't' }, o.t),
    o.gap ? E('span', { class: 'mv-chip', title: 'This code is missing from at least one year of 2018-2024 — the series breaks.' }, 'break') : null,
    E('span', { class: 'c' }, bits.join(' · ')),
    E('span', { class: 'n', title: 'National employment, ' + (o.ny || '') }, o.n != null ? F.compact(o.n) : '—')
  ]);
  btn._occ = o;
  return btn;
}

function buildPicker() {
  var groups = buildPickerList();
  var list = E('div', { class: 'mv-list' });
  var rows = [];
  for (var i = 0; i < groups.length; i++) {
    var head = E('div', { class: 'mv-glab' }, groups[i].head);
    list.appendChild(head);
    var items = groups[i].items, groupRows = [];
    for (var j = 0; j < items.length; j++) {
      var r = optionRow(items[j]);
      list.appendChild(r); rows.push(r); groupRows.push(r);
    }
    head._rows = groupRows;
    rows._heads = rows._heads || [];
    rows._heads.push(head);
  }
  var empty = E('div', { class: 'mv-empty', style: { display: 'none' } }, 'No occupation matches that.');
  list.appendChild(empty);

  var search = E('input', {
    type: 'text', placeholder: 'Filter ' + st.idx.occupations.length + ' OEWS occupations by title or SOC code…',
    on: {
      input: function () { filterPicker(this.value); },
      keydown: function (ev) { pickerKey(ev); }
    }
  });
  var pop = E('div', { class: 'mv-pop', style: { display: 'none' } }, [search, list]);
  st.pickerRows = rows;
  st.nodes.pickerPop = pop;
  st.nodes.pickerSearch = search;
  st.nodes.pickerList = list;
  st.nodes.pickerEmpty = empty;
  return pop;
}

function filterPicker(q) {
  var rows = st.pickerRows, heads = rows._heads || [];
  q = (q || '').trim().toLowerCase();
  var terms = q ? q.split(/\s+/) : [];
  var shown = 0;
  for (var i = 0; i < rows.length; i++) {
    var o = rows[i]._occ, ok = true;
    if (terms.length) {
      var hay = (o.t + ' ' + o.c + ' ' + (o.s || '')).toLowerCase();
      for (var t = 0; t < terms.length; t++) if (hay.indexOf(terms[t]) < 0) { ok = false; break; }
    }
    rows[i].style.display = ok ? '' : 'none';
    rows[i].classList.remove('cur');
    if (ok) shown++;
  }
  for (var h = 0; h < heads.length; h++) {
    var any = false, hr = heads[h]._rows;
    if (!terms.length) any = hr.length > 0;
    else for (var k = 0; k < hr.length; k++) if (hr[k].style.display !== 'none') { any = true; break; }
    heads[h].style.display = any ? '' : 'none';
  }
  st.nodes.pickerEmpty.style.display = shown ? 'none' : '';
  st.pickerCursor = -1;
  st.nodes.pickerList.scrollTop = 0;
}

function pickerKey(ev) {
  var visible = st.pickerRows.filter(function (r) { return r.style.display !== 'none'; });
  if (ev.key === 'Escape') { closePicker(); return; }
  if (ev.key === 'Enter') {
    var pick = visible[st.pickerCursor >= 0 ? st.pickerCursor : 0];
    if (pick) { ev.preventDefault(); closePicker(); selectOccupation(pick._occ); }
    return;
  }
  if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
  ev.preventDefault();
  if (!visible.length) return;
  if (st.pickerCursor >= 0 && visible[st.pickerCursor]) visible[st.pickerCursor].classList.remove('cur');
  st.pickerCursor = ev.key === 'ArrowDown'
    ? Math.min(visible.length - 1, st.pickerCursor + 1)
    : Math.max(0, st.pickerCursor - 1);
  var cur = visible[st.pickerCursor];
  cur.classList.add('cur');
  if (cur.scrollIntoView) cur.scrollIntoView({ block: 'nearest' });
}

function openPicker() {
  st.pickerOpen = true;
  st.nodes.pickerPop.style.display = '';
  st.nodes.pickerSearch.value = '';
  filterPicker('');
  markSelectedOption();
  st.nodes.pickerSearch.focus();
}
function closePicker() {
  st.pickerOpen = false;
  if (st.nodes.pickerPop) st.nodes.pickerPop.style.display = 'none';
}
function markSelectedOption() {
  var key = st.occ ? occKey(st.occ) : null;
  for (var i = 0; i < st.pickerRows.length; i++) {
    var r = st.pickerRows[i];
    r.classList.toggle('sel', r.getAttribute('data-key') === key);
  }
}

/* ---------------------------------------------------------------------------
 * 7. Lineage: crosswalk-backed predecessors / successors, and nothing invented
 * ------------------------------------------------------------------------- */
function relatedCodes(occ) {
  var idx = st.idx, pre = {}, post = {};
  var i, o;
  if (occ.pre) for (i = 0; i < occ.pre.length; i++) pre[occ.pre[i]] = 1;
  if (occ.post) for (i = 0; i < occ.post.length; i++) post[occ.post[i]] = 1;
  for (i = 0; i < idx.occupations.length; i++) {
    o = idx.occupations[i];
    if (o.c === occ.c) continue;
    if (o.post) for (var a = 0; a < o.post.length; a++) if (o.post[a] === occ.c) pre[o.c] = 1;
    if (o.pre) for (var b = 0; b < o.pre.length; b++) if (o.pre[b] === occ.c) post[o.c] = 1;
  }
  function resolve(map) {
    var out = [];
    for (i = 0; i < idx.occupations.length; i++) {
      o = idx.occupations[i];
      if (map[o.c] && o.g === 'detailed') out.push(o);
    }
    /* biggest first, capped: a handful of crosswalk hops is context, twenty is noise */
    out.sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
    return out.slice(0, 3);
  }
  return { pre: resolve(pre), post: resolve(post) };
}

/* Codes in the same SOC major group published in `year` but absent from the
 * selected code's own year list. Offered as CANDIDATES only - the BLS 2010->2018
 * crosswalk asserts no link for the OEWS-only combined codes. */
function candidatesFor(occ, year) {
  var out = [], idx = st.idx;
  for (var i = 0; i < idx.occupations.length; i++) {
    var o = idx.occupations[i];
    if (o.mg !== occ.mg || o.g !== 'detailed' || o.c === occ.c) continue;
    if (o.y.indexOf(year) < 0) continue;
    if (o.y.length === idx.years.length) continue;      /* a full-span code is not a bridge */
    out.push(o);
  }
  out.sort(function (a, b) { return (b.n || 0) - (a.n || 0); });
  return out.slice(0, 6);
}

/* ---------------------------------------------------------------------------
 * 8. The map
 * ------------------------------------------------------------------------- */
var DC_BOX = { x: 894, y: 286, s: 15 };   /* open ocean; DC's own polygon is ~1px */

function buildMap() {
  var geo = st.geo;
  var svg = S('svg', {
    class: 'mv-map', viewBox: '0 0 975 610', preserveAspectRatio: 'xMidYMid meet',
    role: 'img', 'aria-label': 'Choropleth of US states'
  });
  var defs = S('defs', {}, [
    S('pattern', { id: 'mv-hatch-miss', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(45)' }, [
      S('rect', { width: 6, height: 6, fill: COL.missing }),
      S('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'rgba(255,255,255,.30)', 'stroke-width': 2 })
    ]),
    S('pattern', { id: 'mv-hatch-top', width: 6, height: 6, patternUnits: 'userSpaceOnUse', patternTransform: 'rotate(135)' }, [
      S('rect', { width: 6, height: 6, fill: COL.seq(1) }),
      S('line', { x1: 0, y1: 0, x2: 0, y2: 6, stroke: 'rgba(10,10,15,.55)', 'stroke-width': 2 })
    ])
  ]);
  svg.appendChild(defs);

  var gStates = S('g', { class: 'g-states' });
  var gLabels = S('g', { class: 'g-labels', 'pointer-events': 'none' });
  var gBub = S('g', { class: 'g-bub' });
  var paths = {};
  var labels = {};

  for (var i = 0; i < geo.states.length; i++) {
    (function (s) {
      var p = S('path', { class: 's', d: s.d, fill: NOT_PUBLISHED });
      p.addEventListener('mousemove', function (ev) { hoverState(s.fips, ev); });
      p.addEventListener('mouseleave', function () { unhoverState(); });
      p.addEventListener('click', function () { toggleSelect(s.fips); });
      gStates.appendChild(p);
      paths[s.fips] = p;
      var w = s.bb[2] - s.bb[0], h = s.bb[3] - s.bb[1];
      if (w >= 30 && h >= 17) {
        var tx = S('text', {
          x: s.lp[0], y: s.lp[1], 'text-anchor': 'middle', 'font-size': 9.5,
          'font-weight': 600, 'letter-spacing': '.02em', fill: '#e6e6ee'
        }, s.abbr);
        gLabels.appendChild(tx);
        labels[s.fips] = tx;
      }
    })(geo.states[i]);
  }

  /* District of Columbia: a callout square, because its polygon is invisible */
  var dc = null;
  for (var d = 0; d < geo.states.length; d++) if (geo.states[d].abbr === 'DC') dc = geo.states[d];
  if (dc) {
    var lead = S('line', {
      x1: dc.c[0], y1: dc.c[1], x2: DC_BOX.x, y2: DC_BOX.y + DC_BOX.s / 2,
      stroke: 'rgba(255,255,255,.28)', 'stroke-width': 0.8, 'pointer-events': 'none'
    });
    gStates.appendChild(lead);
    var box = S('rect', {
      class: 's', x: DC_BOX.x, y: DC_BOX.y, width: DC_BOX.s, height: DC_BOX.s, rx: 2, fill: NOT_PUBLISHED
    });
    box.addEventListener('mousemove', function (ev) { hoverState(dc.fips, ev); });
    box.addEventListener('mouseleave', function () { unhoverState(); });
    box.addEventListener('click', function () { toggleSelect(dc.fips); });
    gStates.appendChild(box);
    paths['dcbox'] = box;
    gLabels.appendChild(S('text', {
      x: DC_BOX.x + DC_BOX.s / 2, y: DC_BOX.y - 3, 'text-anchor': 'middle',
      'font-size': 9, fill: 'var(--fg2)'
    }, 'DC'));
  }

  svg.appendChild(gStates);
  svg.appendChild(gBub);
  svg.appendChild(gLabels);
  st.nodes.mapPaths = paths;
  st.nodes.mapLabels = labels;
  st.nodes.mapBubbles = gBub;
  st.nodes.dcRef = dc;
  return svg;
}

function fillFor(status, value, scale) {
  if (status === 'ok' && scale) return scale.color(value);
  if (status === 'topcode') return 'url(#mv-hatch-top)';
  if (status === 'missing') return 'url(#mv-hatch-miss)';
  return NOT_PUBLISHED;
}

function paintMap() {
  var m = st.model, scale = st.scale, year = st.year, paths = st.nodes.mapPaths;
  var metric = st.metric;
  for (var i = 0; i < st.geo.states.length; i++) {
    var s = st.geo.states[i];
    var areaIdx = st.areaByFips[s.fips];
    var c = areaIdx == null ? { s: 'noarea', v: null } : cell(m, metric, areaIdx, year);
    var fill = fillFor(c.s, c.v, scale);
    var node = paths[s.fips];
    node.setAttribute('fill', fill);
    node.setAttribute('opacity', c.s === 'ok' || c.s === 'topcode' ? 1 : 0.9);
    if (s.abbr === 'DC' && paths.dcbox) {
      paths.dcbox.setAttribute('fill', fill);
      paths.dcbox.setAttribute('opacity', c.s === 'ok' || c.s === 'topcode' ? 1 : 0.9);
    }
    var lab = st.nodes.mapLabels[s.fips];
    if (lab) lab.setAttribute('fill', c.s === 'ok' ? inkOn(fill) : '#8f8f9c');
  }
  applyHighlight();
  paintBubbles();
}

function applyHighlight() {
  var paths = st.nodes.mapPaths;
  for (var f in paths) {
    if (!Object.prototype.hasOwnProperty.call(paths, f)) continue;
    var fips = f === 'dcbox' ? (st.nodes.dcRef ? st.nodes.dcRef.fips : null) : f;
    var on = fips != null && (fips === st.selFips || fips === st.hoverFips);
    paths[f].classList.toggle('hi', !!on);
  }
}

/* ---------------------------------------------------------------------------
 * 9. Metro bubbles
 * ------------------------------------------------------------------------- */
function metroXY(mt) {
  if (mt.ps === 'PR') {
    var pr = st.geoByAbbr['PR'];
    return pr ? [pr.c[0], pr.c[1]] : null;      /* PR is a custom inset, not on d3's albersUsa graticule */
  }
  var p = mt.ps === 'AK' ? PROJ.ak : (mt.ps === 'HI' ? PROJ.hi : PROJ.l48);
  var xy = p.pt(mt.lon, mt.lat);
  if (xy[0] < 0 || xy[0] > 975 || xy[1] < 0 || xy[1] > 610) return null;
  return xy;
}

function paintBubbles() {
  var g = st.nodes.mapBubbles;
  while (g.firstChild) g.removeChild(g.firstChild);
  var yi = st.idx.years.indexOf(st.year);
  if (!st.metroOn || !st.metro || yi < 0) {
    st.metroStats = null;
    renderBubbleLegend();
    renderMetroTable();
    if (st.nodes.metroNote) st.nodes.metroNote.textContent = metroNoteText();
    return;
  }
  var row = st.metro.row, metros = st.metroIdx.metros;
  var pts = [], maxE = 0, off = 0;
  for (var i = 0; i < row.m.length; i++) {
    var e = row.e[i] ? row.e[i][yi] : null;
    if (e == null) continue;
    var mt = metros[row.m[i]];
    var xy = metroXY(mt);
    if (!xy) { off++; continue; }
    pts.push({ mt: mt, e: e, i: i, x: xy[0], y: xy[1] });
    if (e > maxE) maxE = e;
  }
  pts.sort(function (a, b) { return b.e - a.e; });
  var TOP = 45;
  var drawn = pts.slice(0, TOP);
  st.metroStats = { total: pts.length, drawn: drawn.length, offmap: off, maxE: maxE };
  var rMax = 20;
  function radius(e) { return Math.max(1.8, rMax * Math.sqrt(e / maxE)); }
  st.metroRadius = radius;
  var hits = [];
  for (var k = 0; k < drawn.length; k++) {
    (function (p) {
      var r = radius(p.e);
      g.appendChild(S('circle', {
        cx: p.x, cy: p.y, r: r, 'pointer-events': 'none',
        fill: 'rgba(236,236,246,.16)', stroke: 'rgba(242,242,252,.80)', 'stroke-width': 1
      }));
      /* a bigger, invisible hit target: an r=2 dot is impossible to hover */
      var hit = S('circle', { class: 'bub', cx: p.x, cy: p.y, r: Math.max(r, 6), fill: 'transparent' });
      hit.addEventListener('mousemove', function (ev) { ev.stopPropagation(); metroTip(p, ev); });
      hit.addEventListener('mouseleave', function () { A.tooltip.hide(); });
      hits.push(hit);
    })(drawn[k]);
  }
  for (var h = hits.length - 1; h >= 0; h--) g.appendChild(hits[h]);   /* smallest on top */
  if (st.nodes.metroNote) st.nodes.metroNote.textContent = metroNoteText();
  renderBubbleLegend();
  renderMetroTable();
}

function renderBubbleLegend() {
  var host = st.nodes.bubLegend;
  if (!host) return;
  while (host.firstChild) host.removeChild(host.firstChild);
  if (!st.metroOn || !st.metro || !st.metroStats || !st.metroStats.maxE) return;
  var maxE = st.metroStats.maxE, r = st.metroRadius;
  var vals = [maxE, maxE / 4, maxE / 16].filter(function (v) { return v >= 1; });
  var R = r(maxE), cx = R + 2;
  var W = 220, H = 2 * R + 18;
  var svg = S('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { display: 'block' } });
  var baseY = H - 10;
  vals.forEach(function (v, i) {
    var rr = r(v), topY = baseY - 2 * rr;
    var labY = 10 + i * 12;                       /* stacked labels never collide */
    svg.appendChild(S('circle', {
      cx: cx, cy: baseY - rr, r: rr,
      fill: 'rgba(236,236,246,.16)', stroke: 'rgba(242,242,252,.80)', 'stroke-width': 1
    }));
    svg.appendChild(S('path', {
      d: 'M' + cx + ',' + topY + 'L' + (2 * R + 14) + ',' + topY + 'L' + (2 * R + 22) + ',' + labY,
      fill: 'none', stroke: 'rgba(255,255,255,.22)', 'stroke-width': 1
    }));
    svg.appendChild(S('text', {
      x: 2 * R + 26, y: labY + 3.5, 'font-size': 9.5, fill: 'var(--fg2)'
    }, F.compact(v) + ' jobs'));
  });
  host.appendChild(svg);
}

/* ---------------------------------------------------------------------------
 * Metro ranking. The bubbles cap at the 45 largest so the map stays readable;
 * this is the rest of the answer, and the one table this data can produce that
 * a person deciding where to apply can act on. Employment, the DERIVED location
 * quotient and the median wage all come straight from the metro bundle already
 * loaded for the bubbles — nothing extra is fetched.
 * ------------------------------------------------------------------------- */
var METRO_SORTS = {
  e: { label: 'Most jobs', k: 'e', fmt: function (v) { return F.num(v); }, head: 'Employment' },
  q: { label: 'Most concentrated', k: 'q', fmt: function (v) { return v.toFixed(2); }, head: 'LQ (derived)' },
  w: { label: 'Best paid', k: 'w', fmt: function (v) { return F.usd(v); }, head: 'Median wage' }
};

function metroRankRows(sortKey) {
  var yi = st.idx.years.indexOf(st.year);
  if (!st.metro || yi < 0) return [];
  var row = st.metro.row, metros = st.metroIdx.metros, out = [];
  for (var i = 0; i < row.m.length; i++) {
    var e = row.e[i] ? row.e[i][yi] : null;
    var w = row.w[i] ? row.w[i][yi] : null;
    var q = row.q[i] ? row.q[i][yi] : null;
    if (e == null && w == null && q == null) continue;
    out.push({
      mt: metros[row.m[i]], e: e, w: w, q: q,
      top: !!st.metro.tc[i + ':' + yi]
    });
  }
  /* Sorting on a top-coded wage would rank a censored ">= $239,200" below a
     published $239,190, so a top-coded row sorts as the cap itself and is
     labelled. Rows with no value for the sort key drop out rather than sink. */
  var k = sortKey;
  var cap = (st.metro.topcode && st.metro.topcode[yi]) || null;
  out = out.filter(function (r) {
    return k === 'w' ? (r.w != null || (r.top && cap != null)) : r[k] != null;
  });
  out.sort(function (a, b) {
    var av = k === 'w' ? (a.w == null ? cap : a.w) : a[k];
    var bv = k === 'w' ? (b.w == null ? cap : b.w) : b[k];
    return bv - av;
  });
  return out;
}

function renderMetroTable() {
  var host = st.nodes.metroTable;
  if (!host) return;
  while (host.firstChild) host.removeChild(host.firstChild);
  if (!st.metroOn || !st.metro) return;

  var sortKey = st.metroSort || 'e';
  var rows = metroRankRows(sortKey);
  if (!rows.length) return;
  var yi = st.idx.years.indexOf(st.year);
  var cap = (st.metro.topcode && st.metro.topcode[yi]) || null;
  var TOPN = 10;
  var shown = rows.slice(0, TOPN);
  var def = METRO_SORTS[sortKey];

  var btns = E('div', { class: 'mv-toggle color-toggle' }, ['e', 'q', 'w'].map(function (k) {
    return E('button', {
      type: 'button', class: k === sortKey ? 'active' : '',
      on: { click: function () { st.metroSort = k; renderMetroTable(); } }
    }, METRO_SORTS[k].label);
  }));

  var tbl = E('table', { class: 'mv-tbl' });
  var thead = E('thead', {}, E('tr', {}, [
    E('th', {}, 'Metro area'),
    E('th', { class: 'r' }, 'Employment'),
    E('th', { class: 'r' }, 'LQ (derived)'),
    E('th', { class: 'r' }, 'Median wage')
  ]));
  var tb = E('tbody', {});
  shown.forEach(function (r) {
    tb.appendChild(E('tr', { style: { cursor: 'default' } }, [
      E('td', { title: r.mt.t }, r.mt.t.length > 44 ? r.mt.t.slice(0, 43) + '…' : r.mt.t),
      E('td', { class: 'r num' }, r.e == null ? '—' : F.num(r.e)),
      E('td', { class: 'r num' }, r.q == null ? '—' : r.q.toFixed(2)),
      E('td', { class: 'r num' }, r.top ? '≥ ' + F.usd(cap) : (r.w == null ? '—' : F.usd(r.w)))
    ]));
  });
  tbl.appendChild(thead); tbl.appendChild(tb);

  host.appendChild(E('div', {
    style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap', marginTop: '14px' }
  }, [E('div', { class: 'mv-hd' }, 'Top metro areas · ' + st.year), btns]));
  host.appendChild(E('div', { class: 'mv-small', style: { margin: '4px 0 6px' } },
    def.label.toLowerCase() + ' first · top ' + shown.length + ' of ' + rows.length +
    ' metros with a published ' + st.year + ' value for ' + st.occ.c + '.'));
  host.appendChild(tbl);
  host.appendChild(E('div', { class: 'mv-small', style: { marginTop: '6px' } },
    'Location quotient is DERIVED here, not published: (metro occupation share) ÷ (national occupation share), ' +
    'computed from this file’s own national block over its 241-code menu, so it will not match a BLS-published ' +
    'metro LQ exactly. LQ 1.00 = the national average concentration. A wage shown as “≥” is top-coded (“#”): ' +
    'a censored high value, ranked at the cap. The metro file covers 219 areas = 79.1% of 2024 US employment, ' +
    'so these are the largest metros, not every place that employs this occupation.'));
}

function metroNoteText() {
  if (!st.metroOn) return '';
  if (st.metroMsg) return st.metroMsg;
  var s = st.metroStats;
  if (!s) return '';
  var bits = ['Circle area ∝ employment. ' + s.drawn + ' of ' + s.total + ' metros with a published ' + st.year + ' value shown (largest first)'];
  if (s.offmap) bits.push(s.offmap + ' outside the map frame');
  bits.push('largest = ' + F.num(s.maxE) + ' jobs');
  return bits.join(' · ') + '.';
}

function metroTip(p, ev) {
  var yi = st.idx.years.indexOf(st.year);
  var row = st.metro.row;
  var w = row.w[p.i] ? row.w[p.i][yi] : null;
  var q = row.q[p.i] ? row.q[p.i][yi] : null;
  var tcSet = st.metro.tc;
  var isTop = tcSet[p.i + ':' + yi];
  var rows = [
    ['Employment', F.num(p.e)],
    ['Median wage', isTop ? '≥ ' + F.usd(st.metro.topcode[yi]) : (w == null ? 'not published' : F.usd(w))],
    ['LQ (derived)', q == null ? '—' : q.toFixed(2)]
  ];
  var html = '<div class="mv-tt"><div class="h">' + esc(p.mt.t) + '</div>' +
    '<div style="color:var(--fg2);margin-bottom:5px">' + st.year + ' · CBSA ' + esc(p.mt.a) + '</div>' +
    tableHtml(rows) +
    '<div class="f">Location quotient here is derived (metro share ÷ national share) from this file’s own national block, not published by BLS.</div></div>';
  A.tooltip.show(html, ev.clientX, ev.clientY);
}

/* ---------------------------------------------------------------------------
 * 10. Tooltips for states
 * ------------------------------------------------------------------------- */
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
  });
}
function tableHtml(rows) {
  var h = '<table>';
  for (var i = 0; i < rows.length; i++) {
    h += '<tr><td class="k">' + esc(rows[i][0]) + '</td><td class="v">' + rows[i][1] + '</td></tr>';
  }
  return h + '</table>';
}

function cellText(c, metric) {
  if (c.s === 'ok') return METRICS[metric].fmt(c.v);
  if (c.s === 'topcode') return '≥ ' + F.usd(st.idx.topcode_annual[String(st.year)]);
  if (c.s === 'missing') return '<span style="color:var(--fg2)">not released' + (c.flag ? ' (' + c.flag + ')' : '') + '</span>';
  if (c.s === 'notpublished' || c.s === 'noarea') return '<span style="color:var(--fg2)">not published here</span>';
  return '<span style="color:var(--fg2)">code not in ' + st.year + '</span>';
}

function yoyText(areaIdx, metric) {
  var prev = st.year - 1;
  if (st.model.ypOf[prev] == null) return 'no ' + prev + ' value for this code';
  var a = cell(st.model, metric, areaIdx, st.year), b = cell(st.model, metric, areaIdx, prev);
  if (a.s !== 'ok' || b.s !== 'ok') return 'not comparable with ' + prev;
  var d = a.v - b.v;
  if (metric === 'q') return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2) + ' vs ' + prev;
  if (b.v === 0) return '—';
  return signPct(d / b.v) + ' vs ' + prev;
}

function hoverState(fips, ev) {
  st.hoverFips = fips;
  applyHighlight();
  var areaIdx = st.areaByFips[fips];
  var geoS = st.geoByFips[fips];
  var name = geoS ? geoS.name : fips;
  if (areaIdx == null) {
    A.tooltip.show('<div class="mv-tt"><div class="h">' + esc(name) + '</div>' +
      '<div style="color:var(--fg2)">OEWS publishes no rows for this area.</div></div>', ev.clientX, ev.clientY);
    return;
  }
  var m = st.model;
  var ce = cell(m, 'e', areaIdx, st.year), cj = cell(m, 'j', areaIdx, st.year);
  var cq = cell(m, 'q', areaIdx, st.year), cw = cell(m, 'w', areaIdx, st.year);
  var rows = [
    ['Employment', cellText(ce, 'e')],
    ['Jobs per 1,000', cellText(cj, 'j')],
    ['Location quotient', cellText(cq, 'q')],
    ['Median wage', cellText(cw, 'w')]
  ];
  var foot = [];
  var active = METRICS[st.metric];
  foot.push('Change in ' + active.short + ': ' + yoyText(areaIdx, st.metric));
  if (st.year === 2020) foot.push('May 2020 is a COVID-affected reference period.');
  if (ce.s === 'missing') foot.push('“**” = estimate not released by BLS. Employment, jobs/1,000 and LQ are withheld together — this is not zero.');
  if (cw.s === 'topcode') foot.push('“#” = wage at or above the ' + st.year + ' BLS top code of ' + F.usd(st.idx.topcode_annual[String(st.year)]) + '. A censored high value.');
  if (ce.s === 'notpublished') foot.push('OEWS published no row for this occupation in this state in ' + st.year + '.');
  var html = '<div class="mv-tt"><div class="h">' + esc(name) + '</div>' +
    '<div style="color:var(--fg2);margin-bottom:5px">' + st.year + ' · ' + esc(st.occ.t) + ' (' + esc(st.occ.c) + ')</div>' +
    tableHtml(rows) + '<div class="f">' + foot.map(esc).join('<br>') + '</div></div>';
  A.tooltip.show(html, ev.clientX, ev.clientY);
}
function unhoverState() { st.hoverFips = null; applyHighlight(); A.tooltip.hide(); }
function toggleSelect(fips) {
  st.selFips = (st.selFips === fips) ? null : fips;
  syncHash();
  applyHighlight();
  renderRanked();
  renderTrend();
}

/* ---------------------------------------------------------------------------
 * 11. Legend
 * ------------------------------------------------------------------------- */
function buildLegend() {
  var wrap = E('div', { class: 'mv-legend' });
  st.nodes.legend = wrap;
  return wrap;
}

function renderLegend() {
  var wrap = st.nodes.legend;
  while (wrap.firstChild) wrap.removeChild(wrap.firstChild);
  var def = METRICS[st.metric], scale = st.scale;
  var W = 300, H = 10, N = 60;
  var svg = S('svg', { width: W + 8, height: 24, viewBox: '0 0 ' + (W + 8) + ' 24', style: { maxWidth: '100%', display: 'block' } });
  for (var i = 0; i < N; i++) {
    var t = i / (N - 1);
    svg.appendChild(S('rect', {
      x: 4 + t * (W - W / N), y: 0, width: W / N + 0.6, height: H,
      fill: scale ? (scale.kind === 'div' ? COL.div(t) : COL.seq(0.06 + 0.94 * t)) : COL.missing
    }));
  }
  /* few, well-spaced ticks: long money labels collide at five */
  var ticks = (st.metric === 'w' || st.metric === 'e') ? [0, 0.5, 1] : [0, 0.25, 0.5, 0.75, 1];
  for (var k = 0; k < ticks.length; k++) {
    var tt = ticks[k];
    var x = 4 + tt * (W - W / N) + (W / N) / 2;
    var v = scale ? scale.inv(tt) : null;
    var lab = v == null ? '—' : def.fmt(v);
    if (st.metric === 'w' && tt === 1 && scale && scale.anyTop) lab = '≥ ' + lab;
    if (st.metric === 'e') lab = F.compact(v);
    if (scale && scale.kind === 'div' && scale.clipped) {
      if (tt === 0) lab = '≤ ' + lab;
      if (tt === 1) lab = '≥ ' + lab;
    }
    svg.appendChild(S('text', {
      x: clamp(x, 12, W - 4), y: 22, 'font-size': 9.5, fill: 'var(--fg2)',
      'text-anchor': tt === 0 ? 'start' : (tt === 1 ? 'end' : 'middle')
    }, lab));
  }
  var caption = def.label +
    (def.transform === 'sqrt' ? ' · √-spaced' : (def.transform === 'log' ? ' · log-symmetric about 1.00' : '')) +
    ' · fixed across ' + st.model.years[0] + '–' + st.model.years[st.model.years.length - 1];
  if (scale) caption += ' · observed ' + def.fmt(scale.lo) + '–' + def.fmt(scale.hi) +
    (st.metric === 'w' && scale.anyTop ? ' (top-coded)' : '');
  wrap.appendChild(svg);
  wrap.appendChild(E('div', { class: 'mv-small' }, caption));
  if (scale && scale.kind === 'div' && scale.clipped) {
    wrap.appendChild(E('div', { class: 'mv-small' },
      scale.clipped + ' of the area-year cells fall outside the ramp (it is clipped at the 90th percentile fold-change so a single extreme state does not flatten the map); they are drawn at the ramp end.'));
  }

  var sw = E('div', { class: 'mv-legrow' }, [
    swatch(COL.missing, 'Not released (** / *)', '45deg', 'rgba(255,255,255,.45)'),
    swatch(NOT_PUBLISHED, 'Not published there', null, null),
    st.metric === 'w' && st.scale && st.scale.anyTop
      ? swatch(COL.seq(1), '≥ top code (#) — a censored HIGH value', '135deg', 'rgba(10,10,15,.60)') : null
  ]);
  wrap.appendChild(sw);
}

function swatch(base, label, angle, lineColor) {
  var style = { background: base };
  if (angle) {
    style.backgroundImage = 'repeating-linear-gradient(' + angle + ',' + lineColor + ' 0 2px,transparent 2px 4px)';
  }
  return E('span', { class: 'mv-sw' }, [E('i', { style: style }), label]);
}

/* ---------------------------------------------------------------------------
 * 12. Ranked state list (this is also the map's table view)
 * ------------------------------------------------------------------------- */
function renderRanked() {
  var host = st.nodes.rankedBody;
  while (host.firstChild) host.removeChild(host.firstChild);
  var def = METRICS[st.metric], m = st.model, scale = st.scale;
  var idx = st.idx, rows = [], missing = [];
  var maxAbs = 0;
  for (var i = 0; i < m.row.a.length; i++) {
    var areaIdx = m.row.a[i], area = idx.areas[areaIdx];
    var c = cell(m, st.metric, areaIdx, st.year);
    if (c.s === 'ok') {
      rows.push({ area: area, v: c.v, top: false });
      maxAbs = Math.max(maxAbs, Math.abs(c.v));
    } else if (c.s === 'topcode') {
      var tv = idx.topcode_annual[String(st.year)];
      rows.push({ area: area, v: tv, top: true });
      maxAbs = Math.max(maxAbs, tv);
    } else if (c.s !== 'noyear') {
      missing.push({ area: area, c: c });
    }
  }
  rows.sort(function (a, b) { return b.v - a.v || (a.area.abbr < b.area.abbr ? -1 : 1); });

  var noShape = {};
  var aws = (st.geo.meta && st.geo.meta.areas_without_shape) || [];
  for (var n = 0; n < aws.length; n++) noShape[aws[n].abbr] = 1;

  var tbl = E('table', { class: 'mv-tbl' });
  tbl.appendChild(E('thead', {}, E('tr', {}, [
    E('th', {}, '#'), E('th', {}, 'Area'), E('th', {}, def.label),
    E('th', { class: 'r' }, def.kind === 'div' ? 'LQ' : 'Value')
  ])));
  var tb = E('tbody', {});
  for (var r = 0; r < rows.length; r++) {
    (function (row, rank) {
      var fips = row.area.fips;
      var selected = st.selFips === fips;
      var fillW, fillColor, ref = null;
      if (def.kind === 'div') {
        var lo = 0, hi = Math.max(2, maxAbs);
        fillW = clamp01(row.v / hi) * 100;
        fillColor = scale ? scale.color(row.v) : COL.missing;
        ref = clamp01(1 / hi) * 100;
      } else {
        fillW = maxAbs > 0 ? clamp01(row.v / maxAbs) * 100 : 0;
        fillColor = scale ? scale.color(row.v) : COL.missing;
      }
      var track = E('div', { class: 'mv-track' }, [
        E('div', { class: 'mv-fill', style: { width: fillW.toFixed(2) + '%', background: fillColor } }),
        ref != null ? E('div', { class: 'mv-ref', style: { left: ref.toFixed(2) + '%' }, title: '1.00 = national average' }) : null
      ]);
      var tr = E('tr', {
        class: selected ? 'sel' : '', tabindex: '0',
        title: 'Click to pin ' + row.area.name + ' and add its own trend chart',
        on: {
          click: function () { toggleSelect(fips); },
          keydown: function (ev) { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); toggleSelect(fips); } },
          focus: function () { st.hoverFips = fips; applyHighlight(); },
          blur: function () { st.hoverFips = null; applyHighlight(); },
          mouseenter: function () { st.hoverFips = fips; applyHighlight(); },
          mouseleave: function () { st.hoverFips = null; applyHighlight(); }
        }
      }, [
        E('td', { class: 'rank' }, String(rank + 1)),
        E('td', {}, [
          row.area.name,
          row.area.kind === 'territory' ? E('span', { class: 'mv-small' }, ' · territory') : null,
          noShape[row.area.abbr] ? E('span', { class: 'mv-small', title: 'OEWS publishes this area but data/geo_states.json carries no polygon for it.' }, ' · no map shape') : null
        ]),
        E('td', { class: 'bar' }, track),
        E('td', { class: 'r num' }, (row.top ? '≥ ' : '') + def.fmt(row.v))
      ]);
      tb.appendChild(tr);
    })(rows[r], r);
  }
  for (var mi = 0; mi < missing.length; mi++) {
    (function (x) {
      var label = x.c.s === 'missing'
        ? ('not released' + (x.c.flag ? ' (' + x.c.flag + ')' : ''))
        : 'not published there';
      var tr = E('tr', {
        class: 'off',
        on: {
          mouseenter: function () { st.hoverFips = x.area.fips; applyHighlight(); },
          mouseleave: function () { st.hoverFips = null; applyHighlight(); }
        }
      }, [
        E('td', { class: 'rank' }, '—'),
        E('td', {}, x.area.name),
        E('td', { class: 'bar' }, E('div', {
          class: 'mv-track',
          style: x.c.s === 'missing'
            ? { backgroundImage: 'repeating-linear-gradient(45deg,rgba(255,255,255,.22) 0 2px,transparent 2px 4px)', background: COL.missing }
            : {}
        })),
        E('td', { class: 'r', style: { color: 'var(--fg2)', fontSize: '11px' } }, label)
      ]);
      tb.appendChild(tr);
    })(missing[mi]);
  }
  tbl.appendChild(tb);
  if (!rows.length && !missing.length) {
    host.appendChild(E('div', { class: 'mv-empty' }, st.occ.c + ' was not published in ' + st.year + '.'));
  } else {
    host.appendChild(tbl);
  }
  st.nodes.rankedCap.textContent = rows.length + ' of the ' + m.row.a.length +
    ' areas OEWS ever published ' + m.occ.c + ' in have a ' + METRICS[st.metric].short + ' for ' + st.year +
    (missing.length ? '; ' + missing.length + ' listed below the ranking with the reason.' : '.') +
    ' (OEWS covers 54 state-equivalents in total.)';
}

/* ---------------------------------------------------------------------------
 * 13. Line chart (small multiple)
 * ------------------------------------------------------------------------- */
function lineChart(o) {
  var W = o.width, H = o.height, years = o.years;
  var pad = { l: 54, r: 78, t: 16, b: 22 };
  var iw = Math.max(40, W - pad.l - pad.r), ih = Math.max(30, H - pad.t - pad.b);
  var svg = S('svg', { width: '100%', height: H, viewBox: '0 0 ' + W + ' ' + H, style: { display: 'block', overflow: 'visible' } });
  var maxV = 0, anyV = false;
  for (var s = 0; s < o.series.length; s++) {
    for (var i = 0; i < o.series[s].pts.length; i++) {
      var p = o.series[s].pts[i];
      var v = p && (p.v != null ? p.v : p.atLeast);
      if (v != null) { maxV = Math.max(maxV, v); anyV = true; }
    }
  }
  if (!anyV) {
    svg.appendChild(S('text', { x: W / 2, y: H / 2, 'text-anchor': 'middle', 'font-size': 11, fill: 'var(--fg2)' },
      'No national series published for this code.'));
    return svg;
  }
  maxV = maxV * 1.1;
  function X(i) { return pad.l + (years.length > 1 ? i * (iw / (years.length - 1)) : iw / 2); }
  function Y(v) { return pad.t + ih - (v / maxV) * ih; }

  /* gap bands for the primary series, merged into runs and labelled */
  var prim = o.series[0], gapRuns = [], cur = null;
  for (var g = 0; g < years.length; g++) {
    var pv = prim.pts[g];
    var has = pv && (pv.v != null || pv.atLeast != null);
    if (!has) { if (!cur) cur = { a: g, b: g }; else cur.b = g; }
    else if (cur) { gapRuns.push(cur); cur = null; }
  }
  if (cur) gapRuns.push(cur);
  gapRuns.forEach(function (r) {
    var x0 = r.a === 0 ? X(0) - 9 : (X(r.a - 1) + X(r.a)) / 2;
    var x1 = r.b === years.length - 1 ? X(r.b) + 9 : (X(r.b) + X(r.b + 1)) / 2;
    var w = Math.max(2, x1 - x0);
    svg.appendChild(S('rect', { x: x0, y: pad.t, width: w, height: ih, fill: 'rgba(255,255,255,.04)' }));
    if (w >= 54 && o.gapLabel) {
      svg.appendChild(S('text', {
        x: x0 + w / 2, y: pad.t + 11, 'text-anchor': 'middle', 'font-size': 9.5, fill: 'var(--fg2)'
      }, o.gapLabel));
    }
  });

  /* gridlines: solid hairlines, zero-based */
  [0, 0.5, 1].forEach(function (f) {
    var v = maxV * f;
    svg.appendChild(S('line', { x1: pad.l, y1: Y(v), x2: pad.l + iw, y2: Y(v), stroke: GRID, 'stroke-width': 1 }));
    svg.appendChild(S('text', { x: pad.l - 7, y: Y(v) + 3.5, 'text-anchor': 'end', 'font-size': 9.5, fill: 'var(--fg2)', style: { fontVariantNumeric: 'tabular-nums' } }, o.fmtAxis(v)));
  });

  /* x labels + COVID marker */
  for (var xi = 0; xi < years.length; xi++) {
    svg.appendChild(S('text', {
      x: X(xi), y: pad.t + ih + 14, 'text-anchor': 'middle', 'font-size': 9.5,
      fill: years[xi] === 2020 ? '#c9c9d6' : 'var(--fg2)'
    }, String(years[xi]).slice(2).length ? "'" + String(years[xi]).slice(2) : years[xi]));
    if (years[xi] === 2020) {
      svg.appendChild(S('line', { x1: X(xi), y1: pad.t, x2: X(xi), y2: pad.t + ih, stroke: 'rgba(255,255,255,.14)', 'stroke-width': 1 }));
      svg.appendChild(S('text', { x: X(xi), y: pad.t - 5, 'text-anchor': 'middle', 'font-size': 8.5, fill: 'var(--fg2)' }, 'COVID'));
    }
  }

  /* series */
  o.series.forEach(function (ser, si) {
    var color = ser.color;
    var run = [], runs = [];
    for (var i = 0; i < ser.pts.length; i++) {
      var p = ser.pts[i];
      if (p && p.v != null) run.push([X(i), Y(p.v)]);
      else { if (run.length) runs.push(run); run = []; }
    }
    if (run.length) runs.push(run);
    runs.forEach(function (r) {
      if (r.length === 1) return;
      svg.appendChild(S('path', {
        d: 'M' + r.map(function (p) { return p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join('L'),
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }));
    });
    var lastX = null, lastY = null, lastV = null;
    for (var j = 0; j < ser.pts.length; j++) {
      var pt = ser.pts[j];
      if (!pt) continue;
      if (pt.v != null) {
        svg.appendChild(S('circle', { cx: X(j), cy: Y(pt.v), r: 3.2, fill: color, stroke: 'var(--bg2)', 'stroke-width': 2 }));
        lastX = X(j); lastY = Y(pt.v); lastV = o.fmtVal(pt.v);
      } else if (pt.atLeast != null) {
        var yy = Y(pt.atLeast);
        svg.appendChild(S('path', {
          d: 'M' + (X(j) - 4) + ',' + (yy + 3.5) + 'L' + X(j) + ',' + (yy - 3.5) + 'L' + (X(j) + 4) + ',' + (yy + 3.5) + 'Z',
          fill: 'none', stroke: color, 'stroke-width': 1.6
        }));
        lastX = X(j); lastY = yy; lastV = '≥ ' + o.fmtVal(pt.atLeast);
      }
    }
    if (lastX != null) {
      svg.appendChild(S('text', { x: lastX + 8, y: lastY - 4, 'font-size': 10, fill: 'var(--fg)', style: { fontVariantNumeric: 'tabular-nums' } }, lastV));
      svg.appendChild(S('text', { x: lastX + 8, y: lastY + 8, 'font-size': 9.5, fill: 'var(--fg2)' }, ser.label));
    }
  });
  return svg;
}

function trendPoints(getter) {
  var years = st.idx.years, pts = [];
  for (var i = 0; i < years.length; i++) pts.push(getter(years[i]));
  return pts;
}

function renderTrend() {
  var host = st.nodes.trendBody;
  while (host.firstChild) host.removeChild(host.firstChild);
  var W = Math.max(300, (host.clientWidth || 380));
  var metric = st.trendMetric;
  var fmtVal = metric === 'w' ? function (v) { return F.usd(v); } : function (v) { return F.compact(v); };
  var fmtAxis = metric === 'w' ? function (v) { return v >= 1000 ? '$' + F.compact(v) : F.usd(v); } : function (v) { return F.compact(v); };

  /* national, plus any crosswalk-backed predecessor / successor series */
  var series = [{
    label: 'United States',
    color: COL.seq(0.88),
    pts: trendPoints(function (y) {
      var c = usCell(st.model, metric, y);
      if (c.s === 'ok') return { v: c.v };
      if (c.s === 'topcode' && metric === 'w') return { v: null, atLeast: st.idx.topcode_annual[String(y)] };
      return null;
    })
  }];
  var rel = st.related || { pre: [], post: [] };
  var extras = rel.pre.concat(rel.post);
  for (var x = 0; x < extras.length && series.length < 4; x++) {
    var ex = extras[x], bundle = st.bundles[ex.b];
    if (!bundle) continue;
    var mm = buildModel(ex, bundle);
    if (!mm || !mm.us) continue;
    series.push({
      label: ex.c,
      color: COL.seq(0.42),
      pts: trendPoints(function (y) {
        var c = usCell(mm, metric, y);
        if (c.s === 'ok') return { v: c.v };
        if (c.s === 'topcode' && metric === 'w') return { v: null, atLeast: st.idx.topcode_annual[String(y)] };
        return null;
      })
    });
  }

  host.appendChild(E('div', { class: 'mv-small', style: { marginBottom: '2px' } },
    'United States · ' + (metric === 'w' ? 'median annual wage' : 'employment') + ' · axis starts at zero'));
  host.appendChild(lineChart({
    width: W, height: 158, years: st.idx.years, series: series,
    fmtVal: fmtVal, fmtAxis: fmtAxis, gapLabel: st.occ.c + ' not published'
  }));
  var missingYears = st.idx.years.filter(function (y) { return st.model.ypOf[y] == null; });
  if (missingYears.length) {
    host.appendChild(E('div', { class: 'mv-small', style: { marginTop: '4px' } },
      'Shaded band: OEWS published no ' + st.occ.c + ' row in ' + missingYears.join(', ') +
      '. The line breaks rather than sloping across it — the code did not exist, employment did not vanish.'));
  }

  if (series.length > 1) {
    var leg = E('div', { class: 'mv-legrow' }, series.map(function (s) {
      return E('span', { class: 'mv-sw' }, [E('i', { style: { background: s.color } }), s.label]);
    }));
    host.appendChild(leg);
    host.appendChild(E('div', { class: 'mv-small', style: { marginTop: '4px' } },
      'The muted line(s) are the codes BLS’s official 2010→2018 SOC crosswalk maps into or out of ' + st.occ.c +
      '. They are drawn as separate series, never joined to it — a join would assert a continuity BLS does not.'));
  }

  /* selected state: a small multiple on its own axis, never a second y-scale */
  if (st.selFips != null) {
    var areaIdx = st.areaByFips[st.selFips], area = areaIdx != null ? st.idx.areas[areaIdx] : null;
    if (area) {
      var sMetric = metric === 'w' ? 'w' : 'e';
      host.appendChild(E('div', { class: 'mv-small', style: { marginTop: '12px', marginBottom: '2px' } }, [
        area.name + ' · ' + (sMetric === 'w' ? 'median annual wage' : 'employment') +
        ' · own axis (a separate chart, not a second scale) · click the state again to clear',
        /* Hand the selection to the next tab instead of making the reader
           re-pick it there. The remote view reads geo= from its own hash. */
        area.kind === 'state' || area.kind === 'territory'
          ? E('span', {}, [' · ', E('a', {
              href: A.hashState.href('remote', { geo: area.abbr }),
              title: 'Open the Remote work tab with ' + area.name + ' already selected',
              style: { color: 'var(--fg2)' }
            }, 'remote work in ' + area.abbr + ' →')])
          : null
      ]));
      host.appendChild(lineChart({
        width: W, height: 138, years: st.idx.years,
        series: [{
          label: area.abbr, color: COL.seq(0.72),
          pts: trendPoints(function (y) {
            var c = cell(st.model, sMetric, areaIdx, y);
            if (c.s === 'ok') return { v: c.v };
            if (c.s === 'topcode') return { v: null, atLeast: st.idx.topcode_annual[String(y)] };
            return null;
          })
        }],
        fmtVal: fmtVal, fmtAxis: fmtAxis
      }));
    }
  }
}

/* ---------------------------------------------------------------------------
 * 14. Biggest shifts
 * ------------------------------------------------------------------------- */
/* The comparison window. Normally the code's whole published span — but when
 * occ_index flags vb (BLS's own crosswalk says the May-2018 row is not
 * comparable with 2019+), 2018 cannot be the left endpoint of a difference, so
 * the window starts at the first comparable year instead. Returns the endpoints
 * plus everything the caption has to be honest about. */
function shiftWindow() {
  var m = st.model, ys = m.years;
  var vbDrop = !!(st.occ.vb && ys.length > 1 && ys[0] === 2018);
  var used = vbDrop ? ys.slice(1) : ys.slice();
  var y0 = used[0], y1 = used[used.length - 1];
  var holes = [];
  for (var y = y0; y <= y1; y++) if (m.ypOf[y] == null) holes.push(y);
  return {
    y0: y0, y1: y1, used: used, holes: holes, vbDrop: vbDrop,
    single: used.length < 2,
    full: y0 === st.idx.years[0] && y1 === st.idx.years[st.idx.years.length - 1] && !holes.length
  };
}

function shiftRows(metric) {
  var w = shiftWindow(), m = st.model, y0 = w.y0, y1 = w.y1;
  var out = [], skipped = 0;
  for (var i = 0; i < m.row.a.length; i++) {
    var areaIdx = m.row.a[i];
    var a = cell(m, metric, areaIdx, y1), b = cell(m, metric, areaIdx, y0);
    if (a.s !== 'ok' || b.s !== 'ok') { skipped++; continue; }
    out.push({ area: st.idx.areas[areaIdx], d: a.v - b.v, from: b.v, to: a.v });
  }
  out.sort(function (p, q) { return q.d - p.d; });
  return { rows: out, skipped: skipped, y0: y0, y1: y1 };
}

/* The crosswalk / hole warning that belongs beside any 2018-endpoint series. */
function shiftFlags(w) {
  var out = [];
  if (w.vbDrop) {
    out.push(E('div', { class: 'mv-flag' }, [
      E('b', {}, 'The May-2018 value is excluded from this comparison.'),
      ' BLS’s official SOC 2010→2018 crosswalk says ' + st.occ.c + '’s 2018 row is not comparable ' +
      'with 2019 onward' +
      (st.occ.post && st.occ.post.length
        ? ' — it also contains the workers that 2019+ reports separately under ' + st.occ.post.join(', ') + '.'
        : '.') +
      ' Differencing across that break would report a definitional change as an employment change, ' +
      'so the window below starts at ' + w.y0 + ' instead.'
    ]));
  }
  if (w.holes.length) {
    out.push(E('div', { class: 'mv-flag' }, [
      E('b', {}, 'This window has a hole.'),
      ' OEWS did not publish ' + st.occ.c + ' in ' + w.holes.join(', ') +
      ', so the endpoints are ' + w.y0 + ' and ' + w.y1 + ' with ' +
      (w.holes.length > 1 ? 'those years' : 'that year') + ' missing in between, not a continuous span.'
    ]));
  }
  return out;
}

function shiftPanel(metric, title, fmt, W) {
  var res = shiftRows(metric);
  var rows = res.rows;
  if (!rows.length) {
    return E('div', {}, [
      E('div', { class: 'mv-hd' }, title),
      E('div', { class: 'mv-small', style: { marginTop: '6px' } }, 'No area has a published value in both ' + res.y0 + ' and ' + res.y1 + '.')
    ]);
  }
  var N = Math.min(6, Math.ceil(rows.length / 2));
  var top = rows.slice(0, N);
  var bot = rows.slice(Math.max(N, rows.length - N)).reverse();
  var maxAbs = 0;
  rows.forEach(function (r) { maxAbs = Math.max(maxAbs, Math.abs(r.d)); });
  if (maxAbs === 0) maxAbs = 1;

  var rowH = 20, labelW = 132, valW = 82;
  var barW = Math.max(60, W - labelW - valW), cx = labelW + barW / 2;
  var items = top.concat([null]).concat(bot);
  var H = items.length * rowH + 16;
  var svg = S('svg', { width: W, height: H, viewBox: '0 0 ' + W + ' ' + H, style: { display: 'block', maxWidth: '100%' } });
  svg.appendChild(S('line', { x1: cx, y1: 4, x2: cx, y2: H - 12, stroke: GRID, 'stroke-width': 1 }));
  items.forEach(function (r, i) {
    var y = 8 + i * rowH;
    if (!r) {
      svg.appendChild(S('text', { x: labelW - 6, y: y + 10, 'text-anchor': 'end', 'font-size': 9, fill: 'var(--fg2)' }, '⋮'));
      return;
    }
    var w = Math.abs(r.d) / maxAbs * (barW / 2 - 2);
    var col = COL.div(clamp01(0.5 + 0.5 * (r.d / maxAbs)));
    svg.appendChild(S('rect', {
      x: r.d >= 0 ? cx + 1 : cx - 1 - w, y: y + 3, width: Math.max(1, w), height: rowH - 9,
      rx: 2, fill: col
    }));
    svg.appendChild(S('text', { x: labelW - 8, y: y + rowH - 7, 'text-anchor': 'end', 'font-size': 11, fill: 'var(--fg)' },
      r.area.name.length > 19 ? r.area.abbr : r.area.name));
    svg.appendChild(S('text', {
      x: W - 2, y: y + rowH - 7, 'text-anchor': 'end', 'font-size': 10.5, fill: 'var(--fg2)',
      style: { fontVariantNumeric: 'tabular-nums' }
    }, fmt(r.d)));
  });
  svg.appendChild(S('text', { x: cx, y: H - 2, 'text-anchor': 'middle', 'font-size': 9, fill: 'var(--fg2)' }, '0'));

  return E('div', {}, [
    E('div', { class: 'mv-hd' }, title),
    E('div', { class: 'mv-small', style: { margin: '4px 0 6px' } },
      res.y0 + ' → ' + res.y1 + ' · top ' + top.length + ' gains, bottom ' + bot.length + ' losses of ' +
      rows.length + ' areas' + (res.skipped ? ' · ' + res.skipped + ' excluded (no published value at one or both endpoints)' : '')),
    svg
  ]);
}

function renderShifts() {
  var host = st.nodes.shiftsBody;
  while (host.firstChild) host.removeChild(host.firstChild);
  var w = shiftWindow();

  /* A code published in ONE usable year has no change to show. Twelve bars all
   * reading "+0" would read as a finding — "nothing moved for stock clerks" —
   * when the fact is that the code was retired. Say that instead. */
  if (w.single) {
    var succ = (st.related && st.related.post) || [];
    var kidsA = [
      E('b', {}, 'No change to show.'),
      ' OEWS published ' + st.occ.c + ' in ' + w.used.join(', ') + ' only' +
      (w.vbDrop ? ' once the non-comparable May-2018 row is set aside' : '') +
      ', so there is no second year to difference against.'
    ];
    if (succ.length) {
      kidsA.push(' The work continues under ');
      succ.forEach(function (o, i) {
        if (i) kidsA.push(i === succ.length - 1 ? ' and ' : ', ');
        kidsA.push(E('b', {}, o.c + ' ' + o.t));
      });
      kidsA.push(', drawn as a separate series on the trend chart above.');
    }
    host.appendChild(E('div', { class: 'mv-flag' }, kidsA));
    if (succ.length) {
      host.appendChild(E('div', { class: 'mv-toggle color-toggle' }, succ.map(function (o) {
        return E('button', { type: 'button', title: o.t, on: { click: function () { selectOccupation(o); } } },
          'Show ' + o.c + ' · ' + o.t);
      })));
    }
    return;
  }

  shiftFlags(w).forEach(function (n) { host.appendChild(n); });
  host.appendChild(E('div', { class: 'mv-sub', style: { marginBottom: '10px' } }, [
    'Change over ', E('b', {}, w.y0 + '–' + w.y1),
    w.full ? ' — the full ' + st.idx.years[0] + '–' + st.idx.years[st.idx.years.length - 1] + ' window.'
      : (' — ' + (w.vbDrop ? 'the comparable years' : 'the years') + ' OEWS published ' + st.occ.c +
         (w.holes.length ? ', with ' + w.holes.join(', ') + ' missing inside the window' : '') +
         '. It is not the full ' + st.idx.years[0] + '–' + st.idx.years[st.idx.years.length - 1] +
         ' window; the other years belong to different SOC codes.')
  ]));
  /* two-pass: lay the columns out, measure them, then draw at 1:1 px */
  var colA = E('div', {}), colB = E('div', {});
  host.appendChild(E('div', { class: 'mv-two' }, [colA, colB]));
  var wA = Math.max(260, Math.min(560, colA.clientWidth || 440));
  var wB = Math.max(260, Math.min(560, colB.clientWidth || 440));
  colA.appendChild(shiftPanel('e', 'Biggest shifts · absolute jobs', function (d) { return signNum(d); }, wA));
  colB.appendChild(shiftPanel('j', 'Biggest shifts · per 1,000 jobs', function (d) {
    return (d >= 0 ? '+' : '−') + Math.abs(d).toFixed(2);
  }, wB));
  host.appendChild(E('div', { class: 'mv-small', style: { marginTop: '8px' } },
    'Left: headcount change, which tracks state size. Right: change in jobs per 1,000 jobs in that state — the per-capita term, ' +
    'so a small state that doubled shows up. Diverging scale, zero at the centre line.'));
}

/* ---------------------------------------------------------------------------
 * 15. Banner for years the code does not exist
 * ------------------------------------------------------------------------- */
function renderBanner() {
  var host = st.nodes.bannerHost;
  while (host.firstChild) host.removeChild(host.firstChild);
  if (st.model.ypOf[st.year] != null) return;
  var occ = st.occ;
  var rel = st.related || { pre: [], post: [] };
  var jumps = [];
  var seen = {};
  rel.pre.concat(rel.post).forEach(function (o) {
    if (o.y.indexOf(st.year) >= 0 && !seen[occKey(o)]) { seen[occKey(o)] = 1; jumps.push(o); }
  });
  var cands = jumps.length ? [] : candidatesFor(occ, st.year);
  var kidsArr = [
    E('div', {}, [E('b', {}, occ.c + ' was not published in ' + st.year + '.'),
      ' OEWS published this code only in ' + yearsLabel(occ) + '. ' +
      (st.year <= 2018 ? 'May 2018 is the last SOC 2010 year, so 2018 uses different code numbers. ' : '') +
      'The blank map is a code change, not a collapse in employment.'])
  ];
  if (jumps.length) {
    kidsArr.push(E('div', { style: { marginTop: '8px' } }, 'BLS’s official 2010→2018 crosswalk links it to:'));
    kidsArr.push(E('div', { class: 'mv-toggle color-toggle' }, jumps.map(function (o) {
      return E('button', { type: 'button', on: { click: function () { selectOccupation(o); } } }, o.c + ' · ' + o.t);
    })));
  } else if (cands.length) {
    kidsArr.push(E('div', { style: { marginTop: '8px' } },
      'The crosswalk asserts no predecessor for this year — OEWS used combined publication codes that BLS never mapped. ' +
      'These SOC ' + occ.mg + ' codes exist in ' + st.year + ' but not across the whole window; they are candidates to inspect, not an asserted lineage:'));
    kidsArr.push(E('div', { class: 'mv-toggle color-toggle' }, cands.map(function (o) {
      return E('button', { type: 'button', title: o.t, on: { click: function () { selectOccupation(o); } } }, o.c);
    })));
  }
  host.appendChild(E('div', { class: 'mv-banner' }, kidsArr));
}

/* ---------------------------------------------------------------------------
 * 16. Header stats
 * ------------------------------------------------------------------------- */
function renderHeadline() {
  var host = st.nodes.headline;
  while (host.firstChild) host.removeChild(host.firstChild);
  var uc = usCell(st.model, 'e', st.year);
  var uw = usCell(st.model, 'w', st.year);
  var big, sub;
  if (uc.s === 'ok') { big = F.num(uc.v); sub = 'US employment, ' + st.year + ' (BLS national file)'; }
  else if (st.model.ypOf[st.year] == null) { big = '—'; sub = 'code not published in ' + st.year; }
  else { big = '—'; sub = 'US employment not released for ' + st.year; }
  var wageTxt = uw.s === 'ok' ? F.usd(uw.v)
    : (uw.s === 'topcode' ? '≥ ' + F.usd(st.idx.topcode_annual[String(st.year)]) : '—');
  host.appendChild(E('div', { style: { display: 'flex', gap: '30px', flexWrap: 'wrap', alignItems: 'flex-start' } }, [
    E('div', {}, [
      E('div', { class: 'mv-hd' }, 'US employment'),
      E('div', { class: 'mv-big stat-big' }, big),
      E('div', { class: 'mv-small stat-label' }, sub)
    ]),
    E('div', {}, [
      E('div', { class: 'mv-hd' }, 'US median wage'),
      E('div', { class: 'mv-big stat-big' }, wageTxt),
      E('div', { class: 'mv-small stat-label' }, 'annual median, ' + st.year)
    ]),
    E('div', { style: { maxWidth: '430px' } }, [
      E('div', { class: 'mv-hd' }, 'Code coverage'),
      E('div', { class: 'mv-sub', style: { marginTop: '4px' } }, [
        E('b', {}, st.occ.c), ' · ', st.occ.g, ' · published ', E('b', {}, yearsLabel(st.occ)),
        st.occ.vb ? ' · BLS’s crosswalk says the May-2018 value is NOT comparable with 2019+' : '',
        st.occ.th ? ' · the published title changed across years' : '',
        st.occ.oo ? ' · an OEWS-only publication code, in neither SOC vintage' : '',
        '.'
      ]),
      /* occ_index ships the OOH slug precisely so this page and the treemap can
         hand off to each other. index.html reads #<slug> and highlights the tile. */
      st.occ.s ? E('div', { class: 'mv-small', style: { marginTop: '4px' } }, [
        E('a', {
          href: 'index.html#' + st.occ.s,
          title: 'Highlight this occupation on the treemap (same repository, one directory up)',
          style: { color: 'var(--fg2)' }
        }, '← See it on the treemap'),
        E('span', { style: { margin: '0 8px', opacity: '.45' } }, '·'),
        E('a', {
          href: 'https://www.bls.gov/ooh/' + st.occ.cat + '/' + st.occ.s + '.htm',
          target: '_blank', rel: 'noopener', style: { color: 'var(--fg2)' }
        }, 'BLS Occupational Outlook Handbook page ↗')
      ]) : E('div', { class: 'mv-small', style: { marginTop: '4px' } },
        'No OOH page and no treemap tile: the handbook covers 342 occupations, OEWS publishes 944 ' +
        'detailed codes, and only 461 of the 967 index entries carry a slug.')
    ])
  ]));
}

/* ---------------------------------------------------------------------------
 * 17. Year control
 * ------------------------------------------------------------------------- */
/* The year control is App.control.yearSlider — the SAME component the remote
 * view uses, so the one concept has one control on both tabs. It runs in "soft
 * missing" mode: a year this code was never published in is struck through on
 * the track but stays selectable, because landing on it is what triggers the
 * crosswalk explainer over the blank map. A hard-disabled tick would hide the
 * renumbering instead of teaching it. */
function unpublishedYears() {
  return st.idx.years.filter(function (y) { return st.model.ypOf[y] == null; });
}

function renderYearBar() {
  var years = st.idx.years;
  var gone = unpublishedYears();
  if (st.slider) {
    st.slider.setMissing(gone);
    st.slider.set(st.year);
  }
  var pub = years.length - gone.length;
  st.nodes.yearCap.textContent =
    'OEWS published ' + st.occ.c + ' in ' + pub + ' of the ' + years.length + ' years (' +
    yearsLabel(st.occ) + ').' +
    (gone.length ? '  ' + gone.join(', ') + (gone.length > 1 ? ' are' : ' is') +
      ' struck through: the code did not exist then. Select one anyway and the map explains ' +
      'which code carried this work instead.' : '') +
    (st.year === 2020 ? '  May 2020 is a COVID-affected reference period.' : '');
}

/* The whole selection, in the address bar, so a view of this page can be sent
 * to someone. The router ignores everything after "?", so this is the map
 * view's own state and nothing else reads it. */
function syncHash() {
  if (!st || !st.occ || !A.hashState) return;
  A.hashState.set({
    occ: st.occ.c, g: st.occ.g === 'detailed' ? null : st.occ.g,
    y: st.year, m: st.metric,
    metro: st.metroOn ? 1 : null,
    sel: st.selFips || null
  }, 'map');
}

function setYear(y) {
  st.year = y;
  syncHash();
  renderYearBar();
  paintMap();
  renderRanked();
  renderHeadline();
  renderBanner();
  if (st.nodes.metroNote) st.nodes.metroNote.textContent = metroNoteText();
  renderMetroTable();
}



/* ---------------------------------------------------------------------------
 * 18. Selection / loading
 * ------------------------------------------------------------------------- */
function selectOccupation(occ) {
  var token = ++st.token;
  st.occ = occ;
  st.selFips = null;
  setPickerLabel(occ, true);
  var need = [occ.b];
  var rel = relatedCodes(occ);
  rel.pre.concat(rel.post).forEach(function (o) { if (need.indexOf(o.b) < 0) need.push(o.b); });
  Promise.all(need.map(function (b) {
    return st.bundles[b] ? Promise.resolve(st.bundles[b]) : A.load(b).then(function (j) { st.bundles[b] = j; return j; });
  })).then(function () {
    if (token !== st.token || !st.root) return;
    st.related = rel;
    st.model = buildModel(occ, st.bundles[occ.b]);
    if (!st.model) { setPickerLabel(occ, false, 'not found in ' + occ.b); return; }
    if (st.model.ypOf[st.year] == null && !st.yearFromHash) {
      /* land on a year this code actually has, rather than an empty map */
      st.year = st.model.years[st.model.years.length - 1];
    }
    st.yearFromHash = false;
    st.scale = buildScale(st.model, st.metric);
    if (st.pendingSel) { st.selFips = st.pendingSel; st.pendingSel = null; }
    setPickerLabel(occ, false);
    syncHash();
    refreshMetro(true);
    renderAll();
  }).catch(function (err) {
    if (token !== st.token) return;
    if (window.console) console.error('[view_map] load failed', err);
    setPickerLabel(occ, false, 'could not load ' + occ.b);
  });
}

function setPickerLabel(occ, loading, err) {
  var b = st.nodes.pickerBtn;
  while (b.firstChild) b.removeChild(b.firstChild);
  b.appendChild(E('span', {}, occ.t));
  b.appendChild(E('span', { class: 'm' },
    err ? ('· ' + err) : (loading ? '· loading…' : '· ' + occ.c + ' · ' + yearsLabel(occ) +
      (occ.n != null ? ' · ' + F.compact(occ.n) + ' US jobs' : ''))));
  b.appendChild(E('span', { class: 'cv' }, '▾'));
  if (st.pickerRows) markSelectedOption();
}

function refreshMetro(force) {
  if (!st.metroOn) { st.metro = null; return Promise.resolve(); }
  var token = st.token;
  st.metroMsg = 'loading metro series…';
  if (st.nodes.metroNote) st.nodes.metroNote.textContent = st.metroMsg;
  var p = st.metroIdx ? Promise.resolve(st.metroIdx) : A.load('metro_index').then(function (j) { st.metroIdx = j; return j; });
  return p.then(function (mi) {
    if (token !== st.token) return;
    var entry = null;
    for (var i = 0; i < mi.occ.length; i++) {
      if (mi.occ[i].c === st.occ.c && mi.occ[i].g === st.occ.g) { entry = mi.occ[i]; break; }
    }
    if (!entry) {
      st.metro = null;
      st.metroMsg = st.occ.c + ' is not in the metro menu — OEWS metro files carry 241 of the 967 state codes. ' +
        'All 39 detailed IT codes are present.';
      paintBubbles();
      if (st.nodes.metroNote) st.nodes.metroNote.textContent = st.metroMsg;
      return;
    }
    return (st.metroBundles[entry.b] ? Promise.resolve(st.metroBundles[entry.b])
      : A.load(entry.b).then(function (j) { st.metroBundles[entry.b] = j; return j; })
    ).then(function (bundle) {
      if (token !== st.token) return;
      var row = null;
      for (var k = 0; k < bundle.occ.length; k++) {
        if (bundle.occ[k].c === entry.c && bundle.occ[k].g === entry.g) { row = bundle.occ[k]; break; }
      }
      if (!row) { st.metro = null; st.metroMsg = 'metro series missing from ' + entry.b + '.'; paintBubbles(); return; }
      var tc = {};
      if (row.tc) for (var t = 0; t < row.tc.length; t++) tc[row.tc[t][0] + ':' + row.tc[t][1]] = 1;
      var top = (st.metroIdx.meta && st.metroIdx.meta.topcode && st.metroIdx.meta.topcode.annual) || [];
      st.metro = { entry: entry, row: row, tc: tc, topcode: top };
      st.metroMsg = null;
      paintBubbles();
    });
  }).catch(function (err) {
    if (window.console) console.error('[view_map] metro load failed', err);
    st.metro = null; st.metroMsg = 'metro data failed to load.';
    if (st.nodes.metroNote) st.nodes.metroNote.textContent = st.metroMsg;
  });
}

/* ---------------------------------------------------------------------------
 * 19. Full render
 * ------------------------------------------------------------------------- */
function renderAll() {
  st.scale = buildScale(st.model, st.metric);
  st.nodes.metricWhat.textContent = METRICS[st.metric].what;
  for (var i = 0; i < METRIC_ORDER.length; i++) {
    st.nodes.metricBtns[METRIC_ORDER[i]].classList.toggle('active', METRIC_ORDER[i] === st.metric);
  }
  renderHeadline();
  renderYearBar();
  renderLegend();
  paintMap();
  renderBanner();
  renderRanked();
  renderTrend();
  renderShifts();
}

/* ---------------------------------------------------------------------------
 * 20. Mount
 * ------------------------------------------------------------------------- */
function mount(root) {
  st = freshState();
  st.root = root;
  var token = ++st.token;

  var loading = E('div', { class: 'mv-load' }, 'Loading occupation index, map geometry and the totals bundle…');
  root.appendChild(loading);

  Promise.all([A.load('occ_index'), A.load('geo'), A.load('series_g00')]).then(function (res) {
    if (token !== st.token || !st.root) return;
    st.idx = res[0]; st.geo = res[1]; st.bundles['series_g00'] = res[2];
    st.geoByAbbr = {}; st.geoByFips = {}; st.areaByFips = {};
    for (var i = 0; i < st.geo.states.length; i++) {
      st.geoByAbbr[st.geo.states[i].abbr] = st.geo.states[i];
      st.geoByFips[st.geo.states[i].fips] = st.geo.states[i];
    }
    for (var k = 0; k < st.idx.areas.length; k++) st.areaByFips[st.idx.areas[k].fips] = k;
    st.year = st.idx.years[st.idx.years.length - 1];
    applyHashState();
    if (loading.parentNode) loading.parentNode.removeChild(loading);
    buildShell(root);
    var def = pickDefault();
    selectOccupation(def);
  }).catch(function (err) {
    if (window.console) console.error('[view_map] initial load failed', err);
    loading.textContent = 'Could not load the data payloads. Serve the site with "cd site && python -m http.server 8000" and reload.';
  });
}

/* #map?occ=15-1252&y=2024&m=j&metro=1&sel=06 — restore a shared selection.
 * Anything missing or unrecognised silently falls back to the default. */
function applyHashState() {
  var q = A.hashState ? A.hashState.get() : {};
  if (q.m && METRICS[q.m]) st.metric = q.m;
  var y = parseInt(q.y, 10);
  /* A year the shared link names is honoured even if the code was not published
     in it: that IS a state of this view (the blank map plus its explainer), and
     silently snapping to 2024 would show the recipient something else. */
  if (st.idx.years.indexOf(y) >= 0) { st.year = y; st.yearFromHash = true; }
  st.metroOn = q.metro === '1';
  /* selectOccupation() clears the pinned state on every change, so a pin that
     arrived in the URL is held here and applied once the first series lands. */
  if (q.sel && st.areaByFips[q.sel] != null) st.pendingSel = q.sel;
  return q;
}

function pickDefault() {
  var q = A.hashState ? A.hashState.get() : {};
  var want = q.occ ? [q.occ, q.g || 'detailed'] : ['15-1252', 'detailed'];
  var i, o;
  for (i = 0; i < st.idx.occupations.length; i++) {
    o = st.idx.occupations[i];
    if (o.c === want[0] && o.g === want[1]) return o;
  }
  /* the code exists under a different group, or not at all */
  for (i = 0; i < st.idx.occupations.length; i++) {
    o = st.idx.occupations[i];
    if (o.c === want[0]) return o;
  }
  for (i = 0; i < st.idx.occupations.length; i++) {
    o = st.idx.occupations[i];
    if (o.c === '15-1252' && o.g === 'detailed') return o;
  }
  for (var j = 0; j < st.idx.occupations.length; j++) if (st.idx.occupations[j].g === 'total') return st.idx.occupations[j];
  return st.idx.occupations[0];
}

function buildShell(root) {
  /* #view-root owns the page inset (style.css). This view never touches it. */
  var wrap = E('div', { class: 'mv' });

  /* --- controls ------------------------------------------------------- */
  var pickerBtn = E('button', {
    class: 'mv-picker-btn', type: 'button',
    on: { click: function (ev) { ev.stopPropagation(); st.pickerOpen ? closePicker() : openPicker(); } }
  }, 'Loading…');
  st.nodes.pickerBtn = pickerBtn;
  var picker = E('div', { class: 'mv-picker' }, [pickerBtn, buildPicker()]);

  st.docClick = function (ev) {
    if (!st.pickerOpen) return;
    if (picker.contains(ev.target)) return;
    closePicker();
  };
  document.addEventListener('click', st.docClick);

  var metricBtns = {};
  var metricToggle = E('div', { class: 'mv-toggle color-toggle' }, METRIC_ORDER.map(function (k) {
    var b = E('button', {
      type: 'button', class: k === st.metric ? 'active' : '',
      on: {
        click: function () {
          st.metric = k;
          syncHash();
          st.scale = buildScale(st.model, st.metric);
          st.nodes.metricWhat.textContent = METRICS[k].what;
          for (var q in metricBtns) metricBtns[q].classList.toggle('active', q === k);
          renderLegend(); paintMap(); renderRanked();
        }
      }
    }, METRICS[k].label);
    metricBtns[k] = b;
    return b;
  }));
  st.nodes.metricBtns = metricBtns;

  var metroBtn = E('button', {
    type: 'button',
    on: {
      click: function () {
        st.metroOn = !st.metroOn;
        syncHash();
        metroBtn.classList.toggle('active', st.metroOn);
        st.nodes.metroNote.textContent = st.metroOn ? 'loading…' : '';
        if (st.metroOn) refreshMetro(); else { st.metro = null; paintBubbles(); }
      }
    }
  }, 'Metro areas');
  if (st.metroOn) metroBtn.classList.add('active');
  var metroNote = E('div', { class: 'mv-small', style: { marginTop: '4px' } }, '');
  st.nodes.metroNote = metroNote;
  st.nodes.bubLegend = E('div', { style: { marginTop: '6px' } });
  st.nodes.metroTable = E('div', {});

  var metricWhat = E('div', { class: 'mv-sub', style: { maxWidth: '980px' } }, METRICS[st.metric].what);
  st.nodes.metricWhat = metricWhat;

  wrap.appendChild(E('div', { class: 'mv-card' }, [
    E('div', { class: 'mv-controls' }, [
      E('div', { class: 'mv-field', style: { flex: '1 1 320px' } }, [E('label', { class: 'mv-hd' }, 'Occupation'), picker]),
      E('div', { class: 'mv-field' }, [E('label', { class: 'mv-hd' }, 'Colour by'), metricToggle]),
      E('div', { class: 'mv-field' }, [E('label', { class: 'mv-hd' }, 'Overlay'), E('div', { class: 'mv-toggle color-toggle' }, metroBtn)])
    ]),
    E('div', { style: { marginTop: '10px' } }, metricWhat)
  ]));

  /* --- headline ------------------------------------------------------- */
  st.nodes.headline = E('div', { class: 'mv-card' });
  wrap.appendChild(st.nodes.headline);

  /* --- map + side ----------------------------------------------------- */
  var mapSvg = buildMap();
  st.nodes.bannerHost = E('div', {});
  var yearBar = E('div', { class: 'mv-yearbar' });
  st.slider = A.control.yearSlider(yearBar, {
    years: st.idx.years, value: st.year, missing: [], label: 'Year',
    missingSelectable: true,
    missingTitle: 'this code was not published that year — select it to see which code was',
    intervalMs: 950,
    onChange: function (y) { setYear(y); }
  });
  st.nodes.yearCap = E('div', { class: 'mv-small', style: { marginTop: '6px' } }, '');

  var mapCard = E('div', { class: 'mv-card' }, [
    E('div', { class: 'mv-mapwrap' }, [mapSvg, st.nodes.bannerHost]),
    yearBar,
    st.nodes.yearCap,
    buildLegend(),
    st.nodes.bubLegend,
    metroNote,
    st.nodes.metroTable
  ]);

  st.nodes.rankedCap = E('div', { class: 'mv-small', style: { margin: '4px 0 8px' } }, '');
  st.nodes.rankedBody = E('div', { class: 'mv-scroll' });
  st.nodes.trendBody = E('div', {});
  var sideCard = E('div', {}, [
    E('div', { class: 'mv-card' }, [
      E('div', { class: 'mv-hd' }, 'States ranked'),
      st.nodes.rankedCap,
      st.nodes.rankedBody,
      E('div', { class: 'mv-small', style: { marginTop: '6px' } },
        'Click a row (or a state) to pin it and add its own trend chart below.')
    ]),
    E('div', { class: 'mv-card' }, [
      E('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' } }, [
        E('div', { class: 'mv-hd' }, 'National trend'),
        E('div', { class: 'mv-toggle color-toggle' }, [
          trendBtn('e', 'Employment'), trendBtn('w', 'Median wage')
        ])
      ]),
      st.nodes.trendBody
    ])
  ]);

  wrap.appendChild(E('div', { class: 'mv-grid' }, [mapCard, sideCard]));

  /* --- shifts --------------------------------------------------------- */
  st.nodes.shiftsBody = E('div', {});
  wrap.appendChild(E('div', { class: 'mv-card' }, [
    E('div', { class: 'mv-hd' }, 'Biggest shifts'),
    E('div', { style: { marginTop: '8px' } }, st.nodes.shiftsBody)
  ]));

  /* --- notes ---------------------------------------------------------- */
  wrap.appendChild(notesCard());

  root.appendChild(wrap);

  if (window.ResizeObserver) {
    var t = null, lastW = 0;
    st.ro = new ResizeObserver(function (entries) {
      var w = entries[0] && entries[0].contentRect ? Math.round(entries[0].contentRect.width) : 0;
      if (w === lastW) return;
      lastW = w;
      if (t) clearTimeout(t);
      t = setTimeout(function () { if (st && st.model) { renderTrend(); renderShifts(); } }, 160);
    });
    st.ro.observe(st.nodes.trendBody);
  }
}

function trendBtn(k, label) {
  var b = E('button', {
    type: 'button', class: k === st.trendMetric ? 'active' : '',
    on: {
      click: function () {
        st.trendMetric = k;
        var sib = b.parentNode.children;
        for (var i = 0; i < sib.length; i++) sib[i].classList.remove('active');
        b.classList.add('active');
        renderTrend();
      }
    }
  }, label);
  return b;
}

function notesCard() {
  var idx = st.idx;
  var tcNote = Object.keys(idx.topcode_annual).map(function (y) {
    return y + ' ' + F.usd(idx.topcode_annual[y]);
  });
  var uniq = [];
  tcNote.forEach(function (s) { if (uniq.indexOf(s.split(' ')[1]) < 0) uniq.push(s.split(' ')[1]); });
  return E('div', { class: 'mv-card' }, [
    E('div', { class: 'mv-hd' }, 'What this view does and does not say'),
    E('div', { class: 'mv-notes', style: { marginTop: '8px' } }, [
      E('ul', {}, [
        E('li', {}, [E('b', {}, 'SOC codes break across years.'),
          ' OEWS uses SOC 2010 for May 2018 and SOC 2018 from May 2019, and several 2018-vintage codes were published only combined in 2019–2020. ' +
          'A code with a shorter year list is a renumbering, not a decline. The year ticks under the map show exactly which years the selected code exists, ' +
          'the trend chart breaks rather than sloping across a gap, and predecessor codes are drawn as separate lines.']),
        E('li', {}, [E('b', {}, '"**" is not zero.'),
          ' A state hatched in the missing colour had its estimate withheld by BLS — employment, jobs per 1,000 and location quotient are suppressed together. ' +
          'A flat dark state is different again: OEWS simply published no row for that occupation there that year.']),
        E('li', {}, [E('b', {}, '"#" is a high value, not a missing one.'),
          ' A wage flagged "#" is at or above the BLS annual top code (' + uniq.join(' then ') + ' in this window). ' +
          'It is drawn at the top of the ramp with a hatch and reported as "≥", never as missing.']),
        E('li', {}, [E('b', {}, 'May 2020 is COVID-affected.'),
          ' National employment falls 5.3% from 2019 in the published data. 2019→2020→2021 is not a structural trend.'])
      ]),
      E('ul', {}, [
        E('li', {}, [E('b', {}, 'The map has 52 shapes; OEWS has 54 areas.'),
          ' Guam and the US Virgin Islands are published by OEWS but data/geo_states.json carries no polygon for them, so they appear only in the ranked list, ' +
          'flagged "no map shape". Summing the map will not equal the file’s 54-area total. Alaska, Hawaii and Puerto Rico are insets and are not to scale.']),
        E('li', {}, [E('b', {}, 'State totals ≠ the national figure.'),
          ' BLS rounds every estimate independently, so the state sum differs from the national row by 40–6,130 jobs out of ~150M. ' +
          'The headline figures above come from the national file, not from summing states.']),
        E('li', {}, [E('b', {}, 'Metro location quotient is derived, not published.'),
          ' data/oews_metro.json carries no LQ column, so the bubble tooltip computes (metro occ share) ÷ (national occ share) from that file’s own national block. ' +
          'It follows BLS’s definition but will not match a BLS-published metro LQ exactly. The metro bubbles and the ranked metro table both cover the 241-code metro menu, a subset of the 967 state codes, over 219 areas = 79.1% of 2024 US employment — they never sum to a national total.']),
        E('li', {}, [E('b', {}, 'Source.'),
          ' BLS Occupational Employment and Wage Statistics, May reference period, 2018–2024, state and metropolitan files, ' +
          'via data/oews_state.json, data/oews_national.json and data/oews_metro.json. Geometry from us-atlas / Census cartographic boundary files, ' +
          'projected with d3.geoAlbersUsa into a 975×610 frame.'])
      ])
    ])
  ]);
}

/* ---------------------------------------------------------------------------
 * 21. Teardown
 * ------------------------------------------------------------------------- */
function destroy() {
  if (!st) return;
  st.token++;
  if (st.slider) { try { st.slider.destroy(); } catch (e) { /* ignore */ } st.slider = null; }
  if (st.docClick) document.removeEventListener('click', st.docClick);
  if (st.ro) { try { st.ro.disconnect(); } catch (e) { /* ignore */ } }
  if (A.tooltip && A.tooltip.hide) A.tooltip.hide();
  if (st.root) { while (st.root.firstChild) st.root.removeChild(st.root.firstChild); }
  st = null;
}

A.registerView('map', {
  label: 'Where the jobs are',
  subtitle: 'One occupation across the 50 states, DC and the territories, 2018–2024 — employment, concentration and pay, from the BLS OEWS state, metro and national files.',
  mount: mount,
  destroy: destroy
});

})();
