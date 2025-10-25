# Veto Ceremony TV Experience - Testing Guide

## Overview
This guide covers testing the modernized veto ceremony that renders all UI inside the faux TV with unified decision prompts, clear risk→safe→new-risk animation sequence, nomination validation, multi-eviction gating, and mobile-safe containment.

## Quick Test
Open `test_veto_ceremony_tv.html` in a browser for a checklist of all test scenarios.

## New Features
1. **Risk-Swap Animation**: Clear "risk → safe → new risk" sequence with GSAP timeline (CSS fallback)
2. **Multi-Eviction Gating**: Golden/Diamond POV suspended during double/triple eviction weeks
3. **Nomination Validation**: Prevents unchanged nominee pair (at most one can remain same)
4. **Unified Decision**: Single in-TV prompt for all POV types with short copy
5. **Comprehensive Hooks**: onPOVUsed, onVetoUsedOnSelf/Other, onSavedByVeto

## Test Scenarios

### 1. Standard POV - Human Player - Used
**Setup:**
- Human player wins POV
- At least 2 nominees on the block

**Steps:**
1. Advance to veto ceremony phase
2. Verify intro card appears in TV: "[Name] will decide whether to use the Power of Veto."
3. Verify decision prompt appears in TV: "Use Power of Veto?"
4. Verify short copy: "Using it removes a nominee. A replacement must be named."
5. Click "Yes — Use Power of Veto"
6. Select a nominee to save from the in-TV panel
7. Verify "Veto Decision" card with POV holder avatar
8. Verify "Saved" card with saved player avatar
9. Verify "Replacement Required" card with HOH avatar
10. HOH selects replacement nominee
11. Verify risk-swap animation:
    - Stage 1: Both nominees shown as "at risk" with red pulse
    - Stage 2: Saved nominee transitions to "safe" with green calm
    - Stage 3: New replacement animates in as "at risk" with NOM badge
12. Verify "Replacement Nominee" card with replacement avatar
13. Verify adjourn card with POV holder avatar
14. Verify ceremony proceeds to live vote

**Expected:**
- ✓ All cards render inside TV (no overflow)
- ✓ No legacy panel appears below TV
- ✓ Risk-swap shows three clear stages
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
- ✓ No risk-swap animation occurs
- ✓ Nominees stay nominated

### 3. Golden POV - Human Player - Used
**Setup:**
- Set `game.cfg.goldenPOVChance = 100` to guarantee Golden POV
- Ensure NOT in double/triple eviction week

**Steps:**
1. Start veto ceremony
2. Verify twist alert: "The Golden Power of Veto is in play..."
3. Verify decision prompt: "Use Golden POV?"
4. Verify short copy appears correctly
5. Click "Yes — Use Golden POV"
6. Select nominee to save
7. Verify "Replacement Required" card shows **POV holder** avatar (not HOH)
8. **POV holder** (not HOH) selects replacement
9. Verify risk-swap animation
10. Verify ceremony completes

**Expected:**
- ✓ Label says "Golden POV"
- ✓ POV holder chooses replacement (not HOH)
- ✓ Replacement Required card shows POV avatar

### 4. Diamond POV - Human Player - Used
**Setup:**
- Set `game.cfg.diamondPOVChance = 100` to guarantee Diamond POV
- Ensure NOT in double/triple eviction week

**Steps:**
1. Start veto ceremony
2. Verify twist alert: "The Diamond Power of Veto is in play..."
3. Verify decision prompt: "Use Diamond POV?"
4. Click "Yes — Use Diamond POV"
5. POV holder selects **2 replacement nominees**
6. Verify both old nominees are replaced
7. Verify risk-swap shows transition for multiple nominees
8. Verify ceremony completes

**Expected:**
- ✓ Label says "Diamond POV"
- ✓ POV holder replaces both nominees
- ✓ No save step (goes straight to replacement selection)

### 5. Multi-Eviction Week Gating
**Setup:**
- Set `game.cfg.goldenPOVChance = 100` or `diamondPOVChance = 100`
- Enable double or triple eviction: `game.__twistMode = 'double'` or `'triple'`

**Steps:**
1. Start veto ceremony
2. Verify info card: "Special POV twist suspended for multi-eviction week."
3. Verify ceremony uses Standard POV flow (not Golden/Diamond)
4. Verify decision prompt says "Use Power of Veto?" (not "Golden POV" or "Diamond POV")
5. Verify ceremony completes normally with Standard POV rules

**Expected:**
- ✓ Special POV twists are suspended
- ✓ Info card clearly explains suspension
- ✓ Standard POV flow is used

### 6. Same-Pair Nomination Validation
**Setup:**
- Human player as HOH or POV holder (for Golden POV)
- At least 3 alive players

