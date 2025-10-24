# Veto Ceremony Modernization - Visual Comparison

## Before vs After: UI Flow

### BEFORE: Old Veto Ceremony

```
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Veto Ceremony                │  │
│  │  The holder will make a       │  │
│  │  decision…                    │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3600ms
┌─────────────────────────────────────┐
│  Panel (Control Panel)              │
│  ┌───────────────────────────────┐  │
│  │  Veto Ceremony                │  │
│  │  Holder: Charlie              │  │
│  │  Nominees: Alice, Bob         │  │
│  │                               │  │
│  │  [Do NOT use veto]            │  │
│  │  [Use on Alice]               │  │
│  │  [Use on Bob]                 │  │
│  │                               │  │
│  │  Using the veto will force    │  │
│  │  the HOH to name a            │  │
│  │  replacement.                 │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ User clicks "Use on Alice"
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Veto Decision                │  │
│  │  I have decided to use the    │  │
│  │  Power of Veto...             │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3200ms
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Saved                        │  │
│  │  Alice is saved.              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**Issues:**
- ❌ No POV holder visual representation
- ❌ Generic intro message lacks ceremony feel
- ❌ Multiple buttons confusing with 3+ nominees
- ❌ No visual connection between POV holder and saved player
- ❌ Inconsistent with HOH nomination ceremony style

---

### AFTER: Modernized Veto Ceremony

```
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Veto Ceremony                │  │
│  │  This is the Veto ceremony.   │  │
│  │  As Charlie holds the Power   │  │
│  │  of Veto, please stand and    │  │
│  │  make your decision.          │  │
│  │                               │  │
│  │        ┌─────────┐            │  │
│  │        │ Charlie │ 🛡️         │  │
│  │        │  (POV)  │            │  │
│  │        └─────────┘            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 2400ms (cinematic pacing)
┌─────────────────────────────────────┐
│  Panel (Control Panel)              │
│  ┌───────────────────────────────┐  │
│  │  Would you like to use the    │  │
│  │  Power of Veto?               │  │
│  │                               │  │
│  │  POV Holder: Charlie          │  │
│  │  Nominees: Alice, Bob         │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ Yes — Use the Veto      │  │  │
│  │  │      (PRIMARY)          │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  ┌─────────────────────────┐  │  │
│  │  │ No — Keep Nominations   │  │  │
│  │  │      the Same           │  │  │
│  │  └─────────────────────────┘  │  │
│  │                               │  │
│  │  Using the veto will force    │  │
│  │  the HOH to name a            │  │
│  │  replacement nominee.         │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ User clicks "Yes"
┌─────────────────────────────────────┐
│  Panel (Control Panel)              │
│  ┌───────────────────────────────┐  │
│  │  Save Which Nominee?          │  │
│  │                               │  │
│  │  Select which nominee to save │  │
│  │  with the Power of Veto.      │  │
│  │                               │  │
│  │  ┌─────────────┐              │  │
│  │  │ Save Alice  │              │  │
│  │  └─────────────┘              │  │
│  │                               │  │
│  │  ┌─────────────┐              │  │
│  │  │ Save Bob    │              │  │
│  │  └─────────────┘              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ User clicks "Save Alice"
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Veto Decision                │  │
│  │  I have decided to use the    │  │
│  │  Power of Veto on...          │  │
│  │                               │  │
│  │        ┌─────────┐            │  │
│  │        │ Charlie │ 🛡️         │  │
│  │        │  (POV)  │            │  │
│  │        └─────────┘            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3200ms
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Saved                        │  │
│  │  Alice is saved from the      │  │
│  │  block.                       │  │
│  │                               │  │
│  │  ┌─────────┐    →   ┌───────┐│  │
│  │  │ Charlie │        │ Alice ││  │
│  │  │  (POV)  │        │ (NOM) ││  │
│  │  └─────────┘        └───────┘│  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3200ms
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Replacement Required         │  │
│  │  As I have vetoed one of your │  │
│  │  nominations, you must now    │  │
│  │  select a replacement.        │  │
│  │                               │  │
│  │        ┌─────────┐            │  │
│  │        │  Diana  │ 👑         │  │
│  │        │  (HOH)  │            │  │
│  │        └─────────┘            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3200ms
┌─────────────────────────────────────┐
│  Panel (Control Panel)              │
│  ┌───────────────────────────────┐  │
│  │  Select Replacement Nominee   │  │
│  │                               │  │
│  │  The HOH must select a        │  │
│  │  replacement nominee.         │  │
│  │                               │  │
│  │  [Dropdown: Charlie, Eve]     │  │
│  │  [Confirm Replacement]        │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ HOH selects Charlie
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  HOH Announcement             │  │
│  │  Diana: I name Charlie as the │  │
│  │  replacement nominee.         │  │
│  │                               │  │
│  │  ┌─────────┐    →   ┌────────┐│ │
│  │  │  Diana  │        │Charlie││ │
│  │  │  (HOH)  │        │ (REP) ││ │
│  │  └─────────┘        └────────┘│ │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3400ms
┌─────────────────────────────────────┐
│  TV Screen (Faux TV Card)           │
│  ┌───────────────────────────────┐  │
│  │  Replacement Nominee          │  │
│  │  Charlie                      │  │
│  │                               │  │
│  │        ┌─────────┐            │  │
│  │        │ Charlie │            │  │
│  │        │ (REP)   │            │  │
│  │        └─────────┘            │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
              ↓ 3600ms
           [Proceed to Social/Live Vote]
