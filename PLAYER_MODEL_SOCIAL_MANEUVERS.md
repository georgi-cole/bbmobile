# Player Model Social Maneuvers Enhancement

## Overview

The player model has been expanded to support the Social Maneuvers system with new properties and helper methods. This enables advanced social logic and tracking for future social maneuvers features.

## New Player Properties

Each player object now includes the following social maneuvers properties:

### `socialTraits` (Array)
- **Type**: `Array<string>`
- **Description**: 2-3 randomly selected social traits that define the player's social behavior
- **Example**: `['loyal', 'observant', 'charismatic']`
- **Available Traits**:
  - `loyal` - Sticks with alliances
  - `deceptive` - Good at hiding true intentions
  - `gullible` - Easily persuaded
  - `persuasive` - Effective at convincing others
  - `observant` - Notices social dynamics
  - `charismatic` - Naturally likeable
  - `manipulative` - Good at social maneuvering
  - `trustworthy` - Others trust them easily
  - `skeptical` - Questions motives
  - `empathetic` - Understands others' emotions

### `influence` (Number)
- **Type**: `number` (0-100)
- **Description**: Represents the player's ability to persuade and affect other players
- **Default**: 50 for human players, 30-70 (random) for AI players
- **Usage**: Used in social interaction calculations and persuasion attempts

### `information` (Number)
- **Type**: `number` (0-100)
- **Description**: Represents the player's knowledge of house dynamics and game state
- **Default**: 50 for human players, 30-70 (random) for AI players
- **Usage**: Affects strategic decision-making and awareness of alliances/threats

### `memoryLog` (Array)
- **Type**: `Array<Object>`
- **Description**: Records significant events and interactions for the player
- **Structure**:
  ```javascript
  {
    week: 1,              // Game week when event occurred
    timestamp: 12345678,  // Unix timestamp
    event: 'alliance_formed',  // Event type
    targetId: 2,          // Optional player ID involved
    details: {}           // Additional event-specific data
  }
  ```
- **Max Size**: Automatically limited to 100 entries (oldest removed first)

## Helper Functions

### Trait Management

#### `generateSocialTraits()`
Generates 2-3 random traits for a new player.

```javascript
const traits = generateSocialTraits();
// Returns: ['persuasive', 'observant']
```

#### `hasTrait(playerId, trait)`
Checks if a player has a specific trait (case-insensitive).

```javascript
const hasLoyal = hasTrait(1, 'loyal');  // true/false
const hasLOYAL = hasTrait(1, 'LOYAL');  // case-insensitive
```

**Parameters:**
- `playerId` (number): The player's ID
- `trait` (string): The trait to check for

**Returns:** `boolean`

### Influence & Information

#### `getInfluence(playerId)`
Gets a player's current influence value.

```javascript
const influence = getInfluence(1);  // Returns 0-100
```

**Returns:** `number` (0-100, defaults to 50 if player not found)

#### `getInformation(playerId)`
Gets a player's current information value.

```javascript
const info = getInformation(1);  // Returns 0-100
```

**Returns:** `number` (0-100, defaults to 50 if player not found)

#### `updateInfluence(playerId, delta)`
Updates a player's influence by a delta value (automatically clamped to 0-100).

```javascript
updateInfluence(1, 10);   // Increase by 10
updateInfluence(1, -5);   // Decrease by 5
```

**Parameters:**
- `playerId` (number): The player's ID
- `delta` (number): Amount to change (positive or negative)

#### `updateInformation(playerId, delta)`
Updates a player's information by a delta value (automatically clamped to 0-100).

```javascript
updateInformation(1, 15);  // Increase by 15
updateInformation(1, -10); // Decrease by 10
```

**Parameters:**
- `playerId` (number): The player's ID
- `delta` (number): Amount to change (positive or negative)

### Memory Log

#### `recordEvent(playerId, event, targetId, details)`
Records an event in a player's memory log.

```javascript
recordEvent(1, 'alliance_formed', 2, { 
  allianceName: 'The Cool Kids',
  initiator: true 
});

recordEvent(1, 'betrayal', 3, {
  action: 'nominated',
  week: 5
});

recordEvent(1, 'conversation', null, {
  topic: 'strategy',
  outcome: 'positive'
});
```

