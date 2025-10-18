# Player Count Update Flow - Before vs After

## Before (Old Behavior)

### Mid-Season Change Flow
```
User in game (Week 3, 12 players active)
    ↓
User opens Settings → Cast
    ↓
User changes Players total: 12 → 8
    ↓
User presses Apply (or changes value)
    ↓
onChange event fires
    ↓
applyPlayers() / applyPlayersConfig() called
    ↓
Checks phase: NOT lobby
    ↓
❌ location.reload() called immediately
    ↓
Page reloads, game state lost
    ↓
New season starts with 8 players (unintended)
```

**Issues:**
- ❌ Interrupts current game mid-season
- ❌ User loses current game progress
- ❌ No way to prepare setting for next season
- ❌ Inconsistent behavior (reload vs rebuild)

### Lobby Change Flow
```
User in lobby (not started)
    ↓
User opens Settings → Cast
    ↓
User changes Players total: 12 → 10
    ↓
User presses Apply (or changes value)
    ↓
onChange event fires
    ↓
applyPlayers() called
    ↓
Checks phase: lobby
    ↓
✅ rebuildGame() / buildCast() called
    ↓
✅ startOpeningSequence() called
    ↓
Season starts with 10 players
```

**This worked correctly!**

---

## After (New Behavior)

### Mid-Season Change Flow
```
User in game (Week 3, 12 players active)
    ↓
User opens Settings → Cast
    ↓
User changes Players total: 12 → 8
    ↓
User presses Apply
    ↓
applySettingsFromModal() reads [data-key] inputs
    ↓
Detects numPlayers changed (12 → 8)
    ↓
Calls applyPlayersFromSettings(8)
    ↓
Saves to cfg.numPlayers = 8
    ↓
Checks phase: NOT lobby
    ↓
✅ Shows message: "Players set to 8. Will apply next season or after a manual refresh."
    ↓
✅ Modal stays open, game continues
    ↓
✅ Current roster unchanged (12 players)
    ↓
Later: User refreshes or finishes season
    ↓
✅ Next season loads with 8 players
```

**Benefits:**
- ✅ No interruption mid-season
- ✅ User can continue current game
- ✅ Setting prepared for next season
- ✅ Clear feedback to user
- ✅ User can press "Save & Close" without losing progress

### Lobby Change Flow
```
User in lobby (not started)
    ↓
User opens Settings → Cast
    ↓
User changes Players total: 12 → 10
    ↓
User presses Apply
    ↓
applySettingsFromModal() reads [data-key] inputs
    ↓
Detects numPlayers changed (12 → 10)
    ↓
Calls applyPlayersFromSettings(10)
    ↓
Saves to cfg.numPlayers = 10
    ↓
Checks phase: lobby
    ↓
✅ rebuildGame() / buildCast() called
    ↓
✅ startOpeningSequence() called
    ↓
Season starts with 10 players
```

**Preserved behavior!**
- ✅ Lobby behavior unchanged
- ✅ Immediate rebuild still works
- ✅ No breaking changes

---

## Technical Implementation Differences

### Old: Change Event Triggers Immediate Action
```javascript
// players-total.js (OLD)
input.addEventListener('change', ()=>{
  const c = readCfg();
  c.numPlayers = clamp(input.value, 6, 22);
  writeCfg(c);
  applyPlayers(c.numPlayers); // ← Immediate action!
});

// settings.js (OLD)
input.addEventListener('change', ()=>{
  const v=Math.max(4, Math.min(16, Number(input.value)||12));
  applyPlayersConfig(v); // ← Immediate action!
});
```

### New: Apply/Save Buttons Trigger Action
```javascript
// players-total.js (NEW)
input.addEventListener('input', ()=>{
  // Only clamp UI, no action
  const v = clamp(input.value, 6, 22);
  if(String(v)!==input.value) input.value = String(v);
});

// ui.config-and-settings.js (NEW)
btnApply.addEventListener('click', ()=>{
  applySettingsFromModal(modal); // ← Reads [data-key] inputs
  // Inside applySettingsFromModal:
  if(oldNumPlayers !== cfg.numPlayers){
    applyPlayersFromSettings(cfg.numPlayers); // ← Controlled action
  }
});
```

### Old: Reload Mid-Season
```javascript
// (OLD)
if(g.game?.phase === 'lobby'){
  // rebuild...
}else{
  g.addLog?.(\`Players set to \${val}. Restarting to apply…\`,'warn');
  setTimeout(()=>location.reload(), 250); // ❌ RELOAD!
}
```

### New: Defer Mid-Season
```javascript
// (NEW)
if(g.game?.phase === 'lobby'){
  // rebuild (unchanged)
}else{
  // ✅ DEFER!
  g.addLog?.(\`Players set to \${val}. Will apply next season or after a manual refresh.\`,'ok');
  log(\`Players set to \${val}. Will apply next season or after a manual refresh.\`);
}
```

---

## User Experience Comparison

### Scenario: User wants to change player count for NEXT season

#### Old Behavior
1. User must wait until current season ends
2. OR accept losing current game progress
3. No way to "prepare" the setting

#### New Behavior  
1. ✅ User can change setting anytime
2. ✅ Current game continues uninterrupted
3. ✅ Setting applies automatically next season
4. ✅ Clear feedback about when change applies

### Scenario: User wants to change player count IN LOBBY

#### Old Behavior
1. ✅ Change value → immediate rebuild

#### New Behavior
1. ✅ Change value → press Apply → immediate rebuild
   (Extra click required, but consistent with other settings)

---

## Range Standardization

### Old: Inconsistent Ranges
- players-total.js: 6-22 ✅
- settings.js: 4-16 ❌
- ui.config-and-settings.js: 6-22 ✅

### New: Unified Range
- players-total.js: 6-22 ✅
- settings.js: 6-22 ✅
- ui.config-and-settings.js: 6-22 ✅

All inputs now consistently clamp to 6-22 range.

---

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| Mid-season change | ❌ Immediate reload | ✅ Deferred to next season |
| User feedback | ⚠️ "Restarting..." | ✅ "Will apply next season..." |
| Modal behavior | ❌ Closes on reload | ✅ Stays open |
| Current game | ❌ Interrupted | ✅ Continues |
| Lobby behavior | ✅ Rebuilds | ✅ Rebuilds (unchanged) |
| Player range | ⚠️ Inconsistent (4-22) | ✅ Unified (6-22) |
| Trigger | onChange (immediate) | Apply/Save button |
| Data persistence | Via change event | Via [data-key] + Apply |
