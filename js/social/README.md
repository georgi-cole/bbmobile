# Social Maneuvers Bridge Modules

This directory contains bridge modules that enhance the social maneuvers system with automatic AI actions and diary room integration.

## Modules

### social-ai-autostart.js
**Purpose**: Automatically drives AI social actions during the social phase.

**Features**:
- Listens for social phase start/end events
- Automatically ticks the AI scheduler at a conservative interval (375ms by default)
- Defensive event handling (supports multiple event name variants)
- Graceful handling of missing dependencies

**Debug API**:
```javascript
// Start auto-driver manually
window.__smAutoDriver.start();

// Stop auto-driver
window.__smAutoDriver.stop();

// Check status
window.__smAutoDriver.getStatus();
// Returns: { isRunning: boolean, tickCount: number, config: {...} }
```

**Configuration**:
```javascript
window.game.cfg.smAutoDriverEnabled = true;     // Enable/disable (default: true)
window.game.cfg.smAutoDriverInterval = 375;      // Tick interval in ms (default: 375)
window.game.cfg.smAutoDriverVerbose = false;     // Verbose logging (default: false)
```

### social-summary-bridge.js
**Purpose**: Builds canonical social summaries with highlights from session logs.

**Features**:
- Listens for social phase end events
- Rebuilds summary from `game.__socialManeuversSessionLogs`
- Generates highlights from actions and affinity changes
- Emits `social.summary:updated` and `dr:entry` events
- Stores summary in `game.__latestSocialSummary`

**Highlights Generated**:
- Alliance formations
- Group hangouts
- Betrayals and backstabs
- Positive interactions (bromances)
- Notable conflicts (beef)
- Failed aggressive actions

**Debug API**:
```javascript
// Manually rebuild social summary
window.__rebuildSocialSummary();

// Get latest summary
window.game.__latestSocialSummary;

// Get summary as JSON
window.game.__latestSocialSummaryJSON;
```

**Configuration**:
```javascript
window.game.cfg.socialHighlightsMax = 5;              // Max highlights (default: 5)
window.game.cfg.socialHighlightsMinDelta = 0.05;      // Min affinity change (default: 0.05)
window.game.cfg.socialHighlightsSignificantDelta = 0.08;  // Significant delta for bromance (default: 0.08)
window.game.cfg.socialSummaryVerbose = false;          // Verbose logging (default: false)
```

### sm-exec-normalize.js
**Purpose**: Defensive cost normalization for `executeAction`.

**Features**:
- Patches `SocialManeuvers.getActionById` to normalize cost shapes
- Handles malformed costs (objects vs numbers)
- Coerces string costs to numbers
- Extracts numeric values from object-like cost structures

**Debug API**:
```javascript
// Normalize a cost value
window.__smCostNormalize.normalizeCost(costValue);

// Normalize an action's cost structure
window.__smCostNormalize.normalizeActionCosts(action);
```

**Configuration**:
```javascript
window.game.cfg.smExecNormalizeEnabled = true;   // Enable/disable (default: true)
window.game.cfg.smExecNormalizeVerbose = false;  // Verbose logging (default: false)
```

### ../dr/diary-room-bridge.js
**Purpose**: Integrates social summaries into DiaryRoomLogger.

**Features**:
- Ensures `DiaryRoomLogger._entries` array exists
- Adds `DiaryRoomLogger.getEntries()` method
- Listens for `social.summary:updated` events
- Converts summaries to diary entry format
- Emits `dr:entry` events for UI consumption

**Debug API**:
```javascript
// Get all diary entries
window.__drBridge.getEntries();

// Add a custom diary entry
window.__drBridge.addDiaryEntry(entry);

// Convert summary to diary format
window.__drBridge.convertSummaryToDiaryEntry(summary);
```

**Configuration**:
```javascript
window.game.cfg.drBridgeEnabled = true;    // Enable/disable (default: true)
window.game.cfg.drBridgeVerbose = false;   // Verbose logging (default: false)
```

## Manual Testing / QA Checklist

### Testing AI Auto-Driver

1. **Start a new game** or load an existing save
2. **Open browser console** (F12 or Cmd+Opt+I)
3. **Navigate to social phase** (or trigger it manually)
4. **Verify auto-driver starts**:
   ```javascript
   window.__smAutoDriver.getStatus();
   // Should show: { isRunning: true, tickCount: > 0, ... }
   ```
5. **Watch console for AI actions**:
   - Look for `[social-ai-autostart] Tick #X` messages
   - Look for `[social-maneuvers] ✓ Action executed` messages
