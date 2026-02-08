// MODULE: results-runtime-guard.js
// Runtime guard and diagnostics for competition results rendering
// Ensures all deployments have access to showCompetitionReveal API
// even if the implementation is missing from the build.
//
// Purpose:
// - Log availability of results rendering APIs at startup
// - Provide lightweight shim if showCompetitionReveal is missing
// - Enable safe rollout of unified inline results system
// - Provide diagnostics for production debugging
//
// Removal:
// This guard can be safely removed after all deployed builds
// include the native showCompetitionReveal implementation and
// the feature has been verified in production.

(function(global) {
  'use strict';
  
  console.info('[ResultsGuard] Initializing results API diagnostics');
  
  // Check availability of all results rendering APIs
  const apis = {
    showCompetitionReveal: typeof global.showCompetitionReveal === 'function',
    showTriSlotReveal: typeof global.showTriSlotReveal === 'function',
    showResultsPopup: typeof global.showResultsPopup === 'function',
    FinaleCinematics: typeof global.FinaleCinematics === 'object' && global.FinaleCinematics !== null
  };
  
  console.info('[ResultsGuard] API Availability:', apis);
  
  // If showCompetitionReveal is missing but showResultsPopup exists,
  // create a lightweight shim that wraps the popup into a promise
  if (!apis.showCompetitionReveal && apis.showResultsPopup) {
    console.warn('[ResultsGuard] showCompetitionReveal not found, installing shim wrapper around showResultsPopup');
    
    global.showCompetitionReveal = async function shimShowCompetitionReveal(title, scoresMap, ids) {
      console.info('[ResultsGuard][Shim] Using showResultsPopup as fallback for:', title);
      
      // Build topThree array from scoresMap
      const arr = [...scoresMap.entries()]
        .filter(([id]) => ids.includes(id))
        .map(([id, score]) => {
          const player = global.getP ? global.getP(id) : null;
          const name = player?.name || `Player ${id}`;
          
          // Get metadata if available
          const g = global.game;
          const meta = g?.lastCompScoresMeta?.get(id);
          
          const entry = {
            id: id,
            name: name,
            score: score
          };
          
          // Add raw score display if available
          if (meta?.rawScoreDisplay) {
            entry.rawScoreDisplay = meta.rawScoreDisplay;
          }
          
          // Add personal best indicator if available
          if (meta?.isNewPersonalBest) {
            entry.isNewPersonalBest = meta.isNewPersonalBest;
          }
          
          return entry;
        })
        .sort((a, b) => b.score - a.score);
      
      const topThree = arr.slice(0, 3);
      
      if (topThree.length === 0) {
        console.warn('[ResultsGuard][Shim] No valid scores to display');
        return;
      }
      
      // Determine phase for context
      const phase = global.game?.phase || '';
      
      // Call showResultsPopup with proper options
      return global.showResultsPopup({
        title: title,
        phase: phase,
        topThree: topThree,
        winnerEmoji: '👑',
        duration: 5000,
        rawScoreMode: topThree[0]?.rawScoreDisplay ? true : false,
        isNewPersonalBest: topThree[0]?.isNewPersonalBest || false
      });
    };
    
    console.info('[ResultsGuard] Shim installed successfully');
  } else if (!apis.showCompetitionReveal && !apis.showResultsPopup) {
    console.error('[ResultsGuard] Neither showCompetitionReveal nor showResultsPopup available - results may not display!');
  } else if (apis.showCompetitionReveal) {
    console.info('[ResultsGuard] Native showCompetitionReveal available - no shim needed');
  }
  
  // Set feature flag to force inline results as primary path
  // This can be overridden by game config if needed
  if (global.game && global.game.cfg) {
    if (global.game.cfg.forceInlineResults === undefined) {
      global.game.cfg.forceInlineResults = true;
      console.info('[ResultsGuard] Set forceInlineResults = true (can be overridden in game config)');
    }
  } else {
    console.warn('[ResultsGuard] Game object not yet available, forceInlineResults flag will be set when game initializes');
  }
  
  // Expose diagnostic function for runtime queries
  global.ResultsGuard = {
    getAvailability: function() {
      return {
        showCompetitionReveal: typeof global.showCompetitionReveal === 'function',
        showTriSlotReveal: typeof global.showTriSlotReveal === 'function',
        showResultsPopup: typeof global.showResultsPopup === 'function',
        FinaleCinematics: typeof global.FinaleCinematics === 'object' && global.FinaleCinematics !== null,
        isShimmed: global.showCompetitionReveal?.name === 'shimShowCompetitionReveal'
      };
    },
    
    logDiagnostics: function() {
      const availability = this.getAvailability();
      console.table(availability);
      return availability;
    },
    
    // Allow runtime toggling of forceInlineResults
    setForceInlineResults: function(value) {
      if (global.game && global.game.cfg) {
        global.game.cfg.forceInlineResults = !!value;
        console.info('[ResultsGuard] forceInlineResults set to:', !!value);
      } else {
        console.warn('[ResultsGuard] Cannot set forceInlineResults - game not initialized');
      }
    }
  };
  
  console.info('[ResultsGuard] Initialization complete. Use ResultsGuard.logDiagnostics() for details.');
  
})(window);
