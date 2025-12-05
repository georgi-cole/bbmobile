# Social Phase Carousel Implementation

## Overview

This implementation adds mobile-friendly horizontal carousels to the Social Maneuvers phase in BBMobile, making the entire social interaction interface fit within a single screen (100vh) without vertical scrolling. It also relocates Recent Activity/History into a top bar button.

## Goals Achieved

✅ **Actions Carousel**: Horizontal scroll/carousel with snap, controls, and accessibility for choosing actions  
✅ **Players Carousel**: Horizontal scroller showing up to ~8 avatars at a time with paging support  
✅ **History Button**: Top bar button next to indicators (Energy, Influence, Insights) that opens history view  
✅ **100vh Mobile Layout**: Entire module fits on screen with proper safe area insets  
✅ **ES Module Structure**: Clean modular code with minimal dependencies  
✅ **Accessibility**: Proper ARIA labels, keyboard navigation, and screen reader support  

## File Structure

### CSS Files

#### `css/ui/social-carousel.css`
- **Purpose**: Styles for the actions carousel and 100vh mobile layout
- **Key Features**:
  - `.social-module-container`: Flex column layout with 100vh height
  - `.social-actions-carousel`: Horizontal scrollable actions with snap
  - `.social-action-card`: Individual action cards (280px width on desktop, 200px on mobile)
  - `.social-carousel-nav`: Previous/Next navigation buttons
  - `.social-carousel-dots`: Dot indicators for carousel pages
  - Safe area insets for mobile notches
  - Responsive breakpoints (768px, 480px)
  - Reduced motion support

#### `css/ui/social-players-carousel.css`
- **Purpose**: Styles for the players horizontal scroller
- **Key Features**:
  - `.social-players-carousel`: Container with ~8 visible avatars at once
  - `.social-player-avatar-card`: Individual player cards (80px on desktop, 64px on mobile)
  - `.social-player-selection-badge`: Visual selection indicator with checkmark
  - `.social-players-nav`: Prev/Next buttons for paging by stride
  - Multi-select mode support
  - Scroll indicators (left/right fade)
  - High contrast mode support

#### `css/ui/topbar-history-button.css`
- **Purpose**: Styles for top bar layout and history button
- **Key Features**:
  - `.social-topbar-container`: Flexible top bar layout
  - `.social-resource-indicator`: Energy, Influence, Information badges
  - `.social-history-button`: History button with hover effects
  - `.social-history-overlay`: Modal overlay for history view
  - `.social-history-panel`: History content panel
  - Pulse animation for notification badges
  - Mobile responsive adjustments

### JavaScript Modules

#### `js/ui/social/actionsCarousel.js`
- **Purpose**: ES module for actions carousel with snap scrolling
- **Exports**: `ActionsCarousel` object with `init()` method
- **Key Features**:
  - **Snap Scrolling**: Smooth horizontal scroll with snap-to-card behavior
  - **Navigation**: Prev/Next buttons with automatic enable/disable
  - **Dot Indicators**: Visual page indicators that update on scroll
  - **Keyboard Support**: Arrow Left/Right, Home/End, Enter/Space
  - **Selection Tracking**: Single action selection with visual feedback
  - **State Management**: Maintains current index and selected action
  - **Accessibility**: ARIA labels, roles, and live regions
- **Public API**:
  ```javascript
  const carousel = ActionsCarousel.init({
    container: element,
    actions: [...],
    onSelect: (actionId, index) => {},
    enableKeyboard: true
  });
  carousel.scrollToIndex(index);
  carousel.selectAction(actionId, index);
  carousel.getSelectedAction();
  carousel.updateActions([...]);
  carousel.destroy();
  ```

#### `js/ui/social/playersCarousel.js`
- **Purpose**: ES module for players horizontal scroller
- **Exports**: `PlayersCarousel` object with `init()` method
- **Key Features**:
  - **Horizontal Scroll**: Smooth scrolling with ~8 visible avatars
  - **Paging by Stride**: Prev/Next buttons page by maxVisible count
  - **Multi-Select**: Optional multi-select mode with selection badges
  - **Player Exclusion**: Exclude specific player IDs (e.g., human player)
  - **Avatar Resolution**: Uses global `resolveAvatar()` helper
  - **Scroll Indicators**: Fade indicators when more content exists
  - **State Management**: Tracks selected player IDs
- **Public API**:
  ```javascript
  const carousel = PlayersCarousel.init({
    container: element,
    players: [...],
    multiSelect: false,
    maxVisible: 8,
    excludeIds: [1],
    onSelect: (playerIds) => {}
  });
  carousel.getSelectedPlayers();
  carousel.setSelectedPlayers([...]);
  carousel.clearSelection();
  carousel.updatePlayers([...], excludeIds);
  carousel.destroy();
  ```

