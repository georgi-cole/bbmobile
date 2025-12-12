# Live Vote UI Reference - Fallback Implementation

## Overview
This document describes the visual appearance and behavior of the lv2-shim fallback UI.

## Two-Nominee Vote UI (Standard Eviction)

### Visual Layout
```
┌────────────────────────────────────────────┐
│                                            │
│           Vote to Evict                    │
│                                            │
│   ┌──────────────┐  ┌──────────────┐     │
│   │ Evict Alice  │  │  Evict Bob   │     │
│   └──────────────┘  └──────────────┘     │
│                                            │
└────────────────────────────────────────────┘
```

### Styling Details
- **Container**:
  - Background: `rgba(0, 0, 0, 0.8)` (semi-transparent black)
  - Padding: `20px`
  - Min-height: `200px`
  - Z-index: `100` (above TV content)
  - Display: `flex` (centered layout)

- **Title**:
  - Text: "Vote to Evict"
  - Color: `white`
  - Font-size: `20px`
  - Font-weight: `bold`

- **Vote Buttons**:
  - Text: "Evict [Name]"
  - Background: `#d9534f` (red)
  - Color: `white`
  - Border: `2px solid #d9534f`
  - Padding: `12px 24px`
  - Border-radius: `8px`
  - Font-size: `16px`
  - Font-weight: `bold`
  - Cursor: `pointer`
  - Pointer-events: `auto` (always clickable)
  
- **Button Hover**:
  - Background: `#c9302c` (darker red)
  - Border-color: `#c9302c`
  - Transition: `all 0.3s ease`

- **Button Disabled (after vote)**:
  - Opacity: `0.6`
  - Cursor: `not-allowed`

## Triple Eviction UI (Three Nominees)

### Visual Layout
```
┌─────────────────────────────────────────────────────────────┐
│                                                               │
│                    Vote to Evict                              │
│                                                               │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│   │              │  │              │  │              │     │
│   │    Alice     │  │     Bob      │  │    Carol     │     │
│   │              │  │              │  │              │     │
│   │  ┌────────┐  │  │  ┌────────┐  │  │  ┌────────┐  │     │
│   │  │  Evict │  │  │  │  Evict │  │  │  │  Evict │  │     │
│   │  └────────┘  │  │  └────────┘  │  │  └────────┘  │     │
│   │              │  │              │  │              │     │
│   └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Styling Details
- **Container**:
  - Background: `rgba(0, 0, 0, 0.8)`
  - Padding: `20px`
  - Min-height: `300px`
  - Z-index: `100`
  - Display: `flex` (centered)

- **Title**:
  - Text: "Vote to Evict"
  - Color: `white`
  - Font-size: `24px`
  - Font-weight: `bold`

- **Nominee Cards**:
  - Display: `flex` (column layout)
  - Background: `rgba(255, 255, 255, 0.1)`
  - Border: `2px solid rgba(255, 255, 255, 0.3)`
  - Border-radius: `12px`
  - Padding: `16px`
  - Min-width: `150px`
  - Max-width: `200px`
  - Cursor: `pointer` (entire card is clickable)
  - Gap: `16px` (between cards)

- **Card Hover**:
  - Background: `rgba(255, 255, 255, 0.2)`
  - Border-color: `#d9534f` (red)
  - Transition: `all 0.3s ease`

- **Nominee Name**:
  - Color: `white`
  - Font-size: `18px`
  - Font-weight: `600`
  - Text-align: `center`

- **Card Buttons**:
  - Text: "Evict"
  - Background: `#d9534f` (red)
  - Color: `white`
  - Border: `2px solid #d9534f`
  - Padding: `10px 24px`
  - Border-radius: `8px`
  - Font-size: `16px`
  - Font-weight: `bold`

- **Button Hover**:
  - Background: `#c9302c`
  - Border-color: `#c9302c`

## Interaction Behavior

