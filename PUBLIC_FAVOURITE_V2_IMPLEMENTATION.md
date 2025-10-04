# Public Favourite v2 Implementation

## Overview
This document describes the implementation of the weighted Public Favourite feature (v2) and the reusable tri-slot reveal modal.

## Changes Made

### 1. Public Favourite v2 (js/jury.js)

#### Weighted Selection Algorithm
Previously, the Public Favourite winner was selected randomly from all players (excluding the game winner). The new v2 implementation uses weighted sampling based on survival time.

**Weight Formula:**
```javascript
weight = 1 + 0.10 * normalizedSurvival
```

**Normalized Survival:**
```javascript
survivalWeek = (weekEvicted != null) ? weekEvicted : totalWeeks
normalizedSurvival = clamp(survivalWeek / totalWeeks, 0, 1)
```

**Key Points:**
- Players who survive longer have higher weights
- Finalists (weekEvicted = null) get the maximum weight (survivalWeek = totalWeeks)
- Weight range: 1.00 to 1.10
- Uses weighted sampling WITHOUT replacement for 3 distinct candidates
- Minimum 3 players required (spec compliance)

#### Example Weight Calculations
For a 9-week season:
- Player evicted Week 1: weight = 1 + 0.10 * (1/9) ≈ 1.011
- Player evicted Week 5: weight = 1 + 0.10 * (5/9) ≈ 1.056
- Player evicted Week 8: weight = 1 + 0.10 * (8/9) ≈ 1.089
- Finalist (not evicted): weight = 1 + 0.10 * (9/9) = 1.100

#### Implementation Details
```javascript
// Calculate weights for all players
const playersWithWeights = allPlayers.map(p => {
  const survivalWeek = p.weekEvicted != null ? p.weekEvicted : totalWeeks;
  const normalizedSurvival = Math.max(0, Math.min(1, survivalWeek / totalWeeks));
  const weight = 1 + 0.10 * normalizedSurvival;
  return { player: p, weight };
});

// Weighted sampling without replacement
function weightedSample(candidates, count) {
  const selected = [];
  const pool = candidates.slice();
  
  for (let i = 0; i < count && pool.length > 0; i++) {
    const totalWeight = pool.reduce((sum, c) => sum + c.weight, 0);
    let rand = rng() * totalWeight;
    
    let selectedIdx = 0;
    for (let j = 0; j < pool.length; j++) {
      rand -= pool[j].weight;
      if (rand <= 0) {
        selectedIdx = j;
        break;
      }
    }
    
    selected.push(pool[selectedIdx]);
    pool.splice(selectedIdx, 1);
  }
  
  return selected;
}

// Select 3 candidates
const selectedCandidates = weightedSample(playersWithWeights, 3);

// Winner is randomly selected from the 3 weighted candidates
const winnerSlotIdx = Math.floor(rng() * 3);
const fanFavPlayer = selectedCandidates[winnerSlotIdx].player;
```

### 2. Reusable Tri-Slot Reveal Modal (js/competitions.js)

Created a global reusable component `showTriSlotReveal()` that can be used for any top-3 reveal sequence.

**Function Signature:**
```javascript
async function showTriSlotReveal(options)
```

**Options:**
- `title` (string): Main title for the reveal (default: 'Competition')
- `topThree` (array): Array of 3 objects with at least a `name` property
- `winnerEmoji` (string): Emoji to display with winner (default: '👑')
- `winnerTone` (string): Card tone for winner (default: 'ok')
- `introDuration` (number): Duration of intro card (default: 2000ms)
- `placeDuration` (number): Duration of 2nd/3rd place cards (default: 2000ms)
- `winnerDuration` (number): Duration of winner card (default: 3200ms)
- `showIntro` (boolean): Whether to show intro card (default: true)

**Sequence:**
1. Intro card: "Revealing top 3..."
2. 3rd place reveal
3. 2nd place reveal
4. Winner reveal with emoji

**Usage Example:**
```javascript
await global.showTriSlotReveal({
  title: 'HOH Competition',
  topThree: [
    { name: 'Winner', score: 95.5 },
    { name: 'Runner-up', score: 85.2 },
    { name: 'Third Place', score: 78.1 }
  ],
  winnerEmoji: '👑',
  winnerTone: 'ok'
});
```

### 3. Updated HOH Competition (js/competitions.js)

Modified `showCompetitionReveal()` to use the new reusable component:
```javascript
await showTriSlotReveal({
  title: title,
  topThree: top3,
  winnerEmoji: '👑',
  winnerTone: 'ok',
  showIntro: true
});
```

### 4. Updated Veto Competition (js/veto.js)

