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
      '{actor} told {target} they\'re doing great in the house.'
    ],
    flirt: [
      '{actor} flirted with {target}.',
      '{actor} made a move on {target}.',
      '{actor} turned on the charm with {target}.',
      '{actor} playfully engaged {target}.'
    ],
    gossip: [
      '{actor} gossiped about other houseguests with {target}.',
      '{actor} shared house rumors with {target}.',
      '{actor} dished dirt with {target}.',
      '{actor} talked strategy and drama with {target}.'
    ],
    bribe: [
      '{actor} offered {target} a deal.',
      '{actor} tried to influence {target} with promises.',
      '{actor} made {target} an offer they couldn\'t refuse.',
      '{actor} sweetened the pot for {target}.'
    ],
    lie: [
      '{actor} lied to {target}.',
      '{actor} bent the truth with {target}.',
      '{actor} fed {target} a false narrative.',
      '{actor} manipulated {target} with deception.'
    ],
    insult: [
      '{actor} insulted {target}.',
      '{actor} threw shade at {target}.',
      '{actor} made {target} feel small.',
      '{actor} attacked {target}\'s character.'
    ],
    backstab: [
      '{actor} backstabbed {target}.',
      '{actor} betrayed {target}\'s trust.',
      '{actor} turned on {target}.',
      '{actor} threw {target} under the bus.'
    ],
    strategize: [
      '{actor} strategized with {target}.',
      '{actor} planned game moves with {target}.',
      '{actor} formed an alliance with {target}.',
      '{actor} discussed tactics with {target}.'
    ],
    comfort: [
      '{actor} comforted {target}.',
      '{actor} supported {target} emotionally.',
      '{actor} was there for {target}.',
      '{actor} helped {target} through a tough time.'
    ],
    interrogate: [
      '{actor} interrogated {target}.',
      '{actor} pressed {target} for information.',
      '{actor} grilled {target} about their game.',
      '{actor} tried to get intel from {target}.'
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

  // Export to global
  global.DiaryTemplates = DiaryTemplates;

})(window);
