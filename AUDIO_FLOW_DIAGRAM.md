# Audio System Flow Diagram

## Before Fix: Problems

```
User Action: Start Button Click
    ↓
playMusicForPhase('opening')
    ↓
playFile('intro.mp3')
    ↓
stopMusic() [SYNCHRONOUS - doesn't wait]
    ├→ pause()
    ├→ clear src
    └→ load()
    ↓ [RACE CONDITION - play starts before stop completes]
audio.play()
    └→ ❌ AbortError: play() interrupted by pause()

Phase Change: HOH
    ↓
setPhase('hoh')
    ↓
playMusicForPhase('hoh')
    ↓
if (isMuted) return; [WRONG - prevents play]
    └→ ❌ Music doesn't play when muted

Mute Toggle
    ↓
setMuted(true)
    ↓
audio.pause() [WRONG - changes playback state]
    └→ ❌ Audio stops playing instead of just muting
```

## After Fix: Solutions

```
User Action: Start Button Click
    ↓
playMusicForPhase('opening')
    ↓
playFile('intro.mp3')
    ↓
await stopMusic() [ASYNC - waits for completion]
    ├→ if (stopPending) return; [prevents overlap]
    ├→ stopPending = true
    ├→ pause()
    ├→ log stop
    ├→ await delay(10ms) [ensures pause completes]
    ├→ clear src
    ├→ load()
    └→ stopPending = false
    ↓ [NO RACE - play only starts after stop completes]
audio.play()
    └→ ✅ Plays successfully, logs success

Phase Change: HOH
    ↓
setPhase('hoh')
    ↓
playMusicForPhase('hoh')
    ↓
playFile('competition.mp3')
    ├→ Check if same track already playing
    │  └→ if yes: return (don't restart)
    ├→ await stopMusic()
    ├→ set src
    ├→ log start
    └→ await play()
    └→ ✅ Music plays (even if muted, just inaudible)

Mute Toggle
    ↓
setMuted(true)
    ↓
audio.muted = true [CORRECT - only affects audio output]
    ├→ Audio continues playing
    └→ ✅ User doesn't hear it, but playback continues
```

## State Transitions

### Before Fix
```
STOPPED → [play()] → STARTING → [pause() races with play()] → ❌ ERROR
PLAYING (unmuted) → [setMuted(true)] → PAUSED → ❌ WRONG STATE
MUTED → [playFile()] → BLOCKED → ❌ DOESN'T PLAY
```

### After Fix
```
STOPPED → [play()] → [await stop()] → STOPPED → STARTING → PLAYING → ✅
PLAYING (unmuted) → [setMuted(true)] → PLAYING (muted) → ✅ CORRECT
MUTED → [playFile()] → [await stop()] → PLAYING (muted) → ✅ PLAYS
PLAYING → [same track play()] → [detected, return] → PLAYING → ✅ NO RESTART
```

## Concurrent Operations Handling

### Before Fix
```
Phase 1 → playFile(track1)
    ↓ [stopMusic() called but doesn't wait]
    ↓ [play(track1) starts immediately]
    ↓
Phase 2 → playFile(track2) [before track1 finishes starting]
    ↓ [stopMusic() called, interrupts track1.play()]
    ↓
    └→ ❌ AbortError: track1.play() was interrupted
```

### After Fix
```
Phase 1 → playFile(track1)
    ↓ [await stopMusic()]
    ↓ [10ms delay ensures clean stop]
    ↓ [play(track1) starts]
    ↓ [track1 playing]
    ↓
Phase 2 → playFile(track2)
    ↓ [await stopMusic()]
    │   ↓ [stopPending = true]
    │   ↓ [pause track1]
    │   ↓ [10ms delay]
    │   ↓ [clear src]
    │   ↓ [stopPending = false]
    ↓ [10ms delay ensures track1 stopped]
    ↓ [play(track2) starts]
    └→ ✅ Clean transition, no errors
```

## Rapid Phase Changes (Skip/Fast-Forward)

### Before Fix
```
skip → phase1 → playFile(track1)
                    ↓ stopMusic() [sync]
                    ↓ play(track1)
skip → phase2 → playFile(track2)
                    ↓ stopMusic() [interrupts track1.play()]
                    └→ ❌ AbortError
skip → phase3 → playFile(track3)
                    ↓ stopMusic() [interrupts track2.play()]
                    └→ ❌ AbortError
```

### After Fix
```
skip → phase1 → playFile(track1)
                    ↓ await stopMusic()
skip → phase2 → playFile(track2) [before track1 finishes]
                    ↓ await stopMusic()
                    │   ↓ stopPending=true
                    │   ↓ [waits for track1's stop to complete]
skip → phase3 → playFile(track3) [before track2 finishes]
                    ↓ await stopMusic()
                    │   ↓ stopPending=true
                    │   └→ returns immediately (already stopping)
                    ↓ await stopMusic()
                    │   ↓ stopPending=false (track2 stopped)
                    ↓ play(track3)
                    └→ ✅ Only track3 plays, no errors
```

## Key Improvements Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Stop/Play Timing** | Synchronous, race conditions | Async with delays, sequential |
| **Mute Behavior** | Pauses audio (wrong) | Sets audio.muted (correct) |
| **Play When Muted** | Blocked | Allowed (just inaudible) |
| **Same Track** | Restarts | Detected and skipped |
| **Rapid Changes** | AbortError | Clean transitions |
| **Overlapping Stops** | Multiple calls execute | stopPending flag prevents |
| **Logging** | Minimal | Comprehensive |
| **State Consistency** | isMuted loaded late | isMuted loaded early |

## API Behavior Changes

| API Call | Before | After |
|----------|--------|-------|
| `playMusicForPhase(phase)` when muted | Blocked | ✅ Plays (muted) |
| `stopMusic()` | Sync | ✅ Async (can await) |
| `setMuted(true)` | Pauses audio | ✅ Sets audio.muted |
| `toggleMute()` | Pause/resume | ✅ Mute/unmute |
| Rapid `playFile()` calls | Race conditions | ✅ Queued properly |
| Same track `playFile()` | Restarts | ✅ No restart |

All changes are backward compatible - existing code works without modification.
