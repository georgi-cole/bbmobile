// MODULE: competitions-flow.js
// Competition flow with instructions popup and fullscreen minigame overlay
// Handles: show instructions → play button → fullscreen game → completion → return

(function(g){
  'use strict';

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

    // Clear container
    container.innerHTML = '';

    // Create instructions card (no full-page overlay, just the card in the TV area)
    // Style matches jury vote popup: transparent, compact, subtle
    const card = document.createElement('div');
    card.className = 'competition-instructions-card';
    card.style.cssText = `
      background: rgba(22, 43, 64, 0.95);
      border: 1px solid #274765;
      border-radius: 12px;
      padding: 10px 12px;
      box-shadow: 0 8px 20px -14px rgba(0, 0, 0, 0.7);
      max-width: 640px;
      width: 100%;
      animation: slideInUp 0.4s ease;
      text-align: center;
      margin: 0 auto;
    `;

    // Title - more compact
    const title = document.createElement('h2');
    title.textContent = instructions.title;
    title.style.cssText = `
      margin: 0 0 8px 0;
      font-size: 1.1rem;
      color: #83bfff;
      font-weight: bold;
    `;

    // Description - more compact
    const description = document.createElement('p');
    description.textContent = instructions.description;
    description.style.cssText = `
      margin: 0 0 10px 0;
      font-size: 0.9rem;
      color: #c5d9ed;
      line-height: 1.4;
    `;

    // Steps (if any) - more compact
    let stepsContainer = null;
    if(instructions.steps && instructions.steps.length > 0){
      stepsContainer = document.createElement('ul');
      stepsContainer.style.cssText = `
        margin: 0 0 10px 0;
        padding: 0;
        list-style: none;
        text-align: left;
        color: #b0c8e0;
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

    // Play button - more compact
    const playButton = document.createElement('button');
    playButton.className = 'btn primary';
    playButton.textContent = '▶ Play';
    playButton.style.cssText = `
      padding: 8px 24px;
      font-size: 1rem;
      font-weight: bold;
      background: linear-gradient(135deg, #3563a7, #2a4d87);
      border: 1px solid #4a7dc4;
      border-radius: 8px;
      color: #eaf4ff;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 4px 12px rgba(53, 99, 167, 0.3);
    `;
    playButton.addEventListener('mouseenter', () => {
      playButton.style.background = 'linear-gradient(135deg, #4574b8, #3a5e98)';
      playButton.style.boxShadow = '0 6px 16px rgba(53, 99, 167, 0.5)';
    });
    playButton.addEventListener('mouseleave', () => {
      playButton.style.background = 'linear-gradient(135deg, #3563a7, #2a4d87)';
      playButton.style.boxShadow = '0 4px 12px rgba(53, 99, 167, 0.3)';
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
    // Get time limit from options, default to 60 seconds
    const timeLimit = options.timeLimit || 60;
    
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

    // Timer/Progress tracker
    const timerContainer = document.createElement('div');
    timerContainer.style.cssText = `
      position: absolute;
      top: calc(env(safe-area-inset-top, 0px) + 12px);
      left: calc(env(safe-area-inset-left, 0px) + 14px);
      z-index: 10001;
      background: rgba(22, 43, 64, 0.95);
      border: 1px solid #274765;
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
      color: #83bfff;
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
      background: linear-gradient(90deg, #4a7dc4, #3563a7);
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

    // Start timer countdown
    function updateTimer(){
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, timeLimit - elapsed);
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
      
      // Time's up
      if(remaining <= 0 && !hasCompleted){
        clearInterval(timerInterval);
        timerText.textContent = '0:00';
        timerText.style.color = '#ff6b9d';
        // Don't auto-close, let the game handle completion
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
    }

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
    runCompetitionFlow: runCompetitionFlow
  };

})(window);
