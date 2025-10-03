// MODULE: minigames/color-match.js
// Color Match - Match colors quickly (SCAFFOLD)

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Color Match (Coming Soon)';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const msg = document.createElement('p');
    msg.textContent = 'This minigame is under construction. Click below to submit a placeholder score.';
    msg.style.cssText = 'color:#95a9c0;text-align:center;';
    
    const btn = document.createElement('button');
    btn.className = 'btn';
    btn.textContent = 'Submit Score';
    btn.addEventListener('click', () => {
      const score = 50 + Math.random() * 30;
      onComplete(score);
    });
    
    wrapper.appendChild(title);
    wrapper.appendChild(msg);
    wrapper.appendChild(btn);
    container.appendChild(wrapper);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.colorMatch = { render };

})(window);
