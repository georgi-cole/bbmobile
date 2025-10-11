// MODULE: minigames/combo-keys.js
// Combo Keys - Memorize and repeat key combinations

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Combo Keys';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Watch the pattern, then tap the buttons in the same order!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const displayDiv = document.createElement('div');
    displayDiv.style.cssText = 'min-height:60px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;';
    
    const levelDiv = document.createElement('div');
    levelDiv.textContent = 'Level: 1';
    levelDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    const buttonsDiv = document.createElement('div');
    buttonsDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,80px);gap:10px;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(levelDiv);
    wrapper.appendChild(buttonsDiv);
    container.appendChild(wrapper);
    
    const keys = ['A', 'B', 'C', 'X', 'Y', 'Z'];
    const colors = ['#ff6b6b', '#6fd3ff', '#74e48b', '#f7b955', '#b074ff', '#ff9cf1'];
    let sequence = [];
    let userInput = [];
    let level = 1;
    let showing = false;
    
    keys.forEach((key, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = key;
      btn.style.cssText = `background:${colors[idx]};`;
      btn.disabled = true;
      
      btn.addEventListener('click', () => {
        if(showing) return;
        userInput.push(key);
        
        // Check if correct
        const index = userInput.length - 1;
        if(userInput[index] !== sequence[index]){
          // Wrong!
          displayDiv.textContent = '❌ Wrong! Game Over';
          setTimeout(() => {
            const finalScore = Math.min(100, (level - 1) * 20);
            if(onComplete) onComplete(finalScore);
          }, 1000);
          return;
        }
        
        // Check if sequence complete
        if(userInput.length === sequence.length){
          level++;
          levelDiv.textContent = `Level: ${level}`;
          displayDiv.textContent = '✅ Correct!';
          setTimeout(() => {
            if(level > 6){
              // Won!
              if(onComplete) onComplete(100);
            } else {
              nextRound();
            }
          }, 1000);
        }
      });
      
      buttonsDiv.appendChild(btn);
    });
    
    function showSequence(){
      showing = true;
      displayDiv.innerHTML = '';
      buttonsDiv.querySelectorAll('button').forEach(b => b.disabled = true);
      
      let i = 0;
      function showNext(){
        if(i >= sequence.length){
          showing = false;
          displayDiv.textContent = 'Your turn!';
          buttonsDiv.querySelectorAll('button').forEach(b => b.disabled = false);
          return;
        }
        
        const key = sequence[i];
        const keyDiv = document.createElement('div');
        keyDiv.textContent = key;
        keyDiv.style.cssText = `
          width:50px;height:50px;
          background:${colors[keys.indexOf(key)]};
          border-radius:8px;
          display:flex;align-items:center;justify-content:center;
          font-weight:bold;font-size:1.5rem;
          animation: pulse 0.5s ease;
        `;
        displayDiv.appendChild(keyDiv);
        
        i++;
        setTimeout(showNext, 800);
      }
      
      showNext();
    }
    
    function nextRound(){
      const newKey = keys[Math.floor(Math.random() * keys.length)];
      sequence.push(newKey);
      userInput = [];
      showSequence();
    }
    
    nextRound();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.comboKeys = { render };

})(window);
