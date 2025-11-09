// MODULE: skip-controller.js
// Centralized Skip Fast-Forward orchestrator
// Manages skip state, drainer registration, and drain loop execution

(function(g) {
  'use strict';

  const SkipController = (() => {
    // State
    let skipActive = false;
    let draining = false;
    const drainers = new Map();
    
    // Configuration
    const MAX_DRAIN_PASSES = 20;
    const GSAP_FAST_FORWARD_PROGRESS = 1;

    /**
     * Enable skip mode
     */
    function enable() {
      if (skipActive) {
        console.warn('[SkipController] Skip already active, ignoring duplicate enable');
        return;
      }
      skipActive = true;
      console.info('[SkipController] Skip mode ENABLED');
    }

    /**
     * Complete skip mode and reset state
     */
    function complete() {
      skipActive = false;
      draining = false;
      console.info('[SkipController] Skip mode COMPLETED');
    }

    /**
     * Check if skip is currently active
     * @returns {boolean}
     */
    function isActive() {
      return skipActive;
    }

    /**
     * Register a subsystem drainer
     * @param {string} name - Unique name for the drainer
     * @param {Function} drainerFn - Function that returns true if work was performed
     */
    function registerDrainer(name, drainerFn) {
      if (typeof drainerFn !== 'function') {
        console.error(`[SkipController] Invalid drainer function for ${name}`);
        return;
      }
      drainers.set(name, drainerFn);
      console.info(`[SkipController] Registered drainer: ${name}`);
    }

    /**
     * Unregister a drainer (for testing/cleanup)
     * @param {string} name - Name of drainer to remove
     */
    function unregisterDrainer(name) {
      if (drainers.has(name)) {
        drainers.delete(name);
        console.info(`[SkipController] Unregistered drainer: ${name}`);
      }
    }

    /**
     * Fast-forward all active GSAP timelines
     * @returns {number} Number of timelines fast-forwarded
     */
    function fastForwardGsapTimelines() {
      if (typeof gsap === 'undefined' || !gsap.globalTimeline) {
        return 0;
      }

      let count = 0;
      const timelines = gsap.globalTimeline.getChildren(true, true, false);
      
      timelines.forEach(tl => {
        if (tl && typeof tl.progress === 'function' && typeof tl.kill === 'function') {
          try {
            tl.progress(GSAP_FAST_FORWARD_PROGRESS);
            tl.kill();
            count++;
          } catch (e) {
            console.warn('[SkipController] Error fast-forwarding GSAP timeline:', e);
          }
        }
      });

      if (count > 0) {
        console.info(`[SkipController] Fast-forwarded ${count} GSAP timeline(s)`);
      }

      return count;
    }

    /**
     * Execute drain loop - run all drainers until no work remains or safety cap reached
     * @returns {Promise<void>}
     */
    async function drainLoop() {
      if (!skipActive) {
        console.warn('[SkipController] drainLoop called but skip not active');
        return;
      }

      if (draining) {
        console.warn('[SkipController] drainLoop already in progress, preventing re-entry');
        return;
      }

      draining = true;
      console.info('[SkipController] Starting drain loop');

      let pass = 0;
      let totalWorkDone = 0;

      while (pass < MAX_DRAIN_PASSES) {
        pass++;
        let workThisPass = 0;

        // Fast-forward GSAP timelines
        const gsapWork = fastForwardGsapTimelines();
        if (gsapWork > 0) {
          workThisPass += gsapWork;
        }

        // Run all drainers
        for (const [name, drainerFn] of drainers) {
          try {
            const didWork = await drainerFn();
            if (didWork) {
              console.info(`[SkipController] Drainer "${name}" performed work in pass ${pass}`);
              workThisPass++;
            }
          } catch (e) {
            console.error(`[SkipController] Error in drainer "${name}":`, e);
          }
        }

        totalWorkDone += workThisPass;

        // If no work was done this pass, we're stable
        if (workThisPass === 0) {
          console.info(`[SkipController] Drain loop stable after ${pass} pass(es), total work: ${totalWorkDone}`);
          draining = false;
          return;
        }

        // Small delay to allow DOM updates and microtasks
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Safety cap reached
      console.warn(`[SkipController] Safety cap reached (${MAX_DRAIN_PASSES} passes), total work: ${totalWorkDone}`);
      draining = false;
    }

    /**
     * Get list of registered drainer names (for debugging)
     * @returns {string[]}
     */
    function getRegisteredDrainers() {
      return Array.from(drainers.keys());
    }

    return {
      enable,
      complete,
      isActive,
      registerDrainer,
      unregisterDrainer,
      drainLoop,
      getRegisteredDrainers
    };
  })();

  // Export to global scope
  g.SkipController = SkipController;
  console.info('[skip-controller] Module loaded');

})(window);
