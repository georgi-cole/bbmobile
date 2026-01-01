// MODULE: spectator-view.js
// Spectator mode component for watching AI players compete in minigames
// Used during Final 3 when user is not competing or when jury member watches finale

(function(global) {
  'use strict';

  const SpectatorView = {};

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'Player')}`;
  };

  // Progress messages for simulated updates (varied by phase) - improved to sound like sports commentary
  const PROGRESS_MESSAGES = {
    common: [
      'And we\'re off! Round {round} is underway!',
      'The scores are incredibly close!',
      'This competition is heating up fast!',
      '{name} takes the lead! The crowd goes wild!',
      'It\'s neck and neck between these competitors!',
      'What a move by {name}! Absolutely stunning!',
      'We\'re entering the final moments...',
      'Almost at the finish line!',
      '{name} is showing incredible performance!',
      'This could go either way... it\'s anyone\'s game!'
    ],
    part1: [
      'All three houseguests are giving it their all!',
      'Who will punch their ticket to Part 3?',
      'The pressure in the Big Brother house is intense!',
      'One competitor will move directly to the finale!',
      'Two will have to battle it out in Part 2!'
    ],
    part2: [
      'This head-to-head battle is absolutely riveting!',
      'Only one can advance to face the Part 1 winner!',
      'The loser goes home - the stakes couldn\'t be higher!',
      'They\'re fighting tooth and nail for that Part 3 spot!',
      'This determines who faces off for the Final HOH!'
    ],
    part3: [
      'The final showdown is here, folks!',
      'Who will become the Final Head of Household?',
      'This competition decides who controls the Final 2!',
      'The winner makes the ultimate eviction decision!',
      'The Big Brother finale is on the line!'
    ]
  };

  // Commentary phrases for dramatic effect (varied by phase) - enhanced sports-style commentary
  const COMMENTARY_PHRASES = {
    common: [
      'The tension in the house is palpable!',
      'And we\'re off! The competitors are giving it their all!',
      'What an incredible showdown!',
      'This is absolutely anyone\'s game right now!',
      'The stakes have never been higher in Big Brother!',
      'Who will come out on top? We\'re about to find out!'
    ],
    part1: [
      'Three houseguests, one goal - advance to the finale!',
      'Every single point matters in this crucial moment!',
      'This will completely reshape the Final 3 dynamic!',
      'The competition level is off the charts!'
    ],
    part2: [
      'Winner takes all in this do-or-die round!',
      'One mistake here could cost everything!',
      'The intensity is absolutely incredible!',
      'There\'s no room for error in this battle!'
    ],
    part3: [
      'This is it - the ultimate Big Brother competition!',
      'Everything comes down to this moment!',
      'The power to choose the Final 2 is up for grabs!',
      'We are witnessing Big Brother history in the making!'
    ]
  };

  let currentView = null;
  let progressInterval = null;
  let updateCount = 0;
  let skipCallback = null;

  /**
   * Show spectator view
   * @param {Object} options
   * @param {Array<string>} options.competitorIds - IDs of players competing
   * @param {string} options.gameType - Type of minigame (e.g., 'memory', 'clicker')
   * @param {string} options.phase - Phase name (e.g., 'Part 2', 'Part 3')
   * @param {Function} options.onSkip - Callback when user clicks skip
   * @param {HTMLElement} options.container - Container element (defaults to fullscreen overlay)
   */
  function show(options) {
    const {
      competitorIds = [],
      gameType = 'competition',
      phase = 'Competition',
      onSkip = null
      // container parameter intentionally not destructured - always uses fullscreen
    } = options;

    // Clean up any existing view
    cleanup();

    const g = global.game;
    if (g) {
      g.__spectatorMode = true;
    }

    skipCallback = onSkip;
    updateCount = 0;

    // Create fullscreen overlay container
    const view = document.createElement('div');
    view.className = 'spectator-view spectator-fullscreen';
    view.style.cssText = `
      position: fixed;
      inset: 0;
      z-index: 10000;
      background: linear-gradient(135deg, rgba(10,15,25,0.98) 0%, rgba(15,20,35,0.98) 100%);
      backdrop-filter: blur(12px);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
      animation: fadeIn 0.4s ease;
      overflow-y: auto;
    `;

    // Add floating background emojis for visual interest
    const emojiBackground = document.createElement('div');
    emojiBackground.className = 'emoji-background';
    emojiBackground.style.cssText = `
      position: fixed;
      inset: 0;
      pointer-events: none;
      z-index: 1;
      overflow: hidden;
    `;
    
    const competitionEmojis = ['🏆', '🎯', '⚡', '🔥', '💪', '🎮', '🏆', '🎯', '⚡', '🔥'];
    competitionEmojis.forEach((emoji, i) => {
      const floatingEmoji = document.createElement('div');
      floatingEmoji.textContent = emoji;
      floatingEmoji.style.cssText = `
        position: absolute;
        font-size: ${30 + Math.random() * 20}px;
        opacity: 0.08;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        animation: floatEmoji ${15 + Math.random() * 10}s ease-in-out infinite;
        animation-delay: ${i * 0.8}s;
      `;
      emojiBackground.appendChild(floatingEmoji);
    });
    view.appendChild(emojiBackground);

    // Content wrapper for scrollable content
    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
      max-width: 800px;
      width: 100%;
      text-align: center;
      position: relative;
      z-index: 2;
    `;

    // Title - optimized for mobile
    const title = document.createElement('h3');
    // Simplify title format to fit one line on mobile
    const simplifiedPhase = phase.replace(/—/g, '-').replace(' in Progress', '');
    title.textContent = `🎬 ${simplifiedPhase}`;
    title.style.cssText = `
      font-size: 1.5rem;
      font-weight: 700;
      color: #ffdc8b;
      margin: 0 0 20px 0;
      text-shadow: 0 2px 12px rgba(255, 220, 139, 0.5);
    `;
    contentWrapper.appendChild(title);

    // Competitors container - reduced margin for mobile
    const competitorsBox = document.createElement('div');
    competitorsBox.className = 'spectator-competitors';
    competitorsBox.style.cssText = `
      display: flex;
      flex-direction: row;
      justify-content: center;
      align-items: center;
      gap: clamp(8px, 2vw, 16px);
      margin-bottom: 20px;
      flex-wrap: nowrap;
      width: 100%;
      padding: 0 8px;
    `;

    competitorIds.forEach(playerId => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const competitorCard = document.createElement('div');
      competitorCard.className = 'spectator-competitor';
      competitorCard.style.cssText = `
        background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
        border: 3px solid #6b7a99;
        border-radius: 16px;
        padding: clamp(10px, 2.5vw, 16px);
        flex: 1 1 0;
        max-width: 48%;
        min-width: 0;
        position: relative;
        overflow: hidden;
        box-shadow: 0 8px 32px rgba(0,0,0,0.4), 0 0 64px rgba(107,122,153,0.2);
        display: flex;
        flex-direction: column;
        align-items: center;
      `;

      // Animated background shimmer
      const shimmer = document.createElement('div');
      shimmer.style.cssText = `
        position: absolute;
        inset: -50%;
        background: linear-gradient(90deg, transparent, rgba(255,220,139,0.1), transparent);
        animation: shimmer 3s ease infinite;
        pointer-events: none;
      `;
      competitorCard.appendChild(shimmer);

      // Avatar - use actual player photo via resolveAvatar
      const avatar = document.createElement('img');
      const avatarUrl = global.resolveAvatar?.(player) || getDicebearUrl(player.avatar || player.name);
      avatar.src = avatarUrl;
      avatar.alt = player.name;
      avatar.style.cssText = `
        width: clamp(60px, 15vw, 80px);
        height: clamp(60px, 15vw, 80px);
        border-radius: 50%;
        border: 4px solid #ffdc8b;
        margin-bottom: 12px;
        animation: pulse 2s ease infinite;
        box-shadow: 0 4px 16px rgba(255,220,139,0.4);
        object-fit: cover;
        position: relative;
        z-index: 1;
        flex-shrink: 0;
      `;
      competitorCard.appendChild(avatar);

      // Name - reduced spacing
      const name = document.createElement('div');
      name.textContent = player.name;
      name.style.cssText = `
        font-size: clamp(0.9rem, 3vw, 1.2rem);
        font-weight: 700;
        color: #cedbeb;
        margin-bottom: 8px;
        position: relative;
        z-index: 1;
        text-align: center;
        word-break: break-word;
      `;
      competitorCard.appendChild(name);

      // Status indicator - reduced spacing
      const status = document.createElement('div');
      status.className = 'competitor-status';
      status.textContent = 'Competing...';
      status.style.cssText = `
        font-size: clamp(0.75rem, 2.5vw, 0.9rem);
        color: #ffdc8b;
        font-weight: 600;
        position: relative;
        z-index: 1;
        text-align: center;
        margin-bottom: 4px;
      `;
      competitorCard.appendChild(status);

      // Score display (simulated) - reduced spacing
      const score = document.createElement('div');
      score.className = 'competitor-score';
      score.textContent = '---';
      score.style.cssText = `
        font-size: clamp(1.1rem, 4vw, 1.5rem);
        font-weight: 800;
        color: #83bfff;
        margin-top: 6px;
        font-family: 'Courier New', monospace;
        position: relative;
        z-index: 1;
        text-align: center;
      `;
      competitorCard.appendChild(score);

      competitorsBox.appendChild(competitorCard);
    });

    contentWrapper.appendChild(competitorsBox);

    // Game preview box with animated preview - reduced padding for mobile
    const gamePreview = document.createElement('div');
    gamePreview.className = 'spectator-game-preview';
    gamePreview.style.cssText = `
      background: linear-gradient(145deg, rgba(30,30,60,0.9) 0%, rgba(20,20,40,0.9) 100%);
      border: 3px solid #4a5a7a;
      border-radius: 16px;
      padding: 20px;
      margin-bottom: 20px;
      min-height: 180px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1);
      position: relative;
      overflow: hidden;
    `;

    // Add animated background effect for game preview
    const bgEffect = document.createElement('div');
    bgEffect.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(45deg, 
        transparent 0%, 
        rgba(107,122,153,0.1) 25%, 
        transparent 50%, 
        rgba(107,122,153,0.1) 75%, 
        transparent 100%);
      background-size: 200% 200%;
      animation: gamePreviewSweep 8s ease-in-out infinite;
      pointer-events: none;
    `;
    gamePreview.appendChild(bgEffect);

    const gameIcon = document.createElement('div');
    gameIcon.textContent = getGameIcon(gameType);
    gameIcon.style.cssText = `
      font-size: 3.5rem;
      margin-bottom: 12px;
      animation: pulse 2s ease infinite;
      filter: drop-shadow(0 4px 16px rgba(255,220,139,0.3));
      position: relative;
      z-index: 1;
    `;
    gamePreview.appendChild(gameIcon);

    const gameName = document.createElement('div');
    gameName.textContent = getGameDisplayName(gameType);
    gameName.style.cssText = `
      font-size: 1.1rem;
      font-weight: 700;
      color: #cedbeb;
      margin-bottom: 10px;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      position: relative;
      z-index: 1;
    `;
    gamePreview.appendChild(gameName);
    
    // Add simulated game activity indicator
    const activityIndicator = document.createElement('div');
    activityIndicator.style.cssText = `
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
      position: relative;
      z-index: 1;
    `;
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement('div');
      dot.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: #ffdc8b;
        animation: activityPulse 1.5s ease-in-out infinite;
        animation-delay: ${i * 0.3}s;
        box-shadow: 0 0 8px rgba(255,220,139,0.6);
      `;
      activityIndicator.appendChild(dot);
    }
    gamePreview.appendChild(activityIndicator);

    // Add horizontal progress bar instead of random action bars
    const competitionProgress = document.createElement('div');
    competitionProgress.className = 'competition-progress-container';
    competitionProgress.style.cssText = `
      width: 100%;
      max-width: 450px;
      margin: 16px 0;
      position: relative;
      z-index: 1;
    `;
    
    const progressLabel = document.createElement('div');
    progressLabel.textContent = 'Competition Progress';
    progressLabel.style.cssText = `
      font-size: 0.85rem;
      color: #8a9ab8;
      text-align: center;
      margin-bottom: 8px;
      font-weight: 600;
    `;
    competitionProgress.appendChild(progressLabel);
    
    const competitionProgressBar = document.createElement('div');
    competitionProgressBar.className = 'competition-progress-bar';
    competitionProgressBar.style.cssText = `
      width: 100%;
      height: 24px;
      background: rgba(107, 122, 153, 0.3);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
      position: relative;
    `;
    
    const competitionProgressFill = document.createElement('div');
    competitionProgressFill.className = 'competition-progress-fill';
    competitionProgressFill.style.cssText = `
      height: 100%;
      width: 0%;
      background: linear-gradient(90deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
      transition: width 1.5s ease-out;
      box-shadow: 0 0 16px rgba(74, 222, 128, 0.8);
      position: relative;
    `;
    
    // Add shine effect to progress bar
    const progressShine = document.createElement('div');
    progressShine.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
      animation: shine 2s ease infinite;
    `;
    competitionProgressFill.appendChild(progressShine);
    
    competitionProgressBar.appendChild(competitionProgressFill);
    competitionProgress.appendChild(competitionProgressBar);
    gamePreview.appendChild(competitionProgress);

    contentWrapper.appendChild(gamePreview);
    
    // Inject additional animations if not already present
    injectSpectatorAnimations();

    // Progress updates container - moved higher for better mobile visibility
    const updatesBox = document.createElement('div');
    updatesBox.className = 'spectator-updates';
    updatesBox.style.cssText = `
      min-height: 60px;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    const updateText = document.createElement('div');
    updateText.className = 'spectator-update-text';
    updateText.style.cssText = `
      font-size: 1.2rem;
      color: #cedbeb;
      font-style: italic;
      animation: fadeIn 0.5s ease;
      text-align: center;
      text-shadow: 0 2px 8px rgba(0,0,0,0.5);
    `;
    updateText.textContent = 'Competition starting...';
    updatesBox.appendChild(updateText);

    contentWrapper.appendChild(updatesBox);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn primary';
    skipBtn.textContent = 'Skip to Results ⏭️';
    skipBtn.style.cssText = `
      padding: 16px 32px;
      font-size: 1.1rem;
      font-weight: 700;
      margin-top: 12px;
      box-shadow: 0 4px 16px rgba(131,191,255,0.4);
    `;
    skipBtn.onclick = () => handleSkip();
    contentWrapper.appendChild(skipBtn);

    // Info text
    const infoText = document.createElement('div');
    infoText.style.cssText = `
      font-size: 0.9rem;
      color: #8a9ab8;
      margin-top: 20px;
    `;
    infoText.textContent = 'Press Space or Enter to skip';
    contentWrapper.appendChild(infoText);

    view.appendChild(contentWrapper);
    
    // Mount to body for fullscreen experience
    document.body.appendChild(view);
    currentView = view;

    // Set up keyboard shortcut
    const keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };
    document.addEventListener('keydown', keyHandler);
    view._keyHandler = keyHandler;

    // Start progress simulation with phase for context-aware messages
    // Get the competition progress fill element for animation
    const compProgressFill = view.querySelector('.competition-progress-fill');
    startProgressSimulation(competitorIds, compProgressFill, updateText, phase);

    // Emit event
    if (global.game?.bus) {
      global.game.bus.emit('spectator:started', { phase, competitorIds, gameType });
    }

    return view;
  }

  /**
   * Handle skip button click
   */
  function handleSkip() {
    if (!skipCallback) return;

    const skipBtn = currentView?.querySelector('button');
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Revealing results...';
    }

    // Show quick reveal sequence (2-3 seconds)
    showRevealSequence(() => {
      cleanup();
      
      // Auto-advance: Set phase timer to 1 second for quick progression
      const g = global.game;
      if (g && g.phaseEndsAt) {
        const now = Date.now();
        g.phaseEndsAt = now + 1000; // 1 second from now
        console.info('[SpectatorView] Phase timer set to 1 second for quick progression');
      }
      
      if (skipCallback) skipCallback();
    });

    // Emit event
    if (global.game?.bus) {
      global.game.bus.emit('spectator:skip');
    }
  }

  /**
   * Show reveal sequence
   * @param {Function} callback - Called after reveal completes
   */
  function showRevealSequence(callback) {
    if (!currentView) {
      if (callback) callback();
      return;
    }

    const updatesBox = currentView.querySelector('.spectator-updates');
    if (!updatesBox) {
      if (callback) callback();
      return;
    }

    const updateText = updatesBox.querySelector('.spectator-update-text');
    if (!updateText) {
      if (callback) callback();
      return;
    }

    // Dramatic pause
    updateText.textContent = '...';
    updateText.style.animation = 'pulse 0.5s ease 3';

    setTimeout(() => {
      updateText.textContent = '🏆 Results incoming...';
      updateText.style.color = '#ffdc8b';
      updateText.style.fontWeight = '700';
      updateText.style.fontSize = '1.2rem';

      setTimeout(() => {
        updateText.textContent = '✨ Get ready for the next part...';
        updateText.style.fontSize = '1.1rem';
        
        setTimeout(() => {
          if (callback) callback();
        }, 800);
      }, 1200);
    }, 1000);
  }

  /**
   * Start progress simulation
   */
  function startProgressSimulation(competitorIds, progressFill, updateText, phase) {
    // Determine phase-specific messages with precise matching
    let phaseKey = 'common';
    if (phase) {
      if (phase.toLowerCase().indexOf('part 1') !== -1) phaseKey = 'part1';
      else if (phase.toLowerCase().indexOf('part 2') !== -1) phaseKey = 'part2';
      else if (phase.toLowerCase().indexOf('part 3') !== -1) phaseKey = 'part3';
    }
    
    const progressMessages = [
      ...PROGRESS_MESSAGES.common,
      ...(PROGRESS_MESSAGES[phaseKey] || [])
    ];
    const commentaryPhrases = [
      ...COMMENTARY_PHRASES.common,
      ...(COMMENTARY_PHRASES[phaseKey] || [])
    ];
    
    // Animate progress bar
    setTimeout(() => {
      if (progressFill) {
        progressFill.style.width = '90%';
      }
    }, 500);

    // Simulate score updates
    const scoreElements = document.querySelectorAll('.competitor-score');
    const currentScores = competitorIds.map(() => 0);
    let roundNumber = 1;

    // Update messages periodically
    progressInterval = setInterval(() => {
      updateCount++;
      
      // Increment round number occasionally
      if (updateCount % 4 === 0) {
        roundNumber++;
      }

      // Update scores with random increments
      scoreElements.forEach((el, idx) => {
        if (idx < currentScores.length) {
          const increment = Math.floor(Math.random() * 150) + 50;
          currentScores[idx] += increment;
          el.textContent = currentScores[idx].toString();
          
          // Add flash animation on update
          el.style.animation = 'none';
          void el.offsetWidth; // Force reflow
          el.style.animation = 'scoreFlash 0.5s ease';
        }
      });

      // Select random message
      let message;
      if (updateCount % 3 === 0 && commentaryPhrases.length > 0) {
        // Show commentary occasionally
        message = commentaryPhrases[Math.floor(Math.random() * commentaryPhrases.length)];
      } else {
        // Show progress message
        message = progressMessages[Math.floor(Math.random() * progressMessages.length)];
        
        // Replace {name} placeholder with random competitor
        if (message.includes('{name}') && competitorIds.length > 0) {
          const randomId = competitorIds[Math.floor(Math.random() * competitorIds.length)];
          const player = global.getP?.(randomId);
          if (player) {
            message = message.replace('{name}', player.name);
          }
        }
        
        // Replace {round} placeholder
        if (message.includes('{round}')) {
          message = message.replace('{round}', roundNumber.toString());
        }
      }

      if (updateText) {
        updateText.style.animation = 'none';
        // Force reflow: This DOM read forces the browser to recalculate styles,
        // which is necessary to restart the CSS animation. Without this,
        // setting the animation property again wouldn't trigger a new animation
        // because the browser optimizes away the change if no reflow occurs.
        void updateText.offsetWidth; // Trigger reflow
        updateText.style.animation = 'fadeIn 0.5s ease';
        updateText.textContent = message;
      }

      // Emit progress event
      if (global.game?.bus) {
        global.game.bus.emit('spectator:progress', { message, updateCount, scores: currentScores, round: roundNumber });
      }

    }, 3000 + Math.random() * 2000); // 3-5 seconds between updates
  }

  /**
   * Get icon for game type
   */
  function getGameIcon(gameType) {
    const icons = {
      memory: '🧠',
      clicker: '👆',
      math: '🔢',
      bar: '📊',
      numseq: '🔢',
      pattern: '🎨',
      anagram: '🔤',
      target: '🎯',
      pairs: '🎴',
      estimate: '📏',
      competition: '🎮'
    };
    return icons[gameType] || icons.competition;
  }

  /**
   * Get display name for game type
   */
  function getGameDisplayName(gameType) {
    const names = {
      memory: 'Memory Challenge',
      clicker: 'Speed Clicking',
      math: 'Math Sprint',
      bar: 'Rhythm Bar',
      numseq: 'Number Sequence',
      pattern: 'Pattern Match',
      anagram: 'Word Scramble',
      target: 'Target Practice',
      pairs: 'Matching Pairs',
      estimate: 'Estimation Game',
      competition: 'Competition'
    };
    return names[gameType] || 'Competition Challenge';
  }

  /**
   * Clean up spectator view
   */
  function cleanup() {
    if (progressInterval) {
      clearInterval(progressInterval);
      progressInterval = null;
    }

    if (currentView) {
      // Remove keyboard handler
      if (currentView._keyHandler) {
        document.removeEventListener('keydown', currentView._keyHandler);
      }

      currentView.remove();
      currentView = null;
    }

    skipCallback = null;
    updateCount = 0;

    const g = global.game;
    if (g) {
      g.__spectatorMode = false;
    }
  }

  /**
   * Inject additional spectator animations if not already present
   */
  function injectSpectatorAnimations() {
    if (document.getElementById('spectator-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'spectator-animations';
    style.textContent = `
      @keyframes activityPulse {
        0%, 100% {
          transform: scale(1);
          opacity: 0.5;
        }
        50% {
          transform: scale(1.3);
          opacity: 1;
        }
      }
      
      @keyframes gamePreviewSweep {
        0% {
          background-position: 0% 50%;
        }
        50% {
          background-position: 100% 50%;
        }
        100% {
          background-position: 0% 50%;
        }
      }
      
      @keyframes scoreFlash {
        0% {
          transform: scale(1);
          color: #83bfff;
        }
        50% {
          transform: scale(1.15);
          color: #ffdc8b;
        }
        100% {
          transform: scale(1);
          color: #83bfff;
        }
      }
      
      @keyframes shine {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
      }
      
      @keyframes floatEmoji {
        0%, 100% {
          transform: translate(0, 0) rotate(0deg);
          opacity: 0.08;
        }
        25% {
          transform: translate(20px, -30px) rotate(5deg);
          opacity: 0.12;
        }
        50% {
          transform: translate(-10px, -60px) rotate(-5deg);
          opacity: 0.08;
        }
        75% {
          transform: translate(30px, -40px) rotate(3deg);
          opacity: 0.1;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Check if spectator view is active
   */
  function isActive() {
    return currentView !== null;
  }

  // Public API
  SpectatorView.show = show;
  SpectatorView.cleanup = cleanup;
  SpectatorView.isActive = isActive;
  SpectatorView.showRevealSequence = showRevealSequence;

  // Export to global
  global.SpectatorView = SpectatorView;

  // Listen for phase changes to clean up
  if (global.game?.bus) {
    global.game.bus.on('bb:phase:changed', () => {
      // Clean up spectator view on phase change
      if (isActive()) {
        console.info('[SpectatorView] Phase changed, cleaning up spectator view');
        cleanup();
      }
    });
  }

})(window);
