// MODULE: minigames/clock-stopper.js
// Clock Stopper - Stop the clock at exact times

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Clock Stopper';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Stop the clock at the target time! (3 attempts)';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const targetDiv = document.createElement('div');
    targetDiv.style.cssText = 'font-size:1.2rem;color:#f7b955;';
    
    const clockDiv = document.createElement('div');
    clockDiv.textContent = '0.00s';
    clockDiv.style.cssText = 'font-size:3rem;font-weight:bold;color:#83bfff;font-family:monospace;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Score: 0';
    scoreDiv.style.cssText = 'font-size:1rem;color:#95a9c0;';
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    const stopBtn = document.createElement('button');
    stopBtn.className = 'btn';
    stopBtn.textContent = 'Stop';
    stopBtn.disabled = true;
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(targetDiv);
    wrapper.appendChild(clockDiv);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(startBtn);
    wrapper.appendChild(stopBtn);
    container.appendChild(wrapper);
    
    let attempts = 0;
    let totalScore = 0;
    let running = false;
    let startTime = 0;
    let targetTime = 0;
    let rafId = null;
    
    function newTarget(){
      targetTime = 2000 + Math.random() * 3000; // 2-5 seconds
      targetDiv.textContent = `Target: ${(targetTime/1000).toFixed(2)}s`;
    }
    
    function updateClock(){
      if(!running) return;
      const elapsed = Date.now() - startTime;
      clockDiv.textContent = `${(elapsed/1000).toFixed(2)}s`;
      rafId = requestAnimationFrame(updateClock);
    }
    
    startBtn.addEventListener('click', () => {
      running = true;
      startTime = Date.now();
      startBtn.disabled = true;
      stopBtn.disabled = false;
      clockDiv.textContent = '0.00s';
      newTarget();
      updateClock();
    });
    
    stopBtn.addEventListener('click', () => {
      if(!running) return;
      running = false;
      cancelAnimationFrame(rafId);
      
      const elapsed = Date.now() - startTime;
      const diff = Math.abs(elapsed - targetTime);
      
      // Score based on accuracy (closer = better)
      let roundScore = 0;
      if(diff < 50) roundScore = 100;
      else if(diff < 100) roundScore = 90;
      else if(diff < 200) roundScore = 80;
      else if(diff < 300) roundScore = 70;
      else if(diff < 500) roundScore = 60;
      else if(diff < 800) roundScore = 40;
      else roundScore = 20;
      
      totalScore += roundScore;
      attempts++;
      
      scoreDiv.textContent = `Score: ${Math.round(totalScore/attempts)}`;
      
      if(attempts >= 3){
        setTimeout(() => {
          if(onComplete){
            onComplete(Math.round(totalScore/3));
          }
        }, 500);
      } else {
        stopBtn.disabled = true;
        startBtn.disabled = false;
        startBtn.textContent = `Try ${attempts + 1}/3`;
      }
    });
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.clockStopper = { render };

})(window);
