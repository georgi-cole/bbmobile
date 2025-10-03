// MODULE: cards-queue.js
// Per-phase CardQueue controller to prevent delayed cards after phase skip/timeout

(function(g){
  'use strict';

  const CardQueue = {
    currentPhaseId: null,
    pendingTimeouts: [],
    isActive: true
  };

  // Enqueue a card render function with delay
  function enqueue(renderFn, delay){
    if(!CardQueue.isActive) return null;
    
    const phaseId = CardQueue.currentPhaseId;
    const timeoutId = setTimeout(() => {
      // Only render if still in same phase
      if(CardQueue.currentPhaseId === phaseId && CardQueue.isActive){
        try {
          renderFn();
        } catch(e){
          console.error('[CardQueue] Render error:', e);
        }
      }
      // Remove from pending list
      const idx = CardQueue.pendingTimeouts.indexOf(timeoutId);
      if(idx >= 0) CardQueue.pendingTimeouts.splice(idx, 1);
    }, delay || 0);

    CardQueue.pendingTimeouts.push(timeoutId);
    return timeoutId;
  }

  // Cancel all pending timeouts
  function cancelAll(){
    CardQueue.pendingTimeouts.forEach(id => clearTimeout(id));
    CardQueue.pendingTimeouts = [];
  }

  // Attach to a specific phase
  function attachToPhase(phaseId){
    if(CardQueue.currentPhaseId !== phaseId){
      cancelAll();
      CardQueue.currentPhaseId = phaseId;
      CardQueue.isActive = true;
    }
  }

  // Deactivate queue (e.g., on skip or timeout)
  function deactivate(){
    CardQueue.isActive = false;
    cancelAll();
  }

  // Reactivate queue
  function activate(){
    CardQueue.isActive = true;
  }

  // Write decision to logs instead of showing card
  function logDecisionInsteadOfCard(title, message){
    try {
      if(typeof g.addLog === 'function'){
        g.addLog(`${title}: ${message}`, 'game');
      } else if(typeof g.appendLog === 'function'){
        g.appendLog('game', `${title}: ${message}`);
      }
    } catch(e){
      console.error('[CardQueue] Log error:', e);
    }
  }

  // Export API
  g.CardQueue = g.CardQueue || {};
  g.CardQueue.enqueue = enqueue;
  g.CardQueue.cancelAll = cancelAll;
  g.CardQueue.attachToPhase = attachToPhase;
  g.CardQueue.deactivate = deactivate;
  g.CardQueue.activate = activate;
  g.CardQueue.logDecisionInsteadOfCard = logDecisionInsteadOfCard;

})(window);
