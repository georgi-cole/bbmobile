# Jury Vote UI Refactor - Visual Flow Guide

This document describes the complete visual flow of the new jury vote reveal UI.

## 🎬 Complete Flow Sequence

### Phase 1: Jury Casting (Silent Voting)
**Duration**: ~0.8s per juror  
**Display**: Juror banter without revealing picks  
**UI State**: Finalist cards shown, vote counts at 0

```
┌─────────────────────────────────────┐
│   TV Screen (Jury Casting Phase)    │
├─────────────────────────────────────┤
│                                     │
│  [Finalist A]      [Finalist B]     │
│   Avatar: 👤        Avatar: 👤       │
│   Name: Alice       Name: Bob       │
│   Votes: 0          Votes: 0        │
│                                     │
└─────────────────────────────────────┘
```

**Console Logs**:
```
[juryCast] start
[juryCast] vote juror=charlie stored
[juryCast] vote juror=diana stored
...
[juryCast] complete
```

---

### Phase 2: Jury Reveal - Vote Sequence
**Duration**: Variable (5.4s-12s per juror, tripled from original)  
**Display**: Stacking vote bubbles + live tally updates

#### Step 1: First Vote Reveals
```
┌─────────────────────────────────────┐
│   TV Screen (Jury Reveal Phase)     │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Charlie: I'm voting for     │    │ ← Vote Bubble 1 (newest)
│  │ the strategic player        │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Finalist A]      [Finalist B]     │
│   Avatar: 👤        Avatar: 👤       │
│   Name: Alice       Name: Bob       │
│   Votes: 1 ✨       Votes: 0        │
│   (pulsing)                         │
└─────────────────────────────────────┘
```

**Features**:
- ✅ Bubble appears at top (newest)
- ✅ Vote count increments (+1)
- ✅ Winning slot gets glow effect (`.fo-leader`)
- ✅ Pulse animation on vote land (`.fo-pulse`)

#### Step 2: Bubbles Accumulate (Max 3)
```
┌─────────────────────────────────────┐
│   TV Screen (Multiple Votes)        │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Eve: I respect the social   │    │ ← Bubble 3 (newest)
│  │ game                        │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Diana: My vote goes to who  │    │ ← Bubble 2
│  │ played honestly             │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Charlie: I'm voting for     │    │ ← Bubble 1 (oldest, fading)
│  │ the strategic player        │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Finalist A]      [Finalist B]     │
│   Avatar: 👤        Avatar: 👤       │
│   Name: Alice       Name: Bob       │
│   Votes: 2 ✨       Votes: 1        │
└─────────────────────────────────────┘
```

**Features**:
- ✅ Max 3 bubbles visible
- ✅ Oldest bubble fades out after 3s
- ✅ New bubbles stack at top
- ✅ Live tally updates

#### Step 3: Final Votes & Suspense
```
┌─────────────────────────────────────┐
│   TV Screen (Final Juror)           │
├─────────────────────────────────────┤
│  ┌─────────────────────────────┐    │
│  │ Iris: I value consistent    │    │ ← Final vote
│  │ gameplay                    │    │
│  └─────────────────────────────┘    │
│                                     │
│  [Finalist A]      [Finalist B]     │
│   Avatar: 👤        Avatar: 👤       │
│   Name: Alice       Name: Bob       │
│   Votes: 3          Votes: 4 ✨     │
│                                     │
└─────────────────────────────────────┘
```

**Timing**: 9.0s suspense delay after final vote (tripled from 3s)

---

### Phase 3: Winner Reveal
**Duration**: 8s total (3s reveal + 5s smooth transition)  
**Display**: Crown drops, check card slides, ribbons appear

#### Frame 1: Placement Labels Appear (0.0s)
```
┌─────────────────────────────────────┐
│   TV Screen (Winner Reveal)         │
├─────────────────────────────────────┤
│                                     │
│ ┌─────────────┐   ┌─────────────┐  │
│ │ RUNNER-UP   │   │  WINNER     │  │ ← Ribbons
│ ├─────────────┤   ├─────────────┤  │
│ │   Avatar    │   │   Avatar    │  │
│ │   Alice     │   │   Bob       │  │
│ │   3 votes   │   │   4 votes   │  │
│ └─────────────┘   └─────────────┘  │
│                                     │
└─────────────────────────────────────┘
```

