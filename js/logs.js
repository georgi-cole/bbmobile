// MODULE: logs.js
// Centralized tab wiring for logs area with sessionStorage persistence

(function(g){
  'use strict';

  const STORAGE_KEY = 'bb_logs_active_tab';

  function initLogTabs(){
    const tabs = document.querySelectorAll('#logTabs .tab-btn');
    const panes = document.querySelectorAll('#logPanes .log-pane');
    
    if (!tabs.length || !panes.length) return;

    // Restore last active tab from sessionStorage
    let activeTab = 'all';
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) activeTab = stored;
    } catch(e) {}

    // Activate the stored tab
    selectTab(activeTab, tabs, panes);

    // Wire click handlers
    tabs.forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.logtab || btn.dataset.tab || 'all';
        selectTab(key, tabs, panes);
        
        // Persist selection
        try {
          sessionStorage.setItem(STORAGE_KEY, key);
        } catch(e) {}
      }, { passive: true });
    });
  }

  function selectTab(key, tabs, panes){
    tabs.forEach(btn => {
      const btnKey = btn.dataset.logtab || btn.dataset.tab || 'all';
      btn.classList.toggle('active', btnKey === key);
    });

    panes.forEach(pane => {
      const paneKey = pane.dataset.pane || 'all';
      const active = (paneKey === key);
      pane.classList.toggle('active', active);
      pane.style.display = active ? '' : 'none';
    });
  }

  // Initialize on DOMContentLoaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLogTabs, { once: true });
  } else {
    initLogTabs();
  }

  // Export for external use if needed
  g.initLogTabs = initLogTabs;

})(window);
