// MODULE: competitions.js
// HOH eligibility, minigames, scoreboards, Final 3 flow, TV updates.
// Enhanced: wait for reveal cards to finish; show Strategize card before Social;
// increment HOH win stats.
// New: guard to ensure HOH selection and winner card happen only once.
// Hardened: safe fallbacks if social module name differs.

(function(global){
  const $=global.$;
  // Legacy games (retired in Phase 1, kept for compatibility)
  const LEGACY_MG_LIST=['clicker','memory','math','bar','typing','reaction','numseq','pattern','slider','anagram','path','target','pairs','simon','estimate'];
  
  // Retired legacy games that should not be used
  const RETIRED_GAMES = ['typing', 'reaction', 'slider', 'path', 'simon'];
  
  // Active legacy games (non-retired subset)
  const ACTIVE_LEGACY = LEGACY_MG_LIST.filter(g => !RETIRED_GAMES.includes(g));
  
  // Use active legacy list for now (will be replaced with new games)
  const MG_LIST = ACTIVE_LEGACY;

  function safeShowCard(title, lines=[], tone='neutral', dur=4200, uniform=false){
    try{
      if(typeof global.showCard === 'function'){
        return global.showCard(title, lines, tone, dur, uniform);
      }
      const tvNow = document.getElementById('tvNow');
      if(tvNow){
        const msg = [title || 'Update'].concat(Array.isArray(lines)? lines : []).join(' — ');
        tvNow.textContent = msg;
      }
    }catch(e){}
    return undefined;
  }
  async function waitCardsIdle(){
    try{
      if(typeof global.cardQueueWaitIdle === 'function'){
        await global.cardQueueWaitIdle();
      }
    }catch(e){}
  }

  // Fisher-Yates shuffle for legacy pool (one-time per season)
  function shuffleLegacyPool(){
    const g=global.game;
    if(!g.__legacyPoolShuffled){
      const pool = MG_LIST.slice();
      for(let i=pool.length-1; i>0; i--){
        const j = Math.floor((global.rng?.()||Math.random())*(i+1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      g.__shuffledLegacyPool = pool;
      g.__legacyPoolShuffled = true;
      g.__legacyPoolIndex = 0;
    }
    return g.__shuffledLegacyPool || MG_LIST;
  }

  function pickMinigameType(){
    const g=global.game;
    
    // Initialize miniHistory if needed
    if(!g.miniHistory) g.miniHistory = [];
    
    // Purge stale 'clicker' miniMode when user switches to random
    if(g?.cfg?.miniMode==='random' && g.__lastMiniMode==='clicker'){
      delete g.__lastMiniMode;
      console.info('[Minigame] Cleared stale clicker mode');
    } else if(g?.cfg?.miniMode){
      g.__lastMiniMode = g.cfg.miniMode;
    }
    
    // Legacy mode overrides
    if(g?.cfg?.miniMode==='clicker'){
      g.miniHistory.push('clicker');
      return 'clicker';
    }
    if(g?.cfg?.miniMode==='cycle'){ 
      const t=MG_LIST[g.miniIndex%MG_LIST.length]; 
      g.miniIndex++;
      g.miniHistory.push(t);
      return t; 
    }
    
    // Try new registry if available (with lazy retry)
    let registryGame = null;
    if(global.MiniGamesRegistry){
      registryGame = global.MiniGamesRegistry.getRandom(g.miniHistory);
    } else {
      // Lazy retry: give registry a short timeout to initialize
      const startTime = Date.now();
      const maxWait = 50; // 50ms timeout
      while(!global.MiniGamesRegistry && (Date.now() - startTime) < maxWait){
        // Busy wait for a short time
      }
      if(global.MiniGamesRegistry){
        registryGame = global.MiniGamesRegistry.getRandom(g.miniHistory);
        console.info('[Minigame] Registry loaded after short delay');
      } else {
        console.info('[Minigame] Registry not available, using legacy fallback');
      }
    }
    
    // Use registry game 80% of the time if available
    if(registryGame && Math.random() < 0.8){
      g.miniHistory.push(registryGame);
      return registryGame;
    }
    
    // Fall back to shuffled legacy games with history weighting
    const pool = shuffleLegacyPool();
    const recentGames = g.miniHistory.slice(-3);
    const lastGame = g.miniHistory[g.miniHistory.length - 1];
    
    // Build weighted candidate list (penalize recently used games)
    const candidates = [];
    for(const game of pool){
      const recentCount = recentGames.filter(g => g === game).length;
      const weight = Math.max(1, 5 - recentCount * 2); // Weight: 5 (new) to 1 (used 2+ times recently)
      for(let i = 0; i < weight; i++){
        candidates.push(game);
      }
    }
    
    // Pick from weighted candidates
    let chosen = candidates[Math.floor((global.rng?.()||Math.random()) * candidates.length)];
    
    // Avoid immediate repeat if pool has >1 game
    if(chosen === lastGame && pool.length > 1){
      const alternatives = pool.filter(g => g !== lastGame);
      if(alternatives.length > 0){
        // Build weighted alternatives (excluding last game)
        const altCandidates = [];
        for(const game of alternatives){
          const recentCount = recentGames.filter(g => g === game).length;
          const weight = Math.max(1, 5 - recentCount * 2);
          for(let i = 0; i < weight; i++){
            altCandidates.push(game);
          }
        }
        chosen = altCandidates[Math.floor((global.rng?.()||Math.random()) * altCandidates.length)];
        console.info('[Minigame] Avoided immediate repeat:', lastGame, '→', chosen);
      }
    }
    
    g.miniHistory.push(chosen);
    
    // Update legacy pool index for cycle mode compatibility
    g.__legacyPoolIndex = (pool.indexOf(chosen) + 1) % pool.length;
    
    return chosen;
  }
  global.pickMinigameType=pickMinigameType;

  // Calculate AI difficulty adjustment based on recent human win rate
  function getAIDifficultyMultiplier(){
    const g=global.game;
    if(!g || !g.players) return 1.0;
    const humanId = g.humanId;
    if(!humanId) return 1.0;
    
    const human = global.getP?.(humanId);
    if(!human) return 1.0;
    
    // Count recent human comp wins (HOH + Veto)
    const humanHohWins = human?.stats?.hohWins || 0;
    const humanVetoWins = human?.stats?.vetoWins || 0;
    const totalHumanWins = humanHohWins + humanVetoWins;
    
    // If human is winning too much, boost AI slightly
    // If human is losing, reduce AI difficulty slightly
    const week = g.week || 1;
    const expectedWinRate = 0.15; // ~15% win rate is fair for 1 human vs multiple AI
    const actualWinRate = week > 1 ? totalHumanWins / (week * 2) : 0;
    
    // Adjust AI multiplier: if human wins more than expected, boost AI
    // Range: 0.85 to 1.15 (max 15% adjustment)
    const adjustment = (actualWinRate - expectedWinRate) * 0.5;
    return Math.max(0.85, Math.min(1.15, 1.0 + adjustment));
  }


  function isHumanEligible(phase){
    const g=global.game; const you=global.getP?.(g.humanId);
    if(!you||you.evicted) return false;
    if(phase==='hoh'){
      const alive=global.alivePlayers(); const isF4=alive.length===4;
      if(g.week===1) return true;
      return isF4 ? true : (g.lastHOHId!==you.id);
    }
    return true;
  }
  global.isHumanEligible=isHumanEligible;

  function submitScore(id, base, mult, label){
    const g=global.game; g.lastCompScores=g.lastCompScores||new Map();
    if(g.lastCompScores.has(id)) return false;
    
    // Normalize base score to 0-100 if needed (new games already do this)
    let normalizedBase = base;
    if(base > 100){
      // Legacy games might return higher scores, normalize them
      normalizedBase = Math.min(100, (base / 120) * 100);
    }
    
    // Apply compBeast multiplier and clamp to reasonable range
    const final = Math.max(0, Math.min(150, normalizedBase * mult));
    
    g.lastCompScores.set(id, final);
    // Hidden scoring: only log that player completed, not the score
    global.addLog(`${global.safeName(id)} completed the ${g.phase === 'hoh' ? 'HOH' : 'competition'}.`,'tiny');
    return true;
  }

  function maybeFinishComp(){
    const g=global.game; const alive=global.alivePlayers();
    let eligible=alive.map(p=>p.id);
    if(g.phase==='hoh' && alive.length!==4 && g.week>1 && g.lastHOHId) eligible=eligible.filter(id=>id!==g.lastHOHId);
    const done=[...g.lastCompScores.keys()].filter(id=>eligible.includes(id)).length;
    if(done===eligible.length){ finishCompPhase(); }
  }

  function logScoreboard(title, scoresMap, ids){
    // Hidden: don't log full scoreboard anymore
    // Full results are shown in reveal card
  }
  
  // Reusable tri-slot reveal sequence for competitions
  // Can be used for HOH, Veto, or other top-3 reveals
  // Enhanced with optional avatar display
  // NEW: Show single results popup with winner + top 2 runners-up with avatars
  async function showResultsPopup(options){
    const {
      title = 'Results',
      topThree = [],
      winnerEmoji = '👑',
      duration = 4500
    } = options;
    
    if(!topThree || topThree.length === 0) return;
    
    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
    
    // Helper to get avatar URL and player data
    function getPlayerData(entry){
      let player = null;
      let name = '';
      let score = '';
      
      // Handle different entry formats
      if(typeof entry === 'object'){
        if(entry.id){
          player = global.getP?.(entry.id);
        }
        name = entry.name || player?.name || 'Player';
        score = entry.score !== undefined ? entry.score : (entry.sc !== undefined ? entry.sc : '');
      } else {
        name = entry || 'Player';
      }
      
      // Get avatar URL
      let avatarUrl = player?.avatar || player?.img || player?.photo;
      if(!avatarUrl){
        avatarUrl = `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
      }
      
      return { name, score, avatarUrl };
    }
    
    try {
      // Create modal overlay
      const modal = document.createElement('div');
      modal.className = 'results-modal-overlay';
      modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 9999;
        background: rgba(0,0,0,0.85);
        backdrop-filter: blur(3px);
        display: grid;
        place-items: center;
        animation: resultsModalFadeIn 0.3s ease;
      `;
      
      // Create card
      const card = document.createElement('div');
      card.className = 'results-card';
      card.style.cssText = `
        background: linear-gradient(135deg, #1a2937, #0f1a28);
        border: 1px solid rgba(120,180,240,0.3);
        border-radius: 20px;
        padding: 28px 24px;
        box-shadow: 0 20px 50px -20px rgba(0,0,0,0.9);
        max-width: min(480px, 90vw);
        width: 100%;
        animation: resultsCardSlideIn 0.4s ease;
      `;
      
      // Title
      const titleEl = document.createElement('div');
      titleEl.textContent = `${title} ${winnerEmoji}`;
      titleEl.style.cssText = `
        font-size: 1.4rem;
        font-weight: 800;
        letter-spacing: 0.5px;
        color: #ffd96b;
        text-align: center;
        margin-bottom: 24px;
        text-shadow: 0 2px 8px rgba(0,0,0,0.5);
      `;
      card.appendChild(titleEl);
      
      // Winner section (large, centered)
      if(topThree[0]){
        const winner = getPlayerData(topThree[0]);
        const winnerSection = document.createElement('div');
        winnerSection.style.cssText = `
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          margin-bottom: 20px;
          padding-bottom: 20px;
          border-bottom: 1px solid rgba(120,180,240,0.2);
        `;
        
        const winnerAvatar = document.createElement('img');
        winnerAvatar.src = winner.avatarUrl;
        winnerAvatar.alt = winner.name;
        winnerAvatar.onerror = function(){
          console.warn(`[avatar] failed to load url=${this.src} player=${winner.name}`);
          this.onerror=null;
          this.src=`https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(winner.name)}`;
        };
        winnerAvatar.style.cssText = `
          width: 110px;
          height: 110px;
          border-radius: 50%;
          border: 3px solid #ffd96b;
          box-shadow: 0 4px 20px rgba(255,217,107,0.4);
          object-fit: cover;
        `;
        winnerSection.appendChild(winnerAvatar);
        
        const winnerName = document.createElement('div');
        winnerName.textContent = winner.name;
        winnerName.style.cssText = `
          font-size: 1.3rem;
          font-weight: 700;
          color: #ffffff;
          text-align: center;
        `;
        winnerSection.appendChild(winnerName);
        
        if(winner.score !== ''){
          const winnerScore = document.createElement('div');
          winnerScore.textContent = `Score: ${winner.score}`;
          winnerScore.style.cssText = `
            font-size: 1rem;
            font-weight: 600;
            color: #88e6a0;
            text-align: center;
          `;
          winnerSection.appendChild(winnerScore);
        }
        
        card.appendChild(winnerSection);
      }
      
      // Runners-up section (2nd and 3rd in horizontal row)
      if(topThree[1] || topThree[2]){
        const runnersUpSection = document.createElement('div');
        runnersUpSection.style.cssText = `
          display: flex;
          justify-content: center;
          gap: 20px;
          flex-wrap: wrap;
        `;
        
        [topThree[1], topThree[2]].forEach((entry, idx) => {
          if(!entry) return;
          
          const player = getPlayerData(entry);
          const place = idx === 0 ? '2nd' : '3rd';
          
          const runnerUp = document.createElement('div');
          runnerUp.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 8px;
            flex: 0 0 auto;
          `;
          
          const runnerAvatar = document.createElement('img');
          runnerAvatar.src = player.avatarUrl;
          runnerAvatar.alt = player.name;
          runnerAvatar.onerror = function(){
            console.warn(`[avatar] failed to load url=${this.src} player=${player.name}`);
            this.onerror=null;
            this.src=`https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name)}`;
          };
          runnerAvatar.style.cssText = `
            width: 65px;
            height: 65px;
            border-radius: 50%;
            border: 2px solid #7cffad;
            box-shadow: 0 2px 12px rgba(124,255,173,0.3);
            object-fit: cover;
          `;
          runnerUp.appendChild(runnerAvatar);
          
          const runnerPlace = document.createElement('div');
          runnerPlace.textContent = place;
          runnerPlace.style.cssText = `
            font-size: 0.75rem;
            font-weight: 700;
            color: #96cfff;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          `;
          runnerUp.appendChild(runnerPlace);
          
          const runnerName = document.createElement('div');
          runnerName.textContent = player.name;
          runnerName.style.cssText = `
            font-size: 0.95rem;
            font-weight: 600;
            color: #cedbeb;
            text-align: center;
          `;
          runnerUp.appendChild(runnerName);
          
          if(player.score !== ''){
            const runnerScore = document.createElement('div');
            runnerScore.textContent = player.score;
            runnerScore.style.cssText = `
              font-size: 0.85rem;
              color: #88e6a0;
            `;
            runnerUp.appendChild(runnerScore);
          }
          
          runnersUpSection.appendChild(runnerUp);
        });
        
        card.appendChild(runnersUpSection);
      }
      
      modal.appendChild(card);
      document.body.appendChild(modal);
      
      // Auto-remove after duration
      await sleep(duration);
      modal.style.animation = 'resultsModalFadeOut 0.3s ease';
      await sleep(300);
      modal.remove();
    } catch(e) {
      console.warn('[resultsPopup] error', e);
    }
  }
  
  async function showTriSlotReveal(options){
    const {
      title = 'Competition',
      topThree = [],
      winnerEmoji = '👑',
      winnerTone = 'ok',
      introDuration = 2000,
      placeDuration = 2000,
      winnerDuration = 3200,
      showIntro = true,
      showAvatars = false, // New option to show avatars in modal
      useNewPopup = true // NEW: Use the new popup design
    } = options;
    
    // Use new results popup if enabled
    if(useNewPopup && typeof global.showResultsPopup === 'function'){
      // Map topThree to include proper score field
      const formattedTopThree = topThree.map(entry => ({
        id: entry.id,
        name: entry.name,
        score: entry.sc || entry.score
      }));
      
      return global.showResultsPopup({
        title: title,
        phase: global.game?.phase || '',
        topThree: formattedTopThree,
        winnerEmoji: winnerEmoji,
        duration: winnerDuration
      });
    }
    
    function sleep(ms){ return new Promise(r => setTimeout(r, ms)); }
    
    // Helper to get avatar URL for a player
    function getAvatarUrl(entry){
      if(!showAvatars) return null;
      
      // Try to get player object from entry
      const player = entry.player || entry.id ? global.getP?.(entry.id) : null;
      if(player){
        return player.avatar || player.img || player.photo || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(player.name || 'player')}`;
      }
      
      // Fallback using entry name
      const name = entry.name || entry;
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name)}`;
    }
    
    try {
      // Show intro card
      if(showIntro && typeof global.showCard === 'function'){
        global.showCard(title, ['Revealing top 3...'], 'neutral', introDuration);
        if(typeof global.cardQueueWaitIdle === 'function'){
          await global.cardQueueWaitIdle();
        }
        await sleep(400);
      }
      
      // Reveal 3rd place
      if(topThree[2]){
        if(typeof global.showCard === 'function'){
          const lines = [topThree[2].name || topThree[2]];
          global.showCard('3rd Place', lines, 'neutral', placeDuration);
          if(typeof global.cardQueueWaitIdle === 'function'){
            await global.cardQueueWaitIdle();
          }
          await sleep(1200);
        }
      }
      
      // Reveal 2nd place
      if(topThree[1]){
        if(typeof global.showCard === 'function'){
          const lines = [topThree[1].name || topThree[1]];
          global.showCard('2nd Place', lines, 'neutral', placeDuration);
          if(typeof global.cardQueueWaitIdle === 'function'){
            await global.cardQueueWaitIdle();
          }
          await sleep(1200);
        }
      }
      
      // Reveal winner
      if(topThree[0]){
        if(typeof global.showCard === 'function'){
          const winnerTitle = `${title} Winner ${winnerEmoji}`;
          const lines = [topThree[0].name || topThree[0]];
          global.showCard(winnerTitle, lines, winnerTone, winnerDuration);
          if(typeof global.cardQueueWaitIdle === 'function'){
            await global.cardQueueWaitIdle();
          }
        }
      }
    } catch(e) {
      console.warn('[triSlotReveal] sequence error', e);
    }
  }
  
  // Expose globally for reuse
  global.showTriSlotReveal = showTriSlotReveal;
  // Note: showResultsPopup is now provided by results-popup.js module
  
  // New: Show top-3 reveal card with crown animation
  async function showCompetitionReveal(title, scoresMap, ids){
    const arr=[...scoresMap.entries()]
      .filter(([id])=>ids.includes(id))
      .map(([id,sc])=>({id,sc,name:global.safeName(id)}))
      .sort((a,b)=>b.sc-a.sc);
    
    if(arr.length === 0) return;
    
    const top3 = arr.slice(0, 3);
    
    // Use reusable tri-slot reveal with new popup design
    await showTriSlotReveal({
      title: title,
      topThree: top3,
      winnerEmoji: '👑',
      winnerTone: 'ok',
      showIntro: false,
      useNewPopup: true
    });
    
    // Add crown animation to winner
    setTimeout(()=>{
      const winnerName = top3[0].name;
      document.querySelectorAll('.top-roster-tile').forEach(tile=>{
        const name = tile.querySelector('.top-tile-name')?.textContent;
        if(name === winnerName){
          const crown = tile.querySelector('.badge-crown');
          if(crown) crown.classList.add('crownPulse');
        }
      });
    }, 500);
  }

  function renderCompPanel(panel){
    const g=global.game;
    if(g.phase==='hoh') return renderHOH(panel);
    if(g.phase==='final3_comp1') return renderF3P1(panel);
    if(g.phase==='final3_comp2') return renderF3P2(panel);
    panel.innerHTML='<div class="tiny muted">Competition running…</div>';
  }
  global.renderCompPanel=renderCompPanel;

  function renderHOH(panel){
    const g=global.game; panel.innerHTML='';
    const host=document.createElement('div'); host.className='minigame-host';
    const you=global.getP?.(g.humanId);
    if(you && !you.evicted){
      const alive=global.alivePlayers(); const blocked=(alive.length!==4 && g.week>1)?g.lastHOHId:null;
      if(you.id!==blocked && !g.lastCompScores?.has(you.id)){
        const mg=pickMinigameType();
        global.renderMinigame?.(mg,host,(base)=>{
          // Use compBeast for human too (no guaranteed wins)
          const humanMultiplier = (0.75 + (you?.compBeast||0.5) * 0.6);
          if(submitScore(you.id, base, humanMultiplier, `HOH/${mg}`)){
            host.innerHTML='<div class="tiny muted">Submission received. Waiting for others…</div>'; maybeFinishComp();
          }
        });
      } else {
        host.innerHTML='<div class="tiny muted">Not eligible this week or already submitted.</div>';
      }
    } else {
      host.innerHTML='<div class="tiny muted">You are evicted and cannot compete.</div>';
    }
    panel.appendChild(host);
  }

  function startHOH(){
    const g=global.game;
    g.lastCompScores=new Map(); g.hohOrder=[];
    g.__hohResolved = false;
    g.__compRunning = true; // Mark competition as running
    global.markCompPlayed?.('hoh'); // Mark HOH as played
    global.tv.say('HOH Competition'); global.phaseMusic?.('hoh');
    global.setPhase('hoh', g.cfg.tHOH, finishCompPhase);
    const alive=global.alivePlayers(); const blocked=(alive.length!==4 && g.week>1)?g.lastHOHId:null;
    const diffMult = getAIDifficultyMultiplier();
    for(const p of alive){
      if(p.id===blocked || p.human) continue;
      setTimeout(()=>{ if(g.phase!=='hoh') return;
        // Use compBeast property for fairer AI scoring
        const baseScore = 8+(global.rng?.()||Math.random())*20;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.6) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'HOH/AI'); 
        maybeFinishComp();
      }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*620));
    }
  }
  global.startHOH=startHOH;

  async function finishCompPhase(){
    const g=global.game; if(g.phase!=='hoh') return;
    if(g.__hohResolved) return;
    g.__hohResolved = true;
    g.__compRunning = false; // Clear competition running flag

    const alive=global.alivePlayers(); let elig=alive.map(p=>p.id);
    if(alive.length!==4 && g.week>1 && g.lastHOHId) elig=elig.filter(id=>id!==g.lastHOHId);
    
    // Apply dampening for consecutive winners
    for(const id of elig){
      if(!g.lastCompScores.has(id)){
        let baseScore = 5 + (global.rng?.()||Math.random())*20;
        const p = global.getP(id);
        if(p){
          // Soft dampening if player won last 2+ comps
          const recentWins = (p.stats?.hohWins || 0) + (p.stats?.vetoWins || 0);
          if(recentWins >= 2){
            baseScore *= (0.85 + Math.random() * 0.15); // Slight reduction
          }
        }
        g.lastCompScores.set(id, baseScore);
      }
    }
    
    // Show top-3 reveal card
    await showCompetitionReveal('HOH Competition', g.lastCompScores, elig);
    await waitCardsIdle();

    const winner=[...g.lastCompScores.entries()].filter(([id])=>elig.includes(id)).sort((a,b)=>b[1]-a[1])[0][0];
    for(const p of g.players) p.hoh=false; g.hohId=winner; g.lastHOHId=winner; const W=global.getP(winner); W.hoh=true; W.stats=W.stats||{}; W.wins=W.wins||{}; W.stats.hohWins=(W.stats.hohWins||0)+1; W.wins.hoh=(W.wins.hoh||0)+1;

    global.addLog(`HOH: <span class="accent">${global.safeName(winner)}</span>.`);

    await waitCardsIdle();

    safeShowCard('Strategize', ['It’s time to strategize before the Nomination Ceremony.'], 'social', 4200, true);

    await waitCardsIdle();

    // Robust social call — prefer startSocial, fall back to startSocialIntermission
    const runSocial = global.startSocial || global.startSocialIntermission;
    if(typeof runSocial === 'function'){
      runSocial('hoh',()=>{
        global.tv.say('Nominations');
        global.setPhase('nominations', g.cfg.tNoms, ()=>global.lockNominationsAndProceed?.());
        setTimeout(()=>global.startNominations?.(),50);
      });
    } else {
      // Ultimate fallback: go straight to nominations
      global.tv.say('Nominations');
      global.setPhase('nominations', g.cfg.tNoms, ()=>global.lockNominationsAndProceed?.());
      setTimeout(()=>global.startNominations?.(),50);
    }

    global.updateHud(); global.renderPanel();
  }

  // Final 3 flow (unchanged from your current file)
  function startFinal3Flow(){ startF3P1(); }
  global.startFinal3Flow=startFinal3Flow;

  function renderF3P1(panel){
    const g=global.game; panel.innerHTML='';
    const host=document.createElement('div'); host.className='minigame-host';
    const you=global.getP?.(g.humanId);
    if(you && !you.evicted && !g.lastCompScores?.has(you.id)){
      const mg=pickMinigameType();
      global.renderMinigame?.(mg,host,(base)=> submitScore(you.id, base, (0.8+(you?.skill||0.5)*0.6), `F3-P1/${mg}`));
    } else host.innerHTML='<div class="tiny muted">Waiting for competition to conclude…</div>';
    panel.appendChild(host);
  }

  function startF3P1(){
    const g=global.game; g.lastCompScores=new Map();
    global.tv.say('Final 3 — Part 1'); global.phaseMusic?.('hoh');
    global.setPhase('final3_comp1', Math.max(18, Math.floor(g.cfg.tHOH*0.7)), finishF3P1);
    const diffMult = getAIDifficultyMultiplier();
    for(const p of global.alivePlayers()){
      if(p.human) continue;
      setTimeout(()=>{ if(g.phase!=='final3_comp1') return;
        const baseScore = 10+(global.rng?.()||Math.random())*25;
        const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
        submitScore(p.id, baseScore, aiMultiplier, 'F3-P1/AI');
      }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*520));
    }
  }

  function finishF3P1(){
    const g=global.game; if(g.phase!=='final3_comp1') return;
    const ids=global.alivePlayers().map(p=>p.id);
    for(const id of ids) if(!g.lastCompScores.has(id)) g.lastCompScores.set(id,5+(global.rng?.()||Math.random())*5);
    const arr=[...g.lastCompScores.entries()].filter(([id])=>ids.includes(id)).sort((a,b)=>a[1]-b[1]);
    const lowest=arr[0][0];
    const others=ids.filter(id=>id!==lowest);
    global.addLog(`Final 3 Part 1: Lowest is ${global.safeName(lowest)} (Nominee A).`,'warn');
    safeShowCard('F3 Part 1',[`Nominee A: ${global.safeName(lowest)}`],'noms',2800,true);
    global.game.nominees=[lowest]; startF3P2(others);
  }

  function renderF3P2(panel){
    panel.innerHTML=''; const host=document.createElement('div'); host.className='minigame-host';
    host.innerHTML='<div class="tiny muted">Final 3 — Part 2 (head‑to‑head) is running…</div>'; panel.appendChild(host);
  }

  function startF3P2(duo){
    const g=global.game; g.__f3_duo=duo.slice(); g.lastCompScores=new Map();
    global.tv.say('Final 3 — Part 2'); global.phaseMusic?.('hoh');
    global.setPhase('final3_comp2', Math.max(18, Math.floor(g.cfg.tHOH*0.7)), finishF3P2);
    const diffMult = getAIDifficultyMultiplier();
    for(const id of duo){
      const p=global.getP(id);
      if(p.human){
        const host=document.querySelector('#panel .minigame-host')||document.querySelector('#panel');
        if(host){
          const mg=pickMinigameType(); const wrap=document.createElement('div'); wrap.className='minigame-host'; wrap.style.marginTop='8px';
          wrap.innerHTML='<div class="tiny muted">You are in Final 3 — Part 2.</div>'; host.appendChild(wrap);
          global.renderMinigame?.(mg,wrap,(base)=> submitScore(p.id, base, (0.8+(p?.skill||0.5)*0.6), `F3-P2/${mg}`));
        }
      } else {
        setTimeout(()=>{ if(g.phase!=='final3_comp2') return;
          const baseScore = 10+(global.rng?.()||Math.random())*25;
          const aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.65) * diffMult;
          submitScore(p.id, baseScore, aiMultiplier, 'F3-P2/AI');
        }, 300+(global.rng?.()||Math.random())*(g.cfg.tHOH*520));
      }
    }
  }

  function finishF3P2(){
    const g=global.game; if(g.phase!=='final3_comp2') return;
    const duo=(g.__f3_duo||[]).slice();
    for(const id of duo) if(!g.lastCompScores.has(id)) g.lastCompScores.set(id,5+(global.rng?.()||Math.random())*5);
    const sorted=[...g.lastCompScores.entries()].filter(([id])=>duo.includes(id)).sort((a,b)=>b[1]-a[1]);
    const winner=sorted[0][0], loser=sorted[1][0];
    for(const p of g.players) p.hoh=false; g.hohId=winner; global.getP(winner).hoh=true;
    const nomA=g.nominees[0]; g.nominees=[nomA, loser];
    global.addLog(`Final 3 Part 2: Final HOH is ${global.safeName(winner)}. Nominees: ${global.fmtList(g.nominees)}.`,'ok');
    safeShowCard('Final 3 Winner',[global.safeName(winner)],'hoh',2800);
    global.tv.say('Final 3 Decision');
    global.setPhase('final3_decision', Math.max(16, Math.floor(g.cfg.tVote*0.8)), ()=>global.finalizeFinal3Decision?.());
    setTimeout(()=>global.renderFinal3DecisionPanel?.(),50);
  }

  function renderFinal3DecisionPanel(){
    const g=global.game; const panel=document.querySelector('#panel'); if(!panel) return;
    const hoh=global.getP(g.hohId); const [a,b]=g.nominees.map(global.getP);
    panel.innerHTML='';
    const box=document.createElement('div'); box.className='minigame-host';
    box.innerHTML=`<h3>Final 3 Decision</h3><div class="tiny">HOH ${hoh.name} must evict one houseguest.</div>`;
    if(hoh.human){
      const row=document.createElement('div'); row.className='row'; row.style.marginTop='8px';
      const btnA=document.createElement('button'); btnA.className='btn danger'; btnA.textContent=`Evict ${a.name}`;
      const btnB=document.createElement('button'); btnB.className='btn danger'; btnB.textContent=`Evict ${b.name}`;
      btnA.onclick=()=>global.finalizeFinal3Decision?.(a.id);
      btnB.onclick=()=>global.finalizeFinal3Decision?.(b.id);
      row.append(btnA,btnB); box.appendChild(row);
    } else {
      const note=document.createElement('div'); note.className='tiny muted'; note.textContent='AI will decide at end.'; box.appendChild(note);
    }
    panel.appendChild(box);
  }
  global.renderFinal3DecisionPanel=renderFinal3DecisionPanel;

  function aiPickFinal3Eviction(){
    const g=global.game; const hoh=global.getP(g.hohId); const [a,b]=g.nominees;
    const ha=(hoh.affinity[a]??0), hb=(hoh.affinity[b]??0); if(ha<hb-0.05) return a; if(hb<ha-0.05) return b;
    const ta=global.getP(a).threat||0.5, tb=global.getP(b).threat||0.5; return ta>=tb? a : b;
  }

  function finalizeFinal3Decision(id){
    const g=global.game; const target=id??aiPickFinal3Eviction();
    const ev=global.getP(target); ev.evicted=true; ev.weekEvicted=g.week;
    global.addLog(`Final 3 eviction: <b>${ev.name}</b>.`,'danger');
    safeShowCard('Evicted',[ev.name],'evict',3600,true);
    if(global.alivePlayers().length<=9 && g.cfg.enableJuryHouse && !g.juryHouse.includes(target)) g.juryHouse.push(target);
    setTimeout(()=>global.startJuryVote?.(), 700);
  }
  global.finalizeFinal3Decision=finalizeFinal3Decision;

})(window);