(function(global){
  'use strict';

  // Social flavor & truthiness helper
  const SocialFlavor = {};

  // Compute a truthiness level ('true'|'partial'|'lie') based on context
  SocialFlavor.computeTruthiness = function(ctx) {
    // ctx: { actorId, targetId, actorTrust, actorRivalry, roleIncentive }
    const trust = (ctx.actorTrust ?? 0);
    const rivalry = (ctx.actorRivalry ?? 0);
    const role = (ctx.roleIncentive ?? 0);

    // Base probability of telling the truth
    let p = 0.5 + trust * 0.4 - rivalry * 0.25 + role * 0.1;
    p = Math.max(0.05, Math.min(0.95, p));

    const r = Math.random();
    if (r < p * 0.7) return 'true';        // mostly true
    if (r < p) return 'partial';          // some truth
    return 'lie';                         // deceptive
  };

  // Render a short human-friendly flavor line (suitable for Diary Room list)
  SocialFlavor.renderFlavorLine = function(info) {
    // info: { actorName, targetName, suggestedTarget, phase, truthiness }
    const actor = info.actorName || 'Someone';
    const target = info.targetName || 'someone';
    const suggested = info.suggestedTarget ? `to target ${info.suggestedTarget}` : '';

    const templates = [
      `${actor} slipped into a side room with ${target} and ${suggested}.`,
      `${actor} cornered ${target}, quietly suggesting ${suggested}.`,
      `${actor} pulled ${target} aside and floated a plan ${suggested}.`,
      `${actor} and ${target} had a hushed exchange ${suggested}.`
    ];

    const t = templates[Math.floor(Math.random() * templates.length)];
    const suffix = info.truthiness === 'true' ? '' : info.truthiness === 'partial' ? ' (details murky)' : ' (might be misdirection)';
    return `${t}${suffix}`;
  };

  // Render detailed content (what was actually said) - may be hidden until spend
  SocialFlavor.renderDetailed = function(info) {
    const actor = info.actorName || 'Someone';
    const target = info.targetName || 'someone';
    const suggested = info.suggestedTarget || 'a target';

    // variants for flavor
    const variants = [
      `${actor}: "We should push to get ${suggested} out next week. It makes sense if we swing votes."\n${target}: "I can be convinced, but I need something in return."`,
      `${actor}: "I really think ${suggested} is the person to go. They're loose in their alliances."\n${target}: "Hmm... interesting. I'll think on it."`,
      `${actor}: "What if we rallied votes against ${suggested}?"\n${target}: "That's risky, but could work."`
    ];

    return variants[Math.floor(Math.random() * variants.length)];
  };

  // Expose globally
  global.SocialFlavor = SocialFlavor;
  console.info('[social-flavor] loaded');
})(window);
