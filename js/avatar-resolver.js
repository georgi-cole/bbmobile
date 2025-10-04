// MODULE: avatar-resolver.js
// Avatar resolution and preloading system using ./avatars/ folder

(function(g){
  'use strict';

  // Helper to get player object by ID
  function gp(id) {
    return g.getP?.(id) || (g.game?.players || g.players || []).find(p => p?.id === id);
  }

  // Helper to get player name
  function safeName(id) {
    const player = gp(id);
    return player?.name || String(id);
  }

  /**
   * Resolve avatar with priority:
   * 1. ./avatars/{playerId}.jpg (local avatar folder)
   * 2. player.avatar (if defined in player object)
   * 3. player.img (legacy property support)
   * 4. player.photo (legacy property support)
   * 5. Dicebear API fallback
   * 
   * @param {string|object} playerIdOrObject - Player ID string or player object
   * @returns {string} Avatar URL/path
   */
  function resolveAvatar(playerIdOrObject) {
    // Handle both player object and player ID
    let playerId, player;
    
    if (typeof playerIdOrObject === 'object' && playerIdOrObject !== null) {
      player = playerIdOrObject;
      playerId = player.id;
    } else {
      playerId = playerIdOrObject;
      player = gp(playerId);
    }
    
    // Priority 1: Try ./avatars/ folder first
    if (playerId) {
      return `./avatars/${playerId}.jpg`;
    }
    
    // Priority 2-4: Check player object properties
    if (player) {
      if (player.avatar) return player.avatar;
      if (player.img) return player.img;
      if (player.photo) return player.photo;
    }
    
    // Priority 5: Final fallback - Dicebear API
    const name = player?.name || safeName(playerId) || 'player';
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  }

  /**
   * Preload all avatar images from the ./avatars/ folder
   * This function attempts to preload avatars for all players in the game
   * to improve performance by caching images before they're needed.
   * 
   * @returns {Promise<Array>} Promise that resolves when all preloading attempts complete
   */
  function preloadAllAvatars() {
    const players = g.game?.players || g.players || [];
    
    if (!players || players.length === 0) {
      console.info('[avatar-resolver] No players to preload avatars for');
      return Promise.resolve([]);
    }

    console.info(`[avatar-resolver] Preloading avatars for ${players.length} players...`);

    const preloadPromises = players.map(player => {
      return new Promise((resolve) => {
        const img = new Image();
        const avatarUrl = resolveAvatar(player.id || player);
        
        img.onload = () => {
          console.debug(`[avatar-resolver] Preloaded avatar for player ${player.id}: ${avatarUrl}`);
          resolve({ success: true, playerId: player.id, url: avatarUrl });
        };
        
        img.onerror = () => {
          console.debug(`[avatar-resolver] Failed to preload avatar for player ${player.id}: ${avatarUrl}`);
          resolve({ success: false, playerId: player.id, url: avatarUrl });
        };
        
        img.src = avatarUrl;
      });
    });

    return Promise.all(preloadPromises).then(results => {
      const successful = results.filter(r => r.success).length;
      const failed = results.filter(r => !r.success).length;
      console.info(`[avatar-resolver] Preloading complete: ${successful} successful, ${failed} failed`);
      return results;
    });
  }

  // Export to global
  if (!g.Game) g.Game = {};
  g.Game.resolveAvatar = resolveAvatar;
  g.Game.preloadAllAvatars = preloadAllAvatars;
  
  // Also export directly to window for backward compatibility
  g.resolveAvatar = resolveAvatar;
  g.preloadAllAvatars = preloadAllAvatars;

})(window);