#### Frame 2: Crown Drops Above Winner (0.0s - 0.6s)
```
┌─────────────────────────────────────┐
│   TV Screen (Crown Animation)       │
├─────────────────────────────────────┤
│                       👑            │ ← Crown (animating)
│                       ↓             │    (drop + bounce)
│ ┌─────────────┐   ┌─────────────┐  │
│ │ RUNNER-UP   │   │  WINNER     │  │
│ ├─────────────┤   ├─────────────┤  │
│ │   Avatar    │   │   Avatar    │  │
│ │   Alice     │   │   Bob       │  │
│ │   3 votes   │   │   4 votes   │  │
│ └─────────────┘   └─────────────┘  │
└─────────────────────────────────────┘
```

**Animation Details**:
- Start: `opacity: 0, translateY(-20px), scale(0.5)`
- 60%: `translateY(3px), scale(1.1)` (overshoot/bounce)
- End: `opacity: 1, translateY(0), scale(1)`
- Duration: 0.6s
- Easing: ease-out

#### Frame 3: Crown Settled + Check Card Slides (0.5s - 1.3s)
```
┌─────────────────────────────────────┐
│   TV Screen (Check Animation)       │
├─────────────────────────────────────┤
│                       👑            │ ← Crown (settled)
│ ┌─────────────┐   ┌─────────────┐  │
│ │ RUNNER-UP   │   │  WINNER     │  │
│ ├─────────────┤   ├─────────────┤  │
│ │     ✓       │←  │   Avatar    │  │ ← Check slides in
│ │   (72px)    │   │   Bob       │  │
│ │   Alice     │   │   4 votes   │  │
│ └─────────────┘   └─────────────┘  │
└─────────────────────────────────────┘
```

**Animation Details**:
- Delay: 0.5s (after ribbon/crown)
- Start: `opacity: 0, translateX(-100%), scale(0.8)`
- End: `opacity: 1, translateX(0), scale(1)`
- Duration: 0.8s
- Easing: cubic-bezier(0.34, 1.56, 0.64, 1) (elastic)

#### Frame 4: Check Pulse (1.3s - 1.9s)
```
┌─────────────────────────────────────┐
│   TV Screen (Check Pulse)           │
├─────────────────────────────────────┤
│                       👑            │
│ ┌─────────────┐   ┌─────────────┐  │
│ │ RUNNER-UP   │   │  WINNER     │  │
│ ├─────────────┤   ├─────────────┤  │
│ │     ✓✨     │   │   Avatar    │  │ ← Check pulses
│ │  (scale up) │   │   Bob       │  │    (1.0 → 1.15 → 1.0)
│ │   Alice     │   │   4 votes   │  │
│ └─────────────┘   └─────────────┘  │
└─────────────────────────────────────┘
```

**Animation Details**:
- Delay: 1.3s (after slide-in)
- 0%: `scale(1)`
- 50%: `scale(1.15)` (enlarged)
- 100%: `scale(1)`
- Duration: 0.6s
- Easing: ease-in-out

#### Frame 5: Final State (1.9s - 8.0s)
```
┌─────────────────────────────────────┐
│   TV Screen (Winner Display)        │
├─────────────────────────────────────┤
│                       👑            │ ← Crown (static)
│ ┌─────────────┐   ┌─────────────┐  │
│ │ RUNNER-UP   │   │  WINNER     │  │ ← Ribbons (static)
│ ├─────────────┤   ├─────────────┤  │
│ │     ✓       │   │   Avatar    │  │ ← Check (static)
│ │             │   │   Bob       │  │
│ │   Alice     │   │   4 votes   │  │
│ │   3 votes   │   │             │  │
│ └─────────────┘   └─────────────┘  │
│                                     │
│  Bob has won the Big Brother game! │ ← Winner banner
└─────────────────────────────────────┘
```

**Display Duration**: 8 seconds total
- 3s initial reveal (labels, crown, check)
- 5s smooth transition buffer

---

### Phase 4: Transition to Public Favourite
**Duration**: ~1.2s transition  
**Display**: Smooth fade-out of jury tally, fade-in of modal

#### Step 1: Jury Tally Fade-Out (0.0s - 0.45s)
```
┌─────────────────────────────────────┐
│   TV Screen (Fading Out)            │
├─────────────────────────────────────┤
│         (opacity: 1 → 0)            │ ← Entire jury display
│              ↓                      │    fades out
│         (450ms fade)                │
│                                     │
│                                     │
└─────────────────────────────────────┘
```

