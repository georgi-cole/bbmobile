// MODULE: progression-events.js
// Hooks game events into the progression XP system

(function(global) {
  'use strict';

  const SEASON_ID = 1; // Default season ID

  /**
   * Get current week from game state
   */
  function getCurrentWeek() {
    return global.game?.week || 1;
  }

  /**
   * Log XP event safely
   */
  async function logXP(eventType, playerId, payload = {}) {
    if (!global.Progression || typeof global.Progression.log !== 'function') {
      return;
    }

    try {
      await global.Progression.log(eventType, {
        seasonId: SEASON_ID,
        week: getCurrentWeek(),
        playerId: playerId,
        payload: payload
      });
    } catch (error) {
      console.error('[Progression Events] Failed to log XP:', error);
    }
  }

  /**
   * Hook: HOH competition winner
   */
  function onHOHWin(winnerId, participants = []) {
    logXP('HOH_WIN', winnerId);
    
    // Log participation for all participants (capped per-week by rules)
    participants.forEach(pId => {
      if (pId !== winnerId) {
        logXP('COMP_PARTICIPATE', pId);
      }
    });
  }

  /**
   * Hook: Nominations locked
   */
  function onNominations(nomineeIds = []) {
    nomineeIds.forEach(nomineeId => {
      logXP('NOMINATED', nomineeId);
    });
  }

  /**
   * Hook: Veto competition winner
   */
  function onPOVWin(winnerId, participants = []) {
    logXP('POV_WIN', winnerId);
    
    // Log participation for all participants (capped per-week by rules)
    participants.forEach(pId => {
      if (pId !== winnerId) {
        logXP('COMP_PARTICIPATE', pId);
      }
    });
  }

  /**
   * Hook: Veto ceremony - used on self
   */
  function onVetoUsedOnSelf(winnerId) {
    logXP('USED_VETO_ON_SELF', winnerId);
    logXP('REMOVED_FROM_BLOCK', winnerId);
  }

  /**
   * Hook: Veto ceremony - used on other
   */
  function onVetoUsedOnOther(winnerId, savedId) {
    logXP('USED_VETO_ON_OTHER', winnerId);
    logXP('REMOVED_FROM_BLOCK', savedId);
  }

  /**
   * Hook: Eviction votes counted
   */
  function onEvictionVotes(targetId, voteCount, voters = []) {
    // Each vote against adds negative XP
    for (let i = 0; i < voteCount; i++) {
      logXP('RECEIVED_VOTES_AGAINST', targetId, { count: voteCount });
    }
  }

  /**
   * Hook: Eviction survivor
   */
  function onSurviveEviction(survivorId) {
    logXP('SURVIVE_EVICTION', survivorId);
  }

  /**
   * Hook: Correct vote cast (voted with majority)
   */
  function onCorrectVote(voterId) {
    logXP('CAST_CORRECT_VOTE', voterId);
  }

  /**
   * Hook: Tiebreaker win (HOH breaks tie)
   */
  function onTiebreakerWin(hohId) {
    logXP('TIEBREAKER_WIN', hohId);
  }

  /**
   * Hook: Jury vote received
   */
  function onJuryVote(finalistId) {
    logXP('WON_JURY_VOTE', finalistId);
  }

  /**
   * Hook: Final winner
   */
  function onFinalWinner(winnerId) {
    logXP('WON_FINAL', winnerId);
  }

  /**
   * Hook: Public's favorite winner
   */
  function onPublicFavorite(winnerId) {
    logXP('WON_PUBLIC_FAVORITE', winnerId);
  }

  // Expose hooks on global
  global.ProgressionEvents = {
    onHOHWin,
    onNominations,
    onPOVWin,
    onVetoUsedOnSelf,
    onVetoUsedOnOther,
    onEvictionVotes,
    onSurviveEviction,
    onCorrectVote,
    onTiebreakerWin,
    onJuryVote,
    onFinalWinner,
    onPublicFavorite
  };

})(window);
