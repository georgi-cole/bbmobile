// Juror Return Competition — lengthened pacing + big-card beats
(function(global){
  'use strict';

  function getP(id){ try{ return global.getP ? global.getP(id):null; }catch{ return null; } }
  function safeName(id){ try{ return global.safeName ? global.safeName(id):String(id); }catch{ return String(id); } }
  function rng(){ try{ return (global.rng && typeof global.rng==='function')? global.rng():Math.random(); }catch{ return Math.random(); } }

  function ensureState(){
    const g=global.game||{};
    g.__juryReturn = g.__juryReturn || { finished:false, scores:new Map() };
    g.__juryReturn.scores=new Map();
    return g.__juryReturn;
  }

  function renderJuryReturnPanel(){
    const panel=document.getElementById('panel'); if(!panel) return;
    const g=global.game||{};
    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];
    panel.innerHTML='';
    const box=document.createElement('div'); box.className='minigame-host';
    const names=jurors.map(id=>safeName(id)).join(', ');
    box.innerHTML='<h3>Juror Return Competition</h3><div class="tiny">Jurors: '+(names||'—')+'</div>';
    panel.appendChild(box);

    const you=(g.humanId!=null)?getP(g.humanId):null;
    const youAreJuror=!!(you && you.evicted && jurors.includes(you.id));

    if(youAreJuror){
      const mg=(typeof global.pickMinigameType==='function')?global.pickMinigameType():'clicker';
      const host=document.createElement('div'); host.className='col'; box.appendChild(host);
      if(typeof global.renderMinigame==='function'){
        global.renderMinigame(mg,host,(base)=>{
          submitJuryScore(you.id, base, (0.8 + (you?.skill||0.5)*0.6), 'JuryReturn/'+mg);
        });
      } else {
        const note=document.createElement('div'); note.className='tiny muted';
        note.textContent='Minigame engine not available.'; box.appendChild(note);
      }
    } else {
      const note=document.createElement('div'); note.className='tiny muted';
      note.textContent='You are not a juror. Observing…'; box.appendChild(note);
    }
  }
  global.renderJuryReturnPanel=renderJuryReturnPanel;

  function submitJuryScore(id, base, mult, label){
    const g=global.game||{};
    const st=ensureState();
    if(st.scores.has(id)) return false;
    const score=base*mult;
    st.scores.set(id,score);
    try{ global.addJuryLog?.(safeName(id)+' submitted ('+label+') '+score.toFixed(2)+'.','tiny'); }catch{}
    if(id===g.humanId){
      const host=document.querySelector('#panel .minigame-host');
      if(host) host.querySelectorAll('button, input, select, textarea').forEach(el=>el.disabled=true);
    }
    maybeFinalize();
    return true;
  }
  global.__submitJuryScore=submitJuryScore;

  function humanJurorPending(){
    const g=global.game||{};
    const you=(g.humanId!=null)?getP(g.humanId):null;
    if(!you || !you.evicted) return false;
    const jurors=Array.isArray(g.juryHouse)?g.juryHouse:[];
    if(!jurors.includes(you.id)) return false;
    return !ensureState().scores.has(you.id);
  }

  function aiJurorSubmitAll(){
    const g=global.game||{};
    const youId=g.humanId;
    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];
    jurors.forEach(id=>{
      if(id===youId) return;
      const p=getP(id); if(!p) return;
      setTimeout(()=>{
        if(!global.game || global.game.phase!=='jury_return') return;
        submitJuryScore(id,(8+rng()*20),(0.8+(p.skill||0.5)*0.6),'JuryReturn/AI');
      }, 800 + rng()*(((g.cfg && g.cfg.tJuryReturn)||45)*720)); // stretched timing
    });
  }

  function allJurorSubmissionsIn(){
    const g=global.game||{};
    const st=ensureState();
    const jurors=Array.isArray(g.juryHouse)?g.juryHouse:[];
    return jurors.every(id=>st.scores.has(id));
  }

  function maybeFinalize(){
    const st=ensureState();
    if(st.finished) return;
    if(humanJurorPending()) return;
    if(allJurorSubmissionsIn()) finalize();
  }

  async function finalize(){
    const g=global.game||{};
    const st=ensureState();
    if(st.finished) return;

    // Normalize once-per-season flags: set both to ensure consistency
    g.__jurorReturnDone=true;
    g.__americaReturnDone=true;

    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];
    jurors.forEach(id=>{ if(!st.scores.has(id)) st.scores.set(id,5+rng()*5); });

    const arr=[];
    st.scores.forEach((sc,id)=>{ if(jurors.includes(id)) arr.push([id,sc]); });
    arr.sort((a,b)=>b[1]-a[1]);
    const winnerId=arr.length?arr[0][0]:null;

    st.finished=true;

    try{
      if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
        global.PopupManager.show({
          type: 'info',
          variant: null,
          title: 'JURY RETURN',
          lines: ['The juror coming back is…'],
          tone: 'jury',
          duration: 2800
        });
      } else {
        await global.showBigCard?.('JURY RETURN', ['The juror coming back is…'], 2800);
      }
    }catch(e){ 
      if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
        global.PopupManager.show({
          type: 'info',
          variant: null,
          title: 'Jury Return',
          lines: ['The returning juror is…'],
          tone: 'jury',
          duration: 2600
        });
      } else {
        global.showCard?.('Jury Return',['The returning juror is…'],'jury',2600,true);
      }
    }

    if(winnerId==null){ proceedToHOH(); return; }

    const w=getP(winnerId);
    if(w){ w.evicted=false; delete w.weekEvicted; }
    if(Array.isArray(g.juryHouse)){
      g.juryHouse=g.juryHouse.filter(id=>id!==winnerId);
    }

    try{ global.playSfx?.('twist'); }catch{}
    try{
      global.addJuryLog?.('<b>'+safeName(winnerId)+'</b> wins the Juror Return and re-enters!','ok');
      global.setMusic?.('victory',true);
      if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
        global.PopupManager.show({
          type: 'info',
          variant: null,
          title: 'Returns!',
          lines: [safeName(winnerId)],
          tone: 'return',
          duration: 4400
        });
      } else {
        global.showCard?.('Returns!',[safeName(winnerId)],'return',4400,true);
      }
      await global.cardQueueWaitIdle?.();
      // Confetti removed per spec
    }catch{}

    try{
      g.__returnFlashId=winnerId;
      global.updateHud?.();
      setTimeout(()=>{ g.__returnFlashId=null; global.updateHud?.(); },6000);
    }catch{}

    g.__jurorReturnDone=true;
    proceedToHOH();
  }

  function proceedToHOH(){
    const g=global.game||{};
    try{ global.tv?.say?.('Intermission'); }catch{}
    g.week=(g.week||0)+1;
    
    // Week intro modal and twist announcement are handled by the startHOH wrapper in ui.week-intro.js
    global.setPhase?.('intermission', g.cfg?.tIntermission || 4, ()=>global.startHOH?.());
    global.updateHud?.();
  }

  async function startJuryReturnTwist(){
    const g=global.game||{};
    if(g.__jurorReturnDone){ proceedToHOH(); return; }

    ensureState();

    // Twist announcement now handled by showTwistAnnouncementIfNeeded modal
    // Old cards removed: BREAKING TWIST, Participants, Competition Begins

    global.setPhase?.('jury_return', (g.cfg?.tJuryReturn || 45), null); // default longer
    renderJuryReturnPanel();
    aiJurorSubmitAll();

    const totalMs=Math.max(9000, (g.cfg?.tJuryReturn || 45)*1000);
    const suspenseAt=Math.max(3000, totalMs-4200);
    setTimeout(()=>{ 
      try{ 
        if(global.PopupManager && global.game?.cfg?.popup_refresh_enabled){
          global.PopupManager.show({
            type: 'info',
            variant: null,
            title: 'Final Moments',
            lines: ['Scores locking in…'],
            tone: 'jury',
            duration: 2800
          });
        } else {
          global.showCard?.('Final Moments',['Scores locking in…'],'jury',2800,true);
        }
      }catch{} 
    }, suspenseAt);
    setTimeout(()=>{ const st=ensureState(); if(!st.finished) finalize(); }, totalMs);
  }
  global.startJuryReturnTwist=startJuryReturnTwist;

})(window);

// Legacy shim (kept compact)
(function(global){
  if(global.__legacyJuryReturnShim) return;
  global.__legacyJuryReturnShim=true;
  
  // Feature flag for legacy shims (default: enabled for backward compatibility)
  const ENABLE_LEGACY_SHIMS = global.game?.cfg?.enableLegacyJuryReturnShims !== false;
  
  global.startJuryReturnTwist=function(){
    if(!ENABLE_LEGACY_SHIMS){
      console.warn('[jury_return] Legacy shim called but feature flag disabled. Use triggerReturnTwistUnified instead.');
      return false;
    }
    
    console.warn('[jury_return] DEPRECATED: startJuryReturnTwist called via legacy shim. Consider using triggerReturnTwistUnified or startAmericaReturnVote.');
    
    if(global.game?.__americaReturnDone) return false;
    return global.triggerReturnTwistUnified?.();
  };
})(window);