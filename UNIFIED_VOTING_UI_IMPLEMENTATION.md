# Unified Voting UI Implementation

## Overview

This document describes the implementation of the unified voting UI system for BBMobile eviction sequences. The goal was to eliminate duplicate and overlapping voting UI elements by consolidating all vote displays into a single, consistent avatar modal system.

## Problem Statement

Previously, the eviction flow produced duplicate or overlapping voting UIs:
- Avatar-based Diary Room modal in #tvOverlay
- Legacy 'Diary Room' revealCard elements
- LiveVoteOverlay and LiveVoteRollout elements appearing simultaneously
- Inconsistent timing across different eviction types (single, double, triple)

## Solution: VoteDisplayManager

A centralized manager that controls all vote display logic and ensures only one vote UI is active at a time.

### Architecture

```
VoteDisplayManager (js/eviction.js)
├── State Management
│   ├── active (boolean)
│   ├── currentTimeout (setTimeout reference)
│   ├── suppressLegacy (boolean)
│   └── currentCard (DOM element reference)
├── Public Methods
│   ├── showVote(voterId, targetId, message, duration)
│   ├── clear()
│   ├── isActive()
│   └── clearLegacyArtifacts()
└── Automatic Cleanup
    ├── Body class toggle (vote-modal-active)
    ├── Legacy card purging
    └── Timeout management
```

## Key Features

### 1. Single Vote Modal Display
- All votes display in a unified avatar modal inside #tvOverlay
- Shows voter avatar → target avatar with vote message
- Consistent styling and animation

### 2. Automatic Artifact Cleanup
- Removes legacy 'Diary Room' revealCard elements before showing new vote
- Hides conflicting LiveVoteOverlay if active
- Prevents UI conflicts through body class toggling

### 3. Configurable Timing
- Default duration: 2600ms (configurable via `g.cfg.voteModalMs`)
- Consistent timing across all eviction types
- Same duration used for single, double, and triple evictions

### 4. Fallback Support
- Gracefully falls back to legacy `global.showCard` if:
  - TV element is not available
  - Player objects cannot be resolved
- Logs fallback usage to console for debugging

### 5. Backward Compatibility
- All legacy functions preserved (`showDiaryRoomWithAvatars`)
- No global API removal
- Existing code continues to work without modification

## Implementation Details

### VoteDisplayManager API

#### showVote(voterId, targetId, message, duration)
Displays a vote in the unified avatar modal.

**Parameters:**
- `voterId` (number) - ID of the voter
- `targetId` (number) - ID of the target/nominee
- `message` (string) - Vote message to display
- `duration` (number, optional) - Display duration in ms (defaults to `g.cfg.voteModalMs` or 2600)

**Behavior:**
1. Clears any existing vote display
2. Purges legacy artifacts
3. Resolves player objects and avatars
4. Creates avatar modal in #tvOverlay
5. Adds body class `vote-modal-active`
6. Sets auto-clear timeout
7. Falls back to legacy card if structure unavailable

**Example:**
```javascript
VoteDisplayManager.showVote(1, 2, 'Alice: I vote to evict Bob.', 2600);
```

#### clear()
Clears the current vote modal display.

**Behavior:**
1. Clears auto-remove timeout
2. Removes current card from DOM
3. Clears tvOverlay content
4. Removes body class `vote-modal-active`
5. Removes tvTall class if overlay is empty

**Example:**
```javascript
VoteDisplayManager.clear();
```

#### isActive()
Returns whether a vote modal is currently active.

**Returns:** `boolean`

**Example:**
```javascript
if (VoteDisplayManager.isActive()) {
  console.log('Vote modal is currently showing');
}
```

#### clearLegacyArtifacts()
Removes legacy voting UI artifacts that might conflict.

**Behavior:**
1. Removes `.revealCard` elements containing 'Diary Room' text
2. Hides LiveVoteOverlay if active
3. Logs cleanup actions to console

**Example:**
```javascript
VoteDisplayManager.clearLegacyArtifacts();
```

### Integration Points

#### beginDiaryRoomSequence()
Updated to use VoteDisplayManager for all per-vote displays.

**Changes:**
- Replaced direct `showDiaryRoomWithAvatars` calls with `VoteDisplayManager.showVote`
- Removed legacy `global.showCard('Diary Room')` hints
- Added inline hint inside modal for human turn
- Uses configurable duration from `g.cfg.voteModalMs`
- Disabled lv2 per-vote UI via `useLv2PerVote = false` flag

#### revealVotes()
Updated to clear vote modal before showing result cards.

**Changes:**
- Calls `VoteDisplayManager.clear()` before showing result
- Calls `VoteDisplayManager.clearLegacyArtifacts()` to purge duplicates
- Ensures clean slate for result display

#### multiEvictFinalize()
Updated to clear vote modal before showing multi-eviction results.

**Changes:**
- Calls `VoteDisplayManager.clear()` before showing results
- Calls `VoteDisplayManager.clearLegacyArtifacts()` to purge duplicates
- Consistent with single eviction cleanup

### Configuration

#### voteModalMs (Default: 2600)
Duration for unified vote modal display in milliseconds.

**Location:** `js/config/defaults.js`

**Usage:**
```javascript
// Get current duration
const duration = window.game.cfg.voteModalMs;

// Set custom duration (persists in localStorage)
window.game.cfg.voteModalMs = 3000;
```

