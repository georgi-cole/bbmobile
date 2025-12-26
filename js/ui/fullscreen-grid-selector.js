// MODULE: fullscreen-grid-selector.js
// Unified fullscreen grid selector for both nominations and live voting
// Provides consistent UX for player/nominee selection across different ceremonies

(function(global) {
  'use strict';

  const LOG_PREFIX = '[grid-selector]';

  // ========== Helper Functions ==========

  /**
   * Mobile detection helper
   */
  function isMobile() {
    const hasCoarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const isNarrowViewport = window.innerWidth < 820;
    return hasCoarsePointer || isNarrowViewport;
  }

  /**
   * Get avatar helper (fallback to global if available)
   */
  function getAvatarUrl(playerId) {
    if (global.resolveAvatar) {
      const player = global.getP?.(playerId);
      if (player) {
        return global.resolveAvatar(player) || getDicebearUrl(player.name);
      }
    }
    const player = global.getP?.(playerId);
    if (player?.avatar) return player.avatar;
    return getDicebearUrl(global.safeName?.(playerId) || 'player');
  }

  function getDicebearUrl(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  }

  /**
   * Ensure TV overlay exists and is ready
   */
  function ensureTVOverlay() {
    console.log(LOG_PREFIX, 'Ensuring TV overlay exists');
    
    const tv = document.getElementById('tv');
    if (!tv) {
      console.warn(LOG_PREFIX, '#tv element not found');
      return null;
    }
    
    // Ensure #tv has position: relative for absolute positioning of overlay
    if (getComputedStyle(tv).position === 'static') {
      tv.style.position = 'relative';
    }
    
    let tvOverlay = document.getElementById('tvOverlay');
    
    // If it exists but is not a child of #tv, move it
    if (tvOverlay && tvOverlay.parentElement !== tv) {
      tv.appendChild(tvOverlay);
    }
    
    // Create if missing
    if (!tvOverlay) {
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';
      tv.appendChild(tvOverlay);
    }
    
    return tvOverlay;
  }

  /**
   * Calculate grid sizing based on candidate count
   */
  function sizingFor(count) {
    if (count <= 6) {
      return { minCol: '160px', avatar: '84px' };
    } else if (count <= 9) {
      return { minCol: '140px', avatar: '72px' };
    } else if (count <= 12) {
      return { minCol: '120px', avatar: '64px' };
    } else if (count <= 18) {
      return { minCol: '110px', avatar: '60px' };
    } else {
      return { minCol: '100px', avatar: '56px' };
    }
  }

  /**
   * Classify relationship (ally/enemy/neutral) for visual indicator
   */
  function classifyRelation(actorId, targetId) {
    if (!actorId || !targetId || actorId === targetId) return 'neutral';
    
    const actor = global.getP?.(actorId);
    if (!actor || !actor.affinity) return 'neutral';
    
    const affinity = actor.affinity[targetId];
    if (affinity === undefined || affinity === null) return 'neutral';
    
    if (affinity >= 0.4) return 'ally';
    if (affinity <= -0.4) return 'enemy';
    return 'neutral';
  }

  // ========== CSS Injection ==========

  function injectStyles() {
    if (document.getElementById('bb-grid-selector-styles')) {
      return; // Already injected
    }
    
    console.log(LOG_PREFIX, 'Injecting styles');
    
    const style = document.createElement('style');
    style.id = 'bb-grid-selector-styles';
    style.textContent = `
      /* Fullscreen Grid Selector Styles */
      .grid-fs-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        background: rgba(0, 0, 0, 0.92);
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 20px;
      }
      
      .grid-fs-header {
        text-align: center;
        color: var(--fg, #f1f5f9);
        margin-bottom: 24px;
        flex-shrink: 0;
      }
      
      .grid-fs-title {
        font-size: 1.6rem;
        font-weight: 700;
        margin: 0 0 12px 0;
        color: var(--accent, #00e0cc);
      }
      
      .grid-fs-count {
        font-size: 1.2rem;
        font-weight: 600;
        margin: 8px 0;
        color: var(--fg, #f1f5f9);
      }
      
      .grid-fs-legend {
        display: flex;
        justify-content: center;
        gap: 20px;
        margin-top: 12px;
        font-size: 0.9rem;
      }
      
      .grid-fs-legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        color: var(--muted, #94a3b8);
      }
      
      .grid-fs-legend-chip {
        width: 12px;
        height: 12px;
        border-radius: 50%;
      }
      
      .grid-fs-legend-item.ally .grid-fs-legend-chip {
        background: var(--ok, #4ade80);
      }
      
      .grid-fs-legend-item.enemy .grid-fs-legend-chip {
        background: var(--warn, #f87171);
      }
      
      .grid-fs-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(var(--grid-mincol, 140px), 1fr));
        gap: 16px;
        margin: 0 auto;
        max-width: 1400px;
        width: 100%;
        padding: 0 10px;
      }
      
      .grid-fs-tile {
        position: relative;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 10px;
        padding: 16px 12px;
        background: var(--card, #1e293b);
        border: 2px solid var(--sep, #475569);
        border-radius: 12px;
        cursor: pointer;
        transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
      }
      
      .grid-fs-tile:hover {
        transform: translateY(-4px);
        border-color: var(--accent, #00e0cc);
        box-shadow: 0 4px 12px rgba(0, 224, 204, 0.3);
      }
      
      .grid-fs-tile:focus {
        outline: 3px solid var(--accent, #00e0cc);
        outline-offset: 3px;
      }
      
      .grid-fs-tile.selected {
        border-color: var(--ok, #4ade80);
        background: rgba(74, 222, 128, 0.1);
        box-shadow: 0 0 12px rgba(74, 222, 128, 0.4);
      }
      
      .grid-fs-tile.gfs-ally .grid-fs-tile-avatar {
        border: 3px solid rgba(74, 222, 128, 0.5);
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.3);
      }
      
      .grid-fs-tile.gfs-enemy .grid-fs-tile-avatar {
        border: 3px solid rgba(248, 113, 113, 0.5);
        box-shadow: 0 0 8px rgba(248, 113, 113, 0.3);
      }
      
      .grid-fs-tile-avatar {
        width: var(--grid-avatar, 80px);
        height: var(--grid-avatar, 80px);
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid var(--sep, #475569);
        transition: border 0.2s ease;
      }
      
      .grid-fs-tile-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--fg, #f1f5f9);
        text-align: center;
        word-break: break-word;
      }
      
      /* Selected indicator */
      .grid-fs-tile.selected::after {
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
      .grid-fs-confirm {
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
      
      .grid-fs-confirm:hover:not(:disabled) {
        transform: translateX(-50%) scale(1.05);
      }
      
      .grid-fs-confirm:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      .grid-fs-confirm:focus {
        outline: 3px solid var(--ok, #4ade80);
        outline-offset: 3px;
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        .grid-fs-tile {
          transition: none;
        }
        .grid-fs-tile:hover {
          transform: none;
        }
        .grid-fs-confirm:hover:not(:disabled) {
          transform: translateX(-50%);
        }
      }
    `;
    
    document.head.appendChild(style);
    console.log(LOG_PREFIX, '✓ Styles injected');
  }

  // ========== Main Selector Function ==========

  /**
   * Show fullscreen grid selector
   * @param {Object} options - Configuration options
   * @param {Array<number>} options.candidates - Array of player IDs to show
   * @param {number} options.required - Number of selections required (1 for voting, 2+ for noms)
   * @param {string} options.title - Header title text
   * @param {string} options.confirmText - Confirm button text
   * @param {number} options.actorId - ID of the person making the selection (for ally/enemy indicators)
   * @param {boolean} options.showRelations - Whether to show ally/enemy indicators
   * @param {Function} options.onConfirm - Callback when selection is confirmed
   * @param {Function} options.onCancel - Callback when selection is cancelled
   * @returns {Promise<Array<number>|null>} Selected player IDs or null if cancelled
   */
  function show(options = {}) {
    return new Promise((resolve) => {
      console.log(LOG_PREFIX, 'Opening fullscreen selector', options);
      
      try {
        injectStyles();
        
        const {
          candidates = [],
          required = 1,
          title = 'Make Your Selection',
          confirmText = 'Confirm',
          actorId = null,
          showRelations = false,
          onConfirm = null,
          onCancel = null
        } = options;
        
        if (!Array.isArray(candidates) || candidates.length === 0) {
          console.warn(LOG_PREFIX, 'No candidates provided');
          resolve(null);
          return;
        }
        
        console.log(LOG_PREFIX, 'Candidates:', candidates.length, 'Required:', required);
        
        // Calculate dynamic sizing
        const sizing = sizingFor(candidates.length);
        console.log(LOG_PREFIX, `Dynamic sizing for ${candidates.length} candidates:`, sizing);
        
        // State
        const state = {
          selectedIds: [],
          required: required,
          overlay: null,
          escapeHandler: null,
          keyboardHandler: null
        };
        
        // Get TV overlay container
        const tvOverlay = ensureTVOverlay();
        if (!tvOverlay) {
          console.warn(LOG_PREFIX, 'Failed to get TV overlay');
          resolve(null);
          return;
        }
        
        // Clear existing content
        tvOverlay.innerHTML = '';
        
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'grid-fs-overlay';
        state.overlay = overlay;
        
        // Set CSS variables for dynamic sizing
        overlay.style.setProperty('--grid-mincol', sizing.minCol);
        overlay.style.setProperty('--grid-avatar', sizing.avatar);
        
        // Create header
        const header = document.createElement('div');
        header.className = 'grid-fs-header';
        
        const titleEl = document.createElement('div');
        titleEl.className = 'grid-fs-title';
        titleEl.textContent = title;
        header.appendChild(titleEl);
        
        const countDisplay = document.createElement('div');
        countDisplay.className = 'grid-fs-count';
        countDisplay.setAttribute('aria-live', 'polite');
        countDisplay.setAttribute('aria-atomic', 'true');
        countDisplay.textContent = required === 1 
          ? 'Select one nominee'
          : `0 / ${required} selected`;
        header.appendChild(countDisplay);
        
        // Optional legend for ally/enemy indicators
        if (showRelations && actorId) {
          const legend = document.createElement('div');
          legend.className = 'grid-fs-legend';
          
          const allyItem = document.createElement('div');
          allyItem.className = 'grid-fs-legend-item ally';
          allyItem.innerHTML = '<div class="grid-fs-legend-chip"></div><span>Ally</span>';
          legend.appendChild(allyItem);
          
          const enemyItem = document.createElement('div');
          enemyItem.className = 'grid-fs-legend-item enemy';
          enemyItem.innerHTML = '<div class="grid-fs-legend-chip"></div><span>Enemy</span>';
          legend.appendChild(enemyItem);
          
          header.appendChild(legend);
        }
        
        overlay.appendChild(header);
        
        // Create grid
        const grid = document.createElement('div');
        grid.className = 'grid-fs-grid';
        grid.setAttribute('role', 'group');
        grid.setAttribute('aria-label', 'Selection candidates');
        
        // Create tiles for candidates
        candidates.forEach((playerId) => {
          const player = global.getP ? global.getP(playerId) : null;
          if (!player) return;
          
          // Classify relationship if showing relations
          const relation = showRelations && actorId ? classifyRelation(actorId, playerId) : 'neutral';
          
          const tile = document.createElement('div');
          tile.className = 'grid-fs-tile';
          
          // Add relation class
          if (relation === 'ally') {
            tile.classList.add('gfs-ally');
          } else if (relation === 'enemy') {
            tile.classList.add('gfs-enemy');
          }
          
          tile.setAttribute('data-player-id', playerId);
          tile.setAttribute('tabindex', '0');
          tile.setAttribute('role', 'button');
          tile.setAttribute('aria-pressed', 'false');
          
          // Build aria-label
          let ariaLabel = `Select ${player.name}`;
          if (relation === 'ally') {
            ariaLabel += ' (ally)';
          } else if (relation === 'enemy') {
            ariaLabel += ' (enemy)';
          }
          tile.setAttribute('aria-label', ariaLabel);
          
          // Avatar
          const avatar = document.createElement('img');
          avatar.className = 'grid-fs-tile-avatar';
          avatar.alt = player.name;
          avatar.src = getAvatarUrl(playerId);
          avatar.loading = 'eager';
          avatar.onerror = () => {
            avatar.src = getDicebearUrl(player.name);
          };
          tile.appendChild(avatar);
          
          // Name
          const name = document.createElement('div');
          name.className = 'grid-fs-tile-name';
          name.textContent = player.name;
          tile.appendChild(name);
          
          // Click handler
          const toggleSelection = () => {
            const idx = state.selectedIds.indexOf(playerId);
            
            if (idx >= 0) {
              // Deselect
              state.selectedIds.splice(idx, 1);
              tile.classList.remove('selected');
              tile.setAttribute('aria-pressed', 'false');
              console.log(LOG_PREFIX, 'Deselected:', player.name);
            } else {
              // Selection rules based on required count
              if (required === 1) {
                // Single selection mode: deselect others first
                state.selectedIds.forEach(id => {
                  const otherTile = grid.querySelector(`[data-player-id="${id}"]`);
                  if (otherTile) {
                    otherTile.classList.remove('selected');
                    otherTile.setAttribute('aria-pressed', 'false');
                  }
                });
                state.selectedIds = [playerId];
                tile.classList.add('selected');
                tile.setAttribute('aria-pressed', 'true');
                console.log(LOG_PREFIX, 'Selected:', player.name, '(single mode)');
              } else {
                // Multi-selection mode: check limit
                if (state.selectedIds.length >= required) {
                  console.log(LOG_PREFIX, 'Cannot select', player.name, '- already at max', required);
                  return;
                }
                state.selectedIds.push(playerId);
                tile.classList.add('selected');
                tile.setAttribute('aria-pressed', 'true');
                console.log(LOG_PREFIX, 'Selected:', player.name);
              }
            }
            
            // Update count display
            if (required === 1) {
              countDisplay.textContent = state.selectedIds.length > 0 
                ? `Selected: ${global.safeName?.(state.selectedIds[0]) || 'Unknown'}`
                : 'Select one nominee';
            } else {
              countDisplay.textContent = `${state.selectedIds.length} / ${required} selected`;
            }
            
            // Update confirm button state
            const confirmBtn = overlay.querySelector('.grid-fs-confirm');
            if (confirmBtn) {
              confirmBtn.disabled = state.selectedIds.length !== required;
            }
          };
          
          tile.onclick = toggleSelection;
          
          // Keyboard support
          tile.onkeydown = (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleSelection();
            }
          };
          
          grid.appendChild(tile);
        });
        
        overlay.appendChild(grid);
        
        // Create confirm button
        const confirmBtn = document.createElement('button');
        confirmBtn.className = 'grid-fs-confirm';
        confirmBtn.textContent = confirmText;
        confirmBtn.disabled = true;
        confirmBtn.setAttribute('aria-label', confirmText);
        
        confirmBtn.onclick = () => {
          if (state.selectedIds.length === required) {
            console.log(LOG_PREFIX, 'Confirmed selections:', state.selectedIds);
            
            // Call onConfirm callback if provided
            if (typeof onConfirm === 'function') {
              try {
                onConfirm(state.selectedIds.slice());
              } catch (e) {
                console.warn(LOG_PREFIX, 'onConfirm callback failed', e);
              }
            }
            
            // Clean up and resolve
            cleanup();
            resolve(state.selectedIds.slice());
          }
        };
        
        overlay.appendChild(confirmBtn);
        
        // Cleanup function
        const cleanup = () => {
          if (state.overlay && state.overlay.parentElement) {
            state.overlay.remove();
          }
          if (state.escapeHandler) {
            document.removeEventListener('keydown', state.escapeHandler);
          }
          
          // Show TV tall
          const tv = document.getElementById('tv');
          if (tv) tv.classList.remove('tvTall');
        };
        
        // Escape key handler
        state.escapeHandler = (e) => {
          if (e.key === 'Escape') {
            console.log(LOG_PREFIX, 'Cancelled via Escape key');
            
            // Call onCancel callback if provided
            if (typeof onCancel === 'function') {
              try {
                onCancel();
              } catch (e) {
                console.warn(LOG_PREFIX, 'onCancel callback failed', e);
              }
            }
            
            cleanup();
            resolve(null);
          }
        };
        document.addEventListener('keydown', state.escapeHandler);
        
        // Mount to TV overlay
        tvOverlay.appendChild(overlay);
        
        // Show TV tall
        const tv = document.getElementById('tv');
        if (tv) tv.classList.add('tvTall');
        
        console.log(LOG_PREFIX, '✓ Selector shown');
        
      } catch (err) {
        console.error(LOG_PREFIX, 'Error showing selector:', err);
        resolve(null);
      }
    });
  }

  // Export API
  global.FullscreenGridSelector = {
    show: show,
    isOpen: () => !!document.querySelector('.grid-fs-overlay')
  };

})(window);
