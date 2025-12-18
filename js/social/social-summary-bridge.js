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
   * @returns {Object} Highlights object with categories and alerts
   */
  function generateHighlights(actions, affinityChanges, config) {
    const highlights = {
      alliances: [],
      betrayals: [],
      fights: [],
      romances: [],
      groupEvents: [],
      general: []
    };
    const candidates = [];
    const alerts = [];

    // 1. Extract highlights from specific action types with spicy narratives
    actions.forEach(action => {
      const actorName = action.actorName || getPlayerName(action.actorId);
      const targetName = action.targetName || getPlayerName(action.targetId);
      const actionType = action.type || action.actionId;
      const succeeded = action.outcome === 'success' || action.succeeded;
      const affinityDelta = coerceToNumber(action.affinityDelta || 0);

      // Group hangout success
      if (actionType === 'group_hangout' && succeeded) {
        const targetCount = action.targetCount || 1;
        const spicyText = getSpicyText('group_hangout', actorName, targetName, targetCount);
        candidates.push({
          text: spicyText,
          importance: 3 + targetCount,
          category: 'groupEvents'
        });
      }

      // Alliance formation (with alert for big alliances)
      if (actionType === 'form_alliance' && succeeded) {
        const spicyText = getSpicyText('form_alliance', actorName, targetName);
        const importance = 8;
        candidates.push({
          text: spicyText,
          importance,
          category: 'alliances'
        });
        
        // Alert for major alliances
        if (affinityDelta > 0.1) {
          alerts.push({
            type: 'alliance',
            text: `🤝 Major Alliance Alert: ${actorName} and ${targetName} have formed a powerful bond!`,
            actorName,
            targetName,
            importance: 10
          });
        }
      }

      // Betrayal/backstab (with alert)
      if ((actionType === 'spread_rumor' || actionType === 'expose_secret') && succeeded) {
        const spicyText = getSpicyText('betrayal', actorName, targetName, actionType);
        candidates.push({
          text: spicyText,
          importance: 6,
          category: 'betrayals'
        });
        
        // Alert for major betrayals
        if (affinityDelta <= -0.06) {
          alerts.push({
            type: 'betrayal',
            text: `😱 Betrayal Alert: ${actorName}'s actions against ${targetName} caused major damage!`,
            actorName,
            targetName,
            importance: 9
          });
        }
      }

      // Failed aggressive action (with fight detection)
      if ((actionType === 'confront' || actionType === 'expose_secret') && !succeeded) {
        if (affinityDelta < -0.03) {
          const spicyText = getSpicyText('backfire', actorName, targetName);
          candidates.push({
            text: spicyText,
            importance: 5,
            category: 'general'
          });
        }
        
        // Fight alert
        if (affinityDelta <= -0.08) {
          alerts.push({
            type: 'fight',
            text: `💥 Fight Alert: ${actorName} and ${targetName} had a major blowup!`,
            actorName,
            targetName,
            importance: 9
          });
          candidates.push({
            text: `${actorName} and ${targetName} got into a heated argument that left both sides fuming`,
            importance: 8,
            category: 'fights'
          });
        }
      }

      // Positive interactions (romance/bromance detection)
      if ((actionType === 'compliment' || actionType === 'confide' || actionType === 'strategize') && succeeded) {
        if (affinityDelta > 0.05) {
          const spicyText = getSpicyText('positive', actorName, targetName, actionType);
          candidates.push({
            text: spicyText,
            importance: 4,
            category: 'general'
          });
        }
      }
    });

    // 2. Extract highlights from affinity changes
    affinityChanges.forEach((change) => {
      const actor = getPlayerName(change.actorId);
      const target = getPlayerName(change.targetId);
      const delta = change.delta;

      // Significant positive relationship (bromance/showmance with alert)
      if (delta > config.significantDelta) {
        const spicyText = getSpicyText('bromance', actor, target, delta);
        candidates.push({
          text: spicyText,
          importance: 7,
          category: 'romances'
        });
        
        // Romance alert for very high affinity
        if (delta > 0.12) {
          alerts.push({
            type: 'romance',
            text: `💕 Romance Alert: ${actor} and ${target} are getting VERY close!`,
            actorName: actor,
            targetName: target,
            importance: 8
          });
        }
      }

      // Notable beef/conflict
      if (delta < -config.minAffinityDelta) {
        const spicyText = getSpicyText('beef', actor, target, delta);
        candidates.push({
          text: spicyText,
          importance: 6,
          category: 'fights'
        });
      }
    });

    // 3. Sort by importance and categorize
    candidates.sort((a, b) => b.importance - a.importance);
    
    const topCandidates = candidates.slice(0, config.maxHighlights * 2); // Get more for categorization
    topCandidates.forEach(candidate => {
      highlights[candidate.category].push(candidate.text);
    });

    // Also populate general highlights array (backwards compatibility)
    highlights.general = topCandidates.slice(0, config.maxHighlights).map(c => c.text);

    // Attach alerts
    highlights.alerts = alerts;

    return highlights;
  }

  /**
   * Get spicy narrative text for an action
   * @param {string} type - Action type
   * @param {string} actor - Actor name
   * @param {string} target - Target name
   * @param {*} extra - Extra data
   * @returns {string} Spicy text
   */
  function getSpicyText(type, actor, target, extra) {
    const spicyTemplates = {
      group_hangout: [
        `${actor} rallied ${extra} houseguests for a late-night strategy session`,
        `${actor} organized an epic group hangout — the house is buzzing`,
        `${actor} brought everyone together — is this a new power alliance forming?`
      ],
      form_alliance: [
        `${actor} and ${target} sealed a deal — they're in it together now`,
        `${actor} and ${target} bonded over strategy — a new alliance is born`,
        `${actor} confided in ${target} — trust is building between them`
      ],
      betrayal: [
        `${actor} spread a rumor about ${target} — the house is talking`,
        `${actor} exposed ${target}'s secrets — trust is shattered`,
        `${actor} threw ${target} under the bus — game on`
      ],
      backfire: [
        `${actor}'s move against ${target} backfired spectacularly — yikes`,
        `${actor} tried to play ${target} but it blew up in their face`,
        `${actor}'s scheme against ${target} failed — awkward`
      ],
      positive: [
        `${actor} and ${target} had a heart-to-heart — they're growing closer`,
        `${actor} bonded with ${target} over a late-night chat`,
        `${actor} and ${target} are vibing — could this be a duo to watch?`
      ],
      bromance: [
        `Bromance alert! ${actor} and ${target} are inseparable (+${(extra * 100).toFixed(0)}%)`,
        `${actor} and ${target} are ride-or-die now — their bond is unbreakable`,
        `${actor} and ${target} have become the house's power duo`
      ],
      beef: [
        `Tension alert! ${actor} and ${target} are NOT getting along (-${Math.abs(extra * 100).toFixed(0)}%)`,
        `${actor} and ${target}'s relationship is ice cold — feud incoming?`,
        `${actor} and ${target} can barely stand each other anymore`
      ]
    };

    const templates = spicyTemplates[type];
    if (!templates) return `${actor} → ${target}`;
    
    return templates[Math.floor(Math.random() * templates.length)];
  }

  // ============================================================================
  // DIARY ROOM INTEGRATION (TASK 2)
  // ============================================================================
  
  /**
   * Push action log entries to Diary Room Social tab
   * Creates story-like feed entries for each action
   * @param {Object} summary - Summary object with actionLog
   */
  function pushActionLogToDiaryRoom(summary) {
    const bus = getBus();
    if (!bus) {
      console.warn('[social-summary-bridge] No event bus for DR integration');
      return;
    }

    const actionLog = summary.actionLog || [];
    if (actionLog.length === 0) {
      console.info('[social-summary-bridge] No actions to push to DR');
      return;
    }

    // Get full action details from session logs if available
    const g = global.game;
    const sessionLogs = g?.__socialManeuversSessionLogs || [];
    const latestSession = sessionLogs[sessionLogs.length - 1];
    const fullActionList = latestSession?.actions?.list || [];

    // Create diary entries for each action
    let entriesCreated = 0;
    actionLog.forEach((action, index) => {
      // Find matching full action data (with affinity delta)
      const fullAction = fullActionList.find(a => 
        a.actorId === action.actorId && 
        a.targetId === action.targetId && 
        Math.abs(a.timestamp - action.timestamp) < 1000
      );

      const affinityDelta = fullAction?.affinityDelta || 0;
      const infoCost = fullAction?.informationCost || 0;
      
      // Format action as story-like entry
      const text = formatActionAsStory(action, affinityDelta, infoCost);
      
      // Create DR entry
      const entry = {
        id: `dr-social-action-${summary.week}-${index}`,
        type: 'social_action',
        category: 'social',
        week: summary.week,
        timestamp: action.timestamp,
        text: text,
        severity: determineSeverityFromAction(action, affinityDelta),
        data: {
          actorId: action.actorId,
          actorName: action.actorName,
          targetId: action.targetId,
          targetName: action.targetName,
          actionType: action.actionType,
          outcome: action.outcome,
          energyCost: action.energyCost,
          infoCost: infoCost,
          affinityDelta: affinityDelta
        }
      };

      // Emit to diary room
      bus.emit('dr:entry', { entry });
      entriesCreated++;
    });

    console.info(`[social-summary-bridge] ✓ Pushed ${entriesCreated} action log entries to DR Social tab`);
  }

  /**
   * Format action as story-like text for DR feed
   * @param {Object} action - Action log entry
   * @param {number} affinityDelta - Affinity change
   * @param {number} infoCost - Information cost
   * @returns {string} Formatted text
   */
  function formatActionAsStory(action, affinityDelta, infoCost) {
    const { actorName, targetName, actionType, outcome, energyCost } = action;
    
    // Get action label (convert snake_case to readable)
    const actionLabel = actionType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Format outcome
    const outcomeText = outcome === 'success' ? '✓' : outcome === 'failure' ? '✗' : outcome;
    
    // Build story text
    let text = `${actorName} → ${targetName}: ${actionLabel} (${outcomeText})`;
    
    // Add costs
    const costs = [];
    if (energyCost > 0) costs.push(`⚡${energyCost}`);
    if (infoCost > 0) costs.push(`🔍${infoCost}`);
    if (costs.length > 0) {
      text += ` [${costs.join(', ')}]`;
    }
    
    // Add affinity delta if significant
    if (Math.abs(affinityDelta) >= 0.01) {
      const sign = affinityDelta >= 0 ? '+' : '';
      const percentage = (affinityDelta * 100).toFixed(1);
      text += ` → ${sign}${percentage}%`;
    }
    
    return text;
  }

  /**
   * Determine severity from action outcome and affinity delta
   * @param {Object} action - Action data
   * @param {number} affinityDelta - Affinity change
   * @returns {string} Severity level
   */
  function determineSeverityFromAction(action, affinityDelta) {
    // High severity for large negative changes
    if (affinityDelta <= -0.08) return 'high';
    
    // Dramatic for large positive changes
    if (affinityDelta >= 0.12) return 'dramatic';
    
    // High for certain action types
    const highSeverityActions = ['betray', 'backstab', 'expose_secret', 'spread_rumor'];
    if (highSeverityActions.some(a => action.actionType.includes(a))) {
      return 'high';
    }
    
    return 'neutral';
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

    // TASK 2: Push action log entries to Diary Room Social tab
    if (summary.actionLog && summary.actionLog.length > 0) {
      pushActionLogToDiaryRoom(summary);
    }

    // Emit diary room entry event
    const diaryEntry = {
      type: 'social_summary',
      category: 'social',
      week: summary.week,
      timestamp: summary.timestamp,
      title: `Week ${summary.week} Social Phase`,
      text: formatSummaryText(summary),
      data: summary
    };

    bus.emit('dr:entry', { entry: diaryEntry });
    console.info('[social-summary-bridge] ✓ Emitted dr:entry event');

    // Emit interactive alerts
    if (summary.highlights && summary.highlights.alerts) {
      summary.highlights.alerts.forEach(alert => {
        const alertEntry = {
          type: alert.type,
          category: 'social_alert',
          week: summary.week,
          timestamp: Date.now(),
          title: alert.text,
          text: alert.text,
          severity: alert.type === 'fight' || alert.type === 'betrayal' ? 'high' : 'medium',
          interactive: true,
          data: alert
        };
        
        bus.emit('dr:alert', { alert: alertEntry });
        console.info(`[social-summary-bridge] 🚨 Emitted dr:alert: ${alert.type}`);
      });
    }
  }

  /**
   * Format summary as readable text for diary entry
   * @param {Object} summary - Summary object
   * @returns {string} Formatted text
   */
  function formatSummaryText(summary) {
    const lines = [];
    
    lines.push(`${summary.totalActions} social interaction${summary.totalActions !== 1 ? 's' : ''} occurred this week.`);
    
    // Handle both old (array) and new (object) highlight formats
    const highlights = summary.highlights;
    if (highlights) {
      if (Array.isArray(highlights)) {
        // Old format: simple array
        if (highlights.length > 0) {
          lines.push('');
          lines.push('Highlights:');
          highlights.forEach(highlight => {
            lines.push(`• ${highlight}`);
          });
        }
      } else if (typeof highlights === 'object') {
        // New format: categorized object
        const categories = [
          { key: 'alliances', label: '🤝 Alliances' },
          { key: 'betrayals', label: '😱 Betrayals' },
          { key: 'fights', label: '💥 Fights' },
          { key: 'romances', label: '💕 Romances' },
          { key: 'groupEvents', label: '👥 Group Events' },
          { key: 'general', label: '📋 General' }
        ];
        
        for (const category of categories) {
          const items = highlights[category.key];
          if (items && items.length > 0) {
            lines.push('');
            lines.push(category.label + ':');
            items.slice(0, 3).forEach(item => { // Limit per category
              lines.push(`• ${item}`);
            });
          }
        }
      }
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
