# Overlay Fix - Visual Guide

## Problem: Overlay Blocking Clicks

### Before Fix - The Problem Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ HOH Competition Phase                                           │
│                                                                 │
│  ✓ Competition completes                                       │
│  ✓ Winner determined                                           │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Nominations Phase (Human HOH - Fallback Flow)                  │
│                                                                 │
│  1. ensureOverlayHost() called                                 │
│     - Creates #tvOverlay with:                                 │
│       • display: flex                                          │
│       • pointer-events: auto  ← PROBLEM: Interactive!         │
│       • z-index: 999                                           │
│                                                                 │
│  2. Shows "NOMINATE" button card                               │
│  3. User clicks NOMINATE                                       │
│  4. Fullscreen selector opens                                  │
│  5. User selects nominees                                      │
│  6. Fullscreen selector closes                                 │
│                                                                 │
│  ❌ #tvOverlay still exists with pointer-events: auto!         │
│  ❌ No cleanup performed!                                       │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Veto Competition Phase                                          │
│                                                                 │
│  #tvOverlay still present:                                      │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Invisible Overlay (z-index: 999, pointer-events: auto)  │  │
│  │                                                          │  │
│  │   ❌ Blocks ALL clicks                                   │  │
│  │                                                          │  │
│  │   [ Play ] ← Click doesn't reach button                 │  │
│  │   [ Rules ] ← Click doesn't reach button                │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  User Experience:                                               │
│  - Buttons appear normal                                        │
│  - Clicks do nothing                                            │
│  - No visual feedback                                           │
│  - Game appears frozen                                          │
└─────────────────────────────────────────────────────────────────┘
```

### After Fix - The Solution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ HOH Competition Phase                                           │
│                                                                 │
│  ✓ Competition completes                                       │
│  ✓ Winner determined                                           │
│  ✓ Phase cleanup runs (cleanupStaleOverlayOnPhaseChange)      │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Nominations Phase (Human HOH - Fallback Flow)                  │
│                                                                 │
│  1. ensureOverlayHost() called                                 │
│     - Creates #tvOverlay with:                                 │
│       • display: none  ← NEW: Hidden by default               │
│       • pointer-events: none  ← NEW: Non-interactive          │
│       • data-fallback: "true"  ← NEW: Marked for cleanup      │
│       • z-index: 999                                           │
│                                                                 │
│  2. activateTvOverlay() called  ← NEW: Explicit activation    │
│     - Adds .tv-active class                                    │
│     - Sets pointer-events: auto                                │
│     - Overlay now visible and interactive                      │
│                                                                 │
│  3. Shows "NOMINATE" button card                               │
│  4. User clicks NOMINATE                                       │
│                                                                 │
│  5. deactivateTvOverlay() called  ← NEW: Cleanup              │
│     - Removes .tv-active class                                 │
│     - Sets pointer-events: none                                │
│     - Sets display: none                                       │
│                                                                 │
│  6. Fullscreen selector opens                                  │
│  7. User selects nominees                                      │
│  8. Fullscreen selector closes                                 │
│                                                                 │
│  9. finalizeNoms() ceremony runs                               │
│  10. deactivateTvOverlay() called again  ← NEW: Final cleanup │
│                                                                 │
│  ✓ #tvOverlay exists but is inert (display:none, no clicks)   │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Phase Transition to Veto Competition                            │
│                                                                 │
│  setPhase('veto_comp') called                                  │
│                                                                 │
│  1. cleanupStaleOverlayOnPhaseChange() runs  ← NEW: Safety net │
│                                                                 │
│     If overlay has data-fallback="true":                       │
│       → Remove overlay entirely                                │
│                                                                 │
│     Otherwise:                                                  │
│       → Remove .tv-active class                                │
│       → Set pointer-events: none                               │
│       → Set display: none                                      │
│                                                                 │
│  ✓ Any lingering overlay is neutralized                        │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Veto Competition Phase                                          │
│                                                                 │
│  No blocking overlay present                                    │
│                                                                 │
│   [ Play ] ← Clicks work normally ✓                            │
│   [ Rules ] ← Clicks work normally ✓                           │
│                                                                 │
│  User Experience:                                               │
│  ✓ Buttons respond to clicks                                   │
│  ✓ Normal interaction                                           │
│  ✓ Game works as expected                                      │
└─────────────────────────────────────────────────────────────────┘
```

