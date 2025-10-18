# Social Maneuvers Fixes - Testing Guide

## Quick Verification

### 1. Automated Static Verification
```bash
node verify_social_fixes.mjs
```
**Expected Output:**
```
🔍 Verifying Social Maneuvers fixes...

✅ scheduleFastAdvance shim
✅ checkEnergyDepletionAndAdvance uses guarded shim
✅ Resource change events
✅ SocializeMobile.updateHUD defensive calls
✅ Logging for spend/earn
✅ Weekly reset guard
✅ Weekly reset logging
✅ Skip legacy summary
✅ Phase start/end logging

✅ All checks passed!
```

### 2. Integration Test
Open `test_social_fixes_integration.html` in a browser.

**Expected Results:**
- All tests show green ✓ checkmarks
- No errors in console
- Event firing test completes successfully

## Manual Testing Scenarios

### Scenario 1: Energy Depletion (Issue #1)

**Goal**: Verify no ReferenceError when energy hits 0

**Steps**:
1. Load game with Social Maneuvers enabled
2. Enter social_intermission phase
3. Execute actions until energy reaches 0
4. Observe phase transition

**Expected Behavior**:
- ✅ No ReferenceError in console
- ✅ Console shows: `[social-maneuvers] 🎯 Player X has depleted all energy (0/10)`
- ✅ Console shows: `[social-maneuvers] ✓ Scheduled fast advance via fallback` or `via native API`
- ✅ Summary panel appears (not legacy card)
- ✅ After 800ms delay, phase advances to nominations

**Console Log Pattern**:
```
[social-maneuvers] 🎯 Player 1 has depleted all energy (0/10)
[LOG ok] All social energy spent! Phase will advance shortly...
[social-maneuvers] ✓ Scheduled fast advance via fallback
[social-maneuvers] ⏩ Fast-advance triggered (fallback)
[social-maneuvers] ✓ Summary shown via showSummaryPanel
[social-maneuvers] ✓ onSocialPhaseEnd called
[social-maneuvers] ✓ Advanced to nominations via startNominations
```

### Scenario 2: Resource Updates (Issue #2a)

**Goal**: Verify resources update correctly and HUD refreshes

**Steps**:
1. Enter social_intermission phase
2. Open browser DevTools console
3. Execute a social action (e.g., "Small Talk")
4. Watch console and HUD

**Expected Behavior**:
- ✅ Console shows: `[social-resources] ⚡ Player X spent: { energy: 1 }`
- ✅ Console shows: `[social-resources] 📡 Dispatched social-resources-changed event`
- ✅ HUD energy counter decrements immediately
- ✅ No delay in UI update

**Console Log Pattern**:
```
[social-resources] ⚡ Player 1 spent: { energy: 1 }
[social-resources] Telemetry: spend multiple { energy: 1 } Balance: { energy: 4, influence: 0, information: 0 }
[social-resources] 📡 Dispatched social-resources-changed event: { playerId: 1, delta: { energy: -1 }, resources: { energy: 4, influence: 0, information: 0 } }
```

### Scenario 3: Weekly Reset (Issue #2b)

**Goal**: Verify weekly reset works with guard

**Steps**:
1. Play through a complete week
2. Trigger eviction
3. Start new week
4. Check console and HUD

**Expected Behavior**:
- ✅ Console shows: `[social.js] 🔄 Social Maneuvers enabled - forwarding weekly reset`
- ✅ Console shows: `[social-resources] 🔄 Weekly reset for player X at week N`
- ✅ Console shows energy calculation: `Energy delta: base 5 + X = Y`
- ✅ HUD shows replenished energy
- ✅ If reset called again in same week, console shows: `⏭️ Weekly reset already done`

**Console Log Pattern**:
```
[social.js] 🔄 Social Maneuvers enabled - forwarding weekly reset to SocialResources
[social-resources] 🔄 Weekly reset for player 1 at week 2
[social-resources] Energy delta: base 5 + 8 = 13
[social-resources] Telemetry: reset all {...}
[social.js] ✓ Weekly reset complete - energy reset (base 5 + bonuses/penalties) for week 2
```

### Scenario 4: Phase Summary (Issue #3)

**Goal**: Verify engine summary shows, not legacy card

**Steps**:
1. Enter social_intermission phase
2. Complete phase (let timer expire OR deplete energy)
3. Observe summary display

**Expected Behavior**:
- ✅ Console shows: `[social] Skipping legacy summary - Social Maneuvers handles phase summary`
- ✅ Console shows: `[social.js] ✓ Showed engine summary via showSummaryPanel` (or similar)
- ✅ Social Maneuvers summary panel appears (styled card with emoji icons)
- ✅ NO legacy "Social Update" card appears
- ✅ Summary shows: energy spent, actions taken, relationships changed, etc.

