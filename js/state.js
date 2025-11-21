// MODULE: state.js
// Core game state, RNG, player creation, relationships, alliances, drift.
// Adds richer meta fields for opening presentation.

(function(global){

  /* ===== Static Data ===== */
  const TRAITS=['Strategist','Social Butterfly','Lone Wolf','Wildcard','Competitor','Charmer','Schemer','Floater','Numbers Player','Risk Taker'];
  const LOCATIONS=['NY','LA','Dallas','Miami','Chicago','Boston','Denver','Seattle','Atlanta','Phoenix','Austin','Portland'];
  const SEXES=['M','F'];
  const OCCUPATIONS=['Teacher','Software Dev','Nurse','Artist','Sales Rep','Chef','Barista','Photographer','Fitness Coach','Student','Entrepreneur','Analyst','DJ','Designer','Marketer'];
  const SEXUALITIES=['Straight','Gay','Bi','Queer','Pan'];
  const ETHNICITIES=['Black','White','Latino','Asian','Mixed','Middle Eastern','Indigenous'];
  const MOTTOS=[
    'Play big or go home.','Trust but verify.','Social first, comps later.','Expect chaos.',
    'No risk, no reward.','Silent but deadly.','Float till it matters.','All about loyalty.'
  ];

  /* ===== Game State ===== */
  const game={
    cfg:{
      numPlayers:12,tHOH:35,tNoms:25,tVeto:30,tVetoDec:20,tComms:30,tVote:25,tJury:42,
      fxCards:true,fxSound:true,fxStyle:'fade',fxAnim:true,miniMode:'random',
      manualMode:false,doubleChance:10,tripleChance:3,enableJuryHouse:true,autoMusic:true,
      returnChance:50,selfEvictChance:0,humanName:'You',enablePublicFav:false,
      IdlePhases:false,
      // Fast-forward configuration
      fastForwardEnabled:true,
      fastForwardMultiplier:0.1,
      fastForwardMinDuration:40,
      fastForwardMaxDuration:300,
      fastForwardMinigameAutoSubmit:false,
      fastForwardSocialActionInterval:200,
      // Fast-forward UI & playback enhancements
      fastForwardAlwaysEnable:true,
      fastForwardMinPhaseWindowMs:1500,
      fastForwardPlaybackMinCardMs:120,
      fastForwardPlaybackMaxCardMs:480
    },
    week:1,phase:'lobby',endAt:0,
    players:[],humanId:null,
    hohId:null,lastHOHId:null,
    nominees:[],vetoHolder:null,
    jury:[],juryHouse:[],votingJury:[],
    lastCompScores:new Map(),
    rngSeed:Math.floor(Math.random()*1e9),
    editMode:false,
    nomsLocked:false,vetoSavedId:null,
    hohOrder:[],miniIndex:0,
    doubleEvictionWeek:false,tripleEvictionWeek:false,
    socialTimers:[],activeEvent:null,
    juryVotes:new Map(),revealedJuryVotes:new Set(),
    juryTwistDone:false,juryTwistCandidateWeek:null,juryTwistRunning:false,
    firstEvictionExcludedId:null,
    openingDone:false,
    relationships:{},alliances:[],
    nominations:{primary:[],replacement:null,final:[]},
    eviction:{nominees:[],votes:[],evicted:null},
    relChangeLogs:[],
    juryAllVotesLocked:false,
    juryPreRevealShown:false,
    jurySequentialRevealActive:false,
    pendingAdvance:null,
    miniHistory:[],
    finale:{
      juryVotesRaw:[],
      castingDone:false,
      revealStarted:false
    },
    // Fast-forward runtime state
    __ffActive:false,
    __ffMultiplier:1
  };

  /* ===== Balance & Social Constants ===== */
  const NOMINATION_PENALTY=-12;
  const SHARED_VOTE_REWARD=4;
  const SAVED_WITH_VETO_REWARD=10;
  const VETO_NOT_USED_ON_ALLY_PENALTY=-6;
  const DRIFT_STEP=1;
  const ALLIANCE_FORM_THRESHOLD=25;
  const ALLIANCE_PRUNE_THRESHOLD=10;
  const MAX_ALLIANCE_SIZE=6;
  const REL_VETO_FRIEND_THRESHOLD=25;
  const REL_VETO_HOH_COHESION=10;
  const THREAT_BASE=0.5;
  const ALLY_T=0.28;
  const ENEMY_T=-0.28;
  const STRONG_ALLY=0.45;

  /* ===== RNG ===== */
  function rng(){ let x=Math.sin(game.rngSeed++)*10000; return x-Math.floor(x); }
  function clamp(x,a,b){ return Math.max(a,Math.min(b,x)); }

  /* ===== Card Flush System ===== */
  // Global generation token for abort-safe card operations
  if(!global.__cardGen) global.__cardGen = 0;
  if(!global.__cardTimeouts) global.__cardTimeouts = [];

  // Safe card wrapper that tags with generation token (dedupe-aware)
  function safeShowCard(title, lines, type, duration, queue){
    // Short signature for dedupe: title + joined lines + type
    const sig = `${String(title||'')}\u0000${Array.isArray(lines)?lines.join('|'):String(lines||'')}\u0000${String(type||'')}`;

    // Ensure global tracking structures exist
    if(!global.__cardPendingMap) global.__cardPendingMap = {};

    // If an identical card is already pending, skip scheduling another
    if(global.__cardPendingMap[sig]){
      return global.__cardPendingMap[sig];
    }

    const currentGen = global.__cardGen;
    const timeoutId = setTimeout(() => {
      // Remove signature from pending map when firing
      try { delete global.__cardPendingMap[sig]; } catch(e){}

      // Only show if generation hasn't been invalidated
      if(global.__cardGen === currentGen && typeof global.showCard === 'function'){
        try {
          global.showCard(title, lines, type, duration, queue);
        } catch(e){
          console.warn('[cards] showCard error:', e);
        }
      }

      // Cleanup from __cardTimeouts list
      try {
        const idx = (global.__cardTimeouts || []).indexOf(timeoutId);
        if(idx >= 0) global.__cardTimeouts.splice(idx, 1);
      } catch(e){}
    }, 0);

    // Track timeouts for flush/cleanup and the pending signature
    if(!Array.isArray(global.__cardTimeouts)) global.__cardTimeouts = [];
    global.__cardTimeouts.push(timeoutId);
    global.__cardPendingMap[sig] = timeoutId;

    return timeoutId;
  }

  // Flush all pending cards and DOM elements
  function flushAllCards(reason){
    // Increment generation to invalidate pending operations
    global.__cardGen++;
    
    // Clear all pending timeouts
    global.__cardTimeouts.forEach(id => clearTimeout(id));
    global.__cardTimeouts = [];
    
    // Clear pending signature map to avoid stuck dedupe state
    if(global.__cardPendingMap){
      global.__cardPendingMap = {};
    }
    
    // Remove existing card DOM elements
    const cardHosts = document.querySelectorAll('.bb-card-host, [data-bb-card]');
    cardHosts.forEach(el => el.remove());
    
    console.info(`[cards] flushed (reason=${reason || 'manual'})`);
  }

  global.safeShowCard = safeShowCard;
  global.flushAllCards = flushAllCards;

  /* ===== Fast-Forward Boot-time Initialization ===== */
  /**
   * Reset any stale fast-forward flags at boot time.
   * Ensures FFWD is OFF by default on app load.
   */
  function initFastForwardState(){
    // Use window.game as the single source of truth
    const g = global.game;
    if(!g) return;
    
    // Reset FFWD state to defaults
    g.__ffActive = false;
    g.__ffMultiplier = 1;
    
    console.info('[fast-forward] Boot-time init: FFWD state reset to defaults');
  }
  
  // Run boot-time init when this module loads
  if(typeof global !== 'undefined' && global.game){
    initFastForwardState();
  }

  /* ===== Fast-Forward Duration Normalization ===== */
  /**
   * Normalize duration based on fast-forward state.
   * If fast-forward is active, compresses duration by multiplier with min/max caps.
   * @param {number} ms - Original duration in milliseconds
   * @returns {number} Normalized duration
   */
  function normalizeDuration(ms){
    // Always read from window.game (single source of truth)
    const g = global.game;
    if(!g || !g.__ffActive) return ms;
    
    // Default fallback values for backward compatibility
    const DEFAULT_MIN = 40;
    const DEFAULT_MAX = 300;
    
    const mult = g.__ffMultiplier || 0.1;
    
    // Prefer new per-card playback min/max if defined, fallback to legacy min/max, then defaults
    const cardMin = g.cfg?.fastForwardPlaybackMinCardMs ?? g.cfg?.fastForwardMinDuration ?? DEFAULT_MIN;
    const cardMax = g.cfg?.fastForwardPlaybackMaxCardMs ?? g.cfg?.fastForwardMaxDuration ?? DEFAULT_MAX;
    
    const compressed = Math.round(ms * mult);
    const normalized = Math.max(cardMin, Math.min(compressed, cardMax));
    
    // Log significant compressions
    if(compressed !== normalized){
      console.debug(`[fast-forward] duration ${ms}ms -> ${compressed}ms (clamped to ${normalized}ms, range: ${cardMin}-${cardMax}ms)`);
    } else {
      console.debug(`[fast-forward] duration ${ms}ms -> ${normalized}ms`);
    }
    
    return normalized;
  }
  global.normalizeDuration = normalizeDuration;

  /* ===== Basic Accessors ===== */
  function getP(id){ return game.players.find(p=>p.id===id); }
  function safeName(id){ return getP(id)?.name||'(?)'; }
  function alivePlayers(){ return game.players.filter(p=>!p.evicted); }
  function fmtList(ids){ return ids.map(safeName).join(', '); }

  /* ===== Player Creation ===== */
  function pushPlayer({name,human=false}){
    const id=(game.players.length?Math.max(...game.players.map(p=>p.id))+1:1);
    const skill=human?0.55:0.35+rng()*0.5;
    
    // Enhanced compBeast with archetype adjustments
    let compBeast = 0.35 + rng()*0.30; // Base range 0.35-0.65
    const persona={ aggr:0.25+rng()*0.7, loyalty:0.25+rng()*0.7, chaos:0.1+rng()*0.5 };
    
    // Avatar will be resolved by resolveAvatar() which checks ./avatars/ folder first
    const avatar=`./avatars/${id}.jpg`;
    const meta={
      age:21+Math.floor(rng()*29),
      sex:SEXES[Math.floor(rng()*SEXES.length)],
      loc:LOCATIONS[Math.floor(rng()*LOCATIONS.length)],
      trait:TRAITS[Math.floor(rng()*TRAITS.length)],
      occupation:OCCUPATIONS[Math.floor(rng()*OCCUPATIONS.length)],
      sexuality:SEXUALITIES[Math.floor(rng()*SEXUALITIES.length)],
      ethnicity:ETHNICITIES[Math.floor(rng()*ETHNICITIES.length)],
      motto:MOTTOS[Math.floor(rng()*MOTTOS.length)]
    };
    
    // Archetype-based compBeast adjustments
    const trait = meta.trait?.toLowerCase() || '';
    if(trait.includes('athlete') || trait.includes('physical')) compBeast += 0.15;
    else if(trait.includes('strategist') || trait.includes('mastermind')) compBeast += 0.05;
    else if(trait.includes('wildcard') || trait.includes('unpredictable')) compBeast += (rng() - 0.5) * 0.2;
    else if(trait.includes('slacker') || trait.includes('lazy')) compBeast -= 0.05;
    
    // Clamp to 0.2-0.9 range
    compBeast = Math.max(0.2, Math.min(0.9, compBeast));
    
    // For human, use balanced starting value
    if(human) compBeast = 0.5;
    
    const wins={hoh:0,veto:0};
    const p={ id,name,human,evicted:false,nominated:false,hoh:false,
      persona,skill,compBeast,affinity:{},stats:{hohWins:0,vetoWins:0},wins,
      threat:THREAT_BASE,weekEvicted:null,winner:false,runnerUp:false,
      avatar,meta,
      nominationState:'none', // State machine: none, nominated, pendingSave, saved, replacement
      showFinalLabel:null // Final labels: WINNER, RUNNER-UP (overrides other labels)
    };
    game.players.push(p);
    if(human) game.humanId=id;
  }

  function initAffinities(keep=false){
    for(const a of game.players)
      for(const b of game.players){
        if(a.id===b.id) continue;
        if(keep && typeof a.affinity[b.id]==='number') continue;
        a.affinity[b.id]=(rng()-0.5)*0.4;
      }
  }

  /* ===== Relationships & Alliances ===== */
  function bondKey(a,b){ const [l,h]=[Math.min(a,b),Math.max(a,b)]; return `${l}-${h}`; }
  function initRelationships(){
    if(!game.relationships) game.relationships={};
    for(let i=0;i<game.players.length;i++)
      for(let j=i+1;j<game.players.length;j++){
        const k=bondKey(game.players[i].id,game.players[j].id);
        if(!(k in game.relationships)) game.relationships[k]=0;
      }
  }
  function getBond(a,b){ return game.relationships[bondKey(a,b)]||0; }
  function setBond(a,b,val){
    const k=bondKey(a,b);
    const old=game.relationships[k]||0;
    const nv=Math.max(-100,Math.min(100,val));
    game.relationships[k]=nv;
    if(Math.abs(nv-old)>=12 && global.addLog) global.addLog(`Bond shift: ${safeName(a)} ↔ ${safeName(b)} ${nv-old>0?'+':''}${nv-old}`,'muted');
  }
  function addBond(a,b,d){ setBond(a,b,getBond(a,b)+d); }
  function inSameAlliance(a,b){ return game.alliances.some(al=>al.members.includes(a)&&al.members.includes(b)); }
  function recomputeAllianceCohesion(al){
    let sum=0,c=0;
    for(let i=0;i<al.members.length;i++)
      for(let j=i+1;j<al.members.length;j++){ sum+=getBond(al.members[i].id,al.members[j].id); c++; }
    al.cohesion=c?Math.round(sum/c):0;
  }
  function formAlliance(memberIds){
    if(memberIds.length<3||memberIds.length>MAX_ALLIANCE_SIZE) return;
    for(let i=0;i<memberIds.length;i++)
      for(let j=i+1;j<memberIds.length;j++)
        if(getBond(memberIds[i],memberIds[j])<ALLIANCE_FORM_THRESHOLD) return;
    const sorted=[...memberIds].sort((a,b)=>a-b);
    if(game.alliances.some(al=>al.members.length===sorted.length &&
      [...al.members].sort((x,y)=>x-y).every((id,i)=>id===sorted[i]))) return;
    const al={id:Date.now()+Math.floor(Math.random()*9999),members:[...memberIds],cohesion:0};
    recomputeAllianceCohesion(al);
    game.alliances.push(al);
    global.addLog && global.addLog(`Alliance formed: [${memberIds.map(safeName).join(', ')}] cohesion ${al.cohesion}`,'success');
  }
  function pruneAlliances(){
    const removed=[];
    for(const al of game.alliances){
      let bad=false,reason='';
      if(al.members.length<2){bad=true;reason='too small';}
      else if(al.cohesion<ALLIANCE_PRUNE_THRESHOLD){bad=true;reason='low cohesion';}
      else{
        for(let i=0;i<al.members.length && !bad;i++)
          for(let j=i+1;j<al.members.length;j++)
            if(getBond(al.members[i],al.members[j])<-25){bad=true;reason='conflict';break;}
      }
      if(bad){ removed.push(al); global.addLog && global.addLog(`Alliance dissolved: [${al.members.map(safeName).join(', ')}] (${reason})`,'muted'); }
    }
    game.alliances=game.alliances.filter(a=>!removed.includes(a));
  }
  function tryFormAlliances(){
    const alive=alivePlayers(); if(alive.length<3) return;
    if(rng()<0.25){
      const ids=alive.map(p=>p.id);
      for(let size=3; size<=Math.min(5,ids.length); size++){
        if(rng()>0.18) continue;
        const sample=ids.slice().sort(()=>rng()-0.5).slice(0,size);
        if(sample.every((a,i)=>sample.slice(i+1).every(b=>getBond(a,b)>=ALLIANCE_FORM_THRESHOLD)))
          formAlliance(sample);
      }
    }
  }
  function socialPhaseTick(){
    if(alivePlayers().length<2) return;
    // drift + alliance maintenance
    for(const k in game.relationships){
      const v=game.relationships[k];
      if(v>0) game.relationships[k]=Math.max(0,v-DRIFT_STEP);
      else if(v<0) game.relationships[k]=Math.min(0,v+DRIFT_STEP);
    }
    game.alliances.forEach(recomputeAllianceCohesion);
    pruneAlliances();
    tryFormAlliances();
  }

  /* ===== Affinity Helpers ===== */
  function allyNames(p){ return Object.entries(p.affinity||{}).filter(([id,v])=>v>=ALLY_T && !getP(+id).evicted).map(([id])=>safeName(+id)); }
  function enemyNames(p){ return Object.entries(p.affinity||{}).filter(([id,v])=>v<=ENEMY_T && !getP(+id).evicted).map(([id])=>safeName(+id)); }
  function avgAffinity(p){ const vals=Object.values(p.affinity||{}); return vals.length?vals.reduce((a,b)=>a+b,0)/vals.length:0; }
  function updatePlayerThreat(p){ p.threat=THREAT_BASE+0.1*(p.wins.hoh+p.wins.veto); }

  /* ===== Badge State Synchronization ===== */
  // Synchronize per-player properties (p.hoh, p.nominated, p.nominationState) with game state (g.hohId, g.nominees)
  // This ensures badge rendering always matches the true HOH and nominees state
  function syncPlayerBadgeStates(){
    const g = game;
    const nominees = Array.isArray(g.nominees) ? g.nominees : [];
    const nomineeSet = new Set(nominees);
    
    for(const p of g.players){
      // Sync HOH badge
      p.hoh = (p.id === g.hohId);
      
      // Sync nomination badge and state
      const isNominated = nomineeSet.has(p.id);
      p.nominated = isNominated;
      
      // Only update nominationState if it's not in a transition state (pendingSave, saved, replacement)
      // During veto ceremony, these states are managed by veto.js
      if(p.nominationState !== 'pendingSave' && p.nominationState !== 'saved' && p.nominationState !== 'replacement'){
        p.nominationState = isNominated ? 'nominated' : 'none';
      }
    }
  }

  /* ===== Fast-Forward Activation ===== */
  /**
   * Activate fast-forward mode with specified multiplier.
   * @param {Object} options - Fast-forward options
   * @param {number} options.multiplier - Speed multiplier (default: 0.1 = 10x speed)
   * @param {string} options.reason - Reason for activation (for logging)
   */
  function activateFastForward(options){
    options = options || {};
    
    // Always use window.game as single source of truth
    const g = global.game;
    if(!g){
      console.warn('[fast-forward] window.game not available, cannot activate');
      return;
    }
    
    const multiplier = options.multiplier || g.cfg?.fastForwardMultiplier || 0.1;
    const reason = options.reason || 'user';
    
    // Guard against reentrant activation
    if(g.__ffActive){
      console.info('[fast-forward] already active, ignoring duplicate activation');
      return;
    }
    
    // Write to window.game (single source of truth)
    g.__ffActive = true;
    g.__ffMultiplier = multiplier;
    
    // Keep internal game reference in sync (if different object)
    // This is necessary because the local `game` variable at the top of this module
    // is assigned before window.game may be fully initialized, and some internal
    // functions may still reference the local `game` object. This dual-write ensures
    // backward compatibility while transitioning to window.game as the canonical source.
    if(game !== g){
      game.__ffActive = true;
      game.__ffMultiplier = multiplier;
    }
    
    const phase = g.phase || 'unknown';
    console.info(`[fast-forward] activated (mult=${multiplier}, phase=${phase}, reason=${reason})`);
    
    // Compress remaining phase timer if applicable
    const now = Date.now();
    if(g.phaseEndsAt && g.phaseEndsAt > now){
      const remainingOriginal = g.phaseEndsAt - now;
      const remainingCompressed = normalizeDuration(remainingOriginal);
      g.phaseEndsAt = now + remainingCompressed;
      
      // Keep endAt in sync
      if(g.endAt && g.endAt > now){
        g.endAt = g.phaseEndsAt;
      }
      
      console.info(`[fast-forward] phase timer compressed: ${remainingOriginal}ms -> ${remainingCompressed}ms`);
    }
    
    // Enforce minimum phase window to ensure perceptible playback
    const minWindow = g.cfg?.fastForwardMinPhaseWindowMs || 1500;
    if(g.phaseEndsAt && g.phaseEndsAt - now < minWindow){
      g.phaseEndsAt = now + minWindow;
      if(g.endAt && g.endAt < g.phaseEndsAt){
        g.endAt = g.phaseEndsAt;
      }
      console.info(`[fast-forward] enforced min phase window: ${minWindow}ms (ensuring perceptible playback)`);
    }
  }
  global.activateFastForward = activateFastForward;
  
  /**
   * Deactivate fast-forward mode (reset to normal speed).
   * Called automatically at phase boundaries.
   */
  function deactivateFastForward(){
    // Always use window.game as single source of truth
    const g = global.game;
    if(!g) return;
    
    if(!g.__ffActive) return;
    
    // Write to window.game (single source of truth)
    g.__ffActive = false;
    g.__ffMultiplier = 1;
    
    // Keep internal game reference in sync (if different object)
    // This is necessary because the local `game` variable at the top of this module
    // is assigned before window.game may be fully initialized, and some internal
    // functions may still reference the local `game` object. This dual-write ensures
    // backward compatibility while transitioning to window.game as the canonical source.
    if(game !== g){
      game.__ffActive = false;
      game.__ffMultiplier = 1;
    }
    
    console.info('[fast-forward] deactivated (normal speed restored)');
  }
  global.deactivateFastForward = deactivateFastForward;

  /* ===== Exports ===== */
  global.game=game;
  global.TRAITS=TRAITS;
  global.rng=rng;
  global.clamp=clamp;
  global.pushPlayer=pushPlayer;
  global.initAffinities=initAffinities;
  global.initRelationships=initRelationships;
  global.getP=getP;
  global.safeName=safeName;
  global.alivePlayers=alivePlayers;
  global.fmtList=fmtList;
  global.addBond=addBond;
  global.inSameAlliance=inSameAlliance;
  global.socialPhaseTick=socialPhaseTick;
  global.allyNames=allyNames;
  global.enemyNames=enemyNames;
  global.avgAffinity=avgAffinity;
  global.updatePlayerThreat=updatePlayerThreat;
  global.syncPlayerBadgeStates=syncPlayerBadgeStates;

  global.ALLY_T=ALLY_T;
  global.ENEMY_T=ENEMY_T;
  global.STRONG_ALLY=STRONG_ALLY;
  global.NOMINATION_PENALTY=NOMINATION_PENALTY;
  global.SAVED_WITH_VETO_REWARD=SAVED_WITH_VETO_REWARD;
  global.VETO_NOT_USED_ON_ALLY_PENALTY=VETO_NOT_USED_ON_ALLY_PENALTY;
  global.SHARED_VOTE_REWARD=SHARED_VOTE_REWARD;
  global.REL_VETO_FRIEND_THRESHOLD=REL_VETO_FRIEND_THRESHOLD;
  global.REL_VETO_HOH_COHESION=REL_VETO_HOH_COHESION;
  global.THREAT_BASE=THREAT_BASE;
  global.DRIFT_STEP=DRIFT_STEP;
  global.ALLIANCE_FORM_THRESHOLD=ALLIANCE_FORM_THRESHOLD;
  global.ALLIANCE_PRUNE_THRESHOLD=ALLIANCE_PRUNE_THRESHOLD;
  global.MAX_ALLIANCE_SIZE=MAX_ALLIANCE_SIZE;

})(window);