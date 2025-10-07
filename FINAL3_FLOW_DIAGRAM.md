# Final 3 Week - Visual Flow Diagram

## Competition Flow

```
                    🏠 3 HOUSEGUESTS REMAINING
                              |
                              v
                    ╔═════════════════════╗
                    ║   FINAL 3 PART 1    ║
                    ║  All 3 Compete      ║
                    ╚═════════════════════╝
                              |
                    Scores: High → Low
                              |
              ┌───────────────┼───────────────┐
              |               |               |
         🏆 Winner        Loser #1        Loser #2
              |               |               |
              |               └───────┬───────┘
              |                       |
              |               ╔═══════════════════╗
              |               ║  FINAL 3 PART 2   ║
              |               ║ 2 Losers Compete  ║
              |               ╚═══════════════════╝
              |                       |
              |               Scores: High → Low
              |                       |
              |                  🏆 Winner
              |                       |
              └───────────┬───────────┘
                          |
                ╔═════════════════════╗
                ║   FINAL 3 PART 3    ║
                ║ 2 Finalists Compete ║
                ╚═════════════════════╝
                          |
                Scores: High → Low
                          |
                    👑 Final HOH
                          |
                          v
            ╔═════════════════════════════╗
            ║ 🎬 EVICTION CEREMONY        ║
            ║ (Live, Living Room)         ║
            ║ Final HOH Must Choose       ║
            ╚═════════════════════════════╝
                          |
              ┌───────────┴───────────┐
              |                       |
         Evicts One              Takes Other
         to Jury                 to Final 2
              |                       |
              v                       v
        👥 JURY MEMBER          🎯 FINAL 2
                                     |
                                     v
                              JURY VOTE FOR WINNER
```

## Technical Flow

```javascript
// postEvictionRouting() in eviction.js
if (alivePlayers.length === 3) {
    startFinal3Flow();
}

// competitions.js sequence:
startFinal3Flow()
    ↓
startF3P1()  // All 3 compete
    ↓
finishF3P1()  // Winner to Part 3, losers to Part 2
    ↓ (stores g.__f3p1Winner)
startF3P2(losers)  // 2 losers compete
    ↓
finishF3P2()  // Winner to Part 3
    ↓ (stores g.__f3p2Winner)
startF3P3()  // 2 finalists compete
    ↓
finishF3P3()  // Winner = Final HOH
    ↓ (sets g.hohId, g.nominees)
renderFinal3DecisionPanel()  // Live ceremony UI
    ↓
finalizeFinal3Decision(targetId)  // HOH evicts
    ↓
startJuryVote()  // Proceed to finale
```

## State Variables

| Variable | Purpose | Set In | Used In |
|----------|---------|--------|---------|
| `g.__f3p1Winner` | Part 1 winner ID | finishF3P1() | startF3P3() |
| `g.__f3p2Winner` | Part 2 winner ID | finishF3P2() | startF3P3() |
| `g.__f3_finalists` | Array of Part 3 competitors | startF3P3() | finishF3P3() |
| `g.__f3_duo` | Array of Part 2 competitors | startF3P2() | finishF3P2() |
| `g.hohId` | Final HOH player ID | finishF3P3() | renderFinal3DecisionPanel() |
| `g.nominees` | Both nominees [P3 loser, P1 loser] | finishF3P3() | renderFinal3DecisionPanel() |

## Phase Identifiers

| Phase | Description | Render Function | Finish Function |
|-------|-------------|----------------|-----------------|
| `final3_comp1` | Part 1: All 3 compete | renderF3P1() | finishF3P1() |
| `final3_comp2` | Part 2: Losers compete | renderF3P2() | finishF3P2() |
| `final3_comp3` | Part 3: Finalists compete | renderF3P3() | finishF3P3() |
| `final3_decision` | Eviction ceremony | renderFinal3DecisionPanel() | finalizeFinal3Decision() |

## User Experience Flow

### Part 1
- 🎮 All 3 houseguests compete in minigame
- ⏱️ Timer runs (~18+ seconds)
- 🏆 Winner revealed: "Advances directly to Part 3!"
- 📊 Scores sorted high to low
- ➡️ Winner stored, losers proceed to Part 2

### Part 2  
- 🎮 2 losers compete head-to-head
- ⏱️ Timer runs (~18+ seconds)
- 🏆 Winner revealed: "Advances to Part 3!"
- ➡️ Winner stored, both finalists ready

### Part 3
- 🎮 2 finalists compete for Final HOH
- ⏱️ Timer runs (~18+ seconds)
- 👑 Final HOH crowned!
- 📝 Both nominees assigned (P3 loser + P1 loser)
- ➡️ Proceed to ceremony

### Eviction Ceremony
- 🎬 "Final 3 Eviction Ceremony" panel
- 👤 Final HOH sees both nominees
- ⚠️ Confirmation required before eviction
- 💬 Optional justification
- ✅ One evicted → Jury
- ✅ One taken → Final 2

## Differences from Previous (2-part) System

### Old System:
```
Part 1: All 3 → Lowest = Nominee A
Part 2: Other 2 → Winner = HOH, Loser = Nominee B
Decision: HOH picks who to evict
```

### New System:
```
Part 1: All 3 → Winner → Part 3, Losers → Part 2
Part 2: 2 Losers → Winner → Part 3
Part 3: 2 Finalists → Winner = Final HOH
Decision: Final HOH holds live ceremony
```

### Key Advantages:
1. ✅ Show-accurate (matches US/CA format)
2. ✅ More dramatic progression (3 competitions)
3. ✅ Part 1 winner gets advantage (skip Part 2)
4. ✅ More strategic depth
5. ✅ Live ceremony feel (not diary room)
