// MODULE: avatar.js
// Centralized avatar resolution system using ./avatars/ folder
// Enhanced with multi-format support, negative caching, and strict mode

(function(g){
  'use strict';

  // Negative cache: tracks failed avatar attempts to prevent 404 storms
  const failedAvatars = new Set();
  
  // Resolution stats for diagnostics
  const stats = {
    resolved: 0,
    fallback: 0,
    strictMiss: 0
  };

  // Helper to get player object by ID
  function gp(id) {
    return g.getP?.(id) || (g.game?.players || g.players || []).find(p => p?.id === id);
  }

  // Helper to get player name
  function safeName(id) {
    const player = gp(id);
    return player?.name || String(id);
  }

  // Helper to detect legacy numeric .jpg pattern (e.g., "./avatars/1.jpg")
  function isNumericJpgPattern(path, playerId) {
    if (!path || typeof path !== 'string') return false;
    // Match patterns like "./avatars/1.jpg" or "avatars/1.jpg"
    const pattern = new RegExp(`avatars[/\\\\]${playerId}\\.jpg$`, 'i');
    return pattern.test(path);
  }

  /**
   * Resolve avatar with priority:
   * 1. player.avatar (if defined in player object)
   * 2. player.img / player.photo (legacy properties)
   * 3. ./avatars/{Name}.png (plural name, case-sensitive)
   * 4. ./avatars/{name}.png (lowercase name)
   * 5. ./avatars/{playerId}.png (numeric ID)
   * 6. ./avatars/{Name}.jpg (singular fallback)
   * 7. ./avatars/{name}.jpg (lowercase singular)
   * 8. ./avatars/{playerId}.jpg (numeric ID jpg)
   * 9. Local silhouette (strict mode) OR Dicebear API (normal mode)
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
      
      // Check legacy properties, but skip numeric .jpg defaults (buggy pattern)
      if (player.avatar && !isNumericJpgPattern(player.avatar, playerId)) {
        stats.resolved++;
        return player.avatar;
      }
      if (player.img) {
        stats.resolved++;
        return player.img;
      }
      if (player.photo) {
        stats.resolved++;
        return player.photo;
      }
    } else {
      playerId = playerIdOrObject;
      player = gp(playerId);
      
      if (player) {
        // Check player object properties, skip numeric .jpg defaults
        if (player.avatar && !isNumericJpgPattern(player.avatar, playerId)) {
          stats.resolved++;
          return player.avatar;
        }
        if (player.img) {
          stats.resolved++;
          return player.img;
        }
        if (player.photo) {
          stats.resolved++;
          return player.photo;
        }
      }
    }
    
    // Get player name for name-based lookups
    const playerName = player?.name || String(playerId);
    
    // Try multi-case permutations: plural first (PNG), then singular (JPG)
    // Priority order: Name.png, name.png, id.png, Name.jpg, name.jpg, id.jpg
    const candidates = [];
    
    if (playerName && playerName !== String(playerId)) {
      // Name-based (plural PNG first)
      candidates.push(`./avatars/${playerName}.png`); // Case-sensitive
      candidates.push(`./avatars/${playerName.toLowerCase()}.png`); // Lowercase
      
      // Name-based (singular JPG fallback)
      candidates.push(`./avatars/${playerName}.jpg`);
      candidates.push(`./avatars/${playerName.toLowerCase()}.jpg`);
    }
    
    // ID-based (both formats)
    if (playerId) {
      candidates.push(`./avatars/${playerId}.png`);
      candidates.push(`./avatars/${playerId}.jpg`);
    }
    
    // Return first candidate not in negative cache
    for (const candidate of candidates) {
      if (!failedAvatars.has(candidate)) {
        // Store reference for onerror tracking
        if (!player) player = { id: playerId, name: playerName };
        player.__avatarUrl = candidate;
        return candidate;
      }
    }
    
    // All candidates failed - use strict or external fallback
    const cfg = g.game?.cfg || g.cfg || {};
    if (cfg.strictAvatars) {
      stats.strictMiss++;
      console.log(`[avatar] strict-miss player=${playerId || playerName}`);
      // Return local generic silhouette (data URI for now)
      stats.fallback++;
      return 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#2d3f56" width="100" height="100"/>' +
        '<circle cx="50" cy="35" r="15" fill="#4a5f7f"/>' +
        '<ellipse cx="50" cy="70" rx="20" ry="25" fill="#4a5f7f"/>' +
        '</svg>'
      );
    } else {
      stats.fallback++;
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(playerName)}`;
    }
  }

  /**
   * Get avatar fallback URL for onerror handlers
   * 
   * @param {string} name - Player name for seed
   * @param {string} failedUrl - The URL that failed (for negative caching)
   * @returns {string} Dicebear fallback URL or local silhouette
   */
  function getAvatarFallback(name, failedUrl) {
    // Add to negative cache
    if (failedUrl) {
      failedAvatars.add(failedUrl);
    }
    
    stats.fallback++;
    
    const cfg = g.game?.cfg || g.cfg || {};
    if (cfg.strictAvatars) {
      console.log(`[avatar] strict-miss player=${name}`);
      // Return local generic silhouette
      return 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#2d3f56" width="100" height="100"/>' +
        '<circle cx="50" cy="35" r="15" fill="#4a5f7f"/>' +
        '<ellipse cx="50" cy="70" rx="20" ry="25" fill="#4a5f7f"/>' +
        '</svg>'
      );
    } else {
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name || 'player')}`;
    }
  }

  /**
   * Diagnostic function: dump avatar resolution status
   * @returns {object} Status summary
   */
  function dumpAvatarStatus() {
    const players = (g.game?.players || g.players || []);
    const cfg = g.game?.cfg || g.cfg || {};
    
    const playerDetails = players.map(p => ({
      id: p.id,
      name: p.name,
      avatarUrl: p.__avatarUrl || resolveAvatar(p),
      fallback: failedAvatars.has(p.__avatarUrl || '') || (!p.avatar && !p.img && !p.photo)
    }));
    
    const summary = {
      players: playerDetails,
      counts: {
        resolved: stats.resolved,
        fallback: stats.fallback,
        strictMiss: stats.strictMiss,
        total: stats.resolved + stats.fallback
      },
      strict: cfg.strictAvatars || false,
      failedUrls: Array.from(failedAvatars)
    };
    
    console.table(playerDetails);
    console.log('[avatar] Summary:', summary.counts);
    console.log('[avatar] Strict mode:', summary.strict);
    
    return summary;
  }

  /**
   * Check if we should show avatar fallback warning (>30% missing)
   * Shows one-time warning card if threshold exceeded
   */
  function checkAvatarFallbackWarning() {
    // Don't show in strict mode
    const cfg = g.game?.cfg || g.cfg || {};
    if (cfg.strictAvatars) return;
    
    // Only show once
    if (g.__avatarWarningShown) return;
    
    const players = (g.game?.players || g.players || []);
    if (players.length === 0) return;
    
    const fallbackCount = stats.fallback;
    const totalCount = stats.resolved + stats.fallback;
    
    if (totalCount === 0) return;
    
    const fallbackRatio = fallbackCount / totalCount;
    
    if (fallbackRatio > 0.3) {
      g.__avatarWarningShown = true;
      console.warn(`[avatar] High fallback ratio: ${(fallbackRatio * 100).toFixed(1)}% (${fallbackCount}/${totalCount})`);
      
      // Show warning card
      if (typeof g.showCard === 'function') {
        g.showCard(
          'Avatars Missing',
          ['Some avatar images were not found. Using placeholders.'],
          'warn',
          3500,
          false
        );
      }
    }
  }

  // Auto-check after a delay (let page load)
  if (typeof window !== 'undefined') {
    setTimeout(() => {
      checkAvatarFallbackWarning();
    }, 3000);
  }

  // Export to global
  g.resolveAvatar = resolveAvatar;
  g.getAvatarFallback = getAvatarFallback;
  
  // Expose diagnostic function
  if (typeof window !== 'undefined') {
    window.__dumpAvatarStatus = dumpAvatarStatus;
  }

})(window.Game || window);
