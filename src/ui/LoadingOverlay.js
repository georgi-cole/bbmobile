// MODULE: LoadingOverlay.js
// Unified loading overlay for Play → main hub transition
// Features:
// - Full-screen blocking overlay with eye animation
// - Progress tracking (0% → 100%)
// - Error state with Retry option
// - Single source of truth for loading state
// - Mobile-first design

(function(g) {
  'use strict';

  let overlay = null;
  let progressText = null;
  let progressBar = null;
  let eyeContainer = null;
  let errorContainer = null;
  let errorText = null;
  let retryButton = null;
  let liveRegion = null;
  let currentProgress = 0;
  let isVisible = false;

  // ===== DOM BUILDING =====

  /**
   * Build the loading overlay DOM structure
   * @returns {HTMLElement} The overlay element
   */
  function buildOverlay() {
    const root = document.createElement('div');
    root.id = 'unifiedLoadingOverlay';
    root.className = 'unified-loading-overlay';
    root.setAttribute('role', 'dialog');
    root.setAttribute('aria-modal', 'true');
    root.setAttribute('aria-labelledby', 'loadingOverlayTitle');
    root.setAttribute('aria-busy', 'true');

    // Eye animation container
    const eye = document.createElement('div');
    eye.className = 'unified-loading-eye';
    eye.setAttribute('role', 'img');
    eye.setAttribute('aria-label', 'Loading animation');
    
    // Eye parts (simple animated eye with lid)
    const eyeOuter = document.createElement('div');
    eyeOuter.className = 'unified-loading-eye-outer';
    
    const eyeInner = document.createElement('div');
    eyeInner.className = 'unified-loading-eye-inner';
    
    const eyeLid = document.createElement('div');
    eyeLid.className = 'unified-loading-eye-lid';
    
    eyeOuter.appendChild(eyeInner);
    eyeOuter.appendChild(eyeLid);
    eye.appendChild(eyeOuter);

    // Title text
    const title = document.createElement('h2');
    title.id = 'loadingOverlayTitle';
    title.className = 'unified-loading-title';
    title.textContent = 'Loading houseguest profiles...';

    // Progress bar container
    const progressBarContainer = document.createElement('div');
    progressBarContainer.className = 'unified-loading-progress-bar';
    progressBarContainer.setAttribute('role', 'progressbar');
    progressBarContainer.setAttribute('aria-valuemin', '0');
    progressBarContainer.setAttribute('aria-valuemax', '100');
    progressBarContainer.setAttribute('aria-valuenow', '0');
    
    const progressBarFill = document.createElement('div');
    progressBarFill.className = 'unified-loading-progress-bar-fill';
    progressBarFill.style.width = '0%';
    
    progressBarContainer.appendChild(progressBarFill);

    // Progress text
    const progress = document.createElement('div');
    progress.className = 'unified-loading-progress-text';
    progress.textContent = '0%';

    // Live region for screen readers
    const live = document.createElement('div');
    live.className = 'unified-loading-live-region sr-only';
    live.setAttribute('aria-live', 'polite');
    live.setAttribute('aria-atomic', 'true');

    // Error container (hidden by default)
    const error = document.createElement('div');
    error.className = 'unified-loading-error';
    error.style.display = 'none';
    error.setAttribute('role', 'alert');
    
    const errorTextEl = document.createElement('div');
    errorTextEl.className = 'unified-loading-error-text';
    
    const retryBtn = document.createElement('button');
    retryBtn.className = 'unified-loading-retry-btn';
    retryBtn.textContent = 'Retry';
    retryBtn.setAttribute('aria-label', 'Retry loading houseguest profiles');
    
    error.appendChild(errorTextEl);
    error.appendChild(retryBtn);

    // Assemble overlay
    root.appendChild(eye);
    root.appendChild(title);
    root.appendChild(progressBarContainer);
    root.appendChild(progress);
    root.appendChild(live);
    root.appendChild(error);

    // Store references
    eyeContainer = eye;
    progressText = progress;
    progressBar = progressBarFill;
    errorContainer = error;
    errorText = errorTextEl;
    retryButton = retryBtn;
    liveRegion = live;

    return root;
  }

  // ===== PUBLIC API =====

  /**
   * Show the loading overlay
   * Builds and displays the overlay with fade-in animation
   */
  function showOverlay() {
    if (isVisible && overlay) {
      console.info('[LoadingOverlay] Already visible, ignoring duplicate show');
      return;
    }

    console.info('[LoadingOverlay] Showing overlay');

    // Remove any existing overlay
    hideOverlay();

    // Build and append overlay
    overlay = buildOverlay();
    document.body.appendChild(overlay);

    // Reset state
    currentProgress = 0;
    updateProgress({ loaded: 0, total: 1 });

    // Trigger fade-in animation
    requestAnimationFrame(() => {
      overlay.classList.add('unified-loading-overlay--visible');
    });

    isVisible = true;

    // Log telemetry
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('loading_overlay_shown', {});
      }
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Hide the loading overlay
   * Removes the overlay with fade-out animation
   * @returns {Promise} Resolves when animation completes
   */
  function hideOverlay() {
    return new Promise((resolve) => {
      if (!overlay) {
        resolve();
        return;
      }

      console.info('[LoadingOverlay] Hiding overlay');

      overlay.setAttribute('aria-busy', 'false');
      overlay.classList.remove('unified-loading-overlay--visible');
      overlay.classList.add('unified-loading-overlay--hiding');

      // Wait for fade-out animation (300ms)
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        overlay = null;
        isVisible = false;
        
        // Log telemetry
        try {
          if (g.Telemetry && typeof g.Telemetry.log === 'function') {
            g.Telemetry.log('loading_overlay_hidden', {});
          }
        } catch (e) {
          // Non-blocking
        }
        
        resolve();
      }, 300);
    });
  }

  /**
   * Update progress indicator
   * @param {Object} progress - Progress info
   * @param {number} progress.loaded - Number of items loaded
   * @param {number} progress.total - Total number of items
   */
  function updateProgress(progress) {
    const { loaded = 0, total = 1 } = progress;
    const percent = total > 0 ? Math.round((loaded / total) * 100) : 0;
    
    // Prevent progress from going backwards
    if (percent < currentProgress) {
      return;
    }
    
    currentProgress = percent;

    // Update progress text
    if (progressText) {
      progressText.textContent = `${percent}%`;
    }

    // Update progress bar
    if (progressBar) {
      progressBar.style.width = `${percent}%`;
      
      // Update ARIA attribute
      const container = progressBar.parentElement;
      if (container) {
        container.setAttribute('aria-valuenow', String(percent));
      }
    }

    // Update live region for screen readers (every 25%)
    if (liveRegion && total > 0) {
      if (percent % 25 === 0 || percent === 100) {
        liveRegion.textContent = `Loading: ${percent}% complete`;
      }
    }

    // Log telemetry for milestones
    if (percent === 25 || percent === 50 || percent === 75 || percent === 100) {
      try {
        if (g.Telemetry && typeof g.Telemetry.log === 'function') {
          g.Telemetry.log('loading_overlay_progress', { 
            percent, 
            loaded, 
            total 
          });
        }
      } catch (e) {
        // Non-blocking
      }
    }
  }

  /**
   * Show error state in the overlay
   * @param {string} message - Error message to display
   * @param {Object} options - Error options
   * @param {Function} options.onRetry - Callback for retry button
   * @param {boolean} options.showRetry - Whether to show retry button (default: true)
   */
  function showError(message, options = {}) {
    const { onRetry = null, showRetry = true } = options;

    console.error('[LoadingOverlay] Showing error:', message);

    if (!overlay) {
      console.warn('[LoadingOverlay] Cannot show error, overlay not visible');
      return;
    }

    // Hide progress elements
    if (eyeContainer) eyeContainer.style.display = 'none';
    if (progressText) progressText.style.display = 'none';
    if (progressBar && progressBar.parentElement) {
      progressBar.parentElement.style.display = 'none';
    }

    // Show error container
    if (errorContainer) {
      errorContainer.style.display = 'flex';
    }

    // Set error message
    if (errorText) {
      errorText.textContent = message;
    }

    // Configure retry button
    if (retryButton) {
      if (showRetry && onRetry) {
        retryButton.style.display = 'block';
        retryButton.onclick = () => {
          console.info('[LoadingOverlay] Retry button clicked');
          
          // Log telemetry
          try {
            if (g.Telemetry && typeof g.Telemetry.log === 'function') {
              g.Telemetry.log('loading_overlay_retry', {});
            }
          } catch (e) {
            // Non-blocking
          }
          
          onRetry();
        };
      } else {
        retryButton.style.display = 'none';
      }
    }

    // Update live region for screen readers
    if (liveRegion) {
      liveRegion.textContent = `Error: ${message}`;
    }

    // Log telemetry
    try {
      if (g.Telemetry && typeof g.Telemetry.log === 'function') {
        g.Telemetry.log('loading_overlay_error', { message });
      }
    } catch (e) {
      // Non-blocking
    }
  }

  /**
   * Check if overlay is currently visible
   * @returns {boolean} True if visible
   */
  function isOverlayVisible() {
    return isVisible;
  }

  // ===== EXPORT =====

  const LoadingOverlay = {
    showOverlay,
    hideOverlay,
    updateProgress,
    showError,
    isVisible: isOverlayVisible
  };

  // Export to global namespace
  g.LoadingOverlay = LoadingOverlay;
  
  // Also export to window for compatibility
  if (typeof window !== 'undefined') {
    window.LoadingOverlay = LoadingOverlay;
  }

  console.info('[LoadingOverlay] Module loaded');

})(window.game || (window.game = {}));
