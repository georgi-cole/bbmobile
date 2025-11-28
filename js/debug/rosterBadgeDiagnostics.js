/**
 * rosterBadgeDiagnostics.js
 * 
 * Diagnostic module for mobile roster badge rendering issues.
 * Instruments badge lifecycle: creation, style application, layout box after animation frame.
 * 
 * Enable via: window.game.cfg.debugBadges = true
 * Or via URL parameter: ?debugBadges=1
 * 
 * Features:
 * - Console grouped logs showing badge metrics
 * - Optional on-screen overlay with badge diagnostics
 * - CSS variable resolution verification
 * - DevicePixelRatio comparison for border calculations
 * - Forced reflow + requestAnimationFrame chain for style calc
 * - Fallback class application for collapsed badges
 */

(function(global) {
  'use strict';

  // ============================
  // Configuration
  // ============================
  
  const CONFIG = {
    // Minimum size threshold (px) - below this, apply fallback
    MIN_BADGE_SIZE: 4,
    // Number of frames to wait before measuring
    FRAMES_BEFORE_CHECK: 2,
    // Fallback class to apply when badge is too small
    FALLBACK_CLASS: 'badge--force-visible',
    // CSS debug stylesheet path
    DEBUG_CSS_PATH: 'css/debug_badges.css',
    // Overlay update interval (ms)
    OVERLAY_UPDATE_INTERVAL: 1000,
    // Border width clamp range (px)
    BORDER_WIDTH_MIN: 1,
    BORDER_WIDTH_MAX: 3,
    // Expected border width at DPR 1
    EXPECTED_BORDER_WIDTH_1X: 2,
  };

  // ============================
  // State
  // ============================
  
  const state = {
    enabled: false,
    overlayVisible: false,
    overlayElement: null,
    updateInterval: null,
    cssLoaded: false,
    badgeMetrics: new Map(),
    lastCheckTime: null,
    dpr: 1,
    cssVars: {},
  };

  // ============================
  // Utilities
  // ============================

  /**
   * Check if diagnostics are enabled via config or URL
   */
  function isDiagnosticsEnabled() {
    // Check URL parameter
    const params = new URLSearchParams(window.location.search);
    if (params.get('debugBadges') === '1') {
      return true;
    }
    
    // Check game config
    if (global.game && global.game.cfg && global.game.cfg.debugBadges) {
      return true;
    }
    
    return false;
  }

  /**
   * Log to console in grouped format
   */
  function logGroup(title, data) {
    if (!state.enabled) return;
    
    console.groupCollapsed(`[BadgeDiag] ${title}`);
    if (typeof data === 'object') {
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key}:`, value);
      });
    } else {
      console.log(data);
    }
    console.groupEnd();
  }

  /**
   * Log warning
   */
  function logWarn(message, data) {
    if (!state.enabled) return;
    console.warn(`[BadgeDiag] ⚠️ ${message}`, data || '');
  }

  /**
   * Log error (kept for future use in more detailed error reporting)
   */
  // eslint-disable-next-line no-unused-vars
  function logError(message, data) {
    console.error(`[BadgeDiag] ❌ ${message}`, data || '');
  }

  /**
   * Get devicePixelRatio
   */
  function getDevicePixelRatio() {
    return global.devicePixelRatio || 1;
  }

  /**
   * Compute adjusted border width based on DPR
   * Clamps to reasonable range to prevent thick borders on high-DPR devices
   */
  function computeAdjustedBorderWidth(baseBorderWidth) {
    const dpr = getDevicePixelRatio();
    // Scale inversely with DPR to maintain consistent visual thickness
    // At 2x DPR, a 2px CSS border appears as 4 physical pixels, so we halve it
    let adjusted = baseBorderWidth / dpr;
    
    // Clamp to min/max
    adjusted = Math.max(CONFIG.BORDER_WIDTH_MIN, Math.min(CONFIG.BORDER_WIDTH_MAX, adjusted));
    
    return Math.round(adjusted * 10) / 10; // Round to 1 decimal
  }

  // ============================
  // CSS Variable Resolution
  // ============================

  /**
   * Get computed CSS variable from :root or element
   */
  function getCSSVariable(varName, element = document.documentElement) {
    const value = getComputedStyle(element).getPropertyValue(varName);
    return value ? value.trim() : null;
  }

  /**
   * Collect all badge-related CSS variables
   */
  function collectCSSVariables() {
    const vars = {
      // Badge sizing
      '--badge-size': getCSSVariable('--badge-size'),
      '--badge-font-size': getCSSVariable('--badge-font-size'),
      '--badge-padding': getCSSVariable('--badge-padding'),
      
      // Avatar border
      '--avatar-border-width': getCSSVariable('--avatar-border-width'),
      '--roster-border': getCSSVariable('--roster-border'),
      '--line': getCSSVariable('--line'),
      
      // Theme colors
      '--card': getCSSVariable('--card'),
      '--ink': getCSSVariable('--ink'),
      '--accent': getCSSVariable('--accent'),
      
      // Mobile roster specific
      '--mobile-roster-gap': getCSSVariable('--mobile-roster-gap'),
      '--mobile-roster-tile-size': getCSSVariable('--mobile-roster-tile-size'),
      '--mobile-roster-cols': getCSSVariable('--mobile-roster-cols'),
    };
    
    state.cssVars = vars;
    return vars;
  }

  /**
   * Check if critical CSS variables are resolved
   */
  function checkCSSVariableResolution() {
    const vars = collectCSSVariables();
    const issues = [];
    
    // Check for null/empty critical variables
    const criticalVars = ['--line', '--card', '--ink'];
    criticalVars.forEach(varName => {
      if (!vars[varName]) {
        issues.push(`${varName} not resolved`);
      }
    });
    
    if (issues.length > 0) {
      logWarn('CSS variable resolution issues', issues);
    }
    
    return { vars, issues };
  }

  // ============================
  // Badge Metrics Collection
  // ============================

  /**
   * Get computed metrics for a badge element
   */
  function getBadgeMetrics(badgeElement) {
    if (!badgeElement) return null;
    
    const computedStyle = getComputedStyle(badgeElement);
    const rect = badgeElement.getBoundingClientRect();
    
    return {
      // Dimensions
      width: rect.width,
      height: rect.height,
      clientWidth: badgeElement.clientWidth,
      clientHeight: badgeElement.clientHeight,
      offsetWidth: badgeElement.offsetWidth,
      offsetHeight: badgeElement.offsetHeight,
      
      // Visibility
      display: computedStyle.display,
      visibility: computedStyle.visibility,
      opacity: computedStyle.opacity,
      
      // Position
      position: computedStyle.position,
      top: computedStyle.top,
      right: computedStyle.right,
      bottom: computedStyle.bottom,
      left: computedStyle.left,
      
      // Transform (can cause subpixel rounding)
      transform: computedStyle.transform,
      
      // Font size
      fontSize: computedStyle.fontSize,
      
      // Classes
      classList: Array.from(badgeElement.classList),
      
      // Content
      textContent: badgeElement.textContent,
      
      // Timestamp
      measuredAt: Date.now(),
    };
  }

  /**
   * Collect metrics for all badge elements on the page
   */
  function collectAllBadgeMetrics() {
    const badges = document.querySelectorAll('.mobile-roster-badge-overlay, .mobile-roster-badge');
    const metrics = [];
    
    badges.forEach((badge, index) => {
      const tile = badge.closest('.mobile-roster-tile');
      const playerId = tile ? tile.getAttribute('data-player-id') : null;
      
      const badgeMetrics = getBadgeMetrics(badge);
      badgeMetrics.index = index;
      badgeMetrics.playerId = playerId;
      badgeMetrics.isOverlay = badge.classList.contains('mobile-roster-badge-overlay');
      
      // Check if badge is problematic
      badgeMetrics.issues = [];
      if (badgeMetrics.width < CONFIG.MIN_BADGE_SIZE || badgeMetrics.height < CONFIG.MIN_BADGE_SIZE) {
        badgeMetrics.issues.push('size_too_small');
      }
      if (badgeMetrics.display === 'none') {
        badgeMetrics.issues.push('display_none');
      }
      if (parseFloat(badgeMetrics.opacity) === 0) {
        badgeMetrics.issues.push('opacity_zero');
      }
      if (badgeMetrics.visibility === 'hidden') {
        badgeMetrics.issues.push('visibility_hidden');
      }
      
      metrics.push(badgeMetrics);
      state.badgeMetrics.set(`${playerId || index}`, badgeMetrics);
    });
    
    return metrics;
  }

  /**
   * Collect avatar container metrics for border analysis
   */
  function collectAvatarMetrics() {
    const avatarWraps = document.querySelectorAll('.mobile-roster-avatar-wrap');
    const metrics = [];
    
    avatarWraps.forEach((wrap, index) => {
      const computedStyle = getComputedStyle(wrap);
      const tile = wrap.closest('.mobile-roster-tile');
      const playerId = tile ? tile.getAttribute('data-player-id') : null;
      
      metrics.push({
        index,
        playerId,
        borderWidth: computedStyle.borderWidth,
        borderColor: computedStyle.borderColor,
        borderStyle: computedStyle.borderStyle,
        boxShadow: computedStyle.boxShadow,
        width: wrap.offsetWidth,
        height: wrap.offsetHeight,
      });
    });
    
    return metrics;
  }

  // ============================
  // Forced Reflow & Frame Chain
  // ============================

  /**
   * Force reflow by reading layout property
   */
  function forceReflow(element) {
    // Reading offsetHeight forces a reflow
    return element ? element.offsetHeight : document.body.offsetHeight;
  }

  /**
   * Wait for N animation frames then execute callback
   */
  function afterFrames(frameCount, callback) {
    if (frameCount <= 0) {
      callback();
      return;
    }
    
    requestAnimationFrame(() => {
      afterFrames(frameCount - 1, callback);
    });
  }

  /**
   * Force reflow + wait for animation frames before measuring
   */
  function measureAfterReflow(element, callback) {
    // Force reflow
    forceReflow(element);
    
    // Wait for specified frames
    afterFrames(CONFIG.FRAMES_BEFORE_CHECK, () => {
      const metrics = getBadgeMetrics(element);
      callback(metrics);
    });
  }

  // ============================
  // Badge Visibility Fallback
  // ============================

  /**
   * Check and apply fallback visibility for collapsed badges
   */
  function checkAndApplyFallback(badgeElement) {
    if (!badgeElement) return false;
    
    const rect = badgeElement.getBoundingClientRect();
    const isTooSmall = rect.width < CONFIG.MIN_BADGE_SIZE || rect.height < CONFIG.MIN_BADGE_SIZE;
    const isHidden = getComputedStyle(badgeElement).display === 'none';
    const isInvisible = parseFloat(getComputedStyle(badgeElement).opacity) === 0;
    
    if (isTooSmall || isHidden || isInvisible) {
      // Apply fallback class
      badgeElement.classList.add(CONFIG.FALLBACK_CLASS);
      logWarn(`Applied fallback to badge`, {
        element: badgeElement,
        width: rect.width,
        height: rect.height,
        display: getComputedStyle(badgeElement).display,
        opacity: getComputedStyle(badgeElement).opacity
      });
      return true;
    }
    
    return false;
  }

  /**
   * Check all badges and apply fallbacks as needed
   */
  function checkAllBadgesAndApplyFallbacks() {
    const badges = document.querySelectorAll('.mobile-roster-badge-overlay, .mobile-roster-badge');
    let fallbacksApplied = 0;
    
    badges.forEach(badge => {
      measureAfterReflow(badge, (metrics) => {
        if (metrics.issues && metrics.issues.length > 0) {
          if (checkAndApplyFallback(badge)) {
            fallbacksApplied++;
          }
        }
      });
    });
    
    return fallbacksApplied;
  }

  // ============================
  // Border Width Normalization
  // ============================

  /**
   * Normalize avatar border width across DPR values
   */
  function normalizeAvatarBorderWidth() {
    const dpr = getDevicePixelRatio();
    state.dpr = dpr;
    
    // Compute adjusted border width
    const adjustedWidth = computeAdjustedBorderWidth(CONFIG.EXPECTED_BORDER_WIDTH_1X);
    
    // Apply to CSS custom property on root
    document.documentElement.style.setProperty('--avatar-border-width-normalized', `${adjustedWidth}px`);
    
    // Apply directly to avatar wraps as fallback
    const avatarWraps = document.querySelectorAll('.mobile-roster-avatar-wrap');
    avatarWraps.forEach(wrap => {
      // Only apply if no explicit border is set
      const currentBorder = getComputedStyle(wrap).borderWidth;
      if (!currentBorder || currentBorder === '0px') {
        wrap.style.borderWidth = `${adjustedWidth}px`;
      }
    });
    
    logGroup('Border width normalization', {
      dpr,
      baseBorderWidth: CONFIG.EXPECTED_BORDER_WIDTH_1X,
      adjustedWidth,
      avatarWrapsUpdated: avatarWraps.length,
    });
    
    return adjustedWidth;
  }

  // ============================
  // Debug Overlay
  // ============================

  /**
   * Create or update the on-screen debug overlay
   */
  function createOverlay() {
    if (state.overlayElement) {
      return state.overlayElement;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'badge-diagnostics-overlay';
    overlay.innerHTML = `
      <div class="badge-diag-header">
        <h4>🔍 Badge Diagnostics</h4>
        <button class="badge-diag-close" aria-label="Close diagnostics">✕</button>
      </div>
      <div class="badge-diag-content">
        <div class="badge-diag-section">
          <h5>Device Info</h5>
          <div class="badge-diag-item" data-field="dpr">DPR: <span>-</span></div>
          <div class="badge-diag-item" data-field="viewport">Viewport: <span>-</span></div>
        </div>
        <div class="badge-diag-section">
          <h5>Badge Status</h5>
          <div class="badge-diag-item" data-field="badgeCount">Total: <span>0</span></div>
          <div class="badge-diag-item" data-field="visibleCount">Visible: <span>0</span></div>
          <div class="badge-diag-item" data-field="issueCount">Issues: <span>0</span></div>
        </div>
        <div class="badge-diag-section">
          <h5>CSS Variables</h5>
          <div class="badge-diag-item" data-field="cssVarsResolved">Resolved: <span>-</span></div>
          <div class="badge-diag-item" data-field="cssVarsIssues">Issues: <span>-</span></div>
        </div>
        <div class="badge-diag-section">
          <h5>Border Width</h5>
          <div class="badge-diag-item" data-field="borderWidth">Normalized: <span>-</span></div>
        </div>
        <div class="badge-diag-issues" data-field="issuesList"></div>
      </div>
    `;
    
    // Inline styles for overlay (in case CSS not loaded)
    overlay.style.cssText = `
      position: fixed;
      bottom: 10px;
      left: 10px;
      width: min(90vw, 280px);
      max-height: 50vh;
      background: rgba(0, 0, 0, 0.9);
      color: #fff;
      border: 2px solid #00d4ff;
      border-radius: 8px;
      z-index: 99999;
      font-family: monospace;
      font-size: 11px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    `;
    
    document.body.appendChild(overlay);
    state.overlayElement = overlay;
    
    // Close button handler
    overlay.querySelector('.badge-diag-close').addEventListener('click', hideOverlay);
    
    // Apply inline styles to children
    const header = overlay.querySelector('.badge-diag-header');
    header.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 10px;
      background: #00d4ff;
      color: #000;
    `;
    
    header.querySelector('h4').style.cssText = 'margin: 0; font-size: 12px;';
    
    const closeBtn = overlay.querySelector('.badge-diag-close');
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: #000;
      font-size: 16px;
      cursor: pointer;
      padding: 0;
      line-height: 1;
    `;
    
    const content = overlay.querySelector('.badge-diag-content');
    content.style.cssText = 'padding: 8px; overflow-y: auto; flex: 1;';
    
    overlay.querySelectorAll('.badge-diag-section').forEach(section => {
      section.style.cssText = 'margin-bottom: 10px;';
    });
    
    overlay.querySelectorAll('.badge-diag-section h5').forEach(h5 => {
      h5.style.cssText = 'margin: 0 0 4px 0; color: #00d4ff; font-size: 10px; text-transform: uppercase;';
    });
    
    overlay.querySelectorAll('.badge-diag-item').forEach(item => {
      item.style.cssText = 'display: flex; justify-content: space-between; padding: 2px 0;';
    });
    
    return overlay;
  }

  /**
   * Update overlay with current metrics
   */
  function updateOverlay() {
    if (!state.overlayElement) return;
    
    const overlay = state.overlayElement;
    const metrics = collectAllBadgeMetrics();
    const cssCheck = checkCSSVariableResolution();
    
    // Device info
    const dprSpan = overlay.querySelector('[data-field="dpr"] span');
    if (dprSpan) dprSpan.textContent = getDevicePixelRatio();
    
    const viewportSpan = overlay.querySelector('[data-field="viewport"] span');
    if (viewportSpan) viewportSpan.textContent = `${window.innerWidth}×${window.innerHeight}`;
    
    // Badge status
    const badgeCountSpan = overlay.querySelector('[data-field="badgeCount"] span');
    if (badgeCountSpan) badgeCountSpan.textContent = metrics.length;
    
    const visibleCount = metrics.filter(m => m.issues.length === 0).length;
    const visibleSpan = overlay.querySelector('[data-field="visibleCount"] span');
    if (visibleSpan) visibleSpan.textContent = visibleCount;
    
    const issueCount = metrics.filter(m => m.issues.length > 0).length;
    const issueSpan = overlay.querySelector('[data-field="issueCount"] span');
    if (issueSpan) {
      issueSpan.textContent = issueCount;
      issueSpan.style.color = issueCount > 0 ? '#ff4444' : '#44ff44';
    }
    
    // CSS variables
    const resolvedCount = Object.values(cssCheck.vars).filter(v => v !== null).length;
    const totalVars = Object.keys(cssCheck.vars).length;
    const resolvedSpan = overlay.querySelector('[data-field="cssVarsResolved"] span');
    if (resolvedSpan) resolvedSpan.textContent = `${resolvedCount}/${totalVars}`;
    
    const cssIssuesSpan = overlay.querySelector('[data-field="cssVarsIssues"] span');
    if (cssIssuesSpan) {
      cssIssuesSpan.textContent = cssCheck.issues.length;
      cssIssuesSpan.style.color = cssCheck.issues.length > 0 ? '#ff4444' : '#44ff44';
    }
    
    // Border width
    const borderSpan = overlay.querySelector('[data-field="borderWidth"] span');
    if (borderSpan) {
      const adjustedWidth = computeAdjustedBorderWidth(CONFIG.EXPECTED_BORDER_WIDTH_1X);
      borderSpan.textContent = `${adjustedWidth}px`;
    }
    
    // Issues list
    const issuesList = overlay.querySelector('[data-field="issuesList"]');
    if (issuesList) {
      const problematicBadges = metrics.filter(m => m.issues.length > 0);
      if (problematicBadges.length > 0) {
        issuesList.style.cssText = `
          margin-top: 8px;
          padding: 8px;
          background: rgba(255, 68, 68, 0.2);
          border-radius: 4px;
        `;
        issuesList.innerHTML = `
          <div style="color: #ff4444; margin-bottom: 4px;">⚠️ Badge Issues:</div>
          ${problematicBadges.map(m => `
            <div style="padding: 2px 0;">
              ${m.playerId || m.index}: ${m.issues.join(', ')}
              (${m.width.toFixed(1)}×${m.height.toFixed(1)}px)
            </div>
          `).join('')}
        `;
      } else {
        issuesList.innerHTML = '';
        issuesList.style.cssText = '';
      }
    }
  }

  /**
   * Show overlay
   */
  function showOverlay() {
    createOverlay();
    state.overlayVisible = true;
    updateOverlay();
    
    // Start periodic updates
    if (!state.updateInterval) {
      state.updateInterval = setInterval(updateOverlay, CONFIG.OVERLAY_UPDATE_INTERVAL);
    }
  }

  /**
   * Hide overlay
   */
  function hideOverlay() {
    if (state.overlayElement) {
      state.overlayElement.remove();
      state.overlayElement = null;
    }
    
    state.overlayVisible = false;
    
    if (state.updateInterval) {
      clearInterval(state.updateInterval);
      state.updateInterval = null;
    }
  }

  /**
   * Toggle overlay visibility
   */
  function toggleOverlay() {
    if (state.overlayVisible) {
      hideOverlay();
    } else {
      showOverlay();
    }
  }

  // ============================
  // Debug CSS Loading
  // ============================

  /**
   * Load debug CSS stylesheet
   */
  function loadDebugCSS() {
    if (state.cssLoaded) return;
    
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CONFIG.DEBUG_CSS_PATH;
    link.id = 'badge-diagnostics-css';
    link.onerror = () => {
      logWarn('Failed to load debug CSS', CONFIG.DEBUG_CSS_PATH);
    };
    link.onload = () => {
      state.cssLoaded = true;
      logGroup('Debug CSS loaded', { path: CONFIG.DEBUG_CSS_PATH });
    };
    
    document.head.appendChild(link);
  }

  /**
   * Unload debug CSS stylesheet
   */
  function unloadDebugCSS() {
    const link = document.getElementById('badge-diagnostics-css');
    if (link) {
      link.remove();
      state.cssLoaded = false;
    }
  }

  // ============================
  // Initialization
  // ============================

  /**
   * Initialize diagnostics
   */
  function init() {
    state.enabled = isDiagnosticsEnabled();
    
    if (!state.enabled) {
      console.info('[BadgeDiag] Diagnostics disabled. Enable with ?debugBadges=1 or game.cfg.debugBadges=true');
      return false;
    }
    
    console.info('[BadgeDiag] 🚀 Initializing badge diagnostics...');
    
    // Collect initial metrics
    state.dpr = getDevicePixelRatio();
    checkCSSVariableResolution();
    
    // Load debug CSS
    loadDebugCSS();
    
    // Show overlay
    showOverlay();
    
    // Normalize border widths
    normalizeAvatarBorderWidth();
    
    // Run initial badge check after DOM settles
    afterFrames(CONFIG.FRAMES_BEFORE_CHECK, () => {
      const metrics = collectAllBadgeMetrics();
      logGroup('Initial badge metrics', { count: metrics.length, metrics });
      
      // Apply fallbacks for problematic badges
      checkAllBadgesAndApplyFallbacks();
    });
    
    // Listen for roster updates
    if (global.bbGameBus) {
      global.bbGameBus.on('players:update', () => {
        afterFrames(CONFIG.FRAMES_BEFORE_CHECK, () => {
          collectAllBadgeMetrics();
          checkAllBadgesAndApplyFallbacks();
          normalizeAvatarBorderWidth();
          updateOverlay();
        });
      });
    }
    
    // Observe DOM for new badges
    const observer = new MutationObserver((mutations) => {
      let hasNewBadges = false;
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && (
              node.classList.contains('mobile-roster-badge-overlay') ||
              node.classList.contains('mobile-roster-badge') ||
              node.classList.contains('mobile-roster-tile')
            )) {
              hasNewBadges = true;
            }
            // Also check children
            if (node.querySelector && node.querySelector('.mobile-roster-badge-overlay, .mobile-roster-badge')) {
              hasNewBadges = true;
            }
          }
        });
      });
      
      if (hasNewBadges) {
        afterFrames(CONFIG.FRAMES_BEFORE_CHECK, () => {
          collectAllBadgeMetrics();
          checkAllBadgesAndApplyFallbacks();
          updateOverlay();
        });
      }
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    console.info('[BadgeDiag] ✅ Initialization complete');
    return true;
  }

  /**
   * Disable diagnostics
   */
  function disable() {
    state.enabled = false;
    hideOverlay();
    unloadDebugCSS();
    console.info('[BadgeDiag] Diagnostics disabled');
  }

  /**
   * Run manual diagnostic check
   */
  function runDiagnostic() {
    const results = {
      timestamp: new Date().toISOString(),
      dpr: getDevicePixelRatio(),
      viewport: { width: window.innerWidth, height: window.innerHeight },
      cssVariables: checkCSSVariableResolution(),
      badgeMetrics: collectAllBadgeMetrics(),
      avatarMetrics: collectAvatarMetrics(),
      normalizedBorderWidth: computeAdjustedBorderWidth(CONFIG.EXPECTED_BORDER_WIDTH_1X),
    };
    
    // Log full results
    console.group('[BadgeDiag] 📊 Manual Diagnostic Results');
    console.log('Timestamp:', results.timestamp);
    console.log('DPR:', results.dpr);
    console.log('Viewport:', results.viewport);
    console.log('CSS Variables:', results.cssVariables);
    console.log('Badge Metrics:', results.badgeMetrics);
    console.log('Avatar Metrics:', results.avatarMetrics);
    console.log('Normalized Border Width:', results.normalizedBorderWidth + 'px');
    console.groupEnd();
    
    return results;
  }

  // ============================
  // Public API
  // ============================

  const RosterBadgeDiagnostics = {
    init,
    disable,
    runDiagnostic,
    toggleOverlay,
    showOverlay,
    hideOverlay,
    collectBadgeMetrics: collectAllBadgeMetrics,
    collectAvatarMetrics,
    checkCSSVariables: checkCSSVariableResolution,
    normalizeAvatarBorderWidth,
    checkAllBadgesAndApplyFallbacks,
    getState: () => ({ ...state }),
    CONFIG,
  };

  // Export to global scope
  global.RosterBadgeDiagnostics = RosterBadgeDiagnostics;

  console.info('[BadgeDiag] Module loaded');

  // Auto-initialize if enabled
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      if (isDiagnosticsEnabled()) {
        init();
      }
    });
  } else {
    if (isDiagnosticsEnabled()) {
      setTimeout(init, 0);
    }
  }

})(window);
