// MODULE: minigames/puzzle-dash.js
// Puzzle Dash - Speed puzzle solving

(function(g){
  'use strict';

  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Puzzle Dash';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Solve math puzzles as fast as you can!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const puzzleDiv = document.createElement('div');
    puzzleDiv.style.cssText = 'font-size:2rem;color:#e3ecf5;min-height:60px;';
    
    const answerDiv = document.createElement('div');
    answerDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,80px);gap:10px;margin:20px 0;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Solved: 0/10';
    scoreDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = 'Time: 0s';
    timerDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(puzzleDiv);
    wrapper.appendChild(answerDiv);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(timerDiv);
    container.appendChild(wrapper);
    
    let solved = 0;
    let startTime = Date.now();
    let correctAnswer = 0;
    let timerInterval = null;
    
    function updateTimer(){
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      timerDiv.textContent = `Time: ${elapsed}s`;
    }
    
    timerInterval = setInterval(updateTimer, 1000);
    
    function newPuzzle(){
      const a = 1 + Math.floor(Math.random() * 20);
      const b = 1 + Math.floor(Math.random() * 20);
      const ops = ['+', '-', '×'];
      const op = ops[Math.floor(Math.random() * ops.length)];
      
      if(op === '+') correctAnswer = a + b;
      else if(op === '-') correctAnswer = Math.abs(a - b);
      else correctAnswer = a * b;
      
      puzzleDiv.textContent = `${a} ${op} ${b} = ?`;
      
      answerDiv.innerHTML = '';
      const answers = [correctAnswer];
      
      while(answers.length < 6){
        const wrong = correctAnswer + Math.floor(Math.random() * 20) - 10;
        if(wrong !== correctAnswer && wrong > 0 && !answers.includes(wrong)){
          answers.push(wrong);
        }
      }
      
      answers.sort(() => Math.random() - 0.5);
      
      answers.forEach(ans => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = ans;
        btn.style.cssText = 'height:60px;font-size:1.2rem;';
        
        btn.addEventListener('click', () => {
          if(ans === correctAnswer){
            btn.style.background = '#74e48b';
            solved++;
            scoreDiv.textContent = `Solved: ${solved}/10`;
            
            if(solved >= 10){
              clearInterval(timerInterval);
              const totalTime = Math.floor((Date.now() - startTime) / 1000);
              // Under 30s = 100, scale to 60s
              const finalScore = Math.min(100, Math.max(40, 100 - (totalTime - 30)));
              setTimeout(() => {
                if(onComplete) onComplete(finalScore);
              }, 500);
            } else {
              setTimeout(newPuzzle, 300);
            }
          } else {
            btn.style.background = '#ff6b6b';
            setTimeout(() => btn.style.background = '', 300);
          }
        });
        
        answerDiv.appendChild(btn);
      });
    }
    
    newPuzzle();
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.puzzleDash = { render };

})(window);
