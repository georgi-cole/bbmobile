// MODULE: avatar-cache.js
// Unified avatar cache system for both AI houseguests and player avatars
// Provides strict preloading with decode support, progress tracking, and instant retrieval
// Ensures avatars are ready before showing either the main game screen or HousGuests modal

(function(g) {
  'use strict';

  // Cache storage
  const cache = new Map(); // playerId/houseguestName -> { url, image, status, timestamp, error }
  
  // Cache status enum
  const Status = {
    PENDING: 'pending',
    LOADING: 'loading',
    LOADED: 'loaded',
    ERROR: 'error'
  };

  // Configuration
  const DEFAULT_TIMEOUT = 30000; // 30s for strict mode
  const DEFAULT_CONCURRENCY = 8;
  const RETRY_DELAY = 1000;
  const MAX_RETRIES = 2;

  /**
   * Get configuration from game config
   */
  function getConfig() {
    const cfg = g.game?.cfg || g.cfg || {};
    return {
      strictMode: cfg.avatarPreloadRequireAll === true,
      timeout: cfg.avatarPreloadTimeoutMs || DEFAULT_TIMEOUT,
      concurrency: cfg.avatarPreloadConcurrency || DEFAULT_CONCURRENCY,
      enableRetry: cfg.enableAvatarRetry !== false
    };
  }

  /**
   * Resolve avatar URL for a player or houseguest
   * @param {Object} item - Player or houseguest object
   * @returns {string} Avatar URL
   */
  function resolveAvatarUrl(item) {
    // Try using existing resolveAvatar if available
    if (g.resolveAvatar && typeof g.resolveAvatar === 'function') {
      try {
        return g.resolveAvatar(item);
      } catch (e) {
        console.warn('[AvatarCache] resolveAvatar failed:', e);
      }
    }

    // Fallback resolution
    if (item.avatar) return item.avatar;
    if (item.img) return item.img;
    if (item.photo) return item.photo;
    if (item.avatarUrl) return item.avatarUrl;

    // Try avatars folder by name
    if (item.name) {
      return `./avatars/${item.name}.png`;
    }

    // Final fallback - use configured external URL or default
    const cfg = g.game?.cfg || g.cfg || {};
    const fallbackUrl = cfg.avatarFallbackUrl || 'https://api.dicebear.com/6.x/bottts/svg';
    const seed = encodeURIComponent(item.name || item.id || 'player');
    return `${fallbackUrl}?seed=${seed}`;
  }

  /**
   * Get unique key for cache entry
   * @param {Object} item - Player or houseguest object
   * @returns {string} Cache key
   */
  function getCacheKey(item) {
    return item.name || String(item.id || '');
  }

  /**
   * Load and decode a single avatar
   * @param {string} url - Avatar URL
   * @param {Object} options - Options {retry, strictMode}
   * @returns {Promise<Image>} Loaded and decoded image
   */
  async function loadAndDecodeAvatar(url, options = {}) {
    const { retry = 0, strictMode = false } = options;
    
    return new Promise((resolve, reject) => {
      const img = new Image();
      const startTime = Date.now();

      img.onload = async () => {
        // Try to decode if supported
        if (img.decode && typeof img.decode === 'function') {
          try {
            await img.decode();
            const elapsed = Date.now() - startTime;
            console.info(`[AvatarCache] Loaded and decoded: ${url} (${elapsed}ms)`);
            resolve(img);
          } catch (decodeError) {
            const elapsed = Date.now() - startTime;
            console.warn(`[AvatarCache] Decode failed for ${url} (${elapsed}ms):`, decodeError);
            
            if (strictMode) {
              // In strict mode, decode failure is an error
              reject(new Error(`Decode failed: ${decodeError.message}`));
            } else {
              // In non-strict mode, accept loaded image even if decode fails
              resolve(img);
            }
          }
        } else {
          // No decode support, just return loaded image
          const elapsed = Date.now() - startTime;
          console.info(`[AvatarCache] Loaded (no decode): ${url} (${elapsed}ms)`);
          resolve(img);
        }
      };

      img.onerror = (error) => {
        const elapsed = Date.now() - startTime;
        console.warn(`[AvatarCache] Load failed for ${url} (${elapsed}ms):`, error);
        
        // Retry logic
        const config = getConfig();
        if (config.enableRetry && retry < MAX_RETRIES) {
          console.info(`[AvatarCache] Retrying ${url} (attempt ${retry + 1}/${MAX_RETRIES})`);
          setTimeout(() => {
            loadAndDecodeAvatar(url, { ...options, retry: retry + 1 })
              .then(resolve)
              .catch(reject);
          }, RETRY_DELAY);
        } else {
          reject(new Error(`Load failed after ${retry} retries`));
        }
      };

      // Set source first
      img.src = url;
      
      // Check if already cached (after setting src)
      if (img.complete && img.naturalWidth > 0) {
        const elapsed = Date.now() - startTime;
        console.info(`[AvatarCache] Already cached: ${url} (${elapsed}ms)`);
        // Trigger onload manually since it won't fire for cached images
        img.onload();
      }
    });
  }

  /**
   * Preload a batch of avatars with concurrency control
   * @param {Array} items - Array of player/houseguest objects
   * @param {Object} options - Options {onProgress, onItemComplete, timeout, strictMode}
   * @returns {Promise<Object>} Summary {total, loaded, failed, cached, elapsed}
   */
  async function preloadBatch(items, options = {}) {
    const config = getConfig();
    const strictMode = options.strictMode !== undefined ? options.strictMode : config.strictMode;
    const timeout = options.timeout || config.timeout;
    const concurrency = options.concurrency || config.concurrency;
    const onProgress = options.onProgress || (() => {});
    const onItemComplete = options.onItemComplete || (() => {});

    const startTime = Date.now();
    const total = items.length;
    let loaded = 0;
    let failed = 0;
    let cached = 0;
    let index = 0;

    console.info(`[AvatarCache] Preloading ${total} avatars (strict=${strictMode}, concurrency=${concurrency}, timeout=${timeout}ms)`);

    // Emit telemetry
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('avatar_cache_preload_start', { total, strictMode, concurrency });
      }
    } catch (e) {
      // Non-blocking telemetry
    }

    // Initial progress
    onProgress(0, total);

    // Worker function for queue processing
    async function worker() {
      while (index < total) {
        const currentIndex = index++;
        const item = items[currentIndex];
        const key = getCacheKey(item);
        const url = resolveAvatarUrl(item);

        // Check if already in cache
        const existing = cache.get(key);
        if (existing && existing.status === Status.LOADED) {
          cached++;
          loaded++;
          console.info(`[AvatarCache] Using cached avatar for ${key}`);
          onProgress(loaded, total);
          onItemComplete({ key, url, cached: true, success: true });
          continue;
        }

        // Mark as loading
        cache.set(key, {
          url,
          image: null,
          status: Status.LOADING,
          timestamp: Date.now(),
          error: null
        });

        try {
          // Load and decode
          const image = await loadAndDecodeAvatar(url, { strictMode });
          
          // Store in cache
          cache.set(key, {
            url,
            image,
            status: Status.LOADED,
            timestamp: Date.now(),
            error: null
          });

          loaded++;
          console.info(`[AvatarCache] Cached avatar for ${key} (${loaded}/${total})`);
          
          // Update progress
          onProgress(loaded, total);
          onItemComplete({ key, url, cached: false, success: true });
          
        } catch (error) {
          failed++;
          console.error(`[AvatarCache] Failed to load avatar for ${key}:`, error);
          
          // Store error in cache
          cache.set(key, {
            url,
            image: null,
            status: Status.ERROR,
            timestamp: Date.now(),
            error: error.message
          });

          // Update progress
          onProgress(loaded, total);
          onItemComplete({ key, url, cached: false, success: false, error: error.message });
        }
      }
    }

    // Create timeout promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ timedOut: true });
      }, timeout);
    });

    // Start workers
    const workers = [];
    const workerCount = Math.min(concurrency, total);
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }

    // Race between workers and timeout
    const raceResult = await Promise.race([
      Promise.all(workers).then(() => ({ timedOut: false })),
      timeoutPromise
    ]);

    const elapsed = Date.now() - startTime;
    const timedOut = raceResult.timedOut;

    // Emit telemetry
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        const event = timedOut ? 'avatar_cache_preload_timeout' : 'avatar_cache_preload_complete';
        g.Telemetry.log(event, { total, loaded, failed, cached, elapsed, timedOut });
      }
    } catch (e) {
      // Non-blocking telemetry
    }

    const summary = {
      total,
      loaded,
      failed,
      cached,
      elapsed,
      timedOut,
      percentLoaded: total > 0 ? (loaded / total) : 1,
      isReady: strictMode ? (loaded === total && failed === 0 && !timedOut) : (loaded > 0 || timedOut)
    };

    if (timedOut) {
      console.warn(`[AvatarCache] Preload timeout after ${elapsed}ms (${loaded}/${total} loaded)`);
    } else {
      console.info(`[AvatarCache] Preload complete in ${elapsed}ms (${loaded}/${total} loaded, ${cached} cached, ${failed} failed)`);
    }

    return summary;
  }

  /**
   * Get avatar from cache
   * @param {string} keyOrItem - Cache key or player/houseguest object
   * @returns {Object|null} Cache entry or null if not found
   */
  function get(keyOrItem) {
    const key = typeof keyOrItem === 'string' ? keyOrItem : getCacheKey(keyOrItem);
    return cache.get(key) || null;
  }

  /**
   * Check if avatar is cached and ready
   * @param {string} keyOrItem - Cache key or player/houseguest object
   * @returns {boolean} True if cached and loaded
   */
  function has(keyOrItem) {
    const entry = get(keyOrItem);
    return entry && entry.status === Status.LOADED;
  }

  /**
   * Get avatar URL from cache or resolve it
   * @param {string} keyOrItem - Cache key or player/houseguest object
   * @returns {string} Avatar URL
   */
  function getUrl(keyOrItem) {
    const entry = get(keyOrItem);
    if (entry && entry.url) {
      return entry.url;
    }

    // Resolve URL if not in cache
    if (typeof keyOrItem === 'object') {
      return resolveAvatarUrl(keyOrItem);
    }

    return null;
  }

  /**
   * Clear cache (for testing)
   */
  function clear() {
    cache.clear();
    console.info('[AvatarCache] Cache cleared');
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics
   */
  function getStats() {
    const entries = Array.from(cache.values());
    return {
      total: entries.length,
      loaded: entries.filter(e => e.status === Status.LOADED).length,
      loading: entries.filter(e => e.status === Status.LOADING).length,
      error: entries.filter(e => e.status === Status.ERROR).length,
      pending: entries.filter(e => e.status === Status.PENDING).length
    };
  }

  /**
   * Preload avatars for AI houseguests
   * @param {Object} options - Options {onProgress, onItemComplete}
   * @returns {Promise<Object>} Summary
   */
  async function preloadHouseguests(options = {}) {
    // Get houseguests from global
    const houseguests = g.Houseguests ? g.Houseguests.getAll() : [];
    
    if (!houseguests || houseguests.length === 0) {
      console.warn('[AvatarCache] No houseguests available for preload');
      return { total: 0, loaded: 0, failed: 0, cached: 0, elapsed: 0, skipped: true };
    }

    console.info(`[AvatarCache] Preloading ${houseguests.length} houseguest avatars`);
    return preloadBatch(houseguests, options);
  }

  /**
   * Preload avatars for game players
   * @param {Array} players - Array of player objects (optional, uses game.players if not provided)
   * @param {Object} options - Options {onProgress, onItemComplete}
   * @returns {Promise<Object>} Summary
   */
  async function preloadPlayers(players = null, options = {}) {
    // Get players from parameter or global
    const playerList = players || g.game?.players || g.players || [];
    
    if (!playerList || playerList.length === 0) {
      console.warn('[AvatarCache] No players available for preload');
      return { total: 0, loaded: 0, failed: 0, cached: 0, elapsed: 0, skipped: true };
    }

    console.info(`[AvatarCache] Preloading ${playerList.length} player avatars`);
    return preloadBatch(playerList, options);
  }

  /**
   * Preload all avatars (houseguests + players)
   * @param {Object} options - Options {onProgress, players}
   * @returns {Promise<Object>} Combined summary
   */
  async function preloadAll(options = {}) {
    const startTime = Date.now();
    
    console.info('[AvatarCache] Preloading all avatars (houseguests + players)');

    // Collect all items to preload
    const houseguests = g.Houseguests ? g.Houseguests.getAll() : [];
    const players = options.players || g.game?.players || g.players || [];
    
    // Combine unique items (avoid duplicates)
    const allItems = [];
    const seen = new Set();
    
    for (const item of [...houseguests, ...players]) {
      const key = getCacheKey(item);
      if (!seen.has(key)) {
        seen.add(key);
        allItems.push(item);
      }
    }

    if (allItems.length === 0) {
      console.warn('[AvatarCache] No items to preload');
      return { total: 0, loaded: 0, failed: 0, cached: 0, elapsed: 0, skipped: true };
    }

    // Preload all at once
    const result = await preloadBatch(allItems, options);
    
    const totalElapsed = Date.now() - startTime;
    console.info(`[AvatarCache] Preloaded all avatars in ${totalElapsed}ms`);
    
    return {
      ...result,
      houseguestsCount: houseguests.length,
      playersCount: players.length
    };
  }

  // Export API
  const AvatarCache = {
    preloadBatch,
    preloadHouseguests,
    preloadPlayers,
    preloadAll,
    get,
    has,
    getUrl,
    clear,
    getStats,
    Status
  };

  // Export to window.game
  if (!g.AvatarCache) {
    g.AvatarCache = AvatarCache;
  }

  // Export to window for direct access
  if (typeof window !== 'undefined') {
    window.AvatarCache = AvatarCache;
  }

  console.info('[AvatarCache] Module loaded');

})(window.game || window);
