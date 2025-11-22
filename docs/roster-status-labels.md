# Roster Status Labels

## Overview
The roster now uses inline status pills (not legacy overlay badges) to show player state. All active statuses should appear simultaneously: HOH, POV, NOM, or HOH·POV (combined).

## Source of Truth
- `game.hohId` – current HOH
- `game.vetoHolder` – current POV holder
- `game.nominees[]` – array of nominated player IDs

## Derived Player Flags
`syncPlayerBadgeStates()` sets per-player flags:
- `p.hoh` – Boolean indicating if player is HOH
- `p.nominated` – Boolean indicating if player is nominated
- `p.nominationState` – String: 'none', 'nominated', 'pendingSave', 'saved', 'replacement'

Call this before rendering HUD:
```javascript
global.syncPlayerBadgeStates?.();
global.updateHud?.();
```

Or inside `updateHud()` itself (as currently implemented).

## Precedence
Status labels follow this precedence order (higher priority shown first):

1. **WINNER** (🥇) – `p.showFinalLabel === 'WINNER'` or `p.winner`
2. **RUNNER-UP** (🥈) – `p.showFinalLabel === 'RUNNER-UP'` or `p.runnerUp`
3. **Final 3 Pending Mask** (?) – During Final 3 competitions before results locked
4. **NOM+POV** (❓🛡️) – Player is nominated AND holds POV (but not HOH)
5. **NOM** – Nominated player (any of: 'nominated', 'pendingSave', 'replacement' states)
6. **HOH+POV** (👑🛡️) – Player holds both Head of Household and Veto
7. **HOH** – Head of Household only
8. **POV** – Veto holder only (may include twist emoji: 💎 Diamond, ⭐ Golden)
9. **Name** – Default player name (no special status)

## Implementation Details

### Shared Status Label Helper
`buildStatusLabel(p, game)` in `js/ui.hud-and-router.js` provides unified status label generation:

```javascript
function buildStatusLabel(p, game) {
  // Returns: {text, html, classes, aria}
  // - text: Display text for the label
  // - html: Optional HTML content (currently unused)
  // - classes: Array of CSS classes to apply
  // - aria: Accessible label text for screen readers
}
```

This helper is used by the top roster and can be used by other components that need status labels.

### Top Roster Status Classes
The following CSS classes are applied to `.top-tile-name` elements:

- `.status-hoh` – HOH text pill (gold gradient)
- `.status-pov` – POV text pill (green gradient)
- `.status-nom` – NOM text pill (red gradient)
- `.status-hoh-pov` – Combined HOH+POV text pill (gold-to-green gradient)
- `.status-icon-label.hoh-pov-icons` – Combined HOH+POV emoji icons
- `.status-icon-label.medal-winner` – Winner medal emoji
- `.status-icon-label.medal-runner-up` – Runner-up medal emoji
- `.status-final3-pending` – Final 3 pending mask (gray gradient, shows `?`)
- `.status-nom-pov` – Combined NOM+POV text pill (red-to-green gradient)
- `.status-icon-label.nom-pov-icons` – Combined NOM+POV emoji icons (❓🛡️)

### Cast Roster State Tags
The cast roster (Houseguests table) uses a different approach with state tags in a separate column:

- `.tag.hoh` – HOH tag badge
- `.tag.veto` – VETO tag badge
- `.tag.nom` – NOM tag badge
- `.tag.jury` – JURY tag badge
- `.tag.winner` – WINNER tag badge
- `.tag.evicted` – EVICTED tag badge
- `.tag.f3pending` – Final 3 pending tag (shows `?`)
- `.tag.nom-pov` – Combined NOM+POV tag (shows `NOM+POV`)

Multiple tags can display simultaneously in the cast roster (e.g., a player can show both HOH and JURY tags). However, when NOM+POV is applicable, it replaces individual NOM and VETO tags.

### Legacy Badge Classes (Hidden)
The following legacy badge classes are **hidden via CSS** (`display: none !important`):
- `.badge-crown`
- `.badge-veto`
- `.badge-nom`

These are no longer inserted by the modern renderer but remain hidden in CSS for backwards compatibility.