### Click Flow
1. **User sees vote UI** - Buttons/cards rendered with hover effects
2. **User hovers over button/card** - Visual feedback (darker background)
3. **User clicks button/card** - Vote is cast
4. **Button disables** - Opacity reduced, cursor changes to not-allowed
5. **Callback fires** - `onVote(nomineeId)` is called
6. **Game processes vote** - Eviction logic continues

### Mobile Behavior
- Touch events supported
- Cards stack vertically on narrow screens
- Min-height ensures adequate touch targets
- Responsive gap between elements

## CSS Classes

### Applied to Elements
```css
.lv2-shim-fallback       /* Two-nominee container */
.lv2-shim-triple         /* Triple nominee container */
.voteOverlayOpen         /* Applied to panel when overlay active */
```

### Stub CSS Files
- `css/livevote-choice-card.css` - Card styling
- `css/livevote-voteoverlay.css` - Overlay styling
- `css/livevote-rollout.css` - Rollout display
- `css/livevote-overrides.css` - Z-index and pointer-events fixes

## Accessibility

### Keyboard Support
- Buttons are focusable via Tab key
- Enter/Space activate buttons
- Visual focus indicators present

### Screen Reader Support
- Button text clearly identifies action ("Evict [Name]")
- Vote confirmation logged to console
- Semantic HTML structure

### Reduced Motion
- Transitions respect `prefers-reduced-motion` media query
- No animations, only simple transitions

## Fallback Behavior

### When Fallback UI is Used
1. **EvictionCarousel unavailable** - Primary vote UI module not loaded
2. **LiveVoteOverlay unavailable** - Overlay vote module not loaded
3. **Real lv2 modules absent** - Full livevote implementation not present

### Fallback Priority
1. **First choice**: EvictionCarousel (if available)
2. **Second choice**: lv2-shim fallback UI (always available)

### Graceful Degradation
- Simple button UI works in all browsers
- No dependencies on external libraries
- Inline styles ensure rendering even if CSS fails
- Z-index: 100 ensures visibility above game UI

## Testing the UI

### Manual Visual Check
1. Open `test_lv2_shim.html`
2. Click "Start Two-Nominee Vote"
3. Observe:
   - Title appears
   - Two buttons appear side-by-side
   - Hover shows darker red
   - Click disables button
   - Console shows vote callback

4. Click "Start Triple Eviction Vote"
5. Observe:
   - Title appears
   - Three cards appear
   - Hover highlights card
   - Click on card or button triggers vote
   - Console shows vote callback

### Browser DevTools Inspection
```javascript
// Check if UI is rendered
document.querySelector('.lv2-shim-fallback')
document.querySelector('.lv2-shim-triple')

// Check z-index
getComputedStyle(document.querySelector('.lv2-shim-fallback')).zIndex
// Should return "100"

// Check pointer-events
getComputedStyle(document.querySelector('.lv2-shim-fallback')).pointerEvents
// Should return "auto"
```

## Known Limitations

### Visual Differences from Full Implementation
- No animated vote reveals
- No vote rollout animations
- No nominee photos (in fallback, but present if EvictionCarousel is used)
- Simple button layout vs. elaborate card UI

### Acceptable Trade-offs
- Fallback is functional, not fancy
- Primary goal is error prevention
- Real modules can be restored from archive if full features needed
- Minimal size keeps page load fast

## Future Enhancements (Optional)

### Potential Improvements
- Add nominee avatars to fallback UI
- Add simple fade-in animation
- Add vote count display
- Add timer countdown

### Not Recommended
- Don't add complex animations (increases size/complexity)
- Don't add external dependencies (defeats purpose of fallback)
- Don't replicate full livevote features (use real modules instead)

## Summary

The lv2-shim fallback UI provides a **simple, functional, and robust** voting interface when full livevote modules are unavailable. It prioritizes:
- ✅ **Functionality** - Voting works reliably
- ✅ **Visibility** - Z-index ensures UI is not hidden
- ✅ **Accessibility** - Keyboard and screen reader support
- ✅ **Compatibility** - Works in all modern browsers
- ✅ **Safety** - No external dependencies, inline styles

This ensures the game can proceed through evictions without errors, maintaining a positive user experience even with minimal assets.
