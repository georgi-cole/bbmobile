// MODULE: competitions-flow.js
// Competition flow with instructions popup and fullscreen minigame overlay
// Handles: show instructions → play button → fullscreen game → completion → return
//
// ═══════════════════════════════════════════════════════════════════════════
// GUARD SYSTEM & LIFECYCLE FLAGS (Anti-TDZ, Anti-Circular-Dependency)
// ═══════════════════════════════════════════════════════════════════════════
//
// This module implements comprehensive guards to prevent:
// 1. Temporal Dead Zone (TDZ) errors from early/circular invocations
// 2. Silent failures when competition instructions don't render
// 3. Race conditions with game object initialization
// 4. Concurrent fullscreen overlays
//
// Lifecycle Flags:
// - window.__competitionFlowModuleStarted: Set at module entry
// - window.__competitionFlowModuleEvaluating: True during IIFE body execution
// - window.__competitionFlowModuleReady: True after module fully initialized
//
// Call Queuing:
// - Calls before readiness are queued and replayed after initialization
// - Queue stored in window.__competitionFlowDeferredCalls
//
// Game Object Resolution:
// - getGameRef() helper retries up to 500ms with 10 attempts
// - Falls back to no-op stub if game object unavailable
//
// Instructions Verification:
// - Post-render checks card attachment via microtask + animation frame
// - Re-attempts render once if detached; logs diagnostics
//
// Concurrency Control:
// - Only one fullscreen overlay allowed at a time
// - Subsequent attempts dispatch 'competition-flow-error' event
//
// Self-Test:
// - Runs once on first readiness
// - Dispatches 'competition-flow-selftest' event with result
// - Sets window.__competitionFlowSelfTestFailed flag on failure
//
// Telemetry Events:
// - competition-flow-init
// - competition-flow-instructions-rendered
// - competition-flow-fullscreen-launched
// - competition-flow-fullscreen-closed
// - competition-flow-error
// - competition-flow-selftest
//
// ═══════════════════════════════════════════════════════════════════════════

