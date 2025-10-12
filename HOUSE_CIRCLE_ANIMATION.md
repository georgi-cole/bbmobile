# Fast Cast Animation

## Overview
The fast cast animation is a contestant showcase that appears when returning users press the Start button. It displays all contestant photos simultaneously with a pulse-in effect, then fades out after 3 seconds.

## Features

### Visual Design
- **House Frame**: Uses a house-themed SVG illustration as the background frame
  - SVG includes a house structure, roof, door, windows, and decorative elements
  - Falls back to loading `/img/studio_bg.jpg` or `/avatars/tvstudio.jpg` if available
  - Styled with a blue/teal color scheme matching the app theme

### Animation Behavior
- **Circular Layout**: All contestant photos are arranged in a perfect circle
- **Pulse-In Effect**: All photos appear simultaneously with a pulse effect (scale from 0.5 to 1.1 to 1.0 over 0.6s)
- **Fade-Out Effect**: After 2.5 seconds, photos shrink and fade out (scale to 0.3, opacity to 0 over 0.5s)
- **Duration**: Total animation duration is 3 seconds
- **Fullscreen Overlay**: Creates a dedicated fullscreen overlay, hiding all other UI elements
- **Real Avatars**: Uses centralized avatar resolver to load actual contestant photos from `/avatars/` folder

### Contestant Cards
- Circular avatar frames with themed borders
- Contestant names displayed below each avatar
- Responsive sizing using CSS clamp for different screen sizes
- Dark semi-transparent background for name labels

## Implementation

### File
`js/fast-cast-animation.js`

### API
The animation is exposed via the `FastCastAnimation` global object:

```javascript
// Play the animation
window.FastCastAnimation.play(players, onComplete);

// Check if animation is active
window.FastCastAnimation.isActive();

// Stop the animation immediately
window.FastCastAnimation.stop();
```

### Parameters
- `players` (Array): Array of player objects with `name` and optional `avatar` properties
- `onComplete` (Function): Callback executed when animation completes

## User Flow

### New Users
1. Click Start button
2. See full onboarding flow (intro video, profile setup, season intro cards)
3. Game begins

### Returning Users
1. Click Start button
2. **Fast cast animation plays** (3 seconds)
3. Week 1 intro modal appears
4. Click to dismiss modal
5. HOH competition begins

## Technical Details

### CSS Animations
- `@keyframes pulseInContestant`: Pulse-in effect - scale from 0.5 to 1.1 to 1.0 with fade over 0.6s
- `@keyframes fadeOutContestant`: Fade-out effect - scale from 1.0 to 0.3 with fade over 0.5s

### Positioning
- Uses trigonometric calculations to position contestants in a perfect circle
- Radius: 45% from center
- Automatically adjusts for any number of contestants

### Fallback Handling
- House image: SVG → studio_bg.jpg → tvstudio.jpg → SVG fallback
- Avatar images: Uses centralized `global.resolveAvatar()` → `global.getAvatarFallback()` → Dicebear fallback
  - Loads from `/avatars/{Name}.png` (e.g., Aria.png, Ash.png, etc.)
  - Falls back to placeholder only if avatar file not found

## Asset Requirements

### Optional Assets
- `/img/studio_bg.jpg` - House/studio background image (with fallback to SVG)
- `/avatars/tvstudio.jpg` - Alternative house/studio background

If neither image is available, the system automatically uses a styled SVG house illustration.

## Browser Compatibility
- Modern browsers with CSS animations support
- Requires JavaScript enabled
- Responsive design works on mobile and desktop

## Performance
- Lightweight: No external dependencies
- Smooth 60fps animations
- Automatic cleanup after completion
- No memory leaks (properly removes DOM elements)
- Fast load time (3 seconds total)

## Testing
A test page is available at `test_fast_cast_animation.html` to verify:
- Avatar loading from `/avatars/` folder
- Pulse-in animation behavior
- Fade-out animation timing
- Different player counts (5, 12, 16 players)
