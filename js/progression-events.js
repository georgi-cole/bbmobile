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
    // Check feature flag first
    if (!global.Progression || typeof global.Progression.log !== 'function') {
      return;
    }

    // Verify progression is enabled via feature flag
    if (global.Progression.isEnabled && !global.Progression.isEnabled()) {
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
    logXP('RECEIVED_VOTES_AGAINST', targetId, { count: voteCount });
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

  /**
   * Hook: POV used at ceremony
   */
  function onPOVUsed(userId, savedId) {
    logXP('POV_USED', userId, { savedId });
  }

  /**
   * Hook: Survived nomination (stayed on block but not evicted)
   */
  function onSurviveNomination(survivorId) {
    logXP('SURVIVE_NOMINATION', survivorId);
  }

  /**
   * Hook: Survived tied eviction vote
   */
  function onSurviveTie(survivorId, votes) {
    logXP('SURVIVE_TIE', survivorId, { votes });
  }

  /**
   * Hook: Saved by someone else using veto
   */
  function onSavedByVeto(savedId, vetoUserId) {
    logXP('SAVED_BY_VETO', savedId, { vetoUserId });
  }

  /**
   * Hook: 2nd place in competition
   */
  function onComp2ndPlace(playerId, compType) {
    logXP('COMP_2ND_PLACE', playerId, { compType });
  }

  /**
   * Hook: 3rd place in competition
   */
  function onComp3rdPlace(playerId, compType) {
    logXP('COMP_3RD_PLACE', playerId, { compType });
  }

  /**
   * Hook: Won with all jury votes (unanimous)
   */
  function onWonAllJuryVotes(winnerId, totalVotes) {
    logXP('WON_ALL_JURY_VOTES', winnerId, { totalVotes });
  }

  /**
   * Hook: Skipped competition (did not participate)
   */
  function onSkipCompetition(playerId, compType) {
    logXP('SKIP_COMPETITION', playerId, { compType });
  }

  /**
   * Hook: Last place in competition
   */
  function onLastPlaceComp(playerId, compType) {
    logXP('LAST_PLACE_COMP', playerId, { compType });
  }

  /**
   * Hook: Player evicted
   * Dynamic penalty: lose more points if evicted earlier
   * No penalty if evicted at final 5 or later
   */
  function onEvicted(playerId, placement, totalPlayers) {
    const week = getCurrentWeek();
    
    // placement = final placement (1=winner, 2=runner-up, 3=3rd place, etc.)
    // No penalty for final 5 or later (placement 1-5)
    if (placement <= 5) {
      return;
    }
    
    // Dynamic penalty based on how early evicted
    // Week 1-2: -100 XP, Week 3-4: -75 XP, Week 5-6: -50 XP, etc.
    const basePenalty = -100;
    const weekReduction = Math.floor((week - 1) / 2) * 25;
    const adjustedPenalty = Math.max(basePenalty + weekReduction, -25);
    
    logXP('EVICTED', playerId, { 
      placement, 
      week, 
      penalty: adjustedPenalty
    });
  }

  /**
   * Hook: Clean week (not nominated once this week)
   * Should only be called once per week per player
   */
  function onCleanWeek(playerId) {
    logXP('CLEAN_WEEK', playerId);
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
    onPublicFavorite,
    onPOVUsed,
    onSurviveNomination,
    onSurviveTie,
    onSavedByVeto,
    onComp2ndPlace,
    onComp3rdPlace,
    onWonAllJuryVotes,
    onSkipCompetition,
    onLastPlaceComp,
    onEvicted,
    onCleanWeek
  };

})(window);
