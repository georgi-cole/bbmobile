# Social Maneuvers Feature Integration Audit

## Summary
This document details the audit results for the Social Maneuvers feature integration, including verification steps and console logging for runtime debugging.

## Audit Results

### ✅ Feature Flag Implementation
- **Location**: `js/settings.js` line 49
- **Default value**: `true` (enabled by default)
- **Configuration path**: `game.cfg.enableSocialManeuvers`
- **Backward-compatible flag**: `window.USE_SOCIAL_MANEUVERS` (read-only property)

### ✅ Module Loading
- **Module file**: `js/social-maneuvers.js`
- **Loaded in**: `index.html` line 403
- **Load method**: `<script defer src="js/social-maneuvers.js"></script>`
- **Global export**: `window.SocialManeuvers`

### ✅ Phase Integration
- **Entry point**: `startSocialIntermission()` in `js/social.js`
- **Hook called**: `SocialManeuvers.onSocialPhaseStart()` (line 696)
- **Backward-compatible alias**: `SocialManeuvers.startPhase()` exists
- **Exit hook**: `SocialManeuvers.onSocialPhaseEnd()` called in phase cleanup

### ✅ UI Integration
- **Render function**: `renderSocialPhase()` in `js/social.js`
- **UI condition**: Lines 517-529 check `SocialManeuvers.isEnabled()`
- **Enhanced UI**: `SocialManeuvers.renderSocialManeuversUI()` renders when enabled
- **Fallback**: Basic social UI renders when disabled

### ✅ Console Logging (Added for Verification)
All console logs use prefixes for easy filtering:
- `[social-maneuvers]` - from social-maneuvers.js
- `[social]` - from social.js integration points

## Verification Steps

### Step 1: Check Module Load
Open the browser console and verify:
```
[social-maneuvers] Module loaded successfully
[social-maneuvers] Feature is ENABLED by default - disable via Settings > Social Maneuvers if desired
[social-maneuvers] Runtime flag: window.USE_SOCIAL_MANEUVERS (currently: true)
```

### Step 2: Check Runtime Flag Access
In browser console, type:
```javascript
window.USE_SOCIAL_MANEUVERS
// Should return: true (if enabled by default)

window.SocialManeuvers.isEnabled()
// Should return: true (if enabled by default)
```

### Step 3: Verify Enabled Behavior (Default)
Start a game and advance to the social phase. Console should show:
```
[social-maneuvers] ✓ Feature flag enabled (USE_SOCIAL_MANEUVERS=true)
[social] Checking Social Maneuvers feature flag...
[social] ✓ Social Maneuvers ENABLED - triggering SocialManeuvers.startPhase()
[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with energy system
[social-maneuvers] Energy initialized for N players (3 energy each)
[social] Rendering social phase UI
[social] Social Maneuvers enabled - skipping legacy simulation
[social] ✓ Rendering enhanced Social Maneuvers UI
[social-maneuvers] ✓ Rendering Social Maneuvers UI for player X
```

### Step 4: Disable Feature (Optional)
Users can disable the feature via Settings UI or console:
```javascript
game.cfg.enableSocialManeuvers = false
```

### Step 5: Verify Disabled Behavior
If disabled, console should show:
```
[social] Checking Social Maneuvers feature flag...
[social] Social Maneuvers DISABLED - using legacy social system
[social] Rendering social phase UI
[social] Using legacy social simulation (Social Maneuvers disabled)
[social] Rendering basic social UI (Social Maneuvers disabled)
```

Additionally, if SocialManeuvers hooks are called:
```
[social-maneuvers] Phase start called but feature is DISABLED (USE_SOCIAL_MANEUVERS=false)
```

### Step 6: Verify UI Rendering
When enabled, the social phase should display:
- Energy bar showing "Social Energy: 3/5"
- Player selection interface
- Action menu with energy costs
- Execute action button

When disabled, the social phase shows the basic social UI with dropdown selectors.

### Step 7: Verify Phase End
At the end of social phase, console should show:
```
[social-maneuvers] ✓ Social phase complete - cleaning up
```

