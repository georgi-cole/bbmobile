# Social Maneuvers Alignment - Implementation Summary

## Overview
This PR implements approved fixes to fully align Social Maneuvers behavior on main with the feature/social-maneuvers spec and transfer guide.

## Problem Statement
After PR #300 merged Social Maneuvers with feature flag, user validation identified the following issues:
1. Legacy cards/simulation still showing alongside new UI during social_intermission
2. Phase timer advancing while Socialize modal is open
3. End-of-phase summary missing performed actions and resource usage
4. New week not properly resetting energy with adjustments

## Solution: Surgical Changes to 3 Files

### 1. Hard-Swap Legacy UI (`js/social.js`)
**Modified:** `renderSocialPhase()` function
- Checks if Social Maneuvers is enabled
- When enabled: clears panel, mounts Socialize launcher, skips legacy simulation
- Result: Only new UI shows during social_intermission

**Modified:** `resetWeeklyCounters()` function
- Calls `SocialManeuvers.SocialResources.resetWeekly()` for all alive players
- Refreshes HUD after reset
- Result: Energy resets with weekly bonuses/penalties

### 2. Timer Control (`js/social-maneuvers.js`)
**Added:** `pausePhaseTimer()` and `resumePhaseTimer()` functions
- Pause: stores remaining time, sets endAt to far future
- Resume: restores timer with original remaining time
- Result: Timer freezes when modal opens, resumes on close

**Added:** `setPhase` wrapper
- Detects when leaving social_intermission
- Closes modal, hides launcher, resumes timer
- Result: Clean phase exit handling

**Modified:** Global exports
- Added `pausePhaseTimer` and `resumePhaseTimer` to exports
- Result: Timer control available to UI layer

### 3. Modal Timer Integration (`js/socialize-mobile.js`)
**Modified:** `openSocializeModal()` function
- Calls `SocialManeuvers.pausePhaseTimer()` on open
- Sets high z-index backdrop (9998/9999)
- Result: Timer pauses, no click-through

**Modified:** `closeSocializeModal()` function
- Calls `SocialManeuvers.resumePhaseTimer()` on close
- Result: Timer resumes from paused time

**Modified:** `executeAction()` function
- Checks `SocialManeuvers.isEnabled()` before routing
- When enabled: always uses engine, no legacy fallback
- Result: Session data from engine drives summary

## Acceptance Criteria: All Met ✅

✅ Only new UI shows during social_intermission (no legacy cards/simulation)
✅ Timer pauses on modal open, resumes on close (no background advance)
✅ End-of-phase summary reflects performed actions and resource usage
✅ New week resets energy (base 5 + weekly adjustments) and updates HUD
✅ Phase gating: launcher only mounts during social_intermission
✅ Clean exit: modal closes and hides on phase exit
✅ No legacy fallbacks when enabled (engine session data drives summary)

## Testing

**Automated:** `test_social_alignment.html` - 10 comprehensive tests
**Manual:** `SOCIAL_ALIGNMENT_VALIDATION.md` - detailed validation guide

All syntax checks pass. All tests pass. Ready for merge.

## Files Changed
- `js/social.js` - 18 lines added
- `js/social-maneuvers.js` - 98 lines added
- `js/socialize-mobile.js` - 42 lines modified
- Plus test files and documentation

**Total:** 158 lines modified in core files
