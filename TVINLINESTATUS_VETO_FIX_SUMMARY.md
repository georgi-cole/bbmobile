# TVInlineStatus Veto Competition Fix - Summary

## Issue Description
The status bar next to the skip-timer (TVInlineStatus) was not showing contextual messages during the `veto_comp` phase. When the human player was not selected to play, it previously displayed a message like:
> "You are not playing Veto. Participants: A, B, C, D, E, F"

Instead, it showed nothing while the timer ran, leaving users without feedback.

## Root Cause Analysis

### Primary Issue
The `veto.js` module was using `window.TvStatus` API from `tv-overlay-status.js`, but this module is **NOT** loaded in `index.html`. The correct module is `window.TVInlineStatus` from `tv-inline-status.js`, which **IS** loaded.

### API Mismatch
- `TvStatus` has method: `setPlayersAndNote(players, note)`
- `TVInlineStatus` has method: `set(message, tone)`

The code needed to be adapted to format the participant list as a single message string instead of using the non-existent `setPlayersAndNote` method.

## Solution

### Files Modified
- `js/veto.js` - Updated 5 locations to use `TVInlineStatus` instead of `TvStatus`

### Changes Made

#### 1. Human Submission Status (Line 268-269)
**Before:**
```javascript
if(window.TvStatus?.set){
  window.TvStatus.set('Submission received. Waiting for others…');
}
```

**After:**
```javascript
if(window.TVInlineStatus?.set){
  window.TVInlineStatus.set('Submission received. Waiting for others…');
}
```

#### 2. Waiting for Profile Status (Line 362-363)
**Before:**
```javascript
if (window.TvStatus && window.TvStatus.set) {
  window.TvStatus.set('Waiting for player profile…');
}
```

**After:**
```javascript
if (window.TVInlineStatus && window.TVInlineStatus.set) {
  window.TVInlineStatus.set('Waiting for player profile…');
}
```

#### 3. General Participant List (Line 437-442) - KEY CHANGE
**Before:**
```javascript
var list = Array.isArray(g.__vetoPlayers) ? g.__vetoPlayers.map(safeName) : [];
if(window.TvStatus?.setPlayersAndNote){
  window.TvStatus.setPlayersAndNote(list, 'Competition in progress');
}
```

**After:**
```javascript
// Show player list using inline status chip - format as single message
var list = Array.isArray(g.__vetoPlayers) ? g.__vetoPlayers.map(safeName) : [];
if(window.TVInlineStatus?.set && list.length > 0){
  var statusMsg = 'Veto Participants: ' + list.join(', ');
  window.TVInlineStatus.set(statusMsg, 'muted');
}
```

#### 4. Error Status (Line 473-474)
**Before:**
```javascript
if (window.TvStatus && window.TvStatus.set) {
  window.TvStatus.set('Error: Player profile not loaded. Please refresh the page.');
}
```

**After:**
```javascript
if (window.TVInlineStatus && window.TVInlineStatus.set) {
  window.TVInlineStatus.set('Error: Player profile not loaded. Please refresh the page.', 'error');
}
```

#### 5. Non-Participating Human Message (Line 523-528) - MAIN FIX
**Before:**
```javascript
console.info('[veto.js] Human not eligible for this veto competition');
if(window.TvStatus?.set){
  window.TvStatus.set('You were not drawn to play in this Veto.');
}
```

**After:**
```javascript
// Human not drawn to play - show note using inline status with participant list
console.info('[veto.js] Human not eligible for this veto competition');
if(window.TVInlineStatus?.set){
  var participantNames = list.join(', ');
  window.TVInlineStatus.set('You are not playing Veto. Participants: ' + participantNames, 'muted');
}
```

## Message Flow

### When Veto Competition Starts

1. **Phase Change**
   - `setPhase('veto_comp', ...)` is called
   - `bb:phase:changed` event fires → TVInlineStatus auto-clears

2. **Initial Status Set**
   - Immediately after phase change: `"Veto Participants: Alice, Bob, Charlie, ..."`
   - Shows all participants regardless of human eligibility

3. **Async Eligibility Check**
   - Code waits for human profile to load (up to 5 seconds)
   - Determines if human is in `__vetoPlayers` array

4. **Status Update Based on Eligibility**
   - **Human IS playing**: Minigame renders, status may show submission message
   - **Human NOT playing**: Status updates to `"You are not playing Veto. Participants: Alice, Bob, ..."`

5. **Status Persistence**
   - Message remains visible during the entire competition timer
   - Only cleared on next phase change

## Testing

### Test File Created
`test_tvinlinestatus_veto.html` - Comprehensive test with two scenarios:

1. **Scenario 1: Human IS Selected**
   - Verifies initial participant list is shown
   - Verifies submission message appears after human submits

2. **Scenario 2: Human NOT Selected** (Main Issue)
   - Verifies "You are not playing Veto" message is shown
   - Verifies participant list is included
   - Verifies status persists for at least 2 seconds

### How to Test
1. Open `test_tvinlinestatus_veto.html` in a browser
2. Click "Run Scenario 1" or "Run Scenario 2"
3. Observe the mock TV header for status messages
4. Check the test results section for pass/fail indicators
5. Review console log for detailed execution trace

### Integration Testing
To test in the actual game:
1. Start a new season
2. Progress to Week 2 (or any week with enough players)
3. Complete HOH and nominations
4. When veto competition starts, observe the status bar next to the skip timer
5. If human is NOT selected:
   - Status should show: "You are not playing Veto. Participants: [names]"
   - Message should persist during the 40-second timer

## Acceptance Criteria Met

✅ **Veto Competition (veto_comp)**:
- If the human is not participating, status shows "You are not playing Veto. Participants: [names]"
- Status is set appropriately on phase transitions
- Status persists during competition (integrated with SkipController - no conflicts)

## Additional Notes

### Why This Fixes The Issue
1. **Correct Module**: Using `TVInlineStatus` (loaded) instead of `TvStatus` (not loaded)
2. **Proper Timing**: Status set immediately after phase change completes
3. **Complete Information**: Includes participant list so user knows who is competing
4. **Persistence**: No code clears the status until next phase change

### Related Modules
The following modules also use `window.TvStatus` but were not changed as they're out of scope:
- `js/competitions.js` - Generic competition handling
- `js/jury_return.js` - Jury return challenge
- `js/twists.js` - America's Vote completion

These could be updated in a separate PR if the same issue is reported for other phases.

### No Breaking Changes
- All existing tests pass
- No ESLint errors introduced
- No security vulnerabilities detected (CodeQL passed)
- Backwards compatible (uses optional chaining `?.`)

## Security Summary
✅ No security vulnerabilities discovered or introduced
✅ CodeQL analysis: 0 alerts
✅ All validation tests passing
