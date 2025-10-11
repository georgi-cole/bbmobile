// MODULE: minigames/path-finder.js
// Path Finder - Memorize and repeat a directional path
// Migrated from legacy minigames.js (marked as retired for keyboard dependency)

(function(g){
  'use strict';

  /**
   * Path Finder minigame
   * Player memorizes a sequence of directional arrows, then inputs them
   * Score based on correct sequence matching
   * Note: Marked as retired due to keyboard-only interaction (not mobile-friendly)
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Path Finder';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Memorize the path, then click the arrows in order';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Direction options
    const directions = ['↑', '→', '↓', '←'];
    
    // Generate random sequence
    const length = 6;
    const sequence = [];
    for(let i = 0; i < length; i++){
      sequence.push(directions[Math.floor(Math.random() * 4)]);
    }
    
    // Display area
    const displayDiv = document.createElement('div');
    displayDiv.textContent = sequence.join(' ');
    displayDiv.style.cssText = 'font-size:2.5rem;margin:15px 0;letter-spacing:10px;color:#83bfff;min-height:60px;';
    
    // Hide button
    const hideBtn = document.createElement('button');
    hideBtn.className = 'btn';
    hideBtn.textContent = 'Hide Path';
    
    // Input buttons
    const buttonDiv = document.createElement('div');
    buttonDiv.style.cssText = 'display:flex;gap:10px;margin:15px 0;';
    
    const picks = [];
    const inputButtons = [];
    
    directions.forEach(dir => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = dir;
      btn.style.cssText = 'font-size:1.8rem;padding:15px 20px;min-width:60px;';
      
      btn.addEventListener('click', () => {
        picks.push(dir);
        // Visual feedback
        btn.style.background = '#2c5aa0';
        setTimeout(() => {
          btn.style.background = '';
        }, 200);
      });
      
      inputButtons.push(btn);
      buttonDiv.appendChild(btn);
    });
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    // Status display
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:25px;';
    status.textContent = 'Watch the path...';
    
    // Hide button handler
    hideBtn.addEventListener('click', () => {
      displayDiv.textContent = '(hidden)';
      displayDiv.style.color = '#555';
      submitBtn.disabled = false;
      hideBtn.disabled = true;
      status.textContent = 'Click the arrows in order, then submit';
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      inputButtons.forEach(btn => btn.disabled = true);
      
      // Calculate raw score based on correct matches
      let rawScore = 0;
      for(let i = 0; i < length; i++){
        if(picks[i] === sequence[i]){
          rawScore += 16; // Each correct = ~16 points (6 * 16 ≈ 96, rounded to 100 max)
        }
      }
      
      // Cap at 100
      rawScore = Math.min(100, rawScore);
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[PathFinder] Win probability applied: success forced to loss');
        }
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(hideBtn);
    wrapper.appendChild(buttonDiv);
    wrapper.appendChild(status);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.pathFinder = { render };

})(window);
