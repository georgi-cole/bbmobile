# Social Popup Migration Guide

## Overview

The SocialDecisionPopup system provides a modern, accessible popup interface for social interactions in the game. It builds on the BasePopup foundation with specialized features for player-to-player decisions.

## Key Features

### 1. SocialDecisionPopup Component
Located in `js/popup/SocialDecisionPopup.js`, this provides:

- **Player avatar display** with automatic fallback to initials
- **Themed CTA buttons** (accept/refuse/neutral) that inherit design tokens
- **Accessibility features**:
  - `role="dialog"` and `aria-modal="true"` (inherited from BasePopup)
  - `aria-labelledby` and `aria-describedby`
  - Focus trap with keyboard navigation
  - ESC key to close
  - Alt text for avatars
  - ARIA labels for initials fallback
- **Visual consistency**: Matches Challenge Announcement visual spec
- **Responsive design**: Buttons adapt to prevent overlap on mobile

### 2. Transitions and Cadence

The system includes smooth entrance/exit transitions:

- **Entrance**: Fade + slide up, 200-250ms, cubic-bezier easing
- **Exit**: Fade + slide down, 180-220ms, cubic-bezier easing
- **Inter-popup delay**: 600-1000ms (default 800ms, configurable)
- **Reduced motion support**: Automatically uses minimal delays/transitions

### 3. PopupManager Integration

Enhanced PopupManager (in `js/popup/PopupManager.js`) now supports:

- **Custom inter-popup delays** per popup or globally
- **Micro-confirmation toasts** for visual feedback
- **Queue management** for sequential display
- **Configurable transitions** via feature flags

### 4. Feature Flag

The system is gated by the `social_cadence_enabled` feature flag:

```javascript
{
  social_cadence_enabled: true,  // Enable new popup system
  social_inter_delay: 800        // Optional: custom delay in ms
}
```

When disabled, the system falls back to legacy card-based social decisions.

## Usage

### Basic Example

```javascript
// Create a social decision popup
const popup = createSocialDecisionPopup({
  player: playerObject,  // or player ID string
  title: 'Alliance Offer',
  bodyText: [
    'Alice wants an alliance with you.',
    'Do you accept?'
  ],
  actions: [
    {
      label: 'Accept',
      theme: 'accept',  // 'accept', 'refuse', or 'neutral'
      onChoose: () => {
        console.log('Alliance accepted!');
        // Handle acceptance logic
      }
    },
    {
      label: 'Decline',
      theme: 'refuse',
      onChoose: () => {
        console.log('Alliance declined');
        // Handle decline logic
      }
    }
  ],
  onClose: () => {
    console.log('Popup closed');
  }
});

// Enqueue with PopupManager for proper sequencing
PopupManager.enqueue(() => popup, { 
  interPopupDelay: 1000  // Optional custom delay
});
```

### Avatar Handling

The system automatically resolves player avatars:

1. Uses `resolveAvatar()` if available (from `js/avatar.js`)
2. Falls back to initials if avatar fails to load
3. Provides proper alt text for accessibility

```javascript
// Avatar is automatically created from player object
createSocialDecisionPopup({
  player: { id: '123', name: 'Alice Johnson' },
  // ... other options
});

// Initials fallback: "AJ"
// Alt text: "Alice Johnson's avatar" (for image)
// or "Alice Johnson's initials: AJ" (for fallback)
```

### Themed Buttons

Buttons automatically apply theme-based colors from design tokens:

- **Accept theme**: Uses `--good` token (green)
- **Refuse theme**: Uses `--bad` token (red)
- **Neutral theme**: Uses `--primary-3` token (blue)

```javascript
actions: [
  { label: 'Accept', theme: 'accept' },   // Green button
  { label: 'Decline', theme: 'refuse' },  // Red button
  { label: 'Maybe', theme: 'neutral' }    // Blue button
]
```

### Micro-Confirmations

