(function(global){
  'use strict';

  // Full social AI action catalog with 20+ actions
  // Each action has: id, label, phaseTags, cost, cooldown, targetsRequired, spendable, aiBias, outcome()
  const Registry = {
    _actions: {
      // ===== ALLY BUILDING ACTIONS =====
      secret_chat: {
        id: 'secret_chat',
        label: 'Secret Chat',
        phaseTags: ['general','pre-noms','post-noms'],
        cost: 2,
        cooldown: 2,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.5, general: 1.0, rival: 0.3 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.05, trust: 0.03 },
            suggestedTarget: ctx.suggestedTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'secret_chat', actorName: ctx.actorName, targetName: ctx.targetName, suggestedTarget: ctx.suggestedTarget }) : null
          };
        }
      },

      alliance_invite: {
        id: 'alliance_invite',
        label: 'Alliance Invite',
        phaseTags: ['general','pre-noms'],
        cost: 3,
        cooldown: 5,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 2.0, general: 0.5, rival: 0.1 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.10, trust: 0.08, alliance: 1 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'alliance_invite', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      alliance_renew: {
        id: 'alliance_renew',
        label: 'Alliance Renewal',
        phaseTags: ['general','post-noms'],
        cost: 2,
        cooldown: 4,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.8, general: 0.3, rival: 0.0 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.06, trust: 0.05 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'alliance_renew', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      favor_grant: {
        id: 'favor_grant',
        label: 'Grant Favor',
        phaseTags: ['general','post-noms'],
        cost: 3,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.5, general: 0.8, rival: 0.2 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.08, trust: 0.06, influence: 0.05 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'favor_grant', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      sympathy_visit: {
        id: 'sympathy_visit',
        label: 'Sympathy Visit',
        phaseTags: ['post-noms'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: false,
        aiBias: { nominee: 2.0, ally: 1.2, general: 0.5 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.04, trust: 0.03 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'sympathy_visit', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      gift: {
        id: 'gift',
        label: 'Gift',
        phaseTags: ['general'],
        cost: 2,
        cooldown: 4,
        targetsRequired: 1,
        spendable: false,
        aiBias: { ally: 1.3, general: 0.8, rival: 0.4 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.05, trust: 0.02 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'gift', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      // ===== INTEL GATHERING ACTIONS =====
      eavesdrop: {
        id: 'eavesdrop',
        label: 'Eavesdrop',
        phaseTags: ['general','pre-noms','pre-pov'],
        cost: 2,
        cooldown: 4,
        targetsRequired: 2,
        spendable: true,
        aiBias: { general: 1.0, rival: 1.2 },
        outcome(ctx){
          return {
            deltas: { information: 0.04 },
            suggestedTarget: ctx.suggestedTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'eavesdrop', actorName: ctx.pairAName, targetName: ctx.pairBName, suggestedTarget: ctx.suggestedTarget }) : null
          };
        }
      },

      probe_hoh: {
        id: 'probe_hoh',
        label: 'Probe HOH',
        phaseTags: ['pre-noms'],
        cost: 3,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { hoh: 2.5, general: 0.8 },
        outcome(ctx){
          return {
            deltas: { information: 0.08 },
            suggestedTarget: ctx.hohTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'probe_hoh', actorName: ctx.actorName, targetName: ctx.hohName, suggestedTarget: ctx.hohTarget, truthiness: ctx.truthiness }) : null,
            intelType: 'hoh_target'
          };
        }
      },

      probe_pov: {
        id: 'probe_pov',
        label: 'Probe POV',
        phaseTags: ['pre-pov','post-noms'],
        cost: 3,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { povHolder: 2.5, general: 0.8 },
        outcome(ctx){
          return {
            deltas: { information: 0.08 },
            suggestedTarget: ctx.povIntention || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'probe_pov', actorName: ctx.actorName, targetName: ctx.povHolderName, suggestedTarget: ctx.povIntention, truthiness: ctx.truthiness }) : null,
            intelType: 'pov_intention'
          };
        }
      },

      verify_rumor: {
        id: 'verify_rumor',
        label: 'Verify Rumor',
        phaseTags: ['general'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { general: 1.0 },
        outcome(ctx){
          return {
            deltas: { information: 0.05 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'verify_rumor', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      // ===== STRATEGY & BARGAINING =====
      bargain_pov: {
        id: 'bargain_pov',
        label: 'Bargain for Veto',
        phaseTags: ['pre-pov','post-noms'],
        cost: 4,
        cooldown: 4,
        targetsRequired: 1,
        spendable: true,
        aiBias: { povHolder: 3.0, nominee: 2.0, general: 0.3 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.03, influence: 0.06 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'bargain_pov', actorName: ctx.actorName, targetName: ctx.povHolderName }) : null,
            intelType: 'bargain'
          };
        }
      },

      favor_request: {
        id: 'favor_request',
        label: 'Request Favor',
        phaseTags: ['general','pre-noms'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.5, general: 0.7, rival: 0.2 },
        outcome(ctx){
          return {
            deltas: { trust: 0.02, influence: 0.03 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'favor_request', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      vote_rally: {
        id: 'vote_rally',
        label: 'Vote Rally',
        phaseTags: ['post-noms'],
        cost: 3,
        cooldown: 4,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.8, general: 1.0, nominee: 2.5 },
        outcome(ctx){
          return {
            deltas: { influence: 0.07, trust: 0.03 },
            suggestedTarget: ctx.voteTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'vote_rally', actorName: ctx.actorName, targetName: ctx.targetName, suggestedTarget: ctx.voteTarget }) : null
          };
        }
      },

      wedge_plant: {
        id: 'wedge_plant',
        label: 'Plant Wedge',
        phaseTags: ['general'],
        cost: 3,
        cooldown: 5,
        targetsRequired: 1,
        spendable: true,
        aiBias: { rival: 1.8, general: 0.5 },
        outcome(ctx){
          return {
            deltas: { influence: 0.04 },
            suggestedTarget: ctx.thirdParty || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'wedge_plant', actorName: ctx.actorName, targetName: ctx.targetName, thirdParty: ctx.thirdParty }) : null,
            spreadSimulation: true
          };
        }
      },

      // ===== CONFLICT ACTIONS =====
      rivalry_poke: {
        id: 'rivalry_poke',
        label: 'Rivalry Poke',
        phaseTags: ['general'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: false,
        aiBias: { rival: 2.0, general: 0.3 },
        outcome(ctx){
          return {
            deltas: { affinity: -0.04, rivalry: 0.05 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'rivalry_poke', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      deescalate: {
        id: 'deescalate',
        label: 'De-escalate',
        phaseTags: ['general','post-noms'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: false,
        aiBias: { rival: 1.5, general: 0.6 },
        outcome(ctx){
          return {
            deltas: { affinity: 0.03, rivalry: -0.03 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'deescalate', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      betrayal_tease: {
        id: 'betrayal_tease',
        label: 'Betrayal Tease',
        phaseTags: ['general'],
        cost: 3,
        cooldown: 5,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 0.2, rival: 1.8, general: 0.5 },
        outcome(ctx){
          return {
            deltas: { affinity: -0.08, trust: -0.10, influence: 0.05 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'betrayal_tease', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      public_callout: {
        id: 'public_callout',
        label: 'Public Callout',
        phaseTags: ['general','post-noms'],
        cost: 4,
        cooldown: 6,
        targetsRequired: 1,
        spendable: true,
        aiBias: { rival: 2.5, general: 0.2 },
        outcome(ctx){
          return {
            deltas: { affinity: -0.10, rivalry: 0.08, influence: 0.04 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'public_callout', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      },

      // ===== RUMOR ACTIONS =====
      plant_rumor: {
        id: 'plant_rumor',
        label: 'Plant Rumor',
        phaseTags: ['general','pre-noms'],
        cost: 3,
        cooldown: 5,
        targetsRequired: 1,
        spendable: true,
        aiBias: { rival: 1.8, general: 0.4 },
        outcome(ctx){
          return {
            deltas: { influence: 0.05 },
            suggestedTarget: ctx.rumorTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'plant_rumor', actorName: ctx.actorName, targetName: ctx.targetName, rumorTarget: ctx.rumorTarget }) : null,
            spreadSimulation: true,
            risk: 'medium'
          };
        }
      },

      counter_rumor: {
        id: 'counter_rumor',
        label: 'Counter Rumor',
        phaseTags: ['general'],
        cost: 2,
        cooldown: 3,
        targetsRequired: 1,
        spendable: true,
        aiBias: { ally: 1.5, general: 0.8 },
        outcome(ctx){
          return {
            deltas: { trust: 0.05, influence: 0.03 },
            suggestedTarget: null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actionId: 'counter_rumor', actorName: ctx.actorName, targetName: ctx.targetName }) : null
          };
        }
      }
    }
  };

  // ===== LEGACY ACTION ID ALIASES =====
  // Maps legacy/social simulator/scheduler actionIds to canonical catalog ids
  // Enables backward compatibility for existing code while mapping to spendable catalog actions
  Registry._aliases = {
    // Small talk variations -> secret_chat
    small_talk: 'secret_chat',
    compliment: 'secret_chat',
    strategize: 'secret_chat',
    
    // Gossip/rumor variations -> plant_rumor
    gossip: 'plant_rumor',
    lie: 'plant_rumor',
    
    // Interrogation -> probe_hoh (best-effort mapping)
    interrogate: 'probe_hoh',
    
    // Backstab -> betrayal_tease
    backstab: 'betrayal_tease',
    
    // Insult -> rivalry_poke
    insult: 'rivalry_poke'
  };

  Registry.get = function(id){ 
    // First, try direct lookup
    let action = Registry._actions[id];
    
    // If not found, check aliases
    if (!action && Registry._aliases[id]) {
      const canonicalId = Registry._aliases[id];
      action = Registry._actions[canonicalId];
      
      if (action) {
        console.debug('[social-actions-registry] Resolved legacy id "' + id + '" -> "' + canonicalId + '"');
      }
    }
    
    return action;
  };
  
  Registry.list = function(){ return Object.values(Registry._actions); };
  Registry.listByPhase = function(phaseTag){ 
    return Object.values(Registry._actions).filter(a => a.phaseTags.includes(phaseTag)); 
  };
  Registry.listByCooldown = function(actorId, cooldownStore){
    const now = Date.now();
    return Object.values(Registry._actions).filter(a => {
      const key = `${actorId}-${a.id}`;
      const lastUsed = cooldownStore.get(key) || 0;
      return (now - lastUsed) >= (a.cooldown * 1000);
    });
  };

  global.SocialActionsRegistry = Registry;
  console.info('[social-actions-registry] loaded with', Object.keys(Registry._actions).length, 'actions,', Object.keys(Registry._aliases).length, 'aliases');
})(window);
