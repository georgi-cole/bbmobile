# Minigame Accessibility Guide

## Overview

The minigame system is designed to be accessible to all players, including those using assistive technologies like screen readers or requiring keyboard navigation. This guide covers accessibility features and best practices.

## WCAG 2.1 Level AA Compliance

The system targets **WCAG 2.1 Level AA** compliance with the following features:

### ✅ Perceivable
- Color contrast ratio ≥ 4.5:1 for text
- Visual information not conveyed by color alone
- Alternative text for images
- Consistent visual patterns

### ✅ Operable
- Keyboard navigation for all functionality
- No keyboard traps
- Sufficient time for interactions
- Clear focus indicators

### ✅ Understandable
- Clear instructions
- Consistent navigation
- Error prevention and recovery
- Screen reader announcements

### ✅ Robust
- Valid HTML structure
- ARIA attributes where needed
- Compatible with assistive technologies

## Core Features

### 1. ARIA Support

The accessibility module provides helpers for ARIA attributes:

```javascript
// Make a button accessible
MinigameAccessibility.makeAccessibleButton(button, {
  label: 'Start Game',
  description: 'Begin playing Quick Tap',
  pressed: false
});

// Result:
// <button 
//   aria-label="Start Game"
//   aria-describedby="desc-123"
//   role="button"
// >
```

**Available helpers:**
- `makeAccessibleButton(element, options)`
- `makeAccessibleInput(element, options)`
- `addAriaLabel(element, label)`
- `setAriaLive(element, level)` - 'polite' | 'assertive'

### 2. Screen Reader Announcements

Announce important events to screen reader users:

```javascript
// Polite announcement (won't interrupt)
MinigameAccessibility.announce('Game starting in 3 seconds', 'polite');

// Assertive announcement (interrupts current speech)
MinigameAccessibility.announce('Time is up!', 'assertive');
```

**Best practices:**
- Use 'polite' for most announcements
- Use 'assertive' only for urgent messages (timers, errors)
- Keep announcements concise and clear

### 3. Focus Management

Manage keyboard focus properly:

```javascript
// Set focus to an element
MinigameAccessibility.setFocus(startButton);

// Create focus trap for modal
const releaseTrap = MinigameAccessibility.trapFocus(modalElement);
// ... later ...
releaseTrap(); // Release the trap

// Get currently focused element
const focused = MinigameAccessibility.getFocusedElement();
```

**Focus trap** prevents Tab from leaving a modal/popup:
- Cycles focus within the container
- Includes all focusable elements
- Releases on Escape or close

### 4. Keyboard Navigation

All games must support keyboard navigation:

```javascript
// Add keyboard handler
element.addEventListener('keydown', (e) => {
  if(e.key === 'Enter' || e.key === ' '){
    e.preventDefault();
    handleAction();
    MinigameAccessibility.announce('Action completed', 'polite');
  }
});
```

**Standard keybindings:**
- **Tab** - Move forward through elements
- **Shift+Tab** - Move backward
- **Enter/Space** - Activate buttons
- **Escape** - Close modals/dialogs
- **Arrow keys** - Navigate lists/grids
- **Home/End** - Jump to first/last

### 5. Accessible Timers

Timers should announce time remaining periodically:

```javascript
const timer = MinigameAccessibility.createAccessibleTimer({
  duration: 30,
  container: timerContainer,
  onTick: (remaining) => {
    // Visual update
    timerEl.textContent = `${remaining}s`;
  },
  announceInterval: 10  // Announce every 10s
});

// Timer automatically announces at intervals:
// "20 seconds remaining"
// "10 seconds remaining"
// "5 seconds remaining"

// Clean up when done
timer.stop();
```

### 6. Reduced Motion

Respect user's motion preferences:

```javascript
// Check preference
if(MinigameAccessibility.prefersReducedMotion()){
  // Disable animations
  element.classList.add('no-animation');
} else {
  // Use animations
  element.classList.add('with-animation');
}
```

