# Profile Modal Data Replication Fix

## Problem
When users filled in the profile modal with custom values for name, photo, age, occupation, and location, only the photo and name were correctly displayed in the game profile during the opening sequence. The age, occupation, and location fields showed randomized values instead of the user's input.

## Root Cause Analysis

### Data Flow Before Fix

```
1. User fills profile modal:
   ├─ name: "Alex"
   ├─ age: "28"
   ├─ location: "New York, USA"
   └─ occupation: "Software Developer"

2. Profile modal saves to localStorage and updates player object:
   ├─ humanPlayer.name = "Alex" ✓
   ├─ humanPlayer.age = "28" ✓
   ├─ humanPlayer.location = "New York, USA" ✓
   ├─ humanPlayer.occupation = "Software Developer" ✓
   ├─ humanPlayer.meta.age = 28 ✓
   ├─ humanPlayer.meta.location = "New York, USA" ✓
   ├─ humanPlayer.meta.occupation = "Software Developer" ✓
   └─ humanPlayer.bio.* = NOT UPDATED ✗ <-- THE BUG

3. Opening sequence calls buildProfileCard():
   ├─ Reads from player.bio object
   ├─ bio.age = "—" (fallback value) ✗
   ├─ bio.location = "—" (fallback value) ✗
   └─ bio.occupation = "—" (fallback value) ✗
   
4. Profile card displays randomized/fallback data instead of user input ✗
```

### Why This Happened

The `buildProfileCard()` function (in `ui.hud-and-router.js`) reads profile data from `player.bio` object:

```javascript
function buildProfileCard(p){
  const bio = p.bio || {};
  const age = bio.age || '—';        // ← Reads from bio
  const location = bio.location || '—';  // ← Reads from bio
  const occupation = bio.occupation || '—';  // ← Reads from bio
  // ... displays these values in the card
}
```

But the profile modal only updated:
- `player.name`, `player.age`, `player.location`, `player.occupation` (top-level)
- `player.meta.age`, `player.meta.location`, `player.meta.occupation` (meta object)

It **never updated** `player.bio.*`, which is what the profile cards actually display.

## Solution

Updated two files to ensure `player.bio` is synchronized with user input:

### 1. `js/player-profile-modal.js` - `startWithProfile()` function

Added bio object update after meta object update:

```javascript
// Update bio object (used by profile cards during opening sequence)
if (!humanPlayer.bio) humanPlayer.bio = {};
if (profile.age) humanPlayer.bio.age = profile.age;
if (profile.location) humanPlayer.bio.location = profile.location;
if (profile.occupation) humanPlayer.bio.occupation = profile.occupation;
```

### 2. `js/finale.js` - `applyPreseedProfile()` function

Added bio and meta object updates for profile restoration when starting a new season:

```javascript
// Update meta object
if(!me.meta) me.meta = {};
if(p.age) me.meta.age = parseInt(p.age, 10) || me.meta.age;
if(p.location) me.meta.location = p.location;
if(p.occupation) me.meta.occupation = p.occupation;
// Update bio object (used by profile cards)
if(!me.bio) me.bio = {};
if(p.age) me.bio.age = p.age;
if(p.location) me.bio.location = p.location;
if(p.occupation) me.bio.occupation = p.occupation;
```

## Data Flow After Fix

```
1. User fills profile modal:
   ├─ name: "Alex"
   ├─ age: "28"
   ├─ location: "New York, USA"
   └─ occupation: "Software Developer"

2. Profile modal saves to localStorage and updates player object:
   ├─ humanPlayer.name = "Alex" ✓
   ├─ humanPlayer.age = "28" ✓
   ├─ humanPlayer.location = "New York, USA" ✓
   ├─ humanPlayer.occupation = "Software Developer" ✓
   ├─ humanPlayer.meta.age = 28 ✓
   ├─ humanPlayer.meta.location = "New York, USA" ✓
   ├─ humanPlayer.meta.occupation = "Software Developer" ✓
   ├─ humanPlayer.bio.age = "28" ✓ <-- FIXED
   ├─ humanPlayer.bio.location = "New York, USA" ✓ <-- FIXED
   └─ humanPlayer.bio.occupation = "Software Developer" ✓ <-- FIXED

3. Opening sequence calls buildProfileCard():
   ├─ Reads from player.bio object
   ├─ bio.age = "28" ✓ <-- NOW CORRECT
   ├─ bio.location = "New York, USA" ✓ <-- NOW CORRECT
   └─ bio.occupation = "Software Developer" ✓ <-- NOW CORRECT
   
4. Profile card displays user's actual input ✓
```

## Impact

### Files Modified
- `js/player-profile-modal.js` (3 lines added)
- `js/finale.js` (10 lines added)

### Files Created
- `test_profile_bio_update.html` - Comprehensive test to verify the fix

### What's Fixed
✅ Age from profile modal now appears in opening sequence  
✅ Location from profile modal now appears in opening sequence  
✅ Occupation from profile modal now appears in opening sequence  
✅ Profile data correctly displayed in player bio panel  
✅ Profile data persists when starting a new season  

### Edge Cases Handled
- Empty fields: If user doesn't provide age/location/occupation, the bio object is not overwritten (keeps fallback values)
- Missing bio object: Creates bio object if it doesn't exist before updating
- Profile restoration: When starting a new season, the saved profile is correctly applied to all three data structures (top-level, meta, and bio)

## Testing

Created `test_profile_bio_update.html` to verify:
1. Profile data is saved to localStorage
2. All three data structures are updated (top-level, meta, bio)
3. Profile cards read correct values from bio object
4. No regressions in existing functionality

## Minimal Change Principle

This fix adheres to the minimal change principle by:
- Only adding 3 lines to update the bio object in the profile modal
- Only adding 10 lines to update meta and bio objects in the finale profile restoration
- No changes to existing logic or data flow
- No changes to the UI or display code
- No breaking changes to existing functionality
