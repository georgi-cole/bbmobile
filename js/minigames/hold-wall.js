// MODULE: minigames/hold-wall.js
// Hold Wall - Endurance competition with hidden timer (90-200s), deal mechanics, and fail-safe

(function(g){
  'use strict';

  // Constants - Updated per requirements
  const MIN_HIDDEN_DURATION_MS = 90000;  // 90 seconds minimum
  const MAX_HIDDEN_DURATION_MS = 200000; // 200 seconds maximum
  const MULTI_PARTICIPANT_CHECK_INTERVAL = 10000; // 10 seconds
  const MULTI_PARTICIPANT_DROP_CHANCE = 0.44; // 44% chance
  const DEAL_WINDOW_MS = 10000; // 10 seconds for deal decision
  const POST_DEAL_CHECK_INTERVAL = 15000; // 15 seconds
  const POST_DEAL_DROP_CHANCE = 0.30; // 30% chance
  const DEAL_REOFFIER_INTERVAL = 60000; // 60 seconds
  const FAIL_SAFE_BUFFER_MS = 20000; // Start acceleration 20s before end
  const FINAL_FORCE_MS = 5000; // Force resolve in final 5s
  const BASE_NO_NOMINATION_CHANCE = 0.65; // 65% base chance AI respects deal
  const MOVE_THRESHOLD = 15; // pixels
  const POV_MAX_DROPS_PER_TICK = 1; // POV: max 1 drop per tick
  const HOH_MAX_DROPS_PER_TICK = 2; // HOH: max 2 drops per tick
  const DROP_STAGGER_MIN_MS = 800; // Minimum delay between sequential drops
  const DROP_STAGGER_MAX_MS = 1200; // Maximum delay between sequential drops
  const DROP_COMPLETION_BUFFER_MS = 1500; // Buffer for drop sequence completion checks

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
   * Detect competition type from game state
   * @returns {string} 'hoh', 'pov', or 'unknown'
   */
  function detectCompetitionType(){
    if(!g.game) return 'unknown';
    const phase = g.game.phase || '';
    
    // Check for POV/veto phases
    if(phase.includes('pov') || phase.includes('veto')) return 'pov';
    
    // Check for HOH phases
    if(phase.includes('hoh') || phase === 'hoh') return 'hoh';
    
    return 'unknown';
  }

  /**
   * Get eligible participants based on competition type
   * @param {string} compType - Competition type ('hoh', 'pov', or 'unknown')
   * @returns {Array} Array of player objects
   */
  function getEligibleParticipants(compType){
    if(!g.game || !g.game.players || !Array.isArray(g.game.players)){
      return [];
    }
    
    const players = g.game.players;
    
    if(compType === 'pov'){
      // POV: Only the 6 veto-selected players
      // Check if we have povPlayers or vetoPlayers stored in game state
      if(g.game.povPlayers && Array.isArray(g.game.povPlayers)){
        const povPlayerIds = g.game.povPlayers;
        return players.filter(p => povPlayerIds.includes(p.id) && !p.evicted);
      }
      
      // Fallback: If no POV players specified, use HOH + nominees + 3 random
      // This is a safety fallback - in real game this should be set by nominations phase
      console.warn('[HoldWall] No POV players found in game state, using fallback selection');
      const hohId = g.game.hohId;
      const nominees = g.game.nominees || [];
      const eligible = players.filter(p => !p.evicted);
      
      // Get HOH and nominees first
      const povSet = new Set();
      if(hohId) povSet.add(hohId);
      nominees.forEach(id => povSet.add(id));
      
      // Fill remaining slots with random non-evicted players
      const remaining = eligible.filter(p => !povSet.has(p.id));
      while(povSet.size < 6 && remaining.length > 0){
        const idx = Math.floor(Math.random() * remaining.length);
        povSet.add(remaining[idx].id);
        remaining.splice(idx, 1);
      }
      
      return players.filter(p => povSet.has(p.id) && !p.evicted);
    }
    
    // HOH or unknown: All non-evicted players
    return players.filter(p => !p.evicted);
  }

  /**
   * Hold Wall minigame - Endurance competition with hidden timer
   * 
   * @param {HTMLElement} container - Container element for the game UI
   * @param {Function} onComplete - Callback function(score) when game ends
   * @param {Object} options - Configuration options
   * @param {number} options.seed - Optional seed for deterministic AI behavior
   * @param {string} options.avatarMode - Manual override for avatar mode (strip/tiny/single)
   * @param {string} options.competitionType - Type of competition ('hoh' or 'pov')
   */
  function render(container, onComplete, options = {}){
    container.innerHTML = '';
    
    const { 
      seed,
      avatarMode: manualAvatarMode,
      competitionType
    } = options;
    
    // Determine avatar display mode
    const avatarMode = chooseAvatarMode(manualAvatarMode);
    const rng = seed !== undefined ? createSeededRNG(seed) : Math.random;
    
    // Determine hidden duration (90-200 seconds)
    const hiddenDuration = MIN_HIDDEN_DURATION_MS + rng() * (MAX_HIDDEN_DURATION_MS - MIN_HIDDEN_DURATION_MS);
    console.log(`[HoldWall] Hidden duration: ${(hiddenDuration/1000).toFixed(1)}s`);
    
    // Detect competition type from game state if not provided
    const detectedCompType = competitionType || detectCompetitionType();
    
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
    
    // Timer display - HIDDEN per requirements (no visible countdown)
    // NOTE: timerDiv is intentionally hidden and never updated for Hold the Wall
    const timerDiv = document.createElement('div');
    timerDiv.textContent = ''; // Empty - no visible timer
    timerDiv.style.cssText = 'display:none;'; // Hidden
    
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
    let initialPos = null;
    let pulsateInterval = null;
    let sheenInterval = null;
    let hasEnded = false; // Guard to prevent duplicate end calls
    let isProcessingDrops = false; // Lock to prevent overlapping drop sequences during tick processing
    
    // Participant tracking: { name, isPlayer, dropTimeMs, avatarEl, img, badge, player }
    let participants = [];
    // Track participant drops in chronological order for proper ranking: { name, timeMs }
    let eliminationLog = [];
    
    // Endurance engine state
    let multiParticipantCheckInterval = null; // For >2 participants, check every 10s
    let failSafeTimer = null; // Hidden timer end trigger
    let acceleratedCheckInterval = null; // Fail-safe acceleration checks
    let dealWindowTimer = null;
    let dealCountdownInterval = null;
    let postDealCheckInterval = null;
    let dealReofferTimer = null;
    let rivalName = null;
    let rivalPlayer = null;
    let currentFocusedOpponent = null;
    let isInDealWindow = false;
    
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
     * Initialize participants based on competition type
     * Returns array of player objects (not just names)
     */
    function initializeParticipants(){
      // Get eligible participants based on competition type
      const eligiblePlayers = getEligibleParticipants(detectedCompType);
      
      if(eligiblePlayers.length > 0){
        console.log(`[HoldWall] Using ${eligiblePlayers.length} eligible participants for ${detectedCompType} competition`);
        return eligiblePlayers;
      }
      
      // Fallback if no game state available
      console.warn('[HoldWall] No game state available, using fallback participants');
      const defaults = ['Finn', 'Mimi', 'Rae', 'Nova', 'Kai', 'Zed', 'Ivy', 'Ash', 'Lux', 'Remy'];
      const count = Math.floor(rng() * 4) + 6; // 6-9 AI participants
      const fallbackPlayers = [];
      
      // Create mock player objects
      for(let i = 0; i < count; i++){
        fallbackPlayers.push({
          name: defaults[i % defaults.length],
          id: `fallback_${i}`,
          human: false,
          evicted: false
        });
      }
      
      return fallbackPlayers;
    }
    
    /**
     * Create avatar element for a participant
     */
    function createAvatarElement(name, isPlayer, player){
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
      // Use actual player image properties before falling back to DiceBear
      let avatarUrl = null;
      if(player){
        // Note: These properties come from game state which is controlled by the app
        avatarUrl = player.avatar || player.img || player.photo;
      }
      img.src = avatarUrl || getAvatarUrl(name);
      img.alt = name;
      img.onerror = function(){ 
        // On error, fall back to DiceBear
        this.src = getAvatarUrl(name + '_alt'); 
      };
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
     * Start the new endurance engine
     * Implements periodic checks with hidden timer fail-safe
     */
    function startEnduranceEngine(){
      console.log(`[HoldWall] Starting endurance engine with hidden duration: ${(hiddenDuration/1000).toFixed(1)}s`);
      
      // Schedule fail-safe timer
      failSafeTimer = setTimeout(() => {
        handleFailSafeEnd();
      }, hiddenDuration);
      
      // Schedule fail-safe acceleration (starts 20s before end)
      const accelerationStart = hiddenDuration - FAIL_SAFE_BUFFER_MS;
      if(accelerationStart > 0){
        setTimeout(() => {
          startFailSafeAcceleration();
        }, accelerationStart);
      }
      
      // Start multi-participant checks (>2 participants)
      startMultiParticipantChecks();
    }
    
    /**
     * Multi-participant check: every 10s, select candidates to drop based on competition type
     * POV: max 1 drop per tick
     * HOH: max 2 drops per tick
     */
    function startMultiParticipantChecks(){
      multiParticipantCheckInterval = setInterval(() => {
        if(!isHolding || hasEnded || isProcessingDrops) {
          if(!isHolding || hasEnded) {
            clearInterval(multiParticipantCheckInterval);
          }
          return;
        }
        
        const remaining = participants.filter(p => !p.dropTimeMs);
        
        if(remaining.length <= 2){
          // Stop multi-participant checks, transition to final two
          clearInterval(multiParticipantCheckInterval);
          
          if(remaining.length === 2){
            handleFinalTwo(remaining);
          } else if(remaining.length === 1 && remaining[0].isPlayer){
            // Player won!
            finalizeVictory();
          }
          return;
        }
        
        // Select candidates to drop based on competition type
        selectAndDropCandidates(MULTI_PARTICIPANT_DROP_CHANCE, 'lost grip');
        
      }, MULTI_PARTICIPANT_CHECK_INTERVAL);
    }
    
    /**
     * Handle participant drop
     */
    function dropParticipant(participant, reason = 'dropped'){
      if(participant.dropTimeMs) return; // Already dropped
      
      const dropTime = Date.now() - startTime;
      participant.dropTimeMs = dropTime;
      
      // Add to elimination log
      eliminationLog.push({ name: participant.name, timeMs: dropTime });
      
      fadeOutParticipant(participant);
      
      const remaining = participants.filter(p => !p.dropTimeMs).length;
      addFeedMessage(`${participant.name} ${reason}. ${remaining} remaining.`, '#ff9966');
      console.log(`[HoldWall] ${participant.name} dropped at ${(dropTime/1000).toFixed(1)}s, ${remaining} remaining`);
    }
    
    /**
     * Select and drop candidates based on probability and competition type limits
     * POV: max 1 drop per tick
     * HOH: max 2 drops per tick
     * @param {number} dropProbability - Probability for each candidate (0-1)
     * @param {string} reason - Reason for dropping
     */
    function selectAndDropCandidates(dropProbability, reason = 'dropped'){
      if(isProcessingDrops) return; // Already processing drops
      
      // Get AI participants who haven't dropped yet
      const aiParticipants = participants.filter(p => !p.isPlayer && !p.dropTimeMs);
      if(aiParticipants.length === 0) return;
      
      // Determine max drops for this tick based on competition type
      const maxDropsPerTick = detectedCompType === 'pov' ? POV_MAX_DROPS_PER_TICK : HOH_MAX_DROPS_PER_TICK;
      
      // Roll for each candidate and collect those who should drop
      const candidatesToDrop = [];
      for(const ai of aiParticipants){
        if(rng() < dropProbability){
          candidatesToDrop.push(ai);
        }
      }
      
      // Limit to max drops per tick
      const selectedToDrop = candidatesToDrop.slice(0, maxDropsPerTick);
      
      if(selectedToDrop.length === 0) return;
      
      // Process drops sequentially with stagger
      isProcessingDrops = true;
      processSequentialDrops(selectedToDrop, reason, () => {
        isProcessingDrops = false;
      });
    }
    
    /**
     * Process drops sequentially with visual stagger
     * @param {Array} dropList - Array of participants to drop
     * @param {string} reason - Reason for dropping
     * @param {Function} callback - Called when all drops are processed
     */
    function processSequentialDrops(dropList, reason, callback){
      if(dropList.length === 0){
        if(callback) callback();
        return;
      }
      
      const participant = dropList[0];
      const remaining = dropList.slice(1);
      
      // Drop this participant
      dropParticipant(participant, reason);
      
      // If more drops to process, wait before next drop
      if(remaining.length > 0){
        const staggerDelay = DROP_STAGGER_MIN_MS + Math.floor(rng() * (DROP_STAGGER_MAX_MS - DROP_STAGGER_MIN_MS));
        setTimeout(() => {
          processSequentialDrops(remaining, reason, callback);
        }, staggerDelay);
      } else {
        // All drops processed
        if(callback) callback();
      }
    }
    
    /**
     * Handle final two scenario
     */
    function handleFinalTwo(remaining){
      const aiParticipant = remaining.find(p => !p.isPlayer);
      
      if(!aiParticipant){
        // Player already won
        finalizeVictory();
        return;
      }
      
      rivalName = aiParticipant.name;
      rivalPlayer = aiParticipant.player;
      
      // Add gold outline for rival
      const img = aiParticipant.avatarEl.querySelector('img');
      if(img) img.style.outline = '2px solid #ffd700';
      
      console.log(`[HoldWall] Final two: player vs ${rivalName}`);
      startDealWindow();
    }
    
    /**
     * Start the final-two deal window (10 seconds)
     */
    function startDealWindow(){
      if(!rivalName || isInDealWindow) return;
      
      isInDealWindow = true;
      addFeedMessage(`${rivalName}: "Release now and I won't nominate you!"`, '#ffcc00');
      console.log(`[HoldWall] Deal offered by ${rivalName}`);
      
      let timeLeft = 10;
      addFeedMessage(`Deal decision: ${timeLeft} seconds...`, '#ffcc00');
      
      dealCountdownInterval = setInterval(() => {
        timeLeft--;
        if(timeLeft > 0){
          addFeedMessage(`Deal decision: ${timeLeft} seconds...`, '#ffcc00');
        }
      }, 1000);
      
      dealWindowTimer = setTimeout(() => {
        if(dealCountdownInterval) clearInterval(dealCountdownInterval);
        isInDealWindow = false;
        addFeedMessage('Deal declined. Competition continues...', '#95a9c0');
        console.log(`[HoldWall] Deal window expired, starting post-deal checks`);
        startPostDealChecks();
      }, DEAL_WINDOW_MS);
    }
    
    /**
     * Start post-deal periodic checks (every 15s, 30% chance AI drops)
     * Re-offer deal every 60s
     */
    function startPostDealChecks(){
      postDealCheckInterval = setInterval(() => {
        if(!isHolding || hasEnded) {
          clearInterval(postDealCheckInterval);
          return;
        }
        
        // 30% chance rival drops
        if(rng() < POST_DEAL_DROP_CHANCE){
          const rival = participants.find(p => p.name === rivalName);
          if(rival && !rival.dropTimeMs){
            dropParticipant(rival, 'dropped');
            addFeedMessage(`${rivalName} couldn't hold on! You win!`, '#66ff66');
            clearInterval(postDealCheckInterval);
            if(dealReofferTimer) clearTimeout(dealReofferTimer);
            
            setTimeout(() => {
              if(isHolding && !hasEnded){
                finalizeVictory();
              }
            }, 1000);
          }
        } else {
          addFeedMessage(`${rivalName} holds on...`, '#95a9c0');
        }
      }, POST_DEAL_CHECK_INTERVAL);
      
      // Re-offer deal every 60s
      function scheduleNextDealOffer(){
        dealReofferTimer = setTimeout(() => {
          if(!isHolding || hasEnded) return;
          
          // Check if rival still active
          const rival = participants.find(p => p.name === rivalName);
          if(rival && !rival.dropTimeMs){
            // Re-offer deal
            isInDealWindow = false; // Reset flag
            if(dealCountdownInterval) clearInterval(dealCountdownInterval);
            if(dealWindowTimer) clearTimeout(dealWindowTimer);
            
            console.log(`[HoldWall] Re-offering deal to player`);
            startDealWindow();
            
            // Schedule next offer
            scheduleNextDealOffer();
          }
        }, DEAL_REOFFIER_INTERVAL);
      }
      
      scheduleNextDealOffer();
    }
    
    /**
     * Start fail-safe acceleration in final 20 seconds
     * Accelerate checks to every 5s and ramp up drop odds
     */
    function startFailSafeAcceleration(){
      console.log(`[HoldWall] Starting fail-safe acceleration`);
      addFeedMessage('Endurance test intensifying...', '#ffcc00');
      
      let checkCount = 0;
      const maxChecks = 4; // ~20s / 5s = 4 checks
      
      acceleratedCheckInterval = setInterval(() => {
        if(!isHolding || hasEnded || isProcessingDrops){
          if(!isHolding || hasEnded){
            clearInterval(acceleratedCheckInterval);
          }
          return;
        }
        
        checkCount++;
        
        // Ramp up drop odds: 44% → 65% → 85%
        const baseOdds = 0.44;
        const rampFactor = checkCount / maxChecks;
        const dropOdds = baseOdds + (0.41 * rampFactor); // 0.44 → 0.85
        
        console.log(`[HoldWall] Accelerated check ${checkCount}/${maxChecks}, drop odds: ${(dropOdds*100).toFixed(0)}%`);
        
        // Use sequential drop logic respecting max-per-tick rules
        selectAndDropCandidates(dropOdds, 'couldn\'t endure');
        
        // Check game state after drop sequence completes
        // Note: DROP_COMPLETION_BUFFER_MS allows time for sequential drops to finish.
        // Worst case: 2 drops with DROP_STAGGER_MAX_MS delay = ~DROP_STAGGER_MAX_MS total.
        // The buffer ensures all drops are processed before checking final state.
        setTimeout(() => {
          const stillRemaining = participants.filter(p => !p.dropTimeMs);
          if(stillRemaining.length === 2){
            clearInterval(acceleratedCheckInterval);
            handleFinalTwo(stillRemaining);
          } else if(stillRemaining.length === 1 && stillRemaining[0].isPlayer){
            clearInterval(acceleratedCheckInterval);
            finalizeVictory();
          }
        }, DROP_COMPLETION_BUFFER_MS);
        
      }, 5000); // Check every 5 seconds
    }
    
    /**
     * Force-resolve endurance at hidden timer expiry
     * Ensure single winner in final 5 seconds
     */
    function handleFailSafeEnd(){
      if(hasEnded) return;
      
      console.log(`[HoldWall] Fail-safe triggered at hidden timer expiry`);
      
      const remaining = participants.filter(p => !p.dropTimeMs);
      
      if(remaining.length > 1){
        // Force drop all non-players
        const aiRemaining = remaining.filter(p => !p.isPlayer);
        aiRemaining.forEach(ai => {
          dropParticipant(ai, 'exhausted');
        });
        
        // Give a moment for logs, then finalize
        setTimeout(() => {
          if(!hasEnded && isHolding){
            finalizeVictory();
          }
        }, 1000);
      } else if(remaining.length === 1 && remaining[0].isPlayer){
        finalizeVictory();
      }
    }
    
    /**
     * Clean up all timers and intervals
     */
    function cleanupTimers(){
      if(pulsateInterval) clearInterval(pulsateInterval);
      if(sheenInterval) clearInterval(sheenInterval);
      if(multiParticipantCheckInterval) clearInterval(multiParticipantCheckInterval);
      if(acceleratedCheckInterval) clearInterval(acceleratedCheckInterval);
      if(failSafeTimer) clearTimeout(failSafeTimer);
      if(dealWindowTimer) clearTimeout(dealWindowTimer);
      if(dealCountdownInterval) clearInterval(dealCountdownInterval);
      if(postDealCheckInterval) clearInterval(postDealCheckInterval);
      if(dealReofferTimer) clearTimeout(dealReofferTimer);
    }
    
    /**
     * Finalize victory when player is last remaining
     */
    function finalizeVictory(){
      if(hasEnded) return; // Prevent duplicate calls
      hasEnded = true;
      
      cleanupTimers();
      stopPulsating();
      
      const totalTime = Date.now() - startTime;
      
      wallDiv.style.background = '#2c3a4d';
      wallDiv.style.color = '#83bfff';
      
      // Mark player as winner (no need to set dropTimeMs as they didn't drop)
      const playerParticipant = participants.find(p => p.isPlayer);
      if(playerParticipant){
        markWinner(playerParticipant);
      }
      
      statusDiv.textContent = 'You win! Others dropped.';
      statusDiv.style.color = '#66ff66';
      addFeedMessage('Challenge complete! You outlasted everyone!', '#66ff66');
      
      // Build final standings
      const finalStandings = buildFinalStandings(totalTime);
      
      // Show results popup
      showResults(finalStandings, 100); // Winner-takes-all: score 100
    }
    
    /**
     * Build final standings: winner first, then elimination log reversed
     */
    function buildFinalStandings(winnerTime){
      // Use consistent 'You' for player name to match participant initialization
      const playerName = 'You';
      
      // Winner first with final time
      const finalStandings = [
        { name: playerName, timeMs: winnerTime }
      ];
      
      // Then reversed elimination log (most recent drops = higher placement)
      const reversed = [...eliminationLog].reverse();
      finalStandings.push(...reversed);
      
      // Emit final standings event
      if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
        g.bbGameBus.emit('holdWall:finalStandings', finalStandings);
      }
      
      return finalStandings;
    }
    
    /**
     * Show results popup with top 3
     */
    function showResults(finalStandings, score){
      // Prepare top three for results popup
      const topThree = finalStandings.slice(0, 3);
      
      // Show results popup if available
      if(g.showResultsPopup && typeof g.showResultsPopup === 'function'){
        setTimeout(() => {
          g.showResultsPopup({
            title: 'Hold Wall Results',
            topThree: topThree,
            winnerEmoji: '👑',
            duration: 5000
          }).then(() => {
            wrappedOnComplete(score);
          });
        }, 1500);
      } else {
        setTimeout(() => wrappedOnComplete(score), 1500);
      }
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
      const eligiblePlayers = initializeParticipants();
      participants = [];
      eliminationLog = []; // Reset elimination log
      
      // Get human player
      let humanPlayer = eligiblePlayers.find(p => p.human);
      if(!humanPlayer && g.game && g.game.players){
        humanPlayer = g.game.players.find(p => p.human);
      }
      
      // Create player participant
      const playerData = createAvatarElement('You', true, humanPlayer);
      participants.push({
        name: 'You',
        isPlayer: true,
        dropTimeMs: null,
        player: humanPlayer,
        ...playerData
      });
      
      // Create AI participants from eligible players
      const aiPlayers = eligiblePlayers.filter(p => !p.human);
      aiPlayers.forEach(aiPlayer => {
        const aiData = createAvatarElement(aiPlayer.name, false, aiPlayer);
        participants.push({
          name: aiPlayer.name,
          isPlayer: false,
          dropTimeMs: null,
          player: aiPlayer,
          ...aiData
        });
      });
      
      const totalCount = participants.length;
      addFeedMessage(`Challenge started with ${totalCount} participants (${detectedCompType.toUpperCase()} competition).`, '#83bfff');
      console.log(`[HoldWall] Started with ${totalCount} participants for ${detectedCompType} competition`);
      
      // Initialize single mode focus
      if(avatarMode === 'single'){
        updateFocusedOpponent();
      } else {
        renderAvatars();
      }
      
      // Start new endurance engine
      startEnduranceEngine();
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
    
    function endHold(moved = false){
      if(!isHolding || hasEnded) return; // Guard against duplicate calls
      
      isHolding = false;
      hasEnded = true;
      cleanupTimers();
      stopPulsating();
      
      const holdDuration = Date.now() - startTime;
      
      wallDiv.style.background = '#2c3a4d';
      wallDiv.style.color = '#83bfff';
      
      // Record player drop time in elimination log
      // Use consistent 'You' for player name to match participant initialization
      const playerName = 'You';
      
      // Add player to elimination log
      eliminationLog.push({ name: playerName, timeMs: holdDuration });
      
      // Check if during deal window
      const duringDealWindow = isInDealWindow && rivalName;
      
      // Player loses (score = 0)
      const finalScore = 0;
      
      if(moved){
        // Player moved
        statusDiv.textContent = `You moved! Time: ${formatTime(holdDuration)}`;
        statusDiv.style.color = '#ff6b6b';
        addFeedMessage('You moved too much and lost grip!', '#ff6b6b');
        console.log(`[HoldWall] Player moved, lost at ${(holdDuration/1000).toFixed(1)}s`);
      } else if(duringDealWindow){
        // Deal accepted - calculate respect chance based on relationship
        const baseChance = BASE_NO_NOMINATION_CHANCE; // 65%
        let respectChance = baseChance;
        
        // Adjust based on relationship if available
        if(rivalPlayer && g.game){
          const humanPlayer = g.game.players?.find(p => p.human);
          if(humanPlayer && g.game.relationships){
            // Get relationship strength (-100 to +100)
            const rel = g.game.relationships[rivalPlayer.id]?.[humanPlayer.id] || 0;
            
            // Strong allies (+80 to +100): add up to +20% (65% → 85%)
            // Weak allies (+40 to +80): add up to +10% (65% → 75%)
            // Neutral (-40 to +40): no change (stays 65%)
            // Enemies (-100 to -40): reduce up to -30% (65% → 35%)
            if(rel > 0){
              respectChance = baseChance + (rel / 100) * 0.20; // Up to +20%
            } else if(rel < 0){
              respectChance = baseChance + (rel / 100) * 0.30; // Up to -30%
            }
            
            console.log(`[HoldWall] Deal respect chance: ${(respectChance*100).toFixed(0)}% (base: ${(baseChance*100).toFixed(0)}%, relationship: ${rel})`);
          }
        }
        
        const respected = rng() < respectChance;
        
        if(respected){
          statusDiv.textContent = `Deal accepted! ${rivalName} keeps their promise.`;
          statusDiv.style.color = '#66ff66';
          addFeedMessage(`${rivalName}: "I'll keep my word. You're safe."`, '#66ff66');
          console.log(`[HoldWall] Deal accepted and respected by ${rivalName}`);
        } else {
          statusDiv.textContent = `Deal accepted... but ${rivalName} breaks their promise!`;
          statusDiv.style.color = '#ffcc00';
          addFeedMessage(`${rivalName}: "Sorry, I lied. Game is game."`, '#ff9966');
          console.log(`[HoldWall] Deal accepted but broken by ${rivalName}`);
        }
        
        // Emit deal outcome event
        if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
          g.bbGameBus.emit('holdWall:dealOutcome', {
            rival: rivalName,
            respected: respected,
            respectChance: respectChance
          });
        }
      } else {
        // Player released early
        statusDiv.textContent = `Released! Time: ${formatTime(holdDuration)}`;
        addFeedMessage('You released from the wall.', '#95a9c0');
        console.log(`[HoldWall] Player released at ${(holdDuration/1000).toFixed(1)}s`);
      }
      
      // Build final standings with player not as winner
      // Winners are those still holding (haven't dropped yet)
      // Get all participants who are still holding (dropTimeMs === null)
      const stillHolding = participants.filter(p => !p.dropTimeMs);
      
      // Sort still-holding by time still holding (all have same time since we just stopped)
      // but maintain consistent ordering by using participant name
      const holdingStandings = stillHolding.map(p => ({
        name: p.name,
        timeMs: holdDuration // They're still holding at this time
      }));
      
      // Then add eliminated players in reverse chronological order (last to drop = higher placement)
      const eliminatedStandings = [...eliminationLog].reverse();
      
      // Combine: winners first, then eliminated players
      const finalStandings = [...holdingStandings, ...eliminatedStandings];
      
      // Emit final standings event
      if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
        g.bbGameBus.emit('holdWall:finalStandings', finalStandings);
      }
      
      // Show results popup
      showResults(finalStandings, finalScore);
    }
    
    // Global mouse/touch release handlers
    function handleGlobalMouseUp(){
      if(isHolding && !hasEnded){
        endHold(false);
      }
    }
    
    function handleGlobalTouchEnd(){
      if(isHolding && !hasEnded){
        endHold(false);
      }
    }
    
    // Cleanup function for global event listeners
    function cleanupGlobalListeners(){
      document.removeEventListener('mouseup', handleGlobalMouseUp);
      document.removeEventListener('touchend', handleGlobalTouchEnd);
    }
    
    // Wrap onComplete to ensure cleanup
    function wrappedOnComplete(score){
      cleanupGlobalListeners();
      onComplete(score);
    }
    
    // Mouse events
    wallDiv.addEventListener('mousedown', startHold);
    wallDiv.addEventListener('mousemove', checkMove);
    document.addEventListener('mouseup', handleGlobalMouseUp);
    
    // Touch events
    wallDiv.addEventListener('touchstart', (e) => {
      e.preventDefault();
      startHold(e);
    });
    wallDiv.addEventListener('touchmove', (e) => {
      e.preventDefault();
      checkMove(e);
    });
    document.addEventListener('touchend', handleGlobalTouchEnd);
  }

  // Export
  if(typeof g.MiniGames === 'undefined') g.MiniGames = {};
  g.MiniGames.holdWall = { render };

})(window);
