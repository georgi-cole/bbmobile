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
      
      try {
        // Create new card
        const result = factory();
        
        if(!result || !result.card){
          console.error('[CardManager] Factory did not return a card');
          this.isShowing = false;
          return;
        }
        
        // Track new card
        this.currentCard = result.card;
        this.currentTimeline = result.timeline || null;
        this.dismissalTimeout = result.timeout || null;
        
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
      } catch(e){
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
     * Get debug info about current state.
     */
    getDebugInfo(){
      return {
        hasCard: !!this.currentCard,
        cardClass: this.currentCard ? this.currentCard.className : null,
        hasTimeline: !!this.currentTimeline,
        hasTimeout: !!this.dismissalTimeout,
        isShowing: this.isShowing
      };
    }
  };
  
  // Export to global namespace
  global.CardManager = CardManager;
  
  // Note: Phase transition listeners are NOT auto-installed here to avoid
  // wrapping setPhase multiple times. Instead, veto.js and social.js explicitly
  // call CardManager.clear() at ceremony/phase boundaries.
  
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