## Console Log Reference

### Module Load Logs
```
[social-maneuvers] Module loaded successfully
[social-maneuvers] Feature is DISABLED by default - enable via Settings > Social Maneuvers
[social-maneuvers] To enable: game.cfg.enableSocialManeuvers = true
[social-maneuvers] Runtime flag: window.USE_SOCIAL_MANEUVERS (currently: [boolean])
```

### Feature Flag Check Logs
**When enabled:**
```
[social-maneuvers] ✓ Feature flag enabled (USE_SOCIAL_MANEUVERS=true)
```

**When disabled:**
No log from isEnabled() unless another function calls it and logs the result.

### Phase Start Logs
**When enabled:**
```
[social] ✓ Social Maneuvers ENABLED - triggering SocialManeuvers.startPhase()
[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with energy system
[social-maneuvers] Energy initialized for N players (3 energy each)
```

**When disabled:**
```
[social] Social Maneuvers DISABLED - using legacy social system
[social-maneuvers] Phase start called but feature is DISABLED (USE_SOCIAL_MANEUVERS=false)
```

### UI Rendering Logs
**When enabled:**
```
[social] ✓ Rendering enhanced Social Maneuvers UI
[social-maneuvers] ✓ Rendering Social Maneuvers UI for player X
```

**When disabled:**
```
[social] Rendering basic social UI (Social Maneuvers disabled)
[social-maneuvers] UI render requested but feature is DISABLED
```

### Phase End Logs
**When enabled:**
```
[social-maneuvers] ✓ Social phase complete - cleaning up
```

**When disabled:**
```
[social-maneuvers] Phase end called but feature is DISABLED
```

## Testing the Feature

### Manual Test in Browser

1. Open `index.html` in a browser
2. Open browser DevTools console
3. Start a new game
4. Advance to the social phase (after HOH competition)
5. Check console logs match "disabled" behavior above
6. In console, type: `game.cfg.enableSocialManeuvers = true`
7. Advance to next social phase (or restart game)
8. Check console logs match "enabled" behavior above
9. Verify the Social Maneuvers UI appears (energy bar, action menu)

### Automated Test

Open `test_social_maneuvers.html` in a browser to run automated tests:
- Module loading
- Feature flag behavior
- Energy system
- Action definitions
- UI rendering
- Action execution

## Implementation Notes

### No Logic Changes Required
The integration was already correctly implemented. The audit only added:
- Console logs for verification
- No changes to game logic
- No changes to feature flag behavior
- No changes to UI rendering logic

### Feature Flag Control
The feature is controlled by a single setting:
```javascript
game.cfg.enableSocialManeuvers = true/false
```

### Backward Compatibility
The following backward-compatible aliases exist:
- `SocialManeuvers.startPhase` → `onSocialPhaseStart`
- `SocialManeuvers.endPhase` → `onSocialPhaseEnd`
- `window.USE_SOCIAL_MANEUVERS` → read-only property that returns `isEnabled()`
- `window.SocialManager` → alias for `SocialManeuvers`

## Files Modified

1. **js/social-maneuvers.js**
   - Enhanced `isEnabled()` with logging
   - Enhanced `onSocialPhaseStart()` with logging
   - Enhanced `onSocialPhaseEnd()` with logging
   - Enhanced `renderSocialManeuversUI()` with logging
   - Enhanced module load message

2. **js/social.js**
   - Added logging in `startSocialIntermission()` when checking feature flag
   - Added logging in `renderSocialPhase()` for UI rendering decisions

## Conclusion

✅ **Feature flag is properly enabled at runtime**
✅ **SocialManeuvers.startPhase() is triggered when social phase begins**
✅ **Console logs aid verification**
✅ **No game logic changes outside feature flag**
✅ **Social Maneuvers UI appears during social phase when enabled**

The Social Maneuvers feature integration is working correctly. The audit confirms:
1. Feature flag check works at runtime
2. startPhase() is called when social phase begins
3. UI rendering respects the feature flag
4. Console logs help verify behavior
5. No unintended side effects on existing game logic
