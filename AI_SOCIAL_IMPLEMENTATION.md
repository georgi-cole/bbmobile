# AI-to-AI Social Interactions & Highlights System

## Overview

This implementation adds background AI-to-AI social interactions during the Social phase and surfaces major highlights in Diary Room Social logs. The system creates a more dynamic and realistic social environment where AI houseguests interact with each other while the human player makes their own moves.

**NEW (PR C)**: Full action catalog with 20+ actions, phase-aware weighting engine, truthiness system, and cooldown/decay management. See [SOCIAL_AI_CATALOG.md](docs/SOCIAL_AI_CATALOG.md) for comprehensive documentation.

## Features

### 1. AI-to-AI Social Interactions

**What it does:**
- While the human is in the Social phase, AI houseguests perform lightweight background interactions using the existing Social Maneuvers engine
- Interactions respect the same mechanics: cost calculation, affordability checks, energy debit, success/outcome resolution, and application of influence/affinity/information deltas
- Scheduler runs continuously with fairness controls to ensure balanced, realistic behavior

**Scheduling:**
- Starts on Social phase entry; stops on exit or route change
- Ticks every ~1.2–1.8s (randomized) and picks 0–2 interactions probabilistically
- Per-phase caps: each AI limited by available energy and a soft cap of ~3–5 actions (configurable)
- When human auto-skips due to 0 energy, runs a small burst (1–3 total AI interactions) during the 3s overlay
- Excludes evicted/unavailable players; avoids duplicate pairings in short succession (30s cooldown)

**Action Selection:**
- Favors friendly/neutral interactions (small_talk, compliment, strategize, confide) by default
- Occasionally allows strategic/risky actions (confront, spread_rumor) based on aggression setting
- Supports multi-target actions (group_hangout) with correct group cost calculations
- Weighted selection based on category:
  - Friendly: 40% weight
  - Neutral: 30% weight
  - Strategic: 20% weight
  - Aggressive: 10% (medium) or 2% (low)

**Events and UI:**
- Reuses existing resource-changed events so HUD/ally badges update naturally
- Emits `sm-ai-interaction` event after each AI action for optional hooks
- Event detail includes: `{ actorId, targetIds, actionId, success, outcome, deltas }`

### 2. Social Highlights

**What it does:**
- Aggregates major social events during the Social phase (both human and AI)
- Renders a compact "Social Highlights" card in Diary Room → Social logs at phase end
- Shows up to 5 most recent major events (mobile-friendly)

**Major Event Criteria (configurable):**
- |Δinfluence| ≥ 8 on a single outcome
- Alliances formed or protected with POV
- Betrayal/backlash (caught spreading rumor, expose secret success)
- Confront fails or strong negatives (≤ -8)
- Big information gain (≥ 6 in one outcome)
- Positive group events (successful group_hangout/strategize with net positive)

**Highlight Types:**
- 🤝 Alliance Formed (green)
- ⚠️ Betrayal/Caught (yellow)
- 🔓 Secret Exposed (yellow)
- ⚔️ Confrontation (neutral/red)
- 📉 Relationship Deteriorated (red)
- 📈 Major Influence Gain (green)
- 💖 Strong Bond (green)
- 🔍 Information Learned (green)
- 👥 Group Interaction (green)

**Privacy:**
- Shows only events consistent with current visibility
- Does not leak hidden data

## Configuration

All settings are in `game.cfg` with sensible defaults:

```javascript
{
  // AI Social Interactions (default: enabled)
  aiSocialEnabled: true,           // Master switch for AI interactions
  aiSocialAggression: 'low',       // Action selection: 'low' | 'medium'
  aiSocialMaxPerPhase: 5,          // Soft cap on AI actions per AI per phase
  
  // Social Highlights (default: enabled)
  socialHighlightsEnabled: true,   // Show highlights in Diary Room logs
  
  // Spend-to-Reveal (default: enabled)
  socialSpendingEnabled: true,     // Enable spend energy to reveal details
  
  // Flavor System (default: enabled)
  socialSpicyLogs: true            // Enable flavor text and truthiness
}
```

### Tuning Parameters

**NEW (PR C)**: See [SOCIAL_AI_CATALOG.md](docs/SOCIAL_AI_CATALOG.md) for detailed tuning documentation including:
- Phase multipliers (pre-noms, pre-pov, post-noms)
- Role multipliers (HOH, POV holder, nominee)
- Relationship multipliers (ally, rival)
- Cooldown bands and repetition decay
- Truthiness formula parameters

