# Nomination Ceremony Flow Diagram

## BEFORE FIX (Buggy Behavior)

```
┌─────────────────────────────────────────────────────────────┐
│                    HOH Competition Ends                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Phase Changes to "nominations"                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
        ▼ (Human HOH)                 ▼ (AI HOH)
┌──────────────────┐          ┌─────────────────┐
│ Event Modal      │          │ Event Modal     │
│ (Phase Intro)    │          │ (Phase Intro)   │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         │ ❌ Not cleared!             │ ❌ Not cleared!
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ Nomination Modal │          │ "HOH considering│
│ ⚠️ OVERLAPS! ⚠️  │          │  nominations"   │
│ (2 modals shown) │          └────────┬────────┘
└────────┬─────────┘                   │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ Fullscreen       │          │ AI auto-selects │
│ Selector         │          │ nominees        │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ Set flag:        │          │ finalizeNoms()  │
│ __nomsFrom       │          │ called          │
│ FullscreenSelect │          └────────┬────────┘
│       = true     │                   │
└────────┬─────────┘                   │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ finalizeNoms()   │          │ Check flag:     │
│ called           │          │ __nomsFrom...   │
└────────┬─────────┘          │ ❌ TRUE!        │
         │                    └────────┬────────┘
         ▼                             │
┌──────────────────┐                   │
│ Check flag:      │                   │
│ __nomsFrom...    │                   │
│ ❌ TRUE!         │                   │
└────────┬─────────┘                   │
         │                             │
         ├─────────────────────────────┤
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│          🚫 CEREMONY SKIPPED (Early Return) 🚫              │
│              - No HOH speech                                │
│              - No nominee reveals                           │
│              - No reactions                                 │
│              - No adjournment                               │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              ⚠️ Jump Directly to Veto Comp ⚠️               │
└─────────────────────────────────────────────────────────────┘
```

---

## AFTER FIX (Correct Behavior)

```
┌─────────────────────────────────────────────────────────────┐
│                    HOH Competition Ends                     │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Phase Changes to "nominations"                 │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
        ┌──────────────┴──────────────┐
        │                             │
        ▼ (Human HOH)                 ▼ (AI HOH)
┌──────────────────┐          ┌─────────────────┐
│ Event Modal      │          │ Event Modal     │
│ (Phase Intro)    │          │ (Phase Intro)   │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ renderNomsPanel()│          │ renderNomsPanel│
│ called           │          │ called          │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ ✅ clearEvent    │          │ ✅ clearEvent   │
│ ModalQueue()     │          │ ModalQueue()    │
│ (FIXES OVERLAP!) │          │ (FIXES OVERLAP!)│
└────────┬─────────┘          └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ Nomination Modal │          │ "HOH considering│
│ ✅ Clean slate!  │          │  nominations"   │
│ (No overlap)     │          └────────┬────────┘
└────────┬─────────┘                   │
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ Fullscreen       │          │ AI auto-selects │
│ Selector         │          │ nominees        │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ ✅ NO FLAG SET   │          │ finalizeNoms()  │
│ (Flag removed!)  │          │ called          │
└────────┬─────────┘          └────────┬────────┘
         │                             │
         ▼                             ▼
┌──────────────────┐          ┌─────────────────┐
│ finalizeNoms()   │          │ ✅ NO SKIP      │
│ called           │          │ (Flag check     │
└────────┬─────────┘          │  removed!)      │
         │                    └────────┬────────┘
         ▼                             │
┌──────────────────┐                   │
│ ✅ NO SKIP       │                   │
│ (Flag check      │                   │
│  removed!)       │                   │
└────────┬─────────┘                   │
         │                             │
         ├─────────────────────────────┤
         │                             │
         ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│           ✅ CEREMONY ALWAYS RUNS ✅                        │
│                                                             │
│   Step 1: HOH Speech Card (2.4s)                           │
│   ┌─────────────────────────────────────────┐             │
│   │ "Nomination Ceremony"                   │             │
│   │ [HOH Avatar]                            │             │
│   │ "HOH addresses the house."              │             │
│   └─────────────────────────────────────────┘             │
│                                                             │
│   Step 2: Nominee #1 Reveal (2.2s)                        │
│   ┌─────────────────────────────────────────┐             │
│   │ "First Nominee"                         │             │
│   │ [Nominee Avatar]                        │             │
│   │ "Bob"                                   │             │
│   └─────────────────────────────────────────┘             │
│                                                             │
│   Step 3: Nominee #2 Reveal (2.2s)                        │
│   ┌─────────────────────────────────────────┐             │
│   │ "Second Nominee"                        │             │
│   │ [Nominee Avatar]                        │             │
│   │ "Charlie"                               │             │
│   └─────────────────────────────────────────┘             │
│                                                             │
│   Step 4: Nominee Reactions (Variable)                    │
│   ┌───────────┐ ┌───────────┐                             │
│   │ Bob       │ │ Charlie   │                             │
│   │ [Avatar]  │ │ [Avatar]  │                             │
│   │ "I'm ready│ │ "This is  │                             │
│   │  to fight"│ │  not over"│                             │
│   └───────────┘ └───────────┘                             │
│                                                             │
│   Step 5: Adjournment (2.0s)                              │
│   ┌─────────────────────────────────────────┐             │
│   │ "Nomination Ceremony"                   │             │
│   │ "This ceremony is adjourned."           │             │
│   └─────────────────────────────────────────┘             │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼ (600ms delay)
┌─────────────────────────────────────────────────────────────┐
│              ✅ Proceed to Veto Competition ✅               │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Changes Highlighted

### Change 1: Modal Queue Clearing
```diff
  renderNomsPanel() {
    // Check if locked...
    if(g.nomsLocked || ...) return;
    
+   // Clear any pending event modals to prevent overlay conflicts
+   if(typeof global.clearEventModalQueue === 'function'){
+     global.clearEventModalQueue();
+   }
    
    // Show nomination modal...
  }
