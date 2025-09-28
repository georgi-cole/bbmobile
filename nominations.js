// MODULE: nominations.js
// HOH picks with suspense; HOH excluded; distinct picks; only alive.
// Supports twist-defined nominee slots (2/3/4). Ceremony: HOH speech → nominee cards.
// One-shot safety: once locked, UI disables and duplicate triggers are ignored.

(function(global){
  const $=global.$;

  function aliveIds(){ return global.alivePlayers().map(p=>p.id); }
  function eligibleNomIds(){ const g=global.game; return aliveIds().filter(id=>id!==g.hohId); }
  function requiredSlots(){ return Math.max(2, Math.min(4, global.game?.__twistNomSlots || 2)); }

  function aiPickNominees(count=2){
    const g=global.game; const hoh=global.getP(g.hohId);
    const pool=eligibleNomIds();
    const scored=pool.map(id=>{
      const cand=global.getP(id);
      const aff=hoh.affinity[id]??0, threat=cand.threat||0.5, inAl=global.inSameAlliance?.(hoh.id,id)?1:0;
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

    if(hoh.human){
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
    g.nominees.forEach(id=>{
      const p=global.getP(id); p.nominated=true;
      p.nominatedCount = (p.nominatedCount||0)+1;
      global.addBond?.(hohId,id, global.NOMINATION_PENALTY);
      const hoh=global.getP(hohId);
      hoh.affinity[id]=global.clamp?.((hoh.affinity[id]??0)-0.15,-1,1) ?? (hoh.affinity[id]??0)-0.15;
    });
  }

  function hohSpeech(hoh){
    const lines = [
      'This is strictly strategic — nothing personal.',
      'I have to think long‑term about my game.',
      'These nominations reflect the dynamics I’m seeing.',
      'I respect everyone, but I have to make a move.',
      'Keys are getting harder to hand out each week — I had to choose.'
    ];
    return `${(hoh&&hoh.name) || 'HOH'}: "${lines[Math.floor((global.rng?.()||Math.random())*lines.length)]}"`;
  }

  async function finalizeNoms(){
    const g=global.game;
    if(g.nomsLocked || g.__nomsCommitted) return; // already locked
    if(!g.__nomsCommitInProgress) g.__nomsCommitInProgress = true;

    g.nominees=ensureValidDistinct(); 
    g.nomsLocked=true; 
    g.__nomsCommitted = true;
    applyNominationSideEffects();

    (async function ceremony(){
      const hoh=global.getP(g.hohId);
      g.__suppressNomBadges = true; global.updateHud?.();

      // fixed variable name (was "hоh" with a non-ASCII o)
      global.showCard('Nomination Ceremony', [`${hoh?.name || 'HOH'} addresses the house.`],'noms', 2400, true);
      try{ await global.cardQueueWaitIdle?.(); }catch{}
      try{ global.addLog?.(hohSpeech(hoh), 'tiny'); }catch{}

      const ids=(g.nominees||[]).slice();
      for(let i=0;i<ids.length;i++){
        const label = ids.length>2 ? `Nominee #${i+1}` : (i===0 ? 'First Nominee' : 'Second Nominee');
        global.showCard(label, [global.safeName(ids[i])], 'noms', 2600, true);
        try{ await global.cardQueueWaitIdle?.(); }catch{}
      }

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