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
    
    // Must have at least 5 alive players
    const aliveCount = ap().length;
    if(aliveCount < 5) return false;
    
    // Must have sufficient jurors
    const jurorCount = Array.isArray(g.juryHouse) ? g.juryHouse.length : 0;
    const initialPlayers = getInitialPlayersCount(g);
    const requiredJurors = getJurorReturnRequiredJurors(initialPlayers);
    if(jurorCount < requiredJurors) return false;
    
    // Must have at least one juror
    if(jurorCount < 1) return false;
    
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

  function decideForWeek(){
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

    tryMaybeAutoSelfEvict();

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
          duration: 4000
        });
      } catch (e) {
        console.error('[twists] Error showing juror return modal:', e);
      }
    }

    g.__returnTwist={
      jurors: jurors.slice(),
      counts: new Map(jurors.map(id=>[id,0])),
      weights: new Map(jurors.map(id=>[id, 0.7 + rand()*1.1])),
      started: Date.now(),
      durationMs: 10000,
      finished:false,
      lastLeader:null,
      _tick:null,
      _heartbeat:null,
      _lastUpdate:0,
      _seeded:false,
      _domCache:null,
    };

    global.setPhase?.('return_twist', 16, ()=>{
      if(!g.__returnTwist?.finished) finalizeAmericaReturnVote(true);
    });

    seedReturnCounts(g.__returnTwist);
    renderReturnTwistPanel();
    startReturnVoteTicker();
  }

  function seedReturnCounts(st){
    if(st._seeded) return;
    st._seeded=true;
    let base=6 + Math.random()*4;
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
    }, 160);

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
        // Use cached references for performance
        const cache = st._domCache[id];
        if(cache.bar) cache.bar.style.width=pct+'%';
        if(cache.pct) cache.pct.textContent=pct+'%';
        if(cache.card){
          cache.card.classList.toggle('leader',isLead);
          const scale=0.96+Math.min(0.3,pct/320);
          cache.card.style.setProperty('--rtScale',scale.toFixed(3));
        }
        if(isLead && leader==null) leader=id;
      } else {
        // Fallback to querySelector (for compatibility)
        const grid=document.querySelector('#panel #rtGrid'); if(!grid) return;
        const card=grid.querySelector(`.rtCard[data-id="${id}"]`);
        if(!card) return;
        const bar=card.querySelector('.rtBarFill');
        const pctSpan=card.querySelector('.rtPct');
        if(bar) bar.style.width=pct+'%';
        if(pctSpan) pctSpan.textContent=pct+'%';
        card.classList.toggle('leader',isLead);
        if(isLead && leader==null) leader=id;
        const scale=0.96+Math.min(0.3,pct/320);
        card.style.setProperty('--rtScale',scale.toFixed(3));
      }
    });

    // ARIA live update for leader change
    if(st.lastLeader!==leader && leader!=null){
      st.lastLeader=leader;
      const leaderName = global.safeName?.(leader) || 'Juror';
      
      if(useCached && st._domCache[leader]?.card){
        const lc = st._domCache[leader].card;
        lc.classList.add('flash');
        setTimeout(()=>lc.classList.remove('flash'),1100);
      } else {
        const grid=document.querySelector('#panel #rtGrid');
        if(grid){
          const lc=grid.querySelector(`.rtCard[data-id="${leader}"]`);
          if(lc){ lc.classList.add('flash'); setTimeout(()=>lc.classList.remove('flash'),1100); }
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

    // Update countdown timer with cached reference
    const remain=Math.max(0,Math.ceil((st.durationMs - (Date.now()-st.started))/1000));
    const countdownText = `Time: ${remain}s`;
    
    if(useCached && st._domCache.countdown){
      st._domCache.countdown.textContent = countdownText;
    } else {
      const cd=document.getElementById('rtCountdown');
      if(cd) cd.textContent = countdownText;
    }
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

    if(winnerId!=null){
      const w=gp(winnerId);
      if(w){ w.evicted=false; delete w.weekEvicted; }
      if(Array.isArray(g.juryHouse)) g.juryHouse=g.juryHouse.filter(id=>id!==winnerId);

      try{
        global.addJuryLog?.(`<b>${global.safeName(winnerId)}</b> wins America's Vote and returns!`,'ok');
        global.setMusic?.('victory',true);
        global.showCard?.('They\'re Back!',[`${global.safeName(winnerId)} re-enters the house.`,'They are eligible for HOH.'],'return',5600,true);
        await global.cardQueueWaitIdle?.();
        // Confetti removed per spec
      }catch(e){}
      g.__returnFlashId=winnerId;
      setTimeout(()=>{ g.__returnFlashId=null; global.updateHud?.(); },6500);
      // Flags already set at eligibility check
      
      // Update PlayerService after player returns
      if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
        global.PlayerService.setAlivePlayers(g.players);
      }
    } else {
      try{ global.showCard?.('No Returnee',['Vote produced no clear winner.'],'jury',3200,true); }catch(e){}
    }

    cleanupReturnPanel();
    resumeWeekAfterReturn();
  }

  function cleanupReturnPanel(){
    const panel=document.getElementById('panel');
    if(!panel) return;
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
    const host=document.createElement('div'); host.className='returnTwistHost';
    host.innerHTML=`
      <h3 class="rtHeader">America's Vote — Juror Return</h3>
      <div class="tiny muted" id="rtCountdown" role="timer" aria-live="assertive" aria-atomic="true">Time: ${Math.ceil(st.durationMs/1000)}s</div>
      <div class="rtGrid" id="rtGrid" role="list" aria-label="Juror vote standings"></div>
      <div class="tiny muted rtNote">Leader highlighted • Live % updates • Use Skip to finish instantly.</div>
      <div id="rtLiveRegion" role="status" aria-live="polite" aria-atomic="true" style="position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;"></div>
    `;
    panel.appendChild(host);
    const grid=host.querySelector('#rtGrid');
    
    // Cache DOM references for performance
    if(!st._domCache) st._domCache = {};
    
    st.jurors.forEach(id=>{
      const p=gp(id);
      const jurorName = global.safeName?.(id) || 'Juror';
      const card=document.createElement('div');
      card.className='rtCard';
      card.dataset.id=String(id);
      card.setAttribute('role','listitem');
      
      // Use global avatar resolver
      const avatarUrl = (global.resolveAvatar?.(id)) || 
                       (p?.avatar) || (p?.img) || (p?.photo) || 
                       getDicebearUrl(p?.name||'juror');
      
      card.innerHTML=`
        <div class="rtAvatarWrap">
          <img src="${avatarUrl}"
               class="rtAvatar" alt="${jurorName}"
               onerror="console.info('[twists] avatar fallback for juror=${id} url='+this.src); this.onerror=null; this.src=(window.Game||window).getAvatarFallback?.('${jurorName}', this.src) || '${getDicebearUrl(jurorName)}';"/>
          <div class="rtAvatarRing"></div>
        </div>
        <div class="rtName tiny" title="${jurorName}">${jurorName}</div>
        <div class="rtBarOuter"><div class="rtBarFill"></div></div>
        <div class="rtPct tiny">0%</div>
      `;
      grid.appendChild(card);
      
      // Cache DOM references for this card
      st._domCache[id] = {
        card: card,
        bar: card.querySelector('.rtBarFill'),
        pct: card.querySelector('.rtPct')
      };
    });
    
    // Cache countdown and live region
    st._domCache.countdown = host.querySelector('#rtCountdown');
    st._domCache.liveRegion = host.querySelector('#rtLiveRegion');
    
    updateReturnTwistCards();
  }

  global.finishAmericaReturnVote=function(){ finalizeAmericaReturnVote(true); };
  global.startAmericaReturnVote=startAmericaReturnVote;
  global.renderReturnTwistPanel=renderReturnTwistPanel;

  function tryMaybeAutoSelfEvict(){
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
    if(typeof global.selfEviction?.handle === 'function'){
      try{ global.selfEviction.handle(victim.id, 'ai'); }catch(e){
        console.error('[twists] Error in centralized self-eviction:', e);
      }
    } else {
      // Fallback to legacy handler
      global.addLog?.(`Auto self-eviction (${pct}%): ${victim.name}.`,'warn');
      try{ global.handleSelfEviction?.(victim.id,'self'); }catch(e){}
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
        try{ finalizeAmericaReturnVote(true); }catch(e){}
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