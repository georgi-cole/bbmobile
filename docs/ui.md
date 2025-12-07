# UI Components Documentation

## Overview

This document covers custom UI components and modules for the BBMobile game, including modals, overlays, and enhanced interaction patterns.

## Juror Voting Overlay

### Purpose

The Juror Overlay provides an immersive fullscreen voting experience during the finale jury voting phase. It enhances engagement with visual feedback, animated audience messages, and a quick-vote feature.

### Features

- **Fullscreen Modal**: Covers the entire viewport with a dimmed, blurred background
- **Animated Audience Messages**: SMS-like messages that slide up and fade, simulating live audience reactions
- **Floating Emojis**: Gentle floating emoji animations throughout the background
- **Quick Vote Input**: Allows visual voting by typing a player name
  - Validates against current player list
  - Provides inline error messages for invalid names
  - Shows success feedback with avatar flash and pulse effects
  - Adds custom audience messages when votes are cast
- **Accessibility**: Full keyboard navigation, ARIA attributes, focus trapping
- **Responsive**: Mobile-first design that adapts to all screen sizes
- **Reduced Motion Support**: Respects `prefers-reduced-motion` accessibility preference

### Usage

The overlay is implemented as an ES module in `js/ui/juror-overlay.js`.

#### Basic Usage

```javascript
import { JurorOverlay } from './js/ui/juror-overlay.js';

// Show the overlay
JurorOverlay.show();

// Hide the overlay
JurorOverlay.hide();

// Check if overlay is showing
const isShowing = JurorOverlay.isShowing();

// Cleanup when no longer needed
JurorOverlay.destroy();
```

#### Integration with Existing Jury Voting

The overlay automatically detects and moves existing jury voting UI (element with id `humanJuryVote` in the `#panel` container) into the overlay content area. When the overlay is hidden, the UI is restored to its original location.

This means you can use the overlay without modifying your existing jury voting logic:

```javascript
// In your jury voting flow
function startJuryVoting() {
  // Create your normal jury voting UI in #panel
  renderHumanJuryUI(finalistA, finalistB);
  
  // Show the overlay to wrap it in the enhanced experience
  JurorOverlay.show();
}
```

### Player Data

The overlay attempts to read player data from `window.game.players` for validation. If not available, it falls back to a sample player list. For best results, ensure `window.game.players` is populated with objects containing:

```javascript
{
  id: 1,
  name: 'PlayerName',
  evicted: false,
  avatar: 'url-to-avatar' // optional
}
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

- Mock game data setup
- Buttons to show/hide overlay
- Demonstration of quick-vote validation
- Instructions for manual testing
- Player list display

To test:

1. Open `test_juror_overlay.html` in a browser
2. Click "Add Mock Jury Panel" to create a sample voting UI
3. Click "Show Overlay" to see the fullscreen experience
4. Try the Quick Vote feature with valid names (Alex, Jordan, Taylor, Morgan)
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
