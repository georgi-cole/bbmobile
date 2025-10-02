// MODULE: integrity.js
// Safe integrity/diagnostics (no crashing). Also ensures the right-sidebar Jury tab button is visible.

(function(){
  function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'); }
  if(!window.escapeRegex) window.escapeRegex = escapeRegex;

  // Ensure reveal API exists even if ui.js hasn't finished wiring yet.
  function ensureRevealAPI(){
    if(typeof window.showCard !== 'function'){ 
      console.warn('[BB Modular] showCard missing — installing safe stub. Cards will render as simple text until UI initializes.');
      window.showCard = function(title, lines, tone, dur, uniform){
        try{
          const tvNow = document.getElementById('tvNow');
          if(tvNow){
            const parts = [];
            if(title) parts.push(String(title));
            if(Array.isArray(lines) && lines.length) parts.push(lines.map(String).join(' — '));
            tvNow.textContent = parts.length ? parts.join(' — ') : '(update)';
          }
        }catch(e){}
      };
    }
    if(typeof window.cardQueueWaitIdle !== 'function'){ 
      // Provide a no-op wait so callers using await don't crash
      window.cardQueueWaitIdle = function(){ return Promise.resolve(); };
    }
  }

  const mods = {
    state: !!window.game,
    audio: !!window.phaseMusic,
    ui: !!window.updateHud,
    social: !!window.renderSocialPhase,
    minigames: !!window.renderMinigame,
    competitions: !!window.startHOH,
    nominations: !!window.startNominations,
    veto: !!window.startVetoCeremony,
    eviction: !!window.startLiveVote,
    jury: !!window.startJuryVote,
    bootstrap: !!window.startOpeningSequence
  };
  console.info('[BB Modular] Loaded modules:', mods);

  function syncJuryTabButton(){
    const btn = document.getElementById('juryHouseTabBtn');
    if(!btn) return;
    const enabled = window.game?.cfg?.enableJuryHouse !== false;
    btn.style.display = enabled ? '' : 'none';
  }

  // Safer side tabs: pane-switching when panes exist, otherwise emit a filter event (logs stay visible)
  function wireSideTabs(){
    const bar = document.querySelector('#sideCard .tabBar');
    if(!bar || bar.dataset.wired) return;
    bar.dataset.wired = '1';

    // Optional: data-scope selector to limit pane switching to a container
    const scopeSel = bar.getAttribute('data-scope');
    const contentScope = scopeSel ? document.querySelector(scopeSel) : bar.closest('.card');

    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-btn'); if(!btn) return;

      const rawText = (btn.textContent||'').trim().toLowerCase();
      const targetId  = btn.dataset.tab || '';
      const filterKey = (btn.dataset.filter || rawText).replace(/[^a-z]/g,''); // 'all','game','social','vote','jury'

      // Pane mode: only if panes exist and match
      let didPaneSwitch = false;
      if (contentScope && targetId) {
        const panes = contentScope.querySelectorAll('[data-tab-pane], .sidePane, [role="tabpanel"], [id$="Panel"]');
        const anyMatch = Array.from(panes).some(p => p.id === targetId || p.getAttribute('data-tab-pane') === targetId);
        if (panes.length && anyMatch) {
          panes.forEach(p=>{
            const pid = p.id || p.getAttribute('data-tab-pane') || '';
            p.style.display = (pid === targetId) ? 'block' : 'none';
          });
          didPaneSwitch = true;
        }
      }

      // Filter mode for Logs: never hide the host, just filter items
      if (!didPaneSwitch && filterKey) {
        try { window.dispatchEvent(new CustomEvent('bb:logs:filter', { detail: { kind: filterKey } })); } catch {}
      }

      bar.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === btn));
    });
  }

  // Default filter listener (safe no-op if app already implements its own)
  (function ensureLogFilterListener(){
    if (window.__bbLogsFilterWired) return;
    window.__bbLogsFilterWired = true;

    window.addEventListener('bb:logs:filter', (ev)=>{
      const kind = (ev.detail?.kind || 'all').toLowerCase();
      const host = document.getElementById('log') || document.getElementById('logAll') || document.getElementById('logList');
      if (!host) return;

      const items = host.querySelectorAll('.logItem, li, div');
      items.forEach(el=>{
        const k = (el.getAttribute('data-k') || '').toLowerCase();
        const txt = (el.textContent || '').toLowerCase();
        const belongs =
          kind === 'all' ||
          k === kind ||
          (kind === 'game'   && txt.includes('game')) ||
          (kind === 'social' && txt.includes('social')) ||
          (kind === 'vote'   && txt.includes('vote')) ||
          (kind === 'jury'   && txt.includes('jury'));
        el.style.display = belongs ? '' : 'none';
      });
    });
  })();

  function init(){
    try{
      ensureRevealAPI();
      wireSideTabs();
      syncJuryTabButton();
    }catch(e){ console.warn('[BB Modular] Integrity init warn:', e); }
  }

  if(document.readyState==='loading'){ 
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else {
    init();
  }
})();

(function(){
  if(window.__integrityPhase1) return;
  window.__integrityPhase1=true;
  function dispatch(n,d){ try{ window.dispatchEvent(new CustomEvent(n,{detail:d})); }catch{} }
  setTimeout(()=>{
    const dup={
      evictionV2Shim:!!window.__evictionV2Shim,
      juryReturnVoteShim:!!window.__legacyJuryReturnVoteShim,
      juryReturnShim:!!window.__legacyJuryReturnShim,
      twistsUnified:!!window.__twistsUnifiedPhase1
    };
    console.info('[Integrity] diagnostics',dup);
    dispatch('bb:integrity:ready',dup);
  },1500);
})();
