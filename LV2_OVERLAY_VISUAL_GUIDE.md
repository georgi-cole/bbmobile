# LV2 Eviction Overlay - Visual Layout Guide

## Desktop/Laptop Layout (1280px+)

```
┌────────────────────────────────────────────────────────────┐
│  #tv (Faux TV Container - position: relative)             │
│                                                            │
│  ┌─ Timer/Controls ─────────────────────────────────────┐ │
│  │  [⏱ 00:45] [▶ Play] [Settings]                        │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌─ .voteOverlay (Grid Container) ────────────────────────┐│
│  │  display: grid                                         ││
│  │  place-content: center  ← Centers everything together ││
│  │  padding-top: 28-60px   ← Leaves room for timer       ││
│  │                                                         ││
│  │        ┌─ .votePanel (Flex Column) ─────────┐         ││
│  │        │  display: flex                      │         ││
│  │        │  flex-direction: column             │         ││
│  │        │  align-items: center                │         ││
│  │        │  gap: clamp(12px, 2.5vh, 20px)      │         ││
│  │        │  width: min(92%, 420px)             │         ││
│  │        │                                      │         ││
│  │        │  ┌──────────────────────────────┐   │         ││
│  │        │  │  .voteTitle (or .lv2-header) │   │         ││
│  │        │  │       "Live Vote"            │   │         ││
│  │        │  └──────────────────────────────┘   │         ││
│  │        │              ↕ gap                   │         ││
│  │        │  ┌──────────────────────────────┐   │         ││
│  │        │  │  .lv2-grid (avatars)         │   │         ││
│  │        │  │                              │   │         ││
│  │        │  │   ┌────┐         ┌────┐     │   │         ││
│  │        │  │   │    │         │    │     │   │         ││
│  │        │  │   │ 👤 │         │ 👤 │     │   │         ││
│  │        │  │   │    │         │    │     │   │         ││
│  │        │  │   └────┘         └────┘     │   │         ││
│  │        │  │   Alice            Bob       │   │         ││
│  │        │  │ [  Alice  ]   [  Bob   ]    │   │         ││
│  │        │  │  ↑ .lv2-name-btn             │   │         ││
│  │        │  │  (becomes evict button when  │   │         ││
│  │        │  │   selected)                  │   │         ││
│  │        │  └──────────────────────────────┘   │         ││
│  │        │              ↕ gap                   │         ││
│  │        │  ┌──────────────────────────────┐   │         ││
│  │        │  │  .voteHint (.lv2-instructions)│  │         ││
│  │        │  │  "Tap on the photo of the    │   │         ││
│  │        │  │   person you want to evict." │   │         ││
│  │        │  └──────────────────────────────┘   │         ││
│  │        │              ↕ gap                   │         ││
│  │        │  ┌──────────────────────────────┐   │         ││
│  │        │  │  Voter Feed                  │   │         ││
│  │        │  │  (vote chips appear here)    │   │         ││
│  │        │  └──────────────────────────────┘   │         ││
│  │        │                                      │         ││
│  │        └──────────────────────────────────────┘         ││
│  │                                                         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                            │
└────────────────────────────────────────────────────────────┘
```

## Mobile Layout (375px - iPhone SE)

```
┌──────────────────────────────┐
│  #tv (Faux TV Container)     │
│                              │
│  ┌─ Timer ─────────────────┐ │
│  │ [⏱ 00:45]               │ │
│  └──────────────────────────┘ │
│  ↑                            │
│  │ padding-top: 36-72px      │
│  │ (increased on mobile)     │
│                              │
│  ┌─ .voteOverlay ───────────┐│
│  │                          ││
│  │   ┌─ .votePanel ──────┐ ││
│  │   │                   │ ││
│  │   │ ┌───────────────┐ │ ││
│  │   │ │  "Live Vote"  │ │ ││
│  │   │ └───────────────┘ │ ││
│  │   │        ↕          │ ││
│  │   │ ┌───────────────┐ │ ││
│  │   │ │               │ │ ││
│  │   │ │     ┌────┐    │ │ ││
│  │   │ │     │    │    │ │ ││
│  │   │ │     │ 👤 │    │ │ ││
│  │   │ │     │    │    │ │ ││
│  │   │ │     └────┘    │ │ ││
│  │   │ │     Alice     │ │ ││
│  │   │ │  [ Evict Alice ]││
│  │   │ │  ← Selected!  │ │ ││
│  │   │ │               │ │ ││
│  │   │ │  ◀   1 of 2  ▶│ │ ││
│  │   │ │  ●   ○        │ │ ││
│  │   │ └───────────────┘ │ ││
│  │   │        ↕          │ ││
│  │   │ ┌───────────────┐ │ ││
│  │   │ │ "Tap again to │ │ ││
│  │   │ │  confirm."    │ │ ││
│  │   │ └───────────────┘ │ ││
│  │   │                   │ ││
│  │   └───────────────────┘ ││
│  │                          ││
│  └──────────────────────────┘│
│                              │
│  ↓ padding-bottom: 20-40px   │
│                              │
└──────────────────────────────┘
```

