// Finale cinematic: lights out, big winner name, rotating cup, and actions.
(function(g){
  'use strict';

  function ensureFinaleStyles(){
    if(document.getElementById('cinStyles')) return;
    const css = `
    .cinDim{position:fixed;inset:0;background:radial-gradient(120% 120% at 50% 10%,rgba(2,6,10,.9),rgba(0,0,0,.98)),#000;
      z-index:400;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;animation:cinFade .45s ease forwards;}
    @keyframes cinFade{from{opacity:0}to{opacity:1}}
    .cinPanel{width:min(820px,90vw);border-radius:18px;padding:24px 24px 20px;background:linear-gradient(145deg,#0e1622,#0a131f);
      border:1px solid rgba(110,160,220,.18);box-shadow:0 18px 48px -20px rgba(0,0,0,.8), inset 0 0 38px -16px rgba(120,180,255,.25);
      text-align:center;color:#eaf4ff;}
    .cinTitle{font-size:1.05rem;letter-spacing:.8px;margin:0 0 10px;color:#ffdc8b;text-shadow:0 0 16px rgba(255,220,140,.5);}
    .cinName{font-size:2.6rem;letter-spacing:1.2px;font-weight:800;background:linear-gradient(90deg,#ffe9a8,#ffd36b 45%,#fff1c9);
      -webkit-background-clip:text;color:transparent;filter:drop-shadow(0 0 16px rgba(255,210,110,.45));margin:4px 0 8px;}
    .cinCupWrap{display:flex;align-items:center;justify-content:center;margin:6px 0 12px;}
    .cinCup{width:88px;height:88px;border-radius:50%;display:flex;align-items:center;justify-content:center;
      background:radial-gradient(circle at 50% 45%,#ffeb9a,#f3d76a 60%,#caa44e 100%);
      box-shadow:0 0 0 2px #6a5320 inset, 0 10px 30px -14px rgba(0,0,0,.8); animation:spinY 4.5s linear infinite;}
    .cinCup::after{content:'🏆';font-size:2.1rem;transform:translateZ(0);}
    @keyframes spinY{0%{transform:rotateY(0)}100%{transform:rotateY(360deg)}}
    .cinBtns{display:flex;gap:10px;justify-content:center;flex-wrap:wrap}
    .cinBtns .btn{background:#1f344d;color:#d8e6f5;border:none;border-radius:10px;padding:8px 14px;font-weight:700;letter-spacing:.6px;}
    .cinBtns .btn.primary{background:#3563a7}
    .cinBtns .btn.danger{background:#993636}
    .cinStats{margin-top:10px;text-align:left;font-size:.78rem;color:#cfe0f5;background:#101a2a;border:1px solid #203347;border-radius:12px;padding:12px;display:none;}
    .cinFieldRow{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:8px;}
    .cinFieldRow label{display:flex;flex-direction:column;gap:4px;font-size:.72rem;color:#cfe0f5}
    .cinFieldRow input{background:#122233;color:#eaf4ff;border:1px solid #2b4767;border-radius:8px;padding:8px 10px;font-size:.86rem;}
    .cinProfile{display:none;margin-top:10px;padding-top:10px;border-top:1px dashed #284058;}
    @media (max-width: 540px) {
      .cinPanel{width:94vw;padding:16px 12px;border-radius:14px;}
      .cinTitle{font-size:.95rem;margin-bottom:8px;}
      .cinName{font-size:2rem;letter-spacing:1px;}
      .cinCup{width:72px;height:72px;}
      .cinCup::after{font-size:1.8rem;}
      .cinBtns{gap:8px;}
      .cinBtns .btn{padding:6px 12px;font-size:.82rem;letter-spacing:.5px;}
      .cinStats{padding:10px;font-size:.74rem;}
      .cinFieldRow{grid-template-columns:1fr;gap:8px;}
      .cinFieldRow label{font-size:.7rem;}
      .cinFieldRow input{width:100%;box-sizing:border-box;padding:7px 9px;font-size:.84rem;}
      .cinProfile{padding-top:8px;}
      #cinProfileStart{display:block;margin:10px auto 0;width:auto;}
    }
    `;
    const tag=document.createElement('style'); tag.id='cinStyles'; tag.textContent=css; document.head.appendChild(tag);
  }

  // UPDATED: Stats come from p.stats.hohWins, p.stats.vetoWins, and p.nominatedCount
  function computeStats(){
    const gme=g.game||{}; const players=(gme.players||[]).slice();
    const stats={
      mostHOH:null, hohMax:-1,
      mostVeto:null, vetoMax:-1,
      mostNoms:null, nomMax:-1,
      compBeast:null, compMax:-1
    };
    players.forEach(p=>{
      const hoh  = +(p.stats?.hohWins || 0);
      const veto = +(p.stats?.vetoWins || 0);
      const noms = +(p.nominatedCount || 0);
      const comps = hoh + veto;
      if(hoh>stats.hohMax){ stats.hohMax=hoh; stats.mostHOH=p; }
      if(veto>stats.vetoMax){ stats.vetoMax=veto; stats.mostVeto=p; }
      if(noms>stats.nomMax){ stats.nomMax=noms; stats.mostNoms=p; }
      if(comps>stats.compMax){ stats.compMax=comps; stats.compBeast=p; }
    });
    return stats;
  }

  function statsHtml(){
    const s=computeStats();
    function line(label,p,val){ if(!p) return `<div>${label}: —</div>`; return `<div>${label}: <b>${p.name}</b> (${val})</div>`; }
    return [
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
        <button class="btn primary" id="cinNewSeason">New Season</button>
        <button class="btn" id="cinStatsBtn">Stats</button>
        <button class="btn" id="cinCredits">Credits</button>
        <button class="btn danger" id="cinExit">Exit</button>
      </div>
      <div class="cinStats" id="cinStats">${statsHtml()}</div>
      <div class="cinProfile" id="cinProfile">
        <div class="tiny muted">Create your player profile for the next season.</div>
        <div class="cinFieldRow">
          <label>Name<input id="cinPName" placeholder="Your name"/></label>
          <label>Age<input id="cinPAge" placeholder="Age"/></label>
        </div>
        <div class="cinFieldRow">
          <label>Location<input id="cinPLoc" placeholder="City, Country"/></label>
          <label>Occupation<input id="cinPOcc" placeholder="Occupation"/></label>
        </div>
        <div style="margin-top:10px;text-align:right">
          <button class="btn primary" id="cinProfileStart">Start New Season</button>
        </div>
      </div>
    `;
    dim.appendChild(panel);
    document.body.appendChild(dim);

    // wires
    panel.querySelector('#cinExit').onclick=()=>{ dim.remove(); };
    panel.querySelector('#cinStatsBtn').onclick=()=>{
      const s=panel.querySelector('#cinStats'); s.style.display = (s.style.display==='none'||!s.style.display) ? 'block' : 'none';
    };
    panel.querySelector('#cinCredits').onclick=()=>{
      dim.remove();
      if(typeof g.playOutroVideo === 'function'){
        try { g.playOutroVideo(); } catch(e){ console.warn('[finale] playOutroVideo error', e); }
      } else if(typeof g.startCreditsSequence === 'function'){
        try { g.startCreditsSequence(); } catch(e){ console.warn('[finale] startCreditsSequence error', e); }
      }
    };
    panel.querySelector('#cinNewSeason').onclick=()=>{
      const prof=panel.querySelector('#cinProfile'); prof.style.display='block';
      const s=panel.querySelector('#cinStats'); if(s) s.style.display='block';
    };
    panel.querySelector('#cinProfileStart').onclick=()=>{
      const profile={
        name: (panel.querySelector('#cinPName')?.value||'You').trim(),
        age: (panel.querySelector('#cinPAge')?.value||'').trim(),
        location: (panel.querySelector('#cinPLoc')?.value||'').trim(),
        occupation: (panel.querySelector('#cinPOcc')?.value||'').trim()
      };
      try{ localStorage.setItem('bb_human_profile', JSON.stringify(profile)); }catch{}
      // clear logs
      ['log','logGame','logSocial','logVote','logJury'].forEach(id=>{ const el=document.getElementById(id); if(el) el.innerHTML=''; });
      // prefer existing reset/start controls if present
      const hardResetBtn=document.getElementById('btnFinalReset') || document.getElementById('btnReset');
      if(hardResetBtn){ hardResetBtn.click(); setTimeout(()=>location.reload(), 200); }
      else { location.reload(); }
    };

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
      g.updateHud?.();
    }catch{}
  }

  // Public's Favourite Player feature (DEPRECATED - moved to jury.js pre-jury flow)
  async function showPublicFavourite(winnerId){
    console.warn('[finale] showPublicFavourite is deprecated. Public Favourite now runs pre-jury in jury.js');
    
    const cfg = g.game?.cfg || {};
    if(!cfg.enablePublicFav){
      console.info('[publicFav] skipped (toggle false)');
      return; // Skip if disabled
    }
    
    // Single-run guard: ensure runs only once per season
    if(g.__publicFavouriteCompleted){
      console.info('[publicFav] skipped (already completed)');
      return;
    }
    g.__publicFavouriteCompleted = true;

    console.info('[publicFav] start (post-winner fallback)');
    
    function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
    
    // Hard timeout fallback: continue after 10s max
    const timeoutId = setTimeout(() => {
      console.warn('[publicFav] timed out after 10s');
    }, 10000);
    
    try{
      // Get all players (exclude winner if we have 3+ others)
      let allPlayers = (g.game?.players || []).filter(p => p.id !== winnerId);
      if(allPlayers.length < 3){
        // Not enough candidates, include winner
        allPlayers = g.game?.players || [];
      }
      
      // Pick 3 random candidates
      const shuffled = allPlayers.slice().sort(() => Math.random() - 0.5);
      const candidates = shuffled.slice(0, Math.min(3, allPlayers.length));
      
      // Fill to 3 if needed (duplicate or use winner)
      while(candidates.length < 3 && allPlayers.length > 0){
        const fill = allPlayers[Math.floor(Math.random() * allPlayers.length)];
        if(!candidates.some(c => c.id === fill.id)) candidates.push(fill);
        else break;
      }
      
      if(candidates.length < 3) {
        console.warn('[finale] Not enough players for Public Favourite');
        clearTimeout(timeoutId);
        return;
      }
      
      // Generate random vote percentages (normalized to 100%)
      const raw = candidates.map(() => Math.random() * 100);
      const sum = raw.reduce((a,b) => a+b, 0);
      const percentages = raw.map(v => Math.round((v/sum)*100));
      // Adjust to ensure sum is exactly 100
      const diff = 100 - percentages.reduce((a,b)=>a+b,0);
      if(diff !== 0) percentages[0] += diff;
      
      // Sort by percentage (ascending for reveal order)
      const sorted = candidates.map((c,i) => ({player:c, pct:percentages[i]}))
        .sort((a,b) => a.pct - b.pct);
      
      // Announce audience segment
      try{
        if(typeof g.showCard === 'function'){
          g.showCard('Special Segment', ['Now for a word from our audience...'], 'neutral', 2500, true);
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      await sleep(300);
      
      // Check prefers-reduced-motion
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animDuration = prefersReducedMotion ? 2000 : 5000;
      
      // Build and show voting panel with accessibility
      const panel = document.createElement('div');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-label', "Public's Favourite Player voting results");
      panel.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);z-index:500;background:linear-gradient(145deg,#0e1622,#0a131f);border:2px solid rgba(110,160,220,.25);border-radius:16px;padding:20px;width:min(500px,90vw);box-shadow:0 10px 40px rgba(0,0,0,.8);';
      
      // Add live region for accessibility
      const liveRegion = document.createElement('div');
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      liveRegion.className = 'sr-only';
      liveRegion.style.cssText = 'position:absolute;left:-10000px;width:1px;height:1px;overflow:hidden;';
      
      panel.innerHTML = `
        <h3 style="text-align:center;color:#ffdc8b;margin:0 0 16px;">Public's Favourite Player</h3>
        <div id="pubFavCandidates"></div>
      `;
      panel.appendChild(liveRegion);
      document.body.appendChild(panel);
      
      liveRegion.textContent = "Displaying vote percentages for three candidates";
      
      const candidatesDiv = panel.querySelector('#pubFavCandidates');
      sorted.forEach(({player, pct}) => {
        const playerName = g.safeName?.(player.id) || player.name;
        const row = document.createElement('div');
        row.style.cssText = 'margin:10px 0;';
        row.innerHTML = `
          <div style="color:#eaf4ff;margin-bottom:4px;font-weight:600;">${playerName}</div>
          <div style="background:#1a2838;border-radius:8px;height:24px;position:relative;overflow:hidden;" role="progressbar" aria-label="${playerName} vote percentage" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="pubFavBar pfBarFill" data-pct="${pct}" style="width:0%;height:100%;background:linear-gradient(90deg,#3563a7,#5580d0);transition:width ${animDuration}ms ease;"></div>
            <div class="pubFavPct" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);color:#fff;font-weight:700;text-shadow:0 1px 3px rgba(0,0,0,.8);">0%</div>
          </div>
        `;
        candidatesDiv.appendChild(row);
      });
      
      // Animate bars with visibility check
      let animationActive = true;
      const visibilityHandler = () => {
        if(document.hidden) animationActive = false;
      };
      document.addEventListener('visibilitychange', visibilityHandler);
      
      await sleep(100);
      
      // Start bar animation
      panel.querySelectorAll('.pubFavBar').forEach(bar => {
        const pct = bar.dataset.pct;
        bar.style.width = pct + '%';
      });
      
      // Animate percentages counting up with RAF
      const startTime = Date.now();
      let rafId = null;
      
      function animatePercentages(){
        if(!animationActive || !document.body.contains(panel)){
          if(rafId) cancelAnimationFrame(rafId);
          return;
        }
        
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / animDuration, 1);
        
        panel.querySelectorAll('.pubFavBar').forEach((bar) => {
          const target = parseInt(bar.dataset.pct);
          const current = Math.floor(target * progress);
          const pctSpan = bar.parentElement.querySelector('.pubFavPct');
          const progressBar = bar.parentElement;
          if(pctSpan) pctSpan.textContent = current + '%';
          if(progressBar) progressBar.setAttribute('aria-valuenow', current);
        });
        
        if(progress < 1 && animationActive){
          rafId = requestAnimationFrame(animatePercentages);
        }
      }
      
      rafId = requestAnimationFrame(animatePercentages);
      
      await sleep(animDuration + 500);
      
      if(rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('visibilitychange', visibilityHandler);
      
      liveRegion.textContent = "Voting complete, preparing to reveal results";
      
      await sleep(200);
      panel.remove();
      
      // "Let's reveal the votes"
      try{
        if(typeof g.showCard === 'function'){
          g.showCard('Results', ['Let\'s reveal the votes...'], 'neutral', 2000, true);
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      await sleep(400);
      
      // Reveal 3rd place
      try{
        if(typeof g.showCard === 'function'){
          const name = g.safeName?.(sorted[0].player.id) || sorted[0].player.name;
          g.showCard('3rd Place', [`${name} — ${sorted[0].pct}%`], 'neutral', 2000);
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      await sleep(1200);
      
      // Reveal 2nd place
      try{
        if(typeof g.showCard === 'function'){
          const name = g.safeName?.(sorted[1].player.id) || sorted[1].player.name;
          g.showCard('2nd Place', [`${name} — ${sorted[1].pct}%`], 'neutral', 2000);
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      await sleep(1200);
      
      // Reveal Fan Favourite with cheer
      const fanFav = sorted[2];
      try{
        if(typeof g.showCard === 'function'){
          const name = g.safeName?.(fanFav.player.id) || fanFav.player.name;
          g.showCard('Fan Favourite! 🌟', [`${name} — ${fanFav.pct}%`], 'ok', 3500);
        }
        // Play cheer only for winner
        if(typeof g.playCheerSfx === 'function'){
          try {
            g.playCheerSfx();
          } catch(e) {
            console.info('[finale] playCheerSfx error:', e);
          }
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      await sleep(400);
      
      // Congratulations
      try{
        if(typeof g.showCard === 'function'){
          const name = g.safeName?.(fanFav.player.id) || fanFav.player.name;
          g.showCard('Congratulations!', [`${name}, you are the Public's Favourite!`], 'ok', 3000);
        }
        if(typeof g.cardQueueWaitIdle === 'function'){
          await g.cardQueueWaitIdle();
        }
      }catch(e){ console.warn('[finale] showCard error:', e); }
      
      console.info('[publicFav] done');
      
    } catch(e){
      console.warn('[publicFav] error:', e.message || e);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function showFinaleCinematic(winnerId){
    // D) Persist winner ID for outro replay
    g.__lastWinnerId = winnerId;
    
    const dim=ensureOverlay();
    const name = g.safeName?.(winnerId) || (g.getP?.(winnerId)?.name ?? 'Winner');
    dim.querySelector('#cinWinName').textContent = name;
    
    // Public's Favourite is now called via startEndCreditsSequence wrapper (see end-credits.js)
    // Removed from here to ensure it runs after cinematic and before credits
  }

  // expose
  g.showFinaleCinematic = showFinaleCinematic;
  g.showPublicFavourite = showPublicFavourite;

  // Debug test hook (for QA) - updated to use new pre-jury logic
  g.__debugRunPublicFavOnce = function(){
    const cfg = g.game?.cfg || {};
    if(!cfg.enablePublicFav){
      console.warn('[finale] Public Favourite is disabled in settings');
      return;
    }
    const phase = g.game?.phase || 'lobby';
    if(phase !== 'finale' && phase !== 'jury'){
      console.warn('[finale] Debug hook should only be used post-winner (current phase:', phase, ')');
    }
    
    // Use new pre-jury integration if available
    if(typeof g.maybeRunPublicFavouriteBeforeJury === 'function'){
      // Reset flags to allow re-run
      if(g.game?.finale) g.game.finale.publicFavDone = false;
      g.__publicFavouriteCompleted = false;
      console.info('[finale] Using new pre-jury Public Favourite flow');
      g.maybeRunPublicFavouriteBeforeJury();
    } else {
      // Fallback to old implementation
      g.__publicFavouriteCompleted = false;
      const winnerId = g.__lastWinnerId || g.game?.players?.find(p => p.winner)?.id;
      if(!winnerId){
        console.warn('[finale] No winner found');
        return;
      }
      showPublicFavourite(winnerId);
    }
  };

  // Enhanced debug hook (development helper) - as specified in problem statement
  if(!window.__debugRunPublicFavOnce){
    window.__debugRunPublicFavOnce = function(){
      try {
        const g = window.game || window;
        if(!g) return console.warn('No game');
        const w = (g.players||[]).find(p=>p.winner)?.id;
        if(!w) return console.warn('Winner not set');
        g.cfg = g.cfg || {};
        g.cfg.enablePublicFav = true;
        try {
          localStorage.setItem('bb_config', JSON.stringify(g.cfg));
        } catch(e) {
          console.warn('[publicFav] localStorage save failed', e);
        }
        if(typeof window.showPublicFavourite === 'function'){
          console.info('[publicFav] debug manual trigger');
          // Reset guard to allow re-run
          if(window.game) window.game.__publicFavouriteCompleted = false;
          if(g) g.__publicFavouriteCompleted = false;
          window.showPublicFavourite(w);
        } else {
          console.warn('showPublicFavourite missing');
        }
      } catch(e){ 
        console.error('[publicFav] debug error', e);
      }
    };
  }

  // apply preseed profile (after reload/new season)
  document.addEventListener('DOMContentLoaded',()=>{ applyPreseedProfile(); }, {once:true});

})(window);