**Steps:**
1. Start veto ceremony with human POV holder
2. Use veto to save one nominee (e.g., Player A)
3. As HOH (or POV holder if Golden), attempt to select the SAME player as replacement
4. Verify error card appears: "Invalid Replacement"
5. Verify message: "Final nominees cannot be the exact same pair. Please choose a different replacement."
6. Verify replacement chooser re-opens automatically
7. Select a different replacement nominee
8. Verify ceremony continues normally

**Expected:**
- ✓ Same pair is blocked
- ✓ Error card appears in TV
- ✓ Replacement chooser re-opens
- ✓ Ceremony completes after valid selection

### 7. Mobile Layout (375px)
**Setup:**
- Resize browser to 375px width (or use mobile device)

**Steps:**
1. Start veto ceremony
2. Verify decision prompt fits within TV
3. Verify short copy is readable (max 2 lines)
4. Verify buttons wrap properly
5. Verify no horizontal overflow
6. Verify internal scroll works if card is tall
7. Test all POV types (Standard, Golden, Diamond)

**Expected:**
- ✓ No cards overflow TV bounds
- ✓ Buttons are readable (font-size reduces on small screens)
- ✓ Internal scroll appears if needed
- ✓ Text doesn't get cut off

### 8. Reduced Motion
**Setup:**
- Enable `prefers-reduced-motion` in browser DevTools or OS settings
  - Chrome: DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce
  - macOS: System Settings → Accessibility → Display → Reduce motion

**Steps:**
1. Use POV to save a nominee
2. Verify risk-swap card appears
3. Verify animations are skipped (no stage transitions)
4. Verify final state is shown immediately
5. Verify state still commits correctly
6. Verify replacement nominee receives NOM badge

**Expected:**
- ✓ No animations play
- ✓ State updates immediately
- ✓ Badges update correctly
- ✓ Ceremony completes normally

### 9. GSAP vs CSS Fallback
**Setup:**
- Test with and without GSAP loaded

**Steps:**
1. Test with GSAP loaded: Verify smooth timeline animation with stage transitions
2. Block window.gsap (or test without GSAP): Verify CSS fallback works
3. Compare both: Both should show same visual stages, just different animation method

**Expected:**
- ✓ GSAP timeline creates smooth transitions
- ✓ CSS fallback works when GSAP unavailable
- ✓ Both respect reduced-motion

### 10. AI POV Holder
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

### 11. Final 4 Veto
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
- [ ] Risk-swap animation shows three clear stages
- [ ] Stage 1: Both at risk (red pulse)
- [ ] Stage 2: Saved becomes safe (green calm)
- [ ] Stage 3: New replacement at risk (NOM + red pulse)

### Functional
- [ ] "Use POV?" decision works for Standard, Golden, Diamond
- [ ] Correct label appears (Power of Veto, Golden POV, Diamond POV)
- [ ] Short copy: "Using it removes a nominee. A replacement must be named."
- [ ] Legacy below-TV panel never appears
- [ ] Risk-swap commits state AFTER animation
- [ ] Reduced motion disables animation but commits state
- [ ] Golden POV: POV holder chooses replacement
- [ ] Diamond POV: POV holder replaces both nominees
- [ ] Multi-eviction gating: Special POV suspended with info card
- [ ] Nomination validation: Same pair blocked with error + re-prompt
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

// Test multi-eviction gating
game.__twistMode = 'double'; // or 'triple'
```

## Known Edge Cases
1. **No eligible replacements:** If all alive players are HOH, POV holder, or nominees, ceremony shows error and skips replacement
2. **Single nominee:** Save step is skipped, goes directly to using POV on that nominee
3. **Skip button:** Token skip should still work during ceremony
4. **Same pair validation:** Prevents exact same pair, but allows one to remain

## Troubleshooting
- **Legacy panel appears:** Check that `__disableLegacyVetoUI` flag is set in startVetoCeremony
- **Cards overflow TV:** Check max-width (520px) and max-height (78%) in styles.css
- **Animation doesn't play:** Check browser support for Web Animations API; reduced-motion may be enabled; GSAP may be missing (CSS fallback should work)
- **State doesn't update:** Verify commitBadgeTransferState is called after animation completes
- **Avatars missing:** Check that resolveAvatar function exists and returns valid URLs
- **Multi-eviction gating fails:** Verify game.__twistMode is set to 'double' or 'triple'
- **Validation not working:** Check that original nominees are captured before replacement starts

## Success Criteria
All scenarios pass with:
✓ All UI contained in TV
✓ No legacy panel appears
✓ Typography matches other ceremonies
✓ Risk-swap animation is clear (3 stages)
✓ State commits after animation
✓ Multi-eviction gating works
✓ Nomination validation prevents same pair
✓ Mobile layout works (no overflow)
✓ Reduced motion respected
✓ GSAP and CSS fallback both work
✓ Hooks fire correctly
✓ Final 4 logic preserved
