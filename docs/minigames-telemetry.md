# Minigame Telemetry System

## Overview

The telemetry system provides comprehensive event tracking and analytics for the minigame system. It logs all game interactions, performance metrics, and errors to help with debugging, optimization, and fairness validation.

## Event Types

### 1. Selection Events
Logged when a game is selected for a competition.

```javascript
MinigameTelemetry.logSelection(gameKey, {
  poolSize: 15,
  poolIndex: 7,
  method: 'pool'
});
```

**Metadata:**
- `poolSize` - Total games in selection pool
- `poolIndex` - Position in pool
- `method` - Selection method ('pool', 'weighted', 'cycle')

### 2. Lifecycle Events

#### load.start
Game module begins loading.

```javascript
MinigameTelemetry.logEvent('load.start', {
  gameKey: 'quickTap',
  playerId: 'p1'
});
```

#### load.end
Game module finished loading.

```javascript
MinigameTelemetry.logEvent('load.end', {
  gameKey: 'quickTap',
  loadTimeMs: 142
});
```

#### start (play.start)
Player begins actively playing.

```javascript
MinigameTelemetry.logStart(gameKey, {
  playerId: 'p1',
  phase: 'hoh'
});
```

### 3. Completion Events
Logged when a game finishes.

```javascript
MinigameTelemetry.logComplete(gameKey, {
  score: 85,
  finalScore: 95,
  playTimeMs: 12450,
  totalTimeMs: 12680,
  playerId: 'p1'
});
```

**Metadata:**
- `score` - Raw score from game
- `finalScore` - Normalized score with multipliers
- `playTimeMs` - Active play time
- `totalTimeMs` - Total time (load + play)

### 4. Error Events
Logged when a game fails or throws an error.

```javascript
MinigameTelemetry.logError(gameKey, error, {
  phase: 'hoh',
  playerId: 'p1',
  fallbackAttempted: true
});
```

### 5. Special Events

#### timeout
Watchdog timer expired (game took too long).

```javascript
MinigameTelemetry.logEvent('timeout', {
  gameKey: 'slowGame',
  timeoutMs: 60000
});
```

#### fallback
Error handler triggered fallback game.

```javascript
MinigameTelemetry.logEvent('fallback', {
  failedGame: 'brokenGame',
  fallbackGame: 'quickTap'
});
```

#### dispose
Game lifecycle cleanup.

```javascript
MinigameTelemetry.logEvent('dispose', {
  gameKey: 'quickTap',
  phase: 'completed'
});
```

## Circular Buffer

Events are stored in a circular buffer with a maximum of **100 events**. When the buffer is full, the oldest events are automatically removed.

**Why circular buffer?**
- Prevents unbounded memory growth
- Keeps recent events for debugging
- Lightweight and performant

## Statistics Tracking

The telemetry system automatically maintains statistics:

### Global Statistics
```javascript
const stats = MinigameTelemetry.getStats();
// {
//   totalSelections: 45,
//   totalStarts: 45,
//   totalCompletions: 43,
//   totalErrors: 2,
//   sessionStart: 1696512345678
// }
```

### Per-Game Statistics
```javascript
const gameStats = MinigameTelemetry.getGameStats('quickTap');
// {
//   selections: 8,
//   starts: 8,
//   completions: 7,
//   errors: 1,
//   totalScore: 620,
//   totalTime: 98500,
//   plays: 7,
//   avgScore: 88.57,  // totalScore / plays
//   avgTime: 14071.43 // totalTime / plays
// }
```

### All Games Statistics
```javascript
const allStats = MinigameTelemetry.getAllGameStats();
// Returns Map of gameKey -> stats for all played games
```

## Debug Panel

When `cfg.enableMinigameTelemetryPanel` is enabled, press **Ctrl+Shift+D** to open the debug panel.

### Features

**Events Tab:**
- Last 50 events with timestamps
- Color-coded by type (🎯 selection, ▶️ start, ✅ complete, ❌ error)
- Real-time updates every 2 seconds

**Stats Tab:**
- Global statistics
- Per-game statistics with averages
- Completion rate, error rate

**Games Tab:**
- All registered games
- Implementation status
- Mobile-friendly indicators
- Scoring type and game type

### Panel Controls
- **Export** - Download telemetry data as JSON
- **Clear** - Clear all telemetry data
- **Close** - Hide panel (or press Esc)

## GameBus Integration

All telemetry events are also emitted on the GameBus for external listeners:

```javascript
bbGameBus.on('minigame:telemetry', (event) => {
  console.log('Telemetry event:', event);
  // {
  //   type: 'complete',
  //   timestamp: 1696512345678,
  //   data: { gameKey: 'quickTap', score: 85, ... }
  // }
});
```

## Console Access

Telemetry functions are available in the browser console:

