# UI Components Documentation

## Overview

This document covers custom UI components and modules for the BBMobile game, including modals, overlays, and enhanced interaction patterns.

## Juror Return Overlay (America's Vote)

### Purpose

The Juror Return Overlay provides an immersive fullscreen experience for the America's Vote twist (Juror Return). It displays eliminated players with live vote percentages and enhances public engagement with visual feedback, animated public reaction messages, and a quick-vote feature.

### Features

- **Fullscreen Modal**: Covers the entire viewport with a dimmed, blurred background
- **Juror Display**: Shows 4-6 eliminated players (random or from `window.game.juryHouse`) with vote percentages below their photos
- **Animated Public Reactions**: SMS-like messages that slide up and fade, simulating live public reactions to the vote
- **Floating Emojis**: Gentle floating emoji animations throughout the background
- **Quick Vote Input**: Allows visual voting by typing an eliminated player's name
  - Validates against current juror list (from `window.game.juryHouse`)
  - Provides inline error messages for invalid names
  - Shows success feedback with avatar flash and pulse effects
  - Adds custom public reaction messages when votes are cast
- **Accessibility**: Full keyboard navigation, ARIA attributes, focus trapping
- **Responsive**: Mobile-first design that adapts to all screen sizes
- **Reduced Motion Support**: Respects `prefers-reduced-motion` accessibility preference

### Usage

The overlay is implemented as an ES module in `js/ui/juror-overlay.js`.

#### Basic Usage

```javascript
import { JurorReturnOverlay } from './js/ui/juror-overlay.js';

// Show the overlay
JurorReturnOverlay.show();

// Hide the overlay
JurorReturnOverlay.hide();

// Check if overlay is showing
const isShowing = JurorReturnOverlay.isShowing();

// Cleanup when no longer needed
JurorReturnOverlay.destroy();
```

#### Integration with America's Vote Panel

The overlay automatically detects and moves the existing America's Vote panel (from `js/jury_return_vote.js`) into the overlay content area. When the overlay is hidden, the UI is restored to its original location.

This means you can use the overlay without modifying your existing America's Vote logic:

```javascript
// In js/jury_return_vote.js - showReturnVotePanel function
function showReturnVotePanel(jurors, voteSecs, onDone) {
  const panel = document.getElementById('panel');
  // ... create panel content ...
  panel.appendChild(container);
  
  // Show the overlay to wrap it in the enhanced experience
  if (window.JurorReturnOverlay) {
    window.JurorReturnOverlay.show();
  }
}
```

### Juror Data

The overlay attempts to read juror data from `window.game.juryHouse` (array of player IDs) for validation. It looks up player details from `window.game.cast` or uses `window.getP(id)`. If not available, it falls back to a sample juror list. For best results, ensure:

```javascript
window.game = {
  juryHouse: [1, 2, 3, 4], // Array of eliminated player IDs
  cast: [
    {
      id: 1,
      name: 'PlayerName',
      evicted: true,
      avatar: 'url-to-avatar' // optional
    },
    // ... more players
  ]
};

// Also helpful to have these helper functions:
window.getP = (id) => window.game.cast.find(p => p.id === id);
window.safeName = (id) => window.getP(id)?.name || `Player ${id}`;
```

### Quick Vote Behavior

**Important**: Quick votes are **visual-only** and do not affect actual game vote tallies. They trigger:

1. Name validation against the player list
2. Error message if name doesn't match any player
3. Success message if name is valid
4. Avatar flash animation on the player's portrait (if visible in the overlay)
5. Pulse effect near the avatar
6. Custom audience message announcing the vote

This is purely for user engagement and doesn't call any vote submission APIs.

### Keyboard Accessibility

- **Tab / Shift+Tab**: Navigate between interactive elements
- **Escape**: Close the overlay
- **Enter**: Submit quick vote form (when input is focused)
- Focus is trapped within the overlay while open
- Focus returns to the previously focused element when closed

### CSS Customization

The overlay styles are in `css/juror-overlay.css`. Key CSS classes:

- `.juror-overlay`: Main overlay container
- `.juror-overlay__header`: Title and subtitle section
- `.juror-overlay__content`: Container for existing jury UI
- `.juror-overlay__quick-vote`: Quick vote form section
- `.juror-overlay__audience-messages`: Background message layer
- `.audience-message`: Individual SMS-like message bubble
- `.floating-emoji`: Individual floating emoji element

### Testing

A comprehensive test page is available at `test_juror_overlay.html`. It includes:

- Mock America's Vote data setup (4 eliminated players)
- Buttons to show/hide overlay
- Demonstration of quick-vote validation
- Instructions for manual testing
- Juror list display with vote percentages

To test:

1. Open `test_juror_overlay.html` in a browser
2. Click "Add Mock Jury Panel" to create a sample America's Vote UI
3. Click "Show Overlay" to see the fullscreen experience
4. Try the Quick Vote feature with valid names (Juror 1, Juror 2, Juror 3, Juror 4)
5. Try invalid names to see error messages
6. Test keyboard navigation (Tab, Escape)
7. Test on mobile viewport (resize browser or use device emulation)

### Browser Compatibility

- Modern browsers with ES6 module support
- CSS backdrop-filter support (gracefully degrades)
- Tested on Chrome, Firefox, Safari, Edge
- Mobile Safari and Chrome mobile

### Performance Considerations

- Messages and emojis are periodically created and removed to prevent memory leaks
- Animations are paused when overlay is hidden
- Reduced motion preference is respected
- All intervals are cleared on hide/destroy

### File References

- **CSS**: `css/juror-overlay.css`
- **JavaScript**: `js/ui/juror-overlay.js`
- **Test Page**: `test_juror_overlay.html`
- **Documentation**: `docs/ui.md` (this file)

### Future Enhancements

Potential improvements for future iterations:

- Integration with real-time voting statistics
- Customizable message templates
- Emoji reaction system
- Multi-language support
- Vote history display
- Social sharing integration

---

## Other UI Components

(Documentation for other UI components can be added here as they are developed)

### Modal System

Coming soon...

### Toast Notifications

Coming soon...

### Loading Overlays

Coming soon...
