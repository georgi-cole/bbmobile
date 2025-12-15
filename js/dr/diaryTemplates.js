// MODULE: diaryTemplates.js
// Templates and helpers for generating humanized Diary Room entries

(function(global) {
  'use strict';

  const DiaryTemplates = {};

  // ============================================================================
  // SOCIAL ACTION TEMPLATES
  // ============================================================================
  
  const SOCIAL_TEMPLATES = {
    compliment: [
      '{actor} complimented {target} on their game play.',
      '{actor} gave {target} genuine praise.',
      '{actor} boosted {target}\'s confidence with kind words.',
      '{actor} told {target} they\'re doing great in the house.',
      '{actor} admired {target}\'s strategic moves.',
      '{actor} praised {target}\'s social game.',
      '{actor} acknowledged {target}\'s competition skills.',
      '{actor} expressed respect for {target}\'s gameplay.'
    ],
    flirt: [
      '{actor} flirted with {target}.',
      '{actor} made a move on {target}.',
      '{actor} turned on the charm with {target}.',
      '{actor} playfully engaged {target}.',
      '{actor} gave {target} a flirtatious look.',
      '{actor} and {target} shared a romantic moment.',
      '{actor} tried to win over {target}\'s heart.',
      'Sparks flew as {actor} chatted with {target}.'
    ],
    gossip: [
      '{actor} gossiped about other houseguests with {target}.',
      '{actor} shared house rumors with {target}.',
      '{actor} dished dirt with {target}.',
      '{actor} talked strategy and drama with {target}.',
      '{actor} whispered secrets to {target}.',
      '{actor} spilled tea with {target} about the house dynamics.',
      '{actor} revealed juicy information to {target}.',
      '{actor} and {target} discussed everyone else in the house.'
    ],
    bribe: [
      '{actor} offered {target} a deal.',
      '{actor} tried to influence {target} with promises.',
      '{actor} made {target} an offer they couldn\'t refuse.',
      '{actor} sweetened the pot for {target}.',
      '{actor} pitched a game-changing proposal to {target}.',
      '{actor} tried to secure {target}\'s vote with incentives.'
    ],
    lie: [
      '{actor} lied to {target}.',
      '{actor} bent the truth with {target}.',
      '{actor} fed {target} a false narrative.',
      '{actor} manipulated {target} with deception.',
      '{actor} told {target} a bold-faced lie.',
      '{actor} misled {target} about their intentions.',
      '{actor} spun a deceptive story for {target}.'
    ],
    insult: [
      '{actor} insulted {target}.',
      '{actor} threw shade at {target}.',
      '{actor} made {target} feel small.',
      '{actor} attacked {target}\'s character.',
      '{actor} criticized {target} harshly.',
      '{actor} disrespected {target} openly.',
      'Tensions rose as {actor} confronted {target}.'
    ],
    backstab: [
      '{actor} backstabbed {target}.',
      '{actor} betrayed {target}\'s trust.',
      '{actor} turned on {target}.',
      '{actor} threw {target} under the bus.',
      '{actor} broke their alliance with {target}.',
      '{actor} double-crossed {target} in a shocking move.',
      'Trust shattered as {actor} betrayed {target}.'
    ],
    strategize: [
      '{actor} strategized with {target}.',
      '{actor} planned game moves with {target}.',
      '{actor} formed an alliance with {target}.',
      '{actor} discussed tactics with {target}.',
      '{actor} and {target} plotted their next move.',
      '{actor} solidified their partnership with {target}.',
      '{actor} coordinated strategy with {target}.',
      '{actor} and {target} forged a secret alliance.'
    ],
    comfort: [
      '{actor} comforted {target}.',
      '{actor} supported {target} emotionally.',
      '{actor} was there for {target}.',
      '{actor} helped {target} through a tough time.',
      '{actor} offered a shoulder to {target}.',
      '{actor} consoled {target} after a difficult day.',
      '{actor} provided emotional support to {target}.'
    ],
    interrogate: [
      '{actor} interrogated {target}.',
      '{actor} pressed {target} for information.',
      '{actor} grilled {target} about their game.',
      '{actor} tried to get intel from {target}.',
      '{actor} questioned {target}\'s loyalty.',
      '{actor} demanded answers from {target}.',
      '{actor} investigated {target}\'s true intentions.'
    ],
    // Additional action types for more variety
    small_talk: [
      '{actor} had a casual chat with {target}.',
      '{actor} made small talk with {target}.',
      '{actor} caught up with {target}.',
      '{actor} and {target} bonded over shared interests.'
    ],
    confide: [
      '{actor} confided in {target}.',
      '{actor} shared personal thoughts with {target}.',
      '{actor} opened up to {target}.',
      '{actor} trusted {target} with a secret.'
    ],
    form_alliance: [
      '{actor} proposed an alliance to {target}.',
      '{actor} and {target} joined forces.',
      '{actor} formed a strong bond with {target}.',
      'A powerful alliance formed between {actor} and {target}.'
    ],
    group_hangout: [
      '{actor} organized a group hangout with {target} and others.',
      '{actor} brought {target} into a larger conversation.',
      '{actor} and {target} socialized with the group.',
      'The house came together as {actor} and {target} mingled.'
    ],
    spread_rumor: [
      '{actor} spread a rumor about {target}.',
      '{actor} talked behind {target}\'s back.',
      '{actor} tried to damage {target}\'s reputation.',
      '{actor} planted seeds of doubt about {target}.'
    ],
    confront: [
      '{actor} confronted {target} directly.',
      '{actor} called out {target}.',
      'Tensions exploded as {actor} faced off with {target}.',
      '{actor} challenged {target} about their behavior.'
    ],
    mediate: [
      '{actor} mediated between {target} and others.',
      '{actor} tried to smooth things over with {target}.',
      '{actor} played peacemaker with {target}.',
      '{actor} helped resolve conflict involving {target}.'
    ],
    observe: [
      '{actor} quietly observed {target}.',
      '{actor} studied {target}\'s behavior.',
      '{actor} gathered intel on {target}.',
      '{actor} kept a close eye on {target}.'
    ],
    // Generic fallback
    generic: [
      '{actor} interacted with {target}.',
      '{actor} had a conversation with {target}.',
      '{actor} engaged with {target}.',
      '{actor} spent time with {target}.'
    ]
  };

  // ============================================================================
  // SOCIAL SUMMARY TEMPLATES
  // ============================================================================
  
  const SOCIAL_SUMMARY_TEMPLATES = [
    'Social phase complete. {actor} made {count} move(s) this week.',
    '{actor} wrapped up the social phase with {count} interaction(s).',
    'Week {week}: {actor} navigated {count} social situation(s).',
    '{actor} finished this week\'s social game with {count} action(s).'
  ];
  
  // ============================================================================
  // RELATIONSHIP HIGHLIGHT TEMPLATES
  // ============================================================================
  
  const RELATIONSHIP_TEMPLATES = {
    alliance_formed: [
      '🤝 A strong alliance has formed between {player1} and {player2}.',
      '🤝 {player1} and {player2} have joined forces.',
      '🤝 New alliance alert: {player1} and {player2} are working together.',
      '🤝 {player1} and {player2} solidified their partnership this week.'
    ],
    alliance_strengthened: [
      '💪 The alliance between {player1} and {player2} grew stronger.',
      '💪 {player1} and {player2}\'s bond deepened.',
      '💪 {player1} and {player2} are now closer than ever.',
      '💪 Trust levels increased between {player1} and {player2}.'
    ],
    romance_developing: [
      '💕 Romance is brewing between {player1} and {player2}.',
      '💕 {player1} and {player2} are getting flirty.',
      '💕 Sparks are flying between {player1} and {player2}.',
      '💕 Could there be a showmance? {player1} and {player2} are very close.'
    ],
    romance_blossomed: [
      '💖 {player1} and {player2} have formed a strong romantic connection.',
      '💖 Love is in the air! {player1} and {player2} are now a couple.',
      '💖 Showmance confirmed: {player1} and {player2}.',
      '💖 {player1} and {player2}\'s romance has blossomed.'
    ],
    rivalry_formed: [
      '⚔️ A rivalry has formed between {player1} and {player2}.',
      '⚔️ {player1} and {player2} are now enemies.',
      '⚔️ Tension alert: {player1} and {player2} are at odds.',
      '⚔️ {player1} and {player2} clashed this week.'
    ],
    rivalry_intensified: [
      '🔥 The feud between {player1} and {player2} intensified.',
      '🔥 {player1} and {player2}\'s rivalry reached new heights.',
      '🔥 Things got heated between {player1} and {player2}.',
      '🔥 War is brewing between {player1} and {player2}.'
    ],
    trust_broken: [
      '💔 {player1} broke trust with {player2}.',
      '💔 Betrayal! {player1} turned on {player2}.',
      '💔 {player1} and {player2}\'s friendship shattered.',
      '💔 A major betrayal occurred between {player1} and {player2}.'
    ],
    reconciliation: [
      '🕊️ {player1} and {player2} reconciled.',
      '🕊️ Peace was made between {player1} and {player2}.',
      '🕊️ {player1} and {player2} patched things up.',
      '🕊️ The tension between {player1} and {player2} eased.'
    ]
  };
  
  // ============================================================================
  // PHASE SUMMARY HIGHLIGHT TEMPLATES
  // ============================================================================
  
  const PHASE_SUMMARY_TEMPLATES = {
    dramatic: [
      '🎭 Week {week} Drama Report: {highlight}',
      '🎭 This week\'s biggest moment: {highlight}',
      '🎭 Week {week} shocker: {highlight}',
      '🎭 The house was rocked by: {highlight}'
    ],
    strategic: [
      '🎯 Week {week} Strategy Report: {highlight}',
      '🎯 This week\'s power moves: {highlight}',
      '🎯 Week {week} game changers: {highlight}',
      '🎯 Strategic shake-up: {highlight}'
    ],
    social: [
      '💬 Week {week} Social Report: {highlight}',
      '💬 This week in the house: {highlight}',
      '💬 Week {week} relationship updates: {highlight}',
      '💬 Social dynamics shifted: {highlight}'
    ],
    general: [
      '📝 Week {week} Summary: {actionCount} interactions occurred.',
      '📝 Week {week} wrapped up with {actionCount} social moves.',
      '📝 {actionCount} interactions shaped the week.',
      '📝 Week {week} saw {actionCount} key moments.'
    ]
  };

  // ============================================================================
  // JURY HOUSE TEMPLATES
  // ============================================================================
  
  const JURY_TEMPLATES = {
    enter: [
      '{name} entered the Jury House.',
      '{name} joined the jury.',
      'Welcome to the Jury House, {name}.',
      '{name} became a juror.'
    ],
    testimonial: [
      '{name} shared their game experience with the jury.',
      '{name} gave their testimonial to fellow jurors.',
      '{name} reflected on their time in the house.',
      '{name} told their story to the jury.'
    ],
    meeting: [
      'The jury discussed the current nominees.',
      'Jurors debated who deserves to win.',
      'The jury house held a strategy session.',
      'Jurors shared their perspectives on the game.'
    ],
    challenge: [
      '{winner} won the jury return challenge!',
      '{winner} earned their way back into the house.',
      'Challenge winner: {winner} returns to compete!',
      '{winner} dominated the jury challenge and returns.'
    ],
    exit: [
      '{name} left the Jury House.',
      '{name} exited as a juror.',
      '{name}\'s jury tenure ended.',
      '{name} departed from the Jury House.'
    ],
    return: [
      '{name} returned from the Jury House!',
      'Welcome back, {name}!',
      '{name} re-entered the game from jury.',
      '{name} got a second chance!'
    ],
    finalDiscussion: [
      'The jury held their final discussion before voting.',
      'Jurors made their final deliberations.',
      'The jury debated the finalists one last time.',
      'Final jury meeting before the vote.'
    ]
  };

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Pick a random template from an array
   */
  function pick(arr) {
    if (!arr || !Array.isArray(arr) || arr.length === 0) return '';
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Render a template string with data
   */
  function render(template, data) {
    if (!template || typeof template !== 'string') return '';
    
    let result = template;
    for (const [key, value] of Object.entries(data || {})) {
      const placeholder = `{${key}}`;
      result = result.split(placeholder).join(value);
    }
    return result;
  }

  /**
   * Format a bond delta as a string with direction indicator
   */
  function deltaStr(delta) {
    if (delta === null || delta === undefined || isNaN(delta)) return '';
    
    const abs = Math.abs(delta);
    const sign = delta > 0 ? '+' : '';
    const emoji = delta > 0 ? '📈' : delta < 0 ? '📉' : '➡️';
    
    if (abs < 0.01) return '';
    
    return `${emoji} ${sign}${(delta * 100).toFixed(0)}%`;
  }

  /**
   * Resolve a player name, using 'You' for the human player
   */
  function resolveName(playerId) {
    const game = global.game || {};
    const me = game.me || game.meId;
    
    if (playerId === me) {
      return game.cfg?.humanName || 'You';
    }
    
    if (typeof global.safeName === 'function') {
      return global.safeName(playerId);
    }
    
    const player = (game.players || []).find(p => p.id === playerId);
    return player?.name || `Player ${playerId}`;
  }

  /**
   * Get a social action template
   */
  function getSocialTemplate(actionType) {
    const type = (actionType || 'generic').toLowerCase();
    const templates = SOCIAL_TEMPLATES[type] || SOCIAL_TEMPLATES.generic;
    return pick(templates);
  }

  /**
   * Get a social summary template
   */
  function getSocialSummaryTemplate() {
    return pick(SOCIAL_SUMMARY_TEMPLATES);
  }

  /**
   * Get a jury template
   */
  function getJuryTemplate(eventType) {
    const type = (eventType || 'enter').toLowerCase();
    const templates = JURY_TEMPLATES[type] || JURY_TEMPLATES.enter;
    return pick(templates);
  }

  /**
   * Get a relationship template based on type and bond strength
   */
  function getRelationshipTemplate(type, player1, player2) {
    const templates = RELATIONSHIP_TEMPLATES[type];
    if (!templates) return '';
    
    const template = pick(templates);
    return render(template, {
      player1: resolveName(player1),
      player2: resolveName(player2)
    });
  }

  /**
   * Get a phase summary template
   */
  function getPhaseSummaryTemplate(type = 'general') {
    const templates = PHASE_SUMMARY_TEMPLATES[type] || PHASE_SUMMARY_TEMPLATES.general;
    return pick(templates);
  }

  /**
   * Analyze relationship from bond delta and determine type
   */
  function analyzeRelationship(bondBefore, bondAfter) {
    const delta = bondAfter - bondBefore;
    const absDelta = Math.abs(delta);
    
    // Thresholds
    const ROMANCE_THRESHOLD = 0.6;
    const ALLIANCE_THRESHOLD = 0.4;
    const RIVALRY_THRESHOLD = -0.3;
    const ENEMY_THRESHOLD = -0.5;
    const SIGNIFICANT_CHANGE = 0.15;
    
    let type = null;
    
    // Determine relationship state after interaction
    if (bondAfter >= ROMANCE_THRESHOLD && bondBefore < ROMANCE_THRESHOLD) {
      type = 'romance_blossomed';
    } else if (bondAfter >= ROMANCE_THRESHOLD && delta > 0.05) {
      type = 'romance_developing';
    } else if (bondAfter >= ALLIANCE_THRESHOLD && bondBefore < ALLIANCE_THRESHOLD) {
      type = 'alliance_formed';
    } else if (bondAfter >= ALLIANCE_THRESHOLD && delta > 0.08) {
      type = 'alliance_strengthened';
    } else if (bondAfter <= ENEMY_THRESHOLD && bondBefore > ENEMY_THRESHOLD) {
      type = 'rivalry_formed';
    } else if (bondAfter <= RIVALRY_THRESHOLD && delta < -0.08) {
      type = 'rivalry_intensified';
    } else if (absDelta >= SIGNIFICANT_CHANGE && delta < -0.15) {
      type = 'trust_broken';
    } else if (absDelta >= SIGNIFICANT_CHANGE && delta > 0.15 && bondBefore < 0) {
      type = 'reconciliation';
    }
    
    return type;
  }

  /**
   * Generate a narrative description of a social action with relationship context
   */
  function generateNarrative(actor, target, actionType, bondBefore, bondAfter, outcome) {
    const actorName = resolveName(actor);
    const targetName = resolveName(target);
    
    // Get base template
    const baseTemplate = getSocialTemplate(actionType);
    let narrative = render(baseTemplate, { actor: actorName, target: targetName });
    
    // Add relationship context if significant change
    const relationshipType = analyzeRelationship(bondBefore || 0, bondAfter || 0);
    if (relationshipType) {
      const relText = getRelationshipTemplate(relationshipType, actor, target);
      if (relText) {
        narrative += ' ' + relText;
      }
    }
    
    // Add outcome flavor
    if (outcome) {
      const outcomeType = outcome.type || outcome;
      if (outcomeType === 'success' || outcomeType === 'positive') {
        narrative += ' ✨';
      } else if (outcomeType === 'failure' || outcomeType === 'negative') {
        narrative += ' 😬';
      } else if (outcomeType === 'dramatic' || outcomeType === 'critical') {
        narrative += ' 🎭';
      }
    }
    
    return narrative;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  DiaryTemplates.pick = pick;
  DiaryTemplates.render = render;
  DiaryTemplates.deltaStr = deltaStr;
  DiaryTemplates.resolveName = resolveName;
  DiaryTemplates.getSocialTemplate = getSocialTemplate;
  DiaryTemplates.getSocialSummaryTemplate = getSocialSummaryTemplate;
  DiaryTemplates.getJuryTemplate = getJuryTemplate;
  DiaryTemplates.getRelationshipTemplate = getRelationshipTemplate;
  DiaryTemplates.getPhaseSummaryTemplate = getPhaseSummaryTemplate;
  DiaryTemplates.analyzeRelationship = analyzeRelationship;
  DiaryTemplates.generateNarrative = generateNarrative;

  // Export to global
  global.DiaryTemplates = DiaryTemplates;

})(window);
