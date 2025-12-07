# Social Phase Engine & Bridge Modules

This directory contains the social phase engine, AI decision policy, and bridge modules that orchestrate AI social interactions with energy budgets, relationship tracking, and diary room integration.

## Overview

The Social Phase Engine ensures AI players spend ≥60% of their social energy per phase through multi-step interactions, updating bonds/alliances/enemies, and emitting rich diary room entries with interactive alerts.

## Core Modules

### social-engine.js
**Purpose**: Core orchestration for AI social phase spending and multi-step interactions.

**Features**:
- Computes energy budgets for AI players (60-90% of available energy)
- Orchestrates multi-step interaction sequences (3-8 actions per player)
- Tracks energy spending and action counts per player
- Updates relationships based on action outcomes
- Emits interactive alerts for major events (alliances, betrayals, fights, romances)
- Generates comprehensive phase reports

**Debug API**:
```javascript
// Start phase manually (for testing)
window.__socialSim.startPhaseDebug();

// End phase manually
window.__socialSim.endPhaseDebug();

// View last phase report
window.__socialSim.dumpLastPhase();

// View current budgets
window.__socialSim.getBudgets();

// Get phase status
window.__socialSim.getStatus();
```

**Events Emitted**:
- `social.engine:ready` - When phase budgets are computed
- `social.engine:complete` - When phase ends with report
- `dr:alert` - For big events (alliance, betrayal, fight, romance)

### social-policy.js
**Purpose**: Decision policy for selecting actions and targets based on game context.

**Features**:
- Weighted action selection based on weekly biases
- Target scoring with affinity, role context, and traits
- Configurable action categories (friendly, strategic, aggressive, alliance)
- Week-based aggression and alliance formation rates
- Outcome computation for relationship impacts

**Usage**:
```javascript
// Choose action for a player
const action = SocialPolicy.chooseActionFor(player, context);

// Choose targets for an action
const targets = SocialPolicy.chooseTargetsFor(player, action, context);

// Compute affinity delta for outcome
const delta = SocialPolicy.computeOutcomeDelta(action, actor, target, 'success');
```

### social-influence.js
**Purpose**: Downstream influence system for nomination/veto decisions.

**Features**:
- Computes bounded bias for nomination decisions
- Computes bounded bias for veto save decisions
- Emits `social.influence:update` events with weights
- Respects alliance/enemy relationships and event tags
- Configurable influence bounds (additive, not replacement)

**Debug API**:
```javascript
// Compute nomination bias
const bias = window.__socialInfluence.computeNomBias(actorId, targetId);

// Compute veto save bias
const bias = window.__socialInfluence.computeVetoBias(actorId, targetId);

// Trigger influence update
window.__socialInfluence.update(actorId, 'nomination', eligibleTargets);
```

**Events Emitted**:
- `social.influence:update` - Influence weights for decisions

### config/social-sim.cfg.json
**Purpose**: Comprehensive configuration for social simulation.

**Configuration Sections**:
- `energySpending` - Budget calculation (targetSpendPctRange, minActionsPerPlayer, maxActionsPerPlayer)
- `actionWeights` - Base weights for action categories
- `targetSelection` - Affinity bias, role context weights, trait effects
- `weeklyBiases` - Aggression, alliance formation, betrayal risk by week
- `relationshipThresholds` - Alliance/enemy levels, event thresholds
- `influenceBounds` - Nomination and veto save bias bounds
- `alertTriggers` - Conditions for interactive alerts
- `simulator` - Fallback settings
- `debug` - Logging flags

## Bridge Modules

### social-ai-autostart.js
**Purpose**: Automatically drives AI social actions during the social phase with budget awareness.

**Features**:
- Listens for social phase start/end events
- Integrates with SocialEngine for budget-aware ticking
- Automatically stops when all AI players reach their budgets
- Falls back to legacy AI scheduler if engine not available
- Conservative tick interval (375ms by default)

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
**Purpose**: Builds canonical social summaries with spicy narratives and categorized highlights.

**Features**:
- Listens for social phase end events
- Rebuilds summary from `game.__socialManeuversSessionLogs`
- Generates spicy user stories with randomized templates
- Categorizes highlights (alliances, betrayals, fights, romances, group events)
- Emits interactive alerts for major events
- Emits `social.summary:updated`, `dr:entry`, and `dr:alert` events

**Highlight Categories**:
- 🤝 **Alliances** - Alliance formations (with alerts for level 2+)
- 😱 **Betrayals** - Rumor spreading, secret exposing (alerts for affinity drop ≤ -0.06)
- 💥 **Fights** - Major blowups and confrontations (alerts for affinity drop ≤ -0.08)
- 💕 **Romances** - Bromances and showmances (alerts for very high affinity)
- 👥 **Group Events** - Multi-player interactions
- 📋 **General** - Other notable interactions

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

### Testing Social Engine

1. **Start a new game** or load an existing save
2. **Open browser console** (F12 or Cmd+Opt+I)
3. **Navigate to social phase** (or trigger it manually)
4. **Verify engine initializes**:
   ```javascript
   window.__socialSim.getStatus();
   // Should show: { phaseActive: true, playerCount: N, budgets: [...] }
   ```
