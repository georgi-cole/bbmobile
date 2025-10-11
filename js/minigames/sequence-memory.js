// MODULE: minigames/sequence-memory.js
// Sequence Memory - Remember and repeat number sequences
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Sequence Memory minigame
   * Player memorizes a number sequence, then types it back
   * Score based on accuracy of reproduction
   * Mobile-friendly
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
    title.textContent = 'Number Sequence';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Memorize the number sequence';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Generate random sequence
    const rng = g.rng || Math.random;
    const length = 6 + Math.floor(rng() * 3); // 6-8 digits
    let sequence = '';
    for(let i = 0; i < length; i++){
      sequence += Math.floor(rng() * 10);
    }
    
    // Display area
    const displayDiv = document.createElement('div');
    displayDiv.textContent = sequence;
    displayDiv.style.cssText = 'font-size:2rem;letter-spacing:8px;color:#83bfff;margin:15px 0;min-height:50px;font-family:monospace;';
    
    // Hide button
    const hideBtn = document.createElement('button');
    hideBtn.className = 'btn';
    hideBtn.textContent = 'Hide Sequence';
    
    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Enter sequence';
    input.maxLength = length + 2;
    input.style.cssText = 'width:200px;padding:10px;font-size:1.2rem;text-align:center;letter-spacing:4px;background:#1d2734;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:5px;font-family:monospace;';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    // Hide button handler
    hideBtn.addEventListener('click', () => {
      displayDiv.textContent = '(hidden)';
      displayDiv.style.color = '#555';
      submitBtn.disabled = false;
      hideBtn.disabled = true;
      setTimeout(() => input.focus(), 100);
    });
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
      if(e.key === 'Enter' && !submitBtn.disabled){
        submitBtn.click();
      }
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      const answer = input.value.trim();
      let score = 0;
      
      // Check each digit
      for(let i = 0; i < Math.min(answer.length, sequence.length); i++){
        if(answer[i] === sequence[i]){
          score += 3;
        }
      }
      
      // Bonus for perfect match
      if(answer === sequence){
        score += 20;
      }
      
      submitBtn.disabled = true;
      input.disabled = true;
      
      // Determine if player succeeded
      const playerSucceeded = score >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = score;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[SequenceMemory] Win probability applied: success forced to loss');
        }
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(hideBtn);
    wrapper.appendChild(input);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.sequenceMemory = { render };

})(window);
