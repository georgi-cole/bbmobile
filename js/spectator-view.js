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

  // Progress messages for simulated updates
  const PROGRESS_MESSAGES = [
    'Round 1 complete...',
    'Scores are close!',
    'Competition heating up...',
    '{name} takes the lead!',
    'Neck and neck!',
    '{name} pulls ahead!',
    'Final moments...',
    'Almost finished!',
    '{name} showing strong performance!',
    'This could go either way...'
  ];

  // Commentary phrases for dramatic effect
  const COMMENTARY_PHRASES = [
    'The tension is palpable!',
    'Both competitors are giving it their all!',
    'What a showdown!',
    'This is anyone\'s game!',
    'The stakes have never been higher!',
    'Who will come out on top?'
  ];

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
   * @param {HTMLElement} options.container - Container element (defaults to #panel)
   */
  function show(options) {
    const {
      competitorIds = [],
      gameType = 'competition',
      phase = 'Competition',
      onSkip = null,
      container = document.getElementById('panel')
    } = options;

    if (!container) {
      console.error('[SpectatorView] Container not found');
      return;
    }

    // Clean up any existing view
    cleanup();

    const g = global.game;
    if (g) {
      g.__spectatorMode = true;
    }

    skipCallback = onSkip;
    updateCount = 0;

    // Create spectator view container
    const view = document.createElement('div');
    view.className = 'spectator-view';
    view.style.cssText = `
      padding: 20px;
      text-align: center;
      animation: fadeIn 0.4s ease;
    `;

    // Title
    const title = document.createElement('h3');
    title.textContent = `🎬 ${phase} in Progress`;
    title.style.cssText = `
      font-size: 1.4rem;
      font-weight: 700;
      color: #ffdc8b;
      margin: 0 0 24px 0;
    `;
    view.appendChild(title);

    // Competitors container
    const competitorsBox = document.createElement('div');
    competitorsBox.className = 'spectator-competitors';
    competitorsBox.style.cssText = `
      display: flex;
      justify-content: center;
      gap: 24px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    `;

    competitorIds.forEach(playerId => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const competitorCard = document.createElement('div');
      competitorCard.className = 'spectator-competitor';
      competitorCard.style.cssText = `
        background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
        border: 2px solid #6b7a99;
        border-radius: 12px;
        padding: 16px;
        min-width: 140px;
        position: relative;
        overflow: hidden;
      `;

      // Avatar
      const avatar = document.createElement('img');
      avatar.src = getDicebearUrl(player.avatar || player.name);
      avatar.alt = player.name;
      avatar.style.cssText = `
        width: 80px;
        height: 80px;
        border-radius: 50%;
        border: 3px solid #ffdc8b;
        margin-bottom: 12px;
        animation: pulse 2s ease infinite;
      `;
      competitorCard.appendChild(avatar);

      // Name
      const name = document.createElement('div');
      name.textContent = player.name;
      name.style.cssText = `
        font-size: 1rem;
        font-weight: 600;
        color: #cedbeb;
        margin-bottom: 8px;
      `;
      competitorCard.appendChild(name);

      // Status indicator
      const status = document.createElement('div');
      status.className = 'competitor-status';
      status.textContent = 'Competing...';
      status.style.cssText = `
        font-size: 0.85rem;
        color: #ffdc8b;
        font-weight: 500;
      `;
      competitorCard.appendChild(status);

      competitorsBox.appendChild(competitorCard);
    });

    view.appendChild(competitorsBox);

    // Game preview box
    const gamePreview = document.createElement('div');
    gamePreview.className = 'spectator-game-preview';
    gamePreview.style.cssText = `
      background: linear-gradient(145deg, rgba(30,30,60,0.9) 0%, rgba(20,20,40,0.9) 100%);
      border: 2px solid #4a5a7a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    `;

    const gameIcon = document.createElement('div');
    gameIcon.textContent = getGameIcon(gameType);
    gameIcon.style.cssText = `
      font-size: 3rem;
      margin-bottom: 12px;
      animation: pulse 2s ease infinite;
    `;
    gamePreview.appendChild(gameIcon);

    const gameName = document.createElement('div');
    gameName.textContent = getGameDisplayName(gameType);
    gameName.style.cssText = `
      font-size: 1.1rem;
      font-weight: 600;
      color: #cedbeb;
      margin-bottom: 8px;
    `;
    gamePreview.appendChild(gameName);

    const progressBar = document.createElement('div');
    progressBar.className = 'spectator-progress-bar';
    progressBar.style.cssText = `
      width: 100%;
      height: 8px;
      background: rgba(107, 122, 153, 0.3);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 12px;
    `;

    const progressFill = document.createElement('div');
    progressFill.className = 'progress-fill';
    progressFill.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #ffdc8b 0%, #ffa500 100%);
      width: 0%;
      transition: width 2s ease;
      animation: shimmer 2s ease infinite;
    `;
    progressBar.appendChild(progressFill);
    gamePreview.appendChild(progressBar);

    view.appendChild(gamePreview);

    // Progress updates container
    const updatesBox = document.createElement('div');
    updatesBox.className = 'spectator-updates';
    updatesBox.style.cssText = `
      min-height: 60px;
      margin-bottom: 20px;
    `;

    const updateText = document.createElement('div');
    updateText.className = 'spectator-update-text';
    updateText.style.cssText = `
      font-size: 1rem;
      color: #cedbeb;
      font-style: italic;
      animation: fadeIn 0.5s ease;
    `;
    updateText.textContent = 'Competition starting...';
    updatesBox.appendChild(updateText);

    view.appendChild(updatesBox);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn primary';
    skipBtn.textContent = 'Skip to Results ⏭️';
    skipBtn.style.cssText = `
      padding: 12px 24px;
      font-size: 1rem;
      font-weight: 600;
      margin-top: 12px;
    `;
    skipBtn.onclick = () => handleSkip();
    view.appendChild(skipBtn);

    // Info text
    const infoText = document.createElement('div');
    infoText.style.cssText = `
      font-size: 0.85rem;
      color: #8a9ab8;
      margin-top: 16px;
    `;
    infoText.textContent = 'Press Space or Enter to skip';
    view.appendChild(infoText);

    container.innerHTML = '';
    container.appendChild(view);
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

    // Start progress simulation
    startProgressSimulation(competitorIds, progressFill, updateText);

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
        if (callback) callback();
      }, 1500);
    }, 1000);
  }

  /**
   * Start progress simulation
   */
  function startProgressSimulation(competitorIds, progressFill, updateText) {
    // Animate progress bar
    setTimeout(() => {
      if (progressFill) {
        progressFill.style.width = '90%';
      }
    }, 500);

    // Update messages periodically
    progressInterval = setInterval(() => {
      updateCount++;

      // Select random message
      let message;
      if (updateCount % 3 === 0 && COMMENTARY_PHRASES.length > 0) {
        // Show commentary occasionally
        message = COMMENTARY_PHRASES[Math.floor(Math.random() * COMMENTARY_PHRASES.length)];
      } else {
        // Show progress message
        message = PROGRESS_MESSAGES[Math.floor(Math.random() * PROGRESS_MESSAGES.length)];
        
        // Replace {name} placeholder with random competitor
        if (message.includes('{name}') && competitorIds.length > 0) {
          const randomId = competitorIds[Math.floor(Math.random() * competitorIds.length)];
          const player = global.getP?.(randomId);
          if (player) {
            message = message.replace('{name}', player.name);
          }
        }
      }

      if (updateText) {
        updateText.style.animation = 'none';
        void updateText.offsetWidth; // Trigger reflow
        updateText.style.animation = 'fadeIn 0.5s ease';
        updateText.textContent = message;
      }

      // Emit progress event
      if (global.game?.bus) {
        global.game.bus.emit('spectator:progress', { message, updateCount });
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
