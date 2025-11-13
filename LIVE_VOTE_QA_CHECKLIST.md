# Live Eviction Vote QA Checklist

## Overview
This checklist validates the redesigned Live Eviction Vote experience across different player roles and device sizes. Use this document to ensure all requirements are met before merging.

## Test Environment Setup

### Test Files
- **Primary Test Page**: `test_live_vote_observer_vs_voter.html`
- **Existing Tests**: `test_live_vote_ui.html`, `demo_tv_fit_live_vote.html`
- **Integration Test**: Run full game from `index.html` and play through to Live Vote phase

### Device Matrix
Test on the following viewport sizes (use browser dev tools responsive mode):

| Device Type | Viewport Size | Notes |
|------------|---------------|-------|
| Mobile | 375×667 | iPhone SE, small Android phones |
| Mobile (Large) | 414×896 | iPhone 11 Pro Max, larger phones |
| Tablet | 820×1180 | iPad, Android tablets |
| Laptop | 1366×768 | Standard laptop resolution |
| Desktop | 1920×1080 | Full HD desktop |

## Test Scenarios

### Scenario 1: Nominated Player (Observer)
**Setup**: Human player is nominated

#### Expected Behavior
- [ ] No vote overlay appears
- [ ] No rollout overlay appears
- [ ] Panel shows observer message: "You are nominated and cannot vote"
- [ ] Stage/diary room sequence plays normally
- [ ] No ChoiceCard modal appears
- [ ] Body scroll is NOT locked
- [ ] Panel remains visible throughout phase

#### Test Steps
1. Open `test_live_vote_observer_vs_voter.html`
2. Select "Nominated (Observer)" scenario
3. Click "Start Live Vote"
4. **Verify**: Panel shows observer message
5. **Verify**: No overlays appear
6. **Verify**: Can scroll page normally
7. Test on all device sizes in matrix

---

### Scenario 2: HOH (Observer, No Tie-Break)
**Setup**: Human player is HOH (not in tie-break situation)

#### Expected Behavior
- [ ] No vote overlay appears
- [ ] No rollout overlay appears
- [ ] Panel shows observer message: "As HOH, you only vote to break a tie"
- [ ] Stage/diary room sequence plays normally
- [ ] No ChoiceCard modal appears
- [ ] Body scroll is NOT locked
- [ ] Panel remains visible throughout phase

#### Test Steps
1. Select "HOH (Observer)" scenario
2. Click "Start Live Vote"
3. **Verify**: Panel shows HOH observer message
4. **Verify**: No overlays appear
5. **Verify**: Can scroll page normally
6. Test on all device sizes in matrix

---

### Scenario 3: Eligible Voter (Normal)
**Setup**: Human player can vote (not nominated, not HOH)

#### Expected Behavior
- [ ] Vote overlay appears IMMEDIATELY (no ChoiceCard pre-step)
- [ ] Nominees are displayed in carousel
- [ ] Evict button is present and functional
- [ ] Panel is hidden while overlay is open
- [ ] Body scroll is locked while overlay is open
- [ ] After vote submission:
  - [ ] Overlay closes
  - [ ] Rollout overlay appears showing vote progress
  - [ ] Human's vote is shown as first entry in rollout
  - [ ] Body scroll unlocks after overlay closes
  - [ ] Panel visibility is restored

#### Test Steps
1. Select "Eligible Voter" scenario
2. Click "Start Live Vote"
3. **Verify**: Vote overlay appears immediately (no ChoiceCard)
4. **Verify**: Panel is hidden (check with dev tools)
5. **Verify**: Cannot scroll page
6. Select a nominee and click "Evict [Name]"
7. **Verify**: Overlay closes
8. **Verify**: Rollout overlay appears
9. **Verify**: Human's vote is visible in rollout
10. **Verify**: Can scroll page again
11. **Verify**: Panel is visible again
12. Test on all device sizes in matrix

---

### Scenario 4: HOH Tie-Break Voter (Edge Case)
**Setup**: HOH voting to break a tie

#### Expected Behavior
- [ ] Vote overlay appears (same as eligible voter)
- [ ] Behaves identically to Scenario 3
- [ ] Rollout shows after vote

#### Test Steps
1. Select "HOH Tie-Break" scenario
2. Follow same steps as Scenario 3
3. **Verify**: All behaviors match eligible voter scenario

---

## Responsive Behavior Tests

### Mobile (≤820px)
- [ ] Vote overlay fills screen properly
- [ ] Nominee avatars are appropriately sized (120-200px)
- [ ] Evict button meets 48px tap target minimum
- [ ] Evict button is easy to tap (no overlap with other elements)
- [ ] No horizontal scrolling occurs
- [ ] Safe areas respected (notched devices)
- [ ] Diary room cards inside TV don't overflow
- [ ] Text is readable at mobile sizes

### Tablet (821-1180px)
- [ ] Vote overlay is centered and contained
- [ ] Layout uses tablet-optimized spacing
- [ ] Diary room cards are appropriately sized
- [ ] No content clipping or overlap
- [ ] CTAs remain accessible

### Laptop/Desktop (>1180px)
- [ ] Vote overlay is centered with max-width
- [ ] Desktop layout is utilized
- [ ] All content is comfortably readable
- [ ] No unnecessary empty space

---

## Overlay Management Tests