Show subtle confirmation feedback after decisions:

```javascript
actions: [
  {
    label: 'Accept',
    theme: 'accept',
    onChoose: () => {
      // Handle logic
      handleAccept();
      
      // Show confirmation toast
      PopupManager.showConfirmationToast('Decision recorded ✓', 1800);
    }
  }
]
```

## Migration Steps

### For Existing Social Decisions

**Before (Legacy):**
```javascript
queueDecision({
  title: 'Alliance Offer',
  lines: ['Alice wants an alliance.', 'Accept?'],
  actions: [
    { label: 'Accept', onChoose: () => { /* logic */ } },
    { label: 'Decline', onChoose: () => { /* logic */ } }
  ]
});
showNextDecision();
```

**After (New System):**
```javascript
// Enable feature flag in config
game.cfg.social_cadence_enabled = true;

// Add targetPlayer to decision
queueDecision({
  title: 'Alliance Offer',
  targetPlayer: alicePlayer,  // Add player object
  lines: ['Alice wants an alliance.', 'Accept?'],
  actions: [
    { label: 'Accept', onChoose: () => { /* logic */ } },
    { label: 'Decline', onChoose: () => { /* logic */ } }
  ]
});

// showNextDecision() automatically uses new system when flag is enabled
showNextDecision();
```

The system automatically:
- Detects the feature flag
- Uses SocialDecisionPopup when enabled
- Falls back to legacy system when disabled
- Maintains all existing functionality

### For Custom Social Popups

If you have custom social interaction popups:

```javascript
// 1. Check feature flag
const cfg = game?.cfg || {};
if (!cfg.social_cadence_enabled) {
  // Use legacy approach
  showCard('Title', ['Line 1'], 'neutral', 3000);
  return;
}

// 2. Create popup
const popup = createSocialDecisionPopup({
  player: targetPlayer,
  title: 'Custom Decision',
  bodyText: 'Description text',
  actions: [
    { label: 'Yes', theme: 'accept', onChoose: handleYes },
    { label: 'No', theme: 'refuse', onChoose: handleNo }
  ]
});

// 3. Enqueue with PopupManager
PopupManager.enqueue(() => popup);
```

## API Reference

### createSocialDecisionPopup(options)

Creates a social decision popup element.

**Parameters:**
- `options.player` (object|string): Player object or ID for avatar
- `options.title` (string): Popup title
- `options.bodyText` (string|Array<string>): Body content
- `options.actions` (Array<Object>): Action buttons
  - `label` (string): Button text
  - `theme` (string): 'accept', 'refuse', or 'neutral'
  - `onChoose` (Function): Click handler
- `options.onClose` (Function): Called when popup closes

**Returns:** HTMLElement (popup element)

### PopupManager.enqueue(fn, options)

Enqueues a popup for display.

**Parameters:**
- `fn` (Function): Function that returns popup element
- `options.interPopupDelay` (number): Custom delay in ms (optional)

### PopupManager.showConfirmationToast(message, duration)

Shows a micro-confirmation toast.

**Parameters:**
- `message` (string): Toast message
- `duration` (number): Display duration in ms (default: 2000)

## Configuration

### Feature Flags

Add to game config:

```javascript
game.cfg = {
  social_cadence_enabled: true,   // Enable new popup system
  social_inter_delay: 800,        // Inter-popup delay (ms)
  popup_refresh_enabled: true     // General popup system
};
```

### CSS Customization

Override tokens in your theme:

```css
:root {
  --popup-inter-delay: 1000ms;         /* Delay between popups */
  --popup-transition-duration: 0.25s;  /* Transition speed */
  --popup-max-width: 720px;            /* Max popup width */
}
```

### Reduced Motion

The system automatically respects `prefers-reduced-motion`:

- Transitions reduced to 50ms
- Inter-popup delay reduced to 100ms
- Toast animations shortened

## Testing