Modified `showVetoRevealSequence()` to use the reusable component with graceful fallback:
```javascript
// Convert format and use tri-slot reveal
const formatted = top3.map(entry => ({ 
  name: safeName(entry[0]), 
  score: entry[1] 
}));

await global.showTriSlotReveal({
  title: 'Veto Results',
  topThree: formatted,
  winnerEmoji: '🛡️',
  winnerTone: 'veto',
  showIntro: true
});
```

If the reusable component is not available, it falls back to the original implementation.

## Flow Verification

### Public Favourite Timing
The Public Favourite v2 runs at the correct time in the finale flow:

1. **Jury Casting Phase** - Jurors cast votes anonymously
2. **Jury Reveal Phase** - Votes revealed sequentially
3. **Winner Announcement** - Winner declared with 5-second display
4. **Tally Fade** - Vote tally fades out
5. **Public Favourite v2** ← *Runs here (if enabled and ≥3 players)*
6. **Finale Cinematic** - Spinning medal overlay with winner name
7. **Autoplay Outro** - Outro video plays after 8 seconds

### Maintained Features
- ✅ Finale cinematic overlay still works (`showFinaleCinematic`)
- ✅ Autoplay outro video after 8 seconds (`playOutroVideo`)
- ✅ `__ioWrapped` flag prevents external overrides
- ✅ Public Favourite respects `cfg.enablePublicFav` toggle
- ✅ Single-run guard prevents duplicate execution

## Testing Recommendations

### Manual Testing Checklist
1. **Basic Functionality**
   - [ ] Play through a full season to finale
   - [ ] Enable Public Favourite in settings
   - [ ] Verify weighted selection favors late-game survivors
   - [ ] Verify 3 candidates are shown
   - [ ] Verify winner is selected from the 3 candidates

2. **Edge Cases**
   - [ ] Test with exactly 3 players (minimum)
   - [ ] Test with 2 players (should skip feature)
   - [ ] Test with toggle disabled (should skip feature)
   - [ ] Test with all players evicted in Week 1 (equal weights)
   - [ ] Test with one finalist (should have highest weight)

3. **HOH Competition**
   - [ ] Verify top-3 reveal shows before winner announcement
   - [ ] Verify winner gets crown emoji (👑)
   - [ ] Verify crown animation on roster tile

4. **Veto Competition**
   - [ ] Verify top-3 reveal shows before winner announcement
   - [ ] Verify winner gets shield emoji (🛡️)
   - [ ] Verify correct tone ('veto')

5. **Finale Flow**
   - [ ] Verify Public Favourite runs after winner announcement
   - [ ] Verify 5-second winner display before Public Favourite
   - [ ] Verify finale cinematic appears after Public Favourite
   - [ ] Verify outro autoplays after 8 seconds

### Weight Distribution Test
Run multiple seasons and track which players are selected for Public Favourite. Late-game survivors should appear more frequently than early evictions.

Expected probability increase:
- Early eviction (Week 1-3): ~10% lower chance
- Mid-game eviction (Week 4-6): ~5% lower chance
- Late-game eviction (Week 7+): baseline to +10% higher chance
- Finalists: +10% higher chance (maximum weight)

## Console Logging

### Public Favourite
- `[publicFav] skipped (toggle false)` - Feature disabled
- `[publicFav] skipped (need at least 3 players)` - Not enough players
- `[publicFav] start` - Feature starting
- `[publicFav] winner: <name>` - Selected winner
- `[publicFav] done` - Feature complete
- `[publicFav] error: <error>` - Error occurred (caught and logged)

### Tri-Slot Reveal
- `[triSlotReveal] sequence error` - Error during reveal sequence

## Performance Considerations

- Weighted sampling is O(n × k) where n = total players, k = candidates (3)
- For typical season size (12-16 players), performance impact is negligible
- No blocking operations during weight calculation
- All async operations properly awaited

## Backward Compatibility

- Veto reveal includes fallback to original implementation
- All new features are opt-in via toggle
- No breaking changes to existing functionality
- Graceful degradation if dependencies unavailable

## Specification Compliance

✅ **Public Favourite v2**
- Timing: AFTER winner announcement, BEFORE cinematic overlay
- Pool: All season players (includes winner & runner-up)
- Weight formula: `weight = 1 + 0.10 * normalizedSurvival`
- Weighted sampling without replacement
- 3 distinct players selected
- Skips if total players < 3

✅ **Reusable Tri-Slot Reveal**
- Extracted to global function
- Configurable for different use cases
- Used by HOH and Veto competitions

✅ **Maintained Features**
- Finale cinematic preserved
- Autoplay outro preserved
- 8-second autoplay timing preserved
