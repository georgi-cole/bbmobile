# PauseManager Integration Verification Guide

This document provides step-by-step instructions to manually verify that PauseManager is properly integrated and working at runtime.

## Quick Verification (Console)

1. Open `index.html` in a web browser
2. Open Developer Console (F12)
3. Run the following commands:

```javascript
// Verify PauseManager is loaded and attached
console.log('PauseManager defined:', typeof window.game.pauseManager);
// Expected: "object"

console.log('PauseManager has open:', typeof window.game.pauseManager.open);
// Expected: "function"

console.log('Initial paused state:', window.game.pauseManager.isPaused());
// Expected: false

console.log('Initial open modals:', window.game.pauseManager.getOpenModals());
// Expected: []
```

## Settings Modal Verification

1. With Developer Console open, click the Settings button (⚙️) in the top toolbar
2. Verify console shows:
   ```
   [settings/render] Paused game for settings modal
   ```
3. In console, check pause state:
   ```javascript
   window.game.pauseManager.isPaused()
   // Expected: true
   
   window.game.pauseManager.getOpenModals()
   // Expected: ["modal:settings"]
   ```
4. Close the Settings modal
5. Verify console shows:
   ```
   [settings/render] Resumed game after settings modal closed
   ```
6. In console, check pause state:
   ```javascript
   window.game.pauseManager.isPaused()
   // Expected: false
   
   window.game.pauseManager.getOpenModals()
   // Expected: []
   ```

## Hub Modal Verification

The same verification can be done with hub modals. These are tracked by HubModalBridge:

### Test with any hub modal:
1. Open a hub modal (Rules, Profile, Help, etc.)
2. Verify console shows:
   ```
   [HubModalBridge] Modal opened, pausing game: modal:hub:xxx
   ```
3. Check pause state in console:
   ```javascript
   window.game.pauseManager.isPaused()
   // Expected: true
   ```
4. Close the modal
5. Verify console shows:
   ```
   [HubModalBridge] Modal closed, resuming game: modal:hub:xxx
   ```
6. Check pause state in console:
   ```javascript
   window.game.pauseManager.isPaused()
   // Expected: false
   ```

## Multiple Modal Verification

1. Open Settings modal
2. Without closing it, open another modal (if possible)
3. Verify both modals are tracked:
   ```javascript
   window.game.pauseManager.getOpenModals()
   // Expected: array with multiple modal IDs
   
   window.game.pauseManager.isPaused()
   // Expected: true (still paused while any modal is open)
   ```
4. Close one modal
5. Verify it's removed from tracking but still paused:
   ```javascript
   window.game.pauseManager.getOpenModals()
   // Expected: array with remaining modal ID
   
   window.game.pauseManager.isPaused()
   // Expected: true (still paused because one modal is open)
   ```
6. Close the last modal
7. Verify game is resumed:
   ```javascript
   window.game.pauseManager.isPaused()
   // Expected: false
   ```

## Event Verification

PauseManager emits `game:pause` and `game:resume` events. To verify:

```javascript
// Set up event listeners
if (window.game.bus && window.game.bus.on) {
  window.game.bus.on('game:pause', () => console.log('✓ game:pause event fired'));
  window.game.bus.on('game:resume', () => console.log('✓ game:resume event fired'));
} else {
  window.addEventListener('game:pause', () => console.log('✓ game:pause event fired'));
  window.addEventListener('game:resume', () => console.log('✓ game:resume event fired'));
}

// Now open and close a modal - you should see both event logs
```

## Troubleshooting

### If window.game.pauseManager is undefined:
- Check that `js/ui/pause-manager.js` is loaded in index.html
- Check browser console for any script loading errors
- Verify pause-manager.js is loaded as a module (`type="module"`)

### If pause/resume logs don't appear:
- Check that console log level includes "Info" messages
- Verify HubModalBridge and settings/render.js were properly updated
- Check for JavaScript errors in console

### If isPaused() doesn't change:
- Verify the modal is actually visible (check DOM)
- For hub modals, verify HubModalBridge's MutationObserver is running
- Check console for any errors from PauseManager

## Expected Modal IDs

The following modal IDs should be used by the system:

- `modal:settings` - Settings modal
- `modal:hub:rules` - Rules modal
- `modal:hub:profile` - Profile modal  
- `modal:hub:credits` - Credits modal
- `modal:hub:leaderboard` - Leaderboard modal
- `modal:hub:help` - Help modal
- `modal:hub:settings` - Alternative settings modal (if opened via hub)
- `modal:hub:xp` - XP/Progression modal
- `modal:hub:socialize` - Social maneuvers modal
- `modal:hub:generic` - Generic modal-backdrop modals

## Automated Test

Run the automated verification test:

```bash
npm run test:pause-integration
```

Expected output:
```
=== PauseManager Integration Verification ===
Passed: 22
Failed: 0
✓ All tests passed!
```

## Success Criteria

✓ window.game.pauseManager is defined  
✓ Opening Settings pauses game  
✓ Opening hub modals pauses game  
✓ isPaused() returns true while modals open  
✓ getOpenModals() tracks all open modals  
✓ Closing all modals resumes game  
✓ Events fire correctly  
✓ No console errors  

---

Last updated: 2025-12-06
