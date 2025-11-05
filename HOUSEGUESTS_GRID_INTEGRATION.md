# Houseguests Grid & TV HUD Integration Guide

This guide provides examples for integrating the houseguests grid and TV HUD into existing parts of the BBMobile application.

## Overview

The implementation includes two new isolated UI modules:

1. **Houseguests Grid** (`src/ui/houseguestsGrid.js`) - Compact 4×4 grid for displaying houseguests
2. **TV HUD** (`src/ui/tvHud.js`) - Faux TV overlay displaying game state

These modules are **non-breaking** and **additive only**. They do not modify any existing functionality.

## CSS Files

- `css/houseguests-grid.css` - Grid styling (4×4 layout, status indicators)
- `css/tv-hud.css` - HUD overlay styling (Skip, Timer, Players, Season/Week, Mode)

## Testing

Run the test page to see the modules in action:

```bash
# Open in browser
open test_houseguests_grid_tv_hud.html
# or
python3 -m http.server 8000
# Then navigate to http://localhost:8000/test_houseguests_grid_tv_hud.html
```

Test at mobile viewports: 375px, 390px, 414px width

## Screenshot Generation

Generate screenshots at multiple mobile viewports:

```bash
# Install Playwright (if not already installed)
npm install

# Generate screenshots
npm run screenshot:houseguests
```

Screenshots will be saved to `screenshots/houseguests_grid_*.png`

## Integration Examples

### Example 1: TV HUD Integration

Add the TV HUD to an existing faux TV container (e.g., in `test_tv_screen.html` or main game flow):

```javascript
import { mountTvHud } from './src/ui/tvHud.js';

// Get the TV viewport element
const tvViewport = document.querySelector('.tvViewport');

// Mount the HUD
const hud = mountTvHud(tvViewport);

// Configure initial state
hud.setSeasonWeek(currentSeason, currentWeek);
hud.setMode('HOH Competition');
hud.setProgress(remainingPlayers, totalPlayers);
hud.setTimer(0);

// Register skip callback
hud.onSkip(() => {
  // Handle skip button click
  console.log('User requested skip');
  // Your skip logic here
});

// Update timer periodically
let seconds = 0;
setInterval(() => {
  seconds++;
  hud.setTimer(seconds);
}, 1000);

// Hide HUD when showing ceremony content
hud.setBusy(true);  // Fade out HUD
// ... show ceremony ...
hud.setBusy(false); // Fade in HUD
```

**CSS Integration:**

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="css/tv-hud.css">
```

### Example 2: Houseguests Grid Integration

Mount the houseguests grid in the main app (e.g., in `index.html` Houseguests section):

```javascript
import { mountHouseguestsGrid } from './src/ui/houseguestsGrid.js';

// Get container element
const container = document.getElementById('houseguestsGridContainer');

// Mount the grid
const grid = mountHouseguestsGrid(container, {
  onTap: (player) => {
    // Handle player tap/click
    console.log('Tapped:', player.name);
    // Show player profile or details
    showPlayerProfile(player.id);
  },
  onLongPress: (player) => {
    // Handle player long-press
    console.log('Long-pressed:', player.name);
    // Show contextual menu or actions
    showPlayerActions(player.id);
  }
});

// Render with game state
function updateGrid() {
  const players = window.game.players.map(p => ({
    id: p.id,
    name: p.name,
    avatar: p.avatar,
    hoh: p.isHOH,
    nom: p.isNominated,
    evicted: p.isEvicted
  }));
  
  grid.render(players);
}

// Update grid when game state changes
window.game.bus.on('stateChanged', updateGrid);

// Initial render
updateGrid();
```

**CSS Integration:**

```html
<!-- In your HTML head -->
<link rel="stylesheet" href="css/houseguests-grid.css">
```

### Example 3: Combined Integration in TV Container

Use both modules together for a complete mobile experience:

```javascript
import { mountHouseguestsGrid } from './src/ui/houseguestsGrid.js';
import { mountTvHud } from './src/ui/tvHud.js';

// Setup TV container
const tvViewport = document.querySelector('.tvViewport');

