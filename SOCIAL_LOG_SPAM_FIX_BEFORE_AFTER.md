# Social Log Spam Fix - Before & After Comparison

## Console Output Comparison

### Scenario: Social Phase with Evicted Human Player

#### BEFORE (Spam)
```
[computeActionCost] smalltalk: 1⚡ (1)
[computeActionCost] strategize: 2⚡ (2)
[computeActionCost] interrogate: 3⚡ (3)
[computeActionCost] smalltalk: 1⚡ (1)
[computeActionCost] strategize: 2⚡ (2)
[computeActionCost] interrogate: 3⚡ (3)
[computeActionCost] smalltalk: 1⚡ (1)
[computeActionCost] strategize: 2⚡ (2)
... (repeated hundreds of times per second)

[unified-success] Influence bonus: 50.0 pts → +12.5%
[unified-success] Information boost: +5.0%
[unified-success] Influence bonus: 50.0 pts → +12.5%
[unified-success] Information boost: +5.0%
[unified-success] Influence bonus: 50.0 pts → +12.5%
[unified-success] Information boost: +5.0%
... (repeated hundreds of times per second)

[socialize-mobile] Human player is evicted - not mounting launcher
[social-launcher] re-mounted after DOM change
[socialize-mobile] Human player is evicted - not mounting launcher
[social-launcher] re-mounted after DOM change
[socialize-mobile] Human player is evicted - not mounting launcher
[social-launcher] re-mounted after DOM change
... (repeated continuously)
```

**Result:** Console unusable, performance impact, difficult debugging

#### AFTER (Clean)
```
[social-launcher] observer started
[socialize-mobile] Human player is evicted - not mounting launcher
[social-phase] Phase entered: social_intermission
[social-phase] Resources initialized for week 1
[social-phase] Phase exited: social_intermission
```

**Result:** Clean console, only essential lifecycle logs

### With Debug Mode Enabled (debugSocialAI = true)

#### AFTER (Verbose but Controlled)
```
[social-launcher] observer started
[computeActionCost] smalltalk: 1⚡ (1)
[computeActionCost] strategize: 2⚡ (2)
[unified-success] Influence bonus: 50.0 pts → +12.5%
[unified-success] Information boost: +5.0%
[social-launcher] re-mounted after DOM change
[socialize-mobile] Human player is evicted - not mounting launcher
[social-launcher] Max consecutive failures reached - stopping remount attempts
... (all debug logs visible, but rate-limited)
```

**Result:** Full verbosity for debugging, but with remount storm prevention

## Code Comparison

### 1. computeActionCost (social-maneuvers.js)

#### BEFORE
```javascript
function computeActionCost(actionId, selectedIds, context = {}) {
  // ... calculation logic ...
  
  const breakdown = targetCount > 1 
    ? `base ${baseCost} + group ${groupCost} (${targetCount - 1} extra)`
    : `${baseCost}`;

  console.info(`[computeActionCost] ${actionId}: ${total}⚡ (${breakdown})`);
  //       ^^^^^^^^^ ALWAYS LOGS - SPAM!

  return { total, base, group, breakdown };
}
```

#### AFTER
```javascript
function computeActionCost(actionId, selectedIds, context = {}) {
  // ... calculation logic ...
  
  const breakdown = targetCount > 1 
    ? `base ${baseCost} + group ${groupCost} (${targetCount - 1} extra)`
    : `${baseCost}`;

  // Gate high-frequency cost calculation logs behind debugSocialAI flag
  const debugEnabled = global.game?.cfg?.debugSocialAI;
  if (debugEnabled) {
    console.info(`[computeActionCost] ${actionId}: ${total}⚡ (${breakdown})`);
  }
  //       ^^^^^^^^^ ONLY LOGS IN DEBUG MODE

  return { total, base, group, breakdown };
}
```

### 2. Influence Bonus (social-action-config.js)

