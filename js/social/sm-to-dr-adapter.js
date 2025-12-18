// MODULE: social/sm-to-dr-adapter.js
// Adapter to map sm-ai-interaction events to Diary Room events with rich payloads
// Emits: social.action:result, bond.shift, player.relations:updated, social.entry:story
// 
// CONFIGURATION:
// - Gate: window.game.cfg.debugSocialAI || window.game.cfg.aiSocialEmitDrEvents
// - Debug logs: window.game.cfg.debugSocialAI
// 
// EVENTS EMITTED:
// 1. social.action:result - Rich payload with narrative, bond shifts, actor/targets
// 2. bond.shift - Individual bond changes per target (backwards compat)
// 3. player.relations:updated - Per-player relation updates (for profile UI)
// 4. social.entry:story - Direct Diary Room consumption (narrative entry)

(function(global){
  'use strict';
  
  // ============================================================================
  // CONFIGURATION & GATES
  // ============================================================================
  
  const cfg = global.game?.cfg || {};
  
  // Gate adapter installation - production-safe with enableDrSocialLogs (default: true)
  // Also accepts legacy debug flags for backwards compatibility
  if (!(cfg.enableDrSocialLogs || cfg.debugSocialAI || cfg.aiSocialEmitDrEvents)) {
    console.info('[sm-to-dr-adapter] Skipped (gate=false). Enable via window.game.cfg.enableDrSocialLogs');
    return;
  }

  // Prevent double-installation
  if (global.__smToDrAdapterInstalled) {
    console.warn('[sm-to-dr-adapter] Already installed');
    return;
  }
  global.__smToDrAdapterInstalled = true;

  // ============================================================================
  // UTILITIES
  // ============================================================================
  
  /**
   * Safely get player name
   */
  function safeName(id){
    return global.safeName?.(id) || (global.game?.players?.find(p=>p.id===id)?.name) || `Player ${id}`;
  }
  
  /**
   * Get bond/affinity value between two players (before action)
   */
  function getBondBefore(actorId, targetId) {
    const g = global.game;
    if (!g || !g.players) return null;
    
    const actor = g.players.find(p => p.id === actorId);
    if (!actor || !actor.affinity) return null;
    
    return actor.affinity[targetId] ?? null;
  }
  
  /**
   * Get bond/affinity value after applying delta
   */
  function getBondAfter(bondBefore, delta) {
    if (bondBefore === null) return null;
    return bondBefore + (delta || 0);
  }
  
  /**
   * Build narrative text from action and outcome
   */
  function buildNarrative(actor, targets, actionId, outcome) {
    const targetNames = targets.map(t => t.name).join(', ');
    const actionLabel = getActionLabel(actionId);
    
    // Check if outcome has a custom message
    if (outcome && outcome.message) {
      return outcome.message;
    }
    
    // Build default narrative
    const outcomeType = outcome?.type || 'unknown';
    const outcomeText = outcomeType === 'success' || outcomeType === 'positive' ? 'succeeded' :
                        outcomeType === 'failure' || outcomeType === 'negative' ? 'failed' :
                        'completed';
    
    return `${actor.name} ${actionLabel} with ${targetNames} (${outcomeText})`;
  }
  
  /**
   * Get human-readable action label
   */
  function getActionLabel(actionId) {
    const SM = global.SocialManeuvers;
    if (SM && SM.SOCIAL_ACTIONS) {
      const action = SM.SOCIAL_ACTIONS.find(a => a.id === actionId);
      if (action && action.label) {
        return action.label.toLowerCase();
      }
    }
    // Fallback: convert action_id to readable format
    return actionId.replace(/_/g, ' ');
  }
  
  /**
   * Debug log (gated by config)
   */
  function debugLog(message, ...args) {
    if (cfg.debugSocialAI) {
      console.log(`[sm-to-dr-adapter:debug] ${message}`, ...args);
    }
  }

  // ============================================================================
  // IDEMPOTENCY TRACKING
  // ============================================================================
  
  const processedEvents = new Set();
  const MAX_TRACKING = 100;
  
  /**
   * Check if event was already processed (prevent duplicates)
   */
  function isEventProcessed(eventId) {
    return processedEvents.has(eventId);
  }
  
  /**
   * Mark event as processed
   */
  function markEventProcessed(eventId) {
    processedEvents.add(eventId);
    
    // Limit tracking set size (FIFO)
    if (processedEvents.size > MAX_TRACKING) {
      const firstItem = processedEvents.values().next().value;
      processedEvents.delete(firstItem);
    }
  }

  // ============================================================================
  // EVENT HANDLER
  // ============================================================================
  
  /**
   * Handle sm-ai-interaction event and re-emit as DR-compatible events
   */
  window.addEventListener('sm-ai-interaction', e => {
    try {
      const d = e.detail || {};
      
      // Skip if already marked as reemitted (prevent loops)
      if (d.reemitted === true) {
        debugLog('Skipped reemitted event');
        return;
      }
      
      // Generate unique event ID for idempotency
      const eventId = `${d.actorId}-${d.actionId}-${d.targetIds?.join(',')}-${Date.now()}`;
      if (isEventProcessed(eventId)) {
        debugLog('Skipped duplicate event:', eventId);
        return;
      }
      markEventProcessed(eventId);
      
      // Extract actor
      const actorId = d.actorId;
      const actor = { id: actorId, name: safeName(actorId) };

      // Extract targets (can be multiple)
      const targetIds = d.targetIds || [];
      const targets = targetIds.map(tid => ({ id: tid, name: safeName(tid) }));
      const primaryTarget = targets[0] || null;

      // Extract action label
      const actionLabel = getActionLabel(d.actionId);

      // Build narrative/story text
      const narrative = buildNarrative(actor, targets, d.actionId, d.outcome);

      // Build bond shifts array with before/after values
      const bondShifts = [];
      if (d.pairwise && typeof d.pairwise === 'object') {
        Object.entries(d.pairwise).forEach(([tid, delta]) => {
          const targetId = Number(tid);
          if (isNaN(targetId)) return;
          
          const bondBefore = getBondBefore(actorId, targetId);
          const affinityDelta = (delta && delta.affinity) || 0;
          const bondAfter = getBondAfter(bondBefore, affinityDelta);
          
          bondShifts.push({
            targetId,
            targetName: safeName(targetId),
            bondBefore,
            bondAfter,
            delta: affinityDelta
          });
        });
      }

      // ========================================================================
      // 1. EMIT: social.action:result (rich payload for DR)
      // ========================================================================
      const actionPayload = {
        actor,
        target: primaryTarget,
        targets,  // All targets
        action: d.actionId,
        actionLabel,
        success: !!d.success,
        magnitude: (d.outcome && d.outcome.magnitude) || 0,
        successProb: d.successProb ?? null,
        narrative,  // NEW: human-readable story
        bondShifts,  // NEW: array of bond changes with before/after
        outcome: d.outcome,  // Full outcome object
        ts: Date.now(),
        raw: d,
        reemitted: true  // Mark as reemitted to prevent loops
      };

      window.dispatchEvent(new CustomEvent('social.action:result', { detail: actionPayload }));
      debugLog('Emitted social.action:result:', actionPayload);

      // ========================================================================
      // 2. EMIT: bond.shift (individual events for each target - backwards compat)
      // ========================================================================
      bondShifts.forEach(shift => {
        const bondPayload = {
          from: actor,
          to: { id: shift.targetId, name: shift.targetName },
          delta: shift.delta,
          bondBefore: shift.bondBefore,
          bondAfter: shift.bondAfter,
          action: d.actionId,
          ts: Date.now()
        };
        window.dispatchEvent(new CustomEvent('bond.shift', { detail: bondPayload }));
      });
      debugLog(`Emitted ${bondShifts.length} bond.shift events`);

      // ========================================================================
      // 3. EMIT: player.relations:updated (per affected player for UI refresh)
      // ========================================================================
      const affectedPlayerIds = new Set([actorId, ...targetIds]);
      affectedPlayerIds.forEach(playerId => {
        const relationsPayload = {
          playerId,
          playerName: safeName(playerId),
          action: d.actionId,
          ts: Date.now()
        };
        window.dispatchEvent(new CustomEvent('player.relations:updated', { detail: relationsPayload }));
      });
      debugLog(`Emitted ${affectedPlayerIds.size} player.relations:updated events`);

      // ========================================================================
      // 4. EMIT: social.entry:story (direct DR consumption)
      // ========================================================================
      const storyPayload = {
        id: `story-${eventId}`,
        timestamp: Date.now(),
        type: 'social_action',
        category: 'social',
        severity: 'neutral',
        title: `${actor.name} → ${actionLabel}`,
        text: narrative,
        bondShifts,
        actor,
        targets,
        action: d.actionId
      };
      window.dispatchEvent(new CustomEvent('social.entry:story', { detail: storyPayload }));
      debugLog('Emitted social.entry:story:', storyPayload);

    } catch (err) {
      console.error('[sm-to-dr-adapter] Error processing event:', err);
    }
  });

  console.info('[sm-to-dr-adapter] ✓ Installed (debug gate enabled)');
  console.info('[sm-to-dr-adapter] Emits: social.action:result, bond.shift, player.relations:updated, social.entry:story');
})(window);
