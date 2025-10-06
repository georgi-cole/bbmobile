// MODULE: settings.js
// Restores and upgrades the Settings modal.
// - Re-wires the Settings button (creates one if missing).
// - Tabbed modal with grouped settings.
// - Persists settings to localStorage and applies to game config (g.cfg).
// - Adds useful toggles and tools (export/import/reset).
//
// Usage: include after ui.js (and before bootstrap.js). See scripts.html snippet.

(function(global){
  'use strict';

  var STORAGE_KEY = 'bb_cfg_v2';

  // Reasonable defaults (merged into g.cfg)
  var DEFAULT_CFG = {
    // Visual/UX
    fxCards: true,
    showTopRoster: true,
    colorblindMode: false,
    strictAvatars: false, // When true, use local silhouette instead of external fallback
    autoShowRulesOnStart: false, // When true, shows rules modal automatically after intro
    // Core game mechanics
    enableJuryHouse: true,
    doubleChance: 18,   // %
    tripleChance: 7,    // %
    returnChance: 10,   // % chance a juror returns (mid-season)
    selfEvictChance: 1, // % tiny chance of auto self-eviction
    enablePublicFav: true, // Public's Favourite Player feature at finale (default ON)
    // Timing (seconds)
    tVote: 30,
    tVeto: 40,
    tVetoDec: 25,
    // Audio
    musicOn: true,
    sfxOn: true,
    // Reserved for future toggles
    useRibbon: true,
    // Minigame mode
    miniMode: 'random',  // 'random' | 'clicker' | 'cycle'
    // Minigame system (Phase 1-8 unified system)
    useNewMinigames: true,  // When true, use new Phase 1 minigame system with non-repeating pools
    useUnifiedMinigames: true,  // Master switch for unified minigame system (Phases 0-8)
    enableMinigameBridge: true,  // Compatibility bridge for legacy keys (temporary, can disable after migration)
    enableMinigameTelemetryPanel: false  // Dev debug panel (Ctrl+Shift+D when enabled)
  };

  // Load/save helpers
  function loadStoredCfg(){
    try{
      var raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return {};
      var data = JSON.parse(raw);
      return (data && typeof data==='object') ? data : {};
    }catch(e){
      console.warn('[settings] loadStoredCfg failed', e);
      return {};
    }
  }
  function saveStoredCfg(cfg){
    try{
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg||{}));
    }catch(e){
      console.warn('[settings] saveStoredCfg failed', e);
    }
  }

  function ensureGameCfg(){
    var g = global.game = global.game || {};
    g.cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, loadStoredCfg());
    // Side-effects: apply a couple of UI-level toggles
    try{
      document.body.classList.toggle('cb', !!g.cfg.colorblindMode);
    }catch(e){}
    return g.cfg;
  }

  function ensureSettingsButton(){
    var btn = document.getElementById('btnSettings');
    if(btn && btn.__wired) return btn;

    if(!btn){
      // Try to add to topbar if present
      var bar = document.querySelector('.topbar');
      if(bar){
        btn = document.createElement('button');
        btn.id = 'btnSettings';
        btn.className = 'btn';
        btn.textContent = 'Settings';
        bar.prepend(btn);
      }
    }

    if(btn && !btn.__wired){
      btn.__wired = true;
      btn.addEventListener('click', openSettingsModal);
    }
    return btn;
  }

  // Build the modal once; reuse each time
  function ensureModal(){
    var dim = document.getElementById('settingsBackdrop');
    if(dim) return dim;

    dim = document.createElement('div');
    dim.id = 'settingsBackdrop';
    dim.className = 'modal-backdrop';

    var modal = document.createElement('div');
    modal.className = 'modal';

    var closeX = document.createElement('button');
    closeX.className = 'closeX';
    closeX.textContent = '×';

    var h = document.createElement('h2');
    h.textContent = 'Settings';

    // Tabs bar
    var tabBar = document.createElement('div');
    tabBar.className = 'tabBar';
    tabBar.id = 'settingsTabs';
    tabBar.innerHTML = [
      '<button class="tab-btn active" data-tab="general">General</button>',
      '<button class="tab-btn" data-tab="gameplay">Gameplay</button>',
      '<button class="tab-btn" data-tab="timing">Timing</button>',
      '<button class="tab-btn" data-tab="visual">Visual</button>',
      '<button class="tab-btn" data-tab="audio">Audio</button>',
      '<button class="tab-btn" data-tab="advanced">Advanced</button>',
      '<button class="tab-btn" data-tab="debug">Debug</button>'
    ].join('');

    // Panes
    var panes = document.createElement('div');
    panes.id = 'settingsPanes';

    panes.appendChild(buildPane('general', buildGeneralPaneHTML()));
    panes.appendChild(buildPane('gameplay', buildGameplayPaneHTML()));
    panes.appendChild(buildPane('timing', buildTimingPaneHTML()));
    panes.appendChild(buildPane('visual', buildVisualPaneHTML()));
    panes.appendChild(buildPane('audio', buildAudioPaneHTML()));
    panes.appendChild(buildPane('advanced', buildAdvancedPaneHTML()));
    panes.appendChild(buildPane('debug', buildDebugPaneHTML()));

    // Actions row
    var actions = document.createElement('div');
    actions.className = 'row between';
    actions.style.marginTop = '10px';
    var left = document.createElement('div'); left.className='row';
    var right = document.createElement('div'); right.className='row';

    var btnApply = document.createElement('button'); btnApply.className='btn primary'; btnApply.textContent='Apply';
    var btnSaveClose = document.createElement('button'); btnSaveClose.className='btn'; btnSaveClose.textContent='Save & Close';
    var btnCancel = document.createElement('button'); btnCancel.className='btn danger'; btnCancel.textContent='Cancel';
    left.appendChild(btnApply);
    right.appendChild(btnCancel);
    right.appendChild(btnSaveClose);

    actions.appendChild(left);
    actions.appendChild(right);

    modal.appendChild(closeX);
    modal.appendChild(h);
    modal.appendChild(tabBar);
    modal.appendChild(panes);
    modal.appendChild(actions);
    dim.appendChild(modal);
    document.body.appendChild(dim);

    // Wire tab switching
    tabBar.addEventListener('click', function(e){
      var btn = e.target.closest('.tab-btn'); if(!btn) return;
      var tab = btn.getAttribute('data-tab');
      tabBar.querySelectorAll('.tab-btn').forEach(function(b){ b.classList.toggle('active', b===btn); });
      panes.querySelectorAll('.settingsTabPane').forEach(function(p){ p.classList.toggle('active', p.getAttribute('data-pane')===tab); });
    });

    // Close handlers
    closeX.addEventListener('click', closeSettingsModal);
    btnCancel.addEventListener('click', closeSettingsModal);
    btnApply.addEventListener('click', function(){
      applyFormToConfig(modal);
      notify('Settings applied', 'ok');
    });
    btnSaveClose.addEventListener('click', function(){
      applyFormToConfig(modal);
      closeSettingsModal();
      notify('Settings saved', 'ok');
    });

    // Switch initial active pane
    switchPane(panes, 'general');

    return dim;
  }

  function buildPane(key, innerHTML){
    var pane = document.createElement('div');
    pane.className = 'settingsTabPane';
    pane.setAttribute('data-pane', key);
    pane.innerHTML = innerHTML;
    return pane;
  }

  // Pane templates

  function buildGeneralPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Interface', [
          checkbox('fxCards','Card reveal popups (FX cards)'),
          checkbox('showTopRoster','Show top roster above TV'),
          checkbox('enableJuryHouse','Enable Jury House')
        ].join('')),
        group('Quality of life', [
          '<div class="toggleRow">',
            checkbox('colorblindMode','Colorblind/high-contrast mode'),
            '<div class="tiny muted">Adds body class "cb" for theming; you can style colors via CSS if desired.</div>',
          '</div>'
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildGameplayPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Features', [
          checkbox('enablePublicFav','Public\'s favourite player - this is a new module!')
        ].join('')),
        group('Week twists', [
          number('doubleChance','Double eviction chance (%)',0,100,1),
          number('tripleChance','Triple eviction chance (%)',0,100,1),
          number('returnChance','Juror return chance (%)',0,100,1),
          number('selfEvictChance','Self-eviction chance (%)',0,100,0.5)
        ].join('')),
        group('Minigame settings', [
          '<div class="toggleRow">',
            '<label>Minigame mode</label>',
            '<select data-key="miniMode">',
              '<option value="random">Random</option>',
              '<option value="clicker">Clicker only</option>',
              '<option value="cycle">Cycle through all</option>',
            '</select>',
            '<div class="tiny muted">Choose how minigames are selected during competitions.</div>',
          '</div>',
          checkbox('useNewMinigames','Use new minigame system (Phase 1) - non-repeating pools')
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildTimingPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Phase timers (seconds)', [
          number('tVote','Live vote duration',5,300,5),
          number('tVeto','Veto competition duration',5,300,5),
          number('tVetoDec','Veto decision duration',5,300,5)
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildVisualPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Badges & effects', [
          checkbox('useRibbon','Use EVICTED ribbon overlay')
        ].join('')),
        group('Avatars', [
          checkbox('strictAvatars','Strict local avatars (no external fallback)')
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildAudioPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Audio', [
          checkbox('musicOn','Music'),
          checkbox('sfxOn','Sound effects')
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildAdvancedPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Data', [
          '<div class="row">',
            '<button class="btn" data-action="export">Export settings JSON</button>',
            '<button class="btn" data-action="import">Import settings JSON</button>',
          '</div>',
          '<div class="tiny muted">Import expects a JSON dump created by Export. This only affects settings, not game state.</div>'
        ].join('')),
        group('Danger zone', [
          '<div class="row">',
            '<button class="btn warn" data-action="reset-defaults">Reset to defaults</button>',
            '<button class="btn danger" data-action="clear-storage">Clear saved settings</button>',
          '</div>'
        ].join('')),
      '</div>'
    ].join('');
  }

  function buildDebugPaneHTML(){
    return [
      '<div class="settingsGrid">',
        group('Music / Audio', [
          '<div class="row">',
            '<select id="musicTrack" style="flex:1">',
              '<option value="none">No track</option>',
              '<option value="theme_opening">Opening Theme</option>',
              '<option value="hoh_comp">HOH Comp</option>',
              '<option value="veto_comp">Veto Comp</option>',
              '<option value="nominations">Nominations</option>',
              '<option value="live_vote">Live Vote</option>',
              '<option value="eviction">Eviction</option>',
              '<option value="victory">Victory Theme</option>',
            '</select>',
            '<button class="btn small" id="btnPlayMusic">Play</button>',
            '<button class="btn small" id="btnStopMusic">Stop</button>',
          '</div>',
          '<label class="toggleRow">Volume <input type="range" id="musicVol" min="0" max="1" step="0.01" value="0.4" style="flex:1;margin-left:8px"/></label>',
          checkbox('autoMusic','Auto music'),
        ].join('')),
        group('Quick Actions', [
          '<div class="row" style="flex-wrap:wrap;gap:8px">',
            '<button class="btn small" id="btnNextWeek">Force Week ▶</button>',
            '<button class="btn small" id="btnClearLog">Clear Log</button>',
            '<button class="btn small" id="btnExport">Export Save</button>',
            '<button class="btn small" id="btnImport">Import</button>',
          '</div>',
          '<input id="importFile" type="file" accept="application/json" style="display:none"/>',
        ].join('')),
        group('Advanced Debug', [
          '<div class="row" style="flex-wrap:wrap;gap:8px">',
            '<button class="btn small" id="btnDumpSocial">Dump Social</button>',
            '<button class="btn small" id="btnForceReturnTwist">Force Return Twist</button>',
            '<button class="btn small" id="btnSkipPhaseDbg">Skip Phase</button>',
          '</div>',
        ].join('')),
      '</div>'
    ].join('');
  }

  // Small helpers to render fields

  function group(title, bodyHTML){
    return [
      '<div class="card" style="padding:10px">',
        '<h3>'+escapeHtml(title)+'</h3>',
        '<div class="sep"></div>',
        bodyHTML,
      '</div>'
    ].join('');
  }
  function checkbox(key, label){
    return [
      '<label class="toggleRow">',
        '<input type="checkbox" data-key="'+key+'"> ',
        '<span>'+escapeHtml(label)+'</span>',
      '</label>'
    ].join('');
  }
  function number(key, label, min, max, step){
    return [
      '<label class="toggleRow">',
        '<span>'+escapeHtml(label)+'</span>',
        '<input type="number" style="width:110px" data-key="'+key+'" min="'+min+'" max="'+max+'" step="'+(step||1)+'">',
      '</label>'
    ].join('');
  }

  function escapeHtml(s){
    return String(s).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c] || c;
    });
  }

  function openSettingsModal(){
    ensureGameCfg();
    var dim = ensureModal();
    dim.style.display = 'flex';

    // Fill values from cfg
    var cfg = global.game.cfg || {};
    var modal = dim.querySelector('.modal');

    Array.prototype.forEach.call(modal.querySelectorAll('[data-key]'), function(inp){
      var k = inp.getAttribute('data-key');
      if(inp.type === 'checkbox'){
        inp.checked = !!cfg[k];
      }else if(inp.tagName.toLowerCase() === 'select'){
        var v = (cfg[k] != null ? cfg[k] : 'random');
        inp.value = v;
      }else{
        var v = (cfg[k] != null ? cfg[k] : '');
        inp.value = v;
      }
    });

    // Wire advanced actions each open (in case modal reused)
    modal.__advancedWired || wireAdvanced(modal);
    modal.__debugWired || wireDebug(modal);
  }

  function closeSettingsModal(){
    var dim = document.getElementById('settingsBackdrop');
    if(dim) dim.style.display = 'none';
  }

  function switchPane(panesRoot, key){
    panesRoot.querySelectorAll('.settingsTabPane').forEach(function(p){
      p.classList.toggle('active', p.getAttribute('data-pane')===key);
    });
    var bar = document.getElementById('settingsTabs');
    if(bar){
      bar.querySelectorAll('.tab-btn').forEach(function(btn){
        btn.classList.toggle('active', btn.getAttribute('data-tab')===key);
      });
    }
  }

  function applyFormToConfig(modal){
    var g = global.game = global.game || {};
    var cfg = g.cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {});
    Array.prototype.forEach.call(modal.querySelectorAll('[data-key]'), function(inp){
      var k = inp.getAttribute('data-key');
      if(inp.type === 'checkbox'){
        cfg[k] = !!inp.checked;
      }else if(inp.tagName.toLowerCase() === 'select'){
        cfg[k] = inp.value;
      }else{
        var n = parseFloat(inp.value);
        cfg[k] = isNaN(n) ? inp.value : n;
      }
    });

    // Persist
    saveStoredCfg(cfg);

    // Side-effects: apply UI toggles
    try{
      document.body.classList.toggle('cb', !!cfg.colorblindMode);
    }catch(e){}

    // Apply to HUD immediately (top roster, jury HUD, etc.)
    try{ global.updateHud?.(); }catch(e){}

    notify('Settings updated', 'ok');
  }

  function wireAdvanced(modal){
    var root = modal;
    root.__advancedWired = true;

    root.addEventListener('click', function(e){
      var btn = e.target.closest('button[data-action]'); if(!btn) return;
      var action = btn.getAttribute('data-action');
      if(action === 'reset-defaults'){
        if(!confirm('Reset all settings to defaults?')) return;
        var g = global.game = global.game || {};
        g.cfg = Object.assign({}, DEFAULT_CFG);
        saveStoredCfg(g.cfg);
        notify('Settings reset to defaults', 'warn');
        closeSettingsModal();
      }else if(action === 'clear-storage'){
        if(!confirm('Clear saved settings from localStorage?')) return;
        localStorage.removeItem(STORAGE_KEY);
        notify('Saved settings cleared', 'warn');
        closeSettingsModal();
      }else if(action === 'export'){
        try{
          var data = JSON.stringify(global.game?.cfg || {}, null, 2);
          var blob = new Blob([data], {type:'application/json'});
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bb-settings.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }catch(err){
          alert('Export failed: '+err);
        }
      }else if(action === 'import'){
        var inp = document.createElement('input');
        inp.type = 'file'; inp.accept = 'application/json';
        inp.onchange = function(){
          var file = inp.files && inp.files[0]; if(!file) return;
          var fr = new FileReader();
          fr.onload = function(){
            try{
              var obj = JSON.parse(fr.result);
              var g = global.game = global.game || {};
              g.cfg = Object.assign({}, DEFAULT_CFG, g.cfg || {}, obj || {});
              saveStoredCfg(g.cfg);
              notify('Settings imported', 'ok');
              closeSettingsModal();
            }catch(err){
              alert('Import failed: '+err);
            }
          };
          fr.readAsText(file);
        };
        inp.click();
      }
    });
  }

  function notify(msg, cls){
    try{ global.addLog?.(msg, cls || ''); }catch(e){}
  }

  function wireDebug(modal){
    var root = modal;
    root.__debugWired = true;

    // Music controls
    var btnPlayMusic = root.querySelector('#btnPlayMusic');
    var btnStopMusic = root.querySelector('#btnStopMusic');
    var musicTrack = root.querySelector('#musicTrack');
    var musicVol = root.querySelector('#musicVol');

    if(btnPlayMusic){
      btnPlayMusic.addEventListener('click', function(){
        var track = musicTrack?.value;
        if(!track || track === 'none'){ notify('Select a track first', 'warn'); return; }
        var vol = parseFloat(musicVol?.value || 0.4);
        try{
          if(typeof global.playMusic === 'function'){
            global.playMusic(track, vol);
          }else if(typeof global.phaseMusic === 'function'){
            global.phaseMusic(track);
          }else{
            notify('Music system not available', 'warn');
          }
        }catch(e){ notify('Play failed: '+e, 'warn'); }
      });
    }

    if(btnStopMusic){
      btnStopMusic.addEventListener('click', function(){
        try{
          if(typeof global.stopMusic === 'function') global.stopMusic();
          else if(global.bgm) global.bgm.pause();
          else {
            var bgm = document.getElementById('bgm');
            if(bgm) bgm.pause();
          }
        }catch(e){}
      });
    }

    // Quick actions
    var btnNextWeek = root.querySelector('#btnNextWeek');
    if(btnNextWeek){
      btnNextWeek.addEventListener('click', function(){
        try{
          var g = global.game;
          if(!g){ notify('Game not started', 'warn'); return; }
          g.week = (g.week || 1) + 1;
          notify('Week advanced to '+ g.week, 'ok');
        }catch(e){ notify('Failed: '+e, 'warn'); }
      });
    }

    var btnClearLog = root.querySelector('#btnClearLog');
    if(btnClearLog){
      btnClearLog.addEventListener('click', function(){
        try{
          var log = document.getElementById('log');
          if(log) log.innerHTML = '';
          notify('Log cleared', 'ok');
        }catch(e){}
      });
    }

    var btnExport = root.querySelector('#btnExport');
    if(btnExport){
      btnExport.addEventListener('click', function(){
        try{
          var data = JSON.stringify(global.game || {}, null, 2);
          var blob = new Blob([data], {type:'application/json'});
          var a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bb-save.json';
          a.click();
          URL.revokeObjectURL(a.href);
          notify('Save exported', 'ok');
        }catch(err){ notify('Export failed: '+err, 'warn'); }
      });
    }

    var btnImport = root.querySelector('#btnImport');
    var importFile = root.querySelector('#importFile');
    if(btnImport && importFile){
      btnImport.addEventListener('click', function(){ importFile.click(); });
      importFile.addEventListener('change', function(){
        var file = importFile.files && importFile.files[0];
        if(!file) return;
        var fr = new FileReader();
        fr.onload = function(){
          try{
            var obj = JSON.parse(fr.result);
            global.game = obj;
            notify('Save imported', 'ok');
            if(typeof global.updateHud === 'function') global.updateHud();
          }catch(err){ notify('Import failed: '+err, 'warn'); }
        };
        fr.readAsText(file);
      });
    }

    // Advanced debug
    var btnDumpSocial = root.querySelector('#btnDumpSocial');
    if(btnDumpSocial){
      btnDumpSocial.addEventListener('click', function(){
        try{
          if(typeof global.dumpSocialState === 'function'){
            global.dumpSocialState();
          }else{
            console.log('Social state:', global.game?.social || 'N/A');
            notify('Social dumped to console', 'ok');
          }
        }catch(e){ notify('Failed: '+e, 'warn'); }
      });
    }

    var btnForceReturnTwist = root.querySelector('#btnForceReturnTwist');
    if(btnForceReturnTwist){
      btnForceReturnTwist.addEventListener('click', function(){
        try{
          if(typeof global.startReturnTwist === 'function'){
            global.startReturnTwist();
            notify('Return twist triggered', 'ok');
          }else{
            notify('Return twist system not available', 'warn');
          }
        }catch(e){ notify('Failed: '+e, 'warn'); }
      });
    }

    var btnSkipPhaseDbg = root.querySelector('#btnSkipPhaseDbg');
    if(btnSkipPhaseDbg){
      btnSkipPhaseDbg.addEventListener('click', function(){
        try{
          if(typeof global.skipPhase === 'function'){
            global.skipPhase();
            notify('Phase skipped', 'ok');
          }else{
            notify('Skip phase not available', 'warn');
          }
        }catch(e){ notify('Failed: '+e, 'warn'); }
      });
    }
  }


  // Integrations: make key settings take effect across UI without reload
  // - Top roster visibility toggle
  (function patchTopRosterVisibility(){
    var origRender = global.renderTopRoster;
    global.renderTopRoster = function(){
      var g = global.game || {};
      var cfg = g.cfg || ensureGameCfg();
      var host = document.getElementById('topRoster');
      if(cfg && cfg.showTopRoster === false){
        if(host) host.style.display = 'none';
        return;
      }
      if(host) host.style.display = '';
      if(typeof origRender === 'function') return origRender.apply(this, arguments);
    };
  })();

  // Initialize on load
  function init(){
    ensureGameCfg();
    ensureSettingsButton();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }

  // Expose manual API if needed
  global.openSettingsModal = openSettingsModal;
  global.closeSettingsModal = closeSettingsModal;

})(window);


