// MODULE: data/config/interactionCatalog.js
// Interaction templates, types, and constraints for Social Logic v2

(function(global){
  'use strict';

  // Interaction types with metadata
  const INTERACTION_TYPES = {
    ALLIANCE_OFFER: {
      id: 'alliance_offer',
      title: 'Alliance Offer',
      category: 'strategic',
      cooldownPair: 3,  // weeks before same pair can see this again
      cooldownType: 2,  // weeks before this type can appear again
      requiresContext: ['nominations', 'hoh', 'alliances']
    },
    TARGET_TALK: {
      id: 'target_talk',
      title: 'Target Talk',
      category: 'strategic',
      cooldownPair: 2,
      cooldownType: 1,
      requiresContext: ['nominations', 'hoh']
    },
    FLIP_PLAN: {
      id: 'flip_plan',
      title: 'Flip Plan',
      category: 'strategic',
      cooldownPair: 2,
      cooldownType: 2,
      requiresContext: ['nominations']
    },
    HOH_PRESSURE: {
      id: 'hoh_pressure',
      title: 'HOH Pressure',
      category: 'strategic',
      cooldownPair: 3,
      cooldownType: 2,
      requiresContext: ['hoh']
    },
    NOMINEE_SUPPORT: {
      id: 'nominee_support',
      title: 'Nominee Support',
      category: 'social',
      cooldownPair: 2,
      cooldownType: 1,
      requiresContext: ['nominations']
    },
    RIVALRY_CONFRONTATION: {
      id: 'rivalry_confrontation',
      title: 'Rivalry',
      category: 'conflict',
      cooldownPair: 3,
      cooldownType: 2,
      requiresContext: ['rivalries']
    },
    ALLY_TRUST: {
      id: 'ally_trust',
      title: 'Ally Check-in',
      category: 'social',
      cooldownPair: 2,
      cooldownType: 1,
      requiresContext: ['alliances']
    },
    INTEL_SHARE: {
      id: 'intel_share',
      title: 'Intel Sharing',
      category: 'strategic',
      cooldownPair: 2,
      cooldownType: 1,
      requiresContext: ['alliances', 'hoh']
    },
    GOSSIP: {
      id: 'gossip',
      title: 'Gossip',
      category: 'social',
      cooldownPair: 1,
      cooldownType: 1,
      requiresContext: []
    },
    RANDOM_SOCIAL: {
      id: 'random_social',
      title: 'Casual Chat',
      category: 'social',
      cooldownPair: 1,
      cooldownType: 0,
      requiresContext: []
    }
  };

  // Template generators for each interaction type
  const INTERACTION_TEMPLATES = {
    alliance_offer: (actor, target, context) => ({
      type: 'alliance_offer',
      title: 'Alliance Offer',
      targetPlayer: actor,
      lines: [
        `${actor.name} wants to form an alliance with you.`,
        context.hohId === actor.id ? `As HOH, they have power this week.` : `They seem genuine about working together.`,
        'Do you accept?'
      ],
      actions: [
        {
          label: 'Accept',
          affinity: { actor: 0.22, target: 0.18 },
          logMessage: `You and ${actor.name} formed an alliance.`,
          logType: 'ok'
        },
        {
          label: 'Decline',
          affinity: { actor: -0.08, target: -0.12 },
          logMessage: `You declined ${actor.name}'s alliance offer.`,
          logType: 'muted'
        }
      ]
    }),

    target_talk: (actor, target, context) => {
      const nominees = context.nominees || [];
      const possibleTargets = context.alivePlayers.filter(p => 
        p.id !== actor.id && p.id !== target.id
      );
      const suggestedTarget = nominees.length > 0 
        ? nominees[Math.floor(Math.random() * nominees.length)]
        : possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
      
      return {
        type: 'target_talk',
        title: 'Target Talk',
        targetPlayer: actor,
        lines: [
          `${actor.name} suggests targeting ${suggestedTarget?.name || 'someone'}.`,
          context.hohId === actor.id ? 'As HOH, their opinion carries weight.' : 'They want your support.',
          'Do you agree to target them this week?'
        ],
        actions: [
          {
            label: 'Agree',
            affinity: { actor: 0.12, target: 0.10, [suggestedTarget?.id]: -0.14 },
            logMessage: `You agreed with ${actor.name} to target ${suggestedTarget?.name || 'someone'}.`,
            logType: 'warn'
          },
          {
            label: 'Refuse',
            affinity: { actor: -0.10, target: -0.08 },
            logMessage: `You refused to target ${suggestedTarget?.name || 'someone'}.`,
            logType: 'muted'
          }
        ],
        metadata: { suggestedTargetId: suggestedTarget?.id }
      };
    },

    flip_plan: (actor, target, context) => ({
      type: 'flip_plan',
      title: 'Flip Plan',
      targetPlayer: actor,
      lines: [
        `${actor.name} asks you to consider flipping a vote later.`,
        context.nominees?.length > 0 ? 'The house dynamics are shifting.' : 'They want to shake things up.',
        'How do you respond?'
      ],
      actions: [
        {
          label: 'Promise',
          affinity: { actor: 0.14, target: 0.12 },
          logMessage: `You promised ${actor.name} you'd consider flipping.`,
          logType: 'ok'
        },
        {
          label: 'Reject',
          affinity: { actor: -0.12, target: -0.10 },
          logMessage: `You rejected ${actor.name}'s flip plan.`,
          logType: 'danger'
        }
      ]
    }),

    hoh_pressure: (actor, target, context) => ({
      type: 'hoh_pressure',
      title: 'HOH Pressure',
      targetPlayer: actor,
      lines: [
        `${actor.name} wants you to consider their opinion on nominations.`,
        context.hohId === target.id ? 'They know you have the power.' : 'They want to influence the week.',
        'How do you respond?'
      ],
      actions: [
        {
          label: 'Listen',
          affinity: { actor: 0.10, target: 0.08 },
          logMessage: `You listened to ${actor.name}'s input.`,
          logType: 'ok'
        },
        {
          label: 'Dismiss',
          affinity: { actor: -0.14, target: -0.10 },
          logMessage: `You dismissed ${actor.name}'s pressure.`,
          logType: 'danger'
        }
      ]
    }),

    nominee_support: (actor, target, context) => ({
      type: 'nominee_support',
      title: 'Nominee Support',
      targetPlayer: actor,
      lines: [
        `${actor.name} wants to offer you support.`,
        context.nominees?.includes(target) ? 'You could use an ally right now.' : 'They sense you need reassurance.',
        'Do you accept their support?'
      ],
      actions: [
        {
          label: 'Accept',
          affinity: { actor: 0.16, target: 0.14 },
          logMessage: `${actor.name} offered you support.`,
          logType: 'ok'
        },
        {
          label: 'Decline',
          affinity: { actor: -0.06, target: -0.04 },
          logMessage: `You declined ${actor.name}'s support.`,
          logType: 'muted'
        }
      ]
    }),

    rivalry_confrontation: (actor, target, context) => ({
      type: 'rivalry_confrontation',
      title: 'Confrontation',
      targetPlayer: actor,
      lines: [
        `${actor.name} confronts you about your actions.`,
        'Tensions are high between you two.',
        'How do you respond?'
      ],
      actions: [
        {
          label: 'Apologize',
          affinity: { actor: 0.10, target: 0.08 },
          logMessage: `You apologized to ${actor.name}.`,
          logType: 'ok'
        },
        {
          label: 'Stand Firm',
          affinity: { actor: -0.12, target: -0.14 },
          logMessage: `You stood your ground against ${actor.name}.`,
          logType: 'danger'
        }
      ]
    }),

    ally_trust: (actor, target, context) => ({
      type: 'ally_trust',
      title: 'Ally Check-in',
      targetPlayer: actor,
      lines: [
        `${actor.name} checks in to make sure you're still aligned.`,
        'Trust is important in this game.',
        'How do you reassure them?'
      ],
      actions: [
        {
          label: 'Reassure',
          affinity: { actor: 0.12, target: 0.10 },
          logMessage: `You reassured ${actor.name} of your loyalty.`,
          logType: 'ok'
        },
        {
          label: 'Be Vague',
          affinity: { actor: -0.08, target: -0.06 },
          logMessage: `You gave ${actor.name} a vague response.`,
          logType: 'warn'
        }
      ]
    }),

    intel_share: (actor, target, context) => ({
      type: 'intel_share',
      title: 'Intel Sharing',
      targetPlayer: actor,
      lines: [
        `${actor.name} wants to share some game intel with you.`,
        'Information is power in the Big Brother house.',
        'Do you listen?'
      ],
      actions: [
        {
          label: 'Listen',
          affinity: { actor: 0.14, target: 0.12 },
          logMessage: `${actor.name} shared valuable intel with you.`,
          logType: 'ok'
        },
        {
          label: 'Ignore',
          affinity: { actor: -0.10, target: -0.08 },
          logMessage: `You ignored ${actor.name}'s intel.`,
          logType: 'muted'
        }
      ]
    }),

    gossip: (actor, target, context) => {
      const otherPlayers = context.alivePlayers.filter(p => 
        p.id !== actor.id && p.id !== target.id
      );
      const gossipTarget = otherPlayers[Math.floor(Math.random() * otherPlayers.length)];
      
      return {
        type: 'gossip',
        title: 'Gossip',
        targetPlayer: actor,
        lines: [
          `${actor.name} wants to gossip about ${gossipTarget?.name || 'someone'}.`,
          'Do you engage?'
        ],
        actions: [
          {
            label: 'Engage',
            affinity: { actor: 0.08, target: 0.06 },
            logMessage: `You gossiped with ${actor.name}.`,
            logType: 'ok'
          },
          {
            label: 'Decline',
            affinity: { actor: -0.04, target: -0.02 },
            logMessage: `You declined to gossip with ${actor.name}.`,
            logType: 'muted'
          }
        ]
      };
    },

    random_social: (actor, target, context) => ({
      type: 'random_social',
      title: 'Casual Chat',
      targetPlayer: actor,
      lines: [
        `${actor.name} wants to have a casual conversation.`,
        'Sometimes the best strategy is just being friendly.',
        'Do you chat?'
      ],
      actions: [
        {
          label: 'Chat',
          affinity: { actor: 0.10, target: 0.08 },
          logMessage: `You had a nice chat with ${actor.name}.`,
          logType: 'ok'
        },
        {
          label: 'Pass',
          affinity: { actor: -0.02, target: 0 },
          logMessage: `You politely declined to chat with ${actor.name}.`,
          logType: 'muted'
        }
      ]
    })
  };

  // Constraints for interaction diversity
  const CONSTRAINTS = {
    MIN_INTERACTIONS_PER_SESSION: 3,
    MAX_INTERACTIONS_PER_SESSION: 4,
    MAX_SAME_CATEGORY_IN_SESSION: 2,  // Max 2 strategic, 2 social, etc.
    MIN_DIFFERENT_PAIRS: 2,            // At least 2 different player pairs
    COOLDOWN_WEEKS_PAIR: 2,            // Default pair cooldown
    COOLDOWN_WEEKS_TYPE: 1             // Default type cooldown
  };

  // Export to global namespace
  global.InteractionCatalog = {
    INTERACTION_TYPES,
    INTERACTION_TEMPLATES,
    CONSTRAINTS
  };

})(window);
