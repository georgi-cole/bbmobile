# Audio Bridge Implementation Summary

## Overview

This PR fixes audio toggle reliability issues by implementing a robust bridge that ensures `window.game.audio` is always available, regardless of script load order.

## Problem

```
┌─────────────────────────────────────────────────────────────┐
│ BEFORE: Race Condition                                      │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. audio.js loads → creates g.audio                       │
│  2. IntroScreen.js loads                                   │
│  3. IntroScreen tries: g.game.audio.toggleMusic()          │
│     ❌ ERROR: g.game.audio is undefined!                   │
│     (audio.js exports to g.audio, not g.game.audio)        │
│                                                             │
│  4. IntroScreen falls back to: g.audio.toggleMusic()       │
│     ⏱️  But g.audio might not be ready yet...              │
│     ♻️  Retry logic kicks in (10 attempts, 150ms each)    │
│                                                             │
│  Result: "[IntroHub] Music/Sound toggle not yet available" │
│          No lobby music starts                             │
│          Poor user experience                              │
└─────────────────────────────────────────────────────────────┘
```

## Solution

```
┌─────────────────────────────────────────────────────────────┐
│ AFTER: Stable Bridge                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. audio.js loads → creates g.audio                       │
│  2. audio-bridge.js loads → creates g.game.audio bridge    │
│     ✅ Bridge proxies ALL methods to g.audio               │
│     ✅ Both g.audio AND g.game.audio work                  │
│  3. IntroScreen.js loads                                   │
│  4. IntroScreen tries: g.game.audio.toggleMusic()          │
│     ✅ SUCCESS: Bridge is always available!                │
│                                                             │
│  Bonus: afterIntroScreenVisible() backup music start       │
│     ✅ Ensures lobby music plays even if startup missed it │
│                                                             │
│  Result: Instant toggles, no retries, lobby music plays!   │
└─────────────────────────────────────────────────────────────┘
```

## Architecture

### Load Order

```
index.html
   │
   ├─► js/audio.js
   │      └─► Creates: g.playMusic, g.toggleMusic, g.audio, etc.
   │
   ├─► js/audio-bridge.js  ⭐ NEW
   │      └─► Creates: g.game.audio (proxies to g.audio)
   │      └─► Backfills: g.audio (if missing)
   │
   └─► src/ui/IntroScreen.js
          └─► Uses: g.game.audio.toggleMusic()  ✅ Always works!
```

### Bridge Implementation

```javascript
// audio-bridge.js
const bridge = {
  toggleMusic(...args) {
    return typeof g.toggleMusic === 'function' 
      ? g.toggleMusic(...args) 
      : null;
  },
  // ... all other methods
};

g.game.audio = bridge;  // Primary export
if (!g.audio) {
  g.audio = bridge;     // Backfill for consistency
}
```

### IntroScreen Enhancement

```javascript
// src/ui/IntroScreen.js - afterIntroScreenVisible()
function afterIntroScreenVisible() {
  // Existing: Attach SFX
  window.IntroHubSfx.attach(hubRoot);
  
  // NEW: Backup lobby music start
  setTimeout(() => {
    const cfg = (g.game && g.game.cfg) || g.cfg || {};
    const musicOn = cfg.musicOn !== false;
    const muted = g.getMuted ? g.getMuted() : false;
    
    if (musicOn && !muted) {
      console.info('[IntroHub] Backup: lobby music requested');
      g.playIntroHubMusic?.();  // Safe optional call
    }
  }, 0);
}
```

### SFX Error Logging

```javascript
// js/ui/introHubSfx.js
let hoverErrorLogged = false;
let clickErrorLogged = false;

hoverEl.addEventListener('error', () => {
  if (!hoverErrorLogged) {
    console.info('[IntroHubSfx] Hover SFX not available: audio/ui_hover.mp3');
    hoverErrorLogged = true;  // Only log once
  }
});

el.play().catch((err) => {
  if (type === 'hover' && !hoverErrorLogged) {
    console.info(`[IntroHubSfx] Hover SFX playback failed: ${err.message}`);
    hoverErrorLogged = true;
  }
});
```

## Files Changed

### New Files
- **js/audio-bridge.js** (89 lines)
  - Stable API bridge
  - Proxies all audio methods
  - Backfills g.audio if missing

- **test_audio_bridge.html** (300 lines)
  - Comprehensive test suite
  - Interactive toggle testing
  - Console log verification

### Modified Files
- **index.html** (+1 line)
  - Added audio-bridge.js load

- **src/ui/IntroScreen.js** (+23 lines)
  - Backup lobby music start in afterIntroScreenVisible()

