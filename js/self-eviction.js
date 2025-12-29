// MODULE: self-eviction.js
// Centralized, phase-aware self-eviction logic for Big Brother game.
// Handles nominees, HOH, POV, endgame (F4/F3/F2), and AI/manual/human origins.
// Ensures idempotent, atomic operations with proper game flow preservation.

(function(global){
  'use strict';

  // Guard flag to prevent duplicate self-eviction processing
  let selfEvictionInProgress = false;

  /**
   * Determine if AI self-eviction is allowed in the current phase (safe window)
   * Safe window: after eviction, before HOH (during intermission)
   * @returns {boolean} True if AI self-eviction is allowed
   */
  function isAISelfEvictionSafeWindow(){
    const g = global.game;
    if(!g) return false;
    
    // Safe window: intermission phase (between eviction and HOH)
    const safePhases = ['intermission', 'lobby'];
    return safePhases.includes(g.phase);
  }

  /**
   * Get the role of a player in the current week
   * @param {number} playerId - Player ID
   * @returns {object} Role information { isNominee, isHOH, isPOV, isNone }
   */
  function getPlayerRole(playerId){
    const g = global.game;
    if(!g) return { isNominee: false, isHOH: false, isPOV: false, isNone: true };

    const isNominee = Array.isArray(g.nominees) && g.nominees.includes(playerId);
    const isHOH = g.hohId === playerId;
    const isPOV = g.vetoHolder === playerId;
    const isNone = !isNominee && !isHOH && !isPOV;

    return { isNominee, isHOH, isPOV, isNone };
  }

  /**
   * Determine current game phase context for self-eviction logic
   * @returns {object} Phase context
   */
  function getPhaseContext(){
    const g = global.game;
    if(!g) return { phase: 'unknown', aliveCount: 0, isEndgame: false };

    const alive = global.alivePlayers ? global.alivePlayers() : [];
    const aliveCount = alive.length;
    const isEndgame = aliveCount <= 4; // F4, F3, F2
    const isF4 = aliveCount === 4;
    const isF3 = aliveCount === 3;
    const isF2 = aliveCount === 2;

    // Determine if we're before or after veto ceremony
    const beforeVeto = ['nominations', 'veto_comp'].includes(g.phase);
    const duringVeto = g.phase === 'veto_ceremony';
    const afterVeto = ['livevote', 'final4_eviction'].includes(g.phase) || 
                      (g.phase === 'nominations' && g.nomsLocked && g.vetoHolder !== null);

    return {
      phase: g.phase,
      aliveCount,
      isEndgame,
      isF4,
      isF3,
      isF2,
      beforeVeto,
      duringVeto,
      afterVeto,
      nomsLocked: g.nomsLocked,
      vetoUsed: g.vetoSavedId !== null && g.vetoSavedId !== undefined
    };
  }

  /**
   * Central self-eviction handler with phase-aware branching
   * @param {number} playerId - ID of player self-evicting
   * @param {string} origin - Origin: 'human', 'ai', 'manual', 'admin'
   * @returns {boolean} True if self-eviction was processed
   */
  function handleSelfEviction(playerId, origin = 'human'){
    const g = global.game;
    
    // Guard: prevent duplicate processing
    if(selfEvictionInProgress){
      console.warn('[self-eviction] Already processing, ignoring duplicate request');
      return false;
    }

    const player = global.getP ? global.getP(playerId) : null;
    if(!player){
      console.error('[self-eviction] Invalid player ID:', playerId);
      return false;
    }

    if(player.evicted){
      console.warn('[self-eviction] Player already evicted:', player.name);
      return false;
    }

    // AI origin validation: must be in safe window
    if(origin === 'ai' && !isAISelfEvictionSafeWindow()){
      console.warn('[self-eviction] AI self-eviction blocked - not in safe window');
      
      // Show modal for AI random event (not manual/admin)
      if(typeof global.showCard === 'function'){
        global.showCard(
          'Self-Eviction Blocked',
          [`${player.name} attempted to self-evict but was prevented (wrong timing).`],
          'info',
          3000,
          true
        );
      }
      return false;
    }

    // Set guard flag
    selfEvictionInProgress = true;

    try {
      const role = getPlayerRole(playerId);
      const context = getPhaseContext();

      console.info(`[self-eviction] Processing self-eviction for ${player.name}`, {
        origin,
        role,
        context
      });

      // Show modal for AI random events
      // NOTE: This card will be shown BEFORE the eviction visual animation
      // Use a custom title with emoji to make it stand out
      if(origin === 'ai' && typeof global.showCard === 'function'){
        global.showCard(
          'I\'ve had it 😤',
          [`${player.name} has decided to self-evict from the Big Brother house.`],
          'warn',
          4000,
          true
        );
      }

      // Branch based on role and phase
      if(role.isNominee){
        return handleNomineeSelfEviction(playerId, context);
      } else if(role.isHOH){
        return handleHOHSelfEviction(playerId, context);
      } else if(role.isPOV){
        return handlePOVSelfEviction(playerId, context);
      } else {
        return handleNonRoleSelfEviction(playerId, context);
      }
    } catch(error) {
      console.error('[self-eviction] Error processing self-eviction:', error);
      return false;
    } finally {
      // Clear guard flag
      selfEvictionInProgress = false;
    }
  }

  /**
   * Handle nominee self-eviction
   * @param {number} playerId - Player ID
   * @param {object} context - Phase context
   * @returns {boolean} Success
   */
  async function handleNomineeSelfEviction(playerId, context){
    const g = global.game;
    
    console.info('[self-eviction] Handling nominee self-eviction', context);

    if(context.beforeVeto){
      // Nominee self-evicts before veto ceremony: HOH must renominate
      await processEviction(playerId, 'self');
      
      // Clear the self-evicting nominee from nominations
      if(Array.isArray(g.nominees)){
        g.nominees = g.nominees.filter(id => id !== playerId);
      }
      
      // If we need more nominees, prompt HOH to renominate
      if(g.nominees.length < 2 && !context.isEndgame){
        if(typeof global.showCard === 'function'){
          global.showCard(
            'Renomination Required',
            ['The HOH must name a replacement nominee.'],
            'warn',
            3500,
            true
          );
        }
        
        // Unlock nominations for renomination
        g.nomsLocked = false;
        g.__nomsCommitInProgress = false;
        g.__nomsCommitted = false;
        
        // Trigger renomination
        setTimeout(() => {
          if(typeof global.renderNomsPanel === 'function'){
            global.renderNomsPanel();
          }
        }, 100);
      } else {
        // If at endgame or enough nominees remain, continue to veto
        continueToNextPhase(context);
      }
      
      return true;
    } else if(context.afterVeto || context.phase === 'livevote'){
      // Nominee self-evicts after veto or during voting: null eviction, week ends
      
      // Invalidate any votes/ballots if voting has started
      if(g.eviction && Array.isArray(g.eviction.votes)){
        g.eviction.votes = [];
        g.eviction.sequenceStarted = false;
        g.eviction.sequenceDone = false;
        g.eviction.revealed = false;
        console.info('[self-eviction] Invalidated votes due to nominee self-eviction');
      }
      
      await processEviction(playerId, 'self');
      
      // Clear all badges
      clearAllBadges();
      
      // Null eviction - week ends
      if(typeof global.showCard === 'function'){
        global.showCard(
          'Week Ends',
          ['Due to self-eviction, the week concludes with no vote.'],
          'info',
          3500,
          true
        );
      }
      
      await endWeekAndProceed();
      return true;
    } else if(context.duringVeto){
      // During veto ceremony: process eviction and continue week
      await processEviction(playerId, 'self');
      
      // Remove from nominees
      if(Array.isArray(g.nominees)){
        g.nominees = g.nominees.filter(id => id !== playerId);
      }
      
      // If we need more nominees, continue week
      continueToNextPhase(context);
      return true;
    }

    return false;
  }

  /**
   * Handle HOH self-eviction
   * @param {number} playerId - Player ID
   * @param {object} context - Phase context
   * @returns {boolean} Success
   */
  async function handleHOHSelfEviction(playerId, context){
    const g = global.game;
    
    console.info('[self-eviction] Handling HOH self-eviction');

    await processEviction(playerId, 'self');
    
    // Clear nominations and HOH badge
    g.hohId = null;
    g.nominees = [];
    g.nomsLocked = false;
    
    // Clear all badges
    clearAllBadges();
    
    // Show message
    if(typeof global.showCard === 'function'){
      global.showCard(
        'Week Cancelled',
        ['The HOH has self-evicted. The week ends, and no one else is evicted.'],
        'info',
        4000,
        true
      );
    }
    
    // Week ends, proceed to next week
    await endWeekAndProceed();
    
    return true;
  }

  /**
   * Handle POV holder self-eviction
   * @param {number} playerId - Player ID
   * @param {object} context - Phase context
   * @returns {boolean} Success
   */
  async function handlePOVSelfEviction(playerId, context){
    const g = global.game;
    
    console.info('[self-eviction] Handling POV holder self-eviction', context);

    // Special F4 handling
    if(context.isF4){
      await processEviction(playerId, 'self');
      
      // At F4, POV holder self-evicting skips the week and proceeds to F3
      if(typeof global.showCard === 'function'){
        global.showCard(
          'Final 4 → Final 3',
          ['POV holder self-evicted. Proceeding directly to Final 3.'],
          'info',
          4000,
          true
        );
      }
      
      clearAllBadges();
      
      // Skip to F3
      setTimeout(() => {
        if(typeof global.startFinal3Flow === 'function'){
          global.startFinal3Flow();
        } else {
          endWeekAndProceed();
        }
      }, 500);
      
      return true;
    }

    if(context.beforeVeto || context.phase === 'veto_comp'){
      // Pre-ceremony: skip veto ceremony
      await processEviction(playerId, 'self');
      
      g.vetoHolder = null;
      
      if(typeof global.showCard === 'function'){
        global.showCard(
          'Veto Ceremony Skipped',
          ['POV holder self-evicted before ceremony. Proceeding to eviction.'],
          'info',
          3500,
          true
        );
      }
      
      // Skip to live vote
      setTimeout(() => {
        if(typeof global.startLiveVote === 'function'){
          global.startLiveVote();
        }
      }, 500);
      
      return true;
    } else if(context.afterVeto || context.duringVeto){
      // Post-ceremony: continue week normally
      await processEviction(playerId, 'self');
      
      g.vetoHolder = null;
      
      if(typeof global.showCard === 'function'){
        global.showCard(
          'Week Continues',
          ['POV holder self-evicted. The week continues as scheduled.'],
          'info',
          3000,
          true
        );
      }
      
      continueToNextPhase(context);
      return true;
    }

    return false;
  }

  /**
   * Handle self-eviction for player with no special role
   * @param {number} playerId - Player ID
   * @param {object} context - Phase context
   * @returns {boolean} Success
   */
  async function handleNonRoleSelfEviction(playerId, context){
    console.info('[self-eviction] Handling non-role self-eviction');

    await processEviction(playerId, 'self');
    
    if(typeof global.showCard === 'function'){
      const player = global.getP ? global.getP(playerId) : null;
      global.showCard(
        'Self-Evicted',
        [player ? player.name : 'Houseguest'],
        'evict',
        3800,
        true
      );
    }
    
    // Update records and continue week
    continueToNextPhase(context);
    
    return true;
  }

  /**
   * Process the actual eviction (mark player as evicted, update records)
   * @param {number} playerId - Player ID
   * @param {string} reason - Reason for eviction
   */
  async function processEviction(playerId, reason){
    const g = global.game;
    const player = global.getP ? global.getP(playerId) : null;
    if(!player) return;

    // Mark player as evicted
    player.evicted = true;
    player.weekEvicted = g.week;
    
    // Mark as self-evicted to exclude from jury house
    player.selfEvicted = true;
    
    // Enable auto-mode for self-evicted player
    player.autoMode = true;
    
    // Assign final rank
    const aliveCount = global.alivePlayers ? global.alivePlayers().length + 1 : 1;
    player.finalRank = aliveCount;
    
    console.info(`[self-eviction] Processed eviction for ${player.name}, finalRank=${player.finalRank}, selfEvicted=${player.selfEvicted}, autoMode=${player.autoMode}`);

    // Add to jury only if not self-evicted (self-evicted players are excluded from jury house)
    const JURY_START_AT = 9;
    if(aliveCount <= JURY_START_AT && g.cfg && g.cfg.enableJuryHouse && !player.selfEvicted){
      if(!g.juryHouse) g.juryHouse = [];
      if(!g.juryHouse.includes(playerId)){
        g.juryHouse.push(playerId);
      }
    }
    
    // Trigger jury integration if available
    try {
      if(typeof global.juryOnEviction === 'function'){
        global.juryOnEviction(playerId);
      }
    } catch(e) {
      console.warn('[self-eviction] Error in juryOnEviction:', e);
    }

    // Log the self-eviction
    if(typeof global.addLog === 'function'){
      global.addLog(`Self-eviction: <b>${player.name}</b> has left the game.`, 'danger');
    }

    // Update PlayerService with current alive players after self-eviction
    if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
      global.PlayerService.setAlivePlayers(g.players);
    }

    // Notify visual system to suppress red X during animation
    if(typeof global.notifyEvictedForVisual === 'function'){
      global.notifyEvictedForVisual(playerId);
    }

    // Run eviction visual enhancement (avatar animation + roster badge update)
    if(typeof global.runEvictionVisual === 'function'){
      try{
        await global.runEvictionVisual(playerId, { reason: 'self' });
      }catch(e){
        console.error('[self-eviction] visual enhancement failed:', e);
      }
    }

    // Note: Suppression clearing and HUD update now handled by runEvictionVisual
  }

  /**
   * Clear all badges (HOH, nominees, POV) after eviction
   */
  function clearAllBadges(){
    const g = global.game;
    
    g.nominees = [];
    g.vetoHolder = null;
    g.nomsLocked = false;
    g.hohId = null;
    
    if(Array.isArray(g.players)){
      g.players.forEach(p => {
        p.nominated = false;
        p.hoh = false;
      });
    }
    
    console.info('[self-eviction] Cleared all badges');
    
    if(typeof global.syncPlayerBadgeStates === 'function'){
      global.syncPlayerBadgeStates();
    }
    
    if(typeof global.updateHud === 'function'){
      global.updateHud();
    }
  }

  /**
   * Continue to next phase in game flow
   * @param {object} context - Phase context
   */
  function continueToNextPhase(context){
    const g = global.game;
    
    // Check for endgame transitions
    const alive = global.alivePlayers ? global.alivePlayers() : [];
    
    if(alive.length === 2){
      // Start jury vote
      setTimeout(() => {
        if(typeof global.startJuryVote === 'function'){
          global.startJuryVote();
        }
      }, 700);
      return;
    }
    
    if(alive.length === 3){
      // Start Final 3
      setTimeout(() => {
        if(typeof global.startFinal3Flow === 'function'){
          global.startFinal3Flow();
        }
      }, 700);
      return;
    }

    // Continue with current phase or advance
    if(context.phase === 'nominations' && !context.nomsLocked){
      // Stay in nominations
      return;
    }
    
    if(context.beforeVeto){
      // Proceed to veto comp
      setTimeout(() => {
        if(typeof global.startVeto === 'function'){
          global.startVeto();
        }
      }, 500);
      return;
    }
    
    if(context.phase === 'veto_ceremony'){
      // Proceed to live vote
      setTimeout(() => {
        if(typeof global.startLiveVote === 'function'){
          global.startLiveVote();
        }
      }, 500);
      return;
    }

    // Default: continue week
    if(typeof global.updateHud === 'function'){
      global.updateHud();
    }
  }

  /**
   * End the week and proceed to next week or endgame
   */
  async function endWeekAndProceed(){
    const g = global.game;
    
    // Clear all role-related state
    clearAllBadges();
    
    // Use existing postEvictionRouting if available
    if(typeof global.postEvictionRouting === 'function'){
      await global.postEvictionRouting();
    } else if(typeof global.proceedNextWeek === 'function'){
      await global.proceedNextWeek();
    } else {
      // Fallback: manual advance
      if(Array.isArray(g.players)){
        g.players.forEach(p => p.nominated = false);
      }
      g.__nomsCommitInProgress = false;
      g.__nomsCommitted = false;
      g._pendingNoms = null;
      g.week++;
      
      // Call socialOnNewWeek at week rollover (Social Maneuvers weekly reset)
      // Guard to run once per week by tracking the last reset week
      if(!g.__socialWeeklyResetWeek || g.__socialWeeklyResetWeek < g.week){
        g.__socialWeeklyResetWeek = g.week;
        if(typeof global.socialOnNewWeek === 'function'){
          try{
            global.socialOnNewWeek();
            console.info('[self-eviction] ✓ Called socialOnNewWeek for week', g.week);
          }catch(e){
            console.error('[self-eviction] socialOnNewWeek failed:', e);
          }
        }
      }
      
      if(typeof global.updateHud === 'function'){
        global.updateHud();
      }
      
      // Start HOH
      setTimeout(() => {
        if(typeof global.startHOH === 'function'){
          global.startHOH();
        }
      }, 500);
    }
  }

  /**
   * Request self-eviction with confirmation modal (for human players)
   * @param {number} playerId - Player ID
   * @returns {Promise<boolean>} True if confirmed and processed
   */
  async function requestHumanSelfEviction(playerId){
    const player = global.getP ? global.getP(playerId) : null;
    if(!player){
      console.error('[self-eviction] Invalid player for self-eviction request');
      return false;
    }

    if(player.evicted){
      console.warn('[self-eviction] Player already evicted');
      return false;
    }

    // Show confirmation modal
    const confirmed = await showSelfEvictionConfirmation(player.name);
    if(!confirmed) return false;

    // Process self-eviction
    return handleSelfEviction(playerId, 'human');
  }

  /**
   * Show confirmation modal for self-eviction
   * @param {string} playerName - Name of player
   * @returns {Promise<boolean>} True if confirmed
   */
  async function showSelfEvictionConfirmation(playerName){
    if(typeof global.showConfirm === 'function'){
      return await global.showConfirm(
        'Are you sure you want to leave the house?',
        {
          title: 'Self-Eviction',
          confirmText: 'Yes',
          cancelText: 'No',
          tone: 'danger'
        }
      );
    } else {
      // Fallback to native confirm
      return confirm('Are you sure you want to leave the house?');
    }
  }

  // Export functions
  global.selfEviction = {
    handle: handleSelfEviction,
    requestHuman: requestHumanSelfEviction,
    isAISafeWindow: isAISelfEvictionSafeWindow,
    getPlayerRole: getPlayerRole,
    getPhaseContext: getPhaseContext
  };

  // Keep backward compatibility
  global.handleSelfEviction = handleSelfEviction;

})(window);