**Console Log Pattern**:
```
[social-maneuvers] ◼️ onSocialPhaseEnd() - leaving social_intermission phase
[social-maneuvers] ✓ Social phase complete - generating summary
[social] Skipping legacy summary - Social Maneuvers handles phase summary
[social.js] ✓ Showed engine summary via showSummaryPanel
```

### Scenario 5: Phase Start Seeding (Issue #2c)

**Goal**: Verify resources initialized at phase start

**Steps**:
1. Advance to social_intermission phase
2. Check console immediately

**Expected Behavior**:
- ✅ Console shows: `[social-maneuvers] ▶️ onSocialPhaseStart() - entering social_intermission phase`
- ✅ Console shows: `[social-maneuvers] ✓ Resources initialized and reset for N players`
- ✅ Console shows: `[social-maneuvers] ⚡ Energy seeded for human player: X`
- ✅ HUD displays correct energy value

**Console Log Pattern**:
```
[social-maneuvers] ▶️ onSocialPhaseStart() - entering social_intermission phase
[social-resources] 🔄 Weekly reset for player 1 at week 2
[social-resources] Energy delta: base 5 + 0 = 5
[social-maneuvers] ✓ Resources initialized and reset for 12 players
[social-maneuvers] ⚡ Energy seeded for human player: 5 (Base=5 + weekly bonuses/penalties)
```

## Regression Testing

### Verify No Breaking Changes

Test these scenarios to ensure existing functionality still works:

1. **Legacy Mode**: Disable Social Maneuvers (`window.USE_SOCIAL_MANEUVERS = false`)
   - Social phase should work with legacy system
   - No errors in console

2. **Resource Events**: Check that other code listening to resource events still works
   - HUD updates
   - UI refreshes
   - No duplicate updates

3. **Phase Transitions**: Verify all phase transitions work smoothly
   - social_intermission → nominations
   - No stuck phases
   - Timer works correctly

4. **Multi-target Actions**: Test group actions
   - Select multiple players
   - Execute group action
   - Verify all targets affected

## Performance Testing

### Check for Performance Issues

1. **Event Spam**: Execute 10 actions rapidly
   - Should not cause lag
   - Events should batch/throttle if needed

2. **Memory Leaks**: Play through 5+ social phases
   - Check DevTools memory profiler
   - No growing memory usage

3. **Console Spam**: Play normal game
   - Logs should be informative but not excessive
   - ~5-10 logs per action is acceptable

## Browser Compatibility

Test in multiple browsers:
- ✅ Chrome/Edge (Chromium)
- ✅ Firefox
- ✅ Safari (if available)

**Known Issues**: None expected. Uses standard APIs (CustomEvent, dispatchEvent).

## Debugging Tips

### If Energy Doesn't Replenish
1. Check console for: `🔄 Weekly reset for player X`
2. Check `game.__socialWeeklyResetWeek` matches current week
3. Verify `SocialManeuvers.isEnabled()` returns true
4. Check `game.__socialResources` has correct values

### If ReferenceError Still Occurs
1. Check console for: `✓ Installed scheduleFastAdvance shim`
2. Verify `window.scheduleFastAdvance` is defined
3. Check browser console for any script load errors
4. Try: `typeof window.scheduleFastAdvance` in console (should be "function")

### If HUD Doesn't Update
1. Check console for: `📡 Dispatched social-resources-changed event`
2. Verify `SocializeMobile.updateHUD` is defined
3. Check for JavaScript errors blocking event handlers
4. Try: `window.addEventListener('social-resources-changed', e => console.log('EVENT:', e.detail))`

### If Legacy Summary Shows
1. Check console for: `Skipping legacy summary`
2. Verify `SocialManeuvers.isEnabled()` returns true
3. Check `game.cfg.enableSocialManeuvers` is true
4. Look for: `shouldShowLegacyMemories()` returning false

## Success Criteria

All scenarios above should pass with expected behavior. Specifically:

| Criterion | Test | Expected Result |
|-----------|------|-----------------|
| No ReferenceError | Scenario 1 | ✅ No errors, clean phase advance |
| Resources update | Scenario 2 | ✅ Immediate HUD refresh |
| Weekly reset works | Scenario 3 | ✅ Energy replenished, guard works |
| Engine summary shows | Scenario 4 | ✅ No legacy card, SM panel shows |
| Phase seeding works | Scenario 5 | ✅ Resources initialized correctly |

## Rollback Plan

If issues arise:
1. Revert commits on branch
2. Or disable Social Maneuvers: `window.USE_SOCIAL_MANEUVERS = false`
3. Legacy system will take over automatically

## Contact

For issues or questions:
- Check console logs first (emoji-prefixed for easy scanning)
- Review SOCIAL_FIXES_SUMMARY.md for implementation details
- Run `node verify_social_fixes.mjs` to check static code
