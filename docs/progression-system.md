# Progression System

A TypeScript-based XP and leveling system for the Big Brother Mobile game. This system tracks player actions, awards experience points (XP), manages level progression, and persists data using IndexedDB.

## Architecture

### Browser-First Design

The progression system is built with a browser-first philosophy:
- **TypeScript sources** live in `src/progression/`
- **Compiled outputs** (ES modules + type declarations) are committed to `src/progression/dist/`
- **No build step required** to run the example or tests in a browser
- Import directly from `dist/*.js` files

### Core Modules

#### 1. `types.ts`
Type definitions and interfaces for the entire system:
- `XPEvent` - Represents a single XP-earning action
- `XPRule` - Defines rules for earning XP
- `PlayerState` - Current player progression state
- `Snapshot` - Historical state capture
- Database schema types

#### 2. `constants.ts`
Configuration and defaults:
- `DEFAULT_RULES` - XP rules with enforced caps
- `DEFAULT_LEVEL_THRESHOLDS` - XP required for each level
- `DB_NAME` and `DB_VERSION` - Database configuration

#### 3. `reducer.ts`
State computation logic:
- `reduceEvents()` - Computes player state from event log
- `computeBreakdown()` - Generates XP breakdown by rule
- Enforces per-week and per-season caps
- Floors negative XP to 0 by default

#### 4. `db.ts`
IndexedDB persistence layer:
- Database version 2 with `schemaVersion` metadata
- Four object stores: `events`, `snapshots`, `ruleSets`, `meta`
- CRUD operations for all data types
- Automatic `schemaVersion` persistence on database open

#### 5. `core.ts`
Main API and convenience functions:
- `initialize()` - Set up database and default rules
- `recordEvent()` - Record XP events and create snapshots
- `getCurrentState()` - Get current player state
- `getBreakdown()` - Get XP breakdown by rule
- `reset()` - Clear all data

### UI Components

#### `xp-badge.js`
Compact badge displaying level and XP:
- `createBadge(container, options)` - Creates inline badge
- `createFloatingButton(options)` - Creates floating action button
- Click handler support for opening modal

#### `xp-modal.js`
Detailed progression modal with three tabs:
- **Overview** - Level, XP, progress bar, stats
- **Breakdown** - XP earned by action type
- **Unlocks** - Unlocked levels and upcoming milestones

## XP Rules v1

### Standard Actions
- **COMP_WIN** (+100 XP) - Won a competition
- **HOH_WIN** (+150 XP) - Won Head of Household
- **POV_WIN** (+125 XP) - Won Power of Veto
- **NOMINATED** (-25 XP) - Nominated for eviction
- **SURVIVED_BLOCK** (+75 XP) - Survived being on the block
- **SOCIAL_ALLIANCE** (+30 XP) - Formed an alliance
- **BETRAYAL** (-50 XP) - Betrayed by an ally

### Capped Actions
- **COMP_PARTICIPATE** (+50 XP) - Cap: 3 per week
- **CLEAN_WEEK** (+100 XP) - Cap: 1 per week
- **HOH_STREAK_2** (+200 XP) - Cap: 1 per season
- **POV_STREAK_2** (+175 XP) - Cap: 1 per season

### Milestone Actions
- **JURY_MEMBER** (+80 XP) - Made it to jury
- **FINAL_THREE** (+150 XP) - Reached final three
- **FINAL_TWO** (+250 XP) - Reached final two
- **WINNER** (+500 XP) - Won the game

## Caps Enforcement

The system enforces two types of caps:

### Per-Week Caps
Limits how many times a rule can award XP within a single week:
- `COMP_PARTICIPATE`: Maximum 3 times per week
- `CLEAN_WEEK`: Maximum 1 time per week

### Per-Season Caps
Limits how many times a rule can award XP within a season:
- `HOH_STREAK_2`: Once per season
- `POV_STREAK_2`: Once per season

Caps are tracked in the reducer using event metadata (`week` and `season` fields).

## Negative XP Policy

By default, the reducer floors total XP at 0:
```typescript
reduceEvents(events, rules, { clampMinXP: 0 })
```

This means:
- Individual events can be negative (e.g., NOMINATED: -25)
- Total XP will never drop below 0
- Players can't go "into debt"

To allow negative totals, set `clampMinXP` to a lower value:
```typescript
reduceEvents(events, rules, { clampMinXP: -Infinity })
```

## Level Thresholds

Players progress through 20 levels based on total XP:

| Level | XP Required |
|-------|-------------|
| 1     | 0           |
| 2     | 100         |
| 3     | 250         |
| 4     | 500         |
| 5     | 850         |
| ...   | ...         |
| 20    | 34,000      |

The gap between levels increases progressively to maintain challenge.

## IndexedDB Schema

### Version 2 Changes
- Added `meta` object store with `keyPath: 'key'`
- Automatic `schemaVersion` entry written on database open
- Existing stores (`events`, `snapshots`, `ruleSets`) unchanged

### Object Stores

#### `events`
- **keyPath**: `id`
- **indexes**: `timestamp`, `ruleId`
- Stores all XP events in order

#### `snapshots`
- **keyPath**: `id`
- **indexes**: `timestamp`, `eventId`
- Stores state snapshots for each event

#### `ruleSets`
- **keyPath**: `id`
- **indexes**: `version`
- Stores rule versions for recomputation

#### `meta`
- **keyPath**: `key`
- Stores metadata like `schemaVersion`

## Data Flow

1. **Record Event**
   ```
   recordEvent(ruleId, amount, meta)
     → Create XPEvent
     → Save to events store
     → Compute current state
     → Create snapshot
     → Save snapshot
   ```

2. **Get Current State**
   ```
   getCurrentState()
     → Load all events
     → Load current rule set
     → reduceEvents(events, rules)
     → Return PlayerState
   ```

3. **Replay with New Rules**
   ```
   updateRuleSet(newRules)
     → Save new rule set
     → getCurrentState() // automatically uses new rules
     → State recomputed, events unchanged
   ```

## Invariants

The system maintains these invariants:

1. **Replay Determinism** - Same events → same state
2. **Log Immutability** - Rule changes don't mutate event log
3. **Negative XP Flooring** - Total XP ≥ 0 (by default)
4. **Cap Enforcement** - Per-week and per-season caps respected
5. **State Consistency** - State always derivable from events + rules

These are validated in `src/progression/tests/index.html`.

## Testing

See `docs/progression-getting-started.md` for how to run tests.

## Performance

- **Event log** grows linearly with player actions
- **State computation** is O(n) where n = number of events
- **Snapshots** allow historical state queries without recomputation
- For optimal performance, consider periodic log compaction (not implemented)

## Future Enhancements

Potential additions (not in scope for v1):
- Seasonal XP decay
- Achievements/badges system
- Leaderboards
- XP multipliers/bonuses
- Prestige levels
- Log compaction for long-running games
