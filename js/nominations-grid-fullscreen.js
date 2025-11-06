// MODULE: nominations-grid-fullscreen.js
// Full-screen nomination ceremony UX for human HOH
// Intercepts renderNomsPanel to show intro card → full-screen selector → summary ceremony
// Falls back to legacy UI if mounting fails at any step

(function(global) {
  'use strict';

  const LOG_PREFIX = '[noms-fs]';

  // Store original renderNomsPanel for fallback
  let originalRenderNomsPanel = null;

  // State for the full-screen selector
  const selectorState = {
    active: false,
    selectedIds: [],
    required: 0,
    escapeHandler: null,
    keyboardHandler: null,
    overlay: null
  };

  // ========== Helper Functions ==========

  /**
   * Get required nomination slots based on twist mode
   */
  function getRequiredSlots() {
    const g = global.game;
    if (!g) return 2;
    
    // Check __twistNomSlots first (explicit override)
    if (g.__twistNomSlots && typeof g.__twistNomSlots === 'number') {
      return Math.max(2, Math.min(4, g.__twistNomSlots));
    }
    
    // Check __twistMode for double/triple
    if (g.__twistMode === 'double') return 3;
    if (g.__twistMode === 'triple') return 4;
    
    // Default to 2
    return 2;
  }

  /**
   * Get eligible player IDs for nomination
   * Excludes HOH, evicted players, and jury members
   */
  function getEligiblePlayerIds() {
    const g = global.game;
    if (!g) return [];
    
    const hohId = g.hohId;
    
    // Use alivePlayers if available, otherwise fallback
    let alive = [];
    if (typeof global.alivePlayers === 'function') {
      alive = global.alivePlayers();
    } else if (Array.isArray(g.players)) {
      alive = g.players.filter(p => p && !p.evicted && !p.jury);
    } else {
      console.warn(LOG_PREFIX, 'Unable to determine alive players');
      return [];
    }
    
    // Filter out HOH and ensure we have valid IDs
    return alive
      .filter(p => p && p.id !== hohId)
      .map(p => p.id)
      .filter(id => id !== null && id !== undefined);
  }

  /**
   * Ensure TV overlay exists and is ready
   */
  function ensureTVOverlay() {
    console.log(LOG_PREFIX, 'Ensuring TV overlay exists');
    
    // Try to use global scaffold function if available
    if (global.ensureTVOverlayScaffold && typeof global.ensureTVOverlayScaffold === 'function') {
      console.log(LOG_PREFIX, 'Using global.ensureTVOverlayScaffold()');
      const content = global.ensureTVOverlayScaffold();
      if (content) {
        console.log(LOG_PREFIX, '✓ Scaffold created successfully');
        return content.parentElement || content;
      }
    }
    
    // Fallback: ensure #tvOverlay exists
    let tvOverlay = document.getElementById('tvOverlay');
    if (!tvOverlay) {
      console.log(LOG_PREFIX, 'Creating minimal #tvOverlay');
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';
      tvOverlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 999;
        pointer-events: auto;
      `;
      
      const tv = document.getElementById('tv');
      if (tv) {
        tv.appendChild(tvOverlay);
      } else {
        document.body.appendChild(tvOverlay);
      }
      console.log(LOG_PREFIX, '✓ Minimal #tvOverlay created');
    }
    
    return tvOverlay;
  }

  // ========== CSS Injection ==========

  /**
   * Inject CSS for full-screen selector
   * Ensures correct centering, overlay layout, and accessibility
   */
  function injectFullscreenSelectorStyles() {
    if (document.getElementById('bb-noms-fullscreen-styles')) {
      return; // Already injected
    }
    
    console.log(LOG_PREFIX, 'Injecting fullscreen selector styles');
    
    const style = document.createElement('style');
    style.id = 'bb-noms-fullscreen-styles';
    style.textContent = `
      /* Full-screen overlay for nomination selector */
      .noms-fs-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.95);
        z-index: 10000;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        overflow-y: auto;
      }
      
      /* Header with count */
      .noms-fs-header {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        background: var(--card, #1e293b);
        border: 2px solid var(--sep, #475569);
        border-radius: 12px;
        padding: 12px 24px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
      
      .noms-fs-count {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--fg, #f1f5f9);
        text-align: center;
      }
      
      /* Grid of houseguest tiles */
      .noms-fs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
        gap: 16px;
        max-width: 900px;
        width: 100%;
        margin: 80px auto 100px;
      }
      
      @media (max-width: 768px) {
        .noms-fs-grid {
          grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
          gap: 12px;
          margin: 80px auto 120px;
        }
      }
      
      /* Houseguest tile */
      .noms-fs-tile {
        background: var(--card, #1e293b);
        border: 2px solid var(--sep, #475569);
        border-radius: 12px;
        padding: 16px 12px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
        position: relative;
      }
      
      .noms-fs-tile:hover {
        transform: translateY(-4px);
        border-color: var(--ok, #4ade80);
      }
      
      .noms-fs-tile:focus {
        outline: 3px solid var(--ok, #4ade80);
        outline-offset: 2px;
      }
      
      .noms-fs-tile.selected {
        border-color: var(--ok, #4ade80);
        border-width: 3px;
        box-shadow: 0 0 20px rgba(74, 222, 128, 0.4);
        background: rgba(74, 222, 128, 0.1);
      }
      
      .noms-fs-tile-avatar {
        width: 80px;
        height: 80px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--sep, #475569);
      }
      
      @media (max-width: 768px) {
        .noms-fs-tile-avatar {
          width: 64px;
          height: 64px;
        }
      }
      
      .noms-fs-tile-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--fg, #f1f5f9);
        text-align: center;
        word-break: break-word;
      }
      
      /* Selected indicator */
      .noms-fs-tile.selected::after {
        content: '✓';
        position: absolute;
        top: 8px;
        right: 8px;
        width: 28px;
        height: 28px;
        background: var(--ok, #4ade80);
        color: #000;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1.1rem;
      }
      
      /* Confirm button */
      .noms-fs-confirm {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 10001;
        padding: 16px 48px;
        background: var(--ok, #4ade80);
        color: #000;
        border: none;
        border-radius: 12px;
        font-size: 1.1rem;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
        transition: transform 0.2s ease, opacity 0.2s ease;
      }
      
      .noms-fs-confirm:hover:not(:disabled) {
        transform: translateX(-50%) scale(1.05);
      }
      
      .noms-fs-confirm:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .noms-fs-confirm:focus {
        outline: 3px solid var(--ok, #4ade80);
        outline-offset: 3px;
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .noms-fs-tile {
          transition: none;
        }
        .noms-fs-tile:hover {
          transform: none;
        }
        .noms-fs-confirm:hover:not(:disabled) {
          transform: translateX(-50%);
        }
      }
      
      /* High contrast focus for accessibility */
      @media (prefers-contrast: high) {
        .noms-fs-tile:focus {
          outline-width: 4px;
        }
        .noms-fs-tile.selected {
          border-width: 4px;
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log(LOG_PREFIX, '✓ Styles injected');
  }

  // ========== Intro Card ==========

  /**
   * Show intro "Nomination Ceremony" card in TV overlay
   * @returns {Promise<boolean>} Resolves true if user clicked NOMINATE, false on failure
   */
  function showIntroCard() {
    return new Promise((resolve) => {
      console.log(LOG_PREFIX, 'Showing intro card');
      
      try {
        const g = global.game;
        const hoh = global.getP ? global.getP(g.hohId) : null;
        const required = getRequiredSlots();
        
        if (!hoh) {
          console.warn(LOG_PREFIX, 'HOH not found for intro card');
          resolve(false);
          return;
        }
        
        const tvOverlay = ensureTVOverlay();
        if (!tvOverlay) {
          console.warn(LOG_PREFIX, 'Failed to get TV overlay');
          resolve(false);
          return;
        }
        
        // Clear existing content
        tvOverlay.innerHTML = '';
        
        // Create centered card
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard';
        card.style.cssText = `
          max-width: 90%;
          max-height: 80%;
          margin: auto;
          padding: 24px;
          text-align: center;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
        `;
        
        // Title
        const title = document.createElement('h3');
        title.textContent = 'Nomination Ceremony';
        title.style.cssText = 'margin: 0 0 8px 0; font-size: 1.3rem;';
        card.appendChild(title);
        
        // Body text
        const body = document.createElement('div');
        body.className = 'big';
        body.style.cssText = 'font-size: 1rem; line-height: 1.6; margin-bottom: 8px;';
        
        const countText = required === 2 
          ? 'two houseguests' 
          : required === 3 
            ? 'three houseguests' 
            : 'four houseguests';
        
        body.textContent = `${hoh.name}, as Head of Household, you must nominate ${countText} for eviction.`;
        card.appendChild(body);
        
        // NOMINATE button
        const nominateBtn = document.createElement('button');
        nominateBtn.className = 'btn primary';
        nominateBtn.textContent = 'NOMINATE';
        nominateBtn.style.cssText = `
          padding: 14px 40px;
          font-size: 1.1rem;
          font-weight: 700;
          margin-top: 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          background: var(--ok, #4ade80);
          color: #000;
        `;
        
        nominateBtn.addEventListener('click', () => {
          console.log(LOG_PREFIX, 'NOMINATE button clicked');
          // Clear card and proceed
          tvOverlay.innerHTML = '';
          document.getElementById('tv')?.classList.remove('tvTall');
          resolve(true);
        });
        
        card.appendChild(nominateBtn);
        tvOverlay.appendChild(card);
        
        // Show TV tall
        const tv = document.getElementById('tv');
        if (tv) tv.classList.add('tvTall');
        
        console.log(LOG_PREFIX, '✓ Intro card mounted successfully');
        
      } catch (err) {
        console.error(LOG_PREFIX, 'Error mounting intro card:', err);
        resolve(false);
      }
    });
  }

  // ========== Full-Screen Selector ==========

  /**
   * Show full-screen grid selector for nominations
   * @returns {Promise<Array<number>|null>} Resolves with selected IDs or null on failure
   */
  function showFullscreenSelector() {
    return new Promise((resolve) => {
      console.log(LOG_PREFIX, 'Opening fullscreen selector');
      
      try {
        injectFullscreenSelectorStyles();
        
        const eligible = getEligiblePlayerIds();
        const required = getRequiredSlots();
        
        console.log(LOG_PREFIX, 'Eligible players:', eligible.length, 'Required:', required);
        
        if (eligible.length === 0) {
          console.warn(LOG_PREFIX, 'No eligible players found');
          resolve(null);
          return;
        }
        
        // Reset state
        selectorState.active = true;
        selectorState.selectedIds = [];
        selectorState.required = required;
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'noms-fs-overlay';
        selectorState.overlay = overlay;
        
        // Create header with count
        const header = document.createElement('div');
        header.className = 'noms-fs-header';
        
        const countDisplay = document.createElement('div');
        countDisplay.className = 'noms-fs-count';
        countDisplay.setAttribute('aria-live', 'polite');
        countDisplay.setAttribute('aria-atomic', 'true');
        countDisplay.textContent = `0 / ${required} selected`;
        header.appendChild(countDisplay);
        
        overlay.appendChild(header);
        
        // Create grid
        const grid = document.createElement('div');
        grid.className = 'noms-fs-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Nomination candidates');
        
        // Create tiles for eligible players
        const tiles = [];
        eligible.forEach((playerId) => {
          const player = global.getP ? global.getP(playerId) : null;
          if (!player) return;
          
          const tile = document.createElement('div');
          tile.className = 'noms-fs-tile';
          tile.setAttribute('data-player-id', playerId);
          tile.setAttribute('tabindex', '0');
          tile.setAttribute('role', 'button');
          tile.setAttribute('aria-pressed', 'false');
          tile.setAttribute('aria-label', `Nominate ${player.name}`);
          
          // Avatar
          const avatar = document.createElement('img');
          avatar.className = 'noms-fs-tile-avatar';
          avatar.alt = player.name;
          
          // Resolve avatar URL
          const resolveAvatar = (global.Game || global).resolveAvatar;
          const getDicebearUrl = global.getDicebearUrl || function(seed) {
            return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
          };
          avatar.src = resolveAvatar?.(player || playerId) || player.avatar || player.img || player.photo || getDicebearUrl(player.name || String(playerId));
          
          tile.appendChild(avatar);
          
          // Name
          const name = document.createElement('div');
          name.className = 'noms-fs-tile-name';
          name.textContent = player.name;
          tile.appendChild(name);
          
          // Click handler
          const toggleSelection = () => {
            const idx = selectorState.selectedIds.indexOf(playerId);
            
            if (idx >= 0) {
              // Deselect
              selectorState.selectedIds.splice(idx, 1);
              tile.classList.remove('selected');
              tile.setAttribute('aria-pressed', 'false');
              console.log(LOG_PREFIX, 'Deselected:', player.name, '- now', selectorState.selectedIds.length, '/', required);
            } else {
              // Select
              selectorState.selectedIds.push(playerId);
              tile.classList.add('selected');
              tile.setAttribute('aria-pressed', 'true');
              console.log(LOG_PREFIX, 'Selected:', player.name, '- now', selectorState.selectedIds.length, '/', required);
            }
            
            // Update count display
            countDisplay.textContent = `${selectorState.selectedIds.length} / ${required} selected`;
            
            // Update confirm button state
            const confirmBtn = overlay.querySelector('.noms-fs-confirm');
            if (confirmBtn) {
              confirmBtn.disabled = selectorState.selectedIds.length !== required;
            }
          };
          
          tile.addEventListener('click', toggleSelection);
          
          // Keyboard support for individual tiles
          tile.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSelection();
            }
          });
          
          grid.appendChild(tile);
          tiles.push(tile);
        });
        
        overlay.appendChild(grid);
        
        // Create confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'noms-fs-confirm';
        confirmBtn.textContent = 'CONFIRM NOMINATIONS';
        confirmBtn.disabled = true;
        
        const handleConfirm = () => {
          if (selectorState.selectedIds.length === required) {
            console.log(LOG_PREFIX, 'Confirming selections:', selectorState.selectedIds);
            const selections = selectorState.selectedIds.slice();
            closeFullscreenSelector();
            resolve(selections);
          }
        };
        
        confirmBtn.addEventListener('click', handleConfirm);
        
        // Keyboard support for confirm button
        confirmBtn.addEventListener('keydown', (e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !confirmBtn.disabled) {
            e.preventDefault();
            handleConfirm();
          }
        });
        
        overlay.appendChild(confirmBtn);
        
        // Block Escape and Backspace
        selectorState.escapeHandler = (e) => {
          if (e.key === 'Escape' || e.key === 'Backspace') {
            e.preventDefault();
            e.stopPropagation();
            console.log(LOG_PREFIX, 'Escape/Backspace blocked - must complete selection');
            return false;
          }
        };
        document.addEventListener('keydown', selectorState.escapeHandler, true);
        
        // Arrow key navigation between tiles
        selectorState.keyboardHandler = (e) => {
          if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
            return;
          }
          
          const currentFocus = document.activeElement;
          if (!currentFocus || !currentFocus.classList.contains('noms-fs-tile')) {
            return;
          }
          
          e.preventDefault();
          
          const currentIndex = tiles.indexOf(currentFocus);
          if (currentIndex === -1) return;
          
          let nextIndex = currentIndex;
          
          if (e.key === 'ArrowRight') {
            nextIndex = (currentIndex + 1) % tiles.length;
          } else if (e.key === 'ArrowLeft') {
            nextIndex = (currentIndex - 1 + tiles.length) % tiles.length;
          } else if (e.key === 'ArrowDown') {
            // Move down by approximate row size (assume 5 columns on desktop, 3 on mobile)
            const cols = window.innerWidth <= 768 ? 3 : 5;
            nextIndex = (currentIndex + cols) % tiles.length;
          } else if (e.key === 'ArrowUp') {
            const cols = window.innerWidth <= 768 ? 3 : 5;
            nextIndex = (currentIndex - cols + tiles.length) % tiles.length;
          }
          
          tiles[nextIndex].focus();
        };
        document.addEventListener('keydown', selectorState.keyboardHandler);
        
        // Add to DOM
        document.body.appendChild(overlay);
        
        // Focus first tile
        if (tiles.length > 0) {
          setTimeout(() => tiles[0].focus(), 100);
        }
        
        console.log(LOG_PREFIX, '✓ Fullscreen selector opened');
        
      } catch (err) {
        console.error(LOG_PREFIX, 'Error opening fullscreen selector:', err);
        closeFullscreenSelector();
        resolve(null);
      }
    });
  }

  /**
   * Close and cleanup fullscreen selector
   */
  function closeFullscreenSelector() {
    console.log(LOG_PREFIX, 'Closing fullscreen selector');
    
    // Remove overlay
    if (selectorState.overlay && selectorState.overlay.parentElement) {
      selectorState.overlay.remove();
    }
    
    // Remove event handlers
    if (selectorState.escapeHandler) {
      document.removeEventListener('keydown', selectorState.escapeHandler, true);
      selectorState.escapeHandler = null;
    }
    
    if (selectorState.keyboardHandler) {
      document.removeEventListener('keydown', selectorState.keyboardHandler);
      selectorState.keyboardHandler = null;
    }
    
    // Reset state
    selectorState.active = false;
    selectorState.selectedIds = [];
    selectorState.required = 0;
    selectorState.overlay = null;
    
    console.log(LOG_PREFIX, '✓ Selector closed');
  }

  // ========== Ceremony Sequence ==========

  /**
   * Show summary card with all nominees
   */
  function showSummaryCard(nomineeIds) {
    return new Promise((resolve) => {
      console.log(LOG_PREFIX, 'Showing summary card');
      
      try {
        const tvOverlay = ensureTVOverlay();
        if (!tvOverlay) {
          console.warn(LOG_PREFIX, 'No TV overlay for summary');
          resolve();
          return;
        }
        
        tvOverlay.innerHTML = '';
        
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard';
        card.style.cssText = `
          max-width: 90%;
          max-height: 80%;
          margin: auto;
          padding: 24px;
          text-align: center;
          animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Nominations';
        title.style.cssText = 'margin: 0 0 16px 0; font-size: 1.3rem;';
        card.appendChild(title);
        
        const nomineesList = document.createElement('div');
        nomineesList.className = 'big';
        nomineesList.style.cssText = 'font-size: 1.1rem; font-weight: 600; line-height: 1.6;';
        
        // Join names with bullet separator
        const names = nomineeIds.map(id => {
          const p = global.getP ? global.getP(id) : null;
          return p ? p.name : String(id);
        }).join(' • ');
        
        nomineesList.textContent = names;
        card.appendChild(nomineesList);
        
        tvOverlay.appendChild(card);
        
        const tv = document.getElementById('tv');
        if (tv) tv.classList.add('tvTall');
        
        console.log(LOG_PREFIX, '✓ Summary card shown');
        
        setTimeout(() => {
          resolve();
        }, 2200);
        
      } catch (err) {
        console.error(LOG_PREFIX, 'Error showing summary card:', err);
        resolve();
      }
    });
  }

  /**
   * Show adjourn card
   */
  function showAdjournCard() {
    return new Promise((resolve) => {
      console.log(LOG_PREFIX, 'Showing adjourn card');
      
      try {
        const tvOverlay = ensureTVOverlay();
        if (!tvOverlay) {
          console.warn(LOG_PREFIX, 'No TV overlay for adjourn');
          resolve();
          return;
        }
        
        tvOverlay.innerHTML = '';
        
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard';
        card.style.cssText = `
          max-width: 90%;
          max-height: 80%;
          margin: auto;
          padding: 24px;
          text-align: center;
          animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
        `;
        
        const title = document.createElement('h3');
        title.textContent = 'Nomination Ceremony';
        title.style.cssText = 'margin: 0 0 12px 0; font-size: 1.2rem;';
        card.appendChild(title);
        
        const message = document.createElement('div');
        message.className = 'big';
        message.textContent = 'This ceremony is adjourned.';
        message.style.cssText = 'font-size: 1rem;';
        card.appendChild(message);
        
        tvOverlay.appendChild(card);
        
        const tv = document.getElementById('tv');
        if (tv) tv.classList.add('tvTall');
        
        console.log(LOG_PREFIX, '✓ Adjourn card shown');
        
        setTimeout(() => {
          tvOverlay.innerHTML = '';
          if (tv) tv.classList.remove('tvTall');
          console.log(LOG_PREFIX, '✓ Ceremony complete');
          resolve();
        }, 2000);
        
      } catch (err) {
        console.error(LOG_PREFIX, 'Error showing adjourn card:', err);
        resolve();
      }
    });
  }

  // ========== Main Interceptor Logic ==========

  /**
   * Interceptor for renderNomsPanel
   * Only activates for human HOH with unlocked nominations
   * Falls back to original on any failure
   */
  async function interceptedRenderNomsPanel() {
    console.log(LOG_PREFIX, 'Interceptor called');
    
    const g = global.game;
    if (!g) {
      console.warn(LOG_PREFIX, 'No game object, calling original');
      if (originalRenderNomsPanel) originalRenderNomsPanel();
      return;
    }
    
    // Check if nominations are already locked/committed
    if (g.nomsLocked || g.__nomsCommitInProgress || g.__nomsCommitted) {
      console.log(LOG_PREFIX, 'Nominations already locked/committed, calling original');
      if (originalRenderNomsPanel) originalRenderNomsPanel();
      return;
    }
    
    // Check if human is HOH
    const hoh = global.getP ? global.getP(g.hohId) : null;
    if (!hoh || !hoh.human) {
      console.log(LOG_PREFIX, 'Not human HOH, calling original');
      if (originalRenderNomsPanel) originalRenderNomsPanel();
      return;
    }
    
    console.log(LOG_PREFIX, 'Human HOH detected, attempting fullscreen flow');
    
    // Step 1: Show intro card
    const introSuccess = await showIntroCard();
    if (!introSuccess) {
      console.warn(LOG_PREFIX, 'Intro card failed, falling back to original');
      if (originalRenderNomsPanel) originalRenderNomsPanel();
      return;
    }
    
    console.log(LOG_PREFIX, '✓ Intro card succeeded');
    
    // Step 2: Show fullscreen selector
    const selections = await showFullscreenSelector();
    if (!selections || !Array.isArray(selections) || selections.length === 0) {
      console.warn(LOG_PREFIX, 'Selector failed or cancelled, falling back to original');
      if (originalRenderNomsPanel) originalRenderNomsPanel();
      return;
    }
    
    console.log(LOG_PREFIX, '✓ Selections made:', selections);
    
    // Step 3: Commit nominations
    try {
      g._pendingNoms = selections.slice();
      console.log(LOG_PREFIX, 'Set _pendingNoms:', g._pendingNoms);
      
      // Prefer finalizeNoms if available
      if (global.finalizeNoms && typeof global.finalizeNoms === 'function') {
        console.log(LOG_PREFIX, 'Calling finalizeNoms()');
        
        // Set flag to prevent ceremony duplication
        g.__nomsFromFullscreenSelector = true;
        
        global.finalizeNoms();
      } else if (global.lockNominationsAndProceed && typeof global.lockNominationsAndProceed === 'function') {
        console.log(LOG_PREFIX, 'Calling lockNominationsAndProceed()');
        
        g.__nomsFromFullscreenSelector = true;
        
        global.lockNominationsAndProceed();
      } else {
        // Manual commit (fallback)
        console.log(LOG_PREFIX, 'Performing manual commit');
        
        g.nominees = selections.slice();
        g.nomsLocked = true;
        g.__nomsCommitted = true;
        
        // Apply side effects
        if (global.applyNominationSideEffects && typeof global.applyNominationSideEffects === 'function') {
          global.applyNominationSideEffects();
        }
        
        // Sync badges
        if (global.syncPlayerBadgeStates && typeof global.syncPlayerBadgeStates === 'function') {
          global.syncPlayerBadgeStates();
        }
        
        // Update HUD
        if (global.updateHud && typeof global.updateHud === 'function') {
          global.updateHud();
        }
        
        // Show ceremony sequence
        await showSummaryCard(selections);
        
        // Show reactions if available
        if (global.showNomineeReactionsSimultaneously && typeof global.showNomineeReactionsSimultaneously === 'function') {
          await global.showNomineeReactionsSimultaneously(selections);
        }
        
        await showAdjournCard();
        
        // Proceed to next phase
        if (global.startVetoComp && typeof global.startVetoComp === 'function') {
          setTimeout(() => global.startVetoComp(), 600);
        }
      }
      
      console.log(LOG_PREFIX, '✓ Nominations committed successfully');
      
    } catch (err) {
      console.error(LOG_PREFIX, 'Error committing nominations:', err);
      // Even on commit error, don't fall back - nominations may be partially committed
      // Just log and continue
    }
  }

  // ========== Initialization ==========

  /**
   * Install the interceptor
   * Wraps global.renderNomsPanel with our custom flow
   */
  function installInterceptor() {
    console.log(LOG_PREFIX, 'Installing interceptor');
    
    // Store original renderNomsPanel
    if (global.renderNomsPanel && typeof global.renderNomsPanel === 'function') {
      originalRenderNomsPanel = global.renderNomsPanel;
      console.log(LOG_PREFIX, 'Original renderNomsPanel stored');
    } else {
      console.warn(LOG_PREFIX, 'No renderNomsPanel found to intercept');
      return;
    }
    
    // Replace with intercepted version
    global.renderNomsPanel = interceptedRenderNomsPanel;
    console.log(LOG_PREFIX, '✓ Interceptor installed');
  }

  // Auto-install when this module loads
  // Wait for DOM ready to ensure other modules are loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(installInterceptor, 100);
    });
  } else {
    // DOM already loaded
    setTimeout(installInterceptor, 100);
  }

  // Expose for debugging
  global.NomsFullscreenInterceptor = {
    install: installInterceptor,
    showIntroCard,
    showFullscreenSelector,
    getRequiredSlots,
    getEligiblePlayerIds
  };

})(window);
