// MODULE: minigames/timing-bar.js
// Timing Bar - Stop the bar near center for high score
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Timing Bar minigame
   * Player must stop a moving bar as close to center as possible (3 attempts)
   * Score is based on accuracy to center position
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
    title.textContent = 'Timing Bar';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Stop the bar near center (3 tries)';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
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
    
    // Animation frame function
    function frame(){
      if(!running) return;
      
      position += direction * 0.0135;
      
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
    
    // Start button handler
    startBtn.addEventListener('click', () => {
      if(attempts >= 3) return;
      
      startBtn.disabled = true;
      stopBtn.disabled = false;
      running = true;
      direction = 1;
      position = 0;
      
      if(rafId) cancelAnimationFrame(rafId);
      frame();
    });
    
    // Stop button handler
    stopBtn.addEventListener('click', () => {
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
      
      status.textContent = `Attempts: ${attempts}/3 | Best: ${(bestScore * 100).toFixed(1)}%`;
      
      // Enable submit after 3 attempts
      if(attempts >= 3){
        startBtn.disabled = true;
        submitBtn.disabled = false;
      }
    });
    
    // Submit button handler
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      
      // Score is 0-100 based on best attempt
      // Add small random variance for variety
      const rng = g.rng || Math.random;
      const finalScore = (bestScore * 100) + rng() * 4;
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(wrap);
    wrapper.appendChild(controlsDiv);
    wrapper.appendChild(status);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.timingBar = { render };

})(window);
