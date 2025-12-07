// MODULE: socialActionExecutor.js
// Lightweight background executor for NPC social interactions
// Queues and executes AI actions when the primary engine is insufficient
// Emits compatible events for DiaryRoomLogger integration

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const DEFAULT_CONFIG = {
    maxFillActionsPerPhase: 3,      // Max fill actions per NPC per phase
    backgroundRate: 0.15,            // Probability of background action per tick
    allowTargetHuman: true,          // Allow NPCs to target human player
    lightActionCost: 1,              // Energy cost for light actions
    heavyActionCost: 2,              // Energy cost for heavy actions
    conservativeSuccess: 0.7,        // Success rate for conservative heuristic
    enabled: false                   // Master switch (opt-in via config)
  };

  let config = { ...DEFAULT_CONFIG };

  // ============================================================================
  // STATE
  // ============================================================================
  let actionQueue = [];              // Queued heavy actions
  let backgroundTimer = null;        // Background tick timer
  let isActive = false;              // Executor active flag
  const phaseActionCounts = new Map(); // Actions executed this phase per NPC
  const ephemeralBonds = new Map();    // Temporary bond changes for phase

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  function init(userConfig = {}) {
    config = { ...DEFAULT_CONFIG, ...userConfig };
    
    // Check for force-enable flag
    if (global.FORCE_SOCIAL_FALLBACK === true) {
      config.enabled = true;
      console.info('[socialActionExecutor] Force-enabled via FORCE_SOCIAL_FALLBACK flag');
    }
    
    console.info('[socialActionExecutor] ✓ Initialized with config:', config);
    
    // Listen for phase events
    const bus = getBus();
    if (bus) {
      bus.on('social.phase:start', handlePhaseStart);
      bus.on('social.phase:end', handlePhaseEnd);
    }
  }

  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  // ============================================================================
  // ENERGY & BUDGET TRACKING
  // ============================================================================
  function getPlayerEnergy(playerId) {
    const g = global.game;
    if (!g) return 0;
    
    // Try to get from latest summary first
    const summary = g.__latestSocialSummary?.phaseSummary;
    if (summary && summary.energySpent) {
      const spent = summary.energySpent[playerId] || 0;
      const initial = summary.initialEnergy || 5;
      return Math.max(0, initial - spent);
    }
    
    // Fallback: check SocialManeuvers energy bank
    if (global.SocialManeuvers?.SocialResources?.get) {
      const resources = global.SocialManeuvers.SocialResources.get(playerId);
      return resources?.energy || 0;
    }
    
    // Conservative default
    return 5;
  }

  function canPlayerAct(playerId) {
    const actionCount = phaseActionCounts.get(playerId) || 0;
    const energy = getPlayerEnergy(playerId);
    
    return actionCount < config.maxFillActionsPerPhase && energy > 0;
  }

  function incrementActionCount(playerId) {
    phaseActionCounts.set(playerId, (phaseActionCounts.get(playerId) || 0) + 1);
  }

  // ============================================================================
  // NPC SELECTION
  // ============================================================================
  function getEligibleNPCs() {
    const g = global.game;
    if (!g) return [];

    const alive = (global.alivePlayers?.() || [])
      .filter(p => !p.evicted && p.id !== g.humanId);

    return alive.filter(p => canPlayerAct(p.id));
  }

  function selectRandomNPC() {
    const eligible = getEligibleNPCs();
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  function selectRandomTarget(actorId) {
    const g = global.game;
    if (!g) return null;

    let candidates = (global.alivePlayers?.() || [])
      .filter(p => !p.evicted && p.id !== actorId);

    // Optionally exclude human
    if (!config.allowTargetHuman) {
      candidates = candidates.filter(p => p.id !== g.humanId);
    }

    if (candidates.length === 0) return null;
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  // ============================================================================
  // ACTION GENERATION
  // ============================================================================
  const LIGHT_ACTIONS = ['observe', 'small_talk', 'compliment'];
  const HEAVY_ACTIONS = ['strategize', 'confide', 'gossip', 'form_alliance'];

  function selectAction(isLight = true) {
    const pool = isLight ? LIGHT_ACTIONS : HEAVY_ACTIONS;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  function generateActionPayload(actorId, targetId, actionId, isLight = true) {
    // Conservative heuristic for success
    const success = Math.random() < config.conservativeSuccess;
    const magnitude = success ? (0.5 + Math.random() * 1.5) : (-0.3 - Math.random() * 0.7);
    
    // Energy cost
    const energyCost = isLight ? config.lightActionCost : config.heavyActionCost;

    return {
      actorId,
      targetId,
      actionId,
      actionLabel: actionId.replace(/_/g, ' '),
      success,
      magnitude,
      energyCost,
      timestamp: Date.now()
    };
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================
  function executeAction(payload) {
    const { actorId, targetId, actionId, success, magnitude } = payload;

    // Update ephemeral bonds
    const bondKey = `${actorId}-${targetId}`;
    const currentBond = ephemeralBonds.get(bondKey) || 0;
    const newBond = currentBond + magnitude;
    ephemeralBonds.set(bondKey, newBond);

    // Increment action count
    incrementActionCount(actorId);

    // Emit event for DiaryRoomLogger
    emitActionResult(payload);

    // Emit bond shift if significant
    if (Math.abs(magnitude) > 0.5) {
      emitBondShift(actorId, targetId, magnitude);
    }

    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    console.info(
      `[socialActionExecutor] ${actorName} → ${actionId} → ${targetName}: ${success ? 'success' : 'neutral'} (Δ${magnitude.toFixed(1)})`
    );

    return { success: true, payload };
  }

  function emitActionResult(payload) {
    const { actorId, targetId, actionId, actionLabel, success, magnitude } = payload;
    
    const event = new CustomEvent('social.action:result', {
      detail: {
        actorId,
        targetId,
        actionId,
        actionLabel,
        outcome: {
          type: success ? 'success' : 'neutral',
          message: `${actionLabel} with ${global.safeName?.(targetId) || 'player'}`,
          affinityChange: magnitude,
          succeeded: success
        },
        source: 'socialActionExecutor'
      }
    });
    
    window.dispatchEvent(event);
  }

  function emitBondShift(actorId, targetId, delta) {
    const event = new CustomEvent('bond.shift', {
      detail: {
        actorId,
        targetId,
        delta,
        source: 'socialActionExecutor'
      }
    });
    
    window.dispatchEvent(event);
  }

  // ============================================================================
  // QUEUE MANAGEMENT
  // ============================================================================
  function queueAction(payload) {
    if (!config.enabled) return;
    
    actionQueue.push(payload);
    console.info('[socialActionExecutor] Queued action:', payload.actionId);
  }

  function flushQueue() {
    if (!config.enabled) return;
    
    if (actionQueue.length === 0) {
      console.info('[socialActionExecutor] No queued actions to flush');
      return;
    }

    console.info(`[socialActionExecutor] Flushing ${actionQueue.length} queued actions`);
    
    const results = [];
    while (actionQueue.length > 0) {
      const payload = actionQueue.shift();
      
      // Check if actor can still act
      if (!canPlayerAct(payload.actorId)) {
        console.debug('[socialActionExecutor] Skipping queued action - actor budget exhausted');
        continue;
      }
      
      const result = executeAction(payload);
      results.push(result);
    }

    return results;
  }

  // ============================================================================
  // BACKGROUND TICK
  // ============================================================================
  function runBackgroundTick() {
    if (!config.enabled || !isActive) return;

    // Random chance to execute a light action
    if (Math.random() > config.backgroundRate) return;

    const actor = selectRandomNPC();
    if (!actor) return;

    const target = selectRandomTarget(actor.id);
    if (!target) return;

    // Execute light action immediately
    const actionId = selectAction(true); // Light action
    const payload = generateActionPayload(actor.id, target.id, actionId, true);
    executeAction(payload);
  }

  function startBackgroundTicks() {
    if (!config.enabled) return;
    
    if (backgroundTimer) {
      clearInterval(backgroundTimer);
    }

    // Run background ticks every 2 seconds
    backgroundTimer = setInterval(runBackgroundTick, 2000);
    console.info('[socialActionExecutor] Background ticks started');
  }

  function stopBackgroundTicks() {
    if (backgroundTimer) {
      clearInterval(backgroundTimer);
      backgroundTimer = null;
      console.info('[socialActionExecutor] Background ticks stopped');
    }
  }

  // ============================================================================
  // PHASE MANAGEMENT
  // ============================================================================
  function handlePhaseStart() {
    if (!config.enabled) return;

    console.info('[socialActionExecutor] Social phase started');
    isActive = true;
    phaseActionCounts.clear();
    ephemeralBonds.clear();
    actionQueue = [];

    // Start background ticks for lightweight interactions
    startBackgroundTicks();
  }

  function handlePhaseEnd(data) {
    if (!config.enabled) return;

    console.info('[socialActionExecutor] Social phase ending - flushing queue');
    
    // Flush any remaining queued actions
    flushQueue();

    // Stop background ticks
    stopBackgroundTicks();

    // Build and emit phase summary
    emitPhaseSummary(data);

    isActive = false;
  }

  function emitPhaseSummary(data) {
    const totalActions = Array.from(phaseActionCounts.values()).reduce((a, b) => a + b, 0);
    
    const summary = {
      totalActions,
      actionsPerPlayer: Object.fromEntries(phaseActionCounts),
      bondChanges: Object.fromEntries(ephemeralBonds),
      source: 'socialActionExecutor'
    };

    console.info('[socialActionExecutor] Phase summary:', summary);

    // Augment existing phase end event if available
    if (data && data.phaseSummary) {
      data.phaseSummary.executorActions = totalActions;
      data.phaseSummary.executorBonds = summary.bondChanges;
    }
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  const API = {
    init,
    queueAction,
    runBackgroundTick,
    flushQueue,
    getState() {
      return {
        config,
        isActive,
        queueLength: actionQueue.length,
        phaseActionCounts: Object.fromEntries(phaseActionCounts),
        totalActions: Array.from(phaseActionCounts.values()).reduce((a, b) => a + b, 0),
        ephemeralBonds: Object.fromEntries(ephemeralBonds)
      };
    }
  };

  // Export to global
  global.SocialActionExecutor = API;

  // Add to debug API
  if (!global.__smDebug) {
    global.__smDebug = {};
  }
  global.__smDebug.executor = API;

  console.info('[socialActionExecutor] ✓ Module loaded');
  console.info('[socialActionExecutor] ✓ Dev API: window.__smDebug.executor.getState()');

})(typeof window !== 'undefined' ? window : global);
