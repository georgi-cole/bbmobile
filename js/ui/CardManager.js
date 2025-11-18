// MODULE: CardManager.js
// Centralized card lifecycle manager to prevent overlapping/lingering cards.
// Guarantees only one card is visible at any time.
// Integrates with uiCleanup.js for ephemeral UI tracking

(function(global){
  'use strict';

  const CardManager = {
    // State tracking
    currentCard: null,           // Current card DOM node
    currentTimeline: null,        // Active GSAP timeline (if any)
    dismissalTimeout: null,       // Pending auto-dismissal timeout
    isShowing: false,             // Flag to prevent concurrent shows
    
    // Phase token & timeout tracking (for stuck card prevention)
    _phaseToken: 0,               // Incremented on each phase change
    __pendingTimeouts: [],        // Registry of all scheduled timeouts
    __pendingTimeoutData: [],     // Registry of timeout metadata (callback, originalDuration)
    
    /**
     * Show a new card. Automatically hides current card before showing new one.
     * @param {Function} factory - Function that creates and returns {card, timeline?, timeout?}
     * @returns {Promise} Resolves when new card is shown
     */
    async show(factory){
      // Wait for any current card to be hidden
      await this.hideCurrent();
      
      // Prevent concurrent shows
      if(this.isShowing){
        console.warn('[CardManager] Card show already in progress, waiting...');
        await new Promise(resolve => setTimeout(resolve, 100));
        return this.show(factory);
      }
      
      this.isShowing = true;
      
      // Capture current phase token to validate later
      const myToken = this._phaseToken;
      
      try {
        // Create new card
        const result = factory();
        
        if(!result || !result.card){
          console.error('[CardManager] Factory did not return a card');
          this.isShowing = false;
          return;
        }
        
        // PHASE GUARD: If phase changed during factory execution, abort
        if(myToken !== this._phaseToken){
          console.warn('[CardManager] Phase changed during card creation, aborting show');
          // Remove card if it was created
          if(result.card && result.card.parentNode){
            result.card.parentNode.removeChild(result.card);
          }
          // Clear any timeout that was created
          if(result.timeout){
            clearTimeout(result.timeout);
          }
          this.isShowing = false;
          return;
        }
        
        // Track new card
        this.currentCard = result.card;
        this.currentTimeline = result.timeline || null;
        this.dismissalTimeout = result.timeout || null;
        
        // Auto-register timeout if factory returned one
        if(result.timeout){
          this.registerTimeout(result.timeout);
        }
        
        // Mark card as ephemeral if UICleanup is available
        if(global.UICleanup && typeof global.UICleanup.markEphemeral === 'function'){
          global.UICleanup.markEphemeral(this.currentCard);
        }
        
        console.log('[CardManager] ✓ Card shown:', this.currentCard.className);
      } catch(e){
        console.error('[CardManager] Error showing card:', e);
      } finally {
        this.isShowing = false;
      }
    },
    
    /**
     * Hide the current card if one exists.
     * @param {Object} options - Hiding options
     * @param {boolean} options.immediate - If true, skip animations
     * @returns {Promise} Resolves when card is hidden
     */
    async hideCurrent(options){
      options = options || {};
      
      // Kill active GSAP timeline
      if(this.currentTimeline){
        try {
          if(typeof this.currentTimeline.kill === 'function'){
            this.currentTimeline.kill();
          }
        } catch(e){
          console.error('[CardManager] Error killing timeline:', e);
        }
        this.currentTimeline = null;
      }
      
      // Clear dismissal timeout
      if(this.dismissalTimeout){
        try {
          clearTimeout(this.dismissalTimeout);
        } catch(e){
          console.error('[CardManager] Error clearing timeout:', e);
        }
        this.dismissalTimeout = null;
      }
      
      // Remove card from DOM
      if(this.currentCard){
        try {
          if(options.immediate){
            // Immediate removal
            if(this.currentCard.parentNode){
              this.currentCard.parentNode.removeChild(this.currentCard);
            }
          } else {
            // Animated removal
            this.currentCard.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
            this.currentCard.style.opacity = '0';
            this.currentCard.style.transform = 'scale(0.95)';
            
            await new Promise(resolve => setTimeout(resolve, 200));
            
            if(this.currentCard && this.currentCard.parentNode){
              this.currentCard.parentNode.removeChild(this.currentCard);
            }
          }
          
          console.log('[CardManager] ✓ Card hidden');
        } catch(e){
          console.error('[CardManager] Error removing card:', e);
        }
        
        this.currentCard = null;
      }
    },
    
    /**
     * Clear all cards immediately (for phase boundaries).
     * @param {boolean} immediate - If true, skip animations (default: true)
     * @returns {Promise} Resolves when cleared
     */
    async clear(immediate){
      immediate = immediate !== false; // Default to true
      
      console.log('[CardManager] Clearing all cards' + (immediate ? ' (immediate)' : ''));
      
      // Cancel all pending timeouts
      this.cancelAllTimeouts();
      
      await this.hideCurrent({ immediate: immediate });
      
      // Also clear TV overlay content as defensive measure
      try {
        const content = document.querySelector('.tvOverlayContent');
        if(content){
          content.innerHTML = '';
        }
      } catch(e){
        console.error('[CardManager] Error clearing TV overlay:', e);
      }
      
      // Clear decision deck (social phase cards)
      try {
        const deck = document.getElementById('decisionDeck');
        if(deck){
          deck.remove();
        }
      } catch(_){
        // Deck may not exist, that's OK
      }
    },
    
    /**
     * Runtime assertion: verify only one card exists in DOM.
     * Logs warning if multiple cards found.
     */
    assertSingleCard(){
      try {
        const cards = document.querySelectorAll('.revealCard, .diaryRoomCard, .decisionCard');
        if(cards.length > 1){
          console.warn('[CardManager] ⚠ ASSERTION FAILED: Multiple cards found in DOM:', cards.length);
          console.warn('[CardManager] Cards:', Array.from(cards).map(c => c.className));
          return false;
        }
        return true;
      } catch(e){
        console.error('[CardManager] Error asserting single card:', e);
        return false;
      }
    },
    
    /**
     * Register a timeout for tracking and automatic cancellation.
     * @param {number} timeoutId - setTimeout return value
     * @param {Function} callback - The callback function (for fast-forward replay)
     * @param {number} originalDuration - Original duration in ms (for fast-forward compression)
     */
    registerTimeout(timeoutId, callback, originalDuration){
      if(timeoutId){
        this.__pendingTimeouts.push(timeoutId);
        this.__pendingTimeoutData.push({
          id: timeoutId,
          callback: callback,
          originalDuration: originalDuration || 0
        });
      }
    },
    
    /**
     * Unregister a completed timeout from tracking.
     * Call this when a timeout naturally completes to clean up the registry.
     * @param {number} timeoutId - setTimeout return value to remove
     */
    __unregisterTimeout(timeoutId){
      if(timeoutId){
        const index = this.__pendingTimeouts.indexOf(timeoutId);
        if(index !== -1){
          this.__pendingTimeouts.splice(index, 1);
        }
      }
    },
    
    /**
     * Cancel all registered timeouts.
     */
    cancelAllTimeouts(){
      console.log('[CardManager] Cancelling', this.__pendingTimeouts.length, 'pending timeouts');
      
      for(let i = 0; i < this.__pendingTimeouts.length; i++){
        try {
          clearTimeout(this.__pendingTimeouts[i]);
        } catch(_){
          // Ignore errors from already-cleared timeouts
        }
      }
      
      // Clear the registry
      this.__pendingTimeouts = [];
      this.__pendingTimeoutData = [];
    },
    
    /**
     * Accelerate all pending timeouts by replaying them with compressed durations.
     * Used by fast-forward mode to preserve all callbacks while compressing time.
     * @returns {Promise<void>}
     */
    async acceleratePendingTimeouts(){
      if(!this.__pendingTimeoutData || this.__pendingTimeoutData.length === 0){
        return;
      }
      
      console.info(`[CardManager] Accelerating ${this.__pendingTimeoutData.length} pending timeout(s)`);
      
      // Copy the current timeout data and clear registries
      const timeoutsToReplay = this.__pendingTimeoutData.slice();
      this.cancelAllTimeouts();
      
      // Replay each callback with compressed duration
      for(const data of timeoutsToReplay){
        if(!data.callback) continue;
        
        const originalMs = data.originalDuration || 0;
        const compressedMs = global.normalizeDuration ? global.normalizeDuration(originalMs) : Math.max(40, originalMs * 0.1);
        
        console.debug(`[CardManager] Replaying callback: ${originalMs}ms -> ${compressedMs}ms`);
        
        // Wait compressed duration
        await new Promise(resolve => setTimeout(resolve, compressedMs));
        
        // Execute callback
        try {
          data.callback();
        } catch(e){
          console.error('[CardManager] Error replaying callback:', e);
        }
      }
      
      console.info('[CardManager] ✓ All timeouts accelerated');
    },
    
    /**
     * Called when phase changes. Increments phase token and cancels all pending timeouts.
     * @param {string} newPhase - The new phase name
     */
    onPhaseChange(newPhase){
      console.log('[CardManager] Phase change detected:', newPhase, '(token', this._phaseToken, '->', this._phaseToken + 1 + ')');
      
      // Increment phase token to invalidate any in-flight card operations
      this._phaseToken++;
      
      // Cancel all pending timeouts to prevent late card shows
      this.cancelAllTimeouts();
      
      // Clear current card immediately
      this.clear(true).catch(e => {
        console.error('[CardManager] Error clearing on phase change:', e);
      });
    },
    
    /**
     * Get debug info about current state.
     */
    getDebugInfo(){
      return {
        hasCard: !!this.currentCard,
        cardClass: this.currentCard ? this.currentCard.className : null,
        hasTimeline: !!this.currentTimeline,
        hasTimeout: !!this.dismissalTimeout,
        isShowing: this.isShowing,
        phaseToken: this._phaseToken,
        pendingTimeouts: this.__pendingTimeouts.length
      };
    }
  };
  
  // Export to global namespace
  global.CardManager = CardManager;
  
  // Note: Phase transition listeners are NOT auto-installed here to avoid
  // wrapping setPhase multiple times. Instead, veto.js and social.js explicitly
  // call CardManager.clear() at ceremony/phase boundaries.
  
  // Register drainer with SkipController for skip/fast-forward integration
  async function cardManagerDrainer(){
    let didWork = false;
    
    // Check if fast-forward is active (vs old-style skip/drain)
    const game = global.game || {};
    const isFastForward = game.__ffActive === true;
    
    if(isFastForward){
      // Fast-forward mode: accelerate pending timeouts instead of canceling
      if(CardManager.__pendingTimeoutData && CardManager.__pendingTimeoutData.length > 0){
        console.info('[CardManager] Fast-forward: accelerating timeouts');
        await CardManager.acceleratePendingTimeouts();
        didWork = true;
      }
    } else {
      // Legacy skip/drain mode: cancel timeouts and clear cards
      if(CardManager.__pendingTimeouts && CardManager.__pendingTimeouts.length > 0){
        CardManager.cancelAllTimeouts();
        didWork = true;
      }
      
      if(CardManager.currentCard){
        CardManager.clear(true); // Immediate clear, no animation
        didWork = true;
      }
    }
    
    return didWork;
  }
  
  // Register drainer when SkipController is available
  if(global.SkipController && typeof global.SkipController.registerDrainer === 'function'){
    global.SkipController.registerDrainer('cardManager', cardManagerDrainer);
    console.info('[CardManager] ✓ Drainer registered with SkipController');
  }
  
  // Debug: Log card manager state every 5 seconds in dev mode
  if(global.location && global.location.hostname === 'localhost'){
    setInterval(() => {
      const info = CardManager.getDebugInfo();
      if(info.hasCard){
        console.log('[CardManager] Debug:', info);
        CardManager.assertSingleCard();
      }
    }, 5000);
  }

})(typeof window !== 'undefined' ? window : global);
