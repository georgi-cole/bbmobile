# XP/Level Progression System - Quick Reference

## Quick Start

### 1. Load Modules (in order)
```html
<script src="js/bbGameBus.js"></script>
<script src="js/progression/events.js"></script>
<script src="js/progression/rules.js"></script>
<script src="js/progression/engine.js"></script>
<script src="js/progression/components.js"></script>
<script src="js/progression/integration.js"></script>
```

### 2. Initialize Player
```javascript
ProgressionEngine.initializePlayer('player-1');
```

### 3. Award XP
```javascript
// Award XP by action name
ProgressionEngine.awardXPForAction('player-1', 'win_hoh'); // +100 XP

// Award custom XP amount
ProgressionEngine.awardXP('player-1', 50, 'custom_reward');
```

### 4. Display UI
```html
<!-- Badge -->
<progression-badge level="5" xp="1000" show-progress></progression-badge>

<!-- Summary -->
<progression-summary player-id="player-1"></progression-summary>

<!-- Level-Up Modal -->
<level-up-modal id="modal" level="5" old-level="4"></level-up-modal>
```

---

## Common Actions & XP Rewards

| Action | XP | When to Award |
|--------|----|--------------| 
| `win_hoh` | 100 | Win Head of Household |
| `win_veto` | 80 | Win Power of Veto |
| `comp_participation` | 10 | Complete any competition |
| `comp_top3` | 30 | Finish in top 3 |
| `comp_perfect_score` | 50 | Perfect score on minigame |
| `survive_nomination` | 40 | Survive being nominated |
| `form_alliance` | 25 | Form new alliance |
| `reach_jury` | 100 | Make it to jury phase |
| `win_game` | 500 | Win the game |

**See full list**: `ProgressionRules.getAllRules()`

---

## Level Thresholds

| Level | XP Required | Total Gain |
|-------|-------------|------------|
| 1 | 0 | Start |
| 2 | 100 | +100 |
| 3 | 250 | +150 |
| 5 | 700 | +450 |
| 10 | 3,200 | +2,500 |
| 15 | 9,200 | +6,000 |
| 20 | 22,000 | +12,800 (Max) |

**Get level for XP**: `ProgressionRules.getLevelForXP(xp)`

---

## API Cheat Sheet

### ProgressionEngine

```javascript
// Initialize
ProgressionEngine.initializePlayer(playerId, { totalXP: 0 });

// Award XP
ProgressionEngine.awardXP(playerId, amount, reason);
ProgressionEngine.awardXPForAction(playerId, 'win_hoh');

// Award Badge
ProgressionEngine.awardBadge(playerId, 'badge_id', 'Badge Name');

// Get State
const state = ProgressionEngine.getPlayerState(playerId);
// Returns: { playerId, totalXP, level, badges, achievements, history, ... }

// Export/Import
const data = ProgressionEngine.exportData();
ProgressionEngine.importData(data);

// Reset
ProgressionEngine.resetPlayer(playerId);
ProgressionEngine.resetAll();
```

### ProgressionRules

```javascript
// Get XP for action
const xp = ProgressionRules.getXPReward('win_hoh'); // 100

// Get level info
const info = ProgressionRules.getLevelInfo(1000);
// Returns: { level, currentXP, isMaxLevel, xpForNextLevel, progressToNextLevel, ... }

// Update rules
ProgressionRules.updateRules({ custom_action: 75 });

// Get all rules
const rules = ProgressionRules.getAllRules();
```

### ProgressionEvents

```javascript
// Record event
ProgressionEvents.recordEvent('xp_gained', { playerId, xpAmount });

// Get events
const all = ProgressionEvents.getAllEvents();
const xpEvents = ProgressionEvents.getEventsByType('xp_gained');
const recent = ProgressionEvents.getRecentEvents(10);

// Export/Import
const json = ProgressionEvents.exportEvents();
ProgressionEvents.importEvents(json);
```

### ProgressionIntegration

```javascript
// Award to human player
ProgressionIntegration.awardXPToHuman('win_hoh');

// Get human state
const state = ProgressionIntegration.getHumanPlayerState();

// Show level-up modal
ProgressionIntegration.showLevelUpModal(5, 4);
```

---

## Web Components

### Progression Badge
```html
<progression-badge 
  level="5" 
  xp="1000" 
  show-progress>
</progression-badge>
```

```javascript
const badge = document.querySelector('progression-badge');
badge.level = 6;
badge.xp = 1500;
badge.render();
```

### Level-Up Modal
```html
<level-up-modal 
  id="modal" 
  level="5" 
  old-level="4">
</level-up-modal>
```

```javascript
const modal = document.getElementById('modal');
modal.setAttribute('level', 5);
modal.show(); // Display modal
modal.hide(); // Hide modal

modal.addEventListener('dismissed', () => {
  console.log('Modal closed');
});
```

### Progression Summary
```html
<progression-summary player-id="player-1"></progression-summary>
```

```javascript
const summary = document.querySelector('progression-summary');
summary.setAttribute('player-id', 'player-1');
summary.refresh(); // Re-render
```

