# Veto Ceremony Modernization - Visual Summary

## Before vs After

### Before (Legacy)
- Decision panel appeared **below** the TV in #panel
- Mix of in-TV and below-TV UI
- Inconsistent typography
- No badge transfer animation
- Nominee state changed before visual feedback
- No unified decision for POV types

### After (Modern)
- **All UI inside the faux TV** (#tvOverlay)
- Consistent typography (0.86rem body, 0.95rem titles)
- Clear badge transfer animation (NOM pill moves visibly)
- State commits **after** animation completes
- Unified "Use POV?" prompt for all types

## Ceremony Flow

### Standard POV - Used
```
1. Intro Card (in-TV)
   "VETO CEREMONY"
   "[Name] will decide whether to use the Power of Veto."
   [POV holder avatar]

2. Decision Prompt (in-TV)
   "Use Power of Veto?"
   "[Name] holds the Power of Veto."
   [Yes — Use Power of Veto] [No — Keep Nominations]

3. Save Selection (in-TV)
   "Save Which Nominee?"
   [Nominee tile 1] [Nominee tile 2]

4. Veto Decision Card (in-TV)
   "VETO DECISION"
   "I have decided to use the Power of Veto on..."
   [POV holder avatar]

5. Saved Card (in-TV)
   "SAVED"
   "[Name] is saved from the block."
   [Saved player avatar]

6. Replacement Required (in-TV)
   "REPLACEMENT REQUIRED"
   "The HOH must now select a replacement nominee."
   [HOH avatar]

7. HOH Replacement Choice (in-TV)
   [Eligible player tiles with avatars]

8. HOH Announcement (in-TV)
   "HOH ANNOUNCEMENT"
   "HOH: I name [Name] as the replacement nominee."
   [HOH avatar] → [Replacement avatar]

9. Badge Transfer Animation (in-TV)
   "BADGE TRANSFER"
   [Saved player with NOM] → [Replacement without NOM]
   (NOM pill animates from left to right)
   (State commits AFTER animation completes)

10. Replacement Card (in-TV)
    "REPLACEMENT NOMINEE"
    "[Name] is now on the block."
    [Replacement avatar]

11. Adjourn (in-TV)
    "VETO CEREMONY"
    "This veto ceremony is adjourned."
    [POV holder avatar]
```

### Standard POV - Not Used
```
1. Intro Card
2. Decision Prompt
3. Not Used Card (in-TV)
   "VETO NOT USED"
   "I have decided not to use the Power of Veto."
   [POV holder avatar]

4. Nominee Reactions (in-TV, sequential)
   For each nominee:
   "[Nominee name]"
   "I'll campaign hard this week."
   [Nominee avatar]

5. Adjourn
```

### Golden POV - Used
```
1-2. Same as Standard
3. Save Selection
4-5. Veto Decision + Saved cards
6. Replacement Required (in-TV)
   "The POV holder must now select a replacement nominee."
   [POV holder avatar] ← Note: POV avatar, not HOH

7. POV Replacement Choice (in-TV)
   [Eligible player tiles]

8. POV Announcement (in-TV)
   "POV HOLDER ANNOUNCEMENT"
   "POV Holder: I name [Name] as the replacement nominee."
   [POV avatar] → [Replacement avatar]

9-11. Badge Transfer + Replacement + Adjourn
```

### Diamond POV - Used
```
1. Intro Card
2. Decision Prompt
   "Use Diamond POV?"
   "[Name] holds the Diamond POV."

3. Multi-Select Panel (in-TV)
   "Select two replacement nominees"
   [Eligible player grid - multi-select]

4. POV Announcement (in-TV)
   "POV HOLDER ANNOUNCEMENT"
   "POV Holder nominates [Name1] and [Name2] for eviction."
   [POV avatar] → [Replacement 1, Replacement 2]

5. Badge Transfer (multi)
   Shows old nominees → new nominees
   Multiple badge transitions

6. Replacement Cards (sequential)
   For each new nominee:
   "NOMINATED"
   "[Name] is on the block."
   [Nominee avatar]

7. Adjourn
```

## UI Components

### TV Card Structure (All Scenarios)
```
#tvOverlay
  .tvDim (backdrop blur)
  .tvOverlayContent
    .revealCard.diaryRoomCard.tvCardBody
      h3 (0.95rem)
      [avatar row if applicable]
      p (0.86rem)
      [buttons or grid]
```

### Badge Transfer Animation Detail
```
Left Tile                  Right Tile
┌─────────────┐           ┌─────────────┐
│  [Avatar]   │           │  [Avatar]   │
│   Saved     │    →      │ Replacement │
│             │           │             │
│ [NOM pill]  │ ─────→    │  (no badge) │
└─────────────┘           └─────────────┘
     ↓                         ↓
     ↓ (Pill animates 1400ms) ↓
     ↓                         ↓
┌─────────────┐           ┌─────────────┐
│  [Avatar]   │           │  [Avatar]   │
│   Saved     │           │ Replacement │
│ (no badge)  │           │ [NOM pill]  │
│             │           │             │
└─────────────┘           └─────────────┘

(State commits AFTER pill arrives at right tile)
```

## Typography Comparison

### Before
- Mixed font sizes, some oversized (1.2rem+)
- Inconsistent with nomination ceremony
- Hard to read on mobile

### After
- Body: 0.86rem
- Titles: 0.95rem
- Big text: 0.92rem
- Matches nomination ceremony exactly
- Mobile-optimized (<400px: 0.8rem buttons)

## Mobile Layout

### 375px Width Behavior
```
┌─────────────────────────┐
│       Faux TV           │
│  ┌─────────────────┐   │
│  │ Decision Prompt │   │ ← Card fits inside TV
│  │                 │   │
│  │ [Button 1]      │   │ ← Buttons wrap
│  │ [Button 2]      │   │
│  │                 │   │
│  └─────────────────┘   │
│                         │
└─────────────────────────┘

No overflow below TV ✓
No horizontal scroll ✓
Internal scroll if tall ✓
```

## Accessibility

### Keyboard Navigation
- All buttons focusable
- Tab order logical
- Enter/Space activate buttons

### Reduced Motion
- `prefers-reduced-motion: reduce` detected
- Badge transfer skips animation
- State still commits correctly
- Visual feedback remains clear

### Screen Readers
- Aria labels on buttons
- Alt text on avatars
- Clear heading hierarchy

## Code Architecture

### Key Functions
```javascript
// Decision
renderPOVUseDecision(povId) → Promise<boolean>
  ├─ getVetoTypeLabel() → "Power of Veto" | "Golden POV" | "Diamond POV"
  └─ showTVDecision({title, message, buttons})

// Badge Transfer
renderBadgeTransfer(savedId, replacementId) → Promise
  ├─ Shows side-by-side cards
  ├─ Animates NOM pill (Web Animations API)
  ├─ Respects prefers-reduced-motion
  └─ commitBadgeTransferState() AFTER animation

// State Management
commitBadgeTransferState(savedId, replacementId)
  ├─ Updates savedPlayer.nominationState = 'none'
  ├─ Updates replacement.nominationState = 'nominated'
  └─ Calls syncPlayerBadgeStates()

// Legacy Prevention
hideLegacyPOVPanels()
  ├─ Sets __disableLegacyVetoUI = true
  └─ Clears #panel if veto-related
```

### Flags & Guards
- `g.__useTVCeremonyUI` - Prevents legacy panel rendering
- `g.__disableLegacyVetoUI` - Global flag to disable legacy UI
- `g.__vetoCeremonyResolved` - Prevents duplicate ceremony execution
- `g.__replacementApplied` - Guards against duplicate replacement

## Testing Coverage

### Automated
- All existing tests pass (minigames, runtime, social, e2e)
- No security vulnerabilities (CodeQL: 0 alerts)

### Manual
- 8 detailed test scenarios
- Standard/Golden/Diamond POV
- Human/AI players
- Used/Not used paths
- Mobile (375px)
- Reduced motion
- Final 4 bypass

## Performance

### Animation Performance
- Uses Web Animations API (hardware-accelerated)
- Respects reduced-motion preference
- No layout thrashing
- Single reflow at end

### Load Impact
- No new dependencies
- ~200 lines net addition
- Removed legacy code paths
- CSS additions minimal

## Browser Support

### Tested
- Chrome/Edge (desktop + mobile)
- Firefox (desktop + mobile)
- Safari (desktop + iOS)

### Requirements
- Web Animations API (widely supported)
- CSS Grid (100% support)
- Flexbox (100% support)
- matchMedia (for prefers-reduced-motion)

## Backwards Compatibility

### Preserved
- All progression hooks (onPOVUsed, etc.)
- Final 4 bypass logic
- Self-eviction handling
- Social Maneuvers integration
- XP system integration
- Twist system (Golden/Diamond POV)

### Removed
- Legacy below-TV decision panel
- Old renderVetoCeremonyPanel interactive mode
- Premature state commits

## Success Metrics

✅ All UI inside TV (no overflow)
✅ Typography consistent with nominations
✅ Badge transfer visually clear
✅ State integrity (commits after animation)
✅ Mobile safe (375px tested)
✅ Reduced motion supported
✅ No security vulnerabilities
✅ All tests passing
✅ Zero breaking changes
✅ Hooks preserved
✅ Documentation complete
