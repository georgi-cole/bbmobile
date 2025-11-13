# Live Vote QA Checklist

## Test Matrix

### Device Configurations

| Device Type | Resolution | Orientation |
|------------|-----------|-------------|
| Mobile (Small) | 375×667 | Portrait |
| Mobile (Medium) | 390×844 | Portrait |
| Tablet | 820×1180 | Portrait |
| Laptop | 1366×768 | Landscape |
| Desktop | 1920×1080 | Landscape |

### User Roles

| Role | Description | Expected Behavior |
|------|------------|-------------------|
| Eligible Voter | Not nominated, not HOH | Shows vote overlay, can vote |
| Nominated | Player is nominated | Shows "observing" message, no vote UI |
| HOH (No Tie) | HOH without tie-break | Shows "observing" message, no vote UI |
| HOH (Tie-break) | HOH during tie-break | Shows vote overlay, can break tie |

---

## Commit 1: Pre-Vote Modal Removal

### Test Cases

#### TC1.1: Direct Vote Overlay (Eligible Voter)
- [ ] Eligible voter sees LiveVoteOverlay directly (no pre-vote modal)
- [ ] No LiveVoteChoiceCard appears
- [ ] Overlay opens immediately with nominee carousel
- [ ] Panel is hidden while overlay is open
- [ ] Panel is restored after vote submission

#### TC1.2: Vote Countdown Alignment
- [ ] Countdown timer starts immediately when overlay opens
- [ ] Timer aligns with HUD phase timer
- [ ] No duplicate timers visible

#### TC1.3: Rollout Display
- [ ] Rollout overlay shows after vote submission
- [ ] User's vote appears as first entry in rollout
- [ ] Rollout shows progress (received/expected)

**Devices to test:** Mobile, Tablet, Laptop

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Commit 2: Observer vs Voter Logic

### Test Cases

#### TC2.1: Nominated Observer
- [ ] Nominated player sees "You are observing this vote"
- [ ] No vote overlay appears
- [ ] No LiveVoteRollout appears
- [ ] No countdown timer runs
- [ ] Panel shows observer message only
- [ ] Diary room sequence runs (other voters shown)

#### TC2.2: HOH Observer (No Tie-break)
- [ ] HOH sees "You are observing this vote"
- [ ] No vote overlay appears
- [ ] No LiveVoteRollout appears
- [ ] No countdown timer runs
- [ ] Panel shows observer message only

#### TC2.3: HOH Tie-break Voter
- [ ] HOH can vote during tie-break
- [ ] Vote overlay appears with 2 nominees
- [ ] Vote can be submitted
- [ ] Rollout shows after vote (if applicable)

#### TC2.4: Vote UI Conditional Rendering
- [ ] lv2 UI (2 nominees) only shown to voters
- [ ] Triple UI (3 nominees) only shown to voters
- [ ] No CTA bar shown to observers
- [ ] Auto-vote only runs for voters

**Devices to test:** All devices

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Commit 3: Centralized Cleanup

### Test Cases

#### TC3.1: No Overlay Stacking
- [ ] Only one overlay visible at a time
- [ ] No ChoiceCard + VoteOverlay stacking
- [ ] No VoteOverlay + Rollout stacking
- [ ] No Rollout + lv2 UI stacking

#### TC3.2: Cleanup on Vote Submit
- [ ] closeAllVoteUI() called when vote submitted
- [ ] All overlays removed
- [ ] Panel visibility restored
- [ ] Scroll unlocked

#### TC3.3: Cleanup on Phase Exit
- [ ] closeAllVoteUI() called in postEvictionRouting()
- [ ] All overlays removed on eviction completion
- [ ] lv2 UI cleaned up
- [ ] Triple UI cleaned up

#### TC3.4: Idempotent Cleanup
- [ ] Calling closeAllVoteUI() multiple times is safe
- [ ] No errors when cleaning already-clean state
- [ ] Defensive try-catch blocks prevent crashes

**Devices to test:** All devices

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Commit 4: Responsive Behavior

### Test Cases

#### TC4.1: Mobile Portrait (375×667)
- [ ] Vote overlay fills viewport
- [ ] Safe area insets respected
- [ ] Evict button is 48px minimum height
- [ ] Evict button tappable (no mis-taps)
- [ ] Nominee carousel scrollable/swipeable
- [ ] No horizontal overflow
- [ ] No clipped content

