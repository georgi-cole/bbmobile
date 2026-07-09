# Social Log Spam Fix - Implementation Summary

## Problem Statement

Users reported excessive console log spam from Social-related code, specifically:
- `[computeActionCost]` logs repeating many times (social-maneuvers.js:685)
- `[unified-success] Influence bonus:` logs repeating many times (social-action-config.js:360)
- `[social-launcher] re-mounted after DOM change` and repeated `Human player is evicted - not mounting launcher` messages

The core issue was a **remount loop/MutationObserver thrash** when the human player was evicted.

## Solution Overview

### 1. Gate High-Frequency Logs Behind debugSocialAI Flag

**Pattern Used:**
```javascript
const debugEnabled = global.game?.cfg?.debugSocialAI;
if (debugEnabled) {
  console.info('[module] debug message');
}
```

**Files Modified:**
- `js/social-maneuvers.js` (computeActionCost function)
- `js/social-action-config.js` (unified-success influence/info bonus)
- `js/social-maneuvers-launcher-bootstrap.js` (observer lifecycle, remount logs)

### 2. One-Time Eviction Skip Logging

**Problem:** Each mount attempt when player is evicted logged "Human player is evicted - not mounting launcher"

**Solution:** Per-phase logging guard
```javascript
// Track logged phase token
let _evictedSkipLoggedForPhase = null;

// Log only once per phase
const currentPhaseToken = `${g.phase}_${g.week}_evicted`;
if (_evictedSkipLoggedForPhase !== currentPhaseToken) {
  console.info('[socialize-mobile] Human player is evicted - not mounting launcher');
  _evictedSkipLoggedForPhase = currentPhaseToken;
}
```

**Files Modified:**
- `js/socialize-mobile.js`
- `js/social-maneuvers-launcher-bootstrap.js`

### 3. Remount Storm Prevention

**Root Cause:** MutationObserver continuously tried to remount launcher even when player was evicted or mounting failed.

**Three-Layer Protection:**

#### Layer 1: Rate Limiting
```javascript
let lastMountAttempt = 0;
const MOUNT_COOLDOWN_MS = 1000; // 1 second between attempts

const now = Date.now();
if (now - lastMountAttempt < MOUNT_COOLDOWN_MS) {
  return false; // Skip if too soon
}
lastMountAttempt = now;
```

#### Layer 2: Max Consecutive Failures
```javascript
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 3;

if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
  if (debugEnabled) {
    console.info('[social-launcher] Max consecutive failures reached - stopping remount attempts');
  }
  return false;
}

// On success: consecutiveFailures = 0
// On failure: consecutiveFailures++
```

#### Layer 3: Eviction Check in mountIfMissing()
```javascript
// Check if human player is evicted - don't mount for evicted players
const humanId = g.humanId;
const humanPlayer = global.getP?.(humanId);
if (humanPlayer && humanPlayer.evicted) {
  // Log once per phase
  const currentPhaseToken = `${g.phase}_${g.week}_evicted`;
  if (_evictedSkipLoggedForPhase !== currentPhaseToken) {
    console.info('[social-launcher] Human player is evicted - stopping remount attempts');
    _evictedSkipLoggedForPhase = currentPhaseToken;
  }
  consecutiveFailures++; // Increment to eventually stop trying
  return false;
}
```

**File Modified:**
- `js/social-maneuvers-launcher-bootstrap.js`

## Changes by File

### js/social-maneuvers.js
**Lines Modified:** 685-689
**Change:** Added debug gate for computeActionCost logging
```javascript
// Before:
console.info(`[computeActionCost] ${actionId}: ${total}⚡ (${breakdown})`);

// After:
const debugEnabled = global.game?.cfg?.debugSocialAI;
if (debugEnabled) {
  console.info(`[computeActionCost] ${actionId}: ${total}⚡ (${breakdown})`);
}
```

### js/social-action-config.js
**Lines Modified:** 360-375
**Change:** Added debug gates for influence/info bonus logging
```javascript
// Before:
console.info(`[unified-success] Influence bonus: ${influence.toFixed(1)} pts → +${(influenceBonus * 100).toFixed(1)}%`);
console.info(`[unified-success] Information boost: +${(infoBoost * 100).toFixed(1)}%`);

// After:
const debugEnabled = global.game?.cfg?.debugSocialAI;
if (debugEnabled) {
  console.info(`[unified-success] Influence bonus: ${influence.toFixed(1)} pts → +${(influenceBonus * 100).toFixed(1)}%`);
}
// (same for info boost)
```

