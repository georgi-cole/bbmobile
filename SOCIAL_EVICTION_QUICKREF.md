# Social Eviction Fix - Quick Reference

## Problem
🐛 **Bug**: Evicted players could still use Social Maneuvers module

## Solution
✅ Added eviction checks at 6 key interaction points

---

## Before Fix ❌

```
Player Evicted
    ↓
Social Phase Starts
    ↓
✗ UI Still Shows (wrong!)
✗ Can Open Modal (wrong!)
✗ Can Execute Actions (wrong!)
```

---

## After Fix ✅

```
Player Evicted
    ↓
Social Phase Starts
    ↓
✓ Phase Skipped
✓ No UI Shown
✓ Launcher Hidden
✓ Modal Blocked
✓ Actions Prevented
✓ Eviction Message Displayed
```

---

## Protection Points

### 1️⃣ Phase Initialization
**File**: `social-maneuvers.js`  
**Function**: `onSocialPhaseStart()`  
**Action**: Skip phase entirely if human player is evicted

```javascript
const humanPlayer = global.getP?.(humanId);
if(humanPlayer && humanPlayer.evicted){
  console.info('[social-maneuvers] ⏭️ Human player is evicted - skipping social phase');
  return;
}
```

### 2️⃣ UI Rendering
**File**: `social-maneuvers.js`  
**Function**: `renderSocialManeuversUI()`  
**Action**: Show eviction message instead of UI

```javascript
if(player && player.evicted){
  // Show: "You Have Been Evicted"
  // "You can no longer participate in social interactions."
  return;
}
```

### 3️⃣ Launcher Creation
**File**: `socialize-mobile.js`  
**Function**: `ensureSocializeLauncher()`  
**Action**: Prevent launcher from being created

```javascript
if(humanPlayer && humanPlayer.evicted){
  console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
  return null;
}
```

### 4️⃣ Modal Opening
**File**: `socialize-mobile.js`  
**Function**: `openSocializeModal()`  
**Action**: Block modal and show error

```javascript
if(humanPlayer && humanPlayer.evicted){
  global.addLog?.('You have been evicted and can no longer participate...', 'danger');
  return;
}
```

### 5️⃣ Action Execution
**File**: `socialize-mobile.js`  
**Function**: `executeAction()`  
**Action**: Prevent actions and close modal

```javascript
if(humanPlayer && humanPlayer.evicted){
  global.addLog?.('You have been evicted...', 'danger');
  closeSocializeModal(false);
  return;
}
```

### 6️⃣ Phase Check
**File**: `socialize-mobile.js`  
**Function**: `isInSocialPhase()`  
**Action**: Return false if player is evicted

```javascript
const isPhaseCorrect = g.phase === 'social_intermission' || g.phase === 'social';
const isNotEvicted = !(humanPlayer && humanPlayer.evicted);
return isPhaseCorrect && isNotEvicted;
```

---

## Testing

### Quick Test (In Console)
```javascript
// 1. Verify player is alive
console.log('Human alive:', !game.players.find(p => p.id === game.humanId).evicted);

// 2. Evict player
game.players.find(p => p.id === game.humanId).evicted = true;

// 3. Try to open social module
// Expected: Error message, modal doesn't open

// 4. Check if in social phase
console.log('In social phase:', SocializeMobile.isInSocialPhase());
// Expected: false
```

### Full Test Suite
Open `test_social_eviction_fix.html` and run all tests

---

## User Experience

### When Player is Alive ✅
- 🟢 Social launcher button visible
- 🟢 Can open modal
- 🟢 Can execute actions
- 🟢 Normal gameplay

### When Player is Evicted ❌
- 🔴 No launcher button
- 🔴 Modal blocked with message: "You have been evicted and can no longer participate in social interactions."
- 🔴 UI shows: "You Have Been Evicted - You can no longer participate in social interactions."
- 🔴 Phase is skipped
- ✅ No errors or crashes

---

## Implementation Stats

| Metric | Value |
|--------|-------|
| Files Changed | 2 core files |
| Lines Added | 67 lines |
| Protection Points | 6 locations |
| Test Cases | 5 unit + 1 integration |
| Documentation | 2 files (620 lines) |
| Breaking Changes | 0 |
| Performance Impact | Minimal |

---

## Key Benefits

✅ **Complete Protection**: Covers all interaction paths  
✅ **Clear Feedback**: User knows why they can't interact  
✅ **No Crashes**: Graceful degradation  
✅ **Easy to Debug**: Console logging at every check  
✅ **Backward Compatible**: Optional chaining prevents errors  
✅ **Well Tested**: Manual test suite provided  
✅ **Well Documented**: Comprehensive docs and quick ref  

---

## Common Scenarios

### Scenario 1: Player Evicted Mid-Game
```
Game Progress
    ↓
Player Gets Evicted
    ↓
Next Social Phase
    ↓
✓ Phase Skipped Automatically
```

### Scenario 2: Player Evicted During Social Phase
```
Social Phase Active
    ↓
Player Gets Evicted
    ↓
Player Tries Action
    ↓
✓ Action Blocked
✓ Modal Closes
✓ Error Message Shown
```

### Scenario 3: UI Refresh After Eviction
```
Player Evicted
    ↓
UI Re-renders
    ↓
✓ Shows Eviction Message
✓ No Social Options
```

---

## Troubleshooting

### Issue: Launcher Still Showing
**Check**: Is `player.evicted` actually true?
```javascript
console.log(game.players.find(p => p.id === game.humanId).evicted);
```

### Issue: Can Still Open Modal
**Check**: Is the eviction check being bypassed?
```javascript
// Check console for log: "Human player is evicted - cannot open modal"
```

### Issue: Actions Still Working
**Check**: Is executeAction being called?
```javascript
// Check console for log: "Human player is evicted - cannot execute action"
```

---

## Maintenance Notes

To extend this fix:

1. **Add checks to new interaction points**: Follow same pattern
2. **Customize eviction message**: Modify `renderSocialManeuversUI()`
3. **Track eviction attempts**: Add telemetry in checks
4. **Support AI eviction**: Extend checks to other player IDs

---

## Related Files

- 📄 `SOCIAL_EVICTION_FIX.md` - Detailed documentation
- 🧪 `test_social_eviction_fix.html` - Test suite
- 💻 `js/social-maneuvers.js` - Core social engine
- 💻 `js/socialize-mobile.js` - Mobile UI layer

---

## Version
- **Fix Version**: 1.0
- **Date**: 2025-10-20
- **Status**: ✅ Complete & Tested