#### `js/ui/topbar/historyButton.js`
- **Purpose**: Helper to inject History button next to resource indicators
- **Exports**: `HistoryButton` object with `init()` method
- **Key Features**:
  - **Top Bar Layout**: Renders resources and history button
  - **Resource Display**: Energy, Influence, Information indicators
  - **History Modal**: Built-in modal/overlay for history content
  - **Resource Updates**: Update resource values dynamically
  - **Keyboard Support**: Escape key to close modal
  - **Event Handling**: Custom onOpen callback for history loading
- **Public API**:
  ```javascript
  const button = HistoryButton.init({
    container: element,
    resources: { energy: 5, influence: 25, information: 10 },
    onOpen: () => {}
  });
  button.updateResources({ energy: 7, ... });
  button.showHistoryModal(htmlContent);
  button.hideHistoryModal();
  button.destroy();
  ```

#### `js/ui/social/carouselIntegration.js`
- **Purpose**: Integration layer for Social Maneuvers phase
- **Exports**: `SocialCarouselIntegration` with `renderSocialUIWithCarousels()`
- **Key Features**:
  - **100vh Layout**: Structured layout (topbar, actions, players, CTA)
  - **Carousel Integration**: Uses ActionsCarousel and PlayersCarousel
  - **Backward Compatibility**: Falls back to grid layout if modules unavailable
  - **State Management**: Tracks selected actions and players
  - **Action Execution**: Integrates with SocialManeuvers.executeAction
  - **Feedback System**: Shows success/failure overlays
  - **Multi-Target Support**: Switches carousel mode based on action
- **Public API**:
  ```javascript
  SocialCarouselIntegration.renderSocialUIWithCarousels(container, playerId, {
    useCarousels: true,
    showHistory: true
  });
  ```

## Test Files

### `test_social_actions_carousel.html`
- **Purpose**: Test actions carousel in isolation
- **Features**:
  - Load sample actions (8 items)
  - Load many actions (15 items)
  - Simulate disabled/locked actions
  - Test keyboard navigation
  - Visual feedback for selection
  - Event log display

### `test_social_players_carousel.html`
- **Purpose**: Test players carousel and history button
- **Features**:
  - Load 8 or 16 players
  - Toggle multi-select mode
  - Test player exclusion (human player)
  - Test history button and modal
  - Update resource values
  - Visual selection feedback

### `test_social_carousel_full_integration.html`
- **Purpose**: Full integration test with complete social UI
- **Features**:
  - 100vh mobile layout
  - Complete carousel integration
  - Action execution with feedback
  - Resource management
  - History button with modal
  - Mobile viewport toggle
  - 8 or 16 player scenarios
  - Low energy simulation

## Integration with Social Maneuvers

The carousel system integrates with the existing Social Maneuvers system through:

1. **Resource Access**: Uses `SocialManeuvers.SocialResources.getAll(playerId)`
2. **Actions**: Uses `SocialManeuvers.SOCIAL_ACTIONS` and `getAvailableActions()`
3. **Execution**: Calls `SocialManeuvers.executeAction(actorId, targetId, actionId, extraTargets)`
4. **Player Data**: Uses global `getP()`, `alivePlayers()`, `safeName()`, `resolveAvatar()`
5. **Feature Flag**: Respects `window.game.cfg.enableSocialManeuvers`

## Mobile Responsiveness

### Breakpoints

- **Desktop (>768px)**: Full-size cards, 280px actions, 80px avatars
- **Tablet (768px)**: Medium cards, 240px actions, 70px avatars
- **Mobile (480px)**: Compact cards, 200px actions, 64px avatars

### Layout Behavior

1. **Actions Section**: Max 35-40% of viewport height, scrollable
2. **Players Section**: Fixed height, horizontal scroll only
3. **CTA Button**: Always visible at bottom, no scroll required
4. **Top Bar**: Flexible, wraps on narrow screens
5. **Safe Areas**: Respects iPhone notches and safe area insets

### Touch Support

- **Swipe**: Native touch scrolling for carousels
- **Tap**: Select cards with touch
- **Long Press**: No special handling (uses default)
- **Pinch**: Prevented via viewport meta tag

## Accessibility

### ARIA Support

- `role="region"` and `role="list"` for semantic structure
- `role="listitem"` for individual cards
- `role="tab"` and `role="tablist"` for dot indicators
- `aria-label` for descriptive labels on all interactive elements
- `aria-selected` for selection state
- `aria-disabled` for disabled cards
- `aria-live="polite"` for dynamic updates

### Keyboard Navigation

#### Actions Carousel
- **Arrow Left/Right**: Navigate between cards
- **Home/End**: Jump to first/last card
- **Enter/Space**: Select focused card
- **Tab**: Focus next/previous element

#### Players Carousel
- **Tab**: Focus avatars sequentially
- **Enter/Space**: Select/deselect player
- **Arrow keys**: Native scroll behavior

#### History Button
- **Tab**: Focus button
- **Enter/Space**: Open history
- **Escape**: Close history modal

### Screen Reader Support

- Descriptive labels for all controls
- Live regions for dynamic content updates
- Status announcements for resource changes
- Selection state announcements
- Error and feedback messages

## Performance Considerations

### Optimizations