(function(g){
  'use strict';

  function cfg(){ (g.game = g.game || {}).cfg = g.game.cfg || {}; return g.game.cfg; }

  function applyTvBg(url){
    const tv=document.getElementById('tv'); if(!tv) return;
    if(url && String(url).trim()){
      tv.style.setProperty('--tv-bg', `url("${url}")`);
      tv.classList.add('hasTvBg');
    }else{
      tv.style.removeProperty('--tv-bg');
      tv.classList.remove('hasTvBg');
    }
  }

  function ensureTimersGrid(){
    const pane=document.getElementById('tabTimers'); if(!pane) return;
    // If labels are not wrapped in .settingsGrid, wrap them
    let grid=pane.querySelector('.settingsGrid');
    if(!grid){
      grid=document.createElement('div'); grid.className='settingsGrid';
      // move all label elements into grid
      const labels=[...pane.querySelectorAll(':scope > label, :scope > .inline, :scope > .row')];
      labels.forEach(el=>grid.appendChild(el));
      pane.appendChild(grid);
    }
  }

  function ensurePlayersTotal(){
    const pane=document.getElementById('tabTimers'); if(!pane) return;
    let input=document.getElementById('numPlayers');
    if(!input){
      const label=document.createElement('label');
      label.innerHTML='Players total<input id="numPlayers" type="number" min="4" max="16" value="12"/>';
      (pane.querySelector('.settingsGrid') || pane).prepend(label);
      input=label.querySelector('#numPlayers');
    }
    // prefer cfg value, else current roster length
    const current = Number(cfg().numPlayers) || (Array.isArray(g.game?.players)? g.game.players.length : 12);
    input.value = String(Math.max(4, Math.min(16, current || 12)));
    input.addEventListener('change', ()=>{
      const v=Math.max(4, Math.min(16, Number(input.value)||12));
      cfg().numPlayers=v;
    });
  }

  function ensureTvBgSetting(){
    const pane=document.getElementById('tabTimers'); if(!pane) return;
    let input=document.getElementById('tvBgUrl');
    if(!input){
      const label=document.createElement('label');
      label.innerHTML='TV Background Image URL<input id="tvBgUrl" type="url" placeholder="https://...image.jpg"/>';
      (pane.querySelector('.settingsGrid') || pane).prepend(label);
      input=label.querySelector('#tvBgUrl');
    }
    const url = cfg().tvBgUrl || '';
    input.value = url;
    applyTvBg(url);
    input.addEventListener('change', ()=>{
      const v=String(input.value||'').trim();
      cfg().tvBgUrl=v;
      applyTvBg(v);
    });
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    try{
      ensureTimersGrid();
      ensurePlayersTotal();
      ensureTvBgSetting();
    }catch(e){ console.warn('[settings-enh] failed', e); }
  }, {once:true});

})(window);

