// MODULE: minigames/bubble-burst.js
// Bubble Burst - Pop bubbles quickly for points

(function(g){
  'use strict';

  /**
   * Bubble Burst minigame
   * Pop as many bubbles as you can in 10 seconds
   * Score based on number of bubbles popped
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;position:relative;';
    
    const title = document.createElement('h3');
    title.textContent = 'Bubble Burst';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Pop as many bubbles as you can in 10 seconds!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Score: 0';
    scoreDiv.style.cssText = 'font-size:1.5rem;font-weight:bold;color:#83bfff;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = 'Time: 10s';
    timerDiv.style.cssText = 'font-size:1rem;color:#95a9c0;';
    
    const gameArea = document.createElement('div');
    gameArea.style.cssText = 'width:100%;max-width:400px;height:300px;background:#1d2734;border:2px solid #2c3a4d;border-radius:8px;position:relative;overflow:hidden;';
    
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start Game';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(gameArea);
    wrapper.appendChild(startBtn);
    container.appendChild(wrapper);
    
    let score = 0;
    let timeLeft = 10;
    let gameActive = false;
    let spawnInterval = null;
    let timerInterval = null;
    
    const colors = ['#ff6b6b', '#6fd3ff', '#74e48b', '#f7b955', '#b074ff'];
    
    function createBubble(){
      const bubble = document.createElement('div');
      const size = 40 + Math.random() * 30;
      const x = Math.random() * (gameArea.clientWidth - size);
      const y = Math.random() * (gameArea.clientHeight - size);
      const color = colors[Math.floor(Math.random() * colors.length)];
      
      bubble.style.cssText = `
        position:absolute;
        left:${x}px;
        top:${y}px;
        width:${size}px;
        height:${size}px;
        background:${color};
        border-radius:50%;
        cursor:pointer;
        opacity:0.8;
        transition:transform 0.1s;
        box-shadow:0 0 10px ${color}66;
      `;
      
      bubble.addEventListener('click', () => {
        if(!gameActive) return;
        score++;
        scoreDiv.textContent = `Score: ${score}`;
        bubble.style.transform = 'scale(0)';
        setTimeout(() => bubble.remove(), 100);
      });
      
      gameArea.appendChild(bubble);
      
      // Auto-remove after 2 seconds if not clicked
      setTimeout(() => {
        if(bubble.parentNode){
          bubble.style.opacity = '0';
          setTimeout(() => bubble.remove(), 200);
        }
      }, 2000);
    }
    
    function startGame(){
      gameActive = true;
      score = 0;
      timeLeft = 10;
      scoreDiv.textContent = 'Score: 0';
      timerDiv.textContent = 'Time: 10s';
      startBtn.disabled = true;
      gameArea.innerHTML = '';
      
      // Spawn bubbles every 400ms
      spawnInterval = setInterval(createBubble, 400);
      
      // Timer countdown
      timerInterval = setInterval(() => {
        timeLeft--;
        timerDiv.textContent = `Time: ${timeLeft}s`;
        
        if(timeLeft <= 0){
          endGame();
        }
      }, 1000);
    }
    
    function endGame(){
      gameActive = false;
      clearInterval(spawnInterval);
      clearInterval(timerInterval);
      gameArea.innerHTML = '';
      
      // Calculate score (0-100)
      // Good performance: 25+ bubbles = 100, scale down from there
      const finalScore = Math.min(100, Math.max(0, (score / 25) * 100));
      
      if(onComplete){
        onComplete(finalScore);
      }
    }
    
    startBtn.addEventListener('click', startGame);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.bubbleBurst = { render };

})(window);
