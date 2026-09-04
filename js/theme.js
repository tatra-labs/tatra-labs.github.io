/* Three theme states, all reachable: system -> light -> dark -> system.
   The boot script in each shell stamps data-theme ONLY on an explicit choice,
   so the unset state genuinely follows prefers-color-scheme. */
(function () {
  'use strict';

  var btn = document.getElementById('theme-toggle');
  if (!btn) return;

  var root = document.documentElement;
  var mq = window.matchMedia('(prefers-color-scheme: dark)');
  var NEXT = { system: 'light', light: 'dark', dark: 'system' };

  function pref() { return root.getAttribute('data-theme-pref') || 'system'; }

  function apply(p) {
    root.setAttribute('data-theme-pref', p);
    if (p === 'system') {
      root.removeAttribute('data-theme');
      try { localStorage.removeItem('theme'); } catch (e) { }
    } else {
      root.setAttribute('data-theme', p);
      try { localStorage.setItem('theme', p); } catch (e) { }
    }
    btn.setAttribute('aria-label', 'Theme: ' + p + '. Switch to ' + NEXT[p] + '.');
    btn.setAttribute('title', 'Theme: ' + p);
  }

  btn.addEventListener('click', function () { apply(NEXT[pref()]); });

  /* Registering a listener is what makes some engines re-evaluate
     prefers-color-scheme promptly on a live OS switch. Intentionally empty:
     with no data-theme attribute, CSS alone does the work. */
  mq.addEventListener('change', function () { });

  apply(pref());
})();
