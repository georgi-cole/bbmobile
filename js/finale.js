// Finale cinematic: restored classic dark overlay with winner name, spinning cup, and actions.
(function(g){
  'use strict';

  function ensureFinaleStyles(){
    if(document.getElementById('cinStyles')) return;
    const css = `
    .cinDim{position:fixed;inset:0;background:radial-gradient(120% 120% at 50% 10%,rgba(2,6,10,.92),rgba(0,0,0,.97)),#000;z-index:600;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;animation:cinFade .45s ease forwards;font-family:inherit;}
    @keyframes cinFade{from{opacity:0}to{opacity:1}}
    .cinPanel{width:min(880px,90vw);border-radius:24px;padding:42px 48px 38px;background:linear-gradient(145deg,#0e1622,#0a131f);border:1px solid rgba(110,160,220,.18);box-shadow:0 24px 64px -28px rgba(0,0,0,.85), inset 0 0 48px -20px rgba(120,180,255,.28);text-align:center;color:#eaf4ff;position:relative;overflow:hidden;}
    .cinPanel:before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 20%,rgba(255,212,120,.08),transparent 70%);pointer-events:none;}
    .cinTitle{font-size:.95rem;letter-spacing:.9px;margin:0 0 18px;color:#ffdc8b;text-shadow:0 0 18px rgba(255,220,140,.55);font-weight:600;}
    .cinName{font-size:3.2rem;letter-spacing:1.4px;font-weight:800;background:linear-gradient(90deg,#ffe9a8,#ffd36b 45%,#fff1c9);-webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 18px rgba(255,210,110,.45));margin:2px 0 14px;}
    .cinCupWrap{display:flex;align-items:center;justify-content:center;margin:0 0 26px;}
    .cinCup{width:118px;height:118px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 45%,#ffeb9a,#f3d76a 60%,#caa44e 100%);box-shadow:0 0 0 3px #6a5320 inset, 0 14px 36px -16px rgba(0,0,0,.85);animation:spinY 5.2s linear infinite;position:relative;}
    .cinCup:after{content:'🏆';font-size:3rem;transform:translateZ(0);}
    @keyframes spinY{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
    .cinBtns{display:flex;gap:14px;justify-content:center;flex-wrap:wrap;margin-top:4px;}
    .cinBtns .btn{background:#23364d;color:#d8e6f5;border:none;border-radius:12px;padding:10px 18px;font-weight:700;letter-spacing:.6px;font-size:.75rem;cursor:pointer;box-shadow:0 4px 10px -4px rgba(0,0,0,.7);}
    .cinBtns .btn.primary{background:#3563a7;}
    .cinBtns .btn.danger{background:#993636;}
    .cinBtns .btn:focus-visible{outline:2px solid #ffdc8b;outline-offset:2px;}
    .cinStats{margin-top:14px;text-align:left;font-size:.78rem;color:#d2e4f7;background:#101a2a;border:1px solid #203347;border-radius:14px;padding:14px 16px;display:none;max-height:320px;overflow:auto;}
    .cinStats h4{margin:0 0 8px;font-size:.7rem;letter-spacing:1px;color:#9bbdff;text-transform:uppercase;}
    @media (max-width: 680px){.cinPanel{width:94vw;padding:28px 22px 30px;border-radius:20px;} .cinName{font-size:2.4rem;} .cinCup{width:96px;height:96px;} .cinCup:after{font-size:2.4rem;} .cinBtns{gap:10px;} .cinBtns .btn{padding:8px 14px;font-size:.72rem;} }
    `;
    const tag=document.createElement('style'); tag.id='cinStyles'; tag.textContent=css; document.head.appendChild(tag);
  }

  function computeStats(){
    const gme=g.game||{}; const players=(gme.players||[]).slice();
    const stats={mostHOH:null, hohMax:-1, mostVeto:null, vetoMax:-1, mostNoms:null, nomMax:-1, compBeast:null, compMax:-1};
    players.forEach(p=>{
      const hoh=+(p.stats?.hohWins||0); const veto=+(p.stats?.vetoWins||0); const noms=+(p.nominatedCount||0); const comps=hoh+veto;
      if(hoh>stats.hohMax){stats.hohMax=hoh; stats.mostHOH=p;} if(veto>stats.vetoMax){stats.vetoMax=veto; stats.mostVeto=p;} if(noms>stats.nomMax){stats.nomMax=noms; stats.mostNoms=p;} if(comps>stats.compMax){stats.compMax=comps; stats.compBeast=p;}
    });
    return stats;
  }
  function statsHtml(){
    const s=computeStats();
    function line(label,p,val){ if(!p) return `<div>${label}: —</div>`; return `<div>${label}: <b>${p.name}</b> (${val})</div>`; }
    return [
      '<h4>SEASON STATS</h4>',
      line('Most HOH', s.mostHOH, s.hohMax),
      line('Most Veto', s.mostVeto, s.vetoMax),
      line('Most times nominated', s.mostNoms, s.nomMax),
      line('Competition Beast (HOH+Veto)', s.compBeast, s.compMax)
    ].join('');
  }

  function ensureOverlay(){
    ensureFinaleStyles();
    let dim=document.querySelector('.cinDim');
    if(dim) return dim;
    dim=document.createElement('div'); dim.className='cinDim';
    const panel=document.createElement('div'); panel.className='cinPanel';
    panel.innerHTML=`
      <div class="cinTitle">WINNER</div>
      <div class="cinName" id="cinWinName">—</div>
      <div class="cinCupWrap"><div class="cinCup"></div></div>
      <div class="cinBtns">
        <button class="btn primary" id="cinNewSeason">NEW SEASON</button>
        <button class="btn" id="cinStatsBtn">STATS</button>
        <button class="btn" id="cinCredits">CREDITS</button>
        <button class="btn danger" id="cinExit">EXIT</button>
      </div>
      <div class="cinStats" id="cinStats">${statsHtml()}</div>`;
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // Wire buttons
    panel.querySelector('#cinExit').onclick=()=>{ try{dim.remove();}catch{} };
    panel.querySelector('#cinStatsBtn').onclick=()=>{
      const s=panel.querySelector('#cinStats'); s.style.display = (s.style.display==='none'||!s.style.display) ? 'block' : 'none';
    };
    panel.querySelector('#cinCredits').onclick=()=>{
      // Reset the flag to allow replaying credits every time
      g.__outroStarted = false;
      
      console.info('[finale] credits button clicked, playing outro');
      if(typeof g.playOutroVideo === 'function'){
        try { 
          g.__outroStarted = true;
          g.playOutroVideo(true); // Pass true to indicate manual replay
        } catch(e){ 
          console.warn('[finale] playOutroVideo error', e); 
          g.__outroStarted = false;
        }
      } else if(typeof g.startEndCreditsSequence === 'function'){
        try { 
          g.__outroStarted = true;
          g.startEndCreditsSequence(); 
        } catch(e){ 
          console.warn('[finale] startEndCreditsSequence error', e); 
          g.__outroStarted = false;
        }
      }
    };
    const newSeasonBtn=panel.querySelector('#cinNewSeason');
    newSeasonBtn.addEventListener('click', ()=>{
      console.info('[finale] NEW SEASON clicked, opening profile modal');
      
      // Disable button immediately to prevent multiple clicks
      newSeasonBtn.disabled = true;
      
      // Close the winner overlay immediately before showing profile modal
      try { dim.remove(); } catch(e) { console.warn('[finale] failed to remove overlay:', e); }
      
      // Defensive checks
      if (!g.ProfileService || !g.ProfileModal) {
        console.warn('[finale] ProfileService or ProfileModal not available, falling back to guest mode');
        startNewSeasonFlow();
        return;
      }
      
      // Show profile modal
      g.ProfileModal.show({
        autoCreate: false,
        onSelect: (profile) => {
          console.info('[finale] profile selected:', profile);
          // Set current profile
          g.ProfileService.setCurrentProfile(profile);
          // Explicitly increment season for selected profile
          g.ProfileService.incrementSeason();
          // Start new season
          startNewSeasonFlow();
        },
        onGuest: () => {
          console.info('[finale] guest mode selected');
          // Set guest mode (already starts at season 1)
          g.ProfileService.setGuestMode();
          // Start new season
          startNewSeasonFlow();
        }
      });
    }, { once: true });

    return dim;
  }

  // Helper: Start new season flow without full reload
  function startNewSeasonFlow() {
    console.info('[new-season] starting new season flow');
    
    // Clear all competition locks to ensure Week 1 is available in the new season
    try {
      if (g.CompLocks && typeof g.CompLocks.clearAllLocks === 'function') {
        g.CompLocks.clearAllLocks();
        console.info('[new-season] cleared all competition locks');
      }
    } catch(e) {
      console.warn('[new-season] failed to clear competition locks:', e);
    }
    
    // Hide the finale modal
    const dim = document.querySelector('.cinDim');
    if (dim) {
      try { dim.remove(); } catch(e) { console.warn('[new-season] failed to remove finale modal:', e); }
    }
    
    // Clear TV display state to prevent winner from persisting
    try {
      // Clear TV overlay content (where cards/winner display)
      const tvOverlayContent = document.querySelector('.tvOverlayContent');
      if (tvOverlayContent) {
        tvOverlayContent.innerHTML = '';
        console.info('[new-season] cleared TV overlay content');
      }
      
      // Clear tvViewport content
      const tvViewport = document.querySelector('.tvViewport');
      if (tvViewport) {
        // Remove any cards or overlays but keep the structure
        const cardsToRemove = tvViewport.querySelectorAll('.revealCard, .decisionCard, .lv2-overlay, .nfs-container');
        cardsToRemove.forEach(card => {
          try { card.remove(); } catch(e) {}
        });
        console.info('[new-season] cleared TV viewport cards');
      }
      
      // Clear tvOverlay (different from tvOverlayContent)
      const tvOverlay = document.getElementById('tvOverlay');
      if (tvOverlay) {
        tvOverlay.innerHTML = '';
        console.info('[new-season] cleared TV overlay');
      }
      
      // Reset TV display text
      const tvNow = document.getElementById('tvNow');
      if (tvNow) {
        tvNow.textContent = '';
      }
    } catch(e) {
      console.warn('[new-season] failed to clear TV display:', e);
    }
    
    // Clear logs for fresh season
    ['log','logGame','logSocial','logVote','logJury'].forEach(id=>{
      const el=document.getElementById(id);
      if(el) el.innerHTML='';
    });
    
    // Try to use modern API for smooth restart
    const API = g.Game || g;
    
    // Rebuild game
    if (typeof API.rebuildGame === 'function') {
      console.info('[new-season] calling rebuildGame(false)');
      API.rebuildGame(false);
    } else if (typeof API.buildCast === 'function') {
      console.info('[new-season] calling buildCast()');
      API.buildCast();
    } else {
      console.warn('[new-season] neither rebuildGame nor buildCast available, falling back to reset+reload');
      const resetBtn=document.getElementById('btnFinalReset')||document.getElementById('btnReset');
      if(resetBtn){
        resetBtn.click();
        setTimeout(()=>location.reload(), 200);
      } else {
        location.reload();
      }
      return;
    }
    
    // Start opening sequence after a brief delay to let rebuild complete
    setTimeout(() => {
      if (typeof API.startOpeningSequence === 'function') {
        console.info('[new-season] calling startOpeningSequence()');
        API.startOpeningSequence();
      } else {
        console.warn('[new-season] startOpeningSequence not available');
      }
    }, 60);
  }

  function showFinaleCinematic(winnerId){
    console.info('[finale] showingCinematic');
    g.__lastWinnerId = winnerId;
    const dim=ensureOverlay();
    const name = g.safeName?.(winnerId) || (g.getP?.(winnerId)?.name ?? 'Winner');
    const nameEl=dim.querySelector('#cinWinName'); if(nameEl) nameEl.textContent=name;
    
    // Mark game as completed for season increment logic
    try {
      localStorage.setItem('bb.lastGameCompleted', '1');
      // Store the profile ID that completed the game (if available)
      if (g.ProfileService && !g.ProfileService.isGuestMode()) {
        const profile = g.ProfileService.getCurrentProfile();
        if (profile && profile.id) {
          localStorage.setItem('bb.lastGameCompletedProfileId', profile.id);
          console.info('[finale] marked game as completed for profile:', profile.id);
        }
      }
    } catch (e) {
      console.warn('[finale] failed to mark game as completed:', e);
    }
    
    // Autoplay outro video after 5 seconds only on first call (unless already started via CREDITS button)
    // Check if outro has already been autoplayed by checking a persistent flag
    if(!g.__outroStarted && !g.__outroAutoPlayed){
      setTimeout(()=>{
        if(!g.__outroStarted && !g.__outroAutoPlayed && typeof g.playOutroVideo === 'function'){
          console.info('[finale] autoplaying outro video (first time only)');
          g.__outroStarted = true;
          g.__outroAutoPlayed = true; // Mark that autoplay has occurred
          try{
            g.playOutroVideo(false); // Pass false to indicate automatic first play
          }catch(e){
            console.warn('[finale] autoplay outro error', e);
            g.__outroStarted = false;
          }
        }
      }, 5000);
    }
    
    return dim;
  }

  function applyPreseedProfile(){
    try{
      const raw=localStorage.getItem('bb_human_profile'); if(!raw) return;
      const p=JSON.parse(raw||'{}'); if(!p || !p.name) return;
      const gme=g.game||{}; const humanId=gme.humanId; if(humanId==null) return;
      const me = g.getP?.(humanId); if(!me) return;
      me.name = p.name || me.name;
      me.age = p.age || me.age;
      me.location = p.location || me.location;
      me.occupation = p.occupation || me.occupation;
      // Update meta object
      if(!me.meta) me.meta = {};
      if(p.age) me.meta.age = parseInt(p.age, 10) || me.meta.age;
      if(p.location) me.meta.location = p.location;
      if(p.occupation) me.meta.occupation = p.occupation;
      // Update bio object (used by profile cards)
      if(!me.bio) me.bio = {};
      if(p.age) me.bio.age = p.age;
      if(p.location) me.bio.location = p.location;
      if(p.occupation) me.bio.occupation = p.occupation;
      g.updateHud?.();
    }catch{}
  }

  // Expose
  g.showFinaleCinematic = showFinaleCinematic;
  // Mark as wrapped to prevent intro-outro-video.js from overriding our 8-second autoplay logic
  g.showFinaleCinematic.__ioWrapped = true;

  document.addEventListener('DOMContentLoaded',()=>{ applyPreseedProfile(); }, {once:true});
})(window);