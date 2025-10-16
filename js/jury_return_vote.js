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

    // Show panel (avatars + live bars, timer starts)
    showReturnVotePanel(jurors, Number(global.game?.cfg?.tJuryReturnVote||12), (state)=>{
      finalizeAmericaVote(state, jurors);
    });
  }

  // Jury panel with avatars and live percentages - MODERNIZED
  function showReturnVotePanel(jurors, voteSecs, onDone) {
    const panel = document.getElementById('panel');
    if (!panel) return;
    panel.innerHTML = '';
    
    // Modern container with gradient background
    const container = document.createElement('div');
    container.style.cssText = `
      background: linear-gradient(135deg, rgba(13,27,42,0.95) 0%, rgba(27,38,59,0.95) 100%);
      border-radius: 24px;
      padding: 32px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4), 0 0 1px rgba(255,255,255,0.1) inset;
      backdrop-filter: blur(10px);
      border: 1px solid rgba(255,255,255,0.1);
      max-width: 900px;
      margin: 0 auto;
    `;
    
    // Modern header with better typography
    const header = document.createElement('div');
    header.style.cssText = 'text-align:center;margin-bottom:28px;';
    header.innerHTML = `
      <h2 style="
        font-size:2rem;
        font-weight:700;
        margin:0 0 8px 0;
        background:linear-gradient(135deg,#00d9ff 0%,#00e0cc 50%,#7effa3 100%);
        -webkit-background-clip:text;
        -webkit-text-fill-color:transparent;
        background-clip:text;
        letter-spacing:-0.5px;
      ">🗳️ America's Vote</h2>
      <div style="
        font-size:1.1rem;
        color:#8fb4d4;
        font-weight:500;
      ">Which juror deserves a second chance?</div>
    `;
    container.appendChild(header);
    
    // Grid for juror cards
    const grid = document.createElement('div');
    grid.style.cssText = `
      display:grid;
      grid-template-columns:repeat(auto-fit,minmax(160px,1fr));
      gap:20px;
      margin-bottom:24px;
    `;

    // Each juror gets a modern card
    const state = { counts: new Map(), total: 0 };
    jurors.forEach((id, i) => {
      state.counts.set(id, 5 + Math.floor(Math.random()*5));
      state.total += state.counts.get(id);
      
      const jurorName = global.safeName?.(id) || String(id);
      const avatarUrl = getAvatar(id);
      
      // Modern card design
      const card = document.createElement('div');
      card.style.cssText = `
        background:linear-gradient(135deg,rgba(20,35,55,0.8) 0%,rgba(30,45,65,0.6) 100%);
        border-radius:16px;
        padding:20px;
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:12px;
        border:1px solid rgba(143,211,255,0.2);
        box-shadow:0 8px 24px rgba(0,0,0,0.3);
        transition:all 0.3s cubic-bezier(0.4,0,0.2,1);
        position:relative;
        overflow:hidden;
      `;
      card.setAttribute('data-j-id', id);
      
      // Animated glow effect
      const glow = document.createElement('div');
      glow.style.cssText = `
        position:absolute;
        top:-50%;
        left:-50%;
        width:200%;
        height:200%;
        background:radial-gradient(circle,rgba(143,211,255,0.1) 0%,transparent 70%);
        animation:pulse 3s ease-in-out infinite;
        pointer-events:none;
      `;
      card.appendChild(glow);
      
      // Avatar with modern styling
      const avatarWrap = document.createElement('div');
      avatarWrap.style.cssText = `
        position:relative;
        width:120px;
        height:120px;
        border-radius:50%;
        padding:4px;
        background:linear-gradient(135deg,#00d9ff,#00e0cc);
        box-shadow:0 8px 24px rgba(0,224,204,0.4);
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
        border:3px solid #0d1b2a;
      `;
      img.onerror = function() {
        console.info(`[jury_return_vote] avatar fallback used for juror=${id} url=${this.src}`);
        this.onerror = null;
        this.src = getAvatarFallback(jurorName, this.src);
      };
      avatarWrap.appendChild(img);
      card.appendChild(avatarWrap);
      
      // Name with modern typography
      const nameLabel = document.createElement('div');
      nameLabel.style.cssText = `
        font-size:1.1rem;
        font-weight:700;
        color:#e8f4ff;
        letter-spacing:-0.3px;
      `;
      nameLabel.textContent = jurorName;
      card.appendChild(nameLabel);
      
      // Vote count and percentage
      const voteInfo = document.createElement('div');
      voteInfo.className = 'vote-info';
      voteInfo.style.cssText = `
        display:flex;
        flex-direction:column;
        align-items:center;
        gap:6px;
        width:100%;
      `;
      voteInfo.innerHTML = `
        <div class="vote-count" style="
          font-size:1.5rem;
          font-weight:700;
          color:#00e0cc;
          text-shadow:0 2px 12px rgba(0,224,204,0.5);
        ">0</div>
        <div style="
          font-size:0.85rem;
          color:#8fb4d4;
          font-weight:500;
        ">votes</div>
      `;
      card.appendChild(voteInfo);
      
      // Modern progress bar
      const barContainer = document.createElement('div');
      barContainer.style.cssText = `
        width:100%;
        height:8px;
        background:rgba(20,35,55,0.6);
        border-radius:6px;
        overflow:hidden;
        box-shadow:0 2px 8px rgba(0,0,0,0.3) inset;
      `;
      
      const bar = document.createElement('div');
      bar.className = 'avBar';
      bar.style.cssText = `
        height:100%;
        width:0%;
        background:linear-gradient(90deg,#00d9ff,#00e0cc,#7effa3);
        box-shadow:0 0 12px rgba(0,224,204,0.6);
        transition:width 0.4s cubic-bezier(0.4,0,0.2,1);
        border-radius:6px;
      `;
      barContainer.appendChild(bar);
      card.appendChild(barContainer);
      
      // Percentage label
      const pctLabel = document.createElement('div');
      pctLabel.className = 'avPct';
      pctLabel.style.cssText = `
        font-size:1.2rem;
        font-weight:700;
        color:#8fd3ff;
        text-shadow:0 2px 8px rgba(143,211,255,0.4);
      `;
      pctLabel.textContent = '0%';
      card.appendChild(pctLabel);
      
      grid.appendChild(card);
    });
    container.appendChild(grid);

    // Modern countdown timer
    const timerWrap = document.createElement('div');
    timerWrap.style.cssText = `
      text-align:center;
      padding:16px;
      background:rgba(0,224,204,0.1);
      border-radius:12px;
      border:1px solid rgba(0,224,204,0.2);
    `;
    const timer = document.createElement('div');
    timer.style.cssText = `
      font-size:1.3rem;
      font-weight:700;
      color:#00e0cc;
      text-shadow:0 2px 12px rgba(0,224,204,0.5);
    `;
    timerWrap.appendChild(timer);
    container.appendChild(timerWrap);
    
    panel.appendChild(container);

    // Add pulse animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes pulse {
        0%, 100% { opacity: 0.3; transform: scale(1); }
        50% { opacity: 0.6; transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);

    // Animate bars for voteSecs seconds
    let running = true;
    const start = Date.now();
    const endAt = start + voteSecs*1000;
    function update() {
      if (!running) return;
      const now = Date.now();
      const rem = Math.max(0, Math.ceil((endAt-now)/1000));
      timer.innerHTML = `⏱️ <span style="font-size:1.5rem">${rem}</span>s remaining`;
      
      jurors.forEach((id) => {
        // Simulate voting
        const inc = 2 + Math.floor(Math.random()*3);
        state.counts.set(id, state.counts.get(id)+inc);
        state.total += inc;
      });
      
      // Update bars, percentages, and vote counts
      jurors.forEach((id) => {
        const card = grid.querySelector(`[data-j-id="${id}"]`);
        if(!card) return;
        
        const count = state.counts.get(id);
        const pct = Math.round((count/state.total)*100);
        
        const bar = card.querySelector('.avBar');
        const pctLabel = card.querySelector('.avPct');
        const voteCount = card.querySelector('.vote-count');
        
        if(bar) bar.style.width = `${pct}%`;
        if(pctLabel) pctLabel.textContent = `${pct}%`;
        if(voteCount) voteCount.textContent = count;
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
        // Flags already set at eligibility check
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