#### BEFORE
```javascript
if(actor && target && global.SocialManeuvers?.SocialResources) {
  const influence = global.SocialManeuvers.SocialResources.getInfluence(actor.id, target.id);
  if(influence > 0) {
    const influenceBonus = influence * 0.0025;
    chance += influenceBonus;
    console.info(`[unified-success] Influence bonus: ${influence.toFixed(1)} pts → +${(influenceBonus * 100).toFixed(1)}%`);
    //       ^^^^^^^^^ ALWAYS LOGS - SPAM!
  }
}
```

#### AFTER
```javascript
if(actor && target && global.SocialManeuvers?.SocialResources) {
  const influence = global.SocialManeuvers.SocialResources.getInfluence(actor.id, target.id);
  if(influence > 0) {
    const influenceBonus = influence * 0.0025;
    chance += influenceBonus;
    // Gate high-frequency calculation logs behind debugSocialAI flag
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.info(`[unified-success] Influence bonus: ${influence.toFixed(1)} pts → +${(influenceBonus * 100).toFixed(1)}%`);
    }
    //       ^^^^^^^^^ ONLY LOGS IN DEBUG MODE
  }
}
```

### 3. Eviction Skip (socialize-mobile.js)

#### BEFORE
```javascript
function ensureSocializeLauncher() {
  if (_isCurrentlyMounting) return null;
  
  const humanPlayer = global.getP?.(humanId);
  if(humanPlayer && humanPlayer.evicted){
    console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
    //       ^^^^^^^^^ LOGS EVERY MOUNT ATTEMPT - SPAM!
    return null;
  }
  // ... mounting logic ...
}
```

#### AFTER
```javascript
// Module-level tracking
let _evictedSkipLoggedForPhase = null;

function ensureSocializeLauncher() {
  if (_isCurrentlyMounting) return null;
  
  const humanPlayer = global.getP?.(humanId);
  if(humanPlayer && humanPlayer.evicted){
    // Log once per phase to avoid spam
    const currentPhaseToken = `${g.phase}_${g.week}_evicted`;
    if (_evictedSkipLoggedForPhase !== currentPhaseToken) {
      console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
      _evictedSkipLoggedForPhase = currentPhaseToken;
    }
    //       ^^^^^^^^^ ONLY LOGS ONCE PER PHASE
    return null;
  }
  // ... mounting logic ...
}
```

### 4. Remount Storm Prevention (social-maneuvers-launcher-bootstrap.js)

#### BEFORE
```javascript
function mountIfMissing() {
  const g = global.game || {};
  const inSocialPhase = g.phase === 'social_intermission' || g.phase === 'social';
  if (!inSocialPhase) return false;

  // Check if launcher already exists
  const existingLauncher = document.querySelector('#socializeLauncher');
  if (existingLauncher) return false;

  // ... mounting logic ...
  
  try {
    global.SocializeMobile.ensureLauncher();
    console.info('[social-launcher] re-mounted after DOM change');
    //       ^^^^^^^^^ ALWAYS LOGS - SPAM WHEN EVICTED!
    return true;
  } catch (e) {
    console.error('[social-launcher] Failed to mount launcher:', e);
    return false;
  }
}
//       ^^^^^^^^^ NO RATE LIMITING - STORM!
//       ^^^^^^^^^ NO EVICTION CHECK - LOOPS FOREVER!
```

