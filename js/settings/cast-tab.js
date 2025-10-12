// MODULE: settings/cast-tab.js
// Cast editor tab mount and functionality.
// Extracted from ui.config-and-settings.js to support registry-driven settings.

const { FALLBACK_AVATAR } = require('./constants');
(function(global){
  'use strict';
  const UI = global.UI || {};

  // Cast tab state management
  function castState(modal){
    modal.__cast = modal.__cast || {
      filter: 'all',
      order: [],
      idx: 0,
      dirty: false,
      pendingAvatarDataUrl: null
    };
    return modal.__cast;
  }

  // Get players by filter
  function playersByFilter(filter){
    const game = global.game || {};
    const arr = (game.players || []);
    if(filter === 'alive') return arr.filter(function(p){ return !p.evicted; });
    if(filter === 'evicted') return arr.filter(function(p){ return p.evicted; });
    return arr.slice();
  }

  // Generate badge HTML for player chip
  function chipBadgesHtml(p, game){
    const badges = [];
    if(p.hoh) badges.push('HOH');
    if(game && game.vetoHolder === p.id) badges.push('V');
    if(p.nominated && !p.evicted) badges.push('N');
    if(p.evicted) badges.push('E');
    if(!badges.length) return '';
    return '<div class="chip-badges">' + badges.map(function(b){
      return '<div class="chip-badge">' + b + '</div>';
    }).join('') + '</div>';
  }

  // Escape HTML utility
  function escapeHtml(s){
    if(UI.escapeHtml) return UI.escapeHtml(s);
    return String(s).replace(/[&<>\"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c] || c;
    });
  }

  // Render cast roster strip
  function renderCastStrip(modal){
    const state = castState(modal);
    const game = global.game || {};
    const strip = modal.querySelector('#castRosterStrip');
    if(!strip) return;
    
    const list = playersByFilter(state.filter);
    state.order = list.map(function(p){ return p.id; });
    if(state.idx >= state.order.length) state.idx = Math.max(0, state.order.length - 1);
    
    strip.innerHTML = '';
    list.forEach(function(p, i){
      const chip = document.createElement('div');
      chip.className = 'cast-chip' + (i === state.idx ? ' active' : '');
      chip.setAttribute('data-idx', String(i));
      chip.setAttribute('role', 'listitem');
      chip.setAttribute('tabindex', i === state.idx ? '0' : '-1');
      
      const imgSrc = (global.Game || global).resolveAvatar?.(p) || p.avatar || p.img || p.photo || 
                     'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(p.name || 'guest');
      const fallbackSrc = (global.Game || global).getAvatarFallback?.(p.name || 'guest') || 
                          'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(p.name || 'guest');
      
      chip.innerHTML = [
        '<div class="chip-ava">',
          '<img src="' + imgSrc + '" alt="' + escapeHtml(p.name || 'player') + '" onerror="this.onerror=null;this.src=\'' + fallbackSrc + '\'">',
          chipBadgesHtml(p, game),
        '</div>',
        '<div class="nm">' + escapeHtml(p.name || '') + '</div>'
      ].join('');
      
      const selectChip = async function(){
        if(!await maybeConfirmDiscard(modal)) return;
        state.idx = i;
        state.pendingAvatarDataUrl = null;
        state.dirty = false;
        renderCastStrip(modal);
        fillCastForm(modal);
        // Scroll active chip into view
        const activeChip = strip.querySelector('.cast-chip.active');
        if(activeChip) activeChip.scrollIntoView({behavior: 'smooth', block: 'nearest', inline: 'center'});
      };
      
      chip.addEventListener('click', selectChip);
      chip.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          selectChip();
        }
      });
      
      strip.appendChild(chip);
    });
    
    // Add keyboard navigation for roster strip
    strip.addEventListener('keydown', function(e){
      const activeChip = strip.querySelector('.cast-chip.active');
      if(!activeChip) return;
      
      if(e.key === 'ArrowLeft' || e.key === 'ArrowRight'){
        e.preventDefault();
        const direction = e.key === 'ArrowLeft' ? -1 : 1;
        const newIdx = Math.max(0, Math.min(state.order.length - 1, state.idx + direction));
        if(newIdx !== state.idx){
          state.idx = newIdx;
          renderCastStrip(modal);
          fillCastForm(modal);
          // Focus the new active chip
          const newActiveChip = strip.querySelector('.cast-chip.active');
          if(newActiveChip) newActiveChip.focus();
        }
      }
    });
    
    const prog = modal.querySelector('#castProgress');
    if(prog) prog.textContent = (state.order.length ? (state.idx + 1) : 0) + '/' + state.order.length;
  }

  // Get current player
  function currentPlayer(modal){
    const state = castState(modal);
    const game = global.game || {};
    const id = state.order[state.idx];
    return (game.players || []).find(function(p){ return p.id === id; }) || null;
  }

  // Fill cast form with current player data
  function fillCastForm(modal){
    const p = currentPlayer(modal);
    const preview = modal.querySelector('#castPreviewImg');
    const name = modal.querySelector('#castName');
    const age = modal.querySelector('#castAge');
    const sex = modal.querySelector('#castSex');
    const occ = modal.querySelector('#castOcc');
    const motto = modal.querySelector('#castMotto');

    if(preview){
      try{
        preview.onerror = function(){
          this.onerror = null;
          this.src = FALLBACK_AVATAR;
        };
      }catch(e){}
    }

    if(!p){
      if(preview) preview.src = FALLBACK_AVATAR;
      [name, age, sex, occ, motto].forEach(function(el){
        if(el){
          if(el.tagName === 'SELECT') el.value = '';
          else el.value = '';
        }
      });
      return;
    }
    
    const meta = p.meta || {};
    name.value = p.name || '';
    age.value = (meta.age != null) ? String(meta.age) : '';
    sex.value = meta.sex || '';
    occ.value = meta.occupation || '';
    motto.value = meta.motto || '';

    const imgSrc = (global.Game || global).resolveAvatar?.(p) || p.avatar || p.img || p.photo || 
                   'https://api.dicebear.com/6.x/bottts/svg?seed=' + encodeURIComponent(p.name || 'guest');
    if(preview) preview.src = imgSrc;

    castState(modal).dirty = false;
    castState(modal).pendingAvatarDataUrl = null;
  }

  // Mark form as dirty
  function markDirty(modal){
    castState(modal).dirty = true;
  }

  // Confirm discard if dirty
  async function maybeConfirmDiscard(modal){
    const st = castState(modal);
    if(!st.dirty) return true;
    return await global.showConfirm('You have unsaved changes. Discard them?', {
      title: 'Unsaved Changes',
      tone: 'warn'
    });
  }

  // Wire cast editor form
  function wireCastEditor(modal){
    const state = castState(modal);
    
    // Wire form fields
    ['#castName', '#castAge', '#castSex', '#castOcc', '#castMotto'].forEach(function(sel){
      const el = modal.querySelector(sel);
      if(!el) return;
      el.addEventListener('input', function(){ markDirty(modal); });
      if(el.tagName === 'SELECT'){
        el.addEventListener('change', function(){ markDirty(modal); });
      }
    });
    
    // Wire avatar upload (click image/overlay to trigger file picker)
    const file = modal.querySelector('#castPhotoFile');
    const avatarUpload = modal.querySelector('#castAvatarUpload');
    if(file && avatarUpload){
      avatarUpload.addEventListener('click', function(){ file.click(); });
      
      // Keyboard support for avatar upload button
      avatarUpload.addEventListener('keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          file.click();
        }
      });
      
      file.addEventListener('change', function(){
        const f = file.files && file.files[0];
        if(!f) return;
        const fr = new FileReader();
        fr.onload = function(){
          castState(modal).pendingAvatarDataUrl = String(fr.result || '');
          const prev = modal.querySelector('#castPreviewImg');
          if(prev) prev.src = castState(modal).pendingAvatarDataUrl || FALLBACK_AVATAR;
          markDirty(modal);
        };
        fr.readAsDataURL(f);
      });
    }
  }

  // Save current cast form
  function saveCurrentCastForm(modal){
    const p = currentPlayer(modal);
    if(!p) return false;
    
    const name = modal.querySelector('#castName').value.trim();
    const ageVal = modal.querySelector('#castAge').value.trim();
    const sex = modal.querySelector('#castSex').value;
    const occ = modal.querySelector('#castOcc').value.trim();
    const motto = modal.querySelector('#castMotto').value.trim();
    const upDataUrl = castState(modal).pendingAvatarDataUrl;

    if(!name){
      alert('Name is required.');
      return false;
    }

    p.name = name;
    p.meta = p.meta || {};
    const age = parseInt(ageVal, 10);
    if(!Number.isNaN(age)) p.meta.age = age;
    else delete p.meta.age;
    p.meta.sex = sex || '';
    if(occ) p.meta.occupation = occ;
    else delete p.meta.occupation;
    if(motto) p.meta.motto = motto;
    else delete p.meta.motto;

    if(upDataUrl){
      p.avatar = upDataUrl;
      p.img = upDataUrl;
      p.photo = upDataUrl;
    }

    try{
      global.updateHud?.();
    }catch(e){}
    try{
      global.saveGame?.();
    }catch(e){}
    
    castState(modal).dirty = false;
    castState(modal).pendingAvatarDataUrl = null;

    renderCastStrip(modal);
    return true;
  }

  // Build cast pane HTML
  function buildCastPaneHTML(){
    const fallback = FALLBACK_AVATAR;
    return [
      '<div class="settingsGrid">',
        '<div class="card">',
          '<h3>Cast Editor</h3>',
          '<div class="sep"></div>',
          '<div class="cast-wrap">',
            '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px;">',
              '<span class="tiny muted" id="castProgress" role="status" aria-live="polite">0/0</span>',
            '</div>',
            '<div class="cast-strip" id="castRosterStrip" role="list" aria-label="Cast roster" tabindex="0"></div>',
            '<div class="cast-editor">',
              '<div class="cast-preview">',
                '<div class="cast-avatar-upload" id="castAvatarUpload" style="position:relative;cursor:pointer;" role="button" aria-label="Upload avatar photo" tabindex="0">',
                  '<img id="castPreviewImg" src="' + fallback + '" alt="Cast member avatar preview">',
                  '<div class="cast-avatar-overlay" aria-hidden="true">',
                    '<svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
                      '<path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>',
                      '<circle cx="12" cy="13" r="4"></circle>',
                    '</svg>',
                  '</div>',
                '</div>',
                '<input type="file" id="castPhotoFile" accept="image/*" style="display:none" aria-label="Select avatar image file">',
              '</div>',
              '<div class="cast-form" role="form" aria-label="Cast member details">',
                '<label class="toggleRow">',
                  '<span>Name</span>',
                  '<input type="text" id="castName" aria-label="Cast member name" autocomplete="off" inputmode="text">',
                '</label>',
                '<label class="toggleRow cast-age-field">',
                  '<span>Age</span>',
                  '<input type="number" id="castAge" min="0" max="120" step="1" aria-label="Cast member age" inputmode="numeric">',
                '</label>',
                '<label class="toggleRow">',
                  '<span>Sex</span>',
                  '<select id="castSex" aria-label="Cast member sex">',
                    '<option value="">—</option>',
                    '<option>Male</option>',
                    '<option>Female</option>',
                    '<option>Other</option>',
                  '</select>',
                '</label>',
                '<label class="toggleRow full">',
                  '<span>Occupation</span>',
                  '<input type="text" id="castOcc" placeholder="e.g., Student, Engineer" aria-label="Cast member occupation" autocomplete="off" inputmode="text">',
                '</label>',
                '<label class="toggleRow full">',
                  '<span>Motto</span>',
                  '<input type="text" id="castMotto" placeholder="e.g., Play hard, win harder" aria-label="Cast member motto" autocomplete="off" inputmode="text">',
                '</label>',
              '</div>',
            '</div>',
          '</div>',
        '</div>',
      '</div>'
    ].join('');
  }

  // Mount Cast tab (called by registry)
  function mountCastTab(pane, modal){
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-label', 'Cast Editor');
    pane.innerHTML = buildCastPaneHTML();
  }

  // Initialize Cast tab (called when Cast tab becomes active)
  function initCastTab(modal){
    const pane = modal.querySelector('.settingsTabPane[data-pane="cast"]');
    if(!pane) return;
    
    if(!pane.__cast_initialized){
      pane.__cast_initialized = true;
      wireCastEditor(modal);
    }
    
    renderCastStrip(modal);
    fillCastForm(modal);
  }

  // Export to global namespace
  global.mountCastTab = mountCastTab;
  global.initCastTab = initCastTab;
  global.renderCastStrip = renderCastStrip;
  global.fillCastForm = fillCastForm;
  global.saveCurrentCastForm = saveCurrentCastForm;
  global.wireCastEditor = wireCastEditor;

})(window);
