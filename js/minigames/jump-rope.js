// MODULE: minigames/jump-rope.js
// Jump Rope - Endurance timing challenge

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Jump Rope';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Click when the rope is at the bottom!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Jumps: 0';
    scoreDiv.style.cssText = 'font-size:1.5rem;font-weight:bold;color:#83bfff;';
    
    const ropeDiv = document.createElement('div');
    ropeDiv.style.cssText = `
      width:200px;height:200px;
      border:3px solid #6fd3ff;
      border-radius:50%;
      position:relative;
      margin:20px 0;
    `;
    
    const marker = document.createElement('div');
    marker.style.cssText = `
      width:20px;height:20px;
      background:#f7b955;
      border-radius:50%;
      position:absolute;
      left:90px;top:-10px;
    `;
    ropeDiv.appendChild(marker);
    
    const jumpBtn = document.createElement('button');
    jumpBtn.className = 'btn primary';
    jumpBtn.textContent = 'Jump!';
    jumpBtn.style.cssText = 'font-size:1.2rem;padding:20px 40px;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(ropeDiv);
    wrapper.appendChild(jumpBtn);
    container.appendChild(wrapper);
    
    let jumps = 0;
    let angle = 0;
    let rafId = null;
    let speed = 2;
    let gameActive = false;
    
    function animate(){
      if(!gameActive) return;
      
      angle += speed;
      if(angle >= 360) angle = 0;
      
      const rad = (angle * Math.PI) / 180;
      const x = 90 + Math.cos(rad) * 90;
      const y = 90 + Math.sin(rad) * 90;
      
      marker.style.left = `${x}px`;
      marker.style.top = `${y}px`;
      
      rafId = requestAnimationFrame(animate);
    }
    
    function startGame(){
      gameActive = true;
      jumps = 0;
      scoreDiv.textContent = 'Jumps: 0';
      animate();
    }
    
    jumpBtn.addEventListener('click', () => {
      if(!gameActive){
        startGame();
        return;
      }
      
      // Check if rope is at bottom (angle 85-95 degrees)
      const normalizedAngle = angle % 360;
      if(normalizedAngle > 85 && normalizedAngle < 95){
        jumps++;
        scoreDiv.textContent = `Jumps: ${jumps}`;
        speed += 0.1; // Gradually increase speed
        
        if(jumps >= 30){
          gameActive = false;
          cancelAnimationFrame(rafId);
          if(onComplete) onComplete(100);
        }
      } else {
        gameActive = false;
        cancelAnimationFrame(rafId);
        const finalScore = Math.min(100, Math.round((jumps / 30) * 100));
        if(onComplete) onComplete(finalScore);
      }
    });
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.jumpRope = { render };

})(window);
