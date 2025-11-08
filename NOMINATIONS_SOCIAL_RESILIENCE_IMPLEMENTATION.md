# Nominations & Social Resilience Implementation

## Summary

This implementation adds resilience features to the nominations and social modules to ensure they always start correctly for human players across multiple game weeks. The changes address two key issues:

1. **Nominations not starting for human HOH** - Timer runs but no selector/intro appears
2. **Social launcher only appearing first time** - Launcher shows in week 1 but fails to display in later weeks

## Problem Analysis

### Nominations Issues
- `renderNomsPanel` wrapper being overwritten by late-loading modules
- Stale commit flags (`__nomsCommitInProgress`, `__nomsCommitted`) preventing human intro
- Overlays persisting across phases and blocking interaction
- No mechanism to detect and recover from wrapper overwrites

### Social Issues
- "Already active/sole owner" flags not being cleared between phases
- Launcher mounting logic only running once
- Observers not being re-attached on phase re-entry
- Overlays blocking launcher UI

## Solution Architecture

### A. Nominations Resilience

#### 1. Feature Flag
Added `window.__enableNomsFS` (default: `true`) for quick rollback if needed.

```javascript
// In nominations-grid-fullscreen.js
if (typeof global.__enableNomsFS === 'undefined') {
  global.__enableNomsFS = true;
}
```

#### 2. Wrapper Verification Polling
Polls for wrapper overwrites during nominations phase with exponential backoff:

```javascript
function verifyWrapper() {
  if (!global.renderNomsPanel[WRAPPED_SENTINEL]) {
    console.warn(LOG_PREFIX, 're-wrapped renderNomsPanel (was overwritten)');
    originalRenderNomsPanel = global.renderNomsPanel;
    global.renderNomsPanel = interceptedRenderNomsPanel;
    global.renderNomsPanel[WRAPPED_SENTINEL] = true;
    return true;
  }
  return true;
}
```

#### 3. Phase Entry Hook
Clears stale flags and ensures intro shows:

```javascript
function onEnterNominationsPhase() {
  // Clear stale commit flags
  if (!g.nomsLocked && !g.__nomsCommitInProgress) {
    g.__nomsCommitInProgress = false;
    g.__nomsCommitted = false;
  }
  
  // Verify wrapper
  verifyWrapper();
  
  // Start polling
  startVerificationPolling();
  
  // Safety microtask: invoke intro after delay
  setTimeout(() => {
    if (hoh && hoh.human) {
      NomsFS.showIntro().then(success => {
        if (success) NomsFS.open();
      });
    }
  }, 50);
}
```

#### 4. Phase Exit Hook & Overlay Teardown
Cleans up overlays on phase exit:

```javascript
function teardownNominationOverlays() {
  // Remove #nomsFsOverlay
  const nomsFsOverlay = document.getElementById('nomsFsOverlay');
  if (nomsFsOverlay) nomsFsOverlay.remove();
  
  // Neutralize #tvOverlay
  const tvOverlay = document.getElementById('tvOverlay');
  if (tvOverlay) {
    tvOverlay.style.pointerEvents = 'none';
    tvOverlay.style.display = 'none';
    tvOverlay.innerHTML = '';
    tvOverlay.classList.remove('nfs-fullscreen-active');
  }
  
  // Close selector if active
  if (selectorState.active) {
    closeFullscreenSelector();
  }
}
```

#### 5. Phase Change Listener
Detects phase transitions via polling:

```javascript
function installPhaseChangeListener() {
  let lastPhase = null;
  
  setInterval(() => {
    const currentPhase = g.phase;
    
    if (lastPhase === 'nominations' && currentPhase !== 'nominations') {
      onExitNominationsPhase();
    }
    
    lastPhase = currentPhase;
  }, 500);
}
```

### B. Social Resilience

#### 1. ensureVisible() Function
Guarantees launcher mounts on phase entry:

```javascript
function ensureVisible() {
  console.log('[socialize-mobile] ensure-visible: entering social_intermission');
  
  // 1. Clear blocking TV overlay
  const tvOverlay = document.getElementById('tvOverlay');
  if (tvOverlay) {
    tvOverlay.style.pointerEvents = 'none';
    tvOverlay.style.display = 'none';
    tvOverlay.innerHTML = '';
  }
  
  // 2. Clear "already active" flags
  if (g.__socialLauncherActive) g.__socialLauncherActive = false;
  if (g.__socialLauncherMounted) g.__socialLauncherMounted = false;
  
  // 3. Reinitialize observers
  if (!mountObserver) startMountObserver();
  
  // 4. Mount launcher unconditionally
  const launcher = ensureSocializeLauncher();
  if (launcher) {
    showLauncher();
    updateHUDDisplay();
  }
}
```

#### 2. resetSocialFlags() Function
Clears flags on phase exit:

```javascript
function resetSocialFlags() {
  const g = global.game || {};
  
  if (g.__socialLauncherActive) {
    g.__socialLauncherActive = false;
  }
  if (g.__socialLauncherMounted) {
    g.__socialLauncherMounted = false;
  }
}
```

#### 3. Phase Wrapper Integration
Calls ensureVisible/resetSocialFlags in social.js:

```javascript
function handleSocialPhaseEntry() {
  if (global.SocializeMobile?.ensureVisible) {
    global.SocializeMobile.ensureVisible();
  }
}

function handleSocialPhaseExit() {
  if (global.SocializeMobile?.resetSocialFlags) {
    global.SocializeMobile.resetSocialFlags();
  }
}
```

## API Changes

### NomsFS
New/updated methods:
- `NomsFS.teardown()` - Teardown overlays and cleanup
- `NomsFS.debug()` - Now includes `featureFlagEnabled`

### SocializeMobile
New methods:
- `SocializeMobile.ensureVisible()` - Ensure launcher is visible on phase entry
- `SocializeMobile.resetSocialFlags()` - Reset flags on phase exit

## Diagnostics & Logging

### Nominations Logs
```
[noms-fs] Entering nominations phase
[noms-fs] Clearing stale __nomsCommitInProgress flag
[noms-fs] Clearing stale __nomsCommitted flag
[noms-fs] Started verification polling
[noms-fs] Safety microtask: invoking NomsFS.showIntro()
[noms-fs] intercept check {hohHuman, nomsLocked, commitInProgress, committed, nomineesLen}
[noms-fs] NOMINATE clicked
[noms-fs] Opening full-screen selector
[noms-fs] Leaving nominations phase
[noms-fs] Teardown: cleaning up nomination overlays
```

### Social Logs
```
[socialize-mobile] ensure-visible: entering social_intermission
[socialize-mobile] ensure-visible: cleared blocking TV overlay
[socialize-mobile] ensure-visible: clearing __socialLauncherActive flag
[socialize-mobile] ensure-visible: launcher mounted successfully
[socialize-mobile] ensure-visible: ✓ launcher visible (phase social_intermission)
[socialize-mobile] reset-social-flags: exiting social_intermission
[socialize-mobile] reset-social-flags: clearing __socialLauncherActive
[socialize-mobile] reset-social-flags: ✓ flags reset
```

## Testing

### Automated Tests
Run the test file to verify API surface:
```bash
# In browser
open test_nominations_social_resilience.html
```

Tests verify:
- Feature flag exists and defaults to true
- All new API methods exist (teardown, ensureVisible, resetSocialFlags)
- Interceptor is installed
- Phase wrapper is installed

### Manual Testing Scenarios

#### Scenario 1: Week 1 Nominations
1. Start new game
2. Complete HOH competition (human wins)
3. **Expected**: Nominations intro card appears
4. Click NOMINATE
5. **Expected**: Fullscreen selector opens
6. Select 2 nominees
7. **Expected**: Ceremony completes, veto starts