1. **Lazy Loading**: Avatar images loaded lazily
2. **Event Delegation**: Minimal event listeners
3. **Scroll Throttling**: Debounced scroll handlers
4. **DOM Reuse**: Cards reused when possible
5. **CSS Transitions**: Hardware-accelerated transforms

### Memory Management

- `destroy()` methods clean up event listeners
- DOM elements properly removed
- State objects cleared on destroy
- No memory leaks in repeated renders

## Browser Compatibility

### Supported Browsers

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Safari iOS 14+
- ✅ Chrome Android 90+

### Required Features

- CSS Scroll Snap (fallback: smooth scroll)
- CSS Grid and Flexbox
- ES6 Modules
- CSS Custom Properties
- Touch Events

### Fallbacks

- No carousel modules: Grid layout
- No scroll snap: Smooth scroll
- No ES modules: Legacy script loading
- Reduced motion: Instant transitions

## Usage Examples

### Basic Integration

```javascript
// Load modules
import { ActionsCarousel } from './js/ui/social/actionsCarousel.js';
import { PlayersCarousel } from './js/ui/social/playersCarousel.js';
import { HistoryButton } from './js/ui/topbar/historyButton.js';

// Make available globally
window.ActionsCarousel = ActionsCarousel;
window.PlayersCarousel = PlayersCarousel;
window.HistoryButton = HistoryButton;

// Load integration
import './js/ui/social/carouselIntegration.js';

// Render social UI
const container = document.getElementById('socialContainer');
SocialCarouselIntegration.renderSocialUIWithCarousels(container, playerId, {
  useCarousels: true,
  showHistory: true
});
```

### Standalone Carousel Usage

```javascript
// Actions carousel only
const actionsCarousel = ActionsCarousel.init({
  container: document.getElementById('actionsContainer'),
  actions: [
    { id: 'smalltalk', label: 'Small Talk', cost: 1, description: '...', category: 'friendly' },
    // ... more actions
  ],
  onSelect: (actionId, index) => {
    console.log('Selected:', actionId);
  },
  enableKeyboard: true
});

// Players carousel only
const playersCarousel = PlayersCarousel.init({
  container: document.getElementById('playersContainer'),
  players: [
    { id: 2, name: 'Alice', avatar: '...' },
    // ... more players
  ],
  multiSelect: false,
  maxVisible: 8,
  excludeIds: [1], // Exclude human player
  onSelect: (playerIds) => {
    console.log('Selected players:', playerIds);
  }
});
```

## Future Enhancements

### Potential Improvements

1. **Animation Enhancements**:
   - Card flip animations for selection
   - Parallax scrolling effects
   - Stagger animations on load

2. **Advanced Features**:
   - Infinite carousel looping
   - Thumbnail preview mode
   - Filter/search for actions
   - Favorite actions bookmarking

3. **Mobile Optimizations**:
   - PWA gesture support
   - Haptic feedback on selection
   - Pull-to-refresh for history
   - Swipe-to-dismiss cards

4. **Accessibility**:
   - Voice control integration
   - Enhanced screen reader mode
   - High contrast themes
   - Font size scaling

5. **Performance**:
   - Virtual scrolling for large lists
   - Intersection Observer for visibility
   - Web Worker for heavy computations
   - Service Worker caching

## Known Issues & Limitations

### Current Limitations

1. **Dot Indicators**: Limited to 5 dots max to prevent clutter
2. **Multi-Select**: Order shown in badge, but not enforced
3. **History**: Placeholder content, needs real data integration
4. **Carousel Loop**: No infinite loop (intentional for clarity)
5. **Touch Gestures**: Basic support, no advanced gestures

### Browser-Specific Issues

- **Safari iOS < 15**: Scroll snap may be janky
- **Firefox Android**: Touch scrolling slightly different
- **Edge Legacy**: May need polyfills (not supported)

## Testing Checklist

- [x] Actions carousel renders correctly
- [x] Actions carousel navigation (prev/next) works
- [x] Actions carousel keyboard navigation works
- [x] Actions carousel dot indicators update
- [x] Actions carousel selection works
- [x] Players carousel renders correctly
- [x] Players carousel paging works
- [x] Players carousel selection works (single)
- [x] Players carousel selection works (multi)
- [x] Players carousel excludes human player
- [x] History button renders in top bar
- [x] History button opens modal
- [x] History modal closes with X button
- [x] History modal closes with Escape key
- [x] Resource indicators display correctly
- [x] Resource indicators update dynamically
- [x] 100vh layout fits on screen
- [x] No vertical scrolling required
- [x] CTA button always visible
- [x] Mobile responsive (480px)
- [x] Tablet responsive (768px)
- [x] Touch scrolling works
- [x] Safe area insets respected
- [x] Accessibility: ARIA labels present
- [x] Accessibility: Keyboard navigation works
- [x] Accessibility: Screen reader compatible

## Support

For issues or questions, please refer to:
- Test files in repository root
- Inline code documentation
- GitHub issues

---

**Implementation Date**: December 2024  
**Version**: 1.0  
**Status**: Complete ✅
