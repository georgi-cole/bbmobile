# Social Phase Simulator

## Overview

The Social Phase Simulator generates realistic NPC-to-NPC and NPC-to-player interactions during social phases. It produces event payloads identical to those from player actions, allowing the DiaryRoomLogger to capture organic social dynamics in the Diary Room logs.

## Features

### Core Functionality

- **Automated NPC Interactions**: Simulates social actions between non-player characters during social phases
- **Event-Driven Architecture**: Emits standard game bus events that integrate seamlessly with existing systems
- **Energy Budget Management**: Respects per-phase energy pools with configurable defaults
- **Intelligent Action Selection**: Uses configurable heuristics for realistic behavior:
  - Sociability-weighted actor selection
  - Bond-aware target selection
  - Probability-based action type selection
  - Success rates influenced by social stats and relationships
- **Bond Tracking**: Maintains in-memory bond map and emits bond shift events
- **Phase Summaries**: Produces comprehensive phase-end summaries with action and bond shift arrays

### Event Integration

The simulator emits three types of events that are consumed by DiaryRoomLogger:

1. **`social.action:result`** - Emitted for each NPC action
2. **`bond.shift`** - Emitted when relationships change
3. **`social.phase:end`** - Phase summary with complete action log

## Architecture

### Module: `js/dr/socialSimulator.js`

The Social Simulator is implemented as an ES module following the repository's existing patterns.

**Key Components:**

- **Initialization**: Registers with event bus and applies configuration
- **Simulation Engine**: Runs NPC action loops during social phases
- **Action Selection**: Weighted random selection based on probabilities
- **Success Calculation**: Formula-based success rates using social stats
- **Bond Management**: In-memory bond map with delta tracking
- **Event Emission**: Standard payload structures for DiaryRoomLogger compatibility

## Configuration

### Default Configuration

```javascript
{
  enabled: true,                    // Enable/disable simulator
  defaultEnergy: 5,                 // Default energy per NPC per phase
  skipLocalPlayer: false,           // Exclude human player from simulations
  maxActionsPerPhase: 50,          // Safety limit for total actions
  
  // Action type configurations
  actionTypes: {
    compliment: {
      probability: 0.25,            // Relative probability (normalized)
      energyCost: 1,                // Energy cost per action
      bondDelta: [0.02, 0.10]      // [min, max] bond change range
    },
    flirt: {
      probability: 0.15,
      energyCost: 1,
      bondDelta: [0.03, 0.12]
    },
    gossip: {
      probability: 0.20,
      energyCost: 1,
      bondDelta: [-0.05, 0.08]
    },
    bribe: {
      probability: 0.10,
      energyCost: 2,
      bondDelta: [0.05, 0.15]
    },
    lie: {
      probability: 0.08,
      energyCost: 2,
      bondDelta: [-0.15, -0.05]
    },
    insult: {
      probability: 0.05,
      energyCost: 1,
      bondDelta: [-0.20, -0.08]
    },
    backstab: {
      probability: 0.05,
      energyCost: 2,
      bondDelta: [-0.25, -0.12]
    },
    strategize: {
      probability: 0.12,
      energyCost: 1,
      bondDelta: [0.05, 0.15]
    }
  },
  
  // Behavior tuning
  sociabilityWeight: 0.3,           // Weight of persona.aggr in actor selection
  baseSuccessRate: 0.6,             // Base success probability
  statInfluence: 0.05               // Influence of social stats on success
}
```

### Customization

Initialize with custom configuration:

```javascript
SocialSimulator.init({
  enabled: true,
  defaultEnergy: 8,
  skipLocalPlayer: true,
  maxActionsPerPhase: 40,
  
  // Override action probabilities
  actionTypes: {
    compliment: { probability: 0.30, energyCost: 1, bondDelta: [0.02, 0.10] },
    backstab: { probability: 0.02, energyCost: 3, bondDelta: [-0.30, -0.15] }
  },
  
  // Adjust behavior
  sociabilityWeight: 0.5,
  baseSuccessRate: 0.7
});
```

