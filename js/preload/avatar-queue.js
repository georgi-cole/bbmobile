// MODULE: avatar-queue.js
// Batched parallel avatar preloading with configurable concurrency
// Provides Image.decode() support, progress callbacks, and timeout safety
// Supports two UX modes: "batch" (gate roster) and "skeleton" (progressive)

(function(g) {
  'use strict';

  // ===== Default Configuration =====
  const DEFAULT_CONCURRENCY = 8;
  const DEFAULT_TIMEOUT_MS = 7000;
  const DEFAULT_READY_PERCENT = 0.99;
  const DEFAULT_LOAD_MODE = 'batch'; // 'batch' | 'skeleton'

  // ===== String Constants =====
  const LOADING_SUFFIX = ' (loading)';
  const DICEBEAR_URL_PATTERN = 'https://api.dicebear.com/6.x/bottts/svg?seed=';

  // ===== Logging Helpers =====
  function logInfo(...args) {
    console.info('[AvatarPreload]', ...args);
  }

  function logWarn(...args) {
    console.warn('[AvatarPreload]', ...args);
  }

  function logError(...args) {
    console.error('[AvatarPreload]', ...args);
  }

  // ===== Telemetry Helper =====
  function telemetry(event, data) {
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log(event, data);
      }
    } catch (e) {
      // Non-blocking telemetry
    }
  }

  // ===== Configuration Getters =====
  function getConfig() {
    const cfg = g.game?.cfg || g.cfg || {};
    return {
      concurrency: cfg.avatarPreloadConcurrency || DEFAULT_CONCURRENCY,
      timeoutMs: cfg.avatarPreloadTimeoutMs || DEFAULT_TIMEOUT_MS,
      readyPercent: cfg.avatarReadyPercent || DEFAULT_READY_PERCENT,
      loadMode: cfg.avatarLoadMode || DEFAULT_LOAD_MODE
    };
  }

  // ===== Image.decode() Support Check =====
  function supportsImageDecode() {
    try {
      return typeof Image !== 'undefined' && typeof new Image().decode === 'function';
    } catch (e) {
      return false;
    }
  }

  // ===== Queue-based Parallel Preloader =====
  /**
   * Preload a single avatar with decode() support
   * @param {string} url - Avatar URL
   * @param {number} playerId - Player ID for tracking
   * @returns {Promise<Object>} Result { playerId, url, success, decoded, duration }
   */
  function preloadSingleAvatar(url, playerId) {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const img = new Image();
      let resolved = false;

      const complete = (success, decoded = false) => {
        if (resolved) return;
        resolved = true;

        const duration = Date.now() - startTime;
        resolve({
          playerId,
          url,
          success,
          decoded,
          duration
        });
      };

      // Error handler - still count as complete (with fallback)
      img.onerror = () => {
        logWarn(`Failed to load avatar for player ${playerId}:`, url);
        complete(false, false);
      };

      // Load success handler
      img.onload = () => {
        // Try decode() for smoother rendering if available
        if (img.decode) {
          img.decode()
            .then(() => complete(true, true))
            .catch(() => {
              // decode() failed but image loaded - still success
              logWarn(`decode() failed for player ${playerId}, using direct`);
              complete(true, false);
            });
        } else {
          complete(true, false);
        }
      };

      // Check if already cached
      if (img.complete && img.naturalWidth > 0) {
        complete(true, false);
      } else {
        img.src = url;
      }
    });
  }

  /**
   * Run preloader queue with configurable concurrency and early completion
   * @param {Array<{playerId, url}>} items - Items to preload
   * @param {number} concurrency - Max concurrent requests
   * @param {Function} onProgress - Progress callback (loaded, total, item)
   * @param {Object} opts - Optional settings
   * @param {number} opts.readyPercent - Threshold for early completion (default: 1.0)
   * @param {Function} opts.onEarlyComplete - Called when readyPercent threshold is met
   * @returns {Promise<Object>} Results object { results, loaded, failed, earlyComplete }
   */
  async function runQueue(items, concurrency, onProgress, opts = {}) {
    const results = [];
    let loaded = 0;
    let failed = 0;
    let completed = 0;
    let index = 0;
    const total = items.length;
    const readyPercent = opts.readyPercent || 1.0;
    const onEarlyComplete = typeof opts.onEarlyComplete === 'function' ? opts.onEarlyComplete : null;
    let earlyComplete = false;
    let earlyCompleteTriggered = false;

    if (total === 0) {
      return { results, loaded: 0, failed: 0, earlyComplete: false };
    }

    logInfo(`Starting queue: ${total} items, concurrency=${concurrency}, readyPercent=${readyPercent}`);

    // Calculate threshold for early completion
    const readyThreshold = Math.ceil(total * readyPercent);

    // Worker function - picks next item from queue
    async function worker() {
      while (index < total) {
        const currentIndex = index++;
        const item = items[currentIndex];

        const result = await preloadSingleAvatar(item.url, item.playerId);
        results[currentIndex] = result;
        completed++;

        if (result.success) {
          loaded++;
        } else {
          failed++;
        }

        // Progress callback - pass completed count for UI progress (counts both success and failure)
        // This ensures the progress bar fills up even when some avatars fail to load
        if (typeof onProgress === 'function') {
          onProgress(completed, total, result);
        }

        // Check for early completion (threshold met)
        if (!earlyCompleteTriggered && loaded >= readyThreshold) {
          earlyCompleteTriggered = true;
          earlyComplete = true;
          logInfo(`Early complete: ${loaded}/${total} loaded (threshold: ${readyThreshold})`);
          if (onEarlyComplete) {
            onEarlyComplete({ loaded, failed, completed, total });
          }
        }
      }
    }

    // Start concurrent workers
    const workers = [];
    const workerCount = Math.min(concurrency, total);
    for (let i = 0; i < workerCount; i++) {
      workers.push(worker());
    }

    await Promise.all(workers);

    return { results, loaded, failed, earlyComplete };
  }

  /**
   * Main preload function with queued parallel loading
   * 
   * @param {Array} players - Array of player objects with id, name, avatar properties
   * @param {Object} opts - Options object
   * @param {number} opts.concurrency - Max concurrent requests (default: 8)
   * @param {number} opts.timeout - Timeout in ms (default: 7000)
   * @param {number} opts.readyPercent - Percentage threshold for ready (default: 0.99)
   * @param {Function} opts.onProgress - Callback (loaded, total, item) for progress updates
   * @param {Function} opts.onItemComplete - Callback (item) for skeleton mode per-avatar updates
   * @returns {Promise<Object>} Summary { total, loaded, failed, decodeSupported, timedOut, elapsedMs, results }
   */
  async function preloadAvatarsQueued(players, opts = {}) {
    const config = getConfig();
    const concurrency = opts.concurrency || config.concurrency;
    const timeout = opts.timeout || config.timeoutMs;
    const readyPercent = opts.readyPercent || config.readyPercent;
    const onProgress = typeof opts.onProgress === 'function' ? opts.onProgress : () => {};
    const onItemComplete = typeof opts.onItemComplete === 'function' ? opts.onItemComplete : () => {};

    const startTime = Date.now();
    const decodeSupported = supportsImageDecode();

    logInfo(`Starting preload: ${players?.length || 0} players, concurrency=${concurrency}, timeout=${timeout}ms`);
    logInfo(`decode() supported: ${decodeSupported}`);

    // Log telemetry
    telemetry('avatar_preload_start', {
      playerCount: players?.length || 0,
      concurrency,
      timeout,
      decodeSupported
    });

    // Validate input
    if (!players || !Array.isArray(players) || players.length === 0) {
      logWarn('No players provided, skipping preload');
      return {
        total: 0,
        loaded: 0,
        failed: 0,
        decodeSupported,
        timedOut: false,
        elapsedMs: 0,
        results: []
      };
    }

    // Collect avatar URLs using resolveAvatar fallback chain
    const items = [];
    const resolveAvatar = g.resolveAvatar || window.resolveAvatar;
    const getDicebearUrl = g.getDicebearUrl || window.getDicebearUrl;

    for (const player of players) {
      if (!player) continue;

      let url = null;

      // Try resolveAvatar if available (preferred)
      if (resolveAvatar) {
        try {
          url = resolveAvatar(player);
        } catch (e) {
          logWarn(`resolveAvatar failed for player ${player.id}:`, e);
        }
      }

      // Fallback chain: avatar -> img -> photo -> Dicebear
      if (!url) {
        url = player.avatar || player.img || player.photo;

        if (!url) {
          // Final fallback: Dicebear
          if (getDicebearUrl) {
            url = getDicebearUrl(player.name || String(player.id));
          } else {
            url = DICEBEAR_URL_PATTERN + encodeURIComponent(player.name || String(player.id));
          }
        }
      }

      if (url) {
        items.push({ playerId: player.id, url, playerName: player.name });
      }
    }

    logInfo(`Resolved ${items.length} avatar URLs`);

    const total = items.length;
    if (total === 0) {
      onProgress(0, 0);
      return {
        total: 0,
        loaded: 0,
        failed: 0,
        decodeSupported,
        timedOut: false,
        elapsedMs: 0,
        results: []
      };
    }

    // Initial progress callback (important: show 0% to user immediately)
    onProgress(0, total);

    // Track loading stats
    let loaded = 0;
    let failed = 0;
    let decoded = 0;
    let timedOut = false;
    let earlyComplete = false;

    // Create timeout promise
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        resolve({ timedOut: true });
      }, timeout);
    });

    // Create preload promise with early completion support
    // Note: The progress callback now receives 'completed' count (success + fail) for smooth UI
    let completed = 0;
    const preloadPromise = runQueue(
      items, 
      concurrency, 
      (currentCompleted, currentTotal, item) => {
        completed = currentCompleted;
        if (item.success) {
          loaded++;
          if (item.decoded) decoded++;
        } else {
          failed++;
        }

        // Progress callback - update UI with completed count for smooth progress
        onProgress(completed, total);

        // Per-item callback for skeleton mode
        onItemComplete(item);
      },
      {
        readyPercent,
        onEarlyComplete: (stats) => {
          earlyComplete = true;
          logInfo(`Early completion triggered: ${stats.loaded}/${stats.total} loaded`);
        }
      }
    );

    // Race between preload and timeout
    const race = await Promise.race([
      preloadPromise.then(queueResult => ({ 
        results: queueResult.results, 
        loaded: queueResult.loaded,
        failed: queueResult.failed,
        earlyComplete: queueResult.earlyComplete,
        timedOut: false 
      })),
      timeoutPromise
    ]);

    // Calculate elapsed time
    const elapsedMs = Date.now() - startTime;

    // Update final counts from race result
    if (!race.timedOut) {
      loaded = race.loaded;
      failed = race.failed;
      earlyComplete = race.earlyComplete || false;
    }

    // Check if we timed out or finished
    if (race.timedOut) {
      timedOut = true;
      logWarn(`Timeout after ${elapsedMs}ms - proceeding with ${loaded}/${total} avatars`);

      telemetry('avatar_preload_timeout', {
        loaded,
        total,
        failed,
        elapsedMs
      });
    } else {
      // Finished within timeout
      logInfo(`Completed in ${elapsedMs}ms: ${loaded}/${total} loaded, ${decoded} decoded, earlyComplete=${earlyComplete}`);

      telemetry('avatar_preload_batch_done', {
        loaded,
        total,
        failed,
        decoded,
        elapsedMs,
        decodeSupported,
        earlyComplete
      });
    }

    // Calculate if ready threshold met
    const percentLoaded = total > 0 ? loaded / total : 1;
    const isReady = percentLoaded >= readyPercent || timedOut || earlyComplete;

    // Build summary
    const summary = {
      total,
      loaded,
      failed,
      decoded,
      decodeSupported,
      timedOut,
      elapsedMs,
      percentLoaded,
      isReady,
      earlyComplete,
      results: race.results || []
    };

    logInfo('Summary:', summary);

    return summary;
  }

  /**
   * Dispatch avatars:ready custom event
   * @param {Object} summary - Preload summary object
   */
  function dispatchAvatarsReady(summary) {
    try {
      const event = new CustomEvent('avatars:ready', {
        detail: summary,
        bubbles: true
      });
      window.dispatchEvent(event);

      logInfo('Dispatched avatars:ready event', summary);

      telemetry('avatars_ready_event', {
        loaded: summary.loaded,
        total: summary.total,
        timedOut: summary.timedOut,
        elapsedMs: summary.elapsedMs
      });
    } catch (e) {
      logError('Failed to dispatch avatars:ready event:', e);
    }
  }

  /**
   * Full preload workflow for batch mode
   * Preloads avatars and dispatches ready event when threshold met
   * 
   * @param {Array} players - Array of player objects
   * @param {Object} opts - Options (passed to preloadAvatarsQueued)
   * @returns {Promise<Object>} Summary object
   */
  async function batchPreload(players, opts = {}) {
    const summary = await preloadAvatarsQueued(players, opts);
    dispatchAvatarsReady(summary);
    return summary;
  }

  /**
   * Create skeleton placeholder for avatar
   * @param {Object} player - Player object
   * @returns {HTMLElement} Placeholder element
   */
  function createSkeletonPlaceholder(player) {
    const placeholder = document.createElement('div');
    placeholder.className = 'avatar-skeleton';
    placeholder.setAttribute('data-player-id', player.id);
    placeholder.setAttribute('role', 'img');
    placeholder.setAttribute('aria-label', `${player.name || 'Player'}${LOADING_SUFFIX}`);

    // Add shimmer animation div
    const shimmer = document.createElement('div');
    shimmer.className = 'avatar-skeleton__shimmer';
    placeholder.appendChild(shimmer);

    return placeholder;
  }

  /**
   * Replace skeleton with loaded image
   * @param {HTMLElement} container - Container element with skeletons
   * @param {number} playerId - Player ID
   * @param {string} url - Avatar URL
   */
  function replaceSkeletonWithImage(container, playerId, url) {
    if (!container) return;

    const skeleton = container.querySelector(`[data-player-id="${playerId}"].avatar-skeleton`);
    if (!skeleton) return;

    // Create image element
    const img = document.createElement('img');
    img.className = 'avatar-image avatar-image--loading';
    img.src = url;
    img.alt = skeleton.getAttribute('aria-label')?.replace(LOADING_SUFFIX, '') || 'Player avatar';
    img.setAttribute('data-player-id', playerId);

    // Handle load complete - trigger fade transition
    img.onload = () => {
      img.classList.remove('avatar-image--loading');
      img.classList.add('avatar-image--loaded');
      // Remove skeleton after transition
      setTimeout(() => {
        skeleton.remove();
      }, 350); // Match CSS transition duration
    };

    // Handle error - still remove skeleton
    img.onerror = () => {
      img.classList.remove('avatar-image--loading');
      img.classList.add('avatar-image--fallback');
      skeleton.remove();
    };

    // Insert image before skeleton
    skeleton.parentNode.insertBefore(img, skeleton);
  }

  /**
   * Full preload workflow for skeleton mode
   * Renders placeholders first, then progressively replaces with loaded images
   * 
   * @param {Array} players - Array of player objects
   * @param {HTMLElement} container - Container element for roster
   * @param {Object} opts - Options (passed to preloadAvatarsQueued)
   * @returns {Promise<Object>} Summary object
   */
  async function skeletonPreload(players, container, opts = {}) {
    // Extend opts with per-item callback for skeleton replacement
    const extendedOpts = {
      ...opts,
      onItemComplete: (item) => {
        if (item.success && container) {
          replaceSkeletonWithImage(container, item.playerId, item.url);
        }
        // Call original if provided
        if (opts.onItemComplete) {
          opts.onItemComplete(item);
        }
      }
    };

    const summary = await preloadAvatarsQueued(players, extendedOpts);
    dispatchAvatarsReady(summary);
    return summary;
  }

  // ===== Export to Global Scope =====
  const AvatarQueue = {
    preloadAvatarsQueued,
    batchPreload,
    skeletonPreload,
    dispatchAvatarsReady,
    createSkeletonPlaceholder,
    replaceSkeletonWithImage,
    getConfig,
    supportsImageDecode
  };

  // Export to window.game
  if (!g.AvatarQueue) {
    g.AvatarQueue = AvatarQueue;
  }

  // Export to window for direct access
  if (typeof window !== 'undefined') {
    window.AvatarQueue = AvatarQueue;
    window.preloadAvatarsQueued = preloadAvatarsQueued;
  }

  logInfo('Module loaded (decode supported:', supportsImageDecode(), ')');

})(window.game || window);
