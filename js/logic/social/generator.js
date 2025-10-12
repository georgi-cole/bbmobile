// MODULE: logic/social/generator.js
// Weighted candidate generation for Social Logic v2
// Uses week context, relationships, and cooldowns to select diverse, relevant interactions

(function(global){
  'use strict';

  // ===== Data Structures =====

  /**
   * WeekContext: Current game state for a week
   */
  class WeekContext {
    constructor(game) {
      this.week = game.week;
      this.hohId = game.hohId;
      this.nominees = [...(game.nominees || [])];
      this.vetoHolder = game.vetoHolder;
      this.alivePlayers = global.alivePlayers?.() || [];
      this.humanId = game.humanId;
      this.recentEvents = this._extractRecentEvents(game);
    }

    _extractRecentEvents(game) {
      const events = [];
      
      // HOH event
      if(game.hohId) {
        events.push({ type: 'hoh', playerId: game.hohId, week: game.week });
      }
      
      // Nomination events
      if(game.nominees?.length > 0) {
        game.nominees.forEach(nomId => {
          events.push({ type: 'nomination', playerId: nomId, week: game.week });
        });
      }
      
      // Veto holder event
      if(game.vetoHolder) {
        events.push({ type: 'veto', playerId: game.vetoHolder, week: game.week });
      }
      
      return events;
    }

    isHOH(playerId) {
      return this.hohId === playerId;
    }

    isNominee(playerId) {
      return this.nominees.includes(playerId);
    }

    hasVeto(playerId) {
      return this.vetoHolder === playerId;
    }
  }

  /**
   * RelationshipGraph: Player relationships and alliances
   */
  class RelationshipGraph {
    constructor(game) {
      this.players = global.alivePlayers?.() || [];
      this.alliances = this._extractAlliances(game);
      this.rivalries = this._extractRivalries();
    }

    _extractAlliances(game) {
      const alliances = [];
      const processed = new Set();

      for(const player of this.players) {
        for(const otherId in player.affinity || {}) {
          const affinity = player.affinity[otherId];
          const other = global.getP?.(+otherId);
          
          if(!other || other.evicted) continue;
          
          const pairKey = [player.id, +otherId].sort().join('-');
          if(processed.has(pairKey)) continue;
          
          // Alliance threshold (ALLY_T = 0.28 or higher)
          const ALLY_T = global.ALLY_T ?? 0.28;
          if(affinity >= ALLY_T) {
            const mutualAffinity = other.affinity?.[player.id] ?? 0;
            if(mutualAffinity >= ALLY_T * 0.7) {  // Mutual threshold
              alliances.push({
                players: [player.id, +otherId],
                strength: (affinity + mutualAffinity) / 2
              });
              processed.add(pairKey);
            }
          }
        }
      }

      return alliances;
    }

    _extractRivalries() {
      const rivalries = [];
      const processed = new Set();
      
      const ENEMY_T = global.ENEMY_T ?? -0.28;

      for(const player of this.players) {
        for(const otherId in player.affinity || {}) {
          const affinity = player.affinity[otherId];
          const other = global.getP?.(+otherId);
          
          if(!other || other.evicted) continue;
          
          const pairKey = [player.id, +otherId].sort().join('-');
          if(processed.has(pairKey)) continue;
          
          // Rivalry threshold
          if(affinity <= ENEMY_T) {
            const mutualAffinity = other.affinity?.[player.id] ?? 0;
            rivalries.push({
              players: [player.id, +otherId],
              intensity: Math.abs((affinity + mutualAffinity) / 2)
            });
            processed.add(pairKey);
          }
        }
      }

      return rivalries;
    }

    areAllies(playerId1, playerId2) {
      return this.alliances.some(alliance => 
        alliance.players.includes(playerId1) && alliance.players.includes(playerId2)
      );
    }

    areRivals(playerId1, playerId2) {
      return this.rivalries.some(rivalry => 
        rivalry.players.includes(playerId1) && rivalry.players.includes(playerId2)
      );
    }

    getAllyStrength(playerId1, playerId2) {
      const alliance = this.alliances.find(a => 
        a.players.includes(playerId1) && a.players.includes(playerId2)
      );
      return alliance ? alliance.strength : 0;
    }

    getRivalryIntensity(playerId1, playerId2) {
      const rivalry = this.rivalries.find(r => 
        r.players.includes(playerId1) && r.players.includes(playerId2)
      );
      return rivalry ? rivalry.intensity : 0;
    }
  }

  /**
   * CooldownStore: Track interaction cooldowns per session
   */
  class CooldownStore {
    constructor() {
      this.pairCooldowns = new Map();  // "id1-id2|type" -> lastWeek
      this.typeCooldowns = new Map();  // "type" -> lastWeek
      this.sessionInteractions = new Map();  // currentSession interactions
    }

    getPairKey(id1, id2, type) {
      const [min, max] = [id1, id2].sort((a, b) => a - b);
      return `${min}-${max}|${type}`;
    }

    isOnCooldown(id1, id2, type, currentWeek, pairWeeks, typeWeeks) {
      const pairKey = this.getPairKey(id1, id2, type);
      const pairLastWeek = this.pairCooldowns.get(pairKey);
      const typeLastWeek = this.typeCooldowns.get(type);

      // If never used, not on cooldown
      const pairCooldown = pairLastWeek ? (currentWeek - pairLastWeek < pairWeeks) : false;
      const typeCooldown = typeLastWeek ? (currentWeek - typeLastWeek < typeWeeks) : false;

      return pairCooldown || typeCooldown;
    }

    recordInteraction(id1, id2, type, currentWeek) {
      const pairKey = this.getPairKey(id1, id2, type);
      this.pairCooldowns.set(pairKey, currentWeek);
      this.typeCooldowns.set(type, currentWeek);
      
      // Track session interactions
      const sessionKey = `${id1}-${id2}`;
      if(!this.sessionInteractions.has(sessionKey)) {
        this.sessionInteractions.set(sessionKey, []);
      }
      this.sessionInteractions.get(sessionKey).push(type);
    }

    clearSession() {
      this.sessionInteractions.clear();
    }

    getSessionInteractionCount(id1, id2) {
      const key1 = `${id1}-${id2}`;
      const key2 = `${id2}-${id1}`;
      return (this.sessionInteractions.get(key1)?.length || 0) + 
             (this.sessionInteractions.get(key2)?.length || 0);
    }
  }

  // ===== Weighted Candidate Generation =====

  /**
   * Calculate weight for a candidate interaction
   */
  function calculateWeight(candidate, context, relationships, cooldowns) {
    let weight = 1.0;

    const actor = candidate.actor;
    const target = candidate.target;
    const type = candidate.type;

    // Context-based weights (strongly bias toward relevant context)
    
    // HOH involvement
    if(context.isHOH(actor.id) || context.isHOH(target.id)) {
      weight *= 2.5;
    }

    // Nominee involvement
    if(context.isNominee(actor.id) || context.isNominee(target.id)) {
      weight *= 2.2;
    }

    // Veto holder involvement
    if(context.hasVeto(actor.id) || context.hasVeto(target.id)) {
      weight *= 1.8;
    }

    // Relationship-based weights
    
    // Allies
    if(relationships.areAllies(actor.id, target.id)) {
      const allyStrength = relationships.getAllyStrength(actor.id, target.id);
      weight *= (1.0 + allyStrength * 2);  // Strong allies get higher weight
      
      // Alliance-related interactions get extra boost
      if(['alliance_offer', 'ally_trust', 'intel_share'].includes(type.id)) {
        weight *= 1.5;
      }
    }

    // Rivals
    if(relationships.areRivals(actor.id, target.id)) {
      const rivalIntensity = relationships.getRivalryIntensity(actor.id, target.id);
      weight *= (1.0 + rivalIntensity * 2.5);  // Strong rivals get higher weight
      
      // Rivalry interactions get extra boost
      if(['rivalry_confrontation', 'target_talk'].includes(type.id)) {
        weight *= 1.8;
      }
    }

    // Affinity-based weight
    const affinity = actor.affinity?.[target.id] ?? 0;
    if(Math.abs(affinity) > 0.3) {
      weight *= (1.0 + Math.abs(affinity) * 0.8);
    }

    // Type-context matching
    const typeData = global.InteractionCatalog?.INTERACTION_TYPES[type.id.toUpperCase()] || type;
    const requiredContext = typeData.requiresContext || [];
    
    let contextMatches = 0;
    if(requiredContext.includes('hoh') && context.hohId) contextMatches++;
    if(requiredContext.includes('nominations') && context.nominees.length > 0) contextMatches++;
    if(requiredContext.includes('alliances') && relationships.alliances.length > 0) contextMatches++;
    if(requiredContext.includes('rivalries') && relationships.rivalries.length > 0) contextMatches++;
    
    weight *= (1.0 + contextMatches * 0.4);

    // Cooldown penalty (soft penalty, not hard block)
    const cd = cooldowns.getSessionInteractionCount(actor.id, target.id);
    if(cd > 0) {
      weight *= Math.pow(0.6, cd);  // Each repeat reduces weight by 40%
    }

    // Add controlled randomness for variety
    const randomFactor = 0.8 + Math.random() * 0.4;  // 0.8 to 1.2
    weight *= randomFactor;

    return weight;
  }

  /**
   * Generate candidate interactions
   */
  function generateCandidates(context, relationships) {
    const candidates = [];
    const humanPlayer = global.getP?.(context.humanId);
    
    if(!humanPlayer || humanPlayer.evicted) return candidates;

    const otherPlayers = context.alivePlayers.filter(p => p.id !== context.humanId);
    
    // Get available interaction types
    const catalog = global.InteractionCatalog;
    if(!catalog) {
      console.warn('[SocialGenerator] InteractionCatalog not loaded');
      return candidates;
    }

    const types = Object.values(catalog.INTERACTION_TYPES);

    // Generate candidates for each type and each player
    for(const type of types) {
      for(const otherPlayer of otherPlayers) {
        // Check if context requirements are met
        const reqContext = type.requiresContext || [];
        let contextMet = reqContext.length === 0;  // No requirements = always met
        
        if(reqContext.includes('hoh') && context.hohId) contextMet = true;
        if(reqContext.includes('nominations') && context.nominees.length > 0) contextMet = true;
        if(reqContext.includes('alliances') && relationships.alliances.length > 0) contextMet = true;
        if(reqContext.includes('rivalries') && relationships.rivalries.length > 0) contextMet = true;

        if(contextMet || reqContext.length === 0) {
          candidates.push({
            actor: otherPlayer,
            target: humanPlayer,
            type: type,
            weight: 0  // Will be calculated later
          });
        }
      }
    }

    return candidates;
  }

  /**
   * Select interactions with diversity constraints
   */
  function selectInteractions(candidates, context, relationships, cooldowns, count = 3) {
    if(candidates.length === 0) return [];

    // Calculate weights for all candidates
    candidates.forEach(candidate => {
      candidate.weight = calculateWeight(candidate, context, relationships, cooldowns);
    });

    // Sort by weight (descending)
    candidates.sort((a, b) => b.weight - a.weight);

    const selected = [];
    const usedCategories = new Map();
    const usedPairs = new Set();
    
    const constraints = global.InteractionCatalog?.CONSTRAINTS || {
      MAX_SAME_CATEGORY_IN_SESSION: 2,
      MIN_DIFFERENT_PAIRS: 2
    };

    // Select diverse interactions
    for(const candidate of candidates) {
      if(selected.length >= count) break;

      const category = candidate.type.category;
      const pairKey = `${candidate.actor.id}-${candidate.target.id}`;
      
      // Check category constraint
      const categoryCount = usedCategories.get(category) || 0;
      if(categoryCount >= constraints.MAX_SAME_CATEGORY_IN_SESSION) {
        continue;  // Skip, too many of this category
      }

      // Check cooldown (hard constraint)
      const typeData = candidate.type;
      if(cooldowns.isOnCooldown(
        candidate.actor.id, 
        candidate.target.id, 
        typeData.id,
        context.week,
        typeData.cooldownPair || 2,
        typeData.cooldownType || 1
      )) {
        continue;  // Skip, on cooldown
      }

      // Add to selection
      selected.push(candidate);
      usedCategories.set(category, categoryCount + 1);
      usedPairs.add(pairKey);
      
      // Record interaction
      cooldowns.recordInteraction(
        candidate.actor.id,
        candidate.target.id,
        typeData.id,
        context.week
      );
    }

    // Ensure minimum diversity
    if(usedPairs.size < constraints.MIN_DIFFERENT_PAIRS && candidates.length > selected.length) {
      // Try to add more diverse pairs
      for(const candidate of candidates) {
        if(selected.length >= count) break;
        
        const pairKey = `${candidate.actor.id}-${candidate.target.id}`;
        if(usedPairs.has(pairKey)) continue;
        
        if(!selected.includes(candidate)) {
          selected.push(candidate);
          usedPairs.add(pairKey);
          
          cooldowns.recordInteraction(
            candidate.actor.id,
            candidate.target.id,
            candidate.type.id,
            context.week
          );
        }
      }
    }

    return selected;
  }

  /**
   * Main generator function
   */
  function generateSocialInteractions(game, cooldowns, count = 3) {
    // Build context
    const context = new WeekContext(game);
    const relationships = new RelationshipGraph(game);

    // Generate candidates
    const candidates = generateCandidates(context, relationships);

    // Select interactions with diversity
    const selected = selectInteractions(candidates, context, relationships, cooldowns, count);

    // Convert to interaction data
    const catalog = global.InteractionCatalog;
    const interactions = [];

    for(const candidate of selected) {
      const template = catalog.INTERACTION_TEMPLATES[candidate.type.id];
      if(template) {
        const interaction = template(candidate.actor, candidate.target, {
          ...context,
          alivePlayers: context.alivePlayers,
          nominees: context.nominees.map(id => global.getP?.(id)).filter(Boolean)
        });
        interactions.push(interaction);
      }
    }

    return interactions;
  }

  // ===== Global State =====
  
  function ensureCooldownStore() {
    const g = global.game;
    if(!g.__socialV2Cooldowns) {
      g.__socialV2Cooldowns = new CooldownStore();
    }
    return g.__socialV2Cooldowns;
  }

  function resetCooldownSession() {
    const cooldowns = ensureCooldownStore();
    cooldowns.clearSession();
  }

  // ===== Exports =====

  global.SocialGenerator = {
    WeekContext,
    RelationshipGraph,
    CooldownStore,
    generateSocialInteractions,
    ensureCooldownStore,
    resetCooldownSession
  };

})(window);
