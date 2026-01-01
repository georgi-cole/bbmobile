// MODULE: spectator-view-part3.js
// Enhanced spectator mode for Final 3 Part 3 competition
// Provides 3 different competition simulation variants that are randomly selected

(function(global) {
  'use strict';

  const SpectatorViewPart3 = {};

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'Player')}`;
  };

  let currentView = null;
  let progressInterval = null;
  let skipCallback = null;
  let currentVariant = null;

  // Three different competition variants
  const VARIANTS = ['holdWall', 'trivia', 'speedChallenge'];

  // Configuration constants for simulations
  const SIMULATION_CONFIG = {
    holdWall: {
      maxClimbHeight: 350,
      climbIncrement: { min: 15, max: 25 },
      enduranceDepletionBase: 8,
      enduranceDepletionRandom: 15,
      updateInterval: 2500
    },
    trivia: {
      pointsPerCorrect: 100,
      updateInterval: 4000
    },
    speedChallenge: {
      scoreIncrement: { min: 50, max: 100 },
      maxScore: 3000,
      updateInterval: 2000
    }
  };

  /**
   * Show enhanced Part 3 spectator view
   * @param {Object} options
   * @param {Array<string>} options.competitorIds - IDs of players competing
   * @param {Function} options.onSkip - Callback when user clicks skip
   */
  function show(options) {
    const {
      competitorIds = [],
      onSkip = null
    } = options;

    // Validate competitor IDs
    if (!Array.isArray(competitorIds) || competitorIds.length === 0) {
      console.warn('[SpectatorPart3] Invalid or empty competitorIds array:', competitorIds);
      // Show fallback message
      showFallbackMessage(onSkip);
      return null;
    }

    // Clean up any existing view
    cleanup();

    const g = global.game;
    if (g) {
      g.__spectatorMode = true;
    }

    skipCallback = onSkip;

    // Randomly select a variant for this viewing
    const variantIndex = Math.floor((global.rng?.() || Math.random()) * VARIANTS.length);
    currentVariant = VARIANTS[variantIndex];
    
    console.info(`[SpectatorPart3] Selected variant: ${currentVariant}`);

    // Create the appropriate variant view
    if (currentVariant === 'holdWall') {
      currentView = createHoldWallView(competitorIds);
    } else if (currentVariant === 'trivia') {
      currentView = createTriviaView(competitorIds);
    } else if (currentVariant === 'speedChallenge') {
      currentView = createSpeedChallengeView(competitorIds);
    }

    if (!currentView) {
      console.error('[SpectatorPart3] Failed to create view');
      return null;
    }

    // Mount to body for fullscreen experience
    document.body.appendChild(currentView);

    // Set up keyboard shortcut
    const keyHandler = (e) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        handleSkip();
      }
    };
    document.addEventListener('keydown', keyHandler);
    currentView._keyHandler = keyHandler;

    // Emit event
    if (global.game?.bus) {
      global.game.bus.emit('spectator:part3:started', { 
        competitorIds, 
        variant: currentVariant 
      });
    }

    return currentView;
  }

  /**
   * Create "Hold the Wall" endurance competition view
   */
  function createHoldWallView(competitorIds) {
    const view = createBaseView('🧱 Hold the Wall - Final Showdown', 
      'Who can hold on the longest? The last one standing becomes Final HOH!');

    const contentWrapper = view.querySelector('.content-wrapper');
    
    // Create wall climbing visual
    const wallContainer = document.createElement('div');
    wallContainer.className = 'wall-container';
    wallContainer.style.cssText = `
      position: relative;
      width: 100%;
      max-width: 600px;
      height: 400px;
      background: linear-gradient(to bottom, 
        rgba(60, 80, 100, 0.9) 0%,
        rgba(40, 50, 70, 0.9) 50%,
        rgba(20, 30, 50, 0.9) 100%);
      border: 3px solid #6b7a99;
      border-radius: 16px;
      margin: 24px auto;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    `;

    // Add wall texture
    const wallTexture = document.createElement('div');
    wallTexture.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: 
        repeating-linear-gradient(0deg, transparent, transparent 35px, rgba(107,122,153,0.1) 35px, rgba(107,122,153,0.1) 40px),
        repeating-linear-gradient(90deg, transparent, transparent 35px, rgba(107,122,153,0.1) 35px, rgba(107,122,153,0.1) 40px);
      pointer-events: none;
    `;
    wallContainer.appendChild(wallTexture);

    // Create competitor climbers
    const climbers = [];
    competitorIds.forEach((playerId, index) => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const climber = document.createElement('div');
      climber.className = 'climber';
      climber.dataset.playerId = playerId;
      climber.style.cssText = `
        position: absolute;
        bottom: 20px;
        left: ${30 + index * 40}%;
        transform: translateX(-50%);
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        transition: bottom 0.8s ease-out;
      `;

      // Avatar
      const avatar = document.createElement('img');
      const avatarUrl = global.resolveAvatar?.(player) || getDicebearUrl(player.avatar || player.name);
      avatar.src = avatarUrl;
      avatar.alt = player.name;
      avatar.style.cssText = `
        width: 60px;
        height: 60px;
        border-radius: 50%;
        border: 3px solid #ffdc8b;
        box-shadow: 0 4px 16px rgba(255,220,139,0.6);
        animation: climbBob 2s ease-in-out infinite;
        animation-delay: ${index * 0.3}s;
        object-fit: cover;
      `;
      climber.appendChild(avatar);

      // Name label
      const nameLabel = document.createElement('div');
      nameLabel.textContent = player.name;
      nameLabel.style.cssText = `
        font-size: 0.85rem;
        font-weight: 700;
        color: #cedbeb;
        background: rgba(20,20,40,0.9);
        padding: 4px 8px;
        border-radius: 6px;
        white-space: nowrap;
        text-shadow: 0 2px 4px rgba(0,0,0,0.8);
      `;
      climber.appendChild(nameLabel);

      // Endurance meter
      const meterBg = document.createElement('div');
      meterBg.style.cssText = `
        width: 70px;
        height: 8px;
        background: rgba(107,122,153,0.3);
        border-radius: 4px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
      `;
      const meterFill = document.createElement('div');
      meterFill.className = 'endurance-meter';
      meterFill.style.cssText = `
        height: 100%;
        width: 100%;
        background: linear-gradient(90deg, #4ade80 0%, #22c55e 100%);
        transition: width 0.5s ease, background 0.5s ease;
        box-shadow: 0 0 8px rgba(74, 222, 128, 0.6);
      `;
      meterBg.appendChild(meterFill);
      climber.appendChild(meterBg);

      wallContainer.appendChild(climber);
      climbers.push({ element: climber, meter: meterFill, playerId, player });
    });

    contentWrapper.insertBefore(wallContainer, contentWrapper.querySelector('.spectator-updates'));

    // Start hold wall simulation
    startHoldWallSimulation(climbers);

    return view;
  }

  /**
   * Create "Trivia Quiz" knowledge competition view
   */
  function createTriviaView(competitorIds) {
    const view = createBaseView('🧠 Final 3 Trivia Showdown', 
      'A battle of Big Brother knowledge! Who will prove they know the game best?');

    const contentWrapper = view.querySelector('.content-wrapper');

    // Create trivia board
    const triviaBoard = document.createElement('div');
    triviaBoard.className = 'trivia-board';
    triviaBoard.style.cssText = `
      width: 100%;
      max-width: 700px;
      margin: 24px auto;
      background: linear-gradient(145deg, rgba(40,40,80,0.95) 0%, rgba(25,25,50,0.95) 100%);
      border: 3px solid #6b7a99;
      border-radius: 16px;
      padding: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
    `;

    // Question display area
    const questionArea = document.createElement('div');
    questionArea.className = 'question-area';
    questionArea.style.cssText = `
      background: rgba(60,70,100,0.6);
      border: 2px solid #4a5a7a;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 24px;
      min-height: 120px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    const questionNumber = document.createElement('div');
    questionNumber.className = 'question-number';
    questionNumber.textContent = 'Question 1';
    questionNumber.style.cssText = `
      font-size: 0.9rem;
      font-weight: 600;
      color: #ffdc8b;
      text-transform: uppercase;
      letter-spacing: 1px;
    `;
    questionArea.appendChild(questionNumber);

    const questionText = document.createElement('div');
    questionText.className = 'question-text';
    questionText.textContent = 'Loading question...';
    questionText.style.cssText = `
      font-size: 1.1rem;
      color: #cedbeb;
      line-height: 1.5;
      font-weight: 500;
    `;
    questionArea.appendChild(questionText);

    triviaBoard.appendChild(questionArea);

    // Competitor scoreboards
    const scoreboardContainer = document.createElement('div');
    scoreboardContainer.style.cssText = `
      display: flex;
      gap: 16px;
      justify-content: center;
      flex-wrap: wrap;
    `;

    const competitors = [];
    competitorIds.forEach((playerId) => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const scoreCard = document.createElement('div');
      scoreCard.className = 'trivia-score-card';
      scoreCard.dataset.playerId = playerId;
      scoreCard.style.cssText = `
        flex: 1;
        min-width: 200px;
        max-width: 300px;
        background: linear-gradient(135deg, rgba(50,60,90,0.9) 0%, rgba(35,45,70,0.9) 100%);
        border: 2px solid #6b7a99;
        border-radius: 12px;
        padding: 16px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        transition: all 0.3s ease;
      `;

      // Avatar
      const avatar = document.createElement('img');
      const avatarUrl = global.resolveAvatar?.(player) || getDicebearUrl(player.avatar || player.name);
      avatar.src = avatarUrl;
      avatar.alt = player.name;
      avatar.style.cssText = `
        width: 50px;
        height: 50px;
        border-radius: 50%;
        border: 2px solid #ffdc8b;
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(255,220,139,0.4);
      `;
      scoreCard.appendChild(avatar);

      // Name
      const name = document.createElement('div');
      name.textContent = player.name;
      name.style.cssText = `
        font-size: 1rem;
        font-weight: 700;
        color: #cedbeb;
        text-align: center;
      `;
      scoreCard.appendChild(name);

      // Score
      const score = document.createElement('div');
      score.className = 'trivia-score';
      score.textContent = '0 pts';
      score.style.cssText = `
        font-size: 1.5rem;
        font-weight: 800;
        color: #83bfff;
        font-family: 'Courier New', monospace;
      `;
      scoreCard.appendChild(score);

      // Answer indicator
      const answerStatus = document.createElement('div');
      answerStatus.className = 'answer-status';
      answerStatus.textContent = 'Thinking...';
      answerStatus.style.cssText = `
        font-size: 0.85rem;
        color: #8a9ab8;
        font-style: italic;
        min-height: 20px;
      `;
      scoreCard.appendChild(answerStatus);

      scoreboardContainer.appendChild(scoreCard);
      competitors.push({ element: scoreCard, score, answerStatus, playerId, player });
    });

    triviaBoard.appendChild(scoreboardContainer);
    contentWrapper.insertBefore(triviaBoard, contentWrapper.querySelector('.spectator-updates'));

    // Start trivia simulation
    startTriviaSimulation(questionNumber, questionText, competitors);

    return view;
  }

  /**
   * Create "Speed Challenge" timed competition view
   */
  function createSpeedChallengeView(competitorIds) {
    const view = createBaseView('⚡ Speed Challenge - Race Against Time', 
      'Lightning-fast reactions and precision! Who will dominate under pressure?');

    const contentWrapper = view.querySelector('.content-wrapper');

    // Create race track
    const raceTrack = document.createElement('div');
    raceTrack.className = 'race-track';
    raceTrack.style.cssText = `
      width: 100%;
      max-width: 700px;
      margin: 24px auto;
      background: linear-gradient(90deg, 
        rgba(40,40,80,0.95) 0%,
        rgba(50,50,90,0.95) 50%,
        rgba(40,40,80,0.95) 100%);
      border: 3px solid #6b7a99;
      border-radius: 16px;
      padding: 32px 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      position: relative;
      overflow: hidden;
    `;

    // Add animated background stripes
    const stripes = document.createElement('div');
    stripes.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: repeating-linear-gradient(
        45deg,
        transparent,
        transparent 20px,
        rgba(107,122,153,0.1) 20px,
        rgba(107,122,153,0.1) 40px
      );
      animation: stripesScroll 2s linear infinite;
      pointer-events: none;
    `;
    raceTrack.appendChild(stripes);

    // Race lanes
    const lanes = [];
    competitorIds.forEach((playerId, index) => {
      const player = global.getP?.(playerId);
      if (!player) return;

      const lane = document.createElement('div');
      lane.className = 'race-lane';
      lane.dataset.playerId = playerId;
      lane.style.cssText = `
        position: relative;
        margin-bottom: 24px;
        padding: 16px;
        background: rgba(60,70,100,0.4);
        border: 2px solid #4a5a7a;
        border-radius: 12px;
        z-index: 1;
      `;

      // Lane header
      const laneHeader = document.createElement('div');
      laneHeader.style.cssText = `
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      `;

      const avatar = document.createElement('img');
      const avatarUrl = global.resolveAvatar?.(player) || getDicebearUrl(player.avatar || player.name);
      avatar.src = avatarUrl;
      avatar.alt = player.name;
      avatar.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        border: 2px solid #ffdc8b;
        object-fit: cover;
        box-shadow: 0 4px 12px rgba(255,220,139,0.4);
      `;
      laneHeader.appendChild(avatar);

      const nameAndScore = document.createElement('div');
      nameAndScore.style.cssText = `
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const name = document.createElement('div');
      name.textContent = player.name;
      name.style.cssText = `
        font-size: 1rem;
        font-weight: 700;
        color: #cedbeb;
      `;
      nameAndScore.appendChild(name);

      const score = document.createElement('div');
      score.className = 'speed-score';
      score.textContent = '0';
      score.style.cssText = `
        font-size: 1.3rem;
        font-weight: 800;
        color: #83bfff;
        font-family: 'Courier New', monospace;
      `;
      nameAndScore.appendChild(score);

      laneHeader.appendChild(nameAndScore);
      lane.appendChild(laneHeader);

      // Progress bar
      const progressBg = document.createElement('div');
      progressBg.style.cssText = `
        width: 100%;
        height: 20px;
        background: rgba(107,122,153,0.3);
        border-radius: 10px;
        overflow: hidden;
        box-shadow: inset 0 2px 4px rgba(0,0,0,0.3);
        position: relative;
      `;

      const progressFill = document.createElement('div');
      progressFill.className = 'speed-progress';
      progressFill.style.cssText = `
        height: 100%;
        width: 0%;
        background: linear-gradient(90deg, #4ade80 0%, #22c55e 50%, #16a34a 100%);
        transition: width 0.3s ease;
        box-shadow: 0 0 12px rgba(74, 222, 128, 0.8);
        position: relative;
      `;

      // Add shine effect
      const shine = document.createElement('div');
      shine.style.cssText = `
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
        animation: shine 2s ease infinite;
      `;
      progressFill.appendChild(shine);

      progressBg.appendChild(progressFill);
      lane.appendChild(progressBg);

      raceTrack.appendChild(lane);
      lanes.push({ element: lane, score, progressFill, playerId, player });
    });

    contentWrapper.insertBefore(raceTrack, contentWrapper.querySelector('.spectator-updates'));

    // Start speed challenge simulation
    startSpeedChallengeSimulation(lanes);

    return view;
  }

  /**
   * Create base view structure common to all variants
   */
  function createBaseView(title, subtitle) {
    const view = document.createElement('div');
    view.className = 'spectator-view spectator-part3 spectator-fullscreen';
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

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'content-wrapper';
    contentWrapper.style.cssText = `
      max-width: 900px;
      width: 100%;
      text-align: center;
    `;

    // Title
    const titleEl = document.createElement('h3');
    titleEl.textContent = title;
    titleEl.style.cssText = `
      font-size: 2rem;
      font-weight: 700;
      color: #ffdc8b;
      margin: 0 0 12px 0;
      text-shadow: 0 2px 12px rgba(255, 220, 139, 0.5);
      animation: pulse 2s ease infinite;
    `;
    contentWrapper.appendChild(titleEl);

    // Subtitle
    const subtitleEl = document.createElement('div');
    subtitleEl.textContent = subtitle;
    subtitleEl.style.cssText = `
      font-size: 1.1rem;
      color: #8a9ab8;
      margin-bottom: 32px;
      font-style: italic;
    `;
    contentWrapper.appendChild(subtitleEl);

    // Progress updates container (will be populated by specific variants)
    const updatesBox = document.createElement('div');
    updatesBox.className = 'spectator-updates';
    updatesBox.style.cssText = `
      min-height: 60px;
      margin: 32px 0 24px 0;
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
      font-weight: 600;
    `;
    updateText.textContent = 'Competition starting...';
    updatesBox.appendChild(updateText);

    contentWrapper.appendChild(updatesBox);

    // Skip button
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn primary spectator-skip-btn';
    skipBtn.textContent = 'Skip to Results ⏭️';
    skipBtn.style.cssText = `
      padding: 16px 32px;
      font-size: 1.1rem;
      font-weight: 700;
      margin-top: 12px;
      box-shadow: 0 4px 16px rgba(131,191,255,0.4);
      cursor: pointer;
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

    // Inject animations
    injectPart3Animations();

    return view;
  }

  /**
   * Start Hold Wall simulation
   */
  function startHoldWallSimulation(climbers) {
    let elapsed = 0;
    const updateText = document.querySelector('.spectator-update-text');
    const config = SIMULATION_CONFIG.holdWall;
    
    const messages = [
      'Both competitors gripping the wall tight!',
      'The pressure is mounting...',
      'Who will slip first?',
      'Endurance levels dropping!',
      'One mistake could cost everything!',
      'The wall is getting harder to hold!',
      'Final moments approaching...',
      'This is incredibly intense!'
    ];

    progressInterval = setInterval(() => {
      elapsed++;
      
      climbers.forEach((climber, index) => {
        // Simulate climbing progress with slight randomness
        const currentBottom = parseInt(climber.element.style.bottom) || 20;
        const increment = config.climbIncrement.min + Math.random() * (config.climbIncrement.max - config.climbIncrement.min);
        const newBottom = Math.min(config.maxClimbHeight, currentBottom + increment);
        climber.element.style.bottom = `${newBottom}px`;

        // Deplete endurance meter gradually
        const endurancePercent = Math.max(20, 100 - elapsed * config.enduranceDepletionBase - Math.random() * config.enduranceDepletionRandom);
        climber.meter.style.width = `${endurancePercent}%`;
        
        // Change color as endurance drops
        if (endurancePercent < 40) {
          climber.meter.style.background = 'linear-gradient(90deg, #ef4444 0%, #dc2626 100%)';
          climber.meter.style.boxShadow = '0 0 8px rgba(239, 68, 68, 0.6)';
        } else if (endurancePercent < 70) {
          climber.meter.style.background = 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)';
          climber.meter.style.boxShadow = '0 0 8px rgba(245, 158, 11, 0.6)';
        }
      });

      // Update message
      if (updateText) {
        const msg = messages[elapsed % messages.length];
        updateText.textContent = msg;
        updateText.style.animation = 'none';
        void updateText.offsetWidth;
        updateText.style.animation = 'fadeIn 0.5s ease';
      }

    }, config.updateInterval);
  }

  /**
   * Start Trivia simulation
   */
  function startTriviaSimulation(questionNumber, questionText, competitors) {
    const questions = [
      'Who won the first Head of Household competition?',
      'Which houseguest has the most competition wins this season?',
      'How many votes were needed to evict in Week 3?',
      'Who was the first member of the jury?',
      'Which competition was played during the double eviction?',
      'Who won the Power of Veto in Week 5?',
      'What was the name of the luxury competition in Week 4?',
      'Which houseguest made the most nominations this season?'
    ];

    let currentQuestion = 0;
    let scores = competitors.map(() => 0);
    const updateText = document.querySelector('.spectator-update-text');
    const config = SIMULATION_CONFIG.trivia;

    progressInterval = setInterval(() => {
      currentQuestion++;
      
      if (currentQuestion <= questions.length) {
        // Show new question
        questionNumber.textContent = `Question ${currentQuestion}`;
        questionText.textContent = questions[(currentQuestion - 1) % questions.length];
        
        // Simulate thinking
        competitors.forEach(comp => {
          comp.answerStatus.textContent = 'Thinking...';
          comp.answerStatus.style.color = '#8a9ab8';
          comp.element.style.transform = 'scale(1)';
        });

        setTimeout(() => {
          // Randomly determine who answers correctly
          const correctIndex = Math.floor(Math.random() * competitors.length);
          
          competitors.forEach((comp, index) => {
            if (index === correctIndex) {
              // Correct answer
              scores[index] += config.pointsPerCorrect;
              comp.score.textContent = `${scores[index]} pts`;
              comp.answerStatus.textContent = '✓ Correct!';
              comp.answerStatus.style.color = '#4ade80';
              comp.element.style.transform = 'scale(1.05)';
              comp.element.style.borderColor = '#4ade80';
              
              // Flash animation
              comp.score.style.animation = 'scoreFlash 0.5s ease';
            } else {
              // Wrong answer
              comp.answerStatus.textContent = '✗ Incorrect';
              comp.answerStatus.style.color = '#ef4444';
              comp.element.style.borderColor = '#6b7a99';
            }
          });

          // Update commentary
          if (updateText) {
            const leader = competitors.reduce((prev, curr, idx) => 
              scores[idx] > scores[prev] ? idx : prev, 0);
            const msg = `${competitors[leader].player.name} leading with ${scores[leader]} points!`;
            updateText.textContent = msg;
            updateText.style.animation = 'none';
            void updateText.offsetWidth;
            updateText.style.animation = 'fadeIn 0.5s ease';
          }
        }, 1800);
      }

    }, config.updateInterval);
  }

  /**
   * Start Speed Challenge simulation
   */
  function startSpeedChallengeSimulation(lanes) {
    let elapsed = 0;
    const updateText = document.querySelector('.spectator-update-text');
    const config = SIMULATION_CONFIG.speedChallenge;
    
    const messages = [
      'Lightning-fast reflexes on display!',
      'The pace is relentless!',
      'Who can maintain this speed?',
      'Every second counts!',
      'The pressure is immense!',
      'One competitor pulls ahead!',
      'This is neck and neck!',
      'Final push to the finish!'
    ];

    const scores = lanes.map(() => 0);

    progressInterval = setInterval(() => {
      elapsed++;
      
      lanes.forEach((lane, index) => {
        // Increment score with randomness
        const increment = config.scoreIncrement.min + Math.floor(Math.random() * (config.scoreIncrement.max - config.scoreIncrement.min));
        scores[index] += increment;
        lane.score.textContent = scores[index].toString();
        
        // Update progress bar (cap at 100%, scale score to percentage)
        const progress = Math.min(100, (scores[index] / config.maxScore) * 100);
        lane.progressFill.style.width = `${progress}%`;
        
        // Flash effect on update
        lane.score.style.animation = 'none';
        void lane.score.offsetWidth;
        lane.score.style.animation = 'scoreFlash 0.5s ease';
      });

      // Determine leader
      const leaderIndex = scores.reduce((prev, curr, idx) => 
        curr > scores[prev] ? idx : prev, 0);

      // Update message
      if (updateText) {
        const msg = elapsed % 3 === 0 
          ? messages[elapsed % messages.length]
          : `${lanes[leaderIndex].player.name} in the lead!`;
        updateText.textContent = msg;
        updateText.style.animation = 'none';
        void updateText.offsetWidth;
        updateText.style.animation = 'fadeIn 0.5s ease';
      }

    }, config.updateInterval);
  }

  /**
   * Handle skip button click
   */
  function handleSkip() {
    if (!skipCallback) return;

    const skipBtn = currentView?.querySelector('.spectator-skip-btn');
    if (skipBtn) {
      skipBtn.disabled = true;
      skipBtn.textContent = 'Revealing results...';
    }

    // Show quick reveal sequence
    showRevealSequence(() => {
      cleanup();
      if (skipCallback) skipCallback();
    });

    // Emit event
    if (global.game?.bus) {
      global.game.bus.emit('spectator:part3:skip', { variant: currentVariant });
    }
  }

  /**
   * Show reveal sequence
   */
  function showRevealSequence(callback) {
    if (!currentView) {
      if (callback) callback();
      return;
    }

    const updateText = currentView.querySelector('.spectator-update-text');
    if (!updateText) {
      if (callback) callback();
      return;
    }

    // Dramatic pause
    updateText.textContent = '...';
    updateText.style.animation = 'pulse 0.5s ease 3';

    setTimeout(() => {
      updateText.textContent = '👑 Final HOH will be revealed!';
      updateText.style.color = '#ffdc8b';
      updateText.style.fontWeight = '700';
      updateText.style.fontSize = '1.4rem';

      setTimeout(() => {
        if (callback) callback();
      }, 1500);
    }, 1000);
  }

  /**
   * Show fallback message when competitors are not available
   */
  function showFallbackMessage(onSkip) {
    const view = document.createElement('div');
    view.className = 'spectator-view spectator-part3 spectator-fullscreen';
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
    `;

    const contentWrapper = document.createElement('div');
    contentWrapper.style.cssText = `
      max-width: 600px;
      width: 100%;
      text-align: center;
    `;

    // Title
    const titleEl = document.createElement('h3');
    titleEl.textContent = '🏆 Final 3 Part 3';
    titleEl.style.cssText = `
      font-size: 2rem;
      font-weight: 700;
      color: #ffdc8b;
      margin: 0 0 24px 0;
      text-shadow: 0 2px 12px rgba(255, 220, 139, 0.5);
    `;
    contentWrapper.appendChild(titleEl);

    // Message
    const messageEl = document.createElement('div');
    messageEl.textContent = 'Competition in progress...';
    messageEl.style.cssText = `
      font-size: 1.2rem;
      color: #cedbeb;
      margin-bottom: 32px;
      line-height: 1.6;
    `;
    contentWrapper.appendChild(messageEl);

    // Skip button (if callback provided)
    if (onSkip) {
      const skipBtn = document.createElement('button');
      skipBtn.className = 'btn primary';
      skipBtn.textContent = 'Skip to Results ⏭️';
      skipBtn.style.cssText = `
        padding: 16px 32px;
        font-size: 1.1rem;
        font-weight: 700;
        box-shadow: 0 4px 16px rgba(131,191,255,0.4);
        cursor: pointer;
      `;
      skipBtn.onclick = () => {
        if (currentView) {
          currentView.remove();
          currentView = null;
        }
        if (onSkip) onSkip();
      };
      contentWrapper.appendChild(skipBtn);
    }

    view.appendChild(contentWrapper);
    document.body.appendChild(view);
    currentView = view;
    skipCallback = onSkip;

    // Inject animations
    injectPart3Animations();
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
    currentVariant = null;

    const g = global.game;
    if (g) {
      g.__spectatorMode = false;
    }
  }

  /**
   * Inject Part 3 specific animations
   */
  function injectPart3Animations() {
    if (document.getElementById('spectator-part3-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'spectator-part3-animations';
    style.textContent = `
      @keyframes climbBob {
        0%, 100% {
          transform: translateY(0);
        }
        50% {
          transform: translateY(-5px);
        }
      }
      
      @keyframes stripesScroll {
        0% {
          background-position: 0 0;
        }
        100% {
          background-position: 40px 40px;
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
      
      @keyframes scoreFlash {
        0% {
          transform: scale(1);
          color: #83bfff;
        }
        50% {
          transform: scale(1.2);
          color: #ffdc8b;
        }
        100% {
          transform: scale(1);
          color: #83bfff;
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
  SpectatorViewPart3.show = show;
  SpectatorViewPart3.cleanup = cleanup;
  SpectatorViewPart3.isActive = isActive;

  // Export to global
  global.SpectatorViewPart3 = SpectatorViewPart3;

  // Listen for phase changes to clean up
  if (global.game?.bus) {
    global.game.bus.on('bb:phase:changed', () => {
      if (isActive()) {
        console.info('[SpectatorPart3] Phase changed, cleaning up spectator view');
        cleanup();
      }
    });
  }

})(window);
