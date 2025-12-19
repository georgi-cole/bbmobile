(function(global){
  'use strict';

  // Listens to social.action:result and re-emits an enriched event including flavor + truthiness + spendPrompt
  function getBus(){ return global.game?.bus || null; }

  function handleRawEvent(ev){
    try{
      const d = ev.detail || {};
      // Avoid reprocessing enriched events
      if(d.__enriched) return;

      // Basic shape compatibility handling
      const actorId = d.actorId || d.actor || d.actor_id || (d.actor && d.actor.id) || null;
      const targetId = d.targetId || d.target || (d.target && d.target.id) || null;
      const actionId = d.actionId || d.action || d.actionType || null;

      // Build context for flavor/truthiness
      const ctx = {
        actorId,
        targetId,
        actorName: (global.safeName && actorId) ? global.safeName(actorId) : (d.actor && d.actor.name) || (`Player ${actorId}`),
        targetName: (global.safeName && targetId) ? global.safeName(targetId) : (d.target && d.target.name) || (`Player ${targetId}`),
        actorTrust: (d.actorTrust !== null && d.actorTrust !== undefined) ? d.actorTrust : 0,
        actorRivalry: (d.actorRivalry !== null && d.actorRivalry !== undefined) ? d.actorRivalry : 0,
        roleIncentive: (d.roleIncentive !== null && d.roleIncentive !== undefined) ? d.roleIncentive : 0
      };

      // Lookup registry outcome if available
      const reg = global.SocialActionsRegistry?.get(actionId);
      let outcome = null;
      if(reg && typeof reg.outcome === 'function'){
        outcome = reg.outcome({ actorId, targetId, actorName: ctx.actorName, targetName: ctx.targetName, hohTarget: d.hohTarget, hohName: d.hohName, pairAName: d.pairAName, pairBName: d.pairBName, suggestedTarget: d.suggestedTarget });
      }

      // Determine truthiness
      const truthiness = global.SocialFlavor ? global.SocialFlavor.computeTruthiness(ctx) : 'true';

      // Flavor line
      const flavorLine = global.SocialFlavor ? global.SocialFlavor.renderFlavorLine({ actorName: ctx.actorName, targetName: ctx.targetName, suggestedTarget: outcome?.suggestedTarget, phase: d.phase, truthiness }) : (d.narrative || d.outcome?.message || '');

      const detailed = outcome?.detailedText || d.detailedText || d.outcome?.message || '';

      const enriched = Object.assign({}, d, {
        __enriched: true,
        flavorText: flavorLine,
        detailedText: detailed,
        truthiness: truthiness,
        spendPrompt: (reg && reg.spendable) ? { cost: reg.cost, label: `Spend ${reg.cost} energy to reveal` } : null
      });

      // Re-emit on window and on game bus for compatibility
      try{
        window.dispatchEvent(new CustomEvent('social.action:result', { detail: enriched }));
      }catch(e){
        console.warn('[social-enricher] Failed to dispatch window event', e);
      }
      const bus = getBus();
      if(bus && typeof bus.emit === 'function'){
        try{
          bus.emit('social.action:result', enriched);
        }catch(e){
          console.warn('[social-enricher] Failed to emit bus event', e);
        }
      }

      // Also emit a direct diary-friendly event for immediate consumption
      try{
        const timestamp = Date.now();
        window.dispatchEvent(new CustomEvent('social.entry:story', { detail: {
          id: `story-${timestamp}-${Math.floor(Math.random()*10000)}-${Math.floor(Math.random()*10000)}`,
          timestamp: timestamp,
          type: 'social_action',
          category: 'social',
          severity: d.severity || 'neutral',
          title: `${ctx.actorName} → ${reg ? reg.label : (actionId||'action')}`,
          text: flavorLine,
          raw: enriched
        }}));
      }catch(e){
        console.warn('[social-enricher] Failed to dispatch diary event', e);
      }

    } catch(err){
      console.error('[social-enricher] error handling event', err);
    }
  }

  // Install listener
  (function install(){
    if(!global || !global.window) return;
    // Listen to both window and bus-emitted events to maximize compatibility
    window.addEventListener('social.action:result', handleRawEvent);
    const bus = getBus();
    if(bus && typeof bus.on === 'function'){
      try{
        bus.on('social.action:result', handleRawEvent);
      }catch(e){
        console.warn('[social-enricher] Failed to attach bus listener', e);
      }
    }
    console.info('[social-enricher] installed');
  })();

})(window);