## Overlay State Diagram

```
                    ┌──────────────────┐
                    │   DOM Empty      │
                    │ (no #tvOverlay)  │
                    └────────┬─────────┘
                             │
                             │ ensureOverlayHost()
                             ↓
                    ┌──────────────────┐
                    │   Created        │
                    │                  │
                    │ display: none    │
                    │ pointer: none    │
                    │ data-fallback    │
                    └────────┬─────────┘
                             │
                             │ activateTvOverlay()
                             ↓
          ┌─────────────────────────────────┐
          │         Active                  │
          │                                 │
          │ .tv-active class added          │
          │ pointer-events: auto            │
          │                                 │
          │ User can see and click overlay  │
          └────────┬────────────────────────┘
                   │
                   │ deactivateTvOverlay()
                   ↓
          ┌─────────────────────────────────┐
          │       Deactivated               │
          │                                 │
          │ .tv-active removed              │
          │ pointer-events: none            │
          │ display: none                   │
          │                                 │
          │ Overlay inert (can't block)     │
          └────────┬────────────────────────┘
                   │
                   │ Phase transition to competition
                   │ cleanupStaleOverlayOnPhaseChange()
                   ↓
          ┌─────────────────────────────────┐
          │   Cleaned Up                    │
          │                                 │
          │ If data-fallback="true":        │
          │   → Removed from DOM            │
          │                                 │
          │ Otherwise:                      │
          │   → Stays deactivated           │
          └─────────────────────────────────┘
```

## Three Layers of Defense

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1: CSS Defaults (overrides-fixes.css)                    │
│                                                                 │
│  #tvOverlay {                                                   │
│    display: none;           ← Hidden by default               │
│    pointer-events: none;    ← Can't intercept clicks          │
│  }                                                              │
│                                                                 │
│  #tvOverlay.tv-active {                                         │
│    display: grid;           ← Only visible when active        │
│  }                                                              │
│                                                                 │
│  Purpose: Fail-safe baseline - overlay is inert by default     │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2: Explicit Lifecycle (nominations.js, veto.js)          │
│                                                                 │
│  Modules must explicitly manage overlay state:                 │
│                                                                 │
│  1. Before showing content:                                     │
│     activateTvOverlay()                                        │
│       → Adds .tv-active class                                  │
│       → Sets pointer-events: auto                              │
│                                                                 │
│  2. After hiding content:                                       │
│     deactivateTvOverlay() or releaseTVOverlay()               │
│       → Removes .tv-active class                               │
│       → Sets pointer-events: none                              │
│       → Sets display: none                                     │
│                                                                 │
│  Purpose: Clear intent - forces developers to think about      │
│           when overlay should be interactive                    │
└─────────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3: Phase Transition Cleanup (ui.hud-and-router.js)       │
│                                                                 │
│  Automatic cleanup before every phase:                          │
│                                                                 │
│  setPhase(newPhase) {                                          │
│    cleanupStaleOverlayOnPhaseChange(newPhase);                │
│                                                                 │
│    if (competitionPhase) {                                      │
│      if (overlay.data-fallback === "true") {                   │
│        overlay.remove();  // Remove fallback overlays          │
│      } else {                                                   │
│        deactivate();      // Neutralize existing overlays      │
│      }                                                          │
│    }                                                            │
│    // ... rest of phase init                                   │
│  }                                                              │
│                                                                 │
│  Purpose: Safety net - even if a module forgets to clean up,   │
│           phase transition catches it                           │
└─────────────────────────────────────────────────────────────────┘