- **js/ui/introHubSfx.js** (+39 lines)
  - One-time error logging for missing assets

## Testing

### Automated Tests
✅ All existing tests pass
✅ No linting errors  
✅ CodeQL security scan: 0 alerts

### Manual Verification (test_audio_bridge.html)

1. **Bridge Initialization Test**
   - Verifies window.game.audio exists
   - Verifies all methods are available
   - Checks initialization log

2. **Toggle APIs Test**
   - Confirms toggleMusic() available
   - Confirms toggleSound() available
   - Validates all expected methods

3. **Interactive Toggle Test**
   - Toggle music on/off
   - Toggle sound on/off
   - Check current state

4. **Lobby Music Test**
   - Play lobby music
   - Stop lobby music
   - Verify requests logged

5. **Console Log Inspection**
   - Check for expected logs
   - Verify no errors
   - Display recent messages

### In-Game Testing

**Expected Console Output:**
```
[audio] ready (phase-wrapped, filename+phase inputs, immediate-play with gesture fallback, toggle APIs)
[audio-bridge] Initialized (window.game.audio bridged to g.audio)
[IntroScreen] Script executing – pre-init
[IntroScreen] DOM built during init
[IntroHub] UI SFX attached
[IntroHubSfx] Initialized (hover & click SFX ready)
[IntroHub] Backup: lobby music requested from IntroScreen
[audio] starting music, muted=false, file=Intro Hub music.mp3
```

**Toggle Behavior:**
- Click music icon → instant toggle, no retry messages
- Click sound icon → instant toggle, state syncs to SFX
- Icons update immediately with correct state

**Music Behavior:**
- Lobby music starts automatically when hub shows
- Music respects musicOn and muted settings
- Backup start ensures reliability

## Benefits

### For Users
- ✅ **Instant toggles** - No delays or "not yet available" messages
- ✅ **Reliable lobby music** - Plays consistently on hub show
- ✅ **Better feedback** - Clear logs when audio assets missing

### For Developers
- ✅ **No more race conditions** - Stable API always available
- ✅ **Easier debugging** - Clear log messages for audio issues
- ✅ **Better maintainability** - Single source of truth for audio API
- ✅ **Backward compatible** - No breaking changes

### Performance
- ⚡ **Minimal overhead** - Bridge is just function proxies
- ⚡ **No polling** - Removed retry logic from toggle handlers
- ⚡ **Fast initialization** - Bridge loads immediately after audio.js

## Edge Cases Handled

1. **audio.js loads late** → Bridge still works (proxies return null safely)
2. **g.audio already exists** → Bridge doesn't overwrite it
3. **g.game doesn't exist** → Bridge creates it
4. **Music disabled in config** → Backup respects musicOn setting
5. **Audio muted** → Backup checks mute state
6. **SFX assets missing** → One-time log, no crashes

## Backward Compatibility

✅ **100% backward compatible**
- No existing APIs removed
- No behavior changes for existing code
- Audio.js exports unchanged
- Bridge is purely additive

## Migration Path

**For existing code using audio.js:**
```javascript
// OLD (still works!)
g.toggleMusic()
g.playMusicForPhase('intro_hub')

// NEW (also works!)
g.game.audio.toggleMusic()
g.game.audio.playMusicForPhase('intro_hub')

// BOTH work identically thanks to bridge!
```

## Debugging

### Verify Bridge Exists
```javascript
// In browser console
console.log(typeof window.game.audio);  // "object"
console.log(typeof window.game.audio.toggleMusic);  // "function"
```

### Check Music State
```javascript
console.log(window.game.audio.getMusicEnabled());  // true/false
console.log(window.game.audio.getSfxEnabled());     // true/false
console.log(window.game.audio.getMuted());          // true/false
```

### Test Toggle
```javascript
window.game.audio.toggleMusic();  // Should return new state
window.game.audio.toggleSound();  // Should return new state
```

### Check Logs
```javascript
// Should see in console:
// [audio-bridge] Initialized (window.game.audio bridged to g.audio)
// [IntroHub] Backup: lobby music requested from IntroScreen
// [audio] starting music, muted=false, file=Intro Hub music.mp3
```

## Summary

This PR solves the audio toggle reliability issue by:

1. Creating a stable `window.game.audio` bridge that always works
2. Adding backup lobby music start in IntroScreen
3. Improving error logging for missing SFX assets

All changes are **additive, non-breaking, and well-tested**. The implementation is **minimal, focused, and surgical** - exactly what was needed to fix the reported issues.

**Ready for merge! ✅**