**CSS example:**
```css
/* Normal animation */
.button {
  transition: transform 0.3s ease;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  .button {
    transition: none;
  }
}
```

### 7. Skip Links

Allow users to skip repetitive content:

```javascript
// Add skip link to game container
MinigameAccessibility.addSkipLink(container, {
  text: 'Skip to game controls',
  targetId: 'game-controls'
});
```

Renders:
```html
<a href="#game-controls" class="skip-link">Skip to game controls</a>
```

Skip links are:
- Hidden visually by default
- Visible on keyboard focus
- Jump to main content area

## Mobile Accessibility

### Touch Target Size

All interactive elements must be **at least 44×44px** (WCAG 2.1 Level AAA, recommended for mobile).

```javascript
// Check if button meets minimum size
const button = document.querySelector('.tap-button');
const meetsSize = MinigameMobileUtils.meetsMinimumTapSize(button);

if(!meetsSize){
  console.warn('Button too small for accessibility');
  button.style.minWidth = '44px';
  button.style.minHeight = '44px';
}
```

### Haptic Feedback

Provide tactile feedback for actions:

```javascript
// Vibrate on tap (if supported)
MinigameMobileUtils.vibrate('tap'); // Short vibration
MinigameMobileUtils.vibrate('success'); // Success pattern
MinigameMobileUtils.vibrate('error'); // Error pattern
```

**Patterns:**
- `tap` - 10ms (brief tap confirmation)
- `success` - [50, 50, 50] (triple pulse)
- `error` - [100, 50, 100] (double pulse)

## Game Implementation Checklist

When creating a new accessible minigame:

### HTML Structure
- [ ] Use semantic HTML (`<button>`, `<label>`, etc.)
- [ ] Add ARIA labels to interactive elements
- [ ] Include skip links if needed
- [ ] Use proper heading hierarchy

### Keyboard Support
- [ ] All actions available via keyboard
- [ ] Focus indicators visible
- [ ] Tab order logical
- [ ] No keyboard traps

### Screen Reader Support
- [ ] Instructions announced on start
- [ ] State changes announced
- [ ] Timer announcements at intervals
- [ ] Completion/error announcements

### Visual Design
- [ ] Color contrast ≥ 4.5:1
- [ ] Focus indicators clear
- [ ] Text readable (min 14px)
- [ ] Interactive elements ≥ 44×44px

### Motion & Animation
- [ ] Respects `prefers-reduced-motion`
- [ ] Essential animations only
- [ ] No flashing content

## Example: Accessible Game

