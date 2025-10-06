// MODULE: minigames/pattern-match.js
// Pattern Match - Memorize and match a pattern of shapes
// Enhanced with: randomized patterns, timed reveal, difficulty scaling, anti-cheat, win probability

(function(g){
  'use strict';

  /**
   * Pattern Match minigame
   * Player memorizes a sequence of shapes, then matches them
   * Score based on number of correct matches
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   *   - debugMode: boolean - If true, bypass win probability bias
   *   - difficulty: string - 'easy', 'medium', or 'hard'
   *   - competitionMode: boolean - If true, enable anti-cheat measures
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      difficulty = 'medium',
      competitionMode = false
    } = options;
    
    // Get difficulty settings
    const diffSettings = g.GameUtils ? 
      g.GameUtils.getDifficultySettings(difficulty) : 
      { patternLength: 6, revealDuration: 3000 };
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Anti-cheat wrapper (if in competition mode)
    let antiCheat = null;
    if(competitionMode && g.AntiCheatWrapper){
      antiCheat = g.AntiCheatWrapper.createWrapper(container, {
        onCheatDetected: (event) => {
          console.warn('[PatternMatch] Cheat detected:', event);
          // Auto-fail on cheat
          if(onComplete){
            onComplete(0);
          }
        },
        competitionMode: true,
        strictMode: true,
        showWarning: true
      });
    }
    
    // Title
    const title = document.createElement('h3');
    title.textContent = debugMode ? 'Pattern Match (DEBUG MODE)' : 'Pattern Match';
    title.style.cssText = `margin:0;font-size:1.2rem;color:${debugMode ? '#f2ce7b' : '#e3ecf5'};`;
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Press Start to see pattern. Memorize it before time runs out!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Debug info
    if(debugMode){
      const debugInfo = document.createElement('div');
      debugInfo.style.cssText = 'padding:8px;background:rgba(242,206,123,0.1);border:1px solid rgba(242,206,123,0.3);border-radius:4px;font-size:0.8rem;color:#f2ce7b;text-align:center;';
      debugInfo.textContent = `Debug: ${difficulty} difficulty, ${diffSettings.patternLength} shapes, ${diffSettings.revealDuration}ms reveal`;
      wrapper.appendChild(debugInfo);
    }
    
    // Shape options
    const shapes = ['▲', '■', '●', '◆', '★', '✚', '♦', '▼'];
    
    // Game state
    let sequence = null;
    let gameStarted = false;
    let protectCleanup = null;
    let revealTimeout = null;
    
    // Display area for sequence
    const displayDiv = document.createElement('div');
    displayDiv.style.cssText = 'font-size:2rem;margin:20px 0;min-height:60px;display:flex;gap:10px;justify-content:center;align-items:center;padding:15px;background:rgba(13,21,31,0.5);border-radius:8px;border:2px solid #2c3a4d;';
    displayDiv.textContent = 'Press Start to begin';
    
    // Timer display
    const timerDiv = document.createElement('div');
    timerDiv.style.cssText = 'font-size:1.2rem;color:#83bfff;font-weight:bold;min-height:30px;';
    timerDiv.textContent = '';
    
    // Input area with dropdowns
    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'display:none;gap:8px;margin:20px 0;flex-wrap:wrap;justify-content:center;';
    
    const selects = [];
    
    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    submitBtn.style.display = 'none';
    
    /**
     * Generate sequence ONLY after Start is pressed (anti-cheat measure)
     */
    function generateSequence(){
      const rng = g.rng || Math.random;
      sequence = g.GameUtils ? 
        g.GameUtils.generateRandomSequence(shapes, diffSettings.patternLength) :
        Array.from({ length: diffSettings.patternLength }, () => shapes[Math.floor(rng() * shapes.length)]);
      
      console.log('[PatternMatch] Sequence generated:', sequence.length, 'shapes');
    }
    
    /**
     * Create input dropdowns
     */
    function createInputDropdowns(){
      inputDiv.innerHTML = '';
      selects.length = 0;
      
      for(let i = 0; i < sequence.length; i++){
        const select = document.createElement('select');
        select.style.cssText = 'font-size:1.5rem;padding:8px;background:#1d2734;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:5px;cursor:pointer;';
        
        // Add blank option first
        const blankOpt = document.createElement('option');
        blankOpt.textContent = '?';
        blankOpt.value = '';
        select.appendChild(blankOpt);
        
        // Add shape options
        shapes.forEach(shape => {
          const option = document.createElement('option');
          option.textContent = shape;
          option.value = shape;
          select.appendChild(option);
        });
        
        selects.push(select);
        inputDiv.appendChild(select);
      }
    }
    
    /**
     * Show sequence with timed reveal
     */
    function showSequence(){
      displayDiv.textContent = sequence.join(' ');
      displayDiv.style.color = '#e3ecf5';
      displayDiv.style.fontSize = '2rem';
      
      // Apply anti-copy protection
      if(competitionMode && g.AntiCheatWrapper){
        protectCleanup = g.AntiCheatWrapper.protectElement(displayDiv);
      }
      
      // Start anti-cheat monitoring
      if(antiCheat){
        antiCheat.startMonitoring();
      }
      
      // Countdown timer
      const startTime = Date.now();
      const endTime = startTime + diffSettings.revealDuration;
      
      function updateTimer(){
        const remaining = Math.max(0, endTime - Date.now());
        const seconds = (remaining / 1000).toFixed(1);
        timerDiv.textContent = `Time remaining: ${seconds}s`;
        timerDiv.style.color = remaining < 1000 ? '#dc2626' : '#83bfff';
        
        if(remaining > 0){
          requestAnimationFrame(updateTimer);
        } else {
          hideSequence();
        }
      }
      
      updateTimer();
    }
    
    /**
     * Hide sequence and enable input (ephemeral clearing)
     */
    function hideSequence(){
      displayDiv.textContent = '(hidden)';
      displayDiv.style.color = '#555';
      displayDiv.style.fontSize = '1.2rem';
      timerDiv.textContent = 'Now match the pattern!';
      timerDiv.style.color = '#22c55e';
      
      // Cleanup anti-copy protection for display
      if(protectCleanup){
        protectCleanup();
      }
      
      // Show input area
      inputDiv.style.display = 'flex';
      submitBtn.style.display = 'inline-block';
      submitBtn.disabled = false;
    }
    
    /**
     * Start button handler - generate sequence on press
     */
    startBtn.addEventListener('click', () => {
      if(!gameStarted){
        gameStarted = true;
        generateSequence();
        createInputDropdowns();
        showSequence();
        startBtn.style.display = 'none';
      }
    });
    
    /**
     * Submit button handler with win probability logic
     */
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      
      // Stop anti-cheat monitoring
      if(antiCheat){
        antiCheat.stopMonitoring();
        antiCheat.cleanup();
      }
      
      // Calculate score based on correct matches
      let correctCount = 0;
      selects.forEach((select, index) => {
        if(select.value === sequence[index]){
          correctCount++;
        }
      });
      
      // Calculate raw score
      const accuracy = correctCount / sequence.length;
      const rawScore = Math.round(accuracy * 100);
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[PatternMatch] Win probability applied: success forced to loss');
        }
      }
      
      if(debugMode){
        console.log('[PatternMatch] Debug - Correct:', correctCount, '/', sequence.length, 'Raw score:', rawScore);
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(startBtn);
    wrapper.appendChild(inputDiv);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.patternMatch = { render };

})(window);

