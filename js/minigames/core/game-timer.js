// MODULE: minigames/core/game-timer.js
// Reusable GameTimer component for consistent timing across minigames
// Supports countdown/countup modes, pause/resume, and DOM rendering

(function(g){
  'use strict';

  /**
   * GameTimer - Universal timer for minigames
   * 
   * @class
   * @param {string} category - Game category (arcade, endurance, logic, trivia)
   * @param {Object} options - Configuration options
   * @param {number} options.duration - Duration in milliseconds (overrides category default)
   * @param {string} options.countDirection - 'up' or 'down' (overrides category default)
   * @param {boolean} options.showTimer - Whether to show timer UI (overrides category default)
   * @param {boolean} options.autoStart - Whether to start timer immediately (default: false)
   */
  class GameTimer {
    constructor(category, options = {}){
      this.category = category;
      this.options = options;
      
      // Get category configuration
      const categoryConfig = g.TimerConfig ? g.TimerConfig.getTimerConfig(category) : {};
      
      // Merge options with category defaults
      this.duration = options.duration !== undefined ? options.duration : categoryConfig.default;
      this.countDirection = options.countDirection || categoryConfig.countDirection || 'down';
      this.showTimer = options.showTimer !== undefined ? options.showTimer : (categoryConfig.showTimer !== false);
      
      // Timer state
      this.startTimeMs = null;
      this.pausedTimeMs = null;
      this.elapsedMs = 0;
      this.isRunning = false;
      this.isPaused = false;
      this.rafId = null;
      
      // Callbacks
      this.tickCallbacks = [];
      this.completeCallbacks = [];
      
      // DOM elements
      this.timerElement = null;
      
      // Auto-start if requested
      if(options.autoStart){
        this.start();
      }
    }

    /**
     * Start the timer
     */
    start(){
      if(this.isRunning){
        console.warn('[GameTimer] Timer already running');
        return;
      }
      
      this.startTimeMs = performance.now();
      this.isRunning = true;
      this.isPaused = false;
      this._tick();
    }

    /**
     * Pause the timer
     */
    pause(){
      if(!this.isRunning || this.isPaused){
        console.warn('[GameTimer] Timer not running or already paused');
        return;
      }
      
      this.isPaused = true;
      this.pausedTimeMs = performance.now();
      
      if(this.rafId){
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
    }

    /**
     * Resume the timer from paused state
     */
    resume(){
      if(!this.isRunning || !this.isPaused){
        console.warn('[GameTimer] Timer not paused');
        return;
      }
      
      // Adjust start time to account for pause duration
      const pauseDuration = performance.now() - this.pausedTimeMs;
      this.startTimeMs += pauseDuration;
      this.pausedTimeMs = null;
      this.isPaused = false;
      
      this._tick();
    }

    /**
     * Stop the timer
     * @param {boolean} triggerComplete - Whether to trigger completion callbacks (default: false)
     */
    stop(triggerComplete = false){
      if(!this.isRunning){
        return;
      }
      
      this.isRunning = false;
      this.isPaused = false;
      
      if(this.rafId){
        cancelAnimationFrame(this.rafId);
        this.rafId = null;
      }
      
      if(triggerComplete){
        this._triggerComplete();
      }
    }

    /**
     * Get remaining time in milliseconds (for countdown timers)
     * @returns {number} Remaining time in milliseconds, or 0 if elapsed
     */
    getRemaining(){
      if(this.duration === null){
        return 0; // No duration limit
      }
      
      const remaining = this.duration - this.elapsedMs;
      return Math.max(0, remaining);
    }

    /**
     * Get elapsed time in milliseconds
     * @returns {number} Elapsed time in milliseconds
     */
    getElapsed(){
      return this.elapsedMs;
    }

    /**
     * Register a tick callback (called every frame)
     * @param {Function} callback - Function(elapsedMs, remainingMs)
     */
    onTick(callback){
      if(typeof callback === 'function'){
        this.tickCallbacks.push(callback);
      }
    }

    /**
     * Register a completion callback (called when timer reaches duration)
     * @param {Function} callback - Function()
     */
    onComplete(callback){
      if(typeof callback === 'function'){
        this.completeCallbacks.push(callback);
      }
    }

    /**
     * Render timer UI to a container element
     * @param {HTMLElement} container - Container element for timer display
     * @returns {HTMLElement} Timer element
     */
    render(container){
      if(!container){
        console.warn('[GameTimer] No container provided for render');
        return null;
      }
      
      // Create timer element if it doesn't exist
      if(!this.timerElement){
        this.timerElement = document.createElement('div');
        this.timerElement.className = 'game-timer';
        this.timerElement.style.cssText = `
          font-size: 1.2rem;
          font-weight: bold;
          color: #83bfff;
          text-align: center;
          padding: 8px 16px;
          background: rgba(28, 39, 52, 0.8);
          border: 1px solid #2c3a4d;
          border-radius: 8px;
          min-width: 100px;
          font-family: 'Courier New', monospace;
          letter-spacing: 1px;
        `;
        
        // Add ARIA attributes for accessibility
        this.timerElement.setAttribute('role', 'timer');
        this.timerElement.setAttribute('aria-live', 'polite');
        this.timerElement.setAttribute('aria-atomic', 'true');
      }
      
      // Append to container if not already there
      if(this.timerElement.parentElement !== container){
        container.appendChild(this.timerElement);
      }
      
      // Initial render
      this._updateDisplay();
      
      return this.timerElement;
    }

    /**
     * Format time as MM:SS or M:SS.s
     * @param {number} ms - Time in milliseconds
     * @param {boolean} showDecimal - Show decimal seconds (default: true)
     * @returns {string} Formatted time string
     */
    formatTime(ms, showDecimal = true){
      const totalSeconds = Math.max(0, ms) / 1000;
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      
      if(showDecimal){
        const sec = Math.floor(seconds);
        const dec = Math.floor((seconds - sec) * 10);
        return `${minutes}:${sec.toString().padStart(2, '0')}.${dec}`;
      } else {
        return `${minutes}:${Math.floor(seconds).toString().padStart(2, '0')}`;
      }
    }

    /**
     * Internal tick function (called every frame)
     * @private
     */
    _tick(){
      if(!this.isRunning || this.isPaused){
        return;
      }
      
      // Calculate elapsed time
      this.elapsedMs = performance.now() - this.startTimeMs;
      
      // Calculate remaining time
      const remainingMs = this.getRemaining();
      
      // Update display if timer element exists
      this._updateDisplay();
      
      // Call tick callbacks
      this.tickCallbacks.forEach(cb => {
        try {
          cb(this.elapsedMs, remainingMs);
        } catch(err){
          console.error('[GameTimer] Tick callback error:', err);
        }
      });
      
      // Check for completion (countdown timers only)
      if(this.duration !== null && this.elapsedMs >= this.duration){
        this.stop(true);
        return;
      }
      
      // Schedule next tick
      this.rafId = requestAnimationFrame(() => this._tick());
    }

    /**
     * Update timer display
     * @private
     */
    _updateDisplay(){
      if(!this.timerElement){
        return;
      }
      
      let displayTime;
      if(this.countDirection === 'down'){
        displayTime = this.formatTime(this.getRemaining());
      } else {
        displayTime = this.formatTime(this.elapsedMs);
      }
      
      this.timerElement.textContent = displayTime;
      
      // Update ARIA label
      const timeDesc = this.countDirection === 'down' ? 'remaining' : 'elapsed';
      this.timerElement.setAttribute('aria-label', `Timer: ${displayTime} ${timeDesc}`);
      
      // Visual warning for low time (countdown only)
      if(this.countDirection === 'down' && this.duration !== null){
        const remaining = this.getRemaining();
        if(remaining < 10000){ // Less than 10 seconds
          this.timerElement.style.color = '#ff6b6b';
          this.timerElement.style.animation = 'pulse 0.5s ease-in-out infinite';
        } else if(remaining < 30000){ // Less than 30 seconds
          this.timerElement.style.color = '#ffd96b';
        } else {
          this.timerElement.style.color = '#83bfff';
          this.timerElement.style.animation = 'none';
        }
      }
    }

    /**
     * Trigger completion callbacks
     * @private
     */
    _triggerComplete(){
      this.completeCallbacks.forEach(cb => {
        try {
          cb();
        } catch(err){
          console.error('[GameTimer] Complete callback error:', err);
        }
      });
    }

    /**
     * Clean up timer resources
     */
    destroy(){
      this.stop();
      
      if(this.timerElement && this.timerElement.parentElement){
        this.timerElement.parentElement.removeChild(this.timerElement);
      }
      
      this.tickCallbacks = [];
      this.completeCallbacks = [];
      this.timerElement = null;
    }
  }

  // Export to global namespace
  g.GameTimer = GameTimer;

})(window.game = window.game || {});
