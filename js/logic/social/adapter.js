// MODULE: logic/social/adapter.js
// Adapter layer to convert generator output to SocialDecisionPopup format

(function(global){
  'use strict';

  /**
   * Convert interaction data to SocialDecisionPopup options
   */
  function interactionToPopupOptions(interaction, humanPlayer) {
    if(!interaction || !humanPlayer) {
      console.warn('[SocialAdapter] Invalid interaction or humanPlayer');
      return null;
    }

    const targetPlayer = interaction.targetPlayer;
    const title = interaction.title || 'Social Decision';
    const bodyText = interaction.lines || [];
    
    // Convert actions to popup format
    const actions = (interaction.actions || []).map(action => {
      return {
        label: action.label,
        theme: determineTheme(action),
        onClick: () => {
          applyInteractionEffects(action, humanPlayer, targetPlayer, interaction);
        }
      };
    });

    return {
      player: targetPlayer,
      title: title,
      bodyText: bodyText,
      actions: actions,
      onClose: null
    };
  }

  /**
   * Determine button theme based on action
   */
  function determineTheme(action) {
    const label = action.label.toLowerCase();
    
    // Positive actions
    if(['accept', 'agree', 'promise', 'listen', 'reassure', 'chat', 'engage'].includes(label)) {
      return 'accept';
    }
    
    // Negative actions
    if(['decline', 'refuse', 'reject', 'dismiss', 'stand firm'].includes(label)) {
      return 'refuse';
    }
    
    // Neutral actions
    return 'neutral';
  }

  /**
   * Apply interaction effects (affinity changes, logs)
   */
  function applyInteractionEffects(action, humanPlayer, targetPlayer, interaction) {
    const g = global.game;
    if(!g) return;

    // Apply affinity changes
    if(action.affinity) {
      for(const [key, delta] of Object.entries(action.affinity)) {
        if(key === 'actor') {
          // Actor is the other player (targetPlayer in popup context)
          const current = humanPlayer.affinity?.[targetPlayer.id] ?? 0;
          humanPlayer.affinity[targetPlayer.id] = current + delta;
        } else if(key === 'target') {
          // Target is the human player
          const current = targetPlayer.affinity?.[humanPlayer.id] ?? 0;
          targetPlayer.affinity[humanPlayer.id] = current + delta;
        } else {
          // Other player ID
          const otherId = parseInt(key);
          if(!isNaN(otherId)) {
            const current = humanPlayer.affinity?.[otherId] ?? 0;
            humanPlayer.affinity[otherId] = current + delta;
          }
        }
      }
    }

    // Log message
    if(action.logMessage) {
      const logType = action.logType || 'info';
      global.addLog?.(action.logMessage, logType);
    }

    // Check for relationship state transitions
    if(global.checkStateTransition) {
      global.checkStateTransition(humanPlayer, targetPlayer);
      global.checkStateTransition(targetPlayer, humanPlayer);
    }

    // Update HUD
    global.updateHud?.();
  }

  /**
   * Convert legacy decision format to v2 format (migration helper)
   */
  function legacyToV2Format(legacyDecision) {
    const targetPlayer = legacyDecision.targetPlayer;
    
    return {
      type: 'legacy_converted',
      title: legacyDecision.title,
      targetPlayer: targetPlayer,
      lines: legacyDecision.lines || [],
      actions: (legacyDecision.actions || []).map(action => ({
        label: action.label,
        affinity: {},  // Legacy actions handle their own effects
        logMessage: null,
        onChoose: action.onChoose  // Preserve original handler
      })),
      metadata: {}
    };
  }

  /**
   * Batch convert interactions to popup options
   */
  function interactionBatchToPopups(interactions, humanPlayer) {
    return interactions
      .map(interaction => interactionToPopupOptions(interaction, humanPlayer))
      .filter(Boolean);
  }

  // ===== Exports =====

  global.SocialAdapter = {
    interactionToPopupOptions,
    legacyToV2Format,
    interactionBatchToPopups,
    determineTheme,
    applyInteractionEffects
  };

})(window);
