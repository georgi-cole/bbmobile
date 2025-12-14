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
   * Get TV container using robust selector fallback chain
   * Prioritizes viewport containers with positioning context
   */
  function getTvContainer(){
    // Try data attributes and viewport class first (most specific)
    let container = document.querySelector('[data-faux-tv], [data-sm-faux-tv], .tvViewport');
    
    // Fallback to TV container IDs/classes
    if(!container) container = document.getElementById('tv');
    if(!container) container = document.querySelector('.tv, .faux-tv, .tv-screen');
    
    if(!container){
      console.warn('[eviction-visuals] No TV container found');
      return null;
    }
    
    // Ensure container has positioning context
    const computedStyle = window.getComputedStyle(container);
    if(computedStyle.position === 'static'){
      console.info('[eviction-visuals] Setting position:relative on TV container');
      container.style.position = 'relative';
    }
    
    // Ensure container clips overflow
    if(computedStyle.overflow === 'visible'){
      console.info('[eviction-visuals] Setting overflow:hidden on TV container');
      container.style.overflow = 'hidden';
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

    // Find TV container using robust selector chain
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

  /**
   * Animate revival of returning juror's avatar in faux TV
   * Sequence: grayscale → color (0.8s) → pulse (0.4s) → cleanup
   * Total: ~1.2s
   * @param {number} returningId - Player ID of returning juror
   */
  async function animateRevivalAvatar(returningId){
    const player = global.getP?.(returningId);
    if(!player) {
      console.warn('[eviction-visuals] animateRevivalAvatar: player not found', returningId);
      return;
    }

    // Find TV container using robust selector chain
    const tvContainer = getTvContainer();
    
    if(!tvContainer){
      console.warn('[eviction-visuals] TV container not found for revival animation');
      return;
    }

    console.info('[eviction-visuals] Starting revival animation for', player.name);

    // Get avatar URL
    const avatarUrl = global.resolveAvatar?.(player) || 
                      player.avatar || 
                      player.img || 
                      player.photo || 
                      getDicebearUrl(player.name || 'player');

    // Create temporary avatar element (starts grayscale)
    const avatarEl = document.createElement('div');
    avatarEl.className = 'revival-visual-avatar';
    avatarEl.innerHTML = `
      <img src="${avatarUrl}" alt="${player.name}" 
           onerror="this.onerror=null;this.src='${getDicebearUrl(player.name)}'">
    `;

    // Add styles for revival animation (start grayscale)
    avatarEl.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 200px;
      height: 200px;
      border-radius: 50%;
      overflow: hidden;
      z-index: 100;
      box-shadow: 0 0 20px rgba(0, 224, 204, 0.5);
      transition: all 0.8s ease-out;
    `;

    const img = avatarEl.querySelector('img');
    if (img) {
      img.style.cssText = `
        width: 100%;
        height: 100%;
        object-fit: cover;
        filter: grayscale(100%);
        transition: filter 0.8s ease-out;
      `;
    }

    // Append to TV
    tvContainer.appendChild(avatarEl);

    // Animation sequence
    try{
      // Phase 1: Colorize (0.8s)
      await sleep(50); // Small delay for DOM render
      if (img) {
        img.style.filter = 'grayscale(0%)';
      }
      avatarEl.style.boxShadow = '0 0 40px rgba(126, 255, 163, 0.8)';
      await sleep(800);

      // Phase 2: Pulse effect (0.4s)
      avatarEl.style.transform = 'translate(-50%, -50%) scale(1.1)';
      await sleep(200);
      avatarEl.style.transform = 'translate(-50%, -50%) scale(1.0)';
      await sleep(200);

      // Remove element
      avatarEl.remove();
      
      console.info('[eviction-visuals] Revival animation complete');
    }catch(e){
      console.error('[eviction-visuals] revival animation error:', e);
      avatarEl.remove();
    }
  }

  // Export revival animation to global
  global.animateRevivalAvatar = animateRevivalAvatar;

  console.info('[eviction-visuals] module loaded');

})(window);