## Common Issues & Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Only POV showing | Stale player flags before render | Ensure `syncPlayerBadgeStates()` called before `renderTopRoster()` |
| NOM not appearing | Missing sync before HUD | Add sync call at start of `updateHud()` (already present in current implementation) |
| HOH disappears when POV awarded to another | Renderer not checking both flags | Use unified status precedence logic (already present) |
| Duplicate/conflicting labels | Legacy file override | Remove `js/ui.hud-and-router.js9` (should not exist) |

## Quick Validation

Open browser console and run:
```javascript
// Enable debug logging
window.game.cfg.debugRoster = true;

// Force HUD update
updateHud();

// Inspect player states
[...game.players].map(p => ({
  id: p.id,
  name: p.name,
  hoh: p.hoh,
  pov: game.vetoHolder === p.id,
  nom: p.nominated,
  state: p.nominationState
}))
```

All statuses should match visible pills in the top roster.

## Debugging

### Enable Debug Logging
```javascript
// Enable roster debug logging (new unified flag)
window.__debugRosterLabels = true;

// Legacy flags (still supported for top roster)
window.game.cfg.debugRoster = true;
window.DEBUG_ROSTER = true;
```

This will log status calculations for each player during rendering:

**Top Roster (`renderTopRoster`):**
```
[roster] render id=1 name=Alice hoh=true pov=false nom=false state=none
[roster] render id=2 name=Bob hoh=false pov=true nom=false state=none
[roster] render id=3 name=Charlie hoh=false pov=false nom=true state=nominated
```

**Cast Roster (`renderCastRoster`):**
```
[roster] cast sync complete (hohId=1, vetoHolder=2, nominees=[3,4])
[roster] cast player=1 name=Alice tags=HOH classes=hoh hoh=true pov=false nom=false
[roster] cast player=2 name=Bob tags=VETO classes=veto hoh=false pov=true nom=false
[roster] cast player=3 name=Charlie tags=NOM classes=nom hoh=false pov=false nom=true
```

### Check Badge Sync
After calling `updateHud()`, you should see:
```
[hud] badge sync complete (hohId=1, vetoHolder=2, nominees=[3,4])
```

### Manual State Inspection
```javascript
// Check if player flags match game state
game.players.forEach(p => {
  const hohMatch = p.hoh === (p.id === game.hohId);
  const nomMatch = p.nominated === game.nominees.includes(p.id);
  if (!hohMatch || !nomMatch) {
    console.error('Mismatch for', p.name, {
      hohMatch,
      nomMatch,
      p_hoh: p.hoh,
      g_hohId: game.hohId,
      p_nominated: p.nominated,
      g_nominees: game.nominees
    });
  }
});
```

## Testing

### Manual Test Scenarios

1. **HOH Competition**
   - Start game, complete HOH comp
   - Expected: HOH player shows "HOH" pill immediately
   - Command: `global.startHOH?.()` then submit competition

2. **Nominations**
   - Complete nominations ceremony
   - Expected: Each nominee shows "NOM" pill; HOH still shows "HOH"
   - Command: `global.setNominees?.(game.hohId, [id1, id2])`

3. **POV Competition**
   - Complete POV comp with different winner
   - Expected: POV holder shows "POV" pill; HOH and NOM pills persist for their respective players
   - Command: Complete veto competition, check roster

4. **Combined HOH+POV**
   - Force HOH to win POV
   - Expected: HOH player shows both icons (👑🛡️)
   - Command: `game.vetoHolder = game.hohId; updateHud();`

5. **Eviction**
   - Evict a player
   - Expected: Evicted player's pills clear; eviction cross overlay only
   - Command: Complete live vote and eviction

6. **Winner Declaration**
   - Declare winner at game end
   - Expected: Winner shows 🥇 medal (overrides all other statuses)
   - Command: `global.declareWinner?.(playerId)`

### Test Files
- `test_badge_sync.html` – Tests badge synchronization logic
- `test_hoh_pov_badges.html` – Tests HOH/POV badge rendering
- `test_top_roster_priority.html` – Tests roster ordering and status display

