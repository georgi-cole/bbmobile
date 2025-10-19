# Weekly Lifecycle Examples

## Example 1: Conservative Player (Strategic Energy Conservation)

### Week 1
**Starting Energy:** 5 (base)

**Actions:**
- Uses 2 energy for social actions
- Leftover: 3 energy

**Weekly Events:**
- None

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   0
Penalties: 0
Carryover: 3
─────────────
Total:     8
```

**Week 2 Starting Energy:** 8 ⚡

---

## Example 2: Aggressive Player (All Energy Spent)

### Week 1
**Starting Energy:** 5 (base)

**Actions:**
- Uses all 5 energy aggressively
- Leftover: 0 energy

**Weekly Events:**
- Won HOH (+5 bonus)
- Nominated another player (-1 for them, +4 adversity for nominated)

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   5 (HOH)
Penalties: 0
Carryover: 0
─────────────
Total:     10 (capped at max)
```

**Week 2 Starting Energy:** 10 ⚡

---

## Example 3: Unlucky Player

### Week 1
**Starting Energy:** 5 (base)

**Actions:**
- Uses 1 energy
- Leftover: 4 energy

**Weekly Events:**
- Skipped competition (-3 penalty)
- Not drawn for veto (-1 penalty)

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   0
Penalties: -4 (Comp Skipped -3, Not Drawn -1)
Carryover: 4
─────────────
Total:     5
```

**Week 2 Starting Energy:** 5 ⚡

---

## Example 4: Power Player (Max Energy Scenario)

### Week 1
**Starting Energy:** 10 (carried from previous week)

**Actions:**
- Uses 0 energy (conserving)
- Leftover: 10 energy

**Weekly Events:**
- Won HOH (+5 bonus)
- Won POV (+3 bonus)
- Was nominated (+4 adversity bonus)

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   12 (HOH 5 + POV 3 + Nominated 4)
Penalties: 0
Carryover: 10
─────────────
Total:     27 → 10 (capped at max)
```

**Week 2 Starting Energy:** 10 ⚡ (capped)

**Note:** Even with 27 potential energy, the system caps at MAX_ENERGY (10).

---

## Example 5: Struggling Player

### Week 1
**Starting Energy:** 2 (low from previous penalties)

**Actions:**
- Uses 2 energy
- Leftover: 0 energy

**Weekly Events:**
- Skipped competition (-3 penalty)
- Broke alliance (-3 penalty)
- Zero score in comp (-2 penalty)

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   0
Penalties: -8 (Skipped -3, Broke Alliance -3, Zero Score -2)
Carryover: 0
─────────────
Total:     -3 → 0 (clamped at min)
```

**Week 2 Starting Energy:** 0 ⚡ (clamped)

**Note:** Player starts next week with no energy. They'll need to wait for weekly bonuses to recover.

---

## Example 6: Alliance Builder

### Week 1
**Starting Energy:** 5 (base)

**Actions:**
- Forms 2 alliances (uses 6 energy via strategic maneuvers)
- Leftover: -1 energy (went over, system handles gracefully)

**Weekly Events:**
- Formed 2 new alliances (+2 bonus each = +4 total)
- Saved with POV (+2 bonus)

**Week 2 Seed Calculation:**
```
Base:      5
Bonuses:   6 (New Alliances 4 + Saved with POV 2)
Penalties: 0
Carryover: 0 (spent all)
─────────────
Total:     11 → 10 (capped at max)
```

**Week 2 Starting Energy:** 10 ⚡

---

## Key Insights

### Strategic Depth
1. **Conservation Strategy:** Save energy for big weeks with bonuses
2. **Aggressive Strategy:** Spend all energy, rely on competition wins for bonuses
3. **Balanced Strategy:** Use some, save some, aim for consistent mid-range energy

### Unlimited Carryover Benefits
- No "use it or lose it" pressure
- Rewards strategic energy management
- Creates interesting player decisions: spend now or save for later?

### Capping Behavior
- **Only the final seed is capped** to [0, MAX_ENERGY]
- Carryover itself has no limit
- Example: Carryover of 20 is valid, but final seed caps at 10

### Penalty Recovery
- Players with multiple penalties can recover through bonuses
- Strategic play (winning comps, forming alliances) offsets negative events
- Zero energy is recoverable - not a death sentence

### Battery Preview
Players see their projected energy including:
- Base amount (5)
- Weekly bonuses (HOH, POV, etc.)
- Weekly penalties (skipped comp, etc.)
- **Current leftover energy** (automatically included in total, not shown as separate line)

This gives players transparency into their next week's starting position.
