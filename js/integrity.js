// MODULE: integrity.js
// Safe integrity/diagnostics (no crashing). Also ensures the right-sidebar Jury tab button is visible.

(function(){
  function escapeRegex(s){ return String(s).replace(/[.*+?^${}()|[\\]\]/g,'\\$&'); }
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

  function wireSideTabs(){
    const bar = document.querySelector('#sideCard .tabBar');
    if(!bar || bar.dataset.wired) return;
    bar.dataset.wired = '1';
    bar.addEventListener('click', (e)=>{
      const btn = e.target.closest('.tab-btn'); if(!btn) return;
      const targetId = btn.dataset.tab; if(!targetId) return;

      const host = document.getElementById('sideCard') || document;
      // Consider any pane-like element; add classes/ids as needed for your layout
      const panes = host.querySelectorAll('[id$="Panel"], .sidePane, .settingsTabPane, [role="tabpanel"]');
      panes.forEach(p => { p.style.display = (p.id === targetId) ? 'block' : 'none'; });

      bar.querySelectorAll('.tab-btn').forEach(b=>b.classList.toggle('active', b===btn));
    });
  }

  function init(){
    try{
      ensureRevealAPI();        // <- new: prevent "showCard is not a function" crashes
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
