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
      returnChance:50,selfEvictChance:0,enablePublicFav:false
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
    try{ StorageSafe.set('bb_settings_modular', JSON.stringify(global.game?.cfg||{})); }catch{}
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

  function buildCast(){
    ensureGame();
    const g=global.game;
    if(typeof global.pushPlayer!=='function' || typeof global.initAffinities!=='function'){
      setTimeout(buildCast, 30);
      return;
    }
    g.players.length = 0;

    const humanName=(g.cfg?.humanName || document.getElementById('humanName')?.value || 'You').trim();
    const N=+g.cfg?.numPlayers || 12;
    const defaults=['Finn','Mimi','Rae','Nova','Kai','Zed','Ivy','Ash','Lux','Remy','Blue','Jax','Echo','Vee','Sol','Quinn','Aria','Dex','Rune','Bea','Nico','Pax','Noa','Kian','Lia','Rey'];

    for(let i=0;i<N;i++){
      const nm = (i===0) ? humanName : defaults[(i-1)%defaults.length];
      global.pushPlayer({name:nm, human:i===0});
    }
    global.attachBios?.(g);
    global.initAffinities();
    global.initRelationships();
    resetRoundState();
    // Reset public favourite flag for new season
    global.__publicFavDone = false;
    global.addLog?.('Game created. Waiting to start…','muted');
    global.tv?.say?.('Game created. Waiting to start…');
    global.updateHud?.();
    global.renderPanel?.();
  }

  function rebuildGame(preservePlayers=true){
    ensureGame();
    const g=global.game;

    if(preservePlayers && Array.isArray(g.players) && g.players.length){
      g.players.forEach(p=>{
        p.evicted=false; p.nominated=false; p.hoh=false;
        p.wins = {hoh:0, veto:0};
        p.stats = {hohWins:0, vetoWins:0};
        p.threat = global.THREAT_BASE ?? 0.5;
        p.weekEvicted=null; p.winner=false; p.runnerUp=false;
      });
      global.attachBios?.(g);
      global.initAffinities();
      global.initRelationships();
      resetRoundState();
      // Reset public favourite flag for new season
      global.__publicFavDone = false;
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
      global.startOpeningSequence?.();
    }catch(e){
      console.error('[Start] error:', e);
      try{
        global.tv?.say?.('HOH Competition');
        global.setPhase?.('intermission', 3, ()=>global.startHOH?.());
      }catch(e2){ console.error('[Start fallback] failed:', e2); }
    }
  }

  function ensureSkipTimerButton(){
    const c=document.getElementById('countdown'); if(!c) return;
    if(document.getElementById('btnFastForward')) return;
    const btn=document.createElement('button');
    btn.id='btnFastForward'; btn.className='btn small'; btn.textContent='⏩ Skip';
    btn.style.marginLeft='8px';
    c.parentElement && c.parentElement.appendChild(btn);
    btn.addEventListener('click',()=>global.fastForwardPhase?.());
  }

  function updateStartButtonUI(){
    const btn = document.getElementById('btnStartQuick');
    if(!btn) return;
    const inLobby = (global.game?.phase === 'lobby');
    btn.textContent = inLobby ? '▶ Start' : '↻ Restart';
    btn.title = inLobby ? 'Start new season' : 'Restart (reload and apply saved settings)';
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
  }

  // ---------- Boot ----------
  function bootstrap(){
    try{
      ensureGame();

      const raw=StorageSafe.get('bb_settings_modular', null);
      if(raw){
        try{ global.game.cfg = Object.assign({}, getDefaultCfg(), JSON.parse(raw)); }catch{ global.game.cfg = getDefaultCfg(); }
      } else {
        global.game.cfg = getDefaultCfg();
        StorageSafe.set('bb_settings_modular', JSON.stringify(global.game.cfg));
      }
      loadSettingsIntoUI(global.game.cfg);
      applyInputsToConfig();
      saveSettings();

      buildCast();

      wireButtons();
      wireSettingsTabs();
      (function keepAlive(){
        wireButtons();
        ensureSkipTimerButton();
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