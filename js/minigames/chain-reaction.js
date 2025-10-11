// MODULE: minigames/chain-reaction.js
// Chain Reaction - Create chain combos puzzle

(function(g){
  'use strict';

  /**
   * Chain Reaction minigame
   * Click tiles to create chain reactions
   * Score based on longest chain created
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   */
  function render(container, onComplete){
    container.innerHTML = '';
    
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;max-width:600px;margin:0 auto;';
    
    const title = document.createElement('h3');
    title.textContent = 'Chain Reaction';
    title.style.cssText = 'margin:0;font-size:1.2rem;color:#e3ecf5;';
    
    const instructions = document.createElement('p');
    instructions.textContent = 'Click tiles of the same color to create chains! (5 rounds)';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    const scoreDiv = document.createElement('div');
    scoreDiv.textContent = 'Score: 0';
    scoreDiv.style.cssText = 'font-size:1.5rem;font-weight:bold;color:#83bfff;';
    
    const roundDiv = document.createElement('div');
    roundDiv.textContent = 'Round: 1/5';
    roundDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;';
    
    const gridDiv = document.createElement('div');
    gridDiv.style.cssText = 'display:grid;grid-template-columns:repeat(6,50px);gap:5px;margin:20px 0;';
    
    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn';
    nextBtn.textContent = 'Next Round';
    nextBtn.style.display = 'none';
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(scoreDiv);
    wrapper.appendChild(roundDiv);
    wrapper.appendChild(gridDiv);
    wrapper.appendChild(nextBtn);
    container.appendChild(wrapper);
    
    let totalScore = 0;
    let currentRound = 1;
    let chainSize = 0;
    let grid = [];
    const colors = ['#ff6b6b', '#6fd3ff', '#74e48b', '#f7b955'];
    
    function createGrid(){
      gridDiv.innerHTML = '';
      grid = [];
      
      for(let i = 0; i < 36; i++){
        const tile = document.createElement('div');
        const color = colors[Math.floor(Math.random() * colors.length)];
        
        tile.style.cssText = `
          width:50px;
          height:50px;
          background:${color};
          border-radius:4px;
          cursor:pointer;
          transition:transform 0.2s, opacity 0.2s;
        `;
        tile.dataset.color = color;
        tile.dataset.index = i;
        tile.dataset.removed = 'false';
        
        tile.addEventListener('click', () => handleTileClick(tile));
        
        gridDiv.appendChild(tile);
        grid.push(tile);
      }
      
      chainSize = 0;
    }
    
    function handleTileClick(tile){
      if(tile.dataset.removed === 'true') return;
      
      const targetColor = tile.dataset.color;
      const index = parseInt(tile.dataset.index);
      const toRemove = [];
      
      // Find connected tiles of same color
      function findConnected(idx){
        if(idx < 0 || idx >= 36) return;
        if(toRemove.includes(idx)) return;
        
        const t = grid[idx];
        if(t.dataset.removed === 'true' || t.dataset.color !== targetColor) return;
        
        toRemove.push(idx);
        
        // Check neighbors (up, down, left, right)
        const row = Math.floor(idx / 6);
        const col = idx % 6;
        
        if(row > 0) findConnected(idx - 6); // up
        if(row < 5) findConnected(idx + 6); // down
        if(col > 0) findConnected(idx - 1); // left
        if(col < 5) findConnected(idx + 1); // right
      }
      
      findConnected(index);
      
      if(toRemove.length >= 2){
        chainSize += toRemove.length;
        totalScore += toRemove.length * 10;
        scoreDiv.textContent = `Score: ${totalScore}`;
        
        toRemove.forEach(idx => {
          grid[idx].dataset.removed = 'true';
          grid[idx].style.opacity = '0';
          grid[idx].style.transform = 'scale(0.5)';
        });
        
        // Check if round complete
        setTimeout(() => {
          const remaining = grid.filter(t => t.dataset.removed === 'false').length;
          if(remaining === 0 || remaining < 2){
            if(currentRound < 5){
              nextBtn.style.display = 'block';
            } else {
              endGame();
            }
          }
        }, 300);
      }
    }
    
    nextBtn.addEventListener('click', () => {
      currentRound++;
      roundDiv.textContent = `Round: ${currentRound}/5`;
      nextBtn.style.display = 'none';
      createGrid();
    });
    
    function endGame(){
      // Score based on total points (200+ = excellent)
      const finalScore = Math.min(100, (totalScore / 200) * 100);
      if(onComplete){
        onComplete(finalScore);
      }
    }
    
    createGrid();
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.chainReaction = { render };

})(window);
