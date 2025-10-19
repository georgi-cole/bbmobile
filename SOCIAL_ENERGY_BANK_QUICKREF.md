# Social Energy Bank - Quick Reference

## 🎯 What Changed

**Before**: Capped weekly refill (max 10 energy, recompute at phase start)  
**After**: Uncapped rolling bank (unlimited accumulation, immediate deltas)

## 🏦 The Bank

```javascript
// Access the bank
const balance = SocialManeuvers.SocialEnergyBank.get(playerId);

// Bank properties:
// - Uncapped (can exceed 10)
// - Persists across weeks
// - Updated immediately on events
// - Synchronized with current energy
```

## ⚡ Immediate Event Deltas

Events now apply to bank **immediately** (not at next phase):

```javascript
// Record event
SocialManeuvers.SocialResources.recordWeeklyEvent(playerId, 'hohWin', true);
// Bank += 5 instantly ✓

// Old system:
// Event recorded, delta computed later at phase start ✗
```

## 🔄 Lock-Step Updates

Bank and current energy stay synchronized:

```javascript
// Spend energy in phase
SocialResources.spend(playerId, { energy: 3 });
// Current energy -= 3
// Bank -= 3 (lock-step)

// Earn/refund energy
SocialResources.earn(playerId, { energy: 2 });
// Current energy += 2
// Bank += 2 (lock-step)
```

## 🌱 Phase Seeding

Phase energy is seeded from bank at phase start:

```javascript
// Bank: 15 (uncapped)
SocialResources.recomputePhaseEnergy(playerId);
// Phase energy: 10 (capped at MAX_ENERGY for gameplay)
```

## 🚫 Skip Penalties

Enforced via SM-only watcher (no legacy edits):

```javascript
// Automatically tracks participation
// If player skips competition:
// Bank -= 3 immediately

// Integration point (optional):
SocialManeuvers.recordCompetitionParticipation(playerId);
```

## 📊 Event Deltas

**Bonuses** (applied immediately to bank):
- HOH Win: +5
- POV Win: +3
- Nominated: +4
- New Alliance: +2
- Saved with POV: +2
- Survived Eviction: +1

**Penalties** (applied immediately to bank):
- Comp Skipped: -3
- Not Drawn Veto: -1
- Zero Score: -2
- Broke Alliance: -3

## 🔍 Debug Commands

```javascript
// Get bank balance
__smDebug.getBank(playerId);        // returns number

// Set bank balance
__smDebug.setBank(playerId, 20);    // sets to 20

// Adjust bank
__smDebug.adjustBank(playerId, 5);  // adds 5

// Show all banks
__smDebug.showAllBanks();           // console.table
```

## 📈 Example Scenario

```
WEEK 1:
  Start:        Bank = 5 (default)
  HOH win:      Bank = 10 (+5 immediate)
  POV win:      Bank = 13 (+3 immediate)
  Phase starts: Phase energy = 10 (capped from bank)
  Spend 7:      Bank = 6, Phase = 3 (lock-step)
  Week ends:    Bank = 6 (carries over)

WEEK 2:
  Start:        Bank = 6 (from Week 1)
  Skip comp:    Bank = 3 (-3 penalty)
  Phase starts: Phase energy = 3 (from bank)
  Spend 2:      Bank = 1, Phase = 1 (lock-step)
  Earn 1:       Bank = 2, Phase = 2 (lock-step)
```

## ✅ Benefits

1. **Unlimited Savings**: Bank can grow beyond 10
2. **Instant Feedback**: See event impacts immediately
3. **No Waste**: All leftover carries to next week
4. **Consistent State**: Bank and energy always in sync
5. **Clean Code**: No legacy file modifications needed

## 📁 Files

**Modified**:
- `js/social-maneuvers.js` - Core implementation

**New**:
- `test_social_energy_bank.html` - Test suite (7 tests)
- `SOCIAL_ENERGY_BANK_IMPLEMENTATION.md` - Technical docs
- `SOCIAL_ENERGY_BANK_VISUAL_FLOW.md` - Visual diagrams

**Not Modified** (legacy):
- `js/social.js`
- `js/competitions.js`
- `js/nominations.js`
- `js/veto.js`

## 🧪 Testing

Open in browser: `test_social_energy_bank.html`

All tests pass ✅

## 🔗 Integration

**For Competition Scoring** (optional):
```javascript
// When player submits score:
if (global.SocialManeuvers?.recordCompetitionParticipation) {
  global.SocialManeuvers.recordCompetitionParticipation(playerId);
}
```

**For Event Recording**:
```javascript
// Already integrated in:
// - js/nominations.js (nominated event)
// - js/veto.js (POV win, veto used)
// - js/competitions.js (HOH win)

// No changes needed - works with new bank system ✓
```

## 🎓 Key Concepts

1. **Bank** = Persistent, uncapped energy storage
2. **Phase Energy** = Temporary, capped at 10 for gameplay
3. **Lock-Step** = Bank and phase energy move together
4. **Immediate Deltas** = Events update bank instantly
5. **Seeding** = Phase energy initialized from bank

## 📞 Support

For questions or issues:
- Check `SOCIAL_ENERGY_BANK_IMPLEMENTATION.md` for details
- Review `SOCIAL_ENERGY_BANK_VISUAL_FLOW.md` for diagrams
- Run `test_social_energy_bank.html` to verify behavior
- Use `__smDebug` commands to inspect state

---

**Implementation Date**: 2025-10-19  
**PR**: `copilot/implement-sm-only-social-energy-bank`  
**Version**: 1.0.0  
**Status**: ✅ Complete & Tested
