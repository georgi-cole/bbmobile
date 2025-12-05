# Avatar Preload Progress Bar Implementation

## Summary

This implementation adds a **visual progress bar** to the avatar preloading overlay and enforces **strict roster gating** to prevent rendering until all avatars are successfully loaded and decoded.

## Changes Made

### 1. Visual Progress Bar (`src/ui/IntroScreen.js`)

**Added:**
- Progress bar container (`intro-avatar-progress-bar-container`)
- Progress bar fill element (`intro-avatar-progress-bar-fill`)
- Width animation from 0% to 100% as avatars load

**Updated:**
- `buildAvatarPreloadOverlay()` - Adds progress bar elements to DOM
- `updateAvatarPreloadProgress()` - Animates progress bar width and logs telemetry milestones

### 2. Progress Bar Styles (`css/intro.css`)

**Added:**
- `.intro-avatar-progress-bar-container` - Container with background
- `.intro-avatar-progress-bar-fill` - Animated fill with gradient and shimmer effect
- `@keyframes progress-shimmer` - Shimmer animation for visual polish
- Responsive adjustments for mobile devices
- Reduced motion support for accessibility

**Enhanced:**
- `.intro-avatar-preload-progress` - Increased opacity from 0.7 to 0.9 and added font-weight:600 for better readability against dark overlay background

### 3. Roster Gating (`js/ui/mobileRoster.js`)

**Added:**
- Gating check in `renderActiveGrid()` - Blocks rendering if avatars are preloading in strict mode
- Event listener for `avatars:ready` in `init()` - Unlocks roster only if all avatars loaded successfully
- Telemetry logging for roster gated/unlocked events

**Logic:**
```javascript
// Only unlock if ALL avatars loaded successfully in strict mode
const success = summary.loaded === summary.total && 
                summary.failed === 0 && 
                !summary.timedOut;
```

### 4. Top Roster Gating (`js/ui.hud-and-router.js`)

**Enhanced:**
- `handleAvatarsReady()` - Added strict mode checking
- Only ungates roster if `summary.loaded === summary.total && summary.failed === 0`
- Logs telemetry for unlock success/failure

## Configuration

### Enable Strict Mode

```javascript
window.game.cfg = {
  avatarPreloadRequireAll: true  // Enforce strict preloading
};
```

### Enable QA Override Button

```javascript
window.game.cfg = {
  avatarPreloadRequireAll: true,
  enableProceedAnyway: true  // Show "Proceed Anyway" button on failure
};
```

## Behavior

### Success Flow

1. User presses **Play** button in Intro Hub
2. Avatar preload overlay appears with spinner
3. **Progress bar fills from 0% to 100%** as avatars load
4. Percentage text updates alongside bar (e.g., "50%", "75%", "100%")
5. Once all avatars load + decode successfully:
   - `avatars:ready` event dispatched
   - Overlay fades out (300ms)
   - Roster unlocks and renders with `.roster-grid--ready` class
   - Game screen appears with fully loaded avatars

### Failure Flow (Strict Mode)

1. User presses **Play** button
2. Overlay appears, progress bar starts filling
3. Some avatars fail to load (404, network error, decode error)
4. Progress bar stops (e.g., at 62%)
5. Spinner and progress bar hide
6. **Error message displays:**
   ```
   Failed to load all houseguest profiles.
   
   Loaded: 10/16
   Failed: 6
   ```
7. `avatars:ready` event **NOT dispatched**
8. Overlay **remains visible** with error
9. Roster **remains gated** (hidden)
10. If `enableProceedAnyway=true`: "Proceed Anyway" button shown
11. User must fix issue or click "Proceed Anyway" to continue

### Timeout Flow (Strict Mode)

1. Progress bar fills slowly...
2. Timeout occurs after 30s
3. Error message displays:
   ```
   Failed to load all houseguest profiles.
   
   Timeout after 30s
   Loaded: 14/16
   Failed: 2
   ```
4. Same behavior as failure flow above

## Telemetry Events

All events logged via `window.Telemetry.log()`:

### Progress Milestones
- `avatar_preload_progress_milestone` - Logged at 25%, 50%, 75%, 100%
  ```javascript
  { percent: 75, loaded: 12, total: 16 }
  ```

### Roster Gating
- `roster_gated` - When mobile roster is gated
  ```javascript
  { strictMode: true }
  ```
- `roster_unlocked` - When roster is successfully unlocked
  ```javascript
  { strictMode: true, loaded: 16, total: 16, elapsedMs: 3421 }
  ```
- `roster_unlock_failed` - When unlock fails in strict mode
  ```javascript
  { strictMode: true, loaded: 12, total: 16, failed: 4, timedOut: false }
  ```

### Top Roster
- `top_roster_unlocked` - When top roster unlocks
- `top_roster_unlock_failed` - When top roster unlock fails

## CSS Classes

### Roster States

- `.roster-grid--gated` - Roster is hidden while avatars load
  ```css
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  ```

- `.roster-grid--ready` - Roster unlocked with fade-in animation
  ```css
  opacity: 1;
  visibility: visible;
  animation: roster-fade-in 400ms ease-out forwards;
  ```

### Top Roster States

- `.top-roster--gated` - Top roster hidden
- `.top-roster--ready` - Top roster visible with fade-in

## Testing

### Manual Testing

1. Open `test_avatar_preload_strict.html` in a browser
2. Enable strict mode checkbox
3. Click "✅ Test Success (All Load)" - Progress bar should fill smoothly to 100%
4. Click "❌ Test Partial Failure (Some 404s)" - Progress bar should stop partway, error displays
5. Click "⏱️ Test Timeout" - Timeout message should appear
6. Verify "Proceed Anyway" button only shows when enabled

### Automated Tests

```bash
npm run test:all
```

All existing tests pass with these changes.

## Acceptance Criteria ✅

- [x] **Progress bar overlays from 0% to 100%** - Visual bar with gradient and shimmer
- [x] **Main screen transition blocked** - Roster gated until avatars ready
- [x] **No flashback or intermediate screens** - Smooth overlay transition
- [x] **Only proceed when ready** - `summary.loaded === summary.total && summary.failed === 0`
- [x] **Overlay doesn't auto-dismiss on failures** - Remains visible with error
- [x] **Display error** - Shows loaded/failed counts
- [x] **Manual QA proceed enabled** - "Proceed Anyway" button when configured
- [x] **Roster rendered after unlock** - `.roster-grid--ready` class applied
- [x] **Telemetry for every stage** - All events logged
- [x] **Immediate fully rendered roster** - No placeholder → avatar transitions
- [x] **No flashes** - Clean transitions with CSS opacity/visibility

## Visual Example

```
┌─────────────────────────────────┐
│                                 │
│         ⏳ (spinner)            │
│                                 │
│  Loading houseguest profiles... │
│                                 │
│  ╔════════════════════════════╗ │
│  ║████████████░░░░░░░░░░░░░░░║ │  ← Progress bar
│  ╚════════════════════════════╝ │
│                                 │
│             50%                 │  ← Percentage
│                                 │
└─────────────────────────────────┘
```

## Backward Compatibility

- Non-strict mode still works (default behavior unchanged)
- Skeleton mode still supported
- Legacy `preloadAvatars` function still works as fallback
- Existing game saves compatible

## Performance

- Smooth 60fps animations using CSS transitions
- `requestAnimationFrame` for progress updates
- Minimal DOM manipulation
- Reduced motion support for accessibility
