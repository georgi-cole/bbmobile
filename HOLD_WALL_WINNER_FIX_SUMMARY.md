# Hold the Wall - Winner Determination Fix

## Critical Issue Addressed

User reported: "I was the last one to fall and I had to win the challenge, however I was placed at 3rd place and a random houseguest won who either never participated or fell much earlier than I did."

## Root Cause

The `endHold()` function was always assigning a score of 0 (lose) when the player released or dropped, even if they were the last one standing and should have won.

### Code Flow Before Fix

```javascript
function endHold(moved = false){
  isHolding = false;
  hasEnded = true;
  cleanupTimers();
  
  // ... lose logic
  const finalScore = 0; // Always 0!
}
```

**Problem:** When player was last standing and released, they got score 0. The competition winner is determined by highest score, so any AI player with a higher score (even randomly generated) would win instead.

## Solution

Added a critical check at the start of `endHold()` to detect if the player is the last one remaining:

```javascript
function endHold(moved = false){
  isHolding = false;
  
  // CRITICAL FIX: Check if player is the last one remaining
  const stillHolding = participants.filter(p => !p.dropTimeMs);
  if(stillHolding.length === 1 && stillHolding[0].isPlayer){
    // Player is the last one standing - they WIN!
    console.log('[HoldWall] Player is last remaining - calling finalizeVictory()');
    finalizeVictory(); // score = 100
    return;
  }
  
  hasEnded = true;
  cleanupTimers();
  
  // ... lose logic (only reached if player is NOT last standing)
  const finalScore = 0;
}
```

### Additional Tiebreaker Fix

Also improved the tiebreaker logic so that when multiple players have the same drop time (e.g., player drops and remaining AI participants are marked as dropped at the same moment), the human player always ranks first:

```javascript
eliminationLog.sort((a, b) => {
  // Sort by drop time (descending - later is better)
  if(b.timeMs !== a.timeMs) return b.timeMs - a.timeMs;
  
  // Tiebreaker: Human player always ranks first
  if(pA && pA.isPlayer) return -1;
  if(pB && pB.isPlayer) return 1;
  
  // AI vs AI: use participant array index
  return participants.indexOf(pA) - participants.indexOf(pB);
});
```

## Result

**User Scenario:**
- Players 1-8 compete (player 4 is human)
- Drop sequence: 8, 1, 2, 3, 5, 6, 7
- Player 4 is last standing

**Before Fix:**
- ❌ Player 4 receives score 0 (lose)
- ❌ Random AI player with higher score wins
- ❌ Player placed 3rd despite being last to drop

**After Fix:**
- ✅ Player 4 receives score 100 (win)
- ✅ Player 4 is competition winner
- ✅ Results popup correctly shows player 4 as 1st place
- ✅ No randomization - winner purely determined by endurance

## Technical Details

### Winner Determination in Competition System

The competition system (`competitions.js`) determines the winner by:
1. Collecting all scores in `g.lastCompScores` Map
2. Filtering eligible players
3. Sorting by score (descending)
4. Taking the highest score as winner

```javascript
const sortedEntries = scoredEntries.sort((a, b) => b[1] - a[1]);
const winner = sortedEntries[0][0];
```

This is why the score matters: **100 > 0** means the player with score 100 wins.

### Endurance Challenge Scoring

Hold the Wall uses special scoring for endurance:
- **Winner**: score = 100
- **Everyone else**: score = 0

This bypasses the standard 0-1000 scoring scale and ensures clear winner determination.

## Commits

1. `d30ad65` - Initial fix for HOH eligibility and winner determination
2. `87b1fa7` - Added critical check for last player standing
3. `cd7510b` - Code review feedback addressed

## Testing

All tests pass:
- ✅ Minigames validation (51 games)
- ✅ Runtime validation
- ✅ CodeQL security scan (0 vulnerabilities)

## Related Issues

This fix addresses the core complaint in the issue:
- ✅ Player who is last to fall now wins
- ✅ No random houseguest wins who didn't earn it
- ✅ Results popup shows correct winner

Combined with previous fixes:
- ✅ HOH competitions have correct participant count (exclude previous HOH)
- ✅ Winner determination based on actual drop time, not random