### Runtime Adjustment

Access and modify config at runtime:

```javascript
// Increase backstab probability
SocialSimulator.config.actionTypes.backstab.probability = 0.10;

// Disable simulator temporarily
SocialSimulator.config.enabled = false;

// Reduce max actions for faster simulations
SocialSimulator.config.maxActionsPerPhase = 20;
```

## Event Payloads

### social.action:result

Emitted for each NPC action during simulation.

```javascript
{
  actor: 2,                    // Actor player ID
  target: 5,                   // Target player ID
  actionType: 'compliment',    // Action type
  action: 'compliment',        // Alternate field for compatibility
  success: true,               // Whether action succeeded
  magnitude: 0.08,             // Bond delta applied
  bondBefore: 0.15,            // Bond value before action
  bondAfter: 0.23,             // Bond value after action
  bondDelta: 0.08,             // Delta (same as magnitude)
  delta: 0.08,                 // Alternate field for compatibility
  outcome: 'success',          // 'success' or 'failure'
  severity: 'neutral'          // 'neutral', 'high', or 'dramatic'
}
```

### bond.shift

Emitted when relationships change significantly (|delta| > 0.01).

```javascript
{
  player1: 2,                  // First player ID
  player2: 5,                  // Second player ID
  actorId: 2,                  // Actor (same as player1)
  targetId: 5,                 // Target (same as player2)
  delta: 0.08                  // Bond change amount
}
```

### social.phase:end

Emitted at the end of simulation with complete phase summary.

```javascript
{
  actions: [                   // Array of all actions
    {
      actor: 2,
      target: 5,
      action: 'compliment',
      success: true,
      magnitude: 0.08,
      bondBefore: 0.15,
      bondAfter: 0.23
    },
    // ... more actions
  ],
  bondShifts: [                // Array of all bond changes
    {
      player1: 2,
      player2: 5,
      delta: 0.08,
      before: 0.15,
      after: 0.23
    },
    // ... more shifts
  ],
  energyUsage: {               // Energy consumed by each player
    '2': 3,
    '3': 5,
    '4': 2
  },
  actionCount: 25,             // Total actions simulated
  week: 3                      // Current game week
}
```

## Usage

### Basic Integration

The simulator is automatically initialized in `js/bootstrap.js` as part of the Diary Room system:

```javascript
function initDiaryRoomSystem() {
  // ... DiaryRoomLogger and DiaryUI init ...
  
  // Initialize Social Simulator
  if (typeof global.SocialSimulator !== 'undefined') {
    global.SocialSimulator.init({
      enabled: true,
      defaultEnergy: 5,
      skipLocalPlayer: false
    });
  }
}
```

### Triggering Simulation

The simulator listens for social phase start events:

```javascript
// From game code, emit social phase start
window.game.bus.emit('social.phase:start', {
  week: window.game.week,
  source: 'competition'
});

// Or alternate event name
window.game.bus.emit('social.phase:run', {
  week: window.game.week
});
```

### Manual Simulation

For testing or special scenarios:

```javascript
// Run simulation directly (bypasses event)
SocialSimulator.runSimulation({
  week: 3,
  source: 'manual'
});
```

## Algorithms

### Actor Selection

Actors are selected using weighted random sampling:

```
weight = (remainingEnergy) * (sociability * sociabilityWeight + 0.7)

where:
  remainingEnergy = player's current energy
  sociability = player.persona.aggr (0-1)
  sociabilityWeight = config parameter (default 0.3)
```

### Target Selection

Targets are selected based on current bond strength:

```
weight = max(0.1, bond/100 + 0.5) * randomFactor

where:
  bond = current bond value (-100 to 100)
  randomFactor = 0.7 to 1.3 (adds unpredictability)
```

Higher bonds are more likely to be selected, but very negative bonds still have a small chance (weight >= 0.1).

### Success Calculation