---

## Event Bus Integration

```javascript
// Listen for XP gains
bbGameBus.on('progression:xp_awarded', (data) => {
  console.log(`${data.playerId} gained ${data.xpAmount} XP`);
});

// Listen for level-ups
bbGameBus.on('progression:level_up', (data) => {
  console.log(`Level up! ${data.oldLevel} → ${data.newLevel}`);
  showCelebration();
});

// Listen for badge awards
bbGameBus.on('progression:badge_earned', (data) => {
  console.log(`Badge earned: ${data.badgeName}`);
});

// Listen for progression events
bbGameBus.on('progression:event', (event) => {
  console.log('Event:', event.type, event.data);
});
```

---

## Common Patterns

### Award XP and Check Level-Up
```javascript
const result = ProgressionEngine.awardXPForAction('player-1', 'win_hoh');

if (result.leveledUp) {
  // Player leveled up!
  console.log(`Level ${result.oldLevel} → ${result.newLevel}`);
  
  // Show modal
  ProgressionIntegration.showLevelUpModal(result.newLevel, result.oldLevel);
  
  // Update badge UI
  updateBadgeDisplay(result.newLevel, result.newXP);
}
```

### Get Progress Percentage
```javascript
const state = ProgressionEngine.getPlayerState('player-1');
const progressPercent = Math.round(state.progressToNextLevel * 100);
console.log(`Progress: ${progressPercent}%`);
```

### Save and Load
```javascript
// Save to localStorage
function saveProgression() {
  const data = ProgressionEngine.exportData();
  localStorage.setItem('progression', JSON.stringify(data));
}

// Load from localStorage
function loadProgression() {
  const json = localStorage.getItem('progression');
  if (json) {
    const data = JSON.parse(json);
    ProgressionEngine.importData(data);
  }
}
```

### Custom XP Rules
```javascript
// Add custom actions
ProgressionRules.updateRules({
  epic_move: 150,
  social_genius: 100,
  strategic_mastermind: 200
});

// Award custom XP
ProgressionEngine.awardXPForAction('player-1', 'epic_move');
```

---

## Testing

### Run Unit Tests
```javascript
// Open test_progression.html
// Click "Run Unit Tests" button
// Check console for results
```

### Manual Testing
```javascript
// Initialize test player
ProgressionEngine.initializePlayer('test-1');

// Award various amounts
ProgressionEngine.awardXP('test-1', 50, 'test');
ProgressionEngine.awardXPForAction('test-1', 'win_hoh');

// Check state
const state = ProgressionEngine.getPlayerState('test-1');
console.log(state);

// Test badge
ProgressionEngine.awardBadge('test-1', 'test_badge', 'Test Badge');

// Test modal
const modal = document.createElement('level-up-modal');
modal.setAttribute('level', 5);
modal.setAttribute('old-level', 4);
document.body.appendChild(modal);
modal.show();
```

---

## Troubleshooting

### Modules Not Loading
- Check load order (GameBus must be first)
- Verify file paths are correct
- Check browser console for errors

### XP Not Awarding
- Ensure player is initialized first
- Check action name matches rules
- Verify ProgressionEngine is available

### Components Not Rendering
- Ensure components.js is loaded
- Check for JavaScript errors
- Verify Shadow DOM support

### Events Not Firing
- Check GameBus is loaded
- Verify event listener syntax
- Check browser console for errors

---

## Browser Support

✅ Chrome 80+  
✅ Firefox 75+  
✅ Safari 13+  
✅ Edge 80+  

Requires:
- ES6+ (const, let, arrow functions, classes)
- Web Components (Custom Elements v1)
- Shadow DOM
- CSS Grid & Flexbox

---

## Performance Tips

1. **Batch Updates**: Award multiple XP amounts in sequence
2. **Cache State**: Store player state locally to reduce lookups
3. **Debounce UI Updates**: Update UI on idle, not every XP award
4. **Use Events**: Listen to GameBus instead of polling
5. **Limit History**: History automatically limited to prevent growth

---

## Files Overview

| File | Size | Purpose |
|------|------|---------|
| `events.js` | 143 lines | Event sourcing |
| `rules.js` | 222 lines | XP rules & levels |
| `engine.js` | 337 lines | Core progression |
| `components.js` | 513 lines | UI components |
| `integration.js` | 214 lines | Game hooks |
| `test_progression.html` | 570 lines | Test page |

**Total**: ~2,000 lines of code

---

## Documentation

- **PROGRESSION_SYSTEM_README.md** - Complete API documentation
- **PROGRESSION_SYSTEM_SUMMARY.md** - Implementation overview
- **PROGRESSION_SYSTEM_VISUAL_GUIDE.md** - UI design guide
- **PROGRESSION_SYSTEM_QUICK_REFERENCE.md** - This file!

---

## Support

For issues or questions:
1. Check documentation files
2. Review test_progression.html for examples
3. Check browser console for errors
4. Verify all modules are loaded in correct order

---

**Last Updated**: October 2024  
**Version**: 1.0.0  
**License**: Same as parent project
