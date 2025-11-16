// MODULE: telemetry-core.js
// Lightweight telemetry system for tracking startup and user interactions
// Emits console logs, CustomEvents, and optional beacons for observability

(function() {
  'use strict';

  // CRITICAL: Bind window.game immediately
  const g = window.game = window.game || {};

  // Generate a unique session ID for this page load
  const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

  // Detect mobile (simple heuristic)
  const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  // Get viewport dimensions
  function getViewport() {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1
    };
  }

  /**
   * Log a telemetry event
   * @param {string} event - Event name (e.g., 'intro_init', 'show_hub_start')
   * @param {Object} data - Event-specific data
   */
  function log(event, data = {}) {
    try {
      const timestamp = Date.now();
      const viewport = getViewport();

      // Build telemetry payload
      const payload = {
        timestamp,
        sessionId,
        event,
        data,
        context: {
          isMobile,
          viewport,
          userAgent: navigator.userAgent,
          url: window.location.href
        }
      };

      // 1. Console log with unified prefix
      console.info('[Telemetry]', event, data);

      // 2. Dispatch CustomEvent for dev tools
      const customEvent = new CustomEvent('telemetry', {
        detail: payload,
        bubbles: false
      });
      window.dispatchEvent(customEvent);

      // 3. Optional beacon (if endpoint configured)
      const endpoint = g.cfg?.telemetryEndpoint;
      if (endpoint) {
        sendBeacon(endpoint, payload);
      }

      // 4. Buffer in memory for debugging
      if (!g.__telemetryBuffer) {
        g.__telemetryBuffer = [];
      }
      g.__telemetryBuffer.push(payload);

      // Keep buffer size reasonable (last 100 events)
      if (g.__telemetryBuffer.length > 100) {
        g.__telemetryBuffer.shift();
      }

    } catch (err) {
      // Telemetry should never break the game
      console.error('[Telemetry] Error logging event:', err);
    }
  }

  /**
   * Send beacon to telemetry endpoint
   * @param {string} endpoint - URL to send beacon to
   * @param {Object} payload - Telemetry payload
   */
  function sendBeacon(endpoint, payload) {
    try {
      // Try navigator.sendBeacon first (preferred for page unload)
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const sent = navigator.sendBeacon(endpoint, blob);
        if (sent) {
          return;
        }
      }

      // Fallback to fetch POST (non-blocking)
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true // Important for beacons during page unload
      }).catch(err => {
        console.warn('[Telemetry] Beacon failed:', err);
      });

    } catch (err) {
      console.warn('[Telemetry] Beacon error:', err);
    }
  }

  /**
   * Get telemetry buffer for debugging
   * @returns {Array} Array of telemetry events
   */
  function getBuffer() {
    return g.__telemetryBuffer || [];
  }

  /**
   * Clear telemetry buffer
   */
  function clearBuffer() {
    g.__telemetryBuffer = [];
  }

  /**
   * Get session ID
   * @returns {string} Session ID
   */
  function getSessionId() {
    return sessionId;
  }

  // Export API
  const TelemetryAPI = {
    log,
    getBuffer,
    clearBuffer,
    getSessionId
  };

  // Export to both window.Telemetry and window.game.Telemetry
  window.Telemetry = TelemetryAPI;
  g.Telemetry = TelemetryAPI;

  console.info('[Telemetry] Module loaded, sessionId:', sessionId);

})();
