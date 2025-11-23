// MODULE: avatar.js
// Centralized avatar resolution system using ./avatars/ folder
// Enhanced with multi-format support, negative caching, strict mode, and iOS support

(function(g){
  'use strict';

  // Import centralized avatar constants
  const AVATAR_DEFAULTS = g.AVATAR_DEFAULTS || {};
  const getDicebearUrl = g.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  // Negative cache: tracks failed avatar attempts to prevent 404 storms
  const failedAvatars = new Set();
  
  // Load tracking for debug mode
  const loadTracking = new Map(); // playerId -> {url, status, timestamp, error}
  
  // Resolution stats for diagnostics
  const stats = {
    resolved: 0,
    fallback: 0,
    strictMiss: 0
  };

  // Detect iOS Safari for eager loading optimization
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOSSafari = isIOS && isSafari;

  // Configurable base path for different deployment contexts
  // Can be overridden via window.AVATAR_BASE_PATH if needed
  const GITHUB_PAGES_PATH = '/bbmobile/';
  
  /**
   * Resolve absolute path for GitHub Pages deployment
   * Handles both local dev and GitHub Pages paths
   */
  function resolveAssetPath(relativePath) {
    if (!relativePath || typeof relativePath !== 'string') return relativePath;
    
    // If already absolute or external URL, return as-is
    if (relativePath.startsWith('http://') || 
        relativePath.startsWith('https://') ||
        relativePath.startsWith('data:')) {
      return relativePath;
    }
    
    // Remove leading ./ if present
    const cleanPath = relativePath.replace(/^\.\//, '');
    
    // Check for custom base path override
    const customBasePath = typeof window !== 'undefined' && window.AVATAR_BASE_PATH;
    
    // Get base path (for GitHub Pages, this would be /bbmobile/)
    const basePath = customBasePath || 
                     document.querySelector('base')?.href || 
                     window.location.pathname.split('/').slice(0, -1).join('/') || '';
    
    // If we're in a subdirectory (GitHub Pages), ensure proper path
    if (basePath && basePath.includes(GITHUB_PAGES_PATH)) {
      return basePath + '/' + cleanPath;
    }
    
    // Local dev: use relative path with leading slash
    return '/' + cleanPath;
  }

  /**
   * Track avatar load status for debug overlay
   */
  function trackAvatarLoad(playerId, url, status, error = null) {
    loadTracking.set(playerId, {
      url,
      status, // 'attempting', 'success', 'failed'
      timestamp: Date.now(),
      error
    });
  }

  // Helper to get player object by ID
  function gp(id) {
    return g.getP?.(id) || (g.game?.players || g.players || []).find(p => p?.id === id);
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
    
    // Check if this is the human player (id 0 or human flag)
    const isHumanPlayer = (playerId === 0 || playerId === '0' || player?.human || player?.id === 0);
    
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
    
    // For human player, add You.png as a specific fallback before generic fallback
    if (isHumanPlayer) {
      candidates.push('./avatars/You.png');
    }
    
    // Return first candidate not in negative cache, with resolved path
    for (const candidate of candidates) {
      if (!failedAvatars.has(candidate)) {
        // Store reference for onerror tracking
        if (!player) player = { id: playerId, name: playerName };
        const resolvedPath = resolveAssetPath(candidate);
        player.__avatarUrl = resolvedPath;
        
        // Track for debug overlay
        trackAvatarLoad(playerId, resolvedPath, 'attempting');
        
        return resolvedPath;
      }
    }
    
    // All candidates failed - use strict or external fallback
    const cfg = g.game?.cfg || g.cfg || {};
    if (cfg.strictAvatars) {
      stats.strictMiss++;
      console.log(`[avatar] strict-miss player=${playerId || playerName}`);
      // Return local generic silhouette (data URI from centralized config)
      stats.fallback++;
      return AVATAR_DEFAULTS.LOCAL_SILHOUETTE || 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#2d3f56" width="100" height="100"/>' +
        '<circle cx="50" cy="35" r="15" fill="#4a5f7f"/>' +
        '<ellipse cx="50" cy="70" rx="20" ry="25" fill="#4a5f7f"/>' +
        '</svg>'
      );
    } else {
      stats.fallback++;
      return getDicebearUrl(playerName);
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
      // Return local generic silhouette (from centralized config)
      return AVATAR_DEFAULTS.LOCAL_SILHOUETTE || 'data:image/svg+xml,' + encodeURIComponent(
        '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">' +
        '<rect fill="#2d3f56" width="100" height="100"/>' +
        '<circle cx="50" cy="35" r="15" fill="#4a5f7f"/>' +
        '<ellipse cx="50" cy="70" rx="20" ry="25" fill="#4a5f7f"/>' +
        '</svg>'
      );
    } else {
      return getDicebearUrl(name || 'player');
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

  /**
   * Get iOS Safari detection flag
   */
  function getIsIOSSafari() {
    return isIOSSafari;
  }

  /**
   * Get avatar load tracking data (for debug overlay)
   */
  function getLoadTracking() {
    return new Map(loadTracking);
  }

  /**
   * Update tracking status (called by image onload/onerror)
   */
  function updateTrackingStatus(playerId, status, error = null) {
    const existing = loadTracking.get(playerId);
    if (existing) {
      existing.status = status;
      existing.error = error;
      existing.timestamp = Date.now();
    }
  }

  // Export to global
  g.resolveAvatar = resolveAvatar;
  g.getAvatarFallback = getAvatarFallback;
  g.resolveAssetPath = resolveAssetPath;
  g.isIOSSafari = getIsIOSSafari;
  g.getAvatarLoadTracking = getLoadTracking;
  g.updateAvatarTrackingStatus = updateTrackingStatus;
  
  // Expose diagnostic function
  if (typeof window !== 'undefined') {
    window.__dumpAvatarStatus = dumpAvatarStatus;
  }

  console.info('[avatar] Module loaded (iOS Safari:', isIOSSafari, ')');

})(window.Game || window);
