# Popup System Accessibility Testing Checklist

This document provides a manual testing checklist for the popup system accessibility features.

## Setup

1. Open any page with popup functionality (e.g., `test_popup_telemetry.html`, `index.html`)
2. Enable the popup system: `game.cfg.popup_refresh_enabled = true`
3. Have screen reader software ready (NVDA, JAWS, or VoiceOver)

## Keyboard Navigation Tests

### Test 1: Focus Trap
- [ ] Open a popup
- [ ] Press TAB repeatedly
- [ ] Verify focus cycles through all interactive elements in the popup
- [ ] Verify focus does NOT escape to background elements
- [ ] Press SHIFT+TAB
- [ ] Verify focus cycles backward through popup elements
- [ ] **Expected:** Focus is trapped within the popup

### Test 2: ESC Key
- [ ] Open a popup with `closeOnEsc: true`
- [ ] Press ESC key
- [ ] Verify popup closes
- [ ] Verify focus returns to previously focused element
- [ ] **Expected:** ESC closes popup and restores focus

### Test 3: Enter/Space on Buttons
- [ ] Open a popup with action buttons
- [ ] Use TAB to focus a button
- [ ] Press ENTER key
- [ ] Verify button action executes
- [ ] Repeat with SPACE key
- [ ] **Expected:** Both ENTER and SPACE activate buttons

### Test 4: No Mouse Navigation
- [ ] Unplug mouse or disable touchpad
- [ ] Navigate entire popup flow using only keyboard
- [ ] Open popup (via keyboard shortcut or TAB to trigger button)
- [ ] Navigate all options
- [ ] Make a selection
- [ ] Close popup
- [ ] **Expected:** All functionality accessible via keyboard

## Screen Reader Tests

### Test 5: Popup Announcement (NVDA/JAWS)
- [ ] Start screen reader
- [ ] Open a popup
- [ ] Verify screen reader announces: "dialog" or "modal"
- [ ] Verify header text is announced
- [ ] **Expected:** Popup role and title announced

### Test 6: Content Reading (NVDA/JAWS)
- [ ] Navigate popup with screen reader (DOWN arrow)
- [ ] Verify body content is read
- [ ] Verify buttons are announced with labels
- [ ] **Expected:** All content is readable

### Test 7: ARIA Attributes (VoiceOver)
- [ ] Open a popup on macOS/iOS
- [ ] Activate VoiceOver (CMD+F5)
- [ ] Verify dialog is announced
- [ ] Verify labeled-by connection (header linked to dialog)
- [ ] Verify described-by connection (body linked to dialog)
- [ ] **Expected:** ARIA relationships work correctly

### Test 8: Close Announcement
- [ ] Open popup with screen reader active
- [ ] Close popup (ESC, button, or backdrop)
- [ ] Verify screen reader announces closure
- [ ] Verify focus restoration is announced
- [ ] **Expected:** Closure and focus change announced

## Visual Accessibility Tests

### Test 9: High Contrast Mode
- [ ] Enable system high contrast mode
  - Windows: Settings → Ease of Access → High contrast
  - macOS: System Preferences → Accessibility → Display → Increase contrast
- [ ] Open popups
- [ ] Verify all text is readable
- [ ] Verify borders are visible
- [ ] Verify focus indicators are visible
- [ ] **Expected:** All UI elements visible in high contrast

### Test 10: Color Contrast (Manual Check)
- [ ] Use browser DevTools or contrast checker
- [ ] Check header text on header background: ≥4.5:1
- [ ] Check body text on body background: ≥4.5:1
- [ ] Check button text on button background: ≥4.5:1
- [ ] Check focus outline on background: ≥3:1
- [ ] **Expected:** All contrast ratios meet WCAG 2.1 AA

### Test 11: Browser Zoom
- [ ] Set browser zoom to 200% (Ctrl/Cmd + +)
- [ ] Open popup
- [ ] Verify all content fits and is readable
- [ ] Verify no horizontal scrolling required
- [ ] Verify buttons don't overlap
- [ ] Set zoom to 400%
- [ ] Repeat checks
- [ ] **Expected:** Usable at 200-400% zoom

### Test 12: Reduced Motion
- [ ] Enable prefers-reduced-motion:
  - Windows: Settings → Ease of Access → Display → Show animations
  - macOS: System Preferences → Accessibility → Display → Reduce motion
  - Firefox: about:config → ui.prefersReducedMotion = 1
- [ ] Open popup
- [ ] Verify animations are simplified/removed
- [ ] Verify inter-popup delay is reduced (100ms instead of 800ms)
- [ ] **Expected:** Respects reduced motion preference

