# Intermission Overlay Fix - Flow Diagram

## Before the Fix (BROKEN)

```
User starts Tic Tac Toe
         │
         ▼
Overlay shows with "Thinking..."
         │
         ▼
User plays and wins
         │
         ▼
Game calls onComplete callback
         │
         ▼
Result modal appears
         │
         ▼
❌ PROBLEM: Overlay still shows "Thinking..."
❌ PROBLEM: Continue button disabled
❌ PROBLEM: X button may not work
❌ PROBLEM: Overlay stuck on screen
```

## After the Fix (WORKING)

```
User starts Tic Tac Toe
         │
         ▼
┌──────────────────────────────────────┐
│  IntermissionOverlay.show()          │
│  - Creates overlay DOM               │
│  - Adds X button (always works)      │
│  - Adds Continue button (disabled)   │
│  - Shows "Thinking..." indicator     │
│  - Attaches event listeners          │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  TicTacToeIntermission.init()        │
│  - Stores bus reference              │
│  - Stores overlay reference          │
│  - Renders game in container         │
└──────────────┬───────────────────────┘
               │
               ▼
         User plays
               │
               ▼
         User wins!
               │
               ▼
┌──────────────────────────────────────┐
│  TicTacToeIntermission.finishGame()  │
│  1. Determines result (human/ai/draw)│
│  2. Emits event via bus:             │
│     window.game.bus.emit(            │
│       'minigame:complete',           │
│       { id: 'tic-tac-toe',          │
│         result: 'human' }            │
│     )                                 │
│  3. Calls onComplete callback        │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  IntermissionOverlay (Event Handler) │
│  onMinigameComplete(detail) {        │
│    1. Enable Continue button         │
│    2. Hide "Thinking..." indicator   │
│    3. Schedule auto-close (250ms)    │
│  }                                    │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  Result Modal Appears                │
│  - Shows "You Win!" message          │
│  - Offers Replay/Continue buttons    │
└──────────────┬───────────────────────┘
               │
               ▼
     Wait 250ms (brief pause)
               │
               ▼
┌──────────────────────────────────────┐
│  IntermissionOverlay.close()         │
│  - Animates out (300ms)              │
│  - Removes from DOM                  │
│  - Emits 'intermission:overlay:closed'│
│  - Restores body scroll              │
└──────────────┬───────────────────────┘
               │
               ▼
✅ SOLVED: Overlay cleanly closed
✅ SOLVED: All controls responsive
✅ SOLVED: No stuck state
```

## Event Flow Detail

```
┌─────────────────────────────────────────────────────────┐
│                    Event Bus Flow                        │
└─────────────────────────────────────────────────────────┘

TicTacToe Module                    IntermissionOverlay Module
─────────────────                   ──────────────────────────

finishGame()                        
    │                               
    ├─ Determine result             
    │  (human/ai/draw)               
    │                               
    ├─ window.game.bus.emit(        onMinigameComplete(detail)
    │    'minigame:complete',        ← ← ← ← ← ← ← ← ←
    │    { id, result }                                │
    │  )                                               │
    │                                                  │
    └─ Call onComplete(result)                        │
         │                                             │
         └─────────────────────────────────────────►  │
                                                       │
                    Result Modal Shows                 │
                                                       │
                                                       ▼
                                          Enable Continue button
                                          Hide "Thinking..."
                                          Schedule auto-close
                                                       │
                                                       │
                                          Wait 250ms   │
                                                       │
                                                       ▼
                                          Overlay.close()
                                                       │
                                                       ▼
                                          Animate out
                                          Remove from DOM
                                          Emit 'intermission:overlay:closed'
```

## State Machine

```
┌─────────────────────────────────────────────────────────┐
│           IntermissionOverlay State Machine              │
└─────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ CLOSED  │ ◄──────────────────┐
    └────┬────┘                    │
         │                         │
         │ show()                  │
         ▼                         │
    ┌─────────┐                    │
    │ OPENING │                    │
    └────┬────┘                    │
         │                         │
         │ (animation complete)    │
         ▼                         │
    ┌─────────┐                    │
    │  SHOWN  │                    │
    │ Waiting │                    │
    └────┬────┘                    │
         │                         │
         │ minigame:complete       │
         ▼                         │
    ┌─────────┐                    │
    │  SHOWN  │                    │
    │ Ready   │                    │
    └────┬────┘                    │
         │                         │
         │ auto-close (250ms)      │
         │    OR                   │
         │ user clicks X           │
         │    OR                   │
         │ user clicks Continue    │
         ▼                         │
    ┌─────────┐                    │
    │ CLOSING │                    │
    └────┬────┘                    │
         │                         │
         │ (animation complete)    │
         └─────────────────────────┘
```

## Emergency Close Flow

```
User clicks X button
         │
         ▼
┌──────────────────────────────────────┐
│  closeBtn.addEventListener('click')  │
│  - No guards or checks               │
│  - Immediately calls close()         │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│  IntermissionOverlay.close()         │
│  1. Set _isShown = false             │
│  2. Start close animation            │
│  3. Remove from DOM after 300ms      │
│  4. Restore body scroll              │
│  5. Emit closed event                │
└──────────────────────────────────────┘

✅ Works at ANY time:
   - Before game starts
   - During AI thinking
   - After completion event
   - During auto-close delay
   - Even if game is broken
```

## Idempotency Protection

```
Multiple completion events emitted:
  
  Event 1: minigame:complete
     │
     ▼
  onMinigameComplete()
     │ _isShown = true
     │
     ├─ Enable button ✓
     ├─ Hide thinking ✓
     └─ Schedule close (250ms) ✓
  
  Event 2: minigame:complete (50ms later)
     │
     ▼
  onMinigameComplete()
     │ _isShown = true
     │
     ├─ Enable button (already enabled) ✓
     ├─ Hide thinking (already hidden) ✓
     └─ Schedule close (250ms) - creates new timer ⚠️
  
  Event 3: minigame:complete (100ms later)
     │
     ▼
  onMinigameComplete()
     │ _isShown = false (already closing!)
     │
     └─ Condition fails, does nothing ✓

✅ Result: Only one close happens
✅ UI updates are idempotent
⚠️ Multiple close timers may schedule, but only first one succeeds
```

## Error Recovery

```
Scenario: Game crashes, no completion event

User clicks X button
     │
     ▼
Emergency close works ✓
     │
     └─ Overlay removed
        User returns to flow
        
Scenario: Bus not available

Game calls finishGame()
     │
     ├─ Try window.game.bus.emit()
     │  (fails silently)
     │
     ├─ Fallback: window.dispatchEvent()
     │  (may work in some contexts)
     │
     └─ Call onComplete() callback
        (triggers result modal)
        
Overlay may not auto-close,
but X button still works ✓

Scenario: Multiple overlays created

New overlay shown
     │
     ▼
close() checks activeOverlay
     │
     └─ Closes previous overlay first
        Then creates new one ✓
        
Only one overlay at a time ✓
```

## Performance Profile

```
Overlay Lifecycle:
─────────────────

Create:        ~5ms   (DOM creation)
Show anim:    300ms   (CSS animation)
Thinking:      0ms   (just CSS hide/show)
Event:        <1ms   (bus emission)
Handler:      <1ms   (UI updates)
Auto-close:   250ms   (setTimeout)
Close anim:   300ms   (CSS animation)
Remove:        ~5ms   (DOM removal)
─────────────────────
Total:       ~860ms   (best case)

Memory:
───────
- 1 overlay element per instance
- ~10KB DOM nodes
- 2 event listeners (complete, finished)
- No polling or intervals
- Clean cleanup on close
```
