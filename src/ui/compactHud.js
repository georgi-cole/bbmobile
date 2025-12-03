// MODULE: compactHud.js
// Compact HUD for Houseguests header showing Phase, Season/Week, and Player count
//
// References:
// - Phase/Season/Week update logic: index.html#L450-L480
// - Global state: js/state.js (window.game.phase, season, week, players)
// - Initial player count: js/twists.js getInitialPlayersCount pattern
//
// Features:
// - Three chips: Phase (full name) | Season/Week (SxWx) | Players (X/X)
// - Responsive compression for Phase at narrow widths
// - aria-live announcements for Phase and Players
// - Reuses existing helpers (alivePlayers, getFullPhaseName)

(function(global){
  'use strict';

  const CompactHud = global.CompactHud || (global.CompactHud = {});

  // Constants
  const PHASE_COMPRESSION_MAP = {
    'Intro': 'INT',
    'Season Premiere': 'PRE',
    'Strategizing': 'STR',
    'HOH Competition': 'HOH',
    'Nominations': 'NOM',
    'Veto Competition': 'VET',
    'Veto Ceremony': 'CER',
    'Eviction': 'EVT',
    'Jury Deliberation': 'JRY',
    'Return Challenge': 'RET',
    'Final 3 – Part 1': 'F3P1',
    'Final 3 – Part 2': 'F3P2',
    'Final 3 – Decision': 'F3D',
    'Social Time': 'SOC'
  };

  // State
  let hudContainer = null;
  let phaseChip = null;
  let seasonWeekChip = null;
  let playersChip = null;
  let drButton = null;
  let resizeObserver = null;
  let lastPhase = null;
  let lastPlayers = null;

  /**
   * Initialize the compact HUD
   * @param {HTMLElement} container - Container element for HUD (will be inserted after h1)
   */
  function init(container) {
    if (!container) {
      console.warn('[CompactHud] No container provided');
      return;
    }

    hudContainer = container;

    // Create HUD markup
    hudContainer.innerHTML = `
      <div class="compact-hud-chip phase" role="status" aria-live="polite" aria-atomic="true" title="">
        <span class="compact-hud-chip-icon">📍</span>
        <span class="compact-hud-chip-label">Loading...</span>
      </div>
      <div class="compact-hud-chip season-week" title="">
        <span class="compact-hud-chip-icon">📅</span>
        <span class="compact-hud-chip-label">S1W1</span>
      </div>
      <div class="compact-hud-chip players" role="status" aria-live="polite" aria-atomic="true" title="">
        <span class="compact-hud-chip-icon">👥</span>
        <span class="compact-hud-chip-label">0/0</span>
      </div>
      <button class="compact-hud-chip dr-button" id="btnDiaryRoomHud" aria-label="Open Diary Room" title="Diary Room">
        <span class="compact-hud-chip-icon">🚪</span>
        <span class="compact-hud-chip-label">DR</span>
      </button>
    `;

    // Get chip references
    phaseChip = hudContainer.querySelector('.compact-hud-chip.phase');
    seasonWeekChip = hudContainer.querySelector('.compact-hud-chip.season-week');
    playersChip = hudContainer.querySelector('.compact-hud-chip.players');
    drButton = hudContainer.querySelector('.compact-hud-chip.dr-button');

    // Setup DR button click handler
    if (drButton) {
      drButton.addEventListener('click', () => {
        // Reuse existing Diary Room modal handler
        if (typeof global.DiaryRoomModal !== 'undefined' && typeof global.DiaryRoomModal.open === 'function') {
          global.DiaryRoomModal.open();
        } else if (document.getElementById('btnDiaryRoom')) {
          // Fallback: trigger the old DR button if it exists
          document.getElementById('btnDiaryRoom').click();
        }
      });
    }

    // Setup ResizeObserver for phase compression
    setupResizeObserver();

    // Initial update
    update();

    console.info('[CompactHud] Initialized');
  }

  /**
   * Setup ResizeObserver to handle phase label compression at narrow widths
   */
  function setupResizeObserver() {
    if (!phaseChip) return;

    // Only setup if ResizeObserver is available
    if (typeof ResizeObserver === 'undefined') {
      console.warn('[CompactHud] ResizeObserver not available, phase compression disabled');
      return;
    }

    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        // Compress phase label at narrow widths (<480px container)
        if (width < 480) {
          compressPhaseLabel();
        } else {
          expandPhaseLabel();
        }
      }
    });

    // Observe the HUD container
    if (hudContainer) {
      resizeObserver.observe(hudContainer);
    }
  }

  /**
   * Compress phase label to 3-letter code
   */
  function compressPhaseLabel() {
    if (!phaseChip) return;

    const label = phaseChip.querySelector('.compact-hud-chip-label');
    const fullText = phaseChip.getAttribute('title') || '';
    
    if (fullText && !phaseChip.classList.contains('compressed')) {
      // Get compressed version
      const compressed = PHASE_COMPRESSION_MAP[fullText] || fullText.substring(0, 3).toUpperCase();
      label.textContent = compressed;
      phaseChip.classList.add('compressed');
    }
  }

  /**
   * Expand phase label to full name
   */
  function expandPhaseLabel() {
    if (!phaseChip) return;

    const label = phaseChip.querySelector('.compact-hud-chip-label');
    const fullText = phaseChip.getAttribute('title') || '';
    
    if (phaseChip.classList.contains('compressed')) {
      label.textContent = fullText;
      phaseChip.classList.remove('compressed');
    }
  }

  /**
   * Get full phase name using existing helper or fallback
   * @param {string} phase - Phase key
   * @returns {string} Full phase name
   */
  function getFullPhaseName(phase) {
    // Try to use existing global helper
    if (typeof global.getFullPhaseName === 'function') {
      return global.getFullPhaseName(phase);
    }

    // Fallback map (matches index.html#L490-L511)
    const fullNames = {
      'lobby': 'Lobby',
      'opening': 'Season Premiere',
      'intermission': 'Strategizing',
      'hoh': 'HOH Competition',
      'nominations': 'Nominations',
      'veto_comp': 'Veto Competition',
      'veto': 'Veto Competition',
      'veto_ceremony': 'Veto Ceremony',
      'livevote': 'Eviction',
      'jury': 'Jury Deliberation',
      'return_twist': 'Return Challenge',
      'final3_comp1': 'Final 3 – Part 1',
      'final3_comp2': 'Final 3 – Part 2',
      'final3_decision': 'Final 3 – Decision',
      'social': 'Social Time',
      'social_intermission': 'Social Time'
    };

    return fullNames[phase] || phase;
  }

  /**
   * Get initial player count (total at season start)
   * @returns {number} Initial player count
   */
  function getInitialPlayersCount() {
    const game = global.game || {};
    
    // Check cached value
    if (typeof game.__initialPlayers === 'number' && game.__initialPlayers > 0) {
      return game.__initialPlayers;
    }

    // Try config first
    const fromConfig = Number(game.cfg?.numPlayers || 0);
    if (fromConfig > 0) {
      game.__initialPlayers = fromConfig;
      return fromConfig;
    }

    // Fallback: count current roster
    const alive = (global.alivePlayers?.() || []).length;
    const players = game.players || [];
    const evicted = players.filter(p => p.evicted).length;
    const total = Math.max(alive + evicted, players.length, 12);
    
    game.__initialPlayers = total;
    return total;
  }

  /**
   * Update all HUD chips
   */
  function update() {
    updatePhase();
    updateSeasonWeek();
    updatePlayers();
  }

  /**
   * Update Phase chip
   */
  function updatePhase() {
    if (!phaseChip) return;

    const game = global.game || {};
    const phase = game.phase;

    // Skip if no change
    if (phase === lastPhase) return;
    lastPhase = phase;

    const label = phaseChip.querySelector('.compact-hud-chip-label');
    
    if (!phase || phase === 'lobby') {
      // In lobby, show placeholder
      label.textContent = 'Lobby';
      phaseChip.setAttribute('title', 'Lobby');
      return;
    }

    // Get full phase name
    const fullName = getFullPhaseName(phase);
    
    // Update label (may be compressed by ResizeObserver)
    if (phaseChip.classList.contains('compressed')) {
      const compressed = PHASE_COMPRESSION_MAP[fullName] || fullName.substring(0, 3).toUpperCase();
      label.textContent = compressed;
    } else {
      label.textContent = fullName;
    }
    
    // Always store full name in title for tooltip
    phaseChip.setAttribute('title', fullName);
  }

  /**
   * Update Season/Week chip
   */
  function updateSeasonWeek() {
    if (!seasonWeekChip) return;

    const game = global.game || {};
    const season = game.season || 1;
    const week = game.week || 1;
    const phase = game.phase;

    const label = seasonWeekChip.querySelector('.compact-hud-chip-label');

    // Handle "Final" week logic (matches index.html#L468-L474)
    let weekText = week;
    if (phase && phase !== 'lobby') {
      let aliveCount = 0;
      try {
        aliveCount = (global.alivePlayers?.() || []).length;
      } catch(e) {
        console.warn('[CompactHud] Error getting alive players:', e);
      }

      if (aliveCount <= 2) {
        weekText = 'Final';
      }
    }

    // Format as SxWx or SxWFinal
    const text = weekText === 'Final' ? `S${season}WF` : `S${season}W${weekText}`;
    label.textContent = text;
    seasonWeekChip.setAttribute('title', `Season ${season}, Week ${weekText}`);
  }

  /**
   * Update Players chip (alive/total)
   */
  function updatePlayers() {
    if (!playersChip) return;

    const game = global.game || {};
    let aliveCount = 0;
    
    try {
      aliveCount = (global.alivePlayers?.() || []).length;
    } catch(e) {
      console.warn('[CompactHud] Error getting alive players:', e);
    }

    const totalCount = getInitialPlayersCount();

    // Skip if no change (avoid unnecessary aria-live announcements)
    const currentPlayers = `${aliveCount}/${totalCount}`;
    if (currentPlayers === lastPlayers) return;
    lastPlayers = currentPlayers;

    const label = playersChip.querySelector('.compact-hud-chip-label');
    label.textContent = currentPlayers;
    playersChip.setAttribute('title', `${aliveCount} alive of ${totalCount} total`);
  }

  /**
   * Cleanup resources
   */
  function destroy() {
    if (resizeObserver) {
      resizeObserver.disconnect();
      resizeObserver = null;
    }

    if (hudContainer) {
      hudContainer.innerHTML = '';
    }

    phaseChip = null;
    seasonWeekChip = null;
    playersChip = null;
    drButton = null;
    hudContainer = null;
    lastPhase = null;
    lastPlayers = null;

    console.info('[CompactHud] Destroyed');
  }

  // Exports
  CompactHud.init = init;
  CompactHud.update = update;
  CompactHud.updatePhase = updatePhase;
  CompactHud.updateSeasonWeek = updateSeasonWeek;
  CompactHud.updatePlayers = updatePlayers;
  CompactHud.destroy = destroy;

  global.CompactHud = CompactHud;

})(window);
