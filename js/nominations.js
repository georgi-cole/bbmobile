// MODULE: nominations.js
// HOH picks with suspense; HOH excluded; distinct picks; only alive.
// Supports twist-defined nominee slots (2/3/4). Ceremony: HOH speech → nominee cards.
// One-shot safety: once locked, UI disables and duplicate triggers are ignored.

(function(global){
  // Browser global alias for modules that expect window.global
  if (!global.global) global.global = global;

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

    const hoh=global.getP(g.hohId);
    const need = requiredSlots();

    // If already locked/committed, show in-TV message
    if(g.nomsLocked || g.__nomsCommitInProgress || g.__nomsCommitted){
      const names = (g.nominees||[]).map(global.safeName).join(', ') || '—';
      // Use TVCards.showInlineCard if available, otherwise fallback
      if(global.TVCards && global.TVCards.showInlineCard){
        global.TVCards.showInlineCard({
          title: 'Nominations',
          content: `Locked. Nominees: ${names}.`,
          tone: 'noms',
          duration: 0 // Manual dismiss
        });
      } else {
        // Fallback: Show a simple in-TV card
        const host = document.getElementById('tvOverlay');
        if(host){
          host.innerHTML = '';
          const card = document.createElement('div');
          card.className = 'revealCard diaryRoomCard tvCardBody';
          
          const title = document.createElement('h3');
          title.textContent = 'Nominations';
          card.appendChild(title);
          
          const info = document.createElement('p');
          info.className = 'big';
          info.textContent = `Locked. Nominees: ${names}.`;
          card.appendChild(info);
          
          host.appendChild(card);
          document.getElementById('tv')?.classList.add('tvTall');
        }
      }
      return;
    }

    // ========== Human HOH: Nomination intro card ==========
    // The fullscreen module (nominations-grid-fullscreen.js) intercepts this function
    // and handles the flow. This code only runs if the interceptor is not installed.
    if(hoh && hoh.human){
      console.log('[noms] Human HOH detected - showing intro card (need:', need, ')');
      
      // Set guard flag to prevent premature nomination badge display
      // Any programmatic nominations (from twists/social-maneuvers) will be buffered
      global.__awaitingHumanNominations = true;
      if(!Array.isArray(global.__provisionalNominations)) {
        global.__provisionalNominations = [];
      }
      console.log('[noms] ✓ Set __awaitingHumanNominations flag - nominations will be buffered');
      
      // Pre-flight: Ensure #tvOverlay exists before attempting to use any helpers
      // This is critical for multi-eviction weeks where the intro may fail to appear
      let tvOverlay = document.getElementById('tvOverlay');
      if(!tvOverlay){
        console.warn('[noms] #tvOverlay missing - creating scaffold synchronously');
        const tv = document.getElementById('tv');
        if(tv){
          const viewport = tv.querySelector('.tvViewport');
          tvOverlay = document.createElement('div');
          tvOverlay.id = 'tvOverlay';
          
          if(viewport){
            viewport.appendChild(tvOverlay);
          } else {
            tv.appendChild(tvOverlay);
          }
          
          // Create scaffold elements
          const dim = document.createElement('div');
          dim.className = 'tvDim';
          tvOverlay.appendChild(dim);
          
          const content = document.createElement('div');
          content.className = 'tvOverlayContent';
          tvOverlay.appendChild(content);
          
          console.log('[noms] ✓ Created #tvOverlay scaffold');
        } else {
          console.error('[noms] Cannot create #tvOverlay - #tv element not found');
        }
      }
      
      // Prefer TVCards.showNominateIntro for proper TV overlay positioning
      if(global.TVCards && typeof global.TVCards.showNominateIntro === 'function'){
        console.log('[noms] Using TVCards.showNominateIntro()');
        
        try {
          global.TVCards.showNominateIntro({
            hohName: hoh.name,
            need: need,
            onNominate: () => {
              console.log('[noms] NOMINATE button clicked via TVCards');
              
              // Note: __awaitingHumanNominations flag remains set during selection
              // It will be cleared in finalizeNoms() after selections are confirmed
              console.log('[noms] Opening selector - flag will be cleared in finalizeNoms()');
              
              // Try to use NomsFS.open() if available (from nominations-grid-fullscreen.js)
              if(global.NomsFS && typeof global.NomsFS.open === 'function'){
                console.log('[noms] Using NomsFS.open()');
                
                global.NomsFS.open().then(selections => {
                  if(selections && Array.isArray(selections) && selections.length > 0){
                    console.log('[noms] Selections from NomsFS.open():', selections);
                    g._pendingNoms = selections.slice();
                    finalizeNoms();
                  } else {
                    console.warn('[noms] NomsFS.open() returned no selections, re-showing intro');
                    renderNomsPanel(); // Re-show intro card
                  }
                }).catch(err => {
                  console.error('[noms] NomsFS.open() error:', err);
                  renderNomsPanel(); // Re-show intro card
                });
              } else {
                // NomsFS not available - log error and show message
                console.error('[noms] NomsFS not available - fullscreen module not loaded');
                alert('Nomination selector not available. Please refresh the page.');
              }
            }
          });
          
          return;
        } catch(err) {
          console.error('[noms] TVCards.showNominateIntro() failed:', err);
          // Fall through to manual fallback below
        }
      }
      
      // Fallback: Manual card using proper TV overlay structure
      console.log('[noms] TVCards not available, using fallback intro card');
      
      let content = global.ensureTVOverlayScaffold ? global.ensureTVOverlayScaffold() : null;
      if(!content){
        console.error('[noms] Failed to ensure TV overlay scaffold for fallback panel');
        // Hard fallback: Find or create .tvOverlayContent directly
        tvOverlay = document.getElementById('tvOverlay');
        if(tvOverlay){
          content = tvOverlay.querySelector('.tvOverlayContent');
          if(!content){
            console.log('[noms] Creating .tvOverlayContent in hard fallback');
            content = document.createElement('div');
            content.className = 'tvOverlayContent';
            tvOverlay.appendChild(content);
          }
        } else {
          console.error('[noms] #tvOverlay still missing after pre-flight check');
          return;
        }
      }
      
      content.innerHTML = '';
      
      const card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard tvCardBody';
      
      const title = document.createElement('h3');
      title.textContent = 'Nomination Ceremony';
      card.appendChild(title);
      
      const info = document.createElement('p');
      const countText = need > 2 
        ? `You must nominate ${need} houseguests for eviction.`
        : 'You must nominate two houseguests for eviction.';
      info.textContent = `${hoh.name}, as Head of Household, it is time to make your nominations. ${countText}`;
      card.appendChild(info);
      
      const btnRow = document.createElement('div');
      btnRow.className = 'veto-decision-row';
      
      const nominateBtn = document.createElement('button');
      nominateBtn.className = 'btn primary';
      nominateBtn.textContent = 'NOMINATE';
      nominateBtn.setAttribute('aria-label', 'Open nomination selector');
      
      nominateBtn.addEventListener('click', () => {
        console.log('[noms] Fallback NOMINATE button clicked');
        nominateBtn.disabled = true;
        
        // Note: __awaitingHumanNominations flag remains set during selection
        // It will be cleared in finalizeNoms() after selections are confirmed
        console.log('[noms] Opening selector (fallback) - flag will be cleared in finalizeNoms()');
        
        // Try to use NomsFS.open() if available (from nominations-grid-fullscreen.js)
        if(global.NomsFS && typeof global.NomsFS.open === 'function'){
          console.log('[noms] Using NomsFS.open() from fallback');
          content.innerHTML = '';
          document.getElementById('tv')?.classList.remove('tvTall');
          
          global.NomsFS.open().then(selections => {
            if(selections && Array.isArray(selections) && selections.length > 0){
              console.log('[noms] Selections from NomsFS.open():', selections);
              g._pendingNoms = selections.slice();
              finalizeNoms();
            } else {
              console.warn('[noms] NomsFS.open() returned no selections, re-showing fallback');
              renderNomsPanel(); // Re-show fallback card
            }
          }).catch(err => {
            console.error('[noms] NomsFS.open() error:', err);
            renderNomsPanel(); // Re-show fallback card
          });
        } else {
          // NomsFS not available - log error and show message
          console.error('[noms] NomsFS not available - fullscreen module not loaded');
          alert('Nomination selector not available. Please refresh the page.');
        }
      });
      
      btnRow.appendChild(nominateBtn);
      card.appendChild(btnRow);
      content.appendChild(card);
      
      document.getElementById('tv')?.classList.add('tvTall');
      
      // Apply text fitting if available
      if(global.fitTVCardText || (global.UI && global.UI.fitTVCardText)){
        const fitFn = global.UI?.fitTVCardText || global.fitTVCardText;
        fitFn(card);
      }
      
      console.log('[noms] ✓ Fallback intro card mounted');
      return;
    }
    
    // ========== AI HOH ==========
    if(!hoh || !hoh.human){
      // AI HOH - use existing AI logic
      if(!g.__nomsCommitInProgress && !g.nomsLocked){
        g._pendingNoms=aiPickNominees(need);
        g.__nomsCommitInProgress = true;
        setTimeout(finalizeNoms, 120);
      }
      
      // Show simple in-TV message for AI
      if(global.TVCards && global.TVCards.showInlineCard){
        global.TVCards.showInlineCard({
          title: 'Nominations',
          content: 'HOH is considering nominations…',
          tone: 'noms',
          duration: 0
        });
      } else {
        // Fallback
        const host = document.getElementById('tvOverlay');
        if(host){
          host.innerHTML = '';
          const card = document.createElement('div');
          card.className = 'revealCard diaryRoomCard tvCardBody';
          
          const title = document.createElement('h3');
          title.textContent = 'Nominations';
          card.appendChild(title);
          
          const info = document.createElement('p');
          info.className = 'tiny muted';
          info.textContent = 'HOH is considering nominations…';
          card.appendChild(info);
          
          host.appendChild(card);
          document.getElementById('tv')?.classList.add('tvTall');
        }
      }
    }
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
    
    // Check if we're awaiting human HOH nominations - if so, buffer instead of applying
    if(global.__awaitingHumanNominations && hoh && hoh.human){
      console.log('[noms] Buffering nominations while awaiting human HOH selection');
      g.nominees.forEach(id=>{
        if(!global.__provisionalNominations) global.__provisionalNominations = [];
        if(!global.__provisionalNominations.includes(id)){
          global.__provisionalNominations.push(id);
          console.info(`[noms] ✓ Buffered provisional nomination: Player ${id} while awaiting human HOH`);
        }
      });
      return; // Don't apply side effects yet
    }
    
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
   * Show nominee reaction popups one at a time (1-by-1) in the TV overlay
   * @param {Array<number>} nomineeIds - Array of nominee player IDs
   * @returns {Promise} Resolves when all popups are closed
   */
  async function showNomineeReactionsSimultaneouslyInternal(nomineeIds){
    if(!nomineeIds || nomineeIds.length === 0){
      return;
    }

    // Create container for reactions
    const host = document.getElementById('tvOverlay');
    if(!host){
      return;
    }

    // Get fitTVCardText function for downscaling if needed
    const fitTVCardText = (global.UI && global.UI.fitTVCardText) || global.fitTVCardText;

    // Show each nominee reaction one at a time
    for(let i = 0; i < nomineeIds.length; i++){
      const playerId = nomineeIds[i];
      const player = global.getP(playerId);
      if(!player) continue;

      // Clear existing content
      host.innerHTML = '';

      // Pick a unique random reaction quote
      const quote = NOMINEE_REACTIONS[Math.floor((global.rng?.()||Math.random())*NOMINEE_REACTIONS.length)];

      // Create reaction card
      const card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard nominee-reaction-card';
      card.setAttribute('data-nom-speech-card', '');
      card.style.cssText = `
        max-width: 92%;
        max-height: 78%;
        margin: 0 auto;
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
      title.style.fontSize = '0.95rem';
      card.appendChild(title);

      // Quote
      const quoteDiv = document.createElement('div');
      quoteDiv.className = 'big';
      quoteDiv.textContent = `"${quote}"`;
      quoteDiv.style.fontSize = '0.85rem';
      quoteDiv.style.lineHeight = '1.4';
      card.appendChild(quoteDiv);

      // Avatar
      const avatarRow = document.createElement('div');
      avatarRow.className = 'rc-face-row';
      avatarRow.style.marginTop = '10px';
      
      const img = document.createElement('img');
      img.className = 'rc-face';
      img.alt = player.name;
      const resolveAvatar = (global.Game || global).resolveAvatar;
      const getDicebearUrl = global.getDicebearUrl || function(seed) {
        return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
      };
      img.src = resolveAvatar?.(player || playerId) || player?.avatar || player?.img || player?.photo || getDicebearUrl(player?.name || String(playerId));
      avatarRow.appendChild(img);
      card.appendChild(avatarRow);

      host.appendChild(card);
      document.getElementById('tv')?.classList.add('tvTall');

      // Call fitTVCardText to minimize need for scrolling
      if(fitTVCardText) fitTVCardText(card);

      // Wait before showing next card (or resolve if last card)
      const cardDelay = 1800; // 1.8s per card
      await new Promise(resolve => setTimeout(resolve, cardDelay));
    }

    // Clean up after all cards shown
    host.innerHTML = '';
    document.getElementById('tv')?.classList.remove('tvTall');
  }

  function showNomineeReactionsSimultaneously(nomineeIds){
    return showNomineeReactionsSimultaneouslyInternal(nomineeIds);
  }

  async function finalizeNoms(){
    const g=global.game;
    if(g.nomsLocked || g.__nomsCommitted) return; // already locked
    
    // Guard: Don't finalize if human HOH hasn't made selections yet
    const hoh = global.getP(g.hohId);
    if(hoh && hoh.human && !g._pendingNoms){
      console.warn('[nom] Blocking premature finalizeNoms - human HOH has not selected nominees yet');
      return;
    }
    
    if(!g.__nomsCommitInProgress) g.__nomsCommitInProgress = true;

    // Clear awaiting flag - we're now committing nominations
    if(global.__awaitingHumanNominations){
      console.log('[noms] Clearing __awaitingHumanNominations flag - finalizing nominations');
      global.__awaitingHumanNominations = false;
    }

    g.nominees=ensureValidDistinct(); 
    
    // Apply any buffered provisional nominations (avoid duplicates)
    if(Array.isArray(global.__provisionalNominations) && global.__provisionalNominations.length > 0){
      console.log('[noms] Applying buffered provisional nominations:', global.__provisionalNominations);
      const currentNominees = new Set(g.nominees);
      const pool = eligibleNomIds(); // Call once before loop
      global.__provisionalNominations.forEach(id => {
        if(!currentNominees.has(id) && id !== g.hohId){
          // Only add if not already nominated and not the HOH
          if(pool.includes(id)){
            g.nominees.push(id);
            currentNominees.add(id);
            console.info(`[noms] ✓ Applied buffered nomination: Player ${id}`);
          }
        }
      });
      // Clear the buffer
      global.__provisionalNominations = [];
    }
    
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

      // Check if ceremony was already handled by fullscreen selector
      if(g.__nomsFromFullscreenSelector){
        console.log('[noms] Ceremony already handled by fullscreen selector, skipping');
        g.__nomsFromFullscreenSelector = false; // Reset flag
        g.__suppressNomBadges = false; global.updateHud?.();
        
        try{
          const names = ids.map(global.safeName).join(', ');
          global.addLog?.(`Nominations locked: ${names}.`, 'warn');
        }catch(e){ 
          // Logging is optional, ignore failures
        }
        
        setTimeout(()=>global.startVetoComp?.(),600);
        return;
      }

      // ========== CEREMONY FLOW (AI or fallback) ==========
      
      // Step 1: HOH addresses the house (faux TV) - only show HOH avatar
      // This must appear first and complete before any nominee popups
      if(global.buildCardWithAvatars){
        // Use buildCardWithAvatars to explicitly show only HOH avatar
        const hohName = hoh?.name || 'HOH';
        await new Promise((resolve) => {
          // buildCardWithAvatars handles DOM insertion
          global.buildCardWithAvatars({
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
        try{ 
          await global.cardQueueWaitIdle?.(); 
        }catch(e){ 
          // Card queue is optional, continue if not available
        }
      }
      
      try{ 
        global.addLog?.(hohSpeech(hoh, g.nominees), 'tiny'); 
      }catch(e){ 
        // Logging is optional, ignore failures
      }

      // Step 2: Nominee reveals (faux TV)
      // Prefer TVCards helpers for proper TV overlay positioning
      for(let i=0; i<ids.length; i++){
        const label = ids.length>2 ? `Nominee #${i+1}` : (i===0 ? 'First Nominee' : 'Second Nominee');
        const nomineeName = global.safeName(ids[i]);
        
        // Use TVCards.showTVCardWithAvatars if available
        if(global.TVCards && typeof global.TVCards.showTVCardWithAvatars === 'function'){
          await global.TVCards.showTVCardWithAvatars({
            title: label,
            lines: [nomineeName],
            tone: 'noms',
            duration: 2200,
            subjectIds: [ids[i]] // Show nominee avatar
          });
        } else {
          // Fallback to global.showCard
          global.showCard?.(label, [nomineeName], 'noms', 2200, true);
          try{ 
            await global.cardQueueWaitIdle?.(); 
          }catch(e){ 
            // Card queue is optional, continue if not available
          }
        }
      }

      // Step 3: Show nominee reaction popups simultaneously (2x2 grid for 3-4, row for 2)
      if(ids.length > 0){
        try{
          await showNomineeReactionsSimultaneously(ids);
        }catch(e){
          // Reactions are optional, continue if they fail
          console.warn('[noms] Nominee reactions failed:', e);
        }
      }
      
      // Step 4: Show ceremony conclusion message (use TVCards if available)
      if(global.TVCards && global.TVCards.showTVCard){
        await global.TVCards.showTVCard({
          title: 'Nomination Ceremony',
          lines: ['This ceremony is adjourned.'],
          tone: 'noms',
          duration: 2000
        });
      } else {
        // Fallback: manual card creation
        await new Promise((resolve) => {
          const host = document.getElementById('tvOverlay');
          if(host){
            host.innerHTML = '';
            
            const card = document.createElement('div');
            card.className = 'revealCard diaryRoomCard tvCardBody';
            
            const title = document.createElement('h3');
            title.textContent = 'Nomination Ceremony';
            card.appendChild(title);
            
            const message = document.createElement('p');
            message.className = 'big';
            message.textContent = 'This ceremony is adjourned.';
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
      }

      // TV screen cards disappear, nominee tags update, game advances
      g.__suppressNomBadges = false; global.updateHud?.();

      try{
        const names = ids.map(global.safeName).join(', ');
        global.addLog?.(`Nominations locked: ${names}.`, 'warn');
      }catch(e){ 
        // Logging is optional, ignore failures
      }

      setTimeout(()=>global.startVetoComp?.(),600);
    })();

    g._pendingNoms=null; global.updateHud();
  }

  function startNominations(){ if(global.game.phase==='nominations') renderNomsPanel(); }
  function lockNominationsAndProceed(){ if(!global.game.nomsLocked && !global.game.__nomsCommitInProgress) finalizeNoms(); }

  global.startNominations=startNominations;
  global.lockNominationsAndProceed=lockNominationsAndProceed;
  global.finalizeNoms=finalizeNoms;
  global.renderNomsPanel=renderNomsPanel;
  global.applyNominationSideEffects=applyNominationSideEffects;
  global.showNomineeReactionsSimultaneously=showNomineeReactionsSimultaneously;

})(window);