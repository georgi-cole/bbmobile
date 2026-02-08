# Eviction Modal - Before and After Visualization

## Architecture Change

### BEFORE: Viewport-Level Modal
```
┌─────────────────────────────────────┐
│         Browser Viewport            │
│                                     │
│  ┌──────────────────────────────┐  │
│  │      Modal Overlay Layer     │  │ ← position: fixed
│  │      (z-index: 9000)         │  │ ← Covers entire viewport
│  │                              │  │
│  │    ┌──────────────────┐      │  │
│  │    │ Eviction Result  │      │  │
│  │    │                  │      │  │
│  │    │ Vote: 7 to 2     │      │  │
│  │    │ Alice evicted    │      │  │
│  │    └──────────────────┘      │  │
│  │                              │  │
│  └──────────────────────────────┘  │
│                                     │
│           TV Container              │
│     ┌─────────────────────┐         │
│     │    [TV Content]     │         │ ← Behind modal
│     │                     │         │
│     └─────────────────────┘         │
└─────────────────────────────────────┘
```

### AFTER: Inline TV Modal
```
┌─────────────────────────────────────┐
│         Browser Viewport            │
│                                     │
│           TV Container              │
│     ┌─────────────────────┐         │
│     │    .tvViewport      │         │ ← Modal parent
│     │                     │         │
│     │  ┌───────────────┐  │         │
│     │  │Eviction Modal │  │         │ ← position: absolute
│     │  │ (z-index:100) │  │         │ ← Within TV only
│     │  │               │  │         │
│     │  │ 🔴 EVICTION  │  │         │
│     │  │   RESULT     │  │         │
│     │  │               │  │         │
│     │  │ Votes: 7 - 2 │  │         │
│     │  │ ALICE        │  │         │
│     │  │ EVICTED      │  │         │
│     │  └───────────────┘  │         │
│     │                     │         │
│     └─────────────────────┘         │
│                                     │
└─────────────────────────────────────┘
```

## Visual Effects Comparison

### BEFORE: Simple Modal
```
╔═══════════════════════╗
║   Eviction Result     ║
║                       ║
║ By a vote of 7 to 2,  ║
║ Alice, you have been  ║
║ evicted.              ║
║                       ║
║         [×]           ║
╚═══════════════════════╝

- Simple border
- Basic fade-in
- Plain text
- Standard font sizes
```

### AFTER: Dramatic Modal
```
    ⠀⠀⠀✨ 💫 ✨⠀⠀⠀
  ┏━━━━━━━━━━━━━━━━━┓
  ┃ 🔴 ⟦ GLOW ⟧ 🔴  ┃  ← Pulsing spotlight
╔═╩═══════════════════╩═╗
║  🔥 EVICTION RESULT 🔥 ║  ← Large uppercase, animated glow
║                        ║
║ ┌──────────┬──────────┐║
║ │ VOTES TO │ VOTES TO ││  ← Glowing boxes
║ │  EVICT   │   KEEP   ││
║ │    7     │    2     ││  ← 2.5rem glowing numbers
║ └──────────┴──────────┘║
║                        ║
║     ✨ ALICE ✨        ║  ← 2rem name, pop animation
║   ⚡ YOU HAVE BEEN ⚡  ║
║      🔴 EVICTED 🔴     ║
║                        ║
║  💥 💥 💥 💥 💥 💥    ║  ← Particle burst
╚════════════════════════╝
  ┗━━━━━━━━━━━━━━━━━┛
    ⠀⠀⠀✨ 💫 ✨⠀⠀⠀

Features:
- Glowing red border (60px glow)
- Pulsing spotlight behind
- Radial vignette backdrop
- 12px blur with saturation
- 3D entrance (rotation + bounce)
- Multiple glow animations
- Particle burst effect
- Enhanced typography
```

## Animation Timeline

```
Time:   0ms     400ms    2000ms   2200ms   4000ms
        │       │        │        │        │
        │       │        │        │        │
Modal:  [Fade in + Blur]─────────────────────[Fade out]
        │                │        │
        └─[Card enters]──┘        │
         (3D rotation)            │
                                  │
Votes:  ────────────[Count up]───┘
        │                         │
        └─────────────────────────┘
                                  └─[Name reveal + Particles]
                                     (Pop + Blur → Sharp)
```

## Glow Effect Details

### Pulsing Intensity (2-3s cycles)

```
Brightness
    100% ╭─────╮       ╭─────╮
         │     │       │     │
     80% │     │       │     │
         │     │       │     │
     60% ╯     ╰───────╯     ╰───
         0s   1.5s  3s   4.5s  6s
         
Effects that pulse:
- Title glow
- Vote count glow  
- Name glow
- Backdrop blur
- Spotlight size
```

## Mobile Responsiveness

### Desktop (>640px)
```
┌──────────────────────────┐
│     TV Viewport          │
│   ┌──────────────────┐   │
│   │   Modal (420px)  │   │
│   │   90% width max  │   │
│   │                  │   │
│   └──────────────────┘   │
│                          │
└──────────────────────────┘
```

### Mobile (≤640px)
```
┌───────────────┐
│  TV Viewport  │
│ ┌───────────┐ │
│ │   Modal   │ │
│ │  (92%)    │ │
│ │           │ │
│ │ Smaller   │ │
│ │ fonts     │ │
│ └───────────┘ │
└───────────────┘
```

## Accessibility: Reduced Motion

When user has `prefers-reduced-motion: reduce`:

```
DISABLED:
❌ Card entrance 3D rotation
❌ Title glow animation
❌ Vote count glow animation
❌ Name glow animation
❌ Backdrop pulse
❌ Spotlight pulse
❌ Particle burst
❌ Name reveal pop

ADJUSTED:
✓ Font sizes reduced:
  - Vote count: 2.5rem → 2rem
  - Name: 2rem → 1.5rem
✓ Static fade only (no blur animation)
✓ All visual information preserved
✓ Modal still centered and visible
```

## Z-Index Stack

```
Layer                         Z-Index
──────────────────────────────────────
Eviction Modal (inline)       100
─────────────────────────────────────
Confetti canvas                11
#tvOverlay                     12
#tvNow (status bar)            13
─────────────────────────────────────
TV Viewport content             auto
──────────────────────────────────────
```

## CSS Property Comparison

| Property              | Before          | After           |
|-----------------------|-----------------|-----------------|
| Position              | fixed           | absolute        |
| Z-index               | 9000            | 100             |
| Container             | document.body   | .tvViewport/#tv |
| Backdrop blur         | 8px             | 12px            |
| Border                | 1px white       | 2px red glow    |
| Box-shadow layers     | 3               | 5               |
| Animation duration    | 0.3s            | 0.5s            |
| Title font-size       | 1.5rem          | 1.75rem         |
| Title text-transform  | none            | uppercase       |
| Vote count size       | N/A             | 2.5rem          |
| Name size             | N/A             | 2rem            |
| Particle effects      | N/A             | Yes (30 particles) |
| 3D transforms         | No              | Yes             |

## Integration with TV System

The modal now respects the TV's containment:
- Positioned relative to `.tvViewport` 
- Does not escape TV boundaries
- Appears "on screen" as part of the TV experience
- Z-index is high enough to cover TV content but stays within TV
- More thematically appropriate for "House Network Live" broadcast

## Performance Considerations

- `backdrop-filter` may be GPU-intensive on some devices
- Reduced motion mode disables all animations for performance
- Particle effects limited to 30 elements
- Animations use `transform` and `opacity` (GPU-accelerated)
- No layout thrashing (position is absolute, not changing dimensions)