// Create grid container within TV
const gridContainer = document.createElement('div');
gridContainer.id = 'houseguestsGridContainer';
tvViewport.appendChild(gridContainer);

// Mount both components
const hud = mountTvHud(tvViewport);
const grid = mountHouseguestsGrid(gridContainer, {
  onTap: handlePlayerTap,
  onLongPress: handlePlayerLongPress
});

// Configure HUD
hud.setSeasonWeek(1, 3);
hud.setMode('Live Show');
hud.onSkip(handleSkip);

// Render grid
grid.render(players);

// Update both as game state changes
function syncGameState() {
  const activePlayers = players.filter(p => !p.evicted).length;
  hud.setProgress(activePlayers, players.length);
  grid.render(players);
}
```

### Example 4: Responsive Integration

Show the compact grid on mobile, traditional roster on desktop:

```javascript
// Responsive mounting
function setupHouseguestsView() {
  const container = document.getElementById('houseguestsContainer');
  const isMobile = window.innerWidth < 768;
  
  if (isMobile) {
    // Use compact grid for mobile
    import('./src/ui/houseguestsGrid.js').then(({ mountHouseguestsGrid }) => {
      const grid = mountHouseguestsGrid(container, {
        onTap: showPlayerProfile,
        onLongPress: showPlayerActions
      });
      grid.render(getPlayers());
    });
  } else {
    // Use traditional roster view for desktop
    renderTraditionalRoster(container);
  }
}

// Re-mount on resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    setupHouseguestsView();
  }, 250);
});

// Initial setup
setupHouseguestsView();
```

## API Reference

### Houseguests Grid

**mountHouseguestsGrid(container, options)**

Mounts a houseguests grid component.

- `container` (HTMLElement) - Container element for the grid
- `options.onTap` (Function) - Callback for tap/click, receives player data
- `options.onLongPress` (Function) - Callback for long-press (500ms), receives player data

Returns an object with:
- `render(players)` - Update grid with new player data
- `destroy()` - Remove grid and clean up

**Player Data Format:**

```javascript
{
  id: 'unique-id',
  name: 'Player Name',
  avatar: 'path/to/avatar.png',
  hoh: false,      // boolean - Is Head of Household
  nom: false,      // boolean - Is Nominated
  evicted: false   // boolean - Is Evicted
}
```

### TV HUD

**mountTvHud(root)**

Mounts a TV HUD overlay component.

- `root` (HTMLElement) - Root container (typically TV viewport)

Returns an object with:
- `setBusy(busy)` - Show/hide HUD (boolean)
- `setProgress(current, total)` - Update players progress bar (numbers)
- `setSeasonWeek(season, week)` - Update season/week pills (numbers)
- `setMode(mode)` - Update mode label (string, will be uppercased)
- `setTimer(seconds)` - Update timer display (number, formatted as MM:SS)
- `onSkip(fn)` - Register skip button callback (function)
- `setSkipEnabled(enabled)` - Enable/disable skip button (boolean)
- `destroy()` - Remove HUD and clean up

## Styling Notes

- All CSS uses namespaced classes (`hg-*` for grid, `tv-*` for HUD)
- CSS variables allow customization without modifying source files
- Theme-aware with light/dark mode support
- Mobile-first responsive design with breakpoints at 375px, 390px, 768px

## Browser Support

- Modern browsers with ES module support
- Pointer events API (cross-device tap/touch)
- CSS Grid (all modern browsers)
- CSS custom properties (variables)

## GitHub Actions

The `.github/workflows/screenshot-houseguests.yml` workflow automatically generates screenshots on pull requests. Screenshots are uploaded as artifacts for visual review.

## Notes

- These modules are isolated and don't modify existing game logic
- No changes to existing flows or data structures
- Can be integrated incrementally without breaking changes
- File paths use relative URLs for `file://` protocol compatibility
- All event listeners are properly cleaned up on destroy()

## Future Enhancements

Potential future improvements (not included in this PR):

- Animation transitions when players change status
- Drag-and-drop for player reordering
- Filtering/search functionality
- Additional status indicators (veto, safety, etc.)
- Customizable grid size (3×3, 4×4, 5×5)
- Integration with existing player service module
