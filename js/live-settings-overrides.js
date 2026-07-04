(function(g){
  'use strict';
  var STORE = 'bb_cfg_v2';
  var STYLE_ID = 'survival-visible-settings-live-fix';

  function readStore(){
    try{
      var raw = localStorage.getItem(STORE);
      var parsed = raw ? JSON.parse(raw) : {};
      return parsed && typeof parsed === 'object' ? parsed : {};
    }catch(e){ return {}; }
  }
  function writeStore(cfg){
    try{ localStorage.setItem(STORE, JSON.stringify(cfg || {})); }catch(e){}
  }
  function cfg(){
    var game = g.game = g.game || {};
    var stored = readStore();
    game.cfg = Object.assign({
      compactMode: false,
      compactRosterLayout: 'standard',
      publicMode: true,
      publicModeAdminOverride: false,
      survivalMode: false
    }, game.cfg || {}, stored);
    return game.cfg;
  }
  function notify(msg, cls){
    try{ g.addLog && g.addLog(msg, cls || ''); return; }catch(e){}
    try{ console.log('[settings]', msg); }catch(e){}
  }
  function isAdminUnlocked(c){
    if(c && c.publicModeAdminOverride) return true;
    try{ if(localStorage.getItem('bb_advanced_settings') === '1') return true; }catch(e){}
    return !!(g.BB_DEV || g.__BB_DEV__ || g.DEBUG_SETTINGS || document.body.classList.contains('advanced-settings'));
  }
  function saveAndApply(next){
    var c = cfg();
    Object.assign(c, next || {});
    if(c.compactMode) c.compactRosterLayout = '4x4-smaller';
    writeStore(c);
    applyEffects(c);
    return c;
  }
  function applyEffects(c){
    c = c || cfg();
    if(c.compactMode) c.compactRosterLayout = '4x4-smaller';
    try{
      document.body.classList.toggle('compact-mode', !!c.compactMode);
      document.body.classList.toggle('compact-roster-4x4', !!c.compactMode);
      document.body.classList.toggle('public-mode', c.publicMode !== false);
      document.body.classList.toggle('survival-mode', !!c.survivalMode);
    }catch(e){}
    try{ g.UI && g.UI.saveStoredCfg && g.UI.saveStoredCfg(c); }catch(e){}
    try{ g.UI && g.UI.applyCfgEffects && g.UI.applyCfgEffects(c); }catch(e){}
    try{ g.renderTopRoster && g.renderTopRoster(); }catch(e){}
    try{ g.renderRosterBar && g.renderRosterBar(); }catch(e){}
    try{ g.updateHud && g.updateHud(); }catch(e){}
  }
  function promptVip(input){
    var c = cfg();
    if(input) input.checked = c.publicMode !== false;
    var msg = 'Public mode is a VIP setting. Upgrade to VIP to change it.';
    try{
      if(typeof g.showConfirm === 'function') g.showConfirm(msg, {title:'VIP required', tone:'warn'});
      else alert(msg);
    }catch(e){ alert(msg); }
  }
  function injectCss(){
    if(document.getElementById(STYLE_ID)) return;
    var st = document.createElement('style');
    st.id = STYLE_ID;
    st.textContent = [
      '.vipBadge{display:inline-flex;align-items:center;margin-left:6px;padding:1px 6px;border-radius:999px;background:#f5c451;color:#1d1500;font-size:.62rem;font-weight:800;letter-spacing:.03em;vertical-align:middle}',
      'body.compact-mode #rosterBar,body.compact-roster-4x4 #rosterBar{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px}',
      'body.compact-mode #rosterBar .playerCard,body.compact-roster-4x4 #rosterBar .playerCard,body.compact-mode #topRoster .playerCard,body.compact-roster-4x4 #topRoster .playerCard{transform:scale(.88);transform-origin:top center}',
      'body.compact-mode #rosterBar img,body.compact-roster-4x4 #rosterBar img{max-width:42px;max-height:42px}',
      'body.compact-mode #rosterBar .name,body.compact-roster-4x4 #rosterBar .name{font-size:.68rem}',
      '@media (max-width:700px){body.compact-mode #rosterBar,body.compact-roster-4x4 #rosterBar{grid-template-columns:repeat(4,minmax(0,1fr))}}'
    ].join('\n');
    document.head.appendChild(st);
  }
  function rowHtml(key, label, extra, checked){
    return '<label class="toggleRow inline"><input type="checkbox" data-key="'+key+'" '+(checked?'checked':'')+'> <span>'+label+(extra||'')+'</span></label>';
  }
  function patchGeneratedModal(root){
    var c = cfg();
    var general = root.querySelector('[data-pane="general"] .settingsGrid');
    if(general && !general.querySelector('[data-live-settings="mode"]')){
      var card = document.createElement('div');
      card.className = 'card';
      card.setAttribute('data-live-settings','mode');
      card.style.padding = '10px';
      card.innerHTML = '<h3>Mode toggles</h3><div class="sep"></div>'+
        rowHtml('compactMode','Compact mode','',!!c.compactMode)+
        rowHtml('publicMode','Public mode',' <span class="vipBadge">VIP</span>',c.publicMode !== false);
      general.prepend(card);
    }
    var gameplay = root.querySelector('[data-pane="gameplay"] .settingsGrid');
    if(gameplay && !gameplay.querySelector('[data-live-settings="survival"]')){
      var gp = document.createElement('div');
      gp.className = 'card';
      gp.setAttribute('data-live-settings','survival');
      gp.style.padding = '10px';
      gp.innerHTML = '<h3>Features</h3><div class="sep"></div>'+rowHtml('survivalMode','Survival mode','',!!c.survivalMode);
      gameplay.prepend(gp);
    }
    var advanced = root.querySelector('[data-pane="advanced"] .settingsGrid');
    if(advanced && !advanced.querySelector('[data-live-settings="public-admin"]')){
      var adv = document.createElement('div');
      adv.className = 'card';
      adv.setAttribute('data-live-settings','public-admin');
      adv.style.padding = '10px';
      adv.innerHTML = '<h3>Hidden controls</h3><div class="sep"></div>'+rowHtml('publicModeAdminOverride','Public mode admin override','',!!c.publicModeAdminOverride);
      advanced.prepend(adv);
    }
    var debug = root.querySelector('[data-pane="debug"] .settingsGrid');
    if(debug && !debug.querySelector('#btnAdvanceSurvivalDay')){
      var dbg = document.createElement('div');
      dbg.className = 'card';
      dbg.style.padding = '10px';
      dbg.innerHTML = '<h3>Survival Debug</h3><div class="sep"></div><button class="btn small" id="btnAdvanceSurvivalDay">Advance Survival Day</button>';
      debug.prepend(dbg);
    }
  }
  function patchInlineModal(root){
    var c = cfg();
    var features = root.querySelector('#tabFeatures .toggleRow');
    if(features && !features.querySelector('[data-live-settings="visible"]')){
      var box = document.createElement('span');
      box.setAttribute('data-live-settings','visible');
      box.innerHTML = rowHtml('compactMode','Compact mode','',!!c.compactMode)+
        rowHtml('publicMode','Public mode',' <span class="vipBadge">VIP</span>',c.publicMode !== false)+
        rowHtml('survivalMode','Survival mode','',!!c.survivalMode);
      features.prepend(box);
    }
    var manage = root.querySelector('#tabManage');
    if(manage && !manage.querySelector('[data-live-settings="admin"]')){
      var admin = document.createElement('div');
      admin.setAttribute('data-live-settings','admin');
      admin.innerHTML = '<div class="sep"></div><h3>Advanced</h3><div class="toggleRow">'+rowHtml('publicModeAdminOverride','Public mode admin override','',!!c.publicModeAdminOverride)+'</div><div class="row"><button id="btnAdvanceSurvivalDay" class="btn small">Advance Survival Day</button></div>';
      manage.appendChild(admin);
    }
  }
  function syncInputs(root){
    var c = cfg();
    Array.prototype.forEach.call(root.querySelectorAll('[data-key="compactMode"]'), function(i){ i.checked = !!c.compactMode; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-key="publicMode"]'), function(i){ i.checked = c.publicMode !== false; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-key="publicModeAdminOverride"]'), function(i){ i.checked = !!c.publicModeAdminOverride; });
    Array.prototype.forEach.call(root.querySelectorAll('[data-key="survivalMode"]'), function(i){ i.checked = !!c.survivalMode; });
  }
  function patchText(root){
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
    var nodes = [];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(function(n){
      if(n.nodeValue && n.nodeValue.indexOf('Survivor') !== -1) n.nodeValue = n.nodeValue.replace(/Survivor/g, 'Survival');
      if(n.nodeValue && n.nodeValue.indexOf('survivor') !== -1) n.nodeValue = n.nodeValue.replace(/survivor/g, 'survival');
    });
  }
  function patchSettings(){
    injectCss();
    applyEffects(cfg());
    var generated = document.getElementById('settingsBackdrop');
    if(generated) patchGeneratedModal(generated);
    var inline = document.getElementById('settingsModal');
    if(inline) patchInlineModal(inline);
    if(generated) syncInputs(generated);
    if(inline) syncInputs(inline);
    patchText(document.body);
  }
  function advanceSurvivalDay(){
    try{
      if(typeof g.advanceSurvivalDay === 'function') return g.advanceSurvivalDay();
      if(typeof g.proceedNextWeek === 'function') return g.proceedNextWeek();
      if(typeof g.nextWeek === 'function') return g.nextWeek();
      var game = g.game = g.game || {};
      game.week = (game.week || 1) + 1;
      game.phase = 'intermission';
      game.hoh = null;
      game.nominees = [];
      game.veto = null;
      game.vetoHolder = null;
      try{ g.updateHud && g.updateHud(); }catch(e){}
      notify('Survival day advanced to week '+game.week, 'ok');
    }catch(e){ notify('Failed to advance Survival day: '+e, 'warn'); }
  }
  document.addEventListener('change', function(e){
    var input = e.target && e.target.closest && e.target.closest('[data-key]');
    if(!input) return;
    var key = input.getAttribute('data-key');
    if(['compactMode','publicMode','publicModeAdminOverride','survivalMode'].indexOf(key) === -1) return;
    var c = cfg();
    if(key === 'publicMode' && !isAdminUnlocked(c)){
      e.preventDefault();
      promptVip(input);
      return;
    }
    var next = {};
    next[key] = !!input.checked;
    saveAndApply(next);
    patchSettings();
  }, true);
  document.addEventListener('click', function(e){
    var target = e.target && e.target.closest && e.target.closest('#btnAdvanceSurvivalDay,#btnNextWeek');
    if(!target) return;
    if(target.id === 'btnAdvanceSurvivalDay'){
      e.preventDefault();
      e.stopPropagation();
      advanceSurvivalDay();
    }
    setTimeout(patchSettings, 20);
  }, true);
  function wrapOpen(name, holder){
    if(!holder || typeof holder[name] !== 'function' || holder[name].__survivalPatched) return;
    var original = holder[name];
    holder[name] = function(){
      var result = original.apply(this, arguments);
      setTimeout(patchSettings, 0);
      setTimeout(patchSettings, 80);
      return result;
    };
    holder[name].__survivalPatched = true;
  }
  function init(){
    saveAndApply({});
    wrapOpen('openSettingsModal', g);
    if(g.UI) wrapOpen('openSettingsModal', g.UI);
    patchSettings();
    setTimeout(patchSettings, 300);
    setTimeout(patchSettings, 1200);
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})(window);
