# XP/Level Progression System

## Overview

A flexible, event-sourced XP/Level progression system implemented in vanilla HTML/CSS/JS with ES Modules and Web Components. The system provides a complete progression framework for tracking player achievements, awarding XP, managing levels, and displaying progression through reusable UI components.

## Features

### Core Functionality
- **Event Sourcing**: Immutable event log tracks all progression activities
- **Data-Driven Rules**: Configurable XP rewards and level thresholds
- **Flexible XP Awards**: Award XP by action or custom amounts
- **Level Progression**: Automatic level calculation based on XP
- **Badge System**: Award and track achievement badges
- **Player State Management**: Track progression for multiple players
- **Export/Import**: Full data portability for persistence

### UI Components (Web Components)
- **Progression Badge**: Displays current level and XP with progress bar
- **Level-Up Modal**: Celebratory modal for level-up events
- **Progression Summary**: Comprehensive view of player progression

### Integration
- **GameBus Integration**: Listens to game events for automatic XP awards
- **Telemetry Integration**: Awards XP based on minigame performance
- **Competition Integration**: Awards XP for competition wins
- **Phase Integration**: Awards XP for game milestones

## Architecture

### Modules

```
js/progression/
├── events.js          # Event sourcing system
├── rules.js           # Data-driven rules engine
├── engine.js          # Core progression engine
├── components.js      # Web Components (Badge, Modal, Summary)
└── integration.js     # Game integration layer
```

### Dependencies

- `bbGameBus.js` - Event bus for game communication
- No external libraries required

## API Reference

### ProgressionEvents

Event sourcing for tracking all progression activities.

```javascript
// Record an event
ProgressionEvents.recordEvent(EventTypes.XP_GAINED, {
  playerId: 'player-1',
  xpAmount: 50,
  reason: 'win_hoh'
});

// Get all events
const events = ProgressionEvents.getAllEvents();

// Get events by type
const xpEvents = ProgressionEvents.getEventsByType(EventTypes.XP_GAINED);

// Get recent events
const recent = ProgressionEvents.getRecentEvents(10);

// Export/Import
const json = ProgressionEvents.exportEvents();
ProgressionEvents.importEvents(json);

// Clear events
ProgressionEvents.clearEvents();
```

**Event Types:**
- `XP_GAINED` - XP awarded to player
- `LEVEL_UP` - Player leveled up
- `MILESTONE_REACHED` - Game milestone reached
- `BADGE_EARNED` - Badge awarded
- `ACHIEVEMENT_UNLOCKED` - Achievement unlocked

### ProgressionRules

Data-driven rules for XP rewards and level thresholds.

```javascript
// Get XP reward for action
const xp = ProgressionRules.getXPReward('win_hoh'); // 100

// Get level for XP amount
const level = ProgressionRules.getLevelForXP(500); // 5

// Get XP needed for next level
const needed = ProgressionRules.getXPForNextLevel(450); // 50

// Get progress to next level (0-1)
const progress = ProgressionRules.getProgressToNextLevel(450); // 0.8

// Get level info
const info = ProgressionRules.getLevelInfo(450);
// Returns: { level, currentXP, isMaxLevel, xpForNextLevel, progressToNextLevel, ... }

// Update rules
ProgressionRules.updateRules({ win_hoh: 150 });

// Update thresholds
ProgressionRules.updateThresholds([0, 100, 250, 500, ...]);

// Reset to defaults
ProgressionRules.resetToDefaults();

// Get all rules/thresholds
const rules = ProgressionRules.getAllRules();
const thresholds = ProgressionRules.getThresholds();
const maxLevel = ProgressionRules.getMaxLevel(); // 20
```

**Default XP Rewards:**

