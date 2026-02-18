# Visual Implementation Guide: Nomination Modal Pause + Watchdog

## Code Overview

### 1. Pause Helper Functions

```javascript
/**
 * Request a phase timer pause
 * Prefers PauseController if available, falls back to local refcount
 * @returns {Object} pauseHandle - Object with release() method
 */
function requestPause() {
  console.info('[NominationIntroModal] Requesting pause');
  
  const ownerId = 'modal:nomination-intro';
  let usedPauseController = false;
  
  // Try PauseController first
  try {
    if (global.PauseController && typeof global.PauseController.pause === 'function') {
      global.PauseController.pause(ownerId);
      usedPauseController = true;
      console.info('[NominationIntroModal] Pause requested via PauseController');
    }
  } catch (err) {
    console.warn('[NominationIntroModal] PauseController.pause failed:', err);
    usedPauseController = false;
  }
  
  // Fallback to local refcount mechanism
  if (!usedPauseController) {
    initLocalPauseFallback();
    global.__modalTimerPause.refCount++;
    global.__modalTimerPause.owners.add(ownerId);
    console.info('[NominationIntroModal] Pause requested via local fallback');
  }
  
  // Start watchdog timer
  startWatchdog();
  
  // Return handle for release
  return {
    ownerId: ownerId,
    usedPauseController: usedPauseController,
    released: false,
    release: function() {
      releasePause(this);
    }
  };
}
```

### 2. Watchdog Timer

```javascript
/**
 * Start watchdog timer to auto-release pause after timeout
 * Default timeout from CONFIG.NOMS_MODAL_MAX_PAUSE_MS (30s)
 */
function startWatchdog() {
  // Clear any existing watchdog
  clearWatchdog();
  
  // Get timeout from game config or use default
  const g = global.game;
  const timeout = g?.cfg?.NOMS_MODAL_MAX_PAUSE_MS || CONFIG.NOMS_MODAL_MAX_PAUSE_MS;
  
  console.info(`[NominationIntroModal] Starting watchdog timer (${timeout}ms)`);
  
  watchdogTimer = setTimeout(() => {
    console.warn('[NominationIntroModal] Watchdog timeout - auto-releasing pause');
    
    // Auto-release the pause
    if (pauseHandle && !pauseHandle.released) {
      releasePause(pauseHandle);
      pauseHandle = null;
      
      // Show non-blocking toast to user
      showToast('Timer resumed to keep the game moving', 3000);
    }
    
    watchdogTimer = null;
  }, timeout);
}
```

### 3. Ad Flow Integration

```javascript
async function handleRecharge() {
  // ... setup code ...
  
  try {
    // Set ad active flag
    modalAdActive = true;
    
    // Extend watchdog during ad playback
    extendWatchdog();
    
    // Call the ad hook (global.showAdReward)
    if (typeof global.showAdReward === 'function') {
      const result = await global.showAdReward();
      
      if (result && result.rewarded) {
        // Award energy
        const amount = result.amount || CONFIG.RECHARGE_ENERGY_AMOUNT;
        addPlayerEnergy(humanId, amount);
        showToast(`+${amount} social energy! You're recharged.`, 2500);
        return true;
      }
    }
  } catch (err) {
    console.error('[NominationIntroModal] Recharge error:', err);
    return false;
  } finally {
    // Clear ad active flag (always runs)
    modalAdActive = false;
  }
}
```

### 4. Visibility Change Handler

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Don't dismiss during ad playback
    if (modalAdActive) {
      console.info('[NominationIntroModal] Tab hidden during ad playback, not dismissing');
      return;
    }
    
    // Check if modal has been visible long enough
    const visibleDuration = Date.now() - modalShowTime;
    if (visibleDuration < CONFIG.VISIBILITY_THRESHOLD_MS) {
      console.info('[NominationIntroModal] Tab hidden but modal only visible for ${visibleDuration}ms, not dismissing');
      return;
    }
    
    // Tab became hidden while modal is showing
    const vulnerableStates = [STATE.SHOWING, STATE.RISK_VIEW, STATE.PLEA];
    if (vulnerableStates.includes(currentState)) {
      console.warn('[NominationIntroModal] Tab hidden while modal active (>500ms), dismissing to prevent freeze');
      dismiss();
    }
  }
}, { signal: abortController.signal });
```

### 5. Phase Change Listener

