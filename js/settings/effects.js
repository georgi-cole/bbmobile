// MODULE: settings/effects.js
// Centralized side effect handlers for config changes.
// These apply UI toggles and updates when settings change.

(function(global){
  'use strict';

  const COMPACT_STYLE_ID = 'settings_compact_mode_styles';
  const SETTINGS_OVERRIDE_FLAG = '__settingsRuntimeOverridesInstalled';

  function ensureRuntimeDefaults(){
    const Config = global.Config || {};
    if(Config.DEFAULT_CFG){
      if(Config.DEFAULT_CFG.compactMode === undefined) Config.DEFAULT_CFG.compactMode = false;
      if(Config.DEFAULT_CFG.compactRosterLayout === undefined) Config.DEFAULT_CFG.compactRosterLayout = 'standard';
      if(Config.DEFAULT_CFG.publicMode === undefined) Config.DEFAULT_CFG.publicMode = true;
      if(Config.DEFAULT_CFG.publicModeAdminOverride === undefined) Config.DEFAULT_CFG.publicModeAdminOverride = false;
      if(Config.DEFAULT_CFG.survivalMode === undefined) Config.DEFAULT_CFG.survivalMode = false;
    }

    const g = global.game = global.game || {};
    const cfg = g.cfg = g.cfg || {};
    let changed = false;
    if(cfg.compactMode === undefined){ cfg.compactMode = false; changed = true; }
    if(cfg.compactRosterLayout === undefined){ cfg.compactRosterLayout = 'standard'; changed = true; }
    if(cfg.publicMode === undefined){ cfg.publicMode = true; changed = true; }
    if(cfg.publicModeAdminOverride === undefined){ cfg.publicModeAdminOverride = false; changed = true; }
    if(cfg.survivalMode === undefined){ cfg.survivalMode = false; changed = true; }
    global.cfg = cfg;

    if(changed && Config.saveStoredCfg){
      try{ Config.saveStoredCfg(cfg); }catch(e){}
    }
  }

  function injectCompactStyles(){
    if(document.getElementById(COMPACT_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = COMPACT_STYLE_ID;
    style.textContent = [
      'body.compact-mode .mobile-roster-active-grid{--mobile-roster-cols:4;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:2px!important}',
      'body.compact-mode .mobile-roster-tile{max-width:96px;min-width:52px;padding:1px!important;border-radius:5px}',
      'body.compact-mode .mobile-roster-avatar-wrap,body.compact-mode .mobile-roster-avatar{border-radius:3px}',
      'body.compact-mode .mobile-roster-name{font-size:9px;min-height:12px;max-height:14px;padding:1px 2px 2px}',
      '.vip-badge{display:inline-flex;align-items:center;margin-left:6px;padding:1px 5px;border-radius:999px;background:linear-gradient(135deg,#f7d774,#b8872d);color:#18110a;font-size:.58rem;font-weight:800;letter-spacing:.4px;vertical-align:middle}',
      '.vip-locked-setting input[data-vip-locked="true"]{cursor:pointer}',
      '.vip-locked-setting .vip-note{display:block;margin-top:2px;font-size:.68rem;color:#f2c862}'
    ].join('\n');
    document.head.appendChild(style);
  }

  function applyCompactMode(value, cfg){
    injectCompactStyles();
    const enabled = !!value;
    try{
      document.body.classList.toggle('compact-mode', enabled);
      document.body.classList.toggle('compact-roster-4x4-smaller', enabled);
    }catch(e){
      console.warn('[effects] compactMode body class toggle failed', e);
    }

    if(cfg){
      cfg.compactRosterLayout = enabled ? '4x4-smaller' : 'standard';
    }

    try{
      global.MobileRoster?.refresh?.();
      global.updateHud?.();
    }catch(e){
      console.warn('[effects] compactMode refresh failed', e);
    }
  }

  function isVipOverrideAllowed(){
    const cfg = (global.game && global.game.cfg) || {};
    try{
      if(global.SettingsVisibilityFilter?.isDevUser?.()) return true;
    }catch(e){}
    return !!cfg.publicModeAdminOverride;
  }

  function promptVipSubscription(input){
    const cfg = (global.game && global.game.cfg) || {};
    input.checked = !!cfg.publicMode;

    const msg = 'Public Mode is a VIP setting.';
    if(typeof global.showConfirm === 'function'){
      global.showConfirm('Upgrade to VIP to change Public Mode.', {
        title: 'VIP Subscription',
        confirmText: 'View VIP',
        cancelText: 'Not now',
        tone: 'warn'
      }).catch(function(){});
    }else if(typeof alert === 'function'){
      alert(msg + ' Upgrade to VIP to change it.');
    }
  }

  function notify(msg, cls){
    try{ global.addLog?.(msg, cls || ''); }catch(e){ console.log('[settings/effects] ' + msg); }
  }

  function advanceSurvivalDay(){
    const game = global.game;
    if(!game){ notify('Game not started', 'warn'); return; }
    if(game.phase === 'lobby' || game.phase === 'finale'){
      notify('Cannot advance Survival from the current phase.', 'warn');
      return;
    }

    try{
      if(typeof global.proceedNextWeek === 'function'){
        global.proceedNextWeek();
        notify('Survival advanced to the next day.', 'ok');
        return;
      }

      game.week = (game.week || 1) + 1;
      game.nominees = [];
      game.vetoHolder = null;
      game.hohId = null;
      if(Array.isArray(game.players)){
        game.players.forEach(function(p){
          p.nominated = false;
          p.hoh = false;
          p.nominationState = 'none';
        });
      }
      global.tv?.say?.('Week ' + game.week + ' - Intermission');
      global.setPhase?.('intermission', 1, function(){ global.startHOH?.(); });
      global.updateHud?.();
      global.renderPanel?.();
      notify('Survival advanced to Week ' + game.week + '.', 'ok');
    }catch(err){
      notify('Failed to advance Survival: ' + err, 'warn');
    }
  }

  function appendFieldOnce(fields, key, field){
    if(!Array.isArray(fields)) return;
    if(fields.some(function(item){ return item && item.key === key; })) return;
    fields.push(field);
  }

  function removeFieldByKey(fields, key){
    if(!Array.isArray(fields)) return;
    for(let i = fields.length - 1; i >= 0; i--){
      if(fields[i] && fields[i].key === key) fields.splice(i, 1);
    }
  }

  function installRegistryOverrides(){
    const registry = global.SettingsRegistry && global.SettingsRegistry.TAB_REGISTRY;
    const helpers = global.SettingsRegistry && global.SettingsRegistry.helpers;
    if(!Array.isArray(registry) || !helpers) return false;

    const general = registry.find(function(tab){ return tab.id === 'general'; });
    const advanced = registry.find(function(tab){ return tab.id === 'advanced'; });
    const debug = registry.find(function(tab){ return tab.id === 'debug'; });

    if(general && Array.isArray(general.groups)){
      const interfaceGroup = general.groups.find(function(group){ return group.title === 'Interface'; });
      if(interfaceGroup){
        removeFieldByKey(interfaceGroup.fields, 'compactRosterLayout');
        appendFieldOnce(interfaceGroup.fields, 'compactMode', helpers.checkbox('compactMode', 'Compact Mode'));
        if(!interfaceGroup.fields.some(function(item){ return item && item.key === 'publicMode'; })){
          interfaceGroup.fields.push(helpers.html([
            '<label class="toggleRow vip-locked-setting">',
              '<span>Public Mode <span class="vip-badge">VIP</span><span class="vip-note">On by default for now.</span></span>',
              '<input type="checkbox" data-key="publicMode" data-vip-locked="true">',
            '</label>'
          ].join('')));
        }
      }
    }

    if(advanced && Array.isArray(advanced.groups)){
      const quickActions = advanced.groups.find(function(group){ return group.title === 'Quick Actions'; });
      if(quickActions && Array.isArray(quickActions.fields)){
        if(!quickActions.fields.some(function(item){ return item && item.content && item.content.indexOf('data-key="publicModeAdminOverride"') !== -1; })){
          quickActions.fields.push(helpers.html([
            '<label class="toggleRow">',
              '<span>Public Mode override</span>',
              '<input type="checkbox" data-key="publicModeAdminOverride">',
            '</label>',
            '<div class="tiny muted">Advanced-only override for the public build setting.</div>'
          ].join('')));
        }
      }
    }

    if(debug && Array.isArray(debug.groups)){
      const quick = debug.groups.find(function(group){ return group.title === 'Quick Actions'; });
      if(quick && Array.isArray(quick.fields) && !quick.fields.some(function(item){ return item && item.content && item.content.indexOf('btnAdvanceSurvivalDay') !== -1; })){
        quick.fields.push(helpers.html('<div class="row" style="gap:8px;flex-wrap:wrap;margin-top:8px"><button class="btn small" id="btnAdvanceSurvivalDay">Advance Survival Day ▶</button></div>'));
      }
    }

    return true;
  }

  function isSettingsButton(target){
    const btn = target && target.closest && target.closest('#btnOpenSettings,#btnSettings,#settingsBtn,#settings,button[data-action="settings"],button[data-open="settings"],.btn-settings,.settingsButton,button[title="Settings"]');
    return btn || null;
  }

  function installSettingsEntrypointRedirect(){
    if(global.SettingsRender && typeof global.SettingsRender.openSettingsModal === 'function'){
      global.openSettingsModal = global.SettingsRender.openSettingsModal;
      global.closeSettingsModal = global.SettingsRender.closeSettingsModal || global.closeSettingsModal;
      global.UI = global.UI || {};
      global.UI.openSettingsModal = global.SettingsRender.openSettingsModal;
      global.UI.initSettingsUI = function(){
        const btn = document.getElementById('btnOpenSettings') || document.getElementById('btnSettings') || document.getElementById('settingsBtn');
        if(btn) btn.__wired = true;
      };
      return true;
    }
    return false;
  }

  function installEventOverrides(){
    if(global[SETTINGS_OVERRIDE_FLAG]) return;
    global[SETTINGS_OVERRIDE_FLAG] = true;

    document.addEventListener('click', function(e){
      const btn = isSettingsButton(e.target);
      if(!btn) return;
      if(!installSettingsEntrypointRedirect()) return;
      e.preventDefault();
      e.stopPropagation();
      if(typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      global.SettingsRender.openSettingsModal();
    }, true);

    document.addEventListener('change', function(e){
      const input = e.target && e.target.closest && e.target.closest('input[data-vip-locked="true"]');
      if(!input) return;
      if(isVipOverrideAllowed()) return;
      e.preventDefault();
      e.stopPropagation();
      promptVipSubscription(input);
    }, true);

    document.addEventListener('click', function(e){
      const target = e.target;
      if(!target || !target.id) return;
      if(target.id === 'btnAdvanceSurvivalDay' || target.id === 'btnNextWeek'){
        e.preventDefault();
        e.stopPropagation();
        advanceSurvivalDay();
      }
    }, true);
  }

  function installRuntimeOverrides(){
    ensureRuntimeDefaults();
    injectCompactStyles();
    installEventOverrides();
    installSettingsEntrypointRedirect();
    if(installRegistryOverrides()){
      applyCompactMode(!!(global.game && global.game.cfg && global.game.cfg.compactMode), global.game && global.game.cfg);
      return;
    }
    setTimeout(installRuntimeOverrides, 50);
  }

  const EFFECT_HANDLERS = {
    colorblindMode: function(value, cfg){
      try{
        document.body.classList.toggle('cb', !!value);
      }catch(e){
        console.warn('[effects] colorblindMode toggle failed', e);
      }
    },
    showTopRoster: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] showTopRoster update failed', e);
      }
    },
    timerStyle: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] timerStyle update failed', e);
      }
    },
    enableJuryHouse: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] enableJuryHouse update failed', e);
      }
    },
    compactMode: applyCompactMode,
    compactRosterLayout: function(value, cfg){
      applyCompactMode(value === '4x4-smaller', cfg);
    },
    publicMode: function(value, cfg){
      if(cfg && cfg.publicModeAdminOverride){
        cfg.publicMode = !!value;
      }
      console.info('[effects] publicMode changed to:', !!value);
    },
    publicModeAdminOverride: function(value, cfg){
      console.info('[effects] publicModeAdminOverride changed to:', !!value);
    },
    survivalMode: function(value, cfg){
      console.info('[effects] survivalMode changed to:', !!value);
    },
    debugSocialHUD: function(value, cfg){
      try{
        if (global.SocialUIAdapter && typeof global.SocialUIAdapter.refreshHUD === 'function') {
          global.SocialUIAdapter.refreshHUD();
        }
      }catch(e){
        console.warn('[effects] debugSocialHUD refresh failed', e);
      }
    },
    advancedMode: function(value, cfg){
      console.info('[effects] advancedMode changed to:', value);
    }
  };

  function applyEffects(cfg, changedKeys){
    if(!cfg) return;
    const keys = changedKeys || Object.keys(EFFECT_HANDLERS);
    keys.forEach(function(key){
      const handler = EFFECT_HANDLERS[key];
      if(handler && cfg.hasOwnProperty(key)){
        try{
          handler(cfg[key], cfg);
        }catch(e){
          console.warn('[effects] Handler failed for key:', key, e);
        }
      }
    });
  }

  function applyAllEffects(cfg){
    applyEffects(cfg, Object.keys(EFFECT_HANDLERS));
    try{
      global.updateHud?.();
    }catch(e){
      console.warn('[effects] Global HUD update failed', e);
    }
  }

  const SettingsEffects = global.SettingsEffects = global.SettingsEffects || {};
  SettingsEffects.applyEffects = applyEffects;
  SettingsEffects.applyAllEffects = applyAllEffects;
  SettingsEffects.EFFECT_HANDLERS = EFFECT_HANDLERS;
  SettingsEffects.installRuntimeOverrides = installRuntimeOverrides;
  SettingsEffects.advanceSurvivalDay = advanceSurvivalDay;
  SettingsEffects.installSettingsEntrypointRedirect = installSettingsEntrypointRedirect;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installRuntimeOverrides);
  }else{
    installRuntimeOverrides();
  }

})(window);
