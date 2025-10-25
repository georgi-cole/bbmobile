# Veto Ceremony TV Experience - Testing Guide

## Overview
This guide covers testing the modernized veto ceremony that renders all UI inside the faux TV with unified decision prompts, visible badge transfer animations, and mobile-safe containment.

## Quick Test
Open `test_veto_ceremony_tv.html` in a browser for a checklist of all test scenarios.

## Test Scenarios

### 1. Standard POV - Human Player - Used
**Setup:**
- Human player wins POV
- At least 2 nominees on the block

**Steps:**
1. Advance to veto ceremony phase
2. Verify intro card appears in TV: "[Name] will decide whether to use the Power of Veto."
3. Verify decision prompt appears in TV: "Use Power of Veto?"
4. Click "Yes — Use Power of Veto"
5. Select a nominee to save from the in-TV panel
6. Verify "Veto Decision" card with POV holder avatar
7. Verify "Saved" card with saved player avatar
8. Verify "Replacement Required" card with HOH avatar
9. HOH selects replacement nominee
10. Verify badge transfer animation: NOM pill moves from saved to replacement
11. Verify "Replacement Nominee" card with replacement avatar
12. Verify adjourn card with POV holder avatar
13. Verify ceremony proceeds to live vote

**Expected:**
- ✓ All cards render inside TV (no overflow)
- ✓ No legacy panel appears below TV
- ✓ Badge transfer shows NOM moving visibly
- ✓ State updates after animation completes
- ✓ Avatars appear on all action cards

### 2. Standard POV - Human Player - Not Used
**Steps:**
1. Advance to veto ceremony phase
2. Verify decision prompt appears
3. Click "No — Keep Nominations"
4. Verify "Veto Not Used" card with POV holder avatar
5. Verify nominee reaction cards appear (one per nominee)
6. Verify adjourn card with POV holder avatar

**Expected:**
- ✓ All cards in TV
- ✓ No badge transfer occurs
- ✓ Nominees stay nominated

### 3. Golden POV - Human Player - Used
**Setup:**
- Set `game.cfg.goldenPOVChance = 100` to guarantee Golden POV

**Steps:**
1. Start veto ceremony
2. Verify twist alert: "The Golden Power of Veto is in play..."
3. Verify decision prompt: "Use Golden POV?"
4. Click "Yes — Use Golden POV"
5. Select nominee to save
6. Verify "Replacement Required" card shows **POV holder** avatar (not HOH)
7. **POV holder** (not HOH) selects replacement
8. Verify badge transfer animation
9. Verify ceremony completes

**Expected:**
- ✓ Label says "Golden POV"
- ✓ POV holder chooses replacement (not HOH)
- ✓ Replacement Required card shows POV avatar

### 4. Diamond POV - Human Player - Used
**Setup:**
- Set `game.cfg.diamondPOVChance = 100` to guarantee Diamond POV

**Steps:**
1. Start veto ceremony
2. Verify twist alert: "The Diamond Power of Veto is in play..."
3. Verify decision prompt: "Use Diamond POV?"
4. Click "Yes — Use Diamond POV"
5. POV holder selects **2 replacement nominees**
6. Verify both old nominees are replaced
7. Verify badge transfer shows transition for multiple nominees
8. Verify ceremony completes

**Expected:**
- ✓ Label says "Diamond POV"
- ✓ POV holder replaces both nominees
- ✓ No save step (goes straight to replacement selection)

### 5. Mobile Layout (375px)
**Setup:**
- Resize browser to 375px width (or use mobile device)

**Steps:**
1. Start veto ceremony
2. Verify decision prompt fits within TV
3. Verify buttons wrap properly
4. Verify no horizontal overflow
5. Verify internal scroll works if card is tall
6. Test all POV types (Standard, Golden, Diamond)

**Expected:**
- ✓ No cards overflow TV bounds
- ✓ Buttons are readable (font-size reduces on small screens)
- ✓ Internal scroll appears if needed
- ✓ Text doesn't get cut off

### 6. Reduced Motion
**Setup:**
- Enable `prefers-reduced-motion` in browser DevTools or OS settings
  - Chrome: DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce
  - macOS: System Settings → Accessibility → Display → Reduce motion

