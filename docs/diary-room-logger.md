# Diary Room Logger & UI System

## Overview

The Diary Room Logger & UI system enhances the game's diary room experience by automatically generating humanized, context-aware diary room entries from game events and providing visual alerts for dramatic moments.

## Features

### 1. Automated DR Entry Generation
- Listens to game bus events and creates natural language DR entries
- Supports social actions, jury events, and bond shifts
- Uses varied templates for organic, non-repetitive entries
- Resolves player names with "You" pronoun for human player

### 2. Severity Tagging
- **Dramatic** - Major game-changing events (backstabs, jury returns, etc.)
- **High** - Important events (large bond shifts, jury challenges)
- **Neutral** - Standard gameplay events
- **Private** - Personal reflections (reserved for future use)

### 3. Visual Alerts
- DR button blinks when dramatic or high severity events occur
- Different animation styles for dramatic (red pulse) vs high (orange pulse)
- Stops blinking when user acknowledges by opening DR

## Architecture

### Modules

#### 1. `js/dr/diaryTemplates.js`
Template system for generating DR entries.

**Exports:**
- `DiaryTemplates.pick(arr)` - Pick random item from array
- `DiaryTemplates.render(template, data)` - Render template with data
- `DiaryTemplates.deltaStr(delta)` - Format bond delta as string
- `DiaryTemplates.resolveName(playerId)` - Get player name or "You"
- `DiaryTemplates.getSocialTemplate(actionType)` - Get social action template
- `DiaryTemplates.getSocialSummaryTemplate()` - Get summary template
- `DiaryTemplates.getJuryTemplate(eventType)` - Get jury event template

**Template Categories:**
- Social actions: compliment, flirt, gossip, bribe, lie, insult, backstab, strategize, comfort, interrogate
- Social summaries: Phase completion messages
- Jury events: enter, testimonial, meeting, challenge, exit, return, finalDiscussion

#### 2. `js/dr/diaryRoomLogger.js`
Event listener and logger that creates DR entries.

**Initialization:**
```javascript
DiaryRoomLogger.init({
  events: {
    // Optional: Override default event names
    socialAction: 'social.action:result',
    juryEnter: 'jury.member:enter',
    // ... etc
  }
});
```

**Listens to Events:**
- `social.action:result` - Social actions between players
- `social.phase:end` - Social phase completion
- `bond.shift` - Relationship changes
- `jury.member:enter` - Player enters jury
- `jury.interaction` - Jury interactions
- `jury.challenge:result` - Jury return challenge
- `jury.member:exit` - Player leaves jury
- `jury.member:return` - Player returns from jury
- `jury.final:discussion` - Final jury deliberation

**Emits Events:**
- `dr:entry` - New DR entry created (all severities)
- `dr:alert` - High/dramatic entry alert (triggers button blink)

**Exposed Handlers (for testing):**
- `handleSocialAction(payload)`
- `handleSocialPhaseEnd(payload)`
- `handleBondShift(payload)`
- `handleJuryEnter(payload)`
- `handleJuryInteraction(payload)`
- `handleJuryChallenge(payload)`
- `handleJuryExit(payload)`
- `handleJuryReturn(payload)`
- `handleJuryFinalDiscussion(payload)`

#### 3. `js/dr/diaryUI.js`
UI controller for visual alerts.

**Initialization:**
```javascript
DiaryUI.init({
  buttonSelector: '#btnDiaryRoom',  // CSS selector for DR button
  createFallback: true               // Create floating button if not found
});
```

**Listens to Events:**
- `dr:alert` - Start blinking button
- `dr:focus:ack` - Stop blinking (entry acknowledged)
- `dr:closed` - Stop blinking (modal closed)

**Emits Events:**
- `dr:open` - DR button clicked
- `dr:focus` - Open DR and focus specific entry

**API:**
- `DiaryUI.startBlinking(severity)` - Manually start blinking
- `DiaryUI.stopBlinking()` - Manually stop blinking
- `DiaryUI.isBlinking()` - Check if currently blinking
- `DiaryUI.getCurrentAlert()` - Get current alert entry

#### 4. `css/dr/diary.css`
Styles for DR alerts and animations.

**CSS Classes:**
- `.dr-blink` - Base blinking animation
- `.dr-blink[data-severity="dramatic"]` - Red dramatic pulse
- `.dr-blink[data-severity="high"]` - Orange high priority pulse
- `.dr-fallback-button` - Floating fallback button
- `.dr-entry[data-severity="*"]` - Entry severity indicators

**Features:**
- Smooth pulse animations
- Accessibility: Respects `prefers-reduced-motion`
- Dark mode support
- Focus indicators for keyboard navigation

## Event Payload Specifications

### Social Action Result
```javascript
{
  actor: 'player1',           // Actor player ID
  target: 'player2',          // Target player ID
  actionType: 'compliment',   // Action type
  bondDelta: 0.05,           // Optional: Bond change
  severity: 'neutral'         // Optional: Override severity
}
```

### Social Phase End
```javascript
{
  actor: 'player1',           // Player ID
  actionCount: 3              // Number of actions taken
}
```

### Bond Shift
```javascript
{
  player1: 'player1',         // First player ID
  player2: 'player2',         // Second player ID
  delta: 0.15                 // Bond delta (-1 to 1)
}
```

