# PR: Unify Social HUD with Canonical Mechanics + Merge Action Catalogs

## Overview
This PR fixes two critical issues in the Social phase:
1. **0 Energy starts** - Divergent resource stores (local HUD store defaulting to 3 vs. mechanics store with 5 + weekly deltas)
2. **Missing legacy actions** - Hard-coded TV modal action list missing 5 key actions (Small Talk, Confide, Interrogate, Compliment, Mediate)

## Changes Summary

### 4 Focused Commits

**Commit 1: Wire TV HUD to Canonical Mechanics Store**
- Removed hard-coded `game.__socialResources` fallback (default 3)
- Wired `getResourceState()` to read from `SocialManeuvers.SocialResources`
- Added resource-changed event listener for live updates
- Updated default display from 3 to 5 Energy

**Commit 2: Unify Action Catalog with Canonical Provider**
- Replaced hard-coded action array with `SocialManeuvers.SOCIAL_ACTIONS`
- Added 5 missing legacy actions
- Deduped synonyms (Strategy Chat + Late Night Talk → Strategize)
- Integrated action evaluation for dynamic gating
- Costs match mechanics exactly (Energy/Influence/Information)

**Commit 3: Verify Under-Avatar Labels + % (Already Implemented)**
- Confirmed relationship labels render correctly under avatars
- Verified `getRelationshipLabel()` matches `social.js` thresholds

**Commit 4: Execute Actions via Canonical Mechanics Engine**
- Actions now execute via `SocialManeuvers.executeAction()`
- Energy spent via canonical `SocialResources.spend()` API
- Full mechanics engine (success computation, influence/information tracking)
- Dev telemetry added (localhost only)
- Fallback to legacy system if SocialManeuvers unavailable

### Documentation + Testing

**Added Files:**
- `test_social_hud_unification.html` - Validation test suite (378 lines)
- `SOCIAL_HUD_UNIFICATION_SUMMARY.md` - Implementation details (142 lines)
- `SOCIAL_HUD_VISUAL_REFERENCE.md` - Before/after visual comparison (268 lines)

**Modified Files:**
- `js/socialize-mobile.js` - Now 1004 lines (was 795), net +209 lines of unified logic

## Acceptance Criteria ✅

All requirements from the problem statement are met:

- ✅ Starting a Social phase shows ≥5 Energy (5 + weekly deltas, clamped to max 10)
- ✅ Socialize button is enabled when Energy > 0
- ✅ Legacy below-TV panel does not appear (TV HUD + full-screen modal only)
- ✅ Modal shows under-avatar labels + % (relationship state + affinity percentage)
- ✅ Modal shows unified, deduped action grid:
  - Includes all 5 legacy-only actions (Small Talk, Confide, Interrogate, Compliment, Mediate)
  - No duplicates (Strategize not Strategy Chat + Late Night Talk; Workout not Workout Together; Cook not Cook Meal)
- ✅ Actions spend from canonical store via `SocialManeuvers.executeAction()`
- ✅ At 0 Energy, Social auto-advances (existing wiring)

## Testing

Run `test_social_hud_unification.html` to validate:
1. Canonical resources wiring (reads from SocialManeuvers.SocialResources)
2. Action catalog unification (uses SOCIAL_ACTIONS, includes all legacy actions)
3. Under-avatar labels (relationship state + affinity %)
4. Execute action plumbing (spends via canonical store, uses mechanics engine)

## Impact

### Before
- Energy starts at 3 (hard-coded) → **0 Energy starts when mechanics seed lower**
- 11 actions in modal → **Missing 5 legacy actions**
- Duplicate actions (Strategy Chat + Late Night Talk, Workout Together, Cook Meal)
- Actions executed via legacy `socialApplyAction()` → **No success computation**

### After
- Energy starts at 5 + weekly bonuses/penalties → **No more 0 Energy starts**
- 16 actions in modal → **All legacy actions included**
- No duplicates (synonyms merged: Strategize, Workout, Cook)
- Actions executed via canonical mechanics engine → **Full success computation with traits/memory/context**

## Backward Compatibility

All changes include fallbacks:
- Fallback to legacy `socialApplyAction()` if `SocialManeuvers.executeAction()` not available
- Fallback action catalog if `SocialManeuvers.SOCIAL_ACTIONS` not available
- No breaking changes to existing `social.js` or `social-maneuvers.js`

## Out of Scope

As specified in the problem statement:
- ✅ No visual redesign beyond adding labels under avatars and updating resource badges
- ✅ No changes to the phase timer (3 minutes default, configurable)
- ✅ Legacy below-TV panel already hidden in `social.js` line 500

## Review Checklist

- [ ] Code reviewed for quality and maintainability
- [ ] Test file (`test_social_hud_unification.html`) executed successfully
- [ ] Documentation (`SOCIAL_HUD_UNIFICATION_SUMMARY.md`, `SOCIAL_HUD_VISUAL_REFERENCE.md`) reviewed
- [ ] Acceptance criteria verified
- [ ] No breaking changes to existing systems

## Deployment Notes

No special deployment steps required. Changes are backward compatible with fallbacks.

---

**Files Changed:** 1 modified, 3 added  
**Lines Changed:** +915 insertions, -186 deletions  
**Net Impact:** +729 lines (includes test + docs)  
**Commits:** 6 (1 initial plan + 4 implementation + 1 docs)

Ready for merge! 🎉