**CSS**: `.fadeOutFast` class applied to `#juryGraphBox`

#### Step 2: Gap for Smoothness (0.45s - 0.75s)
```
┌─────────────────────────────────────┐
│   TV Screen (Empty)                 │
├─────────────────────────────────────┤
│                                     │
│         (300ms gap)                 │ ← Smooth transition buffer
│                                     │
│                                     │
└─────────────────────────────────────┘
```

#### Step 3: Public Favourite Fade-In (0.75s - 1.35s)
```
┌─────────────────────────────────────┐
│  Public Favourite Modal (Fading In) │
├─────────────────────────────────────┤
│  ┌───────────────────────────────┐  │
│  │ PUBLIC'S FAVOURITE PLAYER     │  │
│  ├───────────────────────────────┤  │ ← Modal fades in
│  │  [Player1] [Player2]          │  │   (600ms)
│  │    25%       25%              │  │
│  │  [Player3] [Player4]          │  │
│  │    25%       25%              │  │
│  └───────────────────────────────┘  │
└─────────────────────────────────────┘
```

**CSS**: 
```css
modalHost.style.opacity = '0';           // Start
modalHost.style.transition = 'opacity 0.6s ease-in-out';
// ... mount to DOM
modalHost.style.opacity = '1';           // Trigger fade-in
```

---

## 📱 Mobile Viewport (375x812)

### Responsive Scaling

```
┌───────────────────┐  iPhone (375x812)
│  👑 (32px)        │  ← Crown scaled down
│ ┌───────┐ ┌─────┐ │
│ │   ✓   │ │ 👤  │ │  ← Check (56px) + Avatar
│ │ Alice │ │ Bob │ │  ← Names
│ │   3   │ │  4  │ │  ← Votes
│ └───────┘ └─────┘ │
│                   │
│ ✓ Bubbles stack   │  ← Vote bubbles
│ ✓ Crown visible   │     (responsive font)
│ ✓ Check visible   │
└───────────────────┘
```

**Breakpoint**: `@media (max-width: 375px)`
- Crown: 42px → 32px
- Check: 72px → 56px
- Bubbles: `clamp(12px, 1.3vw, 16px)`

---

## ⚡ Performance Notes

### GPU Acceleration
All animations use only:
- `transform` (GPU-accelerated)
- `opacity` (GPU-accelerated)

No expensive properties animated:
- ❌ No `width`, `height`, `top`, `left`
- ❌ No `background-position`
- ❌ No `box-shadow` animation

### Frame Rate
- Target: 60fps
- Tested: ✅ Smooth on mobile (375x812)

---

## 🎨 Color Palette

### Vote Bubbles
- Background: `rgba(0,0,0,.65)` (semi-transparent dark)
- Border: `1px solid rgba(255,255,255,0.1)` (subtle white)
- Text: `#e8f9ff` (light blue)
- Juror name: `#ffdc8b` (gold)

### Crown
- Emoji: 👑 (U+1F451)
- Filter: `drop-shadow(0 4px 12px rgba(255,215,0,0.4))` (gold glow)

### Check Card
- Background: `linear-gradient(135deg, rgba(16,28,40,0.95), rgba(10,20,30,0.98))`
- Icon: ✓ (U+2713) white

### Ribbons
- Background: `rgba(0,0,0,.7)`
- Border: `1px solid rgba(255,255,255,.18)`
- Text: `#e9fcff`

---

## 🔧 CSS Classes Reference

| Class | Purpose | Animation |
|-------|---------|-----------|
| `.fo-belt` | Bubble container | - |
| `.fo-bubble` | Individual vote bubble | Fade + scale (300ms) |
| `.fo-bubble.show` | Visible state | opacity: 1, scale: 1 |
| `.fo-bubble.fo-statement` | Juror statement styling | - |
| `.fo-crown` | Winner crown | Drop + bounce (600ms) |
| `.fo-check-card` | Loser overlay | Slide-in (800ms) + delay (500ms) |
| `.fo-check-card .check-icon` | Check symbol | Pulse (600ms) + delay (1300ms) |
| `.fo-ribbon` | Placement label | - |
| `.fo-leader` | Winning finalist glow | Glow effect |
| `.fo-pulse` | Vote land animation | Pulse (600ms) |

---

**End of Visual Flow Guide**
