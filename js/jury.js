// Finale jury vote — human ballot + live faceoff + vote belt + auto-fit scaling
// Centered version: faceoff is horizontally centered within its container.

(function(g){
  'use strict';
  
  // Browser global alias for modules that expect window.global
  if (!g.global) g.global = g;

  // Import centralized avatar constants
  const getDicebearUrl = g.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  // ===== Utilities =====
  function ap(){ return (g.alivePlayers?.()||[]).slice(); }
  function gp(id){ return g.getP?.(id); }
  function safeName(id){ return g.safeName?.(id) || (gp(id)?.name ?? String(id)); }
  function rng(){ return (g.rng?.()||Math.random()); }
  function setTvNow(txt){
    try{
      const el=document.getElementById('tvNow'); if(el) el.textContent=txt;
      g.tv?.say?.(txt);
    }catch(e){ /* ignore */ }
  }
  const sleep = (ms)=>new Promise(r=>setTimeout(r,ms));
  
  // Helper to get avatar - uses global avatar resolver if available
  function getAvatar(playerId) {
    // Use global resolver if available
    if (g.resolveAvatar) {
      return g.resolveAvatar(playerId);
    }
    
    // Fallback to local implementation
    const player = gp(playerId);
    if (!player) {
      console.warn(`[jury] avatar: player not found id=${playerId}`);
      return getDicebearUrl(String(playerId));
    }
    
    const name = player.name || String(playerId);
    
    // Priority: player.avatar > avatars folder > dicebear fallback
    if (player.avatar) {
      return player.avatar;
    }
    
    // Try multiple formats
    return `./avatars/${name}.png`;
  }
  
  // Standard onerror handler for avatars
  function getAvatarFallback(name, failedUrl) {
    // Use global fallback if available
    if (g.getAvatarFallback) {
      return g.getAvatarFallback(name, failedUrl);
    }
    return getDicebearUrl(name || 'player');
  }

  function finalists(){
    if(Array.isArray(g.game?.finalTwo) && g.game.finalTwo.length>=2) return g.game.finalTwo.slice(0,2);
    const alive = ap().filter(p=>!p.evicted);
    if(alive.length>=2) return [alive[0].id, alive[1].id];
    const all = (g.game?.players||[]).filter(p=>!p.evicted).sort((a,b)=>(b.threat||0.5)-(a.threat||0.5));
    return all.slice(0,2).map(p=>p.id);
  }

  // Robust juror resolution
  function getJurors(){
    const gg=g.game||{};
    let list = [];
    if (Array.isArray(gg.juryHouse) && gg.juryHouse.length) list = gg.juryHouse.slice();
    else if (Array.isArray(gg.jury) && gg.jury.length) list = gg.jury.slice();
    else if (Array.isArray(gg.jurors) && gg.jurors.length) list = gg.jurors.slice();
    else {
      const players = gg.players || g.players || [];
      list = players.filter(p=>p?.juror || p?.inJury || p?.in_jury).map(p=>p.id).filter(Boolean);
    }
    list = list.map(x => typeof x==='object' ? x?.id : x).filter(Boolean);
    console.log('[jury] jurors resolved:', list.length, list);
    return list;
  }

  // Simple AI ballot logic with reason tracking
  function ballotPick(jurorId, A, B){
    const j = gp(jurorId); if(!j) return (rng()<0.5?A:B);
    const affA = j.affinity?.[A] ?? 0, affB = j.affinity?.[B] ?? 0;
    if(Math.abs(affA-affB) > 0.08) return affA>affB ? A : B;
    const thA = gp(A)?.threat ?? 0.5, thB = gp(B)?.threat ?? 0.5;
    return thA>thB ? B : A;
  }
  
  // Generate dynamic vote reason based on ballot logic with spicy/entertaining options
  function generateVoteReason(jurorId, pick, A, B, usedReasons = new Set()){
    const j = gp(jurorId);
    const finalist = gp(pick);
    const finalistName = safeName(pick);
    const otherName = safeName(pick === A ? B : A);
    
    if(!j || !finalist) return `I vote for ${finalistName} to win Big Brother.`;
    
    const affPick = j.affinity?.[pick] ?? 0;
    const affOther = j.affinity?.[pick === A ? B : A] ?? 0;
    const thPick = finalist.threat ?? 0.5;
    
    // Expanded reason pool with spicy, juicy, and entertaining options
    const reasons = [];
    
    // Pro-strategic gameplay (use when voting for high-threat player)
    if(thPick > 0.6){
      reasons.push(`${finalistName} played everyone like a fiddle and I respect that hustle.`);
      reasons.push(`Manipulation is an art form, and ${finalistName} is Picasso.`);
      reasons.push(`${finalistName}'s game was chef's kiss. No notes.`);
      reasons.push(`The lies? Iconic. The blindsides? Legendary. ${finalistName} earned this.`);
      reasons.push(`${finalistName} understood the assignment. ${otherName}... had the wrong syllabus.`);
      reasons.push(`${finalistName}'s chaos was entertaining. ${otherName}'s chaos was just messy.`);
      reasons.push(`${finalistName} controlled the game masterfully.`);
      reasons.push(`${finalistName}'s strategic moves were brilliant.`);
    }
    
    // Pro-social gameplay (use when voting for player with high affinity)
    if(affPick > affOther + 0.1){
      reasons.push(`${finalistName} didn't have to sell their soul to get here. That's rare.`);
      reasons.push(`${finalistName} proved you can win without being a snake. Refreshing.`);
      reasons.push(`${finalistName} actually remembers my name. That's more than ${otherName} ever did.`);
      reasons.push(`${finalistName} played with integrity.`);
      reasons.push(`${finalistName} and I had great chemistry in the house.`);
      reasons.push(`${finalistName} always had my back when it mattered.`);
    }
    
    // Bitter/shady reasons (use when other finalist has low affinity)
    if(affOther < 0.3){
      reasons.push(`I'm voting for ${finalistName} because ${otherName} literally forgot I existed.`);
      reasons.push(`${finalistName} stabbed me in the back, but at least they looked me in the eye first.`);
      reasons.push(`${otherName}'s game was about as exciting as watching paint dry.`);
      reasons.push(`I'm petty and I own it. ${finalistName} gets my vote because ${otherName} annoyed me.`);
    }
    
    // Funny/dramatic reasons
    reasons.push(`Sorry not sorry, but ${finalistName} ate and left no crumbs.`);
    reasons.push(`My therapist said to vote with my heart. My heart says ${finalistName}.`);
    reasons.push(`I came here to play, not make friends. ${finalistName} gets that.`);
    
    // Respectful reasons
    reasons.push(`Both played great games, but ${finalistName}'s endgame was flawless.`);
    reasons.push(`${finalistName} fought from the bottom and clawed their way here. Respect.`);
    reasons.push(`${finalistName} never gave up, even when the house turned on them.`);
    
    // Underdog reasons (use for low-threat players)
    if(thPick < 0.4){
      reasons.push(`${finalistName} overcame incredible odds.`);
      reasons.push(`${finalistName}'s resilience impressed me.`);
    }
    
    // Generic high-quality reasons (always available)
    reasons.push(`${finalistName} earned my respect throughout the season.`);
    reasons.push(`${finalistName} deserves this win, hands down.`);
    reasons.push(`${finalistName} played the better game overall.`);
    reasons.push(`${finalistName} made big moves at critical moments.`);
    reasons.push(`${finalistName}'s game speaks for itself.`);
    
    // Filter out already used reasons
    const available = reasons.filter(r => !usedReasons.has(r));
    
    // Pick a random available reason, or fallback to generic if all used
    if(available.length > 0){
      const chosen = available[Math.floor(rng() * available.length)];
      usedReasons.add(chosen);
      return chosen;
    }
    
    return `${finalistName} has my vote to win.`;
  }

  // Resolve eviction week from various field names
  function evictWeekOf(player){
    if(!player) return null;
    return player.weekEvicted ?? player.evictedWeek ?? player.evictionWeek ?? player.evictWeek ?? player.evict_wk ?? null;
  }

  // Ensure odd number of jurors by dropping the earliest-evicted if even
  function ensureOddJurors(list){
    if(!list || !Array.isArray(list) || list.length===0) return list;
    if(list.length % 2 === 1) return list; // already odd

    // Find earliest-evicted juror
    let earliestIdx = 0;
    let earliestWeek = Infinity;
    list.forEach((id, idx)=>{
      const p = gp(id);
      const wk = evictWeekOf(p);
      if(wk !== null && wk < earliestWeek){
        earliestWeek = wk;
        earliestIdx = idx;
      }
    });

    const dropped = list[earliestIdx];
    const filtered = list.filter((_, i) => i !== earliestIdx);
    console.warn('[jury] Even juror count detected. Dropping earliest-evicted:', safeName(dropped), 'evicted week', earliestWeek);
    return filtered;
  }

  // B) Jury house entry logging
  function juryOnEviction(evictedId){
    const gg = g.game || {};
    if (!gg.juryHouse || !gg.juryHouse.includes(evictedId)) return;
    
    const position = gg.juryHouse.indexOf(evictedId) + 1;
    const ordinals = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th', '9th', '10th', '11th', '12th'];
    const ordinal = ordinals[position - 1] || `${position}th`;
    const hohName = safeName(gg.hohId) || 'Unknown';
    
    g.addJuryLog?.(`${safeName(evictedId)} is the ${ordinal} juror. They were sent to the jury house by the HOH reign of ${hohName}.`);
  }

  // C) Jury banter templates (shown BEFORE casting - anonymous phase)
  const juryBanterTemplates = [
    'I will vote for the person who never betrayed me.',
    'I respect the strongest strategist.',
    'I value loyalty over anything.',
    'My vote goes to whoever played the best social game.',
    'I\'m voting for the competition beast.',
    'I\'ll vote for who was most honest with me.',
    'I\'m choosing the player who made the biggest moves.',
    'My decision is based on who controlled the house.',
    'I vote for who deserves it most.',
    'I\'m rewarding the player who outwitted everyone.'
  ];

  function getJuryBanter(){
    return juryBanterTemplates[Math.floor(rng() * juryBanterTemplates.length)];
  }

  // NEW: Locked-in jury phrases (during reveal phase)
  const JURY_LOCKED_LINES = [
    'I\'m voting for the player who steered the game.',
    'My vote goes to strategic consistency.',
    'I\'m rewarding social influence and resilience.',
    'I respect bold moves that landed.',
    'Adaptability mattered most to me.',
    'I value clean, effective gameplay.'
  ];
  function getLockedJuryPhrase(){ return JURY_LOCKED_LINES[Math.floor(rng()*JURY_LOCKED_LINES.length)]; }

  // America's Vote tiebreaker (random for now; can be enhanced later)
  function americasVoteWinner(A, B){
    const winner = rng()<0.5 ? A : B;
    console.info('[jury] America\'s Vote tiebreaker:', safeName(winner));
    
    // Show brief "America's Vote" card
    const card = document.createElement('div');
    card.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:999;background:linear-gradient(145deg,#1a2942,#0f1a2f);border:2px solid #3e6ba8;border-radius:16px;padding:24px 32px;text-align:center;color:#eaf4ff;box-shadow:0 12px 36px rgba(0,0,0,.6);animation:popIn 0.3s ease;';
    card.innerHTML = `
      <div style="font-size:1.1rem;font-weight:700;letter-spacing:0.8px;margin-bottom:8px;color:#ffdc8b;">🇺🇸 AMERICA'S VOTE 🇺🇸</div>
      <div style="font-size:0.9rem;color:#cfe0f5;">Breaking the tie...</div>
    `;
    document.body.appendChild(card);
    setTimeout(()=>{ try{card.remove();}catch(e){ /* ignore */ } }, 2400);

    return winner;
  }

  // ===== LEGACY FUNCTIONS REMOVED =====
  // All old UI rendering code has been deleted. The fullscreen overlay system 
  // in jury-viz.js is now used exclusively. No panel-based rendering is allowed.
  // - renderJuryBallotsPanel: REMOVED (was no-op)
  // - juryPanelOnBallot: REMOVED (was no-op)
  // - injectFaceoffCSS: REMOVED (CSS now in jury-viz.js only)
  // - faceoff.state: REMOVED (not needed for fullscreen)
  // - findMaskAncestor: REMOVED (was for old in-place rendering)
  // - installAutoFit: REMOVED (was for old in-place rendering)
  // - renderFinaleGraph: REMOVED (was deprecated no-op)

  // Vote message - use new FinalFaceoff API with avatar
  function addFaceoffVoteCard(jurorName, finalistName, dynamicReason, jurorId){
    if (typeof g.FinalFaceoff?.showVoteCard === 'function') {
      const jurorAvatar = getAvatar(jurorId);
      g.FinalFaceoff.showVoteCard(jurorName, finalistName, dynamicReason, jurorAvatar);
    }
  }

  // Update counts / pulse / leader glow using new API
  function updateFinaleGraph(aCount,bCount){
    if (typeof g.FinalFaceoff?.onVote === 'function') {
      // Track previous counts in module-local storage
      if (!g.__juryVoteCounts) g.__juryVoteCounts = { a: 0, b: 0 };
      const prevA = g.__juryVoteCounts.a;
      const prevB = g.__juryVoteCounts.b;
      
      if (aCount > prevA) {
        g.FinalFaceoff.onVote('left', { left: aCount, right: bCount });
      } else if (bCount > prevB) {
        g.FinalFaceoff.onVote('right', { left: aCount, right: bCount });
      } else {
        // Just update counts without animation
        g.FinalFaceoff.setCounts({ left: aCount, right: bCount });
      }
      
      // Update stored counts
      g.__juryVoteCounts.a = aCount;
      g.__juryVoteCounts.b = bCount;
    }
  }

  function showFinalTallyBanner(){
    if (typeof g.FinalFaceoff?.showFinalTally === 'function') {
      g.FinalFaceoff.showFinalTally();
    }
  }

  function showWinnerMessageBanner(winnerId){
    if (typeof g.FinalFaceoff?.showWinnerMessage === 'function') {
      g.FinalFaceoff.showWinnerMessage(safeName(winnerId));
    }
  }

  function showPlacementLabels(winnerId){
    // Note: This function is kept for backwards compatibility with the old rendering system
    // but is no longer needed with the fullscreen overlay. The overlay handles winner display.
    // We still execute the label-setting logic for game state updates.
    
    const [A, B] = finalists();
    const winner = gp(winnerId);
    const runnerUp = gp(A === winnerId ? B : A);
    
    if(winner){
      winner.showFinalLabel = 'WINNER';
      winner.winner = true; // Keep existing property for compatibility
      winner.finalRank = 1; // Issue #3: Winner gets rank 1
      // Clear HOH, POV, and nomination states
      winner.hoh = false;
      winner.nominated = false;
      winner.nominationState = 'none';
    }
    
    if(runnerUp){
      runnerUp.showFinalLabel = 'RUNNER-UP';
      runnerUp.runnerUp = true; // Keep existing property for compatibility
      runnerUp.finalRank = 2; // Issue #3: Runner-up gets rank 2
      // Clear HOH, POV, and nomination states
      runnerUp.hoh = false;
      runnerUp.nominated = false;
      runnerUp.nominationState = 'none';
    }
    
    // Clear veto holder if it's one of the finalists
    const gg = g.game || {};
    if(gg.vetoHolder === winnerId || gg.vetoHolder === (A === winnerId ? B : A)){
      gg.vetoHolder = null;
    }
    
    console.info(`[finale] labels winner=${winnerId} (rank=1) runnerUp=${A === winnerId ? B : A} (rank=2)`);
    
    // Update HUD to reflect changes
    try{ if(typeof g.updateHud === 'function') g.updateHud(); }catch(e){ /* ignore */ }
    
    // Emit players:update event for mobile roster and other listeners
    try{
      if(g.bbGameBus && typeof g.bbGameBus.emit === 'function'){
        // Determine runner-up: if winner is A, runner-up is B; otherwise runner-up is A
        const runnerUpId = winnerId === A ? B : A;
        g.bbGameBus.emit('players:update', { reason: 'finale-labels-set', winnerId, runnerUpId });
      }
    }catch(e){
      console.warn('[finale] failed to emit players:update event', e);
    }
    
    // Force mobile roster refresh to ensure winner/runner-up badges are displayed
    try{
      if(g.MobileRoster && typeof g.MobileRoster.refresh === 'function'){
        g.MobileRoster.refresh();
        console.info('[finale] mobile roster refreshed for badge update');
      }
    }catch(e){
      console.warn('[finale] failed to refresh mobile roster', e);
    }
  }

  // Helper to hide and remove the faceoff graph with fade animation
  async function hideFaceoffGraph(){
    console.info('[publicFav] waitForTallyHide');
    const box = document.getElementById('juryGraphBox');
    if(!box) {
      console.info('[publicFav] tallyHidden (not found)');
      return;
    }
    
    // Apply fade out class
    box.classList.add('fadeOutFast');
    
    // Wait for transition to complete (.45s)
    await sleep(450);
    
    // Remove from DOM
    try { box.remove(); } catch(e){ /* ignore */ }
    
    console.info('[publicFav] tallyHidden');
  }

  
  // ===== LEGACY FUNCTIONS REMOVED =====
  // renderHumanJuryUI(A, B) - REMOVED - rendered to #panel (old broken approach)
  // waitForHumanJuryVote(A, B) - REMOVED - used old renderHumanJuryUI
  // The fullscreen overlay versions below are the only correct implementations.
  
  /**
   * Render human voting UI inside fullscreen overlay with horizontal layout
   * @param {HTMLElement} overlay - Required fullscreen overlay element to render UI inside
   * @param {*} A - First finalist ID
   * @param {*} B - Second finalist ID
   * @returns {HTMLElement|null} The voting container element, or null if overlay is not provided
   */
  function renderHumanJuryUIInOverlay(overlay, A, B){
    if(!overlay) {
      console.error('[jury] Cannot render voting UI: overlay element is required');
      return null;
    }
    
    const container = document.createElement('div');
    container.id = 'humanJuryVoteOverlay';
    
    // Mobile-responsive container styling
    const isMobile = window.innerWidth <= 768;
    container.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: min(90vw, 900px);
      max-height: ${isMobile ? '90vh' : '85vh'};
      overflow-y: auto;
      padding: ${isMobile ? '20px 16px' : '40px 20px'};
      background: rgba(0, 0, 0, 0.85);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 2px solid rgba(0, 224, 204, 0.4);
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8),
                  0 0 40px rgba(0, 224, 204, 0.3);
      z-index: 10001;
    `;
    
    const title = document.createElement('div');
    title.textContent = '🎖️ YOUR JURY VOTE 🎖️';
    title.style.cssText = `
      font-size: ${isMobile ? 'clamp(18px, 5vw, 24px)' : 'clamp(24px, 4vw, 36px)'};
      font-weight: 900;
      text-align: center;
      color: #00e0cc;
      margin-bottom: ${isMobile ? '16px' : '32px'};
      text-shadow: 0 0 20px rgba(0, 224, 204, 0.6);
      letter-spacing: 2px;
    `;
    
    const faceoffContainer = document.createElement('div');
    faceoffContainer.style.cssText = `
      display: grid;
      grid-template-columns: 1fr auto 1fr;
      gap: ${isMobile ? 'clamp(12px, 3vw, 20px)' : 'clamp(20px, 4vw, 60px)'};
      align-items: center;
      justify-items: center;
      margin-bottom: ${isMobile ? '16px' : '32px'};
    `;
    
    // Create finalist cards
    function createFinalistCard(finalistId) {
      const card = document.createElement('div');
      card.style.cssText = `
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${isMobile ? '8px' : '16px'};
        padding: ${isMobile ? '12px' : '20px'};
        border-radius: ${isMobile ? '12px' : '16px'};
        background: rgba(255, 255, 255, 0.05);
        border: 2px solid rgba(255, 255, 255, 0.1);
        transition: all 0.3s ease;
      `;
      
      const avatar = document.createElement('img');
      avatar.src = getAvatar(finalistId);
      avatar.alt = safeName(finalistId);
      avatar.style.cssText = `
        width: ${isMobile ? 'min(30vw, 120px)' : 'min(25vw, 200px)'};
        height: ${isMobile ? 'min(30vw, 120px)' : 'min(25vw, 200px)'};
        object-fit: cover;
        border-radius: ${isMobile ? '8px' : '12px'};
        border: 3px solid rgba(255, 255, 255, 0.2);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.6);
      `;
      avatar.onerror = function() {
        console.warn('[jury] Avatar fallback for finalist:', safeName(finalistId));
        this.onerror = null;
        this.src = getAvatarFallback(safeName(finalistId));
      };
      
      const name = document.createElement('div');
      name.textContent = safeName(finalistId);
      name.style.cssText = `
        font-size: ${isMobile ? 'clamp(14px, 3.5vw, 18px)' : 'clamp(18px, 2.5vw, 28px)'};
        font-weight: 800;
        color: #ffffff;
        text-align: center;
        text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      `;
      
      card.appendChild(avatar);
      card.appendChild(name);
      return card;
    }
    
    const leftCard = createFinalistCard(A);
    const vs = document.createElement('div');
    vs.textContent = 'VS';
    vs.style.cssText = `
      font-size: ${isMobile ? 'clamp(20px, 6vw, 32px)' : 'clamp(28px, 5vw, 48px)'};
      font-weight: 900;
      color: #00e0cc;
      text-shadow: 0 0 20px rgba(0, 224, 204, 0.6);
      letter-spacing: 3px;
    `;
    const rightCard = createFinalistCard(B);
    
    faceoffContainer.appendChild(leftCard);
    faceoffContainer.appendChild(vs);
    faceoffContainer.appendChild(rightCard);
    
    // Vote buttons
    const buttonsContainer = document.createElement('div');
    buttonsContainer.style.cssText = `
      display: flex;
      gap: ${isMobile ? '12px' : '24px'};
      justify-content: center;
      margin-bottom: ${isMobile ? '12px' : '20px'};
      flex-wrap: wrap;
    `;
    
    const btnA = document.createElement('button');
    btnA.id = 'btnVoteA';
    btnA.textContent = `VOTE ${safeName(A).toUpperCase()}`;
    btnA.style.cssText = `
      padding: ${isMobile ? '12px 20px' : '16px 32px'};
      font-size: ${isMobile ? 'clamp(12px, 3vw, 16px)' : 'clamp(16px, 2vw, 20px)'};
      font-weight: 800;
      background: linear-gradient(135deg, #00e0cc 0%, #00b4a0 100%);
      color: #001a18;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      box-shadow: 0 8px 24px rgba(0, 224, 204, 0.4);
      transition: all 0.3s ease;
      letter-spacing: 1px;
      ${isMobile ? 'min-width: 120px;' : ''}
    `;
    btnA.onmouseover = function() {
      this.style.transform = 'translateY(-2px)';
      this.style.boxShadow = '0 12px 32px rgba(0, 224, 204, 0.6)';
    };
    btnA.onmouseout = function() {
      this.style.transform = 'translateY(0)';
      this.style.boxShadow = '0 8px 24px rgba(0, 224, 204, 0.4)';
    };
    
    const btnB = document.createElement('button');
    btnB.id = 'btnVoteB';
    btnB.textContent = `VOTE ${safeName(B).toUpperCase()}`;
    btnB.style.cssText = btnA.style.cssText;
    btnB.onmouseover = btnA.onmouseover;
    btnB.onmouseout = btnA.onmouseout;
    
    buttonsContainer.appendChild(btnA);
    buttonsContainer.appendChild(btnB);
    
    // Instructions
    const instructions = document.createElement('div');
    instructions.textContent = 'Cast your vote for the winner';
    instructions.style.cssText = `
      font-size: ${isMobile ? 'clamp(12px, 3vw, 14px)' : 'clamp(14px, 2vw, 18px)'};
      color: #aaa;
      text-align: center;
      font-style: italic;
    `;
    
    container.appendChild(title);
    container.appendChild(faceoffContainer);
    container.appendChild(buttonsContainer);
    container.appendChild(instructions);
    
    overlay.appendChild(container);
    
    return container;
  }
  
  // ===== LEGACY FUNCTION REMOVED =====
  // waitForHumanJuryVote(A, B) - REMOVED - used old renderHumanJuryUI that rendered to #panel
  // Use waitForHumanJuryVoteInOverlay instead, which renders inside the fullscreen overlay.
  
  /**
   * Wait for human jury vote inside fullscreen overlay
   * @param {HTMLElement} overlay - Required fullscreen overlay element containing the voting UI
   * @param {*} A - First finalist ID
   * @param {*} B - Second finalist ID
   * @returns {Promise<*|null>} Promise that resolves to the selected finalist ID, or null if UI rendering fails
   */
  function waitForHumanJuryVoteInOverlay(overlay, A, B){
    return new Promise(resolve=>{
      if (!overlay) {
        console.error('[jury] Cannot render voting UI: overlay is required');
        // Don't auto-vote for human - this is an error condition
        // Return null to signal caller to handle this case
        resolve(null);
        return;
      }
      
      const box = renderHumanJuryUIInOverlay(overlay, A, B);
      if(!box) {
        console.error('[jury] Failed to render voting UI in overlay');
        // Don't auto-vote for human - this is an error condition
        resolve(null);
        return;
      }
      
      const kill = (choice)=>{
        try{
          // Show confirmation
          const confirmation = document.createElement('div');
          confirmation.textContent = `✓ Your ballot: ${safeName(choice)}`;
          confirmation.style.cssText = `
            margin-top: 20px;
            font-size: clamp(16px, 2.5vw, 22px);
            font-weight: 700;
            color: #00e0cc;
            text-align: center;
            text-shadow: 0 0 20px rgba(0, 224, 204, 0.6);
          `;
          box.appendChild(confirmation);
          
          // Disable buttons
          box.querySelectorAll('button').forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.5';
            b.style.cursor = 'not-allowed';
          });
          
          // Fade out voting UI after brief delay
          setTimeout(() => {
            box.style.transition = 'opacity 0.5s ease';
            box.style.opacity = '0';
            setTimeout(() => box.remove(), 500);
          }, 1500);
        }catch(e){
          console.warn('[jury] Error in voting UI cleanup:', e);
        }
        resolve(choice);
      };
      
      box.querySelector('#btnVoteA')?.addEventListener('click', ()=>kill(A));
      box.querySelector('#btnVoteB')?.addEventListener('click', ()=>kill(B));
    });
  }

  // Credits helper: use montage split
  function startCreditsPreferred(images){
    try{
      if (typeof g.startEndCreditsMontageSplit === 'function') return g.startEndCreditsMontageSplit({ images, side:'right', totalMs: 50000 });
      if (typeof g.startEndCreditsSplit === 'function') return g.startEndCreditsSplit({ images, side:'right', totalMs: 50000 });
      if (typeof g.startEndCreditsSequence === 'function') return g.startEndCreditsSequence();
      if (typeof g.startEndCredits === 'function') return g.startEndCredits();
      if (typeof g.playCredits === 'function') return g.playCredits();
      if (typeof g.startCredits === 'function') return g.startCredits();
      if (typeof g.runEndCredits === 'function') return g.runEndCredits();
      if (typeof g.showCredits === 'function') return g.showCredits();
      console.log('[jury] No credits function detected.');
    }catch(e){ console.warn('[jury] credits failed', e); }
  }
  
  // Show winner persistently in TV area after fullscreen closes
  function showWinnerOnTV(winnerId){
    const tv = document.getElementById('tv');
    if (!tv) return;
    
    // Clear existing content
    tv.innerHTML = '';
    
    const container = document.createElement('div');
    container.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      padding: 20px;
      gap: 16px;
    `;
    
    const avatar = document.createElement('img');
    avatar.src = getAvatar(winnerId);
    avatar.alt = safeName(winnerId);
    avatar.style.cssText = `
      width: min(60%, 300px);
      height: min(60%, 300px);
      object-fit: cover;
      border-radius: 16px;
      border: 3px solid #ffd700;
      box-shadow: 0 0 30px rgba(255, 215, 0, 0.5),
                  0 8px 24px rgba(0, 0, 0, 0.6);
    `;
    avatar.onerror = function() {
      this.onerror = null;
      this.src = getAvatarFallback(safeName(winnerId));
    };
    
    const name = document.createElement('div');
    name.textContent = safeName(winnerId);
    name.style.cssText = `
      font-size: clamp(20px, 4vw, 32px);
      font-weight: 800;
      color: #ffd700;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      text-align: center;
    `;
    
    const title = document.createElement('div');
    title.textContent = '✨ WINNER OF BIG BROTHER ✨';
    title.style.cssText = `
      font-size: clamp(14px, 2.5vw, 20px);
      font-weight: 700;
      color: #00e0cc;
      text-shadow: 0 0 10px rgba(0, 224, 204, 0.6),
                   0 2px 4px rgba(0, 0, 0, 0.8);
      text-align: center;
      letter-spacing: 2px;
    `;
    
    container.append(avatar, name, title);
    tv.appendChild(container);
    
    console.info('[jury] Winner display shown in TV area');
  }

  // ===== NEW FINALE FLOW FUNCTIONS =====
  
  // Initialize finale state if not present
  function ensureFinaleState(){
    const gg = g.game || {};
    if(!gg.finale){
      gg.finale = {
        juryVotesRaw: [],
        castingDone: false,
        revealStarted: false
      };
    }
    return gg.finale;
  }

  /**
   * Phase 1: Anonymous Jury Casting (blind voting without revealing picks)
   * @param {Array} jurors - Array of juror IDs
   * @param {*} A - First finalist ID
   * @param {*} B - Second finalist ID
   * @param {HTMLElement|null} overlay - Optional fullscreen overlay element. If provided, human voting UI renders inside overlay.
   */
  async function startJuryCastingPhase(jurors, A, B, overlay = null){
    const gg = g.game || {};
    const finale = ensureFinaleState();
    
    if(finale.castingDone){
      console.warn('[juryCast] already done, skipping');
      return;
    }
    
    console.info('[juryCast] start');
    
    const humanId = gg.humanId;
    const humanIsJuror = humanId && jurors.includes(humanId);
    
    // Hide the faceoff UI if human needs to vote (to prevent showing 0-0)
    if (humanIsJuror && typeof g.FinalFaceoff?.hideFaceoff === 'function') {
      g.FinalFaceoff.hideFaceoff();
    }
    
    // Cast votes anonymously
    for(const jid of jurors){
      let pick;
      
      // Check if this is the human player
      if (humanIsJuror && jid === humanId) {
        console.info('[juryCast] waiting for human vote juror=' + jid);
        
        // CRITICAL: Overlay must be provided. The fullscreen overlay should be created
        // BEFORE calling startJuryCastingPhase (see startFinaleRefactorFlow line ~1734)
        if (!overlay) {
          console.error('[juryCast] CRITICAL: No overlay provided for human voting! Using fallback.');
          pick = ballotPick(jid, A, B);
          console.info(`[juryCast] human vote fallback (no overlay) juror=${jid} pick=${pick}`);
        } else {
          const votePromise = waitForHumanJuryVoteInOverlay(overlay, A, B);
          
          const timeoutPromise = new Promise(resolve => {
            setTimeout(() => {
              console.warn('[juryCast] human vote timeout, using affinity fallback');
              resolve(null);
            }, 30000); // 30 seconds
          });
          
          // Race between vote and timeout
          pick = await Promise.race([votePromise, timeoutPromise]);
          
          // If timeout OR UI error (pick is null), use affinity-based fallback
          if (pick === null) {
            pick = ballotPick(jid, A, B);
            console.info(`[juryCast] human vote fallback juror=${jid} pick=${pick}`);
          } else {
            console.info(`[juryCast] human vote submitted juror=${jid} pick=${pick}`);
          }
        }
      } else {
        // AI juror
        pick = ballotPick(jid, A, B);
      }
      
      finale.juryVotesRaw.push({ jurorId: jid, pick });
      console.info(`[juryCast] vote juror=${jid} stored`);
      
      // Show banter (no finalist names)
      const banter = getJuryBanter();
      g.addJuryLog?.(`${safeName(jid)}: ${banter}`, 'muted');
      
      await sleep(800);
    }
    
    // Show the faceoff UI for reveal phase with smaller avatars
    if (typeof g.FinalFaceoff?.showFaceoff === 'function') {
      g.FinalFaceoff.showFaceoff();
    }
    
    finale.castingDone = true;
    console.info('[juryCast] complete');
  }

  // NEW: Public Favourite Player - Post-Winner, Pre-Finale-Cinematic
  // Runs AFTER winner announced, BEFORE spinning medal overlay
  async function runPublicFavouritePostWinner(winnerId){
    const gg = g.game || {};
    const cfg = gg.cfg || {};
    
    // Guard: check toggle (default ON per spec)
    if(!cfg.enablePublicFav){
      console.info('[publicFav] skipped (toggle false)');
      return;
    }
    
    // Single-run guard
    if(g.__publicFavDone){
      console.info('[publicFav] skipped (already completed)');
      return;
    }
    g.__publicFavDone = true;
    
    // Get all players for selection
    const allPlayers = (gg.players || []).slice();
    if(allPlayers.length < 4){
      console.info('[publicFav] skipped (need at least 4 players, have ' + allPlayers.length + ')');
      return;
    }
    
    // Capture current generation token for abort safety
    const myGeneration = g.__cardGen || 0;
    
    // Helper
    function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
    
    // Helper: check if we should abort
    function shouldAbort(){
      if((g.__cardGen || 0) !== myGeneration){
        console.info('[publicFav] aborted (flush)');
        return true;
      }
      return false;
    }
    
    // Calculate total weeks (current week number)
    const totalWeeks = gg.week || 1;
    
    // Calculate weights for all players based on survival time
    // Weight formula: weight = 1 + 0.10 * normalizedSurvival
    // normalizedSurvival = (weekEvicted ? weekEvicted : totalWeeks) / totalWeeks (clamped 0..1)
    const playersWithWeights = allPlayers.map(p => {
      const survivalWeek = p.weekEvicted !== null && p.weekEvicted !== undefined ? p.weekEvicted : totalWeeks;
      const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
      const weight = 1 + 0.10 * normalizedSurvival;
      return { player: p, weight };
    });
    
    // Weighted sampling without replacement for 4 candidates
    function weightedSample(candidates, count) {
      const selected = [];
      const pool = candidates.slice(); // Copy array
      
      for (let i = 0; i < count && pool.length > 0; i++) {
        // Calculate total weight of remaining candidates
        const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
        
        // Pick random value in [0, totalWeight)
        let rand = rng() * totalWeight;
        
        // Find the selected candidate
        let selectedIdx = 0;
        for (let j = 0; j < pool.length; j++) {
          rand -= pool[j].weight;
          if (rand <= 0) {
            selectedIdx = j;
            break;
          }
        }
        
        // Add to selected and remove from pool
        selected.push(pool[selectedIdx]);
        pool.splice(selectedIdx, 1);
      }
      
      return selected;
    }
    
    // Select 4 candidates using weighted sampling
    const selectedCandidates = weightedSample(playersWithWeights, 4);
    
    console.info('[publicFav] start candidates=[' + selectedCandidates.map(c => c.player.id).join(',') + ']');
    
    // Card 1: Show celebratory event modal instead of regular card
    try{
      if(typeof g.showEventModal === 'function'){
        await g.showEventModal({
          title: 'This season of Big brother is about to end. Before we go, let\'s see whom you voted as your favorite player!',
          emojis: '🏆⭐',
          subtitle: '',
          tone: 'special',
          duration: 4000,
          minDisplayTime: 500,
          titleFontSize: '1.5rem'
        });
      } else if(typeof g.showCard === 'function'){
        // Fallback to regular card if event modal not available
        g.showCard('Audience Spotlight', [
          'This season of Big brother is about to end. Before we go, let\'s see whom you voted as your favorite player!'
        ], 'neutral', 3500, true);
        if(typeof g.cardQueueWaitIdle === 'function') await g.cardQueueWaitIdle();
      }
    }catch(e){ console.warn('[publicFav] showEventModal/showCard error:', e); }
    await sleep(300);
    
    // Build modal host wrapper with flexbox centering
    const modalHost = document.createElement('div');
    modalHost.className = 'pfModalHost';
    modalHost.setAttribute('data-bb-card', 'true');
    
    // Add floating emojis for excitement
    const emojiData = ['🔥', '⭐', '💯', '👏', '❤️', '🏆', '✨', '💫'];
    for(let i = 0; i < 12; i++){
      const emoji = document.createElement('div');
      emoji.className = 'pfFloatingEmoji';
      emoji.textContent = emojiData[Math.floor(rng() * emojiData.length)];
      emoji.style.left = (rng() * 100) + '%';
      emoji.style.animationDelay = (rng() * 5) + 's';
      emoji.style.animationDuration = (8 + rng() * 6) + 's';
      modalHost.appendChild(emoji);
    }
    
    // Add message bubbles for social reactions
    const messages = [
      'GO GO GO! 🎉',
      'My fav! ❤️',
      'Vote now!',
      'So close! 😱',
      'Amazing player! ⭐',
      'Let\'s do this! 💪',
      'Who will win? 🤔',
      'Epic season! 🔥'
    ];
    for(let i = 0; i < 8; i++){
      const bubble = document.createElement('div');
      bubble.className = 'pfMessageBubble';
      bubble.textContent = messages[Math.floor(rng() * messages.length)];
      bubble.style.left = (10 + rng() * 80) + '%';
      bubble.style.top = (10 + rng() * 80) + '%';
      bubble.style.animationDelay = (rng() * 4) + 's';
      modalHost.appendChild(bubble);
    }
    
    // Build panel with 4 real player slots (real avatars and names)
    const panel = document.createElement('div');
    panel.className = 'pfPanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'Public\'s Favourite Player voting simulation');
    
    const title = document.createElement('div');
    title.className = 'pfTitle';
    title.textContent = 'PUBLIC\'S FAVOURITE PLAYER';
    panel.appendChild(title);
    
    // Live region for accessibility
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.className = 'sr-only';
    panel.appendChild(liveRegion);
    liveRegion.textContent = 'Live public vote updating';
    
    const container = document.createElement('div');
    container.className = 'pfVotePanel';
    panel.appendChild(container);
    
    modalHost.appendChild(panel);
    
    // Create 4 real player slots with avatars and names
    const slots = [];
    for(let i = 0; i < 4; i++){
      const candidate = selectedCandidates[i];
      const player = candidate.player;
      
      const slot = document.createElement('div');
      slot.className = 'pfSlot';
      
      // Real player avatar (with fallback to dicebear)
      const avatar = document.createElement('img');
      avatar.className = 'pfAvatar';
      const avatarSrc = getAvatar(player.id);
      avatar.src = avatarSrc;
      avatar.alt = player?.name || 'Player';
      avatar.onerror = function() {
        console.warn('[publicFav] avatar fallback for ' + (player?.name || 'player'));
        this.onerror = null;
        this.src = getAvatarFallback(player?.name || 'player');
      };
      slot.appendChild(avatar);
      
      // Player name label
      const nameLabel = document.createElement('div');
      nameLabel.className = 'pfName';
      nameLabel.textContent = player?.name || 'Unknown';
      slot.appendChild(nameLabel);
      
      // Percentage label
      const pctLabel = document.createElement('div');
      pctLabel.className = 'pfPct';
      pctLabel.textContent = '0%';
      pctLabel.setAttribute('data-slot', i);
      slot.appendChild(pctLabel);
      
      container.appendChild(slot);
      slots.push({ slot, pctLabel, currentPct: 0, weight: candidate.weight });
    }
    
    document.body.appendChild(modalHost);
    
    // Helper: Generate Dirichlet distribution (simplified approximation using Gamma distribution)
    function dirichlet(alphas) {
      // Use Gamma(alpha, 1) to generate Dirichlet samples
      const gammas = alphas.map(alpha => {
        // Gamma distribution approximation using rejection sampling
        if (alpha < 1) {
          // For alpha < 1, use a different approach
          const u = rng();
          return Math.pow(u, 1 / alpha);
        }
        // Marsaglia and Tsang method for alpha >= 1
        const d = alpha - 1/3;
        const c = 1 / Math.sqrt(9 * d);
        // eslint-disable-next-line no-constant-condition
        while (true) {
          let x, v;
          do {
            x = Math.sqrt(-2 * Math.log(rng())) * Math.cos(2 * Math.PI * rng()); // Box-Muller
            v = 1 + c * x;
          } while (v <= 0);
          v = v * v * v;
          const u = rng();
          if (u < 1 - 0.0331 * x * x * x * x) return d * v;
          if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
        }
      });
      const sum = gammas.reduce((a, b) => a + b, 0);
      return gammas.map(g => g / sum);
    }
    
    // Generate start distribution (neutral Dirichlet with alpha=1 for 4 candidates)
    const startPcts = dirichlet([1, 1, 1, 1]).map(v => v * 100);
    
    // Generate target distribution (biased by weight formula: 1 + 0.20 * normalizedSurvival)
    const targetAlphas = slots.map(slot => {
      const p = selectedCandidates[slots.indexOf(slot)].player;
      const survivalWeek = p.weekEvicted !== null && p.weekEvicted !== undefined ? p.weekEvicted : totalWeeks;
      const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
      return 1 + 0.20 * normalizedSurvival;
    });
    const targetPcts = dirichlet(targetAlphas).map(v => v * 100);
    
    // Initialize current percentages
    slots.forEach((slot, i) => {
      slot.currentPct = startPcts[i];
      slot.pctLabel.textContent = Math.round(startPcts[i]) + '%';
    });
    
    // Simulate live voting for 10 seconds base + possible extensions
    const startTime = Date.now();
    const baseDuration = 10000; // 10 seconds
    let currentDuration = baseDuration;
    const maxExtension = 5000; // +5 seconds max
    let isFirstUpdate = true;
    let extensionCount = 0;
    
    function updatePercentages(){
      // Check for abort
      if(shouldAbort()){
        return;
      }
      
      const elapsed = Date.now() - startTime;
      const t = Math.min(1, elapsed / currentDuration); // Progress 0..1
      const eased = Math.pow(t, 0.85); // Eased interpolation
      
      // Interpolate between start and target
      const newPcts = slots.map((slot, i) => {
        const start = startPcts[i];
        const target = targetPcts[i];
        const base = start + (target - start) * eased;
        
        // Add bounded noise: ±(2 * (1 - eased))
        const noiseBound = 2 * (1 - eased);
        const noise = (rng() * 2 - 1) * noiseBound;
        
        return base + noise;
      });
      
      // Cap per-tick swing to ≤4 percentage points
      const cappedPcts = newPcts.map((newPct, i) => {
        const oldPct = slots[i].currentPct;
        const delta = newPct - oldPct;
        if (Math.abs(delta) > 4) {
          return oldPct + Math.sign(delta) * 4;
        }
        return newPct;
      });
      
      // Re-normalize to sum to 100
      const sum = cappedPcts.reduce((a, b) => a + b, 0);
      const normalized = cappedPcts.map(p => (p / sum) * 100);
      
      // Update display
      slots.forEach((slot, i) => {
        slot.currentPct = normalized[i];
        slot.pctLabel.textContent = Math.round(normalized[i]) + '%';
      });
      
      // Highlight leading candidate
      const maxPct = Math.max(...normalized);
      slots.forEach((slot, i) => {
        if (normalized[i] === maxPct) {
          slot.slot.classList.add('pfLeading');
        } else {
          slot.slot.classList.remove('pfLeading');
        }
      });
      
      // Log only on first update
      if(isFirstUpdate){
        console.info('[publicFav] updating');
        isFirstUpdate = false;
      }
    }
    
    // Update every 180-240ms with jitter
    function scheduleNext(){
      const jitter = 180 + rng() * 60;
      setTimeout(() => {
        if(shouldAbort()) return;
        if(Date.now() - startTime < currentDuration){
          updatePercentages();
          scheduleNext();
        }
      }, jitter);
    }
    scheduleNext();
    
    // Wait for base duration
    await sleep(baseDuration);
    
    // Check if we need to lock or extend
    let locked = false;
    while (!locked && extensionCount < 5) {
      // Get current percentages sorted descending
      const sorted = slots.map(s => s.currentPct).sort((a, b) => b - a);
      const topDiff = sorted[0] - sorted[1];
      
      if (topDiff >= 1.0) {
        // Lock condition met
        locked = true;
        liveRegion.textContent = 'Public vote locked';
        console.info('[publicFav] locked');
      } else {
        // Extend by 1 second
        extensionCount++;
        currentDuration += 1000;
        console.info(`[publicFav] extend(+1000ms diff=${topDiff.toFixed(2)}%)`);
        
        // Add noise ±1 to percentages during extension
        const extendedPcts = slots.map(slot => {
          const noise = (rng() * 2 - 1) * 1;
          return slot.currentPct + noise;
        });
        
        // Re-normalize
        const sum = extendedPcts.reduce((a, b) => a + b, 0);
        slots.forEach((slot, i) => {
          slot.currentPct = (extendedPcts[i] / sum) * 100;
          slot.pctLabel.textContent = Math.round(slot.currentPct) + '%';
        });
        
        await sleep(1000);
      }
    }
    
    // If still tied after max extensions, force tiebreak
    if (!locked) {
      if(shouldAbort()) return;
      
      const sorted = slots.map((s, i) => ({ pct: s.currentPct, idx: i })).sort((a, b) => b.pct - a.pct);
      const topDiff = sorted[0].pct - sorted[1].pct;
      
      if (topDiff < 1.0) {
        // For 4 candidates: find all tied at top, pick 2 to adjust
        const topPct = sorted[0].pct;
        const tiedIndices = sorted.filter(s => Math.abs(s.pct - topPct) < 0.5).map(s => s.idx);
        
        if(tiedIndices.length >= 2){
          // Apply tiebreak: +1 to first tied, -1 to second tied
          slots[tiedIndices[0]].currentPct += 1;
          slots[tiedIndices[1]].currentPct -= 1;
        } else {
          // Fallback: adjust top 2
          slots[sorted[0].idx].currentPct += 1;
          slots[sorted[1].idx].currentPct -= 1;
        }
        
        // Re-normalize
        const sum = slots.reduce((acc, s) => acc + s.currentPct, 0);
        slots.forEach(slot => {
          slot.currentPct = (slot.currentPct / sum) * 100;
          slot.pctLabel.textContent = Math.round(slot.currentPct) + '%';
        });
        
        console.info('[publicFav] tiebreak applied');
      }
      locked = true;
      liveRegion.textContent = 'Public vote locked';
      const totalDuration = Date.now() - startTime;
      console.info('[publicFav] locked durationMs=' + totalDuration);
    }
    
    // Check for abort before continuing
    if(shouldAbort()) return;
    
    // Freeze final percentages
    const finalPcts = slots.map(s => s.currentPct);
    
    await sleep(800);
    modalHost.remove();
    
    // Card 2: Reveal intro
    try{
      if(typeof g.showCard === 'function'){
        g.showCard('Results', ['let\'s reveal the votes'], 'neutral', 2200, true);
        if(typeof g.cardQueueWaitIdle === 'function') await g.cardQueueWaitIdle();
      }
    }catch(e){ console.warn('[publicFav] showCard error:', e); }
    await sleep(400);
    
    if(shouldAbort()) return;
    
    // Find winner (highest percentage)
    let winnerSlotIdx = 0;
    let maxPct = finalPcts[0];
    for(let i = 1; i < finalPcts.length; i++){
      if(finalPcts[i] > maxPct){
        maxPct = finalPcts[i];
        winnerSlotIdx = i;
      }
    }
    
    const fanFavPlayer = selectedCandidates[winnerSlotIdx].player;
    const fanFavName = safeName(fanFavPlayer.id);
    
    // Store raw percentage and compute display with one decimal
    const winnerPctRaw = maxPct;
    const winnerPctDisplay = maxPct.toFixed(1);
    
    console.info('[publicFav] winner finalRaw=' + winnerPctRaw + ' display=' + winnerPctDisplay);
    
    // Hook: Log XP for public's favorite
    if(g.ProgressionEvents?.onPublicFavorite){
      g.ProgressionEvents.onPublicFavorite(fanFavPlayer.id);
    }
    
    // Create winner-only card (no runners-up list per spec)
    const winnerCard = document.createElement('div');
    winnerCard.className = 'pfWinnerCard';
    winnerCard.setAttribute('role', 'alert');
    winnerCard.setAttribute('data-bb-card', 'true');
    
    // Winner section
    const winnerSection = document.createElement('div');
    winnerSection.className = 'pfWinnerMain';
    
    const winnerAvatar = document.createElement('img');
    winnerAvatar.className = 'pfWinnerAvatar';
    winnerAvatar.src = getAvatar(fanFavPlayer.id);
    winnerAvatar.alt = fanFavName + ' wins with ' + winnerPctDisplay + '%';
    winnerAvatar.onerror = function(){
      console.warn('[publicFav] winner avatar fallback for ' + fanFavName);
      this.src = getAvatarFallback(fanFavName, this.src);
    };
    
    const winnerName = document.createElement('div');
    winnerName.className = 'pfWinnerName';
    winnerName.textContent = fanFavName;
    
    const winnerPctText = document.createElement('div');
    winnerPctText.className = 'pfWinnerPct';
    winnerPctText.textContent = winnerPctDisplay + '%';
    
    const winnerTitle = document.createElement('div');
    winnerTitle.className = 'pfWinnerTitle';
    winnerTitle.textContent = 'Public\'s Favourite Player';
    
    // Create $20K check card display
    const checkCard = document.createElement('div');
    checkCard.className = 'pfCheckCard';
    checkCard.innerHTML = `
      <div class="pfCheckHeader">Big Brother Favorite Prize</div>
      <div class="pfCheckAmount">$20,000</div>
      <div class="pfCheckPayto">Pay to the order of<br><strong>${fanFavName}</strong></div>
      <div class="pfCheckMemo">Congratulations on being the fan favorite!</div>
    `;
    
    winnerSection.appendChild(winnerAvatar);
    winnerSection.appendChild(winnerName);
    winnerSection.appendChild(winnerPctText);
    winnerSection.appendChild(winnerTitle);
    winnerSection.appendChild(checkCard);
    winnerCard.appendChild(winnerSection);
    
    document.body.appendChild(winnerCard);
    
    // Move focus to winner card
    winnerCard.focus();
    
    console.info('[publicFav] winnerCard shown id=' + fanFavPlayer.id + ' pct=' + winnerPctDisplay);
    
    await sleep(6000);
    
    if(shouldAbort()){
      winnerCard.remove();
      return;
    }
    
    winnerCard.remove();
    
    console.info('[publicFav] done');
  }

  // Helper: Create fast-forward button for jury reveals
  function createFastForwardButton(onActivate) {
    const tv = document.getElementById('tv');
    if (!tv) return null;
    
    const btn = document.createElement('button');
    btn.id = 'btnFastForwardJury';
    btn.className = 'btn small';
    btn.innerHTML = '⏩ Fast Forward';
    btn.title = 'Skip to final result';
    btn.style.cssText = 'position:absolute;top:10px;right:12px;z-index:15;pointer-events:auto;';
    
    btn.onclick = () => {
      onActivate();
      btn.disabled = true;
      btn.textContent = '⏩ Accelerating...';
    };
    
    tv.appendChild(btn);
    return btn;
  }
  
  // Helper: Show juror phrase overlay (non-blocking)
  function showJurorPhraseOverlay(jurorName, phrase, durationMs) {
    const tv = document.getElementById('tv');
    if (!tv) return;
    
    // Remove any existing phrase overlay
    const existing = document.getElementById('jurorPhraseOverlay');
    if (existing) existing.remove();
    
    const overlay = document.createElement('div');
    overlay.id = 'jurorPhraseOverlay';
    overlay.style.cssText = `
      position: absolute;
      bottom: 12px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.85);
      border: 2px solid rgba(255, 255, 255, 0.2);
      border-radius: 12px;
      padding: 16px 24px;
      color: #fff;
      font-size: 16px;
      font-style: italic;
      text-align: center;
      max-width: 80%;
      z-index: 14;
      pointer-events: none;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    overlay.innerHTML = `<div style="font-weight: 700; margin-bottom: 8px;">${jurorName}</div><div>"${phrase}"</div>`;
    
    tv.appendChild(overlay);
    
    // Fade in
    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
    
    // Fade out before duration ends
    const fadeOutAt = Math.max(300, durationMs - 300);
    setTimeout(() => {
      overlay.style.opacity = '0';
    }, fadeOutAt);
    
    // Remove after duration
    setTimeout(() => {
      if (overlay.parentNode) overlay.remove();
    }, durationMs);
  }

  // Phase 3: Jury Reveal with batched vote display
  async function startJuryRevealPhase(jurors, A, B){
    const gg = g.game || {};
    const finale = ensureFinaleState();
    
    if(finale.revealStarted){
      console.warn('[juryReveal] already started, skipping');
      return null;
    }
    
    finale.revealStarted = true;
    console.info('[juryReveal] start');
    
    const votes = new Map([[A,0],[B,0]]);
    
    // Shuffle reveal order
    const order = jurors.slice().sort(()=>rng()-.5);
    const numJurors = order.length;
    const need = Math.floor(numJurors / 2) + 1;
    
    // Track if fast-forward has been triggered
    finale.fastForwardActive = false;
    
    // Create fast-forward button
    const ffBtn = createFastForwardButton(() => {
      if (!finale.fastForwardActive) {
        finale.fastForwardActive = true;
        console.info('[jury] revealFastForward');
      }
    });
    
    // Batch jurors into groups of 3 (with appropriate handling of remainder)
    const batches = [];
    for (let i = 0; i < order.length; i += 3) {
      const batchSize = Math.min(3, order.length - i);
      batches.push(order.slice(i, i + batchSize));
    }
    
    console.info(`[juryReveal] ${numJurors} jurors split into ${batches.length} batches:`, batches.map(b => b.length).join('+'));
    
    const usedReasons = new Set(); // Track used reasons to avoid repetition
    let majorityReached = false;
    
    // Reveal each batch
    for (let batchIdx = 0; batchIdx < batches.length; batchIdx++) {
      const batch = batches[batchIdx];
      const batchVotes = [];
      
      // Collect votes for this batch
      for (const jid of batch) {
        // Find this juror's vote
        const voteRecord = finale.juryVotesRaw.find(v => v.jurorId === jid);
        const pick = voteRecord ? voteRecord.pick : ballotPick(jid, A, B);
        
        // Generate dynamic reason
        const dynamicReason = generateVoteReason(jid, pick, A, B, usedReasons);
        
        // Get avatar
        const jurorAvatar = getAvatar(jid);
        
        batchVotes.push({
          jurorId: jid,
          jurorName: safeName(jid),
          finalistName: safeName(pick),
          reason: dynamicReason,
          jurorAvatar: jurorAvatar,
          pick: pick
        });
      }
      
      // Display this batch of votes (stacked cards)
      const votesDisplayTime = finale.fastForwardActive ? 1500 : 4500;
      
      if (typeof g.FinalFaceoff?.showBatchedVotes === 'function') {
        await g.FinalFaceoff.showBatchedVotes(batchVotes, votesDisplayTime);
      } else {
        // Fallback: display one-by-one if batched function not available
        for (const vote of batchVotes) {
          addFaceoffVoteCard(vote.jurorName, vote.finalistName, vote.reason, vote.jurorId);
          await sleep(1500);
        }
      }
      
      // Update vote counts after batch
      for (const vote of batchVotes) {
        votes.set(vote.pick, (votes.get(vote.pick)||0)+1);
        
        // Hook: Log XP for jury vote
        if(g.ProgressionEvents?.onJuryVote){
          g.ProgressionEvents.onJuryVote(vote.pick);
        }
        
        console.info(`[jury] voteReveal juror=${vote.jurorId} finalist=${vote.pick}`);
      }
      
      const a = votes.get(A) || 0;
      const b = votes.get(B) || 0;
      
      // Update fullscreen overlay UI with new counts
      updateFinaleGraph(a, b);
      
      // Check for majority clinch
      if (!majorityReached && (a >= need || b >= need)) {
        majorityReached = true;
        console.info(`[juryReveal] majority clinched votes=${a}-${b}`);
      }
      
      // Show tally screen after each batch (except possibly after the last one)
      const votesRemaining = numJurors - (a + b);
      const tallyDisplayTime = finale.fastForwardActive ? 1000 : 3000;
      
      // Generate dynamic status message
      let statusMessage = '';
      if (typeof g.FinalFaceoff?.generateTallyMessage === 'function') {
        statusMessage = g.FinalFaceoff.generateTallyMessage(a, b, need, votesRemaining);
      } else {
        // Fallback message
        const leader = a > b ? safeName(A) : safeName(B);
        const leaderCount = Math.max(a, b);
        const votesNeeded = need - leaderCount;
        if (leaderCount >= need) {
          statusMessage = `The winner is decided, but let's see how the rest vote!`;
        } else if (a === b) {
          statusMessage = `Votes are tied! The tension is real!`;
        } else {
          statusMessage = `${leader} is ${votesNeeded} votes away from winning!`;
        }
      }
      
      // Show tally screen (skip if it's the last batch and all votes are in)
      if (votesRemaining > 0 || batchIdx < batches.length - 1) {
        if (typeof g.FinalFaceoff?.showTallyScreen === 'function') {
          await g.FinalFaceoff.showTallyScreen(a, b, statusMessage, tallyDisplayTime);
        } else {
          // Fallback: just wait
          await sleep(tallyDisplayTime);
        }
      }
    }
    
    // After all batches are revealed, restore faceoff visibility for final tally
    if (typeof g.FinalFaceoff?.showFaceoff === 'function') {
      g.FinalFaceoff.showFaceoff();
    }
    
    // Remove fast-forward button
    if (ffBtn) ffBtn.remove();
    
    // Suspense timing constants
    const FAST_FORWARD_SUSPENSE_MS = 500;
    const NORMAL_SUSPENSE_MS = 3000;
    
    // Winner suspense delay: 3.0s (dramatic but not too long)
    const suspenseDelay = finale.fastForwardActive ? FAST_FORWARD_SUSPENSE_MS : NORMAL_SUSPENSE_MS;
    await sleep(suspenseDelay);
    
    // Tiebreaker timing constants
    const TIEBREAKER_FAST_FORWARD_MS = 500;
    const TIEBREAKER_DISPLAY_MS = 2400;
    const TIEBREAKER_POST_DELAY_MS = 800;
    
    // Determine winner
    const a=votes.get(A)||0, b=votes.get(B)||0;
    let winner;
    
    if(a===b){
      // Tiebreaker: America's Vote
      winner = americasVoteWinner(A, B);
      votes.set(winner, (votes.get(winner)||0)+1);
      await sleep(finale.fastForwardActive ? TIEBREAKER_FAST_FORWARD_MS : TIEBREAKER_DISPLAY_MS);
      updateFinaleGraph(votes.get(A)||0, votes.get(B)||0);
      await sleep(finale.fastForwardActive ? TIEBREAKER_FAST_FORWARD_MS/2 : TIEBREAKER_POST_DELAY_MS);
    } else {
      winner = a>b ? A : B;
    }
    
    const finalA = votes.get(A)||0;
    const finalB = votes.get(B)||0;
    console.info(`[juryReveal] winner=${winner} votes=${finalA}-${finalB}`);
    
    return { winner, votes, A, B };
  }

  // Main orchestrator for new finale flow
  async function startFinaleRefactorFlow(){
    const gg=g.game||{};
    
    // Show Road to Finale recap if available
    if (global.RoadToFinale?.showRoadToFinaleRecap) {
      try {
        console.info('[jury] Showing Road to Finale recap...');
        await global.RoadToFinale.showRoadToFinaleRecap();
        console.info('[jury] Road to Finale recap complete');
      } catch (e) {
        console.warn('[jury] Road to Finale recap error:', e);
      }
    }
    
    // Flush all pending cards before entering finale
    if(typeof g.flushAllCards === 'function'){
      g.flushAllCards('enter-finale');
    }
    
    let jurors = getJurors();
    
    if(!jurors.length){
      // No jurors: default winner
      const [A,B]=finalists();
      const winner = rng()<0.5?A:B;
      g.showCard?.('Winner',['By default decision, '+safeName(winner)],'jury',2600,true);
      setTimeout(()=>g.showFinaleCinematic?.(winner), 1200);
      return;
    }
    
    // Ensure odd jurors
    jurors = ensureOddJurors(jurors);
    const finalJurors = [...new Set(jurors)];
    gg.juryHouse = finalJurors;
    
    const [A,B]=finalists();
    
    const secs = Number(gg.cfg?.tJuryFinale ?? gg.cfg?.tJury ?? 42) || 42;
    g.setPhase?.('jury', secs, null);
    
    setTvNow('Final Jury Vote');
    
    // CRITICAL FIX: Create fullscreen overlay FIRST before any UI renders
    // This ensures all subsequent UI renders inside the overlay
    let finaleOverlay = null;
    if (typeof g.FinalFaceoff?.mount === 'function') {
      // Mount the faceoff in fullscreen mode - this creates the overlay
      const leftPlayer = g.getP?.(A) || { id: A, name: String(A) };
      const rightPlayer = g.getP?.(B) || { id: B, name: String(B) };
      leftPlayer.avatar = getAvatar(A);
      rightPlayer.avatar = getAvatar(B);
      const need = Math.floor(finalJurors.length / 2) + 1;
      
      g.FinalFaceoff.mount({
        left: leftPlayer,
        right: rightPlayer,
        majority: need,
        fullscreen: true
      });
      
      // Get reference to the overlay element for passing to child functions
      finaleOverlay = document.querySelector('.finale-fullscreen-overlay');
      console.log('[jury] Fullscreen overlay created and faceoff mounted');
    }
    
    // PHASE 1: Anonymous casting - pass overlay so human voting renders inside it
    await startJuryCastingPhase(jurors, A, B, finaleOverlay);
    
    // Show jury vote modal announcement (similar to twists) BEFORE reveal starts
    if (g.showEventModal) {
await g.showEventModal({
      title: 'Time for the Jury Vote',
      emojis: '⚖️👑',
      subtitle: 'It\'s time for the jurors to vote and crown the winner of Big Brother',
      duration: 5000,
      minDisplayTime: 5000,
      tone: 'special'
    });
}
    
    // REMOVED: Don't call renderFinaleGraph here as overlay already mounted above
    // REMOVED: Don't call renderJuryBallotsPanel - we're using fullscreen overlay only
    
    // Intro cards before reveal - SHORTENED for better UX
    // Skip intro cards entirely for faster pacing
    // User already knows jury voting is happening from the event modal above
    
    // Setup gap: 1 second maximum before first vote (FIX 1: Timing)
    await sleep(1000);
    
    // PHASE 2: Jury reveal (no Public Favourite before jury)
    const result = await startJuryRevealPhase(jurors, A, B);
    
    if(!result || !result.winner) return;
    
    const { winner, votes } = result;
    
    // Hook: Log XP for final winner
    if(g.ProgressionEvents?.onFinalWinner){
      g.ProgressionEvents.onFinalWinner(winner);
    }
    
    // Show winner celebration with confetti and floating emojis
    await sleep(1000);
    try{ await g.cardQueueWaitIdle?.(); }catch(e){ /* ignore */ }
    
    const winnerPlayer = gp(winner);
    const runnerUpId = winner === A ? B : A;
    const runnerUpPlayer = gp(runnerUpId);
    const finalA = votes.get(A)||0;
    const finalB = votes.get(B)||0;
    const finalVotes = `${safeName(A)}: ${finalA} • ${safeName(B)}: ${finalB}`;
    
    // Show cinematic winner celebration with confetti and floating emojis
    if(typeof g.FinalFaceoff?.showWinnerCelebration === 'function'){
      g.FinalFaceoff.showWinnerCelebration(winnerPlayer, runnerUpPlayer, finalVotes);
      console.info('[jury] Winner celebration displayed');
    }
    
    try{ g.setMusic?.('victory', true); }catch(e){ /* ignore */ }
    
    // Wait 8 seconds for celebration
    await sleep(8000);
    
    // Close fullscreen overlay and show persistent TV display
    if(typeof g.FinalFaceoff?.destroy === 'function'){
      g.FinalFaceoff.destroy();
      console.info('[jury] Fullscreen overlay closed');
    }
    
    // Update persistent TV display with winner
    showWinnerOnTV(winner);
    
    // Set final labels and clear other states
    showPlacementLabels(winner);
    
    // Run Public Favourite AFTER tally hidden, BEFORE cinematic overlay
    try{
      await runPublicFavouritePostWinner(winner);
    }catch(e){
      console.warn('[publicFav] error:', e);
    }
    
    // Show Top 5 Leaderboard
    try{
      if(typeof g.showTop5Leaderboard === 'function'){
        await g.showTop5Leaderboard(7000); // Show for 7 seconds
        console.info('[jury] Top 5 leaderboard displayed');
      }
    }catch(e){
      console.warn('[jury] leaderboard error:', e);
    }
    
    // Show classic cinematic overlay (restored)
    console.info('[jury] showing finale cinematic');
    if(typeof g.showFinaleCinematic === 'function'){
      try{
        g.showFinaleCinematic(winner);
      }catch(e){
        console.warn('[jury] showFinaleCinematic error', e);
      }
    }
  }

  // ===== Main flow (now delegates to new finale flow) =====
  async function startJuryVote(){
    // Simply call the new refactored flow
    return startFinaleRefactorFlow();
  }

  // Export
  g.startJuryVote = startJuryVote;
  g.juryOnEviction = juryOnEviction;

  // Debug helpers for testing Public Favourite
  g.__pfSimDebug = function(seasons = 200) {
    console.log('[pfSimDebug] Simulating ' + seasons + ' seasons to test weighted distribution...');
    const gg = g.game || {};
    const allPlayers = (gg.players || []).slice();
    if(allPlayers.length < 4){
      console.warn('[pfSimDebug] Need at least 4 players');
      return null;
    }
    
    const totalWeeks = gg.week || 1;
    const playersWithWeights = allPlayers.map(p => {
      const survivalWeek = p.weekEvicted !== null && p.weekEvicted !== undefined ? p.weekEvicted : totalWeeks;
      const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
      const weight = 1 + 0.10 * normalizedSurvival;
      return { player: p, weight };
    });
    
    const pickCounts = {};
    allPlayers.forEach(p => pickCounts[p.id] = 0);
    
    function weightedSample(candidates, count) {
      const selected = [];
      const pool = candidates.slice();
      for (let i = 0; i < count && pool.length > 0; i++) {
        const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
        let rand = rng() * totalWeight;
        let selectedIdx = 0;
        for (let j = 0; j < pool.length; j++) {
          rand -= pool[j].weight;
          if (rand <= 0) {
            selectedIdx = j;
            break;
          }
        }
        selected.push(pool[selectedIdx]);
        pool.splice(selectedIdx, 1);
      }
      return selected;
    }
    
    for(let i = 0; i < seasons; i++){
      const selected = weightedSample(playersWithWeights, 4);
      selected.forEach(c => pickCounts[c.player.id]++);
    }
    
    console.table(allPlayers.map(p => ({
      id: p.id,
      name: p.name,
      weekEvicted: p.weekEvicted || 'N/A',
      weight: playersWithWeights.find(pw => pw.player.id === p.id).weight.toFixed(3),
      pickCount: pickCounts[p.id],
      frequency: ((pickCounts[p.id] / seasons) * 100).toFixed(1) + '%'
    })));
    
    return pickCounts;
  };
  
  g.forcePFRunOnce = function() {
    console.log('[forcePFRunOnce] Forcing Public Favourite to run (resetting guards)...');
    g.__publicFavDone = false;
    const gg = g.game || {};
    if(gg.finale) gg.finale.publicFavDone = false;
    if(!gg.cfg) gg.cfg = {};
    gg.cfg.enablePublicFav = true;
    
    // Get winner or pick a random finalist
    const [A, B] = finalists();
    const winner = A || 1;
    
    console.log('[forcePFRunOnce] Running Public Favourite with winner=' + winner);
    return runPublicFavouritePostWinner(winner);
  };

  /**
   * Animate avatar revive effect (reverse eviction animation)
   * Adds CSS class and returns Promise that resolves on animation end
   * @param {HTMLElement|string} elOrSelector - Avatar element or selector to animate
   * @param {number} maxWait - Maximum wait time in ms (default 1400)
   * @returns {Promise<void>} Resolves when animation completes
   */
  g.animateReviveAvatar = function(elOrSelector, maxWait = 1400) {
    return new Promise((resolve) => {
      // Resolve element from selector if needed
      let el = elOrSelector;
      if (typeof elOrSelector === 'string') {
        el = document.querySelector(elOrSelector);
      }
      
      if (!el || !(el instanceof HTMLElement)) {
        console.warn('[animateReviveAvatar] Invalid element or selector provided:', elOrSelector);
        resolve();
        return;
      }
      
      // Use let to allow forward reference
      let timeout; // eslint-disable-line prefer-const
      
      // Define handler first to avoid use-before-define
      const handleAnimationEnd = () => {
        clearTimeout(timeout);
        el.removeEventListener('animationend', handleAnimationEnd);
        el.classList.remove('revive-avatar');
        resolve();
      };
      
      // Timeout fallback in case animationend doesn't fire
      timeout = setTimeout(() => {
        el.removeEventListener('animationend', handleAnimationEnd);
        el.classList.remove('revive-avatar');
        resolve();
      }, maxWait);
      
      el.addEventListener('animationend', handleAnimationEnd);
      el.classList.add('revive-avatar');
    });
  };

})(window);