// Social Maneuvers system: manages interactive social phase with player social energy,
// action menu, outcomes, and long-term memory integration.
// Feature-flagged for gradual rollout and expansion.

(function(global){
  'use strict';

  // ============================================================================
  // CONFIGURATION & FEATURE FLAG
  // ============================================================================
  function initDefaultFlag(){
    if(!global.game) global.game = { cfg: {} };
    if(!global.game.cfg) global.game.cfg = {};
    if(global.game.cfg.enableSocialManeuvers === undefined){
      global.game.cfg.enableSocialManeuvers = true;
      console.info('[social-maneuvers] ✓ Defaulted enableSocialManeuvers to TRUE');
    }
  }
  function isEnabled(){
    initDefaultFlag();
    return global.game?.cfg?.enableSocialManeuvers === true;
  }

  // ============================================================================
  // SOCIAL RESOURCES SYSTEM (Energy, Influence, Information)
  // ============================================================================
  // Note: Information is scaled to 0..100 to support high-impact action costs.
  const RESOURCE_CONFIG = {
    energy:      { default: 5,  max: Infinity,  weeklyReset: false,  carryover: true, description: 'Energy represents your social stamina.', examples: 'Used for conversations, strategizing.' },
    influence:   { default: 0,  max: 100, weeklyReset: false, carryover: true,  description: 'Influence is your social capital.', examples: 'Earned by success, powers maneuvers.' },
    information: { default: 0,  max: 100, weeklyReset: false, carryover: true,  description: 'Information is strategic knowledge.', examples: 'Earned through observation and interrogation.' }
  };

  const DEFAULT_ENERGY = RESOURCE_CONFIG.energy.default;
  
  // ============================================================================
  // SOCIAL ENERGY BANK (SR storage - uncapped rolling balance)
  // ============================================================================
  // The bank persists across weeks and is uncapped. Weekly bonuses/penalties 
  // are applied immediately to the bank. Phase energy is seeded from bank.
  const SocialEnergyBank = {
    init(playerId) {
      const g = global.game; if(!g) return;
      if(!g.__sm_bankEnergy) g.__sm_bankEnergy = new Map();
      
      // Week 1 seeding: Initialize to default energy (5) for new games
      if(!g.__sm_bankEnergy.has(playerId)) {
        const week = g.week || 1;
        const initialEnergy = (week === 1) ? RESOURCE_CONFIG.energy.default : 0;
        g.__sm_bankEnergy.set(playerId, initialEnergy);
        console.info(`[social-bank] 🏦 Bank initialized for player ${playerId}: ${initialEnergy} (week ${week})`);
      }
    },
    
    get(playerId) {
      const g = global.game; if(!g) return 0;
      if(!g.__sm_bankEnergy) g.__sm_bankEnergy = new Map();
      return g.__sm_bankEnergy.get(playerId) ?? 0;
    },
    
    set(playerId, amount) {
      const g = global.game; if(!g) return;
      if(!g.__sm_bankEnergy) g.__sm_bankEnergy = new Map();
      
      // Bank is UNCAPPED - can accumulate indefinitely
      const clamped = Math.max(0, amount);
      g.__sm_bankEnergy.set(playerId, clamped);
      console.info(`[social-bank] 🏦 Bank updated for player ${playerId}: ${clamped}`);
      return clamped;
    },
    
    adjust(playerId, delta) {
      const current = this.get(playerId);
      const newAmount = current + delta;
      return this.set(playerId, newAmount);
    },
    
    // Apply weekly event delta immediately to bank
    applyEventDelta(playerId, eventType, delta) {
      this.init(playerId);
      const before = this.get(playerId);
      const after = this.adjust(playerId, delta);
      console.info(`[social-bank] 📊 Event ${eventType} for player ${playerId}: ${before} + ${delta} = ${after}`);
      return after;
    },
    
    // Seed phase energy from bank (no cap - bank balance is phase energy)
    seedPhaseEnergy(playerId) {
      const bankAmount = this.get(playerId);
      const phaseEnergy = bankAmount; // No capping - use full bank balance
      console.info(`[social-bank] 🌱 Seeding phase energy for player ${playerId}: ${phaseEnergy} (from bank: ${bankAmount})`);
      return phaseEnergy;
    }
  };

  // ============================================================================
  // CONFIGURABLE WEEKLY BONUSES AND PENALTIES
  // ============================================================================
  // Balanced default values for weekly energy adjustments.
  // Maintainers can adjust these values to tune the system.
  // Applied immediately to uncapped bank: newBank = currentBank + Bonuses − Penalties
  
  const WEEKLY_ENERGY_BONUSES = {
    HOH_WIN: 5,             // Won Head of Household competition
    HOH_SECOND: 2,          // Second place in HOH competition
    POV_WIN: 3,             // Won Power of Veto competition
    POV_SECOND: 1,          // Second place in POV competition
    NOMINATED: 4,           // Was nominated for eviction (adversity bonus)
    NEW_ALLIANCE: 2,        // Per alliance formed (can stack)
    SAVED_WITH_POV: 2,      // Was saved from eviction using POV
    POV_USED_OTHER: 2,      // Used veto on someone other than yourself
    SURVIVED_EVICTION: 1    // Survived being on the block
  };

  const WEEKLY_ENERGY_PENALTIES = {
    COMP_SKIPPED: -3,       // Generic: Skipped a competition (legacy)
    HOH_LAST: -2,           // Last place in HOH competition
    HOH_SKIPPED: -4,        // Skipped HOH competition
    HOH_QUIT: -3,           // Started but quit HOH competition
    POV_LAST: -2,           // Last place in POV competition
    POV_SKIPPED: -3,        // Skipped POV competition
    POV_QUIT: -2,           // Started but quit POV competition
    NOT_DRAWN_VETO: -1,     // Not drawn to compete in veto
    ZERO_SCORE: -2,         // Scored zero in a competition
    BROKE_ALLIANCE: -3      // Broke an alliance (trust damage)
  };

  // In-phase energy refund chances
  const ENERGY_REFUND_CHANCES = {
    COMPLIMENT: 0.30,
    STRATEGY_CHAT: 0.20,
    MEDIATE: 1.0 // 100% if conflict resolved
  };

  // Influence deltas for actions
  const INFLUENCE_DELTAS = {
    STRATEGY_CHAT_SUCCESS: 6,
    CONFIDE_SUCCESS: 10,
    PROTECT_WITH_VETO: 8,
    GIVE_GIFT_SUCCESS: 4,
    MAJOR_BETRAYAL: -25,
    CONFRONT_FAIL: -8,
    SERIOUS_NEGATIVE_CONTEXT: -10
  };

  const INFLUENCE_WEEKLY_DECAY = 0.25; // 25% decay if no positive interaction

  // Information earning
  const INFORMATION_EARNINGS = {
    INTERROGATE_SUCCESS: 10,
    EAVESDROP_SUCCESS: 6,
    STRATEGY_CHAT_REVEAL: 3,
    MEDIATE_REVEAL: 4
  };

  // Information spending
  const INFORMATION_COSTS = {
    REVEAL_INTENT: 8,
    BLACKMAIL_MIN: 8,
    BLACKMAIL_MAX: 15,
    BOOST_PER_5: 5 // 5 points for +8% success
  };

  const INFORMATION_WEEKLY_CARRYOVER = 5;

  // SM Bank Configuration
  const SM_BANK_CONFIG = {
    baseWeeklyAdd: 5 // Base energy added to bank for all alive players at week rollover
  };

  const SocialResources = {
    CONFIG: SM_BANK_CONFIG, // Export for external access
    init(playerId) {
      const g = global.game;
      if(!g) return;
      if(!g.__socialResources){ g.__socialResources = new Map(); }
      if(!g.__weeklyEvents){ g.__weeklyEvents = new Map(); }
      if(!g.__pairwiseInfluence){ g.__pairwiseInfluence = new Map(); }
      if(!g.__weeklyInteractions){ g.__weeklyInteractions = new Map(); }
      if(!g.__phaseRefunds){ g.__phaseRefunds = new Map(); }
      
      // Initialize bank for this player
      SocialEnergyBank.init(playerId);
      
      if(!g.__socialResources.has(playerId)){
        g.__socialResources.set(playerId, {
          energy: RESOURCE_CONFIG.energy.default,
          influence: RESOURCE_CONFIG.influence.default,
          information: RESOURCE_CONFIG.information.default,
          lastWeekReset: g.week || 1
        });
      }
      
      // Initialize weekly events tracker for this player
      if(!g.__weeklyEvents.has(playerId)){
        g.__weeklyEvents.set(playerId, {
          hohWin: false,
          povWin: false,
          nominated: false,
          newAlliances: 0,
          savedWithPov: false,
          survivedEviction: false,
          compSkipped: false,
          notDrawnVeto: false,
          zeroScore: false,
          brokeAlliance: false,
          week: g.week || 1
        });
      }
    },
    get(playerId, resourceType) {
      const g = global.game;
      if(!g?.__socialResources) this.init(playerId);
      const resources = g.__socialResources.get(playerId);
      if(!resources) { this.init(playerId); return RESOURCE_CONFIG[resourceType]?.default || 0; }
      return resources[resourceType] ?? RESOURCE_CONFIG[resourceType]?.default ?? 0;
    },
    getAll(playerId) {
      return {
        energy: this.get(playerId, 'energy'),
        influence: this.get(playerId, 'influence'),
        information: this.get(playerId, 'information')
      };
    },
    set(playerId, resourceType, amount) {
      const g = global.game; if(!g) return false;
      this.init(playerId);
      const config = RESOURCE_CONFIG[resourceType];
      if(!config) return false;
      const resources = g.__socialResources.get(playerId);
      const oldValue = resources[resourceType];
      const capped = Math.max(0, Math.min(config.max, amount));
      resources[resourceType] = capped;
      this._logTelemetry(playerId, resourceType, 'set', capped);
      
      // Dispatch resource changed event
      const delta = {};
      delta[resourceType] = capped - oldValue;
      this._dispatchResourceChangedEvent(playerId, delta);
      
      return true;
    },
    spend(playerId, costs) {
      // pre-check affordability
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, type) < cost) return { success: false, insufficient: type };
      }
      // deduct
      const delta = {};
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0) {
          const current = this.get(playerId, type);
          this.set(playerId, type, current - cost);
          delta[type] = -cost;
          
          // LOCK-STEP: Update bank when spending energy
          if(type === 'energy') {
            SocialEnergyBank.adjust(playerId, -cost);
          }
        }
      }
      this._logTelemetry(playerId, 'multiple', 'spend', costs);
      console.info(`[social-resources] ⚡ Player ${playerId} spent:`, costs);
      
      // Dispatch resource changed event
      this._dispatchResourceChangedEvent(playerId, delta);
      
      // Defensively call SocializeMobile.updateHUD if present
      if (global.SocializeMobile?.updateHUD) {
        try {
          global.SocializeMobile.updateHUD();
        } catch(e) {
          console.warn('[social-resources] Failed to update HUD:', e);
        }
      }
      
      return { success: true };
    },
    earn(playerId, gains) {
      const delta = {};
      for(const [type, amount] of Object.entries(gains)) {
        if(amount > 0) {
          const current = this.get(playerId, type);
          this.set(playerId, type, current + amount);
          delta[type] = amount;
          
          // LOCK-STEP: Update bank when earning energy
          if(type === 'energy') {
            SocialEnergyBank.adjust(playerId, amount);
          }
        }
      }
      this._logTelemetry(playerId, 'multiple', 'earn', gains);
      console.info(`[social-resources] ⬆️ Player ${playerId} earned:`, gains);
      
      // Dispatch resource changed event
      this._dispatchResourceChangedEvent(playerId, delta);
      
      // Defensively call SocializeMobile.updateHUD if present
      if (global.SocializeMobile?.updateHUD) {
        try {
          global.SocializeMobile.updateHUD();
        } catch(e) {
          console.warn('[social-resources] Failed to update HUD:', e);
        }
      }
      
      return { success: true };
    },
    resetWeekly(playerId) {
      const g = global.game; if(!g) return;
      this.init(playerId);
      const resources = g.__socialResources.get(playerId);
      const currentWeek = g.week || 1;
      
      // Guard: only reset once per week
      if(resources.lastWeekReset >= currentWeek) {
        console.info(`[social-resources] ⏭️ Weekly reset already done for player ${playerId} at week ${currentWeek}`);
        return;
      }
      
      // NEW BANK SYSTEM: No need to compute energy - bank already has it!
      // Phase energy is seeded from the bank separately at social phase start (via recomputePhaseEnergy), not during weekly reset.
      console.info(`[social-resources] 🔄 Weekly reset for player ${playerId} at week ${currentWeek} (bank-based)`);
      
      // Handle other resources (non-energy)
      for(const [type, config] of Object.entries(RESOURCE_CONFIG)) {
        if(type === 'energy') {
          // Energy managed by SocialEnergyBank system - skip legacy weekly reset
          continue;
        } else if(type === 'information' && config.carryover) {
          // Information: add weekly carryover
          resources[type] = Math.min(resources[type] + INFORMATION_WEEKLY_CARRYOVER, config.max);
        } else if(config.weeklyReset) {
          resources[type] = config.default;
        } else if(config.carryover) {
          resources[type] = Math.min(resources[type], config.max);
        }
      }
      
      // Apply influence decay (25% if no positive interaction this week)
      const alivePlayers = global.alivePlayers?.() || [];
      for(const target of alivePlayers) {
        if(target.id !== playerId) {
          const interactionKey = `${playerId}->${target.id}`;
          const hadPositiveInteraction = g.__weeklyInteractions.get(interactionKey) || false;
          if(!hadPositiveInteraction) {
            const influenceKey = `${playerId}->${target.id}`;
            const currentInfluence = this.getInfluence(playerId, target.id);
            const decayed = currentInfluence * (1 - INFLUENCE_WEEKLY_DECAY);
            this.setInfluence(playerId, target.id, decayed);
            console.info(`[social-resources] Influence decay: ${influenceKey} ${currentInfluence.toFixed(1)} → ${decayed.toFixed(1)}`);
          }
        }
      }
      
      // Reset weekly events tracker
      g.__weeklyEvents.set(playerId, {
        hohWin: false,
        povWin: false,
        nominated: false,
        newAlliances: 0,
        savedWithPov: false,
        survivedEviction: false,
        compSkipped: false,
        notDrawnVeto: false,
        zeroScore: false,
        brokeAlliance: false,
        week: currentWeek
      });
      
      // Clear weekly interactions
      g.__weeklyInteractions.clear();
      
      resources.lastWeekReset = currentWeek;
      const bankBalance = SocialEnergyBank.get(playerId);
      console.info(`[social-resources] Weekly reset complete for player ${playerId} at week ${currentWeek}. Bank balance: ${bankBalance}`, resources);
      this._logTelemetry(playerId, 'all', 'reset', resources);
    },
    finalizeWeekForAll() {
      const g = global.game; if(!g) return;
      const alivePlayers = global.alivePlayers?.() || [];
      
      console.info('[social-resources] 🏁 Finalizing week for all players - bank already updated with events');
      
      // With lock-step updates, bank and current energy are always synchronized
      // Log final state for each player
      alivePlayers.forEach(player => {
        const playerId = player.id;
        this.init(playerId);
        
        const currentEnergy = this.get(playerId, 'energy');
        const bankBalance = SocialEnergyBank.get(playerId);
        console.info(`[social-resources] Player ${playerId} (${player.name || 'unknown'}): Bank=${bankBalance}, Phase energy=${currentEnergy}`);
      });
      
      console.info('[social-resources] ✓ Week finalization complete - bank balances maintained');
    },
    canAfford(playerId, costs) {
      for(const [type, cost] of Object.entries(costs)) {
        if(cost > 0 && this.get(playerId, type) < cost) return false;
      }
      return true;
    },
    
    // Pairwise Influence tracking (I[A→B])
    getInfluence(actorId, targetId) {
      const g = global.game; if(!g) return 0;
      if(!g.__pairwiseInfluence) g.__pairwiseInfluence = new Map();
      const key = `${actorId}->${targetId}`;
      return g.__pairwiseInfluence.get(key) || 0;
    },
    
    setInfluence(actorId, targetId, amount) {
      const g = global.game; if(!g) return;
      if(!g.__pairwiseInfluence) g.__pairwiseInfluence = new Map();
      const key = `${actorId}->${targetId}`;
      const capped = Math.max(0, Math.min(100, amount));
      g.__pairwiseInfluence.set(key, capped);
      console.info(`[social-resources] Influence set: ${key} = ${capped.toFixed(1)}`);
    },
    
    adjustInfluence(actorId, targetId, delta) {
      const current = this.getInfluence(actorId, targetId);
      const newValue = current + delta;
      this.setInfluence(actorId, targetId, newValue);
      return newValue;
    },
    
    // Weekly event tracking for energy deltas
    recordWeeklyEvent(playerId, eventType, value = true) {
      const g = global.game; if(!g) return;
      if(!g.__weeklyEvents) g.__weeklyEvents = new Map();
      const events = g.__weeklyEvents.get(playerId) || {};
      
      // Calculate the delta for this event
      let delta = 0;
      let isEventRecorded = false;
      
      if(eventType === 'newAlliance') {
        events.newAlliances = (events.newAlliances || 0) + 1;
        delta = WEEKLY_ENERGY_BONUSES.NEW_ALLIANCE;
        isEventRecorded = true;
      } else if(eventType === 'hohWin' && !events.hohWin && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_BONUSES.HOH_WIN;
        isEventRecorded = true;
      } else if(eventType === 'povWin' && !events.povWin && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_BONUSES.POV_WIN;
        isEventRecorded = true;
      } else if(eventType === 'nominated' && !events.nominated && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_BONUSES.NOMINATED;
        isEventRecorded = true;
      } else if(eventType === 'savedWithPov' && !events.savedWithPov && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_BONUSES.SAVED_WITH_POV;
        isEventRecorded = true;
      } else if(eventType === 'survivedEviction' && !events.survivedEviction && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_BONUSES.SURVIVED_EVICTION;
        isEventRecorded = true;
      } else if(eventType === 'compSkipped' && !events.compSkipped && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_PENALTIES.COMP_SKIPPED; // Already negative
        isEventRecorded = true;
      } else if(eventType === 'notDrawnVeto' && !events.notDrawnVeto && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_PENALTIES.NOT_DRAWN_VETO; // Already negative
        isEventRecorded = true;
      } else if(eventType === 'zeroScore' && !events.zeroScore && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_PENALTIES.ZERO_SCORE; // Already negative
        isEventRecorded = true;
      } else if(eventType === 'brokeAlliance' && !events.brokeAlliance && value) {
        events[eventType] = value;
        delta = WEEKLY_ENERGY_PENALTIES.BROKE_ALLIANCE; // Already negative
        isEventRecorded = true;
      } else {
        events[eventType] = value;
      }
      
      g.__weeklyEvents.set(playerId, events);
      console.info(`[social-resources] Weekly event recorded: ${playerId} - ${eventType}`, value);
      
      // IMMEDIATE APPLICATION TO BANK: Apply delta to bank right away
      if(isEventRecorded && delta !== 0) {
        SocialEnergyBank.applyEventDelta(playerId, eventType, delta);
      }
      
      // Dispatch preview event after recording
      const preview = this.getPreviewEnergy(playerId);
      const breakdown = this.getPreviewEnergyBreakdown(playerId);
      try {
        const event = new CustomEvent('social-battery-preview', {
          detail: { playerId, preview, breakdown }
        });
        window.dispatchEvent(event);
        console.info('[social-resources] 📡 Dispatched social-battery-preview event:', { playerId, preview, breakdown });
      } catch(e) {
        console.warn('[social-resources] Failed to dispatch preview event:', e);
      }
    },
    
    // Get preview energy for display based on bank balance
    getPreviewEnergy(playerId) {
      // With the new bank system, preview energy is simply the bank balance (uncapped)
      const bankBalance = SocialEnergyBank.get(playerId);
      return bankBalance;
    },
    
    // Get detailed breakdown of preview energy
    getPreviewEnergyBreakdown(playerId) {
      const g = global.game; 
      if(!g) return { bankBalance: 0, total: 0 };
      
      const bankBalance = SocialEnergyBank.get(playerId);
      const phaseEnergy = bankBalance; // No cap - use full bank balance
      const weeklyEvents = g.__weeklyEvents?.get(playerId) || {};
      
      // Show which events have been recorded this week
      const bonuses = [];
      const penalties = [];
      
      // Track bonuses
      if(weeklyEvents.hohWin) bonuses.push({ reason: 'HOH Win', amount: WEEKLY_ENERGY_BONUSES.HOH_WIN });
      if(weeklyEvents.povWin) bonuses.push({ reason: 'POV Win', amount: WEEKLY_ENERGY_BONUSES.POV_WIN });
      if(weeklyEvents.nominated) bonuses.push({ reason: 'Nominated', amount: WEEKLY_ENERGY_BONUSES.NOMINATED });
      if(weeklyEvents.newAlliances > 0) bonuses.push({ reason: 'New Alliances', amount: weeklyEvents.newAlliances * WEEKLY_ENERGY_BONUSES.NEW_ALLIANCE });
      if(weeklyEvents.savedWithPov) bonuses.push({ reason: 'Saved with POV', amount: WEEKLY_ENERGY_BONUSES.SAVED_WITH_POV });
      if(weeklyEvents.survivedEviction) bonuses.push({ reason: 'Survived Eviction', amount: WEEKLY_ENERGY_BONUSES.SURVIVED_EVICTION });
      
      // Track penalties (convert negative values for display)
      if(weeklyEvents.compSkipped) penalties.push({ reason: 'Comp Skipped', amount: WEEKLY_ENERGY_PENALTIES.COMP_SKIPPED });
      if(weeklyEvents.notDrawnVeto) penalties.push({ reason: 'Not Drawn for Veto', amount: WEEKLY_ENERGY_PENALTIES.NOT_DRAWN_VETO });
      if(weeklyEvents.zeroScore) penalties.push({ reason: 'Zero Score', amount: WEEKLY_ENERGY_PENALTIES.ZERO_SCORE });
      if(weeklyEvents.brokeAlliance) penalties.push({ reason: 'Broke Alliance', amount: WEEKLY_ENERGY_PENALTIES.BROKE_ALLIANCE });
      
      const bonusTotal = bonuses.reduce((sum, b) => sum + b.amount, 0);
      const penaltyTotal = penalties.reduce((sum, p) => sum + p.amount, 0); // Already negative
      
      return {
        bankBalance,
        bonuses,
        penalties,
        bonusTotal,
        penaltyTotal,
        eventsApplied: bonuses.length + penalties.length,
        total: phaseEnergy
      };
    },
    
    // Recompute and set phase energy based on weekly events (used during phase seeding)
    recomputePhaseEnergy(playerId) {
      const preview = this.getPreviewEnergy(playerId);
      this.set(playerId, 'energy', preview);
      console.info(`[social-resources] 🔄 Phase energy recomputed for player ${playerId}: ${preview}`);
      return preview;
    },
    
    // Track positive interactions for influence decay
    recordPositiveInteraction(actorId, targetId) {
      const g = global.game; if(!g) return;
      if(!g.__weeklyInteractions) g.__weeklyInteractions = new Map();
      const key = `${actorId}->${targetId}`;
      g.__weeklyInteractions.set(key, true);
    },
    
    // Energy refund tracking (per phase)
    canRefundEnergy(playerId, actionType) {
      const g = global.game; if(!g) return false;
      if(!g.__phaseRefunds) g.__phaseRefunds = new Map();
      const key = `${playerId}-${actionType}`;
      return !g.__phaseRefunds.has(key);
    },
    
    recordEnergyRefund(playerId, actionType) {
      const g = global.game; if(!g) return;
      if(!g.__phaseRefunds) g.__phaseRefunds = new Map();
      const key = `${playerId}-${actionType}`;
      g.__phaseRefunds.set(key, true);
    },
    
    clearPhaseRefunds() {
      const g = global.game; if(!g) return;
      if(g.__phaseRefunds) g.__phaseRefunds.clear();
    },
    _logTelemetry(playerId, resourceType, operation, value) {
      const g = global.game; if(!g) return;
      if(!g.__socialResourcesTelemetry) g.__socialResourcesTelemetry = [];
      const entry = {
        timestamp: Date.now(),
        week: g.week || 1,
        phase: g.phase || 'unknown',
        playerId,
        resourceType,
        operation,
        value,
        balance: this.getAll(playerId)
      };
      g.__socialResourcesTelemetry.push(entry);
      if(g.__socialResourcesTelemetry.length > 100) g.__socialResourcesTelemetry.shift();
      console.info('[social-resources] Telemetry:', operation, resourceType, value, 'Balance:', entry.balance);
    },
    _dispatchResourceChangedEvent(playerId, delta) {
      try {
        const resources = this.getAll(playerId);
        const event = new CustomEvent('social-resources-changed', {
          detail: { playerId, delta, resources }
        });
        window.dispatchEvent(event);
        console.info('[social-resources] 📡 Dispatched social-resources-changed event:', { playerId, delta, resources });
      } catch(e) {
        console.warn('[social-resources] Failed to dispatch event:', e);
      }
    }
  };

  // ============================================================================
  // UNIFIED ACTION COST CALCULATOR (Single Source of Truth)
  // ============================================================================
  /**
   * Compute the total energy cost for an action with the given targets.
   * 
   * @param {string} actionId - The action identifier
   * @param {Array<number>} selectedIds - Array of target player IDs
   * @param {Object} context - Optional context with action metadata overrides
   * @returns {Object} Cost breakdown: { total, base, group, breakdown }
   * 
   * Default pricing rule: total = base + (selectedIds.length - 1) * groupExtra
   * where groupExtra defaults to 1 per additional target.
   * 
   * First target is "free" in the base cost.
   * Each additional target beyond the first incurs +1 energy (groupExtra).
   * 
   * Examples:
   *   1 target:  total = 1 + (1-1)*1 = 1
   *   2 targets: total = 1 + (2-1)*1 = 2  
   *   3 targets: total = 1 + (3-1)*1 = 3
   *   4 targets: total = 1 + (4-1)*1 = 4
   */
  function computeActionCost(actionId, selectedIds, context = {}) {
    const action = getActionById(actionId);
    if (!action) {
      console.warn('[computeActionCost] Unknown action:', actionId);
      return { total: 0, base: 0, group: 0, breakdown: 'Unknown action' };
    }

    // Base cost from action definition
    const baseCost = context.baseCost ?? action.costs?.energy ?? action.cost ?? 1;
    
    // Group pricing parameters
    const targetCount = Array.isArray(selectedIds) ? selectedIds.length : 0;
    const groupExtraPerAdditional = context.groupExtraPerAdditional ?? 1;
    const perTarget = context.perTarget ?? false;
    const multiplier = context.multiplier ?? 1;

    let groupCost = 0;
    let total = baseCost;

    if (targetCount > 1) {
      if (perTarget) {
        // Per-target pricing: each target costs the base amount
        total = baseCost * targetCount * multiplier;
        groupCost = total - baseCost;
      } else {
        // Default group pricing: base + (count - 1) * groupExtra
        groupCost = (targetCount - 1) * groupExtraPerAdditional;
        total = (baseCost + groupCost) * multiplier;
      }
    }

    const breakdown = targetCount > 1 
      ? `base ${baseCost} + group ${groupCost} (${targetCount - 1} extra)`
      : `${baseCost}`;

    console.info(`[computeActionCost] ${actionId}: ${total}⚡ (${breakdown})`);

    return {
      total: Math.max(0, Math.round(total)),
      base: Math.round(baseCost),
      group: Math.round(groupCost),
      breakdown
    };
  }

  // ============================================================================
  // ACTION DEFINITIONS & DYNAMIC MENU (includes high-impact actions)
  // ============================================================================
  const SOCIAL_ACTIONS = [
    { id: 'smalltalk',    label: 'Small Talk',    cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Light conversation to build rapport', category: 'friendly' },
    { id: 'strategize',   label: 'Strategize',    cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 1 }, description: 'Discuss game plans and alliances', category: 'strategic' },
    { id: 'confide',      label: 'Confide',       cost: 2, costs: { energy: 2, influence: 0, information: 0 }, rewards: { influence: 1 }, description: 'Share personal thoughts and build trust', category: 'friendly' },
    { id: 'interrogate',  label: 'Interrogate',   cost: 2, costs: { energy: 2, influence: 1, information: 0 }, rewards: { information: 2 }, description: 'Press for information about plans', category: 'aggressive' },
    { id: 'compliment',   label: 'Compliment',    cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { influence: 0.5 }, description: 'Give genuine praise', category: 'friendly' },
    { id: 'confront',     label: 'Confront',      cost: 3, costs: { energy: 3, influence: 2, information: 0 }, rewards: { information: 1 }, description: 'Address conflicts directly', category: 'aggressive' },
    { id: 'mediate',      label: 'Mediate',       cost: 2, costs: { energy: 2, influence: 1, information: 1 }, rewards: { influence: 2 }, description: 'Help resolve tensions between others', category: 'strategic' },
    { id: 'observe',      label: 'Observe',       cost: 1, costs: { energy: 1, influence: 0, information: 0 }, rewards: { information: 1 }, description: 'Watch and listen quietly', category: 'strategic' },

    // High-impact maneuvers
    { id: 'spread_rumor',   label: 'Spread Rumor',   cost: 1, costs: { energy: 1, influence: 0, information: 15 }, description: 'Spread damaging information about a player. Risk of being caught!', category: 'aggressive', backlashRisk: 0.30 },
    { id: 'expose_secret',  label: 'Expose Secret',  cost: 2, costs: { energy: 2, influence: 0, information: 25 }, description: 'Reveal damaging information publicly. High impact, high risk!', category: 'aggressive', backlashRisk: 0.50 },
    { id: 'group_hangout',  label: 'Group Hangout',  cost: 2, costs: { energy: 2, influence: 0, information: 0  }, description: 'Organize a casual hangout. Select multiple players to bond.', category: 'friendly',  multiTarget: true, minTargets: 2, maxTargets: 4 },
    { id: 'form_alliance',  label: 'Form Alliance',  cost: 3, costs: { energy: 3, influence: 0, information: 10 }, description: 'Propose a formal alliance with another player. Success creates lasting bond.', category: 'strategic', allianceProposal: true }
  ];
  function getActionById(actionId){ return SOCIAL_ACTIONS.find(a => a.id === actionId); }

  function getAvailableActions(playerId, targetId){
    const actor = global.getP?.(playerId);
    const target = targetId ? global.getP?.(targetId) : null;
    return SOCIAL_ACTIONS.map(action => {
      const canAfford = SocialResources.canAfford(playerId, action.costs);
      let evaluation = null;
      if (target && global.SocialActionConfig) {
        evaluation = global.SocialActionConfig.getActionEvaluation(action.id, actor, target, action);
      }
      return { ...action, canAfford, evaluation };
    });
  }

  // ============================================================================
  // ACTION EXECUTION & FEEDBACK (supports multi-target + info costs)
  // ============================================================================
  function executeAction(actorId, targetId, actionId, extraTargetIds = []){
    if(!isEnabled()){ console.warn('[social-maneuvers] System is disabled'); return { success: false, reason: 'disabled' }; }
    const action = getActionById(actionId);
    if(!action){ console.warn('[social-maneuvers] Unknown action:', actionId); return { success: false, reason: 'unknown_action' }; }

    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { success: false, reason: 'player_not_found' }; }

    // Build complete target list (primary + extra targets)
    // Always respect extraTargetIds for group pricing, regardless of multiTarget flag
    let allTargets = [targetId, ...((Array.isArray(extraTargetIds) ? extraTargetIds : []).filter(Boolean))];
    
    // Validate multi-target requirements for actions marked as multiTarget
    if(action.multiTarget){
      const minT = action.minTargets ?? 2;
      const maxT = action.maxTargets ?? 10;
      if(allTargets.length < minT){
        return { success: false, reason: 'insufficient_targets', message: `Need at least ${minT} targets` };
      }
      if(allTargets.length > maxT){
        allTargets = allTargets.slice(0, maxT);
      }
    }
    // Note: Non-multiTarget actions CAN still have multiple targets for group pricing
    // The multiTarget flag is just for validation and UI hints

    // ==== UNIFIED COST CALCULATION (Single Source of Truth) ====
    // Use computeActionCost to get accurate pricing
    const costCalc = computeActionCost(actionId, allTargets);
    const { total: effectiveCost, base: baseCost, group: groupCost } = costCalc;
    
    console.info(`[sm-exec] action=${actionId} targets=${allTargets.length} cost=${effectiveCost}⚡ (${costCalc.breakdown})`);
    
    // Pre-check energy for total cost BEFORE spending anything
    const currentEnergy = SocialResources.get(actorId, 'energy');
    if(currentEnergy < effectiveCost) {
      console.warn(`[sm-exec] ⚠️ Insufficient energy: need ${effectiveCost}⚡, have ${currentEnergy}⚡`);
      return { 
        success: false, 
        reason: 'insufficient_energy',
        message: `Not enough energy: need ${effectiveCost}⚡ for ${allTargets.length} target${allTargets.length !== 1 ? 's' : ''} (${costCalc.breakdown}), have ${currentEnergy}⚡`
      };
    }

    // Evaluation/gating
    let evaluation = null, chanceRoll = Math.random(), succeeded = true;
    if(global.SocialActionConfig){
      evaluation = global.SocialActionConfig.getActionEvaluation(actionId, actor, target, action);
      if(!evaluation.available){
        return { success: false, reason: 'gated', message: evaluation.gateReasons.join('; '), gateReasons: evaluation.gateReasons };
      }
      succeeded = chanceRoll < (evaluation.finalChance ?? 0.5);
    }

    // Track affinity before action (for PR #266 session summary)
    const affinityBefore = actor?.affinity?.[targetId] ?? 0;

    // ==== ATOMIC COST DEDUCTION (Single Source of Truth) ====
    // Spend ALL resources (energy including group cost, influence, information) atomically
    // This ensures preview and execution costs match exactly
    const totalEnergyCost = effectiveCost;
    const spendCosts = {
      energy: totalEnergyCost,
      influence: action.costs?.influence ?? 0,
      information: action.costs?.information ?? 0
    };
    
    const spendResult = SocialResources.spend(actorId, spendCosts);
    if(!spendResult.success){
      console.error(`[sm-exec] ⚠️ Failed to spend resources:`, spendCosts);
      return { 
        success: false, 
        reason: 'insufficient_resources', 
        insufficient: spendResult.insufficient, 
        message: `Not enough ${spendResult.insufficient}` 
      };
    }
    
    console.info(`[sm-exec] ✓ Resources spent: energy=${totalEnergyCost}⚡, influence=${spendCosts.influence}, info=${spendCosts.information}`);

    // Telemetry (generic)
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    const targetName = global.safeName?.(targetId) || `Player ${targetId}`;
    const telemetry = {
      timestamp: Date.now(),
      week: global.game?.week || 1,
      actorId, actorName, targetId, targetName, actionId,
      actionLabel: action.label, actionCost: action.cost,
      baseChance: evaluation?.baseChance ?? 0.5,
      modifiers: evaluation?.modifiers || [],
      finalChance: evaluation?.finalChance ?? 0.5,
      chanceRoll, succeeded,
      energyRemaining: SocialResources.get(actorId, 'energy'),
      infoRemaining: SocialResources.get(actorId, 'information'),
      // Group action metadata (with correct unified costs)
      targetCount: allTargets.length,
      baseCost,
      groupCost,
      effectiveCost,
      costBreakdown: costCalc.breakdown
    };
    if(!global.game.__socialManeuversTelemetry) global.game.__socialManeuversTelemetry = [];
    global.game.__socialManeuversTelemetry.push(telemetry);
    if(global.game.__socialManeuversTelemetry.length > 100) global.game.__socialManeuversTelemetry.shift();

    // Outcome: dispatch to special handlers for high-impact actions
    let outcome;
    if(action.id === 'spread_rumor'){
      outcome = processSpreadRumor(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'expose_secret'){
      outcome = processExposeSecret(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'group_hangout'){
      outcome = processGroupHangout(actorId, allTargets, action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else if(action.id === 'form_alliance'){
      outcome = processFormAlliance(actorId, allTargets[0], action);
      recordSpecialTelemetry(actorId, allTargets, action, outcome);
    } else {
      outcome = processActionOutcome(actorId, targetId, action, succeeded, evaluation);
    }

    // Harmonize succeeded flag for feedback when using special handlers
    if(outcome && (action.id === 'spread_rumor' || action.id === 'expose_secret' || action.id === 'group_hangout' || action.id === 'form_alliance')){
      const t = outcome.type;
      succeeded = (t === 'success' || t === 'positive');
    }

    // Track affinity after action (for PR #266 session summary)
    const affinityAfter = actor?.affinity?.[targetId] ?? 0;
    const affinityDelta = affinityAfter - affinityBefore;

    // Record action in phase session (PR #266 session tracking for end-of-phase summary)
    const g = global.game;
    if(g?.__socialManeuversSession){
      g.__socialManeuversSession.actionsThisPhase.push({
        timestamp: Date.now(),
        actorId,
        actorName,
        targetId,
        targetName,
        actionId: action.id,
        actionLabel: action.label,
        actionCategory: action.category,
        energyCost: action.costs?.energy || action.cost || 0,
        informationCost: action.costs?.information || 0,
        outcome: outcome.type,
        affinityBefore,
        affinityAfter,
        affinityDelta,
        participants: allTargets, // Multi-target support (PR #265)
        succeeded
      });

      // Track energy spent (use total effective cost, not just base)
      const energySpent = effectiveCost;
      const spent = g.__socialManeuversSession.energySpent.get(actorId) || 0;
      g.__socialManeuversSession.energySpent.set(actorId, spent + energySpent);

      // Track information spent (PR #265 integration)
      const infoSpent = action.costs?.information || 0;
      if(!g.__socialManeuversSession.informationSpent){
        g.__socialManeuversSession.informationSpent = new Map();
      }
      const infoTotal = g.__socialManeuversSession.informationSpent.get(actorId) || 0;
      g.__socialManeuversSession.informationSpent.set(actorId, infoTotal + infoSpent);

      // Track relationship delta
      const key = `${actorId}-${targetId}`;
      const currentDelta = g.__socialManeuversSession.relationshipDeltas.get(key) || 0;
      g.__socialManeuversSession.relationshipDeltas.set(key, currentDelta + affinityDelta);
    }

    // Check if player has depleted all energy and schedule fast-advance if needed
    checkEnergyDepletionAndAdvance(actorId);
    
    // Record human action for highlights (if actor is human player)
    const g = global.game;
    if(actorId === g?.humanId && typeof global.SocialHighlights?.recordHumanAction === 'function'){
      // Calculate deltas for highlights
      const deltas = {
        influence: outcome.influenceChange || 0,
        affinity: outcome.affinityChange || affinityDelta || 0,
        information: outcome.informationGain || 0
      };
      const eventData = {
        actorId,
        targetIds: allTargets,
        actionId: action.id,
        success: succeeded,
        outcome,
        deltas
      };
      global.SocialHighlights.recordHumanAction(eventData);
    }

    return { success: true, action, outcome, evaluation, succeeded, telemetry, resources: SocialResources.getAll(actorId), affinityDelta };
  }

  // ============================================================================
  // OUTCOME PROCESSING (base + high-impact handlers)
  // ============================================================================
  function processActionOutcome(actorId, targetId, action, succeeded, evaluation){
    const actor = global.getP?.(actorId); const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Player not found' }; }

    // Base outcome
    let affinityChange = 0, outcomeType = 'neutral', message = '';
    if(succeeded){
      switch(action.category){
        case 'friendly':  affinityChange = 0.05 + Math.random() * 0.05; outcomeType = 'positive'; message = `${action.label} went well!`; break;
        case 'strategic': affinityChange = 0.03 + Math.random() * 0.07; outcomeType = 'positive'; message = `${action.label} was productive.`; break;
        case 'aggressive': affinityChange = -0.02 + Math.random() * 0.04; outcomeType = 'neutral'; message = `${action.label} got your point across.`; break;
        default:          affinityChange = 0.02; message = `${action.label} completed.`;
      }
    } else {
      const states = evaluation?.states || {}; const backlashMultiplier = states.risky ? 1.5 : 1.0;
      switch(action.category){
        case 'friendly':  affinityChange = -0.03 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} felt forced.`; break;
        case 'strategic': affinityChange = -0.05 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} backfired.`; break;
        case 'aggressive': affinityChange = -0.08 * backlashMultiplier; outcomeType = 'negative'; message = `${action.label} created serious tension!`; break;
        default:          affinityChange = -0.04 * backlashMultiplier; message = `${action.label} didn't go as planned.`;
      }
    }

    // Trait & Memory modifiers (from PR #2 integration)
    const traitModifiers = calculateTraitModifiers ? calculateTraitModifiers(actorId, targetId, action) : { affinityBonus: 0 };
    affinityChange += (traitModifiers?.affinityBonus || 0);
    const memoryModifiers = calculateMemoryModifiers ? calculateMemoryModifiers(actorId, targetId) : { affinityBonus: 0 };
    affinityChange += (memoryModifiers?.affinityBonus || 0);
    if(affinityChange > 0.05) outcomeType = 'positive';
    else if(affinityChange < -0.05) outcomeType = 'negative';
    else outcomeType = 'neutral';

    if(actor.affinity && typeof actor.affinity === 'object'){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + affinityChange; }
    
    // ==================== NEW: Apply Influence and Information mechanics ====================
    
    // Record positive interaction for influence decay tracking
    if(succeeded && outcomeType === 'positive') {
      SocialResources.recordPositiveInteraction(actorId, targetId);
    }
    
    // Apply action-specific influence deltas
    if(succeeded) {
      if(action.id === 'strategize') {
        SocialResources.adjustInfluence(actorId, targetId, INFLUENCE_DELTAS.STRATEGY_CHAT_SUCCESS);
        // Strategy chat can reveal information
        if(Math.random() < 0.4) {
          SocialResources.earn(actorId, { information: INFORMATION_EARNINGS.STRATEGY_CHAT_REVEAL });
        }
      } else if(action.id === 'confide') {
        SocialResources.adjustInfluence(actorId, targetId, INFLUENCE_DELTAS.CONFIDE_SUCCESS);
      } else if(action.id === 'interrogate') {
        SocialResources.earn(actorId, { information: INFORMATION_EARNINGS.INTERROGATE_SUCCESS });
      } else if(action.id === 'observe') {
        // Eavesdrop/observe earns information
        SocialResources.earn(actorId, { information: INFORMATION_EARNINGS.EAVESDROP_SUCCESS });
      } else if(action.id === 'mediate') {
        // Mediate can reveal information
        if(Math.random() < 0.5) {
          SocialResources.earn(actorId, { information: INFORMATION_EARNINGS.MEDIATE_REVEAL });
        }
      } else if(action.id === 'compliment') {
        SocialResources.adjustInfluence(actorId, targetId, INFLUENCE_DELTAS.GIVE_GIFT_SUCCESS);
      }
    } else {
      // Failed actions
      if(action.id === 'confront') {
        SocialResources.adjustInfluence(actorId, targetId, INFLUENCE_DELTAS.CONFRONT_FAIL);
      }
    }
    
    // Apply in-phase energy refunds
    if(succeeded) {
      if(action.id === 'compliment' && SocialResources.canRefundEnergy(actorId, 'compliment-' + targetId)) {
        if(Math.random() < ENERGY_REFUND_CHANCES.COMPLIMENT) {
          SocialResources.earn(actorId, { energy: 1 });
          SocialResources.recordEnergyRefund(actorId, 'compliment-' + targetId);
          console.info(`[social-maneuvers] Energy refund: Compliment success (30% chance)`);
        }
      } else if(action.id === 'strategize' && SocialResources.canRefundEnergy(actorId, 'strategize-phase')) {
        if(Math.random() < ENERGY_REFUND_CHANCES.STRATEGY_CHAT) {
          SocialResources.earn(actorId, { energy: 1 });
          SocialResources.recordEnergyRefund(actorId, 'strategize-phase');
          console.info(`[social-maneuvers] Energy refund: Strategy Chat success (20% chance)`);
        }
      } else if(action.id === 'mediate' && SocialResources.canRefundEnergy(actorId, 'mediate-conflict')) {
        // 100% refund if conflict resolved
        SocialResources.earn(actorId, { energy: 1 });
        SocialResources.recordEnergyRefund(actorId, 'mediate-conflict');
        console.info(`[social-maneuvers] Energy refund: Mediate success (100% if conflict resolved)`);
      }
    }
    
    recordActionInMemory(actorId, targetId, action, outcomeType);
    applyTraitEffects(actorId, targetId, action);
    return { type: outcomeType, message, affinityChange, traitModifiers, memoryModifiers, succeeded };
  }

  // High-impact: Spread Rumor
  function processSpreadRumor(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const caught = Math.random() < (action.backlashRisk ?? 0.3);

    if(caught){
      const backlashDelta = -0.15 - Math.random() * 0.10;
      // Actor-target relationship hit
      if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + backlashDelta; }
      // Some witnesses sour on the actor
      const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
      const participants = [actor.id, targetId];
      alive.forEach(w => {
        if(Math.random() < 0.4 && actor.affinity){
          actor.affinity[w.id] = (actor.affinity[w.id] ?? 0) + (backlashDelta * 0.5);
          participants.push(w.id);
        }
      });

      recordBacklashMemory(actor.id, targetId, 'rumor_caught', {
        action: 'spread_rumor',
        severity: 'medium',
        description: `${actorName} was caught spreading rumors about ${targetName}`
      });
      recordActionInMemory(actor.id, targetId, action, 'backlash');
      global.addLog?.(`${actorName} was caught spreading rumors about ${targetName}!`, 'danger');

      return { type: 'backlash', message: `You were caught! Your reputation took a hit.`, affinityChange: backlashDelta, caught: true, participants };
    } else {
      // Success: damage target reputation with random others
      const delta = -0.10 - Math.random() * 0.08;
      const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
      const affectedIds = [];
      alive.forEach(other => {
        if(Math.random() < 0.5 && target.affinity){
          target.affinity[other.id] = (target.affinity[other.id] ?? 0) + delta;
          affectedIds.push(other.id);
        }
      });
      recordActionInMemory(actor.id, targetId, action, 'success');
      global.addLog?.(`${actorName} spread rumors about ${targetName}.`, 'muted');

      return { type: 'success', message: `Rumor spread successfully. ${targetName}'s reputation damaged.`, affinityChange: delta, caught: false, participants: [actor.id, targetId, ...affectedIds] };
    }
  }

  // High-impact: Expose Secret
  function processExposeSecret(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const backlash = Math.random() < (action.backlashRisk ?? 0.5);
    const impactDelta = -0.20 - Math.random() * 0.15;

    const alive = (global.alivePlayers?.() || []).filter(p => p.id !== actor.id && p.id !== targetId);
    alive.forEach(other => { if(target.affinity){ target.affinity[other.id] = (target.affinity[other.id] ?? 0) + impactDelta; } });

    if(backlash){
      const backlashDelta = -0.12 - Math.random() * 0.08;
      alive.forEach(other => {
        if(Math.random() < 0.6 && actor.affinity){
          actor.affinity[other.id] = (actor.affinity[other.id] ?? 0) + backlashDelta;
        }
      });
      if(actor.affinity){
        actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + (-0.25 - Math.random() * 0.10);
      }
      recordBacklashMemory(actor.id, targetId, 'secret_exposed', {
        action: 'expose_secret',
        severity: 'high',
        description: `${actorName} exposed secrets about ${targetName}, but faced backlash`
      });
      recordActionInMemory(actor.id, targetId, action, 'backlash');
      global.addLog?.(`${actorName} exposed ${targetName}'s secrets! Both reputations damaged.`, 'danger');

      return { type: 'backlash', message: `Secret exposed but you're seen as untrustworthy. High cost!`, affinityChange: impactDelta, backlash: true, backlashDelta, participants: [actor.id, targetId, ...alive.map(p => p.id)] };
    } else {
      recordActionInMemory(actor.id, targetId, action, 'success');
      global.addLog?.(`${actorName} exposed damaging information about ${targetName}!`, 'warning');
      return { type: 'success', message: `Secret exposed successfully! ${targetName}'s reputation destroyed.`, affinityChange: impactDelta, backlash: false, participants: [actor.id, targetId, ...alive.map(p => p.id)] };
    }
  }

  // High-impact: Group Hangout (multi-target)
  function processGroupHangout(actorId, targetIds, action){
    const actor = global.getP?.(actorId);
    if(!actor){ return { type: 'error', message: 'Actor not found' }; }
    const participants = [actorId, ...targetIds];
    const boostDelta = 0.04 + Math.random() * 0.03;

    // Mutual small boost among all participants
    for(let i = 0; i < participants.length; i++){
      for(let j = i + 1; j < participants.length; j++){
        const p1 = global.getP?.(participants[i]);
        const p2 = global.getP?.(participants[j]);
        if(p1 && p2){
          if(p1.affinity){ p1.affinity[p2.id] = (p1.affinity[p2.id] ?? 0) + boostDelta; }
          if(p2.affinity){ p2.affinity[p1.id] = (p2.affinity[p1.id] ?? 0) + boostDelta; }
        }
      }
    }

    // Memory: use first target as representative
    if(targetIds[0] !== undefined){
      recordActionInMemory(actorId, targetIds[0], action, 'positive');
    }
    const actorName = global.safeName?.(actorId) || `Player ${actorId}`;
    global.addLog?.(`${actorName} organized a group hangout with ${targetIds.length} others.`, 'ok');

    return { type: 'positive', message: `Group hangout was fun! Everyone bonded a little.`, affinityChange: boostDelta, participants, multiTarget: true };
  }

  // High-impact: Form Alliance
  function processFormAlliance(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    if(!actor || !target){ return { type: 'error', message: 'Target not found' }; }

    const actorName = actor.name || `Player ${actor.id}`;
    const targetName = target.name || `Player ${targetId}`;
    const currentAffinity = actor.affinity?.[targetId] ?? 0;
    const successThreshold = 0.15;
    const success = currentAffinity >= successThreshold;

    if(success){
      const allianceCreated = tryCreateAlliance(actorId, targetId);
      if(allianceCreated){
        const boostDelta = 0.10 + Math.random() * 0.05;
        if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + boostDelta; }
        if(target.affinity){ target.affinity[actorId] = (target.affinity[actorId] ?? 0) + boostDelta; }
        recordActionInMemory(actorId, targetId, action, 'success');
        global.addLog?.(`${actorName} and ${targetName} formed an alliance!`, 'success');
        return { type: 'success', message: `Alliance formed with ${targetName}! Stronger together.`, affinityChange: boostDelta, allianceFormed: true, participants: [actorId, targetId] };
      } else {
        recordActionInMemory(actorId, targetId, action, 'neutral');
        return { type: 'neutral', message: `Proposal accepted but alliance couldn't be formalized.`, participants: [actorId, targetId] };
      }
    } else {
      const delta = -0.08 - Math.random() * 0.05;
      if(actor.affinity){ actor.affinity[targetId] = (actor.affinity[targetId] ?? 0) + delta; }
      if(target.affinity){ target.affinity[actorId] = (target.affinity[actorId] ?? 0) + delta; }

      recordBetrayalRiskMemory(actorId, targetId, {
        action: 'form_alliance',
        reason: 'proposal_rejected',
        description: `${targetName} rejected ${actorName}'s alliance proposal`
      });
      recordActionInMemory(actorId, targetId, action, 'failure');
      global.addLog?.(`${targetName} rejected ${actorName}'s alliance proposal.`, 'warning');

      return { type: 'failure', message: `${targetName} rejected your proposal. Relationship strained.`, affinityChange: delta, allianceFormed: false, betrayalRisk: true, participants: [actorId, targetId] };
    }
  }

  function tryCreateAlliance(id1, id2){
    if(typeof global.formAlliance === 'function'){
      try {
        if(global.inSameAlliance?.(id1, id2)){ return false; }
        global.formAlliance([id1, id2]);
        return true;
      } catch(e){
        console.warn('[social-maneuvers] Alliance creation failed:', e);
        return false;
      }
    }
    return false;
  }

  // ============================================================================
  // MEMORY SYSTEM
  // ============================================================================
  function recordActionInMemory(actorId, targetId, action, outcome){
    const g = global.game; if(!g) return;
    if(!g.__socialManeuversMemory){ g.__socialManeuversMemory = { actions: [], relationships: new Map() }; }
    g.__socialManeuversMemory.actions.push({ week: g.week || 1, timestamp: Date.now(), actorId, targetId, action: action.id, outcome });
    if(g.__socialManeuversMemory.actions.length > 50){ g.__socialManeuversMemory.actions.shift(); }
    console.info('[social-maneuvers] Action recorded in memory');
  }
  function getPlayerMemory(actorId, targetId){
    const g = global.game;
    if(!g?.__socialManeuversMemory) return [];
    return g.__socialManeuversMemory.actions.filter(
      a => (a.actorId === actorId && a.targetId === targetId) ||
           (a.actorId === targetId && a.targetId === actorId)
    );
  }
  function recordBacklashMemory(actorId, targetId, eventType, details){
    const g = global.game; if(!g) return;
    if(!g.__backlashMemories){ g.__backlashMemories = []; }
    const actor = global.getP?.(actorId);
    g.__backlashMemories.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      eventType,
      ...details
    });
    // Optional per-player memory log
    if(actor && actor.memoryLog){
      actor.memoryLog.push({
        week: g.week || 1,
        timestamp: Date.now(),
        event: eventType,
        targetId,
        details
      });
      if(actor.memoryLog.length > 100){ actor.memoryLog.shift(); }
    }
    console.info('[social-maneuvers] Backlash memory recorded:', eventType);
  }
  function recordBetrayalRiskMemory(actorId, targetId, details){
    const g = global.game; if(!g) return;
    if(!g.__betrayalRisks){ g.__betrayalRisks = []; }
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    g.__betrayalRisks.push({
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetId,
      ...details
    });
    [actor, target].forEach(player => {
      if(player && player.memoryLog){
        player.memoryLog.push({
          week: g.week || 1,
          timestamp: Date.now(),
          event: 'betrayal_risk',
          targetId: player.id === actorId ? targetId : actorId,
          details
        });
        if(player.memoryLog.length > 100){ player.memoryLog.shift(); }
      }
    });
    console.info('[social-maneuvers] BetrayalRisk memory recorded');
  }

  // ============================================================================
  // TRAITS & MODIFIERS (from PR #2 integration; safe no-ops if missing)
  // ============================================================================
  function calculateTraitModifiers(actorId, targetId, action){
    const actor = global.getP?.(actorId);
    const target = global.getP?.(targetId);
    let affinityBonus = 0, successBonus = 0, appliedTraits = [];
    if(!actor || !target) return { affinityBonus, successBonus, appliedTraits };
    const hasTrait = global.hasTrait || (() => false);

    if(hasTrait(actorId, 'charismatic') && action.category === 'friendly'){
      affinityBonus += 0.02; successBonus += 0.2; appliedTraits.push('charismatic');
    }
    if(hasTrait(actorId, 'loyal')){
      const currentAffinity = actor.affinity?.[targetId] ?? 0;
      if(currentAffinity > 0.2){ affinityBonus += 0.015; appliedTraits.push('loyal'); }
    }
    if(hasTrait(actorId, 'deceptive')){
      if(action.category === 'aggressive'){ successBonus += 0.15; appliedTraits.push('deceptive'); }
      else if(action.category === 'friendly'){ successBonus -= 0.1; }
    }
    if(hasTrait(actorId, 'stubborn')){
      if(action.category === 'strategic'){ successBonus -= 0.2; }
      else if(action.category === 'aggressive'){ successBonus += 0.1; appliedTraits.push('stubborn'); }
    }
    if(hasTrait(targetId, 'gullible') && action.category === 'strategic'){
      affinityBonus += 0.02; successBonus += 0.15; appliedTraits.push('gullible-target');
    }
    if(hasTrait(targetId, 'paranoid')){
      affinityBonus -= 0.01; successBonus -= 0.1; appliedTraits.push('paranoid-target');
    }
    return { affinityBonus, successBonus, appliedTraits };
  }
  function calculateMemoryModifiers(actorId, targetId){
    let affinityBonus = 0, relevantMemories = [];
    const getMemoryLog = global.getMemoryLog || (() => []);
    const MEMORY_EVENTS = global.MEMORY_EVENTS || {};
    const actorMemories = getMemoryLog(actorId, { targetId });
    const countMemory = (mems, evt) => mems.filter(m => m.event === evt).length;

    const promisesMade      = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_MADE);
    const alliancesFormed   = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_FORMED);
    const secretsShared     = countMemory(actorMemories, MEMORY_EVENTS.SECRET_SHARED);
    const conflictsResolved = countMemory(actorMemories, MEMORY_EVENTS.CONFLICT_RESOLVED);
    const mediationSuccess  = countMemory(actorMemories, MEMORY_EVENTS.MEDIATION_SUCCESS);
    const promisesBroken    = countMemory(actorMemories, MEMORY_EVENTS.PROMISE_BROKEN);
    const betrayals         = countMemory(actorMemories, MEMORY_EVENTS.ALLIANCE_BETRAYED);
    const rumorsExposed     = countMemory(actorMemories, MEMORY_EVENTS.RUMOR_EXPOSED);
    const confrontations    = countMemory(actorMemories, MEMORY_EVENTS.PUBLIC_CONFRONTATION);

    const positiveCount = promisesMade + alliancesFormed + secretsShared + conflictsResolved + mediationSuccess;
    const negativeCount = promisesBroken + betrayals + rumorsExposed + confrontations;

    affinityBonus += positiveCount * 0.005;
    affinityBonus -= negativeCount * 0.01;
    affinityBonus = Math.max(-0.05, Math.min(0.05, affinityBonus));

    if(positiveCount > 0) relevantMemories.push(`${positiveCount} positive`);
    if(negativeCount > 0) relevantMemories.push(`${negativeCount} negative`);
    return { affinityBonus, positiveCount, negativeCount, relevantMemories };
  }
  function applyTraitEffects(actorId, targetId, action){
    // Placeholder hook - complex effects should be handled in evaluation or handlers
    console.info('[social-maneuvers] Trait effects evaluated for', action.id);
  }

  // Extended Telemetry for special actions
  function recordSpecialTelemetry(actorId, targetIds, action, outcome){
    const g = global.game; if(!g) return;
    if(!g.__socialTelemetry){ g.__socialTelemetry = []; }
    const entry = {
      week: g.week || 1,
      timestamp: Date.now(),
      actorId,
      targetIds: Array.isArray(targetIds) ? targetIds : [targetIds],
      actionId: action.id,
      actionLabel: action.label,
      energyCost: action.costs?.energy ?? action.cost ?? 0,
      infoCost: action.costs?.information ?? 0,
      outcomeType: outcome?.type,
      participants: outcome?.participants || [actorId, ...(Array.isArray(targetIds)?targetIds:[targetIds])],
      deltas: {}
    };
    if(outcome?.affinityChange !== undefined) entry.deltas.affinity = outcome.affinityChange;
    if(outcome?.backlashDelta !== undefined) entry.deltas.backlash = outcome.backlashDelta;
    if(outcome?.allianceFormed !== undefined) entry.allianceFormed = outcome.allianceFormed;
    if(outcome?.betrayalRisk !== undefined) entry.betrayalRisk = outcome.betrayalRisk;
    if(outcome?.caught !== undefined) entry.caught = outcome.caught;

    g.__socialTelemetry.push(entry);
    if(g.__socialTelemetry.length > 200) g.__socialTelemetry.shift();
    console.info('[social-maneuvers] Telemetry recorded (extended):', entry);
  }

  // ============================================================================
  // UI RENDERING (HUD + Dynamic Menu + History + Feedback + Multi-select)
  // ============================================================================
  function renderSocialManeuversUI(container, playerId){
    if(!isEnabled()){ console.info('[social-maneuvers] UI render requested but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ✓ Rendering Social Maneuvers UI for player', playerId);
    if(!container){ console.warn('[social-maneuvers] No container provided for UI'); return; }

    // Check if player is evicted
    const player = global.getP?.(playerId);
    if(player && player.evicted){
      console.info('[social-maneuvers] Player', playerId, 'is evicted - showing eviction message');
      const evictedMessage = document.createElement('div');
      evictedMessage.className = 'social-evicted-message';
      evictedMessage.style.cssText = 'padding: 24px; text-align: center; color: #999; font-size: 1.1rem;';
      evictedMessage.innerHTML = `
        <h3 style="margin-bottom: 12px; color: #ff6b6b;">You Have Been Evicted</h3>
        <p>You can no longer participate in social interactions.</p>
      `;
      container.innerHTML = '';
      container.appendChild(evictedMessage);
      return;
    }

    const resources = SocialResources.getAll(playerId);
    const alivePlayers = global.alivePlayers?.() || [];
    const otherPlayers = alivePlayers.filter(p => p.id !== playerId);

    let selectedPlayers = []; // supports multi-target
    let selectedAction = null;

    const wrapper = document.createElement('div');
    wrapper.className = 'social-maneuvers-panel';
    wrapper.setAttribute('role', 'region');
    wrapper.setAttribute('aria-label', 'Social Maneuvers Interface');

    const resourcesHUD = createResourcesHUD(resources);
    wrapper.appendChild(resourcesHUD);

    // Player selection
    if(otherPlayers.length > 0){
      const playerSection = createPlayerSelection(playerId, otherPlayers, (players) => {
        selectedPlayers = players;
        updateActionsList();
        updateHistorySection();
      });
      wrapper.appendChild(playerSection);
    }

    // History section (collapsible, updates on target change)
    const historySection = document.createElement('div');
    historySection.className = 'social-history-section';
    historySection.style.display = 'none';
    wrapper.appendChild(historySection);
    function updateHistorySection(){
      historySection.innerHTML = '';
      if(selectedPlayers.length === 0){ historySection.style.display = 'none'; return; }
      historySection.style.display = 'block';
      const historyContent = createHistoryUI ? createHistoryUI(playerId, selectedPlayers[0].id) : document.createElement('div');
      if(!historyContent || !historyContent.classList){ // fallback text
        const d = document.createElement('div'); d.textContent = 'History unavailable'; historySection.appendChild(d);
      } else {
        historySection.appendChild(historyContent);
      }
    }

    // Actions menu
    const actionsSection = document.createElement('div');
    actionsSection.className = 'social-action-select';
    actionsSection.innerHTML = `<div class="social-section-title">Select Action</div>`;
    const actionsList = document.createElement('div');
    actionsList.className = 'social-actions-list';
    actionsSection.appendChild(actionsList);
    wrapper.appendChild(actionsSection);

    // Execute button
    const executeBtn = document.createElement('button');
    executeBtn.className = 'social-action-button';
    executeBtn.textContent = 'Execute Action';
    executeBtn.disabled = true;
    executeBtn.setAttribute('aria-label', 'Execute selected social action');
    executeBtn.onclick = () => {
      if(selectedPlayers.length > 0 && selectedAction){
        const primaryTarget = selectedPlayers[0];
        const extraTargets = selectedPlayers.slice(1).map(p => p.id);
        const result = executeAction(playerId, primaryTarget.id, selectedAction.id, extraTargets);
        showFeedback(result, playerId);
        setTimeout(() => { container.innerHTML = ''; renderSocialManeuversUI(container, playerId); }, 2500);
      }
    };
    wrapper.appendChild(executeBtn);

    function updateActionsList(){
      actionsList.innerHTML = '';
      if(selectedPlayers.length === 0){
        const emptyState = document.createElement('div');
        emptyState.className = 'social-empty-state';
        emptyState.textContent = 'Select player(s) to see available actions';
        actionsList.appendChild(emptyState);
        executeBtn.disabled = true;
        return;
      }
      const availableActions = getAvailableActions(playerId, selectedPlayers[0].id);
      availableActions.forEach(action => {
        const actionItem = createActionItem(action, resources, selectedPlayers[0], (selected) => {
          selectedAction = selected;
          actionsList.querySelectorAll('.social-action-item').forEach(item => { item.classList.remove('selected'); });
          actionItem.classList.add('selected');

          // Toggle multi-select mode on the player picker
          updatePlayerSelectionMode(selected.multiTarget, selected.minTargets, selected.maxTargets);

          const isLocked = action.evaluation?.states?.locked || false;
          executeBtn.disabled = isLocked || !action.canAfford;
        });
        actionsList.appendChild(actionItem);
      });
    }

    function updatePlayerSelectionMode(multiTarget, minTargets, maxTargets){
      const playerSection = wrapper.querySelector('.social-player-select');
      if(!playerSection) return;
      if(multiTarget){
        playerSection.classList.add('multi-select-mode');
        playerSection.setAttribute('data-min-targets', String(minTargets || 2));
        playerSection.setAttribute('data-max-targets', String(maxTargets || 4));

        let instruction = playerSection.querySelector('.selection-instruction');
        if(!instruction){
          instruction = document.createElement('div');
          instruction.className = 'selection-instruction';
          playerSection.insertBefore(instruction, playerSection.firstChild.nextSibling);
        }
        instruction.textContent = `Select ${minTargets || 2}-${maxTargets || 4} players for group action`;
      } else {
        playerSection.classList.remove('multi-select-mode');
        const instruction = playerSection.querySelector('.selection-instruction');
        if(instruction) instruction.remove();
        // If multi selected earlier, reduce to one (keep first)
        if(selectedPlayers.length > 1) selectedPlayers = [selectedPlayers[0]];
      }
    }

    container.appendChild(wrapper);
    updateActionsList();
  }

  // HUD rendering
  function createResourcesHUD(resources){
    const hud = document.createElement('div');
    hud.className = 'social-resources-hud';
    hud.setAttribute('role', 'status');
    hud.setAttribute('aria-live', 'polite');
    for(const [type, config] of Object.entries(RESOURCE_CONFIG)){
      const display = createResourceDisplay(type, resources[type], config.max, config.description, config.examples, getResourceIcon(type));
      hud.appendChild(display);
    }
    return hud;
  }
  function createResourceDisplay(type, current, max, description, examples, icon){
    const container = document.createElement('div');
    container.className = `social-resource-display social-resource-${type}`;
    container.setAttribute('data-tooltip', `${description}\n\nExamples: ${examples}`);
    const header = document.createElement('div');
    header.className = 'social-resource-header';
    header.innerHTML = `<span class="social-resource-icon">${icon}</span> <span class="social-resource-label">${type.charAt(0).toUpperCase() + type.slice(1)}</span>`;
    container.appendChild(header);
    container.innerHTML += `<div class="social-resource-value"><span class="current">${current}</span>/<span class="max">${max}</span></div>`;
    const progressBar = document.createElement('div');
    progressBar.className = 'social-resource-progress';
    const progressFill = document.createElement('div');
    progressFill.className = 'social-resource-progress-fill';
    progressFill.style.width = `${max > 0 ? (current / max) * 100 : 0}%`;
    progressBar.appendChild(progressFill);
    container.appendChild(progressBar);
    return container;
  }
  function getResourceIcon(type){ return { energy: '⚡', influence: '🎭', information: '🔍' }[type] || type; }

  // Player selection (supports single and multi-select modes)
  function createPlayerSelection(playerId, players, onSelect){
    const container = document.createElement('div');
    container.className = 'social-player-select';

    const title = document.createElement('div');
    title.className = 'social-section-title';
    title.textContent = 'Select Target';
    container.appendChild(title);

    const grid = document.createElement('div');
    grid.className = 'social-player-grid';
    grid.setAttribute('role', 'group');
    grid.setAttribute('aria-label', 'Select target player(s)');

    const actor = global.getP?.(playerId);
    let selectedPlayers = [];

    players.forEach(player => {
      const card = document.createElement('div');
      card.className = 'social-player-card';
      card.setAttribute('data-player-id', player.id);
      card.setAttribute('tabindex', '0');

      // Name
      const nameDiv = document.createElement('div');
      nameDiv.className = 'player-name';
      nameDiv.textContent = player.name || `Player ${player.id}`;
      card.appendChild(nameDiv);

      // Affinity
      if(actor){
        const affinity = actor.affinity?.[player.id] ?? 0;
        const affinityDiv = document.createElement('div');
        affinityDiv.className = 'player-affinity';
        affinityDiv.style.cssText = 'font-size:0.75em;opacity:0.8;margin-top:4px;';
        let affinityLabel = 'Neutral';
        if(affinity >= 0.28) affinityLabel = 'Allies';
        else if(affinity >= 0.12) affinityLabel = 'Friendly';
        else if(affinity <= -0.28) affinityLabel = 'Enemies';
        else if(affinity <= -0.12) affinityLabel = 'Strained';
        affinityDiv.textContent = `${affinityLabel} (${(affinity * 100).toFixed(0)}%)`;
        card.appendChild(affinityDiv);
      }

      // Click behavior
      card.onclick = () => {
        const multi = container.classList.contains('multi-select-mode');
        if(multi){
          const maxTargets = parseInt(container.getAttribute('data-max-targets') || '10', 10);
          const isSelected = card.classList.contains('selected');
          if(isSelected){
            card.classList.remove('selected');
            selectedPlayers = selectedPlayers.filter(p => p.id !== player.id);
          } else {
            if(selectedPlayers.length < maxTargets){
              card.classList.add('selected');
              selectedPlayers.push(player);
            }
          }
        } else {
          grid.querySelectorAll('.social-player-card').forEach(c => c.classList.remove('selected'));
          card.classList.add('selected');
          selectedPlayers = [player];
        }
        onSelect(selectedPlayers);
      };

      card.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); card.onclick(); } });

      grid.appendChild(card);
    });

    container.appendChild(grid);
    return container;
  }

  // Action item rendering (dynamic, context-aware, shows resource costs)
  function createActionItem(action, resources, targetPlayer, onSelect){
    const item = document.createElement('div');
    item.className = 'social-action-item';
    item.setAttribute('role', 'button');
    item.setAttribute('tabindex', '0');

    const canAfford = action.canAfford;
    const evaluation = action.evaluation;
    const states = evaluation?.states || {};
    const isLocked = states.locked || !evaluation?.available;
    const isRisky = states.risky;
    const isBoosted = states.boosted;
    const isDiscounted = states.discounted;

    if(isLocked){
      item.classList.add('locked');
      item.setAttribute('aria-disabled', 'true');
    } else if(!canAfford){
      item.classList.add('disabled');
      item.setAttribute('aria-disabled', 'true');
    }
    if(isRisky) item.classList.add('risky');
    if(isBoosted) item.classList.add('boosted');
    if(isDiscounted) item.classList.add('discounted');

    // Header + Badges + Resource Costs
    const costsBadges = [];
    if((action.costs?.energy ?? 0) > 0){
      const affordable = resources.energy >= action.costs.energy;
      costsBadges.push(`<span class="social-cost-badge energy ${affordable ? 'affordable' : 'expensive'}">⚡${action.costs.energy}</span>`);
    }
    if((action.costs?.information ?? 0) > 0){
      const affordable = resources.information >= action.costs.information;
      costsBadges.push(`<span class="social-cost-badge information ${affordable ? 'affordable' : 'expensive'}">🔍${action.costs.information}</span>`);
    }
    if((action.costs?.influence ?? 0) > 0){
      const affordable = resources.influence >= action.costs.influence;
      costsBadges.push(`<span class="social-cost-badge influence ${affordable ? 'affordable' : 'expensive'}">🎭${action.costs.influence}</span>`);
    }

    item.innerHTML = `<div class="social-action-header">
      <div class="social-action-name">${action.label}</div>
      <div class="social-action-badges" style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">
        ${isLocked ? '<span class="badge badge-locked" title="Locked">🔒</span>' : ''}
        ${isBoosted ? '<span class="badge badge-boosted" title="Boosted success chance">⬆️</span>' : ''}
        ${isDiscounted ? '<span class="badge badge-discounted" title="Reduced cost">💰</span>' : ''}
        ${isRisky ? '<span class="badge badge-risky" title="Higher backlash on failure">⚠️</span>' : ''}
        ${costsBadges.join('')}
      </div>
     </div>`;

    item.innerHTML += `<div class="social-action-description">${action.description}</div>`;

    if(isLocked && evaluation){
      item.innerHTML += `<div class="social-action-lock-reason" style="font-size:0.75em;color:#ff6666;margin-top:4px;">${evaluation.gateReasons?.join('; ') || 'Requirements not met'}</div>`;
    }
    if(evaluation && !isLocked){
      const tooltip = createChanceTooltip(evaluation);
      item.appendChild(tooltip);
      item.addEventListener('mouseenter', () => { tooltip.style.display = 'block'; });
      item.addEventListener('mouseleave', () => { tooltip.style.display = 'none'; });
    }

    item.innerHTML += `<span class="social-action-category ${action.category}">${action.category}</span>`;

    if(!isLocked && canAfford){
      item.onclick = () => onSelect(action);
      item.addEventListener('keypress', (e) => { if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); onSelect(action); } });
    }
    return item;
  }

  function createChanceTooltip(evaluation){
    const tooltip = document.createElement('div');
    tooltip.className = 'social-action-tooltip';
    tooltip.style.cssText = 'display:none;position:absolute;background:#1a1a2e;border:1px solid #444;border-radius:6px;padding:8px;z-index:1000;min-width:200px;box-shadow:0 4px 8px rgba(0,0,0,0.3);';
    tooltip.innerHTML = `<div style="font-weight:bold;margin-bottom:6px;color:#f7b955;">Success Chance Breakdown</div>
      <div style="font-size:0.85em;margin:2px 0;">Base: <strong>${(evaluation.baseChance * 100).toFixed(0)}%</strong></div>
      ${evaluation.modifiers?.length ? '<div style="border-top:1px solid #333;margin:6px 0 4px 0;"></div>' : ''}
      ${evaluation.modifiers?.map(mod => `<div style="font-size:0.85em;margin:2px 0;">${mod.label}: <span style="color:${mod.value >= 0 ? '#66ff66' : '#ff6666'}">${mod.value >= 0 ? '+' : ''}${(mod.value * 100).toFixed(0)}%</span></div>`).join('') || ''}
      <div style="border-top:1px solid #333;margin:6px 0 4px 0;"></div>
      <div style="font-size:0.9em;margin:4px 0;font-weight:bold;">Final Chance: <span style="color:#66ff66">${(evaluation.finalChance * 100).toFixed(0)}%</span></div>`;
    return tooltip;
  }

  // Feedback
  function showFeedback(result, playerId){
    const existing = document.querySelector('.social-feedback-panel'); if(existing){ existing.remove(); }
    if(!result.success){
      let message = result.message || result.reason;
      if(result.gateReasons?.length) message = result.gateReasons.join('; ');
      const panel = createFeedbackPanel('negative', 'Action Failed', message);
      document.body.appendChild(panel); setTimeout(() => panel.remove(), 3000);
      return;
    }
    const outcome = result.outcome;
    const succeeded = result.succeeded;
    const telemetry = result.telemetry;
    let feedbackType = outcome.type;
    if(!succeeded) feedbackType = 'negative';
    let message = outcome.message;
    if(telemetry) message += `\n${succeeded ? '✓' : '✗'} ${(telemetry.finalChance * 100).toFixed(0)}% chance (rolled ${(telemetry.chanceRoll * 100).toFixed(0)}%)`;
    const panel = createFeedbackPanel(feedbackType, result.action.label, message);
    if(result.resources){
      const resourcesDiv = document.createElement('div');
      resourcesDiv.className = 'feedback-resources';
      resourcesDiv.innerHTML = `<small>⚡${result.resources.energy} 🎭${result.resources.influence} 🔍${result.resources.information}</small>`;
      panel.appendChild(resourcesDiv);
    }
    document.body.appendChild(panel);
    panel.style.animation = 'slideInRight 0.4s ease';
    setTimeout(() => { panel.style.animation = 'slideOutRight 0.4s ease'; setTimeout(() => panel.remove(), 400); }, 3000);
  }
  function createFeedbackPanel(type, title, message){
    const panel = document.createElement('div');
    panel.className = `social-feedback-panel ${type}`;
    panel.setAttribute('role', 'alert');
    panel.setAttribute('aria-live', 'assertive');
    panel.innerHTML = `<div class="social-feedback-title">${title}</div><div class="social-feedback-message">${message}</div>`;
    return panel;
  }

  // ============================================================================
  // HISTORY UI (collapsible) - available when createHistoryUI is defined elsewhere
  // (Kept hook only; actual implementation provided in previous PR integration)
  // ============================================================================

  // ============================================================================
  // FAST-ADVANCE HELPER + SHIM
  // ============================================================================
  
  /**
   * Fallback implementation for scheduleFastAdvance when native API is not available.
   * Shows summary, calls phase end, and advances to nominations after delay.
   * @param {number} delayMs - Delay in milliseconds before advancing (default 800ms)
   */
  function scheduleFastAdvanceFallback(delayMs = 800) {
    const g = global.game;
    if (!g) return;
    
    console.info(`[social-maneuvers] scheduleFastAdvance fallback - advancing in ${delayMs}ms`);
    
    // Clear any existing timeout
    if (g.__socialFastAdvanceTimeout) {
      clearTimeout(g.__socialFastAdvanceTimeout);
      g.__socialFastAdvanceTimeout = null;
    }
    
    g.__socialFastAdvanceTimeout = setTimeout(async () => {
      console.info('[social-maneuvers] ⏩ Fast-advance triggered (fallback)');
      g.__socialFastAdvanceTimeout = null;
      
      try {
        // (a) Render the Social Maneuvers summary
        await global.cardQueueWaitIdle?.();
        
        let summaryShown = false;
        
        // Helper to try showing a summary method
        function tryShowSummaryMethod(fn, successMsg, errorMsg) {
          try {
            fn();
            summaryShown = true;
            console.info(successMsg);
          } catch (e) {
            console.error(errorMsg, e);
          }
        }
        
        if (typeof showSummaryPanel === 'function') {
          tryShowSummaryMethod(
            () => showSummaryPanel(generatePhaseSummary()),
            '[social-maneuvers] ✓ Summary shown via showSummaryPanel',
            '[social-maneuvers] showSummaryPanel failed:'
          );
        }
        
        if (!summaryShown && typeof global.SocialManeuvers?.showEndOfPhaseSummary === 'function') {
          tryShowSummaryMethod(
            () => global.SocialManeuvers.showEndOfPhaseSummary(),
            '[social-maneuvers] ✓ Summary shown via showEndOfPhaseSummary',
            '[social-maneuvers] showEndOfPhaseSummary failed:'
          );
        }
        
        if (!summaryShown && typeof global.SocialManeuvers?.presentPhaseSummary === 'function') {
          tryShowSummaryMethod(
            () => global.SocialManeuvers.presentPhaseSummary(),
            '[social-maneuvers] ✓ Summary shown via presentPhaseSummary',
            '[social-maneuvers] presentPhaseSummary failed:'
          );
        }
        
        await global.cardQueueWaitIdle?.();
        
        // (b) Call onSocialPhaseEnd
        if (typeof onSocialPhaseEnd === 'function') {
          try {
            onSocialPhaseEnd();
            console.info('[social-maneuvers] ✓ onSocialPhaseEnd called');
          } catch (e) {
            console.error('[social-maneuvers] onSocialPhaseEnd failed:', e);
          }
        }
        
        // (c) Advance to nominations
        if (typeof global.startNominations === 'function') {
          global.startNominations();
          console.info('[social-maneuvers] ✓ Advanced to nominations via startNominations');
        } else if (typeof global.setPhase === 'function') {
          global.setPhase('nominations', g.cfg?.tNoms || 25, () => {
            if (typeof global.startVeto === 'function') global.startVeto();
            else if (typeof global.startVetoComp === 'function') global.startVetoComp();
          });
          global.renderPanel?.();
          console.info('[social-maneuvers] ✓ Advanced to nominations via setPhase');
        } else {
          console.error('[social-maneuvers] No method available to advance to nominations');
        }
      } catch (e) {
        console.error('[social-maneuvers] Fast-advance fallback failed:', e);
      }
    }, delayMs);
  }
  
  /**
   * Install guarded shim for window.scheduleFastAdvance if undefined.
   * This ensures energy depletion doesn't cause ReferenceError.
   */
  function installScheduleFastAdvanceShim() {
    if (typeof window.scheduleFastAdvance === 'undefined') {
      window.scheduleFastAdvance = scheduleFastAdvanceFallback;
      console.info('[social-maneuvers] ✓ Installed scheduleFastAdvance shim (fallback implementation)');
    } else {
      console.info('[social-maneuvers] scheduleFastAdvance already defined - using existing implementation');
    }
  }
  
  // Install shim immediately on module load
  installScheduleFastAdvanceShim();
  
  /**
   * Shorten the current phase timer and accelerate phase end after the specified delay.
   * Used when player depletes all social energy.
   * @param {number} delayMs - Delay in milliseconds before advancing (default 3000ms)
   */
  function shortenPhaseTimer(delayMs = 3000){
    const g = global.game;
    if(!g) return;

    // Clear any existing fast-advance timeout
    if(g.__socialFastAdvanceTimeout){
      clearTimeout(g.__socialFastAdvanceTimeout);
      g.__socialFastAdvanceTimeout = null;
    }

    console.info(`[social-timer] fast-advance in ${delayMs}ms (energy depleted)`);

    // Try to use existing timer APIs if available, otherwise fallback to setTimeout
    const phaseEndMs = g.phaseEndsAt;
    const now = Date.now();
    const currentRemaining = phaseEndMs ? Math.max(0, phaseEndMs - now) : 0;

    // Check if we have existing timer APIs (none currently exist, but future-proof)
    if(typeof global.schedulePhaseAdvanceIn === 'function'){
      // Use schedulePhaseAdvanceIn if available
      try{
        global.schedulePhaseAdvanceIn(delayMs);
        console.info('[social-maneuvers] Used schedulePhaseAdvanceIn API');
        return;
      }catch(e){
        console.warn('[social-maneuvers] schedulePhaseAdvanceIn failed:', e);
      }
    }

    if(typeof global.GameTimer?.shortenCurrentByMs === 'function'){
      // Use GameTimer.shortenCurrentByMs if available
      try{
        const shortenBy = Math.max(0, currentRemaining - delayMs);
        global.GameTimer.shortenCurrentByMs(shortenBy);
        console.info('[social-maneuvers] Used GameTimer.shortenCurrentByMs API');
        return;
      }catch(e){
        console.warn('[social-maneuvers] GameTimer.shortenCurrentByMs failed:', e);
      }
    }

    if(typeof global.GameTimer?.setRemainingMs === 'function'){
      // Use GameTimer.setRemainingMs if available
      try{
        global.GameTimer.setRemainingMs(delayMs);
        console.info('[social-maneuvers] Used GameTimer.setRemainingMs API');
        return;
      }catch(e){
        console.warn('[social-maneuvers] GameTimer.setRemainingMs failed:', e);
      }
    }

    if(typeof global.setPhaseDurationMs === 'function'){
      // Use setPhaseDurationMs fallback
      try{
        global.setPhaseDurationMs(delayMs);
        console.info('[social-maneuvers] Used setPhaseDurationMs API');
        return;
      }catch(e){
        console.warn('[social-maneuvers] setPhaseDurationMs failed:', e);
      }
    }

    // Fallback: use setTimeout to manually advance phase
    // This is the most reliable approach given current codebase
    console.info('[social-maneuvers] Using setTimeout fallback for fast advance');
    
    g.__socialFastAdvanceTimeout = setTimeout(() => {
      console.info('[social-maneuvers] ⏩ Fast-advancing phase (energy depleted)');
      g.__socialFastAdvanceTimeout = null;

      // Try to advance phase by manipulating the phase timer
      if(g.endAt && typeof g.endAt === 'number'){
        // Shorten the timer to expire very soon (100ms buffer for cleanup)
        g.endAt = Date.now() + 100;
        // Also update phaseEndsAt if tracked
        if (typeof g.phaseEndsAt === 'number') {
          g.phaseEndsAt = g.endAt;
          console.info('[social-maneuvers] Updated phaseEndsAt to match endAt');
        }
        console.info('[social-maneuvers] Shortened phase timer to 100ms');
        // Trigger manual timer check if available
        if (typeof global.checkPhaseTimer === 'function') {
          global.checkPhaseTimer();
          console.info('[social-maneuvers] Triggered manual phase timer check');
        }
      } else {
        // If no endAt, try to call the phase advance directly
        console.warn('[social-maneuvers] No phase timer found, attempting direct advance');
        
        // Try to trigger phase transition via timeout callback
        // The onDone callback should be stored somewhere accessible
        if(typeof global.advancePhase === 'function'){
          global.advancePhase();
        } else if(typeof global.defaultAdvance === 'function'){
          global.defaultAdvance(g.phase);
        } else {
          console.error('[social-maneuvers] Unable to advance phase - no advance function found');
        }
      }
    }, delayMs);
  }

  /**
   * Check if the human player has depleted all their social energy.
   * If so, schedule a fast advance using the shim or native implementation.
   * @param {number} playerId - Player ID to check
   */
  function checkEnergyDepletionAndAdvance(playerId){
    if(!isEnabled()) return;
    
    const g = global.game;
    if(!g) return;

    // Only check for human player
    const humanId = g.humanId;
    if(playerId !== humanId) return;

    // Check if all energy is spent
    const energyRemaining = SocialResources.get(playerId, 'energy');
    
    if(energyRemaining === 0){
      console.info(`[social-maneuvers] 🎯 Player ${playerId} has depleted all energy (0 remaining)`);
      
      // Show feedback message
      global.addLog?.('All social energy spent! Phase will advance shortly...', 'ok');
      
      // Use guarded shim: window.scheduleFastAdvance (installed at module load) or fallback
      const scheduleFn = window.scheduleFastAdvance || scheduleFastAdvanceFallback;
      scheduleFn(800); // 800ms delay as specified in requirements
      console.info('[social-maneuvers] ✓ Scheduled fast advance via', window.scheduleFastAdvance ? 'native API' : 'fallback');
    }
  }

  // ============================================================================
  // PHASE TIMER CONTROL
  // ============================================================================
  
  let timerPaused = false;
  let pausedTimerState = null;
  
  /**
   * Pause the phase timer. Called when Socialize modal opens.
   * Prefers GameTimer.pause() if available, otherwise stores remaining ms and sets far future.
   */
  function pausePhaseTimer() {
    if (timerPaused) {
      console.info('[social-maneuvers] Timer already paused');
      return;
    }
    
    const g = global.game;
    if (!g) return;
    
    // Prefer GameTimer.pause() if available
    if (global.GameTimer && typeof global.GameTimer.pause === 'function') {
      try {
        global.GameTimer.pause();
        timerPaused = true;
        console.info('[social-maneuvers] ⏸️ Timer paused via GameTimer.pause()');
        return;
      } catch(e) {
        console.warn('[social-maneuvers] GameTimer.pause() failed, using fallback:', e);
      }
    }
    
    // Fallback: Store remaining ms and set far future
    if (g.endAt && typeof g.endAt === 'number') {
      const now = Date.now();
      const remaining = Math.max(0, g.endAt - now);
      pausedTimerState = {
        endAt: g.endAt,
        phaseEndsAt: g.phaseEndsAt,
        remaining: remaining,
        phase: g.phase,
        pausedAt: now
      };
      
      // Freeze the timer by setting endAt to far future
      g.endAt = now + (1000 * 60 * 60 * 24); // 24 hours in the future
      if (typeof g.phaseEndsAt === 'number') {
        g.phaseEndsAt = g.endAt;
      }
      
      timerPaused = true;
      console.info('[social-maneuvers] ⏸️ Timer paused (fallback):', remaining, 'ms remaining');
    } else {
      console.warn('[social-maneuvers] Cannot pause timer - no endAt found');
    }
  }
  
  /**
   * Resume the phase timer. Called when Socialize modal closes.
   * Prefers GameTimer.resume() if available, otherwise restores stored time.
   */
  function resumePhaseTimer() {
    if (!timerPaused) {
      console.info('[social-maneuvers] Timer not paused');
      return;
    }
    
    const g = global.game;
    if (!g) return;
    
    // Prefer GameTimer.resume() if available
    if (global.GameTimer && typeof global.GameTimer.resume === 'function') {
      try {
        global.GameTimer.resume();
        timerPaused = false;
        pausedTimerState = null;
        console.info('[social-maneuvers] ▶️ Timer resumed via GameTimer.resume()');
        return;
      } catch(e) {
        console.warn('[social-maneuvers] GameTimer.resume() failed, using fallback:', e);
      }
    }
    
    // Fallback: Restore timer with remaining time
    if (!pausedTimerState) {
      console.warn('[social-maneuvers] Cannot resume timer - no pausedTimerState');
      timerPaused = false;
      return;
    }
    
    const now = Date.now();
    g.endAt = now + pausedTimerState.remaining;
    if (typeof pausedTimerState.phaseEndsAt === 'number') {
      g.phaseEndsAt = now + pausedTimerState.remaining;
    }
    
    timerPaused = false;
    console.info('[social-maneuvers] ▶️ Timer resumed (fallback):', pausedTimerState.remaining, 'ms remaining');
    pausedTimerState = null;
  }
  
  // Wrap setPhase once to detect entering and leaving social_intermission
  const originalSetPhase = global.setPhase;
  if (typeof originalSetPhase === 'function') {
    global.setPhase = function(phase, duration, callback) {
      const g = global.game;
      const previousPhase = g?.phase;
      
      // Detect entering social_intermission
      if (previousPhase !== 'social_intermission' && phase === 'social_intermission') {
        console.info('[social-maneuvers] ✓ Entering social_intermission');
        
        // Call onSocialPhaseStart
        if (isEnabled()) {
          try {
            onSocialPhaseStart();
          } catch(e) {
            console.error('[social-maneuvers] onSocialPhaseStart failed:', e);
          }
        }
        
        // Start launcher observer
        if (global.SocialLauncherBootstrap?.startLauncherObserver) {
          global.SocialLauncherBootstrap.startLauncherObserver();
        }
        
        // Ensure launcher
        if (global.SocializeMobile?.ensureSocializeLauncher) {
          global.SocializeMobile.ensureSocializeLauncher();
        }
        
        // Show and update HUD
        if (global.SocializeMobile?.show) {
          global.SocializeMobile.show();
        }
        if (global.SocializeMobile?.updateHUD) {
          global.SocializeMobile.updateHUD();
        }
      }
      
      // Detect leaving social_intermission
      if (previousPhase === 'social_intermission' && phase !== 'social_intermission') {
        console.info('[social-maneuvers] ✓ Leaving social_intermission');
        
        // Call onSocialPhaseEnd
        if (isEnabled()) {
          try {
            onSocialPhaseEnd();
          } catch(e) {
            console.error('[social-maneuvers] onSocialPhaseEnd failed:', e);
          }
        }
        
        // Close socialize modal if open
        if (global.SocializeMobile?.closeModal) {
          global.SocializeMobile.closeModal();
        }
        
        // Hide launcher
        if (global.SocializeMobile?.hide) {
          global.SocializeMobile.hide();
        }
        
        // Resume timer if paused (safety)
        if (timerPaused) {
          resumePhaseTimer();
        }
      }
      
      // ENHANCEMENT 2: HOH phase exit fallback for placement rules
      if (previousPhase === 'hoh' && phase !== 'hoh' && isEnabled()) {
        console.info('[social-maneuvers] ✓ Exiting HOH phase - applying placement rules (fallback)');
        
        const week = g.week || 1;
        const humanId = g.humanId;
        const lastCompScores = g.lastCompScores;
        
        if(!g.__sm_watcherApplied) g.__sm_watcherApplied = new Map();
        const participationKey = `hoh-participation-${week}`;
        const eventApplied = g.__sm_watcherApplied.has(`${week}-${participationKey}`);
        
        if(humanId && lastCompScores && !eventApplied) {
          applyHOHPlacement(humanId, lastCompScores, week, 'fallback');
          g.__sm_watcherApplied.set(`${week}-${participationKey}`, true);
        }
      }
      
      // Call original setPhase
      return originalSetPhase.call(this, phase, duration, callback);
    };
    console.info('[social-maneuvers] ✓ Wrapped setPhase for phase entry/exit detection');
  }

  // ============================================================================
  // PHASE INTEGRATION
  // ============================================================================
  
  /**
   * Seed phase resources for a player using weekly events.
   * Called once at phase entry to set initial energy based on weekly bonuses/penalties.
   * @param {number} playerId - Player ID to seed resources for
   */
  function seedPhaseResources(playerId) {
    if(!isEnabled()) return;
    
    // Initialize player resources if not already done
    SocialResources.init(playerId);
    
    // Recompute phase energy based on weekly events
    const energy = SocialResources.recomputePhaseEnergy(playerId);
    
    // Event dispatch is handled by SocialResources.set() via recomputePhaseEnergy
    
    console.info(`[social-maneuvers] ✓ Phase resources seeded for player ${playerId}: energy=${energy}`);
  }
  
  // ============================================================================
  // COMPETITION SKIP WATCHER (SM-only, no legacy module edits)
  // ============================================================================
  
  /**
   * Watch for competition phase entries and track participation.
   * If a player skips a competition (no score recorded), apply skip penalty to bank.
   */
  function installCompetitionSkipWatcher() {
    if(!isEnabled()) return;
    
    const g = global.game;
    if(!g) return;
    
    // Track players who entered a competition phase
    if(!g.__sm_compPhaseEntries) g.__sm_compPhaseEntries = new Map();
    
    // Capture reference to SocialResources for use in wrapper
    const resources = SocialResources;
    
    // Wrap setPhase to detect competition phases
    const originalSetPhase = global.setPhase;
    if(typeof originalSetPhase !== 'function') return;
    
    global.setPhase = function(phase, duration, callback) {
      const previousPhase = g.phase;
      
      // Detect entering HOH or POV competition
      if((phase === 'hoh' || phase === 'pov') && previousPhase !== phase) {
        console.info(`[social-skip-watcher] 📋 Entering ${phase} competition phase`);
        
        // Mark all alive players as potentially skipping (innocent until proven participatory)
        const alivePlayers = global.alivePlayers?.() || [];
        const compKey = `${g.week}-${phase}`;
        
        if(!g.__sm_compPhaseEntries.has(compKey)) {
          const entryMap = new Map();
          alivePlayers.forEach(p => {
            entryMap.set(p.id, { entered: true, participated: false });
          });
          g.__sm_compPhaseEntries.set(compKey, entryMap);
          console.info(`[social-skip-watcher] Tracking ${alivePlayers.length} players for ${phase} participation`);
        }
      }
      
      // Detect leaving HOH or POV competition - check for skips
      if((previousPhase === 'hoh' || previousPhase === 'pov') && phase !== previousPhase) {
        console.info(`[social-skip-watcher] 📊 Leaving ${previousPhase} competition phase - checking for skips`);
        
        const compKey = `${g.week}-${previousPhase}`;
        const entries = g.__sm_compPhaseEntries.get(compKey);
        
        if(entries) {
          entries.forEach((status, playerId) => {
            if(status.entered && !status.participated) {
              // Player skipped the competition - apply penalty immediately to bank
              console.warn(`[social-skip-watcher] ⚠️ Player ${playerId} skipped ${previousPhase} competition`);
              // Use captured reference to maintain module consistency
              resources.recordWeeklyEvent(playerId, 'compSkipped', true);
            }
          });
        }
      }
      
      // Call original setPhase
      return originalSetPhase.call(this, phase, duration, callback);
    };
    
    console.info('[social-maneuvers] ✓ Competition skip watcher installed');
  }
  
  /**
   * Mark a player as having participated in the current competition.
   * Called when a player submits a score.
   * @param {number} playerId - Player ID who participated
   */
  function recordCompetitionParticipation(playerId) {
    if(!isEnabled()) return;
    
    const g = global.game;
    if(!g) return;
    
    const currentPhase = g.phase;
    if(currentPhase !== 'hoh' && currentPhase !== 'pov') return;
    
    const compKey = `${g.week}-${currentPhase}`;
    const entries = g.__sm_compPhaseEntries?.get(compKey);
    
    if(entries && entries.has(playerId)) {
      entries.get(playerId).participated = true;
      console.info(`[social-skip-watcher] ✓ Player ${playerId} participated in ${currentPhase}`);
    }
  }
  
  // Install skip watcher on module load
  installCompetitionSkipWatcher();
  
  // ============================================================================
  // PROPERTY WATCHERS FOR EVENT-DRIVEN BANK UPDATES
  // ============================================================================
  
  /**
   * Helper to get alive players with fallback to empty array
   */
  function getAlivePlayers() {
    return global.alivePlayers?.() || [];
  }
  
  /**
   * Helper to apply HOH placement rewards/penalties based on competition scores
   * @param {number} humanId - The human player's ID
   * @param {Map} lastCompScores - Map of player IDs to their competition scores
   * @param {number} week - Current game week
   * @param {string} context - Context string for logging (e.g., 'fallback', 'reconciliation')
   */
  function applyHOHPlacement(humanId, lastCompScores, week, context = '') {
    const contextSuffix = context ? ` (${context})` : '';
    
    if(!lastCompScores.has(humanId)) {
      // Human skipped HOH - apply -4 penalty
      SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_PENALTIES.HOH_SKIPPED);
      console.info(`[sm-penalty] hohSkipped -4 for player ${humanId}${contextSuffix}`);
    } else {
      // Human participated - determine placement
      const scores = Array.from(lastCompScores.entries());
      const sortedScores = scores.sort((a, b) => b[1] - a[1]); // Sort by score descending
      const humanIndex = sortedScores.findIndex(([id]) => id === humanId);
      const placement = humanIndex + 1;
      const totalParticipants = sortedScores.length;
      
      if(placement === 1) {
        // Winner - already handled by hohWin event (+5)
        // Do nothing additional here
      } else if(placement === 2) {
        // Second place - award +2
        SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_BONUSES.HOH_SECOND);
        console.info(`[sm-event] hohSecond +2 for player ${humanId}${contextSuffix}`);
      } else if(placement === totalParticipants) {
        // Last place - deduct -2
        SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_PENALTIES.HOH_LAST);
        console.info(`[sm-penalty] hohLast -2 for player ${humanId}${contextSuffix}`);
      }
    }
  }
  
  /**
   * Install Object.defineProperty watchers on game properties to trigger immediate bank updates.
   * Watches: hohId, nominees, vetoHolder, vetoUsed, replacementNominee, week
   */
  function installPropertyWatchers() {
    if(!isEnabled()) return;
    
    const g = global.game;
    if(!g) {
      console.warn('[sm-watchers] Cannot install watchers - game object not found');
      return;
    }
    
    // Track which events have been applied this week to prevent double-application
    if(!g.__sm_watcherApplied) g.__sm_watcherApplied = new Map();
    
    console.info('[sm-watchers] Installing property watchers for event-driven bank updates');
    
    // Helper to check if event already applied
    function isEventApplied(week, eventKey) {
      const key = `${week}-${eventKey}`;
      return g.__sm_watcherApplied.has(key);
    }
    
    function markEventApplied(week, eventKey) {
      const key = `${week}-${eventKey}`;
      g.__sm_watcherApplied.set(key, true);
    }
    
    // 1. Watch game.hohId for HOH wins
    let _hohId = g.hohId;
    Object.defineProperty(g, 'hohId', {
      get() { return _hohId; },
      set(newValue) {
        const oldValue = _hohId;
        _hohId = newValue;
        
        if(newValue && newValue !== oldValue) {
          const week = g.week || 1;
          const eventKey = `hoh-${newValue}`;
          
          if(!isEventApplied(week, eventKey)) {
            console.info(`[sm-event] HOH win detected: Player ${newValue} at week ${week}`);
            SocialResources.recordWeeklyEvent(newValue, 'hohWin', true);
            markEventApplied(week, eventKey);
          }
          
          // ENHANCEMENT 2: HOH participation/placement rules
          const humanId = g.humanId;
          const lastCompScores = g.lastCompScores;
          
          if(humanId && lastCompScores) {
            const participationKey = `hoh-participation-${week}`;
            
            if(!isEventApplied(week, participationKey)) {
              applyHOHPlacement(humanId, lastCompScores, week);
              markEventApplied(week, participationKey);
            }
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 2. Watch game.nominees for nominations
    let _nominees = g.nominees || [];
    Object.defineProperty(g, 'nominees', {
      get() { return _nominees; },
      set(newValue) {
        const oldValue = _nominees;
        _nominees = newValue;
        
        if(Array.isArray(newValue)) {
          const week = g.week || 1;
          newValue.forEach(nomineeId => {
            const eventKey = `nominated-${nomineeId}`;
            
            if(!isEventApplied(week, eventKey)) {
              console.info(`[sm-event] Nomination detected: Player ${nomineeId} at week ${week}`);
              SocialResources.recordWeeklyEvent(nomineeId, 'nominated', true);
              markEventApplied(week, eventKey);
            }
          });
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 3. Watch game.vetoHolder for POV wins and participation
    let _vetoHolder = g.vetoHolder;
    Object.defineProperty(g, 'vetoHolder', {
      get() { return _vetoHolder; },
      set(newValue) {
        const oldValue = _vetoHolder;
        _vetoHolder = newValue;
        
        if(newValue && newValue !== oldValue) {
          const week = g.week || 1;
          const eventKey = `pov-${newValue}`;
          
          if(!isEventApplied(week, eventKey)) {
            console.info(`[sm-event] POV win detected: Player ${newValue} at week ${week}`);
            SocialResources.recordWeeklyEvent(newValue, 'povWin', true);
            markEventApplied(week, eventKey);
          }
          
          // POV participation/placement rules for human player
          const humanId = g.humanId;
          const lastCompScores = g.lastCompScores;
          const vetoPlayers = g.__vetoPlayers;
          
          if(humanId && Array.isArray(vetoPlayers)) {
            const participationKey = `pov-participation-${week}`;
            
            if(!isEventApplied(week, participationKey)) {
              // Check if human was drawn for veto
              if(!vetoPlayers.includes(humanId)) {
                // Human was not drawn - penalty already handled by notDrawnVeto
              } else if(!lastCompScores || !lastCompScores.has(humanId)) {
                // Human was drawn but skipped POV - apply -3 penalty
                SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_PENALTIES.POV_SKIPPED);
                console.info(`[sm-penalty] povSkipped -3 for player ${humanId}`);
              } else {
                // Human participated - determine placement among veto players
                const vetoScores = Array.from(lastCompScores.entries())
                  .filter(([id]) => vetoPlayers.includes(id))
                  .sort((a, b) => b[1] - a[1]); // Sort by score descending
                
                const humanIndex = vetoScores.findIndex(([id]) => id === humanId);
                const placement = humanIndex + 1;
                const totalParticipants = vetoScores.length;
                
                if(placement === 1) {
                  // Winner - already handled by povWin event (+3)
                } else if(placement === 2) {
                  // Second place - award +1
                  SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_BONUSES.POV_SECOND);
                  console.info(`[sm-event] povSecond +1 for player ${humanId}`);
                } else if(placement === totalParticipants) {
                  // Last place - deduct -2
                  SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_PENALTIES.POV_LAST);
                  console.info(`[sm-penalty] povLast -2 for player ${humanId}`);
                }
              }
              
              markEventApplied(week, participationKey);
            }
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 4. Watch game.vetoUsed + game.replacementNominee for POV saves
    let _vetoUsed = g.vetoUsed;
    Object.defineProperty(g, 'vetoUsed', {
      get() { return _vetoUsed; },
      set(newValue) {
        _vetoUsed = newValue;
        
        if(newValue === true) {
          // Check if veto saved someone from the block
          const week = g.week || 1;
          const vetoHolderId = g.vetoHolder;
          const replacementId = g.replacementNominee;
          const humanId = g.humanId;
          
          // The veto holder saved someone - check who was saved
          // Logic: if there's a replacement, the original nominee was saved
          if(replacementId && Array.isArray(g.nominees)) {
            // Find who was saved (not in current nominees but was before)
            const originalNominees = g.__sm_preVetoNominees || [];
            const savedPlayers = originalNominees.filter(id => !g.nominees.includes(id) && id !== replacementId);
            
            savedPlayers.forEach(savedId => {
              const eventKey = `saved-pov-${savedId}`;
              
              if(!isEventApplied(week, eventKey)) {
                console.info(`[sm-event] POV save detected: Player ${savedId} at week ${week}`);
                SocialResources.recordWeeklyEvent(savedId, 'savedWithPov', true);
                markEventApplied(week, eventKey);
              }
            });
            
            // Check if veto holder used it on someone other than themselves
            if(vetoHolderId === humanId && savedPlayers.length > 0 && savedPlayers.every(id => id !== humanId)) {
              const eventKey = `pov-used-other-${week}`;
              if(!isEventApplied(week, eventKey)) {
                SocialEnergyBank.adjust(humanId, WEEKLY_ENERGY_BONUSES.POV_USED_OTHER);
                console.info(`[sm-event] povUsedOther +2 for player ${humanId}`);
                markEventApplied(week, eventKey);
              }
            }
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 5. Watch game.week for weekly rollover (+5 base energy)
    let _week = g.week || 1;
    Object.defineProperty(g, 'week', {
      get() { return _week; },
      set(newValue) {
        const oldValue = _week;
        _week = newValue;
        
        if(newValue > oldValue) {
          console.info(`[sm-week] Week rollover detected: ${oldValue} → ${newValue}`);
          
          // Add base weekly energy to all alive players
          const alivePlayers = getAlivePlayers();
          const baseAdd = SocialResources.CONFIG.baseWeeklyAdd;
          
          alivePlayers.forEach(player => {
            const eventKey = `week-rollover-${newValue}`;
            
            if(!isEventApplied(newValue, eventKey)) {
              SocialEnergyBank.adjust(player.id, baseAdd);
              console.info(`[sm-week] +${baseAdd} base added to bank for week=${newValue} for player ${player.id} (${player.name || 'unknown'})`);
            }
          });
          
          // Mark week rollover as applied (once per week)
          markEventApplied(newValue, `week-rollover-${newValue}`);
          
          // Clear weekly event tracker for new week
          if(g.__sm_watcherApplied) {
            // Keep only current week's events
            const keysToDelete = [];
            g.__sm_watcherApplied.forEach((_, key) => {
              const weekMatch = key.match(/^(\d+)-/);
              if(weekMatch && parseInt(weekMatch[1]) < newValue) {
                keysToDelete.push(key);
              }
            });
            keysToDelete.forEach(key => g.__sm_watcherApplied.delete(key));
          }
        }
        
        // ENHANCEMENT 1: Week 1 starter bonus (+5 for human and all alive players)
        if(newValue === 1 && !g.__sm_weekStarterApplied) {
          console.info('[sm-week] Applying week 1 starter bonus');
          const humanId = g.humanId;
          const alivePlayers = getAlivePlayers();
          
          // Grant +5 to human
          if(humanId) {
            SocialEnergyBank.adjust(humanId, 5);
            console.info(`[sm-week] starter +5 applied (week=1) for human player ${humanId}`);
          }
          
          // Grant +5 to all alive players
          alivePlayers.forEach(player => {
            SocialEnergyBank.adjust(player.id, 5);
            console.info(`[sm-week] starter +5 applied (week=1) for player ${player.id} (${player.name || 'unknown'})`);
          });
          
          // Mark as applied to prevent duplicates
          g.__sm_weekStarterApplied = 1;
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 6. Watch game.__vetoPlayers for notDrawnVeto penalty (ENHANCEMENT 3)
    let _vetoPlayers = g.__vetoPlayers;
    Object.defineProperty(g, '__vetoPlayers', {
      get() { return _vetoPlayers; },
      set(newValue) {
        _vetoPlayers = newValue;
        
        // ENHANCEMENT 3: Apply notDrawnVeto penalty for players not drawn
        if(Array.isArray(newValue) && newValue.length > 0) {
          const week = g.week || 1;
          const alivePlayers = getAlivePlayers();
          const drawnPlayerIds = newValue.map(id => +id); // Ensure numeric
          
          // Find players not drawn for veto
          const notDrawn = alivePlayers.filter(p => !drawnPlayerIds.includes(p.id));
          
          notDrawn.forEach(player => {
            const eventKey = `notDrawnVeto-${player.id}`;
            
            if(!isEventApplied(week, eventKey)) {
              // Record weekly event which applies the penalty immediately to bank
              SocialResources.recordWeeklyEvent(player.id, 'notDrawnVeto', true);
              console.info(`[sm-event] notDrawnVeto -1 for player=${player.id} (${player.name || 'unknown'})`);
              markEventApplied(week, eventKey);
            }
          });
        }
      },
      enumerable: true,
      configurable: true
    });
    
    // 7. Watch game.lastCompScores for zeroScore penalty (ENHANCEMENT 4)
    let _lastCompScores = g.lastCompScores;
    Object.defineProperty(g, 'lastCompScores', {
      get() { return _lastCompScores; },
      set(newValue) {
        const oldValue = _lastCompScores;
        _lastCompScores = newValue;
        
        // ENHANCEMENT 4: Apply zeroScore penalty when human scores 0
        if(newValue instanceof Map && newValue.size > 0) {
          const week = g.week || 1;
          const humanId = g.humanId;
          const currentPhase = g.phase;
          
          // Only check during HOH or veto_comp phases
          if(humanId && (currentPhase === 'hoh' || currentPhase === 'veto_comp')) {
            const humanScore = newValue.get(humanId);
            
            if(humanScore !== undefined && humanScore === 0) {
              const eventKey = `zeroScore-${currentPhase}-${week}`;
              
              if(!isEventApplied(week, eventKey)) {
                // Apply zeroScore penalty
                SocialResources.recordWeeklyEvent(humanId, 'zeroScore', true);
                console.info(`[sm-penalty] zeroScore -2 for player=${humanId}`);
                markEventApplied(week, eventKey);
              }
            }
          }
        }
      },
      enumerable: true,
      configurable: true
    });
    
    console.info('[sm-watchers] ✓ Property watchers installed: hohId, nominees, vetoHolder, vetoUsed, week, __vetoPlayers, lastCompScores (with enhancements)');
    
    // ENHANCEMENT 5: Reconciliation - check current values and apply events if needed
    reconcileWatchers();
  }
  
  /**
   * Reconcile watchers by checking current game state and applying events that may have
   * occurred before watchers were installed. Uses idempotence keys to prevent duplicates.
   */
  function reconcileWatchers() {
    if(!isEnabled()) return;
    
    const g = global.game;
    if(!g) return;
    
    console.info('[sm-watchers] 🔄 Reconciling current game state...');
    
    const week = g.week || 1;
    const humanId = g.humanId;
    const alivePlayers = getAlivePlayers();
    
    // Reconcile week 1 starter bonus
    if(week === 1 && !g.__sm_weekStarterApplied) {
      console.info('[sm-week] Reconciliation: Applying week 1 starter bonus');
      
      alivePlayers.forEach(player => {
        SocialEnergyBank.adjust(player.id, 5);
        console.info(`[sm-week] starter +5 applied (week=1) for player ${player.id} (${player.name || 'unknown'})`);
      });
      
      g.__sm_weekStarterApplied = 1;
    }
    
    // Helper to check if event already applied (local version for reconciliation)
    function isEventApplied(week, eventKey) {
      const key = `${week}-${eventKey}`;
      return g.__sm_watcherApplied.has(key);
    }
    
    function markEventApplied(week, eventKey) {
      const key = `${week}-${eventKey}`;
      g.__sm_watcherApplied.set(key, true);
    }
    
    // Reconcile HOH winner
    if(g.hohId) {
      const eventKey = `hoh-${g.hohId}`;
      if(!isEventApplied(week, eventKey)) {
        console.info(`[sm-event] Reconciliation: HOH win detected for player ${g.hohId}`);
        SocialResources.recordWeeklyEvent(g.hohId, 'hohWin', true);
        markEventApplied(week, eventKey);
      }
      
      // Reconcile HOH placement for human
      if(humanId && g.lastCompScores) {
        const participationKey = `hoh-participation-${week}`;
        if(!isEventApplied(week, participationKey)) {
          applyHOHPlacement(humanId, g.lastCompScores, week, 'reconciliation');
          markEventApplied(week, participationKey);
        }
      }
    }
    
    // Reconcile nominees
    if(Array.isArray(g.nominees)) {
      g.nominees.forEach(nomineeId => {
        const eventKey = `nominated-${nomineeId}`;
        if(!isEventApplied(week, eventKey)) {
          console.info(`[sm-event] Reconciliation: Nomination detected for player ${nomineeId}`);
          SocialResources.recordWeeklyEvent(nomineeId, 'nominated', true);
          markEventApplied(week, eventKey);
        }
      });
    }
    
    // Reconcile veto holder
    if(g.vetoHolder) {
      const eventKey = `pov-${g.vetoHolder}`;
      if(!isEventApplied(week, eventKey)) {
        console.info(`[sm-event] Reconciliation: POV win detected for player ${g.vetoHolder}`);
        SocialResources.recordWeeklyEvent(g.vetoHolder, 'povWin', true);
        markEventApplied(week, eventKey);
      }
    }
    
    // Reconcile veto players (notDrawnVeto)
    if(Array.isArray(g.__vetoPlayers) && g.__vetoPlayers.length > 0) {
      const drawnPlayerIds = g.__vetoPlayers.map(id => +id);
      const notDrawn = alivePlayers.filter(p => !drawnPlayerIds.includes(p.id));
      
      notDrawn.forEach(player => {
        const eventKey = `notDrawnVeto-${player.id}`;
        if(!isEventApplied(week, eventKey)) {
          SocialResources.recordWeeklyEvent(player.id, 'notDrawnVeto', true);
          console.info(`[sm-event] notDrawnVeto -1 for player=${player.id} (reconciliation)`);
          markEventApplied(week, eventKey);
        }
      });
    }
    
    // Reconcile zero scores
    if(g.lastCompScores instanceof Map) {
      const currentPhase = g.phase;
      if(humanId && (currentPhase === 'hoh' || currentPhase === 'veto_comp')) {
        const humanScore = g.lastCompScores.get(humanId);
        if(humanScore !== undefined && humanScore === 0) {
          const eventKey = `zeroScore-${currentPhase}-${week}`;
          if(!isEventApplied(week, eventKey)) {
            SocialResources.recordWeeklyEvent(humanId, 'zeroScore', true);
            console.info(`[sm-penalty] zeroScore -2 for player=${humanId} (reconciliation)`);
            markEventApplied(week, eventKey);
          }
        }
      }
    }
    
    console.info('[sm-watchers] ✓ Reconciliation complete');
  }
  
  // Helper to track pre-veto nominees for save detection
  function trackPreVetoNominees() {
    const g = global.game;
    if(!g) return;
    
    // Store current nominees before veto is used
    if(Array.isArray(g.nominees)) {
      g.__sm_preVetoNominees = [...g.nominees];
    }
  }
  
  // Install watchers on module load
  try {
    installPropertyWatchers();
  } catch(e) {
    console.error('[sm-watchers] Failed to install property watchers:', e);
  }
  
  // ============================================================================
  // AUTO-SKIP WHEN ENERGY IS ZERO
  // ============================================================================
  function showEmptyEnergyOverlayAndSkip(playerId) {
    const g = global.game;
    const week = g?.week || 1;
    
    console.info(`[sm-phase-skip] Showing empty energy overlay for player ${playerId}, week ${week}`);
    
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sm-empty-energy-overlay';
    overlay.setAttribute('role', 'alert');
    overlay.setAttribute('aria-live', 'polite');
    overlay.setAttribute('aria-label', 'No Social Energy Available');
    
    overlay.innerHTML = `
      <div class="sm-empty-energy-content">
        <div class="sm-empty-battery-icon">🔋</div>
        <div class="sm-empty-energy-message">No Social Energy</div>
        <div class="sm-empty-energy-submessage">Skipping Social Phase...</div>
      </div>
    `;
    
    // Add to TV viewport or panel
    const container = document.querySelector('.tvViewport .fitCanvas') 
                   || document.querySelector('.tvViewport')
                   || document.getElementById('panel')
                   || document.body;
    container.appendChild(overlay);
    
    // Dispatch event for telemetry
    window.dispatchEvent(new CustomEvent('sm-phase-skip-empty', {
      detail: { playerId, week }
    }));
    
    console.info(`[sm-phase-skip] Event dispatched: sm-phase-skip-empty`, { playerId, week });
    
    // Auto-advance after 3 seconds
    setTimeout(() => {
      overlay.remove();
      console.info(`[sm-phase-skip] Auto-advancing to next phase`);
      
      // Advance to next phase
      if (typeof global.advancePhase === 'function') {
        global.advancePhase();
      } else if (typeof global.nextPhase === 'function') {
        global.nextPhase();
      } else {
        console.warn('[sm-phase-skip] No advancePhase or nextPhase function available');
      }
    }, 3000);
  }
  
  function onSocialPhaseStart(){
    if(!isEnabled()){ console.info('[social-maneuvers] Phase start called but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ▶️ onSocialPhaseStart() - entering social_intermission phase');
    const alivePlayers = getAlivePlayers();
    const humanId = global.game?.humanId;
    
    // Check if human player is evicted - skip social phase if they are
    const humanPlayer = global.getP?.(humanId);
    if(humanPlayer && humanPlayer.evicted){
      console.info('[social-maneuvers] ⏭️ Human player is evicted - skipping social phase');
      return;
    }
    
    // Initialize highlights tracking
    if(typeof global.SocialHighlights?.onPhaseStart === 'function'){
      global.SocialHighlights.onPhaseStart();
    }
    
    // Initialize resources for all alive players
    alivePlayers.forEach(p => { 
      SocialResources.init(p.id);
    });
    console.info(`[social-maneuvers] ✓ Resources initialized for ${alivePlayers.length} players`);
    
    // Reset weekly for all alive players (applies weekly housekeeping - influence decay, event tracker reset)
    alivePlayers.forEach(p => {
      SocialResources.resetWeekly(p.id);
    });
    
    // BANK-BASED SEEDING: Seed phase energy strictly from bank for all players
    alivePlayers.forEach(p => {
      SocialResources.recomputePhaseEnergy(p.id);
    });
    
    // Clear phase refunds for new phase
    SocialResources.clearPhaseRefunds();
    console.info('[social-maneuvers] Phase refunds cleared for new phase');

    // Log bank-based seeding for human player
    if(humanId) {
      const bankBalance = SocialEnergyBank.get(humanId);
      const phaseEnergy = SocialResources.get(humanId, 'energy');
      console.info(`[sm-phase] seeded from bank=${bankBalance}, phase energy=${phaseEnergy}`);
      
      // AUTO-SKIP: If human has zero energy, show overlay and skip phase
      if(phaseEnergy <= 0) {
        console.info(`[sm-phase-skip] Human player has zero energy (${phaseEnergy}) - triggering auto-skip`);
        
        // Run AI burst during the 3s overlay before skip
        if(typeof global.SocialAIScheduler?.runEmptyEnergyBurst === 'function'){
          setTimeout(() => {
            global.SocialAIScheduler.runEmptyEnergyBurst();
          }, 100); // Start burst quickly, completes before 3s overlay ends
        }
        
        showEmptyEnergyOverlayAndSkip(humanId);
        return; // Exit early, don't set up normal phase
      }
    }

    // Initialize phase session tracking (PR #266)
    const g = global.game;
    if(!g.__socialManeuversSession){
      g.__socialManeuversSession = {
        startTime: Date.now(),
        week: g.week || 1,
        actionsThisPhase: [],
        energySpent: new Map(),
        informationSpent: new Map(),
        relationshipDeltas: new Map()
      };
    } else {
      // Reset for new phase
      g.__socialManeuversSession.startTime = Date.now();
      g.__socialManeuversSession.week = g.week || 1;
      g.__socialManeuversSession.actionsThisPhase = [];
      g.__socialManeuversSession.energySpent.clear();
      g.__socialManeuversSession.informationSpent.clear();
      g.__socialManeuversSession.relationshipDeltas.clear();
    }

    // Initialize energy spent tracking
    alivePlayers.forEach(p => {
      g.__socialManeuversSession.energySpent.set(p.id, 0);
      g.__socialManeuversSession.informationSpent.set(p.id, 0);
    });
    console.info(`[social-maneuvers] Session tracking initialized for end-of-phase summary`);

    // Clear any pending fast-advance timeout
    if(g.__socialFastAdvanceTimeout){
      clearTimeout(g.__socialFastAdvanceTimeout);
      g.__socialFastAdvanceTimeout = null;
    }

    // Set default 3-minute timer using available APIs
    console.info('[social-timer] Setting default phase duration...');
    const defaultDurationMs = 180000; // 3 minutes = 180 seconds = 180000ms
    
    // Try multiple timer APIs in order of preference
    let timerSet = false;

    // API 1: setPhaseDurationMs (most direct if available)
    if(typeof global.setPhaseDurationMs === 'function'){
      try{
        global.setPhaseDurationMs(defaultDurationMs);
        console.info('[social-timer] ✓ Timer set to 180000ms (3 minutes) via setPhaseDurationMs');
        timerSet = true;
      }catch(e){
        console.warn('[social-maneuvers] setPhaseDurationMs failed:', e);
      }
    }

    // API 2: GameTimer.setRemainingMs
    if(!timerSet && typeof global.GameTimer?.setRemainingMs === 'function'){
      try{
        global.GameTimer.setRemainingMs(defaultDurationMs);
        console.info('[social-timer] ✓ Timer set to 180000ms (3 minutes) via GameTimer.setRemainingMs');
        timerSet = true;
      }catch(e){
        console.warn('[social-maneuvers] GameTimer.setRemainingMs failed:', e);
      }
    }

    // API 3: Direct game.endAt manipulation (deadline fallback)
    if(!timerSet && g){
      try{
        const now = Date.now();
        g.endAt = now + defaultDurationMs;
        g.phaseEndsAt = now + defaultDurationMs;
        console.info('[social-timer] ✓ Timer set to 180000ms (3 minutes) via game.endAt fallback');
        timerSet = true;
      }catch(e){
        console.warn('[social-maneuvers] game.endAt fallback failed:', e);
      }
    }

    if(!timerSet){
      console.warn('[social-maneuvers] ⚠️ Could not set timer - no available API found');
    }
    
    // Start AI social scheduler
    if(typeof global.SocialAIScheduler?.startAiSocialPhase === 'function'){
      const g = global.game;
      global.SocialAIScheduler.startAiSocialPhase({
        week: g?.week || 1,
        durationMs: defaultDurationMs,
        humanId
      });
    }
  }
  
  function onSocialPhaseEnd(){
    if(!isEnabled()) { console.info('[social-maneuvers] Phase end called but feature is DISABLED'); return; }
    console.info('[social-maneuvers] ◼️ onSocialPhaseEnd() - leaving social_intermission phase');
    console.info('[social-maneuvers] ✓ Social phase complete - generating summary');
    
    // Stop AI social scheduler
    if(typeof global.SocialAIScheduler?.stopAiSocialPhase === 'function'){
      global.SocialAIScheduler.stopAiSocialPhase();
    }
    
    // Render highlights before other cleanup
    if(typeof global.SocialHighlights?.onPhaseEnd === 'function'){
      global.SocialHighlights.onPhaseEnd();
    }

    // Clear any pending fast-advance timeout on phase end
    const g = global.game;
    if(g?.__socialFastAdvanceTimeout){
      clearTimeout(g.__socialFastAdvanceTimeout);
      g.__socialFastAdvanceTimeout = null;
      console.info('[social-maneuvers] Cleared pending fast-advance timeout');
    }
    
    // SYNC LEFTOVER ENERGY TO BANK: Update bank with remaining in-phase energy
    const alivePlayers = global.alivePlayers?.() || [];
    alivePlayers.forEach(player => {
      const currentEnergy = SocialResources.get(player.id, 'energy');
      const currentBank = SocialEnergyBank.get(player.id);
      
      // Sync: set bank to current in-phase energy (reflects spending during phase)
      if(currentEnergy !== currentBank) {
        SocialEnergyBank.set(player.id, currentEnergy);
        console.info(`[sm-phase] Synced leftover energy to bank for player ${player.id}: ${currentEnergy}`);
      }
    });
    
    // Finalize week for all players - compute next week seeds with unlimited carryover
    SocialResources.finalizeWeekForAll();
    
    // Generate summary data (PR #266)
    const summary = generatePhaseSummary();
    
    // Export to session log
    exportSessionLog(summary);
    
    // Log to DevTools console
    logToConsole(summary);
    
    // Show UI summary panel
    showSummaryPanel(summary);
  }

  // ============================================================================
  // SUMMARY & TELEMETRY (PR #266)
  // ============================================================================

  function generatePhaseSummary(){
    const g = global.game;
    const session = g?.__socialManeuversSession;
    
    if(!session){
      console.warn('[social-maneuvers] No session data to summarize');
      return null;
    }

    const alivePlayers = global.alivePlayers?.() || [];
    const summary = {
      metadata: {
        week: session.week,
        startTime: session.startTime,
        endTime: Date.now(),
        duration: Date.now() - session.startTime,
        playersCount: alivePlayers.length
      },
      resources: {
        energySpent: {},
        energyRemaining: {},
        informationSpent: {} // PR #265 integration
      },
      actions: {
        total: session.actionsThisPhase.length,
        byPlayer: {},
        byCategory: {},
        list: session.actionsThisPhase
      },
      relationships: {
        changes: [],
        newAlliances: [],
        newRivalries: []
      },
      memories: {
        created: session.actionsThisPhase.length,
        total: g.__socialManeuversMemory?.actions?.length || 0
      }
    };

    // Aggregate energy and information data
    alivePlayers.forEach(p => {
      const energySpent = session.energySpent.get(p.id) || 0;
      const infoSpent = session.informationSpent.get(p.id) || 0;
      const energyRemaining = SocialResources.get(p.id, 'energy');
      const infoRemaining = SocialResources.get(p.id, 'information');
      
      summary.resources.energySpent[p.name || p.id] = energySpent;
      summary.resources.energyRemaining[p.name || p.id] = energyRemaining;
      summary.resources.informationSpent[p.name || p.id] = infoSpent;
    });

    // Aggregate actions by player and category
    session.actionsThisPhase.forEach(action => {
      // By player
      if(!summary.actions.byPlayer[action.actorName]){
        summary.actions.byPlayer[action.actorName] = 0;
      }
      summary.actions.byPlayer[action.actorName]++;

      // By category
      if(!summary.actions.byCategory[action.actionCategory]){
        summary.actions.byCategory[action.actionCategory] = 0;
      }
      summary.actions.byCategory[action.actionCategory]++;
    });

    // Analyze relationship changes
    session.relationshipDeltas.forEach((delta, key) => {
      const [actorId, targetId] = key.split('-').map(Number);
      const actor = global.getP?.(actorId);
      const target = global.getP?.(targetId);
      
      if(actor && target){
        const change = {
          actor: actor.name || actorId,
          target: target.name || targetId,
          delta: delta,
          newAffinity: actor.affinity?.[targetId] ?? 0,
          state: getRelationshipState(actor.affinity?.[targetId] ?? 0)
        };
        
        summary.relationships.changes.push(change);

        // Check for new alliances (crossed threshold)
        const newAffinity = actor.affinity?.[targetId] ?? 0;
        if(newAffinity >= 0.28 && (newAffinity - delta) < 0.28){
          summary.relationships.newAlliances.push({
            player1: actor.name || actorId,
            player2: target.name || targetId,
            affinity: newAffinity
          });
        }

        // Check for new rivalries
        if(newAffinity <= -0.28 && (newAffinity - delta) > -0.28){
          summary.relationships.newRivalries.push({
            player1: actor.name || actorId,
            player2: target.name || targetId,
            affinity: newAffinity
          });
        }
      }
    });

    return summary;
  }

  function getRelationshipState(affinity){
    const a = affinity ?? 0;
    if(a >= 0.65) return 'Romance/Bromance';
    if(a >= 0.48) return 'Ride or Die';
    if(a >= 0.28) return 'Allies';
    if(a >= 0.12) return 'Friendly';
    if(a >= -0.12) return 'Neutral';
    if(a >= -0.28) return 'Strained';
    if(a >= -0.48) return 'Enemies';
    return 'Arch Enemies';
  }

  function exportSessionLog(summary){
    if(!summary) return;

    const g = global.game;
    if(!g.__socialManeuversSessionLogs){
      g.__socialManeuversSessionLogs = [];
    }

    // Add to session logs
    g.__socialManeuversSessionLogs.push(summary);

    // Keep only last 20 sessions to prevent memory bloat
    if(g.__socialManeuversSessionLogs.length > 20){
      g.__socialManeuversSessionLogs.shift();
    }

    // Export to JSON for download (optional)
    try {
      const jsonStr = JSON.stringify(summary, null, 2);
      console.info('[social-maneuvers] Session log exported (available in game.__socialManeuversSessionLogs)');
      
      // Store latest summary for easy access
      g.__latestSocialSummary = summary;
      g.__latestSocialSummaryJSON = jsonStr;
    } catch(e) {
      console.error('[social-maneuvers] Failed to serialize summary:', e);
    }
  }

  function logToConsole(summary){
    if(!summary) return;

    console.group('🎭 Social Maneuvers Phase Summary');
    
    // Metadata
    console.log('%c📊 Phase Overview', 'font-weight: bold; color: #3498db');
    console.table({
      Week: summary.metadata.week,
      Duration: `${(summary.metadata.duration / 1000).toFixed(1)}s`,
      Players: summary.metadata.playersCount,
      'Total Actions': summary.actions.total,
      'Memories Created': summary.memories.created
    });

    // Resources
    if(Object.keys(summary.resources.energySpent).length > 0){
      console.log('%c⚡ Energy Report', 'font-weight: bold; color: #f39c12');
      console.table(summary.resources.energySpent);
      
      // Also show information if any was spent (PR #265 integration)
      const totalInfoSpent = Object.values(summary.resources.informationSpent || {}).reduce((a,b) => a+b, 0);
      if(totalInfoSpent > 0){
        console.log('%c🔍 Information Report', 'font-weight: bold; color: #9b59b6');
        console.table(summary.resources.informationSpent);
      }
    }

    // Actions by category
    if(Object.keys(summary.actions.byCategory).length > 0){
      console.log('%c🎯 Actions by Category', 'font-weight: bold; color: #9b59b6');
      console.table(summary.actions.byCategory);
    }

    // Actions by player
    if(Object.keys(summary.actions.byPlayer).length > 0){
      console.log('%c👥 Actions by Player', 'font-weight: bold; color: #2ecc71');
      console.table(summary.actions.byPlayer);
    }

    // Relationship changes
    if(summary.relationships.changes.length > 0){
      console.log('%c💕 Relationship Changes', 'font-weight: bold; color: #e74c3c');
      console.table(summary.relationships.changes.map(c => ({
        'From': c.actor,
        'To': c.target,
        'Delta': c.delta.toFixed(3),
        'New Affinity': c.newAffinity.toFixed(3),
        'Status': c.state
      })));
    }

    // New alliances
    if(summary.relationships.newAlliances.length > 0){
      console.log('%c🤝 New Alliances Formed', 'font-weight: bold; color: #27ae60');
      console.table(summary.relationships.newAlliances);
    }

    // New rivalries
    if(summary.relationships.newRivalries.length > 0){
      console.log('%c⚔️ New Rivalries Formed', 'font-weight: bold; color: #c0392b');
      console.table(summary.relationships.newRivalries);
    }

    // Action details
    if(summary.actions.list.length > 0){
      console.log('%c📝 Action Details', 'font-weight: bold; color: #16a085');
      console.table(summary.actions.list.map(a => ({
        Time: new Date(a.timestamp).toLocaleTimeString(),
        Actor: a.actorName,
        Action: a.actionLabel,
        Target: a.targetName,
        Category: a.actionCategory,
        'Energy Cost': a.energyCost,
        'Info Cost': a.informationCost || 0,
        Outcome: a.outcome,
        'Affinity Δ': a.affinityDelta?.toFixed(3) || '0.000'
      })));
    }

    console.log('%c💾 Access full data:', 'font-weight: bold; color: #95a5a6');
    console.log('  game.__latestSocialSummary (object)');
    console.log('  game.__latestSocialSummaryJSON (JSON string)');
    console.log('  game.__socialManeuversSessionLogs (all sessions)');
    
    console.groupEnd();
  }

  function showSummaryPanel(summary){
    if(!summary) return;

    // Create summary card UI
    const deck = document.getElementById('decisionDeck') || createSummaryDeck();
    
    const card = document.createElement('div');
    card.className = 'revealCard social-summary-card';
    card.style.cssText = 'max-width: 680px; pointer-events: auto;';

    const header = document.createElement('h3');
    header.textContent = '🎭 Social Phase Complete';
    header.style.cssText = 'margin: 0 0 1em; text-align: center;';
    card.appendChild(header);

    // Summary content
    const content = document.createElement('div');
    content.className = 'social-summary-content';
    content.style.cssText = 'font-size: 0.9rem; line-height: 1.6;';

    // Energy spent
    const totalEnergySpent = Object.values(summary.resources.energySpent).reduce((a,b) => a+b, 0);
    const totalInfoSpent = Object.values(summary.resources.informationSpent || {}).reduce((a,b) => a+b, 0);
    
    if(totalEnergySpent > 0 || totalInfoSpent > 0){
      const energyLine = document.createElement('div');
      let resourceText = `<strong>⚡ Energy:</strong> ${totalEnergySpent} spent`;
      if(totalInfoSpent > 0){
        resourceText += ` | <strong>🔍 Information:</strong> ${totalInfoSpent} spent`;
      }
      resourceText += ` across ${summary.actions.total} action${summary.actions.total !== 1 ? 's' : ''}`;
      energyLine.innerHTML = resourceText;
      content.appendChild(energyLine);
    }

    // Actions summary
    if(summary.actions.total > 0){
      const actionsLine = document.createElement('div');
      actionsLine.style.marginTop = '0.5em';
      const categories = Object.entries(summary.actions.byCategory)
        .map(([cat, count]) => `${count} ${cat}`)
        .join(', ');
      actionsLine.innerHTML = `<strong>🎯 Actions:</strong> ${categories}`;
      content.appendChild(actionsLine);
    }

    // Relationship changes
    if(summary.relationships.changes.length > 0){
      const relLine = document.createElement('div');
      relLine.style.marginTop = '0.5em';
      const significantChanges = summary.relationships.changes.filter(c => Math.abs(c.delta) > 0.1);
      relLine.innerHTML = `<strong>💕 Relationships:</strong> ${significantChanges.length} significant change${significantChanges.length !== 1 ? 's' : ''}`;
      content.appendChild(relLine);
    }

    // New alliances
    if(summary.relationships.newAlliances.length > 0){
      const allianceLine = document.createElement('div');
      allianceLine.style.cssText = 'margin-top: 0.5em; color: #27ae60; font-weight: 600;';
      const allianceNames = summary.relationships.newAlliances.map(a => 
        `${a.player1} & ${a.player2}`
      ).join(', ');
      allianceLine.innerHTML = `<strong>🤝 New Alliance${summary.relationships.newAlliances.length !== 1 ? 's' : ''}:</strong> ${allianceNames}`;
      content.appendChild(allianceLine);
    }

    // New rivalries
    if(summary.relationships.newRivalries.length > 0){
      const rivalryLine = document.createElement('div');
      rivalryLine.style.cssText = 'margin-top: 0.5em; color: #e74c3c; font-weight: 600;';
      const rivalryNames = summary.relationships.newRivalries.map(r => 
        `${r.player1} vs ${r.player2}`
      ).join(', ');
      rivalryLine.innerHTML = `<strong>⚔️ New Rivalry${summary.relationships.newRivalries.length !== 1 ? 's' : ''}:</strong> ${rivalryNames}`;
      content.appendChild(rivalryLine);
    }

    // Memories
    const memoryLine = document.createElement('div');
    memoryLine.style.marginTop = '0.5em';
    memoryLine.innerHTML = `<strong>💭 Memories:</strong> ${summary.memories.created} new, ${summary.memories.total} total`;
    content.appendChild(memoryLine);

    card.appendChild(content);

    // Buttons
    const buttonBar = document.createElement('div');
    buttonBar.style.cssText = 'display: flex; gap: 8px; margin-top: 1.5em; justify-content: center; flex-wrap: wrap;';

    // Details button
    const detailsBtn = document.createElement('button');
    detailsBtn.className = 'btn small';
    detailsBtn.textContent = 'Details';
    detailsBtn.onclick = () => showDetailedSummary(summary);
    buttonBar.appendChild(detailsBtn);

    // Continue button
    const continueBtn = document.createElement('button');
    continueBtn.className = 'btn small';
    continueBtn.textContent = 'Continue';
    continueBtn.style.cssText = 'background: var(--accent, #3498db);';
    continueBtn.onclick = () => {
      card.style.animation = 'popOut 0.4s ease forwards';
      setTimeout(() => {
        card.remove();
        if(deck && deck.childElementCount === 0){
          deck.remove();
        }
      }, 400);
    };
    buttonBar.appendChild(continueBtn);

    card.appendChild(buttonBar);

    // Clear deck and add card
    deck.innerHTML = '';
    deck.appendChild(card);
    card.style.animation = 'popIn 0.45s ease forwards';
  }

  function createSummaryDeck(){
    let deck = document.getElementById('decisionDeck');
    if(deck) return deck;
    
    const tv = document.getElementById('tv') || document.querySelector('.tv') || document.body;
    deck = document.createElement('div');
    deck.id = 'decisionDeck';
    deck.style.cssText = 'position:absolute;inset:var(--tv-safe-top,10%) var(--tv-safe-x,5%) var(--tv-safe-bottom,10%) var(--tv-safe-x,5%);display:grid;place-items:center;gap:8px;z-index:12;pointer-events:none;';
    tv.appendChild(deck);
    return deck;
  }

  function showDetailedSummary(summary){
    // Create detailed modal
    const modal = document.createElement('div');
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(8px);';
    
    const panel = document.createElement('div');
    panel.className = 'revealCard';
    panel.style.cssText = 'max-width:800px;max-height:80vh;overflow-y:auto;width:100%;';

    const header = document.createElement('h3');
    header.textContent = '📊 Detailed Social Phase Report';
    header.style.textAlign = 'center';
    panel.appendChild(header);

    const detailContent = document.createElement('div');
    detailContent.style.cssText = 'font-size:0.85rem;line-height:1.5;';

    // Build detailed content (with PR #265 integration - information costs)
    const totalInfoSpent = Object.values(summary.resources.informationSpent || {}).reduce((a,b) => a+b, 0);
    
    detailContent.innerHTML = `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#3498db;margin:0.5em 0;">Phase Overview</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          <div><strong>Week:</strong> ${summary.metadata.week}</div>
          <div><strong>Duration:</strong> ${(summary.metadata.duration/1000).toFixed(1)}s</div>
          <div><strong>Players:</strong> ${summary.metadata.playersCount}</div>
          <div><strong>Total Actions:</strong> ${summary.actions.total}</div>
        </div>
      </div>

      ${Object.keys(summary.resources.energySpent).length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#f39c12;margin:0.5em 0;">⚡ Energy Spent</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          ${Object.entries(summary.resources.energySpent).map(([name, spent]) => 
            `<div><strong>${name}:</strong> ${spent} (${summary.resources.energyRemaining[name]} remaining)</div>`
          ).join('')}
        </div>
      </div>` : ''}

      ${totalInfoSpent > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#9b59b6;margin:0.5em 0;">🔍 Information Spent</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          ${Object.entries(summary.resources.informationSpent).filter(([_,v]) => v > 0).map(([name, spent]) => 
            `<div><strong>${name}:</strong> ${spent}</div>`
          ).join('')}
        </div>
      </div>` : ''}

      ${summary.relationships.changes.length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#e74c3c;margin:0.5em 0;">💕 Relationship Changes</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;">
          ${summary.relationships.changes.map(c => 
            `<div style="margin:4px 0;">
              <strong>${c.actor} → ${c.target}:</strong> 
              ${c.delta >= 0 ? '+' : ''}${c.delta.toFixed(3)} 
              (${c.state}, ${c.newAffinity.toFixed(3)})
            </div>`
          ).join('')}
        </div>
      </div>` : ''}

      ${summary.actions.list.length > 0 ? `
      <div style="margin-bottom:1.5em;">
        <h4 style="color:#16a085;margin:0.5em 0;">📝 Action Log</h4>
        <div style="background:rgba(255,255,255,0.05);padding:10px;border-radius:4px;max-height:300px;overflow-y:auto;">
          ${summary.actions.list.map(a => 
            `<div style="margin:6px 0;padding:6px;background:rgba(0,0,0,0.2);border-radius:3px;font-size:0.8rem;">
              <div><strong>${new Date(a.timestamp).toLocaleTimeString()}</strong> - ${a.actorName} → ${a.targetName}</div>
              <div style="color:#95a5a6;margin-top:2px;">
                ${a.actionLabel} (${a.actionCategory}, ⚡${a.energyCost}${a.informationCost ? ` 🔍${a.informationCost}` : ''}) 
                → ${a.outcome} 
                (Δ ${a.affinityDelta >= 0 ? '+' : ''}${(a.affinityDelta || 0).toFixed(3)})
              </div>
            </div>`
          ).join('')}
        </div>
      </div>` : ''}

      <div style="margin-top:1em;padding:10px;background:rgba(52,152,219,0.2);border-radius:4px;font-size:0.75rem;color:#95a5a6;">
        <strong>💾 Developer Access:</strong><br>
        • <code>game.__latestSocialSummary</code> (object)<br>
        • <code>game.__latestSocialSummaryJSON</code> (JSON string)<br>
        • <code>game.__socialManeuversSessionLogs</code> (history)<br>
        • <code>game.__socialManeuversTelemetry</code> (PR #265 telemetry)
      </div>
    `;

    panel.appendChild(detailContent);

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn small';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText = 'display:block;margin:1em auto 0;';
    closeBtn.onclick = () => modal.remove();
    panel.appendChild(closeBtn);

    modal.appendChild(panel);
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.onclick = (e) => {
      if(e.target === modal) modal.remove();
    };
  }

  // ============================================================================
  // GLOBAL EXPORTS
  // ============================================================================
  global.SocialManeuvers = {
    isEnabled, SocialResources, SocialEnergyBank, // New uncapped energy storage system
    getActionById, getAvailableActions, executeAction,
    computeActionCost, // Unified cost calculator (single source of truth)
    recordActionInMemory, getPlayerMemory,
    renderSocialManeuversUI, onSocialPhaseStart, onSocialPhaseEnd,
    pausePhaseTimer, resumePhaseTimer, // Timer control exports
    recordCompetitionParticipation, // Skip watcher integration
    trackPreVetoNominees, // Pre-veto tracking for save detection
    installPropertyWatchers, // Manual watcher installation if needed
    // Modifiers/hooks
    calculateTraitModifiers, calculateMemoryModifiers,
    // Constants
    DEFAULT_ENERGY, SOCIAL_ACTIONS, RESOURCE_CONFIG, SM_BANK_CONFIG,
    WEEKLY_ENERGY_BONUSES, WEEKLY_ENERGY_PENALTIES,
    INFLUENCE_DELTAS, INFORMATION_EARNINGS, INFORMATION_COSTS
  };
  global.SocialManager = global.SocialManeuvers;
  Object.defineProperty(global, 'USE_SOCIAL_MANEUVERS', {
    get: function() { return isEnabled(); },
    set: function(value) {
      initDefaultFlag();
      const oldValue = global.game.cfg.enableSocialManeuvers;
      global.game.cfg.enableSocialManeuvers = !!value;
      const newValue = global.game.cfg.enableSocialManeuvers;
      console.info(`[social-maneuvers] Flag changed: ${oldValue} → ${newValue} (USE_SOCIAL_MANEUVERS=${newValue})`);
    },
    enumerable: true, configurable: true
  });

  // ============================================================================
  // DEV HELPERS (dev build only)
  // ============================================================================
  if(!global.__smDebug) {
    global.__smDebug = {
      grantEnergy(playerId, amount) {
        SocialResources.earn(playerId, { energy: amount });
        console.info(`[__smDebug] Granted ${amount} energy to player ${playerId}`);
        return SocialResources.get(playerId, 'energy');
      },
      grantInfluence(actorId, targetId, amount) {
        SocialResources.adjustInfluence(actorId, targetId, amount);
        console.info(`[__smDebug] Granted ${amount} influence from ${actorId} to ${targetId}`);
        return SocialResources.getInfluence(actorId, targetId);
      },
      grantInformation(playerId, amount) {
        SocialResources.earn(playerId, { information: amount });
        console.info(`[__smDebug] Granted ${amount} information to player ${playerId}`);
        return SocialResources.get(playerId, 'information');
      },
      setEnergy(playerId, amount) {
        SocialResources.set(playerId, 'energy', amount);
        console.info(`[__smDebug] Set energy to ${amount} for player ${playerId}`);
        return SocialResources.get(playerId, 'energy');
      },
      setInfluence(actorId, targetId, amount) {
        SocialResources.setInfluence(actorId, targetId, amount);
        console.info(`[__smDebug] Set influence from ${actorId} to ${targetId} to ${amount}`);
        return SocialResources.getInfluence(actorId, targetId);
      },
      setInformation(playerId, amount) {
        SocialResources.set(playerId, 'information', amount);
        console.info(`[__smDebug] Set information to ${amount} for player ${playerId}`);
        return SocialResources.get(playerId, 'information');
      },
      recordWeeklyEvent(playerId, eventType, value = true) {
        SocialResources.recordWeeklyEvent(playerId, eventType, value);
        console.info(`[__smDebug] Recorded weekly event: ${playerId} - ${eventType}`, value);
      },
      getResources(playerId) {
        const resources = SocialResources.getAll(playerId);
        console.info(`[__smDebug] Resources for player ${playerId}:`, resources);
        return resources;
      },
      getInfluence(actorId, targetId) {
        const influence = SocialResources.getInfluence(actorId, targetId);
        console.info(`[__smDebug] Influence from ${actorId} to ${targetId}: ${influence.toFixed(1)}`);
        return influence;
      },
      showAllInfluence() {
        const g = global.game;
        if(!g?.__pairwiseInfluence) {
          console.info('[__smDebug] No pairwise influence data');
          return;
        }
        console.table(Array.from(g.__pairwiseInfluence.entries()).map(([key, value]) => ({
          pair: key,
          influence: value.toFixed(1)
        })));
      },
      clearWeeklyEvents(playerId) {
        const g = global.game;
        if(g?.__weeklyEvents) {
          g.__weeklyEvents.delete(playerId);
          console.info(`[__smDebug] Cleared weekly events for player ${playerId}`);
        }
      },
      getBank(playerId) {
        const balance = SocialEnergyBank.get(playerId);
        console.info(`[__smDebug] Bank balance for player ${playerId}: ${balance}`);
        return balance;
      },
      setBank(playerId, amount) {
        const newBalance = SocialEnergyBank.set(playerId, amount);
        console.info(`[__smDebug] Set bank for player ${playerId} to ${newBalance}`);
        return newBalance;
      },
      adjustBank(playerId, delta) {
        const newBalance = SocialEnergyBank.adjust(playerId, delta);
        console.info(`[__smDebug] Adjusted bank for player ${playerId} by ${delta} = ${newBalance}`);
        return newBalance;
      },
      showAllBanks() {
        const g = global.game;
        if(!g?.__sm_bankEnergy) {
          console.info('[__smDebug] No bank data');
          return;
        }
        const alivePlayers = global.alivePlayers?.() || [];
        console.table(alivePlayers.map(p => ({
          id: p.id,
          name: p.name || 'Unknown',
          bank: SocialEnergyBank.get(p.id),
          currentEnergy: SocialResources.get(p.id, 'energy')
        })));
      }
    };
    console.info('[social-maneuvers] ✓ Dev helpers available at window.__smDebug');
    console.info('[social-maneuvers] Available commands: grantEnergy, grantInfluence, grantInformation, setEnergy, setInfluence, setInformation, recordWeeklyEvent, getResources, getInfluence, showAllInfluence, getBank, setBank, adjustBank, showAllBanks');
  }

  initDefaultFlag();
  console.info('[social-maneuvers] ✓ Module loaded successfully');
  console.info('[social-maneuvers] ✓ Enabled by default (enableSocialManeuvers=true)');
  console.info('[social-maneuvers] Runtime control: window.USE_SOCIAL_MANEUVERS = true/false');
  console.info('[social-maneuvers] Current state: USE_SOCIAL_MANEUVERS =', isEnabled());
})(window);