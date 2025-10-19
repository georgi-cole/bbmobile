// MODULE: eviction-visuals.js
// Non-breaking visual enhancement for evictions:
// - Shows evicted player's avatar in faux TV with animation (zoom-in → B&W → fade)
// - Updates roster with ordinal finishing badge (e.g., "12th") for ranks ≥ 3
// - Idempotent (runs at most once per eviction)
// - Works for all eviction types: standard vote, Final 4, Final 3, self-eviction

(function(global){
  'use strict';

  // Import centralized avatar resolver
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  // Ordinal helper (e.g., 1 → "1st", 12 → "12th")
  function ordinal(n){
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }

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

    // Update roster with finishing badge
    updateRosterFinishingBadge(evictedId);

    console.info(`[eviction-visuals] complete id=${evictedId}`);
  }

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

  /**
   * Update roster to show ordinal finishing badge for evicted player
   * Only for ranks ≥ 3 (medals/awards shown for 1st and 2nd)
   */
  function updateRosterFinishingBadge(evictedId){
    const player = global.getP?.(evictedId);
    if(!player || !player.evicted) return;

    // Get or compute finalRank
    let rank = player.finalRank;
    if(!rank){
      // Compute based on remaining players at time of eviction
      const g = global.game || {};
      const allPlayers = g.players || [];
      const originalCount = allPlayers.length;
      
      // Count how many players were evicted before this one
      const evictedBefore = allPlayers.filter(other => 
        other.evicted && 
        other.id !== player.id && 
        (other.weekEvicted || 0) < (player.weekEvicted || 0)
      ).length;
      
      rank = originalCount - evictedBefore;
      player.finalRank = rank; // Cache it
    }

    console.info(`[eviction-visuals] roster update id=${evictedId} rank=${rank}`);

    // Only show ordinal badge for ranks ≥ 3
    // For ranks 1 and 2, medals/awards are already shown via existing logic
    if(rank < 3) return;

    // Store the badge info on the player object so it can be rendered on next HUD update
    player.showFinishingBadge = true;

    // Trigger HUD update to re-render roster with the badge
    if(typeof global.updateHud === 'function'){
      setTimeout(() => {
        try{
          global.updateHud();
          console.info(`[eviction-visuals] HUD updated, roster re-rendered with badge for id=${evictedId}`);
        }catch(e){
          console.error('[eviction-visuals] HUD update failed:', e);
        }
      }, 100);
    }

    // Also try to update existing tile if already rendered (for immediate visual feedback)
    updateExistingTile(evictedId, rank);
  }

  /**
   * Update existing roster tile with finishing badge (immediate feedback)
   */
  function updateExistingTile(evictedId, rank){
    // Find roster tile - resilient to different selector patterns
    const tile = document.querySelector(`[data-player-id="${evictedId}"]`) ||
                 document.querySelector(`#p-${evictedId}`) ||
                 document.querySelector(`.player-${evictedId}`) ||
                 document.querySelector(`.roster-tile[data-id="${evictedId}"]`);

    if(!tile){
      console.warn(`[eviction-visuals] roster tile not found for id=${evictedId}`);
      return;
    }

    // Check if tile already has finishing badge
    if(tile.querySelector('.finishing-badge')){
      console.info(`[eviction-visuals] finishing badge already exists for id=${evictedId}`);
      return;
    }

    // Find or create badge container in tile
    let badgeContainer = tile.querySelector('.top-tile-name');
    if(!badgeContainer){
      // Fallback: look for other name containers
      badgeContainer = tile.querySelector('.roster-name') ||
                      tile.querySelector('.player-name') ||
                      tile.querySelector('.name');
    }

    if(!badgeContainer){
      console.warn(`[eviction-visuals] badge container not found in tile for id=${evictedId}`);
      return;
    }

    // Create finishing badge
    const badge = document.createElement('span');
    badge.className = 'finishing-badge';
    badge.textContent = ordinal(rank);
    badge.title = `Finished in ${ordinal(rank)} place`;

    // Replace existing cross with badge
    const existingCross = tile.querySelector('.evicted-cross');
    if(existingCross){
      // Hide cross and show badge instead
      existingCross.style.display = 'none';
    }

    // Clear badge container and add finishing badge
    badgeContainer.innerHTML = '';
    badgeContainer.appendChild(badge);

    console.info(`[eviction-visuals] finishing badge added to existing tile id=${evictedId} rank=${ordinal(rank)}`);
  }

  // Export to global
  global.runEvictionVisual = runEvictionVisual;

  console.info('[eviction-visuals] module loaded');

})(window);
