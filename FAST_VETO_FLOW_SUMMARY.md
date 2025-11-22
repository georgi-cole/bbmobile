# Fast Veto Flow Implementation Summary

## Overview

This implementation revises the veto flow to match a desired 3-phase sequence that eliminates redundant idle timers and non-interactive waiting periods, resulting in a smoother and faster user experience.

## Desired Flow (Now Implemented)

### Phase 1: Veto Competition
- User starts and completes minigame
- **Early finish**: Competition ends immediately when all scores are in (no waiting for timer expiry)
- Fast winner reveal: Single concise modal (1200ms) shows POV winner
- Badge status updates instantly
- **Time saved**: Up to 38 seconds if all scores in early

### Phase 2: Social Phase
- **Always occurs** after competition results but BEFORE veto ceremony (except Final 4)
- Standard existing social phase with player interactions
- Integrated via `startSocial('veto_comp', callback)`

### Phase 3: Veto Ceremony
- **Human POV winner**: Immediate Yes/No decision prompt
  - Optional fast intro card (600ms) or skip entirely (0ms)
  - No redundant waiting cards
- **AI POV winner**: Auto-decision executes promptly (50ms delay in fast mode)
- All narrative cards compressed to 1200-1800ms (vs 2800-3600ms legacy)
- **Time saved**: ~6-8 seconds vs legacy flow

## Implementation Details

### Configuration Flags (js/config/defaults.js)

```javascript
fastVetoFlow: true           // Master switch for fast flow
showExtendedVetoReveal: false // Show full multi-card reveal sequence
skipVetoIntroCard: false     // Skip ceremony intro entirely
```

### New Helper Functions (js/veto.js)

```javascript
fastVetoEnabled()              // Check if fast mode is enabled
extendedRevealEnabled()        // Check if extended reveal should be shown
allVetoScoresSubmitted()       // Check if all participants have submitted scores
accelerateVetoCompCompletion() // Trigger early finish with duplicate call guards
proceedAfterVetoResults()      // Insert social phase before ceremony
```

### Key Changes

#### 1. Early Competition Completion

- **Location**: `submitGuarded()` function
- **Mechanism**: After each score submission, checks if all participants have submitted
- **Guard**: `__vetoEarlyFinished` flag prevents duplicate calls
- **Trigger**: Calls `finishVetoComp()` immediately without waiting for phase timer

```javascript
// In submitGuarded() after g.lastCompScores.set(id, finalScore)
if(g.phase === 'veto_comp' && fastVetoEnabled() && allVetoScoresSubmitted()){
  accelerateVetoCompCompletion();
}
```

#### 2. Fast Winner Reveal

- **Location**: `finishVetoComp()` function
- **Fast mode**: Single concise card showing winner name (1200ms)
- **Legacy mode**: Full multi-card reveal sequence (preserved)
- **Extended reveal**: Available via `showExtendedVetoReveal` config

```javascript
if(fastVetoEnabled()){
  if(!extendedRevealEnabled()){
    showTVCard({ title: 'POV Winner', lines: [winnerName], duration: 1200 })
      .then(proceedAfterVetoResults);
  } else {
    showVetoRevealSequence(top3).then(proceedAfterVetoResults);
  }
}
```

#### 3. Social Phase Insertion

- **Location**: `proceedAfterVetoResults()` function
- **Always runs**: Between competition results and ceremony (except Final 4)
- **Final 4 bypass**: Preserved - goes directly to eviction
- **Guard**: `__socialInsertedAfterVeto` prevents duplicate insertion

```javascript
function proceedAfterVetoResults(){
  if(alivePlayers().length === 4){
    handlePostVetoReveal(); // Final 4 bypass
    return;
  }
  
  startSocial('veto_comp', function(){
    startVetoCeremony();
  });
}
```

#### 4. Ceremony Intro Optimization

- **Location**: `startVetoCeremony()` function
- **Fast mode**: 600ms intro or 0ms if skip enabled
- **Legacy mode**: 2400ms intro
- **Decision**: Rendered immediately after intro (no additional delay)

```javascript
var INTRO_DURATION = 2400; // Default
if(fastVetoEnabled()){
  INTRO_DURATION = g.cfg.skipVetoIntroCard ? 0 : 600;
}
```

#### 5. AI Auto-Decision Delay

- **Location**: `startVetoCeremony()` AI path
- **Fast mode**: 50ms delay
- **Legacy mode**: 1200ms delay

```javascript
var aiDelayMs = fastVetoEnabled() ? 50 : 1200;
```

#### 6. Compressed Card Durations

All passive narrative cards reduced in fast mode:

| Card Type | Fast Mode | Legacy Mode | Savings |
|-----------|-----------|-------------|---------|
| Veto Decision | 1400ms | 3200ms | 1800ms |
| Saved | 1400ms | 3200ms | 1800ms |
| Replacement Required | 1400ms | 3200ms | 1800ms |
| Replacement Nominee | 1400ms | 3600ms | 2200ms |
| Veto Not Used | 1600ms | 3600ms | 2000ms |
| Adjourn | 1200ms | 2800ms | 1600ms |
| Announcement (title) | 800ms | 1200ms | 400ms |
| Announcement (msg) | 1400ms | 2400ms | 1000ms |

**Total ceremony savings**: ~6-8 seconds

### Comprehensive Logging

All key events logged for diagnostics:

```javascript
'[veto] Fast path: all scores submitted, finishing competition early'
'[veto] Fast reveal path'
'[veto] Transitioning to social phase before ceremony'
'[veto] Fast ceremony intro (600ms)' or '[veto] Fast ceremony intro skipped'
'[veto] AI POV holder - scheduling auto-decision in 50ms'
```

## Backward Compatibility

