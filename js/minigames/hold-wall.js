// MODULE: minigames/hold-wall.js
// Endurance Challenge - Hold the Wall
// Press and hold a wall avatar - last person standing wins

(function(g){
  'use strict';
  
  const gameId = 'hold-wall';
  
  function render(container, onComplete, options = {}){
    const root = document.createElement('div');
    root.style.cssText = 'position:relative;display:grid;grid-template-rows:auto 1fr auto;height:100%;min-height:480px;background:linear-gradient(180deg,#0d1424,#0f1a2e);color:#e8f3ff;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;overflow:hidden;';
    
    // Game state
    let state = 'instructions'; // instructions, countdown, playing, end
    let score = 0;
    let timeElapsed = 0;
    let startTime = 0;
    let animationFrame = null;
    let participants = [];
    let isHolding = false;
    let hasEnded = false;
    let isProcessingDrops = false;
    let eliminationLog = [];
    
    // AFK detection state
    let hasHumanStartedHolding = false;
    let gracePeriodTimer = null;
    const GRACE_PERIOD_MS = 2000; // 2-second (2000ms) grace period
    
    // Detect competition type
    let compType = 'hoh'; // default
    if(g.game && g.game.phase){
      compType = g.game.phase === 'pov' ? 'pov' : 'hoh';
    }
    
    // Initialize participants
    function setupParticipants(){
      const allPlayers = (g.game && g.game.players) ? g.game.players.filter(p => !p.evicted) : [];
      
      // Apply HOH exclusion rule if needed
      let eligible = allPlayers;
      if(compType === 'hoh'){
        const week = (g.game && g.game.week) || 1;
        const lastHOHId = g.game && g.game.lastHOHId;
        const lastHOHWeek = g.game && g.game.lastHOHWeek;
        
        const shouldExclude = eligible.length > 3 && week > 1 && lastHOHId && lastHOHWeek === (week - 1);
        if(shouldExclude){
          eligible = eligible.filter(p => p.id !== lastHOHId);
          console.log(`[HoldWall] Excluding previous HOH (id: ${lastHOHId})`);
        }
      }
      
      participants = eligible.map(p => ({
        id: p.id,
        name: p.name,
        isPlayer: p.human || p.isPlayer || false,
        dropTimeMs: null,
        avatarUrl: g.resolveAvatar ? g.resolveAvatar(p) : null
      }));
      
      console.log(`[HoldWall] ${participants.length} participants for ${compType} competition`);
    }
    
    setupParticipants();
    
    // Instructions overlay
    const instructionsOverlay = document.createElement('div');
    instructionsOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(10,15,30,0.95);display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:100;';
    instructionsOverlay.innerHTML = `
      <h2 style="margin:0 0 16px;font-size:1.8rem;color:#83bfff;">Hold the Wall</h2>
      <div style="max-width:400px;text-align:center;line-height:1.6;color:#95a9c0;margin-bottom:24px;">
        <p style="margin:0 0 12px;">Press and hold the wall for as long as you can!</p>
        <p style="margin:0 0 12px;"><strong style="color:#e8f3ff;">Click and HOLD</strong> the wall panel</p>
        <p style="margin:0 0 12px;"><strong style="color:#ff6b9d;">Don't let go</strong> - releasing means you drop!</p>
        <p style="margin:0;">Last person standing wins!</p>
      </div>
      <button id="startBtn" style="padding:12px 32px;font-size:1.1rem;background:#83bfff;color:#0b1020;border:none;border-radius:8px;cursor:pointer;font-weight:600;touch-action:manipulation;">
        START GAME
      </button>
    `;
    root.appendChild(instructionsOverlay);
    
    // Countdown overlay
    const countdownOverlay = document.createElement('div');
    countdownOverlay.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(10,15,30,0.9);display:none;flex-direction:column;align-items:center;justify-content:center;z-index:99;';
    countdownOverlay.innerHTML = `
      <div id="countdownText" style="font-size:6rem;font-weight:bold;color:#83bfff;">3</div>
    `;
    root.appendChild(countdownOverlay);
    
    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = 'display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;padding:16px;background:rgba(10,15,30,0.8);backdrop-filter:blur(4px);';
    hud.innerHTML = `
      <div style="text-align:center;">
        <div style="font-size:0.75rem;color:#95a9c0;text-transform:uppercase;margin-bottom:4px;">Time</div>
        <div id="timeDisplay" style="font-size:1.3rem;font-weight:600;color:#83bfff;">0.0s</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:0.75rem;color:#95a9c0;text-transform:uppercase;margin-bottom:4px;">Score</div>
        <div id="scoreDisplay" style="font-size:1.3rem;font-weight:600;color:#83bfff;">0</div>
      </div>
      <div style="text-align:center;">
        <div style="font-size:0.75rem;color:#95a9c0;text-transform:uppercase;margin-bottom:4px;">Remaining</div>
        <div id="remainingDisplay" style="font-size:1.3rem;font-weight:600;color:#83bfff;">${participants.length}</div>
      </div>
    `;
    root.appendChild(hud);
    
    // Game area
    const gameArea = document.createElement('div');
    gameArea.style.cssText = 'position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:20px;';
    
    // Participants display
    const participantsDisplay = document.createElement('div');
    participantsDisplay.id = 'participantsDisplay';
    participantsDisplay.style.cssText = 'display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-bottom:30px;max-width:600px;';
    
    function renderParticipants(){
      participantsDisplay.innerHTML = participants.map(p => {
        const dropped = p.dropTimeMs !== null;
        const avatarStyle = dropped ? 'opacity:0.3;filter:grayscale(100%);' : '';
        const borderColor = p.isPlayer ? '#83bfff' : '#555';
        return `
          <div style="text-align:center;">
            <div style="width:60px;height:60px;border-radius:50%;border:3px solid ${borderColor};overflow:hidden;background:#1a2a3a;${avatarStyle}">
              ${p.avatarUrl ? `<img src="${p.avatarUrl}" alt="${p.name}" style="width:100%;height:100%;object-fit:cover;">` : `<div style="display:flex;align-items:center;justify-content:center;height:100%;font-size:1.5rem;color:#83bfff;">${p.name[0]}</div>`}
            </div>
            <div style="font-size:0.75rem;margin-top:4px;color:${dropped ? '#666' : '#95a9c0'};">${p.name}</div>
          </div>
        `;
      }).join('');
    }
    
    renderParticipants();
    gameArea.appendChild(participantsDisplay);
    
    // Wall panel
    const wallPanel = document.createElement('div');
    wallPanel.id = 'wallPanel';
    wallPanel.style.cssText = 'width:100%;max-width:400px;height:180px;background:linear-gradient(180deg,#2a4a6a,#1a2a3a);border:4px solid #83bfff;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:3rem;font-weight:bold;cursor:grab;user-select:none;transition:all 0.2s;box-shadow:0 4px 20px rgba(0,0,0,0.4);';
    wallPanel.textContent = 'WALL';
    gameArea.appendChild(wallPanel);
    
    // Status message
    const statusMsg = document.createElement('div');
    statusMsg.id = 'statusMsg';
    statusMsg.style.cssText = 'margin-top:20px;font-size:1.1rem;color:#95a9c0;text-align:center;min-height:30px;';
    statusMsg.textContent = 'Click START to begin';
    gameArea.appendChild(statusMsg);
    
    root.appendChild(gameArea);
    
    // End screen
    const endScreen = document.createElement('div');
    endScreen.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;background:rgba(10,15,30,0.95);display:none;flex-direction:column;align-items:center;justify-content:center;padding:20px;z-index:98;';
    endScreen.innerHTML = `
      <div style="text-align:center;max-width:500px;">
        <h2 style="margin:0 0 20px;font-size:2rem;color:#83bfff;">Competition Complete!</h2>
        <div style="font-size:1.2rem;color:#95a9c0;margin-bottom:30px;">
          <div style="margin:10px 0;">Time: <span id="finalTime" style="color:#e8f3ff;font-weight:600;">0s</span></div>
          <div style="margin:10px 0;">Score: <span id="finalScore" style="color:#e8f3ff;font-weight:600;">0</span></div>
        </div>
        <div id="standingsContainer" style="margin-top:20px;"></div>
      </div>
    `;
    root.appendChild(endScreen);
    
    // Append to container
    container.appendChild(root);
    
    // Event handlers
    const startBtn = root.querySelector('#startBtn');
    let mouseDownTime = 0;
    
    function startCountdown(){
      state = 'countdown';
      instructionsOverlay.style.display = 'none';
      countdownOverlay.style.display = 'flex';
      
      let count = 3;
      const countdownText = root.querySelector('#countdownText');
      
      const countInterval = setInterval(() => {
        count--;
        if(count > 0){
          countdownText.textContent = count;
        } else {
          countdownText.textContent = 'GO!';
          setTimeout(() => {
            countdownOverlay.style.display = 'none';
            startGame();
          }, 500);
          clearInterval(countInterval);
        }
      }, 1000);
    }
    
    function startGame(){
      state = 'playing';
      startTime = Date.now();
      statusMsg.textContent = 'Hold the wall!';
      
      // Start AI drop simulation
      startAIDrops();
      
      // Start game loop
      gameLoop();
      
      // AFK FIX: Start grace period timer
      // If human never starts holding within grace period, automatically drop them
      gracePeriodTimer = setTimeout(() => {
        if(!hasHumanStartedHolding && !hasEnded && state === 'playing'){
          console.log('[HoldWall] Grace period expired - human never started holding, auto-dropping');
          const playerParticipant = participants.find(p => p.isPlayer);
          if(playerParticipant && playerParticipant.dropTimeMs === null){
            // Mark player as dropped immediately
            const dropTime = Date.now() - startTime;
            playerParticipant.dropTimeMs = dropTime;
            eliminationLog.push({
              name: playerParticipant.name,
              timeMs: dropTime,
              isPlayer: true
            });
            
            statusMsg.textContent = 'You never held the wall!';
            statusMsg.style.color = '#ff6b6b';
            
            // Check if game should end
            checkGameEnd();
          }
        }
      }, GRACE_PERIOD_MS);
    }
    
    function startAIDrops(){
      const dropInterval = 10000; // Check every 10 seconds
      const baseProbability = 0.44; // 44% chance per check
      
      const dropTimer = setInterval(() => {
        if(hasEnded || state !== 'playing'){
          clearInterval(dropTimer);
          return;
        }
        
        selectAndDropCandidates(baseProbability);
      }, dropInterval);
    }
    
    function selectAndDropCandidates(probability){
      if(isProcessingDrops || hasEnded) return;
      
      // Get AI participants who haven't dropped
      const aiParticipants = participants.filter(p => !p.isPlayer && p.dropTimeMs === null);
      if(aiParticipants.length === 0) return;
      
      // Roll for each AI
      const candidates = aiParticipants.filter(p => Math.random() < probability);
      if(candidates.length === 0) return;
      
      // Apply competition-specific limits
      const maxDrops = compType === 'pov' ? 1 : 2;
      const selectedToDrop = candidates.slice(0, maxDrops);
      
      // Process drops sequentially
      isProcessingDrops = true;
      processSequentialDrops(selectedToDrop, () => {
        isProcessingDrops = false;
      });
    }
    
    function processSequentialDrops(dropList, callback){
      if(dropList.length === 0){
        if(callback) callback();
        return;
      }
      
      const participant = dropList[0];
      const remaining = dropList.slice(1);
      
      // Drop this participant
      dropParticipant(participant);
      
      // Process next after stagger delay
      if(remaining.length > 0){
        const staggerDelay = 800 + Math.floor(Math.random() * 400); // 800-1200ms
        setTimeout(() => {
          processSequentialDrops(remaining, callback);
        }, staggerDelay);
      } else {
        if(callback) callback();
      }
    }
    
    function dropParticipant(participant){
      if(!participant || participant.dropTimeMs !== null) return;
      
      const dropTime = Date.now() - startTime;
      participant.dropTimeMs = dropTime;
      
      eliminationLog.push({
        name: participant.name,
        timeMs: dropTime,
        isPlayer: participant.isPlayer
      });
      
      console.log(`[HoldWall] ${participant.name} dropped at ${(dropTime/1000).toFixed(1)}s`);
      
      // Update UI
      renderParticipants();
      updateRemaining();
      
      // Check if game should end
      checkGameEnd();
    }
    
    function checkGameEnd(){
      // Find participants still holding - CRITICAL: use correct filter
      const stillHolding = participants.filter(p => p.dropTimeMs === null);
      
      if(stillHolding.length === 1){
        // One person left - they win!
        const winner = stillHolding[0];
        console.log(`[HoldWall] Last person standing: ${winner.name} (isPlayer: ${winner.isPlayer})`);
        
        if(winner.isPlayer){
          finalizeVictory();
        } else {
          finalizeResults();
        }
      } else if(stillHolding.length === 0){
        // Everyone dropped (shouldn't happen, but handle gracefully)
        finalizeResults();
      }
    }
    
    function handleMouseDown(e){
      if(state !== 'playing' || hasEnded) return;
      e.preventDefault();
      
      if(!isHolding){
        isHolding = true;
        hasHumanStartedHolding = true; // AFK FIX: Track that human has started
        mouseDownTime = Date.now();
        wallPanel.style.background = 'linear-gradient(180deg,#3a6a9a,#2a4a7a)';
        wallPanel.style.transform = 'scale(0.98)';
        wallPanel.style.cursor = 'grabbing';
        statusMsg.textContent = 'Keep holding!';
        
        // AFK FIX: Clear grace period timer since they started holding
        if(gracePeriodTimer){
          clearTimeout(gracePeriodTimer);
          gracePeriodTimer = null;
        }
      }
    }
    
    function handleMouseUp(e){
      if(state !== 'playing' || hasEnded) return;
      
      if(isHolding){
        // Player released - they drop!
        endHold();
      }
    }
    
    function endHold(){
      if(hasEnded) return;
      
      isHolding = false;
      hasEnded = true;
      
      // AFK FIX: Clear grace period timer if it's still running
      if(gracePeriodTimer){
        clearTimeout(gracePeriodTimer);
        gracePeriodTimer = null;
      }
      
      // Check if player was the last one standing before they released
      const stillHoldingBeforeRelease = participants.filter(p => p.dropTimeMs === null);
      if(stillHoldingBeforeRelease.length === 1 && stillHoldingBeforeRelease[0].isPlayer){
        console.log('[HoldWall] Player was last standing before release - should not happen in normal flow');
      }
      
      const dropTime = Date.now() - startTime;
      const playerParticipant = participants.find(p => p.isPlayer);
      
      if(playerParticipant){
        playerParticipant.dropTimeMs = dropTime;
        eliminationLog.push({
          name: playerParticipant.name,
          timeMs: dropTime,
          isPlayer: true
        });
        
        console.log(`[HoldWall] Player dropped at ${(dropTime/1000).toFixed(1)}s`);
      }
      
      wallPanel.style.background = 'linear-gradient(180deg,#2a4a6a,#1a2a3a)';
      wallPanel.style.transform = 'scale(1)';
      statusMsg.textContent = 'You released!';
      
      // Mark remaining AI as still holding with current time
      const stillHoldingAI = participants.filter(p => !p.isPlayer && p.dropTimeMs === null);
      stillHoldingAI.forEach(p => {
        p.dropTimeMs = dropTime;
        eliminationLog.push({
          name: p.name,
          timeMs: dropTime,
          isPlayer: false
        });
      });
      
      // Update displays
      renderParticipants();
      updateRemaining();
      
      finalizeResults();
    }
    
    function finalizeVictory(){
      if(hasEnded) return;
      hasEnded = true;
      
      // AFK FIX: Clear grace period timer if it's still running
      if(gracePeriodTimer){
        clearTimeout(gracePeriodTimer);
        gracePeriodTimer = null;
      }
      
      const victoryTime = Date.now() - startTime;
      score = 100; // Winner gets max score
      
      console.log(`[HoldWall] Player wins! Held for ${(victoryTime/1000).toFixed(1)}s`);
      
      statusMsg.textContent = 'YOU WIN!';
      statusMsg.style.color = '#66ff66';
      statusMsg.style.fontSize = '2rem';
      
      // Build final standings with player first
      const playerParticipant = participants.find(p => p.isPlayer);
      if(playerParticipant){
        playerParticipant.dropTimeMs = victoryTime;
        
        // Player is first, others get 0 score
        const standings = [
          { name: playerParticipant.name, timeMs: victoryTime, score: 100, isPlayer: true }
        ];
        
        // Add eliminated in reverse order
        eliminationLog.reverse().forEach(entry => {
          standings.push({ ...entry, score: 0 });
        });
        
        displayResults(standings, victoryTime);
      }
    }
    
    function finalizeResults(){
      if(state === 'end') return; // Already finalized
      state = 'end';
      
      const finalTime = Date.now() - startTime;
      
      // Build final standings: still holding first, then eliminated in reverse order
      const stillHolding = participants.filter(p => p.dropTimeMs === null);
      const dropped = participants.filter(p => p.dropTimeMs !== null);
      
      // Sort dropped by time (latest first)
      dropped.sort((a, b) => b.dropTimeMs - a.dropTimeMs);
      
      const finalStandings = [
        ...stillHolding.map(p => ({
          name: p.name,
          timeMs: finalTime,
          score: 100,
          isPlayer: p.isPlayer
        })),
        ...dropped.map((p, idx) => ({
          name: p.name,
          timeMs: p.dropTimeMs,
          score: stillHolding.length === 0 && idx === 0 ? 100 : 0,
          isPlayer: p.isPlayer
        }))
      ];
      
      console.log('[HoldWall] Final standings:', finalStandings.map(s => `${s.name}: ${s.score}`).join(', '));
      
      displayResults(finalStandings, finalTime);
    }
    
    function displayResults(standings, finalTime){
      // Update HUD
      root.querySelector('#finalTime').textContent = `${(finalTime / 1000).toFixed(1)}s`;
      root.querySelector('#finalScore').textContent = standings[0].score;
      
      // Build standings list
      const standingsHTML = standings.slice(0, 5).map((s, idx) => {
        const place = idx + 1;
        const medal = place === 1 ? '🥇' : place === 2 ? '🥈' : place === 3 ? '🥉' : '';
        return `
          <div style="display:flex;justify-content:space-between;align-items:center;padding:10px;margin:5px 0;background:rgba(44,58,77,0.3);border-radius:6px;${s.isPlayer ? 'border:2px solid #83bfff;' : ''}">
            <span style="font-weight:600;color:#e8f3ff;">${medal} ${place}. ${s.name}</span>
            <span style="color:#95a9c0;">${(s.timeMs / 1000).toFixed(1)}s</span>
          </div>
        `;
      }).join('');
      
      root.querySelector('#standingsContainer').innerHTML = standingsHTML;
      
      // Show end screen
      endScreen.style.display = 'flex';
      
      // Store results globally
      if(g.lastCompScores){
        const scoresMap = new Map();
        
        // OPTIMIZATION: Create lookup map to avoid O(n²) complexity
        const participantsByName = new Map(participants.map(p => [p.name, p]));
        
        standings.forEach(s => {
          // Find the participant to get their player ID
          const participant = participantsByName.get(s.name);
          if(participant && participant.id !== undefined){
            scoresMap.set(participant.id, s.score);
          }
        });
        g.lastCompScores = scoresMap;
        
        // ENDURANCE FIX: Mark winner as authoritative to prevent override by fallback logic
        // Store winner player ID for HOH/POV determination
        const winnerParticipant = participantsByName.get(standings[0].name);
        if(winnerParticipant && winnerParticipant.id !== undefined){
          g.__authoritativeWinner = {
            playerId: winnerParticipant.id,
            score: standings[0].score,
            minigame: gameId,
            compType: compType, // 'hoh' or 'pov'
            timestamp: Date.now()
          };
          console.log(`[HoldWall] ✓ Authoritative winner set: Player ${winnerParticipant.id} (${standings[0].name}) for ${compType}`);
        }
      }
      
      // Dispatch event
      g.dispatchEvent(new CustomEvent('minigame:end', {
        detail: {
          game: gameId,
          score: standings[0].score,
          standings: standings
        }
      }));
      
      // Call completion callback after delay
      setTimeout(() => {
        if(typeof onComplete === 'function'){
          onComplete(standings[0].score);
        }
      }, 2000);
    }
    
    function gameLoop(){
      if(state !== 'playing' || hasEnded){
        return;
      }
      
      timeElapsed = Date.now() - startTime;
      score = Math.floor(timeElapsed / 100); // Score = time in deciseconds
      
      updateHUD();
      
      animationFrame = requestAnimationFrame(gameLoop);
    }
    
    function updateHUD(){
      root.querySelector('#timeDisplay').textContent = `${(timeElapsed / 1000).toFixed(1)}s`;
      root.querySelector('#scoreDisplay').textContent = score;
    }
    
    function updateRemaining(){
      const remaining = participants.filter(p => p.dropTimeMs === null).length;
      root.querySelector('#remainingDisplay').textContent = remaining;
    }
    
    // Wire up events
    startBtn.addEventListener('click', startCountdown);
    wallPanel.addEventListener('mousedown', handleMouseDown);
    wallPanel.addEventListener('touchstart', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('touchend', handleMouseUp);
  }
  
  // Export
  if(!g.MiniGames) g.MiniGames = {};
  g.MiniGames.holdWall = { render };
  
})(window);
