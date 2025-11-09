# Unified Voting UI Flow Diagram

## Overview
This document illustrates the flow of the unified voting UI system and how it eliminates duplicate cards.

## Before Implementation (Problem)

```
Eviction Sequence Starts
    │
    ├─ beginDiaryRoomSequence()
    │   │
    │   ├─ For each voter:
    │   │   │
    │   │   ├─ showDiaryRoomWithAvatars() ────┐
    │   │   │   └─ Creates modal in #tvOverlay │
    │   │   │                                   │
    │   │   ├─ global.showCard('Diary Room')  ─┤── DUPLICATE CARDS!
    │   │   │   └─ Creates revealCard          │
    │   │   │                                   │
    │   │   ├─ LiveVoteOverlay.show()         ─┤
    │   │   │   └─ Creates overlay modal       │
    │   │   │                                   │
    │   │   └─ LiveVoteRollout.show()         ─┘
    │   │       └─ Creates rollout panel
    │   │
    │   └─ Result: Multiple UI elements visible simultaneously!
    │
    └─ revealVotes()
        └─ Shows result card (may overlap lingering vote cards)
```

## After Implementation (Solution)

```
Eviction Sequence Starts
    │
    ├─ beginDiaryRoomSequence()
    │   │
    │   ├─ For each voter:
    │   │   │
    │   │   ├─ VoteDisplayManager.showVote() ──────────┐
    │   │   │   │                                        │
    │   │   │   ├─ 1. Clear any existing display        │
    │   │   │   ├─ 2. Purge legacy artifacts           │ SINGLE
    │   │   │   ├─ 3. Add body class                   │ UNIFIED
    │   │   │   ├─ 4. Create avatar modal              │ MODAL
    │   │   │   ├─ 5. Set auto-clear timeout           │ ONLY!
    │   │   │   └─ Fallback if TV unavailable          │
    │   │   │                                           │
    │   │   └─ Wait for duration (2600ms) ─────────────┘
    │   │
    │   └─ Result: Clean, single UI per vote
    │
    └─ revealVotes()
        │
        ├─ VoteDisplayManager.clear() ───┐
        ├─ VoteDisplayManager.clearLegacyArtifacts() ─┤── Cleanup
        │                                              │   BEFORE
        └─ Show result card ────────────────────────────   results
            └─ Clean slate, no overlaps!
```

## VoteDisplayManager State Machine

```
┌─────────────────────────────────────────────────────────┐
│                 VoteDisplayManager                       │
│                                                          │
│  State:                                                  │
│    active: false                                         │
│    currentTimeout: null                                  │
│    suppressLegacy: false                                 │
│    currentCard: null                                     │
└─────────────────────────────────────────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │   showVote() called   │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │  Check if TV exists   │
            └───────────────────────┘
                        │
            ┌───────────┴───────────┐
            ↓                       ↓
    ┌──────────────┐       ┌──────────────┐
    │   TV Found   │       │ TV Missing   │
    └──────────────┘       └──────────────┘
            │                       │
            ↓                       ↓
    ┌──────────────┐       ┌──────────────┐
    │ Clear exist- │       │   Fallback   │
    │ ing display  │       │ to showCard  │
    └──────────────┘       └──────────────┘
            │                       │
            ↓                       │
    ┌──────────────┐               │
    │ Purge legacy │               │
    │  artifacts   │               │
    └──────────────┘               │
            │                       │
            ↓                       │
    ┌──────────────┐               │
    │ Set active = │               │
    │    true      │               │
    └──────────────┘               │
            │                       │
            ↓                       │
    ┌──────────────┐               │
    │ Add body cls │               │
    │ vote-modal-  │               │
    │   active     │               │
    └──────────────┘               │
            │                       │
            ↓                       │
    ┌──────────────┐               │
    │ Create modal │               │
    │ with avatars │               │
    └──────────────┘               │
            │                       │
            ↓                       │
    ┌──────────────┐               │
    │ Set timeout  │               │
    │ for auto-    │               │
    │   clear      │               │
    └──────────────┘               │
            │                       │
            └───────────┬───────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │   Display complete    │
            └───────────────────────┘
                        │
            ┌───────────┴───────────┐
            ↓                       ↓
    ┌──────────────┐       ┌──────────────┐
    │  Timeout     │       │   Manual     │
    │  expires     │       │  clear()     │
    └──────────────┘       └──────────────┘
            │                       │
            └───────────┬───────────┘
                        ↓
            ┌───────────────────────┐
            │   clear() called      │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │ Clear timeout         │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │ Remove card from DOM  │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │ Remove body class     │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │ Set active = false    │
            └───────────────────────┘
                        │
                        ↓
            ┌───────────────────────┐
            │   Ready for next vote │
            └───────────────────────┘
```