## Architecture Notes

### Module Responsibilities
- `js/state.js` – Defines `syncPlayerBadgeStates()` function
- `js/ui.hud-and-router.js` – Calls sync in `updateHud()`, renders roster in `renderTopRoster()`
- `js/veto.js` – Calls sync after veto ceremony decisions
- `js/competitions.js` – Calls sync after HOH/POV competition results
- `js/nominations.js` – Calls sync after nomination ceremony
- `js/eviction.js` – Calls sync after eviction

### Data Flow
```
Game Event (HOH, Nominations, Veto)
  ↓
Update game.hohId / game.nominees / game.vetoHolder
  ↓
Call syncPlayerBadgeStates()
  ↓
Update p.hoh / p.nominated / p.nominationState for all players
  ↓
Call updateHud()
  ↓
Call renderTopRoster()
  ↓
Render status labels based on player flags
```

### Why Sync Before Render?
Player flags (`p.hoh`, `p.nominated`) can become stale if:
1. Game state is updated directly (e.g., `game.hohId = 5`)
2. Multiple state changes happen in quick succession
3. External modules modify game state without calling sync

By defensively calling `syncPlayerBadgeStates()` at the start of `updateHud()`, we ensure player flags always match game state before rendering.

## Final 3 Pending Mask

During Final 3 competitions (Part 1, Part 2, Part 3), all three remaining players display a neutral placeholder status `?` instead of HOH/NOM/POV until Part 3 results are finalized. This visually signals that final placement is not yet determined.

### Activation Conditions
The mask activates when ALL of the following are true:
1. Exactly 3 alive (non-evicted) players remain
2. Phase is one of: `final3_comp1`, `final3_comp2`, `final3_comp3`
3. `game.__f3ResultsLocked !== true`

### Deactivation
When Part 3 finishes (`finishF3P3()` in `js/competitions.js`):
1. Sets `game.__f3ResultsLocked = true`
2. Assigns HOH and nominees
3. Calls `updateHud()` to re-render with normal status pills

### Rendering
- **Top roster pills**: Use class `.status-final3-pending` with text `?` and aria-label `"<Name> (Final 3 – Pending Results)"`
- **Cast roster tags**: Add tag `{ k: 'f3pending', label: '?' }` with class `.tag.f3pending`
- The mask overrides all other status indicators (except WINNER/RUNNER-UP)

## NOM+POV Combined Badge

When a player is simultaneously a nominee and holds POV (but is not HOH), a combined badge displays instead of separate indicators.

### Activation Conditions
The combined badge displays when ALL of the following are true:
1. Player is a current nominee (`p.nominated === true` or in `game.nominees` array)
2. Player holds POV (`game.vetoHolder === p.id`)
3. Player is NOT HOH (`game.hohId !== p.id`)

### Rendering

**Top Roster (Pill View):**
- Emoji pair: `❓🛡️` inside `<span class="icon-nom-pov">` wrappers
- Classes: `.status-icon-label.nom-pov-icons`
- Aria-label: `"<Name> (Nominated and Veto Holder)"`
- Optional text fallback: `NOM+POV` with class `.status-nom-pov` (currently using emoji)

**Cast Roster (Table):**
- Tag: `NOM+POV` with class `.tag.nom-pov`
- The combined tag replaces individual NOM and VETO tags
- Styled with red-to-green gradient background

### Precedence
The NOM+POV badge has higher precedence than individual NOM/POV badges but lower than Final 3 Pending Mask, WINNER, and RUNNER-UP.

## Future Enhancements

Potential improvements for consideration:
1. Add animation for status label transitions
2. Add tooltip hover for combined HOH+POV explaining both statuses
3. Add visual indicator for "safe" status after POV usage
4. Add color coding for different nomination states (nominated vs pending save vs replacement)
5. Add accessibility announcements for screen readers when statuses change

## Related Files
- `js/ui.hud-and-router.js` – Main HUD and roster rendering
- `js/state.js` – Badge sync implementation
- `styles.css` – Status label styling (lines 1639-1717, 6116-6168)
- `test_badge_sync.html` – Badge sync test page
