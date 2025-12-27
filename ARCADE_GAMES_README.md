# 🎮 Arcade Minigames - Quick Reference

## Three New Games Added

### 1. 🎯 Laser Pantry Dash
**Key:** `laserPantryDash`  
**File:** `js/minigames/laser-pantry-dash.js`  
**Duration:** 60 seconds  
**Lives:** 3

**How to Play:**
- Drag your avatar around the screen
- Collect items that match the recipe (shown at top)
- Avoid sweeping laser lines
- Recipe changes at 30 seconds!

**Scoring:**
- Correct items: +10 points
- Wrong items: -5 points
- Laser hits: -15 points (and lose 1 life)

### 2. 🎊 Confetti Cannon
**Key:** `confettiCannon`  
**File:** `js/minigames/confetti-cannon.js`  
**Duration:** 60 seconds

**How to Play:**
- Tap GREEN targets for points
- Avoid RED decoy targets
- Build combos with consecutive hits
- Don't tap too fast or you'll overheat!

**Scoring:**
- Correct target: 10 points × combo multiplier
- Decoy hit: -15 points
- Combo multiplier: 1.5x per hit (max 5x)

### 3. 🔊 Buzzer Sprint Relay
**Key:** `buzzerSprintRelay`  
**File:** `js/minigames/buzzer-sprint-relay.js`  
**Rounds:** 3

**How to Play:**
- Watch the buzzer sequence flash
- Memorize the order
- Tap them back as fast as you can
- Wrong taps add +1.5s penalty

**Scoring:**
- Time-based (lower is better)
- Perfect game ~30s = high score
- Converted to 0-1000 scale

## Usage

### In Competition Mode
```javascript
// Games automatically appear in selector pool
MinigameRegistry.render('laserPantryDash', container, onComplete, {
  competitionMode: true
});
```

### Testing
Open `test_arcade_minigames.html` in a browser to test all three games.

### Verification
```bash
npm run validate:minigames  # Verify registration
npm run test:minigames      # Run all tests
```

## Technical Details

**All games include:**
- ✅ Mobile touch controls
- ✅ Instructions overlay with countdown
- ✅ Anti-cheese mechanics
- ✅ End-game stats display
- ✅ Proper event dispatch
- ✅ Score normalization (0-1000)

**Integration points:**
- Registry: All 3 games registered with `type: 'arcade'`
- Bootstrap: Fallback keys and aliases configured
- Compat-bridge: Legacy mappings for all naming variants
- Index.html: Script tags added for module loading

## File Locations

```
js/minigames/
├── laser-pantry-dash.js       ← New game 1
├── confetti-cannon.js          ← New game 2
├── buzzer-sprint-relay.js      ← New game 3
├── registry.js                 ← Modified (added entries)
└── core/
    ├── registry-bootstrap.js   ← Modified (added keys)
    └── compat-bridge.js        ← Modified (added mappings)

test_arcade_minigames.html      ← Test harness
index.html                       ← Modified (added scripts)
```

## Validation Status

✅ All validation tests passing:
- Minigame key validation
- Legacy map validation  
- Runtime validation
- Selector pool coverage: 35/35 games

## Next Steps

1. ✅ Games are in selector pool
2. ✅ Can be used in competitions
3. Manual playtesting recommended for balance
4. Difficulty tuning based on feedback

---

**Status:** Ready for production use  
**Added:** 2025-12-27  
**Total Code:** ~1,485 lines across 3 games
