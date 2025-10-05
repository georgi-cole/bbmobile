// MODULE: minigames/memory-match.js
// Memory Match - Memorize and repeat color sequence
// Migrated from legacy minigames.js

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
   */
  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Memory Colors';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Watch the sequence, then repeat it';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Color palette
    const colors = ['#ff6b6b', '#6fd3ff', '#74e48b', '#f7b955', '#b074ff', '#ff9cf1', '#9bdc82'];
    
    // Generate random sequence
    const rng = g.rng || Math.random;
    const length = 4 + Math.floor(rng() * 3); // 4-6 colors
    const sequence = [];
    for(let i = 0; i < length; i++){
      sequence.push(colors[Math.floor(rng() * colors.length)]);
    }
    
    // Sequence display area
    const sequenceDiv = document.createElement('div');
    sequenceDiv.style.cssText = 'display:flex;gap:8px;margin:10px 0;';
    
    // Create sequence boxes
    sequence.forEach(color => {
      const box = document.createElement('div');
      box.style.cssText = `width:40px;height:40px;border-radius:8px;background:${color};opacity:0.25;border:2px solid #2c3a4d;`;
      sequenceDiv.appendChild(box);
    });
    
    // Color buttons for input
    const buttonDiv = document.createElement('div');
    buttonDiv.style.cssText = 'display:flex;gap:8px;margin:10px 0;flex-wrap:wrap;justify-content:center;';
    
    // Game state
    let sequenceIndex = 0;
    let inputIndex = 0;
    let acceptingInput = false;
    let correctMatches = 0;
    
    // Status display
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.9rem;color:#83bfff;min-height:25px;text-align:center;';
    status.textContent = 'Press Start to begin';
    
    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    // Show sequence animation
    function showSequence(){
      startBtn.disabled = true;
      status.textContent = 'Watch the sequence...';
      sequenceIndex = 0;
      inputIndex = 0;
      correctMatches = 0;
      acceptingInput = false;
      
      const boxes = Array.from(sequenceDiv.children);
      
      function showNext(){
        // Reset all boxes
        boxes.forEach(b => b.style.opacity = '0.25');
        
        if(sequenceIndex >= sequence.length){
          acceptingInput = true;
          status.textContent = 'Repeat the sequence now!';
          return;
        }
        
        // Highlight current box
        boxes[sequenceIndex].style.opacity = '1';
        sequenceIndex++;
        
        setTimeout(showNext, 650);
      }
      
      showNext();
    }
    
    // Handle color button click
    function pickColor(color){
      if(!acceptingInput) return;
      
      if(color === sequence[inputIndex]){
        correctMatches++;
        inputIndex++;
        
        if(inputIndex === sequence.length){
          // Sequence complete!
          acceptingInput = false;
          status.textContent = 'Perfect match!';
          submitBtn.disabled = false;
        }
      } else {
        // Wrong color
        acceptingInput = false;
        status.textContent = 'Mistake! Submit your score.';
        submitBtn.disabled = false;
      }
    }
    
    // Create color buttons
    colors.forEach(color => {
      const btn = document.createElement('button');
      btn.style.cssText = `width:40px;height:40px;border-radius:8px;background:${color};border:2px solid #2c3a4d;cursor:pointer;`;
      btn.addEventListener('click', () => pickColor(color));
      buttonDiv.appendChild(btn);
    });
    
    // Start button handler
    startBtn.addEventListener('click', showSequence);
    
    // Submit button handler
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      
      // Score: base on correct matches, plus bonus for length
      const score = (correctMatches * 4) + (inputIndex / sequence.length) * 10 + rng() * 2;
      
      onComplete(score);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(sequenceDiv);
    wrapper.appendChild(startBtn);
    wrapper.appendChild(buttonDiv);
    wrapper.appendChild(status);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.memoryMatch = { render };

})(window);
