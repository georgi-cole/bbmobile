# Phase Transition Integrity - Manual Test Guide

This guide provides scenarios for manually testing the phase transition integrity improvements and tie-break fixes.

## Quick Start

1. Open `test_phase_transition_integrity.html` in a browser
2. Click "Run All Tests" to verify automated test suite
3. Follow scenarios below for manual testing in actual gameplay

## Automated Test Suite

**File**: `test_phase_transition_integrity.html`

**Tests Included**:
- PhaseTerminator API Check
- Social AI Scheduler Stop
- Vote UI Cleanup
- Cleanup Idempotency
- Rapid Phase Transitions
- Tie-Break Timeout Mock

**Expected**: All tests should pass with green checkmarks

## Manual Testing Scenarios

### Scenario 1: Rapid Phase Skipping

**Objective**: Verify no UI artifacts remain after rapid phase changes

**Steps**:
1. Start a new game
2. Enable fast-forward (if available)
3. Rapidly skip through phases using the skip button:
   - Opening → Intermission → HOH → Nominations → Veto Comp → Veto Ceremony → Live Vote
4. Check at each phase transition

**Expected Results**:
- ✓ No lingering overlays from previous phases
- ✓ No duplicate UI elements
- ✓ Timer updates correctly for each phase
- ✓ Phase title updates correctly
- ✓ No JavaScript errors in console
- ✓ Social AI scheduler stops when entering competition/voting phases

**Console Verification**:
```
[phase-cleanup] Starting cleanup: social → livevote (token=X)
[phase-cleanup] Cleanup complete (Xms) { socialAI: 'stopped', voteUI: 'closed', ... }
```

---

### Scenario 2: Social AI Stops on Live Vote

**Objective**: Verify Social AI scheduler stops when transitioning to live vote

**Steps**:
1. Start a new game
2. Progress to a social phase
3. Open browser console
4. Look for AI scheduler activity: `[ai-scheduler]` logs
5. Skip to live vote phase
6. Observe console output

**Expected Results**:
- ✓ Social AI scheduler is active during social phase
- ✓ Console shows: `[eviction] Social AI Scheduler stopped for live vote`
- ✓ No more `[ai-scheduler]` activity logs after transition
- ✓ Social highlights/cards stop appearing

**Console Commands** (for debugging):
```javascript
// Check if AI scheduler is running
window.SocialAIScheduler.isRunning()  // Should return false after livevote starts

// Check current phase
window.game.phase  // Should be 'livevote'
```

---

### Scenario 3: Tie-Break Auto-Resolve (Challenging to Test)

**Objective**: Verify tie-break timeout auto-resolves after 15 seconds

**Setup Requirements**:
- 4 remaining houseguests (Final 4)
- Human player is HOH
- 2 nominees (not including HOH)
- 1 voter (sole vote holder, not HOH)

**Steps**:
1. Set up the scenario above (may require save editing or specific gameplay)
2. Progress to live vote phase
3. Allow the AI voter to create a tie (if possible)
4. DO NOT click any tie-break button
5. Wait 15 seconds
6. Observe console and UI

**Expected Results**:
- ✓ Tie-break UI appears initially
- ✓ After 15 seconds, console shows: `[tie-break] ⏱️ 15s timeout - auto-resolving tie-break using affinity`
- ✓ Eviction proceeds automatically based on HOH affinity
- ✓ No deadlock - eviction result always appears
- ✓ No stuck UI overlays

**Console Verification**:
```
[tie-break] ⏱️ 15s timeout - auto-resolving tie-break using affinity
[tie-break] Auto-resolved to evict PlayerName (lowest affinity: 0.XX)
```

**Alternative Test** (Simpler):
- Open browser console during any tie-break
- Wait to see if timeout triggers
- Or manually trigger: refresh page during tie-break to simulate stuck UI

---

### Scenario 4: HOH Observer Edge Case

**Objective**: Verify HOH sees appropriate status when observing but may need to break tie

**Setup Requirements**:
- Human player is HOH
- 2 nominees (not including HOH)
- At least 2 other voters

**Steps**:
1. Set up scenario above
2. Progress to live vote phase
3. Observe panel/status message

**Expected Results**:
- ✓ If HOH is not a regular voter: "You will break any tie as HOH" status appears
- ✓ If tie occurs: UI prompts HOH to break tie
- ✓ If no tie: Eviction proceeds normally without HOH input
- ✓ UI clearly communicates HOH role

**Console Verification**:
```
[eviction] Human is HOH tie-breaker, showing status
```

---

### Scenario 5: Minigame Cleanup on Phase Skip

**Objective**: Verify active minigames close cleanly when phase is skipped

**Steps**:
1. Start HOH competition
2. Launch minigame (click Play button)
3. Minigame overlay appears
4. Immediately skip to next phase (use skip button)
5. Observe UI behavior

**Expected Results**:
- ✓ "Phase Ended" message appears briefly on minigame overlay
- ✓ Minigame closes automatically after ~1 second
- ✓ No lingering overlay elements
- ✓ No JavaScript errors
- ✓ Next phase initializes correctly

**Console Verification**:
```
[CompetitionFlow] Phase changed, cleaning up active minigames/instructions
[CompetitionFlow] Force closing minigame due to phase change
```

---

### Scenario 6: Fast-Forward State Management

