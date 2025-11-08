# Overlay Token System - Manual Testing Guide

## Overview
This document provides instructions for manually testing the new overlay token system that fixes nominations and veto ceremony rendering issues.

## Quick Start

### 1. Open Test Page
Open `test_phase_overlay_tokens.html` in your browser and click "Run All Tests". All tests should pass (green).

### 2. Main Game Testing
Open `index.html` and start a new season with at least 8 players.

## Manual Test Scenarios

### Test 1: Human HOH Nominations (Week 1)
**Goal**: Verify nomination intro and selector appear without blank TV

1. Start new season
2. Skip to HOH competition win (as human)
3. **Expected**: Nominations phase starts automatically
4. **✓ PASS IF**:
   - Nomination intro card appears in TV area
   - "NOMINATE" button is clickable
   - Fullscreen selector opens when clicked
   - Can select 2 nominees
   - Selector closes after confirmation

**Debug Commands**:
```javascript
// Check nominations state
NomsFS.debug()
// Should show: wrapped: true, overlayManager: { currentOwner: 'noms', overlayVisible: true }

// Check overlay ownership
OverlayManager.debug()
// Should show: currentOwner: 'noms', overlayExists: true, overlayVisible: true
```

### Test 2: Human POV Holder Veto Decision (Week 1)
**Goal**: Verify veto decision panel appears without blank TV

1. Continue from Test 1 after nominations locked
2. Skip or complete veto competition (win as human)
3. **Expected**: Veto ceremony starts with intro card
4. **✓ PASS IF**:
   - Veto ceremony intro card appears
   - "Use POV?" decision panel appears in TV
   - Yes/No buttons are clickable
   - Decision triggers appropriate flow (save + replacement if Yes)

**Debug Commands**:
```javascript
// Check veto state
window.vetoDebug()
// Should show: phase: 'veto_ceremony', overlayManager: { currentOwner: 'veto', overlayVisible: true }

// Check overlay ownership
OverlayManager.debug()
// Should show: currentOwner: 'veto', overlayExists: true, overlayVisible: true
```

### Test 3: Multi-Week Cycle (Weeks 1-3)
**Goal**: Verify overlay transitions cleanly across multiple weeks

1. Complete Week 1 (nominations + veto + eviction)
2. **Between phases, check**:
   - TV area shows appropriate content (not blank)
   - No console errors about overlay ownership
3. Complete Week 2 (repeat nominations + veto)
4. Complete Week 3 (repeat nominations + veto)
5. **✓ PASS IF**:
   - All 3 weeks show nominations intro/selector
   - All 3 weeks show veto decision panel (if human POV holder)
   - No blank TV areas during phase transitions
   - No console warnings about overlay conflicts

**Debug After Each Phase**:
```javascript
// Should be null between phases (no owner)
OverlayManager.getOwner()
```

### Test 4: AI HOH/POV Holder
**Goal**: Verify AI paths still work with token system

1. Let AI win HOH (skip human turn)
2. **Expected**: AI nominations happen automatically
3. Let AI win veto
4. **Expected**: AI veto decision happens automatically
5. **✓ PASS IF**:
   - AI nominations complete without errors
   - AI veto decisions complete without errors
   - No console errors about overlay ownership
   - TV area shows appropriate AI content

### Test 5: Social Phase (Non-Interference)
**Goal**: Verify social phase still mounts normally

1. Complete nominations + veto
2. **Expected**: Social phase starts
3. **✓ PASS IF**:
   - Social UI mounts in #panel area
   - No overlay conflicts
   - No console errors

## Common Issues & Fixes

### Issue: Blank TV during nominations
**Symptoms**: TV area empty when entering nominations phase
**Debug**:
```javascript
NomsFS.debug()
// Check: installed, wrapped, overlayManager.currentOwner
```
**Expected**: `overlayManager.currentOwner` should be `'noms'` and `overlayVisible` should be `true`

### Issue: Veto decision panel missing
**Symptoms**: TV area empty during veto ceremony
**Debug**:
```javascript
window.vetoDebug()
// Check: phase, overlayManager.currentOwner
```
**Expected**: `phase` should be `'veto_ceremony'` and `overlayManager.currentOwner` should be `'veto'`

### Issue: Overlay ownership conflict
**Symptoms**: Console warnings about non-owner trying to clear
**Debug**:
```javascript
OverlayManager.debug()
// Check: currentOwner
```
**Fix**: This is expected behavior - the token system is working correctly by preventing conflicts

## Rollback Testing

### Disable Token System
```javascript
// In browser console before starting game
window.__enablePhaseOverlayTokens = false;
```

Then repeat Test 1-3 above. The game should work but may exhibit the original race condition issues (intermittent blank TV).

### Re-enable Token System
```javascript
window.__enablePhaseOverlayTokens = true;
```

Refresh the page and verify the token system is active again.

## Success Criteria

✅ **All tests pass if**:
1. Nominations intro/selector appears every week for human HOH
2. Veto decision panel appears every week for human POV holder
3. No blank TV areas during phase transitions
4. No console errors about overlay conflicts
5. Social phase continues to work normally
6. AI paths complete without errors

## Console Monitoring

**Good Logs** (expect these):
```
[overlay-mgr] ✓ Acquired by noms
[noms-fs] ✓ Acquired overlay ownership and ensured visibility
[overlay-mgr] ✓ Released by noms
[veto] ✓ Acquired overlay ownership and ensured visibility
[overlay-mgr] ✓ Released by veto
```

**Bad Logs** (should NOT appear):
```
[overlay-mgr] Cannot acquire - already owned by...
[overlay-mgr] Cannot clear - not owned by...
[noms] Failed to create overlay host
[veto] Missing decision panel
```

## Reporting Issues

If you encounter failures, please provide:
1. Which test scenario failed
2. Browser console output (copy full log)
3. Output of debug commands at time of failure
4. Screenshots of blank TV area (if applicable)
5. Game state (week number, phase, players alive)

---

**Note**: This testing guide assumes the overlay manager module is loaded correctly in `index.html`. If you get "OverlayManager is not defined" errors, check that `js/overlay-manager.js` is loaded before `js/phase-events.js`.