Result: Overlay can NEVER block clicks in competition phases
```

## Activation Flow Example

```
User Action: "Click NOMINATE button"
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│ nominations.js - renderNomsPanel()                              │
│                                                                 │
│  const host = ensureOverlayHost();                             │
│  │                                                              │
│  │  ┌──────────────────────────────────────────────────────┐  │
│  │  │ ensureOverlayHost()                                  │  │
│  │  │                                                      │  │
│  │  │  1. Check if #tvOverlay exists                      │  │
│  │  │  2. If not, create with:                            │  │
│  │  │     - display: none                                 │  │
│  │  │     - pointer-events: none                          │  │
│  │  │     - data-fallback: "true"                         │  │
│  │  │  3. Return overlay element                          │  │
│  │  └──────────────────────────────────────────────────────┘  │
│  │                                                              │
│  ↓                                                              │
│  activateTvOverlay();                                          │
│  │                                                              │
│  │  ┌──────────────────────────────────────────────────────┐  │
│  │  │ activateTvOverlay()                                  │  │
│  │  │                                                      │  │
│  │  │  1. Get #tvOverlay                                  │  │
│  │  │  2. Add .tv-active class                            │  │
│  │  │  3. Set pointer-events: auto                        │  │
│  │  │  4. Log: "TV overlay activated"                     │  │
│  │  └──────────────────────────────────────────────────────┘  │
│  │                                                              │
│  ↓                                                              │
│  host.innerHTML = '';  // Clear old content                    │
│  // ... create and append nomination card ...                  │
│                                                                 │
│  Result: Overlay visible, interactive, shows card              │
└─────────────────────────────────────────────────────────────────┘
     │
     ↓
User sees card and clicks NOMINATE
     │
     ↓
┌─────────────────────────────────────────────────────────────────┐
│ nominations.js - NOMINATE click handler                         │
│                                                                 │
│  host.innerHTML = '';  // Clear card                           │
│  deactivateTvOverlay();                                        │
│  │                                                              │
│  │  ┌──────────────────────────────────────────────────────┐  │
│  │  │ deactivateTvOverlay()                                │  │
│  │  │                                                      │  │
│  │  │  1. Get #tvOverlay                                  │  │
│  │  │  2. Remove .tv-active class                         │  │
│  │  │  3. Set pointer-events: none                        │  │
│  │  │  4. Set display: none                               │  │
│  │  │  5. Log: "TV overlay deactivated"                   │  │
│  │  └──────────────────────────────────────────────────────┘  │
│  │                                                              │
│  ↓                                                              │
│  NomsFS.open();  // Open fullscreen selector                   │
│                                                                 │
│  Result: Overlay hidden, non-interactive, won't block clicks   │
└─────────────────────────────────────────────────────────────────┘
```

## Comparison: Before vs After

### Before Fix

| Phase | Overlay State | User Experience |
|-------|---------------|----------------|
| HOH | Not present | ✓ Normal |
| Nominations | Created with `pointer-events: auto` | ✓ Normal (during ceremony) |
| After Noms | **Still active** `pointer-events: auto` | ⚠️ May work (if no overlay visible) |
| Veto Competition | **Still active** `pointer-events: auto` | ❌ Buttons don't respond |
| Veto Ceremony | **Still active** `pointer-events: auto` | ❌ Buttons don't respond |

### After Fix

| Phase | Overlay State | User Experience |
|-------|---------------|----------------|
| HOH | Not present OR deactivated from cleanup | ✓ Normal |
| Nominations | Activated during ceremony only | ✓ Normal |
| After Noms | Deactivated `pointer-events: none` | ✓ Normal |
| Veto Competition | Cleaned up OR deactivated | ✓ Normal - buttons work |
| Veto Ceremony | Activated only when showing cards | ✓ Normal |

## Key Improvements

1. **Default Safety**: Overlay can't block clicks unless explicitly activated
2. **Clear Lifecycle**: activation → use → deactivation pattern is explicit
3. **Phase Safety**: Automatic cleanup prevents cross-phase pollution
4. **Traceable**: Console logs show when overlay is activated/deactivated
5. **Fail-Safe**: Multiple cleanup points ensure overlay can't stay active accidentally

## Visual Test Scenarios

### Scenario 1: Normal Flow (Human HOH)
```
Start → HOH comp → [Cleanup] → Nominations (activate → show → deactivate) 
  → [Cleanup] → Veto comp (no blocking) ✓
```

### Scenario 2: AI HOH Flow
```
Start → HOH comp → [Cleanup] → Nominations (activate → auto-pick → deactivate) 
  → [Cleanup] → Veto comp (no blocking) ✓
```

### Scenario 3: Fallback Overlay Cleanup
```
Nominations creates fallback overlay (data-fallback="true")
  → Deactivated after use
  → Phase change to veto_comp
  → [Cleanup removes fallback overlay entirely] ✓
```

### Scenario 4: Multiple Phase Transitions
```
HOH → [Cleanup] → Noms → [Cleanup] → Veto → [Cleanup] → Ceremony → [Cleanup]
     ↑              ↑              ↑              ↑
     Each cleanup ensures overlay won't block next phase
```
