// MODULE: minigames/comix-spot.js
// Comix Spot - Spot differences in comic panels

(function(g){
  'use strict';

  /**
   * Comix Spot minigame
   * Find differences between two comic panels
   * Hard mode variant: more differences, less time
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
      variant = 'normal' // 'normal' or 'hard'
    } = options;
    
    const hardMode = variant === 'hard';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = hardMode ? 'Comix Spot (Hard Mode)' : 'Comix Spot';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    const differencesCount = hardMode ? 7 : 5;
    instructions.textContent = `Find ${differencesCount} differences!`;
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const roundDiv = document.createElement('div');
    roundDiv.textContent = 'Round 1/3';
    roundDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    const foundDiv = document.createElement('div');
    foundDiv.textContent = `Found: 0/${differencesCount}`;
    foundDiv.style.cssText = 'font-size:1.2rem;font-weight:bold;color:#f7b955;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = hardMode ? 'Time: 20s' : 'Time: 30s';
    timerDiv.style.cssText = 'font-size:1rem;color:#95a9c0;';
    
    // Canvas for game (placeholder for images)
    const canvas = document.createElement('canvas');
    canvas.width = 350;
    canvas.height = 250;
    canvas.style.cssText = 'border:3px solid #3d4f64;background:#1a2332;border-radius:4px;cursor:crosshair;';
    const ctx = canvas.getContext('2d');
    
    const skipBtn = document.createElement('button');
    skipBtn.className = 'btn';
    skipBtn.textContent = 'Give Up';
    skipBtn.style.cssText = 'margin-top:10px;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(roundDiv);
    wrapper.appendChild(foundDiv);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(canvas);
    wrapper.appendChild(skipBtn);
    container.appendChild(wrapper);
    
    let currentRound = 1;
    const maxRounds = 3;
    let differences = [];
    let foundDifferences = new Set();
    let timeLimit = hardMode ? 20 : 30;
    let timeRemaining = timeLimit;
    let timerInterval = null;
    let totalFound = 0;
    let totalPossible = 0;
    
    function generateDifferences(){
      differences = [];
      const count = hardMode ? 7 : 5;
      
      // Generate random difference locations (circles on canvas)
      for(let i = 0; i < count; i++){
        differences.push({
          x: 30 + Math.random() * (canvas.width - 60),
          y: 30 + Math.random() * (canvas.height - 60),
          radius: 20,
          found: false
        });
      }
      
      totalPossible += count;
    }
    
    function drawScene(){
      // Clear
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw placeholder comic panel
      ctx.fillStyle = '#2c3a4d';
      ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
      
      // Draw some simple shapes to represent comic elements
      ctx.fillStyle = '#3d4f64';
      for(let i = 0; i < 8; i++){
        const x = 30 + (i % 4) * 80;
        const y = 30 + Math.floor(i / 4) * 100;
        ctx.fillRect(x, y, 60, 80);
      }
      
      // Draw difference circles (visible only if found or in debug mode)
      differences.forEach((diff, idx) => {
        if(diff.found){
          // Draw found difference
          ctx.strokeStyle = '#74e48b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(diff.x, diff.y, diff.radius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw X
          ctx.strokeStyle = '#74e48b';
          ctx.beginPath();
          ctx.moveTo(diff.x - 10, diff.y - 10);
          ctx.lineTo(diff.x + 10, diff.y + 10);
          ctx.moveTo(diff.x + 10, diff.y - 10);
          ctx.lineTo(diff.x - 10, diff.y + 10);
          ctx.stroke();
        } else if(debugMode){
          // Show hitboxes in debug mode
          ctx.strokeStyle = 'rgba(255,107,107,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(diff.x, diff.y, diff.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      
      // Instructions overlay
      ctx.fillStyle = 'rgba(149, 169, 192, 0.8)';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Click on differences (placeholder panel)', canvas.width/2, canvas.height - 15);
    }
    
    function startRound(){
      foundDifferences.clear();
      timeRemaining = timeLimit;
      
      generateDifferences();
      drawScene();
      
      foundDiv.textContent = `Found: 0/${differences.length}`;
      timerDiv.textContent = `Time: ${timeRemaining}s`;
      
      // Start timer
      timerInterval = setInterval(() => {
        timeRemaining--;
        timerDiv.textContent = `Time: ${timeRemaining}s`;
        
        if(timeRemaining <= 5){
          timerDiv.style.color = '#ff6b6b';
        }
        
        if(timeRemaining <= 0){
          endRound(false);
        }
      }, 1000);
    }
    
    function checkClick(x, y){
      for(let i = 0; i < differences.length; i++){
        if(foundDifferences.has(i)) continue;
        
        const diff = differences[i];
        const distance = Math.sqrt(
          Math.pow(x - diff.x, 2) + 
          Math.pow(y - diff.y, 2)
        );
        
        if(distance <= diff.radius){
          // Found a difference!
          foundDifferences.add(i);
          diff.found = true;
          totalFound++;
          
          foundDiv.textContent = `Found: ${foundDifferences.size}/${differences.length}`;
          drawScene();
          
          // Check if all found
          if(foundDifferences.size === differences.length){
            endRound(true);
          }
          
          return;
        }
      }
    }
    
    function endRound(complete){
      clearInterval(timerInterval);
      
      if(complete){
        instructions.textContent = 'All found!';
        instructions.style.color = '#74e48b';
      } else {
        instructions.textContent = 'Time\'s up!';
        instructions.style.color = '#ff6b6b';
      }
      
      setTimeout(() => {
        instructions.textContent = `Find ${differencesCount} differences!`;
        instructions.style.color = '#95a9c0';
        timerDiv.style.color = '#95a9c0';
        
        if(currentRound < maxRounds){
          currentRound++;
          roundDiv.textContent = `Round ${currentRound}/${maxRounds}`;
          startRound();
        } else {
          finishGame();
        }
      }, 1500);
    }
    
    function finishGame(){
      clearInterval(timerInterval);
      
      // Score based on how many found out of total possible
      const rawScore = Math.round((totalFound / totalPossible) * 100);
      
      const playerSucceeded = rawScore >= 60;
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          finalScore = Math.round(30 + Math.random() * 25);
        }
      }
      
      setTimeout(() => onComplete(finalScore), 500);
    }
    
    // Click handler
    canvas.addEventListener('click', (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      checkClick(x, y);
    });
    
    skipBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      
      // Calculate score based on what was found
      const rawScore = Math.round((totalFound / totalPossible) * 100);
      setTimeout(() => onComplete(Math.max(25, rawScore)), 300);
    });
    
    // Start first round
    startRound();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.comixSpot = { render };

})(window);