```javascript
function render(container, onComplete){
  // Create accessible container
  container.setAttribute('role', 'application');
  container.setAttribute('aria-label', 'Quick Tap Game');
  
  // Add instructions
  const instructions = document.createElement('div');
  instructions.id = 'instructions';
  instructions.textContent = 'Tap the button as many times as you can in 10 seconds';
  instructions.setAttribute('role', 'status');
  container.appendChild(instructions);
  
  // Announce start
  if(MinigameAccessibility){
    MinigameAccessibility.announce('Game starting', 'polite');
  }
  
  // Create accessible button
  const tapButton = document.createElement('button');
  tapButton.textContent = 'Tap!';
  tapButton.className = 'tap-button';
  
  if(MinigameAccessibility){
    MinigameAccessibility.makeAccessibleButton(tapButton, {
      label: 'Tap to score points',
      description: 'Press Enter or Space to tap'
    });
  }
  
  let taps = 0;
  
  // Handle tap (keyboard + mouse/touch)
  tapButton.addEventListener('click', () => {
    taps++;
    
    // Visual feedback
    scoreEl.textContent = `Taps: ${taps}`;
    
    // Screen reader update
    if(MinigameAccessibility){
      // Update aria-label with new count
      tapButton.setAttribute('aria-label', `Tap to score points. Current taps: ${taps}`);
    }
    
    // Haptic feedback
    if(MinigameMobileUtils){
      MinigameMobileUtils.vibrate('tap');
    }
  });
  
  // Create accessible timer
  let timeLeft = 10;
  const timerEl = document.createElement('div');
  timerEl.setAttribute('role', 'timer');
  timerEl.setAttribute('aria-live', 'polite');
  timerEl.textContent = `Time: ${timeLeft}s`;
  
  const interval = setInterval(() => {
    timeLeft--;
    timerEl.textContent = `Time: ${timeLeft}s`;
    
    // Announce time at key moments
    if(MinigameAccessibility && [5, 3, 1].includes(timeLeft)){
      MinigameAccessibility.announce(`${timeLeft} seconds remaining`, 'assertive');
    }
    
    if(timeLeft <= 0){
      clearInterval(interval);
      
      // Disable button
      tapButton.disabled = true;
      
      // Announce completion
      if(MinigameAccessibility){
        MinigameAccessibility.announce(`Game complete. You scored ${taps} taps`, 'assertive');
      }
      
      // Calculate score
      const score = Math.min(100, taps * 5);
      setTimeout(() => onComplete(score), 1000);
    }
  }, 1000);
  
  // Add elements to container
  container.appendChild(timerEl);
  container.appendChild(tapButton);
  container.appendChild(scoreEl);
  
  // Set focus to button
  if(MinigameAccessibility){
    MinigameAccessibility.setFocus(tapButton);
  }
}
```

## Testing Accessibility

### Manual Testing

1. **Keyboard Navigation**
   - Unplug mouse
   - Tab through all interactive elements
   - Activate with Enter/Space
   - Check focus indicators are visible

2. **Screen Reader Testing**
   - Windows: NVDA (free) or JAWS
   - Mac: VoiceOver (built-in, Cmd+F5)
   - Mobile: TalkBack (Android) or VoiceOver (iOS)

3. **Reduced Motion**
   - Chrome: DevTools → Rendering → Emulate CSS media feature
   - Set `prefers-reduced-motion: reduce`
   - Verify animations disabled

### Automated Testing

Use the contract tests:

```javascript
// Run accessibility checks
MinigameContractTests.runContractTests();

// Look for accessibility warnings
const results = MinigameContractTests.getResults();
console.log('A11y violations:', results.violations);
```

## Common Issues & Fixes

### Issue: Button not accessible via keyboard
**Fix:** Ensure it's a `<button>` element, not a `<div>` with click handler

### Issue: Screen reader not announcing changes
**Fix:** Add `aria-live="polite"` to the element that updates

### Issue: Focus lost after modal closes
**Fix:** Store previous focus, restore after close:
```javascript
const previousFocus = document.activeElement;
// ... show modal ...
modal.close();
previousFocus.focus();
```

### Issue: Instructions not read by screen reader
**Fix:** Add `role="status"` or `aria-live="polite"`

### Issue: Timer too fast to hear
**Fix:** Announce only at intervals (10s, 5s, 3s, 1s)

## Resources

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/)
- [WebAIM Screen Reader Testing](https://webaim.org/articles/screenreader_testing/)
- [MDN Accessibility](https://developer.mozilla.org/en-US/docs/Web/Accessibility)

## API Reference

### MinigameAccessibility.makeAccessibleButton(element, options)
Enhance button with ARIA attributes.

### MinigameAccessibility.announce(message, level)
Announce to screen readers ('polite' | 'assertive').

### MinigameAccessibility.trapFocus(container)
Create focus trap for modals. Returns release function.

### MinigameAccessibility.setFocus(element)
Move keyboard focus to element.

### MinigameAccessibility.prefersReducedMotion()
Check if user prefers reduced motion.

### MinigameAccessibility.createAccessibleTimer(options)
Create timer with periodic announcements.

### MinigameAccessibility.addSkipLink(container, options)
Add skip link for navigation.
