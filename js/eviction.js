// MODULE: eviction.js (Consolidated)
// Combines advanced multi-eviction & tie handling + per-voter Diary Room sequence & early reveal,
// plus auto default human vote if not cast by their turn.
// Retains jury integration, double/triple eviction logic, and social routing.
//
// Remove/delete eviction_Version2.js after adding this file.

(function(global){
  const JURY_START_AT=9;
  
  // Tie-break timeout: maximum time to wait for human HOH to break a tie
  // After this timeout, the tie is auto-resolved using HOH affinity
  const TIE_BREAK_TIMEOUT_MS = 15000; // 15 seconds

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  function sleep(ms){ return new Promise(r=>setTimeout(r, ms)); }

  // Eviction result phrase variants
  const EVICTION_PHRASES = [
    'you have been evicted.',
    'you are evicted from the Big Brother house.',
    'your time in the house has come to an end.',
    'you must leave the Big Brother house.',
    'you have been eliminated.',
    'your journey ends here.',
    'you are leaving the house tonight.'
  ];

  function pickEvictionPhrase(){
    return EVICTION_PHRASES[Math.floor(Math.random()*EVICTION_PHRASES.length)];
  }

  // Helper: Build vote summary string for result cards
  // Returns format: "Alice 5 — Ben 4" or "Alice 3 — Ben 2 — Carol 1"
  function buildVoteSummary(nominees, countsMap){
    if(!Array.isArray(nominees) || nominees.length === 0) return '';
    if(!countsMap || !(countsMap instanceof Map)) return '';
    
    return nominees
      .map(id => `${global.safeName(id)} ${countsMap.get(id) || 0}`)
      .join(' — ');
  }

  function startLiveVote(){
    const g=global.game;
    
    // Guard: Block live vote start while game is paused
    if(g.PauseController && g.PauseController.isPaused && g.PauseController.isPaused()){
      console.info('[eviction] startLiveVote blocked: game is paused');
      return;
    }
    
    // Stop Social AI Scheduler explicitly to prevent background social chatter
    if (global.SocialAIScheduler && typeof global.SocialAIScheduler.stopAiSocialPhase === 'function') {
      global.SocialAIScheduler.stopAiSocialPhase();
      console.debug('[eviction] Social AI Scheduler stopped for live vote');
    }
    
    g.eviction={
      nominees:[...g.nominees],
      votes:[],
      evicted:null,
      voters:[],
      planned:[],
      sequenceStarted:false,
      sequenceDone:false,
      revealed:false,
      revealing:false
    };
    g.__human_vote=null;

    global.tv.say('Live Vote'); global.phaseMusic?.('livevote');

    const voters=eligibleVoters();
    g.eviction.voters=voters.map(v=>v.id);

    // Pre-plan AI target choices
    g.eviction.planned=voters.map(v=>{
      if(v.id===g.humanId) return {voter:v.id, evict:null};
      return {
        voter:v.id,
        evict:(g.eviction.nominees.length===2
          ? voteFor2(v.id,g.eviction.nominees)
          : voteForMulti(v.id,g.eviction.nominees))
      };
    });

    renderLiveVotePanel();

    global.setPhase('livevote', g.cfg.tVote, async ()=>{
      const gg=global.game;
      if(!gg?.eviction) return;

      if(!gg.eviction.sequenceStarted) beginDiaryRoomSequence();
      const start=Date.now();
      while(!gg.eviction.sequenceDone && Date.now()-start<90000){
        await sleep(250);
      }
      if(!gg.eviction.revealed && !gg.eviction.revealing){
        try{ await revealVotes(false); }catch(e){}
      }
    });

    // Start DR sequence - wait for human to vote if they're a voter
    // This prevents overlapping UIs where voting overlay and diary room cards show simultaneously
    const humanIsVoter = voters.some(v => v.id === g.humanId);
    if (humanIsVoter) {
      // If human is voting, wait for their vote before starting DR sequence
      // This ensures clean UI transition: vote UI -> rollout -> DR sequence
      setTimeout(async ()=>{ 
        if(!g.eviction.sequenceStarted) {
          // Wait for human vote to be cast before starting sequence
          if(g.__human_vote == null) {
            console.debug('[eviction] Waiting for human vote before starting DR sequence');
            try { await waitForHumanVote(); } catch(e) {}
          }
          beginDiaryRoomSequence();
        }
      }, 700);
    } else {
      // If human is just observing, start DR sequence immediately
      setTimeout(()=>{ if(!g.eviction.sequenceStarted) beginDiaryRoomSequence(); }, 700);
    }
  }
  global.startLiveVote=startLiveVote;

  function renderLiveVotePanel(){
    const g=global.game; const panel=document.querySelector('#panel'); if(!panel) return;
    
    // Clear any stale vote UI and unlock scroll before starting new flow
    if (global.closeAllVoteUI) {
      global.closeAllVoteUI();
    }
    
    panel.innerHTML='';
    if(!g.eviction){
      // Use inline status instead of below-TV message
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('Eviction flow not initialized.', 'warn');
      } else {
        panel.innerHTML='<div class="tiny muted">Eviction flow not initialized.</div>';
      }
      return;
    }

    // COMMIT 1 & 2: Direct voting flow + observer/voter enforcement
    const you = global.getP?.(g.humanId);
    const voters = eligibleVoters();
    const humanIsVoter = !!(you && voters.some(v => v.id === you.id));
    const hasVoted = g.__human_vote != null;
    
    // Detect if human is HOH and is a potential tie-breaker
    // This happens when: HOH is human, there are 2 nominees, and HOH is not in the regular voter list
    // Note: Tie-breaks only occur with 2 nominees (1-on-1 vote scenarios)
    // With 3+ nominees, ties are resolved by plurality (most votes), not HOH
    const humanIsHOH = g.hohId === g.humanId;
    const humanIsTieBreaker = humanIsHOH && !humanIsVoter && g.eviction.nominees.length === 2;
    
    // COMMIT 2: If human is NOT a voter (observer), skip all vote UI
    // EXCEPTION: If human is HOH and potential tie-breaker, show status message
    // Observers (nominated or HOH without tie-break) only see the diary room sequence
    if (!humanIsVoter && !humanIsTieBreaker) {
      console.info('[eviction] Human is observer (nominated or HOH), skipping all vote UI');
      // Use inline status instead of below-TV message
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('You are observing this vote.', 'muted');
      } else {
        panel.innerHTML = '<div class="minigame-host"><h3>Live Vote</h3><div class="tiny muted">You are observing this vote.</div></div>';
      }
      return;
    }
    
    // If human is HOH tie-breaker, show special status
    if (humanIsTieBreaker) {
      console.info('[eviction] Human is HOH tie-breaker, showing status');
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('You will break any tie as HOH.', 'info');
      } else {
        panel.innerHTML = '<div class="minigame-host"><h3>Live Vote</h3><div class="tiny info">You will break any tie as HOH.</div></div>';
      }
      return;
    }
    
    // If human is eligible voter and hasn't voted yet, show voting overlay directly
    if (humanIsVoter && !hasVoted) {
      // Ensure LiveVoteOverlay is available
      if (!global.LiveVoteOverlay) {
        console.error('[eviction] LiveVoteOverlay not available - module may not be loaded');
        if (global.TVInlineStatus?.set) {
          global.TVInlineStatus.set('Voting system unavailable. Please refresh the page.', 'error');
        } else {
          panel.innerHTML = '<div class="minigame-host"><h3>Live Vote</h3><div class="tiny error">Voting system unavailable. The voting overlay module (livevote-voteoverlay.js) may not be loaded. Please refresh the page.</div></div>';
        }
        return;
      }
      
      // Check if overlay is already open (prevents duplicate modals)
      const overlayOpen = global.LiveVoteOverlay?.isOpen?.() || false;
      
      if (overlayOpen) {
        console.debug('[eviction] Skipping overlay show: already open');
        return;
      }
      
      // Clear any lingering TV overlay content before showing vote UI
      try { 
        if (typeof global.clearTVOverlayContent === 'function') {
          global.clearTVOverlayContent(); 
        }
      } catch (e) { 
        console.warn('[LiveVote] clearTVOverlayContent failed', e); 
      }
      
      // COMMIT 4: Hide panel while overlay is open (use CSS class)
      if (panel) {
        panel.classList.add('voteOverlayOpen');
      }
      
      // Show Voting Overlay directly (no pre-vote modal)
      global.LiveVoteOverlay.show({
        nominees: g.eviction.nominees,
        isTieBreak: false,
        onSubmit: (selectedId) => {
          // Clear countdown timer using shared helper
          if (global.clearVoteCountdown) {
            global.clearVoteCountdown();
          }
          
          // Close all vote UI immediately
          if (global.closeAllVoteUI) {
            global.closeAllVoteUI();
          }
          
          // Clear any TV overlay content
          try {
            if (typeof global.clearTVOverlayContent === 'function') {
              global.clearTVOverlayContent();
            }
          } catch (e) {
            console.warn('[eviction] clearTVOverlayContent failed', e);
          }
          
          // Enter external overlay mode (hide lv2 children except stage)
          try {
            if (global.lv2?.enterExternalOverlayMode) {
              global.lv2.enterExternalOverlayMode();
            }
          } catch (e) {
            console.warn('[eviction] enterExternalOverlayMode failed', e);
          }
          
          // COMMIT 4: Restore panel visibility (remove CSS class)
          if (panel) {
            panel.classList.remove('voteOverlayOpen');
          }
          
          // Lock the vote
          lockHumanVote(selectedId);
          
          // Show rollout overlay to display remaining votes
          if (global.LiveVoteRollout) {
            const expectedVotes = voters.length;
            global.LiveVoteRollout.show({
              expectedVotes: expectedVotes,
              nominees: g.eviction.nominees
            });
            
            // Mark user vote as first vote in rollout
            const userPlayer = global.getP?.(g.humanId);
            const targetPlayer = global.getP?.(selectedId);
            if (userPlayer && targetPlayer) {
              global.LiveVoteRollout.addVote({
                voterId: g.humanId,
                voterName: userPlayer.name,
                targetId: selectedId,
                targetName: targetPlayer.name
              });
            }
          }
        }
      });
      
      // Start countdown immediately to align with HUD timer
      // Use same duration as phase timer (tVote) for synchronization
      const liveVoteSeconds = g.cfg?.tVote || 30;
      startVoteCountdown(liveVoteSeconds, g.eviction.nominees, voters);
      
      return;
    }

    // FEATURE FLAG: enableLiveVoteOverlayOnly
    // When TRUE (default): Skip all inline UI, use only full-screen overlay
    // When FALSE: Show legacy inline tally/voter list for rollback safety
    const overlayOnly = g.cfg?.enableLiveVoteOverlayOnly !== false;
    
    if (overlayOnly) {
      // OVERLAY-ONLY MODE: Show minimal confirmation message after voting
      // No inline tally, no voter list - everything happens in the overlay
      console.info('[eviction] enableLiveVoteOverlayOnly=true: Skipping inline UI');
      
      if (you && humanIsVoter && hasVoted) {
        // Human has voted - show confirmation only
        const votedName = global.safeName(g.__human_vote);
        const box = document.createElement('div'); 
        box.className = 'minigame-host';
        box.innerHTML = `<h3>Live Vote</h3>`;
        
        const ok = document.createElement('div'); 
        ok.className = 'tiny ok'; 
        ok.textContent = `Your vote is recorded: Evict ${votedName}.`;
        box.appendChild(ok);
        
        const info = document.createElement('div'); 
        info.className = 'tiny muted';
        info.style.marginTop = '6px';
        info.textContent = 'Votes are being cast...';
        box.appendChild(info);
        
        panel.appendChild(box);
      }
      // If human hasn't voted yet, the overlay is already shown - no panel content needed
      return;
    }
    
    // LEGACY MODE (overlayOnly=false): Show full inline UI
    // This is the rollback path - keeps old behavior with tally and voter list
    console.info('[eviction] enableLiveVoteOverlayOnly=false: Rendering inline UI');
    
    // FORCE LEGACY OVERLAY: Always use LiveVoteOverlay (useLv2 = false)
    // This prevents overlapping UI layers from lv2 and ensures compact, mobile-friendly layout
    // The LiveVoteOverlay provides a consistent experience across all devices
    const useLv2 = false; // DO NOT CHANGE: lv2 is permanently disabled

    const box=document.createElement('div'); box.className='minigame-host'; 
    if (!useLv2) {
      box.innerHTML='<h3>Live Vote</h3>';
    }
    const remain=global.alivePlayers().length;

    const info=document.createElement('div'); info.className='tiny';
    info.textContent=`Nominees: ${global.fmtList(g.eviction.nominees)}. HOH: ${global.safeName(g.hohId)}${remain===4?' (does not vote at Final 4)':' (votes in tie only)'}.`;
    box.appendChild(info);

    const list=document.createElement('div'); list.className='tiny muted'; list.style.marginTop='6px';
    list.textContent=`Voters: ${voters.length? voters.map(p=>p.name).join(', ') : 'none'}`;
    box.appendChild(list);

    if(remain===4){
      const note=document.createElement('div'); note.className='tiny warn';
      note.textContent='Final 4: The Veto winner casts the sole vote to evict.';
      box.appendChild(note);
    }

    // Live tally (handles 2 or >2 automatically) - only show if NOT using lv2
    if (!useLv2) {
      if(g.eviction.nominees.length===2){
        const [A,B]=g.eviction.nominees;
        const tally=document.createElement('div');
        tally.innerHTML=`
          <div class="tiny" style="margin-top:8px;margin-bottom:4px">Live Tally</div>
          <div style="display:flex; gap:8px; align-items:flex-end">
            <div class="lvCol">
              <div class="tiny muted" id="lvNameA">${global.safeName(A)}</div>
              <div class="lvBarWrap"><div id="lvBarA" class="lvBar"></div></div>
              <div class="tiny" id="lvCountA">0</div>
            </div>
            <div class="lvCol">
              <div class="tiny muted" id="lvNameB">${global.safeName(B)}</div>
              <div class="lvBarWrap"><div id="lvBarB" class="lvBar alt"></div></div>
              <div class="tiny" id="lvCountB">0</div>
            </div>
          </div>`;
        box.appendChild(tally);
      } else {
        const hdr=document.createElement('div');
        hdr.className='tiny'; hdr.style.margin='8px 0 4px';
        hdr.textContent='Live Tally';
        box.appendChild(hdr);
        const ul=document.createElement('ul'); ul.id='lvMultiList'; ul.className='tiny';
        g.eviction.nominees.forEach(id=>{
          const li=document.createElement('li'); li.dataset.candId=String(id);
          li.textContent=`${global.safeName(id)} — 0`;
          ul.appendChild(li);
        });
        box.appendChild(ul);
      }

      // Voter checklist
      const ul=document.createElement('ul'); ul.id='liveVoteList'; ul.className='tiny'; ul.style.marginTop='6px';
      voters.forEach(v=>{
        const li=document.createElement('li'); li.dataset.voterId=String(v.id);
        li.textContent=`${v.name} — waiting`;
        ul.appendChild(li);
      });
      box.appendChild(ul);
    }

    // Show post-vote confirmation if human has voted
    // NOTE: Inline voting buttons/select have been removed - voting now happens exclusively via LiveVoteOverlay
    // This ensures a consistent, mobile-friendly voting experience without overlap/scroll issues
    if(you && humanIsVoter && hasVoted){
      const votedName = global.safeName(g.__human_vote);
      const ok=document.createElement('div'); 
      ok.className='tiny ok'; 
      ok.textContent=`Your vote is recorded: Evict ${votedName}.`;
      box.appendChild(ok);
    }

    panel.appendChild(box);
  }
  global.renderLiveVotePanel=renderLiveVotePanel;

  /* ----- Tally Helpers ----- */
  function updateLiveVoteGraph(aCount,bCount){
    const total=aCount+bCount;
    const barA=document.getElementById('lvBarA');
    const barB=document.getElementById('lvBarB');
    const countA=document.getElementById('lvCountA');
    const countB=document.getElementById('lvCountB');
    if(barA) barA.style.width=total? ((aCount/total)*100).toFixed(1)+'%':'0%';
    if(barB) barB.style.width=total? ((bCount/total)*100).toFixed(1)+'%':'0%';
    if(countA) countA.textContent=String(aCount);
    if(countB) countB.textContent=String(bCount);
  }
  function updateLiveVoteMulti(counts){
    const ul=document.getElementById('lvMultiList'); if(!ul) return;
    ul.querySelectorAll('li').forEach(li=>{
      const id=+li.dataset.candId;
      li.textContent=`${global.safeName(id)} — ${counts.get(id)||0}`;
    });
  }

  /* ----- Voting Logic ----- */
  function lockHumanVote(targetId){
    const g=global.game;
    if(g.__human_vote!=null) return;
    g.__human_vote=targetId;
    const idx=(g.eviction.planned||[]).findIndex(p=>p.voter===g.humanId);
    if(idx>=0) g.eviction.planned[idx].evict=targetId;
    global.addLog?.(`You voted to evict ${global.safeName(targetId)}.`,'ok');
    try{ renderLiveVotePanel(); }catch{}
    try{ window.dispatchEvent(new CustomEvent('bb:livevote:humanVoted', { detail: { targetId } })); }catch{}
  }

  function eligibleVoters(){
    const g=global.game;
    const remain=global.alivePlayers().length;
    if(remain===4){
      const holder=global.getP(g.vetoHolder);
      if(holder && !g.eviction.nominees.includes(holder.id)) return [holder];
      return global.alivePlayers().filter(p=>p.id!==g.hohId && !g.eviction.nominees.includes(p.id)).slice(0,1);
    }
    return global.alivePlayers().filter(p=>p.id!==g.hohId && !g.eviction.nominees.includes(p.id));
  }

  function voteFor2(voterId,[a,b]){
    const va=(global.getP(voterId).affinity[a]??0), vb=(global.getP(voterId).affinity[b]??0);
    if(va<vb-0.05) return a; if(vb<va-0.05) return b;
    const ta=global.getP(a).threat||0.5, tb=global.getP(b).threat||0.5;
    return ta>tb? a : b;
  }
  function voteForMulti(voterId,candidates){
    let bestId=null, bestScore=Infinity;
    for(const id of candidates){
      const rel=(global.getP(voterId).affinity[id] ?? 0);
      const threat=global.getP(id)?.threat ?? 0.5;
      const score=rel - 0.06*threat;
      if(score<bestScore){ bestScore=score; bestId=id; }
    }
    return bestId ?? candidates[0];
  }

  function waitForHumanVote(){
    const g=global.game||{};
    return new Promise(resolve=>{
      if(g.__human_vote!=null) return resolve();
      const handler=()=>{ window.removeEventListener('bb:livevote:humanVoted', handler); resolve(); };
      window.addEventListener('bb:livevote:humanVoted', handler, { once:true });
    });
  }

  /* ----- 30-Second Auto-Vote Countdown ----- */
  function startVoteCountdown(seconds, nominees, voters){
    const g = global.game;
    if(!g || !g.eviction) return;
    
    // COMMIT 2: Only run countdown for eligible voters
    const humanIsVoter = voters.some(v => v.id === g.humanId);
    if (!humanIsVoter) {
      console.debug('[eviction] Skipping countdown: human is observer');
      return;
    }
    
    // Clear any existing countdown first (idempotent)
    if(global.clearVoteCountdown){
      global.clearVoteCountdown();
    }
    
    let timeLeft = seconds;
    
    // No UI timer in overlay - central HUD timer is the single source of truth
    // This countdown logic handles auto-vote only
    
    // Set up interval to track remaining time
    g.eviction._countdownInterval = setInterval(() => {
      timeLeft--;
      
      if(timeLeft <= 0){
        clearInterval(g.eviction._countdownInterval);
        g.eviction._countdownInterval = null;
      }
    }, 1000);
    
    // Set up timeout for auto-vote
    g.eviction._countdownTimeout = setTimeout(() => {
      // Check if human has already voted
      if(g.__human_vote != null) {
        return;
      }
      
      console.info('[Eviction] Auto-voting: time expired');
      
      // Compute auto-pick based on affinity/threat logic
      let autoPick;
      if(nominees.length === 2){
        autoPick = voteFor2(g.humanId, nominees);
      } else {
        autoPick = voteForMulti(g.humanId, nominees);
      }
      
      // Close all vote UI
      if(global.closeAllVoteUI){
        global.closeAllVoteUI();
      }
      
      // Lock the auto-vote
      lockHumanVote(autoPick);
      
      // COMMIT 2: Show rollout only for voters (not observers)
      if(global.LiveVoteRollout && humanIsVoter){
        const expectedVotes = voters.length;
        global.LiveVoteRollout.show({
          expectedVotes: expectedVotes,
          nominees: nominees
        });
        
        // Mark user auto-vote as first vote in rollout
        const userPlayer = global.getP?.(g.humanId);
        const targetPlayer = global.getP?.(autoPick);
        if(userPlayer && targetPlayer){
          global.LiveVoteRollout.addVote({
            voterId: g.humanId,
            voterName: userPlayer.name,
            targetId: autoPick,
            targetName: targetPlayer.name
          });
        }
      }
      
      global.addLog?.(`Auto-voted to evict ${global.safeName(autoPick)} (time expired).`, 'warn');
    }, seconds * 1000);
  }

  // Helper to show diary room card with avatars (Issue #5)
  function showDiaryRoomWithAvatars(voterId, targetId, message, duration=3000){
    const voter = global.getP?.(voterId);
    const target = global.getP?.(targetId);
    if(!voter || !target) {
      global.showCard?.('Diary Room', [message], 'live', duration, true);
      return;
    }

    // Get avatars with fallback
    const voterAvatar = global.resolveAvatar?.(voter) || voter.avatar || 
      getDicebearUrl(voter.name);
    const targetAvatar = global.resolveAvatar?.(target) || target.avatar || 
      getDicebearUrl(target.name);

    // Get or create TV overlay container
    let tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay){
      const tv = document.getElementById('tv');
      if(!tv) {
        console.warn('[DiaryRoom] TV element not found, falling back to showCard');
        global.showCard?.('Diary Room', [message], 'live', duration, true);
        return;
      }
      tvOverlay = document.createElement('div');
      tvOverlay.id = 'tvOverlay';
      tv.appendChild(tvOverlay);
    }

    // Ensure TV grows to accommodate card
    const tv = document.getElementById('tv');
    if(tv) tv.classList.add('tvTall');

    // Create custom card with avatars - positioned within tvOverlay
    const card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard';
    card.style.cssText = `
      background: linear-gradient(135deg, #1c2b3e, #0e1a28);
      border: 2px solid rgba(120,180,240,0.5);
      border-radius: 20px;
      padding: 24px 28px;
      box-shadow: 0 24px 64px -24px rgba(0,0,0,0.95), 0 8px 24px -8px rgba(0,0,0,0.7);
      max-width: min(480px, 92%);
      width: 100%;
      text-align: center;
      pointer-events: auto;
      margin: auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'Diary Room';
    title.style.cssText = 'font-size: 1.2rem; font-weight: 700; color: #ffd96b; margin-bottom: 18px; text-shadow: 0 2px 8px rgba(255,217,107,0.3);';
    card.appendChild(title);

    const avatarRow = document.createElement('div');
    avatarRow.style.cssText = 'display: flex; justify-content: center; align-items: center; margin-bottom: 18px; gap: 16px;';

    // Voter avatar with container div for proper aspect ratio handling
    const voterContainer = document.createElement('div');
    voterContainer.style.cssText = `
      width: clamp(64px, 16vw, 88px); 
      height: clamp(64px, 16vw, 88px); 
      border-radius: 50%; 
      border: 3px solid #7cffad; 
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(124,255,173,0.4), 0 0 0 1px rgba(124,255,173,0.2);
      flex-shrink: 0;
    `;
    
    const voterImg = document.createElement('img');
    voterImg.src = voterAvatar;
    voterImg.alt = voter.name;
    voterImg.onerror = function(){
      console.warn(`[avatar] failed to load url=${this.src} player=${voter.name}`);
      this.onerror=null;
      this.src=getDicebearUrl(voter.name);
    };
    voterImg.style.cssText = `
      width: 100%; 
      height: 100%; 
      object-fit: cover;
      display: block;
    `;
    voterContainer.appendChild(voterImg);

    const arrow = document.createElement('div');
    arrow.textContent = '→';
    arrow.style.cssText = 'font-size: clamp(1.8rem, 4.5vw, 2.4rem); color: #ff6b6b; font-weight: 700; flex-shrink: 0; text-shadow: 0 2px 8px rgba(255,107,107,0.5);';

    // Target avatar with container div for proper aspect ratio handling
    const targetContainer = document.createElement('div');
    targetContainer.style.cssText = `
      width: clamp(64px, 16vw, 88px); 
      height: clamp(64px, 16vw, 88px); 
      border-radius: 50%; 
      border: 3px solid #ff6b6b; 
      overflow: hidden;
      box-shadow: 0 6px 16px rgba(255,107,107,0.4), 0 0 0 1px rgba(255,107,107,0.2);
      flex-shrink: 0;
    `;
    
    const targetImg = document.createElement('img');
    targetImg.src = targetAvatar;
    targetImg.alt = target.name;
    targetImg.onerror = function(){
      console.warn(`[avatar] failed to load url=${this.src} player=${target.name}`);
      this.onerror=null;
      this.src=getDicebearUrl(target.name);
    };
    targetImg.style.cssText = `
      width: 100%; 
      height: 100%; 
      object-fit: cover;
      display: block;
    `;
    targetContainer.appendChild(targetImg);

    avatarRow.appendChild(voterContainer);
    avatarRow.appendChild(arrow);
    avatarRow.appendChild(targetContainer);
    card.appendChild(avatarRow);

    const messageDiv = document.createElement('div');
    messageDiv.textContent = message;
    messageDiv.style.cssText = 'font-size: clamp(0.9rem, 2.2vw, 1.05rem); color: #e8f4ff; line-height: 1.5; font-weight: 500;';
    card.appendChild(messageDiv);

    // Clear any existing content and append new card
    tvOverlay.innerHTML = '';
    tvOverlay.appendChild(card);
    tvOverlay.style.visibility = '';

    // Auto-remove after duration
    setTimeout(() => {
      try{ 
        card.remove(); 
        if(tv && tvOverlay && tvOverlay.children.length === 0){
          tv.classList.remove('tvTall');
        }
      }catch{}
    }, duration);
  }

  /* ----- Diary Room Sequence (Animated / Per Voter) ----- */
  async function beginDiaryRoomSequence(){
    const g=global.game; if(!g) return;
    if(g.eviction.sequenceStarted) return;
    g.eviction.sequenceStarted=true;

    const noms=g.eviction.nominees.slice();
    const twoMode = noms.length===2;
    // FORCE LEGACY OVERLAY: Always use LiveVoteOverlay (useLv2 = false)
    // DO NOT CHANGE: lv2 is permanently disabled
    const useLv2 = false;
    const tripleMode = noms.length === 3;
    let tallyA=0, tallyB=0;
    const counts = new Map(noms.map(id=>[id,0]));
    
    // Do NOT tear down LV2 overlay during diary sequence
    // If LV2 is active, keep it visible so voter chips can render in real time
    if (!useLv2) {
      // Only close vote UI if NOT using LV2
      if (global.closeAllVoteUI) {
        console.info('[eviction] Closing all vote UI before diary room sequence');
        global.closeAllVoteUI();
      }
    } else {
      console.debug('[eviction] LV2 active — keeping overlay during diary sequence');
    }
    
    // Hide CTA bar when voting phase begins (issue #574)
    if (useLv2 && global.lv2?.hideCtaBar) {
      global.lv2.hideCtaBar();
    }
    // Hide triple CTAs if using triple UI
    if (tripleMode && global.lv2?.hideCtasTriple) {
      global.lv2.hideCtasTriple();
    }

    function markVoter(vId,text){
      const li=document.querySelector(`#liveVoteList li[data-voter-id="${vId}"]`);
      if(li) li.textContent=`${global.safeName(vId)} — ${text}`;
    }

    for(let i=0;i<(g.eviction.planned||[]).length;i++){
      const entry=g.eviction.planned[i];

      // Pause on human turn until they actually vote (no auto vote)
      if(entry.voter===g.humanId && entry.evict==null){
        markVoter(entry.voter,'your turn…');
        if(!useLv2){ global.showCard?.('Diary Room',["It's your turn. Please cast your vote now."],'live',2000,true); } else{ global.lv2?.setTurn?.(true); }
        try{ await waitForHumanVote(); }catch{}
        entry.evict = g.__human_vote;
        if(useLv2){ global.lv2?.setTurn?.(false); }
      }

      const pick=entry.evict;
      const nameV=global.safeName(entry.voter), namePick=global.safeName(pick);
      markVoter(entry.voter,'voting…');
      
      // Issue #5: Show diary room with avatars (legacy) OR push vote to LV2
      if(!useLv2){ 
        showDiaryRoomWithAvatars(entry.voter, pick, `${nameV}: I vote to evict ${namePick}.`, 3000);
        await sleep(3000);
      } else { 
        // LV2 path: Push vote to show voter chip and update counts
        if(global.lv2?.pushVote){
          // leftId is first nominee (left position in LV2 UI)
          // Compare pick with leftId to determine 'left' or 'right' vote attribution
          const [leftId] = noms;
          const votePick = pick === leftId ? 'left' : 'right';
          global.lv2.pushVote({
            voterId: entry.voter,
            voterName: nameV,
            pick: votePick
          });
        }
        await sleep(1500); // Wait for LV2 to process vote
      }
      try{ await global.cardQueueWaitIdle?.(); }catch{}
      
      // Hook: Push vote to rollout overlay if it's showing
      if(global.LiveVoteRollout?.isShowing?.()){
        global.LiveVoteRollout.addVote({
          voterId: entry.voter,
          voterName: nameV,
          targetId: pick,
          targetName: namePick
        });
      }

      if(twoMode){
        const [A,B]=noms;
        if(pick===A) tallyA++; else tallyB++;
        // Only update legacy graph when NOT using LV2 (LV2 handles counts internally)
        if(!useLv2) {
          updateLiveVoteGraph(tallyA,tallyB);
        }
      } else {
        counts.set(pick,(counts.get(pick)||0)+1);
        // Multi-nominee legacy list - no LV2 for 3+ nominees, always update
        updateLiveVoteMulti(counts);
      }
      markVoter(entry.voter,`voted (${namePick})`);
      await sleep(180);
    }

    g.eviction.sequenceDone=true;

    // Hook: Hide rollout overlay before showing result
    if(global.LiveVoteRollout?.isShowing?.()){
      global.LiveVoteRollout.hide();
    }

    // Hook: Mark lv2 as finished
    if(twoMode && global.lv2?.finish){
      global.lv2.finish();
    }

    if(twoMode) await revealVotes(true,tallyA,tallyB);
    else await revealVotes(true,counts);
  }
  global.beginDiaryRoomSequence=beginDiaryRoomSequence;

  /* ----- Tie Break (2 noms) ----- */
  async function tieBreakTwo([a,b],ca,cb){
    const g=global.game;
    // FORCE LEGACY OVERLAY: Always use LiveVoteOverlay (useLv2 = false)
    // DO NOT CHANGE: lv2 is permanently disabled
    const useLv2 = false;
    const hoh=global.getP(global.game.hohId);
    
    if (!useLv2) {
      global.showCard('Tiebreak',['We have a tie! The HOH must break it.'],'live',3000,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
    } else {
      // Show in-TV tie message
      const status = document.querySelector('.lv2-status');
      if (status) {
        status.textContent = 'Tie! HOH must break it.';
        status.classList.remove('muted');
        status.classList.add('warn');
      }
      await sleep(2000);
    }
    
    // Hook: Log XP for tiebreaker
    if(global.ProgressionEvents?.onTiebreakerWin){
      global.ProgressionEvents.onTiebreakerWin(hoh.id);
    }
    
    if(hoh?.human){
      // Show rollout overlay for HOH tie-break (expected=1)
      if (global.LiveVoteRollout && !useLv2) {
        global.LiveVoteRollout.show({
          expectedVotes: 1,
          nominees: [a, b]
        });
      }
      
      const pick = await awaitHumanTieBreakPick([a,b],'Tiebreak — Choose who to evict',useLv2);
      if(pick===a) ca++; else cb++;
      
      // Push HOH tie-break vote to LV2 feed if active
      if (useLv2) {
        try {
          // Note: a and b come from g.eviction.nominees array in order, matching LV2 init
          // a is leftId (index 0), b is rightId (index 1)
          const side = pick === a ? 'left' : 'right';
          global.lv2?.pushVote?.({
            voterId: hoh.id,
            voterName: hoh.name,
            pick: side
          });
          await sleep(1500); // Wait for chip to appear
        } catch (e) {
          console.warn('[eviction] lv2.pushVote failed for HOH tie-break:', e);
        }
      }
      
      // Add HOH vote to rollout
      if (global.LiveVoteRollout?.isShowing?.()) {
        global.LiveVoteRollout.addVote({
          voterId: hoh.id,
          voterName: hoh.name,
          targetId: pick,
          targetName: global.safeName(pick)
        });
        
        // Hide rollout after showing HOH vote
        await sleep(1500);
        global.LiveVoteRollout.hide();
      }
      
      if (!useLv2) {
        global.showCard('HOH',[`${hoh.name}: I choose to evict ${global.safeName(pick)}.`],'live',3000,true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
      }
      return {evId:pick,ca,cb};
    }
    const ha=(hoh.affinity[a]??0), hb=(hoh.affinity[b]??0);
    const evId = ha < hb ? a : b;
    
    // Push AI HOH tie-break vote to LV2 feed if active
    if (useLv2) {
      try {
        // Note: a and b come from g.eviction.nominees array in order, matching LV2 init
        // a is leftId (index 0), b is rightId (index 1)
        const side = evId === a ? 'left' : 'right';
        global.lv2?.pushVote?.({
          voterId: hoh.id,
          voterName: hoh.name,
          pick: side
        });
        await sleep(1500); // Wait for chip to appear
      } catch (e) {
        console.warn('[eviction] lv2.pushVote failed for AI HOH tie-break:', e);
      }
    }
    
    if (!useLv2) {
      global.showCard('HOH',[`${hoh.name}: I choose to evict ${global.safeName(evId)}.`],'live',3000,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
    }
    if(evId===a) ca++; else cb++;
    return {evId,ca,cb};
  }

  function awaitHumanTieBreakPick(cIds,title,useLv2=false){
    return new Promise(resolve=>{
      let resolved = false;
      
      // Safety timeout: auto-resolve if human doesn't pick within timeout period
      const timeoutHandle = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          console.warn(`[tie-break] ⏱️ ${TIE_BREAK_TIMEOUT_MS/1000}s timeout - auto-resolving tie-break using affinity`);
          
          // Close any open UI
          if (global.closeAllVoteUI) {
            global.closeAllVoteUI();
          }
          
          // Auto-resolve using HOH affinity (lowest affinity gets evicted)
          const g = global.game;
          const hoh = global.getP(g.hohId);
          if (hoh && cIds.length >= 2) {
            const affinities = cIds.map(id => ({ id, aff: hoh.affinity[id] ?? 0 }));
            affinities.sort((a, b) => a.aff - b.aff);
            const autoEvict = affinities[0].id;
            console.info(`[tie-break] Auto-resolved to evict ${global.safeName(autoEvict)} (lowest affinity: ${affinities[0].aff.toFixed(2)})`);
            resolve(autoEvict);
          } else {
            // Fallback: first nominee
            resolve(cIds[0]);
          }
        }
      }, TIE_BREAK_TIMEOUT_MS);
      
      const safeResolve = (pickId) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutHandle);
          resolve(pickId);
        }
      };
      
      try{
        // Check if two-step overlay is available
        if (global.LiveVoteOverlay && !useLv2) {
          // Use two-step voting overlay for tie-break
          global.LiveVoteOverlay.show({
            nominees: cIds,
            isTieBreak: true,
            onSubmit: (pickId) => {
              // Close all vote UI immediately before resolving
              if (global.closeAllVoteUI) {
                global.closeAllVoteUI();
              }
              safeResolve(pickId);
            }
          });
        } else if (useLv2 && global.lv2?.createCtaBar) {
          // Use lv2 CTA bar for tiebreak
          const [leftId, rightId] = cIds;
          global.lv2.createCtaBar({
            enabled: true,
            isTieBreak: true,
            leftName: global.safeName(leftId),
            rightName: global.safeName(rightId),
            leftId: leftId,
            rightId: rightId,
            onVote: (pickId) => {
              global.lv2.updateCtaBar({ enabled: false });
              safeResolve(pickId);
            }
          });
        } else {
          // Legacy panel UI
          const panel=document.querySelector('#panel');
          const host=panel?.querySelector('.minigame-host')||panel||document.body;
          const box=document.createElement('div'); box.className='col'; box.style.marginTop='8px';
          const h=document.createElement('div'); h.className='tiny'; h.textContent=title||'Tiebreak';
          const row=document.createElement('div'); row.className='row'; row.style.marginTop='6px';
          cIds.forEach(id=>{
            const b=document.createElement('button'); b.className='btn danger'; b.textContent=`Evict ${global.safeName(id)}`;
            b.onclick=()=>{ cleanup(); safeResolve(id); };
            row.appendChild(b);
          });
          box.appendChild(h); box.appendChild(row); host.appendChild(box);
          function cleanup(){ try{ row.querySelectorAll('button').forEach(btn=>btn.disabled=true); box.remove(); }catch{} }
        }
      }catch(e){ 
        safeResolve(cIds[0]); 
      }
    });
  }

  /* ----- Reveal Votes (2 or multi) ----- */
  async function revealVotes(alreadyTallied=false, preAorCounts=0, preB=0){
    const g=global.game;
    if(!g.eviction) return;
    if(g.eviction.revealed || g.eviction.revealing) return;
    g.eviction.revealing=true;

    const noms=g.eviction.nominees.slice();
    const twoMode = noms.length===2;
    // FORCE LEGACY OVERLAY: Always use LiveVoteOverlay (useLv2 = false)
    // DO NOT CHANGE: lv2 is permanently disabled
    const useLv2 = false;

    if(twoMode){
      let ca=preAorCounts, cb=preB;
      if(!alreadyTallied){
        g.eviction.votes=[];
        const voters=eligibleVoters();
        for(const v of voters){
          if(v.id===g.humanId){
            // Require manual vote; if still not present, wait here
            if(g.__human_vote==null){
              try{ await waitForHumanVote(); }catch{}
            }
            const target=g.__human_vote;
            g.eviction.votes.push({voter:v.id,evict:target});
          } else {
            g.eviction.votes.push({voter:v.id,evict:voteFor2(v.id,noms)});
          }
        }
        const [a,b]=noms; const tally=new Map([[a,0],[b,0]]);
        g.eviction.votes.forEach(v=>tally.set(v.evict,(tally.get(v.evict)||0)+1));
        ca=tally.get(noms[0])||0; cb=tally.get(noms[1])||0;
        updateLiveVoteGraph(ca,cb);
      }
      const [a,b]=noms;
      let evId, finalA=ca, finalB=cb;
      if(ca===cb){
        const res=await tieBreakTwo([a,b],ca,cb);
        evId=res.evId; finalA=res.ca; finalB=res.cb;
      } else evId = (ca>cb? a : b);

      const evName=global.safeName(evId);
      
      // Store vote summary for use in handleEvictionLegacy
      const tally = new Map([[a, finalA], [b, finalB]]);
      g.eviction.voteSummary = buildVoteSummary(noms, tally);
      
      // Set guard flag to prevent duplicate result cards in handleEvictionLegacy
      g.eviction.__resultCardShown = true;
      
      if (!useLv2) {
        // Use new eviction modal for better visibility (not clipped by TV overlay)
        if (typeof global.EvictionModal?.show === 'function') {
          await global.EvictionModal.show({
            title: 'Eviction Result',
            lines: [`By a vote of ${finalA} to ${finalB}, ${evName}, ${pickEvictionPhrase()}`],
            tone: 'evict',
            duration: 3800
          });
        } else {
          // Fallback to old card system if modal not loaded
          global.showCard('Eviction Result',[`By a vote of ${finalA} to ${finalB}, ${evName}, ${pickEvictionPhrase()}`],'evict',3800,true);
          try{ await global.cardQueueWaitIdle?.(); }catch{}
        }
      } else {
        // LV2 Result Sequence:
        // 1. Begin result card phase (fade nominees/feed, manage z-index)
        global.lv2?.beginResultCardPhase?.();
        
        // 2. Show result: prioritize inline card for mobile/narrow, viewport modal for desktop
        if (global.lv2?.supportsInlineCard?.()) {
          // Mobile/narrow: Inline card within TV that respects safe areas
          await global.lv2.showInlineCard({
            title: 'Eviction Result',
            body: [`By a vote of ${finalA} to ${finalB}, ${evName} has been evicted.`],
            duration: 3600,
            tone: 'evict'
          });
        } else if (typeof global.EvictionModal?.show === 'function') {
          // Desktop/wide: Viewport-level modal (escapes TV clipping)
          await global.EvictionModal.show({
            title: 'Eviction Result',
            lines: [`By a vote of ${finalA} to ${finalB}, ${evName} has been evicted.`],
            tone: 'evict',
            duration: 3600
          });
        } else {
          // Fallback: Legacy page-level card system
          global.showCard('Eviction Result',[`By a vote of ${finalA} to ${finalB}, ${evName}, ${pickEvictionPhrase()}`],'evict',3800,true);
          try{ await global.cardQueueWaitIdle?.(); }catch{}
        }
        
        // 3. End result card phase (restore overlay z-index)
        global.lv2?.endResultCardPhase?.();
        
        // Note: Avatar animation now handled by runEvictionVisual in handleEvictionLegacy
        // Removed lv2.showEvicteeFinal to prevent duplicate animations (regression fix)
      }
      
      global.addLog?.(`Evicted: ${evName} (${finalA}–${finalB}).`,'danger');
      g.eviction.revealed=true; g.eviction.revealing=false; g.eviction.evicted=evId;
      
      // Hook: Log XP for eviction events
      if(global.ProgressionEvents){
        // Log votes against for evicted player
        const evictedVotes = Math.max(finalA, finalB);
        if(global.ProgressionEvents.onEvictionVotes) global.ProgressionEvents.onEvictionVotes(evId, evictedVotes);
        
        // Log survivor XP for the other nominee
        const survivorId = (evId === a) ? b : a;
        if(global.ProgressionEvents.onSurviveEviction) global.ProgressionEvents.onSurviveEviction(survivorId);
        
        // Log correct votes for majority voters
        const majorityTarget = evId;
        if(global.ProgressionEvents.onCorrectVote){
          g.eviction.votes.forEach(v => {
            if(v.evict === majorityTarget){
              global.ProgressionEvents.onCorrectVote(v.voter);
            }
          });
        }
      }
      
      // Clean up any remaining vote UI
      if (global.closeAllVoteUI) {
        global.closeAllVoteUI();
      }
      
      setTimeout(()=>finalizeEviction(),220);
    } else {
      let counts=preAorCounts;
      if(!alreadyTallied || !(counts instanceof Map)){
        counts=new Map(noms.map(id=>[id,0]));
        g.eviction.votes=[];
        const voters=eligibleVoters();
        for(const v of voters){
          if(v.id===g.humanId){
            if(g.__human_vote==null){
              try{ await waitForHumanVote(); }catch{}
            }
            const target=g.__human_vote;
            g.eviction.votes.push({voter:v.id,evict:target});
          } else g.eviction.votes.push({voter:v.id,evict:voteForMulti(v.id,noms)});
        }
        g.eviction.votes.forEach(v=>counts.set(v.evict,(counts.get(v.evict)||0)+1));
        updateLiveVoteMulti(counts);
      }

      const K = (g.__twistMode==='double')?2: (g.__twistMode==='triple')?3:1;

      if(K<=1){
        const sorted=[...counts.entries()].sort((a,b)=>b[1]-a[1]);
        const top=sorted.length?sorted[0][1]:0;
        const topIds=sorted.filter(([_,c])=>c===top).map(([id])=>id);
        let evId;
        if(topIds.length>1){
          // HOH tiebreak among multiple
          const hoh=global.getP(g.hohId);
          if(hoh?.human){
            const pick=await awaitHumanTieBreakPick(topIds,'Tiebreak — Select single eviction');
            counts.set(pick,(counts.get(pick)||0)+1);
            evId=pick;
          } else {
            // AI HOH breaks tie by lower affinity
            const pick=pickByHohAffinity(hoh, topIds);
            counts.set(pick,(counts.get(pick)||0)+1);
            evId=pick;
          }
        } else evId=topIds[0];
        const parts=noms.map(id=>`${global.safeName(id)} ${counts.get(id)||0}`).join(' — ');
        
        // Set guard flag to prevent duplicate result cards
        g.eviction.__resultCardShown = true;
        
        // Use new eviction modal for better visibility
        if (typeof global.EvictionModal?.show === 'function') {
          await global.EvictionModal.show({
            title: 'Eviction Result',
            lines: [`Votes: ${parts}`, `${global.safeName(evId)}, ${pickEvictionPhrase()}`],
            tone: 'evict',
            duration: 3800
          });
        } else {
          // Fallback to old card system
          global.showCard('Eviction Result',[`Votes: ${parts}`,`${global.safeName(evId)}, ${pickEvictionPhrase()}`],'evict',3800,true);
          try{ await global.cardQueueWaitIdle?.(); }catch{}
        }
        global.addLog?.(`Evicted: ${global.safeName(evId)}. Votes — ${parts}`,'danger');
        g.eviction.revealed=true; g.eviction.revealing=false; g.eviction.evicted=evId;
        
        // Clean up any remaining vote UI
        if (global.closeAllVoteUI) {
          global.closeAllVoteUI();
        }
        
        setTimeout(()=>finalizeEviction(),220);
        return;
      }

      // Multi (double/triple) eviction with cutoff tie detection
      const result = determineMultiEvictees(counts, K, noms);
      
      let finalEvictees;
      if(result.tie){
        // Cutoff tie detected - HOH must break it
        console.info(`[eviction] Cutoff tie detected: ${result.tiedPlayers.length} players tied at ${result.cutoffVotes} votes`);
        
        const slotsRemaining = K - result.confirmedEvictees.length;
        finalEvictees = await handleMultiEvictCutoffTie(
          result.tiedPlayers,
          result.confirmedEvictees,
          slotsRemaining,
          counts
        );
      } else {
        // No tie, proceed with determined evictees
        finalEvictees = result.evictees;
      }

      await multiEvictFinalize(finalEvictees, counts, K);
    }
  }

  /**
   * Determine evictees for multi-eviction, checking for cutoff ties
   * @param {Map<number,number>} counts - Vote counts per nominee
   * @param {number} evictCount - Number of players to evict (K)
   * @param {Array<number>} nominees - All nominee IDs
   * @returns {Object} { tie: boolean, evictees?: Array, tiedPlayers?: Array, cutoffVotes?: number }
   */
  function determineMultiEvictees(counts, evictCount, nominees){
    if(!counts || !(counts instanceof Map) || evictCount < 1 || !Array.isArray(nominees)){
      return { tie: false, evictees: [] };
    }

    // Sort nominees by votes DESC, then by ID for determinism
    const sorted = [...counts.entries()]
      .sort((a, b) => {
        // Sort by votes descending
        if(b[1] !== a[1]) return b[1] - a[1];
        // Tiebreak by ID ascending for determinism
        return a[0] - b[0];
      });

    // If fewer nominees than evictCount, evict all
    if(sorted.length <= evictCount){
      return { tie: false, evictees: sorted.map(([id]) => id) };
    }

    // Get top K nominees
    const topK = sorted.slice(0, evictCount);
    const cutoffVotes = topK[evictCount - 1][1]; // Votes of last evictee

    // Check if any nominees OUTSIDE top K have the same vote count as cutoff
    const outsideTopK = sorted.slice(evictCount);
    const tiedOutside = outsideTopK.filter(([_, votes]) => votes === cutoffVotes);

    if(tiedOutside.length > 0){
      // Cutoff tie detected
      // Collect all nominees at cutoff vote level (inside and outside top K)
      const allAtCutoff = sorted.filter(([_, votes]) => votes === cutoffVotes);
      
      return {
        tie: true,
        tiedPlayers: allAtCutoff.map(([id]) => id),
        cutoffVotes: cutoffVotes,
        // Also return the non-tied evictees (those with more votes than cutoff)
        confirmedEvictees: topK.filter(([_, votes]) => votes > cutoffVotes).map(([id]) => id)
      };
    }

    // No tie, return top K
    return { tie: false, evictees: topK.map(([id]) => id) };
  }

  function pickByHohAffinity(hoh, candidates){
    if(!hoh || !Array.isArray(candidates) || !candidates.length) return candidates[0];
    let best=null, bestRel=Infinity;
    for(const id of candidates){
      const rel=(hoh.affinity?.[id]??0);
      if(rel<bestRel){ bestRel=rel; best=id; }
    }
    return best ?? candidates[0];
  }

  /**
   * Handle cutoff tie in multi-eviction scenario
   * @param {Array<number>} tiedPlayers - Players tied at cutoff vote count
   * @param {Array<number>} confirmedEvictees - Players already confirmed for eviction
   * @param {number} slotsRemaining - Number of remaining eviction slots to fill
   * @param {Map<number,number>} counts - Vote counts
   * @returns {Promise<Array<number>>} - Final list of all evictees
   */
  async function handleMultiEvictCutoffTie(tiedPlayers, confirmedEvictees, slotsRemaining, counts){
    const g = global.game;
    const hoh = global.getP(g.hohId);
    const useLv2 = false; // Keep consistent with rest of eviction.js
    
    // Show tie message
    const tiedNames = tiedPlayers.map(id => global.safeName(id)).join(', ');
    const msg = `Tie at cutoff! The HOH must choose ${slotsRemaining} of: ${tiedNames}`;
    
    if (!useLv2) {
      global.showCard('Multi-Eviction Tiebreak', [msg], 'live', 3000, true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
    }
    
    console.info(`[eviction] Multi-eviction cutoff tie: ${slotsRemaining} slots, ${tiedPlayers.length} tied players`);
    
    // Log XP for tiebreaker event
    global.ProgressionEvents?.onTiebreakerWin?.(hoh.id);
    
    const pickedFromTie = [];
    
    if(hoh?.human){
      // Human HOH picks from tied players
      for(let i = 0; i < slotsRemaining; i++){
        const remainingTied = tiedPlayers.filter(id => !pickedFromTie.includes(id));
        if(remainingTied.length === 0) break;
        
        const title = slotsRemaining > 1 
          ? `Multi-Eviction Tie — Pick ${i + 1} of ${slotsRemaining} to Evict`
          : 'Multi-Eviction Tie — Pick to Evict';
        
        const pick = await awaitHumanTieBreakPick(remainingTied, title, useLv2);
        pickedFromTie.push(pick);
        
        // Show human's choice
        if (!useLv2) {
          global.showCard('HOH Decision', [`${hoh.name} chooses to evict ${global.safeName(pick)}.`], 'live', 2500, true);
          try{ await global.cardQueueWaitIdle?.(); }catch{}
        }
      }
    } else {
      // AI HOH picks by affinity
      const remaining = [...tiedPlayers];
      for(let i = 0; i < slotsRemaining; i++){
        if(remaining.length === 0) break;
        const pick = pickByHohAffinity(hoh, remaining);
        pickedFromTie.push(pick);
        const idx = remaining.indexOf(pick);
        if(idx >= 0) remaining.splice(idx, 1);
      }
      
      // Show AI's choices
      if (!useLv2) {
        const pickedNames = pickedFromTie.map(id => global.safeName(id)).join(', ');
        global.showCard('HOH Decision', [`${hoh.name} breaks the tie: ${pickedNames}`], 'live', 3000, true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
      }
    }
    
    // Return final evictee list
    return [...confirmedEvictees, ...pickedFromTie];
  }

  async function multiEvictFinalize(evictedIds,counts,K){
    const g=global.game;
    const modeLabel=(K===3)?'Triple Eviction':'Double Eviction';
    
    // Calculate finalRank for multi-evictions (Issue #3)
    // Rank by votes (more votes = earlier out = lower placement), then alphabetically, then randomly
    const rankedEvictions = evictedIds.map(id => ({
      id,
      votes: counts.get(id) || 0,
      name: global.safeName(id)
    }))
    .sort((a, b) => {
      // More votes first (earlier out)
      if(b.votes !== a.votes) return b.votes - a.votes;
      // Alphabetical tiebreak
      const nameCompare = a.name.localeCompare(b.name);
      if(nameCompare !== 0) return nameCompare;
      // Random tiebreak
      return Math.random() - 0.5;
    });
    
    // Calculate base rank from remaining alive players
    const aliveBeforeEviction = global.alivePlayers().length + evictedIds.length;
    
    for(let i = 0; i < rankedEvictions.length; i++){
      const {id, votes} = rankedEvictions[i];
      const p = global.getP(id);
      if(!p) continue;
      
      p.evicted=true;
      p.weekEvicted=g.week;
      // Assign finalRank: higher rank for those evicted later (less votes)
      p.finalRank = aliveBeforeEviction - i;
      
      console.info(`[eviction] assigned finalRank=${p.finalRank} to ${p.name} votes=${votes}`);
      
      if(global.alivePlayers().length<=JURY_START_AT && g.cfg.enableJuryHouse){
        if(!g.juryHouse?.includes(id)) g.juryHouse=(g.juryHouse||[]).concat([id]);
      }
      try{ global.juryOnEviction?.(id); }catch{}
    }
    
    // Clear all badges immediately after eviction reveal (Issue #1)
    g.nominees=[]; g.vetoHolder=null; g.nomsLocked=false;
    if(Array.isArray(g.players)){
      g.players.forEach(p=>{
        p.nominated=false;
        p.hoh=false;
      });
    }
    g.hohId=null;
    console.info('[eviction] badges cleared after multi-eviction reveal');
    global.updateHud?.();

    const parts=[...counts.keys()].map(id=>`${global.safeName(id)} ${counts.get(id)||0}`).join(' — ');
    const names=evictedIds.map(global.safeName).join(', ');
    // Use new eviction modal for better visibility (supports multiple evictions)
    if (typeof global.EvictionModal?.show === 'function') {
      await global.EvictionModal.show({
        title: 'Eviction Results',
        lines: [`${modeLabel}: ${names}`, `Final votes: ${parts}`],
        tone: 'evict',
        duration: 4200
      });
    } else {
      // Fallback to old card system
      global.showCard('Eviction Results',[`${modeLabel}: ${names}`,`Final votes: ${parts}`],'evict',4200,true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
    }
    global.addLog?.(`${modeLabel}: ${names}. Votes — ${parts}`,'danger');

    g.__twistMode=null;
    g.__twistPlannedEvictions=1;
    g.__twistEvictedThisNight=0;
    g.__twistNomineeSnapshot=null;

    // Notify visual system and run eviction visuals sequentially
    // Suppress red X for all evicted players during animations
    if(typeof global.notifyEvictedForVisual === 'function'){
      evictedIds.forEach(id => global.notifyEvictedForVisual(id));
    }

    // Run eviction visual enhancement for each evicted player
    // Show animations sequentially for better visual clarity
    if(typeof global.runEvictionVisual === 'function'){
      for(const id of evictedIds){
        try{
          await global.runEvictionVisual(id, { reason: 'multi', mode: modeLabel });
        }catch(e){
          console.error('[eviction] visual enhancement failed for id:', id, e);
        }
      }
    }

    // Note: Suppression clearing and HUD update now handled by runEvictionVisual
    
    // Clean up any remaining vote UI after multi-eviction
    if (global.closeAllVoteUI) {
      global.closeAllVoteUI();
    }

    postEvictionRouting();
  }

  /* ----- Eviction Finalization & Routing ----- */
  function finalizeEviction(){
    const g=global.game; const evId=g.eviction.evicted;
    // Regular vote-based eviction - use legacy handler
    handleEvictionLegacy(evId,'vote');
  }

  // Legacy handler for vote-based evictions (not self-eviction)
  async function handleEvictionLegacy(evId,reason='vote'){
    const g=global.game; const ev=global.getP(evId); if(!ev) return;
    ev.evicted=true; ev.weekEvicted=g.week;
    
    // Assign finalRank based on remaining players (Issue #3)
    const aliveCount = global.alivePlayers().length + 1; // +1 because this player is being evicted
    ev.finalRank = aliveCount;
    console.info(`[eviction] assigned finalRank=${ev.finalRank} to ${ev.name}`);

    // Check if modern Live Vote UI was used
    const usedModernLiveVoteUI = g.eviction?.nominees?.length === 2 
      && g.cfg?.modernLiveVoteUI !== false 
      && global.lv2?.enabled !== false;

    if(reason==='self'){
      global.showCard('Self-Evicted',[ev.name],'evict',3800,true);
      global.addLog?.(`Self-eviction: <b>${ev.name}</b> has left the game.`,'danger');
    } else if (!usedModernLiveVoteUI && !g.eviction?.__resultCardShown) {
      // Standard eviction without modern UI - use unified result display (matching multi-eviction style)
      // Guard: Only show if result card hasn't been shown yet (prevents duplicates)
      const evName = global.safeName(evId);
      const voteSummary = g.eviction.voteSummary || '';
      
      // Initialize overlay phase for proper positioning (matching multi-eviction)
      if (typeof global.lv2?.beginResultCardPhase === 'function') {
        global.lv2.beginResultCardPhase();
      }
      
      // Show result card with vote summary and eviction phrase (two-line format like multi)
      if (typeof global.EvictionModal?.show === 'function') {
        await global.EvictionModal.show({
          title: 'Eviction Result',
          lines: voteSummary ? [`Votes: ${voteSummary}`, `${evName}, ${pickEvictionPhrase()}`] : [`${evName}, ${pickEvictionPhrase()}`],
          tone: 'evict',
          duration: 3800
        });
      } else {
        // Fallback to old card system
        const lines = voteSummary ? [`Votes: ${voteSummary}`, `${evName}, ${pickEvictionPhrase()}`] : [`${evName}, ${pickEvictionPhrase()}`];
        global.showCard('Eviction Result', lines, 'evict', 3800, true);
        try { await global.cardQueueWaitIdle?.(); } catch {}
      }
      
      // Mark result card as shown
      g.eviction.__resultCardShown = true;
      
      global.addLog?.(`Evicted: <b>${evName}</b>.`,'danger');
    }

    if(global.alivePlayers().length<=JURY_START_AT && g.cfg.enableJuryHouse){
      if(!g.juryHouse?.includes(evId)) g.juryHouse=(g.juryHouse||[]).concat([evId]);
    }
    try{ global.juryOnEviction?.(evId); }catch{}

    // Clear all badges immediately after eviction reveal (Issue #1)
    g.nominees=[]; g.vetoHolder=null; g.nomsLocked=false;
    if(Array.isArray(g.players)){
      g.players.forEach(p=>{
        p.nominated=false;
        p.hoh=false;
      });
    }
    g.hohId=null;
    console.info('[eviction] badges cleared after eviction reveal');

    // Update PlayerService with current alive players after eviction
    if(typeof global.PlayerService?.setAlivePlayers === 'function' && g.players){
      global.PlayerService.setAlivePlayers(g.players);
    }

    if(!g.__twistMode) global.twists?.afterPhase?.('eviction');

    // ALWAYS run visual animation for standard evictions (matching multi-eviction behavior)
    // Previously this was skipped when modern UI was used, causing style inconsistency
    if (reason === 'vote') {
      // Notify visual system to suppress red X during animation
      if(typeof global.notifyEvictedForVisual === 'function'){
        global.notifyEvictedForVisual(evId);
      }

      // Run eviction visual enhancement (avatar animation)
      // This ensures consistent centered animation for all single evictions
      if(typeof global.runEvictionVisual === 'function'){
        try{
          await global.runEvictionVisual(evId, { reason });
        }catch(e){
          console.error('[eviction] visual enhancement failed:', e);
        }
      }
    } else {
      // Non-vote evictions (self-evictions, etc.) - update HUD immediately
      if(typeof global.updateHud === 'function'){
        global.updateHud();
      }
    }

    // Note: Suppression clearing and HUD update now handled by runEvictionVisual
    
    // Belt-and-suspenders: ensure all vote UI is closed
    if (global.closeAllVoteUI) {
      global.closeAllVoteUI();
    }

    postEvictionRouting();
  }

  // Main self-eviction handler - delegates to centralized handler if available
  function handleSelfEviction(evId,reason='self'){
    // If centralized handler is available, use it for true self-evictions
    if(reason === 'self' && typeof global.selfEviction?.handle === 'function'){
      console.info('[eviction] Delegating to centralized self-eviction handler');
      return global.selfEviction.handle(evId, 'manual');
    }
    
    // Otherwise, use legacy handler
    return handleEvictionLegacy(evId, reason);
  }
  global.handleSelfEviction=handleSelfEviction;

  function postEvictionRouting(){
    const g=global.game;
    
    // COMMIT 3: Clean up all vote UI using global helper (includes lv2 cleanup)
    if (global.closeAllVoteUI) {
      global.closeAllVoteUI();
    }
    
    const remain=global.alivePlayers();
    if(remain.length===2){ setTimeout(()=>global.startJuryVote?.(),700); global.updateHud?.(); return; }
    if(remain.length===3){ setTimeout(()=>global.startFinal3Flow?.(),700); global.updateHud?.(); return; }

    proceedNextWeek();
  }
  global.postEvictionRouting=postEvictionRouting;

  function proceedNextWeek(){
    const g=global.game;
    
    // Clear all badges at the start of a new week (Issue: tag reset)
    g.nominees = [];
    g.vetoHolder = null;
    g.nomsLocked = false;
    g.hohId = null;
    
    if(Array.isArray(g.players)){
      g.players.forEach(p => {
        p.nominated = false;
        p.hoh = false;
        p.nominationState = 'none';
      });
    }
    
    console.info('[eviction] All badges cleared at start of new week');
    
    // Sync player badge states after clearing
    if(typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates();
    
    g.__nomsCommitInProgress=false;
    g.__nomsCommitted=false;
    g._pendingNoms=null;
    
    // Clear previous week's competition locks before incrementing week
    const previousWeek = g.week;
    if (global.CompLocks && typeof global.CompLocks.clearWeek === 'function') {
      try {
        const cleared = global.CompLocks.clearWeek(previousWeek);
        console.info(`[eviction] ✓ Cleared ${cleared} competition locks for week ${previousWeek}`);
      } catch (e) {
        console.warn('[eviction] Failed to clear previous week locks:', e);
      }
    }
    
    g.week++;
    
    // Reset competition participation flags for new week
    g.__humanPlayedHOH = false;
    g.__humanPlayedVeto = false;
    console.info('[eviction] ✓ Reset competition participation flags for week', g.week);
    
    // Reset grace attempt flags for new week
    if (g.humanId != null) {
      delete g[`__graceReplayAttempt_hoh_${g.humanId}`];
      delete g[`__graceReplayAttempt_veto_comp_${g.humanId}`];
      delete g[`__graceReplayAttempt_veto_${g.humanId}`];
      console.info('[eviction] ✓ Reset grace attempt flags for week', g.week);
    }
    
    // Call socialOnNewWeek at week rollover (Social Maneuvers weekly reset)
    // Guard to run once per week by tracking the last reset week
    if(!g.__socialWeeklyResetWeek || g.__socialWeeklyResetWeek < g.week){
      g.__socialWeeklyResetWeek = g.week;
      if(typeof global.socialOnNewWeek === 'function'){
        try{
          global.socialOnNewWeek();
          console.info('[eviction] ✓ Called socialOnNewWeek for week', g.week);
        }catch(e){
          console.error('[eviction] socialOnNewWeek failed:', e);
        }
      }
    }
    
    global.updateHud?.();

    // Use centralized juror return decision logic from twists.js
    // This checks eligibility + RNG and is cached per week
    if(typeof global.decideJurorReturnThisWeek === 'function' && global.decideJurorReturnThisWeek(g)){
      setTimeout(()=>{ try{ global.startAmericaReturnVote?.(); }catch(e){} },60);
      return;
    }

    global.tv.say(`Week ${g.week} — Intermission`);
    global.setPhase('intermission',4,()=>global.startHOH?.());
    global.updateHud?.();
  }
  global.proceedNextWeek=proceedNextWeek;

})(window);