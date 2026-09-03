/* view_remote.js — "Remote work" view (#remote)
 *
 * Question 2: how has remote work spread, geographically and by occupation?
 *
 * TWO DIFFERENT QUANTITIES live on this page and are never blended into one line:
 *   SUPPLY — ACS 1-year. WORKERS 16+ whose primary way of getting to work was
 *            "worked from home". Annual, lagging, place of residence.
 *            There is NO 2020 file: the Census Bureau never released one.
 *   DEMAND — Indeed Hiring Lab. Share of job POSTINGS (and of job SEARCHES)
 *            whose text mentions remote/hybrid work. Monthly, current, platform only.
 *
 * Everything drawn here comes from site/explore/data/remote.json + geo.json.
 * The few derived numbers (2019 sector baselines, peak months, movers, gap
 * crossings) are derived in this file and their definition is printed beside them.
 *
 * Chrome, colours, formatters, the year slider, the choropleth and the bar list
 * come from app.js so this view is the same product as the other two.
 */
(function () {
  "use strict";

  var A = window.App;
  var E = A.el, S = A.svg, F = A.fmt, C = A.color, U = A.util;

  /* ── constants ───────────────────────────────────────────────────────── */

  var SCALE_MAX = 0.30;          // fixed choropleth domain: 0 → 30%+, never per-year
  var SURFACE = C.surface;       // #0a0a0f — the 2px "gap" colour on marks
  var GHOST = 'rgba(255,255,255,0.26)';

  /* Categorical identity comes from the shared palette (the dataviz default dark
     column). Slots 0-4 for the five ACS occupation groups, slot 6 for the sixth
     (military) group; validated on the #0a0a0f surface: all six checks PASS,
     worst adjacent CVD ΔE 8.4, normal-vision ΔE 19.3, contrast ≥ 3:1. */
  var OCC_SLOTS = [0, 1, 2, 3, 4, 6];
  var C_POST = C.cat(1);         // Indeed: what employers advertise (orange)
  var C_SEARCH = C.cat(0);       // Indeed: what job seekers search for (blue)
  var C_TECH = C.cat(1);         // tech sectors, emphasised
  var C_OTHER = C.ink2;          // every other sector, de-emphasised

  var OCC_SHORT = {
    management_business_science_arts: 'Management, business, science & arts',
    service: 'Service',
    sales_office: 'Sales & office',
    natural_resources_construction_maintenance: 'Natural resources, construction & maintenance',
    production_transportation_material_moving: 'Production, transportation & material moving',
    military_specific: 'Military specific'
  };

  /* Small geographies that are a few pixels on an Albers map. Shown as chips
     on the same colour scale so DC — the biggest story in this dataset — is
     actually readable. */
  var SMALL = ['DC', 'RI', 'DE', 'CT', 'NJ', 'MA', 'MD', 'NH', 'VT', 'PR'];

  /* ── view state ──────────────────────────────────────────────────────── */

  var D = null;            // remote.json
  var G = null;            // geo.json
  var host = null;         // our wrapper inside #view-root
  var mounted = false, token = 0;
  var parts = [];          // disposables (charts, sliders, resize handles)

  var ui = {
    year: null,            // ACS map year
    geo: 'US',             // geography for the occupation chart
    military: false,       // show the 6th ACS occupation group
    moversMode: 'peak',    // 'net' 2019→2024 | 'peak' 2021→2024
    mapTable: false,
    gapCountry: 'US'
  };

  var el = {};             // long-lived nodes we re-render into
  var map = null, yslider = null;

  /* Charts are re-rendered when the user changes geography, country or mode.
     Each render registers its disposables under a group name and the previous
     group is disposed first, so resize observers never pile up. */
  var live = {};
  function group(name, disposable) {
    (live[name] || (live[name] = [])).push(disposable);
  }
  function disposeGroup(name) {
    (live[name] || []).forEach(function (d) { try { d && d.destroy && d.destroy(); } catch (e) { } });
    live[name] = [];
  }
  function disposeAll() { Object.keys(live).forEach(disposeGroup); live = {}; }

  /* ── small helpers ───────────────────────────────────────────────────── */

  function esc(s) { return A.esc(s); }
  function pct(x, dp) { return F.pct(x, dp == null ? 1 : dp); }        // proportion
  function pctRaw(v, dp) { return F.pctRaw(v, dp == null ? 1 : dp); }  // 0-100
  function ppp(x) { return F.pp(x); }                                  // proportion delta
  function ppRaw(v, dp) { return F.ppRaw(v, dp); }                     // pp delta
  function moePP(m, dp) { return m == null ? F.dash : F.dec(m * 100, dp == null ? 2 : dp) + 'pp'; }

  function panel(title, right) {
    var p = E('div', { class: 'panel' });
    if (title) p.appendChild(A.ui.head(title, right));
    return p;
  }
  function note(htmlStr, kind) {
    return E('p', { class: 'note' + (kind ? ' note-' + kind : ''), html: htmlStr });
  }
  function chip(text, warn) { return E('span', { class: 'chip' + (warn ? ' warn' : '') }, text); }
  function legendItem(color, label, shape) {
    var key = shape === 'dot'
      ? E('i', { class: 'lg-key', style: { width: '8px', height: '8px', borderRadius: '50%', background: color } })
      : E('i', { class: 'lg-key', style: { background: color } });
    return E('span', { class: 'lg-item' }, key, label);
  }
  function legendRow(items) {
    var r = E('div', { class: 'chart-legend' });
    items.forEach(function (i) { if (i) r.appendChild(i); });
    return r;
  }
  function clear(n) { return A.clear(n); }
  /* rgba() from a palette hex, for the translucent gap fills and their legend keys */
  function alpha(hex, a) {
    var h = String(hex).replace('#', '');
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return 'rgba(' + parseInt(h.slice(0, 2), 16) + ',' + parseInt(h.slice(2, 4), 16) + ',' +
      parseInt(h.slice(4, 6), 16) + ',' + a + ')';
  }
  function ttFoot(html) { return '<div class="tt-foot">' + html + '</div>'; }
  function ttTitle(t, sub) {
    return '<div class="tt-title">' + esc(t) + '</div>' +
      (sub ? '<div class="tt-sub">' + sub + '</div>' : '');
  }

  /* SVG chart scaffolding shared by the three custom charts here. Same class
     names as App.chart.line, so they inherit the page's chart styling. */
  function chartBox(cls) {
    var box = E('div', { class: 'chart ' + (cls || '') });
    var legend = E('div', { class: 'chart-legend' });
    var plot = E('div', { class: 'chart-plot' });
    var foot = E('div', { class: 'chart-note' });
    box.appendChild(legend); box.appendChild(plot); box.appendChild(foot);
    return { el: box, legend: legend, plot: plot, foot: foot };
  }
  function svgRoot(w, h) {
    return S('svg', { class: 'chart-svg', width: w, height: h, viewBox: '0 0 ' + w + ' ' + h });
  }
  function gridline(x1, y1, x2, y2, color) {
    return S('line', { x1: x1, y1: y1, x2: x2, y2: y2, stroke: color || C.grid, 'stroke-width': 1 });
  }
  function tx(x, y, str, cls, anchor) {
    return S('text', { x: x, y: y, class: cls || 'ax-label', 'text-anchor': anchor || 'start' }, String(str));
  }
  function plotWidth(node, fallback) {
    var w = node && node.clientWidth ? node.clientWidth : 0;
    return Math.max(280, w || fallback || 640);
  }
  function textWidth(str, size) { return String(str).length * size * 0.55; }
  function truncate(str, size, maxPx) {
    if (textWidth(str, size) <= maxPx) return str;
    var keep = Math.max(3, Math.floor(maxPx / (size * 0.55)) - 1);
    return String(str).slice(0, keep).replace(/[\s,&/]+$/, '') + '…';
  }
  function linePath(idxs, X, Y) {
    var d = '';
    for (var i = 0; i < idxs.length; i++) d += (i ? 'L' : 'M') + X(idxs[i]).toFixed(1) + ',' + Y(idxs[i]).toFixed(1);
    return d;
  }
  function niceTop(v, steps) {
    var s = steps || [0.02, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1];
    for (var i = 0; i < s.length; i++) if (v <= s[i]) return s[i];
    return s[s.length - 1];
  }

  /* ── ACS accessors ───────────────────────────────────────────────────── */

  function acs() { return D.acs; }
  function years() { return acs().years; }
  function yi(y) { return years().indexOf(y); }
  function geoName(code) {
    var g = acs().geos.filter(function (x) { return x.c === code; })[0];
    return g ? g.n : code;
  }
  function share(code, i) { var s = acs().state[code]; return s ? s.share[i] : null; }
  function moe(code, i) { var s = acs().state[code]; return s ? s.moe[i] : null; }
  function stateCodes() {
    return acs().geos.filter(function (g) { return g.k === 'state'; }).map(function (g) { return g.c; });
  }
  function missingYears() {
    return years().filter(function (y, i) { return acs().state.US.share[i] == null; });
  }

  /* ── Indeed accessors ────────────────────────────────────────────────── */

  function ind() { return D.indeed; }
  function countryName(cc) {
    var m = ind().countries.filter(function (c) { return c.c === cc; })[0];
    return m ? m.n : cc;
  }
  /* last index a series really has data for: its own declared last month,
     never further than its last non-null value. Nothing is drawn past this. */
  function lastIdx(arr, lastMonth) {
    if (!arr) return -1;
    var li = arr.length - 1;
    if (lastMonth) {
      var k = ind().months.indexOf(lastMonth);
      if (k >= 0) li = Math.min(li, k);
    }
    while (li >= 0 && !A.isNum(arr[li])) li--;
    return li;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     MOUNT
     ═══════════════════════════════════════════════════════════════════════ */

  function mount(root) {
    mounted = true;
    var my = ++token;
    host = E('div', { class: 'rv-root' });
    root.appendChild(host);

    return Promise.all([A.load('remote'), A.load('geo')]).then(function (res) {
      if (!mounted || my !== token) return;
      D = res[0]; G = res[1];
      var ys = years();
      ui.year = ys[ys.length - 1];
      /* #remote?geo=CA&y=2024 — the map view links here with a state already
         chosen, and a reader can send this page with one selected. */
      var q = A.hashState ? A.hashState.get() : {};
      if (q.geo && acs().state[q.geo]) ui.geo = q.geo;
      var qy = parseInt(q.y, 10);
      if (ys.indexOf(qy) >= 0 && acs().state.US.share[ys.indexOf(qy)] != null) ui.year = qy;
      if (q.w === 'net' || q.w === 'peak') ui.moversMode = q.w;
      build();
    }).catch(function (err) {
      if (mounted && my === token) teardown();
      throw err;                       // the shell renders its own error state
    });
  }

  function teardown() {
    disposeAll();
    parts.forEach(function (p) { try { p && p.destroy && p.destroy(); } catch (e) { } });
    parts = [];
    map = null; yslider = null; el = {};
    try { A.tooltip.hide(); } catch (e) { }
    if (host && host.parentNode) host.parentNode.removeChild(host);
    host = null;
  }

  function destroy() { mounted = false; token++; teardown(); }

  /* ═══════════════════════════════════════════════════════════════════════
     PAGE
     ═══════════════════════════════════════════════════════════════════════ */

  function build() {
    clear(host);
    host.appendChild(intro());
    host.appendChild(sectionOne());
    host.appendChild(compareBlock());
    host.appendChild(sectionTwo());
    host.appendChild(sources());
  }

  function bandHead(n, title, sub) {
    return E('div', { class: 'section-head-row' },
      E('h3', { class: 'section-head' }, n + ' · ' + title),
      E('div', { class: 'section-head-right' }, sub));
  }

  function intro() {
    var a = acs(), i = ind();
    var lastYear = years()[years().length - 1];
    var lastMonth = i.months[i.months.length - 1];
    return E('div', { class: 'view-section' },
      note('Two independent measurements sit on this page and they are <b>never combined</b>. ' +
        'The <b>American Community Survey</b> counts <b>workers</b> whose primary way of getting to work was not ' +
        'commuting at all — annual, lagging, through ' + lastYear + ', with <b>no ' + a.years[2] + ' file at all</b>. ' +
        '<b>Indeed Hiring Lab</b> counts <b>job postings</b> (and job searches) whose text mentions remote or hybrid work — ' +
        'monthly, current, through ' + F.month(lastMonth) + '. One is people, one is advertisements: different quantities ' +
        'over different denominators, so a difference between them is not a trend.'));
  }

  /* ── US trajectory strip ─────────────────────────────────────────────── */

  function trajectory() {
    var us = acs().state.US, ys = years();
    var row = E('div', { class: 'stats-row' });
    ys.forEach(function (y, i) {
      var v = us.share[i];
      if (v == null) {
        var t = A.ui.stat(String(y), F.dash, 'no ACS file');
        t.querySelector('.stat-big').style.color = C.ink2;
        row.appendChild(t);
        return;
      }
      var prev = null, prevYear = null;
      for (var j = i - 1; j >= 0; j--) if (us.share[j] != null) { prev = us.share[j]; prevYear = ys[j]; break; }
      row.appendChild(A.ui.stat(String(y), pct(v),
        prev == null ? 'of all workers 16+' : ppp(v - prev) + ' vs ' + prevYear));
    });
    row.appendChild(E('div', {
      class: 'note', style: { flex: '1 1 220px', minWidth: '190px', marginTop: '0', alignSelf: 'center' },
      html: 'US work-from-home share, all workers 16+. The ' + ys[1] + '&rarr;' + ys[3] + ' step spans <b>two survey years</b>: ' +
        'no 1-year file exists for ' + ys[2] + ', so that year is empty everywhere here and is never interpolated.'
    }));
    return row;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 1 — ACS (supply)
     ═══════════════════════════════════════════════════════════════════════ */

  function sectionOne() {
    var sec = E('div', { class: 'view-section' },
      bandHead('1', 'Where people actually work',
        'ACS · supply side · annual · workers 16+ by place of residence'),
      trajectory());

    /* map panel ------------------------------------------------------- */
    var mapPanel = panel('Worked from home, share of workers', 'ACS table B08006');
    el.slider = E('div', { class: 'controls-row' });
    el.mapChart = E('div');
    el.strip = E('div', { style: { marginTop: '10px' } });
    el.mapTable = E('div');

    yslider = A.control.yearSlider(el.slider, {
      years: years(), value: ui.year, missing: missingYears(), label: 'Year',
      missingTitle: 'the ACS 1-year file for this year was never released',
      onChange: function (y) { ui.year = y; syncHash(); refreshYear(); }
    });
    parts.push(yslider);

    mapPanel.appendChild(el.slider);
    mapPanel.appendChild(note(
      '<b>' + missingYears().join(', ') + ' is struck out and cannot be selected.</b> ' +
      'The Census Bureau never released a standard ACS 1-year file for it — pandemic-disrupted collection. ' +
      'The year is not zero, not suppressed and not estimated: it does not exist, and nothing on this page ' +
      'interpolates across it.', 'warn'));
    mapPanel.appendChild(el.mapChart);
    mapPanel.appendChild(el.strip);

    var tableToggle = E('button', {
      class: 'btn', type: 'button', style: { marginTop: '12px' },
      on: {
        click: function () {
          ui.mapTable = !ui.mapTable;
          tableToggle.classList.toggle('active', ui.mapTable);
          renderMapTable();
        }
      }
    }, 'Table view');
    mapPanel.appendChild(tableToggle);
    mapPanel.appendChild(el.mapTable);
    mapPanel.appendChild(note(
      'Source: ACS 1-year, table B08006 (<code>data/acs_wfh_state.json</code>). Share = workers who <i>worked from home</i> ' +
      '÷ all workers 16 and over living in that state. ACS records one <b>primary commute mode</b> for the reference week, ' +
      'so a hybrid worker who commuted on any day counts as a commuter — this undercounts hybrid arrangements. ' +
      'Alaska, Hawaii and Puerto Rico are projection insets and are not to scale. This file carries no Guam or ' +
      'Virgin Islands rows. Colour scale is <b>fixed across every year</b> — never rescaled per year, so the rise ' +
      'and the retreat can be compared.'));

    /* movers panel ---------------------------------------------------- */
    var moversPanel = panel('Biggest movers', 'ACS table B08006');
    el.moversCtl = E('div', { class: 'controls-row' });
    el.moversHead = E('div', { class: 'note', style: { marginTop: '0' } });
    el.movers = E('div');
    var tog = A.ui.toggle([
      { id: 'net', label: years()[1] + ' → ' + years()[6], title: 'net change since before the pandemic' },
      { id: 'peak', label: years()[3] + ' → ' + years()[6], title: 'retreat from the peak year' }
    ], ui.moversMode, function (id) { ui.moversMode = id; syncHash(); renderMovers(); });
    parts.push(tog);
    el.moversCtl.appendChild(tog.el);
    el.stateTrend = E('div');
    moversPanel.appendChild(el.moversCtl);
    moversPanel.appendChild(el.moversHead);
    moversPanel.appendChild(el.movers);
    moversPanel.appendChild(el.stateTrend);
    moversPanel.appendChild(note(
      'Percentage-point change in a state\'s work-from-home share between two ACS years. There is no ' + years()[2] +
      ' file, so no window can start or end there. Bar length runs from zero and the sign is printed. ' +
      'A state is only called risen or fallen when the change exceeds the 90% margin of error on the ' +
      'difference; the two windows differ on exactly this point, which is why the toggle is worth using. ' +
      'Click a row to load that state into the occupation chart and the trend below.'));

    var grid = E('div', { class: 'grid grid-sidebar' }, mapPanel, moversPanel);
    sec.appendChild(grid);

    /* occupation panel ------------------------------------------------ */
    var occPanel = panel('Which kinds of work went remote', 'ACS table B08124');
    el.occCtl = E('div', { class: 'controls-row' });
    el.occ = E('div');
    occPanel.appendChild(el.occCtl);
    occPanel.appendChild(el.occ);
    occPanel.appendChild(note(
      'Source: ACS 1-year, table B08124 (<code>data/acs_wfh_occupation.json</code>). Each line is <i>workers in that ' +
      'occupation group who worked from home</i> ÷ <i>all workers in that group</i> in the selected geography — the ' +
      'lines do not sum to anything, each has its own denominator. The grey line is the same measure over all ' +
      'occupations: the number the map shows. The sixth published group, <i>military specific</i>, is off by default — ' +
      'its counts are tiny and its margin of error frequently exceeds the estimate itself.'));
    sec.appendChild(occPanel);

    /* build the charts once the nodes are in the document */
    setTimeout(function () {
      if (!mounted || !host) return;
      buildMap();
      buildOccControls();
      renderMovers();
      renderOcc();
      renderStrip();
    }, 0);

    return sec;
  }

  /* ── choropleth ──────────────────────────────────────────────────────── */

  function buildMap() {
    map = A.chart.choropleth(el.mapChart, {
      geo: G,
      mode: 'seq',
      domain: [0, SCALE_MAX],
      value: function (s) { return share(s.abbr, yi(ui.year)); },
      format: function (v) { return pct(v); },
      legendTitle: 'Worked from home',
      legendFormat: function (v) { return pct(v, 0) + (v >= SCALE_MAX ? '+' : ''); },
      missingLabel: 'no data',
      maxHeight: 500,
      selected: ui.geo,
      labels: true,
      tooltip: stateTip,
      onClick: function (s) { selectGeo(s.abbr); }
    });
    parts.push(map);
    markOverScale();
    renderUsReadout();
    renderMapTable();
  }

  /* the two state-years above the top of the fixed scale are outlined and named,
     so a clamped value is never mistaken for "the maximum". */
  function overScale() {
    var out = [];
    stateCodes().forEach(function (c) {
      years().forEach(function (y, i) {
        var v = share(c, i);
        if (v != null && v > SCALE_MAX) out.push({ code: c, year: y, v: v });
      });
    });
    return out.sort(function (p, q) { return q.v - p.v; });
  }
  function markOverScale() {
    if (!map) return;
    var i = yi(ui.year);
    G.states.forEach(function (s) {
      var rec = map.states[s.fips];
      if (!rec) return;
      var v = share(s.abbr, i);
      var over = v != null && v > SCALE_MAX;
      rec.path.setAttribute('stroke', over ? '#e0e0e8' : SURFACE);
      rec.path.setAttribute('stroke-width', over ? 1.4 : 0.7);
    });
  }

  function stateTip(s) {
    var i = yi(ui.year), st = acs().state[s.abbr], y = ui.year;
    if (!st) return ttTitle(s.name + ' · ' + y) + '<div class="tt-sub">Not in the ACS state file.</div>';
    if (st.share[i] == null) {
      return ttTitle(s.name + ' · ' + y) +
        '<div class="tt-sub">No ACS 1-year file for ' + y + " — never released, never estimated.</div>";
    }
    var rows = [
      ['Worked from home', F.num(st.wfh[i])],
      ['All workers 16+', F.num(st.total[i])]
    ];
    if (st.share[1] != null) rows.push(['vs ' + years()[1], ppp(st.share[i] - st.share[1])]);
    if (st.share[3] != null) rows.push(['vs ' + years()[3] + ' (peak year)', ppp(st.share[i] - st.share[3])]);
    var over = st.share[i] > SCALE_MAX;
    return ttTitle(s.name + ' · ' + y,
      '<b style="color:#fff;font-size:15px">' + pct(st.share[i]) + '</b> ± ' + moePP(st.moe[i]) + ' (90% MOE)') +
      A.tooltip.rows(rows) +
      ttFoot((over ? 'Above the top of the fixed 0–' + pct(SCALE_MAX, 0) + ' scale: drawn at the top colour and outlined. ' : '') +
        'Denominator: all workers 16+ living in ' + esc(s.name) + '. Click to load this geography into the occupation chart.');
  }

  function renderUsReadout() {
    if (!el.usReadout) {
      el.usReadout = E('div', { class: 'chart-note' });
      el.mapChart.appendChild(el.usReadout);
    }
    var i = yi(ui.year), us = acs().state.US;
    if (us.share[i] == null) {
      el.usReadout.innerHTML = '<b>' + ui.year + ' — no data.</b> Every state is empty because the file does not exist.';
      return;
    }
    var over = overScale();
    el.usReadout.innerHTML =
      'United States, ' + ui.year + ': <b>' + pct(us.share[i]) + '</b> of workers 16+ worked from home (' +
      F.compact(us.wfh[i]) + ' of ' + F.compact(us.total[i]) + ' workers, ±' + moePP(us.moe[i]) + '). ' +
      (us.share[1] != null ? ppp(us.share[i] - us.share[1]) + ' vs ' + years()[1] + '. ' : '') +
      (over.length ? 'Above the top of the scale, outlined on the map: ' +
        over.map(function (o) { return '<b>' + o.code + ' ' + o.year + '</b> ' + pct(o.v); }).join(', ') + '.' : '');
  }

  function refreshYear() {
    if (map) { map.update({ value: function (s) { return share(s.abbr, yi(ui.year)); }, selected: ui.geo }); markOverScale(); }
    renderUsReadout();
    renderStrip();
    renderMapTable();
  }

  function syncHash() {
    if (!A.hashState) return;
    A.hashState.set({ geo: ui.geo === 'US' ? null : ui.geo, y: ui.year, w: ui.moversMode }, 'remote');
  }

  function selectGeo(code) {
    ui.geo = code;
    syncHash();
    if (map) map.setSelected(code);
    if (el.geoSel) el.geoSel.value = code;
    renderStrip();
    renderOcc();
    renderMovers();
  }

  /* ── small-geography chips ───────────────────────────────────────────── */

  function renderStrip() {
    if (!el.strip) return;
    clear(el.strip);
    var i = yi(ui.year);
    el.strip.appendChild(E('div', { class: 'note', style: { marginTop: '0', marginBottom: '6px' } },
      'Small geographies, same colour scale (they are a few pixels on the map)'));
    var row = E('div', { class: 'row', style: { gap: '6px' } });
    SMALL.forEach(function (code) {
      var v = share(code, i);
      var swatch = E('i', {
        style: {
          width: '11px', height: '11px', borderRadius: '2px', display: 'inline-block',
          background: v == null ? C.missing : C.seq(Math.min(1, v / SCALE_MAX)),
          outline: v != null && v > SCALE_MAX ? '1.5px solid #e0e0e8' : 'none'
        }
      });
      var c = E('span', {
        class: 'chip', style: { cursor: 'pointer', color: ui.geo === code ? 'var(--fg)' : null },
        on: { click: function () { selectGeo(code); } }
      }, swatch, E('b', { style: { color: 'var(--fg)', fontWeight: '600' } }, code),
        E('span', null, v == null ? F.dash : pct(v, 0)));
      A.tooltip.bind(c, function () {
        return stateTip({ abbr: code, name: geoName(code), fips: code });
      });
      row.appendChild(c);
    });
    el.strip.appendChild(row);
  }

  /* ── table view (the map's colour-only encoding, in numbers) ─────────── */

  function renderMapTable() {
    if (!el.mapTable) return;
    clear(el.mapTable);
    if (!ui.mapTable) return;
    var i = yi(ui.year), a = acs();
    var rows = stateCodes().map(function (c) {
      return { c: c, n: geoName(c), v: share(c, i), m: moe(c, i), w: a.state[c].wfh[i], t: a.state[c].total[i] };
    }).sort(function (p, q) { return (q.v == null ? -1 : q.v) - (p.v == null ? -1 : p.v); });
    var head = '<tr><th style="text-align:left">Area</th><th>WFH share</th><th>90% MOE</th>' +
      '<th>Worked from home</th><th>All workers 16+</th></tr>';
    function row(n, v, m, w, t, strong) {
      return '<tr' + (strong ? ' class="strong"' : '') + '><td>' + esc(n) + '</td>' +
        '<td>' + (v == null ? F.none('no data') : pct(v)) + '</td>' +
        '<td class="muted">' + moePP(m) + '</td>' +
        '<td>' + F.num(w) + '</td><td class="muted">' + F.num(t) + '</td></tr>';
    }
    var us = a.state.US;
    var body = row('United States', us.share[i], us.moe[i], us.wfh[i], us.total[i], true) +
      rows.map(function (r) { return row(r.n, r.v, r.m, r.w, r.t); }).join('');
    var wrap = E('div', {
      class: 'scroll-x',
      style: {
        maxHeight: '320px', overflowY: 'auto', marginTop: '10px',
        border: '1px solid var(--line-soft)', borderRadius: '6px', padding: '6px 8px'
      },
      html: '<table style="width:100%;border-collapse:collapse;font-size:11.5px;font-variant-numeric:tabular-nums">' +
        '<thead style="color:var(--fg2);text-align:right">' + head + '</thead><tbody>' + body + '</tbody></table>'
    });
    var st = wrap.querySelectorAll('td, th');
    for (var k = 0; k < st.length; k++) {
      st[k].style.padding = '3px 6px';
      if (st[k].tagName === 'TD' && st[k].cellIndex > 0) st[k].style.textAlign = 'right';
    }
    var strongRow = wrap.querySelector('tr.strong');
    if (strongRow) {
      strongRow.style.borderTop = '1px solid var(--line)';
      strongRow.style.borderBottom = '1px solid var(--line)';
      strongRow.firstChild.style.color = 'var(--fg)';
      strongRow.firstChild.style.fontWeight = '600';
    }
    el.mapTable.appendChild(wrap);
    el.mapTable.appendChild(note(
      'Puerto Rico is a state-equivalent in this file but is excluded from ACS national controls — the United States ' +
      'row equals the 50 states + DC exactly. Never add PR into it.'));
  }

  /* ── biggest movers ──────────────────────────────────────────────────── */

  /* The MOE on a DIFFERENCE of two independent ACS estimates: the Census
     Bureau's own rule, sqrt(MOE_a^2 + MOE_b^2). Both inputs are share_moe from
     acs_wfh_state.json and are already in share units, so the result is too.
     Without this the panel would sort 52 states into "rose" and "fell" while
     printing margins of error everywhere else on the page — and five of the
     2021→2024 moves are smaller than their own margin. */
  function diffMoe(m0, m1) {
    if (m0 == null || m1 == null) return null;
    return Math.sqrt(m0 * m0 + m1 * m1);
  }

  function moversData(mode) {
    var from = (mode || ui.moversMode) === 'net' ? 1 : 3, to = 6;
    var out = [];
    stateCodes().forEach(function (c) {
      var v0 = share(c, from), v1 = share(c, to);
      if (v0 == null || v1 == null) return;
      var d = v1 - v0, dm = diffMoe(moe(c, from), moe(c, to));
      out.push({
        code: c, name: geoName(c), d: d, v0: v0, v1: v1,
        m0: moe(c, from), m1: moe(c, to), dm: dm,
        /* +1 rose, -1 fell, 0 = the move is inside its own margin of error */
        cls: (dm == null || Math.abs(d) > dm) ? (d > 0 ? 1 : (d < 0 ? -1 : 0)) : 0
      });
    });
    out.sort(function (p, q) { return q.d - p.d; });
    return { rows: out, from: years()[from], to: years()[to] };
  }

  function renderMovers() {
    if (!el.movers) return;
    var md = moversData(), all = md.rows;
    if (!all.length) return;
    var up = all.filter(function (r) { return r.cls > 0; });
    var down = all.filter(function (r) { return r.cls < 0; });
    var flat = all.filter(function (r) { return r.cls === 0; });
    var maxAbs = Math.max(Math.abs(all[0].d), Math.abs(all[all.length - 1].d));
    var N = 6;

    /* Head count by SIGNIFICANCE, not by sign. Over 2021→2024 the two states
       whose point estimate rose (Wyoming +0.78pp against ±1.50, South Carolina
       +0.62pp against ±0.66) do not clear their own margins, and neither do
       three of the falls — so "50 fell, 2 rose" was a claim the data will not
       carry. Over 2019→2024 every one of the 52 differences does clear it. */
    /* The other window's verdict, so the reading instruction is derived rather
       than asserted: 2019→2024 is statistically clean end to end, 2021→2024 is
       not, and that difference IS the finding. */
    var otherMode = ui.moversMode === 'net' ? 'peak' : 'net';
    var otherMd = moversData(otherMode);
    var otherFlat = otherMd.rows.filter(function (r) { return r.cls === 0; }).length;
    var otherLabel = otherMd.from + '\u2009→\u2009' + otherMd.to;

    var bits = [];
    var flatUp = flat.filter(function (r) { return r.d > 0; }).length;
    function plural(k, one, many) { return k === 1 ? one : many; }
    if (down.length) bits.push('<b>' + down.length + ' of ' + all.length + '</b> fell by more than ' +
      plural(down.length, 'its own margin of error', 'their own margins of error'));
    if (up.length) bits.push('<b>' + (down.length ? up.length : up.length + ' of ' + all.length) +
      '</b> rose by more than ' + plural(up.length, 'its own margin', 'their own margins'));
    if (flat.length) {
      var names = flat.slice().sort(function (a, b) { return b.d - a.d; })
        .map(function (r) { return esc(r.name) + ' ' + ppp(r.d) + ' ± ' + moePP(r.dm, 2); });
      bits.push('<b>' + flat.length + '</b> moved by less than ' +
        plural(flat.length, 'its margin', 'theirs') + ' and cannot be told apart from no change at ' +
        'all (' + names.join(', ') + ')');
    }
    el.moversHead.innerHTML = 'Between ' + md.from + ' and ' + md.to + ', ' + bits.join('; ') + '. ' +
      (flat.length
        ? 'Read that last group as “no measurable move”, not as a small one' +
          (flatUp ? ' — including the ' + flatUp + ' whose point estimate went up.' : '.') +
          (otherFlat === 0 ? ' Over ' + otherLabel + ', by contrast, every one of the ' +
            otherMd.rows.length + ' differences clears its margin.' : '')
        : 'Every one of the ' + all.length + ' differences in this window clears its 90% margin of ' +
          'error, so every position in the ranking is real.' +
          (otherFlat ? ' Switch to ' + otherLabel + ' and ' + otherFlat + ' of them no longer do.' : ''));

    /* Each group holds only rows of one verdict, so a heading can never
       mislabel a value. */
    var groups = [];
    if (up.length) {
      groups.push({
        title: up.length > N ? 'Rose — largest, all clear of the margin' : 'The ' + up.length + ' that rose measurably',
        rows: up.slice(0, N)
      });
    }
    if (down.length) {
      groups.push({
        title: down.length > N ? 'Fell — largest, all clear of the margin' : 'The ' + down.length + ' that fell measurably',
        rows: down.slice(-N).reverse()
      });
    }
    if (flat.length) {
      groups.push({
        title: 'Not distinguishable from no change (' + flat.length + ')',
        rows: flat.slice().sort(function (a, b) { return b.d - a.d; }).slice(0, N)
      });
    }
    if (!groups.length) groups.push({ title: 'Smallest moves', rows: all.slice(-N).reverse() });

    disposeGroup('movers');
    clear(el.movers);
    groups.forEach(function (g) {
      el.movers.appendChild(E('h3', { class: 'section-head', style: { marginTop: '12px' } }, g.title));
      var holder = E('div');
      el.movers.appendChild(holder);
      var chart = A.chart.bars(holder, {
        rows: g.rows.map(function (r) {
          return {
            /* the rail is ~300px: a long name plus its share is truncated, so a
               long name falls back to its postal code (the tooltip has both). */
            label: r.name.length > 16 ? r.code : r.name,
            value: r.d, active: ui.geo === r.code, title: r.name,
            sub: pct(r.v1, 0) + ' now', right: '± ' + moePP(r.dm, 2),
            /* a move inside its own margin gets a neutral bar: colouring it by
               sign would assert a direction the estimate cannot support. */
            color: r.cls === 0 ? 'rgba(255,255,255,0.22)' : null,
            code: r.code, v0: r.v0, v1: r.v1, m0: r.m0, m1: r.m1, dm: r.dm, cls: r.cls
          };
        }),
        diverging: true, max: maxAbs, labelWidth: 130, barHeight: 10,
        valueFormat: function (v) { return ppp(v); },
        onClick: function (d) { selectGeo(d.code); },
        tooltip: function (d) {
          return ttTitle(d.label) + A.tooltip.rows([
            [String(md.from), pct(d.v0) + ' <span class="muted">± ' + moePP(d.m0) + '</span>'],
            [String(md.to), pct(d.v1) + ' <span class="muted">± ' + moePP(d.m1) + '</span>'],
            ['change', ppp(d.value) + ' <span class="muted">± ' + moePP(d.dm, 2) + '</span>']
          ]) + ttFoot((d.cls === 0
            ? '<b>The change is smaller than its own margin of error</b>, so this state cannot be ' +
              'said to have moved. '
            : 'The change is larger than its 90% margin of error. ') +
            'Margin on the difference = √(MOE' + md.from + '² + MOE' + md.to + '²). ' +
            'Click to load this geography into the occupation chart and the trend below.')
        }
      });
      group('movers', chart);
    });
    el.movers.appendChild(E('div', {
      class: 'chart-note',
      html: 'Blue = increase, orange = decrease (the page\'s diverging pair), <b>grey = a move ' +
        'smaller than its own margin of error</b>; the thin rule is zero. ' +
        'The figure on the right is the 90% margin of error <b>on the change</b>, ' +
        'combined as √(MOE² + MOE²) from the two years\' own ACS margins; the grey figure beside each ' +
        'name is that state\'s ' + md.to + ' share. Scale is shared across every list: ' +
        'the longest bar is ' + ppp(maxAbs) + '.'
    }));
    renderStateTrend();
  }

  /* ── the selected state, over the whole ACS window ────────────────────
     The right-hand rail used to stop at the movers list while the map beside it
     ran 500px further down. This fills it with the one chart a reader who has
     just clicked a state wants: that state's own trajectory, with its margin of
     error and the 2020 hole drawn rather than bridged. */
  function renderStateTrend() {
    if (!el.stateTrend) return;
    disposeGroup('stateTrend');
    clear(el.stateTrend);
    var code = ui.geo, stRow = acs().state[code];
    if (!stRow) return;
    var ys = years(), n = ys.length;

    var head = E('div', { class: 'section-head', style: { marginTop: '18px' } },
      'Trend · ' + geoName(code));
    el.stateTrend.appendChild(head);
    var box = chartBox('chart-state');
    el.stateTrend.appendChild(box.el);

    function draw() {
      clear(box.plot);
      var W = plotWidth(box.plot, 320), H = 168;
      var m = { t: 12, r: 12, b: 26, l: 40 };
      var pw = Math.max(100, W - m.l - m.r), ph = H - m.t - m.b;
      var X = function (i) { return m.l + (n === 1 ? pw / 2 : i * pw / (n - 1)); };
      var maxV = 0;
      for (var i = 0; i < n; i++) {
        if (stRow.share[i] != null) maxV = Math.max(maxV, stRow.share[i] + (stRow.moe[i] || 0));
        if (acs().state.US.share[i] != null) maxV = Math.max(maxV, acs().state.US.share[i]);
      }
      var top = niceTop(maxV * 1.06);
      var Y = function (v) { return m.t + ph - (v / top) * ph; };

      var svg = svgRoot(W, H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Work-from-home share over time, ' + geoName(code));
      for (var t = 0; t <= 3; t++) {
        var v = top * t / 3;
        svg.appendChild(gridline(m.l, Y(v), m.l + pw, Y(v)));
        svg.appendChild(tx(m.l - 7, Y(v) + 3.5, pct(v, 0), 'ax-label', 'end'));
      }
      var gapIdx = -1;
      for (var g = 0; g < n; g++) if (stRow.share[g] == null) gapIdx = g;
      if (gapIdx >= 0) {
        var bw = pw / (n - 1) * 0.55;
        svg.appendChild(S('rect', {
          x: X(gapIdx) - bw / 2, y: m.t, width: bw, height: ph,
          fill: 'rgba(255,255,255,0.045)', stroke: 'rgba(255,255,255,0.10)',
          'stroke-width': 1, 'stroke-dasharray': '3 3'
        }));
        var gg = S('g', { transform: 'translate(' + X(gapIdx) + ',' + (m.t + ph / 2) + ') rotate(-90)' });
        gg.appendChild(tx(0, 3.5, 'no ' + ys[gapIdx] + ' file', 'ax-note', 'middle'));
        svg.appendChild(gg);
      }
      ys.forEach(function (yy, i) {
        if (i % 2 && i !== n - 1) return;
        svg.appendChild(tx(X(i), m.t + ph + 15, String(yy).slice(2),
          'ax-label', i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle')));
      });
      svg.appendChild(gridline(m.l, m.t + ph, m.l + pw, m.t + ph, C.axis));

      /* margin-of-error envelope, then the line */
      var col = C.cat(0);
      A.chart.segments(stRow.share, 0, n - 1).forEach(function (seg) {
        var upP = '', dnP = '';
        seg.forEach(function (k, j) {
          var hi = Math.min(top, stRow.share[k] + (stRow.moe[k] || 0));
          var lo = Math.max(0, stRow.share[k] - (stRow.moe[k] || 0));
          upP += (j ? 'L' : 'M') + X(k).toFixed(1) + ',' + Y(hi).toFixed(1);
          dnP = 'L' + X(k).toFixed(1) + ',' + Y(lo).toFixed(1) + dnP;
        });
        svg.appendChild(S('path', { d: upP + dnP + 'Z', fill: col, 'fill-opacity': 0.18, stroke: 'none' }));
      });
      if (code !== 'US') {
        A.chart.segments(acs().state.US.share, 0, n - 1).forEach(function (seg) {
          svg.appendChild(S('path', {
            d: linePath(seg, X, function (k) { return Y(acs().state.US.share[k]); }),
            fill: 'none', stroke: C.ink2, 'stroke-width': 1.4, 'stroke-dasharray': '3 3'
          }));
        });
      }
      A.chart.segments(stRow.share, 0, n - 1).forEach(function (seg) {
        svg.appendChild(S('path', {
          d: linePath(seg, X, function (k) { return Y(stRow.share[k]); }),
          fill: 'none', stroke: col, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }));
      });
      for (var q = 0; q < n; q++) {
        if (stRow.share[q] == null) continue;
        var dot = S('circle', { cx: X(q), cy: Y(stRow.share[q]), r: 3.2, fill: col, stroke: SURFACE, 'stroke-width': 1.5 });
        (function (k) {
          dot.addEventListener('pointerenter', function (ev) {
            A.tooltip.show(ttTitle(geoName(code) + ' · ' + ys[k],
              '<b style="color:#fff;font-size:15px">' + pct(stRow.share[k]) + '</b> ± ' +
              moePP(stRow.moe[k]) + ' (90% MOE)') +
              A.tooltip.rows([['Worked from home', F.num(stRow.wfh[k])],
                              ['All workers 16+', F.num(stRow.total[k])]]),
              ev.clientX, ev.clientY);
          });
          dot.addEventListener('pointerleave', A.tooltip.hide);
        })(q);
        svg.appendChild(dot);
      }
      box.plot.appendChild(svg);
    }
    draw();
    var off = U.onResize(box.plot, draw);
    group('stateTrend', { destroy: off });
    box.foot.innerHTML = 'Solid: ' + esc(geoName(code)) + ', with its 90% margin of error shaded. ' +
      (code === 'US' ? '' : 'Dashed grey: the United States, for reference. ') +
      'The ' + years()[2] + ' column is empty because no ACS 1-year file exists — it is drawn, not bridged.';
  }

  /* ── WFH by ACS occupation group ─────────────────────────────────────── */

  function buildOccControls() {
    clear(el.occCtl);
    var sel = E('select', { class: 'picker-input', style: { minWidth: '220px' }, 'aria-label': 'Geography' });
    acs().geos.forEach(function (g) {
      var o = E('option', { value: g.c }, g.n);
      if (g.c === ui.geo) o.selected = true;
      sel.appendChild(o);
    });
    sel.addEventListener('change', function () { selectGeo(sel.value); });
    el.geoSel = sel;

    var milBtn = E('button', {
      class: 'btn' + (ui.military ? ' active' : ''), type: 'button',
      title: 'A real B08124 group with tiny counts and a margin of error that often exceeds the estimate',
      on: {
        click: function () {
          ui.military = !ui.military;
          milBtn.classList.toggle('active', ui.military);
          renderOcc();
        }
      }
    }, 'Show military-specific group');

    el.occCtl.appendChild(E('span', { class: 'ys-label' }, 'Geography'));
    el.occCtl.appendChild(E('div', { class: 'picker' }, sel));
    el.occCtl.appendChild(milBtn);
    el.occCtl.appendChild(E('span', { class: 'note', style: { marginTop: '0' } }, '← or click a state on the map'));
  }

  function renderOcc() {
    if (!el.occ) return;
    disposeGroup('occ');
    clear(el.occ);
    var bo = acs().by_occupation[ui.geo];
    if (!bo) { el.occ.appendChild(A.ui.empty('No occupation data for this geography.')); return; }

    var box = chartBox('chart-occ');
    el.occ.appendChild(box.el);

    var groups = acs().occupations.map(function (o, i) {
      return { key: o.key, label: OCC_SHORT[o.key] || o.label, i: i, color: C.cat(OCC_SLOTS[i]) };
    }).filter(function (g) { return ui.military || g.key !== 'military_specific'; });

    groups.forEach(function (g) { box.legend.appendChild(legendItem(g.color, g.label)); });
    box.legend.appendChild(legendItem(C.ink2, 'All occupations (the map\'s number)'));

    var ys = years(), n = ys.length;
    var idxAll = []; for (var q = 0; q < n; q++) idxAll.push(q);
    var gapIdx = -1;
    for (var gi = 0; gi < n; gi++) if (bo.all.share[gi] == null) gapIdx = gi;

    function draw() {
      clear(box.plot);
      var W = plotWidth(box.plot, 900), H = 330;
      var wide = W > 620;
      var m = { t: 16, r: wide ? Math.min(300, Math.max(170, W * 0.27)) : 16, b: 32, l: 46 };
      var pw = Math.max(120, W - m.l - m.r), ph = H - m.t - m.b;
      var X = function (i) { return m.l + (n === 1 ? pw / 2 : i * pw / (n - 1)); };

      var maxV = 0;
      groups.forEach(function (g) {
        for (var y = 0; y < n; y++) {
          var s = bo.share[y] && bo.share[y][g.i], mo = bo.moe[y] && bo.moe[y][g.i];
          if (s != null) maxV = Math.max(maxV, s + (mo || 0));
        }
      });
      for (var y2 = 0; y2 < n; y2++) if (bo.all.share[y2] != null) maxV = Math.max(maxV, bo.all.share[y2]);
      var top = niceTop(maxV * 1.04);
      var Y = function (v) { return m.t + ph - (v / top) * ph; };

      var svg = svgRoot(W, H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Work-from-home share by occupation group, ' + geoName(ui.geo));

      for (var t = 0; t <= 5; t++) {
        var v = top * t / 5;
        svg.appendChild(gridline(m.l, Y(v), m.l + pw, Y(v)));
        svg.appendChild(tx(m.l - 8, Y(v) + 3.5, pct(v, 0), 'ax-label', 'end'));
      }

      /* the 2020 hole, drawn as a band in the plot itself */
      if (gapIdx >= 0) {
        var bw = pw / (n - 1) * 0.6;
        svg.appendChild(S('rect', {
          x: X(gapIdx) - bw / 2, y: m.t, width: bw, height: ph,
          fill: 'rgba(255,255,255,0.045)', stroke: 'rgba(255,255,255,0.10)',
          'stroke-width': 1, 'stroke-dasharray': '3 3'
        }));
        var g1 = S('g', { transform: 'translate(' + X(gapIdx) + ',' + (m.t + ph / 2) + ') rotate(-90)' });
        g1.appendChild(tx(0, 4, 'no ACS 1-year file for ' + ys[gapIdx], 'ax-note', 'middle'));
        svg.appendChild(g1);
      }

      ys.forEach(function (yy, i) {
        var t2 = tx(X(i), m.t + ph + 16, String(yy), 'ax-label', i === 0 ? 'start' : (i === n - 1 ? 'end' : 'middle'));
        if (bo.all.share[i] == null) t2.setAttribute('opacity', '0.5');
        svg.appendChild(t2);
      });
      svg.appendChild(gridline(m.l, m.t + ph, m.l + pw, m.t + ph, C.axis));

      /* margin-of-error envelopes, under the lines */
      groups.forEach(function (g) {
        var vals = [], mos = [];
        for (var i = 0; i < n; i++) {
          vals.push(bo.share[i] ? bo.share[i][g.i] : null);
          mos.push(bo.moe[i] ? bo.moe[i][g.i] : null);
        }
        A.chart.segments(vals, 0, n - 1).forEach(function (seg) {
          var up = '', dn = '';
          seg.forEach(function (k, j) {
            var hi = Math.min(top, vals[k] + (mos[k] || 0)), lo = Math.max(0, vals[k] - (mos[k] || 0));
            up += (j ? 'L' : 'M') + X(k).toFixed(1) + ',' + Y(hi).toFixed(1);
            dn = 'L' + X(k).toFixed(1) + ',' + Y(lo).toFixed(1) + dn;
          });
          svg.appendChild(S('path', { d: up + dn + 'Z', fill: g.color, 'fill-opacity': 0.16, stroke: 'none' }));
        });
      });

      /* all-occupations reference line (context, neutral ink) */
      A.chart.segments(bo.all.share, 0, n - 1).forEach(function (seg) {
        svg.appendChild(S('path', {
          d: linePath(seg, X, function (k) { return Y(bo.all.share[k]); }),
          fill: 'none', stroke: C.ink2, 'stroke-width': 1.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
        }));
      });

      var labels = [];
      groups.forEach(function (g) {
        var vals = [];
        for (var i = 0; i < n; i++) vals.push(bo.share[i] ? bo.share[i][g.i] : null);
        A.chart.segments(vals, 0, n - 1).forEach(function (seg) {
          svg.appendChild(S('path', {
            d: linePath(seg, X, function (k) { return Y(vals[k]); }),
            fill: 'none', stroke: g.color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
          }));
        });
        var li = U.lastIndex(vals);
        if (li >= 0) {
          /* the end dot is the label's anchor when there is no room to direct-label */
          if (!wide) svg.appendChild(S('circle', { cx: X(li), cy: Y(vals[li]), r: 4, fill: g.color, stroke: SURFACE, 'stroke-width': 2 }));
          labels.push({ y: Y(vals[li]), y0: Y(vals[li]), x: X(li), color: g.color, label: g.label, v: vals[li] });
        }
      });
      var la = U.lastIndex(bo.all.share);
      if (la >= 0) {
        labels.push({
          y: Y(bo.all.share[la]), y0: Y(bo.all.share[la]), x: X(la),
          color: C.ink2, label: 'All occupations', v: bo.all.share[la], ctx: true
        });
      }

      if (wide) {
        labels.sort(function (p, q2) { return p.y - q2.y; });
        var prev = -Infinity;
        labels.forEach(function (l) { l.y = Math.max(l.y, prev + 15); prev = l.y; });
        var over = labels.length ? labels[labels.length - 1].y - (m.t + ph) : 0;
        if (over > 0) labels.forEach(function (l) { l.y -= over; });
        var lx = m.l + pw + 10, gutter = W - lx - 4;
        labels.forEach(function (l) {
          if (Math.abs(l.y - l.y0) > 1.5) {
            svg.appendChild(S('path', {
              d: 'M' + (l.x + 4) + ',' + l.y0.toFixed(1) + 'L' + (lx - 5) + ',' + l.y.toFixed(1),
              fill: 'none', stroke: 'rgba(255,255,255,0.22)', 'stroke-width': 1
            }));
          }
          svg.appendChild(S('circle', { cx: lx - 2, cy: l.y, r: 2.6, fill: l.color }));
          var head = pct(l.v) + '  ';
          var t3 = tx(lx + 5, l.y + 3.5, head + truncate(l.label, 11, gutter - 14 - textWidth(head, 11)), 'ax-direct');
          if (l.ctx) t3.setAttribute('fill', C.ink2);
          svg.appendChild(t3);
        });
      }

      /* hover: nearest year column */
      var hoverG = S('g', null);
      svg.appendChild(hoverG);
      var ov = S('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', style: { cursor: 'crosshair' } });
      function at(ev) {
        var r = svg.getBoundingClientRect(), scale = r.width ? W / r.width : 1;
        var px = (ev.clientX - r.left) * scale;
        return Math.max(0, Math.min(n - 1, Math.round((px - m.l) / (pw / (n - 1)))));
      }
      function move(ev) {
        var i = at(ev);
        clear(hoverG);
        hoverG.appendChild(S('line', { x1: X(i), x2: X(i), y1: m.t, y2: m.t + ph, stroke: 'rgba(255,255,255,0.28)', 'stroke-width': 1 }));
        var html;
        if (bo.all.share[i] == null) {
          html = ttTitle(geoName(ui.geo) + ' · ' + ys[i]) +
            '<div class="tt-sub">No ACS 1-year file for ' + ys[i] + '. Nothing is estimated here.</div>';
        } else {
          var pairs = [], colors = [];
          groups.forEach(function (g) {
            var s = bo.share[i][g.i], mo = bo.moe[i][g.i];
            hoverG.appendChild(S('circle', { cx: X(i), cy: Y(s), r: 4, fill: g.color, stroke: SURFACE, 'stroke-width': 2 }));
            pairs.push([g.label, pct(s) + ' <span class="muted">± ' + moePP(mo) + '</span>']);
            colors.push(g.color);
          });
          pairs.push(['All occupations', pct(bo.all.share[i])]);
          colors.push(C.ink2);
          html = A.tooltip.rows(pairs, { title: geoName(ui.geo) + ' · ' + ys[i], colors: colors }) +
            ttFoot('Share of the workers in each group who worked from home. 90% margin of error.');
        }
        A.tooltip.show(html, ev.clientX, ev.clientY);
      }
      ov.addEventListener('pointermove', move);
      ov.addEventListener('pointerenter', move);
      ov.addEventListener('pointerleave', function () { clear(hoverG); A.tooltip.hide(); });
      svg.appendChild(ov);
      box.plot.appendChild(svg);
    }

    draw();
    var off = U.onResize(box.plot, draw);
    group('occ', { destroy: off });

    /* the point of the envelopes, in words, for the selected geography */
    var last = n - 1, widest = null;
    groups.forEach(function (g) {
      var mo = bo.moe[last] ? bo.moe[last][g.i] : null;
      if (mo != null && (!widest || mo > widest.m)) widest = { m: mo, g: g, s: bo.share[last][g.i] };
    });
    if (widest) {
      box.foot.innerHTML = 'Shaded band = ± the 90% margin of error. In <b>' + esc(geoName(ui.geo)) + ' ' + ys[last] +
        '</b> the widest is <b>' + esc(widest.g.label) + '</b> at ' + pct(widest.s) + ' ± ' + moePP(widest.m) +
        '. Pick a small state to see how imprecise these estimates become.';
    }
  }

  /* ═══════════════════════════════════════════════════════════════════════
     THE TWO MEASUREMENTS
     ═══════════════════════════════════════════════════════════════════════ */

  function compareBlock() {
    var a = acs(), i = ind(), last = years().length - 1;
    var lastMonth = i.months[i.months.length - 1];
    var usPost = i.series.remote_postings.US;
    var lastPost = usPost[U.lastIndex(usPost)];

    function col(title, tag, rows) {
      var p = panel(null);
      p.appendChild(E('div', { class: 'row', style: { marginBottom: '10px' } },
        chip(tag), E('b', { style: { fontSize: '13px' } }, title)));
      var kv = E('div', { class: 'kv' });
      rows.forEach(function (r) {
        kv.appendChild(E('span', { class: 'k' }, r[0]));
        kv.appendChild(E('span', { class: 'v', html: r[1] }));
      });
      p.appendChild(kv);
      return p;
    }
    var sec = E('div', { class: 'view-section' },
      /* grid-even: these two cards are a deliberate side-by-side comparison, so
         matched heights help rather than hurt. */
      E('div', { class: 'grid grid-2 grid-even' },
        col('Where people work', 'ACS · supply', [
          ['Counts', 'workers 16 and over'],
          ['Measures', 'primary commute mode was “worked from home”'],
          ['Denominator', 'all workers in that geography or group'],
          ['Cadence', 'annual 1-year estimates, lagging'],
          ['Coverage', 'US, 50 states, DC, PR — <b>no ' + a.years[2] + '</b>'],
          ['Latest', '<b>' + pct(a.state.US.share[last]) + '</b> (' + years()[last] + ')']
        ]),
        col('What employers advertise', 'Indeed · demand', [
          ['Counts', 'job postings on Indeed'],
          ['Measures', 'posting text mentions remote <i>or hybrid</i> work'],
          ['Denominator', 'all postings, remote and non-remote'],
          ['Cadence', 'monthly mean of a 7-day trailing average'],
          ['Coverage', '10 countries, platform only — not a labour force'],
          ['Latest', '<b>' + pctRaw(lastPost) + '</b> (' + F.month(lastMonth) + ', US)']
        ])),
      note('These two numbers must not be compared with each other. ' + pct(a.state.US.share[last]) + ' of <i>workers</i> in ' +
        years()[last] + ' and ' + pctRaw(lastPost) + ' of <i>postings</i> in ' + F.month(lastMonth) +
        ' measure different things, over different denominators, in different years. Read each series against ' +
        '<b>its own history</b>, never against the other.'));
    return sec;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 2 — Indeed (demand)
     ═══════════════════════════════════════════════════════════════════════ */

  function sectionTwo() {
    var sec = E('div', { class: 'view-section' },
      bandHead('2', 'What employers advertise',
        'Indeed Hiring Lab · demand side · monthly · share of postings and of searches'));

    var gapPanel = panel('Remote in job postings vs in job searches', 'Indeed remote-tracker');
    el.gapCtl = E('div', { class: 'controls-row' });
    el.gap = E('div');
    gapPanel.appendChild(el.gapCtl);
    gapPanel.appendChild(el.gap);
    gapPanel.appendChild(note(
      'Source: Indeed Hiring Lab remote-tracker (<code>data/indeed_remote.json</code>). <b>Postings</b> = share of all job ' +
      'postings in that country whose text mentions remote, hybrid or flexible work. <b>Searches</b> = share of ' +
      'job-seeker searches containing the same terms. Different denominators, so the levels are not strictly ' +
      'commensurable — the movement of the gap is the signal. Indeed lumps hybrid in with fully remote, and a mention ' +
      'is not proof the job is performed remotely. Both series are monthly means of an upstream 7-day trailing average; ' +
      'Indeed changed its seasonal-adjustment method in November 2024 and <b>revised history</b>, so the most recent ' +
      'months are the most revision-prone. Each line stops at its own last observed month, read from ' +
      '<code>series_last_month</code>.'));
    sec.appendChild(gapPanel);

    var sectorPanel = panel('Remote share by Indeed sector (US)', 'Indeed remote-tracker');
    el.sector = E('div');
    sectorPanel.appendChild(el.sector);
    sectorPanel.appendChild(note(
      'Each row: the share of that sector\'s US postings mentioning remote/hybrid work in its <b>2019 average</b> ' +
      '(derived here as the mean of that year\'s monthly values), at its <b>peak month</b>, and in its <b>last observed ' +
      'month</b>. Indeed sectors are built on normalised job titles — <b>not SOC and not NAICS</b> — so they cannot be ' +
      'joined to the OEWS/OOH occupations on the other tabs. The tech flag is the file\'s own <code>tech</code> field. ' +
      'This series was expected to be discontinued after 26 May 2023; in this retrieval it is not, so the view reads ' +
      'each series\' true end month from the data rather than assuming one, and draws nothing past it.'));

    var countryPanel = panel('Is the retreat a US phenomenon?', 'Indeed remote-tracker');
    el.countries = E('div');
    countryPanel.appendChild(el.countries);
    countryPanel.appendChild(note(
      'One panel per country that Indeed publishes a remote-postings series for, on a shared axis, each drawn only to ' +
      'its own last observed month. Country coverage differs by series (postings 7, searches 8, AI postings 9). ' +
      'Indeed\'s share of national hiring differs by country, so cross-country <i>levels</i> are weaker evidence than ' +
      'each country\'s own shape.'));

    sec.appendChild(E('div', { class: 'grid grid-2' }, sectorPanel, countryPanel));

    setTimeout(function () {
      if (!mounted || !host) return;
      buildGapControls();
      renderGap();
      renderSector();
      renderCountries();
    }, 0);
    return sec;
  }

  /* ── postings vs searches: the gap ───────────────────────────────────── */

  function buildGapControls() {
    clear(el.gapCtl);
    var i = ind();
    var items = i.countries.filter(function (c) {
      return i.series.remote_postings[c.c] && i.series.remote_searches[c.c];
    }).map(function (c) { return { id: c.c, label: c.n }; });
    var tog = A.ui.toggle(items, ui.gapCountry, function (id) { ui.gapCountry = id; renderGap(); });
    parts.push(tog);
    el.gapCtl.appendChild(E('span', { class: 'ys-label' }, 'Country'));
    el.gapCtl.appendChild(tog.el);
  }

  function renderGap() {
    if (!el.gap) return;
    disposeGroup('gap');
    clear(el.gap);
    var i = ind(), cc = ui.gapCountry, months = i.months;
    var post = i.series.remote_postings[cc], srch = i.series.remote_searches[cc];
    if (!post && !srch) { el.gap.appendChild(A.ui.empty('No Indeed remote series for this country.')); return; }
    var lp = lastIdx(post, i.series_last_month.remote_postings[cc]);
    var ls = lastIdx(srch, i.series_last_month.remote_searches[cc]);

    var box = chartBox('chart-gap');
    el.gap.appendChild(box.el);
    box.legend.appendChild(legendItem(C_POST, 'share of postings mentioning remote/hybrid'));
    box.legend.appendChild(legendItem(C_SEARCH, 'share of searches mentioning remote/hybrid'));
    box.legend.appendChild(legendItem(alpha(C_SEARCH, 0.4), 'seekers ahead of employers'));
    box.legend.appendChild(legendItem(alpha(C_POST, 0.4), 'employers ahead of seekers'));

    var n = months.length;
    function draw() {
      clear(box.plot);
      var W = plotWidth(box.plot, 900), H = 320;
      var wide = W > 560;
      var m = { t: 14, r: wide ? 128 : 14, b: 30, l: 44 };
      var pw = Math.max(120, W - m.l - m.r), ph = H - m.t - m.b;
      var maxV = 0;
      for (var k = 0; k <= Math.max(lp, ls); k++) {
        if (post && k <= lp && A.isNum(post[k])) maxV = Math.max(maxV, post[k]);
        if (srch && k <= ls && A.isNum(srch[k])) maxV = Math.max(maxV, srch[k]);
      }
      var top = Math.max(2, Math.ceil((maxV * 1.06) / 2) * 2);
      var X = function (j) { return m.l + j * pw / (n - 1); };
      var Y = function (v) { return m.t + ph - (v / top) * ph; };

      var svg = svgRoot(W, H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Remote share of postings and of searches, ' + countryName(cc));
      for (var t = 0; t <= top; t += 2) {
        svg.appendChild(gridline(m.l, Y(t), m.l + pw, Y(t)));
        svg.appendChild(tx(m.l - 8, Y(t) + 3.5, t + '%', 'ax-label', 'end'));
      }
      months.forEach(function (mo, j) {
        if (mo.slice(5) !== '01') return;
        svg.appendChild(gridline(X(j), m.t, X(j), m.t + ph, 'rgba(255,255,255,0.05)'));
        svg.appendChild(tx(X(j), m.t + ph + 16, mo.slice(0, 4), 'ax-label', 'middle'));
      });
      svg.appendChild(gridline(m.l, m.t + ph, m.l + pw, m.t + ph, C.axis));

      /* the gap itself: one filled band between the lines, coloured by which
         side is on top, split at every crossing. */
      if (post && srch) {
        var lb = Math.min(lp, ls), pts = [];
        for (var z = 0; z <= lb; z++) {
          pts.push(A.isNum(post[z]) && A.isNum(srch[z])
            ? { x: X(z), pv: post[z], sv: srch[z], py: Y(post[z]), sy: Y(srch[z]) } : null);
        }
        var run = [];
        function emit(poly) {
          if (poly.length < 2) return;
          var sum = 0, cnt = 0;
          poly.forEach(function (p) { if (!p.cross) { sum += p.sv - p.pv; cnt++; } });
          if (!cnt) return;
          var d = '';
          poly.forEach(function (p, j) { d += (j ? 'L' : 'M') + p.x.toFixed(1) + ',' + p.sy.toFixed(1); });
          for (var q = poly.length - 1; q >= 0; q--) d += 'L' + poly[q].x.toFixed(1) + ',' + poly[q].py.toFixed(1);
          svg.appendChild(S('path', {
            d: d + 'Z', fill: sum > 0 ? C_SEARCH : C_POST, 'fill-opacity': 0.2, stroke: 'none'
          }));
        }
        function flush() {
          if (run.length >= 2) {
            var seq = [];
            for (var j = 0; j < run.length; j++) {
              seq.push(run[j]);
              if (j < run.length - 1) {
                var d1 = run[j].sv - run[j].pv, d2 = run[j + 1].sv - run[j + 1].pv;
                if ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) {
                  var f = d1 / (d1 - d2);
                  var xx = run[j].x + (run[j + 1].x - run[j].x) * f;
                  var yy = run[j].py + (run[j + 1].py - run[j].py) * f;
                  seq.push({ x: xx, py: yy, sy: yy, pv: 0, sv: 0, cross: true });
                }
              }
            }
            var poly = [seq[0]];
            for (var q2 = 1; q2 < seq.length; q2++) {
              poly.push(seq[q2]);
              if (seq[q2].cross || q2 === seq.length - 1) { emit(poly); poly = [seq[q2]]; }
            }
          }
          run = [];
        }
        pts.forEach(function (p) { if (p) run.push(p); else flush(); });
        flush();
      }

      var ends = [];
      function series(arr, li, color, label) {
        if (!arr || li < 0) return;
        var idxs = []; for (var j = 0; j <= li; j++) idxs.push(j);
        A.chart.segments(arr, 0, li).forEach(function (seg) {
          svg.appendChild(S('path', {
            d: linePath(seg, X, function (k) { return Y(arr[k]); }),
            fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round'
          }));
        });
        if (!wide) svg.appendChild(S('circle', { cx: X(li), cy: Y(arr[li]), r: 4, fill: color, stroke: SURFACE, 'stroke-width': 2 }));
        ends.push({ y: Y(arr[li]), color: color, label: label, v: arr[li], m: months[li] });
      }
      series(post, lp, C_POST, 'postings');
      series(srch, ls, C_SEARCH, 'searches');

      if (wide) {
        ends.sort(function (p, q) { return p.y - q.y; });
        if (ends.length === 2 && ends[1].y - ends[0].y < 26) ends[1].y = ends[0].y + 26;
        ends.forEach(function (e) {
          var lx = m.l + pw + 10;
          svg.appendChild(S('circle', { cx: lx - 2, cy: e.y, r: 2.6, fill: e.color }));
          svg.appendChild(tx(lx + 5, e.y + 3.5, pctRaw(e.v) + ' ' + e.label, 'ax-direct'));
          svg.appendChild(tx(lx + 5, e.y + 16, F.month(e.m), 'ax-note'));
        });
      }

      var hoverG = S('g', null);
      svg.appendChild(hoverG);
      var ov = S('rect', { x: m.l, y: m.t, width: pw, height: ph, fill: 'transparent', style: { cursor: 'crosshair' } });
      function move(ev) {
        var r = svg.getBoundingClientRect(), scale = r.width ? W / r.width : 1;
        var j = Math.max(0, Math.min(n - 1, Math.round(((ev.clientX - r.left) * scale - m.l) / (pw / (n - 1)))));
        clear(hoverG);
        hoverG.appendChild(S('line', { x1: X(j), x2: X(j), y1: m.t, y2: m.t + ph, stroke: 'rgba(255,255,255,0.28)', 'stroke-width': 1 }));
        var pv = post && j <= lp ? post[j] : null, sv = srch && j <= ls ? srch[j] : null;
        if (A.isNum(pv)) hoverG.appendChild(S('circle', { cx: X(j), cy: Y(pv), r: 4, fill: C_POST, stroke: SURFACE, 'stroke-width': 2 }));
        if (A.isNum(sv)) hoverG.appendChild(S('circle', { cx: X(j), cy: Y(sv), r: 4, fill: C_SEARCH, stroke: SURFACE, 'stroke-width': 2 }));
        var pairs = [
          ['Postings mentioning remote', A.isNum(pv) ? pctRaw(pv) : F.none('no data')],
          ['Searches mentioning remote', A.isNum(sv) ? pctRaw(sv) : F.none('no data')]
        ];
        var colors = [C_POST, C_SEARCH];
        if (A.isNum(pv) && A.isNum(sv)) {
          pairs.push(['Gap', ppRaw(sv - pv, 2) + ' ' + (sv > pv ? 'seekers ahead' : 'employers ahead')]);
          colors.push(null);
        }
        A.tooltip.show(
          A.tooltip.rows(pairs, { title: F.month(months[j]) + ' · ' + countryName(cc), colors: colors }) +
          ttFoot('Two different denominators: share of postings, and share of searches. The gap moves; the levels are not commensurable.'),
          ev.clientX, ev.clientY);
      }
      ov.addEventListener('pointermove', move);
      ov.addEventListener('pointerenter', move);
      ov.addEventListener('pointerleave', function () { clear(hoverG); A.tooltip.hide(); });
      svg.appendChild(ov);
      box.plot.appendChild(svg);
    }
    draw();
    group('gap', { destroy: U.onResize(box.plot, draw) });

    /* data-derived reading of the gap */
    if (post && srch) {
      var lb = Math.min(lp, ls);
      var latest = srch[lb] - post[lb];
      var flips = 0, best = -Infinity, bestM = null;
      for (var f = 0; f <= lb; f++) {
        if (!A.isNum(post[f]) || !A.isNum(srch[f])) continue;
        var d = srch[f] - post[f];
        if (d > best) { best = d; bestM = months[f]; }
        if (f > 0 && A.isNum(post[f - 1]) && A.isNum(srch[f - 1])) {
          var d0 = srch[f - 1] - post[f - 1];
          if ((d0 > 0) !== (d > 0)) flips++;
        }
      }
      box.foot.innerHTML =
        'In <b>' + F.month(months[lb]) + '</b> the gap is <b>' + ppRaw(latest, 2) + '</b> — ' +
        (latest >= 0
          ? 'seekers are searching for remote more often than employers are advertising it.'
          : 'employers are advertising remote more often than seekers are searching for it.') +
        (bestM ? (best > 0
          ? ' Seeker interest ran furthest ahead in <b>' + F.month(bestM) + '</b> (' + ppRaw(best, 2) + ').'
          : ' Seekers never ran ahead here; the gap was narrowest in <b>' + F.month(bestM) + '</b> (' + ppRaw(best, 2) + ').') : '') +
        (flips === 0 ? ' The two lines never cross over the observed span.'
          : ' The two lines cross ' + flips + ' time' + (flips === 1 ? '' : 's') + ' over the observed span.');
    }
  }

  /* ── sector dumbbells ────────────────────────────────────────────────── */

  function sectorRows() {
    var i = ind(), months = i.months;
    var series = i.sector_series.US || {};
    var lastMap = (i.sector_last_month && i.sector_last_month.US) || {};
    var byCode = {};
    i.sectors.forEach(function (s) { byCode[s.code] = s; });
    var rows = [];
    Object.keys(series).forEach(function (code) {
      var arr = series[code];
      if (!arr) return;
      var li = lastIdx(arr, lastMap[code]);
      if (li < 0) return;
      var sum = 0, cnt = 0;
      for (var k = 0; k < months.length && k <= li; k++) {
        if (months[k].slice(0, 4) === '2019' && A.isNum(arr[k])) { sum += arr[k]; cnt++; }
      }
      var peak = -Infinity, peakM = null;
      for (var j = 0; j <= li; j++) if (A.isNum(arr[j]) && arr[j] > peak) { peak = arr[j]; peakM = months[j]; }
      var meta = byCode[code] || { label: code, tech: false, label_source: 'inferred' };
      rows.push({
        code: code, label: meta.label, tech: !!meta.tech, inferred: meta.label_source === 'inferred',
        base: cnt ? sum / cnt : null, baseN: cnt, latest: arr[li], latestM: months[li],
        peak: peak, peakM: peakM
      });
    });
    return rows.sort(function (p, q) { return q.latest - p.latest; });
  }

  function renderSector() {
    if (!el.sector) return;
    disposeGroup('sector');
    clear(el.sector);
    var rows = sectorRows();
    if (!rows.length) { el.sector.appendChild(A.ui.empty('No US sector series in this file.')); return; }

    var box = chartBox('chart-sector');
    el.sector.appendChild(box.el);
    box.legend.appendChild(legendItem(C_TECH, '2019 average → latest month, tech sector', 'dot'));
    box.legend.appendChild(legendItem(C_OTHER, 'other sector', 'dot'));
    box.legend.appendChild(E('span', { class: 'lg-item' },
      E('i', { style: { width: '2px', height: '11px', background: C.ink2, display: 'inline-block' } }), 'peak month'));

    var ends = {};
    rows.forEach(function (r) { ends[r.latestM] = (ends[r.latestM] || 0) + 1; });
    var endList = Object.keys(ends).sort();

    function draw() {
      clear(box.plot);
      var W = plotWidth(box.plot, 620);
      var labelW = Math.min(230, Math.max(110, W * 0.35));
      var rowH = 19, m = { t: 22, r: 52, b: 6, l: labelW };
      var H = m.t + rows.length * rowH + m.b;
      var pw = Math.max(70, W - m.l - m.r);
      var maxV = 0;
      rows.forEach(function (r) { maxV = Math.max(maxV, r.latest, r.base || 0, r.peak); });
      var top = Math.ceil(maxV / 5) * 5 || 5;
      var X = function (v) { return m.l + (v / top) * pw; };

      var svg = svgRoot(W, H);
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'Remote share of US postings by Indeed sector');
      /* Tick step must follow the pixels available, not a fixed 5%: in a
         two-column layout at ~1000px the plot is ~250px wide and a 5% step
         packs ten "45%"-wide labels into it, which collide. Widen the step
         until neighbouring labels are at least MIN_TICK_PX apart. */
      var MIN_TICK_PX = 46;
      var step = 5;
      [5, 10, 20, 25, 50].some(function (s) { step = s; return (s / top) * pw >= MIN_TICK_PX; });
      for (var t = 0; t <= top; t += step) {
        svg.appendChild(gridline(X(t), m.t - 6, X(t), H - m.b));
        svg.appendChild(tx(X(t), m.t - 10, t + '%', 'ax-label', 'middle'));
      }
      rows.forEach(function (r, idx) {
        var y = m.t + idx * rowH + rowH / 2;
        var color = r.tech ? C_TECH : C_OTHER;
        var a = r.base == null ? r.latest : r.base;
        svg.appendChild(S('line', {
          x1: X(Math.min(a, r.latest)), y1: y, x2: X(Math.max(a, r.latest)), y2: y,
          stroke: color, 'stroke-width': 2, 'stroke-opacity': 0.45, 'stroke-linecap': 'round'
        }));
        if (A.isNum(r.peak)) {
          svg.appendChild(S('line', {
            x1: X(r.peak), y1: y - 5, x2: X(r.peak), y2: y + 5,
            stroke: color, 'stroke-width': 1.5, 'stroke-opacity': 0.75
          }));
        }
        if (r.base != null) {
          svg.appendChild(S('circle', {
            cx: X(r.base), cy: y, r: 3.5, fill: color, 'fill-opacity': 0.45, stroke: SURFACE, 'stroke-width': 2
          }));
        }
        svg.appendChild(S('circle', { cx: X(r.latest), cy: y, r: 4.5, fill: color, stroke: SURFACE, 'stroke-width': 2 }));
        svg.appendChild(tx(m.l + pw + 8, y + 3.5, pctRaw(r.latest), 'ax-direct'));
        var lab = tx(m.l - 10, y + 3.5, truncate(r.label + (r.inferred ? ' *' : ''), 11, m.l - 14),
          r.tech ? 'ax-direct' : 'ax-label', 'end');
        svg.appendChild(lab);
        var band = S('rect', { x: 0, y: m.t + idx * rowH, width: W, height: rowH, fill: 'transparent' });
        A.tooltip.bind(band, function () {
          return ttTitle(r.label, 'Indeed sector code <code>' + esc(r.code) + '</code>' +
            (r.tech ? ' · tech' : '') + (r.inferred ? ' · label inferred by the pipeline, not published by Indeed' : '')) +
            A.tooltip.rows([
              ['2019 average (' + r.baseN + ' months)', r.base == null ? F.none() : pctRaw(r.base)],
              ['Peak, ' + F.month(r.peakM), pctRaw(r.peak)],
              ['Latest, ' + F.month(r.latestM), pctRaw(r.latest)],
              ['Change vs 2019', r.base == null ? F.none() : ppRaw(r.latest - r.base, 2)],
              ['Off peak', ppRaw(r.latest - r.peak, 2)]
            ]) + ttFoot('This series ends ' + F.month(r.latestM) + '; nothing is drawn past it.');
        });
        svg.appendChild(band);
      });
      box.plot.appendChild(svg);
    }
    draw();
    group('sector', { destroy: U.onResize(box.plot, draw) });

    box.foot.innerHTML = 'Sorted by the latest observed month. All ' + rows.length + ' US sector series in this file run to <b>' +
      endList.map(function (m2) { return F.month(m2) + (endList.length > 1 ? ' (' + ends[m2] + ')' : ''); }).join(', ') +
      '</b>, read per series from <code>sector_last_month</code>; each dumbbell stops at its own end date. ' +
      (rows.some(function (r) { return r.inferred; }) ? '* label inferred by the pipeline, not published by Indeed.' : '');
  }

  /* ── country small multiples ─────────────────────────────────────────── */

  function renderCountries() {
    if (!el.countries) return;
    clear(el.countries);
    var i = ind(), months = i.months, list = [];
    i.countries.forEach(function (c) {
      var arr = i.series.remote_postings[c.c];
      if (!arr) return;
      var li = lastIdx(arr, i.series_last_month.remote_postings[c.c]);
      if (li < 0) return;
      var first = U.firstIndex(arr), peak = -Infinity, peakI = -1;
      for (var k = 0; k <= li; k++) if (A.isNum(arr[k]) && arr[k] > peak) { peak = arr[k]; peakI = k; }
      list.push({ c: c.c, n: c.n, arr: arr, li: li, first: first, peak: peak, peakI: peakI, latest: arr[li] });
    });
    if (!list.length) { el.countries.appendChild(A.ui.empty('No country series in this file.')); return; }
    list.sort(function (p, q) { return q.latest - p.latest; });

    var top = 0;
    list.forEach(function (d) { top = Math.max(top, d.peak); });
    top = Math.ceil(top / 5) * 5 || 5;
    var us = list.filter(function (d) { return d.c === 'US'; })[0];

    el.countries.appendChild(legendRow([
      legendItem(C_POST, 'this country'),
      us ? legendItem(GHOST, 'United States, for reference') : null,
      E('span', { class: 'lg-item' }, 'shared 0–' + top + '% axis')
    ]));

    var grid = E('div', {
      style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px' }
    });
    list.forEach(function (d) { grid.appendChild(countryPanel(d, us, top, months)); });
    el.countries.appendChild(grid);

    if (us) {
      var others = list.filter(function (d) { return d.c !== 'US'; });
      var down = others.filter(function (d) { return d.latest < d.peak - 0.5; }).length;
      el.countries.appendChild(E('div', {
        class: 'chart-note',
        html: 'The US is <b>' + ppRaw(us.latest - us.peak, 2) + '</b> off its own peak (' + F.month(months[us.peakI]) +
          ', ' + pctRaw(us.peak) + '). ' + down + ' of the other ' + others.length +
          ' countries are also more than 0.5pp below their own peak — the retreat is not only a US phenomenon.'
      }));
    }
  }

  function countryPanel(d, us, top, months) {
    var W = 160, H = 92, m = { t: 20, r: 6, b: 13, l: 6 };
    var pw = W - m.l - m.r, ph = H - m.t - m.b, n = months.length;
    var X = function (i) { return m.l + i * pw / (n - 1); };
    var Y = function (v) { return m.t + ph - (v / top) * ph; };
    var svg = S('svg', {
      class: 'chart-svg', viewBox: '0 0 ' + W + ' ' + H, width: W, height: H,
      preserveAspectRatio: 'xMidYMid meet', role: 'img',
      'aria-label': d.n + ': remote share of postings, ' + pctRaw(d.latest) + ' in ' + F.month(months[d.li])
    });
    svg.appendChild(gridline(m.l, m.t + ph, m.l + pw, m.t + ph, 'rgba(255,255,255,0.12)'));
    if (us && us.c !== d.c) {
      A.chart.segments(us.arr, 0, us.li).forEach(function (seg) {
        svg.appendChild(S('path', {
          d: linePath(seg, X, function (k) { return Y(us.arr[k]); }),
          fill: 'none', stroke: GHOST, 'stroke-width': 1.2
        }));
      });
    }
    A.chart.segments(d.arr, 0, d.li).forEach(function (seg) {
      svg.appendChild(S('path', {
        d: linePath(seg, X, function (k) { return Y(d.arr[k]); }),
        fill: 'none', stroke: C_POST, 'stroke-width': 2, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }));
    });
    if (d.peakI >= 0) {
      svg.appendChild(S('circle', { cx: X(d.peakI), cy: Y(d.peak), r: 2.6, fill: 'none', stroke: C_POST, 'stroke-width': 1.4, 'stroke-opacity': 0.8 }));
    }
    svg.appendChild(S('circle', { cx: X(d.li), cy: Y(d.latest), r: 4, fill: C_POST, stroke: SURFACE, 'stroke-width': 2 }));
    svg.appendChild(tx(m.l, 11, d.n, 'ax-direct'));
    svg.appendChild(tx(W - m.r, 11, pctRaw(d.latest), 'ax-direct', 'end'));
    svg.appendChild(tx(m.l, H - 3, months[d.first].slice(0, 4), 'ax-note'));
    svg.appendChild(tx(W - m.r, H - 3, months[d.li].slice(0, 4), 'ax-note', 'end'));

    var box = E('div', {
      style: {
        background: 'rgba(255,255,255,0.02)', border: '1px solid var(--line-soft)',
        borderRadius: '6px', padding: '6px 6px 2px'
      }
    }, svg);
    A.tooltip.bind(box, function () {
      return ttTitle(d.n) + A.tooltip.rows([
        ['First month, ' + F.month(months[d.first]), pctRaw(d.arr[d.first])],
        ['Peak, ' + F.month(months[d.peakI]), pctRaw(d.peak)],
        ['Latest, ' + F.month(months[d.li]), pctRaw(d.latest)],
        ['Off peak', ppRaw(d.latest - d.peak, 2)]
      ]) + ttFoot('Share of that country\'s Indeed postings mentioning remote or hybrid work. Shared 0–' + top + '% axis across all panels.');
    });
    return box;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SOURCES
     ═══════════════════════════════════════════════════════════════════════ */

  function sources() {
    var a = acs(), i = ind();
    var items = [
      '<b>ACS 1-year, tables B08006 and B08124</b> — ' + a.geos.length + ' geographies, ' + years()[0] + '–' +
      years()[years().length - 1] + ', with ' + a.years[2] + ' missing upstream. ' + esc(D.meta.acs.definition),
      '<b>Indeed Hiring Lab remote-tracker</b> — ' + i.months.length + ' months, ' + F.month(i.months[0]) + ' to ' +
      F.month(i.months[i.months.length - 1]) + ', ' + i.countries.length + ' countries, ' + i.sectors.length +
      ' sector codes (' + Object.keys(i.sector_series.US || {}).length + ' present for the US). ' +
      esc(D.meta.indeed.remote_definition),
      '<b>Comparability</b> — ' + esc(D.meta.indeed.comparability),
      '<b>Seasonal adjustment</b> — ' + esc(D.meta.indeed.methodology_change),
      '<b>Margins of error</b> — ' + esc(D.meta.acs.moe)
    ];
    var p = panel('Sources and definitions');
    /* Two columns: one 92ch list in a 1,344px card leaves half the card empty. */
    p.appendChild(E('ul', {
      class: 'cols2',
      style: { listStyle: 'none' },
      html: items.map(function (t) { return '<li class="note" style="margin-top:0">' + t + '</li>'; }).join('')
    }));
    return E('div', { class: 'view-section' }, p);
  }

  /* ── register ────────────────────────────────────────────────────────── */

  A.registerView('remote', {
    label: 'Remote work',
    subtitle: 'Where people work from, and what employers advertise — ACS 2018–2024 and Indeed 2019–2026',
    mount: mount,
    destroy: destroy
  });
})();