## Focus Management Tests

### Test 13: Focus on Open
- [ ] Focus a button in the main page
- [ ] Click button to open popup
- [ ] Verify focus moves to first focusable element in popup
- [ ] (OR first element is the close button if provided)
- [ ] **Expected:** Focus moves to popup on open

### Test 14: Focus on Close
- [ ] Note currently focused element before opening popup
- [ ] Open popup
- [ ] Close popup (ESC, button, backdrop)
- [ ] Verify focus returns to original element
- [ ] **Expected:** Focus restoration works

### Test 15: Multiple Popups (Queue)
- [ ] Open 3 popups in quick succession
- [ ] Verify first popup appears and has focus
- [ ] Close first popup
- [ ] Verify second popup appears and has focus
- [ ] Close second popup
- [ ] Verify third popup appears and has focus
- [ ] **Expected:** Focus managed correctly through queue

## Semantic HTML Tests

### Test 16: Role Attribute
- [ ] Open popup
- [ ] Inspect element in DevTools
- [ ] Verify `role="dialog"` on popup element
- [ ] **Expected:** Correct ARIA role

### Test 17: Modal Attribute
- [ ] Open popup
- [ ] Inspect element
- [ ] Verify `aria-modal="true"` on popup element
- [ ] **Expected:** Modal attribute present

### Test 18: Label Relationships
- [ ] Open popup
- [ ] Inspect popup element
- [ ] Verify `aria-labelledby` points to header ID
- [ ] Verify `aria-describedby` points to body ID
- [ ] Verify header has matching ID
- [ ] Verify body has matching ID
- [ ] **Expected:** ARIA relationships correctly linked

### Test 19: Button Semantics
- [ ] Open popup with buttons
- [ ] Inspect buttons
- [ ] Verify all use `<button>` element (not `<div>`)
- [ ] Verify all have `type="button"` attribute
- [ ] Verify close button has `aria-label="Close popup"`
- [ ] **Expected:** Proper semantic HTML

## Mobile/Touch Tests

### Test 20: Touch Navigation (Mobile Device)
- [ ] Open popup on mobile device
- [ ] Verify popup is responsive and sized correctly
- [ ] Verify buttons are large enough to touch (≥44×44px)
- [ ] Verify backdrop tap closes popup (if enabled)
- [ ] Verify no horizontal scrolling needed
- [ ] **Expected:** Usable on mobile touchscreen

### Test 21: Voice Control (iOS/Android)
- [ ] Enable voice control (iOS: Settings → Accessibility)
- [ ] Say commands like "Tap [button name]"
- [ ] Verify buttons are activatable by voice
- [ ] **Expected:** Voice control works

## Error Handling Tests

### Test 22: No Focusable Elements
- [ ] Create popup with no buttons/links
- [ ] Open popup
- [ ] Verify focus trap doesn't break
- [ ] Verify ESC still works (if enabled)
- [ ] **Expected:** Graceful degradation

### Test 23: Rapid Open/Close
- [ ] Rapidly open and close popups
- [ ] Verify no focus is lost
- [ ] Verify no JavaScript errors
- [ ] **Expected:** Stable behavior

## Automated Testing

### Test 24: axe DevTools
- [ ] Install axe DevTools extension
- [ ] Open popup
- [ ] Run axe scan
- [ ] Verify zero critical or serious issues
- [ ] **Expected:** Passes automated checks

### Test 25: Lighthouse Accessibility
- [ ] Open Chrome DevTools
- [ ] Run Lighthouse audit (Accessibility category)
- [ ] With popup open, score should be ≥90
- [ ] **Expected:** High accessibility score

## Results Summary

Test Date: _______________
Tester: _______________

| Category | Passed | Failed | Notes |
|----------|--------|--------|-------|
| Keyboard Navigation | _/4 | _/4 | |
| Screen Reader | _/4 | _/4 | |
| Visual Accessibility | _/4 | _/4 | |
| Focus Management | _/3 | _/3 | |
| Semantic HTML | _/4 | _/4 | |
| Mobile/Touch | _/2 | _/2 | |
| Error Handling | _/2 | _/2 | |
| Automated Testing | _/2 | _/2 | |
| **Total** | **_/25** | **_/25** | |

## Issues Found

List any issues discovered during testing:

1. 
2. 
3. 

## Recommendations

Based on test results:

1. 
2. 
3. 

## Sign-off

Tested by: _______________
Date: _______________
Approved: ☐ Yes ☐ No ☐ With conditions

Conditions (if applicable):
