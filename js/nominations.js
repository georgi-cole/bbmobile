// MODULE: nominations.js
// HOH picks with suspense; HOH excluded; distinct picks; only alive.
// Supports twist-defined nominee slots (2/3/4). Ceremony: HOH speech → nominee cards.
// One-shot safety: once locked, UI disables and duplicate triggers are ignored.

(function(global){
  // Browser global alias for modules that expect window.global
  if (!global.global) global.global = global;
  
  const $=global.$;

  function aliveIds(){ return global.alivePlayers().map(p=>p.id); }
  function eligibleNomIds(){ const g=global.game; return aliveIds().filter(id=>id!==g.hohId); }
  function requiredSlots(){ return Math.max(2, Math.min(4, global.game?.__twistNomSlots || 2)); }

  function aiPickNominees(count=2){
    const g=global.game; const hoh=global.getP(g.hohId);
    const pool=eligibleNomIds();
    const scored=pool.map(id=>{
      const cand=global.getP(id);
      const aff=hoh?.affinity?.[id] ?? 0;
      const threat=cand?.threat ?? 0.5;
      const inAl=hoh && global.inSameAlliance?.(hoh.id,id)?1:0;
      return {id,score:(-aff)+threat+(inAl?0.6:0)};
    }).sort((a,b)=>b.score-a.score);
    const picks=[]; 
    for(const s of scored){ if(picks.length>=count) break; if(!picks.includes(s.id)) picks.push(s.id); }
    return picks;
  }

  function renderNomsPanel(){
    const g=global.game; global.tv.say('Nominations');

    // Clear any stale nomination flags when starting a fresh nominations phase
    if(!g.nomsLocked && (!Array.isArray(g.nominees) || g.nominees.length===0)){
      g.__nomsCommitInProgress = false;
      g.__nomsCommitted = false;
      g._pendingNoms = null;
    }

    const panel=document.querySelector('#panel'); if(!panel) return; panel.innerHTML='';
    const box=document.createElement('div'); box.className='minigame-host'; box.innerHTML='<h3>Nominations</h3>';
    const hoh=global.getP(g.hohId); const pool=eligibleNomIds();
    const need = requiredSlots();

    // If already locked/committed, just show info
    if(g.nomsLocked || g.__nomsCommitInProgress || g.__nomsCommitted){
      const names = (g.nominees||[]).map(global.safeName).join(', ') || '—';
      const info=document.createElement('div'); info.className='tiny ok';
      info.textContent=`Locked. Nominees: ${names}.`;
      box.appendChild(info);
      panel.appendChild(box);
      return;
    }

    if(hoh && hoh.human){
      const row=document.createElement('div'); row.className='row';
      const selects=[];
      for(let i=0;i<need;i++){
        const sel=document.createElement('select'); sel.dataset.idx=String(i);
        sel.disabled = !!g.__nomsCommitInProgress;
        function fill(){
          sel.innerHTML='';
          pool.forEach(id=>{
            const p=global.getP(id);
            const o=document.createElement('option'); o.value=id; o.textContent=p.name; sel.appendChild(o);
          });
        }
        fill(); selects.push(sel); row.appendChild(sel);
      }
      const lock=document.createElement('button'); lock.className='btn primary'; lock.textContent='Lock Nominations';
      if(g.__nomsCommitInProgress) lock.disabled = true;
      row.append(lock); box.appendChild(row);
      const hint=document.createElement('div'); hint.className='tiny muted';
      hint.textContent = need>2 ? `Pick ${need} different houseguests. Reveal will follow.` : 'Pick two different houseguests. Reveal will follow.';
      box.appendChild(hint);

      lock.onclick=()=>{
        if(g.__nomsCommitInProgress || g.nomsLocked || g.__nomsCommitted) return;
        const values = selects.map(s=>+s.value);
        const unique = [...new Set(values)].filter(v=>v && v!==g.hohId);
        if(unique.length !== need) return alert(`Pick ${need} different nominees (HOH excluded).`);
        // Disable UI immediately
        g.__nomsCommitInProgress = true;
        lock.disabled = true; selects.forEach(s=>s.disabled=true);
        g._pendingNoms=unique.slice();
        finalizeNoms();
      };
    } else {
      // AI hoh
      if(!g.__nomsCommitInProgress && !g.nomsLocked){
        g._pendingNoms=aiPickNominees(need);
        g.__nomsCommitInProgress = true;
        setTimeout(finalizeNoms, 120);
      }
      const info=document.createElement('div'); info.className='tiny muted'; info.textContent='HOH is considering nominations…'; box.appendChild(info);
    }
    panel.appendChild(box);
  }

  function ensureValidDistinct(){
    const g=global.game; const pool=eligibleNomIds(); const need=requiredSlots();
    const pending=Array.isArray(g._pendingNoms)?[...g._pendingNoms]:[];
    const clean=[]; 
    for(const id of pending){ if(id===g.hohId) continue; if(!pool.includes(id)) continue; if(!clean.includes(id)) clean.push(id); }
    while(clean.length<need){ 
      const rest=pool.filter(id=>!clean.includes(id)); if(!rest.length) break; 
      clean.push(rest[Math.floor((global.rng?.()||Math.random())*rest.length)]); 
    }
    return clean.slice(0,need);
  }

  function applyNominationSideEffects(){
    const g=global.game; const hohId=g.hohId;
    const hoh=global.getP(hohId);
    if (!hoh) {
      console.warn('[nom] HOH not found for side effects, skipping affinity updates');
      return;
    }
    // Ensure affinity object exists
    if (!hoh.affinity) hoh.affinity = {};
    
    g.nominees.forEach(id=>{
      const p=global.getP(id); p.nominated=true;
      p.nominatedCount = (p.nominatedCount||0)+1;
      p.nominationState = 'nominated'; // Set initial nomination state
      console.info(`[nom] nominated player=${id} state=nominated`);
      global.addBond?.(hohId,id, global.NOMINATION_PENALTY);
      hoh.affinity[id]=global.clamp?.((hoh.affinity[id]??0)-0.15,-1,1) ?? (hoh.affinity[id]??0)-0.15;
      
      // Social Maneuvers: Record nomination event for weekly energy bonus
      if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
        try{
          global.SocialManeuvers.recordWeeklyEvent(id, { nominated: true });
          console.info('[nom] ✓ Recorded nomination event for player', id);
        }catch(e){
          console.error('[nom] Failed to record nomination event:', e);
        }
      }
    });
  }

  // Nomination speech templates
  const NOMINATION_OPENERS = [
    'This is strictly strategic — nothing personal.',
    'I have to think long-term about my game.',
    'These nominations reflect the dynamics I am seeing.',
    'I respect everyone, but I have to make a move.',
    'Keys are getting harder to hand out each week — I had to choose.',
    'I am making the decision I think is best for my game.',
    'This was not easy, but I have to protect my position.',
    'I am staying true to my strategy this week.',
    'Everyone is playing their own game — this is mine.'
  ];

  const NOMINATION_REASONS = [
    'You are a strong competitor and I see you as a threat.',
    'We have not connected as much as I would like.',
    'Your game has been impressive, which makes you dangerous.',
    'I feel like our paths are diverging strategically.',
    'You have been floating under the radar, and I need clarity.',
    'I think you are in a better position than you let on.',
    'You are well-connected, which worries me.'
  ];

  // Nominee reaction quotes - displayed after reveal
  const NOMINEE_REACTIONS = [
    'I am shocked, but I am ready to fight for my place here.',
    'I did not see this coming at all.',
    'I have a lot of game left to play — this is not over.',
    'I respect the decision, but I am not giving up.',
    'I am going to prove why I deserve to stay.',
    'This nomination just lit a fire under me.',
    'I will show everyone what I am made of this week.',
    'I am disappointed, but I know I can win the veto.',
    'This is a wake-up call — time to step up my game.',
    'I will use this as motivation to keep fighting.'
  ];

  function hohSpeech(hoh, nominees){
    const opener = NOMINATION_OPENERS[Math.floor((global.rng?.()||Math.random())*NOMINATION_OPENERS.length)];
    const hohName = (hoh&&hoh.name) || 'HOH';
    
    // If we have nominees, optionally add a specific reason
    if(Array.isArray(nominees) && nominees.length > 0 && Math.random() > 0.3){
      const nomId = nominees[Math.floor(Math.random()*nominees.length)];
      const reason = NOMINATION_REASONS[Math.floor((global.rng?.()||Math.random())*NOMINATION_REASONS.length)];
      const nomName = global.safeName ? global.safeName(nomId) : String(nomId);
      return `${hohName}: "${opener} ${nomName}, ${reason}"`;
    }
    
    return `${hohName}: "${opener}"`;
  }



  /**
   * Show nominee reaction popup with quote (uses faux TV showCard)
   * @param {number} playerId - Player ID of nominee
   * @returns {Promise} Resolves when popup is closed
   */
  function showNomineeReaction(playerId){
    return new Promise((resolve) => {
      const player = global.getP(playerId);
      if(!player){
        resolve();
        return;
      }

      // Pick a random reaction quote
      const quote = NOMINEE_REACTIONS[Math.floor((global.rng?.()||Math.random())*NOMINEE_REACTIONS.length)];

      // Use faux TV showCard
      if(global.showCard){
        global.showCard(player.name, [`"${quote}"`], 'noms', 2800, true);
      }
      setTimeout(resolve, 2800);
    });
  }

  /**
   * Show all nominee reaction popups simultaneously in a grid layout (2x2 for 3-4 nominees, 1 row for 2)
   * @param {Array<number>} nomineeIds - Array of nominee player IDs
   * @returns {Promise} Resolves when all popups are closed
   */
  function showNomineeReactionsSimultaneously(nomineeIds){
    return new Promise((resolve) => {
      if(!nomineeIds || nomineeIds.length === 0){
        resolve();
        return;
      }

      // Create container for reactions
      const host = document.getElementById('tvOverlay');
      if(!host){
        resolve();
        return;
      }

      // Clear existing content
      host.innerHTML = '';

      // Determine layout: 2 nominees = 1 row, 3-4 nominees = 2x2 grid
      const isGrid = nomineeIds.length >= 3;
      
      // Create grid or row container with data hooks
      const container = document.createElement('div');
      container.className = 'nominee-reactions-container';
      container.setAttribute('data-nom-speeches', '');
      container.style.cssText = isGrid 
        ? `
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 92%;
          padding: 16px;
          box-sizing: border-box;
          margin: 0 auto;
        `
        : `
          display: flex;
          flex-direction: row;
          gap: 12px;
          align-items: center;
          justify-content: center;
          width: 100%;
          max-width: 92%;
          padding: 16px;
          box-sizing: border-box;
          margin: 0 auto;
        `;

      // Create reaction card for each nominee
      nomineeIds.forEach((playerId) => {
        const player = global.getP(playerId);
        if(!player) return;

        // Pick a unique random reaction quote
        const quote = NOMINEE_REACTIONS[Math.floor((global.rng?.()||Math.random())*NOMINEE_REACTIONS.length)];

        // Create reaction card with data hook
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard nominee-reaction-card';
        card.setAttribute('data-nom-speech-card', '');
        card.style.cssText = `
          width: 100%;
          max-width: ${isGrid ? '100%' : '45%'};
          margin: 0;
          padding: 12px 16px;
          animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
          display: flex;
          flex-direction: column;
          align-items: center;
        `;

        // Title with nominee name
        const title = document.createElement('h3');
        title.textContent = player.name;
        title.style.marginBottom = '8px';
        title.style.fontSize = isGrid ? '0.95rem' : '1.05rem';
        card.appendChild(title);

        // Quote
        const quoteDiv = document.createElement('div');
        quoteDiv.className = 'big';
        quoteDiv.textContent = `"${quote}"`;
        quoteDiv.style.fontSize = isGrid ? '0.75rem' : '0.85rem';
        quoteDiv.style.lineHeight = '1.4';
        card.appendChild(quoteDiv);

        // Avatar
        const avatarRow = document.createElement('div');
        avatarRow.className = 'rc-face-row';
        avatarRow.style.marginTop = '10px';
        
        const img = document.createElement('img');
        img.className = isGrid ? 'rc-face small' : 'rc-face';
        img.alt = player.name;
        const resolveAvatar = (global.Game || global).resolveAvatar;
        const getDicebearUrl = global.getDicebearUrl || function(seed) {
          return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
        };
        img.src = resolveAvatar?.(player || playerId) || player?.avatar || player?.img || player?.photo || getDicebearUrl(player?.name || String(playerId));
        avatarRow.appendChild(img);
        card.appendChild(avatarRow);

        container.appendChild(card);
      });

      host.appendChild(container);
      document.getElementById('tv')?.classList.add('tvTall');

      // Progressive enhancement: trigger stagger animation on mobile/touch devices
      if(global.initNomineeStagger) global.initNomineeStagger(container);

      // Remove after duration
      const duration = 3500;
      setTimeout(() => {
        host.innerHTML = '';
        document.getElementById('tv')?.classList.remove('tvTall');
        resolve();
      }, duration);
    });
  }

  async function finalizeNoms(){
    const g=global.game;
    if(g.nomsLocked || g.__nomsCommitted) return; // already locked
    if(!g.__nomsCommitInProgress) g.__nomsCommitInProgress = true;

    g.nominees=ensureValidDistinct(); 
    g.nomsLocked=true; 
    g.__nomsCommitted = true;
    applyNominationSideEffects();

    // Sync player badge states after nominations are locked
    if(typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();

    // Hook: Log XP for nominations
    if(global.ProgressionEvents?.onNominations) global.ProgressionEvents.onNominations(g.nominees);

    (async function ceremony(){
      const hoh=global.getP(g.hohId);
      const ids=(g.nominees||[]).slice();
      g.__suppressNomBadges = true; global.updateHud?.();

      // Step 1: HOH addresses the house (faux TV) - only show HOH avatar
      // This must appear first and complete before any nominee popups
      if(global.buildCardWithAvatars){
        // Use buildCardWithAvatars to explicitly show only HOH avatar
        const hohName = hoh?.name || 'HOH';
        await new Promise((resolve) => {
          const card = global.buildCardWithAvatars({
            title: 'Nomination Ceremony',
            lines: [`${hohName} addresses the house.`],
            tone: 'noms',
            duration: 2400,
            actorId: hoh?.id,
            targetIds: [], // No nominee avatars in initial popup
            type: 'hohSpeech'
          });
          
          // Manually remove card after duration
          setTimeout(() => {
            const host = document.getElementById('tvOverlay');
            if(host) host.innerHTML = '';
            document.getElementById('tv')?.classList.remove('tvTall');
            resolve();
          }, 2400);
        });
      } else {
        // Fallback to regular showCard
        global.showCard?.('Nomination Ceremony', [`${hoh?.name || 'HOH'} addresses the house.`],'noms', 2400, true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
      }
      
      try{ global.addLog?.(hohSpeech(hoh, g.nominees), 'tiny'); }catch{}

      // Step 2: Nominee reveals (faux TV)
      for(let i=0; i<ids.length; i++){
        const label = ids.length>2 ? `Nominee #${i+1}` : (i===0 ? 'First Nominee' : 'Second Nominee');
        global.showCard?.(label, [global.safeName(ids[i])], 'noms', 2200, true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
      }

      // Step 3: Show nominee reaction popups simultaneously (2x2 grid for 3-4, row for 2)
      if(ids.length > 0){
        await showNomineeReactionsSimultaneously(ids);
      }
      
      // Step 4: Show ceremony conclusion message (faux TV styled like nominee cards)
      await new Promise((resolve) => {
        const host = document.getElementById('tvOverlay');
        if(host){
          host.innerHTML = '';
          
          const card = document.createElement('div');
          card.className = 'revealCard diaryRoomCard';
          card.style.cssText = `
            width: 90%;
            max-width: 450px;
            margin: 0 auto;
            padding: 20px 24px;
            text-align: center;
            animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
          `;
          
          const title = document.createElement('h3');
          title.textContent = 'Nomination Ceremony';
          title.style.marginBottom = '12px';
          card.appendChild(title);
          
          const message = document.createElement('div');
          message.className = 'big';
          message.textContent = 'This ceremony is adjourned.';
          message.style.fontSize = '0.9rem';
          card.appendChild(message);
          
          host.appendChild(card);
          document.getElementById('tv')?.classList.add('tvTall');
          
          setTimeout(() => {
            host.innerHTML = '';
            document.getElementById('tv')?.classList.remove('tvTall');
            resolve();
          }, 2000);
        } else {
          // Fallback
          global.showCard?.('Nomination Ceremony', ['This ceremony is adjourned.'], 'noms', 2000, true);
          setTimeout(resolve, 2000);
        }
      });

      // TV screen cards disappear, nominee tags update, game advances
      g.__suppressNomBadges = false; global.updateHud?.();

      try{
        const names = ids.map(global.safeName).join(', ');
        global.addLog?.(`Nominations locked: ${names}.`, 'warn');
      }catch{}

      setTimeout(()=>global.startVetoComp?.(),600);
    })();

    g._pendingNoms=null; global.updateHud();
  }

  function startNominations(){ if(global.game.phase==='nominations') renderNomsPanel(); }
  function lockNominationsAndProceed(){ if(!global.game.nomsLocked && !global.game.__nomsCommitInProgress) finalizeNoms(); }

  global.startNominations=startNominations;
  global.lockNominationsAndProceed=lockNominationsAndProceed;

})(window);