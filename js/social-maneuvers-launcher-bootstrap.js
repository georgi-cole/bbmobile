// MODULE: social-maneuvers-launcher-bootstrap.js
// Robust auto-remount observer for Socialize launcher during social_intermission.
// Observes TV overlay container for childList mutations and re-mounts launcher if removed.

(function(global){
  'use strict';

  let activeObserver = null;
  let mountTargetObserver = null;
  let observerActive = false;

  // ============================================================================
  // MOUNT TARGET RESOLUTION
  // ============================================================================

  /**
   * Resolve the mount target for the Socialize launcher.
   * Robust fallback chain: #tvOverlay → .tvViewport → #tv → .tv → #panel → create #tvOverlay on body
   * Logs once when creating fallback container.
   */
  function resolveMountTarget() {
    // Try existing selectors in priority order
    const existing = document.querySelector('#tvOverlay') ||
                     document.querySelector('.tvViewport') ||
                     document.querySelector('#tv') ||
                     document.querySelector('.tv') ||
                     document.querySelector('#panel');
    
    if (existing) {
      return existing;
    }
    
    // No suitable mount target found - create fallback #tvOverlay on document.body
    console.info('[social-launcher] No mount target found - creating fallback #tvOverlay on document.body');
    const fallback = document.createElement('div');
    fallback.id = 'tvOverlay';
    fallback.style.position = 'absolute';
    fallback.style.inset = '0';
    fallback.style.pointerEvents = 'none';
    fallback.style.zIndex = '10';
    document.body.appendChild(fallback);
    
    return fallback;
  }

  // ============================================================================
  // LAUNCHER MOUNTING
  // ============================================================================

  /**
   * Mount the Socialize launcher if it's missing.
   * Guards against duplicate mounts by checking for existing launcher.
   * Only mounts if in social phase.
   */
  function mountIfMissing() {
    // Check if we're in social phase
    const g = global.game || {};
    const inSocialPhase = g.phase === 'social_intermission' || g.phase === 'social';
    if (!inSocialPhase) {
      // Not in social phase - don't mount
      return false;
    }

    // Check if launcher already exists
    const existingLauncher = document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]');
    if (existingLauncher) {
      // Launcher exists, no need to mount
      return false;
    }

    const target = resolveMountTarget();
    if (!target) {
      // No mount target available yet
      return false;
    }

    // Check if SocializeMobile.ensureLauncher is available
    if (typeof global.SocializeMobile?.ensureLauncher !== 'function') {
      console.warn('[social-launcher] SocializeMobile.ensureLauncher not available');
      return false;
    }

    try {
      // Mount the launcher
      global.SocializeMobile.ensureLauncher();
      global.SocializeMobile.updateHUDDisplay?.();
      global.SocializeMobile.show?.();
      console.info('[social-launcher] re-mounted after DOM change');
      return true;
    } catch (e) {
      console.error('[social-launcher] Failed to mount launcher:', e);
      return false;
    }
  }

  // ============================================================================
  // MUTATION OBSERVER
  // ============================================================================

  /**
   * Start observing the TV overlay for DOM mutations and auto-remount launcher.
   * Uses new resolveMountTarget() and attempts mountIfMissing() after mount target is created.
   */
  function startLauncherObserver() {
    // Prevent duplicate observers
    if (observerActive) {
      console.info('[social-launcher] observer already active');
      return;
    }

    observerActive = true;
    console.info('[social-launcher] observer started');

    // Use resolveMountTarget() to get or create mount target
    const initialTarget = resolveMountTarget();
    
    // Initial mount attempt
    mountIfMissing();

    // Observer for document.body (to catch mount target creation/removal)
    activeObserver = new MutationObserver((mutations) => {
      // Check if mount target was added/removed
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          const target = resolveMountTarget();
          if (target) {
            // Mount target exists, ensure we're observing it
            if (!mountTargetObserver) {
              observeMountTarget(target);
            }
            // Try to mount launcher if missing (after mount target is created)
            mountIfMissing();
          }
        }
      }
    });

    activeObserver.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Also observe the mount target directly if it exists
    if (initialTarget) {
      observeMountTarget(initialTarget);
    }
  }

  /**
   * Observe a specific mount target for childList changes.
   */
  function observeMountTarget(target) {
    if (mountTargetObserver) {
      // Disconnect previous observer
      mountTargetObserver.disconnect();
    }

    mountTargetObserver = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check if launcher was removed
          const launcherStillExists = document.querySelector('#socializeLauncher, .socialize-launcher, [data-sm-launcher]');
          if (!launcherStillExists) {
            // Launcher was removed, try to remount
            mountIfMissing();
          }
        }
      }
    });

    mountTargetObserver.observe(target, {
      childList: true
    });
  }

  /**
   * Stop observing and clean up.
   */
  function stopLauncherObserver() {
    if (!observerActive) {
      return;
    }

    observerActive = false;

    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }

    if (mountTargetObserver) {
      mountTargetObserver.disconnect();
      mountTargetObserver = null;
    }

    console.info('[social-launcher] observer stopped');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  global.SocialLauncherBootstrap = {
    startLauncherObserver,
    stopLauncherObserver,
    resolveMountTarget,
    mountIfMissing
  };

})(window);