## Eviction Type Flows

### Single Eviction
```
startLiveVote()
    │
    ├─ Initialize eviction state
    ├─ Pre-plan AI votes
    ├─ Render vote panel
    │
    └─ beginDiaryRoomSequence()
        │
        ├─ For each voter (3-5 voters typically):
        │   │
        │   ├─ VoteDisplayManager.showVote(voter, target, msg, 2600ms)
        │   ├─ Wait 2600ms
        │   └─ Update tally
        │
        └─ revealVotes()
            │
            ├─ VoteDisplayManager.clear()
            ├─ Calculate winner
            └─ Show result card
```

### Double Eviction
```
startLiveVote() [with __twistMode='double']
    │
    └─ beginDiaryRoomSequence()
        │
        ├─ For each voter:
        │   ├─ VoteDisplayManager.showVote(voter, target, msg, 2600ms)
        │   ├─ Wait 2600ms
        │   └─ Update tally
        │
        └─ multiEvictFinalize([evicted1, evicted2], counts, K=2)
            │
            ├─ VoteDisplayManager.clear()
            ├─ VoteDisplayManager.clearLegacyArtifacts()
            ├─ Process evictions (assign ranks)
            ├─ Show result card: "Double Eviction: Name1, Name2"
            └─ Run visual animations
```

### Triple Eviction
```
startLiveVote() [with __twistMode='triple']
    │
    ├─ Optional: lv2.initTriple() for 3-nominee UI
    │   └─ Shows selection interface
    │
    └─ beginDiaryRoomSequence()
        │
        ├─ For each voter:
        │   ├─ VoteDisplayManager.showVote(voter, target, msg, 2600ms)
        │   ├─ Wait 2600ms
        │   └─ Update tally
        │
        └─ multiEvictFinalize([ev1, ev2, ev3], counts, K=3)
            │
            ├─ VoteDisplayManager.clear()
            ├─ VoteDisplayManager.clearLegacyArtifacts()
            ├─ Process evictions (assign ranks by vote count)
            ├─ Show result card: "Triple Eviction: N1, N2, N3"
            └─ Run visual animations sequentially
```

## CSS Body Class Flow

```
Vote Display Active:
┌───────────────────────────────────────────────────┐
│ <body class="vote-modal-active">                  │
│   │                                                │
│   ├─ #legacyVotePanel { display: none; }         │
│   ├─ .lv-rollout-overlay { display: none; }      │
│   ├─ .lv-overlay { display: none; }              │
│   │                                                │
│   └─ #tvOverlay { z-index: 1000; }               │
│       └─ .diaryRoomCard (VISIBLE)                 │
│           ├─ Voter Avatar → Target Avatar         │
│           └─ Vote Message                          │
└───────────────────────────────────────────────────┘

Vote Display Cleared:
┌───────────────────────────────────────────────────┐
│ <body> (no vote-modal-active class)               │
│   │                                                │
│   ├─ #legacyVotePanel { display: block; }        │
│   ├─ .lv-rollout-overlay { display: block; }     │
│   ├─ .lv-overlay { display: block; }             │
│   │                                                │
│   └─ #tvOverlay { z-index: auto; }               │
│       └─ (empty)                                   │
└───────────────────────────────────────────────────┘
```

