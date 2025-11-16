# Startup Flow Visual Guide

This document describes the visual experience users will have with the new startup sequence.

## User Experience Timeline

### Phase 1: Initial Page Load (0-100ms)

**What User Sees:**
```
┌─────────────────────────────────────────┐
│                                         │
│                                         │
│              [BLANK PAGE]               │
│                                         │
│         (Main screen hidden)            │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Body has NO `main-screen-built` class
- `.wrap` and `.topbar` are `display: none`
- Core services initializing (bus, settings, BackgroundTheme)
- StartupFlow.init() wiring event handlers

**Duration:** ~100ms

---

### Phase 2A: Kolequant Intro Video (0-30s)
*(If skipIntros=false)*

**What User Sees:**
```
┌─────────────────────────────────────────┐
│  ╔═══════════════════════════════════╗  │
│  ║                                   ║  │
│  ║                                   ║  │
│  ║      [KOLEQUANT INTRO VIDEO]     ║  │
│  ║         Playing Fullscreen       ║  │
│  ║                                   ║  │
│  ║                                   ║  │
│  ╚═══════════════════════════════════╝  │
│                          [Skip ▶]       │
└─────────────────────────────────────────┘
```

**Technical:**
- Video container at z-index: 9999 (covers everything)
- Background preloading in parallel
- Skip button available in top-right

**Duration:** Until video ends or user clicks Skip

---

### Phase 2B: Skip Intros Path
*(If skipIntros=true)*

**What User Sees:**
```
┌─────────────────────────────────────────┐
│                                         │
│         [Brief transition...]           │
│                                         │
│   (No video, quick background load)     │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Video bypassed completely
- Background preload starts immediately
- Faster path to intro hub

**Duration:** 100-200ms

---

### Phase 3: Intro Hub Display

**What User Sees:**
```
┌─────────────────────────────────────────┐
│  ⚙️ 🎵 🔊 ?                       Settings│
│                                         │
│     [Dynamic Background Image]          │
│                                         │
│         ┏━━━━━━━━━━━━━━━┓              │
│         ┃     PLAY      ┃  ← Primary    │
│         ┗━━━━━━━━━━━━━━━┛              │
│         ┌───────────────┐              │
│         │     Rules     │              │
│         ├───────────────┤              │
│         │    Profile    │              │
│         ├───────────────┤              │
│         │  Leaderboard  │              │
│         ├───────────────┤              │
│         │    Credits    │              │
│         └───────────────┘              │
│                                         │
│                          📅 📰          │
│                        Daily News       │
└─────────────────────────────────────────┘
```

**Technical:**
- Background image already loaded (no delayed fade-in)
- All buttons appear simultaneously with background
- Glass-morphism effect on buttons
- Responsive layout (centered column)
- Animations: lift-in for column, stagger for buttons

**Duration:** Until user clicks a button

---

### Phase 4: Gating Checks (First Time Users)

**Scenario A: Rules Not Accepted**
```
┌─────────────────────────────────────────┐
│  [Intro Hub in background, dimmed]      │
│   ┌─────────────────────────────────┐   │
│   │    📋 RULES & GUIDELINES        │   │
│   │                                 │   │
│   │  1. Be strategic...             │   │
│   │  2. Play fair...                │   │
│   │  3. Have fun...                 │   │
│   │                                 │   │
│   │  [Accept Rules]  [Cancel]       │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Scenario B: Profile Incomplete**
```
┌─────────────────────────────────────────┐
│  [Intro Hub in background, dimmed]      │
│   ┌─────────────────────────────────┐   │
│   │    👤 CREATE YOUR PROFILE       │   │
│   │                                 │   │
│   │  Name: [_________________]      │   │
│   │  Avatar: [Select]               │   │
│   │  Bio: [Optional]                │   │
│   │                                 │   │
│   │  [Create Profile]  [Cancel]     │   │
│   └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Technical:**
- Modals overlay intro hub
- User must complete before proceeding
- After completion, returns to intro hub
- Clicking Play again will now pass gating

---

### Phase 5: Main Screen Transition (200-500ms)

