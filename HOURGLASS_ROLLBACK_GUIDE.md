# Hourglass Timer Rollback Guide

This document provides instructions for quickly reverting to the circular progress bar if needed.

## Quick Rollback Steps

### 1. Remove Hourglass Script

In `index.html`, remove or comment out this line (around line 357):

```html
<!-- NEW: Hourglass Timer (isolated module) -->
<script src="js/hourglass-timer.js"></script>
```

### 2. Restore Progress Bar HTML

In `index.html` (around line 61-64), uncomment the old progress bar:

```html
<!-- PREVIOUS PROGRESS BAR (preserved for rollback) -->
<div class="progressbar"><div id="tvProgressFill" class="progressbar-fill"></div></div>

<!-- Comment out hourglass container -->
<!-- <div id="hourglassContainer" class="hourglass-container"></div> -->
```

### 3. Restore Progress Bar CSS

In `styles.css` (around line 731-735), uncomment the old styles:

```css
/* Timer progress (outside TV) */
.progressbar{ height:10px; background:#112030; border:1px solid #203347; border-radius:8px; overflow:hidden; margin:8px 0 2px; position:relative; }
.progressbar-fill{ height:100%; width:0%; background:linear-gradient(90deg,#4695ff,#71bfff); box-shadow:0 0 8px -2px #4695ff; transition:width .22s linear; }

/* Comment out hourglass styles */
/*
.hourglass-container {
  ...
}
*/
```

### 4. Remove Hourglass Updates in JS

In `js/ui.hud-and-router.js`, remove the hourglass update calls (they're marked with `// NEW:` comments):

- Remove hourglass initialization call (around line 1280)
- Remove hourglass update calls (around lines 1288, 1315, etc.)
- Keep the `// PREVIOUS:` progress bar update lines

The old progress bar updates are still in place and will work immediately once hourglass calls are removed.

## Files Modified

1. `js/hourglass-timer.js` - NEW FILE (can be deleted)
2. `index.html` - Modified (old code preserved in comments)
3. `styles.css` - Modified (old code preserved in comments)
4. `js/ui.hud-and-router.js` - Modified (old code still active)

## Verification

After rollback:
1. Open the app in browser
2. Start a game
3. Check that the horizontal progress bar appears below the timer
4. Verify the bar fills/drains as time progresses

## Notes

- The old progress bar code was never removed, only commented out
- The hourglass module is completely isolated and can be safely deleted
- Both systems can technically coexist if desired (just uncomment both)
