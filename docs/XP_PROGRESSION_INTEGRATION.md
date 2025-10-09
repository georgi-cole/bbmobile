# XP Progression System Integration

## Overview

The XP Progression System is now fully integrated with the main game, tracking player achievements and displaying rankings throughout the season.

## Architecture

### Core Components

1. **progression-bridge.js** - Bridge layer between TypeScript core and main game
   - Exposes `window.Progression` API
   - Handles lazy initialization and error recovery
   - Provides per-player state tracking with intelligent fallbacks

2. **progression-events.js** - Event hooks into game mechanics
   - Exposes `window.ProgressionEvents` hooks
   - Called by game code at key moments (HOH wins, nominations, jury votes, etc.)
   - Safely handles missing/unavailable Progression API

3. **progression-ui.js** - User interface components
   - Badge button for viewing XP modal
   - Top 5 leaderboard display (finale)
   - Exposed as `window.ProgressionUI` and `window.showTop5Leaderboard`

### Load Order

Scripts load in this order (index.html):
```html
<script type="module" src="js/progression-bridge.js"></script>
<script defer src="js/progression-events.js"></script>
<script defer src="js/progression-ui.js"></script>
```

The bridge loads as a module (deferred), and the events/UI load with defer. Both events and UI safely check for the Progression API before using it.

## API Reference

### window.Progression

- **initialize()** - Initializes the progression system (lazy-loaded)
- **log(eventType, options)** - Records an XP event
- **getPlayerState(playerId)** - Gets XP state for a specific player
  - Fallback 1: Filter events by playerId if core doesn't support per-player
  - Fallback 2: Return aggregate state
  - Fallback 3: Return zero state
- **getLeaderboard(seasonId)** - Returns top 5 players sorted by XP
- **getCurrentState()** - Gets aggregate XP state
- **showModal(seasonId, playerId)** - Shows XP modal for a player
- **recompute(seasonId, playerId)** - Recomputes XP totals

### window.ProgressionEvents

All hooks are safe to call (no-ops if Progression unavailable):

- **onHOHWin(winnerId, participants)** - HOH competition winner
- **onNominations(nomineeIds)** - Nominations ceremony locked
- **onPOVWin(winnerId, participants)** - POV competition winner
- **onVetoUsedOnSelf(winnerId)** - Veto used on self
- **onVetoUsedOnOther(winnerId, savedId)** - Veto used on another player
- **onEvictionVotes(targetId, voteCount, voters)** - Eviction votes counted
- **onSurviveEviction(survivorId)** - Player survives eviction
- **onCorrectVote(voterId)** - Player voted with majority
- **onTiebreakerWin(hohId)** - HOH breaks tie
- **onJuryVote(finalistId)** - Jury member votes for finalist
- **onFinalWinner(winnerId)** - Season winner declared
- **onPublicFavorite(winnerId)** - Public's favorite winner

### window.ProgressionUI / window.showTop5Leaderboard

- **showTop5Leaderboard(durationMs)** - Displays Top 5 leaderboard overlay
  - Default duration: 7000ms
  - Creates tvOverlay container if missing
  - Prefers getLeaderboard() API, falls back to getPlayerState()

## Integration Points

### competitions.js
- Line 726: `ProgressionEvents.onHOHWin(winner, elig)` after HOH is determined

### nominations.js
- Line 185: `ProgressionEvents.onNominations(g.nominees)` when noms locked

### veto.js
- Lines 338-340: `ProgressionEvents.onPOVWin(vetoHolder, participants)` after POV winner
- Lines 865-870: `onVetoUsedOnSelf` or `onVetoUsedOnOther` at veto ceremony

### jury.js
- Line 1155-1156: `ProgressionEvents.onPublicFavorite(playerId)` after public vote
- Line 1404-1405: `ProgressionEvents.onJuryVote(pick)` for each jury vote
- Line 1535-1536: `ProgressionEvents.onFinalWinner(winner)` after winner declared
- Line 1583: `showTop5Leaderboard(7000)` displays finale leaderboard

## Browser Compatibility

Global aliases ensure browser context compatibility:

- **index.html line 18**: `<script>window.global = window;</script>`
- **nominations.js line 8**: `if (!global.global) global.global = global;`
- **jury.js line 8**: `if (!g.global) g.global = g;`

These prevent `ReferenceError: global is not defined` in browser environments.

## Fallback Behavior

The system is designed to gracefully degrade:

1. If progression modules fail to load → warnings logged, game continues
2. If getPlayerState not in core → filters events by playerId
3. If event filtering not available → returns aggregate state
4. If Progression API unavailable → hooks become no-ops
5. If tvOverlay missing → creates container on-demand

## XP Rules

XP is awarded for:
- HOH wins
- POV wins
- Competition participation
- Being nominated (negative)
- Using veto
- Surviving eviction
- Correct votes
- Jury votes received
- Winning the season
- Public favorite

See `src/progression/constants.ts` for complete rule definitions and XP values.

## Testing

Run the integration test:
1. Open `test_xp_progression_integration.html` in a browser
2. Click "Run Complete Test Suite" or individual test buttons
3. Verify all critical tests pass

### Manual Testing Checklist

1. **Start a new season** - Check XP badge appears, no console errors
2. **Play HOH competition** - Verify XP updates after winner declared
3. **Lock nominations** - Verify XP events fire for nominees
4. **Play POV and use veto** - Verify XP updates
5. **Complete eviction** - Verify XP for survivor
6. **Progress to finale** - Verify jury votes award XP
7. **Win season** - Verify:
   - Winner gets XP
   - Public favorite gets XP
   - Top 5 leaderboard displays for 7 seconds
   - No console errors

## Troubleshooting

### "Progression.getPlayerState is not a function"
- **Fixed**: getPlayerState is now exported and has multi-tier fallback

### "global is not defined"
- **Fixed**: Browser aliases added to jury.js and nominations.js

### "TV overlay not found"
- **Fixed**: UI creates tvOverlay container if missing

### Leaderboard shows empty names
- **Fixed**: UI resolves names from game.players with fallback to playerId

### Events not recording XP
- Check browser console for Progression API errors
- Verify progression system initialized (badge should be visible)
- Check that game code is calling ProgressionEvents hooks

## Future Enhancements

Potential improvements (out of scope for this PR):

1. Per-player XP state in core module (eliminate fallback need)
2. Visual XP gain notifications during gameplay
3. Level-up celebration animations
4. Achievement badges/milestones
5. Season-long XP persistence
6. Configurable XP rules via UI

## Credits

Integration implemented in PR #[number] by following the specification in the problem statement.
All existing game event hooks were already in place and functional - minimal changes required.
