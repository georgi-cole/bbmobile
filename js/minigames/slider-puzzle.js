// MODULE: minigames/slider-puzzle.js
// Slider Precision - Set slider to exact target value
// Migrated from legacy minigames.js (marked as retired - not engaging enough)

(function(g){
  'use strict';

  /**
   * Slider Precision minigame
   * Player adjusts a slider to match a target value
   * Score based on accuracy
   * Note: Marked as retired due to low engagement
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
    title.textContent = 'Slider Precision';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Generate random target
    const rng = g.rng || Math.random;
    const target = 10 + Math.floor(rng() * 80); // 10-89
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = `Set slider to ${target}`;
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Slider
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '100';
    slider.value = '50';
    slider.style.cssText = 'width:100%;max-width:350px;margin:20px 0;';
    
    // Value display
    const valueDisplay = document.createElement('div');
    valueDisplay.textContent = '50';
    valueDisplay.style.cssText = 'font-size:2rem;color:#83bfff;margin:10px 0;font-weight:bold;';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit';
    
    // Update display as slider moves
    slider.addEventListener('input', () => {
      valueDisplay.textContent = slider.value;
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      const value = parseInt(slider.value);
      const difference = Math.abs(target - value);
      
      // Calculate raw score: perfect = 100, decreases 5 points per unit difference
      const rawScore = Math.max(0, 100 - (difference * 5));
      const maxScore = 100;
      
      // Determine if player succeeded (legacy threshold for backward compatibility)
      const playerSucceeded = rawScore >= 60;
      
      // Apply new centralized outcome logic in competition mode
      let finalScore = rawScore;
      if(g.GameUtils && g.GameUtils.evaluateOutcome && !debugMode && competitionMode){
        const outcome = g.GameUtils.evaluateOutcome(rawScore, maxScore, {
          usedSkip: false,
          failed: !playerSucceeded,
          cheated: false
        });
        
        finalScore = outcome.finalScore;
        
        // If player succeeded but didn't win, coerce to loss band for consistent UX
        if(rawScore >= 60 && !outcome.didWin && !g.cfg?.debugAlwaysWin){
          finalScore = g.GameUtils.coerceSuccessToLossScore(finalScore);
          console.log('[SliderPuzzle] Win probability applied: success forced to loss, score:', finalScore);
        }
        
        if(outcome.didWin){
          console.log('[SliderPuzzle] Player won! Reasons:', outcome.reasons.join('; '));
        } else {
          console.log('[SliderPuzzle] Player lost. Reasons:', outcome.reasons.join('; '));
        }
      }
      
      submitBtn.disabled = true;
      slider.disabled = true;
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(valueDisplay);
    wrapper.appendChild(slider);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.sliderPuzzle = { render };

})(window);
