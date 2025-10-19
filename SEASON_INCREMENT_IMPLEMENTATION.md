# Season Increment on Restart - Implementation Summary

## Problem
After completing a game and closing the finale modal, if the player uses the standard Restart Season flow (instead of the "NEW SEASON" button in the finale modal), the season should still increment by +1 for the same profile.

## Solution Overview
The solution implements a completion tracking system using localStorage flags that marks when a game is completed and which profile completed it. When the same profile is selected after a restart, the season is automatically incremented.

## Changes Made

### 1. js/finale.js
**Location:** `showFinaleCinematic()` function

**Changes:**
- Added logic to mark the game as completed when the finale modal is shown (winner declared)
- Sets two localStorage keys:
  - `bb.lastGameCompleted = '1'` - marks that a game was completed
  - `bb.lastGameCompletedProfileId = <profileId>` - stores which profile completed the game
- Only sets the profile ID if ProfileService is available, not in guest mode, and a profile exists

**Code:**
```javascript
// Mark game as completed for season increment logic
try {
  localStorage.setItem('bb.lastGameCompleted', '1');
  // Store the profile ID that completed the game (if available)
  if (g.ProfileService && !g.ProfileService.isGuestMode()) {
    const profile = g.ProfileService.getCurrentProfile();
    if (profile && profile.id) {
      localStorage.setItem('bb.lastGameCompletedProfileId', profile.id);
      console.info('[finale] marked game as completed for profile:', profile.id);
    }
  }
} catch (e) {
  console.warn('[finale] failed to mark game as completed:', e);
}
```

### 2. src/profile/profileService.js
**Location:** New function `checkAndIncrementSeasonForProfile()` + updated `setCurrentProfile()`

**Changes:**
- Added `checkAndIncrementSeasonForProfile()` helper function that:
  - Checks if `bb.lastGameCompleted` flag is set
  - Verifies the profile ID matches `bb.lastGameCompletedProfileId`
  - Increments the profile's season number if conditions are met
  - Persists the updated season to ProfileStorage
  - Clears the completion flags to prevent double-increment
  - Logs all actions for debugging

- Modified `setCurrentProfile()` to call the check function before applying the profile to the game

**Code:**
```javascript
// Check if last game was completed with this profile and increment season
function checkAndIncrementSeasonForProfile(profile) {
  if (!profile || !profile.id) return;
  
  try {
    // Check if last game was completed
    const gameCompleted = localStorage.getItem('bb.lastGameCompleted');
    if (gameCompleted !== '1') {
      console.info('[profileService] no completed game found, skipping season increment');
      return;
    }

    // Check if the same profile completed the last game
    const completedProfileId = localStorage.getItem('bb.lastGameCompletedProfileId');
    if (completedProfileId && completedProfileId === profile.id) {
      console.info('[profileService] same profile detected - incrementing season for profile:', profile.id);
      
      // Increment season in the profile object
      const nextSeason = (profile.season || 1) + 1;
      profile.season = nextSeason;
      
      // Persist to storage
      global.ProfileStorage.updateProfile(profile.id, {
        season: nextSeason,
        updatedAt: Date.now()
      });
      
      // Clear the completion flags after incrementing
      localStorage.removeItem('bb.lastGameCompleted');
      localStorage.removeItem('bb.lastGameCompletedProfileId');
      
      console.info('[profileService] season incremented to', nextSeason);
    } else {
      console.info('[profileService] different profile or no profile match - not incrementing season');
    }
  } catch (e) {
    console.error('[profileService] failed to check/increment season:', e);
  }
}
```

### 3. test_season_increment_on_restart.html
**Purpose:** Comprehensive test file to validate the implementation

**Test Cases:**
1. **Finale Marks Game as Completed** - Verifies localStorage flags are set
2. **ProfileService Increments on Profile Selection** - Verifies season increments for same profile
3. **Different Profile Does Not Increment** - Verifies season doesn't increment for different profile
4. **Guest Mode Does Not Increment** - Verifies guest mode behavior
5. **Completion Flags Are Cleared** - Verifies flags are cleared to prevent double-increment
6. **Full Flow Integration Test** - Tests the complete user flow

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Game Completes (Finale)                                  │
│    └─> showFinaleCinematic() called                         │
│        └─> Set bb.lastGameCompleted = '1'                   │
│        └─> Set bb.lastGameCompletedProfileId = <profileId>  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. User Closes Modal & Clicks Restart                       │
│    └─> location.reload() called                             │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Page Reloads & Profile Modal Appears                     │
│    └─> User selects profile                                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. ProfileService.setCurrentProfile() Called                │
│    └─> checkAndIncrementSeasonForProfile() runs             │
│        ├─> Check bb.lastGameCompleted == '1'                │
│        ├─> Check bb.lastGameCompletedProfileId == profile.id│
│        ├─> If match: season++                               │
│        ├─> Persist to ProfileStorage                        │
│        └─> Clear completion flags                           │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Game Starts with Incremented Season                      │
└─────────────────────────────────────────────────────────────┘
```

## Edge Cases Handled

1. **Guest Mode**: Season does not increment (guests don't have seasons)
2. **Different Profile**: Season only increments if the SAME profile is selected
3. **No Profile ID**: If profile system is not available, no error occurs
4. **Double Increment Prevention**: Completion flags are cleared after increment
5. **Error Handling**: Try-catch blocks prevent crashes from localStorage errors

## Testing

To test the implementation:
1. Open `test_season_increment_on_restart.html` in a browser
2. Run each individual test or the full flow test
3. Verify all tests pass
4. Check console logs for detailed debugging information

## Compatibility

- Works with existing profile system (ProfileService, ProfileStorage)
- Backward compatible (no breaking changes)
- Does not affect guest mode
- Does not interfere with the "NEW SEASON" button in finale modal (which has its own increment logic)

## Benefits

1. **Better UX**: Users don't lose season progression when using standard restart flow
2. **Consistent Behavior**: Season increments regardless of which restart method is used
3. **Profile-Specific**: Only increments for the same profile that completed the game
4. **Safe**: Prevents double-increment and handles all edge cases
