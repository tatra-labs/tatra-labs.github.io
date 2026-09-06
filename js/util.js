/* Shared helpers. Loaded before main.js and viewer.js, which previously held
   byte-identical copies of escapeHtml and formatDate. No module system: one
   global, TL. */
(function (w) {
  'use strict';

  var TL = {};

  TL.escapeHtml = function (s) {
    if (s == null || s === '') return '';
    var d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  };

  /* There are deliberately NO date helpers here. Publication dates are not
     displayed anywhere on the site: `date` (and the register's `added` /
     `updated`) is still authored in every content file and still orders the
     lists, but nothing renders it. The formatting helpers that used to live
     here — parseDate, formatDate, year, railDate — were removed when the last
     caller went, rather than left behind as dead code. Restore them from git
     history if a date is ever shown again, and note that a plain ISO date must
     be parsed as local: new Date('2026-09-03') is UTC midnight, which prints
     as the day before anywhere west of Greenwich. */

  /* Keep the original (possibly relative) URL, but only for schemes we serve. */
  TL.safeUrl = function (raw) {
    var s = String(raw == null ? '' : raw).trim();
    if (!s) return '';
    var r;
    try { r = new URL(s, w.location.href); } catch (e) { return ''; }
    return (r.protocol === 'http:' || r.protocol === 'https:' || r.protocol === 'mailto:') ? s : '';
  };

  TL.isExternal = function (u) {
    try { return new URL(u, w.location.href).origin !== w.location.origin; }
    catch (e) { return false; }
  };

  TL.authors = function (d) {
    if (d && d.authors && d.authors.length) return d.authors.slice();
    if (d && d.author) return [d.author];
    return [];
  };

  /* Initials for the cover fallback plate, so a source with no artwork of its
     own reads as deliberate rather than as a duplicate. */
  TL.initials = function (title) {
    return String(title || '?')
      .split(/\s+/)
      .filter(function (w2) { return /[A-Za-z0-9]/.test(w2); })
      .slice(0, 2)
      .map(function (w2) { return w2[0].toUpperCase(); })
      .join('');
  };

  TL.OWNER = 'Tatra Labs';

  w.TL = TL;
})(window);
