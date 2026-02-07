# Social Phase Halt Bug - Fix Summary

## Problem Statement

After PR #1164, the game still halted after the social phase with these console errors:

1. `[PhaseTimerBridge] ⚠ Manual resume called` — repeating ~18 times in a loop
2. `[social-maneuvers] onSocialPhaseEnd already called - ignoring duplicate` — repeating ~18 times  
3. `[social-maneuvers] ⚠ No phase advancement callback found - phase may not advance` — **THE GAME-HALTING LINE**

## Root Cause

**THREE competing code paths** were all trying to end the social phase, using different guard flags that didn't coordinate:

### Path 1: `social.js` → `onDone()` (timer callback)
- **Guard**: `game.__socialOnDoneFired`
- **Behavior**: Should store `game.__socialPhaseAdvanceCallback` and show summary via `showSummaryPanel()`
- **Problem**: When blocked by the guard (because Path 2 or 3 already set it), the callback was **never stored**

### Path 2: `social-maneuvers.js` → `endSocialPhaseNow(reason)`
- **Guard**: module-level `socialPhaseEnded`
- **Behavior**: Calls `onSocialPhaseEnd()` directly
- **Problem**: Does NOT store `__socialPhaseAdvanceCallback`

### Path 3: `social.js` → `handleSocialPhaseExit()` (setPhase wrapper)
- **Guard**: `game.__socialPhaseEndCalled`
- **Behavior**: Calls `SocialManeuvers.onSocialPhaseEnd()` when phase changes away from `social_intermission`
- **Problem**: Does NOT store `__socialPhaseAdvanceCallback`

### Path 4: `social-maneuvers.js` → setPhase wrapper (~line 2268)
- **Behavior**: Also calls `onSocialPhaseEnd()` when leaving social phase
- **Problem**: Creates another race condition with Path 1

### The Race Condition

1. Social phase timer runs. Player does some actions.
2. When energy depletes or timer nearly expires, `endSocialPhaseNow('energy')` fires (Path 2)
3. Path 2 sets `socialPhaseEnded = true`, calls `onSocialPhaseEnd()` (which sets `game.__socialPhaseEndCalled = true`), and sets `game.__socialOnDoneFired = true`
4. Timer expires → calls `onDone()` → sees `__socialOnDoneFired === true` → **returns immediately without storing callback**
5. Meanwhile, the summary popup IS shown (either by `onSocialPhaseEnd` or `showSummaryPanel`)
6. User clicks OK → `showSummaryPanel`'s OK handler looks for `game.__socialPhaseAdvanceCallback` → it's `undefined` → logs "No phase advancement callback found" → **GAME HALTS**

## Solution

### Key Principle: Make `onDone()` the SINGLE authority for phase advancement

### Changes Made

#### 1. In `js/social.js` - Rewrote `onDone()` callback storage

**BEFORE:**
```javascript
const onDone = async ()=>{
  // Idempotency guard: prevent onDone from executing twice
  if(global.game?.__socialOnDoneFired) {
    console.warn('[social.js] onDone already fired this phase - ignoring duplicate call');
    return; // ❌ CALLBACK NEVER STORED!
  }
  global.game.__socialOnDoneFired = true;
  
  // ... later, inside try blocks ...
  const advanceToNextPhase = () => { /* ... */ };
  global.game.__socialPhaseAdvanceCallback = advanceToNextPhase;
  // ❌ This line never runs if guard fires first!
```

**AFTER:**
```javascript
const onDone = async ()=>{
  // CRITICAL: Always store phase advancement callback FIRST
  const advanceToNextPhase = () => {
    // One-shot guard: prevent double advancement
    if(global.game?.__socialPhaseAdvanced) {
      console.warn('[social.js] Phase already advanced - ignoring duplicate call');
      return;
    }
    global.game.__socialPhaseAdvanced = true;
    
    console.info('[social.js] ✓ Advancing to next phase');
    if(typeof callback === 'function'){
      try{ callback(); }catch(e){ console.error(e); }
    } else {
      const startNoms = resolveStartNominations();
      try{ startNoms(); }catch(e){ console.error(e); }
    }
  };
  
  // Store callback immediately - MUST happen before any guards
  global.game.__socialPhaseAdvanceCallback = advanceToNextPhase;
  console.info('[social.js] ✓ Phase advancement callback stored');
  
  // ... rest of cleanup and summary logic ...
```

**Key Changes:**
- ✅ Callback stored at TOP of function, before any guards or logic
- ✅ Guard moved INSIDE the callback itself (`__socialPhaseAdvanced`), not at onDone level
- ✅ Removed `__socialOnDoneFired` guard entirely
- ✅ Callback now always available for summary OK button

