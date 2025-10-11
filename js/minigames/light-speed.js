// MODULE: minigames/light-speed.js
// Light Speed - Ultra-fast reaction challenge

(function(g){
  'use strict';

  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Light Speed';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Click as soon as the light turns GREEN!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const lightDiv = document.createElement('div');
    lightDiv.style.cssText = `
      width:150px;height:150px;
      background:#2c3a4d;
      border-radius:50%;
      margin:20px 0;
      transition:background 0.1s;
      border:4px solid #3d5170;
    `;
    
    const statusDiv = document.createElement('div');
    statusDiv.textContent = 'Wait for green...';
    statusDiv.style.cssText = 'font-size:1.2rem;color:#95a9c0;min-height:30px;';
    
    const avgDiv = document.createElement('div');
    avgDiv.textContent = 'Round: 1/5';
    avgDiv.style.cssText = 'font-size:0.9rem;color:#83bfff;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(lightDiv);
    wrapper.appendChild(statusDiv);
    wrapper.appendChild(avgDiv);
    container.appendChild(wrapper);
    
    let round = 0;
    let times = [];
    let waitTime = 0;
    let startTime = 0;
    let waiting = false;
    
    function startRound(){
      round++;
      avgDiv.textContent = `Round: ${round}/5`;
      statusDiv.textContent = 'Wait for green...';
      lightDiv.style.background = '#ff6b6b';
      waiting = true;
      
      waitTime = 1000 + Math.random() * 3000;
      setTimeout(() => {
        if(!waiting) return;
        lightDiv.style.background = '#74e48b';
        statusDiv.textContent = 'CLICK NOW!';
        startTime = Date.now();
      }, waitTime);
    }
    
    lightDiv.addEventListener('click', () => {
      if(lightDiv.style.background.includes('74e48b')){
        const reactionTime = Date.now() - startTime;
        times.push(reactionTime);
        waiting = false;
        
        statusDiv.textContent = `${reactionTime}ms`;
        lightDiv.style.background = '#2c3a4d';
        
        if(round >= 5){
          setTimeout(() => {
            const avgTime = times.reduce((a,b) => a+b, 0) / times.length;
            // Calculate raw score: Under 200ms = 100, scale up to 500ms
            const rawScore = Math.min(100, Math.max(30, 100 - (avgTime - 200) / 5));
            
            // Determine if player succeeded
            const playerSucceeded = rawScore >= 60; // 60% threshold for success
            
            // Apply win probability logic
            let finalScore = rawScore;
            if(g.GameUtils && !debugMode && competitionMode){
              const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
              if(!shouldWin && playerSucceeded){
                // Force loss despite success (25% win rate)
                finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
                console.log('[LightSpeed] Win probability applied: success forced to loss');
              }
            }
            
            if(onComplete) onComplete(Math.round(finalScore));
          }, 1000);
        } else {
          setTimeout(startRound, 1000);
        }
      } else if(lightDiv.style.background.includes('ff6b6b')){
        statusDiv.textContent = 'Too early!';
        waiting = false;
        setTimeout(startRound, 1000);
      }
    });
    
    startRound();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.lightSpeed = { render };

})(window);
