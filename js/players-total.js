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