#### 2. In `js/social.js` - Stripped `handleSocialPhaseExit()` of phase end logic

**BEFORE:**
```javascript
function handleSocialPhaseExit() {
  _inSocialPhase = false;
  console.info('[social.js wrapper] ◼ Detected leaving social_intermission via setPhase');
  
  if(global.SocialManeuvers?.isEnabled?.()){
    // Call onSocialPhaseEnd if not already called
    if(global.SocialManeuvers?.onSocialPhaseEnd && !global.game?.__socialPhaseEndCalled){
      try{
        global.game.__socialPhaseEndCalled = true;
        global.SocialManeuvers.onSocialPhaseEnd(); // ❌ RACES WITH onDone!
        console.info('[social.js wrapper] ✓ Called onSocialPhaseEnd');
      }catch(e){ /* ... */ }
    }
    
    // ... hide launcher, resume timer ...
  }
  
  // Reset flags for next phase
  // ...
}
```

**AFTER:**
```javascript
function handleSocialPhaseExit() {
  _inSocialPhase = false;
  console.info('[social.js wrapper] ◼ Detected leaving social_intermission via setPhase');
  
  // Only do UI cleanup here - NOT phase end logic
  // Phase end logic should only happen in onDone()
  if(global.SocializeMobile?.hide){
    try{
      global.SocializeMobile.hide();
    }catch(e){ /* Ignore errors */ }
  }
  
  // Reset flags for next phase
  if(global.game){
    delete global.game.__socialPhaseStartCalled;
    delete global.game.__socialPhaseEndCalled;
  }
}
```

**Key Changes:**
- ✅ Removed `onSocialPhaseEnd()` call entirely
- ✅ Only does UI cleanup (hide launcher, reset flags)
- ✅ Lets `onDone()` be the sole authority for phase end logic

#### 3. In `js/social-maneuvers.js` - Stripped setPhase wrapper of phase end logic

**BEFORE:**
```javascript
// Detect leaving social_intermission
if (previousPhase === 'social_intermission' && phase !== 'social_intermission') {
  console.info('[social-maneuvers] ✓ Leaving social_intermission');
  
  // Call onSocialPhaseEnd
  if (isEnabled()) {
    try {
      onSocialPhaseEnd(); // ❌ RACES WITH onDone!
    } catch(e) { /* ... */ }
  }
  
  // Close socialize modal if open
  // ... hide launcher, resume timer ...
}
```

**AFTER:**
```javascript
// Detect leaving social_intermission
if (previousPhase === 'social_intermission' && phase !== 'social_intermission') {
  console.info('[social-maneuvers] ✓ Leaving social_intermission');
  
  // REMOVED: onSocialPhaseEnd call - let onDone in social.js handle phase end logic
  // This prevents race conditions with the timer callback
  
  // Close socialize modal if open
  if (global.SocializeMobile?.closeModal) {
    global.SocializeMobile.closeModal();
  }
  
  // Hide launcher
  if (global.SocializeMobile?.hide) {
    global.SocializeMobile.hide();
  }
}
```

**Key Changes:**
- ✅ Removed `onSocialPhaseEnd()` call
- ✅ Removed timer resume logic (handled by onDone)
- ✅ Only UI cleanup remains

#### 4. In `js/social-maneuvers.js` - Added fallback to summary OK button

**BEFORE:**
```javascript
continueBtn.onclick = () => {
  // ... cleanup logic ...
  
  // Call the stored phase advancement callback
  const g = global.game;
  if (typeof g?.__socialPhaseAdvanceCallback === 'function') {
    console.info('[social-maneuvers] ✓ Calling stored phase advancement callback');
    try {
      g.__socialPhaseAdvanceCallback();
      delete g.__socialPhaseAdvanceCallback;
    } catch(e) { /* ... */ }
  } else {
    console.warn('[social-maneuvers] ⚠ No phase advancement callback found - phase may not advance');
    // ❌ GAME HALTS HERE!
  }
};
```

**AFTER:**
```javascript
continueBtn.onclick = () => {
  // ... cleanup logic ...
  
  // Call the stored phase advancement callback
  const g = global.game;
  if (typeof g?.__socialPhaseAdvanceCallback === 'function') {
    console.info('[social-maneuvers] ✓ Calling stored phase advancement callback');
    try {
      g.__socialPhaseAdvanceCallback();
      delete g.__socialPhaseAdvanceCallback;
    } catch(e) { /* ... */ }
  } else {
    // FALLBACK: advance phase directly if no callback stored
    console.warn('[social-maneuvers] ⚠ No callback found — advancing via fallback');
    try {
      // Try multiple nomination starter candidates
      const startNoms = global.startNominations || global.startNomination || global.startNoms;
      if(typeof startNoms === 'function') {
        console.info('[social-maneuvers] ✓ Advancing via startNominations fallback');
        startNoms();
      } else {
        // Ultimate fallback: use setPhase directly
        console.warn('[social-maneuvers] No startNominations found - using setPhase fallback');
        global.setPhase?.('nominations', global.game?.cfg?.tNoms || 25);
      }
    } catch(e) {
      console.error('[social-maneuvers] Fallback advancement failed:', e);
    }
  }
};
```