### Adjusting AI Behavior

**To make AI more passive:**
```javascript
game.cfg.aiSocialEnabled = false; // Disable completely
// OR
game.cfg.aiSocialMaxPerPhase = 2; // Reduce action cap
```

**To make AI more aggressive:**
```javascript
game.cfg.aiSocialAggression = 'medium'; // Allow more risky actions
game.cfg.aiSocialMaxPerPhase = 8;       // Increase action cap
```

**To disable highlights:**
```javascript
game.cfg.socialHighlightsEnabled = false;
```

## Implementation Details

### Files Added (PR A & B)

1. **js/social-ai-scheduler.js** (997 lines)
   - Core AI interaction scheduler
   - Target selection, action selection, execution
   - Burst mode for empty-energy scenarios
   - Event emission

2. **js/social-highlights.js** (306 lines)
   - Event aggregation and classification
   - Major event detection
   - Highlight card rendering
   - Event listeners for both AI and human actions

3. **js/social/social-flavor.js** (195 lines)
   - Flavor text rendering
   - Truthiness computation
   - Partial reveal helpers

4. **js/social/social-enricher.js** (106 lines)
   - Event enrichment with flavor and truthiness
   - Re-emission for UI consumption

5. **js/social/social-ui-adapter.js** (500 lines)
   - Spend-to-reveal CTA rendering
   - Truthiness handling in UI
   - Energy deduction

6. **js/social/social-actions-registry.js** (68 lines, minimal)
   - Action registry skeleton
   - Basic outcome generators

### Files Added (PR C - This PR)

7. **js/social/social-actions-registry.js** (expanded to 360 lines)
   - Full catalog of 20+ actions
   - Metadata: phaseTags, costs, cooldowns, spendable flags, aiBias
   - Outcome generators with deltas and spread simulation

8. **js/social/social-ai-weights.js** (NEW - 350 lines)
   - Weight computation engine
   - Phase multipliers (pre-noms, pre-pov, post-noms)
   - Role multipliers (HOH, POV holder, nominee)
   - Relationship multipliers (ally, rival)
   - Cooldown and decay system

9. **js/social/social-ai-integrator.js** (NEW - 430 lines)
   - Adapter between scheduler and weights/registry
   - Candidate building with phase filtering
   - Target selection with relationship weighting
   - Context building for intel actions
   - Cooldown tracking and history management

10. **test_e2e/test_social_ai_catalog.html** (NEW - 500 lines)
    - Interactive test harness
    - Phase-aware weighting tests
    - Truthiness validation tests
    - Cooldown and decay tests
    - Deterministic RNG for reproducibility

11. **docs/SOCIAL_AI_CATALOG.md** (NEW - 800 lines)
    - Comprehensive action catalog documentation
    - Weighting system details
    - Truthiness formula
    - Tuning parameters
    - QA steps
    - Integration notes

### Files Modified

1. **js/social-maneuvers.js**
   - Added scheduler start/stop calls in `onSocialPhaseStart`/`onSocialPhaseEnd`
   - Added AI burst trigger in empty-energy auto-skip
   - Added highlight tracking for human actions in `executeAction`
   - Added highlights phase lifecycle calls

2. **js/config/defaults.js**
   - Added 4 new configuration flags

3. **index.html**
   - Added script tags for new modules (correct load order)

4. **styles.css**
   - Added ~100 lines of CSS for highlights card styling
   - Responsive design for mobile
   - Color-coded highlight types

## Usage

### Enabling/Disabling

The system is enabled by default. To disable:

```javascript
// Disable AI interactions
game.cfg.aiSocialEnabled = false;

// Disable highlights
game.cfg.socialHighlightsEnabled = false;
```

### Monitoring AI Activity

Listen to the `sm-ai-interaction` event:

```javascript
window.addEventListener('sm-ai-interaction', (e) => {
  const { actorId, targetIds, actionId, success, outcome, deltas } = e.detail;
  console.log(`AI ${actorId} → ${actionId} → ${targetIds}: ${success ? 'success' : 'fail'}`);
});
```

### Viewing Highlights

