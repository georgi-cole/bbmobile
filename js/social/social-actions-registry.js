(function(global){
  'use strict';

  // Minimal registry skeleton with example actions. Full catalog will be added in later PRs.
  const Registry = {
    _actions: {
      secret_chat: {
        id: 'secret_chat',
        label: 'Secret Chat',
        phaseTags: ['general','pre-noms','post-noms'],
        cost: 2,
        cooldown: 2,
        targetsRequired: 1,
        spendable: true,
        outcome(ctx){
          // ctx: { actorId, targetId, suggestedTarget }
          return {
            deltas: { affinity: 0.05 },
            suggestedTarget: ctx.suggestedTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actorName: ctx.actorName, targetName: ctx.targetName, suggestedTarget: ctx.suggestedTarget }) : null
          };
        }
      },

      eavesdrop: {
        id: 'eavesdrop',
        label: 'Eavesdrop',
        phaseTags: ['general','pre-noms','pre-pov'],
        cost: 2,
        cooldown: 4,
        targetsRequired: 2,
        spendable: true,
        outcome(ctx){
          return {
            deltas: {},
            suggestedTarget: ctx.suggestedTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actorName: ctx.pairAName, targetName: ctx.pairBName, suggestedTarget: ctx.suggestedTarget }) : null
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
        outcome(ctx){
          // Will return HOH's hinted target if available; truthiness decided elsewhere
          return {
            deltas: {},
            suggestedTarget: ctx.hohTarget || null,
            detailedText: window.SocialFlavor ? window.SocialFlavor.renderDetailed({ actorName: ctx.actorName, targetName: ctx.hohName, suggestedTarget: ctx.hohTarget }) : null
          };
        }
      }
    }
  };

  Registry.get = function(id){ return Registry._actions[id]; };
  Registry.list = function(){ return Object.values(Registry._actions); };

  global.SocialActionsRegistry = Registry;
  console.info('[social-actions-registry] loaded with', Object.keys(Registry._actions).length, 'actions');
})(window);
