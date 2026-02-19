# Minigame Scoring System

## Overview

The unified scoring system ensures fairness and balance across all minigames by normalizing scores to a **0-1000 scale** (SCALE=1000). Different game types use different scoring strategies optimized for their mechanics.

**Update (v2.0):** Scoring system updated to use SCALE=1000 (previously 0-100) for higher precision and better granularity in competition results.

**Update (v2.1):** Added deterministic opponent synthesis, seeded RNG utility, scale mapping helpers, and opt-in human-bias configuration.

## Core Module: central-scoring.js

All minigames now use the centralized scoring module (`js/minigames/central-scoring.js`) which provides:

- **MinigameScoring**: Score normalization with SCALE=1000, plus competition-scale mapping helpers and `generateOpponentScoresForCompetition()`
- **GameUtils**: Phase-specific win determination (HOH: 20%, POV: 30%)
- **OpponentSynth**: Realistic AI opponent score generation

## Scale Mapping Helpers

The competition store uses a legacy 0–150 scale for `g.lastCompScores`. The central scoring system uses a 0–1000 scale (SCALE). Two helpers convert between them:

```javascript
// Central (0-1000) → competition store (0-150)
const compScore = MinigameScoring.mapCentralToCompScale(centralScore);

// Competition store (0-150) → central (0-1000)
const centralScore = MinigameScoring.mapCompToCentral(compScore);
```

These are also used internally by `fillMissingScores()` in competitions.js.

## Deterministic Opponent Synthesis

### `MinigameScoring.generateOpponentScoresForCompetition(humanScore, humanId, opponents, opts)`

Generates deterministic, persona-aware AI opponent scores for a competition. This is the primary replacement for ad-hoc fallback blocks.

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `humanScore` | number | Human's score in central scale (0–1000). Pass 0 if skipped. |
| `humanId` | string\|number | Human player's ID |
| `opponents` | Array | `[{ id, compBeast?, persona? }]` |
| `opts.seedParts` | Array | Seed parts for SeededRNG (default: `[Date.now()]`) |
| `opts.compType` | string | `'hoh'`, `'pov'`, `'final3_comp1'`, etc. |
| `opts.authoritativeWinnerId` | * | ID of authoritative winner (skipped; their score set by caller) |
| `opts.authoritativeWinnerScore` | number | Central-scale score of authoritative winner (others capped below) |
| `opts.difficultyMultiplier` | number | AI difficulty scalar (default: 1.0) |
| `opts.humanSkipped` | boolean | Whether human did not play (default: false) |

**Returns:** `Array<[id, centralScore]>` — one entry per non-authoritative opponent in central scale (0–1000).

**Example:**

```javascript
const results = MinigameScoring.generateOpponentScoresForCompetition(
  600,   // human score (0-1000)
  humanId,
  [{ id: 2, compBeast: 0.7 }, { id: 3, compBeast: 0.4 }],
  {
    seedParts: [g.__compSeed, g.week, 'hoh', gameKey],
    compType: 'hoh',
    difficultyMultiplier: 1.0,
    humanSkipped: false
  }
);
// results: [[2, 487], [3, 612]]  (deterministic)
```

### Authoritative Winner Protection

When `authoritativeWinnerId` is provided:
- No score is generated for that player (their score is managed by the caller)
- All other opponent scores are capped below `authoritativeWinnerScore - 1`
- This ensures endurance game winners are never beaten by synthetic scores

## SeededRNG Utility

Located at `js/utils/seeded-rng.js`, exposed as `window.SeededRNG`.

Uses **mulberry32** PRNG (period 2^32, passes TestU01) with **FNV-1a** seed hashing.

### API

```javascript
// Hash any number of parts into a single uint32 seed
const seed = SeededRNG.seedFrom('hoh', week, humanId);

// Create an RNG from an array of parts (auto-hashed) or a single seed number
const rng = SeededRNG.create([week, 'hoh', humanId]);  // preferred
const rng = SeededRNG.create(seed);                    // also accepted

// Produce values in [0, 1)
const val = rng.next();

// Random integer in [min, max)
const n = rng.range(0, 10);

// Pick random element from array
const item = rng.choice(array);

// Return shuffled copy (Fisher-Yates)
const shuffled = rng.shuffle(array);

// Get current internal state (useful for audit/replay)
const state = rng.getSeed();
```

