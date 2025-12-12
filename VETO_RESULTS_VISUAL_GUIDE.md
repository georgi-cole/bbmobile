# Veto Results Top-3 Display - Visual Guide

## Overview

The top-3 veto competition results display is a **compact overlay** that appears at the top center of the screen, showing only the top 3 finishers with first place visually emphasized.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃            VETO COMPETITION                              ┃  │ ← 110px from top
│  ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃  │
│  ┃                                                          ┃  │
│  ┃  ┌────────┐  ┌──────────────────┐  ┌────────┐  ┌────┐  ┃  │
│  ┃  │   2    │  │  ┌────────────┐  │  │   1    │  │ 👑 │  ┃  │ ← First place
│  ┃  │        │  │  │ 🧑 64px    │  │  │        │  └────┘  ┃  │   (wider, gold)
│  ┃  │        │  │  └────────────┘  │  │        │          ┃  │
│  ┃  └────────┘  │   Alice          │  └────────┘          ┃  │
│  ┃              │   92.3           │                       ┃  │
│  ┃              └──────────────────┘                       ┃  │
│  ┃                                                          ┃  │
│  ┃  ┌────────┐                        ┌────────┐           ┃  │
│  ┃  │   2    │  ┌────────────┐       │   3    │           ┃  │ ← 2nd & 3rd
│  ┃  │        │  │ 🧑 48px    │       │        │           ┃  │   (normal size)
│  ┃  │        │  └────────────┘       │        │           ┃  │
│  ┃  └────────┘  Bob                  └────────┘           ┃  │
│  ┃              88.9                  Charlie              ┃  │
│  ┃                                    78.0                 ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
│                                                                 │
│                     (Auto-dismisses after 5s)                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                Max-width: 720px, Centered
```

## Desktop Layout (>640px)

### Panel Container
- **Position**: Absolute, centered horizontally (`left: 50%; transform: translateX(-50%)`)
- **Top**: 110px from screen top
- **Width**: 720px (max-width: calc(100% - 48px))
- **Background**: Dark gradient (rgba(20,28,36,0.95) → rgba(10,14,18,0.95))
- **Border-radius**: 12px
- **Shadow**: 0 10px 40px rgba(3,8,12,0.7)
- **Z-index**: 99999 (top layer)

### Header
- **Text**: "Veto Competition"
- **Font-size**: 20px
- **Color**: Gold (#f7d67a)
- **Letter-spacing**: 0.6px
- **Margin-bottom**: 12px

### Results List (Horizontal)
- **Display**: Flex row
- **Gap**: 12px between tiles
- **Justify-content**: center
- **Align-items**: stretch

## Player Tiles

### Standard Tile (2nd & 3rd Place)
```
┌──────────────────────────────┐
│ [1]  [🧑]  Name              │  ← Rank, Avatar, Name/Score
│            Score             │
└──────────────────────────────┘
```

- **Flex**: 1 1 0 (equal width)
- **Display**: Flex row
- **Gap**: 10px
- **Padding**: 12px
- **Background**: rgba(255,255,255,0.03)
- **Border-radius**: 10px
- **Avatar size**: 48px × 48px
- **Avatar border**: 2px solid rgba(255,255,255,0.06)

### First Place Tile (Winner)
```
┌────────────────────────────────────────┐
│ [1]  [🧑 64px]  Name            👑    │  ← Larger, gold background, crown
│               Score                    │
└────────────────────────────────────────┘
```

- **Flex**: 1.6 1 0 (60% wider than others)
- **Padding**: 16px (more padding)
- **Background**: Gold gradient
  - `linear-gradient(90deg, rgba(255,215,120,0.12), rgba(255,195,40,0.06))`
- **Border**: 1px solid rgba(255,195,40,0.18)
- **Box-shadow**: 0 8px 24px rgba(255,180,60,0.06)
- **Avatar size**: 64px × 64px
- **Avatar border**: 3px solid rgba(255,230,150,0.15)
- **Crown badge**: 👑 (20px, positioned right)

### Tile Components

#### Rank Badge
- **Width**: 36px
- **Font-size**: 18px
- **Font-weight**: 700
- **Color**: rgba(255,255,255,0.85)
- **Text-align**: center

#### Avatar
- **Border-radius**: 50% (circular)
- **Object-fit**: cover
- **Display**: block

#### Meta Section (Name + Score)
- **Display**: Flex column
- **Min-width**: 0
- **Flex**: 1 (fill remaining space)

#### Player Name
- **Font-size**: 15px
- **Font-weight**: 700
- **Color**: #fff
- **White-space**: nowrap
- **Overflow**: hidden
- **Text-overflow**: ellipsis

#### Score
- **Font-size**: 13px
- **Color**: rgba(255,255,255,0.75)
- **Margin-top**: 4px

#### Crown Badge (First Place Only)
- **Margin-left**: auto
- **Font-size**: 20px

## Mobile Layout (<640px)

```
┌─────────────────────────────────────┐
│  ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓  │
│  ┃  VETO COMPETITION            ┃  │ ← 80px from top
│  ┃━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┃  │
│  ┃                              ┃  │
│  ┃  ┌─────────────────────────┐ ┃  │ ← Vertical
│  ┃  │ [1] [🧑 56px] Alice  👑 │ ┃  │   stack
│  ┃  │           92.3          │ ┃  │
│  ┃  └─────────────────────────┘ ┃  │
│  ┃                              ┃  │
│  ┃  ┌─────────────────────────┐ ┃  │
│  ┃  │ [2] [🧑 44px] Bob       │ ┃  │
│  ┃  │           88.9          │ ┃  │
│  ┃  └─────────────────────────┘ ┃  │
│  ┃                              ┃  │
│  ┃  ┌─────────────────────────┐ ┃  │
│  ┃  │ [3] [🧑 44px] Charlie   │ ┃  │
│  ┃  │           78.0          │ ┃  │
│  ┃  └─────────────────────────┘ ┃  │
│  ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛  │
└─────────────────────────────────────┘
     width: calc(100% - 32px)
