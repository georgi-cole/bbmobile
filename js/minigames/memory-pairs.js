// MODULE: minigames/memory-pairs.js
// Memory Pairs - Find matching pairs of cards
// Migrated from legacy minigames.js

(function(g){
  'use strict';

  /**
   * Memory Pairs minigame
   * Player flips cards to find matching pairs
   * Score based on time to complete
   * Mobile-friendly with tap support
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
    title.textContent = 'Memory Pairs';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Find matching pairs quickly';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Create card pairs
    const pairs = ['A', 'A', 'B', 'B', 'C', 'C'];
    
    // Shuffle cards
    for(let i = pairs.length - 1; i > 0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }
    
    // Grid container
    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:15px 0;max-width:400px;';
    
    // Game state
    let openCards = [];
    let matchedCount = 0;
    let startTime = null;
    
    // Create card buttons
    const cardButtons = pairs.map((value, index) => {
      const card = document.createElement('button');
      card.className = 'btn small';
      card.textContent = '?';
      card.dataset.value = value;
      card.dataset.index = index;
      card.style.cssText = 'width:50px;height:60px;font-size:1.5rem;padding:5px;';
      
      card.addEventListener('click', () => {
        // Start timer on first click
        if(startTime === null){
          startTime = Date.now();
        }
        
        // Can only flip 2 cards at a time
        if(openCards.length >= 2) return;
        
        // Can't flip already matched or currently open cards
        if(card.disabled || card.textContent !== '?') return;
        
        // Flip card
        card.textContent = value;
        card.style.background = '#2c5aa0';
        openCards.push(card);
        
        // Check for match when 2 cards are open
        if(openCards.length === 2){
          const [card1, card2] = openCards;
          
          if(card1.dataset.value === card2.dataset.value){
            // Match found!
            matchedCount++;
            card1.disabled = true;
            card2.disabled = true;
            card1.style.opacity = '0.5';
            card2.style.opacity = '0.5';
            openCards = [];
            
            // Check if all pairs found
            if(matchedCount === 3){
              const timeElapsed = (Date.now() - startTime) / 1000;
              
              // Calculate raw score: 100 for instant, decreases with time
              // 10 seconds = 100, 20 seconds = 50, etc.
              const rawScore = Math.max(20, 100 - (timeElapsed * 5));
              
              // Determine if player succeeded
              const playerSucceeded = rawScore >= 60; // 60% threshold for success
              
              // Apply win probability logic
              let finalScore = rawScore;
              if(g.GameUtils && !debugMode && competitionMode){
                const shouldWin = g.GameUtils.determineGameResult(playerSucceeded, false);
                if(!shouldWin && playerSucceeded){
                  // Force loss despite success (25% win rate)
                  finalScore = Math.round(30 + Math.random() * 25); // 30-55 range
                  console.log('[MemoryPairs] Win probability applied: success forced to loss');
                }
              }
              
              setTimeout(() => {
                onComplete(finalScore);
              }, 500);
            }
          } else {
            // No match - flip back after delay
            setTimeout(() => {
              card1.textContent = '?';
              card2.textContent = '?';
              card1.style.background = '';
              card2.style.background = '';
              openCards = [];
            }, 800);
          }
        }
      });
      
      return card;
    });
    
    // Add cards to grid
    cardButtons.forEach(card => grid.appendChild(card));
    
    // Assemble UI
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(grid);
    container.appendChild(wrapper);
  }

  // Export to global minigames namespace
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.memoryPairs = { render };

})(window);
