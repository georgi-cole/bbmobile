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
    
    // Canvas for game (two side-by-side panels)
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 300;
    canvas.style.cssText = 'border:3px solid #3d4f64;background:#1a2332;border-radius:4px;cursor:crosshair;max-width:100%;';
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
    let comicElements = [];
    
    function generateComicScene(){
      // Generate a random comic scene with various elements
      comicElements = [];
      const elementTypes = ['circle', 'square', 'triangle', 'star', 'heart'];
      const colors = ['#ff6b9d', '#83bfff', '#f7b955', '#74e48b', '#b19cd9'];
      
      // Create 8-12 random elements for the comic panel
      const numElements = 8 + Math.floor(Math.random() * 5);
      for(let i = 0; i < numElements; i++){
        comicElements.push({
          type: elementTypes[Math.floor(Math.random() * elementTypes.length)],
          x: 30 + Math.random() * (canvas.width / 2 - 80),
          y: 30 + Math.random() * (canvas.height - 60),
          size: 15 + Math.random() * 20,
          color: colors[Math.floor(Math.random() * colors.length)],
          rotation: Math.random() * Math.PI * 2
        });
      }
    }
    
    function generateDifferences(){
      differences = [];
      const count = hardMode ? 7 : 5;
      
      // Generate differences based on existing elements
      // Types: color change, size change, position shift, missing element, extra element
      const availableIndices = comicElements.map((_, i) => i);
      
      for(let i = 0; i < Math.min(count, comicElements.length); i++){
        const idx = availableIndices.splice(Math.floor(Math.random() * availableIndices.length), 1)[0];
        const element = comicElements[idx];
        const diffType = Math.floor(Math.random() * 3); // 0: color, 1: size, 2: position
        
        const diff = {
          elementIndex: idx,
          type: diffType,
          x: element.x + canvas.width / 2, // Right panel X position
          y: element.y,
          radius: 25,
          found: false
        };
        
        // Store the difference modification
        if(diffType === 0){
          // Color change
          const colors = ['#ff6b9d', '#83bfff', '#f7b955', '#74e48b', '#b19cd9'];
          const otherColors = colors.filter(c => c !== element.color);
          diff.newColor = otherColors[Math.floor(Math.random() * otherColors.length)];
        } else if(diffType === 1){
          // Size change
          diff.newSize = element.size * (Math.random() > 0.5 ? 1.5 : 0.6);
        } else {
          // Position shift
          diff.offsetX = (Math.random() - 0.5) * 40;
          diff.offsetY = (Math.random() - 0.5) * 40;
        }
        
        differences.push(diff);
      }
      
      totalPossible += count;
    }
    
    function drawElement(element, offsetX = 0, offsetY = 0, colorOverride = null, sizeOverride = null){
      ctx.save();
      ctx.translate(element.x + offsetX, element.y + offsetY);
      ctx.rotate(element.rotation);
      
      const size = sizeOverride || element.size;
      const color = colorOverride || element.color;
      ctx.fillStyle = color;
      ctx.strokeStyle = '#0f1419';
      ctx.lineWidth = 2;
      
      switch(element.type){
        case 'circle':
          ctx.beginPath();
          ctx.arc(0, 0, size, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          break;
        case 'square':
          ctx.fillRect(-size, -size, size * 2, size * 2);
          ctx.strokeRect(-size, -size, size * 2, size * 2);
          break;
        case 'triangle':
          ctx.beginPath();
          ctx.moveTo(0, -size);
          ctx.lineTo(size, size);
          ctx.lineTo(-size, size);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'star':
          ctx.beginPath();
          for(let i = 0; i < 5; i++){
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = Math.cos(angle) * size;
            const y = Math.sin(angle) * size;
            if(i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          break;
        case 'heart':
          ctx.beginPath();
          ctx.moveTo(0, size * 0.3);
          ctx.bezierCurveTo(-size * 0.5, -size * 0.5, -size, size * 0.1, 0, size);
          ctx.bezierCurveTo(size, size * 0.1, size * 0.5, -size * 0.5, 0, size * 0.3);
          ctx.fill();
          ctx.stroke();
          break;
      }
      
      ctx.restore();
    }
    
    function drawScene(){
      // Clear
      ctx.fillStyle = '#1a2332';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Draw left panel background (original)
      ctx.fillStyle = '#2c3a4d';
      ctx.fillRect(5, 5, canvas.width / 2 - 10, canvas.height - 10);
      
      // Draw right panel background (with differences)
      ctx.fillStyle = '#2c3a4d';
      ctx.fillRect(canvas.width / 2 + 5, 5, canvas.width / 2 - 10, canvas.height - 10);
      
      // Draw center divider
      ctx.fillStyle = '#3d4f64';
      ctx.fillRect(canvas.width / 2 - 2, 0, 4, canvas.height);
      
      // Draw LEFT panel elements (original)
      comicElements.forEach((element, idx) => {
        drawElement(element, 0, 0);
      });
      
      // Draw RIGHT panel elements (with differences)
      comicElements.forEach((element, idx) => {
        // Check if this element has a difference
        const diff = differences.find(d => d.elementIndex === idx);
        
        if(diff){
          // Draw with difference
          const offsetX = canvas.width / 2 + (diff.offsetX || 0);
          const offsetY = diff.offsetY || 0;
          const color = diff.newColor || null;
          const size = diff.newSize || null;
          
          drawElement(element, offsetX, offsetY, color, size);
        } else {
          // Draw normally
          drawElement(element, canvas.width / 2, 0);
        }
      });
      
      // Draw difference highlights (visible only if found or in debug mode)
      differences.forEach((diff, idx) => {
        if(diff.found){
          // Draw found difference - highlight on both sides
          ctx.strokeStyle = '#74e48b';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(diff.x, diff.y, diff.radius, 0, Math.PI * 2);
          ctx.stroke();
          
          // Draw X
          ctx.strokeStyle = '#74e48b';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(diff.x - 10, diff.y - 10);
          ctx.lineTo(diff.x + 10, diff.y + 10);
          ctx.moveTo(diff.x + 10, diff.y - 10);
          ctx.lineTo(diff.x - 10, diff.y + 10);
          ctx.stroke();
        } else if(debugMode){
          // Show hitboxes in debug mode
          ctx.strokeStyle = 'rgba(255,107,107,0.5)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(diff.x, diff.y, diff.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      });
      
      // Instructions overlay
      ctx.fillStyle = 'rgba(149, 169, 192, 0.9)';
      ctx.font = 'bold 13px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Find the differences between the two panels!', canvas.width/2, canvas.height - 10);
    }
    
    function startRound(){
      foundDifferences.clear();
      timeRemaining = timeLimit;
      
      generateComicScene();
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
