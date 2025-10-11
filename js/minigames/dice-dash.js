// MODULE: minigames/dice-dash.js
// Dice Dash - Roll and match dice patterns

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Dice Dash';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Match the target dice sum! Roll until you get it right (10 rounds)';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const targetDiv = document.createElement('div');
    targetDiv.style.cssText = 'font-size:1.5rem;color:#f7b955;';
    
    const diceDiv = document.createElement('div');
    diceDiv.style.cssText = 'display:flex;gap:10px;min-height:80px;align-items:center;';
    
    const rollsDiv = document.createElement('div');
    rollsDiv.textContent = 'Round: 1/10 | Rolls: 0';
    rollsDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;';
    
    const rollBtn = document.createElement('button');
    rollBtn.className = 'btn primary';
    rollBtn.textContent = 'Roll Dice';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(targetDiv);
    wrapper.appendChild(diceDiv);
    wrapper.appendChild(rollsDiv);
    wrapper.appendChild(rollBtn);
    container.appendChild(wrapper);
    
    let round = 1;
    let totalRolls = 0;
    let target = 0;
    
    function newRound(){
      target = 4 + Math.floor(Math.random() * 8); // 4-11
      targetDiv.textContent = `Target: ${target}`;
      diceDiv.innerHTML = '';
    }
    
    function rollDice(){
      const die1 = 1 + Math.floor(Math.random() * 6);
      const die2 = 1 + Math.floor(Math.random() * 6);
      const sum = die1 + die2;
      
      diceDiv.innerHTML = `
        <div style="width:60px;height:60px;background:#2c3a4d;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2rem;">🎲 ${die1}</div>
        <div style="width:60px;height:60px;background:#2c3a4d;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2rem;">🎲 ${die2}</div>
      `;
      
      totalRolls++;
      rollsDiv.textContent = `Round: ${round}/10 | Rolls: ${totalRolls}`;
      
      if(sum === target){
        diceDiv.innerHTML += '<div style="color:#74e48b;font-size:1.5rem;margin-left:10px;">✓</div>';
        round++;
        
        if(round > 10){
          setTimeout(() => {
            // Fewer rolls = better score
            const finalScore = Math.min(100, Math.max(20, 100 - (totalRolls - 10) * 2));
            if(onComplete) onComplete(finalScore);
          }, 800);
        } else {
          setTimeout(newRound, 800);
        }
      }
    }
    
    rollBtn.addEventListener('click', rollDice);
    newRound();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.diceDash = { render };

})(window);