(function(g){
  'use strict';
  
  // ═══ Module Lifecycle Flags ═══
  window.__competitionFlowModuleStarted = true;
  window.__competitionFlowModuleEvaluating = true;

  // ═══ Call Queuing & Deferred Execution ═══
  window.__competitionFlowDeferredCalls = window.__competitionFlowDeferredCalls || [];
  window.__competitionFlowDeferredInstructions = window.__competitionFlowDeferredInstructions || [];
  
  // Track active minigame overlays and instructions for cleanup on phase change
  let activeMinigameOverlay = null;
  let activeInstructionsCard = null;
  let activeMinigameCleanup = null;
  
  // ═══ Detach Detection & Consolidated Logging ═══
  // Track detach events to consolidate warnings within a short window
  let detachEventCount = 0;
  let lastDetachLogTime = 0;
  const DETACH_LOG_THROTTLE_MS = 2000; // Consolidate warnings within 2s window
  
  /**
   * Log detach event with throttling to prevent spam
   * If multiple detach events occur within 2s, consolidate to a single warning
   * 
   * @param {Object} diagnostic - Diagnostic details
   * @returns {boolean} True if logged, false if throttled
   */
  function logDetachEvent(diagnostic) {
    const now = Date.now();
    detachEventCount++;
    
    // Check if we're within the throttle window
    if (now - lastDetachLogTime < DETACH_LOG_THROTTLE_MS) {
      // Throttled - only emit telemetry, not console
      dispatchTelemetryEvent('instructions-detach-throttled', {
        count: detachEventCount,
        ...diagnostic
      });
      return false;
    }
    
    // Log the event
    lastDetachLogTime = now;
    
    if (detachEventCount > 1) {
      console.warn(`[CompetitionFlow][Guard] Instructions detach detected (${detachEventCount} events in window)`, diagnostic);
    } else {
      console.warn('[CompetitionFlow][Guard] Instructions card detached after render', diagnostic);
    }
    
    dispatchTelemetryEvent('instructions-detach-detected', {
      count: detachEventCount,
      ...diagnostic
    });
    
    // Reset count after logging
    detachEventCount = 0;
    
    return true;
  }
  
  // ═══ Centralized Game Object Resolution ═══
  /**
   * Get game object reference with retry logic
   * Attempts up to 10 times with 50ms intervals (500ms total)
   * Falls back to no-op stub if unavailable
   * 
   * @returns {Promise<Object>} Game object or stub
   */
  async function getGameRef() {
    const maxAttempts = 10;
    const retryDelay = 50; // ms
    
    for (let i = 0; i < maxAttempts; i++) {
      if (window.game && typeof window.game === 'object') {
        return window.game;
      }
      if (window.global && window.global.game && typeof window.global.game === 'object') {
        return window.global.game;
      }
      if (g.game && typeof g.game === 'object') {
        return g.game;
      }
      
      // Wait before retry (except on last attempt)
      if (i < maxAttempts - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
    
    // Log warning once
    if (!window.__competitionFlowGameUnavailableWarned) {
      console.warn('[CompetitionFlow][Guard] Game object unavailable after retries, using stub');
      window.__competitionFlowGameUnavailableWarned = true;
    }
    
    // Return no-op stub
    return {
      cfg: {},
      players: [],
      phase: 'unknown'
    };
  }
  
  /**
   * Dispatch telemetry event with structured detail
   * 
   * @param {string} eventName - Event name (without 'competition-flow-' prefix)
   * @param {Object} detail - Event detail object
   */
  function dispatchTelemetryEvent(eventName, detail = {}) {
    try {
      const fullEventName = `competition-flow-${eventName}`;
      const event = new CustomEvent(fullEventName, {
        detail: {
          timestamp: Date.now(),
          ...detail
        },
        bubbles: true,
        cancelable: false
      });
      document.dispatchEvent(event);
      console.info(`[CompetitionFlow][Telemetry] Event: ${fullEventName}`, detail);
    } catch (err) {
      console.warn('[CompetitionFlow][Telemetry] Failed to dispatch event:', eventName, err);
    }
  }
  
  /**
   * Check if a function call should be queued (called before module ready)
   * 
   * @param {string} funcName - Function name
   * @param {Array} args - Function arguments
   * @returns {boolean} True if call was queued, false if should proceed
   */
  function checkAndQueueIfNotReady(funcName, args) {
    if (window.__competitionFlowModuleReady) {
      return false; // Module ready, proceed with call
    }
    
    console.warn(`[CompetitionFlow][Guard] ${funcName} called before module ready, queuing call`);
    window.__competitionFlowDeferredCalls.push({ funcName, args, timestamp: Date.now() });
    
    dispatchTelemetryEvent('error', {
      type: 'early-invocation',
      function: funcName,
      message: 'Function called before module ready'
    });
    
    return true; // Call was queued
  }
  
  /**
   * Flush deferred calls after module becomes ready
   */
  function flushDeferredCalls() {
    console.info('[CompetitionFlow][Guard] Flushing deferred calls:', window.__competitionFlowDeferredCalls.length);
    
    const calls = [...window.__competitionFlowDeferredCalls];
    window.__competitionFlowDeferredCalls = [];
    
    calls.forEach(({ funcName, args }) => {
      try {
        console.info(`[CompetitionFlow][Guard] Replaying deferred call: ${funcName}`);
        
        // Call the appropriate function
        if (funcName === 'runCompetitionFlow' && typeof runCompetitionFlow === 'function') {
          runCompetitionFlow(...args);
        } else if (funcName === 'showInstructionsInTV' && typeof showInstructionsInTV === 'function') {
          showInstructionsInTV(...args);
        } else if (funcName === 'launchFullscreenMinigame' && typeof launchFullscreenMinigame === 'function') {
          launchFullscreenMinigame(...args);
        } else {
          console.warn(`[CompetitionFlow][Guard] Unknown deferred function: ${funcName}`);
        }
      } catch (err) {
        console.error(`[CompetitionFlow][Guard] Error replaying deferred call: ${funcName}`, err);
      }
    });
    
    // Also flush deferred instructions
    const instructions = [...window.__competitionFlowDeferredInstructions];
    window.__competitionFlowDeferredInstructions = [];
    
    instructions.forEach(({ gameKey, container, onPlay }) => {
      try {
        console.info(`[CompetitionFlow][Guard] Replaying deferred instructions: ${gameKey}`);
        if (typeof showInstructionsInTV === 'function') {
          showInstructionsInTV(gameKey, container, onPlay);
        }
      } catch (err) {
        console.error('[CompetitionFlow][Guard] Error replaying deferred instructions', err);
      }
    });
  }

  /**
   * Clean up any active minigames and instructions on phase change
   * Called by forceClearPhaseUI in ui.hud-and-router.js
   */
  function cleanupOnPhaseChange(){
    console.info('[CompetitionFlow] Phase changed, cleaning up active minigames/instructions');
    
    // Close active instructions card
    if(activeInstructionsCard && activeInstructionsCard.parentNode){
      activeInstructionsCard.remove();
      activeInstructionsCard = null;
    }
    
    // Force close active minigame overlay (auto-cancel, no score submission)
    if(activeMinigameCleanup && typeof activeMinigameCleanup === 'function'){
      console.warn('[CompetitionFlow] Force closing minigame due to phase change');
      // Show brief message before closing
      if(activeMinigameOverlay && activeMinigameOverlay.parentNode){
        const phaseEndMsg = document.createElement('div');
        phaseEndMsg.style.cssText = `
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10003;
          background: rgba(0, 0, 0, 0.7);
          pointer-events: none;
        `;
        
        const msgBox = document.createElement('div');
        msgBox.style.cssText = `
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.95), rgba(234, 88, 12, 0.95));
          border: 2px solid #f97316;
          border-radius: 16px;
          padding: 24px 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          text-align: center;
        `;
        
        msgBox.innerHTML = `
          <div style="font-size: 1.6rem; font-weight: bold; color: white; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
            ⚠️ Phase Ended
          </div>
          <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.9); margin-top: 8px;">
            Challenge canceled
          </div>
        `;
        
        phaseEndMsg.appendChild(msgBox);
        activeMinigameOverlay.appendChild(phaseEndMsg);
        
        // Close after brief display
        setTimeout(() => {
          activeMinigameCleanup();
          activeMinigameCleanup = null;
        }, 1200);
      } else {
        activeMinigameCleanup();
        activeMinigameCleanup = null;
      }
    }
    
    activeMinigameOverlay = null;
    
    // Neutralize empty #tvOverlay if it has no active content (defensive guard)
    (function ensureOverlayNotBlocking(){
      try {
        const ov = document.getElementById('tvOverlay');
        if (!ov) return;
        const content = ov.querySelector('.tvOverlayContent');
        const hasActiveContent = !!(content && content.childElementCount > 0);
        if (!hasActiveContent) {
          ov.style.pointerEvents = 'none';
        }
      } catch(e){ console.warn('[CompetitionFlow] tvOverlay neutralization failed', e); }
    })();
  }

  /**
   * Get theme colors from current theme
   * Returns CSS variable values that adapt to the active theme
   */
  function getThemeColors(){
    // Get computed values from CSS variables
    const computedStyle = getComputedStyle(document.body);
    
    // Helper to convert CSS color to rgba with custom opacity
    function getRgbaFromCssVar(varName, opacity = 1) {
      const color = computedStyle.getPropertyValue(varName).trim();
      
      // If already rgba, extract rgb and apply new opacity
      if (color.startsWith('rgba')) {
        const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
        }
      }
      
      // If rgb, convert to rgba
      if (color.startsWith('rgb')) {
        const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)/);
        if (rgbMatch) {
          return `rgba(${rgbMatch[1]}, ${rgbMatch[2]}, ${rgbMatch[3]}, ${opacity})`;
        }
      }
      
      // If hex color, convert to rgba
      if (color.startsWith('#')) {
        const hex = color.replace('#', '');
        let r, g, b;
        
        if (hex.length === 3) {
          r = parseInt(hex[0] + hex[0], 16);
          g = parseInt(hex[1] + hex[1], 16);
          b = parseInt(hex[2] + hex[2], 16);
        } else if (hex.length === 6) {
          r = parseInt(hex.substring(0, 2), 16);
          g = parseInt(hex.substring(2, 4), 16);
          b = parseInt(hex.substring(4, 6), 16);
        } else {
          // Fallback
          return `rgba(22, 43, 64, ${opacity})`;
        }
        
        return `rgba(${r}, ${g}, ${b}, ${opacity})`;
      }
      
      // Fallback for named colors or unsupported formats
      return `rgba(22, 43, 64, ${opacity})`;
    }
    
    return {
      // Backgrounds with 30% opacity (70% transparent)
      cardBgTransparent: getRgbaFromCssVar('--card', 0.3),
      cardBg2Transparent: getRgbaFromCssVar('--card-2', 0.3),
      // Full opacity for text
      textColor: computedStyle.getPropertyValue('--ink').trim(),
      mutedColor: computedStyle.getPropertyValue('--muted').trim(),
      accentColor: computedStyle.getPropertyValue('--accent').trim(),
      borderColor: computedStyle.getPropertyValue('--line').trim(),
      primaryColor: computedStyle.getPropertyValue('--primary-2').trim() || computedStyle.getPropertyValue('--card-2').trim()
    };
  }

  /**
   * Ensure container is attached to the DOM
   * Returns the container if attached, otherwise returns a safe fallback
   * 
   * @param {HTMLElement} container - Container to validate
   * @returns {HTMLElement} An attached container (original or fallback)
   */
  function ensureAttachedContainer(container){
    // Check if container is valid and attached
    if(container && container.isConnected){
      console.info('[CompetitionFlow] ✓ Container is attached:', container.tagName, container.className || container.id);
      return container;
    }

    // Container is detached or null, log warning and find fallback
    console.warn('[CompetitionFlow] ⚠ Container is detached or null, finding fallback. Provided:', container);

    // Try to find an attached container using priority list
    const selectors = [
      '[data-faux-tv]',
      '[data-sm-faux-tv]',
      '.tvViewport',
      '#tv',
      '.tv',
      '.faux-tv',
      '.tv-screen',
      '#panel'
    ];

    for(const selector of selectors){
      try {
        const el = document.querySelector(selector);
        if(el && el.isConnected){
          console.info('[CompetitionFlow] ✓ Using fallback attached container:', selector);
          return el;
        }
      } catch(e){
        // Selector failed, continue to next
        console.warn('[CompetitionFlow] Selector failed:', selector, e);
      }
    }

    // Ultimate fallback: document.body
    console.warn('[CompetitionFlow] ⚠ No attached container found, using document.body');
    return document.body;
  }

  /**
   * Show instructions inside TV viewport with Play button
   * When Play is pressed, launches the minigame in fullscreen overlay
   * 
   * @param {string} gameKey - The minigame key
   * @param {HTMLElement} container - Container element (typically the panel div)
   * @param {Function} onPlay - Callback when Play button is clicked
   * @returns {HTMLElement} The instructions card element
   */
  function showInstructionsInTV(gameKey, container, onPlay){
    console.info(`[CompetitionFlow] → showInstructionsInTV called: gameKey=${gameKey}`);
    
    // ═══ Guard: Check if called before ready ═══
    if (checkAndQueueIfNotReady('showInstructionsInTV', [gameKey, container, onPlay])) {
      return null; // Call queued, will be replayed later
    }
    
    // ═══ Guard: Check for re-entrant call during module evaluation ═══
    if (window.__competitionFlowEvaluating) {
      console.warn('[CompetitionFlow][Guard] CRITICAL: showInstructionsInTV called during module evaluation (circular dependency)');
      window.__competitionFlowDeferredInstructions.push({ gameKey, container, onPlay });
      
      dispatchTelemetryEvent('error', {
        type: 'circular-dependency',
        function: 'showInstructionsInTV',
        gameKey: gameKey
      });
      
      return null; // Will be flushed after evaluation
    }
    
    // Ensure container is attached to the DOM (belt-and-suspenders safeguard)
    container = ensureAttachedContainer(container);
    console.info('[CompetitionFlow] ✓ Container validated and ready for instructions');
    
    // Use a local game reference without shadowing outer g (window)
    const gameRef = window.game || window.global?.game || {};

    // Get instructions from MinigameInstructions module
    let instructions = { title: 'Competition', description: 'Play the minigame to compete!', steps: [] };
    try {
      if(gameRef.MinigameInstructions && typeof gameRef.MinigameInstructions.getInstructions === 'function'){
        instructions = gameRef.MinigameInstructions.getInstructions(gameKey) || instructions;
      }
    } catch(err){
      console.warn('[CompetitionFlow] Failed to obtain instructions, using defaults', err);
    }

    // Get theme colors
    const theme = getThemeColors();

    // Clear container
    container.innerHTML = '';

    // Create instructions card (no full-page overlay, just the card in the TV area)
    // Style: Uses unified card styling from cards-theme-fix.css
    // (0.92 background opacity in gradient, 20px backdrop blur)
    const card = document.createElement('div');
    card.className = 'competition-instructions-card';
    // Minimal inline styles - most styling comes from CSS
    card.style.cssText = `
      max-width: 640px;
      width: 100%;
      animation: slideInUp 0.4s ease;
      text-align: center;
      margin: 0 auto;
    `;

    // Title - theme-aware
    const title = document.createElement('h2');
    title.textContent = instructions.title;
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 1.1rem;
      font-weight: bold;
    `;

    // Description - theme-aware
    const description = document.createElement('p');
    description.textContent = instructions.description;
    description.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 0.9rem;
      line-height: 1.4;
    `;

    // Steps (if any) - theme-aware colors come from CSS
    let stepsContainer = null;
    if(instructions.steps && instructions.steps.length > 0){
      stepsContainer = document.createElement('ul');
      stepsContainer.style.cssText = `
        margin: 0 0 10px 0;
        padding: 0;
        list-style: none;
        text-align: left;
        font-size: 0.85rem;
      `;
      instructions.steps.forEach((step, idx) => {
        const li = document.createElement('li');
        li.textContent = `${idx + 1}. ${step}`;
        li.style.cssText = `
          margin: 4px 0;
          padding-left: 8px;
        `;
        stepsContainer.appendChild(li);
      });
    }

    // Buttons container - more compact
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: 10px;
      justify-content: center;
      margin-top: 12px;
    `;

    // Play button - more compact, theme-aware
    const playButton = document.createElement('button');
    playButton.className = 'btn primary';
    playButton.textContent = '▶ Play';
    playButton.style.cssText = `
      padding: 8px 24px;
      font-size: 1rem;
      font-weight: bold;
      background: ${theme.accentColor};
      border: 1px solid ${theme.accentColor};
      border-radius: 8px;
      color: ${theme.textColor};
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    `;
    playButton.addEventListener('mouseenter', () => {
      playButton.style.opacity = '0.8';
      playButton.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.5)';
    });
    playButton.addEventListener('mouseleave', () => {
      playButton.style.opacity = '1';
      playButton.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
    });
    playButton.addEventListener('click', () => {
      console.info('[CompetitionFlow] ▶ Play button clicked, launching fullscreen minigame');
      if(typeof onPlay === 'function'){
        onPlay();
      }
    });

    // Assemble card
    card.appendChild(title);
    card.appendChild(description);
    if(stepsContainer){
      card.appendChild(stepsContainer);
    }
    buttonsContainer.appendChild(playButton);
    card.appendChild(buttonsContainer);
    container.appendChild(card);
    
    console.info('[CompetitionFlow] ✓ Instructions card rendered and appended to container');
    console.info(`[CompetitionFlow] Container details: tagName=${container.tagName}, className=${container.className}, id=${container.id}, isConnected=${container.isConnected}`);

    // Register as active instructions card for cleanup on phase change
    activeInstructionsCard = card;

    // Set instruction rendered flag for competition phase using gameRef
    if (gameRef) {
      if (gameRef.phase === 'hoh') {
        gameRef.__instructionsRenderedHOH = true;
        console.info('[CompetitionFlow] ✓ Set __instructionsRenderedHOH flag');
      } else if (gameRef.phase === 'veto_comp' || gameRef.phase === 'veto') {
        gameRef.__instructionsRenderedVeto = true;
        console.info('[CompetitionFlow] ✓ Set __instructionsRenderedVeto flag');
      }
    }

    // ═══ Post-Render Verification ═══
    // Verify card stays attached after next microtask + animation frame
    // Use a stable parent mount node to prevent detach/re-render loops
    let verificationAttempted = false;
    let recoveryAttempted = false;
    
    // Emit initial mount telemetry
    dispatchTelemetryEvent('instructions-initial-mount', {
      phase: gameRef?.phase,
      gameKey: gameKey,
      containerTag: container.tagName,
      containerConnected: container.isConnected
    });
    
    queueMicrotask(() => {
      requestAnimationFrame(() => {
        if (verificationAttempted) return;
        verificationAttempted = true;
        
        // Check if card is still attached
        if (!card.isConnected) {
          // Use consolidated logging to prevent spam
          const diagnostic = {
            containerTag: container.tagName,
            containerClass: container.className,
            containerId: container.id,
            containerConnected: container.isConnected,
            phase: gameRef?.phase,
            gameKey: gameKey
          };
          
          // Only log if not throttled
          logDetachEvent(diagnostic);
          
          // Re-attempt render once (guarded)
          if (!recoveryAttempted) {
            recoveryAttempted = true;
            
            try {
              // Find a stable parent element (fallback chain)
              let stableParent = container.isConnected ? container : null;
              if (!stableParent) {
                stableParent = ensureAttachedContainer(null);
              }
              
              if (stableParent && stableParent.isConnected) {
                const newCard = document.createElement('div');
                newCard.className = card.className;
                newCard.innerHTML = card.innerHTML;
                newCard.style.cssText = card.style.cssText;
                
                // Re-attach event listeners
                const newPlayButton = newCard.querySelector('button.primary');
                if (newPlayButton && typeof onPlay === 'function') {
                  newPlayButton.addEventListener('click', () => {
                    console.info('[CompetitionFlow] ▶ Play button clicked (re-rendered), launching fullscreen minigame');
                    onPlay();
                  });
                }
                
                stableParent.appendChild(newCard);
                activeInstructionsCard = newCard;
                
                console.info('[CompetitionFlow][Guard] ✓ Instructions card recovered to stable parent');
                dispatchTelemetryEvent('instructions-recover-success', {
                  newParentTag: stableParent.tagName,
                  gameKey: gameKey
                });
              } else {
                console.error('[CompetitionFlow][Guard] No stable parent available for recovery');
                dispatchTelemetryEvent('instructions-recover-failed', {
                  reason: 'no_stable_parent',
                  gameKey: gameKey
                });
              }
            } catch (reRenderErr) {
              console.error('[CompetitionFlow][Guard] Failed to re-render instructions card:', reRenderErr);
              dispatchTelemetryEvent('instructions-recover-failed', {
                reason: 'exception',
                error: reRenderErr.message,
                gameKey: gameKey
              });
            }
          }
        } else {
          console.info('[CompetitionFlow][Guard] ✓ Instructions card verified attached');
        }
      });
    });

    // Dispatch event to signal instructions are mounted
    try {
      dispatchTelemetryEvent('instructions-rendered', {
        phase: gameRef?.phase,
        gameKey: gameKey,
        containerTag: container.tagName
      });
      
      // Legacy event for backwards compatibility
      document.dispatchEvent(new CustomEvent('competition-instructions-mounted', {
        detail: { phase: gameRef?.phase, gameKey: gameKey }
      }));
      console.info('[CompetitionFlow] ✓ Dispatched competition-instructions-mounted event');
    } catch (e) {
      console.warn('[CompetitionFlow] Failed to dispatch event:', e);
    }

    // Attach Rules button next to Play button
    if(typeof gameRef.attachRulesButton === 'function'){
      gameRef.attachRulesButton(playButton, gameKey);
    }

    return card;
  }

  /**
   * Show completion animation with confetti and message
   * Enhanced: Use glassmorphism panel style matching Final Jury Vote panels
   * 
   * Implementation: Competition completion cards now use the same glassmorphism aesthetic
   * and slide-in animation as the Final Jury Vote tally/winner panels. The panel is positioned
   * at top-right on desktop (right: 12px, top: 12px) and centered top on mobile (≤768px).
   * 
   * Styling includes:
   * - Glassmorphism: rgba(0, 224, 204, 0.12) with cyan tint, backdrop-filter blur
   * - Compact width: ≈280px desktop; responsive clamp for mobile
   * - Slide-in animation matching jury panels (ccPanelSlideIn)
   * - No modal blocking; renders within fullscreen overlay
   * 
   * @param {HTMLElement} overlay - The overlay element
   * @param {number} score - The achieved score
   * @param {number} previousBest - Previous best score (optional)
   */
  function showCompletionAnimation(overlay, score, previousBest){
    const isNewRecord = previousBest !== undefined && score > previousBest;
    
    // Create animation container - positioned top-right (desktop) / top-center (mobile)
    // Uses .ccPanel class for glassmorphism styling matching Final Jury Vote panels
    const animContainer = document.createElement('div');
    animContainer.className = 'ccPanel'; // Competition completion panel class
    animContainer.style.cssText = `
      position: absolute;
      right: 12px;
      top: 12px;
      z-index: 10002;
      pointer-events: none;
      /* Glassmorphism matching jury panels */
      background: rgba(0, 224, 204, 0.12);
      backdrop-filter: blur(6px) saturate(1.2);
      -webkit-backdrop-filter: blur(6px) saturate(1.2);
      border: 1px solid rgba(0, 224, 204, 0.35);
      border-radius: 10px;
      padding: 8px 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15), 0 0 12px rgba(0, 224, 204, 0.2);
      /* Compact width matching jury panels */
      max-width: min(280px, 35vw);
      word-wrap: break-word;
      /* Slide-in animation matching jury panels */
      animation: ccPanelSlideIn 0.4s cubic-bezier(0.25, 0.9, 0.25, 1);
      /* Mobile responsive */
      @media (max-width: 768px) {
        right: auto;
        left: 50%;
        transform: translateX(-50%);
        max-width: min(45vw, 280px);
      }
    `;
    
    // Create message with glassmorphism styling
    const message = document.createElement('div');
    message.style.cssText = `
      text-align: center;
      color: #ffffff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.7), 0 0 8px rgba(0,0,0,0.5);
    `;
    
    const title = document.createElement('div');
    title.textContent = isNewRecord ? '🎉 New Record!' : '✅ Challenge Complete!';
    title.style.cssText = `
      font-size: clamp(13px, 2vw, 18px);
      font-weight: 800;
      color: #ffffff;
      margin-bottom: 4px;
    `;
    
    const scoreText = document.createElement('div');
    scoreText.textContent = `Score: ${score}`;
    scoreText.style.cssText = `
      font-size: clamp(12px, 1.8vw, 16px);
      color: rgba(255, 255, 255, 0.9);
      font-weight: 600;
    `;
    
    message.appendChild(title);
    message.appendChild(scoreText);
    animContainer.appendChild(message);
    
    // Add confetti if new record
    if(isNewRecord){
      createConfetti(animContainer);
    }
    
    overlay.appendChild(animContainer);
    
    // Fade out after delay
    setTimeout(() => {
      animContainer.style.opacity = '0';
      animContainer.style.transition = 'opacity 0.5s ease';
    }, 1800);
  }
  
  /**
   * Create confetti animation
   * @param {HTMLElement} container - Container for confetti
   */
  function createConfetti(container){
    const colors = ['#ff6b9d', '#fbbf24', '#60a5fa', '#34d399', '#a78bfa', '#fb923c'];
    const confettiCount = 40;
    
    for(let i = 0; i < confettiCount; i++){
      const confetti = document.createElement('div');
      const color = colors[Math.floor(Math.random() * colors.length)];
      const left = Math.random() * 100;
      const delay = Math.random() * 0.5;
      const duration = 1 + Math.random() * 1;
      
      confetti.style.cssText = `
        position: absolute;
        left: ${left}%;
        top: -10%;
        width: 10px;
        height: 10px;
        background: ${color};
        opacity: 0.8;
        animation: confettiFall ${duration}s linear ${delay}s forwards;
        transform-origin: center;
      `;
      
      container.appendChild(confetti);
    }
  }

  /**
   * Launch minigame in fullscreen overlay
   * Shows close button and handles completion
   * 
   * @param {string} gameKey - The minigame key
   * @param {Function} onComplete - Callback when game completes with score
   * @param {Object} options - Additional options for the game
   * @returns {Object} Overlay controls { close, overlay }
   */
  function launchFullscreenMinigame(gameKey, onComplete, options = {}){
    console.info(`[CompetitionFlow] ═══ launchFullscreenMinigame ═══`);
    console.info(`[CompetitionFlow] Game: ${gameKey}, Options:`, options);
    
    // ═══ Guard: Check if called before ready ═══
    if (checkAndQueueIfNotReady('launchFullscreenMinigame', [gameKey, onComplete, options])) {
      return { close: () => {}, overlay: null }; // Return no-op controls
    }
    
    // ═══ Concurrency Control: Prevent simultaneous overlays ═══
    if (activeMinigameOverlay && activeMinigameOverlay.parentNode) {
      // Check if trying to launch a different game
      const currentGameKey = activeMinigameOverlay.getAttribute('data-game-key');
      if (currentGameKey && currentGameKey !== gameKey) {
        console.error(`[CompetitionFlow][Guard] Cannot launch ${gameKey}: ${currentGameKey} overlay already active`);
        
        dispatchTelemetryEvent('error', {
          type: 'concurrent-overlay',
          attemptedGame: gameKey,
          activeGame: currentGameKey,
          message: 'Cannot launch multiple fullscreen overlays simultaneously'
        });
        
        return { close: () => {}, overlay: null }; // Return no-op controls
      }
    }
    
    const game = g.game;
    
    // Get configured duration from settings
    const configDuration = (game && game.cfg && game.cfg.minigameDuration) || 180;
    
    // Check for unlimited mode
    const isUnlimited = options.unlimited === true || options.timeLimit === null;
    
    // Pause phase timer when starting minigame
    let phaseTimerWasPaused = false;
    if(game && !game.timerPaused && g.pausePhaseTimer){
      console.info('[CompetitionFlow] Pausing phase timer for minigame challenge');
      g.pausePhaseTimer();
      phaseTimerWasPaused = true;
    }
    
    // Determine time limit
    let timeLimit = options.timeLimit ?? configDuration;
    let usePhaseTimer = false;
    
    if(isUnlimited){
      console.info('[CompetitionFlow] Using unlimited debug timer (∞)');
      timeLimit = null;
      usePhaseTimer = false;
    } else {
      // Check if we should sync with phase timer instead
      // (Only if phase timer exists and is longer than config duration and not disabled)
      if(game && game.phaseEndsAt && !game.timerPaused && !options.disablePhaseTimerSync){
        const remainingMs = game.phaseEndsAt - Date.now();
        if(remainingMs > 0){
          const phaseTimeRemaining = Math.ceil(remainingMs / 1000);
          // Use phase time if it's available and wasn't paused by us
          if(!phaseTimerWasPaused){
            timeLimit = phaseTimeRemaining;
            usePhaseTimer = true;
            console.info('[CompetitionFlow] Syncing minigame timer with phase timer:', timeLimit, 'seconds');
          }
        }
      }
      
      if(!usePhaseTimer){
        console.info('[CompetitionFlow] Using configured minigame duration:', timeLimit, 'seconds');
      }
    }
    
    // Get theme colors
    const theme = getThemeColors();
    
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'competition-minigame-overlay';
    overlay.setAttribute('data-game-key', gameKey); // Track which game is active
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      animation: fadeIn 0.3s ease;
    `;

    // Timer/Progress tracker - theme-aware with transparency
    const timerContainer = document.createElement('div');
    timerContainer.style.cssText = `
      position: absolute;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      left: calc(env(safe-area-inset-left, 0px) + 14px);
      z-index: 10001;
      background: ${theme.cardBgTransparent};
      border: 1px solid ${theme.borderColor};
      border-radius: 8px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 120px;
    `;

    const timerIcon = document.createElement('span');
    timerIcon.textContent = '⏱️';
    timerIcon.style.cssText = 'font-size: 1.1rem;';

    const timerText = document.createElement('span');
    timerText.style.cssText = `
      color: ${theme.accentColor};
      font-weight: bold;
      font-size: 0.95rem;
      font-family: monospace;
    `;
    
    // Set accessibility label for unlimited mode
    if(isUnlimited){
      timerText.setAttribute('aria-label', 'Unlimited debug session');
      timerText.textContent = 'Time: ∞';
    }

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 0 0 8px 8px;
      overflow: hidden;
    `;

    const progressFill = document.createElement('div');
    progressFill.style.cssText = `
      height: 100%;
      background: ${theme.accentColor};
      transition: all 0.1s linear;
      width: 100%;
    `;

    progressBar.appendChild(progressFill);
    timerContainer.appendChild(timerIcon);
    timerContainer.appendChild(timerText);
    timerContainer.appendChild(progressBar);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.setAttribute('aria-label', 'Close minigame');
    closeBtn.title = 'Close';
    closeBtn.style.cssText = `
      position: absolute;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      right: calc(env(safe-area-inset-right, 0px) + 14px);
      z-index: 10001;
      background: rgba(220, 38, 38, 0.8);
      border: 1px solid rgba(220, 38, 38, 1);
      color: white;
      border-radius: 8px;
      padding: 8px 14px;
      font-weight: bold;
      font-size: 1.2rem;
      cursor: pointer;
      opacity: 1;
      pointer-events: auto;
      transition: all 0.2s;
    `;
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.background = 'rgba(220, 38, 38, 1)';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.background = 'rgba(220, 38, 38, 0.8)';
    });

    // Game container
    const gameContainer = document.createElement('div');
    gameContainer.style.cssText = `
      flex: 1;
      overflow: auto;
      padding: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    overlay.appendChild(timerContainer);
    overlay.appendChild(closeBtn);
    overlay.appendChild(gameContainer);
    document.body.appendChild(overlay);
    
    console.info('[CompetitionFlow] ✓ Fullscreen overlay created and appended to document.body');

    // Track if game has completed
    let hasCompleted = false;
    let timerInterval = null;
    const startTime = Date.now();

    // Start timer countdown - sync with phase timer if enabled
    function updateTimer(){
      // Skip timer updates in unlimited mode
      if(isUnlimited){
        return;
      }
      
      // Skip timer updates if game is paused
      const pc = g.game && g.game.pauseController;
      if (pc && typeof pc.isPaused === 'function' && pc.isPaused()) {
        return; // Timer frozen while paused
      }
      
      // If using phase timer, recalculate remaining time from game.phaseEndsAt
      let remaining;
      if(usePhaseTimer && game && game.phaseEndsAt){
        const remainingMs = game.phaseEndsAt - Date.now();
        remaining = Math.max(0, Math.ceil(remainingMs / 1000));
      } else {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remaining = Math.max(0, timeLimit - elapsed);
      }
      
      const minutes = Math.floor(remaining / 60);
      const seconds = remaining % 60;
      
      timerText.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
      
      // Update progress bar
      const percentage = (remaining / timeLimit) * 100;
      progressFill.style.width = `${percentage}%`;
      
      // Change color when time is running low
      if(remaining <= 10){
        progressFill.style.background = 'linear-gradient(90deg, #dc2626, #991b1b)';
        timerText.style.color = '#ff6b9d';
      } else if(remaining <= 30){
        progressFill.style.background = 'linear-gradient(90deg, #f59e0b, #d97706)';
        timerText.style.color = '#fbbf24';
      }
      
      // Time's up - force completion
      if(remaining <= 0 && !hasCompleted){
        clearInterval(timerInterval);
        timerText.textContent = '0:00';
        timerText.style.color = '#ff6b9d';
        
        // Disable minigame interaction
        if(gameContainer){
          gameContainer.style.pointerEvents = 'none';
          gameContainer.style.opacity = '0.6';
        }
        
        // Force completion after brief delay
        setTimeout(() => {
          if(!hasCompleted){
            console.warn('[CompetitionFlow] Challenge timer expired, auto-submitting');
            hasCompleted = true;
            
            // Show timeout message (no confetti)
            const timeoutMsg = document.createElement('div');
            timeoutMsg.style.cssText = `
              position: absolute;
              inset: 0;
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 10002;
              pointer-events: none;
              animation: fadeIn 0.3s ease;
            `;
            
            const msgBox = document.createElement('div');
            msgBox.style.cssText = `
              background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95));
              border: 2px solid #dc2626;
              border-radius: 16px;
              padding: 24px 32px;
              box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
              text-align: center;
            `;
            
            msgBox.innerHTML = `
              <div style="font-size: 1.8rem; font-weight: bold; color: white; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
                ⏱️ Time's Up!
              </div>
              <div style="font-size: 1.1rem; color: rgba(255, 255, 255, 0.9);">
                Submitting your score...
              </div>
            `;
            
            timeoutMsg.appendChild(msgBox);
            overlay.appendChild(timeoutMsg);
            
            // Close and submit after brief display
            setTimeout(() => {
              close(false);
              // Call onComplete with current score or 0
              // The minigame should have tracked the score internally
              if(typeof onComplete === 'function'){
                onComplete(0); // Auto-submit with 0 score on timeout
              }
            }, 1500);
          }
        }, 1000);
      }
    }

    // Only start timer interval if not unlimited
    if(!isUnlimited){
      updateTimer();
      timerInterval = setInterval(updateTimer, 1000);
    }

    // Close function
    function close(skipAnimation){
      if(timerInterval){
        clearInterval(timerInterval);
      }
      
      // Resume phase timer if we paused it
      if(phaseTimerWasPaused && g.resumePhaseTimer){
        console.info('[CompetitionFlow] Resuming phase timer after minigame');
        g.resumePhaseTimer();
      }
      
      // Dispatch telemetry event for fullscreen close
      dispatchTelemetryEvent('fullscreen-closed', {
        gameKey: gameKey,
        skipAnimation: skipAnimation,
        hasCompleted: hasCompleted
      });
      
      if(overlay.parentNode){
        if(skipAnimation){
          overlay.remove();
        } else {
          overlay.style.animation = 'fadeOut 0.3s ease';
          setTimeout(() => {
            if(overlay.parentNode){
              overlay.remove();
            }
          }, 300);
        }
      }
      // Clear active references
      if(activeMinigameOverlay === overlay){
        activeMinigameOverlay = null;
        activeMinigameCleanup = null;
      }
    }

    // Register overlay and cleanup function
    activeMinigameOverlay = overlay;
    activeMinigameCleanup = close;

    // Close button handler - warn if game not completed
    closeBtn.addEventListener('click', () => {
      if(!hasCompleted){
        const confirm = window.confirm('Are you sure you want to exit? Your score will not be submitted.');
        if(!confirm) return;
        hasCompleted = true; // Prevent double completion
        
        // Immediately trigger phase transition when user exits prematurely
        // This prevents the game from waiting for the timer to expire
        console.info('[CompetitionFlow] User exited prematurely - triggering immediate phase transition');
        close(true); // Skip animation when manually closed
        
        // Call the fast-forward logic to immediately show results and move to next phase
        if(global.CompetitionFlow?.showCompetitionResultsAndFastForward && typeof global.CompetitionFlow.showCompetitionResultsAndFastForward === 'function'){
          // Use score of 0 for premature exit (no score submission)
          setTimeout(() => {
            console.info('[CompetitionFlow] Triggering fast-forward after premature exit');
            global.CompetitionFlow.showCompetitionResultsAndFastForward(0);
          }, 100); // Small delay to allow close() to complete
        } else {
          // Fallback: directly resolve the phase if fast-forward not available
          console.warn('[CompetitionFlow] Fast-forward not available, using fallback phase resolution');
          setTimeout(() => {
            const phase = g.phase;
            if(phase === 'hoh' && typeof global.finishCompPhase === 'function' && !g.__hohResolved){
              console.info('[CompetitionFlow] Calling finishCompPhase() after premature exit');
              global.finishCompPhase();
            } else if(typeof global.defaultAdvance === 'function'){
              console.info('[CompetitionFlow] Calling defaultAdvance() after premature exit');
              global.defaultAdvance(phase);
            }
          }, 100);
        }
        return;
      }
      close(true); // Skip animation when manually closed (already completed case)
    });

    // Dispatch telemetry event for fullscreen launch
    dispatchTelemetryEvent('fullscreen-launched', {
      gameKey: gameKey,
      timeLimit: timeLimit,
      usePhaseTimer: usePhaseTimer,
      isUnlimited: isUnlimited
    });

    // Render the minigame
    console.info('[CompetitionFlow] → Rendering minigame in fullscreen container');
    if(g.renderMinigame && typeof g.renderMinigame === 'function'){ 
      // Pass options with competitionMode flag
      const gameOptions = {
        ...options,
        competitionMode: true
      };

      console.info('[CompetitionFlow] → Calling renderMinigame:', gameKey, 'with options:', gameOptions);
      
      // ═══ Defensive Error Handling ═══
      try {
        g.renderMinigame(gameKey, gameContainer, (score) => {
          console.info(`[CompetitionFlow] ← Minigame completed with score: ${score}`);
          
          if(hasCompleted) {
            console.warn('[CompetitionFlow] ⚠ Duplicate completion detected, ignoring');
            return; // Prevent double completion
          }
          hasCompleted = true;
          
          // Show completion animation
          showCompletionAnimation(overlay, score, options.previousBest);
          
          // Close overlay and call completion callback after animation
          setTimeout(() => {
            console.info('[CompetitionFlow] → Closing fullscreen overlay and calling onComplete');
            close(false); // Use fade out animation
            if(typeof onComplete === 'function'){
              onComplete(score);
            }
          }, 2500); // Wait for animation to complete
        }, gameOptions);
        console.info('[CompetitionFlow] ✓ renderMinigame called successfully');
      } catch (renderErr) {
        console.error('[CompetitionFlow][Guard] ✗ renderMinigame threw error:', renderErr);
        
        // Display inline error card
        gameContainer.innerHTML = '';
        const errorCard = document.createElement('div');
        errorCard.style.cssText = `
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.95), rgba(185, 28, 28, 0.95));
          border: 2px solid #dc2626;
          border-radius: 16px;
          padding: 24px 32px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.6);
          text-align: center;
          max-width: 500px;
          margin: 20px auto;
        `;
        errorCard.innerHTML = `
          <div style="font-size: 1.8rem; font-weight: bold; color: white; margin-bottom: 8px; text-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);">
            ⚠️ Error Loading Minigame
          </div>
          <div style="font-size: 1rem; color: rgba(255, 255, 255, 0.9); margin-bottom: 16px;">
            ${gameKey} failed to load
          </div>
          <div style="font-size: 0.85rem; color: rgba(255, 255, 255, 0.7); font-family: monospace;">
            ${renderErr.message || 'Unknown error'}
          </div>
        `;
        gameContainer.appendChild(errorCard);
        
        dispatchTelemetryEvent('error', {
          type: 'render-error',
          gameKey: gameKey,
          error: renderErr.message || String(renderErr)
        });
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          close(false);
        }, 3000);
      }
    } else {
      console.error('[CompetitionFlow] ✗ renderMinigame function not available!');
      gameContainer.innerHTML = '<div style="color:#ff6b9d;text-align:center;padding:40px;">Error: Minigame system not loaded</div>';
      
      dispatchTelemetryEvent('error', {
        type: 'missing-renderer',
        gameKey: gameKey,
        message: 'renderMinigame function not available'
      });
    }

    return { close, overlay };
  }

  /**
   * Run complete competition flow: instructions in TV → fullscreen game → completion
   * This is the main entry point for competition minigames
   * 
   * @param {string} gameKey - The minigame key
   * @param {HTMLElement} container - Container element (typically the panel div below TV)
   * @param {Function} onComplete - Callback when game completes with score
   * @param {Object} options - Additional options
   * @returns {void}
   */
  function runCompetitionFlow(gameKey, container, onComplete, options = {}){
    console.info(`[CompetitionFlow] ═══ runCompetitionFlow called ═══`);
    console.info(`[CompetitionFlow] Game: ${gameKey}, Options:`, options);
    
    // ═══ Guard: Check if game is paused ═══
    const pc = g.game && g.game.pauseController;
    if (pc && typeof pc.isPaused === 'function' && pc.isPaused()) {
      console.info('[CompetitionFlow] Game is paused - competition flow will proceed but timer will be frozen');
      // Note: We don't block the flow, but the timer will respect pause state
    }
    
    // ═══ Guard: Check if called before ready ═══
    if (checkAndQueueIfNotReady('runCompetitionFlow', [gameKey, container, onComplete, options])) {
      return; // Call queued, will be replayed later
    }
    
    // Ensure container is attached to the DOM (belt-and-suspenders safeguard)
    container = ensureAttachedContainer(container);
    console.info('[CompetitionFlow] ✓ Container validated for competition flow');
    
    // Step 1: Show instructions in TV area
    console.info('[CompetitionFlow] Step 1: Showing instructions in TV');
    const instructionsCard = showInstructionsInTV(
      gameKey,
      container,
      // On Play button click
      () => {
        console.info('[CompetitionFlow] Step 2: Play button clicked, transitioning to fullscreen');
        
        // Remove instructions card when Play is pressed
        if(instructionsCard && instructionsCard.parentNode){
          instructionsCard.remove();
          console.info('[CompetitionFlow] ✓ Instructions card removed');
        }
        
        // Clear active instructions reference
        if(activeInstructionsCard === instructionsCard){
          activeInstructionsCard = null;
        }
        
        // Step 2: Launch fullscreen minigame
        console.info('[CompetitionFlow] → Launching fullscreen minigame');
        launchFullscreenMinigame(gameKey, onComplete, options);
      }
    );
  }

  // Add animation styles to document
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    @keyframes fadeOut {
      from { opacity: 1; }
      to { opacity: 0; }
    }
    @keyframes popIn {
      0% {
        opacity: 0;
        transform: scale(0.5);
      }
      50% {
        transform: scale(1.05);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }
    @keyframes confettiFall {
      0% {
        transform: translateY(0) rotate(0deg);
        opacity: 0.8;
      }
      100% {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
    /* Competition completion panel slide-in animation (matching jury panels) */
    @keyframes ccPanelSlideIn {
      0% { 
        opacity: 0; 
        transform: translateX(20px); 
      }
      100% { 
        opacity: 1; 
        transform: translateX(0); 
      }
    }
    /* Mobile version of slide-in for centered panel */
    @media (max-width: 768px) {
      @keyframes ccPanelSlideIn {
        0% { 
          opacity: 0; 
          transform: translateX(-50%) translateY(-10px); 
        }
        100% { 
          opacity: 1; 
          transform: translateX(-50%) translateY(0); 
        }
      }
    }
  `;
  document.head.appendChild(style);

  // ═══ Self-Test Harness ═══
  /**
   * Run automated self-test to verify module functionality
   * Called once on module readiness
   */
  function runSelfTest() {
    console.info('[CompetitionFlow][SelfTest] Running automated self-test...');
    
    try {
      // Create temporary container
      const tempContainer = document.createElement('div');
      tempContainer.style.cssText = 'position:absolute;left:-9999px;top:-9999px;';
      document.body.appendChild(tempContainer);
      
      // Call showInstructionsInTV with no-op callback for self-test
      const card = showInstructionsInTV('selftest', tempContainer, () => {
        // No-op for self-test
      });
      
      // Verify basic structure
      const hasCard = !!card;
      const hasTitle = card && card.querySelector('h2');
      const hasButton = card && card.querySelector('button');
      const cardAttached = card && card.isConnected;
      
      // Cleanup
      if (tempContainer.parentNode) {
        tempContainer.remove();
      }
      
      // Determine result
      const passed = hasCard && hasTitle && hasButton && cardAttached;
      
      const result = {
        passed: passed,
        checks: {
          cardCreated: hasCard,
          hasTitleElement: !!hasTitle,
          hasButtonElement: !!hasButton,
          cardAttached: cardAttached
        },
        timestamp: Date.now()
      };
      
      console.info('[CompetitionFlow][SelfTest] Result:', passed ? '✓ PASSED' : '✗ FAILED', result);
      
      // Set failure flag if needed
      if (!passed) {
        window.__competitionFlowSelfTestFailed = true;
      }
      
      // Dispatch self-test event
      dispatchTelemetryEvent('selftest', result);
      
    } catch (err) {
      console.error('[CompetitionFlow][SelfTest] ✗ Self-test threw error:', err);
      
      window.__competitionFlowSelfTestFailed = true;
      
      dispatchTelemetryEvent('selftest', {
        passed: false,
        error: err.message || String(err),
        timestamp: Date.now()
      });
    }
  }

  // ═══ Module Initialization Complete ═══
  // Mark module as no longer evaluating
  window.__competitionFlowModuleEvaluating = false;
  
  // Mark module as ready
  window.__competitionFlowModuleReady = true;
  
  console.info('[CompetitionFlow][Guard] Module initialization complete');
  
  // Dispatch init event
  dispatchTelemetryEvent('init', {
    ready: true,
    timestamp: Date.now()
  });
  
  // Flush any deferred calls
  if (window.__competitionFlowDeferredCalls.length > 0 || 
      window.__competitionFlowDeferredInstructions.length > 0) {
    console.info('[CompetitionFlow][Guard] Flushing deferred calls from initialization');
    flushDeferredCalls();
  }
  
  // Run self-test on next tick (after any immediate deferred calls)
  setTimeout(() => {
    if (!window.__competitionFlowSelfTestRan) {
      window.__competitionFlowSelfTestRan = true;
      runSelfTest();
    }
  }, 0);
  
  // Listen for game ready event to flush any additional deferred calls
  // Check for common game ready event patterns:
  // - 'bb:game:ready': Custom game initialization event (if implemented in future)
  // - 'game:ready': Alternative custom game ready event pattern
  // - 'DOMContentLoaded': Browser DOM ready event (fallback for late module loading)
  const gameReadyEvents = ['bb:game:ready', 'game:ready', 'DOMContentLoaded'];
  
  gameReadyEvents.forEach(eventName => {
    document.addEventListener(eventName, () => {
      console.info(`[CompetitionFlow][Guard] Received ${eventName} event`);
      if (window.__competitionFlowDeferredCalls.length > 0 || 
          window.__competitionFlowDeferredInstructions.length > 0) {
        flushDeferredCalls();
      }
    }, { once: true });
  });

  // Expose to global
  g.CompetitionFlow = {
    showInstructionsInTV: showInstructionsInTV,
    launchFullscreenMinigame: launchFullscreenMinigame,
    runCompetitionFlow: runCompetitionFlow,
    cleanupOnPhaseChange: cleanupOnPhaseChange,
    ensureAttachedContainer: ensureAttachedContainer,
    resolveAttachedTvContainer: ensureAttachedContainer, // Alias for consistency
    // Expose guard utilities for debugging
    getGameRef: getGameRef,
    flushDeferredCalls: flushDeferredCalls
  };

})(window);

/* ========================================================================
 * Immediate Competition Results Popup + Fast-Forward Integration
 * ========================================================================
 */
(function installImmediateResultsFastForward(global){
  const g = global.game || (global.game = {});
  if(!global.CompetitionFlow) global.CompetitionFlow = {};

  // Constants
  const RESULTS_POPUP_DURATION = 3500; // ms - must match showResultsPopup duration parameter
  const PHASE_TRANSITION_DELAY = 2000; // ms - delay before resetting guard flag to allow phase transition to complete

  // Feature flag default ON
  if(!g.cfg) g.cfg = {};
  if(typeof g.cfg.autoFastAdvanceCompetitions === 'undefined'){
    g.cfg.autoFastAdvanceCompetitions = true;
  }

  function buildTopThree(){
    const scores = g.lastCompScores;
    if(!(scores instanceof Map) || scores.size === 0){ return []; }
    const sorted = [...scores.entries()]
      .filter(([pid]) => { const p = global.getP ? global.getP(pid) : null; return p && !p.evicted; })
      .sort((a,b) => b[1] - a[1]);
    return sorted.slice(0,3).map(([pid, score]) => {
      const p = global.getP ? global.getP(pid) : null;
      return {
        id: pid,
        score,
        name: global.safeName ? global.safeName(pid) : (p?.name || `Player ${pid}`),
        avatar: (typeof global.getAvatarUrl === 'function') ? global.getAvatarUrl(pid) : null
      };
    });
  }

  function shortenPhaseToOneSecond(){
    // This function shortens the phase timer to 1 second when results are shown
    // It tries multiple timer APIs in order of preference to ensure compatibility
    // After shortening, the phase will advance to the next state (e.g., veto ceremony)
    // The 1-second delay allows the UI to update before transitioning
    try{
      const ONE_SECOND = 1000;
      const now = Date.now();
      const remaining = g.endAt ? (g.endAt - now) : null;
      if(typeof global.schedulePhaseAdvanceIn === 'function'){
        global.schedulePhaseAdvanceIn(ONE_SECOND);
        console.info('[ImmediateResults] Used schedulePhaseAdvanceIn(1000)');
        return true;
      }
      if(typeof global.GameTimer?.shortenCurrentByMs === 'function' && remaining !== null){
        const delta = Math.max(0, remaining - ONE_SECOND);
        global.GameTimer.shortenCurrentByMs(delta);
        console.info('[ImmediateResults] Used GameTimer.shortenCurrentByMs to reach ~1s');
        return true;
      }
      if(typeof global.setPhaseDurationMs === 'function'){
        global.setPhaseDurationMs(ONE_SECOND);
        console.info('[ImmediateResults] Used setPhaseDurationMs(1000)');
        return true;
      }
      if(typeof global.advancePhase === 'function'){
        setTimeout(() => { console.info('[ImmediateResults] Manual advancePhase() after fallback 1s'); global.advancePhase(); }, ONE_SECOND);
        return true;
      } else if(typeof global.defaultAdvance === 'function'){
        setTimeout(() => { console.info('[ImmediateResults] Manual defaultAdvance() after fallback 1s'); global.defaultAdvance(g.phase); }, ONE_SECOND);
        return true;
      }
      console.warn('[ImmediateResults] No phase shortening API available');
      return false;
    }catch(err){
      console.warn('[ImmediateResults] shortenPhaseToOneSecond failed:', err);
      return false;
    }
  }

  function resolveCompetitionPhaseIfNeeded(){
    try{
      if(g.__fastAdvancingCompetition){
        console.info('[ImmediateResults] Resolution already in progress, skipping duplicate');
        return;
      }
      g.__fastAdvancingCompetition = true;
      const phase = g.phase;
      
      // Schedule flag reset after phase transition completes
      // Uses PHASE_TRANSITION_DELAY to allow finish functions to complete phase change before allowing next competition
      const resetFlag = () => {
        setTimeout(() => {
          g.__fastAdvancingCompetition = false;
          console.info('[ImmediateResults] Reset fast-advancing flag for next competition');
        }, PHASE_TRANSITION_DELAY);
      };
      
      if(phase === 'hoh' && typeof global.finishCompPhase === 'function' && !g.__hohResolved){
        console.info('[ImmediateResults] Calling finishCompPhase()');
        global.finishCompPhase();
        resetFlag();
        return;
      }
      // Note: Veto competitions currently advance via defaultAdvance/nextPhase (no dedicated finish function)
      // The phase-specific check is kept for future implementation of finishVetoCompetition if needed
      if(phase === 'final3_comp2' && typeof global.finishF3P2 === 'function' && !g.__f3p2Resolved){
        console.info('[ImmediateResults] Calling finishF3P2()');
        global.finishF3P2();
        resetFlag();
        return;
      }
      if(phase === 'final3_comp3' && typeof global.finishF3P3 === 'function' && !g.__f3p3Resolved){
        console.info('[ImmediateResults] Calling finishF3P3()');
        global.finishF3P3();
        resetFlag();
        return;
      }
      if(typeof global.defaultAdvance === 'function'){
        console.info('[ImmediateResults] Generic advance via defaultAdvance()');
        global.defaultAdvance(phase);
        resetFlag();
      } else if(typeof global.nextPhase === 'function'){
        console.info('[ImmediateResults] Generic advance via nextPhase()');
        global.nextPhase();
        resetFlag();
      } else {
        console.warn('[ImmediateResults] No resolution function found for phase:', phase);
        g.__fastAdvancingCompetition = false; // Reset immediately if no function found
      }
    }catch(e){
      console.error('[ImmediateResults] resolveCompetitionPhaseIfNeeded error:', e);
      g.__fastAdvancingCompetition = false; // Reset on error
    }
  }

  function showCompetitionResultsAndFastForward(humanScore){
    if(!g.cfg?.autoFastAdvanceCompetitions){
      console.info('[ImmediateResults] autoFastAdvanceCompetitions flag disabled – skipping');
      return;
    }
    const phase = g.phase;
    
    // Final Week: NEVER show the inline results popup for any Final 3 phase
    // Results are handled by the dedicated Final 3 modals/cards instead.
    if (typeof phase === 'string' && phase.startsWith('final3')) {
      console.info('[ImmediateResults] Skipping inline results popup for Final 3 phase:', phase);
      return;
    }
    
    // Mark that results have been shown for POV competitions to prevent redundant display
    // This flag is checked in veto.js finishVetoComp to skip duplicate reveal
    if(phase === 'pov' || phase === 'veto_comp' || phase === 'veto'){
      g.__vetoResultsShown = true;
      console.info('[ImmediateResults] Marked POV results as shown to prevent redundant display');
    }
    
    let topThree = buildTopThree();
    if(topThree.length === 0){
      const humanId = g.humanId;
      if(humanId !== null && humanId !== undefined){
        topThree = [{
          id: humanId,
          score: humanScore,
          name: global.safeName ? global.safeName(humanId) : 'You',
          avatar: typeof global.getAvatarUrl === 'function' ? global.getAvatarUrl(humanId) : null
        }];
      }
    }
    const title = (phase === 'hoh') ? 'HOH Results'
                : (phase === 'pov' || phase === 'veto_comp' || phase === 'veto') ? 'Veto Results'
                : (phase?.startsWith('final3')) ? 'Final 3 Results'
                : 'Competition Results';
    const popupAvailable = typeof global.showResultsPopup === 'function';
    shortenPhaseToOneSecond();
    if(!popupAvailable){
      console.warn('[ImmediateResults] showResultsPopup not available – advancing without popup');
      resolveCompetitionPhaseIfNeeded();
      return;
    }
    console.info('[ImmediateResults] Showing competition results popup:', title, topThree);
    try{
      const promise = global.showResultsPopup({ title, topThree, winnerEmoji: '🏆', duration: RESULTS_POPUP_DURATION });
      if(promise && typeof promise.then === 'function'){
        promise.then(() => {
          console.info('[ImmediateResults] Results popup finished – resolving phase');
          resolveCompetitionPhaseIfNeeded();
        }).catch(err => {
          console.warn('[ImmediateResults] Popup promise error, resolving anyway:', err);
          resolveCompetitionPhaseIfNeeded();
        });
      } else {
        setTimeout(() => {
          console.info('[ImmediateResults] Popup duration elapsed – resolving phase');
          resolveCompetitionPhaseIfNeeded();
        }, RESULTS_POPUP_DURATION);
      }
    }catch(err){
      console.warn('[ImmediateResults] Failed to show popup – resolving immediately:', err);
      resolveCompetitionPhaseIfNeeded();
    }
  }

  global.CompetitionFlow.showCompetitionResultsAndFastForward = showCompetitionResultsAndFastForward;
  console.info('[ImmediateResults] Fast-forward + results integration installed');
})(window);

(function augmentRunCompetitionFlow(global){
  if(!global.CompetitionFlow || typeof global.CompetitionFlow.runCompetitionFlow !== 'function'){
    console.warn('[ImmediateResults] Unable to augment runCompetitionFlow – not found');
    return;
  }
  const original = global.CompetitionFlow.runCompetitionFlow;
  global.CompetitionFlow.runCompetitionFlow = function(gameKey, container, onComplete, options = {}){
    const wrappedOnComplete = function(score){
      try { if(typeof onComplete === 'function'){ onComplete(score); } } catch(e){ console.warn('[ImmediateResults] Original onComplete error:', e); }
      if(options.autoFastAdvance !== false){
        global.CompetitionFlow.showCompetitionResultsAndFastForward(score);
      } else {
        console.info('[ImmediateResults] autoFastAdvance disabled for this flow call');
      }
    };
    return original(gameKey, container, wrappedOnComplete, options);
  };
  console.info('[ImmediateResults] runCompetitionFlow augmented for immediate results & fast-forward');
})(window);