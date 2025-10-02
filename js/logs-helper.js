(function(){
  function appendLog(pane, text){
    const map = { all:'log', game:'logGame', social:'logSocial', vote:'logVote', jury:'logJury' };
    const id = map[pane] || 'log';
    const el = document.getElementById(id); if(!el) return;
    const div = document.createElement('div'); div.textContent = text; el.appendChild(div);
    if (pane !== 'all'){
      const all = document.getElementById('log');
      if (all){ const d2 = document.createElement('div'); d2.textContent = `[${pane.toUpperCase()}] ${text}`; all.appendChild(d2); }
    }
  }
  window.appendLog = window.appendLog || appendLog;

  function initLogTabs(){
    const tabs = document.querySelectorAll('#logTabs .tab-btn');
    const panes = document.querySelectorAll('#logPanes .log-pane');
    if (!tabs.length || !panes.length) return;
    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.logtab;
        tabs.forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        panes.forEach(p=> p.classList.toggle('active', p.dataset.pane === key));
      }, { passive:true });
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initLogTabs, { once:true });
  else initLogTabs();
})();