## Artifact Cleanup Process

```
clearLegacyArtifacts()
    │
    ├─ 1. Find all .revealCard elements
    │   │
    │   └─ Filter: textContent.includes('Diary Room')
    │       AND NOT classList.contains('diaryRoomCard')
    │       │
    │       └─ Remove each matching card
    │
    ├─ 2. Check LiveVoteOverlay
    │   │
    │   ├─ If LiveVoteOverlay.isOpen() === true
    │   │   └─ Call LiveVoteOverlay.hide()
    │   │
    │   └─ Else: skip (not conflicting)
    │
    └─ 3. Preserve LiveVoteRollout
        └─ Only hide if explicitly showing AND
            about to show vote modal (not during sequence)
```

## Fallback Behavior

```
VoteDisplayManager.showVote()
    │
    ├─ Check: TV element exists?
    │   │
    │   ├─ NO ──────────────────────────┐
    │   │                                 │
    │   └─ YES                            │
    │       │                             │
    │       ├─ Check: Player objects?    │
    │       │   │                         │
    │       │   ├─ NO ─────────────────┐ │
    │       │   │                       │ │
    │       │   └─ YES                  │ │
    │       │       │                   │ │
    │       │       └─ Create modal ────┼─┼─ Success Path
    │       │                           │ │
    │       └───────────────────────────┘ │
    │                                     │
    └─────────────────────────────────────┘
                    │
                    ↓
            Fallback Path:
            │
            ├─ Log: "[VoteDisplayManager] Using fallback"
            │
            ├─ Call: global.showCard(
            │           'Diary Room',
            │           [message],
            │           'live',
            │           duration,
            │           true
            │         )
            │
            └─ Return (graceful degradation)
```

## Configuration Flow

```
Game Initialization
    │
    ├─ Load config from localStorage
    │   └─ js/config/defaults.js
    │
    ├─ Merge with DEFAULT_CFG
    │   └─ voteModalMs: 2600 (default)
    │
    └─ Store in window.game.cfg
        │
        └─ Available to VoteDisplayManager
            │
            ├─ Used as default duration
            │   if not specified in showVote()
            │
            └─ User can customize:
                window.game.cfg.voteModalMs = 3000;
```

## Testing Flow

```
test_unified_voting_ui.html
    │
    ├─ Test 1: Basic Vote Display
    │   └─ Call: showDiaryRoomWithAvatars(1, 2, msg, 3000)
    │       └─ Verify: Modal appears with avatars
    │
    ├─ Test 2: Sequential Votes
    │   └─ Loop: Show 3 votes with 2.8s intervals
    │       └─ Verify: Each replaces previous cleanly
    │
    ├─ Test 3: Fallback Mode
    │   └─ Hide TV element, trigger vote
    │       └─ Verify: global.showCard called
    │
    ├─ Test 4: Artifact Cleanup
    │   ├─ Create legacy 'Diary Room' cards
    │   ├─ Call: showDiaryRoomWithAvatars()
    │   └─ Verify: Legacy cards removed
    │
    └─ Test 5: State Management
        ├─ Show vote with 5s duration
        ├─ Check: body.vote-modal-active === true
        ├─ Check: #tvOverlay has content
        └─ Wait: Verify auto-clear after 5s
```

## Summary

The unified voting UI system provides:

1. **Single Source of Truth** - VoteDisplayManager controls all vote displays
2. **Automatic Cleanup** - Legacy artifacts purged before each display
3. **Consistent Experience** - Same modal style across all eviction types
4. **Graceful Degradation** - Fallback to legacy cards when needed
5. **State Management** - Body class prevents UI conflicts
6. **Configurable Timing** - Adjustable display duration
7. **Backward Compatible** - All legacy functions preserved

This eliminates duplicate cards and provides a clean, unified voting experience across single, double, and triple evictions.
