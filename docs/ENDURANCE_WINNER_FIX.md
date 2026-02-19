# Endurance Competition Winner Fix

## Problem

Endurance competitions (like Hold the Wall) determine their winner internally based on who remains standing longest. However, the global competition logic was overriding this winner with a randomly-selected AI player.

### Root Cause

The bug occurred in the fallback logic of `finishCompPhase()` (HOH) and `finishVetoComp()` (POV):

1. Endurance minigames correctly set scores (winner: 100, others: 0)
2. Global competition logic sees players with 0 scores and generates random AI scores for them
3. Random AI scores could be > 0, causing them to win instead of the actual endurance winner

### User Impact

- Player wins Hold the Wall as the last person standing
- First popup shows player as winner ✓
- Second popup shows random AI as winner and they get HOH/POV ✗

## Solution

Implemented an **authoritative winner mechanism** that allows endurance minigames to mark their winner as authoritative, preventing the global fallback logic from overriding it.

### Implementation

#### 1. Authoritative Winner Flag (`g.__authoritativeWinner`)

When an endurance minigame completes, it sets a flag with winner details:

```javascript
g.__authoritativeWinner = {
  playerId: winnerParticipant.id,  // ID of the winner
  score: standings[0].score,        // Their score (typically 100)
  minigame: gameId,                 // Which minigame set this
  compType: compType,               // 'hoh' or 'pov'
  timestamp: Date.now()             // When this was set
};
```

#### 2. Guarded Fallback Logic

The global competition logic checks for this flag before generating random scores:

```javascript
// In finishCompPhase() and finishVetoComp()
if (g.__authoritativeWinner && g.__authoritativeWinner.compType === 'hoh') {
  console.info(`[hoh] Skipping score generation - authoritative winner exists`);
  // Set 0 score for non-winners, don't generate random scores
  g.lastCompScores.set(id, 0);
  continue;
}
```

#### 3. Defensive Validation

After winner determination, validate that the winner matches the authoritative winner:

```javascript
if (g.__authoritativeWinner && g.__authoritativeWinner.compType === 'hoh') {
  if (g.__authoritativeWinner.playerId !== winner) {
    console.error(`[hoh] ⚠️ MISMATCH: Using authoritative winner instead`);
    winner = g.__authoritativeWinner.playerId;
  }
}
```

#### 4. Cleanup

After the competition is finalized, clear the flag:

```javascript
if (g.__authoritativeWinner && g.__authoritativeWinner.compType === 'hoh') {
  delete g.__authoritativeWinner;
}
```

## Files Modified

- **js/minigames/hold-wall.js**: Sets authoritative winner flag, stores scores by player ID
- **js/competitions.js**: Guards HOH fallback logic, validates and clears flag
- **js/veto.js**: Guards POV fallback logic, validates and clears flag

## Testing

To test this fix:

1. Play Hold the Wall as HOH competition
2. Stay holding until you're the last person standing
3. Verify you see exactly one winner popup showing you as the winner
4. Verify you are awarded HOH (check HUD badge)
5. Repeat for POV competition

Expected behavior:
- Only one winner popup appears
- The person who stayed holding longest wins
- No random AI override occurs
- Works for both human and AI winners

## Future Extensions

This mechanism can be extended to other competition types that need authoritative winner determination:

1. Set `g.__authoritativeWinner` with winner details
2. Global logic will respect it automatically (no changes needed)
3. Remember to specify the correct `compType` ('hoh', 'pov', 'final3_comp1', etc.)

## Related Issues

- Fixes: Endurance competition winner mismatch bug
- Related: Hold the Wall winner determination
- Related: POV endurance competitions

## Update (v2.1): Deterministic Opponent Generation

The fallback scoring logic that previously used ad-hoc random values (`5 + rand * N`) has been replaced with `fillMissingScores()` which calls `MinigameScoring.generateOpponentScoresForCompetition()`.

### Key protections for authoritative winners

1. **`generateOpponentScoresForCompetition` skips authoritative winners**: When `authoritativeWinnerId` is provided, no score is generated for that player and all other scores are capped below `authoritativeWinnerScore - 1`.

2. **`fillMissingScores` guards**: The function checks `g.__authoritativeWinner` before generating scores. If a matching authoritative winner exists, it skips generation for that player and the caller's score-injection logic remains untouched.

3. **Deterministic replay**: Each competition run initialises `g.__compSeed` so the opponent scores are reproducible given the same seed parts. The audit object `g.__compAudit` records all relevant info.

### Integration example

An endurance minigame that sets an authoritative winner:

```javascript
// In endurance minigame (e.g. hold-wall.js)
const g = window.game;
g.__authoritativeWinner = {
  playerId: winnerParticipant.id,
  score: standings[0].score,    // typically 100 (comp scale)
  minigame: 'holdWall',
  compType: compType,           // 'hoh' or 'pov'
  timestamp: Date.now()
};
```

The competition logic will:
1. `fillMissingScores()` detects `g.__authoritativeWinner.compType === compType`
2. Does NOT generate a score for `authoritativeWinnerId`
3. Generates scores for all other players, capped below `authoritativeWinnerScore`
4. The caller (`finishCompPhase` / `finishVetoComp`) then injects the authoritative winner's score as the highest

This two-stage approach ensures the authoritative winner is always shown with the highest score in the final scoreboard.

### Audit trail

After every `fillMissingScores()` call, `g.__compAudit` contains:
- `authoritativeWinner`: snapshot of the winner protected (or `null`)
- `generatedOpponentScores`: central-scale scores generated for other players
- `seedParts`: the exact seed used (for replay)

See [minigames-scoring.md](./minigames-scoring.md) for the full audit format.
