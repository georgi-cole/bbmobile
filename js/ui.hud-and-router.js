// MODULE: ui.hud-and-router.js
// COMPLETE FILE (updated) — includes support for return_twist phase,
// fast-forward handling for America’s Vote, jury consistency, roster, etc.
// If you had custom changes in prior versions, back them up before overwriting.

(function(g){
  'use strict';

  const UI = g.UI || (g.UI = {});
  const ensureCfg = UI.ensureCfg || function(){
    (g.game = g.game || {}).cfg = (g.game && g.game.cfg) || {};
    return g.game.cfg;
  };
  const FALLBACK = UI.FALLBACK_AVATAR || 'https://api.dicebear.com/6.x/bottts/svg?seed=Guest';

  // ------------ Jury Consistency & alivePlayers Patch ------------
  function ensureAlivePlayersPatched(){
    if (g.__alivePatched) return;
    g.__alivePatched = true;
    const rawFn = (typeof g.alivePlayers === 'function') ? g.alivePlayers : null;
    g.alivePlayers = function(){
      const players = Array.isArray(g.game?.players) ? g.game.players : [];
      const jury = new Set(g.game?.juryHouse || []);
      let list;
      if (rawFn) {
        try { list = rawFn.call(g); } catch { list = players.filter(p=>!p.evicted); }
      } else {
        list = players.filter(p=>!p.evicted);
      }
      return list.filter(p => !jury.has(p.id));
    };
  }

  function sanitizeJuryConsistency(silent){
    const game = g.game || {};
    if (!game.cfg || game.cfg.enableJuryHouse === false) return;
    const jury = Array.isArray(game.juryHouse) ? game.juryHouse.slice() : [];
    if (!jury.length) return;
    const jurySet = new Set(jury);
    const removed = [];
    (game.players||[]).forEach(p=>{
      if (!p) return;
      if (jurySet.has(p.id)) {
        if (!p.evicted) p.evicted = true;
        if (p.nominated) p.nominated = false;
      }
    });
    if (Array.isArray(game.nominees) && game.nominees.length){
      const before = game.nominees.slice();
      game.nominees = before.filter(id => !jurySet.has(id));
      before.forEach(id => { if (jurySet.has(id)) removed.push(id); });
    }
    if (jurySet.has(game.hohId)) game.hohId = null;
    if (jurySet.has(game.vetoHolder)) game.vetoHolder = null;
    if (!silent && removed.length){
      try{
        const names = removed.map(id => g.safeName?.(id)||id).join(', ');
        g.addLog?.(`Invalid nominees removed (jurors): ${names}`, 'warn');
      }catch{}
    }
  }
  g.fixJuryConsistency = sanitizeJuryConsistency;

  // ------------ Dashboard Title ------------
  function computeWeekTitle(){
    const game = g.game || {};
    let aliveCount = 0;
    try{ aliveCount = (g.alivePlayers?.()||[]).length; }catch{}
    if(aliveCount<=2) return 'Final Week';
    return 'Week ' + (game.week || 1);
  }
  function findDashboardTitleEl(){
    return document.getElementById('dashboardTitle') ||
      document.querySelector('#dashboardCard .card-title') ||
      document.querySelector('#dashboardCard h2') ||
      document.querySelector('#dashboardCard h3') ||
      document.querySelector('#actionCard h2,h3');
  }
  function updateDashboardTitleText(){
    const el = findDashboardTitleEl();
    if(!el) return;
    try{ el.textContent = computeWeekTitle(); }catch{}
  }

  // ------------ Roster Rendering ------------
  function getAvatar(p){
    return p.avatar || p.img || p.photo ||
      `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p.name||'guest')}`;
  }
  function ensureDashboardRosterHost(){
    // Remove any existing dashboard roster element
    const existingHost=document.getElementById('castRoster');
    if(existingHost) existingHost.remove();
    // Return null to disable dashboard roster rendering
    return null;
  }
  function ensureTopRosterHost(){
    let host=document.getElementById('topRoster');
    // Reuse host if already connected
    if(host && host.isConnected) return host;

    // Priority 1: Use #rosterBar if it exists (above TV)
    let container = document.getElementById('rosterBar');
    
    // Fallback: old behavior (inside TV viewport)
    if(!container){
      container = document.querySelector('.tvViewport .fitCanvas')
                 || document.querySelector('.tvViewport')
                 || document.getElementById('tv')
                 || document.getElementById('actionCard');
    }
    if(!container) return null;

    // Create host if missing
    if(!host){
      host=document.createElement('div');
      host.id='topRoster';
      host.className='top-roster';
    }

    // If using rosterBar, append directly
    if(container.id === 'rosterBar'){
      container.appendChild(host);
    } else {
      // Old behavior for fallback container
      let anchor = container.querySelector('.rosterAnchor')
                || container.querySelector('.sep')
                || container.querySelector('h1, h2, h3');

      if(anchor && anchor.parentNode === container){
        container.insertBefore(host, anchor);
      } else {
        container.appendChild(host);
      }
    }

    return host;
  }
  function computeTopTileSize(host, count){
    const gap=8;
    const w = host.clientWidth || host.getBoundingClientRect().width || 0;
    if(!w || !count) return 84;
    const size = Math.floor((w - (count-1)*gap) / count);
    return Math.max(48, Math.min(96, size));
  }
  function buildStateTags(p, game){
    const tags=[];
    if(p.hoh) tags.push({k:'hoh',label:'HOH'});
    if(game?.vetoHolder===p.id) tags.push({k:'veto',label:'VETO'});
    if(p.nominated && !p.evicted && !game.__suppressNomBadges) tags.push({k:'nom',label:'NOM'});
    if(Array.isArray(game?.juryHouse) && game.juryHouse.includes(p.id)) tags.push({k:'jury',label:'JURY'});
    if(p.winner) tags.push({k:'winner',label:'WINNER'});
    if(p.runnerUp) tags.push({k:'runner',label:'RUNNER-UP'});
    if(p.evicted) tags.push({k:'evicted',label:'EVICTED'});
    return tags;
  }

  function renderCastRoster(){
    const game=g.game; if(!game) return;
    const host=ensureDashboardRosterHost(); if(!host) return;

    // Keep original cast table visible (do not hide)
    const tblWrap=document.querySelector('#dashboardCard .list');
    if(tblWrap) tblWrap.style.display='';

    const hint=document.getElementById('castHint'); if(hint){ hint.style.display=''; hint.innerHTML=''; }

    host.innerHTML='';
    const list=document.createElement('div');
    list.className='roster-list';
    const header=document.createElement('div'); header.className='roster-row header';
header.innerHTML = `
  <div class="cell player tiny muted">Player</div>
  <div class="cell state tiny muted">State</div>
  <div class="cell evict tiny muted">Ev Wk</div>
`;
    list.appendChild(header);

    const playersSorted = (game.players||[]).slice().sort((a,b)=> (a.evicted?1:0) - (b.evicted?1:0));
    playersSorted.forEach(p=>{
      const row=document.createElement('div'); row.className='roster-row';
      if(p.evicted) row.classList.add('evicted');
      const avatarHtml = `<img class="avatar ${p.evicted?'grayed':''}" src="${getAvatar(p)}"
        alt="${UI.escapeHtml?.(p.name||'guest')}" onerror="this.onerror=null;this.src='${FALLBACK}'">`;

      const c1=document.createElement('div'); c1.className='cell player';
      c1.innerHTML = `
        <div class="chip">
          ${avatarHtml}
          <div class="meta"><div class="name">${UI.escapeHtml?.(p.name||'')}${p.human?' (You)':''}</div></div>
        </div>`;
      row.appendChild(c1);

      const c2=document.createElement('div'); c2.className='cell state';
      const tags=buildStateTags(p,game);
      c2.innerHTML = tags.length ? tags.map(t=>`<span class="tag ${t.k}">${t.label}</span>`).join(' ')
        : '<span class="tiny muted">—</span>';
      row.appendChild(c2);

      const c3=document.createElement('div'); c3.className='cell evict';
      c3.textContent = p.evicted && p.weekEvicted!=null ? String(p.weekEvicted) : '';
      row.appendChild(c3);

      list.appendChild(row);
    });
    host.appendChild(list);
  }

  // ------------ Tooltip (hover profiles) ------------
  let tipEl=null;
  function ensureProfileTip(){
    if(tipEl) return tipEl;
    tipEl=document.createElement('div');
    tipEl.id='profileTip';
    tipEl.className='profile-tip';
    tipEl.style.display='none';
    document.body.appendChild(tipEl);
    return tipEl;
  }
  function buildProfileHtml(p, game){
    const esc = (s)=> UI.escapeHtml ? UI.escapeHtml(String(s)) : String(s);
    const meta = p.meta || {};
    const age = (meta.age!=null) ? meta.age : '—';
    const sex = meta.sex || meta.gender || '—';
    const loc = meta.loc || meta.location || '—';
    const motto = meta.motto ? `“${esc(meta.motto)}”` : '—';
    let allies = [], enemies=[];
    try{ allies = (g.allyNames?.(p)||[]).slice(0,5); }catch{}
    try{ enemies = (g.enemyNames?.(p)||[]).slice(0,5); }catch{}
    const avatar = getAvatar(p);
    return `
      <div class="pt-head">
        <div class="pt-ava-wrap">
          <img class="pt-ava" src="${avatar}" alt="${esc(p.name||'guest')}"
            onerror="this.onerror=null;this.src='${FALLBACK}'">
        </div>
        <div class="pt-meta">
          <div class="pt-name">${esc(p.name||'')}</div>
          <div class="pt-sub tiny">${esc(age)} • ${esc(sex)} • ${esc(loc)}</div>
        </div>
      </div>
      <div class="pt-motto tiny muted">${motto}</div>
      <div class="pt-row"><span class="pt-label tiny muted">Allies</span>
        <span class="pt-val tiny">${esc(allies.join(', ')||'—')}</span></div>
      <div class="pt-row"><span class="pt-label tiny muted">Enemies</span>
        <span class="pt-val tiny">${esc(enemies.join(', ')||'—')}</span></div>
    `;
  }
  function positionTipNear(x, y){
    const tip = ensureProfileTip();
    const pad = 8;
    tip.style.left = (x+12) + 'px';
    tip.style.top = (y+12) + 'px';
    const r = tip.getBoundingClientRect();
    let nx = x+12, ny = y+12;
    if(r.right > window.innerWidth - pad){ nx = Math.max(pad, window.innerWidth - r.width - pad); }
    if(r.bottom > window.innerHeight - pad){ ny = Math.max(pad, window.innerHeight - r.height - pad); }
    tip.style.left = nx + 'px';
    tip.style.top = ny + 'px';
  }
  function showProfileFor(p, anchor){
    const tip = ensureProfileTip();
    const game = g.game || {};
    tip.innerHTML = buildProfileHtml(p, game);
    tip.style.display = 'block';
    if(anchor && anchor.clientX!=null) positionTipNear(anchor.clientX, anchor.clientY);
    else positionTipNear(window.innerWidth/2, window.innerHeight/2);
  }
  function hideProfileTip(){
    const tip = ensureProfileTip();
    tip.style.display='none';
  }
  g.showProfileFor = showProfileFor;
  g.hideProfileTip = hideProfileTip;

  // ------------ Top Roster ------------
  function renderTopRoster(){
    try{
      const game=g.game; if(!game) return;
      const cfg = ensureCfg();

      const host=ensureTopRosterHost(); if(!host) return;
      const show = cfg.showTopRoster !== false;
      host.style.display = show ? '' : 'none';
      if(!show){ host.innerHTML=''; return; }

      host.innerHTML='';
      const n=(game.players||[]).length;
      const tileSize=computeTopTileSize(host, n);
      host.style.setProperty('--topTile', tileSize+'px');

      const row=document.createElement('div'); row.className='top-roster-row';
      host.appendChild(row);

      (game.players||[]).forEach(p=>{
      const tile=document.createElement('div'); tile.className='top-roster-tile';
      if(p.evicted) tile.classList.add('evicted');
      if(game.__returnFlashId === p.id) tile.classList.add('return-flash');

      const wrap=document.createElement('div'); wrap.className='top-tile-avatar-wrap';
      if(p.hoh){ const b=document.createElement('div'); b.className='badge-crown'; wrap.appendChild(b); }
      if(game.vetoHolder===p.id){ const b=document.createElement('div'); b.className='badge-veto'; wrap.appendChild(b); }
      if(p.nominated && !p.evicted && !game.__suppressNomBadges){
        const b=document.createElement('div'); b.className='badge-nom'; wrap.appendChild(b);
      }
      if(p.evicted){
        const r=document.createElement('div'); r.className='ribbon-evicted small'; r.textContent='EVICTED'; wrap.appendChild(r);
      }

      const img=document.createElement('img');
      img.className='top-tile-avatar' + (p.evicted?' grayed':'');
      img.src=getAvatar(p); img.alt=p.name||'guest';
      img.onerror=function(){ this.onerror=null; this.src=FALLBACK; };
      wrap.appendChild(img);

      const name=document.createElement('div'); name.className='top-tile-name'; name.textContent=p.name;

      const moveHandler = (e)=> showProfileFor(p, e);
      const enterHandler = (e)=> showProfileFor(p, e);
      const leaveHandler = ()=> hideProfileTip();
      wrap.addEventListener('mousemove', moveHandler);
      wrap.addEventListener('mouseenter', enterHandler);
      wrap.addEventListener('mouseleave', leaveHandler);
      wrap.addEventListener('touchstart', (e)=>{ e.preventDefault(); showProfileFor(p, e.touches[0]); }, {passive:false});
      wrap.addEventListener('touchend', ()=> hideProfileTip());

      tile.appendChild(wrap); tile.appendChild(name);
      row.appendChild(tile);
    });

      if(!renderTopRoster.__wiredResize){
        renderTopRoster.__wiredResize=true;
        let rafId=null;
        window.addEventListener('resize', ()=>{
          if(rafId) cancelAnimationFrame(rafId);
          rafId=requestAnimationFrame(()=>{ try{ renderTopRoster(); }catch{} });
        });
      }
    }catch(err){
      console.error('renderTopRoster error:', err);
    }
  }
  g.renderTopRoster = renderTopRoster;

  // ------------ Jury House Panel ------------
  function renderJuryHousePanel(){
    const game = g.game || {};
    const status = document.getElementById('juryHouseStatus');
    const roster = document.getElementById('juryRoster');
    const tabBtn = document.getElementById('juryHouseTabBtn');
    const enabled = !!game.cfg?.enableJuryHouse;
    if(tabBtn) tabBtn.style.display = enabled ? '' : 'none';
    if(status) status.textContent = enabled
      ? (game.juryHouse?.length ? `Active: ${game.juryHouse.length} juror(s).` : 'Active. No jurors yet.')
      : 'Inactive.';
    if(roster){
      roster.innerHTML = (Array.isArray(game.juryHouse) && game.juryHouse.length)
        ? ('<ul>' + game.juryHouse.map(id => `<li>${g.safeName?.(id) || id}</li>`).join('') + '</ul>')
        : 'None yet.';
    }
  }

  // ------------ Competition Buttons + Flags ------------
  function ensureWeeklyCompFlags() {
    const game = g.game || {};
    game.__compFlags = game.__compFlags || { week: game.week || 1, hohPlayed: false, vetoPlayed: false };
    if (game.__compFlags.week !== game.week) {
      game.__compFlags.week = game.week;
      game.__compFlags.hohPlayed = false;
      game.__compFlags.vetoPlayed = false;
    }
    return game.__compFlags;
  }
  function markCompPlayed(kind) {
    const flags = ensureWeeklyCompFlags();
    if (kind === 'hoh') flags.hohPlayed = true;
    if (kind === 'veto') flags.vetoPlayed = true;
  }
  g.markCompPlayed = markCompPlayed;

  const COMP_SELS = {
    hoh: {
      start: '#btnHOHComp, [data-action="start-hoh"], [data-comp="hoh"] .start, #startHOH, #playHOH, .btnPlayHOH',
      submit: '#btnSubmitHOH, [data-action="submit-hoh"], .submit-hoh, button[id*="SubmitHOH"]'
    },
    veto: {
      start: '#btnVetoComp, [data-action="start-veto"], [data-comp="veto"] .start, #startVeto, #playVeto, .btnPlayVeto, button[name="vetoStart"]',
      submit: '#btnSubmitVeto, [data-action="submit-veto"], .submit-veto, button[id*="SubmitVeto"]'
    }
  };
  function normalizeButton(btn){
    try{
      btn.disabled = false;
      btn.removeAttribute('disabled');
      btn.removeAttribute('aria-disabled');
      btn.classList.remove('disabled','inactive','is-disabled','off');
      btn.style.pointerEvents = '';
      btn.style.opacity = '';
    }catch{}
  }
  function setButtonDisabled(sel, disabled) {
    document.querySelectorAll(sel).forEach(btn => {
      try {
        btn.disabled = !!disabled;
        btn.classList.toggle('disabled', !!disabled);
        if (!!disabled) {
          btn.setAttribute('aria-disabled','true');
          btn.style.pointerEvents = 'none';
          btn.style.opacity = '0.6';
        } else normalizeButton(btn);
      } catch{}
    });
  }
  function enablePhaseCompButtons() {
    const game = g.game || {};
    const flags = ensureWeeklyCompFlags();
    // Disable buttons if competition is running
    const compRunning = !!game.__compRunning;
    if (game.phase === 'hoh') setButtonDisabled(COMP_SELS.hoh.start, compRunning || !!flags.hohPlayed);
    if (game.phase === 'veto_comp' || game.phase === 'veto') {
      setButtonDisabled(COMP_SELS.veto.start, compRunning || !!flags.vetoPlayed);
      if (!flags.vetoPlayed && !compRunning) document.querySelectorAll(COMP_SELS.veto.start).forEach(normalizeButton);
    }
  }
  function wireCompSubmitDelegationOnce() {
    if (wireCompSubmitDelegationOnce.__wired) return;
    wireCompSubmitDelegationOnce.__wired = true;
    document.addEventListener('click', (e) => {
      const t = e.target;
      if (!t) return;
      if (t.matches(COMP_SELS.hoh.submit)) {
        markCompPlayed('hoh');
        setTimeout(() => setButtonDisabled(COMP_SELS.hoh.start, true), 0);
      }
      if (t.matches(COMP_SELS.veto.submit)) {
        markCompPlayed('veto');
        setTimeout(() => setButtonDisabled(COMP_SELS.veto.start, true), 0);
      }
    }, true);
    window.addEventListener('bb:comp:submitted', (e)=>{
      const kind = e?.detail?.kind;
      if(kind==='hoh' || kind==='veto'){
        markCompPlayed(kind);
        const sel = kind==='hoh' ? COMP_SELS.hoh.start : COMP_SELS.veto.start;
        setTimeout(()=> setButtonDisabled(sel,true), 0);
      }
    });
  }

  // ------------ HUD Update ------------
  function updateHud(){
    sanitizeJuryConsistency(true);
    const game=g.game; if(!game) return;

    function setText(id, val){
      const el = document.getElementById(id);
      if(el) el.textContent = String(val);
    }

    setText('phase', game.phase);
    setText('week', game.week);
    setText('hoh', game.hohId ? g.safeName(game.hohId) : 'none');
    setText('noms', (game.nominees && game.nominees.length) ? game.nominees.map(g.safeName).join(', ') : '–');
    setText('veto', game.vetoHolder ? g.safeName(game.vetoHolder) : '–');

    const aliveCount = (typeof g.alivePlayers === 'function') ? (g.alivePlayers().length) : '—';
    setText('alive', aliveCount);

    const dbl=document.getElementById('doubleBadge');
    const tpl=document.getElementById('tripleBadge');
    const isDouble = game.__twistMode==='double' || game.doubleEvictionWeek===true;
    const isTriple = game.__twistMode==='triple' || game.tripleEvictionWeek===true;
    if(dbl) dbl.style.display = (isDouble && !isTriple) ? '' : 'none';
    if(tpl) tpl.style.display = isTriple ? '' : 'none';

    updateDashboardTitleText();
    renderCastRoster();
    renderTopRoster();
    renderJuryHousePanel();
  }
  g.updateHud = updateHud;

  // ------------ Fast Forward / Skip ------------
  function fastForwardPhase(){
    const game=g.game; if(!game) return;
    
    // Flush all existing cards before skipping
    if(typeof g.flushAllCards === 'function'){
      g.flushAllCards('skip');
    }
    
    try{ UI.activateSkipCascade?.(game.cfg?.skipTurboWindowMs || 4500); }catch{}
    const now=Date.now();
    if(game.endAt && game.endAt-now>1200){
      game.endAt = now + 1000;
      // Keep phaseEndsAt in sync for modules relying on it (e.g., veto auto-submit)
      game.phaseEndsAt = game.endAt;
    }

    // Special: return_twist immediate finalize
    if(game.phase === 'return_twist'){
      try{ g.finishAmericaReturnVote?.(); }catch{}
      return;
    }

    if(game.phase==='livevote' && typeof g.beginDiaryRoomSequence==='function'){
      try{ g.beginDiaryRoomSequence(); }catch{}
    }
  }
  g.fastForwardPhase = fastForwardPhase;

  // ------------ Opening Sequence (unchanged core) ------------
  function ensureSkipIntroButton(){
    let btn=document.getElementById('btnSkipIntro');
    if(btn) return btn;
    const tv=document.getElementById('tv'); if(!tv) return null;
    btn=document.createElement('button');
    btn.id='btnSkipIntro'; btn.className='btn small';
    btn.textContent='Skip';
    btn.title='Fast-forward this phase';
    btn.style.cssText='position:absolute;top:10px;right:12px;z-index:11;pointer-events:auto;';
    tv.appendChild(btn);
    btn.onclick=()=>fastForwardPhase();
    return btn;
  }
  function removeSkipIntroButton(){ const b=document.getElementById('btnSkipIntro'); if(b) b.remove(); }
  function clearIntroDeck(){ const deck=document.getElementById('introDeck'); if(deck) deck.remove(); }
  function buildProfileCard(p){
    const avatar = p.avatar || p.img || p.photo
      || `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(p.name||'guest')}`;
    const card=document.createElement('div');
    card.className='revealCard introCard';
    card.style.maxWidth='320px';
    card.innerHTML = `
      <h3>Meet the Cast</h3>
      <div style="display:flex;gap:12px;align-items:flex-start">
        <img class="avatar" style="width:60px;height:60px;border-width:3px"
          src="${avatar}" alt="${UI.escapeHtml?.(p.name||'guest')}"
          onerror="this.onerror=null;this.src='${FALLBACK}'">
        <div style="text-align:left">
          <div class="big">${UI.escapeHtml?.(p.name||'')}</div>
          <div class="tiny muted">${UI.escapeHtml?.(p.meta?.loc||'—')} • ${UI.escapeHtml?.(p.meta?.occupation||'—')}</div>
        </div>
      </div>`;
    return card;
  }
  function showDualProfileCards(p1,p2,durMs){
    const isMobile = window.innerWidth <= 640;
    
    const deck=(function(){
      let d=document.getElementById('introDeck');
      if(d) return d;
      const tv=document.getElementById('tv'); if(!tv) return null;
      d=document.createElement('div'); d.id='introDeck';
      d.style.cssText='position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;gap:18px;z-index:10;pointer-events:none;';
      tv.appendChild(d);
      return d;
    })();
    if(!deck) return null;
    
    // Mobile: sequential single cards
    if(isMobile){
      const perCard = Math.floor(durMs / 2); // Split duration for 2 cards
      const cards = [p1, p2].filter(p => p);
      const timeouts = [];
      
      cards.forEach((p, idx) => {
        const id = setTimeout(() => {
          if(!deck) return;
          deck.innerHTML = '';
          const card = buildProfileCard(p);
          deck.appendChild(card);
          
          // Apply fitInViewport if available
          setTimeout(() => {
            if(typeof g.TV?.fitInViewport === 'function'){
              g.TV.fitInViewport(card);
            }
          }, 100);
          
          const holdDelay = Math.max(0, (perCard/1000) - 0.65);
          card.style.animation = 'slideIn .55s ease forwards, slideOut .6s ease-in forwards ' + holdDelay + 's';
        }, idx * perCard);
        timeouts.push(id);
      });
      
      // Clear deck after all cards
      const clearId = setTimeout(() => { if(deck) deck.innerHTML = ''; }, durMs);
      timeouts.push(clearId);
      
      // Return first timeout for skip compatibility
      return timeouts[0];
    }
    
    // Desktop: dual cards (original behavior)
    deck.innerHTML='';
    const c1=p1?buildProfileCard(p1):null;
    const c2=p2?buildProfileCard(p2):null;
    if(c1) deck.appendChild(c1);
    if(c2) deck.appendChild(c2);
    const holdDelay = Math.max(0, (durMs/1000)-0.65);
    [c1,c2].forEach(el=>{ if(!el) return; el.style.animation='slideIn .55s ease forwards, slideOut .6s ease-in forwards '+holdDelay+'s'; });
    const id=setTimeout(()=>{ if(deck) deck.innerHTML=''; }, durMs);
    return id;
  }
  function startOpeningSequence(){
    const game=g.game; if(!game) return;
    game.phase='opening'; updateHud(); g.renderPanel?.();
    g.tv?.say?.('Season Premiere');
    try{ g.setMusic?.('theme_opening', true); }catch{}
    g.setPhase('opening', game.cfg?.tOpening || 90, g.finishOpening);
    try{
      const players=[...(game.players||[])];
      const pairs=[]; for(let i=0;i<players.length;i+=2){ pairs.push([players[i], players[i+1]]); }
      const perPair=5600, gap=150;
      game.__introHandles = [];
      ensureSkipIntroButton();
      pairs.forEach((pair,idx)=>{
        const id=setTimeout(()=>{
          try{ const hid=showDualProfileCards(pair[0], pair[1], perPair-100); if(hid!=null) game.__introHandles.push(hid); }catch{}
        }, idx*(perPair+gap));
        game.__introHandles.push(id);
      });
    }catch{}
  }
  g.startOpeningSequence = startOpeningSequence;
  function skipIntro(userTriggered){
    const game=g.game||{};
    if(Array.isArray(game.__introHandles)){
      game.__introHandles.forEach(h=>clearTimeout(h));
      game.__introHandles=[];
    }
    clearIntroDeck();
    removeSkipIntroButton();
    if(userTriggered) g.finishOpening();
  }
  g.skipIntro = skipIntro;
  function finishOpening(){
    const game=g.game; if(!game) return;
    skipIntro(false);
    UI.showCard?.('Get Ready',['HOH Competition'],'hoh',2000);
    g.tv?.say?.('HOH Competition soon…');
    g.setPhase('intermission', game.cfg?.tIntermission || 4, ()=>{ g.tv?.say?.('HOH Competition'); g.startHOH?.(); });
  }
  g.finishOpening = finishOpening;

  // ------------ Phase Router ------------
  let tickHandle=null;
  function setPhase(phase, seconds, onTimeout){
    const game=g.game; if(!game) return;
    sanitizeJuryConsistency(true);

    // Cancel any pending cards from previous phase
    if(typeof g.CardQueue?.cancelAll === 'function'){
      g.CardQueue.cancelAll();
    }
    // Attach queue to new phase
    if(typeof g.CardQueue?.attachToPhase === 'function'){
      g.CardQueue.attachToPhase(phase);
    }

    // Show/hide LIVE badge for voting phases
    if(typeof g.TV?.setLiveBadge === 'function'){
      const isVotePhase = (phase === 'livevote' || phase === 'tiebreak');
      g.TV.setLiveBadge(isVotePhase);
    }

    game.phase=phase;
    ensureCfg();
    g.phaseMusic?.(phase);

    // Toggle copy disabling for competitions
    try{
      const body=document.body;
      const compPhases=['hoh','veto_comp','final3_comp1','final3_comp2'];
      if(compPhases.includes(phase)) body.classList.add('no-copy');
      else body.classList.remove('no-copy');
    }catch{}

    UI.ensureLogTabs?.();
    UI.wireLogTabsOnce?.();
    UI.selectLogTabForPhase?.(phase);

    try{
      if(!g.__twistsInitDone){ g.twists?.init?.(); g.__twistsInitDone = true; }
      g.twists?.onPhaseChange?.(phase);
      if(phase === 'intermission'){ g.twists?.decideForWeek?.(); }
      if(phase === 'nominations'){ g.twists?.prepareNominations?.(); }
      if(phase === 'livevote'){ g.twists?.beforeLiveVote?.(); }
    }catch(e){ console.warn('[twists] hook error', e); }

    if(!seconds){
      const map = {
        opening: game.cfg.tOpening,
        intermission: game.cfg.tIntermission,
        hoh: game.cfg.tHOH,
        nominations: game.cfg.tNoms,
        veto_comp: game.cfg.tVeto,
        veto: game.cfg.tVeto,
        veto_ceremony: game.cfg.tVetoDec,
        livevote: game.cfg.tLiveVote,
        jury: game.cfg.tJury,
        return_twist: 14,
        final3_comp1: game.cfg.tFinal3Comp1,
        final3_comp2: game.cfg.tFinal3Comp2,
        final3_decision: game.cfg.tFinal3Decision,
        social: game.cfg.tSocial
      };
      seconds = map[phase] || seconds || 0;
    }

    updateHud(); g.renderPanel?.(); enablePhaseCompButtons();

    clearInterval(tickHandle); game.pendingAdvance=null;

    const bar=document.getElementById('tvProgressFill');
    function setClock(str){
      const cd=document.getElementById('countdown'); if(cd) cd.textContent=str;
      const tt=document.getElementById('tvTimer'); if(tt) tt.textContent=str;
    }

    if(!seconds){
      setClock('00:00'); if(bar) bar.style.width='0%';
      try{
        if(typeof onTimeout==='function'){ onTimeout(); }
        else { defaultAdvance(phase); }
      }catch(e){ console.error(e); }
      try{ g.twists?.afterPhase?.(phase); }catch{}
      return;
    }

    game.endAt=Date.now()+seconds*1000; const total=seconds*1000;
    // Expose a canonical phase end pointer used by other modules (e.g., veto auto-submit)
    game.phaseEndsAt = game.endAt;

    function tick(){
      const rem=game.endAt-Date.now();
      if(rem<=0){
        clearInterval(tickHandle); setClock('00:00'); if(bar) bar.style.width='0%';
        try{
          if(typeof onTimeout==='function'){ onTimeout(); }
          else { defaultAdvance(phase); }
        }catch(e){ console.error(e); }
        try{ g.twists?.afterPhase?.(phase); }catch{}
        return;
      }
      const s=Math.ceil(rem/1000), m=Math.floor(s/60), r=s%60;
      setClock(`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`);
      if(bar) bar.style.width=((rem/total)*100)+'%';
    }
    tickHandle=setInterval(tick,200); tick();
  }
  g.setPhase = setPhase;

  function defaultAdvance(phase){
    try{
      if(phase === 'opening' && typeof g.finishOpening === 'function'){ return g.finishOpening(); }
      if(phase === 'intermission'){
        if(typeof g.startHOH === 'function') return g.startHOH();
      }
      if(phase === 'return_twist'){
        // If twist didn’t finalize itself for some reason:
        g.finishAmericaReturnVote?.();
        return;
      }
      if(phase === 'nominations'){
        const tried = ['startVetoCompetition','startVetoComp','startVeto','beginVeto','beginVetoComp','onNominationsEnd','afterNominations'];
        for(const fn of tried){ if(typeof g[fn] === 'function'){ return g[fn](); } }
        if(typeof g.setPhase === 'function'){
          return g.setPhase('veto_comp', (g.game?.cfg?.tVeto || 40), null);
        }
      }
      if(phase === 'veto' || phase === 'veto_comp'){
        if(typeof g.setPhase === 'function'){
          return g.setPhase('veto_ceremony', (g.game?.cfg?.tVetoDec || 25), null);
        }
      }
      if(phase === 'veto_ceremony'){
        if(typeof g.beginDiaryRoomSequence === 'function') return g.beginDiaryRoomSequence();
      }
      if(phase === 'livevote'){
        if(typeof g.afterLiveVote === 'function') return g.afterLiveVote();
      }
      if(typeof g.onPhaseEnd === 'function') return g.onPhaseEnd(phase);
      if(typeof g.advanceGame === 'function') return g.advanceGame(phase);
      if(typeof g.nextPhase === 'function') return g.nextPhase();
      updateHud();
    }catch(e){ console.warn('[defaultAdvance]', e); }
  }

  // ------------ Panel Router ------------
  function renderPanel(){
    const panel=document.getElementById('panel'); if(!panel) return;
    const game=g.game || {};
    panel.innerHTML='';

    if(game.phase==='lobby'){ panel.innerHTML='<div class="tiny muted">Open Settings and Restart Season to begin.</div>'; updateHud(); return; }
    if(game.phase==='opening'){ panel.innerHTML='<div class="tiny muted">Season Premiere…</div>'; return; }
    if(game.phase==='return_twist'){ g.renderReturnTwistPanel?.(); return; }
    if(game.phase==='nominations'){ g.renderNominationsPanel?.(); return; }
    if(game.phase==='veto_ceremony'){ g.renderVetoCeremonyPanel?.(); return; }
    if(game.phase==='final3_decision'){ g.renderFinal3DecisionPanel?.(); return; }
    if(game.phase==='jury'){ g.renderJuryVotePanel?.(); return; }
    if(game.phase==='livevote'){ g.renderLiveVotePanel?.(); return; }

    const compPhases=['hoh','veto_comp','veto','final3_comp1','final3_comp2'];
    if(compPhases.includes(game.phase)){ g.renderCompPanel?.(panel); return; }

    if(game.phase?.startsWith?.('social')){ g.renderSocialPhase?.(panel); return; }

    panel.innerHTML=`<div class="tiny muted">Game running… (${game.phase})</div>`;
  }
  g.renderPanel = renderPanel;

  // ------------ Debug / Settings Wiring ------------
  function dumpSocialToLogs(){
    const gme=g.game||{}; const players = gme.players||[];
    const AL = g.ALLY_T ?? 0.28, EN = g.ENEMY_T ?? -0.28;
    const lines=[];
    players.forEach(p=>{
      const aff=p.affinity||{};
      const allies=[], enemies=[];
      Object.keys(aff).forEach(id=>{
        const v=aff[id];
        if(v>AL) allies.push(g.safeName?.(+id)||String(id));
        if(v<EN) enemies.push(g.safeName?.(+id)||String(id));
      });
      lines.push(`${p.name}: allies [${allies.join(', ')||'—'}], enemies [${enemies.join(', ')||'—'}]`);
    });
    try{
      lines.forEach(l=> g.addLog?.(l,'tiny'));
      console.log('[Dump Social]', lines.join('\n'));
      g.showCard?.('Debug', ['Social dump written to log.'],'live',2000,true);
    }catch(e){}
  }

  function forceReturnTwist(){
    const gme=g.game||{};
    const cfg=ensureCfg();
    cfg.enableJuryHouse = true;
    if(!Array.isArray(gme.juryHouse) || gme.juryHouse.length===0){
      const ev = (gme.players||[]).filter(p=>p.evicted).map(p=>p.id);
      gme.juryHouse = ev.slice(-6);
    }
    setTimeout(()=>{ try{ g.startAmericaReturnVote?.(); }catch(e){} }, 60);
  }
  g.forceReturnTwist = forceReturnTwist;

  function exportSave(){
    try{
      const game = g.game || {};
      const clean = JSON.parse(JSON.stringify(game, (k,v)=> (typeof v==='function' ? undefined : v)));
      const json = JSON.stringify(clean, null, 2);
      const blob = new Blob([json], {type:'application/json'});
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      const wk = game.week!=null ? `week${game.week}` : 'save';
      a.download = `bb_${wk}.json`;
      document.body.appendChild(a); a.click();
      setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
      g.addLog?.('Exported save to file.','ok');
    }catch(err){
      try{
        const json = JSON.stringify(g.game || {}, (k,v)=> (typeof v==='function' ? undefined : v));
        navigator.clipboard?.writeText(json);
        g.addLog?.('Exported save to clipboard.','ok');
      }catch(e2){
        g.addLog?.('Export failed.','danger');
      }
    }
  }
  g.exportSave = exportSave;

  function wireSettingsToggles(){
    const cfg = ensureCfg();
    try{
      const saved = localStorage.getItem('bb.showTopRoster');
      if(saved!=null){ cfg.showTopRoster = (saved === 'true'); }
    }catch{}
    const candidates = [
      '#chkShowTopRoster','[data-setting="showTopRoster"]',
      'input[name="showTopRoster"]','input#showTopRoster'
    ];
    let chk = null;
    for(const sel of candidates){
      const el = document.querySelector(sel);
      if(el){ chk = el; break; }
    }
    if(chk){
      const current = (cfg.showTopRoster !== false);
      try{ chk.checked = current; }catch{}
      chk.addEventListener('change', ()=>{
        cfg.showTopRoster = !!chk.checked;
        try{ localStorage.setItem('bb.showTopRoster', String(cfg.showTopRoster)); }catch{}
        g.updateHud?.();
      });
    }
  }

  function wireDebugButtons(){
    function onClick(selector, handler){
      const btns = Array.from(document.querySelectorAll(selector));
      btns.forEach(btn=>{
        if(btn.__wiredDebug) return;
        btn.__wiredDebug = true;
        btn.addEventListener('click', (e)=>{ e.preventDefault(); handler(); });
      });
    }
    onClick('#btnDumpSocial, [data-action="dump-social"], button[name="dumpSocial"]', dumpSocialToLogs);
    onClick('#btnForceReturnTwist, [data-action="force-return-twist"], button[name="forceReturnTwist"]', forceReturnTwist);
    onClick('#btnSkipPhase, [data-action="skip-phase"], button[name="skipPhase"]', fastForwardPhase);
    onClick('#btnExportSave, [data-action="export-save"], button[name="exportSave"]', exportSave);

    const labelMap = [
      ['dump social', dumpSocialToLogs],
      ['force return twist', forceReturnTwist],
      ['skip phase', fastForwardPhase],
      ['export save', exportSave]
    ];
    Array.from(document.querySelectorAll('button')).forEach(b=>{
      const txt = (b.textContent||'').trim().toLowerCase();
      for(const [label,fn] of labelMap){
        if(txt.includes(label) && !b.__wiredDebug){
          b.__wiredDebug = true;
          b.addEventListener('click', (e)=>{ e.preventDefault(); fn(); });
        }
      }
    });

    if(!wireDebugButtons.__delegated){
      wireDebugButtons.__delegated = true;
      document.addEventListener('click', (e)=>{
        const t=e.target;
        if(!(t instanceof Element)) return;
        const selDump = '#btnDumpSocial, [data-action="dump-social"], button[name="dumpSocial"]';
        const selForce= '#btnForceReturnTwist, [data-action="force-return-twist"], button[name="forceReturnTwist"]';
        const selSkip = '#btnSkipPhase, [data-action="skip-phase"], button[name="skipPhase"]';
        const selExport='#btnExportSave, [data-action="export-save"], button[name="exportSave"]';
        if(t.matches(selDump)){ e.preventDefault(); dumpSocialToLogs(); }
        if(t.matches(selForce)){ e.preventDefault(); forceReturnTwist(); }
        if(t.matches(selSkip)){ e.preventDefault(); fastForwardPhase(); }
        if(t.matches(selExport)){ e.preventDefault(); exportSave(); }
      }, true);
    }
  }

  const PREV_INIT_SETTINGS = UI.initSettingsUI;
  UI.initSettingsUI = function initSettingsUIWrapped(){
    try{ PREV_INIT_SETTINGS && PREV_INIT_SETTINGS.apply(this, arguments); }catch(e){}
    ensureAlivePlayersPatched();
    sanitizeJuryConsistency(true);
    wireSettingsToggles();
    wireDebugButtons();
  };

  // ------------ Init ------------
  function init(){
    UI.initSettingsUI?.();
    wireCompSubmitDelegationOnce();
    UI.ensureLogTabs?.();
    UI.wireLogTabsOnce?.();
    UI.selectLogTab?.('all');
    ensureAlivePlayersPatched();
    sanitizeJuryConsistency(true);
    updateHud();
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

})(window);