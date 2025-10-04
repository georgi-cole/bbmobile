// Finale cinematic: lights out, big winner name, rotating cup, and actions.
(function(g){
  'use strict';

  // REMOVED: Legacy finale overlay styles (.cinDim, .cinPanel, rotating cup) per requirements
  // The outro video is now the primary end sequence

  // REMOVED: Legacy overlay functions (computeStats, statsHtml, ensureOverlay) per requirements
  // These were part of the deprecated cinematic overlay with rotating cup

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

  // REMOVED: showFinaleCinematic function per requirements
  // Legacy overlay with rotating cup and manual buttons removed
  // Outro video now plays directly after jury winner announcement
  function showFinaleCinematic(winnerId){
    console.warn('[finale] showFinaleCinematic is deprecated - legacy overlay removed per requirements');
    console.info('[finale] Use playOutroVideo() or startEndCreditsSequence() instead');
    // Persist winner ID for outro replay
    g.__lastWinnerId = winnerId;
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
