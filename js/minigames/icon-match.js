// MODULE: minigames/icon-match.js
// Icon Match - Match icons from memory

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Icon Match';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Match the icons shown!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const targetDiv = document.createElement('div');
    targetDiv.style.cssText = 'min-height:60px;font-size:2rem;';
    
    const gridDiv = document.createElement('div');
    gridDiv.style.cssText = 'display:grid;grid-template-columns:repeat(4,70px);gap:8px;margin:20px 0;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Round: 1/10';
    scoreDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(targetDiv);
    wrapper.appendChild(gridDiv);
    wrapper.appendChild(scoreDiv);
    container.appendChild(wrapper);
    
    const icons = ['⭐', '❤️', '🎵', '🎨', '🎭', '⚡', '🔥', '💎', '🌟', '🎯', '🏆', '🎪'];
    let round = 1;
    let target = '';
    let score = 0;
    
    function newRound(){
      target = icons[Math.floor(Math.random() * icons.length)];
      targetDiv.textContent = `Find: ${target}`;
      
      gridDiv.innerHTML = '';
      const shuffled = [...icons].sort(() => Math.random() - 0.5).slice(0, 12);
      if(!shuffled.includes(target)){
        shuffled[0] = target;
      }
      
      shuffled.forEach(icon => {
        const btn = document.createElement('div');
        btn.textContent = icon;
        btn.style.cssText = `
          width:70px;height:70px;
          background:#2c3a4d;
          border-radius:8px;
          display:flex;align-items:center;justify-content:center;
          font-size:2rem;cursor:pointer;
          transition:background 0.2s;
        `;
        
        btn.addEventListener('click', () => {
          if(icon === target){
            btn.style.background = '#74e48b';
            score += 10;
            round++;
            
            if(round > 10){
              setTimeout(() => {
                if(onComplete) onComplete(score);
              }, 500);
            } else {
              scoreDiv.textContent = `Round: ${round}/10`;
              setTimeout(newRound, 500);
            }
          } else {
            btn.style.background = '#ff6b6b';
            setTimeout(() => btn.style.background = '#2c3a4d', 300);
          }
        });
        
        gridDiv.appendChild(btn);
      });
    }
    
    newRound();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.iconMatch = { render };

})(window);
