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

  // ========== NEW: Pick Mode for Human HOH Nomination UX ==========
  
  /**
   * Inject CSS for nomination pick mode (dimming, selection rings, confirm bar)
   */
  function injectPickModeStyles(){
    if(document.getElementById('bb-noms-pick-styles')) return; // Already injected
    
    const style = document.createElement('style');
    style.id = 'bb-noms-pick-styles';
    style.textContent = `
      /* Dim entire page except roster during pick mode */
      body.bb-noms-pick-mode::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999;
        pointer-events: none;
      }
      
      /* Keep roster interactive and above dim */
      body.bb-noms-pick-mode #rosterBar,
      body.bb-noms-pick-mode .top-roster,
      body.bb-noms-pick-mode #topRoster {
        position: relative;
        z-index: 1000;
        pointer-events: auto;
      }
      
      /* Selection ring on tiles */
      .top-roster-tile.bb-selected {
        outline: 3px solid var(--ok, #4ade80);
        outline-offset: 2px;
        box-shadow: 0 0 12px var(--ok, #4ade80);
      }
      
      /* Hover state during pick mode */
      body.bb-noms-pick-mode .top-roster-tile:not(.evicted):hover {
        cursor: pointer;
        transform: scale(1.05);
        transition: transform 0.15s ease;
      }
      
      /* Floating confirm bar */
      #bb-noms-confirm-bar {
        position: fixed;
        top: calc(var(--roster-bottom, 120px) + 10px);
        left: 50%;
        transform: translateX(-50%);
        z-index: 1001;
        background: var(--card, #1e293b);
        border: 1px solid var(--sep, #475569);
        border-radius: 8px;
        padding: 12px 20px;
        display: flex;
        align-items: center;
        gap: 16px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
      }
      
      #bb-noms-count-text {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--fg, #f1f5f9);
      }
      
      #bb-noms-confirm-btn {
        padding: 8px 24px;
        background: var(--ok, #4ade80);
        color: #000;
        border: none;
        border-radius: 6px;
        font-weight: 700;
        font-size: 0.9rem;
        cursor: pointer;
        transition: opacity 0.2s, transform 0.1s;
      }
      
      #bb-noms-confirm-btn:hover:not(:disabled) {
        transform: scale(1.05);
      }
      
      #bb-noms-confirm-btn:disabled {
        opacity: 0.4;
        cursor: not-allowed;
      }
      
      /* Reduced motion support */
      @media (prefers-reduced-motion: reduce) {
        body.bb-noms-pick-mode .top-roster-tile:hover {
          transform: none;
        }
        #bb-noms-confirm-btn:hover:not(:disabled) {
          transform: none;
        }
        .top-roster-tile.bb-selected {
          transition: none;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  /**
   * State for pick mode
   */
  const pickModeState = {
    active: false,
    selectedIds: [],
    required: 0,
    escapeHandler: null,
    clickHandlers: new Map()
  };
  
  /**
   * Enter pick mode: dim UI, enable roster selection, show confirm bar
   */
  function enterPickMode(){
    if(pickModeState.active) return; // Already active
    
    injectPickModeStyles();
    
    pickModeState.active = true;
    pickModeState.selectedIds = [];
    pickModeState.required = requiredSlots();
    
    // Add body class for dimming
    document.body.classList.add('bb-noms-pick-mode');
    
    // Intercept Escape/Backspace to prevent exit
    pickModeState.escapeHandler = (e) => {
      if(e.key === 'Escape' || e.key === 'Backspace'){
        e.preventDefault();
        e.stopPropagation();
        // Optionally show a message that they must complete selection
        return false;
      }
    };
    document.addEventListener('keydown', pickModeState.escapeHandler, true);
    
    // Attach click handlers to roster tiles
    const tiles = document.querySelectorAll('.top-roster-tile');
    tiles.forEach(tile => {
      const playerId = parseInt(tile.dataset.playerId);
      if(!playerId || isNaN(playerId)) return;
      
      const handler = (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleSelection(playerId);
      };
      
      tile.addEventListener('click', handler);
      pickModeState.clickHandlers.set(playerId, { tile, handler });
    });
    
    // Create and show confirm bar
    createConfirmBar();
    updateConfirmBar();
  }
  
  /**
   * Exit pick mode: remove dim, selection rings, confirm bar
   */
  function exitPickMode(){
    if(!pickModeState.active) return;
    
    pickModeState.active = false;
    
    // Remove body class
    document.body.classList.remove('bb-noms-pick-mode');
    
    // Remove escape handler
    if(pickModeState.escapeHandler){
      document.removeEventListener('keydown', pickModeState.escapeHandler, true);
      pickModeState.escapeHandler = null;
    }
    
    // Remove click handlers
    pickModeState.clickHandlers.forEach(({ tile, handler }) => {
      tile.removeEventListener('click', handler);
      tile.classList.remove('bb-selected');
    });
    pickModeState.clickHandlers.clear();
    
    // Remove confirm bar
    const bar = document.getElementById('bb-noms-confirm-bar');
    if(bar) bar.remove();
    
    // Clear state
    pickModeState.selectedIds = [];
    pickModeState.required = 0;
  }
  
  /**
   * Toggle selection of a roster tile
   */
  function toggleSelection(playerId){
    const g = global.game;
    const player = global.getP(playerId);
    
    // Check eligibility
    if(!player || player.evicted || playerId === g.hohId){
      // Not eligible - ignore click
      return;
    }
    
    const idx = pickModeState.selectedIds.indexOf(playerId);
    const tile = document.querySelector(`.top-roster-tile[data-player-id="${playerId}"]`);
    
    if(idx >= 0){
      // Deselect
      pickModeState.selectedIds.splice(idx, 1);
      if(tile) tile.classList.remove('bb-selected');
    } else {
      // Select
      pickModeState.selectedIds.push(playerId);
      if(tile) tile.classList.add('bb-selected');
    }
    
    updateConfirmBar();
  }
  
  /**
   * Create floating confirm bar
   */
  function createConfirmBar(){
    if(document.getElementById('bb-noms-confirm-bar')) return; // Already exists
    
    const bar = document.createElement('div');
    bar.id = 'bb-noms-confirm-bar';
    
    const countText = document.createElement('span');
    countText.id = 'bb-noms-count-text';
    countText.setAttribute('aria-live', 'polite');
    countText.setAttribute('aria-atomic', 'true');
    
    const confirmBtn = document.createElement('button');
    confirmBtn.id = 'bb-noms-confirm-btn';
    confirmBtn.textContent = 'CONFIRM';
    confirmBtn.disabled = true;
    
    confirmBtn.addEventListener('click', () => {
      if(pickModeState.selectedIds.length === pickModeState.required){
        commitNominations();
      }
    });
    
    // Keyboard support
    confirmBtn.addEventListener('keydown', (e) => {
      if(e.key === 'Enter' || e.key === ' '){
        e.preventDefault();
        confirmBtn.click();
      }
    });
    
    bar.appendChild(countText);
    bar.appendChild(confirmBtn);
    document.body.appendChild(bar);
    
    // Calculate roster bottom position for bar placement
    const rosterBar = document.getElementById('rosterBar');
    if(rosterBar){
      const rect = rosterBar.getBoundingClientRect();
      document.documentElement.style.setProperty('--roster-bottom', `${rect.bottom}px`);
    }
  }
  
  /**
   * Update confirm bar count and button state
   */
  function updateConfirmBar(){
    const countText = document.getElementById('bb-noms-count-text');
    const confirmBtn = document.getElementById('bb-noms-confirm-btn');
    
    if(!countText || !confirmBtn) return;
    
    const selected = pickModeState.selectedIds.length;
    const required = pickModeState.required;
    
    countText.textContent = `${selected} / ${required} selected`;
    
    confirmBtn.disabled = (selected !== required);
  }
  
  /**
   * Commit nominations from pick mode
   */
  function commitNominations(){
    const g = global.game;
    
    // Set pending noms and trigger finalize
    g._pendingNoms = pickModeState.selectedIds.slice();
    
    // Exit pick mode
    exitPickMode();
    
    // Finalize nominations
    finalizeNoms();
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
      // Show a simple in-TV card
      const host = document.getElementById('tvOverlay');
      if(host){
        host.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard';
        card.style.cssText = 'max-width: 92%; padding: 16px; margin: 0 auto; text-align: center;';
        
        const title = document.createElement('h3');
        title.textContent = 'Nominations';
        title.style.marginBottom = '8px';
        card.appendChild(title);
        
        const info = document.createElement('div');
        info.className = 'big';
        info.textContent = `Locked. Nominees: ${names}.`;
        card.appendChild(info);
        
        host.appendChild(card);
        document.getElementById('tv')?.classList.add('tvTall');
      }
      return;
    }

    // ========== NEW: Human HOH In-TV Pick Mode Flow ==========
    if(hoh && hoh.human){
      // Show in-TV "Nomination Ceremony" intro card with NOMINATE button
      const host = document.getElementById('tvOverlay');
      if(!host) return;
      
      host.innerHTML = '';
      
      const card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      card.style.cssText = `
        max-width: 92%;
        max-height: 78%;
        margin: 0 auto;
        padding: 20px 24px;
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
      `;
      
      const title = document.createElement('h3');
      title.textContent = 'Nomination Ceremony';
      title.style.marginBottom = '4px';
      title.style.fontSize = '1.1rem';
      card.appendChild(title);
      
      const bodyText = document.createElement('div');
      bodyText.className = 'big';
      bodyText.style.fontSize = '0.85rem';
      bodyText.style.lineHeight = '1.5';
      bodyText.style.marginBottom = '8px';
      
      const countText = need > 2 
        ? `You must nominate ${need} houseguests for eviction.`
        : 'You must nominate two houseguests for eviction.';
      bodyText.textContent = `${hoh.name}, as Head of Household, it is time to make your nominations. ${countText}`;
      card.appendChild(bodyText);
      
      const nominateBtn = document.createElement('button');
      nominateBtn.className = 'btn primary';
      nominateBtn.textContent = 'NOMINATE';
      nominateBtn.style.cssText = `
        padding: 12px 32px;
        font-size: 1rem;
        font-weight: 700;
        margin-top: 8px;
      `;
      
      nominateBtn.addEventListener('click', () => {
        // Clear TV and enter pick mode
        host.innerHTML = '';
        document.getElementById('tv')?.classList.remove('tvTall');
        enterPickMode();
      });
      
      card.appendChild(nominateBtn);
      host.appendChild(card);
      document.getElementById('tv')?.classList.add('tvTall');
      
      return; // Do NOT render legacy panel
    } else {
      // AI HOH - use existing AI logic
      if(!g.__nomsCommitInProgress && !g.nomsLocked){
        g._pendingNoms=aiPickNominees(need);
        g.__nomsCommitInProgress = true;
        setTimeout(finalizeNoms, 120);
      }
      
      // Show simple in-TV message for AI
      const host = document.getElementById('tvOverlay');
      if(host){
        host.innerHTML = '';
        const card = document.createElement('div');
        card.className = 'revealCard diaryRoomCard';
        card.style.cssText = 'max-width: 92%; padding: 16px; margin: 0 auto; text-align: center;';
        
        const title = document.createElement('h3');
        title.textContent = 'Nominations';
        title.style.marginBottom = '8px';
        card.appendChild(title);
        
        const info = document.createElement('div');
        info.className = 'tiny muted';
        info.textContent = 'HOH is considering nominations…';
        card.appendChild(info);
        
        host.appendChild(card);
        document.getElementById('tv')?.classList.add('tvTall');
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

      // NEW: Check if this was a human HOH pick-mode nomination
      const wasHumanPickMode = hoh && hoh.human;
      
      if(wasHumanPickMode){
        // ========== NEW HUMAN HOH CEREMONY FLOW ==========
        
        // Step 1: Show single summary card with all nominees
        await new Promise((resolve) => {
          const host = document.getElementById('tvOverlay');
          if(!host) {
            resolve();
            return;
          }
          
          host.innerHTML = '';
          
          const card = document.createElement('div');
          card.className = 'revealCard diaryRoomCard';
          card.style.cssText = `
            max-width: 92%;
            max-height: 78%;
            margin: 0 auto;
            padding: 20px 24px;
            text-align: center;
            animation: cardFloatIn 0.65s cubic-bezier(0.25, 0.9, 0.25, 1) forwards;
          `;
          
          const title = document.createElement('h3');
          title.textContent = 'Nominations';
          title.style.marginBottom = '12px';
          title.style.fontSize = '1.1rem';
          card.appendChild(title);
          
          const nomineesList = document.createElement('div');
          nomineesList.className = 'big';
          nomineesList.style.fontSize = '0.95rem';
          nomineesList.style.lineHeight = '1.6';
          nomineesList.style.fontWeight = '600';
          
          // Format: "Alice • Bob • Carol"
          const names = ids.map(id => global.safeName(id)).join(' • ');
          nomineesList.textContent = names;
          card.appendChild(nomineesList);
          
          host.appendChild(card);
          document.getElementById('tv')?.classList.add('tvTall');
          
          setTimeout(() => {
            // Don't clear yet - reactions will clear it
            resolve();
          }, 2200);
        });
        
        // Log HOH speech
        try{ 
          global.addLog?.(hohSpeech(hoh, g.nominees), 'tiny'); 
        }catch(e){ 
          // Logging is optional, ignore failures
        }
        
        // Step 2: Show nominee reactions
        if(ids.length > 0){
          await showNomineeReactionsSimultaneously(ids);
        }
        
        // Step 3: Show ceremony conclusion
        await new Promise((resolve) => {
          const host = document.getElementById('tvOverlay');
          if(host){
            host.innerHTML = '';
            
            const card = document.createElement('div');
            card.className = 'revealCard diaryRoomCard';
            card.style.cssText = `
              max-width: 92%;
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
        
      } else {
        // ========== ORIGINAL AI HOH CEREMONY FLOW ==========
        
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
        for(let i=0; i<ids.length; i++){
          const label = ids.length>2 ? `Nominee #${i+1}` : (i===0 ? 'First Nominee' : 'Second Nominee');
          global.showCard?.(label, [global.safeName(ids[i])], 'noms', 2200, true);
          try{ 
            await global.cardQueueWaitIdle?.(); 
          }catch(e){ 
            // Card queue is optional, continue if not available
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

})(window);