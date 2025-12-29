# Standalone HTML Minigames

This directory contains standalone, single-file HTML minigames designed for mobile-first gameplay. Each game can be run offline via the `file://` protocol and requires no external assets or dependencies.

## Games

### 1. Alibi Grid (`alibi-grid.html`)
**Type:** Logic Puzzle  
**Size:** 15.7 KB (413 lines)

A logic deduction game where players must determine which attributes belong to which suspects using provided clues.

**Features:**
- 20 curated puzzle variations
- Difficulty ramp via localStorage progression
- Hint system (1 free hint, -50 points penalty)
- One free retry on wrong accusation
- Timer-based scoring with bonus points
- Instructions overlay → 3-2-1 countdown → Live HUD → End screen

**Gameplay:**
- 4 suspects × 4 attribute categories
- Tap cells to mark: Yes (✓) → No (✗) → Unknown (?)
- Use logical deduction from clues
- Make accusation when confident
- Time limit: 60 seconds

### 2. Memory of the House (`memory-of-house.html`)
**Type:** Visual Memory Challenge  
**Size:** 16.4 KB (440 lines)

A canvas-based memory game where players study a randomized scene and answer questions about what they saw.

**Features:**
- Procedurally generated scenes using HTML5 Canvas
- Randomized object placement (4-6 objects per scene)
- 12-second memorization phase
- 5 multiple-choice questions
- Difficulty progression via localStorage
- Instructions overlay → 3-2-1 countdown → Scene view → Questions → End screen

**Gameplay:**
- Memorize the scene (wall color, objects, positions, colors)
- Answer 5 questions: wall color, object count, positions, object colors, presence checks
- 100 points per correct answer
- No time limit on questions (untimed recall phase)

### 3. Escape the Burglar (`escape-burglar.html`)
**Type:** Grid-based Escape Puzzle  
**Size:** 13.1 KB (349 lines)

A tactical escape game where players navigate a grid to reach the exit while avoiding burglars with greedy pathfinding AI.

**Features:**
- Dynamic difficulty: grid size increases every 3 levels (6×6 to 10×10)
- Burglar count increases every 5 levels (1 to 4 burglars)
- Greedy AI pathfinding for burglars (anti-cheese)
- Swipe gestures + button controls + keyboard support (WASD/arrows)
- Randomly generated walls (10% of grid)
- localStorage-based level progression
- Instructions overlay → 3-2-1 countdown → Live HUD → End screen

**Gameplay:**
- You (🔵) must reach exit (🚪)
- Avoid burglars (🔴) and walls (⬛)
- Each move you make, burglars move one step closer
- Score: 100 - moves (faster = higher score)

## Common Features

All games implement:

✅ **Mobile-first design** with `viewport-fit=cover` and responsive CSS  
✅ **Offline-ready** - no external assets, CDNs, or network requests  
✅ **Instructions overlay** explaining rules and controls  
✅ **3-2-1 countdown** before gameplay begins  
✅ **Live HUD** showing time/moves and score  
✅ **End screen** with final score and replay button  
✅ **Difficulty ramp** using localStorage to track progress  
✅ **Anti-cheese measures** (retry limits, AI opponents, time pressure)  
✅ **Result emission** via `window.minigameResult` object and `CustomEvent('minigame:end')`

## Result Object Format

Each game emits a result object when the game ends:

```javascript
window.minigameResult = {
  score: number,        // Final score
  won: boolean,         // Whether player won/succeeded
  // Game-specific fields:
  timeLeft: number,     // (alibi-grid) Time remaining
  puzzleId: string,     // (alibi-grid) Puzzle identifier
  questionsCorrect: number, // (memory-of-house) Correct answers
  moves: number,        // (escape-burglar) Number of moves taken
  level: number         // (escape-burglar) Current level
};

// Also dispatches:
window.dispatchEvent(new CustomEvent('minigame:end', { detail: result }));
```

## Usage

### Standalone Testing
Open any HTML file directly in a browser:
```bash
# Desktop
open minigames-html/alibi-grid.html

# Or via HTTP server
npx http-server minigames-html -p 8080
# Then visit: http://localhost:8080/alibi-grid.html
```

### Mobile Testing
1. Copy HTML file to mobile device
2. Open with mobile browser via `file://` protocol
3. Or serve via HTTP and access from mobile browser on same network

### Integration
Listen for the end event:
```javascript
window.addEventListener('minigame:end', (event) => {
  console.log('Minigame result:', event.detail);
  console.log('Score:', event.detail.score);
  console.log('Won:', event.detail.won);
});
```

## Browser Compatibility

- **Chrome/Edge:** ✅ Full support
- **Firefox:** ✅ Full support  
- **Safari/iOS:** ✅ Full support (touch events, canvas)
- **Mobile browsers:** ✅ Optimized for touch interaction

## Development Notes

- All games use vanilla JavaScript (ES6+)
- No build step required
- No external dependencies
- CSS uses CSS Grid, Flexbox, CSS Variables
- Touch events for mobile gesture support
- Keyboard events for desktop controls
- localStorage for progression (gracefully degrades if unavailable)

## Design Philosophy

These games were designed with the following principles:

1. **Single-file simplicity:** Everything (HTML, CSS, JS) in one file
2. **Offline-first:** No network requests, no external assets
3. **Mobile-optimized:** Touch-friendly controls, responsive layout
4. **Progressive difficulty:** Gets harder as you succeed
5. **Fair challenge:** Anti-cheese mechanics prevent exploits
6. **Clear feedback:** Visual and textual feedback for all actions
7. **Replayability:** Randomized content and difficulty progression

---

**Total size:** ~45 KB (all three games combined, uncompressed)  
**Lines of code:** 1,202 total (413 + 440 + 349)
