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
    'The nominations will stay the same.'
  ];

  function pickPhrase(arr){
    return arr[Math.floor(rng()*arr.length)];
  }

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
    return unique;
  }

  function submitGuarded(id, base, mult, label){
    var g = global.game;
    g.lastCompScores = g.lastCompScores || new Map();
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

    if(global.tv && typeof global.tv.say==='function') global.tv.say('Veto Competition');
    if(typeof global.phaseMusic==='function') global.phaseMusic('veto_comp');
    if(typeof global.setPhase==='function') global.setPhase('veto_comp', g.cfg && g.cfg.tVeto || 40, finishVetoComp);

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

    if(humanIn){
      var mg = (typeof global.pickMinigameType==='function') ? global.pickMinigameType() : 'clicker';
      var hostNode = document.querySelector('#panel .minigame-host');
      if(hostNode && typeof global.renderMinigame==='function'){
        var playWrap = document.createElement('div');
        playWrap.className = 'col';
        global.renderMinigame(mg, playWrap, function(base){
          // Use compBeast for human too (no guaranteed wins)
          var humanMultiplier = (0.75 + (you && you.compBeast ? you.compBeast : 0.5) * 0.6);
          submitGuarded(you.id, base, humanMultiplier, 'Veto/'+mg);
        });
        hostNode.appendChild(playWrap);
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
          submitGuarded(id, baseScore, aiMultiplier, 'Veto/AI');
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
    // Convert top3 format from [[id, score], ...] to [{name, ...}, ...]
    const formatted = top3.map(function(entry){
      return { name: safeName(entry[0]), score: entry[1] };
    });
    
    // Use reusable tri-slot reveal if available
    if(typeof global.showTriSlotReveal === 'function'){
      try{
        await global.showTriSlotReveal({
          title: 'Veto Results',
          topThree: formatted,
          winnerEmoji: '🛡️',
          winnerTone: 'veto',
          showIntro: true
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
      ? g.__vetoPlayers.slice()
      : alivePlayers().map(function(p){ return p.id; });

    // Synthesize AI or absent scores before reveal (fallback assignment)
    for(var i=0;i<eligible.length;i++){
      var id = eligible[i];
      if(!g.lastCompScores.has(id)){
        g.lastCompScores.set(id, 5 + rng()*5);
      }
    }

    var arr = [];
    g.lastCompScores.forEach(function(score, pid){
      if(eligible.indexOf(pid)!==-1){ arr.push([pid, score]); }
    });
    arr.sort(function(a,b){ return b[1]-a[1]; });

    global.game.vetoHolder = arr[0][0];
    var W = getP(global.game.vetoHolder);
    if(W){
      W.stats = W.stats || {};
      W.wins = W.wins || {};
      W.stats.vetoWins = (W.stats.vetoWins||0)+1;
      W.wins.veto = (W.wins.veto||0)+1;
    }

    try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}

    // Build top-3 reveal sequence
    var top3 = arr.slice(0, Math.min(3, arr.length));
    showVetoRevealSequence(top3).then(function(){
      setTimeout(function(){ startVetoCeremony(); }, 500);
    }).catch(function(e){
      console.warn('[veto] reveal error, proceeding', e);
      setTimeout(function(){ startVetoCeremony(); }, 500);
    });
  }

  function startVetoCeremony(){
    var g = global.game;
    g.vetoSavedId = null;
    g.vetoRepPref = null;
    g._awaitingReplacement = false;
    g.__vetoCeremonyResolved = false;
    g.__vetoNarrativeShown = false;
    g.__vetoDecisionInProgress = false;
    g.__replacementCommitted = false;
    g.__replacementApplied = false;
    if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }

    if(global.tv && typeof global.tv.say==='function') global.tv.say('Veto Ceremony');
    if(typeof global.phaseMusic==='function') global.phaseMusic('nominations');
    try{ if(typeof global.showCard==='function') global.showCard('Veto Ceremony', ['The holder will make a decision…'],'veto', 3600, true); }catch(e){}
    (function waitCards(){
      if(typeof global.cardQueueWaitIdle==='function'){
        try{ global.cardQueueWaitIdle().then(function(){ afterWait(); }); return; }catch(e){}
      }
      afterWait();
    })();

    function afterWait(){
      if(typeof global.setPhase==='function')
        global.setPhase('veto_ceremony', (global.game && global.game.cfg && global.game.cfg.tVetoDec) || 25, finalizeCeremony);
      setTimeout(function(){ renderVetoCeremonyPanel(); }, 50);

      var holder = getP(g.vetoHolder);
      if(holder && !holder.human){
        g.__vetoAutoTimer = setTimeout(function(){
          var gg = global.game;
          if(gg && gg.phase==='veto_ceremony' && !gg._awaitingReplacement && !gg.__vetoCeremonyResolved){
            try{ finalizeCeremony(); }catch(e){}
          }
        }, 1200);
      }
    }
  }
  global.startVetoCeremony = startVetoCeremony;

  function renderVetoCeremonyPanel(){
    var g = global.game;
    var panel = document.querySelector('#panel'); if(!panel) return;
    panel.innerHTML = '';
    var box = document.createElement('div'); box.className='minigame-host';
    box.innerHTML = '<h3>Veto Ceremony</h3>';
    var holder = getP(g.vetoHolder);
    var noms = (g.nominees||[]).map(getP);
    var info = document.createElement('div'); info.className='tiny';
    info.textContent = 'Holder: '+(holder?holder.name:'?')+'. Nominees: '+noms.map(function(n){ return n?n.name:'?'; }).join(', ')+'.';
    box.appendChild(info);

    if(g.__vetoCeremonyResolved){
      var done = document.createElement('div'); done.className='tiny ok'; done.textContent='Decision locked.';
      box.appendChild(done); panel.appendChild(box); return;
    }

    if(!g._awaitingReplacement){
      if(holder && holder.human){
        if(g.__vetoAutoTimer){ try{ clearTimeout(g.__vetoAutoTimer); }catch(e){} g.__vetoAutoTimer=null; }
        var row = document.createElement('div'); row.className='row'; row.style.marginTop='8px';
        function disableAll(){
          var bs=row.querySelectorAll('button');
          for(var i=0;i<bs.length;i++){ bs[i].disabled=true; }
        }
        var btnNone = document.createElement('button'); btnNone.className='btn'; btnNone.textContent='Do NOT use veto';
        btnNone.disabled = !!g.__vetoDecisionInProgress;
        btnNone.onclick = function(){ if(g.__vetoDecisionInProgress) return; disableAll(); finalizeCeremony({ used: false }); };
        row.appendChild(btnNone);

        for(var i=0;i<g.nominees.length;i++){
          (function wrapSave(id){
            var p = getP(id);
            var b = document.createElement('button'); b.className='btn'; b.textContent='Use on '+(p?p.name:'?');
            b.disabled = !!g.__vetoDecisionInProgress;
            b.onclick = function(){ if(g.__vetoDecisionInProgress) return; disableAll(); finalizeCeremony({ used: true, savedId: id }); };
            row.appendChild(b);
          })(g.nominees[i]);
        }

        box.appendChild(row);
        var hint = document.createElement('div'); hint.className='tiny muted';
        hint.textContent = 'Using the veto will force the HOH to name a replacement.';
        box.appendChild(hint);
      } else {
        var note = document.createElement('div'); note.className='tiny muted'; note.textContent='Holder is deciding…';
        box.appendChild(note);
      }
    } else {
      var repPool = alivePlayers().filter(function(p){
        return !p.hoh && g.nominees.indexOf(p.id)===-1 && p.id!==g.vetoHolder && p.id!==g.vetoSavedId;
      });
      var hint2 = document.createElement('div'); hint2.className='tiny';
      hint2.textContent = g.__replacementCommitted ? 'Replacement submitted…' : 'Select a replacement nominee.';
      box.appendChild(hint2);
      var row2 = document.createElement('div'); row2.className='row'; row2.style.marginTop='8px';
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

  function finalizeCeremony(choice){
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

      var savedP = getP(savedId);
      if(savedP){ savedP.nominated = false; try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){} }

      if(!g.__vetoNarrativeShown){
        try{ if(typeof global.showCard==='function') global.showCard('Veto Decision', [pickPhrase(VETO_USE_PHRASES)], 'veto', 3200, true); }catch(e){}
        if(typeof global.cardQueueWaitIdle==='function'){ try{ global.cardQueueWaitIdle().then(function(){ thenSaved(); }); return; }catch(e){} }
        thenSaved();
        function thenSaved(){
          try{ if(typeof global.showCard==='function') global.showCard('Saved', [savedName+' is saved.'], 'veto', 3200, true); }catch(e){}
          if(typeof global.cardQueueWaitIdle==='function'){ try{ global.cardQueueWaitIdle().then(function(){ afterNarr(); }); return; }catch(e){} }
          afterNarr();
        }
        function afterNarr(){ g.__vetoNarrativeShown = true; continueAfterSaved(); }
      } else {
        continueAfterSaved();
      }

      function continueAfterSaved(){
        if(aliveCount===4){
          var f4 = alivePlayers().map(function(p){ return p.id; });
          var forced = f4.filter(function(id){ return id!==g.hohId && id!==g.vetoHolder; });
          if(forced.length>=2){
            g.nominees = forced.slice(0,2);
            g.nomsLocked = true;
            for(var i=0;i<g.players.length;i++){ g.players[i].nominated = (g.nominees.indexOf(g.players[i].id)!==-1); }
            try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}
          }
          try{ if(typeof global.showCard==='function') global.showCard('Final 4', ['As the veto holder, you are the sole vote to evict.'], 'warn', 3200, true); }catch(e){}
          if(typeof global.cardQueueWaitIdle==='function'){
            try{ global.cardQueueWaitIdle().then(function(){ endCerAndVote(); }); return; }catch(e){}
          }
          endCerAndVote();
          return;
        }

        var hoh = getP(g.hohId);
        try{ if(typeof global.showCard==='function') global.showCard('HOH', ['As I have vetoed one of your nominations, you must now select a replacement.'],'noms', 3200, true); }catch(e){}
        if(typeof global.cardQueueWaitIdle==='function'){
          try{ global.cardQueueWaitIdle().then(function(){ afterHoHCard(); }); return; }catch(e){}
        }
        afterHoHCard();

        function afterHoHCard(){
          if(hoh && hoh.human){
            g._awaitingReplacement = true;
            try{ if(global.addLog) global.addLog('Veto used. '+savedName+' is saved. HOH must choose a replacement.','warn'); }catch(e){}
            setTimeout(function(){ if(typeof global.renderVetoCeremonyPanel==='function') global.renderVetoCeremonyPanel(); }, 100);
          } else {
            var replacementId = pickReplacementByHOH(savedId);
            applyReplacementAndContinue(replacementId);
          }
        }
      }

      function endCerAndVote(){
        g.__vetoCeremonyResolved = true;
        g.__vetoDecisionInProgress = false;
        setTimeout(function(){ if(typeof global.startLiveVote==='function') global.startLiveVote(); }, 300);
      }
    } else {
      try{ if(global.addLog) global.addLog('Veto not used.','muted'); }catch(e){}
      try{ if(typeof global.showCard==='function') global.showCard('Veto Not Used',[pickPhrase(VETO_NOT_USE_PHRASES)],'veto',3600,true); }catch(e){}
      if(typeof global.cardQueueWaitIdle==='function'){
        try{ global.cardQueueWaitIdle().then(function(){ finishNoUse(); }); return; }catch(e){}
      }
      finishNoUse();

      function finishNoUse(){
        g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
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
      }
    }
  }
  global.finalizeCeremony = finalizeCeremony;

  function applyReplacementAndContinue(replacementId){
    var g = global.game;
    if(g.__replacementApplied) return;
    g.__replacementApplied = true;

    function proceed(){
      g.vetoSavedId=null; g.vetoRepPref=null; g._awaitingReplacement=false;
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
    }

    if(replacementId!=null){
      var savedId = g.vetoSavedId;
      g.nominees = (g.nominees||[]).filter(function(id){ return id!==savedId; });
      if(g.nominees.indexOf(replacementId)===-1) g.nominees.push(replacementId);

      for(var i=0;i<g.players.length;i++){ g.players[i].nominated = (g.nominees.indexOf(g.players[i].id)!==-1); }

      var hoh = getP(g.hohId);
      var announce = (hoh ? hoh.name : 'HOH')+': I name '+safeName(replacementId)+' as the replacement nominee.';
      try{ if(typeof global.showCard==='function') global.showCard('HOH Announcement',[announce],'noms',3400,true); }catch(e){}

      function afterAnnouncement(){
        try{ if(global.addLog) global.addLog('Replacement nomination: '+safeName(replacementId)+' (by HOH).','warn'); }catch(e){}
        try{ if(typeof global.showCard==='function') global.showCard('Replacement',[safeName(replacementId)],'replace',3600,true); }catch(e){}

        function afterReplacementCard(){
          try{ g.__twistNomineeSnapshot = g.nominees.slice(); }catch(e){}
          try{ if(typeof global.updateHud==='function') global.updateHud(); }catch(e){}
          proceed();
        }

        if(typeof global.cardQueueWaitIdle==='function'){
          try{ global.cardQueueWaitIdle().then(function(){ afterReplacementCard(); }); return; }catch(e){}
        }
        afterReplacementCard();
      }

      if(typeof global.cardQueueWaitIdle==='function'){
        try{ global.cardQueueWaitIdle().then(function(){ afterAnnouncement(); }); return; }catch(e){}
      }
      afterAnnouncement();

    } else {
      try{ if(global.addLog) global.addLog('Veto used, but no valid replacement available.','danger'); }catch(e){}
      proceed();
    }
  }
  global.applyReplacementAndContinue = applyReplacementAndContinue;

})(window);