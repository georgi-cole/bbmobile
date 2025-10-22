/* Hide the top roster until the game actually starts.
   - Injects CSS using a data attribute on <body>.
   - Sets data-roster-hidden="true" on load (houseguests haven't entered yet).
   - Reveals the roster when either:
     • finishOpening() runs (classic/reality-TV intro path), or
     • FastCastAnimation.play() completes (returning user fast-cast path).
*/
(function (g) {
  'use strict';
  if (!g || !document) return;

  const ATTR = 'data-roster-hidden';

  function injectCss() {
    if (document.getElementById('bbRosterVisibilityCSS')) return;
    const style = document.createElement('style');
    style.id = 'bbRosterVisibilityCSS';
    style.textContent = `
      /* Hidden state */
      body[${ATTR}="true"] .top-roster,
      body[${ATTR}="true"] #topRoster,
      body[${ATTR}="true"] .roster-strip,
      body[${ATTR}="true"] .cast-strip {
        visibility: hidden !important;
        opacity: 0 !important;
        pointer-events: none !important;
        transition: opacity 300ms ease;
      }
      /* Visible state */
      body:not([${ATTR}]) .top-roster,
      body:not([${ATTR}]) #topRoster,
      body:not([${ATTR}]) .roster-strip,
      body:not([${ATTR}]) .cast-strip {
        visibility: visible;
        opacity: 1;
        pointer-events: auto;
      }
    `;
    document.head.appendChild(style);
  }

  function hide() { try { document.body.setAttribute(ATTR, 'true'); } catch {} }
  function show() { try { document.body.removeAttribute(ATTR); } catch {} }

  function tryWrapFinishOpening() {
    const orig = g.finishOpening;
    if (typeof orig !== 'function') return false;
    if (orig.__bbRosterWrapped) return true;

    const wrapped = function revealRosterAfterOpening() {
      try { show(); } catch {}
      return orig.apply(this, arguments);
    };
    wrapped.__bbRosterWrapped = true;
    g.finishOpening = wrapped;
    return true;
  }

  function tryWrapFastCast() {
    const fc = (g.FastCastAnimation || g.window?.FastCastAnimation);
    if (!fc || typeof fc.play !== 'function') return false;
    if (fc.play.__bbRosterWrapped) return true;

    const origPlay = fc.play;
    fc.play = function wrappedFastCast(players, onComplete) {
      const cb = function () {
        try { show(); } catch {}
        try { onComplete && onComplete(); } catch {}
      };
      return origPlay.call(this, players, cb);
    };
    fc.play.__bbRosterWrapped = true;
    return true;
  }

  function init() {
    injectCss();
    hide();

    // Wrap finishOpening (classic/reality-TV intro path)
    if (!tryWrapFinishOpening()) {
      let tries = 0;
      const t1 = setInterval(() => {
        tries++;
        if (tryWrapFinishOpening() || tries > 40) clearInterval(t1);
      }, 100);
    }

    // Wrap FastCastAnimation.play (returning user path)
    if (!tryWrapFastCast()) {
      let tries = 0;
      const t2 = setInterval(() => {
        tries++;
        if (tryWrapFastCast() || tries > 40) clearInterval(t2);
      }, 100);
    }

    g.RosterVisibility = { hide, show };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window);
