# Diamond POV Two-Step Flow Implementation

## Overview

This document describes the implementation of the Diamond Power of Veto two-step flow with interstitial confirmation and the fix for the click delegation bug.

## Problem Summary

1. **Click Delegation Bug**: Clicking on replacement nominees during Diamond POV would bounce users back to the main screen due to global click delegation, causing "Node cannot be found in the current page" errors.

2. **Flow Requirements**: Diamond POV needed a strict two-step process:
   - First replacement selection with full-screen carousel
   - Interstitial confirmation showing temporary roster state
   - Second replacement selection with strict eligibility filtering
   - Apply both replacements and adjourn

## Solution

### 1. Event Guard Implementation

**Location:** `js/veto.js` - `showFullscreenReplacementSelector()` function

**Changes:**
- Added `guardEvent()` function that prevents event bubbling via:
  - `preventDefault()` - stops default browser behavior
  - `stopPropagation()` - prevents bubbling to parent handlers
  - `stopImmediatePropagation()` - stops other listeners on same element

- Installed bubble-phase event listeners on overlay:
  ```javascript
  overlay.addEventListener('click', guardEvent, false);
  overlay.addEventListener('mousedown', guardEvent, false);
  overlay.addEventListener('touchstart', guardEvent, false);
  ```

- Applied guard to all interactive elements:
  - Player card `onclick` and `onkeydown` handlers
  - Confirm button `onclick` handler

**Why this works:**
- Bubble-phase listeners (false parameter) allow component's own handlers to execute first
- Guards prevent events from reaching global router/HUD click handlers
- Non-navigational elements (div/button, not anchors) prevent routing

### 2. Two-Step Diamond POV Flow

**Location:** `js/veto.js` - `handleDiamondPOVCeremony()` function

#### Flow Steps:

**1. Show Diamond POV Announcement**
```javascript
await showTVCardWithAvatars({
  title: 'Diamond Power of Veto',
  lines: [holderName + ' will now replace BOTH nominees.'],
  tone: 'veto',
  duration: 3200,
  actorIds: holder ? holder.id : null
});
```

**2. First Replacement Selection**
- Compute base eligibility (exclude HOH, POV holder)
- Show full-screen selector:
  ```javascript
  firstReplacement = await showFullscreenReplacementSelector({
    eligibleIds: baseEligible,
    count: 1,
    title: 'Select first replacement nominee'
  });
  ```
- AI fallback if human cancels

**3. Interstitial Roster Update**
```javascript
// Determine remaining original nominee
var remainingOriginal = originalNominees[0] === firstReplacement 
  ? originalNominees[1] 
  : originalNominees[0];

// Clear NOM from replaced nominee
for(var i=0; i<originalNominees.length; i++){
  if(originalNominees[i] !== remainingOriginal){
    var removedP = getP(originalNominees[i]);
    if(removedP){
      removedP.nominated = false;
      removedP.nominationState = 'none';
    }
  }
}

// Add NOM to first replacement
var firstRepP = getP(firstReplacement);
if(firstRepP){
  firstRepP.nominated = true;
  firstRepP.nominationState = 'nominated';
}

// Update g.nominees temporarily
g.nominees = [firstReplacement, remainingOriginal];

// Sync badges
syncPlayerBadgeStates();
updateHud();
```

**4. Show Confirmation Card**
```javascript
await showTVCardWithAvatars({
  title: 'First Replacement Confirmed',
  lines: [safeName(firstReplacement) + ' is now nominated.', 'Select the second replacement.'],
  tone: 'noms',
  duration: 3200,
  subjectIds: firstReplacement
});
```

**5. Interstitial Confirmation (OK Button)**
```javascript
if(typeof window.showConfirm === 'function'){
  await window.showConfirm('First replacement confirmed. Proceed to second selection?', {
    title: 'Diamond POV',
    confirmText: 'Continue',
    cancelText: null,
    tone: 'veto'
  });
} else {
  await showTVDecision({
    title: 'Diamond POV',
    message: 'First replacement confirmed. Continue to second selection.',
    buttons: [{ label: 'OK', value: true, primary: true }]
  });
}
```

