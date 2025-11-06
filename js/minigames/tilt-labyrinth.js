// MODULE: minigames/tilt-labyrinth.js
// Tilt Labyrinth - Tilt phone to move ball through maze

(function(g){
  'use strict';

  /**
   * Tilt Labyrinth minigame
   * Use device orientation (or swipe fallback) to guide ball to goal
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { debugMode = false } = options;
    
    // Game state
    let gameOver = false;
    let startTime = Date.now();
    let orientationGranted = false;
    let useTiltControls = false;
    
    // Ball physics
    let ballX = 50;
    let ballY = 50;
    let velocityX = 0;
    let velocityY = 0;
    const BALL_RADIUS = 8;
    const FRICTION = 0.92;
    const ACCELERATION = 0.4;
    
    // Maze layout (simple 300x300 grid)
    const MAZE_SIZE = 300;
    const GOAL_X = 250;
    const GOAL_Y = 250;
    const GOAL_RADIUS = 15;
    
    // Walls (x1, y1, x2, y2)
    const walls = [
      [0, 0, MAZE_SIZE, 0],       // Top
      [0, 0, 0, MAZE_SIZE],       // Left
      [MAZE_SIZE, 0, MAZE_SIZE, MAZE_SIZE], // Right
      [0, MAZE_SIZE, MAZE_SIZE, MAZE_SIZE], // Bottom
      [100, 0, 100, 150],         // Vertical wall
      [200, 150, 200, MAZE_SIZE], // Vertical wall
      [0, 100, 200, 100],         // Horizontal wall
      [100, 200, MAZE_SIZE, 200]  // Horizontal wall
    ];

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Tilt Labyrinth';
    title.style.cssText = 'margin:0;font-size:1.5rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Tilt to move the ball to the green goal!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = 'Time: 0s';
    timerDiv.style.cssText = 'font-size:1.1rem;color:#83bfff;font-weight:600;';
    
    const canvas = document.createElement('canvas');
    canvas.width = MAZE_SIZE;
    canvas.height = MAZE_SIZE;
    canvas.style.cssText = 'background:#1a1a1a;border:3px solid #5bd68a;border-radius:8px;touch-action:none;';
    const ctx = canvas.getContext('2d');
    
    const controlsInfo = document.createElement('div');
    controlsInfo.textContent = 'Checking for motion sensors...';
    controlsInfo.style.cssText = 'font-size:0.85rem;color:#95a9c0;text-align:center;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(canvas);
    wrapper.appendChild(controlsInfo);
    container.appendChild(wrapper);

    // Request permission for iOS
    function requestOrientationPermission(){
      if(typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function'){
        // iOS 13+ requires permission
        return DeviceOrientationEvent.requestPermission()
          .then(permissionState => {
            if(permissionState === 'granted'){
              orientationGranted = true;
              return true;
            }
            return false;
          })
          .catch(() => false);
      } else {
        // Non-iOS or older iOS - assume granted
        orientationGranted = true;
        return Promise.resolve(true);
      }
    }

    // Check for orientation support
    function setupControls(){
      if(typeof DeviceOrientationEvent !== 'undefined'){
        requestOrientationPermission().then(granted => {
          if(granted){
            useTiltControls = true;
            controlsInfo.textContent = '📱 Tilt device to control';
            window.addEventListener('deviceorientation', handleOrientation);
          } else {
            setupSwipeControls();
          }
        });
      } else {
        setupSwipeControls();
      }
    }

    function setupSwipeControls(){
      useTiltControls = false;
      controlsInfo.textContent = '👆 Swipe to control (motion not available)';
      
      let touchStartX = 0;
      let touchStartY = 0;
      let swipeX = 0;
      let swipeY = 0;
      
      canvas.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
      }, { passive: true });
      
      canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        swipeX = (touch.clientX - touchStartX) * 0.1;
        swipeY = (touch.clientY - touchStartY) * 0.1;
        
        velocityX += swipeX * ACCELERATION;
        velocityY += swipeY * ACCELERATION;
      }, { passive: false });
      
      canvas.addEventListener('touchend', () => {
        swipeX = 0;
        swipeY = 0;
      });
      
      // Mouse fallback for desktop
      let isDragging = false;
      let lastMouseX = 0;
      let lastMouseY = 0;
      
      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      });
      
      canvas.addEventListener('mousemove', (e) => {
        if(!isDragging) return;
        const dx = (e.clientX - lastMouseX) * 0.1;
        const dy = (e.clientY - lastMouseY) * 0.1;
        
        velocityX += dx * ACCELERATION;
        velocityY += dy * ACCELERATION;
        
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      });
      
      canvas.addEventListener('mouseup', () => {
        isDragging = false;
      });
    }

    function handleOrientation(event){
      if(!useTiltControls || gameOver) return;
      
      // beta: front-back tilt (-180 to 180)
      // gamma: left-right tilt (-90 to 90)
      const beta = event.beta || 0;
      const gamma = event.gamma || 0;
      
      // Map tilt to acceleration
      velocityX += (gamma / 90) * ACCELERATION;
      velocityY += (beta / 90) * ACCELERATION;
    }

    function checkWallCollision(newX, newY){
      for(const wall of walls){
        const [x1, y1, x2, y2] = wall;
        
        // Check if ball intersects with wall segment
        // Clamp the ball position to the line segment bounds
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        const closestX = Math.max(minX, Math.min(maxX, newX));
        const closestY = Math.max(minY, Math.min(maxY, newY));
        
        const dx = newX - closestX;
        const dy = newY - closestY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if(distance < BALL_RADIUS){
          return true;
        }
      }
      return false;
    }

    function updatePhysics(){
      if(gameOver) return;
      
      // Apply velocity
      const newX = ballX + velocityX;
      const newY = ballY + velocityY;
      
      // Check wall collisions
      if(checkWallCollision(newX, ballY)){
        velocityX *= -0.5; // Bounce back
      } else {
        ballX = newX;
      }
      
      if(checkWallCollision(ballX, newY)){
        velocityY *= -0.5;
      } else {
        ballY = newY;
      }
      
      // Apply friction
      velocityX *= FRICTION;
      velocityY *= FRICTION;
      
      // Keep in bounds
      ballX = Math.max(BALL_RADIUS, Math.min(MAZE_SIZE - BALL_RADIUS, ballX));
      ballY = Math.max(BALL_RADIUS, Math.min(MAZE_SIZE - BALL_RADIUS, ballY));
      
      // Check goal
      const distToGoal = Math.sqrt(Math.pow(ballX - GOAL_X, 2) + Math.pow(ballY - GOAL_Y, 2));
      if(distToGoal < GOAL_RADIUS){
        endGame();
      }
    }

    function draw(){
      ctx.fillStyle = '#1a1a1a';
      ctx.fillRect(0, 0, MAZE_SIZE, MAZE_SIZE);
      
      // Draw walls
      ctx.strokeStyle = '#5bd68a';
      ctx.lineWidth = 3;
      for(const wall of walls){
        ctx.beginPath();
        ctx.moveTo(wall[0], wall[1]);
        ctx.lineTo(wall[2], wall[3]);
        ctx.stroke();
      }
      
      // Draw goal
      ctx.fillStyle = '#5bd68a';
      ctx.beginPath();
      ctx.arc(GOAL_X, GOAL_Y, GOAL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw ball
      ctx.fillStyle = '#ff6b9d';
      ctx.beginPath();
      ctx.arc(ballX, ballY, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw ball border
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    function updateTimer(){
      if(!gameOver){
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        timerDiv.textContent = `Time: ${elapsed}s`;
      }
    }

    function gameLoop(){
      if(!gameOver){
        updatePhysics();
        draw();
        updateTimer();
        requestAnimationFrame(gameLoop);
      }
    }

    function endGame(){
      if(gameOver) return;
      gameOver = true;
      
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Score based on time (faster is better)
      let score = 100 - Math.min(elapsed * 2, 80);
      score = Math.max(0, Math.round(score));
      
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
        min-width:250px;
      `;
      
      const resultText = document.createElement('div');
      resultText.textContent = '🎉 Goal Reached!';
      resultText.style.cssText = 'font-size:1.8rem;color:#5bd68a;margin-bottom:15px;font-weight:bold;';
      
      const timeText = document.createElement('div');
      timeText.textContent = `Time: ${elapsed.toFixed(1)}s`;
      timeText.style.cssText = 'font-size:1.2rem;color:#83bfff;margin-bottom:10px;';
      
      const scoreText = document.createElement('div');
      scoreText.textContent = `Score: ${score}`;
      scoreText.style.cssText = 'font-size:1.2rem;color:#f7b955;font-weight:600;';
      
      resultDiv.appendChild(resultText);
      resultDiv.appendChild(timeText);
      resultDiv.appendChild(scoreText);
      container.appendChild(resultDiv);
      
      // Cleanup orientation listener
      if(useTiltControls){
        window.removeEventListener('deviceorientation', handleOrientation);
      }
      
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(score);
        }
      }, 3000);
    }

    setupControls();
    draw();
    
    // Start game loop after a short delay
    setTimeout(() => {
      startTime = Date.now();
      gameLoop();
    }, 500);
  }

  // Register module
  g.MiniGames = g.MiniGames || {};
  g.MiniGames.tiltLabyrinth = { render };

  console.info('[TiltLabyrinth] Module loaded');

})(window);
