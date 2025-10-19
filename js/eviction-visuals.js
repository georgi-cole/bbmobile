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

    try {
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
    } finally {
      // Remove body class to allow roster to show final state
      document.body.classList.remove('evict-visual-in-progress');
    }
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
   * Badge is rendered CENTERED INSIDE the avatar container
   * Avatar becomes grayscale + semi-transparent
   * Only for ranks ≥ 3 (medals/awards shown for 1st and 2nd)
   * Houseguest name is kept visible
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
   * Badge is placed CENTERED INSIDE the avatar container
   * Avatar becomes grayscale + semi-transparent
   * Red X is hidden when badge is shown
   * Houseguest name is kept visible
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

    // Check if tile already has avatar rank badge
    if(tile.querySelector('.avatar-rank-badge')){
      console.info(`[eviction-visuals] avatar rank badge already exists for id=${evictedId}`);
      return;
    }

    // Hide any existing red X (via CSS class that hides .redx and .evicted-cross)
    const existingCross = tile.querySelector('.evicted-cross') || tile.querySelector('.redx');
    if(existingCross){
      existingCross.style.display = 'none';
      console.info(`[eviction-visuals] red X hidden for id=${evictedId}`);
    }

    // Find avatar container - prefer .top-tile-avatar-wrap, then .roster-avatar, .avatar, or img parent
    let avatarContainer = tile.querySelector('.top-tile-avatar-wrap') ||
                          tile.querySelector('.roster-avatar') ||
                          tile.querySelector('.avatar');
    
    if(!avatarContainer){
      // Fallback: find img and use its parent
      const img = tile.querySelector('img');
      if(img && img.parentElement){
        avatarContainer = img.parentElement;
      }
    }

    if(!avatarContainer){
      console.warn(`[eviction-visuals] avatar container not found, using tile-level fallback for id=${evictedId}`);
      // Fallback: add data-rank attribute to tile for CSS-based badge
      tile.dataset.rank = ordinal(rank);
      return;
    }

    // Apply grayscale + opacity to avatar image AFTER animation completes
    let avatarImg = avatarContainer.querySelector('img');
    // Only apply to <img> elements, never to containers
    if (!avatarImg) {
      const maybeImg = avatarContainer.querySelector('.top-tile-avatar');
      if (maybeImg && maybeImg.tagName && maybeImg.tagName.toLowerCase() === 'img') {
        avatarImg = maybeImg;
      }
    }
    if (avatarImg) {
      avatarImg.classList.add('avatar-bw-dim');
      console.info(`[eviction-visuals] avatar grayscale+opacity applied for id=${evictedId}`);
    }

    // Create avatar rank badge (positioned centered inside avatar)
    const badge = document.createElement('span');
    badge.className = 'avatar-rank-badge center';
    badge.textContent = ordinal(rank);
    badge.title = `Finished in ${ordinal(rank)} place`;

    // Add badge to avatar container
    avatarContainer.appendChild(badge);

    console.info(`[eviction-visuals] centered avatar rank badge added to tile id=${evictedId} rank=${ordinal(rank)}`);
  }

  /**
   * Notify that an eviction visual is pending
   * Adds body class to suppress interim roster updates during animation
   * @param {number} evictedId - Player ID of evicted houseguest
   * @param {string} source - Source of eviction (e.g., 'vote', 'self', 'final4', 'final3')
   */
  function notifyEvictedForVisual(evictedId, source = 'vote'){
    console.info(`[eviction-visuals] notified evictedId=${evictedId} source=${source}`);
    
    // Add body class to suppress red X and pale-out during animation
    document.body.classList.add('evict-visual-in-progress');
    
    // Store pending visual info for routing coordination
    const g = global.game;
    if(g){
      if(!g.__pendingVisuals) g.__pendingVisuals = {};
      g.__pendingVisuals[evictedId] = { source, timestamp: Date.now() };
    }
  }

  // Export to global
  global.runEvictionVisual = runEvictionVisual;
  global.notifyEvictedForVisual = notifyEvictedForVisual;

  console.info('[eviction-visuals] module loaded');

})(window);
