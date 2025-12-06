# Diary Room Logger - Quick Reference

## Initialization

```javascript
// Automatic (done in bootstrap.js)
DiaryRoomLogger.init();
DiaryUI.init({ buttonSelector: '#btnDiaryRoom' });
```

## Event Emission

### Social Actions
```javascript
window.game.bus.emit('social.action:result', {
  actor: 'player1',
  target: 'player2',
  actionType: 'compliment',  // or: flirt, gossip, bribe, lie, insult, backstab, strategize, comfort, interrogate
  bondDelta: 0.05,           // optional
  severity: 'neutral'        // optional: neutral, high, dramatic
});
```

### Jury Events
```javascript
// Enter jury
window.game.bus.emit('jury.member:enter', { playerId: 'player3' });

// Challenge winner
window.game.bus.emit('jury.challenge:result', { winner: 'player4' });

// Return from jury
window.game.bus.emit('jury.member:return', { playerId: 'player4' });

// Final discussion
window.game.bus.emit('jury.final:discussion', {});
```

### Bond Shifts
```javascript
window.game.bus.emit('bond.shift', {
  player1: 'player1',
  player2: 'player2',
  delta: 0.15  // -1 to 1
});
```

### Social Phase End
```javascript
window.game.bus.emit('social.phase:end', {
  actor: 'player1',
  actionCount: 3
});
```

## Severity Levels

| Severity | Use Case | Button Effect |
|----------|----------|---------------|
| `neutral` | Standard gameplay | No blinking |
| `high` | Important events, large bond shifts | Orange pulse |
| `dramatic` | Game-changing moments | Red pulse |
| `private` | Reserved for future use | N/A |

## DR UI Events

### Listen For
- `dr:alert` - Alert received, start blinking
- `dr:focus:ack` - Entry acknowledged, stop blinking
- `dr:closed` - Modal closed, stop blinking

### Emit
- `dr:open` - User clicked DR button
- `dr:focus` - Focus specific entry (with `entry` and `entryId`)

## Manual Controls

```javascript
// Start blinking
DiaryUI.startBlinking('dramatic');

// Stop blinking
DiaryUI.stopBlinking();

// Check state
DiaryUI.isBlinking();  // returns boolean
DiaryUI.getCurrentAlert();  // returns entry object or null
```

## CSS Classes

```css
/* Add to button to make it blink */
.dr-blink { }

/* Severity-specific */
.dr-blink[data-severity="dramatic"] { }  /* Red pulse */
.dr-blink[data-severity="high"] { }      /* Orange pulse */

/* Log entry styling */
.dr-entry[data-severity="dramatic"] { }
.dr-entry[data-severity="high"] { }
.dr-entry[data-severity="neutral"] { }
```

## Testing

Quick test in browser console:

```javascript
// Test social action
window.game.bus.emit('social.action:result', {
  actor: 'player1',
  target: 'player2',
  actionType: 'backstab',
  severity: 'dramatic',
  bondDelta: -0.2
});

// Test jury return
window.game.bus.emit('jury.member:return', {
  playerId: 'player3'
});

// Manually stop blinking
window.DiaryUI.stopBlinking();
```

## Configuration Options

### DiaryRoomLogger
```javascript
DiaryRoomLogger.init({
  events: {
    socialAction: 'custom.event.name',
    // ... override any event name
  }
});
```

### DiaryUI
```javascript
DiaryUI.init({
  buttonSelector: '#myButton',  // CSS selector
  createFallback: true          // Create floating button if not found
});
```

## Common Patterns

### Triggering DR Entry with Game Action
```javascript
function performSocialAction(actorId, targetId, action) {
  // ... game logic ...
  
  // Emit DR event
  window.game.bus.emit('social.action:result', {
    actor: actorId,
    target: targetId,
    actionType: action,
    severity: action === 'backstab' ? 'dramatic' : 'neutral'
  });
}
```

### Listening for DR Opens
```javascript
window.game.bus.on('dr:open', function(payload) {
  console.log('User opened DR:', payload);
  // Open your diary room modal
});
```

### Handling Focus Requests
```javascript
window.game.bus.on('dr:focus', function(payload) {
  const entry = payload.entry;
  // Scroll to entry, highlight it, etc.
  
  // Acknowledge
  window.game.bus.emit('dr:focus:ack', { entryId: entry.id });
});
```

## Troubleshooting Checklist

- [ ] Modules loaded? Check `window.DiaryTemplates`, `window.DiaryRoomLogger`, `window.DiaryUI`
- [ ] Game bus available? Check `window.game.bus` or `window.bbGameBus`
- [ ] Button exists? Check selector matches
- [ ] CSS loaded? Check `css/dr/diary.css`
- [ ] Events emitting? Check browser console
- [ ] Templates working? Check `window.game.players` array

## File Locations

| File | Purpose |
|------|---------|
| `js/dr/diaryTemplates.js` | Template engine |
| `js/dr/diaryRoomLogger.js` | Event listener & logger |
| `js/dr/diaryUI.js` | UI controller |
| `css/dr/diary.css` | Styles & animations |
| `js/bootstrap.js` | Initialization code |
| `index.html` | Script & CSS includes |
| `test_dr_logger_ui.html` | Integration test |
| `docs/diary-room-logger.md` | Full documentation |

## Example Integration Test

Open `test_dr_logger_ui.html` in browser, click buttons to test:
- Social actions (compliment, backstab, lie)
- Jury events (enter, challenge, return)
- Bond shifts
- DR button blinking
- Manual controls