**Parameters:**
- `playerId` (number): The player's ID
- `event` (string): Event type (e.g., 'alliance_formed', 'betrayal', 'conversation')
- `targetId` (number|null): Optional target player ID
- `details` (object): Additional event data

#### `getMemoryLog(playerId, filters)`
Retrieves a player's memory log with optional filtering.

```javascript
// Get all events
const allEvents = getMemoryLog(1);

// Filter by event type
const alliances = getMemoryLog(1, { event: 'alliance_formed' });

// Filter by target player
const eventsWithPlayer2 = getMemoryLog(1, { targetId: 2 });

// Filter by week
const week5Events = getMemoryLog(1, { week: 5 });

// Combine filters
const betrayalsInWeek5 = getMemoryLog(1, { 
  event: 'betrayal', 
  week: 5 
});
```

**Parameters:**
- `playerId` (number): The player's ID
- `filters` (object): Optional filters
  - `event` (string): Filter by event type
  - `targetId` (number): Filter by target player
  - `week` (number): Filter by game week

**Returns:** `Array<Object>` - Filtered memory log entries

### Backward Compatibility

#### `initSocialManeuversProps(force)`
Initializes social maneuvers properties for existing players (useful for save games or backward compatibility).

```javascript
// Initialize missing properties only
initSocialManeuversProps();

// Force regenerate all properties
initSocialManeuversProps(true);
```

**Parameters:**
- `force` (boolean): If true, regenerates properties even if they exist

## Usage Examples

### Example 1: Check Player Traits in Decision Logic

```javascript
function shouldPlayerFormAlliance(playerId, targetId) {
  // Loyal players are more likely to form lasting alliances
  if (hasTrait(playerId, 'loyal')) {
    return true;
  }
  
  // Skeptical players need high influence from target
  if (hasTrait(playerId, 'skeptical')) {
    return getInfluence(targetId) > 70;
  }
  
  return false;
}
```

### Example 2: Track Social Interactions

```javascript
function handleSocialConversation(actorId, targetId, topic) {
  // Record the conversation
  recordEvent(actorId, 'conversation', targetId, {
    topic: topic,
    timestamp: Date.now()
  });
  
  // Update influence based on conversation
  if (topic === 'alliance') {
    updateInfluence(actorId, 5);
  }
  
  // Observant players gain information
  if (hasTrait(actorId, 'observant')) {
    updateInformation(actorId, 3);
  }
}
```

### Example 3: Analyze Player History

```javascript
function analyzePlayerRelationship(playerId, targetId) {
  // Get all interactions between two players
  const interactions = getMemoryLog(playerId, { targetId: targetId });
  
  // Count betrayals
  const betrayals = interactions.filter(e => e.event === 'betrayal').length;
  
  // Count alliances
  const alliances = interactions.filter(e => e.event === 'alliance_formed').length;
  
  return {
    totalInteractions: interactions.length,
    betrayals: betrayals,
    alliances: alliances,
    trustScore: alliances - betrayals
  };
}
```

### Example 4: Trait-Based Social Maneuver Success

```javascript
function calculateManeuverSuccess(actorId, targetId, maneuver) {
  let baseChance = 0.5;
  
  // Charismatic players have better success with friendly maneuvers
  if (maneuver === 'friendly' && hasTrait(actorId, 'charismatic')) {
    baseChance += 0.2;
  }
  
  // Manipulative players excel at deception
  if (maneuver === 'deceive' && hasTrait(actorId, 'manipulative')) {
    baseChance += 0.3;
  }
  
  // Gullible targets are easier to influence
  if (hasTrait(targetId, 'gullible')) {
    baseChance += 0.15;
  }
  
  // Influence affects success rate
  const influence = getInfluence(actorId);
  baseChance += (influence - 50) / 200;  // ±0.25 based on influence
  
  return Math.min(0.95, Math.max(0.05, baseChance));
}
```

## Integration with Existing Systems

### With Social Maneuvers Module (`js/social-maneuvers.js`)

