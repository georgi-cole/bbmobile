// MODULE: minigames/timing-bar.js
// Timing Bar - Stop the bar near center for high score
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Timing Bar minigame
   * Player must stop a moving bar as close to center as possible (3 attempts)
   * Score is based on accuracy to center position
   * Optional countdown timer limits the time to complete all attempts
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   * @param {boolean} options.timedMode - Enable countdown timer (default: true)
   * @param {number} options.timeLimitMs - Time limit in milliseconds (default: 30000)
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false,
      timedMode = true,
      timeLimitMs = 30000
    } = options;
    
    // Use accessibility and mobile utils if available
    const useAccessibility = !!g.MinigameAccessibility;
    const useMobileUtils = !!g.MinigameMobileUtils;
    const reducedMotion = useAccessibility && g.MinigameAccessibility.prefersReducedMotion();
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    // Apply ARIA for accessibility
    if(useAccessibility){
      g.MinigameAccessibility.applyAria(wrapper, {
        'role': 'region',
        'aria-label': 'Timing Bar minigame',
        'aria-live': 'polite'
      });
    }
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Timing Bar';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    const instructionText = timedMode ? 
      'Stop the bar near center (3 tries, timed!)' : 
      'Stop the bar near center (3 tries)';
    instructions.textContent = instructionText;
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;line-height:1.5;';
    
    // Bar container
    const wrap = document.createElement('div');
    wrap.style.cssText = 'width:100%;max-width:400px;height:30px;background:#1d2734;border:2px solid #2c3a4d;border-radius:10px;overflow:hidden;position:relative;margin:10px 0;';
    
    // Moving bar
    const bar = document.createElement('div');
    bar.style.cssText = 'position:absolute;top:0;left:0;height:100%;width:12%;background:linear-gradient(90deg,#6fd3ff,#167bb4);box-shadow:0 0 8px -2px #6fd3ff;transition:background 0.2s;';
    
    // Center marker
    const mid = document.createElement('div');
    mid.style.cssText = 'position:absolute;left:50%;top:0;transform:translateX(-50%);width:3px;height:100%;background:#fff6;';
    
    wrap.appendChild(bar);
    wrap.appendChild(mid);
    
    // Controls
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display:flex;gap:10px;margin:10px 0;';
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn';
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = true;
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    controlsDiv.appendChild(startBtn);
    controlsDiv.appendChild(stopBtn);
    controlsDiv.appendChild(submitBtn);
    
    // Status display
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.9rem;color:#83bfff;min-height:25px;text-align:center;';
    status.textContent = 'Attempts: 0/3';
    
    // Game state
    let running = false;
    let direction = 1;
    let position = 0;
    let rafId = null;
    let attempts = 0;
    let bestScore = 0;
    
    // Timer container (if timed mode) - must be after game state variables
    let gameTimer = null;
    let timerContainer = null;
    if(timedMode && g.GameTimer){
      timerContainer = document.createElement('div');
      timerContainer.style.cssText = 'margin:8px 0;';
      
      // Create GameTimer instance
      gameTimer = new g.GameTimer('logic', {
        duration: timeLimitMs,
        countDirection: 'down'
      });
      
      // Handle timer completion
      gameTimer.onComplete(() => {
        // Time's up - force submit with current best score
        console.log('[TimingBar] Time expired, auto-submitting');
        
        // Stop any running animation
        running = false;
        if(rafId) cancelAnimationFrame(rafId);
        
        // Disable all buttons
        startBtn.disabled = true;
        stopBtn.disabled = true;
        submitBtn.disabled = true;
        
        // Calculate final score
        const rng = g.rng || Math.random;
        const rawScore = (bestScore * 100) + rng() * 4;
        const finalScore = g.MinigameScoring ? 
          g.MinigameScoring.calculateFinalScore({
            rawScore: rawScore,
            minScore: 0,
            maxScore: 100,
            compBeast: 0.5
          }) :
          rawScore * 10;
        
        console.log(`[TimingBar] Time expired - Best score: ${bestScore.toFixed(2)}, Final score: ${Math.round(finalScore)}`);
        
        if(useAccessibility){
          g.MinigameAccessibility.announceToSR('Time expired! Submitting score', 'assertive');
        }
        
        // Brief delay before completing
        setTimeout(() => {
          onComplete(finalScore);
        }, 500);
      });
      
      // Render timer UI
      gameTimer.render(timerContainer);
    }
    
    // Animation frame function
    function frame(){
      if(!running) return;
      
      // Adjust speed for reduced motion
      const speed = reducedMotion ? 0.008 : 0.0135;
      position += direction * speed;
      
      // Bounce at edges
      if(position >= 0.93){
        position = 0.93;
        direction = -1;
      }
      if(position <= 0){
        position = 0;
        direction = 1;
      }
      
      bar.style.left = (position * 100) + '%';
      rafId = requestAnimationFrame(frame);
    }
    
    // Apply accessibility to buttons
    if(useAccessibility){
      g.MinigameAccessibility.makeAccessibleButton(startBtn, { label: 'Start timing bar' });
      g.MinigameAccessibility.makeAccessibleButton(stopBtn, { label: 'Stop timing bar', disabled: true });
      g.MinigameAccessibility.makeAccessibleButton(submitBtn, { label: 'Submit score', disabled: true });
    }
    
    // Start button handler
    const startHandler = () => {
      if(attempts >= 3) return;
      
      // Start timer on first attempt
      if(gameTimer && attempts === 0 && !gameTimer.isRunning){
        gameTimer.start();
        console.log('[TimingBar] Game timer started');
      }
      
      startBtn.disabled = true;
      stopBtn.disabled = false;
      running = true;
      direction = 1;
      position = 0;
      
      // Announce to screen readers
      if(useAccessibility){
        g.MinigameAccessibility.announceToSR(`Attempt ${attempts + 1} started`, 'polite');
      }
      
      // Haptic feedback
      if(useMobileUtils){
        g.MinigameMobileUtils.vibrate(30);
      }
      
      if(rafId) cancelAnimationFrame(rafId);
      frame();
    };
    
    if(useMobileUtils){
      g.MinigameMobileUtils.addTapListener(startBtn, startHandler);
    } else {
      startBtn.addEventListener('click', startHandler);
    }
    
    // Stop button handler
    const stopHandler = () => {
      running = false;
      if(rafId) cancelAnimationFrame(rafId);
      
      startBtn.disabled = false;
      stopBtn.disabled = true;
      attempts++;
      
      // Calculate distance from center (0.5)
      // Bar is 12% wide, so add 6% to position for center of bar
      const barCenter = position + 0.06;
      const distanceFromCenter = Math.abs(barCenter - 0.5);
      
      // Convert to score (0-1, closer to center = higher)
      const attemptScore = Math.max(0, 1 - distanceFromCenter * 2.1);
      
      if(attemptScore > bestScore){
        bestScore = attemptScore;
      }
      
      const scorePercent = (bestScore * 100).toFixed(1);
      status.textContent = `Attempts: ${attempts}/3 | Best: ${scorePercent}%`;
      status.setAttribute('aria-label', `Attempts: ${attempts} of 3. Best score: ${scorePercent} percent`);
      
      // Announce result to screen readers
      if(useAccessibility){
        const quality = attemptScore > 0.9 ? 'Excellent' : attemptScore > 0.7 ? 'Good' : 'Fair';
        g.MinigameAccessibility.announceToSR(`${quality}! ${scorePercent}% accuracy`, 'polite');
      }
      
      // Haptic feedback based on accuracy
      if(useMobileUtils){
        if(attemptScore > 0.9){
          g.MinigameMobileUtils.vibrate([50, 30, 50]);
        } else {
          g.MinigameMobileUtils.vibrate(50);
        }
      }
      
      // Enable submit after 3 attempts
      if(attempts >= 3){
        startBtn.disabled = true;
        submitBtn.disabled = false;
        
        if(useAccessibility){
          submitBtn.setAttribute('aria-disabled', 'false');
          g.MinigameAccessibility.announceToSR('All attempts complete. Press submit to finish', 'polite');
        }
      }
    };
    
    if(useMobileUtils){
      g.MinigameMobileUtils.addTapListener(stopBtn, stopHandler);
    } else {
      stopBtn.addEventListener('click', stopHandler);
    }
    
    // Submit button handler
    const submitHandler = () => {
      submitBtn.disabled = true;
      
      // Stop game timer if running
      if(gameTimer){
        gameTimer.stop();
        gameTimer.destroy();
      }
      
      // Calculate raw score: 0-100 based on best attempt
      // Add small random variance for variety
      const rng = g.rng || Math.random;
      const rawScore = (bestScore * 100) + rng() * 4;
      
      // Use centralized scoring system (SCALE=1000)
      const finalScore = g.MinigameScoring ? 
        g.MinigameScoring.calculateFinalScore({
          rawScore: rawScore,
          minScore: 0,
          maxScore: 100,
          compBeast: 0.5
        }) :
        rawScore * 10; // Fallback: scale to 0-1000
      
      console.log(`[TimingBar] Best score: ${bestScore.toFixed(2)}, Raw score: ${rawScore.toFixed(1)}, Final score: ${Math.round(finalScore)}`);
      
      // Announce completion
      if(useAccessibility){
        g.MinigameAccessibility.announceToSR(`Final score: ${Math.round(finalScore)}`, 'assertive');
      }
      
      // Haptic feedback
      if(useMobileUtils){
        g.MinigameMobileUtils.vibrate([100, 50, 100]);
      }
      
      onComplete(finalScore);
    };
    
    if(useMobileUtils){
      g.MinigameMobileUtils.addTapListener(submitBtn, submitHandler);
    } else {
      submitBtn.addEventListener('click', submitHandler);
    }
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    if(timerContainer){
      wrapper.appendChild(timerContainer);
    }
    wrapper.appendChild(wrap);
    wrapper.appendChild(controlsDiv);
    wrapper.appendChild(status);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.timingBar = { render };

})(window);
