// America's Vote — Juror Return (screen flash, sound, dramatic entrance, etc.)
(function(global){
  'use strict';

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
      return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(String(id))}`;
    }
    
    // Priority: player.avatar > player.img > player.photo > dicebear
    if (p.avatar) return p.avatar;
    if (p.img) return p.img;
    if (p.photo) return p.photo;
    
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p.name || String(id))}`;
  }
  
  // Standard onerror handler for avatars
  function getAvatarFallback(name, failedUrl) {
    // Use global fallback if available
    if (global.getAvatarFallback) {
      return global.getAvatarFallback(name, failedUrl);
    }
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(name || 'player')}`;
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
    if(global.game?.__americaReturnDone) return;
    const jurors = Array.isArray(global.game?.juryHouse) ? global.game.juryHouse.slice() : [];
    if(jurors.length < 1) return;

    // Twist announcement now handled by showTwistAnnouncementIfNeeded modal
    // Old cards removed: Stop the presses!, America's Vote, How it works

    // Show panel (avatars + live bars, timer starts)
    showReturnVotePanel(jurors, Number(global.game?.cfg?.tJuryReturnVote||12), (state)=>{
      finalizeAmericaVote(state, jurors);
    });
  }

  // Jury panel with avatars and live percentages
  function showReturnVotePanel(jurors, voteSecs, onDone) {
    const panel = document.getElementById('panel');
    if (!panel) return;
    panel.innerHTML = '';
    const box = document.createElement('div'); box.className = 'minigame-host';
    box.innerHTML = `<h3>America's Vote — Juror Return</h3>
      <div class="tiny muted">Who will return? Bars fill for ${voteSecs}s.</div>`;
    const grid = document.createElement('div');
    grid.style.cssText = 'display:flex;flex-direction:row;gap:24px;justify-content:center;margin-top:12px;';

    // Each juror gets a bar and avatar
    const state = { counts: new Map(), total: 0 };
    jurors.forEach((id, i) => {
      state.counts.set(id, 5 + Math.floor(Math.random()*5));
      state.total += state.counts.get(id);
      const cell = document.createElement('div');
      cell.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:6px;';
      const jurorName = global.safeName?.(id) || String(id);
      const avatarUrl = getAvatar(id);
      const img = document.createElement('img');
      img.src = avatarUrl;
      img.alt = jurorName;
      img.style.cssText = 'width:54px;height:54px;border-radius:12px;border:2px solid #8fd3ff;box-shadow:0 2px 10px -4px #8fd3ff;';
      img.onerror = function() {
        console.info(`[jury_return_vote] avatar fallback used for juror=${id} url=${this.src}`);
        this.onerror = null;
        this.src = getAvatarFallback(jurorName, this.src);
      };
      
      cell.innerHTML = `
        <div style="height:14px;width:84px;background:#1d2740;border-radius:9px;border:1px solid #2a3b5a;overflow:hidden;">
          <div class="avBar" style="height:100%;width:0%;background:linear-gradient(90deg,#6fd3ff,#74e48b);box-shadow:0 0 8px -2px #6fd3ff;transition:width .24s"></div>
        </div>
        <span class="avPct tiny muted">0%</span>
      `;
      cell.insertBefore(img, cell.firstChild);
      cell.setAttribute('data-j-id', id);
      grid.appendChild(cell);
    });
    box.appendChild(grid);

    // Countdown timer
    const timer = document.createElement('div');
    timer.className = 'tiny muted'; timer.style.marginTop = '7px';
    box.appendChild(timer);

    panel.appendChild(box);

    // Animate bars for voteSecs seconds
    let running = true;
    const start = Date.now();
    const endAt = start + voteSecs*1000;
    function update() {
      if (!running) return;
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((endAt-now)/1000));
      timer.textContent = `${rem}s remaining…`;
      jurors.forEach((id) => {
        // Simulate voting
        const inc = 2 + Math.floor(Math.random()*3);
        state.counts.set(id, state.counts.get(id)+inc);
        state.total += inc;
      });
      // Update bars and percentages
      jurors.forEach((id) => {
        const cell = grid.querySelector(`[data-j-id="${id}"]`);
        if(!cell) return;
        const pct = Math.round((state.counts.get(id)/state.total)*100);
        const bar = cell.querySelector('.avBar');
        const lab = cell.querySelector('.avPct');
        if(bar) bar.style.width = `${pct}%`;
        if(lab) lab.textContent = `${pct}%`;
      });
      if(now < endAt) {
        setTimeout(update, 170);
      } else {
        running = false;
        if(onDone) onDone(state);
      }
    }
    update();
  }

  // Flash returning juror, update game state, show card
  function finalizeAmericaVote(state, jurors) {
    let winnerId = null, best = -1;
    jurors.forEach(id => {
      const v = state.counts.get(id)||0;
      if(v>best){ best=v; winnerId=id; }
    });

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

      // Resume HOH, do NOT increment week
      setTimeout(()=>{
        global.setPhase?.('intermission', global.game.cfg?.tIntermission || 4, ()=>{
          global.startHOH?.();
        });
        global.updateHud?.();
        global.game.__americaReturnDone=true;
      }, 1800);
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