The player model properties integrate seamlessly with the existing social maneuvers module:

```javascript
// In social-maneuvers.js, action outcomes can now use traits
function processActionOutcome(actorId, targetId, action) {
  // Use player traits to modify outcomes
  if (hasTrait(actorId, 'persuasive') && action.category === 'strategic') {
    affinityChange += 0.05;  // Bonus for persuasive players
  }
  
  // Record in memory log
  recordEvent(actorId, 'social_action', targetId, {
    action: action.id,
    outcome: outcomeType
  });
  
  // Update influence based on success
  if (outcomeType === 'positive') {
    updateInfluence(actorId, 2);
  }
  
  return outcome;
}
```

### With Alliance System

```javascript
function onAllianceFormed(memberIds) {
  memberIds.forEach(playerId => {
    // Record alliance formation for each member
    const otherMembers = memberIds.filter(id => id !== playerId);
    
    recordEvent(playerId, 'alliance_formed', null, {
      members: otherMembers,
      week: game.week
    });
    
    // Loyal players get influence boost in alliances
    if (hasTrait(playerId, 'loyal')) {
      updateInfluence(playerId, 5);
    }
  });
}
```

### With Voting System

```javascript
function analyzeVotingBehavior(voterId, nomineeId, didVoteToEvict) {
  // Get past interactions
  const pastEvents = getMemoryLog(voterId, { targetId: nomineeId });
  
  // Check for alliances
  const wasInAlliance = pastEvents.some(e => e.event === 'alliance_formed');
  
  // Loyal players voting against alliance = betrayal
  if (wasInAlliance && didVoteToEvict && hasTrait(voterId, 'loyal')) {
    recordEvent(voterId, 'betrayal', nomineeId, {
      action: 'voted_to_evict',
      week: game.week
    });
    
    // Loss of influence for betraying alliance
    updateInfluence(voterId, -10);
  }
}
```

## Testing

Run the comprehensive test suite:

```bash
# Start local server
python3 -m http.server 8080

# Open in browser
http://localhost:8080/test_player_social_props.html
```

The test suite includes 52 automated tests covering:
- Module loading and exports
- Player creation with properties
- Helper function behavior
- Memory log operations
- Backward compatibility
- Trait generation
- Value clamping

## Performance Considerations

- **Memory Log Size**: Automatically limited to 100 entries per player to prevent memory bloat
- **Trait Generation**: Uses efficient array slicing and RNG
- **Helper Functions**: Simple lookups with O(1) or O(n) complexity
- **Filters**: Memory log filtering is done in-memory (suitable for 100 entries)

## Future Enhancements

Potential areas for expansion:

1. **Dynamic Traits**: Traits that can change over time based on behavior
2. **Trait Synergies**: Combinations of traits that create special effects
3. **Reputation System**: Public vs. private influence scores
4. **Social Network Analysis**: Graph-based relationship tracking
5. **Event Priorities**: Important events preserved even when log is full
6. **Trait Discovery**: Players learning about others' traits through observation

## API Reference

### Constants

- `SOCIAL_TRAITS`: Array of available trait strings

### Player Object Structure

```javascript
{
  // ... existing properties ...
  socialTraits: ['loyal', 'observant'],
  influence: 65,
  information: 42,
  memoryLog: [
    {
      week: 1,
      timestamp: 1234567890,
      event: 'alliance_formed',
      targetId: 2,
      details: { allianceName: 'The Squad' }
    }
  ]
}
```

### Global Exports

All helper functions are exported to `window` object:

- `window.SOCIAL_TRAITS`
- `window.generateSocialTraits()`
- `window.hasTrait(playerId, trait)`
- `window.getInfluence(playerId)`
- `window.getInformation(playerId)`
- `window.updateInfluence(playerId, delta)`
- `window.updateInformation(playerId, delta)`
- `window.recordEvent(playerId, event, targetId, details)`
- `window.getMemoryLog(playerId, filters)`
- `window.initSocialManeuversProps(force)`

---

**Implementation Date**: October 11, 2025  
**Version**: 1.0.0  
**Status**: ✅ Complete and Ready for Integration