```javascript
// Listen for phase changes (server-driven) to close modal immediately
const handlePhaseChange = () => {
  const currentPhase = global.game?.phase;
  console.info(`[NominationIntroModal] Phase changed to ${currentPhase}, dismissing modal`);
  dismiss();
};

// Try to use game event bus if available
if (global.game?.bus && typeof global.game.bus.on === 'function') {
  global.game.bus.on('phase:change', handlePhaseChange);
  global.game.bus.on('phase:advanced', handlePhaseChange);
  
  // Cleanup listener when modal closes
  abortController.signal.addEventListener('abort', () => {
    if (global.game?.bus && typeof global.game.bus.off === 'function') {
      global.game.bus.off('phase:change', handlePhaseChange);
      global.game.bus.off('phase:advanced', handlePhaseChange);
    }
  });
} else {
  // Fallback: poll for phase change
  const initialPhase = global.game?.phase;
  const phaseCheckInterval = setInterval(() => {
    if (global.game?.phase && global.game.phase !== initialPhase) {
      handlePhaseChange();
      clearInterval(phaseCheckInterval);
    }
  }, 500);
  
  // Cleanup polling when modal closes
  abortController.signal.addEventListener('abort', () => {
    clearInterval(phaseCheckInterval);
  });
}
```

### 6. Cleanup Integration

```javascript
function cleanup() {
  console.info('[NominationIntroModal] Cleanup starting');

  // Release pause if still held
  if (pauseHandle && !pauseHandle.released) {
    try {
      releasePause(pauseHandle);
    } catch (err) {
      console.error('[NominationIntroModal] Error releasing pause during cleanup:', err);
    }
    pauseHandle = null;
  }

  // Clear watchdog timer
  clearWatchdog();

  // Clear failsafe timeout
  if (failsafeTimeout) {
    clearTimeout(failsafeTimeout);
    failsafeTimeout = null;
  }

  // ... rest of cleanup ...
  
  // Clear ad active flag
  modalAdActive = false;

  console.info('[NominationIntroModal] Cleanup complete - state reset to IDLE');
}
```

## Test Cases

### Test 14: Pause Request Verification

```javascript
async function testPauseRequest() {
  clearLog('pause-status');
  log('pause-status', 'Test 14: Testing pause request on modal show...', 'info');
  
  // Mock PauseController
  const originalPause = window.PauseController?.pause;
  let pauseCalled = false;
  
  if (window.PauseController) {
    window.PauseController.pause = function(ownerId) {
      pauseCalled = true;
      log('pause-status', `✓ PauseController.pause() called with owner: ${ownerId}`, 'success');
      if (originalPause) originalPause.call(this, ownerId);
    };
  }
  
  try {
    // Show modal briefly
    const promise = window.NominationIntroModal.show();
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Verify pause was requested
    if (pauseCalled) {
      log('pause-status', '✓ Pause requested via PauseController', 'success');
    } else if (window.__modalTimerPause && window.__modalTimerPause.refCount > 0) {
      log('pause-status', '✓ Pause requested via local fallback', 'success');
    } else {
      log('pause-status', '✗ Pause was NOT requested!', 'error');
    }
    
    // Dismiss modal
    const overlay = document.querySelector('.phase-intro-overlay');
    if (overlay) overlay.click();
    await promise;
    
    log('pause-status', 'Test 14 completed', 'success');
  } finally {
    if (window.PauseController && originalPause) {
      window.PauseController.pause = originalPause;
    }
  }
}
```

### Test 16: Watchdog Timeout

```javascript
async function testWatchdogTimeout() {
  clearLog('pause-status');
  log('pause-status', 'Test 16: Testing watchdog auto-resume (5 seconds)...', 'info');
  log('pause-status', '⏱️ DO NOT DISMISS THE MODAL. Wait for automatic timeout.', 'info');
  
  // Override config for faster testing (5 seconds instead of 30)
  if (window.game && window.game.cfg) {
    window.game.cfg.NOMS_MODAL_MAX_PAUSE_MS = 5000;
  }
  
  let watchdogFired = false;
  
  try {
    const startTime = Date.now();
    
    // Show modal
    const promise = window.NominationIntroModal.show();
    
    // Watch for toast message indicating watchdog fired
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.textContent && node.textContent.includes('Timer resumed')) {
            watchdogFired = true;
            log('pause-status', '✓ Watchdog fired! Toast message displayed.', 'success');
          }
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Wait for watchdog (5 seconds + 1 second buffer)
    await new Promise(resolve => setTimeout(resolve, 6000));
    observer.disconnect();
    
    const elapsed = Date.now() - startTime;
    
    if (watchdogFired) {
      log('pause-status', `✓ Watchdog timeout triggered after ~${Math.round(elapsed / 1000)}s`, 'success');
    } else {
      log('pause-status', `✗ Watchdog did NOT fire after ${Math.round(elapsed / 1000)}s`, 'error');
    }
  } finally {
    // Cleanup...
  }
}
```

