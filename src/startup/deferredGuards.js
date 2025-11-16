// MODULE: startup/deferredGuards.js
// Central guard management for deferred initialization.
// Prevents premature game construction (cast, HUD, placeholders, opening sequence)
// until the user presses Play on the Intro Hub.
//
// USAGE:
// - Check DeferredGuards.isGameReadyToStart() before initializing game components
// - Use DeferredGuards.deferTask() to queue tasks that should run after Play
// - Call DeferredGuards.markGameReady() when Play button is pressed
// - Call DeferredGuards.flushDeferredTasks() to execute all queued tasks

(function(g) {
  'use strict';

  // ===== STATE =====
  
  let gameReadyToStart = false;
  let gameStarted = false;
  const deferredTasks = [];

  // ===== GUARD FLAGS =====

  /**
   * Check if game is ready to start building.
   * @returns {boolean} True if Play button has been pressed
   */
  function isGameReadyToStart() {
    return gameReadyToStart;
  }

  /**
   * Check if game has already started.
   * @returns {boolean} True if game has started (opening sequence triggered)
   */
  function isGameStarted() {
    return gameStarted;
  }

  /**
   * Mark that the game is ready to start (Play button pressed).
   * This unblocks all deferred tasks.
   */
  function markGameReady() {
    if (gameReadyToStart) {
      console.warn('[DeferredGuards] markGameReady() called multiple times, ignoring');
      return;
    }
    
    console.info('[DeferredGuards] Game is now ready to start');
    gameReadyToStart = true;
    
    // Set global flag for legacy compatibility
    g.__bbGameReadyToStart = true;
    
    // Emit event for observers
    if (g.bbGameBus) {
      g.bbGameBus.emit('game:ready-to-start', {});
    }
  }

  /**
   * Mark that the game has started (opening sequence triggered).
   * This prevents duplicate starts.
   */
  function markGameStarted() {
    if (gameStarted) {
      console.warn('[DeferredGuards] markGameStarted() called multiple times, ignoring');
      return;
    }
    
    console.info('[DeferredGuards] Game has started');
    gameStarted = true;
    
    // Set global flag for legacy compatibility
    g.__bbGameStarted = true;
    
    // Emit event for observers
    if (g.bbGameBus) {
      g.bbGameBus.emit('game:started', {});
    }
  }

  // ===== DEFERRED TASK QUEUE =====

  /**
   * Defer a task to run after the game is ready to start.
   * If the game is already ready, the task runs immediately.
   * 
   * @param {Function} task - Function to execute after Play is pressed
   * @param {string} [name] - Optional name for debugging
   */
  function deferTask(task, name = 'anonymous') {
    if (typeof task !== 'function') {
      console.error('[DeferredGuards] deferTask() requires a function, got:', typeof task);
      return;
    }

    if (gameReadyToStart) {
      // Game already ready, execute immediately
      console.info(`[DeferredGuards] Executing task immediately: ${name}`);
      try {
        task();
      } catch (err) {
        console.error(`[DeferredGuards] Error executing immediate task '${name}':`, err);
      }
    } else {
      // Game not ready, queue for later
      console.info(`[DeferredGuards] Deferring task: ${name}`);
      deferredTasks.push({ task, name });
    }
  }

  /**
   * Execute all deferred tasks in order.
   * Should be called after markGameReady() and before starting the game.
   */
  function flushDeferredTasks() {
    if (!gameReadyToStart) {
      console.warn('[DeferredGuards] flushDeferredTasks() called before markGameReady(), ignoring');
      return;
    }

    if (deferredTasks.length === 0) {
      console.info('[DeferredGuards] No deferred tasks to flush');
      return;
    }

    console.info(`[DeferredGuards] Flushing ${deferredTasks.length} deferred tasks...`);
    
    const tasks = deferredTasks.splice(0, deferredTasks.length);
    
    tasks.forEach(({ task, name }, index) => {
      try {
        console.info(`[DeferredGuards] Executing deferred task ${index + 1}/${tasks.length}: ${name}`);
        task();
      } catch (err) {
        console.error(`[DeferredGuards] Error executing deferred task '${name}':`, err);
      }
    });
    
    console.info('[DeferredGuards] All deferred tasks flushed');
  }

  /**
   * Clear all deferred tasks without executing them.
   * Useful for testing or cleanup.
   */
  function clearDeferredTasks() {
    const count = deferredTasks.length;
    deferredTasks.splice(0, deferredTasks.length);
    console.info(`[DeferredGuards] Cleared ${count} deferred tasks`);
  }

  // ===== DEBUGGING =====

  /**
   * Get current state for debugging.
   * @returns {Object} Current guard state
   */
  function getState() {
    return {
      gameReadyToStart,
      gameStarted,
      deferredTaskCount: deferredTasks.length,
      deferredTaskNames: deferredTasks.map(t => t.name)
    };
  }

  // ===== PUBLIC API =====

  g.DeferredGuards = {
    // Guard checks
    isGameReadyToStart,
    isGameStarted,
    
    // State management
    markGameReady,
    markGameStarted,
    
    // Task queue
    deferTask,
    flushDeferredTasks,
    clearDeferredTasks,
    
    // Debugging
    getState
  };

  console.info('[DeferredGuards] Module loaded');

})(window);
