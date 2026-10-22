/* The list page: three registers and the InsightMosaic on one scroll, a tag
   chip row, and a search that spans all four collections.

   Layout contract: this file NEVER appends a direct child of .spread. It only
   sets innerHTML on static containers that already carry their own
   grid-column, so a JS-injected node can never land in the left margin. */
(function () {
  'use strict';

  var esc = TL.escapeHtml;

  var collections = { projects: [], posts: [], mosaic: [], foundation: [] };
  var mosaicKinds = {};      // kind id -> label, authored in content/mosaic/index.json
  var TABS = ['projects', 'posts', 'mosaic', 'foundation'];

  /* The "all" view shows only the latest tiles; the tab shows every one. */
  var MOSAIC_PREVIEW = 6;
  /* A tile this short, with no title, is set large: the mosaic's big stones. */
  var BIG_TILE = 100;
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
    { key: 'mosaic', base: null, label: 'InsightMosaic' },
    { key: 'foundation', base: null, label: 'Foundation' }
  ];

  SECTIONS.forEach(function (s) {
    s.section = document.getElementById(s.key + '-section');
    s.list = document.getElementById(s.key + '-list');
    s.empty = document.getElementById(s.key + '-empty');
    s.count = document.getElementById(s.key + '-count');
  });
  var mosaicMore = document.getElementById('mosaic-more');

  /* ------------------------------------------------------------------ data */

  function load() {
    return Promise.all([
      fetchJson('/content/projects/index.json'),
      fetchJson('/content/posts/index.json'),
      fetchJson('/content/foundation/books/index.json'),
      fetchJson('/content/foundation/papers/index.json'),
      fetchJson('/content/mosaic/index.json')
    ]).then(function (r) {
      collections.projects = r[0].map(function (x) { return withKind(x, 'project'); });
      collections.posts = r[1].map(function (x) { return withKind(x, 'post'); });
      collections.foundation = r[2].map(function (x) { return withKind(x, 'book'); })
        .concat(r[3].map(function (x) { return withKind(x, 'paper'); }))
        .sort(byDateDesc);

      var m = r[4] || {};
      (m.kinds || []).forEach(function (k) { mosaicKinds[k.id] = k.label; });
      collections.mosaic = (m.tiles || []).map(function (t) {
        t.type = 'tile';
        t.href = '/?tab=mosaic#m-' + encodeURIComponent(t.id);
        return t;
      }).sort(function (a, b) { return (b.pin ? 1 : 0) - (a.pin ? 1 : 0) || byDateDesc(a, b); });
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
      item.title, item.excerpt, item.summary, item.venue, item.text,
      item.type === 'tile' ? mosaicKinds[item.kind] || item.kind : '',
      (item.links || []).map(function (l) { return l.label; }).join(' '),
      item.type === 'tile' ? '' : TL.authors(item).join(' '), (item.tags || []).join(' ')
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
      ? collections.projects.concat(collections.posts, collections.mosaic, collections.foundation)
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

  /* Publication dates are deliberately not rendered anywhere on the site.
     `date` is still authored in every index.json and still orders the lists —
     it is simply never shown, so the rail carries only the kind and, for a
     post, its reading time. */
  function renderEntry(item) {
    var rail = ['<div class="entry-rail">'];
    if (item.kind === 'book' || item.kind === 'paper') {
      rail.push('<span class="entry-meta entry-kind">' + esc(item.kind) + '</span>');
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

  /* ----------------------------------------------------------------- mosaic */

  /* A tile's text is plain text with one piece of markup: [label](url) for an
     inline link. Everything else is escaped, and a URL with a scheme we do not
     serve renders as its label alone. Newlines become line breaks. */
  var INLINE_LINK = /\[([^\]]+)\]\(([^)\s]+)\)/g;

  function inlineText(raw) {
    var s = String(raw || ''), out = '', last = 0, m;
    INLINE_LINK.lastIndex = 0;
    while ((m = INLINE_LINK.exec(s))) {
      out += esc(s.slice(last, m.index)) + linkHtml(m[1], m[2], false);
      last = INLINE_LINK.lastIndex;
    }
    return (out + esc(s.slice(last))).replace(/\n/g, '<br>');
  }

  function plainLength(raw) {
    return String(raw || '').replace(INLINE_LINK, '$1').length;
  }

  function linkHtml(label, url, mark) {
    var href = TL.safeUrl(url);
    if (!href) return esc(label);
    var ext = TL.isExternal(href);
    return '<a href="' + esc(href) + '"' +
      (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(label) +
      (ext && mark ? '<span class="tile-ext" aria-hidden="true"> &#8599;</span>' : '') + '</a>';
  }

  function renderTile(t) {
    var big = !t.title && plainLength(t.text) <= BIG_TILE;
    var cls = 'tile' + (big ? ' tile--big' : '') + (t.size === 'wide' ? ' tile--wide' : '') +
      (t.pin ? ' tile--pin' : '');
    var links = (t.links || []).filter(function (l) { return l && l.label && l.url; });
    var tags = (t.tags || []).slice(0, 3);

    return [
      '<article class="' + cls + '" id="m-' + esc(t.id) + '" data-kind="' + esc(t.kind) + '">',
      '<header class="tile-head"><span class="u-label tile-kind">' + esc(mosaicKinds[t.kind] || t.kind) +
        (t.pin ? '<span class="tile-pin">&#183; Pinned</span>' : '') + '</span>',
      '<a class="tile-perma" href="' + esc(t.href) + '" data-perma="' + esc(t.id) +
        '" aria-label="Copy a link to this tile">Link</a></header>',
      t.title ? '<h3 class="tile-title">' + esc(t.title) + '</h3>' : '',
      '<p class="tile-text">' + inlineText(t.text) + '</p>',
      links.length ? '<ul class="tile-links">' + links.map(function (l) {
        return '<li>' + linkHtml(l.label, l.url, true) + '</li>';
      }).join('') + '</ul>' : '',
      tags.length ? '<div class="tile-tags">' + tags.map(function (g) {
        return '<button type="button" class="chip" data-tag="' + esc(g) + '" aria-pressed="' +
          (activeTags.indexOf(g) !== -1) + '">' + esc(g) + '</button>';
      }).join('') + '</div>' : '',
      '</article>'
    ].join('');
  }

  /* Masonry: measure every tile at its natural height in the plain grid, then
     switch the grid to 1px rows and give each tile a row span of its height
     plus the gap. Dense flow drops each tile into the highest free slot, so
     columns stay level and the order still reads newest-first, left to right.
     One column needs none of it. */
  var mosaicEl = document.getElementById('mosaic-list');
  var packedWidth = 0;

  function pack() {
    if (!mosaicEl || !mosaicEl.offsetParent) return;
    var tiles = Array.prototype.slice.call(mosaicEl.children);
    mosaicEl.classList.remove('mosaic--packed');
    tiles.forEach(function (t) { t.style.gridRowEnd = ''; });
    packedWidth = mosaicEl.clientWidth;

    var cs = getComputedStyle(mosaicEl);
    if (cs.gridTemplateColumns.split(' ').length < 2) return;
    var gap = parseFloat(cs.columnGap) || 0;
    var heights = tiles.map(function (t) { return t.getBoundingClientRect().height; });
    mosaicEl.classList.add('mosaic--packed');
    tiles.forEach(function (t, i) { t.style.gridRowEnd = 'span ' + Math.ceil(heights[i] + gap); });
  }

  /* A permalink is /?tab=mosaic#m-<id>. The tile exists only after render,
     so the browser's own jump to the fragment has nothing to land on; this
     marks the tile and scrolls to it once the mosaic is packed. */
  function applyTarget(scroll) {
    document.querySelectorAll('.tile--target').forEach(function (el) { el.classList.remove('tile--target'); });
    var m = /^#m-([a-z0-9-]+)$/.exec(window.location.hash);
    var el = m && document.getElementById('m-' + m[1]);
    if (!el) return;
    el.classList.add('tile--target');
    if (scroll) el.scrollIntoView({ block: 'start' });
  }

  function renderMosaic(s, items) {
    var preview = activeTab === 'all' && !searchQuery && !activeTags.length;
    var shown = preview ? items.slice(0, MOSAIC_PREVIEW) : items;
    s.list.innerHTML = shown.map(renderTile).join('');

    var rest = items.length - shown.length;
    mosaicMore.innerHTML = rest > 0
      ? '<a href="/?tab=mosaic" data-tab="mosaic">All ' + items.length + ' tiles in InsightMosaic &rarr;</a>'
      : '';
    mosaicMore.classList.toggle('hidden', rest <= 0);
    pack();
  }

  /* ------------------------------------------------------------------ render */

  function render() {
    var total = 0;

    SECTIONS.forEach(function (s) {
      /* An empty collection is a group with no items: hidden on the "all"
         view, header included, but its own tab still says it is empty. */
      var visible = activeTab === s.key ||
        (activeTab === 'all' && collections[s.key].length > 0);
      s.section.classList.toggle('hidden', !visible);
      if (!visible) return;

      var items = collections[s.key].filter(matches);
      total += items.length;

      if (s.key === 'mosaic') renderMosaic(s, items);
      else s.list.innerHTML = items.map(renderEntry).join('');

      s.count.textContent = items.length ? items.length : '';
      s.empty.classList.toggle('hidden', items.length > 0);
      s.list.classList.toggle('hidden', items.length === 0);
    });

    if (els.status) {
      els.status.firstElementChild.textContent =
        (searchQuery || activeTags.length) ? total + ' items match' : '';
    }
  }

  /* Counts only. The "Updated <month year>" cell was the last place a
     publication date reached the page. */
  function renderIndex() {
    if (!els.index) return;

    var cells = [
      ['Projects', collections.projects.length],
      ['Writing', collections.posts.length],
      ['InsightMosaic', collections.mosaic.length],
      ['Foundation', collections.foundation.length]
    ];

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
    activeTab = TABS.indexOf(tab) !== -1 ? tab : 'all';

    load().then(function () {
      annotate();
      renderIndex();
      setTab(activeTab, false);
      /* Repack once the webfont has replaced the fallback, since the tiles'
         heights move with it, then honour a tile permalink. */
      return document.fonts && document.fonts.ready;
    }).then(function () {
      pack();
      applyTarget(true);
    });

    /* Tile heights depend on column width only, so repack when it changes. */
    if (mosaicEl && window.ResizeObserver) {
      new ResizeObserver(function () {
        if (mosaicEl.clientWidth !== packedWidth) pack();
      }).observe(mosaicEl);
    }
    window.addEventListener('hashchange', function () { applyTarget(true); });

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

      var perma = e.target.closest && e.target.closest('.tile-perma');
      if (perma && navigator.clipboard && window.isSecureContext) {
        e.preventDefault();
        var url = new URL(perma.getAttribute('href'), window.location.href).href;
        history.replaceState(history.state, '', window.location.pathname + window.location.search +
          '#m-' + perma.getAttribute('data-perma'));
        applyTarget(false);
        navigator.clipboard.writeText(url).then(function () {
          perma.textContent = 'Copied';
          setTimeout(function () { perma.textContent = 'Link'; }, 1600);
        }, function () { window.location.href = url; });
        return;
      }

      /* The nav tabs, and in-page links into a tab ("All 12 tiles ->"). The
         latter also scroll to the section, since they sit far below the top. */
      var nav = e.target.closest && e.target.closest('a[data-tab]');
      if (nav) {
        e.preventDefault();
        setTab(nav.getAttribute('data-tab'), true);
        if (!nav.closest('.nav')) {
          var sec = document.getElementById(nav.getAttribute('data-tab') + '-section');
          if (sec) sec.scrollIntoView({ block: 'start' });
        }
      }
    });

    /* Back now works across tabs: the old code used replaceState, so three
       tab clicks left one history entry and Back left the site. */
    window.addEventListener('popstate', function () {
      var t = new URLSearchParams(window.location.search).get('tab');
      setTab(TABS.indexOf(t) !== -1 ? t : 'all', false);
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
          var total = toc.flatSections.length;
          /* `written` is stamped into toc.json by tools/update_book_extent.py,
             which counts the section files that actually exist. A toc declares
             sections that may not be written yet, so the total alone cannot
             tell us how much of the book is real. */
          var done = typeof toc.written === 'number' ? toc.written : total;
          var noun = total === 1 ? ' section' : ' sections';
          s.extent = done >= total
            ? total + noun
            : done + ' / ' + total + noun + ' written';
          render();
        })
        .catch(function () { });
    });
  }

  init();
})();