### No Duplicate Overlays
- [ ] Only ONE overlay is visible at a time
- [ ] ChoiceCard never appears (removed)
- [ ] VoteOverlay and Rollout don't stack
- [ ] Stage/diary room sequence doesn't overlap with vote UI

### Cleanup Verification
Test cleanup by forcing various exit scenarios:

#### Test 1: Normal Vote Flow
1. Start Live Vote as eligible voter
2. Cast vote normally
3. **Verify**: All overlays clean up properly
4. **Verify**: Scroll is unlocked
5. **Verify**: Panel is visible

#### Test 2: Page Reload During Vote
1. Start Live Vote as eligible voter
2. Open vote overlay
3. Refresh page
4. **Verify**: No stuck overlays persist
5. **Verify**: No scroll lock persists

#### Test 3: Multiple Start/Stop Cycles
1. Start Live Vote → Clear All UI
2. Repeat 3 times rapidly
3. **Verify**: No duplicate overlays
4. **Verify**: No scroll lock issues
5. **Verify**: Panel visibility correct

---

## Accessibility Tests

### Keyboard Navigation
- [ ] Can tab through vote overlay controls
- [ ] Can select nominee with keyboard
- [ ] Can activate "Evict" button with Enter/Space
- [ ] Focus indicators are visible

### Screen Reader
- [ ] Vote overlay header is announced
- [ ] Nominee names are announced
- [ ] Button labels are descriptive
- [ ] Rollout progress is announced via ARIA live region

### Reduced Motion
1. Enable `prefers-reduced-motion` in browser/OS
2. Start Live Vote
3. **Verify**: Animations are simplified or disabled
4. **Verify**: Functionality remains intact

---

## Integration Tests

### Full Game Flow
1. Start new game from `index.html`
2. Play through to Live Vote phase
3. Test as observer (be nominated or HOH)
4. **Verify**: Observer experience matches expectations
5. Restart and play as eligible voter
6. **Verify**: Voter experience matches expectations

### Edge Cases
- [ ] Final 4 (veto holder sole vote)
- [ ] Triple eviction (3 nominees)
- [ ] All voters vote before timer expires
- [ ] Timer expires before human votes (auto-vote)
- [ ] Human is last voter in sequence

---

## Visual Verification

### No Overlapping Content
- [ ] Vote overlay doesn't clip at any viewport size
- [ ] Diary room cards stay within TV bounds
- [ ] Rollout overlay is properly positioned
- [ ] CTAs don't overlap with other UI elements
- [ ] Text doesn't overflow containers

### Consistent Theming
- [ ] Colors match game theme
- [ ] Fonts are consistent
- [ ] Button styles match global patterns
- [ ] Shadows and borders are appropriate

---

## Performance Tests

### Animation Performance
- [ ] Overlay transitions are smooth (60fps)
- [ ] No janky scrolling
- [ ] Avatar loading doesn't block UI
- [ ] Reduced motion fallbacks work

### Memory Leaks
1. Run Live Vote flow 10 times
2. Open browser dev tools → Performance monitor
3. **Verify**: Memory usage remains stable
4. **Verify**: No event listeners leak

---

## Browser Compatibility

Test on the following browsers:

### Desktop
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)

### Mobile
- [ ] iOS Safari
- [ ] Chrome Android
- [ ] Firefox Android

---

## Success Criteria Summary

### Must Pass (Blocking Issues)
- ✅ Observers never see vote UI
- ✅ Voters go directly to overlay (no ChoiceCard)
- ✅ Only one overlay visible at a time
- ✅ Scroll lock works correctly
- ✅ Panel visibility managed properly
- ✅ No duplicate overlays can be triggered
- ✅ CTA buttons meet 48px tap target
- ✅ No content clipping on mobile

### Should Pass (Quality Issues)
- ⚠️ Keyboard navigation works
- ⚠️ Screen reader announces content
- ⚠️ Animations are smooth
- ⚠️ Reduced motion is respected

### Nice to Have (Enhancement Opportunities)
- 💡 Additional observer messaging
- 💡 Enhanced rollout animations
- 💡 Better error handling

---

## Test Results Template

Use this template to record test results:

```
Date: YYYY-MM-DD
Tester: [Name]
Browser: [Browser + Version]
OS: [Operating System]

Scenario 1 (Nominated): ✅ Pass / ❌ Fail
Scenario 2 (HOH): ✅ Pass / ❌ Fail
Scenario 3 (Voter): ✅ Pass / ❌ Fail
Scenario 4 (Tie-Break): ✅ Pass / ❌ Fail

Mobile (375×667): ✅ Pass / ❌ Fail
Tablet (820×1180): ✅ Pass / ❌ Fail
Laptop (1366×768): ✅ Pass / ❌ Fail

Accessibility: ✅ Pass / ❌ Fail
Performance: ✅ Pass / ❌ Fail

Notes:
[Any issues or observations]
```

---

## Known Limitations

### Not Tested
- Multiple evictions in same session
- Jury phase integration
- AI voter behavior (AI voting logic unchanged)

### Future Enhancements
- Animated transitions between overlays
- More granular rollout progress indicators
- Enhanced observer messaging

---

## Sign-Off

Before merging, obtain sign-off from:

- [ ] Developer (code review complete)
- [ ] QA (all tests pass)
- [ ] Product Owner (UX approved)

**Notes**:
