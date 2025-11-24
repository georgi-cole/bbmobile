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
    PORTRAIT_BREAKPOINT: 1400,     // Enhanced portrait detection threshold
    MOBILE_UA_BREAKPOINT: 1600,    // Mobile UA detection threshold
    MAX_COLS_PORTRAIT: 4,          // Maximum columns in portrait
    MAX_COLS_LANDSCAPE: 5,         // Maximum columns in landscape
    MIN_TILE_SIZE: 56,             // Minimum tap target (px)
    MAX_TILE_SIZE: 100,            // Maximum tile size (px)
    GAP_SIZE: 6,                   // Default gap between tiles (px) - reduced from 8
    RESIZE_DEBOUNCE: 50,           // Debounce resize events (ms)
    SPOTLIGHT_DURATION: 3000,      // Auto-hide spotlight after this time (ms)
    HOLD_DEBOUNCE_MS: 600,         // Hold debounce for profile sheet (ms) - reduced for faster response
    
    // Faux TV sizing constraints
    MIN_TV_RATIO: 0.38,            // Minimum TV height as ratio of viewport
    MAX_TV_RATIO: 0.48,            // Maximum TV height as ratio of viewport
    MIN_TV_HEIGHT: 300,            // Minimum TV height in pixels
    OVERFLOW_PADDING: 8,           // Padding for overflow detection
    ROSTER_CONTAINER_PADDING: 32,  // Padding/margins inside roster container
    TV_ROSTER_GAP: 20,             // Gap between TV and roster (px)
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
    longPressTimer: null,
    longPressTarget: null,
    longPressStarted: false,
    chipBarObserver: null, // MutationObserver for chip bar suppression
    initAttempts: 0,
    lastInitAttempt: null,
    forced: false,
    badgesRendered: 0,
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
   * Detect mobile user agent
   */
  function isMobileUA() {
    const ua = navigator.userAgent || '';
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  }
  
  /**
   * Detect if mobile roster should be active
   * Enhanced activation logic per requirements:
   * - Forced flag (window.FORCE_MOBILE_ROSTER)
   * - Portrait mode AND width <= 1400
   * - Mobile UA AND width <= 1600
   * - Width <= base breakpoint (768)
   */
  function isMobileViewport() {
    // Check for force flag
    if (typeof window.FORCE_MOBILE_ROSTER !== 'undefined' && window.FORCE_MOBILE_ROSTER) {
      return true;
    }
    
    const width = window.innerWidth;
    const orientation = getOrientation();
    const mobileUA = isMobileUA();
    
    // Portrait mode with enhanced threshold
    if (orientation === 'portrait' && width <= CONFIG.PORTRAIT_BREAKPOINT) {
      return true;
    }
    
    // Mobile UA with enhanced threshold
    if (mobileUA && width <= CONFIG.MOBILE_UA_BREAKPOINT) {
      return true;
    }
    
    // Base breakpoint (backwards compatibility)
    if (width <= CONFIG.MOBILE_BREAKPOINT) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Detect orientation
   */
  function getOrientation() {
    const mql = window.matchMedia('(orientation: landscape)');
    return mql.matches ? 'landscape' : 'portrait';
  }
  
  /**
   * Generate avatar path candidates with case variations
   * @param {string} name - Player name
   * @returns {Array<string>} Array of candidate paths to try
   */
  function generateAvatarCandidates(name) {
    if (!name) return [];
    
    const basePath = 'avatars/';
    const candidates = [];
    
    // Original name as provided
    candidates.push(`${basePath}${name}.png`);
    
    // Lowercase version
    candidates.push(`${basePath}${name.toLowerCase()}.png`);
    
    // TitleCase version (first letter uppercase, rest lowercase)
    const titleCase = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    if (titleCase !== name && titleCase !== name.toLowerCase()) {
      candidates.push(`${basePath}${titleCase}.png`);
    }
    
    // Hyphenated forms (replace spaces with hyphens)
    if (name.includes(' ')) {
      const hyphenated = name.replace(/\s+/g, '-');
      candidates.push(`${basePath}${hyphenated}.png`);
      candidates.push(`${basePath}${hyphenated.toLowerCase()}.png`);
    }
    
    // Remove duplicates
    return [...new Set(candidates)];
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
    
    // Try case-insensitive resolution for local avatars
    if (player.name) {
      const candidates = generateAvatarCandidates(player.name);
      // Return first candidate (actual resolution happens via img error handler)
      if (candidates.length > 0) {
        return candidates[0];
      }
    }
    
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
  
  /**
   * Compute player ranking heuristic
   * Enhanced per requirements: uses evictionOrder and totalStartingPlayers when available
   * @param {Object} player - Player object
   * @param {Array} allPlayers - All players (active + evicted)
   * @returns {number} Ranking (1 = best)
   */
  function computeRanking(player, allPlayers) {
    // Priority 1: Use explicit ranking if evictionOrder and totalStartingPlayers exist
    if (player.evictionOrder && player.totalStartingPlayers) {
      return (player.totalStartingPlayers + 1) - player.evictionOrder;
    }
    
    // Priority 2: Use evictionOrder with total player count
    const totalPlayers = allPlayers.length;
    if (player.evictionOrder && totalPlayers) {
      return (totalPlayers + 1) - player.evictionOrder;
    }
    
    // Priority 3: Fallback - use index in evicted array
    if (player.evicted) {
      const evictedIndex = state.evictedPlayers.findIndex(p => p.id === player.id);
      if (evictedIndex >= 0) {
        // Earlier evictions = lower ranking (worse placement)
        // Later evictions = higher ranking (better placement)
        return (totalPlayers + 1) - (evictedIndex + 1);
      }
    }
    
    // Priority 4: Heuristic based on performance metrics
    // Rank by score (descending)
    const sorted = allPlayers.map(p => {
      let pScore = 0;
      
      // Still active = higher score
      if (!p.evicted) {
        pScore += 1000;
      } else {
        // Later eviction = higher score
        pScore += (p.evictedAt || p.evictionOrder || 0) * 10;
      }
      
      // HOH wins
      pScore += (p.hohWins || 0) * 50;
      
      // POV wins
      pScore += (p.povWins || 0) * 30;
      
      // Nominations survived
      pScore += (p.nominationsSurvived || 0) * 20;
      
      // Social score if available
      pScore += (p.socialScore || 0) * 5;
      
      return { id: p.id, score: pScore };
    }).sort((a, b) => b.score - a.score);
    
    const rank = sorted.findIndex(p => p.id === player.id) + 1;
    return rank || allPlayers.length;
  }
  
  /**
   * Get eviction week display string
   * @param {Object} player - Player object
   * @returns {string} Eviction week display
   */
  function getEvictionWeek(player) {
    if (!player.evicted) return '—';
    
    // Try various properties
    const week = player.evictedWeek || player.evictedAt || player.evictionOrder || player.weekEvicted;
    
    if (week && week < 100) {
      return `Week ${week}`;
    }
    
    // Fallback: use index in evicted array
    const index = state.evictedPlayers.findIndex(p => p.id === player.id);
    if (index >= 0) {
      return `Week ${index + 1}`;
    }
    
    return '—';
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
   * Calculate optimal roster and TV sizes with two-pass sizing algorithm
   * First pass: Choose TV height ratio and compute tile sizes
   * Second pass: Overflow correction to prevent internal scroll
   * @returns {Object} { rosterHeight, tvHeight, tileSize } in pixels
   */
  function calculateOptimalSizes() {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    
    // Account for fixed elements (topbar, toolbar, etc.)
    const topbarHeight = document.querySelector('.topbar')?.offsetHeight || 0;
    const toolbarHeight = document.querySelector('.toolbar')?.offsetHeight || 0;
    const fixedHeight = topbarHeight + toolbarHeight;
    
    // Available viewport height
    const availableHeight = vh - fixedHeight - 40; // 40px for padding/margins
    
    // ========== FIRST PASS: Initial TV ratio selection ==========
    
    // Start with target TV ratio (mid-range between min/max)
    let tvRatio = (CONFIG.MIN_TV_RATIO + CONFIG.MAX_TV_RATIO) / 2;
    let tvHeight = Math.max(CONFIG.MIN_TV_HEIGHT, Math.floor(vh * tvRatio));
    
    // Calculate roster grid dimensions
    const { columns, rows } = computeLayout(state.activePlayers.length, state.orientation);
    const container = document.querySelector('.mobile-roster-active-grid');
    const containerWidth = container?.offsetWidth || vw - 24; // 24px for padding
    
    // Calculate tile size based on available roster space
    let tileSize = calculateTileSize(containerWidth, columns);
    const nameHeight = 20; // Height of name label
    const gap = CONFIG.GAP_SIZE;
    
    // Calculate required roster height
    const rosterGridHeight = (rows * (tileSize + nameHeight)) + ((rows - 1) * gap);
    const evictedSectionHeight = state.evictedPlayers.length > 0 ? 60 : 0;
    let rosterHeight = rosterGridHeight + evictedSectionHeight + CONFIG.ROSTER_CONTAINER_PADDING;
    
    // Adjust TV ratio downward if tile size would be too small
    if (tileSize < CONFIG.MIN_TILE_SIZE) {
      // Need more space for roster, reduce TV ratio
      tvRatio = CONFIG.MIN_TV_RATIO;
      tvHeight = Math.max(CONFIG.MIN_TV_HEIGHT, Math.floor(vh * tvRatio));
      
      // Recalculate with more space
      tileSize = Math.max(CONFIG.MIN_TILE_SIZE, calculateTileSize(containerWidth, columns));
      const adjustedRosterGridHeight = (rows * (tileSize + nameHeight)) + ((rows - 1) * gap);
      rosterHeight = adjustedRosterGridHeight + evictedSectionHeight + CONFIG.ROSTER_CONTAINER_PADDING;
    }
    
    // Note: tileSize already enforced to be >= MIN_TILE_SIZE above
    
    // ========== SECOND PASS: Overflow correction ==========
    
    // Check if TV content would overflow (simulate footer + spotlight content)
    const tvNow = document.querySelector('#tvNow');
    if (tvNow) {
      // Get actual content height if TV is rendered
      const tvContentHeight = tvNow.scrollHeight || 0;
      
      // Check if content overflows allocated TV height
      const requiredTvHeight = tvContentHeight + CONFIG.OVERFLOW_PADDING;
      
      if (requiredTvHeight > tvHeight) {
        // Content overflows - grow TV without shrinking tiles below minimum
        const additionalTvSpace = requiredTvHeight - tvHeight;
        const maxTvHeight = Math.floor(vh * CONFIG.MAX_TV_RATIO);
        
        // Grow TV (clamped by max ratio and viewport)
        const newTvHeight = Math.min(maxTvHeight, tvHeight + additionalTvSpace, vh - 100);
        
        // Check if we have room to grow TV
        if (newTvHeight > tvHeight && (availableHeight - newTvHeight - 20) >= rosterHeight) {
          tvHeight = newTvHeight;
        } else {
          // Can't grow TV enough - ensure tiles don't shrink below minimum
          // This is a fallback that prioritizes usability
          const minRosterHeight = (rows * (CONFIG.MIN_TILE_SIZE + nameHeight)) + 
                                  ((rows - 1) * gap) + evictedSectionHeight + CONFIG.ROSTER_CONTAINER_PADDING;
          
          if (minRosterHeight + CONFIG.MIN_TV_HEIGHT + CONFIG.TV_ROSTER_GAP <= availableHeight) {
            rosterHeight = minRosterHeight;
            tvHeight = availableHeight - rosterHeight - CONFIG.TV_ROSTER_GAP;
            tileSize = CONFIG.MIN_TILE_SIZE;
          }
        }
      }
    }
    
    // Final clamp to ensure nothing exceeds viewport
    const totalUsed = rosterHeight + tvHeight + CONFIG.TV_ROSTER_GAP;
    if (totalUsed > availableHeight) {
      // Scale down proportionally
      const scale = availableHeight / totalUsed;
      rosterHeight = Math.floor(rosterHeight * scale);
      tvHeight = Math.floor(tvHeight * scale);
    }
    
    return {
      rosterHeight: Math.max(200, rosterHeight),
      tvHeight: Math.max(CONFIG.MIN_TV_HEIGHT, tvHeight),
      tileSize: Math.max(CONFIG.MIN_TILE_SIZE, tileSize)
    };
  }

  /**
   * Apply dynamic sizing to roster and TV
   * Uses two-pass sizing algorithm to prevent overflow and maintain usability
   */
  function applyDynamicSizing() {
    if (!isMobileViewport() || !state.initialized) return;
    
    const { rosterHeight, tvHeight, tileSize } = calculateOptimalSizes();
    
    // Apply to roster container
    const rosterContainer = document.querySelector('.mobile-roster-container');
    if (rosterContainer) {
      rosterContainer.style.maxHeight = `${rosterHeight}px`;
    }
    
    // Apply to TV with overflow prevention
    const tv = document.querySelector('.tv');
    const tvNow = document.querySelector('#tvNow');
    if (tv && tvNow) {
      tv.style.minHeight = `${tvHeight}px`;
      tv.style.maxHeight = `${tvHeight}px`;
      
      // Allow TV content to be visible outside container (for spotlight overlay)
      // This prevents internal scrolling while allowing absolute positioned elements
      tvNow.style.overflowY = 'visible';
      tvNow.style.minHeight = `${tvHeight - 40}px`; // Account for padding/border
    }
    
    // Update tile size CSS variable for responsive tiles
    // This variable is used in mobileRoster.css for dynamic tile sizing
    const activeGrid = document.querySelector('.mobile-roster-active-grid');
    if (activeGrid) {
      activeGrid.style.setProperty('--mobile-roster-tile-size', `${tileSize}px`);
    }
    
    console.info(`[MobileRoster] Two-pass sizing: roster=${rosterHeight}px, tv=${tvHeight}px, tile=${tileSize}px`);
  }
  
  // ============================
  // Rendering Functions
  // ============================
  
  /**
   * Get combined badge info for a player
   * Returns badge text and class based on status combination
   * Prioritizes: EVICTED > HOH > POV > NOM > SAFE
   */
  function getCombinedBadgeInfo(player, isEvicted = false) {
    if (isEvicted) {
      return { text: 'EVICTED', class: 'evict' };
    }
    
    const statuses = [];
    if (player.hoh) statuses.push('HOH');
    if (player.pov) statuses.push('POV');
    if (player.nominated) statuses.push('NOM');
    if (player.safe && !player.hoh && !player.pov) statuses.push('SAFE');
    
    if (statuses.length === 0) {
      return null;
    }
    
    // Combine with separator
    const text = statuses.join('+');
    
    // Determine class (use first status for styling)
    const classMap = {
      'HOH': 'hoh',
      'POV': 'pov',
      'NOM': 'nom',
      'SAFE': 'safe'
    };
    const badgeClass = classMap[statuses[0]] || 'default';
    
    return { text, class: badgeClass };
  }

  /**
   * Create HTML for a roster tile
   */
  function createTileHTML(player, isEvicted = false) {
    const avatar = getPlayerAvatar(player);
    const name = shortenName(player.name || 'Guest');
    const statusLabel = getPlayerStatusLabel(player, isEvicted);
    const loadingStrategy = shouldUseEagerLoading() ? 'eager' : 'lazy';
    
    // Get combined badge info
    const badgeInfo = getCombinedBadgeInfo(player, isEvicted);
    
    let badgeHTML = '';
    if (badgeInfo) {
      // Badge overlay at bottom-center
      const longTextClass = badgeInfo.text.length > 7 ? 'long-text' : '';
      badgeHTML = `<div class="mobile-roster-badge-overlay ${badgeInfo.class} ${longTextClass}" aria-label="${badgeInfo.text}">${badgeInfo.text}</div>`;
      
      state.badgesRendered++;
    }
    
    const evictedClass = isEvicted ? 'evicted' : '';
    const fallbackUrl = global.getAvatarFallback ? 
      global.getAvatarFallback(player.name || player.id, null) : 
      avatar;
    
    // Escape player ID and name for safe HTML attribute usage
    const safePlayerId = String(player.id).replace(/"/g, '&quot;');
    const safeName = String(player.name || 'Guest').replace(/"/g, '&quot;');
    
    return `
      <button 
        class="mobile-roster-tile ${evictedClass} no-touch-callout"
        data-player-id="${safePlayerId}"
        data-evicted="${isEvicted}"
        aria-label="${statusLabel}"
        tabindex="0"
        role="button"
      >
        <div class="mobile-roster-avatar-wrap">
          <img 
            class="mobile-roster-avatar" 
            src="${avatar}" 
            alt="${safeName}"
            loading="${loadingStrategy}"
            data-fallback="${fallbackUrl}"
            data-player-id="${safePlayerId}"
            draggable="false"
          />
          ${isEvicted ? '<div class="mobile-roster-evicted-cross" aria-hidden="true"></div>' : ''}
          ${badgeHTML}
        </div>
        <div class="mobile-roster-name">${name}</div>
      </button>
    `;
  }
  
  /**
   * Render the active players grid (includes evicted with special styling)
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
    
    // Reset badge counter
    state.badgesRendered = 0;
    
    // Render tiles (evicted players stay in grid with special styling)
    const tilesHTML = state.activePlayers.map(p => createTileHTML(p, p.evicted)).join('');
    container.innerHTML = tilesHTML;
    
    // Attach click handlers, long press handlers, and image error handlers
    container.querySelectorAll('.mobile-roster-tile').forEach(tile => {
      // Prevent context menu
      tile.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
      
      tile.addEventListener('click', handleTileClick);
      tile.addEventListener('pointerdown', handlePointerDown);
      tile.addEventListener('pointerup', handlePointerEnd);
      tile.addEventListener('pointerleave', handlePointerEnd);
      tile.addEventListener('pointercancel', handlePointerEnd);
      
      // Attach image load/error handlers with case-insensitive fallback
      const img = tile.querySelector('.mobile-roster-avatar');
      if (img) {
        const playerId = tile.getAttribute('data-player-id');
        const player = state.activePlayers.find(p => String(p.id) === String(playerId));
        
        const candidates = [];
        
        if (player && player.name) {
          candidates.push(...generateAvatarCandidates(player.name));
          // Add placeholder as final fallback
          candidates.push('avatars/placeholder.png');
        } else {
          candidates.push('avatars/placeholder.png');
        }
        
        // Store candidates on image element to avoid closure issues
        img.dataset.avatarCandidates = JSON.stringify(candidates);
        img.dataset.candidateIndex = '0';
        
        img.addEventListener('load', () => {
          if (global.updateAvatarTrackingStatus) {
            global.updateAvatarTrackingStatus(playerId, 'success');
          }
        });
        
        img.addEventListener('error', function() {
          const candidates = JSON.parse(this.dataset.avatarCandidates || '[]');
          let candidateIndex = parseInt(this.dataset.candidateIndex || '0', 10);
          candidateIndex++;
          this.dataset.candidateIndex = String(candidateIndex);
          
          if (candidateIndex < candidates.length) {
            // Try next candidate
            this.src = candidates[candidateIndex];
          } else {
            // All candidates failed
            if (global.updateAvatarTrackingStatus) {
              global.updateAvatarTrackingStatus(playerId, 'failed', this.src);
            }
          }
        });
      }
    });
    
    console.info(`[MobileRoster] Rendered ${state.activePlayers.length} active players in ${columns}x grid`);
  }
  
  /**
   * Render the evicted players panel
   * Per spec: evicted players stay in main grid, so hide the drawer
   */
  function renderEvictedPanel() {
    const toggle = document.querySelector('.mobile-roster-evicted-toggle');
    const panel = document.querySelector('.mobile-roster-evicted-panel');
    const grid = document.querySelector('.mobile-roster-evicted-grid');
    
    if (!toggle || !panel || !grid) return;
    
    // Hide the evicted drawer since evicted players are now in main grid
    toggle.style.display = 'none';
    panel.style.display = 'none';
    
    console.info(`[MobileRoster] Evicted panel hidden - ${state.evictedPlayers.length} evicted players in main grid`);
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
          data-action="toggle-evicted"
          aria-label="Show evicted houseguests"
        >
          <span class="chip-icon">👻</span>
          <span class="chip-text">Evicted (${evictedCount})</span>
        </button>
      ` : ''}
    `;

    // Attach event listener to evicted chip
    const evictedChip = footer.querySelector('[data-action="toggle-evicted"]');
    if (evictedChip) {
      evictedChip.addEventListener('click', toggleEvictedPanel);
    }

    console.info('[MobileRoster] TV footer bar updated');
    
    // Suppress legacy chip bar
    suppressLegacyChipBar();
  }

  /**
   * Hide legacy chip bar and prevent re-injection
   */
  function suppressLegacyChipBar() {
    // Find and hide any element with data-top-chips attribute
    const legacyChipBars = document.querySelectorAll('[data-top-chips]');
    legacyChipBars.forEach(bar => {
      bar.style.display = 'none';
      bar.setAttribute('aria-hidden', 'true');
    });
    
    // Also hide common chip bar selectors
    const commonSelectors = ['.top-chip-bar', '.chip-bar-top', '#topChips', '.game-status-chips'];
    commonSelectors.forEach(selector => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = 'none';
        element.setAttribute('aria-hidden', 'true');
      }
    });
  }

  /**
   * Setup MutationObserver to suppress chip bar re-injections
   */
  function setupChipBarSuppression() {
    // Observe document body for added nodes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if added node is a chip bar
            if (node.hasAttribute && node.hasAttribute('data-top-chips')) {
              node.style.display = 'none';
              node.setAttribute('aria-hidden', 'true');
              console.info('[MobileRoster] Suppressed re-injected chip bar');
            }
            
            // Check common chip bar classes
            if (node.classList && (
              node.classList.contains('top-chip-bar') ||
              node.classList.contains('chip-bar-top') ||
              node.id === 'topChips' ||
              node.classList.contains('game-status-chips')
            )) {
              node.style.display = 'none';
              node.setAttribute('aria-hidden', 'true');
              console.info('[MobileRoster] Suppressed re-injected chip bar');
            }
          }
        });
      });
    });
    
    // Start observing
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Store observer for cleanup
    state.chipBarObserver = observer;
    
    console.info('[MobileRoster] Chip bar suppression observer active');
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
  // Profile Popover
  // ============================
  
  /**
   * Create profile popover DOM element
   */
  function createProfilePopover() {
    const existing = document.querySelector('.mobile-roster-profile-popover');
    if (existing) return existing;
    
    const popover = document.createElement('div');
    popover.className = 'mobile-roster-profile-popover';
    popover.innerHTML = `
      <div class="profile-popover-backdrop"></div>
      <div class="profile-popover-content">
        <button class="profile-popover-close" aria-label="Close profile">✕</button>
        <div class="profile-popover-body"></div>
      </div>
    `;
    
    document.body.appendChild(popover);
    
    // Close button handler
    popover.querySelector('.profile-popover-close').addEventListener('click', hideProfilePopover);
    
    // Backdrop click handler
    popover.querySelector('.profile-popover-backdrop').addEventListener('click', hideProfilePopover);
    
    return popover;
  }
  
  /**
   * Show profile popover for a player
   * @param {Object} player - Player object
   * @param {boolean} isEvicted - Whether player is evicted
   */
  function showProfilePopover(player, isEvicted = false) {
    const popover = createProfilePopover();
    const body = popover.querySelector('.profile-popover-body');
    
    // Get all players for ranking
    const allPlayers = [...state.activePlayers, ...state.evictedPlayers];
    const ranking = computeRanking(player, allPlayers);
    
    // Build profile fields with graceful fallback
    const fields = [];
    
    // Name header
    fields.push(`<h3 class="profile-field-name">${player.name || 'Guest'}</h3>`);
    
    // Age
    if (player.age) {
      fields.push(`<div class="profile-field"><label>Age:</label> <span>${player.age}</span></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Age:</label> <span class="profile-field-empty">—</span></div>`);
    }
    
    // Gender
    if (player.gender || player.sex) {
      fields.push(`<div class="profile-field"><label>Gender:</label> <span>${player.gender || player.sex}</span></div>`);
    }
    
    // Location
    if (player.location || player.hometown) {
      fields.push(`<div class="profile-field"><label>Location:</label> <span>${player.location || player.hometown}</span></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Location:</label> <span class="profile-field-empty">—</span></div>`);
    }
    
    // Occupation (bold)
    if (player.occupation || player.job) {
      fields.push(`<div class="profile-field"><label>Occupation:</label> <strong>${player.occupation || player.job}</strong></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Occupation:</label> <span class="profile-field-empty">None</span></div>`);
    }
    
    // Motto (italic)
    if (player.motto || player.tagline) {
      fields.push(`<div class="profile-field"><label>Motto:</label> <em>"${player.motto || player.tagline}"</em></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Motto:</label> <span class="profile-field-empty">—</span></div>`);
    }
    
    // Fun Fact
    if (player.funFact || player.fun_fact) {
      fields.push(`<div class="profile-field"><label>Fun Fact:</label> <span>${player.funFact || player.fun_fact}</span></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Fun Fact:</label> <span class="profile-field-empty">None</span></div>`);
    }
    
    // Allies
    if (player.allies && player.allies.length > 0) {
      const alliesNames = player.allies.map(id => {
        const ally = allPlayers.find(p => p.id === id);
        return ally ? ally.name : `Player ${id}`;
      }).join(', ');
      fields.push(`<div class="profile-field"><label>Allies:</label> <span>${alliesNames}</span></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Allies:</label> <span class="profile-field-empty">None</span></div>`);
    }
    
    // Enemies
    if (player.enemies && player.enemies.length > 0) {
      const enemiesNames = player.enemies.map(id => {
        const enemy = allPlayers.find(p => p.id === id);
        return enemy ? enemy.name : `Player ${id}`;
      }).join(', ');
      fields.push(`<div class="profile-field"><label>Enemies:</label> <span>${enemiesNames}</span></div>`);
    } else {
      fields.push(`<div class="profile-field"><label>Enemies:</label> <span class="profile-field-empty">None</span></div>`);
    }
    
    // Ranking (dynamic)
    fields.push(`<div class="profile-field profile-field-ranking"><label>Ranking:</label> <span class="profile-ranking-value">#${ranking}</span></div>`);
    
    // Eviction Week (if evicted)
    if (isEvicted) {
      const evictionWeek = getEvictionWeek(player);
      fields.push(`<div class="profile-field profile-field-eviction"><label>Eviction Week:</label> <span class="profile-eviction-value">${evictionWeek}</span></div>`);
    }
    
    body.innerHTML = fields.join('');
    
    // Show popover with animation
    popover.classList.add('visible');
    
    console.info(`[MobileRoster] Showing profile popover for ${player.name}`);
  }
  
  /**
   * Hide profile popover
   */
  function hideProfilePopover() {
    const popover = document.querySelector('.mobile-roster-profile-popover');
    if (popover) {
      popover.classList.remove('visible');
      console.info('[MobileRoster] Hiding profile popover');
    }
  }
  
  /**
   * Cancel long press
   */
  function cancelLongPress() {
    if (state.longPressTimer) {
      clearTimeout(state.longPressTimer);
      state.longPressTimer = null;
      state.longPressTarget = null;
    }
  }
  
  /**
   * Start long press detection
   * @param {HTMLElement} tile - Tile element
   * @param {Object} player - Player object
   * @param {boolean} isEvicted - Whether player is evicted
   */
  function startLongPress(tile, player, isEvicted) {
    cancelLongPress();
    
    state.longPressTarget = tile;
    state.longPressStarted = false;
    
    state.longPressTimer = setTimeout(() => {
      // Mark that long press was triggered
      state.longPressStarted = true;
      
      // Show profile sheet (bottom sheet)
      showProfilePopover(player, isEvicted);
      
      // Clean up
      state.longPressTimer = null;
      state.longPressTarget = null;
      
      console.info('[MobileRoster] Long press triggered for', player.name);
    }, CONFIG.HOLD_DEBOUNCE_MS);
  }

  // ============================
  // Event Handlers
  // ============================
  
  /**
   * Handle tile click (short press)
   * Only trigger if it wasn't a long press.
   * Note: Click fires after pointerup, so we check the flag here.
   */
  function handleTileClick(event) {
    // Don't trigger if this was a long press
    // The pointerup handler sets this before cancelLongPress resets it
    if (state.longPressStarted) {
      state.longPressStarted = false;
      return;
    }
    
    const tile = event.currentTarget;
    const playerId = tile.getAttribute('data-player-id');
    const isEvicted = tile.getAttribute('data-evicted') === 'true';
    
    // Find player in activePlayers (which includes evicted now)
    const player = state.activePlayers.find(p => String(p.id) === String(playerId));
    
    // Check MOBILE_ROSTER_DISABLE_SPOTLIGHT flag
    const disableSpotlight = typeof window.MOBILE_ROSTER_DISABLE_SPOTLIGHT !== 'undefined' && 
                             window.MOBILE_ROSTER_DISABLE_SPOTLIGHT;
    
    if (player && !disableSpotlight) {
      focusPlayer(player, isEvicted);
    }
  }
  
  /**
   * Handle pointer down (start long press)
   */
  function handlePointerDown(event) {
    // Prevent default to suppress iOS native actions early
    if (isMobileUA()) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    const tile = event.currentTarget;
    const playerId = tile.getAttribute('data-player-id');
    const isEvicted = tile.getAttribute('data-evicted') === 'true';
    
    // Find player in activePlayers (which includes evicted now)
    const player = state.activePlayers.find(p => String(p.id) === String(playerId));
    
    if (player) {
      startLongPress(tile, player, isEvicted);
    }
  }
  
  /**
   * Handle pointer up/leave/cancel (cancel long press)
   * Note: Click handler checks longPressStarted BEFORE this runs,
   * so the flag is available when needed despite being reset here.
   */
  function handlePointerEnd() {
    // Cancel the long press timer
    // Click event fires after pointerup, and will check longPressStarted
    // before cancelLongPress resets it
    cancelLongPress();
  }
  
  /**
   * Handle scroll (cancel long press)
   */
  function handleScroll() {
    cancelLongPress();
    hideProfilePopover();
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
   * Per requirements: evicted players stay in main grid, not removed
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
      
      // Keep ALL players in activePlayers (requirement: evicted stay in main grid)
      // We render evicted players with special styling but don't remove them
      state.activePlayers = allPlayers;
      
      // Track evicted separately for reference (e.g., evicted drawer if needed)
      state.evictedPlayers = allPlayers.filter(p => p.evicted);
      
      // Sort evicted by eviction order (earliest first)
      state.evictedPlayers.sort((a, b) => {
        const aTime = a.evictedAt || 0;
        const bTime = b.evictedAt || 0;
        return aTime - bTime;
      });
      
      const activeCount = allPlayers.filter(p => !p.evicted).length;
      const evictedCount = state.evictedPlayers.length;
      
      console.info(`[MobileRoster] Updated: ${activeCount} active, ${evictedCount} evicted (all ${allPlayers.length} in main grid)`);
      
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
    
    state.lastInitAttempt = Date.now();
    state.initAttempts++;
    
    console.info('[MobileRoster] Initializing... (attempt ' + state.initAttempts + ')');
    
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
    
    // Set MOBILE_ROSTER_DISABLE_SPOTLIGHT flag
    if (typeof window.MOBILE_ROSTER_DISABLE_SPOTLIGHT === 'undefined') {
      window.MOBILE_ROSTER_DISABLE_SPOTLIGHT = true;
      console.info('[MobileRoster] Set MOBILE_ROSTER_DISABLE_SPOTLIGHT=true');
    }
    
    // Activate if mobile viewport
    if (isMobileViewport()) {
      activateMobileRoster();
      renderAll();
      console.info('[MobileRoster] Auto-activated on mobile viewport');
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
    
    // Listen for scroll to cancel long press and hide popover
    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });
    
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
    
    // Setup chip bar suppression
    setupChipBarSuppression();
    
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
  
  /**
   * Force enable mobile roster (for debugging)
   */
  function forceEnable() {
    console.info('[MobileRoster] Force enable triggered');
    window.FORCE_MOBILE_ROSTER = true;
    state.forced = true;
    
    if (!state.initialized) {
      init();
    }
    
    refresh();
  }

  /**
   * Get diagnostics status
   */
  function getStatus() {
    const container = document.querySelector('.mobile-roster-container');
    const tiles = document.querySelectorAll('.mobile-roster-tile');
    
    return {
      active: document.body.hasAttribute('data-mobile-roster-active'),
      tiles: tiles.length,
      badgesRendered: state.badgesRendered,
      lastInitAttempt: state.lastInitAttempt,
      initAttempts: state.initAttempts,
      forced: state.forced,
      initialized: state.initialized,
      containerExists: !!container,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: isMobileViewport(),
        isMobileUA: isMobileUA(),
        orientation: state.orientation
      }
    };
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
    forceEnable,
    getState: () => ({ ...state }), // Return copy for debugging
  };
  
  const MobileRosterDiagnostics = {
    getStatus
  };
  
  // Export to global scope
  global.MobileRoster = MobileRoster;
  global.MobileRosterDiagnostics = MobileRosterDiagnostics;
  
  console.info('[MobileRoster] Module loaded');
  
})(window);