### js/socialize-mobile.js
**Lines Modified:** 13-14, 125-132
**Changes:**
1. Added `_evictedSkipLoggedForPhase` tracking variable
2. Implemented per-phase one-time eviction logging

### js/social-maneuvers-launcher-bootstrap.js
**Lines Modified:** 11-19, 50-110, 120-135, 190-200
**Major Changes:**
1. Added rate-limiting variables (lastMountAttempt, MOUNT_COOLDOWN_MS)
2. Added consecutive failures tracking (consecutiveFailures, MAX_CONSECUTIVE_FAILURES)
3. Added eviction skip logging tracking (_evictedSkipLoggedForPhase)
4. Implemented rate limiting in mountIfMissing()
5. Implemented max consecutive failures check
6. Added eviction check in mountIfMissing()
7. Gated observer lifecycle logs behind debugSocialAI
8. Reset state when starting/stopping observer

## Behavioral Changes

### When debugSocialAI = false (default)
**Before:**
- ❌ Hundreds of `[computeActionCost]` logs during action selection
- ❌ Hundreds of `[unified-success]` logs during calculations
- ❌ Repeated "Human player is evicted" logs (every mutation)
- ❌ Repeated remount logs creating console spam

**After:**
- ✅ No `[computeActionCost]` logs
- ✅ No `[unified-success]` logs
- ✅ One "Human player is evicted" log per phase (maximum)
- ✅ No remount logs
- ✅ Clean console with only essential lifecycle logs

### When debugSocialAI = true (debug mode)
**Before and After (unchanged):**
- ✅ All verbose logs visible
- ✅ Detailed cost calculations
- ✅ Influence/info bonus math
- ✅ Remount debugging traces

### New Safeguards
1. **Rate limiting:** Prevents rapid remount attempts (1s cooldown)
2. **Failure tracking:** Stops after 3 consecutive failures
3. **Eviction awareness:** Launcher won't mount for evicted players
4. **State reset:** Counters reset when observer starts/stops

## Testing

### Automated Tests
- ✅ `npm run test:social` - All social phase requirements verified
- ✅ `codeql_checker` - No security vulnerabilities
- ✅ ESLint - No new linting errors introduced

### Manual Testing
Created `test_log_spam_fix_manual.html` with test cases:
1. **Test computeActionCost** - Verifies debug gating
2. **Test Influence Bonus** - Verifies unified-success gating
3. **Test Evicted Player Mount** - Verifies one-time logging
4. **Test Remount Storm** - Verifies rate limiting and failure tracking

## Verification Checklist

- [x] High-frequency logs gated behind debugSocialAI flag
- [x] One-time eviction skip logging per phase
- [x] Remount storm prevented with 3-layer protection
- [x] Observer lifecycle logs gated for clean console
- [x] No behavior regression for non-evicted humans
- [x] All tests pass
- [x] No security vulnerabilities
- [x] No new linting errors

## Performance Impact

**Before:**
- Potentially thousands of logs per second during social phase
- MutationObserver thrashing when player evicted
- Console performance degradation

**After:**
- Minimal logging in production (debugSocialAI = false)
- Rate-limited mount attempts (max 1 per second)
- Max 3 consecutive failures before stopping
- Negligible performance impact

## Compatibility

- ✅ Backward compatible - debugSocialAI defaults to false
- ✅ No breaking changes to APIs
- ✅ Existing game saves work unchanged
- ✅ Debug mode preserves all verbose logging for development

## Files Changed

```
js/social-maneuvers.js                      (+6 lines)
js/social-action-config.js                  (+12 lines)
js/socialize-mobile.js                      (+10 lines)
js/social-maneuvers-launcher-bootstrap.js   (+72 lines)
test_log_spam_fix_manual.html               (new file)
```

Total: 4 files modified, 1 file created, ~100 lines added

## Related Documentation

- `SOCIAL_LOG_NOISE_SUMMARY.md` - Previous log noise reduction efforts
- `SOCIAL_LOG_NOISE_TESTING.md` - Testing guide for log noise
- `SOCIAL_MANEUVERS_FIXES_SUMMARY.md` - General social maneuvers fixes
- `test_social_log_noise_reduction.html` - Existing log noise test

## Future Improvements

1. Consider adding a global log level config (NONE, ERROR, WARN, INFO, DEBUG)
2. Consider extracting debug helper to shared utility module
3. Consider telemetry for tracking mount failures in production
4. Consider adding metrics for remount attempt frequency

---

**Implementation Date:** 2026-02-06
**Issue:** Fix remaining Social-related console log spam and launcher remount storm
**Status:** ✅ Complete
