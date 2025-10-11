// MODULE: minigames/word-typing.js
// Word Typing - Type passage accurately and quickly
// Migrated from legacy minigames.js (marked as retired - not mobile-friendly)

(function(g){
  'use strict';

  /**
   * Word Typing minigame
   * Player types a Big Brother-themed passage within time limit
   * Score based on accuracy and completion
   * Note: Marked as retired due to poor mobile keyboard experience
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      debugMode = false, 
      competitionMode = false
    } = options;
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:500px;margin:0 auto;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Word Typing';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Type the passage in 15s. Accuracy matters.';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Word pool
    const words = ['house', 'alliance', 'veto', 'nominee', 'strategy', 'social', 'jury', 'twist', 'vote', 'drama', 'compete', 'target', 'backdoor', 'double', 'triple'];
    
    // Generate passage
    const rng = g.rng || Math.random;
    const passage = [];
    for(let i = 0; i < 8; i++){
      passage.push(words[Math.floor(rng() * words.length)]);
    }
    const text = passage.join(' ');
    
    // Display passage
    const passageDiv = document.createElement('div');
    passageDiv.textContent = text;
    passageDiv.style.cssText = 'font-size:0.95rem;color:#e3ecf5;background:#1d2734;padding:15px;border-radius:8px;border:1px solid #2c3a4d;width:100%;';
    
    // Textarea for input
    const textarea = document.createElement('textarea');
    textarea.rows = 3;
    textarea.style.cssText = 'width:100%;padding:10px;font-size:0.9rem;background:#0a0e14;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:5px;resize:vertical;';
    
    // Start button
    const startBtn = document.createElement('button');
    startBtn.className = 'btn primary';
    startBtn.textContent = 'Start';
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn';
    submitBtn.textContent = 'Submit';
    submitBtn.disabled = true;
    
    // Info display
    const info = document.createElement('div');
    info.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:25px;';
    
    // Timer state
    let endTime = 0;
    let timerInterval = null;
    
    // Start handler
    startBtn.addEventListener('click', () => {
      endTime = Date.now() + 15000; // 15 seconds
      submitBtn.disabled = false;
      startBtn.disabled = true;
      textarea.focus();
      
      timerInterval = setInterval(() => {
        const remaining = endTime - Date.now();
        info.textContent = `Time: ${Math.max(0, Math.ceil(remaining / 1000))}s`;
        
        if(remaining <= 0){
          clearInterval(timerInterval);
          submitBtn.click();
        }
      }, 200);
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      clearInterval(timerInterval);
      submitBtn.disabled = true;
      textarea.disabled = true;
      
      const typed = textarea.value.trim();
      const typedWords = typed.split(/\s+/);
      const targetWords = text.split(/\s+/);
      
      // Count correct words in correct positions
      let correctWords = 0;
      typedWords.forEach((word, index) => {
        if(word === targetWords[index]){
          correctWords++;
        }
      });
      
      // Calculate raw score
      // Base: 10 points per correct word
      // Bonus: length accuracy (up to 20 points)
      const lengthAccuracy = typed.length > 0 
        ? Math.max(0, 20 - Math.abs(typed.length - text.length) / 4)
        : 0;
      
      const rawScore = (correctWords * 10) + lengthAccuracy;
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[WordTyping] Win probability applied: success forced to loss');
        }
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(passageDiv);
    wrapper.appendChild(textarea);
    wrapper.appendChild(info);
    wrapper.appendChild(startBtn);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.wordTyping = { render };

})(window);