// ============================
// Auto-initialization with retry
// ============================
(function autoInit() {
  'use strict';
  
  // Check for force flag on mobile UA
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  
  if (isMobileUA && typeof window.FORCE_MOBILE_ROSTER === 'undefined') {
    window.FORCE_MOBILE_ROSTER = true;
    console.info('[MobileRoster AutoInit] Set FORCE_MOBILE_ROSTER=true for mobile UA');
  }
  
  // Attempt initialization on DOMContentLoaded
  const attemptInit = () => {
    if (window.MobileRoster && typeof window.MobileRoster.init === 'function') {
      console.info('[MobileRoster AutoInit] Starting initialization...');
      window.MobileRoster.init();
      
      // Retry every 300ms for up to 3 seconds if container doesn't appear
      let retries = 0;
      const maxRetries = 10; // 10 * 300ms = 3s
      
      const retryInterval = setInterval(() => {
        const container = document.querySelector('.mobile-roster-container');
        const isActive = document.body.hasAttribute('data-mobile-roster-active');
        
        if (container && isActive) {
          console.info('[MobileRoster AutoInit] Container active, initialization successful');
          clearInterval(retryInterval);
        } else if (retries < maxRetries) {
          retries++;
          console.info('[MobileRoster AutoInit] Retry ' + retries + '/' + maxRetries + ' - calling refresh()');
          if (window.MobileRoster && typeof window.MobileRoster.refresh === 'function') {
            window.MobileRoster.refresh();
          }
        } else {
          console.warn('[MobileRoster AutoInit] Max retries reached, initialization may have failed');
          clearInterval(retryInterval);
        }
      }, 300);
      
      return true;
    }
    return false;
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attemptInit);
  } else {
    // DOM already loaded
    setTimeout(attemptInit, 0);
  }
  
  // Additional fallback on window.onload
  window.addEventListener('load', () => {
    if (!document.body.hasAttribute('data-mobile-roster-active') && 
        window.MobileRoster && 
        typeof window.MobileRoster.init === 'function') {
      console.info('[MobileRoster AutoInit] Fallback initialization on window.load');
      window.MobileRoster.init();
    }
  });
})();
