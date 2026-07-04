// Players total (6–22) injector — single-shot, no duplicates
// - Inserts into the visible Settings modal (prefers Cast; falls back to active pane)
// - Persists to bb_settings_modular + bb_cfg_v2
// - Lobby: rebuild + auto-start; Mid-season: reload to apply
// - Marks the modal with data-bb-numplayers-injected to prevent reinjection
// - Unique field id: numPlayersCast (won’t collide with existing numPlayers)
// - Exposes window.forcePlayersControlInject() and window.cleanupNumPlayersDupes()

(function (g) {
  'use strict';

  // Kill switch via URL: ?np=off
  if (/\bnp=off\b/i.test(location.search)) {
    console.info('[players-total] disabled via ?np=off');
    return;
  }

  const LS_KEYS = ['bb_settings_modular', 'bb_cfg_v2'];

  function log(...a){ console.info('[players-total]', ...a); }
  function warn(...a){ console.warn('[players-total]', ...a); }
  function clamp(n, lo, hi){ n = +n; if (isNaN(n)) n = lo; return Math.min(hi, Math.max(lo, n)); }

  // Safe CSS.escape
  function esc(id){
    try{
      return (window.CSS && typeof CSS.escape==='function')
        ? CSS.escape(String(id))
        : String(id).replace(/[^a-zA-Z0-9_\-]/g,'\\$&');
    }catch{
      return String(id).replace(/[^a-zA-Z0-9_\-]/g,'\\$&');
    }
  }

  function readCfg(){
    let merged = {};
    for (const k of LS_KEYS){
      try{
        const raw = localStorage.getItem(k);
        if(raw) merged = Object.assign(merged, JSON.parse(raw));
      }catch{}
    }
    (g.game = g.game || {}).cfg = Object.assign({}, g.game.cfg || {}, merged);
    return g.game.cfg;
  }
  function writeCfg(cfg){
    try{ localStorage.setItem(LS_KEYS[0], JSON.stringify(cfg)); }catch{}
    try{ localStorage.setItem(LS_KEYS[1], JSON.stringify(cfg)); }catch{}
  }

  function isVisible(el){
    if(!el) return false;
    const cs = getComputedStyle(el);
    if(cs.display==='none' || cs.visibility==='hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width>0 && r.height>0;
  }

  function findVisibleModal(){
    // Pick the visible settings modal (your app shows one at a time)
    const candidates = Array.from(document.querySelectorAll('#settingsModal, .modal-backdrop, .modal, [role="dialog"]'));
    for(const el of candidates){
      const root = el.matches('.modal') ? el : (el.querySelector?.('.modal') || el);
      if(root && isVisible(root)) return root;
    }
    return null;
  }

  function findTargetPane(modalRoot){
    if(!modalRoot) return null;

    // Prefer a "Cast" pane
    const tabs = Array.from(modalRoot.querySelectorAll('button, .tab-btn, [role="tab"]'));
    const tryTab = (label)=>{
      const b = tabs.find(x => new RegExp('\\b'+label+'\\b','i').test(x.textContent || ''));
      if(!b) return null;
      const tid = b.getAttribute('aria-controls') || b.getAttribute('data-target') || b.dataset?.tab;
      return tid ? modalRoot.querySelector('#'+esc(tid)) : null;
    };
    const castPane = tryTab('Cast'); if(castPane) return castPane;

    // If we can detect a "Cast Editor" heading, use its container
    const h = Array.from(modalRoot.querySelectorAll('h1,h2,h3,.section-title,.card h3'))
      .find(n => /\bcast editor\b/i.test(n.textContent || ''));
    if(h) return h.closest('.settingsTabPane, .card, .pane, .section') || h.parentElement;

    // Fallback to the active pane
    const active = modalRoot.querySelector('.settingsTabPane.active, .tab-pane.active, [role="tabpanel"].active');
    if(active) return active;

    // Last resort: modal root
    return modalRoot;
  }

  function cleanupDuplicates(modalRoot){
    if(!modalRoot) return 0;
    const cards = Array.from(modalRoot.querySelectorAll('[data-bb-numplayers-card]'));
    if(cards.length <= 1) return 0;
    cards.slice(1).forEach(n=>{ try{ n.remove(); }catch{} });
    return cards.length - 1;
  }

  function injectIntoPane(modalRoot, pane){
    // Don’t re-inject into the same modal
    if(modalRoot.dataset.bbNumplayersInjected === '1'){
      log('already injected in this modal; skipping');
      return true;
    }

    // If we already added a card in this pane, stop
    if(pane.querySelector('[data-bb-numplayers-card]')){
      log('control already present in pane; marking modal injected');
      modalRoot.dataset.bbNumplayersInjected = '1';
      return true;
    }

    // Try to place it above the first "Cast Editor" block if present
    let anchor = Array.from(pane.querySelectorAll('h1,h2,h3,.section-title,.card h3'))
      .find(n => /\bcast editor\b/i.test(n.textContent || ''));

    const wrap = document.createElement('div');
    wrap.className = 'card';
    wrap.setAttribute('data-bb-numplayers-card','1');
    wrap.style.marginBottom = '12px';
    wrap.innerHTML = `
      <h3>Players</h3>
      <div class="sep"></div>
      <label style="display:block;max-width:260px">
        Players total
        <input id="numPlayersCast" type="number" min="6" max="22" value="12" style="width:100%"/>
      </label>
    `;

    if(anchor){
      const hostCard = anchor.closest('.card') || pane;
      try{ hostCard.parentElement.insertBefore(wrap, hostCard); }
      catch{ pane.prepend(wrap); }
    }else{
      pane.prepend(wrap);
    }

    const cfg = readCfg();
    const cur = clamp(cfg?.numPlayers ?? (Array.isArray(g.game?.players) ? g.game.players.length : 12), 6, 22);
    const input = wrap.querySelector('#numPlayersCast');
    input.value = String(cur);

    input.addEventListener('input', ()=>{
      const v = clamp(input.value, 6, 22);
      if(String(v)!==input.value) input.value = String(v);
    });
    input.addEventListener('change', ()=>{
      const c = readCfg();
      c.numPlayers = clamp(input.value, 6, 22);
      writeCfg(c);
      log('saved numPlayers =', c.numPlayers);
      applyPlayers(c.numPlayers);
    });

    // Mark injected for this modal instance
    modalRoot.dataset.bbNumplayersInjected = '1';
    log('injected once into modal and pane:', { paneId: pane.id||'', paneClass: pane.className||'' });
    return true;
  }

  function applyPlayers(v){
    const val = clamp(v, 6, 22);
    const cfg = readCfg(); cfg.numPlayers = val; writeCfg(cfg);
    log('apply numPlayers =', val, 'phase=', g.game?.phase);

    try{
      if(g.game?.phase === 'lobby'){
        if(typeof g.rebuildGame === 'function'){ g.rebuildGame(false); }
        else if(typeof g.buildCast === 'function'){ g.buildCast(); }
        if(typeof g.startOpeningSequence === 'function'){ setTimeout(()=>g.startOpeningSequence(), 60); }
        g.addLog?.(`New season started with ${val} players.`,'ok');
      }else{
        g.addLog?.(`Players set to ${val}. Restarting to apply…`,'warn');
        setTimeout(()=>location.reload(), 250);
      }
    }catch(e){
      warn('apply failed; reloading as fallback', e);
      setTimeout(()=>location.reload(), 250);
    }

    try{
      const btn = document.getElementById('btnStartQuick');
      if(btn && g.game?.phase!=='lobby'){
        btn.textContent = '↻';
        btn.title = 'Restart (reload and apply saved settings)';
        btn.setAttribute('aria-label', 'Restart game');
      }
    }catch{}
  }

  function injectNow(){
    const modal = findVisibleModal();
    if(!modal){ log('no visible settings modal yet'); return false; }
    const pane = findTargetPane(modal);
    if(!pane){ log('no target pane'); return false; }
    // Always de-dupe before injecting (in case of leftovers)
    const removed = cleanupDuplicates(modal);
    if(removed) log('pre-inject cleanup removed', removed, 'duplicates');
    return injectIntoPane(modal, pane);
  }

  function init(){
    log('loaded (no duplicate injection)');

    // Try once shortly after DOM is ready
    setTimeout(injectNow, 80);

    // Hook Settings open buttons — single shot per click
    ['btnOpenSettings','btnSettings'].forEach(id=>{
      const b = document.getElementById(id);
      if(b && !b.__playersOnce){
        b.__playersOnce = true;
        b.addEventListener('click', ()=> setTimeout(injectNow, 120));
      }
    });

    // Manual helpers for you
    g.forcePlayersControlInject = injectNow;
    g.cleanupNumPlayersDupes = ()=> cleanupDuplicates(findVisibleModal());
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded', init, { once:true });
  }else{
    init();
  }
})(window);

(function(g){
  'use strict';

  const STORE = 'bb_cfg_v2';
  const STYLE_ID = 'bb-clean-settings-request-styles';
  const KEYS = ['bb_settings_modular', STORE];

  function readCfg(){
    let merged = {};
    KEYS.forEach(k=>{
      try{ const raw = localStorage.getItem(k); if(raw) Object.assign(merged, JSON.parse(raw)); }catch{}
    });
    const game = g.game = g.game || {};
    game.cfg = Object.assign({
      compactMode: false,
      compactRosterLayout: 'standard',
      publicMode: true,
      publicModeAdminOverride: false,
      survivalMode: false
    }, game.cfg || {}, merged);
    return game.cfg;
  }

  function saveCfg(cfg){
    KEYS.forEach(k=>{ try{ localStorage.setItem(k, JSON.stringify(cfg)); }catch{} });
  }

  function isVipAllowed(cfg){
    if(cfg.publicModeAdminOverride) return true;
    try{ if(g.SettingsVisibilityFilter?.isDevUser?.()) return true; }catch{}
    return !!(g.BB_DEV || g.__BB_DEV__ || g.DEBUG_SETTINGS || document.body.classList.contains('advanced-settings'));
  }

  function notify(message, cls){
    try{ g.addLog?.(message, cls || ''); }catch{ try{ console.info('[settings]', message); }catch{} }
  }

  function injectStyles(){
    if(document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.bb-vip-badge{display:inline-flex;align-items:center;margin-left:6px;padding:1px 6px;border-radius:999px;background:linear-gradient(135deg,#f7d774,#b8872d);color:#18110a;font-size:.58rem;font-weight:800;letter-spacing:.4px;vertical-align:middle}',
      'body.compact-mode #rosterBar,body.compact-roster-4x4-smaller #rosterBar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:4px}',
      'body.compact-mode .mobile-roster-active-grid,body.compact-roster-4x4-smaller .mobile-roster-active-grid{--mobile-roster-cols:4;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:2px!important}',
      'body.compact-mode .mobile-roster-tile,body.compact-roster-4x4-smaller .mobile-roster-tile{max-width:96px;min-width:52px;padding:1px!important;border-radius:5px}',
      'body.compact-mode .mobile-roster-name,body.compact-roster-4x4-smaller .mobile-roster-name{font-size:9px;min-height:12px;max-height:14px;padding:1px 2px 2px}',
      'body.compact-mode #rosterBar img,body.compact-roster-4x4-smaller #rosterBar img{max-width:42px;max-height:42px}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function applyModeEffects(cfg){
    injectStyles();
    cfg.compactRosterLayout = cfg.compactMode ? '4x4-smaller' : 'standard';
    try{
      document.body.classList.toggle('compact-mode', !!cfg.compactMode);
      document.body.classList.toggle('compact-roster-4x4-smaller', !!cfg.compactMode);
      document.body.classList.toggle('public-mode', cfg.publicMode !== false);
      document.body.classList.toggle('survival-mode', !!cfg.survivalMode);
    }catch{}
    try{ g.MobileRoster?.refresh?.(); }catch{}
    try{ g.renderTopRoster?.(); }catch{}
    try{ g.renderRosterBar?.(); }catch{}
    try{ g.updateHud?.(); }catch{}
  }

  function row(key, label, checked, extra){
    return '<label class="toggleRow bb-clean-setting"><span>'+label+(extra||'')+'</span><input type="checkbox" data-bb-setting="'+key+'" '+(checked?'checked':'')+'></label>';
  }

  function addDynamicControls(root){
    const cfg = readCfg();
    const general = root.querySelector('[data-pane="general"] .settingsGrid');
    if(general && !general.querySelector('[data-bb-clean-group="modes"]')){
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-bb-clean-group','modes');
      card.innerHTML = '<h3>Mode toggles</h3><div class="sep"></div>'+
        row('compactMode','Compact mode', !!cfg.compactMode)+
        row('publicMode','Public mode', cfg.publicMode !== false, ' <span class="bb-vip-badge">VIP</span>')+
        row('survivalMode','Survival mode', !!cfg.survivalMode);
      general.prepend(card);
    }
    const advanced = root.querySelector('[data-pane="advanced"] .settingsGrid');
    if(advanced && !advanced.querySelector('[data-bb-clean-group="admin-public"]')){
      const card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-bb-clean-group','admin-public');
      card.innerHTML = '<h3>Advanced</h3><div class="sep"></div>'+row('publicModeAdminOverride','Public mode admin override', !!cfg.publicModeAdminOverride);
      advanced.prepend(card);
    }
    const debug = root.querySelector('[data-pane="debug"] .settingsGrid');
    if(debug){
      const old = debug.querySelector('#btnNextWeek');
      if(old){ old.id = 'btnAdvanceSurvivalDay'; old.textContent = 'Advance Survival Day'; }
      if(!debug.querySelector('#btnAdvanceSurvivalDay')){
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = '<h3>Survival Debug</h3><div class="sep"></div><button class="btn small" id="btnAdvanceSurvivalDay">Advance Survival Day</button>';
        debug.prepend(card);
      }
    }
  }

  function addInlineControls(root){
    const cfg = readCfg();
    const features = root.querySelector('#tabFeatures .toggleRow');
    if(features && !features.querySelector('[data-bb-clean-group="inline-modes"]')){
      const box = document.createElement('span');
      box.setAttribute('data-bb-clean-group','inline-modes');
      box.innerHTML = row('compactMode','Compact mode', !!cfg.compactMode)+
        row('publicMode','Public mode', cfg.publicMode !== false, ' <span class="bb-vip-badge">VIP</span>')+
        row('survivalMode','Survival mode', !!cfg.survivalMode);
      features.prepend(box);
    }
    const manage = root.querySelector('#tabManage');
    if(manage && !manage.querySelector('[data-bb-clean-group="inline-admin"]')){
      const block = document.createElement('div');
      block.setAttribute('data-bb-clean-group','inline-admin');
      block.innerHTML = '<div class="sep"></div><h3>Advanced</h3><div class="toggleRow">'+row('publicModeAdminOverride','Public mode admin override', !!cfg.publicModeAdminOverride)+'</div><div class="row"><button class="btn small" id="btnAdvanceSurvivalDay">Advance Survival Day</button></div>';
      manage.appendChild(block);
    }
  }

  function syncControls(root){
    const cfg = readCfg();
    root.querySelectorAll('[data-bb-setting="compactMode"]').forEach(i=>i.checked = !!cfg.compactMode);
    root.querySelectorAll('[data-bb-setting="publicMode"]').forEach(i=>i.checked = cfg.publicMode !== false);
    root.querySelectorAll('[data-bb-setting="publicModeAdminOverride"]').forEach(i=>i.checked = !!cfg.publicModeAdminOverride);
    root.querySelectorAll('[data-bb-setting="survivalMode"]').forEach(i=>i.checked = !!cfg.survivalMode);
  }

  function renameVisibleSurvivorText(){
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node=>{
      if(node.nodeValue && /survivor/i.test(node.nodeValue)){
        node.nodeValue = node.nodeValue.replace(/Survivor/g, 'Survival').replace(/survivor/g, 'survival');
      }
    });
  }

  function patchSettingsUI(){
    injectStyles();
    applyModeEffects(readCfg());
    const dynamic = document.getElementById('settingsBackdrop');
    if(dynamic) addDynamicControls(dynamic);
    const inline = document.getElementById('settingsModal');
    if(inline) addInlineControls(inline);
    if(dynamic) syncControls(dynamic);
    if(inline) syncControls(inline);
    renameVisibleSurvivorText();
  }

  function promptVip(input){
    const cfg = readCfg();
    input.checked = cfg.publicMode !== false;
    const msg = 'Public mode is a VIP setting. Upgrade to VIP to change it.';
    try{
      if(typeof g.showConfirm === 'function') g.showConfirm(msg, { title:'VIP required', tone:'warn' });
      else alert(msg);
    }catch{ alert(msg); }
  }

  function saveSetting(key, value){
    const cfg = readCfg();
    cfg[key] = !!value;
    if(key === 'compactMode') cfg.compactRosterLayout = cfg.compactMode ? '4x4-smaller' : 'standard';
    saveCfg(cfg);
    applyModeEffects(cfg);
    return cfg;
  }

  function advanceSurvivalDay(){
    const game = g.game;
    if(!game){ notify('Game not started', 'warn'); return; }
    try{
      if(typeof g.proceedNextWeek === 'function'){
        g.proceedNextWeek();
      }else if(typeof g.nextWeek === 'function'){
        g.nextWeek();
      }else{
        game.week = (game.week || 1) + 1;
        game.phase = 'intermission';
        game.nominees = [];
        game.vetoHolder = null;
        game.hohId = null;
        if(Array.isArray(game.players)) game.players.forEach(p=>{ p.nominated = false; p.hoh = false; p.nominationState = 'none'; });
        try{ g.setPhase?.('intermission', 1, ()=>g.startHOH?.()); }catch{}
        try{ g.renderPanel?.(); }catch{}
      }
      try{ g.updateHud?.(); }catch{}
      notify('Survival day advanced.', 'ok');
    }catch(err){
      notify('Failed to advance Survival day: '+err, 'warn');
    }
  }

  document.addEventListener('change', function(e){
    const input = e.target && e.target.closest && e.target.closest('[data-bb-setting]');
    if(!input) return;
    const key = input.getAttribute('data-bb-setting');
    const cfg = readCfg();
    if(key === 'publicMode' && !isVipAllowed(cfg)){
      e.preventDefault();
      e.stopPropagation();
      promptVip(input);
      return;
    }
    saveSetting(key, input.checked);
    patchSettingsUI();
  }, true);

  document.addEventListener('click', function(e){
    const settingsButton = e.target && e.target.closest && e.target.closest('#btnOpenSettings,#btnSettings,#settingsBtn,#settings,button[title="Settings"],.btn-settings,.settingsButton');
    if(settingsButton) setTimeout(patchSettingsUI, 80);
    const advanceButton = e.target && e.target.closest && e.target.closest('#btnAdvanceSurvivalDay,#btnNextWeek');
    if(advanceButton){
      e.preventDefault();
      e.stopPropagation();
      advanceSurvivalDay();
      setTimeout(patchSettingsUI, 20);
    }
  }, true);

  function init(){
    const cfg = readCfg();
    if(cfg.publicMode === undefined) cfg.publicMode = true;
    saveCfg(cfg);
    patchSettingsUI();
    setTimeout(patchSettingsUI, 250);
    setTimeout(patchSettingsUI, 1000);
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})(window);
