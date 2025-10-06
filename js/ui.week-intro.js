(function(global) {
  'use strict';

  /**
   * Wrap the `startHOH` function to show the "Get Ready for Week X" modal before it starts.
   */
  function wrapStartHOH() {
    const origStartHOH = global.startHOH;
    if (typeof origStartHOH === 'function' && !origStartHOH.__wrappedForWeekIntro) {
      global.startHOH = function wrappedStartHOH() {
        const g = global.game || {};
        if (!g.__weekIntroShownFor || g.__weekIntroShownFor !== g.week) {
          g.__weekIntroShownFor = g.week;
          return global.showWeekIntroModal(g.week, () => {
            try {
              origStartHOH.apply(global, arguments);
            } catch (e) {
              console.error('[ui.week-intro] Error in wrapped startHOH:', e);
            }
          });
        }
        return origStartHOH.apply(global, arguments);
      };
      global.startHOH.__wrappedForWeekIntro = true;
      console.info('[ui.week-intro] startHOH successfully wrapped for week intro modal.');
    } else if (!origStartHOH) {
      console.warn('[ui.week-intro] startHOH not found — wrapper inactive');
    }
  }

  /**
   * Wait until `startHOH` is defined, then wrap it.
   */
  function ensureStartHOHWrapper() {
    if (typeof global.startHOH === 'undefined') {
      const interval = setInterval(() => {
        if (typeof global.startHOH === 'function') {
          clearInterval(interval);
          wrapStartHOH();
        }
      }, 100); // Check every 100ms
    } else {
      wrapStartHOH();
    }
  }

  // Ensure the wrapper is applied after the DOM is fully loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureStartHOHWrapper, { once: true });
  } else {
    ensureStartHOHWrapper();
  }

})(window);
