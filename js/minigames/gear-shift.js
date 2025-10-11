// MODULE: minigames/gear-shift.js
// Gear Shift - Solve mechanical gear puzzles

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Gear Shift';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Rotate gears to match the target pattern!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const levelDiv = document.createElement('div');
    levelDiv.textContent = 'Level: 1/5';
    levelDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    const gearsDiv = document.createElement('div');
    gearsDiv.style.cssText = 'display:flex;gap:20px;margin:20px 0;';
    
    const checkBtn = document.createElement('button');
    checkBtn.className = 'btn primary';
    checkBtn.textContent = 'Check Solution';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(levelDiv);
    wrapper.appendChild(gearsDiv);
    wrapper.appendChild(checkBtn);
    container.appendChild(wrapper);
    
    let level = 1;
    let gears = [];
    let targets = [];
    
    function createGear(index){
      const gear = document.createElement('div');
      gear.style.cssText = `
        width:80px;height:80px;
        background:#2c3a4d;
        border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        font-size:2rem;cursor:pointer;
        border:3px solid #3d5170;
        position:relative;
      `;
      
      const rotation = Math.floor(Math.random() * 4) * 90;
      gear.dataset.rotation = rotation;
      gear.textContent = '⚙️';
      gear.style.transform = `rotate(${rotation}deg)`;
      
      gear.addEventListener('click', () => {
        let rot = parseInt(gear.dataset.rotation);
        rot = (rot + 90) % 360;
        gear.dataset.rotation = rot;
        gear.style.transform = `rotate(${rot}deg)`;
      });
      
      return gear;
    }
    
    function newLevel(){
      gearsDiv.innerHTML = '';
      gears = [];
      targets = [];
      
      const numGears = 2 + level;
      for(let i = 0; i < numGears; i++){
        const gear = createGear(i);
        gearsDiv.appendChild(gear);
        gears.push(gear);
        targets.push(Math.floor(Math.random() * 4) * 90);
      }
    }
    
    checkBtn.addEventListener('click', () => {
      let correct = true;
      gears.forEach((gear, i) => {
        if(parseInt(gear.dataset.rotation) !== targets[i]){
          correct = false;
        }
      });
      
      if(correct){
        level++;
        levelDiv.textContent = `Level: ${level}/5`;
        
        if(level > 5){
          if(onComplete) onComplete(100);
        } else {
          setTimeout(newLevel, 500);
        }
      } else {
        gears.forEach(gear => {
          gear.style.borderColor = '#ff6b6b';
          setTimeout(() => gear.style.borderColor = '#3d5170', 300);
        });
      }
    });
    
    newLevel();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.gearShift = { render };

})(window);
