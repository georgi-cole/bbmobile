// MODULE: minigames/laser-pantry-dash.js
// Laser Pantry Dash - Top-down dodge-and-collect arcade game
// Player drags avatar to collect recipe ingredients while avoiding sweeping lasers

(function(g){
  'use strict';

  // Constants
  const GAME_DURATION = 60000; // 60 seconds
  const RECIPE_SWITCH_TIME = 30000; // Switch recipe at 30s
  const LIVES = 3;
  const CORRECT_ITEM_POINTS = 10;
  const WRONG_ITEM_PENALTY = 5;
  const LASER_HIT_PENALTY = 15;
  const PLAYER_SIZE = 20;
  const ITEM_SIZE = 24;
  const CAMPING_RADIUS = 60;
  const CAMPING_THRESHOLD = 3000; // 3s in same spot
  const WRONG_ITEM_STREAK_THRESHOLD = 3;

  // Recipe items database
  const ALL_INGREDIENTS = [
    { name: '🍎', correct: true },
    { name: '🍌', correct: true },
    { name: '🥕', correct: true },
    { name: '🍞', correct: true },
    { name: '🥛', correct: true },
    { name: '🍕', correct: true },
    { name: '🍰', correct: true },
    { name: '🥗', correct: true },
    { name: '🍔', correct: false },
    { name: '🍟', correct: false },
    { name: '🌭', correct: false },
    { name: '🍿', correct: false },
    { name: '🍩', correct: false },
    { name: '🍪', correct: false },
    { name: '🧁', correct: false },
    { name: '🍫', correct: false }
  ];

  /**
   * Generate a random recipe of 3 items
   */
  function generateRecipe(){
    const correctItems = ALL_INGREDIENTS.filter(i => i.correct);
    const recipe = [];
    const used = new Set();
    
    while(recipe.length < 3){
      const idx = Math.floor(Math.random() * correctItems.length);
      if(!used.has(idx)){
        recipe.push(correctItems[idx]);
        used.add(idx);
      }
    }
    
    return recipe;
  }

  /**
   * Render the Laser Pantry Dash minigame
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { debugMode = false, competitionMode = false } = options;
    
    // Main wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;width:100%;max-width:600px;margin:0 auto;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Laser Pantry Dash';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    // Instructions overlay
    const instructionsOverlay = document.createElement('div');
    instructionsOverlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.95);z-index:10000;display:flex;align-items:center;justify-content:center;';
    
    const instructionsBox = document.createElement('div');
    instructionsBox.style.cssText = 'background:#1d2734;padding:30px;border-radius:12px;max-width:400px;text-align:center;';
    instructionsBox.innerHTML = `
      <h2 style="color:#6fd3ff;margin:0 0 20px 0;">How to Play</h2>
      <p style="color:#e3ecf5;margin:10px 0;line-height:1.6;">
        • Drag your avatar to collect recipe ingredients<br>
        • Avoid the sweeping laser lines<br>
        • Collect items matching the recipe for points<br>
        • Wrong items give penalties<br>
        • 3 lives - lasers cost 1 life and drop items<br>
        • Recipe changes at 30 seconds!
      </p>
      <button id="startGameBtn" class="btn primary" style="margin-top:20px;padding:12px 32px;font-size:1.1rem;">START GAME</button>
    `;
    instructionsOverlay.appendChild(instructionsBox);
    document.body.appendChild(instructionsOverlay);
    
    // HUD
    const hudDiv = document.createElement('div');
    hudDiv.style.cssText = 'display:flex;justify-content:space-between;width:100%;font-size:0.9rem;';
    
    const livesDiv = document.createElement('div');
    livesDiv.style.cssText = 'color:#ff6b6b;';
    livesDiv.textContent = `Lives: ${LIVES}`;
    
    const scoreDiv = document.createElement('div');
    scoreDiv.style.cssText = 'color:#83bfff;';
    scoreDiv.textContent = 'Score: 0';
    
    const timerDiv = document.createElement('div');
    timerDiv.style.cssText = 'color:#f7b955;';
    timerDiv.textContent = '60s';
    
    hudDiv.appendChild(livesDiv);
    hudDiv.appendChild(scoreDiv);
    hudDiv.appendChild(timerDiv);
    
    // Recipe card
    const recipeCard = document.createElement('div');
    recipeCard.style.cssText = 'background:#2c3a4d;padding:12px;border-radius:8px;width:100%;text-align:center;';
    const recipeTitle = document.createElement('div');
    recipeTitle.textContent = 'Recipe:';
    recipeTitle.style.cssText = 'color:#95a9c0;font-size:0.8rem;margin-bottom:6px;';
    const recipeItems = document.createElement('div');
    recipeItems.style.cssText = 'font-size:1.8rem;';
    recipeCard.appendChild(recipeTitle);
    recipeCard.appendChild(recipeItems);
    
    // Game area
    const gameArea = document.createElement('div');
    gameArea.style.cssText = 'position:relative;width:100%;height:350px;background:#0a1420;border:2px solid #2c3a4d;border-radius:8px;overflow:hidden;touch-action:none;';
    
    // Player avatar
    const player = document.createElement('div');
    player.style.cssText = `position:absolute;width:${PLAYER_SIZE}px;height:${PLAYER_SIZE}px;border-radius:50%;background:#6fd3ff;box-shadow:0 0 12px #6fd3ff;z-index:100;`;
    gameArea.appendChild(player);
    
    // Stats display
    const statsDiv = document.createElement('div');
    statsDiv.style.cssText = 'width:100%;background:#1a2332;border-radius:6px;padding:12px;font-size:0.85rem;color:#95a9c0;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(hudDiv);
    wrapper.appendChild(recipeCard);
    wrapper.appendChild(gameArea);
    wrapper.appendChild(statsDiv);
    container.appendChild(wrapper);
    
    // Game state
    let gameActive = false;
    let lives = LIVES;
    let score = 0;
    let currentRecipe = generateRecipe();
    let recipeChanged = false;
    let startTime = 0;
    let correctItems = 0;
    let wrongItems = 0;
    let laserHits = 0;
    let wrongStreak = 0;
    let bestCombo = 0;
    let currentCombo = 0;
    let lastMoveTime = Date.now();
    let lastMoveX = 0;
    let lastMoveY = 0;
    let playerX = 0;
    let playerY = 0;
    let items = [];
    let lasers = [];
    let animationFrame = null;
    
    // Update recipe display
    function updateRecipeDisplay(){
      recipeItems.innerHTML = currentRecipe.map(item => item.name).join(' ');
    }
    updateRecipeDisplay();
    
    // Spawn item
    function spawnItem(){
      if(!gameActive) return;
      
      const rect = gameArea.getBoundingClientRect();
      const isCamping = Date.now() - lastMoveTime > CAMPING_THRESHOLD;
      
      // Anti-camping: spawn farther from player if camping
      let x, y;
      let attempts = 0;
      do {
        x = Math.random() * (rect.width - ITEM_SIZE);
        y = Math.random() * (rect.height - ITEM_SIZE);
        const dist = Math.sqrt(Math.pow(x - playerX, 2) + Math.pow(y - playerY, 2));
        attempts++;
        
        if(!isCamping || dist > CAMPING_RADIUS || attempts > 10) break;
      } while(attempts < 20);
      
      // Randomly select from correct or wrong items
      const isCorrect = Math.random() < 0.65; // 65% correct items
      let item;
      
      if(isCorrect){
        item = currentRecipe[Math.floor(Math.random() * currentRecipe.length)];
      } else {
        const wrongItems = ALL_INGREDIENTS.filter(i => !i.correct);
        item = wrongItems[Math.floor(Math.random() * wrongItems.length)];
      }
      
      const itemDiv = document.createElement('div');
      itemDiv.textContent = item.name;
      itemDiv.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:${ITEM_SIZE}px;height:${ITEM_SIZE}px;font-size:1.5rem;z-index:50;`;
      itemDiv.dataset.correct = isCorrect;
      gameArea.appendChild(itemDiv);
      
      items.push({ div: itemDiv, x, y, correct: isCorrect, name: item.name });
    }
    
    // Spawn laser
    function spawnLaser(){
      if(!gameActive) return;
      
      const rect = gameArea.getBoundingClientRect();
      const isHorizontal = Math.random() < 0.5;
      const speed = 1 + Math.random() * 2; // Increases over time
      const thickness = 3;
      
      const laser = document.createElement('div');
      if(isHorizontal){
        laser.style.cssText = `position:absolute;left:0;top:${Math.random() * rect.height}px;width:100%;height:${thickness}px;background:linear-gradient(90deg, transparent, #ff3366, transparent);box-shadow:0 0 8px #ff3366;z-index:90;`;
        lasers.push({ div: laser, x: 0, y: parseFloat(laser.style.top), horizontal: true, speed });
      } else {
        laser.style.cssText = `position:absolute;left:${Math.random() * rect.width}px;top:0;width:${thickness}px;height:100%;background:linear-gradient(180deg, transparent, #ff3366, transparent);box-shadow:0 0 8px #ff3366;z-index:90;`;
        lasers.push({ div: laser, x: parseFloat(laser.style.left), y: 0, horizontal: false, speed });
      }
      
      gameArea.appendChild(laser);
    }
    
    // Check collision with lasers
    function checkLaserCollision(){
      const pRect = { x: playerX, y: playerY, size: PLAYER_SIZE };
      
      for(const laser of lasers){
        if(laser.horizontal){
          if(Math.abs(pRect.y + pRect.size/2 - laser.y) < PLAYER_SIZE/2 + 3){
            return true;
          }
        } else {
          if(Math.abs(pRect.x + pRect.size/2 - laser.x) < PLAYER_SIZE/2 + 3){
            return true;
          }
        }
      }
      return false;
    }
    
    // Check collision with items
    function checkItemCollision(){
      for(let i = items.length - 1; i >= 0; i--){
        const item = items[i];
        const dist = Math.sqrt(Math.pow(playerX - item.x, 2) + Math.pow(playerY - item.y, 2));
        
        if(dist < PLAYER_SIZE){
          // Collect item
          gameArea.removeChild(item.div);
          items.splice(i, 1);
          
          const isRecipeItem = currentRecipe.some(r => r.name === item.name);
          
          if(isRecipeItem){
            score += CORRECT_ITEM_POINTS;
            correctItems++;
            wrongStreak = 0;
            currentCombo++;
            bestCombo = Math.max(bestCombo, currentCombo);
          } else {
            const streakPenalty = wrongStreak >= WRONG_ITEM_STREAK_THRESHOLD ? WRONG_ITEM_PENALTY * 2 : WRONG_ITEM_PENALTY;
            score = Math.max(0, score - streakPenalty);
            wrongItems++;
            wrongStreak++;
            currentCombo = 0;
          }
          
          scoreDiv.textContent = `Score: ${score}`;
        }
      }
    }
    
    // Game loop
    function gameLoop(){
      if(!gameActive) return;
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, GAME_DURATION - elapsed);
      timerDiv.textContent = `${Math.ceil(remaining/1000)}s`;
      
      // Recipe switch at 30s
      if(elapsed >= RECIPE_SWITCH_TIME && !recipeChanged){
        recipeChanged = true;
        currentRecipe = generateRecipe();
        updateRecipeDisplay();
        
        // Flash effect
        recipeCard.style.background = '#ff6b6b';
        setTimeout(() => {
          recipeCard.style.background = '#2c3a4d';
        }, 300);
      }
      
      // Move lasers
      for(let i = lasers.length - 1; i >= 0; i--){
        const laser = lasers[i];
        if(laser.horizontal){
          // Horizontal lasers move down then wrap
          laser.y += laser.speed;
          if(laser.y > gameArea.clientHeight){
            laser.y = -10;
          }
          laser.div.style.top = laser.y + 'px';
        } else {
          // Vertical lasers move right then wrap
          laser.x += laser.speed;
          if(laser.x > gameArea.clientWidth){
            laser.x = -10;
          }
          laser.div.style.left = laser.x + 'px';
        }
      }
      
      // Check laser collision
      if(checkLaserCollision()){
        lives--;
        laserHits++;
        score = Math.max(0, score - LASER_HIT_PENALTY);
        currentCombo = 0;
        
        // Drop items
        items.forEach(item => gameArea.removeChild(item.div));
        items = [];
        
        livesDiv.textContent = `Lives: ${lives}`;
        scoreDiv.textContent = `Score: ${score}`;
        
        // Flash screen
        gameArea.style.background = '#ff3366';
        setTimeout(() => {
          gameArea.style.background = '#0a1420';
        }, 200);
        
        if(lives <= 0){
          endGame();
          return;
        }
        
        // Brief invulnerability - move player to safe spot
        playerX = gameArea.clientWidth / 2;
        playerY = gameArea.clientHeight / 2;
        player.style.left = playerX + 'px';
        player.style.top = playerY + 'px';
      }
      
      // Check item collision
      checkItemCollision();
      
      // Game end
      if(remaining <= 0){
        endGame();
        return;
      }
      
      animationFrame = requestAnimationFrame(gameLoop);
    }
    
    // End game
    function endGame(){
      gameActive = false;
      if(animationFrame) cancelAnimationFrame(animationFrame);
      
      // Clear intervals
      clearInterval(itemSpawnInterval);
      clearInterval(laserSpawnInterval);
      
      // Calculate final score
      const finalScore = Math.max(0, score);
      
      // Stats
      statsDiv.innerHTML = `
        <div style="text-align:center;">
          <div style="font-size:1.2rem;color:#6fd3ff;margin-bottom:10px;">Game Over!</div>
          <div>Final Score: <strong style="color:#83bfff;">${finalScore}</strong></div>
          <div>Laser Hits: ${laserHits}</div>
          <div>Correct Items: ${correctItems}</div>
          <div>Wrong Items: ${wrongItems}</div>
          <div>Best Combo: ${bestCombo}</div>
        </div>
      `;
      
      // Set result for integration
      window.minigameResult = {
        score: finalScore,
        laserHits,
        correctItems,
        wrongItems,
        bestCombo
      };
      
      // Dispatch event
      window.dispatchEvent(new CustomEvent('minigame:end', {
        detail: { score: finalScore, stats: window.minigameResult }
      }));
      
      // Complete
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(finalScore);
        }
      }, 2000);
    }
    
    // Start game button
    document.getElementById('startGameBtn').addEventListener('click', () => {
      document.body.removeChild(instructionsOverlay);
      
      // Countdown
      const countdownDiv = document.createElement('div');
      countdownDiv.style.cssText = 'position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:4rem;color:#6fd3ff;z-index:1000;';
      gameArea.appendChild(countdownDiv);
      
      let count = 3;
      countdownDiv.textContent = count;
      const countdownInterval = setInterval(() => {
        count--;
        if(count > 0){
          countdownDiv.textContent = count;
        } else {
          countdownDiv.textContent = 'GO!';
          clearInterval(countdownInterval);
          setTimeout(() => {
            gameArea.removeChild(countdownDiv);
            startGame();
          }, 500);
        }
      }, 1000);
    });
    
    // Start game
    function startGame(){
      gameActive = true;
      startTime = Date.now();
      
      // Initial position
      playerX = gameArea.clientWidth / 2 - PLAYER_SIZE / 2;
      playerY = gameArea.clientHeight / 2 - PLAYER_SIZE / 2;
      player.style.left = playerX + 'px';
      player.style.top = playerY + 'px';
      
      lastMoveX = playerX;
      lastMoveY = playerY;
      
      // Spawn items periodically
      itemSpawnInterval = setInterval(() => {
        spawnItem();
      }, 2000);
      
      // Spawn lasers periodically (increases over time)
      laserSpawnInterval = setInterval(() => {
        spawnLaser();
      }, 3000);
      
      // Initial spawns
      spawnItem();
      spawnItem();
      spawnLaser();
      
      gameLoop();
    }
    
    let itemSpawnInterval, laserSpawnInterval;
    
    // Touch/mouse controls
    let isDragging = false;
    
    function handleStart(e){
      e.preventDefault();
      isDragging = true;
    }
    
    function handleMove(e){
      if(!isDragging || !gameActive) return;
      e.preventDefault();
      
      const touch = e.touches ? e.touches[0] : e;
      const rect = gameArea.getBoundingClientRect();
      
      const newX = touch.clientX - rect.left - PLAYER_SIZE / 2;
      const newY = touch.clientY - rect.top - PLAYER_SIZE / 2;
      
      // Clamp to boundaries
      playerX = Math.max(0, Math.min(rect.width - PLAYER_SIZE, newX));
      playerY = Math.max(0, Math.min(rect.height - PLAYER_SIZE, newY));
      
      player.style.left = playerX + 'px';
      player.style.top = playerY + 'px';
      
      // Check movement for camping detection
      const dist = Math.sqrt(Math.pow(playerX - lastMoveX, 2) + Math.pow(playerY - lastMoveY, 2));
      if(dist > MOVE_THRESHOLD){
        lastMoveTime = Date.now();
        lastMoveX = playerX;
        lastMoveY = playerY;
      }
    }
    
    function handleEnd(e){
      isDragging = false;
    }
    
    gameArea.addEventListener('touchstart', handleStart);
    gameArea.addEventListener('touchmove', handleMove);
    gameArea.addEventListener('touchend', handleEnd);
    gameArea.addEventListener('mousedown', handleStart);
    gameArea.addEventListener('mousemove', handleMove);
    gameArea.addEventListener('mouseup', handleEnd);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.laserPantryDash = { render };

})(window);