## CSS Grid Centering Explained

### Before (❌ place-items: center)

```
.voteOverlay {
  display: grid;
  place-items: center;  ← Centers EACH child individually
}

Result:
┌─────────────────────────────────┐
│                                 │
│         Child 1 (centered)      │  ← Each child centered independently
│                                 │
│         Child 2 (centered)      │  ← Creates vertical gaps
│                                 │
│         Child 3 (centered)      │  ← Not grouped together!
│                                 │
└─────────────────────────────────┘
```

### After (✅ place-content: center)

```
.voteOverlay {
  display: grid;
  place-content: center;  ← Centers ALL children as a GROUP
  grid-auto-rows: max-content;  ← Rows shrink to fit content
}

Result:
┌─────────────────────────────────┐
│                                 │
│                                 │
│      ┌─────────────────┐        │
│      │ Child 1         │        │  ← All children
│      │ Child 2         │        │     grouped together
│      │ Child 3         │        │     and centered as one unit
│      └─────────────────┘        │
│                                 │
│                                 │
└─────────────────────────────────┘
```

## Button States

### Initial State (Unselected)

```
┌──────────────────┐
│      Alice       │  ← .lv2-name-btn
└──────────────────┘
    Normal button
    Click to select
```

### Selected State (Inline Evict)

```
┌──────────────────┐
│  Evict Alice     │  ← .lv2-name-btn.lv2-name-btn-selected
└──────────────────┘
   Red gradient bg
   Click to confirm eviction
```

### Tie-Break State

```
┌──────────────────┐
│   Break Tie      │  ← .lv2-name-btn-selected (tie-break)
└──────────────────┘
   Special wording
   Click to break tie
```

### Final 4 State

```
┌──────────────────┐
│ Cast Sole Vote   │  ← .lv2-name-btn-selected (final4)
└──────────────────┘
   Special wording
   Click to cast sole vote
```

## Responsive Breakpoints

### Desktop/Laptop (1280px+)

- Side-by-side avatars (Alice | Bob)
- Generous spacing (20px gaps)
- Larger avatars (up to 160px)
- Standard padding (28-60px top)

### Tablet (768px - 1279px)

- Side-by-side avatars (slightly smaller)
- Medium spacing (16px gaps)
- Medium avatars (120-140px)
- Standard padding (28-60px top)

### Mobile Portrait (375px - 767px)

- Carousel mode (one avatar at a time)
- Arrows for navigation (◀ Bob ▶)
- Tighter spacing (12-16px gaps)
- Smaller avatars (80-120px)
- Increased top padding (36-72px) for timer

### Small Mobile (320px - 374px)

- Carousel mode (one avatar at a time)
- Minimum spacing (10px gaps)
- Smallest avatars (80-100px)
- Maximum top padding (72px) for timer
- Content may be tight but functional

## Vertical Anchoring - DO NOT USE ❌

These CSS properties/values break the centering:

```css
/* ❌ BAD - Pushes content to top */
.votePanel {
  top: 0;
  margin-bottom: auto;
}

/* ❌ BAD - Pushes content to bottom */
.votePanel {
  bottom: 0;
  margin-top: auto;
}

/* ❌ BAD - Pushes content to bottom */
.votePanel {
  justify-content: flex-end;
}

/* ❌ BAD - Arbitrary vertical positioning */
.votePanel {
  transform: translateY(-50px);
}
```

## Correct Centering - USE THESE ✅

