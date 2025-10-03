// MODULE: minigames/quick-tap.js
// Quick Tap Race - Tap as many times as possible in 5 seconds

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Quick Tap Race';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Tap the button as many times as you can in 5 seconds!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const counter = document.createElement('div');
    counter.textContent = '0';
    counter.style.cssText = 'font-size:3rem;font-weight:bold;color:#83bfff;min-height:80px;display:flex;align-items:center;';
    
    const tapBtn = document.createElement('button');
    tapBtn.textContent = 'START';
    tapBtn.className = 'btn primary';
    tapBtn.style.cssText = 'font-size:1.5rem;padding:24px 48px;min-width:200px;touch-action:manipulation;user-select:none;';
    
    let taps = 0;
    let started = false;
    let startTime = 0;
    const DURATION = 5000;
    
    tapBtn.addEventListener('click', () => {
      if(!started){
        // Start game
        started = true;
        taps = 0;
        startTime = Date.now();
        tapBtn.textContent = 'TAP!';
        counter.textContent = '0';
        
        // Timer
        const timer = setInterval(() => {
          const elapsed = Date.now() - startTime;
          if(elapsed >= DURATION){
            clearInterval(timer);
            tapBtn.disabled = true;
            tapBtn.textContent = 'DONE!';
            tapBtn.style.opacity = '0.5';
            
            // Calculate score (base on taps, scale to ~20-100 range)
            const score = Math.min(100, Math.max(10, taps * 3.5));
            
            setTimeout(() => {
              onComplete(score);
            }, 1000);
          }
        }, 100);
      } else {
        // Count tap
        taps++;
        counter.textContent = String(taps);
      }
    }, { passive: false });
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(counter);
    wrapper.appendChild(tapBtn);
    container.appendChild(wrapper);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.quickTap = { render };

})(window);
