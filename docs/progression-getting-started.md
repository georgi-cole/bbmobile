# Progression System - Getting Started

This guide shows you how to use, test, and integrate the progression system into the Big Brother Mobile game.

## Quick Start

No build step required! The progression system is ready to use in any modern browser.

### 1. View the Example

Open `src/progression/example/index.html` in a browser:

```bash
# Using a simple HTTP server
python3 -m http.server 8000
# Then visit: http://localhost:8000/src/progression/example/index.html

# Or use Node's http-server
npx http-server -p 8000
# Then visit: http://localhost:8000/src/progression/example/index.html
```

The example demonstrates:
- XP badge component
- Detailed modal (Overview/Breakdown/Unlocks)
- Floating "Score & Level" button
- Action simulation buttons
- Season summary cards

### 2. Run Tests

Open `src/progression/tests/index.html` in a browser:

```
http://localhost:8000/src/progression/tests/index.html
```

All tests run automatically and display results. Tests verify:
- ✓ Replay determinism
- ✓ Rule changes don't mutate log
- ✓ Negative XP floored to 0
- ✓ Per-week cap: COMP_PARTICIPATE (max 3/week)
- ✓ Per-week cap: CLEAN_WEEK (max 1/week)
- ✓ Per-season cap: HOH_STREAK_2 (once/season)
- ✓ Per-season cap: POV_STREAK_2 (once/season)
- ✓ Level computation
- ✓ Progress percentage
- ✓ XP breakdown
- ✓ Database schemaVersion

## Building (Optional)

The compiled files are already committed, but you can rebuild if you modify TypeScript sources:

```bash
# Install dependencies
npm install

# Build progression system
npm run build:progression

# Type check only (no emit)
npm run typecheck:progression
```

Output goes to `src/progression/dist/` and includes:
- `*.js` - ES modules
- `*.d.ts` - Type declarations

## Integration

### Basic Usage

```html
<!-- In your HTML -->
<script type="module">
  import * as Progression from './src/progression/dist/core.js';
  import { createBadge } from './src/progression/xp-badge.js';
  import { createModal } from './src/progression/xp-modal.js';

  // Initialize
  await Progression.initialize();

  // Record an event
  await Progression.recordEvent('HOH_WIN', 150, {
    week: 3,
    season: 1
  });

  // Get current state
  const state = await Progression.getCurrentState();
  console.log(`Level ${state.level}, ${state.totalXP} XP`);

  // Create badge
  const badge = createBadge(container, {
    onClick: () => {
      const modal = createModal();
      modal.updateOverview(state, Progression.DEFAULT_LEVEL_THRESHOLDS);
    }
  });
  badge.update(state);
</script>
```

### Badge Component

**Inline Badge:**
```javascript
import { createBadge } from './src/progression/xp-badge.js';

const badge = createBadge(document.getElementById('my-container'), {
  onClick: openProgressionModal, // Optional click handler
  theme: 'dark' // or 'light'
});

// Update when state changes
badge.update(state);
```

**Floating Button:**
```javascript
import { createFloatingButton } from './src/progression/xp-badge.js';

const button = createFloatingButton({
  position: 'bottom-right', // bottom-right, bottom-left, top-right, top-left
  onClick: openProgressionModal
});
```

### Modal Component

```javascript
import { createModal } from './src/progression/xp-modal.js';

function openProgressionModal() {
  const modal = createModal({
    theme: 'dark', // or 'light'
    onClose: () => console.log('Modal closed')
  });

  // Update tabs
  modal.updateOverview(state, Progression.DEFAULT_LEVEL_THRESHOLDS);
  modal.updateBreakdown(breakdown);
  modal.updateUnlocks(state, Progression.DEFAULT_LEVEL_THRESHOLDS);
}
```

### Recording Events

Events should include `week` and `season` metadata for cap enforcement:

```javascript
// Positive XP events
await Progression.recordEvent('COMP_WIN', 100, {
  week: 3,
  season: 1,
  competitionType: 'endurance' // optional custom metadata
});

// Negative XP events
await Progression.recordEvent('NOMINATED', -25, {
  week: 3,
  season: 1
});

// Events with caps
await Progression.recordEvent('COMP_PARTICIPATE', 50, {
  week: 3,    // Required for per-week cap
  season: 1   // Required for per-season cap
});
```

### Custom Rules

You can update rules without affecting the event log:

```javascript
const customRules = [
  {
    id: 'COMP_WIN',
    name: 'Competition Winner',
    baseXP: 150, // Changed from 100
    description: 'Won a competition'
  },
  // ... other rules
];

await Progression.updateRuleSet(customRules);

// State recomputed with new rules, events unchanged
const state = await Progression.getCurrentState();
```

## XP Rule Reference

### Actions with Caps

