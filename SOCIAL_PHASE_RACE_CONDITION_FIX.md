# Social Phase Race Condition Fix

## Issue Summary
Fixed race conditions in social phase that caused:
- Duplicate scheduler starts/stops
- Redundant timers continuing after summary OK
- Game freeze when lingering timer expires
- Multiple calls to generatePhaseSummary

## Root Causes
1. Multiple codepaths independently starting/stopping social AI scheduler
2. Inconsistent guard flags not being cleared between phases
3. Phase timer conflicting with manual advance from summary OK button
4. Delayed stop in phase-terminator conflicting with already-ended phases

## Changes Made

### 1. Added Idempotency Guards

**js/social-maneuvers.js:**
- `__socialPhaseStartCalled`: Prevents duplicate calls to `onSocialPhaseStart`
- `__socialSummaryGenerated`: Prevents duplicate summary generation
- `__socialPhaseAdvanced`: Prevents double advancement from summary OK button
- All guards are cleared in `onSocialPhaseStart` for new phase

**js/social-ai-scheduler.js:**
- Added guard to block `startAiSocialPhase` if summary is open or phase is ending

**js/social/social-ai-autostart.js:**
- Added guard to skip autostart if summary is open or phase is ending

**js/phase-terminator.js:**
- Added guards to skip delayed stop if summary is open or phase has ended

### 2. Timer Cancellation on Summary

**js/social-maneuvers.js (`showSummaryPanel`):**
When the social summary opens:
1. Pause phase timer (via PauseController or legacy pausePhaseTimer)
2. Clear fast-advance timeout
3. Stop AI scheduler immediately

This prevents any lingering timers from firing after the user has seen the summary.

### 3. Immediate Advancement on Summary OK

**js/social-maneuvers.js (summary OK button handler):**
When user clicks OK:
1. Mark `__socialPhaseAdvanced` to prevent duplicates
2. Stop AI scheduler immediately
3. Clear any remaining timeouts
4. Call stored phase advancement callback
5. Animate card removal (non-blocking)
6. Clean up guards after animation completes

## Manual Testing Procedure

### Steps to Reproduce Original Issue
1. Start a game from the intro flow
2. Play through HOH → nominations → veto
3. Enter the social phase/intermission
4. Spend all social energy via the "socialize" button
5. Social summary card appears; click **OK**
6. **Original Bug**: Redundant timer continues, game freezes when it expires

### Expected Behavior After Fix
1. After spending social energy and clicking OK on the summary:
   - Game advances **immediately** to nominations
   - **No** redundant countdown timer visible
   - **No** game freeze
   - Console shows clean phase transition logs

### Console Logs to Verify

**Good Signs (Fixed):**
```
[social-maneuvers] ✓ OK clicked - advancing phase immediately
[social-maneuvers] ✓ Stopped AI scheduler
[social-maneuvers] ✓ Calling stored phase advancement callback
[social.js] ✓ Advancing to next phase
[social.js] ✓ Advanced to nominations via startNominations
```

**Bad Signs (Broken):**
```
[social-maneuvers] onSocialPhaseStart already called - ignoring duplicate
[social-maneuvers] Summary already open - ignoring duplicate call
[social-ai-scheduler] Already running
[phase-cleanup] Social AI Scheduler stopped (delayed) <-- after summary closed
```

## Files Modified
- `js/social-maneuvers.js`
- `js/social-ai-scheduler.js`
- `js/social/social-ai-autostart.js`
- `js/phase-terminator.js`

## Related Test Files
- `test_social_phase_halt_fix.html`
- `test_social_phase_timer_bug.html`
- `test_social_phase_advancement_flows.html`
- `test_social_timer_fix.html`

## Definition of Done
✅ Summary OK button immediately advances to next phase
✅ No redundant timers after summary is dismissed
✅ Console shows no duplicate start/stop warnings
✅ Game does not freeze after social phase
✅ ESLint passes with no new errors
✅ Social tests pass (`npm run test:social`)
