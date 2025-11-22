// MODULE: minigames/hold-wall.js
// Hold Wall - 10-minute endurance competition with responsive avatar displays

(function(g){
  'use strict';

  // Constants
  const TOTAL_WINDOW_MS = 600000; // 10 minutes
  const MIN_DROP_MS = 8000; // 8 seconds minimum before first drop
  const MAX_DROP_MS = TOTAL_WINDOW_MS - 5000; // 5 seconds before end
  const MOVE_THRESHOLD = 15; // pixels

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
   * Format time in mm:ss.s format
   * @param {number} ms - Time in milliseconds
   * @returns {string} Formatted time string
   */
  function formatTime(ms){
    const totalSeconds = ms / 1000;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toFixed(1).padStart(4, '0')}`;
  }

  /**
   * Choose avatar display mode based on viewport width
   * @param {string} overrideMode - Manual override (strip/tiny/single)
   * @returns {string} Selected mode
   */
  function chooseAvatarMode(overrideMode){
    if(overrideMode) return overrideMode;
    
    const width = window.innerWidth;
    if(width >= 640) return 'strip';
    if(width >= 480) return 'tiny';
    return 'single';
  }

  /**
   * Get DiceBear avatar URL (fallback)
   * @param {string} seed - Seed for avatar generation
   * @returns {string} Avatar URL
   */
  function getAvatarUrl(seed){
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'Player')}`;
  }

  /**
   * Hold Wall minigame - 10-minute endurance competition
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   * @param {number} options.seed - Optional seed for deterministic AI behavior
   * @param {string} options.avatarMode - Manual override for avatar mode (strip/tiny/single)
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      seed,
      avatarMode: manualAvatarMode
    } = options;
    
    // Determine avatar display mode
    const avatarMode = chooseAvatarMode(manualAvatarMode);
    const rng = seed !== undefined ? createSeededRNG(seed) : Math.random;
    
    // Main wrapper
    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:16px;padding:20px;width:100%;max-width:600px;margin:0 auto;';
    
    // Title
    const title = document.createElement('h3');
    title.textContent = 'Hold Wall';
    title.style.cssText = 'margin:0;font-size:1.3rem;color:#e3ecf5;';
    
    // Instructions
    const instructions = document.createElement('p');
    instructions.textContent = 'Hold the wall without moving for as long as possible!';
    instructions.style.cssText = 'margin:0;font-size:0.9rem;color:#95a9c0;text-align:center;';
    
    // Timer display
    const timerDiv = document.createElement('div');
    timerDiv.textContent = '0:00.0';
    timerDiv.style.cssText = 'font-size:2.5rem;font-weight:bold;color:#83bfff;font-variant-numeric:tabular-nums;';
    
    // Status display
    const statusDiv = document.createElement('div');
    statusDiv.textContent = 'Press and hold the wall to start...';
    statusDiv.style.cssText = 'font-size:0.9rem;color:#95a9c0;min-height:20px;text-align:center;';
    
    // Avatar container
    const avatarContainer = document.createElement('div');
    avatarContainer.style.cssText = 'width:100%;margin:12px 0;';
    
    // Wall target with pulsating animation
    const wallDiv = document.createElement('div');
    wallDiv.textContent = 'WALL';
    wallDiv.style.cssText = `
      width:200px;
      height:200px;
      background:#2c3a4d;
      border:3px solid #83bfff;
      border-radius:8px;
      display:flex;
      align-items:center;
      justify-content:center;
      font-size:2rem;
      font-weight:bold;
      color:#83bfff;
      cursor:pointer;
      user-select:none;
      margin:20px 0;
      position:relative;
      overflow:hidden;
    `;
    
    // Sheen overlay
    const sheen = document.createElement('div');
    sheen.style.cssText = `
      position:absolute;
      top:-50%;
      left:-50%;
      width:200%;
      height:200%;
      background:linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
      transform:translateX(-100%);
      pointer-events:none;
    `;
    wallDiv.appendChild(sheen);
    
    // Status feed panel
    const feedPanel = document.createElement('div');
    feedPanel.style.cssText = 'width:100%;max-width:400px;height:120px;background:#1a2332;border:1px solid #2c3a4d;border-radius:6px;padding:8px;overflow-y:auto;font-size:0.85rem;color:#95a9c0;';
    
    const feedContent = document.createElement('div');
    feedContent.style.cssText = 'display:flex;flex-direction:column;gap:4px;';
    feedPanel.appendChild(feedContent);
    
    wrapper.appendChild(title);
    wrapper.appendChild(instructions);
    wrapper.appendChild(timerDiv);
    wrapper.appendChild(statusDiv);
    wrapper.appendChild(avatarContainer);
    wrapper.appendChild(wallDiv);
    wrapper.appendChild(feedPanel);
    container.appendChild(wrapper);
    
    // Game state
    let startTime = null;
    let isHolding = false;
    let timerInterval = null;
    let initialPos = null;
    let pulsateInterval = null;
    let sheenInterval = null;
    
    // Participant tracking: { name, isPlayer, dropTimeMs, avatarEl }
    let participants = [];
    let dropTimers = [];
    let dealWindowTimer = null;
    let dealCountdownInterval = null;
    let postDealInterval = null;
    let rivalName = null;
    let aiDropped = false;
    let currentFocusedOpponent = null;
    
    /**
     * Add a message to the status feed
     */
    function addFeedMessage(text, color = '#95a9c0'){
      const msg = document.createElement('div');
      msg.textContent = text;
      msg.style.cssText = `color:${color};padding:2px 0;line-height:1.3;`;
      feedContent.appendChild(msg);
      feedPanel.scrollTop = feedPanel.scrollHeight;
    }
    
    /**
     * Initialize AI participants from game cast
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
     * Create avatar element for a participant
     */
    function createAvatarElement(name, isPlayer){
      const size = avatarMode === 'strip' ? 64 : 32;
      const outline = isPlayer ? '2px solid #00ffff' : 'none';
      
      const avatarEl = document.createElement('div');
      avatarEl.style.cssText = `
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:4px;
        transition:opacity 0.5s ease, filter 0.5s ease;
      `;
      
      const img = document.createElement('img');
      img.src = getAvatarUrl(name);
      img.alt = name;
      img.onerror = function(){ this.src = getAvatarUrl(name + '_alt'); };
      img.style.cssText = `
        width:${size}px;
        height:${size}px;
        border-radius:50%;
        object-fit:cover;
        outline:${outline};
        border:2px solid #2c3a4d;
      `;
      
      const badge = document.createElement('div');
      badge.textContent = isPlayer ? 'YOU' : name;
      badge.style.cssText = `
        font-size:${avatarMode === 'strip' ? '0.7rem' : '0.6rem'};
        font-weight:bold;
        color:${isPlayer ? '#00ffff' : '#95a9c0'};
        text-align:center;
        max-width:${size}px;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      `;
      
      avatarEl.appendChild(img);
      avatarEl.appendChild(badge);
      
      return { avatarEl, img, badge };
    }
    
    /**
     * Render avatars based on mode
     */
    function renderAvatars(){
      avatarContainer.innerHTML = '';
      
      if(avatarMode === 'strip' || avatarMode === 'tiny'){
        // Horizontal row with scrolling for tiny
        const row = document.createElement('div');
        row.style.cssText = `
          display:flex;
          gap:${avatarMode === 'strip' ? '12px' : '8px'};
          justify-content:${avatarMode === 'strip' ? 'center' : 'flex-start'};
          align-items:center;
          overflow-x:${avatarMode === 'tiny' ? 'auto' : 'visible'};
          padding:8px 4px;
        `;
        
        participants.forEach(p => {
          row.appendChild(p.avatarEl);
        });
        
        avatarContainer.appendChild(row);
      } else if(avatarMode === 'single'){
        // Single mode: player badge + one focused opponent + remaining count
        const singleRow = document.createElement('div');
        singleRow.style.cssText = 'display:flex;gap:16px;justify-content:center;align-items:center;padding:8px;';
        
        // Player
        const playerParticipant = participants.find(p => p.isPlayer);
        if(playerParticipant){
          singleRow.appendChild(playerParticipant.avatarEl);
        }
        
        // VS divider
        const vs = document.createElement('div');
        vs.textContent = 'VS';
        vs.style.cssText = 'font-size:1.2rem;font-weight:bold;color:#83bfff;';
        singleRow.appendChild(vs);
        
        // Focused opponent (if exists)
        if(currentFocusedOpponent){
          singleRow.appendChild(currentFocusedOpponent.avatarEl);
        }
        
        // Remaining count
        const activeOpponents = participants.filter(p => !p.isPlayer && !p.dropTimeMs);
        const remainingCount = activeOpponents.length;
        if(remainingCount > 1){
          const remaining = document.createElement('div');
          remaining.textContent = `+${remainingCount - 1} more`;
          remaining.style.cssText = 'font-size:0.8rem;color:#95a9c0;white-space:nowrap;';
          singleRow.appendChild(remaining);
        }
        
        avatarContainer.appendChild(singleRow);
      }
    }
    
    /**
     * Update focused opponent in single mode
     */
    function updateFocusedOpponent(){
      if(avatarMode !== 'single') return;
      
      const activeOpponents = participants.filter(p => !p.isPlayer && !p.dropTimeMs);
      
      if(activeOpponents.length === 1){
        // Final two - lock to rival
        currentFocusedOpponent = activeOpponents[0];
        // Add gold outline for rival
        const img = currentFocusedOpponent.avatarEl.querySelector('img');
        if(img) img.style.outline = '2px solid #ffd700';
      } else if(activeOpponents.length > 1){
        // Rotate or pick random
        const idx = Math.floor(rng() * activeOpponents.length);
        currentFocusedOpponent = activeOpponents[idx];
      } else {
        currentFocusedOpponent = null;
      }
      
      renderAvatars();
    }
    
    /**
     * Apply fade-out animation to dropped participant
     */
    function fadeOutParticipant(participant){
      const el = participant.avatarEl;
      el.style.opacity = '0.3';
      el.style.filter = 'grayscale(100%)';
      
      // If in single mode, switch focus
      if(avatarMode === 'single' && participant === currentFocusedOpponent){
        setTimeout(() => {
          updateFocusedOpponent();
        }, 500);
      }
    }
    
    /**
     * Mark winner with crown
     */
    function markWinner(participant){
      const badge = participant.avatarEl.querySelector('div:last-child');
      if(badge){
        badge.textContent = '👑 ' + badge.textContent;
        badge.style.color = '#ffd700';
      }
    }
    
    /**
     * Schedule AI opponent drops over 10-minute window
     * Uses later-weighted distribution (power curve: tNorm^1.6)
     */
    function scheduleAIDrops(){
      if(participants.length === 0) return;
      
      const aiOnly = participants.filter(p => !p.isPlayer);
      if(aiOnly.length === 0) return;
      
      // Keep one AI for final two
      const droppersCount = aiOnly.length - 1;
      const dropTimes = [];
      
      // Generate later-weighted drop times
      for(let i = 0; i < droppersCount; i++){
        const tNorm = rng(); // 0-1
        const easedT = Math.pow(tNorm, 1.6); // Power curve for later weighting
        const dropTime = MIN_DROP_MS + easedT * (MAX_DROP_MS - MIN_DROP_MS);
        dropTimes.push({ participant: aiOnly[i], time: dropTime });
      }
      
      // Sort by time
      dropTimes.sort((a, b) => a.time - b.time);
      
      // Schedule each drop
      dropTimes.forEach((drop) => {
        const timer = setTimeout(() => {
          if(!isHolding) return;
          
          drop.participant.dropTimeMs = Date.now() - startTime;
          fadeOutParticipant(drop.participant);
          
          const remaining = participants.filter(p => !p.dropTimeMs).length;
          addFeedMessage(`${drop.participant.name} dropped. ${remaining} remaining.`, '#ff9966');
          
          // Check for final two
          if(remaining === 2){
            const rival = participants.find(p => !p.isPlayer && !p.dropTimeMs);
            if(rival){
              rivalName = rival.name;
              // Add gold outline for rival
              const img = rival.avatarEl.querySelector('img');
              if(img) img.style.outline = '2px solid #ffd700';
              startDealWindow();
            }
          }
        }, drop.time);
        
        dropTimers.push(timer);
      });
    }
    
    /**
     * Start the final-two deal window
     */
    function startDealWindow(){
      if(!rivalName) return;
      
      addFeedMessage(`${rivalName}: "Release now and I won't nominate you!"`, '#ffcc00');
      
      let timeLeft = 10;
      addFeedMessage(`Deal expires in ${timeLeft} seconds...`, '#ffcc00');
      
      dealCountdownInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0){
          addFeedMessage(`Deal expires in ${timeLeft} seconds...`, '#ffcc00');
        }
      }, 1000);
      
      dealWindowTimer = setTimeout(() => {
        if(dealCountdownInterval) clearInterval(dealCountdownInterval);
        addFeedMessage('Deal window expired. Competition continues...', '#95a9c0');
        startPostDealChecks();
      }, 10000);
    }
    
    /**
     * Start post-deal periodic checks
     */
    function startPostDealChecks(){
      postDealInterval = setInterval(() => {
        if(!isHolding || aiDropped) {
          clearInterval(postDealInterval);
          return;
        }
        
        const willDrop = rng() < 0.4; // 40% chance every 20s
        
        if(willDrop){
          aiDropped = true;
          const rival = participants.find(p => p.name === rivalName);
          if(rival){
            rival.dropTimeMs = Date.now() - startTime;
            fadeOutParticipant(rival);
          }
          addFeedMessage(`${rivalName} dropped! You win!`, '#66ff66');
          clearInterval(postDealInterval);
          
          setTimeout(() => {
            if(isHolding){
              endHold(false, true); // AI dropped, player wins
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
      if(pulsateInterval) clearInterval(pulsateInterval);
      if(sheenInterval) clearInterval(sheenInterval);
      dropTimers.forEach(t => clearTimeout(t));
      dropTimers = [];
      if(dealWindowTimer) clearTimeout(dealWindowTimer);
      if(dealCountdownInterval) clearInterval(dealCountdownInterval);
      if(postDealInterval) clearInterval(postDealInterval);
    }
    
    /**
     * Finalize ranking and emit event
     */
    function finalizeRanking(){
      // Build standings ordered by time (longest first)
      const standings = participants
        .filter(p => p.dropTimeMs !== undefined)
        .sort((a, b) => b.dropTimeMs - a.dropTimeMs);
      
      // Emit final standings event
      if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
        const standingsData = standings.map(p => ({
          name: p.name,
          timeMs: p.dropTimeMs
        }));
        g.bbGameBus.emit('holdWall:finalStandings', standingsData);
      }
      
      // Prepare top three for results popup
      const topThree = standings.slice(0, 3).map(p => ({
        name: p.name,
        timeMs: p.dropTimeMs
      }));
      
      return topThree;
    }
    
    /**
     * Start pulsating wall animation
     */
    function startPulsating(){
      let scale = 1.0;
      let growing = true;
      
      pulsateInterval = setInterval(() => {
        if(growing){
          scale += 0.005;
          if(scale >= 1.03) growing = false;
        } else {
          scale -= 0.005;
          if(scale <= 1.0) growing = true;
        }
        wallDiv.style.transform = `scale(${scale})`;
      }, 50);
      
      // Sheen animation
      sheenInterval = setInterval(() => {
        sheen.style.transition = 'none';
        sheen.style.transform = 'translateX(-100%)';
        setTimeout(() => {
          sheen.style.transition = 'transform 1.5s ease';
          sheen.style.transform = 'translateX(100%)';
        }, 50);
      }, 3000);
    }
    
    /**
     * Stop pulsating animation
     */
    function stopPulsating(){
      if(pulsateInterval) clearInterval(pulsateInterval);
      if(sheenInterval) clearInterval(sheenInterval);
      wallDiv.style.transform = 'scale(1)';
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
      
      // Start pulsating
      startPulsating();
      
      // Initialize participants
      const aiNames = initializeParticipants();
      participants = [];
      
      // Create player participant
      const playerData = createAvatarElement('You', true);
      participants.push({
        name: 'You',
        isPlayer: true,
        dropTimeMs: null,
        ...playerData
      });
      
      // Create AI participants
      aiNames.forEach(name => {
        const aiData = createAvatarElement(name, false);
        participants.push({
          name: name,
          isPlayer: false,
          dropTimeMs: null,
          ...aiData
        });
      });
      
      const totalCount = participants.length;
      addFeedMessage(`Challenge started with ${totalCount} participants.`, '#83bfff');
      
      // Initialize single mode focus
      if(avatarMode === 'single'){
        updateFocusedOpponent();
      } else {
        renderAvatars();
      }
      
      // Schedule AI drops
      scheduleAIDrops();
      
      // Start timer display
      timerInterval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        timerDiv.textContent = formatTime(elapsed);
      }, 100);
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
      
      if(distance > MOVE_THRESHOLD){
        endHold(true); // Moved too much
      }
    }
    
    function endHold(moved = false, aiWon = false){
      if(!isHolding) return;
      
      isHolding = false;
      cleanupTimers();
      stopPulsating();
      
      const holdDuration = Date.now() - startTime;
      
      wallDiv.style.background = '#2c3a4d';
      wallDiv.style.color = '#83bfff';
      
      // Record player drop time
      const playerParticipant = participants.find(p => p.isPlayer);
      if(playerParticipant){
        playerParticipant.dropTimeMs = holdDuration;
      }
      
      // Check if during deal window
      const duringDealWindow = rivalName && dealWindowTimer && !aiDropped;
      
      // Winner-takes-all scoring
      let finalScore = 0;
      
      if(aiWon){
        // AI dropped, player wins
        finalScore = 100;
        statusDiv.textContent = 'You win! Others dropped.';
        statusDiv.style.color = '#66ff66';
        addFeedMessage('Challenge complete! You outlasted everyone!', '#66ff66');
        if(playerParticipant) markWinner(playerParticipant);
      } else if(moved){
        // Player moved
        statusDiv.textContent = `You moved! Time: ${formatTime(holdDuration)}`;
        statusDiv.style.color = '#ff6b6b';
        addFeedMessage('You moved too much and lost grip!', '#ff6b6b');
      } else if(duringDealWindow){
        // Deal accepted
        const respected = rng() < 0.8;
        
        if(respected){
          statusDiv.textContent = `Deal accepted! ${rivalName} keeps their promise.`;
          statusDiv.style.color = '#66ff66';
          addFeedMessage(`${rivalName}: "I'll keep my word. You're safe."`, '#66ff66');
        } else {
          statusDiv.textContent = `Deal accepted... but ${rivalName} breaks their promise!`;
          statusDiv.style.color = '#ffcc00';
          addFeedMessage(`${rivalName}: "Sorry, I lied. Game is game."`, '#ff9966');
        }
        
        // Emit deal outcome event
        if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
          g.bbGameBus.emit('holdWall:dealOutcome', {
            rival: rivalName,
            respected: respected
          });
        }
      } else {
        // Player released early
        statusDiv.textContent = `Released! Time: ${formatTime(holdDuration)}`;
        addFeedMessage('You released from the wall.', '#95a9c0');
      }
      
      // Finalize rankings and emit event
      const topThree = finalizeRanking();
      
      // Show results popup if available
      if(g.showResultsPopup && typeof g.showResultsPopup === 'function'){
        setTimeout(() => {
          g.showResultsPopup({
            title: 'Hold Wall Results',
            topThree: topThree,
            winnerEmoji: '👑',
            duration: 5000
          }).then(() => {
            onComplete(finalScore);
          });
        }, 1500);
      } else {
        setTimeout(() => onComplete(finalScore), 1500);
      }
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
