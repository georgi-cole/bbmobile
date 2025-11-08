(function(global) {
  'use strict';

  /**
   * Show the "Get Ready for Week X" modal with auto-dismiss after 5 seconds or on click
   * @param {number} weekNumber - The week number to display
   * @param {function} callback - Function to call after modal dismisses
   */
  function showWeekIntroModal(weekNumber, callback) {
    // Create modal content (no overlay needed - unified mount provides centering)
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

    // Mount using unified popup system
    const wrapper = global.mountCenteredPopup(modal, {
      replace: true,
      className: 'week-intro-modal',
      dialog: true
    });

    if (!wrapper) {
      console.error('[week-intro] Failed to mount popup');
      if (typeof callback === 'function') callback();
      return;
    }

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;

      // Fade out with animation
      wrapper.style.animation = 'popupFadeOut 0.3s ease';

      setTimeout(() => {
        global.unmountPopups();
        if (typeof callback === 'function') {
          callback();
        }
      }, 300); // Match fade-out duration
    };

    // Auto-dismiss after 5 seconds
    const autoDismissTimer = setTimeout(dismiss, 5000);

    // Dismiss on click (on wrapper)
    wrapper.addEventListener('click', () => {
      clearTimeout(autoDismissTimer);
      dismiss();
    });
  }

  // Register globally IMMEDIATELY (not deferred)
  global.showWeekIntroModal = showWeekIntroModal;
  console.info('[ui.week-intro] showWeekIntroModal registered globally');

  /**
   * Show twist announcement modal if a twist is active
   * @param {function} callback - Function to call after twist modal dismisses
   */
  async function showTwistAnnouncementIfNeeded(callback) {
    const g = global.game || {};
    
    // Check if a twist is active and event modal is available
    if (typeof global.showEventModal !== 'function') {
      if (typeof callback === 'function') callback();
      return;
    }

    let twistConfig = null;

    // Check for double eviction - use only __twistMode
    if (g.__twistMode === 'double') {
      twistConfig = {
        title: 'House Shock!',
        emojis: '⚠️😱',
        subtitle: 'Double Eviction Week!! Three nominees — two leave.',
        tone: 'danger',
        duration: 4000
      };
    }
    // Check for triple eviction - use only __twistMode
    else if (g.__twistMode === 'triple') {
      twistConfig = {
        title: 'House Shock!',
        emojis: '⚠️💥😱',
        subtitle: 'Triple Eviction Week!!! Four nominees — three leave.',
        tone: 'danger',
        duration: 4000
      };
    }
    // Check for juror return (based on centralized decision logic)
    else if (typeof global.decideJurorReturnThisWeek === 'function') {
      // Use centralized helper if available (includes eligibility + RNG)
      if (global.decideJurorReturnThisWeek(g) && !g.__jurorReturnModalShown) {
        twistConfig = {
          title: 'House Shock!',
          emojis: '👁️⚖️🔙',
          subtitle: 'A jury member re-enters the house!',
          tone: 'special',
          duration: 4000
        };
        g.__jurorReturnModalShown = true;
      }
    }
    // Fallback for legacy behavior (if helpers not loaded)
    else if (g.__jurorReturnPending || (g.juryHouse && g.juryHouse.length > 0 && !g.__jurorReturnDone && !g.__americaReturnDone)) {
      // Only show if we're about to trigger a juror return and modal hasn't been shown yet
      const alive = (typeof global.alivePlayers === 'function') ? global.alivePlayers() : [];
      const shouldReturn = alive.length >= 4 && alive.length <= 6;
      
      if (shouldReturn && g.juryHouse && g.juryHouse.length > 0 && !g.__jurorReturnModalShown) {
        twistConfig = {
          title: 'House Shock!',
          emojis: '👁️⚖️🔙',
          subtitle: 'A jury member re-enters the house!',
          tone: 'special',
          duration: 4000
        };
        g.__jurorReturnModalShown = true;
      }
    }

    // Show twist modal if configured
    if (twistConfig) {
      console.info('[ui.week-intro] Showing twist announcement:', twistConfig.subtitle);
      try {
        await global.showEventModal(twistConfig);
        
        // Set badge flag after modal resolves, then update HUD to show badge
        g.__twistBadgeShown = true;
        
        // After modal, update the twist badge in TV area
        if(typeof global.TV?.updateTwistBadge === 'function'){
          global.TV.updateTwistBadge();
        }
        
        // Update HUD to reflect badge state
        if(typeof global.updateHud === 'function'){
          global.updateHud();
        }
      } catch (e) {
        console.error('[ui.week-intro] Error showing twist modal:', e);
        // Still show badge even if modal throws
        g.__twistBadgeShown = true;
        if(typeof global.TV?.updateTwistBadge === 'function'){
          global.TV.updateTwistBadge();
        }
        if(typeof global.updateHud === 'function'){
          global.updateHud();
        }
      }
    }

    // Call callback after twist modal (or immediately if no twist)
    if (typeof callback === 'function') {
      callback();
    }
  }

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
            // After week intro modal, show twist announcement if needed
            showTwistAnnouncementIfNeeded(() => {
              try {
                origStartHOH.apply(global, arguments);
              } catch (e) {
                console.error('[ui.week-intro] Error in wrapped startHOH:', e);
              }
            });
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

  // Expose twist announcement function globally
  global.showTwistAnnouncementIfNeeded = showTwistAnnouncementIfNeeded;

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
