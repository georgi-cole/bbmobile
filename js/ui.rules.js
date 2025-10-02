(function(g){
  'use strict';

  // Render a single sticky card with a scrollable body.
  function showRulesCard(){
    const body = `
      <div class="rules-body">
        <h3>Welcome to Big Brother</h3>
        <p>Step inside the house and get ready for the ultimate social strategy game.</p>
        <ol>
          <li><strong>Weekly Cycle</strong><br/>HOH → Nominations → Veto → Eviction.</li>
          <li><strong>Competitions</strong><br/>Scores reflect luck, traits, and twists.</li>
          <li><strong>Social Interactions</strong><br/>Alliances, friendships, rivalries drive votes.</li>
          <li><strong>Eviction & Jury</strong><br/>Jurors vote for the winner at the finale.</li>
          <li><strong>Twists</strong><br/>Expect shifts; returns are possible.</li>
          <li><strong>Progress</strong><br/>Finishes add to your scoreboard and unlocks.</li>
          <li><strong>Settings</strong><br/>Tune cast/difficulty; then watch the story unfold.</li>
        </ol>
        <div class="tiny muted" style="margin-top:8px">Open Settings any time to customize. Use the Rules button to reopen these rules.</div>
      </div>
    `;
    if (typeof g.showCard === 'function'){
      // showCard(title, [html], kind, durationMs, sticky)
      g.showCard('Game Rules', [body], 'info', 0, true);
    } else if (typeof g.showBigCard === 'function'){
      // Last-resort: coerce into an array; some big card impls scroll too, but may escape HTML.
      g.showBigCard('Game Rules', [body]);
    } else {
      alert('Game Rules\n\nHOH → Nominations → Veto → Eviction.\nJurors vote for the winner in the finale.\nExpect twists and returns.');
    }
  }

  // Export (override any older implementation)
  g.showRulesCard = showRulesCard;

  // Optional: respond to intro completion if emitted elsewhere
  try { g.addEventListener?.('bb:intro-complete', ()=> showRulesCard(), { once:true }); } catch {}

})(window);
