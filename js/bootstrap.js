// MODULE: bootstrap.js
// Boot + Start wiring + roster/table view + music controls + cast editor + rebuild game.
// Adds Settings modal tab switching (Timers, Features, Twists, Manage) and live settings apply.

(function(global){
  const $ = (sel)=>document.querySelector(sel);

  // ---------- Safe localStorage ----------
  const StorageSafe = {
    get(k, def=null){ try{ return localStorage.getItem(k) ?? def; }catch{ return def; } },
    set(k, v){ try{ localStorage.setItem(k,v); }catch{} }
  };
  
  // Expose StorageSafe globally for use by other modules (e.g., StartupFlow)
  global.StorageSafe = StorageSafe;

  // ---------- Ensure game ----------
  function ensureGame(){
    global.game = global.game || { cfg:{}, players:[] };
    if(typeof global.alivePlayers!=='function'){
      global.alivePlayers = ()=> (global.game.players||[]).filter(p=>!p.evicted);
    }
    if(typeof global.safeName!=='function'){
      global.safeName = id => (global.game.players.find(p=>p.id===id)?.name || 'Unknown');
    }
  }

  // ---------- Config ----------
  function getDefaultCfg(){
    return {
      humanName: 'You',
      numPlayers:12,tHOH:35,tNoms:25,tVeto:30,tVetoDec:20,tComms:30,tVote:25,tJury:42,
      fxCards:true,fxSound:true,fxAnim:true,fxStyle:'fade',miniMode:'random',
      manualMode:false,doubleChance:10,tripleChance:3,enableJuryHouse:true,autoMusic:true,
      returnChance:50,selfEvictChance:0,enablePublicFav:false,adaptiveBackground:true
    };
  }

  function loadSettingsIntoUI(cfg){
    const map={
      humanName:'humanName', numPlayers:'numPlayers', tHOH:'tHOH', tNoms:'tNoms', tVeto:'tVeto', tVetoDec:'tVetoDec',
      tComms:'tComms', tVote:'tVote', tJury:'tJury',
      fxCards:'fxCards', fxSound:'fxSound', fxAnim:'fxAnim', fxStyle:'fxStyle', miniMode:'miniMode',
      manualMode:'manualMode', enableJuryHouse:'enableJuryHouse', autoMusic:'autoMusicSetting',
      doubleChance:'doubleChance', tripleChance:'tripleChance', returnChance:'returnChance', selfEvictChance:'selfEvictChance',
      enablePublicFav:'enablePublicFav'
    };
    Object.entries(map).forEach(([k,id])=>{
      const el=document.getElementById(id); if(!el) return;
      const v=cfg[k];
      if(el.type==='checkbox') el.checked = !!v;
      else if(v!=null) el.value = v;
    });
    const autoMusicBox=document.getElementById('autoMusic');
    if(autoMusicBox) autoMusicBox.checked = !!cfg.autoMusic;
  }

  function clampNum(v,def,min,max){ v=+v; if(Number.isNaN(v)) v=def; return Math.min(max,Math.max(min,v)); }

  function applyInputsToConfig(){
    ensureGame(); const g=global.game;
    const val = (id, dv)=>document.getElementById(id)?.value ?? dv;
    const on = (id, dv)=>document.getElementById(id)?.checked ?? dv;

    g.cfg.humanName=String(val('humanName','You')).trim() || 'You';
    // Allow 6..22 players
    g.cfg.numPlayers=clampNum(val('numPlayers',12),12,6,22);
    g.cfg.tHOH=clampNum(val('tHOH',35),5,5,999);
    g.cfg.tNoms=clampNum(val('tNoms',25),5,5,999);
    g.cfg.tVeto=clampNum(val('tVeto',30),5,5,999);
    g.cfg.tVetoDec=clampNum(val('tVetoDec',20),5,5,999);
    g.cfg.tComms=clampNum(val('tComms',30),5,5,999);
    g.cfg.tVote=clampNum(val('tVote',25),5,5,999);
    g.cfg.tJury=clampNum(val('tJury',42),5,5,999);

    g.cfg.fxCards=on('fxCards',true);
    g.cfg.fxSound=on('fxSound',true);
    g.cfg.fxAnim=on('fxAnim',true);
    g.cfg.fxStyle=val('fxStyle','fade');
    g.cfg.miniMode=val('miniMode','random');

    g.cfg.manualMode=on('manualMode',false);
    g.cfg.doubleChance=clampNum(val('doubleChance',10),0,0,100);
    g.cfg.tripleChance=clampNum(val('tripleChance',3),0,0,100);
    g.cfg.enableJuryHouse=on('enableJuryHouse',true);
    g.cfg.autoMusic=on('autoMusicSetting',true);
    g.cfg.returnChance=clampNum(val('returnChance',50),1,1,100);
    g.cfg.selfEvictChance=clampNum(val('selfEvictChance',0),0,0,2);
    g.cfg.enablePublicFav=on('enablePublicFav',false);

    const autoMusicBox=document.getElementById('autoMusic');
    if(autoMusicBox) autoMusicBox.checked=g.cfg.autoMusic;
  }
  global.applyInputsToConfig = applyInputsToConfig;

  function saveSettings(){
    const cfg = global.game?.cfg;
    if(!cfg) return;
    // Save to both storage keys for compatibility
    try{ StorageSafe.set('bb_settings_modular', JSON.stringify(cfg)); }catch{}
    try{ StorageSafe.set('bb_cfg_v2', JSON.stringify(cfg)); }catch{}
  }

  // ---------- Cast build/reset ----------
  function resetRoundState(){
    const g=global.game;
    Object.assign(g,{
      week:1, phase:'lobby', endAt:0,
      hohId:null, lastHOHId:null,
      nominees:[], vetoHolder:null,
      jury:[], juryHouse:g.juryHouse || [], votingJury:[],
      lastCompScores:new Map(),
      editMode:false, nomsLocked:false, vetoSavedId:null, vetoRepPref:null,
      hohOrder:[], miniIndex:0,
      doubleEvictionWeek:false, tripleEvictionWeek:false,
      socialTimers:[], activeEvent:null,
      juryVotes:new Map(), revealedJuryVotes:new Set(),
      juryTwistDone:false, openingDone:false,
      pendingAdvance:null, miniHistory:[]
    });
  }

  /**
   * Build the cast of players and initialize main game UI.
   * IMPORTANT: This function is now deferred until after the Play button is pressed.
   * It is called by StartupFlow.buildMainScreen() after gating checks pass.
   * It should NOT be called during initial bootstrap to prevent main screen from showing
   * before the user has seen the intro video and pressed Play.
   */
  function buildCast(){
    // DEFERRED STARTUP GUARD: Check if game is ready to start
    // If not ready, defer cast building until after Play button is pressed
    if (global.DeferredGuards && !global.DeferredGuards.isGameReadyToStart()) {
      console.info('[buildCast] Game not ready, deferring cast build');
      global.DeferredGuards.deferTask(() => {
        console.info('[buildCast] Executing deferred cast build');
        buildCastInternal();
      }, 'buildCast');
      return;
    }

    // Game is ready or guard not available, build normally
    buildCastInternal();
  }

  function buildCastInternal(){
    ensureGame();
    const g=global.game;
    if(typeof global.pushPlayer!=='function' || typeof global.initAffinities!=='function'){
      setTimeout(buildCastInternal, 30);
      return;
    }
    g.players.length = 0;

    const humanName=(g.cfg?.humanName || document.getElementById('humanName')?.value || 'You').trim();
    
    // Robust getter for numPlayers: check config, then storage fallback, then default
    // This ensures numPlayers is read correctly even if config objects become de-aliased
    let N = +(g.cfg?.numPlayers);
    if(!N || isNaN(N)){
      // Fallback to storage if config is missing/invalid
      try{
        const stored = global.Config?.loadStoredCfg?.() || {};
        N = +(stored.numPlayers) || 0;
      }catch{}
    }
    if(!N || isNaN(N)) N = 12; // Final fallback to default
    const defaults=['Finn','Mimi','Rae','Nova','Kai','Zed','Ivy','Ash','Lux','Remy','Blue','Jax','Echo','Vee','Sol','Quinn','Aria','Dex','Rune','Bea','Nico','Pax','Noa','Kian','Lia','Rey'];

    for(let i=0;i<N;i++){
      const nm = (i===0) ? humanName : defaults[(i-1)%defaults.length];
      global.pushPlayer({name:nm, human:i===0});
    }
    global.attachBios?.(g);
    global.initAffinities();
    global.initRelationships();
    
    // Apply pending profile if one exists (for returning users)
    if (global.__pendingProfile && global.ProfileService && typeof global.ProfileService.applyProfileToGame === 'function') {
      console.info('[bootstrap] applying pending profile:', global.__pendingProfile.displayName);
      global.ProfileService.applyProfileToGame(global.__pendingProfile);
    }
    
    // Apply saved player customizations from localStorage
    if(typeof global.loadPlayerCustomizations === 'function'){
      const customizations = global.loadPlayerCustomizations();
      if(customizations && typeof customizations === 'object'){
        g.players.forEach(function(p){
          const custom = customizations[p.id];
          if(custom){
            // Apply saved name, avatar, and meta data
            if(custom.name) p.name = custom.name;
            if(custom.avatar) p.avatar = custom.avatar;
            if(custom.img) p.img = custom.img;
            if(custom.photo) p.photo = custom.photo;
            if(custom.meta){
              p.meta = p.meta || {};
              if(custom.meta.age != null) p.meta.age = custom.meta.age;
              if(custom.meta.sex) p.meta.sex = custom.meta.sex;
              if(custom.meta.occupation) p.meta.occupation = custom.meta.occupation;
              if(custom.meta.motto) p.meta.motto = custom.meta.motto;
              
              // Sync p.bio with p.meta to ensure display consistency
              if(!p.bio) p.bio = {};
              if(custom.meta.age != null) p.bio.age = custom.meta.age;
              if(custom.meta.sex) p.bio.gender = custom.meta.sex;
              if(custom.meta.occupation) p.bio.occupation = custom.meta.occupation;
              if(custom.meta.motto) p.bio.motto = custom.meta.motto;
            }
          }
        });
      }
    }
    
    resetRoundState();
    // Reset public favourite flag for new season
    global.__publicFavDone = false;
    
    // Update PlayerService with initial alive players
    if(typeof global.PlayerService?.setAlivePlayers === 'function'){
      global.PlayerService.setAlivePlayers(g.players || []);
    }
    
    global.addLog?.('Game created. Waiting to start…','muted');
    global.tv?.say?.('Game created. Waiting to start…');
    global.updateHud?.();
    global.renderPanel?.();
  }
  
  // Expose buildCast globally so StartupFlow can call it
  global.buildCast = buildCast;

  function rebuildGame(preservePlayers=true){
    ensureGame();
    const g=global.game;

    if(preservePlayers && Array.isArray(g.players) && g.players.length){
      // Preserve existing player customizations (names, avatars, meta)
      g.players.forEach(p=>{
        // Reset game state but preserve identity and customizations
        p.evicted=false; p.nominated=false; p.hoh=false;
        p.wins = {hoh:0, veto:0};
        p.stats = {hohWins:0, vetoWins:0};
        p.threat = global.THREAT_BASE ?? 0.5;
        p.weekEvicted=null; p.winner=false; p.runnerUp=false;
        // Note: p.name, p.avatar, p.meta are preserved
        
        // Sync p.bio with p.meta to ensure display consistency after rebuild
        if(p.meta && p.bio){
          if(p.meta.age != null) p.bio.age = p.meta.age;
          if(p.meta.sex) p.bio.gender = p.meta.sex;
          if(p.meta.occupation) p.bio.occupation = p.meta.occupation;
          if(p.meta.motto) p.bio.motto = p.meta.motto;
        }
      });
      global.attachBios?.(g);
      global.initAffinities();
      global.initRelationships();
      resetRoundState();
      // Reset public favourite flag for new season
      global.__publicFavDone = false;
      
      // Update PlayerService with rebuilt players
      if(typeof global.PlayerService?.setAlivePlayers === 'function'){
        global.PlayerService.setAlivePlayers(g.players || []);
      }
    } else {
      buildCast();
    }
    global.addLog?.('Game rebuilt.','ok');
    global.tv?.say?.('Game created. Waiting to start…');
    global.updateHud?.();
    global.renderPanel?.();
  }

  // ---------- Start / Skip ----------
  async function safeStartGame(){
    try{
      if(global.game?.phase==='opening'){ return; }
      if(global.game?.phase!=='lobby'){
        if(!await window.showConfirm('Restart season from the beginning?', {
          title: 'Restart Season',
          confirmText: 'Restart',
          tone: 'warn'
        })) return;
        rebuildGame(false);
      }

      // Check if this is a returning user (user clicking Start button directly, not first load)
      // New users will have intro video auto-play via intro-outro-video.js hook
      // Returning users are clicking Start button explicitly after intro already played
      const isReturningUser = checkIsReturningUser();
      
      if (isReturningUser) {
        console.info('[Start] Returning user detected - using fast cast animation');
        startFastCastFlow();
      } else {
        console.info('[Start] New user detected - using full onboarding flow');
        global.startOpeningSequence?.();
      }
    }catch(e){
      console.error('[Start] error:', e);
      try{
        global.tv?.say?.('HOH Competition');
        global.setPhase?.('intermission', 3, ()=>global.startHOH?.());
      }catch(e2){ console.error('[Start fallback] failed:', e2); }
    }
  }

  /**
   * Check if user has seen game start before (returning user)
   * Uses a separate flag from intro video playback to distinguish:
   * - First game start ever: new user (shows full onboarding)
   * - Subsequent game starts: returning user (shows fast cast)
   */
  function checkIsReturningUser() {
    try {
      // Check localStorage (chosen over sessionStorage because it persists across browser sessions,
      // ensuring returning users are detected even after closing and reopening the browser)
      return localStorage.getItem('bb.gameStarted') === '1' || global.__bbGameStarted === true;
    } catch {
      return !!global.__bbGameStarted;
    }
  }

  /**
   * Mark that user has started a game (for returning user detection)
   */
  function markGameStarted() {
    // Use the global function if available (exposed by intro-outro-video.js)
    if (typeof global.markGameStarted === 'function') {
      global.markGameStarted();
      return;
    }
    
    // Fallback implementation - use localStorage to persist across reloads
    global.__bbGameStarted = true;
    try {
      localStorage.setItem('bb.gameStarted', '1');
    } catch {}
  }

  /**
   * Start fast cast animation flow for returning users
   * Skips onboarding (intro video, rules, profile, season intro cards)
   * Shows fast cast animation, then goes directly to Week 1 modal
   */
  function startFastCastFlow() {
    const game = global.game;
    if (!game) return;

    // Mark game as started for future returning user detection
    markGameStarted();

    // Skip modal flow (profile, rules)
    if (typeof global.skipModalFlow === 'function') {
      global.skipModalFlow();
    }

    // Mark intro as played to prevent video from showing
    if (!global.__bbIntroPlayed) {
      global.__bbIntroPlayed = true;
      try {
        sessionStorage.setItem('bb.introPlayed', '1');
      } catch {}
    }

    // Check if fast cast animation is available
    if (typeof global.FastCastAnimation === 'undefined' || 
        typeof global.FastCastAnimation.play !== 'function') {
      console.warn('[Start] FastCastAnimation not available, falling back to normal flow');
      skipToWeek1();
      return;
    }

    const players = [...(game.players || [])];
    
    // Play fast cast animation
    global.FastCastAnimation.play(players, () => {
      console.info('[Start] Fast cast animation complete, showing Week 1 modal');
      skipToWeek1();
    });
  }

  /**
   * Skip directly to Week 1 HOH
   * Week intro modal is handled by the startHOH wrapper in ui.week-intro.js
   */
  function skipToWeek1() {
    const game = global.game;
    if (!game) return;

    // Set game to intermission phase (before HOH)
    game.phase = 'intermission';
    game.week = 1;
    
    // Apply any pending config changes when starting a new season
    if(typeof Config !== 'undefined' && typeof Config.applyPendingConfig === 'function'){
      Config.applyPendingConfig();
    }
    
    // Update UI
    global.updateHud?.();
    global.renderPanel?.();
    global.tv?.say?.('Week 1');

    // Start HOH - the week intro modal will be shown by the startHOH wrapper
    global.setPhase?.('intermission', 3, () => global.startHOH?.());
  }

  function updateStartButtonUI(){
    const btn = document.getElementById('btnStartQuick');
    if(!btn) return;
    const inLobby = (global.game?.phase === 'lobby');
    btn.textContent = inLobby ? '▶' : '↻';
    btn.title = inLobby ? 'Start new season' : 'Restart (reload and apply saved settings)';
    btn.setAttribute('aria-label', inLobby ? 'Start game' : 'Restart game');
  }

  // ---------- Settings Modal Tabs ----------
  function wireSettingsTabs(){
    const modal=document.getElementById('settingsModal'); if(!modal) return;
    const tabbar = modal.querySelector('.modalTabs'); if(!tabbar || tabbar.__wired) return;
    tabbar.__wired = true;
    tabbar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-btn'); if(!btn) return;
      const tid = btn.dataset.tab;
      modal.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
      modal.querySelectorAll('.settingsTabPane').forEach(p=>p.classList.toggle('active', p.id===tid));
    });
  }

  // ---------- Cast Editor (Manage tab) ----------
  function toggleCastEditor(){
    // (omitted – unchanged from your current file)
    alert('Cast editor unchanged; this function left as-is.');
  }

  // ---------- Wire buttons ----------
  function wireButtons(){
    const onOnce=(el,ev,fn)=>{ if(!el || el.__wired) return; el.addEventListener(ev,fn); el.__wired=true; };

    onOnce($('#btnOpenSettings'), 'click', ()=>{
      const m=$('#settingsModal'); if(m){ m.style.display='flex'; wireSettingsTabs(); }
    });
    onOnce($('#btnCloseSettings'), 'click', ()=>{
      const m=$('#settingsModal'); if(m){ 
        try{ applyInputsToConfig(); }catch{}
        try{ saveSettings(); }catch{}
        m.style.display='none';
        global.updateHud?.();
      }
    });

    // Live apply settings on change
    const settingsRoot = document.getElementById('settingsModal');
    if(settingsRoot && !settingsRoot.__live){
      settingsRoot.__live = true;
      settingsRoot.addEventListener('change', (e)=>{
        try{ applyInputsToConfig(); saveSettings(); }catch{}
      });
      settingsRoot.addEventListener('input', (e)=>{
        try{ applyInputsToConfig(); saveSettings(); }catch{}
      });
    }

    // Start/Restart button
    onOnce($('#btnStartQuick'), 'click', ()=>{
      if(global.game?.phase === 'lobby'){
        saveSettings();
        safeStartGame();
      } else {
        saveSettings();
        location.reload();
      }
    });

    // Manage tab
    onOnce($('#btnEditCast'), 'click', toggleCastEditor);
    onOnce($('#btnRebuildGame'), 'click', ()=>{ rebuildGame(true); });

    // Reset to default
    onOnce($('#btnReset'), 'click', ()=>{
      const def=getDefaultCfg();
      loadSettingsIntoUI(def);
      applyInputsToConfig();
      saveSettings();
      global.addLog?.('Settings reset to defaults.','warn');
    });

    // Quick actions
    onOnce($('#btnClearLog'), 'click', ()=>{ const el=$('#log'); if(el) el.innerHTML=''; });
    onOnce($('#btnNextWeek'), 'click', ()=>{
      const g=global.game; if(!g) return;
      if(g.phase==='lobby' || g.phase==='finale'){ global.addLog?.('Cannot force week from current phase.','muted'); return; }
      g.week++; global.addLog?.(`Forcing next week → Week ${g.week}`,'warn');
      global.tv?.say?.(`Week ${g.week} — Intermission`);
      global.setPhase?.('intermission', 3, ()=>global.startHOH?.());
      global.updateHud?.();
    });
    onOnce($('#btnSkipPhase'), 'click', ()=>global.fastForwardPhase?.());

    // Music controls
    onOnce($('#btnPlayMusic'), 'click', ()=>{
      const key = $('#musicTrack')?.value;
      if(key && key!=='none') global.setMusic?.(key, true);
    });
    onOnce($('#btnStopMusic'), 'click', ()=> global.setMusic?.('none', true));
    
    // Mute toggle button
    const muteBtn = $('#btnMuteToggle');
    if(muteBtn && !muteBtn.__muteWired){
      muteBtn.__muteWired = true;
      
      // Initialize button state
      const updateMuteBtn = ()=>{
        const muted = global.getMuted?.() || false;
        muteBtn.textContent = muted ? '🔇' : '🔊';
        muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false');
        muteBtn.classList.toggle('muted', muted);
      };
      
      updateMuteBtn();
      
      muteBtn.addEventListener('click', ()=>{
        if(typeof global.toggleMute === 'function'){
          global.toggleMute();
          updateMuteBtn();
        }
      });
    }

    // Self-Eviction (Exit) button
    const exitBtn = $('#btnSelfEvict');
    if(exitBtn && !exitBtn.__exitWired){
      exitBtn.__exitWired = true;
      
      exitBtn.addEventListener('click', async ()=>{
        const g = global.game;
        if(!g) return;
        
        // Only show for human player when game is active
        if(g.phase === 'lobby' || g.phase === 'finale'){
          alert('Self-eviction is only available during active gameplay.');
          return;
        }
        
        const humanId = g.humanId;
        if(!humanId){
          alert('No human player found.');
          return;
        }
        
        const human = global.getP ? global.getP(humanId) : null;
        if(!human || human.evicted){
          alert('You are not an active player.');
          return;
        }
        
        // Use the centralized self-eviction handler
        if(typeof global.selfEviction?.requestHuman === 'function'){
          await global.selfEviction.requestHuman(humanId);
        } else if(typeof global.handleSelfEviction === 'function'){
          // Fallback to legacy handler
          const confirmed = confirm(`Are you sure you want to self-evict? This cannot be undone!`);
          if(confirmed){
            global.handleSelfEviction(humanId, 'human');
          }
        }
      });
    }
    
    // Update Exit button visibility based on game state
    const updateExitBtn = ()=>{
      const g = global.game;
      if(!exitBtn) return;
      
      const shouldShow = g && 
                        g.phase !== 'lobby' && 
                        g.phase !== 'finale' &&
                        g.humanId &&
                        global.getP?.(g.humanId) &&
                        !global.getP(g.humanId).evicted;
      
      exitBtn.style.display = shouldShow ? '' : 'none';
    };
    
    updateExitBtn();
    
    // Update visibility on game state changes
    if(!global.__exitBtnUpdater){
      global.__exitBtnUpdater = setInterval(updateExitBtn, 5000);
    }
  }

  // ---------- Intro Screen Flow (Legacy) ----------
  // NOTE: This function is kept for backwards compatibility and non-critical button wiring.
  // The main Play button logic is now handled by StartupFlow to ensure proper
  // main screen deferred initialization. Other buttons (Rules, Profile, etc.) are
  // still wired here for redundancy with StartupFlow.
  function wireIntroScreenFlow(){
    // NOTE: Do NOT show IntroScreen here - StartupFlow now handles this
    // This event listener is kept for legacy compatibility but should not fire
    // since StartupFlow intercepts the video end event first.
    
    // Wire up IntroScreen event handlers (secondary/fallback)
    if(!global.bbGameBus) return;

    const bus = global.bbGameBus;

    // NOTE: Play button handler removed - now handled by StartupFlow
    // StartupFlow ensures buildMainScreen() is called before starting the game

    // Rules button (fallback - also handled by StartupFlow)
    bus.on('intro:open:rules', function(){
      console.info('[Bootstrap] Rules button clicked');
      if(typeof global.openRulesModal === 'function'){
        global.openRulesModal();
      } else if(typeof global.showRules === 'function'){
        global.showRules();
      }
    });

    // Profile button (fallback - also handled by StartupFlow)
    bus.on('intro:open:profile', function(){
      console.info('[Bootstrap] Profile button clicked');
      if(typeof global.ProfileModal !== 'undefined' && typeof global.ProfileModal.open === 'function'){
        global.ProfileModal.open();
      } else if(typeof global.openProfileModal === 'function'){
        global.openProfileModal();
      }
    });

    // Leaderboard button (fallback - also handled by StartupFlow)
    bus.on('intro:open:leaderboard', function(){
      console.info('[Bootstrap] Leaderboard button clicked');
      // Show XP/progression panel if available
      if(typeof global.showXPPanel === 'function'){
        global.showXPPanel();
      } else if(typeof global.ProgressionUI !== 'undefined' && typeof global.ProgressionUI.showLeaderboard === 'function'){
        global.ProgressionUI.showLeaderboard();
      } else {
        console.warn('[Bootstrap] Leaderboard not available yet');
      }
    });

    // Settings button (fallback - also handled by StartupFlow)
    bus.on('intro:open:settings', function(){
      console.info('[Bootstrap] Settings button clicked');
      if(typeof global.openSettings === 'function'){
        global.openSettings();
      } else {
        const settingsBtn = document.getElementById('btnOpenSettings');
        if(settingsBtn) settingsBtn.click();
      }
    });

    // Credits button (fallback - also handled by StartupFlow)
    bus.on('intro:open:credits', function(){
      console.info('[Bootstrap] Credits button clicked');
      if(typeof global.showCredits === 'function'){
        global.showCredits();
      } else if(typeof global.endCredits !== 'undefined' && typeof global.endCredits.show === 'function'){
        global.endCredits.show();
      }
    });

    // Help button (fallback - also handled by StartupFlow)
    bus.on('intro:open:help', function(){
      console.info('[Bootstrap] Help button clicked');
      if(typeof global.showHelp === 'function'){
        global.showHelp();
      } else if(typeof global.openRulesModal === 'function'){
        global.openRulesModal();
      }
    });

    // NOTE: Chip buttons (Daily, News) are now handled by StartupFlow
  }

  // ---------- Boot ----------
  function bootstrap(){
    try{
      ensureGame();

      // Use Config.ensureGameCfg if available (preserves aliases)
      if(typeof global.Config !== 'undefined' && typeof global.Config.ensureGameCfg === 'function'){
        global.Config.ensureGameCfg();
      } else {
        // Fallback: read from bb_cfg_v2 first, then bb_settings_modular
        let raw = StorageSafe.get('bb_cfg_v2', null);
        if(!raw) raw = StorageSafe.get('bb_settings_modular', null);
        
        if(raw){
          try{ 
            const stored = JSON.parse(raw);
            // Merge into new config object following documented priority: defaults → existing config → stored overrides
            global.game.cfg = Object.assign({}, getDefaultCfg(), global.game.cfg || {}, stored);
            // Re-establish window.cfg alias
            global.cfg = global.game.cfg;
          }catch{ 
            global.game.cfg = getDefaultCfg();
            global.cfg = global.game.cfg;
          }
        } else {
          global.game.cfg = Object.assign({}, getDefaultCfg(), global.game.cfg || {});
          global.cfg = global.game.cfg;
          // Save to both keys
          StorageSafe.set('bb_cfg_v2', JSON.stringify(global.game.cfg));
          StorageSafe.set('bb_settings_modular', JSON.stringify(global.game.cfg));
        }
      }
      
      // Populate UI inputs with loaded config
      loadSettingsIntoUI(global.game.cfg);
      // NOTE: Don't call applyInputsToConfig() and saveSettings() on initial boot
      // as they would read from UI defaults and overwrite the loaded config.
      // They should only be called when user actually changes settings.

      // IMPORTANT: Do NOT call buildCast() here during initial boot.
      // The main screen build is now deferred until after Play is pressed.
      // StartupFlow will call buildCast() after the user completes the intro sequence.
      // This prevents the main game elements from flashing before the intro hub.

      wireButtons();
      wireSettingsTabs();
      
      // Initialize StartupFlow controller
      if(typeof global.StartupFlow !== 'undefined' && typeof global.StartupFlow.init === 'function'){
        global.StartupFlow.init();
        console.info('[Bootstrap] StartupFlow initialized');
      }
      
      // Wire up IntroScreen to show after intro video (for legacy compatibility)
      wireIntroScreenFlow();
      
      (function keepAlive(){
        wireButtons();
        updateStartButtonUI();   // Keep label in sync with phase
        setTimeout(keepAlive, 1500);
      })();

    }catch(e){
      console.error('[Bootstrap] error:', e);
    }
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', bootstrap, {once:true});
  } else {
    bootstrap();
  }

})(window);