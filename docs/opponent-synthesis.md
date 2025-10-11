# Opponent Synthesis Module

## Overview

The Opponent Synthesis module (`js/minigames/opponent-synth.js`) generates synthetic opponent scores for minigame competitions after the human player completes their game. This creates a more dynamic and fair competition experience while targeting a ~20% human win rate per session.

## Key Features

- **Seeded RNG**: Deterministic score generation using the game's seeded random number generator
- **Dynamic Win Rate**: Targets approximately 20% session win rate (beating all opponents)
- **Per-Game Bounds**: Respects minigame-specific score ranges (0-100 normalized)
- **Persona Effects**: Player personas (aggression, chaos) influence score variance
- **CompBeast Integration**: Player competitive stats affect score generation
- **Backwards Compatible**: Gracefully falls back to legacy AI score generation if module is unavailable

## How It Works

### Win Rate Calculation

To achieve a target session win rate of 20% (where a "session" means beating ALL opponents):

```
P(beat all N opponents) = targetWinRate = 0.20
P(beat one opponent) = targetWinRate^(1/N)

For 5 opponents: P(beat one) = 0.20^(1/5) ≈ 0.725 (72.5%)
For 2 opponents: P(beat one) = 0.20^(1/2) ≈ 0.447 (44.7%)
```

A conservative adjustment (90% of calculated probability) accounts for variance from persona effects and compBeast multipliers.

### Score Generation Algorithm

For each opponent:

1. **Determine Outcome**: Random value compared to adjusted beat probability
2. **Calculate Base Score**: 
   - If human wins: opponent scores 8-20% below human
   - If opponent wins: opponent scores 5-20% above human
3. **Apply CompBeast Multiplier**: 0.92 + (compBeast × 0.16) + variance
4. **Apply Persona Effects**: Small adjustments based on aggression and chaos
5. **Clamp to Bounds**: Ensure score stays within game's min/max (typically 0-100)
6. **Round**: Round to 1 decimal place

## Integration

### Competitions.js Integration

The module is integrated into HOH and Final 3 competitions:

```javascript
// In submitScore() function - triggered after human submission
const player = global.getP(id);
if (player && player.human && global.OpponentSynth) {
  generateSyntheticOpponents(id, final);
}

// In startHOH() and F3 competition functions
// Legacy fallback if OpponentSynth not available
if (!global.OpponentSynth) {
  // Generate AI scores using old method
}
```

### Usage Example

```javascript
// Generate synthetic opponent scores
const scores = window.OpponentSynth.generate({
  humanScore: 75,
  opponents: [
    { id: 2, compBeast: 0.7, persona: { aggr: 0.6, loyalty: 0.5, chaos: 0.4 } },
    { id: 3, compBeast: 0.5, persona: { aggr: 0.5, loyalty: 0.6, chaos: 0.3 } },
    { id: 4, compBeast: 0.4, persona: { aggr: 0.4, loyalty: 0.7, chaos: 0.5 } }
  ],
  gameKey: 'quickTap',
  seed: 12345,
  targetWinRate: 0.20
});

// Calculate resulting win rate
const winRate = window.OpponentSynth.calculateWinRate(75, scores);
console.log(`Human win rate: ${(winRate * 100).toFixed(1)}%`);
```

## API Reference

### OpponentSynth.generate(options)

Generates synthetic opponent scores.

**Parameters:**
- `options.humanScore` (number): Human player's score (0-100)
- `options.opponents` (Array): Opponent player objects
  - `id` (number): Player ID
  - `compBeast` (number): Competitive ability (0.2-0.9)
  - `persona` (Object): Player personality traits
    - `aggr` (number): Aggression level (0-1)
    - `loyalty` (number): Loyalty level (0-1)
    - `chaos` (number): Chaos factor (0-1)
- `options.gameKey` (string): Minigame key (e.g., 'quickTap')
- `options.seed` (number): RNG seed for deterministic results
- `options.targetWinRate` (number, optional): Target win rate (default: 0.20)

**Returns:** Map of opponent ID to score

### OpponentSynth.calculateWinRate(humanScore, opponentScores)

Calculates the win rate based on human score vs opponent scores.

**Parameters:**
- `humanScore` (number): Human player's score
- `opponentScores` (Map): Map of opponent scores

**Returns:** number (0-1) representing win rate

## Persona Effects

Personas affect score variance:

- **High Chaos (>0.7)**: ±5 point swing (more unpredictable)
- **Low Chaos (<0.3)**: Pulls slightly toward mean (more consistent)
- **High Aggression (>0.7)**: ±3 point swing (more variable)

## Testing

Run the test suite:

```bash
# Node.js test
node test_opponent_synth.cjs

# Browser test
# Open test_opponent_synth.html in browser
```

Expected test results:
- Module loading: ✓
- Basic generation: ✓
- Win rate distribution: 10-30% (target 20% ± 10%)
- Score bounds: All scores 0-100
- Deterministic RNG: Same seed = same results

## Backwards Compatibility

The system is fully backwards compatible:

1. If `OpponentSynth` module is not loaded, competitions use legacy AI score generation
2. Legacy games continue to work without modification
3. New minigames automatically benefit from synthetic opponents

## Performance

- Minimal overhead: O(N) where N = number of opponents
- No DOM manipulation during generation
- Deterministic seeded RNG prevents replay inconsistencies

## Future Enhancements

Potential improvements:

1. Historical win rate tracking to adjust difficulty dynamically
2. Per-game difficulty profiles (e.g., reaction games vs. puzzle games)
3. Learning algorithms to adapt to player skill over multiple sessions
4. Multiplayer score distributions for group competitions
