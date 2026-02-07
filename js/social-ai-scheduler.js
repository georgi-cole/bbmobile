// MODULE: social-ai-scheduler.js
// Background AI-to-AI social interactions during Social phase
// Uses existing Social Maneuvers engine for lightweight, fair, and realistic AI behavior

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const DEFAULT_CONFIG = {
    enabled: true,                    // Master switch
    aggression: 'low',                // 'low' | 'medium' - controls risky action weights
    maxPerPhase: 5,                   // Soft cap per AI per phase
    tickIntervalMin: 1200,            // Minimum tick interval (ms)
    tickIntervalMax: 1800,            // Maximum tick interval (ms)
    maxActionsPerTick: 2,             // 0-2 interactions per tick
    emptyEnergyBurstCount: 3,         // Total AI interactions during empty-energy skip
    emptyEnergyBurstDelay: 800,       // Delay between burst interactions (ms)
    verbose: false,                    // Verbose logging for debugging
    maxTicksPerPhase: 1000,           // Safety cap to prevent infinite loops
    compactLogs: true,                // Compact logging (periodic summaries instead of every tick)
    compactLogInterval: 10            // Log summary every N ticks when compactLogs is true
  };

  function getConfig() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return {
      enabled: cfg.aiSocialEnabled ?? DEFAULT_CONFIG.enabled,
      aggression: cfg.aiSocialAggression || DEFAULT_CONFIG.aggression,
      maxPerPhase: cfg.aiSocialMaxPerPhase ?? DEFAULT_CONFIG.maxPerPhase,
      tickIntervalMin: DEFAULT_CONFIG.tickIntervalMin,
      tickIntervalMax: DEFAULT_CONFIG.tickIntervalMax,
      maxActionsPerTick: DEFAULT_CONFIG.maxActionsPerTick,
      emptyEnergyBurstCount: DEFAULT_CONFIG.emptyEnergyBurstCount,
      emptyEnergyBurstDelay: DEFAULT_CONFIG.emptyEnergyBurstDelay,
      highlightsEnabled: cfg.socialHighlightsEnabled ?? true,
      verbose: cfg.aiSocialVerbose ?? DEFAULT_CONFIG.verbose,
      compactLogs: cfg.aiSocialCompactLogs ?? DEFAULT_CONFIG.compactLogs,
      compactLogInterval: cfg.aiSocialCompactLogInterval ?? DEFAULT_CONFIG.compactLogInterval
    };
  }

  // ============================================================================
  // STATE & TRACKING
  // ============================================================================
  let schedulerTimer = null;
  let rafHandle = null;          // RequestAnimationFrame handle for pump
  let isRunning = false;
  let isPaused = false;          // New: pause state (suspends work, keeps loop)
  let isActive = false;          // Guard flag to prevent re-entry
  let phaseContext = null;       // eslint-disable-line no-unused-vars
  const actionCounts = new Map(); // Track actions per AI this phase
  const recentPairings = new Set(); // Avoid duplicate pairings in short succession
  let tickCount = 0;            // Track total ticks per phase
  let idlePassCount = 0;        // Track consecutive passes with no actions
  let lastTickTime = 0;         // Last tick timestamp for watchdog
  let watchdogTimer = null;      // Watchdog timer to restart stalled loop

  function initPhaseState() {
    actionCounts.clear();
    recentPairings.clear();
    tickCount = 0;
    idlePassCount = 0;
    lastTickTime = Date.now();
    isPaused = false;
  }
  
  // ============================================================================
  // DEBUG LOGGING (gated by config flag)
  // ============================================================================
  /**
   * Debug-level logging - verbose/detailed output
   * Only logs when debugSocialAI flag is enabled
   */
  function debugLog(message, ...args) {
    const config = getConfig();
    const debugEnabled = config.verbose || global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.log(`[ai-scheduler:debug] ${message}`, ...args);
    }
  }
  
  /**
   * Info-level logging - important lifecycle events
   * Respects compactLogs configuration:
   * - If compactLogs is true, only logs on startup/shutdown and periodic summaries
   * - If debugSocialAI is true, logs all info messages
   */
  function infoLog(message, reason = '') {
    const config = getConfig();
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    
    // Always log if debug is explicitly enabled
    if (debugEnabled) {
      const reasonStr = reason ? ` (reason: ${reason})` : '';
      console.info(`[ai-scheduler] ${message}${reasonStr}`);
      return;
    }
    
    // If compact logs is enabled, suppress most info logs
    // Only log lifecycle events (start/stop) and summaries
    if (config.compactLogs) {
      const isLifecycleEvent = message.includes('▶️') || message.includes('◼️') || 
                               message.includes('🛑') || message.includes('⏸️') ||
                               message.includes('Phase summary:');
      if (isLifecycleEvent) {
        const reasonStr = reason ? ` (reason: ${reason})` : '';
        console.info(`[ai-scheduler] ${message}${reasonStr}`);
      }
    } else {
      // Compact logs disabled - log everything
      const reasonStr = reason ? ` (reason: ${reason})` : '';
      console.info(`[ai-scheduler] ${message}${reasonStr}`);
    }
  }
  
  /**
   * Warning-level logging - potential issues
   * Only logs when debugSocialAI flag is enabled
   */
  function warnLog(message, ...args) {
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (!debugEnabled) return;
    
    console.warn(`[ai-scheduler] ${message}`, ...args);
  }
  
  /**
   * Error-level logging - always logs (critical errors should always be visible)
   */
  function errorLog(message, ...args) {
    console.error(`[ai-scheduler] ${message}`, ...args);
  }

  function getPairingKey(actorId, targetIds) {
    const sorted = [actorId, ...targetIds].sort((a, b) => a - b);
    return sorted.join('-');
  }

  function wasRecentlyPaired(actorId, targetIds) {
    const key = getPairingKey(actorId, targetIds);
    return recentPairings.has(key);
  }

  function markPairing(actorId, targetIds) {
    const key = getPairingKey(actorId, targetIds);
    recentPairings.add(key);
    // Clear old pairings after some time to allow re-pairing
    setTimeout(() => recentPairings.delete(key), 30000); // 30s cooldown
  }

  function incrementActionCount(actorId) {
    actionCounts.set(actorId, (actionCounts.get(actorId) || 0) + 1);
  }

  function getActionCount(actorId) {
    return actionCounts.get(actorId) || 0;
  }

  // ============================================================================
  // AI PLAYER SELECTION
  // ============================================================================
  function getEligibleAIPlayers() {
    const g = global.game;
    if (!g) return [];

    const alivePlayers = (global.alivePlayers?.() || [])
      .filter(p => !p.evicted && p.id !== g.humanId);

    return alivePlayers;
  }

  function selectRandomAI(exclude = []) {
    const eligible = getEligibleAIPlayers().filter(p => !exclude.includes(p.id));
    if (eligible.length === 0) return null;
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  function selectRandomTarget(actorId, multiTarget = false, maxTargets = 4) {
    const eligible = getEligibleAIPlayers().filter(p => p.id !== actorId);
    if (eligible.length === 0) return null;

    if (multiTarget) {
      // Select 2-maxTargets random targets
      const count = Math.min(
        2 + Math.floor(Math.random() * (maxTargets - 1)),
        eligible.length
      );
      const shuffled = [...eligible].sort(() => Math.random() - 0.5);
      return shuffled.slice(0, count).map(p => p.id);
    } else {
      // Single target
      const target = eligible[Math.floor(Math.random() * eligible.length)];
      return [target.id];
    }
  }

  // ============================================================================
  // ACTION SELECTION
  // ============================================================================
  function selectAction(actorId, targetIds) {
    const config = getConfig();
    const SM = global.SocialManeuvers;
    if (!SM) return null;

    // Get available actions based on first target
    const actions = SM.getAvailableActions?.(actorId, targetIds[0]) || SM.SOCIAL_ACTIONS || [];
    
    // Filter by affordability and eligibility
    const affordable = actions.filter(a => {
      // Check if actor can afford the action (use unified cost calculation)
      const costCalc = SM.computeActionCost?.(a.id, targetIds) || { total: 0 };
      
      // Build full cost object including energy, influence, and information
      const fullCosts = {
        energy: costCalc?.total ?? 0,
        influence: a.costs?.influence ?? 0,
        information: a.costs?.information ?? 0
      };
      
      // Check affordability for ALL resource types
      if (!SM.SocialResources?.canAfford(actorId, fullCosts)) return false;
      
      // Multi-target actions only if we have multiple targets
      if (a.multiTarget && targetIds.length < (a.minTargets || 2)) return false;
      if (!a.multiTarget && targetIds.length > 1) return false;
      
      return true;
    });

    if (affordable.length === 0) return null;

    // Weight actions based on category and aggression level
    const weights = {
      friendly: 40,   // small_talk, compliment, confide, group_hangout
      neutral: 30,    // strategize, observe
      strategic: 20,  // mediate, form_alliance
      aggressive: config.aggression === 'medium' ? 10 : 2  // confront, interrogate, spread_rumor, expose_secret
    };

    // Build weighted pool
    const weightedPool = [];
    affordable.forEach(action => {
      const category = action.category || 'neutral';
      const weight = weights[category] || 10;
      for (let i = 0; i < weight; i++) {
        weightedPool.push(action);
      }
    });

    if (weightedPool.length === 0) return null;

    // Pick random weighted action
    return weightedPool[Math.floor(Math.random() * weightedPool.length)];
  }

  // ============================================================================
  // ACTION EXECUTION
  // ============================================================================
  function executeAIAction(actorId, targetIds, action) {
    const SM = global.SocialManeuvers;
    if (!SM) return null;

    try {
      // Use unified cost calculator
      const costCalc = SM.computeActionCost?.(action.id, targetIds);
      if (!costCalc) {
        warnLog('computeActionCost not available');
        return null;
      }

      // Build full cost object including energy, influence, and information
      const fullCosts = {
        energy: costCalc?.total ?? 0,
        influence: action.costs?.influence ?? 0,
        information: action.costs?.information ?? 0
      };

      // Verify affordability for ALL resource types (cost may have changed)
      if (!SM.SocialResources?.canAfford(actorId, fullCosts)) {
        return null;
      }

      // Execute action using existing engine
      // executeAction signature: executeAction(actorId, targetId, actionId, extraTargetIds)
      const primaryTarget = targetIds[0];
      const extraTargets = targetIds.slice(1);
      const result = SM.executeAction?.(actorId, primaryTarget, action.id, extraTargets);
      
      // Defensive: handle missing result or failed execution
      if (!result) {
        warnLog('executeAction returned null/undefined');
        return null;
      }
      
      // If action failed (e.g., insufficient resources), return early
      // Note: Failed actions are not counted toward rate limiting since they consume no resources
      if (!result.success) {
        debugLog(`Action failed: ${result.reason || 'unknown'}`);
        return result;
      }

      // Track action count
      incrementActionCount(actorId);
      markPairing(actorId, targetIds);

      // ============================================================================
      // NORMALIZE OUTCOME STRUCTURE
      // ============================================================================
      // The Social Maneuvers engine returns:
      // { success, action, outcome, evaluation, succeeded, telemetry, resources, affinityDelta }
      // Where outcome is: { type, message, affinityChange, traitModifiers, memoryModifiers, succeeded }
      //
      // Normalize to extract deltas from multiple possible sources:
      const outcome = result.outcome || {};
      
      // Build normalized deltas object
      const deltas = {
        // Energy delta: computed from resources before/after (if available)
        energy: 0,
        
        // Information delta: not directly in outcome, check resources if needed
        information: 0,
        
        // Influence delta: comes from pairwise influence system, not top-level
        // The influence is tracked per actor-target pair via SocialResources.adjustInfluence
        influence: 0
      };

      // Extract affinity change (relationship delta)
      // This can come from outcome.affinityChange or result.affinityDelta
      const affinityChange = outcome.affinityChange ?? result.affinityDelta ?? 0;
      
      // Build pairwise deltas for all targets
      // Format: { targetId: { affinity: delta, influence: delta } }
      const pairwise = {};
      targetIds.forEach(targetId => {
        pairwise[targetId] = {
          affinity: affinityChange,
          influence: 0  // Influence is tracked separately in SocialResources
        };
      });

      // Log verbose output for debugging (behind config flag)
      debugLog('Normalized outcome:', {
        actionId: action.id,
        actorId,
        targetIds,
        deltas,
        pairwise,
        rawOutcome: outcome
      });

      // Emit event for UI refresh and highlights
      emitAIInteractionEvent({
        actorId,
        targetIds,
        actionId: action.id,
        success: result.success && (outcome.type === 'success' || outcome.type === 'positive'),
        outcome,
        deltas,
        pairwise
      });

      return result;
    } catch (e) {
      errorLog('executeAIAction failed:', e);
      return null;
    }
  }

  function emitAIInteractionEvent(data) {
    try {
      const event = new CustomEvent('sm-ai-interaction', { detail: data });
      window.dispatchEvent(event);
    } catch (e) {
      errorLog('Failed to emit event:', e);
    }
  }

  // ============================================================================
  // INTEGRATOR HELPERS
  // ============================================================================

  /**
   * Build phase context for integrator
   */
  function buildPhaseContext() {
    const g = global.game;
    if (!g) return {};
    
    return {
      phase: phaseContext?.phase || 'general',
      currentPhase: phaseContext?.phase || 'general',
      currentHOH: g.currentHOH,
      nominees: g.nominees || [],
      vetoHolder: g.vetoHolder,
      povHolder: g.vetoHolder,
      week: g.week || 1
    };
  }

  /**
   * Build relation graph helper
   */
  function buildRelationGraph() {
    return {
      getRelation(actorId, targetId) {
        // Get affinity/trust from game state
        const affinity = getAffinity(actorId, targetId);
        
        // Classify as ally, rival, or neutral
        if (affinity >= 0.6) return 'ally';
        if (affinity <= -0.4) return 'rival';
        return 'neutral';
      },
      getTrust(actorId, targetId) {
        // Could query SocialManeuvers trust values
        return 0.5;
      },
      getRivalry(actorId, targetId) {
        const affinity = getAffinity(actorId, targetId);
        return Math.max(0, -affinity);
      }
    };
  }

  /**
   * Get affinity between two players
   */
  function getAffinity(playerId1, playerId2) {
    if (global.getAffinity) {
      return global.getAffinity(playerId1, playerId2) || 0;
    }
    
    const g = global.game;
    if (g && g.__affinities) {
      const key = [playerId1, playerId2].sort((a, b) => a - b).join('-');
      return g.__affinities.get(key) || 0;
    }
    
    return 0;
  }

  /**
   * Execute action with enriched context for registry-based actions
   */
  function executeAIActionWithContext(actorId, targetIds, action, context) {
    const SM = global.SocialManeuvers;
    if (!SM) return null;

    try {
      // Check if this is a registry action
      const registry = global.SocialActionsRegistry;
      const registryAction = registry ? registry.get(action.id) : null;
      
      if (registryAction) {
        // Use registry outcome with enriched context
        return executeRegistryAction(actorId, targetIds, registryAction, context);
      } else {
        // Fallback to standard execution
        return executeAIAction(actorId, targetIds, action);
      }
    } catch (e) {
      errorLog('executeAIActionWithContext failed:', e);
      return null;
    }
  }

  /**
   * Execute registry-based action with outcome generation
   */
  function executeRegistryAction(actorId, targetIds, action, context) {
    const SM = global.SocialManeuvers;
    if (!SM) return null;

    try {
      // Compute cost
      const costCalc = SM.computeActionCost?.(action.id, targetIds) || { total: action.cost || 0 };
      const fullCosts = {
        energy: costCalc?.total ?? action.cost ?? 0,
        influence: action.costs?.influence ?? 0,
        information: action.costs?.information ?? 0
      };

      // Verify affordability
      if (!SM.SocialResources?.canAfford(actorId, fullCosts)) {
        return { success: false, reason: 'insufficient_resources' };
      }

      // Generate outcome via registry
      const outcome = action.outcome(context);
      
      // Compute truthiness if intel action
      const truthiness = computeActionTruthiness(actorId, targetIds[0], context);
      
      // Deduct resources
      const deducted = SM.SocialResources?.spend(actorId, fullCosts);
      if (!deducted || !deducted.success) {
        return { success: false, reason: 'deduction_failed' };
      }

      // Apply deltas
      applyOutcomeDeltas(actorId, targetIds, outcome.deltas);

      // Track action count
      incrementActionCount(actorId);
      markPairing(actorId, targetIds);

      // Emit enriched event
      emitEnrichedInteractionEvent({
        actorId,
        targetIds,
        actionId: action.id,
        success: true,
        outcome,
        deltas: outcome.deltas,
        truthiness,
        context
      });

      return {
        success: true,
        action,
        outcome,
        truthiness,
        energyCost: fullCosts.energy
      };
    } catch (e) {
      errorLog('executeRegistryAction failed:', e);
      return null;
    }
  }

  /**
   * Compute truthiness for intel actions
   */
  function computeActionTruthiness(actorId, targetId, context) {
    if (!global.SocialFlavor || !global.SocialFlavor.computeTruthiness) {
      return 'true';
    }
    
    // Get affinity as proxy for trust
    const affinity = getAffinity(actorId, targetId);
    const trust = Math.max(0, Math.min(1, (affinity + 1) / 2)); // Normalize to 0-1
    const rivalry = Math.max(0, -affinity);
    
    // Determine role incentive
    let roleIncentive = 0;
    if (context.hohName && targetId === context.hohName) {
      roleIncentive = 0.1; // HOH has slight incentive to be truthful
    }
    
    return global.SocialFlavor.computeTruthiness({
      actorId,
      targetId,
      actorTrust: trust,
      actorRivalry: rivalry,
      roleIncentive
    });
  }

  /**
   * Apply outcome deltas to relationships
   */
  function applyOutcomeDeltas(actorId, targetIds, deltas) {
    if (!deltas) return;
    
    // Apply affinity changes
    if (deltas.affinity) {
      for (const targetId of targetIds) {
        adjustAffinity(actorId, targetId, deltas.affinity);
      }
    }
    
    // Trust, rivalry, influence deltas would be applied here
    // (Implementation depends on game's relationship system)
  }

  /**
   * Adjust affinity between two players
   */
  function adjustAffinity(playerId1, playerId2, delta) {
    const g = global.game;
    if (!g) return;
    
    if (!g.__affinities) {
      g.__affinities = new Map();
    }
    
    const key = [playerId1, playerId2].sort((a, b) => a - b).join('-');
    const current = g.__affinities.get(key) || 0;
    const newValue = Math.max(-1, Math.min(1, current + delta));
    g.__affinities.set(key, newValue);
  }

  /**
   * Emit enriched interaction event (for enricher)
   */
  function emitEnrichedInteractionEvent(data) {
    try {
      // Emit standard sm-ai-interaction
      emitAIInteractionEvent(data);
      
      // Also emit social.action:result for enricher
      const enrichedEvent = new CustomEvent('social.action:result', { 
        detail: {
          actorId: data.actorId,
          targetId: data.targetIds[0],
          actionId: data.actionId,
          success: data.success,
          outcome: data.outcome,
          deltas: data.deltas,
          truthiness: data.truthiness,
          actorTrust: data.context?.actorTrust,
          actorRivalry: data.context?.actorRivalry,
          roleIncentive: data.context?.roleIncentive,
          hohTarget: data.context?.hohTarget,
          hohName: data.context?.hohName,
          suggestedTarget: data.outcome?.suggestedTarget
        }
      });
      window.dispatchEvent(enrichedEvent);
    } catch (e) {
      errorLog('Failed to emit enriched event:', e);
    }
  }

  // ============================================================================
  // PHASE DETECTION
  // ============================================================================
  /**
   * Check if currently in a social phase
   * Accepts both 'intermission' and 'social_intermission'
   */
  function isSocialPhase() {
    const currentPhase = global.game?.phase;
    return currentPhase === 'intermission' || currentPhase === 'social_intermission';
  }

  // ============================================================================
  // SCHEDULER LOGIC - ROBUST TICK LOOP
  // ============================================================================
  // Use setInterval as primary heartbeat + RAF pump for responsiveness
  
  function scheduleNextTick() {
    // Guard: prevent re-entry and check if still running
    if (!isRunning) {
      debugLog('scheduleNextTick: not running, skip');
      return;
    }
    
    // Guard: stop if not in social phase
    if (!isSocialPhase()) {
      warnLog('⚠️ Not in social phase - stopping scheduler');
      stopAiSocialPhase('not_in_social_phase');
      return;
    }

    // Check for fast-forward mode and compress interval
    const game = global.game || {};
    const isFastForward = game.__ffActive === true;
    let delay;
    
    if (isFastForward) {
      // Use compressed interval from config, default to 200ms
      const ffInterval = game.cfg?.fastForwardSocialActionInterval || 200;
      delay = ffInterval;
      debugLog(`Fast-forward active - using compressed interval: ${delay}ms`);
    } else {
      // Normal interval - configurable ~800ms default
      const config = getConfig();
      
      // Safety check: max ticks per phase
      if (tickCount >= config.maxTicksPerPhase) {
        warnLog(`⚠️ MAX_TICKS_PER_PHASE (${config.maxTicksPerPhase}) reached - terminating phase`);
        endSocialPhase();
        return;
      }
      
      // Use a fixed interval for robust heartbeat (800ms)
      delay = 800;
    }

    schedulerTimer = setTimeout(() => {
      performTick();
      scheduleNextTick();
    }, delay);
  }
  
  // RAF pump for optional responsiveness (called independently)
  function rafPump() {
    if (!isRunning) return;
    
    // Only perform work if not paused
    if (!isPaused && isActive) {
      // RAF pump just ensures the scheduler is responsive
      // Actual tick work happens in setInterval heartbeat
      debugLog('RAF pump alive');
    }
    
    // Continue pumping
    rafHandle = requestAnimationFrame(rafPump);
  }
  
  // Watchdog: restart loop if no tick occurs for >2.5s (debug-gated)
  function startWatchdog() {
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (!debugEnabled) return;
    
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
    }
    
    watchdogTimer = setTimeout(() => {
      const timeSinceLastTick = Date.now() - lastTickTime;
      if (timeSinceLastTick > 2500 && isRunning && !isPaused) {
        warnLog('⚠️ Watchdog: No tick for >2.5s - restarting loop');
        infoLog('Watchdog restarting stalled loop', 'no_tick_detected');
        
        // Restart the tick loop
        if (schedulerTimer) {
          clearTimeout(schedulerTimer);
          schedulerTimer = null;
        }
        scheduleNextTick();
        startWatchdog(); // Restart watchdog
      }
    }, 3000); // Check every 3s
  }

  function performTick() {
    if (!isRunning || !isActive) return;
    
    // Skip work if paused (but keep loop running)
    if (isPaused) {
      debugLog('performTick: paused, skipping work');
      return;
    }
    
    // Guard: stop if not in social phase
    if (!isSocialPhase()) {
      warnLog('⚠️ Not in social phase during tick - stopping');
      stopAiSocialPhase('phase_changed');
      return;
    }

    lastTickTime = Date.now(); // Update watchdog timestamp
    tickCount++;
    
    const config = getConfig();
    
    // Compact logging: only log periodic summaries
    if (config.compactLogs && tickCount % config.compactLogInterval === 0) {
      const totalActions = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
      console.info(`[ai-scheduler] 📊 Tick ${tickCount}: ${totalActions} total actions (${actionCounts.size} active players)`);
    } else {
      debugLog(`Tick #${tickCount}, lastTickTime: ${lastTickTime}`);
    }
    
    const aiPlayers = getEligibleAIPlayers();
    
    if (aiPlayers.length < 2) {
      // Need at least 2 AI players for interactions
      debugLog('Not enough AI players for interactions (need 2+)');
      idlePassCount++;
      // If multiple consecutive idle passes, end phase
      if (idlePassCount >= 5) {
        warnLog('Too many idle passes (not enough AI players) - ending phase');
        endSocialPhase();
      }
      return;
    }

    // Decide how many interactions this tick (0-2)
    const actionCount = Math.random() < 0.3 ? 0 : 
                       Math.random() < 0.6 ? 1 : 2;

    let actionsExecuted = 0;
    for (let i = 0; i < actionCount; i++) {
      const result = performSingleInteraction();
      if (result) actionsExecuted++;
    }
    
    // Track idle passes (no actions executed)
    if (actionsExecuted === 0) {
      idlePassCount++;
      debugLog(`Idle pass ${idlePassCount} (no actions executed)`);
      
      // Safety: if no actions executed in multiple consecutive passes, end phase
      if (idlePassCount >= 10) {
        warnLog('⚠️ Too many consecutive idle passes - no actors can execute actions - terminating phase');
        endSocialPhase();
      }
    } else {
      // Reset idle counter on successful execution
      idlePassCount = 0;
    }
  }

  function performSingleInteraction() {
    const config = getConfig();
    
    // Select actor (with soft cap check)
    let attempts = 0;
    let actor = null;
    while (attempts < 10) {
      const candidate = selectRandomAI();
      if (!candidate) return false;
      
      // Soft cap: prefer AIs with fewer actions
      const count = getActionCount(candidate.id);
      if (count < config.maxPerPhase || Math.random() < 0.2) {
        actor = candidate;
        break;
      }
      attempts++;
    }

    if (!actor) return false;

    // Try new integrator-based selection if available
    if (global.SocialAIIntegrator && config.enabled) {
      return performIntegratedInteraction(actor.id);
    }

    // Fallback to legacy selection (for backward compatibility)
    return performLegacyInteraction(actor.id);
  }

  /**
   * Perform interaction using new integrator system
   */
  function performIntegratedInteraction(actorId) {
    try {
      // Build phase context
      const phaseCtx = buildPhaseContext();
      
      // Get actor's budget
      const SM = global.SocialManeuvers;
      const budget = SM?.SocialResources?.get(actorId, 'energy') || 0;
      
      // Build relation graph helper
      const relationGraph = buildRelationGraph();
      
      // Select action via integrator
      const selection = global.SocialAIIntegrator.selectActionForActor(actorId, phaseCtx, {
        budget,
        relationGraph
      });
      
      if (!selection) {
        return false;
      }
      
      const { action, targetId, context } = selection;
      
      // Convert single targetId to array for executeAIAction
      const targetIds = [targetId];
      
      // Skip if recently paired
      if (wasRecentlyPaired(actorId, targetIds)) {
        return false;
      }
      
      // Execute action with enriched context
      const result = executeAIActionWithContext(actorId, targetIds, action, context);
      
      if (result && result.success) {
        const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
        const targetNames = targetIds.map(tid => 
          global.safeName?.(tid) || `Player ${tid}`
        ).join(', ');
        
        const outcomeType = result.outcome?.type || 'unknown';
        
        debugLog(`${actorName} → ${action.label} → ${targetNames}: ${outcomeType}`);
        return true;
      } else if (result && !result.success) {
        const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
        debugLog(`${actorName} → ${action.label}: failed (${result.reason || 'unknown'})`);
        return false;
      }
      
      return false;
    } catch (err) {
      errorLog('Error in integrated interaction:', err);
      // Fallback to legacy
      return performLegacyInteraction(actorId);
    }
  }

  /**
   * Legacy interaction logic (pre-integrator)
   */
  function performLegacyInteraction(actorId) {
    // Decide if multi-target (group action) - 20% chance
    const isMultiTarget = Math.random() < 0.2;
    
    // Select targets
    const targetIds = selectRandomTarget(actorId, isMultiTarget);
    if (!targetIds || targetIds.length === 0) return false;

    // Skip if recently paired
    if (wasRecentlyPaired(actorId, targetIds)) return false;

    // Select action
    const action = selectAction(actorId, targetIds);
    if (!action) return false;

    // Execute
    const result = executeAIAction(actorId, targetIds, action);
    
    if (result && result.success) {
      const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
      const targetNames = targetIds.map(tid => 
        global.safeName?.(tid) || `Player ${tid}`
      ).join(', ');
      
      const outcomeType = result.outcome?.type || 'unknown';
      
      debugLog(`${actorName} → ${action.label} → ${targetNames}: ${outcomeType}`);
      return true;
    } else if (result && !result.success) {
      const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
      debugLog(`${actorName} → ${action.label}: failed (${result.reason || 'unknown'})`);
      return false;
    }
    
    return false;
  }

  // ============================================================================
  // PHASE TERMINATION
  // ============================================================================
  /**
   * Cleanly end the social phase when no more actions can be executed
   * Emits social:complete event for phase advancement
   */
  function endSocialPhase() {
    if (!isRunning) return;
    
    infoLog('🛑 Ending social phase - no more actions can be executed');
    
    // Set idle state
    isActive = false;
    isRunning = false;
    
    // Clear any pending timeouts
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    
    // Log summary (gated by debugSocialAI flag)
    const totalActions = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
    infoLog('Phase summary:', {
      totalTicks: tickCount,
      totalInteractions: totalActions,
      perPlayer: Object.fromEntries(actionCounts)
    });
    
    // Emit completion event for phase advancement
    try {
      const event = new CustomEvent('social:ai-phase-complete', {
        detail: {
          reason: 'no_actions_available',
          totalTicks: tickCount,
          totalActions: totalActions
        }
      });
      window.dispatchEvent(event);
      infoLog('✓ Emitted social:ai-phase-complete event');
    } catch (e) {
      errorLog('Failed to emit completion event:', e);
    }
    
    // Call onSocialPhaseEnd if available to ensure phase transitions
    if (typeof global.SocialManeuvers?.onSocialPhaseEnd === 'function') {
      try {
        // Don't call directly - let the phase timer handle it
        infoLog('Phase timer will handle phase end callback');
      } catch (e) {
        errorLog('Error during phase end:', e);
      }
    }
  }

  // ============================================================================
  // PUBLIC API: START/STOP/PAUSE/RESUME
  // ============================================================================
  /**
   * Start the AI social phase scheduler
   * 
   * Initializes the scheduler and begins the tick loop. The scheduler will
   * execute AI social interactions at regular intervals until stopped or
   * until the phase naturally ends.
   * 
   * @param {Object} context - Phase context (optional)
   * @param {string} reason - Reason for starting (for logging)
   * 
   * Debug Logs (when debugSocialAI is true):
   * - Start event with context and reason
   * - Tick progress and action execution
   * - Watchdog restarts if loop stalls
   */
  function startAiSocialPhase(context = {}, reason = '') {
    // Guard: Block social AI start while game is paused
    if(global.PauseController && global.PauseController.isPaused && global.PauseController.isPaused()){
      infoLog('startAiSocialPhase blocked: game is paused');
      return;
    }
    
    const config = getConfig();
    
    if (!config.enabled) {
      infoLog('AI social interactions disabled');
      return;
    }

    if (isRunning) {
      warnLog('Already running');
      return;
    }

    infoLog('▶️ Starting AI social phase', reason);
    debugLog('start() called', { context, reason, tickCount: 0 });
    
    isRunning = true;
    isActive = true;
    isPaused = false;
    phaseContext = context;
    initPhaseState();
    
    // Start robust tick loop
    scheduleNextTick();
    
    // Start RAF pump for responsiveness
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
    }
    rafPump();
    
    // Start watchdog (debug-gated)
    startWatchdog();
  }

  /**
   * Stop the AI social phase scheduler
   * 
   * Completely shuts down the scheduler and tears down all timers and state.
   * This is a full shutdown - use pause() if you want to temporarily suspend
   * work while keeping the loop alive.
   * 
   * @param {string} reason - Reason for stopping (for logging)
   * 
   * Debug Logs (when debugSocialAI is true):
   * - Stop event with reason
   * - Phase summary (total ticks, actions, per-player breakdown)
   */
  function stopAiSocialPhase(reason = '') {
    if (!isRunning) {
      debugLog('stop() called but already stopped', { reason });
      return;
    }

    infoLog('◼️ Stopping AI social phase', reason);
    debugLog('stop() called', { reason, tickCount, totalActions: Array.from(actionCounts.values()).reduce((a, b) => a + b, 0) });
    
    // Final shutdown - tear down everything
    isRunning = false;
    isActive = false;
    isPaused = false;
    phaseContext = null;
    
    // Clear timers
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    
    if (rafHandle) {
      cancelAnimationFrame(rafHandle);
      rafHandle = null;
    }
    
    if (watchdogTimer) {
      clearTimeout(watchdogTimer);
      watchdogTimer = null;
    }

    // Log summary (gated by debugSocialAI flag)
    const totalActions = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
    infoLog('Phase summary:', {
      totalTicks: tickCount,
      totalInteractions: totalActions,
      perPlayer: Object.fromEntries(actionCounts)
    });
  }
  
  /**
   * Pause the scheduler (suspend work without tearing down loop)
   * 
   * Suspends AI social interactions while keeping the tick loop and timers
   * running. This is useful for temporarily halting work (e.g., when a modal
   * is open) without losing state or requiring full restart.
   * 
   * The tick loop continues to run, but performTick() will skip all work
   * while paused. Call resume() to continue work.
   * 
   * @param {string} reason - Reason for pausing (for logging)
   * 
   * Debug Logs (when debugSocialAI is true):
   * - Pause event with reason and current tick count
   */
  function pauseAiSocialPhase(reason = '') {
    if (!isRunning) {
      debugLog('pause() called but not running', { reason });
      return;
    }
    
    if (isPaused) {
      debugLog('pause() called but already paused', { reason });
      return;
    }
    
    infoLog('⏸️ Pausing AI social phase', reason);
    debugLog('pause() called', { reason, tickCount, isPaused: false });
    
    isPaused = true;
    // Loop keeps running, performTick will skip work
  }
  
  /**
   * Resume the scheduler after pause
   * 
   * Resumes AI social interactions after a pause. The tick loop will continue
   * from where it left off, and the watchdog timer is reset to prevent false
   * positives.
   * 
   * @param {string} reason - Reason for resuming (for logging)
   * 
   * Debug Logs (when debugSocialAI is true):
   * - Resume event with reason and current tick count
   */
  function resumeAiSocialPhase(reason = '') {
    if (!isRunning) {
      debugLog('resume() called but not running', { reason });
      return;
    }
    
    if (!isPaused) {
      debugLog('resume() called but not paused', { reason });
      return;
    }
    
    infoLog('▶️ Resuming AI social phase', reason);
    debugLog('resume() called', { reason, tickCount, isPaused: true });
    
    isPaused = false;
    lastTickTime = Date.now(); // Reset watchdog
  }
  
  function isSchedulerRunning() {
    return isRunning;
  }

  function runEmptyEnergyBurst() {
    const config = getConfig();
    
    if (!config.enabled) return;

    infoLog('Running empty-energy burst');

    let count = 0;
    const maxCount = config.emptyEnergyBurstCount;

    function runNext() {
      if (count >= maxCount) {
        infoLog(`Burst complete: ${count} interactions`);
        return;
      }

      performSingleInteraction();
      count++;

      if (count < maxCount) {
        setTimeout(runNext, config.emptyEnergyBurstDelay);
      }
    }

    runNext();
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================
  /**
   * Social AI Scheduler Public API
   * 
   * Main lifecycle methods:
   * - startAiSocialPhase(context, reason): Start the scheduler
   * - stopAiSocialPhase(reason): Stop the scheduler completely
   * - pauseAiSocialPhase(reason): Pause work (keeps loop alive)
   * - resumeAiSocialPhase(reason): Resume work after pause
   * - isRunning(): Check if scheduler is active
   * 
   * Additional methods:
   * - runEmptyEnergyBurst(): Execute burst interactions during energy skip
   * - getConfig(): Get current scheduler configuration
   * 
   * Debug methods (internal use):
   * - _performSingleInteraction(): Execute one AI interaction
   * - _getEligibleAIPlayers(): Get list of eligible AI players
   * 
   * Diagnostics (window.__smDebug):
   * - getState(): Get current scheduler state
   * - runAiTickOnce(): Manually run a single tick
   */
  global.SocialAIScheduler = {
    startAiSocialPhase,
    stopAiSocialPhase,
    pauseAiSocialPhase,
    resumeAiSocialPhase,
    isRunning: isSchedulerRunning,
    runEmptyEnergyBurst,
    getConfig,
    // For testing/debugging
    _performSingleInteraction: performSingleInteraction,
    _getEligibleAIPlayers: getEligibleAIPlayers
  };

  // ============================================================================
  // DEV HELPERS & DIAGNOSTICS
  // ============================================================================
  if (!global.__smDebug) {
    global.__smDebug = {};
  }
  
  /**
   * Enhanced diagnostics API: Get current scheduler state
   * 
   * Returns detailed state for debugging and monitoring:
   * - isRunning: Is scheduler active?
   * - isPaused: Is scheduler paused?
   * - isActive: Is scheduler executing work?
   * - tickCount: Number of ticks this phase
   * - lastTickTime: Timestamp of last tick
   * - timeSinceLastTick: Milliseconds since last tick
   * - idlePassCount: Consecutive ticks with no actions
   * - actionCounts: Actions executed per player
   * - totalActions: Total actions this phase
   * - recentPairings: Recently paired actors/targets
   * - config: Current scheduler configuration
   * 
   * Usage: window.__smDebug.getState()
   */
  global.__smDebug.getState = function() {
    return {
      isRunning,
      isPaused,
      isActive,
      tickCount,
      lastTickTime,
      timeSinceLastTick: Date.now() - lastTickTime,
      idlePassCount,
      actionCounts: Object.fromEntries(actionCounts),
      totalActions: Array.from(actionCounts.values()).reduce((a, b) => a + b, 0),
      recentPairings: Array.from(recentPairings),
      config: getConfig()
    };
  };
  
  /**
   * Debug helper: Run a single AI tick manually
   * Useful for testing and diagnostics
   */
  global.__smDebug.runAiTickOnce = function() {
    console.group('[__smDebug] Running single AI tick');
    
    const config = getConfig();
    console.log('Config:', config);
    console.log('State:', global.__smDebug.getState());
    
    const eligible = getEligibleAIPlayers();
    console.log('Eligible AI players:', eligible.length, eligible.map(p => p.name || p.id));
    
    if (eligible.length < 2) {
      console.warn('Need at least 2 AI players for interactions');
      console.groupEnd();
      return;
    }
    
    // Perform a single interaction with debug logging enabled
    const oldDebug = global.game?.cfg?.debugSocialAI;
    if (global.game && global.game.cfg) {
      global.game.cfg.debugSocialAI = true;
    }
    
    performSingleInteraction();
    
    if (global.game && global.game.cfg) {
      global.game.cfg.debugSocialAI = oldDebug;
    }
    
    console.log('Action counts:', Object.fromEntries(actionCounts));
    console.groupEnd();
  };

  // Module initialization logs (always visible)
  console.info('[social-ai-scheduler] ✓ Module loaded');
  console.info('[social-ai-scheduler] ✓ Diagnostics: window.__smDebug.getState()');
  console.info('[social-ai-scheduler] ✓ Dev helper: window.__smDebug.runAiTickOnce()');

})(window);
