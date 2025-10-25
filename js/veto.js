// MODULE: veto.js
// Integrated: automatic 0 submission for human participant if time expires without submission.
// Other flow unchanged.

(function(global){
  'use strict';

  function getP(id){ return (global.getP ? global.getP(id) : null); }
  function alivePlayers(){ return (global.alivePlayers ? global.alivePlayers() : []); }
  function safeName(id){
    try{ return global.safeName ? global.safeName(id) : String(id); }
    catch(e){ return String(id); }
  }
  function rng(){
    try{ return (global.rng && typeof global.rng==='function') ? global.rng() : Math.random(); }
    catch(e){ return Math.random(); }
  }

  // Veto decision phrase pools
  const VETO_USE_PHRASES = [
    'I have decided to use the Power of Veto on...',
    'I am using the Veto to save...',
    'I have chosen to use the Power of Veto.',
    'The Power of Veto will be used this week.',
    'I am pulling someone off the block.',
    'I have made my decision — I am using the Veto.'
  ];

  const VETO_NOT_USE_PHRASES = [
    'I have decided not to use the Power of Veto.',
    'I am keeping the nominations the same.',
    'The Power of Veto will not be used this week.',
    'I have chosen to leave the nominations as they are.',
    'I am not using the Veto.',
    'The nominations will stay the same.',
    'I have decided to respect the HOH\'s nominations.'
  ];

  // Nominee reaction phrases (when veto is not used)
  const NOMINEE_REACTION_PHRASES = [
    'I\'ll campaign hard this week.',
    'I\'m not out yet.',
    'I need to hustle and make connections.',
    'Time to fight for votes.',
    'I\'m going to work my social game.',
    'I won\'t give up without a fight.'
  ];

  // HOH replacement announcement phrases
  const HOH_REPLACEMENT_PHRASES = [
    'I have decided to choose {name} as the replacement nominee. Nothing personal, just a game move.',
    'As HOH, I am nominating {name} as the replacement. This is a strategic decision.',
    'I choose {name} to be the replacement nominee. It\'s purely game.',
    '{name}, I\'m sorry, but I have to nominate you as the replacement.',
    'My replacement nominee is {name}. This is the best move for my game.'
  ];

  function pickPhrase(arr){
    return arr[Math.floor(rng()*arr.length)];
  }

  // ======= POV TWIST LOGIC =======
  
  /**
   * Decide if a veto twist is active for the current week
   * Only rolls once per week and persists the result
   * Diamond outranks Golden if both hit
   */
  function decideVetoTwistForWeek(){
    var g = global.game;
    if(!g) return null;
    
    // Only decide once per week
    if(g.__vetoTwistDecidedWeek === g.week){
      return g.activeVetoTwist || null;
    }
    
    // Reset twist state for new week
    g.activeVetoTwist = null;
    g.__vetoTwistDecidedWeek = g.week;
    
    // Get config chances (default to 0 if not set)
    var diamondChance = Number(g.cfg?.diamondPOVChance || 0);
    var goldenChance = Number(g.cfg?.goldenPOVChance || 0);
    
    // No twists configured
    if(diamondChance <= 0 && goldenChance <= 0) return null;
    
    // Roll for Diamond first (priority)
    if(diamondChance > 0){
      var diamondRoll = rng() * 100;
      if(diamondRoll < diamondChance){
        g.activeVetoTwist = 'diamond';
        return 'diamond';
      }
    }
    
    // Roll for Golden (independent roll)
    if(goldenChance > 0){
      var goldenRoll = rng() * 100;
      if(goldenRoll < goldenChance){
        g.activeVetoTwist = 'golden';
        return 'golden';
      }
    }
    
    return null;
  }
  
  /**
   * Get the active veto twist name for display
   */
  function getActiveVetoTwistName(){
    var g = global.game;
    if(!g || !g.activeVetoTwist) return null;
    
    if(g.activeVetoTwist === 'diamond') return 'Diamond Power of Veto';
    if(g.activeVetoTwist === 'golden') return 'Golden Power of Veto';
    
    return null;
  }
  
  global.decideVetoTwistForWeek = decideVetoTwistForWeek;
  global.getActiveVetoTwistName = getActiveVetoTwistName;

  function sample(arr, k){
    var a = arr.slice();
    for(var i=a.length-1;i>0;i--){
      var j = Math.floor(rng()*(i+1));
      var tmp=a[i]; a[i]=a[j]; a[j]=tmp;
    }
    return a.slice(0, Math.max(0, Math.min(k, a.length)));
  }

  function computeVetoParticipants(){
    var g = global.game;
    var alive = alivePlayers();
    var aliveIds = alive.map(function(p){ return p.id; });

    if(aliveIds.length <= 5){
      return aliveIds.slice();
    }

    var hoh = g.hohId;
    var nominees = (g.nominees || []).slice();
    var baseSet = {};
    baseSet[hoh] = true;
    for(var i=0;i<nominees.length;i++){ baseSet[nominees[i]] = true; }

    var base = [];
    for(i=0;i<aliveIds.length;i++){
      var id = aliveIds[i];
      if(baseSet[id]) base.push(id);
    }

    var targetTotal = Math.min(6, aliveIds.length);
    var need = Math.max(0, targetTotal - base.length);

    var pool = [];
    for(i=0;i<aliveIds.length;i++){
      id = aliveIds[i];
      if(!baseSet[id]) pool.push(id);
    }

    var drawn = sample(pool, need);
    var finalSet = base.concat(drawn);

    var seen = {};
    var unique = [];
    for(i=0;i<finalSet.length;i++){
      id = finalSet[i];
      if(!seen[id]){ seen[id]=true; unique.push(id); }
    }
    // Ensure all IDs are numeric to avoid string/number mismatches downstream
    return unique.map(function(x){ return +x; });
  }

  function submitGuarded(id, base, mult, label){
    var g = global.game;
    g.lastCompScores = g.lastCompScores || new Map();
    // Normalize inputs to numeric and guard duplicate submissions
    id = +id;
    base = +base;
    mult = (mult==null ? 1 : +mult) || 1;
    if(g.lastCompScores.has(id)) return false;

    var finalScore = base * mult;
    g.lastCompScores.set(id, finalScore);

    try{
      if(global.addLog){
        // Hide raw scores during veto competition - only log completion
        global.addLog(safeName(id)+' completed the Veto competition.', 'tiny');
      }
    }catch(e){}

    try{
      if((g.phase==='veto_comp' || g.phase==='veto') && id===g.humanId){
        var host = document.querySelector('#panel .minigame-host');
        if(host){
          var ctrls = host.querySelectorAll('button, input, select, textarea');
            for(var k=0;k<ctrls.length;k++){ ctrls[k].disabled = true; }
        }
        if(typeof window.CustomEvent === 'function'){
          window.dispatchEvent(new CustomEvent('bb:comp:submitted', { detail: { kind: 'veto' } }));
        }
      }
    }catch(e){}

    return true;
  }
  global.__submitGuarded = submitGuarded;

  function startVetoComp(){
    var g = global.game;
    g.lastCompScores = new Map();
    g.__vetoCeremonyResolved = false;
    g.__vetoNarrativeShown = false;
    g.__vetoDecisionInProgress = false;
    g.__vetoAutoTimer = null;
    g.__replacementCommitted = false;
    g.__replacementApplied = false;

    g.__vetoPlayers = computeVetoParticipants();
    // Normalize to numeric again in case upstream changed shape
    if(Array.isArray(g.__vetoPlayers)){
      g.__vetoPlayers = g.__vetoPlayers.map(function(x){ return +x; }); }

    if(global.tv && typeof global.tv.say==='function') global.tv.say('Veto Competition');
    if(typeof global.phaseMusic==='function') global.phaseMusic('veto_comp');
    if(typeof global.setPhase==='function') global.setPhase('veto_comp', g.cfg && g.cfg.tVeto || 40, finishVetoComp);

    // Decide and announce POV twist if active
    var twist = decideVetoTwistForWeek();
    if(twist && typeof global.showEventModal === 'function'){
      var twistConfig = null;
      
      if(twist === 'diamond'){
        twistConfig = {
          title: 'Twist Alert!',
          emojis: '💎✨',
          subtitle: 'The Diamond Power of Veto is in play. The POV holder may replace both nominees. The HOH cannot be named as a replacement.',
          tone: 'twist',
          duration: 5000
        };
      } else if(twist === 'golden'){
        twistConfig = {
          title: 'Twist Alert!',
          emojis: '🏆✨',
          subtitle: 'The Golden Power of Veto is in play. The POV holder will choose the replacement nominee (not the HOH).',
          tone: 'twist',
          duration: 5000
        };
      }
      
      if(twistConfig){
        // Show twist announcement (non-blocking)
        setTimeout(function(){
          if(typeof global.showEventModal === 'function'){
            global.showEventModal(twistConfig);
          }
        }, 500);
      }
    }

    var panel = document.querySelector('#panel');
    if(panel){
      panel.innerHTML = '';
      var host = document.createElement('div');
      host.className = 'minigame-host';
      var names = g.__vetoPlayers.map(safeName).join(', ');
      host.innerHTML = '<div class="tiny">Players: '+names+'</div>';
      panel.appendChild(host);
    }

    var you = (g.humanId!=null) ? getP(g.humanId) : null;
    var humanIn = !!(you && !you.evicted && g.__vetoPlayers.indexOf(you.id)!==-1);
    // humanIn will be correct because g.__vetoPlayers and you.id are numeric now

    if(humanIn){
      var mg = (typeof global.pickMinigameType==='function') ? global.pickMinigameType() : 'clicker';
      var hostNode = document.querySelector('#panel .minigame-host');
      
      if(hostNode){
        // Use new competition flow with guards if available
        if(typeof global.runHumanMinigameWithGuards === 'function'){
          global.runHumanMinigameWithGuards({
            mg: mg,
            host: hostNode,
            player: you,
            label: 'Veto/' + mg,
            multiplier: (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6),
            onAfterSubmit: function(){
              // Callback after submission
            }
          });
        } else if(typeof global.renderMinigame==='function'){
          // Fallback to legacy rendering
          var playWrap = document.createElement('div');
          playWrap.className = 'col';
          global.renderMinigame(mg, playWrap, function(base){
            // Use compBeast for human too (no guaranteed wins)
            var humanMultiplier = (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6);
            submitGuarded(you.id, base, humanMultiplier, 'Veto/'+mg);
          });
          hostNode.appendChild(playWrap);
        }
        else {
          // Last-resort fallback: if no modern or legacy renderer is available,
          // auto-submit a zero so the flow cannot stall.
          setTimeout(function(){ submitGuarded(you.id, 0, 1, 'Veto/AutoFallback'); }, 200);
        }
      }
    } else {
      var host2 = document.querySelector('#panel .minigame-host');
      if(host2){
        var note = document.createElement('div');
        note.className = 'tiny muted';
        note.textContent = 'You were not drawn to play in this Veto. Waiting for results…';
        host2.appendChild(note);
      }
    }

    var aiList = [];
    for(var i=0;i<g.__vetoPlayers.length;i++){
      var pid = g.__vetoPlayers[i];
      if(you && pid===you.id) continue;
      aiList.push(pid);
    }
    for(i=0;i<aiList.length;i++){
      (function wrap(id){
        var p = getP(id);
        if(!p || p.human) return;
        setTimeout(function(){
          if(!global.game || global.game.phase!=='veto_comp') return;
          // Use compBeast for fairer AI scoring
          var baseScore = 8 + rng()*20;
          var aiMultiplier = (0.75 + (p.compBeast || 0.5) * 0.6);
          submitGuarded(+id, baseScore, aiMultiplier, 'Veto/AI');
        }, 300 + rng()*((g.cfg && g.cfg.tVeto || 40)*620));
      })(aiList[i]);
    }
  }
  global.startVetoComp = startVetoComp;

  function humanIsParticipant(){
    var g = global.game;
    var you = (g && g.humanId!=null) ? getP(g.humanId) : null;
    if(!you || you.evicted) return false;
    return Array.isArray(g.__vetoPlayers) && g.__vetoPlayers.indexOf(you.id)!==-1;
  }
  function humanSubmitted(){
    var g = global.game;
    var you = (g && g.humanId!=null) ? getP(g.humanId) : null;
    if(!you || you.evicted) return true;
    if(!humanIsParticipant()) return true;
    return !!(g.lastCompScores && g.lastCompScores.has(you.id));
  }

  // Veto suspense reveal sequence
  async function showVetoRevealSequence(top3){
    // Convert top3 format from [[id, score], ...] to [{name, id, score}, ...]
    const formatted = top3.map(function(entry){
      return { id: entry[0], name: safeName(entry[0]), score: entry[1] };
    });
    
    // Use reusable tri-slot reveal if available
    if(typeof global.showTriSlotReveal === 'function'){
      try{
        await global.showTriSlotReveal({
          title: 'Veto Competition',
          topThree: formatted,
          winnerEmoji: '🛡️',
          winnerTone: 'veto',
          showIntro: false, // Skip intro for cleaner reveal
          useNewPopup: true // Use new popup design with avatars
        });
        return;
      }catch(e){
        console.warn('[veto] tri-slot reveal error, using fallback', e);
      }
    }
    
    // Fallback to original implementation if reusable component not available
    function sleep(ms){ return new Promise(function(r){ setTimeout(r, ms); }); }
    
    try{
      // Show 3 '?' cards first
      if(typeof global.showCard==='function'){
        global.showCard('Veto Results', ['Revealing top 3...'], 'veto', 2000);
      }
      if(typeof global.cardQueueWaitIdle==='function'){
        await global.cardQueueWaitIdle();
      }
      await sleep(400);
      
      // Reveal 3rd place
      if(top3[2]){
        if(typeof global.showCard==='function'){
          global.showCard('3rd Place', [safeName(top3[2][0])], 'neutral', 2000);
        }
        if(typeof global.cardQueueWaitIdle==='function'){
          await global.cardQueueWaitIdle();
        }
        await sleep(1200);
      }
      
      // Reveal 2nd place
      if(top3[1]){
        if(typeof global.showCard==='function'){
          global.showCard('2nd Place', [safeName(top3[1][0])], 'neutral', 2000);
        }
        if(typeof global.cardQueueWaitIdle==='function'){
          await global.cardQueueWaitIdle();
        }
        await sleep(1200);
      }
      
      // Reveal winner with veto badge
      if(top3[0]){
        if(typeof global.showCard==='function'){
          global.showCard('Veto Winner 🛡️', [safeName(top3[0][0])], 'veto', 3200);
        }
        if(typeof global.cardQueueWaitIdle==='function'){
          await global.cardQueueWaitIdle();
        }
      }
    }catch(e){
      console.warn('[veto] reveal sequence error', e);
    }
  }

  function handlePostVetoReveal(){
    var aliveCount = alivePlayers().length;
    if(aliveCount === 4){
      setTimeout(function(){ startFinal4Eviction(); }, 500);
    } else {
      setTimeout(function(){ startVetoCeremony(); }, 500);
    }
  }

  function finishVetoComp(){
    var g = global.game;
    if(!g || g.phase!=='veto_comp') return;

    // If we still need human input
    if(!humanSubmitted()){
      // Auto-submit 0 if phase timer truly ended (phaseEndsAt set by setPhase)
      if(humanIsParticipant() && g.phaseEndsAt && Date.now() > g.phaseEndsAt + 250){
        submitGuarded(g.humanId, 0, 1, 'Veto/Auto');
      } else {
        setTimeout(finishVetoComp, 700);
        return;
      }
    }

    var eligible = (Array.isArray(g.__vetoPlayers) && g.__vetoPlayers.length)
      ? g.__vetoPlayers.map(function(x){ return +x; })
      : alivePlayers().map(function(p){ return +p.id; });

    // Synthesize AI or absent scores before reveal (fallback assignment)
    (function ensureScores(){
      for(var i=0;i<eligible.length;i++){
        var id = +eligible[i];
        // Some branches may have stored string keys; migrate them to numeric
        if(g.lastCompScores.has(String(id)) && !g.lastCompScores.has(id)){
          var v = g.lastCompScores.get(String(id));
          g.lastCompScores.delete(String(id));
          g.lastCompScores.set(id, +v);
        }
        if(!g.lastCompScores.has(id)){
          g.lastCompScores.set(id, 5 + rng()*5);
        }
      }
    })();

    var arr = [];
    g.lastCompScores.forEach(function(score, pid){
      var pidNum = +pid;
      if(eligible.indexOf(pidNum)!==-1){ arr.push([pidNum, +score]); }
    });
    // Absolute fallback: if filtering ended up empty (e.g., ID type drift), repopulate
    if(arr.length === 0 && eligible.length){
      for(var j=0;j<eligible.length;j++){
        var eid = +eligible[j];
        var s = g.lastCompScores.has(eid) ? +g.lastCompScores.get(eid) : (5 + rng()*5);
        g.lastCompScores.set(eid, s);
        arr.push([eid, s]);
      }
    }
    arr.sort(function(a,b){ return b[1]-a[1]; });

    // Final guard: if still no scores, pick a random eligible to avoid deadlock
    if(!arr.length && eligible.length){
      var pick = eligible[Math.floor(rng()*eligible.length)];
      arr = [[pick, 0]];
    }

    global.game.vetoHolder = arr[0] && arr[0][0];
    var W = getP(global.game.vetoHolder);
    if(W){
      W.stats = W.stats || {};
      W.wins = W.wins || {};
      W.stats.vetoWins = (W.stats.vetoWins||0)+1;
      W.wins.veto = (W.wins.veto||0)+1;
    }

    // Social Maneuvers: Record veto win event for weekly energy bonus
    if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
      try{
        global.SocialManeuvers.recordWeeklyEvent(global.game.vetoHolder, { vetoWin: true });
        console.info('[veto.js] ✓ Recorded veto win event for player', global.game.vetoHolder);
      }catch(e){
        console.error('[veto.js] Failed to record veto win event:', e);
      }
    }

    // Hook: Log XP for POV win
    if(global.ProgressionEvents?.onPOVWin){
      var participants = eligible || [];
      global.ProgressionEvents.onPOVWin(global.game.vetoHolder, participants);
    }

    try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}

    // Build top-3 reveal sequence
    var top3 = arr.slice(0, Math.min(3, arr.length));
    // Defensive: ensure shape is [id, score]
    top3 = top3.filter(function(x){ return x && typeof x[0] !== 'undefined'; });
    if(!top3.length && eligible.length){ top3 = [[eligible[0], 0]]; }

    showVetoRevealSequence(top3).then(function(){
      // Check for Final 4 — skip veto ceremony and go direct to eviction
      handlePostVetoReveal();
    }).catch(function(e){
      console.warn('[veto] reveal error, proceeding', e);
      handlePostVetoReveal();
    });
  }

  /* ===== Final 4 Eviction (Big Brother US/CA Rules) ===== */
  // At Final 4: No veto ceremony. POV holder directly chooses who to evict.
  // The two non-HOH, non-POV players are automatically on the block.
  function startFinal4Eviction(){
    var g = global.game;
    g.__f4EvictionResolved = false;
    g.__f4EvictionInProgress = false;
    
    // Determine the two nominees (non-HOH, non-POV holder)
    var f4 = alivePlayers().map(function(p){ return p.id; });
    var forced = f4.filter(function(id){ return id !== g.hohId && id !== g.vetoHolder; });
    if(forced.length >= 2){
      g.nominees = forced.slice(0, 2);
      g.nomsLocked = true;
      for(var i = 0; i < g.players.length; i++){ 
        g.players[i].nominated = (g.nominees.indexOf(g.players[i].id) !== -1); 
      }
      // Sync player badge states after F4 nominees set
      try{ if(typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates(); }catch(e){}
      try{ if(typeof global.updateHud === 'function') global.updateHud(); }catch(e){}
    }
    
    if(global.tv && typeof global.tv.say === 'function') global.tv.say('Final 4 Eviction');
    if(typeof global.phaseMusic === 'function') global.phaseMusic('livevote');
    
    // Show explanatory card with longer duration for readability
    try{ 
      if(typeof global.showCard === 'function') 
        global.showCard('Final 4', ['As the veto holder, you are the sole vote to evict.'], 'warn', 4000, true); 
    }catch(e){}
    
    (function waitCards(){
      if(typeof global.cardQueueWaitIdle === 'function'){
        try{ global.cardQueueWaitIdle().then(function(){ afterWait(); }); return; }catch(e){}
      }
      afterWait();
    })();
    
    function afterWait(){
      if(typeof global.setPhase === 'function')
        global.setPhase('final4_eviction', Math.max(20, Math.floor(g.cfg.tVote * 0.9)), finalizeFinal4Eviction);
      setTimeout(function(){ renderFinal4EvictionPanel(); }, 50);
      
      var holder = getP(g.vetoHolder);
      if(holder && !holder.human){
        // AI decides after a short delay
        setTimeout(function(){
          var gg = global.game;
          if(gg && gg.phase === 'final4_eviction' && !gg.__f4EvictionResolved){
            try{ finalizeFinal4Eviction(); }catch(e){}
          }
        }, 1200);
      }
    }
  }
  global.startFinal4Eviction = startFinal4Eviction;
  
  function renderFinal4EvictionPanel(){
    var g = global.game;
    var panel = document.querySelector('#panel'); if(!panel) return;
    panel.innerHTML = '';
    var box = document.createElement('div'); box.className = 'minigame-host';
    box.innerHTML = '<h3>Final 4 Eviction</h3>';
    var holder = getP(g.vetoHolder);
    var hoh = getP(g.hohId);
    var noms = (g.nominees || []).map(getP);
    
    var info = document.createElement('div'); info.className = 'tiny';
    info.textContent = 'POV Holder: ' + (holder ? holder.name : '?') + 
                      '. HOH: ' + (hoh ? hoh.name : '?') + 
                      '. Nominees: ' + noms.map(function(n){ return n ? n.name : '?'; }).join(', ') + '.';
    box.appendChild(info);
    
    if(g.__f4EvictionResolved){
      var done = document.createElement('div'); done.className = 'tiny ok'; 
      done.textContent = 'Eviction choice locked.';
      box.appendChild(done); panel.appendChild(box); return;
    }
    
    var note = document.createElement('div'); note.className = 'tiny warn';
    note.style.marginTop = '8px';
    note.textContent = 'At Final 4, the Power of Veto holder has sole power to evict.';
    box.appendChild(note);
    
    if(holder && holder.human){
      var row = document.createElement('div'); row.className = 'row'; row.style.marginTop = '12px';
      function disableAll(){
        var bs = row.querySelectorAll('button');
        for(var i = 0; i < bs.length; i++){ bs[i].disabled = true; }
      }
      
      for(var i = 0; i < g.nominees.length; i++){
        (function wrapEvict(id){
          var p = getP(id);
          var b = document.createElement('button'); 
          b.className = 'btn danger'; 
          b.textContent = 'Evict ' + (p ? p.name : '?');
          b.disabled = !!g.__f4EvictionInProgress;
          b.onclick = async function(){ 
            if(g.__f4EvictionInProgress) return; 
            if(await window.showConfirm('Are you sure you want to evict ' + (p ? p.name : '?') + '?', {
              title: 'Confirm Eviction',
              confirmText: 'Evict',
              tone: 'danger'
            })){
              disableAll(); 
              finalizeFinal4Eviction(id); 
            }
          };
          row.appendChild(b);
        })(g.nominees[i]);
      }
      
      box.appendChild(row);
      var hint = document.createElement('div'); hint.className = 'tiny muted';
      hint.style.marginTop = '8px';
      hint.textContent = 'Choose wisely — your decision determines who moves forward to the Final 3.';
      box.appendChild(hint);
    } else {
      var aiNote = document.createElement('div'); aiNote.className = 'tiny muted'; 
      aiNote.textContent = 'POV holder is deciding…';
      box.appendChild(aiNote);
    }
    
    panel.appendChild(box);
  }
  global.renderFinal4EvictionPanel = renderFinal4EvictionPanel;
  
  async function finalizeFinal4Eviction(targetId){
    var g = global.game;
    if(g.__f4EvictionResolved) return;
    if(g.__f4EvictionInProgress) return;
    
    g.__f4EvictionInProgress = true;
    
    var holder = getP(g.vetoHolder);
    var target = targetId;
    
    // AI decision if not provided
    if(typeof target !== 'number'){
      target = aiFinal4EvictionChoice();
    }
    
    var evictee = getP(target);
    if(!evictee) return;
    
    g.__f4EvictionResolved = true;
    evictee.evicted = true;
    evictee.weekEvicted = g.week;
    evictee.finalRank = 4; // Final 4 eviction = 4th place
    
    global.addLog('Final 4 eviction: <b>' + holder.name + '</b> has chosen to evict <b>' + evictee.name + '</b>.', 'danger');
    
    // Show eviction card with generous duration
    try{ 
      if(typeof global.showCard === 'function') 
        global.showCard('Evicted', [evictee.name + ' has been evicted.', 'Three remain.'], 'evict', 4500, true); 
    }catch(e){}
    
    // Wait for card to display
    if(typeof global.cardQueueWaitIdle === 'function'){
      try{ await global.cardQueueWaitIdle(); }catch(e){}
    }
    
    // Run eviction visual enhancement (avatar animation + roster badge update)
    if(typeof global.runEvictionVisual === 'function'){
      try{
        await global.runEvictionVisual(target, { reason: 'final4' });
      }catch(e){
        console.error('[final4] visual enhancement failed:', e);
      }
    }
    
    // Add to jury if enabled
    if(global.alivePlayers().length <= 9 && g.cfg.enableJuryHouse && !g.juryHouse.includes(target)){
      g.juryHouse.push(target);
    }
    
    // Proceed to next phase
    setTimeout(function(){ proceedAfterFinal4Eviction(); }, 700);
  }
  global.finalizeFinal4Eviction = finalizeFinal4Eviction;
  
  function aiFinal4EvictionChoice(){
    var g = global.game;
    var holder = getP(g.vetoHolder);
    var noms = (g.nominees || []).slice();
    var bestId = null, bestScore = -Infinity;
    
    for(var i = 0; i < noms.length; i++){
      var id = noms[i];
      var cand = getP(id);
      var aff = (holder && holder.affinity && typeof holder.affinity[id] === 'number') ? holder.affinity[id] : 0;
      var threat = cand.threat || 0.5;
      // Evict lower affinity OR higher threat
      var score = (-aff) + threat;
      if(score > bestScore){ bestScore = score; bestId = id; }
    }
    
    return bestId;
  }
  
  function proceedAfterFinal4Eviction(){
    var g = global.game;
    var remain = global.alivePlayers();
    
    if(remain.length === 3){
      // Transition to Final 3
      setTimeout(function(){ 
        if(typeof global.startFinal3Flow === 'function') global.startFinal3Flow(); 
      }, 300);
    } else {
      // Something went wrong, fall back to standard flow
      console.warn('[F4] Unexpected player count after eviction:', remain.length);
      setTimeout(function(){ 
        if(typeof global.advanceWeek === 'function') global.advanceWeek(); 
      }, 500);
    }
    
    try{ if(typeof global.updateHud === 'function') global.updateHud(); }catch(e){}
  }

  /* ===== TV Overlay Helpers for Contained Veto Ceremony UI ===== */
  
  function ensureTVOverlayScaffold(){
    var tvOverlay = document.getElementById('tvOverlay');
    if(!tvOverlay) return null;
    
    // Check if scaffold already exists
    var dim = tvOverlay.querySelector('.tvDim');
    var content = tvOverlay.querySelector('.tvOverlayContent');
    
    if(!dim){
      dim = document.createElement('div');
      dim.className = 'tvDim';
      tvOverlay.appendChild(dim);
    }
    
    if(!content){
      content = document.createElement('div');
      content.className = 'tvOverlayContent';
      tvOverlay.appendChild(content);
    }
    
    return content;
  }
  
  function clearTVOverlayContent(){
    var content = document.querySelector('.tvOverlayContent');
    if(content) content.innerHTML = '';
  }

  // Helper: Show nominee reactions (after veto not used)
  async function showNomineeReactionsSimultaneously(nomineeIds){
    if(!nomineeIds || nomineeIds.length === 0) return;
    
    // Use buildCardWithAvatars if available, otherwise fallback
    if(typeof global.buildCardWithAvatars === 'function'){
      for(var i=0; i<nomineeIds.length; i++){
        var nomId = nomineeIds[i];
        var nom = getP(nomId);
        if(!nom) continue;
        
        var reaction = pickPhrase(NOMINEE_REACTION_PHRASES);
        
        try{
          var card = global.buildCardWithAvatars({
            title: nom.name,
            lines: [reaction],
            tone: 'neutral',
            duration: 2400,
            actorId: nomId,
            type: 'reaction'
          });
          
          if(card){
            // Let the card show itself via the card queue system
            if(typeof global.cardQueueWaitIdle === 'function'){
              await global.cardQueueWaitIdle();
            }
          }
        }catch(e){
          console.warn('[veto] Failed to show nominee reaction for', nomId, e);
        }
        
        // Small delay between reactions
        await new Promise(function(r){ setTimeout(r, 600); });
      }
    }
  }
  
  function showTVCard({title, lines, tone, duration}){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      if(tone) card.setAttribute('data-tone', tone);
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      for(var i=0; i<lines.length; i++){
        var p = document.createElement('p');
        if(i === 0) p.className = 'big';
        p.textContent = lines[i];
        card.appendChild(p);
      }
      
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      setTimeout(function(){
        clearTVOverlayContent();
        if(tv) tv.classList.remove('tvTall');
        resolve();
      }, duration || 2400);
    });
  }
  
  /**
   * Enhanced TV card with avatar support
   * @param {Object} options - Card configuration
   * @param {string} options.title - Card title
   * @param {string[]} options.lines - Card text lines
   * @param {string} options.tone - Card tone/style
   * @param {number} options.duration - Display duration in ms
   * @param {number|number[]} options.actorIds - Actor player ID(s) to show avatars
   * @param {number|number[]} options.subjectIds - Subject player ID(s) to show avatars
   * @returns {Promise} Resolves when card is dismissed
   */
  function showTVCardWithAvatars({title, lines, tone, duration, actorIds, subjectIds}){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      if(tone) card.setAttribute('data-tone', tone);
      
      // Build avatar row if actors/subjects provided
      var hasAvatars = (actorIds && actorIds !== null) || (subjectIds && subjectIds !== null);
      if(hasAvatars){
        var avatarRow = document.createElement('div');
        avatarRow.className = 'tv-card-avatars';
        avatarRow.style.display = 'flex';
        avatarRow.style.gap = '12px';
        avatarRow.style.justifyContent = 'center';
        avatarRow.style.marginBottom = '16px';
        avatarRow.style.flexWrap = 'wrap';
        
        // Add actor avatars
        var actors = Array.isArray(actorIds) ? actorIds : (actorIds != null ? [actorIds] : []);
        for(var i=0; i<actors.length; i++){
          var actorId = actors[i];
          var actor = getP(actorId);
          if(actor){
            var avatarWrap = document.createElement('div');
            avatarWrap.style.display = 'flex';
            avatarWrap.style.flexDirection = 'column';
            avatarWrap.style.alignItems = 'center';
            avatarWrap.style.gap = '6px';
            
            var img = document.createElement('img');
            var resolveAvatar = (global.Game || global).resolveAvatar;
            img.src = resolveAvatar ? resolveAvatar(actor) : (actor.avatar || actor.img || actor.photo);
            if(!img.src){
              img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(actor.name);
            }
            img.alt = actor.name;
            img.style.width = '64px';
            img.style.height = '64px';
            img.style.borderRadius = '12px';
            img.style.border = '2px solid rgba(255,255,255,0.3)';
            img.style.objectFit = 'cover';
            avatarWrap.appendChild(img);
            
            var nameLabel = document.createElement('div');
            nameLabel.className = 'tiny';
            nameLabel.textContent = actor.name;
            nameLabel.style.textAlign = 'center';
            nameLabel.style.fontSize = '12px';
            nameLabel.style.opacity = '0.9';
            avatarWrap.appendChild(nameLabel);
            
            avatarRow.appendChild(avatarWrap);
          }
        }
        
        // Add arrow separator if both actors and subjects exist
        if(actors.length > 0 && subjectIds){
          var arrow = document.createElement('div');
          arrow.textContent = '→';
          arrow.style.fontSize = '32px';
          arrow.style.alignSelf = 'center';
          arrow.style.opacity = '0.7';
          arrow.style.padding = '0 8px';
          avatarRow.appendChild(arrow);
        }
        
        // Add subject avatars
        var subjects = Array.isArray(subjectIds) ? subjectIds : (subjectIds != null ? [subjectIds] : []);
        for(var j=0; j<subjects.length; j++){
          var subjectId = subjects[j];
          var subject = getP(subjectId);
          if(subject){
            var subjectWrap = document.createElement('div');
            subjectWrap.style.display = 'flex';
            subjectWrap.style.flexDirection = 'column';
            subjectWrap.style.alignItems = 'center';
            subjectWrap.style.gap = '6px';
            
            var subjectImg = document.createElement('img');
            var resolveAvatar2 = (global.Game || global).resolveAvatar;
            subjectImg.src = resolveAvatar2 ? resolveAvatar2(subject) : (subject.avatar || subject.img || subject.photo);
            if(!subjectImg.src){
              subjectImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(subject.name);
            }
            subjectImg.alt = subject.name;
            subjectImg.style.width = '64px';
            subjectImg.style.height = '64px';
            subjectImg.style.borderRadius = '12px';
            subjectImg.style.border = '2px solid rgba(255,255,255,0.3)';
            subjectImg.style.objectFit = 'cover';
            subjectWrap.appendChild(subjectImg);
            
            var subjectLabel = document.createElement('div');
            subjectLabel.className = 'tiny';
            subjectLabel.textContent = subject.name;
            subjectLabel.style.textAlign = 'center';
            subjectLabel.style.fontSize = '12px';
            subjectLabel.style.opacity = '0.9';
            subjectWrap.appendChild(subjectLabel);
            
            avatarRow.appendChild(subjectWrap);
          }
        }
        
        card.appendChild(avatarRow);
      }
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      for(var k=0; k<lines.length; k++){
        var p = document.createElement('p');
        if(k === 0) p.className = 'big';
        p.textContent = lines[k];
        card.appendChild(p);
      }
      
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      setTimeout(function(){
        clearTVOverlayContent();
        if(tv) tv.classList.remove('tvTall');
        resolve();
      }, duration || 2400);
    });
  }
  
  function showTVDecision({title, message, buttons}){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(null); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      var p = document.createElement('p');
      p.textContent = message;
      p.style.marginBottom = '20px';
      card.appendChild(p);
      
      var btnRow = document.createElement('div');
      btnRow.className = 'veto-decision-row';
      
      function disableAll(){
        var btns = btnRow.querySelectorAll('button');
        for(var i=0; i<btns.length; i++){ btns[i].disabled = true; }
      }
      
      for(var i=0; i<buttons.length; i++){
        (function(btn){
          var b = document.createElement('button');
          b.className = btn.primary ? 'btn primary' : 'btn';
          b.textContent = btn.label;
          b.setAttribute('aria-label', btn.label);
          b.onclick = function(){
            disableAll();
            clearTVOverlayContent();
            var tv = document.getElementById('tv');
            if(tv) tv.classList.remove('tvTall');
            resolve(btn.value);
          };
          // Keyboard accessibility
          b.onkeydown = function(e){
            if(e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              b.click();
            }
          };
          btnRow.appendChild(b);
        })(buttons[i]);
      }
      
      card.appendChild(btnRow);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Focus first button for accessibility
      setTimeout(function(){
        var firstBtn = btnRow.querySelector('button');
        if(firstBtn) firstBtn.focus();
      }, 100);
    });
  }
  
  function showTVNomineeSavePanel({title, nominees, povId}){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(null); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      var info = document.createElement('p');
      info.textContent = 'Select which nominee to save with the Power of Veto.';
      info.style.marginBottom = '20px';
      card.appendChild(info);
      
      var grid = document.createElement('div');
      grid.className = 'row';
      grid.style.gap = '16px';
      grid.style.justifyContent = 'center';
      grid.style.flexWrap = 'wrap';
      
      function disableAll(){
        var btns = grid.querySelectorAll('button');
        for(var i=0; i<btns.length; i++){ btns[i].disabled = true; }
      }
      
      for(var i=0; i<nominees.length; i++){
        (function(nomId, idx){
          var p = getP(nomId);
          var tile = document.createElement('div');
          tile.className = 'veto-nominee-tile';
          tile.style.animationDelay = (idx * 0.15) + 's';
          
          // Avatar
          var img = document.createElement('img');
          var resolveAvatar = (global.Game || global).resolveAvatar;
          img.src = resolveAvatar ? resolveAvatar(p || nomId) : (p ? (p.avatar || p.img || p.photo) : null);
          if(!img.src){
            // Fallback to dicebear
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(p ? p.name : String(nomId));
          }
          img.alt = p ? p.name : '?';
          tile.appendChild(img);
          
          // Name
          var name = document.createElement('div');
          name.className = 'name';
          name.textContent = p ? p.name : '?';
          tile.appendChild(name);
          
          // Save button
          var b = document.createElement('button');
          b.className = 'btn primary';
          b.textContent = 'Save';
          b.setAttribute('aria-label', 'Save ' + (p ? p.name : '?'));
          b.onclick = function(){
            disableAll();
            clearTVOverlayContent();
            var tv = document.getElementById('tv');
            if(tv) tv.classList.remove('tvTall');
            resolve(nomId);
          };
          b.onkeydown = function(e){
            if(e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              b.click();
            }
          };
          tile.appendChild(b);
          
          grid.appendChild(tile);
        })(nominees[i], i);
      }
      
      card.appendChild(grid);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      setTimeout(function(){
        var firstBtn = grid.querySelector('button');
        if(firstBtn) firstBtn.focus();
      }, 100);
    });
  }
  
  /**
   * Animate nomination transfer with badge movement
   * Shows old nominees → new nominees with NOM badge animation
   * @param {Object} options - Animation configuration
   * @param {number[]} options.fromIds - Old nominee IDs (losing NOM badge)
   * @param {number[]} options.toIds - New nominee IDs (gaining NOM badge)
   * @param {number} options.duration - Animation duration in ms (default 4000)
   * @returns {Promise} Resolves when animation completes
   */
  function animateNominationTransfer({fromIds, toIds, duration}){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(); return; }
      
      clearTVOverlayContent();
      
      var animDuration = duration || 4000;
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      
      var h3 = document.createElement('h3');
      h3.textContent = 'Nomination Change';
      card.appendChild(h3);
      
      var scene = document.createElement('div');
      scene.className = 'transfer-scene';
      
      // Left group: old nominees (FROM)
      if(fromIds && fromIds.length > 0){
        var fromGroup = document.createElement('div');
        fromGroup.className = 'transfer-group';
        
        var fromLabel = document.createElement('div');
        fromLabel.className = 'transfer-group-label';
        fromLabel.textContent = 'Saved';
        fromGroup.appendChild(fromLabel);
        
        var fromPlayers = document.createElement('div');
        fromPlayers.className = 'transfer-players';
        
        for(var i=0; i<fromIds.length; i++){
          var fromId = fromIds[i];
          var fromP = getP(fromId);
          
          var fromTile = document.createElement('div');
          fromTile.className = 'transfer-player';
          
          var fromImg = document.createElement('img');
          var resolveAvatar = (global.Game || global).resolveAvatar;
          fromImg.src = resolveAvatar ? resolveAvatar(fromP || fromId) : (fromP ? (fromP.avatar || fromP.img || fromP.photo) : null);
          if(!fromImg.src){
            fromImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(fromP ? fromP.name : String(fromId));
          }
          fromImg.alt = fromP ? fromP.name : '?';
          fromTile.appendChild(fromImg);
          
          var fromName = document.createElement('div');
          fromName.className = 'name';
          fromName.textContent = fromP ? fromP.name : '?';
          fromTile.appendChild(fromName);
          
          // Badge that will animate out
          var fromBadge = document.createElement('div');
          fromBadge.className = 'badge nom';
          fromBadge.textContent = 'NOM';
          fromTile.appendChild(fromBadge);
          
          fromPlayers.appendChild(fromTile);
          
          // Trigger badge swap-out animation after brief delay
          (function(badge){
            setTimeout(function(){
              badge.classList.add('swapping-out');
            }, 800);
          })(fromBadge);
        }
        
        fromGroup.appendChild(fromPlayers);
        scene.appendChild(fromGroup);
      }
      
      // Arrow(s) between groups
      var arrowContainer = document.createElement('div');
      if(toIds && toIds.length > 1){
        arrowContainer.className = 'transfer-multi-arrow';
        for(var j=0; j<toIds.length; j++){
          var arrow = document.createElement('div');
          arrow.className = 'transfer-arrow';
          arrow.textContent = '→';
          arrow.style.setProperty('--arrow-index', j);
          arrowContainer.appendChild(arrow);
        }
      } else {
        arrowContainer.className = 'transfer-arrow';
        arrowContainer.textContent = '→';
      }
      scene.appendChild(arrowContainer);
      
      // Right group: new nominees (TO)
      if(toIds && toIds.length > 0){
        var toGroup = document.createElement('div');
        toGroup.className = 'transfer-group';
        
        var toLabel = document.createElement('div');
        toLabel.className = 'transfer-group-label';
        toLabel.textContent = 'Nominated';
        toGroup.appendChild(toLabel);
        
        var toPlayers = document.createElement('div');
        toPlayers.className = 'transfer-players';
        
        for(var k=0; k<toIds.length; k++){
          var toId = toIds[k];
          var toP = getP(toId);
          
          var toTile = document.createElement('div');
          toTile.className = 'transfer-player new-nominee';
          
          var toImg = document.createElement('img');
          var resolveAvatar2 = (global.Game || global).resolveAvatar;
          toImg.src = resolveAvatar2 ? resolveAvatar2(toP || toId) : (toP ? (toP.avatar || toP.img || toP.photo) : null);
          if(!toImg.src){
            toImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(toP ? toP.name : String(toId));
          }
          toImg.alt = toP ? toP.name : '?';
          toTile.appendChild(toImg);
          
          var toName = document.createElement('div');
          toName.className = 'name';
          toName.textContent = toP ? toP.name : '?';
          toTile.appendChild(toName);
          
          // Badge that will animate in
          var toBadge = document.createElement('div');
          toBadge.className = 'badge nom swapping-in';
          toBadge.textContent = 'NOM';
          toTile.appendChild(toBadge);
          
          toPlayers.appendChild(toTile);
        }
        
        toGroup.appendChild(toPlayers);
        scene.appendChild(toGroup);
      }
      
      card.appendChild(scene);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Resolve after animation completes
      setTimeout(function(){
        clearTVOverlayContent();
        if(tv) tv.classList.remove('tvTall');
        resolve();
      }, animDuration);
    });
  }
  
  // Render badge swap animation
  function renderBadgeSwap(savedId, replacementId){
    return new Promise(function(resolve){
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      
      var h3 = document.createElement('h3');
      h3.textContent = 'Nominee Change';
      card.appendChild(h3);
      
      var container = document.createElement('div');
      container.className = 'veto-badge-swap-container';
      
      // Left tile: old nominee (being saved)
      var savedP = getP(savedId);
      var leftTile = document.createElement('div');
      leftTile.className = 'veto-badge-swap-tile';
      
      var leftImg = document.createElement('img');
      var resolveAvatar = (global.Game || global).resolveAvatar;
      leftImg.src = resolveAvatar ? resolveAvatar(savedP || savedId) : (savedP ? (savedP.avatar || savedP.img || savedP.photo) : null);
      if(!leftImg.src){
        leftImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(savedP ? savedP.name : String(savedId));
      }
      leftImg.alt = savedP ? savedP.name : '?';
      leftTile.appendChild(leftImg);
      
      var leftName = document.createElement('div');
      leftName.className = 'name';
      leftName.textContent = savedP ? savedP.name : '?';
      leftTile.appendChild(leftName);
      
      var leftBadge = document.createElement('div');
      leftBadge.className = 'badge nom';
      leftBadge.textContent = 'NOM';
      leftTile.appendChild(leftBadge);
      
      container.appendChild(leftTile);
      
      // Arrow
      var arrow = document.createElement('div');
      arrow.className = 'veto-badge-swap-arrow';
      arrow.textContent = '⇄';
      container.appendChild(arrow);
      
      // Right tile: new replacement
      var repP = getP(replacementId);
      var rightTile = document.createElement('div');
      rightTile.className = 'veto-badge-swap-tile';
      
      var rightImg = document.createElement('img');
      rightImg.src = resolveAvatar ? resolveAvatar(repP || replacementId) : (repP ? (repP.avatar || repP.img || repP.photo) : null);
      if(!rightImg.src){
        rightImg.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(repP ? repP.name : String(replacementId));
      }
      rightImg.alt = repP ? repP.name : '?';
      rightTile.appendChild(rightImg);
      
      var rightName = document.createElement('div');
      rightName.className = 'name';
      rightName.textContent = repP ? repP.name : '?';
      rightTile.appendChild(rightName);
      
      var rightBadge = document.createElement('div');
      rightBadge.className = 'badge nom';
      rightBadge.textContent = 'NOM';
      rightTile.appendChild(rightBadge);
      
      container.appendChild(rightTile);
      card.appendChild(container);
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
      
      // Animate after a brief delay
      setTimeout(function(){
        leftTile.classList.add('animating-left');
        rightTile.classList.add('animating-right');
        
        // After animation, swap badges
        setTimeout(function(){
          leftBadge.style.opacity = '0';
          setTimeout(function(){
            clearTVOverlayContent();
            if(tv) tv.classList.remove('tvTall');
            resolve();
          }, 800);
        }, 1400);
      }, 300);
    });
  }
  
  // Prompt for replacement nominee using avatar-first picker
  function promptReplacementNominee(eligibleIds){
    return new Promise(function(resolve){
      // Safety check: handle empty eligible list
      if(!eligibleIds || eligibleIds.length === 0){
        console.warn('[veto] promptReplacementNominee called with empty eligibleIds');
        resolve(null);
        return;
      }
      
      // Calculate blocked IDs (ineligible players)
      var g = global.game;
      var blockedIds = [];
      
      // Add HOH to blocked list
      if(g.hohId != null) blockedIds.push(g.hohId);
      
      // Add current nominees to blocked list
      if(g.nominees && g.nominees.length > 0){
        for(var i=0; i<g.nominees.length; i++){
          if(blockedIds.indexOf(g.nominees[i]) === -1){
            blockedIds.push(g.nominees[i]);
          }
        }
      }
      
      // Add veto holder to blocked list
      if(g.vetoHolder != null && blockedIds.indexOf(g.vetoHolder) === -1){
        blockedIds.push(g.vetoHolder);
      }
      
      // Add saved player to blocked list
      if(g.vetoSavedId != null && blockedIds.indexOf(g.vetoSavedId) === -1){
        blockedIds.push(g.vetoSavedId);
      }
      
      // Use replacement picker if available
      if(typeof global.rpPicker !== 'undefined' && global.rpPicker.show){
        global.rpPicker.show({
          eligibleIds: eligibleIds,
          blockedIds: blockedIds,
          onConfirm: function(selectedId){
            resolve(selectedId);
          }
        });
      } else {
        // Fallback to old scrollable list
        console.warn('[veto] rpPicker not available, using fallback');
        renderHOHReplacementChoiceFallback(eligibleIds, resolve);
      }
    });
  }
  
  // Fallback replacement choice UI (old scrollable list)
  function renderHOHReplacementChoiceFallback(eligibleIds, resolve){
    var content = ensureTVOverlayScaffold();
    if(!content){ resolve(null); return; }
    
    clearTVOverlayContent();
    
    var card = document.createElement('div');
    card.className = 'revealCard diaryRoomCard';
    
    var h3 = document.createElement('h3');
    h3.textContent = 'Select Replacement Nominee';
    card.appendChild(h3);
    
    var info = document.createElement('p');
    info.textContent = 'As HOH, you must select a replacement nominee.';
    info.style.marginBottom = '16px';
    card.appendChild(info);
    
    var listWrap = document.createElement('div');
    listWrap.style.maxHeight = '200px';
    listWrap.style.overflowY = 'auto';
    listWrap.style.marginBottom = '16px';
    
    var list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '8px';
    
    function disableAll(){
      var btns = list.querySelectorAll('button');
      for(var i=0; i<btns.length; i++){ btns[i].disabled = true; }
    }
    
    for(var i=0; i<eligibleIds.length; i++){
      (function(repId){
        var p = getP(repId);
        var b = document.createElement('button');
        b.className = 'btn';
        b.textContent = p ? p.name : '?';
        b.style.width = '100%';
        b.onclick = function(){
          disableAll();
          clearTVOverlayContent();
          var tv = document.getElementById('tv');
          if(tv) tv.classList.remove('tvTall');
          resolve(repId);
        };
        b.onkeydown = function(e){
          if(e.key === 'Enter' || e.key === ' '){
            e.preventDefault();
            b.click();
          }
        };
        list.appendChild(b);
      })(eligibleIds[i]);
    }
    
    listWrap.appendChild(list);
    card.appendChild(listWrap);
    content.appendChild(card);
    
    var tv = document.getElementById('tv');
    if(tv) tv.classList.add('tvTall');
    
    setTimeout(function(){
      var firstBtn = list.querySelector('button');
      if(firstBtn) firstBtn.focus();
    }, 100);
  }
  
  // Legacy function - now delegates to promptReplacementNominee
  function renderHOHReplacementChoice(hohId, eligibleIds){
    return promptReplacementNominee(eligibleIds);
  }
  
  // Render replacement choice UI with multi-select support for Diamond POV
  function renderReplacementChoiceBy(eligibleIds, options){
    options = options || {};
    var multi = options.multi || 1;
    var title = options.title || (multi === 2 ? 'Select two replacement nominees' : 'Select Replacement Nominee');
    var pickerName = options.pickerName || 'POV Holder';
    
    return new Promise(function(resolve){
      if(!eligibleIds || eligibleIds.length === 0){
        console.warn('[veto] renderReplacementChoiceBy called with empty eligibleIds');
        resolve(null);
        return;
      }
      
      var content = ensureTVOverlayScaffold();
      if(!content){ resolve(null); return; }
      
      clearTVOverlayContent();
      
      var card = document.createElement('div');
      card.className = 'revealCard diaryRoomCard';
      
      var h3 = document.createElement('h3');
      h3.textContent = title;
      card.appendChild(h3);
      
      var info = document.createElement('p');
      if(multi === 2){
        info.textContent = pickerName + ', you must select exactly two replacement nominees.';
      } else {
        info.textContent = pickerName + ', you must select a replacement nominee.';
      }
      info.style.marginBottom = '20px';
      card.appendChild(info);
      
      var grid = document.createElement('div');
      grid.className = 'veto-replacement-grid';
      // CSS handles all grid layout - no inline styles needed
      
      var selectedIds = [];
      
      function updateSelection(id, tile){
        var idx = selectedIds.indexOf(id);
        if(idx !== -1){
          // Deselect
          selectedIds.splice(idx, 1);
          tile.classList.remove('selected');
        } else {
          // Select
          if(selectedIds.length < multi){
            selectedIds.push(id);
            tile.classList.add('selected');
          }
        }
        
        // Update confirm button state
        confirmBtn.disabled = (selectedIds.length !== multi);
        
        // Update selection counter
        counter.textContent = 'Selected: ' + selectedIds.length + ' / ' + multi;
      }
      
      for(var i=0; i<eligibleIds.length; i++){
        (function(nomId, idx){
          var p = getP(nomId);
          var tile = document.createElement('div');
          tile.className = 'veto-replacement-tile';
          tile.setAttribute('tabindex', '0');
          tile.setAttribute('role', 'button');
          tile.setAttribute('aria-label', 'Select ' + (p ? p.name : '?'));
          tile.style.animationDelay = (idx * 0.1) + 's';
          
          // Avatar
          var img = document.createElement('img');
          var resolveAvatar = (global.Game || global).resolveAvatar;
          img.src = resolveAvatar ? resolveAvatar(p || nomId) : (p ? (p.avatar || p.img || p.photo) : null);
          if(!img.src){
            img.src = 'https://api.dicebear.com/7.x/avataaars/svg?seed=' + encodeURIComponent(p ? p.name : String(nomId));
          }
          img.alt = p ? p.name : '?';
          tile.appendChild(img);
          
          // Name
          var name = document.createElement('div');
          name.className = 'name';
          name.textContent = p ? p.name : '?';
          tile.appendChild(name);
          
          // Click and keyboard handler for selection
          tile.onclick = function(){
            updateSelection(nomId, tile);
          };
          tile.onkeydown = function(e){
            if(e.key === 'Enter' || e.key === ' '){
              e.preventDefault();
              updateSelection(nomId, tile);
            }
          };
          
          grid.appendChild(tile);
        })(eligibleIds[i], i);
      }
      
      card.appendChild(grid);
      
      // Selection counter
      var counter = document.createElement('div');
      counter.className = 'veto-selection-counter';
      counter.textContent = 'Selected: 0 / ' + multi;
      card.appendChild(counter);
      
      // Confirm button
      var confirmBtn = document.createElement('button');
      confirmBtn.className = 'btn primary veto-confirm-btn';
      confirmBtn.textContent = 'Confirm ' + (multi === 2 ? 'Nominees' : 'Nominee');
      confirmBtn.disabled = true;
      confirmBtn.onclick = function(){
        clearTVOverlayContent();
        var tv = document.getElementById('tv');
        if(tv) tv.classList.remove('tvTall');
        resolve(multi === 1 ? selectedIds[0] : selectedIds);
      };
      card.appendChild(confirmBtn);
      
      content.appendChild(card);
      
      var tv = document.getElementById('tv');
      if(tv) tv.classList.add('tvTall');
    });
  }
  
  global.renderReplacementChoiceBy = renderReplacementChoiceBy;
  global.animateNominationTransfer = animateNominationTransfer;
  
  global.ensureTVOverlayScaffold = ensureTVOverlayScaffold;
  global.clearTVOverlayContent = clearTVOverlayContent;
  global.showTVCard = showTVCard;
  global.showTVCardWithAvatars = showTVCardWithAvatars;
  global.showTVDecision = showTVDecision;
  global.showTVNomineeSavePanel = showTVNomineeSavePanel;
  global.renderHOHReplacementChoice = renderHOHReplacementChoice;
  global.promptReplacementNominee = promptReplacementNominee;
  
  /* ===== Veto Ceremony Flow ===== */

  async function startVetoCeremony(){
    var g = global.game;
    g.vetoSavedId = null;
    g.vetoRepPref = null;
    g._awaitingReplacement = false;
    g.__vetoCeremonyResolved = false;
    g.__vetoNarrativeShown = false;
    g.__vetoDecisionInProgress = false;
    g.__replacementCommitted = false;
    g.__replacementApplied = false;
    g.__useTVCeremonyUI = false;
    if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }

    if(global.tv && typeof global.tv.say==='function') global.tv.say('Veto Ceremony');
    if(typeof global.phaseMusic==='function') global.phaseMusic('nominations');

    // Step 1: Ceremony Intro - use TV contained card
    var holder = getP(g.vetoHolder);
    var holderName = holder ? holder.name : 'POV Holder';
    
    await showTVCard({
      title: 'Veto Ceremony',
      lines: ['This is the Veto ceremony. As ' + holderName + ' holds the Power of Veto, please stand and make your decision.'],
      tone: 'veto',
      duration: 2400
    });

    // Log action
    try{ 
      if(global.addLog) global.addLog(holderName + ' stands to make the veto decision.', 'tiny'); 
    }catch(e){}

    // Step 2: Set phase and show decision panel
    if(typeof global.setPhase==='function')
      global.setPhase('veto_ceremony', (global.game && global.game.cfg && global.game.cfg.tVetoDec) || 25, finalizeCeremony);
    
    // Check for Diamond POV twist - skip save step and go straight to picking 2 replacements
    if(g.activeVetoTwist === 'diamond'){
      if(holder && holder.human){
        // Human POV holder picks both replacements directly
        await handleDiamondPOVCeremony(holder);
      } else {
        // AI POV holder
        g.__vetoAutoTimer = setTimeout(function(){
          var gg = global.game;
          if(gg && gg.phase==='veto_ceremony' && !gg._awaitingReplacement && !gg.__vetoCeremonyResolved){
            try{ handleDiamondPOVCeremony(getP(gg.vetoHolder)); }catch(e){}
          }
        }, 1200);
      }
      return;
    }
    
    // For human POV holder, show Yes/No decision in TV
    if(holder && holder.human){
      // Set flag to prevent duplicate panel rendering
      g.__useTVCeremonyUI = true;
      
      var noms = (g.nominees||[]).map(getP);
      var nomsText = noms.map(function(n){ return n?n.name:'?'; }).join(', ');
      
      // Twist-aware message: Golden POV means POV holder picks replacement, not HOH
      var isGoldenTwist = (g.activeVetoTwist === 'golden');
      var vetoMessage = 'POV Holder: ' + holderName + '. Nominees: ' + nomsText + '.';
      if(isGoldenTwist){
        vetoMessage += ' Using the veto will allow you to choose the replacement nominee.';
      } else {
        vetoMessage += ' Using the veto will force the HOH to name a replacement nominee.';
      }
      
      var decision = await showTVDecision({
        title: 'Would you like to use the Power of Veto?',
        message: vetoMessage,
        buttons: [
          { label: 'Yes — Use the Veto', value: true, primary: true },
          { label: 'No — Keep Nominations the Same', value: false, primary: false }
        ]
      });
      
      if(decision){
        // User chose Yes - need to select which nominee to save
        // Safety check: ensure nominees array exists and has at least one element
        if(!g.nominees || g.nominees.length === 0){
          console.warn('[veto] No nominees to save, treating as veto not used');
          await finalizeCeremony({ used: false });
        } else if(g.nominees.length > 1){
          var savedId = await showTVNomineeSavePanel({
            title: 'Save Which Nominee?',
            nominees: g.nominees,
            povId: g.vetoHolder
          });
          await finalizeCeremony({ used: true, savedId: savedId });
        } else {
          await finalizeCeremony({ used: true, savedId: g.nominees[0] });
        }
      } else {
        // User chose No
        await finalizeCeremony({ used: false });
      }
    } else {
      // AI auto-decision after brief delay
      g.__vetoAutoTimer = setTimeout(function(){
        var gg = global.game;
        if(gg && gg.phase==='veto_ceremony' && !gg._awaitingReplacement && !gg.__vetoCeremonyResolved){
          try{ finalizeCeremony(); }catch(e){}
        }
      }, 1200);
    }
  }
  global.startVetoCeremony = startVetoCeremony;

  function renderVetoCeremonyPanel(){
    var g = global.game;
    var panel = document.querySelector('#panel'); if(!panel) return;
    panel.innerHTML = '';
    var box = document.createElement('div'); box.className='minigame-host';
    var holder = getP(g.vetoHolder);
    var noms = (g.nominees||[]).map(getP);

    // If using TV ceremony UI, show placeholder instead of interactive controls
    if(g.__useTVCeremonyUI){
      box.innerHTML = '<h3>Veto Ceremony</h3>';
      var tvNote = document.createElement('div'); tvNote.className='tiny muted';
      tvNote.textContent = 'Decision in progress…';
      box.appendChild(tvNote);
      panel.appendChild(box);
      return;
    }

    if(g.__vetoCeremonyResolved){
      box.innerHTML = '<h3>Veto Ceremony</h3>';
      var done = document.createElement('div'); done.className='tiny ok'; done.textContent='Decision locked.';
      box.appendChild(done); panel.appendChild(box); return;
    }

    if(!g._awaitingReplacement){
      // Decision panel: Use POV?
      box.innerHTML = '<h3>Would you like to use the Power of Veto?</h3>';
      
      var info = document.createElement('div'); info.className='tiny';
      info.textContent = 'POV Holder: '+(holder?holder.name:'?')+'. Nominees: '+noms.map(function(n){ return n?n.name:'?'; }).join(', ')+'.';
      box.appendChild(info);

      if(holder && holder.human){
        if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }
        
        var row = document.createElement('div'); row.className='row'; row.style.marginTop='16px';
        function disableAll(){
          var bs=row.querySelectorAll('button');
          for(var i=0;i<bs.length;i++){ bs[i].disabled=true; }
        }
        
        // Yes button (green, prominent)
        var btnYes = document.createElement('button'); 
        btnYes.className='btn primary'; 
        btnYes.textContent='Yes — Use the Veto';
        btnYes.style.marginRight = '8px';
        btnYes.disabled = !!g.__vetoDecisionInProgress;
        btnYes.onclick = function(){ 
          if(g.__vetoDecisionInProgress) return; 
          disableAll(); 
          // Show nominee selection if more than one nominee
          if(g.nominees.length > 1){
            showNomineeSelection();
          } else {
            finalizeCeremony({ used: true, savedId: g.nominees[0] }); 
          }
        };
        row.appendChild(btnYes);

        // No button (default)
        var btnNo = document.createElement('button'); 
        btnNo.className='btn'; 
        btnNo.textContent='No — Keep Nominations the Same';
        btnNo.disabled = !!g.__vetoDecisionInProgress;
        btnNo.onclick = function(){ 
          if(g.__vetoDecisionInProgress) return; 
          disableAll(); 
          finalizeCeremony({ used: false }); 
        };
        row.appendChild(btnNo);

        box.appendChild(row);
        
        var hint = document.createElement('div'); hint.className='tiny muted';
        hint.style.marginTop = '12px';
        hint.textContent = 'Using the veto will force the HOH to name a replacement nominee.';
        box.appendChild(hint);
      } else {
        var note = document.createElement('div'); note.className='tiny muted'; 
        note.style.marginTop = '12px';
        note.textContent='POV holder is making a decision…';
        box.appendChild(note);
      }
    } else {
      // Replacement nominee selection
      box.innerHTML = '<h3>Select Replacement Nominee</h3>';
      
      var repPool = alivePlayers().filter(function(p){
        return !p.hoh && g.nominees.indexOf(p.id)===-1 && p.id!==g.vetoHolder && p.id!==g.vetoSavedId;
      });
      var hint2 = document.createElement('div'); hint2.className='tiny';
      hint2.textContent = g.__replacementCommitted ? 'Replacement submitted…' : 'The HOH must select a replacement nominee.';
      box.appendChild(hint2);
      var row2 = document.createElement('div'); row2.className='row'; row2.style.marginTop='12px';
      var sel = document.createElement('select'); sel.disabled = !!g.__replacementCommitted;
      for(var j=0;j<repPool.length;j++){
        var o = document.createElement('option'); o.value = String(repPool[j].id); o.textContent = repPool[j].name; sel.appendChild(o);
      }
      var btnGo = document.createElement('button'); btnGo.className='btn primary'; btnGo.textContent='Confirm Replacement';
      if(g.__replacementCommitted) btnGo.disabled = true;
      row2.appendChild(sel); row2.appendChild(btnGo); box.appendChild(row2);
      btnGo.onclick = function(){
        if(g.__replacementCommitted) return;
        g.__replacementCommitted = true;
        btnGo.disabled = true; sel.disabled = true;
        var replacementId = +sel.value;
        applyReplacementAndContinue(replacementId);
      };
    }

    panel.appendChild(box);
  }
  global.renderVetoCeremonyPanel = renderVetoCeremonyPanel;

  // Show nominee selection panel when Yes is clicked and multiple nominees exist
  function showNomineeSelection(){
    var g = global.game;
    var panel = document.querySelector('#panel'); if(!panel) return;
    panel.innerHTML = '';
    var box = document.createElement('div'); box.className='minigame-host';
    box.innerHTML = '<h3>Save Which Nominee?</h3>';
    
    var info = document.createElement('div'); info.className='tiny';
    info.textContent = 'Select which nominee to save with the Power of Veto.';
    box.appendChild(info);
    
    var row = document.createElement('div'); row.className='row'; row.style.marginTop='16px';
    function disableAll(){
      var bs=row.querySelectorAll('button');
      for(var i=0;i<bs.length;i++){ bs[i].disabled=true; }
    }
    
    for(var i=0;i<g.nominees.length;i++){
      (function wrapSave(id){
        var p = getP(id);
        var b = document.createElement('button'); 
        b.className='btn primary'; 
        b.textContent='Save '+(p?p.name:'?');
        b.style.marginRight = '8px';
        b.disabled = !!g.__vetoDecisionInProgress;
        b.onclick = function(){ 
          if(g.__vetoDecisionInProgress) return; 
          disableAll(); 
          finalizeCeremony({ used: true, savedId: id }); 
        };
        row.appendChild(b);
      })(g.nominees[i]);
    }
    
    box.appendChild(row);
    panel.appendChild(box);
  }
  global.showNomineeSelection = showNomineeSelection;

  // ======= DIAMOND POV CEREMONY =======
  async function handleDiamondPOVCeremony(holder){
    var g = global.game;
    if(g.__vetoCeremonyResolved) return;
    
    g.__vetoDecisionInProgress = true;
    g.__useTVCeremonyUI = true;
    if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }
    
    var holderName = holder ? holder.name : 'POV Holder';
    
    // Show Diamond POV announcement with POV holder avatar
    await showTVCardWithAvatars({
      title: 'Diamond Power of Veto',
      lines: [holderName + ' will now replace BOTH nominees.'],
      tone: 'veto',
      duration: 3200,
      actorIds: holder ? holder.id : null
    });
    
    // Compute eligible replacement nominees (exclude HOH and POV holder)
    var eligibleIds = alivePlayers().filter(function(p){
      return p.id !== g.hohId && p.id !== g.vetoHolder && !p.evicted;
    }).map(function(p){ return p.id; });
    
    if(eligibleIds.length < 2){
      console.warn('[veto] Not enough eligible players for Diamond POV');
      await showTVCard({
        title: 'Error',
        lines: ['Not enough eligible players for Diamond POV.'],
        tone: 'danger',
        duration: 3000
      });
      g.__vetoCeremonyResolved = true;
      g.__vetoDecisionInProgress = false;
      g.__useTVCeremonyUI = false;
      setTimeout(function(){
        if(typeof global.startSocial==='function'){
          global.startSocial('veto', function(){
            if(typeof global.startLiveVote==='function') global.startLiveVote();
          });
        } else if(typeof global.startLiveVote==='function'){
          global.startLiveVote();
        }
      }, 200);
      return;
    }
    
    // Pick 2 nominees
    var newNominees = [];
    if(holder && holder.human){
      // Human picks both nominees using multi-select UI
      newNominees = await renderReplacementChoiceBy(eligibleIds, {
        multi: 2,
        title: 'Select two replacement nominees',
        pickerName: holderName
      });
      
      if(!newNominees || newNominees.length !== 2){
        console.warn('[veto] Diamond POV selection incomplete or cancelled');
        // Fall back to AI selection
        var povHolder = getP(g.vetoHolder);
        var scored = eligibleIds.map(function(id){
          var aff = (povHolder && povHolder.affinity && typeof povHolder.affinity[id]==='number') ? povHolder.affinity[id] : 0;
          var p = getP(id);
          return { id: id, score: (-aff) + (p && p.threat ? p.threat : 0.5) };
        }).sort(function(a,b){ return b.score - a.score; });
        
        newNominees = [scored[0].id];
        if(scored.length > 1) newNominees.push(scored[1].id);
      }
    } else {
      // AI picks 2 nominees based on lowest affinity
      var povHolder = getP(g.vetoHolder);
      var scored = eligibleIds.map(function(id){
        var aff = (povHolder && povHolder.affinity && typeof povHolder.affinity[id]==='number') ? povHolder.affinity[id] : 0;
        var p = getP(id);
        return { id: id, score: (-aff) + (p && p.threat ? p.threat : 0.5) };
      }).sort(function(a,b){ return b.score - a.score; });
      
      newNominees = [scored[0].id];
      if(scored.length > 1) newNominees.push(scored[1].id);
    }
    
    // Apply Diamond POV using the multi-replacement function
    await applyReplacementAndContinueMulti(newNominees, {
      announcer: 'POV',
      diamond: true
    });
  }
  global.handleDiamondPOVCeremony = handleDiamondPOVCeremony;

  function aiVetoDecision(){
    var g = global.game, holderId = g.vetoHolder;
    var holderP = getP(holderId);
    var noms = (g.nominees||[]).slice();
    var bestId = null, bestRel = -Infinity;
    for(var i=0;i<noms.length;i++){
      var id = noms[i];
      var rel = (holderP && holderP.affinity && typeof holderP.affinity[id]==='number') ? holderP.affinity[id] : 0;
      if(rel > bestRel){ bestRel = rel; bestId = id; }
    }
    var threshold = ((typeof global.REL_VETO_FRIEND_THRESHOLD==='number' ? global.REL_VETO_FRIEND_THRESHOLD : 25) / 100);
    if(bestRel >= threshold || bestRel > 0.2){
      return { used: true, savedId: bestId };
    }
    return { used: false };
  }

  function pickReplacementByHOH(savedId){
    var g = global.game;
    var hoh = getP(g.hohId);
    var pool = alivePlayers().filter(function(p){
      return p.id!==savedId && !p.hoh && g.nominees.indexOf(p.id)===-1 && p.id!==g.vetoHolder;
    });
    if(!pool.length) return null;
    var scored = pool.map(function(p){
      var aff = (hoh && hoh.affinity && typeof hoh.affinity[p.id]==='number') ? hoh.affinity[p.id] : 0;
      var inAl = (global.inSameAlliance && typeof global.inSameAlliance==='function') ? (global.inSameAlliance(hoh.id, p.id) ? 1 : 0) : 0;
      return { id: p.id, score: (-aff) + (p.threat||0.5) + (inAl ? 0.6 : 0) };
    }).sort(function(a,b){ return b.score - a.score; });
    return scored[0].id;
  }

  async function finalizeCeremony(choice){
    var g = global.game;

    if(g._awaitingReplacement) return;
    if(g.__vetoDecisionInProgress) return;
    if(g.__vetoCeremonyResolved) return;

    g.__vetoDecisionInProgress = true;
    if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }

    var decision = choice;
    if(!decision){
      if(typeof g.vetoSavedId==='number'){ decision = { used: true, savedId: g.vetoSavedId }; }
      else if(g.nominees.indexOf(g.vetoHolder)!==-1){ decision = { used: true, savedId: g.vetoHolder }; }
      else if(!(getP(g.vetoHolder) && getP(g.vetoHolder).human)){ decision = aiVetoDecision(); }
      else { decision = { used: false }; }
    }

    var aliveCount = alivePlayers().length;

    if(decision.used){
      var savedId = (typeof decision.savedId==='number') ? decision.savedId : g.vetoHolder;
      var savedName = safeName(savedId);
      g.vetoSavedId = savedId;

      // Social Maneuvers: Record veto used event for weekly energy bonus
      if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
        try{
          global.SocialManeuvers.recordWeeklyEvent(g.vetoHolder, { vetoUsed: true });
          console.info('[veto.js] ✓ Recorded veto used event for player', g.vetoHolder);
        }catch(e){
          console.error('[veto.js] Failed to record veto used event:', e);
        }
      }

      // Set pendingSave state - NOM label should still show
      var savedP = getP(savedId);
      if(savedP){ 
        savedP.nominationState = 'pendingSave'; 
        console.info('[nom] pendingSave player=' + savedId);
        // Don't clear nominated flag yet - wait for veto application
        try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){} 
      }

      if(!g.__vetoNarrativeShown){
        g.__vetoNarrativeShown = true;
        
        // Show veto decision card with POV holder avatar
        await showTVCardWithAvatars({
          title: 'Veto Decision',
          lines: [pickPhrase(VETO_USE_PHRASES)],
          tone: 'veto',
          duration: 3200,
          actorIds: g.vetoHolder
        });
        
        // Show saved player card with saved player avatar
        await showTVCardWithAvatars({
          title: 'Saved',
          lines: [savedName + ' is saved from the block.'],
          tone: 'veto',
          duration: 3200,
          subjectIds: savedId
        });
        
        // Log action
        try{ if(global.addLog) global.addLog(safeName(g.vetoHolder) + ' has used the Power of Veto to save ' + savedName + '.', 'warn'); }catch(e){}
      }

      // Continue after saved player revealed
      if(aliveCount===4){
        var f4 = alivePlayers().map(function(p){ return p.id; });
        var forced = f4.filter(function(id){ return id!==g.hohId && id!==g.vetoHolder; });
        if(forced.length>=2){
          g.nominees = forced.slice(0,2);
          g.nomsLocked = true;
          for(var i=0;i<g.players.length;i++){ g.players[i].nominated = (g.nominees.indexOf(g.players[i].id)!==-1); }
          // Sync player badge states after F4 veto application
          try{ if(typeof global.syncPlayerBadgeStates==='function') global.syncPlayerBadgeStates(); }catch(e){}
          try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}
        }
        await showTVCard({
          title: 'Final 4',
          lines: ['As the veto holder, you are the sole vote to evict.'],
          tone: 'warn',
          duration: 3200
        });
        g.__vetoCeremonyResolved = true;
        g.__vetoDecisionInProgress = false;
        setTimeout(function(){ if(typeof global.startLiveVote==='function') global.startLiveVote(); }, 300);
        return;
      }
      
      var hoh = getP(g.hohId);
      
      // Show replacement required message
      await showTVCard({
        title: 'Replacement Required',
        lines: ['As I have vetoed one of your nominations, you must now select a replacement.'],
        tone: 'noms',
        duration: 3200
      });

      // Check for Golden POV twist - POV holder picks replacement instead of HOH
      var isGoldenPOV = (g.activeVetoTwist === 'golden');
      var holder = getP(g.vetoHolder);
      var picker = isGoldenPOV ? holder : hoh;
      var pickerName = picker ? picker.name : (isGoldenPOV ? 'POV Holder' : 'HOH');

      if(picker && picker.human){
        g._awaitingReplacement = true;
        try{ if(global.addLog) global.addLog('Veto used. '+savedName+' is saved. ' + (isGoldenPOV ? 'POV holder' : 'HOH') + ' must choose a replacement.','warn'); }catch(e){}
        // Show replacement choice panel in TV
        var repPool = alivePlayers().filter(function(p){
          return !p.hoh && g.nominees.indexOf(p.id)===-1 && p.id!==g.vetoHolder && p.id!==g.vetoSavedId;
        });
        var eligibleIds = repPool.map(function(p){ return p.id; });
        
        // Safety check: ensure there are eligible replacements
        if(eligibleIds.length === 0){
          console.warn('[veto] No eligible replacements available');
          try{ if(global.addLog) global.addLog('No eligible replacements available.','danger'); }catch(e){}
          // Proceed without replacement (edge case)
          g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
          g.__vetoCeremonyResolved = true;
          g.__vetoDecisionInProgress = false;
          g.__useTVCeremonyUI = false;
          setTimeout(function(){
            if(typeof global.startSocial==='function'){
              global.startSocial('veto', function(){
                if(typeof global.startLiveVote==='function') global.startLiveVote();
              });
            } else if(typeof global.startLiveVote==='function'){
              global.startLiveVote();
            }
          }, 200);
          return;
        }
        
        // For Golden POV, use renderReplacementChoiceBy with single-select
        if(isGoldenPOV){
          var replacementId = await renderReplacementChoiceBy(eligibleIds, {
            multi: 1,
            title: 'Select Replacement Nominee',
            pickerName: pickerName
          });
          if(replacementId != null){
            await applyReplacementAndContinue(replacementId, isGoldenPOV);
          }
        } else {
          // Standard HOH replacement
          var replacementId = await renderHOHReplacementChoice(picker.id, eligibleIds);
          if(replacementId != null){
            await applyReplacementAndContinue(replacementId, isGoldenPOV);
          }
        }
      } else {
        var replacementId = pickReplacementByHOH(savedId);
        await applyReplacementAndContinue(replacementId, isGoldenPOV);
      }
    } else {
      // Veto NOT used
      try{ if(global.addLog) global.addLog('Veto not used.','muted'); }catch(e){}
      
      // Show veto not used card with POV holder avatar
      await showTVCardWithAvatars({
        title: 'Veto Not Used',
        lines: [pickPhrase(VETO_NOT_USE_PHRASES)],
        tone: 'veto',
        duration: 3600,
        actorIds: g.vetoHolder
      });

      // Show nominee reactions (they're still on the block)
      if(g.nominees && g.nominees.length > 0){
        await showNomineeReactionsSimultaneously(g.nominees);
      }

      // Show adjourn message
      await showTVCard({
        title: 'Veto Ceremony',
        lines: ['This veto ceremony is adjourned.'],
        tone: 'veto',
        duration: 2800
      });

      g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
      g.__vetoCeremonyResolved = true;
      g.__vetoDecisionInProgress = false;
      g.__useTVCeremonyUI = false;
      setTimeout(function(){
        if(typeof global.startSocial==='function'){
          global.startSocial('veto', function(){
            if(typeof global.startLiveVote==='function') global.startLiveVote();
          });
        } else if(typeof global.startLiveVote==='function'){
          global.startLiveVote();
        }
      }, 200);
    }
  }
  global.finalizeCeremony = finalizeCeremony;

  async function applyReplacementAndContinue(replacementId, isGoldenPOV){
    var g = global.game;
    if(g.__replacementApplied) return;
    g.__replacementApplied = true;

    if(replacementId!=null){
      var savedId = g.vetoSavedId;
      g.nominees = (g.nominees||[]).filter(function(id){ return id!==savedId; });
      if(g.nominees.indexOf(replacementId)===-1) g.nominees.push(replacementId);

      // Social Maneuvers: Record replacement nomination event for weekly energy bonus
      if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
        try{
          global.SocialManeuvers.recordWeeklyEvent(replacementId, { nominated: true });
          console.info('[veto.js] ✓ Recorded replacement nomination event for player', replacementId);
        }catch(e){
          console.error('[veto.js] Failed to record replacement nomination event:', e);
        }
      }

      // Hook: Log XP for veto usage
      if(global.ProgressionEvents){
        var vetoWinner = g.vetoHolder;
        if(savedId === vetoWinner){
          if(global.ProgressionEvents.onVetoUsedOnSelf) global.ProgressionEvents.onVetoUsedOnSelf(vetoWinner);
        } else {
          if(global.ProgressionEvents.onVetoUsedOnOther) global.ProgressionEvents.onVetoUsedOnOther(vetoWinner, savedId);
        }
      }

      // Update nomination states after veto is applied
      for(var i=0;i<g.players.length;i++){ 
        var p = g.players[i];
        if(p.id === savedId){
          // Saved player - clear nomination and set state to 'saved'
          p.nominated = false;
          p.nominationState = 'saved';
        } else if(p.id === replacementId){
          // Replacement nominee - set state to 'replacement'
          p.nominated = true;
          p.nominationState = 'replacement';
        } else if(g.nominees.indexOf(p.id) !== -1){
          // Other nominees keep their state
          p.nominated = true;
        } else {
          // Clear nomination for others
          p.nominated = false;
          if(p.nominationState === 'nominated' || p.nominationState === 'pendingSave'){
            p.nominationState = 'none';
          }
        }
      }

      // Sync player badge states after updating nomination states
      try{ if(typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates(); }catch(e){}

      // Log the veto application with saved and replacement IDs
      var savedIds = [savedId];
      var replacementIds = [replacementId];
      console.info('[nom] vetoApplied saved=' + JSON.stringify(savedIds) + ' replacement=' + JSON.stringify(replacementIds));

      // Determine who made the announcement (POV holder for Golden, HOH otherwise)
      var announcer = isGoldenPOV ? getP(g.vetoHolder) : getP(g.hohId);
      var announcerRole = isGoldenPOV ? 'POV Holder' : 'HOH';
      var announce = (announcer ? announcer.name : announcerRole)+': I name '+safeName(replacementId)+' as the replacement nominee.';
      
      // Show announcement card with appropriate role and avatars
      await showTVCardWithAvatars({
        title: announcerRole + ' Announcement',
        lines: [announce],
        tone: 'noms',
        duration: 3400,
        actorIds: announcer ? announcer.id : null,
        subjectIds: replacementId
      });

      try{ if(global.addLog) global.addLog('Replacement nomination: '+safeName(replacementId)+' (by ' + announcerRole + ').','warn'); }catch(e){}
      
      // Show badge transfer animation before applying state
      // Old nominee loses badge, new nominee gains badge
      await animateNominationTransfer({
        fromIds: [savedId],
        toIds: [replacementId],
        duration: 4000
      });
      
      // Show replacement nominee card with replacement nominee avatar
      await showTVCardWithAvatars({
        title: 'Replacement Nominee',
        lines: [safeName(replacementId) + ' is now on the block.'],
        tone: 'replace',
        duration: 3600,
        subjectIds: replacementId
      });

      try{ g.__twistNomineeSnapshot = g.nominees.slice(); }catch(e){}
      try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}
    } else {
      try{ if(global.addLog) global.addLog('Veto used, but no valid replacement available.','danger'); }catch(e){}
    }

    // Show adjourn message
    await showTVCard({
      title: 'Veto Ceremony',
      lines: ['This veto ceremony is adjourned.'],
      tone: 'veto',
      duration: 2800
    });

    // Proceed to next phase
    g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
    g.__vetoCeremonyResolved = true;
    g.__vetoDecisionInProgress = false;
    g.__useTVCeremonyUI = false;
    setTimeout(function(){
      if(typeof global.startSocial==='function'){
        global.startSocial('veto', function(){
          if(typeof global.startLiveVote==='function') global.startLiveVote();
        });
      } else if(typeof global.startLiveVote==='function'){
        global.startLiveVote();
      }
    }, 200);
  }
  global.applyReplacementAndContinue = applyReplacementAndContinue;
  
  // Apply multiple replacements for Diamond POV and continue
  async function applyReplacementAndContinueMulti(replacementIds, options){
    var g = global.game;
    options = options || {};
    var announcer = options.announcer || 'POV';
    var diamond = options.diamond || false;
    
    if(g.__replacementApplied) return;
    g.__replacementApplied = true;
    
    if(!replacementIds || replacementIds.length === 0){
      console.warn('[veto] applyReplacementAndContinueMulti called with empty replacementIds');
      g.__vetoCeremonyResolved = true;
      g.__vetoDecisionInProgress = false;
      setTimeout(function(){
        if(typeof global.startSocial==='function'){
          global.startSocial('veto', function(){
            if(typeof global.startLiveVote==='function') global.startLiveVote();
          });
        } else if(typeof global.startLiveVote==='function'){
          global.startLiveVote();
        }
      }, 200);
      return;
    }
    
    // For Diamond POV, replace ALL nominees with the new ones
    if(diamond){
      // Capture old nominees before replacement for badge transfer animation
      var oldNominees = g.nominees ? g.nominees.slice() : [];
      
      g.nominees = replacementIds.slice();
      
      // Update nomination states
      for(var i=0;i<g.players.length;i++){
        var p = g.players[i];
        if(replacementIds.indexOf(p.id) !== -1){
          p.nominated = true;
          p.nominationState = 'nominated';
        } else {
          p.nominated = false;
          p.nominationState = 'none';
        }
      }
      
      // Social Maneuvers: Record replacement nominations
      if(global.SocialManeuvers?.isEnabled?.() && global.SocialManeuvers?.recordWeeklyEvent){
        for(var j=0; j<replacementIds.length; j++){
          try{
            global.SocialManeuvers.recordWeeklyEvent(replacementIds[j], { nominated: true });
            console.info('[veto.js] ✓ Recorded nomination event for player', replacementIds[j]);
          }catch(e){
            console.error('[veto.js] Failed to record nomination event:', e);
          }
        }
      }
      
      // Sync player badge states
      try{ if(typeof global.syncPlayerBadgeStates === 'function') global.syncPlayerBadgeStates(); }catch(e){}
      
      // Log the action
      console.info('[nom] diamondPOVApplied nominees=' + JSON.stringify(replacementIds));
      
      // Determine announcer
      var announcerP = announcer === 'POV' ? getP(g.vetoHolder) : getP(g.hohId);
      var announcerRole = announcer === 'POV' ? 'POV Holder' : 'HOH';
      var announcerName = announcerP ? announcerP.name : announcerRole;
      
      // Show announcement card with announcer and subjects
      var namesStr = replacementIds.map(safeName).join(' and ');
      await showTVCardWithAvatars({
        title: announcerRole + ' Announcement',
        lines: [announcerName + ' nominates ' + namesStr + ' for eviction.'],
        tone: 'noms',
        duration: 3800,
        actorIds: announcerP ? announcerP.id : null,
        subjectIds: replacementIds
      });
      
      try{ if(global.addLog) global.addLog('Diamond POV: ' + announcerName + ' nominates ' + namesStr + '.','warn'); }catch(e){}
      
      // Show badge transfer animation: old nominees → new nominees
      if(oldNominees.length > 0 && replacementIds.length > 0){
        await animateNominationTransfer({
          fromIds: oldNominees,
          toIds: replacementIds,
          duration: 4500
        });
      }
      
      // Show replacement cards for each nominee with their avatars
      for(var k=0; k<replacementIds.length; k++){
        await showTVCardWithAvatars({
          title: 'Nominated',
          lines: [safeName(replacementIds[k]) + ' is on the block.'],
          tone: 'noms',
          duration: 2800,
          subjectIds: replacementIds[k]
        });
      }
      
      try{ g.__twistNomineeSnapshot = g.nominees.slice(); }catch(e){}
      try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}
    }
    
    // Show adjourn message
    await showTVCard({
      title: 'Veto Ceremony',
      lines: ['This veto ceremony is adjourned.'],
      tone: 'veto',
      duration: 2800
    });
    
    // Proceed to next phase
    g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
    g.__vetoCeremonyResolved = true;
    g.__vetoDecisionInProgress = false;
    g.__useTVCeremonyUI = false;
    setTimeout(function(){
      if(typeof global.startSocial==='function'){
        global.startSocial('veto', function(){
          if(typeof global.startLiveVote==='function') global.startLiveVote();
        });
      } else if(typeof global.startLiveVote==='function'){
        global.startLiveVote();
      }
    }, 200);
  }
  global.applyReplacementAndContinueMulti = applyReplacementAndContinueMulti;

})(window);