# Timer Shortening Fix - Verification Guide

## Summary of Changes

This fix addresses two issues:

1. **Idle Timer After Competition Submission**: When a user completes a competition, they no longer have to wait for the full timer duration. The timer is automatically shortened to 1 second when all scores are collected.

2. **Console Error - charCodeAt is not a function**: Fixed error in Final HOH ceremony where numeric player IDs were being used with `.charCodeAt()` method.

## Files Modified

### 1. `js/competitions.js`

#### Added: `shortenPhaseTimerToFinish()` helper function
- **Location**: Line ~238
- **Purpose**: Shortens phase timer to 1 second when all competition scores are collected
- **Behavior**: 
  - Only activates during competition phases (hoh, veto, veto_comp, final3_comp1/2/3)
  - Tries multiple timer APIs in order of preference:
    1. `global.schedulePhaseAdvanceIn(1000)`
    2. `global.GameTimer.shortenCurrentByMs(remaining - 1000)`
    3. `global.setPhaseDurationMs(1000)`
  - Logs which API was used for debugging
  - Returns `true` if successful, `false` otherwise

#### Updated: `generateSyntheticOpponents()`
- **Location**: Line ~362
- **Change**: Calls `shortenPhaseTimerToFinish()` after generating AI opponent scores
- **Impact**: Timer shortens immediately after human player submits and AI scores are generated

#### Updated: `maybeFinishComp()`
- **Location**: Line ~429
- **Changes**: 
  - Now handles multiple phase types: HOH, veto, and Final 3
  - For HOH: Shortens timer and calls `finishCompPhase()`
  - For veto/Final 3: Only shortens timer (finish logic handled elsewhere)
  - Checks if all eligible players have scores before shortening

### 2. `js/human-hoh-ceremony.js`

#### Fixed: `generateNomineePlea()` function
- **Location**: Lines 297-298 and 312-314
- **Issue**: Numeric player IDs (1, 2, 3, etc.) were being used with `.charCodeAt()` method
- **Fix**: Convert IDs to strings before calling `.charCodeAt()`
- **Pattern used**: `String(id !== null && id !== undefined ? id : '')`
- **Impact**: Eliminates console error when Final HOH ceremony loads

## Expected Behavior After Fix

### Competition Flow (HOH, Veto, Final 3)
1. User plays minigame
2. User submits score or closes minigame
3. Results modal shows their score
4. **NEW**: Timer immediately shortened to ~1 second
5. Winner reveal shows almost immediately (no idle waiting)

### Final HOH Ceremony
1. Human is Final HOH
2. Decision panel loads
3. **NEW**: No console errors about `.charCodeAt is not a function`
4. Nominee pleas display correctly

## Testing Checklist

### Manual Testing

#### HOH Competition
- [ ] Start new game
- [ ] Play HOH competition
- [ ] Submit score
- [ ] Verify: No long idle period after submission
- [ ] Verify: Winner reveal appears within ~1-2 seconds
- [ ] Check console: Should see "[Competition] Shortening phase timer to finish"

#### Veto Competition
- [ ] Play veto competition
- [ ] Submit score
- [ ] Verify: No long idle period after submission
- [ ] Verify: Results appear quickly

#### Final 3 Competitions
- [ ] Play Final 3 Part 1
- [ ] Submit score
- [ ] Verify: No idle waiting after submission
- [ ] Check console: Should see "[final3_comp1] All scores collected, shortening timer"

- [ ] Play Final 3 Part 2
- [ ] Submit score
- [ ] Verify: No idle waiting after submission

- [ ] Play Final 3 Part 3
- [ ] Submit score
- [ ] Verify: No idle waiting after submission

#### Final HOH Ceremony
- [ ] Reach Final 3
- [ ] Win Part 3 as human player
- [ ] Open Final HOH decision panel
- [ ] Check console: Should NOT see "charCodeAt is not a function" error
- [ ] Verify: Nominee pleas display correctly
- [ ] Verify: Can make eviction decision without errors

### Console Verification

Expected console messages after fix:
```
[Competition] Shortening phase timer to finish
[Competition] ✓ Timer shortened via schedulePhaseAdvanceIn
```

OR

```
[Competition] Shortening phase timer to finish
[Competition] ✓ Timer shortened via GameTimer.shortenCurrentByMs
```

OR

```
[Competition] Shortening phase timer to finish
[Competition] ✓ Timer shortened via setPhaseDurationMs
```

Should NOT see:
```
Uncaught TypeError: (nominee.id || "").charCodeAt is not a function
```

## Technical Details

### Timer APIs Tried (in order)
1. **schedulePhaseAdvanceIn**: Most direct - sets absolute time for phase advance
2. **GameTimer.shortenCurrentByMs**: Reduces remaining time by specified amount
3. **setPhaseDurationMs**: Sets total phase duration

### Phase Detection
Competition phases checked:
- `'hoh'`
- `'veto'`
- `'veto_comp'`
- `'final3_comp1'`
- `'final3_comp2'`
- `'final3_comp3'`

Non-competition phases (ignored):
- `'eviction'`
- `'nomination'`
- `'veto_ceremony'`
- etc.

### Edge Cases Handled

1. **No timer API available**: Logs warning but doesn't crash
2. **Timer already short (<1.5s)**: Doesn't attempt to shorten further
3. **Non-competition phase**: Skips timer shortening
4. **Null/undefined player IDs**: Converts to empty string for charCodeAt

## Performance Impact

- Minimal: Only adds one function call per competition completion
- No impact on render performance
- Slightly faster UX (user sees results 10-15 seconds sooner)

## Backwards Compatibility

- Works with both new OpponentSynth system and legacy AI score generation
- Compatible with all timer APIs (tries multiple, uses whichever is available)
- Falls back gracefully if no timer API is present

## Known Limitations

- Timer shortening only works if at least one timer API is available
- If game uses custom timer system, may need additional integration
- Does not affect phases that don't use the competition scoring system

## Related Files

- `js/competitions-flow.js`: Contains similar timer shortening logic for immediate results
- `js/veto.js`: Handles veto competition finish logic
- `js/social-maneuvers.js`: Contains other examples of timer manipulation

## Testing Commands

```bash
# Run all tests
npm run test:all

# Run specific tests
npm run test:minigames
npm run test:runtime
npm run test:e2e
```

## Rollback Procedure

If this fix causes issues:

1. Revert `js/competitions.js`:
   - Remove `shortenPhaseTimerToFinish()` function
   - Remove call in `generateSyntheticOpponents()`
   - Revert `maybeFinishComp()` to single-phase logic

2. Revert `js/human-hoh-ceremony.js`:
   - Change back to `(nominee.id || '').charCodeAt(0)`
   - Note: This will bring back the console error

## Future Enhancements

Possible improvements:
- Add setting to disable timer shortening for users who prefer original pacing
- Make timer shortening configurable (1s default, could be 0.5s or 2s)
- Add visual indicator when timer is shortened
- Extend to other phase types if needed