### Feature Flagging
- All changes behind `cfg.fastVetoFlow` flag
- Default is `true` for optimal experience
- Legacy behavior fully preserved when flag is `false`

### Preserved Functionality
- ✅ Final 4 bypass (skip ceremony, direct to eviction)
- ✅ Golden POV (POV holder selects replacement)
- ✅ Diamond POV (replace both nominees)
- ✅ Multi-eviction gating
- ✅ Integrity checks (`integrityCheckNominees`)
- ✅ Fast-forward mode compatibility
- ✅ All existing guards and flags
- ✅ Badge synchronization
- ✅ XP progression hooks
- ✅ Social Maneuvers integration

### Legacy Paths
- Fast-forward mode still uses condensed reveals
- Extended reveal sequence available via config
- Full ceremony intro available (2400ms)
- All original card durations accessible

## Testing

### Automated Verification (verify_fast_veto_flow.mjs)
- **50/50 checks passed** ✅
- Verifies all requirements from problem statement
- Checks configuration, helpers, guards, logging
- Validates backward compatibility and safeguards

### Interactive Test Suite (test_fast_veto_flow.html)
8 comprehensive test scenarios:
1. **Human POV Winner** - Fast path with debugAlwaysWin
2. **AI POV Winner** - Fast reveal + AI auto-decision
3. **Early Completion** - Trigger when all scores in
4. **Social Phase Insertion** - Verify mandatory social phase
5. **Fast Ceremony** - Compressed card durations
6. **Golden POV** - Compatibility with twist
7. **Diamond POV** - Two-phase replacement flow
8. **Final 4 Bypass** - Skip ceremony as expected

### Existing Test Suites
- ✅ `npm run test:minigames` - All pass
- ✅ `npm run test:runtime` - All pass
- ✅ `npm run test:e2e` - All pass
- ✅ `npm run test:social` - All pass
- ✅ `npm run test:pov-carousel` - All pass
- ✅ `npm run test:background-theme` - All pass

## Performance Improvements

### Time Savings Breakdown

**Competition Phase:**
- Early finish when all scores in: **Up to 38 seconds**
- Example: If all 4 players submit within 2 seconds, saves 38s vs waiting for 40s timer

**Results Phase:**
- Fast reveal (1200ms) vs extended sequence (3200ms+): **2+ seconds**

**Ceremony Phase:**
- Fast intro (600ms) vs legacy (2400ms): **1.8 seconds**
- AI decision (50ms) vs legacy (1200ms): **1.15 seconds**
- Compressed cards (1200-1600ms) vs legacy (2800-3600ms): **4-6 seconds**

**Total Potential Savings:** **Up to 45 seconds per veto week**

### User Experience Improvements

1. **Immediate Feedback**
   - Results appear within 1s of last submission
   - No passive waiting for timer to expire
   - Badge updates instantly

2. **Continuous Flow**
   - Smooth transition through phases
   - Social phase naturally integrated
   - No redundant "waiting" cards

3. **Reduced Friction**
   - Faster ceremony with meaningful content
   - Compressed non-interactive narratives
   - Immediate decision prompts

## Code Quality

### Guards and Safeguards
- ✅ Duplicate call prevention (`__vetoEarlyFinished`, `__socialInsertedAfterVeto`)
- ✅ Phase validation before triggering early finish
- ✅ Null/undefined checks on all helpers
- ✅ Graceful fallbacks if social system unavailable
- ✅ ESLint clean (only style warnings, no errors)

### Error Handling
- All empty catch blocks filled with comments
- Try-catch blocks around badge sync operations
- Fallback paths for missing functions
- Defensive programming throughout

### Maintainability
- Clear function names describe purpose
- Comprehensive inline comments
- Diagnostic logging at key points
- Configuration centralized in defaults.js
- Feature flags for easy toggling

## Future Enhancements

Potential improvements for future iterations:

1. **Configurable Timings**
   - Allow user to set custom card durations
   - Slider for "speed" preference (slow/medium/fast)

2. **Skip All Cards**
   - "Instant mode" that skips all narrative cards
   - Show only interactive prompts

3. **Analytics**
   - Track average time saved per session
   - Measure user satisfaction with fast mode

4. **A/B Testing**
   - Test different timing combinations
   - Optimize for best UX balance

## Migration Guide

### For Users
1. Fast mode is **enabled by default**
2. To disable: Set `cfg.fastVetoFlow = false` in config
3. To enable extended reveals: Set `cfg.showExtendedVetoReveal = true`
4. To skip intro: Set `cfg.skipVetoIntroCard = true`

### For Developers
1. No code changes required - fully backward compatible
2. All existing verification scripts still pass
3. New logging helps diagnose any issues
4. Test suite available for validation

### For Testers
1. Run `node verify_fast_veto_flow.mjs` for automated checks
2. Open `test_fast_veto_flow.html` for interactive testing
3. Compare timings between fast/legacy modes
4. Verify all POV twists work correctly

## Conclusion

This implementation successfully achieves all objectives from the problem statement:

✅ Early finish mechanism with duplicate call guards  
✅ Fast results modal (1200ms single card)  
✅ Mandatory social phase insertion (except Final 4)  
✅ Optimized ceremony intro (600ms or skip)  
✅ Compressed passive card durations (1200-1800ms)  
✅ Removed redundant idle timers  
✅ AI fast path (50ms delay)  
✅ Comprehensive logging  
✅ Backward compatibility preserved  
✅ All existing guards and integrity checks intact  
✅ Golden/Diamond POV compatibility  
✅ Final 4 bypass working  
✅ 50/50 verification checks passed  

**Total time savings: Up to 45 seconds per veto week**  
**User experience: Significantly improved with immediate feedback and continuous flow**  
**Code quality: Clean, maintainable, and well-tested**
