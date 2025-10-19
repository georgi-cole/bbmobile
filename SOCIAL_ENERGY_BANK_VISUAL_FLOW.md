# Social Energy Bank - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    SOCIAL ENERGY BANK SYSTEM                             │
│                         (Uncapped Storage)                               │
└─────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────┐
│ WEEK 1                                                                    │
└──────────────────────────────────────────────────────────────────────────┘

  Start of Week
  ┌──────────┐
  │ Bank: 5  │ ← DEFAULT_ENERGY initialization
  └──────────┘

  ↓ HOH Competition Win (+5 immediately)
  
  ┌──────────┐
  │ Bank: 10 │ ← Event delta applied to bank instantly
  └──────────┘

  ↓ POV Competition Win (+3 immediately)
  
  ┌──────────┐
  │ Bank: 13 │ ← Accumulated bonuses (uncapped!)
  └──────────┘

  ↓ Social Phase Starts
  
  ┌──────────┬──────────────┐
  │ Bank: 13 │ Phase E: 10  │ ← Seeded from bank, capped at MAX_ENERGY
  └──────────┴──────────────┘

  ↓ Spend 7 Energy in Phase (lock-step)
  
  ┌──────────┬──────────────┐
  │ Bank: 6  │ Phase E: 3   │ ← Both decrease together
  └──────────┴──────────────┘

  ↓ Week Ends
  
  ┌──────────┐
  │ Bank: 6  │ ← Leftover carries to next week
  └──────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ WEEK 2                                                                    │
└──────────────────────────────────────────────────────────────────────────┘

  Start of Week
  ┌──────────┐
  │ Bank: 6  │ ← Carried over from Week 1 (unlimited carryover!)
  └──────────┘

  ↓ Competition Skipped (-3 immediately)
  
  ┌──────────┐
  │ Bank: 3  │ ← Penalty applied via skip watcher
  └──────────┘

  ↓ Social Phase Starts
  
  ┌──────────┬──────────────┐
  │ Bank: 3  │ Phase E: 3   │ ← Full bank amount used (< MAX_ENERGY)
  └──────────┴──────────────┘

  ↓ Spend 2 Energy, Earn 1 Refund
  
  ┌──────────┬──────────────┐
  │ Bank: 2  │ Phase E: 2   │ ← Lock-step updates
  └──────────┴──────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ KEY CONCEPTS                                                              │
└──────────────────────────────────────────────────────────────────────────┘

  Bank (Uncapped)              Phase Energy (Capped)
  ┌──────────────┐             ┌──────────────┐
  │ Persists     │             │ Temporary    │
  │ Unlimited    │             │ Max = 10     │
  │ Accumulates  │             │ Reset each   │
  │ Carries over │             │ phase        │
  └──────────────┘             └──────────────┘
         ↓                            ↑
         └────── Seeds At Start ──────┘
         ┌────── Lock-Step Updates ───┐
         ↓                            ↓


┌──────────────────────────────────────────────────────────────────────────┐
│ EVENT DELTA FLOW (Immediate Application)                                 │
└──────────────────────────────────────────────────────────────────────────┘

  Legacy System (OLD):
  ┌───────────┐     ┌─────────────┐     ┌──────────────┐
  │ Event     │ ──→ │ Track for   │ ──→ │ Compute at   │
  │ Occurs    │     │ later       │     │ next phase   │
  └───────────┘     └─────────────┘     └──────────────┘
                                               ↓
                                         Apply to energy


  Bank System (NEW):
  ┌───────────┐     ┌─────────────────────────────┐
  │ Event     │ ──→ │ Apply delta to bank         │
  │ Occurs    │     │ IMMEDIATELY                 │
  └───────────┘     └─────────────────────────────┘
                           ↓
                    ┌──────────────┐
                    │ Bank updated │
                    │ Preview live │
                    └──────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ LOCK-STEP MECHANISM                                                       │
