// MODULE: progression-ui.js
// UI wiring for the progression system: badge button, modal, and end-of-game leaderboard

(function(global) {
  'use strict';

  // Wait for DOM to be ready
  function onReady(fn) {
    if (document.readyState !== 'loading') {
      fn();
    } else {
      document.addEventListener('DOMContentLoaded', fn);
    }
  }

  /**
   * Check if progression is enabled
   */
  function isProgressionEnabled() {
    // Check window.progression first
    if (global.progression && typeof global.progression.enabled === 'boolean') {
      return global.progression.enabled;
    }
    
    // Check localStorage - explicit false disables it
    try {
      const stored = localStorage.getItem('progression.enabled');
      if (stored !== null) {
        return stored !== 'false'; // Enabled unless explicitly set to 'false'
      }
    } catch (e) {
      // localStorage not available
    }
    
    // Check game config - explicit false disables it
    if (global.g && global.g.cfg && typeof global.g.cfg.progressionEnabled === 'boolean') {
      return global.g.cfg.progressionEnabled;
    }
    
    // Default: enabled
    return true;
  }

  /**
   * Initialize the leaderboard badge button
   */
  function initBadgeButton() {
    // Only initialize if progression is enabled
    if (!isProgressionEnabled()) {
      console.log('[Progression UI] Badge button disabled (feature flag off)');
      return;
    }

    // Check if badge already exists in DOM (from index.html)
    let badgeBtn = document.getElementById('xpLeaderboardBadge');
    
    // If not found, create it dynamically and add to topbar
    if (!badgeBtn) {
      // Dynamically import and create badge button
      import('../src/progression/xp-badge.js')
        .then(badgeModule => {
          badgeBtn = badgeModule.createBadgeButton({
            onClick: handleBadgeClick
          });
          
          // Insert into topbar at the end
          const topbar = document.querySelector('.topbar');
          
          if (topbar) {
            topbar.appendChild(badgeBtn);
            console.info('[Progression UI] Badge button created and added to topbar');
          } else {
            console.warn('[Progression UI] Could not find topbar');
          }
        })
        .catch(error => {
          console.error('[Progression UI] Failed to create badge button:', error);
        });
    } else {
      // Wire up existing badge button
      badgeBtn.addEventListener('click', handleBadgeClick);
      console.info('[Progression UI] Badge button wired from DOM');
    }
  }

  /**
   * Handle badge button click
   */
  async function handleBadgeClick() {
    if (global.Progression && typeof global.Progression.showModal === 'function') {
      try {
        // Get current season and player
        const game = global.game || {};
        const seasonId = 1; // Simplified for now
        const humanPlayer = (game.players || []).find(p => p.human) || game.players?.[0];
        const playerId = humanPlayer?.id || 'player1';
        const players = game.players || [];

        // Get leaderboard data - build from all players if needed
        let leaderboard = [];
        if (typeof global.Progression.getLeaderboard === 'function') {
          leaderboard = await global.Progression.getLeaderboard(seasonId);
        }
        
        // If we have fewer than 5 entries, build complete leaderboard from all players
        if (leaderboard.length < 5 && typeof global.Progression.getPlayerState === 'function' && players.length > 0) {
          console.info('[Progression UI Modal] Building complete leaderboard from all players');
          const allPlayerStates = await Promise.all(
            players.map(p => global.Progression.getPlayerState(p.id))
          );
          
          leaderboard = players
            .map((p, idx) => ({
              playerId: p.id,
              playerName: p.name,
              totalXP: allPlayerStates[idx]?.totalXP || 0,
              level: allPlayerStates[idx]?.level || 1
            }))
            .sort((a, b) => b.totalXP - a.totalXP);
        }

        // Show modal with leaderboard data
        await global.Progression.showModal(seasonId, playerId, leaderboard);
      } catch (error) {
        console.error('[Progression UI] Failed to show modal:', error);
      }
    } else {
      console.warn('[Progression UI] Progression system not available');
    }
  }

  /**
   * Show the Top 5 leaderboard panel in TV area (staged display)
   * @param {number} durationMs - How long to show the panel (default 7000ms)
   * @returns {Promise<void>} Resolves after panel is removed
   */
  async function showTop5Leaderboard(durationMs = 7000) {
    // Check feature flag first
    if (!isProgressionEnabled()) {
      console.log('[Progression UI] Top 5 leaderboard disabled (feature flag off)');
      return Promise.resolve();
    }

    if (!global.Progression) {
      console.warn('[Progression UI] Progression system not available for leaderboard');
      return Promise.resolve();
    }

    return new Promise(async (resolve) => {
      try {
        const seasonId = 1;
        const game = global.game || {};
        const players = game.players || [];
        
        let leaderboard = [];
        
        // Prefer getLeaderboard API
        if (typeof global.Progression.getLeaderboard === 'function') {
          leaderboard = await global.Progression.getLeaderboard(seasonId);
          
          // If we got fewer than 5 entries, build from all players
          if (leaderboard.length < 5 && typeof global.Progression.getPlayerState === 'function') {
            console.info('[Progression UI] Building complete leaderboard from all players');
            const allPlayerStates = await Promise.all(
              players.map(p => global.Progression.getPlayerState(p.id))
            );
            
            leaderboard = players
              .map((p, idx) => ({
                playerId: p.id,
                playerName: p.name,
                totalXP: allPlayerStates[idx]?.totalXP || 0,
                level: allPlayerStates[idx]?.level || 1
              }))
              .sort((a, b) => b.totalXP - a.totalXP)
              .slice(0, 5);
          }
        } else if (typeof global.Progression.getPlayerState === 'function') {
          // Fallback: build leaderboard manually using getPlayerState from all players
          const playerStates = await Promise.all(
            players.map(p => global.Progression.getPlayerState(p.id))
          );
          
          leaderboard = players
            .map((p, idx) => ({
              playerId: p.id,
              playerName: p.name,
              totalXP: playerStates[idx]?.totalXP || 0,
              level: playerStates[idx]?.level || 1
            }))
            .sort((a, b) => b.totalXP - a.totalXP)
            .slice(0, 5);
        } else {
          console.warn('[Progression UI] No leaderboard methods available');
          resolve();
          return;
        }
        
        // Ensure names are populated from game.players if missing
        leaderboard = leaderboard.map(entry => {
          if (!entry.playerName || entry.playerName === 'undefined') {
            const player = players.find(p => p.id === entry.playerId);
            entry.playerName = player?.name || entry.playerId;
          }
          return entry;
        });

        // Get tvOverlay container
        let tvOverlay = document.getElementById('tvOverlay');
        if (!tvOverlay) {
          // Fallback: try to find #tv container
          const tvContainer = document.getElementById('tv');
          if (!tvContainer) {
            console.warn('[Progression UI] TV overlay and container not found');
            resolve();
            return;
          }
          // Create tvOverlay if it doesn't exist
          tvOverlay = document.createElement('div');
          tvOverlay.id = 'tvOverlay';
          tvOverlay.className = 'tvOverlay';
          tvContainer.appendChild(tvOverlay);
          console.info('[Progression UI] Created tvOverlay container');
        }

        // Check for reduced motion preference
        const reducedMotion = global.MinigameAccessibility && typeof global.MinigameAccessibility.prefersReducedMotion === 'function'
          ? global.MinigameAccessibility.prefersReducedMotion()
          : window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        // Create panel structure with fixed-height container
        const panel = document.createElement('div');
        panel.className = 'leaderboard-panel';
        panel.innerHTML = `
          <h2>🏆 Top 5 Players</h2>
          <div class="leaderboard-list-host" aria-live="polite"></div>
        `;

        tvOverlay.appendChild(panel);

        const listHost = panel.querySelector('.leaderboard-list-host');

        // Helper function to render a segment (subset of leaderboard)
        function renderSegment(indexes) {
          const items = indexes
            .filter(i => i < leaderboard.length && leaderboard[i])
            .map(i => {
              const player = leaderboard[i];
              const isTop1 = i === 0;
              return `
                <li class="leaderboard-item ${isTop1 ? 'leaderboard-item-top1' : ''}">
                  <div class="leaderboard-rank">${i + 1}</div>
                  <div class="leaderboard-name">${player.playerName}</div>
                  <div class="leaderboard-xp">${player.totalXP} XP</div>
                  <div class="leaderboard-level ${isTop1 ? 'leaderboard-level-top1' : ''}">${player.level}</div>
                </li>
              `;
            })
            .join('');
          
          return `<ul class="leaderboard-list">${items}</ul>`;
        }

        // Stage A: show ranks 1, 2, 3
        const stageAIndexes = [0, 1, 2];
        // Stage B: show ranks 1, 4, 5
        const stageBIndexes = [0, 3, 4];

        // Split duration: bound stage A between 2.2s and 3.6s, split approximately 50/50
        const halfDuration = durationMs / 2;
        const stageADuration = Math.max(2200, Math.min(3600, halfDuration));
        const stageBDuration = durationMs - stageADuration - 600; // Reserve 600ms for fade out
        const fadeOutDuration = 600;

        console.info('[Progression UI] Staged leaderboard: Stage A:', stageADuration, 'ms, Stage B:', stageBDuration, 'ms, FadeOut:', fadeOutDuration, 'ms');

        // Render Stage A
        listHost.innerHTML = renderSegment(stageAIndexes);

        // Transition to Stage B after stageADuration
        setTimeout(() => {
          if (reducedMotion) {
            // Instant swap for reduced motion
            listHost.innerHTML = renderSegment(stageBIndexes);
          } else {
            // Crossfade transition
            listHost.classList.add('leaderboard-list-host-fade');
            setTimeout(() => {
              listHost.innerHTML = renderSegment(stageBIndexes);
              listHost.classList.remove('leaderboard-list-host-fade');
            }, 150); // Half of crossfade duration
          }
        }, stageADuration);

        // Fade out and remove after total duration
        setTimeout(() => {
          panel.style.animation = 'fadeOut 0.6s ease';
          setTimeout(() => {
            if (panel.parentNode) {
              panel.remove();
            }
            resolve();
          }, fadeOutDuration);
        }, stageADuration + stageBDuration);

      } catch (error) {
        console.error('[Progression UI] Failed to show leaderboard:', error);
        resolve();
      }
    });
  }

  // Initialize when ready
  onReady(() => {
    initBadgeButton();
    
    // Expose showTop5Leaderboard for use by game events
    global.showTop5Leaderboard = showTop5Leaderboard;
  });

  // Expose UI functions
  global.ProgressionUI = {
    showTop5Leaderboard
  };

})(window);
