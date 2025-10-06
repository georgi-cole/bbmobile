(function(global) {
  'use strict';

  /**
   * Show the "Get Ready for Week X" modal with auto-dismiss after 5 seconds or on click
   * @param {number} weekNumber - The week number to display
   * @param {function} callback - Function to call after modal dismisses
   */
  function showWeekIntroModal(weekNumber, callback) {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      inset: 0;
      background: rgba(4, 10, 18, 0.85);
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      cursor: pointer;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;

    // Create modal content
    const modal = document.createElement('div');
    modal.style.cssText = `
      background: linear-gradient(135deg, #1a2f44 0%, #243a50 100%);
      border: 2px solid #3d5a75;
      border-radius: 20px;
      padding: 40px 50px;
      text-align: center;
      box-shadow: 0 20px 60px -20px rgba(0, 0, 0, 0.9), 0 8px 24px -8px rgba(0, 0, 0, 0.7);
      max-width: 500px;
      width: 90%;
      transform: scale(0.85);
      transition: all 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
      pointer-events: none;
    `;

    // Create icons container
    const iconsContainer = document.createElement('div');
    iconsContainer.style.cssText = `
      font-size: 4rem;
      margin-bottom: 20px;
      display: flex;
      gap: 20px;
      justify-content: center;
      align-items: center;
    `;
    iconsContainer.innerHTML = '👁️🏠';

    // Create title
    const title = document.createElement('div');
    title.style.cssText = `
      font-size: 2rem;
      font-weight: 700;
      color: #ffffff;
      margin-bottom: 12px;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.5);
      letter-spacing: 0.5px;
    `;
    title.textContent = `Get Ready for Week ${weekNumber}!`;

    // Create subtitle
    const subtitle = document.createElement('div');
    subtitle.style.cssText = `
      font-size: 1rem;
      color: #b2c2d5;
      margin-bottom: 20px;
    `;
    subtitle.textContent = 'The HOH competition is about to begin';

    // Create hint text
    const hint = document.createElement('div');
    hint.style.cssText = `
      font-size: 0.85rem;
      color: #8a9fb5;
      margin-top: 10px;
      opacity: 0.7;
    `;
    hint.textContent = 'Click anywhere to continue';

    // Assemble modal
    modal.appendChild(iconsContainer);
    modal.appendChild(title);
    modal.appendChild(subtitle);
    modal.appendChild(hint);
    overlay.appendChild(modal);

    // Add to document
    document.body.appendChild(overlay);

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
      modal.style.transform = 'scale(1)';
    });

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      // Fade out
      overlay.style.opacity = '0';
      modal.style.transform = 'scale(0.95)';

      setTimeout(() => {
        if (overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        if (typeof callback === 'function') {
          callback();
        }
      }, 300); // Match fade-out duration
    };

    // Auto-dismiss after 5 seconds
    const autoDismissTimer = setTimeout(dismiss, 5000);

    // Dismiss on click
    overlay.addEventListener('click', () => {
      clearTimeout(autoDismissTimer);
      dismiss();
    });
  }

  // Register globally IMMEDIATELY (not deferred)
  global.showWeekIntroModal = showWeekIntroModal;
  console.info('[ui.week-intro] showWeekIntroModal registered globally');

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
