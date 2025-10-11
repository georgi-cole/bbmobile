// MODULE: minigames/word-anagram.js
// Word Anagram - Unscramble Big Brother themed words
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Word Anagram minigame
   * Player unscrambles a Big Brother-themed word
   * Score based on correctness and partial matches
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
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Word Anagram';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Unscramble the word';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Word pool (Big Brother themed)
    const words = [
      'alliance', 'strategy', 'competition', 'nominee', 'eviction',
      'jury', 'twist', 'backdoor', 'target', 'veto', 'houseguest'
    ];
    
    // Select random word
    const rng = g.rng || Math.random;
    const word = words[Math.floor(rng() * words.length)];
    
    // Scramble the word
    const scrambled = word.split('').sort(() => rng() - 0.5).join('');
    
    // Scrambled word display
    const scrambledDiv = document.createElement('div');
    scrambledDiv.textContent = scrambled.toUpperCase();
    scrambledDiv.style.cssText = 'font-size:2rem;font-weight:bold;color:#83bfff;letter-spacing:4px;margin:15px 0;';
    
    // Input field
    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = 'Type your answer';
    input.style.cssText = 'width:250px;padding:10px;font-size:1.1rem;text-align:center;background:#1d2734;color:#e3ecf5;border:1px solid #2c3a4d;border-radius:5px;';
    input.maxLength = word.length + 2; // Allow a bit of leeway
    
    // Submit button
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit';
    
    // Handle Enter key
    input.addEventListener('keypress', (e) => {
      if(e.key === 'Enter' && !submitBtn.disabled){
        submitBtn.click();
      }
    });
    
    // Submit handler
    submitBtn.addEventListener('click', () => {
      submitBtn.disabled = true;
      input.disabled = true;
      
      const answer = input.value.trim().toLowerCase();
      let rawScore = 0;
      
      if(answer === word){
        // Perfect match
        rawScore = 100;
      } else {
        // Partial credit for matching letters in correct positions
        for(let i = 0; i < Math.min(answer.length, word.length); i++){
          if(answer[i] === word[i]){
            rawScore += 5;
          }
        }
      }
      
      // Determine if player succeeded
      const playerSucceeded = rawScore >= 60; // 60% threshold for success
      
      // Apply win probability logic
      let finalScore = rawScore;
      if(g.GameUtils && !debugMode && competitionMode){
        const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
        if(!shouldWin && playerSucceeded){
          // Force loss despite success (25% win rate)
          finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
          console.log('[WordAnagram] Win probability applied: success forced to loss');
        }
      }
      
      onComplete(finalScore);
    });
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scrambledDiv);
    wrapper.appendChild(input);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
    
    // Focus input
    setTimeout(() => input.focus(), 100);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.wordAnagram = { render };

})(window);
