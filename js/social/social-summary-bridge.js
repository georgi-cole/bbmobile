// MODULE: social-summary-bridge.js
// Builds canonical social summary from session logs and emits diary room entries
// Generates highlights from action outcomes and affinity changes

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const HIGHLIGHT_CONFIG = {
    maxHighlights: 5,           // Top N highlights to include
    minAffinityDelta: 0.05,     // Minimum affinity change to note
    significantDelta: 0.08,     // Threshold for "bromance" highlights
    verbose: false
  };

  function getConfig() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return {
      maxHighlights: cfg.socialHighlightsMax ?? HIGHLIGHT_CONFIG.maxHighlights,
      minAffinityDelta: cfg.socialHighlightsMinDelta ?? HIGHLIGHT_CONFIG.minAffinityDelta,
      significantDelta: cfg.socialHighlightsSignificantDelta ?? HIGHLIGHT_CONFIG.significantDelta,
      verbose: cfg.socialSummaryVerbose ?? HIGHLIGHT_CONFIG.verbose
    };
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    const bus = getBus();
    if (!bus) {
      console.info('[social-summary-bridge] Event bus not ready - deferring initialization');
      setTimeout(init, 100);
      return;
    }

    // Listen for social phase end events (multiple variants for defensive compatibility)
    const endEvents = [
      'social.phase:end',
      'social-phase:end',
      'social:end'
    ];

    endEvents.forEach(eventName => {
      bus.on(eventName, handleSocialPhaseEnd);
    });

    console.info('[social-summary-bridge] ✓ Initialized and listening for phase end events');
  }

  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  // ============================================================================
  // PHASE END HANDLER
  // ============================================================================
  
  function handleSocialPhaseEnd(_data) {
    console.info('[social-summary-bridge] 📊 Building social phase summary');
    
    // Small delay to ensure social-maneuvers has finished its cleanup
    setTimeout(() => {
      const summary = rebuildSocialSummary();
      if (summary) {
        emitSummaryEvents(summary);
      }
    }, 100);
  }

  // ============================================================================
  // SUMMARY BUILDING
  // ============================================================================
  
  /**
   * Rebuild social summary from game.__socialManeuversSessionLogs
   * @returns {Object|null} Summary object or null if no data
   */
  function rebuildSocialSummary() {
    const g = global.game;
    if (!g) {
      console.warn('[social-summary-bridge] No game object available');
      return null;
    }

    // Get the most recent session from the logs
    const sessionLogs = g.__socialManeuversSessionLogs || [];
    if (sessionLogs.length === 0) {
      console.warn('[social-summary-bridge] No session logs available');
      return null;
    }

    const latestSession = sessionLogs[sessionLogs.length - 1];
    
    if (!latestSession || !latestSession.actions || latestSession.actions.length === 0) {
      console.warn('[social-summary-bridge] Latest session has no actions');
      return null;
    }

    const config = getConfig();
    
    // Build the canonical summary
    const summary = {
      week: latestSession.metadata?.week || g.week || 1,
      timestamp: Date.now(),
      totalActions: latestSession.actions.length,
      energySpentByPlayer: {},
      infoSpentByPlayer: {},
      actionLog: [],
      highlights: []
    };

    // Process actions to compute resource spending and build action log
    const affinityChanges = new Map(); // Track affinity changes per player pair
    
    latestSession.actions.forEach(action => {
      // Defensive: ensure action has required fields
      const actorId = coerceToNumber(action.actorId);
      const targetId = coerceToNumber(action.targetId);
      const actionType = action.type || action.actionId || 'unknown';
      const outcome = action.outcome || (action.succeeded ? 'success' : 'failure');
      
      if (!actorId) return; // Skip invalid actions

      // Track energy spent
      const energyCost = coerceToNumber(action.energyCost || action.effectiveCost || 0);
      if (energyCost > 0) {
        summary.energySpentByPlayer[actorId] = (summary.energySpentByPlayer[actorId] || 0) + energyCost;
      }

      // Track information spent
      const infoCost = coerceToNumber(action.informationCost || 0);
      if (infoCost > 0) {
        summary.infoSpentByPlayer[actorId] = (summary.infoSpentByPlayer[actorId] || 0) + infoCost;
      }

      // Add to action log
      summary.actionLog.push({
        actorId,
        actorName: action.actorName || getPlayerName(actorId),
        targetId,
        targetName: action.targetName || getPlayerName(targetId),
        actionType,
        outcome,
        energyCost,
        timestamp: action.timestamp || Date.now()
      });

      // Track affinity changes for highlights
      const affinityDelta = coerceToNumber(action.affinityDelta || 0);
      if (affinityDelta !== 0 && targetId) {
        const pairKey = [actorId, targetId].sort((a, b) => a - b).join('-');
        const existing = affinityChanges.get(pairKey) || { actorId, targetId, delta: 0, actions: [] };
        existing.delta += affinityDelta;
        existing.actions.push({ actionType, outcome, delta: affinityDelta });
        affinityChanges.set(pairKey, existing);
      }
    });

    // Generate highlights from actions and affinity changes
    summary.highlights = generateHighlights(latestSession.actions, affinityChanges, config);

    // Store summary in game state
    g.__latestSocialSummary = summary;
    g.__latestSocialSummaryJSON = JSON.stringify(summary, null, 2);

    if (config.verbose) {
      console.log('[social-summary-bridge] Built summary:', summary);
    } else {
      console.info(`[social-summary-bridge] ✓ Summary built: ${summary.totalActions} actions, ${summary.highlights.length} highlights`);
    }

    return summary;
  }

  // ============================================================================
  // HIGHLIGHTS GENERATION
  // ============================================================================
  
  /**
   * Generate highlights from actions and affinity changes
   * @param {Array} actions - Array of action objects
   * @param {Map} affinityChanges - Map of player pair keys to affinity change data
   * @param {Object} config - Configuration
   * @returns {Array} Array of highlight strings
   */
  function generateHighlights(actions, affinityChanges, config) {
    const highlights = [];
    const candidates = [];

    // 1. Extract highlights from specific action types
    actions.forEach(action => {
      const actorName = action.actorName || getPlayerName(action.actorId);
      const targetName = action.targetName || getPlayerName(action.targetId);
      const actionType = action.type || action.actionId;
      const succeeded = action.outcome === 'success' || action.succeeded;

      // Group hangout success
      if (actionType === 'group_hangout' && succeeded) {
        const targetCount = action.targetCount || 1;
        candidates.push({
          text: `${actorName} organized a group hangout with ${targetCount} houseguest${targetCount > 1 ? 's' : ''}`,
          importance: 3 + targetCount
        });
      }

      // Alliance formation
      if (actionType === 'form_alliance' && succeeded) {
        candidates.push({
          text: `${actorName} formed an alliance with ${targetName}`,
          importance: 8
        });
      }

      // Betrayal/backstab
      if ((actionType === 'spread_rumor' || actionType === 'expose_secret') && succeeded) {
        candidates.push({
          text: `${actorName} spread information about ${targetName}`,
          importance: 6
        });
      }

      // Failed aggressive action
      if ((actionType === 'confront' || actionType === 'expose_secret') && !succeeded) {
        const affinityDelta = coerceToNumber(action.affinityDelta || 0);
        if (affinityDelta < -0.03) {
          candidates.push({
            text: `${actorName}'s attempt backfired with ${targetName}`,
            importance: 5
          });
        }
      }

      // Positive interactions
      if ((actionType === 'complement' || actionType === 'confide') && succeeded) {
        const affinityDelta = coerceToNumber(action.affinityDelta || 0);
        if (affinityDelta > 0.05) {
          candidates.push({
            text: `${actorName} and ${targetName} had a positive interaction`,
            importance: 4
          });
        }
      }
    });

    // 2. Extract highlights from affinity changes
    affinityChanges.forEach((change) => {
      const actor = getPlayerName(change.actorId);
      const target = getPlayerName(change.targetId);
      const delta = change.delta;

      // Significant positive relationship (bromance/showmance)
      if (delta > config.significantDelta) {
        candidates.push({
          text: `Bromance alert: ${actor} and ${target} grew closer (+${(delta * 100).toFixed(0)}%)`,
          importance: 7
        });
      }

      // Notable beef/conflict
      if (delta < -config.minAffinityDelta) {
        candidates.push({
          text: `Notable beef: ${actor} and ${target} had tension (-${Math.abs(delta * 100).toFixed(0)}%)`,
          importance: 6
        });
      }
    });

    // 3. Sort by importance and take top N
    candidates.sort((a, b) => b.importance - a.importance);
    
    const topCandidates = candidates.slice(0, config.maxHighlights);
    topCandidates.forEach(candidate => {
      highlights.push(candidate.text);
    });

    return highlights;
  }

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================
  
  /**
   * Emit summary events to game bus
   * @param {Object} summary - Summary object
   */
  function emitSummaryEvents(summary) {
    const bus = getBus();
    if (!bus) {
      console.warn('[social-summary-bridge] No event bus available for emission');
      return;
    }

    // Emit summary updated event
    bus.emit('social.summary:updated', summary);
    console.info('[social-summary-bridge] ✓ Emitted social.summary:updated event');

    // Emit diary room entry event
    const diaryEntry = {
      type: 'social_summary',
      week: summary.week,
      timestamp: summary.timestamp,
      title: `Week ${summary.week} Social Phase`,
      text: formatSummaryText(summary),
      data: summary
    };

    bus.emit('dr:entry', { entry: diaryEntry });
    console.info('[social-summary-bridge] ✓ Emitted dr:entry event');
  }

  /**
   * Format summary as readable text for diary entry
   * @param {Object} summary - Summary object
   * @returns {string} Formatted text
   */
  function formatSummaryText(summary) {
    const lines = [];
    
    lines.push(`${summary.totalActions} social interaction${summary.totalActions !== 1 ? 's' : ''} occurred this week.`);
    
    if (summary.highlights.length > 0) {
      lines.push('');
      lines.push('Highlights:');
      summary.highlights.forEach(highlight => {
        lines.push(`• ${highlight}`);
      });
    }

    // Top energy spenders
    const energySpenders = Object.entries(summary.energySpentByPlayer)
      .map(([playerId, amount]) => ({ playerId: Number(playerId), amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 3);

    if (energySpenders.length > 0) {
      lines.push('');
      lines.push('Most active players:');
      energySpenders.forEach(({ playerId, amount }) => {
        const name = getPlayerName(playerId);
        lines.push(`• ${name} (${amount} energy)`);
      });
    }

    return lines.join('\n');
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Coerce value to number (defensive)
   * @param {*} value - Value to coerce
   * @returns {number} Numeric value or 0
   */
  function coerceToNumber(value) {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    if (typeof value === 'object' && value !== null) {
      // Handle object-like cost structures (defensive)
      if ('energy' in value) return coerceToNumber(value.energy);
      if ('amount' in value) return coerceToNumber(value.amount);
    }
    return 0;
  }

  /**
   * Get player name by ID (defensive)
   * @param {number} playerId - Player ID
   * @returns {string} Player name or fallback
   */
  function getPlayerName(playerId) {
    const id = coerceToNumber(playerId);
    if (!id) return 'Unknown';
    
    if (typeof global.safeName === 'function') {
      return global.safeName(id);
    }
    
    if (typeof global.getP === 'function') {
      const player = global.getP(id);
      return player?.name || `Player ${id}`;
    }
    
    return `Player ${id}`;
  }

  // ============================================================================
  // PUBLIC API (for manual testing)
  // ============================================================================
  
  const API = {
    rebuildSocialSummary,
    getLatestSummary() {
      return global.game?.__latestSocialSummary || null;
    }
  };

  // Export for debugging
  if (!global.__rebuildSocialSummary) {
    global.__rebuildSocialSummary = API.rebuildSocialSummary;
    console.info('[social-summary-bridge] ✓ Debug API: window.__rebuildSocialSummary()');
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================
  
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 50);
    }
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : global);
