# SM Bank Watchers - Manual Test Scenarios

This document provides step-by-step manual test scenarios to validate the SM Bank implementation.

## Test Setup

1. Load the game in a browser
2. Enable Social Maneuvers: `game.cfg.enableSocialManeuvers = true`
3. Open browser DevTools console to monitor logs
4. Ensure at least 4 players are alive

## Test Scenario 1: Bank Initialization (No Auto-Seed)

**Expected Behavior:** Bank starts at 0, not 5

**Steps:**
1. Start a new game
2. Check console for bank initialization logs
3. Run: `SocialManeuvers.SocialEnergyBank.get(game.humanId)`

**Expected Logs:**
```
[social-bank] 🏦 Bank initialized for player X: 0 (no auto-seed)
```

**Expected Result:** Bank value is 0

---

## Test Scenario 2: HOH Win Event

**Expected Behavior:** Winning HOH immediately adds +5 to bank

**Steps:**
1. Note current bank: `SocialManeuvers.SocialEnergyBank.get(1)`
2. Trigger HOH win: `game.hohId = 1`
3. Check bank again: `SocialManeuvers.SocialEnergyBank.get(1)`

**Expected Logs:**
```
[sm-event] HOH win detected: Player 1 at week 1
[social-bank] 📊 Event hohWin for player 1: 0 + 5 = 5
```

**Expected Result:** Bank increases by exactly 5

---

## Test Scenario 3: POV Win Event

**Expected Behavior:** Winning POV immediately adds +3 to bank

**Steps:**
1. Note current bank: `SocialManeuvers.SocialEnergyBank.get(2)`
2. Trigger POV win: `game.vetoHolder = 2`
3. Check bank again: `SocialManeuvers.SocialEnergyBank.get(2)`

**Expected Logs:**
```
[sm-event] POV win detected: Player 2 at week 1
[social-bank] 📊 Event povWin for player 2: 0 + 3 = 3
```

**Expected Result:** Bank increases by exactly 3

---

## Test Scenario 4: Nomination Event

**Expected Behavior:** Being nominated immediately adds +4 to bank

**Steps:**
1. Note current bank: `SocialManeuvers.SocialEnergyBank.get(3)`
2. Trigger nomination: `game.nominees = [3, 4]`
3. Check bank again: `SocialManeuvers.SocialEnergyBank.get(3)`

**Expected Logs:**
```
[sm-event] Nomination detected: Player 3 at week 1
[social-bank] 📊 Event nominated for player 3: 0 + 4 = 4
```

**Expected Result:** Bank increases by exactly 4

---

## Test Scenario 5: Week Rollover

**Expected Behavior:** When week advances, all alive players get +5 base energy

**Steps:**
1. Note current banks for all players: `__smDebug.showAllBanks()`
2. Trigger week rollover: `game.week = 2`
3. Check banks again: `__smDebug.showAllBanks()`

**Expected Logs:**
```
[sm-week] Week rollover detected: 1 → 2
[sm-week] +5 base added to bank for player 1 (Player Name) at week 2
[sm-week] +5 base added to bank for player 2 (Player Name) at week 2
...
```

**Expected Result:** Every alive player's bank increases by exactly 5

---

## Test Scenario 6: Social Phase Seeding from Bank

**Expected Behavior:** Entering social phase seeds energy from bank without overwriting

**Steps:**
1. Set up banks with different values:
   - `__smDebug.setBank(1, 10)`
   - `__smDebug.setBank(2, 8)`
2. Trigger social phase start: `SocialManeuvers.onSocialPhaseStart()`
3. Check phase energy: 
   - `SocialManeuvers.SocialResources.get(1, 'energy')`
   - `SocialManeuvers.SocialResources.get(2, 'energy')`

**Expected Logs:**
```
[sm-phase] seeded from bank=10, phase energy=10
```

**Expected Result:** Phase energy equals bank balance for each player

---

## Test Scenario 7: Spend Energy and Bank Sync

**Expected Behavior:** Spending energy reduces both phase energy and bank; leftover syncs on phase end

**Steps:**
1. Enter social phase with bank=10
2. Execute an action (costs 2 energy)
3. Check bank: `SocialManeuvers.SocialEnergyBank.get(game.humanId)`
4. Check phase energy: `SocialManeuvers.SocialResources.get(game.humanId, 'energy')`
5. Trigger phase end: `SocialManeuvers.onSocialPhaseEnd()`
6. Check bank is synced

**Expected Logs:**
```
[social-resources] ⚡ Player X spent: {energy: 2}
[sm-phase] Synced leftover energy to bank for player X: 8
```

**Expected Result:** Bank and phase energy both show 8

---

## Test Scenario 8: Event Idempotency

**Expected Behavior:** Events don't double-apply in the same week

**Steps:**
1. Trigger HOH win: `game.hohId = 1`
2. Note bank value
3. Trigger again: `game.hohId = 1`
4. Check bank hasn't changed

**Expected Logs:**
Only one `[sm-event] HOH win detected` log, no second delta

**Expected Result:** Bank increases only once

---

## Test Scenario 9: Multiple Events Accumulate

**Expected Behavior:** Multiple events in one week accumulate in bank

**Steps:**
1. Start with bank=0
2. Win HOH: `game.hohId = 1` (bank → 5)
3. Get nominated: `game.nominees = [1]` (bank → 9)
4. Win POV: `game.vetoHolder = 1` (bank → 12)
5. Week rollover: `game.week = 2` (bank → 17)

**Expected Result:** Bank = 17 (0 + 5 + 4 + 3 + 5)

---

## Test Scenario 10: No Base=5 Recompute

**Expected Behavior:** resetWeekly and recomputePhaseEnergy don't reset energy to 5

**Steps:**
1. Set bank to 15: `__smDebug.setBank(1, 15)`
2. Call resetWeekly: `SocialManeuvers.SocialResources.resetWeekly(1)`
3. Check bank: `SocialManeuvers.SocialEnergyBank.get(1)`
4. Call recomputePhaseEnergy: `SocialManeuvers.SocialResources.recomputePhaseEnergy(1)`
5. Check phase energy: `SocialManeuvers.SocialResources.get(1, 'energy')`

**Expected Result:** Bank stays 15, phase energy becomes 15 (from bank)

---

## Dev Helper Commands

Available via `__smDebug` object:

```javascript
// View all banks
__smDebug.showAllBanks()

// Set bank directly
__smDebug.setBank(playerId, amount)

// Adjust bank
__smDebug.adjustBank(playerId, delta)

// Get bank
__smDebug.getBank(playerId)

// Record event manually
__smDebug.recordWeeklyEvent(playerId, 'hohWin', true)

// View resources
__smDebug.getResources(playerId)
```

---

## Success Criteria

All scenarios should:
1. ✅ Show correct log messages with proper tags
2. ✅ Update bank immediately (not on phase transition)
3. ✅ Maintain idempotency within a week
4. ✅ Accumulate energy without caps
5. ✅ Never auto-initialize to 5
6. ✅ Seed phase energy from bank without overwriting bank
