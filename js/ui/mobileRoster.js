/**
 * mobileRoster.js
 * 
 * Mobile-optimized roster view for Big Brother game
 * Features:
 * - Dynamic grid layout that reflows as players are evicted
 * - Evicted players drawer/panel for historical reference
 * - Player spotlight in faux TV
 * - Event bus integration for player updates
 * - Responsive design with orientation support
 * - Full accessibility support
 */

(function(global) {
  'use strict';
  
  // ============================
  // Configuration & Constants
  // ============================
  
  const CONFIG = {
    MOBILE_BREAKPOINT: 768,        // Activate mobile roster below this width
    PORTRAIT_BREAKPOINT: 520,      // Portrait-specific adjustments
    MAX_COLS_PORTRAIT: 4,          // Maximum columns in portrait
    MAX_COLS_LANDSCAPE: 5,         // Maximum columns in landscape
    MIN_TILE_SIZE: 56,             // Minimum tap target (px)
    MAX_TILE_SIZE: 100,            // Maximum tile size (px)
    GAP_SIZE: 8,                   // Default gap between tiles (px)
    RESIZE_DEBOUNCE: 50,           // Debounce resize events (ms)
    SPOTLIGHT_DURATION: 3000,      // Auto-hide spotlight after this time (ms)
  };
  
  // ============================
  // State Management
  // ============================
  
  const state = {
    activePlayers: [],
    evictedPlayers: [],
    orientation: 'portrait',
    evictedPanelOpen: false,
    spotlightTimeout: null,
    initialized: false,
  };
  
  // ============================
  // Utility Functions
  // ============================
  
  /**
   * Debounce function execution
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
  
  /**
   * Detect if mobile viewport is active
   */
  function isMobileViewport() {
    return window.innerWidth <= CONFIG.MOBILE_BREAKPOINT;
  }
  
  /**
   * Detect orientation
   */
  function getOrientation() {
    const mql = window.matchMedia('(orientation: landscape)');
    return mql.matches ? 'landscape' : 'portrait';
  }
  
  /**
   * Get player avatar URL (with fallback to existing avatar system)
   */
  function getPlayerAvatar(player) {
    // Use centralized avatar resolver if available
    if (global.resolveAvatar) {
      return global.resolveAvatar(player);
    }
    
    // Fallback to player properties
    if (player.avatar) return player.avatar;
    if (player.avatarUrl) return player.avatarUrl;
    
    // Use dicebear as last resort
    if (global.getDicebearUrl) {
      return global.getDicebearUrl(player.name || player.id);
    }
    
    // Final fallback to dicebear
    const seed = player.name || player.id || 'player';
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed)}`;
  }

  /**
   * Detect iOS Safari for eager loading
   */
  function shouldUseEagerLoading() {
    return global.isIOSSafari && global.isIOSSafari();
  }
  
  /**
   * Shorten name for display
   */
  function shortenName(name, maxLength = 10) {
    if (!name) return 'Guest';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength - 1) + '…';
  }
  
  /**
   * Get player status labels for accessibility
   */
  function getPlayerStatusLabel(player, isEvicted = false) {
    const parts = [player.name || 'Guest'];
    
    if (isEvicted) {
      parts.push('Evicted');
      if (player.evictedAt) {
        // Check if evictedAt is a week number (< 100) or timestamp
        const weekOrTimestamp = player.evictedAt;
        if (weekOrTimestamp < 100) {
          parts.push(`Week ${weekOrTimestamp}`);
        }
      }
    } else {
      if (player.hoh) parts.push('Head of Household');
      if (player.nominated) parts.push('Nominated');
      if (player.pov) parts.push('Power of Veto');
    }
    
    return parts.join(', ');
  }
  
  // ============================
  // Layout Computation
  // ============================
  
  /**
   * Compute optimal grid layout based on player count and orientation
   * @param {number} count - Number of active players
   * @param {string} orientation - 'portrait' or 'landscape'
   * @returns {Object} Layout configuration {columns, rows}
   */
  function computeLayout(count, orientation = 'portrait') {
    if (count <= 0) return { columns: 0, rows: 0 };
    
    // Determine max columns based on orientation
    const maxCols = orientation === 'landscape' 
      ? CONFIG.MAX_COLS_LANDSCAPE 
      : CONFIG.MAX_COLS_PORTRAIT;
    
    // Base columns target using square root heuristic
    let cols = Math.min(maxCols, Math.ceil(Math.sqrt(count)));
    let rows = Math.ceil(count / cols);
    
    // Normalize: prefer more columns than rows when close
    // This prevents tall single-column layouts
    while (cols > 1 && (cols - 1) * rows >= count) {
      cols--;
      rows = Math.ceil(count / cols);
    }
    
    // If we end up with single row but too many columns, reduce columns to match count
    if (rows === 1 && cols > count) {
      cols = count;
    }
    
    return { columns: cols, rows };
  }
  
  /**
   * Calculate tile size based on container and column count
   */
  function calculateTileSize(containerWidth, columns) {
    const gap = CONFIG.GAP_SIZE;
    const totalGaps = (columns - 1) * gap;
    const availableWidth = containerWidth - totalGaps;
    const tileSize = Math.floor(availableWidth / columns);
    
    // Clamp to min/max
    return Math.max(CONFIG.MIN_TILE_SIZE, Math.min(CONFIG.MAX_TILE_SIZE, tileSize));
  }

  /**
   * Calculate optimal roster and TV sizes to fit viewport without vertical scroll
   * @returns {Object} { rosterHeight, tvHeight } in pixels
   */
  function calculateOptimalSizes() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Account for fixed elements (topbar, etc.)
    const topbarHeight = document.querySelector('.topbar')?.offsetHeight || 0;
    const toolbarHeight = document.querySelector('.toolbar')?.offsetHeight || 0;
    const fixedHeight = topbarHeight + toolbarHeight;
    
    // Available viewport height
    const availableHeight = vh - fixedHeight - 40; // 40px for padding/margins
    
    // Calculate roster grid dimensions
    const { columns, rows } = computeLayout(state.activePlayers.length, state.orientation);
    const container = document.querySelector('.mobile-roster-active-grid');
    const containerWidth = container?.offsetWidth || vw - 24; // 24px for padding
    
    const tileSize = calculateTileSize(containerWidth, columns);
    const nameHeight = 20; // Height of name label
    const gap = CONFIG.GAP_SIZE;
    
    // Calculate roster grid height
    const rosterGridHeight = (rows * (tileSize + nameHeight)) + ((rows - 1) * gap);
    
    // Add height for evicted section if present
    const evictedSectionHeight = state.evictedPlayers.length > 0 ? 60 : 0;
    
    // Total roster container height
    const totalRosterHeight = rosterGridHeight + evictedSectionHeight + 32; // 32px for container padding
    
    // Calculate remaining space for TV
    const remainingHeight = availableHeight - totalRosterHeight;
    
    // Minimum TV height
    const minTvHeight = 200;
    
    // If we don't fit, scale down roster
    if (remainingHeight < minTvHeight) {
      const targetRosterHeight = availableHeight - minTvHeight - 20; // 20px gap
      return {
        rosterHeight: Math.max(targetRosterHeight, 200),
        tvHeight: minTvHeight
      };
    }
    
    // Otherwise use calculated sizes
    return {
      rosterHeight: totalRosterHeight,
      tvHeight: remainingHeight - 20 // 20px gap
    };
  }

  /**
   * Apply dynamic sizing to roster and TV
   */
  function applyDynamicSizing() {
    if (!isMobileViewport() || !state.initialized) return;
    
    const { rosterHeight, tvHeight } = calculateOptimalSizes();
    
    // Apply to roster container
    const rosterContainer = document.querySelector('.mobile-roster-container');
    if (rosterContainer) {
      rosterContainer.style.maxHeight = `${rosterHeight}px`;
    }
    
    // Apply to TV
    const tv = document.querySelector('.tv');
    if (tv) {
      tv.style.minHeight = `${tvHeight}px`;
      tv.style.maxHeight = `${tvHeight}px`;
    }
    
    console.info(`[MobileRoster] Dynamic sizing: roster=${rosterHeight}px, tv=${tvHeight}px`);
  }
  
  // ============================
  // Rendering Functions
  // ============================
  
  /**
   * Create HTML for a roster tile
   */
  function createTileHTML(player, isEvicted = false) {
    const avatar = getPlayerAvatar(player);
    const name = shortenName(player.name || 'Guest');
    const statusLabel = getPlayerStatusLabel(player, isEvicted);
    const loadingStrategy = shouldUseEagerLoading() ? 'eager' : 'lazy';
    
    let badgeHTML = '';
    if (isEvicted) {
      badgeHTML = '<div class="mobile-roster-badge evict" aria-label="Evicted">EVCT</div>';
    } else {
      if (player.hoh) {
        badgeHTML = '<div class="mobile-roster-badge hoh" aria-label="Head of Household">🔑</div>';
      } else if (player.pov) {
        badgeHTML = '<div class="mobile-roster-badge pov" aria-label="Power of Veto">🏅</div>';
      } else if (player.nominated) {
        badgeHTML = '<div class="mobile-roster-badge nom" aria-label="Nominated">⚠️</div>';
      }
    }
    
    const evictedClass = isEvicted ? 'evicted' : '';
    const fallbackUrl = global.getAvatarFallback ? 
      global.getAvatarFallback(player.name || player.id, null) : 
      avatar;
    
    return `
      <button 
        class="mobile-roster-tile ${evictedClass}"
        data-player-id="${player.id}"
        data-evicted="${isEvicted}"
        aria-label="${statusLabel}"
        tabindex="0"
        role="button"
      >
        <div class="mobile-roster-avatar-wrap">
          <img 
            class="mobile-roster-avatar" 
            src="${avatar}" 
            alt="${player.name || 'Guest'}"
            loading="${loadingStrategy}"
            onerror="this.onerror=null;this.src='${fallbackUrl}';if(window.updateAvatarTrackingStatus){window.updateAvatarTrackingStatus('${player.id}','failed',this.src);}"
            onload="if(window.updateAvatarTrackingStatus){window.updateAvatarTrackingStatus('${player.id}','success');}"
          />
          ${isEvicted ? '<div class="mobile-roster-evicted-cross" aria-hidden="true"></div>' : ''}
          ${badgeHTML}
        </div>
        <div class="mobile-roster-name">${name}</div>
      </button>
    `;
  }
  
  /**
   * Render the active players grid
   */
  function renderActiveGrid() {
    const container = document.querySelector('.mobile-roster-active-grid');
    if (!container) return;
    
    const { columns } = computeLayout(state.activePlayers.length, state.orientation);
    
    // Update CSS variables
    container.style.setProperty('--mobile-roster-cols', columns);
    
    // Set landscape attribute for optional 5-column layout
    if (state.orientation === 'landscape' && columns === 5) {
      container.setAttribute('data-landscape-cols', '5');
    } else {
      container.removeAttribute('data-landscape-cols');
    }
    
    // Render tiles
    const tilesHTML = state.activePlayers.map(p => createTileHTML(p, false)).join('');
    container.innerHTML = tilesHTML;
    
    // Attach click handlers
    container.querySelectorAll('.mobile-roster-tile').forEach(tile => {
      tile.addEventListener('click', handleTileClick);
    });
    
    console.info(`[MobileRoster] Rendered ${state.activePlayers.length} active players in ${columns}x grid`);
  }
  
  /**
   * Render the evicted players panel
   */
  function renderEvictedPanel() {
    const toggle = document.querySelector('.mobile-roster-evicted-toggle');
    const panel = document.querySelector('.mobile-roster-evicted-panel');
    const grid = document.querySelector('.mobile-roster-evicted-grid');
    
    if (!toggle || !panel || !grid) return;
    
    // Update count badge
    const countBadge = toggle.querySelector('.evicted-count');
    if (countBadge) {
      countBadge.textContent = state.evictedPlayers.length;
    }
    
    // Show/hide toggle based on evicted count
    if (state.evictedPlayers.length === 0) {
      toggle.style.display = 'none';
      return;
    } else {
      toggle.style.display = 'flex';
    }
    
    // Render evicted tiles (earliest first)
    const tilesHTML = state.evictedPlayers.map(p => createTileHTML(p, true)).join('');
    grid.innerHTML = tilesHTML;
    
    // Attach click handlers
    grid.querySelectorAll('.mobile-roster-tile').forEach(tile => {
      tile.addEventListener('click', handleTileClick);
    });
    
    console.info(`[MobileRoster] Rendered ${state.evictedPlayers.length} evicted players`);
  }
  
  /**
   * Update all sizes (tiles, gaps, etc.) based on viewport
   */
  function updateSizes() {
    const container = document.querySelector('.mobile-roster-active-grid');
    if (!container) return;
    
    const containerWidth = container.offsetWidth;
    const { columns } = computeLayout(state.activePlayers.length, state.orientation);
    const tileSize = calculateTileSize(containerWidth, columns);
    
    // Update CSS variables
    container.style.setProperty('--mobile-roster-tile-size', `${tileSize}px`);
    container.style.setProperty('--mobile-roster-gap', `${CONFIG.GAP_SIZE}px`);
    
    // Apply dynamic viewport sizing
    applyDynamicSizing();
  }
  
  // ============================
  // TV Footer Bar
  // ============================

  /**
   * Create or update the TV footer bar with status chips
   */
  function updateTVFooterBar() {
    const tvNow = document.querySelector('#tvNow');
    if (!tvNow) return;

    // Get or create footer bar
    let footer = tvNow.querySelector('.mobile-roster-tv-footer');
    if (!footer) {
      footer = document.createElement('div');
      footer.className = 'mobile-roster-tv-footer';
      tvNow.appendChild(footer);
    }

    // Get game state
    const game = global.game || {};
    const season = game.season || 1;
    const week = game.week || 1;
    const phase = game.phase || 'lobby';
    const activeCount = state.activePlayers.length;
    const evictedCount = state.evictedPlayers.length;

    // Format phase name
    const phaseNames = {
      'lobby': 'Lobby',
      'opening': 'Opening',
      'social': 'Social',
      'hoh': 'HOH Comp',
      'nominations': 'Nominations',
      'veto': 'Veto Comp',
      'veto_ceremony': 'Veto Ceremony',
      'livevote': 'Live Vote',
      'eviction': 'Eviction',
      'finale': 'Finale'
    };
    const phaseName = phaseNames[phase] || phase;

    // Create footer HTML
    footer.innerHTML = `
      <div class="tv-footer-chip" aria-label="Current phase">
        <span class="chip-icon">📍</span>
        <span class="chip-text">${phaseName}</span>
      </div>
      <div class="tv-footer-chip" aria-label="Season and week">
        <span class="chip-icon">📅</span>
        <span class="chip-text">S${season} W${week}</span>
      </div>
      <div class="tv-footer-chip" aria-label="Active houseguests">
        <span class="chip-icon">👥</span>
        <span class="chip-text">${activeCount}</span>
      </div>
      ${evictedCount > 0 ? `
        <button 
          class="tv-footer-chip chip-evicted" 
          aria-label="Show evicted houseguests"
          onclick="MobileRoster.toggleEvictedPanel()"
        >
          <span class="chip-icon">👻</span>
          <span class="chip-text">Evicted (${evictedCount})</span>
        </button>
      ` : ''}
    `;

    console.info('[MobileRoster] TV footer bar updated');
  }

  /**
   * Toggle evicted panel (exposed for onclick)
   */
  function toggleEvictedPanel() {
    handleEvictedToggle();
  }

  // ============================
  // Player Spotlight (Faux TV)
  // ============================
  
  /**
   * Focus a player in the faux TV area
   */
  function focusPlayer(player, isEvicted = false) {
    const tvNow = document.querySelector('#tvNow');
    const tvOverlay = document.querySelector('#tvOverlay');
    
    if (!tvNow) {
      console.warn('[MobileRoster] Faux TV element not found');
      return;
    }
    
    // Clear any existing spotlight timeout
    if (state.spotlightTimeout) {
      clearTimeout(state.spotlightTimeout);
      state.spotlightTimeout = null;
    }
    
    const avatar = getPlayerAvatar(player);
    const name = player.name || 'Guest';
    
    let statusText;
    if (isEvicted) {
      statusText = 'Evicted';
      // Only show week if evictedAt is a week number (< 100), not a timestamp
      if (player.evictedAt && player.evictedAt < 100) {
        statusText += ` - Week ${player.evictedAt}`;
      }
    } else {
      statusText = player.hoh ? 'Head of Household' : 
                   player.nominated ? 'Nominated' : 
                   'Houseguest';
    }
    
    const statusClass = isEvicted ? 'evicted' : '';
    
    // Create spotlight overlay
    const spotlightHTML = `
      <div class="mobile-roster-faux-tv-overlay" role="dialog" aria-label="Player spotlight">
        <img 
          class="mobile-roster-spotlight-avatar" 
          src="${avatar}" 
          alt="${name}"
        />
        <div class="mobile-roster-spotlight-name">${name}</div>
        <div class="mobile-roster-spotlight-status ${statusClass}">${statusText}</div>
      </div>
    `;
    
    // Use tvOverlay if available, otherwise tvNow
    const targetElement = tvOverlay || tvNow;
    const existingOverlay = targetElement.querySelector('.mobile-roster-faux-tv-overlay');
    if (existingOverlay) {
      existingOverlay.remove();
    }
    
    targetElement.insertAdjacentHTML('beforeend', spotlightHTML);
    
    // Auto-hide after duration
    state.spotlightTimeout = setTimeout(() => {
      const overlay = targetElement.querySelector('.mobile-roster-faux-tv-overlay');
      if (overlay) {
        overlay.style.opacity = '0';
        setTimeout(() => overlay.remove(), 300);
      }
      state.spotlightTimeout = null;
    }, CONFIG.SPOTLIGHT_DURATION);
    
    console.info(`[MobileRoster] Spotlighted player: ${name} (evicted: ${isEvicted})`);
  }
  
  // ============================
  // Event Handlers
  // ============================
  
  /**
   * Handle tile click
   */
  function handleTileClick(event) {
    const tile = event.currentTarget;
    const playerId = tile.getAttribute('data-player-id');
    const isEvicted = tile.getAttribute('data-evicted') === 'true';
    
    // Find player in appropriate array
    const playerArray = isEvicted ? state.evictedPlayers : state.activePlayers;
    const player = playerArray.find(p => String(p.id) === String(playerId));
    
    if (player) {
      focusPlayer(player, isEvicted);
    }
  }
  
  /**
   * Handle evicted panel toggle
   */
  function handleEvictedToggle() {
    state.evictedPanelOpen = !state.evictedPanelOpen;
    
    const toggle = document.querySelector('.mobile-roster-evicted-toggle');
    const panel = document.querySelector('.mobile-roster-evicted-panel');
    
    if (!toggle || !panel) return;
    
    toggle.setAttribute('aria-expanded', state.evictedPanelOpen);
    
    if (state.evictedPanelOpen) {
      panel.classList.add('open');
    } else {
      panel.classList.remove('open');
    }
    
    console.info(`[MobileRoster] Evicted panel ${state.evictedPanelOpen ? 'opened' : 'closed'}`);
  }
  
  /**
   * Handle resize with debouncing
   */
  const handleResize = debounce(() => {
    const newOrientation = getOrientation();
    
    if (newOrientation !== state.orientation) {
      state.orientation = newOrientation;
      document.body.setAttribute('data-orientation', state.orientation);
      console.info(`[MobileRoster] Orientation changed: ${state.orientation}`);
    }
    
    if (isMobileViewport()) {
      updateSizes();
      renderActiveGrid();
    } else {
      deactivateMobileRoster();
    }
  }, CONFIG.RESIZE_DEBOUNCE);
  
  /**
   * Handle orientation change
   */
  function handleOrientationChange() {
    state.orientation = getOrientation();
    document.body.setAttribute('data-orientation', state.orientation);
    
    if (isMobileViewport() && state.initialized) {
      renderActiveGrid();
      updateSizes();
    }
  }
  
  // ============================
  // Player Data Management
  // ============================
  
  /**
   * Update player lists from game state
   */
  function updatePlayerLists() {
    try {
      // Try to get players from PlayerService first
      let allPlayers = [];
      
      if (global.PlayerService && typeof global.PlayerService.getAlivePlayers === 'function') {
        allPlayers = global.PlayerService.getAlivePlayers() || [];
        console.info('[MobileRoster] Loaded from PlayerService');
      } else if (global.game && Array.isArray(global.game.players)) {
        allPlayers = global.game.players || [];
        console.info('[MobileRoster] Loaded from game.players');
      } else if (global.g && global.g.game && Array.isArray(global.g.game.players)) {
        allPlayers = global.g.game.players || [];
        console.info('[MobileRoster] Loaded from g.game.players');
      }
      
      // Separate active and evicted
      state.activePlayers = allPlayers.filter(p => !p.evicted);
      state.evictedPlayers = allPlayers.filter(p => p.evicted);
      
      // Sort evicted by eviction order (earliest first)
      state.evictedPlayers.sort((a, b) => {
        const aTime = a.evictedAt || 0;
        const bTime = b.evictedAt || 0;
        return aTime - bTime;
      });
      
      console.info(`[MobileRoster] Updated: ${state.activePlayers.length} active, ${state.evictedPlayers.length} evicted`);
      
      return true;
    } catch (err) {
      console.error('[MobileRoster] Error updating player lists:', err);
      return false;
    }
  }
  
  /**
   * Handle player eviction event
   */
  function handlePlayerEvicted(data) {
    console.info('[MobileRoster] Player evicted event:', data);
    
    if (!data || !data.playerId) return;
    
    // Move player from active to evicted
    const playerIndex = state.activePlayers.findIndex(p => p.id === data.playerId);
    if (playerIndex !== -1) {
      const [evictedPlayer] = state.activePlayers.splice(playerIndex, 1);
      evictedPlayer.evicted = true;
      // Store week number if provided, otherwise use order index
      evictedPlayer.evictedAt = data.week || state.evictedPlayers.length + 1;
      state.evictedPlayers.push(evictedPlayer);
      
      // Re-render
      renderActiveGrid();
      renderEvictedPanel();
      updateSizes();
    } else {
      // Fallback: reload from game state
      updatePlayerLists();
      renderAll();
    }
  }
  
  /**
   * Handle player update event
   */
  function handlePlayersUpdate(data) {
    console.info('[MobileRoster] Players update event:', data);
    
    // Reload player data
    updatePlayerLists();
    
    // Re-render if mobile roster is active
    if (isMobileViewport() && state.initialized) {
      renderAll();
    }
  }
  
  // ============================
  // Main Rendering
  // ============================
  
  /**
   * Render all components
   */
  function renderAll() {
    renderActiveGrid();
    renderEvictedPanel();
    updateSizes();
    updateTVFooterBar();
  }
  
  // ============================
  // Activation/Deactivation
  // ============================
  
  /**
   * Activate mobile roster mode
   */
  function activateMobileRoster() {
    document.body.setAttribute('data-mobile-roster-active', 'true');
    document.body.setAttribute('data-orientation', state.orientation);
    console.info('[MobileRoster] Activated mobile roster view');
    
    if (state.initialized) {
      renderAll();
    }
  }
  
  /**
   * Deactivate mobile roster mode
   */
  function deactivateMobileRoster() {
    document.body.removeAttribute('data-mobile-roster-active');
    console.info('[MobileRoster] Deactivated mobile roster view');
  }
  
  // ============================
  // Debug Overlay
  // ============================

  /**
   * Check if debug mode is enabled via ?debug=1
   */
  function isDebugMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('debug') === '1';
  }

  /**
   * Create and show debug overlay
   */
  function createDebugOverlay() {
    if (!isDebugMode()) return;

    const existing = document.querySelector('.mobile-roster-debug-overlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.className = 'mobile-roster-debug-overlay';
    overlay.innerHTML = `
      <div class="debug-header">
        <h3>Avatar Debug Panel</h3>
        <button class="debug-close" aria-label="Close debug panel">✕</button>
      </div>
      <div class="debug-content">
        <div class="debug-summary">
          <div class="debug-stat">
            <label>iOS Safari:</label>
            <span>${global.isIOSSafari ? global.isIOSSafari() : false}</span>
          </div>
          <div class="debug-stat">
            <label>Active Players:</label>
            <span>${state.activePlayers.length}</span>
          </div>
          <div class="debug-stat">
            <label>Evicted Players:</label>
            <span>${state.evictedPlayers.length}</span>
          </div>
        </div>
        <div class="debug-players" id="debugPlayersList"></div>
      </div>
    `;

    document.body.appendChild(overlay);

    // Close button handler
    overlay.querySelector('.debug-close').addEventListener('click', () => {
      overlay.remove();
    });

    // Update player list
    updateDebugPlayerList();

    console.info('[MobileRoster Debug] Overlay created');
  }

  /**
   * Update debug player list with load status
   */
  function updateDebugPlayerList() {
    const container = document.getElementById('debugPlayersList');
    if (!container) return;

    const allPlayers = [...state.activePlayers, ...state.evictedPlayers];
    const tracking = global.getAvatarLoadTracking ? global.getAvatarLoadTracking() : new Map();

    const html = allPlayers.map(player => {
      const trackData = tracking.get(player.id) || {};
      const status = trackData.status || 'unknown';
      const statusClass = status === 'success' ? 'success' : 
                         status === 'failed' ? 'failed' : 'pending';
      const statusIcon = status === 'success' ? '✓' : 
                        status === 'failed' ? '✗' : '⏳';

      return `
        <div class="debug-player-row ${statusClass}">
          <div class="debug-player-info">
            <strong>${player.name || 'Guest'}</strong>
            <span class="debug-player-id">(ID: ${player.id})</span>
          </div>
          <div class="debug-status">
            <span class="debug-status-icon">${statusIcon}</span>
            <span class="debug-status-text">${status}</span>
          </div>
          ${trackData.url ? `<div class="debug-url">${trackData.url}</div>` : ''}
          ${trackData.error ? `<div class="debug-error">${trackData.error}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = html || '<div class="debug-empty">No players to display</div>';
  }

  // ============================
  // Initialization
  // ============================
  
  /**
   * Create the mobile roster DOM structure
   */
  function createDOMStructure() {
    // Find insertion point (before or after #rosterBar)
    const rosterBar = document.querySelector('#rosterBar');
    if (!rosterBar) {
      console.warn('[MobileRoster] #rosterBar not found, cannot insert mobile roster');
      return false;
    }
    
    // Check if already exists
    if (document.querySelector('.mobile-roster-container')) {
      console.info('[MobileRoster] DOM structure already exists');
      return true;
    }
    
    // Create container
    const container = document.createElement('div');
    container.className = 'mobile-roster-container';
    container.innerHTML = `
      <!-- Active Players Grid -->
      <div class="mobile-roster-active-grid" role="list" aria-label="Active houseguests"></div>
      
      <!-- Evicted Players Section -->
      <div class="mobile-roster-evicted-section">
        <button 
          class="mobile-roster-evicted-toggle"
          aria-expanded="false"
          aria-controls="mobileRosterEvictedPanel"
        >
          <span>Evicted</span>
          <span class="evicted-count">0</span>
          <span class="toggle-icon" aria-hidden="true">▼</span>
        </button>
        
        <div 
          class="mobile-roster-evicted-panel"
          id="mobileRosterEvictedPanel"
          role="region"
          aria-label="Evicted houseguests"
        >
          <div class="mobile-roster-evicted-grid" role="list"></div>
        </div>
      </div>
    `;
    
    // Insert after rosterBar
    rosterBar.parentNode.insertBefore(container, rosterBar.nextSibling);
    
    // Attach toggle handler
    const toggle = container.querySelector('.mobile-roster-evicted-toggle');
    if (toggle) {
      toggle.addEventListener('click', handleEvictedToggle);
    }
    
    console.info('[MobileRoster] DOM structure created');
    return true;
  }
  
  /**
   * Initialize the mobile roster system
   */
  function init() {
    if (state.initialized) {
      console.warn('[MobileRoster] Already initialized');
      return;
    }
    
    console.info('[MobileRoster] Initializing...');
    
    // Create DOM structure
    if (!createDOMStructure()) {
      console.error('[MobileRoster] Failed to create DOM structure');
      return;
    }
    
    // Load player data
    updatePlayerLists();
    
    // Set initial orientation
    state.orientation = getOrientation();
    document.body.setAttribute('data-orientation', state.orientation);
    
    // Activate if mobile viewport
    if (isMobileViewport()) {
      activateMobileRoster();
      renderAll();
    } else {
      console.info('[MobileRoster] Desktop viewport, mobile roster inactive');
    }
    
    // Listen for resize events
    window.addEventListener('resize', handleResize);
    
    // Listen for orientation change
    const mql = window.matchMedia('(orientation: landscape)');
    if (mql.addEventListener) {
      mql.addEventListener('change', handleOrientationChange);
    } else if (mql.addListener) {
      // Fallback for older browsers
      mql.addListener(handleOrientationChange);
    }
    
    // Subscribe to game events
    if (global.bbGameBus) {
      global.bbGameBus.on('player:evicted', handlePlayerEvicted);
      global.bbGameBus.on('players:update', handlePlayersUpdate);
      global.bbGameBus.on('players:change', handlePlayersUpdate);
      console.info('[MobileRoster] Subscribed to game events');
    }
    
    // Subscribe to PlayerService if available
    if (global.PlayerService && typeof global.PlayerService.subscribe === 'function') {
      global.PlayerService.subscribe((_players) => {
        console.info('[MobileRoster] PlayerService update');
        updatePlayerLists();
        if (isMobileViewport() && state.initialized) {
          renderAll();
        }
      });
      console.info('[MobileRoster] Subscribed to PlayerService');
    }
    
    state.initialized = true;
    console.info('[MobileRoster] Initialization complete');

    // Create debug overlay if debug mode enabled
    if (isDebugMode()) {
      createDebugOverlay();
      // Update debug info every 2 seconds
      setInterval(() => {
        if (document.querySelector('.mobile-roster-debug-overlay')) {
          updateDebugPlayerList();
        }
      }, 2000);
    }
  }
  
  /**
   * Manual refresh (for debugging or external triggers)
   */
  function refresh() {
    if (!state.initialized) {
      console.warn('[MobileRoster] Not initialized, cannot refresh');
      return;
    }
    
    updatePlayerLists();
    
    if (isMobileViewport()) {
      activateMobileRoster();
      renderAll();
    } else {
      deactivateMobileRoster();
    }
  }
  
  // ============================
  // Public API
  // ============================
  
  const MobileRoster = {
    init,
    refresh,
    computeLayout,
    focusPlayer,
    updatePlayerLists,
    toggleEvictedPanel,
    getState: () => ({ ...state }), // Return copy for debugging
  };
  
  // Export to global scope
  global.MobileRoster = MobileRoster;
  
  console.info('[MobileRoster] Module loaded');
  
})(window);
