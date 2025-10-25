// MODULE: social-relations.js
// Classification system for allies and enemies based on affinity
// Implements hysteresis, minimum signal filtering, and smart ordering

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  const THRESHOLDS = {
    ALLY: 0.25,
    STRONG_ALLY: 0.45,
    ENEMY: -0.25,
    STRONG_ENEMY: -0.45,
    // Hysteresis buffer zones
    ALLY_RETURN_TO_NEUTRAL: 0.20,
    ENEMY_RETURN_TO_NEUTRAL: -0.20,
    // Minimum signal to consider
    MIN_SIGNAL: 0.15
  };

  const CAPS = {
    MAX_ALLIES: 3,
    MAX_ENEMIES: 3
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get all alive players excluding the given player
   */
  function getEligibleTargets(playerId) {
    const g = global.game;
    if (!g || !g.players) return [];
    
    return g.players.filter(p => 
      p.id !== playerId && 
      !p.evicted
    );
  }

  /**
   * Check if a target meets minimum signal threshold
   * Returns true if |affinity| >= MIN_SIGNAL at least once this/last week
   */
  function meetsMinSignal(playerId, targetId) {
    const g = global.game;
    if (!g) return false;
    
    const player = g.players.find(p => p.id === playerId);
    if (!player) return false;
    
    const affinity = player.affinity?.[targetId] ?? 0;
    
    // Check if current affinity meets threshold
    if (Math.abs(affinity) >= THRESHOLDS.MIN_SIGNAL) {
      return true;
    }
    
    // TODO: Could check historical data if needed
    // For now, just check current value
    return false;
  }

  /**
   * Classify relationship based on affinity with hysteresis
   */
  function classifyRelationship(affinity, lastClassification) {
    // Apply hysteresis if we have a last classification
    if (lastClassification === 'ally') {
      // Only return to neutral if affinity drops below hysteresis threshold
      if (affinity < THRESHOLDS.ALLY_RETURN_TO_NEUTRAL) {
        // Check if it's now an enemy
        if (affinity <= THRESHOLDS.ENEMY) {
          return 'enemy';
        }
        return 'neutral';
      }
      // Stay as ally
      return 'ally';
    }
    
    if (lastClassification === 'enemy') {
      // Only return to neutral if affinity rises above hysteresis threshold
      if (affinity > THRESHOLDS.ENEMY_RETURN_TO_NEUTRAL) {
        // Check if it's now an ally
        if (affinity >= THRESHOLDS.ALLY) {
          return 'ally';
        }
        return 'neutral';
      }
      // Stay as enemy
      return 'enemy';
    }
    
    // No previous classification or was neutral - use standard thresholds
    if (affinity >= THRESHOLDS.ALLY) {
      return 'ally';
    } else if (affinity <= THRESHOLDS.ENEMY) {
      return 'enemy';
    }
    
    return 'neutral';
  }

  /**
   * Get strength score for sorting (higher = stronger relationship)
   */
  function getStrength(affinity, isAlly) {
    if (isAlly) {
      // For allies, higher affinity = higher strength
      return affinity;
    } else {
      // For enemies, more negative = higher strength (convert to positive for sorting)
      return -affinity;
    }
  }

  /**
   * Get pairwise influence as tie-breaker
   */
  function getPairwiseInfluence(playerId, targetId) {
    const g = global.game;
    if (!g) return 0;
    
    const player = g.players.find(p => p.id === playerId);
    if (!player) return 0;
    
    // Could track pairwise influence separately, for now use base influence
    const resources = g.__socialResources?.get?.(playerId);
    return resources?.influence ?? 0;
  }

  // ============================================================================
  // CORE COMPUTATION FUNCTIONS
  // ============================================================================

  /**
   * Compute allies and enemies for a single player
   * 
   * @param {number} playerId - The player ID to compute for
   * @param {object} options - Options including week, affinity data, lastRelations
   * @returns {object} - { alliesIds: [], enemiesIds: [], meta: {} }
   */
  function computeAlliesEnemies(playerId, options = {}) {
    const g = global.game;
    if (!g) {
      console.warn('[relations] Cannot compute - no game state');
      return { alliesIds: [], enemiesIds: [], meta: {} };
    }

    const player = g.players.find(p => p.id === playerId);
    if (!player) {
      console.warn('[relations] Cannot compute - player not found:', playerId);
      return { alliesIds: [], enemiesIds: [], meta: {} };
    }

    const week = options.week ?? g.week ?? 1;
    const affinity = options.affinity ?? player.affinity ?? {};
    const lastRelations = options.lastRelations ?? {};

    const eligibleTargets = getEligibleTargets(playerId);
    const allies = [];
    const enemies = [];

    // Process each eligible target
    for (const target of eligibleTargets) {
      const targetId = target.id;
      const affinityValue = affinity[targetId] ?? 0;

      // Check minimum signal filter
      if (!meetsMinSignal(playerId, targetId)) {
        continue;
      }

      // Get last classification for hysteresis
      const lastClass = lastRelations[targetId];
      
      // Classify the relationship
      const classification = classifyRelationship(affinityValue, lastClass);

      if (classification === 'ally') {
        const strength = getStrength(affinityValue, true);
        allies.push({
          id: targetId,
          affinity: affinityValue,
          strength,
          influence: getPairwiseInfluence(playerId, targetId)
        });
      } else if (classification === 'enemy') {
        const strength = getStrength(affinityValue, false);
        enemies.push({
          id: targetId,
          affinity: affinityValue,
          strength,
          influence: getPairwiseInfluence(playerId, targetId)
        });
      }
    }

    // Sort: first by strength, then by influence as tie-breaker
    const sortByStrengthAndInfluence = (a, b) => {
      if (Math.abs(a.strength - b.strength) > 0.001) {
        return b.strength - a.strength;
      }
      return b.influence - a.influence;
    };

    allies.sort(sortByStrengthAndInfluence);
    enemies.sort(sortByStrengthAndInfluence);

    // Apply caps
    const cappedAllies = allies.slice(0, CAPS.MAX_ALLIES);
    const cappedEnemies = enemies.slice(0, CAPS.MAX_ENEMIES);

    // Extract just the IDs
    const alliesIds = cappedAllies.map(a => a.id);
    const enemiesIds = cappedEnemies.map(e => e.id);

    // Meta info for telemetry
    const meta = {
      week,
      totalAllies: allies.length,
      totalEnemies: enemies.length,
      cappedAllies: cappedAllies.length,
      cappedEnemies: cappedEnemies.length,
      topAllyAffinity: cappedAllies[0]?.affinity,
      topEnemyAffinity: cappedEnemies[0]?.affinity
    };

    return { alliesIds, enemiesIds, meta };
  }

  /**
   * Recompute relations for all alive players
   * Updates player.allies and player.enemies arrays
   * Stores last-week state for hysteresis
   */
  function recomputeAllRelations() {
    const g = global.game;
    if (!g || !g.players) {
      console.warn('[relations] Cannot recompute - no game state');
      return;
    }

    const week = g.week ?? 1;
    
    // Week 1 gate: Don't compute relations in week 1
    if (week < 2) {
      console.info(`[relations] ⏸️ Skipping relations recompute - week ${week} (need week 2+)`);
      // Clear any existing relations
      const alivePlayers = g.players.filter(p => !p.evicted);
      for (const player of alivePlayers) {
        player.allies = [];
        player.enemies = [];
      }
      return;
    }

    // Initialize history storage if needed
    if (!g.__relationsHistory) {
      g.__relationsHistory = new Map();
    }

    const alivePlayers = g.players.filter(p => !p.evicted);
    const updatedPlayerIds = [];

    console.info(`[relations] 🔄 Recomputing relations for ${alivePlayers.length} alive players (week ${week})`);

    for (const player of alivePlayers) {
      // Get last week's relations for hysteresis
      const lastRelationsMap = g.__relationsHistory.get(player.id) ?? {};
      const lastRelations = {};
      
      // Convert last arrays to map
      if (player.allies) {
        for (const allyId of player.allies) {
          lastRelations[allyId] = 'ally';
        }
      }
      if (player.enemies) {
        for (const enemyId of player.enemies) {
          lastRelations[enemyId] = 'enemy';
        }
      }

      // Compute new relations
      const result = computeAlliesEnemies(player.id, {
        week,
        affinity: player.affinity,
        lastRelations
      });

      // Update player object
      player.allies = result.alliesIds;
      player.enemies = result.enemiesIds;

      // Store for next time
      const newRelationsMap = {};
      result.alliesIds.forEach(id => { newRelationsMap[id] = 'ally'; });
      result.enemiesIds.forEach(id => { newRelationsMap[id] = 'enemy'; });
      g.__relationsHistory.set(player.id, newRelationsMap);

      updatedPlayerIds.push(player.id);

      // Log telemetry
      console.info(
        `[relations] Player ${player.id} (${player.name}): ` +
        `${result.alliesIds.length} allies [${result.alliesIds.join(', ')}], ` +
        `${result.enemiesIds.length} enemies [${result.enemiesIds.join(', ')}]`
      );

      if (result.meta.topAllyAffinity !== undefined) {
        console.info(`[relations]   Top ally affinity: ${result.meta.topAllyAffinity.toFixed(2)}`);
      }
      if (result.meta.topEnemyAffinity !== undefined) {
        console.info(`[relations]   Top enemy affinity: ${result.meta.topEnemyAffinity.toFixed(2)}`);
      }
    }

    // Dispatch event for UI refresh
    for (const playerId of updatedPlayerIds) {
      try {
        window.dispatchEvent(new CustomEvent('relations-updated', {
          detail: { playerId }
        }));
      } catch (e) {
        console.warn('[relations] Failed to dispatch event for player', playerId, e);
      }
    }

    console.info(`[relations] ✓ Relations recomputed for ${updatedPlayerIds.length} players`);
  }

  // ============================================================================
  // DEBUG HELPERS
  // ============================================================================

  /**
   * Show relations for all players (debug helper)
   */
  function showRelations() {
    const g = global.game;
    if (!g || !g.players) {
      console.warn('[relations] No game state');
      return;
    }

    const alivePlayers = g.players.filter(p => !p.evicted);
    
    console.group('[relations] 📊 Current Relations');
    console.info(`Week: ${g.week ?? 1}`);
    console.info(`Alive players: ${alivePlayers.length}`);
    console.info('---');

    for (const player of alivePlayers) {
      const allies = (player.allies || []).map(id => {
        const p = g.players.find(x => x.id === id);
        return p ? `${p.name} (${(player.affinity?.[id] ?? 0).toFixed(2)})` : id;
      });
      
      const enemies = (player.enemies || []).map(id => {
        const p = g.players.find(x => x.id === id);
        return p ? `${p.name} (${(player.affinity?.[id] ?? 0).toFixed(2)})` : id;
      });

      console.info(`${player.name} (ID: ${player.id})`);
      console.info(`  Allies: ${allies.length ? allies.join(', ') : 'None'}`);
      console.info(`  Enemies: ${enemies.length ? enemies.join(', ') : 'None'}`);
    }

    console.groupEnd();
  }

  // ============================================================================
  // EXPORTS
  // ============================================================================

  global.SocialRelations = {
    computeAlliesEnemies,
    recomputeAllRelations,
    showRelations,
    // Expose config for testing
    THRESHOLDS,
    CAPS
  };

  // Expose debug helper
  if (!global.__smDebug) {
    global.__smDebug = {};
  }
  global.__smDebug.showRelations = showRelations;

  console.info('[relations] ✓ SocialRelations module loaded');

})(window);
