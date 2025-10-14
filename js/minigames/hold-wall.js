// MODULE: minigames/hold-wall.js
// Hold Wall - Endurance wall hold challenge

(function(g){
  'use strict';

  /**
   * Hold Wall minigame
   * Hold your finger/mouse on the wall without moving
   * Score based on endurance (how long you hold)
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
    title.textContent = 'Hold Wall';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Hold the wall without moving for as long as possible!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const timerDiv = document.createElement('div');
    timerDiv.textContent = '0.0s';
    timerDiv.style.cssText = 'font-size:2.5rem;font-weight:bold;color:#83bfff;';
    
    const statusDiv = document.createElement('div');
    statusDiv.textContent = 'Press and hold the wall to start...';
    statusDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:20px;';
    
    // Wall target
    const wallDiv = document.createElement('div');
    wallDiv.textContent = 'WALL';
    wallDiv.style.cssText = 'width:200px;height:200px;background:#2c3a4d;border:3px solid #83bfff;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:2rem;font-weight:bold;color:#83bfff;cursor:pointer;user-select:none;margin:20px 0;';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(statusDiv);
    wrapper.appendChild(wallDiv);
    container.appendChild(wrapper);
    
    let startTime = null;
    let holdDuration = 0;
    let isHolding = false;
    let timerInterval = null;
    let initialPos = null;
    let moveThreshold = 15; // pixels
    
    function startHold(e){
      if(isHolding) return;
      
      isHolding = true;
      startTime = Date.now();
      
      // Record initial position
      if(e.touches){
        initialPos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      } else {
        initialPos = { x: e.clientX, y: e.clientY };
      }
      
      wallDiv.style.background = '#83bfff';
      wallDiv.style.color = '#1a2332';
      statusDiv.textContent = 'Holding... Stay still!';
      
      // Start timer display
      timerInterval = setInterval(() => {
        holdDuration = (Date.now() - startTime) / 1000;
        timerDiv.textContent = holdDuration.toFixed(1) + 's';
      }, 50);
    }
    
    function checkMove(e){
      if(!isHolding || !initialPos) return;
      
      let currentX, currentY;
      if(e.touches){
        currentX = e.touches[0].clientX;
        currentY = e.touches[0].clientY;
      } else {
        currentX = e.clientX;
        currentY = e.clientY;
      }
      
      const distance = Math.sqrt(
        Math.pow(currentX - initialPos.x, 2) + 
        Math.pow(currentY - initialPos.y, 2)
      );
      
      if(distance > moveThreshold){
        endHold(true); // Moved too much
      }
    }
    
    function endHold(moved = false){
      if(!isHolding) return;
      
      isHolding = false;
      clearInterval(timerInterval);
      
      holdDuration = (Date.now() - startTime) / 1000;
      
      wallDiv.style.background = '#2c3a4d';
      wallDiv.style.color = '#83bfff';
      
      if(moved){
        statusDiv.textContent = 'You moved! Final time: ' + holdDuration.toFixed(1) + 's';
        statusDiv.style.color = '#ff6b6b';
      } else {
        statusDiv.textContent = 'Released! Time: ' + holdDuration.toFixed(1) + 's';
      }
      
      // Calculate score (0-15s range, perfect = 15s+)
      let rawScore;
      if(holdDuration >= 15){
        rawScore = 100;
      } else if(holdDuration >= 10){
        rawScore = 70 + (holdDuration - 10) * 6;
      } else if(holdDuration >= 5){
        rawScore = 40 + (holdDuration - 5) * 6;
      } else {
        rawScore = holdDuration * 8;
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
    
    // Mouse events
    wallDiv.addEventListener('mousedown', startHold);
    wallDiv.addEventListener('mousemove', checkMove);
    wallDiv.addEventListener('mouseup', () => endHold(false));
    wallDiv.addEventListener('mouseleave', () => endHold(false));
    
    // Touch events
    wallDiv.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startHold(e);
    });
    wallDiv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      checkMove(e);
    });
    wallDiv.addEventListener('touchend', (e) => {
      e.preventDefault();
      endHold(false);
    });
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.holdWall = { render };

})(window);
