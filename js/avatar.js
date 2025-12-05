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
  
  // Supported avatar file extensions (checked in order)
  const AVATAR_EXTENSIONS = ['png', 'jpg', 'jpeg', 'webp'];
  
  /**
   * Check if running on GitHub Pages
   * @returns {boolean} True if on GitHub Pages (*.github.io or /bbmobile/ path)
   */
  function isGitHubPages() {
    try {
      const hostname = window.location.hostname;
      const pathname = window.location.pathname;
      
      // Secure GitHub Pages detection:
      // 1. Must end with .github.io (prevents github.io.attacker.com)
      // 2. Or must be exactly 'github.io'
      // 3. Or path starts with the known project path
      const isGitHubIoHost = hostname === 'github.io' || hostname.endsWith('.github.io');
      const isProjectPath = pathname.startsWith(GITHUB_PAGES_PATH);
      
      return isGitHubIoHost || isProjectPath;
    } catch (e) {
      return false;
    }
  }
  
  /**
   * Check if local avatar folder should be used
   * Returns true if local avatars should be used (avatarLocalFolderEnabled=true or local dev)
   * Returns false if should skip local avatars (GitHub Pages with no explicit setting, or explicitly disabled)
   * 
   * This is the primary API for checking whether to use local ./avatars/ folder.
   * Default behavior: enable on local dev, disable on github.io to avoid 404 churn.
   * 
   * @returns {boolean} True if local avatar folder should be used
   */
  function shouldUseLocalAvatars() {
    const cfg = g.game?.cfg || g.cfg || {};
    const onGitHubPages = isGitHubPages();
    
    // Check explicit config setting first
    // When avatarLocalFolderEnabled is explicitly set to false, don't use local
    if (cfg.avatarLocalFolderEnabled === false) {
      return false;
    }
    
    // When explicitly enabled (true), always use local lookups
    if (cfg.avatarLocalFolderEnabled === true) {
      return true;
    }
    
    // Auto-detect mode: if on GitHub Pages with no explicit setting, default to false (disable local)
    // This prevents 404 churn when local avatars don't exist on GitHub Pages
    if (onGitHubPages) {
      console.info('[AvatarPreload] Auto-detected GitHub Pages - defaulting avatarLocalFolderEnabled to false');
      // Set the config value so it's explicit for strict mode
      if (cfg) {
        cfg.avatarLocalFolderEnabled = false;
      }
      
      // Warn if strict mode is enabled without local avatars
      const strictMode = cfg.avatarPreloadRequireAll === true;
      if (strictMode) {
        console.warn('[AvatarPreload] STRICT MODE WARNING: avatarLocalFolderEnabled=false on GitHub Pages.');
        console.warn('[AvatarPreload] All avatars will use external (Dicebear) sources.');
        console.warn('[AvatarPreload] For strict mode with local avatars, set avatarLocalFolderEnabled=true');
      }
      
      return false;
    }
    
    // Default: enable local folder lookups (for local development)
    return true;
  }
  
  /**
   * Check if local avatar folder lookups should be skipped
   * Returns true if on GitHub Pages AND avatarLocalFolderEnabled is false (default)
   * This avoids 404 churn for local ./avatars/* requests on GitHub Pages
   * 
   * IMPORTANT for strict mode: Local avatars must exist if using strict mode,
   * OR avatarLocalFolderEnabled must be explicitly set to false to skip local lookups
   * and use external (Dicebear) avatars only.
   * 
   * @returns {boolean} True if local folder lookups should be skipped
   * @deprecated Use shouldUseLocalAvatars() instead (returns inverted value)
   */
  function shouldSkipLocalFolderLookups() {
    return !shouldUseLocalAvatars();
  }
  
  /**
   * Get project base path for GitHub Pages deployment
   * Returns the repository segment ("/bbmobile/") when deployed to GitHub Pages
   * @returns {string} Base path with leading/trailing slashes
   */
  function projectBase() {
    // Check for explicit override
    if (typeof window !== 'undefined' && window.AVATAR_BASE_PATH) {
      return window.AVATAR_BASE_PATH;
    }
    
    // Check if we're on GitHub Pages by examining hostname and pathname
    const hostname = window.location.hostname;
    const pathname = window.location.pathname;
    
    // Secure GitHub Pages detection (host ends with .github.io or is exactly github.io)
    const isGitHubIoHost = hostname === 'github.io' || hostname.endsWith('.github.io');
    const isProjectPath = pathname.startsWith(GITHUB_PAGES_PATH);
    
    if ((isGitHubIoHost || isProjectPath) && pathname.startsWith(GITHUB_PAGES_PATH)) {
      return GITHUB_PAGES_PATH;
    }
    
    // Local dev or root deployment
    return '/';
  }
  
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
      // Auto-upgrade http to https in secure contexts
      if (relativePath.startsWith('http://') && window.location.protocol === 'https:') {
        return relativePath.replace('http://', 'https://');
      }
      return relativePath;
    }
    
    // Remove leading ./ if present
    const cleanPath = relativePath.replace(/^\.\//, '');
    
    // Get project base path
    const base = projectBase();
    
    // Construct absolute path
    // Ensure single slash between base and path
    const normalizedBase = base.endsWith('/') ? base.slice(0, -1) : base;
    const normalizedPath = cleanPath.startsWith('/') ? cleanPath : '/' + cleanPath;
    
    return normalizedBase + normalizedPath;
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
    
    // Build comprehensive candidate list with all extensions and case variants
    const candidates = [];
    
    // Helper to convert string to TitleCase
    function toTitleCase(str) {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    }
    
    // Helper to generate case variants
    function generateNameVariants(name) {
      if (!name || name === String(playerId)) return [];
      
      const variants = [];
      
      // 1. Original name (as provided)
      variants.push(name);
      
      // 2. Lowercase
      const lower = name.toLowerCase();
      if (lower !== name) variants.push(lower);
      
      // 3. TitleCase (first letter uppercase, rest lowercase)
      const titleCase = toTitleCase(name);
      if (titleCase !== name && titleCase !== lower) {
        variants.push(titleCase);
      }
      
      // 4. Hyphenated variants (if name contains spaces)
      if (name.includes(' ')) {
        const hyphenated = name.replace(/\s+/g, '-');
        variants.push(hyphenated);
        
        const hyphenatedLower = hyphenated.toLowerCase();
        if (hyphenatedLower !== hyphenated) {
          variants.push(hyphenatedLower);
        }
        
        const hyphenatedTitle = toTitleCase(hyphenated);
        if (hyphenatedTitle !== hyphenated && hyphenatedTitle !== hyphenatedLower) {
          variants.push(hyphenatedTitle);
        }
      }
      
      return variants;
    }
    
    // Check if player has explicit avatarUrl property (use it first)
    if (player?.avatarUrl && !isNumericJpgPattern(player.avatarUrl, playerId)) {
      candidates.push(player.avatarUrl);
    }
    
    // Skip local folder lookups on GitHub Pages to avoid 404 churn
    const skipLocal = shouldSkipLocalFolderLookups();
    
    if (!skipLocal) {
      // Generate candidates from player name with all variants and extensions
      if (playerName && playerName !== String(playerId)) {
        const nameVariants = generateNameVariants(playerName);
        
        for (const variant of nameVariants) {
          for (const ext of AVATAR_EXTENSIONS) {
            candidates.push(`./avatars/${variant}.${ext}`);
          }
        }
      }
      
      // ID-based candidates with all extensions
      if (playerId) {
        for (const ext of AVATAR_EXTENSIONS) {
          candidates.push(`./avatars/${playerId}.${ext}`);
        }
      }
      
      // For human player, add You.png as a specific fallback
      if (isHumanPlayer) {
        for (const ext of AVATAR_EXTENSIONS) {
          candidates.push(`./avatars/You.${ext}`);
        }
      }
      
      // Final fallback: placeholder.png
      candidates.push('./avatars/placeholder.png');
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
  g.projectBase = projectBase; // Expose project base path helper
  g.isIOSSafari = getIsIOSSafari;
  g.getAvatarLoadTracking = getLoadTracking;
  g.updateAvatarTrackingStatus = updateTrackingStatus;
  g.shouldUseLocalAvatars = shouldUseLocalAvatars; // GitHub Pages fallback helper
  g.isGitHubPages = isGitHubPages; // Deployment detection helper
  
  // Expose global helper for legacy code (window.resolveAvatar)
  if (typeof window !== 'undefined') {
    window.resolveAvatar = resolveAvatar;
    window.projectBase = projectBase;
    window.shouldUseLocalAvatars = shouldUseLocalAvatars;
    window.isGitHubPages = isGitHubPages;
    window.__dumpAvatarStatus = dumpAvatarStatus;
  }

  console.info('[avatar] Module loaded (iOS Safari:', isIOSSafari, ')');

})(window.Game || window);