```css
/* ✅ GOOD - Proper Grid centering on overlay */
.voteOverlay {
  display: grid !important;
  place-content: center !important;
  grid-auto-rows: max-content !important;
  justify-items: center !important;
  align-content: center !important;
}

/* ✅ GOOD - Proper Flex centering on panel */
.votePanel {
  display: flex !important;
  flex-direction: column !important;
  align-items: center !important;
  justify-content: center !important;  /* OK for flex children spacing */
  gap: clamp(12px, 2.5vh, 20px) !important;
  /* Remove any anchoring */
  top: unset !important;
  bottom: unset !important;
  transform: none !important;
  margin: 0 auto !important;
}
```

## Z-Index Layering

```
┌─────────────────────────────────────┐
│  #tv (z-index: 1)                   │
│                                     │
│  ┌─ Timer/Controls (z-index: 100) ─┐│
│  │  Always on top                  ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ .voteOverlay (z-index: 5) ─────┐│
│  │                                 ││
│  │  ┌─ .votePanel ─────────────┐  ││
│  │  │                          │  ││
│  │  │  ┌─ .evictBtn ─────────┐ │  ││
│  │  │  │ (z-index: 50)       │ │  ││
│  │  │  └─────────────────────┘ │  ││
│  │  │                          │  ││
│  │  └──────────────────────────┘  ││
│  │                                 ││
│  └─────────────────────────────────┘│
│                                     │
│  ┌─ Backdrop (z-index: 0) ─────────┐│
│  │  Behind everything              ││
│  └─────────────────────────────────┘│
│                                     │
└─────────────────────────────────────┘
```

## Safe Area Padding

```
Mobile viewport with notch/safe-area:

┌────────────────────────────┐
│  ┌───────────────────────┐ │ ← Top safe area
│  │ [Notch area]          │ │
│  └───────────────────────┘ │
│  ↑                         │
│  │ padding-top: clamp(36px, 8vh, 72px)
│  │                         │
│  ┌─ .voteOverlay ─────────┐│
│  │                        ││
│  │  Content centered here ││
│  │                        ││
│  └────────────────────────┘│
│  ↓                         │
│  │ padding-bottom: clamp(20px, 4vh, 40px)
│  │                         │
│  ┌───────────────────────┐ │ ← Bottom safe area
│  │ [Home indicator]      │ │
│  └───────────────────────┘ │
└────────────────────────────┘
```

## Animation Sequence

```
1. Initial render:
   ┌────────────┐
   │            │
   │  [Empty]   │  ← Overlay created
   │            │
   └────────────┘

2. Panel fade in:
   ┌────────────┐
   │            │
   │  ┌──────┐  │  ← Panel appears
   │  │ Vote │  │     (opacity: 0 → 1)
   │  └──────┘  │
   │            │
   └────────────┘

3. Content renders:
   ┌────────────┐
   │            │
   │  ┌──────┐  │
   │  │ Vote │  │  ← Elements populate
   │  │  👤  │  │     in order
   │  │Alice │  │
   │  └──────┘  │
   │            │
   └────────────┘

4. User interaction:
   ┌────────────┐
   │            │
   │  ┌──────┐  │
   │  │ Vote │  │
   │  │  👤  │  │  ← Click avatar
   │  │[Evict]│  │     Button transforms
   │  └──────┘  │
   │            │
   └────────────┘
```

## Edge Cases Handled

### Very Tall Content
```
If content exceeds viewport:

┌────────────┐
│ [Timer]    │ ← Always visible
│            │
│  ┌──────┐  │ ← Scrollable
│  │ Vote │  │   (overflow-y: auto)
│  │  👤  │  │
│  │Alice │  │
│  │  👤  │  │
│  │ Bob  │  │
│  │[Evict]│  │
│  └─║║║║─┘  │ ← Scroll indicator
│            │
└────────────┘
```

### Very Wide Viewport
```
Ultra-wide displays (2560px+):

┌──────────────────────────────────────┐
│                                      │
│                                      │
│              ┌──────┐                │ ← Content constrained
│              │ Vote │                │   (max-width: 520px)
│              │  👤  │                │   Still centered
│              └──────┘                │
│                                      │
│                                      │
└──────────────────────────────────────┘
```

### Very Narrow Viewport
```
Small phones (320px):

┌──────────┐
│ [Timer]  │ ← Compact
│          │
│  ┌────┐  │ ← Minimum viable
│  │Vote│  │   width maintained
│  │ 👤 │  │   (min: 92% of 320px)
│  │[OK]│  │
│  └────┘  │
│          │
└──────────┘
```

---

**Visual Guide Version:** 1.0
**Last Updated:** 2024-12-19
**Related:** LV2_OVERLAY_FIX_IMPLEMENTATION.md
