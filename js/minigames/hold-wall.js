// MODULE: minigames/hold-wall.js
// Hold Wall - Endurance wall hold challenge

(function(g){
  'use strict';

  /**
   * Simple Linear Congruential Generator for seeded random numbers
   * @param {number} seed - Seed value
   * @returns {function} RNG function that returns values in [0, 1)
   */
  function createSeededRNG(seed){
    let state = seed || 1;
    const a = 1664525;
    const c = 1013904223;
    const m = Math.pow(2, 32);
    
    return function(){
      state = (a * state + c) % m;
      return state / m;
    };
  }

  /**
   * Hold Wall minigame
   * Hold your finger/mouse on the wall without moving
   * Score based on endurance (how long you hold)
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   * @param {number} options.seed - Optional seed for deterministic AI behavior
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      seed
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
    
    // Status feed panel (scrolling message feed)
    const feedPanel = document.createElement('div');
    feedPanel.style.cssText = 'width:100%;max-width:400px;height:120px;background:#1a2332;border:1px solid #2c3a4d;border-radius:6px;padding:8px;overflow-y:auto;font-size:0.85rem;color:#95a9c0;display:flex;flex-direction:column-reverse;';
    
    const feedContent = document.createElement('div');
    feedContent.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    feedPanel.appendChild(feedContent);
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(statusDiv);
    wrapper.appendChild(wallDiv);
    wrapper.appendChild(feedPanel);
    container.appendChild(wrapper);
    
    let startTime = null;
    let holdDuration = 0;
    let isHolding = false;
    let timerInterval = null;
    let initialPos = null;
    const moveThreshold = 15; // pixels
    
    // AI narrative state
    const rng = seed !== undefined ? createSeededRNG(seed) : Math.random;
    let participants = [];
    let dropTimers = [];
    let dealWindowTimer = null;
    let postDealInterval = null;
    let rivalName = null;
    let aiDropped = false;
    
    /**
     * Add a message to the status feed
     * @param {string} text - Message text
     * @param {string} color - Optional color override
     */
    function addFeedMessage(text, color = '#95a9c0'){
      const msg = document.createElement('div');
      msg.textContent = text;
      msg.style.cssText = `color:${color};padding:2px 0;line-height:1.3;`;
      feedContent.insertBefore(msg, feedContent.firstChild);
      feedPanel.scrollTop = 0; // Auto-scroll to show latest
    }
    
    /**
     * Initialize AI participants from game cast
     * Returns array of AI names (excludes human player)
     */
    function initializeParticipants(){
      const names = [];
      
      // Try to get cast from window.game
      if(g.game && g.game.players && Array.isArray(g.game.players)){
        const alivePlayers = g.game.players.filter(p => !p.evicted && !p.human);
        alivePlayers.forEach(p => {
          if(p.name) names.push(p.name);
        });
      }
      
      // Fallback if no game state available
      if(names.length === 0){
        const defaults = ['Finn', 'Mimi', 'Rae', 'Nova', 'Kai', 'Zed', 'Ivy', 'Ash', 'Lux', 'Remy'];
        const count = Math.floor(rng() * 4) + 6; // 6-9 AI participants
        for(let i = 0; i < count; i++){
          names.push(defaults[i % defaults.length]);
        }
      }
      
      return names;
    }
    
    /**
     * Schedule AI opponent drops over 3-minute window
     * Randomly schedules drops between 5s and 180s
     * Keeps one AI alive for final-two scenario
     */
    function scheduleAIDrops(){
      if(participants.length === 0) return;
      
      // Keep one AI for final two (last in array)
      const droppersCount = participants.length - 1;
      const dropTimes = [];
      
      // Schedule drops between 5s (5000ms) and 180s (180000ms)
      for(let i = 0; i < droppersCount; i++){
        const dropTime = 5000 + rng() * 175000; // 5s to 180s
        dropTimes.push({ name: participants[i], time: dropTime });
      }
      
      // Sort by time for proper narrative flow
      dropTimes.sort((a, b) => a.time - b.time);
      
      // Schedule each drop
      dropTimes.forEach((drop) => {
        const timer = setTimeout(() => {
          // Remove from participants
          const idx = participants.indexOf(drop.name);
          if(idx !== -1){
            participants.splice(idx, 1);
          }
          
          const remaining = participants.length;
          addFeedMessage(`${drop.name} dropped. ${remaining} remaining.`, '#ff9966');
          
          // Check if we're down to final two (player + one AI)
          if(remaining === 1){
            rivalName = participants[0];
            startDealWindow();
          }
        }, drop.time);
        
        dropTimers.push(timer);
      });
    }
    
    /**
     * Start the final-two deal window
     * AI offers a 10-second deal: "Release now; I won't nominate you."
     */
    function startDealWindow(){
      if(!rivalName) return;
      
      addFeedMessage(`${rivalName}: "Release now and I won't nominate you!"`, '#ffcc00');
      
      // 10-second deal window
      dealWindowTimer = setTimeout(() => {
        addFeedMessage('Deal window expired. Competition continues...', '#95a9c0');
        startPostDealChecks();
      }, 10000);
    }
    
    /**
     * Start post-deal periodic checks
     * Every 20 seconds, 40% chance AI drops
     */
    function startPostDealChecks(){
      postDealInterval = setInterval(() => {
        if(!isHolding || aiDropped) {
          clearInterval(postDealInterval);
          return;
        }
        
        const willDrop = rng() < 0.4; // 40% chance
        
        if(willDrop){
          aiDropped = true;
          addFeedMessage(`${rivalName} dropped! You win!`, '#66ff66');
          clearInterval(postDealInterval);
          
          // End the hold with victory
          setTimeout(() => {
            if(isHolding){
              endHold(false, true); // true = AI dropped, player wins
            }
          }, 1000);
        } else {
          addFeedMessage(`${rivalName} holds on...`, '#95a9c0');
        }
      }, 20000);
    }
    
    /**
     * Clean up all timers and intervals
     */
    function cleanupTimers(){
      if(timerInterval) clearInterval(timerInterval);
      dropTimers.forEach(t => clearTimeout(t));
      dropTimers = [];
      if(dealWindowTimer) clearTimeout(dealWindowTimer);
      if(postDealInterval) clearInterval(postDealInterval);
    }
    
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
      
      // Initialize AI narrative
      participants = initializeParticipants();
      participants.push('You'); // Add player to the end
      const totalCount = participants.length;
      
      addFeedMessage(`Challenge started with ${totalCount} participants.`, '#83bfff');
      
      // Schedule AI drops (excludes player and one AI for final two)
      scheduleAIDrops();
      
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
    
    function endHold(moved = false, aiWon = false){
      if(!isHolding) return;
      
      isHolding = false;
      cleanupTimers();
      
      holdDuration = (Date.now() - startTime) / 1000;
      
      wallDiv.style.background = '#2c3a4d';
      wallDiv.style.color = '#83bfff';
      
      // Check if player released during deal window
      const duringDealWindow = rivalName && dealWindowTimer && !aiDropped;
      
      // Winner-takes-all scoring: 100 if last remaining, 0 otherwise
      let finalScore = 0;
      
      if(aiWon){
        // AI dropped, player wins automatically - score 100
        finalScore = 100;
        statusDiv.textContent = 'You win! Others dropped.';
        statusDiv.style.color = '#66ff66';
        addFeedMessage('Challenge complete! You outlasted everyone!', '#66ff66');
      } else if(moved){
        // Player moved - score 0
        statusDiv.textContent = 'You moved! Final time: ' + holdDuration.toFixed(1) + 's';
        statusDiv.style.color = '#ff6b6b';
        addFeedMessage('You moved too much and lost grip!', '#ff6b6b');
      } else if(duringDealWindow){
        // Player released during the 10-second deal window - score 0
        const respected = rng() < 0.8; // 80% chance AI respects promise
        
        if(respected){
          statusDiv.textContent = `Deal accepted! ${rivalName} keeps their promise.`;
          statusDiv.style.color = '#66ff66';
          addFeedMessage(`${rivalName}: "I'll keep my word. You're safe."`, '#66ff66');
        } else {
          statusDiv.textContent = `Deal accepted... but ${rivalName} breaks their promise!`;
          statusDiv.style.color = '#ffcc00';
          addFeedMessage(`${rivalName}: "Sorry, I lied. Game is game."`, '#ff9966');
        }
        
        // Emit bbGameBus event if available
        if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
          g.bbGameBus.emit('holdWall:dealOutcome', {
            rival: rivalName,
            respected: respected
          });
        }
      } else {
        // Player released before being last - score 0
        statusDiv.textContent = 'Released! Time: ' + holdDuration.toFixed(1) + 's';
        addFeedMessage('You released from the wall.', '#95a9c0');
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
