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
    maxTicksPerPhase: 1000            // Safety cap to prevent infinite loops
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
      verbose: cfg.aiSocialVerbose ?? DEFAULT_CONFIG.verbose
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
  function debugLog(message, ...args) {
    const config = getConfig();
    const debugEnabled = config.verbose || global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.log(`[ai-scheduler:debug] ${message}`, ...args);
    }
  }
  
  function infoLog(message, reason = '') {
    const reasonStr = reason ? ` (reason: ${reason})` : '';
    console.info(`[ai-scheduler] ${message}${reasonStr}`);
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
      if (!SM.SocialResources?.canAfford(actorId, { energy: costCalc.total })) return false;
      
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
        console.warn('[ai-scheduler] computeActionCost not available');
        return null;
      }

      // Verify affordability (cost may have changed)
      if (!SM.SocialResources?.canAfford(actorId, { energy: costCalc.total })) {
        return null;
      }

      // Execute action using existing engine
      // executeAction signature: executeAction(actorId, targetId, actionId, extraTargetIds)
      const primaryTarget = targetIds[0];
      const extraTargets = targetIds.slice(1);
      const result = SM.executeAction?.(actorId, primaryTarget, action.id, extraTargets);
      
      // Defensive: handle missing result or failed execution
      if (!result) {
        console.warn('[ai-scheduler] executeAction returned null/undefined');
        return null;
      }
      
      // If action failed (e.g., insufficient resources), return early
      // Note: Failed actions are not counted toward rate limiting since they consume no resources
      if (!result.success) {
        console.debug(`[ai-scheduler] Action failed: ${result.reason || 'unknown'}`);
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
      const config = getConfig();
      if (config.verbose || global.game?.cfg?.aiSocialVerbose) {
        console.log('[ai-scheduler] Normalized outcome:', {
          actionId: action.id,
          actorId,
          targetIds,
          deltas,
          pairwise,
          rawOutcome: outcome
        });
      }

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
      console.error('[ai-scheduler] executeAIAction failed:', e);
      return null;
    }
  }

  function emitAIInteractionEvent(data) {
    try {
      const event = new CustomEvent('sm-ai-interaction', { detail: data });
      window.dispatchEvent(event);
    } catch (e) {
      console.error('[ai-scheduler] Failed to emit event:', e);
    }
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
        console.warn(`[ai-scheduler] ⚠️ MAX_TICKS_PER_PHASE (${config.maxTicksPerPhase}) reached - terminating phase`);
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
        console.warn('[ai-scheduler:watchdog] ⚠️ No tick for >2.5s - restarting loop');
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

    lastTickTime = Date.now(); // Update watchdog timestamp
    tickCount++;
    debugLog(`Tick #${tickCount}, lastTickTime: ${lastTickTime}`);
    
    const aiPlayers = getEligibleAIPlayers();
    
    if (aiPlayers.length < 2) {
      // Need at least 2 AI players for interactions
      console.debug('[ai-scheduler] Not enough AI players for interactions (need 2+)');
      idlePassCount++;
      // If multiple consecutive idle passes, end phase
      if (idlePassCount >= 5) {
        console.warn('[ai-scheduler] Too many idle passes (not enough AI players) - ending phase');
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
      console.debug(`[ai-scheduler] Idle pass ${idlePassCount} (no actions executed)`);
      
      // Safety: if no actions executed in multiple consecutive passes, end phase
      if (idlePassCount >= 10) {
        console.warn('[ai-scheduler] ⚠️ Too many consecutive idle passes - no actors can execute actions - terminating phase');
        endSocialPhase();
      }
    } else {
      // Reset idle counter on successful execution
      idlePassCount = 0;
    }
  }

  function performSingleInteraction() {
    const config = getConfig(); // eslint-disable-line no-unused-vars
    
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

    // Decide if multi-target (group action) - 20% chance
    const isMultiTarget = Math.random() < 0.2;
    
    // Select targets
    const targetIds = selectRandomTarget(actor.id, isMultiTarget);
    if (!targetIds || targetIds.length === 0) return false;

    // Skip if recently paired
    if (wasRecentlyPaired(actor.id, targetIds)) return false;

    // Select action
    const action = selectAction(actor.id, targetIds);
    if (!action) return false;

    // Execute
    const result = executeAIAction(actor.id, targetIds, action);
    
    if (result && result.success) {
      const actorName = global.safeName?.(actor.id) || `Player ${actor.id}`;
      const targetNames = targetIds.map(tid => 
        global.safeName?.(tid) || `Player ${tid}`
      ).join(', ');
      
      // Use safe navigation for outcome type (already normalized in executeAIAction)
      const outcomeType = result.outcome?.type || 'unknown';
      console.info(
        `[ai-scheduler] ${actorName} → ${action.label} → ${targetNames}: ${outcomeType}`
      );
      return true; // Action executed successfully
    } else if (result && !result.success) {
      // Action failed (e.g., insufficient resources) - log at debug level
      const actorName = global.safeName?.(actor.id) || `Player ${actor.id}`;
      console.debug(
        `[ai-scheduler] ${actorName} → ${action.label}: failed (${result.reason || 'unknown'})`
      );
      return false; // Action failed
    }
    
    return false; // No result or execution failed
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
    
    console.info('[ai-scheduler] 🛑 Ending social phase - no more actions can be executed');
    
    // Set idle state
    isActive = false;
    isRunning = false;
    
    // Clear any pending timeouts
    if (schedulerTimer) {
      clearTimeout(schedulerTimer);
      schedulerTimer = null;
    }
    
    // Log summary
    const totalActions = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
    console.info('[ai-scheduler] Phase summary:', {
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
      console.info('[ai-scheduler] ✓ Emitted social:ai-phase-complete event');
    } catch (e) {
      console.error('[ai-scheduler] Failed to emit completion event:', e);
    }
    
    // Call onSocialPhaseEnd if available to ensure phase transitions
    if (typeof global.SocialManeuvers?.onSocialPhaseEnd === 'function') {
      try {
        // Don't call directly - let the phase timer handle it
        console.info('[ai-scheduler] Phase timer will handle phase end callback');
      } catch (e) {
        console.error('[ai-scheduler] Error during phase end:', e);
      }
    }
  }

  // ============================================================================
  // PUBLIC API: START/STOP/PAUSE/RESUME
  // ============================================================================
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
      console.warn('[ai-scheduler] Already running');
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

    // Log summary
    const totalActions = Array.from(actionCounts.values()).reduce((a, b) => a + b, 0);
    console.info('[ai-scheduler] Phase summary:', {
      totalTicks: tickCount,
      totalInteractions: totalActions,
      perPlayer: Object.fromEntries(actionCounts)
    });
  }
  
  /**
   * Pause the scheduler (suspend work without tearing down loop)
   * Loop continues to run but performTick skips work
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

    console.info('[ai-scheduler] Running empty-energy burst');

    let count = 0;
    const maxCount = config.emptyEnergyBurstCount;

    function runNext() {
      if (count >= maxCount) {
        console.info(`[ai-scheduler] Burst complete: ${count} interactions`);
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
  global.SocialAIScheduler = {
    startAiSocialPhase,
    stopAiSocialPhase,
    pauseAiSocialPhase,    // NEW: pause API
    resumeAiSocialPhase,   // NEW: resume API
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
  
  // Enhanced diagnostics API
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
  
  // Add AI scheduler debug helper
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
    
    // Perform a single interaction with verbose logging
    const oldVerbose = global.game?.cfg?.aiSocialVerbose;
    if (global.game && global.game.cfg) {
      global.game.cfg.aiSocialVerbose = true;
    }
    
    performSingleInteraction();
    
    if (global.game && global.game.cfg) {
      global.game.cfg.aiSocialVerbose = oldVerbose;
    }
    
    console.log('Action counts:', Object.fromEntries(actionCounts));
    console.groupEnd();
  };

  console.info('[social-ai-scheduler] ✓ Module loaded');
  console.info('[social-ai-scheduler] ✓ Dev helper: window.__smDebug.runAiTickOnce()');

})(window);
