// MODULE: anti-cheat.js
// Anti-cheat validation system for minigame submissions
// Enforces play time, input requirements, visibility checks, and input cadence variability
// Designed to work alongside AntiCheatWrapper for comprehensive protection

(function(g){
  'use strict';

  /**
   * Default thresholds for anti-cheat validation
   */
  const DEFAULT_THRESHOLDS = {
    minPlayTime: 3000,        // Minimum 3 seconds to complete a game
    maxDuration: 300000,      // Maximum 5 minutes for a game
    minDistinctInputs: 3,     // Minimum 3 distinct user inputs
    minCadenceVariability: 0.15, // Minimum coefficient of variation for input timing
    allowNoInputGames: true   // Allow games with zero inputs (some games are watch-only)
  };

  /**
   * Active sessions map
   * Key: sessionId (unique per minigame instance)
   * Value: session metadata
   */
  const activeSessions = new Map();

  /**
   * Session ID counter
   */
  let sessionIdCounter = 0;

  /**
   * Create a new anti-cheat session
   * Call this when starting a minigame
   * 
   * @param {Object} options - Session options
   * @param {Object} options.thresholds - Custom thresholds (optional)
   * @param {HTMLElement} options.container - Game container for event tracking
   * @param {string} options.gameKey - Game identifier (for debugging)
   * @returns {string} sessionId - Unique session identifier
   */
  function startSession(options = {}){
    const {
      thresholds = {},
      container = null,
      gameKey = 'unknown'
    } = options;

    const sessionId = `ac-${++sessionIdCounter}-${Date.now()}`;
    
    const session = {
      id: sessionId,
      gameKey,
      startTime: Date.now(),
      endTime: null,
      inputs: [],
      backgroundEvents: [],
      visibilityHidden: false,
      wasBackgrounded: false,
      thresholds: { ...DEFAULT_THRESHOLDS, ...thresholds },
      container,
      eventListeners: []
    };

    // Track visibility changes
    const handleVisibilityChange = () => {
      if(document.hidden){
        session.visibilityHidden = true;
        session.wasBackgrounded = true;
        session.backgroundEvents.push({
          type: 'visibility',
          timestamp: Date.now()
        });
        console.warn('[AntiCheat] Session backgrounded:', sessionId);
      } else {
        session.visibilityHidden = false;
      }
    };

    // Track user inputs if container provided
    const trackInput = (event) => {
      const timestamp = Date.now();
      session.inputs.push({
        type: event.type,
        timestamp,
        target: event.target?.tagName || 'unknown'
      });
    };

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    session.eventListeners.push({
      target: document,
      event: 'visibilitychange',
      handler: handleVisibilityChange
    });

    // Track inputs on container if provided
    if(container){
      const inputEvents = ['click', 'touchstart', 'keydown', 'mousedown'];
      inputEvents.forEach(eventType => {
        container.addEventListener(eventType, trackInput, true);
        session.eventListeners.push({
          target: container,
          event: eventType,
          handler: trackInput
        });
      });
    }

    activeSessions.set(sessionId, session);
    console.info('[AntiCheat] Session started:', sessionId, 'for game:', gameKey);
    
    return sessionId;
  }

  /**
   * End an anti-cheat session
   * Call this when minigame completes
   * 
   * @param {string} sessionId - Session identifier
   * @returns {Object|null} Session metadata for validation
   */
  function endSession(sessionId){
    const session = activeSessions.get(sessionId);
    
    if(!session){
      console.warn('[AntiCheat] Session not found:', sessionId);
      return null;
    }

    session.endTime = Date.now();

    // Clean up event listeners
    session.eventListeners.forEach(({ target, event, handler }) => {
      target.removeEventListener(event, handler, true);
    });

    console.info('[AntiCheat] Session ended:', sessionId);
    
    return session;
  }

  /**
   * Validate a session against anti-cheat rules
   * Call this before submitting score
   * 
   * @param {string} sessionId - Session identifier
   * @returns {Object} Validation result with { valid: boolean, reason: string, metadata: Object }
   */
  function validate(sessionId){
    const session = activeSessions.get(sessionId);
    
    if(!session){
      console.warn('[AntiCheat] Cannot validate - session not found:', sessionId);
      return {
        valid: true, // Be lenient if session tracking failed
        reason: 'session-not-found',
        metadata: {}
      };
    }

    // Ensure session is ended
    if(!session.endTime){
      session.endTime = Date.now();
    }

    const playTime = session.endTime - session.startTime;
    const distinctInputs = getDistinctInputCount(session.inputs);
    const cadenceVariability = calculateCadenceVariability(session.inputs);
    
    const metadata = {
      sessionId: session.id,
      gameKey: session.gameKey,
      playTime,
      distinctInputs,
      totalInputs: session.inputs.length,
      cadenceVariability,
      wasBackgrounded: session.wasBackgrounded,
      backgroundEvents: session.backgroundEvents.length
    };

    // Check 1: Minimum play time
    if(playTime < session.thresholds.minPlayTime){
      console.warn('[AntiCheat] Validation failed: Too fast', metadata);
      return {
        valid: false,
        reason: `Game completed too quickly (${(playTime/1000).toFixed(1)}s < ${(session.thresholds.minPlayTime/1000).toFixed(1)}s minimum)`,
        metadata
      };
    }

    // Check 2: Maximum duration
    if(playTime > session.thresholds.maxDuration){
      console.warn('[AntiCheat] Validation failed: Too slow', metadata);
      return {
        valid: false,
        reason: `Game took too long (${(playTime/60000).toFixed(1)}m > ${(session.thresholds.maxDuration/60000).toFixed(1)}m maximum)`,
        metadata
      };
    }

    // Check 3: Minimum distinct inputs (unless game allows zero inputs)
    if(!session.thresholds.allowNoInputGames || distinctInputs > 0){
      if(distinctInputs < session.thresholds.minDistinctInputs){
        console.warn('[AntiCheat] Validation failed: Too few inputs', metadata);
        return {
          valid: false,
          reason: `Too few distinct inputs (${distinctInputs} < ${session.thresholds.minDistinctInputs} minimum)`,
          metadata
        };
      }
    }

    // Check 4: Input cadence variability (only if we have enough inputs)
    if(session.inputs.length >= 3 && cadenceVariability !== null){
      if(cadenceVariability < session.thresholds.minCadenceVariability){
        console.warn('[AntiCheat] Validation failed: Input pattern too uniform', metadata);
        return {
          valid: false,
          reason: `Input pattern appears automated (variability: ${cadenceVariability.toFixed(2)} < ${session.thresholds.minCadenceVariability} minimum)`,
          metadata
        };
      }
    }

    // Check 5: Backgrounding (integrated with AntiCheatWrapper checks)
    if(session.wasBackgrounded){
      console.warn('[AntiCheat] Validation failed: App was backgrounded', metadata);
      return {
        valid: false,
        reason: 'App was backgrounded during gameplay',
        metadata
      };
    }

    console.info('[AntiCheat] Validation passed:', metadata);
    return {
      valid: true,
      reason: 'passed',
      metadata
    };
  }

  /**
   * Clean up a session (remove from active sessions)
   * 
   * @param {string} sessionId - Session identifier
   */
  function cleanup(sessionId){
    const session = activeSessions.get(sessionId);
    
    if(session){
      // Clean up any remaining event listeners
      session.eventListeners.forEach(({ target, event, handler }) => {
        try {
          target.removeEventListener(event, handler, true);
        } catch(e){
          // Ignore errors during cleanup
        }
      });
      
      activeSessions.delete(sessionId);
      console.info('[AntiCheat] Session cleaned up:', sessionId);
    }
  }

  /**
   * Helper: Get count of distinct input types
   */
  function getDistinctInputCount(inputs){
    if(!inputs || inputs.length === 0) return 0;
    
    const distinctTypes = new Set();
    inputs.forEach(input => {
      // Consider both event type and rough timing to detect distinct actions
      const key = `${input.type}-${Math.floor(input.timestamp / 100)}`;
      distinctTypes.add(key);
    });
    
    return distinctTypes.size;
  }

  /**
   * Helper: Calculate input cadence variability (coefficient of variation)
   * Returns null if calculation not possible
   * Higher values indicate more variable/human-like timing
   */
  function calculateCadenceVariability(inputs){
    if(!inputs || inputs.length < 2) return null;
    
    // Calculate intervals between consecutive inputs
    const intervals = [];
    for(let i = 1; i < inputs.length; i++){
      const interval = inputs[i].timestamp - inputs[i-1].timestamp;
      if(interval > 0 && interval < 10000){ // Ignore very large gaps
        intervals.push(interval);
      }
    }
    
    if(intervals.length < 2) return null;
    
    // Calculate mean
    const mean = intervals.reduce((sum, val) => sum + val, 0) / intervals.length;
    
    if(mean === 0) return 0;
    
    // Calculate standard deviation
    const squaredDiffs = intervals.map(val => Math.pow(val - mean, 2));
    const variance = squaredDiffs.reduce((sum, val) => sum + val, 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Coefficient of variation
    const cv = stdDev / mean;
    
    return cv;
  }

  /**
   * Get session metadata (for debugging)
   */
  function getSessionMetadata(sessionId){
    const session = activeSessions.get(sessionId);
    if(!session) return null;
    
    return {
      id: session.id,
      gameKey: session.gameKey,
      startTime: session.startTime,
      endTime: session.endTime,
      inputCount: session.inputs.length,
      wasBackgrounded: session.wasBackgrounded,
      backgroundEventsCount: session.backgroundEvents.length
    };
  }

  /**
   * Check if a session is active
   */
  function isSessionActive(sessionId){
    return activeSessions.has(sessionId);
  }

  // Export API
  g.AntiCheat = {
    startSession,
    endSession,
    validate,
    cleanup,
    getSessionMetadata,
    isSessionActive,
    DEFAULT_THRESHOLDS
  };

  console.info('[AntiCheat] Module loaded');

})(window);
