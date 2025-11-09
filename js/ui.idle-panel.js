// MODULE: ui.idle-panel.js
// Idle Engagement Panel - shows actions for human player when ineligible for competition
// Applies only to hoh, veto_comp, veto phases when human cannot participate
// Provides "Use Social" and "Skip Waiting" options with telemetry tracking

(function(global){
  'use strict';

  /**
   * Emit telemetry event for idle panel interactions
   * @param {string} name - Event name
   * @param {Object} payload - Event payload
   */
  function emitTelemetry(name, payload){
    if(typeof global.trackEvent === 'function'){
      try {
        global.trackEvent(name, payload);
      } catch(e){
        // Silently fail
      }
      return;
    }
    // Fallback: buffer to game.__telemetry
    const g = global.game || {};
    g.__telemetry = g.__telemetry || [];
    g.__telemetry.push({
      t: Date.now(),
      name: name,
      payload: payload
    });
  }

  /**
   * Check if human player is eligible for current phase
   * @returns {boolean} - True if human can participate, false if idle
   */
  function isHumanEligibleForCurrentPhase(){
    const g = global.game;
    if(!g) return true;

    const phase = g.phase;
    const humanId = g.humanId;
    
    // Only check eligibility for competition phases
    if(phase !== 'hoh' && phase !== 'veto_comp' && phase !== 'veto'){
      return true;
    }

    // Get human player
    let you = null;
    if(typeof global.getP === 'function'){
      you = global.getP(humanId);
    }
    if(!you && Array.isArray(g.players)){
      you = g.players.find(function(p){ return p && p.id === humanId; });
    }
    if(!you || you.evicted){
      return true; // Not playing or evicted, don't show idle panel
    }

    // HOH eligibility check
    if(phase === 'hoh'){
      // Use existing isHumanEligible if available
      if(typeof global.isHumanEligible === 'function'){
        try {
          return global.isHumanEligible('hoh');
        } catch(e){
          // Fall through to manual check
        }
      }
      
      // Fallback logic: week > 1 and lastHOHId === humanId and alive.length != 4
      if(g.week <= 1) return true;
      
      let alive = [];
      if(typeof global.alivePlayers === 'function'){
        try {
          alive = global.alivePlayers();
        } catch(e){
          alive = (g.players || []).filter(function(p){ return p && !p.evicted; });
        }
      } else {
        alive = (g.players || []).filter(function(p){ return p && !p.evicted; });
      }
      
      const isF4 = alive.length === 4;
      if(isF4) return true; // Everyone eligible at F4
      
      return g.lastHOHId !== humanId;
    }

    // Veto eligibility check
    if(phase === 'veto_comp' || phase === 'veto'){
      // Check if human is in __vetoPlayers array
      if(Array.isArray(g.__vetoPlayers)){
        return g.__vetoPlayers.indexOf(humanId) !== -1;
      }
      // If __vetoPlayers not set, assume eligible (conservative approach)
      return true;
    }

    return true;
  }

  /**
   * Check if idle panel should be shown
   * @returns {boolean}
   */
  function shouldShowIdlePanel(){
    const g = global.game;
    if(!g || !g.cfg) return false;
    
    // Check feature flag
    if(!g.cfg.IdlePhases) return false;
    
    const phase = g.phase;
    
    // Only show for specific competition phases
    if(phase !== 'hoh' && phase !== 'veto_comp' && phase !== 'veto'){
      return false;
    }

    // Check if already rendered for this phase
    if(g.__idlePanelRenderedFor === phase){
      return false;
    }

    // Check if human is ineligible
    return !isHumanEligibleForCurrentPhase();
  }

  /**
   * Render the idle engagement panel
   * @param {HTMLElement} panelEl - The panel element to render into
   * @returns {boolean} - True if panel was rendered, false otherwise
   */
  function renderIdlePanel(panelEl){
    if(!panelEl) return false;
    if(!shouldShowIdlePanel()) return false;

    const g = global.game;
    const phase = g.phase;
    const week = g.week || 1;

    // Mark as rendered for this phase
    g.__idlePanelRenderedFor = phase;

    // Build panel HTML
    let html = '<div class="idle-panel" style="text-align:center; padding:20px;">';
    html += '<h3 style="margin-bottom:20px; color:#999;">You\'re not playing this round</h3>';
    html += '<div style="display:flex; flex-direction:column; gap:12px; max-width:300px; margin:0 auto;">';
    html += '<button id="idleUseSocial" class="btn" style="padding:12px 24px;">Use Social</button>';
    html += '<button id="idleSkipWaiting" class="btn" style="padding:12px 24px;">Skip Waiting</button>';
    html += '</div>';
    html += '</div>';

    panelEl.innerHTML = html;

    // Emit telemetry
    emitTelemetry('idle:panel:shown', { phase: phase, week: week });

    // Wire up buttons
    const useSocialBtn = document.getElementById('idleUseSocial');
    const skipWaitingBtn = document.getElementById('idleSkipWaiting');

    if(useSocialBtn){
      useSocialBtn.addEventListener('click', function(){
        emitTelemetry('idle:action:social', { phase: phase, week: week });
        
        // Call startSocial if available
        if(typeof global.startSocial === 'function'){
          try {
            global.startSocial('idle');
          } catch(e){
            console.warn('[idle-panel] startSocial failed:', e);
          }
        } else {
          // No social module available - show feedback
          panelEl.innerHTML = '<div class="tiny muted" style="text-align:center; padding:20px;">Social interactions not available</div>';
        }
      });
    }

    if(skipWaitingBtn){
      skipWaitingBtn.addEventListener('click', function(){
        emitTelemetry('idle:action:skip', { phase: phase, week: week });
        
        // Replace panel with waiting message
        panelEl.innerHTML = '<div class="tiny muted" style="text-align:center; padding:20px;">Awaiting results…</div>';
      });
    }

    return true;
  }

  // Export to global
  global.renderIdlePanel = renderIdlePanel;

})(window);
