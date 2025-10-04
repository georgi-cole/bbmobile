# Jury Reveal Pacing Flow Diagram

## Visual Timeline for 9 Jurors (Baseline ~67.8s)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JURY REVEAL SEQUENCE (No Compression)                     │
└─────────────────────────────────────────────────────────────────────────────┘

INTRO PHASE (12.0s total)
├─ Intro Card 1: "Jury Votes"                    [6.0s] ████████████
├─ Intro Card 2: "Time to Reveal"                [4.5s] █████████
└─ Setup Gap                                     [1.5s] ███

REVEAL PHASE (55.8s baseline + jitter)
├─ Juror 1 (Early)                               [5.4s ±0.4s] ██████████
│  └─ Phrase overlay (3.51s = 65%)               [3.51s] ███████
├─ Juror 2 (Early)                               [5.4s ±0.4s] ██████████
│  └─ Phrase overlay (3.51s = 65%)               [3.51s] ███████
├─ Juror 3 (Early)                               [5.4s ±0.4s] ██████████
│  └─ Phrase overlay (3.51s = 65%)               [3.51s] ███████
├─ Juror 4 (Mid)                                 [7.2s ±0.4s] ██████████████
│  └─ Phrase overlay (4.68s = 65%)               [4.68s] █████████
├─ Juror 5 (Mid)                                 [7.2s ±0.4s] ██████████████
│  └─ Phrase overlay (4.68s = 65%)               [4.68s] █████████
├─ Juror 6 (Mid)                                 [7.2s ±0.4s] ██████████████
│  └─ Phrase overlay (4.68s = 65%)               [4.68s] █████████
├─ Juror 7 (Late)                                [9.0s ±0.4s] ██████████████████
│  └─ Phrase overlay (5.85s = 65%)               [5.85s] ███████████
├─ Juror 8 (Late)                                [9.0s ±0.4s] ██████████████████
│  └─ Phrase overlay (5.85s = 65%)               [5.85s] ███████████
└─ Juror 9 (Final)                               [12.0s ±0.4s] ████████████████████████
   └─ Phrase overlay (7.80s = 65%)               [7.80s] ███████████████

WINNER PHASE (9.0s)
└─ Winner Suspense                               [9.0s] ██████████████████

═════════════════════════════════════════════════════════════════════════════
TOTAL: ~67.8s baseline (well under 180s cap)
═════════════════════════════════════════════════════════════════════════════
```

## Compression Example: 30 Jurors (256.8s → 180s)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    JURY REVEAL SEQUENCE (With Compression)                   │
└─────────────────────────────────────────────────────────────────────────────┘

INTRO PHASE (12.0s total)
├─ Intro Card 1: "Jury Votes"                    [6.0s] ████████████
├─ Intro Card 2: "Time to Reveal"                [4.5s] █████████
└─ Setup Gap                                     [1.5s] ███

REVEAL PHASE (168.0s compressed)
├─ Juror 1-30 (Each)                             [6.0s] ████████████
│  └─ Phrase overlay (3.9s = 65%)                [3.9s] ███████

⚠️  COMPRESSION APPLIED
    Baseline: 256.8s → Compressed: 180.0s
    Slot duration: 6.0s per juror (min: 1.2s)
    [jury] pacing compressed newCap=180s remaining=30 slotDur=6000ms

═════════════════════════════════════════════════════════════════════════════
TOTAL: Exactly 180s (at cap)
═════════════════════════════════════════════════════════════════════════════
```

## Fast-Forward Mode (User-Activated)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FAST-FORWARD ACTIVATED (≤10s to complete)                │
└─────────────────────────────────────────────────────────────────────────────┘

⏩ FAST-FORWARD BUTTON CLICKED
[jury] revealFastForward

REMAINING REVEALS (Compressed to 0.5s each)
├─ Remaining Juror 1                             [0.5s] █
│  └─ Phrase overlay (0.325s = 65%)              [0.325s] 
├─ Remaining Juror 2                             [0.5s] █
│  └─ Phrase overlay (0.325s = 65%)              [0.325s]
└─ Remaining Juror N                             [0.5s] █
   └─ Phrase overlay (0.325s = 65%)              [0.325s]

WINNER PHASE (Compressed)
└─ Winner Suspense                               [0.5s] █

