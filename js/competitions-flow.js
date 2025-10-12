// MODULE: competitions-flow.js
// Competition flow with instructions popup and fullscreen minigame overlay
// Handles: show instructions → play button → fullscreen game → completion → return

(function(g){
  'use strict';

  // Track active minigame overlays and instructions for cleanup on phase change
  let activeMinigameOverlay = null;
  let activeInstructionsCard = null;
  let activeMinigameCleanup = null;

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
    
    // Force close active minigame overlay
    if(activeMinigameCleanup && typeof activeMinigameCleanup === 'function'){
      activeMinigameCleanup();
      activeMinigameCleanup = null;
    }
    
    activeMinigameOverlay = null;
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
   * Show instructions inside TV viewport with Play button
   * When Play is pressed, launches the minigame in fullscreen overlay
   * 
   * @param {string} gameKey - The minigame key
   * @param {HTMLElement} container - Container element (typically the panel div)
   * @param {Function} onPlay - Callback when Play button is clicked
   * @returns {HTMLElement} The instructions card element
   */
  function showInstructionsInTV(gameKey, container, onPlay){
    // Get instructions from MinigameInstructions module
    let instructions = { title: 'Competition', description: 'Play the minigame to compete!', steps: [] };
    if(g.MinigameInstructions && typeof g.MinigameInstructions.getInstructions === 'function'){
      instructions = g.MinigameInstructions.getInstructions(gameKey);
    }

    // Get theme colors
    const theme = getThemeColors();

    // Clear container
    container.innerHTML = '';

    // Create instructions card (no full-page overlay, just the card in the TV area)
    // Style: ~70% transparent so TV background is visible, theme-aware colors
    const card = document.createElement('div');
    card.className = 'competition-instructions-card';
    card.style.cssText = `
      background: ${theme.cardBgTransparent};
      border: 1px solid ${theme.borderColor};
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 8px 20px -14px rgba(0, 0, 0, 0.7);
      max-width: 640px;
      width: 100%;
      animation: slideInUp 0.4s ease;
      text-align: center;
      margin: 0 auto;
    `;

    // Title - more compact, theme-aware
    const title = document.createElement('h2');
    title.textContent = instructions.title;
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 1.1rem;
      color: ${theme.accentColor};
      font-weight: bold;
    `;

    // Description - more compact, theme-aware
    const description = document.createElement('p');
    description.textContent = instructions.description;
    description.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 0.9rem;
      color: ${theme.textColor};
      line-height: 1.4;
    `;

    // Steps (if any) - more compact, theme-aware
    let stepsContainer = null;
    if(instructions.steps && instructions.steps.length > 0){
      stepsContainer = document.createElement('ul');
      stepsContainer.style.cssText = `
        margin: 0 0 10px 0;
        padding: 0;
        list-style: none;
        text-align: left;
        color: ${theme.mutedColor};
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

    // Register as active instructions card for cleanup on phase change
    activeInstructionsCard = card;

    return card;
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
    // Sync with phase timer if available, otherwise use default timeLimit
    const game = g.game;
    let timeLimit = options.timeLimit ?? 60;
    let usePhaseTimer = false;
    
    // Try to sync with phase timer
    if(game && game.phaseEndsAt){
      const remainingMs = game.phaseEndsAt - Date.now();
      if(remainingMs > 0){
        timeLimit = Math.ceil(remainingMs / 1000);
        usePhaseTimer = true;
        console.info('[CompetitionFlow] Syncing minigame timer with phase timer:', timeLimit, 'seconds');
      }
    }
    
    // Get theme colors
    const theme = getThemeColors();
    
    // Create fullscreen overlay
    const overlay = document.createElement('div');
    overlay.id = 'competition-minigame-overlay';
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

    // Track if game has completed
    let hasCompleted = false;
    let timerInterval = null;
    let startTime = Date.now();
    let isDisabled = false; // Track if interaction should be disabled

    // Start timer countdown - sync with phase timer if enabled
    function updateTimer(){
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
        isDisabled = true;
        
        // Disable minigame interaction
        if(gameContainer){
          gameContainer.style.pointerEvents = 'none';
          gameContainer.style.opacity = '0.6';
        }
        
        // Force completion after brief delay
        setTimeout(() => {
          if(!hasCompleted){
            console.warn('[CompetitionFlow] Phase time expired, forcing completion');
            hasCompleted = true;
            close();
            // Call onComplete with 0 score or don't call it at all (cancel)
            // For now, we'll close without submitting
          }
        }, 1000);
      }
    }

    updateTimer();
    timerInterval = setInterval(updateTimer, 1000);

    // Close function
    function close(){
      if(timerInterval){
        clearInterval(timerInterval);
      }
      if(overlay.parentNode){
        overlay.remove();
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
      }
      close();
    });

    // Render the minigame
    if(g.renderMinigame && typeof g.renderMinigame === 'function'){
      // Pass options with competitionMode flag
      const gameOptions = {
        ...options,
        competitionMode: true
      };

      g.renderMinigame(gameKey, gameContainer, (score) => {
        hasCompleted = true;
        // Delay closing slightly to show final state
        setTimeout(() => {
          close();
          if(typeof onComplete === 'function'){
            onComplete(score);
          }
        }, 500);
      }, gameOptions);
    } else {
      console.error('[CompetitionFlow] renderMinigame function not available');
      gameContainer.innerHTML = '<div style="color:#ff6b9d;text-align:center;padding:40px;">Error: Minigame system not loaded</div>';
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
    // Step 1: Show instructions in TV area
    const instructionsCard = showInstructionsInTV(
      gameKey,
      container,
      // On Play button click
      () => {
        // Remove instructions card when Play is pressed
        if(instructionsCard && instructionsCard.parentNode){
          instructionsCard.remove();
        }
        
        // Clear active instructions reference
        if(activeInstructionsCard === instructionsCard){
          activeInstructionsCard = null;
        }
        
        // Step 2: Launch fullscreen minigame
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
  `;
  document.head.appendChild(style);

  // Expose to global
  g.CompetitionFlow = {
    showInstructionsInTV: showInstructionsInTV,
    launchFullscreenMinigame: launchFullscreenMinigame,
    runCompetitionFlow: runCompetitionFlow,
    cleanupOnPhaseChange: cleanupOnPhaseChange
  };

})(window);