### Jury Events
```javascript
// Enter/Exit/Return
{
  playerId: 'player3'         // Player entering/leaving jury
}

// Challenge Result
{
  winner: 'player4',          // Winner player ID
  winnerId: 'player4'         // Alternate key
}

// Interaction
{
  type: 'testimonial',        // Event type
  playerId: 'player3'         // Optional: Player involved
}

// Final Discussion
{}  // No payload required
```

## Usage

### Basic Setup (Already Done in Bootstrap)

The system is automatically initialized in `js/bootstrap.js`:

```javascript
function initDiaryRoomSystem() {
  // Wait for modules to load
  DiaryRoomLogger.init();
  DiaryUI.init({ buttonSelector: '#btnDiaryRoom' });
  
  // Wire up focus handler
  window.game.bus.on('dr:focus', function(payload) {
    // Handle focus request
    window.game.bus.emit('dr:focus:ack', { entryId: payload.entry.id });
  });
}
```

### Emitting Events from Game Code

To trigger DR entries from your game code, emit events on the game bus:

```javascript
// Social action
window.game.bus.emit('social.action:result', {
  actor: currentPlayer.id,
  target: otherPlayer.id,
  actionType: 'compliment',
  bondDelta: 0.05
});

// Jury member enters
window.game.bus.emit('jury.member:enter', {
  playerId: evictedPlayer.id
});

// Bond shift
window.game.bus.emit('bond.shift', {
  player1: player1.id,
  player2: player2.id,
  delta: 0.12
});
```

### Custom Event Names

If your game uses different event names, you can configure them:

```javascript
DiaryRoomLogger.init({
  events: {
    socialAction: 'custom:social:action',
    juryEnter: 'custom:jury:enter'
    // ... other custom event names
  }
});
```

### Manual Entry Creation

For testing or special cases, you can manually trigger handlers:

```javascript
// Manually create a social action entry
DiaryRoomLogger.handleSocialAction({
  actor: 'player1',
  target: 'player2',
  actionType: 'strategize'
});

// Manually trigger blinking
DiaryUI.startBlinking('dramatic');

// Stop blinking
DiaryUI.stopBlinking();
```

## Testing

### Integration Test

Open `test_dr_logger_ui.html` in a browser to test the system:

1. **Test Social Actions**: Click buttons to trigger social events
2. **Test Jury Events**: Click buttons to trigger jury events
3. **Test Bond Shifts**: Click buttons to trigger relationship changes
4. **Verify Blinking**: Watch the DR button for visual alerts
5. **Test Acknowledgment**: Click the DR button to stop blinking

### Unit Testing

Test individual handlers in isolation:

```javascript
// Test social action handler
DiaryRoomLogger.handleSocialAction({
  actor: 'player1',
  target: 'player2',
  actionType: 'backstab',
  severity: 'dramatic',
  bondDelta: -0.2
});

// Test jury challenge handler
DiaryRoomLogger.handleJuryChallenge({
  winner: 'player3'
});
```

## Customization

### Adding New Templates

Edit `js/dr/diaryTemplates.js` to add new templates:

```javascript
const SOCIAL_TEMPLATES = {
  // ... existing templates
  myNewAction: [
    '{actor} did something cool with {target}.',
    '{actor} performed a new action on {target}.'
  ]
};
```

### Custom Severity Logic

Modify `determineSeverity()` in `js/dr/diaryRoomLogger.js`:

```javascript
function determineSeverity(payload) {
  // Your custom logic
  if (payload.isSpecial) return 'dramatic';
  return 'neutral';
}
```

### Custom Button Selector

If your DR button has a different ID:

```javascript
DiaryUI.init({
  buttonSelector: '#myCustomDRButton'
});
```

### Disable Fallback Button

If you don't want a fallback button created:

```javascript
DiaryUI.init({
  buttonSelector: '#btnDiaryRoom',
  createFallback: false
});
```

## Troubleshooting

### DR Entries Not Appearing

1. Check that `DiaryRoomLogger` is initialized
2. Verify game bus is available (`window.game.bus` or `window.bbGameBus`)
3. Check console for error messages
4. Verify event names match your configuration

### Button Not Blinking

1. Check that `DiaryUI` is initialized
2. Verify button element exists with correct selector
3. Check that events have `dramatic` or `high` severity
4. Verify CSS file is loaded (`css/dr/diary.css`)

### Name Resolution Issues

1. Ensure `window.game.me` or `window.game.meId` is set
2. Verify `window.game.players` array is populated
3. Check that `window.safeName()` function exists

## Future Enhancements

Potential additions to the system:

1. **Private Entries**: Personal reflections that only the human player sees
2. **Entry Filtering**: Filter DR entries by category or severity
3. **Entry Search**: Search through DR entries
4. **Export Functionality**: Export DR log as text or JSON
5. **Custom Animations**: Additional alert animation styles
6. **Sound Effects**: Audio alerts for dramatic events
7. **Timeline View**: Visual timeline of game events
8. **AI Commentary**: AI-generated strategic insights

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ features required
- CSS animations with fallbacks
- Respects `prefers-reduced-motion` for accessibility

## Performance Considerations

- Minimal DOM manipulation (only on alerts)
- Efficient event listeners (registered once)
- Template rendering is lightweight
- Animations use CSS transforms (GPU-accelerated)
- No memory leaks (proper cleanup on unmount)

## License

Part of the BBMobile game codebase. See main project license.
