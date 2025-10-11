# Quick Reference: Weekly Submission Locks

## Overview
Weekly submission locks prevent players from replaying minigames during competitions, ensuring one-and-done gameplay per week/phase.

## Quick Start

### For Users
Just play normally! Once you submit a score for a minigame, you'll see:
> "You have already submitted for this competition."

The lock persists across page reloads until the week/phase changes.

### For Developers

#### Check if a player can play:
```javascript
const canPlay = !CompLocks.hasSubmittedThisWeek(
  game.week,           // Current week number
  game.phase,          // e.g., 'hoh', 'final3_comp1'
  'quickTap',          // Game key
  playerId             // Player ID
);
```

#### Lock after submission:
```javascript
// Automatically called in submitScore()
CompLocks.lockSubmission(week, phase, gameKey, playerId);
```

#### Clear locks (debugging only):
```javascript
// Clear all locks for week 1
CompLocks.clearWeekLocks(1);

// Clear all locks
CompLocks.clearAllLocks();
```

## File Structure

```
js/
├── comp-locks.js           # Core lock management module
└── competitions.js         # Integration with competitions

test_comp_locks.html        # Browser test suite
demo_comp_locks.html        # Interactive demo
scripts/
└── test-comp-locks.mjs     # Node.js automated tests
```

## Testing

### Automated Tests
```bash
node scripts/test-comp-locks.mjs
```
Expected: 16/16 tests passing

### Manual Testing
1. Open `demo_comp_locks.html` in browser
2. Click "Play Quick Tap" in Week 1
3. Try clicking it again → Should show alert
4. Reload page → Lock should persist
5. Click "Play Quick Tap" in Week 2 → Should work (different week)

### Browser Tests
Open `test_comp_locks.html` and click "Run All Tests"

## localStorage Keys

Format: `bb_comp_lock_w{week}_{phase}_{gameKey}_p{playerId}`

Examples:
- `bb_comp_lock_w1_hoh_quickTap_p1`
- `bb_comp_lock_w5_final3_comp1_memoryMatch_p1`

## Competition Entry Points

Locks are integrated at these locations in `competitions.js`:

1. **renderHOH** (line ~640)
   - Checks lock before rendering HOH minigame
   
2. **renderF3P1** (line ~901)
   - Checks lock before rendering Final 3 Part 1
   
3. **beginF3P2Competition** (line ~1067)
   - Checks lock before rendering Final 3 Part 2 (human player path)
   
4. **beginF3P3Competition** (line ~1167)
   - Checks lock before rendering Final 3 Part 3 (human player path)
   
5. **submitScore** (line ~198)
   - Automatically locks after successful submission

## Troubleshooting

### Lock not working?
1. Check browser console for `[CompLocks]` messages
2. Verify comp-locks.js is loaded: `typeof CompLocks !== 'undefined'`
3. Check localStorage: Open DevTools → Application → Local Storage

### Need to reset locks?
```javascript
// In browser console:
CompLocks.clearAllLocks();
location.reload();
```

### Testing without localStorage?
The system fails gracefully - if localStorage is unavailable, locks won't persist but the game will still work.

## API Reference

### CompLocks.hasSubmittedThisWeek(week, phase, gameKey, playerId)
**Returns:** `boolean`
- `true` if player has already submitted
- `false` if player can still play

### CompLocks.lockSubmission(week, phase, gameKey, playerId)
**Returns:** `void`
- Stores lock in localStorage
- Logs action to console

### CompLocks.clearWeekLocks(week)
**Returns:** `void`
- Removes all locks for specified week
- Useful for testing

### CompLocks.clearAllLocks()
**Returns:** `void`
- Removes ALL competition locks
- Use with caution

## Integration Pattern

```javascript
// 1. Before rendering minigame
const mg = pickMinigameType();

if(CompLocks.hasSubmittedThisWeek(g.week, g.phase, mg, playerId)){
  // Show blocked message
  host.innerHTML = '<div class="tiny muted">You have already submitted for this competition.</div>';
  return;
}

// 2. Render minigame
global.renderMinigame(mg, host, (score) => {
  // 3. Submit score (locks automatically)
  submitScore(playerId, score, multiplier, `HOH/${mg}`);
});
```

## Backwards Compatibility

✅ Works if comp-locks.js not loaded (uses fallback)
✅ Works if localStorage unavailable (fails gracefully)
✅ No impact on AI players (only human checked)
✅ No changes to existing game logic

## Performance

- **Storage:** ~50 bytes per lock
- **Read:** O(1) - direct localStorage access
- **Write:** O(1) - direct localStorage write
- **Clear week:** O(n) - scans all localStorage keys
- **Clear all:** O(n) - scans all localStorage keys

## Security Notes

⚠️ **This is a UX feature, NOT a security measure:**
- Client-side only
- Can be bypassed by clearing localStorage
- Intended to prevent accidental replays
- For competitive play, implement server-side validation

## Support

For issues or questions:
1. Check COMP_LOCKS_IMPLEMENTATION.md for details
2. Run automated tests: `node scripts/test-comp-locks.mjs`
3. Try the demo: `demo_comp_locks.html`
4. Check browser console for errors
