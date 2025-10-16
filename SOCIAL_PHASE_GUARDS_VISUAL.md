# Social Phase Guards - Visual Guide

## 🎨 What Changed Visually

This guide shows what users will see when interacting with the new social phase guard features.

## 1. Settings Panel - Developer Toggle

### Location
**Settings → Debug Tab → Developer Toggles Section**

### Visual Appearance
```
┌─────────────────────────────────────────────────┐
│  ⚙️ Settings                                    │
├─────────────────────────────────────────────────┤
│  [General] [Gameplay] [Timing] [Visual] [Audio] │
│  [Advanced] [Debug] ← Click here               │
├─────────────────────────────────────────────────┤
│                                                 │
│  ⚠️ Developer Toggles                           │
│  ┌─────────────────────────────────────────┐   │
│  │ ⚠️ Warning: These toggles are for       │   │
│  │ testing only and may break game flow    │   │
│  │                                          │   │
│  │ ☐ Skip Social Phase                     │   │
│  │   (shows warning banner)                │   │
│  │                                          │   │
│  │ When enabled, social phase is skipped   │   │
│  │ and a visible banner warns you          │   │
│  └─────────────────────────────────────────┘   │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Colors**:
- Warning box: Amber/brown background (#332211)
- Border: Orange (#664422)
- Text: White

### When Enabled
The checkbox is checked (☑) and the warning banner appears on screen.

---

## 2. Warning Banner

### Location
**Top center of screen (fixed position, always visible)**

### Visual Appearance
```
┌──────────────────────────────────────────────┐
│                                              │
│  ⚠️  Developer Mode: Social Phase Skipped  ⚠️  │
│  Disable in Settings → Debug → Skip Social   │
│  Phase                                       │
│                                              │
└──────────────────────────────────────────────┘
```

**Visual Properties**:
- **Background**: Red gradient (#ff6b6b → #ff4444)
- **Border**: 2px white with 30% opacity
- **Shadow**: Red glow (0 4px 12px rgba(255,68,68,0.4))
- **Animation**: Pulse effect (2 second loop)
  - Scales: 1.0 → 1.02 → 1.0
  - Opacity: 1.0 → 0.85 → 1.0
- **Font**: Bold, 0.9rem
- **Position**: Fixed at top: 60px, centered
- **Z-index**: 9999 (always on top)

### Animation
The banner pulses gently to draw attention:
```
Frame 1 (0.0s): Scale 1.0, Opacity 1.0
Frame 2 (1.0s): Scale 1.02, Opacity 0.85  ← Slightly larger, slightly faded
Frame 3 (2.0s): Scale 1.0, Opacity 1.0
[Repeat]
```

---

## 3. Fast-Forward Block Message

### When Displayed
When user tries to skip social phase without taking any actions.

### Visual Appearance (in game log)
```
┌────────────────────────────────────────────┐
│ Game Log:                                  │
├────────────────────────────────────────────┤
│                                            │
│ [21:30:45] HOH: Finn wins                 │
│ [21:30:50] Social Intermission begins     │
│ [21:30:55] ⚠️ Cannot skip social phase    │
│            without taking at least one    │
│            action. Take an action first   │
│            or enable skip in Settings →   │
│            Debug.                          │
│                                            │
└────────────────────────────────────────────┘
```

**Style**: Warning (amber/yellow color)

### Console Output
```javascript
[ff] ⚠️ Fast-forward blocked during social_intermission phase
[ff] Reason: No social actions taken yet. Take at least one action or enable skipSocialPhase in Settings → Debug
[ff] Stack trace for social phase fast-forward attempt:
    at fastForwardPhase (ui.hud-and-router.js:967)
    ...
```

---

## 4. Dump Social Logs Button

### Location
**Settings → Debug Tab → Advanced Debug Section**

### Visual Appearance
```
┌─────────────────────────────────────────────┐
│  Advanced Debug                             │
│  ┌─────────────────────────────────────┐   │
│  │ [Dump Social] [Force Return Twist]  │   │
│  │ [Skip Phase]                         │   │
│  │                                      │   │
│  │ [Dump Social Logs] ← New button     │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

### Console Output When Clicked
```
📊 Social Phase Audit Logs
├─ ✅ Social Phase Executions: [
│     { week: 1, timestamp: 1697493600000, source: 'hoh_completion' },
│     { week: 2, timestamp: 1697580000000, source: 'hoh_completion' }
│  ]
├─ ⚠️ Social Phase Skips: []
├─ ❌ Social Phase Errors: []
├─ Current Week: 3
├─ Social Actions This Phase: 2
└─ Skip Social Phase Enabled: false
```

---

