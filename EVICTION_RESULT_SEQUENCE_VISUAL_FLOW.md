# Eviction Result Sequence - Visual Flow Diagram

## Before This Implementation

```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  LV2 Overlay (z:14)               │ │
│  │                                   │ │
│  │  [Photo A]  [Photo B]            │ │
│  │  Count: 3   Count: 1             │ │
│  │                                   │ │
│  │  [Voter Feed]                    │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ❌ Eviction Result Card (z:12)   │ │
│  │    BEHIND THE NOMINEES!          │ │ <- PROBLEM: Card is behind
│  └───────────────────────────────────┘ │    nominees at z:14
│                                         │
└─────────────────────────────────────────┘
```

## After This Implementation

### Step 1: Begin Result Phase
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  LV2 Overlay (z:11) ← LOWERED    │ │
│  │  .below-cards                     │ │
│  │                                   │ │
│  │  [Photo A]  [Photo B]   ← FADED │ │
│  │  Count: 3   Count: 1    opacity:0│ │
│  │                                   │ │
│  │  [Voter Feed]          ← FADED  │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 2: Show Eviction Result Card
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  LV2 Overlay (z:11)              │ │
│  │                                   │ │
│  │  [Photo A]  [Photo B]   (faded) │ │
│  │  [Voter Feed]           (faded) │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │ ✅ Eviction Result Card (z:12)   │ │
│  │                                  │ │ <- SUCCESS: Card is now
│  │  By a vote of 3 to 1,           │ │    ABOVE nominees at z:11!
│  │  Alex, you have been evicted.   │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 3: End Result Phase
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  LV2 Overlay (z:14) ← RESTORED   │ │
│  │  .above-cards                     │ │
│  │                                   │ │
│  │  [Photo A]  [Photo B]   (faded) │ │
│  │  [Voter Feed]           (faded) │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 4: Show Final Evictee Portrait
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  LV2 Overlay (z:14)              │ │
│  │  (nominees still faded)          │ │
│  └───────────────────────────────────┘ │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Evictee Visual (z:15)           │ │
│  │                                   │ │
│  │         ┌──────────┐             │ │
│  │         │          │             │ │
│  │         │  [Alex]  │   ← COLOR  │ │
│  │         │          │             │ │
│  │         └──────────┘             │ │
│  │           Alex                    │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 5: Black & White Animation
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Evictee Visual (z:15)           │ │
│  │                                   │ │
│  │         ┌──────────┐             │ │
│  │         │▓▓▓▓▓▓▓▓▓▓│             │ │
│  │         │▓▓[Alex]▓▓│   ← B&W    │ │
│  │         │▓▓▓▓▓▓▓▓▓▓│   2s trans │ │
│  │         └──────────┘             │ │
│  │           Alex                    │ │
│  └───────────────────────────────────┘ │
│                                         │
└─────────────────────────────────────────┘
```

### Step 6: Fade Out & End
```
┌─────────────────────────────────────────┐
│           TV Container (z:10)           │
│                                         │
│                                         │
│              (clean slate)              │
│                                         │
│         Week ends, cleanup done         │
│                                         │
│                                         │
└─────────────────────────────────────────┘
```

## Z-Index Stack Diagram

```
┌─────────────────────────────────────────┐
│              Z-Index Stack              │
├─────────────────────────────────────────┤
│                                         │
│  z:15 ┌─────────────────────────────┐  │ ← Final Evictee Portrait
│       │ .lv2-evictee                │  │   (Step 4-6)
│       └─────────────────────────────┘  │
│                                         │
│  z:14 ┌─────────────────────────────┐  │ ← LV2 Overlay (Normal)
│       │ .lv2-overlay.above-cards    │  │   (Voting, Step 3+)
│       │ [Nominees] [Voter Feed]     │  │
│       └─────────────────────────────┘  │
│                                         │
│  z:12 ┌─────────────────────────────┐  │ ← System Cards
│       │ #tvOverlay                  │  │   (Eviction Result Card)
│       │ [Reveal Cards] [Popups]     │  │
│       └─────────────────────────────┘  │
│                                         │
│  z:11 ┌─────────────────────────────┐  │ ← LV2 Overlay (Result Phase)
│       │ .lv2-overlay.below-cards    │  │   (Step 1-2 only)
│       │ [Faded Nominees/Feed]       │  │
│       └─────────────────────────────┘  │
│                                         │
│  z:10 ┌─────────────────────────────┐  │ ← TV Container
│       │ #tv (base container)        │  │
│       └─────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Timeline Visualization

