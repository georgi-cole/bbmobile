# Socialize Auto-Wire Integration - Visual Guide

## Overview
This hotfix wires the Socialize launcher and timer integration so merged features are visible at runtime.

## Key Changes

### 1. Auto-Mount Bootstrap
The launcher now automatically mounts in the TV overlay when the Social phase starts.

**Before:**
- Launcher code existed but didn't appear in runtime
- Manual mounting required

**After:**
- Launcher auto-mounts when phase starts
- Handles late container creation via MutationObserver + polling
- Fallback selectors support (.tvViewport, .tv)

### 2. Timer Integration  
Social phase now defaults to 3 minutes instead of 30 seconds.

**Code Changes:**
```javascript
// social.js - Line 830
global.setPhase?.('social_intermission', g.cfg?.tComms||180, onDone);

// ui.hud-and-router.js - Lines 1370-1371
social: game.cfg.tSocial || 180,
social_intermission: game.cfg.tComms || 180
```

### 3. Fast-Advance on Energy Depletion
When energy reaches 0, phase auto-advances in ~3 seconds.

**Implementation:**
```javascript
// socialize-mobile.js - executeAction()
if (res.energy <= 0) {
  console.info('[Socialize] Energy depleted, scheduling fast-advance in 3 seconds');
  
  setTimeout(() => {
    const advanceDelay = 3000;
    const g = global.game || {};
    
    // Try multiple timer APIs
    if (typeof global.schedulePhaseAdvanceIn === 'function') {
      global.schedulePhaseAdvanceIn(advanceDelay);
    } else if (global.GameTimer && typeof global.GameTimer.setRemainingMs === 'function') {
      global.GameTimer.setRemainingMs(advanceDelay);
    } else if (typeof global.setPhaseDurationMs === 'function') {
      global.setPhaseDurationMs(advanceDelay);
    } else if (g.endAt) {
      g.endAt = Date.now() + advanceDelay;
      g.phaseEndsAt = g.endAt;
    }
  }, 100);
}
```

## Visual Flow

### Social Phase Start
```
1. startSocialIntermission() called
   └─> setPhase('social_intermission', 180)
       └─> renderSocialPhase(panel)
           └─> onSocialPhaseStart() [NEW]
               ├─> Set 3-minute timer
               └─> bootstrapLauncherMount() [NEW]
                   ├─> attemptLauncherMount()
                   │   ├─> Find #tvOverlay
                   │   ├─> Fallback to .tvViewport or .tv
                   │   └─> ensureSocializeLauncher()
                   │       └─> Mount in container
                   └─> Setup MutationObserver/polling if needed
```

### Launcher Auto-Mount Flow
```
Immediate Mount (tvOverlay exists):
  renderSocialPhase()
    └─> onSocialPhaseStart()
        └─> bootstrapLauncherMount()
            └─> attemptLauncherMount()
                └─> ✓ Launcher mounted immediately

Deferred Mount (tvOverlay created later):
  renderSocialPhase()
    └─> onSocialPhaseStart()
        └─> bootstrapLauncherMount()
            ├─> attemptLauncherMount() [fails]
            ├─> Setup MutationObserver
            └─> Setup polling fallback
                └─> [tvOverlay created]
                    └─> Observer/polling triggers
                        └─> attemptLauncherMount()
                            └─> ✓ Launcher mounted
```

### Energy Depletion Flow
```
User clicks Execute Action
  └─> executeAction()
      ├─> Apply action to targets
      ├─> updateResourceState({ energy: -1 })
      └─> Check if energy <= 0
          └─> [YES] Schedule fast-advance
              ├─> Log: "Energy depleted, scheduling fast-advance"
              ├─> Set timer to 3 seconds
              └─> closeSocializeModal(true)
                  └─> Show toast notification
```

## Console Logging

The integration adds several console.info logs for verification:

```
[Socialize] Bootstrap launcher auto-mount initiated
[Socialize] Launcher mounted successfully
[Socialize] Social phase started
[Socialize] Timer set via deadline fallback: 180 seconds
[Socialize] Energy depleted, scheduling fast-advance in 3 seconds
[Socialize] Fast-advance scheduled via deadline adjustment
```

## Testing

Run `test_socialize_autowire.html` to verify:
- ✓ Immediate launcher mount
- ✓ Deferred launcher mount (MutationObserver/polling)
- ✓ 3-minute timer defaults
- ✓ Fast-advance on energy depletion

## Acceptance Criteria ✓

- ✓ During Social phase, TV overlay shows Socialize card + button
- ✓ Clicking opens full-screen modal
- ✓ Phase starts with 3-minute timer (180 seconds)
- ✓ Spending all energy auto-advances in ~3s

## Files Modified

1. **js/socialize-mobile.js** (+145 lines)
   - Added auto-mount bootstrap system
   - Added phase start hook
   - Enhanced energy depletion handling

2. **js/social.js** (1 line)
   - Updated default duration: 30s → 180s

3. **js/ui.hud-and-router.js** (2 lines)
   - Added 180s fallbacks for social phases

4. **test_socialize_autowire.html** (new file)
   - Integration test suite

## Safety

- No changes to gameplay logic beyond wiring existing functions
- No visual changes beyond ensuring existing components appear
- Graceful fallbacks for missing timer APIs
- Guarded against multiple mounts
- All existing tests pass
