// MODULE: minigames/social-strings.js
// Social Strings - Connect relationships puzzle

(function(g){
  'use strict';

  /**
   * Social Strings minigame
   * Match houseguests based on their relationships/alliances
   * Connect pairs that have relationships
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
    title.textContent = 'Social Strings';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Match the pairs that have alliances!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const roundDiv = document.createElement('div');
    roundDiv.textContent = 'Round 1/3';
    roundDiv.style.cssText = 'font-size:1rem;color:#83bfff;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Matches: 0';
    scoreDiv.style.cssText = 'font-size:1rem;color:#95a9c0;';
    
    // Game area
    const gameDiv = document.createElement('div');
    gameDiv.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:20px;width:100%;max-width:400px;margin:20px 0;';
    
    const leftCol = document.createElement('div');
    leftCol.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    
    const rightCol = document.createElement('div');
    rightCol.style.cssText = 'display:flex;flex-direction:column;gap:10px;';
    
    gameDiv.appendChild(leftCol);
    gameDiv.appendChild(rightCol);
    
    const submitBtn = document.createElement('button');
    submitBtn.className = 'btn primary';
    submitBtn.textContent = 'Submit Matches';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(roundDiv);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(gameDiv);
    wrapper.appendChild(submitBtn);
    container.appendChild(wrapper);
    
    let currentRound = 1;
    const maxRounds = 3;
    let totalCorrect = 0;
    let selections = [];
    
    // Relationship pairs (each round uses different set)
    const allPairs = [
      // Round 1
      [
        ['Alex', 'Jordan'],
        ['Sam', 'Taylor'],
        ['Morgan', 'Casey'],
        ['Riley', 'Avery']
      ],
      // Round 2
      [
        ['Quinn', 'Harper'],
        ['Blake', 'Dakota'],
        ['Reese', 'Finley'],
        ['Charlie', 'River'],
        ['Sage', 'Skylar']
      ],
      // Round 3
      [
        ['Phoenix', 'Ash'],
        ['Rowan', 'Wren'],
        ['Kai', 'Nova'],
        ['Drew', 'Jules'],
        ['Cameron', 'Eden'],
        ['Parker', 'Hayden']
      ]
    ];
    
    function startRound(){
      leftCol.innerHTML = '';
      rightCol.innerHTML = '';
      selections = [];
      
      const pairs = allPairs[currentRound - 1];
      const leftNames = pairs.map(p => p[0]);
      const rightNames = pairs.map(p => p[1]);
      
      // Shuffle right column
      for(let i = rightNames.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [rightNames[i], rightNames[j]] = [rightNames[j], rightNames[i]];
      }
      
      // Create buttons
      leftNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.className = 'btn';
        btn.style.cssText = 'padding:12px;font-size:1rem;';
        btn.dataset.name = name;
        btn.dataset.side = 'left';
        btn.dataset.idx = idx;
        
        btn.addEventListener('click', () => selectPerson(btn));
        leftCol.appendChild(btn);
      });
      
      rightNames.forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.textContent = name;
        btn.className = 'btn';
        btn.style.cssText = 'padding:12px;font-size:1rem;';
        btn.dataset.name = name;
        btn.dataset.side = 'right';
        btn.dataset.idx = idx;
        
        btn.addEventListener('click', () => selectPerson(btn));
        rightCol.appendChild(btn);
      });
      
      submitBtn.disabled = false;
    }
    
    let selectedLeft = null;
    let selectedRight = null;
    
    function selectPerson(btn){
      const side = btn.dataset.side;
      
      if(side === 'left'){
        // Deselect previous
        if(selectedLeft){
          selectedLeft.style.background = '';
          selectedLeft.style.color = '';
        }
        
        if(selectedLeft === btn){
          selectedLeft = null;
        } else {
          selectedLeft = btn;
          btn.style.background = '#83bfff';
          btn.style.color = '#1a2332';
        }
      } else {
        // Deselect previous
        if(selectedRight){
          selectedRight.style.background = '';
          selectedRight.style.color = '';
        }
        
        if(selectedRight === btn){
          selectedRight = null;
        } else {
          selectedRight = btn;
          btn.style.background = '#83bfff';
          btn.style.color = '#1a2332';
        }
      }
      
      // If both selected, create match
      if(selectedLeft && selectedRight){
        const match = {
          left: selectedLeft.dataset.name,
          right: selectedRight.dataset.name
        };
        selections.push(match);
        
        // Mark as matched
        selectedLeft.disabled = true;
        selectedRight.disabled = true;
        selectedLeft.style.background = '#74e48b';
        selectedRight.style.background = '#74e48b';
        
        selectedLeft = null;
        selectedRight = null;
        
        scoreDiv.textContent = `Matches: ${selections.length}`;
      }
    }
    
    function evaluateRound(){
      submitBtn.disabled = true;
      
      const pairs = allPairs[currentRound - 1];
      let correct = 0;
      
      // Check each selection
      selections.forEach(sel => {
        const isPair = pairs.some(p => 
          (p[0] === sel.left && p[1] === sel.right) ||
          (p[1] === sel.left && p[0] === sel.right)
        );
        if(isPair) correct++;
      });
      
      totalCorrect += correct;
      
      // Show feedback
      instructions.textContent = `${correct}/${pairs.length} correct!`;
      instructions.style.color = correct === pairs.length ? '#74e48b' : '#f7b955';
      
      setTimeout(() => {
        instructions.textContent = 'Match the pairs that have alliances!';
        instructions.style.color = '#95a9c0';
        
        if(currentRound < maxRounds){
          currentRound++;
          roundDiv.textContent = `Round ${currentRound}/${maxRounds}`;
          startRound();
        } else {
          finishGame();
        }
      }, 2000);
    }
    
    function finishGame(){
      // Total possible: 4 + 5 + 6 = 15
      const rawScore = Math.round((totalCorrect / 15) * 100);
      
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
    
    submitBtn.addEventListener('click', evaluateRound);
    
    // Start first round
    startRound();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.socialStrings = { render };

})(window);
