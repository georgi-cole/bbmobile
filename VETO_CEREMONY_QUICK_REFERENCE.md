# Veto Ceremony Modernization - Quick Reference

## What Changed?

The veto ceremony has been modernized to match the HOH nomination ceremony style with card-driven flow, avatar integration, and clear decision UX.

## Quick Links

- **Implementation Details:** [VETO_CEREMONY_MODERNIZATION_SUMMARY.md](VETO_CEREMONY_MODERNIZATION_SUMMARY.md)
- **Visual Comparison:** [VETO_CEREMONY_VISUAL_COMPARISON.md](VETO_CEREMONY_VISUAL_COMPARISON.md)
- **Test File:** [test_veto_ceremony_modernized.html](test_veto_ceremony_modernized.html)

## Key Changes Summary

### 1. Ceremony Intro (2400ms)
**Before:** Generic "The holder will make a decision…"  
**After:** POV holder avatar + "As [POV] holds the Power of Veto, please stand and make your decision."

### 2. Decision Panel
**Before:** Multiple buttons (Do NOT use + Use on [Nominee 1] + Use on [Nominee 2])  
**After:** Clear Yes/No buttons → Follow-up "Save Which Nominee?" if multiple nominees

### 3. Card Reveals
**Before:** Text-only cards  
**After:** All cards show avatars with actor → target arrows where applicable

### 4. Code Architecture
**Before:** Callback hell with nested .then() chains  
**After:** Clean async/await pattern

### 5. Preservation
✅ Final 4 bypass logic intact  
✅ All edge-case guards preserved  
✅ Progression hooks maintained  
✅ Social Maneuvers events preserved

## Files Modified

- `js/veto.js` - ~350 lines changed
  - `startVetoCeremony()` → async, buildCardWithAvatars intro
  - `renderVetoCeremonyPanel()` → Yes/No buttons
  - `showNomineeSelection()` → new function for multi-nominee selection
  - `finalizeCeremony()` → async, card-driven reveals
  - `applyReplacementAndContinue()` → async, avatar cards

## Testing

### Automated
```bash
npm run test:all
```
✅ All tests pass

### Manual
1. Open `test_veto_ceremony_modernized.html` in browser
2. Review 10 validation checks (all pass)
3. Inspect card flow previews
4. Test in live game with various scenarios

## Card Flow Preview

### Veto Used Flow
```
1. Ceremony Intro (POV avatar) → 2400ms
2. Yes/No Decision Panel → User input
3. Save Which Nominee? (if multiple) → User input
4. Veto Decision (POV avatar) → 3200ms
5. Saved (POV → Saved, arrow) → 3200ms
6. Replacement Required (HOH avatar) → 3200ms
7. Replacement Selection → User/AI input
8. HOH Announcement (HOH → Replacement, arrow) → 3400ms
9. Replacement (Replacement avatar) → 3600ms
10. Proceed to Social/Live Vote
```

### Veto Not Used Flow
```
1. Ceremony Intro (POV avatar) → 2400ms
2. Yes/No Decision Panel → No
3. Veto Not Used (POV avatar) → 3600ms
4. Proceed to Social/Live Vote
```

### Final 4 Flow
```
NO CEREMONY - Skip directly to Final 4 eviction (unchanged)
```

## Implementation Status

- ✅ Code implementation complete
- ✅ All tests passing
- ✅ Documentation complete
- ✅ Visual comparison created
- ✅ Test file created
- ⏳ Manual QA pending
- ⏳ Live game testing pending

## Veto Competition Results Display

### Top-3 Compact Leaderboard with Auto-Dismiss

The veto competition now displays a compact top-3 leaderboard in the TV overlay that matches the HOH competition visual style. The panel automatically dismisses after 5 seconds and can be closed immediately using the fast-forward (FFWD) button.

**Module:** `js/ui.veto-results.js`

**Usage:**
```javascript
// Call with scores object/Map, participant IDs, and options
window.VetoResultsUI.renderVetoCompResults(scoresObj, participantIds, {
  maxResults: 3,        // Show top 3 only
  autoDismissMs: 5000   // Auto-dismiss after 5 seconds
});
```

