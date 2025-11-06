// MODULE: minigames/slippery-shuttle.js
// Slippery Shuttle - Navigate slippery platforms with momentum

(function(g){
  'use strict';

  /**
   * Slippery Shuttle minigame
   * Navigate platforms with slippery physics (momentum continues)
   * Reach the goal platform as fast as possible
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Slippery Shuttle';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Navigate slippery platforms to reach the goal!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = 'Time: 0.0s';
    timerDiv.style.cssText = 'font-size:1.2rem;font-weight:bold;color:#83bfff;';
    
    // Canvas
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 400;
    // disable touch-action default gestures on the canvas to reduce accidental double-tap zoom/pinch interactions
    canvas.style.cssText = 'border:3px solid #3d4f64;background:#1a2332;border-radius:4px;touch-action:none;';
    const ctx = canvas.getContext('2d');
    
    // Control buttons
    const controlsDiv = document.createElement('div');
    controlsDiv.style.cssText = 'display:grid;grid-template-columns:repeat(3,60px);gap:5px;';
    
    const btnUp = createBtn('▲');
    const btnLeft = createBtn('◀');
    const btnDown = createBtn('▼');
    const btnRight = createBtn('▶');
    
    controlsDiv.appendChild(document.createElement('div'));
    controlsDiv.appendChild(btnUp);
    controlsDiv.appendChild(document.createElement('div'));
    controlsDiv.appendChild(btnLeft);
    controlsDiv.appendChild(btnDown);
    controlsDiv.appendChild(btnRight);
    
    function createBtn(text){
      const btn = document.createElement('button');
      btn.textContent = text;
      btn.className = 'btn';
      // touch-action manipulation reduces accidental zoom / double-tap issues on mobile
      btn.style.cssText = 'width:60px;height:60px;font-size:1.5rem;padding:0;touch-action:manipulation;-webkit-tap-highlight-color:transparent;';
      // make touchstart passive false to be able to preventDefault if needed (some platforms)
      btn.addEventListener('touchstart', (ev) => {
        // prevent synthetic double-tap zoom and stop propagation to higher level handlers
        ev.preventDefault();
        ev.stopPropagation();
      }, { passive: false });
      return btn;
    }
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(canvas);
    wrapper.appendChild(controlsDiv);
    container.appendChild(wrapper);
    
    // Game state
    const player = {x: 50, y: 350, vx: 0, vy: 0, size: 20};
    const goal = {x: 350, y: 50, size: 25};
    
    const platforms = [
      {x: 20, y: 330, w: 80, h: 60}, // Start platform
      {x: 150, y: 280, w: 100, h: 20},
      {x: 280, y: 230, w: 80, h: 20},
      {x: 180, y: 150, w: 100, h: 20},
      {x: 300, y: 80, w: 100, h: 20}, // Goal platform
    ];
    
    const friction = 0.92;
    const acceleration = 0.8;
    const gravity = 0.5;
    let onGround = false;
    let startTime = Date.now();
    let gameOver = false;
    let timerInterval = null;
    let gameLoop = null;

    // Minimum active time to ignore accidental immediate win/lose right after starting
    const STARTUP_GRACE_MS = 300;

    function update(){
      if(gameOver) return;
      
      // Apply velocity
      player.x += player.vx;
      player.y += player.vy;
      
      // Apply friction when on ground
      if(onGround){
        player.vx *= friction;
        player.vy = 0;
      } else {
        // Gravity when in air
        player.vy += gravity;
      }
      
      // Check platform collisions
      onGround = false;
      for(const plat of platforms){
        // Simple AABB collision
        if(player.x + player.size > plat.x &&
           player.x < plat.x + plat.w &&
           player.y + player.size > plat.y &&
           player.y < plat.y + plat.h){
          
          // Land on top of platform
          if(player.vy > 0 && player.y < plat.y + 10){
            player.y = plat.y - player.size;
            player.vy = 0;
            onGround = true;
          }
        }
      }
      
      // Bounds
      if(player.x < 0) player.x = 0;
      if(player.x > canvas.width - player.size) player.x = canvas.width - player.size;
      if(player.y > canvas.height){
        // Fell off
        lose();
        return;
      }
      
      // Check goal (guarded by startup grace to avoid accidental immediate wins)
      const elapsedSinceStart = Date.now() - startTime;
      const dist = Math.sqrt(
        Math.pow(player.x - goal.x, 2) + 
        Math.pow(player.y - goal.y, 2)
      );
      if(elapsedSinceStart >= STARTUP_GRACE_MS && dist < player.size + goal.size){
        win();
      }
      
      draw();
    }
    
    function draw(){
      // Clear
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Platforms
      ctx.fillStyle = '#2c3a4d';
      platforms.forEach(plat => {
        ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
      });
      
      // Goal
      ctx.fillStyle = '#74e48b';
      ctx.beginPath();
      ctx.arc(goal.x, goal.y, goal.size, 0, Math.PI * 2);
      ctx.fill();
      
      // Player
      ctx.fillStyle = '#83bfff';
      ctx.beginPath();
      ctx.arc(player.x + player.size/2, player.y + player.size/2, player.size/2, 0, Math.PI * 2);
      ctx.fill();
    }
    
    function applyForce(fx, fy){
      if(gameOver) return;
      player.vx += fx;
      player.vy += fy;
    }
    
    function win(){
      // Prevent spurious wins during startup
      if(Date.now() - startTime < STARTUP_GRACE_MS) return;

      gameOver = true;
      clearInterval(timerInterval);
      cancelAnimationFrame(gameLoop);
      try { document.removeEventListener('keydown', keydownHandler); } catch(e){}
      
      const elapsed = (Date.now() - startTime) / 1000;
      
      // Score: faster = better (target ~10s)
      let rawScore;
      if(elapsed <= 8){
        rawScore = 100;
      } else if(elapsed <= 15){
        rawScore = 90 - (elapsed - 8) * 4;
      } else if(elapsed <= 25){
        rawScore = 62 - (elapsed - 15) * 2;
      } else {
        rawScore = Math.max(30, 42 - (elapsed - 25));
      }
      
      rawScore = Math.round(rawScore);
      const maxScore = 100;
      
      instructions.textContent = `Goal reached! Time: ${elapsed.toFixed(1)}s`;
      instructions.style.color = '#74e48b';
      
      // Determine if player succeeded (legacy threshold for backward compatibility)
      const playerSucceeded = rawScore >= 60;
      
      // Apply new centralized outcome logic in competition mode
      let finalScore = rawScore;
      if(g.GameUtils && g.GameUtils.evaluateOutcome && !debugMode && competitionMode){
        const outcome = g.GameUtils.evaluateOutcome(rawScore, maxScore, {
          usedSkip: false,
          failed: !playerSucceeded,
          cheated: false
        });
        
        finalScore = outcome.finalScore;
        
        // If player succeeded but didn't win, coerce to loss band for consistent UX
        if(rawScore >= 60 && !outcome.didWin && !g.cfg?.debugAlwaysWin){
          finalScore = g.GameUtils.coerceSuccessToLossScore(finalScore);
          console.log('[SlipperyShuttle] Win probability applied: success forced to loss, score:', finalScore);
        }
        
        if(outcome.didWin){
          console.log('[SlipperyShuttle] Player won! Reasons:', outcome.reasons.join('; '));
        } else {
          console.log('[SlipperyShuttle] Player lost. Reasons:', outcome.reasons.join('; '));
        }
      }
      
      setTimeout(() => onComplete(finalScore), 1500);
    }
    
    function lose(){
      // Prevent spurious loses during startup
      if(Date.now() - startTime < STARTUP_GRACE_MS) return;

      gameOver = true;
      clearInterval(timerInterval);
      cancelAnimationFrame(gameLoop);
      try { document.removeEventListener('keydown', keydownHandler); } catch(e){}
      
      instructions.textContent = 'Fell off! Try again next time.';
      instructions.style.color = '#ff6b6b';
      
      setTimeout(() => onComplete(25), 1500);
    }
    
    // Controls - store handler reference for cleanup
    const keydownHandler = (e) => {
      if(gameOver) return;
      
      // explicit preventDefault for arrow keys
      if(e.key === 'ArrowLeft' || e.key === 'a'){
        e.preventDefault();
        applyForce(-acceleration, 0);
      } else if(e.key === 'ArrowRight' || e.key === 'd'){
        e.preventDefault();
        applyForce(acceleration, 0);
      } else if(e.key === 'ArrowUp' || e.key === 'w'){
        e.preventDefault();
        if(onGround){
          applyForce(0, -12); // Jump
        }
      }
    };
    
    // attach keydown so preventDefault works on mobile/desktop
    document.addEventListener('keydown', keydownHandler, { passive: false });
    
    // Button click/touch handlers - prevent default and stop propagation to avoid accidental gestures or bubbling
    btnLeft.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); applyForce(-acceleration, 0); });
    btnRight.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); applyForce(acceleration, 0); });
    btnUp.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); if(onGround) applyForce(0, -12); });

    // Also add touch handlers as some platforms synthesize clicks from touch
    btnLeft.addEventListener('touchend', (ev) => { ev.preventDefault(); ev.stopPropagation(); applyForce(-acceleration, 0); }, { passive: false });
    btnRight.addEventListener('touchend', (ev) => { ev.preventDefault(); ev.stopPropagation(); applyForce(acceleration, 0); }, { passive: false });
    btnUp.addEventListener('touchend', (ev) => { ev.preventDefault(); ev.stopPropagation(); if(onGround) applyForce(0, -12); }, { passive: false });

    // Timer
    timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      timerDiv.textContent = `Time: ${elapsed}s`;
    }, 100);
    
    // Game loop
    function loop(){
      update();
      gameLoop = requestAnimationFrame(loop);
    }
    
    draw();
    loop();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.slipperyShuttle = { render };

})(window);