## Competition Audit Object

After each call to `fillMissingScores()`, an audit snapshot is written to `g.__compAudit`:

```javascript
g.__compAudit = {
  seedParts: ['hoh', 5, 1, 1708000000],  // seed inputs used
  compType: 'hoh',
  gameKey: 'holdWall',
  generatedOpponentScores: [[2, 487], [3, 612]],  // central scale
  authoritativeWinner: null,  // or { playerId, score } if endurance
  humanSkipped: false,
  mapping: { centralScale: 1000, compScale: 150 },
  timestamp: 1708000000000
};
```

This object can be used to:
- Debug unexpected competition outcomes
- Replay a competition with the same seed
- Verify authoritative winner protection

## Opt-In Human Bias

The legacy 20% human-bias (higher chance of human winning) is available as an opt-in configuration. It is **disabled by default**.

```javascript
// Enable in game config (NOT recommended for normal gameplay)
g.cfg.competitions.humanBias = { enabled: true, chance: 0.20 };
```

When enabled, a single RNG draw per competition determines whether bias applies. If triggered, all opponent base scores are multiplied by 0.85 (15% reduction), giving the human a statistically higher chance of being top scorer.

**Important:** Bias is applied at generation time (before scoring), not as an after-the-fact override. It never overrides authoritative winners from endurance games.

## Per-Competition Seed (`g.__compSeed`)

Each competition start function (`startHOH`, `beginF3P1Competition`, etc.) initializes `g.__compSeed`:

```javascript
// Competition seed: deterministic within a 30-second window
g.__compSeed = SeededRNG.seedFrom('hoh', g.week, g.humanId, Math.floor(Date.now() / 30000));
```

The seed is used as the first element of `seedParts` in `fillMissingScores`. Replaying with the same seed reproduces the same opponent scores (within the same 30-second window).

## `fillMissingScores(ids, opts)` — competitions.js

Exposed as `global.fillMissingScores`. Used by all competition finish functions (`finishCompPhase`, `finishF3P1/P2/P3`) and `finishVetoComp` to replace ad-hoc `5 + rand * N` fallbacks.

```javascript
fillMissingScores(ids, {
  compType: 'hoh',          // competition type
  humanSkipped: false,      // whether human did not complete
  gameKey: 'holdWall'       // minigame key for seeding
});
```

Rules applied in order:
1. Human who skipped (`humanSkipped=true`) → score 0
2. Authoritative winner (`g.__authoritativeWinner` matching `compType`) → skipped (caller sets score)
3. AI players without scores → `generateOpponentScoresForCompetition()` → mapped to comp scale (0–150)



## Scoring Types

### 1. Time-Based Scoring

Used for games where **faster is better** (e.g., reaction games, races).

**Formula:** Exponential decay from max time to min time
```javascript
MinigameScoring.normalizeTime(timeMs, minTimeMs, maxTimeMs)
// Returns: 0-1000 (SCALE=1000)
```

**Example:**
- Min time: 1000ms (fastest possible) → 1000 points
- Max time: 10000ms (slowest acceptable) → 200 points (20% of SCALE)
- 3000ms → ~750 points (exponential curve)

**Games using this:**
- Reaction Timer
- Reaction Royale
- Memory Pairs

### 2. Accuracy-Based Scoring

Used for games where **correctness matters** (e.g., counting, matching).

**Formula:** Percentage correct with optional penalties
```javascript
MinigameScoring.normalizeAccuracy(correct, total, penalties)
// Returns: 0-1000 (SCALE=1000)
```

**Example:**
- 8/10 correct → 800 points
- 8/10 correct with 2 penalties → 600 points

**Games using this:**
- Count House
- Memory Match
- Pattern Match
- Quick Tap
- Target Practice

### 3. Hybrid Scoring

Used for games that combine **speed and accuracy** (e.g., trivia, timed puzzles).

**Formula:** Weighted combination of accuracy and time
```javascript
MinigameScoring.normalizeHybrid(correct, total, timeMs, minTimeMs, maxTimeMs, accuracyWeight)
```

