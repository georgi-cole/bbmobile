// MODULE: minigames/math-blitz.js
// Math Blitz - Quick math problem solving
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Math Blitz minigame
   * Player solves 6 math problems as quickly as possible
   * Score based on correctness and speed
   * Mobile-friendly
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:500px;margin:0 auto;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Math Blitz';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Solve all problems quickly';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Generate problems
    const rng = g.rng || Math.random;
    const problemCount = 6;
    const problems = [];
    
    for(let i = 0; i < problemCount; i++){
      const a = Math.floor(rng() * 12) + 1;
      const b = Math.floor(rng() * 12) + 1;
      const ops = ['+', '-', '×'];
      const op = ops[Math.floor(rng() * ops.length)];
      
      let answer;
      if(op === '+') answer = a + b;
      else if(op === '-') answer = a - b;
      else answer = a * b;
      
      problems.push({
        question: `${a} ${op} ${b}`,
        answer: answer
      });
    }
    
    // Start time
    const startTime = Date.now();
    
    // Problems grid
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;margin:10px 0;width:100%;';
    
    problems.forEach((prob, index) => {
      const problemDiv = document.createElement('div');
      problemDiv.style.cssText = 'background:#1d2734;padding:10px;border:1px solid #2c3a4d;border-radius:8px;';
      
      const questionDiv = document.createElement('div');
      questionDiv.textContent = `${prob.question} =`;
      questionDiv.style.cssText = 'font-size:0.9rem;color:#e3ecf5;margin-bottom:5px;';
      
      const input = document.createElement('input');
      input.type = 'number';
      input.dataset.index = index;
      input.style.cssText = 'width:80px;padding:5px;font-size:0.85rem;background:#0a0e14;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:4px;';
      
      problemDiv.appendChild(questionDiv);
      problemDiv.appendChild(input);
      grid.appendChild(problemDiv);
    });
    
    // Info display
    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:25px;';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit Answers';
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      let correct = 0;
      
      problems.forEach((prob, index) => {
        const input = grid.querySelector(`input[data-index="${index}"]`);
        const answer = input.value.trim();
        
        if(String(prob.answer) === answer){
          correct++;
        }
      });
      
      const elapsed = (Date.now() - startTime) / 1000;
      
      info.textContent = `Correct: ${correct}/${problemCount} in ${elapsed.toFixed(1)}s`;
      submitBtn.disabled = true;
      
      // Calculate raw score: base on correctness, bonus for speed
      // 12 points per correct answer, plus time bonus
      const rawScore = (correct * 12) + Math.max(0, (30 - elapsed)) + rng() * 2;
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[MathBlitz] Win probability applied: success forced to loss');
        }
      }
      
      setTimeout(() => {
        onComplete(finalScore);
      }, 800);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(grid);
    wrapper.appendChild(info);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
    
    // Focus first input
    setTimeout(() => {
      const firstInput = grid.querySelector('input');
      if(firstInput) firstInput.focus();
    }, 100);
  }

  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.mathBlitz = { render };

})(window);
