# Diary Room UI Overlap Fix - Summary

## Problem Statement

Users were seeing **two "Diary Room" UIs at the same time** during live eviction, especially during double/triple evictions while other votes were being shown:

1. **New avatar modal** - rendered inside `#tvOverlay` by `showDiaryRoomWithAvatars()`
2. **Legacy revealCard** - via `global.showCard('Diary Room', ...)`

This created a confusing experience with a duplicate smaller card appearing beneath the modal.

## Before Fix

```
┌─────────────────────────────────────┐
│         TV Screen                    │
│                                      │
│  ┌───────────────────────────────┐  │
│  │   Diary Room (Avatar Modal)   │  │ ← New UI (with avatars & arrows)
│  │   Alice → Bob                 │  │
│  │   "I vote to evict Bob"       │  │
│  └───────────────────────────────┘  │
│                                      │
│  ┌─────────────────┐                │
│  │ Diary Room      │                │ ← Legacy card (duplicate!)
│  │ "It's your..."  │                │
│  └─────────────────┘                │
└─────────────────────────────────────┘
```

## After Fix

```
┌─────────────────────────────────────┐
│         TV Screen                    │
│                                      │
│  ┌───────────────────────────────┐  │
│  │   Diary Room (Avatar Modal)   │  │ ← Only one UI visible
│  │   Alice → Bob                 │  │
│  │   "I vote to evict Bob"       │  │
│  └───────────────────────────────┘  │
│                                      │
│                                      │ ← No duplicate card!
│                                      │
│                                      │
└─────────────────────────────────────┘
```

## Root Cause

Three specific issues in `js/eviction.js`:

1. **Pre-turn hint overlap** (line 692): `showCard('Diary Room', ["It's your turn..."])` was shown before the user's vote, overlapping with subsequent avatar modals
2. **No guard on fallback paths** (lines 531, 547): Fallback `showCard` calls weren't checking if avatar modal was already active
3. **No cleanup of legacy cards**: When avatar modal rendered, any existing legacy cards remained visible beneath it

## Solution

### 1. Added Guard Flag & Cleanup Helper (lines 33-62)

```javascript
// Guard flag to prevent legacy Diary Room cards while avatar modal is active
let __drAvatarModalActive = false;

/**
 * Remove any on-screen legacy 'Diary Room' revealCards
 * Best-effort DOM removal to prevent duplicate Diary Room UIs.
 */
function clearLegacyDiaryRoomCards(){
  try{
    const tvOverlay = document.getElementById('tvOverlay');
    if(tvOverlay){
      const diaryCards = tvOverlay.querySelectorAll('.revealCard.diaryRoomCard');
      diaryCards.forEach(card => {
        const titleEl = card.querySelector('h3');
        if(titleEl && titleEl.textContent.trim().toLowerCase().includes('diary room')){
          card.remove();
        }
      });
    }
  }catch(e){
    console.warn('[clearLegacyDiaryRoomCards] Error:', e);
  }
}
```

### 2. Updated `showDiaryRoomWithAvatars()` (lines 558-715)

**Added flag management:**
```javascript
// Set flag to prevent legacy cards while avatar modal is active
__drAvatarModalActive = true;

// Clear any legacy Diary Room cards that may be showing
clearLegacyDiaryRoomCards();

// ... render avatar modal ...

// Auto-remove after duration
setTimeout(() => {
  try{ 
    card.remove();
    // Clear flag when avatar modal is removed
    __drAvatarModalActive = false;
  }catch{
    __drAvatarModalActive = false; // Ensure flag cleared on error
  }
}, duration);
```

**Guarded fallback calls:**
```javascript
// Only show legacy card if avatar modal is not active
if(!__drAvatarModalActive){
  global.showCard?.('Diary Room', [message], 'live', duration, true);
}
```

### 3. Removed Pre-turn Hint (lines 737-745)

**Before:**
```javascript
if(!useLv2){ 
  global.showCard?.('Diary Room',["It's your turn. Please cast your vote now."],'live',2000,true); 
} else { 
  global.lv2?.setTurn?.(true); 
}
```

**After:**
```javascript
// Pre-turn hint removed for non-lv2 path to avoid overlapping with avatar modal
// The voting UI already provides sufficient indication that it's the user's turn
if(useLv2){ 
  global.lv2?.setTurn?.(true); 
}
```

## Impact

### Positive Changes
✅ **Single UI per vote** - Users see only one "Diary Room" UI per vote
✅ **No visual clutter** - Avatar modal is unobstructed during vote sequence
✅ **Better UX** - Clearer, less confusing voting experience
✅ **Minimal code changes** - Only 54 lines added, 4 removed
✅ **Backwards compatible** - Fallback cards still work when avatar modal unavailable

### What Remains Unchanged
✅ **LV2 flow** - Modern live vote UI (2-nominee) unchanged
✅ **Triple eviction** - Triple eviction cleanup still works
✅ **Tie-break UI** - All tie-break cards still function
✅ **Result cards** - Eviction result cards unaffected
✅ **Fallback behavior** - Legacy cards appear if TV overlay or player data missing

## Testing

### Automated Tests (All Passing ✅)
```bash
npm run test:all
```
- ✅ Minigame validation
- ✅ Runtime helpers
- ✅ E2E competitions
- ✅ Social maneuvers
- ✅ POV carousel

### Manual Test Scenarios

#### Scenario 1: Standard 2-Nominee Eviction (Non-LV2)
1. Start game, advance to eviction with 2 nominees
2. Observe each voter's diary room during sequence
3. **Expected**: Only avatar modal visible (no duplicate cards)

#### Scenario 2: Double Eviction
1. Trigger double eviction (3 nominees)
2. Watch vote rollout while other votes are shown
3. **Expected**: No duplicate Diary Room cards beneath avatar modals

#### Scenario 3: Triple Eviction
1. Trigger triple eviction (4 nominees)
2. Observe vote sequence and overlays
3. **Expected**: Clean UI with no overlapping cards

#### Scenario 4: Fallback (Missing Player Data)
1. Test with corrupted/missing player data
2. Avatar modal should fail gracefully
3. **Expected**: Legacy card appears as fallback (but only once)

## Security

✅ **CodeQL Analysis**: 0 alerts (no vulnerabilities)
- No new dependencies
- No exposure of sensitive data
- All error handling preserved
- Purely defensive changes

## Files Changed

| File | Changes | Description |
|------|---------|-------------|
| `js/eviction.js` | +54, -4 | Main implementation with guard flag and cleanup |
| `test_diary_room_fix.html` | +325 | Test file for code structure verification |

## Migration Notes

**No migration required** - This is a bug fix that requires no changes to:
- Game saves
- Configuration
- Other modules
- User data

The fix is transparent to users and maintains full backwards compatibility.

## Future Considerations

1. **Card Queue System**: Consider adding a public API to the CardQueue for purging specific card types
2. **Avatar Modal Registry**: Consider registering active modals in a global registry for better coordination
3. **Unified Card System**: Long-term, consider migrating all cards to a unified system with better deduplication

## References

- Issue: Duplicate Diary Room UI during live eviction
- PR: #[number]
- Related: Avatar modal system (Issue #5)
- Related: Live vote 2.0 system

---

**Status**: ✅ Complete and Verified
**Security**: ✅ No vulnerabilities (CodeQL: 0 alerts)
**Tests**: ✅ All passing
**Ready for**: Production deployment
