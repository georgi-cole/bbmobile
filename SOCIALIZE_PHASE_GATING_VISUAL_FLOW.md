# Socialize Launcher Phase Gating - Visual Flow Diagram

## Phase Transition Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    GAME PHASE CHANGES                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  setPhase(newPhase, seconds, callback)                          │
│  ├─ game.phase = newPhase                                       │
│  ├─ Cancel previous phase operations                            │
│  └─ Trigger phase hooks                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase Change Hook (NEW)                                        │
│  ├─ Check if Social Maneuvers enabled                           │
│  └─ Is new phase social_intermission or social?                 │
│     ├─ YES → SocializeMobile.show()                             │
│     │         + Ensure launcher visible                         │
│     │                                                            │
│     └─ NO  → SocializeMobile.hide()                             │
│               + Hide launcher                                   │
│               + SocializeMobile.closeModal()                    │
└─────────────────────────────────────────────────────────────────┘


## Launcher Visibility States

### State 1: Non-Social Phase (HOH, Nominations, Veto, etc.)
```
┌─────────────────────────────────────┐
│  TV Overlay                         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  [Socialize Launcher]         │  │  ◄── display: none
│  │  Hidden (display: none)       │  │      (Not visible to user)
│  └───────────────────────────────┘  │
│                                     │
│  Game content visible...            │
└─────────────────────────────────────┘
```

### State 2: Social Phase (social_intermission)
```
┌─────────────────────────────────────┐
│  TV Overlay                         │
│                                     │
│  ┌───────────────────────────────┐  │
│  │  Social Phase                 │  │  ◄── display: '' (visible)
│  │  ⚡5  🤝0  💡0         [?]     │  │
│  │  [Socialize Button]           │  │  ◄── Interactive
│  └───────────────────────────────┘  │
│                                     │
│  Social phase content...            │
└─────────────────────────────────────┘
```


## Modal Auto-Close Flow

```
USER IN SOCIAL PHASE
       │
       ▼
Opens Socialize Modal
       │
       ▼
┌──────────────────────┐
│  Socialize Modal     │
│  [Open & Active]     │
│                      │
│  Player Selection    │
│  Action Menu         │
│  Resources Display   │
└──────────────────────┘
       │
       ▼
PHASE CHANGES (e.g., to Nominations)
       │
       ▼
setPhase('nominations', ...)
       │
       ▼
Phase Hook Detects: NOT social phase
       │
       ▼
SocializeMobile.closeModal()
       │
       ▼
┌──────────────────────┐
│  Modal Closed        │  ◄── Auto-closed
│  Backdrop Removed    │      (No user action needed)
└──────────────────────┘
```


## Legacy Memory Popup Suppression

```
SOCIAL PHASE ENDS
       │
       ▼
generateSocialSummary()
       │
       ▼
┌─────────────────────────────────────┐
│  shouldShowLegacyMemories()         │
│  ├─ Is Social Maneuvers enabled?    │
│  │  └─ YES → return false           │
│  │                                   │
│  └─ Is USE_SOCIAL_MANEUVERS true?   │
│     └─ YES → return false           │
└─────────────────────────────────────┘
       │
       ▼
    false?
       │
       ├─ YES → Skip legacy popup ✓
       │         (Social Maneuvers handles summary)
       │
       └─ NO  → Show legacy popup
                (Fallback for legacy mode)
```


## MutationObserver Phase Gating

```
DOM CHANGE DETECTED
       │
       ▼
MutationObserver callback
       │
       ▼
┌─────────────────────────────────────┐
│  Check: isInSocialPhase()?          │
│  ├─ game.phase === 'social_inter...'│
│  └─ OR game.phase === 'social'      │
└─────────────────────────────────────┘
       │
       ▼
   In Social Phase?
       │
       ├─ YES → Check if launcher missing
       │         └─ Mount launcher if needed ✓
       │
       └─ NO  → Skip remounting ✗
                (Phase gate prevents mounting)
```


## Code Integration Points

### 1. socialize-mobile.js
```javascript
// New helper functions
function showLauncher() {
  launcher.style.display = '';  // Make visible
}

function hideLauncher() {
  launcher.style.display = 'none';  // Hide
}

function isInSocialPhase() {
  return phase === 'social_intermission' || phase === 'social';
}
```

