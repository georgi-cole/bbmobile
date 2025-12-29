# Visual Guide: Self-Eviction Timing Fix

## Problem (BEFORE Fix)

### Screenshot 1: Self-Eviction Card with Wrong Title
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃  [Player avatars in roster view - some greyed out]┃
┃                                                    ┃
┃  ┌─────────────────────────────────────────────┐  ┃
┃  │  Week 2 - Strategizing              ❌      │  ┃ ← WRONG TITLE
┃  │                                             │  ┃
┃  │  Rae has decided to self-evict from the    │  ┃
┃  │  Big Brother house.                        │  ┃
┃  │                                             │  ┃
┃  └─────────────────────────────────────────────┘  ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Issue**: Card title shows current phase "Week 2 - Strategizing" instead of clear self-eviction message

### Screenshot 2: Week Modal Appears Too Early
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃              👁️🏠                                 ┃
┃                                                    ┃
┃         Get Ready for Week 3!                      ┃
┃                                                    ┃
┃   The HOH competition is about to begin            ┃
┃                                                    ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Issue**: Week modal appears BEFORE self-eviction animation completes

### Screenshot 3: Overlapping Animations
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [HOH] [DR]                                        ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │ OK │ │Blue│ │Kai │                            ┃
┃  └────┘ └────┘ └────┘                            ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │Quin│ │Rae │ │Pax │  ← Avatar fading/greying  ┃
┃  └────┘ └────┘ └────┘                            ┃
┃                                                    ┃
┃  ┌─────────────────────────────────────────────┐  ┃
┃  │  Self-Evicted                      ❌       │  ┃ ← Redundant message
┃  │                                             │  ┃   during HOH phase!
┃  │  Rae                                        │  ┃
┃  │                                             │  ┃
┃  └─────────────────────────────────────────────┘  ┃
┃                                                    ┃
┃  Week 3 - HOH Competition                         ┃ ← HOH already started
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Issue**: Avatar animation and redundant message appear DURING HOH competition

---

## Solution (AFTER Fix)

### Step 1: Clear Self-Eviction Card
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃  [Player avatars in roster view]                  ┃
┃                                                    ┃
┃  ┌─────────────────────────────────────────────┐  ┃
┃  │  I've had it 😤                      ✅      │  ┃ ← CLEAR TITLE
┃  │                                             │  ┃
┃  │  Rae has decided to self-evict from the    │  ┃
┃  │  Big Brother house.                        │  ┃
┃  │                                             │  ┃
┃  └─────────────────────────────────────────────┘  ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Fixed**: Card title now shows "I've had it 😤" - clear and expressive

### Step 2: Avatar Animation Completes
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃  [Roster with Rae's avatar fading out]            ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │ OK │ │Blue│ │Kai │                            ┃
┃  └────┘ └────┘ └────┘                            ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │Quin│ │ 👻 │ │Pax │  ← Avatar fading          ┃
┃  └────┘ └────┘ └────┘     to gray                ┃
┃                                                    ┃
┃  [No overlapping cards]                           ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Fixed**: Animation plays and completes BEFORE next phase

### Step 3: Clean Week Modal
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃                                                    ┃
┃              👁️🏠                                 ┃
┃                                                    ┃
┃         Get Ready for Week 3!           ✅        ┃
┃                                                    ┃
┃   The HOH competition is about to begin            ┃
┃                                                    ┃
┃   [Rae's avatar now fully greyed out in roster]   ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Fixed**: Week modal appears AFTER self-eviction is complete

### Step 4: Clean HOH Start
```
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃  [HOH] [DR]                                        ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │ OK │ │Blue│ │Kai │                            ┃
┃  └────┘ └────┘ └────┘                            ┃
┃  ┌────┐ ┌────┐ ┌────┐                            ┃
┃  │Quin│ │Rae │ │Pax │  ← Rae fully greyed       ┃
┃  └────┘ └────┘ └────┘                            ┃
┃                                                    ┃
┃  Week 3 - HOH Competition              ✅        ┃
┃                                                    ┃
┃  Play the minigame to compete!                    ┃
┃                                                    ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
```
**Fixed**: HOH starts cleanly with no overlapping messages

---

## Technical Flow Diagram

### BEFORE Fix (Broken Flow)
```
┌──────────────────┐
│  Intermission    │
│  Phase Starts    │
└────────┬─────────┘
         │
         ├─── tryMaybeAutoSelfEvict() [NOT AWAITED]
         │    └─── Shows card "Breaking News" ❌
         │    └─── Starts runEvictionVisual() [ASYNC] 🔄
         │
         ├─── decideForWeek() continues immediately ⚠️
         │
         └─── setPhase('intermission') continues ⚠️
              │
              ├─── showWeekIntroModal() shows TOO EARLY ❌
              │
              └─── startHOH() while animation STILL RUNNING ❌
                   │
                   └─── runEvictionVisual() completes LATE 🔄
                        └─── Shows redundant card ❌
```

### AFTER Fix (Correct Flow)
```
┌──────────────────┐
│  Intermission    │
│  Phase Starts    │
└────────┬─────────┘
         │
         ├─── await tryMaybeAutoSelfEvict() ✅
         │    ├─── Shows card "I've had it 😤" ✅
         │    ├─── await runEvictionVisual() ✅
         │    │    └─── Avatar animation completes 🎬
         │    └─── await cardQueueWaitIdle() ✅
         │         └─── All cards finish animating 🎬
         │
         ├─── await decideForWeek() ✅
         │    └─── Self-eviction FULLY COMPLETE 🎉
         │
         └─── await setPhase('intermission') ✅
              │
              ├─── showWeekIntroModal() shows AFTER ✅
              │    └─── Clean transition 🎬
              │
              └─── startHOH() starts CLEANLY ✅
                   └─── No overlapping animations 🎉
```

---

## Code Changes Summary

### 1. Card Title (js/self-eviction.js)
```javascript
// BEFORE
showCard('Breaking News', [...]);

// AFTER
showCard("I've had it 😤", [...]);
```

### 2. Async Chain (Multiple Files)
```javascript
// All these functions now use async/await:

async function tryMaybeAutoSelfEvict() {
  await global.selfEviction.handle(victim.id, 'ai');
  await global.cardQueueWaitIdle(); // Wait for cards
}

async function decideForWeek() {
  await tryMaybeAutoSelfEvict(); // Wait for self-eviction
}

async function setPhase(phase, ...) {
  if (phase === 'intermission') {
    await g.twists?.decideForWeek?.(); // Wait for week logic
  }
}

async function proceedNextWeek() {
  await global.setPhase('intermission', ...); // Wait for phase change
}

async function postEvictionRouting() {
  await proceedNextWeek(); // Wait for week transition
}

async function endWeekAndProceed() {
  await global.postEvictionRouting(); // Wait for routing
}
```

---

## Benefits

✅ **Clear Messaging**: "I've had it 😤" immediately tells the user what's happening  
✅ **No Overlaps**: Self-eviction completes before new week begins  
✅ **Better UX**: Smooth, sequential transitions  
✅ **No Redundancy**: Eliminates duplicate self-eviction messages  
✅ **Maintainable**: Proper async/await chain is easier to debug  

---

## Testing

Open `test_self_eviction_timing.html` in a browser to run automated tests:
- ✅ Card title test
- ✅ Async flow test
- ✅ Timing test

All tests should pass with the fix applied.