```javascript
// Show debug panel
__showMinigameDebug();

// Get recent events
__getMinigameTelemetry();

// Get statistics
MinigameTelemetry.getStats();
MinigameTelemetry.getGameStats('quickTap');

// Export data
const json = MinigameTelemetry.exportData();
console.log(json);
```

## Data Export Format

```json
{
  "timestamp": "2024-10-05T22:30:00.000Z",
  "events": [
    {
      "type": "selection",
      "timestamp": 1696512340000,
      "data": { "gameKey": "quickTap", "poolSize": 15 }
    },
    {
      "type": "start",
      "timestamp": 1696512341000,
      "data": { "gameKey": "quickTap", "playerId": "p1" }
    },
    {
      "type": "complete",
      "timestamp": 1696512353000,
      "data": { "gameKey": "quickTap", "score": 85, "timeMs": 12000 }
    }
  ],
  "stats": {
    "totalSelections": 1,
    "totalStarts": 1,
    "totalCompletions": 1,
    "totalErrors": 0
  },
  "gameStats": {
    "quickTap": {
      "selections": 1,
      "completions": 1,
      "avgScore": 85,
      "avgTime": 12000
    }
  }
}
```

## Performance Monitoring

Track load and render performance:

```javascript
// Get recent events
const events = MinigameTelemetry.getRecentEvents(100);

// Calculate p95 load time
const loadTimes = events
  .filter(e => e.type === 'load.end')
  .map(e => e.data.loadTimeMs)
  .sort((a, b) => a - b);

const p95 = loadTimes[Math.floor(loadTimes.length * 0.95)];
console.log('p95 load time:', p95, 'ms');
```

## Best Practices

### 1. Log at appropriate times
```javascript
// ✅ Good: Log selection when game is picked
MinigameTelemetry.logSelection(gameKey);

// ❌ Bad: Log completion multiple times
onComplete(score); // This already logs via system
```

### 2. Include relevant metadata
```javascript
// ✅ Good: Include context
MinigameTelemetry.logError(gameKey, error, {
  phase: 'hoh',
  playerId: 'p1',
  attemptNumber: 2
});

// ❌ Bad: No context
MinigameTelemetry.logError(gameKey, error);
```

### 3. Use appropriate event types
```javascript
// ✅ Good: Use specific methods
MinigameTelemetry.logComplete(gameKey, { score: 85 });

// ❌ Bad: Use generic logEvent for specific types
MinigameTelemetry.logEvent('complete', { gameKey, score: 85 });
```

### 4. Clear old data periodically
```javascript
// In production, clear telemetry after export
if(events.length > 500){
  const data = MinigameTelemetry.exportData();
  sendToServer(data);
  MinigameTelemetry.clearTelemetry();
}
```

## Integration with Lifecycle

The lifecycle manager automatically logs events:

```javascript
// Initialize lifecycle
MinigameLifecycle.initialize(gameKey, { playerId: 'p1' });
// → Logs 'selection' event

// Mark loading
MinigameLifecycle.markLoading(gameKey);
// → Logs 'load.start' event

// Mark ready
MinigameLifecycle.markReady(gameKey);
// → Logs 'load.end' event with loadTimeMs

// Mark playing
MinigameLifecycle.markPlaying(gameKey);
// → Logs 'start' event

// Mark completed
MinigameLifecycle.markCompleted(gameKey, score);
// → Logs 'complete' event with score and timing
```

## Troubleshooting

### Events not appearing
- Check that telemetry module is loaded
- Verify `MinigameTelemetry` is defined
- Check browser console for errors

### Debug panel not showing
- Enable flag: `cfg.enableMinigameTelemetryPanel = true`
- Save settings and reload
- Press Ctrl+Shift+D

### Memory concerns
- Circular buffer limited to 100 events
- Export and clear periodically
- Statistics are lightweight (aggregated)

## API Reference

### MinigameTelemetry.logEvent(type, data)
Log a generic event.

### MinigameTelemetry.logSelection(gameKey, data)
Log game selection.

### MinigameTelemetry.logStart(gameKey, data)
Log game start.

### MinigameTelemetry.logComplete(gameKey, data)
Log game completion.

### MinigameTelemetry.logError(gameKey, error, data)
Log game error.

### MinigameTelemetry.getRecentEvents(count)
Get last N events.

### MinigameTelemetry.getStats()
Get global statistics.

### MinigameTelemetry.getGameStats(gameKey)
Get per-game statistics.

### MinigameTelemetry.getAllGameStats()
Get all game statistics.

### MinigameTelemetry.clearTelemetry()
Clear all events and statistics.

### MinigameTelemetry.exportData()
Export all data as JSON string.

### MinigameTelemetry.getSummary()
Get formatted text summary.
