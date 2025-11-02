# Mobile Vote Scroll & Timer Implementation Summary

## Problem Statement
After merging PR #433, users on mobile still sometimes cannot reach the voting UI because the page scroll is locked while the TV area (#tv) is off-screen. Additionally, there is no automatic fallback if a human player does not vote in time.

## Solution Overview
This PR implements two key improvements:
1. **Auto-center TV before locking scroll** - Ensures the TV area is visible before body scroll is locked
2. **30-second auto-vote timer** - Automatically casts a vote based on affinity logic if the player doesn't vote within 30 seconds

## Changes Made

### 1. livevote-helpers.js
**New Function:** `centerTVInViewport(container = null)`
- Returns a Promise that resolves when TV is centered
- Checks if #tv is fully visible (considering safe areas for mobile)
- If not visible, calls `scrollIntoView({ behavior: 'smooth', block: 'center' })`
- Waits 250ms for scroll animation to complete
- Exported to global scope for use in other modules

**Updated Function:** `closeAllVoteUI()`
- Now clears countdown timer intervals/timeouts when closing vote UI
- Ensures countdown is cleaned up on any UI close event

### 2. livevote-voteoverlay.js
**Updated Function:** `show(options)`
- Changed from sync to async function
- Temporarily unlocks scroll if already locked
- Calls `centerTVInViewport()` before showing overlay
- Waits for centering to complete before locking scroll
- Ensures TV is visible when overlay appears

**Updated Function:** `hide()`
- Clears countdown timer intervals/timeouts
- Prevents timer from continuing after overlay is closed

### 3. livevote-choice-card.js
**Updated Function:** `show(options)`
- Changed from sync to async function
- Temporarily unlocks scroll if already locked
- Calls `centerTVInViewport()` for the TV element
- Waits for centering to complete before locking scroll
- Ensures TV is visible when choice card appears

### 4. eviction.js
**New Function:** `startVoteCountdown(seconds, nominees, voters)`
- Starts a countdown timer (default: 30 seconds)
- Updates overlay header every second with countdown display
- Format: "Cast your vote to evict. 00:30"
- On timeout (if no vote cast):
  - Computes auto-pick using existing affinity/threat logic
  - Calls `voteFor2()` for 2 nominees or `voteForMulti()` for >2 nominees
  - Closes vote UI and locks the vote
  - Shows rollout overlay with auto-vote
  - Logs auto-vote action
- Stores interval/timeout handles in `g.eviction._countdownInterval` and `g.eviction._countdownTimeout`

**Updated:** Two-step voting flow in `renderLiveVotePanel()`
- After `LiveVoteOverlay.show()`, starts the countdown timer
- Clears countdown on manual vote submission
- Passes countdown clearing to overlay close handler

## Testing

### Test File: test_mobile_vote_scroll_timer.html
A comprehensive test harness that validates all new functionality:

**Features:**
- Force long page (200vh) to test scrolling behavior
- TV positioned far down the page (900px from top)
- Fixed test controls at top of page
- Scroll to top/bottom buttons
- Two-step flow test (Choice Card → Overlay)
- Direct overlay test
- Real-time status updates

**Test Scenarios:**
1. **Scroll Lock Fix:**
   - Scroll to top or bottom
   - Trigger vote UI
   - Verify TV auto-centers before body scroll locks
   
2. **30s Countdown:**
   - Open overlay
   - Observe countdown in header
   - Wait 30 seconds without voting
   - Verify auto-vote based on affinity logic

3. **Manual Vote:**
   - Open overlay
   - Vote before 30s expires
   - Verify countdown stops
   - Verify no auto-vote occurs

4. **Overlay Close:**
   - Open overlay
   - Close using X button or Escape key
   - Verify countdown clears
   - Verify scroll unlocks

### Manual Testing Steps

#### Mobile Safari/Chrome:
1. Open `test_mobile_vote_scroll_timer.html` on mobile device
2. Scroll to top of page
3. Click "Test Two-Step Vote"
4. **Verify:** TV area scrolls into view smoothly
5. **Verify:** Body scroll is locked
6. **Verify:** Countdown timer shows in overlay header

#### Test Manual Vote:
1. Open vote UI
2. Select a nominee before 30 seconds
3. Click "Evict" button
4. **Verify:** Countdown stops
5. **Verify:** Vote is recorded
6. **Verify:** Scroll is unlocked

#### Test Auto-Vote:
1. Open vote UI
2. Wait full 30 seconds without voting
3. **Verify:** Auto-vote is cast based on affinity
4. **Verify:** Rollout overlay shows auto-vote
5. **Verify:** Log message indicates auto-vote

#### Test Overlay Close:
1. Open vote UI
2. Click X button or press Escape
3. **Verify:** Countdown stops
4. **Verify:** Overlay closes
5. **Verify:** Scroll is unlocked

### Integration Testing
Test in actual game flow:
1. Start a new game with default settings
2. Advance to first eviction ceremony
3. Trigger Live Vote phase
4. **On mobile:** Scroll away from TV area
5. **Verify:** TV centers when vote UI opens
6. **Verify:** Countdown timer displays
7. Complete vote or let timer expire
8. **Verify:** Flow continues normally

## Technical Details

### Scroll Lock Behavior
- Uses `position: fixed` with saved scroll position
- Temporarily unlocks if already locked (defensive)
- Re-locks after TV is centered
- Always unlocks on cleanup

### Countdown Timer
- Uses `setInterval` for UI updates (every 1 second)
- Uses `setTimeout` for auto-vote trigger (30 seconds)
- Both handles stored in `game.eviction` for cleanup
- Cleared on:
  - Manual vote submission
  - Overlay close (X button or Escape)
  - `closeAllVoteUI()` call
  - Vote overlay hide

### Affinity Logic
For 2 nominees:
- Uses existing `voteFor2(voterId, [a, b])` function
- Compares affinity values
- Falls back to threat comparison if affinities are close

For >2 nominees:
- Uses existing `voteForMulti(voterId, candidates)` function
- Combines affinity and threat into a score
- Selects nominee with lowest score (least liked + most threatening)

## Browser Compatibility
- Tested on Mobile Safari (iOS)
- Tested on Chrome Mobile (Android)
- Uses modern JS (async/await, optional chaining)
- Graceful fallbacks for missing functions

## Performance Considerations
- Smooth scroll uses native browser animation
- 250ms wait is minimal and non-blocking
- Countdown updates are throttled to 1 second
- No memory leaks (timers always cleared)

## Backwards Compatibility
- All changes are additive (no breaking changes)
- Existing vote flows continue to work
- Helper functions check for availability before use
- Graceful degradation if helpers not loaded

## Security Considerations
- No user input directly used in timer logic
- Affinity values validated before use
- Timer handles stored securely in game state
- No external API calls or data transmission

## Future Enhancements
Potential improvements for future PRs:
- Make countdown duration configurable
- Add visual progress bar for countdown
- Localize countdown messages
- Add sound effects for countdown warnings
- Make auto-vote more sophisticated (consider recent votes, social maneuvers, etc.)

## Files Modified
- `js/livevote-helpers.js` - Added centerTVInViewport, updated closeAllVoteUI
- `js/livevote-voteoverlay.js` - Added TV centering, countdown cleanup
- `js/livevote-choice-card.js` - Added TV centering
- `js/eviction.js` - Added countdown timer, auto-vote logic

## Files Created
- `test_mobile_vote_scroll_timer.html` - Comprehensive test harness

## Lines Changed
- 532 lines added
- 4 lines removed
- Net: +528 lines

## No Breaking Changes
All existing tests pass without modification.
