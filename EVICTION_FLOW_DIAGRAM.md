# Final HOH Eviction Sequence - Visual Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FINAL 3 EVICTION CEREMONY                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  Final HOH Makes Decision                                        │
│  ┌──────────────────────────────────────┐                       │
│  │  Eviction Justification Modal        │                       │
│  │  ⏸️  TIMER PAUSED                    │                       │
│  │                                      │                       │
│  │  • Select reason (dropdown)          │                       │
│  │  • Or write custom reason            │                       │
│  │  • Unlimited time to decide          │                       │
│  │                                      │                       │
│  │  [Cancel]  [Confirm Eviction]        │                       │
│  └──────────────────────────────────────┘                       │
│  ⏯️  TIMER RESUMED                                               │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  🎬 Final Eviction Decision Card                                 │
│  ┌──────────────────────────────────────┐                       │
│  │  [HOH Name] has chosen to evict      │                       │
│  │  [Evicted Player Name]                │                       │
│  │  to the Jury                          │                       │
│  └──────────────────────────────────────┘                       │
│  Duration: 5000ms (5 seconds)                                    │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  🥉 Third Place Card                                             │
│  ┌──────────────────────────────────────┐                       │
│  │  [Evicted Player Name]                │                       │
│  │  finishes in 3rd place                │                       │
│  │  The Bronze Medalist                  │                       │
│  └──────────────────────────────────────┘                       │
│  Duration: 4500ms (4.5 seconds)                                  │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  IF JUSTIFICATION PROVIDED:                                      │
│                                                                   │
│  💬 HOH Reasoning Card                                           │
│  ┌──────────────────────────────────────┐                       │
│  │  💬 [HOH Name]                        │                       │
│  │  "[Justification text]"               │                       │
│  └──────────────────────────────────────┘                       │
│  Duration: 4000ms (4 seconds)                                    │
│                          ↓                                        │
│  💬 Evictee Reply Card                                           │
│  ┌──────────────────────────────────────┐                       │
│  │  💬 [Evicted Player Name]             │                       │
│  │  "[Dynamic reply based on affinity]"  │                       │
│  └──────────────────────────────────────┘                       │
│  Duration: 4000ms (4 seconds)                                    │
│                                                                   │
│  Reply Types:                                                    │
│  • Unkind (affinity < -0.15): Confrontational                   │
│  • Neutral (-0.15 to 0.15): Gracious                            │
│  • Kind (affinity > 0.15): Supportive                           │
└─────────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│  ⚖️ Jury Vote Explanation Modal                                  │
│  ┌──────────────────────────────────────┐                       │
│  │  Time for the Jury Vote              │                       │
│  │                                      │                       │
│  │  The Jury will now cast their votes  │                       │
│  │  one by one.                         │                       │
│  │                                      │                       │
│  │  The winner of Big Brother will be   │                       │
│  │  crowned after all votes are         │                       │
│  │  revealed.                           │                       │
│  └──────────────────────────────────────┘                       │
│  Duration: 5000ms minimum (5+ seconds)                           │
│  Can be dismissed by click after 5s                              │
└─────────────────────────────────────────────────────────────────┘
                          ↓
                  [Brief Pause: 800ms]
                          ↓
┌─────────────────────────────────────────────────────────────────┐
│                    START JURY VOTE SEQUENCE                      │
└─────────────────────────────────────────────────────────────────┘


═══════════════════════════════════════════════════════════════════
                        TIMING BREAKDOWN
═══════════════════════════════════════════════════════════════════

WITH JUSTIFICATION:
  Decision Card:        5.0s
  Bronze Card:          4.5s
  HOH Reasoning:        4.0s
  Evictee Reply:        4.0s
  Jury Vote Modal:      5.0s
  Pause:                0.8s
  ─────────────────────────
  TOTAL:               23.3s

WITHOUT JUSTIFICATION:
  Decision Card:        5.0s
  Bronze Card:          4.5s
  Jury Vote Modal:      5.0s
  Pause:                0.8s
  ─────────────────────────
  TOTAL:               15.3s


═══════════════════════════════════════════════════════════════════
                 PATTERN MATCH TIMING IMPROVEMENTS
═══════════════════════════════════════════════════════════════════

┌────────────┬──────────────────┬─────────────┬──────────────────┐
│ Difficulty │ Memorization     │ Gameplay    │ Pattern Length   │
├────────────┼──────────────────┼─────────────┼──────────────────┤
│ Easy       │ 8s (+60%)        │ 75s (+25%)  │ 4 shapes         │
│ Medium     │ 6s (+100%)       │ 60s (+33%)  │ 6 shapes         │
│ Hard       │ 4s (+100%)       │ 45s (+50%)  │ 8 shapes         │
└────────────┴──────────────────┴─────────────┴──────────────────┘

All timings provide a fair and enjoyable player experience!


═══════════════════════════════════════════════════════════════════
                    KEY TECHNICAL FEATURES
═══════════════════════════════════════════════════════════════════

✓ Timer Pause/Resume System
  • Pauses during justification modal
  • Stores remaining time
  • Resumes seamlessly

✓ Affinity-Based Dialogue
  • 3 response tiers based on relationship
  • 5 unique responses per tier
  • Adds personality and continuity

✓ Async/Await Flow Control
  • Sequential card display
  • Prevents overlap
  • Clean transitions

✓ Graceful Degradation
  • Optional chaining throughout
  • Feature detection before use
  • Backward compatible

```