```
┌────────────────────────────────────────────────────────────────┐
│                  Eviction Result Sequence Timeline             │
│                        (Total: ~9.2 seconds)                   │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  0s ──────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ beginResultCardPhase()                                 │
│      │ • Add .lv2-result-phase                               │
│      │ • Nominees/feed fade out (600ms)                      │
│      │ • Lower z-index (14 → 11)                             │
│      │                                                        │
│  0.6s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ showCard('Eviction Result', ...)                      │
│      │ • Card visible at z:12 (ABOVE nominees at z:11)       │
│      │ • Display for 3800ms                                  │
│      │                                                        │
│  4.4s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ endResultCardPhase()                                  │
│      │ • Restore z-index (11 → 14)                           │
│      │                                                        │
│  4.4s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ showEvicteeFinal({...})                               │
│      │ • Fade in portrait (900ms)                            │
│      │                                                        │
│  5.3s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ • Apply grayscale filter                              │
│      │ • B&W animation (2000ms transition)                   │
│      │                                                        │
│  7.3s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ • Hold B&W portrait (~1700ms)                         │
│      │                                                        │
│  9.0s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ • Fade out portrait (800ms)                           │
│      │                                                        │
│  9.8s ────────────────────────────────────────────────────────>│
│      ▲                                                         │
│      │ • Remove from DOM                                     │
│      │ • Cleanup complete                                    │
│      │ • Week ends                                           │
│                                                                │
└────────────────────────────────────────────────────────────────┘

** Reduced Motion: ~7-8 seconds total (shorter transitions, 60% duration)
```

## CSS Classes State Machine

```
                    ┌──────────────────┐
                    │   Initial State  │
                    │  No special CSS  │
                    └────────┬─────────┘
                             │
                   beginResultCardPhase()
                             │
                             ▼
                    ┌──────────────────┐
                    │  Result Phase    │
                    │                  │
                    │ .lv2-result-phase│ ← Fades nominees/feed
                    │ .below-cards     │ ← Lowers z-index
                    └────────┬─────────┘
                             │
                      Show Card (z:12)
                             │
                     Wait for card idle
                             │
                    endResultCardPhase()
                             │
                             ▼
                    ┌──────────────────┐
                    │  Portrait Phase  │
                    │                  │
                    │ .lv2-result-phase│ ← Still faded
                    │ .above-cards     │ ← Restored z-index
                    │                  │
                    │ + .lv2-evictee   │ ← New portrait element
                    └────────┬─────────┘
                             │
                   showEvicteeFinal()
                             │
                             ▼
                    ┌──────────────────┐
                    │  B&W Animation   │
                    │                  │
                    │ .lv2-evictee     │
                    │ .grayscale       │ ← Applied to portrait
                    └────────┬─────────┘
                             │
                       Fade out & remove
                             │
                             ▼
                    ┌──────────────────┐
                    │   Cleanup Done   │
                    │  No special CSS  │
                    └──────────────────┘
```

## Responsive Sizing

```
┌────────────────────────────────────────────────┐
│           Portrait Size (Responsive)           │
├────────────────────────────────────────────────┤
│                                                │
│  Small Mobile (< 600px):                      │
│  └─> 180px × 180px                            │
│      clamp(180px, 30vw, 280px)                │
│                                                │
│  Tablet (600-1000px):                         │
│  └─> ~200-240px                               │
│      30% of viewport width                    │
│                                                │
│  Desktop (> 1000px):                          │
│  └─> 280px × 280px (max)                      │
│      Clamped at maximum size                  │
│                                                │
│  Portrait Properties:                         │
│  • Circular (border-radius: 50%)              │
│  • Red border (4px solid rgba(255,107,107,.6))│
│  • Shadow effect for depth                    │
│  • Centered in TV container                   │
│                                                │
└────────────────────────────────────────────────┘
```

## Feature Flag Behavior

```
┌──────────────────────────────────────────────────┐
│         modernLiveVoteUI Feature Flag            │
├──────────────────────────────────────────────────┤
│                                                  │
│  Enabled (default):                              │
│  ├─> 2 Nominees: New sequence (lv2 mode)        │
│  │   └─> Result phase with z-index swap         │
│  │   └─> Final evictee portrait                 │
│  │                                               │
│  └─> 3+ Nominees: Legacy card only              │
│      (lv2 not used for multi-nominee)           │
│                                                  │
│  Disabled:                                       │
│  └─> All evictions: Legacy card only            │
│      (No result phase, no portrait)             │
│                                                  │
└──────────────────────────────────────────────────┘
```

## Key Implementation Details

### Fade Transition (nominees/feed)
```css
.lv2-result-phase .lv2-contestant,
.lv2-result-phase .lv2-voter-feed {
  opacity: 0;
  transition: opacity 0.6s ease-out;
  pointer-events: none;
}
```

### Z-Index Swap
```css
.lv2-overlay.above-cards { z-index: 14; }  /* Normal */
.lv2-overlay.below-cards { z-index: 11; }  /* Result phase */
```

### Black & White Filter
```css
.lv2-evictee-portrait.grayscale {
  filter: grayscale(100%) brightness(0.7);
  /* 2s transition (0.5s in reduced-motion) */
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  .lv2-evictee-portrait.grayscale {
    transition: filter 0.5s ease;  /* Faster */
  }
}
```

### Optional Chaining (JavaScript)
```javascript
global.lv2?.beginResultCardPhase?.();
// ↑ Safe even if lv2 is undefined or doesn't have the method
```

## Summary

This visual flow shows how the implementation:
1. **Solves the card obscurement problem** by temporarily lowering the overlay z-index
2. **Adds cinematic polish** with the centered evictee portrait and B&W animation
3. **Maintains clean state** throughout the sequence with proper z-index management
4. **Cleans up properly** after the sequence completes

The result is a professional, emotional, and technically sound eviction sequence that respects accessibility, performance, and user preferences.