## Flow Diagram

```
Modal Show
    │
    ├─> Request Pause
    │   ├─> Try PauseController.pause('modal:nomination-intro')
    │   │   └─> Success? Use PauseController
    │   └─> Fail? Use local fallback (window.__modalTimerPause.refCount++)
    │
    ├─> Start Watchdog (30s timer)
    │   └─> Timeout? Auto-release pause + show toast
    │
    ├─> Setup Phase Change Listener
    │   └─> Phase changes? Dismiss modal + release pause
    │
    └─> Setup Visibility Handler
        └─> Tab hidden? 
            ├─> During ad? Ignore
            ├─> <500ms? Ignore
            └─> >500ms? Dismiss modal

Modal Interaction
    │
    ├─> Check Risk
    │   └─> Continue (pause still active)
    │
    ├─> Make Plea
    │   └─> Continue (pause still active)
    │
    └─> Watch Ad (Recharge)
        ├─> Set modalAdActive = true
        ├─> Extend watchdog timer
        ├─> Call global.showAdReward()
        └─> Clear modalAdActive = false

Modal Dismiss
    │
    ├─> Release Pause
    │   ├─> PauseController? Call PauseController.resume('modal:nomination-intro')
    │   └─> Local fallback? Decrement window.__modalTimerPause.refCount
    │
    ├─> Clear Watchdog Timer
    │
    ├─> Cleanup Event Listeners (AbortController.abort())
    │
    └─> Remove DOM Nodes
```

## Key Safety Features

### 1. Idempotent Release
```javascript
function releasePause(handle) {
  if (!handle || handle.released) {
    return; // Already released or invalid
  }
  
  handle.released = true; // Prevent double-release
  
  // ... release logic ...
}
```

### 2. Try/Catch Wrapping
```javascript
try {
  if (global.PauseController && typeof global.PauseController.pause === 'function') {
    global.PauseController.pause(ownerId);
    usedPauseController = true;
  }
} catch (err) {
  console.warn('[NominationIntroModal] PauseController.pause failed:', err);
  usedPauseController = false; // Fall back to local
}
```

### 3. Cleanup Guarantee
```javascript
// Pause request on show
try {
  pauseHandle = requestPause();
} catch (err) {
  console.error('[NominationIntroModal] Error requesting pause:', err);
  // Continue without pause if request fails
}

// Release in cleanup (called from all exit paths)
function cleanup() {
  if (pauseHandle && !pauseHandle.released) {
    try {
      releasePause(pauseHandle);
    } catch (err) {
      console.error('[NominationIntroModal] Error releasing pause during cleanup:', err);
    }
    pauseHandle = null;
  }
  // ... rest of cleanup ...
}
```

## Console Output Example

When modal is shown:
```
[NominationIntroModal] Showing modal
[NominationIntroModal] Requesting pause
[NominationIntroModal] Pause requested via PauseController
[NominationIntroModal] Starting watchdog timer (30000ms)
[PauseController] ⏸ Pausing game (owner: modal:nomination-intro)
```

When modal is dismissed normally:
```
[NominationIntroModal] Dismissing modal
[NominationIntroModal] Releasing pause
[NominationIntroModal] Pause released via PauseController
[NominationIntroModal] Watchdog timer cleared
[PauseController] ▶ Resuming game
[NominationIntroModal] Cleanup complete - state reset to IDLE
```

When watchdog fires:
```
[NominationIntroModal] Watchdog timeout - auto-releasing pause
[NominationIntroModal] Releasing pause
[NominationIntroModal] Pause released via PauseController
[Toast] Timer resumed to keep the game moving
```

When phase changes:
```
[NominationIntroModal] Phase changed to social, dismissing modal
[NominationIntroModal] Dismissing modal
[NominationIntroModal] Releasing pause
[NominationIntroModal] Cleanup complete - state reset to IDLE
```

## Summary

This implementation provides:
- ✅ Robust pause mechanism with dual-path support
- ✅ 30-second watchdog to prevent indefinite pauses
- ✅ Ad-aware behavior (extends watchdog, ignores visibility)
- ✅ Server-first design (phase change always closes modal)
- ✅ Comprehensive safety guarantees (idempotent, try/catch, cleanup)
- ✅ Extensive test coverage (8 new test cases)
- ✅ Zero security vulnerabilities (CodeQL verified)
