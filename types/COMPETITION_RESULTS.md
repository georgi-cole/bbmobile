# Competition Results Contract

## Overview

The Competition Results Contract provides a normalized, consistent interface for all competition results across the Big Brother mobile game. This ensures that HOH, POV (Veto), and other competitions return data in a standardized format.

## Contract Definition

```typescript
interface CompetitionResult {
  kind: 'HOH' | 'POV' | 'OTHER';
  winnerId: number | string;
  finalists?: CompetitionParticipant[];
  participants?: CompetitionParticipant[];
  metadata?: Record<string, unknown>;
}

interface CompetitionParticipant {
  id: number | string;
  score: number;
  name?: string;
}
```

## Fields

### Required Fields

- **kind**: `'HOH' | 'POV' | 'OTHER'`
  - Type discriminator indicating which competition this result is from
  - `'HOH'` - Head of Household competition
  - `'POV'` - Power of Veto competition
  - `'OTHER'` - Other special competitions (e.g., Final 3 parts)

- **winnerId**: `number | string`
  - The unique identifier of the competition winner
  - Must always be present in a valid result

### Optional Fields

- **finalists**: `CompetitionParticipant[]`
  - Array of top performers (typically top 3)
  - Useful for revealing competition results in stages
  - Sorted by score (highest first)

- **participants**: `CompetitionParticipant[]`
  - Complete list of all participants and their scores
  - Useful for logging participation, XP awards, etc.

- **metadata**: `Record<string, unknown>`
  - Additional competition-specific data
  - Can include timing, difficulty adjustments, etc.

## Usage Examples

### Creating a POV Result

```javascript
const povResult = {
  kind: 'POV',
  winnerId: 42,
  finalists: [
    { id: 42, score: 95.5, name: 'Alice' },
    { id: 17, score: 88.2, name: 'Bob' },
    { id: 23, score: 82.7, name: 'Carol' }
  ],
  participants: [
    { id: 42, score: 95.5, name: 'Alice' },
    { id: 17, score: 88.2, name: 'Bob' },
    { id: 23, score: 82.7, name: 'Carol' },
    { id: 8, score: 75.1, name: 'Dave' },
    { id: 12, score: 68.9, name: 'Eve' },
    { id: 31, score: 62.3, name: 'Frank' }
  ]
};

// Store for later use
game.__lastPOVResult = povResult;

// Pass to progression system
if (ProgressionEvents?.onPOVWin) {
  ProgressionEvents.onPOVWin(povResult.winnerId, povResult.participants.map(p => p.id), povResult);
}
```

### Creating an HOH Result

```javascript
const hohResult = {
  kind: 'HOH',
  winnerId: 17,
  finalists: [
    { id: 17, score: 92.3, name: 'Bob' },
    { id: 42, score: 89.7, name: 'Alice' },
    { id: 8, score: 85.1, name: 'Dave' }
  ]
};

game.__lastHOHResult = hohResult;
```

### Type Guard Usage

```typescript
import { isCompetitionResult } from './types/competition-results';

function handleCompetitionComplete(result: unknown) {
  if (isCompetitionResult(result)) {
    console.log(`${result.kind} won by player ${result.winnerId}`);
    
    // Safe to access result properties
    if (result.finalists) {
      console.log('Top 3:', result.finalists.map(f => f.name).join(', '));
    }
  } else {
    console.error('Invalid competition result');
  }
}
```

## Migration Guide

### Before (Legacy Format)

```javascript
// Old POV finish - varied formats
function finishVetoComp() {
  // ... competition logic ...
  
  global.game.vetoHolder = winnerId;
  
  // Inconsistent data passing
  if (global.ProgressionEvents?.onPOVWin) {
    global.ProgressionEvents.onPOVWin(winnerId, participants);
  }
}
```

### After (Normalized Format)

```javascript
// New POV finish - normalized contract
function finishVetoComp() {
  // ... competition logic ...
  
  // Create normalized result
  const povResult = {
    kind: 'POV',
    winnerId: winnerId,
    finalists: topThree.map(entry => ({
      id: entry[0],
      score: entry[1],
      name: safeName(entry[0])
    })),
    participants: allParticipants.map(entry => ({
      id: entry[0],
      score: entry[1],
      name: safeName(entry[0])
    }))
  };
  
  global.game.vetoHolder = povResult.winnerId;
  game.__lastPOVResult = povResult;
  
  // Consistent data passing with result object
  if (global.ProgressionEvents?.onPOVWin) {
    global.ProgressionEvents.onPOVWin(
      povResult.winnerId, 
      povResult.participants.map(p => p.id),
      povResult
    );
  }
}
```

## Benefits

1. **Consistency**: All competitions return data in the same format
2. **Type Safety**: TypeScript definitions provide compile-time checking
3. **Extensibility**: Easy to add new competition types or metadata
4. **Debugging**: Clear structure makes it easier to inspect results
5. **Integration**: Standardized format works seamlessly with progression system, UI reveals, and logging

## Implementation Status

- ✅ Type definitions created (`types/competition-results.ts`)
- ✅ POV competition refactored to use contract (`js/veto.js`)
- ⏳ HOH competition (future)
- ⏳ Final 3 competitions (future)
- ⏳ Other special competitions (future)

## Related Files

- `types/competition-results.ts` - TypeScript type definitions
- `types/dist/competition-results.js` - Compiled JavaScript
- `types/dist/competition-results.d.ts` - TypeScript declarations
- `js/veto.js` - POV implementation using contract
- `js/competitions.js` - HOH and Final 3 competitions (to be refactored)
- `js/progression-events.js` - Consumes competition results for XP logging