**Steps:**
1. Use POV to save a nominee
2. Verify badge transfer card appears
3. Verify animation is skipped (no pill movement)
4. Verify state still commits correctly
5. Verify replacement nominee receives NOM badge

**Expected:**
- ✓ No animation plays
- ✓ State updates immediately
- ✓ Badges update correctly
- ✓ Ceremony completes normally

### 7. AI POV Holder
**Setup:**
- AI player wins POV

**Steps:**
1. Start veto ceremony
2. Verify ceremony proceeds automatically
3. Verify all cards appear in TV
4. Verify AI makes decision without hanging
5. Verify ceremony completes

**Expected:**
- ✓ AI makes decision after brief delay (~1.2s)
- ✓ All visual steps appear
- ✓ Ceremony completes without user interaction

### 8. Final 4 Veto
**Setup:**
- Only 4 players alive

**Steps:**
1. Use POV to save a nominee
2. Verify Final 4 message: "As the veto holder, you are the sole vote to evict."
3. Verify nominees are automatically set to remaining 2 players
4. Verify ceremony proceeds to live vote
5. Verify only POV holder votes

**Expected:**
- ✓ Final 4 bypass logic intact
- ✓ No replacement selection needed
- ✓ Special message appears

## Verification Checklist

### Visual/UI
- [ ] All cards render inside #tvOverlay
- [ ] No cards overflow below TV
- [ ] No cards overflow horizontally on mobile
- [ ] Typography is consistent (0.86rem body, 0.95rem titles)
- [ ] Avatars appear on all action cards
- [ ] Badge transfer animation is clear and visible
- [ ] NOM pill starts on left (saved), ends on right (replacement)

### Functional
- [ ] "Use POV?" decision works for Standard, Golden, Diamond
- [ ] Correct label appears (Power of Veto, Golden POV, Diamond POV)
- [ ] Legacy below-TV panel never appears
- [ ] Badge transfer commits state AFTER animation
- [ ] Reduced motion disables animation but commits state
- [ ] Golden POV: POV holder chooses replacement
- [ ] Diamond POV: POV holder replaces both nominees
- [ ] Final 4 bypass works correctly

### Hooks/Integration
- [ ] onPOVUsed fires when POV is used
- [ ] onVetoUsedOnSelf fires when POV saves self
- [ ] onVetoUsedOnOther fires when POV saves other
- [ ] onSavedByVeto fires for saved player
- [ ] Social Maneuvers records veto events
- [ ] Progression system records XP
- [ ] Badge states sync correctly

## Browser Testing
Test in multiple browsers and screen sizes:
- Chrome/Edge (desktop + mobile DevTools)
- Firefox (desktop + mobile DevTools)
- Safari (desktop + iOS)
- Actual mobile devices (if available)

## Config Overrides for Testing
Add to game config to test specific scenarios:

```javascript
game.cfg = {
  // Guarantee Golden POV
  goldenPOVChance: 100,
  
  // Guarantee Diamond POV
  diamondPOVChance: 100,
  
  // Shorter decision timer for faster testing
  tVetoDec: 10,
  
  // Shorter ceremony intro for faster testing
  tVeto: 5
};
```

## Known Edge Cases
1. **No eligible replacements:** If all alive players are HOH, POV holder, or nominees, ceremony shows error and skips replacement
2. **Single nominee:** Save step is skipped, goes directly to using POV on that nominee
3. **Skip button:** Token skip should still work during ceremony

## Troubleshooting
- **Legacy panel appears:** Check that `__disableLegacyVetoUI` flag is set in startVetoCeremony
- **Cards overflow TV:** Check max-width (520px) and max-height (78%) in styles.css
- **Animation doesn't play:** Check browser support for Web Animations API; reduced-motion may be enabled
- **State doesn't update:** Verify commitBadgeTransferState is called after animation completes
- **Avatars missing:** Check that resolveAvatar function exists and returns valid URLs

## Success Criteria
All scenarios pass with:
✓ All UI contained in TV
✓ No legacy panel appears
✓ Typography matches other ceremonies
✓ Badge transfer animation is clear
✓ State commits after animation
✓ Mobile layout works (no overflow)
✓ Reduced motion respected
✓ Hooks fire correctly
✓ Final 4 logic preserved
