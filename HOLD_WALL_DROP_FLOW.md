# Hold the Wall - Sequential Drop Flow Diagram

## Before (Simultaneous Drops Issue)

```
Every 10s Tick
│
├─ Check AI Participant 1 → RNG (44%) → DROP? ─┐
├─ Check AI Participant 2 → RNG (44%) → DROP? ─┤
├─ Check AI Participant 3 → RNG (44%) → DROP? ─┼─→ ALL DROPS HAPPEN
├─ Check AI Participant 4 → RNG (44%) → DROP? ─┤    AT THE SAME TIME
├─ Check AI Participant 5 → RNG (44%) → DROP? ─┤    (PROBLEM!)
└─ Check AI Participant 6 → RNG (44%) → DROP? ─┘
```

**Problem**: Multiple players could drop simultaneously, leading to:
- Multiple drop events at exact same timestamp
- Poor visual clarity (several avatars fade at once)
- Violation of game rules (POV should have max 1, HOH max 2)

---

## After (Sequential Drop Fix)

```
Every 10s Tick
│
├─ isProcessingDrops? → YES → SKIP THIS TICK
│                       NO ↓
│
├─ Roll for each AI Participant
│  ├─ AI 1: RNG (44%) → Candidate? → Add to list
│  ├─ AI 2: RNG (44%) → Candidate? → Add to list
│  ├─ AI 3: RNG (44%) → Candidate? → Add to list
│  ├─ AI 4: RNG (44%) → Candidate? → Add to list
│  ├─ AI 5: RNG (44%) → Candidate? → Add to list
│  └─ AI 6: RNG (44%) → Candidate? → Add to list
│
├─ Apply Competition Type Limit
│  ├─ POV: Select first 1 from list
│  └─ HOH: Select first 2 from list
│
├─ Set isProcessingDrops = true
│
└─ Process Sequentially
   ├─ Drop Participant 1
   │  ├─ Log drop event (timestamp T)
   │  ├─ Fade out avatar
   │  └─ Update feed
   │
   ├─ Wait 800-1200ms (random stagger)
   │
   ├─ Drop Participant 2 (if HOH and 2 selected)
   │  ├─ Log drop event (timestamp T + ~1s)
   │  ├─ Fade out avatar
   │  └─ Update feed
   │
   └─ Set isProcessingDrops = false
```

**Benefits**:
- ✓ Only max 1 (POV) or 2 (HOH) drops per tick
- ✓ Sequential timestamps with ~1 second gaps
- ✓ Clear visual separation between drops
- ✓ Processing lock prevents overlapping ticks
- ✓ Maintains proper game rules

---

## Code Flow Details

### 1. selectAndDropCandidates()
```javascript
function selectAndDropCandidates(dropProbability, reason) {
  if(isProcessingDrops) return; // Lock check
  
  // Roll for all candidates
  const candidatesToDrop = [];
  for(const ai of aiParticipants) {
    if(rng() < dropProbability) {
      candidatesToDrop.push(ai);
    }
  }
  
  // Apply limit: 1 for POV, 2 for HOH
  const maxDropsPerTick = detectedCompType === 'pov' ? 1 : 2;
  const selectedToDrop = candidatesToDrop.slice(0, maxDropsPerTick);
  
  // Process sequentially
  isProcessingDrops = true;
  processSequentialDrops(selectedToDrop, reason, () => {
    isProcessingDrops = false;
  });
}
```

### 2. processSequentialDrops()
```javascript
function processSequentialDrops(dropList, reason, callback) {
  if(dropList.length === 0) {
    if(callback) callback();
    return;
  }
  
  const participant = dropList[0];
  const remaining = dropList.slice(1);
  
  // Drop this participant immediately
  dropParticipant(participant, reason);
  
  // If more drops, wait before next
  if(remaining.length > 0) {
    const staggerDelay = 800 + Math.floor(rng() * 400); // 800-1200ms
    setTimeout(() => {
      processSequentialDrops(remaining, reason, callback);
    }, staggerDelay);
  } else {
    // All drops processed
    if(callback) callback();
  }
}
```

---

## Timing Examples

### POV Competition (Max 1 Drop/Tick)

```
T=0.0s  : Game starts
T=10.0s : Tick 1 - Check candidates → Alice selected → Drop Alice
T=20.0s : Tick 2 - Check candidates → Bob selected → Drop Bob
T=30.0s : Tick 3 - Check candidates → Charlie selected → Drop Charlie
T=40.0s : Tick 4 - Check candidates → Diana selected → Drop Diana
```

### HOH Competition (Max 2 Drops/Tick)

```
T=0.0s  : Game starts
T=10.0s : Tick 1 - Check candidates → Alice & Bob selected
          ├─ T=10.0s: Drop Alice
          └─ T=11.1s: Drop Bob (wait 1100ms)
T=20.0s : Tick 2 - Check candidates → Charlie & Diana selected
          ├─ T=20.0s: Drop Charlie
          └─ T=20.9s: Drop Diana (wait 900ms)
T=30.0s : Tick 3 - Check candidates → Eve selected (only 1)
          └─ T=30.0s: Drop Eve
```

---

## Fail-Safe Acceleration (Final 20s)

In the final 20 seconds before hidden timer expiry:
- Checks happen every 5s instead of 10s
- Drop probability ramps up: 44% → 55% → 66% → 77% → 85%
- **Same limits apply**: Max 1 (POV) or 2 (HOH) per tick
- Sequential processing still enforced

```
T=180s : Hidden timer - 20s remaining
         Start fail-safe acceleration
         
T=180s : Accelerated Check 1 (5s interval, 55% odds)
         → Max 1 (POV) or 2 (HOH) selected
         
T=185s : Accelerated Check 2 (66% odds)
         → Max 1 (POV) or 2 (HOH) selected
         
T=190s : Accelerated Check 3 (77% odds)
         → Max 1 (POV) or 2 (HOH) selected
         
T=195s : Accelerated Check 4 (85% odds)
         → Max 1 (POV) or 2 (HOH) selected
         
T=200s : Hidden timer expires
         → Force drop remaining AI (respecting limits)
         → Ensure single winner
```

---

## Processing Lock Behavior

The `isProcessingDrops` flag ensures clean tick separation:

```
T=10.0s : Tick triggered
          ├─ isProcessingDrops? NO
          ├─ Set isProcessingDrops = true
          ├─ Start processing drops
          │
T=10.5s : Another tick tries to fire (shouldn't happen, but defensive)
          └─ isProcessingDrops? YES → SKIP
          │
T=11.2s : Processing complete
          └─ Set isProcessingDrops = false
          
T=20.0s : Next tick triggered
          ├─ isProcessingDrops? NO
          └─ Proceed normally
```

This ensures that even if timing is slightly off, we never process overlapping drop sequences.
