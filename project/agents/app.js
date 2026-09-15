/* The Agent Hub: the list of agents, and one detail page per agent. Both
   views render from content/agents/registry.json, which is fetched once —
   every transition after first paint is zero-network.

   Two views, one document, one URL grammar:
     ./                      the register
     ./?domain=<id>          filtered to one domain
     ./?pattern=a,b          filtered by pattern (AND, like the home page tags)
     ./?q=<text>             search
     ./?agent=<slug>         the specimen sheet for one record
   The fragment is reserved for in-sheet anchors and is never used for filter
   state, so a ?agent=…#evaluation link stays pasteable.

   Layout contract, inherited from js/main.js: this file NEVER appends a direct
   child of .spread. It only sets innerHTML on static containers that already
   carry their own grid-column, so a JS-injected node can never land in the
   left margin.

   Honesty contract, enforced here rather than only in the checker:
     - The provenance byline is DERIVED from a fixed map. No record can soften,
       shorten or omit its own attribution, because the string is not authored.
     - A record missing author or origin renders PROVENANCE MISSING rather than
       rendering as if it had none to state.
     - A result recorded with no caveat has its numbers SUPPRESSED. A checker
       can be skipped; a render rule cannot. */
(function () {
  'use strict';

  var esc = TL.escapeHtml;

  /* The byline's third part. Fixed map, never authored per record. */
  var ORIGIN_PHRASE = {
    original: 'original work',
    fork: 'forked, changes listed',
    mirror: 'mirrored unmodified'
  };
  /* The rail word. Deliberately the same weight and colour for every value:
     the register states authorship, it does not grade it. */
  var ORIGIN_WORD = { original: 'Original', fork: 'Forked', mirror: 'Mirrored' };
  var STATUS_WORD = {
    live: 'Live', study: 'Study', archived: 'Archived',
    withdrawn: 'Withdrawn', private: 'Private'
  };

  /* A control appears only when it would do work. */
  var CHIP_MIN_PATTERNS = 3;
  var SEARCH_MIN_RECORDS = 8;

  var EXTERNAL_ICON =
    '<svg class="article-link-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
    '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  var data = null;
  /* Null-prototype: a hand-typed ?domain=constructor would otherwise pass the
     "is this a real id" test and print "no agent in Object yet". */
  var domainById = Object.create(null);
  var patternById = Object.create(null);
  var restoreFocusSlug = '';
  /* Once the search field has appeared it stays: hiding a control the user is
     currently typing in drops their focus to <body>. */
  var searchShown = false;

  var el = {
    register: document.getElementById('register-view'),
    sheet: document.getElementById('sheet-view'),
    error: document.getElementById('reg-error'),

    index: document.getElementById('reg-index'),
    lede: document.getElementById('reg-lede'),
    schemeCount: document.getElementById('scheme-count'),
    scheduleBody: document.getElementById('schedule-body'),
    controls: document.getElementById('reg-controls'),
    chips: document.getElementById('pattern-chips'),
    searchWrap: document.getElementById('search-wrap'),
    search: document.getElementById('search-input'),
    gloss: document.getElementById('pattern-gloss'),
    status: document.getElementById('reg-status'),
    holdingsHead: document.getElementById('holdings-h'),
    holdingsCount: document.getElementById('holdings-count'),
    holdingsNote: document.getElementById('holdings-note'),
    holdingsList: document.getElementById('holdings-list'),
    holdingsEmpty: document.getElementById('holdings-empty'),

    back: document.getElementById('sheet-back'),
    rail: document.getElementById('sheet-rail'),
    kicker: document.getElementById('sheet-kicker'),
    title: document.getElementById('sheet-title'),
    sub: document.getElementById('sheet-sub'),
    prov: document.getElementById('sheet-prov'),
    links: document.getElementById('sheet-links'),
    body: document.getElementById('sheet-body'),
    nav: document.getElementById('sheet-nav'),
    tags: document.getElementById('sheet-tags'),

    footerYear: document.getElementById('footer-year')
  };

  /* ------------------------------------------------------------- helpers */

  function acc(n) {
    var s = String(n == null ? '' : n);
    while (s.length < 3) s = '0' + s;
    return s;
  }

  /* Ids come from the registry, but they end up inside a querySelector, and
     a selector is not HTML — esc() is the wrong tool for it. */
  function cssEscape(s) {
    return (window.CSS && CSS.escape) ? CSS.escape(String(s)) : String(s).replace(/["\\\]]/g, '');
  }

  function agents() { return (data && data.agents) || []; }

  function patternName(id) {
    return (patternById[id] && patternById[id].name) || id;
  }

  function domainName(id) {
    return (domainById[id] && domainById[id].name) || id;
  }

  /* DERIVED, NEVER AUTHORED. Three parts, always in this order, for every
     record — so a mirrored entry is a catalogue record and not an apology,
     and an original one cannot quietly drop its licence. */
  function byline(p) {
    if (!p || !p.author || !p.origin) return 'PROVENANCE MISSING';
    return [
      p.author,
      p.licence || 'licence not stated',
      ORIGIN_PHRASE[p.origin] || p.origin
    ].join(' · ');
  }

  function provSentence(p) {
    if (!p || !p.author || !p.origin) {
      return 'Provenance missing: this record does not state who wrote it or under what licence.';
    }
    var lic = p.licence ? ', ' + p.licence : ', licence not stated';
    if (p.origin === 'original') return 'Original work by ' + p.author + lic + '.';
    if (p.origin === 'fork') {
      return 'Forked from work by ' + p.author + lic + '. The changes are listed under Provenance.';
    }
    return 'Written by ' + p.author + lic +
      '. Mirrored unmodified and listed here — the code is not mine.';
  }

  function hasCaveat(e) { return !!(e && e.caveat && String(e.caveat).trim()); }

  /* A number without its qualification is worse than no number. If a record
     states a result and records no caveat, the numbers do not render at all. */
  function evalLine(a) {
    var e = a.evaluation;
    if (!e) return 'Not evaluated.';
    if (e.headline && !hasCaveat(e)) {
      return 'Evaluation withheld: a result was recorded with no caveat.';
    }
    if (e.short) return e.short;
    if (!e.headline) return 'No published evaluation.';
    return e.headline;
  }

  function demoLink(a) {
    var links = a.links || [];
    for (var i = 0; i < links.length; i++) if (links[i].rel === 'demo') return links[i];
    return null;
  }

  /* One filled surface on the site. Honour primary on the FIRST link that
     declares it and strip it from any later one, so a data error cannot mint
     a second. */
  function renderLinks(links) {
    var seenPrimary = false;
    var html = (links || []).map(function (link) {
      var url = TL.safeUrl(link && link.url);
      if (!url) return '';
      var primary = !!link.primary && !seenPrimary;
      if (primary) seenPrimary = true;
      var external = TL.isExternal(url);
      return '<a class="article-link' + (primary ? ' article-link--primary' : '') +
        '" href="' + esc(url) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        esc(link.label || url) + (external ? EXTERNAL_ICON : '') + '</a>';
    }).join('');
    return html ? '<div class="article-links">' + html + '</div>' : '';
  }

  /* ------------------------------------------------------------- routing */

  function query() { return new URLSearchParams(window.location.search); }

  function activePatterns(q) {
    var raw = (q.get('pattern') || '').split(',');
    var out = [];
    raw.forEach(function (p) {
      p = p.trim();
      if (p && patternById[p] && out.indexOf(p) === -1) out.push(p);
    });
    return out;
  }

  function buildUrl(params) {
    var qs = params.toString();
    return './' + (qs ? '?' + qs : '');
  }

  function stash() {
    history.replaceState({ y: window.scrollY, from: here() }, '', window.location.href);
  }

  function here() { return './' + window.location.search; }

  /* Stash the outgoing entry's scroll offset BEFORE pushing, so Back returns
     to the filtered register at the exact offset it left. `keepScroll` is for
     a filter toggle, which changes the list under a reader who has not asked
     to be moved. */
  function go(params, push, keepScroll) {
    var url = buildUrl(params);
    if (push) {
      stash();
      history.pushState({ y: keepScroll ? window.scrollY : 0, from: here() }, '', url);
      if (!keepScroll) window.scrollTo(0, 0);
    } else {
      history.replaceState({ y: window.scrollY, from: history.state && history.state.from }, '', url);
    }
    render();
  }

  /* The Back link names a destination (the filtered register it came from).
     Walking history is only the same thing when the previous entry IS that
     destination — after prev/next between two sheets, or on a pasted
     ?agent= link, it is not, and the link must honour its own href. */
  function leaveSheet() {
    var slug = query().get('agent');
    if (slug) restoreFocusSlug = slug;
    var target = el.back.getAttribute('href');
    var from = history.state && history.state.from;
    if (from && from === target) {
      stash();
      history.back();
    } else {
      var params = new URLSearchParams(target.replace(/^\.\/\??/, ''));
      go(params, true);
    }
  }

  /* -------------------------------------------------------- the register */

  function matches(a, patterns, domain, text) {
    if (domain && a.domain !== domain) return false;
    for (var i = 0; i < patterns.length; i++) {
      if ((a.patterns || []).indexOf(patterns[i]) === -1) return false;
    }
    if (!text) return true;
    var hay = [
      a.title, a.oneLine, a.limits, a.autonomy,
      (a.tags || []).join(' '),
      (a.patterns || []).map(patternName).join(' '),
      domainName(a.domain),
      a.provenance && a.provenance.author,
      a.stack && a.stack.runtime,
      a.stack && a.stack.framework
    ].join(' ').toLowerCase();
    return hay.indexOf(text.toLowerCase()) !== -1;
  }

  function renderIndexCells() {
    var all = agents();
    var covered = {};
    var origins = { original: 0, fork: 0, mirror: 0 };
    var evaluated = 0;

    all.forEach(function (a) {
      covered[a.domain] = true;
      var o = a.provenance && a.provenance.origin;
      if (origins[o] != null) origins[o]++;
      if (a.evaluation && a.evaluation.headline && hasCaveat(a.evaluation)) evaluated++;
    });

    /* "1 mine · 1 mirrored" — the page counts itself by provenance up front,
       before you have read a single row. The total is not repeated here: the
       Agents section heading already carries it. */
    var TALLY_WORD = { original: 'mine', fork: 'forked', mirror: 'mirrored' };
    var originParts = [];
    ['original', 'fork', 'mirror'].forEach(function (k) {
      if (origins[k]) originParts.push(origins[k] + ' ' + TALLY_WORD[k]);
    });

    var domains = (data.domains || []).length;
    var cells = [
      ['Domains', Object.keys(covered).length + ' of ' + domains],
      ['Origin', originParts.join(' · ') || '—'],
      ['Evaluated', evaluated + ' of ' + all.length]
    ];

    el.index.innerHTML = cells.filter(function (c) { return c[1] !== ''; })
      .map(function (c) {
        return '<div><dt class="u-label">' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
      }).join('');
  }

  /* The scheme is authored data, not derived from the holdings, so a domain
     never disappears when it empties. An empty domain gets no count cell at
     all: a column of dashes would read as a progress bar for work nobody has
     promised. */
  function renderSchedule() {
    var counts = {};
    agents().forEach(function (a) { counts[a.domain] = (counts[a.domain] || 0) + 1; });

    var held = 0;
    var rows = (data.domains || []).map(function (d) {
      var n = counts[d.id] || 0;
      if (n) held++;
      if (!n) {
        /* An empty cell rather than colspan="2": a spanning cell inherits the
           "Held" column header too, so a screen reader in table-navigation
           mode announces the scope note as if it were the count. The cell
           renders as nothing and carries no .schedule-n, so the mobile
           "N held" label does not fire on it either. */
        return '<tr class="schedule-row schedule-row--open">' +
          '<th scope="row">' + esc(d.name) + '</th>' +
          '<td></td>' +
          '<td class="schedule-note">' + esc(d.note) + '</td></tr>';
      }
      return '<tr class="schedule-row">' +
        '<th scope="row"><a href="./?domain=' + encodeURIComponent(d.id) + '" data-domain="' +
        esc(d.id) + '">' + esc(d.name) + '</a></th>' +
        '<td class="schedule-n">' + n + '</td>' +
        '<td class="schedule-note">' + esc(d.note) + '</td></tr>';
    });

    el.scheduleBody.innerHTML = rows.join('');
    el.schemeCount.textContent =
      held + ' of ' + (data.domains || []).length + ' with an agent';
  }

  function renderControls(patterns, text) {
    var inUse = {};
    agents().forEach(function (a) {
      (a.patterns || []).forEach(function (p) { inUse[p] = (inUse[p] || 0) + 1; });
    });
    /* Only patterns something actually uses get a chip. A declared-but-unused
       pattern gets nothing at all — a chip that filters to zero is a dead
       control, and a line announcing it is page furniture. */
    var used = (data.patterns || []).filter(function (p) { return inUse[p.id]; });

    var showChips = used.length >= CHIP_MIN_PATTERNS;
    searchShown = searchShown || agents().length >= SEARCH_MIN_RECORDS || !!text ||
      document.activeElement === el.search;
    var showSearch = searchShown;

    el.chips.innerHTML = showChips ? used.map(function (p) {
      return '<button type="button" class="chip" data-pattern="' + esc(p.id) +
        '" title="' + esc(p.gloss || '') + '" aria-pressed="' +
        (patterns.indexOf(p.id) !== -1) + '">' + esc(p.name) + '</button>';
    }).join('') : '';

    el.searchWrap.classList.toggle('hidden', !showSearch);
    el.controls.classList.toggle('hidden', !showChips && !showSearch);

    /* A pattern's gloss lives in title=, which touch and keyboard-only users
       never see. When exactly one pattern is pressed, print its definition. */
    var only = patterns.length === 1 ? patternById[patterns[0]] : null;
    if (el.gloss) {
      el.gloss.textContent = only && only.gloss ? only.name + ': ' + only.gloss : '';
      el.gloss.classList.toggle('hidden', !(only && only.gloss));
    }
  }

  /* `active` is threaded in rather than read from the URL because a row chip
     is the same toggle as a control-bar chip: one that reports unpressed while
     clicking it would clear the filter is lying about what it does. */
  function renderEntry(a, active) {
    var p = a.provenance || {};
    var flag = demoLink(a) ? '<span class="entry-flag">Live</span>' : '';

    var rail = [
      '<div class="entry-rail">',
      '<span class="entry-meta entry-kind">' + esc(domainName(a.domain)) + '</span>',
      '<span class="entry-year">' + esc(acc(a.no)) + '</span>',
      '<span class="entry-meta">' + esc(ORIGIN_WORD[p.origin] || '—') + '</span>',
      '</div>'
    ].join('');

    var chips = (a.patterns || []).map(function (id) {
      return '<button type="button" class="chip" data-pattern="' + esc(id) +
        '" aria-pressed="' + ((active || []).indexOf(id) !== -1) + '">' +
        esc(patternName(id)) + '</button>';
    }).join('');

    var plate = a.media && a.media.plate
      ? '<figure class="entry-plate"><img src="' + esc(a.media.plate) + '" alt="' +
        esc(a.media.alt || '') + '" loading="lazy" decoding="async"></figure>'
      : '';

    return '<li class="entry entry--agent" data-slug="' + esc(a.slug) + '">' +
      '<a class="entry-link" href="./?agent=' + encodeURIComponent(a.slug) +
      '" data-agent="' + esc(a.slug) + '"><span class="visually-hidden">' +
      esc(a.title) + '</span></a>' + rail +
      '<div class="entry-body">' +
      '<h3 class="entry-title">' + esc(a.title) + flag + '</h3>' +
      '<p class="entry-byline">' + esc(byline(p)) + '</p>' +
      '<p class="entry-excerpt">' + esc(a.oneLine || '') + '</p>' +
      '<p class="entry-eval">' + esc(evalLine(a)) + '</p>' +
      plate +
      (chips ? '<div class="entry-tags">' + chips + '</div>' : '') +
      '</div></li>';
  }

  function renderRegister(focusSlug) {
    var q = query();
    var domain = q.get('domain') || '';
    var patterns = activePatterns(q);
    var text = (q.get('q') || '').trim();

    if (domain && !domainById[domain]) domain = '';

    document.title = 'Agent Register — Tatra Labs';
    el.sheet.classList.add('hidden');
    el.error.classList.add('hidden');
    el.register.classList.remove('hidden');

    var reg = data.register || {};
    if (el.lede) el.lede.textContent = reg.scope || '';
    /* register.opened and register.updated are authored but never rendered:
       no date reaches any page on this site. The checker still uses `updated`
       to catch a register dated before its own newest record. */

    renderIndexCells();
    renderSchedule();
    renderControls(patterns, text);

    /* Never write into the field while it is being typed in: the URL carries
       the trimmed value, so echoing it back would eat the space the user just
       pressed and reset the caret. This line is for first paint and popstate. */
    if (el.search && document.activeElement !== el.search && el.search.value !== text) {
      el.search.value = text;
    }

    var all = agents();
    var shown = all.filter(function (a) { return matches(a, patterns, domain, text); });

    el.holdingsHead.textContent = domain ? domainName(domain) : 'Agents';

    var filtered = !!(domain || patterns.length || text);
    if (!all.length) {
      el.holdingsCount.textContent = '';
    } else if (filtered) {
      el.holdingsCount.textContent = shown.length + ' of ' + all.length;
    } else {
      el.holdingsCount.textContent = all.length;
    }

    /* Filtering to a domain with nothing in it is unreachable from the page —
       an open domain's name is not a link. It is reachable by URL, so it is a
       designed state: the scope note is promoted out of the schedule and into
       the reading column, the way .md-missing is a designed state for an
       unwritten book section. */
    var note = domain && domainById[domain] ? domainById[domain].note : '';
    el.holdingsNote.textContent = note;
    el.holdingsNote.classList.toggle('hidden', !note);

    el.holdingsList.innerHTML = shown.map(function (a) {
      return renderEntry(a, patterns);
    }).join('');
    el.holdingsList.classList.toggle('hidden', shown.length === 0);
    el.holdingsEmpty.classList.toggle('hidden', shown.length > 0);
    if (!shown.length) {
      el.holdingsEmpty.textContent = domain
        ? 'Nothing in ' + domainName(domain) + ' yet.'
        : 'Nothing matches the current filter.';
    }

    /* The site's own live-region idiom (index.html #result-status, written by
       js/main.js): the count and the empty state change silently otherwise. */
    if (el.status) {
      el.status.firstElementChild.textContent = filtered
        ? shown.length + ' of ' + all.length + ' agents match'
        : '';
    }

    if (focusSlug) {
      var row = el.holdingsList.querySelector(
        '[data-slug="' + cssEscape(focusSlug) + '"] .entry-link');
      if (row) row.focus();
    }
  }

  /* ---------------------------------------------------------- the sheet */

  function railRows(a) {
    var p = a.provenance || {};
    var b = a.budget;
    var rows = [
      ['No.', acc(a.no)],
      ['Domain', domainName(a.domain)],
      ['Status', STATUS_WORD[a.status] || a.status || ''],
      ['Origin', ORIGIN_WORD[p.origin] || 'MISSING'],
      ['Licence', p.licence || 'Not stated'],
      ['Framework', (a.stack || {}).framework]
      /* No "Added" row: publication dates are not shown anywhere on this site.
         `added` and `updated` are still authored and still order the register. */
    ];
    if (b) {
      if (b.latency) rows.push(['Latency', b.latency]);
      if (b.cost) rows.push(['Cost', b.cost]);
      if (b.calls) rows.push(['Model calls', b.calls]);
    }

    var html = ['<dl>'];
    rows.filter(function (r) { return r[1]; }).forEach(function (r) {
      html.push('<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>');
    });
    if ((a.patterns || []).length) {
      html.push('<div><dt>Pattern</dt><dd class="rail-tags">' +
        a.patterns.map(function (id) {
          return '<a href="./?pattern=' + encodeURIComponent(id) + '" data-pattern-link="' +
            esc(id) + '">' + esc(patternName(id)) + '</a>';
        }).join('') + '</dd></div>');
    }
    html.push('</dl>');
    return html.join('');
  }

  function list(items) {
    return '<ul>' + (items || []).map(function (i) {
      return '<li>' + esc(i) + '</li>';
    }).join('') + '</ul>';
  }

  function absent(text) { return '<p class="sheet-absent">' + esc(text) + '</p>'; }

  function sectionLoop(a) {
    var out = ['<h2 id="loop">The loop</h2>'];
    var steps = (a.loop && a.loop.steps) || [];
    if (!steps.length) return out.concat(absent('The loop is not documented in this record.')).join('');
    out.push('<ol>' + steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>');
    if (a.loop.note) out.push('<p>' + esc(a.loop.note) + '</p>');
    return out.join('');
  }

  function sectionTools(a) {
    var out = ['<h2 id="tools">Tools &amp; side effects</h2>'];
    if (a.autonomy) out.push('<p>' + esc(a.autonomy) + '</p>');
    var t = a.tools;
    if (!t || !(t.rows || []).length) {
      if (!a.autonomy) out.push(absent('The tool surface is not documented in this record.'));
      return out.join('');
    }
    out.push('<div class="table-wrap"><table><thead><tr>' +
      '<th scope="col">Tool</th><th scope="col">Does</th><th scope="col">Effect</th>' +
      '</tr></thead><tbody>' +
      t.rows.map(function (r) {
        return '<tr><td>' + esc(r.name) + '</td><td>' + esc(r.does) +
          '</td><td>' + esc(r.effect) + '</td></tr>';
      }).join('') + '</tbody></table></div>');
    if (t.note) out.push('<p>' + esc(t.note) + '</p>');
    return out.join('');
  }

  /* The heading is never suppressed. Suppressing it would let an unevaluated
     agent look the same as an evaluated one. */
  function sectionEvaluation(a) {
    var out = ['<h2 id="evaluation">Evaluation</h2>'];
    var e = a.evaluation;
    if (!e) return out.concat(absent('Not evaluated.')).join('');
    if (e.headline && !hasCaveat(e)) {
      return out.concat(absent(
        'Evaluation withheld. A result was recorded for this agent with no caveat, ' +
        'so the register does not print it.')).join('');
    }
    if (e.headline) out.push('<p><strong>' + esc(e.headline) + '</strong></p>');
    if (e.baseline) out.push('<p>' + esc(e.baseline) + '</p>');
    if (e.method) out.push('<p>' + esc(e.method) + '</p>');
    if (e.caveat) out.push('<p>' + esc(e.caveat) + '</p>');
    if (!e.headline && !e.method) out.push(absent('No published evaluation.'));
    return out.join('');
  }

  function sectionBuilt(a) {
    var out = ['<h2 id="built">Built with</h2>'];
    var s = a.stack || {};
    var rows = [];
    if (s.runtime) rows.push('<p>' + esc(s.runtime) + '</p>');
    if (s.framework) rows.push('<p>Framework: ' + esc(s.framework) + '</p>');
    if ((s.models || []).length) {
      rows.push('<p>Models: ' + esc(s.models.join(', ')) + '</p>');
    }
    if ((s.key || []).length) rows.push(list(s.key));
    if ((a.interfaces || []).length) {
      rows.push('<h3>Interfaces</h3>' + list(a.interfaces));
    }
    if (!rows.length) return out.concat(absent('Not documented in this record.')).join('');
    return out.concat(rows).join('');
  }

  function sectionProvenance(a) {
    var p = a.provenance || {};
    var out = ['<h2 id="provenance">Provenance</h2>'];
    var rows = [
      ['Author', p.author],
      ['Licence', p.licence],
      ['Origin', ORIGIN_WORD[p.origin]]
    ];
    if (p.upstream) {
      if (p.upstream.url) rows.push(['Upstream', p.upstream.url]);
      if (p.upstream.mirror) rows.push(['Mirror', p.upstream.mirror]);
      if (p.upstream.commit) rows.push(['Pinned at', p.upstream.commit]);
    }
    if ((p.changes || []).length) rows.push(['Changes', p.changes.join('; ')]);

    var dl = rows.filter(function (r) { return r[1]; }).map(function (r) {
      return '<dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd>';
    }).join('');

    /* The hero's .article-meta already carries provSentence(). This block
       carries what it does not: the contribution, the copyright note, and the
       upstream the record is pinned to. */
    var block = ['<div class="sheet-prov">'];
    if (p.contribution) block.push('<p>' + esc(p.contribution) + '</p>');
    if (p.note) block.push('<p>' + esc(p.note) + '</p>');
    if (dl) block.push('<dl>' + dl + '</dl>');
    block.push('</div>');

    return out.concat(block).join('');
  }

  function sectionLimits(a) {
    return '<h2 id="limits">Limits</h2>' +
      (a.limits ? '<p>' + esc(a.limits) + '</p>' : absent('Not documented in this record.'));
  }

  function renderSheet(a) {
    var q = query();
    var p = a.provenance || {};

    document.title = a.title + ' — Agent Register — Tatra Labs';
    el.register.classList.add('hidden');
    el.error.classList.add('hidden');
    el.sheet.classList.remove('hidden');

    /* The back link returns to the list you came from, filters intact. */
    var back = new URLSearchParams();
    ['domain', 'pattern', 'q'].forEach(function (k) {
      if (q.get(k)) back.set(k, q.get(k));
    });
    el.back.setAttribute('href', buildUrl(back));
    el.back.textContent = q.get('domain')
      ? '← ' + domainName(q.get('domain'))
      : '← All agents';

    el.rail.innerHTML = railRows(a);

    el.kicker.innerHTML = '<a href="./?domain=' + encodeURIComponent(a.domain) +
      '" data-domain="' + esc(a.domain) + '">' + esc(domainName(a.domain)) +
      '</a> · No. ' + esc(acc(a.no));
    /* The record's title links to the record on its own — the canonical link
       to copy, without whatever filter you happened to arrive through. */
    el.title.innerHTML = '<a href="./?agent=' + encodeURIComponent(a.slug) +
      '" data-agent="' + esc(a.slug) + '">' + esc(a.title) + '</a>';
    el.sub.textContent = a.oneLine || '';
    el.sub.classList.toggle('hidden', !a.oneLine);

    /* Authorship stays in the reading column as well as the rail, because on a
       phone the rail relocates and a byline that can scroll away is a byline
       that can be missed. */
    el.prov.textContent = provSentence(p);

    el.links.innerHTML = renderLinks(a.links);

    el.body.innerHTML = [
      sectionLoop(a),
      sectionTools(a),
      sectionEvaluation(a),
      sectionBuilt(a),
      sectionProvenance(a),
      sectionLimits(a)
    ].join('');

    /* Prev / next walk the register in accession order. */
    var all = agents();
    var idx = -1;
    for (var i = 0; i < all.length; i++) if (all[i].slug === a.slug) { idx = i; break; }
    var prev = idx > 0 ? all[idx - 1] : null;
    var next = idx > -1 && idx < all.length - 1 ? all[idx + 1] : null;

    if (!prev && !next) {
      el.nav.classList.add('hidden');
      el.nav.innerHTML = '';
    } else {
      el.nav.classList.remove('hidden');
      /* --only-next is justify-content:flex-end, so it is correct for a
         next-only nav and wrong for a prev-only one. A prev-only nav keeps the
         default space-between, which leaves the single link on the left. */
      el.nav.classList.toggle('foundation-chapter-nav--only-next', !prev && !!next);
      var html = '';
      if (prev) {
        html += '<a class="foundation-chapter-link" href="./?agent=' +
          encodeURIComponent(prev.slug) + '" data-agent="' + esc(prev.slug) + '">← ' +
          esc(acc(prev.no)) + ' ' + esc(prev.title) + '</a>';
      }
      if (next) {
        html += '<a class="foundation-chapter-link" href="./?agent=' +
          encodeURIComponent(next.slug) + '" data-agent="' + esc(next.slug) + '">' +
          esc(acc(next.no)) + ' ' + esc(next.title) + ' →</a>';
      }
      el.nav.innerHTML = html;
    }

    el.tags.innerHTML = (a.tags || []).map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
    el.tags.classList.toggle('hidden', !(a.tags || []).length);

    /* An in-sheet anchor only works once the body exists. */
    var hash = window.location.hash.replace('#', '');
    if (hash) {
      var target = document.getElementById(hash);
      if (target) { target.scrollIntoView(); return; }
    }

    /* This is the site's only same-document view swap, so no browser
       navigation moves the reader for us: the row they activated has just
       been un-rendered and focus would fall to <body>. Put it on the record's
       title, which is the new page's h1. */
    if (el.title && el.title.focus) {
      el.title.setAttribute('tabindex', '-1');
      el.title.focus();
    }
  }

  /* ------------------------------------------------------------- render */

  function render() {
    if (!data) return;
    var focusSlug = restoreFocusSlug;
    restoreFocusSlug = '';

    var q = query();
    var slug = q.get('agent');
    if (slug) {
      var found = null;
      agents().forEach(function (a) { if (a.slug === slug) found = a; });
      if (found) { renderSheet(found); return; }
      /* The URL claimed a record that does not exist. Drop the claim rather
         than showing the register under a lying address — otherwise Escape
         would then try to leave a sheet that was never open. */
      q.delete('agent');
      history.replaceState(history.state, '', buildUrl(q));
    }
    renderRegister(focusSlug);
  }

  function fail(message) {
    el.register.classList.add('hidden');
    el.sheet.classList.add('hidden');
    el.error.classList.remove('hidden');
    el.error.firstElementChild.textContent = message;
  }

  /* --------------------------------------------------------------- init */

  function plain(e) {
    return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
  }

  function init() {
    if (el.footerYear) el.footerYear.textContent = new Date().getFullYear();
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

    document.addEventListener('click', function (e) {
      if (!plain(e)) return;                       /* ctrl-click opens a tab */
      var t = e.target;
      if (!t.closest) return;

      var chip = t.closest('.chip[data-pattern]');
      if (chip) {
        e.preventDefault();
        var q = query();
        var on = activePatterns(q);
        var id = chip.getAttribute('data-pattern');
        var i = on.indexOf(id);
        if (i === -1) on.push(id); else on.splice(i, 1);
        q.delete('agent');
        if (on.length) q.set('pattern', on.join(',')); else q.delete('pattern');
        go(q, true, true);
        /* renderControls rebuilds the chip row wholesale, so the button that
           was just activated no longer exists. Put focus back on its
           replacement rather than dropping it to <body>. */
        var again = el.chips.querySelector('.chip[data-pattern="' + cssEscape(id) + '"]');
        if (again) again.focus();
        return;
      }

      /* The register's own title: clears every filter. */
      var home = t.closest('[data-register-home]');
      if (home) {
        e.preventDefault();
        go(new URLSearchParams(), true);
        return;
      }

      var toAgent = t.closest('[data-agent]');
      if (toAgent) {
        e.preventDefault();
        var qa = query();
        qa.set('agent', toAgent.getAttribute('data-agent'));
        go(qa, true);
        return;
      }

      var toDomain = t.closest('[data-domain]');
      if (toDomain) {
        e.preventDefault();
        var qd = new URLSearchParams();
        qd.set('domain', toDomain.getAttribute('data-domain'));
        go(qd, true);
        return;
      }

      var toPattern = t.closest('[data-pattern-link]');
      if (toPattern) {
        e.preventDefault();
        var qp = new URLSearchParams();
        qp.set('pattern', toPattern.getAttribute('data-pattern-link'));
        go(qp, true);
        return;
      }

      var back = t.closest('#sheet-back');
      if (back) {
        e.preventDefault();
        leaveSheet();
      }
    });

    if (el.search) {
      el.search.addEventListener('input', function () {
        var q = query();
        var v = el.search.value.trim();
        q.delete('agent');
        if (v) q.set('q', v); else q.delete('q');
        go(q, false);                              /* search never pushes */
      });
      el.search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          el.search.value = '';
          var q = query();
          q.delete('q');
          go(q, false);
          el.search.blur();
        }
      });
    }

    /* Escape leaves a sheet by the same route the Back link takes, so the
       keyboard path gets the focus restore the mouse path already had. */
    document.addEventListener('keydown', function (e) {
      if (e.key !== 'Escape') return;
      if (/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) return;
      if (query().get('agent')) leaveSheet();
    });

    window.addEventListener('popstate', function (e) {
      render();
      /* Only restore for an entry this app stamped; another page's entry in
         the same tab owns its own scroll. */
      if (e.state) window.scrollTo(0, e.state.y || 0);
    });

    fetch('/content/agents/registry.json')
      .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
      .then(function (json) {
        data = json;
        (data.domains || []).forEach(function (d) { domainById[d.id] = d; });
        (data.patterns || []).forEach(function (p) { patternById[p.id] = p; });
        (data.agents || []).sort(function (a, b) { return (a.no || 0) - (b.no || 0); });
        /* Keep an offset a bfcache restore may already have put on the entry. */
        var y0 = (history.state && history.state.y) || 0;
        history.replaceState({ y: y0, from: here() }, '', window.location.href);
        render();
        if (y0) window.scrollTo(0, y0);
      })
      .catch(function () {
        fail('This page could not load its data. The source is content/agents/registry.json.');
      });
  }

  init();
})();
