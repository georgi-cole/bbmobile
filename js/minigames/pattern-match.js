// MODULE: minigames/pattern-match.js
// Pattern Match - Memorize and match a pattern of shapes
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Pattern Match minigame
   * Player memorizes a sequence of shapes, then matches them using dropdowns
   * Score based on number of correct matches
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Pattern Match';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Match the pattern sequence';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Shape options
    const shapes = ['▲', '■', '●', '◆', '★', '✚'];
    
    // Generate random sequence
    const rng = g.rng || Math.random;
    const length = 5;
    const sequence = [];
    for(let i = 0; i < length; i++){
      sequence.push(shapes[Math.floor(rng() * shapes.length)]);
    }
    
    // Display area for sequence
    const displayDiv = document.createElement('div');
    displayDiv.style.cssText = 'font-size:2rem;margin:10px 0;min-height:50px;display:flex;gap:10px;justify-content:center;align-items:center;';
    displayDiv.textContent = sequence.join(' ');
    
    // Hide button
    const hideBtn = document.createElement('button');
    hideBtn.className = 'btn';
    hideBtn.textContent = 'Hide Pattern';
    
    // Input area with dropdowns
    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;justify-content:center;';
    
    const selects = [];
    for(let i = 0; i < length; i++){
      const select = document.createElement('select');
      select.style.cssText = 'font-size:1.5rem;padding:5px;background:#1d2734;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:5px;';
      
      // Add options
      shapes.forEach(shape => {
        const option = document.createElement('option');
        option.textContent = shape;
        option.value = shape;
        select.appendChild(option);
      });
      
      selects.push(select);
      inputDiv.appendChild(select);
    }
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    // Hide button handler
    hideBtn.addEventListener('click', () => {
      displayDiv.textContent = '(hidden)';
      displayDiv.style.color = '#555';
      submitBtn.disabled = false;
      hideBtn.disabled = true;
    });
    
    // Submit button handler
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      
      // Calculate score based on correct matches
      let correctCount = 0;
      selects.forEach((select, index) => {
        if(select.value === sequence[index]){
          correctCount++;
        }
      });
      
      // Each correct match is worth 20 points (5 matches = 100 max)
      const score = correctCount * 20;
      
      onComplete(score);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(hideBtn);
    wrapper.appendChild(inputDiv);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.patternMatch = { render };

})(window);
