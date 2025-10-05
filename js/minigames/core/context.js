// MODULE: minigames/core/context.js
// Shared context and utilities for minigames
// Provides common functionality needed by all games

(function(g){
  'use strict';

  /**
   * Create a context object for a minigame instance
   * This provides helpers and utilities that games can use
   * 
   * @param {string} gameKey - The game key
   * @param {HTMLElement} container - Container element
   * @param {Function} onComplete - Completion callback
   * @param {Object} options - Additional options
   * @returns {Object} Context object
   */
  function createContext(gameKey, container, onComplete, options = {}){
    const startTime = Date.now();
    let completed = false;

    /**
     * Context object provided to games
     */
    const context = {
      // Game identity
      gameKey,
      
      // Container management
      container,
      
      // Options
      options,
      
      /**
       * Complete the minigame with a score
       * @param {number} score - Raw score (0-100)
       */
      complete(score){
        if(completed){
          console.warn(`[Context] Game "${gameKey}" completed multiple times`);
          return;
        }
        
        completed = true;
        
        const elapsedMs = Date.now() - startTime;
        
        console.info(`[Context] Game "${gameKey}" completed with score ${score} (${elapsedMs}ms)`);
        
        // Mark in lifecycle
        if(g.MinigameLifecycle){
          g.MinigameLifecycle.markCompleting(gameKey, score);
        }
        
        // Stop watchdog
        if(g.MinigameWatchdog){
          g.MinigameWatchdog.stop(gameKey);
        }
        
        // Call completion handler
        if(typeof onComplete === 'function'){
          onComplete(score);
        }
      },
      
      /**
       * Report an error
       * @param {Error|string} error - The error
       */
      error(error){
        console.error(`[Context] Game "${gameKey}" error:`, error);
        
        // Mark in lifecycle
        if(g.MinigameLifecycle){
          g.MinigameLifecycle.markError(gameKey, error);
        }
        
        // Use error handler if available
        if(g.MinigameErrorHandler){
          g.MinigameErrorHandler.handleError(gameKey, error, container, onComplete, options);
        } else {
          // Fallback: complete with median score
          context.complete(50);
        }
      },
      
      /**
       * Get game metadata from registry
       * @returns {Object|null} Game metadata
       */
      getMetadata(){
        if(g.MinigameRegistry){
          return g.MinigameRegistry.getGame(gameKey);
        }
        return null;
      },
      
      /**
       * Check if player prefers reduced motion
       * @returns {boolean} True if reduced motion preferred
       */
      prefersReducedMotion(){
        if(g.MinigameAccessibility && g.MinigameAccessibility.prefersReducedMotion){
          return g.MinigameAccessibility.prefersReducedMotion();
        }
        // Fallback check
        return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      },
      
      /**
       * Get responsive container helper
       * @returns {Object|null} Mobile utils or null
       */
      getMobileUtils(){
        return g.MinigameMobileUtils || null;
      },
      
      /**
       * Get accessibility helper
       * @returns {Object|null} Accessibility module or null
       */
      getAccessibility(){
        return g.MinigameAccessibility || null;
      },
      
      /**
       * Log a message (for debugging)
       * @param {string} message - Message to log
       * @param {Object} data - Additional data
       */
      log(message, data = {}){
        console.info(`[${gameKey}] ${message}`, data);
      },
      
      /**
       * Clear container contents
       */
      clearContainer(){
        if(container){
          container.innerHTML = '';
        }
      },
      
      /**
       * Create a styled button
       * @param {string} text - Button text
       * @param {Function} onClick - Click handler
       * @param {string} className - Additional CSS classes
       * @returns {HTMLElement} Button element
       */
      createButton(text, onClick, className = ''){
        const btn = document.createElement('button');
        btn.className = `btn ${className}`.trim();
        btn.textContent = text;
        
        if(typeof onClick === 'function'){
          btn.addEventListener('click', onClick);
        }
        
        // Make accessible if helper available
        if(g.MinigameAccessibility && g.MinigameAccessibility.makeAccessibleButton){
          g.MinigameAccessibility.makeAccessibleButton(btn, { label: text });
        }
        
        return btn;
      },
      
      /**
       * Create a timer display
       * @param {number} seconds - Initial seconds
       * @returns {Object} Timer object with element and update method
       */
      createTimer(seconds){
        const timerEl = document.createElement('div');
        timerEl.className = 'minigame-timer';
        timerEl.setAttribute('role', 'timer');
        timerEl.setAttribute('aria-live', 'polite');
        
        let remaining = seconds;
        
        function update(newSeconds){
          remaining = newSeconds;
          timerEl.textContent = `Time: ${Math.ceil(remaining)}s`;
          
          // Visual warning at 10s
          if(remaining <= 10){
            timerEl.classList.add('warning');
          } else {
            timerEl.classList.remove('warning');
          }
        }
        
        update(seconds);
        
        return {
          element: timerEl,
          update,
          getRemaining: () => remaining
        };
      },
      
      /**
       * Create a score display
       * @param {number} score - Initial score
       * @returns {Object} Score object with element and update method
       */
      createScore(score = 0){
        const scoreEl = document.createElement('div');
        scoreEl.className = 'minigame-score';
        scoreEl.setAttribute('role', 'status');
        scoreEl.setAttribute('aria-live', 'polite');
        
        let current = score;
        
        function update(newScore){
          current = newScore;
          scoreEl.textContent = `Score: ${Math.floor(current)}`;
        }
        
        update(score);
        
        return {
          element: scoreEl,
          update,
          getScore: () => current
        };
      }
    };
    
    return context;
  }

  // Export API
  g.MinigameContext = {
    createContext
  };

  console.info('[MinigameContext] Module loaded');

})(window);
