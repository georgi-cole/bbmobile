# Veto Ceremony Modernization - Implementation Summary

## Overview
This implementation modernizes the veto ceremony to match the recently refactored HOH nomination ceremony, creating a cohesive card-driven "living room" flow with cinematic pacing, proper avatar usage, and clear decision points.

## Key Changes

### 1. Ceremony Intro with POV Holder Avatar (js/veto.js)
**Before:** Generic text card "The holder will make a decision…"
**After:** Cinematic card with POV holder avatar using buildCardWithAvatars

**Implementation:**
- In `startVetoCeremony()`, now shows POV holder avatar alongside intro text
- Message: "This is the Veto ceremony. As [POV Holder] holds the Power of Veto, please stand and make your decision."
- Duration: 2400ms (matching nomination ceremony pacing)
- Uses `buildCardWithAvatars({ actorId: g.vetoHolder, type: 'vetoCeremonyIntro' })`
- Converted to async function for proper sequencing

**Code Location:** Lines ~646-717 in `js/veto.js`

### 2. Yes/No Decision Panel
**Before:** Multiple buttons: "Do NOT use veto" + individual "Use on [Nominee]" buttons
**After:** Clear Yes/No choice with follow-up selection if needed

**New Flow:**
- Primary button: "Yes — Use the Veto" (green, prominent)
- Default button: "No — Keep Nominations the Same"
- If Yes and multiple nominees: shows "Save Which Nominee?" panel
- If Yes and single nominee: directly uses veto on that nominee

**Benefits:**
- Clearer decision point for human players
- Matches Big Brother TV show format ("Would you like to use the POV?")
- Improved UX with two-step decision for multi-nominee scenarios

**Code Location:** Lines ~719-810 in `js/veto.js`

### 3. Card-Driven Reveals with Actor/Target Avatars

**Veto Decision Card:**
- Shows POV holder avatar
- Random phrase from VETO_USE_PHRASES
- Uses `buildCardWithAvatars({ actorId: g.vetoHolder, type: 'vetoDecision' })`
- Duration: 3200ms

**Saved Player Card:**
- Shows POV holder → Saved player with arrow
- Message: "[Saved] is saved from the block."
- Uses `buildCardWithAvatars({ actorId: g.vetoHolder, targetIds: [savedId], type: 'vetoSaved' })`
- Duration: 3200ms

**Replacement Required Card:**
- Shows HOH avatar
- Message: "As I have vetoed one of your nominations, you must now select a replacement."
- Uses `buildCardWithAvatars({ actorId: g.hohId, type: 'replacementRequired' })`
- Duration: 3200ms

**HOH Announcement Card:**
- Shows HOH → Replacement nominee with arrow
- Message: "I name [Replacement] as the replacement nominee."
- Uses `buildCardWithAvatars({ actorId: g.hohId, targetIds: [replacementId], type: 'hohAnnouncement' })`
- Duration: 3400ms

**Replacement Nominee Card:**
- Shows replacement nominee avatar
- Message: "[Replacement]"
- Uses `buildCardWithAvatars({ actorId: replacementId, type: 'replacement' })`
- Duration: 3600ms

**Veto Not Used Card:**
- Shows POV holder avatar
- Random phrase from VETO_NOT_USE_PHRASES
- Uses `buildCardWithAvatars({ actorId: g.vetoHolder, type: 'vetoNotUsed' })`
- Duration: 3600ms

**Code Location:** Lines ~812-967 in `js/veto.js`

### 4. Async/Await Pattern for Proper Sequencing

**Converted Functions:**
- `startVetoCeremony()` → `async function startVetoCeremony()`
- `finalizeCeremony()` → `async function finalizeCeremony(choice)`
- `applyReplacementAndContinue()` → `async function applyReplacementAndContinue(replacementId)`

**Pattern:**
```javascript
// Modern promise-based card sequencing
if(global.buildCardWithAvatars){
  await new Promise(function(resolve){
    var card = global.buildCardWithAvatars({ /* options */ });
    setTimeout(function(){
      var host = document.getElementById('tvOverlay');
      if(host) host.innerHTML = '';
      document.getElementById('tv')?.classList.remove('tvTall');
      resolve();
    }, duration);
  });
}
```

**Benefits:**
- Eliminates callback hell from nested `.then()` chains
- Cleaner, more readable code
- Maintains backward compatibility with cardQueueWaitIdle
- Proper timing guarantees for card sequences

**Code Location:** Throughout modified functions in `js/veto.js`

### 5. Preserved All Existing Logic

**Final 4 Bypass:**
- Remains unchanged in `handlePostVetoReveal()` (line ~317)
- Still checks `alivePlayers().length === 4` and calls `startFinal4Eviction()`
- Final 4 eviction panel and logic untouched (lines ~427-644)

**Edge Cases Preserved:**
- ID normalization guards intact
- AFK fallback (auto-submit 0 if time expires) preserved
- All duplicate submission guards maintained
- Nomination state machine logic unchanged

**Progression Hooks:**
- `ProgressionEvents.onVetoUsedOnSelf(vetoWinner)` preserved
- `ProgressionEvents.onVetoUsedOnOther(vetoWinner, savedId)` preserved

**Social Maneuvers Events:**
- `SocialManeuvers.recordWeeklyEvent(g.vetoHolder, { vetoUsed: true })` preserved
- `SocialManeuvers.recordWeeklyEvent(replacementId, { nominated: true })` preserved

**AI Decision Logic:**
- `aiVetoDecision()` function unchanged (lines ~812-827)
- Uses affinity threshold to decide veto usage
- `pickReplacementByHOH()` function unchanged (lines ~829-841)