└──────────────────────────────────────────────────────────────────────────┘

  spend(playerId, { energy: 3 })
  
    ┌──────────────────┐      ┌──────────────────┐
    │ Current Energy   │      │ Bank             │
    │ 10 → 7           │      │ 13 → 10          │
    └──────────────────┘      └──────────────────┘
            ↓                         ↓
         Deduct 3               Deduct 3
         (Phase)                (Persistent)

  earn(playerId, { energy: 2 })
  
    ┌──────────────────┐      ┌──────────────────┐
    │ Current Energy   │      │ Bank             │
    │ 7 → 9            │      │ 10 → 12          │
    └──────────────────┘      └──────────────────┘
            ↓                         ↓
          Add 2                   Add 2
         (Phase)                (Persistent)


┌──────────────────────────────────────────────────────────────────────────┐
│ SKIP PENALTY WATCHER (SM-Only, No Legacy Edits)                          │
└──────────────────────────────────────────────────────────────────────────┘

  Phase: HOH Competition
  
  ┌─────────────────────────────────────┐
  │ installCompetitionSkipWatcher()     │
  │                                     │
  │ ┌─────────────────────────────┐    │
  │ │ Track all alive players     │    │
  │ │ Mark as "entered"           │    │
  │ └─────────────────────────────┘    │
  │              ↓                      │
  │ ┌─────────────────────────────┐    │
  │ │ Wait for participation      │    │
  │ │ recordCompetitionParticipation() │
  │ └─────────────────────────────┘    │
  │              ↓                      │
  │ ┌─────────────────────────────┐    │
  │ │ Phase ends                  │    │
  │ │ Check: participated?        │    │
  │ └─────────────────────────────┘    │
  │        ↓              ↓             │
  │      Yes             No             │
  │       ↓              ↓              │
  │   Continue    Apply -3 penalty     │
  │               to bank              │
  └─────────────────────────────────────┘


┌──────────────────────────────────────────────────────────────────────────┐
│ COMPARISON: OLD vs NEW                                                    │
└──────────────────────────────────────────────────────────────────────────┘

  OLD SYSTEM (Capped Weekly Refill):
  ╔═══════════════════════════════════════════════════════════════╗
  ║ Week 1: Energy = 5 + bonuses - penalties                     ║
  ║         Leftover capped at 10                                ║
  ║         ↓                                                     ║
  ║ Week 2: Energy = 5 + bonuses - penalties + min(leftover, 10) ║
  ║         Always capped at 10                                   ║
  ╚═══════════════════════════════════════════════════════════════╝
         Problem: Can't accumulate beyond 10
         Problem: Leftover wasted if bank full


  NEW SYSTEM (Uncapped Bank):
  ╔═══════════════════════════════════════════════════════════════╗
  ║ Week 1: Bank = 5                                              ║
  ║         Bank += event deltas (immediately)                    ║
  ║         Bank -= phase spending (lock-step)                    ║
  ║         ↓                                                     ║
  ║ Week 2: Bank = Week 1 bank (full carryover, uncapped!)       ║
  ║         Bank += event deltas (immediately)                    ║
  ║         Phase energy = min(Bank, 10) for gameplay balance     ║
  ╚═══════════════════════════════════════════════════════════════╝
         ✓ Unlimited accumulation
         ✓ No wasted leftover
         ✓ Immediate feedback
         ✓ Automatic carryover


┌──────────────────────────────────────────────────────────────────────────┐
│ BENEFITS SUMMARY                                                          │
└──────────────────────────────────────────────────────────────────────────┘

  🏦 Uncapped Accumulation
     └─ Players can save energy across multiple weeks
  
  ⚡ Immediate Feedback
     └─ Event deltas visible instantly, not delayed
  
  ♻️  Automatic Carryover
     └─ No more "use it or lose it" at week boundary
  
  🔒 Lock-Step Consistency
     └─ Bank and current energy always in sync
  
  🚫 Skip Penalties Enforced
     └─ SM-only watcher, no legacy file edits
  
  🎯 Clean Architecture
     └─ Bank is single source of truth for energy state
```
