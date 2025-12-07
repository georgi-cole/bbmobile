// MODULE: phase-terminator.js
// Unified phase transition cleanup system
// Consolidates all subsystem termination logic to ensure clean phase boundaries

(function(global) {
  'use strict';

  // Configuration constants
  const SOCIAL_INTERMISSION_DELAYED_STOP_MIN_MS = 600;
  const SOCIAL_INTERMISSION_DELAYED_STOP_MAX_MS = 700;
  const SOCIAL_INTERMISSION_DELAYED_STOP_RANGE = SOCIAL_INTERMISSION_DELAYED_STOP_MAX_MS - SOCIAL_INTERMISSION_DELAYED_STOP_MIN_MS;
  
  /**
   * Debug logging helper - gated by debugSocialAI flag
   */
  function debugLog(message, ...args) {
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.debug(`[phase-cleanup] ${message}`, ...args);
    }
  }

  const PhaseTerminator = {
    /**
     * Run comprehensive cleanup when transitioning between phases
     * This is the single canonical place for phase cleanup logic
     * @param {string} previousPhase - The phase being exited
     * @param {string} nextPhase - The phase being entered
     * @param {number} token - Current phase token for verification
     */
    runCleanup(previousPhase, nextPhase, token) {
      const startTime = Date.now();
      const subsystems = {};
      
      console.info(`[phase-cleanup] Starting cleanup: ${previousPhase} → ${nextPhase} (token=${token})`);
      
      try {
        // 1. Stop Social AI Scheduler if running
        subsystems.socialAI = this._stopSocialAI(nextPhase);
        
        // 2. Close all vote UI (overlays, panels, countdowns)
        subsystems.voteUI = this._closeVoteUI();
        
        // 3. Flush pending competition overlays/minigames
        subsystems.competitions = this._cleanupCompetitions();
        
        // 4. Close socialize modal and resume timer if paused
        subsystems.socializeModal = this._closeSocializeModal();
        
        // 5. Cancel/accelerate card timeouts
        subsystems.cardQueue = this._cleanupCardQueue();
        
        // 6. Deactivate fast-forward if active
        subsystems.fastForward = this._deactivateFastForward(nextPhase);
        
        // 7. Clear phase-specific flags
        subsystems.phaseFlags = this._clearPhaseFlags(previousPhase);
        
        // 8. Clean up social maneuvers state
        subsystems.socialManeuvers = this._cleanupSocialManeuvers();
        
        // 9. Clear any lingering UI overlays
        subsystems.uiOverlays = this._cleanupUIOverlays();
        
      } catch (err) {
        console.error('[phase-cleanup] Error during cleanup:', err);
        subsystems.error = err.message;
      }
      
      const duration = Date.now() - startTime;
      console.info(`[phase-cleanup] Cleanup complete (${duration}ms)`, subsystems);
      
      return subsystems;
    },
    
    /**
     * Helper: Schedule delayed stop for AI scheduler
     * Uses randomized delay between min/max to allow scheduler ticks
     */
    _scheduleDelayedStop() {
      const delay = SOCIAL_INTERMISSION_DELAYED_STOP_MIN_MS + Math.floor(Math.random() * SOCIAL_INTERMISSION_DELAYED_STOP_RANGE);
      debugLog(`Scheduling delayed stop in ${delay}ms`);
      setTimeout(() => {
        if (typeof global.SocialAIScheduler?.stopAiSocialPhase === 'function') {
          global.SocialAIScheduler.stopAiSocialPhase('phase-terminator:delayed');
          debugLog('Social AI Scheduler stopped (delayed)');
        }
      }, delay);
    },
    
    /**
     * Helper: Check if scheduler is available and running
     */
    _isSchedulerRunning() {
      return global.SocialAIScheduler && 
             (global.SocialAIScheduler.isRunning?.() || false);
    },
    
    /**
     * Helper: Safely pause or delay-stop the AI scheduler
     * Tries pause first (if available), falls back to delayed stop
     * @param {string} reason - Reason for pause/delay (for logging)
     * @returns {string} Result status ('paused+delayed-stop', 'delayed-stop', 'already-stopped')
     */
    _safePauseOrDelayStop(reason) {
      debugLog(`safePauseOrDelayStop called, reason: ${reason}`);
      
      if (!this._isSchedulerRunning()) {
        debugLog('Scheduler not running, skipping pause/delay');
        return 'already-stopped';
      }
      
      // Try pause first if available
      if (typeof global.SocialAIScheduler.pauseAiSocialPhase === 'function') {
        global.SocialAIScheduler.pauseAiSocialPhase(reason);
        debugLog('Social AI Scheduler paused');
        this._scheduleDelayedStop();
        return 'paused+delayed-stop';
      } else {
        // Fallback: delay stop if pause() not available
        debugLog('Pause API not available, using delayed stop only');
        this._scheduleDelayedStop();
        return 'delayed-stop';
      }
    },
    
    /**
     * Stop Social AI Scheduler if it's running
     * Only stops for non-social phases that shouldn't have background social chatter
     * For social_intermission, uses pause/delayed stop to allow AI ticks to occur
     * @param {string} nextPhase - The phase being entered
     */
    _stopSocialAI(nextPhase) {
      try {
        // Special handling for social_intermission: pause + delayed stop
        // This allows AI scheduler to tick before cleanup completes
        if (nextPhase === 'social_intermission') {
          debugLog('Transitioning to social_intermission, using safe pause/delay');
          return this._safePauseOrDelayStop('phase-terminator');
        }
        
        // Standard handling for non-social phases: immediate stop
        // List of phases where social AI should NOT be running
        const NON_SOCIAL_PHASES = [
          'livevote', 'tiebreak', 'eviction',
          'hoh', 'nominations', 'veto_comp', 'veto', 'veto_ceremony',
          'final3_comp1', 'final3_comp2', 'final3_decision',
          'jury', 'jury_return', 'finale'
        ];
        
        const shouldStop = NON_SOCIAL_PHASES.includes(global.game?.phase);
        
        if (shouldStop && this._isSchedulerRunning()) {
          if (typeof global.SocialAIScheduler.stopAiSocialPhase === 'function') {
            global.SocialAIScheduler.stopAiSocialPhase('phase-terminator:immediate');
            debugLog('Social AI Scheduler stopped (immediate)');
            return 'stopped';
          }
        }
        
        return 'not-applicable';
      } catch (err) {
        console.warn('[phase-cleanup] Error stopping Social AI:', err);
        return 'error';
      }
    },
    
    /**
     * Close all vote-related UI elements
     */
    _closeVoteUI() {
      try {
        if (typeof global.closeAllVoteUI === 'function') {
          global.closeAllVoteUI();
          console.debug('[phase-cleanup] Vote UI closed');
          return 'closed';
        }
        return 'no-api';
      } catch (err) {
        console.warn('[phase-cleanup] Error closing vote UI:', err);
        return 'error';
      }
    },
    
    /**
     * Clean up active competitions and minigames
     */
    _cleanupCompetitions() {
      try {
        if (global.CompetitionFlow && typeof global.CompetitionFlow.cleanupOnPhaseChange === 'function') {
          global.CompetitionFlow.cleanupOnPhaseChange();
          console.debug('[phase-cleanup] Competition overlays cleaned');
          return 'cleaned';
        }
        return 'no-api';
      } catch (err) {
        console.warn('[phase-cleanup] Error cleaning competitions:', err);
        return 'error';
      }
    },
    
    /**
     * Close socialize modal if open
     */
    _closeSocializeModal() {
      try {
        // Close modal if it exists
        const modal = document.querySelector('.socialize-mobile-modal');
        if (modal && modal.parentNode) {
          modal.remove();
          console.debug('[phase-cleanup] Socialize modal removed');
          return 'closed';
        }
        
        // Resume timer if paused
        if (global.SocializeMobile && typeof global.SocializeMobile.resumeTimer === 'function') {
          global.SocializeMobile.resumeTimer();
        }
        
        return 'no-modal';
      } catch (err) {
        console.warn('[phase-cleanup] Error closing socialize modal:', err);
        return 'error';
      }
    },
    
    /**
     * Clean up card queue and pending cards
     */
    _cleanupCardQueue() {
      try {
        const actions = [];
        
        // Cancel all pending cards
        if (global.CardQueue && typeof global.CardQueue.cancelAll === 'function') {
          global.CardQueue.cancelAll();
          actions.push('cancelled');
          console.debug('[phase-cleanup] Card queue cancelled');
        }
        
        // If fast-forward is active, accelerate remaining timeouts
        if (global.game?.__ffActive && global.CardManager) {
          if (typeof global.CardManager.accelerateAll === 'function') {
            global.CardManager.accelerateAll();
            actions.push('accelerated');
            console.debug('[phase-cleanup] Cards accelerated (fast-forward)');
          }
        }
        
        return actions.length > 0 ? actions.join(',') : 'no-action';
      } catch (err) {
        console.warn('[phase-cleanup] Error cleaning card queue:', err);
        return 'error';
      }
    },
    
    /**
     * Deactivate fast-forward if active
     * Only deactivates on phase boundaries if configured
     */
    _deactivateFastForward(nextPhase) {
      try {
        // Don't deactivate fast-forward automatically - let the user control it
        // Only deactivate if we're entering a phase where fast-forward is explicitly excluded
        const FFWD_EXCLUDED_PHASES = ['lobby'];
        
        if (FFWD_EXCLUDED_PHASES.includes(nextPhase)) {
          if (global.game?.__ffActive) {
            if (typeof global.deactivateFastForward === 'function') {
              global.deactivateFastForward();
              console.debug('[phase-cleanup] Fast-forward deactivated (excluded phase)');
              return 'deactivated';
            }
          }
        }
        
        return global.game?.__ffActive ? 'still-active' : 'inactive';
      } catch (err) {
        console.warn('[phase-cleanup] Error deactivating fast-forward:', err);
        return 'error';
      }
    },
    
    /**
     * Clear phase-specific flags and state
     */
    _clearPhaseFlags(previousPhase) {
      try {
        const game = global.game;
        if (!game) return 'no-game';
        
        const cleared = [];
        
        // Veto ceremony flags
        if (previousPhase === 'veto_ceremony') {
          if (game.__finishVetoCompCalled) {
            delete game.__finishVetoCompCalled;
            cleared.push('__finishVetoCompCalled');
          }
          if (game.__vetoCeremonyStarted) {
            game.__vetoCeremonyStarted = false;
            cleared.push('__vetoCeremonyStarted');
          }
          if (game.__vetoCeremonyResolved) {
            game.__vetoCeremonyResolved = false;
            cleared.push('__vetoCeremonyResolved');
          }
        }
        
        // Social interim flags
        if (previousPhase === 'social' || previousPhase === 'social_intermission') {
          if (game.__socialInterimShown) {
            delete game.__socialInterimShown;
            cleared.push('__socialInterimShown');
          }
        }
        
        // Phase intro handles
        if (game.__introHandles) {
          delete game.__introHandles;
          cleared.push('__introHandles');
        }
        
        return cleared.length > 0 ? cleared.join(',') : 'none';
      } catch (err) {
        console.warn('[phase-cleanup] Error clearing phase flags:', err);
        return 'error';
      }
    },
    
    /**
     * Clean up social maneuvers state
     */
    _cleanupSocialManeuvers() {
      try {
        const game = global.game;
        if (!game) return 'no-game';
        
        // Don't clear the actual bank/resources, just the phase-specific UI state
        // The social maneuvers module will handle its own state management
        
        // Close launcher if visible
        const launcher = document.querySelector('.sm-launcher');
        if (launcher) {
          launcher.style.display = 'none';
          console.debug('[phase-cleanup] Social maneuvers launcher hidden');
          return 'hidden';
        }
        
        return 'no-ui';
      } catch (err) {
        console.warn('[phase-cleanup] Error cleaning social maneuvers:', err);
        return 'error';
      }
    },
    
    /**
     * Clean up any lingering UI overlays
     */
    _cleanupUIOverlays() {
      try {
        const cleaned = [];
        
        // Remove any orphaned overlays
        const overlaySelectors = [
          '.phase-change-overlay',
          '.minigame-instructions',
          '.ceremony-overlay'
        ];
        
        overlaySelectors.forEach(selector => {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            elements.forEach(el => el.remove());
            cleaned.push(selector);
          }
        });
        
        return cleaned.length > 0 ? cleaned.join(',') : 'none';
      } catch (err) {
        console.warn('[phase-cleanup] Error cleaning UI overlays:', err);
        return 'error';
      }
    }
  };
  
  // Export to global scope
  global.PhaseTerminator = PhaseTerminator;
  
  console.info('[phase-terminator] Module loaded');
  
})(typeof window !== 'undefined' ? window : global);