```

**Improvements:**
- ✅ POV holder avatar visible in ceremony intro
- ✅ Cinematic intro message mirrors Big Brother TV format
- ✅ Clear Yes/No decision instead of multiple buttons
- ✅ Two-step decision for multi-nominee scenarios
- ✅ Visual arrows show relationships (POV → Saved, HOH → Replacement)
- ✅ Consistent with HOH nomination ceremony style
- ✅ Better pacing with proper durations

---

## Key UX Improvements

### 1. Decision Clarity
**Before:** 3+ buttons for nominees + "Do NOT use" = confusing
**After:** Simple Yes/No → follow-up selection = clear decision path

### 2. Visual Storytelling
**Before:** Text-only cards, no visual connection between actors
**After:** Avatar arrows show cause-effect (Charlie saves Alice, Diana replaces with Charlie)

### 3. Cinematic Pacing
**Before:** Generic 3600ms card → immediate panel
**After:** 2400ms intro with avatar → clear decision → sequenced reveals

### 4. Consistency
**Before:** Different style from HOH nomination ceremony
**After:** Matches HOH ceremony pattern exactly

---

## Code Architecture Comparison

### BEFORE: Callback Hell
```javascript
function startVetoCeremony(){
  // ...
  showCard('Veto Ceremony', ['The holder will make a decision…'], 'veto', 3600, true);
  (function waitCards(){
    if(typeof global.cardQueueWaitIdle === 'function'){
      try{
        global.cardQueueWaitIdle().then(function(){ afterWait(); });
        return;
      }catch(e){}
    }
    afterWait();
  })();
  
  function afterWait(){
    setPhase('veto_ceremony', 25, finalizeCeremony);
    setTimeout(function(){ renderVetoCeremonyPanel(); }, 50);
    // ...
  }
}

function finalizeCeremony(choice){
  // ...
  if(decision.used){
    showCard('Veto Decision', [phrase], 'veto', 3200, true);
    if(typeof global.cardQueueWaitIdle === 'function'){
      try{
        global.cardQueueWaitIdle().then(function(){ thenSaved(); });
        return;
      }catch(e){}
    }
    thenSaved();
    
    function thenSaved(){
      showCard('Saved', [name], 'veto', 3200, true);
      if(typeof global.cardQueueWaitIdle === 'function'){
        try{
          global.cardQueueWaitIdle().then(function(){ afterNarr(); });
          return;
        }catch(e){}
      }
      afterNarr();
    }
    
    function afterNarr(){
      // ... more nesting
    }
  }
}
```

### AFTER: Clean Async/Await
```javascript
async function startVetoCeremony(){
  // ...
  if(global.buildCardWithAvatars){
    await new Promise(function(resolve){
      var card = global.buildCardWithAvatars({
        title: 'Veto Ceremony',
        lines: ['This is the Veto ceremony. As ' + holderName + ' holds the Power of Veto...'],
        tone: 'veto',
        duration: 2400,
        actorId: g.vetoHolder,
        type: 'vetoCeremonyIntro'
      });
      setTimeout(function(){ cleanupCard(); resolve(); }, 2400);
    });
  }
  
  setPhase('veto_ceremony', 25, finalizeCeremony);
  setTimeout(function(){ renderVetoCeremonyPanel(); }, 50);
  // ...
}

async function finalizeCeremony(choice){
  // ...
  if(decision.used){
    // Veto decision card
    await showCardWithAvatar({
      title: 'Veto Decision',
      actorId: g.vetoHolder,
      duration: 3200
    });
    
    // Saved card
    await showCardWithAvatar({
      title: 'Saved',
      actorId: g.vetoHolder,
      targetIds: [savedId],
      duration: 3200
    });
    
    // Replacement required
    await showCardWithAvatar({
      title: 'Replacement Required',
      actorId: g.hohId,
      duration: 3200
    });
    // ... clean flow continues
  }
}
```

**Benefits:**
- ✅ No callback nesting
- ✅ Linear, readable code
- ✅ Easy to add/remove steps
- ✅ Proper error handling with try/catch

---

## Summary

The modernized veto ceremony brings:
1. **Visual consistency** with HOH nomination ceremony
2. **Clearer UX** with Yes/No decision flow
3. **Better storytelling** with avatar relationships
4. **Cleaner code** with async/await pattern
5. **Full preservation** of all game logic and edge cases

This creates a cohesive "living room" experience that mirrors the TV show format while maintaining all existing functionality and safeguards.