### 2. ui.hud-and-router.js
```javascript
function setPhase(phase, seconds, onTimeout) {
  game.phase = phase;
  
  // NEW: Phase change hook
  if (SocialManeuvers?.isEnabled()) {
    if (phase === 'social_intermission' || phase === 'social') {
      SocializeMobile.show();  // Show launcher
    } else {
      SocializeMobile.hide();  // Hide launcher
      SocializeMobile.closeModal();  // Close modal
    }
  }
  
  // ... rest of setPhase logic
}
```

### 3. social.js
```javascript
function shouldShowLegacyMemories() {
  if (SocialManeuvers?.isEnabled()) return false;
  if (USE_SOCIAL_MANEUVERS === true) return false;
  return true;
}

function generateSocialSummary() {
  if (!shouldShowLegacyMemories()) {
    return;  // Skip legacy popup
  }
  // ... legacy popup code
}
```

### 4. social-maneuvers-launcher-bootstrap.js
```javascript
function mountIfMissing() {
  // NEW: Phase check
  const inSocialPhase = phase === 'social_intermission' || phase === 'social';
  if (!inSocialPhase) {
    return false;  // Don't mount
  }
  
  // ... mount logic
  SocializeMobile.show();  // Ensure visible
}
```


## Timeline of Events

```
Week 1, Day 1
════════════════════════════════════════════════════════════════

Opening Sequence
├─ Phase: 'opening'
└─ Launcher: Hidden ✗

HOH Competition
├─ Phase: 'hoh'
├─ setPhase() called → hide() → Launcher Hidden ✗
└─ User plays competition

Social Intermission
├─ Phase: 'social_intermission'
├─ setPhase() called → show() → Launcher Visible ✓
├─ User can click "Socialize" button
├─ Modal opens
├─ User performs social actions
└─ Legacy memory popup: Suppressed ✓

Nominations Phase
├─ Phase: 'nominations'
├─ setPhase() called → hide() + closeModal()
├─ Launcher Hidden ✗
├─ Modal Closed ✓
└─ User nominates players

Veto Competition
├─ Phase: 'veto_comp'
└─ Launcher: Hidden ✗

Live Vote
├─ Phase: 'livevote'
└─ Launcher: Hidden ✗

Eviction
├─ Phase: 'eviction'
└─ Launcher: Hidden ✗

Week 2, Day 1
────────────────────────────────────────────────────────────────
(Cycle repeats...)
```


## Error Handling

```
Phase Change Error Scenarios
═════════════════════════════════════════════════════════════

Scenario 1: Launcher Not Yet Created
├─ setPhase('social_intermission')
├─ show() called on null launcher
├─ Result: No-op (graceful)
└─ Launcher will be shown when created

Scenario 2: Social Maneuvers Disabled
├─ setPhase() hook checks isEnabled()
├─ Returns false
└─ Hook not executed (legacy behavior preserved)

Scenario 3: Rapid Phase Changes
├─ setPhase('social_intermission')
├─ show() called
├─ setPhase('nominations')  (immediate)
├─ hide() called
└─ Result: Final state correct (hidden)

Scenario 4: Modal Open During Phase Change
├─ User has modal open in social phase
├─ Phase changes to nominations
├─ closeModal() called automatically
└─ Result: Modal removed, backdrop removed
```


## Testing Matrix

```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│   Phase      │  Launcher    │    Modal     │   Legacy     │
│              │  Visibility  │  Behavior    │   Popup      │
├──────────────┼──────────────┼──────────────┼──────────────┤
│ lobby        │   Hidden ✗   │  N/A         │   N/A        │
│ opening      │   Hidden ✗   │  N/A         │   N/A        │
│ hoh          │   Hidden ✗   │  Closed      │   N/A        │
│ nominations  │   Hidden ✗   │  Closed      │   N/A        │
│ social       │   Visible ✓  │  Can Open    │  Suppressed  │
│ veto_comp    │   Hidden ✗   │  Closed      │   N/A        │
│ livevote     │   Hidden ✗   │  Closed      │   N/A        │
│ jury         │   Hidden ✗   │  Closed      │   N/A        │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

## Summary

✅ **Minimal Changes**: Only 4 files modified
✅ **Phase-Gated**: Launcher only visible in social phase
✅ **Auto-Close**: Modal closes on phase exit
✅ **Guard Function**: Legacy popups suppressed
✅ **Observer Gated**: MutationObserver respects phase
✅ **No Refactoring**: Existing code preserved
✅ **Backwards Compatible**: Legacy mode still works