Success is determined probabilistically:

```
successRate = baseSuccessRate
            + (actorSocial - 0.5) * statInfluence
            + (0.5 - targetResistance) * statInfluence
            + (bondFactor) * 0.1
            + random(-0.1, 0.1)

where:
  baseSuccessRate = config parameter (default 0.6)
  actorSocial = actor.persona.aggr or actor.skill
  targetResistance = 1 - target.persona.loyalty
  bondFactor = currentBond / 100
  statInfluence = config parameter (default 0.05)

successRate is clamped to [0.1, 0.9]
success = random() < successRate
```

### Magnitude Calculation

Bond change magnitude is determined by action config and success:

```
magnitude = min + random() * (max - min)

if (!success):
  magnitude *= 0.5
  if (magnitude > 0 && random() < 0.3):
    magnitude *= -1  // Failed positive actions may backfire
```

### Severity Determination

```
severity = 'dramatic'  if |magnitude| > 0.15 or actionType in ['backstab', 'lie', 'insult']
         = 'high'      if actionType in ['backstab', 'lie', 'insult']
         = 'neutral'   otherwise
```

## Testing

### Test Page

Open `test_social_simulator.html` in a browser to:

1. **Initialize Game**: Creates 8 test players with randomized stats
2. **Run Simulation**: Triggers a full social phase simulation
3. **View Events**: Real-time event log showing all emitted events
4. **Monitor Stats**: Track action count, bond shifts, and dramatic events
5. **Check DR UI**: Watch the Diary Room button blink on dramatic events
6. **Inspect Config**: View current configuration settings

### Test Scenarios

**Scenario 1: Normal Social Phase**
```javascript
// Default configuration, 8 players, 5 energy each
runSimulation();
// Expected: ~20-30 actions, multiple bond shifts, 1-3 dramatic events
```

**Scenario 2: High Conflict**
```javascript
// Increase negative action probabilities
SocialSimulator.config.actionTypes.backstab.probability = 0.20;
SocialSimulator.config.actionTypes.insult.probability = 0.15;
runSimulation();
// Expected: More dramatic events, DR button blinking
```

**Scenario 3: Low Energy**
```javascript
// Reduce energy budget
window.game.players.forEach(p => {
  window.game.__sm_bankEnergy.set(p.id, 2);
});
runSimulation();
// Expected: ~8-12 actions, fewer bond shifts
```

**Scenario 4: Skip Local Player**
```javascript
// Exclude human player from simulation
SocialSimulator.config.skipLocalPlayer = true;
runSimulation();
// Expected: Actions only between NPCs
```

## Integration with Existing Systems

### DiaryRoomLogger

The simulator produces events that DiaryRoomLogger automatically captures:

- **social.action:result** → Creates humanized DR entries using templates
- **bond.shift** → Logs relationship changes
- **social.phase:end** → Creates phase summary entry

No additional integration needed - events flow through existing handlers.

### DiaryUI

Dramatic and high severity events trigger the DR button blinking:

- **backstab/lie/insult** actions → High severity → Orange blink
- **Large bond shifts** (|delta| > 0.15) → Dramatic severity → Red blink

### SocialManeuvers Energy Bank

The simulator reads from the existing energy bank:

```javascript
// Try to get energy from SocialManeuvers
const bankEnergy = SocialManeuvers.SocialEnergyBank.get(playerId);

// Fallback to default if bank unavailable
const energy = bankEnergy || config.defaultEnergy;
```

### Game Relationships

The simulator initializes from and updates game relationships:

```javascript
// Read from game.relationships
const bondMap = initializeBondMap(activePlayers);

// Bond changes are tracked but NOT written back to game.relationships
// This allows simulation to be non-destructive for testing
```

## Customization Examples

### Peaceful House

Make interactions more positive:

