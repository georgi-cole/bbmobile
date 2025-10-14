// MODULE: minigames/snake.js
// Snake - Classic snake game with portal mode variant

(function(g){
  'use strict';

  /**
   * Snake minigame
   * Control snake to eat food and grow
   * Avoid walls and yourself
   * Portal mode: edges wrap around
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false,
      variant = 'normal' // 'normal' or 'portal'
    } = options;
    
    const portalMode = variant === 'portal';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = portalMode ? 'Snake (Portal Mode)' : 'Snake';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = portalMode ? 'Eat food, grow, edges wrap around!' : 'Eat food, avoid walls and yourself!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Length: 3 | Food: 0';
    scoreDiv.style.cssText = 'font-size:1.2rem;font-weight:bold;color:#83bfff;';
    
    // Canvas for game
    const canvas = document.createElement('canvas');
    const gridSize = 20;
    const tileSize = 15;
    canvas.width = gridSize * tileSize;
    canvas.height = gridSize * tileSize;
    canvas.style.cssText = 'border:3px solid #3d4f64;background:#1a2332;border-radius:4px;';
    const ctx = canvas.getContext('2d');
    
    // Control buttons for mobile
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,60px);gap:5px;margin-top:10px;';
    
    const btnUp = createControlBtn('▲');
    const btnLeft = createControlBtn('◀');
    const btnDown = createControlBtn('▼');
    const btnRight = createControlBtn('▶');
    
    controlsDiv.appendChild(document.createElement('div')); // spacer
    controlsDiv.appendChild(btnUp);
    controlsDiv.appendChild(document.createElement('div')); // spacer
    controlsDiv.appendChild(btnLeft);
    controlsDiv.appendChild(btnDown);
    controlsDiv.appendChild(btnRight);
    
    function createControlBtn(text){
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.className = 'btn';
      btn.style.cssText = 'width:60px;height:60px;font-size:1.5rem;padding:0;';
      return btn;
    }
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(canvas);
    wrapper.appendChild(controlsDiv);
    container.appendChild(wrapper);
    
    // Game state
    let snake = [{x:10, y:10}];
    let direction = {x:1, y:0};
    let nextDirection = {x:1, y:0};
    let food = null;
    let foodEaten = 0;
    let gameOver = false;
    let gameLoop = null;
    
    function placeFood(){
      do {
        food = {
          x: Math.floor(Math.random() * gridSize),
          y: Math.floor(Math.random() * gridSize)
        };
      } while(snake.some(seg => seg.x === food.x && seg.y === food.y));
    }
    
    function setDirection(newDir){
      // Prevent reversing
      if(newDir.x === -direction.x && newDir.y === -direction.y) return;
      nextDirection = newDir;
    }
    
    function update(){
      if(gameOver) return;
      
      direction = nextDirection;
      
      // New head position
      let newHead = {
        x: snake[0].x + direction.x,
        y: snake[0].y + direction.y
      };
      
      // Portal mode: wrap around
      if(portalMode){
        if(newHead.x < 0) newHead.x = gridSize - 1;
        if(newHead.x >= gridSize) newHead.x = 0;
        if(newHead.y < 0) newHead.y = gridSize - 1;
        if(newHead.y >= gridSize) newHead.y = 0;
      } else {
        // Normal mode: check wall collision
        if(newHead.x < 0 || newHead.x >= gridSize || newHead.y < 0 || newHead.y >= gridSize){
          endGame();
          return;
        }
      }
      
      // Check self collision
      if(snake.some(seg => seg.x === newHead.x && seg.y === newHead.y)){
        endGame();
        return;
      }
      
      snake.unshift(newHead);
      
      // Check food
      if(newHead.x === food.x && newHead.y === food.y){
        foodEaten++;
        scoreDiv.textContent = `Length: ${snake.length} | Food: ${foodEaten}`;
        placeFood();
      } else {
        snake.pop();
      }
      
      draw();
    }
    
    function draw(){
      // Clear
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw snake
      snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? '#83bfff' : '#6fd3ff';
        ctx.fillRect(seg.x * tileSize, seg.y * tileSize, tileSize - 1, tileSize - 1);
      });
      
      // Draw food
      ctx.fillStyle = '#f7b955';
      ctx.fillRect(food.x * tileSize, food.y * tileSize, tileSize - 1, tileSize - 1);
    }
    
    function endGame(){
      gameOver = true;
      clearInterval(gameLoop);
      
      instructions.textContent = 'Game Over!';
      instructions.style.color = '#ff6b6b';
      
      // Score based on food eaten
      let rawScore;
      if(foodEaten >= 15){
        rawScore = 100;
      } else if(foodEaten >= 10){
        rawScore = 70 + (foodEaten - 10) * 6;
      } else if(foodEaten >= 5){
        rawScore = 40 + (foodEaten - 5) * 6;
      } else {
        rawScore = foodEaten * 8;
      }
      
      rawScore = Math.min(100, Math.round(rawScore));
      
      const playerSucceeded = rawScore >= 60;
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          finalScore = Math.round(30 + Math.random() * 25);
        }
      }
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
    
    // Controls
    document.addEventListener('keydown', (e) => {
      if(gameOver) return;
      
      if(e.key === 'ArrowUp' || e.key === 'w'){
        e.preventDefault();
        setDirection({x:0, y:-1});
      } else if(e.key === 'ArrowDown' || e.key === 's'){
        e.preventDefault();
        setDirection({x:0, y:1});
      } else if(e.key === 'ArrowLeft' || e.key === 'a'){
        e.preventDefault();
        setDirection({x:-1, y:0});
      } else if(e.key === 'ArrowRight' || e.key === 'd'){
        e.preventDefault();
        setDirection({x:1, y:0});
      }
    });
    
    btnUp.addEventListener('click', () => setDirection({x:0, y:-1}));
    btnDown.addEventListener('click', () => setDirection({x:0, y:1}));
    btnLeft.addEventListener('click', () => setDirection({x:-1, y:0}));
    btnRight.addEventListener('click', () => setDirection({x:1, y:0}));
    
    // Start game
    placeFood();
    draw();
    gameLoop = setInterval(update, 150);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.snake = { render };

})(window);