1. Play through a Social phase
2. Navigate to Diary Room after phase ends
3. Switch to "Social" tab in logs
4. See "🌟 Social Highlights" card at the top

## Testing

### Automated Tests

```bash
# Run existing social phase tests (should still pass)
npm run test:social

# Run AI social implementation verification
node verify_ai_social_implementation.mjs
```

### Manual Testing

Open `test_ai_social_interactions.html` in a browser:

1. **Module Loading**: Verify all modules load correctly
2. **Configuration**: Toggle settings and verify behavior
3. **Mock Game**: Setup a mock game with 8 players
4. **AI Scheduler**: Start/stop the scheduler, trigger interactions
5. **Highlights**: Test major event detection and rendering
6. **Event Log**: Monitor all events in real-time

### In-Game Testing

1. Start a new game or load existing save
2. Play through to Social phase
3. Observe:
   - AI players' ally/enemy badges changing during the phase
   - No modal interruptions to human player
   - Energy depletion working correctly for AI
4. Empty-energy skip:
   - Deplete all human energy
   - Verify 3s overlay appears
   - Verify AI burst runs during overlay
   - Verify phase advances after overlay
5. Diary Room:
   - Check Social tab for highlights card
   - Verify major events are listed
   - Verify mobile-friendly rendering

## Performance Considerations

- **Timer-based scheduling**: Uses `setTimeout` loops with guards
- **Defensive coding**: Skips evicted/undefined players, guards missing containers
- **Event throttling**: Max 2 interactions per tick (~1.5s interval)
- **Cooldown system**: 30s pairing cooldown prevents spam
- **Highlight cap**: Max 5 entries, auto-prunes older entries
- **Clean shutdown**: All timers cleared on phase exit

## Balance Notes

- **No changes to human mechanics**: AI uses same rules and resource banks
- **Energy parity**: AI respects same cost calculations via `computeActionCost`
- **Fair scheduling**: Soft caps prevent AI from dominating
- **Strategic diversity**: Weighted action selection creates variety
- **Highlights filtering**: Only major events shown, prevents noise

## Future Enhancements

Potential improvements (not in this PR):

1. **AI personality weights**: Different AIs prefer different action types
2. **Alliance-aware targeting**: AI targets allies vs. enemies differently
3. **Strategic group formation**: AI coordinates multi-person alliances
4. **Highlight animations**: Fade-in effects for highlight entries
5. **Highlight notifications**: Toast popup when major event occurs
6. **Detailed telemetry**: Track AI vs. human interaction success rates
7. **Adaptive aggression**: AI becomes more aggressive in later weeks

## Acceptance Criteria Status

✅ During normal Social phase, other players visibly change ally/enemy status  
✅ No modals interrupt the human player  
✅ When human has 0 energy, small AI burst occurs during auto-skip  
✅ Diary Room → Social logs shows "Social Highlights" with up to 5 entries  
✅ Costs correctly debited for AI actions, including multi-target totals  
✅ Preview vs. execute parity preserved (uses `computeActionCost`)  
✅ Scheduler stops cleanly on phase exit  
✅ No spillover or timers left running  
✅ Defensive code skips evicted/undefined players  
✅ Guards for missing UI containers  

## Known Limitations

1. AI does not form complex strategic plans (acts opportunistically)
2. No memory of previous phase's highlights (resets each phase)
3. Highlights are not persisted to save games
4. No UI indication of AI actions in real-time (only via event listeners)

## Troubleshooting

**AI not interacting:**
- Check `game.cfg.aiSocialEnabled === true`
- Verify AI players have energy: `SocialManeuvers.SocialEnergyBank.get(playerId)`
- Check console for errors

**Highlights not showing:**
- Check `game.cfg.socialHighlightsEnabled === true`
- Verify major events occurred (check criteria thresholds)
- Check Social log pane exists: `document.getElementById('logSocial')`

**Scheduler not stopping:**
- Verify `onSocialPhaseEnd` is called
- Check `SocialAIScheduler.stopAiSocialPhase()` logs
- Inspect `schedulerTimer` state in debugger

## References

- Social Maneuvers system: `js/social-maneuvers.js`
- Social Resources: Lines 196-420 in `social-maneuvers.js`
- Action definitions: Lines 691-706 in `social-maneuvers.js`
- Phase lifecycle: Lines 2874-3042 in `social-maneuvers.js`