#### TC4.2: Mobile Landscape (896×568)
- [ ] Vote overlay adapts to landscape
- [ ] Carousel items sized appropriately
- [ ] Evict button accessible
- [ ] No content cutoff

#### TC4.3: Tablet (820×1180)
- [ ] Vote overlay centered
- [ ] Larger nominee avatars
- [ ] Evict button scaled appropriately
- [ ] Touch targets are 48px+

#### TC4.4: Laptop/Desktop (1366×768, 1920×1080)
- [ ] Vote overlay centered with proper margins
- [ ] Keyboard navigation works (arrows, enter)
- [ ] Hover states on buttons
- [ ] Smooth transitions

#### TC4.5: Panel Visibility
- [ ] Panel hidden when overlay opens (CSS class)
- [ ] Panel restored after vote (CSS class removed)
- [ ] No inline style conflicts
- [ ] Backwards compatibility with inline styles

#### TC4.6: Diary Room Cards
- [ ] Cards contained within TV safe area
- [ ] max-width: min(92%, 520px) enforced
- [ ] max-height: 78% enforced
- [ ] No overflow on mobile
- [ ] Scrollable if content exceeds height

**Devices to test:** All devices

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Accessibility

### Test Cases

#### AC1: Keyboard Navigation
- [ ] Tab key navigates through nominees
- [ ] Arrow keys move carousel (desktop)
- [ ] Enter key selects nominee
- [ ] Escape key closes overlay (if allowed)

#### AC2: Screen Reader
- [ ] ARIA labels present on all interactive elements
- [ ] Role attributes correct (dialog, button, status)
- [ ] Live regions announce vote status
- [ ] Focus management correct

#### AC3: Reduced Motion
- [ ] prefers-reduced-motion respected
- [ ] No jarring animations
- [ ] Smooth transitions remain functional

#### AC4: High Contrast
- [ ] Buttons have sufficient contrast
- [ ] Text readable in high contrast mode
- [ ] Borders visible

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Integration Testing

### Test Cases

#### IT1: Full Vote Flow (Voter)
- [ ] Start live vote
- [ ] See overlay directly
- [ ] Select nominee
- [ ] Submit vote
- [ ] See rollout with own vote
- [ ] Watch other votes come in
- [ ] See result
- [ ] Panel restored

#### IT2: Full Vote Flow (Observer)
- [ ] Start live vote
- [ ] See "observing" message
- [ ] No vote UI appears
- [ ] Watch diary room sequence
- [ ] See result
- [ ] No rollout shown to observer

#### IT3: Edge Cases
- [ ] Rapid repeated clicks don't duplicate overlays
- [ ] Network delay doesn't break flow
- [ ] Tab/window switching doesn't break state
- [ ] Browser back button handled gracefully

**Status:** [ ] Pass [ ] Fail

**Notes:**

---

## Success Criteria Summary

### Must Pass (Blocking)
- [x] No pre-vote modal (ChoiceCard) shown to voters
- [x] Eligible voters see overlay directly
- [x] Observers see "observing" message only
- [x] No overlays stack on top of each other
- [x] CTA buttons are 48px minimum height
- [x] Panel visibility managed correctly

### Should Pass (Important)
- [ ] Responsive behavior on all device sizes
- [ ] Keyboard navigation works
- [ ] Screen reader accessible
- [ ] No content clipped or hidden

### Nice to Have (Enhancement)
- [ ] Smooth animations
- [ ] Reduced motion support
- [ ] High contrast mode support

---

## Test Execution Log

| Date | Tester | Device | Result | Notes |
|------|--------|--------|--------|-------|
| | | | [ ] Pass [ ] Fail | |
| | | | [ ] Pass [ ] Fail | |
| | | | [ ] Pass [ ] Fail | |

---

## Bug Report Template

**Bug ID:** LIVE-XXX

**Title:** [Brief description]

**Severity:** [ ] Critical [ ] High [ ] Medium [ ] Low

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Behavior:**

**Actual Behavior:**

**Device/Browser:**

**Screenshots/Videos:**

**Additional Notes:**

---

## Sign-off

- [ ] All blocking tests pass
- [ ] All important tests pass
- [ ] Known issues documented
- [ ] Ready for production

**Tested by:** ________________

**Date:** ________________

**Approved by:** ________________

**Date:** ________________
