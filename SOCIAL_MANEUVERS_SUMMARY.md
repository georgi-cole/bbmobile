# Social Maneuvers Summary & Telemetry

Comprehensive end-of-phase summary, telemetry, and audit logging system for Social Maneuvers.

## Features

### 📊 End-of-Phase Summary Panel

After each social phase, players see a summary card showing:

- **Energy Report**: Energy spent and remaining per player
- **Actions Summary**: Breakdown by category (friendly/strategic/aggressive)
- **Relationship Changes**: Significant affinity shifts
- **New Alliances**: Pairs that crossed the 0.28 threshold
- **New Rivalries**: Pairs that dropped below -0.28
- **Memory Count**: New memories created during phase

### 🔍 Developer Telemetry

#### Console Output

Open DevTools console (F12) to see:
- Formatted tables for all metrics
- Complete action log with timestamps
- Relationship deltas with before/after values
- Access paths to stored data

#### Data Access

```javascript
// Latest phase summary (structured object)
game.__latestSocialSummary

// JSON string (for sharing/debugging)
game.__latestSocialSummaryJSON

// Session history (last 20 phases)
game.__socialManeuversSessionLogs
```

#### Summary Structure

```javascript
{
  metadata: {
    week: 1,
    startTime: 1760564422266,
    endTime: 1760564432468,
    duration: 10202,
    playersCount: 4
  },
  resources: {
    energySpent: { "Player1": 3, "Player2": 2, ... },
    energyRemaining: { "Player1": 0, "Player2": 1, ... }
  },
  actions: {
    total: 5,
    byPlayer: { "Player1": 2, "Player2": 1, ... },
    byCategory: { "friendly": 3, "strategic": 1, ... },
    list: [
      {
        timestamp: 1760564425123,
        actorId: 1,
        actorName: "Alice",
        targetId: 2,
        targetName: "Bob",
        actionId: "smalltalk",
        actionLabel: "Small Talk",
        actionCategory: "friendly",
        energyCost: 1,
        outcome: "positive",
        affinityBefore: 0.0,
        affinityAfter: 0.071,
        affinityDelta: 0.071
      },
      // ...
    ]
  },
  relationships: {
    changes: [
      {
        actor: "Alice",
        target: "Bob",
        delta: 0.071,
        newAffinity: 0.071,
        state: "Neutral"
      },
      // ...
    ],
    newAlliances: [
      { player1: "Alice", player2: "Carol", affinity: 0.32 }
    ],
    newRivalries: [
      { player1: "Bob", player2: "Dana", affinity: -0.35 }
    ]
  },
  memories: {
    created: 5,
    total: 15
  }
}
```

## UI Interactions

### Summary Card

**Buttons:**
- **View Details**: Opens detailed modal with complete phase report
- **Copy JSON**: Copies summary JSON to clipboard for debugging
- **Continue**: Dismisses summary and proceeds to next phase

### Detailed Modal

Shows:
- Phase overview (week, duration, players, actions)
- Energy spent by each player
- All relationship changes with deltas
- Complete action log with timestamps
- Developer access information

## Testing

### Unit Tests

Run `test_social_maneuvers_summary.html` to verify:
- Module loading
- Session tracking
- Action recording
- Summary generation
- JSON export
- Console output
- UI rendering

### Integration Test

Run `test_social_integration_summary.html` to verify:
- Full game flow integration
- Automatic phase end summary
- Data persistence
- UI consistency

## Configuration

The feature is **enabled by default** via the Social Maneuvers system.

To check status:
```javascript
SocialManeuvers.isEnabled() // Returns true/false
```

To disable (not recommended):
```javascript
game.cfg.enableSocialManeuvers = false
```

## Implementation Details

### Session Tracking

During social phase:
1. `onSocialPhaseStart()` initializes session tracking
2. Each `executeAction()` records complete action data
3. Relationship deltas tracked automatically
4. Energy expenditure monitored per player

### Phase End

When social phase ends:
1. `onSocialPhaseEnd()` triggered by `social.js`
2. `generatePhaseSummary()` compiles all data
3. `exportSessionLog()` saves to session history
4. `logToConsole()` outputs formatted tables
5. `showSummaryPanel()` displays UI summary

### Memory Management

- Session logs limited to last 20 entries
- Old entries automatically pruned
- Action history limited to 50 entries per player pair
- Efficient Map-based tracking

## Relationship State Mapping

| Affinity Range | State Label |
|----------------|-------------|
| ≥ 0.65 | Romance/Bromance |
| ≥ 0.48 | Ride or Die |
| ≥ 0.28 | **Allies** (threshold) |
| ≥ 0.12 | Friendly |
| -0.12 to 0.12 | Neutral |
| ≤ -0.12 | Strained |
| ≤ -0.28 | **Enemies** (threshold) |
| ≤ -0.48 | Arch Enemies |

## Visual Design

- **Colors**: Consistent with game theme
  - Energy: #f39c12 (orange)
  - Actions: #9b59b6 (purple)
  - Relationships: #e74c3c (red/pink)
  - Alliances: #27ae60 (green)
  - Rivalries: #c0392b (dark red)
  
- **Animations**:
  - `popIn`: Entrance animation (scale + translate)
  - `popOut`: Exit animation (scale + fade)
  
- **Style**: Glassmorphism matching existing cards
  - Backdrop blur
  - Semi-transparent backgrounds
  - Subtle gradients
  - Smooth shadows

## Troubleshooting

### Summary not appearing

Check:
1. Social Maneuvers enabled: `SocialManeuvers.isEnabled()`
2. Phase ended properly: Look for console message
3. Actions were executed during phase
4. No JavaScript errors in console

### Data not accessible

Verify:
```javascript
// Should exist after phase end
game.__socialManeuversSession // Current phase
game.__latestSocialSummary // Latest summary
game.__socialManeuversSessionLogs // History
```

### Console output missing

- Open DevTools before phase ends
- Check console filters (should show all levels)
- Look for grouped output: "🎭 Social Maneuvers Phase Summary"

## Future Enhancements

Potential improvements:
- Export to downloadable JSON file
- Session comparison tool
- Trend analysis across weeks
- Player performance metrics
- Relationship network visualization
- Custom reporting filters

---

**Version**: 1.0.0  
**Last Updated**: October 15, 2025  
**Status**: ✅ Production Ready