**Objective**: Verify fast-forward deactivates appropriately on phase boundaries

**Steps**:
1. Activate fast-forward (if available in settings)
2. Skip through multiple phases
3. Check fast-forward state persists or resets as expected

**Expected Results**:
- ✓ Fast-forward state persists across most phase transitions
- ✓ Fast-forward is NOT auto-deactivated (user controls it)
- ✓ Excluded phases (like lobby) deactivate fast-forward
- ✓ No double deactivation errors

**Console Verification**:
```
[phase-cleanup] Fast-forward state: still-active (or inactive)
```

---

### Scenario 7: Vote UI Cleanup

**Objective**: Verify all vote UI elements close cleanly on phase change

**Steps**:
1. Progress to live vote phase
2. Open vote overlay/modal (if human is voter)
3. Do NOT cast vote yet
4. Skip to next phase (or let phase timeout)
5. Observe UI

**Expected Results**:
- ✓ Vote overlay closes immediately
- ✓ Vote countdown stops
- ✓ No orphaned vote UI elements
- ✓ Scroll lock is released (page scrolls normally)
- ✓ Next phase UI renders correctly

**Console Verification**:
```
[phase-cleanup] Vote UI closed
[livevote-helpers] closeAllVoteUI called
```

---

### Scenario 8: Diary Room Sequence Safety

**Objective**: Verify diary room sequence has safety timeout

**Steps**:
1. Progress to live vote phase
2. Wait for diary room sequence to start
3. Observe console for timeout messages
4. Verify eviction result appears within ~90 seconds max

**Expected Results**:
- ✓ Diary room cards appear in sequence
- ✓ If stuck, 90-second timeout triggers reveal
- ✓ Eviction result always appears
- ✓ No infinite loops

**Console Verification**:
```
[eviction] Waiting for human vote before starting DR sequence
[eviction] Diary room sequence complete
```

---

## Regression Testing Checklist

After implementing changes, verify these still work:

- [ ] Normal voting flow (no tie)
- [ ] HOH breaks tie (manual)
- [ ] Triple eviction voting
- [ ] Final 4 sole vote scenario
- [ ] Social phase interactions
- [ ] All competition types
- [ ] Veto ceremony flow
- [ ] Jury voting
- [ ] Fast-forward functionality
- [ ] Skip button functionality
- [ ] Mobile viewport (responsive)
- [ ] Dark/light theme switching

---

## Debugging Tools

### Check Phase State
```javascript
// Current phase
window.game.phase

// Phase token
window.currentPhaseToken

// Social AI status
window.SocialAIScheduler.isRunning()

// Fast-forward status
window.game.__ffActive
```

### Force Cleanup (Manual)
```javascript
// Manually trigger phase cleanup
window.PhaseTerminator.runCleanup(
  window.game.phase,  // from phase
  'livevote',         // to phase
  window.currentPhaseToken
)
```

### Check for Lingering UI
```javascript
// Find vote overlays
document.querySelectorAll('.lv-overlay, .lv-root, .lv-choice-card')

// Find minigame overlays
document.querySelectorAll('.minigame-overlay, .minigame-instructions')

// Check scroll lock
document.body.style.overflow  // Should not be 'hidden' outside modal contexts
```

---

## Known Limitations

1. **Tie-break timeout testing**: Requires specific game state that's hard to set up naturally. May need save editing or code modification for testing.

2. **Fast-forward**: Not all phases support fast-forward. Behavior varies by phase type.

3. **Social AI**: Only active during social phases. Will not see activity during competitions or voting.

4. **Console logs**: Some logs are debug-only and may not appear in production builds.

---

## Telemetry Prefixes

Filter console logs by prefix for easier debugging:

- `[phase-cleanup]` - Phase termination cleanup
- `[phase-transition]` - Phase change events
- `[tie-break]` - Tie-break logic and timeouts
- `[social-ai]` - AI scheduler activity
- `[fast-forward]` - Fast-forward state changes
- `[eviction]` - Eviction flow events
- `[livevote-helpers]` - Vote UI cleanup

**Example Console Filter**:
```
[phase-cleanup]
```

---

## Success Criteria

✅ **All automated tests pass** (test_phase_transition_integrity.html)

✅ **No UI artifacts** after any phase transition

✅ **Eviction always completes** (no deadlocks)

✅ **Tie-breaks resolve** (manually or via timeout)

✅ **Social AI stops** on non-social phases

✅ **No JavaScript errors** during rapid transitions

✅ **Scroll lock never stuck** after modal closes

✅ **Existing functionality unchanged** (regression tests pass)

---

## Reporting Issues

When reporting issues, include:
1. **Scenario**: Which test scenario was being performed
2. **Console logs**: Full console output (filter by prefixes above)
3. **Game state**: Phase, player count, HOH, nominees
4. **Browser**: Browser type and version
5. **Steps to reproduce**: Exact sequence that triggered issue
6. **Expected vs Actual**: What should happen vs what did happen

---

## Additional Resources

- **Architecture**: See `docs/` directory for system documentation
- **Test Files**: All `test_*.html` files for feature-specific tests
- **Code**: Review `js/phase-terminator.js` for cleanup implementation
- **Eviction Flow**: See `EVICTION_FLOW_DIAGRAM.md` (if exists)