**Badge Synchronization:**
- `syncPlayerBadgeStates()` calls preserved after state changes
- Nomination states properly set: 'nominated', 'pendingSave', 'saved', 'replacement'

## Updated Ceremony Flow

### Standard Flow (5+ players, veto used):
1. **Ceremony Intro** (2400ms)
   - POV holder avatar
   - "This is the Veto ceremony. As [POV] holds the Power of Veto, please stand and make your decision."

2. **Yes/No Decision Panel**
   - Human: Waits for button click
   - AI: Auto-decides after 1200ms based on affinity

3. **If Yes - Save Which Nominee?** (if multiple nominees)
   - Shows individual "Save [Nominee]" buttons
   - Human selects which nominee to save

4. **Veto Decision Card** (3200ms)
   - POV holder avatar
   - Random phrase: "I have decided to use the Power of Veto..."

5. **Saved Card** (3200ms)
   - POV holder → Saved player (arrow)
   - "[Saved] is saved from the block."

6. **Replacement Required Card** (3200ms)
   - HOH avatar
   - "You must now select a replacement."

7. **Replacement Selection**
   - Human HOH: Dropdown + Confirm button
   - AI HOH: Auto-selects based on affinity/threat

8. **HOH Announcement Card** (3400ms)
   - HOH → Replacement (arrow)
   - "I name [Replacement] as the replacement nominee."

9. **Replacement Card** (3600ms)
   - Replacement nominee avatar
   - "[Replacement]"

10. **Proceed to Social/Live Vote**

### Standard Flow (veto NOT used):
1. **Ceremony Intro** (2400ms)
2. **Yes/No Decision Panel** → No
3. **Veto Not Used Card** (3600ms)
   - POV holder avatar
   - Random phrase: "I have decided not to use the Power of Veto."
4. **Proceed to Social/Live Vote**

### Final 4 Flow:
- NO veto ceremony
- Direct eviction by POV holder
- Flow unchanged from previous implementation

## Fallback Compatibility

All card renders include fallback to legacy `showCard()` if `buildCardWithAvatars` is not available:

```javascript
if(global.buildCardWithAvatars){
  // Modern card with avatars
} else {
  // Legacy showCard fallback
  try{ if(typeof global.showCard==='function') global.showCard(...); }catch(e){}
  if(typeof global.cardQueueWaitIdle==='function'){ try{ await global.cardQueueWaitIdle(); }catch(e){} }
}
```

This ensures the ceremony works even in older environments or if avatar system is disabled.

## Testing

### Test File
- `test_veto_ceremony_modernized.html` - Validates new flow with visual previews

### Manual Test Scenarios
1. **Human POV - Use on Nominee:** Verify Yes/No panel → Save selection → Card sequence
2. **Human POV - Do Not Use:** Verify No button → Veto not used card → Social phase
3. **AI POV - High Affinity:** Verify AI uses veto on high affinity nominee
4. **AI POV - Low Affinity:** Verify AI does not use veto
5. **Final 4 Bypass:** Verify ceremony is skipped at Final 4
6. **Multiple Nominees:** Verify "Save Which Nominee?" panel appears

### Validation Checks
✓ Ceremony intro shows POV holder avatar
✓ Yes/No decision panel rendered
✓ Veto decision card shows actor avatar
✓ Saved card shows actor → target arrow
✓ Replacement flow shows HOH avatar
✓ Veto not used shows POV holder avatar
✓ Final 4 bypass logic intact
✓ Async/await pattern implemented
✓ Progression hooks preserved
✓ Social maneuvers events preserved

## Code Statistics

**Lines Modified:** ~350 lines changed in `js/veto.js`
- `startVetoCeremony()`: Converted to async, added buildCardWithAvatars intro
- `renderVetoCeremonyPanel()`: Redesigned with Yes/No buttons
- `showNomineeSelection()`: New function for multi-nominee selection
- `finalizeCeremony()`: Converted to async, added card-driven reveals
- `applyReplacementAndContinue()`: Converted to async, added avatar cards

**No Breaking Changes:** All existing functionality preserved
**Backward Compatible:** Fallbacks for legacy systems included

## Visual Comparison

### Before
```
┌─────────────────────┐
│  Veto Ceremony      │
│  The holder will    │
│  make a decision... │
└─────────────────────┘
        ↓
┌─────────────────────┐
│ [Do NOT use veto]   │
│ [Use on Alice]      │
│ [Use on Bob]        │
└─────────────────────┘
```

### After
```
┌─────────────────────┐
│  Veto Ceremony      │
│  As Charlie holds   │
│  the Power of Veto..│
│      [Charlie 🛡️]   │
└─────────────────────┘
        ↓
┌─────────────────────┐
│ Would you like to   │
│ use the POV?        │
│ [Yes - Use Veto]    │
│ [No - Keep Same]    │
└─────────────────────┘
        ↓ (if Yes)
┌─────────────────────┐
│  Veto Decision      │
│  I have decided to  │
│  use the Power...   │
│      [Charlie 🛡️]   │
└─────────────────────┘
        ↓
┌─────────────────────┐
│  Saved              │
│  Alice is saved.    │
│  [Charlie → Alice]  │
└─────────────────────┘
```

## Next Steps

- ✓ Implementation complete
- ✓ Test file created
- ✓ Documentation written
- ⏳ Manual QA testing
- ⏳ Integration with live game flow

## Notes

This modernization brings the veto ceremony in line with the HOH nomination ceremony's cinematic presentation while preserving all game logic, edge cases, and progression hooks. The Yes/No decision panel provides a clearer UX, and the card-driven reveals with avatars create a more engaging and visually consistent experience.
