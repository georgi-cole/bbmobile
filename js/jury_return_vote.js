// America's Vote — Juror Return (screen flash, sound, dramatic entrance, etc.)
(function(global){
  'use strict';

  // Import centralized avatar constants
  const getDicebearUrl = global.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'player')}`;
  };

  // Helper for avatar images - uses global resolver
  function getAvatar(id) {
    // Use global resolver if available
    if (global.resolveAvatar) {
      return global.resolveAvatar(id);
    }
    
    // Fallback to local implementation
    const p = global.getP?.(id);
    if (!p) {
      console.warn(`[jury_return_vote] avatar: player not found id=${id}`);
      return getDicebearUrl(String(id));
    }
    
    // Priority: player.avatar > player.img > player.photo > dicebear
    if (p.avatar) return p.avatar;
    if (p.img) return p.img;
    if (p.photo) return p.photo;
    
    return getDicebearUrl(p.name || String(id));
  }
  
  // Standard onerror handler for avatars
  function getAvatarFallback(name, failedUrl) {
    // Use global fallback if available
    if (global.getAvatarFallback) {
      return global.getAvatarFallback(name, failedUrl);
    }
    return getDicebearUrl(name || 'player');
  }

  // Full screen flash effect
  function flashScreen() {
    let ov = document.createElement('div');
    ov.className = 'flash-overlay';
    document.body.appendChild(ov);
    setTimeout(() => { ov.remove(); }, 720);
  }

  // Play sound effect (assets/dramatic-flash.mp3)
  function playFlashSfx() {
    let audio = document.getElementById('dramaticFlashSfx');
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'dramaticFlashSfx';
      audio.src = 'assets/dramatic-flash.mp3';
      audio.preload = 'auto';
      document.body.appendChild(audio);
    }
    audio.currentTime = 0;
    audio.volume = 0.82;
    audio.play();
  }

  // Sequence: flash -> sound -> announcement cards -> panel
  async function runJurorReturnTwist() {
    const g=global.game||{};
    
    // Use centralized decision logic (includes eligibility + RNG, cached per week)
    // If helpers are available, use them; otherwise use local fallback
    if(typeof global.decideJurorReturnThisWeek === 'function'){
      if(!global.decideJurorReturnThisWeek(g)) return;
    } else {
      // Fallback: local eligibility checks (mirrors old behavior)
      if(g.__americaReturnDone || g.__jurorReturnDone) return;
      const alive=(typeof global.alivePlayers==='function')?global.alivePlayers():[];
      const aliveCount=alive.length;
      const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];
      const jurorCount=jurors.length;
      const initialPlayers=Number(g.cfg?.numPlayers||12);
      if(aliveCount<5) return;
      const requiredJurors=(initialPlayers>10)?5:4;
      if(jurorCount<requiredJurors) return;
      if(jurors.length<1) return;
      const returnChance=Number(g.cfg?.returnChance||g.cfg?.juryReturnChance||g.cfg?.jurorReturnChance||g.cfg?.pJuryReturn||0);
      const normalizedChance=(returnChance>1)?returnChance:returnChance*100;
      const roll=Math.random()*100;
      if(roll>=normalizedChance) return;
    }

    // ======= TWIST ACTIVATED - SET FLAGS =======
    // Set both flags to prevent twist from running again this season
    g.__americaReturnDone=true;
    g.__jurorReturnDone=true;

    const jurors=Array.isArray(g.juryHouse)?g.juryHouse.slice():[];

    // Twist announcement now handled by showTwistAnnouncementIfNeeded modal
    // Old cards removed: Stop the presses!, America's Vote, How it works

    // Clamp vote duration to max 5 seconds (5000ms)
    const g = global.game || {};
    const cfgVoteMs = Number(g.cfg?.tJurorReturnVoteMs || g.cfg?.tJurorVoteMs || g.cfg?.tJuryReturnVote || 6500);
    const VOTE_MAX_MS = 5000;
    const voteDurationMs = Math.min(Math.max(1200, cfgVoteMs), VOTE_MAX_MS);
    const voteDurationSecs = voteDurationMs / 1000;
    
    console.info(`[jury_return_vote] voteDurationMs=${voteDurationMs} (cfg=${cfgVoteMs} clamped to max ${VOTE_MAX_MS}ms)`);

    // Store duration in state for reference
    if (g.__returnTwist) {
      g.__returnTwist.durationMs = voteDurationMs;
    }

    // Show panel (avatars + live bars, timer starts)
    showReturnVotePanel(jurors, voteDurationSecs, voteDurationMs, (state)=>{
      finalizeAmericaVote(state, jurors);
    });
  }

  // Jury panel with avatars and live percentages - COMPACT & CONSISTENT
  function showReturnVotePanel(jurors, voteSecs, voteDurationMs, onDone) {
    const panel = document.getElementById('panel');
    if (!panel) return;
    panel.innerHTML = '';
    
    // Check if mobile
    const isMobile = window.innerWidth < 768;
    
    // Compact container (single cohesive element for all jurors)
    const container = document.createElement('div');
    container.className = 'juror-vote-container';
    container.style.cssText = `
      background: linear-gradient(135deg, rgba(13,27,42,0.95) 0%, rgba(27,38,59,0.95) 100%);
      border-radius: ${isMobile ? '16px' : '20px'};
      padding: ${isMobile ? '20px' : '28px'};
      box-shadow: 0 12px 40px rgba(0,0,0,0.35), 0 0 1px rgba(255,255,255,0.08) inset;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      max-width: ${isMobile ? '100%' : '800px'};
      margin: 0 auto;
      ${isMobile ? 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 9999; width: calc(100% - 32px);' : ''}
    `;
    
    // Compact header
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:20px;';
    header.innerHTML = `
      <h2 style="
        font-size:${isMobile ? '1.5rem' : '1.8rem'};
        font-weight:700;
        margin:0 0 6px 0;
        background:linear-gradient(135deg,#00d9ff 0%,#00e0cc 50%,#7effa3 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
        background-clip:text;
        letter-spacing:-0.5px;
      ">🗳️ America's Vote</h2>
      <div style="
        font-size:${isMobile ? '0.9rem' : '1rem'};
        color:#8fb4d4;
        font-weight:500;
      ">Which juror deserves a second chance?</div>
    `;
    container.appendChild(header);
    
    // Add mobile dimmed backdrop if needed
    let backdrop = null;
    if (isMobile) {
      backdrop = document.createElement('div');
      backdrop.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.85);
        z-index: 9998;
      `;
      document.body.appendChild(backdrop);
    }
    
    // Compact grid for juror tiles (single cohesive container)
    const grid = document.createElement('div');
    grid.className = 'juror-tiles-grid';
    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(${isMobile ? '120px' : '140px'},1fr));
      gap:${isMobile ? '12px' : '16px'};
      margin-bottom:${isMobile ? '16px' : '20px'};
      background:rgba(0,0,0,0.15);
      border-radius:12px;
      padding:${isMobile ? '12px' : '16px'};
      border:1px solid rgba(255,255,255,0.05);
    `;

    // Each juror gets a modern card
    const state = { counts: new Map(), total: 0 };
    jurors.forEach((id, i) => {
      state.counts.set(id, 5 + Math.floor(Math.random()*5));
      state.total += state.counts.get(id);
      
      const jurorName = global.safeName?.(id) || String(id);
      const avatarUrl = getAvatar(id);
      
      // Compact card design (tile-like, no animated glow)
      const card = document.createElement('div');
      card.className = 'juror-tile';
      card.style.cssText = `
        background:linear-gradient(135deg,rgba(20,35,55,0.7) 0%,rgba(30,45,65,0.5) 100%);
        border-radius:${isMobile ? '10px' : '12px'};
        padding:${isMobile ? '12px' : '16px'};
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:${isMobile ? '8px' : '10px'};
        border:1px solid rgba(143,211,255,0.15);
        box-shadow:0 4px 12px rgba(0,0,0,0.2);
        transition:border-color 0.2s ease;
        position:relative;
      `;
      card.setAttribute('data-j-id', id);
      
      // Compact avatar
      const avatarWrap = document.createElement('div');
      avatarWrap.style.cssText = `
        position:relative;
        width:${isMobile ? '70px' : '85px'};
        height:${isMobile ? '70px' : '85px'};
        border-radius:50%;
        padding:3px;
        background:linear-gradient(135deg,#00d9ff,#00e0cc);
        box-shadow:0 4px 16px rgba(0,224,204,0.3);
      `;
      
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = jurorName;
      img.style.cssText = `
        width:100%;
        height:100%;
        border-radius:50%;
        object-fit:cover;
        background:#1a2942;
        border:2px solid #0d1b2a;
      `;
      img.onerror = function() {
        console.info(`[jury_return_vote] avatar fallback used for juror=${id} url=${this.src}`);
        this.onerror = null;
        this.src = getAvatarFallback(jurorName, this.src);
      };
      avatarWrap.appendChild(img);
      card.appendChild(avatarWrap);
      
      // Compact name
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = `
        font-size:${isMobile ? '0.9rem' : '1rem'};
        font-weight:700;
        color:#e8f4ff;
        letter-spacing:-0.2px;
        text-align:center;
        max-width:100%;
        overflow:hidden;
        text-overflow:ellipsis;
        white-space:nowrap;
      `;
      nameLabel.textContent = jurorName;
      card.appendChild(nameLabel);
      
      // Percentage only (no progress bar, no vote count - consistent with Fan Favorite)
      const pctLabel = document.createElement('div');
      pctLabel.className = 'avPct';
      pctLabel.style.cssText = `
        font-size:${isMobile ? '1.5rem' : '1.8rem'};
        font-weight:800;
        color:#00e0cc;
        text-shadow:0 2px 12px rgba(0,224,204,0.5);
      `;
      pctLabel.textContent = '0%';
      card.appendChild(pctLabel);
      
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // Compact countdown timer
    const timerWrap = document.createElement('div');
    timerWrap.style.cssText = `
      text-align:center;
      padding:${isMobile ? '12px' : '14px'};
      background:rgba(0,224,204,0.08);
      border-radius:10px;
      border:1px solid rgba(0,224,204,0.18);
    `;
    const timer = document.createElement('div');
    timer.style.cssText = `
      font-size:${isMobile ? '1.1rem' : '1.2rem'};
      font-weight:700;
      color:#00e0cc;
      text-shadow:0 2px 10px rgba(0,224,204,0.4);
    `;
    timerWrap.appendChild(timer);
    container.appendChild(timerWrap);
    
    panel.appendChild(container);

    // Animate percentages only (no progress bars) and highlight leader
    let running = true;
    let updateInterval = null;
    const start = Date.now();
    const endAt = start + voteDurationMs; // Use clamped duration in ms
    let leaderId = null;
    
    function update() {
      if (!running) return;
      const now = Date.now();
      const elapsed = now - start;
      const rem = Math.max(0, Math.ceil((voteDurationMs - elapsed)/1000));
      timer.innerHTML = `⏱️ <span style="font-size:${isMobile ? '1.3rem' : '1.5rem'}">${rem}</span>s remaining`;
      
      // Stop updates when time expires
      if (elapsed >= voteDurationMs) {
        running = false;
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        // Clean up mobile backdrop
        if (backdrop && backdrop.parentNode) {
          backdrop.remove();
        }
        console.info(`[jury_return_vote] voting stopped elapsed=${elapsed}ms`);
        if(onDone) onDone(state);
        return;
      }
      
      jurors.forEach((id) => {
        // Simulate voting
        const inc = 2 + Math.floor(Math.random()*3);
        state.counts.set(id, state.counts.get(id)+inc);
        state.total += inc;
      });
      
      // Find leader
      let maxCount = -1;
      jurors.forEach((id) => {
        const count = state.counts.get(id);
        if (count > maxCount) {
          maxCount = count;
          leaderId = id;
        }
      });
      
      // Update percentages and highlight leader
      jurors.forEach((id) => {
        const card = grid.querySelector(`[data-j-id="${id}"]`);
        if(!card) return;
        
        const count = state.counts.get(id);
        const pct = Math.round((count/state.total)*100);
        const isLeader = id === leaderId;
        
        const pctLabel = card.querySelector('.avPct');
        if(pctLabel) {
          pctLabel.textContent = `${pct}%`;
          // Highlight leader
          if (isLeader) {
            pctLabel.style.color = '#7effa3';
            pctLabel.style.textShadow = '0 2px 16px rgba(126,255,163,0.6)';
            pctLabel.style.fontSize = isMobile ? '1.7rem' : '2rem';
          } else {
            pctLabel.style.color = '#00e0cc';
            pctLabel.style.textShadow = '0 2px 12px rgba(0,224,204,0.5)';
            pctLabel.style.fontSize = isMobile ? '1.5rem' : '1.8rem';
          }
        }
        
        // Highlight leader card border
        if (isLeader) {
          card.style.borderColor = 'rgba(126,255,163,0.4)';
          card.style.boxShadow = '0 6px 20px rgba(126,255,163,0.3)';
        } else {
          card.style.borderColor = 'rgba(143,211,255,0.15)';
          card.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
        }
      });
    }
    
    // Use setInterval for consistent updates
    updateInterval = setInterval(update, 170);
    update(); // Run immediately
    
    // Safety timeout to ensure finalization at max duration
    setTimeout(() => {
      if (running) {
        running = false;
        if (updateInterval) {
          clearInterval(updateInterval);
          updateInterval = null;
        }
        // Clean up mobile backdrop
        if (backdrop && backdrop.parentNode) {
          backdrop.remove();
        }
        console.info(`[jury_return_vote] safety timeout triggered at ${voteDurationMs}ms`);
        if(onDone) onDone(state);
      }
    }, voteDurationMs + 100); // Add small buffer for safety
  }

  // Flash returning juror, update game state, show card
  function finalizeAmericaVote(state, jurors) {
    let winnerId = null, best = -1;
    jurors.forEach(id => {
      const v = state.counts.get(id)||0;
      if(v>best){ best=v; winnerId=id; }
    });

    // Calculate winner percentage
    const totalVotes = Array.from(state.counts.values()).reduce((sum, val) => sum + val, 0);
    const winnerPercent = totalVotes > 0 ? ((state.counts.get(winnerId) || 0) / totalVotes) * 100 : 0;

    setTimeout(async ()=>{
      await global.showBigCard?.('America Has Voted!', [
        `The returning juror is…`,
        `${global.safeName?.(winnerId)||winnerId}`
      ], 2600);

      // Update cast: set juror as active
      if(winnerId!=null){
        const p=global.getP?.(winnerId); if(p){ p.evicted=false; delete p.weekEvicted; }
        if(Array.isArray(global.game?.juryHouse)) global.game.juryHouse=global.game.juryHouse.filter(x=>x!==winnerId);

        // Mark juror as active in UI, flash
        const tbl=document.getElementById('castTbl');
        if(tbl){
          [...tbl.querySelectorAll('tr')].forEach(tr=>{
            if(tr.textContent && tr.textContent.includes(global.safeName?.(winnerId)||winnerId)){
              tr.classList.add('return-flash');
              setTimeout(()=>tr.classList.remove('return-flash'), 2200);
            }
          });
        }
        const jurorRow = document.getElementById('juryRoster');
        if(jurorRow && jurorRow.textContent && jurorRow.textContent.includes(global.safeName?.(winnerId)||winnerId)){
          jurorRow.classList.add('return-flash');
          setTimeout(()=>jurorRow.classList.remove('return-flash'), 2200);
        }
        // Confetti removed per spec
      }

      // Clean up panel (implicit via phase change)
      const panel = document.getElementById('panel');
      if (panel) panel.innerHTML = '';

      // Resume HOH, do NOT increment week
      setTimeout(()=>{
        global.setPhase?.('intermission', global.game.cfg?.tIntermission || 4, ()=>{
          global.startHOH?.();
        });
        global.updateHud?.();
        // Flags already set at eligibility check
      }, 1800);

      // After cleanup and phase change, show result card with animation
      // Schedule as async IIFE to run after panel is gone
      (async () => {
        try {
          if (typeof window.__showJurorReturnResult === 'function' && winnerId != null) {
            await window.__showJurorReturnResult(winnerId, winnerPercent);
          }
        } catch (e) {
          console.warn('[jury_return_vote] Failed to show juror return result:', e);
        }
      })();
    }, 1100);
  }

  // Observer — triggers twist at right time, only once
  let observerStarted = false;
  function bootObserver(){
    if(observerStarted) return;
    observerStarted = true;
    const el=document.getElementById('phase');
    const attempt=()=>{
      const phase = el ? el.textContent.trim() : '';
      if(phase==='jury_return_vote' && !global.game?.__americaReturnDone){
        runJurorReturnTwist();
      }
    };
    attempt();
    if(!el) return;
    const mo=new MutationObserver(attempt);
    mo.observe(el,{childList:true,subtree:true,characterData:true});
  }

  document.addEventListener('DOMContentLoaded', bootObserver, {once:true});
})(window);