# Zero Energy Modal - Visual Guide

## Modal Appearance

```
┌─────────────────────────────────────────────────────────────┐
│                    Blurred Background                        │
│                  (Game UI underneath)                        │
│                                                              │
│     ┌───────────────────────────────────────────────┐      │
│     │                                                 │      │
│     │                    🔋                          │      │
│     │             (Blinking animation)               │      │
│     │                                                 │      │
│     │           NO SOCIAL ENERGY                     │      │
│     │        (Red, uppercase, bold)                  │      │
│     │                                                 │      │
│     │   You have no energy remaining for            │      │
│     │         social interactions.                   │      │
│     │                                                 │      │
│     │   ┌────────────┐    ┌──────────────────┐     │      │
│     │   │    SKIP    │    │  🎬 Recharge     │     │      │
│     │   └────────────┘    └──────────────────┘     │      │
│     │   (Gray button)     (Orange gradient)         │      │
│     │                                                 │      │
│     └───────────────────────────────────────────────┘      │
│         (Blue gradient with red border)                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Button Actions

### SKIP Button
- **Style**: Gray with subtle hover effect
- **Action**: Immediately advances to next phase
- **Use case**: Player wants to skip social interaction entirely

### Recharge Button
- **Style**: Orange/gold gradient with movie icon (🎬)
- **Action**: Grants resources and returns to social phase
- **Resources granted**:
  - +5 Social Energy ⚡
  - +5 Influence 🤝
  - +5 Information 💡
- **Use case**: Player wants to participate but needs energy

## Animation Details

### Battery Icon (🔋)
- Size: 80px (60px on mobile)
- Animation: Blinking effect (1 second cycle)
  - 0% & 100%: opacity 0.3, scale 1.0
  - 50%: opacity 1.0, scale 1.1
- Creates attention-grabbing pulsing effect

### Modal Entry
- Fade in from opacity 0 to 1
- Scale up from 0.9 to 1.0
- Duration: 300ms
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (bounce effect)

### Modal Exit
- Fade out to opacity 0
- Scale down to 0.95
- Duration: 250ms
- Easing: linear

## Color Scheme

### Modal
- Background: Linear gradient (#1a2f44 → #243a50)
- Border: 3px solid #ff4444 (red)
- Shadow: Multi-layer drop shadow for depth

### Text
- Title: #ff4444 (red) - matches border
- Message: #d5e0f0 (light blue-gray)
- Readable on dark gradient background

### Buttons

#### SKIP
- Background: #2a3a4a (dark gray-blue)
- Border: #4a5a6a (medium gray-blue)
- Text: #e0e8f0 (light gray-blue)
- Hover: Lighter shade (#3a4a5a)

#### Recharge
- Background: Linear gradient (#ff8c00 → #ff6b00)
- Border: #ffa500 (orange)
- Text: #ffffff (white)
- Hover: Lighter gradient + scale(1.05)

## Responsive Design

### Desktop (> 768px)
- Modal max-width: 480px
- Battery icon: 80px
- Title: 1.8rem
- Message: 1rem
- Padding: 32px

### Mobile (≤ 768px)
- Modal max-width: 90% of screen
- Battery icon: 60px
- Title: 1.5rem
- Message: 0.9rem
- Padding: 24px
- Buttons stack vertically if needed

## Accessibility Features

### Keyboard Navigation
- SKIP button gets default focus
- Tab cycles through buttons
- Enter/Space activates focused button
- Escape key triggers SKIP action

### Screen Readers
- Modal has role="dialog" and aria-modal="true"
- Title has id for aria-labelledby reference
- Message has id for aria-describedby reference
- Buttons have descriptive labels
- Battery icon has aria-hidden="true"

## Z-Index Hierarchy
```
Background game UI        : z-index: default
Modal backdrop           : z-index: 9999999
Modal content            : z-index: 9999999 (same as backdrop)
```

## Integration Context

### When Modal Appears
1. Social phase starts
2. System checks player energy
3. If energy === 0:
   - Phase timer stops
   - Social launcher hides
   - Modal appears
4. Player makes choice

### After SKIP
1. Modal fades out
2. Phase advances to next
3. Social launcher remains hidden
4. Game continues

### After Recharge
1. Resources granted (energy, influence, information)
2. Bank balance updated
3. Modal fades out
4. Social launcher shows
5. Phase timer restarts (180 seconds)
6. HUD updates with new resources
7. Player can interact normally

## Browser Compatibility Notes

### Modern Features Used
- `backdrop-filter: blur(8px)` - May not work in older browsers
  - Fallback: Solid background color still readable
- CSS animations - Widely supported
- Flexbox layout - Universal support in modern browsers
- Linear gradients - Supported everywhere

### Graceful Degradation
- If blur not supported: Modal still functional with solid background
- If animations not supported: Modal displays statically
- If gradients not supported: Falls back to solid colors

## File Locations

### Implementation
- `js/social-maneuvers.js` - Modal creation and logic
- `css/social-maneuvers.css` - Animation keyframes (fallback in JS)

### Testing
- `test_zero_energy_modal.html` - Interactive testing
- `screenshot_zero_energy_modal.html` - Visual demonstration

### Documentation
- `ZERO_ENERGY_MODAL_SUMMARY.md` - Comprehensive implementation guide
- `ZERO_ENERGY_MODAL_VISUAL_GUIDE.md` - This file

## Future Enhancements

### Planned
- Ad video integration for Recharge button
- Analytics tracking for button clicks
- A/B testing different reward amounts

### Possible
- Animated reward numbers flying up after Recharge
- Sound effects (button clicks, resource gain)
- Different modal themes based on game state
- Progressive reward scaling (more energy for watching longer ads)
