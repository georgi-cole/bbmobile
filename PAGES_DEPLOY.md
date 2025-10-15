# GitHub Pages Deployment & Verification Guide

This document outlines the deployment steps and verification procedures for the Social Maneuvers feature on GitHub Pages.

## Deployment Prerequisites

1. **Branch**: Deploy from `main` or `feature/social-maneuvers` branch
2. **GitHub Pages**: Ensure GitHub Pages is enabled in repository settings
3. **Service Workers**: Boot script automatically unregisters all service workers to prevent caching issues

## Script Loading Order

The following critical scripts must load in this specific order:

1. **Boot-time assertions** (inline script in index.html)
   - Unregisters service workers
   - Sets `window.__SM_BUILD` flag
   - Ensures `enableSocialManeuvers` is true by default

2. **Social system scripts** (loaded in sequence):
   - `js/social-narrative.js?v=sm1`
   - `js/social-maneuvers.js?v=sm1` (BEFORE social.js)
   - `js/social.js?v=sm1`

3. **Fallback loader** (inline script after social scripts)
   - Verifies SocialManeuvers module is defined
   - Attempts reload if undefined

## Cache Busting

All social-related scripts use `?v=sm1` cache-busting parameter to ensure fresh loads after updates.

## Verification Steps

After deployment to GitHub Pages, perform the following verification:

### 1. Boot Verification

Open the deployed site and check the browser console (F12) for these logs:

```
[Boot] Service worker unregistered (if any were registered)
[Boot] Social Maneuvers build version: sm1
[Boot] ✓ Defaulted enableSocialManeuvers to TRUE
[Boot] ✓ SocialManeuvers module verified present
```

### 2. Social Phase Verification

Start a game and advance to the social phase (after HOH competition). The console should show:

```
[social] ✓ Entering social_intermission phase
[social] Checking Social Maneuvers feature flag...
[social] ✓ Social Maneuvers path - Using new Social Maneuvers system
[social-maneuvers] ✓ startPhase() triggered - Initializing social phase with energy system
[social-maneuvers] Energy initialized for X players (3 energy each)
[social] ✓ Rendering Social Maneuvers UI (human present)
[social-maneuvers] ✓ Rendering Social Maneuvers UI for player X
[social-maneuvers] ✓ Rendering Social Maneuvers UI completed
```

### 3. UI Verification

During the social phase, verify the following UI elements appear:

- **Social Maneuvers Panel**: Interactive UI with player selection
- **Energy Display**: Shows remaining energy points (typically 3/3 at start)
- **Action Menu**: Available social actions (Ally, Sabotage, etc.)
- **Target Selection**: Ability to select other players
- **Action Execution**: Actions complete successfully and log to Diary Room

### 4. Console Log Pattern

The expected console log pattern during social phase is:

1. `[social]` - Main social phase initialization
2. `[social-maneuvers]` - Social Maneuvers system activation
3. `[social-maneuvers]` - UI rendering and interactions
4. No fallback to legacy social system
5. No error messages about missing modules

### 5. Troubleshooting

If Social Maneuvers does not load:

**Check 1: Console Errors**
- Look for JavaScript errors in console
- Verify all script files loaded successfully (Network tab)

**Check 2: Feature Flag**
- Open console and run: `window.game.cfg.enableSocialManeuvers`
- Should return `true`

**Check 3: Module Presence**
- Open console and run: `typeof window.SocialManeuvers`
- Should return `"object"` not `"undefined"`

**Check 4: Cache Issues**
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Try incognito/private browsing mode

**Check 5: Service Workers**
- Open DevTools → Application → Service Workers
- Verify no service workers are registered
- If present, unregister manually and refresh

### 6. Manual Testing Checklist

- [ ] Open deployed site in browser
- [ ] Open browser console (F12)
- [ ] Verify boot logs show Social Maneuvers initialized
- [ ] Start a new game
- [ ] Advance through intro/opening
- [ ] Complete HOH competition
- [ ] Advance to nominations (triggers social phase)
- [ ] Verify `[social]` and `[social-maneuvers]` logs appear
- [ ] Verify Social Maneuvers UI appears in action panel
- [ ] Test selecting a player target
- [ ] Test executing a social action
- [ ] Verify action logs to Diary Room
- [ ] Verify energy decreases after action
- [ ] Complete social phase and advance
- [ ] Verify no errors in console

## Expected Behavior

✅ **Success Criteria:**
- Social Maneuvers loads automatically without manual intervention
- Console shows both `[social]` and `[social-maneuvers]` logs
- Social Maneuvers UI appears during social phase
- No fallback to legacy social system
- No JavaScript errors
- No service worker interference

❌ **Failure Indicators:**
- `[social] Using legacy social simulation` in console
- Missing `[social-maneuvers]` logs
- No Social Maneuvers UI in panel
- JavaScript errors about undefined modules
- Service worker cache conflicts

## Deployment Command

```bash
# For GitHub Pages (automatic on push to main)
git push origin main

# For manual testing with local server
python -m http.server 8000
# or
npx serve .
```

## Notes

- Service workers are automatically unregistered on every page load to prevent cache staleness
- Cache-busting parameter `?v=sm1` forces fresh script loads
- Social Maneuvers is enabled by default (no manual steps required)
- Legacy social system is bypassed when Social Maneuvers is enabled
- All configuration happens at boot time via inline scripts

## Version History

- **v=sm1**: Initial Social Maneuvers deployment with boot-time assertions and fallback loader
