// MODULE: minigames/reaction-royale.js
// Reaction Royale - Multi-round reaction time challenge with increasing difficulty

(function(g){
  'use strict';

  const STORAGE_KEY = 'bb_sp_competitions_v1';

  function saveScore(gameName, score){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      if(!data[gameName] || score > data[gameName]){
        data[gameName] = score;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch(e){}
  }

  function loadBestScore(gameName){
    try {
      const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return data[gameName] || 0;
    } catch(e){
      return 0;
    }
  }

  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    const title = document.createElement('h3');
    title.textContent = 'Reaction Royale';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const bestScore = loadBestScore('reactionRoyale');
    const bestDisplay = document.createElement('div');
    bestDisplay.textContent = `Best: ${Math.round(bestScore)}`;
    bestDisplay.style.cssText = 'font-size:0.75rem;color:#95a9c0;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Tap when the signal changes! 5 rounds, get faster each time!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const reactionBox = document.createElement('div');
    reactionBox.style.cssText = 'width:280px;height:280px;border-radius:16px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;font-weight:bold;cursor:pointer;transition:background 0.15s;background:#2c3a4d;color:#e3ecf5;user-select:none;touch-action:manipulation;border:4px solid #1d2734;';
    reactionBox.innerHTML = '<div style="text-align:center;">Tap to<br/>Start</div>';
    
    const progress = document.createElement('div');
    progress.style.cssText = 'font-size:0.85rem;color:#83bfff;';
    progress.textContent = 'Round 0/5';
    
    const result = document.createElement('div');
    result.style.cssText = 'font-size:1rem;color:#83bfff;min-height:30px;text-align:center;';
    
    let state = 'idle';
    let startTime = 0;
    let timeout = null;
    const reactions = [];
    const totalRounds = 5;
    let currentRound = 0;
    let gameActive = false;
    let isPaused = false;
    
    // Pause on visibility change
    function handleVisibilityChange(){
      if(document.hidden && gameActive && state === 'waiting'){
        isPaused = true;
        clearTimeout(timeout);
        state = 'paused';
        reactionBox.style.background = '#4a5568';
        reactionBox.innerHTML = '<div style="text-align:center;">Game<br/>Paused</div>';
        result.textContent = 'Tab away paused the game';
      }
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    function startRound(){
      if(currentRound >= totalRounds){
        finishGame();
        return;
      }
      
      currentRound++;
      progress.textContent = `Round ${currentRound}/${totalRounds}`;
      state = 'waiting';
      reactionBox.style.background = '#ff6d6d';
      reactionBox.innerHTML = '<div style="text-align:center;">Wait for<br/>GREEN</div>';
      result.textContent = '';
      
      // Random delay 800ms to 2500ms
      const delay = 800 + Math.random() * 1700;
      timeout = setTimeout(() => {
        if(isPaused) return;
        state = 'ready';
        reactionBox.style.background = '#77d58d';
        reactionBox.innerHTML = '<div style="text-align:center;font-size:2rem;">TAP!</div>';
        startTime = performance.now();
      }, delay);
    }
    
    function finishGame(){
      gameActive = false;
      state = 'done';
      
      const avgReaction = reactions.reduce((a,b) => a+b, 0) / reactions.length;
      const bestReaction = Math.min(...reactions);
      
      reactionBox.style.background = '#83bfff';
      reactionBox.innerHTML = `<div style="text-align:center;font-size:1.2rem;">Complete!</div>`;
      result.textContent = `Avg: ${Math.round(avgReaction)}ms | Best: ${Math.round(bestReaction)}ms`;
      
      // Score calculation: 
      // Average 200ms = 100 points, 400ms = 50 points, 600ms+ = 20 points
      // Use exponential curve for better distribution
      const baseScore = Math.max(20, Math.min(100, 200 - (avgReaction - 200) * 0.4));
      
      // Bonus for consistency (low variance)
      const variance = reactions.reduce((sum, rt) => sum + Math.pow(rt - avgReaction, 2), 0) / reactions.length;
      const stdDev = Math.sqrt(variance);
      const consistencyBonus = Math.max(0, (100 - stdDev) * 0.1);
      
      const rawScore = Math.min(100, baseScore + consistencyBonus);
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[ReactionRoyale] Win probability applied: success forced to loss');
        }
      }
      
      // Save best score
      saveScore('reactionRoyale', finalScore);
      
      // Cleanup
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      
      setTimeout(() => {
        onComplete(finalScore);
      }, 2500);
    }
    
    reactionBox.addEventListener('click', () => {
      if(state === 'idle'){
        gameActive = true;
        startRound();
        
      } else if(state === 'waiting'){
        // Too early!
        clearTimeout(timeout);
        state = 'penalty';
        reactionBox.style.background = '#ff6d6d';
        reactionBox.innerHTML = '<div style="text-align:center;">Too<br/>Early!</div>';
        result.textContent = 'Wait for GREEN - penalty added';
        
        // Add penalty time
        reactions.push(800);
        
        setTimeout(() => {
          if(currentRound < totalRounds){
            startRound();
          } else {
            finishGame();
          }
        }, 1500);
        
      } else if(state === 'ready'){
        // Good tap!
        const reactionTime = performance.now() - startTime;
        reactions.push(reactionTime);
        
        state = 'showing_result';
        reactionBox.style.background = '#2c3a4d';
        reactionBox.innerHTML = '<div style="text-align:center;">Good!</div>';
        result.textContent = `${Math.round(reactionTime)}ms`;
        
        setTimeout(() => {
          startRound();
        }, 800);
      }
    }, { passive: false });
    
    wrapper.appendChild(title);
    wrapper.appendChild(bestDisplay);
    wrapper.appendChild(instructions);
    wrapper.appendChild(progress);
    wrapper.appendChild(reactionBox);
    wrapper.appendChild(result);
    container.appendChild(wrapper);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.reactionRoyale = { render };

})(window);
