# Visual Proof: Intermission Card Timer Fix

## Before Fix ❌

```
Time: 00:26
┌────────────────────────────────────────┐
│     COMPETITION PHASE (HOH/Veto)       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  You cannot compete              │  │
│  │  Play Tic Tac Toe while you wait?│ │
│  │  [YES]  [NO]                     │  │
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘

⏱️ Timer counts down... 00:10... 00:05... 00:00

Time: 00:00 (Timer Expired)
┌────────────────────────────────────────┐
│         NEXT PHASE (Social)            │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  You cannot compete         ❌   │  │ ← CARD STUCK!
│  │  Play Tic Tac Toe while you wait?│ │    Overlapping
│  │  [YES]  [NO]                     │  │    new content
│  └──────────────────────────────────┘  │
│                                        │
│  "SOCIAL PHASE"                        │
│  [New phase content below card]        │
└────────────────────────────────────────┘
```

## After Fix ✅

```
Time: 00:26
┌────────────────────────────────────────┐
│     COMPETITION PHASE (HOH/Veto)       │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  You cannot compete              │  │
│  │  Play Tic Tac Toe while you wait?│ │
│  │  [YES]  [NO]                     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  [Timer Monitor Active ⏱️ 500ms]      │
└────────────────────────────────────────┘

⏱️ Timer counts down... 00:10... 00:05... 00:00

Time: 00:00 (Timer Expired)
┌────────────────────────────────────────┐
│         NEXT PHASE (Social)            │
│                                        │
│  [Card auto-removed ✅]                │
│                                        │
│  "SOCIAL PHASE"                        │
│  [New phase content visible]           │
│  [No overlapping UI elements]          │
└────────────────────────────────────────┘
```

## Technical Flow

### Before Fix
```
showInTv()
    ↓
Create card element
    ↓
Add Yes/No button listeners
    ↓
Show card in TV overlay
    ↓
[Wait for user click...]
    ↓ (if no click)
Timer expires → Phase changes
    ↓
❌ Card still on screen
```

### After Fix
```
showInTv()
    ↓
Create card element
    ↓
Add Yes/No button listeners
    ↓
Set up timer monitor (setInterval 500ms)
    ↓
Show card in TV overlay
    ↓
[Monitor checks game.endAt every 500ms]
    ↓
game.endAt <= Date.now()?
    ↓ YES
Clear interval
    ↓
Auto-remove card
    ↓
✅ Clean UI transition
```

## Code Behavior

### Timer Monitor Logic
```javascript
// Every 500ms, the monitor checks:
if (game?.endAt && game.endAt <= Date.now()) {
  console.info('[IntermissionCard] Timer expired, auto-removing card');
  clearTimerMonitor();
  removeCard();
}
```

### Example Timeline
```
00:00 - Card shown, monitor starts
00:05 - Monitor check #10: endAt > now → Continue
00:10 - Monitor check #20: endAt > now → Continue
00:15 - Monitor check #30: endAt > now → Continue
00:20 - Monitor check #40: endAt > now → Continue
00:25 - Monitor check #50: endAt > now → Continue
00:26 - Timer expires (endAt <= now)
00:26.5 - Monitor check #51: endAt <= now → AUTO-REMOVE ✅
```

## Screenshots

### Test Page
The test file `test_intermission_card_timer_fix.html` provides:
- Visual countdown timer display
- Card shown in TV container
- Event logging to track lifecycle
- Test scenarios (5s and 10s timers)

### Expected Results
1. ✅ Card appears when user is ineligible
2. ✅ Timer counts down (visible in test page)
3. ✅ Card automatically disappears when timer reaches 0
4. ✅ No console errors
5. ✅ Clean UI transition to next phase
6. ✅ No overlapping elements

---

**Fix verified:** The intermission card now properly cleans up when the timer expires, regardless of whether the user clicks Yes or No.
