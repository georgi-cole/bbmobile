// MODULE: juror-return-controller.js
// Orchestrator for America's Vote juror-return flow with UX improvements:
// - Pauses game while voting modal is active
// - Detects when vote percentages stabilize and immediately hides modal
// - Announces winner with compact faux-TV card + small non-fullscreen modal
// - Triggers revival animation to colorize juror avatar
// - Updates HUD/roster and resumes game

(function(global) {
  'use strict';

  const JurorReturnController = {
    // State
    isActive: false,
    isWatching: false,
    overlayElement: null,
    pollInterval: null,
    lastPercentages: null,
    stableCount: 0,
    voteStartTime: null,
    
    // Config
    POLL_INTERVAL_MS: 100,         // Check percentages every 100ms
    STABLE_WINDOW_MS: 300,         // Must be stable for 300ms
    MIN_VOTE_DURATION_MS: 700      // Let vote run at least 700ms
  };

  /**
   * Start watching for juror overlay appearance
   */
  function startWatch() {
    if (JurorReturnController.isWatching) {
      console.info('[JurorReturnController] Already watching');
      return;
    }

    JurorReturnController.isWatching = true;
    console.info('[JurorReturnController] Starting watch for juror overlay');

    // Set up MutationObserver to detect overlay insertion
    const observer = new MutationObserver(() => {
      if (JurorReturnController.isActive) return;
      detectAndHandleOverlay();
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Initial check in case overlay already exists
    detectAndHandleOverlay();
  }

  /**
   * Detect juror overlay and start handling it
   */
  function detectAndHandleOverlay() {
    // Try multiple selectors for overlay
    const overlay = document.querySelector('.juror-overlay') ||
                    document.getElementById('juror-overlay') ||
                    document.querySelector('[data-juror-vote]') ||
                    document.querySelector('.juror-vote-container');

    if (!overlay) return;

    // Check if overlay is visible (not hidden)
    const isHidden = overlay.classList.contains('hidden') ||
                     overlay.style.display === 'none' ||
                     !overlay.offsetParent;

    if (isHidden) return;

    // Found visible overlay - start handling
    console.info('[JurorReturnController] Detected juror overlay');
    handleOverlayAppeared(overlay);
  }

  /**
   * Handle overlay appearance
   */
  function handleOverlayAppeared(overlay) {
    if (JurorReturnController.isActive) return;

    JurorReturnController.isActive = true;
    JurorReturnController.overlayElement = overlay;
    JurorReturnController.voteStartTime = Date.now();
    JurorReturnController.lastPercentages = null;
    JurorReturnController.stableCount = 0;

    console.info('[JurorReturnController] Overlay appeared - pausing game');

    // Pause game using GameControl API
    if (global.GameControl && typeof global.GameControl.pauseForVoting === 'function') {
      global.GameControl.pauseForVoting();
    }

    // Start polling for percentage stability
    startPercentagePolling();
  }

  /**
   * Start polling percentage text nodes to detect stability
   */
  function startPercentagePolling() {
    if (JurorReturnController.pollInterval) {
      clearInterval(JurorReturnController.pollInterval);
    }

    JurorReturnController.pollInterval = setInterval(() => {
      checkPercentageStability();
    }, JurorReturnController.POLL_INTERVAL_MS);
  }

  /**
   * Check if vote percentages are stable
   */
  function checkPercentageStability() {
    const overlay = JurorReturnController.overlayElement;
    if (!overlay) return;

    // Ensure minimum vote duration has passed
    const elapsed = Date.now() - JurorReturnController.voteStartTime;
    if (elapsed < JurorReturnController.MIN_VOTE_DURATION_MS) {
      return;
    }

    // Extract current percentages from overlay
    const currentPercentages = extractPercentages(overlay);

    if (!currentPercentages || currentPercentages.length === 0) {
      return;
    }

    // Compare with last percentages
    if (JurorReturnController.lastPercentages) {
      const isStable = arePercentagesStable(
        JurorReturnController.lastPercentages,
        currentPercentages
      );

      if (isStable) {
        JurorReturnController.stableCount++;

        // Calculate how many checks needed for stable window
        const checksNeeded = Math.ceil(
          JurorReturnController.STABLE_WINDOW_MS / JurorReturnController.POLL_INTERVAL_MS
        );

        if (JurorReturnController.stableCount >= checksNeeded) {
          console.info('[JurorReturnController] Percentages stable - finalizing');
          stopPolling();
          handleVotingComplete();
        }
      } else {
        // Reset stable count if percentages changed
        JurorReturnController.stableCount = 0;
      }
    }

    // Store current percentages for next comparison
    JurorReturnController.lastPercentages = currentPercentages;
  }

  /**
   * Extract percentage values from overlay
   */
  function extractPercentages(overlay) {
    const percentages = [];

    // Look for elements with class 'avPct' (from jury_return_vote.js)
    const pctElements = overlay.querySelectorAll('.avPct');
    pctElements.forEach(el => {
      const text = el.textContent.trim();
      const match = text.match(/(\d+)%/);
      if (match) {
        percentages.push(parseInt(match[1], 10));
      }
    });

    // Fallback: look for any text nodes containing percentage
    if (percentages.length === 0) {
      const allText = overlay.textContent;
      const matches = allText.match(/(\d+)%/g);
      if (matches) {
        matches.forEach(m => {
          const num = parseInt(m, 10);
          if (!isNaN(num)) percentages.push(num);
        });
      }
    }

    return percentages;
  }

  /**
   * Check if two percentage arrays are stable (unchanged)
   */
  function arePercentagesStable(prev, current) {
    if (prev.length !== current.length) return false;

    for (let i = 0; i < prev.length; i++) {
      if (prev[i] !== current[i]) return false;
    }

    return true;
  }

  /**
   * Stop percentage polling
   */
  function stopPolling() {
    if (JurorReturnController.pollInterval) {
      clearInterval(JurorReturnController.pollInterval);
      JurorReturnController.pollInterval = null;
    }
  }

  /**
   * Handle voting completion - hide overlay, announce winner, animate revival
   */
  async function handleVotingComplete() {
    console.info('[JurorReturnController] Voting complete - processing winner');

    // Immediately hide overlay
    hideOverlay();

    // Small delay for transition
    await sleep(200);

    // Determine winner
    const winner = determineWinner();

    if (!winner) {
      console.warn('[JurorReturnController] Could not determine winner');
      finalize();
      return;
    }

    console.info('[JurorReturnController] Winner:', winner.name);

    // Announce winner with compact TV card and small modal
    await announceWinner(winner);

    // Trigger revival animation
    await animateRevival(winner.id);

    // Update HUD and roster
    updateGameState(winner.id);

    // Resume game and finalize
    finalize();
  }

  /**
   * Hide the juror overlay immediately
   */
  function hideOverlay() {
    const overlay = JurorReturnController.overlayElement;
    if (!overlay) return;

    console.info('[JurorReturnController] Hiding overlay');

    // Try using JurorReturnOverlay API if available
    if (global.JurorReturnOverlay && typeof global.JurorReturnOverlay.hide === 'function') {
      global.JurorReturnOverlay.hide();
      return;
    }

    // Fallback: DOM manipulation
    overlay.classList.add('hidden');
    overlay.style.display = 'none';

    // Also try to hide parent container if it's a modal backdrop
    const parent = overlay.parentElement;
    if (parent && parent.classList.contains('juror-overlay-backdrop')) {
      parent.classList.add('hidden');
      parent.style.display = 'none';
    }
  }

  /**
   * Determine the winner from game state
   */
  function determineWinner() {
    const g = global.game;
    if (!g) return null;

    // Try to get winner from game.__juryReturn.scores (from jury_return.js)
    if (g.__juryReturn && g.__juryReturn.scores instanceof Map) {
      let maxScore = -1;
      let winnerId = null;

      g.__juryReturn.scores.forEach((score, id) => {
        if (score > maxScore) {
          maxScore = score;
          winnerId = id;
        }
      });

      if (winnerId !== null) {
        return buildPlayerObject(winnerId);
      }
    }

    // Fallback: try to find winner from overlay percentages
    const overlay = JurorReturnController.overlayElement;
    if (overlay) {
      const cards = overlay.querySelectorAll('[data-j-id]');
      let maxPct = -1;
      let winnerId = null;

      cards.forEach(card => {
        const id = card.getAttribute('data-j-id');
        const pctEl = card.querySelector('.avPct');
        if (pctEl) {
          const text = pctEl.textContent.trim();
          const match = text.match(/(\d+)%/);
          if (match) {
            const pct = parseInt(match[1], 10);
            if (pct > maxPct) {
              maxPct = pct;
              winnerId = id;
            }
          }
        }
      });

      if (winnerId) {
        return buildPlayerObject(winnerId);
      }
    }

    return null;
  }

  /**
   * Build player object from ID
   */
  function buildPlayerObject(id) {
    const player = global.getP ? global.getP(id) : null;
    const name = global.safeName ? global.safeName(id) : String(id);

    return {
      id: parseInt(id) || id,
      name: name,
      player: player
    };
  }

  /**
   * Announce winner with compact TV card and small modal (Fan Favorite style)
   */
  async function announceWinner(winner) {
    console.info('[JurorReturnController] Announcing winner:', winner.name);

    // Show on TV using TvStatus if available
    if (global.TvStatus && typeof global.TvStatus.set === 'function') {
      global.TvStatus.set(`🎉 ${winner.name} Returns!`, 'success');
    }

    // Show card using showCard if available
    if (typeof global.showCard === 'function') {
      await global.showCard(
        'America Has Voted! 🗳️',
        [`${winner.name} is returning to the house!`],
        'success',
        2500,
        true
      );
    }

    // Small delay for card to be visible
    await sleep(2500);
  }

  /**
   * Trigger revival animation
   */
  async function animateRevival(winnerId) {
    console.info('[JurorReturnController] Triggering revival animation');

    // Try using global.animateRevivalAvatar if available
    if (typeof global.animateRevivalAvatar === 'function') {
      try {
        await global.animateRevivalAvatar(winnerId);
      } catch (err) {
        console.warn('[JurorReturnController] Revival animation error:', err);
        // Fallback: wait for simulated animation time
        await sleep(1500);
      }
    } else {
      console.warn('[JurorReturnController] animateRevivalAvatar not available, using fallback wait');
      await sleep(1500);
    }
  }

  /**
   * Update game state and HUD
   */
  function updateGameState(winnerId) {
    console.info('[JurorReturnController] Updating game state');

    // Update HUD if available
    if (typeof global.updateHud === 'function') {
      global.updateHud();
    }

    // Dispatch event
    const g = global.game;
    if (g && g.bus && typeof g.bus.emit === 'function') {
      g.bus.emit('juror:return:completed', {
        winnerId,
        timestamp: Date.now()
      });
    }
  }

  /**
   * Finalize and cleanup
   */
  function finalize() {
    console.info('[JurorReturnController] Finalizing');

    // Resume game using GameControl API
    if (global.GameControl && typeof global.GameControl.resumeFromVoting === 'function') {
      global.GameControl.resumeFromVoting();
    }

    // Reset state
    JurorReturnController.isActive = false;
    JurorReturnController.overlayElement = null;
    JurorReturnController.lastPercentages = null;
    JurorReturnController.stableCount = 0;
    JurorReturnController.voteStartTime = null;
  }

  /**
   * Sleep helper
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Export to global namespace
  JurorReturnController.startWatch = startWatch;
  global.JurorReturnController = JurorReturnController;

  // Auto-init on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      startWatch();
    });
  } else {
    // DOM already loaded
    startWatch();
  }

  console.info('[JurorReturnController] Module loaded');

})(window);