(function(g){
  'use strict';

  function cfg(){ (g.game = g.game || {}).cfg = g.game.cfg || {}; return g.game.cfg; }

  function applyTvBg(url){
    const tv=document.getElementById('tv'); if(!tv) return;
    if(url && String(url).trim()){
      tv.style.setProperty('--tv-bg', `url("${url}")`);
      tv.classList.add('hasTvBg');
    }else{
      tv.style.removeProperty('--tv-bg');
      tv.classList.remove('hasTvBg');
    }
  }

  function wireSettings(){
    const pane=document.getElementById('tabTimers'); if(!pane) return;
    // TV background URL field
    const inp = document.getElementById('tvBgUrl');
    if(inp){
      inp.value = cfg().tvBgUrl || inp.value || '';
      applyTvBg(inp.value);
      inp.addEventListener('change', ()=>{
        const v=String(inp.value||'').trim();
        cfg().tvBgUrl=v;
        applyTvBg(v);
        try{ localStorage.setItem('bb_cfg_tvBgUrl', v); }catch{}
      });
    }
    // Players total
    const np=document.getElementById('numPlayers');
    if(np){
      const current = Number(cfg().numPlayers) || (Array.isArray(g.game?.players)? g.game.players.length : 12);
      np.value = String(Math.max(4, Math.min(16, current || 12)));
      np.addEventListener('change', ()=>{
        const v=Math.max(4, Math.min(16, Number(np.value)||12));
        cfg().numPlayers=v;
        try{ localStorage.setItem('bb_cfg_numPlayers', String(v)); }catch{}
      });
    }
    // Jury Return vote seconds
    const jr=document.getElementById('tJuryReturnVote');
    if(jr){
      const current = Number(cfg().tJuryReturnVote) || 12;
      jr.value = String(Math.max(8, Math.min(60, current)));
      jr.addEventListener('change', ()=>{
        const v=Math.max(8, Math.min(60, Number(jr.value)||12));
        cfg().tJuryReturnVote=v;
        try{ localStorage.setItem('bb_cfg_tJuryReturnVote', String(v)); }catch{}
      });
    }
  }

  document.addEventListener('DOMContentLoaded', ()=>{
    try{ wireSettings(); }catch(e){ console.warn('[ui.settings-enh] failed', e); }
    // Restore persisted tvBg to CSS var if present
    try{
      const saved=localStorage.getItem('bb_cfg_tvBgUrl');
      if(saved) applyTvBg(saved);
    }catch{}
  }, {once:true});

})(window);