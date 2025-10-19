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
  }

  /**
   * Notify that an eviction visual is pending for a player.
   * Sets flags to suppress red X on HUD until visual completes.
   * @param {number} evictedId - Player ID of evicted houseguest
   */
  function notifyEvictedForVisual(evictedId){
    const g = global.game;
    if(!g) return;
    
    // Set suppression flags so HUD does not render red X during animation
    g.__pendingEvictionVisual = evictedId;
    g.__suppressEvictedHudUntilVisualDone = true;
    
    console.info(`[eviction-visuals] suppression enabled for id=${evictedId}`);
  }

  // Export functions to global
  global.runEvictionVisual = runEvictionVisual;
  global.notifyEvictedForVisual = notifyEvictedForVisual;

  /**
   * Animate evicted player's avatar in faux TV
   * Sequence: zoom-in (0.6s) → grayscale (0.4s) → fade out (0.6s)
   * Total: ~1.6s
   */
  async function animateEvictedAvatar(evictedId){
    const player = global.getP?.(evictedId);
    if(!player) return;

    // Find TV container - resilient to different selector variants
    const tvContainer = document.getElementById('tv') || 
                        document.querySelector('.tv') ||
                        document.querySelector('.faux-tv') ||
                        document.querySelector('.tv-screen');
    
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
