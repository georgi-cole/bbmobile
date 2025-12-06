// MODULE: avatarPreloader.js
// Robust avatar preloading system for houseguests
// Provides a Promise-based API with progress callbacks for loading avatars early
// Integrates with existing avatar resolution and cache systems

(function(g) {
  'use strict';

  // Preload state
  let preloadPromise = null;
  let preloadResult = null;
  let isPreloading = false;
  let progressCallbacks = [];
  let houseguestsList = [];

  /**
   * Initialize the preloader with houseguests list
   * @param {Array} houseguests - Array of houseguest objects
   */
  function init(houseguests) {
    if (!houseguests || !Array.isArray(houseguests)) {
      console.warn('[AvatarPreloader] init() called with invalid houseguests list');
      return;
    }
    
    houseguestsList = houseguests;
    console.info(`[AvatarPreloader] Initialized with ${houseguests.length} houseguests`);
  }

  /**
   * Start preloading avatars in the background
   * Can be called multiple times (idempotent - subsequent calls return existing promise)
   * @returns {Promise<Object>} Promise that resolves when preload completes
   */
  function start() {
    // Check config flag
    const cfg = (g.game && g.game.cfg) || g.cfg || {};
    if (cfg.preloadAvatars === false) {
      console.info('[AvatarPreloader] Preloading disabled by config flag');
      preloadResult = { loaded: 0, total: 0, skipped: true };
      preloadPromise = Promise.resolve(preloadResult);
      return preloadPromise;
    }

    // If already preloading or completed, return existing promise
    if (preloadPromise) {
      console.info('[AvatarPreloader] Preload already in progress or complete');
      return preloadPromise;
    }

    if (!houseguestsList || houseguestsList.length === 0) {
      console.warn('[AvatarPreloader] No houseguests to preload - call init() first');
      preloadResult = { loaded: 0, total: 0, error: 'No houseguests' };
      preloadPromise = Promise.resolve(preloadResult);
      return preloadPromise;
    }

    console.info(`[AvatarPreloader] Starting preload for ${houseguestsList.length} houseguests`);
    isPreloading = true;

    // Emit start event
    if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
      g.bbGameBus.emit('avatars:preload:start', { total: houseguestsList.length });
    }

    // Use existing preloadAvatars function if available
    const preloadFn = g.preloadAvatars || window.preloadAvatars;
    
    if (!preloadFn) {
      console.warn('[AvatarPreloader] preloadAvatars function not available, using fallback');
      preloadPromise = fallbackPreload();
      return preloadPromise;
    }

    // Start preload with progress tracking
    preloadPromise = preloadFn(houseguestsList, {
      timeout: cfg.avatarPreloadTimeoutMs || 8000,
      onProgress: (loaded, total) => {
        // Notify all registered callbacks
        progressCallbacks.forEach(cb => {
          try {
            cb(loaded, total);
          } catch (e) {
            console.error('[AvatarPreloader] Progress callback error:', e);
          }
        });

        // Emit progress event
        if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
          g.bbGameBus.emit('avatars:preload:progress', { loaded, total });
        }
      }
    })
    .then(result => {
      preloadResult = result;
      isPreloading = false;
      
      console.info('[AvatarPreloader] Preload complete:', result);
      
      // Emit done event
      if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
        g.bbGameBus.emit('avatars:preload:done', result);
      }
      
      return result;
    })
    .catch(err => {
      console.error('[AvatarPreloader] Preload error:', err);
      preloadResult = { loaded: 0, total: houseguestsList.length, error: err.message };
      isPreloading = false;
      
      // Emit error event
      if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
        g.bbGameBus.emit('avatars:preload:error', { error: err.message });
      }
      
      // Don't reject - return partial result
      return preloadResult;
    });

    return preloadPromise;
  }

  /**
   * Fallback preload implementation if main preloadAvatars not available
   * @returns {Promise<Object>}
   */
  function fallbackPreload() {
    console.info('[AvatarPreloader] Using fallback preload implementation');
    
    return new Promise((resolve) => {
      let loaded = 0;
      const total = houseguestsList.length;

      if (total === 0) {
        resolve({ loaded: 0, total: 0 });
        return;
      }

      // Simple parallel image loading
      const promises = houseguestsList.map(houseguest => {
        return new Promise((resolveImg) => {
          // Resolve avatar URL
          let url = null;
          if (g.resolveAvatar && typeof g.resolveAvatar === 'function') {
            url = g.resolveAvatar(houseguest);
          } else {
            url = `avatars/${houseguest.name}.png`;
          }

          const img = new Image();
          
          img.onload = () => {
            loaded++;
            notifyProgress(loaded, total);
            resolveImg(true);
          };
          
          img.onerror = () => {
            loaded++;
            notifyProgress(loaded, total);
            resolveImg(false);
          };

          img.src = url;
        });
      });

      Promise.all(promises).then(() => {
        resolve({ loaded, total, timedOut: false });
      });
    });
  }

  /**
   * Notify progress callbacks
   * @param {number} loaded - Number loaded
   * @param {number} total - Total count
   */
  function notifyProgress(loaded, total) {
    progressCallbacks.forEach(cb => {
      try {
        cb(loaded, total);
      } catch (e) {
        console.error('[AvatarPreloader] Progress callback error:', e);
      }
    });

    // Emit progress event
    if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
      g.bbGameBus.emit('avatars:preload:progress', { loaded, total });
    }
  }

  /**
   * Register a progress callback
   * @param {Function} callback - Callback function(loaded, total)
   */
  function onProgress(callback) {
    if (typeof callback === 'function') {
      progressCallbacks.push(callback);
    }
  }

  /**
   * Get a promise that resolves when preload is complete
   * If not started, starts preload automatically
   * @returns {Promise<Object>}
   */
  function whenDone() {
    if (preloadPromise) {
      return preloadPromise;
    }
    
    // Auto-start if not started
    console.info('[AvatarPreloader] Auto-starting preload');
    return start();
  }

  /**
   * Check if preload is complete
   * @returns {boolean}
   */
  function isDone() {
    return !isPreloading && preloadResult !== null;
  }

  /**
   * Get current progress
   * @returns {Object|null} Progress object or null if not started
   */
  function getProgress() {
    if (!preloadResult) {
      return null;
    }
    
    return {
      loaded: preloadResult.loaded || 0,
      total: preloadResult.total || 0,
      isDone: isDone()
    };
  }

  /**
   * Reset the preloader state (for testing)
   */
  function reset() {
    preloadPromise = null;
    preloadResult = null;
    isPreloading = false;
    progressCallbacks = [];
    console.info('[AvatarPreloader] Reset complete');
  }

  // Public API
  const AvatarPreloader = {
    init,
    start,
    onProgress,
    whenDone,
    isDone,
    getProgress,
    reset
  };

  // Export to global namespace
  g.AvatarPreloader = AvatarPreloader;
  
  if (typeof window !== 'undefined') {
    window.AvatarPreloader = AvatarPreloader;
  }

  console.info('[AvatarPreloader] Module loaded');

})(window.game = window.game || {});
