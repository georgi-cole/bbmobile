(function(global){
  'use strict';
  // Gate adapter installation to avoid accidental production behavior
  const cfg = global.game?.cfg || {};
  if (!(cfg.debugSocialAI || cfg.aiSocialEmitDrEvents)) {
    console.info('[sm-to-dr-adapter] Skipped (gate=false)');
    return;
  }

  if (global.__smToDrAdapterInstalled) return;
  global.__smToDrAdapterInstalled = true;

  function safeName(id){
    return global.safeName?.(id) || (global.game?.players?.find(p=>p.id===id)?.name) || `Player ${id}`;
  }

  window.addEventListener('sm-ai-interaction', e => {
    try {
      const d = e.detail || {};
      const actorId = d.actorId;
      const actor = { id: actorId, name: safeName(actorId) };

      const primaryTargetId = (d.targetIds && d.targetIds.length) ? d.targetIds[0] : null;
      const target = primaryTargetId ? { id: primaryTargetId, name: safeName(primaryTargetId) } : null;

      const payload = {
        actor,
        target,
        action: d.actionId,
        success: !!d.success,
        magnitude: (d.outcome && d.outcome.magnitude) || 0,
        successProb: d.successProb ?? null,
        bondBefore: null,
        bondAfter: null,
        ts: Date.now(),
        raw: d
      };

      window.dispatchEvent(new CustomEvent('social.action:result', { detail: payload }));

      if (d.pairwise && typeof d.pairwise === 'object') {
        Object.entries(d.pairwise).forEach(([tid, delta]) => {
          const targetId = Number(tid);
          // Skip invalid IDs
          if (isNaN(targetId)) return;
          
          const to = { id: targetId, name: safeName(targetId) };
          const bondPayload = {
            from: actor,
            to,
            delta: (delta && delta.affinity) || 0,
            action: d.actionId,
            ts: Date.now()
          };
          window.dispatchEvent(new CustomEvent('bond.shift', { detail: bondPayload }));
        });
      }
    } catch (err) {
      console.warn('[sm-to-dr-adapter] adapter error', err);
    }
  });

  console.info('[sm-to-dr-adapter] Installed: re-emits sm-ai-interaction -> social.action:result + bond.shift');
})(window);