**COMP_PARTICIPATE** (+50 XP, max 3/week)
```javascript
await Progression.recordEvent('COMP_PARTICIPATE', 50, { week, season });
```

**CLEAN_WEEK** (+100 XP, max 1/week)
```javascript
await Progression.recordEvent('CLEAN_WEEK', 100, { week, season });
```

**HOH_STREAK_2** (+200 XP, once/season)
```javascript
await Progression.recordEvent('HOH_STREAK_2', 200, { week, season });
```

**POV_STREAK_2** (+175 XP, once/season)
```javascript
await Progression.recordEvent('POV_STREAK_2', 175, { week, season });
```

### Standard Actions

- `COMP_WIN` (+100 XP) - Competition win
- `HOH_WIN` (+150 XP) - HOH win
- `POV_WIN` (+125 XP) - POV win
- `NOMINATED` (-25 XP) - Nominated
- `SURVIVED_BLOCK` (+75 XP) - Survived
- `SOCIAL_ALLIANCE` (+30 XP) - Alliance
- `BETRAYAL` (-50 XP) - Betrayed
- `JURY_MEMBER` (+80 XP) - Jury
- `FINAL_THREE` (+150 XP) - Final 3
- `FINAL_TWO` (+250 XP) - Final 2
- `WINNER` (+500 XP) - Winner

## Always-On UX Pattern

Add a persistent "Score & Level" entry point to your app:

```javascript
import { createFloatingButton } from './src/progression/xp-badge.js';
import { createModal } from './src/progression/xp-modal.js';
import * as Progression from './src/progression/dist/core.js';

// Initialize on app load
await Progression.initialize();

// Create floating button
const button = createFloatingButton({
  position: 'bottom-right',
  onClick: async () => {
    const state = await Progression.getCurrentState();
    const breakdown = await Progression.getBreakdown();
    
    const modal = createModal({ theme: 'dark' });
    modal.updateOverview(state, Progression.DEFAULT_LEVEL_THRESHOLDS);
    modal.updateBreakdown(breakdown);
    modal.updateUnlocks(state, Progression.DEFAULT_LEVEL_THRESHOLDS);
  }
});

// Update badge on game events
async function onGameEvent(ruleId, amount, meta) {
  await Progression.recordEvent(ruleId, amount, meta);
  // Optionally show a toast/notification
}
```

## API Reference

### Core Functions

**`initialize(): Promise<void>`**
- Opens database and creates default rule set if needed

**`recordEvent(ruleId: string, amount: number, meta?: object): Promise<XPEvent>`**
- Records an XP event
- Creates a snapshot of resulting state
- Returns the created event

**`getCurrentState(): Promise<PlayerState>`**
- Computes current state from all events
- Returns: `{ totalXP, level, nextLevelXP, currentLevelXP, progressPercent, eventsCount }`

**`getBreakdown(): Promise<Map<string, {count, totalXP, ruleName}>>`**
- Returns XP breakdown by rule

**`getEvents(): Promise<XPEvent[]>`**
- Returns all recorded events

**`reset(): Promise<void>`**
- Clears all data and reinitializes

### Badge Functions

**`createBadge(container, options)`**
- Creates inline badge
- Options: `{ onClick?, theme? }`
- Returns badge with `update(state)` method

**`createFloatingButton(options)`**
- Creates floating button
- Options: `{ position?, onClick? }`
- Returns button element

### Modal Functions

**`createModal(options)`**
- Creates progression modal
- Options: `{ theme?, onClose? }`
- Returns modal with update methods:
  - `updateOverview(state, thresholds)`
  - `updateBreakdown(breakdown)`
  - `updateUnlocks(state, thresholds)`

## Database Management

### Inspecting Data

Use browser DevTools → Application → IndexedDB → BBProgressionDB:
- `events` - All XP events
- `snapshots` - State snapshots
- `ruleSets` - Rule versions
- `meta` - Metadata (schemaVersion, etc.)

### Resetting Data

```javascript
// From code
await Progression.reset();

// Or manually in DevTools
// Application → IndexedDB → BBProgressionDB → Delete database
```

## Troubleshooting

**Tests failing?**
- Ensure you're using a modern browser (Chrome 90+, Firefox 88+, Safari 14+)
- Check browser console for errors
- Try clearing IndexedDB data

**Example not loading?**
- Must be served over HTTP (not `file://`)
- Use a local HTTP server

**TypeScript errors?**
- Run `npm run typecheck:progression`
- Check TypeScript version: `npx tsc --version` (should be 5.x)

## Performance Tips

1. **Batch events** when possible instead of individual calls
2. **Use snapshots** for historical queries rather than recomputing
3. **Consider log compaction** for long-running games (not implemented in v1)
4. **Cache state** in memory if querying frequently

## Next Steps

- Read `docs/progression-system.md` for architecture details
- Explore the example page source code
- Review test cases for usage patterns
- Integrate into your game loop