```

**Impact:** ✅ Prevents phase intro modals from overlapping with nomination modal

---

### Change 2: Remove Ceremony Skip
```diff
  finalizeNoms() {
    // ... lock nominations ...
    
    (async function ceremony(){
      const hoh = global.getP(g.hohId);
      const ids = (g.nominees||[]).slice();
      
-     // Check if ceremony was already handled by fullscreen selector
-     if(g.__nomsFromFullscreenSelector){
-       console.log('[noms] Ceremony already handled, skipping');
-       setTimeout(()=>global.startVetoComp?.(),600);
-       return; // ❌ SKIP CEREMONY
-     }
      
      // ========== CEREMONY FLOW ==========
      // Step 1: HOH Speech
      // Step 2: Nominee Reveals
      // Step 3: Reactions
      // Step 4: Adjournment
      // Step 5: Proceed to Veto
    })();
  }
```

**Impact:** ✅ Ceremony now always runs for both AI and human HOH

---

### Change 3: Remove Flag Setting
```diff
  // nominations-grid-fullscreen.js
  
  // Commit nominations
  if (global.finalizeNoms) {
-   g.__nomsFromFullscreenSelector = true; // ❌ CAUSES SKIP
    global.finalizeNoms();
  }
```

**Impact:** ✅ Fullscreen selector no longer sets skip flag

---

## Timeline Comparison

### Before Fix (Buggy)
```
0.0s  │ Phase change
0.5s  │ Event modal shown
1.0s  │ Nomination modal shown (OVERLAPS!)
2.0s  │ User selects nominees
3.0s  │ finalizeNoms() called
3.1s  │ ❌ Ceremony SKIPPED (early return)
3.2s  │ Jump to Veto comp
      │ Total: 3.2s (ceremony missing!)
```

### After Fix (Correct)
```
 0.0s │ Phase change
 0.5s │ Event modal shown
 1.0s │ clearEventModalQueue() called
 1.1s │ Nomination modal shown (NO overlap)
 2.0s │ User selects nominees
 3.0s │ finalizeNoms() called
 3.1s │ ✅ Ceremony RUNS:
 3.1s │   - HOH speech (2.4s)
 5.5s │   - Nominee #1 reveal (2.2s)
 7.7s │   - Nominee #2 reveal (2.2s)
 9.9s │   - Reactions (1.8s each = 3.6s)
13.5s │   - Adjournment (2.0s)
15.5s │ ✅ Proceed to Veto comp (600ms)
      │ Total: 15.5s (complete ceremony!)
```

---

## Testing Checklist

- [ ] Human HOH: No modal overlap
- [ ] Human HOH: Full ceremony sequence
- [ ] AI HOH: Full ceremony sequence
- [ ] Multi-eviction (3 nominees): All reveals shown
- [ ] Multi-eviction (4 nominees): All reveals shown
- [ ] Veto comp starts AFTER ceremony (not before)
- [ ] No console errors
- [ ] Badge states update correctly after ceremony

---

**Legend:**
- ✅ = Fixed / Working correctly
- ❌ = Bug / Not working
- ⚠️ = Warning / Issue
- 🚫 = Blocked / Prevented
