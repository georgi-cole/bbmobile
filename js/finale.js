// Finale cinematic: lights out, big winner name, rotating cup, and actions.
(function(g){
  'use strict';

  // REMOVED: Legacy finale overlay styles (.cinDim, .cinPanel, rotating cup) per requirements
  // The outro video is now the primary end sequence

  // REMOVED: Legacy overlay functions (computeStats, statsHtml, ensureOverlay) per requirements
  // These were part of the deprecated cinematic overlay with rotating cup

  function applyPreseedProfile(){
    try{
      const raw=localStorage.getItem('bb_human_profile'); if(!raw) return;
      const p=JSON.parse(raw||'{}'); if(!p || !p.name) return;
      const gme=g.game||{}; const humanId=gme.humanId; if(humanId==null) return;
      const me = g.getP?.(humanId); if(!me) return;
      me.name = p.name || me.name;
      me.age = p.age || me.age;
      me.location = p.location || me.location;
      me.occupation = p.occupation || me.occupation;
      g.updateHud?.();
    }catch{}
  }



  // REMOVED: showFinaleCinematic function per requirements
  // Legacy overlay with rotating cup and manual buttons removed
  // Outro video now plays directly after jury winner announcement
  function showFinaleCinematic(winnerId){
    console.warn('[finale] showFinaleCinematic is deprecated - legacy overlay removed per requirements');
    console.info('[finale] Use playOutroVideo() or startEndCreditsSequence() instead');
    // Persist winner ID for outro replay
    g.__lastWinnerId = winnerId;
  }

  // expose
  g.showFinaleCinematic = showFinaleCinematic;

  // apply preseed profile (after reload/new season)
  document.addEventListener('DOMContentLoaded',()=>{ applyPreseedProfile(); }, {once:true});

})(window);
