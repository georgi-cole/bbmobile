# Nominations Resilient Interceptor - Quick Reference

## 🎯 What It Does

Automatically detects and recovers when `renderNomsPanel` is overwritten, ensuring the fullscreen nomination selector always works for human HOH players.

## 🔧 How to Debug

### Check Wrapper Status

```javascript
// Check if interceptor is installed and active
window.NomsFS.debug()
// Returns: { installed: true, wrapped: true, ... }
```

### Manually Verify Wrapper

```javascript
// Force verification and re-wrap if needed
window.NomsFS.verifyWrapper()
// Returns: true (active or re-wrapped), false (failed)
```

### Check Sentinel Directly

```javascript
// Check if our wrapper is currently active
window.renderNomsPanel.__nfsWrapped
// Returns: true (our wrapper), undefined (overwritten)
```

## 📋 Console Log Patterns

### ✅ Successful Flow

```
[noms-fs] ✓ Interceptor installed successfully
[noms-fs] ✓ Hooked into startNominations
[noms-fs] Entering nominations phase
[noms-fs] Started verification polling
[noms-fs] Interceptor called
[noms-fs] intercept check { nomsLocked: false, hohHuman: true, ... }
[noms-fs] Human HOH detected, attempting fullscreen flow
[noms-fs] Showing intro card
[noms-fs] Opening fullscreen selector
[noms-fs] ✓ Fullscreen selector opened
```

### 🔄 Re-wrapping (Recovery)

```
[noms-fs] Entering nominations phase
[noms-fs] re-wrapped renderNomsPanel (was overwritten)
[noms-fs] Started verification polling
```

### ⚠️ Interceptor Declined

```
[noms-fs] Interceptor called
[noms-fs] intercept check { nomsLocked: true, ... }
[noms-fs] Interceptor declined: nominations already locked/committed - { ... }
```

```
[noms-fs] Interceptor called
[noms-fs] intercept check { hohHuman: false, ... }
[noms-fs] Interceptor declined: not human HOH - { ... }
```

### 🛡️ Fallback Delegation

```
[noms] Human HOH detected - checking for NomsFS availability
[noms] NomsFS available - delegating to NomsFS.showIntro()
[noms] NomsFS.showIntro() succeeded, opening selector
[noms] Selections from NomsFS: [2, 3]
```

## 🔍 Common Issues

### Issue: "Interceptor not installing"

**Symptoms:**
- No `[noms-fs] ✓ Interceptor installed successfully` log
- `window.NomsFS.debug()` shows `installed: false`

**Solution:**
- Check that `nominations.js` loads before `nominations-grid-fullscreen.js`
- Verify `renderNomsPanel` exists: `typeof window.renderNomsPanel === 'function'`
- Check browser console for errors

### Issue: "Interceptor keeps getting overwritten"

**Symptoms:**
- Multiple `[noms-fs] re-wrapped renderNomsPanel` logs
- Wrapper seems unstable

**Solution:**
- This is expected behavior if some module repeatedly redefines `renderNomsPanel`
- The re-wrapping is automatic and should not affect functionality
- To identify the culprit, add a breakpoint in `verifyWrapper()` and check call stack

### Issue: "Selector never opens"

**Symptoms:**
- Intro card appears but selector doesn't open
- Or fallback card appears instead

**Solution:**
1. Check wrapper status: `window.NomsFS.debug()` - should show `wrapped: true`
2. Check phase: `window.game.phase === 'nominations'`
3. Check locks: `window.game.nomsLocked === false`
4. Check HOH: `window.getP(window.game.hohId).human === true`
5. Check console for error messages

### Issue: "Fallback card appears instead of fullscreen"

**Symptoms:**
- See `[noms] NomsFS not available - showing fallback intro card`

**Solution:**
- Verify `nominations-grid-fullscreen.js` loaded: `typeof window.NomsFS === 'object'`
- Check interceptor installed: `window.NomsFS.debug().installed === true`
- Verify wrapper active: `window.NomsFS.debug().wrapped === true`

## 🧪 Manual Testing

### Test Re-wrapping

```javascript
// 1. Check initial state
console.log('Initial:', window.renderNomsPanel.__nfsWrapped); // Should be true

// 2. Simulate overwrite
const original = window.renderNomsPanel;
window.renderNomsPanel = function() { console.log('Overwritten'); };
console.log('After overwrite:', window.renderNomsPanel.__nfsWrapped); // undefined

// 3. Trigger verification
window.NomsFS.verifyWrapper();
console.log('After verify:', window.renderNomsPanel.__nfsWrapped); // Should be true
```

### Test Phase Entry

```javascript
// Set up game state
window.game.phase = 'nominations';
window.game.nomsLocked = false;
window.game.hohId = 1;
window.getP(1).human = true;

// Trigger phase entry
window.startNominations();

// Check console for:
// [noms-fs] Entering nominations phase
// [noms-fs] Started verification polling
```

### Test Fallback Delegation

```javascript
// Temporarily disable interceptor
const saved = window.renderNomsPanel;
window.renderNomsPanel = window.renderNomsPanel.__originalNomsPanel || saved;

// Call fallback path
window.renderNomsPanel();

// Check console for:
// [noms] NomsFS available - delegating to NomsFS.showIntro()
```

## 📊 Performance Impact

| Metric | Impact |
|--------|--------|
| Initial Load | +100ms (retry delay) |
| Phase Entry | +1 verification call (instant) |
| During Phase | Up to 10 verification calls over ~10s |
| Memory | 1 timer handle (auto-cleared) |
| Network | 0 additional requests |
| CPU | Negligible (O(1) sentinel check) |

