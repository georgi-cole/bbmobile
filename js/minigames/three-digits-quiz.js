// MODULE: minigames/three-digits-quiz.js
// Three Digits Quiz - Answer three sequential digit questions with graded hints

(function(g){
  'use strict';

  /**
   * Three Digits Quiz minigame
   * Answer 3 sequential digit questions (0-9)
   * Wrong answers produce graded hints
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { debugMode = false } = options;
    
    // Game state
    const answers = [
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10),
      Math.floor(Math.random() * 10)
    ];
    let currentQuestion = 0;
    let wrongAttempts = [0, 0, 0]; // Track wrong attempts per question
    let startTime = Date.now();
    let gameOver = false;

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:20px;padding:20px;max-width:500px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Three Digits Quiz';
    title.style.cssText = 'margin:0;font-size:1.5rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Guess the correct digit (0-9) for each question!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const progressDiv = document.createElement('div');
    progressDiv.textContent = 'Question 1 of 3';
    progressDiv.style.cssText = 'font-size:1.2rem;color:#83bfff;font-weight:600;';
    
    const hintDiv = document.createElement('div');
    hintDiv.textContent = 'Make your first guess!';
    hintDiv.style.cssText = 'min-height:30px;font-size:1rem;color:#f7b955;text-align:center;font-weight:500;';
    hintDiv.setAttribute('aria-live', 'polite');
    
    const answersDiv = document.createElement('div');
    answersDiv.style.cssText = 'display:flex;gap:15px;';
    
    // Display for the three answers
    for(let i = 0; i < 3; i++){
      const box = document.createElement('div');
      box.dataset.index = i;
      box.style.cssText = `
        width:60px;
        height:70px;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:2rem;
        font-weight:bold;
        color:#e3ecf5;
        background:#1a1a1a;
        border:3px solid ${i === 0 ? '#5bd68a' : '#444'};
        border-radius:12px;
      `;
      box.textContent = '?';
      answersDiv.appendChild(box);
    }
    
    const digitGrid = document.createElement('div');
    digitGrid.style.cssText = 'display:grid;grid-template-columns:repeat(5, 1fr);gap:10px;max-width:400px;width:100%;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(progressDiv);
    wrapper.appendChild(hintDiv);
    wrapper.appendChild(answersDiv);
    wrapper.appendChild(digitGrid);
    container.appendChild(wrapper);

    // Create digit buttons (0-9)
    for(let i = 0; i <= 9; i++){
      const btn = document.createElement('button');
      btn.textContent = i;
      btn.dataset.digit = i;
      btn.style.cssText = `
        min-height:50px;
        min-width:50px;
        padding:12px;
        font-size:1.3rem;
        font-weight:bold;
        background:linear-gradient(135deg, #5bd68a 0%, #4db878 100%);
        color:#1a1a1a;
        border:2px solid #4db878;
        border-radius:12px;
        cursor:pointer;
        transition:all 0.2s;
        touch-action:manipulation;
      `;
      btn.setAttribute('aria-label', `Digit ${i}`);
      
      btn.addEventListener('click', () => {
        if(!gameOver){
          guessDigit(i);
        }
      });
      
      digitGrid.appendChild(btn);
    }

    function getHint(guess, answer){
      const diff = Math.abs(guess - answer);
      
      if(guess === answer){
        return 'Correct!';
      } else if(diff === 1){
        return guess < answer ? 'Almost! Go higher' : 'Almost! Go lower';
      } else if(diff <= 2){
        return guess < answer ? 'Higher!' : 'Lower!';
      } else if(diff <= 4){
        return guess < answer ? 'Much Higher!' : 'Much Lower!';
      } else {
        return guess < answer ? 'Way Higher!' : 'Way Lower!';
      }
    }

    function guessDigit(digit){
      if(gameOver) return;
      
      const answer = answers[currentQuestion];
      const hint = getHint(digit, answer);
      
      if(digit === answer){
        // Correct!
        hintDiv.textContent = '✓ Correct!';
        hintDiv.style.color = '#5bd68a';
        
        // Update answer box
        const box = answersDiv.querySelector(`[data-index="${currentQuestion}"]`);
        if(box){
          box.textContent = answer;
          box.style.background = '#2a4a5a';
          box.style.borderColor = '#5bd68a';
        }
        
        // Move to next question
        currentQuestion++;
        
        if(currentQuestion >= 3){
          // All questions answered!
          endGame();
        } else {
          setTimeout(() => {
            progressDiv.textContent = `Question ${currentQuestion + 1} of 3`;
            hintDiv.textContent = 'Make your guess!';
            hintDiv.style.color = '#f7b955';
            
            // Update border on answer boxes
            answersDiv.querySelectorAll('div').forEach((box, idx) => {
              if(idx === currentQuestion){
                box.style.borderColor = '#5bd68a';
              } else {
                box.style.borderColor = '#444';
              }
            });
          }, 1000);
        }
      } else {
        // Wrong
        wrongAttempts[currentQuestion]++;
        hintDiv.textContent = hint;
        hintDiv.style.color = '#ff6b9d';
        
        // Flash the button
        const btn = digitGrid.querySelector(`[data-digit="${digit}"]`);
        if(btn){
          const originalBg = btn.style.background;
          btn.style.background = '#ff6b9d';
          setTimeout(() => {
            btn.style.background = originalBg;
          }, 300);
        }
      }
    }

    function endGame(){
      if(gameOver) return;
      gameOver = true;
      
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      
      // Calculate score
      let score = 100;
      
      // Penalty for wrong attempts (5 points per wrong attempt)
      const totalWrong = wrongAttempts.reduce((sum, val) => sum + val, 0);
      score -= totalWrong * 5;
      
      // Time bonus (faster is better, capped at 60s)
      const timePenalty = Math.min(elapsed, 60) * 0.5;
      score -= timePenalty;
      
      score = Math.max(0, Math.min(100, Math.round(score)));
      
      // Show result
      const resultDiv = document.createElement('div');
      resultDiv.style.cssText = `
        position:fixed;
        top:50%;
        left:50%;
        transform:translate(-50%, -50%);
        background:#1a2a3a;
        padding:30px;
        border-radius:15px;
        border:3px solid #5bd68a;
        text-align:center;
        z-index:1000;
        min-width:280px;
      `;
      
      const resultText = document.createElement('div');
      resultText.textContent = '🎉 Complete!';
      resultText.style.cssText = 'font-size:1.8rem;color:#5bd68a;margin-bottom:15px;font-weight:bold;';
      
      const answersText = document.createElement('div');
      answersText.textContent = `Answers: ${answers.join('-')}`;
      answersText.style.cssText = 'font-size:1.3rem;color:#e3ecf5;margin-bottom:10px;';
      
      const statsText = document.createElement('div');
      statsText.textContent = `Wrong attempts: ${totalWrong}`;
      statsText.style.cssText = 'font-size:1rem;color:#95a9c0;margin-bottom:10px;';
      
      const scoreText = document.createElement('div');
      scoreText.textContent = `Score: ${score}`;
      scoreText.style.cssText = 'font-size:1.3rem;color:#f7b955;font-weight:600;';
      
      resultDiv.appendChild(resultText);
      resultDiv.appendChild(answersText);
      resultDiv.appendChild(statsText);
      resultDiv.appendChild(scoreText);
      container.appendChild(resultDiv);
      
      // Disable all buttons
      digitGrid.querySelectorAll('button').forEach(btn => {
        btn.disabled = true;
        btn.style.cursor = 'not-allowed';
        btn.style.opacity = '0.5';
      });
      
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(score);
        }
      }, 3500);
    }
  }

  // Register module (both MinigameModules and legacy MiniGames)
  if(typeof g.MinigameModules !== 'undefined' && typeof g.MinigameModules.register === 'function'){
    g.MinigameModules.register('threeDigitsQuiz', { render });
  } else {
    // Fallback to direct registration
    g.MinigameModules = g.MinigameModules || {};
    g.MinigameModules.threeDigitsQuiz = { render };
    g.MiniGames = g.MiniGames || {};
    g.MiniGames.threeDigitsQuiz = { render };
  }

  console.info('[ThreeDigitsQuiz] Module loaded');

})(window);
