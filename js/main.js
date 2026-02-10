(function () {
  'use strict';

  var posts = [];
  var projects = [];
  var activeTab = 'posts';
  var activeTags = [];
  var searchQuery = '';

  var tagFilterList = document.getElementById('tag-filter-list');
  var tagFilterToggle = document.getElementById('tag-filter-toggle');
  var tagFilterBox = document.querySelector('.tag-filter-box');
  var searchInput = document.getElementById('search-input');
  var postsList = document.getElementById('posts-list');
  var projectsList = document.getElementById('projects-list');
  var postsSection = document.getElementById('posts-section');
  var projectsSection = document.getElementById('projects-section');
  var postsEmpty = document.getElementById('posts-empty');
  var projectsEmpty = document.getElementById('projects-empty');
  var tabLinks = document.querySelectorAll('[data-tab]');

  function formatDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function collectTags(items) {
    var set = {};
    items.forEach(function (item) {
      (item.tags || []).forEach(function (t) { set[t] = true; });
    });
    return Object.keys(set).sort();
  }

  function matchesFilter(item, selectedTags, query) {
    if (selectedTags.length > 0) {
      var itemTags = item.tags || [];
      var hasAll = selectedTags.every(function (t) { return itemTags.indexOf(t) !== -1; });
      if (!hasAll) return false;
    }
    if (!query) return true;
    var q = query.toLowerCase();
    var text = (item.title + ' ' + (item.excerpt || '') + ' ' + (item.tags || []).join(' ')).toLowerCase();
    return text.indexOf(q) !== -1;
  }

  function renderTagFilter() {
    var tags = activeTab === 'posts' ? collectTags(posts) : collectTags(projects);
    tagFilterList.innerHTML = '';
    tags.forEach(function (t) {
      var item = document.createElement('div');
      item.className = 'tag-filter-item';
      var id = 'tag-' + t.replace(/\s+/g, '-');
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.id = id;
      cb.setAttribute('data-tag', t);
      cb.checked = activeTags.indexOf(t) !== -1;
      cb.addEventListener('change', function () { toggleTag(t); });
      var label = document.createElement('label');
      label.htmlFor = id;
      label.textContent = t;
      item.appendChild(cb);
      item.appendChild(label);
      tagFilterList.appendChild(item);
    });
  }

  function toggleTag(tag) {
    var idx = activeTags.indexOf(tag);
    if (idx === -1) activeTags.push(tag);
    else activeTags.splice(idx, 1);
    renderTagFilter();
    renderLists();
  }

  function renderCard(item, baseUrl, showReadingTime) {
    var meta = 'Date: ' + formatDate(item.date);
    if (showReadingTime && item.readingTime) meta += ' | ' + item.readingTime;
    if (item.author) meta += ' | Author: ' + item.author;
    var tagsHtml = (item.tags || []).map(function (t) {
      return '<span class="tag">' + escapeHtml(t) + '</span>';
    }).join('');
    return (
      '<div class="card" data-slug="' + escapeHtml(item.slug) + '">' +
        '<h3 class="card-title"><a href="' + baseUrl + encodeURIComponent(item.slug) + '">' + escapeHtml(item.title) + '</a></h3>' +
        (item.excerpt ? '<p class="card-excerpt">' + escapeHtml(item.excerpt) + '</p>' : '') +
        '<p class="card-meta">' + escapeHtml(meta) + '</p>' +
        (tagsHtml ? '<div class="card-tags">' + tagsHtml + '</div>' : '') +
      '</div>'
    );
  }

  function escapeHtml(s) {
    if (!s) return '';
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  function renderLists() {
    var filteredPosts = posts.filter(function (p) { return matchesFilter(p, activeTags, searchQuery); });
    var filteredProjects = projects.filter(function (p) { return matchesFilter(p, activeTags, searchQuery); });

    postsList.innerHTML = filteredPosts.map(function (p) { return renderCard(p, '/post/', true); }).join('');
    projectsList.innerHTML = filteredProjects.map(function (p) { return renderCard(p, '/project/', false); }).join('');

    postsEmpty.classList.toggle('hidden', filteredPosts.length > 0);
    projectsEmpty.classList.toggle('hidden', filteredProjects.length > 0);
  }

  function setTab(tab) {
    activeTab = tab;
    postsSection.classList.toggle('hidden', tab !== 'posts');
    projectsSection.classList.toggle('hidden', tab !== 'projects');
    document.querySelectorAll('.tabs a').forEach(function (a) {
      var isActive = a.getAttribute('data-tab') === tab;
      a.classList.toggle('active', isActive);
      a.setAttribute('aria-selected', isActive);
    });
    document.querySelectorAll('.nav a[data-tab]').forEach(function (a) {
      a.classList.toggle('active', a.getAttribute('data-tab') === tab);
    });
    activeTags = [];
    renderTagFilter();
    renderLists();
  }

  if (tagFilterToggle && tagFilterBox) {
    tagFilterToggle.addEventListener('click', function () {
      var collapsed = tagFilterBox.classList.toggle('collapsed');
      tagFilterToggle.setAttribute('aria-expanded', !collapsed);
    });
  }

  function init() {
    var path = window.location.pathname;
    if (path === '/index.html' || path.endsWith('/index.html')) {
      var clean = path.replace(/index\.html$/i, '') || '/';
      var search = window.location.search || '';
      var hash = window.location.hash || '';
      window.history.replaceState(null, '', (clean || '/') + search + hash);
    }
    var params = new URLSearchParams(window.location.search);
    var tabParam = params.get('tab');
    if (tabParam === 'projects') activeTab = 'projects';

    Promise.all([
      fetch('/data/posts-list.json').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/data/projects-list.json').then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (results) {
      posts = results[0] || [];
      projects = results[1] || [];
      setTab(activeTab);
    }).catch(function () {
      setTab(activeTab);
    });

    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value.trim();
      renderLists();
    });

        tabLinks.forEach(function (a) {
      if (a.getAttribute('data-tab')) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var tab = a.getAttribute('data-tab');
          setTab(tab);
          window.history.replaceState(null, '', tab === 'projects' ? '/?tab=projects' : '/');
        });
      }
    });
  }

  init();
})();