**What User Sees:**
```
┌─────────────────────────────────────────┐
│  ⚙️ ▶ 🎵 🔊              [Topbar fades in]│
│─────────────────────────────────────────│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Houseguests               │   │
│  │  ┌───┬───┬───┬───┬───┬───┐     │   │
│  │  │ ? │ ? │ ? │ ? │ ? │ ? │     │   │
│  │  └───┴───┴───┴───┴───┴───┘     │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │  House Network Live     │   │   │
│  │  │  ┌───────────────────┐  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  │  Welcome to the   │  │   │   │
│  │  │  │     season.       │  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  └───────────────────┘  │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Body gains `main-screen-built` class
- `.wrap` transitions from `display: none` to visible
- `.topbar` transitions from `display: none` to visible
- Guest placeholder avatars show briefly
- Opening sequence begins

**Duration:** 200-500ms transition

---

### Phase 6: Cast Animation (3-5s)

**What User Sees:**
```
┌─────────────────────────────────────────┐
│  ⚙️ ▶ 🎵 🔊                               │
│─────────────────────────────────────────│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Houseguests               │   │
│  │  ┌───┬───┬───┬───┬───┬───┐     │   │
│  │  │👤 │👤 │👤 │👤 │👤 │👤 │     │   │
│  │  │Mia│Ben│...│...│...│You│     │   │
│  │  └───┴───┴───┴───┴───┴───┘     │   │
│  │    [Avatars loading one by one] │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │  House Network Live     │   │   │
│  │  │  ┌───────────────────┐  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  │  Meet the cast... │  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  └───────────────────┘  │   │   │
│  │  └─────────────────────────┘   │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

**Technical:**
- Fast cast animation (returning users) OR
- Full intro show sequence (new users)
- Real avatars replace placeholders
- Names animate in
- Week 1 intro card appears

**Duration:** 3-5 seconds

---

### Phase 7: Game Active (Steady State)

**What User Sees:**
```
┌─────────────────────────────────────────┐
│  ⚙️ ▶ 🎵 🔊 📊              Season 1 │Week 1│
│─────────────────────────────────────────│
│                                         │
│  ┌─────────────────────────────────┐   │
│  │       Houseguests               │   │
│  │  ┌───┬───┬───┬───┬───┬───┐     │   │
│  │  │👤 │👤 │👤 │👤 │👤 │👤 │     │   │
│  │  │Mia│Ben│Sam│Lou│Jo │You│     │   │
│  │  └───┴───┴───┴───┴───┴───┘     │   │
│  │                                 │   │
│  │  ┌─────────────────────────┐   │   │
│  │  │  House Network Live     │   │   │
│  │  │  ┌───────────────────┐  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  │  HOH Competition  │  │   │   │
│  │  │  │                   │  │   │   │
│  │  │  └───────────────────┘  │   │   │
│  │  └─────────────────────────┘   │   │
│  │                                 │   │
│  │  [Skip ▶]  [00:35]             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  Diary Room                     │   │
│  │  • Game started                 │   │
│  │  • Week 1 begins                │   │
│  │  • HOH Competition starting...  │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

**Technical:**
- Full game UI visible
- All features active
- Game loop running
- Phase timers active

---

## Comparison: Before vs After

### Before (Buggy)
```
Load → Main Screen Flash! → Video → Intro Hub → Buttons → Background loads → Play → Game
       ^^^^^^^^^^^^^^^^^^^^                     ^^^^^^^^   ^^^^^^^^^^^^^^^^
       Flicker/race                             Wrong      Delayed load
                                                order      causes flicker
```

### After (Fixed)
```
Load → Video → (Background preloads) → Intro Hub (bg + buttons together) → Play → Main Screen → Game
                ^^^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^^^^^^^^^^^^^^^^              ^^^^^^^^^^^^
                Parallel load           No flicker                                Deferred until
                                                                                  Play pressed
```

## Visual Highlights

1. **No Flicker**: Users never see main game elements before they should

2. **Smooth Transitions**: All appearances are intentional and animated

3. **Instant Background**: Intro hub background is preloaded, no delayed fade

4. **Clear Hierarchy**: Video → Intro Hub → Play Gate → Main Screen

5. **Professional Feel**: No jarring flashes or unexpected UI changes

## Mobile Experience

Same flow, but optimized for touch:
- Larger touch targets
- Portrait-optimized layouts
- Safe area insets respected
- Reduced motion support

## Accessibility

- Tab navigation through all buttons
- ARIA labels on all interactive elements
- Screen reader announcements
- Keyboard shortcuts work throughout
- Reduced motion respected

## Performance Notes

- Background preload: <1.5s on normal networks
- Video plays while preload happens (parallel)
- No blocking operations
- Graceful timeouts prevent hangs
- Works offline (cached assets)