**Key Changes:**
- ✅ Added fallback logic if callback not found
- ✅ Tries multiple nomination starter function names
- ✅ Ultimate fallback uses `setPhase` directly
- ✅ Game will never halt, even in edge cases

#### 5. In `js/social.js` - Updated `startSocialIntermission()` flag reset

**BEFORE:**
```javascript
global.startSocialIntermission = async function(source, callback){
  const g=global.game; if(!g) return;
  ensureSocialState();
  g.__socialShown = 0;
  g.__socialLogBudget = 6;

  // Clear idempotency guard for new phase
  if(g) g.__socialOnDoneFired = false;
  
  // ...
```

**AFTER:**
```javascript
global.startSocialIntermission = async function(source, callback){
  const g=global.game; if(!g) return;
  ensureSocialState();
  g.__socialShown = 0;
  g.__socialLogBudget = 6;

  // Clear phase advancement guards for new phase
  if(g) {
    g.__socialPhaseAdvanced = false;
    delete g.__socialPhaseAdvanceCallback;
    delete g.__socialPhaseStartCalled;
    delete g.__socialPhaseEndCalled;
  }
  
  // ...
```

**Key Changes:**
- ✅ Replaced `__socialOnDoneFired` with `__socialPhaseAdvanced`
- ✅ Cleans up all phase-start flags
- ✅ Ensures clean slate for each new social phase

## Flow Diagram

### BEFORE (Buggy - Race Conditions)

```
Timer Expires          Energy Depletes
     |                       |
     v                       v
  onDone()          endSocialPhaseNow()
     |                       |
  Check guard          Set guards ✓
  Guard BLOCKED! ✗     Call onSocialPhaseEnd() ✓
  RETURN EARLY         Show summary ✓
  (no callback stored) 
                            |
                            v
                     User clicks OK
                            |
                            v
                   Look for callback
                   Callback = undefined ✗
                            |
                            v
                     ⚠️ GAME HALTS ⚠️
```

### AFTER (Fixed - No Race Conditions)

```
Timer Expires / Energy Depletes
            |
            v
        onDone()
            |
  Store callback FIRST ✓
            |
  Call onSocialPhaseEnd() ✓
            |
      Show summary ✓
            |
            v
     User clicks OK
            |
            v
   Look for callback
   Callback EXISTS ✓
            |
            v
  advanceToNextPhase() ✓
            |
            v
   Check __socialPhaseAdvanced guard
   (prevents double advancement)
            |
            v
    ✅ GAME ADVANCES ✅
```

## Expected Behavior After Fix

1. ✅ Social phase runs normally
2. ✅ When timer expires or energy depletes, `onDone` fires
3. ✅ `onDone` ALWAYS stores the `__socialPhaseAdvanceCallback` first
4. ✅ Summary shows (if data exists) → user clicks OK → callback fires → game advances
5. ✅ If no summary data → game advances immediately via `advanceToNextPhase()`
6. ✅ If summary shows but callback somehow missing → fallback in OK handler advances game
7. ✅ No infinite loops, no repeated `manualResume` calls, no game halts

## Testing

### Automated Tests
```bash
npm run test:social
```
✅ All tests pass

### Manual Testing
Open `test_social_summary_fix.html` or `test_social_phase_advancement_flows.html` in browser and verify:

1. Social phase completes normally
2. Summary popup appears
3. Clicking OK advances to nominations phase
4. No console errors about missing callbacks
5. Game continues without halting

## Files Changed

- `js/social.js` (45 lines changed)
  - Rewrote `onDone()` to always store callback first
  - Stripped `handleSocialPhaseExit()` of phase end logic
  - Updated `startSocialIntermission()` flag reset
  - Fixed linting issues

- `js/social-maneuvers.js` (23 lines changed)
  - Removed `onSocialPhaseEnd()` call from setPhase wrapper
  - Added fallback logic to summary OK button handler
  - Fixed extra closing brace

## Summary

This fix eliminates the race condition by making `onDone()` the **single source of truth** for phase advancement. The callback is now **always stored first**, before any other logic can interfere. The summary OK button has a fallback, and competing phase-end paths have been neutralized. The game will no longer halt after the social phase.
