// twists.js — formatting fixes + no duplicate Skip hook
// - Live bars already implemented
// - Removed explicit '#btnSkipPhase' listener (skip still ends via phase timer/controls)
// - Added clamped name rendering and safe updates

(function(global){

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'juror')}`;
  };

  function ap(){ return (global.alivePlayers?.()||[]).slice(); }
  function gp(id){ return global.getP?.(id); }
  function rand(){ return (global.rng?.() ?? Math.random()); }

  // ======= JUROR RETURN TIMING CONSTANTS =======
  const JUROR_RETURN_TIMING = {
    ANNOUNCEMENT_MODAL: 4000,        // Initial announcement modal duration
    VOTE_DURATION: 5000,             // Live voting duration
    VOTE_TICK_INTERVAL: 160,         // Vote count update interval
    LEADER_FLASH_DURATION: 600,      // Flash animation for leader change
    RESULT_WAIT_AFTER_VOTE: 600,     // Pause after voting ends
    RESULT_CARD_DURATION: 3500,      // Result announcement card duration
    REVIVE_ANIMATION: 1200,          // Winner revive animation duration
    FINAL_CARD_DURATION: 4000,       // Final "They're Back" card duration
    POST_TWIST_BUFFER: 600,          // Buffer before resuming week
    PHASE_TIMEOUT: 12000,            // Total phase timeout (safety net - covers voting only)
    PANEL_FADE_OUT: 400,             // Panel fade out transition
    WINNER_CELEBRATION: 1000,        // Winner highlight before cleanup
  };

  // ======= CENTRALIZED JUROR RETURN HELPERS =======
  
  /**
   * Get or initialize the initial player count for the season
   * @param {object} g - Game state object
   * @returns {number} Initial player count
   */
  function getInitialPlayersCount(g){
    if(!g) return 12;
    // If already set, use cached value
    if(typeof g.__initialPlayers === 'number' && g.__initialPlayers > 0){
      return g.__initialPlayers;
    }
    // Otherwise, determine from config or current roster and cache it
    const fromConfig = Number(g.cfg?.numPlayers || 0);
    if(fromConfig > 0){
      g.__initialPlayers = fromConfig;
      return fromConfig;
    }
    // Fallback: count current roster (alive + evicted + jury)
    const alive = ap().length;
    const jurors = Array.isArray(g.juryHouse) ? g.juryHouse.length : 0;
    const evicted = (g.players || []).filter(p => p.evicted && !g.juryHouse?.includes(p.id)).length;
    const total = alive + jurors + evicted;
    g.__initialPlayers = Math.max(total, 12); // Default to 12 if calculation fails
    return g.__initialPlayers;
  }

  /**
   * Determine required juror count based on initial cast size
   * @param {number} initialPlayers - Initial player count
   * @returns {number} Required juror count (5 if >10 players, else 4)
   */
  function getJurorReturnRequiredJurors(initialPlayers){
    return (initialPlayers > 10) ? 5 : 4;
  }

  /**
   * Check if juror return twist has already run this season
   * @param {object} g - Game state object
   * @returns {boolean} True if twist has run
   */
  function hasJurorReturnRun(g){
    if(!g) return true;
    return !!(g.__americaReturnDone || g.__jurorReturnDone);
  }

  /**
   * Check if juror return twist is eligible to run (not considering chance/RNG)
   * @param {object} g - Game state object
   * @returns {boolean} True if all eligibility criteria are met
   */
  function isJurorReturnEligible(g){
    if(!g) return false;
    
    // Must have jury house enabled
    if(!g.cfg?.enableJuryHouse) return false;
    
    // Must not have already run
    if(hasJurorReturnRun(g)) return false;
    
    // Check alive player count against configurable thresholds
    const aliveCount = ap().length;
    const aliveMin = parseInt(g.cfg?.jurorReturnAliveMin, 10) || 6;
    const aliveMax = parseInt(g.cfg?.jurorReturnAliveMax, 10) || 6;
    if(aliveCount < aliveMin || aliveCount > aliveMax) return false;
    
    // Must have sufficient jurors (configurable minimum)
    const jurorCount = Array.isArray(g.juryHouse) ? g.juryHouse.length : 0;
    const minJurors = parseInt(g.cfg?.jurorReturnMinJurors, 10) || 2;
    if(jurorCount < minJurors) return false;
    
    return true;
  }

  /**
   * Parse and normalize juror return chance from config
   * @param {object} cfg - Game config object
   * @returns {number} Normalized chance as percentage (0-100)
   */
  function getJurorReturnChance(cfg){
    if(!cfg) return 0;
    const returnChance = Number(
      cfg.juryReturnChance || cfg.jurorReturnChance || cfg.returnChance || cfg.pJuryReturn || 0
    );
    // Normalize: if value > 1, treat as 0..100, else treat as 0..1
    return (returnChance > 1) ? returnChance : returnChance * 100;
  }

  /**
   * Decide if juror return should activate THIS week (cached per week)
   * This function checks eligibility AND rolls the RNG once per week
   * @param {object} g - Game state object
   * @returns {boolean} True if twist should activate this week
   */
  function decideJurorReturnThisWeek(g){
    if(!g) return false;
    
    // Check if we already decided for this week
    if(g.__jurorReturnDecision && g.__jurorReturnDecision.week === g.week){
      return g.__jurorReturnDecision.pass;
    }
    
    // First, check eligibility (doesn't involve RNG)
    if(!isJurorReturnEligible(g)){
      // Cache negative decision
      g.__jurorReturnDecision = { week: g.week, pass: false };
      return false;
    }
    
    // Now roll the dice (once per week)
    const normalizedChance = getJurorReturnChance(g.cfg);
    const roll = rand() * 100;
    const pass = roll < normalizedChance;
    
    // Cache the decision
    g.__jurorReturnDecision = { week: g.week, pass: pass };
    return pass;
  }

  // Expose helpers on global
  global.getInitialPlayersCount = getInitialPlayersCount;
  global.getJurorReturnRequiredJurors = getJurorReturnRequiredJurors;
  global.isJurorReturnEligible = isJurorReturnEligible;
  global.decideJurorReturnThisWeek = decideJurorReturnThisWeek;

  // ======= TWIST STATE HELPERS =======
  
  /**
   * Check if a twist is currently active
   * @param {object} g - Game state object
   * @returns {boolean} True if any twist is active
   */
  function isTwist(g){
    return !!(g && g.__twistMode);
  }

  /**
   * Get number of nomination slots for current twist
   * @param {object} g - Game state object
   * @returns {number} Number of nomination slots (2, 3, or 4)
   */
  function getTwistNomSlots(g){
    if(!g) return 2;
    if(g.__twistMode === 'triple') return 4;
    if(g.__twistMode === 'double') return 3;
    return 2;
  }

  /**
   * Get planned number of evictions for current twist
   * @param {object} g - Game state object
   * @returns {number} Planned evictions (1, 2, or 3)
   */
  function getPlannedEvictions(g){
    if(!g) return 1;
    if(g.__twistMode === 'triple') return 3;
    if(g.__twistMode === 'double') return 2;
    return 1;
  }

  // Expose twist helpers on global
  global.isTwist = isTwist;
  global.getTwistNomSlots = getTwistNomSlots;
  global.getPlannedEvictions = getPlannedEvictions;

  /**
   * Pick weekly twist based on config probabilities
   * Triple eviction takes priority over double when both are possible
   * @param {object} g - Game state object
   * @returns {string|null} 'triple', 'double', or null
   */
  function pickWeeklyTwist(g){
    if(!g) return null;
    // Determine alive players using ap() helper or fallback to g.players
    const aliveCount = (typeof ap === 'function' ? ap().length : 0)
      || (Array.isArray(g.players) ? g.players.filter(p => !p.evicted).length : 0);
    if(aliveCount <= 6) return null;
    
    const dc = Number(g.cfg?.doubleChance || 0);
    const tc = Number(g.cfg?.tripleChance || 0);
    
    // No twists configured
    if(dc <= 0 && tc <= 0) return null;
    
    const roll = rand() * 100;
    
    // Triple takes priority: if roll < tc, activate triple
    if(tc > 0 && roll < tc){
      return 'triple';
    }
    
    // Double: if roll < dc, activate double
    if(dc > 0 && roll < dc){
      return 'double';
    }
    
    return null;
  }

  async function decideForWeek(){
    const g=global.game; if(!g) return;
    if(g.__twistDecidedWeek===g.week) return;

    // Reset twist state
    g.doubleEvictionWeek=false;
    g.tripleEvictionWeek=false;
    g.__twistMode=null;
    g.__twistPlannedEvictions=1;
    g.__twistNomSlots=2;
    g.__twistDecidedWeek=g.week;
    // Reset badge flag to prevent badge from appearing before announcement modal
    g.__twistBadgeShown=false;

    // IMPORTANT: Await self-eviction to complete BEFORE proceeding with week logic
    // This ensures the self-eviction card, animation, and cleanup happen before the new week modal
    await tryMaybeAutoSelfEvict();

    // Use centralized twist selection logic
    const twist = pickWeeklyTwist(g);
    
    if(twist === 'triple'){
      g.tripleEvictionWeek=true;
      g.__twistMode='triple';
      g.__twistPlannedEvictions=3;
      g.__twistNomSlots=4;
      // Twist announcement now handled by showTwistAnnouncementIfNeeded modal
    } else if(twist === 'double'){
      g.doubleEvictionWeek=true;
      g.__twistMode='double';
      g.__twistPlannedEvictions=2;
      g.__twistNomSlots=3;
      // Twist announcement now handled by showTwistAnnouncementIfNeeded modal
    }
    
    global.updateHud?.();
  }

  async function startAmericaReturnVote(){
    const g=global.game||{};
    
    // Use centralized decision logic (includes eligibility + RNG, cached per week)
    if(!decideJurorReturnThisWeek(g)){
      return resumeWeekAfterReturn();
    }

    // ======= TWIST ACTIVATED - SET FLAGS =======
    // Mark as activated immediately to prevent re-triggering
    // Note: __jurorReturnDone is set to 'activated' here, 'done' in finalize
    // This allows future competitive return paths to check activation vs completion
    g.__americaReturnActivated=true;
    g.__jurorReturnActivated=true;
    
    // Set legacy flags for backward compatibility
    g.__americaReturnDone=true;
    g.__jurorReturnDone=true;

    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];

    // Show twist announcement modal before starting the twist
    if (typeof global.showEventModal === 'function' && !g.__jurorReturnModalShown) {
      g.__jurorReturnModalShown = true;
      try {
        await global.showEventModal({
          title: 'House Shock!',
          emojis: '👁️⚖️🔙',
          subtitle: 'A jury member re-enters the house!',
          tone: 'special',
          duration: JUROR_RETURN_TIMING.ANNOUNCEMENT_MODAL
        });
      } catch (e) {
        console.error('[twists] Error showing juror return modal:', e);
      }
    }

    // Use constant for vote duration
    const voteDurationMs = JUROR_RETURN_TIMING.VOTE_DURATION;
    
    g.__returnTwist={
      jurors: jurors.slice(),
      counts: new Map(jurors.map(id=>[id,0])),
      weights: new Map(jurors.map(id=>[id, 0.7 + rand()*1.1])),
      started: Date.now(),
      durationMs: voteDurationMs,
      finished:false,
      lastLeader:null,
      _tick:null,
      _heartbeat:null,
      _lastUpdate:0,
      _seeded:false,
      _domCache:null,
    };

    global.setPhase?.('return_twist', JUROR_RETURN_TIMING.PHASE_TIMEOUT / 1000, ()=>{
      if(!g.__returnTwist?.finished) finalizeAmericaReturnVote(true);
    });

    seedReturnCounts(g.__returnTwist);
    renderReturnTwistPanel();
    startReturnVoteTicker();
  }

  function seedReturnCounts(st){
    if(st._seeded) return;
    st._seeded=true;
    const base=6 + Math.random()*4;
    st.jurors.forEach((id,i)=>{
      const initial = base + i + Math.random()*3;
      st.counts.set(id, initial);
    });
    updateReturnTwistCards();
  }

  function startReturnVoteTicker(){
    const g=global.game; const st=g.__returnTwist; if(!st) return;

    if(st._tick) clearInterval(st._tick);
    if(st._heartbeat) clearInterval(st._heartbeat);

    st._tick=setInterval(()=>{
      accumulateBurst(st);
      updateReturnTwistCards();
      if(Date.now()-st.started >= st.durationMs){
        finalizeAmericaReturnVote(false);
      }
    }, JUROR_RETURN_TIMING.VOTE_TICK_INTERVAL);

    st._heartbeat=setInterval(()=>{
      updateReturnTwistCards();
    }, 500);
  }

  function accumulateBurst(st){
    if(st.finished) return;
    const loops=2+Math.floor(Math.random()*3);
    for(let i=0;i<loops;i++){
      const id=st.jurors[Math.floor(Math.random()*st.jurors.length)];
      const w=st.weights.get(id)||1;
      const cur=st.counts.get(id)||0;
      const inc=(0.6+Math.random()*0.9)*(0.8+w*0.5);
      st.counts.set(id,cur+inc);
    }
  }

  function updateReturnTwistCards(){
    const g=global.game; const st=g.__returnTwist; if(!st) return;
    
    // Use cached DOM references if available, fallback to querySelector
    const useCached = st._domCache && Object.keys(st._domCache).length > 0;
    
    let total=0, max=-Infinity, leader=null;
    st.counts.forEach(v=>{ total+=v; if(v>max) max=v; });
    if(total<=0) total=1;

    st.jurors.forEach(id=>{
      const c=st.counts.get(id)||0;
      const pctNum=(c/total)*100;
      const pct=Math.max(0,Math.min(100,Math.round(pctNum)));
      const isLead=(c===max && max>0);
      
      if(useCached && st._domCache[id]){
        // Use cached references for performance (NO progress bars)
        const cache = st._domCache[id];
        if(cache.pct) cache.pct.textContent=pct+'%';
        if(cache.slot){
          cache.slot.classList.toggle('jrLeading',isLead);
        }
        if(isLead && leader===null) leader=id;
      } else {
        // Fallback to querySelector (for compatibility)
        const panel=document.querySelector('#panel .jrVotePanel'); if(!panel) return;
        const slot=panel.querySelector(`.jrSlot[data-id="${id}"]`);
        if(!slot) return;
        const pctSpan=slot.querySelector('.jrPct');
        if(pctSpan) pctSpan.textContent=pct+'%';
        slot.classList.toggle('jrLeading',isLead);
        if(isLead && leader===null) leader=id;
      }
    });

    // ARIA live update for leader change
    if(st.lastLeader!==leader && leader!==null){
      st.lastLeader=leader;
      const leaderName = global.safeName?.(leader) || 'Juror';
      
      // Add flash to leader slot (using jrSlot instead of orphaned rtCard)
      if(useCached && st._domCache[leader]?.slot){
        const leaderSlot = st._domCache[leader].slot;
        leaderSlot.classList.add('flash');
        setTimeout(()=>leaderSlot.classList.remove('flash'), JUROR_RETURN_TIMING.LEADER_FLASH_DURATION);
      } else {
        // Fallback: find slot by data-id
        const panel=document.querySelector('#panel .jrVotePanel');
        if(panel){
          const leaderSlot=panel.querySelector(`.jrSlot[data-id="${leader}"]`);
          if(leaderSlot){ 
            leaderSlot.classList.add('flash'); 
            setTimeout(()=>leaderSlot.classList.remove('flash'), JUROR_RETURN_TIMING.LEADER_FLASH_DURATION);
          }
        }
      }
      
      // Announce leader change to screen readers
      if(useCached && st._domCache.liveRegion){
        st._domCache.liveRegion.textContent = `${leaderName} is now in the lead`;
      } else {
        const liveRegion = document.getElementById('rtLiveRegion');
        if(liveRegion) liveRegion.textContent = `${leaderName} is now in the lead`;
      }
    }
  }

  // Constants for juror return UI
  const JUROR_RETURN_PANEL_SELECTORS = '.jrVotePanel, .jrPanel, .jrModalHost';
  const MAIN_AVATAR_SELECTORS = '[data-id="{id}"] img, [data-player-id="{id}"] img, .player-avatar[data-id="{id}"]';

  /**
   * Wait for the voting panel to be removed from DOM
   * @param {number} maxWaitMs - Maximum time to wait (default 3000ms)
   * @returns {Promise<void>} Resolves when panel is gone or timeout
   */
  async function waitForPanelGone(maxWaitMs = 3000){
    const startTime = Date.now();
    const checkInterval = 100;
    
    return new Promise((resolve) => {
      const check = () => {
        // Check if panel with jrVotePanel is gone
        const panel = document.querySelector(JUROR_RETURN_PANEL_SELECTORS);
        
        if(!panel){
          console.info('[waitForPanelGone] panel removed');
          resolve();
          return;
        }
        
        // Check timeout
        if(Date.now() - startTime >= maxWaitMs){
          console.warn('[waitForPanelGone] timeout reached, proceeding anyway');
          resolve();
          return;
        }
        
        // Check again after interval
        setTimeout(check, checkInterval);
      };
      
      check();
    });
  }

  /**
   * Show juror return result with animation
   * @param {number} winnerId - ID of the returning juror
   * @param {number} percent - Winning percentage
   * @returns {Promise<void>} Resolves after animation completes
   */
  async function showJurorReturnResult(winnerId, percent){
    if(!winnerId) return;
    
    // Wait for panel to be removed before showing result
    await waitForPanelGone(3000);
    
    const winnerName = global.safeName?.(winnerId) || 'Juror';
    const pctDisplay = Math.round(percent);
    const message = `With ${pctDisplay}% ${winnerName} is back to the game.`;
    
    // Show result card using global.showCard if available
    if(typeof global.showCard === 'function'){
      try{
        global.showCard('America Votes — Result', [message], 'jury', JUROR_RETURN_TIMING.RESULT_CARD_DURATION, true);
      }catch(e){
        console.warn('[showJurorReturnResult] showCard failed:', e);
      }
    } else {
      // Fallback: simple DOM modal (create dedicated overlay container)
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(10,19,31,0.85);z-index:600;';
      const card = document.createElement('div');
      card.style.cssText = 'background:linear-gradient(145deg,#0e1622,#0a131f);border:2px solid rgba(110,160,220,.25);border-radius:16px;padding:24px;max-width:480px;text-align:center;';
      card.innerHTML = `<div style="font-size:1rem;font-weight:700;color:#6ea0dc;margin-bottom:12px;">AMERICA VOTES — RESULT</div><div style="font-size:0.95rem;color:#eaf4ff;">${message}</div>`;
      modal.appendChild(card);
      
      // Get or create overlay container
      let overlayContainer = document.getElementById('overlay');
      if(!overlayContainer){
        overlayContainer = document.createElement('div');
        overlayContainer.id = 'overlay';
        overlayContainer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:500;';
        document.body.appendChild(overlayContainer);
      }
      overlayContainer.appendChild(modal);
      setTimeout(()=>modal.remove(), JUROR_RETURN_TIMING.RESULT_CARD_DURATION);
    }
    
    // Trigger revive animation on main screen avatar (not panel avatar since panel is gone)
    // Look for the winner's avatar in the main UI (roster/HUD)
    const avatarSelector = MAIN_AVATAR_SELECTORS.replace(/{id}/g, winnerId);
    const mainAvatar = document.querySelector(avatarSelector);
    
    if(mainAvatar && typeof global.animateReviveAvatar === 'function'){
      try{
        await global.animateReviveAvatar(mainAvatar, JUROR_RETURN_TIMING.REVIVE_ANIMATION);
      }catch(e){
        console.warn('[showJurorReturnResult] Animation failed:', e);
        // Fallback: add class directly
        try{
          mainAvatar.classList.add('revive-avatar');
          await new Promise(resolve => setTimeout(resolve, JUROR_RETURN_TIMING.REVIVE_ANIMATION));
          mainAvatar.classList.remove('revive-avatar');
        }catch(e2){
          console.warn('[showJurorReturnResult] Fallback animation also failed:', e2);
        }
      }
    } else {
      console.info('[showJurorReturnResult] Main avatar not found or animateReviveAvatar unavailable');
    }
    
    // Small delay to let animation be visible
    await new Promise(resolve => setTimeout(resolve, JUROR_RETURN_TIMING.RESULT_WAIT_AFTER_VOTE));
  }

  async function finalizeAmericaReturnVote(){
    const g=global.game; const st=g.__returnTwist;
    
    // Idempotency guard - prevent double finalization
    if(!st || st.finished) return;
    
    // Mark as finished immediately to prevent re-entry
    st.finished=true;
    
    // Mark twist as fully completed (vs just activated)
    g.__americaReturnCompleted=true;
    g.__jurorReturnCompleted=true;
    
    // Clean up intervals exactly once
    if(st._tick){
      clearInterval(st._tick);
      st._tick = null;
    }
    if(st._heartbeat){
      clearInterval(st._heartbeat);
      st._heartbeat = null;
    }

    const values=[...st.counts.values()];
    if(values.length && values.every(v=>Math.abs(v-values[0])<0.001)){
      const pick=st.jurors[Math.floor(Math.random()*st.jurors.length)];
      st.counts.set(pick,(st.counts.get(pick)||0)+0.75);
    }
    updateReturnTwistCards();

    const sorted=st.jurors.map(id=>({id,c:st.counts.get(id)||0})).sort((a,b)=>b.c-a.c);
    const winnerId=sorted.length?sorted[0].id:null;

    if(winnerId!==null){
      const w=gp(winnerId);
      // Normalize percentage: compute (winnerRaw / totalCount) * 100
      const totalCount = [...st.counts.values()].reduce((a,b)=>a+b,0) || 1;
      const winnerRaw = st.counts.get(winnerId) || 0;
      const winnerPercent = Math.round((winnerRaw / totalCount) * 100);
      
      if(w){ w.evicted=false; delete w.weekEvicted; }
      if(Array.isArray(g.juryHouse)) g.juryHouse=g.juryHouse.filter(id=>id!==winnerId);

      try{
        global.addJuryLog?.(`<b>${global.safeName(winnerId)}</b> wins America's Vote and returns!`,'ok');
        global.setMusic?.('victory',true);
      }catch(e){
        console.warn('[finalizeAmericaReturnVote] Error logging or setting music:', e);
      }
      
      g.__returnFlashId=winnerId;
      setTimeout(()=>{ g.__returnFlashId=null; global.updateHud?.(); }, JUROR_RETURN_TIMING.PHASE_TIMEOUT - JUROR_RETURN_TIMING.POST_TWIST_BUFFER);
      // Flags already set at eligibility check
      
      // Update PlayerService after player returns
      if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
        global.PlayerService.setAlivePlayers(g.players);
      }
      
      // Show result announcement and animation with proper sequential flow
      (async () => {
        try{
          // Step 1: Celebrate winner (highlight slot)
          await celebrateWinner(winnerId);
          
          // Step 2: Fade out panel smoothly
          await fadeOutPanel();
          
          // Step 3: Clean up panel from DOM
          cleanupReturnPanel();
          
          // Step 4: Show result with animation after panel is removed
          await showJurorReturnResult(winnerId, winnerPercent);
          
          // Step 5: Show final card
          global.showCard?.('They\'re Back!',[`${global.safeName(winnerId)} re-enters the house.`,'They are eligible for HOH.'],'return',JUROR_RETURN_TIMING.FINAL_CARD_DURATION,true);
          await global.cardQueueWaitIdle?.();
          
          // Step 6: Resume game flow after all UI completes
          resumeWeekAfterReturn();
        }catch(e){
          console.error('[finalizeAmericaReturnVote] Error in result announcement:', e);
          // Still cleanup on error to prevent stuck state
          cleanupReturnPanel();
          resumeWeekAfterReturn();
        }
      })();
    } else {
      try{ 
        global.showCard?.('No Returnee',['Vote produced no clear winner.'],'jury',3200,true); 
      }catch(e){
        console.warn('[finalizeAmericaReturnVote] Error showing no returnee card:', e);
      }
      cleanupReturnPanel();
      resumeWeekAfterReturn();
    }
  }

  /**
   * Fade out the voting panel smoothly before removal
   * @returns {Promise<void>} Resolves after fade completes
   */
  async function fadeOutPanel(){
    const panel = document.getElementById('panel');
    if(!panel) return;
    
    const modalHost = panel.querySelector('.jrModalHost');
    if(!modalHost) return;
    
    // Add fade-out class for smooth transition
    modalHost.style.transition = `opacity ${JUROR_RETURN_TIMING.PANEL_FADE_OUT}ms ease-out`;
    modalHost.style.opacity = '0';
    
    // Wait for transition to complete
    await new Promise(resolve => setTimeout(resolve, JUROR_RETURN_TIMING.PANEL_FADE_OUT));
  }

  /**
   * Highlight winner slot with celebration animation
   * @param {number} winnerId - ID of the winning juror
   * @returns {Promise<void>} Resolves after celebration animation
   */
  async function celebrateWinner(winnerId){
    if(!winnerId) return;
    
    const g = global.game;
    const st = g?.__returnTwist;
    if(!st) return;
    
    const panel = document.querySelector('#panel .jrVotePanel');
    if(!panel) return;
    
    const winnerSlot = panel.querySelector(`.jrSlot[data-id="${winnerId}"]`);
    if(!winnerSlot){
      console.warn('[celebrateWinner] Winner slot not found:', winnerId);
      return;
    }
    
    // Add winner class for celebration animation
    winnerSlot.classList.add('jrWinner');
    
    // Wait for celebration animation
    await new Promise(resolve => setTimeout(resolve, JUROR_RETURN_TIMING.WINNER_CELEBRATION));
  }

  function cleanupReturnPanel(){
    const panel=document.getElementById('panel');
    if(!panel) return;
    
    // Remove modal host and panel elements from DOM
    const modalHost = panel.querySelector('.jrModalHost');
    if(modalHost){
      modalHost.remove();
    }
    
    // Also remove any stray jrPanel elements not in modalHost
    const strayPanels = panel.querySelectorAll('.jrPanel');
    strayPanels.forEach(p => p.remove());
    
    // Clear cached DOM references
    const g = global.game;
    if(g?.__returnTwist?._domCache){
      g.__returnTwist._domCache = null;
    }
    
    // Use inline status instead of below-TV message
    if (window.TvStatus?.set) {
      window.TvStatus.set("America's Vote complete.");
    }
  }

  function resumeWeekAfterReturn(){
    const g=global.game; if(!g) return;
    if(g.phase!=='return_twist'){
      if(!['intermission','hoh','nominations'].includes(g.phase)){
        global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
      }
      return;
    }
    global.tv?.say?.('Intermission');
    global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
  }

  function renderReturnTwistPanel(){
    const g=global.game; const st=g.__returnTwist;
    const panel=document.getElementById('panel'); if(!panel) return;
    if(g.phase!=='return_twist'){
      // Use inline status instead of below-TV message
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('Return twist not active.', 'muted');
      } else {
        panel.innerHTML='<div class="tiny muted">Return twist not active.</div>';
      }
      return;
    }
    panel.innerHTML='';
    
    // Build modal host wrapper with flexbox centering (matching Fan Favorite)
    const modalHost = document.createElement('div');
    modalHost.className = 'jrModalHost';
    modalHost.setAttribute('data-bb-card', 'true');
    
    // Build panel with compact single card design
    const panelEl = document.createElement('div');
    panelEl.className = 'jrPanel';
    panelEl.setAttribute('role', 'dialog');
    panelEl.setAttribute('aria-label', 'Juror Return voting simulation');
    
    const title = document.createElement('div');
    title.className = 'jrTitle';
    title.textContent = 'AMERICA\'S VOTE — JUROR RETURN';
    panelEl.appendChild(title);
    
    // Live region for accessibility (NO timer line per requirements)
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    panelEl.appendChild(liveRegion);
    liveRegion.textContent = 'Live juror return vote updating';
    
    const container = document.createElement('div');
    container.className = 'jrVotePanel';
    panelEl.appendChild(container);
    
    modalHost.appendChild(panelEl);
    
    // Cache DOM references for performance
    if(!st._domCache) st._domCache = {};
    
    // Create slots for each juror (avatar + name + % only, NO progress bars)
    st.jurors.forEach(id=>{
      const p=gp(id);
      const jurorName = global.safeName?.(id) || 'Juror';
      
      const slot = document.createElement('div');
      slot.className = 'jrSlot';
      slot.dataset.id = String(id);
      
      // Use global avatar resolver
      const avatarUrl = (global.resolveAvatar?.(id)) || 
                       (p?.avatar) || (p?.img) || (p?.photo) || 
                       getDicebearUrl(p?.name||'juror');
      
      // Avatar
      const avatar = document.createElement('img');
      avatar.className = 'jrAvatar';
      avatar.src = avatarUrl;
      avatar.alt = jurorName;
      avatar.onerror = function() {
        console.warn('[twists] avatar fallback for juror=' + id);
        this.onerror = null;
        this.src = (global.getAvatarFallback?.(jurorName, this.src)) || getDicebearUrl(jurorName);
      };
      slot.appendChild(avatar);
      
      // Name label
      const nameLabel = document.createElement('div');
      nameLabel.className = 'jrName';
      nameLabel.textContent = jurorName;
      nameLabel.title = jurorName;
      slot.appendChild(nameLabel);
      
      // Percentage label (NO progress bar)
      const pctLabel = document.createElement('div');
      pctLabel.className = 'jrPct';
      pctLabel.textContent = '0%';
      slot.appendChild(pctLabel);
      
      container.appendChild(slot);
      
      // Cache DOM references for this slot
      st._domCache[id] = {
        slot: slot,
        pct: pctLabel
      };
    });
    
    // Cache live region
    st._domCache.liveRegion = liveRegion;
    
    panel.appendChild(modalHost);
    updateReturnTwistCards();
  }

  global.finishAmericaReturnVote=function(){ finalizeAmericaReturnVote(true); };
  global.startAmericaReturnVote=startAmericaReturnVote;
  global.renderReturnTwistPanel=renderReturnTwistPanel;
  global.__showJurorReturnResult=showJurorReturnResult;

  async function tryMaybeAutoSelfEvict(){
    const g=global.game; if(!g) return;
    const alive=ap();
    if(alive.length<=3) return;
    const pct=Number(g.cfg?.selfEvictChance||0);
    if(!(pct>0)) return;
    const roll=(global.rng?.()||Math.random())*100;
    if(roll>=pct) return;
    const pool=alive.filter(p=>!p.human);
    const picks=pool.length?pool:alive;
    const victim=picks[Math.floor((global.rng?.()||Math.random())*picks.length)];
    if(!victim) return;
    
    console.info(`[twists] Auto self-eviction triggered (${pct}%): ${victim.name}`);
    
    // Use centralized handler for AI self-eviction with modal
    // IMPORTANT: Await completion to ensure self-eviction finishes before week transition
    if(typeof global.selfEviction?.handle === 'function'){
      try{ 
        await global.selfEviction.handle(victim.id, 'ai');
        
        // Additional wait to ensure all card animations complete
        if(typeof global.cardQueueWaitIdle === 'function'){
          await global.cardQueueWaitIdle();
        }
      }catch(e){
        console.error('[twists] Error in centralized self-eviction:', e);
      }
    } else {
      // Fallback to legacy handler
      global.addLog?.(`Auto self-eviction (${pct}%): ${victim.name}.`,'warn');
      try{ 
        await global.handleSelfEviction?.(victim.id,'self');
        
        // Additional wait to ensure all card animations complete
        if(typeof global.cardQueueWaitIdle === 'function'){
          await global.cardQueueWaitIdle();
        }
      }catch(e){
        console.error('[twists] Error in legacy self-eviction handler:', e);
      }
    }
  }

  function prepareNominations(){
    const g=global.game; if(!g) return;
    const required=(g.__twistMode==='double')?3:(g.__twistMode==='triple')?4:2;
    g.__twistNomSlots=required;
    if(!Array.isArray(g.nominees)) g.nominees=[];
    if(!g.nominations) g.nominations={primary:[],replacement:null,final:[]};
    const curr=new Set();
    (g.nominations.primary||[]).forEach(id=>curr.add(id));
    (g.nominees||[]).forEach(id=>curr.add(id));
    const hohId=g.hohId;
    const hoh=gp(hohId);
    const eligible=ap().filter(p=>p.id!==hohId && !curr.has(p.id));
    eligible.sort((a,b)=>{
      const affA=hoh?.affinity?.[a.id] ?? 0;
      const affB=hoh?.affinity?.[b.id] ?? 0;
      if(affA!==affB) return affA-affB;
      const thA=a.threat ?? 0.5, thB=b.threat ?? 0.5;
      return thB-thA;
    });
    const need=Math.max(0,required-curr.size);
    eligible.slice(0,need).forEach(p=>curr.add(p.id));
    g.nominations.primary=Array.from(curr);
    g.nominees=Array.from(curr);
    g.__twistNomineeSnapshot=g.nominees.slice();
    global.updateHud?.();
  }

  function completeTwistEvictions(){
    const g=global.game; if(!g) return;
    if(!g.__twistMode) return;
    if(ap().length<=6) return endTwist();
    endTwist();
  }

  function endTwist(){
    const g=global.game; if(!g) return;
    g.doubleEvictionWeek=false;
    g.tripleEvictionWeek=false;
    g.__twistMode=null;
    g.__twistPlannedEvictions=1;
    g.__twistEvictedThisNight=0;
    g.__twistNomSlots=2;
    g.__twistNomineeSnapshot=null;
    // Clear badge flag when twist ends
    g.__twistBadgeShown=false;
    global.updateHud?.();
  }

  function afterPhase(ended){
    const g=global.game; if(!g) return;
    if(ended==='eviction'){
      if(g.__twistMode){
        g.__twistEvictedThisNight=Math.max(1,g.__twistEvictedThisNight||0);
        setTimeout(completeTwistEvictions,450);
      } else {
        endTwist();
      }
    }
  }
  function beforeLiveVote(){}
  function init(){}
  function onPhaseChange(phase){
    if(phase==='return_twist'){
      setTimeout(()=>global.renderReturnTwistPanel?.(),15);
    } else if(phase!=='return_twist'){
      const g=global.game;
      if(g?.__returnTwist && !g.__returnTwist.finished){
        try{ 
          finalizeAmericaReturnVote(true); 
        }catch(e){
          console.error('[onPhaseChange] Error finalizing return vote:', e);
        }
      }
    }
  }

  global.twists={
    init,
    onPhaseChange,
    beforeLiveVote,
    decideForWeek,
    prepareNominations,
    afterPhase
  };

})(window);