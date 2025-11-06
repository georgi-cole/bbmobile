// MODULE: nominations-grid-fullscreen.js
// Full-screen avatar grid selector for human HOH nominations.
// Replaces the in-TV pick mode with a proper full-screen overlay selector.
// Provides centered TV cards and a modern, accessible nomination UX.

(function(global){
  'use strict';

  // ========== Configuration ==========
  
  // Note: Configuration values are defined in CSS variables
  // const CONFIG = { ... } - removed as all styling is handled via CSS

  // ========== State Management ==========
  
  const state = {
    active: false,
    selectedIds: new Set(),
    requiredCount: 0,
    eligibleIds: [],
    overlay: null,
    escapeHandler: null,
    clickHandlers: new Map()
  };

  // ========== Helper Functions ==========
  
  function aliveIds(){ 
    return global.alivePlayers ? global.alivePlayers().map(p => p.id) : []; 
  }
  
  function eligibleNomIds(){ 
    const g = global.game;
    return aliveIds().filter(id => id !== g.hohId); 
  }
  
  function requiredSlots(){ 
    return Math.max(2, Math.min(4, global.game?.__twistNomSlots || 2)); 
  }

  // Removed unused safeName helper - using global.safeName directly where needed

  function getPlayer(id){
    return global.getP ? global.getP(id) : null;
  }

  function resolveAvatar(player){
    if(!player) return null;
    if(global.resolveAvatar) return global.resolveAvatar(player);
    return player.avatar || player.avatarUrl || 'avatars/placeholder.png';
  }

  // ========== TV Overlay Management ==========
  
  /**
   * Ensure #tvOverlay exists and is ready for content
   */
  function ensureTVOverlay(){
    let tvOverlay = document.getElementById('tvOverlay');
    
    if(!tvOverlay){
      console.warn('[noms-grid] #tvOverlay not found in DOM');
      // Try to use global scaffold function
      if(global.ensureTVOverlayScaffold){
        const content = global.ensureTVOverlayScaffold();
        if(content) tvOverlay = content.parentElement || content;
      }
    }
    
    if(!tvOverlay){
      console.error('[noms-grid] Failed to ensure #tvOverlay');
      return null;
    }
    
    return tvOverlay;
  }

  /**
   * Show centered intro card in TV with NOMINATE button
   */
  function showIntroCard(hoh, need){
    console.log('[noms-grid] Showing intro card');
    
    const tvOverlay = ensureTVOverlay();
    if(!tvOverlay) return false;
    
    tvOverlay.innerHTML = '';
    
    // Apply centering to tvOverlay
    tvOverlay.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      position: absolute;
      inset: 0;
      pointer-events: auto;
    `;
    
    const card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard';
    card.style.cssText = `
      max-width: min(92%, 500px);
      max-height: 78%;
      padding: 24px 28px;
      text-align: center;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 14px;
      animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
    `;
    
    const title = document.createElement('h3');
    title.textContent = 'Nomination Ceremony';
    title.style.cssText = 'margin: 0 0 8px 0; font-size: 1.15rem;';
    card.appendChild(title);
    
    const bodyText = document.createElement('div');
    bodyText.className = 'big';
    bodyText.style.cssText = 'font-size: 0.9rem; line-height: 1.6; margin-bottom: 4px;';
    
    const countText = need > 2 
      ? `You must nominate ${need} houseguests for eviction.`
      : 'You must nominate two houseguests for eviction.';
    bodyText.textContent = `${hoh.name}, as Head of Household, it is time to make your nominations. ${countText}`;
    card.appendChild(bodyText);
    
    const nominateBtn = document.createElement('button');
    nominateBtn.className = 'btn primary';
    nominateBtn.textContent = 'NOMINATE';
    nominateBtn.style.cssText = `
      padding: 12px 36px;
      font-size: 1rem;
      font-weight: 700;
      margin-top: 12px;
    `;
    
    nominateBtn.addEventListener('click', () => {
      console.log('[noms-grid] NOMINATE clicked, opening full-screen selector');
      openFullScreenSelector(hoh, need);
    });
    
    card.appendChild(nominateBtn);
    tvOverlay.appendChild(card);
    
    // Show TV
    const tv = document.getElementById('tv');
    if(tv) tv.classList.add('tvTall');
    
    console.log('[noms-grid] ✓ Intro card shown');
    return true;
  }

  // ========== Full-Screen Selector ==========
  
  /**
   * Create and show the full-screen avatar grid selector
   */
  function openFullScreenSelector(hoh, need){
    if(state.active){
      console.warn('[noms-grid] Selector already active');
      return;
    }
    
    console.log('[noms-grid] Opening full-screen selector');
    
    // Initialize state
    state.active = true;
    state.selectedIds.clear();
    state.requiredCount = need;
    state.eligibleIds = eligibleNomIds();
    
    console.log('[noms-grid] Eligible IDs:', state.eligibleIds);
    
    // Clear TV
    const tvOverlay = document.getElementById('tvOverlay');
    if(tvOverlay) tvOverlay.innerHTML = '';
    const tv = document.getElementById('tv');
    if(tv) tv.classList.remove('tvTall');
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.id = 'noms-grid-overlay';
    overlay.className = 'noms-grid-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'noms-grid-header-title');
    
    // Backdrop (dim)
    const backdrop = document.createElement('div');
    backdrop.className = 'noms-grid-backdrop';
    overlay.appendChild(backdrop);
    
    // Content container
    const content = document.createElement('div');
    content.className = 'noms-grid-content';
    
    // Header
    const header = document.createElement('div');
    header.className = 'noms-grid-header';
    
    const headerTitle = document.createElement('h2');
    headerTitle.id = 'noms-grid-header-title';
    headerTitle.textContent = 'Select Nominees for Eviction';
    headerTitle.className = 'noms-grid-header-title';
    header.appendChild(headerTitle);
    
    const countDisplay = document.createElement('div');
    countDisplay.id = 'noms-grid-count';
    countDisplay.className = 'noms-grid-count';
    countDisplay.setAttribute('aria-live', 'polite');
    countDisplay.setAttribute('aria-atomic', 'true');
    updateCountDisplay(countDisplay);
    header.appendChild(countDisplay);
    
    content.appendChild(header);
    
    // Grid container
    const gridContainer = document.createElement('div');
    gridContainer.className = 'noms-grid-scroll-container';
    
    const grid = document.createElement('div');
    grid.className = 'noms-grid-tiles';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Nominee selection grid');
    
    // Create tiles for eligible houseguests
    state.eligibleIds.forEach((playerId, index) => {
      const player = getPlayer(playerId);
      if(!player) return;
      
      const tile = createTile(player, index);
      grid.appendChild(tile);
    });
    
    gridContainer.appendChild(grid);
    content.appendChild(gridContainer);
    
    // Footer with Confirm button
    const footer = document.createElement('div');
    footer.className = 'noms-grid-footer';
    
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'noms-grid-confirm';
    confirmBtn.className = 'btn primary noms-grid-confirm-btn';
    confirmBtn.textContent = 'CONFIRM NOMINATIONS';
    confirmBtn.disabled = true;
    confirmBtn.setAttribute('aria-disabled', 'true');
    
    confirmBtn.addEventListener('click', () => {
      if(state.selectedIds.size === state.requiredCount){
        confirmNominations();
      }
    });
    
    footer.appendChild(confirmBtn);
    content.appendChild(footer);
    
    overlay.appendChild(content);
    
    // Block Escape key
    state.escapeHandler = (e) => {
      if(e.key === 'Escape' || e.key === 'Backspace'){
        e.preventDefault();
        e.stopPropagation();
        console.log('[noms-grid] Escape blocked - must complete selection');
        return false;
      }
    };
    document.addEventListener('keydown', state.escapeHandler, { capture: true });
    
    // Add to DOM
    document.body.appendChild(overlay);
    state.overlay = overlay;
    
    // Apply reduced motion preferences
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
      overlay.classList.add('reduced-motion');
    }
    
    console.log('[noms-grid] ✓ Full-screen selector opened');
  }

  /**
   * Create a selectable tile for a houseguest
   */
  function createTile(player, index){
    const tile = document.createElement('div');
    tile.className = 'noms-grid-tile';
    tile.dataset.playerId = player.id;
    tile.setAttribute('role', 'checkbox');
    tile.setAttribute('aria-checked', 'false');
    tile.setAttribute('aria-label', `${player.name}, click to select`);
    tile.setAttribute('tabindex', '0');
    
    // Avatar
    const avatarWrap = document.createElement('div');
    avatarWrap.className = 'noms-grid-tile-avatar-wrap';
    
    const avatar = document.createElement('img');
    avatar.className = 'noms-grid-tile-avatar';
    avatar.src = resolveAvatar(player);
    avatar.alt = player.name;
    avatar.loading = 'lazy';
    avatarWrap.appendChild(avatar);
    
    tile.appendChild(avatarWrap);
    
    // Name
    const name = document.createElement('div');
    name.className = 'noms-grid-tile-name';
    name.textContent = player.name;
    tile.appendChild(name);
    
    // Click handler
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleSelection(player.id);
    };
    tile.addEventListener('click', clickHandler);
    
    // Keyboard handler
    const keyHandler = (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        toggleSelection(player.id);
      }
    };
    tile.addEventListener('keydown', keyHandler);
    
    state.clickHandlers.set(player.id, { tile, clickHandler, keyHandler });
    
    // Stagger animation
    tile.style.animationDelay = `${index * 40}ms`;
    
    return tile;
  }

  /**
   * Toggle selection of a tile
   */
  function toggleSelection(playerId){
    const player = getPlayer(playerId);
    if(!player) return;
    
    const isSelected = state.selectedIds.has(playerId);
    
    if(isSelected){
      // Deselect
      state.selectedIds.delete(playerId);
      console.log('[noms-grid] Deselected:', player.name);
    } else {
      // Check if we can add more
      if(state.selectedIds.size >= state.requiredCount){
        console.log('[noms-grid] Cannot select more than', state.requiredCount);
        // Show brief feedback (optional)
        return;
      }
      
      // Select
      state.selectedIds.add(playerId);
      console.log('[noms-grid] Selected:', player.name);
    }
    
    // Update tile visual state
    const handler = state.clickHandlers.get(playerId);
    if(handler?.tile){
      const tile = handler.tile;
      const nowSelected = state.selectedIds.has(playerId);
      
      if(nowSelected){
        tile.classList.add('selected');
        tile.setAttribute('aria-checked', 'true');
        tile.setAttribute('aria-label', `${player.name}, selected, click to deselect`);
      } else {
        tile.classList.remove('selected');
        tile.setAttribute('aria-checked', 'false');
        tile.setAttribute('aria-label', `${player.name}, click to select`);
      }
    }
    
    // Update count display
    const countDisplay = document.getElementById('noms-grid-count');
    if(countDisplay) updateCountDisplay(countDisplay);
    
    // Update confirm button state
    const confirmBtn = document.getElementById('noms-grid-confirm');
    if(confirmBtn){
      const canConfirm = state.selectedIds.size === state.requiredCount;
      confirmBtn.disabled = !canConfirm;
      confirmBtn.setAttribute('aria-disabled', canConfirm ? 'false' : 'true');
    }
  }

  /**
   * Update the count display text
   */
  function updateCountDisplay(element){
    const selected = state.selectedIds.size;
    const required = state.requiredCount;
    element.textContent = `${selected} / ${required} selected`;
    
    if(selected === required){
      element.classList.add('complete');
    } else {
      element.classList.remove('complete');
    }
  }

  /**
   * Confirm nominations and close selector
   */
  function confirmNominations(){
    console.log('[noms-grid] Confirming nominations:', Array.from(state.selectedIds));
    
    const g = global.game;
    
    // Set pending nominations
    g._pendingNoms = Array.from(state.selectedIds);
    
    // Close selector
    closeSelector();
    
    // Trigger finalize using the global function
    if(global.lockNominationsAndProceed){
      console.log('[noms-grid] Calling lockNominationsAndProceed');
      global.lockNominationsAndProceed();
    } else {
      console.error('[noms-grid] lockNominationsAndProceed not found on global');
    }
  }

  /**
   * Close the full-screen selector
   */
  function closeSelector(){
    if(!state.active) return;
    
    console.log('[noms-grid] Closing selector');
    
    state.active = false;
    
    // Remove escape handler
    if(state.escapeHandler){
      document.removeEventListener('keydown', state.escapeHandler, { capture: true });
      state.escapeHandler = null;
    }
    
    // Clear click handlers
    state.clickHandlers.clear();
    
    // Remove overlay
    if(state.overlay){
      state.overlay.remove();
      state.overlay = null;
    }
    
    // Clear state
    state.selectedIds.clear();
    state.eligibleIds = [];
    state.requiredCount = 0;
    
    console.log('[noms-grid] ✓ Selector closed');
  }

  // ========== Integration with nominations.js ==========
  
  /**
   * Intercept renderNomsPanel for human HOH
   */
  function interceptRenderNomsPanel(){
    // Store original renderNomsPanel if it exists
    const originalRenderNomsPanel = global.renderNomsPanel;
    
    // Override with our interceptor
    global.renderNomsPanel = function(){
      const g = global.game;
      
      // Check if already locked/committed
      if(g.nomsLocked || g.__nomsCommitInProgress || g.__nomsCommitted){
        // Let original handle this (or show simple message)
        if(originalRenderNomsPanel){
          return originalRenderNomsPanel.call(this);
        }
        return;
      }
      
      const hoh = global.getP(g.hohId);
      const need = requiredSlots();
      
      // If human HOH, try our UI
      if(hoh && hoh.human){
        console.log('[noms-grid] Intercepting for human HOH');
        
        try {
          const success = showIntroCard(hoh, need);
          
          if(success){
            console.log('[noms-grid] ✓ Intro card mounted, suppressing legacy panel');
            return; // Success - don't call original
          } else {
            console.warn('[noms-grid] ⚠ Failed to mount intro card, falling back');
          }
        } catch(err){
          console.error('[noms-grid] Error mounting intro card:', err);
        }
      }
      
      // Fallback: call original renderNomsPanel
      if(originalRenderNomsPanel){
        console.log('[noms-grid] Calling original renderNomsPanel');
        return originalRenderNomsPanel.call(this);
      } else {
        console.warn('[noms-grid] No original renderNomsPanel to fall back to');
      }
    };
    
    console.log('[noms-grid] ✓ renderNomsPanel intercepted');
  }

  // ========== Initialization ==========
  
  function init(){
    console.log('[noms-grid] Initializing full-screen nomination grid selector');
    
    // Wait for DOM ready
    if(document.readyState === 'loading'){
      document.addEventListener('DOMContentLoaded', init);
      return;
    }
    
    // Intercept renderNomsPanel
    interceptRenderNomsPanel();
    
    console.log('[noms-grid] ✓ Initialization complete');
  }

  // Auto-initialize
  init();

})(window);
