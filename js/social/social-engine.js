// MODULE: social-engine.js
// Core orchestration for AI social phase spending and multi-step interactions
// Ensures AI spends ≥60% of available social energy per phase

(function(global) {
  'use strict';

  // ============================================================================
  // STATE
  // ============================================================================
  let phaseActive = false;
  let playerBudgets = new Map(); // playerId -> { budget, spent, actions }
  let phaseStartTime = null;
  let phaseContext = null;

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  async function getConfig() {
    if (global.SocialPolicy && global.SocialPolicy._getConfig()) {
      return global.SocialPolicy._getConfig();
    }
    
    // Load config if not already loaded
    if (global.SocialPolicy && global.SocialPolicy.loadConfig) {
      await global.SocialPolicy.loadConfig();
      return global.SocialPolicy._getConfig();
    }
    
    // Fallback defaults
    return {
      energySpending: {
        targetSpendPctRange: [0.6, 0.9],
        minActionsPerPlayer: 3,
        maxActionsPerPlayer: 8,
        allowOverspend: false
      }
    };
  }

  // ============================================================================
  // PHASE LIFECYCLE
  // ============================================================================
  
  /**
   * Handle social phase start
   * @param {Object} data - Event data
   */
  async function handlePhaseStart(data) {
    if (phaseActive) {
      console.warn('[social-engine] Phase already active, ignoring duplicate start');
      return;
    }

    console.info('[social-engine] 🚀 Social phase starting');
    phaseActive = true;
    phaseStartTime = Date.now();
    phaseContext = buildPhaseContext();
    
    // Compute budgets for all AI players
    await computePlayerBudgets();
    
    // Emit phase ready event
    const bus = getBus();
    if (bus) {
      bus.emit('social.engine:ready', {
        budgets: Array.from(playerBudgets.entries()).map(([id, budget]) => ({
          playerId: id,
          budget: budget.budget,
          playerName: getPlayerName(id)
        }))
      });
    }

    console.info('[social-engine] ✓ Phase initialized with budgets for', playerBudgets.size, 'players');
  }

  /**
   * Handle social phase end
   * @param {Object} data - Event data
   */
  function handlePhaseEnd(data) {
    if (!phaseActive) {
      return;
    }

    console.info('[social-engine] 🏁 Social phase ending');
    
    // Generate phase report
    const report = generatePhaseReport();
    
    // Store in game state
    const g = global.game;
    if (g) {
      if (!g.__socialEngineHistory) g.__socialEngineHistory = [];
      g.__socialEngineHistory.push(report);
      g.__lastSocialEngineReport = report;
    }

    // Emit report event
    const bus = getBus();
    if (bus) {
      bus.emit('social.engine:complete', report);
    }

    console.info('[social-engine] ✓ Phase complete:', report.summary);

    // Reset state
    phaseActive = false;
    playerBudgets.clear();
    phaseStartTime = null;
    phaseContext = null;
  }

  // ============================================================================
  // BUDGET COMPUTATION
  // ============================================================================
  
  /**
   * Compute energy budgets for all AI players
   */
  async function computePlayerBudgets() {
    const config = await getConfig();
    const g = global.game;
    if (!g) return;

    const aiPlayers = getEligibleAIPlayers();
    
    for (const player of aiPlayers) {
      const budget = computePlayerBudget(player, config);
      playerBudgets.set(player.id, budget);
      
      console.info(`[social-engine] 💰 Budget for ${player.name}: ${budget.budget.toFixed(1)} energy (${budget.targetActions} actions)`);
    }
  }

  /**
   * Compute budget for a single player
   * @param {Object} player - Player object
   * @param {Object} config - Configuration
   * @returns {Object} Budget object
   */
  function computePlayerBudget(player, config) {
    const spendCfg = config.energySpending;
    
    // Get player's available energy (from bank or phase seed)
    const availableEnergy = getPlayerEnergy(player.id);
    
    // Compute target spend percentage (stochastic variation)
    const [minPct, maxPct] = spendCfg.targetSpendPctRange;
    const targetPct = minPct + Math.random() * (maxPct - minPct);
    
    // Compute energy budget
    const energyBudget = availableEnergy * targetPct;
    
    // Estimate number of actions (assume avg cost ~0.8 energy)
    const avgActionCost = 0.8;
    const estimatedActions = Math.floor(energyBudget / avgActionCost);
    
    // Clamp to min/max actions
    const targetActions = Math.max(
      spendCfg.minActionsPerPlayer,
      Math.min(spendCfg.maxActionsPerPlayer, estimatedActions)
    );

    return {
      budget: energyBudget,
      spent: 0,
      actions: 0,
      targetActions,
      availableEnergy,
      targetPct: targetPct.toFixed(2)
    };
  }

  // ============================================================================
  // INTERACTION EXECUTION
  // ============================================================================
  
  /**
   * Execute a single AI interaction
   * @param {number} actorId - Actor player ID
   * @returns {boolean} Success
   */
  async function executeAIInteraction(actorId) {
    if (!phaseActive) {
      console.warn('[social-engine] Cannot execute interaction - phase not active');
      return false;
    }

    const budget = playerBudgets.get(actorId);
    if (!budget) {
      console.warn('[social-engine] No budget found for player', actorId);
      return false;
    }

    // Check if player has reached their budget or target actions
    if (budget.spent >= budget.budget && !global.game?.cfg?.allowOverspend) {
      console.info(`[social-engine] Player ${actorId} has reached budget (${budget.spent.toFixed(1)}/${budget.budget.toFixed(1)})`);
      return false;
    }

    if (budget.actions >= budget.targetActions) {
      console.info(`[social-engine] Player ${actorId} has reached target actions (${budget.actions}/${budget.targetActions})`);
      return false;
    }

    // Choose action and targets
    const player = getPlayer(actorId);
    if (!player) return false;

    const actionType = global.SocialPolicy?.chooseActionFor(player, phaseContext);
    if (!actionType) {
      console.warn('[social-engine] Failed to choose action for player', actorId);
      return false;
    }

    const targets = global.SocialPolicy?.chooseTargetsFor(player, actionType, phaseContext);
    if (!targets || targets.length === 0) {
      console.warn('[social-engine] Failed to choose targets for player', actorId, 'action:', actionType);
      return false;
    }

    // Execute via SocialManeuvers
    const result = await executeAction(actorId, targets, actionType);
    
    if (result.success) {
      // Update budget tracking
      budget.spent += result.energyCost || 0;
      budget.actions += 1;

      // Update relationship state
      updateRelationships(actorId, targets, actionType, result);

      console.info(`[social-engine] ✓ ${getPlayerName(actorId)} → ${actionType} → ${targets.map(t => getPlayerName(t)).join(', ')} (${result.energyCost.toFixed(1)} energy)`);
      return true;
    }

    return false;
  }

  /**
   * Execute action via SocialManeuvers API
   * @param {number} actorId - Actor ID
   * @param {Array<number>} targets - Target IDs
   * @param {string} actionType - Action type
   * @returns {Object} Result
   */
  async function executeAction(actorId, targets, actionType) {
    const SM = global.SocialManeuvers;
    if (!SM || !SM.executeAction) {
      console.warn('[social-engine] SocialManeuvers not available');
      return { success: false };
    }

    try {
      // Use first target for single-target actions
      const targetId = targets[0];
      const result = await SM.executeAction(actorId, targetId, actionType);
      
      return {
        success: result?.succeeded || result?.success || false,
        energyCost: result?.energyCost || result?.effectiveCost || 0,
        outcome: result?.outcome || (result?.succeeded ? 'success' : 'failure'),
        affinityDelta: result?.affinityDelta || 0
      };
    } catch (err) {
      console.error('[social-engine] Failed to execute action:', err);
      return { success: false };
    }
  }

  // ============================================================================
  // RELATIONSHIP UPDATES
  // ============================================================================
  
  /**
   * Update relationship state after an interaction
   * @param {number} actorId - Actor ID
   * @param {Array<number>} targets - Target IDs
   * @param {string} actionType - Action type
   * @param {Object} result - Action result
   */
  function updateRelationships(actorId, targets, actionType, result) {
    const Relations = global.SocialRelations || global.Relations;
    if (!Relations) {
      console.warn('[social-engine] Relations module not available');
      return;
    }

    const affinityDelta = result.affinityDelta || 0;
    const config = global.SocialPolicy?._getConfig();
    if (!config) return;

    const thresholds = config.relationshipThresholds;
    if (!thresholds) return;

    for (const targetId of targets) {
      // Get current affinity
      const currentAffinity = getAffinity(actorId, targetId);
      const newAffinity = currentAffinity + affinityDelta;

      // Check for special relationship events
      
      // Alliance formation
      if (actionType === 'form_alliance' && result.success) {
        const level = getAllianceLevel(newAffinity, thresholds);
        if (level > 0) {
          Relations.setRelationBoth?.(actorId, targetId, `ally_level${level}`);
          
          // Emit alert for level 2+ alliances
          if (level >= 2 && config.alertTriggers?.bigAlliance?.enabled) {
            emitAlert('alliance', {
              actorId,
              targetId,
              level,
              affinity: newAffinity
            });
          }
        }
      }

      // Betrayal detection
      if (affinityDelta <= thresholds.betrayal) {
        Relations.tagEvent?.(actorId, targetId, 'betrayal');
        
        if (config.alertTriggers?.majorBetrayal?.enabled) {
          emitAlert('betrayal', {
            actorId,
            targetId,
            affinityDrop: affinityDelta
          });
        }
      }

      // Fight detection
      if (affinityDelta <= thresholds.fight) {
        Relations.tagEvent?.(actorId, targetId, 'fight');
        
        if (config.alertTriggers?.fight?.enabled) {
          emitAlert('fight', {
            actorId,
            targetId,
            affinityDrop: affinityDelta
          });
        }
      }

      // Romance/Bromance detection
      if (newAffinity >= thresholds.romance && config.alertTriggers?.romance?.enabled) {
        Relations.tagEvent?.(actorId, targetId, 'romance');
        emitAlert('romance', {
          actorId,
          targetId,
          affinity: newAffinity
        });
      } else if (newAffinity >= thresholds.bromance) {
        Relations.tagEvent?.(actorId, targetId, 'bromance');
      }

      // Enemy tracking
      const enemyLevel = getEnemyLevel(newAffinity, thresholds);
      if (enemyLevel > 0) {
        Relations.setRelationBoth?.(actorId, targetId, `enemy_level${enemyLevel}`);
      }
    }
  }

  function getAllianceLevel(affinity, thresholds) {
    if (affinity >= thresholds.alliance.level3) return 3;
    if (affinity >= thresholds.alliance.level2) return 2;
    if (affinity >= thresholds.alliance.level1) return 1;
    return 0;
  }

  function getEnemyLevel(affinity, thresholds) {
    if (affinity <= thresholds.enemy.level3) return 3;
    if (affinity <= thresholds.enemy.level2) return 2;
    if (affinity <= thresholds.enemy.level1) return 1;
    return 0;
  }

  function emitAlert(type, data) {
    const bus = getBus();
    if (!bus) return;

    const alert = {
      type: `social_${type}`,
      timestamp: Date.now(),
      ...data,
      actorName: getPlayerName(data.actorId),
      targetName: getPlayerName(data.targetId)
    };

    bus.emit('dr:alert', { alert });
    console.info(`[social-engine] 🚨 Alert: ${type} - ${alert.actorName} & ${alert.targetName}`);
  }

  // ============================================================================
  // PHASE REPORTING
  // ============================================================================
  
  function generatePhaseReport() {
    const duration = Date.now() - phaseStartTime;
    const budgetData = Array.from(playerBudgets.entries()).map(([id, budget]) => ({
      playerId: id,
      playerName: getPlayerName(id),
      budget: budget.budget,
      spent: budget.spent,
      spendPct: (budget.spent / budget.budget * 100).toFixed(1),
      actions: budget.actions,
      targetActions: budget.targetActions
    }));

    const totalBudget = budgetData.reduce((sum, p) => sum + p.budget, 0);
    const totalSpent = budgetData.reduce((sum, p) => sum + p.spent, 0);
    const totalActions = budgetData.reduce((sum, p) => sum + p.actions, 0);
    const avgSpendPct = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : '0.0';

    return {
      week: phaseContext?.week || global.game?.week || 1,
      timestamp: Date.now(),
      duration,
      players: budgetData,
      summary: {
        totalBudget: totalBudget.toFixed(1),
        totalSpent: totalSpent.toFixed(1),
        avgSpendPct: `${avgSpendPct}%`,
        totalActions,
        playerCount: budgetData.length
      }
    };
  }

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================
  
  function buildPhaseContext() {
    const g = global.game;
    if (!g) return {};

    return {
      week: g.week || 1,
      currentHOH: g.currentHOH,
      nominees: g.nominees || [],
      vetoHolder: g.vetoHolder,
      humanId: g.humanId
    };
  }

  function getEligibleAIPlayers() {
    const g = global.game;
    if (!g) return [];

    return (g.players || []).filter(p => {
      if (p.evicted) return false;
      if (p.id === g.humanId) return false;
      return true;
    });
  }

  function getPlayerEnergy(playerId) {
    // Try SocialManeuvers bank first
    if (global.SocialManeuvers?.SocialEnergyBank) {
      return global.SocialManeuvers.SocialEnergyBank.get(playerId) || 0;
    }
    
    // Fallback: check SocialResources
    if (global.SocialManeuvers?.SocialResources) {
      return global.SocialManeuvers.SocialResources.getEnergy?.(playerId) || 0;
    }
    
    // Default fallback
    return 5;
  }

  function getPlayer(playerId) {
    const g = global.game;
    if (!g || !g.players) return null;
    return g.players.find(p => p.id === playerId);
  }

  function getPlayerName(playerId) {
    if (typeof global.safeName === 'function') {
      return global.safeName(playerId);
    }
    
    const player = getPlayer(playerId);
    return player?.name || `Player ${playerId}`;
  }

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

  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    const bus = getBus();
    if (!bus) {
      console.info('[social-engine] Event bus not ready - deferring initialization');
      setTimeout(init, 100);
      return;
    }

    // Listen for phase events
    bus.on('social.phase:start', handlePhaseStart);
    bus.on('social-phase:start', handlePhaseStart);
    bus.on('social:start', handlePhaseStart);

    bus.on('social.phase:end', handlePhaseEnd);
    bus.on('social-phase:end', handlePhaseEnd);
    bus.on('social:end', handlePhaseEnd);

    console.info('[social-engine] ✓ Initialized and listening for phase events');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const SocialEngine = {
    executeAIInteraction,
    isPhaseActive: () => phaseActive,
    getPlayerBudget: (playerId) => playerBudgets.get(playerId),
    getAllBudgets: () => Array.from(playerBudgets.entries()),
    getPhaseReport: generatePhaseReport,
    
    // For testing
    _forcePhaseStart: handlePhaseStart,
    _forcePhaseEnd: handlePhaseEnd
  };

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = SocialEngine;
  }
  global.SocialEngine = SocialEngine;

  // Debug API for manual testing
  if (!global.__socialSim) {
    global.__socialSim = {
      startPhaseDebug: () => {
        console.info('[__socialSim] Starting phase debug...');
        return handlePhaseStart({});
      },
      endPhaseDebug: () => {
        console.info('[__socialSim] Ending phase debug...');
        return handlePhaseEnd({});
      },
      dumpLastPhase: () => {
        const report = global.game?.__lastSocialEngineReport;
        if (report) {
          console.log('[__socialSim] Last Phase Report:');
          console.table(report.players);
          console.log('Summary:', report.summary);
        } else {
          console.warn('[__socialSim] No phase report available');
        }
      },
      getBudgets: () => {
        const budgets = Array.from(playerBudgets.entries()).map(([id, budget]) => ({
          playerId: id,
          playerName: getPlayerName(id),
          ...budget,
          spendPct: ((budget.spent / budget.budget) * 100).toFixed(1) + '%'
        }));
        console.table(budgets);
        return budgets;
      },
      getStatus: () => {
        return {
          phaseActive,
          playerCount: playerBudgets.size,
          budgets: Array.from(playerBudgets.entries()).map(([id, b]) => ({ id, ...b }))
        };
      }
    };
    console.info('[social-engine] ✓ Debug API: window.__socialSim');
  }

  // Auto-initialize
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 50);
    }
  } else {
    init();
  }

  console.info('[social-engine] ✓ Module loaded');

})(typeof window !== 'undefined' ? window : global);
