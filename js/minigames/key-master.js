// MODULE: minigames/key-master.js
// Key Master - Unlock sequences puzzle

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Key Master';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Enter the code to unlock! Guess the 4-digit number.';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const displayDiv = document.createElement('div');
    displayDiv.textContent = '____';
    displayDiv.style.cssText = 'font-size:3rem;font-weight:bold;color:#83bfff;font-family:monospace;letter-spacing:10px;';
    
    const feedbackDiv = document.createElement('div');
    feedbackDiv.style.cssText = 'min-height:30px;color:#95a9c0;text-align:center;';
    
    const inputDiv = document.createElement('div');
    inputDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,70px);gap:8px;';
    
    const attemptsDiv = document.createElement('div');
    attemptsDiv.textContent = 'Attempts: 0';
    attemptsDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(displayDiv);
    wrapper.appendChild(feedbackDiv);
    wrapper.appendChild(inputDiv);
    wrapper.appendChild(attemptsDiv);
    container.appendChild(wrapper);
    
    const code = String(1000 + Math.floor(Math.random() * 9000));
    let input = '';
    let attempts = 0;
    
    for(let i = 0; i <= 9; i++){
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = i;
      btn.style.cssText = 'height:70px;font-size:1.5rem;';
      
      btn.addEventListener('click', () => {
        if(input.length < 4){
          input += i;
          displayDiv.textContent = input + '____'.substring(input.length);
          
          if(input.length === 4){
            attempts++;
            attemptsDiv.textContent = `Attempts: ${attempts}`;
            
            if(input === code){
              feedbackDiv.textContent = '✅ Unlocked!';
              feedbackDiv.style.color = '#74e48b';
              setTimeout(() => {
                const finalScore = Math.max(40, 100 - (attempts - 1) * 15);
                if(onComplete) onComplete(finalScore);
              }, 1000);
            } else {
              // Give hints
              let correct = 0;
              for(let j = 0; j < 4; j++){
                if(input[j] === code[j]) correct++;
              }
              feedbackDiv.textContent = `${correct} digit(s) correct!`;
              input = '';
              displayDiv.textContent = '____';
              
              if(attempts >= 10){
                setTimeout(() => {
                  feedbackDiv.textContent = `Code was ${code}`;
                  setTimeout(() => {
                    if(onComplete) onComplete(20);
                  }, 1500);
                }, 500);
              }
            }
          }
        }
      });
      
      inputDiv.appendChild(btn);
    }
    
    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn';
    clearBtn.textContent = 'Clear';
    clearBtn.addEventListener('click', () => {
      input = '';
      displayDiv.textContent = '____';
    });
    inputDiv.appendChild(clearBtn);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.keyMaster = { render };

})(window);
