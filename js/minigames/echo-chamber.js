// MODULE: minigames/echo-chamber.js
// Echo Chamber - Audio memory and recall

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Echo Chamber';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Remember the sequence of sounds!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const displayDiv = document.createElement('div');
    displayDiv.style.cssText = 'min-height:60px;font-size:1rem;color:#83bfff;text-align:center;';
    displayDiv.textContent = 'Press Start to begin';
    
    const soundsDiv = document.createElement('div');
    soundsDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,80px);gap:10px;margin:20px 0;';
    
    const sounds = [
      {name: '🔔 Bell', id: 'A', color: '#ff6b6b'},
      {name: '🎵 Note', id: 'B', color: '#6fd3ff'},
      {name: '🥁 Drum', id: 'C', color: '#74e48b'},
      {name: '🎺 Horn', id: 'D', color: '#f7b955'},
      {name: '🎸 Guitar', id: 'E', color: '#b074ff'},
      {name: '🎹 Piano', id: 'F', color: '#ff9cf1'}
    ];
    
    let sequence = [];
    let userInput = [];
    let level = 1;
    let showing = false;
    
    sounds.forEach(sound => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = sound.name;
      btn.style.cssText = `background:${sound.color};font-size:0.8rem;height:80px;`;
      btn.disabled = true;
      
      btn.addEventListener('click', () => {
        if(showing) return;
        userInput.push(sound.id);
        
        const index = userInput.length - 1;
        if(userInput[index] !== sequence[index]){
          displayDiv.textContent = '❌ Wrong!';
          setTimeout(() => {
            const finalScore = Math.min(100, (level - 1) * 25);
            if(onComplete) onComplete(finalScore);
          }, 1000);
          return;
        }
        
        if(userInput.length === sequence.length){
          level++;
          displayDiv.textContent = `✅ Level ${level}!`;
          setTimeout(() => {
            if(level > 5){
              if(onComplete) onComplete(100);
            } else {
              nextRound();
            }
          }, 1000);
        }
      });
      
      soundsDiv.appendChild(btn);
    });
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(soundsDiv);
    wrapper.appendChild(startBtn);
    container.appendChild(wrapper);
    
    function showSequence(){
      showing = true;
      soundsDiv.querySelectorAll('button').forEach(b => b.disabled = true);
      displayDiv.textContent = 'Watch...';
      
      let i = 0;
      function showNext(){
        if(i >= sequence.length){
          showing = false;
          displayDiv.textContent = 'Your turn!';
          soundsDiv.querySelectorAll('button').forEach(b => b.disabled = false);
          return;
        }
        
        const soundId = sequence[i];
        const sound = sounds.find(s => s.id === soundId);
        displayDiv.textContent = sound.name;
        
        i++;
        setTimeout(showNext, 800);
      }
      
      showNext();
    }
    
    function nextRound(){
      const newSound = sounds[Math.floor(Math.random() * sounds.length)].id;
      sequence.push(newSound);
      userInput = [];
      showSequence();
    }
    
    startBtn.addEventListener('click', () => {
      startBtn.style.display = 'none';
      nextRound();
    });
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.echoChamber = { render };

})(window);