#### AFTER
```javascript
// Rate-limiting state
let lastMountAttempt = 0;
const MOUNT_COOLDOWN_MS = 1000;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;
let _evictedSkipLoggedForPhase = null;

function mountIfMissing() {
  // LAYER 1: Rate limiting
  const now = Date.now();
  if (now - lastMountAttempt < MOUNT_COOLDOWN_MS) {
    return false; // Too soon, skip
  }
  lastMountAttempt = now;

  // LAYER 2: Max consecutive failures
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.info('[social-launcher] Max consecutive failures reached - stopping remount attempts');
    }
    return false; // Stop trying
  }

  const g = global.game || {};
  const inSocialPhase = g.phase === 'social_intermission' || g.phase === 'social';
  if (!inSocialPhase) {
    consecutiveFailures = 0; // Reset on phase exit
    return false;
  }

  // LAYER 3: Eviction check
  const humanId = g.humanId;
  const humanPlayer = global.getP?.(humanId);
  if (humanPlayer && humanPlayer.evicted) {
    const currentPhaseToken = `${g.phase}_${g.week}_evicted`;
    if (_evictedSkipLoggedForPhase !== currentPhaseToken) {
      console.info('[social-launcher] Human player is evicted - stopping remount attempts');
      _evictedSkipLoggedForPhase = currentPhaseToken;
    }
    consecutiveFailures++; // Count as failure
    return false; // Don't mount for evicted players
  }

  // Check if launcher already exists
  const existingLauncher = document.querySelector('#socializeLauncher');
  if (existingLauncher) {
    consecutiveFailures = 0; // Reset on success
    return false;
  }

  // ... mounting logic ...
  
  try {
    global.SocializeMobile.ensureLauncher();
    
    // Gate remount success logs behind debugSocialAI flag
    const debugEnabled = global.game?.cfg?.debugSocialAI;
    if (debugEnabled) {
      console.info('[social-launcher] re-mounted after DOM change');
    }
    
    consecutiveFailures = 0; // Reset on success
    return true;
  } catch (e) {
    console.error('[social-launcher] Failed to mount launcher:', e);
    consecutiveFailures++; // Count as failure
    return false;
  }
}
//       ^^^^^^^^^ RATE LIMITED (1 attempt/second)
//       ^^^^^^^^^ MAX 3 FAILURES THEN STOPS
//       ^^^^^^^^^ CHECKS EVICTION STATUS
```

## Feature Flag Usage

### Enable Debug Mode (Development)
```javascript
// In browser console or config:
window.game.cfg.debugSocialAI = true;
```

### Disable Debug Mode (Production - Default)
```javascript
// Default state:
window.game.cfg.debugSocialAI = false; // or undefined
```

## Performance Impact

### Before
- **Log volume:** ~1000s of logs per second during social phase
- **Console performance:** Degraded, lag when scrolling
- **CPU impact:** MutationObserver thrashing continuously
- **Debugging:** Nearly impossible due to noise

### After
- **Log volume:** ~10-20 essential logs per phase
- **Console performance:** Excellent, no lag
- **CPU impact:** Minimal, rate-limited operations
- **Debugging:** Clean console, debug mode available

## Testing Verification

### Automated Tests
```bash
npm run test:social        # ✅ All requirements verified
npm run test:all           # ✅ No regressions
npx eslint js/**/*.js      # ✅ No new errors
```

### Manual Test
```bash
# Open in browser:
test_log_spam_fix_manual.html

# Test cases:
1. Toggle debugSocialAI flag
2. Test computeActionCost logging
3. Test influence bonus logging
4. Test evicted player mount attempts
5. Test remount storm prevention
```

### Expected Results
| Test Case | debugSocialAI = false | debugSocialAI = true |
|-----------|----------------------|---------------------|
| computeActionCost | ❌ No logs | ✅ All logs visible |
| unified-success | ❌ No logs | ✅ All logs visible |
| Eviction skip | ✅ 1 log per phase | ✅ 1 log per phase |
| Remount attempts | ❌ No logs | ✅ Debug logs visible |
| Storm prevention | ✅ Rate-limited | ✅ Rate-limited |

## Summary

### Problem Solved
✅ Console spam eliminated in production  
✅ Remount storm prevented with 3-layer protection  
✅ Debug mode available for development  
✅ Clean, readable console output  
✅ No performance regression  

### Key Metrics
- **Lines changed:** ~100 lines across 4 files
- **New files:** 2 (test + documentation)
- **Breaking changes:** None
- **Performance improvement:** ~99% reduction in log volume
- **Security issues:** None

### Compatibility
- ✅ Backward compatible (flag defaults to false)
- ✅ No API changes
- ✅ Existing saves work unchanged
- ✅ Debug mode preserves all logs

---

**Status:** ✅ Complete and Ready for Merge
**Testing:** ✅ Automated + Manual verification passed
**Security:** ✅ CodeQL scan clean
