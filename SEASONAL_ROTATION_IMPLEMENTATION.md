# Seasonal Rotation & Win Calculation Implementation

## Overview
This document describes the implementation of seasonal rotation for minigames and win chance calculation logic.

## Features Implemented

### 1. Seasonal Rotation System

#### Season Detection
The system automatically determines the current season based on the month:
- **Spring**: March, April, May
- **Summer**: June, July, August
- **Autumn**: September, October, November
- **Winter**: December, January, February

#### Season Filtering
Each game in the registry has a `seasons` array property that defines when it can appear:
```javascript
quickTap: {
  // ... other properties
  seasons: ['spring', 'summer', 'autumn', 'winter']  // Available year-round
}

swipeMaze: {
  // ... other properties
  seasons: ['spring', 'summer']  // Only in spring and summer
}
```

#### Automatic Pool Reset
The selector detects when the season changes and automatically:
1. Resets the game pool
2. Filters available games for the new season
3. Reshuffles to maintain non-repeating playlist

### 2. Win Calculation Logic

The `calculateWin(player, score)` function implements sophisticated win chance calculation:

#### Base Chances
- Regular players: 50% base chance
- "YOU" player: 25% base chance (harder difficulty)

#### Win Bonus
Players improve with experience:
- +2% per minigame win
- Capped at +20% (10 wins)

#### Failure Rule
If a player scores 0, their win chance is 0% (automatic failure)

#### Examples
```javascript
// Regular player, no wins, score > 0
calculateWin({name: 'Alice', stats: {minigameWins: 0}}, 75) // Returns: 50

// YOU player, no wins, score > 0
calculateWin({name: 'YOU', stats: {minigameWins: 0}}, 75) // Returns: 25

// Regular player, 5 wins, score > 0
calculateWin({name: 'Bob', stats: {minigameWins: 5}}, 80) // Returns: 60 (50 + 10)

// Any player, score = 0
calculateWin({name: 'Charlie', stats: {minigameWins: 10}}, 0) // Returns: 0
```

## New Games Added

All 10 new games use the placeholder module until implemented:

1. **Swipe Maze** (spring, summer) - Navigate maze with swipe gestures
2. **Pattern Trace** (spring, autumn) - Trace patterns shown on screen
3. **Audio Match** (summer, winter) - Match sounds to sources
4. **Balance Bridge** (spring, summer, autumn) - Balance on virtual bridge
5. **Color Mix** (all seasons) - Mix colors to match target
6. **Word Ladder** (autumn, winter) - Word transformation puzzle
7. **Rhythm Tap** (summer, autumn) - Tap to the rhythm
8. **Spot The Difference** (all seasons) - Find image differences
9. **Logic Locks** (autumn, winter) - Solve logic puzzles
10. **Astro Jumper** (spring, summer, winter) - Jump through space

## API Reference

### MinigameSelector

#### `getCurrentSeason()`
Returns the current season string.
```javascript
const season = MinigameSelector.getCurrentSeason();
// Returns: 'spring', 'summer', 'autumn', or 'winter'
```

#### `filterBySeason(gameKeys)`
Filters an array of game keys to only those available in the current season.
```javascript
const allGames = ['quickTap', 'swipeMaze', 'wordLadder'];
const seasonal = MinigameSelector.filterBySeason(allGames);
// Returns: games available in current season
```

#### `calculateWin(player, score)`
Calculates a player's win chance percentage.
```javascript
const player = {name: 'Alice', stats: {minigameWins: 3}};
const chance = MinigameSelector.calculateWin(player, 85);
// Returns: 56 (50 base + 6 from wins)
```

## Testing

Run the comprehensive test suite:
1. Open `test_seasonal_selector.html` in a browser
2. Click each test button to validate functionality
3. All tests should show ✅ passing

Or run automated validation:
```bash
npm run test:minigames
```

## Files Modified

- `js/minigames/registry.js` - Added seasons property + 10 new games
- `js/minigames/selector.js` - Seasonal rotation + win calculation
- `js/minigames/placeholder.js` - New placeholder module
- `js/minigames/core/compat-bridge.js` - Legacy map entries
- `test_seasonal_selector.html` - Test suite

## Future Enhancements

1. Implement the 10 placeholder games
2. Add more sophisticated season transitions
3. Consider regional season differences (Southern hemisphere)
4. Add seasonal-themed UI elements
5. Track seasonal statistics
