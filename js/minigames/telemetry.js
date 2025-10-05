// MODULE: minigames/telemetry.js
// Telemetry and event tracking system for minigames
// Logs selection, start, completion, errors with metadata

(function(g){
  'use strict';

  // Event log storage (circular buffer, max 100 events)
  const MAX_EVENTS = 100;
  const eventLog = [];
  
  // Statistics tracking
  const stats = {
    totalSelections: 0,
    totalStarts: 0,
    totalCompletions: 0,
    totalErrors: 0,
    gameStats: {}, // Per-game statistics
    sessionStart: Date.now()
  };

  /**
   * Log a minigame event with metadata
   * @param {string} eventType - Type of event (selection, start, complete, error)
   * @param {Object} data - Event data
   */
  function logEvent(eventType, data = {}){
    const timestamp = Date.now();
    const event = {
      type: eventType,
      timestamp,
      data: { ...data }
    };

    // Add to circular buffer
    eventLog.push(event);
    if(eventLog.length > MAX_EVENTS){
      eventLog.shift();
    }

    // Update statistics
    switch(eventType){
      case 'selection':
        stats.totalSelections++;
        break;
      case 'start':
        stats.totalStarts++;
        break;
      case 'complete':
        stats.totalCompletions++;
        break;
      case 'error':
        stats.totalErrors++;
        break;
    }

    // Update per-game statistics
    const gameKey = data.gameKey || data.game;
    if(gameKey){
      if(!stats.gameStats[gameKey]){
        stats.gameStats[gameKey] = {
          selections: 0,
          starts: 0,
          completions: 0,
          errors: 0,
          totalScore: 0,
          totalTime: 0,
          plays: 0
        };
      }

      const gameStats = stats.gameStats[gameKey];
      switch(eventType){
        case 'selection':
          gameStats.selections++;
          break;
        case 'start':
          gameStats.starts++;
          break;
        case 'complete':
          gameStats.completions++;
          gameStats.plays++;
          if(typeof data.score === 'number'){
            gameStats.totalScore += data.score;
          }
          if(typeof data.timeMs === 'number'){
            gameStats.totalTime += data.timeMs;
          }
          break;
        case 'error':
          gameStats.errors++;
          break;
      }
    }

    // Emit event on GameBus if available
    if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
      g.bbGameBus.emit('minigame:telemetry', event);
    }

    // Console log for development
    const emoji = {
      selection: '🎯',
      start: '▶️',
      complete: '✅',
      error: '❌'
    }[eventType] || '📊';
    
    console.info(`[Telemetry] ${emoji} ${eventType}:`, data);

    return event;
  }

  /**
   * Log game selection event
   * @param {string} gameKey - Selected game key
   * @param {Object} metadata - Additional metadata
   */
  function logSelection(gameKey, metadata = {}){
    return logEvent('selection', {
      gameKey,
      poolSize: metadata.poolSize,
      poolIndex: metadata.poolIndex,
      historyLength: metadata.historyLength,
      selectionMethod: metadata.method || 'pool'
    });
  }

  /**
   * Log game start event
   * @param {string} gameKey - Game key
   * @param {Object} metadata - Additional metadata
   */
  function logStart(gameKey, metadata = {}){
    return logEvent('start', {
      gameKey,
      playerId: metadata.playerId,
      phase: metadata.phase,
      week: metadata.week,
      timestamp: Date.now()
    });
  }

  /**
   * Log game completion event
   * @param {string} gameKey - Game key
   * @param {Object} result - Game result
   */
  function logComplete(gameKey, result = {}){
    return logEvent('complete', {
      gameKey,
      score: result.score,
      normalizedScore: result.normalizedScore,
      timeMs: result.timeMs,
      playerId: result.playerId,
      phase: result.phase,
      success: result.success !== false
    });
  }

  /**
   * Log game error event
   * @param {string} gameKey - Game key (if known)
   * @param {Error|string} error - Error object or message
   * @param {Object} metadata - Additional metadata
   */
  function logError(gameKey, error, metadata = {}){
    const errorData = {
      gameKey: gameKey || 'unknown',
      message: error?.message || error || 'Unknown error',
      stack: error?.stack,
      phase: metadata.phase,
      playerId: metadata.playerId,
      fallbackAttempted: metadata.fallbackAttempted || false,
      fallbackGame: metadata.fallbackGame
    };

    return logEvent('error', errorData);
  }

  /**
   * Get recent events
   * @param {number} count - Number of events to return (default 20)
   * @param {string} filterType - Optional event type filter
   * @returns {Array} Recent events
   */
  function getRecentEvents(count = 20, filterType = null){
    let events = eventLog.slice();
    
    if(filterType){
      events = events.filter(e => e.type === filterType);
    }
    
    return events.slice(-count);
  }

  /**
   * Get all statistics
   * @returns {Object} Statistics object
   */
  function getStats(){
    return {
      ...stats,
      sessionDurationMs: Date.now() - stats.sessionStart,
      completionRate: stats.totalStarts > 0 ? 
        (stats.totalCompletions / stats.totalStarts * 100).toFixed(1) + '%' : 
        'N/A',
      errorRate: stats.totalStarts > 0 ? 
        (stats.totalErrors / stats.totalStarts * 100).toFixed(1) + '%' : 
        'N/A'
    };
  }

  /**
   * Get statistics for a specific game
   * @param {string} gameKey - Game key
   * @returns {Object} Game statistics
   */
  function getGameStats(gameKey){
    const gameStats = stats.gameStats[gameKey];
    if(!gameStats){
      return null;
    }

    return {
      ...gameStats,
      averageScore: gameStats.plays > 0 ? 
        (gameStats.totalScore / gameStats.plays).toFixed(1) : 
        'N/A',
      averageTime: gameStats.plays > 0 ? 
        (gameStats.totalTime / gameStats.plays).toFixed(0) + 'ms' : 
        'N/A',
      completionRate: gameStats.starts > 0 ? 
        (gameStats.completions / gameStats.starts * 100).toFixed(1) + '%' : 
        'N/A',
      errorRate: gameStats.starts > 0 ? 
        (gameStats.errors / gameStats.starts * 100).toFixed(1) + '%' : 
        'N/A'
    };
  }

  /**
   * Get all game statistics
   * @returns {Object} All game statistics
   */
  function getAllGameStats(){
    const allStats = {};
    for(const gameKey in stats.gameStats){
      allStats[gameKey] = getGameStats(gameKey);
    }
    return allStats;
  }

  /**
   * Clear all telemetry data
   */
  function clearTelemetry(){
    eventLog.length = 0;
    stats.totalSelections = 0;
    stats.totalStarts = 0;
    stats.totalCompletions = 0;
    stats.totalErrors = 0;
    stats.gameStats = {};
    stats.sessionStart = Date.now();
    console.info('[Telemetry] All data cleared');
  }

  /**
   * Export telemetry data as JSON
   * @returns {string} JSON string of telemetry data
   */
  function exportData(){
    return JSON.stringify({
      events: eventLog,
      stats: getStats(),
      gameStats: getAllGameStats(),
      exportedAt: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Get formatted summary for display
   * @returns {string} Formatted summary
   */
  function getSummary(){
    const s = getStats();
    return `
📊 Minigame Telemetry Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Session Duration: ${(s.sessionDurationMs / 1000 / 60).toFixed(1)} minutes

Events:
  • Selections: ${s.totalSelections}
  • Starts: ${s.totalStarts}
  • Completions: ${s.totalCompletions}
  • Errors: ${s.totalErrors}

Performance:
  • Completion Rate: ${s.completionRate}
  • Error Rate: ${s.errorRate}

Games Played: ${Object.keys(stats.gameStats).length}
    `.trim();
  }

  // Export API
  g.MinigameTelemetry = {
    // Event logging
    logEvent,
    logSelection,
    logStart,
    logComplete,
    logError,
    
    // Data retrieval
    getRecentEvents,
    getStats,
    getGameStats,
    getAllGameStats,
    
    // Utilities
    clearTelemetry,
    exportData,
    getSummary
  };

  console.info('[MinigameTelemetry] Module loaded');

})(window);
