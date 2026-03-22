(function () {
  'use strict';

  var path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '') || '/';
  var postMatch = path.match(/^\/post\/([^/]+)$/);
  var projectMatch = path.match(/^\/project\/([^/]+)$/);
  var foundationBookMatch = path.match(/^\/foundation\/book\/([^/]+)$/);
  var foundationPaperMatch = path.match(/^\/foundation\/paper\/([^/]+)$/);

  var slug;
  var baseUrl;
  var showReadingTime;
  var isFoundationBook = !!foundationBookMatch;
  var isFoundationPaper = !!foundationPaperMatch;
  var isFoundation = isFoundationBook || isFoundationPaper;

  var backLinkEl = document.querySelector('.back-link');
  if (postMatch) {
    slug = decodeURIComponent(postMatch[1]);
    baseUrl = '/data/posts';
    showReadingTime = true;
    if (backLinkEl) {
      backLinkEl.setAttribute('href', '/?tab=posts');
      backLinkEl.textContent = '← Back to Posts';
    }
  } else if (projectMatch) {
    slug = decodeURIComponent(projectMatch[1]);
    baseUrl = '/data/projects';
    showReadingTime = false;
    if (backLinkEl) {
      backLinkEl.setAttribute('href', '/?tab=projects');
      backLinkEl.textContent = '← Back to Projects';
    }
  } else if (foundationBookMatch) {
    slug = decodeURIComponent(foundationBookMatch[1]);
    baseUrl = '/data/foundation/books';
    showReadingTime = false;
    if (backLinkEl) {
      backLinkEl.setAttribute('href', '/?tab=foundation');
      backLinkEl.textContent = '← Back to Foundation';
    }
  } else if (foundationPaperMatch) {
    slug = decodeURIComponent(foundationPaperMatch[1]);
    baseUrl = '/data/foundation/papers';
    showReadingTime = false;
    if (backLinkEl) {
      backLinkEl.setAttribute('href', '/?tab=foundation');
      backLinkEl.textContent = '← Back to Foundation';
    }
  }

  var titleEl = document.getElementById('viewer-title');
  var metaEl = document.getElementById('viewer-meta');
  var contentEl = document.getElementById('viewer-content');
  var tagsEl = document.getElementById('viewer-tags');
  var errorEl = document.getElementById('viewer-error');
  var articleEl = document.getElementById('article');
  var viewerShell = document.getElementById('viewer-shell');
  var foundationTocEl = document.getElementById('foundation-toc');
  var foundationChapterLabel = document.getElementById('foundation-chapter-label');
  var foundationChapterNav = document.getElementById('foundation-chapter-nav');
  var foundationChapterPrev = document.getElementById('foundation-chapter-prev');
  var foundationChapterNext = document.getElementById('foundation-chapter-next');

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  var mdBookDepsLoaded = false;

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src;
      s.crossOrigin = 'anonymous';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function loadCss(href) {
    return new Promise(function (resolve, reject) {
      var l = document.createElement('link');
      l.rel = 'stylesheet';
      l.href = href;
      l.crossOrigin = 'anonymous';
      l.onload = resolve;
      l.onerror = reject;
      document.head.appendChild(l);
    });
  }

  function loadMarkdownDeps() {
    if (mdBookDepsLoaded) return Promise.resolve();
    if (window.marked && window.DOMPurify && typeof window.renderMathInElement === 'function') {
      mdBookDepsLoaded = true;
      return Promise.resolve();
    }
    return loadCss('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css')
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/marked@11.1.1/marked.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/dompurify@3.0.8/dist/purify.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js'); })
      .then(function () { return loadScript('https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js'); })
      .then(function () { mdBookDepsLoaded = true; });
  }

  function renderMarkdownTocHtml(tocTree, currentSectionId) {
    var base = window.location.pathname;
    function href(sec) {
      return base + '?section=' + encodeURIComponent(sec.id);
    }
    function link(sec) {
      var cur = sec.id === currentSectionId ? ' aria-current="page"' : '';
      return (
        '<li class="foundation-toc-item">' +
        '<a href="' + href(sec) + '"' + cur + '>' + escapeHtml(sec.number + ' ' + sec.title) + '</a>' +
        '</li>'
      );
    }
    var out = [];
    out.push('<h2 class="foundation-toc-heading">Contents</h2>');
    out.push('<div class="foundation-toc-scroll">');
    (tocTree.prelude && tocTree.prelude.chapters ? tocTree.prelude.chapters : []).forEach(function (ch) {
      out.push(
        '<div class="toc-block">' +
        '<div class="toc-chapter-heading">' + escapeHtml(ch.number + ' ' + ch.title) + '</div>' +
        '<ul class="foundation-toc-list">'
      );
      (ch.sections || []).forEach(function (sec) {
        out.push(link(sec));
      });
      out.push('</ul></div>');
    });
    (tocTree.parts || []).forEach(function (part) {
      out.push('<div class="toc-block toc-part"><div class="toc-part-title">' + escapeHtml(part.title) + '</div>');
      (part.chapters || []).forEach(function (ch) {
        out.push(
          '<div class="toc-chapter-block">' +
          '<div class="toc-chapter-heading">' + escapeHtml(ch.number + ' ' + ch.title) + '</div>' +
          '<ul class="foundation-toc-list">'
        );
        (ch.sections || []).forEach(function (sec) {
          out.push(link(sec));
        });
        out.push('</ul></div>');
      });
      out.push('</div>');
    });
    out.push('</div>');
    return out.join('');
  }

  function renderSection(section) {
    var type = section.type || 'text';
    var value = section.value || section.url || '';
    if (type === 'heading') {
      var hid = section.id || '';
      var level = section.level === 3 ? 3 : 2;
      var tag = level === 3 ? 'h3' : 'h2';
      var idAttr = hid ? ' id="' + escapeHtml(hid) + '"' : '';
      return '<' + tag + ' class="article-heading"' + idAttr + '>' + escapeHtml(value) + '</' + tag + '>';
    }
    if (type === 'text') {
      return '<p>' + escapeHtml(value).replace(/\n/g, '</p><p>') + '</p>';
    }
    if (type === 'image') {
      var alt = section.alt || '';
      return '<div class="media-wrap"><img src="' + escapeHtml(value) + '" alt="' + escapeHtml(alt) + '" loading="lazy" decoding="async"></div>';
    }
    if (type === 'video') {
      return '<div class="media-wrap"><video src="' + escapeHtml(value) + '" controls preload="metadata" playsinline></video></div>';
    }
    if (type === 'embed' && value) {
      return '<div class="media-wrap"><iframe src="' + escapeHtml(value) + '" loading="lazy" allowfullscreen></iframe></div>';
    }
    return '';
  }

  function normalizeBookChapters(data) {
    if (data.content && data.content.chapters && data.content.chapters.length) {
      return data.content.chapters.map(function (ch, i) {
        return {
          id: ch.id || ('ch' + (i + 1)),
          title: ch.title || ch.id || ('Chapter ' + (i + 1)),
          sections: ch.sections || []
        };
      });
    }
    var sections = (data.content && data.content.sections) || [];
    return [{ id: 'main', title: 'Overview', sections: sections }];
  }

  function buildMetaLine(data) {
    var metaParts = [];
    if (data.date) metaParts.push('Date: ' + formatDate(data.date));
    if (showReadingTime && data.readingTime) metaParts.push(data.readingTime);
    if (data.authors && data.authors.length) metaParts.push(data.authors.join(', '));
    else if (data.author) metaParts.push('Author: ' + data.author);
    return metaParts.join(' | ');
  }

  function setNavActive() {
    var navLinks = document.querySelectorAll('.site-header .nav a');
    navLinks.forEach(function (a) {
      a.classList.remove('active');
    });
    if (isFoundation) {
      var f = document.querySelector('.site-header .nav a[href*="tab=foundation"]');
      if (f) f.classList.add('active');
    } else if (postMatch) {
      var p = document.querySelector('.site-header .nav a[data-tab="posts"], .site-header .nav a[href="/"]');
      if (p) p.classList.add('active');
    } else if (projectMatch) {
      var pr = document.querySelector('.site-header .nav a[href*="tab=projects"]');
      if (pr) pr.classList.add('active');
    }
  }

  function renderBookToc(chapters, activeIndex) {
    var base = window.location.pathname;
    var items = chapters.map(function (ch, i) {
      var isActive = i === activeIndex;
      var href = base + '?chapter=' + encodeURIComponent(ch.id);
      return (
        '<li class="foundation-toc-item">' +
        '<a href="' + href + '"' + (isActive ? ' aria-current="page"' : '') + '>' + escapeHtml(ch.title) + '</a>' +
        '</li>'
      );
    }).join('');
    return (
      '<h2 class="foundation-toc-heading">Contents</h2>' +
      '<ol class="foundation-toc-list">' + items + '</ol>'
    );
  }

  function renderPaperTocFromSections(sections) {
    var items = [];
    sections.forEach(function (sec) {
      if ((sec.type || 'text') === 'heading' && sec.id) {
        items.push({ id: sec.id, title: sec.value || sec.id });
      }
    });
    if (!items.length) {
      return (
        '<h2 class="foundation-toc-heading">Contents</h2>' +
        '<ol class="foundation-toc-list"><li class="foundation-toc-item"><a href="#paper-top">Full paper</a></li></ol>'
      );
    }
    var lis = items.map(function (item) {
      return (
        '<li class="foundation-toc-item">' +
        '<a href="#' + escapeHtml(item.id) + '">' + escapeHtml(item.title) + '</a>' +
        '</li>'
      );
    }).join('');
    return '<h2 class="foundation-toc-heading">Contents</h2><ol class="foundation-toc-list">' + lis + '</ol>';
  }

  function applyFoundationShell(showToc) {
    if (viewerShell) viewerShell.classList.toggle('viewer-shell--has-toc', !!showToc);
    if (foundationTocEl) {
      foundationTocEl.classList.toggle('hidden', !showToc);
      if (showToc && foundationTocEl._tocHtml) {
        foundationTocEl.innerHTML = foundationTocEl._tocHtml;
      } else if (!showToc) {
        foundationTocEl.innerHTML = '';
      }
    }
  }

  function renderMarkdownFoundationBook(data, tocTree) {
    var flat = tocTree.flatSections || [];
    if (!flat.length) {
      contentEl.innerHTML = '<p class="md-missing">Table of contents is empty.</p>';
      return Promise.resolve();
    }
    var params = new URLSearchParams(window.location.search);
    var sectionId = params.get('section') || flat[0].id;
    var idx = flat.findIndex(function (s) { return s.id === sectionId; });
    if (idx === -1) idx = 0;
    var current = flat[idx];
    var root = (data.contentRoot || '').replace(/\/$/, '') + '/';

    if (foundationTocEl) {
      foundationTocEl._tocHtml = renderMarkdownTocHtml(tocTree, current.id);
    }
    applyFoundationShell(!!foundationTocEl);

    titleEl.textContent = data.title || '';
    if (foundationChapterLabel) {
      foundationChapterLabel.textContent = current.number + ' ' + current.title;
      foundationChapterLabel.classList.remove('hidden');
    }

    if (foundationChapterNav) {
      var showNav = flat.length > 1;
      foundationChapterNav.classList.toggle('hidden', !showNav);
      foundationChapterNav.classList.remove('foundation-chapter-nav--only-next', 'foundation-chapter-nav--only-prev');
      var pathBase = window.location.pathname;
      if (showNav && foundationChapterPrev && foundationChapterNext) {
        if (idx > 0) {
          foundationChapterPrev.href = pathBase + '?section=' + encodeURIComponent(flat[idx - 1].id);
          foundationChapterPrev.classList.remove('hidden');
        } else {
          foundationChapterPrev.classList.add('hidden');
        }
        if (idx < flat.length - 1) {
          foundationChapterNext.href = pathBase + '?section=' + encodeURIComponent(flat[idx + 1].id);
          foundationChapterNext.classList.remove('hidden');
        } else {
          foundationChapterNext.classList.add('hidden');
        }
        if (idx === 0 && flat.length > 1) {
          foundationChapterNav.classList.add('foundation-chapter-nav--only-next');
        } else if (idx === flat.length - 1 && flat.length > 1) {
          foundationChapterNav.classList.add('foundation-chapter-nav--only-prev');
        }
      }
    }

    var tags = data.tags || [];
    tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');

    return fetch(root + current.file)
      .then(function (r) {
        if (!r.ok) return null;
        return r.text();
      })
      .then(function (md) {
        var html;
        if (md && window.marked) {
          if (typeof marked.setOptions === 'function') {
            marked.setOptions({ gfm: true, mangle: false, headerIds: true });
          }
          html = marked.parse(md);
          if (window.DOMPurify) {
            html = DOMPurify.sanitize(html);
          }
        } else {
          html =
            '<div class="md-missing">' +
            '<p><strong>No Markdown file yet.</strong> Create:</p>' +
            '<p><code>' + escapeHtml(root + current.file) + '</code></p>' +
            '<p>See <code>content/foundation/books/README.md</code> for the boilerplate.</p>' +
            '</div>';
        }
        contentEl.innerHTML = html;
        if (typeof window.renderMathInElement === 'function') {
          try {
            window.renderMathInElement(contentEl, {
              delimiters: [
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\(', right: '\\)', display: false },
                { left: '\\[', right: '\\]', display: true }
              ],
              throwOnError: false
            });
          } catch (e) {}
        }
        metaEl.textContent = buildMetaLine(data) + ' | ' + current.number + ' ' + current.title;
        document.title =
          current.number + ' ' + current.title + ' · ' + (data.title || 'Book') + ' – Tatra Labs';
      });
  }

  function renderFoundationBook(data) {
    var chapters = normalizeBookChapters(data);
    var params = new URLSearchParams(window.location.search);
    var requestedId = params.get('chapter');
    var idx = 0;
    if (requestedId) {
      var found = chapters.findIndex(function (c) { return c.id === requestedId; });
      if (found !== -1) idx = found;
    }
    var current = chapters[idx];
    var sections = current.sections || [];

    if (foundationTocEl) {
      foundationTocEl._tocHtml = renderBookToc(chapters, idx);
    }
    applyFoundationShell(!!foundationTocEl);

    if (foundationChapterLabel) {
      foundationChapterLabel.textContent = chapters.length > 1 ? current.title : '';
      foundationChapterLabel.classList.toggle('hidden', chapters.length <= 1);
    }

    if (foundationChapterNav) {
      var showNav = chapters.length > 1;
      foundationChapterNav.classList.toggle('hidden', !showNav);
      foundationChapterNav.classList.remove('foundation-chapter-nav--only-next', 'foundation-chapter-nav--only-prev');
      var base = window.location.pathname;
      if (showNav && foundationChapterPrev && foundationChapterNext) {
        if (idx > 0) {
          foundationChapterPrev.href = base + '?chapter=' + encodeURIComponent(chapters[idx - 1].id);
          foundationChapterPrev.classList.remove('hidden');
        } else {
          foundationChapterPrev.classList.add('hidden');
        }
        if (idx < chapters.length - 1) {
          foundationChapterNext.href = base + '?chapter=' + encodeURIComponent(chapters[idx + 1].id);
          foundationChapterNext.classList.remove('hidden');
        } else {
          foundationChapterNext.classList.add('hidden');
        }
        if (idx === 0 && chapters.length > 1) {
          foundationChapterNav.classList.add('foundation-chapter-nav--only-next');
        } else if (idx === chapters.length - 1 && chapters.length > 1) {
          foundationChapterNav.classList.add('foundation-chapter-nav--only-prev');
        }
      }
    }

    titleEl.textContent = data.title || '';
    metaEl.textContent = buildMetaLine(data);
    contentEl.innerHTML = sections.map(renderSection).join('');
    var tags = data.tags || [];
    tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');

    var sub = chapters.length > 1 ? current.title : '';
    document.title = (sub ? sub + ' · ' : '') + (data.title || 'Book') + ' – Tatra Labs';
  }

  function renderFoundationPaper(data) {
    var sections = (data.content && data.content.sections) || [];

    if (foundationTocEl) {
      foundationTocEl._tocHtml = renderPaperTocFromSections(sections);
    }
    applyFoundationShell(!!foundationTocEl);

    if (foundationChapterLabel) foundationChapterLabel.classList.add('hidden');
    if (foundationChapterNav) foundationChapterNav.classList.add('hidden');

    titleEl.textContent = data.title || '';
    metaEl.textContent = buildMetaLine(data);
    var bodyHtml = sections.map(renderSection).join('');
    contentEl.innerHTML = '<div id="paper-top" class="paper-top-anchor"></div>' + bodyHtml;
    var tags = data.tags || [];
    tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');

    document.title = (data.title || 'Paper') + ' – Tatra Labs';
  }

  function renderStandard(data) {
    applyFoundationShell(false);
    if (foundationChapterLabel) foundationChapterLabel.classList.add('hidden');
    if (foundationChapterNav) foundationChapterNav.classList.add('hidden');

    document.title = (data.title || 'Post') + ' – Tatra Labs';
    titleEl.textContent = data.title || '';
    metaEl.textContent = buildMetaLine(data);
    var sections = (data.content && data.content.sections) || [];
    contentEl.innerHTML = sections.map(renderSection).join('');
    var tags = data.tags || [];
    tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');
  }

  if (!slug) {
    articleEl.classList.add('hidden');
    if (viewerShell) viewerShell.classList.add('hidden');
    errorEl.classList.remove('hidden');
    errorEl.textContent = 'Page not found.';
    document.title = 'Not Found – Tatra Labs';
    return;
  }

  fetch(baseUrl + '/' + encodeURIComponent(slug) + '.json')
    .then(function (r) {
      if (!r.ok) throw new Error('Not found');
      return r.json();
    })
    .then(function (data) {
      setNavActive();
      errorEl.classList.add('hidden');
      articleEl.classList.remove('hidden');
      if (viewerShell) viewerShell.classList.remove('hidden');

      if (isFoundationBook && data.reader === 'markdown-toc') {
        var tocUrl = data.tocFile || '/data/foundation/books/' + encodeURIComponent(slug) + '-toc.json';
        return fetch(tocUrl)
          .then(function (r) {
            if (!r.ok) throw new Error('toc');
            return r.json();
          })
          .then(function (tocTree) {
            return loadMarkdownDeps().then(function () {
              return renderMarkdownFoundationBook(data, tocTree);
            });
          });
      }

      if (isFoundationBook) {
        renderFoundationBook(data);
        return;
      }
      if (isFoundationPaper) {
        renderFoundationPaper(data);
        return;
      }
      renderStandard(data);
    })
    .catch(function () {
      articleEl.classList.add('hidden');
      if (viewerShell) viewerShell.classList.add('hidden');
      errorEl.classList.remove('hidden');
      errorEl.textContent = 'Page not found.';
      document.title = 'Not Found – Tatra Labs';
    });
})();
