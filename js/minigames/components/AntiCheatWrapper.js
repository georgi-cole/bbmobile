// MODULE: minigames/components/AntiCheatWrapper.js
// Wrapper component to detect and prevent cheating during competition games
// Monitors AppState changes, prevents backgrounding, and detects copy/paste

(function(g){
  'use strict';

  /**
   * Create an anti-cheat wrapper for a game
   * Monitors for app backgrounding and suspicious activity
   * 
   * @param {HTMLElement} container - Container element for the game
   * @param {Object} options - Configuration options
   * @returns {Object} Wrapper interface
   */
  function createWrapper(container, options = {}){
    const {
      onCheatDetected = () => {},
      strictMode = true,
      showWarning = true,
      competitionMode = true
    } = options;

    let isActive = false;
    let isCompetitionPhase = false; // memorize or input phase
    let warningOverlay = null;
    let cheatDetected = false;

    /**
     * Handle visibility change (tab/window backgrounding)
     */
    function handleVisibilityChange(){
      if(!isActive || !strictMode || !isCompetitionPhase) return;
      
      if(document.hidden){
        console.warn('[AntiCheat] App backgrounded during competition phase');
        cheatDetected = true;
        
        if(showWarning){
          displayWarning('Game paused - you left the app during the competition!');
        }
        
        onCheatDetected({
          type: 'backgrounding',
          timestamp: Date.now(),
          phase: 'competition'
        });
      }
    }

    /**
     * Handle app state changes (mobile)
     */
    function handleAppStateChange(state){
      if(!isActive || !strictMode || !isCompetitionPhase) return;
      
      if(state === 'background' || state === 'inactive'){
        console.warn('[AntiCheat] App state changed to:', state);
        cheatDetected = true;
        
        if(showWarning){
          displayWarning('Competition invalidated - app was backgrounded!');
        }
        
        onCheatDetected({
          type: 'app_state_change',
          state,
          timestamp: Date.now(),
          phase: 'competition'
        });
      }
    }

    /**
     * Display warning overlay
     */
    function displayWarning(message){
      if(!warningOverlay){
        warningOverlay = document.createElement('div');
        warningOverlay.style.cssText = `
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(220, 38, 38, 0.95);
          color: white;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
          text-align: center;
          font-size: 1.2rem;
          font-weight: bold;
        `;
        
        container.style.position = 'relative';
        container.appendChild(warningOverlay);
      }
      
      warningOverlay.innerHTML = `
        <div style="font-size: 3rem; margin-bottom: 20px;">⚠️</div>
        <div style="margin-bottom: 10px;">${message}</div>
        <div style="font-size: 0.9rem; opacity: 0.9; margin-top: 10px;">
          This attempt has been marked as invalid.
        </div>
      `;
      
      warningOverlay.style.display = 'flex';
    }

    /**
     * Hide warning overlay
     */
    function hideWarning(){
      if(warningOverlay){
        warningOverlay.style.display = 'none';
      }
    }

    /**
     * Start monitoring (competition phase active)
     */
    function startMonitoring(){
      isActive = true;
      isCompetitionPhase = true;
      cheatDetected = false;
      hideWarning();
      
      // Add event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // For mobile app state monitoring (if available)
      if(g.addEventListener && typeof g.addEventListener === 'function'){
        // React Native AppState-like API
        g.addEventListener('appstatechange', handleAppStateChange);
      }
      
      console.info('[AntiCheat] Monitoring started');
    }

    /**
     * Stop monitoring (competition phase ended)
     */
    function stopMonitoring(){
      isCompetitionPhase = false;
      
      console.info('[AntiCheat] Monitoring stopped');
    }

    /**
     * Cleanup and remove all listeners
     */
    function cleanup(){
      isActive = false;
      isCompetitionPhase = false;
      
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      if(g.removeEventListener){
        g.removeEventListener('appstatechange', handleAppStateChange);
      }
      
      if(warningOverlay && warningOverlay.parentNode){
        warningOverlay.parentNode.removeChild(warningOverlay);
      }
      
      console.info('[AntiCheat] Cleanup complete');
    }

    /**
     * Check if cheat was detected
     */
    function wasCheatDetected(){
      return cheatDetected;
    }

    /**
     * Reset cheat state
     */
    function reset(){
      cheatDetected = false;
      hideWarning();
    }

    /**
     * Add competition banner to container
     */
    function addCompetitionBanner(){
      if(!competitionMode) return;
      
      const banner = document.createElement('div');
      banner.style.cssText = `
        background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%);
        color: white;
        padding: 8px 16px;
        text-align: center;
        font-weight: bold;
        font-size: 0.9rem;
        margin-bottom: 12px;
        border-radius: 6px;
        box-shadow: 0 2px 8px rgba(220, 38, 38, 0.3);
      `;
      banner.textContent = '🏆 COMPETITION MODE - Do not leave this screen!';
      
      container.insertBefore(banner, container.firstChild);
    }

    // Auto-add competition banner if in competition mode
    if(competitionMode && showWarning){
      addCompetitionBanner();
    }

    // Return wrapper interface
    return {
      startMonitoring,
      stopMonitoring,
      cleanup,
      wasCheatDetected,
      reset,
      displayWarning,
      hideWarning
    };
  }

  /**
   * Apply anti-copy protection to an element
   * Prevents text selection, copying, and context menu
   * 
   * @param {HTMLElement} element - Element to protect
   * @returns {Function} Cleanup function
   */
  function protectElement(element){
    if(!element) return () => {};
    
    // Apply styles
    element.style.userSelect = 'none';
    element.style.webkitUserSelect = 'none';
    element.style.mozUserSelect = 'none';
    element.style.msUserSelect = 'none';
    
    // Prevent events
    const preventDefault = (e) => {
      e.preventDefault();
      return false;
    };
    
    element.addEventListener('copy', preventDefault);
    element.addEventListener('cut', preventDefault);
    element.addEventListener('paste', preventDefault);
    element.addEventListener('contextmenu', preventDefault);
    element.addEventListener('selectstart', preventDefault);
    
    // Cleanup function
    return () => {
      element.style.userSelect = '';
      element.style.webkitUserSelect = '';
      element.style.mozUserSelect = '';
      element.style.msUserSelect = '';
      
      element.removeEventListener('copy', preventDefault);
      element.removeEventListener('cut', preventDefault);
      element.removeEventListener('paste', preventDefault);
      element.removeEventListener('contextmenu', preventDefault);
      element.removeEventListener('selectstart', preventDefault);
    };
  }

  // Export API
  g.AntiCheatWrapper = {
    createWrapper,
    protectElement
  };

  console.info('[AntiCheatWrapper] Module loaded');

})(window);
