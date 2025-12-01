// MODULE: avatars-preload.js
// Preloads player avatars before transitioning to main game screen.
// Uses global.resolveAvatar fallback chain for avatar URL resolution.
// Provides progress callbacks and timeout handling for graceful degradation.

(function(g) {
  'use strict';

  const DEFAULT_TIMEOUT = 6000; // ms - default timeout for avatar preloading

  /**
   * Preload all player avatars before game start.
   * 
   * @param {Array} players - Array of player objects with id, name, avatar properties
   * @param {Object} opts - Options object
   * @param {number} opts.timeout - Timeout in ms (default: 6000)
   * @param {Function} opts.onProgress - Callback (loaded, total) for progress updates
   * @returns {Promise<Object>} Result object { loaded, total, timedOut, urls }
   */
  async function preloadAvatars(players, opts = {}) {
    const timeout = opts.timeout || DEFAULT_TIMEOUT;
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
    
    const startTime = Date.now();
    console.info('[AvatarPreload] Starting preload for', players?.length || 0, 'players');
    
    // Log telemetry if available
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('avatar_preload_start', { 
          playerCount: players?.length || 0, 
          timeout 
        });
      }
    } catch (e) {
      // Non-blocking telemetry
    }

    // Validate input
    if (!players || !Array.isArray(players) || players.length === 0) {
      console.warn('[AvatarPreload] No players provided, skipping preload');
      return { loaded: 0, total: 0, timedOut: false, urls: [] };
    }

    // Collect avatar URLs using resolveAvatar fallback chain
    const avatarUrls = [];
    const resolveAvatar = g.resolveAvatar || window.resolveAvatar;
    
    if (!resolveAvatar) {
      console.warn('[AvatarPreload] resolveAvatar not available, using direct avatar properties');
    }

    for (const player of players) {
      if (!player) continue;
      
      let url = null;
      
      // Try resolveAvatar if available (preferred)
      if (resolveAvatar) {
        try {
          url = resolveAvatar(player);
        } catch (e) {
          console.warn('[AvatarPreload] resolveAvatar failed for player', player.id, e);
        }
      }
      
      // Fallback chain: avatar -> img -> photo -> Dicebear
      if (!url) {
        url = player.avatar || player.img || player.photo;
        
        if (!url) {
          // Final fallback: Dicebear or placeholder
          const getDicebearUrl = g.getDicebearUrl || window.getDicebearUrl;
          if (getDicebearUrl) {
            url = getDicebearUrl(player.name || String(player.id));
          } else {
            url = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name || String(player.id))}`;
          }
        }
      }
      
      if (url) {
        avatarUrls.push({ playerId: player.id, url });
      }
    }

    console.info('[AvatarPreload] Resolved', avatarUrls.length, 'avatar URLs');

    const total = avatarUrls.length;
    let loaded = 0;
    let timedOut = false;

    // Handle empty case
    if (total === 0) {
      console.info('[AvatarPreload] No avatars to preload');
      onProgress(0, 0);
      return { loaded: 0, total: 0, timedOut: false, urls: [] };
    }

    // Initial progress callback
    onProgress(loaded, total);

    // Create promise race between preload and timeout
    const preloadPromise = new Promise((resolve) => {
      const loadedUrls = [];
      let completed = 0;

      for (const { playerId, url } of avatarUrls) {
        const img = new Image();
        
        const complete = (success) => {
          completed++;
          if (success) {
            loaded++;
            loadedUrls.push(url);
            console.info(`[AvatarPreload] Loaded avatar for player ${playerId} (${loaded}/${total})`);
          } else {
            console.warn(`[AvatarPreload] Failed to load avatar for player ${playerId}:`, url);
          }
          
          // Update progress
          onProgress(loaded, total);
          
          // Check if all complete
          if (completed >= total) {
            resolve({ loadedUrls, completed });
          }
        };

        img.onload = () => {
          // Use decode() for smoother rendering if available
          if (img.decode) {
            img.decode()
              .then(() => complete(true))
              .catch(() => complete(true)); // Still count as loaded even if decode fails
          } else {
            complete(true);
          }
        };

        img.onerror = () => {
          complete(false);
        };

        // Check if already cached
        if (img.complete && img.naturalWidth > 0) {
          complete(true);
        } else {
          img.src = url;
        }
      }
    });

    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ timedOut: true });
      }, timeout);
    });

    // Race between preload completion and timeout
    const result = await Promise.race([preloadPromise, timeoutPromise]);

    if (result.timedOut) {
      timedOut = true;
      const elapsed = Date.now() - startTime;
      console.warn(`[AvatarPreload] Timeout after ${elapsed}ms - proceeding with ${loaded}/${total} avatars loaded`);
      
      // Log telemetry for timeout
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('avatar_preload_timeout', { 
            loaded, 
            total, 
            elapsed 
          });
        }
      } catch (e) {
        // Non-blocking telemetry
      }
    } else {
      const elapsed = Date.now() - startTime;
      console.info(`[AvatarPreload] Completed in ${elapsed}ms - ${loaded}/${total} avatars loaded`);
      
      // Log telemetry for success
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('avatar_preload_complete', { 
            loaded, 
            total, 
            elapsed 
          });
        }
      } catch (e) {
        // Non-blocking telemetry
      }
    }

    const summary = {
      loaded,
      total,
      timedOut,
      urls: avatarUrls.map(a => a.url)
    };

    console.info('[AvatarPreload] Summary:', summary);

    return summary;
  }

  // Export to global scope
  g.preloadAvatars = preloadAvatars;
  
  // Also export to window for direct access
  if (typeof window !== 'undefined') {
    window.preloadAvatars = preloadAvatars;
  }

  console.info('[AvatarPreload] Module loaded');

})(window.game || window);
