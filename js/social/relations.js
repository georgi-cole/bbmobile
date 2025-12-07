// MODULE: social/relations.js
// Central relations module for symmetric social bonds (allies, enemies, etc.)
// Acts as single source-of-truth for all social relationships

(function(global) {
  'use strict';

  // ============================================================================
  // STORAGE STRUCTURE
  // ============================================================================
  // Normalized structure: Map<playerId, Map<bondType, Set<targetId>>>
  // Example: _relations.get(1).get('ally').has(2) => player 1 considers player 2 an ally
  const _relations = new Map();

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Ensure a player's relations map exists
   * @param {number} playerId
   */
  function _ensurePlayer(playerId) {
    if (!_relations.has(playerId)) {
      _relations.set(playerId, new Map());
    }
  }

  /**
   * Ensure a bond type exists for a player
   * @param {number} playerId
   * @param {string} bondType
   */
  function _ensureBondType(playerId, bondType) {
    _ensurePlayer(playerId);
    const playerRelations = _relations.get(playerId);
    if (!playerRelations.has(bondType)) {
      playerRelations.set(bondType, new Set());
    }
  }

  /**
   * Initialize relations for all players in the game
   */
  function _initializeForAllPlayers() {
    const g = global.game;
    if (!g || !g.players) return;

    for (const player of g.players) {
      _ensurePlayer(player.id);
    }
  }

  // ============================================================================
  // SYMMETRIC HELPERS (both directions)
  // ============================================================================
  
  /**
   * Set a relation between two players (both directions)
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} bondType - Type of bond ('ally', 'enemy', etc.)
   */
  function setRelationBoth(playerA, playerB, bondType) {
    if (playerA === playerB) {
      console.warn('[Relations] Cannot set relation with self:', playerA);
      return;
    }

    _ensureBondType(playerA, bondType);
    _ensureBondType(playerB, bondType);

    const relationsA = _relations.get(playerA).get(bondType);
    const relationsB = _relations.get(playerB).get(bondType);

    const hadA = relationsA.has(playerB);
    const hadB = relationsB.has(playerA);

    relationsA.add(playerB);
    relationsB.add(playerA);

    // Log the change
    const g = global.game;
    const nameA = g?.players?.find(p => p.id === playerA)?.name || `Player ${playerA}`;
    const nameB = g?.players?.find(p => p.id === playerB)?.name || `Player ${playerB}`;
    
    if (!hadA || !hadB) {
      console.info(`[Relations] ✓ Set ${bondType} relation: ${nameA} ↔ ${nameB}`);
    }

    // Emit event if bus is available
    _emitRelationChanged(playerA, playerB, bondType, 'added');
  }

  /**
   * Remove a relation between two players (both directions)
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} bondType - Type of bond ('ally', 'enemy', etc.)
   */
  function removeRelationBoth(playerA, playerB, bondType) {
    if (playerA === playerB) return;

    _ensureBondType(playerA, bondType);
    _ensureBondType(playerB, bondType);

    const relationsA = _relations.get(playerA).get(bondType);
    const relationsB = _relations.get(playerB).get(bondType);

    const hadA = relationsA.has(playerB);
    const hadB = relationsB.has(playerA);

    relationsA.delete(playerB);
    relationsB.delete(playerA);

    // Log the change
    const g = global.game;
    const nameA = g?.players?.find(p => p.id === playerA)?.name || `Player ${playerA}`;
    const nameB = g?.players?.find(p => p.id === playerB)?.name || `Player ${playerB}`;
    
    if (hadA || hadB) {
      console.info(`[Relations] ✓ Removed ${bondType} relation: ${nameA} ↔ ${nameB}`);
    }

    // Emit event if bus is available
    _emitRelationChanged(playerA, playerB, bondType, 'removed');
  }

  // ============================================================================
  // DIRECTIONAL HELPERS (one-way)
  // ============================================================================
  
  /**
   * Set a one-way relation (playerA → playerB)
   * @param {number} playerA - Source player ID
   * @param {number} playerB - Target player ID
   * @param {string} bondType - Type of bond
   */
  function setRelationOneWay(playerA, playerB, bondType) {
    if (playerA === playerB) {
      console.warn('[Relations] Cannot set relation with self:', playerA);
      return;
    }

    _ensureBondType(playerA, bondType);
    const relations = _relations.get(playerA).get(bondType);
    
    const had = relations.has(playerB);
    relations.add(playerB);

    if (!had) {
      const g = global.game;
      const nameA = g?.players?.find(p => p.id === playerA)?.name || `Player ${playerA}`;
      const nameB = g?.players?.find(p => p.id === playerB)?.name || `Player ${playerB}`;
      console.info(`[Relations] ✓ Set one-way ${bondType} relation: ${nameA} → ${nameB}`);
    }

    _emitRelationChanged(playerA, playerB, bondType, 'added');
  }

  /**
   * Remove a one-way relation (playerA → playerB)
   * @param {number} playerA - Source player ID
   * @param {number} playerB - Target player ID
   * @param {string} bondType - Type of bond
   */
  function removeRelationOneWay(playerA, playerB, bondType) {
    if (playerA === playerB) return;

    _ensureBondType(playerA, bondType);
    const relations = _relations.get(playerA).get(bondType);
    
    const had = relations.has(playerB);
    relations.delete(playerB);

    if (had) {
      const g = global.game;
      const nameA = g?.players?.find(p => p.id === playerA)?.name || `Player ${playerA}`;
      const nameB = g?.players?.find(p => p.id === playerB)?.name || `Player ${playerB}`;
      console.info(`[Relations] ✓ Removed one-way ${bondType} relation: ${nameA} → ${nameB}`);
    }

    _emitRelationChanged(playerA, playerB, bondType, 'removed');
  }

  // ============================================================================
  // QUERY HELPERS
  // ============================================================================
  
  /**
   * Get all allies for a player
   * @param {number} playerId - Player ID
   * @returns {number[]} Array of ally player IDs
   */
  function getAllies(playerId) {
    _ensureBondType(playerId, 'ally');
    const allies = _relations.get(playerId).get('ally');
    return Array.from(allies);
  }

  /**
   * Get all enemies for a player
   * @param {number} playerId - Player ID
   * @returns {number[]} Array of enemy player IDs
   */
  function getEnemies(playerId) {
    _ensureBondType(playerId, 'enemy');
    const enemies = _relations.get(playerId).get('enemy');
    return Array.from(enemies);
  }

  /**
   * Get all relations of a specific type for a player
   * @param {number} playerId - Player ID
   * @param {string} bondType - Type of bond
   * @returns {number[]} Array of related player IDs
   */
  function getOther(playerId, bondType) {
    _ensureBondType(playerId, bondType);
    const relations = _relations.get(playerId).get(bondType);
    return Array.from(relations);
  }

  /**
   * Check if two players have a specific relation
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} bondType - Type of bond
   * @returns {boolean} True if relation exists
   */
  function hasRelation(playerA, playerB, bondType) {
    _ensureBondType(playerA, bondType);
    return _relations.get(playerA).get(bondType).has(playerB);
  }

  // ============================================================================
  // PERSISTENCE HELPERS
  // ============================================================================
  
  /**
   * Export raw relations data for saving
   * @returns {Object} Serializable relations data
   */
  function _raw() {
    const data = {};
    
    for (const [playerId, playerRelations] of _relations.entries()) {
      const playerData = {};
      let hasRelations = false;
      
      for (const [bondType, targetSet] of playerRelations.entries()) {
        // Only include non-empty relations
        if (targetSet.size > 0) {
          playerData[bondType] = Array.from(targetSet);
          hasRelations = true;
        }
      }
      
      // Only include player if they have any relations
      if (hasRelations) {
        data[playerId] = playerData;
      }
    }
    
    return data;
  }

  /**
   * Import raw relations data when loading
   * @param {Object} data - Relations data from save file
   */
  function _replaceRaw(data) {
    // Clear existing relations
    _relations.clear();
    
    if (!data || typeof data !== 'object') {
      console.warn('[Relations] Invalid data provided to _replaceRaw');
      return;
    }

    // Restore relations from data
    for (const [playerIdStr, playerRelations] of Object.entries(data)) {
      const playerId = parseInt(playerIdStr, 10);
      if (isNaN(playerId)) continue;

      _ensurePlayer(playerId);
      
      for (const [bondType, targetArray] of Object.entries(playerRelations)) {
        if (!Array.isArray(targetArray)) continue;
        
        _ensureBondType(playerId, bondType);
        const targetSet = _relations.get(playerId).get(bondType);
        
        for (const targetId of targetArray) {
          if (typeof targetId === 'number') {
            targetSet.add(targetId);
          }
        }
      }
    }

    console.info('[Relations] ✓ Restored relations from save data');
    
    // Emit sync event
    _emitRelationsSynced();
  }

  // ============================================================================
  // EVENT EMISSION
  // ============================================================================
  
  /**
   * Emit relation changed event
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} bondType - Type of bond
   * @param {string} action - 'added' or 'removed'
   */
  function _emitRelationChanged(playerA, playerB, bondType, action) {
    try {
      if (global.game && global.game.bus && typeof global.game.bus.emit === 'function') {
        global.game.bus.emit('social.relation.changed', {
          playerA,
          playerB,
          bondType,
          action
        });
      }
    } catch (e) {
      // Defensive: don't throw if event system not available
      console.debug('[Relations] Could not emit relation.changed event:', e.message);
    }
  }

  /**
   * Emit relations synced event (after load)
   */
  function _emitRelationsSynced() {
    try {
      if (global.game && global.game.bus && typeof global.game.bus.emit === 'function') {
        global.game.bus.emit('social.relations.synced', {});
      }
    } catch (e) {
      console.debug('[Relations] Could not emit relations.synced event:', e.message);
    }
  }

  // ============================================================================
  // DEBUG HELPERS
  // ============================================================================
  
  /**
   * Debug: Show all relations for a player
   * @param {number} playerId - Player ID
   */
  function showPlayerRelations(playerId) {
    const g = global.game;
    const player = g?.players?.find(p => p.id === playerId);
    const playerName = player?.name || `Player ${playerId}`;

    console.group(`[Relations] Relations for ${playerName} (ID: ${playerId})`);
    
    if (!_relations.has(playerId)) {
      console.info('No relations recorded');
    } else {
      const playerRelations = _relations.get(playerId);
      
      for (const [bondType, targetSet] of playerRelations.entries()) {
        if (targetSet.size === 0) continue;
        
        const targets = Array.from(targetSet).map(id => {
          const target = g?.players?.find(p => p.id === id);
          return target ? `${target.name} (${id})` : `Player ${id}`;
        });
        
        console.info(`${bondType}:`, targets.join(', '));
      }
    }
    
    console.groupEnd();
  }

  /**
   * Debug: Show all relations in the game
   */
  function showAllRelations() {
    const g = global.game;
    
    console.group('[Relations] All Relations');
    
    if (_relations.size === 0) {
      console.info('No relations recorded');
    } else {
      for (const [playerId] of _relations.entries()) {
        const player = g?.players?.find(p => p.id === playerId);
        if (player && !player.evicted) {
          showPlayerRelations(playerId);
        }
      }
    }
    
    console.groupEnd();
  }

  // ============================================================================
  // EVENT TAGGING (for social engine)
  // ============================================================================
  
  // Storage for event tags: Map<pairKey, Set<eventType>>
  const _eventTags = new Map();

  function _getPairKey(playerA, playerB) {
    return [playerA, playerB].sort((a, b) => a - b).join('-');
  }

  /**
   * Tag an event between two players (betrayal, fight, romance, etc.)
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} eventType - Event type ('betrayal', 'fight', 'romance', 'bromance')
   */
  function tagEvent(playerA, playerB, eventType) {
    if (playerA === playerB) return;
    
    const pairKey = _getPairKey(playerA, playerB);
    if (!_eventTags.has(pairKey)) {
      _eventTags.set(pairKey, new Set());
    }
    
    const tags = _eventTags.get(pairKey);
    const hadTag = tags.has(eventType);
    tags.add(eventType);

    if (!hadTag) {
      const g = global.game;
      const nameA = g?.players?.find(p => p.id === playerA)?.name || `Player ${playerA}`;
      const nameB = g?.players?.find(p => p.id === playerB)?.name || `Player ${playerB}`;
      console.info(`[Relations] 🏷️ Tagged ${eventType}: ${nameA} ↔ ${nameB}`);
    }
  }

  /**
   * Check if two players have an event tag
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @param {string} eventType - Event type
   * @returns {boolean} True if tag exists
   */
  function hasEventTag(playerA, playerB, eventType) {
    const pairKey = _getPairKey(playerA, playerB);
    if (!_eventTags.has(pairKey)) return false;
    return _eventTags.get(pairKey).has(eventType);
  }

  /**
   * Get all event tags for a pair
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   * @returns {string[]} Array of event types
   */
  function getEventTags(playerA, playerB) {
    const pairKey = _getPairKey(playerA, playerB);
    if (!_eventTags.has(pairKey)) return [];
    return Array.from(_eventTags.get(pairKey));
  }

  /**
   * Clear event tags for a pair
   * @param {number} playerA - First player ID
   * @param {number} playerB - Second player ID
   */
  function clearEventTags(playerA, playerB) {
    const pairKey = _getPairKey(playerA, playerB);
    _eventTags.delete(pairKey);
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  // Initialize relations for existing players on module load
  _initializeForAllPlayers();

  // ============================================================================
  // EXPORTS
  // ============================================================================
  
  const Relations = {
    // Symmetric helpers
    setRelationBoth,
    removeRelationBoth,
    
    // Directional helpers
    setRelationOneWay,
    removeRelationOneWay,
    
    // Query helpers
    getAllies,
    getEnemies,
    getOther,
    hasRelation,
    
    // Event tagging
    tagEvent,
    hasEventTag,
    getEventTags,
    clearEventTags,
    
    // Persistence helpers
    _raw,
    _replaceRaw,
    
    // Debug helpers
    showPlayerRelations,
    showAllRelations
  };

  // Export to global scope
  global.Relations = Relations;
  global.SocialRelations = Relations; // Alias for social engine

  // Also expose on window.game if available
  if (global.game) {
    global.game.Relations = Relations;
    global.game.SocialRelations = Relations;
  }

  console.info('[Relations] ✓ Relations module loaded');

})(window);
