// MODULE: minigames/core/lifecycle.js
// Central lifecycle manager for minigame execution
// Coordinates loading, rendering, completion, and cleanup

(function(g){
  'use strict';

  /**
   * Lifecycle phases for a minigame instance
   */
  const LifecyclePhase = {
    IDLE: 'idle',
    SELECTING: 'selecting',
    LOADING: 'loading',
    READY: 'ready',
    PLAYING: 'playing',
    COMPLETING: 'completing',
    COMPLETED: 'completed',
    ERROR: 'error',
    DISPOSED: 'disposed'
  };

  /**
   * Current lifecycle state
   */
  let currentState = {
    phase: LifecyclePhase.IDLE,
    gameKey: null,
    startTime: null,
    metadata: {},
    rendered: false  // Track if game successfully rendered
  };

  /**
   * Initialize a minigame lifecycle
   * @param {string} gameKey - The game to initialize
   * @param {Object} metadata - Additional metadata (playerId, phase, etc)
   * @returns {Object} Lifecycle instance
   */
  function initialize(gameKey, metadata = {}){
    if(currentState.phase !== LifecyclePhase.IDLE && 
       currentState.phase !== LifecyclePhase.COMPLETED &&
       currentState.phase !== LifecyclePhase.DISPOSED){
      console.warn('[Lifecycle] Initializing new game while previous still active:', currentState.gameKey);
      dispose();
    }

    currentState = {
      phase: LifecyclePhase.SELECTING,
      gameKey,
      startTime: Date.now(),
      metadata: { ...metadata }
    };

    console.info(`[Lifecycle] Initialized: ${gameKey}`, metadata);

    // Log to telemetry
    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logSelection(gameKey, {
        ...metadata,
        lifecycle: true
      });
    }

    return {
      gameKey,
      phase: currentState.phase,
      startTime: currentState.startTime
    };
  }

  /**
   * Mark game as loading
   * @param {string} gameKey - The game being loaded
   */
  function markLoading(gameKey){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markLoading called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    currentState.phase = LifecyclePhase.LOADING;
    currentState.loadStartTime = Date.now();

    console.info(`[Lifecycle] Loading: ${gameKey}`);

    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logEvent('load.start', {
        gameKey,
        ...currentState.metadata
      });
    }
  }

  /**
   * Mark game as ready to play
   * @param {string} gameKey - The game that is ready
   */
  function markReady(gameKey){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markReady called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    const loadTime = currentState.loadStartTime ? Date.now() - currentState.loadStartTime : 0;
    
    currentState.phase = LifecyclePhase.READY;
    currentState.rendered = true;  // Mark as successfully rendered

    console.info(`[Lifecycle] Ready: ${gameKey} (load: ${loadTime}ms)`);

    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logEvent('load.end', {
        gameKey,
        loadTimeMs: loadTime,
        ...currentState.metadata
      });
    }
  }

  /**
   * Mark game as actively playing
   * @param {string} gameKey - The game being played
   */
  function markPlaying(gameKey){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markPlaying called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    currentState.phase = LifecyclePhase.PLAYING;
    currentState.playStartTime = Date.now();

    console.info(`[Lifecycle] Playing: ${gameKey}`);

    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logStart(gameKey, {
        ...currentState.metadata
      });
    }
  }

  /**
   * Mark game as completing (score submitted)
   * @param {string} gameKey - The game completing
   * @param {number} score - Raw score
   * @returns {boolean} True if completion allowed, false if blocked
   */
  function markCompleting(gameKey, score){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markCompleting called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    // Guard: block completion if game hasn't rendered yet (phantom completion)
    if(!currentState.rendered){
      console.warn('[Lifecycle] ⚠️ Completion blocked - game not rendered yet:', gameKey);
      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logEvent('minigame.completion.blocked', {
          gameKey,
          attemptedBeforeRender: true,
          phase: currentState.phase
        });
      }
      return false;
    }

    const playTime = currentState.playStartTime ? Date.now() - currentState.playStartTime : 0;
    
    currentState.phase = LifecyclePhase.COMPLETING;
    currentState.score = score;
    currentState.playTime = playTime;

    console.info(`[Lifecycle] Completing: ${gameKey} (score: ${score}, time: ${playTime}ms)`);
    return true;
  }

  /**
   * Mark game as completed
   * @param {string} gameKey - The game that completed
   * @param {number} score - Final normalized score
   */
  function markCompleted(gameKey, score){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markCompleted called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    const totalTime = Date.now() - currentState.startTime;
    
    currentState.phase = LifecyclePhase.COMPLETED;
    currentState.finalScore = score;
    currentState.totalTime = totalTime;

    console.info(`[Lifecycle] Completed: ${gameKey} (score: ${score}, total: ${totalTime}ms)`);

    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logComplete(gameKey, {
        score: currentState.score,
        finalScore: score,
        playTimeMs: currentState.playTime,
        totalTimeMs: totalTime,
        ...currentState.metadata
      });
    }
  }

  /**
   * Mark game as errored
   * @param {string} gameKey - The game that errored
   * @param {Error|string} error - The error
   */
  function markError(gameKey, error){
    if(currentState.gameKey !== gameKey){
      console.warn('[Lifecycle] markError called for different game:', gameKey, 'vs', currentState.gameKey);
    }

    currentState.phase = LifecyclePhase.ERROR;
    currentState.error = error;

    console.error(`[Lifecycle] Error: ${gameKey}`, error);

    if(g.MinigameTelemetry){
      g.MinigameTelemetry.logError(gameKey, error, {
        ...currentState.metadata
      });
    }
  }

  /**
   * Dispose/cleanup current lifecycle
   */
  function dispose(){
    if(currentState.phase !== LifecyclePhase.IDLE && 
       currentState.phase !== LifecyclePhase.DISPOSED){
      
      console.info(`[Lifecycle] Disposing: ${currentState.gameKey}`);

      if(g.MinigameTelemetry){
        g.MinigameTelemetry.logEvent('dispose', {
          gameKey: currentState.gameKey,
          phase: currentState.phase,
          ...currentState.metadata
        });
      }

      currentState.phase = LifecyclePhase.DISPOSED;
    }

    // Reset to idle after brief delay to allow telemetry to flush
    setTimeout(() => {
      currentState = {
        phase: LifecyclePhase.IDLE,
        gameKey: null,
        startTime: null,
        metadata: {},
        rendered: false
      };
    }, 100);
  }

  /**
   * Get current lifecycle state
   * @returns {Object} Current state
   */
  function getState(){
    return {
      phase: currentState.phase,
      gameKey: currentState.gameKey,
      startTime: currentState.startTime,
      metadata: { ...currentState.metadata }
    };
  }

  /**
   * Check if a game is currently active
   * @returns {boolean} True if a game is active
   */
  function isActive(){
    return currentState.phase !== LifecyclePhase.IDLE &&
           currentState.phase !== LifecyclePhase.COMPLETED &&
           currentState.phase !== LifecyclePhase.DISPOSED;
  }

  // Export API
  g.MinigameLifecycle = {
    Phase: LifecyclePhase,
    initialize,
    markLoading,
    markReady,
    markPlaying,
    markCompleting,
    markCompleted,
    markError,
    dispose,
    getState,
    isActive
  };

  console.info('[MinigameLifecycle] Module loaded');

})(window);
