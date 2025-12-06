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
    const actionType = payload?.actionType || payload?.action || '';
    const outcome = payload?.outcome || payload?.success;

    // High severity actions
    const highSeverityActions = ['backstab', 'lie', 'insult', 'betray'];
    if (highSeverityActions.some(a => actionType.toLowerCase().includes(a))) {
      return 'high';
    }

    // Dramatic outcomes
    if (outcome === 'dramatic' || outcome === 'critical') {
      return 'dramatic';
    }

    // Bond shifts
    const bondDelta = payload?.bondDelta || payload?.delta;
    if (bondDelta !== null && bondDelta !== undefined && Math.abs(bondDelta) > 0.15) {
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

    const actorId = payload.actor || payload.actorId;
    const targetId = payload.target || payload.targetId;
    const actionType = payload.actionType || payload.action || 'generic';

    const actor = templates.resolveName(actorId);
    const target = templates.resolveName(targetId);

    // Get template and render
    const template = templates.getSocialTemplate(actionType);
    let text = templates.render(template, { actor, target });

    // Add bond delta if available
    const bondDelta = payload.bondDelta || payload.delta;
    if (bondDelta !== null && bondDelta !== undefined && Math.abs(bondDelta) > 0.01) {
      const deltaText = templates.deltaStr(bondDelta);
      if (deltaText) {
        text += ` ${deltaText}`;
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

    const actorId = payload.actor || payload.playerId;
    const count = payload.actionCount || payload.count || 0;
    const week = (global.game?.week || 1);

    const actor = templates.resolveName(actorId);
    const template = templates.getSocialSummaryTemplate();
    const text = templates.render(template, { actor, count, week });

    createEntry(text, 'neutral', 'social');
  }

  /**
   * Handle bond shift event
   */
  function handleBondShift(payload) {
    if (!payload) return;

    const templates = global.DiaryTemplates;
    if (!templates) return;

    const player1 = templates.resolveName(payload.player1 || payload.actorId);
    const player2 = templates.resolveName(payload.player2 || payload.targetId);
    const delta = payload.delta || 0;

    if (Math.abs(delta) < 0.01) return; // Ignore tiny shifts

    const deltaText = templates.deltaStr(delta);
    const relationship = delta > 0 ? 'improved' : 'worsened';
    const text = `Relationship ${relationship}: ${player1} ↔ ${player2} ${deltaText}`;

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
  // PUBLIC API
  // ============================================================================

  DiaryRoomLogger.init = init;
  DiaryRoomLogger.cleanup = cleanup;
  
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