| Action | XP |
|--------|-----|
| win_hoh | 100 |
| win_veto | 80 |
| win_final_hoh_part1 | 120 |
| win_final_hoh_part2 | 120 |
| win_final_hoh_part3 | 150 |
| comp_participation | 10 |
| comp_top3 | 30 |
| comp_perfect_score | 50 |
| form_alliance | 25 |
| survive_nomination | 40 |
| survive_block | 60 |
| cast_vote | 5 |
| jury_vote | 20 |
| reach_jury | 100 |
| reach_final3 | 150 |
| reach_final2 | 200 |
| win_game | 500 |

**Level Thresholds:**

Level 1-20 with increasing XP requirements (0, 100, 250, 450, 700, 1000, ..., 22000)

### ProgressionEngine

Core engine for managing player progression.

```javascript
// Initialize player
ProgressionEngine.initializePlayer('player-1', {
  totalXP: 0,
  badges: [],
  achievements: []
});

// Award XP (custom amount)
const result = ProgressionEngine.awardXP('player-1', 50, 'custom_reward', {
  metadata: 'value'
});
// Returns: { success, playerId, xpAwarded, oldXP, newXP, oldLevel, newLevel, leveledUp, levelsGained }

// Award XP by action (uses rules)
const result = ProgressionEngine.awardXPForAction('player-1', 'win_hoh');

// Award badge
ProgressionEngine.awardBadge('player-1', 'comp_beast', 'Competition Beast', {
  reason: 'Won 5 HOH competitions'
});

// Get player state
const state = ProgressionEngine.getPlayerState('player-1');
// Returns: { playerId, totalXP, level, badges, achievements, history, ... }

// Get all player states
const allStates = ProgressionEngine.getAllPlayerStates();

// Reset player
ProgressionEngine.resetPlayer('player-1');

// Reset all
ProgressionEngine.resetAll();

// Export/Import data
const data = ProgressionEngine.exportData();
ProgressionEngine.importData(data);
```

### ProgressionIntegration

Integration layer for connecting progression to game events.

```javascript
// Initialize integration (auto-runs on page load)
ProgressionIntegration.initialize();

// Award XP to human player
ProgressionIntegration.awardXPToHuman('win_hoh');

// Initialize human player
ProgressionIntegration.initializeHumanPlayer();

// Get human player state
const state = ProgressionIntegration.getHumanPlayerState();

// Show level-up modal
ProgressionIntegration.showLevelUpModal(5, 4); // newLevel, oldLevel
```

### Web Components

#### Progression Badge

Displays current level and XP with optional progress bar.

```html
<progression-badge level="5" xp="1000" show-progress></progression-badge>
```

**Attributes:**
- `level` - Current level (number)
- `xp` - Current XP (number)
- `show-progress` - Show progress bar (boolean attribute)

**JavaScript API:**
```javascript
const badge = document.querySelector('progression-badge');
badge.level = 5;
badge.xp = 1000;
badge.render(); // Re-render
```

#### Level-Up Modal

Celebratory modal displayed when player levels up.

```html
<level-up-modal id="modal" level="5" old-level="4"></level-up-modal>
```

**Attributes:**
- `level` - New level (number)
- `old-level` - Previous level (number)

**JavaScript API:**
```javascript
const modal = document.getElementById('modal');
modal.setAttribute('level', 5);
modal.setAttribute('old-level', 4);
modal.show(); // Show modal
modal.hide(); // Hide modal

// Listen for dismissal
modal.addEventListener('dismissed', () => {
  console.log('Modal dismissed');
});
```

#### Progression Summary

Comprehensive view of player progression with stats, progress, history, and badges.

```html
<progression-summary player-id="player-1"></progression-summary>
```

**Attributes:**
- `player-id` - Player ID to display (string)

**JavaScript API:**
```javascript
const summary = document.querySelector('progression-summary');
summary.setAttribute('player-id', 'player-1');
summary.refresh(); // Re-render
```

## Usage Examples

### Basic Setup