**6. Second Replacement Selection with Strict Eligibility**
```javascript
// Exclude: HOH, POV, first replacement, remaining nominee
var secondEligible = alivePlayers().filter(function(p){
  return p.id !== g.hohId && 
         p.id !== g.vetoHolder && 
         p.id !== firstReplacement && 
         p.id !== remainingOriginal &&
         !p.evicted;
}).map(function(p){ return p.id; });

secondReplacement = await showFullscreenReplacementSelector({
  eligibleIds: secondEligible,
  count: 1,
  title: 'Select second replacement nominee'
});
```

**7. Apply Both Replacements**
```javascript
await applyReplacementAndContinueMulti([firstReplacement, secondReplacement], {
  announcer: 'POV',
  diamond: true
});
```

## Key Features

### Event Guard Strategy
- ✅ Prevents global click delegation
- ✅ Does not break component's own handlers
- ✅ Works with touch events (mobile)
- ✅ Handles keyboard events (accessibility)

### Two-Step Flow
- ✅ First replacement with confirm
- ✅ Temporary roster update visible between steps
- ✅ Interstitial confirmation (OK button)
- ✅ Second replacement with strict eligibility
- ✅ Both replacements applied together

### Strict Eligibility
Second pick excludes:
1. Head of Household (HOH)
2. POV holder (cannot nominate self)
3. First replacement (cannot nominate same person twice)
4. Remaining current nominee (the one who stays nominated after first pick)

## Code Preservation

### Unchanged Flows
- ✅ Standard POV (save one nominee, HOH picks replacement)
- ✅ Golden POV (save one nominee, POV holder picks replacement)
- ✅ Both still use `openCarouselPicker` as before

### Reused Helpers
- `showTVCardWithAvatars` - Display cards with player avatars
- `showTVDecision` - Show decision prompts with buttons
- `syncPlayerBadgeStates` - Update roster badge states
- `updateHud` - Refresh HUD display
- `applyReplacementAndContinueMulti` - Apply multiple replacements

## Testing

### Automated Tests
All tests pass (40/40):
```bash
npm run test:pov-carousel
```

### Test Coverage
- ✓ Event guards prevent navigation
- ✓ Diamond POV uses showFullscreenReplacementSelector (2x)
- ✓ First/second replacement titles present
- ✓ Badge updates work correctly
- ✓ Cancel handling implemented
- ✓ Blocked IDs construction correct
- ✓ TV cards used for confirmation

### Manual Testing (Optional)

1. **Setup:**
   ```javascript
   game.cfg.diamondPOVChance = 100; // Force Diamond POV
   ```

2. **Trigger Diamond POV:**
   - Human player wins POV
   - Choose "Yes - Use the Veto"

3. **Verify First Selection:**
   - Full-screen selector appears
   - Can click/tap to select player
   - Confirm button only enabled after selection
   - No navigation errors when clicking

4. **Verify Interstitial:**
   - Confirmation card shows first replacement
   - Roster updates showing first replacement + one original
   - OK button appears

5. **Verify Second Selection:**
   - Full-screen selector appears again
   - Eligibility excludes HOH, POV, first replacement, remaining nominee
   - Can select second replacement

6. **Verify Application:**
   - Both replacements applied
   - Ceremony adjourns
   - Next phase starts

## Files Modified

1. **js/veto.js**
   - Modified `showFullscreenReplacementSelector()` - Added event guards
   - Modified `handleDiamondPOVCeremony()` - Implemented two-step flow

2. **tests/verify_pov_carousel.mjs**
   - Updated Test 16 - Check for `showFullscreenReplacementSelector` usage

## Risk Assessment

**Low Risk:**
- Localized changes in veto ceremony flow only
- No changes to router internals
- Standard/Golden POV completely unchanged
- All existing tests pass
- Uses standard DOM APIs (no experimental features)

## Future Enhancements

Potential improvements (not required):
- Animation between first and second selection
- Preview of excluded players in second selection
- Undo/back button to revise first selection
- Summary card showing both selections before apply

## References

- Problem Statement: See PR description
- Event Delegation: Standard DOM event bubbling
- Diamond POV Mechanics: Big Brother twist variant
- Carousel Picker: `js/ui/carousel-picker.js`