**Default weights:** 70% accuracy, 30% speed

**Example:**
- Perfect accuracy (10/10) in fast time → 95-100 points
- Perfect accuracy in slow time → 70 points
- Partial accuracy (7/10) in fast time → 65-70 points

**Games using this:**
- Math Blitz
- Trivia Pulse
- Word Anagram

### 4. Endurance Scoring

Used for games where **lasting longer is better** (e.g., holding, balancing).

**Formula:** Winner-takes-all for competition mode, time-based display for rankings
````javascript
// Competition scoring
finalScore = (lastRemaining) ? 100 : 0;

// Display ranking by endurance duration
MinigameScoring.normalizeEndurance(durationMs, minTimeMs, maxTimeMs)
````

**Example:**
- Last person remaining → 100 points (winner-takes-all)
- All others → 0 points
- Rankings displayed by hold time in special modal (mm:ss.s format)

**Games using this:**
- **Hold Wall** (implemented) - 10-minute endurance competition with:
  - Winner-takes-all scoring (100 for last remaining, 0 otherwise)
  - Special ranking modal showing top 3 by longest hold time
  - Responsive avatar display modes (strip/tiny/single)
  - AI opponent drops with later-weighted distribution
  - Final-two deal mechanics and post-deal periodic checks
- Balance Game (planned)

## Score Normalization Pipeline

```javascript
// 1. Game returns raw score
const rawScore = gameLogic(); // e.g., 8/10 correct, 3500ms

// 2. Normalize based on game type
const normalized = MinigameScoring.normalize(rawScore, gameMetadata);

// 3. Apply competitive multiplier (compBeast stat)
const final = MinigameScoring.applyCompetitiveMultiplier(normalized, player);

// 4. Clamp to valid range
const clamped = Math.max(0, Math.min(150, final));
```

## Fairness Band

Scores are validated to ensure mean distribution falls within the **fairness band**:

- **Target mean:** 35-70 points (across 100+ plays)
- **Acceptable variance:** CV < 20%
- **Purpose:** Prevent games that are too easy or too hard

Games outside the fairness band should be:
1. Annotated with expected difficulty
2. Adjusted with difficulty scaling
3. Or marked as "high variance" in metadata

## CompBeast Multiplier

The `compBeast` player stat (0-10 scale) provides a slight boost to competition scores:

```javascript
multiplier = 1.0 + (compBeast * 0.05)
// compBeast = 0  → 1.00x (no bonus)
// compBeast = 5  → 1.25x (+25%)
// compBeast = 10 → 1.50x (+50%)
```

This creates meaningful differentiation between "comp beast" and "social" players.

## Adding a New Game

When creating a new minigame, choose the appropriate scoring type:

```javascript
// In registry.js
{
  key: 'newGame',
  name: 'New Game',
  scoring: 'accuracy',  // 'time' | 'accuracy' | 'hybrid' | 'endurance'
  // ...
}
```

Then in your game module:

```javascript
function render(container, onComplete){
  // Game logic...
  
  // Calculate raw score based on scoring type
  let rawScore;
  
  if(scoringType === 'time'){
    rawScore = elapsedMs;
  } else if(scoringType === 'accuracy'){
    rawScore = (correct / total) * 100;
  }
  
  // Return score (0-100)
  onComplete(rawScore);
}
```

The scoring system will handle normalization automatically.

## Testing Score Distribution

Use the distribution simulator to validate fairness:

```html
<!-- Load test page -->
<script src="tests/minigames/distribution.spec.js"></script>

<script>
// Simulate 100 plays
const results = MinigameDistributionTests.simulateScoreDistribution('newGame', 100);
console.log('Mean:', results.statistics.mean);
console.log('Fairness:', results.statistics.inFairnessBand ? 'PASS' : 'FAIL');
</script>
```

## API Reference

### MinigameScoring.normalizeTime(timeMs, minTimeMs, maxTimeMs)
Normalize time-based score (lower is better).

### MinigameScoring.normalizeAccuracy(correct, total, penalties)
Normalize accuracy-based score (higher is better).