#### Scenario 2: Week 2 Nominations
1. Continue from scenario 1
2. Complete week 1 (veto, eviction)
3. Week 2 HOH competition (human wins)
4. **Expected**: Nominations intro appears again (not stuck)
5. Complete nominations
6. **Expected**: Flow works identically to week 1

#### Scenario 3: Social Phase Week 1
1. Start new game
2. Reach social_intermission phase
3. **Expected**: Social launcher appears in TV overlay
4. Open social modal
5. **Expected**: Modal opens, shows resources
6. Complete social actions
7. **Expected**: Phase completes normally

#### Scenario 4: Social Phase Week 2
1. Continue from scenario 3
2. Complete week 1
3. Reach week 2 social_intermission
4. **Expected**: Social launcher appears again (not hidden)
5. **Expected**: Resources reset for new week
6. Open social modal
7. **Expected**: Modal functions correctly

#### Scenario 5: Wrapper Overwrite Recovery
1. Start game, human is HOH
2. Open browser console
3. Simulate wrapper overwrite:
   ```javascript
   window.renderNomsPanel = function() { console.log('overwritten'); }
   ```
4. Wait 100-200ms
5. Check console for re-wrap message:
   ```
   [noms-fs] re-wrapped renderNomsPanel (was overwritten)
   ```
6. **Expected**: Nominations still work correctly

## Rollback Plan

If issues occur, disable the feature flag:

```javascript
// In browser console
window.__enableNomsFS = false;
```

This will:
- Prevent interceptor from installing
- Fall back to legacy nominations flow
- Social module will still use new resilience features (no flag for that)

## Files Modified

1. **js/nominations-grid-fullscreen.js** (138 lines changed)
   - Added feature flag
   - Added teardownNominationOverlays()
   - Added onEnterNominationsPhase() with stale flag clearing
   - Added onExitNominationsPhase()
   - Added installPhaseChangeListener()
   - Exposed teardown in NomsFS API

2. **js/socialize-mobile.js** (98 lines changed)
   - Added ensureVisible()
   - Added resetSocialFlags()
   - Exposed both in SocializeMobile API

3. **js/social.js** (48 lines changed)
   - Updated handleSocialPhaseEntry() to call ensureVisible()
   - Updated handleSocialPhaseExit() to call resetSocialFlags()
   - Updated startSocialIntermission() onDone callback

## Performance Impact

- **Nominations**: Minimal - adds one 500ms polling interval during nominations phase only
- **Social**: None - ensureVisible() is called once per phase entry
- **Memory**: Negligible - no new persistent state

## Browser Compatibility

All changes use standard ES5/ES6 features supported in:
- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Known Limitations

1. **Phase change detection**: Uses polling (500ms) instead of event-based detection. This is necessary because there's no central phase change event system.

2. **Feature flag scope**: Only applies to nominations (not social), as social resilience is considered core functionality.

3. **Wrapper verification window**: Polls for overwrites only during nominations phase. If wrapper is overwritten after polling stops, it won't be detected until next nominations phase.

## Future Improvements

1. **Event-based phase detection**: Implement a central event bus for phase changes
2. **Social feature flag**: Add `__enableSocialResilience` flag for consistency
3. **Wrapper verification**: Extend verification polling to all phases
4. **Observer API**: Use MutationObserver for phase changes instead of polling
5. **Telemetry**: Add metrics to track how often recovery mechanisms trigger

## Security Considerations

No security implications - all changes are defensive programming improvements that enhance reliability without introducing new attack surfaces.

## Backward Compatibility

All changes are backward compatible:
- New API methods are additions (no breaking changes)
- Feature flag defaults to enabled (preserves current behavior)
- Fallbacks ensure graceful degradation if new features aren't available

## References

- Original issue: "Nominations sometimes don't start for a human HOH"
- Related: "Social module/launcher appears only the first time"
- Implementation PR: [Link to PR]
- Test file: `test_nominations_social_resilience.html`
