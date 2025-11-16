// MODULE: social.js
// Social intermission: queued single-card decisions, ambient interactions,
// alliance accept updates allies immediately, and robust progression to nominations
// or callback continuation (legacy startSocial('src', cb) support).
// Enhanced: human‑sounding logs, strictly 3 prompts per intermission, throttle ambient logs,
// and pacing guards so reveal cards never overlap social decision cards.

(function(global){
  'use strict';

  const $ = (sel)=>document.querySelector(sel);

  function pick(arr){ return arr[Math.floor((global.rng?.()||Math.random())*arr.length)]; }
  function sample(arr, k){
    const a=[...arr];
    for(let i=a.length-1;i>0;i--){
      const j=Math.floor((global.rng?.()||Math.random())*(i+1));
      [a[i],a[j]]=[a[j],a[i]];
    }
    return a.slice(0, Math.min(k, a.length));
  }
  function ensure(v, def){ return (v===undefined||v===null)?def:v; }

  function ensureSocialState(){
    const g=global.game||{};
    if(!g.__weekPosInteractions) g.__weekPosInteractions = new Map();
    if(!g.__weekNegInteractions) g.__weekNegInteractions = new Map();
    if(!g.__floatersWeek) g.__floatersWeek = new Set();
    if(!g.__decisionQueue) g.__decisionQueue = [];
    if(!g.__decisionActive) g.__decisionActive = false;
    if(typeof g.__socialShown!=='number') g.__socialShown = 0;
    if(typeof g.__socialLogBudget!=='number') g.__socialLogBudget = 0;
    if(!(g.__actionCounts instanceof Map)) g.__actionCounts = new Map();
  }
  function weekKey(actorId,targetId){ return `${actorId}-${targetId}`; }
  function actionKey(actorId,targetId,action){ return `${actorId}|${targetId}|${action}`; }
  function resetWeeklyCounters(){
    const g=global.game; if(!g) return;
    const currentWeek = g.week || 1;
    
    // One-per-week guard
    if (g.__socialWeeklyResetWeek === currentWeek) {
      console.info(`[social.js] ⏭️ Weekly reset already done for week ${currentWeek}`);
      return;
    }
    
    g.__weekPosInteractions = new Map();
    g.__weekNegInteractions = new Map();
    g.__actionCounts = new Map();
    
    // Weekly reset hook: forward to SocialManeuvers.SocialResources.resetWeekly for all alive players
    if(global.SocialManeuvers?.isEnabled?.()){
      console.info('[social.js] 🔄 Social Maneuvers enabled - forwarding weekly reset to SocialResources');
      const alive = global.alivePlayers?.() || [];
      alive.forEach(player => {
        if(global.SocialManeuvers?.SocialResources?.resetWeekly){
          global.SocialManeuvers.SocialResources.resetWeekly(player.id);
        }
      });
      // Refresh HUD to reflect updated energy
      if(global.updateHud){
        global.updateHud();
      }
      if(global.SocializeMobile?.updateHUD){
        global.SocializeMobile.updateHUD();
      }
      
      // Mark this week as reset
      g.__socialWeeklyResetWeek = currentWeek;
      
      console.info('[social.js] ✓ Weekly reset complete - energy managed by SM bank (uncapped rolling balance) for week', currentWeek);
    } else {
      // Mark week as reset for legacy mode too
      g.__socialWeeklyResetWeek = currentWeek;
    }
    
    // Recompute allies/enemies after weekly reset
    if(global.SocialRelations?.recomputeAllRelations){
      console.info('[social.js] 🔄 Recomputing allies/enemies after weekly reset');
      global.SocialRelations.recomputeAllRelations();
    }
  }
  global.socialOnNewWeek = resetWeeklyCounters;

  // Human copy
  const HUMAN_POS = [
    (A,B)=>`${A} and ${B} shared a calm chat about the week.`,
    (A,B)=>`${A} checked in on ${B}. The vibe felt easy.`,
    (A,B)=>`${A} and ${B} mapped out a few scenarios.`,
    (A,B)=>`${A} hyped up ${B} — a genuine compliment.`,
    (A,B)=>`${A} brought ${B} a small gesture of goodwill.`
  ];
  const HUMAN_NEG = [
    (A,B)=>`${A} confronted ${B} — grievances aired.`,
    (A,B)=>`${A} threw a little shade at ${B}.`,
    (A,B)=>`${A} pressed ${B} on broken promises.`,
    (A,B)=>`${A} questioned ${B}’s honesty.`,
    (A,B)=>`${A} and ${B} had a tense exchange.`
  ];

  function logHuman(kind, Aname, Bname, explicitText){
    const line = explicitText
      ? explicitText
      : (kind==='positive' ? pick(HUMAN_POS) : pick(HUMAN_NEG))(Aname, Bname);
    global.addLog?.(line, kind==='positive' ? 'ok' : 'danger');
  }

  function applyInteraction(actorId, targetId, kind){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const A=global.getP?.(actorId), B=global.getP?.(targetId); if(!A||!B||A.id===B.id) return;

    const damp = (A.floater||B.floater) ? 0.7 : 1.0;

    if(kind==='positive'){
      const k=weekKey(actorId,targetId);
      const used=g.__weekPosInteractions.get(k)||0;
      let baseDelta=0;
      if(used<2){
        baseDelta = 0.10 + Math.random()*0.06;
        g.__weekPosInteractions.set(k, used+1);
      }else{
        const good = Math.random()<0.5;
        baseDelta = good ? (0.05+Math.random()*0.04) : -(0.05+Math.random()*0.04);
      }
      const deltaA = baseDelta*damp;
      const deltaB = (baseDelta*0.65)*damp;

      A.affinity[B.id]= (A.affinity?.[B.id]??0) + deltaA;
      B.affinity[A.id]= (B.affinity?.[A.id]??0) + deltaB;

      if(g.__socialLogBudget>0){ logHuman('positive', A.name, B.name); g.__socialLogBudget--; }
      // Issue #4: Remove affinity delta lines from social feed (keep for debug only)
      // try{
      //   global.addLog?.(`Δ ${A.name}→${B.name} ${(deltaA>=0?'+':'')}${deltaA.toFixed(2)}; ${B.name}→${A.name} ${(deltaB>=0?'+':'')}${deltaB.toFixed(2)}`,'tiny');
      // }catch{}
    }else if(kind==='negative'){
      const k=weekKey(actorId,targetId);
      const used=g.__weekNegInteractions.get(k)||0;
      g.__weekNegInteractions.set(k, used+1);

      let baseDelta;
      if(used>=2){
        // 50/50 swing after more than twice in the same week
        baseDelta = (Math.random()<0.5)
          ? -(0.08 + Math.random()*0.06)
          : (0.04 + Math.random()*0.04);
      }else{
        // original distribution, mostly negative
        const roll=Math.random();
        baseDelta = roll<0.8 ? -(0.10+Math.random()*0.08) : (Math.random()<0.5?0: (0.02+Math.random()*0.02));
      }

      const deltaA = baseDelta*damp;
      const deltaB = (baseDelta*0.35)*damp;

      A.affinity[B.id]= (A.affinity?.[B.id]??0) + deltaA;
      B.affinity[A.id]= (B.affinity?.[A.id]??0) + deltaB;

      if(g.__socialLogBudget>0){ logHuman('negative', A.name, B.name); g.__socialLogBudget--; }
      // Issue #4: Remove affinity delta lines from social feed (keep for debug only)
      // try{
      //   global.addLog?.(`Δ ${A.name}→${B.name} ${(deltaA>=0?'+':'')}${deltaA.toFixed(2)}; ${B.name}→${A.name} ${(deltaB>=0?'+':'')}${deltaB.toFixed(2)}`,'tiny');
      // }catch{}
    }

    global.updateHud?.();
  }
  global.socialApplyInteraction = applyInteraction;

  // Relationship state mapping (numeric affinity to labels)
  function getRelationshipState(affinity){
    const a = affinity ?? 0;
    if(a >= 0.65) return 'Romance/Bromance';
    if(a >= 0.48) return 'Ride or Die';
    if(a >= 0.28) return 'Allies';
    if(a >= 0.12) return 'Friendly';
    if(a >= -0.12) return 'Neutral';
    if(a >= -0.28) return 'Strained';
    if(a >= -0.48) return 'Enemies';
    return 'Arch Enemies';
  }

  // Track relationship state transitions
  function checkStateTransition(actor, target){
    if(!actor || !target) return;
    const g = global.game; if(!g) return;
    
    const key = `${actor.id}-${target.id}`;
    if(!g.__relationshipStates) g.__relationshipStates = new Map();
    
    const affinity = actor.affinity?.[target.id] ?? 0;
    const newState = getRelationshipState(affinity);
    const oldState = g.__relationshipStates.get(key);
    
    if(oldState !== newState){
      g.__relationshipStates.set(key, newState);
      
      // Log significant state transitions once
      if((newState === 'Allies' && oldState !== 'Allies') ||
         (newState === 'Ride or Die') ||
         (newState === 'Romance/Bromance') ||
         (newState === 'Enemies' && oldState !== 'Enemies') ||
         (newState === 'Arch Enemies')){
        const style = (newState.includes('Enemies') || newState === 'Strained') ? 'soc-neg' : 'soc-pos';
        global.addLog?.(`<span class="${style}">${actor.name} → ${target.name}: ${newState}</span>`, style);
      }
    }
  }

  // Expanded quick actions with new types
  function applyAction(actorId, targetId, action){
    ensureSocialState();
    const g=global.game; if(!g) return;
    const actor = global.getP?.(actorId), target = global.getP?.(targetId);
    if(!actor || !target || actor.id===target.id) return;

    const ALLY_T = ensure(global.ALLY_T, 0.28);

    // Repetition tracking
    const aKey = actionKey(actorId, targetId, action);
    const used = g.__actionCounts.get(aKey) || 0;
    g.__actionCounts.set(aKey, used+1);

    // Repetition penalty: >2 consecutive same action
    const repPenalty = used >= 2 && Math.random() < 0.51;

    if(action==='alliance'){
      const bumpA = 0.14 + Math.random()*0.08;
      const bumpB = 0.12 + Math.random()*0.07;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bumpA;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bumpB;
      if(actor.affinity[target.id] < ALLY_T) actor.affinity[target.id] = ALLY_T + 0.02*Math.random();
      if(target.affinity[actor.id] < ALLY_T-0.05) target.affinity[actor.id] = (ALLY_T-0.05) + 0.02*Math.random();
      global.addLog?.(`<span class="soc-pos">You and ${target.name} discussed an alliance.</span>`, 'ok');
    } else if(action==='apologize'){
      const base = (actor.affinity?.[target.id]??0) < 0 ? 0.14 : 0.08;
      const bump = base + Math.random()*0.06;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump*0.9;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump;
      global.addLog?.(`<span class="soc-pos">You apologized to ${target.name}.</span>`, 'ok');
    } else if(action==='gift'){
      if(repPenalty){
        applyInteraction(actorId, targetId, 'negative');
        global.addLog?.(`<span class="soc-neg">${actor.name} overdid it — ${target.name} felt the gesture was insincere.</span>`, 'danger');
      } else {
        applyInteraction(actorId, targetId, 'positive');
        global.addLog?.(`<span class="soc-pos">You gave a small gift to ${target.name}.</span>`, 'ok');
      }
    } else if(action==='flirt'){
      // Flirt action: positive boost, check for romance jealousy
      const bump = 0.12 + Math.random()*0.08;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump*0.8;
      global.addLog?.(`<span class="soc-pos">You flirted with ${target.name}.</span>`, 'ok');
      
      // Jealousy mechanic: if actor has high affinity with someone else
      const alive = global.alivePlayers?.() || [];
      for(const other of alive){
        if(other.id === target.id || other.id === actor.id) continue;
        const otherAff = actor.affinity?.[other.id] ?? 0;
        if(otherAff >= 0.55 && Math.random() < 0.4){
          // Jealousy penalty
          actor.affinity[other.id] = otherAff - (0.08 + Math.random()*0.06);
          global.addLog?.(`<span class="soc-neg">${other.name} seems jealous of your attention to ${target.name}.</span>`, 'warn');
        }
      }
    } else if(action==='prank'){
      if(repPenalty){
        applyInteraction(actorId, targetId, 'negative');
        global.addLog?.(`<span class="soc-neg">Your prank on ${target.name} went too far.</span>`, 'danger');
      } else {
        const light = Math.random() < 0.6;
        if(light){
          const bump = 0.06 + Math.random()*0.04;
          actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
          target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump*0.7;
          global.addLog?.(`<span class="soc-pos">You pulled a lighthearted prank on ${target.name}.</span>`, 'ok');
        } else {
          applyInteraction(actorId, targetId, 'negative');
          global.addLog?.(`<span class="soc-neg">Your prank on ${target.name} backfired.</span>`, 'danger');
        }
      }
    } else if(action==='strategychat'){
      const bump = 0.10 + Math.random()*0.06;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump*0.85;
      global.addLog?.(`<span class="soc-pos">You had a strategy chat with ${target.name}.</span>`, 'ok');
    } else if(action==='workout'){
      const bump = 0.08 + Math.random()*0.05;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump;
      global.addLog?.(`<span class="soc-pos">You worked out with ${target.name}.</span>`, 'ok');
    } else if(action==='cook'){
      const bump = 0.09 + Math.random()*0.06;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump*0.9;
      global.addLog?.(`<span class="soc-pos">You cooked a meal with ${target.name}.</span>`, 'ok');
    } else if(action==='latenighttalk'){
      const bump = 0.11 + Math.random()*0.07;
      actor.affinity[target.id] = (actor.affinity?.[target.id]??0) + bump;
      target.affinity[actor.id] = (target.affinity?.[actor.id]??0) + bump*0.85;
      global.addLog?.(`<span class="soc-pos">You had a late night talk with ${target.name}.</span>`, 'ok');
    } else if(action==='taunt'){
      applyInteraction(actorId, targetId, 'negative');
      global.addLog?.(`<span class="soc-neg">You taunted ${target.name}.</span>`, 'danger');
    } else if(action==='confront'){
      applyInteraction(actorId, targetId, 'negative');
      global.addLog?.(`<span class="soc-neg">You confronted ${target.name}.</span>`, 'danger');
    }

    // Check for state transitions
    checkStateTransition(actor, target);
    checkStateTransition(target, actor);

    global.updateHud?.();
  }

  // REMOVED: simulateHouseSocial() - legacy social simulation now handled by Social Maneuvers engine

  // Ensure decision deck exists and is centered in TV safe area
  function ensureDecisionDeck(){
    let deck=document.getElementById('decisionDeck');
    if(deck) return deck;
    const tv=document.getElementById('tv') || document.querySelector('.tv') || document.body;
    deck=document.createElement('div');
    deck.id = 'decisionDeck';
    // Safe-area centering; decision deck itself is non-interactive, card is interactive
    deck.style.cssText = 'position:absolute;inset:var(--tv-safe-top) var(--tv-safe-x) var(--tv-safe-bottom) var(--tv-safe-x);display:grid;place-items:center;gap:8px;z-index:12;pointer-events:none;';
    tv.appendChild(deck);
    return deck;
  }
  function clearDecisionDeck(){ const d=document.getElementById('decisionDeck'); if(d) d.remove(); }

  // Hide/show reveal overlay while social decisions are on screen to guarantee zero visual overlap
  function maskRevealOverlay(mask){
    const ov=document.getElementById('tvOverlay'); if(!ov) return;
    ov.__maskedBySocial = mask ? (ov.__maskedBySocial||0)+1 : Math.max(0,(ov.__maskedBySocial||0)-1);
    if(ov.__maskedBySocial>0){ ov.style.visibility='hidden'; }
    else { ov.style.visibility=''; }
  }

  function queueDecision(item){
    ensureSocialState();
    const g=global.game; g.__decisionQueue.push(item);
  }

  async function showNextDecision(){
    ensureSocialState();
    const g=global.game; if(!g) return;
    if(g.__decisionActive) return;
    const next = g.__decisionQueue.shift();
    if(!next){ clearDecisionDeck(); maskRevealOverlay(false); return; }

    // If skip is active, auto-apply first action and continue
    if(global.SkipController?.isActive()){
      const firstAction = next.actions?.[0];
      if(firstAction && firstAction.onChoose){
        try{ firstAction.onChoose(); }catch(e){ console.error('[social] Error in skip auto-apply:', e); }
      }
      g.__decisionActive = false;
      // Continue draining queue immediately
      if(g.__decisionQueue.length > 0){
        showNextDecision();
      }
      return;
    }

    // Ensure reveal cards have completely finished before showing any decision
    try{ await global.cardQueueWaitIdle?.(); }catch{}

    g.__decisionActive = true;
    
    // Use faux TV card-based UI
    maskRevealOverlay(true);
    const deck=ensureDecisionDeck();
    deck.innerHTML='';

    const card=document.createElement('div');
    card.className='revealCard diaryRoomCard decisionCard';
    const h=document.createElement('h3'); h.textContent=next.title; card.appendChild(h);
    for(const l of next.lines){ const d=document.createElement('div'); d.textContent=l; card.appendChild(d); }

    const bar=document.createElement('div'); bar.className='decisionActions';
    next.actions.forEach(act=>{
      const b=document.createElement('button'); b.className='btn small'; b.textContent=act.label;
      b.onclick=()=>{
        try{ act.onChoose?.(); }catch(e){ console.error(e); }
        card.remove();
        g.__decisionActive = false;
        // Small pause between prompts to keep pacing humane
        if(g.__decisionQueue.length){
          setTimeout(()=>showNextDecision(), 420);
        } else {
          clearDecisionDeck(); maskRevealOverlay(false);
        }
      };
      bar.appendChild(b);
    });
    card.appendChild(bar);

    // Allow card to be interactive
    card.style.pointerEvents = 'auto';
    deck.appendChild(card);

    card.style.animation='popIn .45s ease forwards';
  }

  // REMOVED: buildSocialDecisions() - legacy decision generation now handled by Social Maneuvers engine

  // ===== Social Logic v2 =====
  
  // REMOVED: buildSocialDecisionsV2() - V2 logic now integrated into Social Maneuvers engine

  // REMOVED: buildSocialDecisionsLegacy() - legacy fallback decision generation no longer needed

  // Helper: determine if legacy memories/UI should show
  // DEPRECATED: Legacy UI completely removed - Social Maneuvers is now sole owner
  function shouldShowLegacyMemories(){
    return false; // Always return false - legacy UI removed
  }

  // REMOVED: renderSocialPhase() - legacy UI rendering replaced by Social Maneuvers
  function renderSocialPhase(panel){
    const g=global.game; if(!panel || !g) return;

    // Social Maneuvers is now the sole owner of social_intermission
    console.info('[social.js] Social Maneuvers is sole owner - mounting launcher');
    panel.innerHTML=''; // Clear panel
    
    // Start launcher observer
    if(global.SocialLauncherBootstrap?.startLauncherObserver){
      global.SocialLauncherBootstrap.startLauncherObserver();
    }
    
    // Ensure launcher mounted in TV overlay
    if(global.SocializeMobile?.ensureSocializeLauncher){
      global.SocializeMobile.ensureSocializeLauncher();
    }
    
    // Show and update HUD
    if(global.SocializeMobile?.show){
      global.SocializeMobile.show();
    }
    if(global.SocializeMobile?.updateHUD){
      global.SocializeMobile.updateHUD();
    }
  }
  global.renderSocialPhase = renderSocialPhase;

  function resolveStartNominations(){
    const cands = [
      'startNominations','startNomination','startNoms',
      'startNominationsPhase','startNomsPhase','startNominationsFlow'
    ];
    for(const name of cands){
      const fn = global[name];
      if(typeof fn==='function') return fn.bind(global);
    }
    return function fallbackStartNominations(){
      const g=global.game; if(!g) return;
      global.tv?.say?.('Nominations');
      global.setPhase?.('nominations', g.cfg?.tNoms||25, ()=>{
        if(typeof global.startVeto==='function'){ global.startVeto(); }
        else if(typeof global.startVetoComp==='function'){ global.startVetoComp(); }
      });
      global.renderPanel?.();
    };
  }

  // REMOVED: generateSocialSummary() - legacy summary card replaced by Social Maneuvers engine

  function endSocialPhaseCleanup(){
    const g=global.game; if(!g) return;
    g.__decisionQueue = [];
    g.__decisionActive = false;
    clearDecisionDeck();
    // Unmask overlay
    const ov=document.getElementById('tvOverlay'); if(ov){ ov.__maskedBySocial = 0; ov.style.visibility=''; }
    
    // Recompute allies/enemies at end of social phase
    if(global.SocialRelations?.recomputeAllRelations){
      console.info('[social.js] 🔄 Recomputing allies/enemies after social phase');
      global.SocialRelations.recomputeAllRelations();
    }
  }

  // Public entry
  global.startSocialIntermission = async function(source, callback){
    const g=global.game; if(!g) return;
    ensureSocialState();
    g.__socialShown = 0;        // reset per intermission (max 3 prompts)
    g.__socialLogBudget = 6;    // reset ambient budget

    // Clear any lingering ceremony cards before starting social phase
    if(global.CardManager){
      console.info('[social.js] Clearing ceremony cards before social phase');
      await global.CardManager.clear(true);
    }

    // Call onSocialPhaseStart when Social Maneuvers is enabled
    if(global.SocialManeuvers?.isEnabled?.()){
      console.info('[social.js] ▶ Entering social_intermission - calling onSocialPhaseStart');
      if(global.SocialManeuvers?.onSocialPhaseStart){
        try{
          global.SocialManeuvers.onSocialPhaseStart();
        }catch(e){
          console.error('[social.js] onSocialPhaseStart failed:', e);
        }
      }else{
        console.warn('[social.js] SocialManeuvers.onSocialPhaseStart not found');
      }
      
      // Dismiss stray legacy memory cards if any
      try{
        const deck = document.getElementById('decisionDeck');
        if(deck) deck.remove();
      }catch(e){}
      
      // Mount launcher with robust fallback
      if(global.SocializeMobile?.ensureSocializeLauncher){
        try{
          global.SocializeMobile.ensureSocializeLauncher();
          console.info('[social.js] ✓ Launcher mounted with robust fallback');
        }catch(e){
          console.error('[social.js] Failed to mount launcher:', e);
        }
      }
      
      // Update HUD
      if(global.SocializeMobile?.updateHUD){
        try{
          global.SocializeMobile.updateHUD();
        }catch(e){
          console.error('[social.js] Failed to update HUD:', e);
        }
      }
    }

    global.tv?.say?.('Social Intermission');
    
    // Trigger social music
    try{ global.phaseMusic?.('social'); }catch{}

    // Ensure prior reveal cards have finished before starting prompts
    try{ await global.cardQueueWaitIdle?.(); }catch{}

    const onDone = async ()=>{
      try{ 
        // Call onSocialPhaseEnd when Social Maneuvers is enabled
        if(global.SocialManeuvers?.isEnabled?.()){
          console.info('[social.js] ◼ Leaving social_intermission - calling onSocialPhaseEnd');
          if(global.SocialManeuvers?.onSocialPhaseEnd){
            try{
              global.SocialManeuvers.onSocialPhaseEnd();
            }catch(e){
              console.error('[social.js] onSocialPhaseEnd failed:', e);
            }
          }else{
            console.warn('[social.js] SocialManeuvers.onSocialPhaseEnd not found');
          }
          
          // Close/hide launcher
          if(global.SocializeMobile?.hide){
            try{
              global.SocializeMobile.hide();
            }catch(e){
              console.error('[social.js] Failed to hide launcher:', e);
            }
          }
          
          // Ensure timer resumes if paused
          if(global.SocialManeuvers?.resumePhaseTimer){
            try{
              global.SocialManeuvers.resumePhaseTimer();
            }catch(e){
              console.error('[social.js] Failed to resume timer:', e);
            }
          }
          
          // Show engine summary instead of legacy
          await global.cardQueueWaitIdle?.();
          
          // Try to delegate to engine summary panel
          let summaryShown = false;
          if(global.SocialManeuvers?.showSummaryPanel){
            try{
              global.SocialManeuvers.showSummaryPanel();
              summaryShown = true;
              console.info('[social.js] ✓ Showed engine summary via showSummaryPanel');
            }catch(e){
              console.error('[social.js] showSummaryPanel failed:', e);
            }
          }else if(global.SocialManeuvers?.showEndOfPhaseSummary){
            try{
              global.SocialManeuvers.showEndOfPhaseSummary();
              summaryShown = true;
              console.info('[social.js] ✓ Showed engine summary via showEndOfPhaseSummary');
            }catch(e){
              console.error('[social.js] showEndOfPhaseSummary failed:', e);
            }
          }else if(global.SocialManeuvers?.presentPhaseSummary){
            try{
              global.SocialManeuvers.presentPhaseSummary();
              summaryShown = true;
              console.info('[social.js] ✓ Showed engine summary via presentPhaseSummary');
            }catch(e){
              console.error('[social.js] presentPhaseSummary failed:', e);
            }
          }
          
          if(!summaryShown){
            console.warn('[social.js] ⚠ No engine summary method found (tried showSummaryPanel, showEndOfPhaseSummary, presentPhaseSummary)');
          }
          
          await global.cardQueueWaitIdle?.();
        }
        // REMOVED: Legacy summary generation - Social Maneuvers is now sole owner
        
        endSocialPhaseCleanup(); 
      }catch(e){ console.error(e); }
      
      if(typeof callback === 'function'){
        try{ callback(); }catch(e){ console.error(e); }
      } else {
        const startNoms = resolveStartNominations();
        try{ startNoms(); }catch(e){ console.error(e); }
      }
    };
    global.setPhase?.('social_intermission', g.cfg?.tComms||30, onDone);
    const panel=document.getElementById('panel'); if(panel) renderSocialPhase(panel);
  };

  // Back-compat alias used by competitions.js
  global.startSocial = global.startSocialIntermission;
  global.renderSocial = renderSocialPhase;

  // Defensive setPhase wrapper to detect entering/leaving social_intermission
  // even if other code calls setPhase directly (guards against double-calls)
  (function installSetPhaseWrapper(){
    if(global.__setPhaseWrapped) return; // Only wrap once
    global.__setPhaseWrapped = true;
    
    const originalSetPhase = global.setPhase;
    if(typeof originalSetPhase !== 'function') return;
    
    let _inSocialPhase = false;
    
    function handleSocialPhaseEntry() {
      _inSocialPhase = true;
      console.info('[social.js wrapper] ▶ Detected entering social_intermission via setPhase');
      
      if(global.SocialManeuvers?.isEnabled?.()){
        // Call onSocialPhaseStart if not already called
        if(global.SocialManeuvers?.onSocialPhaseStart && !global.game?.__socialPhaseStartCalled){
          try{
            global.game.__socialPhaseStartCalled = true;
            global.SocialManeuvers.onSocialPhaseStart();
            console.info('[social.js wrapper] ✓ Called onSocialPhaseStart');
          }catch(e){
            console.error('[social.js wrapper] onSocialPhaseStart failed:', e);
          }
        }
        
        // Mount launcher
        if(global.SocializeMobile?.ensureSocializeLauncher){
          try{
            global.SocializeMobile.ensureSocializeLauncher();
          }catch(e){}
        }
        
        // Update HUD
        if(global.SocializeMobile?.show){
          try{
            global.SocializeMobile.show();
          }catch(e){}
        }
        if(global.SocializeMobile?.updateHUD){
          try{
            global.SocializeMobile.updateHUD();
          }catch(e){}
        }
      }
    }
    
    function handleSocialPhaseExit() {
      _inSocialPhase = false;
      console.info('[social.js wrapper] ◼ Detected leaving social_intermission via setPhase');
      
      if(global.SocialManeuvers?.isEnabled?.()){
        // Call onSocialPhaseEnd if not already called
        if(global.SocialManeuvers?.onSocialPhaseEnd && !global.game?.__socialPhaseEndCalled){
          try{
            global.game.__socialPhaseEndCalled = true;
            global.SocialManeuvers.onSocialPhaseEnd();
            console.info('[social.js wrapper] ✓ Called onSocialPhaseEnd');
          }catch(e){
            console.error('[social.js wrapper] onSocialPhaseEnd failed:', e);
          }
        }
        
        // Hide launcher
        if(global.SocializeMobile?.hide){
          try{
            global.SocializeMobile.hide();
          }catch(e){}
        }
        
        // Resume timer
        if(global.SocialManeuvers?.resumePhaseTimer){
          try{
            global.SocialManeuvers.resumePhaseTimer();
          }catch(e){}
        }
      }
      
      // Reset flags for next phase
      if(global.game){
        delete global.game.__socialPhaseStartCalled;
        delete global.game.__socialPhaseEndCalled;
      }
    }
    
    global.setPhase = function wrappedSetPhase(phase, duration, callback){
      const entering = phase === 'social_intermission' || phase === 'social';
      const leaving = !entering && _inSocialPhase;
      
      // Notify CardManager of phase change BEFORE any other logic
      if(global.CardManager && typeof global.CardManager.onPhaseChange === 'function'){
        try {
          global.CardManager.onPhaseChange(phase);
        } catch(e){
          console.error('[social.js wrapper] CardManager.onPhaseChange failed:', e);
        }
      }
      
      if(entering && !_inSocialPhase){
        handleSocialPhaseEntry();
      }
      
      if(leaving){
        handleSocialPhaseExit();
      }
      
      // Call original setPhase
      return originalSetPhase.call(this, phase, duration, callback);
    };
    
    console.info('[social.js] ✓ Defensive setPhase wrapper installed');
  })();

  // Drainer for SkipController integration
  function socialDecisionsDrainer(){
    const g = global.game;
    if(!g) return false;
    
    let didWork = false;
    
    // Auto-apply first action for all queued decisions
    while(g.__decisionQueue && g.__decisionQueue.length > 0){
      const decision = g.__decisionQueue.shift();
      const firstAction = decision.actions?.[0];
      if(firstAction && firstAction.onChoose){
        try{
          firstAction.onChoose();
          didWork = true;
        }catch(e){
          console.error('[social] Error in drainer auto-apply:', e);
        }
      }
    }
    
    // Clear active decision card
    if(g.__decisionActive){
      const deck = document.getElementById('decisionDeck');
      if(deck){
        deck.innerHTML = '';
        didWork = true;
      }
      g.__decisionActive = false;
      didWork = true;
    }
    
    // Clear decision deck and overlay
    clearDecisionDeck();
    maskRevealOverlay(false);
    
    return didWork;
  }

  // Register drainer with SkipController
  if(global.SkipController){
    global.SkipController.registerDrainer('socialDecisions', socialDecisionsDrainer);
  }

})(window);
