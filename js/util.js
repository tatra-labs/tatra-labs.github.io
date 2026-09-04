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

  /* new Date('2026-09-03') is UTC midnight, which prints as the day before
     anywhere west of Greenwich, so read a plain date as a local one. */
  TL.parseDate = function (iso) {
    if (!iso) return null;
    var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso).trim());
    var d = m ? new Date(+m[1], +m[2] - 1, +m[3]) : new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  };

  TL.formatDate = function (iso, opts) {
    var d = TL.parseDate(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US', opts || { year: 'numeric', month: 'short', day: 'numeric' });
  };

  TL.year = function (iso) {
    var d = TL.parseDate(iso);
    return d ? String(d.getFullYear()) : '';
  };

  /* "SEP 03" for the rail. */
  TL.railDate = function (iso) {
    var d = TL.parseDate(iso);
    if (!d) return '';
    return d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' }).toUpperCase();
  };

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
