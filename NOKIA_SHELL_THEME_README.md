# Nokia 3310 Image Shell Theme - Snake Minigame

## Overview

The Snake minigame now supports a new theme: **`'nokia-image-shell'`** that renders the game inside a realistic Nokia 3310 phone image. The game canvas is positioned within the phone's LCD screen area, and transparent overlay buttons are positioned over the phone's keypad for touch/mouse controls.

## Usage

### Basic Usage

```javascript
// Use the new Nokia 3310 image shell theme
window.MiniGames.snake.render(container, onComplete, {
  theme: 'nokia-image-shell',
  variant: 'normal'  // or 'portal'
});
```

### Theme Options

The Snake minigame now supports three themes:

1. **`'nokia'`** (default) - Traditional Nokia-style UI with D-pad controls
2. **`'nokia-shell'`** - Enhanced Nokia UI (legacy)
3. **`'nokia-image-shell'`** - NEW: Renders game inside Nokia 3310 phone image

### Complete Example

```javascript
const container = document.getElementById('game-container');

window.MiniGames.snake.render(container, (score) => {
  console.log('Game ended. Score:', score);
}, {
  theme: 'nokia-image-shell',      // Use phone shell theme
  variant: 'normal',                // 'normal' or 'portal'
  debugMode: false,                 // Optional: enable debug mode
  competitionMode: true             // Optional: competition mode
});
```

## Features

### Phone Shell Image
- Nokia 3310 phone shell image (PNG) at `assets/skins/nokia3310-shell.png`
- Includes LCD screen area, D-pad, numeric keypad, and "NOKIA" branding
- Scales responsively while maintaining proportions

### LCD Positioning
- Game canvas is positioned absolutely within the phone's LCD area
- Status line (length and food count) appears in top-left corner of LCD
- Scanline overlay for authentic LCD effect

### Transparent Keypad Overlay
- Four invisible buttons overlaid on the phone's directional buttons:
  - Up arrow button
  - Down arrow button
  - Left arrow button
  - Right arrow button
- Buttons respond to both mouse clicks and touch events
- Haptic feedback on mobile devices (vibration)

### Responsive Scaling
- Uses CSS variables for all positioning:
  - `--phone-width`, `--phone-height`
  - `--lcd-top`, `--lcd-left`, `--lcd-width`, `--lcd-height`
  - `--keypad-top`, `--keypad-btn-size`
- Media queries adjust positioning at breakpoints:
  - Desktop: 300×600px phone
  - Tablet (≤768px): 270×540px phone
  - Mobile (≤480px): 240×480px phone

### Controls (All Work Simultaneously)
1. **Keyboard**: Arrow keys or WASD
2. **Touch Gestures**: Swipe on canvas (mobile)
3. **Keypad Overlay**: Click/tap transparent buttons on phone keypad

## Implementation Details

### File Structure
```
assets/
  skins/
    nokia3310-shell.png          # Phone shell image (PNG, 1.4MB)
js/
  minigames/
    snake.js                      # Updated with theme support
test_snake_nokia_shell.html       # Test/demo page
```

### CSS Classes Added

```css
.snake-phone-shell                /* Phone wrapper with background image */
.snake-keypad-overlay            /* Container for transparent buttons */
.snake-keypad-btn                /* Transparent button base class */
.snake-keypad-btn-up             /* Up button positioning */
.snake-keypad-btn-down           /* Down button positioning */
.snake-keypad-btn-left           /* Left button positioning */
.snake-keypad-btn-right          /* Right button positioning */
```

### Backward Compatibility

✅ **All existing functionality preserved**:
- Traditional `'nokia'` theme still works
- All game logic unchanged
- Scoring system unchanged
- Competition mode unchanged
- Portal mode variant unchanged
- No breaking changes to existing code

## Testing

### Manual Testing
Open `test_snake_nokia_shell.html` in a browser to test:
- Image shell theme with phone visible
- Traditional theme for comparison
- Both normal and portal modes
- All control methods (keyboard, swipe, keypad overlay)

### Automated Testing
```bash
npm run test:all      # Runs all tests including minigame validation
```

All existing tests pass with no regressions.

## Technical Notes

### Image Format
- Uses PNG format for authentic Nokia 3310 appearance
- High-resolution image (1.4MB) ensures quality on all displays
- Realistic phone texture and details preserved
- No external dependencies

### CSS Variables Benefits
- Single source of truth for positioning
- Easy to adjust for different screen sizes
- Clean, maintainable responsive design
- No JavaScript calculations needed

### Performance
- No impact on game logic performance
- CSS-only positioning and scaling
- Transparent overlays use minimal resources
- PNG background renders efficiently

## Future Enhancements

Potential improvements for future iterations:
- Additional phone skins (other Nokia models, Game Boy, etc.)
- Customizable phone colors
- Animated button press effects
- Sound effects for button presses
- Alternative phone orientations

## Credits

Implemented as part of the BBMobile project minigame enhancement initiative.