5. **Check player budgets**:
   ```javascript
   window.__socialSim.getBudgets();
   // Shows energy budgets, spent amounts, and target actions
   ```
6. **Watch console for AI actions**:
   - Look for `[social-engine] ✓ Player → action → Target` messages
   - Verify ≥60% energy spending across players
7. **View phase report after completion**:
   ```javascript
   window.__socialSim.dumpLastPhase();
   // Shows summary table with spend percentages
   ```
8. **Manual phase control** (for testing):
   ```javascript
   // Force start phase
   window.__socialSim.startPhaseDebug();
   
   // Force end phase
   window.__socialSim.endPhaseDebug();
   ```

### Testing AI Auto-Driver

1. **Start a social phase**
2. **Verify auto-driver integration**:
   ```javascript
   window.__smAutoDriver.getStatus();
   // Should show: { isRunning: true, tickCount: > 0, ... }
   ```
3. **Watch for budget-aware stopping**:
   - Driver should automatically stop when all players reach budgets
   - Look for `[social-ai-autostart] ✓ All AI players have reached their budgets - stopping`
4. **Manually control auto-driver**:
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
   - `highlights` should be an object with categorized arrays:
     - `alliances`, `betrayals`, `fights`, `romances`, `groupEvents`, `general`
   - `highlights.alerts` should contain interactive alert objects
   - `actionLog` should list all actions with actor/target names
5. **Verify spicy narratives**:
   - Highlights should use varied, engaging language
   - Check for randomized templates (run multiple phases)
6. **Manually rebuild summary**:
   ```javascript
   window.__rebuildSocialSummary();
   ```

### Testing Interactive Alerts

1. **Complete a social phase** with significant events
2. **Check console for alert emissions**:
   - Look for `[social-summary-bridge] 🚨 Emitted dr:alert: type`
   - Look for `[social-engine] 🚨 Alert: type - Player & Player`
3. **Verify alert conditions**:
   - **Alliance alerts**: When alliance level ≥ 2
   - **Betrayal alerts**: When affinity drop ≤ -0.06
   - **Fight alerts**: When affinity drop ≤ -0.08
   - **Romance alerts**: When affinity change > 0.12
4. **Check diary entries**:
   ```javascript
   // Get all diary entries including alerts
   const entries = window.__drBridge.getEntries();
   
   // Filter for alert entries
   const alerts = entries.filter(e => e.category === 'social_alert');
   console.table(alerts);
   ```

### Testing Relationship Tracking

1. **Complete a social phase** with varied interactions
2. **Check relationship tags**:
   ```javascript
   // View all relations for a player
   Relations.showPlayerRelations(playerId);
   
   // View all relations in game
   Relations.showAllRelations();
   
   // Check for event tags
   Relations.hasEventTag(playerA, playerB, 'betrayal');
   Relations.getEventTags(playerA, playerB);
   ```
3. **Verify multi-level tracking**:
   - Look for `ally_level1`, `ally_level2`, `ally_level3`
   - Look for `enemy_level1`, `enemy_level2`, `enemy_level3`
4. **Check event tagging**:
   - Events should be tagged: `betrayal`, `fight`, `romance`, `bromance`
   - Look for console messages: `[Relations] 🏷️ Tagged eventType: Player ↔ Player`

### Testing Influence System

1. **Navigate to nomination phase** or veto decision
2. **Check influence computation**:
   ```javascript
   // Compute nomination bias
   const nomBias = window.__socialInfluence.computeNomBias(hohId, targetId);
   console.log('Nomination bias:', nomBias);
   
   // Compute veto save bias
   const vetoBias = window.__socialInfluence.computeVetoBias(vetoHolderId, nomineeId);
   console.log('Veto save bias:', vetoBias);
   ```
3. **Verify bounded influence**:
   - Nomination bias should be between -0.15 and 0.15
   - Veto save bias should be between -0.1 and 0.2
4. **Listen for influence events**:
   ```javascript
   game.bus.on('social.influence:update', (data) => {
     console.log('Influence update:', data);
     console.table(data.weights);
   });
   ```
5. **Verify influence factors**:
   - Allies should have positive nomination bias (less likely to nominate)
   - Enemies should have negative nomination bias (more likely to nominate)
   - High-level allies should have high veto save bias
   - Betrayal tags should increase likelihood of nomination

### Testing Diary Room Integration

1. **Complete a social phase**
2. **Open Diary Room modal** (if available in UI)
3. **Verify social phase entry exists**:
   - Should see "Week X Social Phase" entry
   - Entry should show action count
   - Entry should show categorized highlights (alliances, betrayals, fights, romances)
   - Entry should list most active players
4. **Verify alert entries**:
   - Interactive alerts should appear as separate entries
   - Alerts should have `interactive: true` flag
   - Alert severity should be set appropriately
5. **Check entries programmatically**:
   ```javascript
   // Get all diary entries
   const entries = window.__drBridge.getEntries();
   console.log(entries);
   
   // Find social summary entries
   const socialEntries = entries.filter(e => e.type === 'social_summary');
   console.log(socialEntries);
   
   // Find alert entries
   const alerts = entries.filter(e => e.category === 'social_alert');
   console.table(alerts);
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
