(function () {
  'use strict';

  var toggle = document.getElementById('theme-toggle');
  if (!toggle) return;

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') || 'light';
  }

  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('theme', theme); } catch (e) {}
  }

  toggle.addEventListener('click', function () {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    setTheme(next);
  });
})();