═════════════════════════════════════════════════════════════════════════════
TOTAL: Remaining time reduced to <10s
═════════════════════════════════════════════════════════════════════════════
```

## Majority Clinch Detection

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         MAJORITY CLINCH BEHAVIOR                             │
└─────────────────────────────────────────────────────────────────────────────┘

Normal Flow (9 jurors, need 5 to win):
├─ Juror 1 votes → A:1, B:0
├─ Juror 2 votes → A:1, B:1
├─ Juror 3 votes → A:2, B:1
├─ Juror 4 votes → A:3, B:1
├─ Juror 5 votes → A:3, B:2
├─ Juror 6 votes → A:4, B:2
├─ Juror 7 votes → A:5, B:2  🎯 MAJORITY CLINCHED!
│  ├─ Badge appears: "Majority clinched"
│  ├─ Visual highlight on A's slot
│  ├─ Log: [juryReveal] majority clinched votes=5-2
│  └─ ⚠️  CONTINUES WITH FULL PACING (no fast-track under 180s cap)
├─ Juror 8 votes → A:6, B:2  (still full 9.0s reveal)
└─ Juror 9 votes → A:7, B:2  (still full 12.0s reveal)

Winner suspense → A wins 7-2

═════════════════════════════════════════════════════════════════════════════
Maintains dramatic pacing even after majority clinched
═════════════════════════════════════════════════════════════════════════════
```

## Human Jury Vote Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           HUMAN JURY VOTE SEQUENCE                           │
└─────────────────────────────────────────────────────────────────────────────┘

Phase 1: Anonymous Casting
├─ AI Juror 1: Silent vote cast (affinity-based)
├─ AI Juror 2: Silent vote cast (affinity-based)
├─ 👤 HUMAN JUROR (You): 
│  ├─ Voting panel appears:
│  │  ┌────────────────────────────┐
│  │  │   Your Jury Vote           │
│  │  ├────────────────────────────┤
│  │  │ [Vote Finalist A]          │
│  │  │ [Vote Finalist B]          │
│  │  └────────────────────────────┘
│  ├─ 30-second timer starts
│  ├─ Scenario A: User clicks button within 30s
│  │  └─ [juryCast] human vote submitted juror=<id> pick=<id>
│  └─ Scenario B: Timeout after 30s
│     ├─ [juryCast] human vote timeout, using affinity fallback
│     └─ [juryCast] human vote fallback juror=<id> pick=<id>
├─ AI Juror 4: Silent vote cast (affinity-based)
└─ ... remaining jurors

Phase 2: Reveal (human vote revealed like all others)
├─ Juror reveals happen in random order
└─ Human vote treated identically to AI votes during reveal

═════════════════════════════════════════════════════════════════════════════
Human has 30s to vote, then affinity-based fallback applied
═════════════════════════════════════════════════════════════════════════════
```

## Avatar Loading Priority

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         AVATAR LOADING WATERFALL                             │
└─────────────────────────────────────────────────────────────────────────────┘

For player ID "player123":

1. Try: player.avatar property
   └─ If defined → Use value ✓
   └─ If undefined → Try #2

2. Try: ./avatars/player123.jpg
   ├─ HTTP Request to local folder
   └─ If 404 → Try #3
   └─ On load error → Try #3 + log warning

3. Fallback: Dicebear API
   └─ https://api.dicebear.com/6.x/bottts/svg?seed=PlayerName
   └─ Console: [jury] avatar fallback for PlayerName

═════════════════════════════════════════════════════════════════════════════
All failures logged for debugging
═════════════════════════════════════════════════════════════════════════════
```

## Legend

```
█ = 1 second
⏩ = Fast-forward activated
👤 = Human player
🎯 = Milestone/Event
⚠️ = Important note
✓ = Success
```

## Performance Characteristics

| Scenario | Baseline Duration | Final Duration | Compression |
|----------|-------------------|----------------|-------------|
| 7 jurors | 49.8s | 49.8s | None |
| 9 jurors | 67.8s | 67.8s | None |
| 11 jurors | 85.8s | 85.8s | None |
| 15 jurors | 121.8s | 121.8s | None |
| 20 jurors | 172.8s | 172.8s | None |
| 25 jurors | 214.8s | **180.0s** | ⚠️ Compressed |
| 30 jurors | 256.8s | **180.0s** | ⚠️ Compressed |
| 50 jurors | 442.8s | **180.0s** | ⚠️ Compressed |

## User Experience Flow

```
1. Game reaches finale
2. Finalists announced
3. Jury casting phase (human votes if juror)
4. Intro Card 1: "Jury Votes" (6s)
5. Intro Card 2: "Time to Reveal" (4.5s)
6. Setup gap (1.5s)
7. [⏩ Fast Forward] button appears
8. Juror 1 reveal (phrase overlay)
9. Juror 2 reveal (phrase overlay)
   ...
   [User can click ⏩ at any time]
   ...
N. Final juror reveal
N+1. Winner suspense (9s)
N+2. Winner announced
N+3. Confetti & celebration
```
