/* The back-to-top control.

   The masthead is sticky, so the three tabs are always reachable; this is the
   other half of that — getting back to the top of the page you are on, which
   on a book section or an agent's detail page is a long way up.

   It appears only once there is something to go back to (one viewport of
   scroll), so it never sits on a short page doing nothing. */
(function () {
  'use strict';

  var btn = document.getElementById('to-top');
  if (!btn) return;

  var shown = false;

  /* Deliberately no requestAnimationFrame throttle. The handler reads two
     values that cost no layout and touches the DOM only when the state
     actually flips, so coalescing would buy nothing — and a rAF that never
     fires would leave the button stuck behind its own guard flag. */
  function update() {
    var want = window.scrollY > window.innerHeight;
    if (want === shown) return;
    shown = want;
    btn.classList.toggle('to-top--on', want);
  }

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update, { passive: true });

  btn.addEventListener('click', function () {
    /* Move focus as well as the viewport. Scrolling alone returns the page to
       the top but leaves a keyboard user's focus stranded in the middle of it,
       so the next Tab would jump them straight back down. preventScroll keeps
       the focus call from fighting the smooth scroll below. */
    var first = document.querySelector('.site-title a');
    if (first) {
      try { first.focus({ preventScroll: true }); } catch (e) { first.focus(); }
    }

    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    try {
      window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
    } catch (e) {
      window.scrollTo(0, 0);
    }
  });

  update();
})();
