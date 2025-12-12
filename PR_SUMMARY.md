# PR: Mount juror-return overlay via Fans' Favorite host/API (clone-only) + debug hook

**Short Description:** Displays jurors-return as a Fans' Favorite–style fullscreen overlay. Clone-only DOM preview; defensive mount using the same host/API as Fans' Favorite; quick-vote is local-only. Includes `?juror_debug=1` QA hook.

## Summary

Displays jurors-return as a Fans' Favorite–style fullscreen overlay. Clone-only DOM preview; defensive mount using the same host/API as Fans' Favorite; quick-vote is local-only. Includes `?juror_debug=1` QA hook.

## Changes in this PR

### 1. New file: `js/ui/juror-return-overlay.js`

A self-contained ES-safe module that exposes a global `window.JurorReturnOverlay` with methods: `init()`, `show()`, `hide()`, `debugShow()`.

**Key Features:**
- **Clone-first behavior**: When shown, it clones the in-page juror panel (selector `#juror-panel, .juror-panel`) into the overlay placeholder. It does NOT reparent/move the game's original node.
- **Defensive mount**: Attempts to register/mount the overlay via known game APIs (guarded) in this order:
  1. `IntermissionCard.showInTv(backdrop)`
  2. `livevoteHelpers.enterExternalOverlayMode(backdrop)`
  3. `CardManager.showInTv(backdrop)`
  
  If none exist, it tries host selectors used by Fans' Favorite: `.tvOverlayContent`, `[data-sm-faux-tv]`, `.tvContainer`, `.tvDim`, `#tv-overlay`, then falls back to `document.body`.
  
- **Local-only quick-vote input**: Validates against `window.game.players` (fallback to sample), triggers only local visual effects (avatar flash + audience message), and does NOT call any vote submission APIs.
- **Minimal inline styles**: The overlay appears without requiring immediate CSS changes; can be replaced with existing `css/juror-overlay.css` later.
- **Debug hook**: Auto-show when URL param `juror_debug=1` and `window.JurorReturnOverlay.debugShow()` helper.
- **Safe hide**: Attempts to call known unregister methods (guarded) and best-effort remove if appended directly; cleans up clones and restores focus.
- **Console logs**: Mount method used is logged for easy verification.

### 2. Modified `js/progression-events.js`

Added a small handler function `onJurorsReturn(payload)` that calls `window.JurorReturnOverlay.show()` when the `jurors-return` progression event is received.

Registered the new handler in the same event exports object where `onPublicFavorite` is registered so the overlay appears at the correct twist moment.

Guarded checks ensure that if the overlay module is not present, the engine will not break.

### 3. Test file: `test_juror_return_overlay_defensive.html`

Comprehensive test page that verifies:
- Clone-first behavior (original panel stays intact)
- Defensive API mounting (tries all known APIs, logs which one works)
- Falls back to Fans' Favorite host selectors gracefully
- Debug hook functionality
- Local-only quick-vote (no network calls)
- Safe cleanup on hide
- Progression event integration

## Safety and Testing Notes

✅ **SAFETY FIRST:**
- This PR intentionally does **NOT** change voting logic or submit network votes. Quick-vote remains purely visual.
- The overlay **always clones** the original juror DOM node instead of moving it to avoid breaking engine references (previous cause of skipped phases).
- Mounting is defensive: calls into game APIs only when they exist; otherwise it appends into the same host selectors Fans' Favorite uses.
- All game API calls are guarded with proper null checks.

✅ **QA Debug Hook:**
Open the game URL with `?juror_debug=1` to force-show the overlay locally for testing without waiting for the twist event.

✅ **Easy Revert:**
If this PR causes any regressions, revert is straightforward: the overlay files and the single `progression-events.js` registration line are isolated and easy to revert.

## Files Changed

- ✨ **NEW**: `js/ui/juror-return-overlay.js` (923 lines)
- 🔧 **MODIFIED**: `js/progression-events.js` (+30 lines, added `onJurorsReturn` handler)
- 🧪 **NEW**: `test_juror_return_overlay_defensive.html` (test file)

## Testing Steps

1. **Test via Debug Hook**:
   - Open `test_juror_return_overlay_defensive.html` in browser
   - Click "Show Overlay" button
   - Verify overlay appears with cloned juror panel
   - Try Quick Vote with juror names (Juror 1-4)
   - Verify success message and visual effects
   - Close overlay and verify original panel still exists
   - Check console logs for mount method used

2. **Test via Progression Event**:
   - Click "Test Progression Event" button
   - Verify `ProgressionEvents.onJurorsReturn()` triggers overlay

3. **Test Debug Hook**:
   - Open any test page with `?juror_debug=1` URL parameter
   - Verify overlay auto-shows after 1 second

## Screenshots

### Test Page - Initial State
![Test page with mock juror panel](https://github.com/user-attachments/assets/9389f548-0c0e-4288-b8cf-8b9bf1ccfcbf)

### Overlay Shown with Animated Messages
![Fullscreen overlay with animated audience messages and emojis](https://github.com/user-attachments/assets/b0017dc4-5d19-4b78-88ea-412a218fef88)

### After Closing - Original Panel Intact
![Original panel remains intact after overlay closes](https://github.com/user-attachments/assets/b031baed-c843-473b-9090-05ed7e946f98)

## Verification

- ✅ ESLint passed (auto-fixed quote style warnings)
- ✅ Clone-only behavior verified (original panel stays intact)
- ✅ Defensive mounting verified (logs show: "✓ Mounted to document.body")
- ✅ Quick-vote local visual effects work (no network calls)
- ✅ Progression event integration works
- ✅ Animated audience messages and floating emojis appear
- ✅ No vote submission logic (purely visual)
- ✅ Safe cleanup on hide

## Next Steps

This PR can be merged as-is. The overlay will automatically appear when the `jurors-return` progression event is triggered. No additional wiring is needed.

If you want to customize the overlay styling, you can enhance the existing `css/juror-overlay.css` file, and the inline styles in the module will serve as fallbacks.