```

### Changes on Mobile
- **Width**: calc(100% - 32px)
- **Top**: 80px (closer to top)
- **Padding**: 12px (reduced)
- **Layout**: Flex column (vertical stack)
- **Gap**: 10px between tiles
- **First place flex**: 1 1 auto (same height as others)
- **Avatar sizes**:
  - Standard: 44px × 44px
  - First place: 56px × 56px

## Animations

### Show Animation (`veto-results-show`)
- **Duration**: 260ms
- **Easing**: ease
- **From**:
  - Opacity: 0
  - Transform: translateX(-50%) translateY(10px) scale(0.995)
- **To**:
  - Opacity: 1
  - Transform: translateX(-50%) translateY(0) scale(1)

### Hide Animation (`veto-results-hide`)
- **Duration**: 300ms
- **Easing**: ease forwards
- **To**:
  - Opacity: 0
  - Transform: translateX(-50%) translateY(-8px) scale(0.995)

### Transition Notes
- Smooth fade-in with slight upward motion on show
- Smooth fade-out with slight downward motion on hide
- Subtle scale change for polish
- Respects `prefers-reduced-motion` setting

## Color Palette

### Panel Colors
- **Background gradient**: rgba(20,28,36,0.95) → rgba(10,14,18,0.95)
- **Shadow**: rgba(3,8,12,0.7)

### First Place Colors
- **Background gradient**: rgba(255,215,120,0.12) → rgba(255,195,40,0.06)
- **Border**: rgba(255,195,40,0.18)
- **Shadow**: rgba(255,180,60,0.06)
- **Avatar border**: rgba(255,230,150,0.15)

### Text Colors
- **Header (gold)**: #f7d67a
- **Name (white)**: #fff
- **Score (light gray)**: rgba(255,255,255,0.75)
- **Rank (light gray)**: rgba(255,255,255,0.85)

### Standard Tile Colors
- **Background**: rgba(255,255,255,0.03)
- **Inset shadow**: rgba(255,255,255,0.02)
- **Avatar border**: rgba(255,255,255,0.06)

## Behavior

### Auto-Dismiss
1. Panel appears with show animation
2. Timer starts: 5000ms (5 seconds)
3. After 5s, panel automatically:
   - Adds `veto-results-hide` class
   - Triggers hide animation
   - Removes from DOM after animation completes (300ms)
4. Timer is stored in `panel.__vetoAutoDismissTimer`
5. Timer is cleared if panel is manually closed

### FFWD Dismissal
1. User clicks FFWD button OR custom event fires
2. Panel immediately:
   - Adds `veto-results-hide` class
   - Triggers hide animation
   - Clears auto-dismiss timer
   - Removes event listeners (`__ffwdCleanup`)
   - Removes from DOM after animation completes (300ms)

### Cleanup Process
1. Clear auto-dismiss timer
2. Remove FFWD button click listeners
3. Remove custom event listeners (`fastForwardPressed`, `ffwdPressed`)
4. Remove DOM element
5. Reset cleanup function

## Accessibility

### ARIA Attributes
- **Panel**: `role="region"`, `aria-label="Veto competition results"`
- **Tiles**: `role="group"`, `aria-label="{rank}. {name} — {score}"`
- **Crown badge**: `aria-hidden="true"` (decorative)

### Keyboard Navigation
- Panel itself is not keyboard-focusable (auto-dismisses)
- FFWD button remains keyboard accessible

### Screen Reader Behavior
- Announces panel when it appears
- Reads tile information: "1. Alice — 92.3"
- Crown badge hidden from screen readers (purely decorative)

## Comparison to Old Implementation

### Before (Full Leaderboard)
- ❌ Showed ALL participants
- ❌ Fullscreen overlay (`inset: 0`)
- ❌ No auto-dismiss
- ❌ No FFWD close
- ❌ Required manual close or click
- ❌ Shimmer animation on winner

### After (Top-3 Compact)
- ✅ Shows only top 3
- ✅ Compact overlay at top (110px)
- ✅ Auto-dismisses after 5s
- ✅ FFWD button closes immediately
- ✅ FFWD custom events supported
- ✅ First place emphasized (gold + crown)
- ✅ Cleaner, more subtle design
- ✅ Better mobile experience

## Integration Example

```javascript
// Competition finishes, scores calculated
const scoresObj = {
  1: 75.2,
  2: 88.9,
  3: 92.5,
  4: 81.0,
  5: 70.3
};