6. **Manually control auto-driver**:
   ```javascript
   // Stop auto-driver
   window.__smAutoDriver.stop();
   
   // Start auto-driver
   window.__smAutoDriver.start();
   ```

### Testing Social Summary & Highlights

1. **Complete a social phase** with multiple AI actions
2. **Check console for summary messages**:
   - Look for `[social-summary-bridge] ✓ Summary built: X actions, Y highlights`
3. **Inspect the summary**:
   ```javascript
   // View latest summary
   console.log(window.game.__latestSocialSummary);
   
   // View as JSON
   console.log(window.game.__latestSocialSummaryJSON);
   ```
4. **Verify summary contents**:
   - `totalActions` should match action count
   - `energySpentByPlayer` should have entries for active players
   - `highlights` should contain 0-5 highlight strings
   - `actionLog` should list all actions with actor/target names
5. **Manually rebuild summary**:
   ```javascript
   window.__rebuildSocialSummary();
   ```

### Testing Diary Room Integration

1. **Complete a social phase**
2. **Open Diary Room modal** (if available in UI)
3. **Verify social phase entry exists**:
   - Should see "Week X Social Phase" entry
   - Entry should show action count
   - Entry should show highlights (if any)
   - Entry should list most active players
4. **Check entries programmatically**:
   ```javascript
   // Get all diary entries
   const entries = window.__drBridge.getEntries();
   console.log(entries);
   
   // Find social summary entries
   const socialEntries = entries.filter(e => e.type === 'social_summary');
   console.log(socialEntries);
   ```

### Testing Cost Normalization

1. **Trigger actions with various cost structures**:
   ```javascript
   // Test with numeric cost
   SocialManeuvers.executeAction(actorId, targetId, 'compliment');
   
   // Test with object cost (if any exist)
   // Should be normalized transparently
   ```
2. **Check normalization helpers**:
   ```javascript
   // Test normalization
   window.__smCostNormalize.normalizeCost(5);           // → 5
   window.__smCostNormalize.normalizeCost("10");        // → 10
   window.__smCostNormalize.normalizeCost({energy: 3}); // → 3
   ```

## Integration Points

These modules integrate with:

1. **social-maneuvers.js** - Core social system
2. **social-ai-scheduler.js** - AI action scheduler
3. **bbGameBus.js** - Event bus for coordination
4. **diaryRoomLogger.js** - Diary entry system

## Events Emitted

- `social.summary:updated` - Emitted when summary is rebuilt
- `dr:entry` - Emitted when diary entry is created

## Events Consumed

- `social.phase:start` / `social-phase:start` / `social:start` - Start auto-driver
- `social.phase:end` / `social-phase:end` / `social:end` - Stop auto-driver, build summary

## Data Storage

- `window.game.__latestSocialSummary` - Latest summary object
- `window.game.__latestSocialSummaryJSON` - Latest summary as JSON string
- `window.game.__socialManeuversSessionLogs` - Array of all session logs
- `window.DiaryRoomLogger._entries` - Array of diary entries

## Troubleshooting

### Auto-driver not starting
- Check `window.__smAutoDriver.getStatus()` - is `isRunning` false?
- Check `window.game.cfg.smAutoDriverEnabled` - is it true?
- Check console for error messages
- Try manual start: `window.__smAutoDriver.start()`

### No highlights generated
- Check if actions occurred: `window.game.__socialManeuversSessionLogs`
- Check config: `window.game.cfg.socialHighlightsMax`
- Try manual rebuild: `window.__rebuildSocialSummary()`

### Diary entries not showing
- Check `window.__drBridge.getEntries()` - are entries present?
- Check `window.DiaryRoomLogger` - is it defined?
- Check console for bridge initialization messages
- Verify `window.game.cfg.drBridgeEnabled` is true

### Cost normalization issues
- Check `window.__smCostNormalize` - is it defined?
- Check `window.game.cfg.smExecNormalizeEnabled` is true
- Try manual normalization to test: `window.__smCostNormalize.normalizeCost(value)`

## Performance Considerations

- Auto-driver ticks at 375ms by default (conservative)
- Summary rebuilding is deferred 100ms after phase end
- Cost normalization has minimal overhead
- All modules are defensive and handle missing dependencies

## Safety & Rollback

All modules can be disabled via config flags:
```javascript
window.game.cfg.smAutoDriverEnabled = false;
window.game.cfg.smExecNormalizeEnabled = false;
window.game.cfg.drBridgeEnabled = false;
```

To completely remove functionality, delete or comment out script imports in bootstrap.js.
