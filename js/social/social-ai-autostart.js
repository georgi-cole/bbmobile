// MODULE: social-ai-autostart.js
// Automatic AI social action driver during social phase
// Listens for social phase start/end events and drives the AI scheduler

(function(global) {
  'use strict';

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  const DEFAULT_CONFIG = {
    enabled: true,              // Master switch for auto-driver
    tickInterval: 375,          // Conservative interval (ms) for AI ticks
    verbose: false              // Verbose logging
  };

  function getConfig() {
    const g = global.game || {};
    const cfg = g.cfg || {};
    return {
      enabled: cfg.smAutoDriverEnabled ?? DEFAULT_CONFIG.enabled,
      tickInterval: cfg.smAutoDriverInterval ?? DEFAULT_CONFIG.tickInterval,
      verbose: cfg.smAutoDriverVerbose ?? DEFAULT_CONFIG.verbose
    };
  }

  // ============================================================================
  // STATE
  // ============================================================================
  let autoDriverTimer = null;
  let isRunning = false;
  let tickCount = 0;

  // ============================================================================
  // EVENT LISTENERS & INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize the auto-driver when game.bus is available
   */
  function init() {
    const bus = getBus();
    if (!bus) {
      // Defer initialization until bus exists
      console.info('[social-ai-autostart] Event bus not ready - deferring initialization');
      setTimeout(init, 100);
      return;
    }

    // Listen for various social phase start event names (defensive)
    const startEvents = [
      'social.phase:start',
      'social-phase:start',
      'social:start'
    ];

    const endEvents = [
      'social.phase:end',
      'social-phase:end',
      'social:end'
    ];

    startEvents.forEach(eventName => {
      bus.on(eventName, handleSocialPhaseStart);
    });

    endEvents.forEach(eventName => {
      bus.on(eventName, handleSocialPhaseEnd);
    });

    // Listen for actual phase changes via window event (bb:phase:changed)
    // This catches phase transitions that may not emit bus events
    window.addEventListener('bb:phase:changed', handlePhaseChanged);

    console.info('[social-ai-autostart] ✓ Initialized and listening for social phase events');
  }

  /**
   * Get the game event bus (defensive)
   */
  function getBus() {
    return global.game?.bus || global.bbGameBus || null;
  }

  /**
   * Handle social phase start
   */
  function handleSocialPhaseStart(_data) {
    const config = getConfig();
    if (!config.enabled) {
      console.info('[social-ai-autostart] Auto-driver is disabled');
      return;
    }

    if (isRunning) {
      console.warn('[social-ai-autostart] Already running - ignoring duplicate start');
      return;
    }

    console.info('[social-ai-autostart] ▶️ Social phase started - starting AI auto-driver');
    start();
  }

  /**
   * Handle social phase end
   */
  function handleSocialPhaseEnd(_data) {
    if (!isRunning) {
      return;
    }

    console.info('[social-ai-autostart] ⏹️ Social phase ended - stopping AI auto-driver');
    stop();
  }

  /**
   * Helper function to check if a phase name is a social phase
   */
  function isSocialPhaseName(phaseName) {
    return phaseName === 'social_intermission' || phaseName === 'intermission';
  }

  /**
   * Handle phase change from bb:phase:changed window event
   * This catches transitions to 'intermission' or 'social_intermission'
   */
  function handlePhaseChanged(event) {
    const nextPhase = event?.detail?.phase || window.game?.phase;
    const previousPhase = event?.detail?.previousPhase;
    
    if (isSocialPhaseName(nextPhase)) {
      // Entering social phase
      const config = getConfig();
      if (!config.enabled) {
        return;
      }

      if (isRunning) {
        console.warn('[social-ai-autostart] Already running - ignoring duplicate start');
        return;
      }

      if (window.game?.cfg?.debugSocialAI) {
        console.info('[social-ai-autostart] Detected social intermission (autostart) - starting scheduler/autodriver');
        console.info('[social-ai-autostart] Phase transition:', previousPhase, '->', nextPhase);
      }

      // Start the scheduler
      window.SocialAIScheduler?.startAiSocialPhase?.({}, 'autostart');
      
      // Also start the autodriver explicitly (if not already started)
      if (window.__smAutoDriver?.start && !isRunning) {
        start();
      }
    } else if (isSocialPhaseName(previousPhase) && !isSocialPhaseName(nextPhase)) {
      // Leaving social phase
      if (isRunning) {
        if (window.game?.cfg?.debugSocialAI) {
          console.info('[social-ai-autostart] Leaving social phase - stopping auto-driver');
        }
        stop();
      }
    }
  }

  // ============================================================================
  // AUTO-DRIVER CONTROL
  // ============================================================================

  /**
   * Start the AI auto-driver
   */
  function start() {
    const config = getConfig();

    if (isRunning) {
      console.warn('[social-ai-autostart] Auto-driver already running');
      return;
    }

    isRunning = true;
    tickCount = 0;

    console.info(`[social-ai-autostart] 🚀 Starting auto-driver with ${config.tickInterval}ms interval`);

    // Start ticking
    tick();
  }

  /**
   * Stop the AI auto-driver
   */
  function stop() {
    if (!isRunning) {
      return;
    }

    if (autoDriverTimer) {
      clearTimeout(autoDriverTimer);
      autoDriverTimer = null;
    }

    isRunning = false;
    console.info(`[social-ai-autostart] 🛑 Stopped auto-driver after ${tickCount} ticks`);
    tickCount = 0;
  }

  /**
   * Execute a single tick - calls the AI scheduler or social engine
   */
  function tick() {
    if (!isRunning) {
      return;
    }

    const config = getConfig();
    tickCount++;

    if (config.verbose) {
      console.log(`[social-ai-autostart] Tick #${tickCount}`);
    }

    // Try multiple ways to call the AI scheduler (defensive)
    let tickExecuted = false;

    // Method 1: Use SocialEngine (new budget-aware system)
    if (global.SocialEngine?.isPhaseActive()) {
      try {
        // Execute interactions for eligible AI players with budget
        const budgets = global.SocialEngine.getAllBudgets();
        for (const [playerId, budget] of budgets) {
          // Check if player can still act
          if (budget.actions < budget.targetActions && budget.spent < budget.budget) {
            global.SocialEngine.executeAIInteraction(playerId);
            tickExecuted = true;
          }
        }
      } catch (e) {
        console.warn('[social-ai-autostart] Failed to use SocialEngine:', e);
      }
    }

    // Method 2: Use __smDebug.runAiTickOnce (preferred for testing)
    if (!tickExecuted && global.__smDebug?.runAiTickOnce) {
      try {
        global.__smDebug.runAiTickOnce();
        tickExecuted = true;
      } catch (e) {
        console.warn('[social-ai-autostart] Failed to call __smDebug.runAiTickOnce:', e);
      }
    }

    // Method 3: Use SocialAIScheduler directly
    if (!tickExecuted && global.SocialAIScheduler?.runAiTick) {
      try {
        global.SocialAIScheduler.runAiTick();
        tickExecuted = true;
      } catch (e) {
        console.warn('[social-ai-autostart] Failed to call SocialAIScheduler.runAiTick:', e);
      }
    }

    // Method 4: Check for other potential tick methods
    if (!tickExecuted && global.SocialAIScheduler?.tick) {
      try {
        global.SocialAIScheduler.tick();
        tickExecuted = true;
      } catch (e) {
        console.warn('[social-ai-autostart] Failed to call SocialAIScheduler.tick:', e);
      }
    }

    if (!tickExecuted && tickCount === 1) {
      console.warn('[social-ai-autostart] ⚠️ No AI scheduler tick method found - AI may not run');
    }

    // Check stop conditions (budget-aware)
    if (shouldStopTicking()) {
      console.info('[social-ai-autostart] ✓ All AI players have reached their budgets - stopping');
      stop();
      return;
    }

    // Schedule next tick
    if (isRunning) {
      autoDriverTimer = setTimeout(tick, config.tickInterval);
    }
  }

  /**
   * Check if we should stop ticking (all budgets reached)
   */
  function shouldStopTicking() {
    if (!global.SocialEngine?.isPhaseActive()) {
      return false;
    }

    const budgets = global.SocialEngine.getAllBudgets();
    if (budgets.length === 0) {
      return false;
    }

    // Stop if all players have reached their targets
    for (const [playerId, budget] of budgets) {
      if (budget.actions < budget.targetActions && budget.spent < budget.budget) {
        return false; // At least one player can still act
      }
    }

    return true; // All players done
  }

  // ============================================================================
  // PUBLIC API (for debugging)
  // ============================================================================
  
  const API = {
    start,
    stop,
    getStatus() {
      return {
        isRunning,
        tickCount,
        config: getConfig()
      };
    }
  };

  // Export to window for manual debugging
  if (!global.__smAutoDriver) {
    global.__smAutoDriver = API;
    console.info('[social-ai-autostart] ✓ Debug API: window.__smAutoDriver.start/stop()');
  }

  // ============================================================================
  // AUTO-INITIALIZATION
  // ============================================================================
  
  // Initialize when DOM is ready or immediately if already loaded
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      // Defer slightly to let other modules initialize first
      setTimeout(init, 50);
    }
  } else {
    // No DOM environment (e.g., tests) - initialize immediately
    init();
  }

})(typeof window !== 'undefined' ? window : global);
