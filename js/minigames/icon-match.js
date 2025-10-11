// MODULE: minigames/icon-match.js
// Icon Match - Match icons from memory (Scaffold)

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:40px 20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Icon Match';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const subtitle = document.createElement('div');
    subtitle.textContent = 'Icon Memory Game';
    subtitle.style.cssText = 'font-size:0.9rem;color:#95a9c0;font-style:italic;';
    
    const status = document.createElement('div');
    status.textContent = '🚧 Coming Soon 🚧';
    status.style.cssText = 'font-size:1.2rem;color:#f7b955;margin:20px 0;';
    
    const description = document.createElement('p');
    description.textContent = 'Memorize icon positions and match them correctly!';
    description.style.cssText = 'margin:0;font-size:0.85rem;color:#95a9c0;text-align:center;max-width:300px;';
    
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.textContent = 'Skip (Auto-score)';
    skipBtn.style.cssText = 'margin-top:20px;';
    
    skipBtn.addEventListener('click', () => {
      const score = 40 + Math.random() * 30;
      onComplete(score);
    });
    
    wrapper.appendChild(title);
    wrapper.appendChild(subtitle);
    wrapper.appendChild(status);
    wrapper.appendChild(description);
    wrapper.appendChild(skipBtn);
    container.appendChild(wrapper);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.iconMatch = { render };

})(window);