### CSS Styling

#### .vote-modal-active Body Class
Applied when vote modal is active, hides conflicting UI elements.

**Location:** `styles.css`

**Styles:**
```css
/* Hide legacy panels when unified vote modal is active */
body.vote-modal-active #legacyVotePanel,
body.vote-modal-active .lv-rollout-overlay,
body.vote-modal-active .lv-overlay {
  display: none !important;
}

/* Ensure vote modal appears above all other UI */
body.vote-modal-active #tvOverlay {
  z-index: 1000;
}
```

## Testing

### Automated Tests
All existing tests pass:
- ✅ Minigame validation
- ✅ Runtime helpers
- ✅ E2E competitions
- ✅ Social maneuvers
- ✅ POV carousel

### Manual Testing
Test page: `test_unified_voting_ui.html`

**Test Cases:**
1. **Basic Vote Display** - Shows single vote with avatars
2. **Sequential Votes** - Simulates diary room sequence
3. **Fallback Mode** - Tests graceful fallback when TV unavailable
4. **Artifact Cleanup** - Verifies legacy card removal
5. **State Management** - Checks body class and overlay state

**How to Test:**
1. Open `test_unified_voting_ui.html` in browser
2. Click buttons to trigger different test scenarios
3. Observe status messages and TV display
4. Verify no duplicate cards appear
5. Check browser console for fallback logs

### Integration Testing
Recommended integration tests:
1. Single eviction with human voter mid-sequence
2. Double eviction sequence
3. Triple eviction (K=3 scenario)
4. Eviction with TV element temporarily removed (fallback test)
5. Card queue behavior after result reveal

## Migration Path

### For Developers
**No code changes required.** The unified system is backward compatible:
- Existing `showDiaryRoomWithAvatars` calls continue to work
- Legacy functions preserved as wrappers
- Automatic cleanup prevents conflicts

### For Users
**No visible changes** beyond improved consistency:
- Single vote UI style across all eviction types
- No more duplicate cards
- Smoother transitions between votes and results

## Troubleshooting

### Vote Modal Not Showing
**Symptoms:** No vote display appears during eviction sequence

**Possible Causes:**
1. TV element (#tv) not present in DOM
2. Player objects not resolved (check `window.getP()`)
3. Avatar resolution failing

**Debug Steps:**
1. Check browser console for fallback messages
2. Verify `window.game.cfg.voteModalMs` is set
3. Inspect #tvOverlay element exists
4. Check player data is loaded

### Duplicate Cards Still Appearing
**Symptoms:** Legacy cards visible alongside avatar modal

**Possible Causes:**
1. CSS not loaded (body.vote-modal-active styles missing)
2. External code creating cards outside VoteDisplayManager
3. Timing issue with cleanup

**Debug Steps:**
1. Inspect body element for `vote-modal-active` class
2. Check styles.css loaded correctly
3. Review browser console for cleanup warnings
4. Verify `clearLegacyArtifacts()` being called

### Modal Not Clearing
**Symptoms:** Vote modal remains visible after duration expires

**Possible Causes:**
1. Timeout not set or cleared prematurely
2. Manual `clear()` call interfering
3. JavaScript error preventing cleanup

**Debug Steps:**
1. Check `VoteDisplayManager.isActive()` returns true
2. Verify no JavaScript errors in console
3. Manually call `VoteDisplayManager.clear()`
4. Check tvOverlay innerHTML

## Performance Considerations

### Memory Management
- Timeouts automatically cleared on manual clear()
- DOM elements removed, not just hidden
- No memory leaks from abandoned intervals

### DOM Manipulation
- Minimal DOM operations per vote
- Reuses #tvOverlay container
- Clears content efficiently with innerHTML = ''

### Timing Optimization
- Default 2600ms balances readability and pacing
- Configurable for faster/slower sequences
- Gap between votes (180ms) prevents visual overlap

## Future Enhancements

### Potential Improvements
1. **Animation System** - Add smooth transitions between votes
2. **Vote Queuing** - Queue multiple votes for batch display
3. **Progress Indicator** - Show vote count (e.g., "3 of 5 votes")
4. **Customization** - Allow theme-specific styling
5. **Accessibility** - Add ARIA live regions for screen readers

### Extension Points
1. **Custom Vote Types** - Support different vote message formats
2. **Vote Analytics** - Track display duration and user engagement
3. **Multi-Language** - Internationalize vote messages
4. **Mobile Optimization** - Further optimize for touch devices

## References

### Related Files
- `js/eviction.js` - VoteDisplayManager implementation
- `js/config/defaults.js` - Configuration defaults
- `styles.css` - CSS styling
- `test_unified_voting_ui.html` - Test page

### Related Documentation
- Issue #518 (PR merged then reverted) - Original duplicate UI problem
- `EVICTION_FLOW_DIAGRAM.md` - Eviction sequence flow
- `EVICTION_VISUALS_README.md` - Visual enhancements

## Changelog

### Version 1.0 (Initial Release)
- Added VoteDisplayManager module
- Refactored beginDiaryRoomSequence()
- Updated revealVotes() and multiEvictFinalize()
- Added voteModalMs config option
- Added CSS styling for .vote-modal-active
- Created test page for verification
- All backward compatibility maintained

## License

This implementation follows the existing BBMobile project license.

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review test page examples
3. Inspect browser console for debug logs
4. Consult related documentation files
