// MODULE: minigames/memory-match.js
// Memory Match - Memorize and repeat color sequence
// Enhanced with: randomized sequences, timed reveal, difficulty scaling, anti-cheat, win probability

(function(g){
  'use strict';

  /**
   * Memory Match minigame
   * Player watches a sequence of colored blocks, then repeats it
   * Score based on correct sequence reproduction and length
   * Mobile-friendly with tap support
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
      { patternLength: 6, revealDuration: 3000, allowedMistakes: 1 };
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Anti-cheat wrapper (if in competition mode)
    let antiCheat = null;
    if(competitionMode && g.AntiCheatWrapper){
      antiCheat = g.AntiCheatWrapper.createWrapper(container, {
        onCheatDetected: (event) => {
          console.warn('[MemoryMatch] Cheat detected:', event);
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
    title.textContent = debugMode ? 'Memory Colors (DEBUG MODE)' : 'Memory Colors';
    title.style.cssText = `margin:0;font-size:1.2rem;color:${debugMode ? '#f2ce7b' : '#e3ecf5'};`;
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Press Start to begin. Watch the sequence, then repeat it';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Debug info
    if(debugMode){
      const debugInfo = document.createElement('div');
      debugInfo.style.cssText = 'padding:8px;background:rgba(242,206,123,0.1);border:1px solid rgba(242,206,123,0.3);border-radius:4px;font-size:0.8rem;color:#f2ce7b;text-align:center;';
      debugInfo.textContent = `Debug: ${difficulty} difficulty, ${diffSettings.patternLength} colors, ${diffSettings.revealDuration}ms reveal`;
      wrapper.appendChild(debugInfo);
    }
    
    // Color palette
    const colors = ['#ff6b6b', '#6fd3ff', '#74e48b', '#f7b955', '#b074ff', '#ff9cf1', '#9bdc82'];
    
    // Game state
    let sequence = null;
    let sequenceIndex = 0;
    let inputIndex = 0;
    let acceptingInput = false;
    let correctMatches = 0;
    let gameStarted = false;
    let sequenceDiv = null;
    let protectCleanup = null;
    
    // Status display
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.9rem;color:#83bfff;min-height:25px;text-align:center;font-weight:bold;';
    status.textContent = 'Press Start to begin';
    
    // Sequence display area (created dynamically after Start)
    const sequenceContainer = document.createElement('div');
    sequenceContainer.style.cssText = 'min-height:60px;display:flex;align-items:center;justify-content:center;';
    
    // Color buttons for input
    const buttonDiv = document.createElement('div');
    buttonDiv.style.cssText = 'display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;justify-content:center;';
    buttonDiv.innerHTML = '<div style="color:#95a9c0;font-size:0.9rem;">Press Start to begin</div>';
    
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
        g.GameUtils.generateRandomSequence(colors, diffSettings.patternLength) :
        Array.from({ length: diffSettings.patternLength }, () => colors[Math.floor(rng() * colors.length)]);
      
      console.log('[MemoryMatch] Sequence generated:', sequence.length, 'colors');
    }
    
    /**
     * Create sequence display boxes
     */
    function createSequenceDisplay(){
      sequenceDiv = document.createElement('div');
      sequenceDiv.style.cssText = 'display:flex;gap:8px;margin:10px 0;';
      
      // Apply anti-copy protection
      if(competitionMode && g.AntiCheatWrapper){
        protectCleanup = g.AntiCheatWrapper.protectElement(sequenceDiv);
      }
      
      // Create boxes for sequence
      sequence.forEach(() => {
        const box = document.createElement('div');
        box.style.cssText = `width:40px;height:40px;border-radius:8px;background:#2c3a4d;opacity:0.25;border:2px solid #2c3a4d;`;
        sequenceDiv.appendChild(box);
      });
      
      sequenceContainer.innerHTML = '';
      sequenceContainer.appendChild(sequenceDiv);
    }
    
    /**
     * Show sequence animation with timed reveal
     */
    function showSequence(){
      if(!sequence) return;
      
      startBtn.disabled = true;
      status.textContent = 'Watch carefully...';
      sequenceIndex = 0;
      inputIndex = 0;
      correctMatches = 0;
      acceptingInput = false;
      
      // Start anti-cheat monitoring
      if(antiCheat){
        antiCheat.startMonitoring();
      }
      
      const boxes = Array.from(sequenceDiv.children);
      const interval = 650;
      
      function showNext(){
        // Reset all boxes
        boxes.forEach(b => {
          b.style.opacity = '0.25';
          b.style.background = '#2c3a4d';
        });
        
        if(sequenceIndex >= sequence.length){
          // Auto-hide after reveal duration
          setTimeout(() => {
            hideSequence();
          }, diffSettings.revealDuration);
          return;
        }
        
        // Highlight current box with actual color
        boxes[sequenceIndex].style.opacity = '1';
        boxes[sequenceIndex].style.background = sequence[sequenceIndex];
        sequenceIndex++;
        
        setTimeout(showNext, interval);
      }
      
      showNext();
    }
    
    /**
     * Hide sequence and enable input (ephemeral clearing)
     */
    function hideSequence(){
      const boxes = Array.from(sequenceDiv.children);
      boxes.forEach(box => {
        box.style.opacity = '0.25';
        box.style.background = '#2c3a4d';
        // Clear any visual traces
        box.textContent = '';
      });
      
      acceptingInput = true;
      status.textContent = 'Now repeat the sequence!';
      submitBtn.style.display = 'inline-block';
      
      // Enable color buttons
      createColorButtons();
    }
    
    /**
     * Create color input buttons
     */
    function createColorButtons(){
      buttonDiv.innerHTML = '';
      
      colors.forEach(color => {
        const btn = document.createElement('button');
        btn.style.cssText = `width:40px;height:40px;border-radius:8px;background:${color};border:2px solid #2c3a4d;cursor:pointer;transition:transform 0.1s;`;
        btn.addEventListener('mousedown', () => {
          btn.style.transform = 'scale(0.9)';
        });
        btn.addEventListener('mouseup', () => {
          btn.style.transform = 'scale(1)';
        });
        btn.addEventListener('click', () => pickColor(color));
        buttonDiv.appendChild(btn);
      });
    }
    
    /**
     * Handle color button click
     */
    function pickColor(color){
      if(!acceptingInput) return;
      
      if(color === sequence[inputIndex]){
        correctMatches++;
        inputIndex++;
        
        // Visual feedback - highlight the sequence box
        const boxes = Array.from(sequenceDiv.children);
        if(boxes[inputIndex - 1]){
          boxes[inputIndex - 1].style.opacity = '1';
          boxes[inputIndex - 1].style.background = color;
        }
        
        if(inputIndex === sequence.length){
          // Sequence complete!
          acceptingInput = false;
          status.textContent = '✅ Perfect match!';
          status.style.color = '#22c55e';
          submitBtn.disabled = false;
          
          // Stop anti-cheat monitoring
          if(antiCheat){
            antiCheat.stopMonitoring();
          }
        }
      } else {
        // Wrong color - but allow continuing up to allowed mistakes
        const mistakesMade = inputIndex - correctMatches + 1;
        
        if(mistakesMade >= diffSettings.allowedMistakes){
          acceptingInput = false;
          status.textContent = `❌ Mistakes exceeded! (${mistakesMade})`;
          status.style.color = '#dc2626';
          submitBtn.disabled = false;
          
          // Stop anti-cheat monitoring
          if(antiCheat){
            antiCheat.stopMonitoring();
          }
        } else {
          status.textContent = `Mistake ${mistakesMade}/${diffSettings.allowedMistakes} - Keep going!`;
          status.style.color = '#f59e0b';
        }
        
        inputIndex++;
      }
    }
    
    /**
     * Start button handler - generate sequence on press
     */
    startBtn.addEventListener('click', () => {
      if(!gameStarted){
        gameStarted = true;
        generateSequence();
        createSequenceDisplay();
        showSequence();
        startBtn.style.display = 'none';
      }
    });
    
    /**
     * Submit button handler with win probability logic
     */
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      acceptingInput = false;
      
      // Cleanup anti-copy protection
      if(protectCleanup){
        protectCleanup();
      }
      
      // Cleanup anti-cheat
      if(antiCheat){
        antiCheat.cleanup();
      }
      
      // Calculate raw score
      const accuracy = correctMatches / sequence.length;
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
          console.log('[MemoryMatch] Win probability applied: success forced to loss');
        }
      }
      
      if(debugMode){
        console.log('[MemoryMatch] Debug - Raw score:', rawScore, 'Accuracy:', accuracy.toFixed(2));
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(sequenceContainer);
    wrapper.appendChild(status);
    wrapper.appendChild(startBtn);
    wrapper.appendChild(buttonDiv);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.memoryMatch = { render };

})(window);
