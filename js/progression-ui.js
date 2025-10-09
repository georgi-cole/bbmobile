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
   * Initialize the leaderboard badge button
   */
  function initBadgeButton() {
    const badgeBtn = document.getElementById('xpLeaderboardBadge');
    if (!badgeBtn) {
      console.warn('[Progression UI] Badge button not found');
      return;
    }

    badgeBtn.addEventListener('click', async () => {
      if (global.Progression && typeof global.Progression.showModal === 'function') {
        try {
          // Get current season and player
          const game = global.game || {};
          const seasonId = 1; // Simplified for now
          const humanPlayer = (game.players || []).find(p => p.human) || game.players?.[0];
          const playerId = humanPlayer?.id || 'player1';

          await global.Progression.showModal(seasonId, playerId);
        } catch (error) {
          console.error('[Progression UI] Failed to show modal:', error);
        }
      } else {
        console.warn('[Progression UI] Progression system not available');
      }
    });
  }

  /**
   * Show the Top 5 leaderboard panel in TV area
   * @param {number} durationMs - How long to show the panel (default 7000ms)
   */
  async function showTop5Leaderboard(durationMs = 7000) {
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