```javascript
// Initialize player
ProgressionEngine.initializePlayer('player-1');

// Award XP for winning HOH
ProgressionEngine.awardXPForAction('player-1', 'win_hoh');

// Check if player leveled up
const state = ProgressionEngine.getPlayerState('player-1');
if (state.level > 1) {
  // Show level-up modal
  const modal = document.createElement('level-up-modal');
  modal.setAttribute('level', state.level);
  modal.setAttribute('old-level', state.level - 1);
  document.body.appendChild(modal);
  modal.show();
}
```

### Display Player Badge

```html
<progression-badge id="playerBadge" level="1" xp="0" show-progress></progression-badge>

<script>
  // Update badge when XP is awarded
  function updateBadge() {
    const state = ProgressionEngine.getPlayerState('player-1');
    const badge = document.getElementById('playerBadge');
    badge.level = state.level;
    badge.xp = state.totalXP;
  }
</script>
```

### Listen to Progression Events

```javascript
// Listen for XP gains via GameBus
bbGameBus.on('progression:xp_awarded', (data) => {
  console.log(`${data.playerId} gained ${data.xpAmount} XP`);
  updateUI();
});

// Listen for level-ups
bbGameBus.on('progression:level_up', (data) => {
  console.log(`${data.playerId} reached level ${data.newLevel}!`);
  showLevelUpModal(data.newLevel, data.oldLevel);
});

// Listen for badge awards
bbGameBus.on('progression:badge_earned', (data) => {
  console.log(`${data.playerId} earned badge: ${data.badgeName}`);
});
```

### Automatic Game Integration

The integration module automatically awards XP for game events:

```javascript
// Automatically awards XP when minigames complete
// (Listens to 'minigame:telemetry' events)

// Automatically awards XP for competition wins
// (Listens to 'competition:complete' events)

// Automatically awards XP for phase progression
// (Listens to 'phase:changed' events)
```

### Custom XP Rules

```javascript
// Add custom XP rewards
ProgressionRules.updateRules({
  custom_achievement: 75,
  special_milestone: 200
});

// Award custom XP
ProgressionEngine.awardXPForAction('player-1', 'custom_achievement');
```

### Data Persistence

```javascript
// Export progression data
const data = ProgressionEngine.exportData();
localStorage.setItem('progression', JSON.stringify(data));

// Import on page load
const saved = localStorage.getItem('progression');
if (saved) {
  const data = JSON.parse(saved);
  ProgressionEngine.importData(data);
}
```

## Testing

A comprehensive test page is available at `test_progression.html` with:

- System status monitoring
- Live badge display
- XP award buttons for all actions
- Badge award buttons
- Progression summary view
- Level-up modal testing
- Unit tests for all modules
- Export/import functionality
- Event log viewer

To run tests:

1. Open `test_progression.html` in a browser
2. Click "Run Unit Tests" to verify all modules
3. Use action buttons to test XP awards and level-ups
4. Check event log for detailed activity

## Browser Compatibility

- Modern browsers with ES6+ support
- Web Components (Custom Elements v1)
- Shadow DOM
- CSS Grid and Flexbox
- No polyfills required for modern browsers

## Performance

- Lightweight implementation (~35KB total)
- No external dependencies
- Efficient event storage (circular buffer)
- CSS-based animations
- Automatic DOM cleanup
- Minimal memory footprint

## Future Enhancements

Potential improvements for future iterations:

- Achievements system with unlock conditions
- Leaderboards and rankings
- XP multipliers and boosts
- Prestige system for max-level players
- Badge rarity tiers
- Progression analytics dashboard
- Mobile-optimized components
- Sound effects for level-ups
- Animation variants
- Seasonal progression tracks

## Integration with Existing Game

The progression system integrates seamlessly with the existing game through:

1. **GameBus Events**: Listens to game events for automatic XP awards
2. **Telemetry System**: Uses minigame telemetry for performance-based XP
3. **Competition System**: Awards XP for competition wins (HOH, Veto, etc.)
4. **Phase System**: Awards XP for reaching game milestones

All integrations are non-invasive and can be disabled by not loading the integration module.

## License

Same as parent project.

## Support

For issues, questions, or feature requests, please refer to the main repository documentation.