## 5. Phase Transition Messages

### Normal Flow (Developer Toggle OFF)
```
Console:
[phase-sequence] ✓ HOH complete, checking social phase...
[phase-sequence] ✓ Social phase confirmed: calling runSocial()
[social] ✓ Entering social_intermission phase
[social] Checking Social Maneuvers feature flag...
[social] ✓ Social Maneuvers path - Using new Social Maneuvers system
```

### Developer Mode Flow (Developer Toggle ON)
```
Console:
[phase-sequence] ✓ HOH complete, checking social phase...
[phase-sequence] ⚠️ DEVELOPER MODE: Social phase skipped (skipSocialPhase = true)
[phase-sequence] This should ONLY be used for testing. Disable in Settings → Debug

Game Log:
⚠️ Developer Mode: Social phase skipped
```

### Error Flow (Social Function Missing)
```
Console:
[phase-sequence] ✓ HOH complete, checking social phase...
[phase-sequence] ❌ CRITICAL: Social phase function not found!
[phase-sequence] Expected: global.startSocial or global.startSocialIntermission
[phase-sequence] This indicates a module loading issue. Social phase BYPASSED.

Game Log:
❌ CRITICAL: Social phase function missing! Check console.
```

---

## 6. Manual Test Page

### Location
`test_social_phase_guards_manual.html`

### Visual Appearance
```
┌─────────────────────────────────────────────────────────┐
│  🛡️ Social Phase Guards - Manual Test Suite            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Test 1: Configuration Defaults                        │
│  ┌───────────────────────────────────────────────┐    │
│  │ Verify that default configuration includes    │    │
│  │ social phase settings.                        │    │
│  │                                                │    │
│  │ [Run Test]                                    │    │
│  │                                                │    │
│  │ Configuration:                                │    │
│  │ skipSocialPhase: false ✓ PASS                │    │
│  │ tSocial: 30 ✓ PASS                           │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  Test 2: Developer Toggle                             │
│  ┌───────────────────────────────────────────────┐    │
│  │ [Enable Skip Social] [Disable Skip Social]   │    │
│  │ [Show Banner Demo] [Hide Banner Demo]        │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
│  Console Output                                        │
│  ┌───────────────────────────────────────────────┐    │
│  │ [21:30:01] LOG: Configuration defaults checked│    │
│  │ [21:30:05] LOG: Skip social toggle set to: true│   │
│  │ [21:30:05] LOG: Banner displayed              │    │
│  └───────────────────────────────────────────────┘    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Colors**:
- Background: Dark blue (#1a1a2e)
- Cards: Slightly lighter blue (#16213e)
- Borders: Accent blue (#0f3460)
- Success indicators: Green (#4ecca3)
- Warning indicators: Amber (#ffc107)
- Error indicators: Red (#ff6b6b)

---

## 7. Color Coding System

### Console Messages

**✅ Success (Green)**:
- `[phase-sequence] ✓ Social phase confirmed`
- `[social] ✓ Entering social_intermission phase`

**⚠️ Warning (Amber)**:
- `[phase-sequence] ⚠️ DEVELOPER MODE: Social phase skipped`
- `[ff] ⚠️ Fast-forward blocked`
- `[social-skip] ⚠️ Banner displayed`

**❌ Error (Red)**:
- `[phase-sequence] ❌ CRITICAL: Social phase function not found`

**ℹ️ Info (Blue)**:
- `[phase-sequence] ✓ HOH complete, checking social phase...`
- `[ff] ⏩ Social phase skip allowed`

### In-Game Log

**Green (Success)**:
- Normal phase transitions
- Successful social actions

**Amber (Warning)**:
- Developer mode notifications
- Skip attempts blocked
- Configuration issues

**Red (Danger)**:
- Critical errors
- Module loading failures

---

## 8. Interactive States

### Banner States
1. **Hidden** (default): Display: none
2. **Visible** (toggle ON): Display: block, animating

### Button States
1. **Normal**: Blue background, blue border
2. **Hover**: Slightly lighter blue
3. **Danger** (Skip related): Red background
4. **Success** (Disable related): Green background

### Toggle States
1. **Unchecked** (☐): Normal operation
2. **Checked** (☑): Developer mode active, banner shown

---

## Summary

The visual changes are:
1. **Non-intrusive**: Banner only shows in developer mode
2. **Clear**: Color-coded messages (green/amber/red)
3. **Informative**: Detailed console logs
4. **Actionable**: Guidance on how to resolve issues
5. **Professional**: Consistent styling with game theme
6. **Accessible**: High contrast, clear labels

All visual elements follow the existing game's design language and integrate seamlessly with the current UI.
