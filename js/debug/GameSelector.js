// MODULE: debug/GameSelector.js
// Debug game selector for testing games in isolation

(function(g){
  'use strict';

  /**
   * Create a debug game selector UI
   * Allows selecting and testing any registered game in debug mode
   * 
   * @param {HTMLElement} container - Container element for the selector
   * @returns {Object} Selector interface
   */
  function createSelector(container){
    let currentGame = null;
    let currentGameKey = null;
    let gameContainer = null;

    /**
     * Render the selector UI
     */
    function render(){
      container.innerHTML = '';
      container.style.cssText = 'padding: 20px; max-width: 800px; margin: 0 auto;';

      // Title
      const title = document.createElement('h2');
      title.textContent = '🎮 Game Debug Selector';
      title.style.cssText = 'margin: 0 0 20px 0; color: #83bfff; font-size: 1.5rem;';
      container.appendChild(title);

      // Instructions
      const instructions = document.createElement('p');
      instructions.textContent = 'Select a game to test it in debug mode (25% win probability disabled)';
      instructions.style.cssText = 'margin: 0 0 20px 0; color: #95a9c0; font-size: 0.9rem;';
      container.appendChild(instructions);

      // Game selector dropdown
      const selectorWrapper = document.createElement('div');
      selectorWrapper.style.cssText = 'margin-bottom: 20px;';

      const label = document.createElement('label');
      label.textContent = 'Select Game: ';
      label.style.cssText = 'color: #e3ecf5; margin-right: 10px; font-weight: bold;';

      const select = document.createElement('select');
      select.style.cssText = `
        padding: 8px 12px;
        font-size: 1rem;
        background: #1d2734;
        color: #e3ecf5;
        border: 1px solid #2c3a4d;
        border-radius: 6px;
        min-width: 300px;
        cursor: pointer;
      `;

      // Add default option
      const defaultOption = document.createElement('option');
      defaultOption.textContent = '-- Select a game --';
      defaultOption.value = '';
      select.appendChild(defaultOption);

      // Get available games
      const games = g.GameConfig ? g.GameConfig.getAllGames({ supportsDebugMode: true }) : [];
      
      if(games.length === 0){
        const noGames = document.createElement('option');
        noGames.textContent = 'No games available';
        noGames.disabled = true;
        select.appendChild(noGames);
      } else {
        // Group by type
        const gamesByType = {};
        games.forEach(game => {
          if(!gamesByType[game.type]){
            gamesByType[game.type] = [];
          }
          gamesByType[game.type].push(game);
        });

        // Add optgroups
        Object.keys(gamesByType).sort().forEach(type => {
          const optgroup = document.createElement('optgroup');
          optgroup.label = type.charAt(0).toUpperCase() + type.slice(1) + ' Games';
          
          gamesByType[type].forEach(game => {
            const option = document.createElement('option');
            option.value = game.key;
            option.textContent = `${game.name} - ${game.description}`;
            optgroup.appendChild(option);
          });
          
          select.appendChild(optgroup);
        });
      }

      select.addEventListener('change', (e) => {
        if(e.target.value){
          loadGame(e.target.value);
        } else {
          clearGame();
        }
      });

      selectorWrapper.appendChild(label);
      selectorWrapper.appendChild(select);
      container.appendChild(selectorWrapper);

      // Control buttons
      const controls = document.createElement('div');
      controls.style.cssText = 'display: flex; gap: 10px; margin-bottom: 20px;';

      const startBtn = document.createElement('button');
      startBtn.className = 'btn primary';
      startBtn.textContent = '▶️ Start';
      startBtn.disabled = true;
      startBtn.id = 'debug-start-btn';

      const resetBtn = document.createElement('button');
      resetBtn.className = 'btn';
      resetBtn.textContent = '🔄 Reset';
      resetBtn.disabled = true;
      resetBtn.id = 'debug-reset-btn';

      startBtn.addEventListener('click', () => {
        if(currentGameKey){
          loadGame(currentGameKey);
        }
      });

      resetBtn.addEventListener('click', () => {
        if(currentGameKey){
          loadGame(currentGameKey);
        }
      });

      controls.appendChild(startBtn);
      controls.appendChild(resetBtn);
      container.appendChild(controls);

      // Debug info
      const debugInfo = document.createElement('div');
      debugInfo.style.cssText = `
        padding: 12px;
        background: rgba(131, 191, 255, 0.1);
        border: 1px solid rgba(131, 191, 255, 0.3);
        border-radius: 6px;
        margin-bottom: 20px;
        font-size: 0.85rem;
        color: #83bfff;
      `;
      debugInfo.innerHTML = `
        <strong>🔧 Debug Mode Active</strong><br>
        • Win probability bias (25%) is disabled<br>
        • Actual game success/failure shown<br>
        • All patterns are randomized per session
      `;
      container.appendChild(debugInfo);

      // Game container
      gameContainer = document.createElement('div');
      gameContainer.style.cssText = `
        min-height: 400px;
        padding: 20px;
        background: rgba(13, 21, 31, 0.5);
        border: 2px solid #2c3a4d;
        border-radius: 8px;
      `;
      container.appendChild(gameContainer);
    }

    /**
     * Load and render a game
     */
    function loadGame(gameKey){
      if(!gameContainer) return;
      
      gameContainer.innerHTML = '';
      currentGameKey = gameKey;

      // Enable control buttons
      const startBtn = container.querySelector('#debug-start-btn');
      const resetBtn = container.querySelector('#debug-reset-btn');
      if(startBtn) startBtn.disabled = false;
      if(resetBtn) resetBtn.disabled = false;

      // Get game module
      const registry = g.MinigameRegistry;
      if(!registry){
        gameContainer.innerHTML = '<p style="color: #dc2626;">Error: MinigameRegistry not loaded</p>';
        return;
      }

      const gameModule = registry.getModule(gameKey);
      if(!gameModule || !gameModule.render){
        gameContainer.innerHTML = `<p style="color: #dc2626;">Error: Game module "${gameKey}" not found or has no render function</p>`;
        return;
      }

      // Game title
      const gameConfig = g.GameConfig ? g.GameConfig.getGame(gameKey) : null;
      if(gameConfig){
        const gameTitle = document.createElement('h3');
        gameTitle.textContent = `🎯 ${gameConfig.name}`;
        gameTitle.style.cssText = 'margin: 0 0 10px 0; color: #e3ecf5;';
        gameContainer.appendChild(gameTitle);

        const gameDesc = document.createElement('p');
        gameDesc.textContent = gameConfig.description;
        gameDesc.style.cssText = 'margin: 0 0 20px 0; color: #95a9c0; font-size: 0.9rem;';
        gameContainer.appendChild(gameDesc);
      }

      // Create game wrapper
      const gameWrapper = document.createElement('div');
      gameWrapper.style.cssText = 'background: #0d151f; padding: 20px; border-radius: 6px;';
      gameContainer.appendChild(gameWrapper);

      // Render game with debug mode enabled
      try {
        gameModule.render(gameWrapper, (score) => {
          console.log('[Debug] Game completed with score:', score);
          
          // Show result
          const result = document.createElement('div');
          result.style.cssText = `
            margin-top: 20px;
            padding: 15px;
            background: ${score > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(220, 38, 38, 0.2)'};
            border: 2px solid ${score > 0 ? '#22c55e' : '#dc2626'};
            border-radius: 6px;
            color: ${score > 0 ? '#22c55e' : '#dc2626'};
            font-weight: bold;
            text-align: center;
          `;
          result.innerHTML = `
            <div style="font-size: 2rem; margin-bottom: 10px;">${score > 0 ? '✅' : '❌'}</div>
            <div>Game ${score > 0 ? 'Completed' : 'Failed'}</div>
            <div style="font-size: 1.5rem; margin-top: 10px;">Score: ${score}</div>
            <div style="font-size: 0.9rem; margin-top: 10px; opacity: 0.8;">
              Debug Mode: Actual result shown (no 25% win bias applied)
            </div>
          `;
          gameContainer.appendChild(result);
        }, {
          debugMode: true, // Pass debug mode flag
          testMode: true
        });
      } catch(error){
        console.error('[Debug] Error rendering game:', error);
        gameContainer.innerHTML = `<p style="color: #dc2626;">Error rendering game: ${error.message}</p>`;
      }
    }

    /**
     * Clear current game
     */
    function clearGame(){
      if(gameContainer){
        gameContainer.innerHTML = '';
      }
      currentGameKey = null;
      
      const startBtn = container.querySelector('#debug-start-btn');
      const resetBtn = container.querySelector('#debug-reset-btn');
      if(startBtn) startBtn.disabled = true;
      if(resetBtn) resetBtn.disabled = true;
    }

    /**
     * Cleanup
     */
    function cleanup(){
      clearGame();
      container.innerHTML = '';
    }

    // Initial render
    render();

    return {
      render,
      loadGame,
      clearGame,
      cleanup
    };
  }

  // Export API
  g.DebugGameSelector = {
    createSelector
  };

  console.info('[DebugGameSelector] Module loaded');

})(window);
