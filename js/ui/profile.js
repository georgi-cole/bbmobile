// MODULE: ui/profile.js
// Profile UI integration with Relations module
// Handles rendering of player profiles with symmetric ally/enemy display

(function(global) {
  'use strict';

  /**
   * Render allies list for a player using Relations module
   * @param {number} playerId - Player ID
   * @returns {string} HTML string of allies
   */
  function renderAlliesList(playerId) {
    if (!global.Relations) {
      console.warn('[Profile UI] Relations module not loaded');
      return '<div>None</div>';
    }

    const allies = global.Relations.getAllies(playerId);
    
    if (!allies || allies.length === 0) {
      return '<div>None</div>';
    }

    const g = global.game;
    if (!g || !g.players) {
      return '<div>None</div>';
    }

    const allyNames = allies
      .map(allyId => {
        const ally = g.players.find(p => p.id === allyId);
        return ally ? ally.name : `Player ${allyId}`;
      })
      .join(', ');

    return `<div>${allyNames}</div>`;
  }

  /**
   * Render enemies list for a player using Relations module
   * @param {number} playerId - Player ID
   * @returns {string} HTML string of enemies
   */
  function renderEnemiesList(playerId) {
    if (!global.Relations) {
      console.warn('[Profile UI] Relations module not loaded');
      return '<div>None</div>';
    }

    const enemies = global.Relations.getEnemies(playerId);
    
    if (!enemies || enemies.length === 0) {
      return '<div>None</div>';
    }

    const g = global.game;
    if (!g || !g.players) {
      return '<div>None</div>';
    }

    const enemyNames = enemies
      .map(enemyId => {
        const enemy = g.players.find(p => p.id === enemyId);
        return enemy ? enemy.name : `Player ${enemyId}`;
      })
      .join(', ');

    return `<div>${enemyNames}</div>`;
  }

  /**
   * Update profile popup display for a player
   * @param {number} playerId - Player ID
   */
  function updateProfileDisplay(playerId) {
    // Find profile popup elements
    const alliesContainer = document.querySelector(`[data-profile-id="${playerId}"] .profile-allies`);
    const enemiesContainer = document.querySelector(`[data-profile-id="${playerId}"] .profile-enemies`);

    if (alliesContainer) {
      alliesContainer.innerHTML = renderAlliesList(playerId);
    }

    if (enemiesContainer) {
      enemiesContainer.innerHTML = renderEnemiesList(playerId);
    }
  }

  /**
   * Setup event listeners for relation changes
   */
  function setupRelationListeners() {
    if (!global.game || !global.game.bus) {
      console.warn('[Profile UI] Game bus not available, skipping listener setup');
      return;
    }

    // Listen for relation changes
    global.game.bus.on('social.relation.changed', (data) => {
      const { playerA, playerB, bondType } = data;
      
      // Update both players' profiles if they're visible
      if (bondType === 'ally' || bondType === 'enemy') {
        updateProfileDisplay(playerA);
        updateProfileDisplay(playerB);
      }
    });

    // Listen for relations sync (after load)
    global.game.bus.on('social.relations.synced', () => {
      console.info('[Profile UI] Relations synced, refreshing visible profiles');
      
      // Refresh all visible profile popups
      const visibleProfiles = document.querySelectorAll('[data-profile-id]');
      visibleProfiles.forEach(elem => {
        const playerId = parseInt(elem.getAttribute('data-profile-id'), 10);
        if (!isNaN(playerId)) {
          updateProfileDisplay(playerId);
        }
      });
    });

    console.info('[Profile UI] ✓ Relation listeners setup');
  }

  // Initialize on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupRelationListeners);
  } else {
    setupRelationListeners();
  }

  // Export to global scope
  global.ProfileUI = {
    renderAlliesList,
    renderEnemiesList,
    updateProfileDisplay,
    setupRelationListeners
  };

  console.info('[Profile UI] ✓ Profile UI module loaded');

})(window);
