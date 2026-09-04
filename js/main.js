/* The list page: three registers on one scroll, a tag chip row, and a search
   that spans all three collections.

   Layout contract: this file NEVER appends a direct child of .spread. It only
   sets innerHTML on static containers that already carry their own
   grid-column, so a JS-injected node can never land in the left margin. */
(function () {
  'use strict';

  var esc = TL.escapeHtml;

  var collections = { projects: [], posts: [], foundation: [] };
  var activeTab = 'all';
  var activeTags = [];
  var searchQuery = '';

  var els = {
    chips: document.getElementById('tag-filter-list'),
    search: document.getElementById('search-input'),
    index: document.getElementById('identity-index'),
    status: document.getElementById('result-status'),
    footerYear: document.getElementById('footer-year')
  };

  var SECTIONS = [
    { key: 'projects', base: '/project/', label: 'Projects' },
    { key: 'posts', base: '/post/', label: 'Writing' },
    { key: 'foundation', base: null, label: 'Foundation' }
  ];

  SECTIONS.forEach(function (s) {
    s.section = document.getElementById(s.key + '-section');
    s.list = document.getElementById(s.key + '-list');
    s.empty = document.getElementById(s.key + '-empty');
    s.count = document.getElementById(s.key + '-count');
  });

  /* ------------------------------------------------------------------ data */

  function load() {
    return Promise.all([
      fetchJson('/content/projects/index.json'),
      fetchJson('/content/posts/index.json'),
      fetchJson('/content/foundation/books/index.json'),
      fetchJson('/content/foundation/papers/index.json')
    ]).then(function (r) {
      collections.projects = r[0].map(function (x) { return withKind(x, 'project'); });
      collections.posts = r[1].map(function (x) { return withKind(x, 'post'); });
      collections.foundation = r[2].map(function (x) { return withKind(x, 'book'); })
        .concat(r[3].map(function (x) { return withKind(x, 'paper'); }))
        .sort(byDateDesc);
    });
  }

  function fetchJson(url) {
    return fetch(url).then(function (r) { return r.ok ? r.json() : []; }).catch(function () { return []; });
  }

  function withKind(item, kind) {
    item.kind = kind;
    item.href = kind === 'book' ? '/foundation/book/' + encodeURIComponent(item.slug)
      : kind === 'paper' ? '/foundation/paper/' + encodeURIComponent(item.slug)
        : kind === 'project' ? '/project/' + encodeURIComponent(item.slug)
          : '/post/' + encodeURIComponent(item.slug);
    return item;
  }

  function byDateDesc(a, b) { return String(b.date || '').localeCompare(String(a.date || '')); }

  /* --------------------------------------------------------------- filtering */

  function searchText(item) {
    return [
      item.title, item.excerpt, item.summary, item.venue,
      TL.authors(item).join(' '), (item.tags || []).join(' ')
    ].join(' ').toLowerCase();
  }

  function matches(item) {
    if (activeTags.length) {
      var tags = item.tags || [];
      var all = activeTags.every(function (t) { return tags.indexOf(t) !== -1; });
      if (!all) return false;
    }
    if (!searchQuery) return true;
    return searchText(item).indexOf(searchQuery.toLowerCase()) !== -1;
  }

  /* ------------------------------------------------------------------ chips */

  var TAGS_SHOWN = 8;
  var tagsExpanded = false;

  /* Ranked by how many items carry them, not alphabetically: the useful
     filters surface first and the long tail goes behind a toggle. Eighteen
     chips across three rows was louder than the content they filter. */
  function allTags() {
    var count = {};
    var pool = activeTab === 'all'
      ? collections.projects.concat(collections.posts, collections.foundation)
      : collections[activeTab];
    pool.forEach(function (i) {
      (i.tags || []).forEach(function (t) { count[t] = (count[t] || 0) + 1; });
    });
    return Object.keys(count).sort(function (a, b) {
      return count[b] - count[a] || a.localeCompare(b);
    });
  }

  function renderChips() {
    if (!els.chips) return;
    var tags = allTags();
    var shown = tagsExpanded ? tags : tags.slice(0, TAGS_SHOWN);

    /* An active tag must stay visible even if it sits in the hidden tail. */
    activeTags.forEach(function (t) { if (shown.indexOf(t) === -1) shown.push(t); });

    var html = shown.map(function (t) {
      return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' +
        (activeTags.indexOf(t) !== -1) + '">' + esc(t) + '</button>';
    });

    var hidden = tags.length - shown.length;
    if (hidden > 0 || tagsExpanded) {
      html.push('<button type="button" class="chip chip--more" data-more="1">' +
        (tagsExpanded ? 'Fewer' : '+' + hidden + ' more') + '</button>');
    }
    els.chips.innerHTML = html.join('');
  }

  function toggleTag(tag) {
    var i = activeTags.indexOf(tag);
    if (i === -1) activeTags.push(tag); else activeTags.splice(i, 1);
    renderChips();
    render();
  }

  /* --------------------------------------------------------------- entries */

  /* The year prints only when it differs from the row above: at two 2025
     posts it appears once, and at forty entries the list silently
     self-groups into years with no headings added. */
  function renderEntry(item, prevYear) {
    var year = TL.year(item.date);
    var showYear = year && year !== prevYear;

    var rail = ['<div class="entry-rail">'];
    if (item.kind === 'book' || item.kind === 'paper') {
      rail.push('<span class="entry-meta entry-kind">' + esc(item.kind) + '</span>');
    }
    rail.push('<span class="entry-year">' + (showYear ? esc(year) : '') + '</span>');
    if (item.kind !== 'book' && item.kind !== 'paper') {
      rail.push('<span class="entry-meta">' + esc(TL.railDate(item.date)) + '</span>');
    }
    if (item.readingTime) rail.push('<span class="entry-meta">' + esc(item.readingTime) + '</span>');
    rail.push('</div>');

    var flag = item.live
      ? '<span class="entry-flag">Live</span>'
      : '';

    var body;
    if (item.kind === 'book' || item.kind === 'paper') {
      body = renderSourceBody(item);
    } else {
      body = [
        '<div class="entry-body">',
        '<h3 class="entry-title">' + esc(item.title) + flag + '</h3>',
        item.excerpt ? '<p class="entry-excerpt">' + esc(item.excerpt) + '</p>' : '',
        item.image ? '<figure class="entry-plate"><img src="' + esc(item.image) +
          '" alt="" loading="lazy" decoding="async"></figure>' : '',
        renderTags(item),
        '</div>'
      ].join('');
    }

    return '<li class="entry entry--' + esc(item.kind) + '">' +
      '<a class="entry-link" href="' + esc(item.href) + '"><span class="visually-hidden">' +
      esc(item.title) + '</span></a>' +
      rail.join('') + body + '</li>';
  }

  function renderSourceBody(item) {
    var cover = item.icon
      ? '<img src="' + esc(item.icon) + '" alt="" loading="lazy" decoding="async">'
      : '<span class="cover-plate">' + esc(TL.initials(item.title)) + '</span>';

    var byline = [];
    var people = TL.authors(item).filter(function (a) { return a !== TL.OWNER; });
    if (people.length) byline.push(people.join(', '));
    if (item.venue) byline.push(item.venue);

    return [
      '<div class="entry-body entry-source">',
      '<figure class="cover cover--' + esc(item.kind) + '">' + cover + '</figure>',
      '<div class="source-text">',
      '<h3 class="entry-title">' + esc(item.title) + '</h3>',
      byline.length ? '<p class="entry-byline">' + esc(byline.join(' · ')) + '</p>' : '',
      item.summary ? '<p class="entry-excerpt">' + esc(item.summary) + '</p>' : '',
      item.extent ? '<p class="entry-progress">' + esc(item.extent) + '</p>' : '',
      '</div></div>'
    ].join('');
  }

  function renderTags(item) {
    var tags = (item.tags || []).slice(0, 4);
    if (!tags.length) return '';
    return '<div class="entry-tags">' + tags.map(function (t) {
      return '<button type="button" class="chip" data-tag="' + esc(t) + '" aria-pressed="' +
        (activeTags.indexOf(t) !== -1) + '">' + esc(t) + '</button>';
    }).join('') + '</div>';
  }

  /* ------------------------------------------------------------------ render */

  function render() {
    var total = 0;

    SECTIONS.forEach(function (s) {
      var visible = activeTab === 'all' || activeTab === s.key;
      s.section.classList.toggle('hidden', !visible);
      if (!visible) return;

      var items = collections[s.key].filter(matches);
      total += items.length;

      var prevYear = '';
      s.list.innerHTML = items.map(function (item) {
        var html = renderEntry(item, prevYear);
        var y = TL.year(item.date);
        if (y) prevYear = y;
        return html;
      }).join('');

      s.count.textContent = items.length ? items.length : '';
      s.empty.classList.toggle('hidden', items.length > 0);
      s.list.classList.toggle('hidden', items.length === 0);
    });

    if (els.status) {
      els.status.firstElementChild.textContent =
        (searchQuery || activeTags.length) ? total + ' items match' : '';
    }
  }

  function renderIndex() {
    if (!els.index) return;
    var updated = [].concat(collections.projects, collections.posts, collections.foundation)
      .map(function (i) { return i.date; })
      .filter(Boolean)
      .sort()
      .pop();

    var cells = [
      ['Projects', collections.projects.length],
      ['Writing', collections.posts.length],
      ['Foundation', collections.foundation.length]
    ];
    if (updated) cells.push(['Updated', TL.formatDate(updated, { year: 'numeric', month: 'short' })]);

    els.index.innerHTML = cells.map(function (c) {
      return '<div><dt class="u-label">' + esc(c[0]) + '</dt><dd>' + esc(c[1]) + '</dd></div>';
    }).join('');
  }

  /* --------------------------------------------------------------------- tabs */

  function setTab(tab, push) {
    activeTab = tab;
    activeTags = [];

    document.querySelectorAll('.nav a[data-tab]').forEach(function (a) {
      var on = a.getAttribute('data-tab') === tab;
      a.classList.toggle('active', on);
      if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });

    if (push) {
      var url = tab === 'all' ? '/' : '/?tab=' + tab;
      history.pushState({ tab: tab }, '', url);
    }

    renderChips();
    render();
  }

  /* --------------------------------------------------------------------- init */

  function init() {
    if (els.footerYear) els.footerYear.textContent = new Date().getFullYear();

    var path = window.location.pathname;
    if (/index\.html$/i.test(path)) {
      history.replaceState(null, '', path.replace(/index\.html$/i, '') + window.location.search);
    }

    var tab = new URLSearchParams(window.location.search).get('tab');
    activeTab = (tab === 'projects' || tab === 'posts' || tab === 'foundation') ? tab : 'all';

    load().then(function () {
      annotate();
      renderIndex();
      setTab(activeTab, false);
    });

    if (els.search) {
      els.search.addEventListener('input', function () {
        searchQuery = els.search.value.trim();
        render();
      });
      els.search.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { els.search.value = ''; searchQuery = ''; render(); els.search.blur(); }
      });
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === '/' && document.activeElement !== els.search &&
        !/^(INPUT|TEXTAREA)$/.test(document.activeElement.tagName)) {
        e.preventDefault();
        els.search.focus();
      }
    });

    document.addEventListener('click', function (e) {
      var more = e.target.closest && e.target.closest('.chip[data-more]');
      if (more) { e.preventDefault(); tagsExpanded = !tagsExpanded; renderChips(); return; }

      var chip = e.target.closest && e.target.closest('.chip[data-tag]');
      if (chip) { e.preventDefault(); toggleTag(chip.dataset.tag); return; }

      var nav = e.target.closest && e.target.closest('.nav a[data-tab]');
      if (nav) { e.preventDefault(); setTab(nav.getAttribute('data-tab'), true); }
    });

    /* Back now works across tabs: the old code used replaceState, so three
       tab clicks left one history entry and Back left the site. */
    window.addEventListener('popstate', function () {
      var t = new URLSearchParams(window.location.search).get('tab');
      setTab((t === 'projects' || t === 'posts' || t === 'foundation') ? t : 'all', false);
    });
  }

  /* Derived fields the content files do not carry: how much of a book is
     actually written, and whether a project is hosted here. */
  function annotate() {
    collections.projects.forEach(function (p) {
      if (/^\/project\//.test(String(p.live || ''))) return;
      if (p.liveUrl) p.live = true;
    });

    collections.foundation.forEach(function (s) {
      if (s.kind !== 'book' || !s.slug) return;
      fetch('/content/foundation/books/' + encodeURIComponent(s.slug) + '/toc.json')
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (toc) {
          if (!toc || !toc.flatSections) return;
          s.extent = '1 / ' + toc.flatSections.length + ' sections written';
          render();
        })
        .catch(function () { });
    });
  }

  init();
})();
