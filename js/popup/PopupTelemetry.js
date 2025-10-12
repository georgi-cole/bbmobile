// MODULE: popup/PopupTelemetry.js
// Telemetry and event tracking system for popup system
// Logs popup shown, decisions, queue depth with metadata

(function(g){
  'use strict';

  // Event log storage (circular buffer, max 100 events)
  const MAX_EVENTS = 100;
  const eventLog = [];
  
  // Statistics tracking
  const stats = {
    totalShown: 0,
    totalDecisions: 0,
    totalDismissed: 0,
    totalQueued: 0,
    popupTypeStats: {}, // Per-popup-type statistics
    sessionStart: Date.now()
  };

  /**
   * Log a popup event with metadata
   * @param {string} eventType - Type of event (popup_shown, popup_decision, popup_queue_depth, popup_dismissed)
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
      case 'popup_shown':
        stats.totalShown++;
        break;
      case 'popup_decision':
        stats.totalDecisions++;
        break;
      case 'popup_dismissed':
        stats.totalDismissed++;
        break;
      case 'popup_queue_depth':
        stats.totalQueued++;
        break;
    }

    // Update per-popup-type statistics
    const popupType = data.popupType || data.type || 'unknown';
    if(popupType){
      if(!stats.popupTypeStats[popupType]){
        stats.popupTypeStats[popupType] = {
          shown: 0,
          decisions: 0,
          dismissed: 0,
          queued: 0,
          totalTimeShown: 0
        };
      }

      const typeStats = stats.popupTypeStats[popupType];
      switch(eventType){
        case 'popup_shown':
          typeStats.shown++;
          if(typeof data.timeShownMs === 'number'){
            typeStats.totalTimeShown += data.timeShownMs;
          }
          break;
        case 'popup_decision':
          typeStats.decisions++;
          break;
        case 'popup_dismissed':
          typeStats.dismissed++;
          break;
        case 'popup_queue_depth':
          typeStats.queued++;
          break;
      }
    }

    // Emit event on GameBus if available
    if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
      g.bbGameBus.emit('popup:telemetry', event);
    }

    // Console log in dev mode
    const cfg = g.game?.cfg || {};
    if(cfg.enablePopupTelemetryPanel){
      console.log('[PopupTelemetry]', eventType, data);
    }
  }

  /**
   * Log popup_shown event
   * @param {string} popupType - Type of popup (e.g., 'competition_result', 'diary_room', 'social_decision')
   * @param {Object} data - Additional data
   */
  function logPopupShown(popupType, data = {}){
    logEvent('popup_shown', { popupType, ...data });
  }

  /**
   * Log popup_decision event
   * @param {string} popupType - Type of popup
   * @param {string} decision - User decision/action taken
   * @param {Object} data - Additional data
   */
  function logPopupDecision(popupType, decision, data = {}){
    logEvent('popup_decision', { popupType, decision, ...data });
  }

  /**
   * Log popup_dismissed event
   * @param {string} popupType - Type of popup
   * @param {string} method - How dismissed (backdrop, esc, button, auto)
   * @param {Object} data - Additional data
   */
  function logPopupDismissed(popupType, method, data = {}){
    logEvent('popup_dismissed', { popupType, method, ...data });
  }

  /**
   * Log popup_queue_depth event
   * @param {number} queueDepth - Current queue depth
   * @param {Object} data - Additional data
   */
  function logQueueDepth(queueDepth, data = {}){
    logEvent('popup_queue_depth', { queueDepth, ...data });
  }

  /**
   * Get recent events
   * @param {number} count - Number of events to retrieve
   * @returns {Array} Recent events
   */
  function getRecentEvents(count = 10){
    return eventLog.slice(-count);
  }

  /**
   * Get global statistics
   * @returns {Object} Statistics object
   */
  function getStats(){
    return {
      ...stats,
      sessionDurationMs: Date.now() - stats.sessionStart
    };
  }

  /**
   * Get statistics for a specific popup type
   * @param {string} popupType - Popup type
   * @returns {Object} Type statistics
   */
  function getTypeStats(popupType){
    return stats.popupTypeStats[popupType] || null;
  }

  /**
   * Get all popup type statistics
   * @returns {Object} All type statistics
   */
  function getAllTypeStats(){
    return { ...stats.popupTypeStats };
  }

  /**
   * Clear all telemetry data
   */
  function clearTelemetry(){
    eventLog.length = 0;
    stats.totalShown = 0;
    stats.totalDecisions = 0;
    stats.totalDismissed = 0;
    stats.totalQueued = 0;
    stats.popupTypeStats = {};
    stats.sessionStart = Date.now();
  }

  /**
   * Export all telemetry data as JSON
   * @returns {string} JSON string
   */
  function exportData(){
    return JSON.stringify({
      events: eventLog,
      stats: getStats()
    }, null, 2);
  }

  /**
   * Get formatted summary text
   * @returns {string} Summary text
   */
  function getSummary(){
    const duration = Math.floor((Date.now() - stats.sessionStart) / 1000);
    let summary = `Popup Telemetry Summary (${duration}s session)\n\n`;
    summary += `Total Shown: ${stats.totalShown}\n`;
    summary += `Total Decisions: ${stats.totalDecisions}\n`;
    summary += `Total Dismissed: ${stats.totalDismissed}\n`;
    summary += `Total Queued: ${stats.totalQueued}\n\n`;
    
    summary += `Per-Type Statistics:\n`;
    for(const [type, typeStats] of Object.entries(stats.popupTypeStats)){
      summary += `  ${type}:\n`;
      summary += `    Shown: ${typeStats.shown}\n`;
      summary += `    Decisions: ${typeStats.decisions}\n`;
      summary += `    Dismissed: ${typeStats.dismissed}\n`;
      summary += `    Avg Time: ${typeStats.shown > 0 ? Math.floor(typeStats.totalTimeShown / typeStats.shown) : 0}ms\n`;
    }
    
    return summary;
  }

  // Export API
  const PopupTelemetry = {
    logEvent,
    logPopupShown,
    logPopupDecision,
    logPopupDismissed,
    logQueueDepth,
    getRecentEvents,
    getStats,
    getTypeStats,
    getAllTypeStats,
    clearTelemetry,
    exportData,
    getSummary
  };

  // Export to global namespace
  g.PopupTelemetry = PopupTelemetry;

  // Console helpers for debugging
  g.__getPopupTelemetry = getRecentEvents;
  g.__clearPopupTelemetry = clearTelemetry;
  g.__exportPopupTelemetry = exportData;

})(window);
