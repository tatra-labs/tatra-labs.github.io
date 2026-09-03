/* ============================================================================
 * view_tech.js  —  View 3: "Tech & roles"
 *
 * Answers: for remote IT jobs, which technologies and roles are rising or
 * falling — what should I learn, and what should I apply to?
 *
 * Source of every number on this page:
 *   explore/data/tech.json        (94,548 Hacker News "Who is hiring?" postings)
 *   explore/data/occ_index.json   (BLS OEWS occupation index)
 *   explore/data/series_g00.json  (OEWS national totals + major groups)
 *   explore/data/series_g15.json  (OEWS Computer & Mathematical, detailed)
 * Nothing is hardcoded, interpolated or invented. Shares are derived exactly as
 * the payload prescribes: count / matching total, null at a zero denominator.
 * Axis domains are derived from the rows they plot, never fixed, so a data
 * refresh can never push a point outside the plot unnoticed.
 *
 * Sections, in reading order:
 *   1 work-arrangement composition   remote.year_counts / totals.year
 *   2 technology trend explorer      tech.year_counts[_remote] / totals[remote_totals]
 *   3 rising / falling quadrant      signals.tech_all
 *   4 role share small multiples     role.year_counts[_by_remote]
 *   5 remote share by role           signals.roles
 *   6 region a posting hires from    remote_scope.year_counts (denominator = the
 *                                    year's own scope sum; each posting carries
 *                                    exactly one scope label)
 *   7 what the data says             signals.risers / .fallers / .roles
 *   8 BLS OEWS grounding             occ_index + series_g00 + series_g15
 *
 * COLOUR — every palette below was run through the dataviz skill's validator
 * against this page's actual surface (#0a0a0f), not eyeballed:
 *   categorical 8   #3987e5,#d95926,#199e70,#c98500,#d55181,#008300,#9085e9,#e66767
 *                   -> adjacent CVD dE 8.4 · normal-vision dE 19.3 · all >= 3:1  PASS
 *   ordinal 3       #9ec5f4,#3987e5,#1c5cab  (remote -> hybrid -> onsite)
 *                   -> monotone L, dL >= 0.06, dark end 2.98:1                   PASS
 *   diverging pair  #3987e5 (rising) / #dd7038 (falling) = App.color.pos/.neg
 *                   -> the page-wide pair; also used by the map view's shift bars
 *                      and the remote view's mover bars                          PASS
 * ==========================================================================*/
