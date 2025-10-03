// MODULE: minigames/reaction-timer.js
// Reaction Timer - Click as fast as you can when the color changes

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Reaction Timer';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Wait for GREEN, then tap as fast as you can!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const reactionBox = document.createElement('div');
    reactionBox.style.cssText = 'width:250px;height:250px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:bold;cursor:pointer;transition:background 0.2s;background:#ff6d6d;color:#fff;user-select:none;touch-action:manipulation;';
    reactionBox.textContent = 'Click to Start';
    
    const result = document.createElement('div');
    result.style.cssText = 'font-size:1.1rem;color:#83bfff;min-height:30px;text-align:center;';
    
    let state = 'idle'; // idle, waiting, ready, done
    let startTime = 0;
    let timeout = null;
    const reactions = [];
    const rounds = 3;
    
    reactionBox.addEventListener('click', () => {
      if(state === 'idle'){
        // Start first round
        state = 'waiting';
        reactionBox.style.background = '#ff6d6d';
        reactionBox.textContent = 'Wait...';
        result.textContent = '';
        
        // Random delay 1-3 seconds
        const delay = 1000 + Math.random() * 2000;
        timeout = setTimeout(() => {
          state = 'ready';
          reactionBox.style.background = '#77d58d';
          reactionBox.textContent = 'TAP NOW!';
          startTime = Date.now();
        }, delay);
        
      } else if(state === 'waiting'){
        // Too early!
        clearTimeout(timeout);
        state = 'idle';
        reactionBox.style.background = '#ff6d6d';
        reactionBox.textContent = 'Too Early! Try Again';
        result.textContent = 'Wait for GREEN!';
        
        setTimeout(() => {
          reactionBox.textContent = 'Click to Start';
          result.textContent = '';
        }, 1500);
        
      } else if(state === 'ready'){
        // Good tap!
        const reactionTime = Date.now() - startTime;
        reactions.push(reactionTime);
        
        result.textContent = `${reactionTime}ms (${reactions.length}/${rounds})`;
        
        if(reactions.length >= rounds){
          // Done!
          state = 'done';
          const avgReaction = reactions.reduce((a,b) => a+b, 0) / reactions.length;
          reactionBox.style.background = '#83bfff';
          reactionBox.textContent = 'Complete!';
          result.textContent = `Average: ${Math.round(avgReaction)}ms`;
          
          // Score: faster = higher (100-800ms range typical)
          // Map to 20-100 score range (inverse)
          const score = Math.max(20, Math.min(100, 120 - (avgReaction / 10)));
          
          setTimeout(() => {
            onComplete(score);
          }, 1500);
          
        } else {
          // Next round
          state = 'waiting';
          reactionBox.style.background = '#ff6d6d';
          reactionBox.textContent = 'Wait...';
          
          const delay = 1000 + Math.random() * 2000;
          timeout = setTimeout(() => {
            state = 'ready';
            reactionBox.style.background = '#77d58d';
            reactionBox.textContent = 'TAP NOW!';
            startTime = Date.now();
          }, delay);
        }
      }
    }, { passive: false });
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(reactionBox);
    wrapper.appendChild(result);
    container.appendChild(wrapper);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.reactionTimer = { render };

})(window);
