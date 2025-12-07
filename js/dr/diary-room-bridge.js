// MODULE: diary-room-bridge.js
// Bridge for integrating social summaries into DiaryRoomLogger
// Ensures DiaryRoomLogger has _entries array and accepts summary objects

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const CONFIG = {
    enabled: true,
    verbose: false
  };

  function getConfig() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return {
      enabled: cfg.drBridgeEnabled ?? CONFIG.enabled,
      verbose: cfg.drBridgeVerbose ?? CONFIG.verbose
    };
  }

  // ============================================================================
  // DIARY ROOM LOGGER ENHANCEMENT
  // ============================================================================
  
  /**
   * Ensure DiaryRoomLogger has _entries array and getEntries method
   */
  function ensureDiaryRoomLoggerEntries() {
    const DRL = global.DiaryRoomLogger;
    
    if (!DRL) {
      console.warn('[diary-room-bridge] DiaryRoomLogger not found');
      return false;
    }

    // Initialize _entries array if it doesn't exist
    if (!DRL._entries) {
      DRL._entries = [];
      console.info('[diary-room-bridge] ✓ Initialized DiaryRoomLogger._entries array');
    }

    // Add getEntries method if it doesn't exist
    if (!DRL.getEntries) {
      DRL.getEntries = function() {
        return DRL._entries || [];
      };
      console.info('[diary-room-bridge] ✓ Added DiaryRoomLogger.getEntries() method');
    }

    return true;
  }

  /**
   * Add an entry to DiaryRoomLogger
   * @param {Object} entry - Diary entry object
   */
  function addDiaryEntry(entry) {
    const DRL = global.DiaryRoomLogger;
    
    if (!DRL || !DRL._entries) {
      console.warn('[diary-room-bridge] Cannot add entry - DiaryRoomLogger not ready');
      return;
    }

    // Add to entries array
    DRL._entries.push(entry);

    const config = getConfig();
    if (config.verbose) {
      console.log('[diary-room-bridge] Added diary entry:', entry);
    }
  }

  // ============================================================================
  // SOCIAL SUMMARY HANDLER
  // ============================================================================
  
  /**
   * Handle social.summary:updated event
   * @param {Object} summary - Social summary object
   */
  function handleSocialSummary(summary) {
    if (!summary) return;

    const config = getConfig();
    
    // Convert summary to diary entry
    const entry = convertSummaryToDiaryEntry(summary);
    
    // Add to DiaryRoomLogger
    addDiaryEntry(entry);

    // Emit dr:entry event
    const bus = getBus();
    if (bus) {
      bus.emit('dr:entry', { entry });
      
      if (config.verbose) {
        console.log('[diary-room-bridge] Emitted dr:entry for social summary');
      }
    }
  }

  /**
   * Convert social summary to diary entry format
   * @param {Object} summary - Social summary object
   * @returns {Object} Diary entry
   */
  function convertSummaryToDiaryEntry(summary) {
    const title = `Week ${summary.week} Social Phase`;
    const text = formatSummaryText(summary);

    return {
      id: `dr-social-${summary.week}-${summary.timestamp}`,
      timestamp: summary.timestamp,
      type: 'social_summary',
      week: summary.week,
      title,
      text,
      severity: 'neutral',
      category: 'social',
      data: summary
    };
  }

  /**
   * Format summary as readable text
   * @param {Object} summary - Social summary object
   * @returns {string} Formatted text
   */
  function formatSummaryText(summary) {
    const lines = [];
    
    // Total actions
    lines.push(`${summary.totalActions} social interaction${summary.totalActions !== 1 ? 's' : ''} occurred.`);

    // Highlights
    if (summary.highlights && summary.highlights.length > 0) {
      lines.push('');
      lines.push('Highlights:');
      summary.highlights.forEach(highlight => {
        lines.push(`• ${highlight}`);
      });
    }

    // Top energy spenders
    if (summary.energySpentByPlayer) {
      const spenders = Object.entries(summary.energySpentByPlayer)
        .map(([playerId, amount]) => ({ playerId: Number(playerId), amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 3);

      if (spenders.length > 0) {
        lines.push('');
        lines.push('Most active:');
        spenders.forEach(({ playerId, amount }) => {
          const name = getPlayerName(playerId);
          lines.push(`• ${name} (${amount} energy)`);
        });
      }
    }

    // Action log summary (if available)
    if (summary.actionLog && summary.actionLog.length > 0) {
      const aiActions = summary.actionLog.filter(a => a.actorId !== getHumanId());
      const humanActions = summary.actionLog.filter(a => a.actorId === getHumanId());

      if (aiActions.length > 0 || humanActions.length > 0) {
        lines.push('');
        lines.push(`Actions: ${humanActions.length} by you, ${aiActions.length} by NPCs`);
      }
    }

    return lines.join('\n');
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  function getPlayerName(playerId) {
    if (typeof global.safeName === 'function') {
      return global.safeName(playerId);
    }
    
    if (typeof global.getP === 'function') {
      const player = global.getP(playerId);
      return player?.name || `Player ${playerId}`;
    }
    
    return `Player ${playerId}`;
  }

  function getHumanId() {
    return global.game?.humanId || 1;
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  function init() {
    const config = getConfig();
    
    if (!config.enabled) {
      console.info('[diary-room-bridge] Bridge disabled');
      return;
    }

    const bus = getBus();
    if (!bus) {
      console.info('[diary-room-bridge] Event bus not ready - deferring initialization');
      setTimeout(init, 100);
      return;
    }

    // Ensure DiaryRoomLogger has required structure
    if (!ensureDiaryRoomLoggerEntries()) {
      // Try again later if DiaryRoomLogger isn't ready yet
      setTimeout(() => {
        if (ensureDiaryRoomLoggerEntries()) {
          console.info('[diary-room-bridge] ✓ DiaryRoomLogger ready (delayed)');
        }
      }, 500);
    }

    // Listen for social summary events
    bus.on('social.summary:updated', handleSocialSummary);
    console.info('[diary-room-bridge] ✓ Listening for social.summary:updated events');

    // Also listen for dr:entry events from other sources and ensure they're added to _entries
    bus.on('dr:entry', (payload) => {
      if (!payload || !payload.entry) return;
      
      const DRL = global.DiaryRoomLogger;
      if (DRL && DRL._entries) {
        // Check if entry already exists (avoid duplicates)
        const exists = DRL._entries.some(e => e.id === payload.entry.id);
        if (!exists) {
          DRL._entries.push(payload.entry);
          
          if (config.verbose) {
            console.log('[diary-room-bridge] Captured dr:entry:', payload.entry.id);
          }
        }
      }
    });

    // Listen for dr:alert events (interactive alerts)
    bus.on('dr:alert', (payload) => {
      if (!payload || !payload.alert) return;
      
      const DRL = global.DiaryRoomLogger;
      if (DRL && DRL._entries) {
        // Convert alert to diary entry format
        const alertEntry = {
          id: `dr-alert-${payload.alert.type}-${payload.alert.timestamp || Date.now()}`,
          timestamp: payload.alert.timestamp || Date.now(),
          type: payload.alert.type,
          category: 'social_alert',
          title: payload.alert.title || payload.alert.text,
          text: payload.alert.text,
          severity: payload.alert.severity || 'medium',
          interactive: true,
          data: payload.alert
        };
        
        // Check if alert already exists (avoid duplicates)
        const exists = DRL._entries.some(e => e.id === alertEntry.id);
        if (!exists) {
          DRL._entries.push(alertEntry);
          
          if (config.verbose) {
            console.log('[diary-room-bridge] Captured dr:alert:', alertEntry.id);
          }
        }
      }
    });

    console.info('[diary-room-bridge] ✓ Initialized diary room bridge (with alert support)');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================
  
  const API = {
    addDiaryEntry,
    convertSummaryToDiaryEntry,
    getEntries() {
      return global.DiaryRoomLogger?._entries || [];
    }
  };

  // Export for debugging
  if (!global.__drBridge) {
    global.__drBridge = API;
    console.info('[diary-room-bridge] ✓ Debug API: window.__drBridge');
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================
  
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      setTimeout(init, 50);
    }
  } else {
    init();
  }

})(typeof window !== 'undefined' ? window : global);