## 🔑 Key Functions

### In `nominations-grid-fullscreen.js`

| Function | Purpose |
|----------|---------|
| `installInterceptor()` | Wraps `renderNomsPanel` with sentinel marker |
| `verifyWrapper()` | Checks sentinel and re-wraps if missing |
| `startVerificationPolling()` | Polls for overwrites with exponential backoff |
| `onEnterNominationsPhase()` | Called on phase entry to verify wrapper |
| `hookStartNominations()` | Wraps `startNominations` to trigger verification |
| `interceptedRenderNomsPanel()` | Our wrapper that shows fullscreen flow |

### In `nominations.js`

| Function | Purpose |
|----------|---------|
| `renderNomsPanel()` | Original function, enhanced with NomsFS delegation |

## 🎨 Diagnostic Output Structure

```javascript
{
  installed: boolean,        // __nomsFsInstalled flag set?
  wrapped: boolean,          // Sentinel present on renderNomsPanel?
  selectorActive: boolean,   // Selector currently open?
  selectedCount: number,     // # selections made
  requiredCount: number,     // # selections needed
  game: {
    phase: string,           // Current game phase
    nomsLocked: boolean,     // Nominations locked?
    __nomsCommitInProgress: boolean,  // Commit in progress?
    __nomsCommitted: boolean, // Already committed?
    nominees: number,        // Current nominee count
    hohId: number,           // HOH player ID
    hohHuman: boolean        // HOH is human?
  },
  eligible: number,          // # eligible nominees
  requiredSlots: number,     // # slots (twist-aware)
  centerBias: string,        // TV centering bias
  forceExactCenter: boolean  // Override flag
}
```

## 🚨 Error Scenarios

### Interceptor Declines

```javascript
// Scenario 1: Already locked
{
  nomsLocked: true,
  __nomsCommitInProgress: false,
  __nomsCommitted: false,
  hohHuman: true
}
// LOG: "Interceptor declined: nominations already locked/committed"
```

```javascript
// Scenario 2: Not human HOH
{
  nomsLocked: false,
  __nomsCommitInProgress: false,
  __nomsCommitted: false,
  hohHuman: false
}
// LOG: "Interceptor declined: not human HOH"
```

### Re-wrap Triggers

```javascript
// Before: window.renderNomsPanel.__nfsWrapped === undefined
// After:  window.renderNomsPanel.__nfsWrapped === true
// LOG: "[noms-fs] re-wrapped renderNomsPanel (was overwritten)"
```

## 🛠️ Maintenance Tips

### Adding New Diagnostic Fields

Edit `interceptedRenderNomsPanel()` to collect additional diagnostics:

```javascript
const diagnostics = {
  nomsLocked: g.nomsLocked || false,
  // Add new field here
  myNewField: g.myNewField || defaultValue,
  // ...
};

console.log(LOG_PREFIX, 'intercept check', diagnostics);
```

### Adjusting Polling Behavior

Edit `startVerificationPolling()` parameters:

```javascript
const maxAttempts = 10;    // Change max attempts (default: 10)
let delay = 100;           // Change initial delay (default: 100ms)
delay = Math.min(2000, delay * 2);  // Change max delay (default: 2000ms)
```

### Disabling Verification Polling

Temporarily disable polling for debugging:

```javascript
function startVerificationPolling() {
  console.log(LOG_PREFIX, 'Verification polling disabled for debugging');
  return; // Early return
  
  // ... rest of function
}
```

## 🔗 Related Files

- `js/nominations.js` - Original nomination logic with enhanced fallback
- `js/nominations-grid-fullscreen.js` - Resilient interceptor implementation
- `js/nominations-enhancer.js` - Mobile animation enhancements (doesn't affect interceptor)
- `test_nominations_resilient_interceptor.html` - Manual test page
- `NOMINATIONS_RESILIENT_INTERCEPTOR_SUMMARY.md` - Detailed implementation guide
- `NOMINATIONS_RESILIENT_INTERCEPTOR_FLOW.md` - Visual flow diagrams

## 📚 Additional Resources

- [Implementation Summary](./NOMINATIONS_RESILIENT_INTERCEPTOR_SUMMARY.md) - Complete technical documentation
- [Flow Diagrams](./NOMINATIONS_RESILIENT_INTERCEPTOR_FLOW.md) - Visual representations of all flows
- [Test Page](./test_nominations_resilient_interceptor.html) - Interactive testing interface

## 🎯 Quick Checklist for Issues

When debugging nomination issues:

- [ ] Check `window.NomsFS.debug()` output
- [ ] Verify `wrapped: true` in debug output
- [ ] Check for `[noms-fs] intercept check` logs
- [ ] Look for `[noms-fs] Interceptor declined` messages
- [ ] Check if `renderNomsPanel.__nfsWrapped === true`
- [ ] Verify game state: `phase`, `nomsLocked`, `hohHuman`
- [ ] Check browser console for JavaScript errors
- [ ] Try manual `window.NomsFS.verifyWrapper()`
- [ ] Review recent console logs for re-wrapping messages

## 💡 Pro Tips

1. **Use `NomsFS.debug()` first**: Always start debugging with the debug output
2. **Watch for re-wrapping**: Multiple re-wraps indicate another module is overwriting
3. **Check diagnostics**: The interceptor logs full diagnostics when it declines
4. **Fallback is smart**: If interceptor fails, fallback delegates to NomsFS
5. **Polling is automatic**: You don't need to manually re-wrap - it's automatic
6. **Safety net exists**: Even if everything fails, user sees an informative message
