(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  var slug = params.get('slug') || (window.location.hash || '').replace(/^#/, '');
  var titleEl = document.getElementById('project-title');
  var metaEl = document.getElementById('project-meta');
  var contentEl = document.getElementById('project-content');
  var tagsEl = document.getElementById('project-tags');
  var errorEl = document.getElementById('load-error');
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
    errorEl.textContent = 'No project specified.';
    return;
  }

  fetch('/content/projects/' + encodeURIComponent(slug) + '.json')
    .then(function (r) {
      if (!r.ok) throw new Error('Not found');
      return r.json();
    })
    .then(function (data) {
      document.title = (data.title || 'Project') + ' – Tatra Labs';
      titleEl.textContent = data.title || '';
      var meta = 'Date: ' + formatDate(data.date);
      if (data.author) meta += ' | Author: ' + data.author;
      metaEl.textContent = meta;
      var sections = (data.content && data.content.sections) || [];
      contentEl.innerHTML = sections.map(renderSection).join('');
      var tags = data.tags || [];
      tagsEl.innerHTML = tags.map(function (t) { return '<span class="tag">' + escapeHtml(t) + '</span>'; }).join('');
      errorEl.classList.add('hidden');
    })
    .catch(function () {
      articleEl.classList.add('hidden');
      errorEl.classList.remove('hidden');
    });
})();