**Features:**
- **Top-3 Only**: Displays only the top 3 finishers, sorted by score (descending)
- **First Place Emphasis**: Winner gets larger avatar (64px), gold highlight, and crown badge 👑
- **Auto-Dismiss**: Panel automatically closes after 5 seconds
- **FFWD Dismissal**: Pressing any fast-forward button immediately closes the panel
  - Listens for FFWD button clicks (`.btn-ffwd`, `.ffwd`, `.ffwd-btn`, etc.)
  - Listens for custom events: `fastForwardPressed` and `ffwdPressed`
- **Compact Overlay**: Positioned at top center (110px from top) as an overlay, not fullscreen
- **Smooth Animations**: Fade-in on show, fade-out on hide/dismiss
- **Mobile-responsive design**
- **Accessibility support** (ARIA labels, role attributes)

**Styling:** `css/veto-results.css`

**Visual Design:**
- Compact panel: 720px max-width (calc(100% - 48px) on mobile)
- Dark gradient background with rounded corners
- Gold accent for first place
- Horizontal layout on desktop, vertical on mobile (<640px)

**Fallback:** If `VetoResultsUI` is not loaded, the system falls back to the legacy tri-slot reveal.

**Screenshot:**

![Veto Results Top-3 Display](screenshot-placeholder.png)
*Top-3 leaderboard with first place emphasized, auto-dismisses after 5s, closes on FFWD*

## Next Steps

1. **Manual QA Testing**
   - Test human POV usage
   - Test AI POV decision-making
   - Test multiple nominees flow
   - Verify Final 4 bypass

2. **Live Game Validation**
   - Confirm card timings feel right
   - Verify avatar displays correctly
   - Check Social Maneuvers events fire
   - Validate Progression XP awards

3. **Edge Case Testing**
   - Test with 2, 3, 4 nominees
   - Test POV holder is also nominee
   - Test all AI affinity thresholds
   - Verify replacement selection edge cases

## Common Scenarios

| Scenario | Flow |
|----------|------|
| Human POV, 2 nominees, uses veto | Intro → Yes → Select nominee → Decision → Saved → Replacement flow |
| Human POV, 2 nominees, doesn't use | Intro → No → Veto not used → Social |
| AI POV, high affinity nominee | Intro → Auto-yes → Decision → Saved → Replacement flow |
| AI POV, low affinity all | Intro → Auto-no → Veto not used → Social |
| Final 4 | Skip ceremony → Direct eviction |
| POV holder is nominee | Auto-use on self |

## Troubleshooting

### Card not showing avatars
- Check if `buildCardWithAvatars` is available
- Falls back to legacy `showCard()` if not available

### Decision panel not appearing
- Check phase is set to 'veto_ceremony'
- Verify `renderVetoCeremonyPanel()` is called

### Final 4 not bypassing ceremony
- Check `handlePostVetoReveal()` logic
- Verify player count is exactly 4

### AI not auto-deciding
- Check AI timer is set (1200ms)
- Verify `aiVetoDecision()` is being called

## Code Example

```javascript
// Ceremony intro with POV avatar
if(global.buildCardWithAvatars){
  await new Promise(function(resolve){
    var card = global.buildCardWithAvatars({
      title: 'Veto Ceremony',
      lines: ['This is the Veto ceremony. As ' + holderName + ' holds the Power of Veto...'],
      tone: 'veto',
      duration: 2400,
      actorId: g.vetoHolder,
      targetIds: [],
      type: 'vetoCeremonyIntro'
    });
    setTimeout(function(){ /* cleanup */ resolve(); }, 2400);
  });
}

// Yes/No decision panel
var btnYes = document.createElement('button'); 
btnYes.className='btn primary'; 
btnYes.textContent='Yes — Use the Veto';
btnYes.onclick = function(){ 
  if(g.nominees.length > 1){
    showNomineeSelection();
  } else {
    finalizeCeremony({ used: true, savedId: g.nominees[0] }); 
  }
};

// Saved card with arrow
await new Promise(function(resolve){
  var card = global.buildCardWithAvatars({
    title: 'Saved',
    lines: [savedName + ' is saved from the block.'],
    tone: 'veto',
    duration: 3200,
    actorId: g.vetoHolder,
    targetIds: [savedId],
    type: 'vetoSaved'
  });
  setTimeout(function(){ /* cleanup */ resolve(); }, 3200);
});
```

## Contact

For questions or issues, refer to:
- Implementation docs: `VETO_CEREMONY_MODERNIZATION_SUMMARY.md`
- Visual guide: `VETO_CEREMONY_VISUAL_COMPARISON.md`
- Test file: `test_veto_ceremony_modernized.html`
