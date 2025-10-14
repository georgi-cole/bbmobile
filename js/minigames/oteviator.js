// MODULE: minigames/oteviator.js
// Oteviator - Elevator timing challenge

(function(g){
  'use strict';

  /**
   * Oteviator minigame
   * Press at the perfect moment to stop elevator at target floors
   * Score based on timing accuracy across 5 floors
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
    title.textContent = 'Oteviator';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Press when elevator reaches the target floor!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Score: 0';
    scoreDiv.style.cssText = 'font-size:1.5rem;font-weight:bold;color:#83bfff;';
    
    const roundDiv = document.createElement('div');
    roundDiv.textContent = 'Floor 1/5';
    roundDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;';
    
    // Elevator shaft display
    const shaftDiv = document.createElement('div');
    shaftDiv.style.cssText = 'position:relative;width:120px;height:300px;background:#2c3a4d;border:2px solid #3d4f64;border-radius:8px;margin:20px 0;';
    
    // Target floor indicator
    const targetDiv = document.createElement('div');
    targetDiv.style.cssText = 'position:absolute;left:0;right:0;height:40px;background:rgba(131,191,255,0.3);border:2px solid #83bfff;';
    
    // Elevator car
    const elevatorDiv = document.createElement('div');
    elevatorDiv.style.cssText = 'position:absolute;left:10px;right:10px;height:35px;background:#83bfff;border-radius:4px;bottom:0;transition:bottom 0.05s linear;';
    
    const tapBtn = document.createElement('button');
    tapBtn.className = 'btn primary';
    tapBtn.textContent = 'STOP ELEVATOR';
    tapBtn.style.cssText = 'font-size:1.2rem;padding:15px 30px;';
    
    shaftDiv.appendChild(targetDiv);
    shaftDiv.appendChild(elevatorDiv);
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(roundDiv);
    wrapper.appendChild(shaftDiv);
    wrapper.appendChild(tapBtn);
    container.appendChild(wrapper);
    
    let totalScore = 0;
    let currentRound = 1;
    const maxRounds = 5;
    let elevatorPosition = 0;
    let targetPosition = 0;
    let isMoving = false;
    let animationId = null;
    
    function startRound(){
      // Random target floor (20-80% of shaft height)
      targetPosition = 20 + Math.random() * 60;
      targetDiv.style.bottom = targetPosition + '%';
      
      elevatorPosition = 0;
      elevatorDiv.style.bottom = '0%';
      
      tapBtn.disabled = false;
      isMoving = true;
      
      // Move elevator upward
      function moveElevator(){
        if(!isMoving) return;
        
        elevatorPosition += 0.5; // Speed
        elevatorDiv.style.bottom = elevatorPosition + '%';
        
        // Auto-stop at top
        if(elevatorPosition >= 90){
          isMoving = false;
          evaluateRound();
          return;
        }
        
        animationId = requestAnimationFrame(moveElevator);
      }
      
      animationId = requestAnimationFrame(moveElevator);
    }
    
    function evaluateRound(){
      if(animationId){
        cancelAnimationFrame(animationId);
        animationId = null;
      }
      
      tapBtn.disabled = true;
      
      // Calculate accuracy
      const difference = Math.abs(elevatorPosition - targetPosition);
      let roundScore = 0;
      
      if(difference <= 3){
        roundScore = 100; // Perfect
      } else if(difference <= 6){
        roundScore = 80; // Great
      } else if(difference <= 10){
        roundScore = 60; // Good
      } else if(difference <= 15){
        roundScore = 40; // OK
      } else {
        roundScore = 20; // Miss
      }
      
      totalScore += roundScore;
      scoreDiv.textContent = `Score: ${totalScore}`;
      
      // Next round or finish
      if(currentRound < maxRounds){
        currentRound++;
        roundDiv.textContent = `Floor ${currentRound}/${maxRounds}`;
        setTimeout(startRound, 1200);
      } else {
        // Game complete
        const finalScore = Math.round(totalScore / maxRounds);
        
        // Apply win probability logic
        let adjustedScore = finalScore;
        const playerSucceeded = finalScore >= 60;
        
        if(g.GameUtils && !debugMode && competitionMode){
          const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
          if(!shouldWin && playerSucceeded){
            adjustedScore = Math.round(30 + Math.random() * 25);
          }
        }
        
        setTimeout(() => onComplete(adjustedScore), 800);
      }
    }
    
    tapBtn.addEventListener('click', () => {
      if(!isMoving) return;
      isMoving = false;
      evaluateRound();
    });
    
    // Start first round
    startRound();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.oteviator = { render };

})(window);
