// MODULE: diaryRoomLogger.js
// Enhanced Diary Room logging system that listens to game events and generates DR entries

(function(global) {
  'use strict';

  const DiaryRoomLogger = {};

  // State
  let initialized = false;
  let eventListeners = [];
  let entryCounter = 0;

  // Default event name mappings (can be overridden in init config)
  const DEFAULT_EVENTS = {
    socialAction: 'social.action:result',
    socialPhaseEnd: 'social.phase:end',
    bondShift: 'bond.shift',
    juryEnter: 'jury.member:enter',
    juryInteraction: 'jury.interaction',
    juryChallenge: 'jury.challenge:result',
    juryExit: 'jury.member:exit',
    juryReturn: 'jury.member:return',
    juryFinalDiscussion: 'jury.final:discussion'
  };

  let eventConfig = { ...DEFAULT_EVENTS };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  /**
   * Initialize the Diary Room Logger
   * @param {Object} config - Optional configuration
   * @param {Object} config.events - Event name overrides
   */
  function init(config) {
    if (initialized) {
      console.warn('[DiaryRoomLogger] Already initialized');
      return;
    }

    // Merge event config
    if (config && config.events) {
      eventConfig = { ...DEFAULT_EVENTS, ...config.events };
    }

    // Get the event bus
    const bus = getBus();
    if (!bus) {
      console.error('[DiaryRoomLogger] No event bus available');
      return;
    }

    // Register event listeners
    registerListener(bus, eventConfig.socialAction, handleSocialAction);
    registerListener(bus, eventConfig.socialPhaseEnd, handleSocialPhaseEnd);
    registerListener(bus, eventConfig.bondShift, handleBondShift);
    registerListener(bus, eventConfig.juryEnter, handleJuryEnter);
    registerListener(bus, eventConfig.juryInteraction, handleJuryInteraction);
    registerListener(bus, eventConfig.juryChallenge, handleJuryChallenge);
    registerListener(bus, eventConfig.juryExit, handleJuryExit);
    registerListener(bus, eventConfig.juryReturn, handleJuryReturn);
    registerListener(bus, eventConfig.juryFinalDiscussion, handleJuryFinalDiscussion);

    initialized = true;
    console.info('[DiaryRoomLogger] Initialized with event config:', eventConfig);
  }

  /**
   * Get the game event bus
   */
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  /**
   * Register an event listener and track it for cleanup
   */
  function registerListener(bus, eventName, handler) {
    if (!bus || !eventName || !handler) return;
    
    bus.on(eventName, handler);
    eventListeners.push({ bus, eventName, handler });
    console.info(`[DiaryRoomLogger] Registered listener for: ${eventName}`);
  }

  /**
   * Cleanup all registered listeners
   */
  function cleanup() {
    const bus = getBus();
    if (!bus) return;

    eventListeners.forEach(({ eventName, handler }) => {
      if (bus.off) {
        bus.off(eventName, handler);
      }
    });

    eventListeners = [];
    initialized = false;
    console.info('[DiaryRoomLogger] Cleanup complete');
  }

  // ============================================================================
  // ENTRY CREATION HELPERS
  // ============================================================================

  /**
   * Create a DR entry object
   */
  function createEntry(text, severity = 'neutral', category = 'social') {
    const entry = {
      id: `dr-${Date.now()}-${entryCounter++}`,
      timestamp: Date.now(),
      text,
      severity, // dramatic, high, neutral, private
      category  // social, game, jury, vote
    };

    // Emit to logging system
    emitEntry(entry);

    return entry;
  }

  /**
   * Emit a DR entry to the logging system
   */
  function emitEntry(entry) {
    const game = global.game || {};
    const bus = getBus();

    // Try multiple logging approaches for compatibility
    
    // 1. Use window.game.drLogs array (if it exists)
    if (Array.isArray(game.drLogs)) {
      game.drLogs.push(entry);
    }

    // 2. Use window.game.drLog function (if it exists)
    if (typeof game.drLog === 'function') {
      try {
        game.drLog(entry.text, entry.category);
      } catch (err) {
        console.warn('[DiaryRoomLogger] Error calling game.drLog:', err);
      }
    }

    // 3. Emit bus event as fallback
    if (bus && typeof bus.emit === 'function') {
      bus.emit('dr:entry', entry);
    }

    // 4. If high or dramatic severity, emit alert
    if (entry.severity === 'dramatic' || entry.severity === 'high') {
      if (bus && typeof bus.emit === 'function') {
        bus.emit('dr:alert', {
          entry,
          severity: entry.severity
        });
      }
    }

    console.info(`[DiaryRoomLogger] Entry created [${entry.severity}]:`, entry.text);
  }

  /**
   * Determine severity based on action type and outcome
   */
  function determineSeverity(payload) {
    // Use payload severity if provided
    if (payload && payload.severity) {
      return payload.severity;
    }

    // Heuristics for social actions
    const actionType = payload?.actionType || payload?.action || payload?.actionId || '';
    const outcome = payload?.outcome || payload?.success;

    // High severity actions (backstab, insult, gossip per spec)
    const highSeverityActions = ['backstab', 'insult', 'gossip', 'lie', 'betray'];
    if (highSeverityActions.some(a => actionType.toLowerCase().includes(a))) {
      return 'high';
    }

    // Dramatic outcomes
    if (outcome === 'dramatic' || outcome === 'critical') {
      return 'dramatic';
    }

    // Bond shifts or magnitude changes (>= 0.06 per spec)
    const bondDelta = payload?.bondDelta || payload?.delta || payload?.magnitude;
    if (bondDelta !== null && bondDelta !== undefined && Math.abs(bondDelta) >= 0.06) {
      return 'high';
    }

    return 'neutral';
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  /**
   * Handle social action result event
   */
  function handleSocialAction(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) {
      console.warn('[DiaryRoomLogger] DiaryTemplates not available');
      return;
    }

    // NEW: Check if payload has pre-built narrative (from sm-to-dr-adapter)
    let text;
    if (payload.narrative && typeof payload.narrative === 'string' && payload.narrative.length > 0) {
      // Use pre-built narrative from adapter
      text = payload.narrative;
      
      // Optionally append bond shifts inline
      if (payload.bondShifts && payload.bondShifts.length > 0) {
        const significantShifts = payload.bondShifts.filter(s => Math.abs(s.delta) > 0.01);
        if (significantShifts.length > 0 && templates.deltaStr) {
          const shiftTexts = significantShifts.map(s => {
            const deltaText = templates.deltaStr(s.delta);
            return `${s.targetName}: ${deltaText}`;
          }).join(', ');
          text += ` [${shiftTexts}]`;
        }
      }
    } else {
      // Enhanced: use new generateNarrative function with relationship context
      const actorId = payload.actor?.id || payload.actorId;
      const targetId = payload.target?.id || payload.targetId;
      const actionType = payload.actionType || payload.action || 'generic';
      
      // Get bond values for relationship analysis
      const bondBefore = payload.bondBefore;
      const bondAfter = payload.bondAfter;
      const outcome = payload.outcome || payload.success;

      // Use enhanced narrative generation if available
      if (templates.generateNarrative && bondBefore !== undefined && bondAfter !== undefined) {
        text = templates.generateNarrative(actorId, targetId, actionType, bondBefore, bondAfter, outcome);
      } else {
        // Fallback: use simple template system (backwards compat)
        const actor = templates.resolveName(actorId);
        const target = templates.resolveName(targetId);

        // Get template and render
        const template = templates.getSocialTemplate(actionType);
        text = templates.render(template, { actor, target });

        // Add bond delta if available
        const bondDelta = payload.bondDelta || payload.delta;
        if (bondDelta !== null && bondDelta !== undefined && Math.abs(bondDelta) > 0.01) {
          const deltaText = templates.deltaStr(bondDelta);
          if (deltaText) {
            text += ` ${deltaText}`;
          }
        }
      }
    }

    const severity = determineSeverity(payload);
    createEntry(text, severity, 'social');
  }

  /**
   * Handle social phase end event
   */
  function handleSocialPhaseEnd(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const week = (global.game?.week || 1);

    // NEW: Generate rich phase summary with highlights
    if (templates.getPhaseSummaryTemplate && payload.actions && Array.isArray(payload.actions)) {
      const highlights = extractPhaseHighlights(payload.actions, payload.bondShifts);
      
      if (highlights.length > 0) {
        // Create highlight entries
        highlights.forEach(highlight => {
          const template = templates.getPhaseSummaryTemplate(highlight.type);
          const text = templates.render(template, {
            week,
            highlight: highlight.text,
            actionCount: payload.actionCount || payload.actions.length
          });
          createEntry(text, highlight.severity, 'social');
        });
      } else {
        // No highlights, create general summary
        const template = templates.getPhaseSummaryTemplate('general');
        const text = templates.render(template, {
          week,
          actionCount: payload.actionCount || payload.actions.length
        });
        createEntry(text, 'neutral', 'social');
      }
    } else {
      // Fallback: simple per-actor summary (backwards compat)
      const actorId = payload.actor || payload.playerId;
      const count = payload.actionCount || payload.count || 0;

      if (actorId) {
        const actor = templates.resolveName(actorId);
        const template = templates.getSocialSummaryTemplate();
        const text = templates.render(template, { actor, count, week });
        createEntry(text, 'neutral', 'social');
      } else {
        // General summary
        const template = templates.getPhaseSummaryTemplate('general');
        const text = templates.render(template, {
          week,
          actionCount: count
        });
        createEntry(text, 'neutral', 'social');
      }
    }
  }

  /**
   * Extract interesting highlights from phase actions and bond shifts
   */
  function extractPhaseHighlights(actions, bondShifts) {
    const highlights = [];
    
    if (!actions || !Array.isArray(actions)) return highlights;

    // Track relationships
    const relationships = new Map();
    
    // Analyze bond shifts for major relationship changes
    if (bondShifts && Array.isArray(bondShifts)) {
      bondShifts.forEach(shift => {
        if (Math.abs(shift.delta) < 0.01) return; // Skip tiny changes
        
        const key = [shift.player1, shift.player2].sort().join('-');
        if (!relationships.has(key)) {
          relationships.set(key, {
            player1: shift.player1,
            player2: shift.player2,
            bondBefore: shift.before || 0,
            bondAfter: shift.after || 0,
            totalDelta: 0
          });
        }
        
        const rel = relationships.get(key);
        rel.totalDelta += shift.delta;
        rel.bondAfter = shift.after;
      });
    }

    const templates = global.DiaryTemplates;
    
    // Find most dramatic relationship changes
    const sortedRelationships = Array.from(relationships.values())
      .sort((a, b) => Math.abs(b.totalDelta) - Math.abs(a.totalDelta));
    
    // Add up to 3 relationship highlights
    sortedRelationships.slice(0, 3).forEach(rel => {
      if (Math.abs(rel.totalDelta) >= 0.10) { // Significant change threshold
        const relType = templates.analyzeRelationship?.(rel.bondBefore, rel.bondAfter);
        if (relType) {
          const relText = templates.getRelationshipTemplate?.(relType, rel.player1, rel.player2);
          if (relText) {
            highlights.push({
              type: rel.totalDelta > 0 ? 'social' : 'dramatic',
              text: relText,
              severity: Math.abs(rel.totalDelta) >= 0.20 ? 'high' : 'neutral'
            });
          }
        }
      }
    });

    // Find most dramatic actions (backstabs, betrayals)
    const dramaticActions = actions.filter(a => 
      ['backstab', 'lie', 'insult', 'betray', 'spread_rumor', 'confront'].includes(a.action)
    );
    
    if (dramaticActions.length > 0) {
      const action = dramaticActions[0]; // Most recent dramatic action
      const actorName = templates.resolveName(action.actor);
      const targetName = templates.resolveName(action.target);
      const actionLabel = action.action.replace(/_/g, ' ');
      
      highlights.push({
        type: 'dramatic',
        text: `${actorName} ${actionLabel} against ${targetName}`,
        severity: 'high'
      });
    }

    // Find strategic actions (alliances, strategizing)
    const strategicActions = actions.filter(a => 
      ['strategize', 'form_alliance', 'bribe'].includes(a.action)
    );
    
    if (strategicActions.length >= 3) {
      highlights.push({
        type: 'strategic',
        text: `${strategicActions.length} strategic moves were made`,
        severity: 'neutral'
      });
    }

    return highlights;
  }

  /**
   * Handle bond shift event
   */
  function handleBondShift(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const player1Id = payload.player1 || payload.actorId;
    const player2Id = payload.player2 || payload.targetId;
    const player1 = templates.resolveName(player1Id);
    const player2 = templates.resolveName(player2Id);
    const delta = payload.delta || 0;

    if (Math.abs(delta) < 0.01) return; // Ignore tiny shifts

    // NEW: Check for relationship type changes (alliance, romance, rivalry)
    let text = '';
    const bondBefore = payload.before;
    const bondAfter = payload.after;
    
    if (templates.analyzeRelationship && bondBefore !== undefined && bondAfter !== undefined) {
      const relType = templates.analyzeRelationship(bondBefore, bondAfter);
      if (relType) {
        // Significant relationship change detected
        text = templates.getRelationshipTemplate(relType, player1Id, player2Id);
      }
    }
    
    // Fallback to simple bond shift description
    if (!text) {
      const deltaText = templates.deltaStr(delta);
      const relationship = delta > 0 ? 'improved' : 'worsened';
      text = `Relationship ${relationship}: ${player1} ↔ ${player2} ${deltaText}`;
    }

    const severity = Math.abs(delta) > 0.15 ? 'high' : 'neutral';
    createEntry(text, severity, 'social');
  }

  /**
   * Handle jury member enter event
   */
  function handleJuryEnter(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const name = templates.resolveName(payload.playerId || payload.id);
    const template = templates.getJuryTemplate('enter');
    const text = templates.render(template, { name });

    createEntry(text, 'neutral', 'jury');
  }

  /**
   * Handle jury interaction event
   */
  function handleJuryInteraction(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const eventType = payload.type || 'meeting';
    const template = templates.getJuryTemplate(eventType);
    
    const data = {};
    if (payload.playerId) {
      data.name = templates.resolveName(payload.playerId);
    }

    const text = templates.render(template, data);
    createEntry(text, 'neutral', 'jury');
  }

  /**
   * Handle jury challenge result event
   */
  function handleJuryChallenge(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const winnerId = payload.winner || payload.winnerId;
    const winner = templates.resolveName(winnerId);
    const template = templates.getJuryTemplate('challenge');
    const text = templates.render(template, { winner });

    createEntry(text, 'dramatic', 'jury');
  }

  /**
   * Handle jury member exit event
   */
  function handleJuryExit(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const name = templates.resolveName(payload.playerId || payload.id);
    const template = templates.getJuryTemplate('exit');
    const text = templates.render(template, { name });

    createEntry(text, 'neutral', 'jury');
  }

  /**
   * Handle jury member return event
   */
  function handleJuryReturn(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const name = templates.resolveName(payload.playerId || payload.id);
    const template = templates.getJuryTemplate('return');
    const text = templates.render(template, { name });

    createEntry(text, 'dramatic', 'jury');
  }

  /**
   * Handle jury final discussion event
   */
  function handleJuryFinalDiscussion(_payload) {
    const templates = global.DiaryTemplates;
    if (!templates) return;

    const template = templates.getJuryTemplate('finalDiscussion');
    const text = templates.render(template, {});

    createEntry(text, 'high', 'jury');
  }

  // ============================================================================
  // ENTRY HOOK SYSTEM (for external adapters like social-ui-adapter)
  // ============================================================================

  let entryHooks = [];

  /**
   * Register a hook function to be called after entry creation
   * Hook receives (entry, entryElement) and can modify DOM
   * @param {Function} hookFn - Function to call: hookFn(entry, entryElement)
   */
  function attachEntryHook(hookFn) {
    if (typeof hookFn !== 'function') {
      console.warn('[DiaryRoomLogger] attachEntryHook: Invalid hook function');
      return;
    }
    
    entryHooks.push(hookFn);
    console.info('[DiaryRoomLogger] Entry hook attached');
  }

  /**
   * Call all registered entry hooks (internal use)
   */
  function callEntryHooks(entry, entryElement) {
    if (entryHooks.length === 0) return;
    
    entryHooks.forEach((hookFn, index) => {
      try {
        hookFn(entry, entryElement);
      } catch (err) {
        console.error(`[DiaryRoomLogger] Entry hook ${index} failed:`, err);
      }
    });
  }

  // Note: Hook invocation would need to be added to the actual DOM creation
  // logic when diary entries are rendered. For now, the hooks are registered
  // and available for future integration when the UI rendering is implemented.

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  DiaryRoomLogger.init = init;
  DiaryRoomLogger.cleanup = cleanup;
  DiaryRoomLogger.attachEntryHook = attachEntryHook;
  
  // Expose handlers for testing
  DiaryRoomLogger.handleSocialAction = handleSocialAction;
  DiaryRoomLogger.handleSocialPhaseEnd = handleSocialPhaseEnd;
  DiaryRoomLogger.handleBondShift = handleBondShift;
  DiaryRoomLogger.handleJuryEnter = handleJuryEnter;
  DiaryRoomLogger.handleJuryInteraction = handleJuryInteraction;
  DiaryRoomLogger.handleJuryChallenge = handleJuryChallenge;
  DiaryRoomLogger.handleJuryExit = handleJuryExit;
  DiaryRoomLogger.handleJuryReturn = handleJuryReturn;
  DiaryRoomLogger.handleJuryFinalDiscussion = handleJuryFinalDiscussion;

  // Export to global
  global.DiaryRoomLogger = DiaryRoomLogger;

})(window);
