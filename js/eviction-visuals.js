// MODULE: eviction-visuals.js
// Non-breaking visual enhancement for evictions:
// - Shows evicted player's avatar in faux TV with animation (zoom-in → B&W → fade)
// - Idempotent (runs at most once per eviction)
// - Works for all eviction types: standard vote, Final 4, Final 3, self-eviction

(function(global){
  'use strict';

  // Import centralized avatar resolver
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  // Sleep helper
  function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }

  /**
   * Main function: Run eviction visual enhancement
   * @param {number} evictedId - Player ID of evicted houseguest
   * @param {object} context - Optional context (e.g., { reason: 'vote'|'self'|'final4'|'final3' })
   */
  async function runEvictionVisual(evictedId, context = {}){
    const g = global.game;
    if(!g) return;

    // Guard: Run only once per eviction
    if(!g.__evictVisualDone) g.__evictVisualDone = {};
    if(g.__evictVisualDone[evictedId]){
      console.info(`[eviction-visuals] skipped id=${evictedId} (already done)`);
      return;
    }
    g.__evictVisualDone[evictedId] = true;

    console.info(`[eviction-visuals] start id=${evictedId} context=${JSON.stringify(context)}`);

    // Wait for card queue to go idle
    if(typeof global.cardQueueWaitIdle === 'function'){
      try{
        await global.cardQueueWaitIdle();
      }catch(e){
        console.warn('[eviction-visuals] cardQueueWaitIdle failed:', e);
      }
    }

    // Run avatar animation in faux TV
    await animateEvictedAvatar(evictedId);

    console.info(`[eviction-visuals] complete id=${evictedId}`);
    
    // Animation complete - clear suppression for this player
    if(g.__pendingEvictionVisuals){
      g.__pendingEvictionVisuals.delete(evictedId);
      
      // If no more pending visuals, disable suppression entirely
      if(g.__pendingEvictionVisuals.size === 0){
        g.__suppressEvictedHudUntilVisualDone = false;
      }
    }
    
    // Update HUD to show red X now that animation is complete
    if(typeof global.updateHud === 'function'){
      global.updateHud();
    }
  }

  /**
   * Notify that an eviction visual is pending for a player.
   * Sets flags to suppress red X on HUD until visual completes.
   * @param {number} evictedId - Player ID of evicted houseguest
   */
  function notifyEvictedForVisual(evictedId){
    const g = global.game;
    if(!g) return;
    
    // Initialize pending set if needed
    if(!g.__pendingEvictionVisuals) g.__pendingEvictionVisuals = new Set();
    
    // Add to pending set and enable suppression
    g.__pendingEvictionVisuals.add(evictedId);
    g.__suppressEvictedHudUntilVisualDone = true;
    
    console.info(`[eviction-visuals] suppression enabled for id=${evictedId}`);
    
    // Immediately update HUD to suppress red X display
    if(typeof global.updateHud === 'function'){
      global.updateHud();
    }
  }

  // Export functions to global
  global.runEvictionVisual = runEvictionVisual;
  global.notifyEvictedForVisual = notifyEvictedForVisual;

  /**
   * Get TV container element with robust selector priority.
   * Ensures positioning context and overflow clipping are set.
   * @returns {HTMLElement|null} - The TV container element
   */
  function getTvContainer() {
    // Try selectors in priority order:
    // 1. Data attributes (most specific, used in live markup)
    // 2. .tvViewport (primary viewport container)
    // 3. #tv (main TV element ID)
    // 4. .tv (common TV class)
    // 5. .faux-tv, .tv-screen (legacy/fallback selectors)
    const selectors = [
      '[data-faux-tv]',
      '[data-sm-faux-tv]',
      '.tvViewport',
      '#tv',
      '.tv',
      '.faux-tv',
      '.tv-screen'
    ];
    
    let container = null;
    for (const selector of selectors) {
      container = document.querySelector(selector);
      if (container) break;
    }
    
    if (!container) {
      console.warn('[eviction-visuals] No TV container found');
      return null;
    }
    
    // Ensure positioning context (non-destructive)
    const computedStyle = window.getComputedStyle(container);
    if (computedStyle.position === 'static') {
      container.style.position = 'relative';
      console.info('[eviction-visuals] Set position:relative on TV container');
    }
    
    // Ensure overflow clipping (non-destructive)
    if (computedStyle.overflow !== 'hidden') {
      container.style.overflow = 'hidden';
      console.info('[eviction-visuals] Set overflow:hidden on TV container');
    }
    
    return container;
  }

  /**
   * Animate evicted player's avatar in faux TV
   * Sequence: zoom-in (0.6s) → grayscale (0.4s) → fade out (0.6s)
   * Total: ~1.6s
   */
  async function animateEvictedAvatar(evictedId){
    const player = global.getP?.(evictedId);
    if(!player) return;

    // Find TV container with robust detection
    const tvContainer = getTvContainer();
    
    if(!tvContainer){
      console.warn('[eviction-visuals] TV container not found, skipping animation');
      return;
    }

    // Get avatar URL
    const avatarUrl = global.resolveAvatar?.(player) || 
                      player.avatar || 
                      player.img || 
                      player.photo || 
                      getDicebearUrl(player.name || 'player');

    // Create temporary avatar element
    const avatarEl = document.createElement('div');
    avatarEl.className = 'eviction-visual-avatar';
    avatarEl.innerHTML = `
      <img src="${avatarUrl}" alt="${player.name}" 
           onerror="this.onerror=null;this.src='${getDicebearUrl(player.name)}'">
    `;

    // Append to TV
    tvContainer.appendChild(avatarEl);

    // Animation sequence
    try{
      // Phase 1: Zoom in (0.6s)
      await sleep(50); // Small delay for DOM render
      avatarEl.classList.add('zoom-in');
      await sleep(600);

      // Phase 2: Grayscale (0.4s)
      avatarEl.classList.add('grayscale');
      await sleep(400);

      // Phase 3: Fade out (0.6s)
      avatarEl.classList.add('fade-out');
      await sleep(600);

      // Remove element
      avatarEl.remove();
    }catch(e){
      console.error('[eviction-visuals] animation error:', e);
      avatarEl.remove();
    }
  }

  console.info('[eviction-visuals] module loaded');

})(window);
