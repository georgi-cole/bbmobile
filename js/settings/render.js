// MODULE: settings/render.js
// Dynamic settings modal renderer using registry-driven UI generation.
// Consolidates modal creation, rendering, and event handling.

(function(global){
  'use strict';

  const Config = global.Config || {};
  const SettingsRegistry = global.SettingsRegistry || {};
  const SettingsEffects = global.SettingsEffects || {};
  const UI = global.UI || {};

  const FALLBACK_AVATAR = 'https://api.dicebear.com/6.x/bottts/svg?seed=Guest';
  const INJECTED_CSS_ID = 'ui_injected_styles_v2';

  // Inject CSS once
  function injectCssOnce(){
    if(document.getElementById(INJECTED_CSS_ID)) return;
    const style = document.createElement('style');
    style.id = INJECTED_CSS_ID;
    style.textContent = UI.INJECTED_CSS || '';
    document.head.appendChild(style);
  }

  // HTML escape utility
  function escapeHtml(s){
    return String(s).replace(/[&<>\"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c;
    });
  }

  // Render a group (card with title + fields)
  function renderGroup(group){
    const fields = (group.fields || []).map(renderField).join('');
    return [
      '<div class="card">',
        '<h3>' + escapeHtml(group.title) + '</h3>',
        '<div class="sep"></div>',
        fields,
      '</div>'
    ].join('');
  }

  // Render a field based on type
  function renderField(field){
    if(!field) return '';
    
    if(field.type === 'checkbox'){
      return [
        '<label class="toggleRow">',
          '<span>' + escapeHtml(field.label) + '</span>',
          '<input type="checkbox" data-key="' + field.key + '">',
        '</label>'
      ].join('');
    }
    
    if(field.type === 'number'){
      return [
        '<label class="toggleRow">',
          '<span>' + escapeHtml(field.label) + '</span>',
          '<input type="number" data-key="' + field.key + '" min="' + field.min + '" max="' + field.max + '" step="' + (field.step || 1) + '" style="width:100px">',
        '</label>'
      ].join('');
    }
    
    if(field.type === 'select'){
      const options = (field.options || []).map(function(opt){
        return '<option value="' + escapeHtml(opt.value) + '">' + escapeHtml(opt.label) + '</option>';
      }).join('');
      return [
        '<div class="toggleRow">',
          '<label>' + escapeHtml(field.label) + '</label>',
          '<select data-key="' + field.key + '">' + options + '</select>',
        '</div>'
      ].join('');
    }
    
    if(field.type === 'html'){
      return field.content || '';
    }
    
    return '';
  }

  // Render a tab pane from registry
  function renderTabPane(tab){
    const pane = document.createElement('div');
    pane.className = 'settingsTabPane';
    pane.setAttribute('data-pane', tab.id);
    
    if(tab.mount){
      // Custom mount - will be handled by mount hooks
      return pane;
    }
    
    // Standard rendering from groups
    const groups = (tab.groups || []).map(renderGroup).join('');
    pane.innerHTML = '<div class="settingsGrid">' + groups + '</div>';
    return pane;
  }

  // Build the complete settings modal
  function ensureSettingsModal(){
    let dim = document.getElementById('settingsBackdrop');
    if(dim) return dim;

    injectCssOnce();

    dim = document.createElement('div');
    dim.id = 'settingsBackdrop';
    dim.className = 'modal-backdrop';

    const modal = document.createElement('div');
    modal.className = 'modal';

    const closeX = document.createElement('button');
    closeX.className = 'closeX';
    closeX.textContent = '×';

    const h = document.createElement('h2');
    h.textContent = 'Settings';

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.className = 'tabBar';
    tabBar.id = 'settingsTabs';
    
    const registry = SettingsRegistry.TAB_REGISTRY || [];
    tabBar.innerHTML = registry.map(function(tab, idx){
      return '<button class="tab-btn' + (idx === 0 ? ' active' : '') + '" data-tab="' + tab.id + '">' + escapeHtml(tab.label) + '</button>';
    }).join('');

    // Panes container
    const panes = document.createElement('div');
    panes.id = 'settingsPanes';
    
    registry.forEach(function(tab, idx){
      const pane = renderTabPane(tab);
      if(idx === 0) pane.classList.add('active');
      panes.appendChild(pane);
      
      // Execute mount hooks for custom tabs (e.g., Cast)
      if(tab.mount && typeof window[tab.mount] === 'function'){
        try{
          window[tab.mount](pane, modal);
        }catch(e){
          console.warn('[settings/render] Mount hook failed:', tab.mount, e);
        }
      }
    });

    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'row between';
    actions.style.marginTop = '10px';
    
    const left = document.createElement('div');
    left.className = 'row';
    const right = document.createElement('div');
    right.className = 'row';

    const btnApply = document.createElement('button');
    btnApply.className = 'btn primary';
    btnApply.textContent = 'Apply';
    
    const btnSaveClose = document.createElement('button');
    btnSaveClose.className = 'btn';
    btnSaveClose.textContent = 'Save & Close';
    
    const btnCancel = document.createElement('button');
    btnCancel.className = 'btn danger';
    btnCancel.textContent = 'Cancel';

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
      const btn = e.target.closest('.tab-btn');
      if(!btn) return;
      const tabId = btn.getAttribute('data-tab');
      
      Array.prototype.forEach.call(tabBar.querySelectorAll('.tab-btn'), function(b){
        b.classList.toggle('active', b === btn);
      });
      
      Array.prototype.forEach.call(panes.querySelectorAll('.settingsTabPane'), function(p){
        p.classList.toggle('active', p.getAttribute('data-pane') === tabId);
      });
      
      // Special handling for Cast tab
      const activePane = panes.querySelector('.settingsTabPane.active');
      if(activePane && activePane.getAttribute('data-pane') === 'cast'){
        if(typeof global.initCastTab === 'function'){
          try{
            global.initCastTab(modal);
          }catch(e){
            console.warn(
              '[settings/render] initCastTab failed for modal:',
              {
                modalTag: modal && modal.tagName,
                modalClass: modal && modal.className,
                modalId: modal && modal.id
              },
              'Error:', e
            );
          }
        }
      }
      
      // Special handling for Debug tab - populate minigame dropdown
      if(activePane && activePane.getAttribute('data-pane') === 'debug'){
        if(typeof global.populateDebugMinigameDropdown === 'function'){
          try{
            global.populateDebugMinigameDropdown(modal);
          }catch(e){
            console.warn('[settings/render] populateDebugMinigameDropdown failed', e);
          }
        }
        // Wire the launch button
        wireDebugMinigameLauncher(modal);
      }
    });

    // Close handlers
    closeX.addEventListener('click', closeSettingsModal);
    btnCancel.addEventListener('click', closeSettingsModal);
    
    btnApply.addEventListener('click', function(){
      applySettings(modal);
      // Special handling for Cast tab
      const activePane = panes.querySelector('.settingsTabPane.active');
      if(activePane && activePane.getAttribute('data-pane') === 'cast'){
        if(typeof global.saveCurrentCastForm === 'function'){
          try{
            if(global.saveCurrentCastForm(modal)){
              if(typeof global.renderCastStrip === 'function') global.renderCastStrip(modal);
              if(typeof global.fillCastForm === 'function') global.fillCastForm(modal);
            }
          }catch(e){
            console.warn('[settings/render] Cast save failed', e);
          }
        }
      }
      notify('Settings applied', 'ok');
    });
    
    btnSaveClose.addEventListener('click', function(){
      applySettings(modal);
      // Special handling for Cast tab
      const activePane = panes.querySelector('.settingsTabPane.active');
      if(activePane && activePane.getAttribute('data-pane') === 'cast'){
        if(typeof global.saveCurrentCastForm === 'function'){
          try{
            global.saveCurrentCastForm(modal);
          }catch(e){
            console.warn('[settings/render] Cast save failed', e);
          }
        }
      }
      closeSettingsModal();
      notify('Settings saved', 'ok');
    });

    // Wire advanced actions (export, import, reset, etc.)
    wireAdvancedActions(modal);
    
    // Wire debug tab minigame launcher
    wireDebugMinigameLauncher(modal);

    return dim;
  }
  
  // Wire debug minigame launcher
  function wireDebugMinigameLauncher(modal){
    const btn = modal.querySelector('#btnLaunchMinigame');
    const select = modal.querySelector('#debugMinigameSelect');
    
    if(!btn || !select) return;
    
    // Disable button initially if no game selected
    btn.disabled = !select.value;
    
    // Enable/disable button based on selection
    select.addEventListener('change', function(){
      btn.disabled = !select.value;
    });
    
    // Launch minigame when button is clicked
    btn.addEventListener('click', function(){
      const gameKey = select.value;
      if(!gameKey){
        notify('Please select a minigame', 'warn');
        return;
      }
      
      // Close settings modal
      closeSettingsModal();
      
      // Launch minigame in debug mode
      if(global.CompetitionFlow && typeof global.CompetitionFlow.launchFullscreenMinigame === 'function'){
        console.info('[settings/render] Launching minigame in debug mode:', gameKey);
        
        global.CompetitionFlow.launchFullscreenMinigame(gameKey, function(score){
          console.info('[settings/render] Debug minigame completed with score:', score);
          notify('Debug minigame completed: ' + score.toFixed(1), 'ok');
        }, {
          timeLimit: 60,
          debugMode: true
        });
      } else {
        notify('CompetitionFlow not available', 'warn');
        console.warn('[settings/render] CompetitionFlow.launchFullscreenMinigame not available');
      }
    });
    
    console.info('[settings/render] Wired debug minigame launcher');
  }

  // Apply settings from modal form to config
  function applySettings(modal){
    const g = global.game = global.game || {};
    const cfg = g.cfg = Object.assign({}, Config.DEFAULT_CFG || {}, g.cfg || {});
    
    const changedKeys = [];
    Array.prototype.forEach.call(modal.querySelectorAll('[data-key]'), function(inp){
      const k = inp.getAttribute('data-key');
      const oldValue = cfg[k];
      let newValue;
      
      if(inp.type === 'checkbox'){
        newValue = !!inp.checked;
      }else if(inp.tagName.toLowerCase() === 'select'){
        newValue = inp.value;
      }else{
        const n = parseFloat(inp.value);
        newValue = isNaN(n) ? inp.value : n;
      }
      
      if(oldValue !== newValue){
        changedKeys.push(k);
      }
      cfg[k] = newValue;
    });

    // Persist to localStorage
    if(Config.saveStoredCfg) Config.saveStoredCfg(cfg);

    // Apply side effects for changed keys
    if(SettingsEffects.applyEffects) SettingsEffects.applyEffects(cfg, changedKeys);
    
    // Always trigger global HUD update
    try{
      global.updateHud?.();
    }catch(e){
      console.warn('[settings/render] updateHud failed', e);
    }
  }

  // Fill modal form with current config values
  function fillSettingsModal(modal, cfg){
    cfg = cfg || (global.game && global.game.cfg) || {};
    
    Array.prototype.forEach.call(modal.querySelectorAll('[data-key]'), function(inp){
      const k = inp.getAttribute('data-key');
      if(!cfg.hasOwnProperty(k)) return;
      
      if(inp.type === 'checkbox'){
        inp.checked = !!cfg[k];
      }else if(inp.tagName.toLowerCase() === 'select'){
        inp.value = cfg[k];
      }else{
        inp.value = cfg[k];
      }
    });
  }

  // Wire advanced action buttons (export, import, reset, etc.)
  function wireAdvancedActions(modal){
    modal.addEventListener('click', async function(e){
      const btn = e.target.closest('button[data-action]');
      if(!btn) return;
      
      const action = btn.getAttribute('data-action');
      
      if(action === 'export'){
        try{
          const cfg = (global.game && global.game.cfg) || {};
          const json = JSON.stringify(cfg, null, 2);
          const blob = new Blob([json], {type: 'application/json'});
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'bb-settings.json';
          a.click();
          URL.revokeObjectURL(a.href);
        }catch(err){
          alert('Export failed: ' + err);
        }
      }else if(action === 'import'){
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = function(){
          const file = input.files && input.files[0];
          if(!file) return;
          const fr = new FileReader();
          fr.onload = function(){
            try{
              const obj = JSON.parse(fr.result);
              const g = global.game = global.game || {};
              g.cfg = Object.assign({}, Config.DEFAULT_CFG || {}, g.cfg || {}, obj || {});
              if(Config.saveStoredCfg) Config.saveStoredCfg(g.cfg);
              fillSettingsModal(modal, g.cfg);
              if(SettingsEffects.applyAllEffects) SettingsEffects.applyAllEffects(g.cfg);
              notify('Settings imported', 'ok');
            }catch(err){
              alert('Import failed: ' + err);
            }
          };
          fr.readAsText(file);
        };
        input.click();
      }else if(action === 'reset-defaults'){
        if(!await window.showConfirm('Reset all settings to defaults?', {
          title: 'Reset Settings',
          tone: 'danger'
        })) return;
        
        const g = global.game = global.game || {};
        g.cfg = Object.assign({}, Config.DEFAULT_CFG || {});
        if(Config.saveStoredCfg) Config.saveStoredCfg(g.cfg);
        fillSettingsModal(modal, g.cfg);
        if(SettingsEffects.applyAllEffects) SettingsEffects.applyAllEffects(g.cfg);
        notify('Settings reset to defaults', 'ok');
      }else if(action === 'clear-storage'){
        if(!await window.showConfirm('Clear all saved settings?', {
          title: 'Clear Storage',
          tone: 'danger'
        })) return;
        
        try{
          localStorage.removeItem(Config.STORAGE_KEY || 'bb_cfg_v2');
          notify('Storage cleared', 'ok');
        }catch(err){
          alert('Clear failed: ' + err);
        }
      }else if(action === 'self-evict'){
        const sel = modal.querySelector('#qaSelfEvictSelect');
        const id = sel ? parseInt(sel.value, 10) : NaN;
        if(isNaN(id)) return;
        
        if(!await window.showConfirm('Self-evict this player?', {
          title: 'Confirm Self-Eviction',
          tone: 'warn'
        })) return;
        
        try{
          if(global.applySelfEviction) global.applySelfEviction(id);
          notify('Player self-evicted', 'warn');
        }catch(err){
          alert('Self-eviction failed: ' + err);
        }
      }
    });
  }

  // Open settings modal
  function openSettingsModal(){
    if(Config.ensureGameCfg) Config.ensureGameCfg();
    
    const dim = ensureSettingsModal();
    const modal = dim.querySelector('.modal');
    
    const cfg = (global.game && global.game.cfg) || {};
    fillSettingsModal(modal, cfg);
    
    // Wire theme selector if present
    const themeSelector = modal.querySelector('#themeSelector');
    if(themeSelector && typeof global.wireThemeSelector === 'function'){
      try{
        global.wireThemeSelector(modal);
      }catch(e){
        console.warn('[settings/render] wireThemeSelector failed', e);
      }
    }
    
    // Check if Cast tab is active and initialize
    const activePane = modal.querySelector('.settingsTabPane.active');
    if(activePane && activePane.getAttribute('data-pane') === 'cast'){
      if(typeof global.initCastTab === 'function'){
        try{
          global.initCastTab(modal);
        }catch(e){
          console.warn('[settings/render] initCastTab failed', e);
        }
      }
    }
    
    // Check if Debug tab is active and populate minigame dropdown
    if(activePane && activePane.getAttribute('data-pane') === 'debug'){
      if(typeof global.populateDebugMinigameDropdown === 'function'){
        try{
          global.populateDebugMinigameDropdown(modal);
        }catch(e){
          console.warn('[settings/render] populateDebugMinigameDropdown failed', e);
        }
      }
      // Wire the launch button
      wireDebugMinigameLauncher(modal);
    }
    
    dim.style.display = 'flex';
    
    // Focus first input
    setTimeout(function(){
      const target = modal.querySelector('.settingsTabPane.active #castName') || 
                     modal.querySelector('.settingsTabPane.active input, .settingsTabPane.active select');
      if(target){
        try{
          target.focus();
        }catch(e){}
      }
    }, 20);
  }

  // Close settings modal
  function closeSettingsModal(){
    const dim = document.getElementById('settingsBackdrop');
    if(dim) dim.style.display = 'none';
  }

  // Notification helper
  function notify(msg, cls){
    try{
      if(global.addLog) global.addLog(msg, cls || '');
    }catch(e){
      console.log('[settings/render] ' + msg);
    }
  }

  // Export to global namespace
  const SettingsRender = global.SettingsRender = global.SettingsRender || {};
  SettingsRender.openSettingsModal = openSettingsModal;
  SettingsRender.closeSettingsModal = closeSettingsModal;
  SettingsRender.ensureSettingsModal = ensureSettingsModal;
  SettingsRender.applySettings = applySettings;
  SettingsRender.fillSettingsModal = fillSettingsModal;

  // Make openSettingsModal available globally for convenience
  global.openSettingsModal = openSettingsModal;

  // Initialize settings button (find and wire the settings button)
  function initSettingsButton(){
    const settingsBtn = document.getElementById('btnOpenSettings');
    if(settingsBtn && !settingsBtn.__wired){
      settingsBtn.__wired = true;
      settingsBtn.addEventListener('click', openSettingsModal);
    }
  }

  // Auto-initialize on DOMContentLoaded
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', initSettingsButton);
  }else{
    initSettingsButton();
  }

})(window);
