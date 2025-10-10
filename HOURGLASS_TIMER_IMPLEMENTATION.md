# Hourglass Timer Implementation Guide

## Overview
This document describes the hourglass timer implementation that replaces the circular progress bar in the dashboard panel.

## Implementation Details

### Files Changed
1. `index.html` - SVG hourglass component
2. `styles.css` - Hourglass styling and animations
3. `js/ui.hud-and-router.js` - Timer control logic

### Features
- ✅ Animated SVG hourglass with sand flow
- ✅ Top sand empties as time counts down
- ✅ Bottom sand fills as time progresses
- ✅ Flowing sand particle animation at center
- ✅ Maintains timer label and skip button positions
- ✅ Backward compatible with progress bar
- ✅ Easily reversible

## How to Revert to Circular Progress Bar

If you need to switch back to the original circular progress bar:

### Step 1: Update HTML (index.html)
**Find and replace** the hourglass container (lines ~61-92):

```html
<!-- HOURGLASS TIMER (replaces progressbar) - To revert: restore .progressbar div -->
<div class="hourglass-container">
  <!-- ... entire SVG content ... -->
</div>
```

**With** the original progress bar:

```html
<div class="progressbar"><div id="tvProgressFill" class="progressbar-fill"></div></div>
```

### Step 2: Update CSS (styles.css)
**Find and uncomment** the old progress bar styles (lines ~732-737):

```css
/* OLD CIRCULAR BAR (commented out - to restore, uncomment these lines and remove .hourglass-container styles)
.progressbar{ height:10px; background:#112030; border:1px solid #203347; border-radius:8px; overflow:hidden; margin:8px 0 2px; position:relative; }
.progressbar-fill{ height:100%; width:0%; background:linear-gradient(90deg,#4695ff,#71bfff); box-shadow:0 0 8px -2px #4695ff; transition:width .22s linear; }
*/
```

**Remove or comment out** the hourglass styles (lines ~739-767):

```css
/* HOURGLASS TIMER */
.hourglass-container{ ... }
.hourglass-svg{ ... }
/* ... rest of hourglass styles ... */
```

### Step 3: No JavaScript Changes Needed
The JavaScript in `js/ui.hud-and-router.js` already supports both implementations and will automatically work with the progress bar when you switch back.

## Technical Details

### SVG Structure
- **Glass Frame**: Semi-transparent path with gradient for glass effect
- **Sand Clipping**: clipPath ensures sand stays within hourglass shape
- **Top Sand**: Rect element that decreases in height (38px → 0px)
- **Bottom Sand**: Rect element that increases in height (0px → 40px)
- **Flow Animation**: Pulsing circle at center for sand flow effect

### Animation
- Sand height transitions: 0.3s linear
- Flow animation: 1.5s infinite ease-in-out
- Updates every 200ms via JavaScript tick function

### Color Scheme
- Glass: Blue gradient (#4695ff → #71bfff)
- Sand: Golden gradient (#ffdc8b → #ff9f4a)
- Matches existing dashboard theme

## Screenshots
See PR description for visual examples of the hourglass timer in action.

## Commit Reference
- Initial Implementation: commit `69c604c`
- Branch: `copilot/add-hourglass-progress-indicator-2`
