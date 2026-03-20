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
  var foundationBooksList = document.getElementById('foundation-books-list');
  var foundationPapersList = document.getElementById('foundation-papers-list');
  var postsSection = document.getElementById('posts-section');
  var projectsSection = document.getElementById('projects-section');
  var foundationSection = document.getElementById('foundation-section');
  var foundationSidebarDetails = document.getElementById('foundation-sidebar-details');
  var postsEmpty = document.getElementById('posts-empty');
  var projectsEmpty = document.getElementById('projects-empty');
  var tabLinks = document.querySelectorAll('[data-tab]');

  var foundationBooks = [];
  var foundationPapers = [];

  var foundationDetailsTitle = document.getElementById('foundation-details-title');
  var foundationDetailsMeta = document.getElementById('foundation-details-meta');
  var foundationDetailsSummary = document.getElementById('foundation-details-summary');
  var foundationDetailsOpen = document.getElementById('foundation-details-open');

  var selectedFoundationKind = '';
  var selectedFoundationSlug = '';

  function resetFoundationSelection() {
    selectedFoundationKind = '';
    selectedFoundationSlug = '';

    if (foundationDetailsTitle) foundationDetailsTitle.textContent = 'Select an item';
    if (foundationDetailsMeta) foundationDetailsMeta.textContent = '';
    if (foundationDetailsSummary) foundationDetailsSummary.textContent = '';
    if (foundationDetailsOpen) {
      foundationDetailsOpen.classList.add('hidden');
      foundationDetailsOpen.href = '#';
    }

    // Hide the card entirely when nothing is selected.
    if (foundationSidebarDetails) foundationSidebarDetails.classList.add('hidden');

    // Clear any active icon styling (if already rendered).
    var activeIcons = document.querySelectorAll('.foundation-icon.active');
    activeIcons.forEach(function (el) { el.classList.remove('active'); });
  }

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
    if (activeTab === 'foundation') {
      tagFilterList.innerHTML = '';
      return;
    }
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
      return '<button type="button" class="tag tag-btn" data-tag="' + escapeHtml(t) + '" aria-label="Filter by tag: ' + escapeHtml(t) + '">' + escapeHtml(t) + '</button>';
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

  function filterByTag(tag) {
    activeTags = [tag];
    if (tagFilterBox && tagFilterBox.classList.contains('collapsed')) {
      tagFilterBox.classList.remove('collapsed');
      if (tagFilterToggle) tagFilterToggle.setAttribute('aria-expanded', 'true');
    }
    renderTagFilter();
    renderLists();
  }

  function renderFoundation() {
    if (!foundationBooksList || !foundationPapersList) return;

    foundationBooksList.innerHTML = '';
    foundationPapersList.innerHTML = '';

    function formatAuthors(item) {
      if (!item) return '';
      if (item.authors && item.authors.length) return item.authors.join(', ');
      if (item.author) return item.author;
      return '';
    }

    function renderItemButton(item, kind) {
      var icon = item.icon || '';
      var iconAlt = item.iconAlt || item.title || '';
      var title = item.title || '';
      var slug = item.slug || '';
      var isActive = selectedFoundationKind === kind && selectedFoundationSlug === slug;
      var activeClass = isActive ? ' active' : '';

      return (
        '<button type="button" class="foundation-icon' + activeClass + '" data-kind="' + escapeHtml(kind) + '" data-slug="' + escapeHtml(slug) + '" ' +
          'aria-label="' + (kind === 'book' ? 'Open book' : 'Open paper') + ': ' + escapeHtml(title) + '">' +
          (icon ? '<img src="' + escapeHtml(icon) + '" alt="' + escapeHtml(iconAlt) + '" class="foundation-icon-img">' : '') +
          '<div class="foundation-icon-title">' + escapeHtml(title) + '</div>' +
        '</button>'
      );
    }

    foundationBooks.forEach(function (item) {
      foundationBooksList.insertAdjacentHTML('beforeend', renderItemButton(item, 'book'));
    });

    foundationPapers.forEach(function (item) {
      foundationPapersList.insertAdjacentHTML('beforeend', renderItemButton(item, 'paper'));
    });
  }

  function selectFoundationItem(kind, slug, btnEl) {
    if (!kind || !slug) return;

    selectedFoundationKind = kind;
    selectedFoundationSlug = slug;

    var item = null;
    if (kind === 'book') item = foundationBooks.find(function (x) { return x.slug === slug; });
    else if (kind === 'paper') item = foundationPapers.find(function (x) { return x.slug === slug; });
    if (!item) return;

    var title = item.title || '';
    var authors = '';
    if (item.authors && item.authors.length) authors = item.authors.join(', ');
    else if (item.author) authors = item.author;
    var dateStr = item.date ? formatDate(item.date) : '';
    var metaStr = [dateStr, authors].filter(Boolean).join(' | ');

    if (foundationDetailsTitle) foundationDetailsTitle.textContent = title || 'Select an item';
    if (foundationDetailsMeta) foundationDetailsMeta.textContent = metaStr;
    if (foundationDetailsSummary) foundationDetailsSummary.textContent = item.summary || '';

    if (foundationDetailsOpen) {
      var href = (kind === 'book') ? '/foundation/book/' : '/foundation/paper/';
      foundationDetailsOpen.href = href + encodeURIComponent(slug);
      foundationDetailsOpen.classList.remove('hidden');
    }

    // Update active icon styling.
    var activeIcons = document.querySelectorAll('.foundation-icon.active');
    activeIcons.forEach(function (el) { el.classList.remove('active'); });
    if (btnEl) btnEl.classList.add('active');

    // Show the left details card once something is selected.
    if (foundationSidebarDetails) foundationSidebarDetails.classList.remove('hidden');
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
    if (foundationSection) {
      foundationSection.classList.toggle('hidden', tab !== 'foundation');
    }
    if (tagFilterBox) {
      tagFilterBox.classList.toggle('hidden', tab === 'foundation');
    }

    // Keep the welcome message visible; only toggle the foundation details card.
    if (foundationSidebarDetails) {
      var shouldShow = tab === 'foundation' && !!selectedFoundationSlug;
      foundationSidebarDetails.classList.toggle('hidden', !shouldShow);
    }

    if (tab !== 'foundation') {
      resetFoundationSelection();
    }

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
    if (tab === 'foundation') renderFoundation();
    else renderLists();
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
    if (tabParam === 'projects' || tabParam === 'foundation') activeTab = tabParam;

    Promise.all([
      fetch('/data/posts-list.json').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/data/projects-list.json').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/data/foundation/books-list.json').then(function (r) { return r.ok ? r.json() : []; }),
      fetch('/data/foundation/papers-list.json').then(function (r) { return r.ok ? r.json() : []; })
    ]).then(function (results) {
      posts = results[0] || [];
      projects = results[1] || [];
      foundationBooks = results[2] || [];
      foundationPapers = results[3] || [];
      setTab(activeTab);
    }).catch(function () {
      setTab(activeTab);
    });

    searchInput.addEventListener('input', function () {
      searchQuery = searchInput.value.trim();
      if (activeTab !== 'foundation') renderLists();
    });

    document.addEventListener('click', function (e) {
      var btn = e.target && e.target.closest && e.target.closest('.tag-btn');
      if (!btn || !btn.dataset.tag) return;
      e.preventDefault();
      filterByTag(btn.dataset.tag);
    });

    document.addEventListener('click', function (e) {
      var fbtn = e.target && e.target.closest && e.target.closest('.foundation-icon');
      if (!fbtn || !fbtn.dataset || !fbtn.dataset.kind || !fbtn.dataset.slug) return;
      e.preventDefault();
      selectFoundationItem(fbtn.dataset.kind, fbtn.dataset.slug, fbtn);
    });

    document.addEventListener('click', function (e) {
      if (activeTab !== 'foundation') return;

      // Ignore clicks on the icon buttons themselves.
      var fbtn = e.target && e.target.closest && e.target.closest('.foundation-icon');
      if (fbtn) return;

      // Ignore clicks inside the left sidebar details panel.
      var detailsPanel = e.target && e.target.closest && e.target.closest('#foundation-sidebar-details');
      if (detailsPanel) return;

      // Ignore clicks on the "Open" button/link.
      var openBtn = e.target && e.target.closest && e.target.closest('#foundation-details-open');
      if (openBtn) return;

      // Clicked blank space -> deactivate.
      resetFoundationSelection();
    });

    tabLinks.forEach(function (a) {
      if (a.getAttribute('data-tab')) {
        a.addEventListener('click', function (e) {
          e.preventDefault();
          var tab = a.getAttribute('data-tab');
          setTab(tab);
          if (tab === 'projects' || tab === 'foundation') window.history.replaceState(null, '', '/?tab=' + tab);
          else window.history.replaceState(null, '', '/');
        });
      }
    });
  }

  init();
})();
