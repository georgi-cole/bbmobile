# Social Maneuvers Default Enablement - Validation Guide

## Overview
This document provides validation steps to confirm the Social Maneuvers system is the only social module used at runtime, preloaded and enabled by default with zero manual console steps.

## Validation Steps

### 1. On Load - Console Verification

When the game loads, the browser console should display:

```
[social-maneuvers] ✓ Defaulted enableSocialManeuvers to TRUE (preloaded and enabled by default)
[social-maneuvers] ✓ Module loaded successfully
[social-maneuvers] ✓ Enabled by default (enableSocialManeuvers=true)
[social-maneuvers] Runtime control: window.USE_SOCIAL_MANEUVERS = true/false
[social-maneuvers] Current state: USE_SOCIAL_MANEUVERS = true
```

**Verification Points:**
- ✅ No raw.githack or Social-redesign CDN includes in console
- ✅ Module loads before social.js (proper script order)
- ✅ Flag defaults to `true` without manual intervention
- ✅ `window.USE_SOCIAL_MANEUVERS` is readable and writable

### 2. During Social Intermission Phase

When entering the social_intermission phase, console should log:

```
[social] ✓ Entering social_intermission phase
[social] Checking Social Maneuvers feature flag...
[social] ✓ Social Maneuvers path - Using new Social Maneuvers system
[social-maneuvers] ✓ startPhase() triggered successfully
[social] ✓ Social Maneuvers enabled - skipping legacy simulateHouseSocial()
[social] ✓ Rendering Social Maneuvers UI (human present)
[social-maneuvers] ✓ Rendering Social Maneuvers UI completed
[social] Skipping legacy buildSocialDecisions() (using Social Maneuvers)
```

**Verification Points:**
- ✅ Social Maneuvers path is taken
- ✅ `SocialManeuvers.onSocialPhaseStart()` is called
- ✅ `SocialManeuvers.renderSocialManeuversUI()` renders UI
- ✅ NO logs about "Using legacy social simulation"
- ✅ NO logs about rendering basic select UI

### 3. Legacy System Bypass

Console should **NOT** show:
- ❌ "Using legacy social simulation"
- ❌ "Rendering basic social UI"
- ❌ Any simulateHouseSocial() execution logs when Social Maneuvers is enabled

### 4. Fast-Forward Protection

If fast-forward is attempted during social_intermission:

```
[ff] ⚠️ Fast-forward blocked during social_intermission phase to prevent accidental skips
[ff] Stack trace for social phase fast-forward attempt:
```

**Verification:** Fast-forward does not skip the social phase.

### 5. Runtime Toggle

Test the setter functionality:

```javascript
// In browser console:
window.USE_SOCIAL_MANEUVERS = false;
// Should log: [social-maneuvers] Flag changed: true → false (USE_SOCIAL_MANEUVERS=false)

window.USE_SOCIAL_MANEUVERS = true;
// Should log: [social-maneuvers] Flag changed: false → true (USE_SOCIAL_MANEUVERS=true)
```

**Verification:** Flag syncs with `game.cfg.enableSocialManeuvers`

### 6. Error Handling

If Social Maneuvers UI fails to render, the phase should:
- ✅ Display error message in UI (not silently fail)
- ✅ Log error with stack trace
- ✅ Maintain social phase (no fallback to legacy)
- ✅ Log: "Maintaining social phase UI (no fallback to legacy)"

### 7. Script Loading Order

Verify in page source (`view-source:` or Inspect Element):

```html
<!-- Game flows -->
<!-- Social Maneuvers system (loaded before social.js to ensure availability) -->
<script src="js/social-narrative.js"></script>
<script src="js/social-maneuvers.js"></script>
<script src="js/social.js"></script>
```

**Verification Points:**
- ✅ social-maneuvers.js loads BEFORE social.js
- ✅ Scripts are NOT deferred (load synchronously)
- ✅ No duplicate includes of social-narrative.js or social-maneuvers.js
- ✅ No external CDN references to raw.githack

## Automated Test

Run the automated test to verify all requirements:

```bash
# Start HTTP server
python3 -m http.server 8080

# Open in browser
http://localhost:8080/test_social_maneuvers_default.html
```

Expected result: **8/8 tests passing** ✅

## Manual Test Procedure

1. **Load game** - Check console for module initialization logs
2. **Start new game** - Confirm no errors during initialization
3. **Wait for social_intermission phase** - Verify correct logs and UI renders
4. **Interact with Social Maneuvers UI** - Select player, action, execute
5. **Try fast-forward** - Confirm it's blocked during social phase
6. **Toggle flag in console** - Test `window.USE_SOCIAL_MANEUVERS = false/true`
7. **Check no legacy behavior** - No simulateHouseSocial or basic UI logs

## Success Criteria

All of the following must be true:

- [x] Module loads and defaults to enabled
- [x] Console logs match expected patterns
- [x] Social Maneuvers UI renders during social phase
- [x] Legacy simulation is bypassed
- [x] Fast-forward is blocked during social phase
- [x] Runtime toggle works via `window.USE_SOCIAL_MANEUVERS`
- [x] No external CDN dependencies
- [x] Proper script loading order
- [x] Error handling maintains phase state

## Troubleshooting

### Issue: "SocialManeuvers is not defined"
**Solution:** Check script loading order. social-maneuvers.js must load before social.js.

### Issue: Legacy UI appears instead of Social Maneuvers
**Solution:** Verify `window.USE_SOCIAL_MANEUVERS === true` in console.

### Issue: No console logs appear
**Solution:** Check browser console filter settings. Look for `[social-maneuvers]` prefix.

### Issue: Phase skips immediately
**Solution:** Verify fast-forward guard is active. Check for `[ff] ⚠️` warning in console.

## Implementation Summary

### Changes Made

1. **index.html**
   - Moved social-narrative.js and social-maneuvers.js to load before social.js
   - Removed deferred loading for these scripts
   - Added comment documenting the relocation

2. **js/social-maneuvers.js**
   - Added `initDefaultFlag()` to auto-enable if undefined
   - Made `window.USE_SOCIAL_MANEUVERS` getter/setter writable
   - Enhanced logging for flag changes
   - Updated module initialization logs

3. **js/social.js**
   - Added entry log for `startSocialIntermission`
   - Bypassed `simulateHouseSocial()` when Social Maneuvers enabled
   - Skip legacy `buildSocialDecisions()` when Social Maneuvers enabled
   - Enhanced error handling (no silent fallback)
   - Added comprehensive instrumentation logs

4. **js/ui.hud-and-router.js**
   - Added fast-forward guard for social_intermission phase
   - Added console.warn and console.trace on blocked attempts

### CSS Styles

Social Maneuvers UI styles already present in `overrides-fixes.css`:
- `.social-maneuvers-panel` - Main container
- `.social-energy-bar` - Energy display
- `.social-player-grid` - Player selection
- `.social-actions-list` - Action menu
- `.social-feedback-panel` - Outcome feedback

## Related Documentation

- [Social Maneuvers README](SOCIAL_MANEUVERS_README.md)
- [Social Logic v2 Guide](docs/social-logic-v2-guide.md)
- [Player Model Social Maneuvers](PLAYER_MODEL_SOCIAL_MANEUVERS.md)