### Manual Testing Checklist

- [ ] Popup displays with correct avatar
- [ ] Avatar fallback shows initials when image fails
- [ ] Buttons display without overlap
- [ ] Button colors match theme (accept=green, refuse=red)
- [ ] Transitions are smooth (fade + slide)
- [ ] Only one popup visible at a time
- [ ] Inter-popup delay works (no instant reappearance)
- [ ] ESC key closes popup
- [ ] Tab key cycles through buttons
- [ ] Focus trap keeps focus inside popup
- [ ] Confirmation toast appears after decision
- [ ] Legacy mode works when flag disabled
- [ ] Reduced motion works (fast transitions)

### Test Code

```javascript
// Test popup with avatar
function testSocialPopup() {
  const player = { id: '1', name: 'Test Player' };
  
  PopupManager.enqueue(() => {
    return createSocialDecisionPopup({
      player: player,
      title: 'Test Decision',
      bodyText: ['This is a test.', 'Choose an option.'],
      actions: [
        { label: 'Accept', theme: 'accept', onChoose: () => {
          PopupManager.showConfirmationToast('Accepted!');
        }},
        { label: 'Decline', theme: 'refuse', onChoose: () => {
          PopupManager.showConfirmationToast('Declined');
        }}
      ]
    });
  });
}

// Test multiple popups in sequence
function testPopupSequence() {
  for(let i = 0; i < 3; i++) {
    testSocialPopup();
  }
}
```

## Accessibility

The system includes comprehensive accessibility features:

### Screen Readers
- Proper ARIA roles and labels
- Alt text for all images
- Status announcements for toasts

### Keyboard Navigation
- Tab to cycle through buttons
- Enter/Space to activate buttons
- ESC to close popup
- Focus trap prevents escaping

### Visual
- High contrast mode support
- Color is not the only indicator (text labels)
- Adequate touch targets (48px min)
- Clear focus indicators

### Motion
- Respects `prefers-reduced-motion`
- No auto-play animations
- User-initiated transitions only

## Troubleshooting

### Popup doesn't appear

1. Check feature flag: `game.cfg.social_cadence_enabled = true`
2. Verify scripts loaded: `typeof createSocialDecisionPopup !== 'undefined'`
3. Check console for errors
4. Ensure PopupManager is available: `typeof PopupManager !== 'undefined'`

### Avatar not showing

1. Verify player object has `id` and `name`
2. Check `resolveAvatar()` is loaded
3. Initials should show as fallback
4. Check console for image load errors

### Buttons overlap

1. Test on mobile viewport
2. CSS should apply `flex-direction: column-reverse` on small screens
3. Check if custom styles are interfering

### Transitions not working

1. Verify CSS file is loaded: `js/popup/SocialDecisionPopup.css`
2. Check if `prefers-reduced-motion` is enabled
3. Verify CSS animations are defined in stylesheet

### Legacy mode not working

1. Set `social_cadence_enabled: false`
2. System should fall back automatically
3. Check for errors in `showNextDecision()`

## Future Enhancements

Potential improvements:

- Multi-step social conversations (wizard pattern)
- Player relationship visualizations in popup
- Sound effects for decisions
- Custom avatar frames/borders
- Animation presets per decision type
- A/B testing for different cadences

## Support

For questions or issues:

- `js/popup/SocialDecisionPopup.js` - Component source
- `js/popup/SocialDecisionPopup.css` - Styling
- `js/popup/PopupManager.js` - Queue manager
- `js/social.js` - Integration code
- `docs/popup-refresh-migration-guide.md` - General popup guide

## Version History

### v1.0 (Current)
- Initial implementation
- Avatar support with fallback
- Themed buttons (accept/refuse/neutral)
- Transitions and cadence (200-250ms in, 180-220ms out, 800ms delay)
- Feature flag gating
- Micro-confirmations
- Full accessibility support
- Documentation complete
