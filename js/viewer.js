(function () {
  'use strict';

  var path = window.location.pathname.replace(/\/$/, '');
  var postMatch = path.match(/^\/post\/([^/]+)$/);
  var projectMatch = path.match(/^\/project\/([^/]+)$/);
  var foundationBookMatch = path.match(/^\/foundation\/book\/([^/]+)$/);
  var foundationPaperMatch = path.match(/^\/foundation\/paper\/([^/]+)$/);

  var slug, baseUrl, showReadingTime;
  var backLinkEl = document.querySelector('.back-link');
  if (postMatch) {
    slug = postMatch[1];
    baseUrl = '/data/posts';
    showReadingTime = true;
    if (backLinkEl) backLinkEl.setAttribute('href', '/?tab=posts');
  } else if (projectMatch) {
    slug = projectMatch[1];
    baseUrl = '/data/projects';
    showReadingTime = false;
    if (backLinkEl) backLinkEl.setAttribute('href', '/?tab=projects');
  } else if (foundationBookMatch) {
    slug = foundationBookMatch[1];
    baseUrl = '/data/foundation/books';
    showReadingTime = false;
    if (backLinkEl) backLinkEl.setAttribute('href', '/?tab=foundation');
  } else if (foundationPaperMatch) {
    slug = foundationPaperMatch[1];
    baseUrl = '/data/foundation/papers';
    showReadingTime = false;
    if (backLinkEl) backLinkEl.setAttribute('href', '/?tab=foundation');
  }

  var titleEl = document.getElementById('viewer-title');
  var metaEl = document.getElementById('viewer-meta');
  var contentEl = document.getElementById('viewer-content');
  var tagsEl = document.getElementById('viewer-tags');
  var errorEl = document.getElementById('viewer-error');
  var articleEl = document.getElementById('article');

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

  function renderSection(section) {
    var type = section.type || 'text';
    var value = section.value || section.url || '';
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

  if (!slug) {
    articleEl.classList.add('hidden');
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
      document.title = (data.title || 'Post') + ' – Tatra Labs';
      titleEl.textContent = data.title || '';
      var metaParts = [];
      if (data.date) metaParts.push('Date: ' + formatDate(data.date));
      if (showReadingTime && data.readingTime) metaParts.push(data.readingTime);
      if (data.author) metaParts.push('Author: ' + data.author);
      metaEl.textContent = metaParts.join(' | ');
      var sections = (data.content && data.content.sections) || [];
      contentEl.innerHTML = sections.map(renderSection).join('');
      var tags = data.tags || [];
      tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');
      errorEl.classList.add('hidden');
    })
    .catch(function () {
      articleEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
      document.title = 'Not Found – Tatra Labs';
    });
})();