```javascript
SocialSimulator.init({
  actionTypes: {
    compliment: { probability: 0.40, energyCost: 1, bondDelta: [0.05, 0.15] },
    flirt: { probability: 0.20, energyCost: 1, bondDelta: [0.05, 0.15] },
    strategize: { probability: 0.20, energyCost: 1, bondDelta: [0.05, 0.15] },
    gossip: { probability: 0.15, energyCost: 1, bondDelta: [0.00, 0.05] },
    backstab: { probability: 0.02, energyCost: 3, bondDelta: [-0.15, -0.08] },
    insult: { probability: 0.02, energyCost: 2, bondDelta: [-0.15, -0.08] },
    lie: { probability: 0.01, energyCost: 2, bondDelta: [-0.10, -0.05] }
  }
});
```

### Chaotic Season

Increase drama and negative actions:

```javascript
SocialSimulator.init({
  actionTypes: {
    backstab: { probability: 0.15, energyCost: 2, bondDelta: [-0.30, -0.15] },
    lie: { probability: 0.15, energyCost: 2, bondDelta: [-0.20, -0.10] },
    insult: { probability: 0.10, energyCost: 1, bondDelta: [-0.25, -0.10] },
    gossip: { probability: 0.25, energyCost: 1, bondDelta: [-0.10, 0.05] },
    compliment: { probability: 0.10, energyCost: 1, bondDelta: [0.02, 0.08] }
  },
  baseSuccessRate: 0.5  // Lower success rate = more chaos
});
```

### Energy-Rich Environment

Give NPCs more actions per phase:

```javascript
SocialSimulator.init({
  defaultEnergy: 10,
  maxActionsPerPhase: 80
});
```

### Deterministic Testing

For reproducible tests, disable randomness:

```javascript
// Disable simulator for deterministic testing
SocialSimulator.config.enabled = false;

// Or set fixed probabilities
SocialSimulator.config.actionTypes = {
  compliment: { probability: 1.0, energyCost: 1, bondDelta: [0.05, 0.05] }
};
```

## Performance Considerations

- **Simulation Complexity**: O(n²) where n = number of active players
- **Max Actions Limit**: Prevents infinite loops (default 50 actions)
- **Event Emission**: Lightweight, uses native event bus
- **Memory Usage**: Bond map is temporary (not persisted)

Typical simulation with 8 players:
- ~20-30 actions
- ~15-25 bond shifts
- ~50-100ms execution time

## Troubleshooting

### No Actions Generated

1. Check that players have energy:
   ```javascript
   window.game.__sm_bankEnergy.forEach((energy, playerId) => {
     console.log(`Player ${playerId}: ${energy} energy`);
   });
   ```

2. Verify simulator is enabled:
   ```javascript
   console.log('Enabled:', SocialSimulator.config.enabled);
   ```

3. Check event bus connection:
   ```javascript
   console.log('Bus:', window.game.bus || window.bbGameBus);
   ```

### DR Button Not Blinking

1. Verify DiaryUI is initialized:
   ```javascript
   console.log('DiaryUI initialized:', typeof window.DiaryUI !== 'undefined');
   ```

2. Check for dramatic events:
   ```javascript
   // Look for high/dramatic severity in logs
   ```

3. Ensure button element exists:
   ```javascript
   console.log('Button:', document.querySelector('#btnDiaryRoom'));
   ```

### Incorrect Bond Values

1. Check initial bond map initialization
2. Verify magnitude calculation
3. Ensure bond key generation is consistent

## Future Enhancements

Potential additions:

1. **Alliance-Aware Actions**: Weight actions based on alliance memberships
2. **Personality Archetypes**: Pre-configured behavior profiles (e.g., "Villain", "Social Butterfly")
3. **Event Triggers**: React to game events (nominations, evictions)
4. **Memory System**: NPCs remember past interactions
5. **Conflict Escalation**: Negative spirals between rivals
6. **Action Chains**: Sequential actions between same players
7. **Group Dynamics**: Multi-player interactions (gossip circles)
8. **Influence Propagation**: Actions affect bystanders

## License

Part of the BBMobile game codebase. See main project license.
