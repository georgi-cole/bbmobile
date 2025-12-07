# Social Engine Test Specification

## Overview
This document provides manual test scenarios and runtime checks for the Social Phase Engine system.

## Prerequisites
- Game loaded with active players (at least 4 AI players)
- Browser console open (F12)
- Social phase accessible

## Test Suite 1: Energy Budget Compliance

### Test 1.1: Budget Computation
**Objective**: Verify AI players receive budgets between 60-90% of available energy

**Steps**:
1. Start a new game or load save with active AI players
2. Trigger social phase start
3. Check budgets:
   ```javascript
   window.__socialSim.getBudgets();
   ```

**Expected Results**:
- Each AI player has a budget entry
- `targetPct` should be between "0.60" and "0.90"
- `budget` = `availableEnergy` × `targetPct`
- `targetActions` should be between `minActionsPerPlayer` (3) and `maxActionsPerPlayer` (8)

**Pass Criteria**:
✅ All AI players have computed budgets
✅ All budgets are within 60-90% range
✅ Target actions are within configured bounds

---

### Test 1.2: Energy Spending Tracking
**Objective**: Verify energy spending is tracked correctly during phase

**Steps**:
1. Start social phase
2. Let phase run for 30-60 seconds
3. Check spending progress:
   ```javascript
   window.__socialSim.getBudgets();
   ```

**Expected Results**:
- `spent` value increases as interactions occur
- `actions` count increases
- `spendPct` shows percentage of budget spent

**Pass Criteria**:
✅ Spending values update in real-time
✅ No player exceeds their budget
✅ Action counts increment correctly