(function () {
  "use strict";

  var App = window.App;
  var VIEW_ID = "tech";

  /* ---------------------------------------------------------------- tokens */

  var C = {
    // categorical, fixed order — assigned by entity, never by rank, never cycled
    cat: ["#3987e5", "#d95926", "#199e70", "#c98500",
          "#d55181", "#008300", "#9085e9", "#e66767"],
    // ordinal ramp for the work-arrangement spectrum (light = most remote)
    remote:  "#9ec5f4",
    hybrid:  "#3987e5",
    onsite:  "#1c5cab",
    unknown: "#6f6f7d",
    // dumbbell "then" shade — same hue as `remote`, one step darker but still 3.6:1
    // on #0a0a0f (the onsite step is 2.98:1, too faint for a 4px dot)
    past:    "#2a6cae",
    // diverging poles for "which side of zero" — the SAME pair app.js exposes as
    // App.color.pos / App.color.neg and the other two tabs use for their shift and
    // mover bars, so one hue means one direction across the whole product.
    up:   App.color.pos,
    down: App.color.neg,
    // chrome
    grid: "rgba(255,255,255,0.07)",
    axis: "rgba(255,255,255,0.16)",
    ink:  "#e0e0e8",
    ink2: "#888894",
    surface: "#0a0a0f"
  };

  var CAT_LABEL = {
    language: "Languages", frontend: "Frontend", framework: "Frameworks",
    data: "Data", infra: "Infrastructure", platform: "Platforms",
    ai: "AI / ML", practice: "Practices", other: "Other"
  };
  // AI/ML sits second, not last: LLMs and agents are the loudest movement in this
  // data and burying them under an inner scrollbar would hide the story.
  var CAT_ORDER = ["language", "ai", "frontend", "framework", "data", "infra",
                   "platform", "practice", "other"];

  // Display strings for the payload's own remote-scope ids. Presentation only —
  // no id is merged, split or reinterpreted, and an id this map does not know
  // still renders (title-cased) rather than silently disappearing.
  var SCOPE_LABEL = {
    us: "US only", eu: "EU", uk: "UK", canada: "Canada", india: "India",
    "north-america": "North America", latam: "Latin America", apac: "APAC",
    emea: "EMEA", global: "Anywhere in the world", "same-timezone": "Same time zone"
  };
  function scopeLabel(id) {
    return SCOPE_LABEL[id] ||
      String(id).replace(/-/g, " ").replace(/^./, function (c) { return c.toUpperCase(); });
  }

  // Preselected because between them they cover every shape in the data:
  // big-and-flat, big-and-rising, big-and-falling, and didn't-exist-in-2018.
  var PRESELECT = ["python", "typescript", "javascript", "llm", "react", "rust"];
  var MAX_SERIES = 8; // the categorical token ceiling — never generate a 9th hue

  /* --------------------------------------------------------------- helpers */

  var el = function (t, a) {
    return App.el.apply(App, [t, a || {}].concat([].slice.call(arguments, 2)));
  };
  var sv = function (t, a) {
    return App.svg.apply(App, [t, a || {}].concat([].slice.call(arguments, 2)));
  };
  var T = function (s) { return document.createTextNode(String(s)); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function num(n) { return App.fmt.num(n); }
  function compact(n) { return App.fmt.compact(n); }
  function pct(x, dp) { return x == null ? "—" : App.fmt.pct(x, dp == null ? 1 : dp); }
  function pp(x) { return x == null ? "—" : App.fmt.pp(x); }
  function usd(n) { return n == null ? "—" : App.fmt.usd(n); }

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }

  // Linear scale factory
  function scale(d0, d1, r0, r1) {
    var k = (d1 - d0) === 0 ? 0 : (r1 - r0) / (d1 - d0);
    var f = function (v) { return r0 + (v - d0) * k; };
    f.invert = function (p) { return k === 0 ? d0 : d0 + (p - r0) / k; };
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  }
  function logScale(d0, d1, r0, r1) {
    var l0 = Math.log10(d0), l1 = Math.log10(d1);
    var k = (r1 - r0) / (l1 - l0);
    var f = function (v) { return r0 + (Math.log10(Math.max(v, d0)) - l0) * k; };
    f.domain = [d0, d1]; f.range = [r0, r1];
    return f;
  }
  // Snap a positive value onto the 1-3-10 (half-decade) grid a log axis is
  // ticked on. dir < 0 rounds down, dir > 0 rounds up. Used to derive the
  // quadrant's x domain FROM THE DATA rather than hard-coding it: a hard-coded
  // floor or ceiling silently draws an out-of-range point outside the plot the
  // first time a data refresh moves past it.
  function snap13(v, dir) {
    if (!(v > 0)) return dir < 0 ? 1e-4 : 1;
    var k = Math.floor(Math.log10(v)), mant = v / Math.pow(10, k);
    var steps = [1, 3, 10];
    for (var i = 0; i < steps.length; i++) {
      if (dir < 0) { if (mant < steps[i]) return Math.pow(10, k) * steps[Math.max(0, i - 1)]; }
      else if (mant <= steps[i] * (1 + 1e-9)) return Math.pow(10, k) * steps[i];
    }
    return Math.pow(10, k) * (dir < 0 ? 3 : 10);
  }
  // Every 1-3-10 tick inside [lo, hi], inclusive.
  function logTicks13(lo, hi) {
    var out = [], k = Math.floor(Math.log10(lo)) - 1;
    for (; k <= Math.ceil(Math.log10(hi)) + 1; k++) {
      [1, 3].forEach(function (s) {
        var v = Math.pow(10, k) * s;
        if (v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)) out.push(v);
      });
    }
    return out;
  }
  // "Nice" tick values covering [lo,hi]
  function ticks(lo, hi, count) {
    if (!(hi > lo)) return [lo];
    var span = hi - lo, step = Math.pow(10, Math.floor(Math.log10(span / count)));
    var err = span / count / step;
    if (err >= 7.5) step *= 10; else if (err >= 3.5) step *= 5;
    else if (err >= 1.5) step *= 2;
    var out = [], v = Math.ceil(lo / step) * step;
    for (; v <= hi + step * 1e-6; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function textW(s, px) { return String(s).length * px * 0.56; }
  // A log-axis tick label: as many decimals as the value needs, never more.
  function pctTick(v) {
    var p = v * 100;
    var dp = p >= 1 ? 0 : Math.max(0, Math.ceil(-Math.log10(p)) + 1);
    return p.toFixed(dp).replace(/\.(\d*?)0+$/, function (_, d) { return d ? "." + d : ""; }) + "%";
  }

  /* ------------------------------------------------------------ view state */

  var S = null; // populated on mount

  /* -------------------------------------------------------------- stylesheet */

/* Styling lives in site/explore/style.css — the page has ONE stylesheet, and
 * the card surface, section head and button spec are the shared house rules
 * there. Every selector this view uses is namespaced .tvw / .tvw-*, plus the
 * shared classes (.section-head, .color-toggle, .stat-big, .yslider, .panel). */


  /* ------------------------------------------------------------- primitives */

  function sectionHead(title, subtitle, right) {
    var left = el("div", {},
      el("h3", { class: "tvw-sh" }, T(title)),
      subtitle ? el("div", { class: "tvw-sub" }, subtitle) : null);
    return el("div", { class: "tvw-sechd" }, left, right || null);
  }

  function btnGroup(options, current, onPick) {
    var wrap = el("div", { class: "tvw-btns" });
    options.forEach(function (o) {
      var b = el("button", {
        type: "button",
        class: o.value === current ? "active" : "",
        on: { click: function () { onPick(o.value); } }
      }, T(o.label));
      b.dataset.value = o.value;
      wrap.appendChild(b);
    });
    return wrap;
  }
  function setActive(wrap, value) {
    [].forEach.call(wrap.querySelectorAll("button"), function (b) {
      b.classList.toggle("active", b.dataset.value === value);
    });
  }

  var hatchSeq = 0;
  // a real 45° hatch swatch, so the legend key looks like the thing it explains
  function hatchSwatch() {
    var id = "tvwLegHatch" + (++hatchSeq);
    return sv("svg", { width: 11, height: 11, class: "sw", "aria-hidden": "true",
                       style: { flex: "0 0 auto" } },
      sv("defs", {}, sv("pattern", {
        id: id, width: 4, height: 4, patternUnits: "userSpaceOnUse",
        patternTransform: "rotate(45)"
      }, sv("line", { x1: 0, y1: 0, x2: 0, y2: 4,
                      stroke: "rgba(255,255,255,.42)", "stroke-width": 1.4 }))),
      sv("rect", { width: 11, height: 11, rx: 2, fill: "rgba(255,255,255,.05)" }),
      sv("rect", { width: 11, height: 11, rx: 2, fill: "url(#" + id + ")" }));
  }

  function legend(items) {
    var w = el("div", { class: "tvw-legend" });
    items.forEach(function (it) {
      var mark;
      if (it.kind === "line") mark = el("span", { class: "ln", style: { background: it.color } });
      else if (it.kind === "vrule") mark = el("span", {
        class: "vr", style: { background: it.color }
      });
      else if (it.kind === "dot") mark = el("span", { class: "dt", style: { background: it.color } });
      else if (it.kind === "hatch") mark = hatchSwatch();
      else if (it.kind === "ring") mark = el("span", {
        class: "dt", style: { background: "transparent", border: "1.5px solid " + it.color }
      });
      else mark = el("span", { class: "sw", style: { background: it.color } });
      w.appendChild(el("span", { class: "lg" }, mark, T(it.label)));
    });
    return w;
  }

  // A chart card that can flip between its SVG and an equivalent data table.
  // `block.also` may be set to a second element (e.g. a small-multiples grid) that
  // must hide and show with the chart — otherwise "Table" shows both at once.
  function chartBlock(id, buildTable) {
    var chart = el("div", { class: "tvw-chart" });
    var table = el("div", { class: "tvw-tablewrap", style: { display: "none" } });
    var showing = "chart";
    var block;
    var toggle = btnGroup(
      [{ value: "chart", label: "Chart" }, { value: "table", label: "Table" }],
      "chart",
      function (v) {
        showing = v;
        setActive(toggle, v);
        chart.style.display = (v === "chart" && !block.also) ? "" : "none";
        if (block.also) block.also.style.display = v === "chart" ? "" : "none";
        table.style.display = v === "table" ? "" : "none";
        if (v === "table") {
          table.textContent = "";
          table.appendChild(buildTable());
        }
      });
    block = { chart: chart, table: table, toggle: toggle, id: id, also: null,
              showing: function () { return showing; },
              refreshTable: function () {
                if (showing === "table") { table.textContent = ""; table.appendChild(buildTable()); }
              } };
    return block;
  }

  function dataTable(cols, rows) {
    var t = el("table", { class: "tvw-table" });
    var thead = el("thead", {}), tr = el("tr", {});
    cols.forEach(function (c) {
      tr.appendChild(el("th", { class: c.n ? "n" : "" }, T(c.label)));
    });
    thead.appendChild(tr); t.appendChild(thead);
    var tb = el("tbody", {});
    rows.forEach(function (r) {
      var row = el("tr", {});
      r.forEach(function (v, i) {
        var td = el("td", { class: (cols[i] && cols[i].n ? "n " : "") + (v && v.dim ? "dim" : "") });
        if (v && v.node) td.appendChild(v.node);
        else td.appendChild(T(v && v.text != null ? v.text : (v == null ? "—" : v)));
        row.appendChild(td);
      });
      tb.appendChild(row);
    });
    t.appendChild(tb);
    return t;
  }

  // Every chart that marks a partial year gets its OWN pattern id. SVG resolves
  // url(#id) document-wide, so one shared id across the ~22 live <svg> elements on
  // this page is a duplicate-id collision waiting to break when one re-renders.
  var hatchN = 0;
  function addHatch(svg) {
    var id = "tvwHatch" + (++hatchN);
    svg.appendChild(sv("defs", {}, sv("pattern", {
      id: id, width: 6, height: 6,
      patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)"
    }, sv("rect", { width: 6, height: 6, fill: "transparent" }),
       sv("line", { x1: 0, y1: 0, x2: 0, y2: 6, stroke: "rgba(255,255,255,.10)", "stroke-width": 1.6 }))));
    return "url(#" + id + ")";
  }

  function tip(html, ev) { App.tooltip.show(html, ev.clientX, ev.clientY); }
  function untip() { App.tooltip.hide(); }

  function ttRows(pairs) {
    return '<div class="tt-stats">' + pairs.map(function (p) {
      return '<span class="label">' + esc(p[0]) + '</span><span class="value">' + esc(p[1]) + "</span>";
    }).join("") + "</div>";
  }
  function ttTitle(s) { return '<div class="tt-title">' + esc(s) + "</div>"; }
  function ttNote(s) { return '<div class="tt-rationale">' + esc(s) + "</div>"; }

  /* ============================ DATA ACCESSORS ============================ */

  function yearIdx(years, y) { return years.indexOf(String(y)); }

  // share = count / total, null when the denominator is 0 (per the payload)
  function share(counts, totals, i) {
    if (!counts || !totals) return null;
    var d = totals[i];
    if (!d) return null;
    var n = counts[i];
    return n == null ? null : n / d;
  }

  function techSeries(id) {
    var t = S.tech.tech;
    var remoteOnly = S.universe === "remote";
    var counts = remoteOnly ? t.year_counts_remote[id] : t.year_counts[id];
    var totals = remoteOnly ? S.tech.remote_totals.year : S.tech.totals.year;
    return S.yearIdxs.map(function (i) {
      return { i: i, year: S.tech.years[i], v: share(counts, totals, i),
               n: counts ? counts[i] : null, d: totals[i] };
    });
  }

  function roleSeries(id) {
    var r = S.tech.role;
    var remoteOnly = S.universe === "remote";
    var counts = remoteOnly
      ? (r.year_counts_by_remote[id] || {}).remote
      : r.year_counts[id];
    var totals = remoteOnly ? S.tech.remote_totals.year : S.tech.totals.year;
    return S.yearIdxs.map(function (i) {
      return { i: i, year: S.tech.years[i], v: share(counts, totals, i),
               n: counts ? counts[i] : null, d: totals[i] };
    });
  }

  function isPartial(yearStr) { return S.tech.partial_years.indexOf(yearStr) !== -1; }
  function partialTag(yearStr) {
    return isPartial(yearStr)
      ? " (partial — " + S.tech.months_per_year[yearStr] + " of 12 months)" : "";
  }
  function yearLabel(yearStr) { return yearStr + (isPartial(yearStr) ? "*" : ""); }

  function universeLabel() {
    return S.universe === "remote"
      ? "share of fully-remote postings that year"
      : "share of all postings that year";
  }

  /* ======================= 1. COMPOSITION (headline) ====================== */

  function renderComposition(host, width) {
    host.textContent = "";
    var classes = [
      { k: "remote",  label: "Fully remote", color: C.remote },
      { k: "hybrid",  label: "Hybrid",       color: C.hybrid },
      { k: "onsite",  label: "Onsite",       color: C.onsite },
      { k: "unknown", label: "Not stated",   color: C.unknown }
    ];
    var rc = S.tech.remote.year_counts, tot = S.tech.totals.year;
    var idxs = S.yearIdxs;

    var m = { t: 16, r: 14, b: 40, l: 42 };
    // The column cap is 26px, so letting the plot fill a 1300px panel would put
    // nine 26px columns in 140px slots — 80% air, and the eye can no longer read
    // them as one series. Cap the SLOT instead and let the chart be narrower
    // than its panel; the band gap then lands near the ~45% the mark spec wants.
    var SLOT_MAX = 56;
    var W = Math.max(320, Math.min(width, m.l + m.r + idxs.length * SLOT_MAX)), H = 300;
    var iw = W - m.l - m.r, ih = H - m.t - m.b;
    var x = scale(0, idxs.length, m.l, m.l + iw);
    var y = scale(0, 1, m.t + ih, m.t);
    var slot = iw / idxs.length;
    // 32px is wide enough to seat a "42.3%" label INSIDE the segment it describes,
    // which is what keeps the direct labels off their neighbours.
    var bw = Math.min(32, slot * 0.62);

    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H,
                          role: "img", "aria-label": "Work-arrangement composition of Hacker News tech postings by year" });
    var hatchUrl = addHatch(svg);

    // gridlines + y axis (0–100%)
    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v),
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: m.l - 8, y: y(v) + 3.5, "text-anchor": "end",
                                   fill: C.ink2, "font-size": 10.5 }, T(Math.round(v * 100) + "%")));
    });

    var GAP = 2; // surface gap between stacked segments — never a border
    idxs.forEach(function (yi, k) {
      var cx = x(k) + slot / 2;
      var acc = 0;
      var yearStr = S.tech.years[yi];
      var parts = classes.map(function (c) {
        var v = share(rc[c.k], tot, yi);
        return { c: c, v: v == null ? 0 : v, raw: v, n: rc[c.k][yi] };
      });
      parts.forEach(function (p) {
        var y0 = y(acc), y1 = y(acc + p.v);
        acc += p.v;
        var h = Math.max(0, y0 - y1 - GAP);
        if (h <= 0) return;
        svg.appendChild(sv("rect", {
          x: cx - bw / 2, y: y1, width: bw, height: h, fill: p.c.color, rx: 0
        }));
      });
      if (isPartial(yearStr)) {
        svg.appendChild(sv("rect", {
          x: cx - bw / 2 - 3, y: m.t, width: bw + 6, height: ih,
          fill: hatchUrl, "pointer-events": "none"
        }));
      }
      // generous hit target across the whole slot
      var hit = sv("rect", { x: x(k), y: m.t, width: slot, height: ih,
                             fill: "transparent", class: "tvw-hit" });
      hit.addEventListener("pointermove", function (ev) {
        tip(ttTitle(yearStr + (isPartial(yearStr) ? " · partial year" : "")) +
            ttRows(parts.map(function (p) {
              return [p.c.label, pct(p.raw, 1) + "  (" + num(p.n) + ")"];
            }).concat([["All postings", num(tot[yi])]])) +
            ttNote("Share of that year's Hacker News “Who is hiring?” postings" +
                   partialTag(yearStr) + "."), ev);
      });
      hit.addEventListener("pointerleave", untip);
      svg.appendChild(hit);

      // x axis label — thin them out when the slots are narrow
      var every = slot < 34 ? 2 : 1;
      if (k % every === 0 || k === idxs.length - 1) {
        svg.appendChild(sv("text", { x: cx, y: H - m.b + 16, "text-anchor": "middle",
                                     fill: C.ink2, "font-size": 10.5 }, T(yearLabel(yearStr))));
      }
    });

    // Selective direct labels — first visible year, peak remote year, latest year.
    // The number describes the fully-remote segment, so it is written INSIDE that
    // segment (ink chosen by the fill's luminance) whenever it fits, and set beside
    // the column otherwise. Never floated over a neighbouring segment.
    var remoteVals = idxs.map(function (yi) { return share(rc.remote, tot, yi) || 0; });
    var peak = remoteVals.indexOf(Math.max.apply(null, remoteVals));
    var marks = {};
    marks[0] = 1; marks[peak] = 1; marks[idxs.length - 1] = 1;
    Object.keys(marks).forEach(function (kk) {
      var k = +kk, yi = idxs[k];
      var v = share(rc.remote, tot, yi);
      if (v == null) return;
      var cx = x(k) + slot / 2;
      var segH = y(0) - y(v);
      var label = pct(v, 1);
      if (segH >= 16 && textW(label, 10.5) <= bw - 2) {
        svg.appendChild(sv("text", {
          x: cx, y: y(0) - segH / 2 + 4, "text-anchor": "middle",
          fill: App.color.onFill(C.remote), "font-size": 10.5, "font-weight": 600
        }, T(label)));
      } else {
        // Too short (or too narrow) to sit in its own segment: step UP into the
        // hybrid band, still centred on this column. Never beside the column —
        // at these slot widths a side label lands on the next year's bar.
        svg.appendChild(sv("text", {
          x: cx, y: y(v) - 6, "text-anchor": "middle",
          fill: App.color.onFill(C.hybrid), "font-size": 10.5, "font-weight": 600
        }, T(label)));
      }
    });

    svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(0), y2: y(0),
                                 stroke: C.axis, "stroke-width": 1 }));
    host.appendChild(svg);
  }

  function compositionTable() {
    var rc = S.tech.remote.year_counts, tot = S.tech.totals.year;
    var rows = S.yearIdxs.map(function (yi) {
      var yr = S.tech.years[yi];
      return [
        yearLabel(yr),
        pct(share(rc.remote, tot, yi), 1),
        pct(share(rc.hybrid, tot, yi), 1),
        pct(share(rc.onsite, tot, yi), 1),
        pct(share(rc.unknown, tot, yi), 1),
        num(tot[yi])
      ];
    });
    return dataTable([
      { label: "Year" }, { label: "Fully remote", n: 1 }, { label: "Hybrid", n: 1 },
      { label: "Onsite", n: 1 }, { label: "Not stated", n: 1 }, { label: "Postings", n: 1 }
    ], rows);
  }

  /* ======================== 2. TECHNOLOGY EXPLORER ======================== */

  function renderTechLines(host, width) {
    host.textContent = "";
    var sel = S.selected;
    var idxs = S.yearIdxs;
    var m = { t: 16, r: 132, b: 40, l: 46 };
    var W = Math.max(620, width), H = 340;
    var iw = W - m.l - m.r, ih = H - m.t - m.b;

    var series = sel.map(function (id) {
      return { id: id, label: S.tech.tech.labels[id] || id,
               color: C.cat[S.slotOf[id] % C.cat.length], pts: techSeries(id) };
    });
    var maxV = 0;
    series.forEach(function (s) {
      s.pts.forEach(function (p) { if (p.v != null && p.v > maxV) maxV = p.v; });
    });
    if (maxV === 0) maxV = 0.01;
    var yTicks = ticks(0, maxV * 1.08, 5);
    var yMax = Math.max(maxV * 1.08, yTicks[yTicks.length - 1]);

    var x = scale(0, idxs.length - 1, m.l, m.l + iw);
    var y = scale(0, yMax, m.t + ih, m.t);

    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H,
                          role: "img", "aria-label": "Technology share of postings over time" });
    var hatchUrl = addHatch(svg);

    var stepPP = yTicks.length > 1 ? (yTicks[1] - yTicks[0]) * 100 : 1;
    var dpY = stepPP < 1 ? 2 : stepPP < 5 ? 1 : 0;
    yTicks.forEach(function (v) {
      svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v),
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: m.l - 8, y: y(v) + 3.5, "text-anchor": "end",
                                   fill: C.ink2, "font-size": 10.5 },
                         T((v * 100).toFixed(dpY) + "%")));
    });

    // partial-year bands
    idxs.forEach(function (yi, k) {
      var yr = S.tech.years[yi];
      if (!isPartial(yr)) return;
      var half = (k === idxs.length - 1 ? (iw / Math.max(1, idxs.length - 1)) / 2 : (iw / Math.max(1, idxs.length - 1)) / 2);
      svg.appendChild(sv("rect", { x: x(k) - half, y: m.t, width: half * 2, height: ih,
                                   fill: hatchUrl, "pointer-events": "none" }));
    });

    // x axis
    var every = idxs.length > 10 ? 2 : 1;
    idxs.forEach(function (yi, k) {
      if (k % every !== 0 && k !== idxs.length - 1) return;
      svg.appendChild(sv("text", { x: x(k), y: H - m.b + 16, "text-anchor": "middle",
                                   fill: C.ink2, "font-size": 10.5 }, T(yearLabel(S.tech.years[yi]))));
    });
    svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(0), y2: y(0),
                                 stroke: C.axis, "stroke-width": 1 }));

    // lines
    series.forEach(function (s) {
      var d = "", pen = false;
      s.pts.forEach(function (p, k) {
        if (p.v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(k).toFixed(1) + " " + y(p.v).toFixed(1) + " ";
        pen = true;
      });
      svg.appendChild(sv("path", { d: d.trim(), fill: "none", stroke: s.color,
                                   "stroke-width": 2, "stroke-linejoin": "round",
                                   "stroke-linecap": "round" }));
      // end marker with a 2px surface ring
      for (var k = s.pts.length - 1; k >= 0; k--) {
        if (s.pts[k].v != null) {
          svg.appendChild(sv("circle", { cx: x(k), cy: y(s.pts[k].v), r: 4,
                                         fill: s.color, stroke: C.surface, "stroke-width": 2 }));
          s.endK = k; s.endY = y(s.pts[k].v);
          break;
        }
      }
    });

    // direct end-labels with leader lines (never stacked on top of each other)
    var labs = series.filter(function (s) { return s.endY != null; })
      .map(function (s) { return { s: s, y0: s.endY, y: s.endY }; })
      .sort(function (a, b) { return a.y0 - b.y0; });
    var GAP = 13;
    for (var i = 1; i < labs.length; i++) {
      if (labs[i].y - labs[i - 1].y < GAP) labs[i].y = labs[i - 1].y + GAP;
    }
    var over = labs.length ? labs[labs.length - 1].y - (m.t + ih) : 0;
    if (over > 0) {
      for (var j = labs.length - 1; j >= 0; j--) {
        labs[j].y -= over;
        if (j > 0 && labs[j - 1].y > labs[j].y - GAP) over = labs[j - 1].y - (labs[j].y - GAP);
        else break;
      }
    }
    labs.forEach(function (L) {
      var s = L.s, ex = x(s.endK);
      svg.appendChild(sv("path", {
        d: "M" + (ex + 5) + " " + L.y0 + " L" + (ex + 12) + " " + L.y + " L" + (ex + 17) + " " + L.y,
        fill: "none", stroke: s.color, "stroke-width": 1, opacity: 0.6
      }));
      var last = s.pts[s.endK];
      svg.appendChild(sv("text", { x: ex + 21, y: L.y + 3.5, fill: C.ink, "font-size": 11 },
        T(s.label + "  " + pct(last.v, 1))));
    });

    // crosshair + one tooltip listing every series at that X
    var cross = sv("line", { x1: 0, x2: 0, y1: m.t, y2: m.t + ih, stroke: "rgba(255,255,255,.22)",
                             "stroke-width": 1, opacity: 0 });
    svg.appendChild(cross);
    var hit = sv("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", class: "tvw-hit" });
    hit.addEventListener("pointermove", function (ev) {
      var r = svg.getBoundingClientRect();
      var px = (ev.clientX - r.left) * (W / r.width);
      var k = clamp(Math.round((px - m.l) / (iw / Math.max(1, idxs.length - 1))), 0, idxs.length - 1);
      cross.setAttribute("x1", x(k)); cross.setAttribute("x2", x(k));
      cross.setAttribute("opacity", 1);
      var yr = S.tech.years[idxs[k]];
      tip(ttTitle(yr + (isPartial(yr) ? " · partial year" : "")) +
          ttRows(series.map(function (s) {
            var p = s.pts[k];
            return [s.label, p.v == null ? "no data" : pct(p.v, 1) + "  (" + num(p.n) + ")"];
          })) +
          ttNote(universeLabel() + "; denominator " + num(series.length ? series[0].pts[k].d : 0) +
                 " postings" + partialTag(yr) + "."), ev);
    });
    hit.addEventListener("pointerleave", function () { cross.setAttribute("opacity", 0); untip(); });
    svg.appendChild(hit);

    host.appendChild(svg);
  }

  function techLinesTable() {
    var sel = S.selected;
    var cols = [{ label: "Year" }].concat(sel.map(function (id) {
      return { label: S.tech.tech.labels[id] || id, n: 1 };
    })).concat([{ label: "Denominator", n: 1 }]);
    var seriesData = sel.map(techSeries);
    var rows = S.yearIdxs.map(function (yi, k) {
      var r = [yearLabel(S.tech.years[yi])];
      seriesData.forEach(function (ps) {
        r.push(ps[k].v == null ? "—" : pct(ps[k].v, 1) + " (" + num(ps[k].n) + ")");
      });
      r.push(num(seriesData.length ? seriesData[0][k].d : 0));
      return r;
    });
    return dataTable(cols, rows);
  }

  function buildPicker(host, onChange) {
    host.textContent = "";
    var t = S.tech.tech;
    var byCat = {};
    t.ids.forEach(function (id) {
      var c = t.categories[id] || "other";
      (byCat[c] = byCat[c] || []).push(id);
    });
    CAT_ORDER.forEach(function (cat) {
      var ids = byCat[cat];
      if (!ids || !ids.length) return;
      ids.sort(function (a, b) {
        return (t.labels[a] || a).toLowerCase().localeCompare((t.labels[b] || b).toLowerCase());
      });
      var chips = el("div", { class: "tvw-chips" });
      ids.forEach(function (id) {
        var on = S.selected.indexOf(id) !== -1;
        var dot = el("span", { class: "cd", style: on ? { background: C.cat[S.slotOf[id] % C.cat.length] } : {} });
        var b = el("button", {
          type: "button", class: "tvw-chip", title: (t.labels[id] || id),
          on: { click: function () { toggleTech(id); onChange(); } }
        }, dot, T(t.labels[id] || id));
        b.dataset.on = on ? "1" : "0";
        b.dataset.tech = id;
        b.disabled = !on && S.selected.length >= MAX_SERIES;
        chips.appendChild(b);
      });
      host.appendChild(el("div", { class: "tvw-pgrp" },
        el("div", { class: "gl" }, T(CAT_LABEL[cat] || cat)), chips));
    });
  }

  function refreshPicker(host) {
    var t = S.tech.tech;
    [].forEach.call(host.querySelectorAll(".tvw-chip"), function (b) {
      var id = b.dataset.tech;
      var on = S.selected.indexOf(id) !== -1;
      b.dataset.on = on ? "1" : "0";
      b.disabled = !on && S.selected.length >= MAX_SERIES;
      var dot = b.querySelector(".cd");
      if (dot) dot.style.background = on ? C.cat[S.slotOf[id] % C.cat.length] : "rgba(255,255,255,.16)";
    });
  }

  // Colour follows the entity: a slot is held until that series is removed, so
  // deselecting one technology never repaints the survivors.
  function syncHash() {
    if (!S || !App.hashState) return;
    App.hashState.set({
      from: S.yearFrom === "2018" ? null : S.yearFrom,
      d: S.universe === "all" ? null : S.universe,
      t: S.selected.length ? S.selected.join(",") : null
    }, "tech");
  }

  function toggleTech(id) {
    var at = S.selected.indexOf(id);
    if (at !== -1) {
      S.selected.splice(at, 1);
      delete S.slotOf[id];
      return;
    }
    if (S.selected.length >= MAX_SERIES) return;
    var used = {};
    S.selected.forEach(function (o) { used[S.slotOf[o]] = 1; });
    var slot = 0;
    while (used[slot]) slot++;
    S.slotOf[id] = slot;
    S.selected.push(id);
  }

  /* ==================== 3. RISING / FALLING QUADRANT ===================== */

  function renderQuadrant(host, width) {
    host.textContent = "";
    var rows = S.tech.signals.tech_all;
    var def = S.tech.signals.definitions;
    var y0 = def.base_year, y1 = def.latest_full_year;

    var m = { t: 18, r: 22, b: 46, l: 58 };
    var W = Math.max(640, width), H = 430;
    var iw = W - m.l - m.r, ih = H - m.t - m.b;

    /* x domain derived from the rows, snapped to the 1-3-10 grid the axis is
       ticked on. A technology that fell to exactly 0% has no place on a log
       axis, so the floor sits a grid step below the smallest REAL share and the
       zeros are pinned there and named. Nothing is clamped out of sight. */
    var shares = rows.map(function (r) { return r.share1; });
    var nonZero = shares.filter(function (v) { return v > 0; });
    var minNZ = nonZero.length ? Math.min.apply(null, nonZero) : 0.001;
    var maxSh = shares.length ? Math.max.apply(null, shares) : 0.3;
    var XMIN = snap13(minNZ, -1), XMAX = snap13(maxSh, +1);
    // a point sitting exactly on an edge is half-clipped, and the pinned zeros
    // would land on top of the smallest real one — step the edge out instead
    if (XMIN >= minNZ) XMIN = snap13(minNZ * 0.99, -1);
    if (XMAX <= maxSh) XMAX = snap13(maxSh * 1.01, +1);
    if (!(XMAX > XMIN)) { XMIN = minNZ / 3; XMAX = minNZ * 3; }
    var x = logScale(XMIN, XMAX, m.l, m.l + iw);
    var ds = rows.map(function (r) { return r.d; });
    var dmax = Math.max.apply(null, ds), dmin = Math.min.apply(null, ds);
    var pad = (dmax - dmin) * 0.08;
    var y = scale(dmin - pad, dmax + pad, m.t + ih, m.t);

    var maxN = Math.max.apply(null, rows.map(function (r) { return r.n1; })) || 1;
    var rad = function (n) { return 3.2 + 8.5 * Math.sqrt(n / maxN); };

    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H,
                          role: "img", "aria-label": "Technology share in " + y1 + " against change since " + y0 });

    // y gridlines in percentage points
    ticks(dmin - pad, dmax + pad, 6).forEach(function (v) {
      svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(v), y2: y(v),
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: m.l - 8, y: y(v) + 3.5, "text-anchor": "end",
                                   fill: C.ink2, "font-size": 10.5 },
                         T((v > 0 ? "+" : "") + (v * 100).toFixed(0) + "pp")));
    });
    // x log ticks — generated from the derived domain, never a fixed list
    logTicks13(XMIN, XMAX).forEach(function (v) {
      svg.appendChild(sv("line", { x1: x(v), x2: x(v), y1: m.t, y2: m.t + ih,
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: x(v), y: H - m.b + 16, "text-anchor": "middle",
                                   fill: C.ink2, "font-size": 10.5 }, T(pctTick(v))));
    });
    // the zero rule — the line that splits "growing" from "shrinking"
    svg.appendChild(sv("line", { x1: m.l, x2: m.l + iw, y1: y(0), y2: y(0),
                                 stroke: C.axis, "stroke-width": 1.5 }));
    svg.appendChild(sv("text", { x: m.l + 4, y: y(0) - 7, "text-anchor": "start",
                                 fill: C.ink2, "font-size": 10.5 }, T("no change since " + y0)));

    // quadrant captions — the whole point of the chart
    svg.appendChild(sv("text", { x: m.l + iw - 4, y: m.t + 14, "text-anchor": "end",
                                 fill: C.ink2, "font-size": 11, "font-weight": 600, opacity: .85 },
                       T("BIG AND GROWING")));
    svg.appendChild(sv("text", { x: m.l + iw - 4, y: m.t + ih - 6, "text-anchor": "end",
                                 fill: C.ink2, "font-size": 11, "font-weight": 600, opacity: .85 },
                       T("BIG BUT SHRINKING")));

    svg.appendChild(sv("text", {
      x: m.l + iw / 2, y: H - 6, "text-anchor": "middle", fill: C.ink2, "font-size": 11
    }, T("share of " + y1 + " postings (log scale) — denominator: all " +
         num(S.tech.signals.totals.postings[S.tech.signals.totals.years.indexOf(y1)]) + " postings that year")));
    svg.appendChild(sv("text", {
      x: 14, y: m.t + ih / 2, "text-anchor": "middle", fill: C.ink2, "font-size": 11,
      transform: "rotate(-90 14 " + (m.t + ih / 2) + ")"
    }, T("change in share since " + y0 + " (percentage points)")));

    // marks: position carries the sign, colour reinforces it, fill carries
    // significance — so nothing is encoded by hue alone.
    var placed = [];
    var pts = rows.map(function (r) {
      var zero = r.share1 <= 0;
      return { r: r, cx: x(zero ? XMIN : r.share1), cy: y(r.d), rr: rad(r.n1), zero: zero };
    });
    pts.sort(function (a, b) { return b.rr - a.rr; });
    pts.forEach(function (p) {
      var col = p.r.d >= 0 ? C.up : C.down;
      svg.appendChild(sv("circle", {
        cx: p.cx, cy: p.cy, r: p.rr,
        fill: p.r.sig ? col : "transparent",
        "fill-opacity": p.r.sig ? 0.85 : 0,
        stroke: p.r.sig ? C.surface : col,
        "stroke-width": p.r.sig ? 2 : 1.5,
        "stroke-opacity": p.r.sig ? 1 : 0.85
      }));
    });

    // label the notable points only, with real collision avoidance
    var notable = {};
    function mark(list, n) { list.slice(0, n).forEach(function (r) { notable[r.id] = 1; }); }
    mark(rows.slice().sort(function (a, b) { return b.d - a.d; }), 8);
    mark(rows.slice().sort(function (a, b) { return a.d - b.d; }), 8);
    mark(rows.slice().sort(function (a, b) { return b.share1 - a.share1; }), 8);

    // A candidate box must clear the plot edges, every label already placed, AND
    // every OTHER dot. Testing only against other labels (which is what this did
    // originally) let names such as "AWS" and "FastAPI" land squarely on a
    // neighbouring point — the one collision a reader actually misreads, because
    // it looks like that dot's name.
    function hitsDot(bx, by, bw, bh, self) {
      for (var i = 0; i < pts.length; i++) {
        var q = pts[i];
        if (q === self) continue;
        var nx = Math.max(bx, Math.min(q.cx, bx + bw));
        var ny = Math.max(by, Math.min(q.cy, by + bh));
        var dx = q.cx - nx, dy = q.cy - ny, rr = q.rr + 1.5;
        if (dx * dx + dy * dy < rr * rr) return true;
      }
      return false;
    }
    function fits(bx, by, bw, bh, self) {
      if (bx < m.l || bx + bw > m.l + iw || by < m.t || by + bh > m.t + ih) return false;
      for (var i = 0; i < placed.length; i++) {
        var q = placed[i];
        if (bx < q.x + q.w && bx + bw > q.x && by < q.y + q.h && by + bh > q.y) return false;
      }
      return !hitsDot(bx, by, bw, bh, self);
    }

    // Technologies that reached exactly 0% cannot sit on a log axis, so they are
    // pinned at the floor. They get ONE guaranteed annotation, reserved before any
    // other label competes for the space — the note below quotes this same list, so
    // the prose can never claim a name the chart failed to draw.
    var zeros = pts.filter(function (p) { return p.zero; })
                   .sort(function (a, b) { return a.cy - b.cy; });
    if (zeros.length) {
      var zTop = zeros[0], zBot = zeros[zeros.length - 1];
      if (zeros.length > 1) {
        svg.appendChild(sv("line", {
          x1: zTop.cx, x2: zBot.cx, y1: zTop.cy, y2: zBot.cy,
          stroke: C.ink2, "stroke-width": 1, opacity: .45
        }));
      }
      var zTxt = zeros.map(function (p) { return p.r.label; }).join(" · ") + " — 0% in " + y1;
      var zx = zTop.cx + Math.max(zTop.rr, zBot.rr) + 6;
      var zy = (zTop.cy + zBot.cy) / 2;
      placed.push({ x: zx, y: zy - 6, w: textW(zTxt, 11), h: 12 });
      svg.appendChild(sv("text", { x: zx, y: zy + 3.5, fill: C.ink, "font-size": 11 }, T(zTxt)));
      S._quadZeroLabels = zeros.map(function (p) { return p.r.label; });
    } else {
      S._quadZeroLabels = [];
    }

    pts.filter(function (p) { return !p.zero; }).forEach(function (p) {
      if (!notable[p.r.id]) return;
      var txt = p.r.label;
      var tw = textW(txt, 11), th = 12;
      // right first, then above/below, and only then left — a label sitting to the
      // left of its dot is the easiest one to misattribute.
      var cands = [];
      // Two rings of offsets: the close ring reads as a direct label; the wider
      // ring is the fallback in the crowded middle of the cloud, where a label
      // that has to travel is still better than a label that is dropped.
      [4, 12].forEach(function (pad) {
        cands.push(
          [p.cx + p.rr + pad, p.cy - th / 2],
          [p.cx - tw / 2, p.cy - p.rr - pad + 1 - th],
          [p.cx - tw / 2, p.cy + p.rr + pad - 1],
          [p.cx + p.rr + pad, p.cy - p.rr - th],
          [p.cx + p.rr + pad, p.cy + p.rr],
          [p.cx - p.rr - pad - tw, p.cy - th / 2],
          [p.cx - p.rr - pad - tw, p.cy - p.rr - th],
          [p.cx - p.rr - pad - tw, p.cy + p.rr]
        );
      });
      for (var i = 0; i < cands.length; i++) {
        if (fits(cands[i][0], cands[i][1], tw, th, p)) {
          placed.push({ x: cands[i][0], y: cands[i][1], w: tw, h: th });
          svg.appendChild(sv("text", { x: cands[i][0], y: cands[i][1] + th - 2.5,
                                       fill: C.ink, "font-size": 11 }, T(txt)));
          return;
        }
      }
    });

    // nearest-point hover so nobody has to hit a 4px dot dead centre
    var hit = sv("rect", { x: m.l, y: m.t, width: iw, height: ih, fill: "transparent", class: "tvw-hit" });
    var halo = sv("circle", { r: 0, fill: "none", stroke: C.ink, "stroke-width": 1.5, opacity: 0 });
    svg.appendChild(halo);
    hit.addEventListener("pointermove", function (ev) {
      var rect = svg.getBoundingClientRect();
      var px = (ev.clientX - rect.left) * (W / rect.width);
      var py = (ev.clientY - rect.top) * (H / rect.height);
      var best = null, bd = 1e9;
      pts.forEach(function (p) {
        var d = (p.cx - px) * (p.cx - px) + (p.cy - py) * (p.cy - py);
        if (d < bd) { bd = d; best = p; }
      });
      if (!best || bd > 60 * 60) { halo.setAttribute("opacity", 0); untip(); return; }
      halo.setAttribute("cx", best.cx); halo.setAttribute("cy", best.cy);
      halo.setAttribute("r", best.rr + 3.5); halo.setAttribute("opacity", 1);
      var r = best.r;
      tip(ttTitle(r.label) + ttRows([
        [y0 + " share", pct(r.share0, 2) + "  (" + num(r.n0) + " postings)"],
        [y1 + " share", pct(r.share1, 2) + "  (" + num(r.n1) + " postings)"],
        ["Change", pp(r.d)],
        ["95% interval", pp(r.ci95[0]) + " to " + pp(r.ci95[1])],
        ["Clears noise floor", r.sig ? "yes" : "no"],
        ["Remote share " + y1, r.rem1 == null ? "—" : pct(r.rem1, 1) + "  (" + num(r.rem_n1) + "/" + num(r.rem_d1) + ")"],
        ["Category", CAT_LABEL[r.cat] || r.cat]
      ]) + ttNote("Share of ALL postings that year. The interval is a two-proportion " +
                  "normal approximation on a convenience sample — a noise floor, not a " +
                  "confidence statement about the labour market."), ev);
    });
    hit.addEventListener("pointerleave", function () { halo.setAttribute("opacity", 0); untip(); });
    svg.appendChild(hit);

    host.appendChild(svg);
  }

  function quadrantTable() {
    var def = S.tech.signals.definitions;
    var rows = S.tech.signals.tech_all.slice().sort(function (a, b) { return b.d - a.d; })
      .map(function (r) {
        return [
          r.label, CAT_LABEL[r.cat] || r.cat,
          pct(r.share0, 2), pct(r.share1, 2), pp(r.d),
          pp(r.ci95[0]) + " to " + pp(r.ci95[1]),
          r.sig ? "yes" : "no",
          num(r.n0), num(r.n1),
          r.rem1 == null ? "—" : pct(r.rem1, 1)
        ];
      });
    return dataTable([
      { label: "Technology" }, { label: "Category" },
      { label: def.base_year + " share", n: 1 }, { label: def.latest_full_year + " share", n: 1 },
      { label: "Change", n: 1 }, { label: "95% interval", n: 1 }, { label: "Clears floor", n: 1 },
      { label: def.base_year + " n", n: 1 }, { label: def.latest_full_year + " n", n: 1 },
      { label: "Remote share", n: 1 }
    ], rows);
  }

  /* ============================== 4. ROLES =============================== */

  function renderRoleSmalls(host) {
    host.textContent = "";
    var r = S.tech.role;
    var ordered = r.ids.slice().map(function (id) {
      var ps = roleSeries(id);
      var last = null, first = null;
      for (var i = ps.length - 1; i >= 0; i--) if (ps[i].v != null) { last = ps[i]; break; }
      for (var j = 0; j < ps.length; j++) if (ps[j].v != null) { first = ps[j]; break; }
      return { id: id, label: r.labels[id] || id, pts: ps, last: last, first: first,
               delta: (first && last && first !== last) ? last.v - first.v : null };
    }).sort(function (a, b) { return (b.last ? b.last.v : -1) - (a.last ? a.last.v : -1); });

    var maxAll = 0;
    ordered.forEach(function (o) {
      o.pts.forEach(function (p) { if (p.v != null && p.v > maxAll) maxAll = p.v; });
    });
    if (!maxAll) maxAll = 0.01;

    ordered.forEach(function (o) {
      var W = 158, H = 34, m = 2;
      var x = scale(0, o.pts.length - 1, m, W - m);
      var y = scale(0, maxAll, H - m, m);
      var svg = sv("svg", { width: "100%", height: H, viewBox: "0 0 " + W + " " + H,
                            preserveAspectRatio: "none", "aria-hidden": "true" });
      var hatchUrl = addHatch(svg);
      o.pts.forEach(function (p, k) {
        if (!isPartial(S.tech.years[p.i])) return;
        var half = (W - 2 * m) / Math.max(1, o.pts.length - 1) / 2;
        svg.appendChild(sv("rect", { x: x(k) - half, y: 0, width: half * 2, height: H,
                                     fill: hatchUrl }));
      });
      var d = "", pen = false;
      o.pts.forEach(function (p, k) {
        if (p.v == null) { pen = false; return; }
        d += (pen ? "L" : "M") + x(k).toFixed(1) + " " + y(p.v).toFixed(1) + " ";
        pen = true;
      });
      svg.appendChild(sv("path", { d: d.trim(), fill: "none", stroke: C.hybrid,
                                   "stroke-width": 2, "stroke-linejoin": "round",
                                   "stroke-linecap": "round", "vector-effect": "non-scaling-stroke" }));
      if (o.last) {
        svg.appendChild(sv("circle", { cx: x(o.pts.indexOf(o.last)), cy: y(o.last.v), r: 4,
                                       fill: C.remote, stroke: C.surface, "stroke-width": 2,
                                       "vector-effect": "non-scaling-stroke" }));
      }
      var head = el("div", { class: "sm-head" },
        el("span", { class: "v" }, T(o.last ? pct(o.last.v, 1) : "—")),
        el("span", { class: "d", title: o.first
                       ? "change since " + yearLabel(S.tech.years[o.first.i]) : "" },
          T(o.delta == null ? "" : pp(o.delta))));
      var card = el("div", { class: "tvw-smc" },
        el("div", { class: "t", title: o.label }, T(o.label)),
        head,
        svg,
        el("div", { class: "m" }, T(o.last
          ? num(o.last.n) + " of " + num(o.last.d) + " in " + yearLabel(S.tech.years[o.last.i])
          : "no postings")));
      card.addEventListener("pointermove", function (ev) {
        if (!o.first || !o.last) { untip(); return; }
        tip(ttTitle(o.label) + ttRows([
          [yearLabel(S.tech.years[o.first.i]), pct(o.first.v, 1) + "  (" + num(o.first.n) + ")"],
          [yearLabel(S.tech.years[o.last.i]), pct(o.last.v, 1) + "  (" + num(o.last.n) + ")"],
          ["Change", pp(o.delta)]
        ]) + ttNote("Y axis is shared across all " + ordered.length + " roles (0–" +
                    pct(maxAll, 0) + "). " + universeLabel() + ". A posting can carry more " +
                    "than one role, so the panels do not sum to 100%."), ev);
      });
      card.addEventListener("pointerleave", untip);
      host.appendChild(card);
    });
    S._roleOrdered = ordered;
    S._roleMax = maxAll;
  }

  function roleSmallsTable() {
    var ordered = S._roleOrdered || [];
    var cols = [{ label: "Role" }].concat(S.yearIdxs.map(function (yi) {
      return { label: yearLabel(S.tech.years[yi]), n: 1 };
    }));
    var rows = ordered.map(function (o) {
      return [o.label].concat(o.pts.map(function (p) { return p.v == null ? "—" : pct(p.v, 1); }));
    });
    return dataTable(cols, rows);
  }

  function renderDumbbell(host, width) {
    host.textContent = "";
    var roles = S.tech.signals.roles.slice().sort(function (a, b) {
      return (b.rem1 == null ? -1 : b.rem1) - (a.rem1 == null ? -1 : a.rem1);
    });
    var def = S.tech.signals.definitions;
    var yA = def.remote_base_year, yB = def.latest_full_year;

    var rowH = 22, m = { t: 26, r: 96, b: 34, l: 176 };
    var W = Math.max(560, width), H = m.t + roles.length * rowH + m.b;
    var iw = W - m.l - m.r;
    var maxX = 1;
    var x = scale(0, maxX, m.l, m.l + iw);

    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H,
                          role: "img", "aria-label": "Remote share by role, " + yA + " versus " + yB });

    [0, 0.25, 0.5, 0.75, 1].forEach(function (v) {
      svg.appendChild(sv("line", { x1: x(v), x2: x(v), y1: m.t - 8, y2: H - m.b + 4,
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: x(v), y: m.t - 14, "text-anchor": "middle",
                                   fill: C.ink2, "font-size": 10.5 }, T(Math.round(v * 100) + "%")));
    });

    roles.forEach(function (r, i) {
      var cy = m.t + i * rowH + rowH / 2;
      var a = r.rem0, b = r.rem1, hb = r.remhyb1;
      svg.appendChild(sv("text", {
        x: m.l - 10, y: cy + 3.5, "text-anchor": "end", fill: C.ink, "font-size": 11.5
      }, T(r.label + (r.low_support ? " †" : ""))));

      if (a != null && b != null) {
        svg.appendChild(sv("line", { x1: x(Math.min(a, b)), x2: x(Math.max(a, b)), y1: cy, y2: cy,
                                     stroke: "rgba(255,255,255,.20)", "stroke-width": 2,
                                     "stroke-linecap": "round" }));
      }
      if (hb != null && b != null) {
        svg.appendChild(sv("line", { x1: x(b), x2: x(hb), y1: cy, y2: cy,
                                     stroke: C.remote, "stroke-width": 1, opacity: .22 }));
      }
      if (hb != null) {
        svg.appendChild(sv("circle", { cx: x(hb), cy: cy, r: 4.5, fill: "none",
                                       stroke: C.remote, "stroke-width": 1.4, opacity: .75 }));
      }
      if (a != null) {
        svg.appendChild(sv("circle", { cx: x(a), cy: cy, r: 4.5, fill: C.past,
                                       stroke: C.surface, "stroke-width": 2 }));
      }
      if (b != null) {
        svg.appendChild(sv("circle", { cx: x(b), cy: cy, r: 5, fill: C.remote,
                                       stroke: C.surface, "stroke-width": 2 }));
        svg.appendChild(sv("text", { x: m.l + iw + 10, y: cy + 3.5, fill: C.ink, "font-size": 11 },
                           T(pct(b, 0) + "  (" + pp(r.d_rem) + ")")));
      }
      var hit = sv("rect", { x: m.l - 170, y: cy - rowH / 2, width: W - m.l + 170 - 4, height: rowH,
                             fill: "transparent", class: "tvw-hit" });
      hit.addEventListener("pointermove", function (ev) {
        tip(ttTitle(r.label) + ttRows([
          [yA + " fully remote", a == null ? "—" : pct(a, 1) + "  (" + num(r.rem_n0) + "/" + num(r.rem_d0) + ")"],
          [yB + " fully remote", b == null ? "—" : pct(b, 1) + "  (" + num(r.rem_n1) + "/" + num(r.rem_d1) + ")"],
          ["Change", pp(r.d_rem)],
          [yA + " incl. hybrid", r.remhyb0 == null ? "—" : pct(r.remhyb0, 1)],
          [yB + " incl. hybrid", hb == null ? "—" : pct(hb, 1)],
          ["Role share " + def.base_year + " → " + yB, pct(r.share0, 1) + " → " + pct(r.share1, 1)]
        ]) + ttNote("Denominator is the role's own posting count that year, not all postings." +
                    (r.low_support ? " † thin support — read with care." : "")), ev);
      });
      hit.addEventListener("pointerleave", untip);
      svg.appendChild(hit);
    });

    svg.appendChild(sv("text", { x: m.l + iw / 2, y: H - 8, "text-anchor": "middle",
                                 fill: C.ink2, "font-size": 11 },
                       T("share of that role's postings that are fully remote")));
    host.appendChild(svg);
  }

  function dumbbellTable() {
    var def = S.tech.signals.definitions;
    var rows = S.tech.signals.roles.slice().sort(function (a, b) {
      return (b.rem1 == null ? -1 : b.rem1) - (a.rem1 == null ? -1 : a.rem1);
    }).map(function (r) {
      return [
        r.label + (r.low_support ? " †" : ""),
        r.rem0 == null ? "—" : pct(r.rem0, 1), r.rem1 == null ? "—" : pct(r.rem1, 1), pp(r.d_rem),
        r.remhyb0 == null ? "—" : pct(r.remhyb0, 1), r.remhyb1 == null ? "—" : pct(r.remhyb1, 1),
        num(r.rem_d0), num(r.rem_d1),
        pct(r.share0, 1), pct(r.share1, 1)
      ];
    });
    return dataTable([
      { label: "Role" },
      { label: def.remote_base_year + " remote", n: 1 }, { label: def.latest_full_year + " remote", n: 1 },
      { label: "Change", n: 1 },
      { label: def.remote_base_year + " +hybrid", n: 1 }, { label: def.latest_full_year + " +hybrid", n: 1 },
      { label: def.remote_base_year + " postings", n: 1 }, { label: def.latest_full_year + " postings", n: 1 },
      { label: def.base_year + " share", n: 1 }, { label: def.latest_full_year + " share", n: 1 }
    ], rows);
  }

  /* ==================== 5. WHERE CAN YOU WORK FROM? ======================
   * tech.remote_scope.year_counts is the one geographic signal in this payload:
   * the region a posting says it will hire from. Every posting carries at most
   * ONE scope label (hn_trends meta: "remote_scope is a single label"), so the
   * counts in a year partition the postings that stated one, and their sum IS
   * the denominator. That sum is larger than remote_totals — the scope tag is
   * not confined to the strict fully-remote class — so the copy below states
   * both numbers rather than implying the remote count is the base.          */

  function scopeStats() {
    var rs = S.tech.remote_scope && S.tech.remote_scope.year_counts;
    if (!rs) return null;
    var def = S.tech.signals.definitions;
    var i0 = yearIdx(S.tech.years, def.remote_base_year);
    var i1 = yearIdx(S.tech.years, def.latest_full_year);
    if (i0 < 0 || i1 < 0) return null;

    var ids = Object.keys(rs);
    function total(i) {
      var t = 0;
      ids.forEach(function (id) { if (rs[id][i] != null) t += rs[id][i]; });
      return t;
    }
    var d0 = total(i0), d1 = total(i1);
    if (!d1) return null;
    var rows = ids.map(function (id) {
      var n0 = rs[id][i0], n1 = rs[id][i1];
      var s0 = d0 && n0 != null ? n0 / d0 : null;
      var s1 = n1 == null ? null : n1 / d1;
      return { id: id, label: scopeLabel(id), n0: n0, n1: n1, s0: s0, s1: s1,
               d: (s0 == null || s1 == null) ? null : s1 - s0 };
    }).sort(function (a, b) { return (b.s1 == null ? -1 : b.s1) - (a.s1 == null ? -1 : a.s1); });

    return { rows: rows, d0: d0, d1: d1, y0: def.remote_base_year, y1: def.latest_full_year,
             r0: S.tech.remote_totals.year[i0], r1: S.tech.remote_totals.year[i1] };
  }

  /* One measure, one hue: bar LENGTH is the latest-year share (always from
     zero) and a 2px rule marks the same region's share in the base year, so
     "then" is a reference mark on the bar rather than a second competing bar.
     Never a value ramp — these regions are nominal, not ordered.            */
  function renderScopes(host, width) {
    host.textContent = "";
    var st = S._scope;
    if (!st) { host.appendChild(el("div", { class: "tvw-note" },
      T("This payload carries no remote-scope series."))); return; }

    var rows = st.rows;
    var rowH = 24, m = { t: 26, r: 122, b: 30, l: 156 };
    var W = Math.max(560, width), H = m.t + rows.length * rowH + m.b;
    var iw = W - m.l - m.r;
    var maxS = 0;
    rows.forEach(function (r) {
      if (r.s1 != null && r.s1 > maxS) maxS = r.s1;
      if (r.s0 != null && r.s0 > maxS) maxS = r.s0;
    });
    var xt = ticks(0, maxS, 4);
    var xMax = Math.max(maxS, xt[xt.length - 1]) || 1;
    var x = scale(0, xMax, m.l, m.l + iw);

    var svg = sv("svg", { width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "Share of scope-stating postings by region, " + st.y0 + " versus " + st.y1 });

    xt.forEach(function (v) {
      svg.appendChild(sv("line", { x1: x(v), x2: x(v), y1: m.t - 8, y2: H - m.b + 4,
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: x(v), y: m.t - 14, "text-anchor": "middle",
                                   fill: C.ink2, "font-size": 10.5 },
                         T((v * 100).toFixed(0) + "%")));
    });

    var BH = 11;
    rows.forEach(function (r, i) {
      var cy = m.t + i * rowH + rowH / 2;
      svg.appendChild(sv("text", { x: m.l - 10, y: cy + 3.5, "text-anchor": "end",
                                   fill: C.ink, "font-size": 11.5 }, T(r.label)));
      if (r.s1 != null) {
        // 4px rounded data-end, square at the baseline
        var x0 = x(0), x1 = x(r.s1), y0 = cy - BH / 2;
        var rr = Math.min(4, BH / 2, Math.max(0, x1 - x0));
        svg.appendChild(sv("path", {
          d: "M" + x0 + " " + y0 + "H" + (x1 - rr) + "a" + rr + " " + rr + " 0 0 1 " + rr + " " + rr +
             "V" + (y0 + BH - rr) + "a" + rr + " " + rr + " 0 0 1 " + (-rr) + " " + rr + "H" + x0 + "Z",
          fill: C.hybrid
        }));
      }
      if (r.s0 != null) {
        svg.appendChild(sv("rect", { x: x(r.s0) - 1, y: cy - BH / 2 - 3, width: 2, height: BH + 6,
                                     fill: C.remote }));
      }
      if (r.s1 != null) {
        svg.appendChild(sv("text", { x: m.l + iw + 10, y: cy + 3.5, fill: C.ink, "font-size": 11 },
          T(pct(r.s1, 1) + "  (" + (r.d == null ? "—" : pp(r.d)) + ")")));
      }
      var hit = sv("rect", { x: 2, y: cy - rowH / 2, width: W - 6, height: rowH,
                             fill: "transparent", class: "tvw-hit" });
      hit.addEventListener("pointermove", function (ev) {
        tip(ttTitle(r.label) + ttRows([
          [st.y1 + " share", r.s1 == null ? "—" : pct(r.s1, 1) + "  (" + num(r.n1) + " of " + num(st.d1) + ")"],
          [st.y0 + " share", r.s0 == null ? "—" : pct(r.s0, 1) + "  (" + num(r.n0) + " of " + num(st.d0) + ")"],
          ["Change", r.d == null ? "—" : pp(r.d)]
        ]) + ttNote("Denominator is the postings that named a region that year, not all " +
                    "postings. Each posting carries exactly one region label."), ev);
      });
      hit.addEventListener("pointerleave", untip);
      svg.appendChild(hit);
    });

    svg.appendChild(sv("text", { x: m.l + iw / 2, y: H - 6, "text-anchor": "middle",
                                 fill: C.ink2, "font-size": 11 },
      T("share of the " + num(st.d1) + " postings that named a region in " + st.y1)));
    host.appendChild(svg);
  }

  function scopeTable() {
    var st = S._scope;
    if (!st) return dataTable([{ label: "Region" }], []);
    return dataTable([
      { label: "Region (payload scope id)" },
      { label: st.y0 + " share", n: 1 }, { label: st.y1 + " share", n: 1 },
      { label: "Change", n: 1 },
      { label: st.y0 + " postings", n: 1 }, { label: st.y1 + " postings", n: 1 }
    ], st.rows.map(function (r) {
      return [
        r.label + " (" + r.id + ")",
        r.s0 == null ? "—" : pct(r.s0, 1), r.s1 == null ? "—" : pct(r.s1, 1),
        r.d == null ? "—" : pp(r.d),
        r.n0 == null ? "—" : num(r.n0), r.n1 == null ? "—" : num(r.n1)
      ];
    }).concat([[{ text: "All regions", dim: 1 }, "100.0%", "100.0%", "—",
                num(st.d0), num(st.d1)]]));
  }

  /* ====================== 6. WHAT THE DATA SAYS ========================== */

  function claimRow(name, value, detail) {
    return el("div", { class: "tvw-row" },
      el("span", { class: "r-n" }, T(name)),
      el("span", { class: "r-v" }, T(value)),
      el("span", { class: "r-d" }, T(detail)));
  }

  var BIAS_LINE = "Sample: one monthly Hacker News thread, not the US labour market.";

  function saysPanel() {
    var sig = S.tech.signals, def = sig.definitions;
    var y0 = def.base_year, y1 = def.latest_full_year, ry0 = def.remote_base_year;
    var wrap = el("div", { class: "tvw-cards" });

    function techCard(title, list, lead) {
      var c = el("div", { class: "tvw-card" }, el("h4", {}, T(title)),
        el("div", { class: "tvw-sub", style: { fontSize: "11.5px" } }, T(lead)));
      list.slice(0, 8).forEach(function (r) {
        c.appendChild(claimRow(
          r.label,
          pp(r.d),
          pct(r.share0, 2) + " → " + pct(r.share1, 2) + "  ·  " +
          num(r.n0) + " → " + num(r.n1) + " postings  ·  95% " +
          pp(r.ci95[0]) + " to " + pp(r.ci95[1]) + (r.sig ? "" : "  ·  below noise floor")));
      });
      c.appendChild(el("div", { class: "cardnote" }, T(
        "Share of all postings, " + y0 + " → " + y1 + ". Reported only where a technology has at least " +
        sig.min_support + " postings in one of those two years (" + sig.tech_considered +
        " qualify, " + sig.tech_excluded_low_support + " excluded). A zero " + y0 +
        " count means the technology did not appear at all, not that it was rare. " + BIAS_LINE)));
      return c;
    }

    wrap.appendChild(techCard(
      "Rising fastest — what to learn", sig.risers,
      "Biggest gain in share of postings between " + y0 + " and " + y1 + "."));
    wrap.appendChild(techCard(
      "Falling fastest — what is fading", sig.fallers,
      "Biggest loss in share of postings between " + y0 + " and " + y1 + "."));

    /* Which technologies turn up disproportionately in fully-remote ads. Every
       tech_all row ships rem1/rem_n1/rem_d1; nothing here is derived beyond
       reading them, and the all-postings baseline is printed for comparison. */
    var iy = S.tech.years.indexOf(y1);
    var baseline = share(S.tech.remote.year_counts.remote, S.tech.totals.year, iy);
    var remRows = sig.tech_all.filter(function (r) {
      return r.rem1 != null && r.rem_d1 >= sig.min_support;
    }).sort(function (a, b) { return b.rem1 - a.rem1; });
    if (remRows.length) {
      var cT = el("div", { class: "tvw-card" },
        el("h4", {}, T("Most remote-friendly technologies — what to learn")),
        el("div", { class: "tvw-sub", style: { fontSize: "11.5px" } },
          T("Share of each technology's own " + y1 + " postings that are fully remote. " +
            "The all-postings baseline that year is " + pct(baseline, 1) + ".")));
      remRows.slice(0, 8).forEach(function (r) {
        cT.appendChild(claimRow(
          r.label,
          pct(r.rem1, 1),
          num(r.rem_n1) + " of " + num(r.rem_d1) + " postings naming it  ·  " +
          pp(r.rem1 - baseline) + " vs the all-postings baseline  ·  was " +
          (r.rem0 == null ? "—" : pct(r.rem0, 1)) + " in " + ry0));
      });
      cT.appendChild(el("div", { class: "cardnote" }, T(
        "Denominator is the postings that name that technology in " + y1 + ", not all postings; " +
        remRows.length + " of the " + sig.tech_considered + " tracked technologies clear the " +
        sig.min_support + "-posting floor in " + y1 + " and are eligible. High remote share here " +
        "means these employers advertised it remotely — not that the skill is intrinsically remote. " +
        BIAS_LINE)));
      wrap.appendChild(cT);
    }

    var byRemote = sig.roles.slice().sort(function (a, b) {
      return (b.rem1 == null ? -1 : b.rem1) - (a.rem1 == null ? -1 : a.rem1);
    });
    var cR = el("div", { class: "tvw-card" }, el("h4", {}, T("Most remote-friendly roles — what to apply to")),
      el("div", { class: "tvw-sub", style: { fontSize: "11.5px" } },
        T("Share of each role's own " + y1 + " postings that are fully remote.")));
    byRemote.slice(0, 8).forEach(function (r) {
      cR.appendChild(claimRow(
        r.label + (r.low_support ? " †" : ""),
        pct(r.rem1, 1),
        num(r.rem_n1) + " of " + num(r.rem_d1) + " postings  ·  " +
        pct(r.remhyb1, 1) + " including hybrid  ·  was " + pct(r.rem0, 1) + " in " + ry0));
    });
    var thinnest = sig.roles.slice().sort(function (a, b) { return a.rem_d1 - b.rem_d1; })[0];
    cR.appendChild(el("div", { class: "cardnote" }, T(
      "Denominator is the role's own posting count, not all postings — as few as " +
      num(thinnest.rem_d1) + " postings (" + thinnest.label + "), so the raw counts are printed " +
      "beside every share. “Remote” is the strict fully-remote class; the hybrid figure sits " +
      "beside it. " + BIAS_LINE)));
    wrap.appendChild(cR);

    return wrap;
  }

  /* ==================== 7. GROUNDING IN REAL EMPLOYMENT ================== */

  var OEWS_HIGHLIGHT = ["15-1252", "15-2051", "15-1212"];

  /* Build the per-occupation rows once; every OEWS renderer below reads these. */
  function oewsRows() {
    var idx = S.occIndex, g15 = S.g15;
    var years = idx.years;
    var byCode = {};
    g15.occ.forEach(function (o) { if (o.g === "detailed") byCode[o.c] = o; });
    var meta = {};
    idx.occupations.forEach(function (o) { if (o.mg === "15" && o.g === "detailed") meta[o.c] = o; });

    return Object.keys(byCode).map(function (code) {
      var o = byCode[code], mi = meta[code] || {}, us = o.us;
      if (!us) return null;
      var fi = -1, li = -1;
      for (var i = 0; i < us.y.length; i++) {
        if (us.e[i] != null) { if (fi < 0) fi = i; li = i; }
      }
      if (fi < 0) return null;
      var wi = -1;
      for (var j = us.y.length - 1; j >= 0; j--) if (us.w[j] != null) { wi = j; break; }
      var tcSet = {};
      (us.tc || []).forEach(function (t) { tcSet[Array.isArray(t) ? t[t.length - 1] : t] = 1; });
      return {
        code: code, title: o.t, meta: mi, us: us,
        y0: us.y[fi], y1: us.y[li], e0: us.e[fi], e1: us.e[li],
        wYear: wi >= 0 ? us.y[wi] : null, w: wi >= 0 ? us.w[wi] : null,
        wTop: wi >= 0 && tcSet[wi] === 1,
        single: us.y[fi] === us.y[li],
        full: us.y.length === years.length && us.y[0] === years[0],
        span: us.y.length,
        pre: mi.pre, post: mi.post,
        ooh: (mi.s && mi.cat) ? "https://www.bls.gov/ooh/" + mi.cat + "/" + mi.s + ".htm" : null
      };
    }).filter(Boolean).sort(function (a, b) { return b.e1 - a.e1; });
  }

  function ellipsize(s, px, fontPx) {
    if (textW(s, fontPx) <= px) return s;
    var t = s;
    while (t.length > 4 && textW(t + "…", fontPx) > px) t = t.slice(0, -1);
    return t + "…";
  }

  function pctChange(r) {
    return (!r.single && r.e0) ? (r.e1 - r.e0) / r.e0 : null;
  }
  function pctChangeText(ch, dp) {
    if (ch == null) return "—";
    return (ch >= 0 ? "+" : App.fmt.minus) + Math.abs(ch * 100).toFixed(dp == null ? 0 : dp) + "%";
  }

  /* ---- OEWS employment dumbbell: the code's first published year -> latest ----
   * Log x axis: these occupations span 2,220 to 1,654,440 jobs, and a linear axis
   * would collapse everything except Software Developers into one pixel. Each row
   * is drawn ONLY over the years its SOC code actually existed and the span is
   * printed beside it, so a short line is never read as a short history.        */
  function renderOewsDumbbell(host, width, rows) {
    host.textContent = "";
    if (!rows.length) return;

    var W = Math.max(760, width);
    var rowH = 22, m = {
      t: 32, b: 42,
      l: Math.round(clamp(W * 0.26, 176, 320)),   // room for the occupation titles
      r: Math.round(clamp(W * 0.20, 200, 240))    // room for "1,654,440 (+21% since 2021)"
    };
    var H = m.t + rows.length * rowH + m.b;
    var iw = W - m.l - m.r;

    var lo = Infinity, hi = 0;
    rows.forEach(function (r) {
      [r.e0, r.e1].forEach(function (v) {
        if (v == null) return;
        if (v < lo) lo = v;
        if (v > hi) hi = v;
      });
    });
    if (!(hi > 0)) return;
    // Round out to the nearest 1/2/3/5 × 10^k rather than a whole decade: rounding
    // 1,654,440 up to 10,000,000 would leave a third of the plot empty.
    function niceLog(v, up) {
      var dec = Math.pow(10, Math.floor(Math.log10(v))), mant = v / dec;
      var steps = [1, 2, 3, 5, 10];
      if (up) {
        for (var i = 0; i < steps.length; i++) if (mant <= steps[i] + 1e-9) return steps[i] * dec;
        return 10 * dec;
      }
      for (var j = steps.length - 1; j >= 0; j--) if (mant >= steps[j] - 1e-9) return steps[j] * dec;
      return dec;
    }
    lo = niceLog(lo, false);
    hi = niceLog(hi, true);
    var x = logScale(lo, hi, m.l, m.l + iw);

    var svg = sv("svg", {
      width: W, height: H, viewBox: "0 0 " + W + " " + H, role: "img",
      "aria-label": "US employment by computer and mathematical occupation, " +
                    "first published year of the SOC code against the latest year"
    });

    var tickVals = [];
    for (var d = Math.pow(10, Math.floor(Math.log10(lo))); d <= hi + 1e-6; d *= 10) {
      [1, 3].forEach(function (k) {
        var v = d * k;
        if (v >= lo - 1e-6 && v <= hi + 1e-6) tickVals.push(v);
      });
    }
    tickVals.forEach(function (v) {
      svg.appendChild(sv("line", { x1: x(v), x2: x(v), y1: m.t - 10, y2: H - m.b + 4,
                                   stroke: C.grid, "stroke-width": 1 }));
      svg.appendChild(sv("text", { x: x(v), y: m.t - 16, "text-anchor": "middle",
                                   fill: C.ink2, "font-size": 10.5 }, T(compact(v))));
    });

    rows.forEach(function (r, i) {
      var cy = m.t + i * rowH + rowH / 2;
      var tEl = sv("text", { x: m.l - 10, y: cy + 3.5, "text-anchor": "end",
                             fill: C.ink, "font-size": 11.5 },
                   T(ellipsize(r.title, m.l - 16, 11.5)));
      tEl.appendChild(sv("title", {}, T(r.title + " (" + r.code + ")")));
      svg.appendChild(tEl);

      if (!r.single && r.e0 != null && r.e1 != null) {
        svg.appendChild(sv("line", {
          x1: x(Math.min(r.e0, r.e1)), x2: x(Math.max(r.e0, r.e1)), y1: cy, y2: cy,
          stroke: "rgba(255,255,255,.20)", "stroke-width": 2, "stroke-linecap": "round"
        }));
        svg.appendChild(sv("circle", { cx: x(r.e0), cy: cy, r: 4.5, fill: C.past,
                                       stroke: C.surface, "stroke-width": 2 }));
      }
      svg.appendChild(sv("circle", { cx: x(r.e1), cy: cy, r: 5, fill: C.remote,
                                     stroke: C.surface, "stroke-width": 2 }));

      var ch = pctChange(r);
      svg.appendChild(sv("text", { x: m.l + iw + 10, y: cy + 3.5, fill: C.ink, "font-size": 11 },
        T(num(r.e1) + (ch == null
            ? "   (" + r.y0 + " only)"
            : "   (" + pctChangeText(ch) + " since " + r.y0 + ")"))));

      var hit = sv("rect", { x: 4, y: cy - rowH / 2, width: W - 8, height: rowH,
                             fill: "transparent", class: "tvw-hit" });
      hit.addEventListener("pointermove", function (ev) {
        tip(ttTitle(r.title) + ttRows([
          ["SOC code", r.code],
          ["Code published", r.y0 + (r.single ? " only" : "–" + r.y1) +
                             "  (" + r.span + " of " + S.occIndex.years.length + " years)"],
          ["Employment " + r.y0, r.single ? "—" : num(r.e0)],
          ["Employment " + r.y1, num(r.e1)],
          ["Change", ch == null ? "—"
            : pctChangeText(ch, 1) + "  (" + App.fmt.signed(r.e1 - r.e0, num) + " jobs)"],
          ["Median wage" + (r.wYear ? ", " + r.wYear : ""),
            (r.wTop ? "at or above " : "") + usd(r.w)],
          ["Predecessor SOC 2010 codes", r.pre && r.pre.length ? r.pre.join(", ") : "—"]
        ]) + ttNote("BLS OEWS national estimates. The line spans only the years this SOC code " +
                    "was published — nothing is bridged across the 2018→2019 or " +
                    "2020→2021 code changes, so a change measured over four years is not " +
                    "comparable with one measured over seven." +
                    (r.wTop ? " This wage is top-coded: a censored high value, not a missing one." : "")), ev);
      });
      hit.addEventListener("pointerleave", untip);
      svg.appendChild(hit);
    });

    svg.appendChild(sv("text", { x: m.l + iw / 2, y: H - 10, "text-anchor": "middle",
                                 fill: C.ink2, "font-size": 11 },
      T("US employment (log scale — these occupations span three orders of magnitude)")));
    host.appendChild(svg);
  }

  function oewsSection(host) {
    host.textContent = "";
    S.oewsChartHost = null; S.oewsCurrent = null;
    var idx = S.occIndex, g15 = S.g15, g00 = S.g00;
    if (!idx || !g15) {
      host.appendChild(el("div", { class: "tvw-loading" }, T("Loading BLS employment data…")));
      return;
    }
    var years = idx.years;
    var rows = oewsRows();

    /* --- headline: the whole occupation group ---------------------------- */
    var total = null;
    if (g00) g00.occ.forEach(function (o) { if (o.c === "15-0000" && o.us) total = o.us; });
    var kp = el("div", { class: "tvw-kpis" });
    if (total) {
      var lastI = total.e.length - 1;
      var gr = (total.e[lastI] - total.e[0]) / total.e[0];
      kp.appendChild(kpi("Computer & mathematical jobs", compact(total.e[lastI]),
        "BLS OEWS, May " + total.y[lastI] + ". Was " + compact(total.e[0]) + " in " + total.y[0] +
        " (" + pctChangeText(gr, 1) + ")."));
      kp.appendChild(kpi("Median annual wage", usd(total.w[lastI]),
        "May " + total.y[lastI] + ", all computer & mathematical occupations. Was " +
        usd(total.w[0]) + " in " + total.y[0] + "."));
    }
    OEWS_HIGHLIGHT.forEach(function (code) {
      var r = rows.filter(function (x) { return x.code === code; })[0];
      if (!r) return;
      kp.appendChild(kpi(r.title, compact(r.e1),
        "May " + r.y1 + ". Was " + compact(r.e0) + " in " + r.y0 +
        (r.full ? "" : " — this code was first published in " + r.y0 + " (SOC change)") + "."));
    });
    host.appendChild(kp);

    // A code that stopped being published is a SOC retirement, not a shrinking job.
    // Keep the two apart so the default view is not half made of dead codes.
    var latest = years[years.length - 1];
    var current = rows.filter(function (r) { return r.us.y.indexOf(latest) !== -1; });
    var retired = rows.filter(function (r) { return r.us.y.indexOf(latest) === -1; });

    /* --- chart: how big is it, and which way is it moving ----------------
     * No chart/table toggle here: the table underneath already carries every
     * number in this chart plus the wage, the OOH links and the retired codes,
     * so it IS the table twin — a second, shorter copy would just be noise.   */
    var chartHost = el("div", { class: "tvw-chart" });
    host.appendChild(el("div", { class: "tvw-sechd" },
      el("div", {},
        el("h3", { class: "tvw-sh" }, T("How many people actually hold these jobs")),
        el("div", { class: "tvw-sub" }, T(
          "Every computer & mathematical occupation OEWS still published in May " + latest +
          ", from the first year its SOC code existed to " + latest + ". The right-hand dot is " +
          "today; the left-hand dot is where that code started. A row whose code began after " +
          years[0] + " has a shorter line for that reason alone — not because the job is newer. " +
          "Every value here is also in the table below.")))));
    host.appendChild(legend([
      { kind: "dot", color: C.past, label: "first year the code was published" },
      { kind: "dot", color: C.remote, label: "May " + latest }
    ]));
    host.appendChild(chartHost);
    S.oewsChartHost = chartHost;
    S.oewsCurrent = current;
    renderOewsDumbbell(chartHost, widthOf(host), current);

    /* --- table: the full record, including the retired codes ------------- */
    var mode = S.oewsMode || "top";
    var tbl = el("div", { class: "tvw-tablewrap" });
    function build() {
      tbl.textContent = "";
      var use = mode === "top" ? current.slice(0, 12)
              : mode === "current" ? current
              : current.concat(retired);
      tbl.appendChild(dataTable([
        { label: "Occupation (BLS OEWS)" }, { label: "SOC code" }, { label: "Code published" },
        { label: "Employment, first yr", n: 1 }, { label: "Employment, latest", n: 1 },
        { label: "Change", n: 1 }, { label: "Median wage", n: 1 }
      ], use.map(function (r) {
        var titleCell = r.ooh
          ? { node: el("a", { href: r.ooh, target: "_blank", rel: "noopener" }, T(r.title)) }
          : { text: r.title };
        var ch = pctChange(r);
        return [
          titleCell,
          { text: r.code, dim: 1 },
          { text: r.y0 + (r.single ? " only" : "–" + r.y1) +
                  (r.span < years.length ? " (" + r.span + " of " + years.length + " yrs)" : ""),
            dim: 1 },
          r.single ? { text: "—", dim: 1 } : num(r.e0) + " (" + r.y0 + ")",
          num(r.e1) + " (" + r.y1 + ")",
          ch == null ? { text: "—", dim: 1 } : pctChangeText(ch),
          (r.wTop ? "≥ " : "") + usd(r.w) + (r.wYear ? " (" + r.wYear + ")" : "")
        ];
      })));
    }
    host.appendChild(el("div", { class: "tvw-sechd", style: { marginTop: "8px" } },
      el("div", {},
        el("h3", { class: "tvw-sh" }, T("The same occupations as a table")),
        el("div", { class: "tvw-sub" }, T(
          "The chart above, in full: the SOC code, the exact span it was published over, the " +
          "median wage, and the codes OEWS has since retired. Titles that link go to their " +
          "Occupational Outlook Handbook page.")))));
    var modes = btnGroup([
      { value: "top", label: "Largest 12" },
      { value: "current", label: "All " + current.length + " current codes" },
      { value: "all", label: "Include " + retired.length + " retired codes" }
    ], mode, function (v) { mode = v; S.oewsMode = v; setActive(modes, v); build(); });
    host.appendChild(modes);
    build();
    host.appendChild(tbl);

    var broken = current.filter(function (r) { return !r.full; }).length;
    var linked = current.filter(function (r) { return !!r.ooh; }).length;
    host.appendChild(el("div", { class: "tvw-note" }, T(
      "Sorted by latest published employment. “Current” means the code was still published " +
      "in May " + latest + "; the " + retired.length + " retired codes are 2010-vintage SOC numbers " +
      "OEWS stopped publishing — a code disappearing is a classification change, not a job " +
      "disappearing. " + broken + " of the " + current.length + " current codes do not span all " +
      years.length + " years (" + years[0] + "–" + latest + "): Software Developers is 15-1132 " +
      "in 2018, 15-1256 (combined) in 2019–2020 and 15-1252 from 2021, so “employment, " +
      "first yr” is the first year the CODE existed, not the year the job appeared, and the " +
      "percentage changes are measured over different spans. Nothing is bridged or interpolated " +
      "across a code change. May 2020 is a COVID-affected reference period. A wage shown as " +
      "“≥” is at or above the BLS top code — a censored high value, not missing " +
      "data. " + linked + " of the " + current.length + " codes map to an Occupational Outlook " +
      "Handbook page and are linked; the rest have no OOH counterpart, so there is nothing to link to.")));
  }

  function kpi(label, value, sub, tone) {
    return el("div", { class: "tvw-kpi" },
      el("div", { class: "k-l" }, T(label)),
      el("div", { class: "k-v" + (tone ? " " + tone : "") }, T(value)),
      el("div", { class: "k-s" }, T(sub)));
  }

  /* The three numbers this tab exists to produce, above the fold: what is
     rising, what is falling, and what shows up most often in fully-remote ads.
     All three come straight from signals.tech_all / .risers / .fallers, and each
     prints the raw posting counts underneath so a small base cannot hide. */
  function mostRemoteTech() {
    var sig = S.tech.signals;
    var best = null;
    sig.tech_all.forEach(function (r) {
      if (r.rem1 == null || !(r.rem_d1 >= sig.min_support)) return;
      if (!best || r.rem1 > best.rem1) best = r;
    });
    return best;
  }

  function answerKpis() {
    var sig = S.tech.signals, def = sig.definitions;
    var years = S.tech.years;
    var iy = years.indexOf(def.latest_full_year);
    var baseline = share(S.tech.remote.year_counts.remote, S.tech.totals.year, iy);
    var up = sig.risers[0], dn = sig.fallers[0], rm = mostRemoteTech();
    var row = el("div", { class: "tvw-kpis" });
    if (up) row.appendChild(kpi("Rising fastest · " + up.label, pp(up.d),
      pct(up.share0, 1) + " → " + pct(up.share1, 1) + " of postings, " + def.base_year + " to " +
      def.latest_full_year + ". " + num(up.n0) + " → " + num(up.n1) + " postings.", "up"));
    if (dn) row.appendChild(kpi("Falling fastest · " + dn.label, pp(dn.d),
      pct(dn.share0, 1) + " → " + pct(dn.share1, 1) + " of postings over the same years. " +
      num(dn.n0) + " → " + num(dn.n1) + " postings.", "down"));
    if (rm) row.appendChild(kpi("Most remote-friendly · " + rm.label, pct(rm.rem1, 0),
      "of the " + num(rm.rem_d1) + " " + def.latest_full_year + " postings naming it are fully remote, " +
      "against " + pct(baseline, 0) + " across all postings that year."));
    row.appendChild(kpi("Postings behind this", num(sig.totals.postings.reduce(
      function (a, b) { return a + b; }, 0)),
      years[0] + "–" + years[years.length - 1] + ", one biased thread. Shares are informative; " +
      "the counts are sample support, not hiring."));
    return row;
  }

  /* =============================== MOUNT ================================= */

  function biasBanner() {
    var meta = S.tech.meta, sig = S.tech.signals;
    var tot = sig.totals;
    var iy = tot.years.indexOf("2021"), il = tot.years.length - 1;
    /* Collapsed by default, the way the shell's own intro caveats are: the
       headline sentence always shows, the five specifics are one click away. */
    var b = el("details", { class: "tvw-banner" });
    b.appendChild(el("summary", {}, el("b", {}, T("Read this before you act on anything above.")),
      T(" Hacker News “Who is hiring?” is a biased sample: YC-adjacent startups and " +
        "remote-friendly software companies, not the US labour market. Five specifics →")));
    var ul = el("ul", {});
    [
      "A technology's share of postings is not its share of jobs. It is the share of these " +
        "employers who chose to name it in an ad.",
      "Posting volume collapsed — " + num(tot.postings[iy]) + " postings in 2021 down to " +
        num(tot.postings[il]) + " in " + tot.years[il] + " (partial, " +
        tot.months_observed[il] + " of 12 months). Counts here are sample support, never a hiring indicator. " +
        "Only shares are informative.",
      tot.years[il] + " is a PARTIAL year everywhere it appears on this page and is marked with " +
        "an asterisk and a hatched band. " + tot.years[0] + " is partial too (" +
        tot.months_observed[0] + " months; the threads start in April 2011).",
      "Remote class is inferred from the posting text by a classifier: " +
        (meta.classifier && meta.classifier.heldout_blind_sample
          ? (meta.classifier.heldout_blind_sample.accuracy * 100).toFixed(0) +
            "% on a blind held-out sample of " + meta.classifier.heldout_blind_sample.n + " postings"
          : "see the payload") + ". " + num(meta.dropped_unconfirmed) +
        " comments could not be confirmed as job ads and are excluded, so per-year counts are a floor.",
      "The BLS OEWS figures at the bottom of this page are a different, complementary thing: " +
        "an establishment survey of how many people actually hold each job."
    ].forEach(function (s) { ul.appendChild(el("li", {}, T(s))); });
    b.appendChild(ul);
    return b;
  }

  function kpiRow() {
    var sig = S.tech.signals, def = sig.definitions;
    var years = S.tech.years;
    var rc = S.tech.remote.year_counts, tot = S.tech.totals.year;
    var iLatestFull = years.indexOf(def.latest_full_year);
    var iBase = years.indexOf(def.base_year);
    var iLast = years.length - 1;

    var remNow = share(rc.remote, tot, iLatestFull);
    var remBase = share(rc.remote, tot, iBase);
    var onsiteNow = share(rc.onsite, tot, iLatestFull);
    var onsiteBase = share(rc.onsite, tot, iBase);
    var remoteVals = years.map(function (_, i) { return share(rc.remote, tot, i) || 0; });
    var pk = remoteVals.indexOf(Math.max.apply(null, remoteVals));
    var onsiteVals = years.map(function (_, i) { var v = share(rc.onsite, tot, i); return v == null ? 2 : v; });
    var floor = onsiteVals.indexOf(Math.min.apply(null, onsiteVals));

    var row = el("div", { class: "tvw-kpis" });
    row.appendChild(kpi("Fully remote, " + def.latest_full_year, pct(remNow, 1),
      "of " + num(tot[iLatestFull]) + " tech postings. Was " + pct(remBase, 1) + " in " +
      def.base_year + " — " + pp(remNow - remBase) + "."));
    row.appendChild(kpi("Peak remote", pct(remoteVals[pk], 1),
      "reached in " + years[pk] + ". The share has drifted down since, not collapsed."));
    row.appendChild(kpi("Onsite, " + def.latest_full_year, pct(onsiteNow, 1),
      "down from " + pct(onsiteBase, 1) + " in " + def.base_year + ". Onsite has partly recovered " +
      "from its " + years[floor] + " floor of " + pct(onsiteVals[floor], 1) + "."));
    row.appendChild(kpi("Postings, " + years[iLast] + "*", num(tot[iLast]),
      "*partial year (" + sig.totals.months_observed[iLast] + " of 12 months). Sample support only — " +
      "not a hiring indicator."));
    row.appendChild(kpi("Technologies tracked", num(sig.tech_considered),
      "with at least " + sig.min_support + " postings in " + def.base_year + " or " +
      def.latest_full_year + "; " + sig.tech_excluded_low_support + " more were excluded for thin support."));
    return row;
  }

  function build(root) {
    var sig = S.tech.signals, def = sig.definitions;
    var wrap = el("div", { class: "tvw" });

    /* --- 0. the answer, first ---------------------------------------
     * The four (now five) verdict cards used to sit at y ~ 4,900px, below two
     * screens of preamble. They are what the tab is for, so they open it; the
     * charts underneath are the working that produced them. */
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("What to learn, and what to apply to",
        el("p", {}, T("Which technologies and roles in remote software work are rising or falling. " +
          "Everything above the BLS section at the foot of this page comes from "),
          el("b", {}, T(num(sig.totals.postings.reduce(function (a, b) { return a + b; }, 0)) +
            " Hacker News “Who is hiring?” postings")),
          T(", " + S.tech.years[0] + "–" + S.tech.years[S.tech.years.length - 1] +
            ", each classified for work arrangement, role and technologies mentioned. " +
            "The charts below this block are the working behind it."))),
      answerKpis(),
      biasBanner(),
      saysPanel()));

    /* --- filter row (scopes every time series below it) --------------- */
    var filters = el("div", { class: "tvw-sec tvw-filters" });
    var yearsBtns = btnGroup([
      { value: "2018", label: "2018 → now" },
      { value: "2011", label: "Full history (2011 →)" }
    ], S.yearFrom, function (v) { S.yearFrom = v; recomputeYears(); syncHash(); redraw(); setActive(yearsBtns, v); });
    var uniBtns = btnGroup([
      { value: "all", label: "All postings" },
      { value: "remote", label: "Fully-remote postings only" }
    ], S.universe, function (v) { S.universe = v; syncHash(); redraw(); setActive(uniBtns, v); });
    filters.appendChild(el("div", { class: "tvw-fg" },
      el("h3", { class: "tvw-sh" }, T("Years")), yearsBtns));
    filters.appendChild(el("div", { class: "tvw-fg" },
      el("h3", { class: "tvw-sh" }, T("Denominator")), uniBtns));
    filters.appendChild(el("div", { class: "tvw-scope" }, T(
      "Years scopes every time series on this page. Denominator scopes the technology and role " +
      "trend charts — “fully-remote only” re-bases every share on that year's remote " +
      "postings alone. The rising/falling quadrant and the role dumbbell use the fixed comparison " +
      "years the payload ships (" + def.base_year + " vs " + def.latest_full_year + ", " +
      def.remote_base_year + " vs " + def.latest_full_year + " for remote share) and do not move.")));
    wrap.appendChild(filters);

    /* --- 1. composition ----------------------------------------------
     * The column slot is capped at 56px on purpose (see renderComposition), so
     * this chart is ~560px wide however wide the card is. Rather than leave
     * 800px of void beside it, the work-arrangement KPI row — which answers the
     * REMOTE question, not the technology question — lives here, next to the
     * chart it describes, instead of on the landing screen. */
    S.blkComp = chartBlock("comp", compositionTable);
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("How tech postings became remote",
        el("p", {}, T("Every posting is classified fully remote, hybrid, onsite, or not stated. " +
          "Columns are years, each summing to 100% of that year's postings. Colour steps along one " +
          "spectrum — lightest is most remote. This chart always covers all postings; the " +
          "denominator control above does not apply to it.")),
        S.blkComp.toggle),
      el("div", { class: "tvw-split" },
        el("div", {},
          legend([
            { kind: "swatch", color: C.remote, label: "Fully remote" },
            { kind: "swatch", color: C.hybrid, label: "Hybrid" },
            { kind: "swatch", color: C.onsite, label: "Onsite" },
            { kind: "swatch", color: C.unknown, label: "Not stated" },
            { kind: "hatch", label: "partial year (fewer than 12 threads)" }
          ]),
          S.blkComp.chart, S.blkComp.table),
        el("div", { class: "tvw-aside" },
          kpiRow(),
          el("div", { class: "tvw-note" }, T(
            // Plain text: this note is set with textContent, so markup would show through.
            "Three columns are labelled — the first year shown, the peak remote year and the latest " +
            "year — and the number on each is that year's fully-remote share, the lightest segment. " +
            "Hover any column for all four classes with raw counts."))))));

    /* --- 2. technology explorer -------------------------------------- */
    S.blkTech = chartBlock("tech", techLinesTable);
    var pickBody = el("div", { class: "tvw-pbody" });
    var pickCount = el("span", { class: "pc" });
    var resetBtn = el("button", { type: "button", class: "tvw-chip", on: { click: function () {
      S.selected.slice().forEach(function (id) { toggleTech(id); });
      PRESELECT.forEach(function (id) { if (S.tech.tech.labels[id] != null) toggleTech(id); });
      refreshPicker(pickBody); syncPickCount(); syncHash(); redraw();
    } } }, T("Reset to default set"));
    var clearBtn = el("button", { type: "button", class: "tvw-chip", on: { click: function () {
      S.selected.slice().forEach(function (id) { toggleTech(id); });
      refreshPicker(pickBody); syncPickCount(); syncHash(); redraw();
    } } }, T("Clear all"));
    var picker = el("div", { class: "tvw-picker" },
      el("div", { class: "tvw-pickhd" }, pickCount,
        el("div", { class: "tvw-chips" }, resetBtn, clearBtn)),
      pickBody);
    function syncPickCount() {
      pickCount.textContent = "";
      pickCount.appendChild(T(S.selected.length + " of " + S.tech.tech.ids.length +
        " technologies selected · max " + MAX_SERIES));
    }
    S.syncPickCount = syncPickCount;
    var legendHost = el("div", {});
    S.blkTech.legendHost = legendHost;
    S.pickerHost = pickBody;
    buildPicker(pickBody, function () { refreshPicker(pickBody); syncPickCount(); syncHash(); redraw(); });
    syncPickCount();
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("Technology trends",
        el("p", {}, T("Share of postings naming each technology, by year. Pick any combination — " +
          "up to " + MAX_SERIES + " at once, because past eight no two colours stay distinguishable. " +
          "A posting counts once per technology however many times it names it. Lines are " +
          "direct-labelled at their right-hand end.")),
        S.blkTech.toggle),
      picker, legendHost, S.blkTech.chart, S.blkTech.table,
      el("div", { class: "tvw-note" }, T(
        "Denominator: " + (S.universe === "remote"
          ? "postings in the strict fully-remote class that year"
          : "all postings that year") + ". Hatched bands are partial years."))));
    S.techNote = wrap.lastChild.lastChild;

    /* --- 3. quadrant -------------------------------------------------- */
    S.blkQuad = chartBlock("quad", quadrantTable);
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("Big and growing, or big and shrinking",
        el("p", {}, T("Horizontal: how much of " + def.latest_full_year + "'s postings name it. " +
          "Vertical: how that share moved since " + def.base_year + ". Top right is big and growing; " +
          "bottom right is big but shrinking. Dot size is the number of " + def.latest_full_year +
          " postings behind the point — sample support, not job counts.")),
        S.blkQuad.toggle),
      legend([
        { kind: "dot", color: C.up, label: "gaining share" },
        { kind: "dot", color: C.down, label: "losing share" },
        { kind: "ring", color: C.ink2, label: "hollow = change does not clear the noise floor" }
      ]),
      S.blkQuad.chart, S.blkQuad.table,
      el("div", { class: "tvw-note" }, T(
        "Only technologies with at least " + sig.min_support + " postings in " + def.base_year +
        " or " + def.latest_full_year + " are plotted (" + sig.tech_considered + " of " +
        S.tech.tech.ids.length + "; " + sig.tech_excluded_low_support + " excluded for thin support). " +
        "The x axis is logarithmic because shares span three orders of magnitude; " +
        (function () {
          var z = sig.tech_all.filter(function (r) { return r.share1 <= 0; })
                    .map(function (r) { return r.label; });
          return z.length
            ? z.join(" and ") + " reached 0% in " + def.latest_full_year +
              " and " + (z.length > 1 ? "are" : "is") + " pinned at the axis floor and named. "
            : "";
        })() +
        "The 95% interval in the tooltip is a two-proportion normal approximation on a convenience " +
        "sample — treat it as a noise floor, not as evidence about the labour market. " +
        "Position, not colour, carries the direction; colour only reinforces it."))));

    /* --- 4. roles ----------------------------------------------------- */
    S.blkRoles = chartBlock("roles", roleSmallsTable);
    var smHost = el("div", { class: "tvw-sm" });
    S.roleSmallHost = smHost;
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("Is the role growing?",
        el("p", {}, T("Share of postings by role, all " + S.tech.role.ids.length +
          " roles on a shared vertical scale so the panels are comparable. The big number is the " +
          "latest year. A posting can carry more than one role, so these do not sum to 100%.")),
        S.blkRoles.toggle),
      smHost, S.blkRoles.chart, S.blkRoles.table,
      el("div", { class: "tvw-note" }, T(
        "All " + S.tech.role.ids.length + " panels share one vertical scale (0 to the largest " +
        "role share in the window), so a flat panel really is a small, steady role — not a " +
        "zoomed-out one. The figure beside each title is the change since " +
        S.tech.years[S.yearIdxs[0]] + ", which the shared scale can hide."))));
    S.roleScaleNote = wrap.lastChild.lastChild;
    S.blkRoles.also = smHost;                // small multiples live in smHost
    S.blkRoles.chart.style.display = "none";

    S.blkDumb = chartBlock("dumb", dumbbellTable);
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("Can you do it remotely?",
        el("p", {}, T("Fully-remote share of each role's own postings, " + def.remote_base_year +
          " versus " + def.latest_full_year + ". Sorted by where it stands now. These two years are " +
          "fixed by the payload and are not affected by the controls above.")),
        S.blkDumb.toggle),
      legend([
        { kind: "dot", color: C.past, label: def.remote_base_year },
        { kind: "dot", color: C.remote, label: def.latest_full_year },
        { kind: "ring", color: C.remote, label: def.latest_full_year + " including hybrid" }
      ]),
      S.blkDumb.chart, S.blkDumb.table,
      el("div", { class: "tvw-note" }, T(
        "The right-hand figure is the " + def.latest_full_year + " remote share and its change since " +
        def.remote_base_year + ". Denominators differ enormously between roles — " +
        (function () {
          var rs = sig.roles.slice().sort(function (a, b) { return a.rem_d1 - b.rem_d1; });
          var flagged = sig.roles.filter(function (r) { return r.low_support; });
          return num(rs[0].rem_d1) + " postings behind " + rs[0].label + " against " +
            num(rs[rs.length - 1].rem_d1) + " behind " + rs[rs.length - 1].label + " — " +
            "so the thin rows move a lot on a handful of ads. " +
            (flagged.length
              ? "† marks the " + flagged.length + " the payload flags as thin support."
              : "The payload flags none of them as low support, but read the small ones with care anyway.");
        })()))));

    /* --- 5. where can you work from ----------------------------------- */
    S._scope = scopeStats();
    if (S._scope) {
      S.blkScope = chartBlock("scope", scopeTable);
      var st = S._scope;
      var topScope = st.rows[0], globalRow = null;
      st.rows.forEach(function (r) { if (r.id === "global") globalRow = r; });
      wrap.appendChild(el("div", { class: "tvw-sec" },
        sectionHead("And where can you work from?",
          el("p", {}, T("A remote job is not automatically an open one. Of the postings whose " +
            "text named the region they hire from, this is how that region breaks down in " +
            st.y1 + ", against " + st.y0 + ". Each posting carries exactly one region label, " +
            "so the bars are a composition and sum to 100%.")),
          S.blkScope.toggle),
        legend([
          { kind: "sw", color: C.hybrid, label: st.y1 + " share" },
          { kind: "vrule", color: C.remote, label: st.y0 + " share (reference mark)" }
        ]),
        S.blkScope.chart, S.blkScope.table,
        el("div", { class: "tvw-note" }, T(
          "Denominator: the " + num(st.d1) + " postings that named a region in " + st.y1 +
          " (" + num(st.d0) + " in " + st.y0 + "). That is more than the " + num(st.r1) +
          " postings classified fully remote that year, so the region tag is not confined to " +
          "the strict remote class — hybrid postings that name a region are counted here too. " +
          "Postings that named no region are not in the denominator at all. " +
          (globalRow && globalRow.d != null && globalRow.d < 0 && topScope.id === "us"
            ? "Read the two ends together: “" + topScope.label + "” is " + pct(topScope.s1, 0) +
              " and " + pp(topScope.d) + " since " + st.y0 + ", while “" + globalRow.label +
              "” is " + pp(globalRow.d) + " — within this sample, remote postings became more " +
              "geographically restricted, not less. "
            : "") +
          "These two years are fixed by the payload and are not affected by the controls above."))));
    }

    /* --- 7. OEWS grounding -------------------------------------------- */
    var oewsHost = el("div", { class: "tvw-stack" });
    S.oewsHost = oewsHost;
    wrap.appendChild(el("div", { class: "tvw-sec" },
      sectionHead("Now the real labour market",
        el("p", {}, T("Everything above is what a self-selecting set of startups "),
          el("b", {}, T("advertised")),
          T(". Below is BLS OEWS: an establishment survey of how many people actually "),
          el("b", {}, T("hold")),
          T(" these jobs, and what the median one is paid. The two answer different questions and " +
            "should be read together — Hacker News shows demand fashion at the frontier, OEWS " +
            "shows the size and pay of the occupation. OEWS runs to May 2024 and is not remote-specific."))),
      oewsHost));

    /* --- method ------------------------------------------------------- */
    var m = S.tech.meta;
    var method = el("div", { class: "tvw-sec" }, sectionHead("Method and limits"));
    /* Two columns: a single 78ch list in a 1,344px card is half a page of void. */
    var colA = el("ul", { class: "tvw-sub", style: { margin: "0 0 0 16px" } });
    var colB = el("ul", { class: "tvw-sub", style: { margin: "0 0 0 16px" } });
    var items = (m.bias || []).slice();
    [def.share, def.remote_share_of_tech, def.remote_share_of_role, def.min_support,
     def.ci95, def.counts_warning].forEach(function (s) { if (s) items.push(s); });
    items.push("Source files: explore/data/tech.json (from data/hn_trends.json + " +
      "data/hn_taxonomy.json), explore/data/occ_index.json, explore/data/series_g00.json and " +
      "explore/data/series_g15.json (from data/oews_national.json + data/oews_state.json).");
    var half = Math.ceil(items.length / 2);
    items.forEach(function (t, i) {
      (i < half ? colA : colB).appendChild(el("li", {}, T(t)));
    });
    method.appendChild(el("div", { class: "tvw-cols2" }, colA, colB));
    wrap.appendChild(method);

    root.appendChild(wrap);
    S.wrap = wrap;
  }

  /* --------------------------------------------------------- year window */

  function recomputeYears() {
    var from = S.yearFrom;
    S.yearIdxs = [];
    S.tech.years.forEach(function (y, i) { if (+y >= +from) S.yearIdxs.push(i); });
    if (!S.yearIdxs.length) S.yearIdxs = S.tech.years.map(function (_, i) { return i; });
  }

  /* ------------------------------------------------------------- redraw */

  function widthOf(node) {
    var w = node && node.clientWidth ? node.clientWidth : 0;
    return w > 40 ? w : 900;
  }

  function redraw() {
    if (!S || !S.wrap) return;
    renderComposition(S.blkComp.chart, widthOf(S.blkComp.chart));
    S.blkComp.refreshTable();

    S.blkTech.legendHost.textContent = "";
    S.blkTech.legendHost.appendChild(legend(S.selected.map(function (id) {
      return { kind: "line", color: C.cat[S.slotOf[id] % C.cat.length],
               label: S.tech.tech.labels[id] || id };
    }).concat(S.selected.length ? [] : [{ kind: "line", color: C.ink2, label: "pick a technology below" }])));
    renderTechLines(S.blkTech.chart, widthOf(S.blkTech.chart));
    S.blkTech.refreshTable();
    if (S.techNote) {
      // Spell out the denominator RANGE, not just the latest year: on the
      // fully-remote universe the early years rest on a few dozen ads and the
      // lines swing wildly for reasons that have nothing to do with technology.
      var dens = S.universe === "remote" ? S.tech.remote_totals.year : S.tech.totals.year;
      var lo = null, hi = null, loY = null, hiY = null;
      S.yearIdxs.forEach(function (yi) {
        var v = dens[yi];
        if (v == null) return;
        if (lo == null || v < lo) { lo = v; loY = S.tech.years[yi]; }
        if (hi == null || v > hi) { hi = v; hiY = S.tech.years[yi]; }
      });
      S.techNote.textContent = "";
      S.techNote.appendChild(T("Denominator: " + (S.universe === "remote"
        ? "postings in the strict fully-remote class that year"
        : "all postings that year") +
        (lo == null ? "" : " — from " + num(lo) + " in " + yearLabel(loY) +
          " to " + num(hi) + " in " + yearLabel(hiY) +
          (lo < 250 ? ", so the thin years move several points on a handful of ads" : "")) +
        ". Hatched bands are partial years; a flat line at 0% means the technology " +
        "was named in no posting that year, which is a real zero, not missing data."));
    }
    if (S.roleScaleNote) {
      S.roleScaleNote.textContent = "";
      S.roleScaleNote.appendChild(T(
        "All " + S.tech.role.ids.length + " panels share one vertical scale (0 to the largest " +
        "role share in the window), so a flat panel really is a small, steady role — not a " +
        "zoomed-out one. The figure beside each share is the change since " +
        yearLabel(S.tech.years[S.yearIdxs[0]]) + ", which the shared scale can hide."));
    }

    renderQuadrant(S.blkQuad.chart, widthOf(S.blkQuad.chart));
    S.blkQuad.refreshTable();

    renderRoleSmalls(S.roleSmallHost);
    S.blkRoles.refreshTable();

    renderDumbbell(S.blkDumb.chart, widthOf(S.blkDumb.chart));
    S.blkDumb.refreshTable();

    if (S.blkScope) {
      renderScopes(S.blkScope.chart, widthOf(S.blkScope.chart));
      S.blkScope.refreshTable();
    }

    // The BLS block loads later and does not depend on the controls above, so it is
    // only re-laid-out, never rebuilt — that keeps the table's row scope and the
    // chart/table choice the reader made.
    if (S.oewsChartHost && S.oewsCurrent) {
      renderOewsDumbbell(S.oewsChartHost, widthOf(S.oewsHost), S.oewsCurrent);
    }
  }

  /* ------------------------------------------------------------- lifecycle */

  var resizeTimer = null;
  function onResize() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(redraw, 140);
  }

  function mount(root) {
    var token = {};
    root.textContent = "";
    root.appendChild(el("div", { class: "tvw-loading" }, T("Loading Hacker News hiring data…")));

    S = { token: token, yearFrom: "2018", universe: "all", selected: [], slotOf: {} };

    App.load("tech").then(function (tech) {
      if (!S || S.token !== token) return;
      S.tech = tech;
      /* #tech?from=2011&d=remote&t=python,rust — a chosen comparison is the one
         thing on this tab worth sending to somebody. Unknown ids are dropped
         rather than erroring, and an empty result falls back to the default. */
      var q = App.hashState ? App.hashState.get() : {};
      if (q.from === "2011" || q.from === "2018") S.yearFrom = q.from;
      if (q.d === "remote" || q.d === "all") S.universe = q.d;
      recomputeYears();
      var want = (q.t || "").split(",").filter(function (id) {
        return id && tech.tech.labels[id] != null;
      });
      (want.length ? want : PRESELECT).forEach(function (id) {
        if (tech.tech.labels[id] != null) toggleTech(id);
      });
      root.textContent = "";
      build(root);
      syncHash();
      redraw();
      window.addEventListener("resize", onResize);
      if (window.ResizeObserver) {
        S.ro = new ResizeObserver(onResize);
        S.ro.observe(root);
      }
      // ground it in BLS employment — lazily, after the page is usable
      oewsSection(S.oewsHost);
      Promise.all([App.load("occ_index"), App.load("series_g15"), App.load("series_g00")])
        .then(function (r) {
          if (!S || S.token !== token) return;
          S.occIndex = r[0]; S.g15 = r[1]; S.g00 = r[2];
          oewsSection(S.oewsHost);
        })
        .catch(function (e) {
          if (!S || S.token !== token) return;
          S.oewsHost.textContent = "";
          S.oewsHost.appendChild(el("div", { class: "tvw-note" },
            T("BLS employment data could not be loaded (" + (e && e.message ? e.message : e) + ").")));
        });
    }).catch(function (e) {
      if (!S || S.token !== token) return;
      root.textContent = "";
      root.appendChild(el("div", { class: "tvw-loading" },
        T("Could not load explore/data/tech.json — " + (e && e.message ? e.message : e))));
    });
  }

  function destroy() {
    window.removeEventListener("resize", onResize);
    clearTimeout(resizeTimer);
    if (S && S.ro) { try { S.ro.disconnect(); } catch (e) {} }
    try { App.tooltip.hide(); } catch (e) {}
    S = null;
  }

  App.registerView(VIEW_ID, {
    label: "Tech & roles",
    subtitle: "Remote IT work: which technologies and roles are rising or falling, " +
              "from 94,548 Hacker News “Who is hiring?” postings — grounded against BLS employment",
    mount: mount,
    destroy: destroy
  });
})();
