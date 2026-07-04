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
    }

    const g = global.game = global.game || {};
    const cfg = g.cfg = g.cfg || {};
    let changed = false;
    if(cfg.compactMode === undefined){ cfg.compactMode = false; changed = true; }
    if(cfg.compactRosterLayout === undefined){ cfg.compactRosterLayout = 'standard'; changed = true; }
    if(cfg.publicMode === undefined){ cfg.publicMode = true; changed = true; }
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
    return !!cfg.advancedMode;
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
        if(!quickActions.fields.some(function(item){ return item && item.content && item.content.indexOf('data-key="publicMode"') !== -1; })){
          quickActions.fields.push(helpers.html([
            '<label class="toggleRow">',
              '<span>Public Mode override</span>',
              '<input type="checkbox" data-key="publicMode">',
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

  function installEventOverrides(){
    if(global[SETTINGS_OVERRIDE_FLAG]) return;
    global[SETTINGS_OVERRIDE_FLAG] = true;

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
    if(installRegistryOverrides()){
      applyCompactMode(!!(global.game && global.game.cfg && global.game.cfg.compactMode), global.game && global.game.cfg);
      return;
    }
    setTimeout(installRuntimeOverrides, 50);
  }

  // Side effect map: key -> handler function
  const EFFECT_HANDLERS = {
    // Colorblind mode toggle
    colorblindMode: function(value, cfg){
      try{
        document.body.classList.toggle('cb', !!value);
      }catch(e){
        console.warn('[effects] colorblindMode toggle failed', e);
      }
    },
    
    // Top roster visibility
    showTopRoster: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] showTopRoster update failed', e);
      }
    },
    
    // Theme changes (handled by theme-switcher.js, but we can trigger HUD update)
    timerStyle: function(value, cfg){
      try{
        global.updateHud?.();
      }catch(e){
        console.warn('[effects] timerStyle update failed', e);
      }
    },
    
    // Jury house toggle
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
      console.info('[effects] publicMode changed to:', !!value);
    },
    
    // Social Spend Debug HUD toggle
    debugSocialHUD: function(value, cfg){
      try{
        if (global.SocialUIAdapter && typeof global.SocialUIAdapter.refreshHUD === 'function') {
          global.SocialUIAdapter.refreshHUD();
        }
      }catch(e){
        console.warn('[effects] debugSocialHUD refresh failed', e);
      }
    },
    
    // Advanced mode toggle - triggers settings modal rebuild when changed
    advancedMode: function(value, cfg){
      console.info('[effects] advancedMode changed to:', value);
      // The modal rebuild is handled in render.js applySettings
    }
  };

  // Apply side effects for changed config keys
  function applyEffects(cfg, changedKeys){
    if(!cfg) return;
    
    // If no specific keys provided, apply all effects
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

  // Apply all registered effects (useful for initial load)
  function applyAllEffects(cfg){
    applyEffects(cfg, Object.keys(EFFECT_HANDLERS));
    // Also trigger global HUD update
    try{
      global.updateHud?.();
    }catch(e){
      console.warn('[effects] Global HUD update failed', e);
    }
  }

  // Export to global namespace
  const SettingsEffects = global.SettingsEffects = global.SettingsEffects || {};
  SettingsEffects.applyEffects = applyEffects;
  SettingsEffects.applyAllEffects = applyAllEffects;
  SettingsEffects.EFFECT_HANDLERS = EFFECT_HANDLERS;
  SettingsEffects.installRuntimeOverrides = installRuntimeOverrides;
  SettingsEffects.advanceSurvivalDay = advanceSurvivalDay;

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', installRuntimeOverrides);
  }else{
    installRuntimeOverrides();
  }

})(window);
