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
    
    // Check localStorage
    try {
      const stored = localStorage.getItem('progression.enabled');
      if (stored !== null) {
        return stored === 'true';
      }
    } catch (e) {
      // localStorage not available
    }
    
    // Check game config
    if (global.g && global.g.cfg && typeof global.g.cfg.progressionEnabled === 'boolean') {
      return global.g.cfg.progressionEnabled;
    }
    
    // Default: disabled
    return false;
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
    
    // If not found, create it dynamically
    if (!badgeBtn) {
      // Dynamically import and create badge button
      import('../src/progression/xp-badge.js')
        .then(badgeModule => {
          badgeBtn = badgeModule.createBadgeButton({
            onClick: handleBadgeClick
          });
          console.info('[Progression UI] Badge button created dynamically');
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

        // Get leaderboard data
        let leaderboard = [];
        if (typeof global.Progression.getLeaderboard === 'function') {
          leaderboard = await global.Progression.getLeaderboard(seasonId);
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
   * Show the Top 5 leaderboard panel in TV area
   * @param {number} durationMs - How long to show the panel (default 7000ms)
   */
  async function showTop5Leaderboard(durationMs = 7000) {
    // Check feature flag first
    if (!isProgressionEnabled()) {
      console.log('[Progression UI] Top 5 leaderboard disabled (feature flag off)');
      return;
    }

    if (!global.Progression) {
      console.warn('[Progression UI] Progression system not available for leaderboard');
      return;
    }

    try {
      const seasonId = 1;
      const game = global.game || {};
      const players = game.players || [];
      
      let leaderboard = [];
      
      // Prefer getLeaderboard API
      if (typeof global.Progression.getLeaderboard === 'function') {
        leaderboard = await global.Progression.getLeaderboard(seasonId);
      } else if (typeof global.Progression.getPlayerState === 'function') {
        // Fallback: build leaderboard manually using getPlayerState
        const playerStates = await Promise.all(
          players
            .filter(p => !p.evicted)
            .map(p => global.Progression.getPlayerState(p.id))
        );
        
        leaderboard = players
          .filter(p => !p.evicted)
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

      // Create leaderboard panel
      let tvOverlay = document.getElementById('tvOverlay');
      if (!tvOverlay) {
        // Fallback: try to find #tv container
        const tvContainer = document.getElementById('tv');
        if (!tvContainer) {
          console.warn('[Progression UI] TV overlay and container not found');
          return;
        }
        // Create tvOverlay if it doesn't exist
        tvOverlay = document.createElement('div');
        tvOverlay.id = 'tvOverlay';
        tvOverlay.className = 'tvOverlay';
        tvContainer.appendChild(tvOverlay);
        console.info('[Progression UI] Created tvOverlay container');
      }

      const panel = document.createElement('div');
      panel.className = 'leaderboard-panel';
      panel.innerHTML = `
        <h2>🏆 Top 5 Players</h2>
        <ul class="leaderboard-list">
          ${leaderboard.map((player, index) => `
            <li class="leaderboard-item">
              <div class="leaderboard-rank">${index + 1}</div>
              <div class="leaderboard-name">${player.playerName}</div>
              <div class="leaderboard-xp">${player.totalXP} XP</div>
              <div class="leaderboard-level">${player.level}</div>
            </li>
          `).join('')}
        </ul>
      `;

      tvOverlay.appendChild(panel);

      // Auto-remove after duration
      setTimeout(() => {
        panel.style.animation = 'fadeOut 0.3s ease';
        setTimeout(() => {
          if (panel.parentNode) {
            panel.remove();
          }
        }, 300);
      }, durationMs);

    } catch (error) {
      console.error('[Progression UI] Failed to show leaderboard:', error);
    }
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
