// MODULE: progression/events.js
// Event sourcing for XP/Level progression system
// Tracks all progression-related events in an immutable log

(function(g){
  'use strict';

  // Event store (circular buffer)
  const MAX_EVENTS = 500;
  const eventStore = [];

  // Event types enum
  const EventTypes = {
    XP_GAINED: 'xp_gained',
    LEVEL_UP: 'level_up',
    MILESTONE_REACHED: 'milestone_reached',
    BADGE_EARNED: 'badge_earned',
    ACHIEVEMENT_UNLOCKED: 'achievement_unlocked'
  };

  /**
   * Record a progression event
   * @param {string} type - Event type from EventTypes
   * @param {Object} data - Event data
   * @returns {Object} The recorded event
   */
  function recordEvent(type, data = {}) {
    const event = {
      id: generateEventId(),
      type,
      timestamp: Date.now(),
      data: { ...data }
    };

    // Add to store
    eventStore.push(event);
    if (eventStore.length > MAX_EVENTS) {
      eventStore.shift();
    }

    // Emit on GameBus
    if (g.bbGameBus && typeof g.bbGameBus.emit === 'function') {
      g.bbGameBus.emit('progression:event', event);
    }

    console.info(`[Progression Event] ${type}:`, data);
    return event;
  }

  /**
   * Generate unique event ID
   */
  function generateEventId() {
    return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  /**
   * Get all events
   * @returns {Array} All events in the store
   */
  function getAllEvents() {
    return [...eventStore];
  }

  /**
   * Get events by type
   * @param {string} type - Event type to filter by
   * @returns {Array} Filtered events
   */
  function getEventsByType(type) {
    return eventStore.filter(e => e.type === type);
  }

  /**
   * Get events in time range
   * @param {number} startTime - Start timestamp
   * @param {number} endTime - End timestamp
   * @returns {Array} Events in range
   */
  function getEventsByTimeRange(startTime, endTime) {
    return eventStore.filter(e => e.timestamp >= startTime && e.timestamp <= endTime);
  }

  /**
   * Get recent events
   * @param {number} count - Number of recent events
   * @returns {Array} Recent events
   */
  function getRecentEvents(count = 10) {
    return eventStore.slice(-count);
  }

  /**
   * Clear all events (for reset/testing)
   */
  function clearEvents() {
    eventStore.length = 0;
    console.info('[Progression Events] Event store cleared');
  }

  /**
   * Export events as JSON
   * @returns {string} JSON string
   */
  function exportEvents() {
    return JSON.stringify(eventStore, null, 2);
  }

  /**
   * Import events from JSON
   * @param {string} json - JSON string
   */
  function importEvents(json) {
    try {
      const events = JSON.parse(json);
      if (Array.isArray(events)) {
        eventStore.length = 0;
        eventStore.push(...events);
        console.info('[Progression Events] Imported', events.length, 'events');
      }
    } catch (e) {
      console.error('[Progression Events] Import failed:', e);
    }
  }

  // Export API
  const ProgressionEvents = {
    EventTypes,
    recordEvent,
    getAllEvents,
    getEventsByType,
    getEventsByTimeRange,
    getRecentEvents,
    clearEvents,
    exportEvents,
    importEvents
  };

  g.ProgressionEvents = ProgressionEvents;

  console.info('[progression/events] Event sourcing system initialized');

})(window);
