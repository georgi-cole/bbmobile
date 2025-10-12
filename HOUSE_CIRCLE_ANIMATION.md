# House Circle Animation

## Overview
The house circle animation is a rotating contestant showcase that appears when returning users press the Start button. It replaces the previous grid-based fast cast animation with a more thematic house-centered presentation.

## Features

### Visual Design
- **House Frame**: Uses a house-themed SVG illustration as the background frame
  - SVG includes a house structure, roof, door, windows, and decorative elements
  - Falls back to loading `/img/studio_bg.jpg` or `/avatars/tvstudio.jpg` if available
  - Styled with a blue/teal color scheme matching the app theme

### Animation Behavior
- **Circular Layout**: All contestant photos are arranged in a perfect circle
- **Smooth Rotation**: The entire circle rotates continuously at 360° over 4.5 seconds
- **Staggered Fade-in**: Each contestant card fades in sequentially (0.08s delay between each)
- **Duration**: Total animation duration is 4.8 seconds
- **Fullscreen Overlay**: Creates a dedicated fullscreen overlay, hiding all other UI elements

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
2. **House circle animation plays** (4.8 seconds)
3. Week 1 intro modal appears
4. Click to dismiss modal
5. HOH competition begins

## Technical Details

### CSS Animations
- `@keyframes rotateCircle`: 360° rotation over 4.5s (linear, infinite)
- `@keyframes fadeInContestant`: Fade and scale from 0.3 to 1.0 over 0.6s

### Positioning
- Uses trigonometric calculations to position contestants in a perfect circle
- Radius: 45% from center
- Automatically adjusts for any number of contestants

### Fallback Handling
- House image: SVG → studio_bg.jpg → tvstudio.jpg → SVG fallback
- Avatar images: player.avatar → getAvatar() → UI.getAvatar() → Dicebear fallback

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
- Smooth 60fps rotation
- Automatic cleanup after completion
- No memory leaks (properly removes DOM elements)