### MinigameScoring.normalizeHybrid(correct, total, timeMs, minTimeMs, maxTimeMs, accuracyWeight)
Combine accuracy and time with weighting.

### MinigameScoring.normalizeEndurance(durationMs, minTimeMs, maxTimeMs)
Normalize endurance score (longer is better).

### MinigameScoring.calculateFinalScore(rawScore, player, metadata)
Complete scoring pipeline with multipliers.

## Best Practices

1. **Keep raw scores 0-100** - Easier to reason about
2. **Test distribution** - Run 100+ simulations
3. **Document edge cases** - Note any special scoring rules
4. **Use appropriate type** - Match scoring to game mechanics
5. **Validate fairness** - Ensure mean falls in band

## Examples

### Example 1: Simple Accuracy Game
```javascript
let correct = 0;
let total = 10;

function checkAnswer(answer){
  if(answer === correctAnswer){
    correct++;
  }
  total++;
}

function complete(){
  const score = (correct / total) * 100;
  onComplete(score); // Returns 0-100
}
```

### Example 2: Timed Reaction Game
```javascript
const startTime = Date.now();

function onReact(){
  const reactionTime = Date.now() - startTime;
  // Fast reaction (200ms) = high score
  // Slow reaction (2000ms) = low score
  onComplete(reactionTime); // Scoring system handles normalization
}
```

### Example 3: Hybrid Trivia Game
```javascript
let correct = 0;
const total = 5;
const startTime = Date.now();

function answerQuestion(answer){
  if(answer === correctAnswer){
    correct++;
  }
  
  if(currentQuestion === total){
    const timeMs = Date.now() - startTime;
    // Both correct answers AND fast time matter
    // Scoring system will normalize: 70% accuracy, 30% speed
    onComplete({ correct, total, timeMs });
  }
}
```

## Troubleshooting

### Scores too high/low
- Adjust min/max bounds in scoring config
- Check raw score calculation
- Validate normalization formula

### Unfair distribution
- Review game difficulty
- Add difficulty scaling
- Consider hybrid scoring instead

### Outlier scores
- Add bounds checking
- Clamp extreme values
- Log telemetry for analysis

## Migration to SCALE=1000 (v2.0)

### Key Changes

1. **Scoring Scale**: All scores now use 0-1000 range (was 0-100)
2. **Fairness Band**: Updated to 350-700 (was 35-70)
3. **No Forced Losses**: Player scores reflect true performance
4. **Win Determination**: Handled by OpponentSynth at competition level
5. **Phase-Specific Win Rates**: HOH (20%), POV (30%) - configurable in settings

### API Updates

```javascript
// New: Calculate final score with SCALE=1000
const finalScore = MinigameScoring.calculateFinalScore({
  rawScore: rawScore,      // Raw score 0-100
  minScore: 0,             // Min possible raw score
  maxScore: 100,           // Max possible raw score
  compBeast: 0.5           // Player's competition skill (0-1)
});
// Returns: 0-1000 (or up to 1500 for exceptional performance)

// Phase-specific win determination
const didWin = GameUtils.determineGameResult(
  playerSucceeded, 
  'hoh',  // or 'pov'
  { debugMode: false }
);

// Generate opponent scores
const opponentScores = OpponentSynth.generateOpponentScores(
  humanScore,    // 0-1000
  opponents,     // Array of player objects
  { phase: 'hoh', seed: Date.now() }
);
```

### Migration Checklist

When updating a minigame to use the new system:

- [ ] Remove manual score clamping (e.g., `Math.min(100, ...)`)
- [ ] Remove forced loss logic (`30 + Math.random() * 25`)
- [ ] Replace with `MinigameScoring.calculateFinalScore(...)`
- [ ] Ensure final score is rounded: `Math.round(finalScore)`
- [ ] Update tests to expect 0-1000 scale
- [ ] Test in browser to verify scoring behavior

### Settings Configuration

Players can now configure win chances in Settings > Gameplay > Competition win chances:
- **HOH Win Chance**: Default 20% (range: 0-100%)
- **POV Win Chance**: Default 30% (range: 0-100%)

These are stored as percentages in the UI but converted to decimals (0.20, 0.30) internally.
