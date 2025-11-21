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
  
  // Import centralized avatar constants
  const getDicebearUrl = g.getDicebearUrl || function(seed) {
    return `https://api.dicebear.com/6.x/bottts/svg?seed=${encodeURIComponent(seed || 'Guest')}`;
  };
  const FALLBACK = UI.FALLBACK_AVATAR || getDicebearUrl('Guest');

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
    
    // Return "House" before game starts
    if(!game.phase || game.phase === 'lobby') return 'House';
    
    // Return "Final Week" at final 2
    if(aliveCount<=2) return 'Final Week';
    
    // Return "Week X – [Phase Name]" during game
    const week = game.week || 1;
    const phaseName = getReadablePhaseName(game.phase);
    return `Week ${week} – ${phaseName}`;
  }
  
  function getReadablePhaseName(phase){
    const phaseNames = {
      'opening': 'Season Premiere',
      'intermission': 'Strategizing',
      'hoh': 'HOH Competition',
      'nominations': 'Nominations',
      'veto_comp': 'Veto Competition',
      'veto': 'Veto Competition',
      'veto_ceremony': 'Veto Ceremony',
      'livevote': 'Eviction',
      'jury': 'Jury Deliberation',
      'return_twist': 'Return Challenge',
      'final3_comp1': 'Final 3 – Part 1',
      'final3_comp2': 'Final 3 – Part 2',
      'final3_decision': 'Final 3 – Decision',
      'social': 'Social Time'
    };
    return phaseNames[phase] || phase.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
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
    
    // Check if using new badge+phase structure
    const weekBadge = document.getElementById('dashboardWeekBadge');
    const phaseName = document.getElementById('dashboardPhaseName');
    
    if(weekBadge && phaseName){
      // Use new structure - update via inline script function
      if(typeof window.updateDashboardHeader === 'function'){
        window.updateDashboardHeader();
      }
    } else {
      // Fallback to old behavior
      try{ el.textContent = computeWeekTitle(); }catch{}
    }
  }

  // ------------ Roster Rendering ------------
  function getAvatar(p){
    return g.resolveAvatar?.(p) || p.avatar || p.img || p.photo ||
      getDicebearUrl(p.name||'guest');
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
      // Use ProfileService if available for human player display
      const displayName = p.human && global.ProfileService?.getDisplayName
        ? global.ProfileService.getDisplayName() 
        : p.name || '';
      c1.innerHTML = `
        <div class="chip">
          ${avatarHtml}
          <div class="meta"><div class="name">${UI.escapeHtml?.(displayName)}</div></div>
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

  // ------------ Bio Panel (hover/tap profiles) ------------
  let bioPanel=null;
  let bioDebounceTimer=null;
  let currentBioPlayerId=null;
  let lastTriggerElement=null;
  function ensureBioPanel(){
    if(bioPanel) return bioPanel;
    bioPanel=document.createElement('div');
    bioPanel.id='profilePanel';
    bioPanel.className='profile-panel';
    bioPanel.style.display='none';
    bioPanel.setAttribute('tabindex', '-1');
    
    // Close on Escape
    bioPanel.addEventListener('keydown', (e)=>{
      if(e.key==='Escape') hideProfileTip();
    });
    
    // Create close button for mobile
    const closeBtn = document.createElement('button');
    closeBtn.className = 'bio-close-btn';
    closeBtn.innerHTML = '✕';
    closeBtn.setAttribute('aria-label', 'Close bio panel');
    closeBtn.addEventListener('click', (e)=>{
      e.stopPropagation();
      hideProfileTip();
    });
    bioPanel.appendChild(closeBtn);
    
    document.body.appendChild(bioPanel);
    
    // Click outside to close on mobile
    document.addEventListener('click', (e)=>{
      if(bioPanel && bioPanel.style.display==='block' && !bioPanel.contains(e.target)){
        const isMobile = window.innerWidth < 640;
        if(isMobile) hideProfileTip();
      }
    });
    
    return bioPanel;
  }
  
  // Alias for backward compatibility
  function ensureProfileTip(){ return ensureBioPanel(); }
  
  // Helper functions for bio panel
  function ordinal(n){
    const s = ['th','st','nd','rd'];
    const v = n % 100;
    return n + (s[(v-20)%10] || s[v] || s[0]);
  }
  
  function computeAlliesEnemies(p){
    const g = global.game;
    const week = g?.week ?? 1;
    
    // Visibility gate: only show from Week 2 onwards
    if(week < 2){
      return { allies: [], enemies: [] };
    }
    
    // Use new SocialRelations system if available
    if(global.SocialRelations?.computeAlliesEnemies){
      const result = global.SocialRelations.computeAlliesEnemies(p.id);
      
      // Convert to the format expected by renderBioContent
      const allies = result.alliesIds.map(id => {
        const other = g.players.find(pl => pl.id === id);
        return {
          id,
          name: other?.name || '?',
          affinity: p.affinity?.[id] ?? 0
        };
      });
      
      const enemies = result.enemiesIds.map(id => {
        const other = g.players.find(pl => pl.id === id);
        return {
          id,
          name: other?.name || '?',
          affinity: p.affinity?.[id] ?? 0
        };
      });
      
      return { allies, enemies };
    }
    
    // Fallback to legacy computation if SocialRelations not available
    const affinity = p.affinity || {};
    const ALLY_THRESHOLD = 0.50;
    const ENEMY_THRESHOLD = -0.50;
    
    const allies = [];
    const enemies = [];
    
    for(const id in affinity){
      const val = affinity[id];
      const other = (g.players || []).find(pl => pl.id === parseInt(id));
      if(!other || other.evicted) continue;
      
      if(val > ALLY_THRESHOLD){
        allies.push({ id: parseInt(id), name: other.name || '?', affinity: val });
      } else if(val < ENEMY_THRESHOLD){
        enemies.push({ id: parseInt(id), name: other.name || '?', affinity: val });
      }
    }
    
    // Sort and limit
    allies.sort((a,b) => b.affinity - a.affinity);
    enemies.sort((a,b) => a.affinity - b.affinity);
    
    return {
      allies: allies.slice(0, 4),
      enemies: enemies.slice(0, 4)
    };
  }
  
  function computeRanking(p){
    // Only compute for evicted players
    if(!p.evicted) return null;
    
    // Check if already cached
    if(p.finalRank) return ordinal(p.finalRank);
    
    // Compute ranking based on original player count and eviction order
    const game = g.game || {};
    const allPlayers = game.players || [];
    const originalCount = allPlayers.length;
    
    // Count how many players were evicted before this one
    const evictedBefore = allPlayers.filter(other => 
      other.evicted && 
      other.id !== p.id && 
      (other.weekEvicted || 0) < (p.weekEvicted || 0)
    ).length;
    
    // Rank is: total players - players evicted before
    p.finalRank = originalCount - evictedBefore;
    
    const rankStr = ordinal(p.finalRank);
    console.info(`[bio] rank id=${p.id} rank=${rankStr}`);
    return rankStr;
  }
  
  function renderBioContent(p){
    const esc = (s)=> UI.escapeHtml ? UI.escapeHtml(String(s)) : String(s);
    const bio = p.bio || {};
    const name = p.name || 'Guest';
    const gender = bio.gender || '—';
    const age = bio.age || '—';
    const location = bio.location || '—';
    const sexuality = bio.sexuality || '—';
    const occupation = bio.occupation || '—';
    const motto = bio.motto || '—';
    const funFact = bio.funFact || '—';
    
    // Compute allies and enemies
    const relations = computeAlliesEnemies(p);
    const alliesText = relations.allies.length 
      ? relations.allies.map(a => esc(a.name)).join(', ')
      : 'None';
    const enemiesText = relations.enemies.length
      ? relations.enemies.map(e => esc(e.name)).join(', ')
      : 'None';
    
    // Log relations (optional)
    if(relations.allies.length || relations.enemies.length){
      console.info(`[bio] relations id=${p.id} allies=${relations.allies.length} enemies=${relations.enemies.length}`);
    }
    
    // Compute ranking for evicted players
    const ranking = computeRanking(p);
    
    // Use cached avatar URL if available, otherwise resolve
    const avatar = p.__avatarUrl || getAvatar(p);
    if(!p.__avatarUrl) p.__avatarUrl = avatar; // Cache for next time
    
    return `
      <div class="bio-avatar-container">
        <img class="bio-avatar" src="${avatar}" alt="${esc(name)}"
          onerror="this.onerror=null;this.src='${FALLBACK}'">
      </div>
      <div class="bio-content">
        <h3 class="bio-name">${esc(name)}</h3>
        <dl class="bio-grid">
          <dt>Age</dt><dd>${esc(age)}, ${esc(gender)}</dd>
          <dt>Location</dt><dd>${esc(location)}</dd>
          <dt>Occupation</dt><dd class="bio-occupation">${esc(occupation)}</dd>
          <dt>Motto</dt><dd class="bio-motto">"${esc(motto)}"</dd>
          <dt>Fun Fact</dt><dd>${esc(funFact)}</dd>
          <dt>Allies</dt><dd>${alliesText}</dd>
          <dt>Enemies</dt><dd>${enemiesText}</dd>
          ${ranking ? `<dt>Ranking</dt><dd>${esc(ranking)}</dd>` : ''}
        </dl>
      </div>
    `;
  }
  
  function positionBioPanel(panel, event){
    const isMobile = window.innerWidth < 640;
    
    if(isMobile){
      // Mobile: bottom sheet layout
      panel.classList.add('mobile');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      // Position is handled by CSS
    } else {
      // Desktop: position near cursor
      panel.classList.remove('mobile');
      panel.setAttribute('role', 'tooltip');
      panel.removeAttribute('aria-modal');
      
      if(event && event.clientX!=null){
        const pad = 14;
        const x = event.clientX;
        const y = event.clientY;
        
        // Initial positioning
        panel.style.left = (x+12) + 'px';
        panel.style.top = (y+12) + 'px';
        
        // Get bounds and adjust if needed
        const rect = panel.getBoundingClientRect();
        let finalX = x + 12;
        let finalY = y + 12;
        
        if(rect.right > window.innerWidth - pad){
          finalX = Math.max(pad, window.innerWidth - rect.width - pad);
        }
        if(rect.bottom > window.innerHeight - pad){
          finalY = Math.max(pad, window.innerHeight - rect.height - pad);
        }
        
        panel.style.left = finalX + 'px';
        panel.style.top = finalY + 'px';
      }
    }
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
    if(!p) return;
    
    // Debounce rapid transitions
    if(bioDebounceTimer){
      clearTimeout(bioDebounceTimer);
    }
    
    bioDebounceTimer = setTimeout(()=>{
      const panel = ensureBioPanel();
      const isSamePlayer = currentBioPlayerId === p.id;
      
      // Store current player and trigger element
      currentBioPlayerId = p.id;
      if(anchor && anchor.target) lastTriggerElement = anchor.target;
      
      // Log bio display
      console.info(`[bio] show id=${p.id} name=${p.name||'unknown'}`);
      
      // Render content (with cross-fade if switching players)
      if(panel.style.display === 'block' && !isSamePlayer){
        panel.style.opacity = '0';
        setTimeout(()=>{
          panel.innerHTML = `<button class="bio-close-btn" aria-label="Close bio panel">✕</button>` + renderBioContent(p);
          panel.querySelector('.bio-close-btn').addEventListener('click', (e)=>{
            e.stopPropagation();
            hideProfileTip();
          });
          panel.style.opacity = '1';
        }, 150);
      } else {
        panel.innerHTML = `<button class="bio-close-btn" aria-label="Close bio panel">✕</button>` + renderBioContent(p);
        panel.querySelector('.bio-close-btn').addEventListener('click', (e)=>{
          e.stopPropagation();
          hideProfileTip();
        });
      }
      
      panel.style.display = 'block';
      positionBioPanel(panel, anchor);
      
      // Set aria-describedby on avatar if available
      if(anchor && anchor.target){
        anchor.target.setAttribute('aria-describedby', 'profilePanel');
      }
      
      // Focus management for keyboard access
      const isMobile = window.innerWidth < 640;
      if(isMobile && document.activeElement && document.activeElement.matches('[data-trigger-bio]')){
        panel.focus();
      }
    }, 60); // 60ms debounce
  }
  
  function hideProfileTip(){
    if(bioDebounceTimer){
      clearTimeout(bioDebounceTimer);
      bioDebounceTimer = null;
    }
    
    const panel = ensureBioPanel();
    panel.style.display='none';
    panel.classList.remove('mobile');
    currentBioPlayerId = null;
    
    console.info('[bio] hide');
    
    // Restore focus to trigger element if keyboard-activated
    if(lastTriggerElement){
      lastTriggerElement.removeAttribute('aria-describedby');
      if(document.activeElement === panel){
        lastTriggerElement.focus();
      }
      lastTriggerElement = null;
    }
  }
  
  // Public API
  g.showProfileFor = showProfileFor;
  g.hideProfileTip = hideProfileTip;
  g.showPlayerBio = function(playerId){
    const p = (g.game?.players || []).find(pl => pl.id === playerId);
    if(p) showProfileFor(p, null);
  };

  // ------------ Top Roster Helpers ------------
  /**
   * Get current POV twist type from game state.
   * @returns {'golden'|'diamond'|''} The active POV twist, or empty string if none.
   */
  function getCurrentPovTwist(){
    const game = g.game;
    if(!game) return '';
    
    // Check global activeVetoTwist first (set by veto.js)
    if(g.activeVetoTwist === 'diamond') return 'diamond';
    if(g.activeVetoTwist === 'golden') return 'golden';
    
    // Check week-level twist flags
    const week = game.weeks?.[game.week - 1] || game.weekData || {};
    if(week.twists){
      if(week.twists.diamondPOVActive) return 'diamond';
      if(week.twists.goldenPOVActive) return 'golden';
    }
    
    // Check week.povTwist property
    if(week.povTwist === 'diamond') return 'diamond';
    if(week.povTwist === 'golden') return 'golden';
    
    // Check cfg.twists fallback
    if(game.cfg?.twists){
      if(game.cfg.twists.diamondPOVActive) return 'diamond';
      if(game.cfg.twists.goldenPOVActive) return 'golden';
    }
    
    return '';
  }

  /**
   * Check if player is active (not evicted).
   */
  function isActive(p){
    return p && !p.evicted;
  }

  /**
   * Check if player is the human player.
   */
  function isHuman(p){
    const game = g.game;
    return p && game && (p.id === game.humanId || p.human === true);
  }

  /**
   * Check if player is HOH.
   */
  function isHOH(p){
    const game = g.game;
    if(!p || !game) return false;
    
    // Check player.hoh flag
    if(p.hoh) return true;
    
    // Check game.hohId
    if(game.hohId === p.id) return true;
    
    // Check game.hohIds array (for dual HOH)
    if(Array.isArray(game.hohIds) && game.hohIds.includes(p.id)) return true;
    
    return false;
  }

  /**
   * Check if player is POV holder.
   */
  function isPOV(p){
    const game = g.game;
    if(!p || !game) return false;
    
    // Check game.vetoHolder
    if(game.vetoHolder === p.id) return true;
    
    // Check game.povId
    if(game.povId === p.id) return true;
    
    // Check game.povIds array (for multiple POV holders)
    if(Array.isArray(game.povIds) && game.povIds.includes(p.id)) return true;
    
    return false;
  }

  /**
   * Check if player is a nominee.
   */
  function isNominee(p){
    const game = g.game;
    if(!p || !game) return false;
    
    // Check player.nominated flag
    if(p.nominated && !p.evicted) return true;
    
    // Check game.nominees array
    if(Array.isArray(game.nominees) && game.nominees.includes(p.id)) return true;
    
    // Check game.noms array (alternative)
    if(Array.isArray(game.noms) && game.noms.includes(p.id)) return true;
    
    // Check game.nom (single nominee)
    if(game.nom === p.id) return true;
    
    return false;
  }

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

      // Reorder players with dynamic priority: human, HOH, nominees, POV, others, then evicted
      const allPlayers = (game.players||[]).slice();
      const activePlayers = [];
      const evictedPlayers = [];
      
      allPlayers.forEach((p, idx) => {
        if(!p.__originalIndex) p.__originalIndex = idx; // Store original order
        if(p.evicted){
          evictedPlayers.push(p);
        } else {
          activePlayers.push(p);
        }
      });
      
      // Sort evicted by weekEvicted (earliest eviction first)
      evictedPlayers.sort((a, b) => (a.weekEvicted || 0) - (b.weekEvicted || 0));
      
      // Build ordered active players with priority: human, HOH, nominees, POV, remaining
      const orderedActive = [];
      const added = new Set(); // Track which players have been added
      
      // 1. Human first if active
      const humanPlayer = activePlayers.find(p => isHuman(p));
      if(humanPlayer){
        orderedActive.push(humanPlayer);
        added.add(humanPlayer.id);
      }
      
      // 2. HOH after human (unless human is HOH, then already added)
      activePlayers.forEach(p => {
        if(!added.has(p.id) && isHOH(p)){
          orderedActive.push(p);
          added.add(p.id);
        }
      });
      
      // 3. Nominees after HOH
      activePlayers.forEach(p => {
        if(!added.has(p.id) && isNominee(p)){
          orderedActive.push(p);
          added.add(p.id);
        }
      });
      
      // 4. POV holder after nominees
      activePlayers.forEach(p => {
        if(!added.has(p.id) && isPOV(p)){
          orderedActive.push(p);
          added.add(p.id);
        }
      });
      
      // 5. Remaining active players in original order
      activePlayers.forEach(p => {
        if(!added.has(p.id)){
          orderedActive.push(p);
          added.add(p.id);
        }
      });
      
      const orderedPlayers = [...orderedActive, ...evictedPlayers];

      orderedPlayers.forEach((p, displayIndex)=>{
      const tile=document.createElement('div'); tile.className='top-roster-tile';
      
      // Add data attributes for tracking
      tile.dataset.playerId = p.id || '';
      tile.dataset.originalIndex = String(p.__originalIndex || 0);
      tile.dataset.evicted = p.evicted ? 'true' : 'false';
      if(p.evicted && p.weekEvicted != null){
        tile.dataset.evictedAt = String(p.weekEvicted);
      }
      
      if(p.evicted) tile.classList.add('evicted');
      if(game.__returnFlashId === p.id) tile.classList.add('return-flash');

      const wrap=document.createElement('div'); wrap.className='top-tile-avatar-wrap';
      
      // Add position:relative to wrap for absolute positioning of avatar badge
      wrap.style.position = 'relative';
      
      // Status checks
      const hasHOH = !!p.hoh;
      const hasVeto = game.vetoHolder===p.id;
      const isWinner = p.showFinalLabel === 'WINNER' || p.winner;
      const isRunnerUp = p.showFinalLabel === 'RUNNER-UP' || p.runnerUp;
      // Show NOM for states: nominated, pendingSave, replacement
      const nomState = p.nominationState || 'none';
      const hasNom = !p.evicted && !game.__suppressNomBadges && 
        (nomState === 'nominated' || nomState === 'pendingSave' || nomState === 'replacement');
      
      // Add pulse effect for nominees
      if(hasNom){
        wrap.classList.add('nominee-pulse');
      }
      
      // Evicted overlay with SVG brush X - add only once (check data-evictAnimated)
      // Suppress rendering if visual animation is in progress for this player
      if(p.evicted){
        const isSuppressed = game.__suppressEvictedHudUntilVisualDone && 
                            game.__pendingEvictionVisuals?.has(p.id);
        
        if(!isSuppressed){
          const needsAnimation = !p.__evictAnimated;
          if(needsAnimation) p.__evictAnimated = true; // Mark as animated
          
          tile.dataset.evictAnimated = needsAnimation ? 'animating' : 'done';
          
          // Check if cross already exists to prevent duplication
          if(!wrap.querySelector('.evicted-cross')){
            const cross=document.createElement('div'); 
            cross.className='evicted-cross' + (needsAnimation ? ' animating' : '');
            // SVG brush X - theme colored
            cross.innerHTML = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4 L20 20 M20 4 L4 20" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/>
            </svg>`;
            wrap.appendChild(cross);
          }
        }
      }

      const img=document.createElement('img');
      img.className='top-tile-avatar' + (p.evicted?' grayed':'');
      img.src=getAvatar(p); img.alt=p.name||'guest';
      img.onerror=function(){ this.onerror=null; this.src=FALLBACK; };
      wrap.appendChild(img);

      // Name/Status label - show icons or text that replaces the name
      const name=document.createElement('div'); 
      name.className='top-tile-name';
      
      // Initialize label variables with fallback to player name
      // This ensures we always have a valid label even if no special status applies
      const nameLabel = (typeof g.safeName === 'function') 
        ? g.safeName(p.id) 
        : (p.name || `Player ${p.id}`);
      let labelText = nameLabel;
      let statusClass = '';
      let ariaLabel = nameLabel;
      
      // Label precedence: WINNER > RUNNER-UP > NOM > HOH/POV icons > name
      // Note: FINISHING BADGE (≥3rd) is now rendered inside avatar, not as label
      if(isWinner){
        labelText = '🥇';
        statusClass = 'status-icon-label medal-winner';
        ariaLabel = `${nameLabel} (Winner)`;
      } else if(isRunnerUp){
        labelText = '🥈';
        statusClass = 'status-icon-label medal-runner-up';
        ariaLabel = `${nameLabel} (Runner-Up)`;
      } else if(hasNom){
        labelText = 'NOM';
        statusClass = 'status-nom';
        ariaLabel = `${nameLabel} (Nominated)`;
      } else if(hasHOH && hasVeto){
        // Both HOH and POV - show both icons side by side (no twist badge in dual mode)
        name.innerHTML = '<span class="icon-hoh">👑</span><span class="icon-veto">🛡</span>';
        statusClass = 'status-icon-label hoh-pov-icons';
        ariaLabel = `${nameLabel} (Head of Household and Veto Holder)`;
      } else if(hasHOH){
        labelText = 'HOH';
        statusClass = 'status-hoh';
        ariaLabel = `${nameLabel} (Head of Household)`;
      } else if(hasVeto){
        // POV with potential twist badge
        const twist = getCurrentPovTwist();
        if(twist === 'diamond'){
          labelText = 'POV 💎';
          statusClass = 'status-pov status-pov-diamond';
          ariaLabel = `${nameLabel} (Diamond Power of Veto)`;
        } else if(twist === 'golden'){
          labelText = 'POV ⭐';
          statusClass = 'status-pov status-pov-golden';
          ariaLabel = `${nameLabel} (Golden Power of Veto)`;
        } else {
          labelText = 'POV';
          statusClass = 'status-pov';
          ariaLabel = `${nameLabel} (Veto Holder)`;
        }
      }
      
      if(!(hasHOH && hasVeto)){
        name.textContent = labelText;
      }
      if(statusClass) {
        // Split multiple classes and add them individually
        statusClass.trim().split(' ').forEach(cls => {
          if(cls) name.classList.add(cls);
        });
      }
      wrap.setAttribute('aria-label', ariaLabel);

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

      // Auto-scroll to first active player on mobile after eviction reorder
      // Only scroll if there are evicted players (roster was reordered)
      if(evictedPlayers.length > 0 && activePlayers.length > 0){
        setTimeout(() => {
          const firstActiveTile = row.querySelector('.top-roster-tile:not(.evicted)');
          if(firstActiveTile && row.scrollLeft !== 0){
            // Only scroll if not already at the beginning
            firstActiveTile.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
          }
        }, 100);
      }

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

    // Synchronize player badge states before rendering
    if(typeof g.syncPlayerBadgeStates === 'function'){
      g.syncPlayerBadgeStates();
    }

    function setText(id, val){
      const el = document.getElementById(id);
      if(el) el.textContent = String(val);
    }

    // Update HOH and Veto (POV)
    setText('hoh', game.hohId ? g.safeName(game.hohId) : 'none');
    setText('veto', game.vetoHolder ? g.safeName(game.vetoHolder) : '–');

    // Update Nominees as badges
    const nomsEl = document.getElementById('noms');
    if(nomsEl){
      if(game.nominees && game.nominees.length){
        nomsEl.innerHTML = game.nominees.map(nomId => 
          `<span class="nominee-badge">${g.safeName(nomId)}</span>`
        ).join('');
      } else {
        nomsEl.innerHTML = '–';
      }
    }

    // Update Alive count
    const aliveCount = (typeof g.alivePlayers === 'function') ? (g.alivePlayers().length) : 0;
    setText('alive', aliveCount);

    // Update Evicted count
    const totalPlayers = (game.players && game.players.length) || 0;
    const evictedCount = totalPlayers - aliveCount;
    setText('evicted', evictedCount);

    const dbl=document.getElementById('doubleBadge');
    const tpl=document.getElementById('tripleBadge');
    // Legacy HUD badges are now hidden - TV area badge is the canonical display.
    // This prevents duplicate indicators (one in HUD upper-left, one in TV bottom-left).
    // Keep DOM elements present for possible future re-enable, but force hidden.
    if(dbl) dbl.style.display = 'none';
    if(tpl) tpl.style.display = 'none';

    // Update twist badge in TV area
    if(typeof g.TV?.updateTwistBadge === 'function'){
      g.TV.updateTwistBadge();
    }

    updateDashboardTitleText();
    renderCastRoster();
    renderTopRoster();
    renderJuryHousePanel();
    
    // Update timer header with week and phase
    if(typeof window.updateTimerHeader === 'function'){
      window.updateTimerHeader();
    }
  }
  g.updateHud = updateHud;

  // ------------ Fast Forward / Skip ------------
  async function fastForwardPhase(){
    const game=g.game; if(!game) return;
    
    // Check for idempotency - if already in fast-forward or skip mode, ignore
    if(game.__ffActive){
      console.warn('[ff] Fast-forward already active, ignoring duplicate call');
      return;
    }
    if(g.SkipController && g.SkipController.isActive()){
      console.warn('[ff] Skip already active, ignoring duplicate fastForwardPhase call');
      return;
    }
    
    // Capture initial state for diagnostics
    const startRemaining = (game.phaseEndsAt || 0) - Date.now();
    const phase = game.phase || 'unknown';
    
    // Activate fast-forward mode (preserves callbacks, compresses durations)
    if(typeof g.activateFastForward === 'function'){
      g.activateFastForward({ multiplier: game.cfg?.fastForwardMultiplier || 0.1, reason: 'user' });
    }
    
    // Enable skip mode (for SkipController coordination)
    if(g.SkipController){
      g.SkipController.enable();
    } else {
      console.warn('[ff] SkipController not initialized - acceleration path may be limited');
    }
    
    // Stop audio (but don't flush cards - they'll be compressed)
    cancelAllPhaseAudio();
    
    // Special: return_twist immediate finalize (legacy behavior preserved)
    if(game.phase === 'return_twist'){
      try{ g.finishAmericaReturnVote?.(); }catch{}
      // Complete skip mode before returning
      if(g.SkipController){
        g.SkipController.complete();
      }
      return;
    }

    // Special: Social phase - accelerate AI ticks instead of immediate skip
    if((game.phase === 'social' || game.phase === 'social_intermission')){
      // Don't call endSocialPhaseNow - let social phase run accelerated
      // The social-maneuvers.js will handle compressed AI ticks and summary
      console.info('[ff] Social phase detected - allowing accelerated execution');
      
      // Trigger accelerated AI scheduling if available
      if(g.SocialManeuvers?.accelerateAITicks){
        try{
          g.SocialManeuvers.accelerateAITicks();
        }catch(e){
          console.error('[ff] accelerateAITicks failed:', e);
        }
      }
      
      // Don't complete skip mode - let FFWD persist until phase change
      return;
    }

    // Count pending timeouts for diagnostics
    const pending = g.CardManager?.__pendingTimeoutData?.length || 0;
    
    // If no pending timeouts, synthesize a micro-drain delay to avoid instant jump
    if(pending === 0){
      // Use 1.5x the minimum card duration as micro-delay to ensure perceptible transition
      const baseMin = game.cfg?.fastForwardPlaybackMinCardMs || 120;
      const microDelay = Math.round(baseMin * 1.5);
      console.info(`[ff] No pending timeouts; synthesizing micro-drain delay: ${microDelay}ms`);
      await new Promise(resolve => setTimeout(resolve, microDelay));
    }

    // Execute acceleration/drain loop
    // When FFWD is active, drainLoop will use acceleration path
    if(g.SkipController){
      await g.SkipController.drainLoop();
    } else {
      console.warn('[ff] SkipController not available - drain loop skipped');
    }

    // Don't deactivate fast-forward here - it will auto-deactivate on phase change
    // Don't complete skip mode here - let it persist for the phase duration
    // The setPhase wrapper in tv-skip.js will deactivate FFWD on phase boundary

    // Diagnostic summary
    const cardMin = game.cfg?.fastForwardPlaybackMinCardMs || 120;
    const cardMax = game.cfg?.fastForwardPlaybackMaxCardMs || 480;
    const enforcedWindow = game.cfg?.fastForwardMinPhaseWindowMs || 1500;
    console.info(`[ff] Phase acceleration summary:`, {
      phase,
      initialRemaining: `${startRemaining}ms`,
      pendingTimeouts: pending,
      enforcedWindow: `${enforcedWindow}ms`,
      cardClampRange: `${cardMin}-${cardMax}ms`
    });

    if(game.phase==='livevote' && typeof g.beginDiaryRoomSequence==='function'){
      try{ g.beginDiaryRoomSequence(); }catch{}
    }
  }
  
  // Mark as enhanced version
  fastForwardPhase.__ffEnhanced = true;
  g.fastForwardPhase = fastForwardPhase;

  // ------------ Opening Sequence (unchanged core) ------------
  function clearIntroDeck(){ const deck=document.getElementById('introDeck'); if(deck) deck.remove(); }
  function buildProfileCard(p){
    const avatar = getAvatar(p);
    const bio = p.bio || {};
    const age = bio.age || '—';
    const gender = bio.gender || '—';
    const location = bio.location || '—';
    const occupation = bio.occupation || '—';
    const motto = bio.motto || '—';
    
    const card=document.createElement('div');
    card.className='revealCard introCard';
    card.style.maxWidth='380px';
    card.innerHTML = `
      <h3>Meet the Cast</h3>
      <div style="display:flex;gap:16px;align-items:flex-start">
        <img class="intro-avatar" style="width:120px;height:120px;border-radius:16px;border:3px solid #3d5a72;object-fit:cover"
          src="${avatar}" alt="${UI.escapeHtml?.(p.name||'guest')}"
          onerror="this.onerror=null;this.src='${FALLBACK}'">
        <div style="text-align:left;flex:1">
          <div class="big" style="font-size:1.1rem;font-weight:700;margin-bottom:8px">${UI.escapeHtml?.(p.name||'')}</div>
          <div style="display:flex;flex-direction:column;gap:4px;font-size:.72rem;line-height:1.4">
            <div class="intro-demo">${UI.escapeHtml?.(age)}, ${UI.escapeHtml?.(gender)}</div>
            <div class="intro-demo">${UI.escapeHtml?.(location)}</div>
            <div class="intro-demo" style="font-weight:600;color:#9fc5e8">${UI.escapeHtml?.(occupation)}</div>
            <div class="intro-motto" style="font-style:italic;color:#b9d4e8;margin-top:2px">"${UI.escapeHtml?.(motto)}"</div>
          </div>
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
    
    // Check if skipIntros is enabled - if so, skip all intro sequences
    if (game.cfg?.skipIntros) {
      console.info('[opening] skipIntros enabled, skipping intro sequences');
      // Skip directly to finish
      setTimeout(() => {
        if (game.phase === 'opening') {
          g.finishOpening();
        }
      }, 500);
      return;
    }
    
    // Check if reality-TV style intro is enabled and available
    const useRealityIntro = game.cfg?.useRealityIntro !== false && 
                            typeof g.IntroShow !== 'undefined' && 
                            g.IntroShow.hasGsap();
    
    if (useRealityIntro) {
      console.info('[opening] Using reality-TV style intro sequence');
      try {
        const players = [...(game.players || [])];
        g.IntroShow.play(players, () => {
          console.info('[opening] Reality-TV intro completed');
          if (game.phase === 'opening') {
            g.finishOpening();
          }
        });
        return;
      } catch (e) {
        console.warn('[opening] Reality-TV intro failed, falling back to classic:', e);
      }
    }
    
    // Classic dual-card intro sequence (fallback)
    console.info('[opening] Using classic dual-card intro sequence');
    try{
      const players=[...(game.players||[])];
      const pairs=[]; for(let i=0;i<players.length;i+=2){ pairs.push([players[i], players[i+1]]); }
      const perPair=5600, gap=150;
      game.__introHandles = [];
      game.__introPairsTotal = pairs.length;
      game.__introPairsShown = 0;
      game.__introEarlyFinished = false;
      pairs.forEach((pair,idx)=>{
        const id=setTimeout(()=>{
          try{ 
            const hid=showDualProfileCards(pair[0], pair[1], perPair-100); 
            if(hid!=null) game.__introHandles.push(hid); 
            
            // Increment shown count
            game.__introPairsShown = (game.__introPairsShown || 0) + 1;
            
            // Check if all pairs have been shown
            if(game.__introPairsShown >= game.__introPairsTotal && 
               game.phase === 'opening' && 
               !game.__introEarlyFinished) {
              console.info('[opening] All intro pairs shown, finishing early');
              game.__introEarlyFinished = true;
              // Ensure last card remains visible for at least 3 seconds
              const minLastCardVisibility = 3000; // 3 seconds minimum
              setTimeout(() => {
                if(game.phase === 'opening') {
                  g.finishOpening();
                }
              }, minLastCardVisibility);
            }
          }catch{}
        }, idx*(perPair+gap));
        game.__introHandles.push(id);
      });
    }catch{}
  }
  g.startOpeningSequence = startOpeningSequence;
  function skipIntro(userTriggered){
    const game=g.game||{};
    
    // Stop reality-TV intro if active
    if (typeof g.IntroShow !== 'undefined' && g.IntroShow.isActive()) {
      g.IntroShow.stop();
    }
    
    // Clear classic intro handles
    if(Array.isArray(game.__introHandles)){
      game.__introHandles.forEach(h=>clearTimeout(h));
      game.__introHandles=[];
    }
    clearIntroDeck();
    if(userTriggered) g.finishOpening();
  }
  g.skipIntro = skipIntro;
  function finishOpening(){
    const game=g.game; if(!game) return;
    // Prevent duplicate calls if already marked as early finished
    if(game.__introEarlyFinished && game.__introEarlyFinishCalled) return;
    if(game.__introEarlyFinished) game.__introEarlyFinishCalled = true;
    
    skipIntro(false);
    // Old card removed - now handled by showWeekIntroModal in ui.week-intro.js
    g.tv?.say?.('HOH Competition soon…');
    g.setPhase('intermission', game.cfg?.tIntermission || 4, ()=>{ g.tv?.say?.('HOH Competition'); g.startHOH?.(); });
  }
  g.finishOpening = finishOpening;

  // ------------ Phase UI Force Clear ------------
  function forceClearPhaseUI(newPhase){
    try{
      // CRITICAL FIX: Close all vote UI on phase transition
      // This prevents stuck voting overlays when advancing to next phase
      if(typeof g.closeAllVoteUI === 'function'){
        g.closeAllVoteUI();
        console.info('[phase] Vote UI cleaned up on phase transition');
      }
      
      // Remove any lingering modal overlays, cards, or phase-specific UI
      document.querySelectorAll('[data-bb-card], .results-modal-overlay, .pfWinnerCard, .pfModalHost').forEach(el => {
        try{ el.remove(); }catch{}
      });
      
      // Clear any reveal cards or announcement overlays
      const tvOverlay = document.getElementById('tvOverlay');
      if(tvOverlay){
        tvOverlay.querySelectorAll('.reveal-card, .announcement-overlay').forEach(el => {
          try{ el.remove(); }catch{}
        });
      }
      
      // Clean up any active minigames and instructions
      if(typeof g.CompetitionFlow?.cleanupOnPhaseChange === 'function'){
        g.CompetitionFlow.cleanupOnPhaseChange();
      }
      
      console.info(`[phase] forceClearCards phase=${newPhase}`);
    }catch(e){
      console.warn('[phase] forceClearCards error', e);
    }
  }

  // ------------ Phase Timer Helpers ------------
  function doesHumanNeedToVote(phase){
    const game = g.game;
    if(!game || !game.humanId) return false;
    
    // Livevote phase: timer starts immediately (no wait for vote)
    // The auto-vote countdown in the overlay handles the 30s timer
    
    if(phase === 'jury'){
      // Check if human is in jury
      const jury = game.jury || [];
      return jury.includes(game.humanId);
    }
    
    return false;
  }

  async function waitForHumanVoteInPhase(phase){
    const game = g.game;
    return new Promise(resolve => {
      if(phase === 'livevote'){
        // Wait for human vote event
        const handler = () => {
          window.removeEventListener('bb:livevote:humanVoted', handler);
          console.info(`[phase] human vote received phase=${phase}`);
          resolve();
        };
        window.addEventListener('bb:livevote:humanVoted', handler, { once: true });
        
        // Also check if already voted
        if(game.__human_vote != null){
          window.removeEventListener('bb:livevote:humanVoted', handler);
          console.info(`[phase] human vote already cast phase=${phase}`);
          resolve();
        }
      } else if(phase === 'jury'){
        // For jury, we rely on the jury module's own vote handling
        // Just resolve immediately as jury has its own pacing
        console.info(`[phase] jury phase, timer starts normally phase=${phase}`);
        resolve();
      } else {
        resolve();
      }
    });
  }

  // ------------ Phase Cleanup Functions ------------
  function flushPhaseCards(){
    // Cancel all pending card timeouts
    if(g.__cardTimeouts && Array.isArray(g.__cardTimeouts)){
      g.__cardTimeouts.forEach(tid => clearTimeout(tid));
      g.__cardTimeouts.length = 0;
    }
    // Increment card generation to abort safe cards
    if(typeof g.__cardGen === 'number'){
      g.__cardGen++;
    }
  }
  
  function cancelAllPhaseAudio(){
    // Fade out music if playing
    if(typeof g.fadeOutMusic === 'function'){
      try{
        g.fadeOutMusic(500); // 500ms fade
      }catch(e){
        console.warn('[phase] fadeOutMusic error:', e);
      }
    }
  }
  
  // Drainer for legacy cards, decision deck, tvOverlay
  function legacyCardsDrainer(){
    let didWork = false;
    
    // Remove any reveal cards
    const revealCards = document.querySelectorAll('.revealCard');
    if(revealCards.length > 0){
      revealCards.forEach(card => card.remove());
      didWork = true;
    }
    
    // Remove decision deck
    const decisionDeck = document.getElementById('decisionDeck');
    if(decisionDeck){
      decisionDeck.remove();
      didWork = true;
    }
    
    // Clear tvOverlay content
    const tvOverlay = document.getElementById('tvOverlay');
    if(tvOverlay && tvOverlay.children.length > 0){
      tvOverlay.innerHTML = '';
      tvOverlay.style.visibility = 'hidden';
      didWork = true;
    }
    
    // Clear any intro deck
    const introDeck = document.getElementById('introDeck');
    if(introDeck){
      introDeck.remove();
      didWork = true;
    }
    
    return didWork;
  }
  
  // Check terminal state after evictions and jump to appropriate phase
  function checkTerminalState(){
    const game = g.game;
    if(!game) return;
    
    const alive = g.alivePlayers?.() || [];
    const count = alive.length;
    
    console.info(`[phase] checkTerminalState remaining=${count}`);
    
    if(count === 1){
      // Auto-winner
      const winner = alive[0];
      console.info(`[phase] jump reason=remainingPlayers count=1 targetPhase=finale`);
      g.addLog?.(`${winner.name} is the last houseguest standing!`, 'accent');
      
      // Declare winner immediately
      winner.winner = true;
      if(typeof g.declareWinner === 'function'){
        g.declareWinner(winner.id);
      } else {
        setPhase('finale', 0);
      }
    } else if(count === 2){
      // Direct to jury vote
      console.info(`[phase] jump reason=remainingPlayers count=2 targetPhase=jury`);
      g.addLog?.('Final Two! Time for the jury to vote.', 'accent');
      setPhase('jury', game.cfg?.tJury || 42, ()=>{
        if(typeof g.startJuryVoting === 'function'){
          g.startJuryVoting();
        }
      });
    } else if(count === 3){
      // Final HOH sequence
      console.info(`[phase] jump reason=remainingPlayers count=3 targetPhase=final3_comp1`);
      g.addLog?.('Final Three! Beginning Final HOH competition.', 'accent');
      setPhase('final3_comp1', game.cfg?.tFinal3Comp1 || 35);
    } else if(count === 4){
      // Final 4 HOH
      console.info(`[phase] jump reason=remainingPlayers count=4 targetPhase=hoh`);
      g.addLog?.('Final Four! Standard HOH competition.', 'accent');
      setPhase('hoh', game.cfg?.tHOH || 35);
    } else if(count >= 5){
      // Standard cycle
      console.info(`[phase] jump reason=remainingPlayers count=${count} targetPhase=intermission`);
      setPhase('intermission', 3, ()=>{
        if(typeof g.startHOH === 'function'){
          g.startHOH();
        }
      });
    }
  }
  
  g.checkTerminalState = checkTerminalState;
  
  // ------------ Phase Router ------------
  let tickHandle=null;
  
  // Phase token cancellation system
  if(!g.currentPhaseToken) g.currentPhaseToken = 0;
  
  function setPhase(phase, seconds, onTimeout){
    const game=g.game; if(!game) return;
    sanitizeJuryConsistency(true);
    
    // Notify CardManager of phase change FIRST (before any other cleanup)
    if(g.CardManager && typeof g.CardManager.onPhaseChange === 'function'){
      try {
        g.CardManager.onPhaseChange(phase);
        console.info('[phase] CardManager.onPhaseChange() called for phase:', phase);
      } catch(e){
        console.error('[phase] CardManager.onPhaseChange() error:', e);
      }
    }
    
    // Increment phase token to cancel all previous phase operations
    const oldToken = g.currentPhaseToken;
    g.currentPhaseToken = (g.currentPhaseToken || 0) + 1;
    console.info(`[phase] cancel token=${oldToken} new=${g.currentPhaseToken}`);
    
    // Reset veto ceremony state when leaving veto_ceremony phase
    if(game.phase === 'veto_ceremony' && phase !== 'veto_ceremony'){
      console.info('[phase] Leaving veto_ceremony, resetting ceremony state flags');
      game.__vetoCeremonyStarted = false;
      game.__vetoCeremonyResolved = false;
      game.__vetoDecisionInProgress = false;
      game.__useTVCeremonyUI = false;
      if(game.__vetoAutoTimer){ 
        try{ clearTimeout(game.__vetoAutoTimer); }catch(e){} 
        game.__vetoAutoTimer = null; 
      }
    }

    // Force-clear all previous phase UI elements
    forceClearPhaseUI(phase);
    
    // Clean up all ephemeral UI (ceremony cards, messages, toasts)
    if(typeof g.UICleanup?.cleanupAll === 'function'){
      try {
        g.UICleanup.cleanupAll();
        console.info('[phase] UICleanup.cleanupAll() executed');
      } catch(e) {
        console.error('[phase] UICleanup.cleanupAll() error:', e);
      }
    }

    // Cancel any pending cards from previous phase
    if(typeof g.CardQueue?.cancelAll === 'function'){
      g.CardQueue.cancelAll();
    }
    // Attach queue to new phase
    if(typeof g.CardQueue?.attachToPhase === 'function'){
      g.CardQueue.attachToPhase(phase);
    }
    
    // Cancel all phase audio
    cancelAllPhaseAudio();
    
    // Flush phase cards
    flushPhaseCards();

    // Show/hide LIVE badge for voting phases
    if(typeof g.TV?.setLiveBadge === 'function'){
      const isVotePhase = (phase === 'livevote' || phase === 'tiebreak');
      g.TV.setLiveBadge(isVotePhase);
    }

    game.phase=phase;
    ensureCfg();
    g.phaseMusic?.(phase);

    // Dispatch phase change event for modules like TVInlineStatus
    try {
      const phaseChangeEvent = new CustomEvent('bb:phase:changed', {
        detail: { phase: phase, previousPhase: oldToken }
      });
      window.dispatchEvent(phaseChangeEvent);
    } catch(e) {
      console.warn('[phase] Failed to dispatch bb:phase:changed event:', e);
    }

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
      if(phase === 'nominations'){ 
        g.twists?.prepareNominations?.(); 
        
        // Reset stale nomination commit flags for fresh human HOH nominations
        // Only clear if nominations are unlocked and HOH is human
        const hoh = g.getP ? g.getP(game.hohId) : null;
        if(hoh && hoh.human && !game.nomsLocked && (!Array.isArray(game.nominees) || game.nominees.length === 0)){
          console.log('[phase] Resetting stale nomination flags for fresh human HOH phase');
          game.__nomsCommitInProgress = false;
          game.__nomsCommitted = false;
        }
      }
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

    // HOURGLASS TIMER: Get hourglass elements (or fallback to old bar for compatibility)
    const bar=document.getElementById('tvProgressFill');
    const hourglassSandTop=document.getElementById('hourglassSandTop');
    const hourglassSandBottom=document.getElementById('hourglassSandBottom');
    const hourglassSandFlow=document.getElementById('hourglassSandFlow');
    
    function setClock(str){
      const cd=document.getElementById('countdown'); if(cd) cd.textContent=str;
      const tt=document.getElementById('tvTimer'); if(tt) tt.textContent=str;
    }

    if(!seconds){
      setClock('00:00'); 
      // Reset both old bar and new hourglass
      if(bar) bar.style.width='0%';
      if(hourglassSandTop){ hourglassSandTop.setAttribute('height', '0'); hourglassSandTop.setAttribute('y', '12'); }
      if(hourglassSandBottom){ hourglassSandBottom.setAttribute('height', '0'); }
      if(hourglassSandFlow){ hourglassSandFlow.style.opacity='0'; }
      // Reset skip progress bar
      if(typeof window.updateSkipProgress === 'function'){
        window.updateSkipProgress(0, 1);
      }
      try{
        if(typeof onTimeout==='function'){ onTimeout(); }
        else { defaultAdvance(phase); }
      }catch(e){ console.error(e); }
      try{ g.twists?.afterPhase?.(phase); }catch{}
      return;
    }

    // Check if we need to wait for human vote before starting timer
    const needsHumanVote = doesHumanNeedToVote(phase);
    
    if(needsHumanVote){
      console.info(`[phase] timer start phase=${phase} afterHumanVote=true`);
      
      // Show timer as paused/waiting
      setClock('--:--');
      if(bar) bar.style.width='0%';
      if(hourglassSandTop){ hourglassSandTop.setAttribute('height', '0'); hourglassSandTop.setAttribute('y', '12'); }
      if(hourglassSandBottom){ hourglassSandBottom.setAttribute('height', '0'); }
      if(hourglassSandFlow){ hourglassSandFlow.style.opacity='0'; }
      // Reset skip progress bar
      if(typeof window.updateSkipProgress === 'function'){
        window.updateSkipProgress(0, 1);
      }
      
      // Wait for human vote, then start timer
      waitForHumanVoteInPhase(phase).then(() => {
        console.info(`[phase] starting timer after human vote phase=${phase}`);
        startPhaseTimer(phase, seconds, onTimeout, bar, setClock, hourglassSandTop, hourglassSandBottom, hourglassSandFlow);
      });
    } else {
      console.info(`[phase] timer start phase=${phase} afterHumanVote=false`);
      startPhaseTimer(phase, seconds, onTimeout, bar, setClock, hourglassSandTop, hourglassSandBottom, hourglassSandFlow);
    }
  }
  
  function startPhaseTimer(phase, seconds, onTimeout, bar, setClock, hourglassSandTop, hourglassSandBottom, hourglassSandFlow){
    const game = g.game;
    if(!game) return;
    
    game.endAt=Date.now()+seconds*1000; const total=seconds*1000;
    // Expose a canonical phase end pointer used by other modules (e.g., veto auto-submit)
    game.phaseEndsAt = game.endAt;
    // Track pause state
    game.timerPaused = false;
    game.pausedTimeRemaining = null;

    function tick(){
      // Skip ticking if paused
      if(game.timerPaused){
        return;
      }
      
      const rem=game.endAt-Date.now();
      if(rem<=0){
        clearInterval(tickHandle); setClock('00:00'); 
        // Reset both old bar and new hourglass
        if(bar) bar.style.width='0%';
        if(hourglassSandTop){ hourglassSandTop.setAttribute('height', '0'); hourglassSandTop.setAttribute('y', '12'); }
        if(hourglassSandBottom){ hourglassSandBottom.setAttribute('height', '0'); }
        if(hourglassSandFlow){ hourglassSandFlow.style.opacity='0'; }
        // Reset skip progress bar
        if(typeof window.updateSkipProgress === 'function'){
          window.updateSkipProgress(total, total);
        }
        try{
          if(typeof onTimeout==='function'){ onTimeout(); }
          else { defaultAdvance(phase); }
        }catch(e){ console.error(e); }
        try{ g.twists?.afterPhase?.(phase); }catch{}
        return;
      }
      const s=Math.ceil(rem/1000), m=Math.floor(s/60), r=s%60;
      setClock(`${String(m).padStart(2,'0')}:${String(r).padStart(2,'0')}`);
      
      // Update both old bar (for compatibility) and new hourglass
      const percentRemaining = (rem/total)*100;
      if(bar) bar.style.width=percentRemaining+'%';
      
      // Update skip progress bar (depletes right-to-left)
      if(typeof window.updateSkipProgress === 'function'){
        window.updateSkipProgress(total - rem, total);
      }
      
      // HOURGLASS ANIMATION: Top empties, bottom fills
      // Top sand starts full (38px max height) and empties
      const maxTopHeight = 38;
      const topHeight = (percentRemaining/100) * maxTopHeight;
      const topY = 12 + (maxTopHeight - topHeight); // Move down as it empties
      if(hourglassSandTop){
        hourglassSandTop.setAttribute('height', topHeight.toString());
        hourglassSandTop.setAttribute('y', topY.toString());
      }
      
      // Bottom sand starts empty and fills (40px max height from y=88)
      const maxBottomHeight = 40;
      const bottomHeight = ((100-percentRemaining)/100) * maxBottomHeight;
      const bottomY = 88 + (maxBottomHeight - bottomHeight); // Fills upward
      if(hourglassSandBottom){
        hourglassSandBottom.setAttribute('height', bottomHeight.toString());
        hourglassSandBottom.setAttribute('y', bottomY.toString());
      }
      
      // Show flow animation when timer is active
      if(hourglassSandFlow){
        hourglassSandFlow.style.opacity = percentRemaining > 0 ? '1' : '0';
      }
    }
    tickHandle=setInterval(tick,200); tick();
  }
  
  // Pause the phase timer
  function pausePhaseTimer(){
    const game = g.game;
    if(!game || game.timerPaused) return;
    game.timerPaused = true;
    game.pausedTimeRemaining = game.endAt - Date.now();
    console.info('[phase] timer paused, remaining:', game.pausedTimeRemaining);
  }
  
  // Resume the phase timer
  function resumePhaseTimer(){
    const game = g.game;
    if(!game || !game.timerPaused) return;
    game.timerPaused = false;
    if(game.pausedTimeRemaining != null){
      game.endAt = Date.now() + game.pausedTimeRemaining;
      game.phaseEndsAt = game.endAt;
      console.info('[phase] timer resumed, new endAt:', game.endAt);
    }
  }
  
  g.setPhase = setPhase;
  g.pausePhaseTimer = pausePhaseTimer;
  g.resumePhaseTimer = resumePhaseTimer;

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
        // Call modern in-TV ceremony - no fallback to legacy diary room
        if(typeof g.startVetoCeremony === 'function') return g.startVetoCeremony();
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

    if(game.phase==='lobby'){
      // Use inline status instead of below-TV message
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('Open Settings and Restart Season to begin.', 'muted');
      } else {
        panel.innerHTML='<div class="tiny muted">Open Settings and Restart Season to begin.</div>';
      }
      updateHud();
      return;
    }
    if(game.phase==='opening'){
      // Use inline status instead of below-TV message
      if (global.TVInlineStatus?.set) {
        global.TVInlineStatus.set('Season Premiere…', 'muted');
      } else {
        panel.innerHTML='<div class="tiny muted">Season Premiere…</div>';
      }
      return;
    }
    if(game.phase==='return_twist'){ g.renderReturnTwistPanel?.(); return; }
    if(game.phase==='nominations'){ g.renderNominationsPanel?.(); return; }
    if(game.phase==='veto_ceremony'){ g.renderVetoCeremonyPanel?.(); return; }
    if(game.phase==='final4_eviction'){ g.renderFinal4EvictionPanel?.(); return; }
    if(game.phase==='final3_decision'){ g.renderFinal3DecisionPanel?.(); return; }
    if(game.phase==='jury'){ g.renderJuryVotePanel?.(); return; }
    if(game.phase==='livevote'){ g.renderLiveVotePanel?.(); return; }

    const compPhases=['hoh','veto_comp','veto','final3_comp1','final3_comp2'];
    if(compPhases.includes(game.phase)){
      // Check if idle panel should be shown (feature flag gated)
      if(typeof g.renderIdlePanel === 'function' && g.renderIdlePanel(panel)){
        return; // Idle panel was rendered, skip competition panel
      }
      g.renderCompPanel?.(panel);
      return;
    }

    if(game.phase?.startsWith?.('social')){ g.renderSocialPhase?.(panel); return; }

    // Use inline status instead of below-TV message
    if (global.TVInlineStatus?.set) {
      global.TVInlineStatus.set(`Game running… (${game.phase})`, 'muted');
    } else {
      panel.innerHTML=`<div class="tiny muted">Game running… (${game.phase})</div>`;
    }
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
    // DEFERRED STARTUP GUARD: Check if game is ready to start
    // If not ready, defer HUD initialization until after Play button is pressed
    if (g.DeferredGuards && !g.DeferredGuards.isGameReadyToStart()) {
      console.info('[ui.hud-and-router] Game not ready, deferring HUD initialization');
      g.DeferredGuards.deferTask(() => {
        console.info('[ui.hud-and-router] Executing deferred HUD initialization');
        initHUDInternal();
      }, 'HUD.init');
      return;
    }

    // Game is ready or guard not available, initialize normally
    initHUDInternal();
  }

  function initHUDInternal(){
    UI.initSettingsUI?.();
    wireCompSubmitDelegationOnce();
    UI.ensureLogTabs?.();
    UI.wireLogTabsOnce?.();
    UI.selectLogTab?.('all');
    ensureAlivePlayersPatched();
    sanitizeJuryConsistency(true);
    updateHud();
    
    // Register skip drainers
    if(g.SkipController){
      g.SkipController.registerDrainer('legacyCards', legacyCardsDrainer);
    }
    if(g.SkipUtils){
      g.SkipController?.registerDrainer('timeouts', g.SkipUtils.timeoutDrainer);
    }
    
    // Listen for relations-updated events to refresh bio panel if open
    window.addEventListener('relations-updated', (e) => {
      const playerId = e.detail?.playerId;
      if(playerId && currentBioPlayerId === playerId){
        console.info('[bio] Refreshing bio panel for player', playerId, 'after relations update');
        const player = g.game?.players?.find(p => p.id === playerId);
        if(player){
          const panel = document.getElementById('bioPanel');
          if(panel && panel.style.display === 'block'){
            panel.innerHTML = renderBioContent(player);
            // Re-attach close button listener
            const closeBtn = panel.querySelector('.bio-close-btn');
            if(closeBtn){
              closeBtn.addEventListener('click', (e)=>{
                e.stopPropagation();
                hideProfileTip();
              });
            }
          }
        }
      }
    });
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

  // Self-repair guard: Ensure enhanced fastForwardPhase is active
  // Protects against legacy file (ui.hud-and-router.js9) overriding the enhanced version
  // Schedule check after all modules load
  setTimeout(function(){
    if(typeof g.fastForwardPhase === 'function' && !g.fastForwardPhase.__ffEnhanced){
      console.warn('[ui.hud-and-router] Legacy fastForwardPhase detected without __ffEnhanced marker');
      console.warn('[ui.hud-and-router] This may cause reduced functionality. Check if ui.hud-and-router.js9 is being loaded.');
    } else if(typeof g.fastForwardPhase === 'function' && g.fastForwardPhase.__ffEnhanced){
      console.info('[ui.hud-and-router] ✓ Enhanced fastForwardPhase active');
    }
  }, 100);

})(window);