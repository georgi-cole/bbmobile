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
    MAX_TILE_SIZE: 110,            // Maximum tile size (px) - increased for larger photos
    GAP_SIZE: 4,                   // Default gap between tiles (px) - reduced for compact layout
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
    
    // Badge pill animation timing
    BADGE_PILL_DURATION: 7000,     // Badge pill persists up to 7 seconds (ms)
  };
  
  // ============================
  // State Management
  // ============================
  
  const state = {
    activePlayers: [],
    evictedPlayers: [],
    playersById: new Map(), // Canonical player store by ID for active session
    currentGameId: null, // Current game ID for scoping
    currentRoundId: null, // Current round ID for scoping
    lastEvents: [], // Rolling window of last events for diagnostics (max 20)
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
    evictedCount: 0, // Track evicted count for diagnostics
    phaseChangeHandler: null, // Handler for bb:phase:changed event
    
    // Badge pill animation state
    // Maps playerId -> { badgeType, timerId, startTime }
    activeBadgePills: new Map(),
    
    // Cold-start pill tracking - ensures we show pill on first render for existing statuses
    coldStartPillShown: false,
  };
  
  // Max events to keep in lastEvents rolling window
  const MAX_LAST_EVENTS = 20;
  
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
   * Shorten name for display (default 4 letters per requirements)
   */
  function shortenName(name, maxLength = 4) {
    if (!name) return 'Guest';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '…';
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
  // Event Handling & Player Resolution
  // ============================
  
  /**
   * Record an event in the lastEvents rolling window for diagnostics
   * @param {string} type - Event type
   * @param {Object} data - Event data (stored by reference, not copied)
   * @param {boolean} applied - Whether event was applied
   * @param {string} reason - Reason if not applied
   */
  function recordEvent(type, data, applied, reason = null) {
    // Store minimal event info - data stored by reference for efficiency
    const event = {
      type,
      data,
      applied,
      reason,
      timestamp: Date.now()
    };
    
    state.lastEvents.push(event);
    
    // Keep rolling window size
    if (state.lastEvents.length > MAX_LAST_EVENTS) {
      state.lastEvents.shift();
    }
    
    if (applied) {
      console.info(`[MobileRoster] Event applied: ${type}`, data);
    } else {
      console.warn(`[MobileRoster] Event ignored: ${type} - ${reason}`, data);
    }
  }
  
  /**
   * Resolve a player from the current roster by ID or name
   * Returns null if player is not in the current roster (ignores non-roster actors)
   * @param {Object} data - Event data with playerId or playerName
   * @returns {Object|null} Player object or null if not found
   */
  function resolvePlayerFromEvent(data) {
    if (!data) return null;
    
    // Priority 1: Use playerId directly
    if (data.playerId != null) {
      const player = state.playersById.get(String(data.playerId));
      if (player) {
        return player;
      }
      // Try numeric lookup only if playerId is a valid number
      const numericId = Number(data.playerId);
      if (!isNaN(numericId)) {
        const numericPlayer = state.playersById.get(numericId);
        if (numericPlayer) {
          return numericPlayer;
        }
      }
    }
    
    // Priority 2: Resolve by name (strict lookup in current roster only)
    if (data.playerName || data.name) {
      const searchName = (data.playerName || data.name).toLowerCase();
      for (const player of state.playersById.values()) {
        if (player.name && player.name.toLowerCase() === searchName) {
          return player;
        }
      }
    }
    
    // Not found in current roster
    return null;
  }
  
  /**
   * Validate event scope (gameId/roundId) against current session
   * @param {Object} data - Event data with optional gameId/roundId
   * @returns {boolean} True if event is in scope
   */
  function isEventInScope(data) {
    // If no scoping info provided, assume in scope
    if (!data) return true;
    
    // Check gameId if present
    if (data.gameId !== undefined && state.currentGameId !== null) {
      if (String(data.gameId) !== String(state.currentGameId)) {
        return false;
      }
    }
    
    // Check roundId if present
    if (data.roundId !== undefined && state.currentRoundId !== null) {
      if (String(data.roundId) !== String(state.currentRoundId)) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Handle a granular status event for a single player
   * Validates scope, resolves player, updates status, and triggers refresh
   * @param {string} eventType - Type of event (e.g., 'player:hoh', 'player:nominated')
   * @param {Object} data - Event data
   * @param {Function} updateFn - Function to update the player status
   */
  function handlePlayerStatusEvent(eventType, data, updateFn) {
    // Validate scope
    if (!isEventInScope(data)) {
      recordEvent(eventType, data, false, 'Event not in scope (gameId/roundId mismatch)');
      return;
    }
    
    // Resolve player
    const player = resolvePlayerFromEvent(data);
    if (!player) {
      recordEvent(eventType, data, false, 'Player not found in current roster');
      return;
    }
    
    // Update player status
    updateFn(player, data);
    
    // Record successful event
    recordEvent(eventType, data, true);
    
    // Trigger immediate refresh
    if (state.initialized && isMobileViewport()) {
      renderActiveGrid();
      updateTVFooterBar();
    }
  }
  
  /**
   * Create event handler for HOH status
   */
  function handleHOHEvent(data) {
    handlePlayerStatusEvent('player:hoh', data, (player, _eventData) => {
      // Clear HOH from all other players first
      for (const p of state.playersById.values()) {
        if (p.id !== player.id) {
          p.hoh = false;
          p.isHOH = false;
          p.hohWinner = false;
          // Clear corner emoji for old HOH
          clearCornerEmoji(p.id, 'HOH');
        }
      }
      // Set HOH for this player
      player.hoh = true;
      player.isHOH = true;
      player.hohWinner = true;
      
      // Trigger badge animation (pill then emoji)
      triggerBadgeAnimation(player.id, 'HOH');
    });
  }
  
  /**
   * Create event handler for Veto/POV status
   */
  function handleVetoEvent(data) {
    handlePlayerStatusEvent('player:veto', data, (player, _eventData) => {
      // Clear POV from all other players first
      for (const p of state.playersById.values()) {
        if (p.id !== player.id) {
          p.pov = false;
          p.veto = false;
          p.hasVeto = false;
          p.vetoHolder = false;
          // Clear corner emoji for old POV holder
          clearCornerEmoji(p.id, 'POV');
        }
      }
      // Set POV for this player
      player.pov = true;
      player.veto = true;
      player.hasVeto = true;
      player.vetoHolder = true;
      
      // Trigger badge animation (pill then emoji)
      triggerBadgeAnimation(player.id, 'POV');
    });
  }
  
  /**
   * Create event handler for Nominated status
   */
  function handleNominatedEvent(data) {
    handlePlayerStatusEvent('player:nominated', data, (player, _eventData) => {
      player.nominated = true;
      player.isNominated = true;
      player.nominee = true;
      player.isNominee = true;
      
      // Trigger badge animation (pill then emoji)
      triggerBadgeAnimation(player.id, 'NOM');
    });
  }
  
  /**
   * Create event handler for Replacement Nominee status
   */
  function handleReplacementNomEvent(data) {
    handlePlayerStatusEvent('player:replacement_nom', data, (player, _eventData) => {
      player.nominated = true;
      player.isNominated = true;
      player.nominee = true;
      player.isNominee = true;
      player.replacementNominee = true;
      
      // Trigger badge animation (pill then emoji)
      triggerBadgeAnimation(player.id, 'NOM');
    });
  }
  
  /**
   * Create event handler for Safe status (saved from block)
   */
  function handleSafeEvent(data) {
    handlePlayerStatusEvent('player:safe', data, (player, _eventData) => {
      // Player is saved - clear nomination status
      player.nominated = false;
      player.isNominated = false;
      player.nominee = false;
      player.isNominee = false;
      // Clear NOM emoji if present
      clearCornerEmoji(player.id, 'NOM');
      
      // Set safe status
      player.safe = true;
      player.isSafe = true;
      player.immunity = true;
      player.protected = true;
      
      // Trigger badge animation (pill then emoji)
      triggerBadgeAnimation(player.id, 'SAFE');
    });
  }
  
  /**
   * Create event handler for badge removal
   * Called when a badge (HOH, POV, NOM, SAFE) is removed from a player
   */
  function handleBadgeRemoveEvent(data) {
    handlePlayerStatusEvent('badge:remove', data, (player, eventData) => {
      const badgeType = eventData.badgeType || eventData.type;
      
      console.info(`[MobileRoster] Badge remove event: ${badgeType} for player ${player.id}`);
      
      // Clear the specific badge status
      if (badgeType === 'HOH') {
        player.hoh = false;
        player.isHOH = false;
        player.hohWinner = false;
        clearCornerEmoji(player.id, 'HOH');
      } else if (badgeType === 'POV') {
        player.pov = false;
        player.veto = false;
        player.hasVeto = false;
        player.vetoHolder = false;
        clearCornerEmoji(player.id, 'POV');
      } else if (badgeType === 'NOM') {
        player.nominated = false;
        player.isNominated = false;
        player.nominee = false;
        player.isNominee = false;
        player.replacementNominee = false;
        clearCornerEmoji(player.id, 'NOM');
      } else if (badgeType === 'SAFE') {
        player.safe = false;
        player.isSafe = false;
        player.immunity = false;
        player.protected = false;
        clearCornerEmoji(player.id, 'SAFE');
      } else {
        // Unknown badge type - clear all emojis for this player
        clearCornerEmoji(player.id);
      }
      
      // Dismiss any active badge pill for this player (don't show emoji since badge is removed)
      dismissBadgePill(player.id, false);
    });
  }
  
  /**
   * Create event handler for nominee replaced
   * Called when a veto is used and a nominee is saved/replaced
   */
  function handleNomineeReplacedEvent(data) {
    handlePlayerStatusEvent('nominee:replaced', data, (player, _eventData) => {
      console.info(`[MobileRoster] Nominee replaced event for player ${player.id}`);
      
      // Clear nomination status
      player.nominated = false;
      player.isNominated = false;
      player.nominee = false;
      player.isNominee = false;
      player.replacementNominee = false;
      
      // Clear NOM emoji
      clearCornerEmoji(player.id, 'NOM');
      
      // Dismiss badge pill without showing emoji (player is no longer nominated)
      dismissBadgePill(player.id, false);
    });
  }
  
  /**
   * Create event handler for Evicted status
   */
  function handleEvictedEvent(data) {
    handlePlayerStatusEvent('player:evicted', data, (player, eventData) => {
      // Only increment if not already evicted
      const wasNotEvicted = !player.evicted;
      
      player.evicted = true;
      player.state = 'evicted';
      player.evictedWeek = eventData.week || eventData.evictedWeek || state.evictedCount + 1;
      player.evictedAt = player.evictedWeek;
      
      // Clear other statuses and emojis
      player.hoh = false;
      player.pov = false;
      player.nominated = false;
      player.safe = false;
      
      // Clear all corner emojis for evicted player
      clearCornerEmoji(player.id);
      
      // Dismiss any active badge pill for this player
      dismissBadgePill(player.id, false);
      
      // Increment evicted count efficiently
      if (wasNotEvicted) {
        state.evictedCount++;
      }
    });
  }
  
  /**
   * Sync playersById store from activePlayers array
   */
  function syncPlayersById() {
    state.playersById.clear();
    for (const player of state.activePlayers) {
      // Store with both string and number keys for flexible lookups
      state.playersById.set(String(player.id), player);
      if (typeof player.id === 'number') {
        state.playersById.set(player.id, player);
      }
    }
    
    // Update game/round scoping from global state
    const game = global.game || {};
    state.currentGameId = game.gameId || game.id || null;
    state.currentRoundId = game.roundId || game.week || null;
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
  // Status Normalization
  // ============================
  
  /**
   * Normalize player status properties from canonical game state.
   * IMPORTANT: This function now reads from canonical game state as the single
   * source of truth for HOH, POV, and NOM badges. This ensures badges are
   * always in sync with the actual game state.
   * 
   * Maps various property names to canonical status properties:
   * - game.hohId -> hoh
   * - game.vetoHolder -> pov
   * - game.nominees -> nominated
   * - immunity, protected, isSafe -> safe
   * - state==='evicted', evictedWeek, evictWeek, evicted -> evicted
   * 
   * Note: This function intentionally mutates the player object to cache
   * normalized values for performance. The original properties are preserved.
   */
  function normalizeStatus(player) {
    if (!player || typeof player !== 'object') return player;
    
    // Get canonical game state
    const game = global.game || {};
    const playerId = player.id;
    
    // Evicted normalization - check first as it affects other statuses
    // Check state, evictedWeek, evictWeek
    if (player.evicted === undefined) {
      const hasEvictedWeek = player.evictedWeek !== null && player.evictedWeek !== undefined;
      const hasEvictWeek = player.evictWeek !== null && player.evictWeek !== undefined;
      const isEvictedState = player.state === 'evicted';
      
      if (isEvictedState || hasEvictedWeek || hasEvictWeek) {
        player.evicted = true;
      }
    }
    
    const isEvicted = player.evicted === true;
    
    // HOH normalization - use canonical game.hohId as single source of truth
    // Also check player properties for backward compatibility
    // Note: Evicted players cannot be HOH
    const isCanonicalHOH = !isEvicted && game.hohId === playerId;
    const hasHOHProperty = !isEvicted && (player.isHOH || player.hohWinner || player.hoh === true);
    player.hoh = isCanonicalHOH || hasHOHProperty;
    
    // POV/Veto normalization - use canonical game.vetoHolder as single source of truth
    // Also check player properties for backward compatibility
    // Note: Evicted players cannot hold POV
    const isCanonicalPOV = !isEvicted && game.vetoHolder === playerId;
    const hasPOVProperty = !isEvicted && (player.veto || player.hasVeto || player.vetoHolder || player.pov === true);
    player.pov = isCanonicalPOV || hasPOVProperty;
    
    // Nominated normalization - use canonical game.nominees as single source of truth
    // Also check player properties for backward compatibility
    // Note: Evicted players cannot be nominated
    const nominees = Array.isArray(game.nominees) ? game.nominees : [];
    const isCanonicalNominated = !isEvicted && nominees.includes(playerId);
    const hasNominatedProperty = !isEvicted && (player.isNominated || player.nominee || player.isNominee || player.nominated === true);
    player.nominated = isCanonicalNominated || hasNominatedProperty;
    
    // Safe/immunity normalization - check immunity, protected, isSafe
    // Note: Only active players can have safe status
    if (player.safe === undefined) {
      if (!isEvicted && (player.immunity || player.protected || player.isSafe)) {
        player.safe = true;
      }
    }
    
    // Replacement nominee normalization - check various property names
    if (!isEvicted && player.replacementNominee === undefined) {
      if (player.isReplacementNominee || player.replacement_nominee) {
        player.replacementNominee = true;
        // Replacement nominees are also nominated
        player.nominated = true;
      }
    }
    
    return player;
  }
  
  /**
   * Maximum combined badge text length before emoji fallback is used
   * e.g., "HOH+POV" = 7 chars, "HOH+POV+NOM" = 11 chars
   */
  const MAX_BADGE_TEXT_LENGTH = 8;
  
  /**
   * Emoji fallbacks for status badges
   * Used when text would overflow the badge container
   * Note: Only HOH, POV, NOM, SAFE are used on mobile tiles
   */
  const BADGE_EMOJI_MAP = {
    'HOH': '👑',
    'POV': '🛡️',
    'NOM': '❓',
    'SAFE': '✅'
  };
  
  /**
   * Badge pill animation system
   * 
   * When a badge-granting event triggers (HOH win, POV win, nomination, etc):
   * 1. A badge pill appears centered in place of the name in the avatar tile footer
   * 2. The pill persists up to 7 seconds
   * 3. If phase advances early (fast forward, live update, badge removal, etc),
   *    the pill is dismissed immediately
   * 4. After dismissal, badge emoji appears in avatar's upper-right corner
   * 5. Emoji persists as long as the badge logic dictates (per game event specs)
   */
  
  /**
   * Show a badge pill for a player
   * The pill replaces the player's name temporarily
   * @param {string|number} playerId - Player ID
   * @param {string} badgeType - Badge type ('HOH', 'POV', 'NOM', 'SAFE')
   */
  function showBadgePill(playerId, badgeType) {
    // Sanitize playerId for CSS selector
    const safePlayerId = CSS.escape(String(playerId));
    const tile = document.querySelector(`.mobile-roster-tile[data-player-id="${safePlayerId}"]`);
    if (!tile) {
      console.warn(`[MobileRoster] Cannot show badge pill: tile not found for player ${playerId}`);
      return;
    }
    
    // Cancel any existing pill animation for this player
    dismissBadgePill(playerId, false);
    
    // Find name element
    const nameEl = tile.querySelector('.mobile-roster-name');
    if (!nameEl) return;
    
    // Store original name for restoration
    const originalName = nameEl.textContent;
    nameEl.dataset.originalName = originalName;
    
    // Get badge styling - badgeType is validated against BADGE_EMOJI_MAP
    const badgeClass = badgeType.toLowerCase();
    const badgeText = badgeType;
    
    // Replace name with pill using DOM methods to avoid innerHTML XSS
    nameEl.textContent = '';
    const pillSpan = document.createElement('span');
    pillSpan.className = `badge-pill badge-pill-${CSS.escape(badgeClass)}`;
    pillSpan.dataset.badgeType = badgeType;
    pillSpan.textContent = badgeText;
    nameEl.appendChild(pillSpan);
    nameEl.classList.add('badge-pill-active');
    
    // Set timer to dismiss pill and show corner emoji
    const timerId = setTimeout(() => {
      dismissBadgePill(playerId, true);
    }, CONFIG.BADGE_PILL_DURATION);
    
    // Track active pill animation
    state.activeBadgePills.set(String(playerId), {
      badgeType,
      timerId,
      startTime: Date.now(),
      originalName
    });
    
    console.info(`[MobileRoster] Badge pill shown: ${badgeType} for player ${playerId}`);
  }
  
  /**
   * Dismiss a badge pill and show corner emoji
   * @param {string|number} playerId - Player ID
   * @param {boolean} showEmoji - Whether to show corner emoji after dismissal
   */
  function dismissBadgePill(playerId, showEmoji = true) {
    const pillData = state.activeBadgePills.get(String(playerId));
    if (!pillData) return;
    
    // Clear timer
    if (pillData.timerId) {
      clearTimeout(pillData.timerId);
    }
    
    // Sanitize playerId for CSS selector
    const safePlayerId = CSS.escape(String(playerId));
    const tile = document.querySelector(`.mobile-roster-tile[data-player-id="${safePlayerId}"]`);
    if (tile) {
      const nameEl = tile.querySelector('.mobile-roster-name');
      if (nameEl) {
        // Restore original name
        nameEl.textContent = pillData.originalName || nameEl.dataset.originalName || '';
        nameEl.classList.remove('badge-pill-active');
        delete nameEl.dataset.originalName;
      }
      
      // Show corner emojis if requested
      if (showEmoji) {
        // Get player to check all current badges for combo display
        const player = state.playersById.get(String(playerId));
        if (player) {
          normalizeStatus(player);
          
          // Collect all active badges
          const badges = [];
          if (player.hoh) badges.push('HOH');
          if (player.pov) badges.push('POV');
          if (player.nominated) badges.push('NOM');
          if (player.safe && badges.length === 0) badges.push('SAFE');
          
          if (badges.length > 1) {
            // Multiple badges - show combo
            showComboEmojis(playerId, badges);
          } else if (badges.length === 1) {
            // Single badge
            showCornerEmoji(playerId, badges[0]);
          } else if (pillData.badgeType) {
            // Fallback: show the pill's badge type
            showCornerEmoji(playerId, pillData.badgeType);
          }
        } else if (pillData.badgeType) {
          // No player found, use the badge type from the pill
          showCornerEmoji(playerId, pillData.badgeType);
        }
      }
    }
    
    // Remove from active pills
    state.activeBadgePills.delete(String(playerId));
    
    console.info(`[MobileRoster] Badge pill dismissed for player ${playerId}, showEmoji: ${showEmoji}`);
  }
  
  /**
   * Dismiss all active badge pills (e.g., on phase advance)
   * @param {boolean} showEmojis - Whether to show corner emojis after dismissal
   */
  function dismissAllBadgePills(showEmojis = true) {
    const playerIds = [...state.activeBadgePills.keys()];
    for (const playerId of playerIds) {
      dismissBadgePill(playerId, showEmojis);
    }
    console.info(`[MobileRoster] Dismissed ${playerIds.length} active badge pills`);
  }
  
  /**
   * Show a corner emoji badge on the avatar
   * The emoji appears in the upper-right corner of the avatar
   * @param {string|number} playerId - Player ID
   * @param {string} badgeType - Badge type ('HOH', 'POV', 'NOM', 'SAFE')
   */
  function showCornerEmoji(playerId, badgeType) {
    // Sanitize playerId for CSS selector
    const safePlayerId = CSS.escape(String(playerId));
    const tile = document.querySelector(`.mobile-roster-tile[data-player-id="${safePlayerId}"]`);
    if (!tile) return;
    
    const avatarWrap = tile.querySelector('.mobile-roster-avatar-wrap');
    if (!avatarWrap) return;
    
    // Get emoji for badge type (validates badgeType against BADGE_EMOJI_MAP)
    const emoji = BADGE_EMOJI_MAP[badgeType];
    if (!emoji) return;
    
    // Get or create the emoji group container for combo emojis
    let emojiGroup = avatarWrap.querySelector('.corner-emoji-group');
    if (!emojiGroup) {
      emojiGroup = document.createElement('div');
      emojiGroup.className = 'corner-emoji-group';
      emojiGroup.setAttribute('aria-label', 'Player badges');
      avatarWrap.appendChild(emojiGroup);
    }
    
    // Check if this badge type already exists in the group
    const safeBadgeClass = CSS.escape(badgeType.toLowerCase());
    const existingEmoji = emojiGroup.querySelector(`.corner-emoji-${safeBadgeClass}`);
    if (existingEmoji) {
      // Already exists, don't duplicate
      return;
    }
    
    // Create corner emoji element using DOM methods
    const emojiEl = document.createElement('span');
    emojiEl.className = `corner-emoji-badge corner-emoji-${safeBadgeClass}`;
    emojiEl.textContent = emoji;
    emojiEl.setAttribute('aria-label', badgeType);
    emojiEl.dataset.badgeType = badgeType;
    
    // Insert in priority order: HOH > POV > NOM > SAFE
    const priorityOrder = ['HOH', 'POV', 'NOM', 'SAFE'];
    const newPriority = priorityOrder.indexOf(badgeType);
    let inserted = false;
    
    for (const child of emojiGroup.children) {
      const childType = child.dataset.badgeType;
      const childPriority = priorityOrder.indexOf(childType);
      if (newPriority < childPriority) {
        emojiGroup.insertBefore(emojiEl, child);
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      emojiGroup.appendChild(emojiEl);
    }
    
    // Update group data-badge-count for CSS fallback (browsers without :has())
    emojiGroup.dataset.badgeCount = emojiGroup.children.length;
    
    // Update group aria-label with all badges
    const allBadges = Array.from(emojiGroup.querySelectorAll('.corner-emoji-badge'))
      .map(el => el.dataset.badgeType)
      .filter(Boolean);
    emojiGroup.setAttribute('aria-label', allBadges.join(' and '));
    
    console.info(`[MobileRoster] Corner emoji shown: ${emoji} (${badgeType}) for player ${playerId}. Group now has ${emojiGroup.children.length} emojis`);
  }
  
  /**
   * Show combo emojis for a player with multiple statuses
   * Displays a compact group element (top-right of avatar) with multiple tokens
   * e.g., 👑+🛡️ for HOH+POV, 🛡️+❓ for POV+NOM
   * @param {string|number} playerId - Player ID
   * @param {Array<string>} badgeTypes - Array of badge types in priority order
   */
  function showComboEmojis(playerId, badgeTypes) {
    if (!playerId || !Array.isArray(badgeTypes) || badgeTypes.length === 0) return;
    
    // Filter valid badge types
    const validBadges = badgeTypes.filter(t => BADGE_EMOJI_MAP[t]);
    if (validBadges.length === 0) return;
    
    // Clear any existing emojis for this player first
    clearCornerEmoji(playerId);
    
    // Show each badge in order
    for (const badge of validBadges) {
      showCornerEmoji(playerId, badge);
    }
    
    console.info(`[MobileRoster] Combo emojis shown for player ${playerId}: ${validBadges.join('+')}`);
  }
  
  /**
   * Clear corner emoji from an avatar
   * @param {string|number} playerId - Player ID
   * @param {string} [badgeType] - Optional badge type to clear specifically, or all if omitted
   */
  function clearCornerEmoji(playerId, badgeType) {
    // Sanitize playerId for CSS selector
    const safePlayerId = CSS.escape(String(playerId));
    const tile = document.querySelector(`.mobile-roster-tile[data-player-id="${safePlayerId}"]`);
    if (!tile) return;
    
    const avatarWrap = tile.querySelector('.mobile-roster-avatar-wrap');
    if (!avatarWrap) return;
    
    const emojiGroup = avatarWrap.querySelector('.corner-emoji-group');
    
    if (badgeType) {
      // Clear specific badge type - sanitize for CSS selector
      const safeBadgeClass = CSS.escape(badgeType.toLowerCase());
      
      // Check in group first
      if (emojiGroup) {
        const emojiEl = emojiGroup.querySelector(`.corner-emoji-${safeBadgeClass}`);
        if (emojiEl) {
          emojiEl.remove();
          console.info(`[MobileRoster] Corner emoji cleared: ${badgeType} for player ${playerId}`);
          
          // Update badge count data attribute for CSS fallback
          emojiGroup.dataset.badgeCount = emojiGroup.children.length;
          
          // If group is now empty, remove the group
          if (emojiGroup.children.length === 0) {
            emojiGroup.remove();
          }
          return;
        }
      }
      
      // Fallback: check for standalone emoji (legacy)
      const standaloneEmoji = avatarWrap.querySelector(`.corner-emoji-${safeBadgeClass}`);
      if (standaloneEmoji) {
        standaloneEmoji.remove();
        console.info(`[MobileRoster] Corner emoji cleared: ${badgeType} for player ${playerId}`);
      }
    } else {
      // Clear all corner emojis
      if (emojiGroup) {
        emojiGroup.remove();
      }
      // Also clear any standalone emojis (legacy)
      avatarWrap.querySelectorAll('.corner-emoji-badge').forEach(el => el.remove());
      console.info(`[MobileRoster] All corner emojis cleared for player ${playerId}`);
    }
  }
  
  /**
   * Handle badge event - show pill animation then corner emoji
   * Called when a badge-granting event occurs (HOH win, POV win, nomination, etc)
   * @param {string|number} playerId - Player ID
   * @param {string} badgeType - Badge type ('HOH', 'POV', 'NOM', 'SAFE')
   */
  function triggerBadgeAnimation(playerId, badgeType) {
    if (!playerId || !badgeType) return;
    
    // Validate badge type
    if (!BADGE_EMOJI_MAP[badgeType]) {
      console.warn(`[MobileRoster] Unknown badge type: ${badgeType}`);
      return;
    }
    
    // Show pill animation
    showBadgePill(playerId, badgeType);
  }
  
  /**
   * Compute badge tokens for a player
   * Returns array of tokens in priority order: HOH > POV > NOM > SAFE
   * Note: EVICTED is NOT returned - red cross overlay is sufficient on mobile tiles
   * @param {Object} player - Player object (should be normalized first)
   * @returns {Array<string>} Array of badge tokens
   */
  function computeBadges(player) {
    if (!player || typeof player !== 'object') return [];
    
    // Normalize status first
    normalizeStatus(player);
    
    // Note: Evicted players do NOT get an EVICTED badge on mobile
    // The red cross overlay is sufficient visual indicator
    if (player.evicted) {
      return []; // No badge - red cross is sufficient
    }
    
    const tokens = [];
    
    // Priority order: HOH > POV > NOM > SAFE
    if (player.hoh) tokens.push('HOH');
    if (player.pov) tokens.push('POV');
    if (player.nominated) tokens.push('NOM');
    // SAFE only shows if no other status badges
    if (player.safe && tokens.length === 0) {
      tokens.push('SAFE');
    }
    
    return tokens;
  }
  
  /**
   * Get dynamic font-size class based on badge text length
   * @param {string} text - Badge text
   * @returns {string} CSS class for font sizing
   */
  function getBadgeSizeClass(text) {
    if (!text) return '';
    const len = text.length;
    if (len > 9) return 'badge-size-xs';
    if (len > 7) return 'badge-size-sm';
    return '';
  }
  
  /**
   * Check if badge text would overflow and needs emoji fallback
   * Uses a simple heuristic based on token count and combined length
   * @param {Array<string>} tokens - Array of status tokens
   * @returns {boolean} True if emoji fallback should be used
   */
  function shouldUseEmojiFallback(tokens) {
    if (!tokens || tokens.length === 0) return false;
    
    // Single tokens (HOH, POV, NOM, SAFE) always fit - max 4 chars
    if (tokens.length === 1) {
      return false;
    }
    
    // Multiple tokens (combo): check combined length
    const combinedLength = tokens.join('+').length;
    
    // Use emoji if combined text exceeds threshold
    return combinedLength > MAX_BADGE_TEXT_LENGTH;
  }
  
  /**
   * Get emoji display for tokens
   * Falls back to original token if no emoji mapping exists
   * @param {Array<string>} tokens - Array of status tokens
   * @returns {string} Emoji string (e.g., "👑+🛡️" for HOH+POV)
   */
  function getEmojiDisplay(tokens) {
    if (!tokens || tokens.length === 0) return '';
    
    // Map tokens to emoji, falling back to emoji '❓' for unknown tokens
    // to maintain consistent visual style
    return tokens.map(t => BADGE_EMOJI_MAP[t] || '❓').join('+');
  }
  
  /**
   * Render status chips HTML for a player
   * Creates centered single-row chip container.
   * Uses emoji fallback when text would overflow.
   * @param {Array<string>} tokens - Array of status tokens (HOH, POV, NOM, SAFE)
   * @returns {string} HTML string for status chips overlay, or empty string if not applicable
   */
  function renderStatusChipsHTML(tokens) {
    if (!tokens || tokens.length === 0) {
      return '';
    }
    
    // Map tokens to chip classes
    const classMap = {
      'HOH': 'chip-hoh',
      'POV': 'chip-pov',
      'NOM': 'chip-nom',
      'SAFE': 'chip-safe',
      'EVICTED': 'chip-evict'
    };
    
    // For single token, use the standard badge overlay
    // For multiple tokens (combo), render individual chips in container
    if (tokens.length === 1) {
      return ''; // Let getCombinedBadgeInfo handle single badges
    }
    
    /**
     * Escape HTML special characters to prevent XSS
     * @param {string} str - String to escape
     * @returns {string} Escaped string
     */
    function escapeHTML(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }
    
    // Determine if we should use emoji fallback for overflow prevention
    const useEmoji = shouldUseEmojiFallback(tokens);
    
    // Build individual chips for combo badges with escaped content
    const chipsHTML = tokens.map(token => {
      const chipClass = classMap[token] || '';
      // Use emoji fallback if needed
      const displayText = useEmoji ? BADGE_EMOJI_MAP[token] : token;
      const safeToken = escapeHTML(displayText);
      return `<span class="${chipClass}">${safeToken}</span>`;
    }).join('');
    
    // Escape aria-label value to prevent attribute injection (always use full text for a11y)
    const ariaLabel = escapeHTML(tokens.join(' and '));
    
    return `<div class="mobile-roster-status-chips" aria-label="${ariaLabel}">${chipsHTML}</div>`;
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
    // Handle explicit evicted parameter first (takes priority)
    if (isEvicted) {
      // Mark player as evicted for normalization
      if (player && !player.evicted) {
        player.evicted = true;
      }
    }
    
    // Use computeBadges to get tokens (handles normalization internally)
    // Note: computeBadges returns empty array for evicted players (red cross sufficient)
    const tokens = computeBadges(player);
    
    if (tokens.length === 0) {
      return null;
    }
    
    // Note: EVICTED case is now handled by returning null above
    // since computeBadges returns [] for evicted players
    
    // Check if we should use emoji fallback for combo badges
    const useEmoji = shouldUseEmojiFallback(tokens);
    
    // Build display text - use emoji for combos if needed
    let text;
    if (useEmoji) {
      text = getEmojiDisplay(tokens);
    } else {
      text = tokens.join('+');
    }
    
    // Determine class (use first status for styling)
    const classMap = {
      'HOH': 'hoh',
      'POV': 'pov',
      'NOM': 'nom',
      'SAFE': 'safe'
    };
    const badgeClass = classMap[tokens[0]] || 'default';
    
    return { text, class: badgeClass, tokens, useEmoji };
  }

  /**
   * Create HTML for a roster tile
   */
  function createTileHTML(player, isEvicted = false) {
    const avatar = getPlayerAvatar(player);
    const name = shortenName(player.name || 'Guest');
    const statusLabel = getPlayerStatusLabel(player, isEvicted);
    const loadingStrategy = shouldUseEagerLoading() ? 'eager' : 'lazy';
    
    // Normalize status first
    normalizeStatus(player);
    
    // Note: Badge info is used for pill/emoji logic, not for inline badge rendering
    // Badge display is now handled exclusively via:
    // 1. Pill animation (replaces name footer for ~7s) - via showBadgePill()
    // 2. Corner emoji (top-right of avatar after pill dismissal) - via showCornerEmoji()
    // This avoids the "double badge" issue where badge appeared both on avatar AND as pill.
    
    // Debug tag showing normalized flags (only visible in debug mode)
    let debugTag = '';
    if (isDebugMode()) {
      const flags = [];
      if (player.hoh) flags.push('hoh');
      if (player.pov) flags.push('pov');
      if (player.nominated) flags.push('nom');
      if (player.safe) flags.push('safe');
      if (player.evicted || isEvicted) flags.push('evict');
      const flagStr = flags.length > 0 ? flags.join(',') : 'none';
      debugTag = `<div class="mobile-roster-debug-tag" aria-hidden="true">${flagStr}</div>`;
    }
    
    const evictedClass = isEvicted ? 'evicted' : '';
    const fallbackUrl = global.getAvatarFallback ? 
      global.getAvatarFallback(player.name || player.id, null) : 
      avatar;
    
    // Escape player ID and name for safe HTML attribute usage
    const safePlayerId = String(player.id).replace(/"/g, '&quot;');
    const safeName = String(player.name || 'Guest').replace(/"/g, '&quot;');
    
    // Note: badgeHTML is NOT rendered here anymore.
    // Badge logic is now handled exclusively via:
    // 1. Pill animation (replaces name footer for ~7s) - via showBadgePill()
    // 2. Corner emoji (top-right of avatar after pill dismissal) - via showCornerEmoji()
    // This avoids the "double badge" issue where badge appeared both on avatar AND as pill.
    
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
        </div>
        <div class="mobile-roster-name">${name}</div>
        ${debugTag}
      </button>
    `;
  }
  
  /**
   * Render the active players grid (includes evicted with special styling)
   */
  function renderActiveGrid() {
    const container = document.querySelector('.mobile-roster-active-grid');
    if (!container) return;
    
    // ROSTER GATING: Check if avatars are ready in strict mode
    // If avatars are preloading, add gated class and wait for avatars:ready event
    const avatarsPreloading = (global.game && global.game.state && global.game.state.avatarsPreloading) || global.__avatarsPreloading;
    const cfg = (global.game && global.game.cfg) || global.cfg || {};
    const strictMode = cfg.avatarPreloadRequireAll === true;
    
    if (avatarsPreloading && strictMode) {
      // Add gated class to hide roster while avatars load
      container.classList.add('roster-grid--gated');
      container.classList.remove('roster-grid--ready');
      
      // Log telemetry for gating
      if (global.Telemetry && typeof global.Telemetry.log === 'function') {
        global.Telemetry.log('roster_gated', { strictMode: true });
      } else {
        console.info('[RosterGate] Roster gated - waiting for avatars:ready event');
      }
      
      return; // Do not render until avatars are ready
    }
    
    // Sync badge states from canonical game state before rendering
    // This ensures badges are always up-to-date with HOH, POV, and nominations
    if (typeof global.syncPlayerBadgeStates === 'function') {
      try {
        global.syncPlayerBadgeStates();
      } catch (e) {
        console.warn('[MobileRoster] Badge sync failed:', e);
      }
    }
    
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
        
        // Prevent iOS native image actions (contextmenu, drag, etc.)
        img.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          e.stopPropagation();
          return false;
        });
        
        // Prevent default on pointerdown for images to suppress iOS callout
        img.addEventListener('pointerdown', (e) => {
          if (isMobileUA()) {
            e.preventDefault();
          }
        });
        
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
    
    // Post-render: restore any active badge pills that were interrupted by render
    restoreActiveBadgePills();
    
    // Post-render: trigger cold-start pills for players with existing statuses
    // This must run BEFORE syncCornerEmojisFromStatus so pills take precedence
    if (!state.coldStartPillShown && state.activeBadgePills.size === 0) {
      triggerColdStartPills();
    }
    
    // Post-render: sync corner emojis for players with existing statuses
    // (only for players without active pills)
    syncCornerEmojisFromStatus();
    
    // Update spacer height fallback if overlaySpacing module is not present
    updateSpacerFallback();
  }
  
  /**
   * Restore active badge pills after a grid re-render
   * When renderActiveGrid() is called, it destroys existing DOM elements including pills.
   * This function re-creates the pill UI for any active pill animations.
   */
  function restoreActiveBadgePills() {
    for (const [playerId, pillData] of state.activeBadgePills.entries()) {
      // Recalculate remaining time
      const elapsed = Date.now() - pillData.startTime;
      const remaining = CONFIG.BADGE_PILL_DURATION - elapsed;
      
      if (remaining <= 0) {
        // Pill should have already dismissed - clean it up
        dismissBadgePill(playerId, true);
        continue;
      }
      
      // Re-create the pill DOM
      const safePlayerId = CSS.escape(String(playerId));
      const tile = document.querySelector(`.mobile-roster-tile[data-player-id="${safePlayerId}"]`);
      if (!tile) continue;
      
      const nameEl = tile.querySelector('.mobile-roster-name');
      if (!nameEl) continue;
      
      // Store original name (if not already stored)
      if (!pillData.originalName) {
        pillData.originalName = nameEl.textContent;
      }
      
      // Replace name with pill using DOM methods
      const badgeClass = pillData.badgeType.toLowerCase();
      const badgeText = pillData.badgeType;
      
      nameEl.textContent = '';
      const pillSpan = document.createElement('span');
      pillSpan.className = `badge-pill badge-pill-${CSS.escape(badgeClass)}`;
      pillSpan.dataset.badgeType = pillData.badgeType;
      pillSpan.textContent = badgeText;
      nameEl.appendChild(pillSpan);
      nameEl.classList.add('badge-pill-active');
      
      // Update the timer for remaining time
      if (pillData.timerId) {
        clearTimeout(pillData.timerId);
      }
      
      const newTimerId = setTimeout(() => {
        dismissBadgePill(playerId, true);
      }, remaining);
      
      pillData.timerId = newTimerId;
      
      console.info(`[MobileRoster] Restored badge pill: ${pillData.badgeType} for player ${playerId}, ${remaining}ms remaining`);
    }
  }
  
  /**
   * Sync corner emoji badges for all players with existing statuses
   * Called after grid render to ensure emojis are visible immediately.
   * Supports combo emojis (e.g., HOH+POV, NOM+POV) for multi-status players.
   */
  function syncCornerEmojisFromStatus() {
    for (const player of state.activePlayers) {
      // Skip evicted players - they don't get badge emojis
      if (player.evicted) continue;
      
      // Normalize status to get canonical flags
      normalizeStatus(player);
      
      // Only show emoji if player has an active badge AND no pill animation is active
      if (state.activeBadgePills.has(String(player.id))) {
        // Pill is active, don't show emoji yet
        continue;
      }
      
      // Collect all badges for this player (priority order: HOH > POV > NOM > SAFE)
      const badges = [];
      if (player.hoh) badges.push('HOH');
      if (player.pov) badges.push('POV');
      if (player.nominated) badges.push('NOM');
      // SAFE only shows if no other status badges (per spec)
      if (player.safe && badges.length === 0) {
        badges.push('SAFE');
      }
      
      if (badges.length > 1) {
        // Multiple badges - show combo
        showComboEmojis(player.id, badges);
      } else if (badges.length === 1) {
        // Single badge
        showCornerEmoji(player.id, badges[0]);
      }
    }
  }
  
  /**
   * Trigger cold-start pill for players with existing statuses
   * Per spec: "Do not bypass the pill at cold start when statuses already exist:
   * show one pill for the highest-priority new or cold-start token (HOH > POV > NOM > SAFE),
   * then the emoji group."
   * 
   * This function is called on the first render after initialization.
   * It finds all players with active statuses and triggers a pill animation
   * for the highest-priority badge, then shows the emoji group after pill dismissal.
   */
  function triggerColdStartPills() {
    if (state.coldStartPillShown) {
      // Already shown cold-start pills, skip
      return;
    }
    
    // Mark as shown to prevent re-triggering
    state.coldStartPillShown = true;
    
    // Find all players with active statuses
    const playersWithStatus = [];
    
    for (const player of state.activePlayers) {
      if (player.evicted) continue;
      
      normalizeStatus(player);
      
      // Determine the highest-priority badge for this player
      let highestBadge = null;
      if (player.hoh) {
        highestBadge = 'HOH';
      } else if (player.pov) {
        highestBadge = 'POV';
      } else if (player.nominated) {
        highestBadge = 'NOM';
      } else if (player.safe) {
        highestBadge = 'SAFE';
      }
      
      if (highestBadge) {
        playersWithStatus.push({
          player,
          highestBadge,
          priority: ['HOH', 'POV', 'NOM', 'SAFE'].indexOf(highestBadge)
        });
      }
    }
    
    if (playersWithStatus.length === 0) {
      console.info('[MobileRoster] Cold-start: No players with active statuses');
      return;
    }
    
    // Sort by priority (lower index = higher priority)
    playersWithStatus.sort((a, b) => a.priority - b.priority);
    
    console.info(`[MobileRoster] Cold-start: Triggering pills for ${playersWithStatus.length} players with active statuses`);
    
    // Trigger pill animation for each player with status
    for (const { player, highestBadge } of playersWithStatus) {
      triggerBadgeAnimation(player.id, highestBadge);
    }
  }
  
  /**
   * Update spacer height as fallback when overlaySpacing module is not present
   * Uses measured TV height to ensure proper spacing between grid and overlay
   */
  function updateSpacerFallback() {
    // Check if overlaySpacing module is handling this
    if (global.OverlaySpacing && global.OverlaySpacing.getStatus) {
      const status = global.OverlaySpacing.getStatus();
      if (status.initialized) {
        // OverlaySpacing module is active, no fallback needed
        return;
      }
    }
    
    // Fallback: measure TV overlay height and set CSS variables
    const tv = document.querySelector('.tv') || document.querySelector('#tv');
    const tvNow = document.querySelector('#tvNow');
    const spacer = document.querySelector('.mobile-roster-grid-spacer');
    const rowGap = CONFIG.GAP_SIZE || 6;
    
    let overlayHeight = 200; // Default fallback
    
    if (tv && tv.offsetHeight > 0) {
      overlayHeight = tv.offsetHeight;
    } else if (tvNow && tvNow.offsetHeight > 0) {
      overlayHeight = tvNow.offsetHeight;
    }
    
    // Set CSS variable for spacer calculation
    document.documentElement.style.setProperty('--tv-overlay-height', `${overlayHeight}px`);
    document.documentElement.style.setProperty('--avatar-row-gap', `${rowGap}px`);
    
    // Also set explicit spacer height as ultimate fallback
    if (spacer) {
      spacer.style.height = `${overlayHeight + rowGap}px`;
    }
    
    console.info(`[MobileRoster] Spacer fallback: overlayHeight=${overlayHeight}px, rowGap=${rowGap}px`);
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
    // Check for spotlight disable flag early (per requirements)
    if (typeof window.MOBILE_ROSTER_DISABLE_SPOTLIGHT !== 'undefined' && 
        window.MOBILE_ROSTER_DISABLE_SPOTLIGHT) {
      console.info('[MobileRoster] Spotlight disabled by MOBILE_ROSTER_DISABLE_SPOTLIGHT flag');
      return;
    }
    
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
    
    // focusPlayer will check MOBILE_ROSTER_DISABLE_SPOTLIGHT internally
    if (player) {
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
   * IMPORTANT: Must use a source that includes ALL players (evicted and non-evicted).
   * Do NOT use PlayerService.getAlivePlayers() as the primary source since it
   * filters out evicted players.
   */
  function updatePlayerLists() {
    try {
      // Get ALL players (evicted + non-evicted) from game state
      // IMPORTANT: Avoid getAlivePlayers() which returns only non-evicted players
      let allPlayers = [];
      
      // Priority 1: Use game.players which includes all players
      if (global.game && Array.isArray(global.game.players)) {
        allPlayers = global.game.players || [];
        console.info('[MobileRoster] Loaded from game.players (all players)');
      } else if (global.g && global.g.game && Array.isArray(global.g.game.players)) {
        allPlayers = global.g.game.players || [];
        console.info('[MobileRoster] Loaded from g.game.players (all players)');
      } else if (global.PlayerService && typeof global.PlayerService.getAlivePlayers === 'function') {
        // Fallback only: getAlivePlayers returns only non-evicted players
        // This is a last resort; the grid will not show evicted players
        allPlayers = global.PlayerService.getAlivePlayers() || [];
        console.warn('[MobileRoster] Fallback to PlayerService.getAlivePlayers() - evicted players may be missing');
      }
      
      // Keep ALL players in activePlayers (requirement: evicted stay in main grid)
      // We render evicted players with special styling but don't remove them
      state.activePlayers = allPlayers;
      
      // Sync playersById store for event handling
      syncPlayersById();
      
      // Track evicted separately for reference (e.g., evicted drawer if needed)
      state.evictedPlayers = allPlayers.filter(p => p.evicted);
      state.evictedCount = state.evictedPlayers.length;
      
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
   * Handle player update event
   */
  function handlePlayersUpdate(data) {
    console.info('[MobileRoster] Players update event:', data);
    
    // Record event
    recordEvent('players:update', data || {}, true);
    
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
      
      <!-- Grid Bottom Spacer - ensures TV overlay never covers avatar tiles -->
      <div class="mobile-roster-grid-spacer" aria-hidden="true"></div>
      
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
    
    // Subscribe to game events for real-time badge updates
    if (global.bbGameBus) {
      // Use new granular event handlers with strict player resolution
      global.bbGameBus.on('player:evicted', handleEvictedEvent);
      global.bbGameBus.on('players:update', handlePlayersUpdate);
      global.bbGameBus.on('players:change', handlePlayersUpdate);
      
      // Real-time badge sync events per requirements - use strict handlers
      global.bbGameBus.on('player:hoh', handleHOHEvent);
      global.bbGameBus.on('player:veto', handleVetoEvent);
      global.bbGameBus.on('player:nominated', handleNominatedEvent);
      global.bbGameBus.on('player:replacement_nom', handleReplacementNomEvent);
      global.bbGameBus.on('player:safe', handleSafeEvent);
      
      // Badge removal and nominee replacement events
      global.bbGameBus.on('badge:remove', handleBadgeRemoveEvent);
      global.bbGameBus.on('badge-remove', handleBadgeRemoveEvent);
      global.bbGameBus.on('nominee:replaced', handleNomineeReplacedEvent);
      global.bbGameBus.on('nominee-replaced', handleNomineeReplacedEvent);
      
      // Fast-forward and skip events - immediately dismiss pills and show emojis
      global.bbGameBus.on('phase:skip', () => {
        console.info('[MobileRoster] Phase skip event - dismissing all badge pills');
        dismissAllBadgePills(true);
      });
      global.bbGameBus.on('phase:fastforward', () => {
        console.info('[MobileRoster] Fast-forward event - dismissing all badge pills');
        dismissAllBadgePills(true);
      });
      global.bbGameBus.on('game:fastforward', () => {
        console.info('[MobileRoster] Game fast-forward event - dismissing all badge pills');
        dismissAllBadgePills(true);
      });
      
      console.info('[MobileRoster] Subscribed to granular game events (HOH/POV/NOM/SAFE/EVICTED/REPLACEMENT_NOM/BADGE_REMOVE/NOMINEE_REPLACED/SKIP/FASTFORWARD)');
    }
    
    // Listen for bb:phase:changed custom event for phase transitions
    // Store handler reference for potential cleanup
    state.phaseChangeHandler = (event) => {
      console.info('[MobileRoster] Phase changed event - refreshing roster', event?.detail?.phase);
      
      // Dismiss all active badge pills immediately on phase change
      // Pills should be replaced by corner emojis since badges persist
      dismissAllBadgePills(true);
      
      refresh();
    };
    global.addEventListener('bb:phase:changed', state.phaseChangeHandler);
    
    // Also listen for skip/fast-forward custom events on window
    global.addEventListener('bb:skip', () => {
      console.info('[MobileRoster] bb:skip event - dismissing all badge pills');
      dismissAllBadgePills(true);
    });
    global.addEventListener('bb:fastforward', () => {
      console.info('[MobileRoster] bb:fastforward event - dismissing all badge pills');
      dismissAllBadgePills(true);
    });
    
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
    
    // ROSTER GATING: Listen for avatars:ready event to unlock roster
    global.addEventListener('avatars:ready', (event) => {
      const summary = event?.detail || {};
      const cfg = (global.game && global.game.cfg) || global.cfg || {};
      const strictMode = cfg.avatarPreloadRequireAll === true;
      
      console.info('[RosterGate] avatars:ready event received', summary);
      
      // In strict mode, only unlock if all avatars loaded successfully
      if (strictMode) {
        const success = summary.loaded === summary.total && summary.failed === 0 && !summary.timedOut;
        
        if (success) {
          // Remove gated class and add ready class
          const container = document.querySelector('.mobile-roster-active-grid');
          if (container) {
            container.classList.remove('roster-grid--gated');
            container.classList.add('roster-grid--ready');
          }
          
          // Log telemetry for unlock
          if (global.Telemetry && typeof global.Telemetry.log === 'function') {
            global.Telemetry.log('roster_unlocked', {
              strictMode: true,
              loaded: summary.loaded,
              total: summary.total,
              elapsedMs: summary.elapsedMs
            });
          } else {
            console.info('[RosterGate] All avatars loaded successfully - unlocking roster');
          }
          
          // Re-render roster now that avatars are ready
          if (isMobileViewport() && state.initialized) {
            renderAll();
          }
        } else {
          // Log telemetry for failed unlock
          if (global.Telemetry && typeof global.Telemetry.log === 'function') {
            global.Telemetry.log('roster_unlock_failed', {
              strictMode: true,
              loaded: summary.loaded,
              total: summary.total,
              failed: summary.failed,
              timedOut: summary.timedOut
            });
          } else {
            console.warn('[RosterGate] Avatar preload incomplete - roster remains gated', {
              loaded: summary.loaded,
              total: summary.total,
              failed: summary.failed,
              timedOut: summary.timedOut
            });
          }
        }
      } else {
        // Non-strict mode: always unlock roster when event fires
        const container = document.querySelector('.mobile-roster-active-grid');
        if (container) {
          container.classList.remove('roster-grid--gated');
          container.classList.add('roster-grid--ready');
        }
        
        // Log telemetry for unlock
        if (global.Telemetry && typeof global.Telemetry.log === 'function') {
          global.Telemetry.log('roster_unlocked', {
            strictMode: false,
            loaded: summary.loaded,
            total: summary.total
          });
        } else {
          console.info('[RosterGate] Avatars ready (non-strict mode) - unlocking roster');
        }
        
        // Re-render roster
        if (isMobileViewport() && state.initialized) {
          renderAll();
        }
      }
    });
    
    console.info('[MobileRoster] Subscribed to avatars:ready event for roster gating');
    
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
   * Returns { active, tiles, badgesRendered, evictedCount, lastEvents, statusSample } 
   * statusSample contains the first 3 tiles' computed tokens
   * lastEvents contains the rolling window of recent events (read-only reference)
   * Note: Uses shallow copies to avoid mutating original player objects
   * Note: lastEvents is returned by reference for performance - do not mutate
   */
  function getStatus() {
    const container = document.querySelector('.mobile-roster-container');
    const tiles = document.querySelectorAll('.mobile-roster-tile');
    
    // Sample first 3 players' computed tokens using shallow copies
    const statusSample = [];
    const samplePlayers = state.activePlayers.slice(0, 3);
    for (const player of samplePlayers) {
      // Create a shallow copy to avoid mutating original
      const playerCopy = { ...player };
      normalizeStatus(playerCopy);
      const tokens = computeBadges(playerCopy);
      statusSample.push({
        id: player.id,
        name: player.name,
        tokens
      });
    }
    
    return {
      active: document.body.hasAttribute('data-mobile-roster-active'),
      tiles: tiles.length,
      badgesRendered: state.badgesRendered,
      evictedCount: state.evictedCount,
      lastEvents: state.lastEvents, // Read-only reference for performance
      statusSample,
      lastInitAttempt: state.lastInitAttempt,
      initAttempts: state.initAttempts,
      forced: state.forced,
      initialized: state.initialized,
      containerExists: !!container,
      currentGameId: state.currentGameId,
      currentRoundId: state.currentRoundId,
      playersCount: state.playersById.size,
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
    
    // Badge pill animation API
    triggerBadgeAnimation,
    dismissBadgePill,
    dismissAllBadgePills,
    showCornerEmoji,
    showComboEmojis,
    clearCornerEmoji,
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
// Auto-initialization with guarded player waiting
// ============================
(function autoInit() {
  'use strict';
  
  // Telemetry helper
  function logTelemetry(event, data = {}) {
    try {
      if (window.Telemetry && typeof window.Telemetry.log === 'function') {
        window.Telemetry.log(event, data);
      } else {
        console.info(`[MobileRoster:Telemetry] ${event}`, data);
      }
    } catch (err) {
      console.warn('[MobileRoster AutoInit] Telemetry logging failed:', err);
    }
  }
  
  // Check for force flag on mobile UA
  const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent || '');
  
  if (isMobileUA && typeof window.FORCE_MOBILE_ROSTER === 'undefined') {
    window.FORCE_MOBILE_ROSTER = true;
    console.info('[MobileRoster AutoInit] Set FORCE_MOBILE_ROSTER=true for mobile UA');
  }
  
  // Track initialization state to prevent duplicate logs
  let initializationStarted = false;
  let waitingForPlayers = false;
  let lastStateLogged = null;
  
  /**
   * Log state change only if different from last logged state
   * Reduces repetitive log spam
   */
  function logStateChange(state, details = {}) {
    if (state !== lastStateLogged) {
      console.info(`[MobileRoster AutoInit] ${state}`, details);
      lastStateLogged = state;
      logTelemetry(`mobile_roster_${state.toLowerCase().replace(/\s+/g, '_')}`, details);
    }
  }
  
  /**
   * Check if players are available via PlayerService or global state
   */
  function hasPlayers() {
    // Try PlayerService first
    if (window.PlayerService && typeof window.PlayerService.isReady === 'function') {
      return window.PlayerService.isReady();
    }
    
    // Fallback to global game state
    const game = window.game || window.g?.game;
    if (game && Array.isArray(game.players) && game.players.length > 0) {
      return true;
    }
    
    return false;
  }
  
  /**
   * Wait for players to be ready before initializing
   * Uses PlayerService.onPlayersReady if available, otherwise falls back to limited retries
   */
  function waitForPlayersAndInit() {
    if (initializationStarted) {
      return; // Already started
    }
    
    // If players are already available, initialize immediately
    if (hasPlayers()) {
      initializationStarted = true;
      logStateChange('Initialized', { playersReady: true });
      initMobileRoster();
      return;
    }
    
    // Use PlayerService.onPlayersReady if available (preferred method)
    if (window.PlayerService && typeof window.PlayerService.onPlayersReady === 'function') {
      if (!waitingForPlayers) {
        waitingForPlayers = true;
        logStateChange('Waiting for players', { method: 'PlayerService.onPlayersReady' });
        logTelemetry('mobile_roster_waiting_for_players', { method: 'event' });
      }
      
      // Set a timeout for abort
      const abortTimeout = setTimeout(() => {
        if (!initializationStarted) {
          console.warn('[MobileRoster AutoInit] Players never arrived, aborting initialization');
          logTelemetry('mobile_roster_abort', { reason: 'timeout', method: 'event' });
        }
      }, 10000); // 10 second timeout
      
      window.PlayerService.onPlayersReady(() => {
        clearTimeout(abortTimeout);
        if (!initializationStarted) {
          initializationStarted = true;
          logStateChange('Initialized', { playersReady: true, method: 'event' });
          initMobileRoster();
        }
      });
      
      return;
    }
    
    // Fallback: limited retries (max 2 attempts instead of 10)
    if (!waitingForPlayers) {
      waitingForPlayers = true;
      logStateChange('Waiting for players', { method: 'polling' });
      logTelemetry('mobile_roster_waiting_for_players', { method: 'polling' });
    }
    
    let retries = 0;
    const maxRetries = 2; // Reduced from 10 to 2 per requirements
    const retryDelay = 1000; // 1 second between retries
    
    const checkPlayers = () => {
      if (hasPlayers()) {
        initializationStarted = true;
        logStateChange('Initialized', { playersReady: true, retries: retries });
        initMobileRoster();
        return;
      }
      
      retries++;
      if (retries < maxRetries) {
        // Only log if we haven't logged this retry count before
        if (retries === 1) {
          console.info(`[MobileRoster AutoInit] Retry ${retries}/${maxRetries} - waiting for players...`);
        }
        setTimeout(checkPlayers, retryDelay);
      } else {
        console.warn('[MobileRoster AutoInit] Max retries reached, players not available');
        logTelemetry('mobile_roster_abort', { reason: 'max_retries', retries: maxRetries });
      }
    };
    
    setTimeout(checkPlayers, retryDelay);
  }
  
  /**
   * Initialize MobileRoster
   */
  function initMobileRoster() {
    if (window.MobileRoster && typeof window.MobileRoster.init === 'function') {
      window.MobileRoster.init();
      
      // Single verification after init (not repeated retries)
      setTimeout(() => {
        const container = document.querySelector('.mobile-roster-container');
        const isActive = document.body.hasAttribute('data-mobile-roster-active');
        
        if (container && isActive) {
          logStateChange('Container active');
          logTelemetry('mobile_roster_initialized', { 
            success: true,
            hasContainer: true
          });
        } else {
          // One refresh attempt if container isn't ready
          if (window.MobileRoster && typeof window.MobileRoster.refresh === 'function') {
            window.MobileRoster.refresh();
            logTelemetry('mobile_roster_initialized', { 
              success: true,
              refreshed: true
            });
          }
        }
      }, 500);
      
      return true;
    }
    return false;
  }
  
  // Start initialization on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', waitForPlayersAndInit);
  } else {
    // DOM already loaded
    setTimeout(waitForPlayersAndInit, 0);
  }
  
  // Listen for players-ready event as fallback
  window.addEventListener('players-ready', () => {
    if (!initializationStarted) {
      initializationStarted = true;
      logStateChange('Players ready event received');
      initMobileRoster();
    }
  }, { once: true });
  
  // Additional fallback on window.onload
  window.addEventListener('load', () => {
    if (!initializationStarted && 
        hasPlayers() &&
        !document.body.hasAttribute('data-mobile-roster-active') && 
        window.MobileRoster && 
        typeof window.MobileRoster.init === 'function') {
      console.info('[MobileRoster AutoInit] Fallback initialization on window.load');
      initializationStarted = true;
      initMobileRoster();
    }
  });
})();