const participantIds = [1, 2, 3, 4, 5];

// Render top-3 results
window.VetoResultsUI.renderVetoCompResults(scoresObj, participantIds, {
  maxResults: 3,        // Top 3 only
  autoDismissMs: 5000   // Auto-dismiss after 5s
});

// Result: Shows Charlie (1st, 92.5), Bob (2nd, 88.9), Diana (3rd, 81.0)
// Panel auto-dismisses after 5s
// User can press FFWD to close immediately
```

## Testing Scenarios

### Scenario 1: Top-3 Display
- **Input**: 5 players with scores
- **Expected**: Only top 3 shown
- **Verify**: Charlie (92.5) is 1st with gold + crown

### Scenario 2: Auto-Dismiss
- **Input**: Display results
- **Expected**: Panel disappears after exactly 5s
- **Verify**: Timer cleanup successful

### Scenario 3: FFWD Close
- **Input**: Display results, click FFWD
- **Expected**: Immediate dismissal
- **Verify**: Event listeners removed

### Scenario 4: Large Group
- **Input**: 10 players
- **Expected**: Only top 3 shown
- **Verify**: Tile count = 3

### Scenario 5: Mobile Responsive
- **Input**: Resize to <640px
- **Expected**: Vertical layout
- **Verify**: Avatar sizes adjust

## Performance Notes

- **Lightweight**: Minimal DOM elements (4-5 total)
- **Fast render**: No complex computations
- **Clean cleanup**: All timers and listeners removed
- **Smooth animations**: GPU-accelerated transforms
- **No memory leaks**: Proper event cleanup

## Browser Compatibility

- ✅ Modern browsers (Chrome, Firefox, Safari, Edge)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)
- ✅ Supports ES5+ JavaScript
- ✅ CSS3 required for animations
- ✅ Fallback for older browsers (no animations)
