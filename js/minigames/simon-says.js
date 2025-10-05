// MODULE: minigames/simon-says.js
// Simon Says - Remember and repeat arrow key sequence
// Migrated from legacy minigames.js (marked as retired for keyboard dependency)

(function(g){
  'use strict';

  /**
   * Simon Says minigame
   * Player memorizes arrow sequence, then presses keys in order
   * Score based on correct sequence completion
   * Note: Marked as retired due to keyboard-only interaction (not mobile-friendly)
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
    title.textContent = 'Simon Says';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Press the arrow key sequence';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Arrow directions
    const dirs = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
    const map = {
      ArrowUp: '↑',
      ArrowRight: '→',
      ArrowDown: '↓',
      ArrowLeft: '←'
    };
    
    // Generate random sequence
    const length = 6;
    const sequence = [];
    for(let i = 0; i < length; i++){
      sequence.push(dirs[Math.floor(Math.random() * 4)]);
    }
    
    // Display sequence
    const displayDiv = document.createElement('div');
    displayDiv.textContent = sequence.map(d => map[d]).join(' ');
    displayDiv.style.cssText = 'font-size:2.5rem;margin:15px 0;letter-spacing:10px;color:#83bfff;';
    
    // Hide button
    const hideBtn = document.createElement('button');
    hideBtn.className = 'btn';
    hideBtn.textContent = 'Hide & Start';
    
    // Status display
    const status = document.createElement('div');
    status.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:30px;text-align:center;';
    status.textContent = 'Memorize the sequence...';
    
    // Game state
    let currentIndex = 0;
    let gameActive = false;
    
    // Keyboard handler
    function handleKey(event){
      if(!gameActive) return;
      
      const key = event.key;
      
      if(key === sequence[currentIndex]){
        currentIndex++;
        status.textContent = `Correct! (${currentIndex}/${length})`;
        
        if(currentIndex === length){
          // Complete!
          gameActive = false;
          window.removeEventListener('keydown', handleKey);
          status.textContent = 'Perfect! All correct!';
          
          setTimeout(() => {
            onComplete(100);
          }, 500);
        }
      } else if(dirs.includes(key)){
        // Wrong key pressed
        gameActive = false;
        window.removeEventListener('keydown', handleKey);
        status.textContent = `Incorrect at position ${currentIndex + 1}`;
        
        // Partial score based on how far they got
        const score = (currentIndex / length) * 100;
        
        setTimeout(() => {
          onComplete(score);
        }, 1000);
      }
    }
    
    // Hide button handler
    hideBtn.addEventListener('click', () => {
      displayDiv.textContent = '(hidden)';
      displayDiv.style.color = '#555';
      hideBtn.disabled = true;
      gameActive = true;
      currentIndex = 0;
      status.textContent = 'Now press the arrow keys...';
      
      window.addEventListener('keydown', handleKey);
    });
    
    // Cleanup on game end
    const cleanup = () => {
      window.removeEventListener('keydown', handleKey);
    };
    
    // Store cleanup reference for potential early exit
    container.addEventListener('DOMNodeRemoved', cleanup, { once: true });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(hideBtn);
    wrapper.appendChild(status);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.simonSays = { render };

})(window);
