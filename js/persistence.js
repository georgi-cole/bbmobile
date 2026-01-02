// MODULE: persistence.js
// Save/load game state to localStorage for profile-based game persistence

(function(global){
  'use strict';

  /**
   * Save current game state to localStorage
   * @returns {boolean} true if save successful, false otherwise
   */
  function saveGame() {
    try {
      // Check if guest mode
      if (typeof global.ProfileService !== 'undefined' && global.ProfileService.isGuestMode()) {
        console.warn('[persistence] Cannot save in guest mode');
        return false;
      }

      // Get current profile
      const profile = global.ProfileService?.getCurrentProfile();
      if (!profile || !profile.id) {
        console.warn('[persistence] No profile found for save');
        return false;
      }

      // Check if game exists
      if (!global.game) {
        console.warn('[persistence] No game state to save');
        return false;
      }

      // Create save object
      const saveData = {
        version: '1.0',
        timestamp: Date.now(),
        profileId: profile.id,
        gameState: {
          // Core game state
          phase: global.game.phase,
          week: global.game.week,
          season: global.game.season,
          humanId: global.game.humanId,
          
          // Players array (with all properties)
          players: global.game.players ? JSON.parse(JSON.stringify(global.game.players)) : [],
          
          // Competition state
          hohId: global.game.hohId,
          nominees: global.game.nominees ? [...global.game.nominees] : [],
          vetoHolder: global.game.vetoHolder,
          vetoUsed: global.game.vetoUsed,
          
          // Jury state
          jury: global.game.jury ? [...global.game.jury] : [],
          
          // Config (preserve settings)
          cfg: global.game.cfg ? JSON.parse(JSON.stringify(global.game.cfg)) : {},
          
          // Additional state that might be needed
          twists: global.game.twists ? JSON.parse(JSON.stringify(global.game.twists)) : {},
          history: global.game.history ? JSON.parse(JSON.stringify(global.game.history)) : [],
          
          // Preserve any other important state
          final3: global.game.final3 ? JSON.parse(JSON.stringify(global.game.final3)) : null,
          winner: global.game.winner,
          runnerUp: global.game.runnerUp
        }
      };

      // Save to localStorage
      const storageKey = `bb_saved_game_${profile.id}`;
      localStorage.setItem(storageKey, JSON.stringify(saveData));
      
      console.info('[persistence] Game saved successfully for profile:', profile.id);
      return true;
    } catch (e) {
      console.error('[persistence] Failed to save game:', e);
      return false;
    }
  }

  /**
   * Load saved game state from localStorage
   * @param {string} profileId - Profile ID to load game for
   * @returns {Object|null} Saved game state or null if not found
   */
  function loadGame(profileId) {
    try {
      if (!profileId) {
        console.warn('[persistence] No profile ID provided for load');
        return null;
      }

      const storageKey = `bb_saved_game_${profileId}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (!savedData) {
        console.info('[persistence] No saved game found for profile:', profileId);
        return null;
      }

      const saveData = JSON.parse(savedData);
      
      // Validate save data
      if (!saveData.gameState || !saveData.profileId) {
        console.warn('[persistence] Invalid save data format');
        return null;
      }

      // Verify profile ID matches
      if (saveData.profileId !== profileId) {
        console.warn('[persistence] Profile ID mismatch in save data');
        return null;
      }

      console.info('[persistence] Loaded saved game for profile:', profileId);
      return saveData.gameState;
    } catch (e) {
      console.error('[persistence] Failed to load game:', e);
      return null;
    }
  }

  /**
   * Check if a saved game exists for a profile
   * @param {string} profileId - Profile ID to check
   * @returns {boolean} true if saved game exists
   */
  function hasSavedGame(profileId) {
    if (!profileId) return false;
    
    try {
      const storageKey = `bb_saved_game_${profileId}`;
      const savedData = localStorage.getItem(storageKey);
      return savedData !== null;
    } catch (e) {
      console.error('[persistence] Error checking for saved game:', e);
      return false;
    }
  }

  /**
   * Clear saved game for a profile
   * @param {string} profileId - Profile ID to clear save for
   * @returns {boolean} true if cleared successfully
   */
  function clearSavedGame(profileId) {
    try {
      if (!profileId) {
        console.warn('[persistence] No profile ID provided for clear');
        return false;
      }

      const storageKey = `bb_saved_game_${profileId}`;
      localStorage.removeItem(storageKey);
      
      console.info('[persistence] Cleared saved game for profile:', profileId);
      return true;
    } catch (e) {
      console.error('[persistence] Failed to clear saved game:', e);
      return false;
    }
  }

  /**
   * Get save metadata (without loading full game state)
   * @param {string} profileId - Profile ID to get metadata for
   * @returns {Object|null} Save metadata or null if not found
   */
  function getSaveMetadata(profileId) {
    try {
      if (!profileId) return null;

      const storageKey = `bb_saved_game_${profileId}`;
      const savedData = localStorage.getItem(storageKey);
      
      if (!savedData) return null;

      const saveData = JSON.parse(savedData);
      
      return {
        timestamp: saveData.timestamp,
        version: saveData.version,
        week: saveData.gameState?.week,
        phase: saveData.gameState?.phase,
        alivePlayers: saveData.gameState?.players?.filter(p => !p.evicted).length
      };
    } catch (e) {
      console.error('[persistence] Failed to get save metadata:', e);
      return null;
    }
  }

  // Legacy placeholders for other features
  function exportSave(){ alert('Export will be available in a later batch.'); }
  function importSaveObject(){ alert('Import will be available in a later batch.'); }

  // Expose to global
  global.saveGame = saveGame;
  global.loadGame = loadGame;
  global.hasSavedGame = hasSavedGame;
  global.clearSavedGame = clearSavedGame;
  global.getSaveMetadata = getSaveMetadata;
  global.exportSave = exportSave;
  global.importSaveObject = importSaveObject;

  console.info('[persistence] Save/load system initialized');

})(window);