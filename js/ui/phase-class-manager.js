// MODULE: phase-class-manager.js
// Purpose: Apply phase-specific classes to DOM for CSS targeting
// Ensures .is-social-phase is applied to appropriate containers on both desktop and mobile

(function(global){
  'use strict';
  
  const PhaseClassManager = {
    /**
     * Apply phase class to appropriate DOM elements
     * Targets: body, .wrap, #actionCard for maximum CSS selector coverage
     */
    applyPhaseClass(phase) {
      const isSocialPhase = phase === 'social_intermission' || phase === 'social';
      
      // Target elements
      const body = document.body;
      const wrap = document.querySelector('.wrap');
      const actionCard = document.getElementById('actionCard');
      
      if (isSocialPhase) {
        // Add social phase class
        body?.classList.add('is-social-phase');
        wrap?.classList.add('is-social-phase');
        actionCard?.classList.add('is-social-phase');
        
        // Add data attribute for CSS [attr] selectors
        body?.setAttribute('data-phase', phase);
        body?.setAttribute('data-social-phase', 'true');
        
        console.info('[PhaseClassManager] ✓ Applied .is-social-phase class');
      } else {
        // Remove social phase class
        body?.classList.remove('is-social-phase');
        wrap?.classList.remove('is-social-phase');
        actionCard?.classList.remove('is-social-phase');
        
        // Update data attribute
        body?.setAttribute('data-phase', phase || 'normal');
        body?.removeAttribute('data-social-phase');
        
        console.info('[PhaseClassManager] ✓ Removed .is-social-phase class');
      }
    },
    
    /**
     * Initialize phase class manager
     * Wraps setPhase to automatically apply classes on phase change
     */
    init() {
      const g = global.game || {};
      
      // Apply initial phase class if phase is already set
      if (g.phase) {
        this.applyPhaseClass(g.phase);
      }
      
      // Wrap setPhase to automatically apply classes
      if (global.setPhase && !global.__phaseClassManagerWrapped) {
        global.__phaseClassManagerWrapped = true;
        
        const originalSetPhase = global.setPhase;
        global.setPhase = function wrappedSetPhaseForClasses(phase, duration, callback) {
          // Apply phase class before calling original
          PhaseClassManager.applyPhaseClass(phase);
          
          // Call original setPhase
          return originalSetPhase.call(this, phase, duration, callback);
        };
        
        console.info('[PhaseClassManager] ✓ Wrapped setPhase for automatic class application');
      }
    },
    
    /**
     * Check current phase class state (for debugging)
     */
    getState() {
      const body = document.body;
      return {
        bodyHasClass: body?.classList.contains('is-social-phase'),
        bodyDataPhase: body?.getAttribute('data-phase'),
        bodyDataSocial: body?.getAttribute('data-social-phase'),
        wrapHasClass: document.querySelector('.wrap')?.classList.contains('is-social-phase'),
        actionCardHasClass: document.getElementById('actionCard')?.classList.contains('is-social-phase')
      };
    }
  };
  
  // Auto-initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      PhaseClassManager.init();
    });
  } else {
    // DOM already loaded
    PhaseClassManager.init();
  }
  
  // Expose globally
  global.PhaseClassManager = PhaseClassManager;
  
})(window);
