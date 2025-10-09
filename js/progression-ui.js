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
    if (!global.Progression || typeof global.Progression.getLeaderboard !== 'function') {
      console.warn('[Progression UI] Progression system not available for leaderboard');
      return;
    }

    try {
      const seasonId = 1;
      const game = global.game || {};
      const players = game.players || [];
      
      // Get current state for all players (simplified - using same state for demo)
      const state = await global.Progression.getCurrentState();
      
      // Build leaderboard with actual player data
      const leaderboard = players
        .filter(p => !p.evicted)
        .map(p => ({
          playerId: p.id,
          playerName: p.name,
          totalXP: state.totalXP,
          level: state.level
        }))
        .sort((a, b) => b.totalXP - a.totalXP)
        .slice(0, 5);

      // Create leaderboard panel
      const tvOverlay = document.getElementById('tvOverlay');
      if (!tvOverlay) {
        console.warn('[Progression UI] TV overlay not found');
        return;
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
