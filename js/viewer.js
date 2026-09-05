/* The reading page. One hero template shared by posts, projects, papers and
   book chapters; one prose container; one owner for the section title. */
(function () {
  'use strict';

  var esc = TL.escapeHtml;

  var path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
  var ROUTES = [
    { re: /^\/post\/([^/]+)$/, kind: 'post', kicker: 'Essay', base: '/content/posts', back: '/?tab=posts', backLabel: 'Writing', readingTime: true },
    { re: /^\/project\/([^/]+)$/, kind: 'project', kicker: 'Project', base: '/content/projects', back: '/?tab=projects', backLabel: 'Projects' },
    { re: /^\/foundation\/book\/([^/]+)$/, kind: 'book', kicker: 'Book', base: '/content/foundation/books', back: '/?tab=foundation', backLabel: 'Foundation' },
    { re: /^\/foundation\/paper\/([^/]+)$/, kind: 'paper', kicker: 'Paper', base: '/content/foundation/papers', back: '/?tab=foundation', backLabel: 'Foundation' }
  ];

  var route = null, slug = null;
  for (var i = 0; i < ROUTES.length; i++) {
    var m = path.match(ROUTES[i].re);
    if (m) { route = ROUTES[i]; slug = decodeURIComponent(m[1]); break; }
  }

  var el = {
    title: document.getElementById('viewer-title'),
    kicker: document.getElementById('viewer-kicker'),
    sub: document.getElementById('foundation-chapter-label'),
    meta: document.getElementById('viewer-meta'),
    content: document.getElementById('viewer-content'),
    tags: document.getElementById('viewer-tags'),
    error: document.getElementById('viewer-error'),
    article: document.getElementById('article'),
    shell: document.getElementById('viewer-shell'),
    toc: document.getElementById('foundation-toc'),
    nav: document.getElementById('foundation-chapter-nav'),
    prev: document.getElementById('foundation-chapter-prev'),
    next: document.getElementById('foundation-chapter-next'),
    back: document.getElementById('viewer-back'),
    rail: document.getElementById('viewer-rail'),
    footerYear: document.getElementById('footer-year')
  };

  if (el.footerYear) el.footerYear.textContent = new Date().getFullYear();

  if (route && el.back) {
    el.back.setAttribute('href', route.back);
    el.back.textContent = '← ' + route.backLabel;
  }

  /* ------------------------------------------------------------- sections */

  var EXTERNAL_ICON =
    '<svg class="article-link-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
    '<polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>';

  function mediaFigure(html, caption) {
    if (!caption) return '<div class="media-wrap">' + html + '</div>';
    return '<figure class="media-wrap media-wrap--captioned">' + html +
      '<figcaption class="media-caption">' + esc(caption) + '</figcaption></figure>';
  }

  /* A markdown section lets a post carry tables, code blocks, lists and math
     without a build step. The parser, sanitiser and KaTeX are the same ones
     the book reader already loads; a document containing one of these
     preloads them before rendering (see the fetch chain at the foot). */
  function mdToHtml(md) {
    if (!window.marked) return '<p>' + esc(md) + '</p>';
    if (typeof marked.setOptions === 'function') {
      marked.setOptions({ gfm: true, mangle: false, headerIds: true });
    }
    var html = marked.parse(String(md));
    return window.DOMPurify ? DOMPurify.sanitize(html) : html;
  }

  function hasMarkdown(data) {
    return ((data && data.content && data.content.sections) || []).some(function (s) {
      return s && s.type === 'markdown';
    });
  }

  function renderLinks(links) {
    var html = links.map(function (link) {
      var url = TL.safeUrl(link && (link.url || link.href));
      if (!url) return '';
      var label = (link && link.label) || url;
      var external = TL.isExternal(url);
      return '<a class="article-link' + (link.primary ? ' article-link--primary' : '') +
        '" href="' + esc(url) + '"' +
        (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' +
        esc(label) + (external ? EXTERNAL_ICON : '') + '</a>';
    }).join('');
    return html ? '<div class="article-links">' + html + '</div>' : '';
  }

  function renderSection(section) {
    var type = section.type || 'text';
    var value = section.value || section.url || '';

    if (type === 'heading') {
      var level = section.level === 3 ? 3 : 2;
      var tag = 'h' + level;
      var id = section.id ? ' id="' + esc(section.id) + '"' : '';
      return '<' + tag + ' class="article-heading"' + id + '>' + esc(value) + '</' + tag + '>';
    }
    if (type === 'text') {
      return String(value).split(/\n+/).map(function (p) {
        return '<p>' + esc(p) + '</p>';
      }).join('');
    }
    if (type === 'image') {
      var src = TL.safeUrl(value);
      if (!src) return '';
      return mediaFigure('<img src="' + esc(src) + '" alt="' + esc(section.alt || '') +
        '" loading="lazy" decoding="async">', section.caption);
    }
    if (type === 'video') {
      var vsrc = TL.safeUrl(value);
      if (!vsrc) return '';
      /* A looping muted clip is an animated screenshot: it plays itself and
         hides the controls. Anything else is a normal video. */
      var clip = !!section.loop && !!section.autoplay;
      var attrs = clip ? ' autoplay loop muted preload="metadata"' : ' controls preload="metadata"';
      var poster = TL.safeUrl(section.poster);
      if (poster) attrs += ' poster="' + esc(poster) + '"';
      return mediaFigure('<video src="' + esc(vsrc) + '"' + attrs + ' playsinline></video>', section.caption);
    }
    if (type === 'embed') {
      var esrc = TL.safeUrl(value);
      if (!esrc) return '';
      return mediaFigure('<iframe src="' + esc(esrc) + '" loading="lazy" allowfullscreen></iframe>', section.caption);
    }
    if (type === 'links') {
      return renderLinks(Array.isArray(value) ? value : []);
    }
    if (type === 'markdown') {
      return mdToHtml(value);
    }
    return '';
  }

  /* ----------------------------------------------------------------- hero */

  function setKicker(text, href) {
    if (!el.kicker) return;
    if (!text) { el.kicker.classList.add('hidden'); return; }
    el.kicker.classList.remove('hidden');
    el.kicker.innerHTML = href
      ? '<a href="' + esc(href) + '">' + esc(text) + '</a>'
      : esc(text);
  }

  function setMeta(parts) {
    if (!el.meta) return;
    var clean = parts.filter(Boolean);
    el.meta.textContent = clean.join('  ·  ');
    el.meta.classList.toggle('hidden', clean.length === 0);
  }

  /* Posts, projects and papers put their metadata in the sticky rail, so the
     margin is populated for the article's full length. Books do not: their
     rail belongs to the table of contents. */
  function fillRail(rows, tags) {
    if (!el.rail) return;
    var kindWords = ['book', 'paper', 'post', 'project', 'essay'];
    var keep = (tags || []).filter(function (t) {
      return kindWords.indexOf(String(t).toLowerCase()) === -1;
    });

    var backTab = route.kind === 'post' ? 'posts' : route.kind === 'project' ? 'projects' : 'foundation';
    var html = ['<dl>'];
    rows.filter(function (r) { return r[1]; }).forEach(function (r) {
      html.push('<div><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></div>');
    });
    if (keep.length) {
      html.push('<div><dt>Tags</dt><dd class="rail-tags">' + keep.map(function (t) {
        return '<a href="/?tab=' + backTab + '">' + esc(t) + '</a>';
      }).join('') + '</dd></div>');
    }
    html.push('</dl>');

    el.rail.innerHTML = html.join('');
    el.rail.classList.remove('hidden');

    /* The hero copies are now redundant. */
    if (el.meta) el.meta.classList.add('hidden');
    if (el.tags) el.tags.classList.add('hidden');
  }

  /* A tag that merely repeats the item's own kind is noise on the page that
     already says what kind it is. */
  function renderTags(tags) {
    if (!el.tags) return;
    var kindWords = ['book', 'paper', 'post', 'project', 'essay'];
    var keep = (tags || []).filter(function (t) {
      return kindWords.indexOf(String(t).toLowerCase()) === -1;
    });
    el.tags.innerHTML = keep.map(function (t) {
      return '<span class="chip">' + esc(t) + '</span>';
    }).join('');
    el.tags.classList.toggle('hidden', keep.length === 0);
  }

  function byline(data) {
    var people = TL.authors(data).filter(function (a) { return a !== TL.OWNER; });
    return people.length ? people.join(', ') : '';
  }

  /* --------------------------------------------------------- markdown deps */

  var depsLoaded = false;

  function loadScript(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.crossOrigin = 'anonymous'; s.onload = res; s.onerror = rej;
      document.head.appendChild(s);
    });
  }

  function loadCss(href) {
    return new Promise(function (res, rej) {
      var l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = href; l.crossOrigin = 'anonymous';
      l.onload = res; l.onerror = rej;
      document.head.appendChild(l);
    });
  }

  function loadMarkdownDeps() {
    if (depsLoaded) return Promise.resolve();
    if (window.marked && window.DOMPurify && typeof window.renderMathInElement === 'function') {
      depsLoaded = true;
      return Promise.resolve();
    }
    return loadCss('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css')
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js'); })
      .then(function () { depsLoaded = true; });
  }

  function typesetMath(node) {
    if (typeof window.renderMathInElement !== 'function') return;
    try {
      window.renderMathInElement(node, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\(', right: '\\)', display: false },
          { left: '\\[', right: '\\]', display: true }
        ],
        throwOnError: false
      });
    } catch (e) { }
  }

  /* Tables need a scroll container or a wide one gives the whole page a
     horizontal scrollbar. */
  function wrapTables(node) {
    node.querySelectorAll('table').forEach(function (t) {
      if (t.parentElement && t.parentElement.classList.contains('table-wrap')) return;
      var w = document.createElement('div');
      w.className = 'table-wrap';
      t.parentNode.insertBefore(w, t);
      w.appendChild(t);
    });
  }

  /* ------------------------------------------------------------- renderers */

  function renderStandard(data) {
    applyToc(false);
    document.title = (data.title || 'Page') + ' — Tatra Labs';
    setKicker(route.kicker, null);
    el.title.textContent = data.title || '';
    if (el.sub) el.sub.classList.add('hidden');
    if (el.nav) el.nav.classList.add('hidden');

    renderTags(data.tags);
    fillRail([
      ['Published', TL.formatDate(data.date)],
      ['Reading', route.readingTime && data.readingTime ? data.readingTime : ''],
      ['By', byline(data)]
    ], data.tags);

    var sections = (data.content && data.content.sections) || [];
    el.content.innerHTML = sections.map(renderSection).join('');
    wrapTables(el.content);
    typesetMath(el.content);
  }

  function renderPaper(data) {
    applyToc(false);
    document.title = (data.title || 'Paper') + ' — Tatra Labs';
    setKicker(route.kicker, null);
    el.title.textContent = data.title || '';

    if (el.sub) {
      var people = TL.authors(data).filter(function (a) { return a !== TL.OWNER; });
      var line = [people.join(', '), data.venue].filter(Boolean).join('  ·  ');
      el.sub.textContent = line;
      el.sub.classList.toggle('hidden', !line);
    }
    if (el.nav) el.nav.classList.add('hidden');

    renderTags(data.tags);
    fillRail([
      ['Notes', TL.formatDate(data.date)],
      ['By', TL.OWNER]
    ], data.tags);

    var sections = (data.content && data.content.sections) || [];
    el.content.innerHTML = sections.map(renderSection).join('');
    wrapTables(el.content);
  }

  /* THE FIX: the section identity used to be printed four times on one
     screen by four independent paths — the meta line, the chapter label, the
     markdown H1, and the page title. Now there is exactly one owner:
       h1  = the section  (the section is the page)
       kicker = the book, linked to its root
       sub = the chapter
     and a leading markdown H1 repeating the section title is stripped. */
  function renderBookSection(data, toc) {
    var flat = (toc && toc.flatSections) || [];
    if (!flat.length) {
      applyToc(false);
      el.content.innerHTML = '<p class="md-missing">This book has no table of contents yet.</p>';
      return Promise.resolve();
    }

    var wanted = new URLSearchParams(window.location.search).get('section');
    var idx = 0;
    for (var i = 0; i < flat.length; i++) if (flat[i].id === wanted) { idx = i; break; }
    var cur = flat[idx];
    var heading = (cur.number ? cur.number + ' ' : '') + cur.title;

    document.title = heading + ' · ' + (data.title || 'Book') + ' — Tatra Labs';
    setKicker('Book · ' + (data.title || ''), '/foundation/book/' + encodeURIComponent(slug));
    el.title.textContent = heading;

    if (el.sub) {
      var chapter = chapterOf(toc, cur.id);
      el.sub.textContent = chapter || '';
      el.sub.classList.toggle('hidden', !chapter);
    }

    setMeta([TL.formatDate(data.date), 'Notes by ' + TL.OWNER]);
    renderTags(data.tags);

    if (el.toc) {
      el.toc._html = renderBookToc(toc, cur.id, idx, flat.length);
      applyToc(true);
    }
    renderChapterNav(flat, idx);

    var root = String(data.contentRoot || '').replace(/\/$/, '') + '/';
    return fetch(root + cur.file)
      .then(function (r) { return r.ok ? r.text() : null; })
      .then(function (md) {
        if (md == null) {
          el.content.innerHTML =
            '<p class="md-missing"><strong>Not written yet.</strong> ' +
            'These notes are being written section by section; this one is still ahead of me.</p>';
          return;
        }
        var html = md;
        if (window.marked) {
          if (typeof marked.setOptions === 'function') {
            marked.setOptions({ gfm: true, mangle: false, headerIds: true });
          }
          html = marked.parse(md);
          if (window.DOMPurify) html = DOMPurify.sanitize(html);
        }
        el.content.innerHTML = html;
        stripDuplicateHeading(el.content, heading, cur.title);
        wrapTables(el.content);
        typesetMath(el.content);
      });
  }

  /* The markdown source opens with its own "# 1.1 Who Should Read This
     Book?", which would render a second copy of the page title. Remove it
     only when it actually matches — additive, invalidates no content file. */
  function stripDuplicateHeading(node, heading, bareTitle) {
    var first = node.firstElementChild;
    if (!first || first.tagName !== 'H1') return;
    var norm = function (s) { return String(s).replace(/\s+/g, ' ').trim().toLowerCase(); };
    var t = norm(first.textContent);
    if (t === norm(heading) || t === norm(bareTitle)) first.remove();
  }

  function chapterOf(toc, sectionId) {
    var found = '';
    function scan(chapters, partTitle) {
      (chapters || []).forEach(function (ch) {
        (ch.sections || []).forEach(function (s) {
          if (s.id === sectionId) {
            found = (ch.number ? 'Chapter ' + ch.number + ' · ' : '') + (ch.title || '');
            if (partTitle) found = partTitle + '  ·  ' + found;
          }
        });
      });
    }
    scan(toc.prelude && toc.prelude.chapters, '');
    (toc.parts || []).forEach(function (p) { scan(p.chapters, p.title); });
    return found;
  }

  /* Chapters collapse to <details> with only the current one open, so a
     keyboard user reaches the text in one keystroke instead of 164. */
  function renderBookToc(toc, currentId, idx, total) {
    var base = window.location.pathname;
    var out = ['<p class="foundation-toc-heading">Contents</p>'];
    out.push('<p class="toc-progress">Section ' + (idx + 1) + ' / ' + total + '</p>');

    function leaf(sec) {
      var cur = sec.id === currentId;
      return '<li class="foundation-toc-item"><a href="' + base + '?section=' +
        encodeURIComponent(sec.id) + '"' + (cur ? ' aria-current="page"' : '') + '>' +
        esc((sec.number ? sec.number + ' ' : '') + sec.title) + '</a></li>';
    }

    function chapter(ch) {
      var has = (ch.sections || []).some(function (s) { return s.id === currentId; });
      return '<details class="toc-chapter"' + (has ? ' open' : '') + '>' +
        '<summary>' + esc((ch.number ? ch.number + ' ' : '') + ch.title) + '</summary>' +
        '<ul class="foundation-toc-list">' + (ch.sections || []).map(leaf).join('') + '</ul>' +
        '</details>';
    }

    (toc.prelude && toc.prelude.chapters ? toc.prelude.chapters : []).forEach(function (ch) {
      out.push(chapter(ch));
    });
    (toc.parts || []).forEach(function (part) {
      out.push('<p class="toc-part-title">' + esc(part.title) + '</p>');
      (part.chapters || []).forEach(function (ch) { out.push(chapter(ch)); });
    });
    return out.join('');
  }

  function renderChapterNav(flat, idx) {
    if (!el.nav || !el.prev || !el.next) return;
    if (flat.length < 2) { el.nav.classList.add('hidden'); return; }
    el.nav.classList.remove('hidden');
    el.nav.classList.remove('foundation-chapter-nav--only-next');
    var base = window.location.pathname;

    if (idx > 0) {
      el.prev.href = base + '?section=' + encodeURIComponent(flat[idx - 1].id);
      el.prev.textContent = '← ' + (flat[idx - 1].number || 'Previous');
      el.prev.classList.remove('hidden');
    } else {
      el.prev.classList.add('hidden');
      el.nav.classList.add('foundation-chapter-nav--only-next');
    }

    if (idx < flat.length - 1) {
      el.next.href = base + '?section=' + encodeURIComponent(flat[idx + 1].id);
      el.next.textContent = (flat[idx + 1].number || 'Next') + ' →';
      el.next.classList.remove('hidden');
    } else {
      el.next.classList.add('hidden');
    }
  }

  function applyToc(show) {
    if (el.shell) el.shell.classList.toggle('viewer-shell--has-toc', !!show);
    if (!el.toc) return;
    el.toc.classList.toggle('hidden', !show);
    el.toc.innerHTML = show && el.toc._html ? el.toc._html : '';
  }

  /* ------------------------------------------------------------------ boot */

  function fail() {
    if (el.article) el.article.classList.add('hidden');
    if (el.shell) el.shell.classList.add('hidden');
    if (el.error) {
      el.error.classList.remove('hidden');
      el.error.textContent = 'Page not found.';
    }
    document.title = 'Not found — Tatra Labs';
  }

  if (!route) { fail(); return; }

  document.querySelectorAll('.nav a[data-tab]').forEach(function (a) {
    var want = route.kind === 'post' ? 'posts' : route.kind === 'project' ? 'projects' : 'foundation';
    if (a.getAttribute('data-tab') === want) a.classList.add('active');
  });

  var url = route.kind === 'book'
    ? route.base + '/' + encodeURIComponent(slug) + '/book.json'
    : route.base + '/' + encodeURIComponent(slug) + '.json';

  fetch(url)
    .then(function (r) { if (!r.ok) throw new Error('404'); return r.json(); })
    .then(function (data) {
      if (el.error) el.error.classList.add('hidden');
      if (el.article) el.article.classList.remove('hidden');
      if (el.shell) el.shell.classList.remove('hidden');

      if (route.kind === 'book') {
        var tocUrl = data.tocFile || (route.base + '/' + encodeURIComponent(slug) + '/toc.json');
        return fetch(tocUrl)
          .then(function (r) { return r.ok ? r.json() : null; })
          .then(function (toc) {
            return loadMarkdownDeps().then(function () { return renderBookSection(data, toc || {}); });
          });
      }
      var draw = function () {
        if (route.kind === 'paper') renderPaper(data);
        else renderStandard(data);
      };
      /* Only a document that actually uses a markdown section pays for the
         parser + KaTeX; a plain JSON post still ships zero extra bytes. */
      if (hasMarkdown(data)) return loadMarkdownDeps().then(draw);
      draw();
    })
    .catch(fail);
})();
