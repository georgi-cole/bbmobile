// MODULE: avatar.js
// Centralized avatar resolution system using ./avatars/ folder

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
   * 1. player.avatar (if defined in player object)
   * 2. ./avatars/{playerId}.jpg (local avatar folder)
   * 3. Dicebear API fallback
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
      
      // If passed a player object with these legacy properties, use them
      if (player.avatar) return player.avatar;
      if (player.img) return player.img;
      if (player.photo) return player.photo;
    } else {
      playerId = playerIdOrObject;
      player = gp(playerId);
      
      if (player) {
        // Check player object properties
        if (player.avatar) return player.avatar;
        if (player.img) return player.img;
        if (player.photo) return player.photo;
      }
    }
    
    // If no player found but we have an ID, try avatars folder
    if (playerId) {
      return `./avatars/${playerId}.jpg`;
    }
    
    // Final fallback
    const name = player?.name || safeName(playerId) || 'player';
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
  }

  /**
   * Get avatar fallback URL for onerror handlers
   * 
   * @param {string} name - Player name for seed
   * @returns {string} Dicebear fallback URL
   */
  function getAvatarFallback(name) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name || 'player')}`;
  }

  // Export to global
  g.resolveAvatar = resolveAvatar;
  g.getAvatarFallback = getAvatarFallback;

})(window.Game || window);
